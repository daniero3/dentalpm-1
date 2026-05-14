import React, { useState, useEffect, useCallback } from 'react';
import BillingInfo from './BillingInfo';
import axios from 'axios';
import { useResponsive } from '../utils/responsive';
import { toast } from 'sonner';
import { useAuth } from '../App';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CreditCard, Download, RefreshCw, Crown, Zap, Users, TrendingUp, AlertCircle, CheckCircle, Clock, X, BarChart2, FileText, ChevronRight, ArrowUpRight, ArrowDownRight, Shield, Activity, Settings } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8001/api'
    : '/api';
const authH = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const fmt   = n => new Intl.NumberFormat('fr-MG').format(n || 0);
const fdate = d => d ? new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' }) : '—';

const PLAN_PRICES   = { ESSENTIAL:149000, PRO:199000, GROUP:299000 };
const STRIPE_LINKS  = {
  ESSENTIAL: 'https://buy.stripe.com/eVqeV66VS1S84A43NDcfK01',
  PRO:       'https://buy.stripe.com/aFa9AM4NK54k1nSfwlcfK00',
  GROUP:     'https://buy.stripe.com/9B614gbc8aoE3w05VLcfK02',
};
const PLAN_PATIENTS = { ESSENTIAL:500, PRO:null, GROUP:null };
const MONTHS_FR     = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
const PIE_COLORS    = ['#0D7A87','#8B5CF6','#3B82F6','#F59E0B'];

const PLAN_CFG = {
  ESSENTIAL: { bg:'#EFF6FF', border:'#93C5FD', text:'#1D4ED8', grad:'135deg,#1D4ED8,#3B82F6', icon:Users  },
  PRO:       { bg:'#F0FDFE', border:'#7DD3DA', text:'#0D7A87', grad:'135deg,#0D7A87,#13A3B4', icon:Zap    },
  GROUP:     { bg:'#EDE9FE', border:'#C4B5FD', text:'#6D28D9', grad:'135deg,#6D28D9,#8B5CF6', icon:Crown  },
  TRIAL:     { bg:'#FFFBEB', border:'#FDE68A', text:'#B45309', grad:'135deg,#B45309,#F59E0B', icon:Clock  },
};

const SPIN = { width:36, height:36, border:'3px solid #E2E8F0', borderTopColor:'#0D7A87', borderRadius:'50%', animation:'_spin .8s linear infinite' };

function Avatar({ name='?', size=32 }) {
  const init  = (name||'X').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const cols  = ['#0D7A87','#7C3AED','#1D4ED8','#059669','#D97706'];
  const color = cols[init.charCodeAt(0) % cols.length];
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:`${color}18`, border:`1.5px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.35, fontWeight:700, color, flexShrink:0 }}>
      {init}
    </div>
  );
}

function SBadge({ status }) {
  const M = {
    ACTIVE:        { l:'Actif',       bg:'#DCFCE7', c:'#166534', d:'#22C55E' },
    TRIAL:         { l:'Essai',       bg:'#DBEAFE', c:'#1E40AF', d:'#3B82F6' },
    EXPIRED:       { l:'Expiré',      bg:'#FEE2E2', c:'#991B1B', d:'#EF4444' },
    TRIAL_EXPIRED: { l:'Essai exp.',  bg:'#FEE2E2', c:'#991B1B', d:'#EF4444' },
    CANCELLED:     { l:'Annulé',      bg:'#F1F5F9', c:'#475569', d:'#94A3B8' },
    PENDING:       { l:'En attente',  bg:'#FEF3C7', c:'#B45309', d:'#F59E0B' },
    VERIFIED:      { l:'Payé',        bg:'#DCFCE7', c:'#166534', d:'#22C55E' },
    REJECTED:      { l:'Rejeté',      bg:'#FEE2E2', c:'#991B1B', d:'#EF4444' },
    SUPERSEDED:    { l:'Remplacé',    bg:'#F1F5F9', c:'#475569', d:'#94A3B8' },
  };
  const s = M[status] || M.CANCELLED;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:99, background:s.bg, fontSize:11, fontWeight:700, color:s.c, whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:s.d, flexShrink:0 }}/>{s.l}
    </span>
  );
}

function Bar({ label, value, max, color='#0D7A87', note }) {
  const pct  = max ? Math.min(100, Math.round((value/max)*100)) : 100;
  const warn = pct >= 85;
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
        <span style={{ fontSize:13, fontWeight:600, color:'#475569' }}>{label}</span>
        <span style={{ fontSize:13, fontWeight:700, color:warn?'#EF4444':'#0F172A' }}>{note}</span>
      </div>
      <div style={{ height:8, background:'#F1F5F9', borderRadius:99, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:warn?'#EF4444':color, borderRadius:99, transition:'width .6s' }}/>
      </div>
      {max && <div style={{ textAlign:'right', fontSize:10, color:warn?'#EF4444':'#94A3B8', marginTop:3 }}>{pct}% utilisé</div>}
    </div>
  );
}

function Kpi({ label, value, sub, trend, icon:Icon, color='#0D7A87' }) {
  return (
    <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', padding:'16px 18px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div style={{ fontSize:12, fontWeight:600, color:'#64748B' }}>{label}</div>
        {Icon && <div style={{ width:34, height:34, borderRadius:10, background:`${color}14`, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon size={16} color={color}/></div>}
      </div>
      <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:22, color:'#0F172A', lineHeight:1, marginBottom:4 }}>{value}</div>
      {sub && (
        <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:trend==='up'?'#16A34A':trend==='down'?'#DC2626':'#94A3B8' }}>
          {trend==='up' && <ArrowUpRight size={12}/>}
          {trend==='down' && <ArrowDownRight size={12}/>}
          {sub}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   VUE UTILISATEUR
══════════════════════════════════════════════════ */
const STRIPE_PAYMENT_LINKS = {
  ESSENTIAL: 'https://buy.stripe.com/eVqeV66VS1S84A43NDcfK01',
  PRO:       'https://buy.stripe.com/aFa9AM4NK54k1nSfwlcfK00',
  GROUP:     'https://buy.stripe.com/9B614gbc8aoE3w05VLcfK02',
};

async function stripeCheckout(plan, apiUrl) {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      // Pas de token — utiliser Payment Link direct
      window.location.href = STRIPE_PAYMENT_LINKS[plan] || STRIPE_PAYMENT_LINKS.PRO;
      return;
    }
    const r = await fetch(`${apiUrl}/billing/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: JSON.stringify({ plan_code: plan })
    });
    if (r.status === 401) {
      // Token invalide — fallback Payment Link
      window.location.href = STRIPE_PAYMENT_LINKS[plan] || STRIPE_PAYMENT_LINKS.PRO;
      return;
    }
    const data = await r.json();
    if (data.url) window.location.href = data.url;
    else {
      // Fallback si pas d'URL
      window.location.href = STRIPE_PAYMENT_LINKS[plan] || STRIPE_PAYMENT_LINKS.PRO;
    }
  } catch(e) {
    // Erreur réseau — fallback Payment Link
    window.location.href = STRIPE_PAYMENT_LINKS[plan] || STRIPE_PAYMENT_LINKS.PRO;
  }
}

