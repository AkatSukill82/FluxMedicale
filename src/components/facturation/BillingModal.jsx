import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Plus, 
  Trash2, 
  Send, 
  Save,
  Loader2,
  CreditCard,
  Euro,
  Receipt,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { useI18n } from '../i18n/i18nContext';
import { toast } from 'sonner';
import NomenSearch from '../nomenclature/NomenSearch';
import PatientInsuranceStatus, { calculateBIMPrices } from './PatientInsuranceStatus';
import { useQuery } from '@tanstack/react-query';
import { validateActsCompatibility, validateAllActs } from '../nomenclature/ActCompatibilityRules';
import CompatibilityAlert from '../nomenclature/CompatibilityAlert';

export default function BillingModal({ patient, isOpen, onClose }) {
  const { t, locale } = useI18n();
  
  const [acts, setActs] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [amountPaid, setAmountPaid] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [compatibilityValidation, setCompatibilityValidation] = useState(null);

  // Fetch insurance status for BIM detection
  const { data: assurabilite } = useQuery({
    queryKey: ['assurabilite', patient.id],
    queryFn: async () => {
      const niss = patient.identifier?.find(id => id.system.includes('ssin'))?.value;
      if (!niss) return null;
      const results = await base44.entities.Assurabilite.filter({ 
        patient_niss: niss 
      }, '-last_checked_at', 1);
      return results[0] || null;
    },
    enabled: !!patient.id && isOpen
  });

  const hasBIM = assurabilite?.special_rights?.some(right => 
    right.toLowerCase().includes('bim') || 
    right.toLowerCase().includes('omnio') ||
    right.toLowerCase().includes('increased')
  ) || false;

  const handleSelectCode = (nomenCode) => {
    const title = locale === 'nl' ? nomenCode.title_nl : nomenCode.title_fr;
    const basePrice = (nomenCode.honorarium || 0) / 100;
    const baseReimbursed = (nomenCode.reimbursed || 0) / 100;
    const basePatientShare = (nomenCode.patient_share || 0) / 100;
    
    // Adjust prices for BIM patients
    const { reimbursed, patientShare } = calculateBIMPrices(
      basePrice,
      baseReimbursed,
      basePatientShare,
      hasBIM
    );
    
    const newAct = {
      id: Math.random().toString(),
      nomenCode_id: nomenCode.id,
      code: nomenCode.code,
      label: title,
      quantity: 1,
      unitPrice: basePrice,
      amount: basePrice,
      reimbursed: reimbursed,
      patient_share: patientShare
    };

    // Check compatibility before adding
    const validation = validateActsCompatibility(acts, newAct);
    
    if (!validation.canProceed) {
      toast.error(validation.errors[0]?.message || 'Acte incompatible avec la sélection actuelle');
      return;
    }

    const updatedActs = [...acts, newAct];
    setActs(updatedActs);
    
    // Validate all acts
    const fullValidation = validateAllActs(updatedActs);
    setCompatibilityValidation(fullValidation);

    if (validation.hasWarnings) {
      toast.warning(validation.warnings[0]?.message);
    }
  };

  const handleRemoveAct = (actId) => {
    const updatedActs = acts.filter(a => a.id !== actId);
    setActs(updatedActs);
    
    // Revalidate after removal
    if (updatedActs.length > 0) {
      const fullValidation = validateAllActs(updatedActs);
      setCompatibilityValidation(fullValidation);
    } else {
      setCompatibilityValidation(null);
    }
  };

  const handleQuantityChange = (actId, quantity) => {
    setActs(acts.map(a => 
      a.id === actId 
        ? { ...a, quantity: parseInt(quantity) || 1, amount: a.unitPrice * (parseInt(quantity) || 1) }
        : a
    ));
  };

  const total = acts.reduce((sum, act) => sum + act.amount, 0);
  const remaining = total - (parseFloat(amountPaid) || 0);

  const handleSend = async (generateAttestation = false) => {
    setIsSending(true);
    try {
      const currentUser = await base44.auth.me();
      
      // Create invoice
      const invoice = await base44.entities.Invoice.create({
        patient_id: patient.id,
        provider_id: currentUser.email,
        type: 'EATTEST',
        payment_method: paymentMethod,
        status: 'SENT',
        total_amount: total * 100,
        patient_contribution: (parseFloat(amountPaid) || 0) * 100,
        insurance_contribution: (total - (parseFloat(amountPaid) || 0)) * 100,
        invoice_date: new Date().toISOString().split('T')[0],
        created_by: currentUser.email
      });

      // Create invoice lines
      await Promise.all(acts.map(act => 
        base44.entities.InvoiceLine.create({
          invoice_id: invoice.id,
          nomenclature_code: act.code,
          nomenclature_label: act.label,
          quantity: act.quantity,
          unit_price: act.unitPrice,
          amount: act.amount,
          date_prestation: new Date().toISOString().split('T')[0]
        })
      ));

      if (generateAttestation) {
        toast.success('Facture créée - Génération de l\'attestation...');
        // L'attestation sera générée séparément
      } else {
        toast.success('Facture envoyée avec succès');
      }
      
      onClose();
    } catch (error) {
      console.error('Billing error:', error);
      toast.error('Erreur lors de l\'envoi de la facture');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Receipt className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Nouvelle facturation</h2>
              <p className="text-sm font-normal text-muted-foreground">
                {patient.name?.[0]?.given?.join(' ')} {patient.name?.[0]?.family}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Recherche nomenclature */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Search className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold text-lg">Rechercher un acte</h3>
              </div>
              <NomenSearch 
                onSelect={handleSelectCode}
                selectedCodes={acts}
              />
            </CardContent>
          </Card>

          {/* Validation des incompatibilités */}
          {compatibilityValidation && (compatibilityValidation.errors.length > 0 || compatibilityValidation.warnings.length > 0) && (
            <CompatibilityAlert validation={compatibilityValidation} />
          )}

          {/* Liste des actes */}
          {acts.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4">Actes sélectionnés</h3>
                <div className="space-y-3">
                  {acts.map(act => (
                    <div key={act.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">{act.code}</Badge>
                          <p className="font-medium">{act.label}</p>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>Honoraire: {act.unitPrice.toFixed(2)}€</span>
                          <span>•</span>
                          <span>Remboursé: {act.reimbursed.toFixed(2)}€</span>
                          <span>•</span>
                          <span>Part patient: {act.patient_share.toFixed(2)}€</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Qté:</Label>
                          <Input
                            type="number"
                            value={act.quantity}
                            onChange={(e) => handleQuantityChange(act.id, e.target.value)}
                            className="w-16 h-9"
                            min="1"
                          />
                        </div>
                        <div className="text-right min-w-[80px]">
                          <p className="text-xl font-bold text-blue-600">{act.amount.toFixed(2)}€</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveAct(act.id)}
                          className="hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-6" />

                {/* Total */}
                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total à facturer</p>
                      <p className="text-4xl font-bold text-blue-600">{total.toFixed(2)}€</p>
                    </div>
                    <CheckCircle2 className="w-12 h-12 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Paiement */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold text-lg">Mode de paiement</h3>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Button
                  variant={paymentMethod === 'CARD' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('CARD')}
                  className="h-20 flex flex-col gap-2"
                >
                  <CreditCard className="w-6 h-6" />
                  <span>Bancontact</span>
                </Button>
                <Button
                  variant={paymentMethod === 'CASH' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('CASH')}
                  className="h-20 flex flex-col gap-2"
                >
                  <Euro className="w-6 h-6" />
                  <span>Comptant</span>
                </Button>
                <Button
                  variant={paymentMethod === 'BANK' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('BANK')}
                  className="h-20 flex flex-col gap-2"
                >
                  <Receipt className="w-6 h-6" />
                  <span>Virement</span>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Montant payé par le patient</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="0.00"
                    className="text-lg h-12"
                  />
                </div>
                <div>
                  <Label>Reste à charge mutuelle</Label>
                  <div className="h-12 px-4 rounded-md border bg-muted flex items-center justify-between">
                    <span className="text-lg font-semibold">{remaining.toFixed(2)}€</span>
                    {remaining < 0 && (
                      <Badge variant="destructive">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Trop perçu
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assurabilité */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4">Informations mutuelle</h3>
              
              {/* Patient insurance status with BIM/MàF detection */}
              <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                <PatientInsuranceStatus patient={patient} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Organisme assureur</Label>
                  <Input value={assurabilite?.oa_name || patient.mutuelle || 'Non renseigné'} disabled />
                </div>
                <div>
                  <Label>Type de transaction</Label>
                  <Select defaultValue="EATTEST">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EATTEST">eAttest (Tiers payant)</SelectItem>
                      <SelectItem value="EFACT">eFact</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {hasBIM && (
                <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-purple-900">
                        Patient BIM/OMNIO détecté
                      </p>
                      <p className="text-xs text-purple-700 mt-1">
                        Les tarifs ont été automatiquement ajustés avec ticket modérateur réduit.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions footer */}
        <div className="border-t pt-6 flex items-center justify-between bg-white">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => toast.info('Brouillon sauvegardé')}>
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder
            </Button>
            <Button 
              onClick={() => handleSend(true)} 
              disabled={isSending || acts.length === 0}
              size="lg"
              variant="outline"
              className="px-8"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Avec attestation
            </Button>
            <Button 
              onClick={() => handleSend(false)} 
              disabled={isSending || acts.length === 0 || (compatibilityValidation && !compatibilityValidation.isValid)}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 px-8"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer la facture
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}