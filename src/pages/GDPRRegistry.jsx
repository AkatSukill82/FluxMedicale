import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Search, 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  FileText,
  Users,
  Clock,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TREATMENT_REGISTRY = [
  {
    id: 'patient_records',
    name: 'Gestion des dossiers patients',
    purpose: 'Suivi médical et continuité des soins',
    legal_basis: 'Article 9(2)(h) RGPD',
    data_categories: ['Identité', 'Santé', 'Contact'],
    retention: '30 ans après dernière consultation',
    recipients: ['Médecins', 'Secrétariat médical']
  },
  {
    id: 'billing',
    name: 'Facturation et remboursement',
    purpose: 'Gestion administrative et financière',
    legal_basis: 'Article 6(1)(c) RGPD - Obligation légale',
    data_categories: ['Identité', 'NISS', 'Actes médicaux'],
    retention: '10 ans (obligation fiscale)',
    recipients: ['Mutuelles', 'INAMI', 'Comptabilité']
  },
  {
    id: 'prescriptions',
    name: 'Prescriptions médicales',
    purpose: 'Délivrance de médicaments',
    legal_basis: 'Article 9(2)(h) RGPD',
    data_categories: ['Identité', 'Traitements', 'Pathologies'],
    retention: '30 ans',
    recipients: ['Pharmacies (Recip-e)', 'Médecins']
  },
  {
    id: 'hub_sharing',
    name: 'Partage coffres-forts santé',
    purpose: 'Échange de données de santé',
    legal_basis: 'Consentement explicite',
    data_categories: ['Dossier médical complet'],
    retention: 'Selon politique des hubs',
    recipients: ['RSW', 'Vitalink', 'CoZo']
  },
  {
    id: 'appointments',
    name: 'Gestion des rendez-vous',
    purpose: 'Organisation des consultations',
    legal_basis: 'Article 6(1)(b) RGPD - Contrat',
    data_categories: ['Identité', 'Contact', 'Disponibilités'],
    retention: '5 ans',
    recipients: ['Secrétariat', 'Patient (rappels)']
  }
];

export default function GDPRRegistry() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients-gdpr'],
    queryFn: () => base44.entities.Patient.list('-created_date', 500)
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['gdpr-audit-logs'],
    queryFn: () => base44.entities.AuditLog.filter(
      { action: { $regex: 'GDPR' } },
      '-timestamp',
      100
    )
  });

  const getPatientName = (patient) => {
    const name = patient.name?.find(n => n.use === 'official') || {};
    return `${(name.given || []).join(' ')} ${name.family || ''}`.trim();
  };

  const filteredPatients = patients.filter(p => {
    const name = getPatientName(p).toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'consented') return matchesSearch && p.gdpr_consent?.has_consented && !p.gdpr_consent?.revoked;
    if (filterStatus === 'pending') return matchesSearch && !p.gdpr_consent?.has_consented;
    if (filterStatus === 'revoked') return matchesSearch && p.gdpr_consent?.revoked;
    return matchesSearch;
  });

  const stats = {
    total: patients.length,
    consented: patients.filter(p => p.gdpr_consent?.has_consented && !p.gdpr_consent?.revoked).length,
    pending: patients.filter(p => !p.gdpr_consent?.has_consented).length,
    revoked: patients.filter(p => p.gdpr_consent?.revoked).length
  };

  const exportRegistry = () => {
    const data = {
      export_date: new Date().toISOString(),
      organization: 'Cabinet Médical',
      dpo_contact: 'dpo@cabinet.be',
      treatments: TREATMENT_REGISTRY,
      consent_statistics: stats
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registre-rgpd-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Registre RGPD
          </h1>
          <p className="text-slate-600">Registre des traitements et gestion des consentements</p>
        </div>
        <Button onClick={exportRegistry} className="gap-2">
          <Download className="w-4 h-4" />
          Exporter le registre
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-slate-400" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-slate-500">Patients total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-700">{stats.consented}</p>
                <p className="text-xs text-green-600">Consentements actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-orange-700">{stats.pending}</p>
                <p className="text-xs text-orange-600">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-700">{stats.revoked}</p>
                <p className="text-xs text-red-600">Révoqués</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="treatments">
        <TabsList>
          <TabsTrigger value="treatments" className="gap-2">
            <FileText className="w-4 h-4" />
            Registre des traitements
          </TabsTrigger>
          <TabsTrigger value="consents" className="gap-2">
            <Users className="w-4 h-4" />
            Consentements patients
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <Clock className="w-4 h-4" />
            Journal RGPD
          </TabsTrigger>
        </TabsList>

        <TabsContent value="treatments" className="space-y-4 mt-4">
          {TREATMENT_REGISTRY.map((treatment) => (
            <Card key={treatment.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{treatment.name}</CardTitle>
                <CardDescription>{treatment.purpose}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Base légale</p>
                  <Badge variant="outline">{treatment.legal_basis}</Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Données</p>
                  <div className="flex flex-wrap gap-1">
                    {treatment.data_categories.map(cat => (
                      <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Conservation</p>
                  <p className="font-medium">{treatment.retention}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Destinataires</p>
                  <p className="font-medium">{treatment.recipients.join(', ')}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="consents" className="space-y-4 mt-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Rechercher un patient..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant={filterStatus === 'all' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                Tous
              </Button>
              <Button 
                variant={filterStatus === 'consented' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilterStatus('consented')}
                className="gap-1"
              >
                <CheckCircle className="w-3 h-3" />
                Actifs
              </Button>
              <Button 
                variant={filterStatus === 'pending' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilterStatus('pending')}
                className="gap-1"
              >
                <AlertTriangle className="w-3 h-3" />
                En attente
              </Button>
              <Button 
                variant={filterStatus === 'revoked' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setFilterStatus('revoked')}
                className="gap-1"
              >
                <XCircle className="w-3 h-3" />
                Révoqués
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {filteredPatients.slice(0, 50).map(patient => {
              const consent = patient.gdpr_consent;
              const hasConsent = consent?.has_consented && !consent?.revoked;
              const isRevoked = consent?.revoked;
              
              return (
                <Card key={patient.id} className={`${hasConsent ? 'border-green-200' : isRevoked ? 'border-red-200' : 'border-orange-200'}`}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{getPatientName(patient)}</p>
                      <p className="text-xs text-slate-500">
                        {patient.identifier?.find(i => i.system?.includes('ssin'))?.value || 'NISS non renseigné'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {hasConsent && (
                        <div className="text-right">
                          <Badge className="bg-green-600">Consentement actif</Badge>
                          <p className="text-xs text-slate-500 mt-1">
                            v{consent.consent_version} - {format(new Date(consent.consent_date), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      )}
                      {isRevoked && (
                        <div className="text-right">
                          <Badge variant="destructive">Révoqué</Badge>
                          <p className="text-xs text-slate-500 mt-1">
                            {format(new Date(consent.revoked_date), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      )}
                      {!consent?.has_consented && (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          En attente
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4 mt-4">
          <div className="space-y-2">
            {auditLogs.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Aucune action RGPD enregistrée</p>
            ) : (
              auditLogs.map(log => (
                <Card key={log.id}>
                  <CardContent className="p-3 flex items-center gap-4">
                    <Clock className="w-5 h-5 text-slate-400" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{log.action}</p>
                      <p className="text-xs text-slate-500">{log.details}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>{log.user_email}</p>
                      <p>{format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}