import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { 
  FlaskConical, Plus, Printer, RefreshCw, Loader2, Search, 
  Clock, CheckCircle, XCircle, Truck, ArrowRight
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WORK_TYPES = {
  CROWN: 'Couronne',
  BRIDGE: 'Bridge',
  PARTIAL_DENTURE: 'Prothèse partielle',
  COMPLETE_DENTURE: 'Prothèse complète',
  IMPLANT_CROWN: 'Couronne sur implant',
  ORTHODONTIC_APPLIANCE: 'Appareil orthodontique',
  NIGHT_GUARD: 'Gouttière',
  VENEER: 'Facette',
  INLAY_ONLAY: 'Inlay/Onlay',
  OTHER: 'Autre'
};

const STATUS_CONFIG = {
  CREATED: { label: 'Créée', color: 'bg-gray-200 text-gray-700', icon: Clock },
  SENT: { label: 'Envoyée', color: 'bg-blue-100 text-blue-700', icon: ArrowRight },
  IN_PROGRESS: { label: 'En cours', color: 'bg-yellow-100 text-yellow-700', icon: RefreshCw },
  DELIVERED: { label: 'Livrée', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  CANCELLED: { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: XCircle }
};

const LabManagement = () => {
  const [orders, setOrders] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [orderForm, setOrderForm] = useState({
    patient_id: '', work_type: 'CROWN', due_date: '', lab_name: '',
    shade: '', lab_cost_mga: '', notes: ''
  });

  useEffect(() => {
    fetchOrders();
    fetchPatients();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API}/labs/orders`);
      setOrders(res.data.orders || []);
    } catch (err) {
      toast.error('Erreur chargement commandes');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await axios.get(`${API}/patients?limit=100`);
      setPatients(res.data.patients || []);
    } catch (err) {
      console.error('Patients error:', err);
    }
  };

  const handleCreate = async () => {
    if (!orderForm.patient_id || !orderForm.due_date) {
      toast.error('Patient et date limite requis');
      return;
    }
    setSaving(true);
    try {
      await axios.post(`${API}/labs/orders`, {
        ...orderForm,
        lab_cost_mga: parseFloat(orderForm.lab_cost_mga) || 0
      });
      toast.success('Commande créée');
      setIsAddOpen(false);
      setOrderForm({ patient_id: '', work_type: 'CROWN', due_date: '', lab_name: '', shade: '', lab_cost_mga: '', notes: '' });
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur création');
    } finally {
      setSaving(false);
    }
  };

  const openStatusChange = (order) => {
    setSelectedOrder(order);
    setIsStatusOpen(true);
  };

  const handleStatusChange = async (newStatus) => {
    setSaving(true);
    try {
      await axios.post(`${API}/labs/orders/${selectedOrder.id}/status`, { status: newStatus });
      toast.success('Statut mis à jour');
      setIsStatusOpen(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = (orderId) => {
    window.open(`${API}/labs/orders/${orderId}/print`, '_blank');
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR');
  const formatCurrency = (amount) => new Intl.NumberFormat('fr-MG').format(amount) + ' MGA';

  const filteredOrders = orders.filter(o => {
    const matchStatus = filterStatus === 'ALL' || o.status === filterStatus;
    const matchSearch = !searchTerm || 
      o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.patient?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.patient?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="lab-management">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-purple-600" />
            Laboratoire
          </h1>
          <p className="text-gray-500">{orders.length} commandes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchOrders}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button data-testid="new-order-btn">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle commande
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nouvelle commande labo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Patient *</Label>
                  <Select value={orderForm.patient_id} onValueChange={(v) => setOrderForm({...orderForm, patient_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>
                      {patients.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Type de travail</Label>
                    <Select value={orderForm.work_type} onValueChange={(v) => setOrderForm({...orderForm, work_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(WORK_TYPES).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date limite *</Label>
                    <Input type="date" value={orderForm.due_date} onChange={(e) => setOrderForm({...orderForm, due_date: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Laboratoire</Label>
                    <Input value={orderForm.lab_name} onChange={(e) => setOrderForm({...orderForm, lab_name: e.target.value})} placeholder="Nom du labo" />
                  </div>
                  <div className="space-y-2">
                    <Label>Teinte</Label>
                    <Input value={orderForm.shade} onChange={(e) => setOrderForm({...orderForm, shade: e.target.value})} placeholder="A1, A2, B1..." />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Coût (MGA)</Label>
                  <Input type="number" value={orderForm.lab_cost_mga} onChange={(e) => setOrderForm({...orderForm, lab_cost_mga: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={orderForm.notes} onChange={(e) => setOrderForm({...orderForm, notes: e.target.value})} rows={2} />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>Annuler</Button>
                  <Button onClick={handleCreate} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Créer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Rechercher..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous statuts</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k,v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>{filteredOrders.length} commande(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Aucune commande</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredOrders.map((order) => {
                const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.CREATED;
                const StatusIcon = statusConfig.icon;
                return (
                  <div 
                    key={order.id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    data-testid={`order-${order.order_number}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded ${statusConfig.color}`}>
                        <StatusIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{order.order_number}</p>
                        <p className="text-sm text-gray-500">
                          {order.patient?.first_name} {order.patient?.last_name} • {WORK_TYPES[order.work_type]}
                        </p>
                        <p className="text-xs text-gray-400">
                          Échéance: {formatDate(order.due_date)} • {formatCurrency(order.total_mga)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                      <Button variant="outline" size="sm" onClick={() => openStatusChange(order)}>
                        Statut
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handlePrint(order.id)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Change Dialog */}
      <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer statut - {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const Icon = config.icon;
              const isCurrent = selectedOrder?.status === status;
              return (
                <Button 
                  key={status}
                  variant={isCurrent ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => !isCurrent && handleStatusChange(status)}
                  disabled={saving || isCurrent}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {config.label}
                  {isCurrent && " (actuel)"}
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LabManagement;
