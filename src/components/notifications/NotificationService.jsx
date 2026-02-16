import { base44 } from '@/api/base44Client';

// Service centralisé pour créer des notifications
export const NotificationService = {
  
  // Créer une notification générique
  async create({ 
    recipientEmail, 
    type, 
    title, 
    message, 
    priority = 'normal',
    link = null,
    relatedEntityType = null,
    relatedEntityId = null,
    patientId = null,
    patientName = null,
    actionRequired = false,
    sendEmail = false
  }) {
    const notification = await base44.entities.Notification.create({
      recipient_email: recipientEmail,
      type,
      title,
      message,
      priority,
      link,
      related_entity_type: relatedEntityType,
      related_entity_id: relatedEntityId,
      patient_id: patientId,
      patient_name: patientName,
      action_required: actionRequired,
      read: false,
      archived: false,
      email_sent: false
    });

    // Envoyer email si demandé
    if (sendEmail) {
      await this.sendEmailNotification(recipientEmail, title, message, link);
      await base44.entities.Notification.update(notification.id, {
        email_sent: true,
        email_sent_at: new Date().toISOString()
      });
    }

    return notification;
  },

  // Notification de rappel RDV
  async notifyRdvReminder(rdv, patient, recipientEmail) {
    return this.create({
      recipientEmail,
      type: 'rdv_reminder',
      title: `Rappel RDV: ${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`,
      message: `RDV prévu le ${new Date(rdv.date).toLocaleDateString('fr-BE')} à ${rdv.heure_debut} - ${rdv.type_consultation}`,
      priority: 'normal',
      link: `Agenda?date=${rdv.date}`,
      relatedEntityType: 'RendezVous',
      relatedEntityId: rdv.id,
      patientId: patient.id,
      patientName: `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`
    });
  },

  // Notification RDV annulé
  async notifyRdvCancelled(rdv, patient, recipientEmail, reason = '') {
    return this.create({
      recipientEmail,
      type: 'rdv_cancelled',
      title: `RDV annulé: ${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`,
      message: `Le RDV du ${new Date(rdv.date).toLocaleDateString('fr-BE')} à ${rdv.heure_debut} a été annulé. ${reason}`,
      priority: 'high',
      link: 'Agenda',
      relatedEntityType: 'RendezVous',
      relatedEntityId: rdv.id,
      patientId: patient.id,
      patientName: `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`
    });
  },

  // Notification prescription à renouveler
  async notifyPrescriptionRenewal(prescription, patient, recipientEmail, daysUntilExpiry) {
    const urgency = daysUntilExpiry <= 3 ? 'urgent' : daysUntilExpiry <= 7 ? 'high' : 'normal';
    return this.create({
      recipientEmail,
      type: 'prescription_renewal',
      title: `Prescription à renouveler`,
      message: `La prescription de ${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''} expire dans ${daysUntilExpiry} jour(s)`,
      priority: urgency,
      link: `Patients?id=${patient.id}&tab=prescriptions`,
      relatedEntityType: 'Prescription',
      relatedEntityId: prescription.id,
      patientId: patient.id,
      patientName: `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`,
      actionRequired: true
    });
  },

  // Notification résultat labo
  async notifyLabResult(labResult, patient, recipientEmail, isCritical = false) {
    return this.create({
      recipientEmail,
      type: isCritical ? 'lab_critical' : 'lab_result',
      title: isCritical ? `⚠️ Résultat labo CRITIQUE` : `Nouveau résultat labo`,
      message: `Résultats de ${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''} - ${labResult.laboratory_name}`,
      priority: isCritical ? 'urgent' : 'normal',
      link: `Patients?id=${patient.id}&tab=labo`,
      relatedEntityType: 'LabResult',
      relatedEntityId: labResult.id,
      patientId: patient.id,
      patientName: `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`,
      actionRequired: isCritical,
      sendEmail: isCritical
    });
  },

  // Notification vaccination due
  async notifyVaccinationDue(vaccination, patient, recipientEmail) {
    return this.create({
      recipientEmail,
      type: 'vaccination_due',
      title: `Vaccination à effectuer`,
      message: `${vaccination.nom_vaccin} pour ${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`,
      priority: 'normal',
      link: `Patients?id=${patient.id}&tab=vaccinations`,
      relatedEntityType: 'Vaccination',
      relatedEntityId: vaccination.id,
      patientId: patient.id,
      patientName: `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`,
      actionRequired: true
    });
  },

  // Notification suivi patient
  async notifyFollowUp(patient, recipientEmail, followUpReason) {
    return this.create({
      recipientEmail,
      type: 'follow_up',
      title: `Suivi patient requis`,
      message: `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}: ${followUpReason}`,
      priority: 'normal',
      link: `Patients?id=${patient.id}`,
      patientId: patient.id,
      patientName: `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`,
      actionRequired: true
    });
  },

  // Envoyer un email
  async sendEmailNotification(to, subject, body, link = null) {
    const fullBody = link 
      ? `${body}\n\nAccéder à l'application: ${window.location.origin}/${link}`
      : body;
    
    await base44.integrations.Core.SendEmail({
      to,
      subject: `[FluxMed] ${subject}`,
      body: fullBody
    });
  },

  // Marquer comme lu
  async markAsRead(notificationId) {
    return base44.entities.Notification.update(notificationId, { read: true });
  },

  // Marquer action complétée
  async markActionCompleted(notificationId) {
    return base44.entities.Notification.update(notificationId, { 
      action_completed: true,
      action_required: false
    });
  },

  // Archiver
  async archive(notificationId) {
    return base44.entities.Notification.update(notificationId, { archived: true });
  },

  // Archiver toutes les lues
  async archiveAllRead(userEmail) {
    const notifications = await base44.entities.Notification.filter({
      recipient_email: userEmail,
      read: true,
      archived: false
    });
    return Promise.all(
      notifications.map(n => base44.entities.Notification.update(n.id, { archived: true }))
    );
  }
};

export default NotificationService;