import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Calendar, 
  Paperclip, 
  Download, 
  Eye,
  FileText,
  Image as ImageIcon,
  UserCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function MessageViewer({ message, patients, onAssignToPatient }) {
  const [viewingAttachment, setViewingAttachment] = useState(null);

  const assignedPatient = message.assigned_to_patient_id 
    ? patients.find(p => p.id === message.assigned_to_patient_id)
    : null;

  const getAttachmentIcon = (contentType) => {
    if (contentType?.includes('image')) return <ImageIcon className="w-4 h-4" />;
    if (contentType?.includes('pdf')) return <FileText className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4">
      {/* En-tête du message */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl mb-2">{message.subject}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{message.sender_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(message.received_date), 'dd MMMM yyyy à HH:mm', { locale: fr })}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={message.priority === 'URGENT' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'}>
                {message.priority}
              </Badge>
              <Badge variant="outline">
                {message.message_type}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Patient assigné */}
          {assignedPatient ? (
            <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <UserCheck className="w-5 h-5 text-green-600" />
              <span className="text-green-900">
                Assigné à : <strong>{assignedPatient.prenom} {assignedPatient.nom}</strong>
              </span>
            </div>
          ) : (
            <div className="mb-4">
              <Button onClick={onAssignToPatient} className="bg-blue-600 hover:bg-blue-700">
                <UserCheck className="w-4 h-4 mr-2" />
                Assigner à un patient
              </Button>
            </div>
          )}

          {/* Contenu du message */}
          <div className="prose prose-sm max-w-none bg-slate-50 p-4 rounded-lg">
            <div dangerouslySetInnerHTML={{ __html: message.content || 'Contenu du message...' }} />
          </div>

          {/* Pièces jointes */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Pièces jointes ({message.attachments.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {message.attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getAttachmentIcon(attachment.content_type)}
                      <div>
                        <p className="font-medium text-slate-900">{attachment.filename}</p>
                        <p className="text-xs text-slate-500">{attachment.content_type}</p>
                        {attachment.is_dicom && (
                          <Badge className="bg-purple-100 text-purple-800 mt-1" size="sm">
                            DICOM
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewingAttachment(attachment)}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Télécharger la pièce jointe
                          window.open(attachment.file_url, '_blank');
                        }}
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prévisualisation d'attachement */}
      {viewingAttachment && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Prévisualisation - {viewingAttachment.filename}</CardTitle>
              <Button variant="outline" onClick={() => setViewingAttachment(null)}>
                Fermer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {viewingAttachment.content_type?.includes('pdf') ? (
              <iframe
                src={viewingAttachment.file_url}
                className="w-full h-96 border rounded"
                title={viewingAttachment.filename}
              />
            ) : viewingAttachment.content_type?.includes('image') ? (
              <img
                src={viewingAttachment.file_url}
                alt={viewingAttachment.filename}
                className="max-w-full h-auto rounded"
              />
            ) : (
              <div className="text-center p-8 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-2" />
                <p>Prévisualisation non disponible pour ce type de fichier</p>
                <Button className="mt-4" onClick={() => window.open(viewingAttachment.file_url, '_blank')}>
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}