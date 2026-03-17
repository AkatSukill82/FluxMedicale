import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CheckCircle2, XCircle, AlertTriangle, Award, Euro,
  FileCheck, Monitor, Send, FileText, Pill, BookOpen, Accessibility, Stethoscope
} from 'lucide-react';

const YEAR = new Date().getFullYear();

function CriterionCard({ number, title, description, met, value, target, targetLabel, icon: Icon }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : (met ? 100 : 0);
  return (
    <Card className={`transition-all ${met ? 'border-green-200 bg-green-50/30' : 'border-orange-200 bg-orange-50/30'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${met ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
            {met ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] px-1.5">{number}</Badge>
              <p className="text-sm font-semibold">{title}</p>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{description}</p>
            {target > 0 && (
              <>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">{value} / {target} {targetLabel || ''}</span>
                  <span className={`font-bold ${met ? 'text-green-600' : 'text-orange-600'}`}>{pct}%</span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </>
            )}
            {target === 0 && (
              <Badge variant={met ? 'default' : 'destructive'} className="text-xs">
                {met ? '✓ Critère rempli' : '✗ Non rempli'}
              </Badge>
            )}
          </div>
          <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function INAMIPrimeTracker({ data }) {
  const { patients, dmgs, invoices, sumehrs, chapterIVRequests, medexCertificates, prescriptions } = data;

  const criteria = useMemo(() => {
    const now = new Date();
    const yearStart = new Date(YEAR, 0, 1);
    const h2Start = new Date(YEAR, 6, 1); // 2e semestre
    const q4Start = new Date(YEAR, 9, 1); // Q4

    // 1. Chapitre IV — 50% via MyCareNet au S2
    const ch4Total = (chapterIVRequests || []).filter(r => new Date(r.created_date) >= h2Start).length;
    const ch4Electronic = (chapterIVRequests || []).filter(r => new Date(r.created_date) >= h2Start && r.submission_method !== 'paper').length;
    const ch4Pct = ch4Total > 0 ? Math.round((ch4Electronic / ch4Total) * 100) : 0;
    const ch4Met = ch4Total === 0 || ch4Pct >= 50; // If none, not applicable

    // 2. eFact/eAttest — 50% des consultations BIM via MyCareNet au S2
    const invoicesS2 = (invoices || []).filter(i => new Date(i.invoice_date) >= h2Start);
    const totalConsultInvoices = invoicesS2.length;
    const electronicInvoices = invoicesS2.filter(i => i.type === 'EFACT' || i.type === 'EATTEST').length;
    const efactPct = totalConsultInvoices > 0 ? Math.round((electronicInvoices / totalConsultInvoices) * 100) : 0;
    const efactMet = totalConsultInvoices === 0 || efactPct >= 50;

    // 3. SUMEHR — 60% ratio SUMEHR / DMG
    const dmgActifs = (dmgs || []).filter(d => d.statut === 'ACTIF').length;
    const sumehrPatients = new Set((sumehrs || []).filter(s => s.status === 'published' || s.status === 'validated').map(s => s.patient_id)).size;
    const sumehrPct = dmgActifs > 0 ? Math.round((sumehrPatients / dmgActifs) * 100) : 0;
    const sumehrMet = dmgActifs === 0 || sumehrPct >= 60;

    // 4. Schémas de médication — ≥ 5 créés/adaptés au S2
    // We count prescriptions with multiple medications as "schemes"
    const schemesS2 = (prescriptions || []).filter(p => {
      const d = new Date(p.date_prescription);
      return d >= h2Start && (p.medicaments || []).length >= 2;
    }).length;
    const schemesMet = schemesS2 >= 5;

    // 5. CEBAM Evidence Linker — ≥ 5 utilisations au S2
    // We can't track external CEBAM usage, mark as manual
    const cebamMet = false; // User must verify manually

    // 6. Formulaire Handicap SPF — ≥ 3 transmissions
    // Not directly trackable, mark as informational
    const handicapMet = false; // User must verify manually

    // 7. Baromètres (diabète, antibiotiques, insuffisance rénale) — inscrit à ≥ 2
    // We check if the system has data that could feed these barometers
    const hasDiabeteData = (patients || []).some(p => p.antecedents_medicaux?.toLowerCase().includes('diabète'));
    const hasRenalData = (patients || []).some(p => p.antecedents_medicaux?.toLowerCase().includes('rénal') || p.antecedents_medicaux?.toLowerCase().includes('rein'));
    const barometreCount = [hasDiabeteData, true, hasRenalData].filter(Boolean).length; // antibio always possible
    const barometreMet = barometreCount >= 2;

    // 8. Mult-eMediatt — ≥ 1 certificat d'incapacité électronique au Q4
    const mediattQ4 = (medexCertificates || []).filter(c => {
      const d = new Date(c.created_date);
      return d >= q4Start && (c.status === 'sent_mutuelle' || c.status === 'validated' || c.status === 'signed');
    }).length;
    const mediattMet = mediattQ4 >= 1;

    return [
      {
        number: '1', title: 'Chapitre IV via MyCareNet',
        description: `≥ 50% des demandes Chapitre IV via e-service au 2e semestre ${YEAR}`,
        met: ch4Met, value: ch4Electronic, target: ch4Total,
        targetLabel: 'demandes électroniques', icon: Pill
      },
      {
        number: '2', title: 'eFact / eAttest',
        description: `≥ 50% des consultations facturées via eFact ou eAttest au 2e semestre ${YEAR}`,
        met: efactMet, value: electronicInvoices, target: totalConsultInvoices,
        targetLabel: 'factures électroniques', icon: Send
      },
      {
        number: '3', title: 'SUMEHR téléchargés',
        description: `≥ 60% ratio patients SUMEHR / patients DMG actifs`,
        met: sumehrMet, value: sumehrPatients, target: dmgActifs,
        targetLabel: 'SUMEHR vs DMG', icon: FileCheck
      },
      {
        number: '4', title: 'Schémas de médication',
        description: `≥ 5 schémas de médication créés ou adaptés au 2e semestre ${YEAR}`,
        met: schemesMet, value: schemesS2, target: 5,
        targetLabel: 'schémas', icon: FileText
      },
      {
        number: '5', title: 'CEBAM Evidence Linker',
        description: `≥ 5 consultations du CEBAM Evidence Linker au 2e semestre ${YEAR}`,
        met: cebamMet, value: 0, target: 5,
        targetLabel: 'consultations (vérification manuelle)', icon: BookOpen
      },
      {
        number: '6', title: 'Formulaire Handicap SPF',
        description: `≥ 3 formulaires électroniques « Évaluation du handicap » transmis en ${YEAR}`,
        met: handicapMet, value: 0, target: 3,
        targetLabel: 'formulaires (vérification manuelle)', icon: Accessibility
      },
      {
        number: '7', title: 'Baromètres INAMI',
        description: `Inscription à ≥ 2 baromètres parmi : diabète, antibiotiques, insuffisance rénale`,
        met: barometreMet, value: barometreCount, target: 2,
        targetLabel: 'baromètres disponibles', icon: Stethoscope
      },
      {
        number: '8', title: 'Mult-eMediatt',
        description: `≥ 1 certificat d'incapacité envoyé électroniquement au Q4 ${YEAR}`,
        met: mediattMet, value: mediattQ4, target: 1,
        targetLabel: 'certificat(s)', icon: FileText
      },
    ];
  }, [data]);

  const metCount = criteria.filter(c => c.met).length;
  const totalCriteria = criteria.length;
  const allMet = metCount >= 7; // 7/8 pour la prime maximale

  // Calculate prime amount
  let primeAmount = 0;
  if (metCount >= 7) primeAmount = 6000;
  else if (metCount >= 5) primeAmount = 3500;
  else if (metCount >= 3) primeAmount = 2000;
  else if (metCount >= 1) primeAmount = 1000;

  return (
    <div className="space-y-6">
      {/* Prime summary */}
      <Card className={allMet ? 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50' : 'bg-gradient-to-r from-slate-50 to-slate-100'}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${allMet ? 'bg-green-600' : 'bg-slate-600'}`}>
                <Award className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Prime de Pratique Intégrée {YEAR}</h2>
                <p className="text-sm text-muted-foreground">
                  {metCount}/{totalCriteria} critères remplis — {allMet ? 'Prime maximale !' : `${7 - metCount > 0 ? (7 - metCount) : 0} critère(s) manquant(s) pour la prime max`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <Euro className="w-6 h-6 text-muted-foreground" />
                <span className="text-3xl font-bold" style={{ color: allMet ? '#10b981' : '#f59e0b' }}>
                  {primeAmount.toLocaleString()} €
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Montant estimé</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Progression</span>
              <span className="font-bold">{metCount}/8 critères</span>
            </div>
            <Progress value={(metCount / totalCriteria) * 100} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Info alert */}
      <Alert>
        <AlertTriangle className="w-4 h-4" />
        <AlertTitle>Vérification automatique</AlertTitle>
        <AlertDescription>
          Les critères sont vérifiés automatiquement à partir de vos données FluxMed. Les critères 5 (CEBAM) et 6 (Handicap SPF) nécessitent une vérification manuelle car les données proviennent de services externes. La prime sera demandable au 2e semestre {YEAR + 1}.
        </AlertDescription>
      </Alert>

      {/* Criteria grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {criteria.map(c => (
          <CriterionCard key={c.number} {...c} />
        ))}
      </div>

      {/* Prime scale */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Barème de la prime</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { criteria: '7-8/8', amount: '6 000 €', highlight: metCount >= 7 },
              { criteria: '5-6/8', amount: '3 500 €', highlight: metCount >= 5 && metCount < 7 },
              { criteria: '3-4/8', amount: '2 000 €', highlight: metCount >= 3 && metCount < 5 },
              { criteria: '1-2/8', amount: '1 000 €', highlight: metCount >= 1 && metCount < 3 },
            ].map((tier, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border text-center transition-all ${tier.highlight ? 'border-green-300 bg-green-50 ring-2 ring-green-200' : 'bg-slate-50'}`}
              >
                <p className="text-xs text-muted-foreground">{tier.criteria} critères</p>
                <p className={`text-lg font-bold ${tier.highlight ? 'text-green-600' : ''}`}>{tier.amount}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}