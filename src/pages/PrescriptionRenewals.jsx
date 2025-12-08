
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Corrected @tantml to @tanstack
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Pill,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Brain,
  Eye,
  Loader2,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AutomatedRenewalWorkflow from '../components/prescriptions/AutomatedRenewalWorkflow';

export default function PrescriptionRenewals() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [physicianNotes, setPhysicianNotes] = useState('');

  const { data: renewalRequests = [], isLoading } = useQuery({
    queryKey: ['renewal-requests'],
    queryFn: () => base44.entities.PrescriptionRenewalRequest.list('-requested_at')
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list()
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PrescriptionRenewalRequest.update(id, data),
    onSuccess: () => {
      // Invalidate queries will happen after the full workflow (including final_prescription_id update)
      // toast.success('Renouvellement approuvé'); // Removed from here to handle explicitly
    },
    onError: (error) => {
      toast.error("Échec de la mise à jour de la demande: " + error.message);
    }
  });

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return 'Patient inconnu';
    const officialName = patient.name?.find(n => n.use === 'official') || {};
    return `${(officialName.given || []).join(' ')} ${officialName.family || ''}`.trim();
  };

  const getPriorityColor = (priority) => {
    const colors = {
      URGENT: 'bg-red-100 text-red-800',
      HIGH: 'bg-orange-100 text-orange-800',
      NORMAL: 'bg-blue-100 text-blue-800',
      LOW: 'bg-gray-100 text-gray-800'
    };
    return colors[priority] || colors.NORMAL;
  };

  const getRiskColor = (risk) => {
    const colors = {
      CRITICAL: 'text-red-600 bg-red-50',
      HIGH: 'text-orange-600 bg-orange-50',
      MEDIUM: 'text-yellow-600 bg-yellow-50',
      LOW: 'text-green-600 bg-green-50'
    };
    return colors[risk] || colors.LOW;
  };

  const handleReview = (request) => {
    setSelectedRequest(request);
    setPhysicianNotes('');
    setShowReviewDialog(true);
  };

  const handleApprove = async () => {
    const currentUser = await base44.auth.me();
    
    // Update the request status
    await approveMutation.mutateAsync({
      id: selectedRequest.id,
      data: {
        status: 'APPROVED',
        physician_decision: {
          decision: 'APPROVED',
          reviewed_by: currentUser.email,
          reviewed_at: new Date().toISOString(),
          notes: physicianNotes
        }
      }
    });

    toast.success('Demande approuvée. Lancement du workflow...');
    setShowReviewDialog(false);
    setShowWorkflowDialog(true);
  };

  const handleDeny = async () => {
    const currentUser = await base44.auth.me();
    
    await approveMutation.mutateAsync({
      id: selectedRequest.id,
      data: {
        status: 'DENIED',
        physician_decision: {
          decision: 'DENIED',
          reviewed_by: currentUser.email,
          reviewed_at: new Date().toISOString(),
          notes: physicianNotes
        },
        denial_reason: physicianNotes
      }
    });
    queryClient.invalidateQueries({ queryKey: ['renewal-requests'] });
    toast.success('Renouvellement refusé');
    setShowReviewDialog(false);
  };

  const pendingRequests = renewalRequests.filter(r => r.status === 'PENDING' || r.status === 'AI_REVIEWED' || r.status === 'PHYSICIAN_REVIEW');
  const processedRequests = renewalRequests.filter(r => r.status === 'APPROVED' || r.status === 'DENIED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Pill className="w-8 h-8 text-primary" />
          Renouvellements d'Ordonnances
        </h1>
        <p className="text-muted-foreground mt-1">
          Système automatisé avec analyse IA des interactions médicamenteuses
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-foreground">{pendingRequests.length}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approuvés</p>
                <p className="text-2xl font-bold text-foreground">
                  {renewalRequests.filter(r => r.status === 'APPROVED').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Refusés</p>
                <p className="text-2xl font-bold text-foreground">
                  {renewalRequests.filter(r => r.status === 'DENIED').length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taux d'auto-approval</p>
                <p className="text-2xl font-bold text-foreground">
                  {renewalRequests.length > 0 
                    ? Math.round((renewalRequests.filter(r => r.ai_analysis?.ai_recommendation === 'AUTO_APPROVE').length / renewalRequests.length) * 100)
                    : 0}%
                </p>
              </div>
              <Brain className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Demandes en attente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Demandes en attente de validation ({pendingRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
              <p className="text-muted-foreground">Aucune demande en attente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="border-2">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <Pill className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg">{getPatientName(request.patient_id)}</h4>
                          <p className="text-sm text-muted-foreground">
                            Demandé le {format(new Date(request.requested_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(request.priority)}>
                          {request.priority}
                        </Badge>
                        {request.ai_analysis && (
                          <Badge className={getRiskColor(request.ai_analysis.risk_level)}>
                            Risque: {request.ai_analysis.risk_level}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Médicaments */}
                    <div className="mb-4">
                      <h5 className="font-semibold text-sm mb-2">Médicaments à renouveler:</h5>
                      <div className="space-y-2">
                        {request.medications.map((med, idx) => (
                          <div key={idx} className="bg-muted p-3 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{med.nom_produit}</span>
                              <span className="text-sm text-muted-foreground">{med.posologie_actuelle}</span>
                            </div>
                            {med.stock_restant && (
                              <p className="text-xs text-muted-foreground mt-1">Stock restant: {med.stock_restant}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Analyse IA */}
                    {request.ai_analysis && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Brain className="w-5 h-5 text-blue-600" />
                          <h5 className="font-semibold text-blue-900 dark:text-blue-100">Analyse IA</h5>
                          <Badge variant="outline">
                            Confiance: {Math.round(request.ai_analysis.confidence_level * 100)}%
                          </Badge>
                        </div>

                        {request.ai_analysis.drug_interactions && request.ai_analysis.drug_interactions.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                              ⚠️ Interactions médicamenteuses détectées:
                            </p>
                            {request.ai_analysis.drug_interactions.map((interaction, idx) => (
                              <div key={idx} className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded text-sm mb-2">
                                <p className="font-medium">{interaction.drugs_involved.join(' + ')}</p>
                                <p className="text-xs text-muted-foreground">{interaction.description}</p>
                                <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                                  <strong>Recommandation:</strong> {interaction.recommendation}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {request.ai_analysis.alternatives_suggested && request.ai_analysis.alternatives_suggested.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                              💡 Alternatives suggérées:
                            </p>
                            {request.ai_analysis.alternatives_suggested.map((alt, idx) => (
                              <div key={idx} className="bg-white dark:bg-gray-800 p-2 rounded text-sm mb-2">
                                <p className="font-medium">{alt.medication}</p>
                                <p className="text-xs text-muted-foreground">{alt.reason}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {request.ai_analysis.red_flags && request.ai_analysis.red_flags.length > 0 && (
                          <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded mb-3">
                            <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                              🚨 Alertes critiques:
                            </p>
                            <ul className="text-xs text-red-700 dark:text-red-300 list-disc list-inside">
                              {request.ai_analysis.red_flags.map((flag, idx) => (
                                <li key={idx}>{flag}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="text-sm">
                          <strong>Recommandation IA:</strong>{' '}
                          <span className={
                            request.ai_analysis.ai_recommendation === 'AUTO_APPROVE' ? 'text-green-600' :
                            request.ai_analysis.ai_recommendation === 'PHYSICIAN_REVIEW' ? 'text-orange-600' :
                            'text-red-600'
                          }>
                            {request.ai_analysis.ai_recommendation}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleReview(request)}
                        className="flex-1"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Examiner & Décider
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de révision */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Révision de la demande de renouvellement</DialogTitle>
            <DialogDescription>
              {selectedRequest && getPatientName(selectedRequest.patient_id)}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              {/* Brouillon d'ordonnance */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Ordonnance proposée
                </h4>
                <Card>
                  <CardContent className="p-4">
                    {selectedRequest.medications.map((med, idx) => (
                      <div key={idx} className="mb-2 last:mb-0">
                        <p className="font-medium">{med.nom_produit}</p>
                        <p className="text-sm text-muted-foreground">{med.posologie_actuelle}</p>
                        <p className="text-xs text-muted-foreground">Durée: {med.duree_demandee}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Notes du médecin */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Notes / Modifications (optionnel)
                </label>
                <Textarea
                  value={physicianNotes}
                  onChange={(e) => setPhysicianNotes(e.target.value)}
                  placeholder="Ajoutez vos notes ou raisons de modification/refus..."
                  rows={4}
                />
              </div>

              {/* Disclaimer */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  <strong>⚠️ Rappel:</strong> Bien que l'IA fournisse une analyse détaillée, la décision finale et la responsabilité médicale vous appartiennent en tant que médecin prescripteur.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeny}>
              <XCircle className="w-4 h-4 mr-2" />
              Refuser
            </Button>
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Approuver & Lancer Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Automated Workflow Dialog */}
      <Dialog open={showWorkflowDialog} onOpenChange={setShowWorkflowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Workflow Automatisé</DialogTitle>
            <DialogDescription>
              Génération et envoi automatiques de l'ordonnance
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <AutomatedRenewalWorkflow
              renewalRequest={selectedRequest}
              onComplete={async (prescription) => {
                // Once the workflow completes and prescription is created, link it to the renewal request
                await approveMutation.mutateAsync({
                  id: selectedRequest.id,
                  data: {
                    final_prescription_id: prescription.id
                  }
                });
                queryClient.invalidateQueries({ queryKey: ['renewal-requests'] });
                toast.success('Workflow terminé et prescription créée.');
                setShowWorkflowDialog(false);
                setSelectedRequest(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Historique */}
      {processedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historique récent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {processedRequests.slice(0, 10).map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{getPatientName(request.patient_id)}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(request.requested_at), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <Badge className={request.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {request.status === 'APPROVED' ? 'Approuvé' : 'Refusé'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
