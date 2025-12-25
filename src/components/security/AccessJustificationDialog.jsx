import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, FileText } from 'lucide-react';
import { logDataAccess, AuditActions, ResourceTypes } from './AuditTrailService';
import { toast } from 'sonner';

const JUSTIFICATION_PRESETS = [
  { value: 'consultation', label: 'Consultation médicale programmée' },
  { value: 'urgence', label: 'Urgence médicale' },
  { value: 'suivi', label: 'Suivi de traitement' },
  { value: 'resultats', label: 'Consultation de résultats' },
  { value: 'prescription', label: 'Renouvellement de prescription' },
  { value: 'administratif', label: 'Motif administratif' },
  { value: 'autre', label: 'Autre (préciser)' }
];

export default function AccessJustificationDialog({ 
  isOpen, 
  onClose, 
  patient,
  action = AuditActions.VIEW,
  resourceType = ResourceTypes.PATIENT,
  resourceId,
  onAccessGranted,
  title = "Justification d'accès requise"
}) {
  const [selectedPreset, setSelectedPreset] = useState('');
  const [customJustification, setCustomJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const getJustification = () => {
    if (selectedPreset === 'autre') {
      return customJustification;
    }
    const preset = JUSTIFICATION_PRESETS.find(p => p.value === selectedPreset);
    return preset ? preset.label : customJustification;
  };
  
  const isValid = () => {
    if (!selectedPreset) return false;
    if (selectedPreset === 'autre' && customJustification.length < 10) return false;
    return true;
  };
  
  const handleSubmit = async () => {
    if (!isValid()) {
      toast.error('Veuillez fournir une justification valide');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await logDataAccess({
        patientId: patient.id,
        action,
        resourceType,
        resourceId: resourceId || patient.id,
        justification: getJustification()
      });
      
      toast.success('Accès autorisé et enregistré');
      onAccessGranted?.();
      onClose();
    } catch (error) {
      console.error('Error logging access:', error);
      toast.error("Erreur lors de l'enregistrement de l'accès");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCancel = () => {
    setSelectedPreset('');
    setCustomJustification('');
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <Alert className="border-amber-300 bg-amber-50">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              Conformément au RGPD, tout accès aux données patient doit être justifié et sera enregistré dans le journal d'audit.
            </AlertDescription>
          </Alert>
          
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600">
              <span className="font-medium">Patient:</span> {patient?.name?.[0]?.given?.join(' ')} {patient?.name?.[0]?.family}
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-medium">Action:</span> {action}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Motif de l'accès</Label>
            <Select value={selectedPreset} onValueChange={setSelectedPreset}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un motif..." />
              </SelectTrigger>
              <SelectContent>
                {JUSTIFICATION_PRESETS.map(preset => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedPreset === 'autre' && (
            <div className="space-y-2">
              <Label>Précisez le motif</Label>
              <Textarea
                value={customJustification}
                onChange={(e) => setCustomJustification(e.target.value)}
                placeholder="Décrivez la raison de cet accès..."
                className="h-20"
              />
              <p className="text-xs text-slate-500">
                Minimum 10 caractères ({customJustification.length}/10)
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid() || isSubmitting}>
            {isSubmitting ? 'Enregistrement...' : 'Confirmer l\'accès'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}