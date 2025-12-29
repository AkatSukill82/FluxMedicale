import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  RefreshCw,
  Info,
  Calendar,
  FileText,
  ExternalLink,
  AlertTriangle,
  History
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Types de consentement eHealth
const CONSENT_TYPES = [
  { 
    id: 'hub_access', 
    label: 'Accès Hub Santé', 
    description: 'Autoriser les professionnels de santé à consulter les données médicales via les Hubs' 
  },
  { 
    id: 'sumehr_access', 
    label: 'Consultation SumEHR', 
    description: 'Accès au résumé électronique du patient (SumEHR)' 
  },
  { 
    id: 'medication_schema', 
    label: 'Schéma de médication', 
    description: 'Accès au schéma de médication partagé' 
  },
  { 
    id: 'vaccination_access', 
    label: 'Données vaccination', 
    description: 'Accès aux données de vaccination (Vaccinnet+)' 
  },
  { 
    id: 'chapter4_access', 
    label: 'Demandes Chapitre IV', 
    description: 'Consultation des accords pour médicaments remboursés' 
  }
];

// Simulation de l'API eHealth Consent
async function simulateConsentCheck(patientNiss) {
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  // Générer un statut basé sur le NISS pour simulation cohérente
  const hash = patientNiss ? patientNiss.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 0;
  
  return {
    success: true,
    patientNiss,
    consents: CONSENT_TYPES.map((type, index) => ({
      type: type.id,
      label: type.label,
      granted: (hash + index) % 3 !== 0, // Varie selon le NISS
      grantedDate: (hash + index) % 3 !== 0 ? '2024-03-15T10:30:00Z' : null,
      expirationDate: (hash + index) % 3 !== 0 ? '2025-03-15T10:30:00Z' : null,
      source: 'eHealth Consent Hub'
    })),
    lastChecked: new Date().toISOString(),
    source: 'SIMULATION'
  };
}

async function simulateConsentUpdate(patientNiss, consentType, granted) {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return {
    success: true,
    consentType,
    granted,
    updatedAt: new Date().toISOString(),
    source: 'SIMULATION'
  };
}

