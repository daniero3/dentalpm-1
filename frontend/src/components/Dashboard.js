import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, FileText, DollarSign,
  TrendingUp, Activity, Clock, AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import { KPICard, KPICardSkeleton } from './KPICard';
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
  { action: "RDV confirmé",               detail: "Jean Rakoto",         time: "il y a 30 min", type: "appointment" },
  { action: "Stock mis à jour",           detail: "Composite A3",        time: "il y a 1h",     type: "inventory" },
];

const typeColor = {
  patient:     '#3B82F6',
  invoice:     '#0EA570',
  appointment: '#8B5CF6',
  inventory:   '#F05A28',
};

const CustomTooltip = ({ active, payload, label, format }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10,
      padding: '10px 14px', boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
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

const ActivityItem = ({ item, index }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
    transition: 'background 0.18s ease',
  }}
    onMouseEnter={e => e.currentTarget.style.background = '#F0F7F8'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
  >
    <div style={{
      width: 9, height: 9, borderRadius: '50%',
      background: typeColor[item.type], flexShrink: 0,
      boxShadow: `0 0 0 3px ${typeColor[item.type]}22`,
    }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0 }}>{item.action}</p>
      <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{item.detail}</p>
    </div>
    <span style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>{item.time}</span>
  </div>
);

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${BACKEND_URL}/api/dashboard/kpi`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Erreur de connexion au serveur';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ textAlign: 'center' }}>
        <AlertTriangle size={48} color="#E63946" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Erreur de chargement</h3>
        <p style={{ color: '#64748B', marginBottom: 20 }}>{error}</p>
        <button onClick={fetchDashboardData} style={{
          background: 'linear-gradient(135deg, #0D7A87, #13A3B4)', color: '#fff',
          border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 600, cursor: 'pointer',
        }}>Réessayer</button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', margin: 0 }}>
            Tableau de bord
          </h1>
          <p style={{ color: '#64748B', marginTop: 4, fontSize: 14 }}>
            Vue d'ensemble de votre cabinet dentaire
          </p>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', background: '#DCFCE7', color: '#15803D',
          borderRadius: 99, fontSize: 12, fontWeight: 700, border: '1px solid #BBF7D0',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />
          En ligne
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)
        ) : (
          <>
            <div style={{ borderRadius: 16, background: '#fff', border: '1px solid #E2E8F0', padding: '22px 24px' }}>
              <KPICard title="Total Patients"    value={dashboardData?.patients?.total || 0}         icon={Users}      delay={0} />
            </div>
            <div style={{ borderRadius: 16, background: '#fff', border: '1px solid #E2E8F0', padding: '22px 24px' }}>
              <KPICard title="RDV Aujourd'hui"   value={dashboardData?.appointments?.today || 0}      icon={Calendar}   delay={0} />
            </div>
            <div style={{ borderRadius: 16, background: '#fff', border: '1px solid #E2E8F0', padding: '22px 24px' }}>
              <KPICard title="Revenus du Mois"   value={dashboardData?.revenue?.current_month || 0}   icon={DollarSign} format="currency" delay={0} />
            </div>
            <div style={{ borderRadius: 16, background: '#fff', border: '1px solid #E2E8F0', padding: '22px 24px' }}>
              <KPICard title="Factures Impayées" value={dashboardData?.invoices?.unpaid_count || 0}   icon={FileText}   delay={0} />
            </div>
          </>
        )}
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Revenue Bar Chart */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.05)' }}>
          <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <TrendingUp size={18} color={CHART_COLORS.primary} />
              <span style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>Évolution des Revenus</span>
            </div>
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>Revenus mensuels en Ariary (MGA)</p>
          </div>
          <div style={{ padding: '16px 12px 20px' }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={mockRevenueData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#94A3B8' }} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#94A3B8' }} tickFormatter={v => `${(v/1000000).toFixed(1)}M`} />
                <Tooltip content={<CustomTooltip format="currency" />} />
                <Bar dataKey="revenue" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Patients Line Chart */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.05)' }}>
          <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Users size={18} color={CHART_COLORS.secondary} />
              <span style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>Nouveaux Patients</span>
            </div>
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>Évolution mensuelle des nouveaux patients</p>
          </div>
          <div style={{ padding: '16px 12px 20px' }}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={mockRevenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#94A3B8' }} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#94A3B8' }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="patients" stroke={CHART_COLORS.secondary} strokeWidth={3}
                  dot={{ fill: '#fff', stroke: CHART_COLORS.secondary, strokeWidth: 2.5, r: 5 }}
                  activeDot={{ r: 7, fill: CHART_COLORS.secondary, stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Pie Chart */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.05)' }}>
          <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Activity size={18} color={CHART_COLORS.accent} />
              <span style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>Répartition des Traitements</span>
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
                    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '8px 12px' }}>
                      <p style={{ fontWeight: 700, color: '#0F172A', fontSize: 13 }}>{payload[0].payload.name}</p>
                      <p style={{ color: payload[0].payload.color, fontSize: 13 }}>{payload[0].value} traitements</p>
                    </div>
                  );
                }} />
              </PieChart>
            </ResponsiveContainer>
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
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.05)' }}>
          <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Clock size={18} color={CHART_COLORS.warning} />
              <span style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>Activité Récente</span>
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

export default Dashboard;
