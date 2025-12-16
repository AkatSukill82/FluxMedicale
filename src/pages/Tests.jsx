import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  Download,
  RefreshCw
} from 'lucide-react';
import { runAllTests, TEST_CATEGORIES } from '../components/testing/FunctionalTests';
import { toast } from 'sonner';

export default function TestsPage() {
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleRunTests = async () => {
    setIsRunning(true);
    setProgress(0);
    setTestResults(null);

    try {
      const results = await runAllTests((current, total) => {
        setProgress((current / total) * 100);
      });
      setTestResults(results);
      
      const failedCount = results.tests.filter(t => !t.passed).length;
      if (failedCount === 0) {
        toast.success('Tous les tests sont passés avec succès !');
      } else {
        toast.error(`${failedCount} test(s) échoué(s)`);
      }
    } catch (error) {
      toast.error('Erreur lors de l\'exécution des tests');
      console.error(error);
    } finally {
      setIsRunning(false);
    }
  };

  const exportReport = () => {
    if (!testResults) return;

    const report = `RAPPORT DE TESTS MEDBRIDGE
Date: ${new Date().toLocaleString('fr-BE')}

RÉSUMÉ:
Total: ${testResults.summary.total}
Réussis: ${testResults.summary.passed} ✔
Échoués: ${testResults.summary.failed} ✖
Durée: ${testResults.summary.duration}ms

DÉTAILS:
${testResults.tests.map(test => `
[${test.passed ? '✔' : '✖'}] ${test.id} - ${test.name}
    Catégorie: ${test.category}
    Durée: ${test.duration}ms
    ${test.passed ? 'Succès' : `Échec: ${test.error}`}
`).join('\n')}

BLOCAGE DÉPLOIEMENT:
${testResults.summary.shouldBlockDeployment ? '⚠️ OUI - Tests critiques échoués' : '✓ NON - Tous les tests critiques passés'}
`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-tests-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  const getCategoryResults = (category) => {
    if (!testResults) return null;
    const categoryTests = testResults.tests.filter(t => t.category === category);
    const passed = categoryTests.filter(t => t.passed).length;
    return { total: categoryTests.length, passed };
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tests Fonctionnels</h1>
          <p className="text-slate-600 mt-1">
            Vérification automatique des fonctionnalités critiques de MediBridge
          </p>
        </div>
        <div className="flex gap-3">
          {testResults && (
            <Button variant="outline" onClick={exportReport}>
              <Download className="w-4 h-4 mr-2" />
              Exporter rapport
            </Button>
          )}
          <Button 
            onClick={handleRunTests} 
            disabled={isRunning}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Tests en cours...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Lancer tous les tests
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Progress */}
      {isRunning && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  Exécution des tests en cours...
                </p>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-blue-700 mt-1">{Math.round(progress)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {testResults && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-2">Total</p>
                <p className="text-3xl font-bold text-slate-900">
                  {testResults.summary.total}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-green-700 mb-2">Réussis</p>
                <p className="text-3xl font-bold text-green-600 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-6 h-6" />
                  {testResults.summary.passed}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-red-700 mb-2">Échoués</p>
                <p className="text-3xl font-bold text-red-600 flex items-center justify-center gap-2">
                  <XCircle className="w-6 h-6" />
                  {testResults.summary.failed}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-2">Durée</p>
                <p className="text-3xl font-bold text-slate-900 flex items-center justify-center gap-2">
                  <Clock className="w-6 h-6" />
                  {(testResults.summary.duration / 1000).toFixed(1)}s
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Deployment Block Warning */}
      {testResults && testResults.summary.shouldBlockDeployment && (
        <Card className="bg-orange-50 border-orange-300">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-8 h-8 text-orange-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-orange-900 text-lg mb-2">
                  ⚠️ Blocage du déploiement recommandé
                </h3>
                <p className="text-orange-800">
                  Des tests critiques (consultations, facturation, historique) ont échoué.
                  Le déploiement devrait être bloqué jusqu'à résolution.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results by Category */}
      {testResults && (
        <div className="space-y-4">
          {TEST_CATEGORIES.map(category => {
            const results = getCategoryResults(category.id);
            if (!results) return null;

            return (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {category.icon}
                      {category.name}
                    </span>
                    <Badge variant={results.passed === results.total ? 'default' : 'destructive'}>
                      {results.passed} / {results.total}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {testResults.tests
                      .filter(t => t.category === category.id)
                      .map(test => (
                        <div 
                          key={test.id}
                          className={`p-4 rounded-lg border ${
                            test.passed 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {test.passed ? (
                                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-red-600" />
                                )}
                                <div>
                                  <p className="font-semibold text-slate-900">
                                    {test.id} - {test.name}
                                  </p>
                                  {test.description && (
                                    <p className="text-sm text-slate-600 mt-1">
                                      {test.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {!test.passed && test.error && (
                                <div className="mt-2 p-3 bg-red-100 rounded border border-red-300">
                                  <p className="text-sm font-semibold text-red-900 mb-1">
                                    Erreur:
                                  </p>
                                  <p className="text-sm text-red-800 font-mono">
                                    {test.error}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="text-right text-sm text-slate-500">
                              <Clock className="w-4 h-4 inline mr-1" />
                              {test.duration}ms
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Initial State */}
      {!testResults && !isRunning && (
        <Card className="border-2 border-dashed border-slate-300">
          <CardContent className="p-12 text-center">
            <Play className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Prêt à lancer les tests
            </h3>
            <p className="text-slate-600 mb-6">
              Cliquez sur "Lancer tous les tests" pour démarrer la vérification automatique
            </p>
            <Button onClick={handleRunTests} size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Play className="w-5 h-5 mr-2" />
              Lancer tous les tests
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}