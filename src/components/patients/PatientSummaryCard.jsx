import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { differenceInYears } from 'date-fns';
import { Phone, Mail, MapPin, Heart, AlertTriangle } from 'lucide-react';

export default function PatientSummaryCard({ patient, allergies = [], stats = {} }) {
  const officialName = patient.name?.find(n => n.use === 'official') || {};
  const fullName = `${(officialName.given || []).join(' ')} ${officialName.family || ''}`.trim();
  const age = patient.birthDate ? differenceInYears(new Date(), new Date(patient.birthDate)) : null;
  const niss = patient.identifier?.find(id => id.system.includes('ssin'))?.value || '';
  
  const phone = patient.telecom?.find(t => t.system === 'phone')?.value;
  const email = patient.telecom?.find(t => t.system === 'email')?.value;
  const address = patient.address?.[0];

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
      <CardContent className="p-6">
        {/* En-tête patient */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {officialName.given?.[0]?.[0]}{officialName.family?.[0]}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{fullName}</h2>
              <div className="flex items-center gap-2 mt-1">
                {age && <Badge variant="outline">{age} ans</Badge>}
                <Badge variant="outline">{patient.gender === 'male' ? '♂ Homme' : '♀ Femme'}</Badge>
                {niss && <Badge variant="outline" className="font-mono text-xs">NISS: ***-{niss.slice(-4)}</Badge>}
              </div>
            </div>
          </div>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.consultations || 0}</p>
            <p className="text-xs text-muted-foreground">Consultations</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.prescriptions || 0}</p>
            <p className="text-xs text-muted-foreground">Ordonnances</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.invoices || 0}</p>
            <p className="text-xs text-muted-foreground">Factures</p>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{allergies.length}</p>
            <p className="text-xs text-muted-foreground">Allergies</p>
          </div>
        </div>

        {/* Alertes */}
        {allergies.length > 0 && (
          <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="font-semibold text-red-900">Allergies connues</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {allergies.map(allergy => (
                <Badge key={allergy.id} className="bg-red-200 text-red-900">
                  {allergy.allergen}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {phone && (
            <div className="flex items-center gap-2 bg-white rounded-lg p-2">
              <Phone className="w-4 h-4 text-blue-600" />
              <span>{phone}</span>
            </div>
          )}
          {email && (
            <div className="flex items-center gap-2 bg-white rounded-lg p-2">
              <Mail className="w-4 h-4 text-blue-600" />
              <span className="truncate">{email}</span>
            </div>
          )}
          {patient.mutuelle && (
            <div className="flex items-center gap-2 bg-white rounded-lg p-2">
              <Heart className="w-4 h-4 text-blue-600" />
              <span className="truncate">{patient.mutuelle}</span>
            </div>
          )}
          {address && (
            <div className="flex items-center gap-2 bg-white rounded-lg p-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="truncate">
                {address.city || address.postal_code || 'Adresse'}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}