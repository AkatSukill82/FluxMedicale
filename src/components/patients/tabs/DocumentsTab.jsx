import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Download,
  Send,
  Plus,
  Calendar,
  User,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Sparkles,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import DocumentEditor from '../../documents/DocumentEditor';
import AIDocumentAnalyzer from '../../documents/AIDocumentAnalyzer';
import PatientDocumentsManager from '../../documents/PatientDocumentsManager';

export default function DocumentsTab({ patient }) {
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [analyzingDocument, setAnalyzingDocument] = useState(null); // Added new state for AI analysis

  const { data: documents = [], isLoading, refetch } = useQuery({
    queryKey: ['documents', patient.id],
    queryFn: () => base44.entities.Document.filter({ patient_id: patient.id }, '-created_date'),
    enabled: !!patient.id
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['documentTemplates'],
    queryFn: () => base44.entities.DocumentTemplate.list('-usage_count', 50)
  });

  const handleNewDocument = (template) => {
    setSelectedTemplate(template);
    setShowTemplateSelector(false);
    setShowEditor(true);
  };

  const handleDocumentSaved = () => {
    setShowEditor(false);
    setSelectedTemplate(null);
    refetch();
  };

  const getTypeBadge = (type) => {
    const config = {
      ATTESTATION: { label: 'Attestation', color: 'bg-blue-100 text-blue-800' },
      LETTER: { label: 'Courrier', color: 'bg-purple-100 text-purple-800' },
      LAB_ORDER: { label: 'Prescription labo', color: 'bg-green-100 text-green-800' },
      IMAGING_ORDER: { label: 'Imagerie', color: 'bg-yellow-100 text-yellow-800' },
      CERTIFICATE: { label: 'Certificat', color: 'bg-pink-100 text-pink-800' },
      PRESCRIPTION: { label: 'Ordonnance', color: 'bg-indigo-100 text-indigo-800' },
      REPORT: { label: 'Rapport', color: 'bg-slate-100 text-slate-800' },
      DEMANDE_EXAMEN: { label: 'Demande examen', color: 'bg-orange-100 text-orange-800' },
      LETTRE_LIAISON: { label: 'Lettre liaison', color: 'bg-teal-100 text-teal-800' },
      CERTIFICAT_MEDICAL: { label: 'Certificat', color: 'bg-rose-100 text-rose-800' }
    };
    
    const c = config[type] || config.REPORT;
    return <Badge className={c.color}>{c.label}</Badge>;
  };

  const getStatusBadge = (status) => {
    const config = {
      DRAFT: { icon: Clock, label: 'Brouillon', color: 'bg-slate-100 text-slate-800' },
      SIGNED: { icon: CheckCircle, label: 'Signé', color: 'bg-green-100 text-green-800' },
      SENT: { icon: Send, label: 'Envoyé', color: 'bg-blue-100 text-blue-800' },
      ACKNOWLEDGED: { icon: CheckCircle, label: 'Reçu', color: 'bg-green-100 text-green-800' },
      ARCHIVED: { icon: FileText, label: 'Archivé', color: 'bg-gray-100 text-gray-800' }
    };
    
    const c = config[status] || config.DRAFT;
    const Icon = c.icon;
    return (
      <Badge className={c.color}>
        <Icon className="w-3 h-3 mr-1" />
        {c.label}
      </Badge>
    );
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    const category = template.category || 'AUTRE';
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {});

  const categoryNames = {
    DEMANDE_EXAMEN: 'Demandes d\'examen',
    LETTRE_LIAISON: 'Lettres de liaison',
    CERTIFICAT_MEDICAL: 'Certificats médicaux',
    RAPPORT_CONSULTATION: 'Rapports',
    ATTESTATION: 'Attestations',
    ORDONNANCE: 'Ordonnances',
    AUTRE: 'Autre'
  };

  return (
    <div className="space-y-8">
      {/* Section fichiers uploadés */}
      <PatientDocumentsManager patient={patient} />

      {/* Séparateur */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Documents générés</h2>
        <Button onClick={() => setShowTemplateSelector(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau document
        </Button>
      </div>

      {/* Liste des documents */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500 flex items-center justify-center">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Chargement des documents...
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Aucun document</h3>
            <p className="text-slate-500 mb-4">
              Aucun document n'a encore été créé pour ce patient
            </p>
            <Button onClick={() => setShowTemplateSelector(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Créer le premier document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map(doc => (
            <div key={doc.id} className="space-y-3">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-slate-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-slate-900">{doc.title}</h4>
                          {getTypeBadge(doc.type)}
                          {getStatusBadge(doc.status)}
                        </div>
                        
                        {doc.subtype && (
                          <p className="text-sm text-slate-600 mb-2">{doc.subtype}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {doc.created_date && format(new Date(doc.created_date), 'dd MMM yyyy', { locale: fr })}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {doc.created_by}
                          </div>
                          {doc.sent_via && (
                            <div>
                              Envoi: {doc.sent_via}
                            </div>
                          )}
                        </div>

                        {doc.signature?.signed && (
                          <Alert className="mt-3 bg-green-50 border-green-200">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <AlertDescription className="text-xs text-green-800">
                              <strong>Document signé</strong>
                              {doc.signature.qes_compliant && ' • Signature qualifiée eIDAS'}
                              <br />
                              {doc.signature.timestamp && format(new Date(doc.signature.timestamp), 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* AI Analysis Summary */}
                        {doc.ai_analysis?.summary && (
                          <Alert className="mt-3 bg-purple-50 border-purple-200">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            <AlertDescription className="text-xs text-purple-900">
                              <strong>Résumé IA:</strong> {doc.ai_analysis.summary}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate({ ...doc, category: doc.type, content_html: doc.content_html });
                          setShowEditor(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Voir
                      </Button>
                      {doc.file_ref_pdf && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(doc.file_ref_pdf, '_blank')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      {!doc.ai_analysis && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setAnalyzingDocument(doc)}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Analyser IA
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Analysis Panel */}
              {analyzingDocument?.id === doc.id && (
                <AIDocumentAnalyzer
                  document={doc}
                  patient={patient}
                  onAnalysisComplete={() => {
                    setAnalyzingDocument(null);
                    refetch();
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sélecteur de template */}
      {showTemplateSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Choisir un template</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowTemplateSelector(false)}>
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
                  <div key={category}>
                    <h3 className="font-semibold text-slate-900 mb-3">
                      {categoryNames[category] || category}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {categoryTemplates.map(template => (
                        <button
                          key={template.id}
                          onClick={() => handleNewDocument(template)}
                          className="p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                        >
                          <div className="font-medium text-slate-900 mb-1">
                            {template.name}
                          </div>
                          {template.subcategory && (
                            <div className="text-xs text-slate-600">
                              {template.subcategory}
                            </div>
                          )}
                          <div className="text-xs text-slate-500 mt-2">
                            {template.usage_count || 0} utilisations
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Éditeur de document */}
      {showEditor && selectedTemplate && (
        <DocumentEditor
          template={selectedTemplate}
          patient={patient}
          onClose={() => {
            setShowEditor(false);
            setSelectedTemplate(null);
          }}
          onSaved={handleDocumentSaved}
        />
      )}
      </div>
    </div>
  );
}