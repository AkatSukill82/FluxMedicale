import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Pill,
  Search,
  ExternalLink,
  AlertTriangle,
  Info,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import { useSAM, SAM_STATUS } from './useSAM';

const CBIP_INTERACTIONS_URL = 'https://www.cbip.be/fr/chapters/17?frag=8000';

/**
 * Panneau Médicaments — recherche SAM (AFMPS).
 *
 * `currentCnkCodes` : traitement en cours du patient, codé en CNK. Le champ
 * Patient.medicaments_actuels est du texte libre et n'est donc pas exploitable
 * pour une vérification d'interactions ; tant qu'aucune source codée n'est
 * fournie, la vérification est déclarée non réalisée plutôt que négative.
 */
export default function MedicationsPanel({
  patient,
  onSelectMedication,
  currentUser,
  currentCnkCodes = [],
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [interactionResult, setInteractionResult] = useState(null);
  const [search, setSearch] = useState({ status: null, results: [], source: null });

  const { searchSAM, getMedicationDetails, checkInteractions, isLoading } = useSAM(currentUser);

  const handleSearch = async () => {
    if (!searchTerm) return;
    setInteractionResult(null);
    setSelectedMedication(null);
    setSearch(await searchSAM(searchTerm));
  };

  const handleSelectMedication = async (medication) => {
    setSelectedMedication(medication);
    setInteractionResult(null);

    const details = await getMedicationDetails(medication.cnk);
    // En cas d'échec on conserve le résultat de recherche tel quel : aucune
    // donnée clinique n'est inventée pour compléter la fiche.
    const enriched = details.status === SAM_STATUS.OK && details.medication
      ? { ...medication, ...details.medication }
      : medication;

    setSelectedMedication(enriched);
    if (onSelectMedication) onSelectMedication(enriched);
  };

  const handleCheckInteractions = async () => {
    if (!selectedMedication) return;

    // La vérification porte sur le traitement en cours plus le médicament
    // envisagé. Sans traitement codé en CNK, aucune conclusion n'est possible :
    // le hook renvoie INSUFFICIENT_INPUT et l'écran le dit explicitement.
    const result = await checkInteractions(
      [...currentCnkCodes.filter(Boolean), selectedMedication.cnk],
      patient?.id
    );
    setInteractionResult(result);
  };

  const isFallbackData = search.source === 'fallback';

  return (
    <div className="space-y-4">
      {/* Recherche SAM */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-blue-600" />
            Recherche Médicaments (SAM - AFMPS)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Rechercher un médicament (ex: amoxicilline)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isLoading || !searchTerm}>
              <Search className="w-4 h-4 mr-2" />
              Rechercher
            </Button>
          </div>

          {search.status === SAM_STATUS.UNAVAILABLE && (
            <Alert className="border-orange-300 bg-orange-50">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <AlertDescription className="text-orange-900">
                Référentiel SAM indisponible. Aucun résultat ne peut être affiché —
                consultez directement le CBIP/BCFI.
              </AlertDescription>
            </Alert>
          )}

          {isFallbackData && search.results.length > 0 && (
            <Alert className="border-orange-300 bg-orange-50 mb-3">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <AlertDescription className="text-orange-900">
                <strong>Données de dépannage.</strong> Le référentiel SAM n'a pas répondu ;
                ces résultats proviennent d'un jeu de données interne. Les codes CNK
                ne sont pas opposables et ne doivent pas être reportés sur une
                prescription ou une facture.
              </AlertDescription>
            </Alert>
          )}

          {search.status === SAM_STATUS.OK && search.results.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-slate-600 font-semibold">
                {search.results.length} résultat(s)
              </p>
              {search.results.map((med) => (
                <div
                  key={med.cnk || med.sam_id}
                  onClick={() => handleSelectMedication(med)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedMedication?.cnk === med.cnk
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-900">{med.product_name}</h4>
                      <p className="text-sm text-slate-600">
                        {[med.strength, med.unit].filter(Boolean).join(' ')} · {med.form}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">CNK: {med.cnk}</Badge>
                        {med.atc_code && (
                          <Badge variant="outline" className="text-xs">ATC: {med.atc_code}</Badge>
                        )}
                      </div>
                    </div>
                    {med.reimbursement?.category && (
                      <Badge className="bg-green-100 text-green-800">
                        Remb. {med.reimbursement.category}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {search.status === SAM_STATUS.OK && search.results.length === 0 && searchTerm && (
            <p className="text-sm text-slate-500">Aucun résultat pour « {searchTerm} ».</p>
          )}
        </CardContent>
      </Card>

      {/* Détails médicament */}
      {selectedMedication && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedMedication.product_name}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCheckInteractions}
                  disabled={isLoading}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Vérifier interactions
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(CBIP_INTERACTIONS_URL, '_blank', 'noopener')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  CBIP/BCFI
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-600">Substance active</label>
                <p className="text-slate-900">{selectedMedication.substance_name || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600">Classe ATC</label>
                <p className="text-slate-900">{selectedMedication.atc_code || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600">Titulaire</label>
                <p className="text-slate-900">{selectedMedication.manufacturer || '—'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600">Forme pharmaceutique</label>
                <p className="text-slate-900">{selectedMedication.form || '—'}</p>
              </div>
            </div>

            {/* Ces blocs ne s'affichent que si le référentiel les a réellement
                fournis. Aucune valeur par défaut n'est substituée. */}
            {selectedMedication.standard_dosage && (
              <div>
                <label className="text-sm font-semibold text-slate-600">Posologie (RCP)</label>
                <p className="text-slate-900">{selectedMedication.standard_dosage}</p>
              </div>
            )}

            {selectedMedication.contraindications && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-900">
                  <strong>Contre-indications:</strong> {selectedMedication.contraindications}
                </AlertDescription>
              </Alert>
            )}

            {selectedMedication.documents?.spc_url && (
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto"
                onClick={() => window.open(selectedMedication.documents.spc_url, '_blank', 'noopener')}
              >
                Résumé des caractéristiques du produit (RCP)
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Résultat de la vérification d'interactions.
          Trois états distincts — « indisponible » n'est jamais présenté en vert. */}
      {interactionResult && (
        <Card
          className={
            interactionResult.status === SAM_STATUS.UNAVAILABLE
              ? 'border-orange-300 bg-orange-50'
              : interactionResult.interactions.length > 0
                ? 'border-red-200 bg-red-50'
                : 'border-green-200 bg-green-50'
          }
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {interactionResult.status === SAM_STATUS.UNAVAILABLE ? (
                <ShieldAlert className="w-5 h-5 text-orange-600 shrink-0" />
              ) : interactionResult.interactions.length > 0 ? (
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              )}

              <div>
                {interactionResult.status === SAM_STATUS.UNAVAILABLE ? (
                  <>
                    <h4 className="font-semibold mb-1 text-orange-900">
                      Vérification non réalisée
                    </h4>
                    <p className="text-sm text-orange-900">
                      {interactionResult.reason === 'INSUFFICIENT_INPUT'
                        ? "Le traitement en cours du patient n'est pas codé en CNK : "
                          + 'aucune vérification automatique n\'est possible.'
                        : "Le service de vérification n'a pas répondu."}
                      {' '}
                      <strong>
                        Ceci n&apos;est pas une absence d&apos;interaction — la vérification
                        doit être faite manuellement.
                      </strong>
                    </p>
                  </>
                ) : interactionResult.interactions.length > 0 ? (
                  <>
                    <h4 className="font-semibold mb-2">Interactions détectées</h4>
                    {interactionResult.interactions.map((interaction, idx) => (
                      <div key={idx} className="text-sm mb-2">
                        <strong>{interaction.drug_a} × {interaction.drug_b}:</strong>{' '}
                        {interaction.description}
                        {interaction.recommendation && (
                          <span className="block text-slate-700 mt-0.5">
                            {interaction.recommendation}
                          </span>
                        )}
                        <Badge className="ml-2">{interaction.severity}</Badge>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <h4 className="font-semibold mb-1">Aucune interaction connue</h4>
                    <p className="text-sm text-slate-700">
                      Sur la base du référentiel SAM, pour les médicaments codés en CNK
                      dans le dossier. Un traitement non codé n&apos;est pas couvert.
                    </p>
                  </>
                )}

                <Button
                  variant="link"
                  size="sm"
                  onClick={() => window.open(CBIP_INTERACTIONS_URL, '_blank', 'noopener')}
                  className="p-0 h-auto"
                >
                  Consulter CBIP Interactions
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Alert className="bg-blue-50 border-blue-200">
        <Info className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Source :</strong> SAM (AFMPS — Agence fédérale des médicaments et des
          produits de santé), via la fonction <code>samV2Search</code>. La vérification
          d&apos;interactions ne remplace pas la consultation du CBIP/BCFI ni le jugement
          clinique.
        </AlertDescription>
      </Alert>
    </div>
  );
}
