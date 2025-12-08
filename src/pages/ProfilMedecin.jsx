
import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { AuditLog } from '@/entities/AuditLog';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  User as UserIcon,
  MapPin,
  CreditCard,
  Shield,
  Bell,
  Save,
  X,
  RefreshCw,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';
import ReAuthDialog from '../components/auth/ReAuthDialog';
import { validateIBAN, validateEmail, validatePhone } from '../components/utils/validators';

export default function ProfilMedecinPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showReAuth, setShowReAuth] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (formData && originalData) {
      const changed = JSON.stringify(formData) !== JSON.stringify(originalData);
      setHasChanges(changed);
    }
  }, [formData, originalData]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);

      const profileData = {
        // Identité (immutable pour médecin)
        full_name: user.full_name || '',
        numero_inami: user.numero_inami || '',
        specialite: user.specialite || '',
        
        // Coordonnées (éditables)
        adresse_cabinet: user.adresse_cabinet || '',
        telephone_cabinet: user.telephone_cabinet || '',
        email: user.email || '',
        site_web: user.site_web || '',
        
        // Facturation (éditables)
        iban: user.iban || '',
        bic: user.bic || '',
        mode_facturation_defaut: user.mode_facturation_defaut || 'EATTEST',
        texte_facture: user.texte_facture || '',
        logo_url: user.logo_url || '',
        
        // Notifications (éditables)
        notif_mycarenet: user.notif_mycarenet !== false,
        notif_oa_alerts: user.notif_oa_alerts !== false,
        notif_appointments: user.notif_appointments !== false
      };

      setFormData(profileData);
      setOriginalData(JSON.parse(JSON.stringify(profileData)));
    } catch (error) {
      console.error('Erreur chargement profil:', error);
      toast.error('Erreur lors du chargement du profil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validation en temps réel
    if (field === 'iban' && value) {
      const valid = validateIBAN(value);
      setErrors(prev => ({
        ...prev,
        iban: valid ? null : 'IBAN invalide'
      }));
    }
    
    if (field === 'email' && value) {
      const valid = validateEmail(value);
      setErrors(prev => ({
        ...prev,
        email: valid ? null : 'Email invalide'
      }));
    }
    
    if (field === 'telephone_cabinet' && value) {
      const valid = validatePhone(value);
      setErrors(prev => ({
        ...prev,
        telephone_cabinet: valid ? null : 'Téléphone invalide'
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Adresse obligatoire
    if (!formData.adresse_cabinet?.trim()) {
      newErrors.adresse_cabinet = 'Adresse du cabinet obligatoire';
    }

    // Téléphone obligatoire
    if (!formData.telephone_cabinet?.trim()) {
      newErrors.telephone_cabinet = 'Téléphone obligatoire';
    } else if (!validatePhone(formData.telephone_cabinet)) {
      newErrors.telephone_cabinet = 'Format téléphone invalide';
    }

    // Email valide
    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Format email invalide';
    }

    // IBAN si fourni
    if (formData.iban && !validateIBAN(formData.iban)) {
      newErrors.iban = 'IBAN invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs');
      return;
    }

    // Déclencher re-authentification
    setShowReAuth(true);
  };

  const handleReAuthSuccess = async () => {
    setShowReAuth(false);
    setIsSaving(true);

    try {
      // Préparer données à sauvegarder (whitelist selon rôle)
      const dataToSave = {
        // Coordonnées
        adresse_cabinet: formData.adresse_cabinet,
        telephone_cabinet: formData.telephone_cabinet,
        site_web: formData.site_web,
        
        // Facturation
        iban: formData.iban,
        bic: formData.bic,
        mode_facturation_defaut: formData.mode_facturation_defaut,
        texte_facture: formData.texte_facture,
        logo_url: formData.logo_url,
        
        // Notifications
        notif_mycarenet: formData.notif_mycarenet,
        notif_oa_alerts: formData.notif_oa_alerts,
        notif_appointments: formData.notif_appointments
      };

      // Si super admin, peut aussi modifier identité
      if (currentUser.role === 'admin') {
        dataToSave.numero_inami = formData.numero_inami;
        dataToSave.specialite = formData.specialite;
      }

      // Mise à jour via API
      await base44.auth.updateMe(dataToSave);

      // Audit log
      await AuditLog.create({
        user_email: currentUser.email,
        action: 'PROFILE_UPDATE',
        target_entity: 'User',
        target_id: currentUser.id,
        details: `Mise à jour profil médecin - Champs: ${Object.keys(dataToSave).join(', ')}`,
        timestamp: new Date().toISOString()
      });

      toast.success('Profil mis à jour avec succès');
      
      // Recharger
      await loadProfile();
      setHasChanges(false);

    } catch (error) {
      console.error('Erreur sauvegarde profil:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(JSON.parse(JSON.stringify(originalData)));
    setHasChanges(false);
    setErrors({});
    toast.info('Modifications annulées');
  };

  const handleReset = () => {
    loadProfile();
    toast.info('Données rechargées depuis le serveur');
  };

  const isAdmin = currentUser?.role === 'admin';
  const canEditIdentity = isAdmin;

  if (isLoading || !formData) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Profil Médecin</h1>
          <p className="text-slate-600">
            Gérez vos informations professionnelles et paramètres de facturation
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Badge className="bg-purple-100 text-purple-800">
              Super Admin
            </Badge>
          )}
          <Badge variant="outline">
            INAMI: {formData.numero_inami || 'Non défini'}
          </Badge>
        </div>
      </div>

      {/* Alerte RBAC */}
      {!isAdmin && (
        <Alert className="bg-blue-50 border-blue-200">
          <Lock className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Sécurité:</strong> Les modifications nécessitent une re-authentification.
            Les champs marqués 🔒 sont modifiables uniquement par un Super Admin.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="identite" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="identite">
            <UserIcon className="w-4 h-4 mr-2" />
            Identité
          </TabsTrigger>
          <TabsTrigger value="coordonnees">
            <MapPin className="w-4 h-4 mr-2" />
            Coordonnées
          </TabsTrigger>
          <TabsTrigger value="facturation">
            <CreditCard className="w-4 h-4 mr-2" />
            Facturation
          </TabsTrigger>
          <TabsTrigger value="securite">
            <Shield className="w-4 h-4 mr-2" />
            Sécurité
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Tab Identité */}
        <TabsContent value="identite" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Informations d'identité</span>
                {!canEditIdentity && (
                  <Badge variant="outline" className="text-xs">
                    🔒 Lecture seule
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nom complet</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    disabled={!canEditIdentity}
                  />
                </div>
                <div>
                  <Label>Numéro INAMI 🔒</Label>
                  <Input
                    value={formData.numero_inami}
                    onChange={(e) => handleChange('numero_inami', e.target.value)}
                    disabled={!canEditIdentity}
                    className={!canEditIdentity ? 'bg-slate-100' : ''}
                  />
                  {!canEditIdentity && (
                    <p className="text-xs text-slate-500 mt-1">
                      Modifiable uniquement par Super Admin
                    </p>
                  )}
                </div>
              </div>
              
              <div>
                <Label>Spécialité {!canEditIdentity && '🔒'}</Label>
                <Select
                  value={formData.specialite}
                  onValueChange={(value) => handleChange('specialite', value)}
                  disabled={!canEditIdentity}
                >
                  <SelectTrigger className={!canEditIdentity ? 'bg-slate-100' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Médecine Générale">Médecine Générale</SelectItem>
                    <SelectItem value="Cardiologie">Cardiologie</SelectItem>
                    <SelectItem value="Dermatologie">Dermatologie</SelectItem>
                    <SelectItem value="Pédiatrie">Pédiatrie</SelectItem>
                    <SelectItem value="Psychiatrie">Psychiatrie</SelectItem>
                    <SelectItem value="Chirurgie">Chirurgie</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Coordonnées */}
        <TabsContent value="coordonnees" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Coordonnées professionnelles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Adresse du cabinet *</Label>
                <Textarea
                  value={formData.adresse_cabinet}
                  onChange={(e) => handleChange('adresse_cabinet', e.target.value)}
                  placeholder="Rue, numéro, code postal, ville"
                  rows={3}
                  className={errors.adresse_cabinet ? 'border-red-500' : ''}
                />
                {errors.adresse_cabinet && (
                  <p className="text-xs text-red-600 mt-1">{errors.adresse_cabinet}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Téléphone cabinet *</Label>
                  <Input
                    value={formData.telephone_cabinet}
                    onChange={(e) => handleChange('telephone_cabinet', e.target.value)}
                    placeholder="+32 2 123 45 67"
                    className={errors.telephone_cabinet ? 'border-red-500' : ''}
                  />
                  {errors.telephone_cabinet && (
                    <p className="text-xs text-red-600 mt-1">{errors.telephone_cabinet}</p>
                  )}
                </div>
                <div>
                  <Label>Email professionnel</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    disabled
                    className="bg-slate-100"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    L'email est lié à votre compte
                  </p>
                </div>
              </div>

              <div>
                <Label>Site web (optionnel)</Label>
                <Input
                  value={formData.site_web}
                  onChange={(e) => handleChange('site_web', e.target.value)}
                  placeholder="https://www.example.com"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Facturation */}
        <TabsContent value="facturation" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de facturation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>IBAN</Label>
                  <Input
                    value={formData.iban}
                    onChange={(e) => handleChange('iban', e.target.value.toUpperCase())}
                    placeholder="BE68 5390 0754 7034"
                    className={errors.iban ? 'border-red-500' : ''}
                  />
                  {errors.iban && (
                    <p className="text-xs text-red-600 mt-1">{errors.iban}</p>
                  )}
                </div>
                <div>
                  <Label>BIC (optionnel)</Label>
                  <Input
                    value={formData.bic}
                    onChange={(e) => handleChange('bic', e.target.value.toUpperCase())}
                    placeholder="GEBABEBB"
                  />
                </div>
              </div>

              <div>
                <Label>Mode de facturation par défaut</Label>
                <Select
                  value={formData.mode_facturation_defaut}
                  onValueChange={(value) => handleChange('mode_facturation_defaut', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EATTEST">eAttest (Attestation électronique)</SelectItem>
                    <SelectItem value="EFACT">eFact (Tiers payant)</SelectItem>
                    <SelectItem value="PAPER">Papier (Exceptionnel)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Texte personnalisé sur facture</Label>
                <Textarea
                  value={formData.texte_facture}
                  onChange={(e) => handleChange('texte_facture', e.target.value)}
                  placeholder="Texte affiché en bas de la facture (conditions de paiement, etc.)"
                  rows={3}
                />
              </div>

              <div>
                <Label>Logo cabinet</Label>
                <Input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => {
                    // TODO: Upload logo
                    toast.info('Upload logo - À implémenter');
                  }}
                />
                <p className="text-xs text-slate-500 mt-1">
                  PNG ou JPG, max 500 Ko
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Sécurité */}
        <TabsContent value="securite" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de sécurité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <Shield className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  Gérez vos paramètres d'authentification à deux facteurs (2FA) dans la page{' '}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-blue-600 underline"
                    onClick={() => window.location.href = '/securite'}
                  >
                    Sécurité
                  </Button>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Authentification 2FA</span>
                    <Badge className={currentUser.mfa_enabled ? 'bg-green-600' : 'bg-orange-600'}>
                      {currentUser.mfa_enabled ? 'Activée' : 'Désactivée'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600">
                    Protection renforcée de votre compte
                  </p>
                </div>
                
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Codes de secours</span>
                    <Badge variant="outline">
                      10 codes
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600">
                    Accès d'urgence à votre compte
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Notifications */}
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Préférences de notification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <div className="font-medium">Copies envois MyCareNet</div>
                    <p className="text-xs text-slate-600">
                      Recevoir une copie email des transactions MyCareNet
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.notif_mycarenet}
                    onChange={(e) => handleChange('notif_mycarenet', e.target.checked)}
                    className="w-5 h-5"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <div className="font-medium">Alertes retours OA</div>
                    <p className="text-xs text-slate-600">
                      Notifications en cas de rejet/refus par les organismes assureurs
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.notif_oa_alerts}
                    onChange={(e) => handleChange('notif_oa_alerts', e.target.checked)}
                    className="w-5 h-5"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <div className="font-medium">Rappels rendez-vous</div>
                    <p className="text-xs text-slate-600">
                      Notifications de rappel pour vos consultations à venir
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.notif_appointments}
                    onChange={(e) => handleChange('notif_appointments', e.target.checked)}
                    className="w-5 h-5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Boutons action */}
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge className="bg-orange-100 text-orange-800">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Modifications non sauvegardées
            </Badge>
          )}
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSaving}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Réinitialiser
          </Button>
          
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={!hasChanges || isSaving}
          >
            <X className="w-4 h-4 mr-2" />
            Annuler
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Dialogue re-auth */}
      {showReAuth && (
        <ReAuthDialog
          isOpen={showReAuth}
          onSuccess={handleReAuthSuccess}
          onCancel={() => setShowReAuth(false)}
          user={currentUser}
        />
      )}
    </div>
  );
}
