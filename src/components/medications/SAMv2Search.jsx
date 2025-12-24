import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Pill,
  Euro,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Package,
  FileText,
  RefreshCw,
  Plus,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  TrendingDown
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import debounce from 'lodash/debounce';
import { samV2Search } from '@/functions/samV2Search';
import ChapterIVRequestForm from '../chapterIV/ChapterIVRequestForm';

// Catégories de remboursement INAMI
const REIMBURSEMENT_CATEGORIES = {
  'A': { label: 'Cat. A - 100%', color: 'bg-green-600', description: 'Médicaments vitaux' },
  'B': { label: 'Cat. B - 75%', color: 'bg-blue-600', description: 'Médicaments importants' },
  'C': { label: 'Cat. C - 50%', color: 'bg-yellow-600', description: 'Médicaments utiles' },
  'Cs': { label: 'Cat. Cs - 40%', color: 'bg-orange-500', description: 'Médicaments de confort' },
  'Cx': { label: 'Cat. Cx - 20%', color: 'bg-red-500', description: 'Autres' }
};

// Sévérité des interactions
const INTERACTION_SEVERITY = {
  'MINOR': { label: 'Mineure', color: 'bg-yellow-100 text-yellow-800', icon: Info },
  'MODERATE': { label: 'Modérée', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  'MAJOR': { label: 'Majeure', color: 'bg-red-100 text-red-800', icon: ShieldAlert },
  'CONTRAINDICATED': { label: 'Contre-indiqué', color: 'bg-red-600 text-white', icon: XCircle }
};

export default function SAMv2Search({ onSelect, selectedMedications = [], patientStatus = 'normal', patient }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMed, setSelectedMed] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showChapterIV, setShowChapterIV] = useState(false);
  const [chapterIVMed, setChapterIVMed] = useState(null);

  // Recherche SAM v2
  const searchMutation = useMutation({
    mutationFn: async (query) => {
      const response = await samV2Search({ action: 'search', query, lang: 'fr' });
      return response.data;
    },
    onSuccess: (data) => {
      setSearchResults(data.results || []);
      setIsSearching(false);
    },
    onError: () => {
      setIsSearching(false);
    }
  });

  // Détails médicament
  const detailsQuery = useQuery({
    queryKey: ['sam-details', selectedMed?.cnk],
    queryFn: async () => {
      const response = await samV2Search({ action: 'details', cnk: selectedMed.cnk, lang: 'fr' });
      return response.data;
    },
    enabled: !!selectedMed?.cnk && showDetails
  });

  // Alternatives génériques
  const alternativesQuery = useQuery({
    queryKey: ['sam-alternatives', selectedMed?.cnk],
    queryFn: async () => {
      const response = await samV2Search({ action: 'alternatives', cnk: selectedMed.cnk, lang: 'fr' });
      return response.data;
    },
    enabled: !!selectedMed?.cnk && showDetails
  });

  // Debounce search
  const debouncedSearch = useCallback(
    debounce((query) => {
      if (query.length >= 2) {
        setIsSearching(true);
        searchMutation.mutate(query);
      } else {
        setSearchResults([]);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
    return () => debouncedSearch.cancel();
  }, [searchQuery, debouncedSearch]);

  const handleSelectMedication = (med) => {
    setSelectedMed(med);
    setShowDetails(true);
  };

  const handleAddToPresciption = (med) => {
    // Vérifier si Chapitre IV requis
    if (med.chapter_iv?.required) {
      setChapterIVMed(med);
      setShowChapterIV(true);
      return;
    }
    
    if (onSelect) {
      onSelect({
        ...med,
        source: 'sam_v2'
      });
    }
    setShowDetails(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleChapterIVSuccess = (result) => {
    // Ajouter le médicament après demande Chapitre IV
    if (onSelect && chapterIVMed) {
      onSelect({
        ...chapterIVMed,
        source: 'sam_v2',
        chapter_iv_request_id: result.request_id,
        chapter_iv_reference: result.mycarenet_reference
      });
    }
    setShowChapterIV(false);
    setChapterIVMed(null);
    setShowDetails(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const getPatientShare = (reimbursement) => {
    if (!reimbursement) return null;
    switch (patientStatus) {
      case 'bim':
        return reimbursement.patient_share_bim || reimbursement.patient_share;
      case 'omnio':
        return reimbursement.patient_share_omnio || reimbursement.patient_share;
      default:
        return reimbursement.patient_share;
    }
  };

  return (
    <div className="space-y-4">
      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          placeholder="Rechercher un médicament (nom, DCI, CNK)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12 text-lg"
        />
        {isSearching && (
          <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 w-5 h-5 animate-spin" />
        )}
      </div>

      {/* Source indicator */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Badge variant="outline" className="gap-1">
          <Sparkles className="w-3 h-3" />
          SAM v2 - Source Authentique des Médicaments
        </Badge>
        <span>Données AFMPS, CBIP, INAMI</span>
      </div>

      {/* Résultats de recherche */}
      {searchResults.length > 0 && (
        <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
          {searchResults.map((med) => (
            <MedicationResultCard
              key={med.cnk || med.sam_id}
              medication={med}
              patientStatus={patientStatus}
              onSelect={() => handleSelectMedication(med)}
              onQuickAdd={() => handleAddToPresciption(med)}
              isSelected={selectedMedications.some(m => m.cnk === med.cnk)}
            />
          ))}
        </div>
      )}

      {/* Message si pas de résultats */}
      {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            Aucun médicament trouvé pour "{searchQuery}". Vérifiez l'orthographe ou essayez le nom DCI.
          </AlertDescription>
        </Alert>
      )}

      {/* Modal détails */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-purple-600" />
              {selectedMed?.product_name}
            </DialogTitle>
          </DialogHeader>

          {selectedMed && (
            <MedicationDetails
              medication={selectedMed}
              details={detailsQuery.data?.medication}
              alternatives={alternativesQuery.data?.alternatives}
              isLoading={detailsQuery.isLoading}
              patientStatus={patientStatus}
              onAddToPrescription={handleAddToPresciption}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Chapitre IV */}
      {showChapterIV && chapterIVMed && patient && (
        <ChapterIVRequestForm
          isOpen={showChapterIV}
          onClose={() => {
            setShowChapterIV(false);
            setChapterIVMed(null);
          }}
          patient={patient}
          medication={chapterIVMed}
          onSuccess={handleChapterIVSuccess}
        />
      )}
    </div>
  );
}

// Carte résultat médicament
function MedicationResultCard({ medication, patientStatus, onSelect, onQuickAdd, isSelected }) {
  const reimbursement = medication.reimbursement;
  const category = reimbursement?.category;
  const categoryInfo = REIMBURSEMENT_CATEGORIES[category];

  return (
    <div 
      className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-slate-900 truncate">{medication.product_name}</h4>
            {medication.availability?.status !== 'available' && (
              <Badge variant="destructive" className="text-xs">Indisponible</Badge>
            )}
          </div>
          
          <p className="text-sm text-slate-600 mb-2">
            {medication.substance_name && <span className="font-medium">{medication.substance_name}</span>}
            {medication.strength && <span> • {medication.strength}{medication.unit}</span>}
            {medication.form && <span> • {medication.form}</span>}
          </p>

          <div className="flex flex-wrap gap-2">
            {medication.cnk && (
              <Badge variant="outline" className="text-xs font-mono">CNK: {medication.cnk}</Badge>
            )}
            {medication.atc_code && (
              <Badge variant="outline" className="text-xs font-mono">ATC: {medication.atc_code}</Badge>
            )}
            {categoryInfo && (
              <Badge className={`text-xs ${categoryInfo.color}`}>{categoryInfo.label}</Badge>
            )}
            {medication.chapter_iv?.required && (
              <Badge className="bg-purple-600 text-xs">Chapitre IV</Badge>
            )}
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          {reimbursement?.public_price && (
            <div className="mb-2">
              <p className="text-lg font-bold text-slate-900">
                {(reimbursement.public_price / 100).toFixed(2)}€
              </p>
              {reimbursement.patient_share && (
                <p className="text-xs text-slate-500">
                  Part patient: {(reimbursement.patient_share / 100).toFixed(2)}€
                </p>
              )}
            </div>
          )}
          
          <Button 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); onQuickAdd(); }}
            disabled={isSelected}
            className="gap-1"
          >
            <Plus className="w-4 h-4" />
            {isSelected ? 'Ajouté' : 'Ajouter'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Détails complets du médicament
function MedicationDetails({ medication, details, alternatives, isLoading, patientStatus, onAddToPrescription }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const med = details || medication;

  return (
    <Tabs defaultValue="info" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="info">Informations</TabsTrigger>
        <TabsTrigger value="pricing">Prix & Remboursement</TabsTrigger>
        <TabsTrigger value="alternatives">Alternatives</TabsTrigger>
        <TabsTrigger value="interactions">Interactions</TabsTrigger>
      </TabsList>

      <TabsContent value="info" className="mt-4 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Substance active (DCI)</p>
                <p className="font-medium">{med.substance_name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Code ATC</p>
                <p className="font-mono">{med.atc_code || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Forme galénique</p>
                <p>{med.form || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Voie d'administration</p>
                <p>{med.route || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Dosage</p>
                <p>{med.strength}{med.unit}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Conditionnement</p>
                <p>{med.package_size || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Fabricant</p>
                <p>{med.manufacturer || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">CNK</p>
                <p className="font-mono">{med.cnk || '-'}</p>
              </div>
            </div>

            {/* Disponibilité */}
            {med.availability && (
              <div className={`p-3 rounded-lg ${
                med.availability.status === 'available' 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {med.availability.status === 'available' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-medium">
                    {med.availability.status === 'available' ? 'Disponible' : 'Indisponible'}
                  </span>
                </div>
                {med.availability.reason && (
                  <p className="text-sm mt-1">{med.availability.reason}</p>
                )}
                {med.availability.expected_date && (
                  <p className="text-sm mt-1">Retour prévu: {med.availability.expected_date}</p>
                )}
              </div>
            )}

            {/* Documents */}
            {med.documents && (
              <div className="flex gap-2 pt-3 border-t">
                {med.documents.spc_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={med.documents.spc_url} target="_blank" rel="noopener noreferrer">
                      <FileText className="w-4 h-4 mr-1" />
                      RCP
                    </a>
                  </Button>
                )}
                {med.documents.pil_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={med.documents.pil_url} target="_blank" rel="noopener noreferrer">
                      <FileText className="w-4 h-4 mr-1" />
                      Notice
                    </a>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Button className="w-full" size="lg" onClick={() => onAddToPrescription(med)}>
          <Plus className="w-5 h-5 mr-2" />
          Ajouter à la prescription
        </Button>
      </TabsContent>

      <TabsContent value="pricing" className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="w-5 h-5" />
              Prix et remboursement INAMI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {med.pricing || med.reimbursement ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500">Prix public</p>
                    <p className="text-2xl font-bold">
                      {((med.pricing?.public_price || med.reimbursement?.public_price || 0) / 100).toFixed(2)}€
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600">Base de remboursement</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {((med.pricing?.reimbursement_basis || med.reimbursement?.basis || 0) / 100).toFixed(2)}€
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Part patient selon statut:</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`p-3 rounded-lg ${patientStatus === 'normal' ? 'bg-green-100 ring-2 ring-green-500' : 'bg-slate-50'}`}>
                      <p className="text-xs text-slate-500">Normal</p>
                      <p className="font-bold">
                        {((med.pricing?.patient_share_normal || med.reimbursement?.patient_share || 0) / 100).toFixed(2)}€
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${patientStatus === 'bim' ? 'bg-green-100 ring-2 ring-green-500' : 'bg-slate-50'}`}>
                      <p className="text-xs text-slate-500">BIM</p>
                      <p className="font-bold">
                        {((med.pricing?.patient_share_bim || 0) / 100).toFixed(2)}€
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${patientStatus === 'omnio' ? 'bg-green-100 ring-2 ring-green-500' : 'bg-slate-50'}`}>
                      <p className="text-xs text-slate-500">OMNIO</p>
                      <p className="font-bold">
                        {((med.pricing?.patient_share_omnio || 0) / 100).toFixed(2)}€
                      </p>
                    </div>
                  </div>
                </div>

                {/* Catégorie */}
                {(med.pricing?.category || med.reimbursement?.category) && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500 mb-1">Catégorie de remboursement</p>
                    <Badge className={REIMBURSEMENT_CATEGORIES[med.pricing?.category || med.reimbursement?.category]?.color}>
                      {REIMBURSEMENT_CATEGORIES[med.pricing?.category || med.reimbursement?.category]?.label}
                    </Badge>
                    <p className="text-sm mt-1">
                      {REIMBURSEMENT_CATEGORIES[med.pricing?.category || med.reimbursement?.category]?.description}
                    </p>
                  </div>
                )}

                {/* Chapitre IV */}
                {(med.chapter_iv?.required || med.pricing?.chapter_iv) && (
                  <Alert className="bg-purple-50 border-purple-200">
                    <AlertTriangle className="w-4 h-4 text-purple-600" />
                    <AlertDescription className="text-purple-900">
                      <strong>Chapitre IV requis</strong>
                      <p className="text-sm mt-1">
                        Ce médicament nécessite une autorisation préalable de la mutuelle.
                        {med.chapter_iv?.paragraph && ` Paragraphe: ${med.chapter_iv.paragraph}`}
                      </p>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            ) : (
              <p className="text-slate-500 text-center py-4">
                Informations de remboursement non disponibles
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="alternatives" className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-green-600" />
              Alternatives génériques & biosimilaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alternatives && alternatives.length > 0 ? (
              <div className="space-y-2">
                {alternatives.map((alt, idx) => (
                  <div 
                    key={idx}
                    className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                    onClick={() => onAddToPrescription(alt)}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{alt.product_name}</p>
                        {alt.is_generic && <Badge className="bg-green-600 text-xs">Générique</Badge>}
                        {alt.is_biosimilar && <Badge className="bg-blue-600 text-xs">Biosimilaire</Badge>}
                        {alt.is_cheapest && <Badge className="bg-yellow-500 text-xs">Moins cher</Badge>}
                      </div>
                      <p className="text-sm text-slate-500">{alt.manufacturer}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{(alt.public_price / 100).toFixed(2)}€</p>
                      {alt.savings > 0 && (
                        <p className="text-xs text-green-600">-{(alt.savings / 100).toFixed(2)}€</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">
                Aucune alternative générique disponible
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="interactions" className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              Interactions médicamenteuses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {med.interactions && med.interactions.length > 0 ? (
              <div className="space-y-2">
                {med.interactions.map((int, idx) => {
                  const severityInfo = INTERACTION_SEVERITY[int.severity] || INTERACTION_SEVERITY.MINOR;
                  const Icon = severityInfo.icon;
                  
                  return (
                    <div key={idx} className={`p-3 rounded-lg ${severityInfo.color}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4" />
                        <span className="font-medium">{int.drug_name}</span>
                        <Badge variant="outline" className="text-xs">{severityInfo.label}</Badge>
                      </div>
                      <p className="text-sm">{int.description}</p>
                      {int.recommendation && (
                        <p className="text-sm mt-1 font-medium">💡 {int.recommendation}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">
                Aucune interaction connue référencée
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}