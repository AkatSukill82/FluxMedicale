import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Camera, X, RotateCcw, Plus, FileText, Loader2, Check, Trash2, ScanLine } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onCapture(dataUrl);
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-lg overflow-hidden aspect-[4/3]">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain" />
        {/* Overlay guide */}
        <div className="absolute inset-4 border-2 border-white/40 border-dashed rounded-lg pointer-events-none" />
        <canvas ref={canvasRef} className="hidden" />
      </div>
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={onClose}>
          <X className="w-4 h-4 mr-2" /> Annuler
        </Button>
        <Button onClick={capture} className="bg-blue-600 hover:bg-blue-700" size="lg">
          <Camera className="w-5 h-5 mr-2" /> Capturer
        </Button>
      </div>
    </div>
  );
}

function PagePreview({ pages, onRemove }) {
  if (pages.length === 0) return null;
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {pages.map((page, idx) => (
        <div key={idx} className="relative group border rounded-lg overflow-hidden aspect-[3/4]">
          <img src={page} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
          <Badge className="absolute top-1 left-1 text-xs">{idx + 1}</Badge>
          <button
            onClick={() => onRemove(idx)}
            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function DocumentScanner({ isOpen, onClose, patient, onSaved }) {
  const [pages, setPages] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('autre');
  const [processing, setProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState('');
  const fileInputRef = useRef(null);

  const handleCapture = (dataUrl) => {
    setPages(prev => [...prev, dataUrl]);
    setShowCamera(false);
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPages(prev => [...prev, ev.target.result]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removePage = (idx) => {
    setPages(prev => prev.filter((_, i) => i !== idx));
  };

  const dataUrlToBlob = (dataUrl) => {
    const [header, base64] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)[1];
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    return new Blob([array], { type: mime });
  };

  const handleProcess = async () => {
    if (pages.length === 0) return toast.error('Aucune page capturée');
    if (!title.trim()) return toast.error('Veuillez saisir un titre');

    setProcessing(true);

    // 1. Upload des images
    setOcrProgress('Upload des images...');
    const uploadedUrls = [];
    for (let i = 0; i < pages.length; i++) {
      setOcrProgress(`Upload page ${i + 1}/${pages.length}...`);
      const blob = dataUrlToBlob(pages[i]);
      const file = new File([blob], `scan_page_${i + 1}.jpg`, { type: 'image/jpeg' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploadedUrls.push(file_url);
    }

    // 2. Génération du PDF via jsPDF
    setOcrProgress('Génération du PDF...');
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) doc.addPage();
      const img = new Image();
      img.src = pages[i];
      await new Promise(resolve => { img.onload = resolve; });
      const pageW = 210;
      const pageH = 297;
      const ratio = Math.min(pageW / img.width, pageH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2;
      doc.addImage(pages[i], 'JPEG', x, y, w, h);
    }

    const pdfBlob = doc.output('blob');
    const pdfFile = new File([pdfBlob], `${title.trim().replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });
    const { file_url: pdfUrl } = await base44.integrations.Core.UploadFile({ file: pdfFile });

    // 3. OCR via LLM vision
    setOcrProgress('Reconnaissance de texte (OCR)...');
    let ocrText = '';
    let extractedData = {};
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Tu es un assistant OCR médical. Analyse cette/ces image(s) de document(s) médical/médicaux scanné(s).
Extrais tout le texte visible sur le document, et identifie les informations clés.
Sois exhaustif dans l'extraction du texte.

Réponds en JSON avec:
- full_text: tout le texte extrait du document
- document_type: type détecté (ordonnance, résultat labo, courrier médical, certificat, facture, autre)
- key_info: objet avec les informations clés détectées (médecin, date, diagnostic, médicaments, résultats, etc.)
- summary: résumé en 2-3 phrases du contenu`,
        file_urls: uploadedUrls,
        response_json_schema: {
          type: 'object',
          properties: {
            full_text: { type: 'string' },
            document_type: { type: 'string' },
            key_info: { type: 'object', additionalProperties: true },
            summary: { type: 'string' }
          }
        }
      });
      ocrText = result.full_text || '';
      extractedData = result;
    } catch (e) {
      console.warn('OCR failed, continuing without:', e);
    }

    // 4. Sauvegarde dans PatientDocument
    setOcrProgress('Enregistrement dans le dossier...');
    const patientName = patient?.name?.find(n => n.use === 'official');
    const fullName = `${(patientName?.given || []).join(' ')} ${patientName?.family || ''}`.trim();

    await base44.entities.PatientDocument.create({
      patient_id: patient.id,
      file_url: pdfUrl,
      file_name: `${title.trim()}.pdf`,
      file_type: 'application/pdf',
      document_type: documentType,
      title: title.trim(),
      description: extractedData.summary || `Document scanné - ${pages.length} page(s)`,
      document_date: new Date().toISOString().split('T')[0],
      source: 'scan',
      tags: [
        'scanné',
        extractedData.document_type || documentType,
        ...(ocrText ? ['ocr'] : [])
      ].filter(Boolean)
    });

    setProcessing(false);
    setOcrProgress('');
    toast.success(`Document scanné et indexé avec succès (${pages.length} page(s))`);
    setPages([]);
    setTitle('');
    setDocumentType('autre');
    onSaved?.();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && !processing && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-blue-600" />
            Scanner un document
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Camera ou aperçu */}
          {showCamera ? (
            <CameraCapture
              onCapture={handleCapture}
              onClose={() => setShowCamera(false)}
            />
          ) : (
            <>
              {/* Pages scannées */}
              <PagePreview pages={pages} onRemove={removePage} />

              {/* Actions d'ajout de pages */}
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => setShowCamera(true)}>
                  <Camera className="w-4 h-4 mr-2" /> Prendre une photo
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Plus className="w-4 h-4 mr-2" /> Importer image
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  capture="environment"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                {pages.length > 0 && (
                  <Badge variant="secondary" className="self-center">
                    {pages.length} page{pages.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              {/* Métadonnées */}
              {pages.length > 0 && (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <Label>Titre du document *</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Résultat prise de sang du 12/03"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Type de document</Label>
                    <Select value={documentType} onValueChange={setDocumentType}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="resultat_labo">Résultat labo</SelectItem>
                        <SelectItem value="radiographie">Radiographie</SelectItem>
                        <SelectItem value="scanner">Scanner</SelectItem>
                        <SelectItem value="irm">IRM</SelectItem>
                        <SelectItem value="echographie">Échographie</SelectItem>
                        <SelectItem value="ecg">ECG</SelectItem>
                        <SelectItem value="compte_rendu">Compte rendu</SelectItem>
                        <SelectItem value="ordonnance">Ordonnance</SelectItem>
                        <SelectItem value="courrier">Courrier</SelectItem>
                        <SelectItem value="certificat">Certificat</SelectItem>
                        <SelectItem value="facture">Facture</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Processing state */}
              {processing && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <div>
                    <p className="font-medium text-blue-900">Traitement en cours...</p>
                    <p className="text-sm text-blue-700">{ocrProgress}</p>
                  </div>
                </div>
              )}

              {/* Submit */}
              {pages.length > 0 && !processing && (
                <Button
                  onClick={handleProcess}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Scanner et indexer ({pages.length} page{pages.length > 1 ? 's' : ''})
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}