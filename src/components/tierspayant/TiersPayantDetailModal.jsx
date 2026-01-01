import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Euro,
  User,
  Building2,
  Calendar,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUT_CONFIG = {
  brouillon: { label: 'Brouillon', color: 'bg-slate-100 text-slate-800', icon: FileText },
  envoyee: { label: 'Envoyée', color: 'bg-blue-100 text-blue-800', icon: Send },
  acceptee: { label: 'Acceptée', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  payee: { label: 'Payée', color: 'bg-emerald-100 text-emerald-800', icon: Euro },
  partielle: { label: 'Paiement partiel', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  refusee: { label: 'Refusée', color: 'bg-red-100 text-red-800', icon: XCircle },
  contestee: { label: 'Contestée', color: 'bg-purple-100 text-purple-800', icon: AlertTriangle }
};

export default function TiersPayantDetailModal({ facture, isOpen, onClose }) {
  const statutConfig = STATUT_CONFIG[facture.statut] || STATUT_CONFIG.brouillon;
  const StatusIcon = statutConfig.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Facture {facture.numero_facture}
            </span>
            <Badge className={statutConfig.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statutConfig.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations générales */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-blue-600" />
                Patient
              </h4>
              <p className="font-semibold">{facture.patient_name}</p>
              <p className="text-sm text-muted-foreground">NISS: {facture.patient_niss || '-'}</p>
              <p className="text-sm text-muted-foreground">N° affiliation: {facture.numero_affiliation || '-'}</p>
              <Badge variant="outline" className="mt-2">
                {facture.statut_assurabilite?.toUpperCase() || 'STANDARD'}
              </Badge>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Mutuelle
              </h4>
              <p className="font-semibold">{facture.mutuelle_nom}</p>
              <p className="text-sm text-muted-foreground">Code OA: {facture.mutuelle_code}</p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-slate-50 rounded">
              <Calendar className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Date soins</p>
              <p className="font-medium">
                {facture.date_soins ? format(new Date(facture.date_soins), 'dd/MM/yyyy', { locale: fr }) : '-'}
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded">
              <Send className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Date envoi</p>
              <p className="font-medium">
                {facture.date_envoi ? format(new Date(facture.date_envoi), 'dd/MM/yyyy', { locale: fr }) : '-'}
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded">
              <Euro className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Date paiement</p>
              <p className="font-medium">
                {facture.date_paiement ? format(new Date(facture.date_paiement), 'dd/MM/yyyy', { locale: fr }) : '-'}
              </p>
            </div>
          </div>

          {/* Prestations */}
          <div>
            <h4 className="font-medium mb-2">Prestations</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="text-left p-2">Code</th>
                    <th className="text-left p-2">Libellé</th>
                    <th className="text-right p-2">Honoraire</th>
                    <th className="text-right p-2">Remb. INAMI</th>
                    <th className="text-right p-2">Ticket mod.</th>
                  </tr>
                </thead>
                <tbody>
                  {facture.prestations?.map((prest, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2 font-mono">{prest.code_nomenclature || '-'}</td>
                      <td className="p-2">{prest.libelle || '-'}</td>
                      <td className="p-2 text-right">{prest.honoraire?.toFixed(2)} €</td>
                      <td className="p-2 text-right text-green-700">{prest.remboursement_inami?.toFixed(2)} €</td>
                      <td className="p-2 text-right">{prest.ticket_moderateur?.toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Montants */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-3">Récapitulatif financier</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Total honoraires:</div>
              <div className="text-right font-medium">{facture.montant_total_honoraires?.toFixed(2)} €</div>
              
              <div>Remboursement INAMI:</div>
              <div className="text-right font-medium text-green-700">{facture.montant_remboursement_inami?.toFixed(2)} €</div>
              
              <div>Ticket modérateur:</div>
              <div className="text-right">{facture.montant_ticket_moderateur?.toFixed(2)} €</div>
              
              <div className="border-t pt-2 font-semibold">À recevoir mutuelle:</div>
              <div className="border-t pt-2 text-right font-bold text-blue-700">
                {facture.montant_a_recevoir_mutuelle?.toFixed(2)} €
              </div>
              
              {facture.montant_paye !== undefined && (
                <>
                  <div className="font-semibold text-emerald-700">Montant reçu:</div>
                  <div className="text-right font-bold text-emerald-700">
                    {facture.montant_paye?.toFixed(2)} €
                  </div>
                </>
              )}
              
              {facture.ecart_paiement && facture.ecart_paiement !== 0 && (
                <>
                  <div className={facture.ecart_paiement < 0 ? 'text-red-600' : 'text-orange-600'}>
                    Écart:
                  </div>
                  <div className={`text-right font-bold ${facture.ecart_paiement < 0 ? 'text-red-600' : 'text-orange-600'}`}>
                    {facture.ecart_paiement > 0 ? '+' : ''}{facture.ecart_paiement?.toFixed(2)} €
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Motif refus */}
          {facture.motif_refus && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-900 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Motif de refus
              </h4>
              <p className="text-sm text-red-800 mt-2">{facture.motif_refus}</p>
              {facture.code_erreur && (
                <p className="text-xs text-red-600 mt-1">Code erreur: {facture.code_erreur}</p>
              )}
            </div>
          )}

          {/* Notes */}
          {facture.notes && (
            <div className="p-3 bg-slate-50 rounded-lg">
              <h4 className="font-medium text-sm mb-1">Notes</h4>
              <p className="text-sm text-muted-foreground">{facture.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Télécharger PDF
            </Button>
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}