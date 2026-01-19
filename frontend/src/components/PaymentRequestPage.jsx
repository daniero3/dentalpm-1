import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "../App";
import {
  CreditCard,
  Upload,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  FileText
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLANS = [
  { code: 'ESSENTIAL', name: 'Essentiel', price: 150000, features: ['1 praticien', '100 patients', 'Support email'] },
  { code: 'PRO', name: 'Professionnel', price: 300000, features: ['3 praticiens', '500 patients', 'Support prioritaire'] },
  { code: 'GROUP', name: 'Groupe', price: 500000, features: ['Illimité', 'Multi-sites', 'Support dédié'] }
];

const PAYMENT_METHODS = [
  { code: 'MVOLA', name: 'MVola', icon: '📱' },
  { code: 'ORANGE_MONEY', name: 'Orange Money', icon: '🟠' },
  { code: 'AIRTEL_MONEY', name: 'Airtel Money', icon: '🔴' },
  { code: 'BANK_TRANSFER', name: 'Virement bancaire', icon: '🏦' },
  { code: 'CASH', name: 'Espèces', icon: '💵' }
];

const STATUS_CONFIG = {
  PENDING: { label: 'En attente', variant: 'secondary', icon: Clock },
  VERIFIED: { label: 'Vérifié', variant: 'default', icon: CheckCircle },
  REJECTED: { label: 'Rejeté', variant: 'destructive', icon: XCircle }
};

const PaymentRequestPage = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    plan_code: 'ESSENTIAL',
    payment_method: 'MVOLA',
    reference: '',
    receipt: null
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [subRes, reqRes] = await Promise.all([
        axios.get(`${API}/billing/subscription`),
        axios.get(`${API}/billing/payment-requests`)
      ]);
      setSubscription(subRes.data.subscription);
      setRequests(reqRes.data.paymentRequests || []);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = new FormData();
      data.append('plan_code', formData.plan_code);
      data.append('payment_method', formData.payment_method);
      if (formData.reference) data.append('reference', formData.reference);
      if (formData.receipt) data.append('receipt', formData.receipt);

      await axios.post(`${API}/billing/payment-requests`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Demande de paiement soumise');
      setFormData({ ...formData, reference: '', receipt: null });
      fetchData();
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.message || 'Erreur';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPlan = PLANS.find(p => p.code === formData.plan_code);
  const hasPendingRequest = requests.some(r => r.status === 'PENDING');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="payment-request-page">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Paiement & Abonnement
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gérez votre abonnement et soumettez vos preuves de paiement
        </p>
      </div>

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Abonnement actuel</CardTitle>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{subscription.plan}</p>
                <p className="text-sm text-muted-foreground">
                  {subscription.start_date} → {subscription.end_date}
                </p>
              </div>
              <Badge variant={subscription.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {subscription.status}
              </Badge>
            </div>
          ) : (
            <p className="text-muted-foreground">Aucun abonnement actif</p>
          )}
        </CardContent>
      </Card>

      {/* New Payment Request Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nouvelle demande de paiement</CardTitle>
          <CardDescription>
            Choisissez votre plan, effectuez le paiement, puis soumettez la preuve
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasPendingRequest ? (
            <div className="text-center py-4">
              <Clock className="h-12 w-12 text-amber-500 mx-auto mb-2" />
              <p className="text-muted-foreground">
                Une demande est déjà en attente de validation
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLANS.map(plan => (
                  <div
                    key={plan.code}
                    onClick={() => setFormData({...formData, plan_code: plan.code})}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      formData.plan_code === plan.code 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary' 
                        : 'hover:border-primary/50'
                    }`}
                    data-testid={`plan-${plan.code}`}
                  >
                    <h3 className="font-semibold">{plan.name}</h3>
                    <p className="text-2xl font-bold text-primary">
                      {plan.price.toLocaleString()} <span className="text-sm">MGA/mois</span>
                    </p>
                    <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                      {plan.features.map((f, i) => (
                        <li key={i}>• {f}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Méthode de paiement</Label>
                  <Select 
                    value={formData.payment_method}
                    onValueChange={(v) => setFormData({...formData, payment_method: v})}
                  >
                    <SelectTrigger data-testid="payment-method-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m.code} value={m.code}>
                          {m.icon} {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Référence transaction</Label>
                  <Input
                    value={formData.reference}
                    onChange={(e) => setFormData({...formData, reference: e.target.value})}
                    placeholder="Ex: MVL-123456789"
                    data-testid="reference-input"
                  />
                </div>
              </div>

              <div>
                <Label>Reçu de paiement (optionnel)</Label>
                <Input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => setFormData({...formData, receipt: e.target.files[0]})}
                  data-testid="receipt-upload"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Formats acceptés: JPG, PNG, PDF (max 5MB)
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Montant à payer</p>
                  <p className="text-2xl font-bold">{selectedPlan?.price.toLocaleString()} MGA</p>
                </div>
                <Button type="submit" disabled={submitting} className="gap-2" data-testid="submit-payment-btn">
                  <Send className="h-4 w-4" />
                  {submitting ? 'Envoi...' : 'Soumettre la demande'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historique des demandes</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Aucune demande</p>
          ) : (
            <div className="space-y-3">
              {requests.map(req => {
                const StatusIcon = STATUS_CONFIG[req.status]?.icon || Clock;
                return (
                  <div key={req.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <StatusIcon className={`h-5 w-5 ${
                        req.status === 'VERIFIED' ? 'text-green-500' : 
                        req.status === 'REJECTED' ? 'text-red-500' : 'text-amber-500'
                      }`} />
                      <div>
                        <p className="font-medium">{req.plan_code} - {req.amount_mga?.toLocaleString()} MGA</p>
                        <p className="text-xs text-muted-foreground">
                          {req.payment_method} • {req.reference || 'Sans référence'} • {new Date(req.created_at).toLocaleDateString('fr-FR')}
                        </p>
                        {req.note_admin && (
                          <p className="text-xs text-muted-foreground mt-1">Note: {req.note_admin}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={STATUS_CONFIG[req.status]?.variant}>
                      {STATUS_CONFIG[req.status]?.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentRequestPage;
