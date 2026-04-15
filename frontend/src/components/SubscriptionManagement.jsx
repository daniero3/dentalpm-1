import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../App';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  CreditCard, Download, RefreshCw, Crown, Zap, Users,
  TrendingUp, AlertCircle, CheckCircle, Clock, X,
  BarChart2, Settings, LogOut, FileText, ChevronRight,
  ArrowUpRight, ArrowDownRight, Shield, Database, Activity
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : 'https://dentalpm-1-production.up.railway.app/api';

const authH = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const fmt  = n  => new Intl.NumberFormat('fr-MG').format(n || 0);
const fdate = d => d ? new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' }) : '—';

const PLAN_PRICES = { ESSENTIAL: 149000, PRO: 199000, GROUP: 299000 };
const PLAN_COLORS = {
  ESSENTIAL: { bg:'#EFF6FF', border:'#BFDBFE', text:'#1D4ED8', icon:'#3B82F6' },
  PRO:       { bg:'#F0FDFE', border:'#7DD3DA', text:'#0D7A87', icon:'#0D7A87' },
  GROUP:     { bg:'#EDE9FE', border:'#C4B5FD', text:'#6D28D9', icon:'#8B5CF6' },
  TRIAL:     { bg:'#FFFBEB', border:'#FDE68A', text:'#B45309', icon:'#F59E0B' },
};
const PLAN_ICONS = { ESSENTIAL: Users, PRO: Zap, GROUP: Crown };
const STATUS_CFG = {
  ACTIVE:       { label:'Actif',       bg:'#DCFCE7', text:'#166534', dot:'#22C55E' },
  TRIAL:        { label:'Essai',       bg:'#DBEAFE', text:'#1E40AF', dot:'#3B82F6' },
  EXPIRED:      { label:'Expiré',      bg:'#FEE2E2', text:'#991B1B', dot:'#EF4444' },
  TRIAL_EXPIRED:{ label:'Essai exp.',  bg:'#FEE2E2', text:'#991B1B', dot:'#EF4444' },
  CANCELLED:    { label:'Annulé',      bg:'#F1F5F9', text:'#475569', dot:'#94A3B8' },
};
const TX_STATUS = {
  PENDING:  { label:'En attente', bg:'#FEF3C7', text:'#B45309' },
  VERIFIED: { label:'Payé',       bg:'#DCFCE7', text:'#166534' },
  REJECTED: { label:'Rejeté',     bg:'#FEE2E2', text:'#991B1B' },
};

const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
const PIE_PALETTE = ['#0D7A87', '#8B5CF6', '#3B82F6', '#F59E0B'];

/* ── Badge statut ── */
const StatusBadge = ({ status, cfg }) => {
  const c = cfg || STATUS_CFG[status] || STATUS_CFG.CANCELLED;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:99, background:c.bg, fontSize:11, fontWeight:700, color:c.text, whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:c.dot || c.text, flexShrink:0 }}/>
      {c.label}
    </span>
  );
};

/* ── Barre de progression ── */
const ProgressBar = ({ value, max, color='#0D7A87', label, sub }) => {
  const pct = Math.min(100, Math.round((value / (max || 1)) * 100));
  const warn = pct >= 80;
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
        <span style={{ fontSize:12, fontWeight:600, color:'#475569' }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:700, color: warn ? '#EF4444' : '#0F172A' }}>
          {sub || `${fmt(value)} / ${fmt(max)}`}
        </span>
      </div>
      <div style={{ height:7, background:'#F1F5F9', borderRadius:99, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background: warn ? '#EF4444' : color, borderRadius:99, transition:'width .6s ease' }}/>
      </div>
      <div style={{ textAlign:'right', fontSize:10, color: warn ? '#EF4444' : '#94A3B8', marginTop:3 }}>{pct}%</div>
    </div>
  );
};

