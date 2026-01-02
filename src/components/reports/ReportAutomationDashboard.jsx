import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Settings,
  BarChart3,
  Send,
  Plus,
  Calendar,
  Clock,
  TrendingUp,
  Users,
  Stethoscope
} from 'lucide-react';
import { format, subMonths, subWeeks } from 'date-fns';
import ReportTemplatesList from './ReportTemplatesList';
import ReportGenerator from './ReportGenerator';
import GeneratedReportsList from './GeneratedReportsList';
import ReportAnalyticsDashboard from './ReportAnalyticsDashboard';

export default function ReportAutomationDashboard() {
  const [activeTab, setActiveTab] = useState('generator');
  const [showGenerator, setShowGenerator] = useState(false);

  // Stats rapides
  const { data: reports = [] } = useQuery({
    queryKey: ['generatedReports'],
    queryFn: () => base44.entities.GeneratedReport.list('-created_date', 100)
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['reportTemplates'],
    queryFn: () => base44.entities.ReportTemplate.list()
  });

  const stats = {
    totalReports: reports.length,
    sentThisMonth: reports.filter(r => {
      const date = new Date(r.created_date);
      return date >= subMonths(new Date(), 1) && r.status === 'sent';
    }).length,
    autoReports: templates.filter(t => t.auto_send && t.frequency !== 'manual').length,
    pendingReports: reports.filter(r => r.status === 'generated').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rapports médicaux automatisés</h1>
          <p className="text-muted-foreground">Génération, personnalisation et envoi automatique</p>
        </div>
        <Button onClick={() => setShowGenerator(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Générer un rapport
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalReports}</p>
                <p className="text-xs text-muted-foreground">Rapports générés</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Send className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.sentThisMonth}</p>
                <p className="text-xs text-muted-foreground">Envoyés ce mois</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.autoReports}</p>
                <p className="text-xs text-muted-foreground">Rapports auto</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingReports}</p>
                <p className="text-xs text-muted-foreground">En attente d'envoi</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="generator" className="gap-2">
            <FileText className="w-4 h-4" />
            Rapports générés
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Settings className="w-4 h-4" />
            Modèles
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytiques
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="mt-4">
          <GeneratedReportsList reports={reports} />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <ReportTemplatesList templates={templates} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <ReportAnalyticsDashboard />
        </TabsContent>
      </Tabs>

      {/* Modal générateur */}
      {showGenerator && (
        <ReportGenerator
          isOpen={showGenerator}
          onClose={() => setShowGenerator(false)}
          templates={templates}
        />
      )}
    </div>
  );
}