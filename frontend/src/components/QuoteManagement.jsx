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
  FileText, 
  Plus, 
  Search, 
  Eye, 
  Printer,
  DollarSign,
  Calendar,
  User,
  Share2,
  Download,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Minus,
  X
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
  const [formData, setFormData] = useState({
    patient_id: '',
    schedule_id: '',
    items: [{ description: '', quantity: 1, unit_price_mga: '', tooth_number: '' }],
    discount_percentage: 0,
    validity_days: 30,
    notes: ''
  });

  const quoteStatuses = {
    DRAFT: { name: 'Brouillon', color: 'bg-gray-100 text-gray-800', icon: Clock },
    SENT: { name: 'Envoyé', color: 'bg-blue-100 text-blue-800', icon: FileText },
    ACCEPTED: { name: 'Accepté', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    REJECTED: { name: 'Refusé', color: 'bg-red-100 text-red-800', icon: XCircle },
    EXPIRED: { name: 'Expiré', color: 'bg-amber-100 text-amber-800', icon: AlertCircle },
    CONVERTED: { name: 'Converti', color: 'bg-purple-100 text-purple-800', icon: ArrowRight }
  };

  useEffect(() => {
    fetchQuotes();
    fetchPatients();
    fetchPricingSchedules();
  }, []);

  const fetchQuotes = async () => {
    try {
      const response = await axios.get(`${API}/quotes`);
      setQuotes(response.data.quotes || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des devis');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await axios.get(`${API}/patients`);
      setPatients(response.data.patients || []);
    } catch (error) {
      console.error('Erreur patients');
    }
  };

  const fetchPricingSchedules = async () => {
    try {
      const response = await axios.get(`${API}/pricing-schedules`);
      setPricingSchedules(response.data.schedules || []);
    } catch (error) {
      console.error('Erreur tarifs');
    }
  };

  const fetchProcedureFees = async (scheduleId) => {
    try {
      const response = await axios.get(`${API}/pricing-schedules/${scheduleId}/fees`);
      setProcedureFees(response.data.fees || []);
    } catch (error) {
      console.error('Erreur actes');
    }
  };

  const handleScheduleChange = (scheduleId) => {
    setFormData({ ...formData, schedule_id: scheduleId });
    fetchProcedureFees(scheduleId);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unit_price_mga: '', tooth_number: '' }]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index)
      });
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const selectProcedure = (index, fee) => {
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      description: `${fee.procedure_code} - ${fee.label}`,
      unit_price_mga: fee.price_mga
    };
    setFormData({ ...formData, items: newItems });
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * (parseFloat(item.unit_price_mga) || 0)), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal - (subtotal * formData.discount_percentage / 100);
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('fr-MG').format(amount) + ' Ar';

  const resetForm = () => {
    setFormData({
      patient_id: '',
      schedule_id: '',
      items: [{ description: '', quantity: 1, unit_price_mga: '', tooth_number: '' }],
      discount_percentage: 0,
      validity_days: 30,
      notes: ''
    });
    setProcedureFees([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la création');
    }
  };

  const handleConvert = async (quote) => {
    if (!confirm(`Convertir le devis ${quote.invoice_number} en facture ?`)) return;
    try {
      const response = await axios.post(`${API}/quotes/${quote.id}/convert`);
      toast.success(`Facture ${response.data.invoice.invoice_number} créée`);
      fetchQuotes();
      setIsDetailOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la conversion');
    }
  };

  const handleStatusChange = async (quote, newStatus) => {
    try {
      await axios.patch(`${API}/quotes/${quote.id}/status`, { status: newStatus });
      toast.success('Statut mis à jour');
      fetchQuotes();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur');
    }
  };

  const handlePrint = (quoteId) => {
    window.open(`${API}/quotes/${quoteId}/print`, '_blank');
  };

  // Download quote PDF
  const handleDownloadPDF = async (quoteId, quoteNumber) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/quotes/${quoteId}/pdf`, {
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
      a.download = `${quoteNumber || 'devis'}.pdf`;
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

  const handleShare = async (quote) => {
    const shareUrl = `${API}/quotes/${quote.id}/print`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Devis ${quote.invoice_number}`,
          text: `Devis ${quote.invoice_number} - ${formatCurrency(quote.total_mga)}`,
          url: shareUrl
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          await navigator.clipboard.writeText(shareUrl);
          toast.success('Lien copié!');
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Lien copié!');
    }
  };

  const getPatientName = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    return patient ? `${patient.first_name} ${patient.last_name}` : 'Patient inconnu';
  };

  const filteredQuotes = quotes.filter(quote => 
    quote.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getPatientName(quote.patient_id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div></div>;
  }

  return (
    <div className="space-y-6" data-testid="quote-management">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Devis</h1>
          <p className="text-gray-600 mt-1">Gérez vos devis et convertissez-les en factures</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} data-testid="new-quote-btn">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Devis
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer un nouveau devis</DialogTitle>
              <DialogDescription>Établissez un devis pour un patient</DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Patient *</Label>
                  <Select value={formData.patient_id} onValueChange={(v) => setFormData({...formData, patient_id: v})}>
                    <SelectTrigger data-testid="patient-select">
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
                
                <div className="space-y-2">
                  <Label>Grille Tarifaire *</Label>
                  <Select value={formData.schedule_id} onValueChange={handleScheduleChange}>
                    <SelectTrigger data-testid="schedule-select">
                      <SelectValue placeholder="Sélectionnez une tarification" />
                    </SelectTrigger>
                    <SelectContent>
                      {pricingSchedules.map((schedule) => (
                        <SelectItem key={schedule.id} value={schedule.id}>
                          <Badge variant={schedule.type === 'SYNDICAL' ? 'default' : 'secondary'} className="mr-2">
                            {schedule.type}
                          </Badge>
                          {schedule.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Actes / Prestations</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" /> Ajouter
                  </Button>
                </div>
                
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-lg">
                    <div className="col-span-5">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
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
                    <div className="col-span-2">
                      <Label className="text-xs">Dent</Label>
                      <Input
                        value={item.tooth_number || ''}
                        onChange={(e) => updateItem(index, 'tooth_number', e.target.value)}
                        placeholder="Ex: 11"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs">Qté</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Prix (MGA)</Label>
                      <Input
                        type="number"
                        value={item.unit_price_mga}
                        onChange={(e) => updateItem(index, 'unit_price_mga', e.target.value)}
                        placeholder="Prix unitaire"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={formData.items.length === 1}>
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Remise (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({...formData, discount_percentage: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Validité (jours)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.validity_days}
                    onChange={(e) => setFormData({...formData, validity_days: parseInt(e.target.value) || 30})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Notes..."
                  />
                </div>
              </div>

              {/* Totals */}
              <Card className="bg-green-50">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between"><span>Sous-total:</span><span className="font-semibold">{formatCurrency(calculateSubtotal())}</span></div>
                    {formData.discount_percentage > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Remise ({formData.discount_percentage}%):</span>
                        <span>-{formatCurrency(calculateSubtotal() * formData.discount_percentage / 100)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total:</span><span>{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={!formData.patient_id || formData.items.some(item => !item.description || !item.unit_price_mga)}>
                  Créer le devis
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
            placeholder="Rechercher un devis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Quotes List */}
      <div className="grid gap-4">
        {filteredQuotes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {searchTerm ? 'Aucun devis trouvé' : 'Aucun devis créé'}
              </h3>
              <p className="text-gray-500 text-center">
                {searchTerm ? 'Essayez avec d\'autres termes' : 'Commencez par créer votre premier devis'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredQuotes.map((quote) => {
            const StatusIcon = quoteStatuses[quote.status]?.icon || Clock;
            return (
              <Card key={quote.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-green-100 p-3 rounded-full">
                        <FileText className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{quote.invoice_number}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            {quote.patient ? `${quote.patient.first_name} ${quote.patient.last_name}` : getPatientName(quote.patient_id)}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(quote.invoice_date).toLocaleDateString('fr-FR')}
                          </span>
                          <span className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {formatCurrency(quote.total_mga)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Badge className={quoteStatuses[quote.status]?.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {quoteStatuses[quote.status]?.name || quote.status}
                      </Badge>
                      
                      {quote.status !== 'CONVERTED' && quote.status !== 'EXPIRED' && (
                        <Button variant="default" size="sm" onClick={() => handleConvert(quote)} data-testid={`convert-${quote.invoice_number}`}>
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Convertir
                        </Button>
                      )}
                      
                      <Button variant="outline" size="sm" onClick={() => { setSelectedQuote(quote); setIsDetailOpen(true); }}>
                        <Eye className="h-4 w-4 mr-2" />
                        Voir
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(quote.id, quote.invoice_number)} data-testid={`pdf-${quote.invoice_number}`}>
                        <Download className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleShare(quote)}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Partager
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handlePrint(quote.id)}>
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

      {/* Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Devis {selectedQuote?.invoice_number}
            </DialogTitle>
          </DialogHeader>
          
          {selectedQuote && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="text-xl font-bold">{formatCurrency(selectedQuote.total_mga)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-gray-500">Validité</p>
                    <p className="text-xl font-bold">{selectedQuote.validity_days || 30} jours</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-gray-500">Statut</p>
                    <Badge className={quoteStatuses[selectedQuote.status]?.color}>
                      {quoteStatuses[selectedQuote.status]?.name}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Items */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Prestations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedQuote.items?.map((item, i) => (
                      <div key={i} className="flex justify-between p-2 bg-gray-50 rounded">
                        <span>{item.description}{item.tooth_number ? ` (Dent ${item.tooth_number})` : ''}</span>
                        <span className="font-medium">{item.quantity} x {formatCurrency(item.unit_price_mga)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-between pt-4 border-t">
                <div className="flex gap-2">
                  {selectedQuote.status === 'DRAFT' && (
                    <Button variant="outline" onClick={() => handleStatusChange(selectedQuote, 'SENT')}>
                      Marquer Envoyé
                    </Button>
                  )}
                  {['DRAFT', 'SENT'].includes(selectedQuote.status) && (
                    <Button variant="outline" onClick={() => handleStatusChange(selectedQuote, 'ACCEPTED')}>
                      Marquer Accepté
                    </Button>
                  )}
                  {selectedQuote.status !== 'CONVERTED' && selectedQuote.status !== 'EXPIRED' && (
                    <Button onClick={() => handleConvert(selectedQuote)}>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Convertir en Facture
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleDownloadPDF(selectedQuote.id, selectedQuote.invoice_number)} data-testid="detail-pdf-btn">
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                  <Button variant="outline" onClick={() => handlePrint(selectedQuote.id)}>
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimer
                  </Button>
                  <Button variant="ghost" onClick={() => setIsDetailOpen(false)}>Fermer</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuoteManagement;
