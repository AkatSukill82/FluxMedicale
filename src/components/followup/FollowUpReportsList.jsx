import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
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
import { FileText, Download, Send, Eye, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const REPORT_TYPES = {
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
  custom: 'Personnalisé'
};

export default function FollowUpReportsList({ patientId }) {
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['followUpReports', patientId],
    queryFn: async () => {
      if (patientId) {
        return base44.entities.FollowUpReport.filter({ patient_id: patientId }, '-created_date', 50);
      }
      return base44.entities.FollowUpReport.list('-created_date', 100);
    }
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  }

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
            {!patientId && <TableHead>Patient</TableHead>}
            <TableHead>Type</TableHead>
            <TableHead>Période</TableHead>
            <TableHead>Adhérence</TableHead>
            <TableHead>Envoyé</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map(report => (
            <TableRow key={report.id}>
              <TableCell className="font-medium">
                {format(new Date(report.created_date), 'dd/MM/yyyy')}
              </TableCell>
              {!patientId && (
                <TableCell>{report.patient_name}</TableCell>
              )}
              <TableCell>
                <Badge variant="outline">{REPORT_TYPES[report.report_type]}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(report.period_start), 'dd/MM')} - {format(new Date(report.period_end), 'dd/MM/yyyy')}
              </TableCell>
              <TableCell>
                <span className={`font-medium ${
                  report.adherence_average >= 80 ? 'text-green-600' :
                  report.adherence_average >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {report.adherence_average || '-'}%
                </span>
              </TableCell>
              <TableCell>
                {report.sent_to_patient ? (
                  <Badge className="bg-green-100 text-green-800 gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Oui
                  </Badge>
                ) : (
                  <Badge variant="outline">Non</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {report.pdf_url && (
                    <Button size="sm" variant="ghost" asChild>
                      <a href={report.pdf_url} target="_blank" rel="noopener noreferrer">
                        <Eye className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  {report.pdf_url && (
                    <Button size="sm" variant="ghost" asChild>
                      <a href={report.pdf_url} download>
                        <Download className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}