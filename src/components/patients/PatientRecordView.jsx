import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, FileText, Heart, Phone, Mail, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { differenceInYears, format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PatientRecordView({ patient, allergies = [] }) {
  const officialName = patient?.name?.find(n => n.use === 'official') || {};
  const fullName = `${(officialName.given || []).join(' ')} ${officialName.family || ''}`.trim();
  
  const birthDate = patient?.birthDate ? new Date(patient.birthDate) : null;
  const age = birthDate && !isNaN(birthDate.getTime()) ? differenceInYears(new Date(), birthDate) : null;
  
  const niss = patient?.identifier?.find(id => id.system.includes('ssin'))?.value || '';
  const phone = patient?.telecom?.find(t => t.system === 'phone')?.value || '';
  const mutuelle = patient?.mutuelle || 'Non renseignée';

  const hasActiveAllergies = allergies.length > 0;

  return (
    <div className="space-y-3">
      {/* Carte compacte avec toutes les infos essentielles */}
      <Card className="border-blue-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Colonne 1: Identité */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold">
                  {officialName.given?.[0]?.[0]}{officialName.family?.[0]}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{fullName}</h3>
                  <p className="text-sm text-slate-600">{age} ans • {patient?.gender === 'male' ? 'H' : 'F'}</p>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="w-3 h-3 text-slate-500" />
                  <span className="font-mono text-xs">***-{niss.slice(-4) || '????'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3 h-3 text-slate-500" />
                  <span className="text-xs">{phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-3 h-3 text-slate-500" />
                  <span className="text-xs">{mutuelle}</span>
                </div>
              </div>
            </div>

            {/* Colonne 2: Allergies & Antécédents */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Alertes médicales
              </h4>
              {hasActiveAllergies ? (
                <div className="space-y-1">
                  {allergies.map(allergy => (
                    <div key={allergy.id} className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                      <p className="font-semibold text-red-900">⚠️ {allergy.allergen}</p>
                      <Badge variant="destructive" className="text-xs mt-1">{allergy.severity}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Aucune allergie connue</p>
              )}
              {patient?.antecedents_medicaux && (
                <div className="mt-3">
                  <p className="text-xs text-slate-600 line-clamp-2">{patient.antecedents_medicaux}</p>
                </div>
              )}
            </div>

            {/* Colonne 3: Médicaments actuels */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Traitement actuel</h4>
              {patient?.medicaments_actuels ? (
                <p className="text-xs text-slate-600 line-clamp-4">{patient.medicaments_actuels}</p>
              ) : (
                <p className="text-xs text-slate-500">Aucun traitement en cours</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}