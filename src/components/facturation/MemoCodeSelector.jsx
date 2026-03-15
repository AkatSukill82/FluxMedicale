import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Package, Trash2, Star, Settings } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_LABELS = {
  FRAIS_ADMIN: { label: 'Frais administratifs', color: 'bg-slate-100 text-slate-700' },
  MATERIEL: { label: 'Matériel', color: 'bg-blue-100 text-blue-700' },
  SUPPLEMENT: { label: 'Supplément', color: 'bg-purple-100 text-purple-700' },
  DIVERS: { label: 'Divers', color: 'bg-amber-100 text-amber-700' },
};

export default function MemoCodeSelector({ selectedMemoCodes, onSelect, onRemove }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState({ code: '', label: '', amount: '', category: 'DIVERS' });
  const queryClient = useQueryClient();

  const { data: memoCodes = [] } = useQuery({
    queryKey: ['memoCodes'],
    queryFn: () => base44.entities.MemoCode.filter({ is_active: true }),
    staleTime: 1000 * 60 * 10,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MemoCode.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['memoCodes'] });
      onSelect({
        id: `memo-${created.id}`,
        memo_code_id: created.id,
        code: created.code,
        title_fr: created.label,
        category: created.category,
        honorarium: created.amount,
        original_honorarium: created.amount,
        reimbursed: 0,
        is_memo: true,
      });
      setNewCode({ code: '', label: '', amount: '', category: 'DIVERS' });
      setShowCreate(false);
      toast.success('Code mémo créé et ajouté');
    },
  });

  const formatAmount = (cents) => {
    if (!cents && cents !== 0) return '0,00 €';
    return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
  };

  const handleSelectExisting = (memoCode) => {
    const alreadySelected = selectedMemoCodes?.some(c => c.memo_code_id === memoCode.id);
    if (alreadySelected) return;
    
    onSelect({
      id: `memo-${memoCode.id}`,
      memo_code_id: memoCode.id,
      code: memoCode.code,
      title_fr: memoCode.label,
      category: memoCode.category,
      honorarium: memoCode.amount,
      original_honorarium: memoCode.amount,
      reimbursed: 0,
      is_memo: true,
    });
  };

  const handleCreate = () => {
    if (!newCode.code || !newCode.label || !newCode.amount) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    createMutation.mutate({
      code: newCode.code,
      label: newCode.label,
      amount: Math.round(parseFloat(newCode.amount) * 100),
      category: newCode.category,
    });
  };

  const sortedCodes = [...memoCodes].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-amber-600" />
          <Label className="text-base font-semibold">Frais fixes / Codes mémo</Label>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreate(!showCreate)}
          className="gap-1 text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Nouveau
        </Button>
      </div>

      {/* Existing memo codes */}
      {sortedCodes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sortedCodes.map(mc => {
            const isSelected = selectedMemoCodes?.some(c => c.memo_code_id === mc.id);
            const catConfig = CATEGORY_LABELS[mc.category] || CATEGORY_LABELS.DIVERS;
            return (
              <Button
                key={mc.id}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                disabled={isSelected}
                onClick={() => handleSelectExisting(mc)}
                className="gap-2 h-auto py-2"
              >
                <span className="font-mono text-xs">{mc.code}</span>
                <span>{mc.label}</span>
                <Badge className={`${catConfig.color} text-[10px] ml-1`}>{formatAmount(mc.amount)}</Badge>
              </Button>
            );
          })}
        </div>
      )}

      {sortedCodes.length === 0 && !showCreate && (
        <p className="text-sm text-slate-500">Aucun code mémo. Créez-en un pour facturer des frais récurrents non-INAMI.</p>
      )}

      {/* Create new */}
      {showCreate && (
        <Card className="p-4 border-amber-200 bg-amber-50/50">
          <p className="text-sm font-semibold mb-3">Créer un nouveau code mémo</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Code</Label>
              <Input
                value={newCode.code}
                onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                placeholder="ADMIN-01"
                className="h-9 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">Libellé</Label>
              <Input
                value={newCode.label}
                onChange={(e) => setNewCode({ ...newCode, label: e.target.value })}
                placeholder="Frais de dossier"
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Montant (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={newCode.amount}
                onChange={(e) => setNewCode({ ...newCode, amount: e.target.value })}
                placeholder="5.00"
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Catégorie</Label>
              <Select value={newCode.category} onValueChange={(v) => setNewCode({ ...newCode, category: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Créer & ajouter
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}