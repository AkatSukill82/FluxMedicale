import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlusCircle, Euro, Download, Settings } from 'lucide-react';

import PendingInvoicesQueue from '../components/facturation/PendingInvoicesQueue';
import SentBatchesPanel from '../components/facturation/SentBatchesPanel';
import InvoiceSearchPanel from '../components/facturation/InvoiceSearchPanel';
import RevenueOverview from '../components/facturation/RevenueOverview';
import RecurringInvoiceManager from '../components/facturation/RecurringInvoiceManager';
import TarifManager from '../components/facturation/TarifManager';
import PaymentReminderSystem from '../components/facturation/PaymentReminderSystem';
import PaymentTracker from '../components/facturation/PaymentTracker';
import InvoiceCreator from '../components/facturation/InvoiceCreator';
import PaymentRecorder from '../components/facturation/PaymentRecorder';
import AccountingExport from '../components/facturation/AccountingExport';
import ErrorInvoicesPanel from '../components/facturation/ErrorInvoicesPanel';
import { useI18n } from '../components/i18n/i18nContext';

export default function FacturationPage() {
  const { t } = useI18n();
  const [showInvoiceCreator, setShowInvoiceCreator] = useState(false);
  const [showNewPayment, setShowNewPayment] = useState(false);
  const [showAccountingExport, setShowAccountingExport] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['facturation_data'],
    queryFn: async () => {
      const [user, invoices, patients] = await Promise.all([
        base44.auth.me(),
        base44.entities.Invoice.list('-invoice_date', 1000),
        base44.entities.Patient.list('-created_date', 500),
      ]);

      // Enrich invoices with patient names
      const enriched = invoices.map(inv => {
        const patient = patients.find(p => p.id === inv.patient_id);
        if (patient && !inv.patient_name) {
          const name = patient.name?.find(n => n.use === 'official') || patient.name?.[0] || {};
          inv.patient_name = `${(name.given || []).join(' ')} ${name.family || ''}`.trim();
          if (!inv.oa_name && patient.mutuelle) inv.oa_name = patient.mutuelle;
        }
        return inv;
      });

      return { user, invoices: enriched, patients };
    }
  });

  const invoices = data?.invoices || [];
  const pendingCount = invoices.filter(i => i.status === 'PENDING').length;
  const errorCount = invoices.filter(i => ['ERROR', 'REJECTED', 'PARTIAL'].includes(i.status)).length;

  return (
    <div className="space-y-4 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('billing.invoicing')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('billing.management')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowInvoiceCreator(true)} className="bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="w-4 h-4 mr-2" />
            {t('billing.newInvoice')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowNewPayment(true)}>
            <Euro className="w-4 h-4 mr-2" />
            {t('billing.payment')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAccountingExport(true)}>
            <Download className="w-4 h-4 mr-2" />
            {t('billing.export')}
          </Button>
        </div>
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="pending">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="pending" className="relative">
            ⏳ {t('billing.pendingTab')}
            {pendingCount > 0 && (
              <Badge className="ml-1.5 bg-blue-500 text-white text-[10px] px-1.5 py-0">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="errors" className="relative">
            ❌ {t('billing.errorsTab')}
            {errorCount > 0 && (
              <Badge className="ml-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0">{errorCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="batches">📦 {t('billing.sentBatches')}</TabsTrigger>
          <TabsTrigger value="search">🔍 {t('billing.searchTab')}</TabsTrigger>
          <TabsTrigger value="dashboard">📊 {t('billing.revenue')}</TabsTrigger>
          <TabsTrigger value="payments">💳 {t('billing.paymentsTab')}</TabsTrigger>
          <TabsTrigger value="settings">⚙️ {t('billing.config')}</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <PendingInvoicesQueue invoices={invoices} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="errors" className="mt-4">
          <ErrorInvoicesPanel invoices={invoices} patients={data?.patients || []} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="batches" className="mt-4">
          <SentBatchesPanel />
        </TabsContent>

        <TabsContent value="search" className="mt-4">
          <InvoiceSearchPanel invoices={invoices} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="dashboard" className="mt-4">
          <RevenueOverview />
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <PaymentTracker />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Tabs defaultValue="tarifs">
            <TabsList>
              <TabsTrigger value="tarifs">🏷️ {t('billing.tariffs')}</TabsTrigger>
              <TabsTrigger value="recurring">🔄 {t('billing.recurring')}</TabsTrigger>
              <TabsTrigger value="reminders">⏰ {t('billing.reminders')}</TabsTrigger>
            </TabsList>
            <TabsContent value="tarifs"><TarifManager /></TabsContent>
            <TabsContent value="recurring"><RecurringInvoiceManager /></TabsContent>
            <TabsContent value="reminders"><PaymentReminderSystem /></TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showInvoiceCreator && (
        <InvoiceCreator isOpen={showInvoiceCreator} onClose={() => setShowInvoiceCreator(false)} onCreated={() => setShowInvoiceCreator(false)} />
      )}
      {showNewPayment && (
        <PaymentRecorder isOpen={showNewPayment} onClose={() => setShowNewPayment(false)} onRecorded={() => setShowNewPayment(false)} />
      )}
      <AccountingExport isOpen={showAccountingExport} onClose={() => setShowAccountingExport(false)} />
    </div>
  );
}