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


const StripeCheckoutBtn = ({ plan, form, apiUrl, setTempPwd, setDone, setAdminUser }) => {
  const [loading, setLoading] = React.useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      // 1. Créer le cabinet en DB
      let clinicId = null;
      try {
        const r = await axios.post(`${apiUrl}/auth/register-clinic`, { ...form, plan: plan?.name || 'PRO' });
        if (r.data.temp_password) setTempPwd && setTempPwd(r.data.temp_password);
        if (r.data.admin_user) setAdminUser && setAdminUser(r.data.admin_user);
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
        return;
      }

      alert('Impossible d’ouvrir Stripe. Réessayez.');
      setDone && setDone(false);
      setLoading(false);
      
    } catch(e) {
      alert('Erreur inattendue. Réessayez.');
      setLoading(false);
    }
  };

  return (
    <button type="button" onClick={handleClick} disabled={loading}
      style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, width:'100%', padding:'14px', borderRadius:12, background:loading?'#94A3B8':'#635BFF', color:'#fff', fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, border:'none', cursor:loading?'not-allowed':'pointer', marginBottom:14, boxShadow:'0 4px 16px rgba(99,91,255,.35)', boxSizing:'border-box', transition:'all .2s' }}>
      {loading ? '⏳ Redirection vers Stripe...' : '💳 Démarrer mon essai gratuit'}
    </button>
  );
};

const Field = ({ label, name, placeholder, type = 'text', value, onChange, style, onFocus, onBlur, delay = 0 }) => (
  <div className="premium-field" style={{ animationDelay:`${delay}ms` }}>
    <label style={{ display:'block', fontSize:13, fontWeight:700, color:'#475569', marginBottom:5 }}>{label}</label>
    <input
      aria-label={label}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(name, e.target.value)}
      style={style}
      onFocus={onFocus}
      onBlur={onBlur}
      required
    />
  </div>
);

