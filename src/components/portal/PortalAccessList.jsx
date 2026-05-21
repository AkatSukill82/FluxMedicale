import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Eye, Mail, Loader2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PortalAccessList({ accesses, search, isLoading, onPreview }) {
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.PatientPortalAccess.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portal-accesses'] }),
  });

  const filtered = accesses.filter(a => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (a.patient_name || '').toLowerCase().includes(term) || (a.patient_email || '').toLowerCase().includes(term);
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (filtered.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">
        <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Aucun accès patient configuré</p>
        <p className="text-sm mt-1">Accordez un accès à vos patients pour qu'ils puissent consulter leurs données</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map(access => (
        <Card key={access.id} className="hover:shadow-sm transition-shadow">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-semibold text-blue-600 text-sm">
                  {(access.patient_name || '?')[0]}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{access.patient_name || 'Patient'}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-3 h-3" />
                  <span className="truncate">{access.patient_email || 'Pas d\'email'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <Badge variant={access.is_active ? 'default' : 'secondary'} className={access.is_active ? 'bg-green-100 text-green-700' : ''}>
                {access.is_active ? 'Actif' : 'Désactivé'}
              </Badge>
              {access.last_login && (
                <span className="text-xs text-muted-foreground hidden md:block">
                  Dernière connexion: {format(new Date(access.last_login), 'dd/MM/yy HH:mm', { locale: fr })}
                </span>
              )}
              <Switch 
                checked={access.is_active}
                onCheckedChange={(checked) => toggleMutation.mutate({ id: access.id, is_active: checked })}
              />
              <Button variant="ghost" size="sm" onClick={() => onPreview(access)}>
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}