import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  PenTool, Search, FileSignature, Shield, CheckCircle2, Clock, XCircle,
  Loader2, Fingerprint, Smartphone
} from 'lucide-react';

import SignatureRequestsList from '../components/signature/SignatureRequestsList';
import NewSignatureDialog from '../components/signature/NewSignatureDialog';

export default function SignatureElectronique() {
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['signature-requests'],
    queryFn: () => base44.entities.SignatureRequest.list('-created_date', 500),
  });

  const pending = requests.filter(r => r.status === 'pending' || r.status === 'in_progress');
  const signed = requests.filter(r => r.status === 'signed');
  const rejected = requests.filter(r => r.status === 'rejected' || r.status === 'expired');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <PenTool className="w-8 h-8 text-indigo-600" />
            Signature Électronique
          </h1>
          <p className="text-muted-foreground">
            Signez vos documents médicaux avec eID ou itsme® — valeur légale
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <FileSignature className="w-4 h-4 mr-2" />
          Nouvelle signature
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <Clock className="w-5 h-5 mx-auto text-yellow-600 mb-1" />
          <p className="text-2xl font-bold">{pending.length}</p>
          <p className="text-xs text-muted-foreground">En attente</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <CheckCircle2 className="w-5 h-5 mx-auto text-green-600 mb-1" />
          <p className="text-2xl font-bold">{signed.length}</p>
          <p className="text-xs text-muted-foreground">Signés</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Fingerprint className="w-5 h-5 mx-auto text-blue-600 mb-1" />
          <p className="text-2xl font-bold">{requests.filter(r => r.signature_method === 'eid').length}</p>
          <p className="text-xs text-muted-foreground">Via eID</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Smartphone className="w-5 h-5 mx-auto text-purple-600 mb-1" />
          <p className="text-2xl font-bold">{requests.filter(r => r.signature_method === 'itsme').length}</p>
          <p className="text-xs text-muted-foreground">Via itsme®</p>
        </CardContent></Card>
      </div>

      {/* Methods info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-4 flex items-start gap-3">
            <Fingerprint className="w-8 h-8 text-blue-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">eID Card</p>
              <p className="text-xs text-muted-foreground">Signature qualifiée via carte d'identité belge avec lecteur eID</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/30">
          <CardContent className="p-4 flex items-start gap-3">
            <Smartphone className="w-8 h-8 text-purple-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">itsme®</p>
              <p className="text-xs text-muted-foreground">Signature qualifiée via l'app itsme® sur smartphone</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50/30">
          <CardContent className="p-4 flex items-start gap-3">
            <PenTool className="w-8 h-8 text-gray-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Manuelle</p>
              <p className="text-xs text-muted-foreground">Signature avancée avec horodatage et traçabilité</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="pending" className="gap-1.5">
              <Clock className="w-3.5 h-3.5" />En attente ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="signed" className="gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />Signés ({signed.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-1.5">
              <XCircle className="w-3.5 h-3.5" />Rejetés ({rejected.length})
            </TabsTrigger>
          </TabsList>
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input className="pl-8 h-8 text-xs" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <TabsContent value="pending" className="mt-4">
          <SignatureRequestsList requests={pending} search={search} isLoading={isLoading} showSign />
        </TabsContent>
        <TabsContent value="signed" className="mt-4">
          <SignatureRequestsList requests={signed} search={search} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="rejected" className="mt-4">
          <SignatureRequestsList requests={rejected} search={search} isLoading={isLoading} />
        </TabsContent>
      </Tabs>

      <NewSignatureDialog isOpen={showNewDialog} onClose={() => setShowNewDialog(false)} />
    </div>
  );
}