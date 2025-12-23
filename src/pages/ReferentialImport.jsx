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
import { useEffect } from 'react';
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
  },
  {
    product_name: 'METFORMINE SANDOZ 850mg',
    substance_name: 'Metformine',
    form: 'Comprimé pelliculé',
    strength: '850',
    unit: 'mg',
    route: 'Orale',
    package_size: '60',
    package_unit: 'comprimés',
    cnk: '8901234',
    lang: 'fr'
  },
  {
    product_name: 'SIMVASTATINE EG 40mg',
    substance_name: 'Simvastatine',
    form: 'Comprimé pelliculé',
    strength: '40',
    unit: 'mg',
    route: 'Orale',
    package_size: '28',
    package_unit: 'comprimés',
    cnk: '9012345',
    lang: 'fr'
  },
  {
    product_name: 'LOSARTAN MYLAN 50mg',
    substance_name: 'Losartan',
    form: 'Comprimé pelliculé',
    strength: '50',
    unit: 'mg',
    route: 'Orale',
    package_size: '30',
    package_unit: 'comprimés',
    cnk: '0123456',
    lang: 'fr'
  },
  {
    product_name: 'AMLODIPINE TEVA 5mg',
    substance_name: 'Amlodipine',
    form: 'Comprimé',
    strength: '5',
    unit: 'mg',
    route: 'Orale',
    package_size: '30',
    package_unit: 'comprimés',
    cnk: '1234560',
    lang: 'fr'
  },
  {
    product_name: 'LEVOTHYROXINE MYLAN 100µg',
    substance_name: 'Lévothyroxine',
    form: 'Comprimé',
    strength: '100',
    unit: 'µg',
    route: 'Orale',
    package_size: '100',
    package_unit: 'comprimés',
    cnk: '2345601',
    lang: 'fr'
  },
  {
    product_name: 'PANTOPRAZOLE EG 40mg',
    substance_name: 'Pantoprazole',
    form: 'Comprimé gastro-résistant',
    strength: '40',
    unit: 'mg',
    route: 'Orale',
    package_size: '28',
    package_unit: 'comprimés',
    cnk: '3456012',
    lang: 'fr'
  },
  {
    product_name: 'ASPIRINE CARDIO 100mg',
    substance_name: 'Acide acétylsalicylique',
    form: 'Comprimé gastro-résistant',
    strength: '100',
    unit: 'mg',
    route: 'Orale',
    package_size: '56',
    package_unit: 'comprimés',
    cnk: '4560123',
    lang: 'fr'
  },
  {
    product_name: 'CLOPIDOGREL MYLAN 75mg',
    substance_name: 'Clopidogrel',
    form: 'Comprimé pelliculé',
    strength: '75',
    unit: 'mg',
    route: 'Orale',
    package_size: '28',
    package_unit: 'comprimés',
    cnk: '5601234',
    lang: 'fr'
  },
  {
    product_name: 'BISOPROLOL SANDOZ 5mg',
    substance_name: 'Bisoprolol',
    form: 'Comprimé pelliculé',
    strength: '5',
    unit: 'mg',
    route: 'Orale',
    package_size: '30',
    package_unit: 'comprimés',
    cnk: '6012345',
    lang: 'fr'
  },
  {
    product_name: 'RAMIPRIL TEVA 5mg',
    substance_name: 'Ramipril',
    form: 'Gélule',
    strength: '5',
    unit: 'mg',
    route: 'Orale',
    package_size: '30',
    package_unit: 'gélules',
    cnk: '7012346',
    lang: 'fr'
  },
  {
    product_name: 'ATORVASTATINE EG 20mg',
    substance_name: 'Atorvastatine',
    form: 'Comprimé pelliculé',
    strength: '20',
    unit: 'mg',
    route: 'Orale',
    package_size: '30',
    package_unit: 'comprimés',
    cnk: '8012347',
    lang: 'fr'
  },
  {
    product_name: 'FUROSEMIDE MYLAN 40mg',
    substance_name: 'Furosémide',
    form: 'Comprimé',
    strength: '40',
    unit: 'mg',
    route: 'Orale',
    package_size: '30',
    package_unit: 'comprimés',
    cnk: '9012348',
    lang: 'fr'
  },
  {
    product_name: 'SPIRONOLACTONE SANDOZ 25mg',
    substance_name: 'Spironolactone',
    form: 'Comprimé pelliculé',
    strength: '25',
    unit: 'mg',
    route: 'Orale',
    package_size: '50',
    package_unit: 'comprimés',
    cnk: '0123457',
    lang: 'fr'
  },
  {
    product_name: 'ALLOPURINOL EG 300mg',
    substance_name: 'Allopurinol',
    form: 'Comprimé',
    strength: '300',
    unit: 'mg',
    route: 'Orale',
    package_size: '30',
    package_unit: 'comprimés',
    cnk: '1234567',
    lang: 'fr'
  },
  {
    product_name: 'COLCHICINE OPOCALCIUM 1mg',
    substance_name: 'Colchicine',
    form: 'Comprimé',
    strength: '1',
    unit: 'mg',
    route: 'Orale',
    package_size: '20',
    package_unit: 'comprimés',
    cnk: '2345670',
    lang: 'fr'
  },
  {
    product_name: 'TRAMADOL MYLAN 50mg',
    substance_name: 'Tramadol',
    form: 'Gélule',
    strength: '50',
    unit: 'mg',
    route: 'Orale',
    package_size: '30',
    package_unit: 'gélules',
    cnk: '3456701',
    lang: 'fr'
  },
  {
    product_name: 'CODEINE/PARACETAMOL 30/500mg',
    substance_name: 'Codéine + Paracétamol',
    form: 'Comprimé',
    strength: '30/500',
    unit: 'mg',
    route: 'Orale',
    package_size: '20',
    package_unit: 'comprimés',
    cnk: '4567012',
    lang: 'fr'
  },
  {
    product_name: 'DICLOFENAC GEL 1%',
    substance_name: 'Diclofénac',
    form: 'Gel',
    strength: '1',
    unit: '%',
    route: 'Cutanée',
    package_size: '100',
    package_unit: 'g',
    cnk: '5670123',
    lang: 'fr'
  },
  {
    product_name: 'PREDNISOLONE 5mg',
    substance_name: 'Prednisolone',
    form: 'Comprimé',
    strength: '5',
    unit: 'mg',
    route: 'Orale',
    package_size: '30',
    package_unit: 'comprimés',
    cnk: '6701234',
    lang: 'fr'
  },
  {
    product_name: 'CETIRIZINE EG 10mg',
    substance_name: 'Cétirizine',
    form: 'Comprimé pelliculé',
    strength: '10',
    unit: 'mg',
    route: 'Orale',
    package_size: '30',
    package_unit: 'comprimés',
    cnk: '7012345',
    lang: 'fr'
  },
  {
    product_name: 'LORATADINE MYLAN 10mg',
    substance_name: 'Loratadine',
    form: 'Comprimé',
    strength: '10',
    unit: 'mg',
    route: 'Orale',
    package_size: '30',
    package_unit: 'comprimés',
    cnk: '8012346',
    lang: 'fr'
  },
  {
    product_name: 'MOMETASONE SPRAY NASAL',
    substance_name: 'Mométasone',
    form: 'Spray nasal',
    strength: '50',
    unit: 'µg/dose',
    route: 'Nasale',
    package_size: '140',
    package_unit: 'doses',
    cnk: '9012347',
    lang: 'fr'
  },
  {
    product_name: 'BUDESONIDE/FORMOTEROL INHALER',
    substance_name: 'Budésonide + Formotérol',
    form: 'Inhalateur',
    strength: '160/4.5',
    unit: 'µg',
    route: 'Inhalée',
    package_size: '120',
    package_unit: 'doses',
    cnk: '0123458',
    lang: 'fr'
  },
  {
    product_name: 'MONTELUKAST TEVA 10mg',
    substance_name: 'Montélukast',
    form: 'Comprimé pelliculé',
    strength: '10',
    unit: 'mg',
    route: 'Orale',
    package_size: '28',
    package_unit: 'comprimés',
    cnk: '1234568',
    lang: 'fr'
  },
  {
    product_name: 'ESCITALOPRAM SANDOZ 10mg',
    substance_name: 'Escitalopram',
    form: 'Comprimé pelliculé',
    strength: '10',
    unit: 'mg',
    route: 'Orale',
    package_size: '28',
    package_unit: 'comprimés',
    cnk: '2345678',
    lang: 'fr'
  },
  {
    product_name: 'SERTRALINE MYLAN 50mg',
    substance_name: 'Sertraline',
    form: 'Comprimé pelliculé',
    strength: '50',
    unit: 'mg',
    route: 'Orale',
    package_size: '30',
    package_unit: 'comprimés',
    cnk: '3456789',
    lang: 'fr'
  },
  {
    product_name: 'MIRTAZAPINE EG 15mg',
    substance_name: 'Mirtazapine',
    form: 'Comprimé orodispersible',
    strength: '15',
    unit: 'mg',
    route: 'Orale',
    package_size: '30',
    package_unit: 'comprimés',
    cnk: '4567890',
    lang: 'fr'
  },
  {
    product_name: 'ALPRAZOLAM MYLAN 0.5mg',
    substance_name: 'Alprazolam',
    form: 'Comprimé',
    strength: '0.5',
    unit: 'mg',
    route: 'Orale',
    package_size: '30',
    package_unit: 'comprimés',
    cnk: '5678901',
    lang: 'fr'
  },
  {
    product_name: 'ZOLPIDEM SANDOZ 10mg',
    substance_name: 'Zolpidem',
    form: 'Comprimé pelliculé',
    strength: '10',
    unit: 'mg',
    route: 'Orale',
    package_size: '14',
    package_unit: 'comprimés',
    cnk: '6789012',
    lang: 'fr'
  },
  {
    product_name: 'CIPROFLOXACINE TEVA 500mg',
    substance_name: 'Ciprofloxacine',
    form: 'Comprimé pelliculé',
    strength: '500',
    unit: 'mg',
    route: 'Orale',
    package_size: '10',
    package_unit: 'comprimés',
    cnk: '7890124',
    lang: 'fr'
  },
  {
    product_name: 'AZITHROMYCINE SANDOZ 500mg',
    substance_name: 'Azithromycine',
    form: 'Comprimé pelliculé',
    strength: '500',
    unit: 'mg',
    route: 'Orale',
    package_size: '3',
    package_unit: 'comprimés',
    cnk: '8901235',
    lang: 'fr'
  },
  {
    product_name: 'CLARITHROMYCINE MYLAN 500mg',
    substance_name: 'Clarithromycine',
    form: 'Comprimé pelliculé',
    strength: '500',
    unit: 'mg',
    route: 'Orale',
    package_size: '14',
    package_unit: 'comprimés',
    cnk: '9012346',
    lang: 'fr'
  },
  {
    product_name: 'NITROFURANTOINE EG 100mg',
    substance_name: 'Nitrofurantoïne',
    form: 'Gélule',
    strength: '100',
    unit: 'mg',
    route: 'Orale',
    package_size: '20',
    package_unit: 'gélules',
    cnk: '0123459',
    lang: 'fr'
  },
  {
    product_name: 'METRONIDAZOLE TEVA 500mg',
    substance_name: 'Métronidazole',
    form: 'Comprimé',
    strength: '500',
    unit: 'mg',
    route: 'Orale',
    package_size: '20',
    package_unit: 'comprimés',
    cnk: '1234569',
    lang: 'fr'
  },
  {
    product_name: 'FLUCONAZOLE SANDOZ 150mg',
    substance_name: 'Fluconazole',
    form: 'Gélule',
    strength: '150',
    unit: 'mg',
    route: 'Orale',
    package_size: '1',
    package_unit: 'gélule',
    cnk: '2345679',
    lang: 'fr'
  },
  {
    product_name: 'LOPERAMIDE MYLAN 2mg',
    substance_name: 'Lopéramide',
    form: 'Gélule',
    strength: '2',
    unit: 'mg',
    route: 'Orale',
    package_size: '20',
    package_unit: 'gélules',
    cnk: '3456780',
    lang: 'fr'
  },
  {
    product_name: 'DOMPERIDONE EG 10mg',
    substance_name: 'Dompéridone',
    form: 'Comprimé pelliculé',
    strength: '10',
    unit: 'mg',
    route: 'Orale',
    package_size: '30',
    package_unit: 'comprimés',
    cnk: '4567891',
    lang: 'fr'
  },
  {
    product_name: 'ONDANSETRON TEVA 8mg',
    substance_name: 'Ondansétron',
    form: 'Comprimé orodispersible',
    strength: '8',
    unit: 'mg',
    route: 'Orale',
    package_size: '10',
    package_unit: 'comprimés',
    cnk: '5678902',
    lang: 'fr'
  },
  {
    product_name: 'LACTULOSE SIROP',
    substance_name: 'Lactulose',
    form: 'Sirop',
    strength: '667',
    unit: 'mg/ml',
    route: 'Orale',
    package_size: '200',
    package_unit: 'ml',
    cnk: '6789013',
    lang: 'fr'
  },
  {
    product_name: 'MACROGOL 4000 SACHETS',
    substance_name: 'Macrogol',
    form: 'Poudre pour solution buvable',
    strength: '13.125',
    unit: 'g',
    route: 'Orale',
    package_size: '20',
    package_unit: 'sachets',
    cnk: '7890125',
    lang: 'fr'
  },
  {
    product_name: 'VITAMIN D3 25000UI',
    substance_name: 'Cholécalciférol',
    form: 'Capsule molle',
    strength: '25000',
    unit: 'UI',
    route: 'Orale',
    package_size: '12',
    package_unit: 'capsules',
    cnk: '8901236',
    lang: 'fr'
  },
  {
    product_name: 'CALCIUM/VIT D3 500/400',
    substance_name: 'Calcium + Vitamine D3',
    form: 'Comprimé à croquer',
    strength: '500/400',
    unit: 'mg/UI',
    route: 'Orale',
    package_size: '60',
    package_unit: 'comprimés',
    cnk: '9012347',
    lang: 'fr'
  },
  {
    product_name: 'FER SULFATE 80mg',
    substance_name: 'Sulfate ferreux',
    form: 'Comprimé pelliculé',
    strength: '80',
    unit: 'mg',
    route: 'Orale',
    package_size: '30',
    package_unit: 'comprimés',
    cnk: '0123450',
    lang: 'fr'
  },
  {
    product_name: 'ACIDE FOLIQUE 5mg',
    substance_name: 'Acide folique',
    form: 'Comprimé',
    strength: '5',
    unit: 'mg',
    route: 'Orale',
    package_size: '30',
    package_unit: 'comprimés',
    cnk: '1234570',
    lang: 'fr'
  },
  {
    product_name: 'VITAMINE B12 1000µg',
    substance_name: 'Cyanocobalamine',
    form: 'Comprimé sublingual',
    strength: '1000',
    unit: 'µg',
    route: 'Sublinguale',
    package_size: '100',
    package_unit: 'comprimés',
    cnk: '2345680',
    lang: 'fr'
  },
  {
    product_name: 'WARFARINE SODIQUE 5mg',
    substance_name: 'Warfarine',
    form: 'Comprimé',
    strength: '5',
    unit: 'mg',
    route: 'Orale',
    package_size: '100',
    package_unit: 'comprimés',
    cnk: '3456790',
    lang: 'fr'
  },
  {
    product_name: 'RIVAROXABAN XARELTO 20mg',
    substance_name: 'Rivaroxaban',
    form: 'Comprimé pelliculé',
    strength: '20',
    unit: 'mg',
    route: 'Orale',
    package_size: '28',
    package_unit: 'comprimés',
    cnk: '4567801',
    lang: 'fr'
  },
  {
    product_name: 'APIXABAN ELIQUIS 5mg',
    substance_name: 'Apixaban',
    form: 'Comprimé pelliculé',
    strength: '5',
    unit: 'mg',
    route: 'Orale',
    package_size: '60',
    package_unit: 'comprimés',
    cnk: '5678912',
    lang: 'fr'
  },
  {
    product_name: 'ENOXAPARINE 4000UI',
    substance_name: 'Énoxaparine',
    form: 'Solution injectable',
    strength: '4000',
    unit: 'UI',
    route: 'SC',
    package_size: '10',
    package_unit: 'seringues',
    cnk: '6789023',
    lang: 'fr'
  }
];

