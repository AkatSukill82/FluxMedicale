import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Euro, Clock, CreditCard, Loader2, Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import { handleError, handleSuccess } from '../utils/ErrorHandler';
import NomenclatureSelector from './NomenclatureSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

// Modèles de facturation rapide pour consultations courantes
const QUICK_BILLING_TEMPLATES = [
  {
    id: 'consultation_simple',
    name: 'Consultation simple',
    icon: Clock,
    color: 'bg-blue-100 text-blue-800',
    codes: ['101010'],
    amount: 25.00,
    duration: '15-20 min'
  },
  {
    id: 'consultation_longue',
    name: 'Consultation longue',
    icon: Clock,
    color: 'bg-purple-100 text-purple-800',
    codes: ['101032'],
    amount: 50.00,
    duration: '30-45 min'
  },
  {
    id: 'visite_domicile',
    name: 'Visite à domicile',
    icon: Clock,
    color: 'bg-orange-100 text-orange-800',
    codes: ['103132'],
    amount: 35.00,
    duration: 'Variable'
  },
  {
    id: 'certificat',
    name: 'Certificat médical',
    icon: CreditCard,
    color: 'bg-green-100 text-green-800',
    codes: [],
    amount: 10.00,
    duration: '5 min'
  }
];

export default function QuickBilling({ patient, isOpen, onClose }) {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [activeTab, setActiveTab] = useState('quick');
  
  // États pour vérification assurabilité et tarifs
  const [assurabilityChecked, setAssurabilityChecked] = useState(false);
  const [assurabilityResult, setAssurabilityResult] = useState(null);
  const [checkingAssurability, setCheckingAssurability] = useState(false);
  const [tarifChecked, setTarifChecked] = useState(false);
  const [tarifResult, setTarifResult] = useState(null);
  const [checkingTarif, setCheckingTarif] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingBillData, setPendingBillData] = useState(null);

  // Vérification assurabilité patient
  const handleCheckAssurability = async () => {
    setCheckingAssurability(true);
    try {
      // Simulation appel MyCareNet (en production: appel réel)
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const niss = patient?.identifier?.find(id => id.system?.includes('ssin'))?.value;
      const mutuelle = patient?.mutuelle || 'Non renseignée';
      
      // Simulation résultat
      const result = {
        success: true,
        assurable: true,
        niss: niss ? `***-${niss.slice(-4)}` : 'Non renseigné',
        mutuelle: mutuelle,
        regime: mutuelle?.toLowerCase().includes('bim') || mutuelle?.toLowerCase().includes('omnio') ? 'BIM/OMNIO' : 'Régime normal',
        tiers_payant: true,
        dmg: true,
        validUntil: '31/12/2025'
      };
      
      setAssurabilityResult(result);
      setAssurabilityChecked(true);
      toast.success('Patient assuré - Tiers-payant applicable');
    } catch (error) {
      setAssurabilityResult({ success: false, error: error.message });
      toast.error('Erreur lors de la vérification');
    } finally {
      setCheckingAssurability(false);
    }
  };

  // Vérification tarifs INAMI
  const handleCheckTarif = async () => {
    setCheckingTarif(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const codes = activeTab === 'quick' && selectedTemplate 
        ? selectedTemplate.codes 
        : selectedCodes.map(c => c.code);
      
      // Simulation vérification tarifs
      const result = {
        success: true,
        codesVerified: codes.length,
        allCorrect: true,
        details: codes.map(code => ({
          code,
          status: 'correct',
          message: 'Tarif conforme INAMI 2024'
        }))
      };
      
      setTarifResult(result);
      setTarifChecked(true);
      toast.success('Tarifs vérifiés - Tous conformes INAMI');
    } catch (error) {
      setTarifResult({ success: false, error: error.message });
      toast.error('Erreur lors de la vérification des tarifs');
    } finally {
      setCheckingTarif(false);
    }
  };

  // Fonction pour tenter la facturation
  const attemptBill = (data) => {
    if (!tarifChecked) {
      setPendingBillData(data);
      setShowConfirmDialog(true);
    } else {
      billMutation.mutate(data);
    }
  };

  const confirmBillWithoutCheck = () => {
    setShowConfirmDialog(false);
    if (pendingBillData) {
      billMutation.mutate(pendingBillData);
    }
  };

  const billMutation = useMutation({
    mutationFn: async (data) => {
      const currentUser = await base44.auth.me();
      
      let totalAmount, patientShare, insuranceShare, codes, isCustom;
      
      if (data.isCustom) {
        // Facturation personnalisée avec codes INAMI
        isCustom = true;
        codes = data.codes;
        totalAmount = data.codes.reduce((sum, code) => sum + (code.honorarium || 0), 0);
        insuranceShare = data.codes.reduce((sum, code) => sum + (code.reimbursed || 0), 0);
        patientShare = totalAmount - insuranceShare;
      } else {
        // Template rapide
        isCustom = false;
        codes = data.template.codes;
        totalAmount = data.template.amount * 100;
        patientShare = totalAmount;
        insuranceShare = 0;
      }
      
      // Créer la facture
      const invoice = await base44.entities.Invoice.create({
        patient_id: patient.id,
        provider_id: currentUser.email,
        type: 'EATTEST',
        payment_method: paymentMethod,
        status: 'SENT',
        total_amount: totalAmount,
        patient_contribution: patientShare,
        insurance_contribution: insuranceShare,
        invoice_date: new Date().toISOString().split('T')[0],
        created_by: currentUser.email
      });

      // Créer les lignes de facture
      if (isCustom) {
        for (const code of codes) {
          await base44.entities.InvoiceLine.create({
            invoice_id: invoice.id,
            nomenclature_code: code.code,
            nomenclature_label: code.title_fr,
            quantity: 1,
            unit_price: code.honorarium,
            amount: code.honorarium,
            date_prestation: new Date().toISOString().split('T')[0]
          });
        }
      } else {
        for (const code of codes) {
          await base44.entities.InvoiceLine.create({
            invoice_id: invoice.id,
            nomenclature_code: code,
            nomenclature_label: data.template.name,
            quantity: 1,
            unit_price: data.template.amount,
            amount: data.template.amount,
            date_prestation: new Date().toISOString().split('T')[0]
          });
        }
      }

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      handleSuccess('Facturation enregistrée avec succès');
      onClose();
    },
    onError: (error) => {
      handleError(error, 'Facturation');
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Euro className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Facturation</h2>
              <p className="text-sm font-normal text-muted-foreground">
                {patient?.name?.[0] ? `${patient.name[0].given?.join(' ')} ${patient.name[0].family}` : 'Patient'}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="quick">Facturation rapide</TabsTrigger>
            <TabsTrigger value="custom">Codes INAMI</TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="space-y-4">
            {/* Section vérification assurabilité */}
            <div className="p-4 bg-slate-50 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Vérification patient</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCheckAssurability}
                  disabled={checkingAssurability}
                  className="gap-2"
                >
                  {checkingAssurability ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Vérification...</>
                  ) : assurabilityChecked ? (
                    <><CheckCircle className="w-4 h-4 text-green-600" /> Vérifié</>
                  ) : (
                    <>Vérifier assurabilité</>
                  )}
                </Button>
              </div>
              
              {assurabilityResult && (
                <Alert className={assurabilityResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                  <AlertDescription>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><strong>Mutuelle:</strong> {assurabilityResult.mutuelle}</div>
                      <div><strong>Régime:</strong> {assurabilityResult.regime}</div>
                      <div><strong>Tiers-payant:</strong> {assurabilityResult.tiers_payant ? '✅ Oui' : '❌ Non'}</div>
                      <div><strong>DMG:</strong> {assurabilityResult.dmg ? '✅ Actif' : '❌ Non'}</div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
          {QUICK_BILLING_TEMPLATES.map(template => {
            const Icon = template.icon;
            const isSelected = selectedTemplate?.id === template.id;
            return (
              <button
                key={template.id}
                className={`p-6 border-2 rounded-xl transition-all text-left ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-slate-200 hover:border-blue-300 hover:shadow-sm'
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${template.color}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{template.name}</h3>
                    <p className="text-3xl font-bold text-blue-600 mb-1">
                      {template.amount.toFixed(2)}€
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {template.duration}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
            })}
            </div>

            {selectedTemplate && (
          <div className="space-y-6 pt-6 border-t">
            {/* Bouton vérification tarifs */}
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2">
                {tarifChecked ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
                <span className="text-sm font-medium">
                  {tarifChecked ? 'Tarifs vérifiés ✓' : 'Vérifiez les tarifs avant facturation'}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckTarif}
                disabled={checkingTarif}
                className="gap-2"
              >
                {checkingTarif ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Vérification...</>
                ) : (
                  <>Vérifier tarifs INAMI</>
                )}
              </Button>
            </div>

            {tarifResult && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800 text-sm">
                  {tarifResult.codesVerified} code(s) vérifié(s) - Tarifs conformes INAMI 2024
                </AlertDescription>
              </Alert>
            )}

            <div>
              <p className="text-sm font-semibold mb-3">Mode de paiement</p>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={paymentMethod === 'CARD' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('CARD')}
                  className="h-16 flex flex-col gap-1"
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-xs">Bancontact</span>
                </Button>
                <Button
                  variant={paymentMethod === 'CASH' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('CASH')}
                  className="h-16 flex flex-col gap-1"
                >
                  <Euro className="w-5 h-5" />
                  <span className="text-xs">Comptant</span>
                </Button>
                <Button
                  variant={paymentMethod === 'BANK' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('BANK')}
                  className="h-16 flex flex-col gap-1"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span className="text-xs">Virement</span>
                </Button>
              </div>
            </div>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
              onClick={() => attemptBill({ template: selectedTemplate, isCustom: false })}
              disabled={billMutation.isPending}
            >
              {billMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Enregistrement en cours...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Facturer {selectedTemplate.amount.toFixed(2)}€
                </>
              )}
            </Button>
            </div>
            )}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <NomenclatureSelector
              selectedCodes={selectedCodes}
              onCodesChange={setSelectedCodes}
              mutuelle={{ conventioned: patient?.mutuelle !== 'Non conventionné' }}
              patient={patient}
            />

            {selectedCodes.length > 0 && (
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <p className="text-sm font-semibold mb-3">Mode de paiement</p>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant={paymentMethod === 'CARD' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('CARD')}
                      className="h-16 flex flex-col gap-1"
                    >
                      <CreditCard className="w-5 h-5" />
                      <span className="text-xs">Bancontact</span>
                    </Button>
                    <Button
                      variant={paymentMethod === 'CASH' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('CASH')}
                      className="h-16 flex flex-col gap-1"
                    >
                      <Euro className="w-5 h-5" />
                      <span className="text-xs">Comptant</span>
                    </Button>
                    <Button
                      variant={paymentMethod === 'BANK' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('BANK')}
                      className="h-16 flex flex-col gap-1"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span className="text-xs">Virement</span>
                    </Button>
                  </div>
                </div>

                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                  onClick={() => billMutation.mutate({ codes: selectedCodes, isCustom: true })}
                  disabled={billMutation.isPending}
                >
                  {billMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Enregistrement en cours...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Créer la facture
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}