export default function RegisterPage() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [step,    setStep]    = useState(0); // 0=choix plan, 1=infos cabinet, 2=paiement
  const [plan,    setPlan]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [tempPwd, setTempPwd] = useState('');
  const [adminUser, setAdminUser] = useState(null);
  const [form,    setForm]    = useState({
    cabinet:'',
    practitioner_identifier:'',
    last_name:'',
    first_name:'',
    email:'',
    phone:'',
    city:'',
    dentists:'1',
    password:'',
    confirm_password:''
  });

  const inp = {
    width:'100%', padding:'12px 14px', borderRadius:12,
    border:'1.5px solid #E2E8F0', fontSize:15, fontFamily:'DM Sans,sans-serif',
    outline:'none', boxSizing:'border-box', transition:'border-color .2s,box-shadow .2s'
  };
  const focus = e => { e.target.style.borderColor=T; e.target.style.boxShadow=`0 0 0 3px ${T}18`; };
  const blur  = e => { e.target.style.borderColor='#E2E8F0'; e.target.style.boxShadow='none'; };
  const updateField = (name, value) => setForm(p => ({ ...p, [name]: value }));

  const submit = async () => {
    setLoading(true);
    try {
      const resp = await axios.post(`${API_URL}/auth/register-clinic`, { ...form, plan: plan?.name || 'PRO' });
      setTempPwd(resp.data.temp_password || '');
      setAdminUser(resp.data.admin_user || null);
      setDone(true);
    } catch (e) {
      alert(e.response?.data?.error || 'Erreur. Vérifiez vos informations.');
    } finally { setLoading(false); }
  };

  const passwordStrong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/.test(form.password);
  const passwordMatch = form.password && form.password === form.confirm_password;
  const stepValid = form.cabinet && form.practitioner_identifier && form.last_name && form.first_name && form.email && form.phone && form.city && passwordStrong && passwordMatch;

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#F0FDFE 0%,#E8F7F8 46%,#F8FAFC 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, fontFamily:'DM Sans,sans-serif', position:'relative', overflow:'hidden' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes softShine{0%{transform:translateX(-120%)}45%,100%{transform:translateX(140%)}}
        @keyframes logoPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 4px ${T}20,0 8px 24px ${T}30}50%{transform:scale(1.035);box-shadow:0 0 0 8px ${T}14,0 14px 34px ${T}34}}
        @keyframes fieldIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes progressGlow{0%,100%{filter:saturate(1)}50%{filter:saturate(1.5) brightness(1.05)}}
        .premium-card{position:relative}
        .premium-card:before{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(110deg,transparent 0%,rgba(255,255,255,.72) 48%,transparent 58%);transform:translateX(-120%);animation:softShine 4.8s ease-in-out infinite}
        .premium-logo{animation:logoPulse 3.4s ease-in-out infinite}
        .premium-field{animation:fieldIn .38s cubic-bezier(.16,1,.3,1) both}
        .premium-plan:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(13,122,135,.12)}
        .premium-primary:hover{transform:translateY(-1px);box-shadow:0 12px 30px ${T}42!important}
      `}</style>

      <div style={{ width:'100%', maxWidth:isMobile ? 520 : 620, animation:'fadeUp .3s ease', position:'relative', zIndex:1 }}>

        {/* Logo + titre */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <img className="premium-logo" src="/logfix.jpeg" alt="DPM" width={64} height={64} style={{ borderRadius:'50%', objectFit:'cover', marginBottom:14 }}/>
          <h1 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:24, color:'#0F172A', margin:'0 0 4px' }}>Créer votre cabinet</h1>
          <p style={{ color:'#64748B', fontSize:14, margin:0 }}>Démarrer mon essai gratuit</p>
        </div>

        {/* Card principale */}
        <div className="premium-card" style={{ background:'rgba(255,255,255,.94)', backdropFilter:'blur(18px)', borderRadius:20, boxShadow:'0 24px 60px rgba(0,0,0,.1)', border:'1px solid rgba(226,232,240,.9)', overflow:'hidden' }}>

          {/* Barre de progression */}
          <div style={{ display:'flex', gap:0 }}>
            {['Plan','Informations','Paiement'].map((s,i) => (
              <div key={i} style={{ flex:1, height:4, background: step>i ? T : step===i ? `${T}60` : '#E2E8F0', transition:'background .4s', animation: step===i ? 'progressGlow 2s ease-in-out infinite' : 'none' }}/>
            ))}
          </div>

          <div style={{ padding:'26px 28px 30px' }}>

            {/* ÉTAPE 0 — Choix du plan */}
            {step===0 && !done && (
              <>
                <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:18, color:'#0F172A', margin:'0 0 6px' }}>Choisissez votre plan</h2>
                <p style={{ color:'#64748B', fontSize:13, margin:'0 0 20px' }}>Commencez avec un essai gratuit de 30 jours.</p>
                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
                  {PLANS.map(p => (
                    <div className="premium-plan" key={p.name} onClick={() => setPlan(p)}
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
                <button type="button" className="premium-primary" disabled={!plan} onClick={() => setStep(1)}
                  style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background:plan ? `linear-gradient(135deg,${T},#13A3B4)` : '#E2E8F0', color:plan?'#fff':'#94A3B8', fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, cursor:plan?'pointer':'not-allowed', boxShadow:plan?`0 4px 16px ${T}40`:'none', transition:'all .2s' }}>
                  Continuer →
                </button>
              </>
            )}

            {/* ÉTAPE 1 — Informations cabinet */}
            {step===1 && !done && (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
                  <button type="button" onClick={()=>setStep(0)} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748B', fontSize:20, padding:0, lineHeight:1 }}>←</button>
                  <div>
                    <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:18, color:'#0F172A', margin:0 }}>Votre cabinet</h2>
                    <p style={{ color:'#64748B', fontSize:12, margin:0 }}>Plan {plan?.name} — {plan?.price} Ar/mois</p>
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '1fr 1fr', gap:12, marginBottom:20 }}>
                  <div style={{ gridColumn:'1 / -1' }}>
                    <Field label="Nom du cabinet *" name="cabinet" placeholder="Cabinet Dentaire Dr. Rakoto" value={form.cabinet} onChange={updateField} style={inp} onFocus={focus} onBlur={blur} delay={0}/>
                  </div>
                  <Field label="Identifiant praticien *" name="practitioner_identifier" placeholder="dr_rakoto" value={form.practitioner_identifier} onChange={updateField} style={inp} onFocus={focus} onBlur={blur} delay={60}/>
                  <Field label="Nom *" name="last_name" placeholder="Rakoto" value={form.last_name} onChange={updateField} style={inp} onFocus={focus} onBlur={blur} delay={100}/>
                  <Field label="Prénom *" name="first_name" placeholder="Jean" value={form.first_name} onChange={updateField} style={inp} onFocus={focus} onBlur={blur} delay={140}/>
                  <Field label="Email *" name="email" placeholder="contact@cabinet.mg" type="email" value={form.email} onChange={updateField} style={inp} onFocus={focus} onBlur={blur} delay={180}/>
                  <Field label="Téléphone *" name="phone" placeholder="034 XX XXX XX" type="tel" value={form.phone} onChange={updateField} style={inp} onFocus={focus} onBlur={blur} delay={220}/>
                  <Field label="Ville *" name="city" placeholder="Antananarivo" value={form.city} onChange={updateField} style={inp} onFocus={focus} onBlur={blur} delay={260}/>
                  <Field label="Mot de passe *" name="password" placeholder="Minimum 10 caractères" type="password" value={form.password} onChange={updateField} style={inp} onFocus={focus} onBlur={blur} delay={300}/>
                  <Field label="Confirmer le mot de passe *" name="confirm_password" placeholder="Répétez le mot de passe" type="password" value={form.confirm_password} onChange={updateField} style={inp} onFocus={focus} onBlur={blur} delay={340}/>
                  {form.password && !passwordStrong && (
                    <div style={{ gridColumn:'1 / -1', fontSize:12, color:'#DC2626', fontWeight:600, marginTop:-4 }}>
                      Le mot de passe doit contenir au moins 10 caractères, une majuscule, une minuscule, un chiffre et un symbole.
                    </div>
                  )}
                  {form.confirm_password && !passwordMatch && (
                    <div style={{ gridColumn:'1 / -1', fontSize:12, color:'#DC2626', fontWeight:600, marginTop:-4 }}>
                      Les deux mots de passe ne correspondent pas.
                    </div>
                  )}
                  <div className="premium-field" style={{ animationDelay:'300ms' }}>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:5 }}>Nombre de praticiens</label>
                    <select value={form.dentists} onChange={e=>setForm(p=>({...p,dentists:e.target.value}))}
                      style={{ ...inp, cursor:'pointer', background:'#fff' }}>
                      {['1 praticien','2-3 praticiens','4-5 praticiens','5+ praticiens'].map((o,i)=>(
                        <option key={i} value={['1','2-3','4-5','5+'][i]}>{o}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button type="button" className="premium-primary" disabled={!stepValid} onClick={() => setStep(2)}
                  style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background:stepValid?`linear-gradient(135deg,${T},#13A3B4)`:'#E2E8F0', color:stepValid?'#fff':'#94A3B8', fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, cursor:stepValid?'pointer':'not-allowed', boxShadow:stepValid?`0 4px 16px ${T}40`:'none', transition:'all .2s' }}>
                  Continuer →
                </button>
              </>
            )}

            {/* ÉTAPE 2 — Paiement */}
            {step===2 && !done && (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
                  <button type="button" onClick={()=>setStep(1)} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748B', fontSize:20, padding:0, lineHeight:1 }}>←</button>
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
                  <div style={{ fontSize:12, color:'#64748B', marginTop:4 }}>30 jours d&apos;essai gratuit inclus — carte requise, aucun prélèvement aujourd’hui</div>
                </div>

                <p style={{ color:'#475569', fontSize:13, lineHeight:1.7, marginBottom:14 }}>
                  Stripe enregistre votre carte pour activer l&apos;essai. Aucun montant n&apos;est prélevé maintenant; le plan choisi sera facturé automatiquement à la fin des 30 jours.
                </p>

                {/* Bouton Stripe en premier */}
                <StripeCheckoutBtn plan={plan} form={form} apiUrl={API_URL} setTempPwd={setTempPwd} setDone={setDone} setAdminUser={setAdminUser}/>

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
                  Votre essai gratuit de 30 jours est actif. Un email de bienvenue vous a été envoyé.
                </p>
                {adminUser && (
                  <div style={{ background:'#F0FDFE', border:'1.5px solid #7DD3DA', borderRadius:12, padding:'14px 18px', marginBottom:20, textAlign:'left' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>Identifiants de connexion</div>
                    <div style={{ fontSize:13, color:'#0F172A', marginBottom:4 }}>Identifiant : <strong>{adminUser?.username || form.practitioner_identifier}</strong></div>
                    <div style={{ fontSize:13, color:'#0F172A', marginBottom:4 }}>Email : <strong>{form.email}</strong></div>
                  </div>
                )}
                <button type="button" onClick={() => navigate('/login')}
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
          <button type="button" onClick={() => navigate('/login')} style={{ background:'none', border:'none', cursor:'pointer', color:T, fontWeight:700, fontSize:13 }}>
            Se connecter
          </button>
        </p>

      </div>
    </div>
  );
}
// Cache bust Mon Apr 20 14:05:05 UTC 2026
