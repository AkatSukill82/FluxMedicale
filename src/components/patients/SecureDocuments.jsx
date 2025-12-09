import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Upload, Download, Eye, FileText, Trash2, Lock, File } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export default function SecureDocuments({ patient }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('LAB_RESULT');

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', patient.id],
    queryFn: () => base44.entities.Document.filter({ patient_id: patient.id }, '-created_date', 100)
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const user = await base44.auth.me();
      
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Create document record
      return await base44.entities.Document.create({
        patient_id: patient.id,
        type: documentType,
        title: file.name,
        file_ref_pdf: file_url,
        status: 'SIGNED',
        created_by: user.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document téléchargé avec succès');
      setSelectedFile(null);
      setUploading(false);
    },
    onError: () => {
      toast.error('Erreur lors du téléchargement');
      setUploading(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document supprimé');
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
    uploadMutation.mutate(selectedFile);
  };

  const typeLabels = {
    LAB_RESULT: { label: 'Résultats labo', icon: FileText, color: 'text-purple-600' },
    IMAGING_RESULT: { label: 'Imagerie', icon: FileText, color: 'text-blue-600' },
    REPORT: { label: 'Rapport', icon: File, color: 'text-slate-600' },
    CERTIFICATE: { label: 'Certificat', icon: FileText, color: 'text-green-600' },
    OTHER: { label: 'Autre', icon: File, color: 'text-slate-500' }
  };

  const documentsByType = documents.reduce((acc, doc) => {
    const type = doc.type || 'OTHER';
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Documents sécurisés
        </h3>
      </div>

      {/* Zone d'upload */}
      <Card className="border-dashed border-2 bg-slate-50">
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Type de document</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LAB_RESULT">Résultats de laboratoire</SelectItem>
                <SelectItem value="IMAGING_RESULT">Résultats d'imagerie</SelectItem>
                <SelectItem value="REPORT">Rapport médical</SelectItem>
                <SelectItem value="CERTIFICATE">Certificat</SelectItem>
                <SelectItem value="OTHER">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Fichier (PDF, JPG, PNG - Max 10 Mo)</Label>
            <Input
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png"
              disabled={uploading}
            />
          </div>

          {selectedFile && (
            <div className="p-3 bg-white rounded border">
              <p className="text-sm font-medium">{selectedFile.name}</p>
              <p className="text-xs text-slate-500">
                {(selectedFile.size / 1024).toFixed(0)} Ko
              </p>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Téléchargement...' : 'Télécharger le document'}
          </Button>
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
                  const createdDate = new Date(doc.created_date);
                  return (
                    <Card key={doc.id} className="hover:border-blue-300 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{doc.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {doc.created_by?.split('@')[0]}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {!isNaN(createdDate.getTime()) && format(createdDate, 'dd MMM yyyy', { locale: fr })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.file_ref_pdf && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(doc.file_ref_pdf, '_blank')}
                                title="Télécharger"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
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

      {documents.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun document téléchargé</p>
        </div>
      )}
    </div>
  );
}