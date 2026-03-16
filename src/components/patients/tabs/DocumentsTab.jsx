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
  Eye,
  ScanLine
} from 'lucide-react';
import { format } from 'date-fns';
import { fr, enUS, nl } from 'date-fns/locale';
import DocumentEditor from '../../documents/DocumentEditor';
import { useI18n } from '../../i18n/i18nContext';
import AIDocumentAnalyzer from '../../documents/AIDocumentAnalyzer';
import PatientDocumentsManager from '../../documents/PatientDocumentsManager';
import DocumentScanner from '../../documents/DocumentScanner';

export default function DocumentsTab({ patient }) {
  const { t, locale } = useI18n();
  const dateLocale = locale === 'nl' ? nl : locale === 'en' ? enUS : fr;
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [analyzingDocument, setAnalyzingDocument] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

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
      ATTESTATION: { label: t('docs.type.attestation'), color: 'bg-blue-100 text-blue-800' },
      LETTER: { label: t('docs.type.letter'), color: 'bg-purple-100 text-purple-800' },
      LAB_ORDER: { label: t('docs.type.labOrder'), color: 'bg-green-100 text-green-800' },
      IMAGING_ORDER: { label: t('docs.type.imagingOrder'), color: 'bg-yellow-100 text-yellow-800' },
      CERTIFICATE: { label: t('docs.type.certificate'), color: 'bg-pink-100 text-pink-800' },
      PRESCRIPTION: { label: t('docs.type.prescription'), color: 'bg-indigo-100 text-indigo-800' },
      REPORT: { label: t('docs.type.report'), color: 'bg-slate-100 text-slate-800' },
      DEMANDE_EXAMEN: { label: t('docs.type.examRequest'), color: 'bg-orange-100 text-orange-800' },
      LETTRE_LIAISON: { label: t('docs.type.liaisonLetter'), color: 'bg-teal-100 text-teal-800' },
      CERTIFICAT_MEDICAL: { label: t('docs.type.certificate'), color: 'bg-rose-100 text-rose-800' }
    };
    
    const c = config[type] || config.REPORT;
    return <Badge className={c.color}>{c.label}</Badge>;
  };

  const getStatusBadge = (status) => {
    const config = {
      DRAFT: { icon: Clock, label: t('docs.status.draft'), color: 'bg-slate-100 text-slate-800' },
      SIGNED: { icon: CheckCircle, label: t('docs.status.signed'), color: 'bg-green-100 text-green-800' },
      SENT: { icon: Send, label: t('docs.status.sent'), color: 'bg-blue-100 text-blue-800' },
      ACKNOWLEDGED: { icon: CheckCircle, label: t('docs.status.acknowledged'), color: 'bg-green-100 text-green-800' },
      ARCHIVED: { icon: FileText, label: t('docs.status.archived'), color: 'bg-gray-100 text-gray-800' }
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
    DEMANDE_EXAMEN: t('docs.cat.examRequests'),
    LETTRE_LIAISON: t('docs.cat.liaisonLetters'),
    CERTIFICAT_MEDICAL: t('docs.cat.certificates'),
    RAPPORT_CONSULTATION: t('docs.cat.reports'),
    ATTESTATION: t('docs.cat.attestations'),
    ORDONNANCE: t('docs.cat.prescriptions'),
    AUTRE: t('docs.cat.other')
  };

  return (
    <div className="space-y-8">
      {/* Actions rapides documents */}
      <div className="flex justify-end">
        <Button onClick={() => setShowScanner(true)} variant="outline" className="gap-2">
          <ScanLine className="w-4 h-4" />
          {t('docs.scanDocument')}
        </Button>
      </div>

      {/* Section fichiers uploadés */}
      <PatientDocumentsManager patient={patient} />

      {/* Séparateur */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">{t('docs.generatedDocs')}</h2>
        <Button onClick={() => setShowTemplateSelector(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          {t('docs.newDocument')}
        </Button>
      </div>

      {/* Liste des documents */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500 flex items-center justify-center">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {t('docs.loading')}
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">{t('docs.noDocuments')}</h3>
            <p className="text-slate-500 mb-4">
              {t('docs.noDocsCreated')}
            </p>
            <Button onClick={() => setShowTemplateSelector(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('docs.createFirst')}
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
                            {doc.created_date && format(new Date(doc.created_date), 'dd MMM yyyy', { locale: dateLocale })}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {doc.created_by}
                          </div>
                          {doc.sent_via && (
                            <div>
                              {t('docs.sending')}: {doc.sent_via}
                            </div>
                          )}
                        </div>

                        {doc.signature?.signed && (
                          <Alert className="mt-3 bg-green-50 border-green-200">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <AlertDescription className="text-xs text-green-800">
                              <strong>{t('docs.signedDocument')}</strong>
                              {doc.signature.qes_compliant && ` • ${t('docs.qualifiedSignature')}`}
                              <br />
                              {doc.signature.timestamp && format(new Date(doc.signature.timestamp), 'dd/MM/yyyy HH:mm', { locale: dateLocale })}
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* AI Analysis Summary */}
                        {doc.ai_analysis?.summary && (
                          <Alert className="mt-3 bg-purple-50 border-purple-200">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            <AlertDescription className="text-xs text-purple-900">
                              <strong>{t('docs.aiSummary')}:</strong> {doc.ai_analysis.summary}
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
                        {t('docs.view')}
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
                          {t('docs.analyzeAI')}
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
                <CardTitle>{t('docs.chooseTemplate')}</CardTitle>
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
                            {template.usage_count || 0} {t('docs.usages')}
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

      {/* Scanner de document */}
      {showScanner && (
        <DocumentScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          patient={patient}
          onSaved={refetch}
        />
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