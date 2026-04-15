import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../App';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
  CreditCard, Download, RefreshCw, Crown, Zap, Users,
  TrendingUp, AlertCircle, CheckCircle, Clock, X,
  BarChart2, FileText, ChevronRight, ArrowUpRight,
  ArrowDownRight, Shield, Activity, Settings, LogOut
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : 'https://dentalpm-1-production.up.railway.app/api';

const authH = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const fmt   = n  => new Intl.NumberFormat('fr-MG').format(n || 0);
const fdate = d  => d ? new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' }) : '—';

const PLAN_PRICES  = { ESSENTIAL: 149000, PRO: 199000, GROUP: 299000 };
const PLAN_PATIENTS = { ESSENTIAL: 500, PRO: null, GROUP: null }; // null = illimité
const MONTHS_FR    = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
const PIE_COLORS   = ['#0D7A87','#8B5CF6','#3B82F6','#F59E0B'];

const PLAN_CFG = {
  ESSENTIAL: { bg:'#EFF6FF', border:'#93C5FD', text:'#1D4ED8', grad:'135deg,#1D4ED8,#3B82F6', icon:Users   },
  PRO:       { bg:'#F0FDFE', border:'#7DD3DA', text:'#0D7A87', grad:'135deg,#0D7A87,#13A3B4', icon:Zap     },
  GROUP:     { bg:'#EDE9FE', border:'#C4B5FD', text:'#6D28D9', grad:'135deg,#6D28D9,#8B5CF6', icon:Crown   },
  TRIAL:     { bg:'#FFFBEB', border:'#FDE68A', text:'#B45309', grad:'135deg,#B45309,#F59E0B', icon:Clock   },
};

/* ── Spinner ── */
const Spin = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:380 }}>
    <div style={{ width:38, height:38, border:'3px solid #E2E8F0', borderTopColor:'#0D7A87', borderRadius:'50%', animation:'_spin .8s linear infinite' }}/>
    <style>{`@keyframes _spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

/* ── Avatar ── */
const Avatar = ({ name='?', size=32 }) => {
  const init  = (name||'X').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const cols  = ['#0D7A87','#7C3AED','#1D4ED8','#059669','#D97706'];
  const color = cols[init.charCodeAt(0) % cols.length];
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:`${color}18`, border:`1.5px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.35, fontWeight:700, color, flexShrink:0 }}>
      {init}
    </div>
  );
};

/* ── Badge statut ── */
const SBadge = ({ status }) => {
  const MAP = {
    ACTIVE:        { l:'Actif',      bg:'#DCFCE7', c:'#166534', dot:'#22C55E' },
    TRIAL:         { l:'Essai',      bg:'#DBEAFE', c:'#1E40AF', dot:'#3B82F6' },
    EXPIRED:       { l:'Expiré',     bg:'#FEE2E2', c:'#991B1B', dot:'#EF4444' },
    TRIAL_EXPIRED: { l:'Essai exp.', bg:'#FEE2E2', c:'#991B1B', dot:'#EF4444' },
    CANCELLED:     { l:'Annulé',     bg:'#F1F5F9', c:'#475569', dot:'#94A3B8' },
    PENDING:       { l:'En attente', bg:'#FEF3C7', c:'#B45309', dot:'#F59E0B' },
    VERIFIED:      { l:'Payé',       bg:'#DCFCE7', c:'#166534', dot:'#22C55E' },
    REJECTED:      { l:'Rejeté',     bg:'#FEE2E2', c:'#991B1B', dot:'#EF4444' },
  };
  const c = MAP[status] || MAP.CANCELLED;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:99, background:c.bg, fontSize:11, fontWeight:700, color:c.c, whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:c.dot, flexShrink:0 }}/>{c.l}
    </span>
  );
};

