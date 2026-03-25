import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { 
  Receipt, Plus, Search, Eye, Printer, DollarSign, Calendar, User,
  CreditCard, AlertCircle, CheckCircle, Clock, Minus, X,
  Banknote, Smartphone, Loader2, Share2, Download
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL + '/api';

const formatCurrency = function(amount) {
  return new Intl.NumberFormat('fr-MG', { style: 'currency', currency: 'MGA', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0);
};

const formatDate = function(dateStr) {
  if (!dateStr) return '-';
  try { return new Date(dateStr).toLocaleDateString('fr-FR'); } catch(e) { return '-'; }
};

const STATUS_MAP = {
  DRAFT:    { name: 'Brouillon',  color: 'bg-gray-100 text-gray-700',    icon: Clock },
  PENDING:  { name: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  PARTIAL:  { name: 'Partiel',    color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  PAID:     { name: 'Payé',       color: 'bg-green-100 text-green-800',   icon: CheckCircle },
  OVERDUE:  { name: 'En retard',  color: 'bg-red-100 text-red-800',       icon: AlertCircle },
  CANCELLED:{ name: 'Annulé',     color: 'bg-gray-100 text-gray-500',     icon: X },
};

const getStatusInfo = function(invoice) {
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

const Modal = function({ open, onClose, title, description, children, maxWidth }) {
  if (!open) return null;
  var mw = maxWidth || 700;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}
      onClick={function(e) { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: mw, boxShadow: '0 16px 48px rgba(15,23,42,0.18)', border: '1px solid #E2E8F0', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}><X size={18} /></button>
        {(title || description) && (
          <div style={{ marginBottom: 20, paddingRight: 24 }}>
            {title && <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>{title}</h2>}
            {description && <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{description}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

const InvoiceManagement = function() {
  const { user } = useAuth();
  const mountedRef = useRef(true);

  const [invoices, setInvoices]             = useState([]);
  const [patients, setPatients]             = useState([]);
  const [pricingSchedules, setPricingSchedules] = useState([]);
  const [procedureFees, setProcedureFees]   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [searchTerm, setSearchTerm]         = useState('');
  const [statusFilter, setStatusFilter]     = useState('ALL');
  const [procedureSearch, setProcedureSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen]     = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [submitting, setSubmitting]         = useState(false);

  const emptyForm = {
    patient_id: '', schedule_id: '',
    items: [{ description: '', procedure_code: '', quantity: 1, unit_price_mga: '', tooth_number: '' }],
    discount_percentage: 0, notes: '', payment_method: ''
  };
  const [formData, setFormData] = useState(emptyForm);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [invoicePayments, setInvoicePayments]       = useState([]);
  const [paymentData, setPaymentData] = useState({ amount_mga: '', payment_method: 'CASH', reference_number: '' });
  const [paymentStats, setPaymentStats] = useState({ total_mga: 0, paid_total_mga: 0, balance_mga: 0, payment_status: 'UNPAID' });

  useEffect(function() {
    mountedRef.current = true;
    fetchInvoices();
    fetchPatients();
    fetchPricingSchedules();
    return function() { mountedRef.current = false; };
  }, []);

  const fetchInvoices = async function(status) {
    try {
      if (mountedRef.current) setLoading(true);
      var params = {};
      if (status && status !== 'ALL') params.status = status;
      var res = await axios.get(API + '/invoices', { params: params });
      var list = Array.isArray(res.data) ? res.data : (res.data && res.data.invoices ? res.data.invoices : []);
      if (mountedRef.current) setInvoices(list);
    } catch (err) {
      if (mountedRef.current && !axios.isCancel(err)) {
        toast.error('Erreur chargement factures');
        setInvoices([]);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const fetchPatients = async function() {
    try {
      var res = await axios.get(API + '/patients');
      var list = Array.isArray(res.data) ? res.data : (res.data && res.data.patients ? res.data.patients : []);
      if (mountedRef.current) setPatients(list);
    } catch (err) { console.error(err); }
  };

  const fetchPricingSchedules = async function() {
    try {
      var res = await axios.get(API + '/pricing-schedules');
      var list = Array.isArray(res.data) ? res.data : (res.data && res.data.schedules ? res.data.schedules : []);
      if (mountedRef.current) setPricingSchedules(list);
    } catch (err) { console.error(err); }
  };

  const fetchProcedureFees = async function(scheduleId) {
    try {
      var res = await axios.get(API + '/pricing-schedules/' + scheduleId + '/fees');
      var list = Array.isArray(res.data) ? res.data : (res.data && res.data.fees ? res.data.fees : []);
      if (mountedRef.current) setProcedureFees(list);
    } catch (err) { console.error(err); }
  };

  const fetchInvoicePayments = async function(invoiceId) {
    if (!invoiceId) return;
    try {
      var res = await axios.get(API + '/invoices/' + invoiceId + '/payments');
      if (!mountedRef.current) return;
      setInvoicePayments(Array.isArray(res.data && res.data.payments) ? res.data.payments : []);
      setPaymentStats({
        total_mga:      res.data && res.data.total_mga      ? res.data.total_mga      : 0,
        paid_total_mga: res.data && res.data.paid_total_mga ? res.data.paid_total_mga : 0,
        balance_mga:    res.data && res.data.balance_mga    ? res.data.balance_mga    : 0,
        payment_status: res.data && res.data.payment_status ? res.data.payment_status : 'UNPAID',
      });
    } catch (err) {
      if (mountedRef.current) setInvoicePayments([]);
    }
  };

  const openPaymentModal = async function(invoice) {
    setSelectedInvoice(invoice);
    setPaymentData({ amount_mga: '', payment_method: 'CASH', reference_number: '' });
    setInvoicePayments([]);
    setPaymentStats({ total_mga: 0, paid_total_mga: 0, balance_mga: 0, payment_status: 'UNPAID' });
    setIsPaymentModalOpen(true);
    await fetchInvoicePayments(invoice.id);
  };

  const closePaymentModal = function() {
    setIsPaymentModalOpen(false);
    setSelectedInvoice(null);
    setInvoicePayments([]);
  };

  const handleSubmitPayment = async function(e) {
    e.preventDefault();
    if (!selectedInvoice || !selectedInvoice.id || !paymentData.amount_mga) return;
    try {
      await axios.post(API + '/invoices/' + selectedInvoice.id + '/payments', {
        amount_mga: parseFloat(paymentData.amount_mga),
        payment_method: paymentData.payment_method,
        reference_number: paymentData.reference_number || null,
      });
      toast.success('Paiement enregistré');
      setPaymentData({ amount_mga: '', payment_method: 'CASH', reference_number: '' });
      await fetchInvoicePayments(selectedInvoice.id);
      fetchInvoices(statusFilter !== 'ALL' ? statusFilter : null);
    } catch (err) {
      toast.error((err.response && err.response.data && err.response.data.error) || 'Erreur paiement');
    }
  };

  const handlePrint = function(id) { window.open(API + '/invoices/' + id + '/print', '_blank'); };

  const handleDownloadPDF = async function(id, number) {
    try {
      var token = localStorage.getItem('token');
      var res = await fetch(API + '/invoices/' + id + '/pdf', { headers: { Authorization: 'Bearer ' + token } });
      if (!res.ok) { toast.error('Erreur PDF: ' + res.status); return; }
      var blob = await res.blob();
      var url = window.URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = (number || 'facture') + '.pdf';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('PDF téléchargé');
    } catch (err) { toast.error('Erreur PDF'); }
  };

  const handleShare = async function(invoice) {
    var url = API + '/invoices/' + invoice.id + '/print';
    try { await navigator.clipboard.writeText(url); toast.success('Lien copié!'); } catch(e) {}
  };

  const handleScheduleChange = function(scheduleId) {
    setFormData(function(f) { return Object.assign({}, f, { schedule_id: scheduleId }); });
    if (scheduleId) fetchProcedureFees(scheduleId); else setProcedureFees([]);
  };

  const handlePatientChange = function(patientId) {
    var patient = patients.find(function(p) { return p.id === patientId; });
    setSelectedPatient(patient || null);
    setFormData(function(f) { return Object.assign({}, f, { patient_id: patientId }); });
    if (patient && pricingSchedules.length > 0) {
      var type = patient.payer_type === 'INSURED' ? 'SYNDICAL' : 'CABINET';
      var sched = pricingSchedules.find(function(s) { return s.type === type; });
      if (sched) handleScheduleChange(sched.id);
    }
  };

  const addProcedureFromFee = function(fee) {
    setFormData(function(f) {
      return Object.assign({}, f, {
        items: f.items.filter(function(i) { return i.description !== ''; }).concat([
          { description: fee.label, procedure_code: fee.procedure_code, quantity: 1, unit_price_mga: fee.price_mga, tooth_number: '' }
        ])
      });
    });
    setProcedureSearch('');
  };

  const addItem = function() {
    setFormData(function(f) { return Object.assign({}, f, { items: f.items.concat([{ description: '', procedure_code: '', quantity: 1, unit_price_mga: '', tooth_number: '' }]) }); });
  };
  const removeItem = function(idx) {
    setFormData(function(f) { return Object.assign({}, f, { items: f.items.filter(function(_, i) { return i !== idx; }) }); });
  };
  const updateItem = function(idx, field, value) {
    setFormData(function(f) {
      var items = f.items.slice();
      items[idx] = Object.assign({}, items[idx], { [field]: value });
      return Object.assign({}, f, { items: items });
    });
  };

  const calcItemTotal = function(item) { return (item.quantity || 0) * (parseFloat(item.unit_price_mga) || 0); };
  const calcSubtotal  = function() { return formData.items.reduce(function(s, i) { return s + calcItemTotal(i); }, 0); };
  const calcTotal     = function() { var sub = calcSubtotal(); return sub - (sub * formData.discount_percentage) / 100; };

  const resetForm = function() {
    setFormData(emptyForm);
    setProcedureFees([]); setProcedureSearch(''); setSelectedPatient(null);
  };

  const handleSubmit = async function(e) {
    e.preventDefault();
    if (!formData.schedule_id) { toast.error('Veuillez sélectionner une grille tarifaire'); return; }
    setSubmitting(true);
    try {
      await axios.post(API + '/invoices', {
        patient_id: formData.patient_id,
        schedule_id: formData.schedule_id,
        date_issued: new Date().toISOString().split('T')[0],
        items: formData.items.filter(function(i) { return i.description; }).map(function(i) {
          return { description: i.description, procedure_code: i.procedure_code, quantity: parseInt(i.quantity), unit_price_mga: parseFloat(i.unit_price_mga), tooth_number: i.tooth_number || null };
        }),
        discount_percentage: formData.discount_percentage,
        payment_method: formData.payment_method || null,
        notes: formData.notes,
      });
      toast.success('Facture créée');
      await fetchInvoices();
      resetForm();
      setIsDialogOpen(false);
    } catch (err) {
      toast.error((err.response && err.response.data && err.response.data.error) || 'Erreur création');
    } finally { setSubmitting(false); }
  };

  const getPatientName = function(id) {
    var p = patients.find(function(p) { return p.id === id; });
    return p ? ((p.first_name || '') + ' ' + (p.last_name || '')).trim() : 'Patient inconnu';
  };

  var filteredProcedures = procedureFees.filter(function(f) {
    return (f.procedure_code || '').toLowerCase().includes(procedureSearch.toLowerCase()) ||
      (f.label || '').toLowerCase().includes(procedureSearch.toLowerCase());
  }).slice(0, 10);

  var filteredInvoices = invoices.filter(function(inv) {
    return (inv.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      getPatientName(inv.patient_id).toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <Loader2 size={32} style={{ color: '#0D7A87', animation: 'spin 0.75s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(15,23,42,0.05)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(13,122,135,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt size={26} color="#0D7A87" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Factures</h1>
            <p style={{ color: '#64748B', fontSize: 13, margin: '2px 0 0' }}>{invoices.length} facture{invoices.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={function() { resetForm(); setIsDialogOpen(true); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, background: 'linear-gradient(135deg, #0D7A87, #13A3B4)', color: '#fff', border: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 2px 12px rgba(13,122,135,0.3)' }}>
          <Plus size={16} /> Nouvelle Facture
        </button>
      </div>

      {/* Filtres */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} size={16} />
          <input style={Object.assign({}, inputStyle, { paddingLeft: 38, borderRadius: 99 })} placeholder="Rechercher..." value={searchTerm} onChange={function(e) { setSearchTerm(e.target.value); }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['ALL','DRAFT','PARTIAL','PAID'].map(function(s) {
            var labels = { ALL: 'Toutes', DRAFT: 'Brouillon', PARTIAL: 'Partiel', PAID: 'Payées' };
            return (
              <button key={s} onClick={function() { setStatusFilter(s); fetchInvoices(s !== 'ALL' ? s : null); }}
                style={{ padding: '6px 14px', borderRadius: 99, border: '1.5px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderColor: statusFilter === s ? '#0D7A87' : '#E2E8F0', background: statusFilter === s ? '#0D7A87' : '#fff', color: statusFilter === s ? '#fff' : '#475569', transition: 'all 0.15s ease' }}>
                {labels[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Liste */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        {filteredInvoices.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 0', color: '#94A3B8' }}>
            <Receipt size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ fontSize: 15, fontWeight: 600 }}>{searchTerm ? 'Aucun résultat' : 'Aucune facture'}</p>
          </div>
        ) : filteredInvoices.map(function(invoice) {
          var statusInfo = getStatusInfo(invoice);
          var StatusIcon = statusInfo.icon;
          return (
            <div key={invoice.id}
              style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.15s' }}
              onMouseEnter={function(e) { e.currentTarget.style.background = '#F8FAFC'; }}
              onMouseLeave={function(e) { e.currentTarget.style.background = '#fff'; }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(13,122,135,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Receipt size={22} color="#0D7A87" />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 15, color: '#0F172A', margin: 0 }}>{invoice.invoice_number || '-'}</h3>
                  <div style={{ display: 'flex', gap: 14, fontSize: 13, color: '#64748B', marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={13} />{getPatientName(invoice.patient_id)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={13} />{formatDate(invoice.invoice_date || invoice.date_issued || invoice.created_at)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#0D7A87', fontWeight: 700 }}><DollarSign size={13} />{formatCurrency(invoice.total_mga)}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={statusInfo.color + ' text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1'}>
                  <StatusIcon className="h-3 w-3" />{statusInfo.name}
                </span>
                <Button variant="outline" size="sm" onClick={function() { openPaymentModal(invoice); }}><Eye className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={function() { handleShare(invoice); }}><Share2 className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={function() { handlePrint(invoice.id); }}><Printer className="h-4 w-4" /></Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Nouvelle Facture */}
      <Modal open={isDialogOpen} onClose={function() { setIsDialogOpen(false); }} title="Nouvelle Facture" description="Créez une nouvelle facture pour un patient" maxWidth={860}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Patient *</label>
              <select style={inputStyle} value={formData.patient_id} onChange={function(e) { handlePatientChange(e.target.value); }} required>
                <option value="">Sélectionnez un patient</option>
                {patients.map(function(p) { return <option key={p.id} value={p.id}>{p.first_name} {p.last_name}{p.payer_type === 'INSURED' ? ' (Assuré)' : ''}</option>; })}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Grille Tarifaire *</label>
              <select style={inputStyle} value={formData.schedule_id} onChange={function(e) { handleScheduleChange(e.target.value); }} required>
                <option value="">Sélectionnez une tarification</option>
                {pricingSchedules.map(function(s) { return <option key={s.id} value={s.id}>{s.name} ({s.type})</option>; })}
              </select>
            </div>
          </div>

          {formData.schedule_id && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Ajouter un acte</label>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} size={14} />
                <input style={Object.assign({}, inputStyle, { paddingLeft: 32 })} placeholder="Rechercher un acte..." value={procedureSearch} onChange={function(e) { setProcedureSearch(e.target.value); }} />
              </div>
              {procedureSearch && filteredProcedures.length > 0 && (
                <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, maxHeight: 200, overflowY: 'auto', background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', marginTop: 4 }}>
                  {filteredProcedures.map(function(fee) {
                    return (
                      <button key={fee.id} type="button" onClick={function() { addProcedureFromFee(fee); }}
                        style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid #F1F5F9' }}
                        onMouseEnter={function(e) { e.currentTarget.style.background = '#F0F7F8'; }}
                        onMouseLeave={function(e) { e.currentTarget.style.background = 'none'; }}>
                        <span><span style={{ fontFamily: 'monospace', color: '#3B4FD8' }}>{fee.procedure_code}</span> — {fee.label}</span>
                        <span style={{ fontWeight: 700, color: '#0D7A87' }}>{formatCurrency(fee.price_mga)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <label style={labelStyle}>Articles</label>
              <button type="button" onClick={addItem} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#475569' }}>
                <Plus size={13} />Ajouter
              </button>
            </div>
            {formData.items.map(function(item, idx) {
              return (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '4fr 1fr 2fr 2fr auto', gap: 8, marginBottom: 8, padding: '10px 12px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0', alignItems: 'end' }}>
                  <div>
                    <label style={labelStyle}>Description *</label>
                    <input style={inputStyle} value={item.description} onChange={function(e) { updateItem(idx, 'description', e.target.value); }} placeholder="Consultation..." required />
                  </div>
                  <div>
                    <label style={labelStyle}>Qté</label>
                    <input style={inputStyle} type="number" min="1" value={item.quantity} onChange={function(e) { updateItem(idx, 'quantity', parseInt(e.target.value) || 1); }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Prix (MGA) *</label>
                    <input style={inputStyle} type="number" value={item.unit_price_mga} onChange={function(e) { updateItem(idx, 'unit_price_mga', e.target.value); }} required />
                  </div>
                  <div>
                    <label style={labelStyle}>Total</label>
                    <p style={{ fontWeight: 700, fontSize: 13, color: '#0D7A87', padding: '8px 0', margin: 0 }}>{formatCurrency(calcItemTotal(item))}</p>
                  </div>
                  <div>
                    {formData.items.length > 1 && (
                      <button type="button" onClick={function() { removeItem(idx); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E63946', padding: 6 }}><Minus size={16} /></button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Remise (%)</label>
              <input style={inputStyle} type="number" min="0" max="100" value={formData.discount_percentage} onChange={function(e) { setFormData(function(f) { return Object.assign({}, f, { discount_percentage: parseFloat(e.target.value) || 0 }); }); }} />
            </div>
            <div>
              <label style={labelStyle}>Remises prédéfinies</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {DISCOUNT_PRESETS.map(function(p) {
                  return (
                    <button key={p.name} type="button" onClick={function() { setFormData(function(f) { return Object.assign({}, f, { discount_percentage: p.percentage }); }); }}
                      style={{ padding: '4px 10px', borderRadius: 99, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#475569' }}>
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Mode de paiement</label>
            <select style={inputStyle} value={formData.payment_method} onChange={function(e) { setFormData(function(f) { return Object.assign({}, f, { payment_method: e.target.value }); }); }}>
              <option value="">Sélectionnez (optionnel)</option>
              {Object.entries(PAYMENT_METHODS).map(function(entry) { var k = entry[0]; var v = entry[1]; return <option key={k} value={k}>{v.name}</option>; })}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Notes</label>
            <textarea style={Object.assign({}, inputStyle, { minHeight: 56, resize: 'vertical' })} value={formData.notes} onChange={function(e) { setFormData(function(f) { return Object.assign({}, f, { notes: e.target.value }); }); }} rows={2} />
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
            <button type="button" onClick={function() { setIsDialogOpen(false); }} style={{ padding: '9px 18px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', color: '#475569', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
            <button type="submit" disabled={submitting || !formData.patient_id || formData.items.some(function(i) { return !i.description || !i.unit_price_mga; })}
              style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #0D7A87, #13A3B4)', color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              {submitting && <Loader2 size={14} style={{ animation: 'spin 0.75s linear infinite' }} />}Créer la facture
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Paiement */}
      <Modal open={isPaymentModalOpen} onClose={closePaymentModal} title={'Facture ' + (selectedInvoice ? selectedInvoice.invoice_number : '')} description={selectedInvoice ? getPatientName(selectedInvoice.patient_id) : ''} maxWidth={680}>
        {selectedInvoice && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total', value: paymentStats.total_mga, bg: '#F8FAFC' },
                { label: 'Payé',  value: paymentStats.paid_total_mga, bg: '#F0FDF4' },
                { label: 'Reste', value: paymentStats.balance_mga, bg: paymentStats.balance_mga > 0 ? '#FFFBEB' : '#F0FDF4' }
              ].map(function(item, i) {
                return (
                  <div key={i} style={{ background: item.bg, borderRadius: 12, padding: '12px 16px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                    <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>{formatCurrency(item.value)}</p>
                  </div>
                );
              })}
            </div>

            {paymentStats.balance_mga > 0 && (
              <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Ajouter un paiement</p>
                <form onSubmit={handleSubmitPayment}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10 }}>
                    <div>
                      <label style={labelStyle}>Montant (MGA)</label>
                      <input style={inputStyle} type="number" min="1" value={paymentData.amount_mga} onChange={function(e) { setPaymentData(function(d) { return Object.assign({}, d, { amount_mga: e.target.value }); }); }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Méthode</label>
                      <select style={inputStyle} value={paymentData.payment_method} onChange={function(e) { setPaymentData(function(d) { return Object.assign({}, d, { payment_method: e.target.value }); }); }}>
                        {Object.entries(PAYMENT_METHODS).map(function(entry) { var k = entry[0]; var v = entry[1]; return <option key={k} value={k}>{v.name}</option>; })}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Référence</label>
                      <input style={inputStyle} value={paymentData.reference_number} onChange={function(e) { setPaymentData(function(d) { return Object.assign({}, d, { reference_number: e.target.value }); }); }} placeholder="N° transaction" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button type="submit" disabled={!paymentData.amount_mga} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #0D7A87, #13A3B4)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                        <CheckCircle size={14} />Enregistrer
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Historique des paiements</p>
              {invoicePayments.length === 0 ? (
                <p style={{ color: '#94A3B8', textAlign: 'center', padding: '16px 0', fontSize: 13 }}>Aucun paiement</p>
              ) : invoicePayments.map(function(payment) {
                var MethodIcon = (PAYMENT_METHODS[payment.payment_method] && PAYMENT_METHODS[payment.payment_method].icon) || CreditCard;
                return (
                  <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, marginBottom: 6, border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <MethodIcon size={18} style={{ color: '#64748B' }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{(PAYMENT_METHODS[payment.payment_method] && PAYMENT_METHODS[payment.payment_method].name) || payment.payment_method}</p>
                        <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{formatDate(payment.payment_date)}{payment.reference_number ? ' · ' + payment.reference_number : ''}</p>
                      </div>
                    </div>
                    <span style={{ fontWeight: 800, color: '#0EA570' }}>+{formatCurrency(payment.amount_mga)}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="outline" size="sm" onClick={function() { handleDownloadPDF(selectedInvoice.id, selectedInvoice.invoice_number); }}><Download className="h-4 w-4 mr-1" />PDF</Button>
                <Button variant="outline" size="sm" onClick={function() { handleShare(selectedInvoice); }}><Share2 className="h-4 w-4 mr-1" />Partager</Button>
                <Button variant="outline" size="sm" onClick={function() { handlePrint(selectedInvoice.id); }}><Printer className="h-4 w-4 mr-1" />Imprimer</Button>
              </div>
              <button onClick={closePaymentModal} style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#475569' }}>Fermer</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InvoiceManagement;
