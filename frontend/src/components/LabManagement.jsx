import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { 
  FlaskConical, Plus, Printer, RefreshCw, Loader2, Search, 
  Clock, CheckCircle, XCircle, ArrowRight, Sparkles, X
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WORK_TYPES = {
  CROWN:                  'Couronne',
  BRIDGE:                 'Bridge',
  PARTIAL_DENTURE:        'Prothèse partielle',
  COMPLETE_DENTURE:       'Prothèse complète',
  IMPLANT_CROWN:          'Couronne sur implant',
  ORTHODONTIC_APPLIANCE:  'Appareil orthodontique',
  NIGHT_GUARD:            'Gouttière',
  VENEER:                 'Facette',
  INLAY_ONLAY:            'Inlay/Onlay',
  OTHER:                  'Autre'
};

// ── Tarifs suggérés par type de travail (en MGA) ──────────────────────────
// Modifiez ces valeurs selon vos tarifs réels
const TARIFS_SUGGERES = {
  CROWN: [
    { label: 'Économique',  montant: 150000  },
    { label: 'Standard',    montant: 250000  },
    { label: 'Premium',     montant: 400000  },
  ],
  BRIDGE: [
    { label: 'Économique',  montant: 350000  },
    { label: 'Standard',    montant: 550000  },
    { label: 'Premium',     montant: 900000  },
  ],
  PARTIAL_DENTURE: [
    { label: 'Résine',      montant: 200000  },
    { label: 'Châssis métal', montant: 450000 },
    { label: 'Flexible',    montant: 600000  },
  ],
  COMPLETE_DENTURE: [
    { label: 'Standard',    montant: 350000  },
    { label: 'Premium',     montant: 600000  },
    { label: 'Haute qualité', montant: 900000 },
  ],
  IMPLANT_CROWN: [
    { label: 'Standard',    montant: 500000  },
    { label: 'Zircone',     montant: 800000  },
    { label: 'Full ceramic', montant: 1200000 },
  ],
  ORTHODONTIC_APPLIANCE: [
    { label: 'Plaque simple', montant: 200000 },
    { label: 'Bimaxillaire', montant: 380000  },
    { label: 'Retainer',     montant: 150000  },
  ],
  NIGHT_GUARD: [
    { label: 'Souple',      montant: 100000  },
    { label: 'Rigide',      montant: 180000  },
    { label: 'Double face', montant: 250000  },
  ],
  VENEER: [
    { label: 'Composite',   montant: 120000  },
    { label: 'Céramique',   montant: 300000  },
    { label: 'Zircone',     montant: 500000  },
  ],
  INLAY_ONLAY: [
    { label: 'Composite',   montant: 100000  },
    { label: 'Céramique',   montant: 220000  },
    { label: 'Or',          montant: 400000  },
  ],
  OTHER: [
    { label: 'Petit travail',  montant: 80000  },
    { label: 'Moyen travail',  montant: 200000 },
    { label: 'Grand travail',  montant: 450000 },
  ],
};

const STATUS_CONFIG = {
  CREATED:     { label: 'Créée',    color: 'bg-gray-200 text-gray-700',   icon: Clock },
  SENT:        { label: 'Envoyée',  color: 'bg-blue-100 text-blue-700',   icon: ArrowRight },
  IN_PROGRESS: { label: 'En cours', color: 'bg-yellow-100 text-yellow-700', icon: RefreshCw },
  DELIVERED:   { label: 'Livrée',   color: 'bg-green-100 text-green-700', icon: CheckCircle },
  CANCELLED:   { label: 'Annulée',  color: 'bg-red-100 text-red-700',     icon: XCircle }
};

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

const formatCurrency = (amount) => new Intl.NumberFormat('fr-MG').format(amount) + ' MGA';
const formatDate     = (date)   => new Date(date).toLocaleDateString('fr-FR');


// ── Modal CSS pur ──
const Modal = ({ open, onClose, title, children, maxWidth = 560 }) => {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(15,23,42,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:'#fff', borderRadius:16, padding:28, width:'100%', maxWidth, boxShadow:'0 16px 48px rgba(15,23,42,0.18)', border:'1px solid #E2E8F0', maxHeight:'90vh', overflowY:'auto', position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'none', border:'none', cursor:'pointer', color:'#94A3B8', padding:4 }}><X size={18} /></button>
        {title && <h2 style={{ fontFamily:'Plus Jakarta Sans', fontSize:17, fontWeight:700, color:'#0F172A', margin:'0 0 20px', paddingRight:24 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
};

// ── Composant suggestions de tarifs ───────────────────────────────────────
const TarifSuggestions = ({ workType, onSelect, currentValue }) => {
  const suggestions = TARIFS_SUGGERES[workType] || [];
  if (!suggestions.length) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginBottom: 6, fontSize: 11,
        color: '#0D7A87', fontWeight: 700, letterSpacing: '0.04em',
        textTransform: 'uppercase'
      }}>
        <Sparkles style={{ width: 12, height: 12 }} />
        Tarifs suggérés
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {suggestions.map((s, i) => {
          const isSelected = String(currentValue) === String(s.montant);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(s.montant)}
              style={{
                padding: '5px 12px',
                borderRadius: 99,
                border: isSelected
                  ? '1.5px solid #0D7A87'
                  : '1.5px solid #E2E8F0',
                background: isSelected
                  ? 'linear-gradient(135deg, #0D7A87, #13A3B4)'
                  : '#F8FAFC',
                color: isSelected ? '#fff' : '#475569',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                fontFamily: "'DM Sans', sans-serif",
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = '#0D7A87';
                  e.currentTarget.style.color = '#0D7A87';
                  e.currentTarget.style.background = '#E0F7FA';
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.color = '#475569';
                  e.currentTarget.style.background = '#F8FAFC';
                }
              }}
            >
              {s.label}
              <span style={{
                marginLeft: 6,
                fontWeight: 800,
                color: isSelected ? 'rgba(255,255,255,0.9)' : '#0D7A87'
              }}>
                {new Intl.NumberFormat('fr-MG').format(s.montant)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════
//  COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════
const LabManagement = () => {
  const [orders, setOrders]               = useState([]);
  const [patients, setPatients]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [isAddOpen, setIsAddOpen]         = useState(false);
  const [isStatusOpen, setIsStatusOpen]   = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [saving, setSaving]               = useState(false);
  const [filterStatus, setFilterStatus]   = useState('ALL');
  const [searchTerm, setSearchTerm]       = useState('');

  const [orderForm, setOrderForm] = useState({
    patient_id: '', work_type: 'CROWN', due_date: '',
    lab_name: '', shade: '', lab_cost_mga: '', notes: ''
  });

  useEffect(() => { fetchOrders(); fetchPatients(); }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API}/labs/orders`, authHeaders());
      setOrders(res.data.orders || []);
    } catch (err) {
      toast.error('Erreur chargement commandes');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      let res;
      try {
        res = await axios.get(`${API}/patients?limit=100&page=1`, authHeaders());
      } catch {
        res = await axios.get(`${API}/patients`, authHeaders());
      }
      const list = res.data.patients || res.data.data || res.data || [];
      setPatients(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Patients error:', err);
      toast.error('Impossible de charger la liste des patients');
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
      }, authHeaders());
      toast.success('Commande créée !');
      setIsAddOpen(false);
      setOrderForm({ patient_id: '', work_type: 'CROWN', due_date: '', lab_name: '', shade: '', lab_cost_mga: '', notes: '' });
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur création');
    } finally {
      setSaving(false);
    }
  };

  const openStatusChange = (order) => { setSelectedOrder(order); setIsStatusOpen(true); };

  const handleStatusChange = async (newStatus) => {
    setSaving(true);
    try {
      await axios.post(`${API}/labs/orders/${selectedOrder.id}/status`, { status: newStatus }, authHeaders());
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

  const handlePrint = (orderId) => window.open(`${API}/labs/orders/${orderId}/print`, '_blank');

  const filteredOrders = orders.filter(o => {
    const matchStatus = filterStatus === 'ALL' || o.status === filterStatus;
    const matchSearch = !searchTerm ||
      o.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.patient?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.patient?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#0D7A87' }} />
    </div>
  );

  return (
    <div className="space-y-6" data-testid="lab-management">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6" style={{ color: '#8B5CF6' }} />
            Laboratoire
          </h1>
          <p className="text-gray-500">{orders.length} commandes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchOrders}>
            <RefreshCw className="h-4 w-4 mr-2" />Actualiser
          </Button>

          <Button data-testid="new-order-btn" onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Nouvelle commande
          </Button>

              <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">

                {/* Patient */}
                <div className="space-y-2">
                  <Label>Patient *</Label>
                  <select
                    value={orderForm.patient_id}
                    onChange={e => setOrderForm({ ...orderForm, patient_id: e.target.value })}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 10,
                      border: '1.5px solid #E2E8F0', background: '#fff',
                      fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                      color: orderForm.patient_id ? '#0F172A' : '#94A3B8'
                    }}
                  >
                    <option value="">Sélectionner un patient...</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                    ))}
                  </select>
                </div>

                {/* Type de travail + Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Type de travail</Label>
                    <select
                      value={orderForm.work_type}
                      onChange={e => setOrderForm({ ...orderForm, work_type: e.target.value, lab_cost_mga: '' })}
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: 10,
                        border: '1.5px solid #E2E8F0', background: '#fff',
                        fontSize: 14, fontFamily: "'DM Sans', sans-serif", color: '#0F172A'
                      }}
                    >
                      {Object.entries(WORK_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date limite *</Label>
                    <Input
                      type="date"
                      value={orderForm.due_date}
                      onChange={e => setOrderForm({ ...orderForm, due_date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Labo + Teinte */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Laboratoire</Label>
                    <Input
                      value={orderForm.lab_name}
                      onChange={e => setOrderForm({ ...orderForm, lab_name: e.target.value })}
                      placeholder="Nom du labo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Teinte</Label>
                    <Input
                      value={orderForm.shade}
                      onChange={e => setOrderForm({ ...orderForm, shade: e.target.value })}
                      placeholder="A1, A2, B1..."
                    />
                  </div>
                </div>

                {/* ── Coût avec suggestions ── */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(13,122,135,0.04), rgba(59,79,216,0.03))',
                  border: '1.5px solid rgba(13,122,135,0.15)',
                  borderRadius: 12,
                  padding: '14px 16px',
                }}>
                  <Label>Coût labo (MGA)</Label>
                  <Input
                    type="number"
                    value={orderForm.lab_cost_mga}
                    onChange={e => setOrderForm({ ...orderForm, lab_cost_mga: e.target.value })}
                    placeholder="Saisir ou choisir un tarif ci-dessous"
                    style={{ marginTop: 6, marginBottom: 2 }}
                  />
                  {orderForm.lab_cost_mga && (
                    <p style={{
                      fontSize: 12, color: '#0D7A87', fontWeight: 700,
                      margin: '4px 0 8px', textAlign: 'right'
                    }}>
                      = {formatCurrency(parseFloat(orderForm.lab_cost_mga) || 0)}
                    </p>
                  )}
                  <TarifSuggestions
                    workType={orderForm.work_type}
                    currentValue={orderForm.lab_cost_mga}
                    onSelect={(montant) => setOrderForm({ ...orderForm, lab_cost_mga: String(montant) })}
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={orderForm.notes}
                    onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })}
                    rows={2}
                    placeholder="Instructions spéciales, teinte détaillée..."
                  />
                </div>

                {/* Boutons */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>Annuler</Button>
                  <Button onClick={handleCreate} disabled={saving}>
                    {saving
                      ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      : <Plus className="h-4 w-4 mr-2" />
                    }
                    Créer la commande
                  </Button>
                </div>
              </div>
        </div>
      </div>

      {/* ── Filtres ── */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-48"
              />
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: 10,
                border: '1.5px solid #E2E8F0', background: '#fff',
                fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                color: '#0F172A', minWidth: 160
              }}
            >
              <option value="ALL">Tous statuts</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* ── Liste des commandes ── */}
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
                          Échéance: {formatDate(order.due_date)} •{' '}
                          <span style={{ color: '#0D7A87', fontWeight: 700 }}>
                            {formatCurrency(order.total_mga || order.lab_cost_mga || 0)}
                          </span>
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

      {/* ── Modal Nouvelle commande ── */}
      <Modal open={isAddOpen} onClose={() => setIsAddOpen(false)} title="Nouvelle commande labo" maxWidth={540}>
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          <div className="space-y-2">
            <label style={{ fontSize:13, fontWeight:600, color:'#475569' }}>Patient *</label>
            <select value={orderForm.patient_id} onChange={e => setOrderForm({ ...orderForm, patient_id: e.target.value })}
              style={{ width:'100%', padding:'8px 12px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
              <option value="">Sélectionner un patient...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
            </select>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:'#475569' }}>Type de travail</label>
              <select value={orderForm.work_type} onChange={e => setOrderForm({ ...orderForm, work_type: e.target.value, lab_cost_mga: '' })}
                style={{ width:'100%', marginTop:6, padding:'8px 12px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', fontSize:13 }}>
                {Object.entries(WORK_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:'#475569' }}>Date limite *</label>
              <Input type="date" value={orderForm.due_date} onChange={e => setOrderForm({ ...orderForm, due_date: e.target.value })} style={{ marginTop:6 }} />
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:'#475569' }}>Laboratoire</label>
              <Input value={orderForm.lab_name} onChange={e => setOrderForm({ ...orderForm, lab_name: e.target.value })} placeholder="Nom du labo" style={{ marginTop:6 }} />
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:'#475569' }}>Teinte</label>
              <Input value={orderForm.shade} onChange={e => setOrderForm({ ...orderForm, shade: e.target.value })} placeholder="A1, A2..." style={{ marginTop:6 }} />
            </div>
          </div>
          <div style={{ background:'linear-gradient(135deg,rgba(13,122,135,0.04),rgba(59,79,216,0.03))', border:'1.5px solid rgba(13,122,135,0.15)', borderRadius:12, padding:'14px 16px' }}>
            <label style={{ fontSize:13, fontWeight:600, color:'#475569' }}>Coût labo (MGA)</label>
            <Input type="number" value={orderForm.lab_cost_mga} onChange={e => setOrderForm({ ...orderForm, lab_cost_mga: e.target.value })} placeholder="Saisir ou choisir ci-dessous" style={{ marginTop:6, marginBottom:4 }} />
            {orderForm.lab_cost_mga && <p style={{ fontSize:12, color:'#0D7A87', fontWeight:700, textAlign:'right', marginBottom:6 }}>= {formatCurrency(parseFloat(orderForm.lab_cost_mga)||0)}</p>}
            <TarifSuggestions workType={orderForm.work_type} currentValue={orderForm.lab_cost_mga} onSelect={(m) => setOrderForm({ ...orderForm, lab_cost_mga: String(m) })} />
          </div>
          <div>
            <label style={{ fontSize:13, fontWeight:600, color:'#475569' }}>Notes</label>
            <Textarea value={orderForm.notes} onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })} rows={2} placeholder="Instructions spéciales..." style={{ marginTop:6 }} />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Créer la commande
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal Changement statut ── */}
      <Modal open={isStatusOpen} onClose={() => setIsStatusOpen(false)} title={`Changer statut — ${selectedOrder?.order_number || ''}`} maxWidth={400}>
        <div className="space-y-3">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const Icon = config.icon;
            const isCurrent = selectedOrder?.status === status;
            return (
              <Button key={status} variant={isCurrent ? 'default' : 'outline'} className="w-full justify-start"
                onClick={() => !isCurrent && handleStatusChange(status)} disabled={saving || isCurrent}>
                <Icon className="h-4 w-4 mr-2" />{config.label}{isCurrent && ' (actuel)'}
              </Button>
            );
          })}
        </div>
      </Modal>

    </div>
  );
};

export default LabManagement;
