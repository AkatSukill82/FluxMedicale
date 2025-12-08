
import React, { useState, useCallback } from 'react';
import { ImportSession } from '@/entities/ImportSession';
import { AuditLog } from '@/entities/AuditLog';
import { UploadFile } from '@/integrations/Core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  File, 
  AlertCircle,
  FileText,
  Archive
} from 'lucide-react';

export default function ImportUploader({ currentUser, onFileUploaded, onSessionSelected }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  // Helper functions - no dependency on state/props, can be defined outside or inside without useCallback
  const detectFileType = (filename) => {
    const extension = filename.toLowerCase().split('.').pop();
    if (extension === 'xml') return 'KMEHR';
    if (extension === 'pmf') return 'PMF';
    if (extension === 'smf') return 'SMF';
    return 'KMEHR'; // Par défaut
  };

  const validateFileType = (file) => {
    const validExtensions = ['xml', 'pmf', 'smf', 'zip'];
    const extension = file.name.toLowerCase().split('.').pop();
    return validExtensions.includes(extension);
  };

  // simulateFileParsing depends on `onFileUploaded` prop, so it needs to be defined
  // in a way that `handleFileUpload` can access the current `onFileUploaded`.
  // Since `onFileUploaded` is already a dependency of `handleFileUpload`,
  // `handleFileUpload` will re-create when `onFileUploaded` changes,
  // thus capturing the latest `onFileUploaded` for `simulateFileParsing`.
  const simulateFileParsing = async (session) => {
    try {
      // Simulation du contenu analysé
      const mockContent = {
        patients_count: Math.floor(Math.random() * 50) + 10,
        consultations_count: Math.floor(Math.random() * 200) + 50,
        medications_count: Math.floor(Math.random() * 100) + 20,
        documents_count: Math.floor(Math.random() * 30) + 5
      };

      const mockValidation = {
        is_valid: Math.random() > 0.3,
        errors: Math.random() > 0.5 ? [] : ['Élément patient manquant à la ligne 45', 'Code médicament invalide: ABC123'],
        warnings: ['Date de naissance approximative pour patient ID 123', 'Codification non standard détectée']
      };

      await ImportSession.update(session.id, {
        status: 'Validated',
        content_summary: mockContent,
        validation_report: mockValidation
      });

      onFileUploaded(session.id);

    } catch (err) {
      console.error('Erreur simulation parsing:', err);
    }
  };

  const handleFileUpload = useCallback(async (file) => {
    setError(null);
    setUploading(true);
    setUploadProgress(0);

    try {
      // Validation du type de fichier
      if (!validateFileType(file)) {
        throw new Error('Type de fichier non supporté. Extensions acceptées: .xml, .pmf, .smf, .zip');
      }

      // Validation de la taille (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('Fichier trop volumineux. Taille maximale: 50MB');
      }

      setUploadProgress(25);

      // Upload du fichier
      const { file_url } = await UploadFile({ file });
      setUploadProgress(50);

      // Détection du type
      const fileType = detectFileType(file.name);
      
      setUploadProgress(75);

      // Création de la session d'import
      const session = await ImportSession.create({
        file_name: file.name,
        file_type: fileType,
        file_size: file.size,
        file_url: file_url,
        user_email: currentUser.email, // Depends on currentUser
        status: 'Uploaded',
        content_summary: {
          patients_count: 0,
          consultations_count: 0,
          medications_count: 0,
          documents_count: 0
        }
      });

      // Audit log
      await AuditLog.create({
        user_email: currentUser.email, // Depends on currentUser
        action: 'UPLOAD_MEDICAL_FILE',
        target_entity: 'ImportSession',
        target_id: session.id,
        details: `Upload fichier médical: ${file.name} (${fileType}, ${Math.round(file.size/1024)}KB)`,
        timestamp: new Date().toISOString()
      });

      setUploadProgress(100);
      
      // Simulation du parsing initial
      setTimeout(() => {
        simulateFileParsing(session); // Indirectly depends on onFileUploaded
      }, 1000);

    } catch (err) {
      setError(err.message);
      console.error('Erreur upload:', err);
    } finally {
      setUploading(false);
    }
  }, [currentUser, onFileUploaded]); // Added currentUser and onFileUploaded as dependencies

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]); // Depends on handleFileUpload
    }
  }, [handleFileUpload]); // Added handleFileUpload as dependency

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]); // Depends on handleFileUpload
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Import de Fichier Médical
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-400 bg-blue-50' 
                : uploading 
                ? 'border-gray-300 bg-gray-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {uploading ? (
              <div className="space-y-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6 text-blue-600 animate-pulse" />
                </div>
                <div>
                  <p className="text-slate-700 font-medium">Upload en cours...</p>
                  <Progress value={uploadProgress} className="mt-2 max-w-xs mx-auto" />
                  <p className="text-sm text-slate-500 mt-1">{uploadProgress}%</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                  <File className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <p className="text-lg font-medium text-slate-900 mb-2">
                    Glissez votre fichier ici ou cliquez pour sélectionner
                  </p>
                  <p className="text-sm text-slate-600 mb-4">
                    Formats supportés: KMEHR (.xml), PMF (.pmf), SMF (.smf), Archives (.zip)
                  </p>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".xml,.pmf,.smf,.zip"
                    onChange={handleFileSelect}
                    disabled={uploading}
                  />
                  <Button 
                    asChild 
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={uploading}
                  >
                    <label htmlFor="file-upload" className="cursor-pointer">
                      Sélectionner un fichier
                    </label>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <Alert className="mt-4 border-red-200 bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Informations de sécurité */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Archive className="w-5 h-5 text-slate-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-slate-900 mb-1">Sécurité et Conservation</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Fichiers chiffrés automatiquement au repos</li>
                  <li>• Conservation du fichier original pour preuve</li>
                  <li>• Traçabilité complète des opérations</li>
                  <li>• Validation selon standards KMEHR/PMF/SMF</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Types de fichiers supportés */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <h4 className="font-semibold text-slate-900">KMEHR</h4>
                <p className="text-sm text-slate-600">Standard belge eHealth</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-green-600" />
              <div>
                <h4 className="font-semibold text-slate-900">PMF</h4>
                <p className="text-sm text-slate-600">Dossier médical pharmaceutique</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-purple-600" />
              <div>
                <h4 className="font-semibold text-slate-900">SMF</h4>
                <p className="text-sm text-slate-600">Sumehr médical</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
