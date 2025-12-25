import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle,
  Pill,
  Calendar,
  Bell,
  PackageX,
  TrendingUp,
  Copy,
  Send,
  Loader2
} from 'lucide-react';
import { format, differenceInDays, addDays, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

// Médicaments avec ruptures connues (simulation - en production: API AFMPS)
const STOCK_ALERTS = {
  'AMOXICILLINE': { status: 'limited', message: 'Stock limité jusqu\'à janvier 2025' },
  'OZEMPIC': { status: 'shortage', message: 'Rupture de stock - Alternative: Trulicity' },
  'ADDERALL': { status: 'shortage', message: 'Indisponible en Belgique' }
};

export default function RenewalTracker({ patient, prescriptions, onRenew, onDuplicate }) {
  const queryClient = useQueryClient();

  // Calculer les prescriptions à renouveler
  const renewalAnalysis = React.useMemo(() => {
    if (!prescriptions?.length) return { urgent: [], upcoming: [], chronic: [] };

    const now = new Date();
    const analyzed = prescriptions
      .filter(p => p.tracking_status === 'ACTIVE' || !p.tracking_status)
      .map(p => {
        const startDate = new Date(p.date_prescription);
        const medications = p.medicaments || [];
        
        // Estimer la fin du traitement basé sur la durée
        let endDate = null;
        let daysRemaining = null;
        
        const durations = medications.map(m => {
          const match = m.duree_traitement?.match(/(\d+)/);
          if (match) {
            const days = m.duree_traitement.toLowerCase().includes('mois') 
              ? parseInt(match[1]) * 30 
              : parseInt(match[1]);
            return days;
          }
          return 30; // Par défaut 30 jours
        });

        if (durations.length > 0) {
          const maxDuration = Math.max(...durations);
          endDate = addDays(startDate, maxDuration);
          daysRemaining = differenceInDays(endDate, now);
        }

        // Vérifier les alertes de stock
        const stockAlerts = medications
          .map(m => {
            const name = m.nom_produit?.toUpperCase() || '';
            for (const [drug, alert] of Object.entries(STOCK_ALERTS)) {
              if (name.includes(drug)) return { medication: m.nom_produit, ...alert };
            }
            return null;
          })
          .filter(Boolean);

        // Déterminer si c'est un traitement chronique
        const isChronic = medications.some(m => {
          const duration = m.duree_traitement?.toLowerCase() || '';
          return duration.includes('mois') || duration.includes('chronique') || parseInt(duration) >= 30;
        });

        return {
          ...p,
          endDate,
          daysRemaining,
          stockAlerts,
          isChronic,
          needsRenewal: daysRemaining !== null && daysRemaining <= 7,
          urgentRenewal: daysRemaining !== null && daysRemaining <= 0
        };
      });

    return {
      urgent: analyzed.filter(p => p.urgentRenewal),
      upcoming: analyzed.filter(p => p.needsRenewal && !p.urgentRenewal),
      chronic: analyzed.filter(p => p.isChronic && !p.needsRenewal),
      withStockAlerts: analyzed.filter(p => p.stockAlerts.length > 0)
    };
  }, [prescriptions]);

  const totalToRenew = renewalAnalysis.urgent.length + renewalAnalysis.upcoming.length;

  return (
    <div className="space-y-4">
      {/* Alertes urgentes */}
      {renewalAnalysis.urgent.length > 0 && (
        <Alert className="bg-red-50 border-red-200 border-l-4 border-l-red-500">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-900">
            <strong>{renewalAnalysis.urgent.length} ordonnance(s) expirée(s)</strong> nécessitant un renouvellement immédiat.
          </AlertDescription>
        </Alert>
      )}

      {/* Alertes de stock */}
      {renewalAnalysis.withStockAlerts.length > 0 && (
        <Alert className="bg-orange-50 border-orange-200">
          <PackageX className="w-4 h-4 text-orange-600" />
          <AlertDescription className="text-orange-900">
            <strong>Alertes de disponibilité:</strong>
            <ul className="mt-1 text-sm">
              {renewalAnalysis.withStockAlerts.flatMap(p => 
                p.stockAlerts.map((alert, idx) => (
                  <li key={`${p.id}-${idx}`}>
                    • {alert.medication}: {alert.message}
                  </li>
                ))
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-xs text-slate-500">À renouveler</p>
          <p className="text-2xl font-bold text-orange-600">{totalToRenew}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-slate-500">Traitements chroniques</p>
          <p className="text-2xl font-bold text-blue-600">{renewalAnalysis.chronic.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-slate-500">Expirées</p>
          <p className="text-2xl font-bold text-red-600">{renewalAnalysis.urgent.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-slate-500">Alertes stock</p>
          <p className="text-2xl font-bold text-orange-600">{renewalAnalysis.withStockAlerts.length}</p>
        </Card>
      </div>

      {/* Liste des renouvellements */}
      {totalToRenew > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-orange-500" />
              Renouvellements nécessaires
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[...renewalAnalysis.urgent, ...renewalAnalysis.upcoming].map(prescription => (
              <RenewalCard 
                key={prescription.id} 
                prescription={prescription}
                onRenew={() => onRenew?.(prescription)}
                onDuplicate={() => onDuplicate?.(prescription)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Traitements chroniques */}
      {renewalAnalysis.chronic.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Traitements chroniques actifs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {renewalAnalysis.chronic.slice(0, 5).map(prescription => (
              <ChronicCard 
                key={prescription.id} 
                prescription={prescription}
                onDuplicate={() => onDuplicate?.(prescription)}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RenewalCard({ prescription, onRenew, onDuplicate }) {
  const isExpired = prescription.daysRemaining <= 0;
  const medications = prescription.medicaments || [];

  return (
    <div className={`p-3 rounded-lg border ${isExpired ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isExpired ? (
              <Badge className="bg-red-600">Expirée</Badge>
            ) : (
              <Badge className="bg-orange-500">
                <Clock className="w-3 h-3 mr-1" />
                {prescription.daysRemaining}j restants
              </Badge>
            )}
            {prescription.stockAlerts?.length > 0 && (
              <Badge variant="outline" className="text-orange-600 border-orange-400">
                <PackageX className="w-3 h-3 mr-1" />
                Stock
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {medications.map((med, idx) => (
              <span key={idx} className="text-sm">
                <Pill className="w-3 h-3 inline mr-1 text-purple-500" />
                {med.nom_produit}
                {idx < medications.length - 1 && ', '}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            <Calendar className="w-3 h-3 inline mr-1" />
            Prescrit le {format(new Date(prescription.date_prescription), 'd MMM yyyy', { locale: fr })}
          </p>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={onDuplicate} title="Dupliquer">
            <Copy className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={onRenew} className={isExpired ? 'bg-red-600 hover:bg-red-700' : ''}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Renouveler
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChronicCard({ prescription, onDuplicate }) {
  const medications = prescription.medicaments || [];
  const progress = prescription.daysRemaining 
    ? Math.max(0, Math.min(100, (prescription.daysRemaining / 30) * 100))
    : 100;

  return (
    <div className="p-3 rounded-lg border bg-slate-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap gap-1 mb-2">
            {medications.map((med, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                <Pill className="w-3 h-3 mr-1" />
                {med.nom_produit}
              </Badge>
            ))}
          </div>
          {prescription.daysRemaining && (
            <div className="flex items-center gap-2">
              <Progress value={progress} className="h-1.5 flex-1" />
              <span className="text-xs text-slate-500">{prescription.daysRemaining}j</span>
            </div>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={onDuplicate} title="Dupliquer">
          <Copy className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}