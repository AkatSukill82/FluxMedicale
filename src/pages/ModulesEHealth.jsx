import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Shield,
  Database,
  Pill,
  FileText,
  CreditCard,
  Heart,
  Users,
  Lock,
  Cloud,
  Settings,
  Info,
  ArrowRight
} from 'lucide-react';

// Définition des modules eHealth obligatoires selon les critères d'homologation
const EHEALTH_MODULES = [
  {
    id: 'sam_v2',
    name: 'SAM v2',
    fullName: 'Source Authentique des Médicaments',
    description: 'Base de données de référence des médicaments belges (AFMPS, CBIP, INAMI, SPF Économie)',
    category: 'prescription',
    mandatory: true,
    status: 'implemented',
    icon: Pill,
    color: 'purple',
    features: [
      { name: 'Recherche médicaments', implemented: true },
      { name: 'Données CBIP (RCM)', implemented: true },
      { name: 'Prix et remboursement INAMI', implemented: true },
      { name: 'Interactions médicamenteuses', implemented: true },
      { name: 'Génériques/biosimilaires', implemented: true },
      { name: 'Sync temps réel SAM API', implemented: true }
    ],
    links: [
      { label: 'SAM Portal', url: 'https://www.samportal.be' },
      { label: 'CBIP', url: 'https://www.cbip.be' }
    ]
  },
  {
    id: 'recip_e',
    name: 'Recip-e v4',
    fullName: 'Prescription Électronique',
    description: 'Système de prescription électronique dématérialisée pour médicaments',
    category: 'prescription',
    mandatory: true,
    status: 'implemented',
    icon: FileText,
    color: 'blue',
    features: [
      { name: 'Création prescription', implemented: true },
      { name: 'Envoi Recip-e', implemented: true },
      { name: 'RID (identifiant unique)', implemented: true },
      { name: 'Annulation prescription', implemented: true },
      { name: 'Historique prescriptions', implemented: true }
    ],
    links: [
      { label: 'Recip-e', url: 'https://recip-e.be' }
    ]
  },
  {
    id: 'mycarenet',
    name: 'MyCareNet',
    fullName: 'Réseau Soins de Santé',
    description: 'Services de facturation et DMG avec les mutuelles (CIN)',
    category: 'billing',
    mandatory: true,
    status: 'implemented',
    icon: CreditCard,
    color: 'green',
    features: [
      { name: 'eFact (facturation électronique)', implemented: true },
      { name: 'eAttest (attestation électronique)', implemented: true },
      { name: 'eDMG (gestion DMG)', implemented: true },
      { name: 'Assurabilité patient', implemented: true },
      { name: 'Tiers-payant', implemented: true },
      { name: 'Chapitre IV', implemented: true }
    ],
    links: [
      { label: 'MyCareNet', url: 'https://mycarenet.be' }
    ]
  },
  {
    id: 'mediatt',
    name: 'Mult-eMediatt',
    fullName: 'Attestations Médicales Électroniques',
    description: 'Envoi électronique des certificats d\'incapacité de travail',
    category: 'documents',
    mandatory: true,
    status: 'implemented',
    icon: FileText,
    color: 'orange',
    features: [
      { name: 'Création certificat', implemented: true },
      { name: 'Envoi eMediAtt', implemented: true },
      { name: 'Confirmation réception', implemented: true },
      { name: 'Historique envois', implemented: true }
    ],
    links: [
      { label: 'eHealth Mult-eMediatt', url: 'https://www.ehealth.fgov.be/ehealthplatform/fr/service-mult-emediatt' }
    ]
  },
  {
    id: 'consult_rn',
    name: 'Consult RN',
    fullName: 'Consultation Registre National',
    description: 'Vérification identité patient via le registre national belge',
    category: 'identity',
    mandatory: true,
    status: 'implemented',
    icon: Users,
    color: 'slate',
    features: [
      { name: 'Lecture eID', implemented: true },
      { name: 'Validation NISS', implemented: true },
      { name: 'Consultation RN API', implemented: true },
      { name: 'Photo identité', implemented: true }
    ],
    links: [
      { label: 'eHealth', url: 'https://www.ehealth.fgov.be' }
    ]
  },
  {
    id: 'ehealth_consent',
    name: 'eHealthConsent',
    fullName: 'Consentement Patient',
    description: 'Gestion du consentement éclairé du patient pour le partage de données',
    category: 'security',
    mandatory: true,
    status: 'implemented',
    icon: Shield,
    color: 'teal',
    features: [
      { name: 'Vérification consentement', implemented: true },
      { name: 'Demande consentement', implemented: true },
      { name: 'Révocation consentement', implemented: true },
      { name: 'Historique consentements', implemented: true }
    ],
    links: [
      { label: 'eHealthConsent', url: 'https://www.ehealth.fgov.be/ehealthplatform/fr/service-ehealthconsent' }
    ]
  },
  {
    id: 'therapeutic_links',
    name: 'Liens Thérapeutiques',
    fullName: 'Relations Patient-Médecin',
    description: 'Gestion des relations thérapeutiques pour accès aux données patient',
    category: 'security',
    mandatory: true,
    status: 'implemented',
    icon: Heart,
    color: 'red',
    features: [
      { name: 'Création lien (DMG)', implemented: true },
      { name: 'Vérification lien', implemented: true },
      { name: 'Révocation lien', implemented: true },
      { name: 'Liens multiples (groupe)', implemented: true }
    ],
    links: [
      { label: 'eHealth Therapeutic Links', url: 'https://www.ehealth.fgov.be/ehealthplatform/fr/service-ehealth-therapeutic-links' }
    ]
  },
  {
    id: 'vaults',
    name: 'Coffres-forts',
    fullName: 'Coffres-forts Régionaux',
    description: 'Accès aux données patient via les hubs régionaux (RSW, Vitalink, CoZo)',
    category: 'data',
    mandatory: true,
    status: 'none',
    icon: Cloud,
    color: 'indigo',
    features: [
      { name: 'RSW (Wallonie)', implemented: false },
      { name: 'Vitalink (Flandre)', implemented: false },
      { name: 'Abrumet/CoZo (Bruxelles)', implemented: false },
      { name: 'SumEHR consultation', implemented: false },
      { name: 'Schéma médicamenté', implemented: false }
    ],
    links: [
      { label: 'RSW', url: 'https://www.reseausantewallon.be' },
      { label: 'Vitalink', url: 'https://www.vitalink.be' }
    ]
  },
  {
    id: 'ehealthbox',
    name: 'eHealthBox',
    fullName: 'Messagerie Sécurisée',
    description: 'Boîte aux lettres électronique sécurisée pour professionnels de santé',
    category: 'communication',
    mandatory: true,
    status: 'implemented',
    icon: Lock,
    color: 'cyan',
    features: [
      { name: 'Réception messages', implemented: true },
      { name: 'Envoi messages', implemented: true },
      { name: 'Pièces jointes', implemented: true },
      { name: 'Assignation patient', implemented: true }
    ],
    links: [
      { label: 'eHealthBox', url: 'https://www.ehealth.fgov.be' }
    ]
  },
  {
    id: 'annexe82',
    name: 'Annexe 82 / eForms',
    fullName: 'Demandes Imagerie Médicale',
    description: 'Formulaires électroniques pour demandes d\'imagerie (IRM, CT, etc.)',
    category: 'documents',
    mandatory: false,
    status: 'partial',
    icon: FileText,
    color: 'amber',
    features: [
      { name: 'Formulaire Annexe 82', implemented: true },
      { name: 'Génération PDF', implemented: true },
      { name: 'Envoi électronique', implemented: false }
    ],
    links: []
  }
];

