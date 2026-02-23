import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { 
  CreditCard, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Loader2,
  Smartphone
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BillingRenew = () => {
  const [billingStatus, setBillingStatus] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [paymentMethod, setPaymentMethod] = useState('MOBILE_MONEY');
  const [months, setMonths] = useState(1);
  const [reference, setReference] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statusRes, paymentsRes] = await Promise.all([
        axios.get(`${API}/billing/status`),
        axios.get(`${API}/billing/payments`)
      ]);
      setBillingStatus(statusRes.data);
      setPayments(paymentsRes.data.payments || []);
    } catch (error) {
      console.error('Fetch billing error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPayment = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API}/billing/renew`, {
        payment_method: paymentMethod,
        months,
        reference
      });
      toast.success('Demande de paiement soumise. En attente de validation.');
      setReference('');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadInvoice = (year, month) => {
    window.open(`${API}/billing/invoice/${year}/${month}`, '_blank');
  };

  const formatMoney = (val) => new Intl.NumberFormat('fr-MG').format(val || 0);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const isExpired = billingStatus?.is_expired;
  const isTrial = billingStatus?.is_trial;
  const price = billingStatus?.price_mga || 245000;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <CreditCard className="h-8 w-8 mr-3 text-blue-600" />
          Abonnement & Facturation
        </h1>
      </div>

      {/* Status Banner */}
      {isExpired && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3" data-testid="expired-banner">
          <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800">Abonnement expiré</h3>
            <p className="text-red-700 text-sm">
              Votre {isTrial ? 'période d\'essai' : 'abonnement'} est terminé. 
              L'accès est en lecture seule. Renouvelez pour continuer.
            </p>
          </div>
        </div>
      )}

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>État actuel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Badge className={
                billingStatus?.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                billingStatus?.status === 'TRIAL' ? 'bg-blue-100 text-blue-800' :
                'bg-red-100 text-red-800'
              }>
                {billingStatus?.status || 'N/A'}
              </Badge>
              <p className="text-sm text-gray-500 mt-2">Statut</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{billingStatus?.plan || '-'}</p>
              <p className="text-sm text-gray-500">Plan</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {billingStatus?.days_remaining || 0}
              </p>
              <p className="text-sm text-gray-500">Jours restants</p>
            </div>
          </div>
          
          {billingStatus?.end_date && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>Expire le: {formatDate(billingStatus.end_date)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Renew Form */}
      <Card className={isExpired ? 'ring-2 ring-red-300' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isExpired && <AlertTriangle className="h-5 w-5 text-red-500" />}
            Soumettre un paiement
          </CardTitle>
          <CardDescription>
            Prix mensuel: <strong>{formatMoney(price)} Ar</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Méthode de paiement</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger data-testid="payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MOBILE_MONEY">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Mobile Money (MVola/Orange/Airtel)
                    </div>
                  </SelectItem>
                  <SelectItem value="BANK_TRANSFER">Virement bancaire</SelectItem>
                  <SelectItem value="CASH">Espèces</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Durée (mois)</Label>
              <Select value={String(months)} onValueChange={(v) => setMonths(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 mois - {formatMoney(price)} Ar</SelectItem>
                  <SelectItem value="3">3 mois - {formatMoney(price * 3)} Ar</SelectItem>
                  <SelectItem value="6">6 mois - {formatMoney(price * 6)} Ar</SelectItem>
                  <SelectItem value="12">12 mois - {formatMoney(price * 12)} Ar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label>Référence de paiement (optionnel)</Label>
            <Input 
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="N° transaction Mobile Money ou virement"
            />
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="font-semibold text-blue-900">
              Total à payer: {formatMoney(price * months)} Ar
            </p>
            <p className="text-sm text-blue-700 mt-1">
              {months} mois d'abonnement PRO
            </p>
          </div>

          <Button 
            onClick={handleSubmitPayment} 
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700"
            data-testid="submit-payment-btn"
          >
            {submitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
            Soumettre le paiement
          </Button>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des paiements</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucun paiement enregistré</p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      payment.status === 'APPROVED' ? 'bg-green-100' :
                      payment.status === 'PENDING' ? 'bg-amber-100' : 'bg-red-100'
                    }`}>
                      {payment.status === 'APPROVED' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                       payment.status === 'PENDING' ? <Clock className="h-5 w-5 text-amber-600" /> :
                       <AlertTriangle className="h-5 w-5 text-red-600" />}
                    </div>
                    <div>
                      <p className="font-medium">{formatMoney(payment.amount_mga)} Ar</p>
                      <p className="text-sm text-gray-500">{payment.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={
                      payment.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      payment.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                    }>
                      {payment.status}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(payment.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Download Invoice */}
      <Card>
        <CardHeader>
          <CardTitle>Facture d'abonnement</CardTitle>
          <CardDescription>Téléchargez votre facture mensuelle</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select defaultValue={`${new Date().getFullYear()}-${new Date().getMonth() + 1}`}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sélectionner mois" />
              </SelectTrigger>
              <SelectContent>
                {[...Array(12)].map((_, i) => {
                  const month = i + 1;
                  const year = new Date().getFullYear();
                  return (
                    <SelectItem key={month} value={`${year}-${month}`}>
                      {new Date(year, i).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button 
              variant="outline"
              onClick={() => downloadInvoice(new Date().getFullYear(), new Date().getMonth() + 1)}
              data-testid="download-invoice-btn"
            >
              <Download className="h-4 w-4 mr-2" />
              Télécharger PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingRenew;
