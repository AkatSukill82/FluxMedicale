import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Trash2, 
  Archive, 
  AlertTriangle,
  Clock,
  Shield,
  Download
} from 'lucide-react';
import { format, addYears, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { logDataAccess, AuditActions } from './AuditTrailService';

// Durées de conservation légales en Belgique (en années)
const RETENTION_PERIODS = {
  medical_records: 30,    // Dossiers médicaux: 30 ans après dernier contact
  prescriptions: 10,      // Ordonnances: 10 ans
  invoices: 7,           // Factures: 7 ans
  lab_results: 30,       // Résultats labo: 30 ans
  consent_records: 5     // Preuves de consentement: 5 ans après retrait
};

export default function DataRetentionManager({ patient }) {
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Calculer la date de fin de conservation
  const calculateRetentionEnd = () => {
    const lastAccess = patient.last_accessed_at 
      ? new Date(patient.last_accessed_at) 
      : new Date(patient.created_date);
    
    return addYears(lastAccess, RETENTION_PERIODS.medical_records);
  };
  
  const retentionEndDate = calculateRetentionEnd();
  const daysUntilExpiry = differenceInDays(retentionEndDate, new Date());
  const isNearExpiry = daysUntilExpiry < 365; // Moins d'un an
  const isExpired = daysUntilExpiry < 0;
  
  // Exporter les données pour le patient (droit à la portabilité)
  const handleExportData = async () => {
    setIsProcessing(true);
    try {
      // Logger l'export
      await logDataAccess({
        patientId: patient.id,
        action: AuditActions.EXPORT,
        resourceType: 'FullPatientRecord',
        resourceId: patient.id,
        justification: 'Droit à la portabilité des données (Art. 20 RGPD)'
      });
      
      // Récupérer toutes les données du patient
      const [consultations, prescriptions, documents, labResults] = await Promise.all([
        base44.entities.Consultation.filter({ patient_id: patient.id }),
        base44.entities.Prescription.filter({ patient_id: patient.id }),
        base44.entities.Document.filter({ patient_id: patient.id }),
        base44.entities.LabResult.filter({ patient_id: patient.id })
      ]);
      
      const exportData = {
        export_date: new Date().toISOString(),
        export_type: 'GDPR_PORTABILITY',
        patient: {
          ...patient,
          // Masquer les champs internes
          created_by: undefined,
          updated_date: undefined
        },
        consultations,
        prescriptions,
        documents: documents.map(d => ({
          ...d,
          // Inclure uniquement les métadonnées, pas les fichiers
          content_html: '[CONTENU DISPONIBLE SUR DEMANDE]'
        })),
        lab_results: labResults
      };
      
      // Télécharger le JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_medical_${patient.id}_${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Données exportées avec succès');
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Erreur lors de l'export des données");
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Anonymiser les données (droit à l'effacement)
  const handleAnonymize = async () => {
    if (!confirm('ATTENTION: Cette action est irréversible. Les données seront anonymisées conformément au RGPD. Continuer?')) {
      return;
    }
    
    setIsProcessing(true);
    try {
      await logDataAccess({
        patientId: patient.id,
        action: AuditActions.DELETE,
        resourceType: 'FullPatientRecord',
        resourceId: patient.id,
        justification: "Droit à l'effacement (Art. 17 RGPD)"
      });
      
      // Anonymiser le patient
      await base44.entities.Patient.update(patient.id, {
        name: [{ use: 'official', family: 'ANONYMISÉ', given: ['Patient'] }],
        identifier: [],
        telecom: [],
        address: [],
        birthDate: null,
        mutuelle: null,
        numero_mutuelle: null,
        allergies: 'DONNÉES EFFACÉES',
        antecedents_medicaux: 'DONNÉES EFFACÉES',
        medicaments_actuels: 'DONNÉES EFFACÉES',
        notes_importantes: 'DONNÉES EFFACÉES CONFORMÉMENT AU RGPD',
        statut: 'Inactif',
        gdpr_consent: {
          ...patient.gdpr_consent,
          revoked: true,
          revoked_date: new Date().toISOString()
        }
      });
      
      toast.success('Données anonymisées conformément au RGPD');
    } catch (error) {
      console.error('Anonymization error:', error);
      toast.error("Erreur lors de l'anonymisation");
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5 text-blue-600" />
          Conservation des données (RGPD)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statut de conservation */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-slate-500" />
            <div>
              <p className="text-sm font-medium">Fin de conservation prévue</p>
              <p className="text-sm text-muted-foreground">
                {format(retentionEndDate, 'd MMMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>
          <Badge 
            variant={isExpired ? 'destructive' : isNearExpiry ? 'outline' : 'secondary'}
            className={isNearExpiry && !isExpired ? 'border-yellow-500 text-yellow-700' : ''}
          >
            {isExpired ? 'Expiré' : `${Math.floor(daysUntilExpiry / 365)} ans restants`}
          </Badge>
        </div>
        
        {/* Alerte si proche de l'expiration */}
        {isNearExpiry && !isExpired && (
          <Alert className="border-yellow-300 bg-yellow-50">
            <Clock className="w-4 h-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 text-sm">
              La période de conservation arrive à échéance. Planifiez l'archivage ou la suppression des données.
            </AlertDescription>
          </Alert>
        )}
        
        {isExpired && (
          <Alert className="border-red-300 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800 text-sm">
              La période de conservation légale est dépassée. Les données doivent être archivées ou supprimées.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Durées légales */}
        <div className="text-xs text-muted-foreground space-y-1 p-3 bg-slate-50 rounded-lg">
          <p className="font-medium mb-2">Durées de conservation légales (Belgique):</p>
          <p>• Dossiers médicaux: 30 ans après dernier contact</p>
          <p>• Ordonnances: 10 ans</p>
          <p>• Factures: 7 ans</p>
          <p>• Preuves de consentement: 5 ans après retrait</p>
        </div>
        
        {/* Actions RGPD */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportData}
            disabled={isProcessing}
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter (Portabilité)
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="text-red-600 hover:bg-red-50"
            onClick={handleAnonymize}
            disabled={isProcessing}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Anonymiser (Effacement)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}