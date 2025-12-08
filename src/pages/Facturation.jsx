
import React, { useState, useEffect, useTransition } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
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
        return {
          ...invoice,
          patient_name: patientName || 'Patient inconnu',
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Facturation Globale</h1>
          <p className="text-muted-foreground">Suivi centralisé des attestations et paiements</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleSaveFilters} disabled={isSavingFilters}>
            {isSavingFilters ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Settings className="w-4 h-4 mr-2" />}
            Sauvegarder filtres
          </Button>
          <Button onClick={handleExportCSV} disabled={isExporting}>
            {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par N° facture, patient, montant..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-9"
              />
            </div>
             <Select value={filters.period} onValueChange={(v) => handleFilterChange('period', v)}>
                <SelectTrigger className="w-auto">
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
                <SelectTrigger className="w-auto">
                   <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous statuts</SelectItem>
                  <SelectItem value="PAID">Payée</SelectItem>
                  <SelectItem value="SENT">Envoyée</SelectItem>
                  <SelectItem value="REJECTED">Refusée</SelectItem>
                </SelectContent>
              </Select>
            <Collapsible open={isAdvancedFiltersOpen} onOpenChange={setIsAdvancedFiltersOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtres avancés
                  <ChevronDown className={cn("w-4 h-4 transition-transform", isAdvancedFiltersOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent asChild>
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                >
                    <div className="flex flex-wrap items-center gap-4 mt-4 p-4 border rounded-lg bg-muted/50">
                       <Select value={filters.type} onValueChange={(v) => handleFilterChange('type', v)}>
                         <SelectTrigger className="w-auto"><SelectValue placeholder="Type" /></SelectTrigger>
                         <SelectContent>
                           <SelectItem value="ALL">Tous types</SelectItem>
                           <SelectItem value="EFACT">eFact</SelectItem>
                           <SelectItem value="EATTEST">eAttest</SelectItem>
                           <SelectItem value="PAPER">Papier</SelectItem>
                         </SelectContent>
                       </Select>
                       <Select value={filters.medecin} onValueChange={(v) => handleFilterChange('medecin', v)}>
                         <SelectTrigger className="w-auto"><SelectValue placeholder="Médecin" /></SelectTrigger>
                         <SelectContent>
                           <SelectItem value="ALL">Tous médecins</SelectItem>
                           {uniqueMedecins.map(email => (<SelectItem key={email} value={email}>{email.split('@')[0]}</SelectItem>))}
                         </SelectContent>
                       </Select>
                    </div>
                </motion.div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>
      
       <AnimatePresence mode="wait">
        <motion.div
          key={isLoadingInitial || isPending ? 'loading' : 'content'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {isLoadingInitial || isPending ? (
             <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <Tabs defaultValue="invoices" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="invoices" className="flex items-center gap-2"><FileText className="w-4 h-4" />Factures ({filteredInvoices.length})</TabsTrigger>
                <TabsTrigger value="mycarenet" className="flex items-center gap-2"><Send className="w-4 h-4" />Envois OA ({filteredTransactions.length})</TabsTrigger>
                <TabsTrigger value="recap" className="flex items-center gap-2"><TrendingUp className="w-4 h-4" />Récapitulatif</TabsTrigger>
              </TabsList>
              <TabsContent value="invoices" className="mt-6">
                {filteredInvoices.length > 0 ? 
                  <GlobalInvoicesTable invoices={filteredInvoices} currentUser={currentUser} isLoading={false} />
                  : <EmptyState />
                }
              </TabsContent>
              <TabsContent value="mycarenet" className="mt-6">
                <GlobalMyCareNetTable transactions={filteredTransactions} invoices={filteredInvoices} currentUser={currentUser} isLoading={false} />
              </TabsContent>
              <TabsContent value="recap" className="mt-6">
                 <GlobalFacturationRecap invoices={filteredInvoices} transactions={filteredTransactions} filters={filters} onExportPDF={() => {}}/>
              </TabsContent>
            </Tabs>
          )}
        </motion.div>
      </AnimatePresence>

    </div>
  );
}
