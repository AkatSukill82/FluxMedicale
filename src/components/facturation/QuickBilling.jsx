import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Euro, Clock, CreditCard, Loader2, FileText, Printer, AlertTriangle, QrCode } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { handleError, handleSuccess } from '../utils/ErrorHandler';
import NomenclatureSelector from './NomenclatureSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import InsuranceVerification from './InsuranceVerification';
import PayconiqQR from './PayconiqQR';

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
  const [invoiceType, setInvoiceType] = useState('EATTEST'); // EATTEST, EFACT, PAPER
  const [printOnClose, setPrintOnClose] = useState(true);
  const [insuranceVerified, setInsuranceVerified] = useState(false);
  const [insuranceResult, setInsuranceResult] = useState(null);
  const [showPayconiq, setShowPayconiq] = useState(false);

  // Gérer le résultat de la vérification d'assurance
  const handleInsuranceVerified = (result) => {
    setInsuranceVerified(true);
    setInsuranceResult(result);
  };

  // Vérifier si le patient peut être facturé normalement
  const canBillNormally = insuranceResult?.status === 'EN_ORDRE' || insuranceResult?.status === 'ACTIF';
  const isNotInsured = insuranceResult?.regime === 'AUCUN' || 
                       insuranceResult?.status === 'PAS_EN_ORDRE' || 
                       insuranceResult?.status === 'EXPIRE';

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
        type: data.invoiceType,
        payment_method: paymentMethod,
        status: data.invoiceType === 'PAPER' ? 'NOT_SENT' : 'SENT',
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

      return { invoice, shouldPrint: data.printOnClose };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      handleSuccess('Facturation enregistrée avec succès');
      
      // Imprimer si demandé
      if (result.shouldPrint) {
        window.print();
      }
      
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

        {/* Vérification d'assurance obligatoire */}
        <div className="mb-4 p-4 bg-slate-50 rounded-lg border">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            🔍 Vérification d'assurabilité
          </h3>
          <InsuranceVerification 
            patient={patient} 
            onVerified={handleInsuranceVerified}
            autoCheck={true}
          />
        </div>

        {/* Alerte si patient pas en ordre */}
        {insuranceVerified && isNotInsured && (
          <Alert className="mb-4 bg-red-50 border-red-300">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Attention:</strong> Le patient n'est pas en ordre d'assurance. 
              L'intégralité des frais sera à sa charge. Assurez-vous qu'il en soit informé.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="quick" disabled={!insuranceVerified}>Facturation rapide</TabsTrigger>
            <TabsTrigger value="custom" disabled={!insuranceVerified}>Codes INAMI</TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="space-y-4">
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
            <div>
              <p className="text-sm font-semibold mb-3">Type de facturation</p>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={invoiceType === 'EATTEST' ? 'default' : 'outline'}
                  onClick={() => setInvoiceType('EATTEST')}
                  className="h-16 flex flex-col gap-1"
                >
                  <FileText className="w-5 h-5" />
                  <span className="text-xs">eAttest</span>
                </Button>
                <Button
                  variant={invoiceType === 'EFACT' ? 'default' : 'outline'}
                  onClick={() => setInvoiceType('EFACT')}
                  className="h-16 flex flex-col gap-1"
                >
                  <FileText className="w-5 h-5" />
                  <span className="text-xs">eFact</span>
                </Button>
                <Button
                  variant={invoiceType === 'PAPER' ? 'default' : 'outline'}
                  onClick={() => setInvoiceType('PAPER')}
                  className="h-16 flex flex-col gap-1"
                >
                  <Printer className="w-5 h-5" />
                  <span className="text-xs">Papier</span>
                </Button>
              </div>
            </div>

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

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="printOnClose" 
                checked={printOnClose} 
                onCheckedChange={setPrintOnClose}
              />
              <Label htmlFor="printOnClose" className="text-sm cursor-pointer">
                Imprimer la facture à la fermeture
              </Label>
            </div>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
              onClick={() => billMutation.mutate({ template: selectedTemplate, isCustom: false, invoiceType, printOnClose })}
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
                  <p className="text-sm font-semibold mb-3">Type de facturation</p>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant={invoiceType === 'EATTEST' ? 'default' : 'outline'}
                      onClick={() => setInvoiceType('EATTEST')}
                      className="h-16 flex flex-col gap-1"
                    >
                      <FileText className="w-5 h-5" />
                      <span className="text-xs">eAttest</span>
                    </Button>
                    <Button
                      variant={invoiceType === 'EFACT' ? 'default' : 'outline'}
                      onClick={() => setInvoiceType('EFACT')}
                      className="h-16 flex flex-col gap-1"
                    >
                      <FileText className="w-5 h-5" />
                      <span className="text-xs">eFact</span>
                    </Button>
                    <Button
                      variant={invoiceType === 'PAPER' ? 'default' : 'outline'}
                      onClick={() => setInvoiceType('PAPER')}
                      className="h-16 flex flex-col gap-1"
                    >
                      <Printer className="w-5 h-5" />
                      <span className="text-xs">Papier</span>
                    </Button>
                  </div>
                </div>

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

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox 
                    id="printOnCloseCustom" 
                    checked={printOnClose} 
                    onCheckedChange={setPrintOnClose}
                  />
                  <Label htmlFor="printOnCloseCustom" className="text-sm cursor-pointer">
                    Imprimer la facture à la fermeture
                  </Label>
                </div>

                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                  onClick={() => billMutation.mutate({ codes: selectedCodes, isCustom: true, invoiceType, printOnClose })}
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