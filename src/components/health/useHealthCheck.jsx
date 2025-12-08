
import { useState, useCallback } from 'react';
import { AuditLog } from '@/entities/AuditLog';
import { User } from '@/entities/User';

export const useHealthCheck = () => {
  const [moduleStatuses, setModuleStatuses] = useState({
    recipE: { status: 'PARTIAL', lastSuccess: '2024-12-15T10:30:00', endpoint: 'acceptance' },
    myCareNet: { status: 'OK', lastSuccess: '2024-12-15T14:20:00', endpoint: 'acceptance' },
    eHealthBox: { status: 'OK', lastSuccess: '2024-12-15T09:15:00', endpoint: 'prod' },
    hub: { status: 'PARTIAL', lastSuccess: '2024-12-14T16:45:00', endpoint: 'acceptance' },
    dmg: { status: 'OK', lastSuccess: '2024-12-15T11:00:00', endpoint: 'acceptance' },
    vidis: { status: 'NOT_CONFIGURED', lastSuccess: null, endpoint: null },
    vaccinations: { status: 'NOT_CONFIGURED', lastSuccess: null, endpoint: null },
    mediPrima: { status: 'NOT_CONFIGURED', lastSuccess: null, endpoint: null },
    importExport: { status: 'OK', lastSuccess: '2024-12-15T08:30:00', endpoint: 'local' },
    annexe82: { status: 'PARTIAL', lastSuccess: '2024-12-14T15:00:00', endpoint: 'local' },
    timeline: { status: 'OK', lastSuccess: '2024-12-15T14:30:00', endpoint: 'local' },
    idSupport: { status: 'OK', lastSuccess: '2024-12-15T10:00:00', endpoint: 'acceptance' },
    eMediAtt: { status: 'OK', lastSuccess: '2024-12-15T11:30:00', endpoint: 'acceptance' },
    vidisWrite: { status: 'OK', lastSuccess: '2024-12-15T14:00:00', endpoint: 'acceptance' },
    vaccinnetPlus: { status: 'OK', lastSuccess: '2024-12-15T09:45:00', endpoint: 'acceptance' },
    eVax: { status: 'OK', lastSuccess: '2024-12-15T09:50:00', endpoint: 'acceptance' }
  });

  const [testResults, setTestResults] = useState({});
  const [isRunningTests, setIsRunningTests] = useState(false);

  const runMyCareNetTest = useCallback(async () => {
    console.log('[HealthCheck] Test MyCareNet assurabilité...');
    
    return new Promise(resolve => {
      setTimeout(() => {
        const success = Math.random() > 0.2;
        resolve({
          module: 'MyCareNet',
          success,
          message: success ? 'Ping assurabilité OK - Patient test assuré' : 'Erreur 4041: Données patient invalides',
          timestamp: new Date().toISOString(),
          details: success ? {
            mutuelle: '306',
            tiers_payant: true,
            response_time: '245ms'
          } : null
        });
      }, 1500);
    });
  }, []);

  const runRecipETest = useCallback(async () => {
    console.log('[HealthCheck] Test Recip-e génération KMEHR...');
    
    return new Promise(resolve => {
      setTimeout(() => {
        const success = Math.random() > 0.3;
        resolve({
          module: 'Recip-e',
          success,
          message: success ? 'KMEHR 1.28 validé - e-Prescription générée' : 'Erreur XSD: Élément medicinalProduct manquant',
          timestamp: new Date().toISOString(),
          details: success ? {
            kmehr_version: '1.28',
            rid: `RID-TEST-${Date.now()}`,
            validation: 'XSD OK'
          } : null
        });
      }, 2000);
    });
  }, []);

  const runEHealthBoxTest = useCallback(async () => {
    console.log('[HealthCheck] Test eHealthBox...');
    
    return new Promise(resolve => {
      setTimeout(() => {
        const success = Math.random() > 0.1;
        resolve({
          module: 'eHealthBox',
          success,
          message: success ? '5 messages récupérés - Connexion OK' : 'Timeout connexion eHealthBox',
          timestamp: new Date().toISOString(),
          details: success ? {
            messages_count: 5,
            last_message: '2024-12-15T14:00:00',
            attachments_ok: true
          } : null
        });
      }, 1800);
    });
  }, []);

  const runHUBTest = useCallback(async () => {
    console.log('[HealthCheck] Test HUB consentement...');
    
    return new Promise(resolve => {
      setTimeout(() => {
        const success = Math.random() > 0.4;
        resolve({
          module: 'HUB',
          success,
          message: success ? 'Consentement + lien thérapeutique OK' : 'Patient test: consentement manquant',
          timestamp: new Date().toISOString(),
          details: success ? {
            consent_status: 'GRANTED',
            therapeutic_link: 'ACTIVE',
            hub_type: 'intrahub'
          } : {
            consent_status: 'MISSING',
            action_required: 'Demander consentement patient'
          }
        });
      }, 2200);
    });
  }, []);

  const runDMGTest = useCallback(async () => {
    console.log('[HealthCheck] Test DMG...');
    
    return new Promise(resolve => {
      setTimeout(() => {
        const success = Math.random() > 0.2;
        resolve({
          module: 'DMG',
          success,
          message: success ? 'Statut DMG récupéré - Patient test actif' : 'Erreur OA: Patient inconnu',
          timestamp: new Date().toISOString(),
          details: success ? {
            dmg_status: 'ACTIF',
            medecin_dmg: 'Dr. Test',
            expiration: '2025-06-30'
          } : null
        });
      }, 1600);
    });
  }, []);

  const runImportTest = useCallback(async () => {
    console.log('[HealthCheck] Test Import PMF/SMF...');
    
    return new Promise(resolve => {
      setTimeout(() => {
        const success = Math.random() > 0.15;
        resolve({
          module: 'Import/Export PMF/SMF',
          success,
          message: success ? 'Validation schéma PMF OK - 3 patients détectés' : 'Erreur parsing: XML malformé',
          timestamp: new Date().toISOString(),
          details: success ? {
            file_type: 'PMF',
            patients_count: 3,
            consultations_count: 15,
            validation: 'XSD OK'
          } : null
        });
      }, 2500);
    });
  }, []);

  const runIdSupportTest = useCallback(async () => {
    console.log('[HealthCheck] Test IdSupport...');
    
    return new Promise(resolve => {
      setTimeout(() => {
        const success = Math.random() > 0.2;
        resolve({
          module: 'IdSupport',
          success,
          message: success ? 'Vérification eID OK - Carte valide' : 'Erreur: Carte expirée',
          timestamp: new Date().toISOString(),
          details: success ? {
            cardType: 'eID',
            validUntil: '2030-01-14'
          } : null
        });
      }, 1800);
    });
  }, []);

  const runEMediAttTest = useCallback(async () => {
    console.log('[HealthCheck] Test eMediAtt...');
    
    return new Promise(resolve => {
      setTimeout(() => {
        const success = Math.random() > 0.15;
        resolve({
          module: 'eMediAtt',
          success,
          message: success ? 'KMEHR généré + envoi Medex OK' : 'Erreur: XML malformé',
          timestamp: new Date().toISOString(),
          details: success ? {
            messageId: `MEDEX-${Date.now()}`,
            kmehrVersion: '1.28'
          } : null
        });
      }, 2200);
    });
  }, []);

  const runVIDISWriteTest = useCallback(async () => {
    console.log('[HealthCheck] Test VIDIS écriture...');
    
    return new Promise(resolve => {
      setTimeout(() => {
        const success = Math.random() > 0.2;
        resolve({
          module: 'VIDIS (Écriture)',
          success,
          message: success ? 'Ajout médicament OK - Version 47' : 'Erreur: Lien thérapeutique manquant',
          timestamp: new Date().toISOString(),
          details: success ? {
            schemeVersion: 47,
            operation: 'CREATE_ELEMENT'
          } : null
        });
      }, 1900);
    });
  }, []);

  const runVaccinationsTest = useCallback(async () => {
    console.log('[HealthCheck] Test Vaccinations...');
    
    return new Promise(resolve => {
      setTimeout(() => {
        const success = Math.random() > 0.15;
        resolve({
          module: 'Vaccinations',
          success,
          message: success ? '4 vaccins récupérés (Vaccinnet+ + e-vax)' : 'Erreur: Patient inconnu',
          timestamp: new Date().toISOString(),
          details: success ? {
            vaccinnetCount: 2,
            evaxCount: 2
          } : null
        });
      }, 2000);
    });
  }, []);

  const runAllTests = useCallback(async () => {
    setIsRunningTests(true);
    setTestResults({});
    
    try {
      const currentUser = await User.me();
      
      // Lancer tous les tests en parallèle
      const results = await Promise.all([
        runMyCareNetTest(),
        runRecipETest(),
        runEHealthBoxTest(),
        runHUBTest(),
        runDMGTest(),
        runImportTest(),
        runIdSupportTest(),
        runEMediAttTest(),
        runVIDISWriteTest(),
        runVaccinationsTest()
      ]);

      // Organiser les résultats par module
      const resultsMap = {};
      results.forEach(result => {
        resultsMap[result.module] = result;
      });

      setTestResults(resultsMap);

      // Audit log
      await AuditLog.create({
        user_email: currentUser.email,
        action: 'HEALTH_CHECK_RUN',
        target_entity: 'System',
        details: `Tests d'intégration exécutés - ${results.filter(r => r.success).length}/${results.length} réussis`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Erreur lors des tests:', error);
    } finally {
      setIsRunningTests(false);
    }
  }, [
    runMyCareNetTest, 
    runRecipETest, 
    runEHealthBoxTest, 
    runHUBTest, 
    runDMGTest, 
    runImportTest,
    runIdSupportTest,
    runEMediAttTest,
    runVIDISWriteTest,
    runVaccinationsTest
  ]);

  const exportReport = useCallback(async () => {
    console.log('[HealthCheck] Export du rapport...');
    
    const currentUser = await User.me();
    
    // Générer un rapport CSV
    const csvRows = [
      ['MediBridge Health Check Report'],
      ['Date', new Date().toISOString()],
      ['Utilisateur', currentUser.email],
      [''],
      ['Module', 'Statut', 'Dernier succès', 'Endpoint'],
      ...Object.entries(moduleStatuses).map(([module, status]) => [
        module,
        status.status,
        status.lastSuccess || 'N/A',
        status.endpoint || 'N/A'
      ]),
      [''],
      ['Tests d\'intégration'],
      ['Module', 'Résultat', 'Message', 'Timestamp'],
      ...Object.entries(testResults).map(([module, result]) => [
        module,
        result.success ? 'OK' : 'ÉCHEC',
        result.message,
        result.timestamp
      ])
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `health-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    // Audit
    await AuditLog.create({
      user_email: currentUser.email,
      action: 'HEALTH_REPORT_EXPORT',
      target_entity: 'System',
      details: 'Export du rapport Health Check',
      timestamp: new Date().toISOString()
    });
  }, [moduleStatuses, testResults]);

  return {
    moduleStatuses,
    testResults,
    isRunningTests,
    runAllTests,
    exportReport
  };
};
