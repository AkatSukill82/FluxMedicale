import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  UserPlus, Users, Shield, Check, X, Clock, 
  Link2, Unlink, Search, AlertTriangle, History
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

const PERMISSIONS_SECRETAIRE = [
  { id: "agenda_read", label: "Lecture agenda", description: "Voir les rendez-vous" },
  { id: "agenda_write", label: "Gestion agenda", description: "Créer/modifier/annuler des RDV" },
  { id: "patients_read", label: "Lecture patients", description: "Consulter les dossiers patients" },
  { id: "patients_write", label: "Gestion patients", description: "Créer/modifier des patients" },
  { id: "hub_access", label: "Accès HUB patient", description: "Consulter les données du HUB santé via certificat eHealth" }
];

const PERMISSIONS_STAGIAIRE = [
  { id: "hub_access", label: "Accès HUB patient", description: "Consulter les données du HUB santé" },
  { id: "agenda_read", label: "Lecture agenda", description: "Voir les rendez-vous" },
  { id: "agenda_write", label: "Gestion agenda", description: "Créer/modifier/annuler des RDV" },
  { id: "patients_read", label: "Lecture patients", description: "Consulter les dossiers patients" },
  { id: "patients_write", label: "Gestion patients", description: "Créer/modifier des patients" },
  { id: "consultations", label: "Consultations", description: "Créer des notes de consultation" },
  { id: "prescriptions", label: "Prescriptions", description: "Créer des prescriptions (sous supervision)" },
  { id: "facturation", label: "Facturation", description: "Créer des factures (avec maître de stage)" }
];

const ALL_PERMISSIONS = [...new Set([...PERMISSIONS_SECRETAIRE, ...PERMISSIONS_STAGIAIRE].map(p => p.id))].map(id => 
  PERMISSIONS_SECRETAIRE.find(p => p.id === id) || PERMISSIONS_STAGIAIRE.find(p => p.id === id)
);

