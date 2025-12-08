
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Server } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const MODULE_LABELS = {
  recipE: { name: 'Recip-e', description: 'e-Prescriptions KMEHR 1.28' },
  myCareNet: { name: 'MyCareNet', description: 'Assurabilité, eAttest, eFact' },
  eHealthBox: { name: 'eHealthBox v3.0', description: 'Messages et résultats sécurisés (MTOM, WS-Security)' },
  hub: { name: 'HUB/Metahub', description: 'Partage de données interrégional' },
  dmg: { name: 'eDMG', description: 'Dossier Médical Global' },
  vidis: { name: 'VIDIS (Write)', description: 'Schéma de médication partagé (lecture + écriture)' },
  vaccinations: { name: 'Vaccinations', description: 'Vaccinnet+ (VL) / e-vax (FWB)' },
  mediPrima: { name: 'MediPrima', description: 'Facturation CPAS' },
  importExport: { name: 'Import/Export', description: 'PMF, SMF, KMEHR' },
  annexe82: { name: 'Annexe 82', description: 'Canevas demandes imagerie' },
  timeline: { name: 'Timeline+SumEHR', description: 'Vue chronologique unifiée' },
  idSupport: { name: 'IdSupport', description: 'Vérification validité carte d\'identité' },
  eMediAtt: { name: 'eMediAtt', description: 'Attestations d\'incapacité → Medex' }
};

export default function ModuleInventory({ moduleStatuses }) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'OK':
        return (
          <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Opérationnel
          </Badge>
        );
      case 'PARTIAL':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Partiel
          </Badge>
        );
      case 'NOT_CONFIGURED':
        return (
          <Badge className="bg-gray-100 text-gray-800 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Non configuré
          </Badge>
        );
      default:
        return (
          <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Erreur
          </Badge>
        );
    }
  };

  const getEndpointBadge = (endpoint) => {
    if (!endpoint) return null;
    
    const colors = {
      'acceptance': 'bg-blue-100 text-blue-800',
      'prod': 'bg-purple-100 text-purple-800',
      'local': 'bg-slate-100 text-slate-800'
    };

    return (
      <Badge variant="outline" className={colors[endpoint] || 'bg-slate-100 text-slate-800'}>
        {endpoint.toUpperCase()}
      </Badge>
    );
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-600" />
          Inventaire des Modules eHealth
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(moduleStatuses).map(([moduleKey, status]) => {
            const module = MODULE_LABELS[moduleKey];
            
            return (
              <div key={moduleKey} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-semibold text-slate-900">{module?.name || moduleKey}</h4>
                    {getStatusBadge(status.status)}
                    {getEndpointBadge(status.endpoint)}
                  </div>
                  <p className="text-sm text-slate-600">{module?.description || 'Description non disponible'}</p>
                  {status.lastSuccess && (
                    <p className="text-xs text-slate-500 mt-1">
                      Dernier succès: {format(new Date(status.lastSuccess), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Légende */}
        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <h5 className="font-semibold text-slate-900 mb-2">Légende</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-slate-600">Opérationnel</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-slate-600">Partiel</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-gray-600" />
              <span className="text-slate-600">Non configuré</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-slate-600">Erreur</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
