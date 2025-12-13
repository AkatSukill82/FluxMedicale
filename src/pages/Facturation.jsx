import React, { useState, useEffect, useTransition } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Download,
  Filter,
  Search,
  Settings,
  ChevronDown,
  FileText,
  Send,
  TrendingUp,
  Loader2,
  FileX2,
  PlusCircle,
  Euro,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { format, subDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from '@/lib/utils';


import GlobalInvoicesTable from '../components/facturation/GlobalInvoicesTable';
import GlobalMyCareNetTable from '../components/facturation/GlobalMyCareNetTable';
import GlobalFacturationRecap from '../components/facturation/GlobalFacturationRecap';
import RecurringInvoiceManager from '../components/facturation/RecurringInvoiceManager';
import PaymentReminderSystem from '../components/facturation/PaymentReminderSystem';
import PaymentTracker from '../components/facturation/PaymentTracker';
import FinancialDashboard from '../components/facturation/FinancialDashboard';
import BatchInvoiceCreator from '../components/facturation/BatchInvoiceCreator';
import ManualPaymentRecorder from '../components/facturation/ManualPaymentRecorder';
import AutomaticReminders from '../components/facturation/AutomaticReminders';

const EmptyState = () => (
  <div className="text-center py-16 px-6 bg-muted/50 rounded-lg border-2 border-dashed border-border">
    <FileX2 className="mx-auto h-16 w-16 text-muted-foreground" />
    <h3 className="mt-4 text-xl font-semibold text-foreground">Aucune facture ne correspond à vos filtres</h3>
    <p className="mt-2 text-sm text-muted-foreground">
      Essayez d'élargir votre recherche ou créez votre première attestation.
    </p>
    <Button className="mt-6" size="lg">
      <PlusCircle className="mr-2 h-4 w-4" />
      Créer une nouvelle attestation
    </Button>
  </div>
);


export default function FacturationPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showBatchCreator, setShowBatchCreator] = useState(false);
  const [selectedForBatch, setSelectedForBatch] = useState([]);
  const [showPaymentRecorder, setShowPaymentRecorder] = useState(false);

  const [filters, setFilters] = useState({
    period: '30',
    type: 'ALL',
    status: 'ALL',
    medecin: 'ALL',
    patient: ''
  });
  
  const [searchTerm, setSearchTerm] = useState('');

  const { data: initialData, isLoading: isLoadingInitial } = useQuery({
    queryKey: ['facturation_initial_data'],
    queryFn: async () => {
      const [user, patients, allInvoices, allTransactions] = await Promise.all([
        base44.auth.me(),
        base44.entities.Patient.list('-created_date', 500),
        base44.entities.Invoice.list('-invoice_date', 1000),
        base44.entities.MyCareNetTransaction.list('-sent_at', 1000),
      ]);
      return { user, patients, allInvoices, allTransactions };
    }
  });

  useEffect(() => {
    if (initialData?.user) {
      setCurrentUser(initialData.user);
      // Load saved filters after user is set
      try {
        const saved = localStorage.getItem(`facturation_filters_${initialData.user.email}`);
        if (saved) {
          setFilters(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Erreur chargement filtres:', error);
      }
    }
  }, [initialData?.user]);

  const handleFilterChange = (key, value) => {
    startTransition(() => {
      setFilters(prev => ({ ...prev, [key]: value }));
    });
  };
  
  const handleSearchChange = (e) => {
    const value = e.target.value;
    startTransition(() => {
      setSearchTerm(value);
    });
  };

  const filteredInvoices = React.useMemo(() => {
    if (!initialData) return [];

    const { patients, allInvoices } = initialData;

    const enrichedInvoices = allInvoices.map(invoice => {
        const patient = patients.find(p => p.id === invoice.patient_id);
        const officialName = patient?.name?.find(n => n.use === 'official') || {};
        const patientName = `${(officialName.given || []).join(' ')} ${officialName.family || ''}`.trim();
        const niss = patient?.identifier?.find(id => id.system.includes('ssin'))?.value || '';
        return {
          ...invoice,
          patient_name: patientName || 'Patient inconnu',
          patient_niss_masked: niss ? `***-${niss.slice(-4)}` : 'N/A'
        };
    });

    let filtered = enrichedInvoices;

    const startDate = filters.period === 'today' ? format(new Date(), 'yyyy-MM-dd')
      : filters.period === '7' ? format(subDays(new Date(), 7), 'yyyy-MM-dd')
      : filters.period === '30' ? format(subDays(new Date(), 30), 'yyyy-MM-dd')
      : null;
    
    if (startDate) filtered = filtered.filter(inv => inv.invoice_date >= startDate);
    if (filters.type !== 'ALL') filtered = filtered.filter(inv => inv.type === filters.type);
    if (filters.status !== 'ALL') filtered = filtered.filter(inv => inv.status === filters.status);
    if (filters.medecin !== 'ALL') filtered = filtered.filter(inv => inv.created_by === filters.medecin);
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(inv =>
        inv.id.toLowerCase().includes(term) ||
        inv.patient_name.toLowerCase().includes(term) ||
        (inv.total_amount && inv.total_amount.toString().includes(term))
      );
    }
    
    return filtered;
  }, [initialData, filters, searchTerm]);

  const filteredTransactions = React.useMemo(() => {
    if (!initialData) return [];
    // This could be further refined to filter based on invoices in view, etc.
    return initialData.allTransactions;
  }, [initialData]);

  const [isSavingFilters, setIsSavingFilters] = useState(false);
  const handleSaveFilters = () => {
    setIsSavingFilters(true);
    setTimeout(() => {
        try {
          if(currentUser) {
            localStorage.setItem(`facturation_filters_${currentUser.email}`, JSON.stringify(filters));
            toast.success("Filtres sauvegardés !");
          }
        } catch (error) {
          toast.error("Erreur lors de la sauvegarde des filtres.");
        } finally {
          setIsSavingFilters(false);
        }
    }, 500);
  };
  
  const [isExporting, setIsExporting] = useState(false);
  const handleExportCSV = () => {
    setIsExporting(true);
    setTimeout(() => {
      // CSV export logic here...
      toast.success("Export CSV démarré.");
      setIsExporting(false);
    }, 1000);
  };

  const uniqueMedecins = [...new Set(initialData?.allInvoices.map(inv => inv.created_by).filter(Boolean))];

  // Factures prêtes pour le regroupement (SENT et ERROR_CORRECTED)
  const batchableInvoices = filteredInvoices.filter(inv => 
    inv.status === 'SENT' || inv.status === 'ERROR_CORRECTED'
  );

  const handleCreateBatch = () => {
    if (batchableInvoices.length === 0) {
      toast.warning('Aucune facture à regrouper');
      return;
    }
    setSelectedForBatch(batchableInvoices);
    setShowBatchCreator(true);
  };

  if (showBatchCreator) {
    return (
      <BatchInvoiceCreator 
        invoicesToBatch={selectedForBatch}
        onBack={() => {
          setShowBatchCreator(false);
          setSelectedForBatch([]);
        }}
      />
    );
  }

  return (
    <div className="flex h-full gap-6">
      {/* Sidebar gauche - Liste des clients */}
      <aside className="w-80 bg-white rounded-lg border border-slate-200 p-4 overflow-y-auto">
        <div className="mb-4">
          <h2 className="font-semibold text-slate-900 mb-3">Clients facturables</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher un client"
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-9"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          {isLoadingInitial ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            initialData?.patients.slice(0, 20).map(p => {
              const officialName = p.name?.find(n => n.use === 'official') || {};
              const fullName = `${(officialName.given || []).join(' ')} ${officialName.family || ''}`.trim();
              const invoiceCount = filteredInvoices.filter(inv => inv.patient_id === p.id).length;
              
              return (
                <button
                  key={p.id}
                  className="w-full p-3 text-left rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 text-sm">{fullName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{invoiceCount} facture(s)</p>
                    </div>
                    {invoiceCount > 0 && (
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Zone principale */}
      <div className="flex-1 space-y-4">
        <Tabs defaultValue="dashboard">
          <TabsList>
            <TabsTrigger value="dashboard">📊 Tableau de bord</TabsTrigger>
            <TabsTrigger value="invoices">💰 Factures</TabsTrigger>
            <TabsTrigger value="payments">📈 Suivi paiements</TabsTrigger>
            <TabsTrigger value="recurring">🔄 Récurrentes</TabsTrigger>
            <TabsTrigger value="reminders">⏰ Relances</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-slate-900">Vue d'ensemble financière</h1>
            </div>
            <FinancialDashboard invoices={filteredInvoices} />
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
          <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Facturation</h1>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleCreateBatch}
              disabled={batchableInvoices.length === 0}
            >
              <FileText className="w-4 h-4 mr-2" />
              Créer facture groupée ({batchableInvoices.length})
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowPaymentRecorder(true)}
            >
              <Euro className="w-4 h-4 mr-2" />
              Enregistrer paiement
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
          </div>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Select value={filters.period} onValueChange={(v) => handleFilterChange('period', v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 derniers jours</SelectItem>
                  <SelectItem value="7">7 derniers jours</SelectItem>
                  <SelectItem value="today">Aujourd'hui</SelectItem>
                  <SelectItem value="all">Tout</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous</SelectItem>
                  <SelectItem value="NOT_SENT">Pas envoyé</SelectItem>
                  <SelectItem value="SENT">Envoyé</SelectItem>
                  <SelectItem value="ERROR">Erreur</SelectItem>
                  <SelectItem value="ERROR_CORRECTED">Erreur corrigée</SelectItem>
                  <SelectItem value="ACCEPTED">Acceptée</SelectItem>
                  <SelectItem value="REJECTED">Refusée</SelectItem>
                  <SelectItem value="PAID">Payée</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.type} onValueChange={(v) => handleFilterChange('type', v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous types</SelectItem>
                  <SelectItem value="EFACT">eFact</SelectItem>
                  <SelectItem value="EATTEST">eAttest</SelectItem>
                  <SelectItem value="PAPER">Papier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      
        {isLoadingInitial || isPending ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredInvoices.length > 0 ? (
          <GlobalInvoicesTable 
            invoices={filteredInvoices} 
            currentUser={currentUser} 
            isLoading={false}
            page={1}
            pageSize={50}
            onPageChange={() => {}}
            onPageSizeChange={() => {}}
            onRefresh={() => {}}
          />
        ) : (
          <EmptyState />
        )}
          </TabsContent>

          <TabsContent value="payments">
            <PaymentTracker />
          </TabsContent>

          <TabsContent value="recurring">
            <RecurringInvoiceManager />
          </TabsContent>

          <TabsContent value="reminders">
            <PaymentReminderSystem />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal enregistrement paiement */}
      {showPaymentRecorder && (
        <ManualPaymentRecorder
          isOpen={showPaymentRecorder}
          onClose={() => setShowPaymentRecorder(false)}
        />
      )}
    </div>
  );
}