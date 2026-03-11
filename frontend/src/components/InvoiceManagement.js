import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { 
  Receipt, Plus, Search, Eye, Printer, DollarSign, Calendar, User,
  CreditCard, AlertCircle, CheckCircle, Clock, Minus, AlertTriangle,
  Shield, Wallet, Share2, Download, X, Banknote, Smartphone
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (amount) =>
  new Intl.NumberFormat('fr-MG', {
    style: 'currency', currency: 'MGA',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try { return new Date(dateStr).toLocaleDateString('fr-FR'); }
  catch { return '-'; }
};

// Map API status → display info
const STATUS_MAP = {
  DRAFT:   { name: 'Brouillon', color: 'bg-gray-100 text-gray-700',   icon: Clock },
  PENDING: { name: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  PARTIAL: { name: 'Partiel',   color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  PAID:    { name: 'Payé',      color: 'bg-green-100 text-green-800',   icon: CheckCircle },
  OVERDUE: { name: 'En retard', color: 'bg-red-100 text-red-800',       icon: AlertCircle },
  CANCELLED:{ name: 'Annulé',  color: 'bg-gray-100 text-gray-500',     icon: X },
};

const getStatusInfo = (invoice) => {
  // Try payment_status first, then status
  const key = invoice.payment_status || invoice.status || 'DRAFT';
  return STATUS_MAP[key] || { name: key, color: 'bg-gray-100 text-gray-700', icon: Clock };
};

const PAYMENT_METHODS = {
  CASH:         { name: 'Espèces',         icon: Banknote },
  BANK_TRANSFER:{ name: 'Virement',        icon: CreditCard },
  CHEQUE:       { name: 'Chèque',          icon: Receipt },
  MVOLA:        { name: 'Mvola',           icon: Smartphone },
  ORANGE_MONEY: { name: 'Orange Money',    icon: Smartphone },
  AIRTEL_MONEY: { name: 'Airtel Money',    icon: Smartphone },
  CARD:         { name: 'Carte bancaire',  icon: CreditCard },
};

const DISCOUNT_PRESETS = [
  { name: 'Syndical (-15%)',          percentage: 15 },
  { name: 'Humanitaire (-20%)',       percentage: 20 },
  { name: 'Long terme (-10%)',        percentage: 10 },
];

// ── Component ─────────────────────────────────────────────────────────────────

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

  const [formData, setFormData] = useState({
    patient_id: '', schedule_id: '',
    items: [{ description: '', procedure_code: '', quantity: 1, unit_price_mga: '', tooth_number: '' }],
    discount_percentage: 0, notes: '', payment_method: ''
  });

  // Payment modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [invoicePayments, setInvoicePayments]         = useState([]);
  const [paymentData, setPaymentData] = useState({ amount_mga: '', payment_method: 'CASH', reference_number: '' });
  const [paymentStats, setPaymentStats] = useState({ total_mga: 0, paid_total_mga: 0, balance_mga: 0, payment_status: 'UNPAID' });

  // ── Data fetching ───────────────────────────────────────────────────────────

  useEffect(() => {
    fetchInvoices();
    fetchPatients();
    fetchPricingSchedules();
  }, []);

  const fetchInvoices = async (status = null) => {
    try {
      setLoading(true);
      const params = {};
      if (status && status !== 'ALL') params.status = status;
      const res = await axios.get(`${API}/invoices`, { params });
      // Safely extract array
      const list = Array.isArray(res.data) ? res.data : (res.data?.invoices || []);
      setInvoices(list);
    } catch (err) {
      console.error('fetchInvoices error:', err);
      toast.error('Erreur lors du chargement des factures');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await axios.get(`${API}/patients`);
      setPatients(Array.isArray(res.data) ? res.data : (res.data?.patients || []));
    } catch (err) { console.error('fetchPatients:', err); }
  };

  const fetchPricingSchedules = async () => {
    try {
      const res = await axios.get(`${API}/pricing-schedules`);
      setPricingSchedules(Array.isArray(res.data) ? res.data : (res.data?.schedules || []));
    } catch (err) { console.error('fetchPricingSchedules:', err); }
  };

  const fetchProcedureFees = async (scheduleId) => {
    try {
      const res = await axios.get(`${API}/pricing-schedules/${scheduleId}/fees`);
      setProcedureFees(Array.isArray(res.data) ? res.data : (res.data?.fees || []));
    } catch (err) { console.error('fetchProcedureFees:', err); }
  };

  const fetchInvoicePayments = async (invoiceId) => {
    try {
      const res = await axios.get(`${API}/invoices/${invoiceId}/payments`);
      setInvoicePayments(Array.isArray(res.data?.payments) ? res.data.payments : []);
      setPaymentStats({
        total_mga:       res.data?.total_mga       || 0,
        paid_total_mga:  res.data?.paid_total_mga  || 0,
        balance_mga:     res.data?.balance_mga     || 0,
        payment_status:  res.data?.payment_status  || 'UNPAID',
      });
    } catch (err) {
      console.error('fetchInvoicePayments:', err);
      setInvoicePayments([]);
    }
  };

  // ── Actions ─────────────────────────────────────────────────────────────────

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
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors du paiement');
    }
  };

  const handlePrint   = (id)  => { window.open(`${API}/invoices/${id}/print`, '_blank'); };
  const handleDownload = (id) => { window.open(`${API}/invoices/${id}/print`, '_blank'); };

  const handleDownloadPDF = async (id, number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/invoices/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) { toast.error(`Erreur PDF: ${res.status}`); return; }
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${number || 'facture'}.pdf`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); window.URL.revokeObjectURL(url);
      toast.success('PDF téléchargé');
    } catch (err) { toast.error('Erreur téléchargement PDF'); }
  };

  const handleShare = async (invoice) => {
    const url = `${API}/invoices/${invoice.id}/print`;
    if (navigator.share) {
      try { await navigator.share({ title: `Facture ${invoice.invoice_number}`, url }); return; }
      catch {}
    }
    try { await navigator.clipboard.writeText(url); toast.success('Lien copié!'); }
    catch  { toast.error('Impossible de copier'); }
  };

  // ── Form helpers ────────────────────────────────────────────────────────────

  const handleScheduleChange = (scheduleId) => {
    setFormData(f => ({ ...f, schedule_id: scheduleId }));
    if (scheduleId) fetchProcedureFees(scheduleId);
    else setProcedureFees([]);
  };

  const handlePatientChange = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    setSelectedPatient(patient);
    setFormData(f => ({ ...f, patient_id: patientId }));
    setScheduleOverride(false);
    if (patient && pricingSchedules.length > 0) {
      const type = patient.payer_type === 'INSURED' ? 'SYNDICAL' : 'CABINET';
      const sched = pricingSchedules.find(s => s.type === type);
      if (sched) handleScheduleChange(sched.id);
    }
  };

  const handleManualScheduleChange = (scheduleId) => {
    const sched = pricingSchedules.find(s => s.id === scheduleId);
    const expected = selectedPatient?.payer_type === 'INSURED' ? 'SYNDICAL' : 'CABINET';
    setScheduleOverride(!!sched && sched.type !== expected);
    handleScheduleChange(scheduleId);
  };

  const addProcedureFromFee = (fee) => {
    setFormData(f => ({
      ...f,
      items: [
        ...f.items.filter(i => i.description !== ''),
        { description: fee.label, procedure_code: fee.procedure_code,
          quantity: 1, unit_price_mga: fee.price_mga, tooth_number: '' }
      ]
    }));
    setProcedureSearch('');
  };

  const addItem    = () => setFormData(f => ({ ...f, items: [...f.items, { description: '', procedure_code: '', quantity: 1, unit_price_mga: '', tooth_number: '' }] }));
  const removeItem = (idx) => setFormData(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  const updateItem = (idx, field, value) => {
    setFormData(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...f, items };
    });
  };

  const calcItemTotal  = (item) => (item.quantity || 0) * (parseFloat(item.unit_price_mga) || 0);
  const calcSubtotal   = () => formData.items.reduce((s, i) => s + calcItemTotal(i), 0);
  const calcTotal      = () => { const sub = calcSubtotal(); return sub - (sub * formData.discount_percentage) / 100; };

  const resetForm = () => {
    setFormData({ patient_id: '', schedule_id: '', items: [{ description: '', procedure_code: '', quantity: 1, unit_price_mga: '', tooth_number: '' }], discount_percentage: 0, notes: '', payment_method: '' });
    setProcedureFees([]); setProcedureSearch(''); setSelectedPatient(null); setScheduleOverride(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.schedule_id) { toast.error('Veuillez sélectionner une grille tarifaire'); return; }
    try {
      await axios.post(`${API}/invoices`, {
        patient_id: formData.patient_id,
        schedule_id: formData.schedule_id,
        date_issued: new Date().toISOString().split('T')[0],
        items: formData.items.filter(i => i.description).map(i => ({
          description: i.description, procedure_code: i.procedure_code,
          quantity: parseInt(i.quantity), unit_price_mga: parseFloat(i.unit_price_mga),
          tooth_number: i.tooth_number || null,
        })),
        discount_percentage: formData.discount_percentage,
        payment_method: formData.payment_method || null,
        notes: formData.notes,
      });
      toast.success('Facture créée avec succès');
      await fetchInvoices();
      resetForm();
      setIsDialogOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la création');
    }
  };

  // ── Derived data ────────────────────────────────────────────────────────────

  const getPatientName = (id) => {
    const p = patients.find(p => p.id === id);
    return p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Patient inconnu';
  };

  const filteredProcedures = procedureFees.filter(f =>
    (f.procedure_code || '').toLowerCase().includes(procedureSearch.toLowerCase()) ||
    (f.label || '').toLowerCase().includes(procedureSearch.toLowerCase()) ||
    (f.category || '').toLowerCase().includes(procedureSearch.toLowerCase())
  ).slice(0, 10);

  const filteredInvoices = invoices.filter(inv =>
    (inv.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    getPatientName(inv.patient_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white border border-gray-100 shadow-sm rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-teal-50 rounded-xl">
                <Receipt className="h-7 w-7 text-teal-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
                <p className="text-gray-500 text-sm">{invoices.length} facture{invoices.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-md">
                  <Plus className="h-4 w-4 mr-2" />Nouvelle Facture
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl">
                <DialogHeader>
                  <DialogTitle>Nouvelle Facture</DialogTitle>
                  <DialogDescription>Créez une nouvelle facture pour un patient</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Patient */}
                  <div>
                    <Label>Patient *</Label>
                    <Select value={formData.patient_id} onValueChange={handlePatientChange}>
                      <SelectTrigger><SelectValue placeholder="Sélectionnez un patient" /></SelectTrigger>
                      <SelectContent>
                        {patients.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.first_name} {p.last_name}
                            {p.payer_type === 'INSURED' ? ' (Assuré)' : ' (Non assuré)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Schedule */}
                  <div>
                    <Label>Grille Tarifaire *</Label>
                    <Select value={formData.schedule_id} onValueChange={handleManualScheduleChange}>
                      <SelectTrigger><SelectValue placeholder="Sélectionnez une tarification" /></SelectTrigger>
                      <SelectContent>
                        {pricingSchedules.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name} ({s.type})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {scheduleOverride && (
                      <p className="text-amber-700 text-sm mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />Grille différente de celle recommandée
                      </p>
                    )}
                  </div>

                  {/* Procedure search */}
                  {formData.schedule_id && (
                    <div>
                      <Label>Ajouter un acte</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input placeholder="Rechercher un acte..." value={procedureSearch}
                          onChange={e => setProcedureSearch(e.target.value)} className="pl-10" />
                      </div>
                      {procedureSearch && filteredProcedures.length > 0 && (
                        <div className="border rounded-lg max-h-48 overflow-y-auto bg-white shadow-lg mt-1">
                          {filteredProcedures.map(fee => (
                            <button key={fee.id} type="button" onClick={() => addProcedureFromFee(fee)}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex justify-between items-center border-b last:border-0 text-sm">
                              <span><span className="font-mono text-blue-600">{fee.procedure_code}</span> — {fee.label}</span>
                              <span className="font-semibold">{formatCurrency(fee.price_mga)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Items */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-base font-semibold">Articles</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addItem}>
                        <Plus className="h-4 w-4 mr-1" />Ajouter
                      </Button>
                    </div>
                    {formData.items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-5 gap-3 mb-3 p-3 bg-gray-50 rounded-lg items-end">
                        <div className="col-span-2">
                          <Label className="text-xs">Description *</Label>
                          <Input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Consultation..." required />
                        </div>
                        <div>
                          <Label className="text-xs">Qté</Label>
                          <Input type="number" min="1" value={item.quantity}
                            onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} required />
                        </div>
                        <div>
                          <Label className="text-xs">Prix (MGA) *</Label>
                          <Input type="number" value={item.unit_price_mga}
                            onChange={e => updateItem(idx, 'unit_price_mga', e.target.value)} placeholder="50000" required />
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <Label className="text-xs">Total</Label>
                            <div className="font-semibold text-sm">{formatCurrency(calcItemTotal(item))}</div>
                          </div>
                          {formData.items.length > 1 && (
                            <Button type="button" variant="outline" size="sm" onClick={() => removeItem(idx)}>
                              <Minus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Discount */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Remise (%)</Label>
                      <Input type="number" min="0" max="100" value={formData.discount_percentage}
                        onChange={e => setFormData(f => ({ ...f, discount_percentage: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div>
                      <Label>Remises prédéfinies</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {DISCOUNT_PRESETS.map(p => (
                          <Button key={p.name} type="button" variant="outline" size="sm"
                            onClick={() => setFormData(f => ({ ...f, discount_percentage: p.percentage }))}>
                            {p.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Payment method */}
                  <div>
                    <Label>Mode de paiement (optionnel)</Label>
                    <Select value={formData.payment_method} onValueChange={v => setFormData(f => ({ ...f, payment_method: v }))}>
                      <SelectTrigger><SelectValue placeholder="Sélectionnez" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notes */}
                  <div>
                    <Label>Notes</Label>
                    <Textarea value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} rows={2} />
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-1">
                    <div className="flex justify-between text-sm"><span>Sous-total</span><span>{formatCurrency(calcSubtotal())}</span></div>
                    {formData.discount_percentage > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Remise ({formData.discount_percentage}%)</span>
                        <span>-{formatCurrency(calcSubtotal() * formData.discount_percentage / 100)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base border-t pt-2">
                      <span>Total</span><span>{formatCurrency(calcTotal())}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                    <Button type="submit"
                      disabled={!formData.patient_id || formData.items.some(i => !i.description || !i.unit_price_mga)}
                      className="bg-teal-600 hover:bg-teal-700 text-white">
                      Créer la facture
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Search + Filters */}
      <Card className="bg-white border border-gray-100 shadow-sm rounded-xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Rechercher..." value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['ALL','DRAFT','PARTIAL','PAID'].map(s => (
                <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm"
                  onClick={() => { setStatusFilter(s); fetchInvoices(s !== 'ALL' ? s : null); }}
                  className={statusFilter === s ? 'bg-teal-600 hover:bg-teal-700 text-white' : ''}>
                  {{ ALL:'Toutes', DRAFT:'Brouillon', PARTIAL:'Partiel', PAID:'Payées' }[s]}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="bg-white border border-gray-100 shadow-sm rounded-xl">
        <CardContent className="p-0">
          {filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Receipt className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-lg font-medium">{searchTerm ? 'Aucun résultat' : 'Aucune facture'}</p>
              <p className="text-sm">Créez votre première facture</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredInvoices.map(invoice => {
                const statusInfo = getStatusInfo(invoice);
                const StatusIcon = statusInfo.icon;
                const invoiceDate = invoice.invoice_date || invoice.date_issued || invoice.created_at;
                return (
                  <div key={invoice.id} className="p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                          <Receipt className="h-6 w-6 text-teal-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{invoice.invoice_number || '-'}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5" />
                              {getPatientName(invoice.patient_id)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(invoiceDate)}
                            </span>
                            <span className="flex items-center gap-1 font-medium text-gray-700">
                              <DollarSign className="h-3.5 w-3.5" />
                              {formatCurrency(invoice.total_mga)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${statusInfo.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.name}
                        </span>
                        <Button variant="outline" size="sm" onClick={() => openPaymentModal(invoice)} className="rounded-lg">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleShare(invoice)} className="rounded-lg">
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handlePrint(invoice.id)} className="rounded-lg">
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-teal-600" />
              Facture {selectedInvoice?.invoice_number}
            </DialogTitle>
            <DialogDescription>{getPatientName(selectedInvoice?.patient_id)}</DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-5">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total',  value: paymentStats.total_mga,      cls: 'bg-gray-50' },
                  { label: 'Payé',   value: paymentStats.paid_total_mga, cls: 'bg-green-50' },
                  { label: 'Reste',  value: paymentStats.balance_mga,    cls: paymentStats.balance_mga > 0 ? 'bg-amber-50' : 'bg-green-50' },
                ].map(({ label, value, cls }) => (
                  <div key={label} className={`${cls} rounded-xl p-4 text-center`}>
                    <p className="text-xs text-gray-500 mb-1">{label}</p>
                    <p className="text-lg font-bold">{formatCurrency(value)}</p>
                  </div>
                ))}
              </div>

              {/* Add payment */}
              {paymentStats.balance_mga > 0 && (
                <div className="border rounded-xl p-4">
                  <p className="font-semibold text-sm mb-3">Ajouter un paiement</p>
                  <form onSubmit={handleSubmitPayment} className="grid grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs">Montant (MGA)</Label>
                      <Input type="number" min="1" max={paymentStats.balance_mga}
                        value={paymentData.amount_mga}
                        onChange={e => setPaymentData(d => ({ ...d, amount_mga: e.target.value }))}
                        placeholder={`Max ${formatCurrency(paymentStats.balance_mga)}`} />
                    </div>
                    <div>
                      <Label className="text-xs">Méthode</Label>
                      <Select value={paymentData.payment_method}
                        onValueChange={v => setPaymentData(d => ({ ...d, payment_method: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Référence</Label>
                      <Input value={paymentData.reference_number}
                        onChange={e => setPaymentData(d => ({ ...d, reference_number: e.target.value }))}
                        placeholder="N° transaction" />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" disabled={!paymentData.amount_mga}
                        className="bg-teal-600 hover:bg-teal-700 text-white w-full">
                        <CheckCircle className="h-4 w-4 mr-1" />Enregistrer
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* History */}
              <div className="border rounded-xl p-4">
                <p className="font-semibold text-sm mb-3">Historique des paiements</p>
                {invoicePayments.length === 0 ? (
                  <p className="text-gray-400 text-center py-4 text-sm">Aucun paiement enregistré</p>
                ) : (
                  <div className="space-y-2">
                    {invoicePayments.map(payment => {
                      const MethodIcon = PAYMENT_METHODS[payment.payment_method]?.icon || CreditCard;
                      return (
                        <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <MethodIcon className="h-5 w-5 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium">{PAYMENT_METHODS[payment.payment_method]?.name || payment.payment_method}</p>
                              <p className="text-xs text-gray-500">{formatDate(payment.payment_date)}{payment.reference_number ? ` · ${payment.reference_number}` : ''}</p>
                            </div>
                          </div>
                          <span className="font-bold text-green-600">+{formatCurrency(payment.amount_mga)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-3 border-t">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(selectedInvoice.id, selectedInvoice.invoice_number)}>
                    <Download className="h-4 w-4 mr-1" />PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleShare(selectedInvoice)}>
                    <Share2 className="h-4 w-4 mr-1" />Partager
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handlePrint(selectedInvoice.id)}>
                    <Printer className="h-4 w-4 mr-1" />Imprimer
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsPaymentModalOpen(false)}>Fermer</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceManagement;