/* ── KPI Card ── */
const KpiCard = ({ label, value, sub, trend, icon: Icon, color='#0D7A87' }) => (
  <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', padding:'16px 18px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
      <div style={{ fontSize:12, fontWeight:600, color:'#64748B' }}>{label}</div>
      {Icon && <div style={{ width:34, height:34, borderRadius:10, background:`${color}14`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={16} color={color}/>
      </div>}
    </div>
    <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:22, color:'#0F172A', lineHeight:1, marginBottom:4 }}>{value}</div>
    {sub && (
      <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color: trend === 'up' ? '#16A34A' : trend === 'down' ? '#DC2626' : '#94A3B8' }}>
        {trend === 'up' && <ArrowUpRight size={12}/>}
        {trend === 'down' && <ArrowDownRight size={12}/>}
        {sub}
      </div>
    )}
  </div>
);

/* ── Avatar initiales ── */
const Avatar = ({ name, size=32 }) => {
  const initials = (name || 'X').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const colors = ['#0D7A87','#7C3AED','#1D4ED8','#059669','#D97706','#DC2626'];
  const color  = colors[initials.charCodeAt(0) % colors.length];
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:`${color}18`, border:`1.5px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.36, fontWeight:700, color, flexShrink:0 }}>
      {initials}
    </div>
  );
};


/* ════════════════════════════════════════════════════════
   VUE UTILISATEUR
════════════════════════════════════════════════════════ */
const UserView = ({ user }) => {
  const [status,   setStatus]   = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('overview');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        axios.get(`${API}/billing/status`,           authH()),
        axios.get(`${API}/billing/payment-requests`, authH()),
      ]);
      setStatus(s.data);
      setPayments(p.data.paymentRequests || []);
    } catch { toast.error('Erreur chargement abonnement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const plan    = status?.plan || 'PRO';
  const pc      = PLAN_COLORS[plan] || PLAN_COLORS.PRO;
  const Icon    = PLAN_ICONS[plan] || Zap;
  const sc      = STATUS_CFG[status?.status] || STATUS_CFG.ACTIVE;
  const daysLeft = status?.days_remaining ?? null;
  const formatDaysLeft = (d) => {
    if (d === null) return '—';
    if (d === 0) return 'Aujourd\'hui';
    if (d <= 30) return `${d} j`;
    const months = Math.floor(d / 30);
    const days   = d % 30;
    return days > 0 ? `${months} mois ${days}j` : `${months} mois`;
  };

  const SIDEBAR_ITEMS = [
    { id:'overview',  label:'Vue d\'ensemble',  icon:BarChart2 },
    { id:'usage',     label:'Utilisation',       icon:Database  },
    { id:'payment',   label:'Paiement',          icon:CreditCard},
    { id:'invoices',  label:'Factures',          icon:FileText  },
  ];

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:400 }}>
      <div style={{ width:36, height:36, border:'3px solid #E2E8F0', borderTopColor:'#0D7A87', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:20 }}>

      {/* ── Sidebar ── */}
      <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'16px 12px', height:'fit-content', position:'sticky', top:20 }}>
        {/* Profil */}
        <div style={{ padding:'12px', marginBottom:12, borderBottom:'1px solid #F1F5F9' }}>
          <Avatar name={user?.full_name || 'User'} size={40}/>
          <div style={{ marginTop:8 }}>
            <div style={{ fontWeight:700, fontSize:13, color:'#0F172A' }}>{user?.full_name || 'Utilisateur'}</div>
            <div style={{ fontSize:11, color:'#94A3B8' }}>{user?.email || user?.username || ''}</div>
            <StatusBadge status={status?.status || 'ACTIVE'}/>
          </div>
        </div>

        {/* Navigation */}
        {SIDEBAR_ITEMS.map(item => {
          const Ico = item.icon;
          const active = tab === item.id;
          return (
            <button key={item.id} onClick={() => setTab(item.id)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'9px 11px', borderRadius:10, border:'none', cursor:'pointer', marginBottom:3, background:active?'#F0FDFE':'transparent', color:active?'#0D7A87':'#475569', fontWeight:active?700:500, fontSize:13, transition:'all .15s' }}
              onMouseOver={e=>{ if(!active) e.currentTarget.style.background='#F8FAFC'; }}
              onMouseOut={e=>{ if(!active) e.currentTarget.style.background='transparent'; }}>
              <Ico size={15} color={active?'#0D7A87':'#94A3B8'}/> {item.label}
            </button>
          );
        })}

        {/* Lien renouvellement */}
        <div style={{ marginTop:12, padding:'10px 12px', borderRadius:10, background:'#FFF7ED', border:'1px solid #FED7AA' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#C2410C', marginBottom:4 }}>
            {daysLeft !== null ? (daysLeft <= 7 ? `⚠️ Expire dans ${daysLeft}j` : `Expire dans ${formatDaysLeft(daysLeft)}`) : 'Abonnement actif'}
          </div>
          <a href="/payment" style={{ fontSize:11, fontWeight:700, color:'#EA580C', textDecoration:'none', display:'flex', alignItems:'center', gap:3 }}>
            Renouveler <ChevronRight size={10}/>
          </a>
        </div>
      </div>

      {/* ── Contenu principal ── */}
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* Carte abonnement */}
        {(tab === 'overview') && (
          <>
            <div style={{ background:`linear-gradient(135deg,${pc.bg},#fff)`, borderRadius:20, border:`1.5px solid ${pc.border}`, padding:'22px 24px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:48, height:48, borderRadius:14, background:`${pc.icon}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon size={22} color={pc.icon}/>
                  </div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:pc.text, textTransform:'uppercase', letterSpacing:'.08em' }}>Mon abonnement</div>
                    <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:24, color:'#0F172A' }}>Plan {plan}</div>
                  </div>
                </div>
                <StatusBadge status={status?.status || 'ACTIVE'}/>
              </div>

              <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:16 }}>
                <span style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:36, color:'#0F172A' }}>{fmt(PLAN_PRICES[plan] || 199000)}</span>
                <span style={{ fontSize:14, color:'#64748B' }}>Ar / mois</span>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, background:'rgba(255,255,255,.7)', borderRadius:12, padding:'12px 14px', marginBottom:12 }}>
                {[
                  { label:'Praticiens',  value: plan==='GROUP'?'Illimités': plan==='PRO'?'5':'1' },
                  { label:'Patients',    value: plan==='ESSENTIAL'?'500':'Illimités' },
                  { label:'Durée rest.', value: formatDaysLeft(daysLeft) },
                ].map((s,i) => (
                  <div key={i} style={{ textAlign:'center', borderRight:i<2?'1px solid #E2E8F0':'none' }}>
                    <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:18, color:pc.icon }}>{s.value}</div>
                    <div style={{ fontSize:11, color:'#64748B' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {status?.end_date && (
                <div style={{ fontSize:12, color:'#64748B', display:'flex', alignItems:'center', gap:5 }}>
                  <Clock size={12}/> Renouvellement le {fdate(status.end_date)}
                </div>
              )}
            </div>

            {/* Moyen de paiement */}
            <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'18px 20px' }}>
              <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A', marginBottom:14 }}>Moyen de paiement</div>
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'#F8FAFC', borderRadius:12, border:'1px solid #E2E8F0' }}>
                <div style={{ width:44, height:28, borderRadius:6, background:'linear-gradient(135deg,#1e3a5f,#0D7A87)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <CreditCard size={14} color="#fff"/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>MVola / Orange Money</div>
                  <div style={{ fontSize:11, color:'#94A3B8' }}>Paiement mobile Madagascar</div>
                </div>
                <span style={{ padding:'3px 9px', borderRadius:99, background:'#DCFCE7', fontSize:11, fontWeight:700, color:'#166534' }}>Actif</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:10 }}>
                {[
                  { name:'MVola',        color:'#E30613', num:'034 XX XXX XX' },
                  { name:'Orange Money', color:'#FF6600', num:'032 XX XXX XX' },
                  { name:'Airtel Money', color:'#E4002B', num:'033 XX XXX XX' },
                  { name:'Virement BNI', color:'#1A3A5C', num:'RIB sur demande' },
                ].map(p => (
                  <div key={p.name} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'#F8FAFC', borderRadius:9, border:'1px solid #E2E8F0' }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:p.color, flexShrink:0 }}/>
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:p.color }}>{p.name}</div>
                      <div style={{ fontSize:10, color:'#94A3B8' }}>{p.num}</div>
                    </div>
                  </div>
                ))}
              </div>
              <a href="/payment"
                style={{ display:'block', marginTop:12, padding:'10px', borderRadius:11, background:'linear-gradient(135deg,#0D7A87,#13A3B4)', color:'#fff', fontWeight:700, fontSize:13, textDecoration:'none', textAlign:'center' }}>
                Payer / Renouveler mon abonnement
              </a>
            </div>
          </>
        )}

        {/* Utilisation */}
        {(tab === 'overview' || tab === 'usage') && (
          <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'18px 20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A' }}>Utilisation des ressources</div>
              <Activity size={16} color="#94A3B8"/>
            </div>
            <ProgressBar label="Patients actifs"       value={247} max={plan==='ESSENTIAL'?500:999} color="#0D7A87" sub={plan==='ESSENTIAL'?`247 / 500`:'247 / Illimité'}/>
            <ProgressBar label="Ordonnances ce mois"   value={85}  max={100}  color="#F59E0B"/>
            <ProgressBar label="Rendez-vous ce mois"   value={62}  max={120}  color="#8B5CF6"/>
            <ProgressBar label="Stockage documents"    value={2.1} max={10}   color="#10B981" sub="2,1 Go / 10 Go"/>
          </div>
        )}

        {/* Factures */}
        {(tab === 'overview' || tab === 'invoices') && (
          <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'18px 20px' }}>
            <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A', marginBottom:14 }}>Historique des paiements</div>
            {payments.length === 0 ? (
              <div style={{ textAlign:'center', padding:'32px', color:'#94A3B8' }}>
                <FileText size={32} style={{ margin:'0 auto 8px', display:'block', opacity:.3 }}/>
                <p style={{ margin:0, fontSize:13 }}>Aucune transaction</p>
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'#F8FAFC' }}>
                      {['Référence','Plan','Montant','Date','Méthode','Statut','PDF'].map(h => (
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:11, fontWeight:600, color:'#64748B', textTransform:'uppercase', letterSpacing:'.05em', borderBottom:'1px solid #E2E8F0', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, i) => {
                      const tx = TX_STATUS[p.status] || TX_STATUS.PENDING;
                      return (
                        <tr key={p.id} style={{ borderBottom:i<payments.length-1?'1px solid #F8FAFC':'none' }}
                          onMouseOver={e=>e.currentTarget.style.background='#FAFBFC'}
                          onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                          <td style={{ padding:'11px 12px', fontFamily:'monospace', fontSize:11, color:'#64748B' }}>{p.reference || `#${p.id?.slice(-6)}`}</td>
                          <td style={{ padding:'11px 12px' }}><span style={{ background:PLAN_COLORS[p.plan_code]?.bg || '#F1F5F9', color:PLAN_COLORS[p.plan_code]?.text || '#475569', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>{p.plan_code || '—'}</span></td>
                          <td style={{ padding:'11px 12px', fontWeight:700, color:'#0F172A' }}>{fmt(p.amount_mga)} Ar</td>
                          <td style={{ padding:'11px 12px', color:'#64748B', fontSize:12 }}>{fdate(p.created_at)}</td>
                          <td style={{ padding:'11px 12px', color:'#475569', fontSize:12 }}>{p.payment_method || '—'}</td>
                          <td style={{ padding:'11px 12px' }}>
                            <span style={{ background:tx.bg, color:tx.text, padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>{tx.label}</span>
                          </td>
                          <td style={{ padding:'11px 12px' }}>
                            <button
                              style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:7, border:'1px solid #E2E8F0', background:'#fff', cursor:'pointer', fontSize:11, fontWeight:600, color:'#475569' }}
                              onMouseOver={e=>{e.currentTarget.style.borderColor='#0D7A87';e.currentTarget.style.color='#0D7A87';}}
                              onMouseOut={e=>{e.currentTarget.style.borderColor='#E2E8F0';e.currentTarget.style.color='#475569';}}>
                              <Download size={11}/> PDF
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


/* ════════════════════════════════════════════════════════
   VUE ADMINISTRATEUR
════════════════════════════════════════════════════════ */
const AdminView = () => {
  const [data,    setData]    = useState(null);
  const [txs,     setTxs]     = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rev, tx] = await Promise.all([
        axios.get(`${API}/admin/revenue`,          authH()),
        axios.get(`${API}/admin/payment-requests`, authH()),
      ]);
      setData(rev.data);
      setTxs(tx.data.paymentRequests || tx.data || []);
    } catch { toast.error('Erreur chargement données admin'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const approve = async (id, plan) => {
    try {
      await axios.patch(`${API}/admin/payment-requests/${id}/approve`, { plan }, authH());
      toast.success('Abonnement activé');
      fetchData();
    } catch { toast.error('Erreur approbation'); }
  };

  const reject = async id => {
    try {
      await axios.patch(`${API}/admin/payment-requests/${id}/reject`, { reason: 'Rejeté par admin' }, authH());
      toast.success('Paiement rejeté');
      fetchData();
    } catch { toast.error('Erreur rejet'); }
  };

  // Construire les données pour le graphique revenus (6 derniers mois)
  const revenueChartData = (() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      return {
        name: MONTHS_FR[d.getMonth()],
        MRR:  Math.round((data?.mrr || 0) * (0.6 + i * 0.08)),
      };
    });
  })();

  const pieData = data?.byPlan
    ? Object.entries(data.byPlan).filter(([,v]) => v > 0).map(([k,v]) => ({ name:k, value:v }))
    : [{ name:'PRO', value:3 }, { name:'ESSENTIAL', value:2 }, { name:'GROUP', value:1 }];

  const totalClinics = (data?.byPlan?.ESSENTIAL||0) + (data?.byPlan?.PRO||0) + (data?.byPlan?.GROUP||0) + (data?.byPlan?.TRIAL||0);
  const churnRate   = totalClinics > 0 ? ((data?.pendingCount||0) / (totalClinics + 1) * 100).toFixed(1) : '0.0';

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:400 }}>
      <div style={{ width:36, height:36, border:'3px solid #E2E8F0', borderTopColor:'#0D7A87', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:20, color:'#0F172A', margin:0 }}>Dashboard Revenus</h2>
          <p style={{ color:'#64748B', fontSize:13, margin:0 }}>DPM Madagascar — Supervision abonnements</p>
        </div>
        <button onClick={fetchData}
          style={{ padding:'8px 14px', borderRadius:10, border:'1px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:600, color:'#475569' }}>
          <RefreshCw size={13}/> Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        <KpiCard label="MRR (revenus mensuels)"  value={`${fmt(data?.mrr)} Ar`}    sub="Abonnements actifs"        trend="up"   icon={TrendingUp}   color="#0D7A87"/>
        <KpiCard label="ARR (projection annuelle)" value={`${fmt(data?.arr)} Ar`}   sub="×12 du MRR"               trend="up"   icon={BarChart2}    color="#7C3AED"/>
        <KpiCard label="Cabinets actifs"           value={data?.activeClinics || 0}  sub={`Trial: ${data?.byPlan?.TRIAL||0}`}     icon={Users}        color="#10B981"/>
        <KpiCard label="Paiements en attente"      value={data?.pendingCount || 0}   sub={data?.pendingCount > 0 ? 'À valider' : 'Tout est à jour'} trend={data?.pendingCount > 0 ? 'down' : undefined} icon={Clock} color={data?.pendingCount > 0 ? '#EF4444' : '#64748B'}/>
      </div>

      {/* Graphiques */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:14 }}>

        {/* Courbe revenus */}
        <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'18px 20px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A' }}>Évolution MRR</div>
            <div style={{ display:'flex', gap:12, fontSize:11, color:'#94A3B8' }}>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:3, borderRadius:2, background:'#0D7A87', display:'inline-block' }}/> MRR</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={revenueChartData} margin={{ top:5, right:10, left:0, bottom:5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false}/>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize:11, fill:'#94A3B8' }}/>
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize:10, fill:'#94A3B8' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`}/>
              <Tooltip
                contentStyle={{ borderRadius:10, border:'1px solid #E2E8F0', boxShadow:'0 8px 24px rgba(0,0,0,.08)', fontSize:12 }}
                formatter={v => [`${fmt(v)} Ar`, 'MRR']}/>
              <Line type="monotone" dataKey="MRR" stroke="#0D7A87" strokeWidth={2.5} dot={{ r:4, fill:'#0D7A87', strokeWidth:0 }} activeDot={{ r:6 }}/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Donut plans */}
        <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'18px 20px' }}>
          <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A', marginBottom:16 }}>Répartition des plans</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]}/>)}
              </Pie>
              <Tooltip formatter={v => [`${v} cabinet${v>1?'s':''}`, '']}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:8 }}>
            {pieData.map((d, i) => (
              <div key={d.name} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#475569' }}>
                <span style={{ width:10, height:10, borderRadius:2, background:PIE_PALETTE[i % PIE_PALETTE.length], flexShrink:0 }}/>
                <span style={{ fontWeight:600 }}>{d.name}</span>
                <span style={{ color:'#94A3B8' }}>({d.value})</span>
              </div>
            ))}
          </div>

          {/* Churn + clinics */}
          <div style={{ marginTop:14, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div style={{ background:'#F8FAFC', borderRadius:10, padding:'10px', textAlign:'center' }}>
              <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:18, color:'#EF4444' }}>{churnRate}%</div>
              <div style={{ fontSize:10, color:'#94A3B8' }}>Taux churn estimé</div>
            </div>
            <div style={{ background:'#F8FAFC', borderRadius:10, padding:'10px', textAlign:'center' }}>
              <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:18, color:'#0D7A87' }}>{totalClinics}</div>
              <div style={{ fontSize:10, color:'#94A3B8' }}>Cabinets totaux</div>
            </div>
          </div>
        </div>
      </div>

      {/* Paiements en attente */}
      {(data?.pendingPayments || []).length > 0 && (
        <div style={{ background:'#fff', borderRadius:18, border:'2px solid #FED7AA', padding:'18px 20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <AlertCircle size={16} color="#F59E0B"/>
            <span style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A' }}>
              Paiements en attente ({data.pendingPayments.length})
            </span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {data.pendingPayments.map(p => (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'#FFFBEB', borderRadius:12, border:'1px solid #FDE68A', flexWrap:'wrap' }}>
                <Avatar name={p.clinic_name || 'Cabinet'} size={36}/>
                <div style={{ flex:1, minWidth:120 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'#0F172A' }}>{p.clinic_name || 'Cabinet inconnu'}</div>
                  <div style={{ fontSize:11, color:'#64748B' }}>{p.payment_method} — {fmt(p.amount_mga)} Ar</div>
                  <div style={{ fontSize:10, color:'#94A3B8' }}>{fdate(p.created_at)}</div>
                </div>
                <span style={{ background:PLAN_COLORS[p.plan_code]?.bg||'#F1F5F9', color:PLAN_COLORS[p.plan_code]?.text||'#475569', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>{p.plan_code||'—'}</span>
                <div style={{ display:'flex', gap:7 }}>
                  <button onClick={() => approve(p.id, p.plan_code)}
                    style={{ padding:'6px 14px', borderRadius:9, background:'#0D7A87', color:'#fff', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                    <CheckCircle size={12}/> Approuver
                  </button>
                  <button onClick={() => reject(p.id)}
                    style={{ padding:'6px 14px', borderRadius:9, background:'#FEE2E2', color:'#991B1B', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                    <X size={12}/> Rejeter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tableau transactions */}
      <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'18px 20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
          <div>
            <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A' }}>Dernières transactions</div>
            <div style={{ fontSize:12, color:'#94A3B8' }}>{txs.length} paiement{txs.length>1?'s':''} récents</div>
          </div>
        </div>
        {txs.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px', color:'#94A3B8' }}>
            <FileText size={32} style={{ margin:'0 auto 8px', display:'block', opacity:.3 }}/>
            <p style={{ margin:0, fontSize:13 }}>Aucune transaction</p>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'#F8FAFC' }}>
                  {['ID','Client','Plan','Montant','Date','Méthode','Statut','Actions'].map(h => (
                    <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.06em', borderBottom:'1px solid #E2E8F0', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txs.slice(0, 15).map((tx, i) => {
                  const ts = TX_STATUS[tx.status] || TX_STATUS.PENDING;
                  return (
                    <tr key={tx.id} style={{ borderBottom:i < Math.min(txs.length,15)-1 ? '1px solid #F8FAFC' : 'none' }}
                      onMouseOver={e=>e.currentTarget.style.background='#FAFBFC'}
                      onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:11, color:'#94A3B8' }}>#{tx.id?.slice(-6) || '—'}</td>
                      <td style={{ padding:'10px 12px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <Avatar name={tx.clinic_name || 'Cabinet'} size={28}/>
                          <div>
                            <div style={{ fontWeight:600, fontSize:12, color:'#0F172A' }}>{tx.clinic_name || 'Cabinet'}</div>
                            <div style={{ fontSize:10, color:'#94A3B8' }}>{tx.reference || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        <span style={{ background:PLAN_COLORS[tx.plan_code]?.bg||'#F1F5F9', color:PLAN_COLORS[tx.plan_code]?.text||'#475569', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>{tx.plan_code||'—'}</span>
                      </td>
                      <td style={{ padding:'10px 12px', fontWeight:700, color:'#0F172A', whiteSpace:'nowrap' }}>{fmt(tx.amount_mga)} Ar</td>
                      <td style={{ padding:'10px 12px', color:'#64748B', fontSize:11 }}>{fdate(tx.created_at)}</td>
                      <td style={{ padding:'10px 12px', color:'#475569', fontSize:11 }}>{tx.payment_method || '—'}</td>
                      <td style={{ padding:'10px 12px' }}>
                        <span style={{ background:ts.bg, color:ts.text, padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>{ts.label}</span>
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        {tx.status === 'PENDING' && (
                          <div style={{ display:'flex', gap:5 }}>
                            <button onClick={() => approve(tx.id, tx.plan_code)}
                              style={{ padding:'4px 8px', borderRadius:6, background:'#DCFCE7', color:'#166534', border:'none', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                              ✓
                            </button>
                            <button onClick={() => reject(tx.id)}
                              style={{ padding:'4px 8px', borderRadius:6, background:'#FEE2E2', color:'#991B1B', border:'none', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                              ✕
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};


/* ════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
════════════════════════════════════════════════════════ */
const SubscriptionManagement = () => {
  const { user } = useAuth();
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role);
  const [activeTab, setActiveTab] = useState(isAdmin ? 'admin' : 'user');

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', paddingBottom:48, fontFamily:'DM Sans, sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:13, background:'linear-gradient(135deg,#0D7A87,#13A3B4)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(13,122,135,.28)' }}>
            <Shield size={20} color="#fff"/>
          </div>
          <div>
            <h1 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:20, color:'#0F172A', margin:0 }}>Gestion Abonnement</h1>
            <p style={{ color:'#64748B', fontSize:13, margin:0 }}>DPM Madagascar SaaS</p>
          </div>
        </div>

        {/* Toggle user/admin si SUPER_ADMIN */}
        {isAdmin && (
          <div style={{ display:'flex', gap:4, background:'#F1F5F9', borderRadius:11, padding:4, border:'1px solid #E2E8F0' }}>
            {[{ id:'user', label:'Vue client' }, { id:'admin', label:'Vue admin' }].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{ padding:'7px 16px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background:activeTab===t.id?'#fff':'transparent', color:activeTab===t.id?'#0D7A87':'#64748B', boxShadow:activeTab===t.id?'0 1px 4px rgba(0,0,0,.08)':'none', transition:'all .15s' }}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Contenu */}
      {activeTab === 'user'  && <UserView  user={user}/>}
      {activeTab === 'admin' && <AdminView/>}
    </div>
  );
};

export default SubscriptionManagement;
