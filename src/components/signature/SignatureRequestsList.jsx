import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Fingerprint, Smartphone, PenTool, Loader2, FileSignature, CheckCircle2,
  Clock, XCircle, FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const methodIcons = {
  eid: Fingerprint,
  itsme: Smartphone,
  manual: PenTool,
};

const methodLabels = {
  eid: 'eID',
  itsme: 'itsme®',
  manual: 'Manuel',
};

const statusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'En attente' },
  in_progress: { color: 'bg-blue-100 text-blue-700', icon: Loader2, label: 'En cours' },
  signed: { color: 'bg-green-100 text-green-700', icon: CheckCircle2, label: 'Signé' },
  rejected: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Rejeté' },
  expired: { color: 'bg-gray-100 text-gray-700', icon: Clock, label: 'Expiré' },
};

const docTypeLabels = {
  prescription: 'Prescription',
  certificat: 'Certificat',
  sumehr: 'Sumehr',
  rapport: 'Rapport',
  attestation: 'Attestation',
  courrier: 'Courrier',
};

export default function SignatureRequestsList({ requests, search, isLoading, showSign }) {
  const queryClient = useQueryClient();

  const signMutation = useMutation({
    mutationFn: async (req) => {
      // Simulate signing process
      await base44.entities.SignatureRequest.update(req.id, {
        status: 'signed',
        signed_at: new Date().toISOString(),
        signature_hash: `SIG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature-requests'] });
      toast.success('Document signé avec succès');
    },
  });

  const filtered = requests.filter(r => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (r.document_title || '').toLowerCase().includes(term) || (r.patient_name || '').toLowerCase().includes(term);
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  if (filtered.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">
        <FileSignature className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Aucune demande de signature</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map(req => {
        const MethodIcon = methodIcons[req.signature_method] || PenTool;
        const status = statusConfig[req.status] || statusConfig.pending;
        const StatusIcon = status.icon;

        return (
          <Card key={req.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{req.document_title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{docTypeLabels[req.document_type] || req.document_type}</span>
                    {req.patient_name && <span>• {req.patient_name}</span>}
                    {req.created_date && <span>• {format(new Date(req.created_date), 'dd/MM/yy', { locale: fr })}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <Badge variant="outline" className="gap-1 text-xs">
                  <MethodIcon className="w-3 h-3" />
                  {methodLabels[req.signature_method]}
                </Badge>
                <Badge className={status.color}>
                  {status.label}
                </Badge>
                {req.signed_at && (
                  <span className="text-[10px] text-muted-foreground hidden md:block">
                    {format(new Date(req.signed_at), 'dd/MM/yy HH:mm')}
                  </span>
                )}
                {showSign && (req.status === 'pending' || req.status === 'in_progress') && (
                  <Button 
                    size="sm" 
                    onClick={() => signMutation.mutate(req)}
                    disabled={signMutation.isPending}
                  >
                    {signMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <PenTool className="w-3 h-3 mr-1" />}
                    Signer
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}