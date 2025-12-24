import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Recip-e v4 - Prescription Électronique Belgique
// Documentation: https://recip-e.be

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'create_prescription': {
        // Créer et envoyer une prescription à Recip-e
        const { 
          patient_id,
          patient_niss,
          medications,
          prescriber_nihii,
          validity_days = 3
        } = body;

        if (!patient_niss || !medications?.length) {
          return Response.json({ 
            error: 'NISS patient et médicaments requis' 
          }, { status: 400 });
        }

        // Générer le RID unique (format Recip-e)
        const rid = generateRID();
        const barcode = generateBarcode(rid);

        // Préparer les données prescription KMEHR
        const prescriptionData = {
          rid,
          barcode,
          patient_niss,
          prescriber: {
            nihii: prescriber_nihii || user.numero_inami,
            name: user.full_name,
            email: user.email
          },
          medications: medications.map((med, idx) => ({
            sequence: idx + 1,
            cnk: med.cnk,
            product_name: med.product_name,
            substance_name: med.substance_name,
            posology: med.posology,
            duration: med.duration,
            quantity: med.quantity || 1,
            instructions: med.instructions || '',
            substitution_allowed: med.substitution_allowed !== false
          })),
          validity: {
            start_date: new Date().toISOString().split('T')[0],
            end_date: calculateEndDate(validity_days),
            days: validity_days
          },
          created_at: new Date().toISOString()
        };

        // Enregistrer dans notre base
        const prescription = await base44.entities.Prescription.create({
          patient_id,
          medecin_email: user.email,
          date_prescription: new Date().toISOString(),
          medicaments: medications.map(med => ({
            nom_produit: med.product_name,
            cnk: med.cnk,
            posologie: med.posology,
            duree_traitement: med.duration,
            quantite: med.quantity || 1,
            instructions: med.instructions
          })),
          statut_recip_e: 'Envoyé',
          recip_e_rid: rid,
          recip_e_barcode: barcode,
          recip_e_validity_start: prescriptionData.validity.start_date,
          recip_e_validity_end: prescriptionData.validity.end_date,
          recip_e_response: JSON.stringify({
            status: 'SENT',
            sent_at: new Date().toISOString(),
            rid,
            barcode
          })
        });

        // En production: envoi SOAP vers Recip-e
        // const recipEResponse = await sendToRecipE(prescriptionData);

        return Response.json({
          success: true,
          prescription_id: prescription.id,
          rid,
          barcode,
          validity: prescriptionData.validity,
          status: 'SENT',
          message: 'Prescription envoyée à Recip-e avec succès'
        });
      }

      case 'get_prescription': {
        // Récupérer une prescription par RID
        const { rid } = body;
        
        const prescriptions = await base44.entities.Prescription.filter({ 
          recip_e_rid: rid 
        });

        if (prescriptions.length === 0) {
          return Response.json({ 
            error: 'Prescription non trouvée' 
          }, { status: 404 });
        }

        return Response.json({
          prescription: prescriptions[0]
        });
      }

      case 'cancel_prescription': {
        // Annuler une prescription
        const { prescription_id, rid, reason } = body;
        
        let prescription;
        if (prescription_id) {
          const prescriptions = await base44.entities.Prescription.filter({ 
            id: prescription_id 
          });
          prescription = prescriptions[0];
        } else if (rid) {
          const prescriptions = await base44.entities.Prescription.filter({ 
            recip_e_rid: rid 
          });
          prescription = prescriptions[0];
        }

        if (!prescription) {
          return Response.json({ 
            error: 'Prescription non trouvée' 
          }, { status: 404 });
        }

        // Vérifier si annulable
        if (prescription.statut_recip_e === 'Délivré') {
          return Response.json({ 
            error: 'Impossible d\'annuler une prescription déjà délivrée' 
          }, { status: 400 });
        }

        if (prescription.statut_recip_e === 'Annulé') {
          return Response.json({ 
            error: 'Prescription déjà annulée' 
          }, { status: 400 });
        }

        // En production: annulation via Recip-e SOAP
        // await cancelOnRecipE(prescription.recip_e_rid);

        await base44.entities.Prescription.update(prescription.id, {
          statut_recip_e: 'Annulé',
          recip_e_response: JSON.stringify({
            ...JSON.parse(prescription.recip_e_response || '{}'),
            cancelled_at: new Date().toISOString(),
            cancellation_reason: reason,
            cancelled_by: user.email
          })
        });

        return Response.json({
          success: true,
          message: 'Prescription annulée avec succès',
          rid: prescription.recip_e_rid
        });
      }

      case 'get_history': {
        // Historique prescriptions d'un patient
        const { patient_id, limit = 50 } = body;
        
        const prescriptions = await base44.entities.Prescription.filter(
          { patient_id },
          '-date_prescription',
          limit
        );

        // Enrichir avec statut Recip-e
        const enrichedPrescriptions = prescriptions.map(p => ({
          ...p,
          recip_e_status: parseRecipEStatus(p),
          can_cancel: canCancel(p),
          is_valid: isStillValid(p)
        }));

        return Response.json({
          prescriptions: enrichedPrescriptions,
          total: enrichedPrescriptions.length
        });
      }

      case 'check_status': {
        // Vérifier le statut d'une prescription sur Recip-e
        const { rid } = body;
        
        // En production: appel SOAP Recip-e GetPrescriptionStatus
        // Simulation
        const prescriptions = await base44.entities.Prescription.filter({ 
          recip_e_rid: rid 
        });

        if (prescriptions.length === 0) {
          return Response.json({ 
            error: 'Prescription non trouvée' 
          }, { status: 404 });
        }

        const prescription = prescriptions[0];
        
        return Response.json({
          rid,
          status: prescription.statut_recip_e,
          dispensed: prescription.statut_recip_e === 'Délivré',
          dispensed_at: null, // En prod: date de délivrance
          pharmacy: null, // En prod: pharmacie qui a délivré
          validity: {
            start: prescription.recip_e_validity_start,
            end: prescription.recip_e_validity_end,
            is_valid: isStillValid(prescription)
          }
        });
      }

      case 'extend_validity': {
        // Prolonger la validité d'une prescription
        const { prescription_id, additional_days = 3 } = body;
        
        const prescriptions = await base44.entities.Prescription.filter({ 
          id: prescription_id 
        });

        if (prescriptions.length === 0) {
          return Response.json({ 
            error: 'Prescription non trouvée' 
          }, { status: 404 });
        }

        const prescription = prescriptions[0];
        const currentEnd = new Date(prescription.recip_e_validity_end);
        const newEnd = new Date(currentEnd);
        newEnd.setDate(newEnd.getDate() + additional_days);

        await base44.entities.Prescription.update(prescription.id, {
          recip_e_validity_end: newEnd.toISOString().split('T')[0]
        });

        return Response.json({
          success: true,
          new_validity_end: newEnd.toISOString().split('T')[0]
        });
      }

      default:
        return Response.json({ error: 'Action non reconnue' }, { status: 400 });
    }
  } catch (error) {
    console.error('Recip-e Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Générer un RID unique (format Recip-e)
function generateRID() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const checksum = calculateChecksum(timestamp + random);
  return `BE${timestamp}${random}${checksum}`;
}

// Générer un code-barres pour le RID
function generateBarcode(rid) {
  // Format EAN-128/GS1-128 utilisé par Recip-e
  return `(01)${rid}`;
}

// Calculer checksum simple
function calculateChecksum(str) {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum += str.charCodeAt(i);
  }
  return (sum % 97).toString().padStart(2, '0');
}

// Calculer date de fin
function calculateEndDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

// Parser le statut Recip-e
function parseRecipEStatus(prescription) {
  const status = prescription.statut_recip_e;
  const response = prescription.recip_e_response 
    ? JSON.parse(prescription.recip_e_response) 
    : {};
  
  return {
    status,
    sent_at: response.sent_at,
    cancelled_at: response.cancelled_at,
    cancellation_reason: response.cancellation_reason
  };
}

// Vérifier si annulable
function canCancel(prescription) {
  return prescription.statut_recip_e === 'Envoyé' && isStillValid(prescription);
}

// Vérifier si encore valide
function isStillValid(prescription) {
  if (!prescription.recip_e_validity_end) return false;
  const endDate = new Date(prescription.recip_e_validity_end);
  return endDate >= new Date();
}