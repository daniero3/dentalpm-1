import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, FileText, DollarSign,
  TrendingUp, Activity, Clock, AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import { KPICard, KPICardSkeleton } from './KPICard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const CHART_COLORS = {
  primary:   '#0D7A87',
  secondary: '#3B4FD8',
  accent:    '#8B5CF6',
  warning:   '#F59E0B',
  success:   '#0EA570',
  coral:     '#F05A28',
};

const COLORS = Object.values(CHART_COLORS);

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
  { name: 'Nettoyages',    value: 32, color: CHART_COLORS.secondary },
  { name: 'Plombages',     value: 28, color: CHART_COLORS.accent },
  { name: 'Couronnes',     value: 15, color: CHART_COLORS.warning },
  { name: 'Extractions',   value: 8,  color: CHART_COLORS.success },
];

const activityList = [
  { action: "Nouveau patient enregistré", detail: "Marie Rasoarivelo", time: "il y a 5 min",  type: "patient" },
  { action: "Facture créée",              detail: "125 000 MGA",        time: "il y a 15 min", type: "invoice" },
  { action: "RDV confirmé",              detail: "Jean Rakoto",         time: "il y a 30 min", type: "appointment" },
  { action: "Stock mis à jour",          detail: "Composite A3",        time: "il y a 1h",     type: "inventory" },
];

const typeColor = {
  patient:     '#3B82F6',
  invoice:     '#0EA570',
  appointment: '#8B5CF6',
  inventory:   '#F05A28',
};

/* ── Tooltip personnalisé ── */
const CustomTooltip = ({ active, payload, label, format }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E2E8F0',
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <p style={{ fontWeight: 700, color: '#0F172A', marginBottom: 4, fontSize: 13 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || CHART_COLORS.primary, fontSize: 13 }}>
          {format === 'currency'
            ? `${new Intl.NumberFormat('fr-MG').format(p.value)} Ar`
            : `${p.name === 'patients' ? 'Patients' : p.name}: ${p.value}`}
        </p>
      ))}
    </div>
  );
};

/* ── Stat card inline (pour activité récente) ── */
const ActivityItem = ({ item, index }) => (
  <div
    className="animate-fade-up"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 14px',
      borderRadius: 10,
      cursor: 'pointer',
      transition: 'background 0.18s ease',
      animationDelay: `${0.05 * index}s`,
    }}
    onMouseEnter={e => e.currentTarget.style.background = '#F0F7F8'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
  >
    <div style={{
      width: 9, height: 9,
      borderRadius: '50%',
      background: typeColor[item.type],
      flexShrink: 0,
      boxShadow: `0 0 0 3px ${typeColor[item.type]}22`,
    }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0 }}>{item.action}</p>
      <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{item.detail}</p>
    </div>
    <span style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>{item.time}</span>
  </div>
);

/* ══════════════════════════════════════════════
   DASHBOARD PRINCIPAL
   ══════════════════════════════════════════════ */
