import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  Database,
  Pill,
  FileText,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

export default function ReferentialImport() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('drugs');
  const [drugFile, setDrugFile] = useState(null);
  const [nomenFile, setNomenFile] = useState(null);
  const [importStatus, setImportStatus] = useState(null);

  const importDrugsMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const jsonSchema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            atc_code: { type: "string" },
            sam_id: { type: "string" },
            product_name: { type: "string" },
            substance_name: { type: "string" },
            form: { type: "string" },
            strength: { type: "string" },
            unit: { type: "string" },
            route: { type: "string" },
            package_size: { type: "string" },
            package_unit: { type: "string" },
            cnk: { type: "string" },
            lang: { type: "string" }
          }
        }
      };

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: jsonSchema
      });

      if (result.status === 'error') {
        throw new Error(result.details);
      }

      const version = new Date().toISOString();
      const drugsWithVersion = result.output.map(drug => ({
        ...drug,
        version,
        is_current: true
      }));

      await base44.entities.Drug.bulkCreate(drugsWithVersion);
      
      return { imported: drugsWithVersion.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['drugs'] });
      toast.success(`${data.imported} médicaments importés avec succès`);
      setImportStatus({ type: 'success', message: `${data.imported} médicaments importés` });
      setDrugFile(null);
    },
    onError: (error) => {
      toast.error(`Erreur d'import: ${error.message}`);
      setImportStatus({ type: 'error', message: error.message });
    }
  });

  const importNomenMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const jsonSchema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            code: { type: "string" },
            title_fr: { type: "string" },
            title_nl: { type: "string" },
            description_fr: { type: "string" },
            description_nl: { type: "string" },
            specialty_groups: { type: "array", items: { type: "string" } },
            modifiers: { type: "array", items: { type: "string" } },
            honorarium: { type: "number" },
            reimbursed: { type: "number" },
            patient_share: { type: "number" },
            valid_from: { type: "string" },
            valid_to: { type: "string" }
          }
        }
      };

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: jsonSchema
      });

      if (result.status === 'error') {
        throw new Error(result.details);
      }

      const version = new Date().toISOString();
      const nomensWithVersion = result.output.map(nomen => ({
        ...nomen,
        version,
        is_current: true
      }));

      await base44.entities.NomenCode.bulkCreate(nomensWithVersion);
      
      return { imported: nomensWithVersion.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['nomenclature'] });
      toast.success(`${data.imported} codes nomenclature importés avec succès`);
      setImportStatus({ type: 'success', message: `${data.imported} codes importés` });
      setNomenFile(null);
    },
    onError: (error) => {
      toast.error(`Erreur d'import: ${error.message}`);
      setImportStatus({ type: 'error', message: error.message });
    }
  });

  const handleDrugImport = () => {
    if (!drugFile) return;
    setImportStatus(null);
    importDrugsMutation.mutate(drugFile);
  };

  const handleNomenImport = () => {
    if (!nomenFile) return;
    setImportStatus(null);
    importNomenMutation.mutate(nomenFile);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Database className="w-8 h-8 text-primary" />
          Import Référentiels
        </h1>
        <p className="text-muted-foreground mt-1">
          Gestion des référentiels médicaments et nomenclature INAMI
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Réservé aux administrateurs.</strong> L'import remplace les données existantes de la version courante.
          Format accepté: CSV ou JSON avec les colonnes requises.
        </AlertDescription>
      </Alert>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">📥 Comment obtenir les données SAM V2</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <strong>1. Télécharger depuis l'AFMPS :</strong>
            <p className="text-muted-foreground">Visitez <a href="https://www.afmps.be/fr/usage_humain/medicaments/medicaments/banques_de_donnees" target="_blank" className="text-blue-600 underline">https://www.afmps.be/fr/usage_humain/medicaments</a></p>
            <p className="text-muted-foreground">Cherchez "SAM V2" → Téléchargez le fichier XML ou CSV</p>
          </div>
          <div>
            <strong>2. Format attendu :</strong>
            <p className="text-muted-foreground">CSV avec colonnes: atc_code, sam_id, product_name, substance_name, form, strength, unit, route, package_size, package_unit, cnk, lang</p>
          </div>
          <div>
            <strong>3. Convertir XML → CSV (optionnel) :</strong>
            <p className="text-muted-foreground">Utilisez Excel ou Google Sheets pour convertir le XML en CSV si nécessaire</p>
          </div>
          <div>
            <strong>4. Importer :</strong>
            <p className="text-muted-foreground">Sélectionnez votre fichier dans l'onglet "Médicaments" ci-dessous et cliquez sur "Importer"</p>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="drugs">
            <Pill className="w-4 h-4 mr-2" />
            Médicaments
          </TabsTrigger>
          <TabsTrigger value="nomenclature">
            <FileText className="w-4 h-4 mr-2" />
            Nomenclature INAMI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drugs">
          <Card>
            <CardHeader>
              <CardTitle>Import Référentiel Médicaments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Fichier SAM V2 (CSV/JSON/XML)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>Colonnes requises:</strong> atc_code, sam_id, product_name, substance_name, form, strength, unit, route, package_size, package_unit, cnk, lang
                </p>
                <p className="text-xs text-blue-600 mb-2">
                  💡 Téléchargez SAM V2 depuis l'AFMPS (voir instructions ci-dessus)
                </p>
                <Input
                  type="file"
                  accept=".csv,.json,.xml"
                  onChange={(e) => setDrugFile(e.target.files[0])}
                />
                {drugFile && (
                  <p className="text-xs text-green-600 mt-2">
                    ✓ Fichier sélectionné: {drugFile.name} ({(drugFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <Button
                onClick={handleDrugImport}
                disabled={!drugFile || importDrugsMutation.isPending}
                className="w-full"
              >
                {importDrugsMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Import en cours...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Importer médicaments
                  </>
                )}
              </Button>

              {importStatus && activeTab === 'drugs' && (
                <Alert variant={importStatus.type === 'success' ? 'default' : 'destructive'}>
                  {importStatus.type === 'success' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <AlertDescription>{importStatus.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nomenclature">
          <Card>
            <CardHeader>
              <CardTitle>Import Nomenclature INAMI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Fichier Nomenclature INAMI (CSV/JSON)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>Colonnes requises:</strong> code, title_fr, title_nl, description_fr, description_nl, specialty_groups, modifiers, honorarium, reimbursed, patient_share, valid_from, valid_to
                </p>
                <p className="text-xs text-blue-600 mb-2">
                  💡 Téléchargez depuis INAMI : <a href="https://www.inami.fgov.be/fr/professionnels/sante/medecins/soins-de-sante/Pages/nomenclature-art23.aspx" target="_blank" className="underline">inami.fgov.be</a>
                </p>
                <Input
                  type="file"
                  accept=".csv,.json,.xml"
                  onChange={(e) => setNomenFile(e.target.files[0])}
                />
                {nomenFile && (
                  <p className="text-xs text-green-600 mt-2">
                    ✓ Fichier sélectionné: {nomenFile.name} ({(nomenFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <Button
                onClick={handleNomenImport}
                disabled={!nomenFile || importNomenMutation.isPending}
                className="w-full"
              >
                {importNomenMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Import en cours...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Importer nomenclature
                  </>
                )}
              </Button>

              {importStatus && activeTab === 'nomenclature' && (
                <Alert variant={importStatus.type === 'success' ? 'default' : 'destructive'}>
                  {importStatus.type === 'success' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <AlertDescription>{importStatus.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}