import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Play, Pause, Trash2, Calendar, Euro, RefreshCw, Pill } from 'lucide-react';
import { format, addDays, addMonths, addWeeks, addYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import NomenSearch from '../nomenclature/NomenSearch';
import MedicationSearch from '../medications/MedicationSearch';

export default function RecurringInvoiceManager() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [formData, setFormData] = useState({
    patient_id: '',
    template_name: '',
    frequency: 'MONTHLY',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    payment_method: 'BANK',
    auto_send: true,
    invoice_lines: [],
    medications: []
  });

  const { data: recurringInvoices = [] } = useQuery({
    queryKey: ['recurringInvoices'],
    queryFn: () => base44.entities.RecurringInvoice.list('-created_date', 100)
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('-created_date', 200)
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const total = data.invoice_lines.reduce((sum, line) => sum + line.amount, 0);
      
      return await base44.entities.RecurringInvoice.create({
        ...data,
        total_amount: total,
        next_invoice_date: data.start_date,
        status: 'ACTIVE',
        invoices_generated: [],
        created_by: user.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringInvoices'] });
      toast.success('Facturation récurrente créée');
      setShowDialog(false);
      resetForm();
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.RecurringInvoice.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringInvoices'] });
      toast.success('Statut mis à jour');
    }
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: async (recurring) => {
      const user = await base44.auth.me();
      const patient = patients.find(p => p.id === recurring.patient_id);
      
      // Create invoice
      const invoice = await base44.entities.Invoice.create({
        patient_id: recurring.patient_id,
        provider_id: user.email,
        type: 'EATTEST',
        payment_method: recurring.payment_method,
        status: 'SENT',
        total_amount: recurring.total_amount,
        patient_contribution: recurring.total_amount,
        insurance_contribution: 0,
        invoice_date: new Date().toISOString().split('T')[0],
        created_by: user.email
      });

      // Create invoice lines
      for (const line of recurring.invoice_lines) {
        await base44.entities.InvoiceLine.create({
          invoice_id: invoice.id,
          ...line,
          date_prestation: new Date().toISOString().split('T')[0]
        });
      }

      // Calculate next invoice date
      let nextDate = new Date(recurring.next_invoice_date);
      switch (recurring.frequency) {
        case 'WEEKLY': nextDate = addWeeks(nextDate, 1); break;
        case 'MONTHLY': nextDate = addMonths(nextDate, 1); break;
        case 'QUARTERLY': nextDate = addMonths(nextDate, 3); break;
        case 'YEARLY': nextDate = addYears(nextDate, 1); break;
      }

      // Update recurring invoice
      await base44.entities.RecurringInvoice.update(recurring.id, {
        next_invoice_date: format(nextDate, 'yyyy-MM-dd'),
        invoices_generated: [...(recurring.invoices_generated || []), invoice.id]
      });

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringInvoices'] });
      toast.success('Facture générée avec succès');
    }
  });

  const resetForm = () => {
    setFormData({
      patient_id: '',
      template_name: '',
      frequency: 'MONTHLY',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: '',
      payment_method: 'BANK',
      auto_send: true,
      invoice_lines: [],
      medications: []
    });
    setSelectedInvoice(null);
  };

  const handleAddMedication = (drug) => {
    setFormData({
      ...formData,
      medications: [
        ...formData.medications,
        {
          drug_id: drug.id,
          drug_name: drug.product_name,
          dosage: `${drug.strength} ${drug.unit}`,
          quantity: 1,
          price: 0
        }
      ]
    });
  };

  const handleAddLine = (nomenCode) => {
    const unitPrice = (nomenCode.honorarium || 0) / 100;
    setFormData({
      ...formData,
      invoice_lines: [
        ...formData.invoice_lines,
        {
          nomenclature_code: nomenCode.code,
          nomenclature_label: nomenCode.title_fr,
          quantity: 1,
          unit_price: unitPrice,
          amount: unitPrice
        }
      ]
    });
  };

  const frequencyLabels = {
    WEEKLY: 'Hebdomadaire',
    MONTHLY: 'Mensuelle',
    QUARTERLY: 'Trimestrielle',
    YEARLY: 'Annuelle'
  };

  const statusColors = {
    ACTIVE: 'bg-green-100 text-green-800',
    PAUSED: 'bg-yellow-100 text-yellow-800',
    CANCELLED: 'bg-red-100 text-red-800',
    COMPLETED: 'bg-slate-100 text-slate-800'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Facturations récurrentes</h2>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle facturation récurrente
        </Button>
      </div>

      <div className="grid gap-4">
        {recurringInvoices.map(recurring => {
          const patient = patients.find(p => p.id === recurring.patient_id);
          const patientName = patient?.name?.[0] 
            ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}` 
            : 'Patient inconnu';
          
          return (
            <Card key={recurring.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-semibold text-lg">{recurring.template_name}</h3>
                      <Badge className={statusColors[recurring.status]}>
                        {recurring.status}
                      </Badge>
                      <Badge variant="outline">
                        {frequencyLabels[recurring.frequency]}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Patient</p>
                        <p className="font-medium">{patientName}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Montant</p>
                        <p className="font-medium text-lg text-blue-600">
                          {(recurring.total_amount / 100).toFixed(2)}€
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Prochaine facturation</p>
                        <p className="font-medium flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(recurring.next_invoice_date), 'dd MMM yyyy', { locale: fr })}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Factures générées</p>
                        <p className="font-medium">{recurring.invoices_generated?.length || 0}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {recurring.status === 'ACTIVE' && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => generateInvoiceMutation.mutate(recurring)}
                          title="Générer maintenant"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateStatusMutation.mutate({ id: recurring.id, status: 'PAUSED' })}
                          title="Mettre en pause"
                        >
                          <Pause className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {recurring.status === 'PAUSED' && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updateStatusMutation.mutate({ id: recurring.id, status: 'ACTIVE' })}
                        title="Reprendre"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateStatusMutation.mutate({ id: recurring.id, status: 'CANCELLED' })}
                      className="text-red-600"
                      title="Annuler"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle facturation récurrente</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Patient</Label>
                <Select value={formData.patient_id} onValueChange={(v) => setFormData({...formData, patient_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(p => {
                      const name = p.name?.[0] ? `${p.name[0].given?.join(' ')} ${p.name[0].family}` : p.id;
                      return <SelectItem key={p.id} value={p.id}>{name}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Nom du modèle</Label>
                <Input
                  value={formData.template_name}
                  onChange={(e) => setFormData({...formData, template_name: e.target.value})}
                  placeholder="Ex: Abonnement mensuel"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Fréquence</Label>
                <Select value={formData.frequency} onValueChange={(v) => setFormData({...formData, frequency: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Hebdomadaire</SelectItem>
                    <SelectItem value="MONTHLY">Mensuelle</SelectItem>
                    <SelectItem value="QUARTERLY">Trimestrielle</SelectItem>
                    <SelectItem value="YEARLY">Annuelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Date de début</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                />
              </div>
              
              <div>
                <Label>Mode de paiement</Label>
                <Select value={formData.payment_method} onValueChange={(v) => setFormData({...formData, payment_method: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK">Virement</SelectItem>
                    <SelectItem value="DOMICILIATION">Domiciliation</SelectItem>
                    <SelectItem value="CARD">Carte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Actes à facturer</Label>
              <NomenSearch onSelect={handleAddLine} selectedCodes={formData.invoice_lines} />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Pill className="w-4 h-4" />
                Médicaments à facturer
              </Label>
              <MedicationSearch 
                onSelect={handleAddMedication} 
                selectedMedications={formData.medications}
                showPrice={true}
              />
            </div>

            {(formData.invoice_lines.length > 0 || formData.medications.length > 0) && (
              <div className="space-y-2">
                {formData.invoice_lines.map((line, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                    <div>
                      <p className="font-medium">{line.nomenclature_label}</p>
                      <p className="text-sm text-slate-600">Code: {line.nomenclature_code}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-semibold text-blue-600">{line.amount.toFixed(2)}€</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setFormData({
                          ...formData,
                          invoice_lines: formData.invoice_lines.filter((_, i) => i !== idx)
                        })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {formData.medications.map((med, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
                    <div className="flex items-center gap-2">
                      <Pill className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="font-medium">{med.drug_name}</p>
                        <p className="text-sm text-slate-600">{med.dosage}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Input
                        type="number"
                        value={med.price}
                        onChange={(e) => {
                          const newMeds = [...formData.medications];
                          newMeds[idx].price = parseFloat(e.target.value) || 0;
                          setFormData({...formData, medications: newMeds});
                        }}
                        placeholder="Prix"
                        className="w-24 h-8"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setFormData({
                          ...formData,
                          medications: formData.medications.filter((_, i) => i !== idx)
                        })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <div className="bg-blue-50 p-4 rounded">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {(
                        formData.invoice_lines.reduce((sum, line) => sum + line.amount, 0) +
                        formData.medications.reduce((sum, med) => sum + (med.price || 0), 0)
                      ).toFixed(2)}€
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => createMutation.mutate(formData)}
                disabled={!formData.patient_id || !formData.template_name || formData.invoice_lines.length === 0}
              >
                Créer la facturation récurrente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}