export default function LiaisonMedecinSecretaireTab({ user }) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    target_email: "",
    type_liaison: "secretaire",
    permissions: ["agenda_read", "patients_read"],
    ehealth_delegation_active: false,
    stagiaire_nihii: "",
    universite: "",
    annee_stage: 1,
    date_fin: ""
  });

  const { data: liaisons = [], isLoading: isLoadingLiaisons } = useQuery({
    queryKey: ["liaisons", user?.email],
    queryFn: async () => {
      const all = await base44.entities.MedecinSecretaireLiaison.list("-created_date", 100);
      return all.filter(l => l.medecin_email === user?.email);
    },
    enabled: !!user?.email
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const targetUser = users.find(u => u.email === data.target_email);
      const liaisonData = {
        medecin_email: user.email,
        medecin_nom: user.full_name,
        medecin_nihii: user.numero_inami || user.nihii || "",
        secretaire_email: data.target_email,
        secretaire_nom: targetUser?.full_name || data.target_email,
        type_liaison: data.type_liaison,
        permissions: data.permissions,
        statut: "active",
        date_debut: format(new Date(), "yyyy-MM-dd"),
        ehealth_delegation_active: data.ehealth_delegation_active
      };
      
      // Ajouter les infos stagiaire si applicable
      if (data.type_liaison === "stagiaire") {
        liaisonData.stagiaire_nihii = data.stagiaire_nihii;
        liaisonData.universite = data.universite;
        liaisonData.annee_stage = data.annee_stage;
        if (data.date_fin) liaisonData.date_fin = data.date_fin;
      }
      
      return base44.entities.MedecinSecretaireLiaison.create(liaisonData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["liaisons"] });
      toast.success(variables.type_liaison === "stagiaire" ? "Stagiaire lié avec succès" : "Secrétaire liée avec succès");
      setIsDialogOpen(false);
      setFormData({ 
        target_email: "", 
        type_liaison: "secretaire",
        permissions: ["agenda_read", "patients_read"], 
        ehealth_delegation_active: false,
        stagiaire_nihii: "",
        universite: "",
        annee_stage: 1,
        date_fin: ""
      });
    },
    onError: () => toast.error("Erreur lors de la création")
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, statut }) => base44.entities.MedecinSecretaireLiaison.update(id, { statut }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["liaisons"] });
      toast.success("Statut mis à jour");
    }
  });

  const toggleEHealthMutation = useMutation({
    mutationFn: ({ id, value }) => base44.entities.MedecinSecretaireLiaison.update(id, { ehealth_delegation_active: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["liaisons"] });
      toast.success("Délégation eHealth mise à jour");
    }
  });

  const availableUsers = users.filter(u => 
    u.role === "user" && !liaisons.some(l => l.secretaire_email === u.email)
  );

  const getStatusBadge = (status) => {
    const styles = {
      active: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      revoked: "bg-red-100 text-red-700"
    };
    const labels = { active: "Active", pending: "En attente", revoked: "Révoquée" };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  if (isLoadingLiaisons) {
    return <div className="flex items-center justify-center h-32">Chargement...</div>;
  }

  const stagiaires = liaisons.filter(l => l.type_liaison === "stagiaire");
  const secretaires = liaisons.filter(l => l.type_liaison !== "stagiaire");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Équipe & Stagiaires</h3>
          <p className="text-sm text-muted-foreground">Gérez vos secrétaires et stagiaires</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ajouter un collaborateur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {/* Type de liaison */}
              <div>
                <Label>Type</Label>
                <Select 
                  value={formData.type_liaison} 
                  onValueChange={(v) => setFormData({
                    ...formData, 
                    type_liaison: v,
                    permissions: v === "stagiaire" 
                      ? ["agenda_read", "patients_read", "consultations", "facturation"]
                      : ["agenda_read", "patients_read"]
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="secretaire">Secrétaire</SelectItem>
                    <SelectItem value="stagiaire">Médecin stagiaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{formData.type_liaison === "stagiaire" ? "Stagiaire" : "Secrétaire"}</Label>
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

              {/* Champs spécifiques stagiaire */}
              {formData.type_liaison === "stagiaire" && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 flex items-center gap-2">
                    🎓 Informations stagiaire
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>NIHII provisoire</Label>
                      <Input
                        value={formData.stagiaire_nihii}
                        onChange={(e) => setFormData({...formData, stagiaire_nihii: e.target.value})}
                        placeholder="1-XXXXX-XX-XXX"
                      />
                    </div>
                    <div>
                      <Label>Année de stage</Label>
                      <Select 
                        value={String(formData.annee_stage)} 
                        onValueChange={(v) => setFormData({...formData, annee_stage: Number(v)})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1ère année</SelectItem>
                          <SelectItem value="2">2ème année</SelectItem>
                          <SelectItem value="3">3ème année</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Université</Label>
                    <Select 
                      value={formData.universite} 
                      onValueChange={(v) => setFormData({...formData, universite: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UCLouvain">UCLouvain</SelectItem>
                        <SelectItem value="ULB">ULB</SelectItem>
                        <SelectItem value="ULiège">ULiège</SelectItem>
                        <SelectItem value="UNamur">UNamur</SelectItem>
                        <SelectItem value="KULeuven">KU Leuven</SelectItem>
                        <SelectItem value="UGent">UGent</SelectItem>
                        <SelectItem value="UAntwerpen">UAntwerpen</SelectItem>
                        <SelectItem value="VUB">VUB</SelectItem>
                        <SelectItem value="Autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date de fin de stage (optionnel)</Label>
                    <Input
                      type="date"
                      value={formData.date_fin}
                      onChange={(e) => setFormData({...formData, date_fin: e.target.value})}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label className="mb-3 block">Permissions</Label>
                <div className="space-y-3">
                  {(formData.type_liaison === "stagiaire" ? PERMISSIONS_STAGIAIRE : PERMISSIONS_SECRETAIRE).map(perm => (
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
                    L'accès HUB nécessite une délégation eHealth.
                  </AlertDescription>
                  <div className="mt-3 flex items-center gap-2">
                    <Switch
                      checked={formData.ehealth_delegation_active}
                      onCheckedChange={(v) => setFormData({...formData, ehealth_delegation_active: v})}
                    />
                    <span className="text-sm">Activer la délégation</span>
                  </div>
                </Alert>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => createMutation.mutate(formData)}
                  disabled={!formData.target_email || createMutation.isPending}
                >
                  Créer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Section Stagiaires */}
      {stagiaires.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-slate-700 flex items-center gap-2">
            🎓 Stagiaires médecins
          </h4>
          <div className="grid gap-3">
            {stagiaires.map((liaison) => (
              <Card key={liaison.id} className="border-blue-200 bg-blue-50/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-lg">🎓</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{liaison.secretaire_nom}</span>
                          <Badge className="bg-blue-100 text-blue-700">Stagiaire</Badge>
                          {getStatusBadge(liaison.statut)}
                        </div>
                        <p className="text-sm text-gray-500">{liaison.secretaire_email}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          {liaison.stagiaire_nihii && <span>NIHII: {liaison.stagiaire_nihii}</span>}
                          {liaison.universite && <span>• {liaison.universite}</span>}
                          {liaison.annee_stage && <span>• {liaison.annee_stage}ème année</span>}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {liaison.permissions?.map(p => (
                            <Badge key={p} variant="outline" className="text-xs">
                              {ALL_PERMISSIONS.find(perm => perm.id === p)?.label || p}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {liaison.statut !== "revoked" && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: liaison.id, statut: "revoked" })}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Unlink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Section Secrétaires */}
      <div className="space-y-3">
        <h4 className="font-medium text-slate-700 flex items-center gap-2">
          <Users className="w-4 h-4" /> Secrétaires
        </h4>
        {secretaires.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Users className="w-10 h-10 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">Aucune secrétaire liée</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {secretaires.map((liaison) => (
              <Card key={liaison.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{liaison.secretaire_nom}</span>
                          {getStatusBadge(liaison.statut)}
                          {liaison.ehealth_delegation_active && (
                            <Badge className="bg-purple-100 text-purple-700">
                              <Shield className="w-3 h-3 mr-1" />
                              eHealth
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{liaison.secretaire_email}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {liaison.permissions?.map(p => (
                            <Badge key={p} variant="outline" className="text-xs">
                              {ALL_PERMISSIONS.find(perm => perm.id === p)?.label || p}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {liaison.statut !== "revoked" && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg">
                          <span className="text-xs text-gray-500">eHealth</span>
                          <Switch
                            checked={liaison.ehealth_delegation_active}
                            onCheckedChange={(v) => toggleEHealthMutation.mutate({ id: liaison.id, value: v })}
                          />
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: liaison.id, statut: "revoked" })}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Unlink className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}