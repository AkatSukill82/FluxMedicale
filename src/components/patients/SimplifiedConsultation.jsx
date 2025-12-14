import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, X, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SimplifiedConsultation({ patient, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const [consultationText, setConsultationText] = useState('');
  const [includeBilling, setIncludeBilling] = useState(false);
  
  const [billingData, setBillingData] = useState({
    amount: '',
    payment_method: 'CARD',
    payment_status: 'PAID',
    payment_date: new Date().toISOString().split('T')[0]
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      
      // 1. Créer la consultation
      const consultation = await base44.entities.Consultation.create({
        patient_id: patient.id,
        medecin_email: user.email,
        date_consultation: new Date().toISOString(),
        motif: consultationText.split('\n')[0]?.substring(0, 100) || 'Consultation',
        anamnese: consultationText,
        examen_clinique: '',
        diagnostic: '',
        prescriptions: '',
        statut: 'Completee'
      });

      // 2. Créer l'événement timeline
      await base44.entities.TimelineEvent.create({
        patient_id: patient.id,
        event_type: 'CONSULTATION',
        event_date: new Date().toISOString(),
        title: `Consultation - ${new Date().toLocaleDateString('fr-FR')}`,
        description: consultationText.substring(0, 200),
        source: 'FluxMed',
        source_id: consultation.id,
        provider: user.email,
        created_by: user.email
      });

      // 3. Si facturation incluse, créer la facture
      if (includeBilling && billingData.amount && parseFloat(billingData.amount) > 0) {
        const invoice = await base44.entities.Invoice.create({
          patient_id: patient.id,
          provider_id: user.email,
          type: 'PAPER',
          payment_method: billingData.payment_method,
          status: billingData.payment_status === 'PAID' ? 'PAID' : 'NOT_SENT',
          total_amount: Math.round(parseFloat(billingData.amount) * 100),
          patient_contribution: billingData.payment_status === 'PAID' ? Math.round(parseFloat(billingData.amount) * 100) : 0,
          insurance_contribution: 0,
          invoice_date: billingData.payment_date,
          paid_at: billingData.payment_status === 'PAID' ? new Date().toISOString() : null,
          created_by: user.email
        });

        // Événement timeline pour la facturation
        await base44.entities.TimelineEvent.create({
          patient_id: patient.id,
          event_type: 'CONSULTATION',
          event_date: new Date().toISOString(),
          title: `Facturation - ${parseFloat(billingData.amount).toFixed(2)}€`,
          description: `Paiement ${billingData.payment_status === 'PAID' ? 'reçu' : 'en attente'} - ${billingData.payment_method}`,
          source: 'FluxMed',
          source_id: invoice.id,
          provider: user.email,
          created_by: user.email
        });
      }

      return consultation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['timeline_events'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Consultation enregistrée avec succès');
      if (onSaved) onSaved();
      if (onClose) onClose();
    },
    onError: (error) => {
      console.error('Error saving consultation:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!consultationText.trim()) {
      toast.error('Veuillez saisir le contenu de la consultation');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Nouvelle consultation</h2>
        <Button type="button" variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes de consultation</CardTitle>
          <p className="text-sm text-muted-foreground">
            Saisissez librement vos observations, diagnostic, traitement...
          </p>
        </CardHeader>
        <CardContent>
          <Textarea
            value={consultationText}
            onChange={(e) => setConsultationText(e.target.value)}
            placeholder="Écrivez ici toutes vos notes de consultation sans limite de caractères...

Exemple:
Motif: Douleurs abdominales
Anamnèse: Patient présente des douleurs depuis 2 jours...
Examen: Abdomen souple, sensibilité en fosse iliaque droite...
Diagnostic: Appendicite probable
Traitement: Référé aux urgences pour scanner et avis chirurgical"
            className="min-h-[300px] font-mono text-sm"
            required
          />
          <p className="text-xs text-muted-foreground mt-2">
            {consultationText.length} caractères
          </p>
        </CardContent>
      </Card>

      {/* Facturation intégrée */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Facturation (optionnel)
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIncludeBilling(!includeBilling)}
            >
              {includeBilling ? 'Masquer' : 'Ajouter facturation'}
            </Button>
          </div>
        </CardHeader>
        
        {includeBilling && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Montant (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={billingData.amount}
                  onChange={(e) => setBillingData({...billingData, amount: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <Label>Mode de paiement</Label>
                <Select 
                  value={billingData.payment_method} 
                  onValueChange={(v) => setBillingData({...billingData, payment_method: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CARD">Carte</SelectItem>
                    <SelectItem value="CASH">Espèces</SelectItem>
                    <SelectItem value="BANK">Virement</SelectItem>
                    <SelectItem value="PAPER">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Statut du paiement</Label>
                <Select 
                  value={billingData.payment_status} 
                  onValueChange={(v) => setBillingData({...billingData, payment_status: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PAID">Payé</SelectItem>
                    <SelectItem value="PARTIALLY_PAID">Partiellement payé</SelectItem>
                    <SelectItem value="UNPAID">Non payé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Date du paiement</Label>
                <Input
                  type="date"
                  value={billingData.payment_date}
                  onChange={(e) => setBillingData({...billingData, payment_date: e.target.value})}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" disabled={saveMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer la consultation'}
        </Button>
      </div>
    </form>
  );
}