/* ── Barre progression ── */
const Bar = ({ label, value, max, color='#0D7A87', note }) => {
  const pct  = max ? Math.min(100, Math.round((value/max)*100)) : 0;
  const warn = pct >= 85;
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
        <span style={{ fontSize:13, fontWeight:600, color:'#475569' }}>{label}</span>
        <span style={{ fontSize:13, fontWeight:700, color:warn?'#EF4444':'#0F172A' }}>{note}</span>
      </div>
      <div style={{ height:8, background:'#F1F5F9', borderRadius:99, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${max?pct:100}%`, background:warn?'#EF4444':color, borderRadius:99, transition:'width .6s ease' }}/>
      </div>
      {max && <div style={{ textAlign:'right', fontSize:10, color:warn?'#EF4444':'#94A3B8', marginTop:3 }}>{pct}% utilisé</div>}
    </div>
  );
};

/* ── KPI ── */
const Kpi = ({ label, value, sub, trend, icon:Icon, color='#0D7A87' }) => (
  <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', padding:'16px 18px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
      <div style={{ fontSize:12, fontWeight:600, color:'#64748B' }}>{label}</div>
      {Icon && <div style={{ width:34, height:34, borderRadius:10, background:`${color}14`, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon size={16} color={color}/></div>}
    </div>
    <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:22, color:'#0F172A', lineHeight:1, marginBottom:4 }}>{value}</div>
    {sub && (
      <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:trend==='up'?'#16A34A':trend==='down'?'#DC2626':'#94A3B8' }}>
        {trend==='up'&&<ArrowUpRight size={12}/>}{trend==='down'&&<ArrowDownRight size={12}/>}{sub}
      </div>
    )}
  </div>
);


/* ══════════════════════════════════════════════════
   VUE UTILISATEUR
══════════════════════════════════════════════════ */
const UserView = ({ user }) => {
  const [status,   setStatus]   = useState(null);
  const [payments, setPayments] = useState([]);
  const [patients, setPatients] = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [sideTab,  setSideTab]  = useState('overview');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p, pat] = await Promise.allSettled([
        axios.get(`${API}/billing/status`,           authH()),
        axios.get(`${API}/billing/payment-requests`, authH()),
        axios.get(`${API}/patients?limit=1`,         authH()),
      ]);
      if (s.status === 'fulfilled')   setStatus(s.value.data);
      if (p.status === 'fulfilled')   setPayments(p.value.data.paymentRequests || []);
      if (pat.status === 'fulfilled') setPatients(pat.value.data.total || pat.value.data.patients?.length || 0);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spin/>;

  const plan      = status?.plan || 'PRO';
  const pc        = PLAN_CFG[plan] || PLAN_CFG.PRO;
  const Icon      = pc.icon;
  const daysLeft  = status?.days_remaining ?? null;
  const maxPat    = PLAN_PATIENTS[plan]; // null = illimité
  const endDate   = status?.end_date;

  // Durée restante sur 30 jours
  const daysTotal = 30;
  const daysPct   = daysLeft !== null ? Math.min(100, Math.round((daysLeft / daysTotal) * 100)) : 100;
  const daysWarn  = daysLeft !== null && daysLeft <= 7;

  const NAV = [
    { id:'overview', label:"Vue d'ensemble",  icon:BarChart2  },
    { id:'payment',  label:'Paiement',         icon:CreditCard },
    { id:'invoices', label:'Historique',        icon:FileText   },
    { id:'settings', label:'Paramètres',        icon:Settings   },
  ];

  return (
    <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:20, alignItems:'start' }}>

      {/* ── Sidebar ── */}
      <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'16px 12px', position:'sticky', top:20 }}>
        {/* Profil */}
        <div style={{ padding:'10px 10px 14px', marginBottom:8, borderBottom:'1px solid #F1F5F9' }}>
          <Avatar name={user?.full_name || 'Utilisateur'} size={42}/>
          <div style={{ marginTop:8 }}>
            <div style={{ fontWeight:700, fontSize:13, color:'#0F172A', marginBottom:3 }}>{user?.full_name || 'Utilisateur'}</div>
            <div style={{ fontSize:11, color:'#94A3B8', marginBottom:6 }}>{user?.email || ''}</div>
            <SBadge status={status?.status || 'ACTIVE'}/>
          </div>
        </div>

        {/* Navigation */}
        {NAV.map(item => {
          const Ico = item.icon;
          const active = sideTab === item.id;
          return (
            <button key={item.id} onClick={() => setSideTab(item.id)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'9px 11px', borderRadius:10, border:'none', cursor:'pointer', marginBottom:3, background:active?'#F0FDFE':'transparent', color:active?'#0D7A87':'#64748B', fontWeight:active?700:500, fontSize:13, transition:'all .15s' }}>
              <Ico size={15} color={active?'#0D7A87':'#94A3B8'}/>{item.label}
            </button>
          );
        })}

        {/* Alerte expiration */}
        {daysLeft !== null && daysLeft <= 7 && (
          <div style={{ marginTop:12, padding:'10px 12px', borderRadius:10, background:'#FEF2F2', border:'1px solid #FECACA' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#DC2626', marginBottom:4 }}>⚠️ Expire dans {daysLeft} jour{daysLeft>1?'s':''}</div>
            <a href="/payment" style={{ fontSize:11, fontWeight:700, color:'#DC2626', textDecoration:'none', display:'flex', alignItems:'center', gap:3 }}>
              Renouveler maintenant <ChevronRight size={10}/>
            </a>
          </div>
        )}
      </div>

      {/* ── Contenu ── */}
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* ══ VUE D'ENSEMBLE ══ */}
        {sideTab === 'overview' && (
          <>
            {/* Carte abonnement principale */}
            <div style={{ borderRadius:20, padding:'24px 26px', background:`linear-gradient(${pc.grad})`, position:'relative', overflow:'hidden' }}>
              {/* Décoration */}
              <div style={{ position:'absolute', top:-30, right:-30, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,.08)', pointerEvents:'none' }}/>
              <div style={{ position:'absolute', bottom:-20, right:60, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }}/>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:46, height:46, borderRadius:14, background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon size={22} color="#fff"/>
                  </div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.7)', textTransform:'uppercase', letterSpacing:'.1em' }}>Mon abonnement</div>
                    <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:26, color:'#fff', lineHeight:1.1 }}>Plan {plan}</div>
                  </div>
                </div>
                <SBadge status={status?.status || 'ACTIVE'}/>
              </div>

              {/* Prix */}
              <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:20 }}>
                <span style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:38, color:'#fff' }}>{fmt(PLAN_PRICES[plan] || 199000)}</span>
                <span style={{ fontSize:14, color:'rgba(255,255,255,.65)' }}>Ar / mois</span>
              </div>

              {/* Stats */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {[
                  { label:'Praticiens',    value: plan==='GROUP'?'Illimités': plan==='PRO'?'5':'1+1' },
                  { label:'Patients max',  value: maxPat ? fmt(maxPat) : 'Illimités' },
                  { label:'Durée',         value: '30 jours' },
                ].map((s,i) => (
                  <div key={i} style={{ background:'rgba(255,255,255,.15)', borderRadius:12, padding:'10px 12px', textAlign:'center', backdropFilter:'blur(4px)' }}>
                    <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:16, color:'#fff' }}>{s.value}</div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,.65)', marginTop:2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Consommation */}
            <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'20px 22px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A' }}>Consommation</div>
                <Activity size={16} color="#94A3B8"/>
              </div>

              {/* Durée restante sur 30 jours */}
              <Bar
                label="Durée restante"
                value={daysLeft ?? 30}
                max={30}
                color={daysWarn ? '#EF4444' : '#0D7A87'}
                note={daysLeft !== null ? `${daysLeft} / 30 jours` : '— / 30 jours'}
              />

              {/* Patients selon plan */}
              {maxPat ? (
                <Bar
                  label="Patients actifs"
                  value={patients}
                  max={maxPat}
                  color="#8B5CF6"
                  note={`${fmt(patients)} / ${fmt(maxPat)}`}
                />
              ) : (
                <div style={{ padding:'12px 14px', background:'#F0FDFE', borderRadius:12, border:'1px solid #7DD3DA', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#0D7A87' }}>Patients actifs</div>
                    <div style={{ fontSize:11, color:'#64748B', marginTop:2 }}>Patients illimités — plan {plan}</div>
                  </div>
                  <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:20, color:'#0D7A87' }}>{fmt(patients)}</div>
                </div>
              )}

              {/* Date de renouvellement */}
              {endDate && (
                <div style={{ marginTop:14, padding:'10px 14px', background:'#F8FAFC', borderRadius:10, border:'1px solid #E2E8F0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:'#64748B' }}>
                    <Clock size={13} color="#94A3B8"/>
                    Renouvellement le
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>{fdate(endDate)}</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══ PAIEMENT ══ */}
        {sideTab === 'payment' && (
          <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'20px 22px' }}>
            <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A', marginBottom:18 }}>Moyen de paiement</div>

            {/* Carte bancaire style */}
            <div style={{ borderRadius:16, padding:'20px 22px', background:'linear-gradient(135deg,#0D7A87,#0A5F6A)', marginBottom:18, position:'relative', overflow:'hidden', minHeight:140 }}>
              <div style={{ position:'absolute', top:-20, right:-20, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.07)' }}/>
              <div style={{ position:'absolute', bottom:-30, right:40, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,.05)' }}/>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.6)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:4 }}>Paiement actif</div>
                  <div style={{ fontWeight:700, fontSize:15, color:'#fff' }}>Mobile Money Madagascar</div>
                </div>
                <div style={{ width:38, height:28, borderRadius:5, background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <CreditCard size={16} color="#fff"/>
                </div>
              </div>
              <div style={{ fontFamily:'monospace', fontSize:16, letterSpacing:3, color:'rgba(255,255,255,.85)', marginBottom:6 }}>
                •••• •••• •••• ••••
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                <div>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'.08em' }}>Titulaire</div>
                  <div style={{ fontSize:12, fontWeight:700, color:'#fff' }}>{user?.full_name || 'Utilisateur'}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'.08em' }}>Renouvellement</div>
                  <div style={{ fontSize:12, fontWeight:700, color:'#fff' }}>{endDate ? fdate(endDate) : '—'}</div>
                </div>
              </div>
            </div>

            {/* Options de paiement */}
            <div style={{ fontSize:12, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>Méthodes disponibles</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:18 }}>
              {[
                { name:'MVola',        color:'#E30613', num:'034 XX XXX XX', logo:'M' },
                { name:'Orange Money', color:'#FF6600', num:'032 XX XXX XX', logo:'O' },
                { name:'Airtel Money', color:'#E4002B', num:'033 XX XXX XX', logo:'A' },
                { name:'Virement BNI', color:'#1A3A5C', num:'RIB sur demande', logo:'B' },
              ].map(p => (
                <div key={p.name} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'#F8FAFC', borderRadius:11, border:'1px solid #E2E8F0' }}>
                  <div style={{ width:30, height:30, borderRadius:8, background:p.color, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, color:'#fff', flexShrink:0 }}>{p.logo}</div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#0F172A' }}>{p.name}</div>
                    <div style={{ fontSize:10, color:'#94A3B8' }}>{p.num}</div>
                  </div>
                </div>
              ))}
            </div>

            <a href="/payment" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'12px', borderRadius:12, background:'linear-gradient(135deg,#0D7A87,#13A3B4)', color:'#fff', fontWeight:700, fontSize:14, textDecoration:'none', boxShadow:'0 4px 14px rgba(13,122,135,.28)' }}>
              <CreditCard size={16}/> Renouveler mon abonnement
            </a>
          </div>
        )}

        {/* ══ HISTORIQUE ══ */}
        {sideTab === 'invoices' && (
          <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'20px 22px' }}>
            <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A', marginBottom:18 }}>Historique des paiements</div>
            {payments.length === 0 ? (
              <div style={{ textAlign:'center', padding:'48px', color:'#94A3B8' }}>
                <FileText size={36} style={{ margin:'0 auto 12px', display:'block', opacity:.25 }}/>
                <p style={{ margin:0, fontSize:14 }}>Aucune transaction enregistrée</p>
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'#F8FAFC' }}>
                      {['Référence','Plan','Montant','Méthode','Date','Statut','PDF'].map(h => (
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.06em', borderBottom:'1px solid #E2E8F0', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p,i) => (
                      <tr key={p.id} style={{ borderBottom:i<payments.length-1?'1px solid #F8FAFC':'none' }}
                        onMouseOver={e=>e.currentTarget.style.background='#FAFBFC'}
                        onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                        <td style={{ padding:'11px 12px', fontFamily:'monospace', fontSize:11, color:'#64748B' }}>{p.reference||`#${(p.id||'').slice(-6)}`}</td>
                        <td style={{ padding:'11px 12px' }}>
                          <span style={{ background:PLAN_CFG[p.plan_code]?.bg||'#F1F5F9', color:PLAN_CFG[p.plan_code]?.text||'#475569', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>{p.plan_code||'—'}</span>
                        </td>
                        <td style={{ padding:'11px 12px', fontWeight:700, color:'#0F172A', whiteSpace:'nowrap' }}>{fmt(p.amount_mga)} Ar</td>
                        <td style={{ padding:'11px 12px', fontSize:11, color:'#475569' }}>{p.payment_method||'—'}</td>
                        <td style={{ padding:'11px 12px', fontSize:11, color:'#64748B' }}>{fdate(p.created_at)}</td>
                        <td style={{ padding:'11px 12px' }}><SBadge status={p.status}/></td>
                        <td style={{ padding:'11px 12px' }}>
                          <button style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:7, border:'1px solid #E2E8F0', background:'#fff', cursor:'pointer', fontSize:11, fontWeight:600, color:'#475569' }}
                            onMouseOver={e=>{e.currentTarget.style.borderColor='#0D7A87';e.currentTarget.style.color='#0D7A87';}}
                            onMouseOut={e=>{e.currentTarget.style.borderColor='#E2E8F0';e.currentTarget.style.color='#475569';}}>
                            <Download size={11}/> PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══ PARAMÈTRES ══ */}
        {sideTab === 'settings' && (
          <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'20px 22px' }}>
            <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A', marginBottom:18 }}>Mon compte</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { label:'Nom complet',   value: user?.full_name || '—' },
                { label:'Email',         value: user?.email || '—' },
                { label:'Rôle',          value: user?.role || '—' },
                { label:'Plan actuel',   value: `Plan ${plan}` },
              ].map(r => (
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'12px 14px', background:'#F8FAFC', borderRadius:11, border:'1px solid #E2E8F0' }}>
                  <span style={{ fontSize:13, color:'#64748B' }}>{r.label}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:'#0F172A' }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


