import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  FlaskConical, 
  Calendar, 
  Building2, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Stethoscope,
  Tag
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_CONFIG = {
  NORMAL: { label: 'Normal', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  BAS: { label: 'Bas', color: 'bg-orange-100 text-orange-800', icon: ArrowDown },
  HAUT: { label: 'Élevé', color: 'bg-orange-100 text-orange-800', icon: ArrowUp },
  CRITIQUE_BAS: { label: 'Critique bas', color: 'bg-red-100 text-red-800', icon: ArrowDown },
  CRITIQUE_HAUT: { label: 'Critique élevé', color: 'bg-red-100 text-red-800', icon: ArrowUp }
};

const TYPE_LABELS = {
  HEMATOLOGIE: 'Hématologie',
  BIOCHIMIE: 'Biochimie',
  HORMONOLOGIE: 'Hormonologie',
  SEROLOGIE: 'Sérologie',
  URINAIRE: 'Urinaire',
  MICROBIOLOGIE: 'Microbiologie',
  AUTRE: 'Autre'
};

export default function LabResultDetail({ result, consultations, isOpen, onClose }) {
  const linkedConsultation = consultations?.find(c => c.id === result.consultation_id);
  
  // Grouper les paramètres par statut
  const normalParams = result.resultats?.filter(r => r.statut === 'NORMAL') || [];
  const abnormalParams = result.resultats?.filter(r => r.statut && r.statut !== 'NORMAL') || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-blue-600" />
            Résultat de laboratoire
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informations générales */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Date prélèvement
                  </p>
                  <p className="font-medium">
                    {format(new Date(result.date_prelevement), 'd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
                {result.date_resultat && (
                  <div>
                    <p className="text-xs text-slate-500">Date réception</p>
                    <p className="font-medium">
                      {format(new Date(result.date_resultat), 'd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                )}
                {result.laboratoire && (
                  <div>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> Laboratoire
                    </p>
                    <p className="font-medium">{result.laboratoire}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500">Type d'analyse</p>
                  <Badge variant="outline">{TYPE_LABELS[result.type_analyse]}</Badge>
                </div>
              </div>

              {result.urgence && (
                <div className="mt-3 p-2 bg-red-50 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-800 font-medium">Résultat urgent</span>
                </div>
              )}

              {linkedConsultation && (
                <div className="mt-3 p-2 bg-blue-50 rounded-lg flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    Lié à la consultation du {format(new Date(linkedConsultation.date_consultation), 'd/MM/yyyy')}
                    {linkedConsultation.motif && ` - ${linkedConsultation.motif}`}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Paramètres anormaux en premier */}
          {abnormalParams.length > 0 && (
            <Card className="border-orange-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-orange-700">
                  <AlertTriangle className="w-4 h-4" />
                  Valeurs anormales ({abnormalParams.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-2">
                  {abnormalParams.map((param, idx) => {
                    const statusInfo = STATUS_CONFIG[param.statut] || STATUS_CONFIG.NORMAL;
                    const Icon = statusInfo.icon;
                    return (
                      <div key={idx} className={`p-3 rounded-lg ${statusInfo.color}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{param.parametre}</p>
                            {param.code_loinc && (
                              <p className="text-xs opacity-70">LOINC: {param.code_loinc}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold">{param.valeur}</span>
                              <span className="text-sm">{param.unite}</span>
                              <Icon className="w-4 h-4" />
                            </div>
                            <p className="text-xs opacity-70">
                              Normes: {param.valeur_min} - {param.valeur_max} {param.unite}
                            </p>
                          </div>
                        </div>
                        {param.commentaire && (
                          <p className="text-sm mt-2 pt-2 border-t border-current/20">
                            {param.commentaire}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Paramètres normaux */}
          {normalParams.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  Valeurs normales ({normalParams.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {normalParams.map((param, idx) => (
                    <div key={idx} className="p-2 bg-green-50 rounded flex items-center justify-between">
                      <span className="text-sm">{param.parametre}</span>
                      <span className="font-medium">
                        {param.valeur} {param.unite}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Conditions liées */}
          {result.conditions_liees?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Conditions liées
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex flex-wrap gap-2">
                  {result.conditions_liees.map((condition, idx) => (
                    <Badge key={idx} variant="secondary">{condition}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Interprétation */}
          {result.interpretation && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Interprétation médicale</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm whitespace-pre-wrap">{result.interpretation}</p>
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          {result.documents?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documents ({result.documents.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-2">
                  {result.documents.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">{doc.nom}</span>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Ouvrir
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}