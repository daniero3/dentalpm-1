import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { FileText, Upload, Download, Eye, Trash2, Image, File, ArrowLeft, User, Loader2, CheckCircle, X } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CATEGORIES = {
  RADIO:       { label: 'Radio',       icon: Image },
  PHOTO:       { label: 'Photo',       icon: Image },
  ANALYSE:     { label: 'Analyse',     icon: FileText },
  FAISABILITE: { label: 'Faisabilité', icon: FileText },
  ORDONNANCE:  { label: 'Ordonnance',  icon: FileText },
  AUTRE:       { label: 'Autre',       icon: File }
};

const MAX_FILE_SIZE  = 5 * 1024 * 1024;
const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'application/pdf'];
const selectClass    = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

// ── Modal CSS pur ──
const Modal = ({ open, onClose, title, children, maxWidth = 480 }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth, boxShadow: '0 16px 48px rgba(15,23,42,0.18)', border: '1px solid #E2E8F0', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}><X size={18} /></button>
        {title && <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 17, fontWeight: 700, color: '#0F172A', margin: '0 0 20px', paddingRight: 24 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
};

const PatientDocuments = () => {
  const { patientId } = useParams();
  const [patient, setPatient]         = useState(null);
  const [documents, setDocuments]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [uploading, setUploading]     = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc]   = useState(null);
  const fileInputRef = useRef(null);
  const mountedRef   = useRef(true);

  const [uploadForm, setUploadForm] = useState({ category: 'AUTRE', description: '', file: null });

  useEffect(() => {
    mountedRef.current = true;
    if (!patientId || patientId === 'undefined') { setLoading(false); return; }
    fetchPatient();
    fetchDocuments();
    return () => { mountedRef.current = false; };
  }, [patientId]);

  const fetchPatient = async () => {
    if (!patientId || patientId === 'undefined') return;
    try {
      const res = await axios.get(`${API}/patients/${patientId}`);
      if (mountedRef.current) setPatient(res.data);
    } catch (err) {
      if (axios.isCancel(err)) return;
      if (mountedRef.current) console.error('Patient error:', err);
    }
  };

  const fetchDocuments = async () => {
    if (!patientId || patientId === 'undefined') return;
    try {
      const res = await axios.get(`${API}/documents/patient/${patientId}`);
      if (mountedRef.current) setDocuments(res.data.documents || []);
    } catch (err) {
      if (axios.isCancel(err)) return;
      if (mountedRef.current) toast.error('Erreur chargement documents');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) { toast.error('Formats autorisés: JPG, PNG, PDF'); return; }
    if (file.size > MAX_FILE_SIZE) { toast.error('Fichier trop volumineux. Max: 5MB'); return; }
    setUploadForm(f => ({ ...f, file }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) { toast.error('Sélectionnez un fichier'); return; }
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
    } catch (err) { toast.error('Erreur suppression'); }
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
      a.href = url; a.download = doc.original_filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) { toast.error('Erreur téléchargement'); }
  };

  const handleView = (doc) => {
    const viewUrl = `${API}/documents/${doc.id}/view`;
    if (doc.mime_type === 'application/pdf') {
      window.open(viewUrl, '_blank');
    } else if (doc.mime_type?.startsWith('image/')) {
      setPreviewDoc({ ...doc, url: viewUrl });
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '?';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#0D7A87' }} />
    </div>
  );

  return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/patients">
            <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#0D7A87'; e.currentTarget.style.color = '#0D7A87'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#475569'; }}>
              <ArrowLeft size={15} /> Retour
            </button>
          </Link>
          <div>
            <h1 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={20} color="#0D7A87" /> Documents
            </h1>
            {patient && (
              <p style={{ color: '#64748B', fontSize: 13, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                <User size={13} /> {patient.first_name} {patient.last_name}
              </p>
            )}
          </div>
        </div>
        <button onClick={() => setIsUploadOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, background: 'linear-gradient(135deg, #0D7A87, #13A3B4)', color: '#fff', border: 'none', fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 12px rgba(13,122,135,0.3)', transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(13,122,135,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(13,122,135,0.3)'; }}>
          <Upload size={15} /> Ajouter un document
        </button>
      </div>

      {/* Liste */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(15,23,42,0.05)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9', fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 15, color: '#0F172A' }}>
          {documents.length} document{documents.length !== 1 ? 's' : ''}
        </div>
        <div style={{ padding: 16 }}>
          {documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8' }}>
              <FileText size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontWeight: 600, marginBottom: 4 }}>Aucun document</p>
              <p style={{ fontSize: 13 }}>Cliquez sur "Ajouter un document" pour commencer</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {documents.map((doc, i) => {
                const cat = CATEGORIES[doc.category] || CATEGORIES.AUTRE;
                const CatIcon = cat.icon;
                return (
                  <div key={doc.id} className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #F1F5F9', transition: 'all 0.18s ease', animationDelay: `${i * 0.04}s` }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F0F7F8'; e.currentTarget.style.borderColor = '#E0F2F4'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#F1F5F9'; }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ padding: 8, borderRadius: 8, background: 'rgba(13,122,135,0.08)', color: '#0D7A87' }}>
                        <CatIcon size={18} />
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 14, color: '#0F172A', margin: 0 }}>{doc.original_filename}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(13,122,135,0.1)', color: '#0D7A87' }}>{cat.label}</span>
                          <span style={{ fontSize: 12, color: '#94A3B8' }}>{formatSize(doc.file_size)}</span>
                          <span style={{ fontSize: 12, color: '#94A3B8' }}>{formatDate(doc.created_at)}</span>
                          {doc.description && <span style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>"{doc.description}"</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[
                        { icon: Eye,      onClick: () => handleView(doc),     color: '#0D7A87' },
                        { icon: Download, onClick: () => handleDownload(doc), color: '#3B4FD8' },
                        { icon: Trash2,   onClick: () => handleDelete(doc),   color: '#E63946' },
                      ].map(({ icon: Icon, onClick, color }, idx) => (
                        <button key={idx} onClick={onClick} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color, transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = `${color}15`}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <Icon size={15} />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Upload ── */}
      <Modal open={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Ajouter un document">
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Catégorie *</label>
            <select className={selectClass} value={uploadForm.category} onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))}>
              {Object.entries(CATEGORIES).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Description</label>
            <Input value={uploadForm.description} onChange={e => setUploadForm(f => ({ ...f, description: e.target.value }))} placeholder="Description optionnelle..." />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Fichier * (JPG, PNG, PDF — max 5MB)</label>
            <Input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileSelect} />
            {uploadForm.file && (
              <p style={{ fontSize: 12, color: '#0EA570', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle size={13} /> {uploadForm.file.name} ({formatSize(uploadForm.file.size)})
              </p>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid #F1F5F9' }}>
            <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={uploading || !uploadForm.file}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload size={14} style={{ marginRight: 8 }} />}
              Envoyer
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Preview image ── */}
      <Modal open={!!previewDoc} onClose={() => setPreviewDoc(null)} title={previewDoc?.original_filename} maxWidth={800}>
        {previewDoc && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img src={previewDoc.url} alt={previewDoc.original_filename} style={{ maxHeight: '70vh', objectFit: 'contain', borderRadius: 8, maxWidth: '100%' }} onError={() => toast.error('Erreur chargement image')} />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PatientDocuments;