/* ══════════════════════════════════════════════════
   VUE ADMINISTRATEUR
══════════════════════════════════════════════════ */
const AdminView = () => {
  const [data,    setData]    = useState(null);
  const [txs,     setTxs]     = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rev, tx] = await Promise.all([
        axios.get(`${API}/admin/revenue`,          authH()),
        axios.get(`${API}/admin/payment-requests`, authH()),
      ]);
      setData(rev.data);
      setTxs(tx.data.paymentRequests || tx.data || []);
    } catch { toast.error('Erreur chargement admin'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id, plan) => {
    try { await axios.patch(`${API}/admin/payment-requests/${id}/approve`, { plan }, authH()); toast.success('Activé'); load(); }
    catch { toast.error('Erreur approbation'); }
  };
  const reject = async id => {
    try { await axios.patch(`${API}/admin/payment-requests/${id}/reject`, { reason:'Rejeté' }, authH()); toast.success('Rejeté'); load(); }
    catch { toast.error('Erreur rejet'); }
  };

  const revenueData = (() => {
    const now = new Date();
    return Array.from({ length:6 }, (_,i) => {
      const d = new Date(now.getFullYear(), now.getMonth()-5+i, 1);
      return { name: MONTHS_FR[d.getMonth()], MRR: Math.round((data?.mrr||0)*(0.55+i*0.09)) };
    });
  })();

  const pieData = data?.byPlan
    ? Object.entries(data.byPlan).filter(([,v])=>v>0).map(([k,v])=>({ name:k, value:v }))
    : [{ name:'PRO',value:3 },{ name:'ESSENTIAL',value:2 },{ name:'GROUP',value:1 }];

  if (loading) return <Spin/>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:20, color:'#0F172A', margin:0 }}>Dashboard Revenus</h2>
          <p style={{ color:'#64748B', fontSize:13, margin:0 }}>Supervision des abonnements DPM Madagascar</p>
        </div>
        <button onClick={load} style={{ padding:'8px 14px', borderRadius:10, border:'1px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:600, color:'#475569' }}>
          <RefreshCw size={13}/> Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        <Kpi label="MRR mensuel"        value={`${fmt(data?.mrr)} Ar`}          sub="Abonnements actifs"  trend="up"   icon={TrendingUp} color="#0D7A87"/>
        <Kpi label="ARR annuel"          value={`${fmt(data?.arr)} Ar`}          sub="Projection ×12"      trend="up"   icon={BarChart2}  color="#7C3AED"/>
        <Kpi label="Cabinets actifs"     value={data?.activeClinics||0}          sub={`En essai: ${data?.byPlan?.TRIAL||0}`} icon={Users} color="#10B981"/>
        <Kpi label="Paiements en attente" value={data?.pendingCount||0}          sub={data?.pendingCount>0?'À valider':'Tout à jour'} trend={data?.pendingCount>0?'down':undefined} icon={Clock} color={data?.pendingCount>0?'#EF4444':'#64748B'}/>
      </div>

      {/* Graphiques */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:14 }}>
        {/* Courbe MRR */}
        <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'20px 22px' }}>
          <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A', marginBottom:6 }}>Évolution des revenus</div>
          <div style={{ display:'flex', gap:12, marginBottom:16, fontSize:11, color:'#94A3B8' }}>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:3, background:'#0D7A87', borderRadius:2, display:'inline-block' }}/> MRR</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={revenueData} margin={{ top:5, right:10, left:0, bottom:5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false}/>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize:11, fill:'#94A3B8' }}/>
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize:10, fill:'#94A3B8' }} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
              <Tooltip contentStyle={{ borderRadius:10, border:'1px solid #E2E8F0', fontSize:12 }} formatter={v=>[`${fmt(v)} Ar`,'MRR']}/>
              <Line type="monotone" dataKey="MRR" stroke="#0D7A87" strokeWidth={2.5} dot={{ r:4, fill:'#0D7A87', strokeWidth:0 }} activeDot={{ r:6 }}/>
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Donut plans */}
        <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'20px 22px' }}>
          <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A', marginBottom:16 }}>Répartition des plans</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={70} paddingAngle={3} dataKey="value">
                {pieData.map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
              </Pie>
              <Tooltip formatter={v=>[`${v} cabinet${v>1?'s':''}`,'']}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:8 }}>
            {pieData.map((d,i) => (
              <div key={d.name} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#475569' }}>
                <span style={{ width:10, height:10, borderRadius:2, background:PIE_COLORS[i%PIE_COLORS.length], flexShrink:0 }}/>
                <span style={{ fontWeight:600 }}>{d.name}</span>
                <span style={{ color:'#94A3B8' }}>({d.value})</span>
              </div>
            ))}
          </div>
          {/* Taux churn */}
          <div style={{ marginTop:14, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div style={{ background:'#F8FAFC', borderRadius:10, padding:'10px', textAlign:'center' }}>
              <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:18, color:'#EF4444' }}>
                {pieData.reduce((a,b)=>a+b.value,0) > 0 ? ((data?.pendingCount||0)/(pieData.reduce((a,b)=>a+b.value,0))*100).toFixed(1) : '0.0'}%
              </div>
              <div style={{ fontSize:10, color:'#94A3B8' }}>Taux churn</div>
            </div>
            <div style={{ background:'#F8FAFC', borderRadius:10, padding:'10px', textAlign:'center' }}>
              <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:18, color:'#0D7A87' }}>{pieData.reduce((a,b)=>a+b.value,0)}</div>
              <div style={{ fontSize:10, color:'#94A3B8' }}>Total cabinets</div>
            </div>
          </div>
        </div>
      </div>

      {/* Paiements en attente */}
      {(data?.pendingPayments||[]).length > 0 && (
        <div style={{ background:'#fff', borderRadius:18, border:'2px solid #FED7AA', padding:'20px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <AlertCircle size={16} color="#F59E0B"/>
            <span style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A' }}>
              Paiements à valider ({data.pendingPayments.length})
            </span>
          </div>
          {data.pendingPayments.map(p => (
            <div key={p.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'#FFFBEB', borderRadius:12, border:'1px solid #FDE68A', marginBottom:8, flexWrap:'wrap' }}>
              <Avatar name={p.clinic_name||'Cabinet'} size={36}/>
              <div style={{ flex:1, minWidth:120 }}>
                <div style={{ fontWeight:700, fontSize:13, color:'#0F172A' }}>{p.clinic_name||'Cabinet inconnu'}</div>
                <div style={{ fontSize:11, color:'#64748B' }}>{p.payment_method} — {fmt(p.amount_mga)} Ar — {fdate(p.created_at)}</div>
              </div>
              <span style={{ background:PLAN_CFG[p.plan_code]?.bg||'#F1F5F9', color:PLAN_CFG[p.plan_code]?.text||'#475569', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>{p.plan_code||'—'}</span>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>approve(p.id,p.plan_code)} style={{ padding:'7px 14px', borderRadius:9, background:'#0D7A87', color:'#fff', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                  <CheckCircle size={12}/> Approuver
                </button>
                <button onClick={()=>reject(p.id)} style={{ padding:'7px 14px', borderRadius:9, background:'#FEE2E2', color:'#991B1B', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                  <X size={12}/> Rejeter
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tableau transactions */}
      <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'20px 22px' }}>
        <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A', marginBottom:4 }}>Dernières transactions</div>
        <div style={{ fontSize:12, color:'#94A3B8', marginBottom:16 }}>{txs.length} paiement{txs.length!==1?'s':''} récents</div>
        {txs.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px', color:'#94A3B8' }}>
            <FileText size={32} style={{ margin:'0 auto 10px', display:'block', opacity:.25 }}/><p style={{ margin:0, fontSize:13 }}>Aucune transaction</p>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'#F8FAFC' }}>
                  {['ID','Client','Plan','Montant','Date','Méthode','Statut','Actions'].map(h=>(
                    <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.06em', borderBottom:'1px solid #E2E8F0', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txs.slice(0,15).map((tx,i)=>(
                  <tr key={tx.id} style={{ borderBottom:i<Math.min(txs.length,15)-1?'1px solid #F8FAFC':'none' }}
                    onMouseOver={e=>e.currentTarget.style.background='#FAFBFC'}
                    onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:11, color:'#94A3B8' }}>#{(tx.id||'').slice(-6)}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <Avatar name={tx.clinic_name||'Cabinet'} size={28}/>
                        <div>
                          <div style={{ fontWeight:600, fontSize:12, color:'#0F172A' }}>{tx.clinic_name||'Cabinet'}</div>
                          <div style={{ fontSize:10, color:'#94A3B8' }}>{tx.reference||''}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'10px 12px' }}>
                      <span style={{ background:PLAN_CFG[tx.plan_code]?.bg||'#F1F5F9', color:PLAN_CFG[tx.plan_code]?.text||'#475569', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>{tx.plan_code||'—'}</span>
                    </td>
                    <td style={{ padding:'10px 12px', fontWeight:700, color:'#0F172A', whiteSpace:'nowrap' }}>{fmt(tx.amount_mga)} Ar</td>
                    <td style={{ padding:'10px 12px', fontSize:11, color:'#64748B' }}>{fdate(tx.created_at)}</td>
                    <td style={{ padding:'10px 12px', fontSize:11, color:'#475569' }}>{tx.payment_method||'—'}</td>
                    <td style={{ padding:'10px 12px' }}><SBadge status={tx.status}/></td>
                    <td style={{ padding:'10px 12px' }}>
                      {tx.status==='PENDING'&&(
                        <div style={{ display:'flex', gap:5 }}>
                          <button onClick={()=>approve(tx.id,tx.plan_code)} style={{ padding:'4px 8px', borderRadius:6, background:'#DCFCE7', color:'#166534', border:'none', cursor:'pointer', fontSize:11, fontWeight:700 }}>✓</button>
                          <button onClick={()=>reject(tx.id)} style={{ padding:'4px 8px', borderRadius:6, background:'#FEE2E2', color:'#991B1B', border:'none', cursor:'pointer', fontSize:11, fontWeight:700 }}>✕</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};


/* ══════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
══════════════════════════════════════════════════ */
const SubscriptionManagement = () => {
  const { user } = useAuth();
  const isAdmin  = ['SUPER_ADMIN','ADMIN'].includes(user?.role);
  const [tab, setTab] = useState(isAdmin ? 'admin' : 'user');

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', paddingBottom:48, fontFamily:'DM Sans, sans-serif' }}>
      <style>{`@keyframes _spin{to{transform:rotate(360deg)}}`}</style>

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

        {isAdmin && (
          <div style={{ display:'flex', gap:4, background:'#F1F5F9', borderRadius:11, padding:4, border:'1px solid #E2E8F0' }}>
            {[{ id:'user',label:'Vue client' },{ id:'admin',label:'Vue admin' }].map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{ padding:'7px 16px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background:tab===t.id?'#fff':'transparent', color:tab===t.id?'#0D7A87':'#64748B', boxShadow:tab===t.id?'0 1px 4px rgba(0,0,0,.08)':'none', transition:'all .15s' }}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'user'  && <UserView user={user}/>}
      {tab === 'admin' && <AdminView/>}
    </div>
  );
};

export default SubscriptionManagement;
