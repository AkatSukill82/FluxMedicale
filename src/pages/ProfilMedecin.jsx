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
  Lock,
  FileKey,
  Heart,
  Upload,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Building2,
  Users,
  Calendar,
  Accessibility
} from 'lucide-react';
import { toast } from 'sonner';

import { validateIBAN, validateEmail, validatePhone } from '../components/utils/validators';
import AutoBackupService from '../components/backup/AutoBackupService';
import CabinetManager from '../components/cabinet/CabinetManager';
import LiaisonMedecinSecretaireTab from '../components/profile/LiaisonMedecinSecretaireTab';
import AccessibilitySettings from '../components/settings/AccessibilitySettings';

export default function ProfilMedecinPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState(null);
  const [originalData, setOriginalData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
        notif_appointments: user.notif_appointments !== false,
        
        // eHealth
        ehealth_certificate_url: user.ehealth_certificate_url || '',
        ehealth_certificate_expiry: user.ehealth_certificate_expiry || '',
        ehealth_nihii: user.ehealth_nihii || '',
        ehealth_quality: user.ehealth_quality || 'doctor',
        
        // DMG
        dmg_auto_check: user.dmg_auto_check !== false,
        dmg_auto_renewal_reminder: user.dmg_auto_renewal_reminder !== false,
        dmg_default_open: user.dmg_default_open !== false,
        
        // Conventionnement
        is_conventionne: user.is_conventionne !== false,
        conventionnement: user.conventionnement || 'conventionne',
        
        // Agenda externe
        external_calendar_type: user.external_calendar_type || '',
        external_calendar_url: user.external_calendar_url || '',
        external_calendar_id: user.external_calendar_id || '',
        sync_to_external: user.sync_to_external !== false
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

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs');
      return;
    }

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
        notif_appointments: formData.notif_appointments,
        
        // eHealth
        ehealth_certificate_url: formData.ehealth_certificate_url,
        ehealth_certificate_expiry: formData.ehealth_certificate_expiry,
        ehealth_nihii: formData.ehealth_nihii,
        ehealth_quality: formData.ehealth_quality,
        
        // DMG
        dmg_auto_check: formData.dmg_auto_check,
        dmg_auto_renewal_reminder: formData.dmg_auto_renewal_reminder,
        dmg_default_open: formData.dmg_default_open,
        
        // Conventionnement
        is_conventionne: formData.is_conventionne,
        conventionnement: formData.conventionnement,
        
        // Agenda externe
        external_calendar_type: formData.external_calendar_type,
        external_calendar_url: formData.external_calendar_url,
        external_calendar_id: formData.external_calendar_id,
        sync_to_external: formData.sync_to_external
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
      
      // Message d'erreur détaillé en français
      let errorMessage = 'Erreur lors de la sauvegarde';
      if (error?.message) {
        if (error.message.includes('IBAN')) {
          errorMessage = 'Le format de l\'IBAN est invalide';
        } else if (error.message.includes('phone') || error.message.includes('telephone')) {
          errorMessage = 'Le numéro de téléphone est invalide';
        } else if (error.message.includes('email')) {
          errorMessage = 'L\'adresse email est invalide';
        } else if (error.message.includes('required') || error.message.includes('obligatoire')) {
          errorMessage = 'Certains champs obligatoires ne sont pas remplis';
        } else if (error.message.includes('network') || error.message.includes('Network')) {
          errorMessage = 'Problème de connexion internet. Vérifiez votre connexion et réessayez.';
        } else if (error.message.includes('unauthorized') || error.message.includes('401')) {
          errorMessage = 'Votre session a expiré. Veuillez vous reconnecter.';
        } else {
          errorMessage = `Erreur: ${error.message}`;
        }
      }
      
      toast.error(errorMessage);
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
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="identite" className="text-xs">
            <UserIcon className="w-4 h-4 mr-1" />
            Identité
          </TabsTrigger>
          <TabsTrigger value="coordonnees" className="text-xs">
            <MapPin className="w-4 h-4 mr-1" />
            Coordonnées
          </TabsTrigger>
          <TabsTrigger value="cabinets" className="text-xs">
            <Building2 className="w-4 h-4 mr-1" />
            Cabinets
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="liaisons" className="text-xs">
              <Users className="w-4 h-4 mr-1" />
              Secrétaires
            </TabsTrigger>
          )}
          <TabsTrigger value="ehealth" className="text-xs">
            <FileKey className="w-4 h-4 mr-1" />
            eHealth
          </TabsTrigger>
          <TabsTrigger value="dmg" className="text-xs">
            <Heart className="w-4 h-4 mr-1" />
            DMG
          </TabsTrigger>
          <TabsTrigger value="facturation" className="text-xs">
            <CreditCard className="w-4 h-4 mr-1" />
            Facturation
          </TabsTrigger>
          <TabsTrigger value="securite" className="text-xs">
            <Shield className="w-4 h-4 mr-1" />
            Sécurité
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs">
            <Bell className="w-4 h-4 mr-1" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="backup" className="text-xs">
            <Save className="w-4 h-4 mr-1" />
            Backup
          </TabsTrigger>
          <TabsTrigger value="agenda" className="text-xs">
            <Calendar className="w-4 h-4 mr-1" />
            Agenda externe
          </TabsTrigger>
          <TabsTrigger value="accessibilite" className="text-xs">
            <Accessibility className="w-4 h-4 mr-1" />
            Affichage
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

        {/* Tab Cabinets */}
        <TabsContent value="cabinets" className="mt-6">
          <CabinetManager />
        </TabsContent>

        {/* Tab Liaisons Médecin/Secrétaire */}
        {isAdmin && (
          <TabsContent value="liaisons" className="mt-6">
            <LiaisonMedecinSecretaireTab user={currentUser} />
          </TabsContent>
        )}

        {/* Tab eHealth */}
        <TabsContent value="ehealth" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileKey className="w-5 h-5 text-blue-600" />
                  Certificat eHealth
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    Le certificat eHealth est nécessaire pour les communications sécurisées avec les services belges 
                    (MyCareNet, Recip-e, eHealthBox, etc.)
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Numéro NIHII *</Label>
                    <Input
                      value={formData.ehealth_nihii}
                      onChange={(e) => handleChange('ehealth_nihii', e.target.value)}
                      placeholder="1-12345-67-890"
                      disabled={!canEditIdentity}
                      className={!canEditIdentity ? 'bg-slate-100' : ''}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Numéro d'identification INAMI
                    </p>
                  </div>
                  <div>
                    <Label>Qualité eHealth</Label>
                    <Select
                      value={formData.ehealth_quality}
                      onValueChange={(value) => handleChange('ehealth_quality', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="doctor">Médecin</SelectItem>
                        <SelectItem value="dentist">Dentiste</SelectItem>
                        <SelectItem value="pharmacist">Pharmacien</SelectItem>
                        <SelectItem value="nurse">Infirmier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6">
                  <div className="text-center">
                    {formData.ehealth_certificate_url ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center gap-2 text-green-600">
                          <CheckCircle className="w-8 h-8" />
                          <span className="text-lg font-semibold">Certificat installé</span>
                        </div>
                        {formData.ehealth_certificate_expiry && (
                          <p className="text-sm text-slate-600">
                            Expire le: <strong>{formData.ehealth_certificate_expiry}</strong>
                          </p>
                        )}
                        <Button variant="outline" size="sm">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Remplacer le certificat
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Upload className="w-12 h-12 mx-auto text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-700">Importer votre certificat eHealth</p>
                          <p className="text-sm text-slate-500">Format .p12 ou .pfx</p>
                        </div>
                        <Input
                          type="file"
                          accept=".p12,.pfx"
                          className="max-w-xs mx-auto"
                          onChange={(e) => {
                            // TODO: Upload certificat
                            toast.info('Upload certificat - À configurer avec eHealth');
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium">Obtenir un certificat eHealth</p>
                    <p className="text-sm text-slate-600">
                      Commandez votre certificat sur le portail eHealth
                    </p>
                  </div>
                  <Button variant="outline" asChild>
                    <a href="https://www.ehealth.fgov.be" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Portail eHealth
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Services eHealth activés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">MyCareNet</span>
                      <Badge className={formData.ehealth_certificate_url ? 'bg-green-600' : 'bg-slate-400'}>
                        {formData.ehealth_certificate_url ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600">
                      eAttest, eFact, assurabilité
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Recip-e</span>
                      <Badge className={formData.ehealth_certificate_url ? 'bg-green-600' : 'bg-slate-400'}>
                        {formData.ehealth_certificate_url ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600">
                      Prescriptions électroniques
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">eHealthBox</span>
                      <Badge className={formData.ehealth_certificate_url ? 'bg-green-600' : 'bg-slate-400'}>
                        {formData.ehealth_certificate_url ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600">
                      Messagerie sécurisée
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Hub RSW/Vitalink</span>
                      <Badge className={formData.ehealth_certificate_url ? 'bg-green-600' : 'bg-slate-400'}>
                        {formData.ehealth_certificate_url ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600">
                      Accès dossiers patients
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab DMG */}
        <TabsContent value="dmg" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  Dossier Médical Global (DMG)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    Le DMG permet une meilleure coordination des soins et ouvre droit à des honoraires majorés 
                    pour les consultations et visites.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <div className="font-medium">Vérification automatique DMG</div>
                      <p className="text-xs text-slate-600">
                        Vérifier automatiquement le statut DMG lors de l'ouverture d'un dossier patient
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.dmg_auto_check}
                      onChange={(e) => handleChange('dmg_auto_check', e.target.checked)}
                      className="w-5 h-5"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <div className="font-medium">Rappels de renouvellement</div>
                      <p className="text-xs text-slate-600">
                        Recevoir des notifications pour les DMG arrivant à expiration
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.dmg_auto_renewal_reminder}
                      onChange={(e) => handleChange('dmg_auto_renewal_reminder', e.target.checked)}
                      className="w-5 h-5"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <div className="font-medium">Proposer l'ouverture DMG par défaut</div>
                      <p className="text-xs text-slate-600">
                        Suggérer automatiquement l'ouverture d'un DMG pour les patients éligibles
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.dmg_default_open}
                      onChange={(e) => handleChange('dmg_default_open', e.target.checked)}
                      className="w-5 h-5"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statut conventionnement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Statut de conventionnement</Label>
                  <Select
                    value={formData.conventionnement}
                    onValueChange={(value) => {
                      handleChange('conventionnement', value);
                      handleChange('is_conventionne', value === 'conventionne');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conventionne">Conventionné</SelectItem>
                      <SelectItem value="partiellement_conventionne">Partiellement conventionné</SelectItem>
                      <SelectItem value="non_conventionne">Non conventionné</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-2">
                    {formData.conventionnement === 'conventionne' && 
                      "Vous appliquez les tarifs INAMI officiels pour tous les patients."}
                    {formData.conventionnement === 'partiellement_conventionne' && 
                      "Vous appliquez les tarifs conventionnés pour certains patients (BIM, etc.)."}
                    {formData.conventionnement === 'non_conventionne' && 
                      "Vous êtes libre de fixer vos honoraires au-dessus des tarifs INAMI."}
                  </p>
                </div>

                <Alert className={formData.is_conventionne ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}>
                  <AlertCircle className={`w-4 h-4 ${formData.is_conventionne ? 'text-blue-600' : 'text-orange-600'}`} />
                  <AlertDescription className={formData.is_conventionne ? 'text-blue-900' : 'text-orange-900'}>
                    {formData.is_conventionne 
                      ? "Les facturations utiliseront les tarifs conventionnés par défaut."
                      : "Vous pourrez modifier les honoraires lors de chaque facturation."}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
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

        {/* Tab Backup */}
        <TabsContent value="backup" className="mt-6">
          <AutoBackupService />
        </TabsContent>

        {/* Tab Accessibilité */}
        <TabsContent value="accessibilite" className="mt-6">
          <AccessibilitySettings />
        </TabsContent>

        {/* Tab Agenda Externe */}
        <TabsContent value="agenda" className="mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Agenda externe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    Connectez votre agenda externe (Doctolib, Google Calendar, Outlook, etc.) pour synchroniser vos rendez-vous.
                  </AlertDescription>
                </Alert>

                <div>
                  <Label>Type d'agenda externe</Label>
                  <Select
                    value={formData.external_calendar_type}
                    onValueChange={(value) => handleChange('external_calendar_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez votre agenda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Aucun</SelectItem>
                      <SelectItem value="google">Google Calendar</SelectItem>
                      <SelectItem value="outlook">Microsoft Outlook</SelectItem>
                      <SelectItem value="doctolib">Doctolib</SelectItem>
                      <SelectItem value="ical">Flux iCal (URL)</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.external_calendar_type && (
                  <>
                    {formData.external_calendar_type === 'ical' || formData.external_calendar_type === 'other' ? (
                      <div>
                        <Label>URL du flux iCal</Label>
                        <Input
                          value={formData.external_calendar_url}
                          onChange={(e) => handleChange('external_calendar_url', e.target.value)}
                          placeholder="https://calendar.google.com/calendar/ical/..."
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Copiez l'URL iCal depuis votre agenda externe
                        </p>
                      </div>
                    ) : (
                      <div>
                        <Label>Identifiant de calendrier</Label>
                        <Input
                          value={formData.external_calendar_id}
                          onChange={(e) => handleChange('external_calendar_id', e.target.value)}
                          placeholder={
                            formData.external_calendar_type === 'google' ? 'votre@email.com ou ID calendrier' :
                            formData.external_calendar_type === 'doctolib' ? 'ID praticien Doctolib' :
                            'Identifiant du calendrier'
                          }
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          {formData.external_calendar_type === 'google' && 'Email Google ou ID du calendrier partagé'}
                          {formData.external_calendar_type === 'outlook' && 'Email Outlook ou ID du calendrier'}
                          {formData.external_calendar_type === 'doctolib' && 'Votre identifiant praticien Doctolib'}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <div className="font-medium">Synchronisation automatique</div>
                        <p className="text-xs text-slate-600">
                          Envoyer automatiquement les nouveaux RDV vers l'agenda externe
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.sync_to_external}
                        onChange={(e) => handleChange('sync_to_external', e.target.checked)}
                        className="w-5 h-5"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Intégrations disponibles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="font-medium">Google Calendar</span>
                        <Badge className="ml-2 bg-green-600">Connecté</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">
                      Synchronisation bidirectionnelle avec Google Calendar
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg opacity-60">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-slate-400 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="font-medium">Doctolib</span>
                        <Badge variant="outline" className="ml-2">Bientôt</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">
                      Import des RDV Doctolib (API non publique)
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg opacity-60">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-slate-400 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="font-medium">Outlook</span>
                        <Badge variant="outline" className="ml-2">Bientôt</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">
                      Synchronisation avec Microsoft Outlook
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="font-medium">Flux iCal</span>
                        <Badge className="ml-2 bg-green-600">Disponible</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">
                      Import via URL iCal (lecture seule)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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


    </div>
  );
}