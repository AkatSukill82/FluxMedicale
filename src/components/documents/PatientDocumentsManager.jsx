import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Upload,
  Search,
  Grid3X3,
  List,
  Filter,
  MoreVertical,
  Download,
  Trash2,
  Eye,
  Calendar,
  Image,
  FileIcon,
  X,
  Loader2,
  FolderOpen,
  Stethoscope,
  Receipt,
  Mail,
  FileCheck,
  Radio
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const DOCUMENT_TYPES = {
  compte_rendu: { label: 'Compte-rendu', icon: FileText, color: 'bg-blue-100 text-blue-800' },
  radio: { label: 'Radio / Imagerie', icon: Radio, color: 'bg-purple-100 text-purple-800' },
  analyse: { label: 'Analyse / Labo', icon: Stethoscope, color: 'bg-green-100 text-green-800' },
  ordonnance: { label: 'Ordonnance', icon: FileCheck, color: 'bg-orange-100 text-orange-800' },
  facture: { label: 'Facture', icon: Receipt, color: 'bg-yellow-100 text-yellow-800' },
  courrier: { label: 'Courrier', icon: Mail, color: 'bg-cyan-100 text-cyan-800' },
  certificat: { label: 'Certificat', icon: FileCheck, color: 'bg-indigo-100 text-indigo-800' },
  autre: { label: 'Autre', icon: FileIcon, color: 'bg-slate-100 text-slate-800' }
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const isImageFile = (fileType) => fileType?.startsWith('image/');
const isPdfFile = (fileType) => fileType === 'application/pdf';

export default function PatientDocumentsManager({ patient, consultationId = null }) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['patientDocuments', patient.id, consultationId],
    queryFn: async () => {
      const filter = { patient_id: patient.id };
      if (consultationId) filter.consultation_id = consultationId;
      return base44.entities.PatientDocument.filter(filter, '-created_date', 100);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PatientDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientDocuments'] });
      toast.success('Document supprimé');
    }
  });

  // Filtrage des documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchQuery || 
      doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.file_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || doc.document_type === filterType;
    
    return matchesSearch && matchesType;
  });

  const handleDownload = (doc) => {
    window.open(doc.file_url, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Documents</h3>
          <Badge variant="outline">{documents.length}</Badge>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Ajouter un document
        </Button>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un document..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(DOCUMENT_TYPES).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Contenu */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            {searchQuery || filterType !== 'all' 
              ? 'Aucun document ne correspond aux critères' 
              : 'Aucun document pour ce patient'}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => setShowUploadModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Ajouter le premier document
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredDocuments.map(doc => (
            <DocumentGridCard
              key={doc.id}
              document={doc}
              onPreview={() => setPreviewDoc(doc)}
              onDownload={() => handleDownload(doc)}
              onDelete={() => deleteMutation.mutate(doc.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDocuments.map(doc => (
            <DocumentListItem
              key={doc.id}
              document={doc}
              onPreview={() => setPreviewDoc(doc)}
              onDownload={() => handleDownload(doc)}
              onDelete={() => deleteMutation.mutate(doc.id)}
            />
          ))}
        </div>
      )}

      {/* Modal d'upload */}
      <UploadDocumentModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        patientId={patient.id}
        consultationId={consultationId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['patientDocuments'] });
          setShowUploadModal(false);
        }}
      />

      {/* Modal de prévisualisation */}
      <DocumentPreviewModal
        document={previewDoc}
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
      />
    </div>
  );
}

function DocumentGridCard({ document, onPreview, onDownload, onDelete }) {
  const typeConfig = DOCUMENT_TYPES[document.document_type] || DOCUMENT_TYPES.autre;
  const TypeIcon = typeConfig.icon;

  return (
    <Card className="group hover:shadow-md transition-shadow cursor-pointer" onClick={onPreview}>
      <div className="aspect-square relative bg-slate-100 rounded-t-lg overflow-hidden">
        {isImageFile(document.file_type) ? (
          <img
            src={document.file_url}
            alt={document.title || document.file_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TypeIcon className="w-16 h-16 text-slate-400" />
          </div>
        )}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button size="icon" variant="secondary" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPreview(); }}>
                <Eye className="w-4 h-4 mr-2" /> Aperçu
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload(); }}>
                <Download className="w-4 h-4 mr-2" /> Télécharger
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600" 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <CardContent className="p-3">
        <Badge className={`${typeConfig.color} text-xs mb-2`}>
          {typeConfig.label}
        </Badge>
        <p className="font-medium text-sm truncate">
          {document.title || document.file_name}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {document.document_date 
            ? format(new Date(document.document_date), 'dd MMM yyyy', { locale: fr })
            : format(new Date(document.created_date), 'dd MMM yyyy', { locale: fr })
          }
        </p>
      </CardContent>
    </Card>
  );
}

