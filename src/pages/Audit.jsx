import React, { useState, useEffect } from 'react';
import { AuditLog } from "@/entities/AuditLog";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Shield, Search, Filter, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import RBACGuard, { PERMISSIONS } from "../components/auth/RBACGuard";

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUser, setFilterUser] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    loadCurrentUser();
    loadLogs();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (error) {
      console.error("Erreur chargement utilisateur:", error);
    }
  };

  const loadLogs = async () => {
    try {
      const logData = await AuditLog.list("-timestamp");
      setLogs(logData);
    } catch (error) {
      console.error("Erreur chargement du journal d'audit:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.target_entity?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUser = filterUser === "all" || log.user_email === filterUser;
    const matchesAction = filterAction === "all" || log.action.includes(filterAction);
    
    let matchesDateRange = true;
    if (startDate && endDate) {
      const logDate = new Date(log.timestamp);
      matchesDateRange = logDate >= new Date(startDate) && logDate <= new Date(endDate);
    }
    
    return matchesSearch && matchesUser && matchesAction && matchesDateRange;
  });

  const exportToCSV = () => {
    const headers = ["Timestamp", "Utilisateur", "Action", "Entité", "ID Entité", "Détails"];
    const csvRows = [
      headers.join(','),
      ...filteredLogs.map(log => [
        `"${format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}"`,
        `"${log.user_email}"`,
        `"${log.action}"`,
        `"${log.target_entity || ''}"`,
        `"${log.target_id || ''}"`,
        `"${(log.details || '').replace(/"/g, '""')}"`
      ].join(','))
    ];
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `audit_log_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uniqueUsers = [...new Set(logs.map(log => log.user_email))];
  const uniqueActions = [...new Set(logs.map(log => log.action.split('_')[0]))];

  return (
    <RBACGuard user={currentUser} permission={PERMISSIONS.VIEW_AUDIT}>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Journal d'Audit</h1>
            <p className="text-slate-600">Traçabilité complète des actions système - Conformité RGPD</p>
          </div>
          <Button onClick={exportToCSV} disabled={filteredLogs.length === 0} className="shadow-lg">
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Événements</p>
                  <p className="text-2xl font-bold text-slate-900">{logs.length}</p>
                </div>
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Aujourd'hui</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {logs.filter(log => format(new Date(log.timestamp), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Utilisateurs Actifs</p>
                  <p className="text-2xl font-bold text-slate-900">{uniqueUsers.length}</p>
                </div>
                <Shield className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Filtrés</p>
                  <p className="text-2xl font-bold text-slate-900">{filteredLogs.length}</p>
                </div>
                <Filter className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les utilisateurs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les utilisateurs</SelectItem>
                  {uniqueUsers.map(user => (
                    <SelectItem key={user} value={user}>{user}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les actions</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                placeholder="Date début"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                type="date"
                placeholder="Date fin"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Journal */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Événements d'audit ({filteredLogs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Horodatage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Utilisateur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cible
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Détails
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="text-center p-8 text-slate-500">
                        Chargement des données d'audit...
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center p-8 text-slate-500">
                        Aucun événement d'audit trouvé
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: fr })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.user_email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            log.action.includes('CREATION') ? 'bg-green-100 text-green-800' :
                            log.action.includes('MODIFICATION') ? 'bg-blue-100 text-blue-800' :
                            log.action.includes('SUPPRESSION') ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.target_entity} {log.target_id && `(${log.target_id})`}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Note légale */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Conformité Légale</h4>
                <p className="text-sm text-blue-700">
                  Ce journal d'audit respecte les exigences du RGPD et de la législation belge sur les données de santé.
                  Les données sont conservées de manière sécurisée et sont accessibles uniquement aux personnes autorisées.
                  Rétention : 10 ans minimum conformément aux obligations légales belges.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </RBACGuard>
  );
}