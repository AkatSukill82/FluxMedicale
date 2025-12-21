import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Upload, 
  Database, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Pill,
  FileText,
  Download,
  FileUp
} from 'lucide-react';
import { toast } from 'sonner';

// Données de démo pour test
const DEMO_DRUGS = [
  {
    product_name: 'DAFALGAN 1000mg',
    substance_name: 'Paracétamol',
    form: 'Comprimé',
    strength: '1000',
    unit: 'mg',
    route: 'Orale',
    package_size: '30',
    package_unit: 'comprimés',
    cnk: '1234567',
    lang: 'fr'
  },
  {
    product_name: 'DAFALGAN 500mg',
    substance_name: 'Paracétamol',
    form: 'Comprimé',
    strength: '500',
    unit: 'mg',
    route: 'Orale',
    package_size: '20',
    package_unit: 'comprimés',
    cnk: '1234568',
    lang: 'fr'
  },
  {
    product_name: 'IBUPROFEN MYLAN 400mg',
    substance_name: 'Ibuprofène',
    form: 'Comprimé pelliculé',
    strength: '400',
    unit: 'mg',
    route: 'Orale',
    package_size: '30',
    package_unit: 'comprimés',
    cnk: '2345678',
    lang: 'fr'
  },
  {
    product_name: 'AMOXICILLINE EG 500mg',
    substance_name: 'Amoxicilline',
    form: 'Gélule',
    strength: '500',
    unit: 'mg',
    route: 'Orale',
    package_size: '21',
    package_unit: 'gélules',
    cnk: '3456789',
    lang: 'fr'
  },
  {
    product_name: 'OMEPRAZOLE SANDOZ 20mg',
    substance_name: 'Oméprazole',
    form: 'Gélule gastro-résistante',
    strength: '20',
    unit: 'mg',
    route: 'Orale',
    package_size: '28',
    package_unit: 'gélules',
    cnk: '4567890',
    lang: 'fr'
  },
  {
    product_name: 'AUGMENTIN 875/125mg',
    substance_name: 'Amoxicilline + Acide clavulanique',
    form: 'Comprimé pelliculé',
    strength: '875/125',
    unit: 'mg',
    route: 'Orale',
    package_size: '20',
    package_unit: 'comprimés',
    cnk: '5678901',
    lang: 'fr'
  },
  {
    product_name: 'VENTOLINE 100µg',
    substance_name: 'Salbutamol',
    form: 'Solution pour inhalation',
    strength: '100',
    unit: 'µg/dose',
    route: 'Inhalée',
    package_size: '200',
    package_unit: 'doses',
    cnk: '6789012',
    lang: 'fr'
  },
  {
    product_name: 'ATENOLOL TEVA 50mg',
    substance_name: 'Aténolol',
    form: 'Comprimé',
    strength: '50',
    unit: 'mg',
    route: 'Orale',
    package_size: '30',
    package_unit: 'comprimés',
    cnk: '7890123',
    lang: 'fr'
  }
];

