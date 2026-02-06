import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  RefreshCw,
  Monitor,
  Globe,
  Shield,
  Download,
  ExternalLink,
  Bug,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { webEidService } from '@/components/eid/webEidService';
import { eidDetectionService } from '@/components/eid/eidDetectionService';

export default function EIDTest() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await eidDetectionService.detectEIDMiddleware();
      setStatus(result);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const testWebEidStatus = async () => {
    setLoading(true);
    setError(null);
    setRawData(null);
    try {
      const webeidStatus = await webEidService.checkStatus();
      setRawData({
        type: 'Web-eID Status',
        data: webeidStatus
      });
      toast.success('Statut Web-eID récupéré');
    } catch (e) {
      setError(e.message);
      toast.error(e.message);
    }
    setLoading(false);
  };

  const testReadCard = async () => {
    setLoading(true);
    setError(null);
    setTestResult(null);
    setRawData(null);
    
    try {
      toast.info('Préparation de la lecture...');
      
      // Test via Web-eID
      if (status?.hasWebEid) {
        const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
        
        toast.info('Authentification en cours - entrez votre PIN...');
        const authResult = await webEidService.authenticate(nonce, { lang: 'fr' });
        
        // Afficher le résultat brut
        setRawData({
          type: 'Web-eID Authentication Response',
          data: {
            algorithm: authResult.algorithm,
            format: authResult.format,
            certificateLength: authResult.unverifiedCertificate?.length,
            signatureLength: authResult.signature?.length,
            // Afficher les premiers caractères du certificat pour debug
            certificatePreview: authResult.unverifiedCertificate?.substring(0, 100) + '...'
          }
        });
        
        // Tenter de parser le certificat
        if (authResult.unverifiedCertificate) {
          const parsed = webEidService.parseAsn1.parseCertificate(authResult.unverifiedCertificate);
          
          setTestResult({
            success: true,
            method: 'Web-eID',
            parsedData: parsed,
            niss: parsed?.serialNumber,
            firstName: parsed?.givenName,
            lastName: parsed?.surname,
            commonName: parsed?.commonName
          });
          
          if (parsed?.serialNumber) {
            toast.success(`Carte lue ! NISS: ${parsed.serialNumber}`);
          } else {
            toast.warning('Certificat lu mais NISS non trouvé');
          }
        }
      } 
      // Test via e-Contract
      else if (status?.hasEContract) {
        toast.info('Lecture via e-Contract...');
        const response = await fetch('http://localhost:35963/v1/card-data', {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(15000)
        });

        if (response.ok) {
          const data = await response.json();
          setRawData({
            type: 'e-Contract Card Data',
            data: data
          });
          setTestResult({
            success: true,
            method: 'e-Contract',
            parsedData: data
          });
          toast.success('Carte lue via e-Contract');
        } else {
          throw new Error(`e-Contract: ${response.status}`);
        }
      } else {
        throw new Error('Aucun middleware eID disponible');
      }
    } catch (e) {
      console.error('[EID Test]', e);
      setError(e.message || 'Erreur inconnue');
      setTestResult({
        success: false,
        error: e.message,
        code: e.code
      });
      toast.error(e.message);
    }
    
    setLoading(false);
  };

  const testReadCardDirect = async () => {
    setLoading(true);
    setError(null);
    setTestResult(null);
    
    try {
      toast.info('Lecture directe via readCardData...');
      const cardData = await webEidService.readCardData({ lang: 'fr' });
      
      setTestResult({
        success: cardData.success,
        method: 'Web-eID readCardData',
        data: cardData
      });
      
      setRawData({
        type: 'readCardData Result',
        data: cardData
      });
      
      if (cardData.nationalNumber) {
        toast.success(`Données lues ! NISS: ${cardData.nationalNumber}`);
      } else {
        toast.warning('Données incomplètes');
      }
    } catch (e) {
      setError(e.message);
      setTestResult({ success: false, error: e.message });
      toast.error(e.message);
    }
    
    setLoading(false);
  };

  const copyToClipboard = (data) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast.success('Copié dans le presse-papier');
  };

  const links = eidDetectionService.getInstallationLinks();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bug className="w-6 h-6" />
            Test de lecture eID
          </h1>
          <p className="text-muted-foreground">
            Diagnostic et test de la lecture de carte d'identité électronique
          </p>
        </div>
        <Button variant="outline" onClick={checkStatus} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Rafraîchir
        </Button>
      </div>

      {/* Statut du système */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Statut du système
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg border">
              <div className="text-sm text-muted-foreground">Plateforme</div>
              <div className="font-medium capitalize">{status?.platform || '...'}</div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-sm text-muted-foreground">Navigateur</div>
              <div className="font-medium capitalize">{links.browser}</div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-sm text-muted-foreground">Web-eID</div>
              <div className="flex items-center gap-1">
                {status?.hasWebEid ? (
                  <><CheckCircle className="w-4 h-4 text-green-500" /> Disponible</>
                ) : (
                  <><XCircle className="w-4 h-4 text-red-500" /> Non détecté</>
                )}
              </div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-sm text-muted-foreground">e-Contract</div>
              <div className="flex items-center gap-1">
                {status?.hasEContract ? (
                  <><CheckCircle className="w-4 h-4 text-green-500" /> Disponible</>
                ) : (
                  <><XCircle className="w-4 h-4 text-gray-400" /> Non détecté</>
                )}
              </div>
            </div>
          </div>

          {status?.details && (
            <div className={`p-3 rounded-lg ${status.hasMiddleware ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'}`}>
              {status.details}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Tests de lecture
          </CardTitle>
          <CardDescription>
            Insérez votre carte eID et lancez un test
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button onClick={testWebEidStatus} disabled={loading}>
              <Shield className="w-4 h-4 mr-2" />
              1. Test Statut Web-eID
            </Button>
            <Button onClick={testReadCard} disabled={loading || !status?.hasMiddleware}>
              <CreditCard className="w-4 h-4 mr-2" />
              2. Test Authentification
            </Button>
            <Button onClick={testReadCardDirect} disabled={loading || !status?.hasWebEid} variant="secondary">
              <CreditCard className="w-4 h-4 mr-2" />
              3. Lecture Directe
            </Button>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Opération en cours...
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg">
              <div className="font-medium flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Erreur
              </div>
              <div className="mt-1 text-sm">{error}</div>
            </div>
          )}

          {testResult && (
            <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center justify-between">
                <div className="font-medium flex items-center gap-2">
                  {testResult.success ? (
                    <><CheckCircle className="w-4 h-4 text-green-600" /> Succès</>
                  ) : (
                    <><XCircle className="w-4 h-4 text-red-600" /> Échec</>
                  )}
                  {testResult.method && <Badge variant="outline">{testResult.method}</Badge>}
                </div>
              </div>
              
              {testResult.success && testResult.parsedData && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">NISS:</span> <strong>{testResult.niss || testResult.parsedData.serialNumber || 'Non trouvé'}</strong></div>
                  <div><span className="text-muted-foreground">Prénom:</span> {testResult.firstName || testResult.parsedData.givenName || 'Non trouvé'}</div>
                  <div><span className="text-muted-foreground">Nom:</span> {testResult.lastName || testResult.parsedData.surname || 'Non trouvé'}</div>
                  <div><span className="text-muted-foreground">CN:</span> {testResult.commonName || testResult.parsedData.commonName || 'Non trouvé'}</div>
                </div>
              )}

              {testResult.data && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">NISS:</span> <strong>{testResult.data.nationalNumber || 'Non trouvé'}</strong></div>
                  <div><span className="text-muted-foreground">Prénom:</span> {testResult.data.firstName || 'Non trouvé'}</div>
                  <div><span className="text-muted-foreground">Nom:</span> {testResult.data.lastName || 'Non trouvé'}</div>
                  <div><span className="text-muted-foreground">Date naissance:</span> {testResult.data.birthDate || 'Non trouvée'}</div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Données brutes (debug) */}
      {rawData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bug className="w-5 h-5" />
                Données brutes: {rawData.type}
              </span>
              <Button size="sm" variant="ghost" onClick={() => copyToClipboard(rawData.data)}>
                <Copy className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="p-3 bg-slate-100 rounded-lg text-xs overflow-auto max-h-64">
              {JSON.stringify(rawData.data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Liens d'installation */}
      {!status?.hasMiddleware && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Installation requise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium mb-2">1. eID Viewer officiel (prérequis)</h3>
                <Button variant="outline" className="w-full" asChild>
                  <a href={links.official.viewer} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Télécharger eID Viewer
                  </a>
                </Button>
              </div>
              
              <div className="p-4 border rounded-lg bg-blue-50">
                <h3 className="font-medium mb-2">2. Web-eID (recommandé)</h3>
                <div className="space-y-2">
                  <Button className="w-full" asChild>
                    <a href={status?.platform === 'windows' ? links.webEid.windows : links.webEid.macos} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-2" />
                      Application Web-eID
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <a href={links.browser === 'firefox' ? links.webEid.firefoxExtension : links.webEid.chromeExtension} target="_blank" rel="noopener noreferrer">
                      <Globe className="w-4 h-4 mr-2" />
                      Extension navigateur
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}