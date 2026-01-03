import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Camera,
  Upload,
  Image as ImageIcon,
  X,
  Loader2,
  ZoomIn,
  Trash2,
  FileText,
  Wand2
} from 'lucide-react';
import { toast } from 'sonner';

export default function ImageAttachments({ images = [], onChange, patientId }) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    const newImages = [];

    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} n'est pas une image`);
          continue;
        }

        // Limiter la taille (10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} est trop volumineux (max 10MB)`);
          continue;
        }

        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        newImages.push({
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          url: file_url,
          name: file.name,
          type: file.type,
          size: file.size,
          uploaded_at: new Date().toISOString(),
          description: '',
          body_location: ''
        });
      }

      if (newImages.length > 0) {
        onChange([...images, ...newImages]);
        toast.success(`${newImages.length} image(s) ajoutée(s)`);
      }
    } catch (error) {
      console.error('Erreur upload:', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (imageId) => {
    onChange(images.filter(img => img.id !== imageId));
    if (previewImage?.id === imageId) {
      setPreviewImage(null);
    }
  };

  const handleUpdateImage = (imageId, updates) => {
    onChange(images.map(img => 
      img.id === imageId ? { ...img, ...updates } : img
    ));
  };

  const analyzeImage = async (image) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse cette image médicale de manière professionnelle:
        1. Décris ce que tu observes (couleur, forme, taille estimée, texture)
        2. Localisation probable sur le corps si visible
        3. Caractéristiques cliniques pertinentes
        4. Suggestions d'orientation diagnostique (sans diagnostic formel)
        
        Sois concis et factuel. C'est une aide pour le médecin, pas un diagnostic.`,
        file_urls: [image.url],
        response_json_schema: {
          type: 'object',
          properties: {
            description: { type: 'string', description: 'Description objective' },
            location: { type: 'string', description: 'Localisation anatomique' },
            clinical_features: { type: 'array', items: { type: 'string' } },
            differential_suggestions: { type: 'array', items: { type: 'string' } },
            recommendations: { type: 'string' }
          }
        }
      });

      setAnalysisResult(result);
      
      // Mettre à jour l'image avec la description IA
      if (result.description) {
        handleUpdateImage(image.id, {
          ai_analysis: result,
          description: result.description
        });
      }
    } catch (error) {
      console.error('Erreur analyse:', error);
      toast.error('Erreur lors de l\'analyse IA');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Zone d'upload */}
      <Card className="border-dashed border-2 hover:border-blue-300 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-4">
            {/* Upload fichier */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Importer
            </Button>

            {/* Capture caméra */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <Button
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isUploading}
              className="gap-2"
            >
              <Camera className="w-4 h-4" />
              Photo
            </Button>

            {isUploading && (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Upload...
              </Badge>
            )}
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Glissez des images ou utilisez les boutons (dermatologie, plaies, etc.)
          </p>
        </CardContent>
      </Card>

      {/* Grille d'images */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {images.map(image => (
            <Card key={image.id} className="overflow-hidden group relative">
              <div 
                className="aspect-square bg-slate-100 cursor-pointer relative"
                onClick={() => setPreviewImage(image)}
              >
                <img
                  src={image.url}
                  alt={image.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {image.ai_analysis && (
                  <Badge className="absolute top-2 left-2 bg-purple-600">
                    <Wand2 className="w-3 h-3 mr-1" />
                    IA
                  </Badge>
                )}
              </div>
              <CardContent className="p-2">
                <Input
                  placeholder="Description..."
                  value={image.description || ''}
                  onChange={(e) => handleUpdateImage(image.id, { description: e.target.value })}
                  className="text-xs h-7"
                />
              </CardContent>
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveImage(image.id);
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de prévisualisation */}
      {previewImage && (
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                {previewImage.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <img
                  src={previewImage.url}
                  alt={previewImage.name}
                  className="w-full max-h-[50vh] object-contain"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={previewImage.description || ''}
                    onChange={(e) => handleUpdateImage(previewImage.id, { description: e.target.value })}
                    placeholder="Décrivez la lésion, plaie, etc."
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Localisation</Label>
                  <Input
                    value={previewImage.body_location || ''}
                    onChange={(e) => handleUpdateImage(previewImage.id, { body_location: e.target.value })}
                    placeholder="Ex: Avant-bras droit, face dorsale"
                  />
                </div>
              </div>

              {/* Analyse IA */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => analyzeImage(previewImage)}
                  disabled={isAnalyzing}
                  variant="outline"
                  className="gap-2"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  Analyse IA
                </Button>
                <p className="text-xs text-muted-foreground">
                  Obtenir une description assistée par IA
                </p>
              </div>

              {analysisResult && (
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-sm font-medium text-purple-900">Analyse IA</p>
                    <p className="text-sm">{analysisResult.description}</p>
                    {analysisResult.location && (
                      <p className="text-sm">
                        <strong>Localisation:</strong> {analysisResult.location}
                      </p>
                    )}
                    {analysisResult.clinical_features?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium">Caractéristiques:</p>
                        <ul className="text-sm list-disc ml-4">
                          {analysisResult.clinical_features.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysisResult.differential_suggestions?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium">Pistes diagnostiques:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {analysisResult.differential_suggestions.map((s, i) => (
                            <Badge key={i} variant="outline">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-purple-700 italic mt-2">
                      ⚠️ Aide au diagnostic uniquement. Validation clinique requise.
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between">
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleRemoveImage(previewImage.id);
                    setPreviewImage(null);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>
                <Button onClick={() => setPreviewImage(null)}>
                  Fermer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}