const CATEGORIES = {
  prescription: { label: 'Prescription', icon: Pill },
  billing: { label: 'Facturation', icon: CreditCard },
  documents: { label: 'Documents', icon: FileText },
  identity: { label: 'Identité', icon: Users },
  security: { label: 'Sécurité', icon: Shield },
  data: { label: 'Données', icon: Database },
  communication: { label: 'Communication', icon: Lock }
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'implemented':
      return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Implémenté</Badge>;
    case 'partial':
      return <Badge className="bg-orange-500"><Clock className="w-3 h-3 mr-1" /> Partiel</Badge>;
    case 'none':
      return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" /> Non implémenté</Badge>;
    default:
      return <Badge variant="outline">Inconnu</Badge>;
  }
};

const getColorClasses = (color) => {
  const colors = {
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700'
  };
  return colors[color] || colors.slate;
};

export default function ModulesEHealthPage() {
  // Calculer le score global
  const totalFeatures = EHEALTH_MODULES.reduce((sum, m) => sum + m.features.length, 0);
  const implementedFeatures = EHEALTH_MODULES.reduce(
    (sum, m) => sum + m.features.filter(f => f.implemented).length, 0
  );
  const globalScore = Math.round((implementedFeatures / totalFeatures) * 100);

  const mandatoryModules = EHEALTH_MODULES.filter(m => m.mandatory);
  const mandatoryImplemented = mandatoryModules.filter(m => m.status === 'implemented').length;

  return (
    <div className="space-y-6 p-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Modules eHealth Belgique</h1>
          <p className="text-slate-600">
            État d'implémentation des critères d'homologation eHealth/INAMI
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href="https://www.ehealth.fgov.be/ehealthplatform/fr/service-enregistrement-des-logiciels" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" />
            Critères eHealth
          </a>
        </Button>
      </div>

      {/* Score global */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-blue-600 font-medium">Score global</p>
                <p className="text-4xl font-bold text-blue-900">{globalScore}%</p>
              </div>
              <Settings className="w-12 h-12 text-blue-400" />
            </div>
            <Progress value={globalScore} className="h-3" />
            <p className="text-xs text-blue-600 mt-2">
              {implementedFeatures}/{totalFeatures} fonctionnalités implémentées
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-green-600 font-medium">Modules obligatoires</p>
                <p className="text-4xl font-bold text-green-900">
                  {mandatoryImplemented}/{mandatoryModules.length}
                </p>
              </div>
              <Shield className="w-12 h-12 text-green-400" />
            </div>
            <p className="text-sm text-green-700">
              Critères modulaires eHealth pour médecine générale
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-purple-600 font-medium">Prochaine priorité</p>
                <p className="text-xl font-bold text-purple-900">SAM v2 API</p>
              </div>
              <Database className="w-12 h-12 text-purple-400" />
            </div>
            <p className="text-sm text-purple-700">
              Intégration temps réel avec la source authentique
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerte critères */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Critères d'homologation eHealth 2024-2025:</strong> Pour obtenir la prime télématique INAMI, 
          le logiciel doit implémenter les critères fonctionnels et modulaires définis par la plateforme eHealth.
          Les services obligatoires incluent SAM v2, Recip-e, MyCareNet, Mult-eMediatt et les coffres-forts régionaux.
        </AlertDescription>
      </Alert>

      {/* Liste des modules */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Tous les modules</TabsTrigger>
          <TabsTrigger value="mandatory">Obligatoires</TabsTrigger>
          <TabsTrigger value="partial">À compléter</TabsTrigger>
          <TabsTrigger value="none">Non implémentés</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {EHEALTH_MODULES.map(module => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="mandatory" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {EHEALTH_MODULES.filter(m => m.mandatory).map(module => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="partial" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {EHEALTH_MODULES.filter(m => m.status === 'partial').map(module => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="none" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {EHEALTH_MODULES.filter(m => m.status === 'none').map(module => (
              <ModuleCard key={module.id} module={module} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Roadmap */}
      <Card>
        <CardHeader>
          <CardTitle>Roadmap d'implémentation</CardTitle>
          <CardDescription>
            Ordre de priorité pour l'intégration complète des services eHealth
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { phase: 1, title: 'SAM v2 API complète', desc: 'Sync temps réel, prix INAMI, disponibilité', status: 'completed' },
              { phase: 2, title: 'Recip-e v4 intégration', desc: 'Envoi prescriptions, RID, dématérialisation', status: 'completed' },
              { phase: 3, title: 'Coffres-forts régionaux', desc: 'RSW, Vitalink, CoZo - SumEHR et schéma médicamenté', status: 'planned' },
              { phase: 4, title: 'Mult-eMediatt complet', desc: 'Envoi électronique certificats incapacité', status: 'planned' },
              { phase: 5, title: 'Chapitre IV MyCareNet', desc: 'Demandes autorisation remboursement', status: 'completed' }
            ].map(item => (
              <div key={item.phase} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  item.status === 'in_progress' ? 'bg-blue-600 text-white' :
                  item.status === 'planned' ? 'bg-orange-100 text-orange-700' :
                  'bg-slate-200 text-slate-500'
                }`}>
                  {item.phase}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-slate-600">{item.desc}</p>
                </div>
                <Badge variant={
                  item.status === 'in_progress' ? 'default' :
                  item.status === 'planned' ? 'secondary' : 'outline'
                }>
                  {item.status === 'in_progress' ? 'En cours' :
                   item.status === 'planned' ? 'Planifié' : 'Futur'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ModuleCard({ module }) {
  const Icon = module.icon;
  const implementedCount = module.features.filter(f => f.implemented).length;
  const progress = Math.round((implementedCount / module.features.length) * 100);

  return (
    <Card className={`${getColorClasses(module.color)} border`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-white/80`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {module.name}
                {module.mandatory && (
                  <Badge variant="outline" className="text-xs">Obligatoire</Badge>
                )}
              </CardTitle>
              <p className="text-xs opacity-80">{module.fullName}</p>
            </div>
          </div>
          {getStatusBadge(module.status)}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-4 opacity-90">{module.description}</p>
        
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span>Progression</span>
            <span>{implementedCount}/{module.features.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-1 mb-4">
          {module.features.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              {feature.implemented ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <span className={feature.implemented ? '' : 'opacity-60'}>{feature.name}</span>
            </div>
          ))}
        </div>

        {module.links.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-3 border-t">
            {module.links.map((link, idx) => (
              <Button key={idx} variant="ghost" size="sm" asChild className="h-7 text-xs">
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  {link.label}
                </a>
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}