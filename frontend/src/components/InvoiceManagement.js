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
  Minus
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const InvoiceManagement = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [formData, setFormData] = useState({
    patient_id: '',
    items: [{
      description: '',
      quantity: 1,
      unit_price_mga: '',
      total_mga: 0
    }],
    discount_percentage: 0,
    notes: '',
    payment_method: ''
  });

  const paymentMethods = {
    cash: 'Espèces',
    bank_transfer: 'Virement bancaire',
    cheque: 'Chèque',
    mvola: 'Mvola',
    orange_money: 'Orange Money',
    airtel_money: 'Airtel Money'
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
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API}/invoices`);
      setInvoices(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des factures');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await axios.get(`${API}/patients`);
      setPatients(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des patients');
    }
  };

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
        quantity: 1,
        unit_price_mga: '',
        total_mga: 0
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
    try {
      const invoiceData = {
        patient_id: formData.patient_id,
        date_issued: new Date().toISOString().split('T')[0],
        items: formData.items.map(item => ({
          ...item,
          unit_price_mga: parseFloat(item.unit_price_mga),
          total_mga: calculateItemTotal(item)
        })),
        subtotal_mga: calculateSubtotal(),
        discount_percentage: formData.discount_percentage,
        discount_amount_mga: (calculateSubtotal() * formData.discount_percentage) / 100,
        total_mga: calculateTotal(),
        payment_status: 'pending',
        payment_method: formData.payment_method || null,
        notes: formData.notes
      };

      await axios.post(`${API}/invoices`, invoiceData);
      toast.success('Facture créée avec succès');
      await fetchInvoices();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast.error('Erreur lors de la création de la facture');
    }
  };

  const resetForm = () => {
    setFormData({
      patient_id: '',
      items: [{
        description: '',
        quantity: 1,
        unit_price_mga: '',
        total_mga: 0
      }],
      discount_percentage: 0,
      notes: '',
      payment_method: ''
    });
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
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-300 h-20 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Receipt className="h-8 w-8 mr-3 text-blue-600" />
            Gestion des Factures
          </h1>
          <p className="text-gray-600 mt-1">
            {invoices.length} factures enregistrées
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Facture
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouvelle Facture</DialogTitle>
              <DialogDescription>
                Créez une nouvelle facture pour un patient
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Patient Selection */}
              <div className="space-y-2">
                <Label htmlFor="patient_id">Patient *</Label>
                <Select value={formData.patient_id} onValueChange={(value) => setFormData({...formData, patient_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={!formData.patient_id || formData.items.some(item => !item.description || !item.unit_price_mga)}>
                  Créer la facture
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher une facture..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Invoices List */}
      <div className="grid gap-4">
        {filteredInvoices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Receipt className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {searchTerm ? 'Aucune facture trouvée' : 'Aucune facture créée'}
              </h3>
              <p className="text-gray-500 text-center">
                {searchTerm 
                  ? 'Essayez avec d\'autres termes de recherche'
                  : 'Commencez par créer votre première facture'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredInvoices.map((invoice) => {
            const StatusIcon = paymentStatuses[invoice.payment_status]?.icon || Clock;
            return (
              <Card key={invoice.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-100 p-3 rounded-full">
                        <Receipt className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {invoice.invoice_number}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            {getPatientName(invoice.patient_id)}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(invoice.date_issued).toLocaleDateString('fr-FR')}
                          </span>
                          <span className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {formatCurrency(invoice.total_mga)}
                          </span>
                        </div>
                        {invoice.payment_method && (
                          <div className="flex items-center mt-2">
                            <CreditCard className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-sm text-gray-600">
                              {paymentMethods[invoice.payment_method]}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Badge className={paymentStatuses[invoice.payment_status]?.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {paymentStatuses[invoice.payment_status]?.name}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Voir
                      </Button>
                      <Button variant="outline" size="sm">
                        <Printer className="h-4 w-4 mr-2" />
                        Imprimer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default InvoiceManagement;