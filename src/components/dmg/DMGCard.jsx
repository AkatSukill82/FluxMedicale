
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Heart, 
  Calendar, 
  User, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Plus,
  RefreshCw,
  Shield
} from 'lucide-react';
import { format, isAfter, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useDMG } from './useDMG';
import { DMG } from '@/entities/DMG';

export default function DMGCard({ patient, currentUser }) {
  const [dmgData, setDmgData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);
  
  const { isLoading: isOperationLoading, error, checkDMGStatus, openDMG, renewDMG } = useDMG(currentUser);

  const loadDMGData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Chercher les données DMG existantes
      const existingDMG = await DMG.filter({ patient_id: patient.id }, '-derniere_verification', 1);
      
      if (existingDMG.length > 0) {
        setDmgData(existingDMG[0]);
        setLastCheck(existingDMG[0].derniere_verification);
      } else {
        // If no existing DMG is found, ensure dmgData is null to show the "check DMG" button
        setDmgData(null); 
        setLastCheck(null);
      }
    } catch (error) {
      console.error('Erreur chargement DMG:', error);
    } finally {
      setIsLoading(false);
    }
  }, [patient.id]); // Dependency on patient.id for the callback

  useEffect(() => {
    loadDMGData();
  }, [loadDMGData]); // Dependency on the memoized callback

  const handleCheckDMG = async () => {
    setIsLoading(true); // Set loading state for the check operation
    try {
      const result = await checkDMGStatus(patient);
      
      // Vérifier que le résultat contient bien les données nécessaires
      if (!result) {
        setIsLoading(false);
        return;
      }
      
      // Sauvegarder ou mettre à jour les données DMG
      const existingDMGRecords = await DMG.filter({ patient_id: patient.id }, '-id', 1);
      
      if (existingDMGRecords.length > 0) {
        await DMG.update(existingDMGRecords[0].id, result);
      } else {
        await DMG.create(result);
      }
      
      setDmgData(result);
      setLastCheck(result.derniere_verification);
    } catch (error) {
      console.error('Erreur vérification DMG:', error);
    } finally {
      setIsLoading(false); // Reset loading state
    }
  };

  const handleOpenDMG = async () => {
    setIsLoading(true); // Set loading state for the open operation
    try {
      const result = await openDMG(patient);
      
      if (result.status === 'SUCCESS') {
        // Mettre à jour les données DMG locales
        const updatedData = { ...dmgData, ...result.dmg_data };
        
        const existingDMGRecords = await DMG.filter({ patient_id: patient.id }, '-id', 1);
        if (existingDMGRecords.length > 0) {
          await DMG.update(existingDMGRecords[0].id, updatedData);
        } else {
          await DMG.create(updatedData);
        }
        
        setDmgData(updatedData);
      }
    } catch (error) {
      console.error('Erreur ouverture DMG:', error);
    } finally {
      setIsLoading(false); // Reset loading state
    }
  };

  const handleRenewDMG = async () => {
    setIsLoading(true); // Set loading state for the renew operation
    try {
      const result = await renewDMG(patient);
      
      if (result.status === 'SUCCESS') {
        const updatedData = { ...dmgData, ...result.dmg_data };
        
        const existingDMGRecords = await DMG.filter({ patient_id: patient.id }, '-id', 1);
        if (existingDMGRecords.length > 0) {
          await DMG.update(existingDMGRecords[0].id, updatedData);
        } else {
          await DMG.create(updatedData); // This case might happen if renew is called before check/open, which shouldn't ideally but handles defensively
        }
        
        setDmgData(updatedData);
      }
    } catch (error) {
      console.error('Erreur renouvellement DMG:', error);
    } finally {
      setIsLoading(false); // Reset loading state
    }
  };

  const getStatusBadge = (statut) => {
    switch (statut) {
      case 'ACTIF':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />DMG Actif</Badge>;
      case 'EXPIRE':
        return <Badge className="bg-orange-100 text-orange-800"><Clock className="w-3 h-3 mr-1" />DMG Expiré</Badge>;
      case 'SUSPENDU':
        return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="w-3 h-3 mr-1" />DMG Suspendu</Badge>;
      case 'AUCUN':
        return <Badge className="bg-gray-100 text-gray-800">Aucun DMG</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Statut inconnu</Badge>;
    }
  };

  const isDMGExpiringSoon = (dateExpiration) => {
    if (!dateExpiration) return false;
    const expiration = parseISO(dateExpiration);
    const now = new Date();
    const inTwoMonths = new Date();
    inTwoMonths.setMonth(inTwoMonths.getMonth() + 2);
    // DMG is expiring soon if it's after now but before or on two months from now
    return isAfter(expiration, now) && (expiration <= inTwoMonths);
  };

  // patientName is not used in the JSX, consider removing if not needed or add to CardTitle
  // const patientName = patient.name?.[0]?.given?.join(' ') + ' ' + patient.name?.[0]?.family;

  if (isLoading && !dmgData) { // Only show full skeleton if initial load and no data
    return (
      <Card className="shadow-lg border-0 bg-gradient-to-r from-green-50 to-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-900">
            <Heart className="w-5 h-5" />
            Dossier Médical Global (DMG)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-r from-green-50 to-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-green-900">
            <Heart className="w-5 h-5" />
            Dossier Médical Global (DMG)
          </CardTitle>
          {lastCheck && (
            <span className="text-xs text-slate-500">
              Vérifié le {format(new Date(lastCheck), 'dd/MM/yyyy à HH:mm', { locale: fr })}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!dmgData ? (
          <div className="text-center py-4">
            <Shield className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <p className="text-slate-600 mb-4">Statut DMG non vérifié</p>
            <Button onClick={handleCheckDMG} disabled={isOperationLoading || isLoading}>
              {isOperationLoading || isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Vérification...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Vérifier le DMG
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              {getStatusBadge(dmgData.statut)}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCheckDMG}
                disabled={isOperationLoading || isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isOperationLoading || isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {dmgData.statut !== 'AUCUN' && (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <span>
                    <strong>Médecin DMG:</strong> {dmgData.medecin_dmg_nom || 'Non défini'}
                  </span>
                  {dmgData.medecin_dmg_nihii === currentUser?.numero_inami && ( // Add optional chaining for currentUser
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                      Vous
                    </Badge>
                  )}
                </div>

                {dmgData.date_ouverture && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span>
                      <strong>Ouvert le:</strong> {format(new Date(dmgData.date_ouverture), 'dd/MM/yyyy', { locale: fr })}
                    </span>
                  </div>
                )}

                {dmgData.date_expiration && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span>
                      <strong>Expire le:</strong> {format(new Date(dmgData.date_expiration), 'dd/MM/yyyy', { locale: fr })}
                    </span>
                    {isDMGExpiringSoon(dmgData.date_expiration) && (
                      <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Expire bientôt
                      </Badge>
                    )}
                  </div>
                )}

                {dmgData.conditions_dmg && dmgData.conditions_dmg.length > 0 && (
                  <div className="p-2 bg-blue-50 rounded-md">
                    <p className="text-xs font-medium text-blue-900 mb-1">Conditions DMG:</p>
                    {dmgData.conditions_dmg.map((condition, idx) => (
                      <p key={idx} className="text-xs text-blue-800">• {condition}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {dmgData.can_open_dmg && (
                <Button 
                  size="sm" 
                  onClick={handleOpenDMG}
                  disabled={isOperationLoading || isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isOperationLoading || isLoading ? "Ouverture..." : "Ouvrir DMG"}
                </Button>
              )}
              
              {dmgData.can_renew_dmg && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleRenewDMG}
                  disabled={isOperationLoading || isLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isOperationLoading || isLoading ? 'animate-spin' : ''}`} />
                  {isOperationLoading || isLoading ? "Renouvellement..." : "Renouveler DMG"}
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
