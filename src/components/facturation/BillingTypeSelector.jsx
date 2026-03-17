import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Printer, Send, Euro, Info } from 'lucide-react';
import { useI18n } from '../i18n/i18nContext';

export default function BillingTypeSelector({ invoiceType, onTypeChange, isTiersPayant = false }) {
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{t('billing.billingType')}</p>
      
      <div className="grid grid-cols-2 gap-3">
        {/* eFact */}
        <button
          onClick={() => onTypeChange('EFACT')}
          className={`p-4 border-2 rounded-xl text-left transition-all ${
            invoiceType === 'EFACT'
              ? 'border-green-500 bg-green-50 shadow-md'
              : 'border-slate-200 hover:border-green-300'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              invoiceType === 'EFACT' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700'
            }`}>
              <Send className="w-4 h-4" />
            </div>
            <span className="font-bold text-base">eFact</span>
            {isTiersPayant && (
              <Badge className="bg-green-600 text-white text-[10px] ml-auto">
                {t('billing.efactRecommended')}
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {t('billing.efactDescription')}
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            <Euro className="w-3 h-3 text-green-600" />
            <span className="text-xs font-medium text-green-700">
              {t('billing.efactPatientPays')}
            </span>
          </div>
        </button>

        {/* eAttest */}
        <button
          onClick={() => onTypeChange('EATTEST')}
          className={`p-4 border-2 rounded-xl text-left transition-all ${
            invoiceType === 'EATTEST'
              ? 'border-blue-500 bg-blue-50 shadow-md'
              : 'border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              invoiceType === 'EATTEST' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
            }`}>
              <FileText className="w-4 h-4" />
            </div>
            <span className="font-bold text-base">eAttest</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {t('billing.eattestDescription')}
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            <Euro className="w-3 h-3 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">
              {t('billing.eattestPatientPays')}
            </span>
          </div>
        </button>
      </div>

      {/* Paper as secondary option */}
      <Button
        variant={invoiceType === 'PAPER' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onTypeChange('PAPER')}
        className="text-xs text-slate-500 h-8"
      >
        <Printer className="w-3.5 h-3.5 mr-1.5" />
        {t('billing.paperAttestation')}
      </Button>

      {/* Info box about the selected type */}
      {invoiceType === 'EFACT' && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Info className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
          <p className="text-xs text-green-800">
            {t('billing.efactInfo')}
          </p>
        </div>
      )}
      {invoiceType === 'EATTEST' && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-800">
            {t('billing.eattestInfo')}
          </p>
        </div>
      )}
    </div>
  );
}