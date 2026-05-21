import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, History, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const statusConfig = {
  completed: { color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  generating: { color: 'bg-blue-100 text-blue-700', icon: Loader2 },
  error: { color: 'bg-red-100 text-red-700', icon: AlertTriangle },
};

export default function ExportHistoryList({ history }) {
  if (history.length === 0) {
    return (
      <Card><CardContent className="py-8 text-center text-muted-foreground">
        <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Aucun export précédent</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-2">
      {history.map(exp => {
        const status = statusConfig[exp.status] || statusConfig.completed;
        const StatusIcon = status.icon;
        return (
          <Card key={exp.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <StatusIcon className={`w-5 h-5 ${exp.status === 'generating' ? 'animate-spin text-blue-500' : exp.status === 'error' ? 'text-red-500' : 'text-green-500'}`} />
                <div>
                  <p className="font-medium text-sm">{exp.export_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {exp.period_start} → {exp.period_end} • {exp.invoice_count} facture(s) • {((exp.total_amount || 0) / 100).toFixed(2)}€
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={status.color}>{exp.status}</Badge>
                {exp.created_date && (
                  <span className="text-xs text-muted-foreground hidden md:block">
                    {format(new Date(exp.created_date), 'dd/MM/yy HH:mm', { locale: fr })}
                  </span>
                )}
                {exp.file_url && exp.status === 'completed' && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={exp.file_url} download><Download className="w-4 h-4" /></a>
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