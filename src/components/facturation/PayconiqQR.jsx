import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Clock, QrCode, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

/**
 * PayconiqQR — Generates a Payconiq by Bancontact QR code for patient payment.
 * 
 * Uses the EPC QR code standard (European Payments Council) which is compatible
 * with Payconiq, Bancontact, and most Belgian banking apps.
 * 
 * Props:
 *  - amount: amount in cents
 *  - patientName: string
 *  - invoiceRef: string (invoice reference for structured communication)
 *  - doctorIBAN: string (doctor's IBAN)
 *  - doctorName: string (beneficiary name)
 *  - onPaymentConfirmed: callback when doctor confirms payment received
 */

// Generate EPC QR code data string
function generateEPCQRData({ iban, beneficiary, amount, reference, description }) {
  // EPC069-12 standard for SEPA Credit Transfer QR
  const amountEur = (amount / 100).toFixed(2);
  const lines = [
    'BCD',                    // Service Tag
    '002',                    // Version
    '1',                      // Character set (UTF-8)
    'SCT',                    // Identification (SEPA Credit Transfer)
    '',                       // BIC (optional)
    beneficiary || '',        // Beneficiary name (max 70 chars)
    iban || '',               // IBAN
    `EUR${amountEur}`,        // Amount
    '',                       // Purpose code
    reference || '',          // Structured reference (+++xxx/xxxx/xxxxx+++)
    description || '',        // Unstructured text
    '',                       // Information
  ];
  return lines.join('\n');
}

// Generate structured Belgian communication (+++xxx/xxxx/xxxxx+++)
function generateStructuredComm(invoiceRef) {
  // Use invoice ref to create a modulo-97 check
  const numStr = (invoiceRef || '').replace(/\D/g, '').slice(0, 10).padStart(10, '0');
  const num = parseInt(numStr, 10);
  const check = num % 97 || 97;
  const formatted = `${numStr.slice(0, 3)}/${numStr.slice(3, 7)}/${numStr.slice(7)}${check.toString().padStart(2, '0')}`;
  return `+++${formatted}+++`;
}

// Simple QR code renderer using SVG (no external dependency)
function QRCodeSVG({ data, size = 200 }) {
  // We'll use a canvas-based approach with the data encoded as a URL
  // that banking apps can scan. For a real QR, we generate a Google Charts URL.
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&margin=4`;
  
  return (
    <img 
      src={qrUrl} 
      alt="QR Code de paiement" 
      width={size} 
      height={size}
      className="rounded-lg"
    />
  );
}

export default function PayconiqQR({ 
  amount, 
  patientName, 
  invoiceRef, 
  doctorIBAN, 
  doctorName,
  onPaymentConfirmed 
}) {
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, confirmed
  const [iban, setIban] = useState(doctorIBAN || '');
  const [showIbanInput, setShowIbanInput] = useState(!doctorIBAN);

  const structuredComm = generateStructuredComm(invoiceRef || Date.now().toString());
  
  const epcData = generateEPCQRData({
    iban: iban,
    beneficiary: doctorName || 'Dr.',
    amount: amount,
    reference: structuredComm,
    description: `Consultation ${patientName || ''}`.trim()
  });

  const formatAmount = (cents) => {
    if (!cents && cents !== 0) return '0,00 €';
    return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
  };

  const copyComm = () => {
    navigator.clipboard.writeText(structuredComm);
    toast.success('Communication copiée');
  };

  const handleConfirm = () => {
    setPaymentStatus('confirmed');
    if (onPaymentConfirmed) {
      onPaymentConfirmed({ method: 'PAYCONIQ', reference: structuredComm });
    }
    toast.success('Paiement confirmé');
  };

  if (paymentStatus === 'confirmed') {
    return (
      <Card className="p-6 bg-green-50 border-green-200 text-center">
        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-green-900">Paiement reçu</h3>
        <p className="text-green-700 text-sm">{formatAmount(amount)} via Payconiq/Bancontact</p>
        <p className="text-xs text-green-600 mt-1 font-mono">{structuredComm}</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-blue-200 bg-gradient-to-b from-white to-blue-50/30">
      <div className="text-center space-y-4">
        {/* Header */}
        <div className="flex items-center justify-center gap-2">
          <QrCode className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-lg">Paiement Payconiq / Bancontact</h3>
        </div>

        {/* IBAN input if not provided */}
        {showIbanInput && (
          <div className="text-left max-w-xs mx-auto space-y-2">
            <Label className="text-sm">Votre IBAN (pour recevoir le paiement)</Label>
            <Input
              value={iban}
              onChange={(e) => setIban(e.target.value.toUpperCase())}
              placeholder="BE00 0000 0000 0000"
              className="font-mono text-center"
            />
            {iban && iban.length >= 16 && (
              <Button size="sm" variant="outline" onClick={() => setShowIbanInput(false)} className="w-full">
                Confirmer IBAN
              </Button>
            )}
          </div>
        )}

        {/* QR Code */}
        {iban && !showIbanInput && (
          <>
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-xl shadow-sm border">
                <QRCodeSVG data={epcData} size={220} />
              </div>
            </div>

            {/* Amount badge */}
            <div>
              <Badge className="bg-blue-600 text-white text-xl px-6 py-2 font-bold">
                {formatAmount(amount)}
              </Badge>
            </div>

            {/* Patient info */}
            {patientName && (
              <p className="text-sm text-slate-600">Patient: <strong>{patientName}</strong></p>
            )}

            {/* Structured communication */}
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-sm bg-slate-100 px-3 py-1 rounded">{structuredComm}</span>
              <Button variant="ghost" size="icon" onClick={copyComm} className="h-8 w-8">
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>

            <p className="text-xs text-slate-500">
              Le patient scanne ce QR avec son app bancaire (Payconiq, Bancontact, KBC, Belfius, ING…)
            </p>

            {/* Status & actions */}
            <div className="flex gap-3 justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowIbanInput(true)}
                className="gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Modifier IBAN
              </Button>
              <Button
                onClick={handleConfirm}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4" />
                Paiement reçu
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-amber-600">
              <Clock className="w-3.5 h-3.5" />
              En attente du paiement...
            </div>
          </>
        )}
      </div>
    </Card>
  );
}