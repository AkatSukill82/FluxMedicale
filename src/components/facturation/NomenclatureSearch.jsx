/**
 * Recherche de codes nomenclature INAMI/RIZIV
 *
 * Tarifs honoraires médecins conventionnés 2024 (en centimes).
 * Source : www.inami.fgov.be — Nomenclature des prestations de santé
 *
 * Les montants reflètent les honoraires INAMI réels pour médecins conventionnés.
 * Pour les non-conventionnés, les honoraires sont libres.
 * La mise à jour annuelle se fait généralement au 01/01 et 01/07.
 */
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Plus, Info } from 'lucide-react';
import { toast } from 'sonner';

// Tarifs INAMI 2024 en centimes (honoraires conventionnés)
// Dernière mise à jour : 01/07/2024
const NOMENCLATURES = [
  // === Médecine générale ===
  { code: '101010', label_fr: 'Consultation cabinet MG',                category: 'MG',   base_price_cents: 2937,  reimbursed_cents: 2549, profiles: ['generaliste'] },
  { code: '101011', label_fr: 'Consultation cabinet MG (DMG)',           category: 'MG',   base_price_cents: 3091,  reimbursed_cents: 2703, profiles: ['generaliste'] },
  { code: '101032', label_fr: 'Visite à domicile MG',                    category: 'MG',   base_price_cents: 4200,  reimbursed_cents: 3780, profiles: ['generaliste'] },
  { code: '101033', label_fr: 'Visite à domicile MG (DMG)',              category: 'MG',   base_price_cents: 4354,  reimbursed_cents: 3934, profiles: ['generaliste'] },
  { code: '102010', label_fr: 'Première consultation MG',                category: 'MG',   base_price_cents: 2937,  reimbursed_cents: 2549, profiles: ['generaliste'] },
  { code: '101070', label_fr: 'Consultation urgence nuit/WE',            category: 'MG',   base_price_cents: 5300,  reimbursed_cents: 4770, profiles: ['generaliste'] },
  { code: '101015', label_fr: 'Consultation téléphonique MG',            category: 'MG',   base_price_cents: 1500,  reimbursed_cents: 1200, profiles: ['generaliste'] },

  // === DMG (Dossier Médical Global) ===
  { code: '102771', label_fr: 'Ouverture DMG',                           category: 'DMG',  base_price_cents: 2990,  reimbursed_cents: 2990, profiles: ['generaliste'] },
  { code: '102772', label_fr: 'Renouvellement DMG annuel',               category: 'DMG',  base_price_cents: 3100,  reimbursed_cents: 3100, profiles: ['generaliste'] },

  // === Consultations spécialistes ===
  { code: '102011', label_fr: 'Consultation spécialiste cabinet',        category: 'SPE',  base_price_cents: 3400,  reimbursed_cents: 2890, profiles: ['specialiste'] },
  { code: '102013', label_fr: 'Consultation spécialiste urgence',        category: 'SPE',  base_price_cents: 6800,  reimbursed_cents: 5780, profiles: ['specialiste'] },

  // === Examens complémentaires ===
  { code: '475010', label_fr: 'ECG de repos 12 dérivations',             category: 'EXAM', base_price_cents: 1650,  reimbursed_cents: 1400, profiles: ['generaliste', 'specialiste'] },
  { code: '471012', label_fr: 'Spirométrie simple',                       category: 'EXAM', base_price_cents: 2500,  reimbursed_cents: 2125, profiles: ['generaliste', 'specialiste'] },
  { code: '471110', label_fr: 'Test capillaire glycémie',                 category: 'EXAM', base_price_cents:  280,  reimbursed_cents:  238, profiles: ['generaliste', 'specialiste'] },

  // === Actes techniques ===
  { code: '103011', label_fr: 'Injection intramusculaire',               category: 'TECH', base_price_cents:  640,  reimbursed_cents:  544, profiles: ['generaliste', 'specialiste'] },
  { code: '103013', label_fr: 'Injection intraveineuse',                  category: 'TECH', base_price_cents:  800,  reimbursed_cents:  680, profiles: ['generaliste', 'specialiste'] },
  { code: '103015', label_fr: 'Pose de suture cutanée simple',            category: 'TECH', base_price_cents: 1800,  reimbursed_cents: 1530, profiles: ['generaliste', 'specialiste'] },
  { code: '103017', label_fr: 'Pose de suture cutanée complexe',          category: 'TECH', base_price_cents: 3200,  reimbursed_cents: 2720, profiles: ['generaliste', 'specialiste'] },
  { code: '103033', label_fr: 'Ablation de corps étranger superficiel',   category: 'TECH', base_price_cents: 1500,  reimbursed_cents: 1275, profiles: ['generaliste', 'specialiste'] },

  // === Certifications ===
  { code: '103132', label_fr: 'Certificat médical simple',                category: 'CERT', base_price_cents: 1000,  reimbursed_cents:    0, profiles: ['generaliste', 'specialiste'] },
  { code: '103134', label_fr: "Certificat d'incapacité de travail",       category: 'CERT', base_price_cents: 1200,  reimbursed_cents:    0, profiles: ['generaliste', 'specialiste'] },
  { code: '103136', label_fr: 'Certificat aptitude sport (enfant)',        category: 'CERT', base_price_cents: 1500,  reimbursed_cents:    0, profiles: ['generaliste', 'specialiste'] },

  // === Pédiatrie ===
  { code: '101210', label_fr: 'Consultation pédiatrique cabinet',         category: 'PED',  base_price_cents: 2937,  reimbursed_cents: 2549, profiles: ['generaliste', 'specialiste'] },
  { code: '101212', label_fr: 'Examen préventif enfant (0-3 ans)',        category: 'PED',  base_price_cents: 4000,  reimbursed_cents: 4000, profiles: ['generaliste', 'specialiste'] },

  // === Téléconsultation ===
  { code: '101016', label_fr: 'Téléconsultation vidéo MG',                category: 'TELE', base_price_cents: 2937,  reimbursed_cents: 2549, profiles: ['generaliste'] },
];

