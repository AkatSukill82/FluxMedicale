import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileText, Download, Send, Eye, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  draft: { label: 'Brouillon', color: 'bg-slate-100 text-slate-800', icon: Clock },
  generated: { label: 'Généré', color: 'bg-blue-100 text-blue-800', icon: FileText },
  sent: { label: 'Envoyé', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  error: { label: 'Erreur', color: 'bg-red-100 text-red-800', icon: Clock }
};

export default function GeneratedReportsList({ reports = [] }) {
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: async (report) => {
      // Récupérer le patient pour l'email
      const patients = await base44.entities.Patient.list();
      const patient = patients.find(p => p.id === report.patient_id);
      const patientEmail = patient?.telecom?.find(t => t.system === 'email')?.value;

      if (!patientEmail) {
        throw new Error('Email du patient non trouvé');
      }

      const currentUser = await base44.auth.me();
      await base44.integrations.Core.SendEmail({
        to: patientEmail,
        subject: `Votre rapport médical - ${format(new Date(), 'dd/MM/yyyy')}`,
        body: `Bonjour,\n\nVeuillez trouver ci-joint votre rapport médical.\n\nCordialement,\nDr. ${currentUser.full_name}`
      });

      await base44.entities.GeneratedReport.update(report.id, {
        status: 'sent',
        sent_to: [...(report.sent_to || []), { email: patientEmail, sent_at: new Date().toISOString() }]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generatedReports'] });
      toast.success('Rapport envoyé');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  if (reports.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Aucun rapport généré</p>
      </div>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Période</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map(report => {
            const statusConfig = STATUS_CONFIG[report.status];
            const StatusIcon = statusConfig?.icon || Clock;

            return (
              <TableRow key={report.id}>
                <TableCell className="font-medium">
                  {format(new Date(report.created_date), 'dd/MM/yyyy HH:mm')}
                </TableCell>
                <TableCell>{report.patient_name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{report.template_name || report.report_type}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(report.period_start), 'dd/MM')} - {format(new Date(report.period_end), 'dd/MM/yyyy')}
                </TableCell>
                <TableCell>
                  <Badge className={statusConfig?.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig?.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {report.pdf_url && (
                      <>
                        <Button size="sm" variant="ghost" asChild>
                          <a href={report.pdf_url} target="_blank" rel="noopener noreferrer">
                            <Eye className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button size="sm" variant="ghost" asChild>
                          <a href={report.pdf_url} download>
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                      </>
                    )}
                    {report.status !== 'sent' && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => sendMutation.mutate(report)}
                        disabled={sendMutation.isPending}
                      >
                        {sendMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}