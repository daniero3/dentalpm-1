import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Building2, Users, CreditCard, TrendingUp, Crown, Clock, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SuperAdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(res.data);
    } catch (err) {
      if (!axios.isCancel(err)) {
        setError('Erreur lors du chargement du tableau de bord');
        console.error('Dashboard fetch error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatMGA = (amount) =>
    new Intl.NumberFormat('fr-FR').format(amount || 0) + ' MGA';

  const getStatusBadge = (status) => {
    const cfg = {
      TRIAL:     { color: 'bg-blue-100 text-blue-800',  icon: Clock,        text: 'Essai' },
      ACTIVE:    { color: 'bg-green-100 text-green-800', icon: CheckCircle,  text: 'Actif' },
      EXPIRED:   { color: 'bg-red-100 text-red-800',    icon: AlertCircle,  text: 'Expiré' },
      CANCELLED: { color: 'bg-gray-100 text-gray-800',  icon: AlertCircle,  text: 'Annulé' }
    };
    const c = cfg[status] || cfg.EXPIRED;
    const Icon = c.icon;
    return (
      <Badge className={`${c.color} flex items-center gap-1 text-xs`}>
        <Icon className="h-3 w-3" />{c.text}
      </Badge>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div style={{ width: 40, height: 40, border: '3px solid #E2E8F0', borderTopColor: '#0D7A87', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
    </div>
  );

  if (error) return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );

  const { stats, recent_clinics, subscriptions_by_plan, recent_invoices } = dashboardData || {};

  return (
    <div className="space-y-6 animate-fade-up">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord Super Admin</h1>
        <p className="text-gray-600 mt-1">Vue d'ensemble de la plateforme SaaS</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Cliniques Totales', value: stats?.clinics?.total || 0, sub: `${stats?.clinics?.active || 0} actives`, icon: Building2, color: '#3B4FD8' },
          { title: 'Abonnements',       value: stats?.subscriptions?.active || 0, sub: `${stats?.subscriptions?.trial || 0} en essai`, icon: Crown, color: '#F59E0B' },
          { title: 'Revenus Mensuels',  value: formatMGA(stats?.revenue?.monthly_mga), sub: 'Ce mois-ci', icon: DollarSign, color: '#0EA570', isString: true },
          { title: 'Utilisateurs',      value: stats?.users?.total || 0, sub: 'Tous les utilisateurs', icon: Users, color: '#8B5CF6' },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="animate-fade-up" style={{ animationDelay: `${i * 0.06}s` }}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" style={{ color: kpi.color }} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" style={{ color: kpi.isString ? kpi.color : undefined }}>
                    {kpi.value}
                  </div>
                  <p className="text-xs text-muted-foreground">{kpi.sub}</p>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Cliniques récentes */}
        <div className="animate-fade-up stagger-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />Cliniques Récentes
              </CardTitle>
              <CardDescription>Dernières cliniques ajoutées</CardDescription>
            </CardHeader>
            <CardContent>
              {recent_clinics?.length > 0 ? (
                <div className="space-y-3">
                  {recent_clinics.slice(0, 5).map(clinic => (
                    <div key={clinic.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <Building2 className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">{clinic.name}</div>
                          <div className="text-sm text-gray-600">{clinic.city}</div>
                        </div>
                      </div>
                      {getStatusBadge(clinic.subscription_status)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Aucune clinique récente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Factures récentes */}
        <div className="animate-fade-up stagger-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />Factures Récentes
              </CardTitle>
              <CardDescription>Dernières transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {recent_invoices?.length > 0 ? (
                <div className="space-y-3">
                  {recent_invoices.slice(0, 5).map(invoice => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-full">
                          <CreditCard className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium">{invoice.invoice_number}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(invoice.created_at).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">{formatMGA(invoice.total_mga)}</div>
                        <Badge variant={invoice.status === 'PAID' ? 'default' : 'destructive'} className="text-xs">
                          {invoice.status === 'PAID' ? 'Payé' : 'En attente'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Aucune facture récente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Abonnements par plan */}
      {subscriptions_by_plan?.length > 0 && (
        <div className="animate-fade-up stagger-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />Abonnements par Plan
              </CardTitle>
              <CardDescription>Répartition des plans d'abonnement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {subscriptions_by_plan.map(item => (
                  <div key={`${item.plan}-${item.status}`} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{item.plan}</div>
                      {getStatusBadge(item.status)}
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{item.count}</div>
                    <div className="text-sm text-gray-600">abonnement(s)</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
