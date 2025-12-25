import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Keyboard } from 'lucide-react';

// Définition de tous les raccourcis clavier
export const SHORTCUTS = {
  // Navigation
  DASHBOARD: { keys: ['Alt', 'D'], description: 'Aller au tableau de bord', category: 'Navigation' },
  AGENDA: { keys: ['Alt', 'A'], description: 'Ouvrir l\'agenda', category: 'Navigation' },
  PATIENTS: { keys: ['Alt', 'L'], description: 'Liste des patients', category: 'Navigation' },
  SEARCH: { keys: ['Ctrl', 'K'], description: 'Recherche rapide', category: 'Navigation' },
  
  // Actions patient
  NEW_PATIENT: { keys: ['Alt', 'N'], description: 'Nouveau patient', category: 'Patient' },
  READ_EID: { keys: ['Alt', 'E'], description: 'Lire carte eID', category: 'Patient' },
  BILLING: { keys: ['Alt', 'F'], description: 'Facturation rapide', category: 'Patient' },
  PRESCRIPTION: { keys: ['Alt', 'P'], description: 'Nouvelle prescription', category: 'Patient' },
  VACCINATION: { keys: ['Alt', 'V'], description: 'Vaccination', category: 'Patient' },
  
  // Consultation
  NEW_CONSULTATION: { keys: ['Alt', 'C'], description: 'Nouvelle consultation', category: 'Consultation' },
  SAVE_DRAFT: { keys: ['Ctrl', 'S'], description: 'Sauvegarder brouillon', category: 'Consultation' },
  SIGN_SEND: { keys: ['Ctrl', 'Enter'], description: 'Signer et envoyer', category: 'Consultation' },
  
  // Général
  HELP: { keys: ['?'], description: 'Afficher les raccourcis', category: 'Général' },
  ESCAPE: { keys: ['Escape'], description: 'Fermer modal/annuler', category: 'Général' },
};

// Hook pour gérer les raccourcis
export function useKeyboardShortcuts(shortcuts = {}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignorer si on est dans un champ de saisie
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        // Sauf pour Escape et Ctrl+S
        if (e.key !== 'Escape' && !(e.ctrlKey && e.key === 's')) {
          return;
        }
      }

      Object.entries(shortcuts).forEach(([action, handler]) => {
        const shortcut = SHORTCUTS[action];
        if (!shortcut) return;

        const keys = shortcut.keys;
        let match = true;

        // Vérifier les modificateurs
        if (keys.includes('Ctrl') && !e.ctrlKey) match = false;
        if (keys.includes('Alt') && !e.altKey) match = false;
        if (keys.includes('Shift') && !e.shiftKey) match = false;

        // Vérifier la touche principale
        const mainKey = keys.find(k => !['Ctrl', 'Alt', 'Shift'].includes(k));
        if (mainKey && e.key.toLowerCase() !== mainKey.toLowerCase()) match = false;

        if (match) {
          e.preventDefault();
          handler();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Composant pour afficher la liste des raccourcis
export function KeyboardShortcutsHelp({ isOpen, onClose }) {
  const categories = [...new Set(Object.values(SHORTCUTS).map(s => s.category))];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Raccourcis clavier
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {categories.map(category => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {Object.entries(SHORTCUTS)
                  .filter(([_, s]) => s.category === category)
                  .map(([key, shortcut]) => (
                    <div 
                      key={key}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((k, i) => (
                          <React.Fragment key={k}>
                            <Badge variant="outline" className="font-mono text-xs px-2">
                              {k}
                            </Badge>
                            {i < shortcut.keys.length - 1 && (
                              <span className="text-muted-foreground">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
          💡 Appuyez sur <Badge variant="outline" className="font-mono mx-1">?</Badge> à tout moment pour afficher cette aide
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Composant indicateur de raccourci inline
export function ShortcutHint({ shortcut, className = '' }) {
  const s = SHORTCUTS[shortcut];
  if (!s) return null;

  return (
    <span className={`text-xs text-muted-foreground ${className}`}>
      ({s.keys.join('+')})
    </span>
  );
}