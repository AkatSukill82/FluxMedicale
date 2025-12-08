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
  Shield
} from 'lucide-react';
import { useSAM } from './useSAM';

// Panneau Médicaments - Recherche SAM + Monographies CBIP/BCFI
export default function MedicationsPanel({ patient, onSelectMedication, currentUser }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [interactions, setInteractions] = useState(null);
  
  const { searchSAM, getMedicationDetails, checkInteractions, isLoading } = useSAM(currentUser);
  const [samResults, setSamResults] = useState([]);

  const handleSearch = async () => {
    if (!searchTerm) return;
    
    const results = await searchSAM(searchTerm);
    setSamResults(results);
  };

  const handleSelectMedication = async (medication) => {
    setSelectedMedication(medication);
    
    // Charger détails + monographie
    const details = await getMedicationDetails(medication.sam_id);
    setSelectedMedication({...medication, ...details});
    
    if (onSelectMedication) {
      onSelectMedication({...medication, ...details});
    }
  };

  const handleCheckInteractions = async () => {
    if (!selectedMedication) return;
    
    const result = await checkInteractions(patient, selectedMedication);
    setInteractions(result);
  };

  return (
    <div className="space-y-4">
      {/* Recherche SAM */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-blue-600" />
            Recherche Médicaments (SAM - FAMHP)
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

          {samResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-slate-600 font-semibold">{samResults.length} résultat(s)</p>
              {samResults.map((med) => (
                <div
                  key={med.sam_id}
                  onClick={() => handleSelectMedication(med)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedMedication?.sam_id === med.sam_id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-900">{med.name}</h4>
                      <p className="text-sm text-slate-600">{med.dosage}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">CNK: {med.cnk}</Badge>
                        <Badge variant="outline" className="text-xs">SAM: {med.sam_id}</Badge>
                      </div>
                    </div>
                    {med.remboursement && (
                      <Badge className="bg-green-100 text-green-800">Remboursé</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Détails + Monographie CBIP */}
      {selectedMedication && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedMedication.name}</span>
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
                  onClick={() => window.open(selectedMedication.cbip_url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  CBIP/BCFI
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Informations essentielles */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-600">Substance active</label>
                <p className="text-slate-900">{selectedMedication.active_substance}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600">Classe thérapeutique</label>
                <p className="text-slate-900">{selectedMedication.atc_class}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600">Laboratoire</label>
                <p className="text-slate-900">{selectedMedication.laboratory}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600">Forme pharmaceutique</label>
                <p className="text-slate-900">{selectedMedication.form}</p>
              </div>
            </div>

            {/* Posologie */}
            {selectedMedication.posology && (
              <div>
                <label className="text-sm font-semibold text-slate-600">Posologie usuelle</label>
                <p className="text-slate-900">{selectedMedication.posology}</p>
              </div>
            )}

            {/* Contre-indications */}
            {selectedMedication.contraindications && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-900">
                  <strong>Contre-indications:</strong> {selectedMedication.contraindications}
                </AlertDescription>
              </Alert>
            )}

            {/* Précautions */}
            {selectedMedication.precautions && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <Info className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-yellow-900">
                  <strong>Précautions:</strong> {selectedMedication.precautions}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Résultat interactions */}
      {interactions && (
        <Card className={interactions.has_interactions ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {interactions.has_interactions ? (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              ) : (
                <Shield className="w-5 h-5 text-green-600" />
              )}
              <div>
                <h4 className="font-semibold mb-2">
                  {interactions.has_interactions ? 'Interactions détectées' : 'Aucune interaction majeure'}
                </h4>
                {interactions.interactions?.map((interaction, idx) => (
                  <div key={idx} className="text-sm mb-2">
                    <strong>{interaction.drug1} × {interaction.drug2}:</strong> {interaction.description}
                    <Badge className="ml-2">{interaction.severity}</Badge>
                  </div>
                ))}
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => window.open('https://www.cbip.be/fr/chapters/17?frag=8000', '_blank')}
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

      {/* Info CBIP */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Sources authentiques:</strong> SAM (FAMHP - Agence fédérale des médicaments), 
          CBIP/BCFI (Centre Belge d'Information Pharmacothérapeutique). 
          Données actualisées quotidiennement.
        </AlertDescription>
      </Alert>
    </div>
  );
}