const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${BACKEND_URL}/api/dashboard/kpi`);
      setDashboardData(response.data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Erreur de connexion au serveur';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ── Erreur ── */
  if (error) return (
    <div className="animate-fade-up" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400
    }}>
      <div style={{ textAlign: 'center' }}>
        <AlertTriangle size={48} color="#E63946" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
          Erreur de chargement
        </h3>
        <p style={{ color: '#64748B', marginBottom: 20 }}>{error}</p>
        <button
          onClick={fetchDashboardData}
          style={{
            background: 'linear-gradient(135deg, #0D7A87, #13A3B4)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '10px 24px',
            fontFamily: 'Plus Jakarta Sans',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(13,122,135,0.3)',
          }}
        >
          Réessayer
        </button>
      </div>
    </div>
  );

  /* ── Dashboard ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Header ── */}
      <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 28,
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.03em',
            margin: 0,
          }}>
            Tableau de bord
          </h1>
          <p style={{ color: '#64748B', marginTop: 4, fontSize: 14, margin: '4px 0 0' }}>
            Vue d'ensemble de votre cabinet dentaire
          </p>
        </div>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 14px',
          background: '#DCFCE7',
          color: '#15803D',
          borderRadius: 99,
          fontSize: 12,
          fontWeight: 700,
          fontFamily: 'Plus Jakarta Sans',
          border: '1px solid #BBF7D0',
        }}>
          <span style={{
            width: 7, height: 7,
            borderRadius: '50%',
            background: '#16A34A',
            animation: 'pulse 2s ease-in-out infinite',
            display: 'inline-block',
          }} />
          En ligne
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)
        ) : (
          <>
            <div className="animate-fade-up stagger-1 kpi-card" style={{ borderRadius: 16, background: '#fff', border: '1px solid #E2E8F0', padding: '22px 24px' }}>
              <KPICard title="Total Patients"       value={dashboardData?.patients?.total || 0}           previousValue={dashboardData?.patients?.previous_total}    icon={Users}       delay={0} />
            </div>
            <div className="animate-fade-up stagger-2 kpi-card" style={{ borderRadius: 16, background: '#fff', border: '1px solid #E2E8F0', padding: '22px 24px' }}>
              <KPICard title="RDV Aujourd'hui"      value={dashboardData?.appointments?.today || 0}        previousValue={dashboardData?.appointments?.yesterday}      icon={Calendar}    delay={0} />
            </div>
            <div className="animate-fade-up stagger-3 kpi-card" style={{ borderRadius: 16, background: '#fff', border: '1px solid #E2E8F0', padding: '22px 24px' }}>
              <KPICard title="Revenus du Mois"      value={dashboardData?.revenue?.current_month || 0}     previousValue={dashboardData?.revenue?.previous_month}      icon={DollarSign}  format="currency" delay={0} />
            </div>
            <div className="animate-fade-up stagger-4 kpi-card" style={{ borderRadius: 16, background: '#fff', border: '1px solid #E2E8F0', padding: '22px 24px' }}>
              <KPICard title="Factures Impayées"    value={dashboardData?.invoices?.unpaid_count || 0}     previousValue={dashboardData?.invoices?.previous_unpaid}    icon={FileText}    delay={0} />
            </div>
          </>
        )}
      </div>

      {/* ── Charts row 1 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Revenue Bar Chart */}
        <div className="animate-fade-up stagger-2" style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
          transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(15,23,42,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,23,42,0.05)'; }}
        >
          <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <TrendingUp size={18} color={CHART_COLORS.primary} />
              <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 15, color: '#0F172A' }}>
                Évolution des Revenus
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>Revenus mensuels en Ariary (MGA)</p>
          </div>
          <div style={{ padding: '16px 12px 20px' }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={mockRevenueData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#94A3B8', fontFamily: 'DM Sans' }} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#94A3B8' }} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
                <Tooltip content={<CustomTooltip format="currency" />} cursor={{ fill: 'rgba(13,122,135,0.06)', radius: 6 }} />
                <Bar dataKey="revenue" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.primary} />
                    <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0.6} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Patients Line Chart */}
        <div className="animate-fade-up stagger-3" style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
          transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(15,23,42,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,23,42,0.05)'; }}
        >
          <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Users size={18} color={CHART_COLORS.secondary} />
              <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 15, color: '#0F172A' }}>
                Nouveaux Patients
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>Évolution mensuelle des nouveaux patients</p>
          </div>
          <div style={{ padding: '16px 12px 20px' }}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={mockRevenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#94A3B8', fontFamily: 'DM Sans' }} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#94A3B8' }} />
                <Tooltip content={<CustomTooltip />} />
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={CHART_COLORS.secondary} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Line
                  type="monotone"
                  dataKey="patients"
                  stroke={CHART_COLORS.secondary}
                  strokeWidth={3}
                  dot={{ fill: '#fff', stroke: CHART_COLORS.secondary, strokeWidth: 2.5, r: 5 }}
                  activeDot={{ r: 7, fill: CHART_COLORS.secondary, stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Charts row 2 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Pie Chart */}
        <div className="animate-fade-up stagger-4" style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
          transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(15,23,42,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,23,42,0.05)'; }}
        >
          <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Activity size={18} color={CHART_COLORS.accent} />
              <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 15, color: '#0F172A' }}>
                Répartition des Traitements
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>Distribution des traitements ce mois</p>
          </div>
          <div style={{ padding: '16px 12px 20px', display: 'flex', gap: 16, alignItems: 'center' }}>
            <ResponsiveContainer width="60%" height={240}>
              <PieChart>
                <Pie data={mockTreatmentData} cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={4} dataKey="value">
                  {mockTreatmentData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '8px 12px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                      <p style={{ fontWeight: 700, color: '#0F172A', fontSize: 13 }}>{payload[0].payload.name}</p>
                      <p style={{ color: payload[0].payload.color, fontSize: 13 }}>{payload[0].value} traitements</p>
                    </div>
                  );
                }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Légende */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {mockTreatmentData.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#475569' }}>{item.name}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="animate-fade-up stagger-5" style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
          transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(15,23,42,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,23,42,0.05)'; }}
        >
          <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Clock size={18} color={CHART_COLORS.warning} />
              <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 15, color: '#0F172A' }}>
                Activité Récente
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>Dernières actions dans le système</p>
          </div>
          <div style={{ padding: '12px 10px' }}>
            {activityList.map((item, i) => (
              <ActivityItem key={i} item={item} index={i} />
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;import React, { useState, useEffect } from 'react';
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
