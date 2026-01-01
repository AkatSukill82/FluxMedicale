import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  CreditCard,
  User,
  Building2,
  Plus,
  Trash2,
  Calculator,
  Loader2,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function CreateTiersPayantModal({ isOpen, onClose, conventions, onSuccess }) {
  const queryClient = useQueryClient();
  const [patientSearch, setPatientSearch] = useState('');
  const [patientComboOpen, setPatientComboOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedConvention, setSelectedConvention] = useState(null);
  const [statutAssurabilite, setStatutAssurabilite] = useState('standard');
  const [dateSoins, setDateSoins] = useState(new Date().toISOString().split('T')[0]);
  const [prestations, setPrestations] = useState([]);

  // Charger les patients
  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('-created_date', 100)
  });

  // Charger les factures existantes pour lier
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', selectedPatient?.id],
    queryFn: () => base44.entities.Invoice.filter({ patient_id: selectedPatient.id }),
    enabled: !!selectedPatient?.id
  });

  // Charger le médecin connecté
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Reset quand le patient change
  useEffect(() => {
    if (selectedPatient) {
      // Chercher la convention correspondant à la mutuelle du patient
      const patientMutuelle = selectedPatient.mutuelle;
      const matchingConvention = conventions.find(c => 
        c.nom_mutuelle?.toLowerCase().includes(patientMutuelle?.toLowerCase() || '') ||
        patientMutuelle?.toLowerCase().includes(c.nom_mutuelle?.toLowerCase() || '')
      );
      if (matchingConvention) {
        setSelectedConvention(matchingConvention);
      }
    }
  }, [selectedPatient, conventions]);

  // Calcul des montants
  const calculerMontants = () => {
    if (!selectedConvention || prestations.length === 0) {
      return { total: 0, remboursement: 0, ticketModerateur: 0, supplement: 0 };
    }

    let taux = selectedConvention.taux_remboursement_base / 100;
    if (statutAssurabilite === 'bim') {
      taux = selectedConvention.taux_remboursement_bim / 100;
    } else if (statutAssurabilite === 'omnio') {
      taux = selectedConvention.taux_remboursement_omnio / 100;
    }

    const total = prestations.reduce((sum, p) => sum + (p.honoraire || 0), 0);
    const remboursement = prestations.reduce((sum, p) => sum + ((p.honoraire || 0) * taux), 0);
    const ticketModerateur = total - remboursement;
    const supplement = prestations.reduce((sum, p) => sum + (p.supplement || 0), 0);

    return { total, remboursement, ticketModerateur, supplement };
  };

  const montants = calculerMontants();

  // Ajouter une prestation
  const ajouterPrestation = () => {
    setPrestations([
      ...prestations,
      {
        id: Date.now(),
        code_nomenclature: '',
        libelle: '',
        honoraire: 0,
        supplement: 0
      }
    ]);
  };

  const modifierPrestation = (id, field, value) => {
    setPrestations(prestations.map(p => 
      p.id === id ? { ...p, [field]: field === 'honoraire' || field === 'supplement' ? Number(value) : value } : p
    ));
  };

  const supprimerPrestation = (id) => {
    setPrestations(prestations.filter(p => p.id !== id));
  };

  // Mutation de création
  const createMutation = useMutation({
    mutationFn: async () => {
      const patientName = `${selectedPatient.name?.[0]?.given?.[0] || ''} ${selectedPatient.name?.[0]?.family || ''}`.trim();
      const patientNiss = selectedPatient.identifier?.find(i => 
        i.system === 'https://www.ehealth.fgov.be/standards/fhir/core/NamingSystem/ssin'
      )?.value;

      const facture = await base44.entities.TiersPayantFacture.create({
        numero_facture: `TP-${Date.now()}`,
        patient_id: selectedPatient.id,
        patient_name: patientName,
        patient_niss: patientNiss,
        mutuelle_code: selectedConvention.code_mutuelle,
        mutuelle_nom: selectedConvention.nom_mutuelle,
        numero_affiliation: selectedPatient.numero_mutuelle,
        statut_assurabilite: statutAssurabilite,
        date_soins: dateSoins,
        date_facturation: new Date().toISOString().split('T')[0],
        prestations: prestations.map(p => ({
          code_nomenclature: p.code_nomenclature,
          libelle: p.libelle,
          honoraire: p.honoraire,
          remboursement_inami: p.honoraire * (selectedConvention[`taux_remboursement_${statutAssurabilite === 'standard' ? 'base' : statutAssurabilite}`] / 100),
          ticket_moderateur: p.honoraire * (1 - selectedConvention[`taux_remboursement_${statutAssurabilite === 'standard' ? 'base' : statutAssurabilite}`] / 100),
          supplement: p.supplement || 0
        })),
        montant_total_honoraires: montants.total,
        montant_remboursement_inami: montants.remboursement,
        montant_ticket_moderateur: montants.ticketModerateur,
        montant_supplement: montants.supplement,
        montant_a_recevoir_mutuelle: montants.remboursement,
        montant_patient: montants.ticketModerateur + montants.supplement,
        statut: 'brouillon',
        medecin_email: currentUser?.email
      });

      return facture;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiersPayantFactures'] });
      toast.success('Facture tiers payant créée');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    }
  });

  const handleCreate = () => {
    if (!selectedPatient) {
      toast.error('Sélectionnez un patient');
      return;
    }
    if (!selectedConvention) {
      toast.error('Sélectionnez une convention/mutuelle');
      return;
    }
    if (prestations.length === 0) {
      toast.error('Ajoutez au moins une prestation');
      return;
    }
    createMutation.mutate();
  };

  const getPatientName = (patient) => {
    return `${patient.name?.[0]?.given?.[0] || ''} ${patient.name?.[0]?.family || ''}`.trim() || 'Patient sans nom';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Nouvelle facture Tiers Payant
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sélection patient */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Patient
            </Label>
            <Popover open={patientComboOpen} onOpenChange={setPatientComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {selectedPatient ? getPatientName(selectedPatient) : "Sélectionner un patient..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Rechercher..." />
                  <CommandList>
                    <CommandEmpty>Aucun patient trouvé</CommandEmpty>
                    <CommandGroup>
                      {patients.map((patient) => (
                        <CommandItem
                          key={patient.id}
                          value={getPatientName(patient)}
                          onSelect={() => {
                            setSelectedPatient(patient);
                            setPatientComboOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedPatient?.id === patient.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {getPatientName(patient)}
                          {patient.mutuelle && (
                            <Badge variant="outline" className="ml-auto text-xs">
                              {patient.mutuelle}
                            </Badge>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Info patient sélectionné */}
          {selectedPatient && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm">
              <p><strong>Mutuelle:</strong> {selectedPatient.mutuelle || 'Non renseignée'}</p>
              <p><strong>N° affiliation:</strong> {selectedPatient.numero_mutuelle || 'Non renseigné'}</p>
            </div>
          )}

          {/* Convention / Mutuelle */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Convention
              </Label>
              <Select 
                value={selectedConvention?.id || ''} 
                onValueChange={(v) => setSelectedConvention(conventions.find(c => c.id === v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {conventions.map((conv) => (
                    <SelectItem key={conv.id} value={conv.id}>
                      {conv.code_mutuelle} - {conv.nom_mutuelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Statut assurabilité</Label>
              <Select value={statutAssurabilite} onValueChange={setStatutAssurabilite}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="bim">BIM (Intervention majorée)</SelectItem>
                  <SelectItem value="omnio">OMNIO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date des soins */}
          <div className="space-y-2">
            <Label>Date des soins</Label>
            <Input
              type="date"
              value={dateSoins}
              onChange={(e) => setDateSoins(e.target.value)}
            />
          </div>

          {/* Prestations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Prestations
              </Label>
              <Button size="sm" variant="outline" onClick={ajouterPrestation}>
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
            </div>

            {prestations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune prestation. Cliquez sur "Ajouter" pour commencer.
              </p>
            ) : (
              <div className="space-y-2">
                {prestations.map((prestation) => (
                  <div key={prestation.id} className="flex gap-2 items-start p-2 bg-slate-50 rounded">
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      <Input
                        placeholder="Code"
                        value={prestation.code_nomenclature}
                        onChange={(e) => modifierPrestation(prestation.id, 'code_nomenclature', e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Libellé"
                        value={prestation.libelle}
                        onChange={(e) => modifierPrestation(prestation.id, 'libelle', e.target.value)}
                        className="col-span-2 text-sm"
                      />
                      <Input
                        type="number"
                        placeholder="Honoraire"
                        value={prestation.honoraire || ''}
                        onChange={(e) => modifierPrestation(prestation.id, 'honoraire', e.target.value)}
                        className="text-sm"
                        step="0.01"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600"
                      onClick={() => supprimerPrestation(prestation.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Récapitulatif */}
          {selectedConvention && prestations.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3">Récapitulatif</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Total honoraires:</div>
                <div className="text-right font-medium">{montants.total.toFixed(2)} €</div>
                <div>Remboursement INAMI ({statutAssurabilite}):</div>
                <div className="text-right font-medium text-green-700">{montants.remboursement.toFixed(2)} €</div>
                <div>Ticket modérateur:</div>
                <div className="text-right">{montants.ticketModerateur.toFixed(2)} €</div>
                <div className="border-t pt-2 font-semibold">À recevoir de la mutuelle:</div>
                <div className="border-t pt-2 text-right font-bold text-blue-700">{montants.remboursement.toFixed(2)} €</div>
                <div className="font-semibold">Part patient:</div>
                <div className="text-right font-bold">{(montants.ticketModerateur + montants.supplement).toFixed(2)} €</div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Création...
              </>
            ) : (
              'Créer la facture'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}