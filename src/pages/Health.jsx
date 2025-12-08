import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { AuditLog } from '@/entities/AuditLog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  CheckCircle2,
  Shield,
  Download,
  RefreshCw,
  Server,
  Lock
} from 'lucide-react';

import ModuleInventory from '../components/health/ModuleInventory';
import ModuleTests from '../components/health/ModuleTests';
import SecurityCheck from '../components/health/SecurityCheck';
import { useHealthCheck } from '../components/health/useHealthCheck';

export default function HealthPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [auditCount24h, setAuditCount24h] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const { 
    moduleStatuses, 
    testResults, 
    isRunningTests, 
    runAllTests,
    exportReport 
  } = useHealthCheck();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
      
      // Compter les logs d'audit des dernières 24h
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const logs = await AuditLog.list('-timestamp');
      const recentLogs = logs.filter(log => log.timestamp > yesterday);
      setAuditCount24h(recentLogs.length);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Vérification des permissions - seuls les admin
  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Accès restreint</h3>
          <p className="text-slate-600">Seuls les administrateurs peuvent accéder à cette page.</p>
        </div>
      </div>
    );
  }

  const getOverallStatus = () => {
    const statuses = Object.values(moduleStatuses);
    const okCount = statuses.filter(s => s.status === 'OK').length;
    const totalCount = statuses.length;
    
    if (okCount === totalCount) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' };
    if (okCount >= totalCount * 0.7) return { label: 'Bon', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (okCount >= totalCount * 0.5) return { label: 'Moyen', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { label: 'Critique', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const overallStatus = getOverallStatus();

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Configuration & Health Check</h1>
          <p className="text-slate-600">Diagnostic et tests d'intégration eHealth</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={runAllTests} 
            disabled={isRunningTests}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isRunningTests ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Tests en cours...
              </>
            ) : (
              <>
                <Activity className="w-4 h-4 mr-2" />
                Lancer tous les tests
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={exportReport}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exporter le rapport
          </Button>
        </div>
      </div>

      {/* Vue d'ensemble */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">État Global</p>
                <p className={`text-2xl font-bold ${overallStatus.color}`}>
                  {overallStatus.label}
                </p>
              </div>
              <div className={`p-3 rounded-full ${overallStatus.bg}`}>
                <Server className={`w-6 h-6 ${overallStatus.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Modules Actifs</p>
                <p className="text-2xl font-bold text-slate-900">
                  {Object.values(moduleStatuses).filter(s => s.status === 'OK').length} / {Object.keys(moduleStatuses).length}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Tests Réussis</p>
                <p className="text-2xl font-bold text-slate-900">
                  {Object.values(testResults).filter(t => t?.success).length} / {Object.keys(testResults).length}
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Audit 24h</p>
                <p className="text-2xl font-bold text-slate-900">{auditCount24h}</p>
              </div>
              <Lock className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets */}
      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory">Inventaire Modules</TabsTrigger>
          <TabsTrigger value="tests">Tests d'Intégration</TabsTrigger>
          <TabsTrigger value="security">Sécurité & Conformité</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <ModuleInventory moduleStatuses={moduleStatuses} />
        </TabsContent>

        <TabsContent value="tests">
          <ModuleTests 
            testResults={testResults} 
            isRunningTests={isRunningTests}
            onRunTests={runAllTests}
          />
        </TabsContent>

        <TabsContent value="security">
          <SecurityCheck auditCount24h={auditCount24h} />
        </TabsContent>
      </Tabs>

      {/* Note de conformité */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Conformité eHealth Belgique</h4>
              <p className="text-sm text-blue-700">
                Cette page vérifie la conformité avec les standards eHealth belges : MyCareNet, Recip-e, eHealthBox, HUB/Metahub, KMEHR 1.28.
                Tous les tests utilisent les environnements d'acceptance/sandbox. Les résultats sont automatiquement audités.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}