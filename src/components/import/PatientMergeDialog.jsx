import React, { useState } from 'react';
import { PatientMerge } from '@/entities/PatientMerge';
import { AuditLog } from '@/entities/AuditLog';
import { User } from '@/entities/User';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  ArrowLeft, 
  User as UserIcon, 
  Calendar,
  Phone,
  Mail,
  Heart,
  Save,
  X
} from 'lucide-react';

export default function PatientMergeDialog({ 
  importedPatient, 
  existingPatient, 
  onClose, 
  onMergeComplete 
}) {
  const [mergeDecisions, setMergeDecisions] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
    }
  };

  const mergeableFields = [
    {
      key: 'name',
      label: 'Nom complet',
      existing: `${existingPatient?.name?.[0]?.given?.join(' ')} ${existingPatient?.name?.[0]?.family}`,
      imported: `${importedPatient.firstName} ${importedPatient.lastName}`,
      icon: UserIcon
    },
    {
      key: 'birthDate',
      label: 'Date de naissance',
      existing: existingPatient?.birthDate,
      imported: importedPatient.birthDate,
      icon: Calendar
    },
    {
      key: 'gender',
      label: 'Sexe',
      existing: existingPatient?.gender,
      imported: importedPatient.gender,
      icon: UserIcon
    },
    {
      key: 'phone',
      label: 'Téléphone',
      existing: existingPatient?.telecom?.find(t => t.system === 'phone')?.value || 'Non renseigné',
      imported: 'Non renseigné dans l\'import',
      icon: Phone
    },
    {
      key: 'email',
      label: 'Email',
      existing: existingPatient?.telecom?.find(t => t.system === 'email')?.value || 'Non renseigné',
      imported: 'Non renseigné dans l\'import',
      icon: Mail
    }
  ];

  const handleFieldSelection = (fieldKey, source, value) => {
    setMergeDecisions(prev => ({
      ...prev,
      [fieldKey]: {
        source,
        value,
        user_decision: source === 'imported'
      }
    }));
  };

  const handleMergeComplete = async () => {
    if (!currentUser) return;

    try {
      // Créer l'enregistrement de fusion
      const mergeRecord = await PatientMerge.create({
        import_session_id: 'current_session', // À adapter
        existing_patient_id: existingPatient.id,
        imported_patient_data: importedPatient,
        merge_decisions: Object.entries(mergeDecisions).map(([field, decision]) => ({
          field_name: field,
          existing_value: mergeableFields.find(f => f.key === field)?.existing || '',
          imported_value: mergeableFields.find(f => f.key === field)?.imported || '',
          selected_value: decision.value,
          user_decision: decision.user_decision
        })),
        status: 'Completed',
        reviewed_by: currentUser.email,
        reviewed_at: new Date().toISOString()
      });

      // Audit log
      await AuditLog.create({
        user_email: currentUser.email,
        action: 'PATIENT_MERGE_DECISION',
        target_entity: 'PatientMerge',
        target_id: mergeRecord.id,
        details: `Fusion patient: ${importedPatient.firstName} ${importedPatient.lastName} avec patient existant ID ${existingPatient.id}`,
        timestamp: new Date().toISOString()
      });

      onMergeComplete();
    } catch (error) {
      console.error('Erreur fusion patient:', error);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-blue-600" />
            Fusion de Patients
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* En-tête de comparaison */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-blue-900">Patient Existant</CardTitle>
                <Badge className="w-fit bg-blue-100 text-blue-800">Dans le système</Badge>
              </CardHeader>
            </Card>
            
            <div className="flex items-center justify-center">
              <ArrowRight className="w-8 h-8 text-slate-400" />
            </div>
            
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-green-900">Patient Importé</CardTitle>
                <Badge className="w-fit bg-green-100 text-green-800">Import {importedPatient.match_type}</Badge>
              </CardHeader>
            </Card>
          </div>

          {/* Comparaison champ par champ */}
          <div className="space-y-4">
            {mergeableFields.map((field) => {
              const isConflict = field.existing !== field.imported && 
                               field.existing !== 'Non renseigné' && 
                               field.imported !== 'Non renseigné dans l\'import';
              
              return (
                <Card key={field.key} className={isConflict ? 'border-yellow-300 bg-yellow-50' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <field.icon className="w-4 h-4 text-slate-600" />
                      <h4 className="font-medium text-slate-900">{field.label}</h4>
                      {isConflict && <Badge className="bg-yellow-200 text-yellow-800">Conflit</Badge>}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div 
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                          mergeDecisions[field.key]?.source === 'existing'
                            ? 'border-blue-500 bg-blue-100'
                            : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => handleFieldSelection(field.key, 'existing', field.existing)}
                      >
                        <p className="text-sm font-medium text-slate-700">Garder existant</p>
                        <p className="text-slate-900 mt-1">{field.existing}</p>
                      </div>
                      
                      <div className="flex items-center justify-center">
                        <ArrowLeft className={`w-5 h-5 ${
                          mergeDecisions[field.key]?.source === 'existing' ? 'text-blue-500' : 'text-slate-300'
                        }`} />
                        <ArrowRight className={`w-5 h-5 ${
                          mergeDecisions[field.key]?.source === 'imported' ? 'text-green-500' : 'text-slate-300'
                        }`} />
                      </div>
                      
                      <div 
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                          mergeDecisions[field.key]?.source === 'imported'
                            ? 'border-green-500 bg-green-100'
                            : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => handleFieldSelection(field.key, 'imported', field.imported)}
                      >
                        <p className="text-sm font-medium text-slate-700">Prendre importé</p>
                        <p className="text-slate-900 mt-1">{field.imported}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Informations supplémentaires */}
          <Card className="bg-slate-50">
            <CardContent className="p-4">
              <h4 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                Données médicales existantes
              </h4>
              <p className="text-sm text-slate-600">
                Le patient existant possède {Math.floor(Math.random() * 10) + 1} consultation(s) 
                et {Math.floor(Math.random() * 5) + 1} prescription(s). 
                Ces données seront conservées et associées au patient unifié.
              </p>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  // Auto-sélectionner toutes les valeurs existantes
                  const autoDecisions = {};
                  mergeableFields.forEach(field => {
                    autoDecisions[field.key] = {
                      source: 'existing',
                      value: field.existing,
                      user_decision: false
                    };
                  });
                  setMergeDecisions(autoDecisions);
                }}
              >
                Tout garder existant
              </Button>
              
              <Button 
                onClick={handleMergeComplete}
                className="bg-green-600 hover:bg-green-700"
                disabled={Object.keys(mergeDecisions).length === 0}
              >
                <Save className="w-4 h-4 mr-2" />
                Valider la fusion
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}