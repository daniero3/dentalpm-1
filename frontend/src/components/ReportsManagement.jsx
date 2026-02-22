import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import { 
  BarChart3, RefreshCw, Loader2, TrendingUp, TrendingDown, 
  DollarSign, AlertCircle, CheckCircle, PieChart
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const METHOD_LABELS = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement',
  CHEQUE: 'Chèque',
  MVOLA: 'Mvola',
  ORANGE_MONEY: 'Orange Money',
  AIRTEL_MONEY: 'Airtel Money',
  CARD: 'Carte'
};

const METHOD_COLORS = {
  CASH: '#22c55e',
  BANK_TRANSFER: '#3b82f6',
  CHEQUE: '#f59e0b',
  MVOLA: '#ef4444',
  ORANGE_MONEY: '#f97316',
  AIRTEL_MONEY: '#ec4899',
  CARD: '#8b5cf6'
};

const ReportsManagement = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-01-01`;
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/reports/finance?from=${fromDate}&to=${toDate}`);
      setReport(res.data);
    } catch (err) {
      toast.error('Erreur chargement rapport');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-MG', { maximumFractionDigits: 0 }).format(amount) + ' MGA';
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('fr-FR');

  // Simple pie chart using CSS
  const PieChartSimple = ({ data }) => {
    const total = Object.values(data).reduce((sum, d) => sum + d.total_mga, 0);
    if (total === 0) return <p className="text-gray-500 text-center py-8">Aucune donnée</p>;

    let cumulativePercent = 0;
    const segments = Object.entries(data).map(([method, d]) => {
      const percent = (d.total_mga / total) * 100;
      const start = cumulativePercent;
      cumulativePercent += percent;
      return { method, percent, start, color: METHOD_COLORS[method] || '#6b7280' };
    });

    const gradientStops = segments.map(s => 
      `${s.color} ${s.start}% ${s.start + s.percent}%`
    ).join(', ');

    return (
      <div className="flex items-center gap-6">
        <div 
          className="w-32 h-32 rounded-full"
          style={{ background: `conic-gradient(${gradientStops})` }}
        />
        <div className="space-y-2">
          {Object.entries(data).map(([method, d]) => (
            <div key={method} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: METHOD_COLORS[method] || '#6b7280' }} />
              <span>{METHOD_LABELS[method] || method}</span>
              <span className="font-medium">{formatCurrency(d.total_mga)}</span>
              <span className="text-gray-400">({d.count})</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="reports-management">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
            Rapports Financiers
          </h1>
          <p className="text-gray-500">Analyse des revenus et paiements</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label>Du</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Au</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <Button onClick={fetchReport}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total facturé</p>
                    <p className="text-2xl font-bold">{formatCurrency(report.totals.invoiced_mga)}</p>
                  </div>
                  <DollarSign className="h-10 w-10 text-blue-500 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total encaissé</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(report.totals.paid_mga)}</p>
                  </div>
                  <TrendingUp className="h-10 w-10 text-green-500 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Solde impayé</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(report.totals.balance_mga)}</p>
                  </div>
                  <TrendingDown className="h-10 w-10 text-red-500 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Taux recouvrement</p>
                    <p className="text-2xl font-bold">{report.stats.collection_rate}%</p>
                  </div>
                  <CheckCircle className="h-10 w-10 text-indigo-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-blue-50">
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{report.stats.invoice_count}</p>
                <p className="text-sm text-blue-600">Factures</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold text-green-600">{report.stats.payment_count}</p>
                <p className="text-sm text-green-600">Paiements</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50">
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold text-red-600">{report.stats.unpaid_count}</p>
                <p className="text-sm text-red-600">Impayées</p>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50">
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">{report.stats.fully_paid_count}</p>
                <p className="text-sm text-emerald-600">Soldées</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Répartition par méthode
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PieChartSimple data={report.breakdown_by_method} />
              </CardContent>
            </Card>

            {/* Top Unpaid */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Top {report.top_unpaid_invoices.length} factures impayées
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.top_unpaid_invoices.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Aucune facture impayée 🎉</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {report.top_unpaid_invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-2 bg-red-50 rounded text-sm">
                        <div>
                          <p className="font-medium">{inv.invoice_number}</p>
                          <p className="text-gray-500">{inv.patient_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600">{formatCurrency(inv.remaining_mga)}</p>
                          <p className="text-xs text-gray-400">{formatDate(inv.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsManagement;
