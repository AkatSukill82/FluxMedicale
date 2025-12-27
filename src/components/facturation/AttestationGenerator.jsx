import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Loader2, Printer, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

/**
 * Générateur d'attestations de soins (eAttest)
 * Affiche l'attestation dans un popup
 */
export default function AttestationGenerator({ invoice, patient }) {
  const [showAttestation, setShowAttestation] = useState(false);
  const [attestationData, setAttestationData] = useState(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      // Récupérer les lignes de facturation
      const lines = await base44.entities.InvoiceLine.filter({
        invoice_id: invoice.id
      });

      // Récupérer les infos du praticien
      const currentUser = await base44.auth.me();
      
      // Préparer les données d'attestation
      const data = {
        invoice_id: invoice.id,
        patient_id: patient?.id,
        patient_name: patient?.name?.[0] ? 
          `${patient.name[0].given?.join(' ')} ${patient.name[0].family}` : 'Patient inconnu',
        patient_niss: patient?.identifier?.find(id => id.system?.includes('ssin'))?.value || '',
        provider_name: currentUser.full_name || currentUser.email,
        invoice_date: invoice.invoice_date,
        invoice_number: `INV-${invoice.id.slice(0, 8).toUpperCase()}`,
        lines: lines.map(line => ({
          code: line.nomenclature_code,
          label: line.nomenclature_label,
          quantity: line.quantity,
          unit_price: line.unit_price || 0,
          amount: line.amount || 0
        })),
        total_amount: (invoice.total_amount || 0) / 100,
        patient_contribution: (invoice.patient_contribution || 0) / 100,
        insurance_contribution: (invoice.insurance_contribution || 0) / 100,
        oa_code: invoice.oa_code,
        transaction_id: invoice.transaction_id,
        type: invoice.type
      };

      return data;
    },
    onSuccess: (data) => {
      setAttestationData(data);
      setShowAttestation(true);
    },
    onError: (error) => {
      console.error('Erreur génération attestation:', error);
      toast.error('Erreur lors de la génération de l\'attestation');
    }
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Button
        onClick={() => generateMutation.mutate()}
        disabled={generateMutation.isPending}
        variant="outline"
        size="sm"
      >
        {generateMutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <FileText className="w-4 h-4 mr-2" />
        )}
        Générer attestation
      </Button>

      <Dialog open={showAttestation} onOpenChange={setShowAttestation}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center justify-between">
              <span>Attestation de soins</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimer
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {attestationData && (
            <div className="p-6 bg-white print:p-0" id="attestation-content">
              {/* En-tête */}
              <div className="text-center mb-8 border-b pb-6">
                <h1 className="text-2xl font-bold text-blue-800 mb-2">🏥 ATTESTATION DE SOINS</h1>
                <p className="text-slate-600">
                  <strong>Numéro:</strong> {attestationData.invoice_number}
                </p>
                <p className="text-slate-600">
                  <strong>Date:</strong> {format(new Date(attestationData.invoice_date), 'dd/MM/yyyy')}
                </p>
                <p className="text-slate-600">
                  <strong>Type:</strong> {attestationData.type === 'EATTEST' ? 'eAttest' : attestationData.type === 'EFACT' ? 'eFact' : 'Papier'}
                </p>
              </div>

              {/* Informations Patient */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-700 border-b-2 border-slate-200 pb-2 mb-4">
                  👤 Informations Patient
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-500 text-sm">Nom complet:</span>
                    <p className="font-medium">{attestationData.patient_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-sm">NISS:</span>
                    <p className="font-medium font-mono">{attestationData.patient_niss || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-sm">Mutuelle:</span>
                    <p className="font-medium">{attestationData.oa_code || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Prestataire */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-700 border-b-2 border-slate-200 pb-2 mb-4">
                  👨‍⚕️ Prestataire
                </h2>
                <div>
                  <span className="text-slate-500 text-sm">Médecin:</span>
                  <p className="font-medium">{attestationData.provider_name}</p>
                </div>
              </div>

              {/* Prestations */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-700 border-b-2 border-slate-200 pb-2 mb-4">
                  💊 Prestations
                </h2>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="text-left p-3 border-b">Code</th>
                      <th className="text-left p-3 border-b">Description</th>
                      <th className="text-center p-3 border-b">Qté</th>
                      <th className="text-right p-3 border-b">Prix unit.</th>
                      <th className="text-right p-3 border-b">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attestationData.lines.length > 0 ? (
                      attestationData.lines.map((line, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="p-3 font-mono text-sm">{line.code}</td>
                          <td className="p-3">{line.label}</td>
                          <td className="p-3 text-center">{line.quantity}</td>
                          <td className="p-3 text-right">{(line.unit_price || 0).toFixed(2)}€</td>
                          <td className="p-3 text-right font-medium">{(line.amount || 0).toFixed(2)}€</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-3 text-center text-slate-500">
                          Aucune prestation
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Totaux */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-600">Part mutuelle:</span>
                    <span className="font-medium">{attestationData.insurance_contribution.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-600">Part patient:</span>
                    <span className="font-medium">{attestationData.patient_contribution.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                    <span className="text-lg font-semibold text-blue-800">Montant total:</span>
                    <span className="text-2xl font-bold text-blue-800">{attestationData.total_amount.toFixed(2)}€</span>
                  </div>
                </div>
              </div>

              {/* Transaction eHealth */}
              {attestationData.transaction_id && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-slate-700 border-b-2 border-slate-200 pb-2 mb-4">
                    ✅ Transmission eHealth
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-500 text-sm">ID Transaction:</span>
                      <p className="font-mono text-sm">{attestationData.transaction_id}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-sm">Statut:</span>
                      <p className="text-green-600 font-medium">✓ Transmis à l'organisme assureur</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-8 pt-4 border-t-2 border-slate-200 text-slate-500 text-sm">
                <p className="font-semibold">Document généré électroniquement</p>
                <p className="mt-1">
                  Cette attestation a été générée conformément aux réglementations INAMI et peut être utilisée pour le remboursement des soins.
                </p>
                <p className="mt-1">Conservez ce document pour vos archives.</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function generateAttestationHTML(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { color: #1e40af; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #334155; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
        .info-grid { display: grid; grid-template-columns: 200px 1fr; gap: 10px; }
        .info-label { font-weight: bold; color: #64748b; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background-color: #f1f5f9; font-weight: bold; }
        .total { font-size: 20px; font-weight: bold; color: #1e40af; text-align: right; margin-top: 20px; }
        .footer { margin-top: 60px; padding-top: 20px; border-top: 2px solid #e2e8f0; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏥 ATTESTATION DE SOINS</h1>
        <p><strong>Numéro:</strong> ${data.invoice_number}</p>
        <p><strong>Date:</strong> ${format(new Date(data.invoice_date), 'dd/MM/yyyy')}</p>
      </div>

      <div class="section">
        <h2>👤 Informations Patient</h2>
        <div class="info-grid">
          <div class="info-label">Nom complet:</div>
          <div>${data.patient_name}</div>
          <div class="info-label">NISS:</div>
          <div>${data.patient_niss}</div>
          <div class="info-label">Mutuelle:</div>
          <div>${data.oa_code || 'N/A'}</div>
        </div>
      </div>

      <div class="section">
        <h2>👨‍⚕️ Prestataire</h2>
        <div class="info-grid">
          <div class="info-label">Médecin:</div>
          <div>${data.provider_name}</div>
        </div>
      </div>

      <div class="section">
        <h2>💊 Prestations</h2>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Description</th>
              <th>Qté</th>
              <th>Prix unitaire</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            ${data.lines.map(line => `
              <tr>
                <td>${line.code}</td>
                <td>${line.label}</td>
                <td>${line.quantity}</td>
                <td>${line.unit_price.toFixed(2)}€</td>
                <td>${line.amount.toFixed(2)}€</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total">
          <div>Montant total: ${data.total_amount.toFixed(2)}€</div>
          <div style="font-size: 14px; color: #64748b;">
            Part mutuelle: ${data.insurance_contribution.toFixed(2)}€ • 
            Part patient: ${data.patient_contribution.toFixed(2)}€
          </div>
        </div>
      </div>

      ${data.transaction_id ? `
        <div class="section">
          <h2>✅ Transmission eHealth</h2>
          <div class="info-grid">
            <div class="info-label">ID Transaction:</div>
            <div style="font-family: monospace;">${data.transaction_id}</div>
            <div class="info-label">Statut:</div>
            <div style="color: #16a34a; font-weight: bold;">✓ Transmis à l'organisme assureur</div>
          </div>
        </div>
      ` : ''}

      <div class="footer">
        <p><strong>Document généré électroniquement</strong></p>
        <p>Cette attestation a été générée conformément aux réglementations INAMI et peut être utilisée pour le remboursement des soins.</p>
        <p>Conservez ce document pour vos archives.</p>
      </div>
    </body>
    </html>
  `;
}