export default function EHealthConsentService({ patient, onConsentUpdated }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(null);
  const [consentData, setConsentData] = useState(null);
  const [consentHistory, setConsentHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Extraire le NISS du patient
  const patientNiss = patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '';
  const patientName = patient?.name?.find(n => n.use === 'official');
  const fullName = patientName ? `${(patientName.given || []).join(' ')} ${patientName.family || ''}`.trim() : 'Patient';

  // Vérifier le consentement au chargement si patient présent
  useEffect(() => {
    if (patient && patientNiss) {
      checkConsent();
    }
  }, [patient?.id]);

  const checkConsent = async () => {
    if (!patientNiss) {
      toast.error('NISS du patient requis pour vérifier le consentement');
      return;
    }

    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      
      // Vérification simulée du consentement
      const result = await simulateConsentCheck(patientNiss);
      
      if (result.success) {
        setConsentData(result);
        
        // Audit de la vérification
        await base44.entities.AuditLog.create({
          user_email: currentUser.email,
          action: 'CHECK_EHEALTH_CONSENT',
          target_entity: 'Patient',
          target_id: patient?.id,
          details: `Vérification consentement eHealth - Patient: ${fullName}`,
          timestamp: new Date().toISOString()
        });
        
        toast.success('Statut du consentement vérifié');
      }
    } catch (error) {
      console.error('Erreur vérification consentement:', error);
      toast.error('Erreur lors de la vérification');
    } finally {
      setIsLoading(false);
    }
  };

  const updateConsent = async (consentType, granted) => {
    if (!patientNiss) {
      toast.error('NISS du patient requis');
      return;
    }

    setIsUpdating(consentType);
    try {
      const currentUser = await base44.auth.me();
      
      const result = await simulateConsentUpdate(patientNiss, consentType, granted);
      
      if (result.success) {
        // Mettre à jour l'état local
        setConsentData(prev => ({
          ...prev,
          consents: prev.consents.map(c => 
            c.type === consentType 
              ? { ...c, granted, grantedDate: granted ? result.updatedAt : null }
              : c
          ),
          lastChecked: result.updatedAt
        }));
        
        // Ajouter à l'historique
        setConsentHistory(prev => [{
          type: consentType,
          action: granted ? 'GRANTED' : 'REVOKED',
          timestamp: result.updatedAt,
          by: currentUser.email
        }, ...prev].slice(0, 10));
        
        // Audit
        await base44.entities.AuditLog.create({
          user_email: currentUser.email,
          action: granted ? 'GRANT_CONSENT' : 'REVOKE_CONSENT',
          target_entity: 'Patient',
          target_id: patient?.id,
          details: `${granted ? 'Accord' : 'Révocation'} consentement ${consentType} - Patient: ${fullName}`,
          timestamp: new Date().toISOString()
        });
        
        toast.success(`Consentement ${granted ? 'accordé' : 'révoqué'}`);
        
        if (onConsentUpdated) {
          onConsentUpdated(consentData);
        }
      }
    } catch (error) {
      console.error('Erreur mise à jour consentement:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsUpdating(null);
    }
  };

  const grantedCount = consentData?.consents?.filter(c => c.granted).length || 0;
  const totalCount = consentData?.consents?.length || 0;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Consentement eHealth
          </div>
          <div className="flex items-center gap-2">
            {consentData && (
              <Badge variant={grantedCount === totalCount ? 'default' : 'secondary'} className="text-xs">
                {grantedCount}/{totalCount} actifs
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              <Info className="w-3 h-3 mr-1" />
              Mode simulation
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info patient */}
        {patient && (
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium">{fullName}</p>
              <p className="text-sm text-slate-500 font-mono">
                NISS: {patientNiss ? `${patientNiss.slice(0, 6)}***${patientNiss.slice(-2)}` : 'Non renseigné'}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkConsent}
              disabled={isLoading || !patientNiss}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}

        {/* Alerte si pas de patient */}
        {!patient && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-900 text-sm">
              Sélectionnez un patient pour vérifier son consentement eHealth.
            </AlertDescription>
          </Alert>
        )}

        {/* Liste des consentements */}
        {consentData?.consents && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Types de consentement</h4>
              {consentData.lastChecked && (
                <span className="text-xs text-slate-500">
                  Vérifié le {format(new Date(consentData.lastChecked), 'dd/MM/yyyy HH:mm', { locale: fr })}
                </span>
              )}
            </div>
            
            <div className="space-y-2">
              {consentData.consents.map((consent) => {
                const typeInfo = CONSENT_TYPES.find(t => t.id === consent.type);
                return (
                  <div 
                    key={consent.type}
                    className={`p-3 rounded-lg border ${consent.granted ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {consent.granted ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-400" />
                          )}
                          <span className="font-medium text-sm">{consent.label}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 ml-6">
                          {typeInfo?.description}
                        </p>
                        {consent.granted && consent.expirationDate && (
                          <p className="text-xs text-slate-500 mt-1 ml-6 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Expire le {format(new Date(consent.expirationDate), 'dd/MM/yyyy', { locale: fr })}
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={consent.granted}
                        onCheckedChange={(checked) => updateConsent(consent.type, checked)}
                        disabled={isUpdating === consent.type}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Historique */}
        {consentHistory.length > 0 && (
          <div className="pt-4 border-t">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowHistory(!showHistory)}
              className="w-full justify-between"
            >
              <span className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Historique des modifications
              </span>
              <Badge variant="secondary">{consentHistory.length}</Badge>
            </Button>
            
            {showHistory && (
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                {consentHistory.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded">
                    <span className={entry.action === 'GRANTED' ? 'text-green-600' : 'text-red-600'}>
                      {entry.action === 'GRANTED' ? '✓' : '✗'} {entry.type}
                    </span>
                    <span className="text-slate-500">
                      {format(new Date(entry.timestamp), 'dd/MM HH:mm', { locale: fr })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bouton vérification initial */}
        {!consentData && patient && patientNiss && (
          <Button 
            onClick={checkConsent} 
            disabled={isLoading} 
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Vérification en cours...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Vérifier le consentement
              </>
            )}
          </Button>
        )}

        {/* Liens utiles */}
        <div className="pt-4 border-t">
          <p className="text-xs text-slate-500 mb-2">Ressources officielles:</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
              <a href="https://www.ehealth.fgov.be/ehealthplatform/fr/service-gestion-du-consentement" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3 mr-1" />
                eHealth Consent
              </a>
            </Button>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
              <a href="https://www.masante.be" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3 mr-1" />
                MaSanté.be
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}