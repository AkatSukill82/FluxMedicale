import React from 'react';
import { AlertTriangle, Lightbulb, FileText, Wrench, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const ERROR_RESOLUTIONS = {
  'ERR-170': {
    title: 'Assurabilité non valide',
    severity: 'blocking',
    explanation: 'Le patient n\'est pas en ordre d\'assurance pour la période de soins facturée. Sa couverture est peut-être expirée ou suspendue.',
    steps: [
      'Vérifiez l\'assurabilité du patient via MemberData (MyCareNet)',
      'Demandez au patient de vérifier son statut auprès de sa mutuelle',
      'Si le patient a changé de mutuelle, mettez à jour ses données et refacturez',
      'Si l\'assurabilité est confirmée, remettez la facture en attente'
    ]
  },
  'ERR-301': {
    title: 'Codes nomenclature incompatibles',
    severity: 'blocking',
    explanation: 'Deux codes nomenclature facturés le même jour ne sont pas cumulables selon les règles INAMI.',
    steps: [
      'Vérifiez les règles de cumul dans la nomenclature INAMI',
      'Supprimez le code en trop ou modifiez la date de prestation',
      'Conservez uniquement le code avec l\'honoraire le plus élevé',
      'Remettez la facture corrigée en attente'
    ]
  },
  'ERR-503': {
    title: 'Numéro INAMI non reconnu',
    severity: 'blocking',
    explanation: 'Le numéro INAMI du prestataire n\'est pas reconnu par l\'organisme assureur.',
    steps: [
      'Vérifiez votre numéro INAMI dans votre profil médecin',
      'Assurez-vous que votre inscription INAMI est active',
      'Contactez l\'INAMI si nécessaire pour valider votre inscription',
      'Corrigez le numéro dans la facture et remettez en attente'
    ]
  },
  'ERR-220': {
    title: 'NISS non concordant',
    severity: 'blocking',
    explanation: 'Le numéro NISS du patient ne correspond pas aux données enregistrées chez l\'organisme assureur.',
    steps: [
      'Relisez la carte d\'identité du patient avec le lecteur eID',
      'Comparez le NISS avec celui enregistré dans le dossier patient',
      'Corrigez le NISS si nécessaire dans la fiche administrative',
      'Remettez la facture en attente après correction'
    ]
  },
  'WARN-110': {
    title: 'Acceptation partielle',
    severity: 'warning',
    explanation: 'Certaines prestations ont été acceptées mais d\'autres sont refusées (cumul journalier dépassé ou prestation déjà facturée par un autre prestataire).',
    steps: [
      'Consultez le détail pour identifier les lignes refusées',
      'Vérifiez si le patient a vu un autre médecin le même jour',
      'Créez une note de crédit pour les montants refusés si nécessaire',
      'Facturez directement au patient pour la partie non remboursée'
    ]
  },
  'ERR-999': {
    title: 'Erreur technique MyCareNet',
    severity: 'technical',
    explanation: 'La connexion avec MyCareNet a échoué (timeout, serveur indisponible). La facture n\'a pas été transmise.',
    steps: [
      'Attendez quelques minutes et réessayez',
      'Vérifiez votre connexion internet',
      'Consultez le statut de MyCareNet sur status.mycarenet.be',
      'Remettez simplement la facture en attente pour un nouvel envoi'
    ]
  },
  'ERR-410': {
    title: 'DMG non ouvert',
    severity: 'blocking',
    explanation: 'Le Dossier Médical Global n\'est pas ouvert pour ce patient auprès de votre cabinet.',
    steps: [
      'Ouvrez un DMG pour ce patient via MyCareNet',
      'Retirez le supplément DMG de la facture si le DMG ne peut être ouvert',
      'Vérifiez si le DMG est ouvert chez un autre médecin',
      'Remettez la facture corrigée en attente'
    ]
  },
  'ERR-180': {
    title: 'Doublon de facturation',
    severity: 'blocking',
    explanation: 'Une facture identique existe déjà pour ce patient à cette date. La mutuelle a détecté un doublon.',
    steps: [
      'Vérifiez dans l\'historique si la facture a déjà été envoyée et acceptée',
      'Si c\'est un vrai doublon, annulez cette facture',
      'Si la date de prestation est différente, corrigez-la',
      'Si c\'est une prestation différente, modifiez le code nomenclature'
    ]
  },
  'ERR-600': {
    title: 'Montant non conforme',
    severity: 'blocking',
    explanation: 'Le montant facturé ne correspond pas au tarif officiel INAMI pour le code nomenclature utilisé.',
    steps: [
      'Vérifiez le tarif officiel du code nomenclature dans la base INAMI',
      'Corrigez le montant dans les lignes de facturation',
      'Si vous appliquez un supplément, assurez-vous qu\'il est autorisé',
      'Remettez la facture corrigée en attente'
    ]
  },
  'ERR-250': {
    title: 'Lien thérapeutique manquant',
    severity: 'blocking',
    explanation: 'Le lien thérapeutique entre vous et le patient n\'est pas enregistré sur la plateforme eHealth.',
    steps: [
      'Créez un lien thérapeutique via la plateforme eHealth (section Hub dans le dossier patient)',
      'Utilisez la carte eID du patient pour créer le lien',
      'Attendez la confirmation de l\'enregistrement (peut prendre quelques minutes)',
      'Remettez la facture en attente une fois le lien actif'
    ]
  }
};

const SEVERITY_STYLES = {
  blocking: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-800', icon: 'text-red-500', label: 'Bloquant' },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-800', icon: 'text-yellow-600', label: 'Avertissement' },
  technical: { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-800', icon: 'text-orange-500', label: 'Technique' },
};

export default function ErrorExplanationCard({ invoice }) {
  const errorCode = invoice.oa_error_code;
  const resolution = ERROR_RESOLUTIONS[errorCode];
  const style = resolution ? SEVERITY_STYLES[resolution.severity] : SEVERITY_STYLES.blocking;

  return (
    <div className="space-y-3">
      {/* Explication de l'erreur */}
      <div className={`rounded-lg border p-4 ${style.bg} ${style.border}`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${style.icon}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm">
                {resolution ? resolution.title : 'Erreur mutuelle'}
              </h4>
              <Badge className={`${style.badge} text-[10px]`}>
                {resolution ? SEVERITY_STYLES[resolution.severity].label : 'Erreur'}
              </Badge>
              {errorCode && (
                <Badge variant="outline" className="text-[10px] font-mono">{errorCode}</Badge>
              )}
            </div>
            <p className="text-sm text-slate-700 mb-3">
              {resolution ? resolution.explanation : (invoice.oa_response || 'Erreur non documentée. Consultez le message original de la mutuelle.')}
            </p>

            {/* Message original de la mutuelle */}
            {invoice.oa_response && (
              <div className="mb-3 p-2.5 bg-white/70 rounded-md border border-slate-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Message de la mutuelle</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{invoice.oa_response}</p>
              </div>
            )}

            {/* Étapes de résolution */}
            {resolution && (
              <div className="p-3 bg-white rounded-md border border-green-200">
                <div className="flex items-center gap-1.5 mb-2">
                  <Lightbulb className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-800">Comment résoudre ?</span>
                </div>
                <ol className="space-y-1.5">
                  {resolution.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                      <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}