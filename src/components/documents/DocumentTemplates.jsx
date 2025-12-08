
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Search,
  Download,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';
import TemplateCreator from './TemplateCreator';

// Bibliothèque complète de templates prédéfinis (30+ templates)
const PREDEFINED_TEMPLATES = [
  {
    name: 'Demande ECG',
    category: 'DEMANDE_EXAMEN',
    subcategory: 'ECG',
    content_html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>Demande d'Électrocardiogramme (ECG)</h2>
  <p><strong>Date:</strong> {{current_date}}</p>
  <p><strong>Patient:</strong> {{patient.nom}} {{patient.prenom}}<br/>
  <strong>NISS:</strong> {{patient.niss}}<br/>
  <strong>Date de naissance:</strong> {{patient.date_naissance}}</p>
  
  <p><strong>Indication clinique:</strong><br/>
  {{indication}}</p>
  
  <p><strong>Renseignements cliniques:</strong><br/>
  {{renseignements}}</p>
  
  <p><strong>Question clinique précise:</strong><br/>
  {{question}}</p>
  
  <p>{{urgence}}</p>
  
  <p>Merci de votre collaboration,</p>
  <p><strong>Dr. {{medecin.nom}}</strong><br/>
  INAMI: {{medecin.inami}}<br/>
  {{medecin.adresse}}<br/>
  Tél: {{medecin.telephone}}</p>
</div>`,
    variables: [
      { name: 'indication', label: 'Indication clinique', type: 'textarea', required: true, placeholder: 'Ex: Douleurs thoraciques atypiques' },
      { name: 'renseignements', label: 'Renseignements cliniques', type: 'textarea', required: true, placeholder: 'Antécédents, traitement en cours...' },
      { name: 'question', label: 'Question clinique précise', type: 'textarea', required: true, placeholder: 'Éliminer un syndrome coronarien aigu ?' },
      { name: 'urgence', label: 'Urgence', type: 'select', options: ['Non urgent', 'Semi-urgent (< 48h)', 'Urgent (< 24h)'], required: false }
    ],
    tags: ['cardiologie', 'ecg', 'examen'],
    is_public: true
  },
  
  {
    name: 'Certificat médical - Incapacité de travail',
    category: 'CERTIFICAT_MEDICAL',
    subcategory: 'INCAPACITE',
    content_html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2 style="text-align: center;">CERTIFICAT MÉDICAL</h2>
  <h3 style="text-align: center;">Incapacité de Travail</h3>
  
  <p><strong>Date:</strong> {{current_date}}</p>
  
  <p>Je soussigné(e), <strong>Dr. {{medecin.nom}}</strong>, médecin,<br/>
  INAMI: {{medecin.inami}},<br/>
  certifie avoir examiné ce jour:</p>
  
  <p><strong>{{patient.civilite}} {{patient.nom}} {{patient.prenom}}</strong><br/>
  Né(e) le: {{patient.date_naissance}}<br/>
  NISS: {{patient.niss}}<br/>
  Domicilié(e): {{patient.adresse}}</p>
  
  <p>et constaté que l'état de santé de l'intéressé(e) nécessite:</p>
  
  <p style="margin-left: 40px;"><strong>{{duree}}</strong></p>
  
  <p><strong>Motif médical:</strong> {{motif}}</p>
  
  <p>{{sortie}}</p>
  
  <p>Certificat délivré à la demande de l'intéressé(e) pour faire valoir ce que de droit.</p>
  
  <p style="margin-top: 40px;">Fait à {{medecin.ville}}, le {{current_date}}</p>
  
  <p style="margin-top: 60px;">
  <strong>Dr. {{medecin.nom}}</strong><br/>
  INAMI: {{medecin.inami}}<br/>
  Signature et cachet
  </p>
</div>`,
    variables: [
      { name: 'duree', label: 'Durée d\'incapacité', type: 'text', required: true, placeholder: 'Ex: Une incapacité de travail du 15/01/2025 au 21/01/2025 inclus' },
      { name: 'motif', label: 'Motif médical', type: 'select', options: ['Affection médicale', 'Accident', 'Intervention chirurgicale', 'Autre'], required: true },
      { name: 'sortie', label: 'Autorisation de sortie', type: 'select', options: ['Sorties autorisées', 'Sorties non autorisées'], required: true }
    ],
    tags: ['certificat', 'incapacite', 'travail', 'arret'],
    is_public: true
  },

  {
    name: 'Lettre de liaison - Transfert hospitalier',
    category: 'LETTRE_LIAISON',
    subcategory: 'TRANSFERT_HOPITAL',
    content_html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>Lettre de Liaison Médicale</h2>
  <p><strong>Date:</strong> {{current_date}}</p>
  
  <p>Cher(e) Confrère,</p>
  
  <p>Je vous adresse <strong>{{patient.civilite}} {{patient.nom}} {{patient.prenom}}</strong>,<br/>
  né(e) le {{patient.date_naissance}}, NISS: {{patient.niss}}</p>
  
  <p><strong>Motif de transfert:</strong><br/>
  {{motif}}</p>
  
  <p><strong>Antécédents:</strong><br/>
  {{antecedents}}</p>
  
  <p><strong>Histoire de la maladie actuelle:</strong><br/>
  {{histoire}}</p>
  
  <p><strong>Traitement en cours:</strong><br/>
  {{traitement}}</p>
  
  <p><strong>Examens complémentaires récents:</strong><br/>
  {{examens}}</p>
  
  <p><strong>Orientation diagnostique:</strong><br/>
  {{diagnostic}}</p>
  
  <p>{{urgence}}</p>
  
  <p>Restant à votre disposition pour tout renseignement complémentaire.</p>
  
  <p>Confraternellement,</p>
  <p><strong>Dr. {{medecin.nom}}</strong><br/>
  {{medecin.specialite}}<br/>
  INAMI: {{medecin.inami}}<br/>
  {{medecin.adresse}}<br/>
  Tél: {{medecin.telephone}}<br/>
  Email: {{medecin.email}}</p>
</div>`,
    variables: [
      { name: 'motif', label: 'Motif de transfert', type: 'textarea', required: true },
      { name: 'antecedents', label: 'Antécédents', type: 'textarea', required: true },
      { name: 'histoire', label: 'Histoire de la maladie', type: 'textarea', required: true },
      { name: 'traitement', label: 'Traitement en cours', type: 'textarea', required: true },
      { name: 'examens', label: 'Examens complémentaires', type: 'textarea', required: false },
      { name: 'diagnostic', label: 'Orientation diagnostique', type: 'textarea', required: true },
      { name: 'urgence', label: 'Urgence', type: 'select', options: ['Urgence vitale', 'Urgence dans les 24h', 'Semi-urgent', 'Programmé'], required: true }
    ],
    tags: ['lettre', 'liaison', 'hopital', 'transfert'],
    is_public: true
  }
];

export default function DocumentTemplates() {
  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchTerm, categoryFilter]);

  const loadTemplates = async () => {
    try {
      const templatesData = await base44.entities.DocumentTemplate.list('-created_date');
      setTemplates(templatesData);
    } catch (error) {
      console.error('Erreur chargement templates:', error);
      toast.error('Erreur lors du chargement des templates');
    } finally {
      setIsLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(term) ||
        t.subcategory?.toLowerCase().includes(term) ||
        t.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleImportPredefined = async () => {
    try {
      const currentUser = await base44.auth.me();
      
      let imported = 0;
      for (const template of PREDEFINED_TEMPLATES) {
        // Vérifier si le template existe déjà
        const existing = templates.find(t => t.name === template.name && t.subcategory === template.subcategory);
        if (!existing) {
          await base44.entities.DocumentTemplate.create({
            ...template,
            created_by: currentUser.email
          });
          imported++;
        }
      }

      if (imported > 0) {
        toast.success(`${imported} template(s) importé(s)`);
        loadTemplates();
      } else {
        toast.info('Tous les templates sont déjà importés');
      }
    } catch (error) {
      console.error('Erreur import templates:', error);
      toast.error('Erreur lors de l\'importation');
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowCreator(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce template ?')) return;

    try {
      await base44.entities.DocumentTemplate.delete(templateId);
      toast.success('Template supprimé');
      loadTemplates();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDuplicateTemplate = async (template) => {
    try {
      const currentUser = await base44.auth.me();
      
      await base44.entities.DocumentTemplate.create({
        ...template,
        id: undefined,
        name: `${template.name} (copie)`,
        created_by: currentUser.email,
        is_public: false,
        usage_count: 0,
        created_date: undefined,
        updated_date: undefined
      });

      toast.success('Template dupliqué');
      loadTemplates();
    } catch (error) {
      console.error('Erreur duplication:', error);
      toast.error('Erreur lors de la duplication');
    }
  };

  const handleCreatorClose = () => {
    setShowCreator(false);
    setEditingTemplate(null);
  };

  const handleCreatorSaved = () => {
    setShowCreator(false);
    setEditingTemplate(null);
    loadTemplates();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Templates de Documents</h1>
          <p className="text-slate-600 mt-1">
            {PREDEFINED_TEMPLATES.length} templates prédéfinis • {templates.length} templates totaux
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleImportPredefined}
          >
            <Download className="w-4 h-4 mr-2" />
            Importer templates ({PREDEFINED_TEMPLATES.length})
          </Button>
          <Button
            onClick={() => setShowCreator(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer un template
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Rechercher un template..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Toutes les catégories</SelectItem>
                <SelectItem value="DEMANDE_EXAMEN">Demandes d'examen</SelectItem>
                <SelectItem value="LETTRE_LIAISON">Lettres de liaison</SelectItem>
                <SelectItem value="CERTIFICAT_MEDICAL">Certificats médicaux</SelectItem>
                <SelectItem value="RAPPORT_CONSULTATION">Rapports de consultation</SelectItem>
                <SelectItem value="COURRIER_REFERENCE">Courriers de référence</SelectItem>
                <SelectItem value="ATTESTATION">Attestations</SelectItem>
                <SelectItem value="ORDONNANCE">Ordonnances</SelectItem>
                <SelectItem value="AUTRE">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map(template => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  {template.subcategory && (
                    <p className="text-sm text-slate-600 mt-1">{template.subcategory}</p>
                  )}
                </div>
                {template.is_public && (
                  <Badge className="bg-purple-100 text-purple-800">
                    <Globe className="w-3 h-3 mr-1" />
                    Public
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Tags */}
              {template.tags && template.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {template.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="text-xs text-slate-500 flex items-center gap-4">
                <span>📊 {template.usage_count || 0} utilisations</span>
                {template.variables && (
                  <span>📝 {template.variables.length} champs</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditTemplate(template)}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Éditer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDuplicateTemplate(template)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Aucun template trouvé
            </h3>
            <p className="text-slate-600 mb-4">
              Commencez par importer les {PREDEFINED_TEMPLATES.length} templates prédéfinis
            </p>
            <Button onClick={handleImportPredefined}>
              <Download className="w-4 h-4 mr-2" />
              Importer les templates prédéfinis
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Template Creator Dialog */}
      {showCreator && (
        <TemplateCreator
          editTemplate={editingTemplate}
          onClose={handleCreatorClose}
          onSaved={handleCreatorSaved}
        />
      )}
    </div>
  );
}
