import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  FileText, 
  CreditCard, 
  Pill, 
  Calendar,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';

export default function PatientOverview({ patient }) {
  // Fetch all patient data
  const { data: consultations = [] } = useQuery({
    queryKey: ['consultations_overview', patient.id],
    queryFn: () => base44.entities.Consultation.filter({ patient_id: patient.id }, '-consultation_date', 10)
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices_overview', patient.id],
    queryFn: () => base44.entities.Invoice.filter({ patient_id: patient.id }, '-invoice_date', 10)
  });

  const { data: prescriptions = [] } = useQuery({
    queryKey: ['prescriptions_overview', patient.id],
    queryFn: () => base44.entities.Prescription.filter({ patient_id: patient.id }, '-created_date', 10)
  });

  const { data: allergies = [] } = useQuery({
    queryKey: ['allergies_overview', patient.id],
    queryFn: () => base44.entities.Allergy.filter({ patient_id: patient.id, status: 'ACTIVE' })
  });

  const { data: vaccinations = [] } = useQuery({
    queryKey: ['vaccinations_overview', patient.id],
    queryFn: () => base44.entities.Vaccination.filter({ patient_id: patient.id }, '-vaccination_date', 5)
  });

  // Calculate stats
  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100;
  const totalPaid = invoices.filter(i => i.status === 'PAID' || i.status === 'ACCEPTED').reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / 100;
  const unpaidInvoices = invoices.filter(i => i.status === 'SENT' || i.status === 'NOT_SENT').length;

  return (
    <div className="space-y-6">
      {/* Stats rapides */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Consultations</p>
                <p className="text-2xl font-bold">{consultations.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ordonnances</p>
                <p className="text-2xl font-bold">{prescriptions.length}</p>
              </div>
              <Pill className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total facturé</p>
                <p className="text-2xl font-bold">{totalInvoiced.toFixed(0)}€</p>
              </div>
              <CreditCard className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Allergies</p>
                <p className="text-2xl font-bold text-red-600">{allergies.length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline unifiée */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Historique récent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Dernières consultations */}
            {consultations.slice(0, 3).map(consultation => (
              <div key={consultation.id} className="flex items-start gap-4 p-3 border-l-4 border-blue-500 bg-blue-50 rounded-r">
                <Calendar className="w-5 h-5 text-blue-600 mt-1" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-blue-900">Consultation</h4>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(consultation.consultation_date), 'dd MMM yyyy', { locale: fr })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {consultation.motive || 'Consultation générale'}
                  </p>
                  {consultation.diagnostic && (
                    <p className="text-sm font-medium mt-1">→ {consultation.diagnostic}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Dernières prescriptions */}
            {prescriptions.slice(0, 3).map(prescription => (
              <div key={prescription.id} className="flex items-start gap-4 p-3 border-l-4 border-green-500 bg-green-50 rounded-r">
                <Pill className="w-5 h-5 text-green-600 mt-1" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-green-900">Ordonnance</h4>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(prescription.created_date), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {prescription.medications?.length || 0} médicament(s)
                  </p>
                </div>
              </div>
            ))}

            {/* Dernières factures */}
            {invoices.slice(0, 3).map(invoice => (
              <div key={invoice.id} className="flex items-start gap-4 p-3 border-l-4 border-purple-500 bg-purple-50 rounded-r">
                <CreditCard className="w-5 h-5 text-purple-600 mt-1" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-purple-900">Facture</h4>
                      <Badge className={
                        invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                        'bg-orange-100 text-orange-800'
                      }>
                        {invoice.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(invoice.invoice_date), 'dd MMM yyyy', { locale: fr })}
                    </span>
                  </div>
                  <p className="text-sm font-medium mt-1">
                    {((invoice.total_amount || 0) / 100).toFixed(2)}€
                  </p>
                </div>
              </div>
            ))}

            {consultations.length === 0 && prescriptions.length === 0 && invoices.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Aucun historique pour ce patient</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informations importantes */}
      <div className="grid grid-cols-2 gap-4">
        {/* Allergies */}
        <Card className={allergies.length > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              Allergies actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allergies.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune allergie connue</p>
            ) : (
              <div className="space-y-2">
                {allergies.map(allergy => (
                  <div key={allergy.id} className="flex items-center justify-between p-2 bg-white rounded border border-red-200">
                    <span className="font-medium text-sm">{allergy.allergen}</span>
                    <Badge className={
                      allergy.severity === 'LIFE_THREATENING' ? 'bg-red-600 text-white' :
                      allergy.severity === 'SEVERE' ? 'bg-red-400 text-white' :
                      'bg-orange-200 text-orange-900'
                    }>
                      {allergy.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vaccinations récentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              💉 Vaccinations récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vaccinations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune vaccination enregistrée</p>
            ) : (
              <div className="space-y-2">
                {vaccinations.map(vacc => (
                  <div key={vacc.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                    <span className="font-medium text-sm">{vacc.vaccine_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(vacc.vaccination_date), 'dd/MM/yy')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Finances */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Situation financière
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total facturé</p>
                <p className="text-xl font-bold">{totalInvoiced.toFixed(2)}€</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total payé</p>
                <p className="text-xl font-bold text-green-600">{totalPaid.toFixed(2)}€</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Factures en attente</p>
                <p className="text-xl font-bold text-orange-600">{unpaidInvoices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}