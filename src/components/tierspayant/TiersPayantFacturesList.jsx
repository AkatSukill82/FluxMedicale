import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Euro,
  MoreVertical,
  Search,
  Eye,
  Pencil,
  Trash2,
  Download,
  CreditCard
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import TiersPayantDetailModal from './TiersPayantDetailModal';
import EnregistrerPaiementModal from './EnregistrerPaiementModal';

const STATUT_CONFIG = {
  brouillon: { label: 'Brouillon', color: 'bg-slate-100 text-slate-800', icon: FileText },
  envoyee: { label: 'Envoyée', color: 'bg-blue-100 text-blue-800', icon: Send },
  acceptee: { label: 'Acceptée', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  payee: { label: 'Payée', color: 'bg-emerald-100 text-emerald-800', icon: Euro },
  partielle: { label: 'Partiel', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  refusee: { label: 'Refusée', color: 'bg-red-100 text-red-800', icon: XCircle },
  contestee: { label: 'Contestée', color: 'bg-purple-100 text-purple-800', icon: AlertTriangle }
};

export default function TiersPayantFacturesList({ factures, conventions, onRefresh }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('all');
  const [filterMutuelle, setFilterMutuelle] = useState('all');
  const [selectedFacture, setSelectedFacture] = useState(null);
  const [showPaiementModal, setShowPaiementModal] = useState(false);
  const [paiementFacture, setPaiementFacture] = useState(null);

  // Mutation pour envoyer une facture
  const envoyerMutation = useMutation({
    mutationFn: async (factureId) => {
      // Simuler l'envoi MyCareNet
      await base44.entities.TiersPayantFacture.update(factureId, {
        statut: 'envoyee',
        date_envoi: new Date().toISOString().split('T')[0]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiersPayantFactures'] });
      toast.success('Facture envoyée à la mutuelle');
      onRefresh?.();
    }
  });

  // Mutation pour supprimer
  const supprimerMutation = useMutation({
    mutationFn: (factureId) => base44.entities.TiersPayantFacture.delete(factureId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tiersPayantFactures'] });
      toast.success('Facture supprimée');
      onRefresh?.();
    }
  });

  // Filtrage
  const filteredFactures = factures.filter(f => {
    const matchSearch = !searchTerm || 
      f.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.numero_facture?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatut = filterStatut === 'all' || f.statut === filterStatut;
    const matchMutuelle = filterMutuelle === 'all' || f.mutuelle_code === filterMutuelle;
    return matchSearch && matchStatut && matchMutuelle;
  });

  // Mutuelles uniques pour le filtre
  const mutuellesUniques = [...new Set(factures.map(f => f.mutuelle_code).filter(Boolean))];

  const handleEnvoyerFacture = (facture) => {
    if (confirm(`Envoyer la facture ${facture.numero_facture} à ${facture.mutuelle_nom} ?`)) {
      envoyerMutation.mutate(facture.id);
    }
  };

  const handleSupprimer = (facture) => {
    if (confirm(`Supprimer la facture ${facture.numero_facture} ?`)) {
      supprimerMutation.mutate(facture.id);
    }
  };

  const handleEnregistrerPaiement = (facture) => {
    setPaiementFacture(facture);
    setShowPaiementModal(true);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Factures Tiers Payant</CardTitle>
          <Badge variant="outline">{filteredFactures.length} facture(s)</Badge>
        </div>
        
        {/* Filtres */}
        <div className="flex flex-wrap gap-3 mt-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher patient, n° facture..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatut} onValueChange={setFilterStatut}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              {Object.entries(STATUT_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterMutuelle} onValueChange={setFilterMutuelle}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Mutuelle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes mutuelles</SelectItem>
              {mutuellesUniques.map((code) => (
                <SelectItem key={code} value={code}>{code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {filteredFactures.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucune facture tiers payant
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Facture</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Mutuelle</TableHead>
                  <TableHead>Date soins</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">À recevoir</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFactures.map((facture) => {
                  const statutConfig = STATUT_CONFIG[facture.statut] || STATUT_CONFIG.brouillon;
                  const StatusIcon = statutConfig.icon;

                  return (
                    <TableRow key={facture.id} className="cursor-pointer hover:bg-slate-50">
                      <TableCell className="font-mono text-sm">
                        {facture.numero_facture || '-'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{facture.patient_name}</p>
                          <p className="text-xs text-muted-foreground">{facture.patient_niss}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{facture.mutuelle_nom || facture.mutuelle_code}</p>
                          <p className="text-xs text-muted-foreground">
                            {facture.statut_assurabilite?.toUpperCase()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {facture.date_soins && format(new Date(facture.date_soins), 'dd/MM/yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {facture.montant_total_honoraires?.toFixed(2)} €
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium text-blue-600">
                          {facture.montant_a_recevoir_mutuelle?.toFixed(2)} €
                        </span>
                        {facture.ecart_paiement && facture.ecart_paiement !== 0 && (
                          <p className={`text-xs ${facture.ecart_paiement < 0 ? 'text-red-600' : 'text-orange-600'}`}>
                            Écart: {facture.ecart_paiement.toFixed(2)} €
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statutConfig.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statutConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedFacture(facture)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Voir détails
                            </DropdownMenuItem>
                            {facture.statut === 'brouillon' && (
                              <>
                                <DropdownMenuItem onClick={() => handleEnvoyerFacture(facture)}>
                                  <Send className="w-4 h-4 mr-2" />
                                  Envoyer
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleSupprimer(facture)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </>
                            )}
                            {(facture.statut === 'envoyee' || facture.statut === 'acceptee') && (
                              <DropdownMenuItem onClick={() => handleEnregistrerPaiement(facture)}>
                                <CreditCard className="w-4 h-4 mr-2" />
                                Enregistrer paiement
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Download className="w-4 h-4 mr-2" />
                              Télécharger PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Modal détails */}
      {selectedFacture && (
        <TiersPayantDetailModal
          facture={selectedFacture}
          isOpen={!!selectedFacture}
          onClose={() => setSelectedFacture(null)}
        />
      )}

      {/* Modal paiement */}
      {showPaiementModal && paiementFacture && (
        <EnregistrerPaiementModal
          facture={paiementFacture}
          isOpen={showPaiementModal}
          onClose={() => {
            setShowPaiementModal(false);
            setPaiementFacture(null);
          }}
          onSuccess={() => {
            onRefresh?.();
            setShowPaiementModal(false);
            setPaiementFacture(null);
          }}
        />
      )}
    </Card>
  );
}