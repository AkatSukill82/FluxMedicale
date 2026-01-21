import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { thinDataCollector } from '@/functions/thinDataCollector';
import { Loader2, Shield, Check } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Composant affiché à la déconnexion pour collecter les données THIN
 * Collecte uniquement : âge, sexe, symptômes (aucune donnée identifiante)
 */
export default function ThinLogoutCollector({ isOpen, onClose, onLogout }) {
  const [collecting, setCollecting] = useState(false);
  const [collected, setCollected] = useState(false);
  const [skipCollection, setSkipCollection] = useState(false);
  const [result, setResult] = useState(null);

  const handleCollectAndLogout = async () => {
    if (skipCollection) {
      onLogout();
      return;
    }

    setCollecting(true);
    try {
      const response = await thinDataCollector({ action: 'collect_daily_data' });
      setResult(response.data);
      setCollected(true);
      
      // Attendre 2 secondes pour montrer le résultat puis déconnecter
      setTimeout(() => {
        onLogout();
      }, 2000);
    } catch (error) {
      console.error('THIN collection error:', error);
      toast.error('Erreur lors de la collecte');
      // En cas d'erreur, permettre quand même la déconnexion
      onLogout();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Projet THIN - Données anonymes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!collected ? (
            <>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  Avant de vous déconnecter, souhaitez-vous contribuer au projet THIN 
                  en partageant des données <strong>anonymes</strong> sur les consultations du jour ?
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs font-medium text-slate-700 mb-2">
                  Données collectées (100% anonymes) :
                </p>
                <ul className="text-xs text-slate-600 space-y-1">
                  <li>• Âge du patient</li>
                  <li>• Sexe (M/F)</li>
                  <li>• Symptômes observés</li>
                </ul>
                <p className="text-xs text-slate-500 mt-2 italic">
                  Aucun nom, NISS, adresse ou donnée identifiante n'est collecté.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="skip"
                  checked={skipCollection}
                  onCheckedChange={setSkipCollection}
                />
                <label htmlFor="skip" className="text-sm text-slate-600 cursor-pointer">
                  Ne pas collecter aujourd'hui
                </label>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Annuler
                </Button>
                <Button 
                  onClick={handleCollectAndLogout} 
                  className="flex-1"
                  disabled={collecting}
                >
                  {collecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Collecte...
                    </>
                  ) : skipCollection ? (
                    'Se déconnecter'
                  ) : (
                    'Collecter et se déconnecter'
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <p className="font-medium text-green-800">Merci pour votre contribution !</p>
              <p className="text-sm text-slate-600 mt-1">
                {result?.count || 0} entrées anonymes collectées
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Déconnexion en cours...
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}