import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { 
  FileText, Plus, Search, Eye, Printer, DollarSign,
  Calendar, User, Share2, Download, ArrowRight,
  Clock, CheckCircle, XCircle, AlertCircle, X, Loader2
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ── Modal CSS pur — évite bug Portal/removeChild de shadcn Dialog ──
const Modal = ({ open, onClose, children, maxWidth = 640 }) => {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, overflowY: 'auto'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 16,
        padding: 28, width: '100%', maxWidth,
        boxShadow: '0 16px 48px rgba(15,23,42,0.18)',
        border: '1px solid #E2E8F0',
        maxHeight: '90vh', overflowY: 'auto',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94A3B8', padding: 4, borderRadius: 6,
          }}
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
};

const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: 10,
  border: '1.5px solid #E2E8F0', fontSize: 13,
  fontFamily: 'DM Sans, sans-serif', color: '#0F172A',
  background: '#fff', boxSizing: 'border-box'
};
const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: '#475569', marginBottom: 4, fontFamily: 'Plus Jakarta Sans'
};

const QuoteManagement = () => {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [patients, setPatients] = useState([]);
  const [pricingSchedules, setPricingSchedules] = useState([]);
  const [procedureFees, setProcedureFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '', schedule_id: '',
    items: [{ description: '', quantity: 1, unit_price_mga: '', tooth_number: '' }],
    discount_percentage: 0, validity_days: 30, notes: ''
  });

  const quoteStatuses = {
    DRAFT:     { name: 'Brouillon', color: 'bg-gray-100 text-gray-800',   icon: Clock },
    SENT:      { name: 'Envoyé',    color: 'bg-blue-100 text-blue-800',   icon: FileText },
    ACCEPTED:  { name: 'Accepté',   color: 'bg-green-100 text-green-800', icon: CheckCircle },
    REJECTED:  { name: 'Refusé',    color: 'bg-red-100 text-red-800',     icon: XCircle },
    EXPIRED:   { name: 'Expiré',    color: 'bg-amber-100 text-amber-800', icon: AlertCircle },
    CONVERTED: { name: 'Converti',  color: 'bg-purple-100 text-purple-800', icon: ArrowRight },
    PAID:      { name: 'Payé',       color: 'bg-green-100 text-green-800',  icon: CheckCircle },
    CANCELLED: { name: 'Annulé',     color: 'bg-red-100 text-red-800',     icon: XCircle }
  };

  useEffect(() => {
    fetchQuotes();
    fetchPatients();
    fetchPricingSchedules();
  }, []);

  const fetchQuotes = async () => {
    try {
      const res = await axios.get(`${API}/quotes`);
      setQuotes(res.data.quotes || []);
    } catch (err) {
      if (!axios.isCancel(err)) toast.error('Erreur chargement devis');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await axios.get(`${API}/patients`);
      setPatients(res.data.patients || []);
    } catch (err) { if (!axios.isCancel(err)) console.error('Erreur patients'); }
  };

  const fetchPricingSchedules = async () => {
    try {
      const res = await axios.get(`${API}/pricing-schedules`);
      setPricingSchedules(res.data.schedules || []);
    } catch (err) { console.error('Erreur tarifs'); }
  };

  const fetchProcedureFees = async (scheduleId) => {
    if (!scheduleId) return;
    try {
      const res = await axios.get(`${API}/pricing-schedules/${scheduleId}/fees`);
      setProcedureFees(res.data.fees || []);
    } catch (err) { console.error('Erreur actes'); }
  };

  const handleScheduleChange = (scheduleId) => {
    setFormData({ ...formData, schedule_id: scheduleId });
    fetchProcedureFees(scheduleId);
  };

  const addItem = () => setFormData({
    ...formData,
    items: [...formData.items, { description: '', quantity: 1, unit_price_mga: '', tooth_number: '' }]
  });

  const removeItem = (index) => {
    if (formData.items.length > 1)
      setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const calculateSubtotal = () =>
    formData.items.reduce((sum, item) => sum + (item.quantity * (parseFloat(item.unit_price_mga) || 0)), 0);

  const calculateTotal = () => {
    const sub = calculateSubtotal();
    return sub - (sub * formData.discount_percentage / 100);
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('fr-MG').format(amount || 0) + ' Ar';

  const resetForm = () => {
    setFormData({
      patient_id: '', schedule_id: '',
      items: [{ description: '', quantity: 1, unit_price_mga: '', tooth_number: '' }],
      discount_percentage: 0, validity_days: 30, notes: ''
    });
    setProcedureFees([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post(`${API}/quotes`, {
        patient_id: formData.patient_id,
        schedule_id: formData.schedule_id,
        items: formData.items.filter(item => item.description && item.unit_price_mga),
        discount_percentage: formData.discount_percentage,
        validity_days: formData.validity_days,
        notes: formData.notes
      });
      toast.success('Devis créé avec succès');
      setIsDialogOpen(false);
      resetForm();
      fetchQuotes();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur création');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvert = async (quote) => {
    if (!window.confirm(`Convertir le devis ${quote.invoice_number} en facture ?`)) return;
    try {
      const res = await axios.post(`${API}/quotes/${quote.id}/convert`);
      toast.success(`Facture ${res.data.invoice.invoice_number} créée`);
      fetchQuotes();
      setIsDetailOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur conversion');
    }
  };

  const handleStatusChange = async (quote, newStatus) => {
    try {
      await axios.patch(`${API}/quotes/${quote.id}/status`, { status: newStatus });
      toast.success('Statut mis à jour');
      fetchQuotes();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    }
  };

  const handlePrint = (quoteId) => window.open(`${API}/quotes/${quoteId}/print`, '_blank');

  const handleDownloadPDF = async (quoteId, quoteNumber) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/quotes/${quoteId}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) { toast.error('Erreur PDF'); return; }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${quoteNumber || 'devis'}.pdf`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('PDF téléchargé');
    } catch (err) { toast.error('Erreur téléchargement PDF'); }
  };

  const handleShare = async (quote) => {
    const shareUrl = `${API}/quotes/${quote.id}/print`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Devis ${quote.invoice_number}`, url: shareUrl });
      } catch (err) {
        if (err.name !== 'AbortError') { await navigator.clipboard.writeText(shareUrl); toast.success('Lien copié!'); }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Lien copié!');
    }
  };

  const getPatientName = (patientId) => {
    const p = patients.find(p => p.id === patientId);
    return p ? `${p.first_name} ${p.last_name}` : 'Patient inconnu';
  };

  const filteredQuotes = quotes.filter(q =>
    q.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getPatientName(q.patient_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#0D7A87' }} />
    </div>
  );

  return (
    <div className="space-y-6" data-testid="quote-management">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Devis</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>Gérez vos devis et convertissez-les en factures</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} data-testid="new-quote-btn">
          <Plus className="h-4 w-4 mr-2" />Nouveau Devis
        </Button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 400 }}>
        <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} size={16} />
        <input
          style={{ ...inputStyle, paddingLeft: 38, borderRadius: 99 }}
          placeholder="Rechercher un devis..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Liste */}
      <div className="grid gap-4">
        {filteredQuotes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {searchTerm ? 'Aucun devis trouvé' : 'Aucun devis créé'}
              </h3>
            </CardContent>
          </Card>
        ) : filteredQuotes.map((quote) => {
          const StatusIcon = quoteStatuses[quote.status]?.icon || Clock;
          return (
            <Card key={quote.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <div style={{ background: 'rgba(13,122,135,0.1)', padding: 12, borderRadius: 12 }}>
                      <FileText size={22} style={{ color: '#0D7A87' }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{quote.invoice_number}</h3>
                      <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#64748B', marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <User size={13} />
                          {quote.patient ? `${quote.patient.first_name} ${quote.patient.last_name}` : getPatientName(quote.patient_id)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={13} />
                          {new Date(quote.invoice_date).toLocaleDateString('fr-FR')}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#0D7A87', fontWeight: 700 }}>
                          <DollarSign size={13} />
                          {formatCurrency(quote.total_mga)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Badge className={quoteStatuses[quote.status]?.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {quoteStatuses[quote.status]?.name || quote.status}
                    </Badge>
                    {!['CONVERTED', 'EXPIRED', 'PAID', 'CANCELLED'].includes(quote.status) && (
                      <Button size="sm" onClick={() => handleConvert(quote)} data-testid={`convert-${quote.invoice_number}`}>
                        <ArrowRight className="h-4 w-4 mr-1" />Convertir
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => { setSelectedQuote(quote); setIsDetailOpen(true); }}>
                      <Eye className="h-4 w-4 mr-1" />Voir
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(quote.id, quote.invoice_number)}>
                      <Download className="h-4 w-4 mr-1" />PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleShare(quote)}>
                      <Share2 className="h-4 w-4 mr-1" />Partager
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handlePrint(quote.id)}>
                      <Printer className="h-4 w-4 mr-1" />Imprimer
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Modal Nouveau Devis ── */}
      <Modal open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth={760}>
        <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 18, color: '#0F172A', marginBottom: 20, paddingRight: 24 }}>
          Créer un nouveau devis
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Patient *</label>
              <select
                style={inputStyle}
                value={formData.patient_id}
                onChange={e => setFormData({ ...formData, patient_id: e.target.value })}
                required
                data-testid="patient-select"
              >
                <option value="">Sélectionnez un patient</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Grille Tarifaire</label>
              <select
                style={inputStyle}
                value={formData.schedule_id}
                onChange={e => handleScheduleChange(e.target.value)}
                data-testid="schedule-select"
              >
                <option value="">Sélectionnez une tarification</option>
                {pricingSchedules.map(s => (
                  <option key={s.id} value={s.id}>[{s.type}] {s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Items */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label style={labelStyle}>Actes / Prestations</label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />Ajouter
              </Button>
            </div>
            {formData.items.map((item, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '5fr 2fr 1fr 3fr 1fr', gap: 8, marginBottom: 8, padding: '10px 12px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                <div>
                  <label style={labelStyle}>Description</label>
                  <input
                    style={inputStyle}
                    value={item.description}
                    onChange={e => updateItem(index, 'description', e.target.value)}
                    placeholder="Description de l'acte"
                    list={`procedures-${index}`}
                  />
                  {procedureFees.length > 0 && (
                    <datalist id={`procedures-${index}`}>
                      {procedureFees.slice(0, 20).map(fee => (
                        <option key={fee.id} value={`${fee.procedure_code} - ${fee.label}`} />
                      ))}
                    </datalist>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Dent</label>
                  <input style={inputStyle} value={item.tooth_number || ''} onChange={e => updateItem(index, 'tooth_number', e.target.value)} placeholder="Ex: 11" />
                </div>
                <div>
                  <label style={labelStyle}>Qté</label>
                  <input style={inputStyle} type="number" min="1" value={item.quantity} onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 1)} />
                </div>
                <div>
                  <label style={labelStyle}>Prix (MGA)</label>
                  <input style={inputStyle} type="number" value={item.unit_price_mga} onChange={e => updateItem(index, 'unit_price_mga', e.target.value)} placeholder="Prix unitaire" />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button type="button" onClick={() => removeItem(index)} disabled={formData.items.length === 1}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E63946', padding: 8 }}>
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Remise (%)</label>
              <input style={inputStyle} type="number" min="0" max="100" value={formData.discount_percentage} onChange={e => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label style={labelStyle}>Validité (jours)</label>
              <input style={inputStyle} type="number" min="1" value={formData.validity_days} onChange={e => setFormData({ ...formData, validity_days: parseInt(e.target.value) || 30 })} />
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <input style={inputStyle} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Notes..." />
            </div>
          </div>

          {/* Totaux */}
          <div style={{ background: 'rgba(13,122,135,0.06)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, border: '1px solid rgba(13,122,135,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#475569' }}>
              <span>Sous-total</span><span style={{ fontWeight: 600 }}>{formatCurrency(calculateSubtotal())}</span>
            </div>
            {formData.discount_percentage > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#E63946' }}>
                <span>Remise ({formData.discount_percentage}%)</span>
                <span>-{formatCurrency(calculateSubtotal() * formData.discount_percentage / 100)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: '#0D7A87', borderTop: '1px solid rgba(13,122,135,0.2)', paddingTop: 8 }}>
              <span>Total</span><span>{formatCurrency(calculateTotal())}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={submitting || !formData.patient_id || formData.items.some(i => !i.description || !i.unit_price_mga)}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Créer le devis
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Détail Devis ── */}
      <Modal open={isDetailOpen} onClose={() => setIsDetailOpen(false)} maxWidth={680}>
        {selectedQuote && (
          <>
            <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 18, color: '#0F172A', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, paddingRight: 24 }}>
              <FileText size={18} style={{ color: '#0D7A87' }} />
              Devis {selectedQuote.invoice_number}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total', value: formatCurrency(selectedQuote.total_mga) },
                { label: 'Validité', value: `${selectedQuote.validity_days || 30} jours` },
                { label: 'Statut', value: quoteStatuses[selectedQuote.status]?.name }
              ].map((item, i) => (
                <div key={i} style={{ background: '#F8FAFC', borderRadius: 12, padding: '12px 16px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{item.label}</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{item.value}</p>
                </div>
              ))}
            </div>

            <div style={{ background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0', padding: 16, marginBottom: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 10 }}>Prestations</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selectedQuote.items?.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13 }}>
                    <span style={{ color: '#0F172A' }}>{item.description}{item.tooth_number ? ` (Dent ${item.tooth_number})` : ''}</span>
                    <span style={{ fontWeight: 600, color: '#0D7A87' }}>{item.quantity} × {formatCurrency(item.unit_price_mga)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid #F1F5F9', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {selectedQuote.status === 'DRAFT' && (
                  <Button variant="outline" size="sm" onClick={() => handleStatusChange(selectedQuote, 'SENT')}>Marquer Envoyé</Button>
                )}
                {['DRAFT', 'SENT'].includes(selectedQuote.status) && (
                  <Button variant="outline" size="sm" onClick={() => handleStatusChange(selectedQuote, 'ACCEPTED')}>Marquer Accepté</Button>
                )}
                {!['CONVERTED', 'EXPIRED', 'PAID', 'CANCELLED'].includes(selectedQuote.status) && (
                  <Button size="sm" onClick={() => handleConvert(selectedQuote)}>
                    <ArrowRight className="h-4 w-4 mr-1" />Convertir en Facture
                  </Button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(selectedQuote.id, selectedQuote.invoice_number)} data-testid="detail-pdf-btn">
                  <Download className="h-4 w-4 mr-1" />PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => handlePrint(selectedQuote.id)}>
                  <Printer className="h-4 w-4 mr-1" />Imprimer
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsDetailOpen(false)}>Fermer</Button>
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default QuoteManagement;
