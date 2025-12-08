import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, FileSignature, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { useDocumentService } from './useDocumentService';

export default function DocumentViewer({ document, patient, currentUser, onClose }) {
  const [showSignature, setShowSignature] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [recipient, setRecipient] = useState({ name: '', nihii: '', email: '' });
  const [signatureResult, setSignatureResult] = useState(null);
  const [sendResult, setSendResult] = useState(null);

  const { isLoading, error, signDocument, sendViaEHealthBox, sendViaMulteMediatt, generatePDF } = useDocumentService(currentUser, patient);

  const handleSign = async () => {
    try {
      const result = await signDocument(document.id, 'ITSME');
      setSignatureResult(result);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Erreur signature:', err);
    }
  };

  const handleSendEHealthBox = async () => {
    if (!recipient.name) {
      alert('Veuillez renseigner le destinataire');
      return;
    }

    try {
      const result = await sendViaEHealthBox(document.id, recipient);
      setSendResult(result);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Erreur envoi:', err);
    }
  };

  const handleSendMulteMediatt = async () => {
    const patientNiss = patient.identifier?.find(id => id.system === 'nn')?.value;
    if (!patientNiss) {
      alert('NISS patient introuvable');
      return;
    }

    try {
      const result = await sendViaMulteMediatt(document.id, patientNiss);
      setSendResult(result);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Erreur envoi Mult-eMediatt:', err);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SIGNED: 'bg-blue-100 text-blue-800',
      SENT: 'bg-green-100 text-green-800',
      ACKNOWLEDGED: 'bg-purple-100 text-purple-800'
    };

    const labels = {
      DRAFT: 'Brouillon',
      SIGNED: 'Signé',
      SENT: 'Envoyé',
      ACKNOWLEDGED: 'Accusé reçu'
    };

    return <Badge className={styles[status]}>{labels[status]}</Badge>;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{document.title}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                {getStatusBadge(document.status)}
                {document.signature?.signed && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Signé QES
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Informations du document */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Type:</span> {document.type}
            </div>
            <div>
              <span className="font-medium">Sous-type:</span> {document.subtype || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Créé le:</span> {new Date(document.created_date).toLocaleDateString('fr-BE')}
            </div>
            <div>
              <span className="font-medium">Créé par:</span> {document.created_by}
            </div>
          </div>

          {/* Contenu du document */}
          <div>
            <Label>Contenu</Label>
            <div 
              className="border rounded-lg p-6 bg-white min-h-[400px]"
              dangerouslySetInnerHTML={{ __html: document.content_html }}
            />
          </div>

          {/* Signature */}
          {document.status === 'DRAFT' && !showSignature && !signatureResult && (
            <Button onClick={() => setShowSignature(true)} className="w-full">
              <FileSignature className="w-4 h-4 mr-2" />
              Signer le document (itsme® Sign)
            </Button>
          )}

          {showSignature && !signatureResult && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">Signature électronique qualifiée (QES)</h4>
                <p className="text-sm text-slate-700 mb-4">
                  La signature sera effectuée via itsme® et sera conforme eIDAS (PAdES).
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleSign} disabled={isLoading} className="flex-1">
                    {isLoading ? 'Signature en cours...' : 'Confirmer la signature'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowSignature(false)}>
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {signatureResult && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <h4 className="font-semibold text-green-900">Document signé avec succès</h4>
                  <p className="text-sm text-green-700">
                    Signature QES conforme eIDAS - Timestamp: {new Date(signatureResult.timestamp).toLocaleString('fr-BE')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Envoi */}
          {document.status === 'SIGNED' && !showSend && !sendResult && (
            <div className="space-y-2">
              <Button onClick={() => setShowSend(true)} className="w-full">
                <Send className="w-4 h-4 mr-2" />
                Envoyer le document
              </Button>
            </div>
          )}

          {showSend && !sendResult && (
            <Card className="bg-slate-50">
              <CardContent className="p-4 space-y-4">
                <h4 className="font-semibold">Envoi du document</h4>
                
                {document.type === 'ATTESTATION' && document.subtype === 'attestation_incapacite' ? (
                  <div>
                    <p className="text-sm text-slate-700 mb-4">
                      Attestation d'incapacité - Envoi via Mult-eMediatt vers la mutualité
                    </p>
                    <Button onClick={handleSendMulteMediatt} disabled={isLoading} className="w-full">
                      {isLoading ? 'Envoi en cours...' : 'Envoyer à la mutualité'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <Label>Nom du destinataire</Label>
                      <Input
                        value={recipient.name}
                        onChange={(e) => setRecipient({...recipient, name: e.target.value})}
                        placeholder="Dr. Jean Dupont"
                      />
                    </div>
                    <div>
                      <Label>NIHII (optionnel)</Label>
                      <Input
                        value={recipient.nihii}
                        onChange={(e) => setRecipient({...recipient, nihii: e.target.value})}
                        placeholder="12345678901"
                      />
                    </div>
                    <div>
                      <Label>Email (optionnel)</Label>
                      <Input
                        type="email"
                        value={recipient.email}
                        onChange={(e) => setRecipient({...recipient, email: e.target.value})}
                        placeholder="medecin@example.be"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSendEHealthBox} disabled={isLoading} className="flex-1">
                        {isLoading ? 'Envoi...' : 'Envoyer via eHealthBox'}
                      </Button>
                      <Button variant="outline" onClick={() => setShowSend(false)}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {sendResult && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <h4 className="font-semibold text-green-900">Document envoyé avec succès</h4>
                  <p className="text-sm text-green-700">
                    ID transaction: {sendResult.messageId || sendResult.transactionId}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <div>
                  <h4 className="font-semibold text-red-900">Erreur</h4>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>

        <CardFooter className="border-t">
          <Button variant="outline" onClick={onClose} className="w-full">
            Fermer
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}