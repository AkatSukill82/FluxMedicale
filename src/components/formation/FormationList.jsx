import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, CheckCircle, Clock, XCircle, Search, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const categoryLabels = {
  ethique: 'Éthique', peer_review: 'Peer Review', congres: 'Congrès',
  elearning: 'E-Learning', seminaire: 'Séminaire', glem: 'GLEM', autre: 'Autre'
};

const statusConfig = {
  planifiee: { label: 'Planifiée', color: 'bg-blue-100 text-blue-700', icon: Clock },
  completee: { label: 'Complétée', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  annulee: { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: XCircle },
  en_attente_validation: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock }
};

export default function FormationList({ formations, isLoading, onEdit, onDelete, onStatusChange }) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = formations.filter(f => {
    const matchSearch = !search || f.title?.toLowerCase().includes(search.toLowerCase()) || f.organizer?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || f.category === filterCat;
    const matchStatus = filterStatus === 'all' || f.status === filterStatus;
    return matchSearch && matchCat && matchStatus;
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {Object.entries(categoryLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Aucune formation trouvée</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(f => {
            const sc = statusConfig[f.status] || statusConfig.planifiee;
            const StatusIcon = sc.icon;
            return (
              <Card key={f.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{f.title}</h3>
                        <Badge className={sc.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {sc.label}
                        </Badge>
                        <Badge variant="outline">{categoryLabels[f.category] || f.category}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {f.organizer && <span>{f.organizer}</span>}
                        <span>{format(new Date(f.date), 'dd MMM yyyy', { locale: fr })}</span>
                        {f.duration_hours && <span>{f.duration_hours}h</span>}
                        {f.credits_cp > 0 && <span className="text-blue-600 font-medium">{f.credits_cp} CP</span>}
                        {f.credits_ea > 0 && <span className="text-purple-600 font-medium">{f.credits_ea} EA</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {f.certificate_url && (
                        <Button variant="ghost" size="icon" onClick={() => window.open(f.certificate_url, '_blank')}>
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                      {f.status === 'planifiee' && (
                        <Button variant="ghost" size="icon" onClick={() => onStatusChange(f.id, 'completee')}>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => onEdit(f)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(f.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}