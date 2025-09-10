import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users,
  Calendar,
  FileText,
  DollarSign,
  TrendingUp,
  Activity,
  Clock,
  AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import { KPICard, KPICardSkeleton } from './KPICard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Chart color palette matching our theme
const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  accent: 'hsl(var(--chart-3))',
  warning: 'hsl(var(--warning))',
  success: 'hsl(var(--success))',
};

const COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.accent,
  CHART_COLORS.warning,
  CHART_COLORS.success,
];

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mock revenue data for charts
  const mockRevenueData = [
    { month: 'Jan', revenue: 2400000, patients: 45 },
    { month: 'Fév', revenue: 2800000, patients: 52 },
    { month: 'Mar', revenue: 3200000, patients: 48 },
    { month: 'Avr', revenue: 2900000, patients: 61 },
    { month: 'Mai', revenue: 3800000, patients: 55 },
    { month: 'Jun', revenue: 4200000, patients: 67 },
  ];

  const mockTreatmentData = [
    { name: 'Consultations', value: 45, color: CHART_COLORS.primary },
    { name: 'Nettoyages', value: 32, color: CHART_COLORS.secondary },
    { name: 'Plombages', value: 28, color: CHART_COLORS.accent },
    { name: 'Couronnes', value: 15, color: CHART_COLORS.warning },
    { name: 'Extractions', value: 8, color: CHART_COLORS.success },
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching dashboard data from:', `${BACKEND_URL}/api/dashboard/kpi`);
      
      const response = await axios.get(`${BACKEND_URL}/api/dashboard/kpi`);
      console.log('Dashboard data received:', response.data);
      
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      // More detailed error handling
      if (error.response) {
        // Server responded with error status
        const errorMsg = error.response.data?.error || `Erreur ${error.response.status}: ${error.response.statusText}`;
        setError(errorMsg);
        toast.error(`Erreur API: ${errorMsg}`);
      } else if (error.request) {
        // Request was made but no response
        setError('Impossible de contacter le serveur. Vérifiez votre connexion.');
        toast.error('Connexion au serveur impossible');
      } else {
        // Something else happened
        setError('Erreur inattendue lors du chargement des données');
        toast.error('Erreur inattendue');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (error) {
    return (
      <motion.div 
        className="flex items-center justify-center h-96"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <div>
            <h3 className="text-lg font-medium text-foreground">Erreur de chargement</h3>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">
            Vue d'ensemble de votre cabinet dentaire
          </p>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <Activity className="h-3 w-3 mr-1" />
          En ligne
        </Badge>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          // Loading skeletons
          Array.from({ length: 4 }).map((_, index) => (
            <KPICardSkeleton key={index} />
          ))
        ) : (
          <>
            <KPICard
              title="Total Patients"
              value={dashboardData?.patients?.total || 0}
              previousValue={dashboardData?.patients?.previous_total}
              icon={Users}
              delay={0}
            />
            <KPICard
              title="RDV Aujourd'hui"
              value={dashboardData?.appointments?.today || 0}
              previousValue={dashboardData?.appointments?.yesterday}
              icon={Calendar}
              delay={0.1}
            />
            <KPICard
              title="Revenus du Mois"
              value={dashboardData?.revenue?.current_month || 0}
              previousValue={dashboardData?.revenue?.previous_month}
              icon={DollarSign}
              format="currency"
              delay={0.2}
            />
            <KPICard
              title="Factures Impayées"
              value={dashboardData?.invoices?.unpaid_count || 0}
              previousValue={dashboardData?.invoices?.previous_unpaid}
              icon={FileText}
              delay={0.3}
            />
          </>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Évolution des Revenus
              </CardTitle>
              <CardDescription>
                Revenus mensuels en Ariary (MGA)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="month" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                              <p className="font-medium text-foreground">{label}</p>
                              <p className="text-primary">
                                Revenus: {formatCurrency(payload[0].value)}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="revenue" 
                      fill={CHART_COLORS.primary}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Patients Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-secondary" />
                Nouveaux Patients
              </CardTitle>
              <CardDescription>
                Évolution mensuelle des nouveaux patients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="month" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                              <p className="font-medium text-foreground">{label}</p>
                              <p className="text-secondary">
                                Patients: {payload[0].value}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="patients" 
                      stroke={CHART_COLORS.secondary}
                      strokeWidth={3}
                      dot={{ fill: CHART_COLORS.secondary, strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: CHART_COLORS.secondary, strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Treatment Distribution and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Treatment Distribution */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-accent" />
                Répartition des Traitements
              </CardTitle>
              <CardDescription>
                Distribution des traitements ce mois
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mockTreatmentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {mockTreatmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                              <p className="font-medium text-foreground">
                                {payload[0].payload.name}
                              </p>
                              <p style={{ color: payload[0].payload.color }}>
                                Nombre: {payload[0].value}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                Activité Récente
              </CardTitle>
              <CardDescription>
                Dernières actions dans le système
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { action: "Nouveau patient enregistré", patient: "Marie Rasoarivelo", time: "il y a 5 min", type: "patient" },
                  { action: "Facture créée", amount: "125 000 MGA", time: "il y a 15 min", type: "invoice" },
                  { action: "RDV confirmé", patient: "Jean Rakoto", time: "il y a 30 min", type: "appointment" },
                  { action: "Stock mis à jour", item: "Composite A3", time: "il y a 1h", type: "inventory" },
                ].map((activity, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'patient' ? 'bg-blue-500' :
                      activity.type === 'invoice' ? 'bg-green-500' :
                      activity.type === 'appointment' ? 'bg-purple-500' :
                      'bg-orange-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {activity.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.patient || activity.amount || activity.item}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {activity.time}
                    </span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Dashboard;