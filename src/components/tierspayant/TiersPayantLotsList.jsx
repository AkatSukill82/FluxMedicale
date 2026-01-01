import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Package,
  Send,
  CheckCircle,
  Clock,
  Download,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const LOT_STATUT_CONFIG = {
  en_preparation: { label: 'En préparation', color: 'bg-slate-100 text-slate-800' },
  pret: { label: 'Prêt à envoyer', color: 'bg-yellow-100 text-yellow-800' },
  envoye: { label: 'Envoyé', color: 'bg-blue-100 text-blue-800' },
  accuse_reception: { label: 'Accusé réception', color: 'bg-indigo-100 text-indigo-800' },
  traite: { label: 'Traité', color: 'bg-green-100 text-green-800' },
  paye: { label: 'Payé', color: 'bg-emerald-100 text-emerald-800' }
};

export default function TiersPayantLotsList({ lots }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Lots d'envoi
          </CardTitle>
          <Button>
            <Package className="w-4 h-4 mr-2" />
            Créer un lot
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {lots.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun lot d'envoi créé
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Lot</TableHead>
                <TableHead>Mutuelle</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Factures</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lots.map((lot) => {
                const statutConfig = LOT_STATUT_CONFIG[lot.statut] || LOT_STATUT_CONFIG.en_preparation;

                return (
                  <TableRow key={lot.id}>
                    <TableCell className="font-mono">{lot.numero_lot}</TableCell>
                    <TableCell>{lot.mutuelle_nom || lot.mutuelle_code}</TableCell>
                    <TableCell>
                      {lot.periode_debut && lot.periode_fin && (
                        <span className="text-sm">
                          {format(new Date(lot.periode_debut), 'dd/MM', { locale: fr })} - {format(new Date(lot.periode_fin), 'dd/MM/yy', { locale: fr })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{lot.nombre_factures || 0}</TableCell>
                    <TableCell className="text-right font-medium">
                      {lot.montant_total?.toFixed(2)} €
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {lot.mode_envoi?.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statutConfig.color}>
                        {statutConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {lot.statut === 'pret' && (
                          <Button variant="ghost" size="icon">
                            <Send className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}