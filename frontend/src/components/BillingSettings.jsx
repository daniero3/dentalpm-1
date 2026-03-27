import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import {
  CreditCard, Download, Crown,
  Users, AlertCircle, CheckCircle, Clock, Zap, X
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ── Modal CSS pur — zéro framer-motion ──
const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(15,23,42,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:'#fff', borderRadius:16, padding:28, width:'100%', maxWidth:560, boxShadow:'0 16px 48px rgba(15,23,42,0.18)', border:'1px solid #E2E8F0', maxHeight:'90vh', overflowY:'auto', position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'none', border:'none', cursor:'pointer', color:'#94A3B8', padding:4 }}><X size={18} /></button>
        {title && <h2 style={{ fontFamily:'Plus Jakarta Sans', fontSize:17, fontWeight:700, color:'#0F172A', margin:'0 0 20px', paddingRight:24 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
};

const PLAN_FEATURES = {
  ESSENTIAL: ['Gestion patients', 'Rendez-vous', 'Facturation MGA', 'Support par email'],
  PRO:       ['Toutes les fonctionnalités Essential', 'Inventaire avancé', 'Laboratoire dentaire', 'Mailing patients', 'Rapports avancés', 'Support prioritaire'],
  GROUP:     ['Toutes les fonctionnalités Pro', 'Multi-site', 'API access', 'Formation personnalisée', 'Support dédié 24/7']
};

const PLAN_PRICES = {
  ESSENTIAL: { monthly: 50000,  label: 'Essential' },
  PRO:       { monthly: 100000, label: 'Pro' },
  GROUP:     { monthly: 200000, label: 'Group' },
};

const STATUS_CONFIG = {
  TRIAL:     { color: 'bg-blue-100 text-blue-800',  icon: Clock,         text: "Période d'essai" },
  ACTIVE:    { color: 'bg-green-100 text-green-800', icon: CheckCircle,   text: 'Actif' },
  EXPIRED:   { color: 'bg-red-100 text-red-800',    icon: AlertCircle,   text: 'Expiré' },
  CANCELLED: { color: 'bg-gray-100 text-gray-800',  icon: AlertCircle,   text: 'Annulé' }
};

const PLAN_ICONS = { ESSENTIAL: Users, PRO: Zap, GROUP: Crown };

const BillingSettings = () => {
  const navigate = useNavigate();
  const [subscription, setSubscription]       = useState(null);
  const [invoices, setInvoices]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
    fetchInvoices();
  }, []);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchSubscriptionData = async () => {
    try {
      const res = await axios.get(`${API}/subscription/status`, authHeaders());
      setSubscription(res.data);
    } catch (err) {
      if (!axios.isCancel(err)) {
        setError("Erreur lors du chargement de l'abonnement");
        console.error('Subscription fetch error:', err);
      }
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await axios.get(`${API}/billing/invoices`, authHeaders());
      setInvoices(res.data.invoices || []);
    } catch (err) {
      if (!axios.isCancel(err)) console.error('Invoices fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = async (invoiceId) => {
    try {
      const res = await axios.get(`${API}/billing/invoices/${invoiceId}`, authHeaders());
      const invoice = res.data.invoice;
      const content = `FACTURE D'ABONNEMENT\n====================\nNuméro: ${invoice.invoice_number}\nDate: ${new Date(invoice.created_at).toLocaleDateString('fr-FR')}\n\nMONTANT:\nTotal: ${(invoice.total_mga||0).toLocaleString()} MGA\nStatut: ${invoice.status}\n\nDental Practice Management - Madagascar`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `facture_${invoice.invoice_number}.txt`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) { console.error('Download error:', err); }
  };

  const getStatusBadge = (status) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.EXPIRED;
    const Icon = cfg.icon;
    return (
      <Badge className={`${cfg.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />{cfg.text}
      </Badge>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div style={{ width:40, height:40, border:'3px solid #E2E8F0', borderTopColor:'#0D7A87', borderRadius:'50%', animation:'spin 0.75s linear infinite' }} />
    </div>
  );

  if (error) return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );

  const PlanIcon = PLAN_ICONS[subscription?.plan] || Users;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Facturation & Abonnement</h1>
          <p className="text-gray-600 mt-1">Gérez votre abonnement et consultez vos factures</p>
        </div>
      </div>

      {/* Alertes statut */}
      {subscription?.status === 'TRIAL' && subscription?.trial_days_remaining !== null && (
        <Alert className="border-blue-200 bg-blue-50">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Période d'essai :</strong> Il vous reste <strong>{subscription.trial_days_remaining}</strong> jour(s).
            Souscrivez à un plan pour continuer à utiliser tous les services.
          </AlertDescription>
        </Alert>
      )}

      {subscription?.status === 'EXPIRED' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Abonnement expiré :</strong> Veuillez renouveler votre plan pour continuer.
          </AlertDescription>
        </Alert>
      )}

      {/* Plan actuel */}
      {subscription && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <PlanIcon className="h-5 w-5" />
                  Plan {subscription.plan || 'N/A'}
                </CardTitle>
                <CardDescription>Votre abonnement actuel</CardDescription>
              </div>
              {getStatusBadge(subscription.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Praticiens maximum</div>
                <div className="text-2xl font-bold">{subscription.max_practitioners || 'N/A'}</div>
              </div>
              {subscription.end_date && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Date d'expiration</div>
                  <div className="text-lg font-semibold">{new Date(subscription.end_date).toLocaleDateString('fr-FR')}</div>
                </div>
              )}
              {subscription.trial_days_remaining !== null && subscription.trial_days_remaining !== undefined && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600">Jours d'essai restants</div>
                  <div className="text-2xl font-bold text-blue-900">{subscription.trial_days_remaining}</div>
                </div>
              )}
            </div>

            {/* Fonctionnalités */}
            <div>
              <h4 className="font-semibold mb-2">Fonctionnalités incluses :</h4>
              <ul className="space-y-1">
                {(PLAN_FEATURES[subscription.plan] || []).map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ height:1, background:'#F1F5F9', margin:'8px 0' }} />

            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => setUpgradeModalOpen(true)}>
                <Crown className="h-4 w-4 mr-2" />Mettre à niveau
              </Button>
              <Button variant="outline" onClick={() => navigate('/payment')}>
                <CreditCard className="h-4 w-4 mr-2" />Renouveler / Payer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Factures récentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />Factures récentes
          </CardTitle>
          <CardDescription>Historique de vos paiements</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Aucune facture disponible</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map(invoice => (
                <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{invoice.invoice_number}</div>
                      <div className="text-sm text-gray-600">{new Date(invoice.created_at).toLocaleDateString('fr-FR')}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold">{(invoice.total_mga||0).toLocaleString()} MGA</div>
                      <Badge variant={invoice.status === 'PAID' ? 'default' : 'destructive'} className="text-xs">
                        {invoice.status === 'PAID' ? 'Payé' : 'En attente'}
                      </Badge>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => downloadInvoice(invoice.id)}>
                      <Download className="h-4 w-4 mr-1" />PDF
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Modal Mise à niveau ── */}
      <Modal open={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} title="Choisir un plan">
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {Object.entries(PLAN_PRICES).map(([plan, info]) => {
            const Icon = PLAN_ICONS[plan] || Users;
            const isCurrent = subscription?.plan === plan;
            return (
              <div key={plan} style={{ padding:'16px', borderRadius:12, border:`2px solid ${isCurrent ? '#0D7A87' : '#E2E8F0'}`, background: isCurrent ? 'rgba(13,122,135,0.04)' : '#fff' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <Icon size={18} style={{ color:'#0D7A87' }} />
                    <span style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15 }}>{info.label}</span>
                    {isCurrent && <Badge className="bg-green-100 text-green-800">Actuel</Badge>}
                  </div>
                  <span style={{ fontWeight:800, color:'#0D7A87', fontSize:15 }}>{info.monthly.toLocaleString()} MGA/mois</span>
                </div>
                <ul style={{ marginBottom:12 }}>
                  {(PLAN_FEATURES[plan]||[]).slice(0,3).map((f,i) => (
                    <li key={i} style={{ fontSize:12, color:'#64748B', display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                      <CheckCircle size={12} style={{ color:'#22c55e', flexShrink:0 }} />{f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && (
                  <Button className="w-full" onClick={() => { setUpgradeModalOpen(false); navigate('/payment'); }}>
                    Choisir {info.label}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};

export default BillingSettings;