const CATEGORY_LABELS = {
  MG: 'Médecine générale',
  DMG: 'Dossier Médical Global',
  SPE: 'Spécialistes',
  EXAM: 'Examens',
  TECH: 'Actes techniques',
  CERT: 'Certificats',
  PED: 'Pédiatrie',
  TELE: 'Téléconsultation',
};

const CATEGORY_COLORS = {
  MG:   'bg-blue-100 text-blue-800',
  DMG:  'bg-purple-100 text-purple-800',
  SPE:  'bg-indigo-100 text-indigo-800',
  EXAM: 'bg-orange-100 text-orange-800',
  TECH: 'bg-red-100 text-red-800',
  CERT: 'bg-slate-100 text-slate-800',
  PED:  'bg-pink-100 text-pink-800',
  TELE: 'bg-teal-100 text-teal-800',
};

const fmt = (cents) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;

export default function NomenclatureSearch({ onSelect, userProfile = 'generaliste' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return NOMENCLATURES;
    return NOMENCLATURES.filter(
      (n) =>
        n.code.includes(q) ||
        n.label_fr.toLowerCase().includes(q) ||
        CATEGORY_LABELS[n.category]?.toLowerCase().includes(q)
    );
  }, [search]);

  const handleSelect = (nom) => {
    if (!nom.profiles.includes(userProfile) && nom.profiles.length > 0) {
      toast.warning(`Code ${nom.code} prévu pour : ${nom.profiles.join(', ')}. Vérifiez votre profil INAMI.`);
    }
    onSelect({
      code:             nom.code,
      label_fr:         nom.label_fr,
      category:         nom.category,
      base_price_cents: nom.base_price_cents,
      reimbursed_cents: nom.reimbursed_cents,
      // Montants en euros pour affichage rétrocompatible
      base_price:       nom.base_price_cents / 100,
      reimbursed:       nom.reimbursed_cents / 100,
    });
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une prestation INAMI
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Code, libellé ou catégorie…"
            value={search}
            onValueChange={setSearch}
          />
          <div className="px-3 py-1.5 border-b flex items-center gap-1.5 text-xs text-slate-400">
            <Info className="w-3 h-3" />
            Tarifs INAMI conventionnés 2024
          </div>
          <CommandList className="max-h-72">
            <CommandEmpty>Aucun code trouvé — {search}</CommandEmpty>
            <CommandGroup>
              {filtered.map((nom) => (
                <CommandItem
                  key={nom.code}
                  value={`${nom.code} ${nom.label_fr}`}
                  onSelect={() => handleSelect(nom)}
                  className="cursor-pointer"
                >
                  <div className="flex items-start justify-between w-full gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm">{nom.code}</span>
                        <Badge className={`text-[10px] px-1 py-0 ${CATEGORY_COLORS[nom.category]}`}>
                          {CATEGORY_LABELS[nom.category]}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5 truncate">{nom.label_fr}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-sm text-blue-700">{fmt(nom.base_price_cents)}</div>
                      {nom.reimbursed_cents > 0 && (
                        <div className="text-[10px] text-green-600">remb. {fmt(nom.reimbursed_cents)}</div>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
