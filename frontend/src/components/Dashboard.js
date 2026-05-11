import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Users, Calendar, FileText, TrendingUp, Activity,
  Clock, AlertTriangle, RefreshCw, ArrowUpRight, ArrowDownRight,
  Minus, CheckCircle, XCircle, DollarSign, Package,
  FlaskConical, Star, Zap, BarChart2, PieChartIcon
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL
  ? `${BACKEND_URL}/api`
  : typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8001/api'
    : '/api';
const authH = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const C = {
  teal:   '#0D7A87',
  blue:   '#3B4FD8',
  purple: '#8B5CF6',
  amber:  '#F59E0B',
  green:  '#10B981',
  coral:  '#EF4444',
  pink:   '#EC4899',
  slate:  '#64748B',
};

const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

const fmt   = v => new Intl.NumberFormat('fr-MG').format(v || 0) + ' Ar';
const fmtK  = v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v || 0);
const fdate = d => new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
const today = () => new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

/* ── Hook screen width ── */
const useW = () => {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => { const h = () => setW(window.innerWidth); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
  return w;
};

/* ── Counter animé ── */
const Counter = ({ to, duration = 900, prefix = '', suffix = '' }) => {
  const [n, setN] = useState(0);
  const ref = useRef(false);
  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      setN(Math.floor(to * (p < 0.5 ? 2*p*p : -1+(4-2*p)*p)));
      if (p < 1) requestAnimationFrame(tick);
      else setN(to);
    };
    requestAnimationFrame(tick);
  }, [to, duration]);
  return <>{prefix}{new Intl.NumberFormat('fr-MG').format(n)}{suffix}</>;
};

/* ── Tooltip custom ── */
const TTip = ({ active, payload, label, cur = false }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, padding:'10px 14px', boxShadow:'0 8px 24px rgba(15,23,42,.12)' }}>
      <p style={{ fontWeight:700, color:'#0F172A', marginBottom:4, fontSize:13 }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ color:p.color||C.teal, fontSize:13, margin:'2px 0' }}>
          {p.name}: {cur ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

/* ── KPI Card ── */
const KPI = ({ label, value, sub, icon: Icon, color, trend, trendLabel, format = 'number', loading }) => {
  const isPos = trend > 0, isNeg = trend < 0;
  const trendColor = isPos ? '#10B981' : isNeg ? '#EF4444' : '#94A3B8';
  const TIcon = isPos ? ArrowUpRight : isNeg ? ArrowDownRight : Minus;
  return (
    <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'20px 22px', boxShadow:'0 1px 4px rgba(0,0,0,.04)', position:'relative', overflow:'hidden', transition:'box-shadow .2s' }}
      onMouseOver={e=>e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.08)'}
      onMouseOut={e=>e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.04)'}>
      {/* Fond déco */}
      <div style={{ position:'absolute', top:-16, right:-16, width:80, height:80, borderRadius:'50%', background:`${color}10`, pointerEvents:'none' }}/>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ width:42, height:42, borderRadius:12, background:`${color}15`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {loading ? <div style={{ width:20, height:20, borderRadius:'50%', border:`3px solid ${color}33`, borderTopColor:color, animation:'spin .8s linear infinite' }}/> : <Icon size={20} color={color}/>}
        </div>
        {trend !== undefined && (
          <div style={{ display:'flex', alignItems:'center', gap:3, background:`${trendColor}12`, color:trendColor, borderRadius:99, padding:'3px 8px', fontSize:11, fontWeight:700 }}>
            <TIcon size={11}/> {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:26, color:'#0F172A', lineHeight:1, marginBottom:4 }}>
        {loading ? <div style={{ width:100, height:24, borderRadius:6, background:'#F1F5F9' }}/> :
          format === 'currency' ? <Counter to={value} prefix="" suffix=" Ar"/> :
          <Counter to={value}/>
        }
      </div>
      <div style={{ fontSize:13, fontWeight:600, color:'#475569', marginBottom:2 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'#94A3B8' }}>{sub}</div>}
      {trendLabel && <div style={{ fontSize:11, color:trendColor, marginTop:4 }}>{trendLabel}</div>}
    </div>
  );
};