export default function ReferentialImport() {
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  const { data: existingDrugs = [] } = useQuery({
    queryKey: ['drugs'],
    queryFn: () => base44.entities.Drug.list('-created_date', 1000)
  });

  const importDemoMutation = useMutation({
    mutationFn: async () => {
      setImporting(true);
      setProgress(0);
      
      const total = DEMO_DRUGS.length;
      let imported = 0;
      
      for (const drug of DEMO_DRUGS) {
        // Vérifier si existe déjà
        const exists = existingDrugs.find(d => 
          d.product_name === drug.product_name && 
          d.strength === drug.strength
        );
        
        if (!exists) {
          await base44.entities.Drug.create(drug);
          imported++;
        }
        
        setProgress(((imported + 1) / total) * 100);
        await new Promise(resolve => setTimeout(resolve, 200)); // Délai pour animation
      }
      
      return imported;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['drugs'] });
      toast.success(`${count} médicaments importés avec succès`);
      setImporting(false);
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'importation: ' + error.message);
      setImporting(false);
    }
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const drugs = await base44.entities.Drug.list('-created_date', 10000);
      for (const drug of drugs) {
        await base44.entities.Drug.delete(drug.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drugs'] });
      toast.success('Base de données vidée');
    }
  });

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    setProgress(0);

    try {
      // Upload le fichier
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      toast.info('Analyse du fichier SAMV2 en cours...');
      
      // Extraire les données avec l'IA
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: {
          type: "object",
          properties: {
            drugs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product_name: { type: "string" },
                  substance_name: { type: "string" },
                  form: { type: "string" },
                  strength: { type: "string" },
                  unit: { type: "string" },
                  route: { type: "string" },
                  package_size: { type: "string" },
                  package_unit: { type: "string" },
                  cnk: { type: "string" },
                  atc_code: { type: "string" },
                  sam_id: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result.status === 'success' && result.output?.drugs) {
        const drugs = result.output.drugs;
        toast.success(`${drugs.length} médicaments détectés, import en cours...`);
        
        let imported = 0;
        const total = drugs.length;
        
        for (const drug of drugs) {
          try {
            await base44.entities.Drug.create({
              ...drug,
              lang: 'fr',
              is_current: true
            });
            imported++;
            setProgress((imported / total) * 100);
          } catch (error) {
            console.error('Erreur import:', error);
          }
        }
        
        queryClient.invalidateQueries({ queryKey: ['drugs'] });
        toast.success(`${imported} médicaments importés avec succès`);
      } else {
        toast.error(result.details || 'Erreur lors de l\'extraction des données');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'import: ' + error.message);
    } finally {
      setUploadingFile(false);
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Import des référentiels</h1>
        <p className="text-muted-foreground">
          Gérez l'importation des bases de données de médicaments et nomenclature INAMI
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Pill className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Médicaments</p>
                <p className="text-2xl font-bold">{existingDrugs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Database className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Statut</p>
                <Badge variant={existingDrugs.length > 0 ? "default" : "secondary"}>
                  {existingDrugs.length > 0 ? 'Actif' : 'Vide'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dernière MAJ</p>
                <p className="text-sm font-medium">Aujourd'hui</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import démo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5" />
            Médicaments - Import de test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-900 mb-1">Import de données de démonstration</p>
                <p className="text-blue-700">
                  Cet import ajoute {DEMO_DRUGS.length} médicaments courants (Dafalgan, Ibuprofen, Amoxicilline, etc.) 
                  pour tester le système de prescription. En production, vous devrez importer le référentiel SAM/APB complet.
                </p>
              </div>
            </div>
          </div>

          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Import en cours...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => importDemoMutation.mutate()}
              disabled={importing}
              className="flex-1"
              size="lg"
            >
              {importing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Importer {DEMO_DRUGS.length} médicaments de test
                </>
              )}
            </Button>

            {existingDrugs.length > 0 && (
              <Button
                onClick={() => {
                  if (confirm('Êtes-vous sûr de vouloir supprimer tous les médicaments ?')) {
                    clearMutation.mutate();
                  }
                }}
                variant="destructive"
                disabled={importing || clearMutation.isPending}
              >
                Vider la base
              </Button>
            )}
          </div>

          {existingDrugs.length > 0 && (
            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-3">Médicaments dans la base ({existingDrugs.length})</h4>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {existingDrugs.slice(0, 20).map(drug => (
                  <div key={drug.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <div>
                      <p className="font-medium text-sm">{drug.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {drug.substance_name} • {drug.strength}{drug.unit}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">{drug.cnk}</Badge>
                  </div>
                ))}
                {existingDrugs.length > 20 && (
                  <p className="text-sm text-center text-muted-foreground pt-2">
                    ... et {existingDrugs.length - 20} autres
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import SAMV2 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Import SAMV2 - Base complète
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-green-900 mb-1">Import automatique SAMV2</p>
                <p className="text-green-700 mb-3">
                  Téléchargez le fichier SAMV2 officiel et importez-le ici. L'IA extraira automatiquement 
                  tous les médicaments (CSV, XML, Excel supportés).
                </p>
                <div className="space-y-2 text-xs text-green-600">
                  <p><strong>Où télécharger SAMV2 ?</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Site INAMI: <a href="https://www.inami.fgov.be" target="_blank" className="underline">www.inami.fgov.be</a></li>
                    <li>APB (Association Pharmaceutique Belge): référentiel SAM/APB</li>
                    <li>Formats acceptés: CSV, XML, XLSX</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {uploadingFile && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Import du fichier SAMV2...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xml,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            size="lg"
            className="w-full"
            variant="outline"
          >
            {uploadingFile ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyse et import en cours...
              </>
            ) : (
              <>
                <FileUp className="w-5 h-5 mr-2" />
                Sélectionner le fichier SAMV2 (CSV/XML/Excel)
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            L'import peut prendre plusieurs minutes selon la taille du fichier
          </p>
        </CardContent>
      </Card>

      {/* Info production */}
      <Card className="bg-slate-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Download className="w-6 h-6 text-slate-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-lg mb-2">À propos de SAMV2</h3>
              <p className="text-sm text-muted-foreground mb-3">
                SAMV2 est la base de données officielle des médicaments autorisés en Belgique, 
                maintenue par l'INAMI et l'APB. Elle contient:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Plus de 30,000 médicaments et spécialités</li>
                <li>Codes CNK, ATC, prix, remboursements</li>
                <li>Compositions, dosages, formes galéniques</li>
                <li>Mise à jour mensuelle recommandée</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}