function DocumentListItem({ document, onPreview, onDownload, onDelete }) {
  const typeConfig = DOCUMENT_TYPES[document.document_type] || DOCUMENT_TYPES.autre;
  const TypeIcon = typeConfig.icon;

  return (
    <div 
      className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
      onClick={onPreview}
    >
      <div className={`p-3 rounded-lg ${typeConfig.color}`}>
        <TypeIcon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{document.title || document.file_name}</p>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
          <Badge variant="outline" className="text-xs">{typeConfig.label}</Badge>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {document.document_date 
              ? format(new Date(document.document_date), 'dd/MM/yyyy')
              : format(new Date(document.created_date), 'dd/MM/yyyy')
            }
          </span>
          <span>{formatFileSize(document.file_size || 0)}</span>
        </div>
        {document.description && (
          <p className="text-xs text-muted-foreground mt-1 truncate">{document.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Button size="icon" variant="ghost" onClick={onDownload}>
          <Download className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" className="text-red-600 hover:bg-red-100" onClick={onDelete}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function UploadDocumentModal({ isOpen, onClose, patientId, consultationId, onSuccess }) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [formData, setFormData] = useState({
    document_type: 'autre',
    title: '',
    description: '',
    document_date: format(new Date(), 'yyyy-MM-dd')
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (!formData.title) {
        setFormData(prev => ({ ...prev, title: file.name.replace(/\.[^/.]+$/, '') }));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }

    setIsUploading(true);
    try {
      // Upload du fichier
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });

      // Créer le document
      const user = await base44.auth.me();
      await base44.entities.PatientDocument.create({
        patient_id: patientId,
        consultation_id: consultationId || undefined,
        file_url,
        file_name: selectedFile.name,
        file_type: selectedFile.type,
        file_size: selectedFile.size,
        document_type: formData.document_type,
        title: formData.title || selectedFile.name,
        description: formData.description,
        document_date: formData.document_date,
        medecin_email: user?.email
      });

      toast.success('Document ajouté');
      setSelectedFile(null);
      setFormData({
        document_type: 'autre',
        title: '',
        description: '',
        document_date: format(new Date(), 'yyyy-MM-dd')
      });
      onSuccess();
    } catch (error) {
      console.error('Erreur upload:', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Ajouter un document
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Zone de drop */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            {selectedFile ? (
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded">
                <div className="flex items-center gap-3">
                  {isImageFile(selectedFile.type) ? (
                    <Image className="w-8 h-8 text-blue-600" />
                  ) : (
                    <FileIcon className="w-8 h-8 text-slate-600" />
                  )}
                  <div className="text-left">
                    <p className="font-medium text-sm truncate max-w-[200px]">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setSelectedFile(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Cliquez pour sélectionner un fichier
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, images (max 10MB)
                </p>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={handleFileChange}
                />
              </label>
            )}
          </div>

          {/* Type de document */}
          <div className="space-y-2">
            <Label>Type de document</Label>
            <Select
              value={formData.document_type}
              onValueChange={(val) => setFormData({ ...formData, document_type: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DOCUMENT_TYPES).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Titre */}
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Titre du document"
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date du document</Label>
            <Input
              type="date"
              value={formData.document_date}
              onChange={(e) => setFormData({ ...formData, document_date: e.target.value })}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description (optionnelle)</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description ou notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
            {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DocumentPreviewModal({ document, isOpen, onClose }) {
  if (!document) return null;

  const typeConfig = DOCUMENT_TYPES[document.document_type] || DOCUMENT_TYPES.autre;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
            {document.title || document.file_name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {isImageFile(document.file_type) ? (
            <img
              src={document.file_url}
              alt={document.title}
              className="max-w-full mx-auto rounded-lg"
            />
          ) : isPdfFile(document.file_type) ? (
            <iframe
              src={document.file_url}
              className="w-full h-[600px] rounded-lg border"
              title={document.title}
            />
          ) : (
            <div className="text-center py-12">
              <FileIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">Aperçu non disponible pour ce type de fichier</p>
              <Button onClick={() => window.open(document.file_url, '_blank')}>
                <Download className="w-4 h-4 mr-2" />
                Télécharger le fichier
              </Button>
            </div>
          )}
        </div>

        {document.description && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">{document.description}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button onClick={() => window.open(document.file_url, '_blank')}>
            <Download className="w-4 h-4 mr-2" />
            Télécharger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}