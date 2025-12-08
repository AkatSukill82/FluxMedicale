import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ModuleTests({ testResults, isRunningTests, onRunTests }) {
  const hasResults = Object.keys(testResults).length > 0;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Tests d'Intégration
          </CardTitle>
          <Button 
            onClick={onRunTests} 
            disabled={isRunningTests}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isRunningTests ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Tests en cours...
              </>
            ) : (
              'Relancer les tests'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!hasResults && !isRunningTests ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 mb-4">Aucun test n'a été exécuté</p>
            <Button onClick={onRunTests} className="bg-blue-600 hover:bg-blue-700">
              Lancer les tests
            </Button>
          </div>
        ) : isRunningTests ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-slate-200 rounded animate-pulse mb-2" />
                  <div className="h-3 w-48 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(testResults).map(([module, result]) => (
              <div 
                key={module} 
                className={`p-4 border rounded-lg transition-all ${
                  result.success 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <h4 className="font-semibold text-slate-900">{module}</h4>
                      <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                        {result.message}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {format(new Date(result.timestamp), 'HH:mm:ss', { locale: fr })}
                  </Badge>
                </div>

                {result.details && (
                  <div className="mt-3 p-3 bg-white rounded border border-slate-200">
                    <p className="text-xs font-medium text-slate-700 mb-2">Détails:</p>
                    <pre className="text-xs text-slate-600 overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Info sur les environnements */}
        {hasResults && !isRunningTests && (
          <Alert className="mt-6 bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800">
              <strong>Note:</strong> Tous les tests utilisent les environnements d'acceptance/sandbox. 
              Aucune donnée réelle n'est envoyée aux services eHealth en production.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}