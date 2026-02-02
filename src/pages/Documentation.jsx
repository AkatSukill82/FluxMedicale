import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileDown,
  Stethoscope,
  Users,
  Calendar,
  CreditCard,
  Phone,
  Package,
  BarChart3,
  MessageSquare,
  Shield,
  Activity,
  FileText,
  Pill,
  Heart,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  BookOpen,
  Printer,
  Download
} from 'lucide-react';
import { jsPDF } from 'jspdf';

export default function DocumentationPage() {
  const [generating, setGenerating] = useState(false);
  const contentRef = useRef(null);

  const modules = [
    {
      title: "Tableau de bord",
      icon: Activity,
      color: "bg-blue-100 text-blue-700",
      description: "Vue d'ensemble de votre activité médicale",
      features: [
        "Statistiques en temps réel (patients, RDV, factures)",
        "Widgets personnalisables (glisser-déposer)",
        "Raccourcis rapides (lecture eID, nouveau patient, agenda)",
        "Alertes et notifications importantes",
        "Recherche rapide de patients"
      ]
    },
    {
      title: "Gestion des Patients",
      icon: Users,
      color: "bg-green-100 text-green-700",
      description: "Dossiers médicaux électroniques complets",
      features: [
        "Lecture carte eID belge pour création automatique",
        "Dossier médical complet (antécédents, allergies, traitements)",
        "Historique des consultations et prescriptions",
        "Documents et résultats de laboratoire",
        "Suivi des vaccinations",
        "Consentement RGPD intégré",
        "Courbes de croissance pédiatriques"
      ]
    },
    {
      title: "Agenda & Rendez-vous",
      icon: Calendar,
      color: "bg-purple-100 text-purple-700",
      description: "Planification et gestion des consultations",
      features: [
        "Vue hebdomadaire interactive (glisser-déposer)",
        "Synchronisation Google Calendar",
        "Types de RDV personnalisables",
        "Rappels automatiques par email/SMS",
        "Gestion des créneaux récurrents",
        "Indisponibilités et congés",
        "Prise de RDV en ligne pour patients"
      ]
    },
    {
      title: "Facturation & Tarification",
      icon: CreditCard,
      color: "bg-yellow-100 text-yellow-700",
      description: "Facturation électronique conforme INAMI",
      features: [
        "Nomenclature INAMI intégrée",
        "Facturation eFact / eAttest (MyCareNet)",
        "Vérification assurabilité en temps réel",
        "Gestion tiers-payant",
        "Attestations de soins",
        "Suivi des paiements",
        "Export comptable",
        "Rappels de paiement automatiques"
      ]
    },
    {
      title: "Prescriptions",
      icon: Pill,
      color: "bg-red-100 text-red-700",
      description: "Prescriptions électroniques Recip-e",
      features: [
        "Base de données SAM v2 (médicaments belges)",
        "Envoi électronique Recip-e",
        "Vérification des interactions médicamenteuses",
        "Modèles de prescription personnalisables",
        "Prescriptions récurrentes (chroniques)",
        "Alternatives génériques",
        "Historique des prescriptions",
        "Génération PDF automatique"
      ]
    },
    {
      title: "Service de Garde",
      icon: Phone,
      color: "bg-orange-100 text-orange-700",
      description: "Gestion des gardes et appels d'urgence",
      features: [
        "Calendrier interactif des gardes",
        "Enregistrement des appels avec niveau d'urgence",
        "Statistiques détaillées (appels, visites, consultations)",
        "Transmission au 1733",
        "Historique avec filtres et recherche",
        "Planning par zone géographique"
      ]
    },
    {
      title: "Messagerie sécurisée",
      icon: MessageSquare,
      color: "bg-indigo-100 text-indigo-700",
      description: "Communication sécurisée entre professionnels",
      features: [
        "eHealthBox intégré",
        "Messages internes entre médecins",
        "Pièces jointes sécurisées",
        "Fil de discussion par patient",
        "Notifications en temps réel"
      ]
    },
    {
      title: "Gestion des Stocks",
      icon: Package,
      color: "bg-teal-100 text-teal-700",
      description: "Inventaire du matériel médical",
      features: [
        "Suivi des stocks en temps réel",
        "Alertes de rupture de stock",
        "Historique des mouvements",
        "Commandes fournisseurs",
        "Gestion des péremptions"
      ]
    },
    {
      title: "Statistiques & Rapports",
      icon: BarChart3,
      color: "bg-pink-100 text-pink-700",
      description: "Analyse de votre activité médicale",
      features: [
        "Tableaux de bord analytiques",
        "Rapports financiers",
        "Statistiques de consultation",
        "Export CSV/Excel",
        "Graphiques interactifs",
        "Comparaisons périodiques"
      ]
    }
  ];

  const integrations = [
    { name: "eHealth", description: "Plateforme fédérale de santé belge" },
    { name: "MyCareNet", description: "Facturation électronique INAMI" },
    { name: "Recip-e", description: "Prescription électronique" },
    { name: "RSW / Vitalink / CoZo", description: "Réseaux santé régionaux (Sumehr)" },
    { name: "SAM v2", description: "Base de données médicaments AFMPS" },
    { name: "Google Calendar", description: "Synchronisation agenda" },
    { name: "eID / Itsme", description: "Authentification sécurisée" }
  ];

  const generatePDF = async () => {
    setGenerating(true);
    
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPos = margin;

      // Fonction helper pour ajouter du texte avec retour à la ligne
      const addText = (text, x, y, fontSize, fontStyle = 'normal', maxWidth = pageWidth - 2 * margin) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', fontStyle);
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return y + (lines.length * fontSize * 0.4);
      };

      // Fonction pour vérifier si on doit créer une nouvelle page
      const checkNewPage = (requiredSpace) => {
        if (yPos + requiredSpace > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
          return true;
        }
        return false;
      };

      // === PAGE DE COUVERTURE ===
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 80, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(32);
      doc.setFont('helvetica', 'bold');
      doc.text('FluxMed', pageWidth / 2, 40, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('Logiciel de Gestion de Cabinet Médical', pageWidth / 2, 55, { align: 'center' });
      doc.text('Guide Complet', pageWidth / 2, 65, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      yPos = 100;
      
      yPos = addText('Bienvenue dans FluxMed', margin, yPos, 18, 'bold');
      yPos += 5;
      yPos = addText(
        'FluxMed est une solution complète de gestion de cabinet médical conçue spécifiquement pour les médecins généralistes belges. ' +
        'Elle intègre toutes les fonctionnalités nécessaires à la pratique quotidienne : gestion des patients, agenda, facturation électronique, ' +
        'prescriptions Recip-e, et bien plus encore.',
        margin, yPos, 11
      );
      yPos += 10;

      yPos = addText('Conformité et Sécurité', margin, yPos, 14, 'bold');
      yPos += 3;
      const conformityItems = [
        '• Conforme RGPD (protection des données personnelles)',
        '• Intégration eHealth (plateforme fédérale de santé)',
        '• Facturation MyCareNet / INAMI',
        '• Prescription électronique Recip-e',
        '• Authentification sécurisée (eID, Itsme)'
      ];
      conformityItems.forEach(item => {
        yPos = addText(item, margin + 5, yPos, 10);
        yPos += 1;
      });

      // === MODULES ===
      doc.addPage();
      yPos = margin;
      
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Modules & Fonctionnalités', pageWidth / 2, 17, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      yPos = 35;

      modules.forEach((module, index) => {
        checkNewPage(50);
        
        // Titre du module
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 10, 'F');
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. ${module.title}`, margin + 3, yPos + 2);
        yPos += 10;

        // Description
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        yPos = addText(module.description, margin, yPos, 10);
        doc.setTextColor(0, 0, 0);
        yPos += 3;

        // Fonctionnalités
        doc.setFont('helvetica', 'normal');
        module.features.forEach(feature => {
          checkNewPage(8);
          yPos = addText(`• ${feature}`, margin + 5, yPos, 9);
          yPos += 1;
        });
        yPos += 8;
      });

      // === INTÉGRATIONS ===
      checkNewPage(80);
      doc.setFillColor(37, 99, 235);
      doc.rect(margin, yPos - 2, pageWidth - 2 * margin, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Intégrations eHealth Belgique', margin + 5, yPos + 6);
      doc.setTextColor(0, 0, 0);
      yPos += 18;

      integrations.forEach(integration => {
        checkNewPage(12);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(integration.name, margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(` - ${integration.description}`, margin + doc.getTextWidth(integration.name) + 2, yPos);
        yPos += 7;
      });

      // === RACCOURCIS CLAVIER ===
      doc.addPage();
      yPos = margin;
      
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Raccourcis Clavier', pageWidth / 2, 17, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      yPos = 35;

      const shortcuts = [
        { key: 'Ctrl + K', action: 'Ouvrir la palette de commandes' },
        { key: 'Ctrl + P', action: 'Rechercher un patient' },
        { key: 'Ctrl + N', action: 'Nouveau patient' },
        { key: 'Ctrl + R', action: 'Nouveau rendez-vous' },
        { key: 'Ctrl + E', action: 'Lire carte eID' },
        { key: 'Ctrl + F', action: 'Nouvelle facture' },
        { key: 'Ctrl + O', action: 'Nouvelle prescription' },
        { key: 'Echap', action: 'Fermer les dialogues' }
      ];

      shortcuts.forEach(shortcut => {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPos - 3, 50, 8, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(shortcut.key, margin + 25, yPos + 2, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text(shortcut.action, margin + 55, yPos + 2);
        yPos += 12;
      });

      yPos += 10;

      // === SUPPORT ===
      doc.setFillColor(240, 253, 244);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 40, 'F');
      doc.setDrawColor(34, 197, 94);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 40, 'S');
      
      yPos += 8;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Support & Assistance', margin + 5, yPos);
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Pour toute question ou assistance technique :', margin + 5, yPos);
      yPos += 6;
      doc.text('• Consultez la documentation en ligne dans l\'application', margin + 5, yPos);
      yPos += 5;
      doc.text('• Utilisez l\'assistant médical IA (bouton en bas à droite)', margin + 5, yPos);
      yPos += 5;
      doc.text('• Contactez le support technique via le menu Aide', margin + 5, yPos);

      // === FOOTER ===
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `FluxMed - Guide Utilisateur | Page ${i} / ${totalPages} | Généré le ${new Date().toLocaleDateString('fr-BE')}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Téléchargement
      doc.save('FluxMed_Guide_Utilisateur.pdf');
      
    } catch (error) {
      console.error('Erreur génération PDF:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-blue-600" />
            Documentation FluxMed
          </h1>
          <p className="text-muted-foreground">Guide complet du logiciel de gestion de cabinet médical</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimer
          </Button>
          <Button onClick={generatePDF} disabled={generating} className="bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            {generating ? 'Génération...' : 'Télécharger PDF'}
          </Button>
        </div>
      </div>

      {/* Contenu principal */}
      <div ref={contentRef} className="print-content">
        {/* Introduction */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <Stethoscope className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Bienvenue dans FluxMed</CardTitle>
                <CardDescription>
                  Solution complète de gestion de cabinet médical pour médecins généralistes belges
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              FluxMed intègre toutes les fonctionnalités nécessaires à la pratique quotidienne : 
              gestion des patients, agenda, facturation électronique INAMI, prescriptions Recip-e, 
              et connexion aux réseaux de santé belges (eHealth, MyCareNet, RSW/Vitalink).
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-green-50">✓ Conforme RGPD</Badge>
              <Badge variant="outline" className="bg-green-50">✓ eHealth intégré</Badge>
              <Badge variant="outline" className="bg-green-50">✓ MyCareNet</Badge>
              <Badge variant="outline" className="bg-green-50">✓ Recip-e</Badge>
              <Badge variant="outline" className="bg-green-50">✓ eID / Itsme</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Modules */}
        <h2 className="text-xl font-bold mb-4">Modules & Fonctionnalités</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {modules.map((module, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${module.color}`}>
                    <module.icon className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base">{module.title}</CardTitle>
                </div>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  {module.features.slice(0, 5).map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {module.features.length > 5 && (
                    <li className="text-muted-foreground text-xs">
                      +{module.features.length - 5} autres fonctionnalités
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Intégrations */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Intégrations eHealth Belgique</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {integrations.map((integration, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                  <p className="font-medium text-sm">{integration.name}</p>
                  <p className="text-xs text-muted-foreground">{integration.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Raccourcis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Raccourcis Clavier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                { key: 'Ctrl + K', action: 'Palette de commandes' },
                { key: 'Ctrl + P', action: 'Rechercher patient' },
                { key: 'Ctrl + N', action: 'Nouveau patient' },
                { key: 'Ctrl + R', action: 'Nouveau RDV' },
                { key: 'Ctrl + E', action: 'Lire carte eID' },
                { key: 'Ctrl + F', action: 'Nouvelle facture' },
              ].map((shortcut, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <kbd className="px-2 py-1 bg-slate-100 rounded text-xs font-mono">{shortcut.key}</kbd>
                  <span className="text-sm">{shortcut.action}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Style d'impression */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-content { padding: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}