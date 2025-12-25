import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ConsultRNService({ onPatientFound }) {
  const [isLoading, setIsLoading] = useState(false);
  const [niss, setNiss] = useState('');
  const [result, setResult] = useState(null);

  const searchPatient = async () => {
    if (!niss.trim()) {
      toast.error('Veuillez entrer un numéro NISS');
      return;
    }

    setIsLoading(true);
    try {
      // Simulation de consultation du Registre National
      await new Promise(resolve => setTimeout(resolve, 1000));
      setResult({
        found: false,
        message: 'Service de consultation du Registre National (simulation)'
      });
      toast.info('Consultation RN effectuée (simulation)');
    } catch (error) {
      console.error('Erreur consultation RN:', error);
      toast.error('Erreur lors de la consultation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="w-5 h-5 text-blue-600" />
          Consultation Registre National
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Consultez les données d'identité via le Registre National belge.
        </p>

        <div className="space-y-2">
          <Label htmlFor="niss">Numéro NISS</Label>
          <div className="flex gap-2">
            <Input
              id="niss"
              value={niss}
              onChange={(e) => setNiss(e.target.value)}
              placeholder="XX.XX.XX-XXX.XX"
              className="font-mono"
            />
            <Button onClick={searchPatient} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {result && (
          <div className="p-3 bg-slate-50 rounded-lg text-sm">
            {result.message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}