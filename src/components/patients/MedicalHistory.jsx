import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { FileText, Pill, Activity, Calendar, ChevronRight, CreditCard, Filter, X, ChevronDown, ChevronUp, Search, Ban, Edit } from 'lucide-react';
import { format, isSameDay, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import ConsultationEditModal from '../patients/ConsultationEditModal';
import InvoiceEditModal from '../facturation/InvoiceEditModal';

const ITEMS_LIMIT = 30;

export default function MedicalHistory({ patient }) {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const filterDate = urlParams.get('date');
  
  const [highlightDate, setHighlightDate] = useState(filterDate);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const highlightRef = useRef(null);
  
  // Pagination et filtres
  const [showAllConsultations, setShowAllConsultations] = useState(false);
  const [showAllInvoices, setShowAllInvoices] = useState(false);
  const [dateFilterStart, setDateFilterStart] = useState('');
  const [dateFilterEnd, setDateFilterEnd] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const { data: consultations = [], isLoading: isLoadingConsultations } = useQuery({
    queryKey: ['consultations', patient.id],
    queryFn: () => base44.entities.Consultation.filter({ patient_id: patient.id }, '-date_consultation', 100)
  });

  const { data: prescriptions = [], isLoading: isLoadingPrescriptions } = useQuery({
    queryKey: ['prescriptions', patient.id],
    queryFn: () => base44.entities.Prescription.filter({ patient_id: patient.id }, '-created_date', 100)
  });

  const { data: vitalSigns = [], isLoading: isLoadingVitals } = useQuery({
    queryKey: ['vitalSigns', patient.id],
    queryFn: async () => {
      try {
        return await base44.entities.VitalSigns.filter({ patient_id: patient.id }, '-measurement_time', 50);
      } catch {
        return [];
      }
    }
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['patientInvoices', patient.id],
    queryFn: () => base44.entities.Invoice.filter({ patient_id: patient.id }, '-invoice_date', 100)
  });

  // Scroll to highlighted item when date filter is set
  useEffect(() => {
    if (highlightDate && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [highlightDate, consultations, invoices]);

  const isHighlighted = (itemDate) => {
    if (!highlightDate || !itemDate) return false;
    try {
      const filterDateObj = parseISO(highlightDate);
      const itemDateObj = typeof itemDate === 'string' ? parseISO(itemDate) : itemDate;
      return isSameDay(filterDateObj, itemDateObj);
    } catch {
      return false;
    }
  };

  if (isLoadingConsultations) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date filter indicator */}
      {highlightDate && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Filter className="w-4 h-4 text-blue-600" />
          <span className="text-sm text-blue-800">
            Affichage des éléments du <strong>{format(parseISO(highlightDate), 'dd MMMM yyyy', { locale: fr })}</strong>
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="ml-auto h-6 px-2"
            onClick={() => setHighlightDate(null)}
          >
            <X className="w-3 h-3 mr-1" />
            Effacer filtre
          </Button>
        </div>
      )}

      <Tabs defaultValue="consultations">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="consultations" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Consultations ({consultations.length})
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="flex items-center gap-2">
            <Pill className="w-4 h-4" />
            Ordonnances ({prescriptions.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Factures ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="vitals" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Signes vitaux
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consultations" className="space-y-3 mt-4">
          {consultations.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucune consultation enregistrée</p>
            </div>
          ) : (
            consultations.map(consult => {
              const consultDate = new Date(consult.date_consultation);
              const highlighted = isHighlighted(consult.date_consultation);
              return (
                <Card 
                  key={consult.id} 
                  ref={highlighted ? highlightRef : null}
                  className={`transition-colors cursor-pointer ${highlighted ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'hover:border-blue-300 hover:shadow-md'}`}
                  onClick={() => setSelectedConsultation(consult)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          <span className="font-medium">
                            {!isNaN(consultDate.getTime()) && format(consultDate, 'dd MMMM yyyy', { locale: fr })}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            Dr. {consult.medecin_email?.split('@')[0]}
                          </Badge>
                          {highlighted && <Badge className="bg-blue-600">Aujourd'hui</Badge>}
                        </div>
                        
                        {consult.motif && (
                          <p className="text-sm text-slate-600 mb-2">
                            <strong>Motif:</strong> {consult.motif}
                          </p>
                        )}
                        
                        {consult.diagnostic && (
                          <p className="text-sm text-slate-700 mb-2">
                            <strong>Diagnostic:</strong> {consult.diagnostic}
                          </p>
                        )}
                        
                        {consult.prescriptions && (
                          <p className="text-sm text-slate-600">
                            <strong>Traitement:</strong> {consult.prescriptions}
                          </p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="prescriptions" className="space-y-3 mt-4">
          {prescriptions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Pill className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucune ordonnance enregistrée</p>
            </div>
          ) : (
            prescriptions.map(presc => (
              <Card key={presc.id} className="hover:border-green-300 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Pill className="w-4 h-4 text-green-600" />
                        <span className="font-medium">
                          {presc.created_date && format(new Date(presc.created_date), 'dd MMM yyyy', { locale: fr })}
                        </span>
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          {presc.status || 'Active'}
                        </Badge>
                      </div>
                      {presc.medications && (
                        <div className="space-y-1 mt-2">
                          {presc.medications.map((med, idx) => (
                            <div key={idx} className="text-sm bg-slate-50 p-2 rounded">
                              <p className="font-medium">{med.drug_name}</p>
                              <p className="text-slate-600 text-xs">{med.posology}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-3 mt-4">
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucune facture enregistrée</p>
            </div>
          ) : (
            invoices.map(invoice => {
              const highlighted = isHighlighted(invoice.invoice_date);
              const invoiceDate = invoice.invoice_date ? new Date(invoice.invoice_date) : null;
              
              const getStatusBadge = (status) => {
                const styles = {
                  DRAFT: 'bg-slate-100 text-slate-800',
                  NOT_SENT: 'bg-yellow-100 text-yellow-800',
                  SENT: 'bg-blue-100 text-blue-800',
                  ACCEPTED: 'bg-green-100 text-green-800',
                  REJECTED: 'bg-red-100 text-red-800',
                  PAID: 'bg-purple-100 text-purple-800'
                };
                const labels = {
                  DRAFT: 'Brouillon',
                  NOT_SENT: 'Pas envoyé',
                  SENT: 'Envoyé',
                  ACCEPTED: 'Acceptée',
                  REJECTED: 'Refusée',
                  PAID: 'Payée'
                };
                return <Badge className={styles[status] || styles.DRAFT}>{labels[status] || status}</Badge>;
              };
              
              return (
                <Card 
                  key={invoice.id}
                  ref={highlighted ? highlightRef : null}
                  className={`transition-colors ${highlighted ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'hover:border-green-300'}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CreditCard className="w-4 h-4 text-green-600" />
                          <span className="font-medium">
                            {invoiceDate && !isNaN(invoiceDate.getTime()) && format(invoiceDate, 'dd MMMM yyyy', { locale: fr })}
                          </span>
                          {getStatusBadge(invoice.status)}
                          <Badge variant="outline" className="text-xs">{invoice.type}</Badge>
                          {highlighted && <Badge className="bg-blue-600">Ce jour</Badge>}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-slate-600">
                            <strong>Montant:</strong> {((invoice.total_amount || 0) / 100).toFixed(2)}€
                          </span>
                          {invoice.payment_method && (
                            <span className="text-slate-500">
                              Paiement: {invoice.payment_method === 'CARD' ? 'Carte' : invoice.payment_method === 'CASH' ? 'Espèces' : invoice.payment_method}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-xs text-slate-400 mt-2 font-mono">
                          ID: {invoice.id.substring(0, 12)}...
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="vitals" className="space-y-3 mt-4">
          {vitalSigns.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun signe vital enregistré</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {vitalSigns.slice(0, 6).map(vital => (
                <Card key={vital.id}>
                  <CardContent className="p-3">
                    <p className="text-xs text-slate-500">
                      {vital.measurement_time && format(new Date(vital.measurement_time), 'dd/MM HH:mm', { locale: fr })}
                    </p>
                    {vital.blood_pressure && (
                      <p className="text-sm mt-1"><strong>TA:</strong> {vital.blood_pressure}</p>
                    )}
                    {vital.heart_rate && (
                      <p className="text-sm"><strong>FC:</strong> {vital.heart_rate} bpm</p>
                    )}
                    {vital.temperature && (
                      <p className="text-sm"><strong>T°:</strong> {vital.temperature}°C</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal d'édition de consultation */}
      {selectedConsultation && (
        <ConsultationEditModal
          consultation={selectedConsultation}
          patient={patient}
          isOpen={!!selectedConsultation}
          onClose={() => setSelectedConsultation(null)}
        />
      )}
    </div>
  );
}