import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { 
  Receipt, Plus, Search, Eye, Printer, DollarSign, Calendar, User,
  CreditCard, AlertCircle, CheckCircle, Clock, Minus, AlertTriangle,
  Share2, Download, X, Banknote, Smartphone, Loader2
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const formatCurrency = (amount) =>
  new Intl.NumberFormat('fr-MG', { style: 'currency', currency: 'MGA', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try { return new Date(dateStr).toLocaleDateString('fr-FR'); } catch { return '-'; }
};

const STATUS_MAP = {
  DRAFT:    { name: 'Brouillon',  color: 'bg-gray-100 text-gray-700',    icon: Clock },
  PENDING:  { name: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  PARTIAL:  { name: 'Partiel',    color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  PAID:     { name: 'Payé',       color: 'bg-green-100 text-green-800',   icon: CheckCircle },
  OVERDUE:  { name: 'En retard',  color: 'bg-red-100 text-red-800',       icon: AlertCircle },
  CANCELLED:{ name: 'Annulé',     color: 'bg-gray-100 text-gray-500',     icon: X },
};

const getStatusInfo = (invoice) => {
  const key = invoice.payment_status || invoice.status || 'DRAFT';
  return STATUS_MAP[key] || { name: key, color: 'bg-gray-100 text-gray-700', icon: Clock };
};

const PAYMENT_METHODS = {
  CASH:         { name: 'Espèces',        icon: Banknote },
  BANK_TRANSFER:{ name: 'Virement',       icon: CreditCard },
  CHEQUE:       { name: 'Chèque',         icon: Receipt },
  MVOLA:        { name: 'Mvola',          icon: Smartphone },
  ORANGE_MONEY: { name: 'Orange Money',   icon: Smartphone },
  AIRTEL_MONEY: { name: 'Airtel Money',   icon: Smartphone },
  CARD:         { name: 'Carte bancaire', icon: CreditCard },
};

const DISCOUNT_PRESETS = [
  { name: 'Syndical (-15%)',    percentage: 15 },
  { name: 'Humanitaire (-20%)', percentage: 20 },
  { name: 'Long terme (-10%)',  percentage: 10 },
];

const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#0F172A', background: '#fff', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 };

// ── Modal CSS pur ──
const Modal = ({ open, onClose, title, description, children, maxWidth = 700 }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth, boxShadow: '0 16px 48px rgba(15,23,42,0.18)', border: '1px solid #E2E8F0', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}><X size={18} /></button>
        {(title || description) && (
          <div style={{ marginBottom: 20, paddingRight: 24 }}>
            {title && <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>{title}</h2>}
            {description && <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{description}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

const InvoiceManagement = () => {
  const { user } = useAuth();
  const [invoices, setInvoices]               = useState([]);
  const [patients, setPatients]               = useState([]);
  const [pricingSchedules, setPricingSchedules] = useState([]);
  const [procedureFees, setProcedureFees]     = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [searchTerm, setSearchTerm]           = useState('');
  const [statusFilter, setStatusFilter]       = useState('ALL');
  const [procedureSearch, setProcedureSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen]       = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [scheduleOverride, setScheduleOverride] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [submitting, setSubmitting]           = useState(false);

  const [formData, setFormData] = useState({
    patient_id: '', schedule_id: '',
    items: [{ description: '', procedure_code: '', quantity: 1, unit_price_mga: '', tooth_number: '' }],
    discount_percentage: 0, notes: '', payment_method: ''
  });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [invoicePayments, setInvoicePayments]       = useState([]);
  const [paymentData, setPaymentData] = useState({ amount_mga: '', payment_method: 'CASH', reference_number: '' });
  const [paymentStats, setPaymentStats] = useState({ total_mga: 0, paid_total_mga: 0, balance_mga: 0, payment_status: 'UNPAID' });

  useEffect(() => { fetchInvoices(); fetchPatients(); fetchPricingSchedules(); }, []);

  const fetchInvoices = async (status = null) => {
    try {
      setLoading(true);
      const params = {};
      if (status && status !== 'ALL') params.status = status;
      const res = await axios.get(`${API}/invoices`, { params });
      const list = Array.isArray(res.data) ? res.data : (res.data?.invoices || []);
      setInvoices(list);
    } catch (err) {
      if (!axios.isCancel(err)) { toast.error('Erreur chargement factures'); setInvoices([]); }
    } finally { setLoading(false); }
  };

  const fetchPatients = async () => {
    try {
      const res = await axios.get(`${API}/patients`);
      setPatients(Array.isArray(res.data) ? res.data : (res.data?.patients || []));
    } catch (err) { console.error(err); }
  };

  const fetchPricingSchedules = async () => {
    try {
      const res = await axios.get(`${API}/pricing-schedules`);
      setPricingSchedules(Array.isArray(res.data) ? res.data : (res.data?.schedules || []));
    } catch (err) { console.error(err); }
  };

  const fetchProcedureFees = async (scheduleId) => {
    try {
      const res = await axios.get(`${API}/pricing-schedules/${scheduleId}/fees`);
      setProcedureFees(Array.isArray(res.data) ? res.data : (res.data?.fees || []));
    } catch (err) { console.error(err); }
  };

  const fetchInvoicePayments = async (invoiceId) => {
    try {
      const res = await axios.get(`${API}/invoices/${invoiceId}/payments`);
      setInvoicePayments(Array.isArray(res.data?.payments) ? res.data.payments : []);
      setPaymentStats({ total_mga: res.data?.total_mga || 0, paid_total_mga: res.data?.paid_total_mga || 0, balance_mga: res.data?.balance_mga || 0, payment_status: res.data?.payment_status || 'UNPAID' });
    } catch (err) { setInvoicePayments([]); }
  };

  const openPaymentModal = async (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentData({ amount_mga: '', payment_method: 'CASH', reference_number: '' });
    await fetchInvoicePayments(invoice.id);
    setIsPaymentModalOpen(true);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice || !paymentData.amount_mga) return;
    try {
      await axios.post(`${API}/invoices/${selectedInvoice.id}/payments`, {
        amount_mga: parseFloat(paymentData.amount_mga),
        payment_method: paymentData.payment_method,
        reference_number: paymentData.reference_number || null,
      });
      toast.success('Paiement enregistré');
      setPaymentData({ amount_mga: '', payment_method: 'CASH', reference_number: '' });
      await fetchInvoicePayments(selectedInvoice.id);
      fetchInvoices(statusFilter !== 'ALL' ? statusFilter : null);
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur paiement'); }
  };

  const handlePrint = (id) => window.open(`${API}/invoices/${id}/print`, '_blank');

  const handleDownloadPDF = async (id, number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/invoices/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { toast.error(`Erreur PDF: ${res.status}`); return; }
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${number || 'facture'}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('PDF téléchargé');
    } catch (err) { toast.error('Erreur PDF'); }
  };

  const handleShare = async (invoice) => {
    const url = `${API}/invoices/${invoice.id}/print`;
    try { await navigator.clipboard.writeText(url); toast.success('Lien copié!'); } catch {}
  };

  const handleScheduleChange = (scheduleId) => {
    setFormData(f => ({ ...f, schedule_id: scheduleId }));
    if (scheduleId) fetchProcedureFees(scheduleId); else setProcedureFees([]);
  };

  const handlePatientChange = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    setSelectedPatient(patient);
    setFormData(f => ({ ...f, patient_id: patientId }));
    if (patient && pricingSchedules.length > 0) {
      const type = patient.payer_type === 'INSURED' ? 'SYNDICAL' : 'CABINET';
      const sched = pricingSchedules.find(s => s.type === type);
      if (sched) handleScheduleChange(sched.id);
    }
  };

  const addProcedureFromFee = (fee) => {
    setFormData(f => ({ ...f, items: [...f.items.filter(i => i.description !== ''), { description: fee.label, procedure_code: fee.procedure_code, quantity: 1, unit_price_mga: fee.price_mga, tooth_number: '' }] }));
    setProcedureSearch('');
  };

  const addItem    = () => setFormData(f => ({ ...f, items: [...f.items, { description: '', procedure_code: '', quantity: 1, unit_price_mga: '', tooth_number: '' }] }));
  const removeItem = (idx) => setFormData(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx, field, value) => {
    setFormData(f => { const items = [...f.items]; items[idx] = { ...items[idx], [field]: value }; return { ...f, items }; });
  };

  const calcItemTotal = (item) => (item.quantity || 0) * (parseFloat(item.unit_price_mga) || 0);
  const calcSubtotal  = () => formData.items.reduce((s, i) => s + calcItemTotal(i), 0);
  const calcTotal     = () => { const sub = calcSubtotal(); return sub - (sub * formData.discount_percentage) / 100; };

  const resetForm = () => {
    setFormData({ patient_id: '', schedule_id: '', items: [{ description: '', procedure_code: '', quantity: 1, unit_price_mga: '', tooth_number: '' }], discount_percentage: 0, notes: '', payment_method: '' });
    setProcedureFees([]); setProcedureSearch(''); setSelectedPatient(null); setScheduleOverride(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.schedule_id) { toast.error('Veuillez sélectionner une grille tarifaire'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API}/invoices`, {
        patient_id: formData.patient_id, schedule_id: formData.schedule_id,
        date_issued: new Date().toISOString().split('T')[0],
        items: formData.items.filter(i => i.description).map(i => ({ description: i.description, procedure_code: i.procedure_code, quantity: parseInt(i.quantity), unit_price_mga: parseFloat(i.unit_price_mga), tooth_number: i.tooth_number || null })),
        discount_percentage: formData.discount_percentage, payment_method: formData.payment_method || null, notes: formData.notes,
      });
      toast.success('Facture créée');
      await fetchInvoices(); resetForm(); setIsDialogOpen(false);
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur création'); }
    finally { setSubmitting(false); }
  };

  const getPatientName = (id) => { const p = patients.find(p => p.id === id); return p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Patient inconnu'; };

  const filteredProcedures = procedureFees.filter(f =>
    (f.procedure_code || '').toLowerCase().includes(procedureSearch.toLowerCase()) ||
    (f.label || '').toLowerCase().includes(procedureSearch.toLowerCase())
  ).slice(0, 10);

  const filteredInvoices = invoices.filter(inv =>
    (inv.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    getPatientName(inv.patient_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#0D7A87' }} />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(15,23,42,0.05)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(13,122,135,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt size={26} style={{ color: '#0D7A87' }} />
          </div>
          <div>
            <h1 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Factures</h1>
            <p style={{ color: '#64748B', fontSize: 13, margin: '2px 0 0' }}>{invoices.length} facture{invoices.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} style={{ background: 'linear-gradient(135deg, #0D7A87, #13A3B4)', color: '#fff', border: 'none' }}>
          <Plus className="h-4 w-4 mr-2" />Nouvelle Facture
        </Button>
      </div>

      {/* Filtres */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} size={16} />
          <input style={{ ...inputStyle, paddingLeft: 38, borderRadius: 99 }} placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['ALL','DRAFT','PARTIAL','PAID'].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); fetchInvoices(s !== 'ALL' ? s : null); }}
              style={{ padding: '6px 14px', borderRadius: 99, border: '1.5px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderColor: statusFilter === s ? '#0D7A87' : '#E2E8F0', background: statusFilter === s ? '#0D7A87' : '#fff', color: statusFilter === s ? '#fff' : '#475569', transition: 'all 0.15s ease' }}>
              {{ ALL:'Toutes', DRAFT:'Brouillon', PARTIAL:'Partiel', PAID:'Payées' }[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        {filteredInvoices.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0', color: '#94A3B8' }}>
            <Receipt size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ fontSize: 15, fontWeight: 600 }}>{searchTerm ? 'Aucun résultat' : 'Aucune facture'}</p>
          </div>
        ) : filteredInvoices.map(invoice => {
          const statusInfo = getStatusInfo(invoice);
          const StatusIcon = statusInfo.icon;
          return (
            <div key={invoice.id} style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(13,122,135,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Receipt size={22} style={{ color: '#0D7A87' }} />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 15, color: '#0F172A', margin: 0 }}>{invoice.invoice_number || '-'}</h3>
                  <div style={{ display: 'flex', gap: 14, fontSize: 13, color: '#64748B', marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={13} />{getPatientName(invoice.patient_id)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={13} />{formatDate(invoice.invoice_date || invoice.date_issued || invoice.created_at)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#0D7A87', fontWeight: 700 }}><DollarSign size={13} />{formatCurrency(invoice.total_mga)}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${statusInfo.color}`}>
                  <StatusIcon className="h-3 w-3" />{statusInfo.name}
                </span>
                <Button variant="outline" size="sm" onClick={() => openPaymentModal(invoice)}><Eye className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => handleShare(invoice)}><Share2 className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => handlePrint(invoice.id)}><Printer className="h-4 w-4" /></Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modal Nouvelle Facture ── */}
      <Modal open={isDialogOpen} onClose={() => setIsDialogOpen(false)} title="Nouvelle Facture" description="Créez une nouvelle facture pour un patient" maxWidth={860}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Patient *</label>
              <select style={inputStyle} value={formData.patient_id} onChange={e => handlePatientChange(e.target.value)} required>
                <option value="">Sélectionnez un patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}{p.payer_type === 'INSURED' ? ' (Assuré)' : ''}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Grille Tarifaire *</label>
              <select style={inputStyle} value={formData.schedule_id} onChange={e => handleScheduleChange(e.target.value)} required>
                <option value="">Sélectionnez une tarification</option>
                {pricingSchedules.map(s => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
              </select>
              {scheduleOverride && <p style={{ color: '#B45309', fontSize: 12, marginTop: 4 }}>⚠️ Grille différente de celle recommandée</p>}
            </div>
          </div>

          {formData.schedule_id && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Ajouter un acte</label>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} size={14} />
                <input style={{ ...inputStyle, paddingLeft: 32 }} placeholder="Rechercher un acte..." value={procedureSearch} onChange={e => setProcedureSearch(e.target.value)} />
              </div>
              {procedureSearch && filteredProcedures.length > 0 && (
                <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, maxHeight: 200, overflowY: 'auto', background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', marginTop: 4 }}>
                  {filteredProcedures.map(fee => (
                    <button key={fee.id} type="button" onClick={() => addProcedureFromFee(fee)}
                      style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid #F1F5F9' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F0F7F8'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <span><span style={{ fontFamily: 'monospace', color: '#3B4FD8' }}>{fee.procedure_code}</span> — {fee.label}</span>
                      <span style={{ fontWeight: 700, color: '#0D7A87' }}>{formatCurrency(fee.price_mga)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label style={labelStyle}>Articles</label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
            </div>
            {formData.items.map((item, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '4fr 1fr 2fr 2fr auto', gap: 8, marginBottom: 8, padding: '10px 12px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0', alignItems: 'end' }}>
                <div>
                  <label style={labelStyle}>Description *</label>
                  <input style={inputStyle} value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Consultation..." required />
                </div>
                <div>
                  <label style={labelStyle}>Qté</label>
                  <input style={inputStyle} type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} />
                </div>
                <div>
                  <label style={labelStyle}>Prix (MGA) *</label>
                  <input style={inputStyle} type="number" value={item.unit_price_mga} onChange={e => updateItem(idx, 'unit_price_mga', e.target.value)} required />
                </div>
                <div>
                  <label style={labelStyle}>Total</label>
                  <p style={{ fontWeight: 700, fontSize: 13, color: '#0D7A87', padding: '8px 0' }}>{formatCurrency(calcItemTotal(item))}</p>
                </div>
                <div>
                  {formData.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E63946', padding: 6 }}><Minus size={16} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Remise (%)</label>
              <input style={inputStyle} type="number" min="0" max="100" value={formData.discount_percentage} onChange={e => setFormData(f => ({ ...f, discount_percentage: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label style={labelStyle}>Remises prédéfinies</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {DISCOUNT_PRESETS.map(p => (
                  <button key={p.name} type="button" onClick={() => setFormData(f => ({ ...f, discount_percentage: p.percentage }))}
                    style={{ padding: '4px 10px', borderRadius: 99, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#475569' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#0D7A87'; e.currentTarget.style.color = '#0D7A87'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#475569'; }}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Mode de paiement</label>
            <select style={inputStyle} value={formData.payment_method} onChange={e => setFormData(f => ({ ...f, payment_method: e.target.value }))}>
              <option value="">Sélectionnez (optionnel)</option>
              {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }} value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>

          <div style={{ background: 'rgba(13,122,135,0.06)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, border: '1px solid rgba(13,122,135,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569', marginBottom: 4 }}>
              <span>Sous-total</span><span style={{ fontWeight: 600 }}>{formatCurrency(calcSubtotal())}</span>
            </div>
            {formData.discount_percentage > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#E63946', marginBottom: 4 }}>
                <span>Remise ({formData.discount_percentage}%)</span><span>-{formatCurrency(calcSubtotal() * formData.discount_percentage / 100)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: '#0D7A87', borderTop: '1px solid rgba(13,122,135,0.2)', paddingTop: 8 }}>
              <span>Total</span><span>{formatCurrency(calcTotal())}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={submitting || !formData.patient_id || formData.items.some(i => !i.description || !i.unit_price_mga)}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Créer la facture
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Paiement ── */}
      <Modal open={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={`Facture ${selectedInvoice?.invoice_number}`} description={getPatientName(selectedInvoice?.patient_id)} maxWidth={680}>
        {selectedInvoice && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[{ label: 'Total', value: paymentStats.total_mga, bg: '#F8FAFC' }, { label: 'Payé', value: paymentStats.paid_total_mga, bg: '#F0FDF4' }, { label: 'Reste', value: paymentStats.balance_mga, bg: paymentStats.balance_mga > 0 ? '#FFFBEB' : '#F0FDF4' }].map((item, i) => (
                <div key={i} style={{ background: item.bg, borderRadius: 12, padding: '12px 16px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                  <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{formatCurrency(item.value)}</p>
                </div>
              ))}
            </div>

            {paymentStats.balance_mga > 0 && (
              <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Ajouter un paiement</p>
                <form onSubmit={handleSubmitPayment}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10 }}>
                    <div>
                      <label style={labelStyle}>Montant (MGA)</label>
                      <input style={inputStyle} type="number" min="1" value={paymentData.amount_mga} onChange={e => setPaymentData(d => ({ ...d, amount_mga: e.target.value }))} />
                    </div>
                    <div>
                      <label style={labelStyle}>Méthode</label>
                      <select style={inputStyle} value={paymentData.payment_method} onChange={e => setPaymentData(d => ({ ...d, payment_method: e.target.value }))}>
                        {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Référence</label>
                      <input style={inputStyle} value={paymentData.reference_number} onChange={e => setPaymentData(d => ({ ...d, reference_number: e.target.value }))} placeholder="N° transaction" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <Button type="submit" disabled={!paymentData.amount_mga} style={{ background: 'linear-gradient(135deg, #0D7A87, #13A3B4)', color: '#fff', border: 'none', whiteSpace: 'nowrap' }}>
                        <CheckCircle className="h-4 w-4 mr-1" />Enregistrer
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Historique des paiements</p>
              {invoicePayments.length === 0 ? (
                <p style={{ color: '#94A3B8', textAlign: 'center', padding: '16px 0', fontSize: 13 }}>Aucun paiement</p>
              ) : invoicePayments.map(payment => {
                const MethodIcon = PAYMENT_METHODS[payment.payment_method]?.icon || CreditCard;
                return (
                  <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, marginBottom: 6, border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <MethodIcon size={18} style={{ color: '#64748B' }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600 }}>{PAYMENT_METHODS[payment.payment_method]?.name || payment.payment_method}</p>
                        <p style={{ fontSize: 11, color: '#94A3B8' }}>{formatDate(payment.payment_date)}{payment.reference_number ? ` · ${payment.reference_number}` : ''}</p>
                      </div>
                    </div>
                    <span style={{ fontWeight: 800, color: '#0EA570' }}>+{formatCurrency(payment.amount_mga)}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(selectedInvoice.id, selectedInvoice.invoice_number)}><Download className="h-4 w-4 mr-1" />PDF</Button>
                <Button variant="outline" size="sm" onClick={() => handleShare(selectedInvoice)}><Share2 className="h-4 w-4 mr-1" />Partager</Button>
                <Button variant="outline" size="sm" onClick={() => handlePrint(selectedInvoice.id)}><Printer className="h-4 w-4 mr-1" />Imprimer</Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsPaymentModalOpen(false)}>Fermer</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InvoiceManagement;
