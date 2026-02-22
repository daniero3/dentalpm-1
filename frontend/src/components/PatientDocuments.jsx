import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { 
  FileText, Upload, Download, Eye, Trash2, RotateCcw, 
  Image, File, ArrowLeft, User, Loader2, X, CheckCircle
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CATEGORIES = {
  RADIO: { label: 'Radio', color: 'bg-purple-100 text-purple-800', icon: Image },
  PHOTO: { label: 'Photo', color: 'bg-blue-100 text-blue-800', icon: Image },
  ANALYSE: { label: 'Analyse', color: 'bg-green-100 text-green-800', icon: FileText },
  FAISABILITE: { label: 'Faisabilité', color: 'bg-amber-100 text-amber-800', icon: FileText },
  ORDONNANCE: { label: 'Ordonnance', color: 'bg-red-100 text-red-800', icon: FileText },
  AUTRE: { label: 'Autre', color: 'bg-gray-100 text-gray-800', icon: File }
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

const PatientDocuments = () => {
  const { patientId } = useParams();
  const [patient, setPatient] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const fileInputRef = useRef(null);
  
  const [uploadForm, setUploadForm] = useState({
    category: 'AUTRE',
    description: '',
    file: null
  });

  useEffect(() => {
    fetchPatient();
    fetchDocuments();
  }, [patientId]);

  const fetchPatient = async () => {
    try {
      const res = await axios.get(`${API}/patients/${patientId}`);
      setPatient(res.data);
    } catch (err) {
      toast.error('Patient non trouvé');
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`${API}/documents/patient/${patientId}`);
      setDocuments(res.data.documents || []);
    } catch (err) {
      toast.error('Erreur chargement documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Type non autorisé. Formats: JPG, PNG, PDF');
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Fichier trop volumineux. Max: 5MB');
      return;
    }

    setUploadForm({ ...uploadForm, file });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) {
      toast.error('Sélectionnez un fichier');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadForm.file);
    formData.append('patient_id', patientId);
    formData.append('category', uploadForm.category);
    formData.append('description', uploadForm.description);

    try {
      await axios.post(`${API}/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Document uploadé');
      setIsUploadOpen(false);
      setUploadForm({ category: 'AUTRE', description: '', file: null });
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchDocuments();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Supprimer "${doc.original_filename}" ?`)) return;
    try {
      await axios.delete(`${API}/documents/${doc.id}`);
      toast.success('Document supprimé');
      fetchDocuments();
    } catch (err) {
      toast.error('Erreur suppression');
    }
  };

  const handleRestore = async (doc) => {
    try {
      await axios.patch(`${API}/documents/${doc.id}/restore`);
      toast.success('Document restauré');
      fetchDocuments();
    } catch (err) {
      toast.error('Erreur restauration');
    }
  };

  const handleDownload = async (doc) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/documents/${doc.id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.original_filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Erreur téléchargement');
    }
  };

  const handleView = (doc) => {
    const token = localStorage.getItem('token');
    const viewUrl = `${API}/documents/${doc.id}/view`;
    
    if (doc.mime_type === 'application/pdf') {
      // Open PDF in new tab
      window.open(viewUrl, '_blank');
    } else if (doc.mime_type.startsWith('image/')) {
      // Show image preview inline
      setPreviewDoc({ ...doc, url: viewUrl, token });
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="patient-documents">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/patients">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              Documents
            </h1>
            {patient && (
              <p className="text-gray-500 flex items-center gap-1">
                <User className="h-4 w-4" />
                {patient.first_name} {patient.last_name}
              </p>
            )}
          </div>
        </div>

        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button data-testid="upload-btn">
              <Upload className="h-4 w-4 mr-2" />
              Ajouter un document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un document</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label>Catégorie *</Label>
                <Select 
                  value={uploadForm.category} 
                  onValueChange={(v) => setUploadForm({...uploadForm, category: v})}
                >
                  <SelectTrigger data-testid="category-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                  placeholder="Description optionnelle..."
                  data-testid="description-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Fichier * (JPG, PNG, PDF - max 5MB)</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileSelect}
                  data-testid="file-input"
                />
                {uploadForm.file && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    {uploadForm.file.name} ({formatSize(uploadForm.file.size)})
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={uploading || !uploadForm.file} data-testid="submit-upload">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  Envoyer
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Aucun document</p>
              <p className="text-sm">Cliquez sur "Ajouter un document" pour commencer</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => {
                const cat = CATEGORIES[doc.category] || CATEGORIES.AUTRE;
                const CatIcon = cat.icon;
                return (
                  <div 
                    key={doc.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    data-testid={`doc-${doc.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded ${cat.color}`}>
                        <CatIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{doc.original_filename}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <Badge className={cat.color}>{cat.label}</Badge>
                          <span>{formatSize(doc.file_size)}</span>
                          <span>{formatDate(doc.created_at)}</span>
                          {doc.description && <span className="italic">"{doc.description}"</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleView(doc)}
                        data-testid={`view-${doc.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDownload(doc)}
                        data-testid={`download-${doc.id}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(doc)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`delete-${doc.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Preview Modal */}
      {previewDoc && (
        <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{previewDoc.original_filename}</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              <img 
                src={previewDoc.url}
                alt={previewDoc.original_filename}
                className="max-h-[70vh] object-contain rounded"
                onError={() => toast.error('Erreur chargement image')}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PatientDocuments;
