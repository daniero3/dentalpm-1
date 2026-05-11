import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResponsive } from '../utils/responsive';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8001/api'
    : '/api';

const PLANS = [
  { name:'ESSENTIAL', price:'149 000', stripe:'https://buy.stripe.com/eVqeV66VS1S84A43NDcfK01', desc:'Idéal pour les cabinets solo',    popular:false },
  { name:'PRO',       price:'199 000', stripe:'https://buy.stripe.com/aFa9AM4NK54k1nSfwlcfK00', desc:'Le plus choisi par nos clients',  popular:true  },
  { name:'GROUP',     price:'299 000', stripe:'https://buy.stripe.com/9B614gbc8aoE3w05VLcfK02', desc:'Pour les groupes et multi-sites', popular:false },
];

const T = '#0D7A87';


const StripeCheckoutBtn = ({ plan, form, apiUrl, setTempPwd, setDone }) => {
  const [loading, setLoading] = React.useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      // 1. Créer le cabinet en DB
      let clinicId = null;
      try {
        const r = await axios.post(`${apiUrl}/auth/register-clinic`, { ...form, plan: plan?.name || 'PRO' });
        if (r.data.temp_password) setTempPwd && setTempPwd(r.data.temp_password);
        clinicId = r.data.clinic?.id;
      } catch(e) {
        alert(e.response?.data?.error || 'Erreur création cabinet');
        setLoading(false);
        return;
      }

      const planName = plan?.name || 'PRO';
      const checkout = await axios.post(`${apiUrl}/billing/public-checkout`, {
        plan_code: planName,
        clinic_id: clinicId,
        email: form.email
      });
      if (checkout.data?.url) {
        window.location.href = checkout.data.url;
      } else {
        alert('Impossible d’ouvrir Stripe. Réessayez.');
        setLoading(false);
      }
    } catch(e) {
      alert('Erreur inattendue. Réessayez.');
      setLoading(false);
    }
  };

  return (
    <button onClick={handleClick} disabled={loading}
      style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, width:'100%', padding:'14px', borderRadius:12, background:loading?'#94A3B8':'#635BFF', color:'#fff', fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, border:'none', cursor:loading?'not-allowed':'pointer', marginBottom:14, boxShadow:'0 4px 16px rgba(99,91,255,.35)', boxSizing:'border-box', transition:'all .2s' }}>
      {loading ? '⏳ Redirection vers Stripe...' : '💳 Enregistrer ma carte — 7 jours gratuits'}
    </button>
  );
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [step,    setStep]    = useState(0); // 0=choix plan, 1=infos cabinet, 2=paiement
  const [plan,    setPlan]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [tempPwd, setTempPwd] = useState('');
  const [form,    setForm]    = useState({ cabinet:'', email:'', phone:'', city:'', dentists:'1' });

  const inp = {
    width:'100%', padding:'12px 14px', borderRadius:12,
    border:'1.5px solid #E2E8F0', fontSize:15, fontFamily:'DM Sans,sans-serif',
    outline:'none', boxSizing:'border-box', transition:'border-color .2s,box-shadow .2s'
  };
  const focus = e => { e.target.style.borderColor=T; e.target.style.boxShadow=`0 0 0 3px ${T}18`; };
  const blur  = e => { e.target.style.borderColor='#E2E8F0'; e.target.style.boxShadow='none'; };

  const submit = async () => {
    setLoading(true);
    try {
      const resp = await axios.post(`${API_URL}/auth/register-clinic`, { ...form, plan: plan?.name || 'PRO' });
      setTempPwd(resp.data.temp_password || '');
      setDone(true);
    } catch (e) {
      alert(e.response?.data?.error || 'Erreur. Vérifiez vos informations.');
    } finally { setLoading(false); }
  };

  const stepValid = form.cabinet && form.email && form.phone && form.city;

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#F0FDFE 0%,#E8F7F8 50%,#F8FAFC 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, fontFamily:'DM Sans,sans-serif' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ width:'100%', maxWidth:520, animation:'fadeUp .3s ease' }}>

        {/* Logo + titre */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <img src="/fix-logo.jpeg" alt="DPM" width={64} height={64} style={{ borderRadius:'50%', objectFit:'cover', boxShadow:`0 0 0 4px ${T}20, 0 8px 24px ${T}30`, marginBottom:14 }}/>
          <h1 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:24, color:'#0F172A', margin:'0 0 4px' }}>Créer votre cabinet</h1>
          <p style={{ color:'#64748B', fontSize:14, margin:0 }}>Essai gratuit 7 jours — carte enregistrée, aucun prélèvement immédiat</p>
        </div>

        {/* Card principale */}
        <div style={{ background:'#fff', borderRadius:20, boxShadow:'0 24px 60px rgba(0,0,0,.1)', border:'1px solid #E2E8F0', overflow:'hidden' }}>

          {/* Barre de progression */}
          <div style={{ display:'flex', gap:0 }}>
            {['Plan','Informations','Paiement'].map((s,i) => (
              <div key={i} style={{ flex:1, height:4, background: step>i ? T : step===i ? `${T}60` : '#E2E8F0', transition:'background .4s' }}/>
            ))}
          </div>

          <div style={{ padding:'26px 28px 30px' }}>

            {/* ÉTAPE 0 — Choix du plan */}
            {step===0 && !done && (
              <>
                <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:18, color:'#0F172A', margin:'0 0 6px' }}>Choisissez votre plan</h2>
                <p style={{ color:'#64748B', fontSize:13, margin:'0 0 20px' }}>Commencez avec un essai gratuit de 7 jours.</p>
                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
                  {PLANS.map(p => (
                    <div key={p.name} onClick={() => setPlan(p)}
                      style={{ padding:'14px 16px', borderRadius:14, border:`2px solid ${plan?.name===p.name ? T : '#E2E8F0'}`, background:plan?.name===p.name ? '#F0FDFE' : '#fff', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', transition:'all .15s', position:'relative' }}
                      onMouseOver={e=>{if(plan?.name!==p.name){e.currentTarget.style.borderColor='#7DD3DA';e.currentTarget.style.background='#FAFFFE';}}}
                      onMouseOut={e=>{if(plan?.name!==p.name){e.currentTarget.style.borderColor='#E2E8F0';e.currentTarget.style.background='#fff';}}}>
                      {p.popular && <span style={{ position:'absolute', top:-10, left:16, background:T, color:'#fff', fontSize:10, fontWeight:700, padding:'2px 10px', borderRadius:99 }}>⭐ Le plus populaire</span>}
                      <div>
                        <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A' }}>Plan {p.name}</div>
                        <div style={{ fontSize:12, color:'#64748B', marginTop:2 }}>{p.desc}</div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:16, color:T }}>{p.price} Ar</div>
                        <div style={{ fontSize:11, color:'#94A3B8' }}>/mois</div>
                      </div>
                    </div>
                  ))}
                </div>
                <button disabled={!plan} onClick={() => setStep(1)}
                  style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background:plan ? `linear-gradient(135deg,${T},#13A3B4)` : '#E2E8F0', color:plan?'#fff':'#94A3B8', fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, cursor:plan?'pointer':'not-allowed', boxShadow:plan?`0 4px 16px ${T}40`:'none', transition:'all .2s' }}>
                  Continuer →
                </button>
              </>
            )}

            {/* ÉTAPE 1 — Informations cabinet */}
            {step===1 && !done && (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
                  <button onClick={()=>setStep(0)} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748B', fontSize:20, padding:0, lineHeight:1 }}>←</button>
                  <div>
                    <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:18, color:'#0F172A', margin:0 }}>Votre cabinet</h2>
                    <p style={{ color:'#64748B', fontSize:12, margin:0 }}>Plan {plan?.name} — {plan?.price} Ar/mois</p>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:20 }}>
                  {[
                    { label:'Nom du cabinet *',           name:'cabinet', ph:'Cabinet Dentaire Dr. Rakoto', type:'text'  },
                    { label:'Email professionnel *',       name:'email',   ph:'contact@cabinet.mg',         type:'email' },
                    { label:'Téléphone *',  name:'phone',   ph:'034 XX XXX XX',              type:'tel'   },
                    { label:'Ville *',                     name:'city',    ph:'Antananarivo',                type:'text'  },
                  ].map(f => (
                    <div key={f.name}>
                      <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:5 }}>{f.label}</label>
                      <input type={f.type} placeholder={f.ph} value={form[f.name]}
                        onChange={e => setForm(p => ({ ...p, [f.name]:e.target.value }))}
                        style={inp} onFocus={focus} onBlur={blur} required/>
                    </div>
                  ))}
                  <div>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:5 }}>Nombre de praticiens</label>
                    <select value={form.dentists} onChange={e=>setForm(p=>({...p,dentists:e.target.value}))}
                      style={{ ...inp, cursor:'pointer', background:'#fff' }}>
                      {['1 praticien','2-3 praticiens','4-5 praticiens','5+ praticiens'].map((o,i)=>(
                        <option key={i} value={['1','2-3','4-5','5+'][i]}>{o}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button disabled={!stepValid} onClick={() => setStep(2)}
                  style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background:stepValid?`linear-gradient(135deg,${T},#13A3B4)`:'#E2E8F0', color:stepValid?'#fff':'#94A3B8', fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, cursor:stepValid?'pointer':'not-allowed', boxShadow:stepValid?`0 4px 16px ${T}40`:'none', transition:'all .2s' }}>
                  Continuer →
                </button>
              </>
            )}

            {/* ÉTAPE 2 — Paiement */}
            {step===2 && !done && (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
                  <button onClick={()=>setStep(1)} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748B', fontSize:20, padding:0, lineHeight:1 }}>←</button>
                  <div>
                    <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:18, color:'#0F172A', margin:0 }}>💳 Modalités de paiement</h2>
                    <p style={{ color:'#64748B', fontSize:12, margin:0 }}>Plan {plan?.name} — {plan?.price} Ar/mois</p>
                  </div>
                </div>

                {/* Résumé */}
                <div style={{ background:'#F0FDFE', border:`1.5px solid ${T}40`, borderRadius:12, padding:'12px 14px', marginBottom:18 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:600, color:T }}>
                    <span>Cabinet : {form.cabinet}</span>
                    <span>{plan?.price} Ar/mois</span>
                  </div>
                  <div style={{ fontSize:12, color:'#64748B', marginTop:4 }}>7 jours d&apos;essai gratuit inclus — carte requise, aucun prélèvement aujourd’hui</div>
                </div>

                <p style={{ color:'#475569', fontSize:13, lineHeight:1.7, marginBottom:14 }}>
                  Stripe enregistre votre carte pour activer l&apos;essai. Aucun montant n&apos;est prélevé maintenant; le plan choisi sera facturé automatiquement à la fin des 7 jours.
                </p>

                {/* Bouton Stripe en premier */}
                <StripeCheckoutBtn plan={plan} form={form} apiUrl={API_URL}/>

                <p style={{ textAlign:'center', fontSize:11, color:'#94A3B8', marginTop:12, marginBottom:0 }}>
                  En confirmant, vous acceptez nos <a href="/legal/cgu" style={{ color:T }}>CGU</a>
                </p>
              </>
            )}

            {/* SUCCÈS */}
            {done && (
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <div style={{ fontSize:56, marginBottom:16 }}>🎉</div>
                <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:22, color:'#0F172A', margin:'0 0 8px' }}>Cabinet créé !</h2>
                <p style={{ color:'#64748B', fontSize:14, lineHeight:1.7, margin:'0 0 16px' }}>
                  Votre essai gratuit de 7 jours est actif. Un email de bienvenue vous a été envoyé.
                </p>
                {tempPwd && (
                  <div style={{ background:'#F0FDFE', border:'1.5px solid #7DD3DA', borderRadius:12, padding:'14px 18px', marginBottom:20, textAlign:'left' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>Identifiants de connexion</div>
                    <div style={{ fontSize:13, color:'#0F172A', marginBottom:4 }}>Email : <strong>{form.email}</strong></div>
                    <div style={{ fontSize:13, color:'#0F172A', marginBottom:8 }}>Mot de passe temporaire : <strong style={{ fontFamily:'monospace', background:'#fff', padding:'2px 8px', borderRadius:6, border:'1px solid #E2E8F0' }}>{tempPwd}</strong></div>
                    <div style={{ fontSize:11, color:'#F59E0B', fontWeight:600 }}>⚠️ Notez ce mot de passe — changez-le dès votre première connexion</div>
                  </div>
                )}
                <button onClick={() => navigate('/login')}
                  style={{ padding:'13px 32px', borderRadius:12, border:'none', background:`linear-gradient(135deg,${T},#13A3B4)`, color:'#fff', fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, cursor:'pointer', boxShadow:`0 4px 16px ${T}40` }}>
                  Se connecter →
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Lien retour login */}
        <p style={{ textAlign:'center', marginTop:18, fontSize:13, color:'#94A3B8' }}>
          Déjà un compte ?{' '}
          <button onClick={() => navigate('/login')} style={{ background:'none', border:'none', cursor:'pointer', color:T, fontWeight:700, fontSize:13 }}>
            Se connecter
          </button>
        </p>

      </div>
    </div>
  );
}
// Cache bust Mon Apr 20 14:05:05 UTC 2026
