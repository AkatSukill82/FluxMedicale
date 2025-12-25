import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Paperclip, 
  FileText, 
  Upload,
  Lock,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function MessageAttachments({ patient, onAttach }) {
  const [showDialog, setShowDialog] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Fetch existing secure documents for patient
  const { data: secureDocuments = [], isLoading } = useQuery({
    queryKey: ['secure-docs-for-attach', patient?.patient_id],
    queryFn: () => base44.entities.SecureDocument.filter(
      { patient_id: patient?.patient_id },
      '-created_date',
      50
    ),
    enabled: showDialog && !!patient?.patient_id
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le fichier ne doit pas dépasser 10 Mo');
      return;
    }

    setUploading(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      
      onAttach({
        file_name: file.name,
        file_uri: file_uri,
        file_size: file.size,
        mime_type: file.type
      });
      
      toast.success('Fichier attaché');
      setShowDialog(false);
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  const handleAttachExisting = (doc) => {
    onAttach({
      file_name: doc.file_name,
      file_uri: doc.file_uri,
      file_size: doc.file_size,
      mime_type: doc.mime_type,
      secure_document_id: doc.id
    });
    toast.success('Document attaché');
    setShowDialog(false);
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => setShowDialog(true)}
        title="Joindre un fichier"
      >
        <Paperclip className="w-4 h-4" />
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="w-5 h-5" />
              Joindre un document
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="upload">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="gap-2">
                <Upload className="w-4 h-4" />
                Nouveau fichier
              </TabsTrigger>
              <TabsTrigger value="existing" className="gap-2">
                <Lock className="w-4 h-4" />
                Documents existants
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4 mt-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  disabled={uploading}
                  className="hidden"
                  id="file-upload"
                />
                <label 
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  {uploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  ) : (
                    <Upload className="w-8 h-8 text-slate-400" />
                  )}
                  <span className="text-sm text-slate-600">
                    {uploading ? 'Téléchargement...' : 'Cliquez pour sélectionner un fichier'}
                  </span>
                  <span className="text-xs text-slate-400">
                    PDF, JPG, PNG, DOC (max 10 Mo)
                  </span>
                </label>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Le fichier sera chiffré et stocké de manière sécurisée
              </p>
            </TabsContent>

            <TabsContent value="existing" className="mt-4">
              <ScrollArea className="h-64">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : secureDocuments.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucun document sécurisé</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {secureDocuments.map(doc => (
                      <button
                        key={doc.id}
                        onClick={() => handleAttachExisting(doc)}
                        className="w-full p-3 border rounded-lg hover:bg-slate-50 flex items-start gap-3 text-left"
                      >
                        <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{doc.file_name}</p>
                          <p className="text-xs text-slate-500">
                            {doc.document_type} • {format(new Date(doc.created_date), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        <Lock className="w-4 h-4 text-green-600" />
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}