/* ── Skeleton ── */
const Skel = ({ h=20, w='100%', r=8 }) => (
  <div style={{ height:h, width:w, borderRadius:r, background:'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.5s infinite' }}/>
);

/* ── Badge statut RDV ── */
const APPT_STATUS = {
  SCHEDULED:   { l:'Planifié',  bg:'#EFF6FF', c:'#1D4ED8' },
  CONFIRMED:   { l:'Confirmé',  bg:'#DCFCE7', c:'#166534' },
  COMPLETED:   { l:'Terminé',   bg:'#F0FDFE', c:'#0D7A87' },
  CANCELLED:   { l:'Annulé',    bg:'#FEE2E2', c:'#991B1B' },
  NO_SHOW:     { l:'Absent',    bg:'#FEF3C7', c:'#B45309' },
};
const INV_STATUS = {
  DRAFT:       { l:'Brouillon', bg:'#F1F5F9', c:'#475569' },
  SENT:        { l:'Envoyée',   bg:'#EFF6FF', c:'#1D4ED8' },
  PAID:        { l:'Payée',     bg:'#DCFCE7', c:'#166534' },
  PARTIAL:     { l:'Partielle', bg:'#FEF3C7', c:'#B45309' },
  OVERDUE:     { l:'En retard', bg:'#FEE2E2', c:'#991B1B' },
  CANCELLED:   { l:'Annulée',   bg:'#F1F5F9', c:'#94A3B8' },
};