async function downloadInvoicePDF(payment) {
  try {
    const date = new Date(payment.created_at);
    const year  = date.getFullYear();
    const month = date.getMonth() + 1;
    const url = `${API}/billing/invoice/${year}/${month}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    if (!response.ok) {
      // Fallback: télécharger un PDF basique avec les infos du paiement
      toast.error('Erreur téléchargement PDF');
      return;
    }
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href  = window.URL.createObjectURL(blob);
    link.download = `facture-${payment.reference || payment.id?.slice(-6) || 'dpm'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
    toast.success('PDF téléchargé');
  } catch (err) {
    console.error(err);
    toast.error('Erreur téléchargement');
  }
}

function UserView({ user }) {
  const [status,   setStatus]   = useState(null);
  const [payments, setPayments] = useState([]);
  const [patients, setPatients] = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [sideTab,  setSideTab]  = useState('overview');
  const [checkoutFinalized, setCheckoutFinalized] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p, pat] = await Promise.allSettled([
        axios.get(`${API}/billing/status`, authH()),
        axios.get(`${API}/billing/payment-requests`, authH()),
        axios.get(`${API}/patients?limit=1`, authH()),
      ]);
      if (s.status==='fulfilled')   setStatus(s.value.data);
      if (p.status==='fulfilled')   setPayments(p.value.data.paymentRequests||[]);
      if (pat.status==='fulfilled') setPatients(pat.value.data.total||pat.value.data.patients?.length||0);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (checkoutFinalized || params.get('checkout') !== 'success' || !sessionId) return;

    setCheckoutFinalized(true);
    axios.post(`${API}/billing/finalize-public-checkout`, { session_id: sessionId }, authH())
      .then(() => {
        toast.success('Carte validée. Essai gratuit activé automatiquement.');
        window.history.replaceState({}, '', window.location.pathname);
        load();
      })
      .catch((e) => {
        toast.error(e.response?.data?.error || 'Impossible de finaliser automatiquement Stripe');
      });
  }, [checkoutFinalized, load]);

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:380 }}>
        <div style={SPIN}/>
        <style>{`@keyframes _spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const plan     = status?.plan || 'PRO';
  const pc       = PLAN_CFG[plan] || PLAN_CFG.PRO;
  const PlanIcon = pc.icon;
  const daysLeft = status?.days_remaining ?? null;
  const maxPat   = PLAN_PATIENTS[plan];
  const endDate  = status?.end_date;
  const daysWarn = daysLeft !== null && daysLeft <= 7;

  const NAV = [
    { id:'overview', label:"Vue d'ensemble", icon:BarChart2  },
    { id:'payment',  label:'Paiement',        icon:CreditCard },
    { id:'billing',  label:'Infos de paiement', icon:CreditCard  },
  { id:'invoices', label:'Historique',       icon:FileText   },
    { id:'settings', label:'Paramètres',       icon:Settings   },
  ];

  return (
    <div style={{ display:'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '220px 1fr', gap:16, alignItems:'start' }}>
      <style>{`@keyframes _spin{to{transform:rotate(360deg)}}`}</style>

      {/* Sidebar */}
      <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'16px 12px', position: window.innerWidth < 768 ? 'relative' : 'sticky', top:20 }}>
        <div style={{ padding:'10px 10px 14px', marginBottom:8, borderBottom:'1px solid #F1F5F9' }}>
          <Avatar name={user?.full_name||'U'} size={42}/>
          <div style={{ marginTop:8 }}>
            <div style={{ fontWeight:700, fontSize:13, color:'#0F172A', marginBottom:3 }}>{user?.full_name||'Utilisateur'}</div>
            <div style={{ fontSize:11, color:'#94A3B8', marginBottom:6 }}>{user?.email||''}</div>
            <SBadge status={status?.status||'ACTIVE'}/>
          </div>
        </div>
        {NAV.map(item => {
          const Ico = item.icon;
          const active = sideTab===item.id;
          return (
            <button key={item.id} onClick={()=>setSideTab(item.id)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'9px 11px', borderRadius:10, border:'none', cursor:'pointer', marginBottom:3, background:active?'#F0FDFE':'transparent', color:active?'#0D7A87':'#64748B', fontWeight:active?700:500, fontSize:13 }}>
              <Ico size={15} color={active?'#0D7A87':'#94A3B8'}/>{item.label}
            </button>
          );
        })}
        {daysWarn && (
          <div style={{ marginTop:12, padding:'10px 12px', borderRadius:10, background:'#FEF2F2', border:'1px solid #FECACA' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#DC2626', marginBottom:4 }}>Expire dans {daysLeft}j</div>
            <a href="/payment" style={{ fontSize:11, fontWeight:700, color:'#DC2626', textDecoration:'none', display:'flex', alignItems:'center', gap:3 }}>
              Renouveler <ChevronRight size={10}/>
            </a>
          </div>
        )}
      </div>

      {/* Contenu */}
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {sideTab==='overview' && (
          <div style={{ borderRadius:20, padding:'24px 26px', background:`linear-gradient(${pc.grad})`, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-30, right:-30, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,.08)', pointerEvents:'none' }}/>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:46, height:46, borderRadius:14, background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <PlanIcon size={22} color="#fff"/>
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.7)', textTransform:'uppercase', letterSpacing:'.1em' }}>Mon abonnement</div>
                  <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:26, color:'#fff', lineHeight:1.1 }}>Plan {plan}</div>
                </div>
              </div>
              <SBadge status={status?.status||'ACTIVE'}/>
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:20 }}>
              <span style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:38, color:'#fff' }}>{fmt(PLAN_PRICES[plan]||199000)}</span>
              <span style={{ fontSize:14, color:'rgba(255,255,255,.65)' }}>Ar / mois</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
              {[
                { l:'Praticiens',   v:plan==='GROUP'?'Illimités':plan==='PRO'?'5':'1+1' },
                { l:'Patients max', v:maxPat?fmt(maxPat):'Illimités' },
                { l:'Durée',        v:'30 jours' },
              ].map((s,i) => (
                <div key={i} style={{ background:'rgba(255,255,255,.15)', borderRadius:12, padding:'10px 12px', textAlign:'center', backdropFilter:'blur(4px)' }}>
                  <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:16, color:'#fff' }}>{s.v}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.65)', marginTop:2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {sideTab==='overview' && (
          <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'#635BFF18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <CreditCard size={16} color="#635BFF"/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>Renouveler avec Mastercard / Stripe</div>
              <div style={{ fontSize:11, color:'#64748B' }}>Paiement sécurisé — Plan actuel : {plan} ({fmt(PLAN_PRICES[plan]||199000)} Ar/mois)</div>
            </div>
            <button onClick={()=>stripeCheckout(plan, API)}
              style={{ padding:'9px 18px', borderRadius:10, background:'#635BFF', color:'#fff', fontWeight:700, fontSize:13, border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap', boxShadow:'0 4px 12px rgba(99,91,255,.3)' }}
              onMouseOver={e=>{e.currentTarget.style.background='#4F46E5';}}
              onMouseOut={e=>{e.currentTarget.style.background='#635BFF';}}>
              💳 Payer avec Stripe
            </button>
          </div>
        )}

        {(sideTab==='overview'||sideTab==='usage') && (
          <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'20px 22px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A' }}>Consommation</div>
              <Activity size={16} color="#94A3B8"/>
            </div>
            <Bar label="Durée restante" value={daysLeft??30} max={30} color={daysWarn?'#EF4444':'#0D7A87'} note={`${daysLeft??'—'} / 30 jours`}/>
            {maxPat ? (
              <Bar label="Patients actifs" value={patients} max={maxPat} color="#8B5CF6" note={`${fmt(patients)} / ${fmt(maxPat)}`}/>
            ) : (
              <div style={{ padding:'12px 14px', background:'#F0FDFE', borderRadius:12, border:'1px solid #7DD3DA', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#0D7A87' }}>Patients actifs</div>
                  <div style={{ fontSize:11, color:'#64748B', marginTop:2 }}>Illimités — plan {plan}</div>
                </div>
                <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:20, color:'#0D7A87' }}>{fmt(patients)}</div>
              </div>
            )}
            {endDate && (
              <div style={{ marginTop:14, padding:'10px 14px', background:'#F8FAFC', borderRadius:10, border:'1px solid #E2E8F0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:'#64748B' }}>
                  <Clock size={13} color="#94A3B8"/> Renouvellement le
                </div>
                <div style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>{fdate(endDate)}</div>
              </div>
            )}
          </div>
        )}

        {sideTab==='payment' && (
          <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'20px 22px' }}>
            <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A', marginBottom:18 }}>Moyen de paiement</div>
            <div style={{ borderRadius:16, padding:'20px 22px', background:'linear-gradient(135deg,#0D7A87,#0A5F6A)', marginBottom:18, position:'relative', overflow:'hidden', minHeight:140 }}>
              <div style={{ position:'absolute', top:-20, right:-20, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.07)', pointerEvents:'none' }}/>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.6)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:4 }}>Paiement actif</div>
                  <div style={{ fontWeight:700, fontSize:15, color:'#fff' }}>Paiement par Stripe</div>
                </div>
                <div style={{ width:38, height:28, borderRadius:5, background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <CreditCard size={16} color="#fff"/>
                </div>
              </div>
              <div style={{ fontFamily:'monospace', fontSize:16, letterSpacing:3, color:'rgba(255,255,255,.85)', marginBottom:6 }}>•••• •••• •••• ••••</div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                <div>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'.08em' }}>Titulaire</div>
                  <div style={{ fontSize:12, fontWeight:700, color:'#fff' }}>{user?.full_name||'Utilisateur'}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'.08em' }}>Renouvellement</div>
                  <div style={{ fontSize:12, fontWeight:700, color:'#fff' }}>{endDate?fdate(endDate):'—'}</div>
                </div>
              </div>
            </div>

            {/* Boutons Stripe par plan */}
            <div style={{ fontSize:12, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10, marginTop:4 }}>Payer maintenant avec Stripe</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
              {['ESSENTIAL','PRO','GROUP'].map(pl => {
                const pc4 = PLAN_CFG[pl] || PLAN_CFG.PRO;
                const Ico4 = pc4.icon;
                const isCurrent = plan === pl;
                return (
                  <button key={pl} onClick={()=>stripeCheckout(pl, API)}
                    style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:'12px 8px', borderRadius:12, border:`1.5px solid ${isCurrent?'#635BFF':pc4.border}`, background:isCurrent?'#635BFF':pc4.bg, cursor:'pointer', transition:'all .15s' }}
                    onMouseOver={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 6px 16px rgba(99,91,255,.25)';}}
                    onMouseOut={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';}}>
                    <div style={{ width:32, height:32, borderRadius:9, background:isCurrent?'rgba(255,255,255,.2)':pc4.text+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Ico4 size={16} color={isCurrent?'#fff':pc4.text}/>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color:isCurrent?'#fff':pc4.text }}>{pl}</span>
                    <span style={{ fontSize:10, color:isCurrent?'rgba(255,255,255,.75)':'#94A3B8' }}>{fmt(PLAN_PRICES[pl])} Ar/mois</span>
                    {isCurrent && <span style={{ fontSize:9, background:'rgba(255,255,255,.2)', color:'#fff', padding:'1px 6px', borderRadius:99, fontWeight:700 }}>Actuel</span>}
                  </button>
                );
              })}
            </div>


          </div>
        )}

        {sideTab==='billing' && (
          <BillingInfo />
        )}

        {sideTab==='invoices' && (
          <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'20px 22px' }}>
            <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A', marginBottom:18 }}>Historique des paiements</div>
            {payments.length===0 ? (
              <div style={{ textAlign:'center', padding:'48px', color:'#94A3B8' }}>
                <FileText size={36} style={{ margin:'0 auto 12px', display:'block', opacity:.25 }}/>
                <p style={{ margin:0, fontSize:14 }}>Aucune transaction</p>
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
                          <button onClick={()=>downloadInvoicePDF(p)}
                            style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:7, border:'1px solid #E2E8F0', background:'#fff', cursor:'pointer', fontSize:11, fontWeight:600, color:'#475569' }}
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

        {sideTab==='settings' && (
          <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'20px 22px' }}>
            <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A', marginBottom:18 }}>Mon compte</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                { l:'Nom complet', v:user?.full_name||'—' },
                { l:'Email',       v:user?.email||'—' },
                { l:'Rôle',        v:user?.role||'—' },
                { l:'Plan actuel', v:`Plan ${plan}` },
              ].map(r => (
                <div key={r.l} style={{ display:'flex', justifyContent:'space-between', padding:'12px 14px', background:'#F8FAFC', borderRadius:11, border:'1px solid #E2E8F0' }}>
                  <span style={{ fontSize:13, color:'#64748B' }}>{r.l}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:'#0F172A' }}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MODAL DÉTAIL CABINET
══════════════════════════════════════════════════ */
function ClinicModal({ selClinic, clinicData, clinicLoad, actionLoad, onClose, onActivate, onDeactivate, showAddUser, setShowAddUser, newUser, setNewUser, userSaving, onCreateUser }) {
  if (!selClinic) return null;

  const activeSub = (clinicData?.subscriptions||[]).find(s=>['ACTIVE','TRIAL'].includes(s.status));
  const plan2     = activeSub?.plan || clinicData?.clinic?.current_plan || 'PRO';
  const pc3       = PLAN_CFG[plan2] || PLAN_CFG.PRO;
  const IconP     = pc3.icon;
  const endD      = activeSub?.end_date;
  const daysRem   = endD ? Math.max(0, Math.ceil((new Date(endD)-new Date())/(1000*60*60*24))) : null;
  const status2   = clinicData?.clinic?.subscription_status || 'EXPIRED';

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(10,16,30,.65)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 32px 80px rgba(0,0,0,.22)', border:'1px solid #E2E8F0' }}>

        {/* Header */}
        <div style={{ padding:'18px 22px', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'center', background:'linear-gradient(135deg,#0D7A87,#0A5F6A)', borderRadius:'20px 20px 0 0' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <Avatar name={selClinic.name} size={40}/>
            <div>
              <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:16, color:'#fff' }}>{selClinic.name}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.7)' }}>Détails abonnement</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:8, background:'rgba(255,255,255,.15)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
            <X size={15}/>
          </button>
        </div>

        {clinicLoad ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}>
            <div style={SPIN}/>
          </div>
        ) : clinicData ? (
          <div style={{ padding:'20px 22px' }}>

            {/* Infos cabinet */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:18 }}>
              {[
                { l:'Email',       v:clinicData.clinic?.email||'—' },
                { l:'Téléphone',   v:clinicData.clinic?.phone||'—' },
                { l:'Ville',       v:clinicData.clinic?.city||'—' },
                { l:'Utilisateurs',v:`${clinicData.users?.length||0} membre${(clinicData.users?.length||0)>1?'s':''}` },
              ].map(r => (
                <div key={r.l} style={{ padding:'10px 12px', background:'#F8FAFC', borderRadius:10, border:'1px solid #E2E8F0' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:3 }}>{r.l}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#0F172A' }}>{r.v}</div>
                </div>
              ))}
            </div>

            {/* Plan actuel */}
            <div style={{ marginBottom:18 }}>
              <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:14, color:'#0F172A', marginBottom:12 }}>Abonnement actuel</div>
              <div style={{ borderRadius:16, padding:'16px 18px', background:`linear-gradient(${pc3.grad})`, marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:38, height:38, borderRadius:11, background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <IconP size={18} color="#fff"/>
                    </div>
                    <div>
                      <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:18, color:'#fff' }}>Plan {plan2}</div>
                      <div style={{ fontSize:12, color:'rgba(255,255,255,.7)' }}>{fmt(PLAN_PRICES[plan2]||199000)} Ar/mois</div>
                    </div>
                  </div>
                  <SBadge status={status2}/>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                  {[
                    { l:'Patients max',  v:PLAN_PATIENTS[plan2]?fmt(PLAN_PATIENTS[plan2]):'Illimités' },
                    { l:'Jours restants',v:daysRem!==null?`${daysRem} j`:'—' },
                    { l:'Expire le',     v:endD?fdate(endD):'—' },
                  ].map((s,i) => (
                    <div key={i} style={{ background:'rgba(255,255,255,.15)', borderRadius:10, padding:'8px 10px', textAlign:'center' }}>
                      <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:14, color:'#fff' }}>{s.v}</div>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,.65)', marginTop:2 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
              {daysRem !== null && (
                <Bar label="Durée restante" value={daysRem} max={30} color={daysRem<=7?'#EF4444':'#0D7A87'} note={`${daysRem} / 30 jours`}/>
              )}
            </div>

            {/* Historique */}
            {(clinicData.subscriptions||[]).length > 0 && (
              <div style={{ marginBottom:18 }}>
                <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:14, color:'#0F172A', marginBottom:10 }}>Historique des abonnements</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {clinicData.subscriptions.slice(0,4).map((s,i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'#F8FAFC', borderRadius:9, border:'1px solid #E2E8F0' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:12, fontWeight:600, color:'#475569' }}>Plan {s.plan}</span>
                        <SBadge status={s.status}/>
                      </div>
                      <span style={{ fontSize:11, color:'#94A3B8' }}>{fdate(s.start_date)} → {fdate(s.end_date)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Praticiens ── */}
            <div style={{ marginBottom:18 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:14, color:'#0F172A' }}>
                  Praticiens ({clinicData.users?.length||0})
                </div>
                <button onClick={()=>setShowAddUser(!showAddUser)}
                  style={{ padding:'6px 14px', borderRadius:9, border:'none', background:'#0D7A87', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  + Ajouter praticien
                </button>
              </div>
              {showAddUser && (
                <div style={{ background:'#F0FDFE', border:'1.5px solid #7DD3DA', borderRadius:12, padding:'14px', marginBottom:12 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                    {[
                      { label:'Nom complet *', key:'full_name', ph:'Dr. Rakoto Jean', type:'text' },
                      { label:'Email *',       key:'email',    ph:'rakoto@cabinet.mg', type:'email' },
                      { label:'Identifiant *', key:'username', ph:'rakotoj', type:'text' },
                      { label:'Mot de passe *',key:'password', ph:'••••••••', type:'password' },
                    ].map(f => (
                      <div key={f.key}>
                        <div style={{ fontSize:10, fontWeight:700, color:'#64748B', marginBottom:3 }}>{f.label}</div>
                        <input type={f.type} placeholder={f.ph} value={newUser[f.key]||''}
                          onChange={e=>setNewUser(u=>({...u,[f.key]:e.target.value}))}
                          style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1.5px solid #E2E8F0', fontSize:12, boxSizing:'border-box', outline:'none' }}/>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom:8 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'#64748B', marginBottom:3 }}>Rôle</div>
                    <select value={newUser.role||'DENTIST'} onChange={e=>setNewUser(u=>({...u,role:e.target.value}))}
                      style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1.5px solid #E2E8F0', fontSize:12 }}>
                      <option value="DENTIST">Dentiste</option>
                      <option value="ASSISTANT">Assistant(e)</option>
                      <option value="ACCOUNTANT">Comptable</option>
                      <option value="ADMIN">Admin cabinet</option>
                    </select>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={()=>setShowAddUser(false)} style={{ flex:1, padding:'8px', borderRadius:9, border:'1px solid #E2E8F0', background:'#fff', cursor:'pointer', fontSize:12, color:'#475569' }}>Annuler</button>
                    <button onClick={()=>onCreateUser(clinicData.clinic?.id)} disabled={userSaving}
                      style={{ flex:2, padding:'8px', borderRadius:9, border:'none', background:'#0D7A87', color:'#fff', cursor:userSaving?'not-allowed':'pointer', fontSize:12, fontWeight:700, opacity:userSaving?0.7:1 }}>
                      {userSaving ? 'Création...' : 'Créer le compte'}
                    </button>
                  </div>
                </div>
              )}
              {(clinicData.users||[]).length > 0 ? (clinicData.users||[]).map((u,i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', background:'#F8FAFC', borderRadius:8, border:'1px solid #E2E8F0', marginBottom:5 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#0F172A' }}>{u.full_name||u.username}</div>
                    <div style={{ fontSize:11, color:'#94A3B8' }}>{u.role} · {u.email||'—'}</div>
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, background:u.is_active?'#DCFCE7':'#FEE2E2', color:u.is_active?'#166534':'#991B1B', padding:'2px 8px', borderRadius:99 }}>
                    {u.is_active?'Actif':'Inactif'}
                  </span>
                </div>
              )) : <div style={{ textAlign:'center', color:'#94A3B8', fontSize:12, padding:'8px' }}>Aucun praticien</div>}
            </div>

            {/* Actions */}
            <div style={{ borderTop:'1px solid #F1F5F9', paddingTop:16 }}>
              <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:14, color:'#0F172A', marginBottom:12 }}>Actions abonnement</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
                {['ESSENTIAL','PRO','GROUP'].map(pl => {
                  const pc4   = PLAN_CFG[pl] || PLAN_CFG.PRO;
                  const Ico4  = pc4.icon;
                  return (
                    <button key={pl} disabled={actionLoad}
                      onClick={()=>!actionLoad && onActivate(clinicData.clinic?.id, pl)}
                      style={{ padding:'12px 8px', borderRadius:12, border:`1.5px solid ${pc4.border}`, background:pc4.bg, cursor:actionLoad?'not-allowed':'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6, opacity:actionLoad?0.6:1 }}
                      onMouseOver={e=>{ if(!actionLoad){e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 6px 16px ${pc4.border}40`;} }}
                      onMouseOut={e=>{ e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; }}>
                      <div style={{ width:32, height:32, borderRadius:9, background:`${pc4.text}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Ico4 size={16} color={pc4.text}/>
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, color:pc4.text }}>Activer {pl}</span>
                      <span style={{ fontSize:10, color:'#94A3B8' }}>{fmt(PLAN_PRICES[pl])} Ar</span>
                    </button>
                  );
                })}
              </div>
              <button disabled={actionLoad}
                onClick={()=>!actionLoad && onDeactivate(clinicData.clinic?.id)}
                style={{ width:'100%', padding:'11px', borderRadius:11, border:'1.5px solid #FECACA', background:'#FEF2F2', cursor:actionLoad?'not-allowed':'pointer', color:'#991B1B', fontWeight:700, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:7, opacity:actionLoad?0.6:1 }}
                onMouseOver={e=>{ if(!actionLoad) e.currentTarget.style.background='#FEE2E2'; }}
                onMouseOut={e=>e.currentTarget.style.background='#FEF2F2'}>
                {actionLoad
                  ? <div style={{ width:14, height:14, border:'2px solid #991B1B', borderTopColor:'transparent', borderRadius:'50%', animation:'_spin .6s linear infinite' }}/>
                  : <X size={14}/>
                }
                Désactiver l&apos;abonnement
              </button>
            </div>

          </div>
        ) : null}

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   VUE ADMINISTRATEUR
══════════════════════════════════════════════════ */
function AdminView() {
  const [data,       setData]       = useState(null);
  const [txs,        setTxs]        = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selClinic,  setSelClinic]  = useState(null);
  const [clinicData, setClinicData] = useState(null);
  const [clinicLoad, setClinicLoad] = useState(false);
  const [actionLoad, setActionLoad] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser]         = useState({ full_name:'', email:'', username:'', password:'', role:'DENTIST' });
  const [userSaving, setUserSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rev, tx] = await Promise.all([
        axios.get(`${API}/admin/revenue`, authH()),
        axios.get(`${API}/admin/payment-requests`, authH()),
      ]);
      setData(rev.data);
      setTxs(tx.data.paymentRequests||tx.data||[]);
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
  const openClinic = async (id, name) => {
    setSelClinic({ id, name }); setClinicLoad(true); setClinicData(null);
    try { const r = await axios.get(`${API}/admin/clinics/${id}`, authH()); setClinicData(r.data); }
    catch { toast.error('Erreur chargement cabinet'); setSelClinic(null); }
    finally { setClinicLoad(false); }
  };
  const activateClinic = async (id, plan='PRO') => {
    setActionLoad(true);
    try {
      await axios.patch(`${API}/admin/clinics/${id}/activate`, { plan, days:30 }, authH());
      toast.success(`Plan ${plan} activé`);
      const r = await axios.get(`${API}/admin/clinics/${id}`, authH()); setClinicData(r.data); load();
    } catch { toast.error('Erreur activation'); }
    finally { setActionLoad(false); }
  };
  const createUser = async (clinicId) => {
    if (!newUser.full_name || !newUser.email || !newUser.username || !newUser.password) {
      toast.error('Tous les champs sont requis'); return;
    }
    setUserSaving(true);
    try {
      await axios.post(`${API}/admin/clinics/${clinicId}/users`, newUser, authH());
      toast.success('Praticien créé avec succès');
      setShowAddUser(false);
      setNewUser({ full_name:'', email:'', username:'', password:'', role:'DENTIST' });
      const r = await axios.get(`${API}/admin/clinics/${clinicId}`, authH());
      setClinicData(r.data);
    } catch(e) { toast.error(e.response?.data?.error || 'Erreur création'); }
    finally { setUserSaving(false); }
  };

  const deactivateClinic = async id => {
    if (!window.confirm('Désactiver cet abonnement ?')) return;
    setActionLoad(true);
    try {
      await axios.patch(`${API}/admin/clinics/${id}/deactivate`, {}, authH());
      toast.success('Désactivé');
      const r = await axios.get(`${API}/admin/clinics/${id}`, authH()); setClinicData(r.data); load();
    } catch { toast.error('Erreur désactivation'); }
    finally { setActionLoad(false); }
  };

  const revenueData = Array.from({ length:6 }, (_,i) => {
    const d = new Date(); d.setMonth(d.getMonth()-5+i);
    return { name:MONTHS_FR[d.getMonth()], MRR:Math.round((data?.mrr||0)*(0.55+i*0.09)) };
  });
  const pieData = data?.byPlan
    ? Object.entries(data.byPlan).filter(([,v])=>v>0).map(([k,v])=>({ name:k, value:v }))
    : [{ name:'PRO',value:3 },{ name:'ESSENTIAL',value:2 },{ name:'GROUP',value:1 }];
  const totalClinics = pieData.reduce((a,b)=>a+b.value,0);

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:380 }}>
        <div style={SPIN}/>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <style>{`@keyframes _spin{to{transform:rotate(360deg)}}`}</style>

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
        <Kpi label="MRR mensuel"         value={`${fmt(data?.mrr)} Ar`}    sub="Abonnements actifs"  trend="up"   icon={TrendingUp} color="#0D7A87"/>
        <Kpi label="ARR annuel"           value={`${fmt(data?.arr)} Ar`}    sub="Projection ×12"      trend="up"   icon={BarChart2}  color="#7C3AED"/>
        <Kpi label="Cabinets actifs"      value={data?.activeClinics||0}    sub={`En essai: ${data?.byPlan?.TRIAL||0}`} icon={Users} color="#10B981"/>
        <Kpi label="En attente"           value={data?.pendingCount||0}     sub={data?.pendingCount>0?'À valider':'Tout à jour'} trend={data?.pendingCount>0?'down':undefined} icon={Clock} color={data?.pendingCount>0?'#EF4444':'#64748B'}/>
      </div>

      {/* Graphiques */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:14 }}>
        <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'20px 22px' }}>
          <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A', marginBottom:16 }}>Évolution des revenus</div>
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
          <div style={{ marginTop:14, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div style={{ background:'#F8FAFC', borderRadius:10, padding:'10px', textAlign:'center' }}>
              <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:18, color:'#EF4444' }}>
                {totalClinics>0?((data?.pendingCount||0)/totalClinics*100).toFixed(1):'0.0'}%
              </div>
              <div style={{ fontSize:10, color:'#94A3B8' }}>Taux churn</div>
            </div>
            <div style={{ background:'#F8FAFC', borderRadius:10, padding:'10px', textAlign:'center' }}>
              <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:18, color:'#0D7A87' }}>{totalClinics}</div>
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
            <span style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A' }}>Paiements à valider ({data.pendingPayments.length})</span>
          </div>
          {data.pendingPayments.map(p => (
            <div key={p.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'#FFFBEB', borderRadius:12, border:'1px solid #FDE68A', marginBottom:8, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, cursor:'pointer' }}
                onClick={()=>p.clinic_id && openClinic(p.clinic_id, p.clinic_name||'Cabinet')}>
                <Avatar name={p.clinic_name||'C'} size={36}/>
                <div>
                  <div style={{ fontWeight:700, fontSize:13, color:'#0F172A' }}>
                    {p.clinic_name||'Cabinet'}
                    <span style={{ fontSize:10, color:'#0D7A87', marginLeft:6 }}>→ détails</span>
                  </div>
                  <div style={{ fontSize:11, color:'#64748B' }}>{p.payment_method} — {fmt(p.amount_mga)} Ar — {fdate(p.created_at)}</div>
                </div>
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
        <div style={{ fontSize:12, color:'#94A3B8', marginBottom:14 }}>Cliquez sur une ligne pour voir les détails</div>
        {txs.length===0 ? (
          <div style={{ textAlign:'center', padding:'40px', color:'#94A3B8' }}>
            <FileText size={32} style={{ margin:'0 auto 10px', display:'block', opacity:.25 }}/><p style={{ margin:0, fontSize:13 }}>Aucune transaction</p>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'#F8FAFC' }}>
                  {['ID','Client','Plan','Montant','Date','Méthode','Statut','Actions'].map(h => (
                    <th key={h} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.06em', borderBottom:'1px solid #E2E8F0', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txs.slice(0,15).map((tx,i) => (
                  <tr key={tx.id} style={{ borderBottom:i<Math.min(txs.length,15)-1?'1px solid #F8FAFC':'none', cursor:'pointer' }}
                    onClick={()=>tx.clinic_id && openClinic(tx.clinic_id, tx.clinic_name||'Cabinet')}
                    onMouseOver={e=>e.currentTarget.style.background='#F0FDFE'}
                    onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'10px 12px', fontFamily:'monospace', fontSize:11, color:'#94A3B8' }}>#{(tx.id||'').slice(-6)}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <Avatar name={tx.clinic_name||'C'} size={28}/>
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
                    <td style={{ padding:'10px 12px' }} onClick={e=>e.stopPropagation()}>
                      {tx.status==='PENDING' && (
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

      {/* Liste tous les cabinets */}
      {(data?.allClinics||[]).length > 0 && (
        <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'20px 22px' }}>
          <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A', marginBottom:4 }}>Tous les cabinets</div>
          <div style={{ fontSize:12, color:'#94A3B8', marginBottom:14 }}>{data.allClinics.length} cabinets — cliquez pour voir les détails</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {data.allClinics.map(cl => {
              const sc  = { ACTIVE:{bg:'#DCFCE7',c:'#166534',l:'Actif'}, TRIAL:{bg:'#DBEAFE',c:'#1E40AF',l:'Essai'}, EXPIRED:{bg:'#FEE2E2',c:'#991B1B',l:'Expiré'}, CANCELLED:{bg:'#F1F5F9',c:'#475569',l:'Annulé'} }[cl.status] || {bg:'#F1F5F9',c:'#475569',l:cl.status};
              const pc2 = PLAN_CFG[cl.plan] || PLAN_CFG.PRO;
              return (
                <div key={cl.id} onClick={()=>openClinic(cl.id, cl.name)}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'#F8FAFC', borderRadius:12, border:'1px solid #E2E8F0', cursor:'pointer' }}
                  onMouseOver={e=>{e.currentTarget.style.background='#F0FDFE';e.currentTarget.style.borderColor='#7DD3DA';}}
                  onMouseOut={e=>{e.currentTarget.style.background='#F8FAFC';e.currentTarget.style.borderColor='#E2E8F0';}}>
                  <Avatar name={cl.name||'C'} size={38}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:'#0F172A' }}>{cl.name||'Cabinet'}</div>
                    <div style={{ fontSize:11, color:'#94A3B8' }}>{cl.email}{cl.city?` · ${cl.city}`:''}</div>
                  </div>
                  <span style={{ background:pc2.bg, color:pc2.text, padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>{cl.plan||'—'}</span>
                  <span style={{ background:sc.bg, color:sc.c, padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>{sc.l}</span>
                  <ChevronRight size={14} color="#94A3B8"/>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal cabinet */}
      <ClinicModal
        selClinic={selClinic}
        clinicData={clinicData}
        clinicLoad={clinicLoad}
        actionLoad={actionLoad}
        onClose={()=>setSelClinic(null)}
        onActivate={activateClinic}
        onDeactivate={deactivateClinic}
        showAddUser={showAddUser}
        setShowAddUser={setShowAddUser}
        newUser={newUser}
        setNewUser={setNewUser}
        userSaving={userSaving}
        onCreateUser={createUser}
      />

    </div>
  );
}

/* ══════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
══════════════════════════════════════════════════ */
export default function SubscriptionManagement() {
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
            {[{ id:'user',label:'Vue client' },{ id:'admin',label:'Vue admin' }].map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{ padding:'7px 16px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background:tab===t.id?'#fff':'transparent', color:tab===t.id?'#0D7A87':'#64748B', boxShadow:tab===t.id?'0 1px 4px rgba(0,0,0,.08)':'none' }}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab==='user'  && <UserView  user={user}/>}
      {tab==='admin' && <AdminView/>}
    </div>
  );
}
