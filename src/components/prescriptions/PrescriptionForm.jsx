import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Send, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { useKmehrGenerator } from './useKmehrGenerator';
import { Prescription } from '@/entities/Prescription';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function PrescriptionForm({ patient, currentUser, onPrescriptionSent }) {
  const [medicaments, setMedicaments] = useState([{ nom_produit: '', posologie: '', duree_traitement: '' }]);
  const { isLoading, status, error, generatedRid, generateAndSendKmehr } = useKmehrGenerator();

  const handleMedicamentChange = (index, field, value) => {
    const newMedicaments = [...medicaments];
    newMedicaments[index][field] = value;
    setMedicaments(newMedicaments);
  };

  const addMedicament = () => {
    setMedicaments([...medicaments, { nom_produit: '', posologie: '', duree_traitement: '' }]);
  };

  const removeMedicament = (index) => {
    const newMedicaments = medicaments.filter((_, i) => i !== index);
    setMedicaments(newMedicaments);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const prescriptionData = {
      patient_id: patient.id,
      medecin_email: currentUser.email,
      date_prescription: new Date().toISOString(),
      medicaments: medicaments.filter(m => m.nom_produit && m.posologie),
    };

    if (prescriptionData.medicaments.length === 0) {
      alert("Veuillez ajouter au moins un médicament.");
      return;
    }

    const result = await generateAndSendKmehr(prescriptionData, patient, currentUser);

    if (result.success) {
      await Prescription.create({
        ...prescriptionData,
        statut_recip_e: 'Validé',
        recip_e_rid: result.rid,
      });
      if (onPrescriptionSent) onPrescriptionSent();
    } else {
      await Prescription.create({
        ...prescriptionData,
        statut_recip_e: 'Erreur',
        feedback_recip_e: result.error,
      });
    }
  };

  if (status === 'acknowledged') {
    return (
      <Alert className="border-green-500 bg-green-50 text-green-800">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <p className="font-bold">Prescription envoyée avec succès !</p>
          <p>Le RID de la prescription est : <strong className="font-mono">{generatedRid}</strong></p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => window.location.reload()}>Nouvelle prescription</Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouvelle Prescription Électronique (Recip-e)</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {medicaments.map((med, index) => (
            <div key={index} className="flex items-end gap-3 p-3 border rounded-lg">
              <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor={`med-name-${index}`}>Produit Médicinal</Label>
                  <Input id={`med-name-${index}`} value={med.nom_produit} onChange={e => handleMedicamentChange(index, 'nom_produit', e.target.value)} placeholder="ex: Amoxicilline 500mg" required />
                </div>
                <div>
                  <Label htmlFor={`med-poso-${index}`}>Posologie</Label>
                  <Input id={`med-poso-${index}`} value={med.posologie} onChange={e => handleMedicamentChange(index, 'posologie', e.target.value)} placeholder="ex: 1 comprimé 3x/jour" required />
                </div>
                <div>
                  <Label htmlFor={`med-duree-${index}`}>Durée</Label>
                  <Input id={`med-duree-${index}`} value={med.duree_traitement} onChange={e => handleMedicamentChange(index, 'duree_traitement', e.target.value)} placeholder="ex: 7 jours" />
                </div>
              </div>
              <Button type="button" variant="destructive" size="icon" onClick={() => removeMedicament(index)} disabled={medicaments.length === 1}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addMedicament}>
            <Plus className="w-4 h-4 mr-2" /> Ajouter un médicament
          </Button>

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {isLoading ? `Envoi en cours (${status})...` : 'Générer et envoyer via Recip-e'}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}