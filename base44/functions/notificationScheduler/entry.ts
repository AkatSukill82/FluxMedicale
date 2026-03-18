import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Fonction appelée périodiquement pour générer les notifications automatiques
// (rappels RDV, prescriptions à renouveler, résultats labo, vaccinations)

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const today = new Date();
    const results = {
      rdvReminders: 0,
      prescriptionAlerts: 0,
      vaccinationAlerts: 0,
      labAlerts: 0
    };

    // 1. Rappels RDV (J-1 et J)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    const upcomingRdvs = await base44.asServiceRole.entities.RendezVous.filter({
      date: { $in: [todayStr, tomorrowStr] },
      statut: { $in: ['Planifié', 'Confirmé'] }
    });

    for (const rdv of upcomingRdvs) {
      // Vérifier si notification déjà envoyée
      const existingNotif = await base44.asServiceRole.entities.Notification.filter({
        related_entity_type: 'RendezVous',
        related_entity_id: rdv.id,
        type: 'rdv_reminder'
      });

      if (existingNotif.length === 0 && rdv.medecin_assigne) {
        let patientName = 'Patient';
        if (rdv.patient_id) {
          const patient = await base44.asServiceRole.entities.Patient.filter({ id: rdv.patient_id });
          if (patient.length > 0) {
            patientName = `${patient[0].name?.[0]?.given?.[0] || ''} ${patient[0].name?.[0]?.family || ''}`;
          }
        } else if (rdv.patient_nom) {
          patientName = `${rdv.patient_prenom || ''} ${rdv.patient_nom}`;
        }

        const isToday = rdv.date === todayStr;
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: rdv.medecin_assigne,
          type: 'rdv_reminder',
          priority: isToday ? 'high' : 'normal',
          title: isToday ? `RDV aujourd'hui: ${patientName}` : `RDV demain: ${patientName}`,
          message: `${rdv.type_consultation} à ${rdv.heure_debut}${rdv.motif ? ` - ${rdv.motif}` : ''}`,
          link: `Agenda?date=${rdv.date}`,
          related_entity_type: 'RendezVous',
          related_entity_id: rdv.id,
          patient_id: rdv.patient_id,
          patient_name: patientName,
          read: false,
          archived: false
        });
        results.rdvReminders++;
      }
    }

    // 2. Prescriptions à renouveler (7 jours avant expiration)
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const expiringPrescriptions = await base44.asServiceRole.entities.Prescription.filter({
      is_recurring: true,
      next_renewal_date: { $lte: sevenDaysFromNow.toISOString().split('T')[0] },
      tracking_status: 'ACTIVE'
    });

    for (const prescription of expiringPrescriptions) {
      const existingNotif = await base44.asServiceRole.entities.Notification.filter({
        related_entity_type: 'Prescription',
        related_entity_id: prescription.id,
        type: 'prescription_renewal'
      });

      if (existingNotif.length === 0) {
        const patient = await base44.asServiceRole.entities.Patient.filter({ id: prescription.patient_id });
        const patientName = patient.length > 0 
          ? `${patient[0].name?.[0]?.given?.[0] || ''} ${patient[0].name?.[0]?.family || ''}`
          : 'Patient';

        const daysUntil = Math.ceil((new Date(prescription.next_renewal_date) - today) / (1000 * 60 * 60 * 24));
        
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: prescription.medecin_email,
          type: 'prescription_renewal',
          priority: daysUntil <= 3 ? 'urgent' : daysUntil <= 5 ? 'high' : 'normal',
          title: `Prescription à renouveler`,
          message: `${patientName} - Renouvellement dans ${daysUntil} jour(s)`,
          link: `Patients?id=${prescription.patient_id}&tab=prescriptions`,
          related_entity_type: 'Prescription',
          related_entity_id: prescription.id,
          patient_id: prescription.patient_id,
          patient_name: patientName,
          action_required: true,
          read: false,
          archived: false
        });
        results.prescriptionAlerts++;
      }
    }

    // 3. Résultats labo non lus (critiques en priorité)
    const unreadLabResults = await base44.asServiceRole.entities.LabResult.filter({
      status: { $in: ['complete', 'partial'] },
      read_by: { $exists: false }
    });

    for (const labResult of unreadLabResults) {
      const existingNotif = await base44.asServiceRole.entities.Notification.filter({
        related_entity_type: 'LabResult',
        related_entity_id: labResult.id,
        type: { $in: ['lab_result', 'lab_critical'] }
      });

      if (existingNotif.length === 0 && labResult.prescriber_email) {
        const patient = await base44.asServiceRole.entities.Patient.filter({ id: labResult.patient_id });
        const patientName = patient.length > 0 
          ? `${patient[0].name?.[0]?.given?.[0] || ''} ${patient[0].name?.[0]?.family || ''}`
          : 'Patient';

        const isCritical = labResult.has_critical;
        
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: labResult.prescriber_email,
          type: isCritical ? 'lab_critical' : 'lab_result',
          priority: isCritical ? 'urgent' : 'normal',
          title: isCritical ? `⚠️ Résultat CRITIQUE` : `Nouveau résultat labo`,
          message: `${patientName} - ${labResult.laboratory_name}`,
          link: `Patients?id=${labResult.patient_id}&tab=labo`,
          related_entity_type: 'LabResult',
          related_entity_id: labResult.id,
          patient_id: labResult.patient_id,
          patient_name: patientName,
          action_required: isCritical,
          read: false,
          archived: false
        });
        results.labAlerts++;
      }
    }

    // 4. Vaccinations à effectuer
    const pendingVaccinations = await base44.asServiceRole.entities.Vaccination.filter({
      statut: 'planifie',
      date_prevue: { $lte: sevenDaysFromNow.toISOString().split('T')[0] }
    });

    for (const vaccination of pendingVaccinations) {
      const existingNotif = await base44.asServiceRole.entities.Notification.filter({
        related_entity_type: 'Vaccination',
        related_entity_id: vaccination.id,
        type: 'vaccination_due'
      });

      if (existingNotif.length === 0 && vaccination.medecin_email) {
        const patient = await base44.asServiceRole.entities.Patient.filter({ id: vaccination.patient_id });
        const patientName = patient.length > 0 
          ? `${patient[0].name?.[0]?.given?.[0] || ''} ${patient[0].name?.[0]?.family || ''}`
          : 'Patient';

        await base44.asServiceRole.entities.Notification.create({
          recipient_email: vaccination.medecin_email,
          type: 'vaccination_due',
          priority: 'normal',
          title: `Vaccination à effectuer`,
          message: `${patientName} - ${vaccination.nom_vaccin}`,
          link: `Patients?id=${vaccination.patient_id}&tab=vaccinations`,
          related_entity_type: 'Vaccination',
          related_entity_id: vaccination.id,
          patient_id: vaccination.patient_id,
          patient_name: patientName,
          action_required: true,
          read: false,
          archived: false
        });
        results.vaccinationAlerts++;
      }
    }

    return Response.json({
      success: true,
      message: 'Notifications générées',
      results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});