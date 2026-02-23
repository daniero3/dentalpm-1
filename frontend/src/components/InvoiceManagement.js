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
  Receipt, 
  Plus, 
  Search, 
  Eye, 
  Printer,
  DollarSign,
  Calendar,
  User,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  Minus,
  AlertTriangle,
  Shield,
  Wallet,
  Share2,
  Download,
  Copy,
  X,
  Banknote,
  Smartphone
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const InvoiceManagement = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [pricingSchedules, setPricingSchedules] = useState([]);
  const [procedureFees, setProcedureFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [procedureSearch, setProcedureSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [formData, setFormData] = useState({
    patient_id: '',
    schedule_id: '',
    items: [{
      description: '',
      procedure_code: '',
      quantity: 1,
      unit_price_mga: '',
      total_mga: 0,
      tooth_number: ''
    }],
    discount_percentage: 0,
    notes: '',
    payment_method: ''
  });
  const [scheduleOverride, setScheduleOverride] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [invoicePayments, setInvoicePayments] = useState([]);
  const [paymentData, setPaymentData] = useState({
    amount_mga: '',
    payment_method: 'CASH',
    reference_number: ''
  });
  const [invoicePaymentStats, setInvoicePaymentStats] = useState({
    total_mga: 0,
    paid_total_mga: 0,
    balance_mga: 0,
    payment_status: 'UNPAID'
  });

  const paymentMethods = {
    CASH: { name: 'Espèces', icon: Banknote },
    BANK_TRANSFER: { name: 'Virement bancaire', icon: CreditCard },
    CHEQUE: { name: 'Chèque', icon: Receipt },
    MVOLA: { name: 'Mvola', icon: Smartphone },
    ORANGE_MONEY: { name: 'Orange Money', icon: Smartphone },
    AIRTEL_MONEY: { name: 'Airtel Money', icon: Smartphone },
    CARD: { name: 'Carte bancaire', icon: CreditCard }
  };

  const paymentStatuses = {
    pending: { name: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    paid: { name: 'Payé', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    partial: { name: 'Partiel', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
    overdue: { name: 'En retard', color: 'bg-red-100 text-red-800', icon: AlertCircle }
  };

  const discountPresets = {
    syndical: { name: 'Syndical (-15%)', percentage: 15 },
    humanitarian: { name: 'Humanitaire/Rural (-20%)', percentage: 20 },
    long_term: { name: 'Engagement long terme (-10%)', percentage: 10 }
  };

  useEffect(() => {
    fetchInvoices();
    fetchPatients();
    fetchPricingSchedules();
  }, []);

  const fetchInvoices = async (status = null) => {
    try {
      const params = {};
      if (status && status !== 'ALL') {
        params.status = status;
      }
      const response = await axios.get(`${API}/invoices`, { params });
      setInvoices(response.data.invoices || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des factures');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await axios.get(`${API}/patients`);
      setPatients(response.data.patients || []);
    } catch (error) {
      console.error('Erreur lors du chargement des patients');
    }
  };

  const fetchPricingSchedules = async () => {
    try {
      const response = await axios.get(`${API}/pricing-schedules`);
      setPricingSchedules(response.data.schedules || []);
    } catch (error) {
      console.error('Erreur lors du chargement des grilles tarifaires');
    }
  };

  const fetchProcedureFees = async (scheduleId) => {
    try {
      const response = await axios.get(`${API}/pricing-schedules/${scheduleId}/fees`);
      setProcedureFees(response.data.fees || []);
    } catch (error) {
      console.error('Erreur lors du chargement des actes');
    }
  };

  // Fetch payments for an invoice
  const fetchInvoicePayments = async (invoiceId) => {
    try {
      const response = await axios.get(`${API}/invoices/${invoiceId}/payments`);
      setInvoicePayments(response.data.payments || []);
      setInvoicePaymentStats({
        total_mga: response.data.total_mga,
        paid_total_mga: response.data.paid_total_mga,
        balance_mga: response.data.balance_mga,
        payment_status: response.data.payment_status
      });
    } catch (error) {
      console.error('Erreur lors du chargement des paiements');
    }
  };

  // Open invoice detail/payment modal
  const openPaymentModal = async (invoice) => {
    setSelectedInvoice(invoice);
    await fetchInvoicePayments(invoice.id);
    setPaymentData({ amount_mga: '', payment_method: 'CASH', reference_number: '' });
    setIsPaymentModalOpen(true);
  };

  // Submit payment
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice || !paymentData.amount_mga) return;
    
    try {
      const response = await axios.post(`${API}/invoices/${selectedInvoice.id}/payments`, {
        amount_mga: parseFloat(paymentData.amount_mga),
        payment_method: paymentData.payment_method,
        reference_number: paymentData.reference_number || null
      });
      
      toast.success('Paiement enregistré');
      setPaymentData({ amount_mga: '', payment_method: 'CASH', reference_number: '' });
      await fetchInvoicePayments(selectedInvoice.id);
      fetchInvoices(); // Refresh invoice list
    } catch (error) {
      if (error.response?.data?.error === 'OVERPAYMENT_NOT_ALLOWED') {
        toast.error(`Montant maximum: ${formatCurrency(error.response.data.balance_mga)}`);
      } else {
        toast.error(error.response?.data?.message || 'Erreur lors du paiement');
      }
    }
  };

  // Print invoice
  const handlePrint = (invoiceId) => {
    const printUrl = `${API}/invoices/${invoiceId}/print`;
    const printWindow = window.open(printUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => printWindow.print();
    }
  };

  // Share invoice
  const handleShare = async (invoice) => {
    const shareUrl = `${API}/invoices/${invoice.id}/print`;
    const shareData = {
      title: `Facture ${invoice.invoice_number}`,
      text: `Facture ${invoice.invoice_number} - ${formatCurrency(invoice.total_mga)}`,
      url: shareUrl
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('Partagé!');
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopyLink(shareUrl);
        }
      }
    } else {
      handleCopyLink(shareUrl);
    }
  };

  // Copy link
  const handleCopyLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Lien copié!');
    } catch (err) {
      toast.error('Impossible de copier le lien');
    }
  };

  // Download invoice PDF
  const handleDownloadPDF = async (invoiceId, invoiceNumber) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/invoices/${invoiceId}/pdf`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        toast.error(`Erreur PDF: ${response.status} - ${errorText}`);
        return;
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${invoiceNumber || 'facture'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('PDF téléchargé');
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Erreur téléchargement PDF');
    }
  };

  // Download invoice (legacy HTML)
  const handleDownload = (invoiceId) => {
    window.open(`${API}/invoices/${invoiceId}/print`, '_blank');
  };

  // When schedule changes, load fees
  const handleScheduleChange = (scheduleId) => {
    setFormData({ ...formData, schedule_id: scheduleId });
    if (scheduleId) {
      fetchProcedureFees(scheduleId);
    } else {
      setProcedureFees([]);
    }
  };

  // When patient changes, auto-select schedule based on payer_type
  const handlePatientChange = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    setSelectedPatient(patient);
    setFormData({ ...formData, patient_id: patientId });
    setScheduleOverride(false);
    
    if (patient && pricingSchedules.length > 0) {
      const defaultType = patient.payer_type === 'INSURED' ? 'SYNDICAL' : 'CABINET';
      const defaultSchedule = pricingSchedules.find(s => s.type === defaultType);
      if (defaultSchedule) {
        handleScheduleChange(defaultSchedule.id);
      }
    }
  };

  // When schedule is manually changed (override)
  const handleManualScheduleChange = (scheduleId) => {
    const newSchedule = pricingSchedules.find(s => s.id === scheduleId);
    const expectedType = selectedPatient?.payer_type === 'INSURED' ? 'SYNDICAL' : 'CABINET';
    
    if (newSchedule && newSchedule.type !== expectedType) {
      setScheduleOverride(true);
    } else {
      setScheduleOverride(false);
    }
    handleScheduleChange(scheduleId);
  };

  // Add procedure from fees list
  const addProcedureFromFee = (fee) => {
    const newItem = {
      description: fee.label,
      procedure_code: fee.procedure_code,
      quantity: 1,
      unit_price_mga: fee.price_mga,
      total_mga: fee.price_mga,
      tooth_number: ''
    };
    setFormData({
      ...formData,
      items: [...formData.items.filter(i => i.description !== ''), newItem]
    });
    setProcedureSearch('');
  };

  // Handle status filter change
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setLoading(true);
    fetchInvoices(status);
  };

  // Filter procedures by search
  const filteredProcedures = procedureFees.filter(fee =>
    fee.procedure_code.toLowerCase().includes(procedureSearch.toLowerCase()) ||
    fee.label.toLowerCase().includes(procedureSearch.toLowerCase()) ||
    fee.category.toLowerCase().includes(procedureSearch.toLowerCase())
  ).slice(0, 10);

  const calculateItemTotal = (item) => {
    return item.quantity * (parseFloat(item.unit_price_mga) || 0);
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = (subtotal * formData.discount_percentage) / 100;
    return subtotal - discountAmount;
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        description: '',
        procedure_code: '',
        quantity: 1,
        unit_price_mga: '',
        total_mga: 0,
        tooth_number: ''
      }]
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'quantity' || field === 'unit_price_mga') {
      newItems[index].total_mga = calculateItemTotal(newItems[index]);
    }
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.schedule_id) {
      toast.error('Veuillez sélectionner une grille tarifaire');
      return;
    }
    
    try {
      const invoiceData = {
        patient_id: formData.patient_id,
        schedule_id: formData.schedule_id,
        date_issued: new Date().toISOString().split('T')[0],
        items: formData.items.filter(i => i.description).map(item => ({
          description: item.description,
          procedure_code: item.procedure_code,
          quantity: parseInt(item.quantity),
          unit_price_mga: parseFloat(item.unit_price_mga),
          tooth_number: item.tooth_number || null
        })),
        discount_percentage: formData.discount_percentage,
        payment_method: formData.payment_method || null,
        notes: formData.notes
      };

      await axios.post(`${API}/invoices`, invoiceData);
      toast.success('Facture créée avec succès');
      await fetchInvoices();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la création de la facture');
    }
  };

  const resetForm = () => {
    setFormData({
      patient_id: '',
      schedule_id: '',
      items: [{
        description: '',
        procedure_code: '',
        quantity: 1,
        unit_price_mga: '',
        total_mga: 0,
        tooth_number: ''
      }],
      discount_percentage: 0,
      notes: '',
      payment_method: ''
    });
    setProcedureFees([]);
    setProcedureSearch('');
    setSelectedPatient(null);
    setScheduleOverride(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Patient inconnu';
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getPatientName(invoice.patient_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded-lg w-1/4 mb-6"></div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-100 h-20 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header Card */}
      <Card className="bg-white border border-gray-100 shadow-sm rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#0F7E8A]/10 rounded-xl">
                <Receipt className="h-7 w-7 text-[#0F7E8A]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
                <p className="text-gray-500 text-sm mt-0.5">
                  {invoices.length} facture{invoices.length > 1 ? 's' : ''} enregistrée{invoices.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={resetForm} 
                  className="bg-[#0F7E8A] hover:bg-[#0a6872] text-white rounded-lg shadow-md"
                  data-testid="new-invoice-btn"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle Facture
                </Button>
              </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-xl">Nouvelle Facture</DialogTitle>
              <DialogDescription>
                Créez une nouvelle facture pour un patient
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Patient Selection */}
              <div className="space-y-2">
                <Label htmlFor="patient_id">Patient *</Label>
                <Select value={formData.patient_id} onValueChange={handlePatientChange}>
                  <SelectTrigger data-testid="patient-select">
                    <SelectValue placeholder="Sélectionnez un patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        <div className="flex items-center gap-2">
                          {patient.first_name} {patient.last_name}
                          {patient.payer_type === 'INSURED' ? (
                            <Badge variant="default" className="bg-blue-600"><Shield className="h-3 w-3 mr-1" />Assuré</Badge>
                          ) : (
                            <Badge variant="outline"><Wallet className="h-3 w-3 mr-1" />Non assuré</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPatient && (
                  <div className={`text-sm p-2 rounded ${selectedPatient.payer_type === 'INSURED' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'}`}>
                    {selectedPatient.payer_type === 'INSURED' ? (
                      <span className="flex items-center gap-1"><Shield className="h-4 w-4" /> Patient assuré → Grille SYNDICAL recommandée</span>
                    ) : (
                      <span className="flex items-center gap-1"><Wallet className="h-4 w-4" /> Patient non assuré → Grille CABINET recommandée</span>
                    )}
                  </div>
                )}
              </div>

              {/* Pricing Schedule Selection */}
              <div className="space-y-2">
                <Label htmlFor="schedule_id">Grille Tarifaire *</Label>
                <Select value={formData.schedule_id} onValueChange={handleManualScheduleChange}>
                  <SelectTrigger data-testid="schedule-select">
                    <SelectValue placeholder="Sélectionnez une tarification" />
                  </SelectTrigger>
                  <SelectContent>
                    {pricingSchedules.map((schedule) => (
                      <SelectItem key={schedule.id} value={schedule.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant={schedule.type === 'SYNDICAL' ? 'default' : 'secondary'}>
                            {schedule.type}
                          </Badge>
                          {schedule.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {scheduleOverride && (
                  <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Attention: Vous utilisez une grille différente de celle recommandée pour ce type de patient.</span>
                  </div>
                )}
                <p className="text-sm text-gray-500">
                  {formData.schedule_id && pricingSchedules.find(s => s.id === formData.schedule_id)?.type === 'SYNDICAL' 
                    ? 'Tarifs conventionnés (assurés)' 
                    : 'Tarifs libres du cabinet'}
                </p>
              </div>

              {/* Procedure Search & Add */}
              {formData.schedule_id && (
                <div className="space-y-2">
                  <Label>Ajouter un acte</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher un acte (code, libellé)..."
                      value={procedureSearch}
                      onChange={(e) => setProcedureSearch(e.target.value)}
                      className="pl-10"
                      data-testid="procedure-search"
                    />
                  </div>
                  {procedureSearch && filteredProcedures.length > 0 && (
                    <div className="border rounded-lg max-h-48 overflow-y-auto bg-white shadow-lg">
                      {filteredProcedures.map((fee) => (
                        <button
                          key={fee.id}
                          type="button"
                          onClick={() => addProcedureFromFee(fee)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 flex justify-between items-center border-b last:border-0"
                          data-testid={`procedure-${fee.procedure_code}`}
                        >
                          <div>
                            <span className="font-mono text-sm text-blue-600">{fee.procedure_code}</span>
                            <span className="ml-2">{fee.label}</span>
                            <Badge variant="outline" className="ml-2 text-xs">{fee.category}</Badge>
                          </div>
                          <span className="font-semibold">{formatCurrency(fee.price_mga)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Articles / Services</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un article
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div className="md:col-span-2">
                          <Label htmlFor={`description-${index}`}>Description</Label>
                          <Input
                            id={`description-${index}`}
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder="Ex: Consultation, Obturation..."
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor={`quantity-${index}`}>Quantité</Label>
                          <Input
                            id={`quantity-${index}`}
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor={`unit_price-${index}`}>Prix unitaire (MGA)</Label>
                          <Input
                            id={`unit_price-${index}`}
                            type="number"
                            value={item.unit_price_mga}
                            onChange={(e) => updateItem(index, 'unit_price_mga', e.target.value)}
                            placeholder="50000"
                            required
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1">
                            <Label>Total</Label>
                            <div className="text-lg font-semibold">
                              {formatCurrency(calculateItemTotal(item))}
                            </div>
                          </div>
                          {formData.items.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeItem(index)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Discount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount">Remise (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({...formData, discount_percentage: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Remises prédéfinies</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(discountPresets).map(([key, preset]) => (
                      <Button
                        key={key}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData({...formData, discount_percentage: preset.percentage})}
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="payment_method">Mode de paiement (optionnel)</Label>
                <Select value={formData.payment_method} onValueChange={(value) => setFormData({...formData, payment_method: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez le mode de paiement" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(paymentMethods).map(([key, name]) => (
                      <SelectItem key={key} value={key}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Notes additionnelles..."
                  rows={3}
                />
              </div>

              {/* Total Summary */}
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Sous-total:</span>
                      <span className="font-semibold">{formatCurrency(calculateSubtotal())}</span>
                    </div>
                    {formData.discount_percentage > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Remise ({formData.discount_percentage}%):</span>
                        <span>-{formatCurrency((calculateSubtotal() * formData.discount_percentage) / 100)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-lg">
                  Annuler
                </Button>
                <Button type="submit" disabled={!formData.patient_id || formData.items.some(item => !item.description || !item.unit_price_mga)} className="bg-[#0F7E8A] hover:bg-[#0a6872] rounded-lg">
                  Créer la facture
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters Card */}
      <Card className="bg-white border border-gray-100 shadow-sm rounded-xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher une facture..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 bg-gray-50 border-gray-200 rounded-lg focus:bg-white"
                data-testid="invoice-search"
              />
            </div>
            
            {/* Status Filters */}
            <div className="flex items-center gap-2" data-testid="status-filters">
              <Button
                variant={statusFilter === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilterChange('ALL')}
                className={statusFilter === 'ALL' ? 'bg-[#0F7E8A] hover:bg-[#0a6872] rounded-lg' : 'border-gray-200 rounded-lg'}
                data-testid="filter-all"
              >
                Toutes
              </Button>
              <Button
                variant={statusFilter === 'DRAFT' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilterChange('DRAFT')}
                className={statusFilter === 'DRAFT' ? 'bg-red-600 hover:bg-red-700 rounded-lg' : 'border-gray-200 text-red-600 hover:bg-red-50 rounded-lg'}
                data-testid="filter-unpaid"
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Impayées
              </Button>
              <Button
                variant={statusFilter === 'PARTIAL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilterChange('PARTIAL')}
                className={statusFilter === 'PARTIAL' ? 'bg-amber-600 hover:bg-amber-700 rounded-lg' : 'border-gray-200 text-amber-600 hover:bg-amber-50 rounded-lg'}
                data-testid="filter-partial"
              >
                <Clock className="h-4 w-4 mr-1" />
                Partielles
              </Button>
              <Button
                variant={statusFilter === 'PAID' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleStatusFilterChange('PAID')}
                className={statusFilter === 'PAID' ? 'bg-green-600 hover:bg-green-700 rounded-lg' : 'border-gray-200 text-green-600 hover:bg-green-50 rounded-lg'}
                data-testid="filter-paid"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Payées
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <Card className="bg-white border border-gray-100 shadow-sm rounded-xl">
        <CardContent className="p-0">
          {filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="p-4 bg-gray-100 rounded-full mb-4">
                <Receipt className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-1">
                {searchTerm ? 'Aucune facture trouvée' : 'Aucune facture créée'}
              </h3>
              <p className="text-gray-500 text-sm">
                {searchTerm 
                  ? 'Essayez avec d\'autres termes de recherche'
                  : 'Commencez par créer votre première facture'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredInvoices.map((invoice) => {
                const StatusIcon = paymentStatuses[invoice.payment_status]?.icon || Clock;
                return (
                  <div 
                    key={invoice.id} 
                    className="p-5 hover:bg-gray-50 transition-colors"
                    data-testid={`invoice-${invoice.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#0F7E8A]/10 rounded-xl flex items-center justify-center">
                          <Receipt className="h-6 w-6 text-[#0F7E8A]" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {invoice.invoice_number}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5" />
                              {getPatientName(invoice.patient_id)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(invoice.date_issued).toLocaleDateString('fr-FR')}
                            </span>
                            <span className="flex items-center gap-1 font-medium text-gray-700">
                              <DollarSign className="h-3.5 w-3.5" />
                              {formatCurrency(invoice.total_mga)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge className={paymentStatuses[invoice.payment_status]?.color || paymentStatuses.pending.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {paymentStatuses[invoice.payment_status]?.name || invoice.payment_status}
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openPaymentModal(invoice)} 
                          className="border-gray-200 hover:bg-gray-50 rounded-lg"
                          data-testid={`view-${invoice.invoice_number}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleShare(invoice)} 
                          className="border-gray-200 hover:bg-gray-50 rounded-lg"
                          data-testid={`share-${invoice.invoice_number}`}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handlePrint(invoice.id)} 
                          className="border-gray-200 hover:bg-gray-50 rounded-lg"
                          data-testid={`print-${invoice.invoice_number}`}
                        >
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Facture {selectedInvoice?.invoice_number}
            </DialogTitle>
            <DialogDescription>
              {getPatientName(selectedInvoice?.patient_id)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Payment Summary */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="bg-gray-50">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="text-xl font-bold">{formatCurrency(invoicePaymentStats.total_mga)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-green-600">Payé</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(invoicePaymentStats.paid_total_mga)}</p>
                  </CardContent>
                </Card>
                <Card className={invoicePaymentStats.balance_mga > 0 ? "bg-amber-50" : "bg-green-50"}>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-amber-600">Reste</p>
                    <p className={`text-xl font-bold ${invoicePaymentStats.balance_mga > 0 ? 'text-amber-700' : 'text-green-700'}`}>
                      {formatCurrency(invoicePaymentStats.balance_mga)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-gray-500">Statut</p>
                    <Badge className={
                      invoicePaymentStats.payment_status === 'PAID' ? 'bg-green-100 text-green-800' :
                      invoicePaymentStats.payment_status === 'PARTIAL' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {invoicePaymentStats.payment_status === 'PAID' ? 'Payé' :
                       invoicePaymentStats.payment_status === 'PARTIAL' ? 'Partiel' : 'Impayé'}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Add Payment Form */}
              {invoicePaymentStats.balance_mga > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Ajouter un paiement
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmitPayment} className="grid grid-cols-4 gap-4">
                      <div>
                        <Label>Montant (MGA)</Label>
                        <Input
                          type="number"
                          min="1"
                          max={invoicePaymentStats.balance_mga}
                          value={paymentData.amount_mga}
                          onChange={(e) => setPaymentData({...paymentData, amount_mga: e.target.value})}
                          placeholder={`Max: ${formatCurrency(invoicePaymentStats.balance_mga)}`}
                          data-testid="payment-amount"
                        />
                      </div>
                      <div>
                        <Label>Méthode</Label>
                        <Select value={paymentData.payment_method} onValueChange={(v) => setPaymentData({...paymentData, payment_method: v})}>
                          <SelectTrigger data-testid="payment-method">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(paymentMethods).map(([key, { name }]) => (
                              <SelectItem key={key} value={key}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Référence</Label>
                        <Input
                          value={paymentData.reference_number}
                          onChange={(e) => setPaymentData({...paymentData, reference_number: e.target.value})}
                          placeholder="N° transaction/chèque"
                          data-testid="payment-reference"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button type="submit" disabled={!paymentData.amount_mga} data-testid="submit-payment">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Enregistrer
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Payment History */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Historique des paiements</CardTitle>
                </CardHeader>
                <CardContent>
                  {invoicePayments.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Aucun paiement enregistré</p>
                  ) : (
                    <div className="space-y-2">
                      {invoicePayments.map((payment) => {
                        const MethodIcon = paymentMethods[payment.payment_method]?.icon || CreditCard;
                        return (
                          <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <MethodIcon className="h-5 w-5 text-gray-500" />
                              <div>
                                <p className="font-medium">{paymentMethods[payment.payment_method]?.name || payment.payment_method}</p>
                                <p className="text-sm text-gray-500">
                                  {new Date(payment.payment_date).toLocaleDateString('fr-FR')}
                                  {payment.reference_number && ` • Réf: ${payment.reference_number}`}
                                </p>
                              </div>
                            </div>
                            <span className="font-bold text-green-600">+{formatCurrency(payment.amount_mga)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-between pt-4 border-t">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleDownloadPDF(selectedInvoice.id, selectedInvoice.invoice_number)} data-testid="download-pdf-btn">
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Button variant="outline" onClick={() => handleDownload(selectedInvoice.id)}>
                    <Download className="h-4 w-4 mr-2" />
                    HTML
                  </Button>
                  <Button variant="outline" onClick={() => handleShare(selectedInvoice)}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Partager
                  </Button>
                  <Button variant="outline" onClick={() => handlePrint(selectedInvoice.id)}>
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimer
                  </Button>
                </div>
                <Button variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceManagement;