import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

export default function ChapterIVToggle({ medication, isChapterIV, onToggle, onOpenForm }) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <button
        type="button"
        onClick={() => onToggle(!isChapterIV)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
          isChapterIV
            ? 'bg-purple-100 border-purple-300 text-purple-800'
            : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-purple-200 hover:text-purple-600'
        }`}
      >
        <Shield className="w-3 h-3" />
        Chapitre IV
      </button>
      {isChapterIV && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="text-xs text-purple-600 h-auto p-0"
          onClick={() => onOpenForm(medication)}
        >
          Remplir la demande →
        </Button>
      )}
    </div>
  );
}