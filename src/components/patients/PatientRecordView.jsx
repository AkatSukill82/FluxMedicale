import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, FileText, Heart, Phone, Mail, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { differenceInYears, format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function PatientRecordView({ patient, allergies = [], onTabChange }) {
  const officialName = patient?.name?.find(n => n.use === 'official') || {};
  const fullName = `${(officialName.given || []).join(' ')} ${officialName.family || ''}`.trim();
  
  const birthDate = patient?.birthDate ? new Date(patient.birthDate) : null;
  const age = birthDate && !isNaN(birthDate.getTime()) ? differenceInYears(new Date(), birthDate) : null;
  
  const niss = patient?.identifier?.find(id => id.system.includes('ssin'))?.value || '';
  const phone = patient?.telecom?.find(t => t.system === 'phone')?.value || '';
  const email = patient?.telecom?.find(t => t.system === 'email')?.value || '';
  
  const address = patient?.address?.[0];
  const addressLine = address ? `${address.line?.join(', ') || ''}, ${address.postalCode || ''} ${address.city || ''}`.trim() : '';

  const hasActiveAllergies = allergies.length > 0;

  return (
    <div className="space-y-4">
      {/* En-tête patient */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {officialName.given?.[0]?.[0]}{officialName.family?.[0]}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{fullName}</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="w-4 h-4" />
                  {age !== null && <span>{age} ans</span>}
                  {birthDate && !isNaN(birthDate.getTime()) && (
                    <span className="text-slate-500">
                      ({format(birthDate, 'dd/MM/yyyy')})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <User className="w-4 h-4" />
                  {patient?.gender === 'male' ? 'Homme' : patient?.gender === 'female' ? 'Femme' : 'Non précisé'}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <FileText className="w-4 h-4" />
                  <span className="font-mono">***-{niss.slice(-4) || '????'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="w-4 h-4" />
                  {phone || 'Non renseigné'}
                </div>
              </div>
              {hasActiveAllergies && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-900">
                      ⚠️ ALLERGIES CONNUES
                    </p>
                    <p className="text-xs text-red-700 mt-0.5">
                      {allergies.map(a => a.allergen).join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations détaillées */}
      <Tabs defaultValue="info" onValueChange={onTabChange}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="medical">Médical</TabsTrigger>
          <TabsTrigger value="contacts">Contact</TabsTrigger>
          <TabsTrigger value="admin">Administratif</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations personnelles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 mb-1">Nom complet</p>
                  <p className="font-medium">{fullName}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Date de naissance</p>
                  <p className="font-medium">
                    {birthDate && !isNaN(birthDate.getTime())
                      ? format(birthDate, 'dd MMMM yyyy', { locale: fr })
                      : 'Non renseignée'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Sexe</p>
                  <p className="font-medium">
                    {patient?.gender === 'male' ? 'Homme' : patient?.gender === 'female' ? 'Femme' : 'Non précisé'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">NISS</p>
                  <p className="font-medium font-mono">{niss || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">N° Dossier</p>
                  <p className="font-medium font-mono">{patient?.id?.slice(0, 8) || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations médicales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasActiveAllergies && (
                <div>
                  <h3 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Allergies
                  </h3>
                  <div className="space-y-2">
                    {allergies.map(allergy => (
                      <div key={allergy.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-red-900">{allergy.allergen}</p>
                            <p className="text-sm text-red-700 mt-1">{allergy.reaction}</p>
                          </div>
                          <Badge variant="destructive">{allergy.severity}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Antécédents médicaux</h3>
                <p className="text-sm text-slate-600">
                  {patient?.medical_history || 'Aucun antécédent renseigné'}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Traitements en cours</h3>
                <p className="text-sm text-slate-600">
                  {patient?.current_medications || 'Aucun traitement en cours'}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Remarques générales</h3>
                <p className="text-sm text-slate-600">
                  {patient?.general_notes || 'Aucune remarque'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">Téléphone</span>
                </div>
                <p className="font-medium">{phone || 'Non renseigné'}</p>
              </div>
              
              <div>
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">Email</span>
                </div>
                <p className="font-medium">{email || 'Non renseigné'}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">Adresse</span>
                </div>
                <p className="font-medium">{addressLine || 'Non renseignée'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations administratives</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-slate-500 mb-1">Mutuelle</p>
                <p className="font-medium">{patient?.mutuelle || 'Non renseignée'}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Numéro de mutuelle</p>
                <p className="font-medium">{patient?.mutuelle_number || 'Non renseigné'}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Date de création du dossier</p>
                <p className="font-medium">
                  {patient?.created_date
                    ? format(new Date(patient.created_date), 'dd MMMM yyyy', { locale: fr })
                    : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}