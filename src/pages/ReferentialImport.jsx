import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Database, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Pill,
  FileText,
  Download
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

      {/* Info production */}
      <Card className="bg-slate-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Download className="w-6 h-6 text-slate-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Import en production</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Pour un environnement de production, vous devez importer le référentiel officiel SAM/APB 
                (Banque de Données des Médicaments) qui contient tous les médicaments autorisés en Belgique.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Téléchargez le fichier SAM/APB depuis le site officiel</li>
                <li>Utilisez l'outil d'import pour charger le fichier XML</li>
                <li>Vérifiez l'intégrité des données importées</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}