import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, User, Calendar } from 'lucide-react';
import { differenceInYears } from 'date-fns';

export default function PatientAssignment({ message, patients, onAssign, onCancel }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Suggestion basée sur NISS si disponible dans le message
  const suggestedPatients = patients.filter(patient => {
    if (message.patient_niss) {
      return patient.identifier?.some(id => 
        id.system?.includes('identity-cards') && id.value === message.patient_niss
      );
    }
    return false;
  });

  const filteredPatients = patients.filter(patient => {
    if (!searchTerm) return true;
    
    const officialName = patient.name?.find(n => n.use === 'official') || patient.name?.[0] || {};
    const fullName = `${(officialName.given || []).join(' ')} ${officialName.family || ''}`;
    
    return fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           patient.identifier?.some(id => id.value?.includes(searchTerm));
  });

  const handleAssign = () => {
    if (selectedPatient) {
      onAssign(selectedPatient.id);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Assigner le message à un patient</DialogTitle>
          <p className="text-sm text-slate-600 mt-2">
            Message: <strong>{message.subject}</strong>
            <br />
            De: {message.sender_name}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* NISS automatique si trouvé */}
          {suggestedPatients.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Correspondance NISS trouvée</h4>
              {suggestedPatients.map(patient => {
                const officialName = patient.name?.find(n => n.use === 'official') || patient.name?.[0] || {};
                const fullName = `${(officialName.given || []).join(' ')} ${officialName.family || ''}`;
                const age = patient.birthDate ? differenceInYears(new Date(), new Date(patient.birthDate)) : null;
                
                return (
                  <div 
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className={`p-3 rounded cursor-pointer transition-colors ${
                      selectedPatient?.id === patient.id ? 'bg-blue-200' : 'bg-white hover:bg-blue-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-semibold">{fullName}</p>
                        <p className="text-sm text-slate-600">
                          {age ? `${age} ans` : ''} • NISS: {message.patient_niss}
                        </p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 ml-auto">
                        Match NISS
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recherche manuelle */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Rechercher un patient par nom ou NISS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Liste des patients */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            {filteredPatients.length === 0 ? (
              <div className="text-center p-8 text-slate-500">
                <User className="w-12 h-12 mx-auto mb-2" />
                <p>Aucun patient trouvé</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredPatients.map(patient => {
                  const officialName = patient.name?.find(n => n.use === 'official') || patient.name?.[0] || {};
                  const fullName = `${(officialName.given || []).join(' ')} ${officialName.family || ''}`;
                  const age = patient.birthDate ? differenceInYears(new Date(), new Date(patient.birthDate)) : null;
                  const niss = patient.identifier?.find(id => id.system?.includes('identity-cards'))?.value;
                  
                  return (
                    <div
                      key={patient.id}
                      onClick={() => setSelectedPatient(patient)}
                      className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                        selectedPatient?.id === patient.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-slate-500" />
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{fullName}</p>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            {age && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{age} ans</span>
                              </div>
                            )}
                            {niss && (
                              <span>NISS: {niss}</span>
                            )}
                          </div>
                        </div>
                        {selectedPatient?.id === patient.id && (
                          <Badge className="bg-blue-100 text-blue-800">
                            Sélectionné
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedPatient}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Assigner
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}