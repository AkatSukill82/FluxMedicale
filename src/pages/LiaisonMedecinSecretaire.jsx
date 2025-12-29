import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { 
  UserPlus, Users, Shield, Check, X, Clock, 
  Link2, Unlink, Search, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const PERMISSIONS = [
  { id: "hub_access", label: "Accès HUB patient", description: "Consulter les données du HUB santé via certificat eHealth" },
  { id: "agenda_read", label: "Lecture agenda", description: "Voir les rendez-vous" },
  { id: "agenda_write", label: "Gestion agenda", description: "Créer/modifier/annuler des RDV" },
  { id: "patients_read", label: "Lecture patients", description: "Consulter les dossiers patients" },
  { id: "patients_write", label: "Gestion patients", description: "Créer/modifier des patients" },
  { id: "facturation", label: "Facturation", description: "Gérer la facturation" }
];

export default function LiaisonMedecinSecretaire() {
  const [user, setUser] = useState(null);
  const [liaisons, setLiaisons] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    target_email: "",
    permissions: ["agenda_read", "patients_read"],
    ehealth_delegation_active: false
  });

  const isDoctor = user?.role === "admin";

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userData, liaisonsData, usersData] = await Promise.all([
        base44.auth.me(),
        base44.entities.MedecinSecretaireLiaison.list("-created_date", 100),
        base44.entities.User.list("-created_date", 100)
      ]);
      
      setUser(userData);
      setUsers(usersData);
      
      // Filtrer les liaisons selon le rôle
      const filteredLiaisons = liaisonsData.filter(l => 
        userData.role === "admin" 
          ? l.medecin_email === userData.email 
          : l.secretaire_email === userData.email
      );
      setLiaisons(filteredLiaisons);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLiaison = async (e) => {
    e.preventDefault();
    try {
      const targetUser = users.find(u => u.email === formData.target_email);
      
      if (!targetUser) {
        toast.error("Utilisateur non trouvé");
        return;
      }

      const liaisonData = isDoctor ? {
        medecin_email: user.email,
        medecin_nom: user.full_name,
        medecin_nihii: user.nihii || "",
        secretaire_email: formData.target_email,
        secretaire_nom: targetUser.full_name,
        permissions: formData.permissions,
        statut: "active",
        date_debut: format(new Date(), "yyyy-MM-dd"),
        ehealth_delegation_active: formData.ehealth_delegation_active
      } : {
        medecin_email: formData.target_email,
        medecin_nom: targetUser.full_name,
        medecin_nihii: targetUser.nihii || "",
        secretaire_email: user.email,
        secretaire_nom: user.full_name,
        permissions: [],
        statut: "pending",
        date_debut: format(new Date(), "yyyy-MM-dd"),
        ehealth_delegation_active: false
      };

      await base44.entities.MedecinSecretaireLiaison.create(liaisonData);
      toast.success(isDoctor ? "Secrétaire liée avec succès" : "Demande envoyée au médecin");
      setIsDialogOpen(false);
      setFormData({ target_email: "", permissions: ["agenda_read", "patients_read"], ehealth_delegation_active: false });
      loadData();
    } catch (error) {
      console.error("Error creating liaison:", error);
      toast.error("Erreur lors de la création");
    }
  };

  const handleUpdateStatus = async (liaison, newStatus) => {
    try {
      await base44.entities.MedecinSecretaireLiaison.update(liaison.id, { statut: newStatus });
      toast.success(newStatus === "active" ? "Liaison activée" : "Liaison révoquée");
      loadData();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleToggleEHealth = async (liaison) => {
    try {
      await base44.entities.MedecinSecretaireLiaison.update(liaison.id, { 
        ehealth_delegation_active: !liaison.ehealth_delegation_active 
      });
      toast.success(liaison.ehealth_delegation_active ? "Délégation eHealth désactivée" : "Délégation eHealth activée");
      loadData();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleUpdatePermissions = async (liaison, permissions) => {
    try {
      await base44.entities.MedecinSecretaireLiaison.update(liaison.id, { permissions });
      toast.success("Permissions mises à jour");
      loadData();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      revoked: "bg-red-100 text-red-700"
    };
    const labels = {
      active: "Active",
      pending: "En attente",
      revoked: "Révoquée"
    };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  // Filtrer les utilisateurs disponibles pour la liaison
  const availableUsers = users.filter(u => {
    if (isDoctor) {
      // Médecin cherche des secrétaires (role = user)
      return u.role === "user" && !liaisons.some(l => l.secretaire_email === u.email);
    } else {
      // Secrétaire cherche des médecins (role = admin)
      return u.role === "admin" && !liaisons.some(l => l.medecin_email === u.email);
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Seules les admins peuvent accéder à cette page
  if (!isDoctor) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <Shield className="w-16 h-16 mx-auto text-red-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Accès restreint</h2>
            <p className="text-gray-500">
              Cette page est réservée aux médecins (administrateurs). 
              Les secrétaires peuvent consulter leurs délégations dans leur profil.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isDoctor ? "Mes secrétaires" : "Mes médecins"}
          </h1>
          <p className="text-gray-500">
            {isDoctor 
              ? "Gérez les secrétaires liées à votre compte et leurs permissions" 
              : "Consultez vos liaisons avec les médecins"}
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Ajouter une secrétaire
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Lier une secrétaire</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateLiaison} className="space-y-4 mt-4">
              <div>
                <Label>Secrétaire</Label>
                <Select 
                  value={formData.target_email} 
                  onValueChange={(v) => setFormData({...formData, target_email: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map(u => (
                      <SelectItem key={u.id} value={u.email}>
                        {u.full_name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-3 block">Permissions</Label>
                    <div className="space-y-3">
                      {PERMISSIONS.map(perm => (
                        <div key={perm.id} className="flex items-start gap-3">
                          <Checkbox
                            id={perm.id}
                            checked={formData.permissions.includes(perm.id)}
                            onCheckedChange={(checked) => {
                              setFormData({
                                ...formData,
                                permissions: checked 
                                  ? [...formData.permissions, perm.id]
                                  : formData.permissions.filter(p => p !== perm.id)
                              });
                            }}
                          />
                          <div>
                            <label htmlFor={perm.id} className="text-sm font-medium cursor-pointer">
                              {perm.label}
                            </label>
                            <p className="text-xs text-gray-500">{perm.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

              {formData.permissions.includes("hub_access") && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">Délégation eHealth</AlertTitle>
                  <AlertDescription className="text-amber-700 text-sm">
                    L'accès HUB nécessite une délégation eHealth. Votre certificat sera utilisé 
                    en arrière-plan pour permettre à la secrétaire de consulter les données du HUB.
                  </AlertDescription>
                  <div className="mt-3 flex items-center gap-2">
                    <Switch
                      checked={formData.ehealth_delegation_active}
                      onCheckedChange={(v) => setFormData({...formData, ehealth_delegation_active: v})}
                    />
                    <span className="text-sm">Activer la délégation eHealth</span>
                  </div>
                </Alert>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Créer la liaison
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>



      {/* Liste des liaisons */}
      <div className="grid gap-4">
        {liaisons.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                {isDoctor ? "Aucune secrétaire liée" : "Aucune liaison avec un médecin"}
              </p>
            </CardContent>
          </Card>
        ) : (
          liaisons.map((liaison) => (
            <Card key={liaison.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {isDoctor ? liaison.secretaire_nom : `Dr. ${liaison.medecin_nom}`}
                        </h3>
                        {getStatusBadge(liaison.statut)}
                        {liaison.ehealth_delegation_active && (
                          <Badge className="bg-purple-100 text-purple-700">
                            <Shield className="w-3 h-3 mr-1" />
                            eHealth
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {isDoctor ? liaison.secretaire_email : liaison.medecin_email}
                      </p>
                      {liaison.medecin_nihii && !isDoctor && (
                        <p className="text-xs text-gray-400">NIHII: {liaison.medecin_nihii}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Depuis le {format(new Date(liaison.date_debut), "dd/MM/yyyy", { locale: fr })}
                      </p>
                      
                      {/* Permissions */}
                      {liaison.permissions?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {liaison.permissions.map(p => (
                            <Badge key={p} variant="outline" className="text-xs">
                              {PERMISSIONS.find(perm => perm.id === p)?.label || p}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions pour médecin */}
                  {isDoctor && liaison.statut !== "revoked" && (
                    <div className="flex items-center gap-2">
                      {liaison.statut === "pending" && (
                        <Button 
                          size="sm" 
                          onClick={() => handleUpdateStatus(liaison, "active")}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Accepter
                        </Button>
                      )}
                      
                      <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg">
                        <span className="text-xs text-gray-500">eHealth</span>
                        <Switch
                          checked={liaison.ehealth_delegation_active}
                          onCheckedChange={() => handleToggleEHealth(liaison)}
                          disabled={liaison.statut !== "active"}
                        />
                      </div>

                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleUpdateStatus(liaison, "revoked")}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Unlink className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {/* Status pour secrétaire */}
                  {!isDoctor && liaison.statut === "pending" && (
                    <Badge className="bg-yellow-100 text-yellow-700">
                      <Clock className="w-3 h-3 mr-1" />
                      En attente d'approbation
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}