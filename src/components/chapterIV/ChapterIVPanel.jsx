import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ChapterIVRequestForm from './ChapterIVRequestForm';
import ChapterIVRequestsList from './ChapterIVRequestsList';

export default function ChapterIVPanel({ patient }) {
  const [showForm, setShowForm] = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['chapter-iv-requests', patient?.id],
    queryFn: () => base44.entities.ChapterIVRequest.filter({ patient_id: patient.id }, '-created_date'),
    enabled: !!patient?.id
  });

  const getStatusBadge = (status) => {
    const config = {
      DRAFT: { label: 'Brouillon', color: 'bg-slate-100 text-slate-800' },
      PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
      SUBMITTED: { label: 'Soumis', color: 'bg-blue-100 text-blue-800' },
      APPROVED: { label: 'Approuvé', color: 'bg-green-100 text-green-800' },
      REJECTED: { label: 'Refusé', color: 'bg-red-100 text-red-800' },
      EXPIRED: { label: 'Expiré', color: 'bg-orange-100 text-orange-800' },
      CANCELLED: { label: 'Annulé', color: 'bg-gray-100 text-gray-800' }
    };
    const c = config[status] || config.DRAFT;
    return <Badge className={c.color}>{c.label}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Demandes Chapitre IV
        </h3>
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle demande
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">Aucune demande Chapitre IV</p>
            <Button onClick={() => setShowForm(true)} className="mt-4">
              Créer une demande
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ChapterIVRequestsList 
          requests={requests} 
          getStatusBadge={getStatusBadge}
        />
      )}

      {showForm && (
        <ChapterIVRequestForm
          patient={patient}
          isOpen={showForm}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}