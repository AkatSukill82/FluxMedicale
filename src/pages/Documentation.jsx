import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  Loader2, 
  BookOpen,
  CheckCircle,
  Stethoscope,
  Users,
  Calendar,
  CreditCard,
  Shield,
  Database,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { downloadFluxMedDocumentation } from '../components/documentation/GenerateDocumentation';

export default function Documentation() {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX
      downloadFluxMedDocumentation();
      toast.success('Documentation PDF générée avec succès');
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const sections = [
    { icon: Stethoscope, title: 'Présentation Générale', description: 'Architecture, objectifs et technologies' },
    { icon: Users, title: 'Gestion des Patients', description: 'Dossiers FHIR, carte eID, doublons' },
    { icon: Calendar, title: 'Agenda', description: 'Rendez-vous, disponibilités, rappels' },
    { icon: FileText, title: 'Consultations', description: 'Notes cliniques, modèles SOAP, mesures' },
    { icon: FileText, title: 'Prescriptions (Recip-e)', description: 'e-Prescriptions, SAM v2, suivi délivrance' },
    { icon: CreditCard, title: 'Facturation (MyCareNet)', description: 'eAttest, eFact, DMG, Chapitre IV' },
    { icon: Database, title: 'Modules eHealth', description: '9 modules obligatoires homologation' },
    { icon: Shield, title: 'Sécurité & RGPD', description: 'Authentification, audit, conformité' },
    { icon: Mail, title: 'Fonctionnalités avancées', description: 'IA, téléconsultation, messagerie' },
    { icon: BookOpen, title: 'Guide utilisateur', description: 'Raccourcis, navigation, support' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documentation FluxMed</h1>
          <p className="text-slate-600">Documentation complète du logiciel médical</p>
        </div>
        <Button 
          onClick={handleDownload} 
          disabled={isGenerating}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Génération...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Télécharger le PDF
            </>
          )}
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Documentation PDF Complète</h2>
              <p className="text-slate-600 mt-1">
                Ce document PDF contient une description exhaustive de toutes les fonctionnalités de FluxMed, 
                incluant les modules eHealth, la gestion des patients, la facturation, et la conformité RGPD.
              </p>
              <div className="flex items-center gap-4 mt-3">
                <Badge variant="outline" className="bg-white">~15 pages</Badge>
                <Badge variant="outline" className="bg-white">Format A4</Badge>
                <Badge variant="outline" className="bg-white">Français</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sections Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Contenu de la documentation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections.map((section, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <section.icon className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{index + 1}. {section.title}</p>
                  <p className="text-sm text-slate-500">{section.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* eHealth Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Conformité eHealth Belgique
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 mb-4">
            FluxMed intègre tous les modules requis pour l'homologation eHealth en Belgique:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              'SAM v2', 'Recip-e v4', 'MyCareNet', 'Mult-eMediatt', 'Consult RN',
              'eHealthConsent', 'Liens Thérapeutiques', 'Coffres-forts', 'eHealthBox'
            ].map((module) => (
              <div key={module} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">{module}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}