export default function ReferentialImport() {
  const queryClient = useQueryClient();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(null);
  const fileInputRef = useRef(null);

  const { data: existingDrugs = [] } = useQuery({
    queryKey: ['drugs'],
    queryFn: () => base44.entities.Drug.list('-created_date', 1000)
  });

  // Récupérer la version actuelle
  const currentVersion = existingDrugs.length > 0 
    ? existingDrugs[0]?.version || '1.0.0'
    : null;

  // Vérifier les mises à jour au chargement
  useEffect(() => {
    if (currentVersion) {
      checkForUpdates();
    }
  }, [currentVersion]);

  const checkForUpdates = async () => {
    setCheckingUpdate(true);
    try {
      // Simuler une vérification de version (en production, cela appellerait l'API INAMI/APB)
      const latestVersion = '2024.12.0'; // Version format: YYYY.MM.patch
      
      if (currentVersion && currentVersion !== latestVersion) {
        setUpdateAvailable({
          version: latestVersion,
          releaseDate: '2024-12-15',
          changes: [
            'Nouveaux médicaments ajoutés (450+)',
            'Mise à jour des prix et remboursements',
            'Corrections de données obsolètes',
            'Nouveaux codes CNK'
          ]
        });
        toast.info(`Nouvelle version SAMV2 disponible: ${latestVersion}`, {
          duration: 10000,
          action: {
            label: 'Voir détails',
            onClick: () => {}
          }
        });
      }
    } catch (error) {
      console.error('Erreur vérification mises à jour:', error);
    } finally {
      setCheckingUpdate(false);
    }
  };

  const importDemoMutation = useMutation({
    mutationFn: async () => {
      setImporting(true);
      setProgress(0);
      
      const total = DEMO_DRUGS.length;
      let imported = 0;
      let processed = 0;
      
      console.log('🔄 Début import:', total, 'médicaments à traiter');
      console.log('📊 Médicaments existants:', existingDrugs.length);
      
      for (const drug of DEMO_DRUGS) {
        processed++;
        
        // Vérifier si existe déjà
        const exists = existingDrugs.find(d => 
          d.product_name === drug.product_name && 
          d.strength === drug.strength
        );
        
        if (!exists) {
          console.log('➕ Création:', drug.product_name);
          try {
            const result = await base44.entities.Drug.create(drug);
            console.log('✅ Créé:', result.id);
            imported++;
          } catch (error) {
            console.error('❌ Erreur création:', drug.product_name, error);
            throw error;
          }
        } else {
          console.log('⏭️ Existe déjà:', drug.product_name);
        }
        
        setProgress((processed / total) * 100);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('✅ Import terminé:', imported, 'médicaments importés sur', total);
      return imported;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['drugs'] });
      toast.success(`${count} médicament${count > 1 ? 's' : ''} importé${count > 1 ? 's' : ''} avec succès`);
      setImporting(false);
    },
    onError: (error) => {
      console.error('💥 Erreur mutation:', error);
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
        
        // Déterminer la version à partir du nom de fichier ou date
        const newVersion = `${new Date().getFullYear()}.${String(new Date().getMonth() + 1).padStart(2, '0')}.0`;
        
        let imported = 0;
        const total = drugs.length;
        
        for (const drug of drugs) {
          try {
            await base44.entities.Drug.create({
              ...drug,
              lang: 'fr',
              is_current: true,
              version: newVersion,
              import_date: new Date().toISOString()
            });
            imported++;
            setProgress((imported / total) * 100);
          } catch (error) {
            console.error('Erreur import:', error);
          }
        }
        
        queryClient.invalidateQueries({ queryKey: ['drugs'] });
        toast.success(`${imported} médicaments importés avec succès (v${newVersion})`);
        setUpdateAvailable(null);
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

      {/* Alerte mise à jour disponible */}
      {updateAvailable && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-2">
                  Mise à jour SAMV2 disponible - Version {updateAvailable.version}
                </h3>
                <p className="text-sm text-orange-900 mb-3">
                  Publiée le {new Date(updateAvailable.releaseDate).toLocaleDateString('fr-FR')}
                </p>
                <div className="bg-white rounded-lg p-3 mb-4">
                  <p className="text-sm font-semibold mb-2">Nouveautés :</p>
                  <ul className="text-sm space-y-1">
                    {updateAvailable.changes.map((change, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    size="lg"
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Installer la mise à jour
                  </Button>
                  <Button
                    onClick={() => setUpdateAvailable(null)}
                    variant="outline"
                  >
                    Plus tard
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                <p className="text-sm text-muted-foreground">Version actuelle</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold">{currentVersion || 'Aucune'}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={checkForUpdates}
                    disabled={checkingUpdate || !currentVersion}
                    className="h-6 px-2"
                  >
                    {checkingUpdate ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      '🔄'
                    )}
                  </Button>
                </div>
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
                <p className="text-sm text-muted-foreground">Statut</p>
                <Badge variant={existingDrugs.length > 0 ? "default" : "secondary"}>
                  {existingDrugs.length > 0 ? 'Actif' : 'Vide'}
                </Badge>
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