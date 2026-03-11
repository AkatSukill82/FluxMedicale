import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Users, 
  UserPlus, 
  Search, 
  Shield, 
  Mail,
  Phone,
  Stethoscope,
  Trash2,
  UserCog,
  Eye,
  Pencil,
  Crown
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_COLORS } from '../components/auth/RBACGuard';

export default function Utilisateurs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [editRole, setEditRole] = useState('');
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "user"
  });

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!currentUser
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }) => {
      return await base44.entities.User.update(userId, { role: newRole });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('Rôle modifié avec succès');
      setShowEditDialog(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast.error('Erreur lors de la modification du rôle');
    }
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }) => {
      return await base44.users.inviteUser(email, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('Invitation envoyée avec succès');
      setShowInviteDialog(false);
      setInviteForm({ email: '', role: 'user' });
    },
    onError: (err) => {
      toast.error('Erreur : ' + (err?.message || 'Impossible d\'envoyer l\'invitation'));
    }
  });

  // Vérification des permissions - seuls les admin (médecins) peuvent accéder
  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Accès restreint</h3>
          <p className="text-slate-600">Seuls les médecins peuvent gérer les utilisateurs.</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.specialite?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInvite = () => {
    if (!inviteForm.email) {
      toast.error('Veuillez saisir un email');
      return;
    }
    inviteMutation.mutate({ email: inviteForm.email, role: inviteForm.role });
  };

  const handleEditRole = (user) => {
    setSelectedUser(user);
    setEditRole(user.role || 'user');
    setShowEditDialog(true);
  };

  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const confirmRoleChange = () => {
    if (selectedUser && editRole) {
      updateRoleMutation.mutate({ 
        userId: selectedUser.id, 
        newRole: editRole
      });
    }
  };

  const confirmDelete = () => {
    toast.info('La suppression d\'utilisateurs doit être effectuée depuis les paramètres Base44');
    setShowDeleteDialog(false);
  };

  const getRoleBadge = (role) => {
    const colors = ROLE_COLORS[role] || ROLE_COLORS[ROLES.VIEWER];
    const icons = { admin: Crown, editor: Pencil, user: Eye };
    const Icon = icons[role] || Eye;
    return (
      <Badge className={`${colors.bg} ${colors.text} gap-1`}>
        <Icon className="w-3 h-3" />
        {ROLE_LABELS[role] || role}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Gestion des Utilisateurs</h1>
          <p className="text-slate-600">Gérez les accès médecins et secrétaires</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 shadow-lg"
          onClick={() => setShowInviteDialog(true)}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Inviter un utilisateur
        </Button>
      </div>

      {/* Barre de recherche */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Rechercher par nom, email ou spécialité..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Utilisateurs</p>
                <p className="text-2xl font-bold text-slate-900">{users.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Médecins</p>
                <p className="text-2xl font-bold text-slate-900">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
              <Stethoscope className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Secrétaires</p>
                <p className="text-2xl font-bold text-slate-900">
                  {users.filter(u => u.role === 'user').length}
                </p>
              </div>
              <Shield className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des utilisateurs */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Utilisateurs ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {user.full_name?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">
                        {user.full_name}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {user.email}
                        </div>
                        {user.specialite && (
                          <div className="flex items-center gap-1">
                            <Stethoscope className="w-4 h-4" />
                            {user.specialite}
                          </div>
                        )}
                      </div>
                      {user.telephone_cabinet && (
                        <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                          <Phone className="w-4 h-4" />
                          {user.telephone_cabinet}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getRoleBadge(user.role)}
                    {user.role === 'admin' && (
                      <Badge variant="outline" className="text-xs">
                        MFA: {user.mfa_enabled ? 'Activé' : 'Désactivé'}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditRole(user)}
                      title="Modifier le rôle"
                    >
                      <UserCog className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteUser(user)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Désactiver le compte"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-600">Aucun utilisateur trouvé</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note de conformité */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Conformité RGPD & Législation Belge</h4>
              <p className="text-sm text-blue-700">
                Tous les accès sont tracés et auditables. Les données sont chiffrées en transit et au repos.
                Les utilisateurs n'ont accès qu'aux données nécessaires à leur fonction (principe du moindre privilège).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog d'invitation */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inviter un utilisateur</DialogTitle>
            <DialogDescription>
              Invitez un nouveau médecin ou secrétaire à rejoindre FluxMed
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="email@exemple.be"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Nom complet *</Label>
              <Input
                placeholder="Dr. Jean Dupont"
                value={inviteForm.full_name}
                onChange={(e) => setInviteForm({...inviteForm, full_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Rôle *</Label>
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({...inviteForm, role: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Médecin (accès complet)</SelectItem>
                  <SelectItem value="user">Secrétaire (accès limité)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {inviteForm.role === 'admin' && (
              <>
                <div className="space-y-2">
                  <Label>Spécialité</Label>
                  <Input
                    placeholder="Médecine générale"
                    value={inviteForm.specialite}
                    onChange={(e) => setInviteForm({...inviteForm, specialite: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Numéro INAMI</Label>
                  <Input
                    placeholder="1-12345-67-890"
                    value={inviteForm.numero_inami}
                    onChange={(e) => setInviteForm({...inviteForm, numero_inami: e.target.value})}
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Téléphone cabinet</Label>
              <Input
                placeholder="+32 2 123 45 67"
                value={inviteForm.telephone_cabinet}
                onChange={(e) => setInviteForm({...inviteForm, telephone_cabinet: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleInvite}>
              Envoyer l'invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de modification de rôle */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le rôle</DialogTitle>
            <DialogDescription>
              Modifier le rôle de {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600 mb-4">
              Rôle actuel : <strong>{selectedUser?.role === 'admin' ? 'MÉDECIN' : 'SECRÉTAIRE'}</strong>
            </p>
            <p className="text-sm text-slate-600">
              Nouveau rôle : <strong>{selectedUser?.role === 'admin' ? 'SECRÉTAIRE' : 'MÉDECIN'}</strong>
            </p>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Cette action modifiera immédiatement les permissions d'accès de l'utilisateur.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annuler
            </Button>
            <Button onClick={confirmRoleChange} disabled={updateRoleMutation.isPending}>
              {updateRoleMutation.isPending ? 'Modification...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver le compte</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir désactiver le compte de {selectedUser?.full_name} ?
              Cette action doit être effectuée depuis les paramètres de votre compte Base44.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Compris
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}