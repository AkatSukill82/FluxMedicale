import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Upload, 
  Save, 
  Loader2,
  Image,
  Palette,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

export default function PrescriptionTemplateSettings({ onClose }) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: template, isLoading } = useQuery({
    queryKey: ['prescriptionTemplate', currentUser?.email],
    queryFn: async () => {
      const templates = await base44.entities.PrescriptionTemplate.filter({
        medecin_email: currentUser.email
      });
      return templates[0] || {
        medecin_email: currentUser.email,
        cabinet_name: `Dr. ${currentUser.full_name}`,
        primary_color: '#1e40af',
        show_qr_code: true
      };
    },
    enabled: !!currentUser?.email
  });

  const [formData, setFormData] = useState({});

  React.useEffect(() => {
    if (template) {
      setFormData(template);
    }
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (template?.id) {
        await base44.entities.PrescriptionTemplate.update(template.id, data);
      } else {
        await base44.entities.PrescriptionTemplate.create({
          ...data,
          medecin_email: currentUser.email
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptionTemplate'] });
      toast.success('Template sauvegardé');
      onClose?.();
    },
    onError: () => {
      toast.error('Erreur lors de la sauvegarde');
    }
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, logo_url: file_url });
      toast.success('Logo uploadé');
    } catch (error) {
      toast.error('Erreur upload');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSignatureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, signature_url: file_url });
      toast.success('Signature uploadée');
    } catch (error) {
      toast.error('Erreur upload');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Personnaliser le template de prescription
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Informations Cabinet */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Informations du cabinet
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom du cabinet</Label>
              <Input
                value={formData.cabinet_name || ''}
                onChange={(e) => setFormData({ ...formData, cabinet_name: e.target.value })}
                placeholder="Dr. Jean Dupont"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Numéro INAMI</Label>
              <Input
                value={formData.inami_number || ''}
                onChange={(e) => setFormData({ ...formData, inami_number: e.target.value })}
                placeholder="1-12345-12-123"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Adresse</Label>
            <Input
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Rue de la Santé, 1000 Bruxelles"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+32 2 123 45 67"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@cabinet.be"
              />
            </div>
          </div>
        </div>

        {/* Logo et Signature */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Image className="w-4 h-4" />
            Logo et signature
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Logo du cabinet</Label>
              <div className="flex items-center gap-2">
                {formData.logo_url && (
                  <img src={formData.logo_url} alt="Logo" className="w-16 h-16 object-contain border rounded" />
                )}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={isUploading}
                  />
                  <Button variant="outline" size="sm" asChild disabled={isUploading}>
                    <span>
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                      {formData.logo_url ? 'Changer' : 'Uploader'}
                    </span>
                  </Button>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Signature numérisée</Label>
              <div className="flex items-center gap-2">
                {formData.signature_url && (
                  <img src={formData.signature_url} alt="Signature" className="w-24 h-12 object-contain border rounded" />
                )}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleSignatureUpload}
                    disabled={isUploading}
                  />
                  <Button variant="outline" size="sm" asChild disabled={isUploading}>
                    <span>
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                      {formData.signature_url ? 'Changer' : 'Uploader'}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Personnalisation visuelle */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Personnalisation visuelle
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Couleur principale</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.primary_color || '#1e40af'}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <Input
                  value={formData.primary_color || '#1e40af'}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-28"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Afficher QR code Recip-e</Label>
              <div className="pt-2">
                <Switch
                  checked={formData.show_qr_code !== false}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_qr_code: checked })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Textes personnalisés */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Texte d'en-tête (optionnel)</Label>
            <Textarea
              value={formData.header_text || ''}
              onChange={(e) => setFormData({ ...formData, header_text: e.target.value })}
              placeholder="Texte affiché sous le nom du cabinet..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Texte de pied de page</Label>
            <Textarea
              value={formData.footer_text || ''}
              onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
              placeholder="Ex: Consultations sur rendez-vous uniquement"
              rows={2}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            onClick={() => saveMutation.mutate(formData)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Sauvegarder
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}