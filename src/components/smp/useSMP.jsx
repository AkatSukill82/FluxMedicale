import { useState, useCallback } from 'react';
import { AuditLog } from '@/entities/AuditLog';

// Hook pour gérer le Schéma de Médication Partagé (SMP)
export const useSMP = (currentUser) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getMedicationScheme = useCallback(async (patient) => {
    setIsLoading(true);
    setError(null);

    const patientNiss = patient.identifier?.find(id => id.system === 'nn')?.value;

    if (!patientNiss) {
      setIsLoading(false);
      setError('NISS patient requis pour accéder au SMP');
      return null;
    }

    console.log('[SMP] Récupération schéma de médication pour NISS:', patientNiss);

    try {
      // Audit log
      await AuditLog.create({
        user_email: currentUser.email,
        action: 'ACCESS_SMP',
        target_entity: 'Patient',
        target_id: patient.id,
        details: `Accès SMP pour patient NISS: ${patientNiss}`,
        timestamp: new Date().toISOString()
      });

      // Simulation appel HUB/Metahub - transaction GetMedicationScheme
      // En production: appel réel au HUB avec certificat eHealth
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Données simulées du SMP
      const mockSMP = {
        medicationscheme: {
          version: '20250108-001',
          author: 'Dr. Martin Dubois',
          last_update: new Date().toISOString(),
          hub_source: 'RSW' // ou 'CoZo', 'Brussels'
        },
        medicationschemeelement: [
          {
            id: 'med_001',
            substance: 'LISINOPRIL 10 MG',
            preparation: 'ZESTRIL 10MG COMP 98',
            cnk: '0123456',
            posology: '1 comprimé le matin',
            route: 'PO',
            start_date: '2024-01-15',
            end_date: null,
            status: 'ACTIVE',
            prescriber: 'Dr. Sophie Lemaire',
            prescriber_nihii: '12345678901',
            indication: 'Hypertension artérielle'
          },
          {
            id: 'med_002',
            substance: 'METFORMINE 850 MG',
            preparation: 'GLUCOPHAGE 850MG COMP 180',
            cnk: '0234567',
            posology: '1 comprimé matin et soir pendant le repas',
            route: 'PO',
            start_date: '2023-06-20',
            end_date: null,
            status: 'ACTIVE',
            prescriber: 'Dr. Martin Dubois',
            prescriber_nihii: '12345678902',
            indication: 'Diabète type 2'
          },
          {
            id: 'med_003',
            substance: 'OMEPRAZOLE 20 MG',
            preparation: 'LOSEC 20MG CAPS 28',
            cnk: '0345678',
            posology: '1 capsule le matin à jeun',
            route: 'PO',
            start_date: '2024-11-01',
            end_date: '2025-01-31',
            status: 'ACTIVE',
            prescriber: 'Dr. Sophie Lemaire',
            prescriber_nihii: '12345678901',
            indication: 'Protection gastrique'
          }
        ],
        treatmentsuspension: [
          {
            id: 'susp_001',
            medication_id: 'med_004',
            substance: 'ATORVASTATINE 40 MG',
            preparation: 'LIPITOR 40MG COMP 98',
            suspension_reason: 'Effets secondaires (douleurs musculaires)',
            suspended_by: 'Dr. Martin Dubois',
            suspended_at: '2024-12-15',
            status: 'SUSPENDED'
          }
        ]
      };

      console.log('[SMP] Schéma récupéré:', mockSMP);
      setIsLoading(false);
      return mockSMP;

    } catch (err) {
      console.error('[SMP] Erreur récupération:', err);
      setError('Erreur lors de la récupération du SMP');
      setIsLoading(false);
      return null;
    }
  }, [currentUser]);

  const exportSMPAsXML = useCallback(async (smpData) => {
    console.log('[SMP] Export XML KMEHR');
    
    // Simulation génération XML KMEHR
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kmehrmessage xmlns="http://www.ehealth.fgov.be/standards/kmehr/schema/v1">
  <header>
    <standard>
      <cd S="CD-STANDARD">20161201</cd>
    </standard>
    <date>${new Date().toISOString().split('T')[0]}</date>
    <time>${new Date().toTimeString().split(' ')[0]}</time>
  </header>
  <folder>
    <transaction>
      <cd S="CD-TRANSACTION">medicationscheme</cd>
      <version>${smpData.medicationscheme.version}</version>
      ${smpData.medicationschemeelement.map(med => `
      <item>
        <cd S="CD-ITEM">medication</cd>
        <content>
          <medicinalproduct>
            <intendedcd S="CD-DRUG-CNK">${med.cnk}</intendedcd>
            <intendedname>${med.preparation}</intendedname>
          </medicinalproduct>
          <posology>
            <text>${med.posology}</text>
          </posology>
        </content>
      </item>`).join('')}
    </transaction>
  </folder>
</kmehrmessage>`;

    // Télécharger le XML
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smp-${new Date().toISOString().split('T')[0]}.xml`;
    link.click();

    // Audit
    await AuditLog.create({
      user_email: currentUser.email,
      action: 'EXPORT_SMP_XML',
      target_entity: 'SMP',
      details: 'Export XML KMEHR du schéma de médication',
      timestamp: new Date().toISOString()
    });

  }, [currentUser]);

  const generateSMPPDF = useCallback(async (smpData, patient) => {
    console.log('[SMP] Génération PDF');
    
    // Audit
    await AuditLog.create({
      user_email: currentUser.email,
      action: 'PRINT_SMP_PDF',
      target_entity: 'Patient',
      target_id: patient.id,
      details: 'Impression PDF du schéma de médication',
      timestamp: new Date().toISOString()
    });

    alert('Génération PDF du schéma de médication...\n\n(TODO: Générer PDF avec template professionnel)');
  }, [currentUser]);

  return {
    isLoading,
    error,
    getMedicationScheme,
    exportSMPAsXML,
    generateSMPPDF
  };
};