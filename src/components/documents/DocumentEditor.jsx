import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Eye,
  Send,
  Save,
  Download,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  Printer
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import 'react-quill/dist/quill.snow.css';

export default function DocumentEditor({ 
  template, 
  patient, 
  onClose, 
  onSaved 
}) {
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({});
  const [htmlContent, setHtmlContent] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [activeTab, setActiveTab] = useState('form');
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setSending] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [savedDocument, setSavedDocument] = useState(null);
  const [errors, setErrors] = useState({});
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');

  useEffect(() => {
    loadUser();
    initializeContent();
  }, [template, patient]);

  useEffect(() => {
    updatePreview();
  }, [formData, htmlContent]);

  const loadUser = async () => {
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
    }
  };

  const initializeContent = () => {
    setHtmlContent(template.content_html || '');
    
    const initialData = {};
    
    // Si le template contient des variables_snapshot (document existant)
    if (template.variables_snapshot) {
      Object.assign(initialData, template.variables_snapshot);
    } else {
      // Sinon, initialiser avec des valeurs vides
      template.variables?.forEach(variable => {
        initialData[variable.name] = '';
      });
    }
    
    setFormData(initialData);
    
    // Si c'est un document existant, le marquer comme sauvegardé
    if (template.id) {
      setSavedDocument(template);
    }
  };

  const updatePreview = () => {
    let html = htmlContent;

    html = html.replace(/{{current_date}}/g, new Date().toLocaleDateString('fr-BE'));
    
    if (patient) {
      const officialName = patient.name?.find(n => n.use === 'official') || {};
      const prenom = (officialName.given || []).join(' ');
      const nom = officialName.family || '';
      const niss = patient.identifier?.find(id => 
        id.system === 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin'
      )?.value || '';
      const birthDate = patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('fr-BE') : '';
      const address = patient.address?.[0];
      const addressLine = address ? `${(address.line || []).join(' ')}, ${address.postalCode} ${address.city}` : '';
      const phone = patient.telecom?.find(t => t.system === 'phone')?.value || '';

      html = html.replace(/{{patient\.nom}}/g, nom);
      html = html.replace(/{{patient\.prenom}}/g, prenom);
      html = html.replace(/{{patient\.niss}}/g, niss);
      html = html.replace(/{{patient\.date_naissance}}/g, birthDate);
      html = html.replace(/{{patient\.adresse}}/g, addressLine);
      html = html.replace(/{{patient\.telephone}}/g, phone);
      html = html.replace(/{{patient\.civilite}}/g, patient.gender === 'male' ? 'M.' : patient.gender === 'female' ? 'Mme' : '');
    }

    if (currentUser) {
      html = html.replace(/{{medecin\.nom}}/g, currentUser.full_name || '');
      html = html.replace(/{{medecin\.inami}}/g, currentUser.numero_inami || '');
      html = html.replace(/{{medecin\.specialite}}/g, currentUser.specialite || '');
      html = html.replace(/{{medecin\.adresse}}/g, currentUser.adresse_cabinet || '');
      html = html.replace(/{{medecin\.telephone}}/g, currentUser.telephone_cabinet || '');
      html = html.replace(/{{medecin\.email}}/g, currentUser.email || '');
      html = html.replace(/{{medecin\.ville}}/g, extractCity(currentUser.adresse_cabinet));
    }

    Object.keys(formData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, formData[key] || '');
    });

    setPreviewHtml(html);
  };

  const extractCity = (address) => {
    if (!address) return '';
    const parts = address.split(',');
    if (parts.length > 1) {
      const cityPart = parts[parts.length - 1].trim();
      return cityPart.split(' ').slice(1).join(' ');
    }
    return '';
  };

  const validateForm = () => {
    const newErrors = {};
    
    template.variables?.forEach(variable => {
      if (variable.required && !formData[variable.name]?.trim()) {
        newErrors[variable.name] = `${variable.label} est requis`;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    setIsSaving(true);

    try {
      const documentData = {
        patient_id: patient.id,
        type: template.category,
        subtype: template.subcategory || template.name,
        title: template.name,
        status: 'DRAFT',
        content_html: previewHtml,
        template_used: template.name,
        variables_snapshot: formData,
        created_by: currentUser.email
      };

      const doc = await base44.entities.Document.create(documentData);
      setSavedDocument(doc);
      toast.success('Document enregistré en brouillon');
      
      if (onSaved) {
        onSaved(doc);
      }
    } catch (error) {
      console.error('Erreur sauvegarde document:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!savedDocument) {
      await handleSave();
      return;
    }

    setIsGeneratingPDF(true);

    try {
      // Simulation génération PDF (en production, utiliser une vraie API)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const pdfUrl = `https://example.com/pdfs/${savedDocument.id}.pdf`;
      
      await base44.entities.Document.update(savedDocument.id, {
        file_ref_pdf: pdfUrl
      });

      toast.success('PDF généré avec succès');
      
      // Télécharger automatiquement
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${template.name}_${patient.name?.[0]?.family || 'patient'}.pdf`;
      link.click();
      
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSendEmail = async () => {
    if (!savedDocument) {
      await handleSave();
      return;
    }

    if (!recipientEmail) {
      toast.error('Veuillez saisir un email destinataire');
      return;
    }

    setSending(true);

    try {
      await base44.integrations.Core.SendEmail({
        to: recipientEmail,
        subject: `Document médical - ${template.name}`,
        body: `
          <h2>${template.name}</h2>
          <p>Bonjour${recipientName ? ' ' + recipientName : ''},</p>
          <p>Veuillez trouver ci-joint le document médical pour le patient ${patient.name?.[0]?.family || ''}.</p>
          <hr/>
          ${previewHtml}
          <hr/>
          <p>Cordialement,<br/>
          Dr. ${currentUser.full_name}<br/>
          ${currentUser.numero_inami}</p>
        `
      });

      await base44.entities.Document.update(savedDocument.id, {
        status: 'SENT',
        sent_via: 'EMAIL',
        sent_at: new Date().toISOString(),
        recipient: {
          email: recipientEmail,
          name: recipientName
        }
      });

      toast.success('Document envoyé par email');
      
      if (onSaved) {
        onSaved();
      }
    } catch (error) {
      console.error('Erreur envoi email:', error);
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${template.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${previewHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl h-[90vh] flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{template.name}</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Patient: {patient.name?.[0]?.given?.join(' ')} {patient.name?.[0]?.family}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b px-6">
            <TabsList>
              <TabsTrigger value="form">
                <FileText className="w-4 h-4 mr-2" />
                Formulaire
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="w-4 h-4 mr-2" />
                Prévisualisation
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="form" className="p-6 m-0">
              <div className="max-w-4xl mx-auto space-y-6">
                {template.variables?.map((variable, index) => (
                  <div key={index}>
                    <Label className="text-base">
                      {variable.label}
                      {variable.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    
                    {variable.type === 'text' && (
                      <Input
                        value={formData[variable.name] || ''}
                        onChange={(e) => setFormData({...formData, [variable.name]: e.target.value})}
                        placeholder={variable.placeholder}
                        className="mt-2"
                      />
                    )}
                    
                    {variable.type === 'textarea' && (
                      <Textarea
                        value={formData[variable.name] || ''}
                        onChange={(e) => setFormData({...formData, [variable.name]: e.target.value})}
                        placeholder={variable.placeholder}
                        className="mt-2 min-h-[120px]"
                      />
                    )}
                    
                    {variable.type === 'select' && (
                      <Select
                        value={formData[variable.name] || ''}
                        onValueChange={(value) => setFormData({...formData, [variable.name]: value})}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          {variable.options?.map((option, i) => (
                            <SelectItem key={i} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    
                    {variable.type === 'date' && (
                      <Input
                        type="date"
                        value={formData[variable.name] || ''}
                        onChange={(e) => setFormData({...formData, [variable.name]: e.target.value})}
                        className="mt-2"
                      />
                    )}
                    
                    {errors[variable.name] && (
                      <p className="text-sm text-red-500 mt-1">{errors[variable.name]}</p>
                    )}
                  </div>
                ))}

                {template.variables?.length === 0 && (
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      Ce template ne contient pas de variables personnalisables.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            <TabsContent value="preview" className="p-6 m-0">
              <div className="max-w-4xl mx-auto">
                <div 
                  className="bg-white border-2 border-slate-200 rounded-lg p-8 shadow-sm"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="border-t p-6 bg-slate-50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {savedDocument && (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Enregistré
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enregistrement...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" />Enregistrer</>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handlePrint}
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimer
              </Button>

              <Button
                variant="outline"
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Génération...</>
                ) : (
                  <><Download className="w-4 h-4 mr-2" />PDF</>
                )}
              </Button>

              <div className="flex items-center gap-2 border-l pl-2">
                <Input
                  placeholder="Email destinataire"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  type="email"
                  className="w-64"
                />
                <Button
                  onClick={handleSendEmail}
                  disabled={isSending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Envoi...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" />Envoyer</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}