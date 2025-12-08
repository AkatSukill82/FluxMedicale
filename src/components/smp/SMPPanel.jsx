
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label'; // New import for form fields
import { Input } from '@/components/ui/input'; // New import for form fields
import { toast } from 'react-hot-toast'; // New import for toast notifications
import { 
  Pill, 
  Download, 
  FileText, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  Plus, // New import for add button icon
  Loader2 // New import for loading spinner
} from 'lucide-react';
import { useSMP } from './useSMP';
import { useVIDISWrite } from '../vidis/useVIDISWrite'; // New import for VIDIS write operations
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function SMPPanel({ patient, currentUser, hasConsent, hasTherapeuticLink }) {
  const [smpData, setSmpData] = useState(null);
  const { isLoading, error, getMedicationScheme, exportSMPAsXML, generateSMPPDF } = useSMP(currentUser);

  // New state and hook for VIDIS write operations
  const { isWriting, createMedicationElement, suspendTreatment, resumeTreatment } = useVIDISWrite();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMedication, setNewMedication] = useState({
    productName: '',
    dose: '',
    posology: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    // Only attempt to load SMP if consent and therapeutic link exist, and patient NISS is available
    if (hasConsent && hasTherapeuticLink && patient?.niss) {
      loadSMP();
    }
  }, [patient, hasConsent, hasTherapeuticLink]); // Re-run when patient, consent, or link changes

  const loadSMP = async () => {
    if (patient?.niss) { // Ensure patient NISS is available before making the call
      const data = await getMedicationScheme(patient); // useSMP hook expects patient object
      if (data) {
        setSmpData(data);
      }
    }
  };

  const handleAddMedication = async () => {
    if (!newMedication.productName || !newMedication.posology) {
      toast.error('Veuillez remplir les champs obligatoires (Médicament, Posologie)');
      return;
    }

    if (!patient?.niss) {
      toast.error('Erreur: Le NISS du patient est manquant.');
      return;
    }

    try {
      await createMedicationElement(patient.niss, {
        productName: newMedication.productName,
        dose: newMedication.dose,
        posology: newMedication.posology,
        // Dates should be in YYYY-MM-DD format for VIDIS API
        startDate: newMedication.startDate || undefined, // Send if present, else undefined
        endDate: newMedication.endDate || undefined
      });
      toast.success('Médicament ajouté au schéma partagé');
      setShowAddForm(false); // Close the form
      setNewMedication({ productName: '', dose: '', posology: '', startDate: '', endDate: '' }); // Reset form
      await loadSMP(); // Refresh the SMP data to show the new medication
    } catch (err) {
      console.error('Error adding medication to SMP:', err);
      toast.error(`Erreur lors de l'ajout: ${err.message || err.toString()}`);
    }
  };

  const handleSuspend = async (medication) => {
    if (!patient?.niss) {
      toast.error('Erreur: Le NISS du patient est manquant.');
      return;
    }
    try {
      // Assuming medication.id is the unique identifier for the medication element
      await suspendTreatment(patient.niss, medication.id, {
        reason: 'Suspension temporaire', // Placeholder, could be extended with user input
        suspension_date: format(new Date(), 'yyyy-MM-dd') // Today's date for suspension
      });
      toast.success('Traitement suspendu avec succès');
      await loadSMP(); // Refresh the SMP data
    } catch (err) {
      console.error('Error suspending treatment:', err);
      toast.error(`Erreur lors de la suspension: ${err.message || err.toString()}`);
    }
  };

  const handleResume = async (suspension) => { // Renamed parameter for clarity as it's a suspension object
    if (!patient?.niss) {
      toast.error('Erreur: Le NISS du patient est manquant.');
      return;
    }
    try {
      // Assuming suspension.id is the identifier of the suspension record that needs to be resumed.
      // The useVIDISWrite hook is expected to map this back to the original medication element.
      await resumeTreatment(patient.niss, suspension.id);
      toast.success('Traitement repris avec succès');
      await loadSMP(); // Refresh the SMP data
    } catch (err) {
      console.error('Error resuming treatment:', err);
      toast.error(`Erreur lors de la reprise: ${err.message || err.toString()}`);
    }
  };

  // Vérification des prérequis (Consentement et Lien Thérapeutique)
  if (!hasConsent || !hasTherapeuticLink) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-orange-900 mb-2">Accès SMP restreint</h4>
              <p className="text-sm text-orange-700 mb-3">
                L'accès au Schéma de Médication Partagé nécessite :
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  {hasConsent ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className={hasConsent ? 'text-green-800' : 'text-red-800'}>
                    Consentement patient
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hasTherapeuticLink ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className={hasTherapeuticLink ? 'text-green-800' : 'text-red-800'}>
                    Lien thérapeutique actif
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <RefreshCw className="w-12 h-12 mx-auto text-blue-600 animate-spin mb-4" />
          <p className="text-slate-600">Récupération du schéma de médication...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900 mb-1">Erreur d'accès au SMP</h4>
              <p className="text-sm text-red-700">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadSMP}
                className="mt-3"
                type="button"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter medications, even if smpData is null, to avoid errors
  const activeMedications = smpData ? smpData.medicationschemeelement.filter(m => m.status === 'ACTIVE') : [];
  const suspendedMedications = smpData ? smpData.treatmentsuspension : [];

  return (
    <div className="space-y-6">
      {/* Bouton Ajouter et Titre Section */}
      {/* Visible only if consent and therapeutic link are active */}
      {hasConsent && hasTherapeuticLink && (
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-slate-900">Schéma de médication partagé</h3>
          <Button onClick={() => setShowAddForm(!showAddForm)} type="button">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un médicament
          </Button>
        </div>
      )}

      {/* Formulaire d'ajout de médicament */}
      {showAddForm && hasConsent && hasTherapeuticLink && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 space-y-3">
            <div>
              <Label htmlFor="productName">Médicament *</Label>
              <Input
                id="productName"
                value={newMedication.productName}
                onChange={(e) => setNewMedication({ ...newMedication, productName: e.target.value })}
                placeholder="Nom du produit..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="dose">Dose</Label>
                <Input
                  id="dose"
                  value={newMedication.dose}
                  onChange={(e) => setNewMedication({ ...newMedication, dose: e.target.value })}
                  placeholder="ex: 500mg"
                />
              </div>
              <div>
                <Label htmlFor="posology">Posologie *</Label>
                <Input
                  id="posology"
                  value={newMedication.posology}
                  onChange={(e) => setNewMedication({ ...newMedication, posology: e.target.value })}
                  placeholder="ex: 2x/jour"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="startDate">Date début</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={newMedication.startDate}
                  onChange={(e) => setNewMedication({ ...newMedication, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endDate">Date fin</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={newMedication.endDate}
                  onChange={(e) => setNewMedication({ ...newMedication, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)} type="button">
                Annuler
              </Button>
              <Button onClick={handleAddMedication} disabled={isWriting} type="button">
                {isWriting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* En-tête SMP - visible only if smpData is available */}
      {smpData && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <Pill className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-blue-900">Schéma de Médication Partagé (SMP)</CardTitle>
                  <p className="text-sm text-blue-700 mt-1">
                    Source: HUB {smpData.medicationscheme.hub_source} • 
                    Version: {smpData.medicationscheme.version}
                  </p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">
                <Clock className="w-3 h-3 mr-1" />
                MAJ: {format(new Date(smpData.medicationscheme.last_update), 'dd/MM/yyyy HH:mm', { locale: fr })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => generateSMPPDF(smpData, patient)}
                className="bg-white"
                type="button"
              >
                <FileText className="w-4 h-4 mr-2" />
                Imprimer PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportSMPAsXML(smpData)}
                className="bg-white"
                type="button"
              >
                <Download className="w-4 h-4 mr-2" />
                Exporter XML
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={loadSMP}
                className="bg-white"
                type="button"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Médicaments actifs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Médication active ({activeMedications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeMedications.length === 0 ? (
            <p className="text-slate-600 text-center py-8">
              {smpData ? 'Aucun médicament actif' : 'Aucun schéma de médication disponible'}
            </p>
          ) : (
            <div className="space-y-4">
              {activeMedications.map((med) => (
                <div 
                  key={med.id} 
                  className="p-4 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-slate-900 text-lg">{med.preparation}</h4>
                      <p className="text-sm text-slate-600">{med.substance}</p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        CNK: {med.cnk}
                      </Badge>
                    </div>
                    {/* Actions for active medications */}
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">
                        Actif
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSuspend(med)}
                        disabled={isWriting}
                        type="button"
                      >
                        Suspendre
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-sm">
                    <div>
                      <p className="text-slate-600 font-medium mb-1">Posologie</p>
                      <p className="text-slate-900">{med.posology}</p>
                      <p className="text-xs text-slate-500 mt-1">Voie: {med.route}</p>
                    </div>

                    <div>
                      <p className="text-slate-600 font-medium mb-1">Indication</p>
                      <p className="text-slate-900">{med.indication}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>Prescripteur: {med.prescriber}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Début: {format(new Date(med.start_date), 'dd/MM/yyyy')}</span>
                      </div>
                      {med.end_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Fin: {format(new Date(med.end_date), 'dd/MM/yyyy')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suspensions */}
      {suspendedMedications.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-orange-600" />
              Traitements suspendus ({suspendedMedications.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suspendedMedications.map((susp) => (
                <div 
                  key={susp.id} 
                  className="p-4 bg-orange-50 border border-orange-200 rounded-lg"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-slate-900">{susp.preparation}</h4>
                      <p className="text-sm text-slate-600">{susp.substance}</p>
                    </div>
                    {/* Actions for suspended medications */}
                    <div className="flex items-center gap-2">
                      <Badge className="bg-orange-100 text-orange-800">
                        Suspendu
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResume(susp)}
                        disabled={isWriting}
                        className="text-green-600 border-green-300 hover:bg-green-50"
                        type="button"
                      >
                        Reprendre
                      </Button>
                    </div>
                  </div>

                  <div className="mt-2 text-sm">
                    <p className="text-slate-600 font-medium mb-1">Raison de la suspension</p>
                    <p className="text-slate-900">{susp.suspension_reason}</p>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-orange-200 text-xs text-slate-600">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{susp.suspended_by}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{format(new Date(susp.suspended_at), 'dd/MM/yyyy')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info légale */}
      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription className="text-blue-900 text-sm">
          <strong>Note:</strong> Le Schéma de Médication Partagé (SMP) est accessible via le HUB eHealth avec votre certificat professionnel.
          Les données affichées sont synchronisées depuis le réseau de soins belge (RSW/CoZo/Brussels HUB).
          Toute consultation est tracée dans le journal d'audit conformément au RGPD.
        </AlertDescription>
      </Alert>
    </div>
  );
}
