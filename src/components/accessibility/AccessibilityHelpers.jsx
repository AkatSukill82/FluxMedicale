import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  ZoomIn, 
  ZoomOut, 
  Contrast,
  Keyboard
} from 'lucide-react';

// Helpers WCAG 2.2 - Accessibilité sans alourdir l'UI
export function AccessibilityToolbar() {
  const [contrastMode, setContrastMode] = React.useState(false);
  const [fontSize, setFontSize] = React.useState(100);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = React.useState(false);

  const toggleContrast = () => {
    setContrastMode(!contrastMode);
    document.body.classList.toggle('high-contrast');
  };

  const adjustFontSize = (delta) => {
    const newSize = Math.max(80, Math.min(150, fontSize + delta));
    setFontSize(newSize);
    document.documentElement.style.fontSize = `${newSize}%`;
  };

  return (
    <div 
      className="fixed bottom-4 right-4 bg-white border border-slate-200 rounded-lg shadow-lg p-2 flex items-center gap-2 z-50"
      role="toolbar"
      aria-label="Outils d'accessibilité"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => adjustFontSize(-10)}
        aria-label="Réduire la taille du texte"
        title="Réduire la taille du texte"
        className="w-8 h-8"
      >
        <ZoomOut className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => adjustFontSize(10)}
        aria-label="Augmenter la taille du texte"
        title="Augmenter la taille du texte"
        className="w-8 h-8"
      >
        <ZoomIn className="w-4 h-4" />
      </Button>

      <div className="w-px h-6 bg-slate-200" />

      <Button
        variant="ghost"
        size="icon"
        onClick={toggleContrast}
        aria-label="Mode contraste élevé"
        title="Mode contraste élevé"
        className="w-8 h-8"
        aria-pressed={contrastMode}
      >
        <Contrast className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
        aria-label="Afficher les raccourcis clavier"
        title="Raccourcis clavier (Alt+K)"
        className="w-8 h-8"
      >
        <Keyboard className="w-4 h-4" />
      </Button>

      {showKeyboardShortcuts && (
        <div 
          className="absolute bottom-14 right-0 bg-white border border-slate-200 rounded-lg shadow-xl p-4 w-80"
          role="dialog"
          aria-label="Raccourcis clavier"
        >
          <h3 className="font-semibold mb-3 text-sm">Raccourcis clavier</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <kbd className="px-2 py-1 bg-slate-100 rounded">Alt + P</kbd>
              <span>Patients</span>
            </div>
            <div className="flex justify-between">
              <kbd className="px-2 py-1 bg-slate-100 rounded">Alt + A</kbd>
              <span>Agenda</span>
            </div>
            <div className="flex justify-between">
              <kbd className="px-2 py-1 bg-slate-100 rounded">Alt + F</kbd>
              <span>Facturation</span>
            </div>
            <div className="flex justify-between">
              <kbd className="px-2 py-1 bg-slate-100 rounded">Alt + S</kbd>
              <span>Recherche</span>
            </div>
            <div className="flex justify-between">
              <kbd className="px-2 py-1 bg-slate-100 rounded">Esc</kbd>
              <span>Fermer dialogue</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook pour gestion focus visible (WCAG 2.4.11)
export function useFocusManagement() {
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    };

    const handleMouseDown = () => {
      document.body.classList.remove('keyboard-navigation');
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);
}

// Style global pour mode contraste (à ajouter dans Layout ou App)
export const accessibilityStyles = `
.high-contrast {
  --slate-50: #fff;
  --slate-100: #f0f0f0;
  --slate-900: #000;
  filter: contrast(1.2);
}

.keyboard-navigation *:focus {
  outline: 3px solid #2563eb !important;
  outline-offset: 2px !important;
}

/* WCAG 2.4.11 - Focus Not Obscured */
*:focus {
  scroll-margin-top: 100px;
  scroll-margin-bottom: 100px;
}

/* Tailles interactives ≥ 24px (WCAG 2.5.8) */
button, a, [role="button"], [role="link"] {
  min-width: 24px;
  min-height: 24px;
}
`;