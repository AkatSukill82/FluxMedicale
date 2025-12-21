import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  Eye, 
  Search, 
  Calendar, 
  User, 
  FileText,
  AlertTriangle,
  TrendingUp,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AuditSecurity() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const { data: accessLogs = [], isLoading } = useQuery({
    queryKey: ['access-logs'],
    queryFn: () => base44.entities.DataAccessLog.list('-timestamp', 500)
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list()
  });

  const filteredLogs = accessLogs.filter(log => {
    const matchSearch = !searchTerm || 
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.patient_id?.includes(searchTerm);
    
    const matchDate = !dateFilter || 
      log.timestamp?.startsWith(dateFilter);
    
    return matchSearch && matchDate;
  });

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return 'Patient inconnu';
    const name = patient.name?.[0];
    return name ? `${name.given?.join(' ')} ${name.family}` : 'N/A';
  };

  const getActionColor = (action) => {
    const colors = {
      VIEW: 'bg-blue-100 text-blue-800',
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-yellow-100 text-yellow-800',
      DELETE: 'bg-red-100 text-red-800',
      EXPORT: 'bg-purple-100 text-purple-800',
      PRINT: 'bg-orange-100 text-orange-800'
    };
    return colors[action] || 'bg-slate-100 text-slate-800';
  };

  const exportLogs = () => {
    const csv = [
      ['Date/Heure', 'Utilisateur', 'Patient', 'Action', 'Type', 'Justification'].join(';'),
      ...filteredLogs.map(log => [
        log.timestamp,
        log.user_email,
        getPatientName(log.patient_id),
        log.action,
        log.resource_type,
        log.justification || ''
      ].join(';'))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.csv`;
    a.click();
  };

  // Statistiques
  const stats = {
    totalAccess: accessLogs.length,
    uniqueUsers: new Set(accessLogs.map(l => l.user_email)).size,
    sensitiveActions: accessLogs.filter(l => ['EXPORT', 'PRINT', 'DELETE'].includes(l.action)).length,
    last24h: accessLogs.filter(l => {
      const logDate = new Date(l.timestamp);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return logDate > yesterday;
    }).length
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            Audit de Sécurité & RGPD
          </h1>
          <p className="text-slate-600 mt-1">
            Traçabilité complète des accès aux données patients
          </p>
        </div>
        <Button onClick={exportLogs} className="gap-2">
          <Download className="w-4 h-4" />
          Exporter CSV
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Accès</p>
                <p className="text-3xl font-bold">{stats.totalAccess}</p>
              </div>
              <Eye className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Utilisateurs</p>
                <p className="text-3xl font-bold">{stats.uniqueUsers}</p>
              </div>
              <User className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Actions Sensibles</p>
                <p className="text-3xl font-bold">{stats.sensitiveActions}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Dernières 24h</p>
                <p className="text-3xl font-bold">{stats.last24h}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                placeholder="Rechercher par email ou ID patient..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Journal d'Accès ({filteredLogs.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            {isLoading ? (
              <p className="text-center py-12 text-slate-500">Chargement...</p>
            ) : filteredLogs.length === 0 ? (
              <p className="text-center py-12 text-slate-500">Aucun log trouvé</p>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log, idx) => (
                  <Card key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getActionColor(log.action)}>
                            {log.action}
                          </Badge>
                          <Badge variant="outline">
                            {log.resource_type}
                          </Badge>
                          <span className="text-sm text-slate-600">
                            {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-slate-600">Utilisateur:</span>
                            <span className="font-semibold ml-2">{log.user_email}</span>
                          </div>
                          <div>
                            <span className="text-slate-600">Patient:</span>
                            <span className="font-semibold ml-2">{getPatientName(log.patient_id)}</span>
                          </div>
                        </div>
                        {log.justification && (
                          <div className="p-2 bg-amber-50 rounded border border-amber-200">
                            <p className="text-xs text-slate-600">Justification:</p>
                            <p className="text-sm">{log.justification}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}