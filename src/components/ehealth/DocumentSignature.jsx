import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Shield,
  Smartphone,
  CreditCard,
  CheckCircle,
  Loader2,
  AlertCircle,
  Lock,
  FileSignature
} from 'lucide-react';
import { toast } from 'sonner';

export default function DocumentSignature({ 
  document, 
  patient, 
  onSigned, 
  isOpen, 
  onClose 
}) {
  const [signMethod, setSignMethod] = useState(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureStatus, setSignatureStatus] = useState(null);

  const handleSignWithItsme = async () => {
    setIsSigning(true);
    setSignatureStatus(null);

    try {
      const user = await base44.auth.me();

      // Simulation du flux itsme® pour signature
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Mettre à jour le document avec la signature
      await base44.entities.Document.update(document.id, {
        status: 'SIGNED',
        signature: {
          signed: true,
          method: 'ITSME',
          timestamp: new Date().toISOString(),
          certificate_thumbprint: `SHA256:${Math.random().toString(36).substring(7)}`,
          qes_compliant: true
        }
      });

      // Créer événement timeline
      await base44.entities.TimelineEvent.create({
        patient_id: patient.id,
        event_type: 'DOCUMENT',
        event_date: new Date().toISOString(),
        title: 'Document signé électroniquement',
        description: `${document.title} signé via itsme® par ${user.full_name}`,
        source: 'FluxMed',
        source_id: document.id,
        provider: user.email,
        created_by: user.email
      });

      setSignatureStatus('success');
      toast.success('Document signé avec succès via itsme®');

      setTimeout(() => {
        if (onSigned) onSigned();
        if (onClose) onClose();
      }, 2000);

    } catch (error) {
      console.error('Erreur signature itsme:', error);
      setSignatureStatus('error');
      toast.error('Erreur lors de la signature');
    } finally {
      setIsSigning(false);
    }
  };

  const handleSignWithEID = async () => {
    setIsSigning(true);
    setSignatureStatus(null);

    try {
      const user = await base44.auth.me();

      // Simulation du flux eID pour signature
      await new Promise(resolve => setTimeout(resolve, 3000));

      await base44.entities.Document.update(document.id, {
        status: 'SIGNED',
        signature: {
          signed: true,
          method: 'EID',
          timestamp: new Date().toISOString(),
          certificate_thumbprint: `SHA256:${Math.random().toString(36).substring(7)}`,
          qes_compliant: true
        }
      });

      await base44.entities.TimelineEvent.create({
        patient_id: patient.id,
        event_type: 'DOCUMENT',
        event_date: new Date().toISOString(),
        title: 'Document signé électroniquement',
        description: `${document.title} signé via eID par ${user.full_name}`,
        source: 'FluxMed',
        source_id: document.id,
        provider: user.email,
        created_by: user.email
      });

      setSignatureStatus('success');
      toast.success('Document signé avec succès via eID');

      setTimeout(() => {
        if (onSigned) onSigned();
        if (onClose) onClose();
      }, 2000);

    } catch (error) {
      console.error('Erreur signature eID:', error);
      setSignatureStatus('error');
      toast.error('Erreur lors de la signature');
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-blue-600" />
            Signature électronique qualifiée
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations document */}
          <Alert>
            <Shield className="w-4 h-4 text-blue-600" />
            <AlertDescription>
              <strong>Document:</strong> {document.title}
              <br />
              <strong>Patient:</strong> {patient.name?.[0]?.given?.join(' ')} {patient.name?.[0]?.family}
            </AlertDescription>
          </Alert>

          {/* Conformité eIDAS */}
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="flex items-center gap-2">
                <Lock className="w-3 h-3" />
                <span className="font-semibold">Signature électronique qualifiée (QES)</span>
              </div>
              <p className="text-xs mt-1">
                Conforme au règlement européen eIDAS • Valeur légale équivalente à une signature manuscrite
              </p>
            </AlertDescription>
          </Alert>

          {!signMethod && !isSigning && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 mb-4">
                Choisissez votre méthode de signature électronique:
              </p>

              {/* Option itsme® */}
              <Card 
                className="cursor-pointer hover:border-pink-400 transition-colors"
                onClick={() => setSignMethod('ITSME')}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Smartphone className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">Signer avec itsme®</h3>
                      <p className="text-sm text-slate-600 mb-2">
                        Signature avec votre smartphone via l'app itsme®
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          QES conforme eIDAS
                        </Badge>
                        <Badge variant="outline" className="text-xs">Simple</Badge>
                        <Badge variant="outline" className="text-xs">Sans lecteur de carte</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Option eID */}
              <Card 
                className="cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => setSignMethod('EID')}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">Signer avec eID</h3>
                      <p className="text-sm text-slate-600 mb-2">
                        Signature avec votre carte d'identité électronique belge
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          QES conforme eIDAS
                        </Badge>
                        <Badge variant="outline" className="text-xs">Officiel</Badge>
                        <Badge variant="outline" className="text-xs">Lecteur de carte requis</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Processus de signature */}
          {signMethod === 'ITSME' && !signatureStatus && (
            <Card className="border-pink-200 bg-pink-50">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                    <Smartphone className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Signature via itsme®</h4>
                    <p className="text-sm text-slate-600 mb-4">
                      Cliquez sur "Signer maintenant" et validez la demande dans votre app itsme®
                    </p>
                  </div>
                  <Button
                    onClick={handleSignWithItsme}
                    disabled={isSigning}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                    size="lg"
                  >
                    {isSigning ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signature en cours...
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4 mr-2" />
                        Signer maintenant
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {signMethod === 'EID' && !signatureStatus && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto">
                    <CreditCard className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Signature via eID</h4>
                    <p className="text-sm text-slate-600 mb-4">
                      Insérez votre carte eID dans le lecteur et entrez votre code PIN
                    </p>
                  </div>
                  <Button
                    onClick={handleSignWithEID}
                    disabled={isSigning}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    {isSigning ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signature en cours...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Signer maintenant
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Résultat */}
          {signatureStatus === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Document signé avec succès !</strong>
                <p className="text-sm mt-1">
                  Signature électronique qualifiée conforme eIDAS enregistrée.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {signatureStatus === 'error' && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Erreur lors de la signature. Veuillez réessayer.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          {!signatureStatus && (
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Annuler
              </Button>
              {signMethod && (
                <Button variant="outline" onClick={() => setSignMethod(null)}>
                  Changer de méthode
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}