/* ════════════════════════════════════════════════════════════════════════════ */
const Dashboard = () => {
  const w = useW();
  const isMobile = w < 768;
  const isTablet = w >= 768 && w < 1024;

  const [kpi,    setKpi]    = useState(null);
  const [acts,   setActs]   = useState(null);
  const [chart,  setChart]  = useState([]);
  const [appts,  setAppts]  = useState([]);
  const [invs,   setInvs]   = useState([]);
  const [loading,setLoad]   = useState(true);
  const [err,    setErr]    = useState(null);
  const [activeTab, setTab] = useState('rdv'); // rdv | factures

  const load = async () => {
    setLoad(true); setErr(null);
    try {
      const { data } = await axios.get(`${API}/dashboard/overview`, authH());
      setKpi(data.kpi || null);
      setActs(data.recent_activities || null);
      setChart(buildChart(data.chart || [], data.chart || []));
      setAppts((data.appointments || []).slice(0, 8));
      setInvs((data.invoices || []).slice(0, 8));
    } catch (e) { setErr('Erreur de connexion'); }
    finally { setLoad(false); }
  };

  useEffect(() => { load(); }, []);

  /* Construire données graphique revenue sur 12 mois */
  const buildChart = (revenueData, patientData) => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const m = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const key = `${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,'0')}`;
      const revenue = revenueData.find(d => d.period === key);
      const patients = patientData.find(d => d.period === key);
      return {
        mois: MOIS[m.getMonth()],
        revenue: revenue?.amount || 0,
        patients: patients?.count || 0,
      };
    });
  };

  /* Répartition factures */
  const piePaid    = kpi?.invoices?.total && kpi?.invoices?.pending ? kpi.invoices.total - kpi.invoices.pending : 0;
  const pieUnpaid  = kpi?.invoices?.pending || 0;
  const pieData    = [{ name:'Payées', value:piePaid, color:C.green }, { name:'En attente', value:pieUnpaid, color:C.amber }];

  const cols2 = isMobile ? '1fr' : '1fr 1fr';
  const cols4 = isMobile ? 'repeat(2,1fr)' : isTablet ? 'repeat(2,1fr)' : 'repeat(4,1fr)';

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Bonjour' : now.getHours() < 18 ? 'Bon après-midi' : 'Bonsoir';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, maxWidth:1280, margin:'0 auto', paddingBottom:48 }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .dash-card{animation:fadeUp .4s ease both}
      `}</style>

      {/* ── En-tête ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:isMobile?20:26, color:'#0F172A', margin:0 }}>
            {greeting} 👋
          </h1>
          <p style={{ color:'#64748B', fontSize:13, margin:'3px 0 0', textTransform:'capitalize' }}>{today()}</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', background:'#DCFCE7', borderRadius:99, fontSize:11, fontWeight:700, color:'#166534', border:'1px solid #BBF7D0' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#22C55E' }}/>
            En ligne
          </div>
          <button onClick={load} disabled={loading}
            style={{ padding:'8px 14px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:600, color:'#475569' }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin .8s linear infinite' : 'none' }}/>
            {!isMobile && 'Actualiser'}
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="dash-card" style={{ display:'grid', gridTemplateColumns:cols4, gap:14 }}>
        <KPI label="Patients actifs"     value={kpi?.patients?.total || 0}       icon={Users}      color={C.teal}   trend={5.2}  trendLabel="vs mois dernier" loading={loading}/>
        <KPI label="RDV aujourd'hui"     value={kpi?.appointments?.today || 0}    icon={Calendar}   color={C.blue}   trend={0}    sub={`${kpi?.appointments?.monthly||0} ce mois`} loading={loading}/>
        <KPI label="Revenus du mois"     value={kpi?.revenue?.monthly || 0}       icon={TrendingUp} color={C.green}  format="currency" trend={12.5} trendLabel="en hausse" loading={loading}/>
        <KPI label="Factures impayées"   value={kpi?.invoices?.pending || 0}      icon={FileText}   color={C.coral}  trend={-3.1} trendLabel={kpi?.revenue?.outstanding ? fmt(kpi.revenue.outstanding) : undefined} loading={loading}/>
      </div>

      {/* ── KPI secondaires ── */}
      <div className="dash-card" style={{ display:'grid', gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)', gap:10, animationDelay:'.05s' }}>
        {[
          { label:'Revenus annuels',  value:kpi?.revenue?.yearly||0,         color:C.purple, icon:BarChart2,    fmt:'cur' },
          { label:'Montant impayé',   value:kpi?.revenue?.outstanding||0,     color:C.amber,  icon:AlertTriangle, fmt:'cur' },
          { label:'Traitements/mois', value:kpi?.treatments?.monthly||0,      color:C.teal,   icon:Activity,     fmt:'n' },
          { label:'Nouveaux patients',value:kpi?.patients?.recent||0,         color:C.pink,   icon:Users,        fmt:'n' },
        ].map((s,i) => (
          <div key={i} style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:`${s.color}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {loading ? <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${s.color}33`, borderTopColor:s.color, animation:'spin .8s linear infinite' }}/> : <s.icon size={16} color={s.color}/>}
            </div>
            <div>
              <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:16, color:'#0F172A' }}>
                {loading ? <Skel h={14} w={60}/> : s.fmt === 'cur' ? fmtK(s.value) + ' Ar' : s.value}
              </div>
              <div style={{ fontSize:11, color:'#64748B' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Graphiques revenue + patients ── */}
      <div className="dash-card" style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':isTablet?'1fr':'1.6fr 1fr', gap:16, animationDelay:'.1s' }}>

        {/* Area Chart Revenus */}
        <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'20px 20px 12px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:`${C.teal}15`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <TrendingUp size={17} color={C.teal}/>
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:'#0F172A' }}>Évolution des revenus</div>
                <div style={{ fontSize:11, color:'#94A3B8' }}>12 derniers mois</div>
              </div>
            </div>
            <div style={{ padding:'4px 10px', borderRadius:8, fontSize:11, fontWeight:700, background:C.teal, color:'#fff' }}>Mois</div>
          </div>
          <div style={{ marginBottom:8, fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:22, color:'#0F172A' }}>
            {loading ? <Skel h={22} w={160}/> : fmt(kpi?.revenue?.monthly || 0)}
            <span style={{ fontSize:12, fontWeight:600, color:C.green, marginLeft:8 }}>↑ ce mois</span>
          </div>
          {loading ? <Skel h={200} r={12}/> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chart} margin={{ top:4, right:4, bottom:0, left:0 }}>
                <defs>
                  <linearGradient id="gTeal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.teal}  stopOpacity={.15}/>
                    <stop offset="95%" stopColor={C.teal}  stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false}/>
                <XAxis dataKey="mois" fontSize={11} tickLine={false} axisLine={false} tick={{ fill:'#94A3B8' }}/>
                <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill:'#94A3B8' }} tickFormatter={fmtK} width={45}/>
                <Tooltip content={<TTip cur/>}/>
                <Area type="monotone" dataKey="revenue" name="Revenus" stroke={C.teal} strokeWidth={2.5} fill="url(#gTeal)" dot={false} activeDot={{ r:5, fill:C.teal, stroke:'#fff', strokeWidth:2 }}/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut chart factures */}
        <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'20px', boxShadow:'0 1px 4px rgba(0,0,0,.04)', display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:`${C.amber}15`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <PieChartIcon size={17} color={C.amber}/>
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color:'#0F172A' }}>État des factures</div>
              <div style={{ fontSize:11, color:'#94A3B8' }}>Payées vs impayées</div>
            </div>
          </div>
          {loading ? <Skel h={180} r={12}/> : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={4} dataKey="value" startAngle={90} endAngle={-270}>
                    {pieData.map((e,i) => <Cell key={i} fill={e.color} stroke="none"/>)}
                  </Pie>
                  <Tooltip formatter={(v,n) => [v, n]}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:8 }}>
                {pieData.map((d,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <div style={{ width:10, height:10, borderRadius:3, background:d.color }}/>
                      <span style={{ fontSize:12, color:'#475569' }}>{d.name}</span>
                    </div>
                    <span style={{ fontWeight:700, fontSize:13, color:'#0F172A' }}>{d.value}</span>
                  </div>
                ))}
                <div style={{ height:1, background:'#F1F5F9', margin:'4px 0' }}/>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, color:'#64748B' }}>Taux de recouvrement</span>
                  <span style={{ fontWeight:800, fontSize:13, color:C.green }}>
                    {piePaid + pieUnpaid > 0 ? Math.round((piePaid/(piePaid+pieUnpaid))*100) : 0}%
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Graphique bar patients par mois ── */}
      <div className="dash-card" style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'20px 20px 12px', boxShadow:'0 1px 4px rgba(0,0,0,.04)', animationDelay:'.15s' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:`${C.blue}15`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Users size={17} color={C.blue}/>
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:'#0F172A' }}>Activité mensuelle</div>
            <div style={{ fontSize:11, color:'#94A3B8' }}>Revenus et rendez-vous sur 12 mois</div>
          </div>
        </div>
        {loading ? <Skel h={180} r={12}/> : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chart} barSize={isMobile?10:18} margin={{ top:0, right:4, bottom:0, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false}/>
              <XAxis dataKey="mois" fontSize={11} tickLine={false} axisLine={false} tick={{ fill:'#94A3B8' }}/>
              <YAxis yAxisId="rev" orientation="left"  fontSize={10} tickLine={false} axisLine={false} tick={{ fill:'#94A3B8' }} tickFormatter={fmtK} width={42}/>
              <YAxis yAxisId="pat" orientation="right" fontSize={10} tickLine={false} axisLine={false} tick={{ fill:'#94A3B8' }} width={32}/>
              <Tooltip content={<TTip cur={false}/>}/>
              <Bar yAxisId="rev" dataKey="revenue"  name="Revenus (Ar)" fill={C.teal}  radius={[6,6,0,0]} fillOpacity={.85}/>
              <Bar yAxisId="pat" dataKey="patients" name="Patients"      fill={C.blue}  radius={[6,6,0,0]} fillOpacity={.75}/>
            </BarChart>
          </ResponsiveContainer>
        )}
        <div style={{ display:'flex', gap:16, justifyContent:'center', marginTop:8 }}>
          {[{c:C.teal,l:'Revenus'},{c:C.blue,l:'Patients'}].map(x=>(
            <div key={x.l} style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:10, height:10, borderRadius:3, background:x.c }}/>
              <span style={{ fontSize:11, color:'#64748B' }}>{x.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tableau RDV + Factures ── */}
      <div className="dash-card" style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.04)', animationDelay:'.2s' }}>
        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid #F1F5F9' }}>
          {[
            { k:'rdv',      l:'📅 Rendez-vous récents',   n:appts.length },
            { k:'factures', l:'🧾 Factures en attente',    n:invs.length },
          ].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              style={{ flex:1, padding:'13px 16px', border:'none', background:'transparent', cursor:'pointer', fontWeight:600, fontSize:13, color:activeTab===t.k?C.teal:'#64748B', borderBottom:activeTab===t.k?`2px solid ${C.teal}`:'2px solid transparent', transition:'all .2s' }}>
              {t.l} <span style={{ background:activeTab===t.k?'#F0FDFE':'#F1F5F9', color:activeTab===t.k?C.teal:'#94A3B8', borderRadius:99, padding:'1px 7px', fontSize:11, fontWeight:700, marginLeft:4 }}>{t.n}</span>
            </button>
          ))}
        </div>

        {/* Tab RDV */}
        {activeTab === 'rdv' && (
          loading ? (
            <div style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>
              {Array(5).fill(0).map((_,i) => <Skel key={i} h={52} r={10}/>)}
            </div>
          ) : appts.length === 0 ? (
            <div style={{ padding:'40px', textAlign:'center', color:'#94A3B8' }}>
              <Calendar size={36} style={{ margin:'0 auto 10px', opacity:.3 }}/>
              <p style={{ margin:0 }}>Aucun rendez-vous</p>
            </div>
          ) : (
            <div>
              {appts.map((a, idx) => {
                const st = APPT_STATUS[a.status] || APPT_STATUS.SCHEDULED;
                return (
                  <div key={a.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', borderBottom:idx<appts.length-1?'1px solid #F8FAFC':'none', flexWrap:'wrap', gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:`${C.blue}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Calendar size={15} color={C.blue}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:13, color:'#0F172A' }}>
                        {a.patient?.first_name} {a.patient?.last_name}
                      </div>
                      <div style={{ fontSize:11, color:'#64748B' }}>
                        {a.appointment_date} {a.start_time && `· ${a.start_time.slice(0,5)}`}
                        {a.reason && ` · ${a.reason}`}
                      </div>
                    </div>
                    <span style={{ background:st.bg, color:st.c, borderRadius:99, padding:'3px 10px', fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>
                      {st.l}
                    </span>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Tab Factures */}
        {activeTab === 'factures' && (
          loading ? (
            <div style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>
              {Array(5).fill(0).map((_,i) => <Skel key={i} h={52} r={10}/>)}
            </div>
          ) : invs.length === 0 ? (
            <div style={{ padding:'40px', textAlign:'center', color:'#94A3B8' }}>
              <FileText size={36} style={{ margin:'0 auto 10px', opacity:.3 }}/>
              <p style={{ margin:0 }}>Aucune facture en attente</p>
            </div>
          ) : (
            <div>
              {invs.map((inv, idx) => {
                const st = INV_STATUS[inv.status] || INV_STATUS.DRAFT;
                return (
                  <div key={inv.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', borderBottom:idx<invs.length-1?'1px solid #F8FAFC':'none', flexWrap:'wrap', gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:'#FFFBEB', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <FileText size={15} color={C.amber}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:13, color:'#0F172A' }}>
                        {inv.invoice_number} · {inv.patient?.first_name} {inv.patient?.last_name}
                      </div>
                      <div style={{ fontSize:11, color:'#64748B' }}>
                        Créée le {inv.invoice_date || inv.created_at?.slice(0,10)}
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontWeight:800, fontSize:14, color:'#0F172A' }}>{fmt(inv.total_mga)}</div>
                      <span style={{ background:st.bg, color:st.c, borderRadius:99, padding:'2px 8px', fontSize:10, fontWeight:700 }}>{st.l}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* ── Activité récente ── */}
      <div className="dash-card" style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.04)', animationDelay:'.25s' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:`${C.purple}15`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Clock size={16} color={C.purple}/>
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:'#0F172A' }}>Activité récente</div>
            <div style={{ fontSize:11, color:'#94A3B8' }}>Dernières actions dans le système</div>
          </div>
        </div>
        {loading ? (
          <div style={{ padding:16, display:'flex', flexDirection:'column', gap:8 }}>
            {Array(6).fill(0).map((_,i) => <Skel key={i} h={44} r={10}/>)}
          </div>
        ) : (
          <div style={{ padding:'8px 12px' }}>
            {[
              ...(acts?.recent_patients||[]).map(p => ({
                type:'patient', icon:'👤', color:C.blue,
                label:`Nouveau patient : ${p.first_name} ${p.last_name}`,
                time: fdate(p.created_at),
              })),
              ...(acts?.recent_invoices||[]).map(i => ({
                type:'invoice', icon:'🧾', color:C.green,
                label:`Facture ${i.invoice_number} — ${fmt(i.total_mga)}`,
                time: fdate(i.created_at),
                badge: INV_STATUS[i.status]?.l,
                badgeBg: INV_STATUS[i.status]?.bg,
                badgeC: INV_STATUS[i.status]?.c,
              })),
              ...(acts?.recent_appointments||[]).map(a => ({
                type:'appointment', icon:'📅', color:C.purple,
                label:`RDV — ${a.patient?.first_name} ${a.patient?.last_name}`,
                time: fdate(a.created_at),
                badge: APPT_STATUS[a.status]?.l,
                badgeBg: APPT_STATUS[a.status]?.bg,
                badgeC: APPT_STATUS[a.status]?.c,
              })),
              ...(acts?.recent_payments||[]).map(p => ({
                type:'payment', icon:'💳', color:C.green,
                label:`Paiement reçu — ${fmt(p.amount_mga)}`,
                time: fdate(p.payment_date || p.created_at),
              })),
            ]
            .sort((a,b) => new Date(b.time) - new Date(a.time))
            .slice(0, 10)
            .map((item, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:10, transition:'background .15s' }}
                onMouseOver={e=>e.currentTarget.style.background='#F8FAFC'}
                onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                <div style={{ width:30, height:30, borderRadius:9, background:`${item.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
                  {item.icon}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#0F172A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.label}</div>
                </div>
                {item.badge && (
                  <span style={{ background:item.badgeBg, color:item.badgeC, borderRadius:99, padding:'2px 8px', fontSize:10, fontWeight:700, whiteSpace:'nowrap' }}>{item.badge}</span>
                )}
                <span style={{ fontSize:11, color:'#94A3B8', whiteSpace:'nowrap', flexShrink:0 }}>{item.time}</span>
              </div>
            ))}
            {(!acts || (acts.recent_patients?.length === 0 && acts.recent_invoices?.length === 0 && acts.recent_appointments?.length === 0)) && (
              <div style={{ textAlign:'center', padding:'28px', color:'#94A3B8', fontSize:13 }}>Aucune activité récente</div>
            )}
          </div>
        )}
      </div>

      {/* ── Accès rapides ── */}
      <div className="dash-card" style={{ animationDelay:'.3s' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:1.5, marginBottom:12 }}>Accès rapides</div>
        <div style={{ display:'grid', gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)', gap:10 }}>
          {[
            { icon:'👤', l:'Nouveau patient',   c:C.blue,   href:'/patients' },
            { icon:'📅', l:'Nouveau RDV',        c:C.purple, href:'/appointments' },
            { icon:'🧾', l:'Nouvelle facture',   c:C.green,  href:'/invoices' },
            { icon:'📦', l:'Vérifier le stock',  c:C.coral,  href:'/inventory' },
          ].map(a => (
            <a key={a.l} href={a.href}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'13px 16px', borderRadius:13, border:'1.5px solid #E2E8F0', background:'#fff', textDecoration:'none', transition:'all .2s' }}
              onMouseOver={e=>{e.currentTarget.style.borderColor=a.c;e.currentTarget.style.background=`${a.c}08`;}}
              onMouseOut={e=>{e.currentTarget.style.borderColor='#E2E8F0';e.currentTarget.style.background='#fff';}}>
              <div style={{ width:34, height:34, borderRadius:10, background:`${a.c}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, flexShrink:0 }}>{a.icon}</div>
              <span style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>{a.l}</span>
            </a>
          ))}
        </div>
      </div>

      {err && (
        <div style={{ background:'#FEE2E2', border:'1px solid #FECACA', borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:10 }}>
          <AlertTriangle size={16} color="#EF4444"/>
          <span style={{ fontSize:13, color:'#991B1B', fontWeight:600 }}>{err}</span>
          <button onClick={load} style={{ marginLeft:'auto', padding:'5px 12px', borderRadius:8, background:'#EF4444', color:'#fff', border:'none', cursor:'pointer', fontSize:12, fontWeight:700 }}>Réessayer</button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
