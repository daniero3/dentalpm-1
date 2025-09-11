import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  CreditCard, 
  Download, 
  Crown, 
  Users, 
  AlertCircle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';

const API = process.env.REACT_APP_BACKEND_URL || import.meta.env.VITE_REACT_APP_BACKEND_URL;

const BillingSettings = () => {
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  // Fetch subscription and invoice data
  useEffect(() => {
    fetchSubscriptionData();
    fetchInvoices();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/api/subscription/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscription(response.data);
    } catch (err) {
      setError('Erreur lors du chargement de l\'abonnement');
      console.error('Subscription fetch error:', err);
    }
  };

  const fetchInvoices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/api/billing/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvoices(response.data.invoices || []);
    } catch (err) {
      console.error('Invoices fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = async (invoiceId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/api/billing/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Create downloadable PDF content (mock implementation)
      const invoice = response.data.invoice;
      const content = generateInvoicePDF(invoice);
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `facture_${invoice.invoice_number}.txt`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const generateInvoicePDF = (invoice) => {
    return `
FACTURE D'ABONNEMENT
====================

Numéro: ${invoice.invoice_number}
Date: ${new Date(invoice.created_at).toLocaleDateString('fr-FR')}

CLINIQUE:
${invoice.clinic?.name || 'N/A'}
${invoice.clinic?.address || ''}
${invoice.clinic?.city || ''}, ${invoice.clinic?.postal_code || ''}
NIF: ${invoice.clinic?.nif_number || 'N/A'}
STAT: ${invoice.clinic?.stat_number || 'N/A'}

DÉTAILS:
${invoice.description}
Période: ${new Date(invoice.billing_period_start).toLocaleDateString('fr-FR')} - ${new Date(invoice.billing_period_end).toLocaleDateString('fr-FR')}

MONTANT:
Sous-total: ${(invoice.amount_mga || 0).toLocaleString()} MGA
Remise: ${(invoice.discount_amount_mga || 0).toLocaleString()} MGA
TOTAL: ${(invoice.total_mga || 0).toLocaleString()} MGA

Méthode de paiement: ${invoice.payment_method || 'N/A'}
Statut: ${invoice.status}
${invoice.paid_at ? `Payé le: ${new Date(invoice.paid_at).toLocaleDateString('fr-FR')}` : ''}

Merci pour votre confiance !
Dental Practice Management - Madagascar
    `;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      TRIAL: { color: 'bg-blue-100 text-blue-800', icon: Clock, text: 'Période d\'essai' },
      ACTIVE: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Actif' },
      EXPIRED: { color: 'bg-red-100 text-red-800', icon: AlertCircle, text: 'Expiré' },
      CANCELLED: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, text: 'Annulé' }
    };

    const config = statusConfig[status] || statusConfig.EXPIRED;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const getPlanIcon = (plan) => {
    const icons = {
      ESSENTIAL: Users,
      PRO: Zap,
      GROUP: Crown
    };
    return icons[plan] || Users;
  };

  const getPlanFeatures = (plan) => {
    const features = {
      ESSENTIAL: ['Gestion patients', 'Rendez-vous', 'Facturation MGA', 'Support par email'],
      PRO: ['Toutes les fonctionnalités Essential', 'Inventaire avancé', 'Laboratoire dentaire', 'Mailing patients', 'Rapports avancés', 'Support prioritaire'],
      GROUP: ['Toutes les fonctionnalités Pro', 'Multi-site', 'API access', 'Formation personnalisée', 'Support dédié 24/7']
    };
    return features[plan] || [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Facturation & Abonnement</h1>
          <p className="text-gray-600 mt-1">Gérez votre abonnement et consultez vos factures</p>
        </div>
      </div>

      {/* Subscription Status Alert */}
      {subscription && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {subscription.status === 'TRIAL' && subscription.trial_days_remaining !== null && (
            <Alert className="border-blue-200 bg-blue-50">
              <Clock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Période d'essai:</strong> Il vous reste {subscription.trial_days_remaining} jour(s) 
                avant la fin de votre essai gratuit. Souscrivez à un plan pour continuer à utiliser tous les services.
              </AlertDescription>
            </Alert>
          )}
          
          {subscription.status === 'EXPIRED' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Abonnement expiré:</strong> Votre abonnement a expiré. 
                Veuillez renouveler votre plan pour continuer à utiliser le service.
              </AlertDescription>
            </Alert>
          )}
        </motion.div>
      )}

      {/* Current Plan */}
      {subscription && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {React.createElement(getPlanIcon(subscription.plan), { className: "h-5 w-5" })}
                    Plan {subscription.plan}
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
                  <div className="text-2xl font-bold text-gray-900">{subscription.max_practitioners || 'N/A'}</div>
                </div>
                {subscription.end_date && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Date d'expiration</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {new Date(subscription.end_date).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                )}
                {subscription.trial_days_remaining !== null && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-blue-600">Jours d'essai restants</div>
                    <div className="text-2xl font-bold text-blue-900">{subscription.trial_days_remaining}</div>
                  </div>
                )}
              </div>

              {/* Plan Features */}
              <div>
                <h4 className="font-semibold mb-2">Fonctionnalités incluses:</h4>
                <ul className="space-y-1">
                  {getPlanFeatures(subscription.plan).map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button onClick={() => setUpgradeModalOpen(true)}>
                  <Crown className="h-4 w-4 mr-2" />
                  Mettre à niveau
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recent Invoices */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Factures récentes
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
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">{invoice.invoice_number}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(invoice.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold">{(invoice.total_mga || 0).toLocaleString()} MGA</div>
                        <Badge 
                          variant={invoice.status === 'PAID' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {invoice.status === 'PAID' ? 'Payé' : 'En attente'}
                        </Badge>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => downloadInvoice(invoice.id)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default BillingSettings;