import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Send, CheckCircle, XCircle, Clock, AlertTriangle, 
  FileText, User, Building2, Calendar, CreditCard,
  ArrowRight, Info
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import OAErrorExplainer from './OAErrorExplainer';
import { getErrorExplanation } from './oaErrorCodes';

const STATUS_CONFIG = {
  PENDING: { icon: Clock, label: 'En attente', className: 'bg-slate-100 text-slate-800' },
  SENT: { icon: Send, label: 'Envoyée', className: 'bg-blue-100 text-blue-800' },
  ACK_RECEIVED: { icon: CheckCircle, label: 'Accusé reçu', className: 'bg-blue-100 text-blue-800' },
  ACCEPTED: { icon: CheckCircle, label: 'Acceptée', className: 'bg-green-100 text-green-800' },
  REJECTED: { icon: XCircle, label: 'Refusée', className: 'bg-red-100 text-red-800' },
  ERROR: { icon: AlertTriangle, label: 'Erreur', className: 'bg-red-100 text-red-800' }
};

function getAffectedPrestationIndices(errorCode) {
  if (!errorCode) return null;
  const exp = getErrorExplanation(errorCode);
  // These categories typically affect ALL prestations (blocking or patient-level)
  const globalCategories = ['identification', 'patient', 'technique', 'dmg'];
  if (globalCategories.includes(exp.category)) return 'all';
  // nomenclature/montant/chapitre4 errors typically affect specific prestations
  return 'nomenclature';
}

export default function TransactionDetailDialog({ transaction, open, onOpenChange }) {
  if (!transaction) return null;

  const isError = transaction.status === 'REJECTED' || transaction.status === 'ERROR';
  const statusConf = STATUS_CONFIG[transaction.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusConf.icon;

  const errorExplanation = isError && transaction.error_code 
    ? getErrorExplanation(transaction.error_code) 
    : null;

  const affectedScope = isError ? getAffectedPrestationIndices(transaction.error_code) : null;
  const prestations = transaction.prestations || [];
  const totalAmount = prestations.reduce((sum, p) => sum + (p.montant || 0), 0);

  // Determine which prestations are likely problematic
  const isPrestationAffected = (prestation, index) => {
    if (!isError) return false;
    if (affectedScope === 'all') return true;
    if (affectedScope === 'nomenclature') {
      // If error mentions a specific code, highlight that one
      const errorMsg = transaction.error_message || '';
      if (errorMsg.includes(prestation.code_nomenclature)) return true;
      // If only 1 prestation, it's that one
      if (prestations.length === 1) return true;
      // For cumul errors, all are potentially affected
      if (['500444', '500450'].includes(transaction.error_code)) return true;
      // For montant errors, check all
      if (errorExplanation?.category === 'montant') return true;
      // Default: can't determine, don't highlight specific ones
      return false;
    }
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="w-5 h-5" />
            <span>Détail de la transaction</span>
            <Badge className={statusConf.className}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConf.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Métadonnées */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {transaction.patient_name && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-slate-500">Patient:</span>
                <strong>{transaction.patient_name}</strong>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500">Mutuelle:</span>
              <strong>{transaction.mutuelle_code || 'N/A'}</strong>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500">Envoi:</span>
              <strong>
                {transaction.sent_at 
                  ? format(new Date(transaction.sent_at), 'dd/MM/yyyy HH:mm', { locale: fr }) 
                  : '-'}
              </strong>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500">Réf:</span>
              <span className="font-mono text-xs">{transaction.transaction_id || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500">Type:</span>
              <Badge className={transaction.transaction_type === 'EFACT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                {transaction.transaction_type}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Erreur OA - bien visible en haut */}
          {isError && (
            <div>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-4 h-4" />
                Problème identifié
              </h3>
              <OAErrorExplainer
                errorCode={transaction.error_code}
                errorMessage={transaction.error_message}
              />
            </div>
          )}

          {/* Prestations avec mise en évidence du problème */}
          {prestations.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                Prestations facturées ({prestations.length})
              </h3>
              <div className="space-y-2">
                {prestations.map((prest, idx) => {
                  const affected = isPrestationAffected(prest, idx);
                  return (
                    <div 
                      key={idx} 
                      className={`rounded-lg border p-3 ${
                        affected 
                          ? 'border-red-300 bg-red-50 ring-1 ring-red-200' 
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                              affected ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {prest.code_nomenclature}
                            </code>
                            {affected && (
                              <Badge className="bg-red-100 text-red-700 text-[10px]">
                                <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                                Problème
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm mt-1 text-slate-700">{prest.libelle}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                            <span>Qté: {prest.quantite || 1}</span>
                            {prest.date_prestation && (
                              <span>Date: {format(new Date(prest.date_prestation), 'dd/MM/yyyy')}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-sm ${affected ? 'text-red-700' : 'text-slate-900'}`}>
                            {((prest.montant || 0) / 100).toFixed(2)}€
                          </p>
                        </div>
                      </div>

                      {/* Explication contextuelle pour la prestation affectée */}
                      {affected && errorExplanation && (
                        <div className="mt-2 pt-2 border-t border-red-200 flex items-start gap-2">
                          <ArrowRight className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-red-700">
                            {errorExplanation.category === 'nomenclature' && 'Ce code nomenclature est concerné par le rejet.'}
                            {errorExplanation.category === 'montant' && `Le montant facturé (${((prest.montant || 0) / 100).toFixed(2)}€) ne correspond pas au tarif attendu.`}
                            {errorExplanation.category === 'patient' && 'L\'assurabilité du patient pose problème à la date de cette prestation.'}
                            {errorExplanation.category === 'identification' && 'Cette prestation est bloquée car l\'identification du prestataire est en erreur.'}
                            {errorExplanation.category === 'chapitre4' && 'Aucun accord Chapitre IV valide pour cette prestation.'}
                            {errorExplanation.category === 'dmg' && 'Le statut DMG du patient impacte le remboursement de cette prestation.'}
                            {errorExplanation.category === 'technique' && 'Erreur technique empêchant le traitement de cette prestation.'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Total */}
              <div className={`mt-3 rounded-lg p-3 flex items-center justify-between ${
                isError ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'
              }`}>
                <span className="font-semibold text-sm">Total facturé</span>
                <span className={`font-bold text-lg ${isError ? 'text-red-700' : 'text-blue-700'}`}>
                  {(totalAmount / 100).toFixed(2)}€
                </span>
              </div>

              {isError && (
                <div className="mt-2 flex items-start gap-2 text-xs text-slate-500">
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <p>Ce montant n'a pas été remboursé. Corrigez le problème et renvoyez la facture pour obtenir le paiement.</p>
                </div>
              )}
            </div>
          )}

          {/* Statut accepté */}
          {transaction.status === 'ACCEPTED' && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Transaction acceptée par la mutualité. Le paiement de {(totalAmount / 100).toFixed(2)}€ suivra selon les délais habituels.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}