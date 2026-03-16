import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { X } from 'lucide-react';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { 
  FileText, Plus, Download, ArrowLeft, User, Loader2, 
  Send, XCircle, Trash2, Edit2, CheckCircle
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

const STATUS_COLORS = {
  DRAFT:     'bg-yellow-100 text-yellow-800',
  ISSUED:    'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800'
};
const STATUS_LABELS = {
  DRAFT: 'Brouillon', ISSUED: 'Émise', CANCELLED: 'Annulée'
};


// ── Modal CSS pur ──
const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, boxShadow: '0 16px 48px rgba(15,23,42,0.18)', border: '1px solid #E2E8F0', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}>
          <X size={18} />
        </button>
        {title && <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 17, fontWeight: 700, color: '#0F172A', margin: '0 0 20px', paddingRight: 24 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
};

// ✅ Composant défini HORS du composant principal — évite le re-mount à chaque frappe
const PrescriptionForm = ({ formData, setFormData, saving, onSubmit, submitLabel, onCancel, addItem, removeItem, updateItem }) => (
  <div className="space-y-4 max-h-[60vh] overflow-y-auto">
    <div className="space-y-3">
      <Label className="font-semibold">Médicaments</Label>
      {formData.items.map((item, index) => (
        <div key={index} className="p-3 border rounded-lg space-y-2 bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Médicament {index + 1}</span>
            {formData.items.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
          <Input
            placeholder="Nom du médicament *"
            value={item.medication}
            onChange={(e) => updateItem(index, 'medication', e.target.value)}
          />
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Dosage"    value={item.dosage}    onChange={(e) => updateItem(index, 'dosage',    e.target.value)} />
            <Input placeholder="Posologie" value={item.posology}  onChange={(e) => updateItem(index, 'posology',  e.target.value)} />
            <Input placeholder="Durée"     value={item.duration}  onChange={(e) => updateItem(index, 'duration',  e.target.value)} />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="h-4 w-4 mr-2" />Ajouter un médicament
      </Button>
    </div>
    <div className="space-y-2">
      <Label>Notes</Label>
      <Textarea
        placeholder="Instructions particulières..."
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        rows={3}
      />
    </div>
    <div className="flex justify-end gap-2 pt-4 border-t">
      <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
      <Button onClick={onSubmit} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
        {submitLabel}
      </Button>
    </div>
  </div>
);

const PatientPrescriptions = () => {
  const { patientId } = useParams();
  const [patient, setPatient]             = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [isCreateOpen, setIsCreateOpen]   = useState(false);
  const [isEditOpen, setIsEditOpen]       = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [saving, setSaving]               = useState(false);

  const [formData, setFormData] = useState({
    items: [{ medication: '', dosage: '', posology: '', duration: '' }],
    notes: ''
  });

  useEffect(() => {
    // ✅ Bloquer si patientId invalide
    if (!patientId || patientId === 'undefined') {
      setLoading(false);
      return;
    }
    fetchPatient();
    fetchPrescriptions();
  }, [patientId]);

  const fetchPatient = async () => {
    if (!patientId || patientId === 'undefined') return;
    try {
      const res = await axios.get(`${API}/patients/${patientId}`, authHeaders());
      setPatient(res.data);
    } catch (err) {
      console.error('Patient error:', err);
    }
  };

  const fetchPrescriptions = async () => {
    if (!patientId || patientId === 'undefined') return;
    try {
      const res = await axios.get(`${API}/patients/${patientId}/prescriptions`, authHeaders());
      setPrescriptions(res.data.prescriptions || []);
    } catch (err) {
      toast.error('Erreur chargement ordonnances');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      items: [{ medication: '', dosage: '', posology: '', duration: '' }],
      notes: ''
    });
  };

  const addItem = () => {
    setFormData({ ...formData, items: [...formData.items, { medication: '', dosage: '', posology: '', duration: '' }] });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems.length ? newItems : [{ medication: '', dosage: '', posology: '', duration: '' }] });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleCreate = async () => {
    if (!formData.items.some(item => item.medication.trim())) {
      toast.error('Ajoutez au moins un médicament');
      return;
    }
    setSaving(true);
    try {
      await axios.post(`${API}/patients/${patientId}/prescriptions`, {
        content: {
          items: formData.items.filter(item => item.medication.trim()),
          notes: formData.notes
        }
      }, authHeaders());
      toast.success('Ordonnance créée');
      setIsCreateOpen(false);
      resetForm();
      fetchPrescriptions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur création');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/prescriptions/${selectedPrescription.id}`, {
        content: {
          items: formData.items.filter(item => item.medication.trim()),
          notes: formData.notes
        }
      }, authHeaders());
      toast.success('Ordonnance mise à jour');
      setIsEditOpen(false);
      setSelectedPrescription(null);
      resetForm();
      fetchPrescriptions();
    } catch (err) {
      if (err.response?.data?.error === 'PRESCRIPTION_LOCKED') {
        toast.error('Ordonnance verrouillée');
      } else {
        toast.error(err.response?.data?.error || 'Erreur modification');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleIssue = async (prescription) => {
    if (!window.confirm(`Émettre l'ordonnance ${prescription.number} ? Cette action est irréversible.`)) return;
    try {
      await axios.post(`${API}/prescriptions/${prescription.id}/issue`, {}, authHeaders());
      toast.success('Ordonnance émise');
      fetchPrescriptions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur émission');
    }
  };

  const handleCancel = async (prescription) => {
    if (!window.confirm(`Annuler l'ordonnance ${prescription.number} ?`)) return;
    try {
      await axios.post(`${API}/prescriptions/${prescription.id}/cancel`, {}, authHeaders());
      toast.success('Ordonnance annulée');
      fetchPrescriptions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur annulation');
    }
  };

  const handleDownloadPDF = async (prescription) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/prescriptions/${prescription.id}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('PDF error');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${prescription.number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('PDF téléchargé');
    } catch (err) {
      toast.error('Erreur téléchargement PDF');
    }
  };

  const openEdit = (prescription) => {
    setSelectedPrescription(prescription);
    setFormData({
      items: prescription.content?.items?.length
        ? prescription.content.items
        : [{ medication: '', dosage: '', posology: '', duration: '' }],
      notes: prescription.content?.notes || ''
    });
    setIsEditOpen(true);
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#0D7A87' }} />
    </div>
  );



  return (
    <div className="space-y-6" data-testid="patient-prescriptions">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/patients">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-purple-600" />
              Ordonnances
            </h1>
            {patient && (
              <p className="text-gray-500 flex items-center gap-1">
                <User className="h-4 w-4" />
                {patient.first_name} {patient.last_name}
              </p>
            )}
          </div>
        </div>

        <Button data-testid="new-prescription-btn" onClick={() => { resetForm(); setIsCreateOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />Nouvelle ordonnance
            </Button>
      </div>

      {/* ── Modals CSS purs ── */}
      <Modal open={isCreateOpen} onClose={() => { setIsCreateOpen(false); resetForm(); }} title="Nouvelle ordonnance">
        <PrescriptionForm
          formData={formData}
          setFormData={setFormData}
          saving={saving}
          onSubmit={handleCreate}
          submitLabel="Créer (brouillon)"
          onCancel={() => { setIsCreateOpen(false); resetForm(); }}
          addItem={addItem}
          removeItem={removeItem}
          updateItem={updateItem}
        />
      </Modal>

      <Modal open={isEditOpen} onClose={() => { setIsEditOpen(false); resetForm(); }} title={`Modifier ${selectedPrescription?.number || ''}`}>
        <PrescriptionForm
          formData={formData}
          setFormData={setFormData}
          saving={saving}
          onSubmit={handleUpdate}
          submitLabel="Enregistrer"
          onCancel={() => { setIsEditOpen(false); resetForm(); }}
          addItem={addItem}
          removeItem={removeItem}
          updateItem={updateItem}
        />
      </Modal>

      {/* Liste */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {prescriptions.length} ordonnance{prescriptions.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {prescriptions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Aucune ordonnance</p>
            </div>
          ) : (
            <div className="space-y-3">
              {prescriptions.map((presc) => (
                <div key={presc.id} className="p-4 border rounded-lg hover:bg-gray-50 transition" data-testid={`presc-${presc.number}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{presc.number}</span>
                        <Badge className={STATUS_COLORS[presc.status]}>{STATUS_LABELS[presc.status]}</Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatDate(presc.created_at)}
                        {presc.issued_at && ` • Émise le ${formatDate(presc.issued_at)}`}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {presc.content?.items?.length || 0} médicament{(presc.content?.items?.length || 0) !== 1 ? 's' : ''}
                        {presc.content?.items?.length > 0 && `: ${presc.content.items.map(i => i.medication).join(', ')}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {presc.status === 'DRAFT' && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(presc)} data-testid={`edit-${presc.number}`}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleIssue(presc)} className="text-green-600" data-testid={`issue-${presc.number}`}>
                            <Send className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {presc.status !== 'CANCELLED' && (
                        <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(presc)} data-testid={`pdf-${presc.number}`}>
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {presc.status !== 'CANCELLED' && (
                        <Button variant="ghost" size="sm" onClick={() => handleCancel(presc)} className="text-red-600" data-testid={`cancel-${presc.number}`}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientPrescriptions;
