import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

/**
 * Générateur d'attestations de soins (eAttest)
 * Génère un document PDF avec les informations de facturation
 */
export default function AttestationGenerator({ invoice, patient }) {
  const generateMutation = useMutation({
    mutationFn: async () => {
      // Récupérer les lignes de facturation
      const lines = await base44.entities.InvoiceLine.filter({
        invoice_id: invoice.id
      });

      // Récupérer les infos du praticien
      const currentUser = await base44.auth.me();
      
      // Simuler la génération d'une attestation de soins
      const attestationData = {
        invoice_id: invoice.id,
        patient_id: patient.id,
        patient_name: patient.name?.[0] ? 
          `${patient.name[0].given?.join(' ')} ${patient.name[0].family}` : '',
        patient_niss: patient.identifier?.find(id => id.system.includes('ssin'))?.value || '',
        provider_name: currentUser.full_name || currentUser.email,
        invoice_date: invoice.invoice_date,
        invoice_number: `INV-${invoice.id.slice(0, 8).toUpperCase()}`,
        lines: lines.map(line => ({
          code: line.nomenclature_code,
          label: line.nomenclature_label,
          quantity: line.quantity,
          unit_price: line.unit_price,
          amount: line.amount
        })),
        total_amount: invoice.total_amount / 100,
        patient_contribution: invoice.patient_contribution / 100,
        insurance_contribution: invoice.insurance_contribution / 100,
        oa_code: invoice.oa_code,
        transaction_id: invoice.transaction_id
      };

      // Créer un document d'attestation
      const document = await base44.entities.Document.create({
        patient_id: patient.id,
        type: 'ATTESTATION',
        subtype: 'SOINS',
        title: `Attestation de soins - ${format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}`,
        status: 'SIGNED',
        content_html: generateAttestationHTML(attestationData),
        signature: {
          signed: true,
          method: 'MANUAL',
          timestamp: new Date().toISOString()
        },
        linked_consultation_id: invoice.id,
        created_by: currentUser.email
      });

      return { document, attestationData };
    },
    onSuccess: ({ document }) => {
      toast.success('Attestation générée avec succès');
      // Simuler le téléchargement
      window.open(`#/documents/${document.id}`, '_blank');
    },
    onError: (error) => {
      console.error('Erreur génération attestation:', error);
      toast.error('Erreur lors de la génération de l\'attestation');
    }
  });

  return (
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