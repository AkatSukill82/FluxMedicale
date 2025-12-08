import React, { useState, useEffect } from 'react';
import { Document } from '@/entities/Document';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Plus, 
  Search,
  Edit,
  Eye,
  Download
} from 'lucide-react';

import DocumentEditor from './DocumentEditor';
import DocumentViewer from './DocumentViewer';

export default function DocumentsPanel({ patient, currentUser }) {
  const [documents, setDocuments] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [showEditor, setShowEditor] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showViewer, setShowViewer] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [patient.id]);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchTerm, filterType]);

  const loadDocuments = async () => {
    try {
      const docs = await Document.filter({ patient_id: patient.id }, '-created_date');
      setDocuments(docs);
    } catch (error) {
      console.error('Erreur chargement documents:', error);
    }
  };

  const filterDocuments = () => {
    let filtered = documents;

    if (filterType !== 'ALL') {
      filtered = filtered.filter(d => d.type === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(d => 
        d.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.subtype?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredDocs(filtered);
  };

  const getStatusBadge = (status) => {
    const styles = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SIGNED: 'bg-blue-100 text-blue-800',
      SENT: 'bg-green-100 text-green-800',
      ACKNOWLEDGED: 'bg-purple-100 text-purple-800',
      ARCHIVED: 'bg-slate-100 text-slate-800'
    };

    const labels = {
      DRAFT: 'Brouillon',
      SIGNED: 'Signé',
      SENT: 'Envoyé',
      ACKNOWLEDGED: 'Accusé reçu',
      ARCHIVED: 'Archivé'
    };

    return (
      <Badge className={styles[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const getTypeIcon = (type) => {
    return <FileText className="w-4 h-4 text-slate-600" />;
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Documents</h3>
        <Button onClick={() => { setSelectedDoc(null); setShowEditor(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau document
        </Button>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher un document..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant={filterType === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('ALL')}
              >
                Tous
              </Button>
              <Button 
                variant={filterType === 'ATTESTATION' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('ATTESTATION')}
              >
                Attestations
              </Button>
              <Button 
                variant={filterType === 'LETTER' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('LETTER')}
              >
                Lettres
              </Button>
              <Button 
                variant={filterType === 'LAB_ORDER' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('LAB_ORDER')}
              >
                Labos
              </Button>
              <Button 
                variant={filterType === 'IMAGING_ORDER' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('IMAGING_ORDER')}
              >
                Imagerie
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des documents */}
      <div className="space-y-3">
        {filteredDocs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-600">Aucun document trouvé</p>
              <Button className="mt-4" onClick={() => setShowEditor(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Créer le premier document
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredDocs.map(doc => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getTypeIcon(doc.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900">{doc.title}</h4>
                        {getStatusBadge(doc.status)}
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{doc.subtype}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Créé le {new Date(doc.created_date).toLocaleDateString('fr-BE')}</span>
                        {doc.sent_at && (
                          <span>Envoyé via {doc.sent_via}</span>
                        )}
                        {doc.tags && doc.tags.length > 0 && (
                          <div className="flex gap-1">
                            {doc.tags.map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setSelectedDoc(doc); setShowViewer(true); }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {doc.status === 'DRAFT' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSelectedDoc(doc); setShowEditor(true); }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {doc.file_ref_pdf && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(doc.file_ref_pdf, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Éditeur de document */}
      {showEditor && (
        <DocumentEditor
          patient={patient}
          currentUser={currentUser}
          document={selectedDoc}
          onClose={() => { setShowEditor(false); setSelectedDoc(null); loadDocuments(); }}
        />
      )}

      {/* Visualiseur de document */}
      {showViewer && selectedDoc && (
        <DocumentViewer
          document={selectedDoc}
          patient={patient}
          currentUser={currentUser}
          onClose={() => { setShowViewer(false); setSelectedDoc(null); loadDocuments(); }}
        />
      )}
    </div>
  );
}