import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Upload, Download, Eye, FileText, Trash2, Lock, File, Filter, Search } from 'lucide-react';
import { format } from 'date-fns';
import { fr, enUS, nl } from 'date-fns/locale';
import { toast } from 'sonner';
import { useI18n } from '../i18n/i18nContext';

export default function SecureDocuments({ patient }) {
  const { t, locale } = useI18n();
  const dateLocale = locale === 'nl' ? nl : locale === 'en' ? enUS : fr;
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [filterType, setFilterType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadData, setUploadData] = useState({
    document_type: 'MEDICAL_REPORT',
    document_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    tags: []
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['secure_documents', patient.id],
    queryFn: () => base44.entities.SecureDocument.filter({ patient_id: patient.id }, '-created_date', 200)
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      
      // Upload file to private storage
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file: selectedFile });
      
      // Create secure document record
      return await base44.entities.SecureDocument.create({
        patient_id: patient.id,
        file_name: selectedFile.name,
        file_uri: file_uri,
        file_size: selectedFile.size,
        mime_type: selectedFile.type,
        document_type: uploadData.document_type,
        document_date: uploadData.document_date,
        notes: uploadData.notes,
        tags: uploadData.tags.filter(t => t.trim()),
        uploaded_by: user.email,
        is_sensitive: true,
        access_count: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secure_documents'] });
      toast.success('Document téléchargé avec succès');
      setSelectedFile(null);
      setShowUploadDialog(false);
      setUploadData({
        document_type: 'MEDICAL_REPORT',
        document_date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
        tags: []
      });
    },
    onError: (error) => {
      toast.error('Erreur lors du téléchargement: ' + error.message);
    },
    onSettled: () => {
      setUploading(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SecureDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secure_documents'] });
      toast.success('Document supprimé');
    }
  });

  const downloadMutation = useMutation({
    mutationFn: async (doc) => {
      // Create signed URL for download
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: doc.file_uri,
        expires_in: 300 // 5 minutes
      });

      // Update access stats
      await base44.entities.SecureDocument.update(doc.id, {
        last_accessed_at: new Date().toISOString(),
        access_count: (doc.access_count || 0) + 1
      });

      return signed_url;
    },
    onSuccess: (url) => {
      window.open(url, '_blank');
      queryClient.invalidateQueries({ queryKey: ['secure_documents'] });
    },
    onError: () => {
      toast.error('Erreur lors du téléchargement du fichier');
    }
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Le fichier ne doit pas dépasser 10 Mo');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    uploadMutation.mutate();
  };

  const typeLabels = {
    MEDICAL_REPORT: { label: t('secure.medicalReport'), icon: FileText, color: 'text-blue-600' },
    LAB_RESULT: { label: t('secure.labResult'), icon: FileText, color: 'text-purple-600' },
    IMAGING: { label: t('secure.imaging'), icon: FileText, color: 'text-cyan-600' },
    CONSENT_FORM: { label: t('secure.consentForm'), icon: File, color: 'text-green-600' },
    INSURANCE: { label: t('secure.insuranceDoc'), icon: FileText, color: 'text-orange-600' },
    PRESCRIPTION: { label: t('secure.prescription'), icon: FileText, color: 'text-pink-600' },
    IDENTITY: { label: t('secure.identity'), icon: File, color: 'text-slate-600' },
    OTHER: { label: t('secure.other'), icon: File, color: 'text-slate-500' }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesType = filterType === 'ALL' || doc.document_type === filterType;
    const matchesSearch = !searchTerm || 
      doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const documentsByType = filteredDocuments.reduce((acc, doc) => {
    const type = doc.document_type || 'OTHER';
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Lock className="w-5 h-5" />
          {t('secure.title')} ({documents.length})
        </h3>
        <Button onClick={() => setShowUploadDialog(true)} size="sm">
          <Upload className="w-4 h-4 mr-2" />
          {t('secure.upload')}
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('secure.searchPlaceholder')}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('secure.allTypes')}</SelectItem>
                <SelectItem value="MEDICAL_REPORT">{t('secure.medicalReport')}</SelectItem>
                <SelectItem value="LAB_RESULT">{t('secure.labResult')}</SelectItem>
                <SelectItem value="IMAGING">{t('secure.imaging')}</SelectItem>
                <SelectItem value="CONSENT_FORM">{t('secure.consentForm')}</SelectItem>
                <SelectItem value="INSURANCE">{t('secure.insuranceDoc')}</SelectItem>
                <SelectItem value="PRESCRIPTION">{t('secure.prescription')}</SelectItem>
                <SelectItem value="IDENTITY">{t('secure.identity')}</SelectItem>
                <SelectItem value="OTHER">{t('secure.other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des documents */}
      <div className="space-y-4">
        {Object.entries(documentsByType).map(([type, docs]) => {
          const typeInfo = typeLabels[type] || typeLabels.OTHER;
          const Icon = typeInfo.icon;
          
          return (
            <div key={type}>
              <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Icon className={`w-4 h-4 ${typeInfo.color}`} />
                {typeInfo.label} ({docs.length})
              </h4>
              <div className="space-y-2">
                {docs.map(doc => {
                  const docDate = doc.document_date ? new Date(doc.document_date) : null;
                  const uploadDate = new Date(doc.created_date);
                  
                  return (
                    <Card key={doc.id} className="hover:border-blue-300 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Lock className="w-3 h-3 text-green-600" />
                              <p className="font-medium text-sm">{doc.file_name}</p>
                            </div>
                            {doc.notes && (
                              <p className="text-xs text-muted-foreground mt-1">{doc.notes}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {doc.uploaded_by?.split('@')[0]}
                              </Badge>
                              {docDate && !isNaN(docDate.getTime()) && (
                                <span className="text-xs text-slate-600">
                                  📅 {format(docDate, 'dd/MM/yyyy')}
                                </span>
                              )}
                              <span className="text-xs text-slate-500">
                                {t('secure.uploaded')}: {format(uploadDate, 'dd MMM yyyy', { locale: dateLocale })}
                              </span>
                              {doc.file_size && (
                                <span className="text-xs text-slate-500">
                                  {(doc.file_size / 1024).toFixed(0)} Ko
                                </span>
                              )}
                              {doc.access_count > 0 && (
                                <span className="text-xs text-slate-500">
                                  👁️ {doc.access_count}
                                </span>
                              )}
                            </div>
                            {doc.tags?.length > 0 && (
                              <div className="flex gap-1 mt-2">
                                {doc.tags.map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => downloadMutation.mutate(doc)}
                              disabled={downloadMutation.isPending}
                              title="Télécharger"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(doc.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {filteredDocuments.length === 0 && documents.length > 0 && (
        <div className="text-center py-8 text-slate-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t('secure.noMatchFilter')}</p>
        </div>
      )}

      {documents.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{t('secure.noDocuments')}</p>
        </div>
      )}

      {/* Dialog d'upload */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('secure.uploadTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('secure.docType')} *</Label>
              <Select 
                value={uploadData.document_type} 
                onValueChange={(v) => setUploadData({...uploadData, document_type: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEDICAL_REPORT">{t('secure.medicalReport')}</SelectItem>
                  <SelectItem value="LAB_RESULT">{t('secure.labResults')}</SelectItem>
                  <SelectItem value="IMAGING">{t('secure.imaging')}</SelectItem>
                  <SelectItem value="CONSENT_FORM">{t('secure.consentFormFull')}</SelectItem>
                  <SelectItem value="INSURANCE">{t('secure.insuranceDocument')}</SelectItem>
                  <SelectItem value="PRESCRIPTION">{t('secure.prescription')}</SelectItem>
                  <SelectItem value="IDENTITY">{t('secure.identityDoc')}</SelectItem>
                  <SelectItem value="OTHER">{t('secure.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('secure.docDate')}</Label>
              <Input
                type="date"
                value={uploadData.document_date}
                onChange={(e) => setUploadData({...uploadData, document_date: e.target.value})}
              />
            </div>

            <div>
              <Label>{t('secure.file')} * ({t('secure.fileFormats')})</Label>
              <Input
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                disabled={uploading}
              />
              {selectedFile && (
                <div className="mt-2 p-3 bg-slate-50 rounded border">
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} Mo
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label>{t('secure.notes')}</Label>
              <Textarea
                value={uploadData.notes}
                onChange={(e) => setUploadData({...uploadData, notes: e.target.value})}
                placeholder={t('secure.notesPlaceholder')}
                rows={3}
              />
            </div>

            <div>
              <Label>{t('secure.tags')}</Label>
              <Input
                placeholder={t('secure.tagsPlaceholder')}
                onChange={(e) => setUploadData({...uploadData, tags: e.target.value.split(',').map(t => t.trim())})}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowUploadDialog(false);
                  setSelectedFile(null);
                }}
              >
                {t('actions.cancel')}
              </Button>
              <Button 
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? t('secure.uploading') : t('secure.upload')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}