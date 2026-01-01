import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CreditCard,
  Pill,
  FileText,
  Shield,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Calendar,
  Building2,
  Heart
} from 'lucide-react';
import { toast } from 'sonner';
import { format, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

// Simulation des données MyCareNet
const simulateMyCareNetData = (patientNiss) => {
  if (!patientNiss) return null;

  return {
    assurabilite: {
      statut: 'assure',
      type: 'BIM',
      mutuelle: {
        code: '300',
        nom: 'Mutualité Socialiste',
        numero_affiliation: 'MS-' + patientNiss.substring(0, 6) + '-001'
      },
      dmg: {
        actif: true,
        medecin_nihii: '1-12345-67-890',
        medecin_nom: 'Dr. Martin',
        date_debut: '2023-01-15'
      },
      maf: {
        atteint: false,
        montant_actuel: 245.50,
        plafond: 450.00
      },
      date_verification: new Date().toISOString()
    },
    medicaments: [
      {
        nom: 'Metformine 500mg',
        cnk: '1234567',
        date_prescription: subMonths(new Date(), 2).toISOString(),
        prescripteur: 'Dr. Martin (NIHII: 1-12345-67-890)',
        statut: 'delivre',
        remboursement: 'A'
      },
      {
        nom: 'Atorvastatine 20mg',
        cnk: '7654321',
        date_prescription: subMonths(new Date(), 1).toISOString(),
        prescripteur: 'Dr. Martin (NIHII: 1-12345-67-890)',
        statut: 'delivre',
        remboursement: 'B'
      },
      {
        nom: 'Oméprazole 20mg',
        cnk: '9876543',
        date_prescription: subMonths(new Date(), 3).toISOString(),
        prescripteur: 'Dr. Dupont (NIHII: 1-98765-43-210)',
        statut: 'delivre',
        remboursement: 'Bf'
      }
    ],
    soins_recents: [
      {
        date: subMonths(new Date(), 1).toISOString(),
        type: 'Consultation',
        code: '101032',
        prestataire: 'Dr. Martin',
        montant: 26.64,
        rembourse: 22.49
      },
      {
        date: subMonths(new Date(), 2).toISOString(),
        type: 'Prise de sang',
        code: '540011',
        prestataire: 'Labo Central',
        montant: 15.50,
        rembourse: 13.50
      }
    ]
  };
};

export default function MyCareNetDataPanel({ patient }) {
  const [isLoading, setIsLoading] = useState(false);
  const [mcnData, setMcnData] = useState(null);
  const [activeTab, setActiveTab] = useState('assurabilite');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const patientNiss = patient?.identifier?.find(
    id => id.system === 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin'
  )?.value;

  const handleFetchData = async () => {
    if (!patientNiss) {
      toast.error('NISS du patient requis pour interroger MyCareNet');
      return;
    }

    setIsLoading(true);

    // Simulation d'appel MyCareNet
    await new Promise(resolve => setTimeout(resolve, 2000));

    const data = simulateMyCareNetData(patientNiss);
    setMcnData(data);

    // Log audit
    if (currentUser) {
      await base44.entities.AuditLog.create({
        user_email: currentUser.email,
        action: 'MYCARENET_QUERY',
        target_entity: 'Patient',
        target_id: patient.id,
        details: `Interrogation MyCareNet - Assurabilité, médicaments, soins`,
        timestamp: new Date().toISOString()
      }).catch(console.error);
    }

    setIsLoading(false);
    toast.success('Données MyCareNet récupérées');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="w-5 h-5 text-green-600" />
            Données MyCareNet
          </CardTitle>
          <Button 
            size="sm" 
            onClick={handleFetchData} 
            disabled={isLoading || !patientNiss}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {mcnData ? 'Actualiser' : 'Interroger'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!patientNiss ? (
          <Alert className="bg-orange-50 border-orange-200">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <AlertDescription className="text-orange-900 text-sm">
              NISS requis pour interroger MyCareNet. Veuillez d'abord enregistrer le NISS du patient.
            </AlertDescription>
          </Alert>
        ) : !mcnData ? (
          <div className="text-center py-6 text-muted-foreground">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Cliquez sur "Interroger" pour récupérer les données MyCareNet</p>
            <p className="text-xs mt-1">Assurabilité, médicaments prescrits, soins récents</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-900 text-xs">
                Mode simulation - En production, ces données proviendraient de MyCareNet.
              </AlertDescription>
            </Alert>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="assurabilite" className="flex-1 gap-1">
                  <Shield className="w-4 h-4" />
                  Assurabilité
                </TabsTrigger>
                <TabsTrigger value="medicaments" className="flex-1 gap-1">
                  <Pill className="w-4 h-4" />
                  Médicaments
                </TabsTrigger>
                <TabsTrigger value="soins" className="flex-1 gap-1">
                  <FileText className="w-4 h-4" />
                  Soins
                </TabsTrigger>
              </TabsList>

              <TabsContent value="assurabilite" className="mt-4 space-y-3">
                {/* Statut assurabilité */}
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-green-900">Statut</span>
                    <Badge className="bg-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Assuré
                    </Badge>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">
                    {mcnData.assurabilite.type}
                  </Badge>
                </div>

                {/* Mutuelle */}
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">Mutuelle</span>
                  </div>
                  <p className="font-semibold">{mcnData.assurabilite.mutuelle.nom}</p>
                  <p className="text-sm text-muted-foreground">
                    Code OA: {mcnData.assurabilite.mutuelle.code} • 
                    N° affiliation: {mcnData.assurabilite.mutuelle.numero_affiliation}
                  </p>
                </div>

                {/* DMG */}
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-4 h-4 text-red-600" />
                    <span className="font-medium">Dossier Médical Global (DMG)</span>
                  </div>
                  {mcnData.assurabilite.dmg.actif ? (
                    <>
                      <Badge className="bg-green-100 text-green-800 mb-2">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        DMG actif
                      </Badge>
                      <p className="text-sm">
                        Titulaire: {mcnData.assurabilite.dmg.medecin_nom}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Depuis le {format(new Date(mcnData.assurabilite.dmg.date_debut), 'dd/MM/yyyy', { locale: fr })}
                      </p>
                    </>
                  ) : (
                    <Badge variant="outline">Pas de DMG</Badge>
                  )}
                </div>

                {/* MAF */}
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Maximum à Facturer (MAF)</span>
                    <Badge variant={mcnData.assurabilite.maf.atteint ? 'default' : 'outline'}>
                      {mcnData.assurabilite.maf.atteint ? 'Atteint' : 'Non atteint'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(mcnData.assurabilite.maf.montant_actuel / mcnData.assurabilite.maf.plafond) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm">
                      {mcnData.assurabilite.maf.montant_actuel.toFixed(2)}€ / {mcnData.assurabilite.maf.plafond.toFixed(2)}€
                    </span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="medicaments" className="mt-4 space-y-2">
                {mcnData.medicaments.map((med, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          <Pill className="w-4 h-4 text-purple-600" />
                          {med.nom}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          CNK: {med.cnk} • Catégorie: {med.remboursement}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(med.date_prescription), 'dd/MM/yyyy', { locale: fr })} - {med.prescripteur}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-green-600">
                        {med.statut}
                      </Badge>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="soins" className="mt-4 space-y-2">
                {mcnData.soins_recents.map((soin, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{soin.type}</p>
                        <p className="text-xs text-muted-foreground">
                          Code: {soin.code} • {soin.prestataire}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(soin.date), 'dd/MM/yyyy', { locale: fr })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{soin.montant.toFixed(2)}€</p>
                        <p className="text-xs text-green-600">
                          Remb: {soin.rembourse.toFixed(2)}€
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>

            <p className="text-xs text-muted-foreground text-center">
              Dernière mise à jour: {format(new Date(mcnData.assurabilite.date_verification), 'dd/MM/yyyy à HH:mm', { locale: fr })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}