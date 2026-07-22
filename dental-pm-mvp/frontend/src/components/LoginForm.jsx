import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import {
  User, Lock, Eye, EyeOff, Building2, ChevronRight, ArrowLeft, Loader2,
  ShieldCheck, Sparkles, Activity, CalendarCheck, Receipt, Wifi
} from 'lucide-react';
import axios from 'axios';
import { removeStoredValue, setStoredJson } from '../utils/versionedStorage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL
  ? `${BACKEND_URL}/api`
  : typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8001/api'
    : '/api';

const normalizePlan = (value) => {
  const raw = typeof value === 'string'
    ? value
    : value?.plan || value?.current_plan || value?.name || value?.code || null;
  const plan = raw ? String(raw).toUpperCase() : null;
  return ['ESSENTIAL', 'PRO', 'GROUP'].includes(plan) ? plan : null;
};

const syncPlanCache = (value) => {
  const plan = normalizePlan(value);
  if (plan) {
    setStoredJson('plan', plan);
    setStoredJson('userPlan', plan);
  } else {
    removeStoredValue('plan');
    removeStoredValue('userPlan');
  }
};

// ── Logo premium animé ──
const LogoAnim = () => (
  <div className="login-logo-orbit" style={{ width:104, height:104, margin:'0 auto 20px', position:'relative' }}>
    <div className="login-logo-pulse" style={{ width:104, height:104, borderRadius:'50%', overflow:'hidden', flexShrink:0,
        boxShadow:'0 0 0 6px rgba(13,122,135,.12), 0 18px 42px rgba(13,122,135,.26)', position:'relative', zIndex:2 }}>
      <img src="/logfix.jpeg" alt="DPM Madagascar"
        style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center', display:'block' }}/>
    </div>
    <div style={{ position:'absolute', right:-2, bottom:8, width:28, height:28, borderRadius:'50%', background:'#10B981', border:'4px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3, boxShadow:'0 8px 18px rgba(16,185,129,.28)' }}>
      <ShieldCheck size={14} color="#fff"/>
    </div>
  </div>
);

const DentalLogo = ({ size = 32 }) => (
  <div style={{ width:size, height:size, borderRadius:'50%', overflow:'hidden', display:'block' }}>
    <img src="/logfix.jpeg" alt="DPM Madagascar"
      style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center', display:'block' }}/>
  </div>
);

const STEP_LOGIN    = 'login';
const STEP_CLINIC   = 'clinic';
const STEP_REGISTER = 'register';

const inputStyle = {
  width:'100%', padding:'10px 14px 10px 42px', borderRadius:10,
  border:'1.5px solid #E2E8F0', fontSize:14, fontFamily:'DM Sans,sans-serif',
  color:'#0F172A', background:'#fff', outline:'none',
  transition:'border-color 0.2s', boxSizing:'border-box'
};

const LoginForm = () => {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep]                   = useState(STEP_LOGIN);
  const [loginData, setLoginData]         = useState({ username:'', password:'' });
  const [clinics, setClinics]             = useState([]);
  const [allClinics, setAllClinics]       = useState([]);
  const [tempToken, setTempToken]         = useState(null);
  const [tempUser, setTempUser]           = useState(null);
  const [loading, setLoading]             = useState(false);
  const [loadingClinics, setLoadingClinics] = useState(false);
  const [error, setError]                 = useState('');
  const [checkoutNotice, setCheckoutNotice] = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [registerData, setRegisterData]   = useState({
    username:'', email:'', password:'', role:'', full_name:'', clinic_id:''
  });

  useEffect(() => {
    // Charger les cabinets disponibles pour l'inscription
    fetchAllClinics();
    finalizeStripeCheckout();
  }, []);

  const finalizeStripeCheckout = async () => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (params.get('checkout') !== 'success' || !sessionId) return;

    setCheckoutNotice('Activation de votre essai en cours...');
    try {
      await axios.post(`${API}/billing/finalize-public-checkout`, { session_id: sessionId });
      setCheckoutNotice('Votre essai est actif. Connectez-vous avec les identifiants reçus lors de l’inscription.');
      const cleanUrl = `${window.location.pathname}?checkout=success`;
      window.history.replaceState({}, '', cleanUrl);
      fetchAllClinics();
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de confirmer automatiquement l’essai Stripe.');
    }
  };

  const fetchAllClinics = async () => {
    setLoadingClinics(true);
    try {
      const res = await axios.get(`${API}/auth/clinics-list`);
      setAllClinics(res.data.clinics || []);
    } catch (e) { console.error('Clinics list error:', e); }
    finally { setLoadingClinics(false); }
  };

  if (user) return <Navigate to="/" replace />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await axios.post(`${API}/auth/login`, {
        username: loginData.username,
        password: loginData.password
      });
      const { token, user: userData, clinics: userClinics, needs_clinic_selection } = res.data;
      const loginPlan = normalizePlan(res.data.plan || userData?.plan || userData?.current_plan);

      if (userData.role === 'SUPER_ADMIN') {
        setStoredJson('user', userData);
        syncPlanCache(null);
        window.location.href = '/';
        return;
      }

      if (needs_clinic_selection && userClinics?.length > 1) {
        setTempToken(token);
        setTempUser(userData);
        setClinics(userClinics);
        setStep(STEP_CLINIC);
      } else if (userClinics?.length === 1) {
        // Auto-sélectionner si une seule clinique
        await selectClinic(token, userClinics[0], loginPlan);
      } else {
        // Login direct
        setStoredJson('user', userData);
        syncPlanCache(loginPlan);
        window.location.href = '/';
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Identifiants incorrects');
    } finally { setLoading(false); }
  };

  const selectClinic = async (token, clinic, fallbackPlan = null) => {
    try {
      const res = await axios.post(`${API}/auth/select-clinic`,
        { clinic_id: clinic.id },
        token || tempToken ? { headers: { Authorization: `Bearer ${token || tempToken}` } } : undefined
      );
      const { user: finalUser } = res.data;
      setStoredJson('user', finalUser);
      syncPlanCache(finalUser?.plan || finalUser?.current_plan || clinic?.current_plan || fallbackPlan);
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur sélection cabinet');
      setLoading(false);
    }
  };

  const handleSelectClinic = async (clinic) => {
    setLoading(true); setError('');
    await selectClinic(tempToken, clinic, tempUser?.plan || tempUser?.current_plan);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await register(registerData);
      if (result.success) {
        setRegisterData({ username:'', email:'', password:'', role:'', full_name:'', clinic_id:'' });
        setStep(STEP_LOGIN);
        setError('');
      } else {
        setError(result.error || "Erreur lors de l'inscription");
      }
    } finally {
      setLoading(false);
    }
  };

  const ErrorBox = ({ msg }) => msg ? (
    <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#B91C1C', padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16 }}>
      {msg}
    </div>
  ) : null;

  const NoticeBox = ({ msg }) => msg ? (
    <div style={{ background:'#F0FDFE', border:'1px solid #99F6E4', color:'#0F766E', padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16 }}>
      {msg}
    </div>
  ) : null;

  const FieldIcon = ({ icon: Icon }) => (
    <Icon size={16} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#94A3B8', pointerEvents:'none' }} />
  );

  return (
    <div className="login-premium-page" style={{ minHeight:'100vh', background:'#F8FAFC', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:16, position:'relative', overflow:'hidden' }}>
      <style>{`
        @keyframes loginFloat { 0%,100%{ transform:translate3d(0,0,0) scale(1); } 50%{ transform:translate3d(0,-16px,0) scale(1.03); } }
        @keyframes loginGlow { 0%,100%{ opacity:.55; transform:scale(1); } 50%{ opacity:.9; transform:scale(1.08); } }
        @keyframes loginSlideUp { from{ opacity:0; transform:translateY(22px); } to{ opacity:1; transform:translateY(0); } }
        @keyframes loginFieldIn { from{ opacity:0; transform:translateX(-12px); } to{ opacity:1; transform:translateX(0); } }
        @keyframes loginShine { 0%{ transform:translateX(-130%) skewX(-18deg); } 45%,100%{ transform:translateX(165%) skewX(-18deg); } }
        @keyframes loginGridDrift { from{ background-position:0 0, 0 0; } to{ background-position:42px 42px, 42px 42px; } }
        @keyframes loginProgress { 0%{ width:38%; } 50%{ width:92%; } 100%{ width:72%; } }
        @keyframes loginCardHover { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-6px); } }
        @keyframes loginLogoRing { to{ transform:rotate(360deg); } }
        @keyframes loginPulse { 0%,100%{ transform:scale(1); } 50%{ transform:scale(1.035); } }
        .login-premium-page::before {
          content:'';
          position:absolute;
          inset:0;
          background:
            radial-gradient(circle at 18% 22%, rgba(13,122,135,.18), transparent 28%),
            radial-gradient(circle at 84% 16%, rgba(59,79,216,.16), transparent 24%),
            radial-gradient(circle at 72% 82%, rgba(14,165,112,.16), transparent 26%),
            linear-gradient(135deg,#F8FAFC 0%,#EEF7F8 45%,#F5F7FF 100%);
          z-index:0;
        }
        .login-premium-page::after {
          content:'';
          position:absolute;
          inset:0;
          background-image:
            linear-gradient(rgba(13,122,135,.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(13,122,135,.045) 1px, transparent 1px);
          background-size:42px 42px;
          animation:loginGridDrift 18s linear infinite;
          mask-image:linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%);
          z-index:0;
        }
        .login-floating-a { animation:loginFloat 7s ease-in-out infinite; }
        .login-floating-b { animation:loginFloat 8s ease-in-out infinite reverse; }
        .login-glow { animation:loginGlow 5s ease-in-out infinite; }
        .login-card-anim { animation:loginSlideUp .52s cubic-bezier(.16,1,.3,1) both; }
        .login-field-anim { animation:loginFieldIn .45s cubic-bezier(.16,1,.3,1) both; }
        .login-premium-input:focus {
          transform:translateY(-1px);
          box-shadow:0 0 0 4px rgba(13,122,135,.11), 0 10px 24px rgba(15,23,42,.08) !important;
        }
        .login-submit-shine { position:relative; overflow:hidden; }
        .login-submit-shine::after {
          content:'';
          position:absolute;
          top:-40%;
          bottom:-40%;
          left:0;
          width:44%;
          background:linear-gradient(90deg, transparent, rgba(255,255,255,.34), transparent);
          animation:loginShine 3.2s ease-in-out infinite;
          pointer-events:none;
        }
        .login-feature-card {
          transition:transform .22s ease, background .22s ease, border-color .22s ease;
        }
        .login-feature-card:hover {
          transform:translateY(-4px);
          background:rgba(255,255,255,.14) !important;
          border-color:rgba(125,211,252,.28) !important;
        }
        .login-showcase { animation:loginSlideUp .56s cubic-bezier(.16,1,.3,1) both, loginCardHover 7s ease-in-out 1.2s infinite; }
        .login-logo-orbit::before {
          content:'';
          position:absolute;
          inset:-7px;
          border-radius:50%;
          background:conic-gradient(from 0deg, rgba(13,122,135,0), rgba(13,122,135,.55), rgba(59,79,216,.45), rgba(13,122,135,0));
          animation:loginLogoRing 7s linear infinite;
          z-index:1;
        }
        .login-logo-pulse { animation:loginPulse 3.2s ease-in-out infinite; }
        @media (max-width: 920px) {
          .login-premium-grid { grid-template-columns: 1fr !important; max-width: 480px !important; }
          .login-showcase { display:none !important; }
        }
      `}</style>

      <div className="login-glow" style={{ position:'absolute', width:360, height:360, borderRadius:'50%', background:'rgba(13,122,135,.16)', left:-120, top:-120, filter:'blur(18px)', zIndex:1 }}/>
      <div className="login-glow" style={{ position:'absolute', width:420, height:420, borderRadius:'50%', background:'rgba(59,79,216,.14)', right:-150, bottom:-160, filter:'blur(22px)', zIndex:1 }}/>

      <div className="login-premium-grid" style={{ width:'100%', maxWidth:1040, display:'grid', gridTemplateColumns:'1.1fr .9fr', gap:18, alignItems:'stretch', position:'relative', zIndex:2 }}>
        <div className="login-card-anim" style={{ background:'rgba(255,255,255,.86)', backdropFilter:'blur(22px)', borderRadius:26, padding:34, width:'100%', boxShadow:'0 28px 80px rgba(15,23,42,0.16)', border:'1px solid rgba(255,255,255,.78)' }}>
          {/* Logo premium */}
          <div style={{ textAlign:'center', marginBottom:26 }}>
            <LogoAnim/>
            <h1 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:900, fontSize:28, color:'#0F172A', margin:'0 0 5px', letterSpacing:0 }}>DPM Madagascar</h1>
            <p style={{ color:'#64748B', fontSize:13, margin:0, fontWeight:700 }}>Espace sécurisé de gestion de cabinet dentaire</p>
          </div>

        {/* ── LOGIN ── */}
        {step === STEP_LOGIN && (
          <>
            <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:20, color:'#0F172A', margin:'0 0 4px' }}>Connexion</h2>
            <p style={{ color:'#64748B', fontSize:13, marginBottom:24 }}>Accédez à votre espace de gestion</p>
            <NoticeBox msg={checkoutNotice} />
            <ErrorBox msg={error} />
            <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="login-field-anim" style={{ animationDelay:'.08s' }}>
                <label htmlFor="login-username" style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 }}>Nom d'utilisateur</label>
                <div style={{ position:'relative' }}>
                  <FieldIcon icon={User} />
                  <input id="login-username" aria-label="Nom d'utilisateur" className="login-premium-input" style={inputStyle} type="text" placeholder="admin"
                    autoComplete="username"
                    value={loginData.username} onChange={e => setLoginData({...loginData, username:e.target.value})}
                    onFocus={e => e.target.style.borderColor='#0D7A87'}
                    onBlur={e => e.target.style.borderColor='#E2E8F0'} required />
                </div>
              </div>
              <div className="login-field-anim" style={{ animationDelay:'.16s' }}>
                <label htmlFor="login-password" style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 }}>Mot de passe</label>
                <div style={{ position:'relative' }}>
                  <FieldIcon icon={Lock} />
                  <input id="login-password" aria-label="Mot de passe" className="login-premium-input" style={{ ...inputStyle, paddingRight:42 }} type={showPassword?'text':'password'} placeholder="••••••••"
                    autoComplete="current-password"
                    value={loginData.password} onChange={e => setLoginData({...loginData, password:e.target.value})}
                    onFocus={e => e.target.style.borderColor='#0D7A87'}
                    onBlur={e => e.target.style.borderColor='#E2E8F0'} required />
                  <button type="button" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onClick={() => setShowPassword(!showPassword)}
                    style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94A3B8' }}>
                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="login-submit-shine"
                style={{ width:'100%', padding:'13px', borderRadius:13, border:'none', background:loading?'#94A3B8':'linear-gradient(135deg,#0D7A87,#13A3B4)', color:'#fff', fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:14, cursor:loading?'not-allowed':'pointer', boxShadow:'0 12px 28px rgba(13,122,135,0.28)', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'transform .18s ease, box-shadow .18s ease', animation:'loginFieldIn .45s cubic-bezier(.16,1,.3,1) .24s both' }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 16px 34px rgba(13,122,135,0.34)'; }}}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 12px 28px rgba(13,122,135,0.28)'; }}>
                {loading ? <><Loader2 size={16} style={{ animation:'spin 0.75s linear infinite' }} />Connexion...</> : 'Se connecter'}
              </button>
            </form>
            <div style={{ textAlign:'center', marginTop:20, paddingTop:20, borderTop:'1px solid #F1F5F9' }}>
              <span style={{ fontSize:13, color:'#64748B' }}>Pas encore abonné ? </span>
              <button type="button" onClick={() => navigate('/register')}
                style={{ fontSize:13, color:'#7C3AED', fontWeight:700, background:'none', border:'none', cursor:'pointer' }}>
                S&apos;abonner →
              </button>
            </div>
          </>
        )}

        {/* ── SÉLECTION CABINET ── */}
        {step === STEP_CLINIC && (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
              <button type="button" onClick={() => { setStep(STEP_LOGIN); setError(''); }}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#64748B', padding:4, borderRadius:6 }}>
                <ArrowLeft size={18}/>
              </button>
              <div>
                <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:18, color:'#0F172A', margin:0 }}>Choisir votre cabinet</h2>
                <p style={{ color:'#64748B', fontSize:12, margin:'2px 0 0' }}>Bonjour {tempUser?.full_name} 👋</p>
              </div>
            </div>
            <ErrorBox msg={error} />
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {clinics.map(clinic => (
                <button type="button" key={clinic.id} onClick={() => handleSelectClinic(clinic)} disabled={loading}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderRadius:12, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', transition:'all 0.18s', textAlign:'left', width:'100%' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='#0D7A87'; e.currentTarget.style.background='rgba(13,122,135,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.background='#fff'; }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:'rgba(13,122,135,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Building2 size={18} style={{ color:'#0D7A87' }}/>
                    </div>
                    <div>
                      <p style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:14, color:'#0F172A', margin:0 }}>{clinic.name}</p>
                      <p style={{ fontSize:12, color:'#64748B', margin:'2px 0 0' }}>{clinic.city || 'Madagascar'}</p>
                    </div>
                  </div>
                  {loading ? <Loader2 size={16} style={{ color:'#94A3B8', animation:'spin 0.75s linear infinite' }}/> : <ChevronRight size={18} style={{ color:'#94A3B8' }}/>}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── INSCRIPTION ── */}
        {step === STEP_REGISTER && (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
              <button type="button" onClick={() => { setStep(STEP_LOGIN); setError(''); }}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#64748B', padding:4, borderRadius:6 }}>
                <ArrowLeft size={18}/>
              </button>
              <div>
                <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:18, color:'#0F172A', margin:0 }}>Nouveau compte</h2>
                <p style={{ color:'#64748B', fontSize:12, margin:'2px 0 0' }}>Praticien · Assistant(e) · Comptable</p>
              </div>
            </div>
            <ErrorBox msg={error} />
            <form onSubmit={handleRegister} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {/* Nom complet */}
              <div>
                <label htmlFor="register-full-name" style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 }}>Nom complet *</label>
                <input id="register-full-name" aria-label="Nom complet" style={{ ...inputStyle, paddingLeft:14 }} type="text" placeholder="Dr. Jean Rakoto"
                  value={registerData.full_name} onChange={e => setRegisterData({...registerData, full_name:e.target.value})}
                  onFocus={e => e.target.style.borderColor='#0D7A87'} onBlur={e => e.target.style.borderColor='#E2E8F0'} required />
              </div>
              {/* Username */}
              <div>
                <label htmlFor="register-username" style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 }}>Identifiant *</label>
                <input id="register-username" aria-label="Identifiant" style={{ ...inputStyle, paddingLeft:14 }} type="text" placeholder="jrakoto"
                  value={registerData.username} onChange={e => setRegisterData({...registerData, username:e.target.value})}
                  onFocus={e => e.target.style.borderColor='#0D7A87'} onBlur={e => e.target.style.borderColor='#E2E8F0'} required />
              </div>
              {/* Email */}
              <div>
                <label htmlFor="register-email" style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 }}>Email *</label>
                <input id="register-email" aria-label="Email" style={{ ...inputStyle, paddingLeft:14 }} type="email" placeholder="jean@cabinet.mg"
                  value={registerData.email} onChange={e => setRegisterData({...registerData, email:e.target.value})}
                  onFocus={e => e.target.style.borderColor='#0D7A87'} onBlur={e => e.target.style.borderColor='#E2E8F0'} required />
              </div>
              {/* Mot de passe */}
              <div>
                <label htmlFor="register-password" style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 }}>Mot de passe *</label>
                <input id="register-password" aria-label="Mot de passe" style={{ ...inputStyle, paddingLeft:14 }} type="password" placeholder="••••••••"
                  value={registerData.password} onChange={e => setRegisterData({...registerData, password:e.target.value})}
                  onFocus={e => e.target.style.borderColor='#0D7A87'} onBlur={e => e.target.style.borderColor='#E2E8F0'} required />
              </div>
              {/* Rôle */}
              <div>
                <label htmlFor="register-role" style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 }}>Rôle *</label>
                <select id="register-role" style={{ ...inputStyle, paddingLeft:14 }} value={registerData.role}
                  onChange={e => setRegisterData({...registerData, role:e.target.value})}
                  onFocus={e => e.target.style.borderColor='#0D7A87'} onBlur={e => e.target.style.borderColor='#E2E8F0'} required>
                  <option value="">Sélectionnez votre rôle</option>
                  <option value="DENTIST">Dentiste</option>
                  <option value="ASSISTANT">Assistant(e)</option>
                  <option value="ACCOUNTANT">Comptable</option>
                </select>
              </div>
              {/* ✅ Sélection Cabinet */}
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 }}>
                  Cabinet * {loadingClinics && <span style={{ color:'#94A3B8', fontWeight:400, marginLeft:8 }}>Chargement...</span>}
                </label>
                <select style={{ ...inputStyle, paddingLeft:14 }} value={registerData.clinic_id}
                  onChange={e => setRegisterData({...registerData, clinic_id:e.target.value})}
                  onFocus={e => e.target.style.borderColor='#0D7A87'} onBlur={e => e.target.style.borderColor='#E2E8F0'} required>
                  <option value="">Sélectionnez votre cabinet</option>
                  {allClinics.map(cl => (
                    <option key={cl.id} value={cl.id}>
                      {cl.name}{cl.city ? ` — ${cl.city}` : ''}{cl.current_plan ? ` (${cl.current_plan})` : ''}
                    </option>
                  ))}
                </select>
                {allClinics.length === 0 && !loadingClinics && (
                  <div style={{ background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:9, padding:'10px 12px', marginTop:6 }}>
                    <p style={{ fontSize:12, color:'#B45309', margin:0, fontWeight:600 }}>⚠️ Aucun cabinet abonné disponible</p>
                    <p style={{ fontSize:11, color:'#B45309', margin:'3px 0 0' }}>Votre cabinet doit avoir un abonnement actif pour vous ajouter.</p>
                  </div>
                )}
                {allClinics.length > 0 && (
                  <p style={{ fontSize:11, color:'#94A3B8', marginTop:4 }}>Seuls les cabinets avec un abonnement actif apparaissent dans la liste.</p>
                )}
              </div>

              <button type="submit" disabled={loading}
                style={{ width:'100%', padding:'12px', borderRadius:10, border:'none', background:loading?'#94A3B8':'linear-gradient(135deg,#0D7A87,#13A3B4)', color:'#fff', fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:14, cursor:loading?'not-allowed':'pointer', marginTop:4, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {loading ? <><Loader2 size={16} style={{ animation:'spin 0.75s linear infinite' }}/>Inscription...</> : "S'inscrire"}
              </button>
            </form>
          </>
        )}
        </div>

        <aside className="login-showcase login-card-anim" style={{ animationDelay:'.08s', background:'linear-gradient(160deg, rgba(12,35,50,.96), rgba(13,61,74,.94))', borderRadius:26, padding:28, color:'#fff', position:'relative', overflow:'hidden', border:'1px solid rgba(255,255,255,.12)', boxShadow:'0 28px 80px rgba(15,23,42,0.18)' }}>
          <div className="login-floating-a" style={{ position:'absolute', right:-58, top:-58, width:170, height:170, borderRadius:'50%', background:'rgba(45,196,213,.18)', filter:'blur(2px)' }}/>
          <div className="login-floating-b" style={{ position:'absolute', left:-54, bottom:-70, width:210, height:210, borderRadius:'50%', background:'rgba(59,79,216,.16)', filter:'blur(3px)' }}/>
          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'7px 11px', borderRadius:99, background:'rgba(255,255,255,.10)', border:'1px solid rgba(255,255,255,.12)', fontSize:12, fontWeight:800, color:'#BFF7FF', marginBottom:26 }}>
              <Sparkles size={14}/> Version cabinet premium
            </div>
            <h2 style={{ fontFamily:'Plus Jakarta Sans', fontSize:30, lineHeight:1.12, fontWeight:900, color:'#fff', margin:'0 0 12px', letterSpacing:0 }}>
              Pilotez le cabinet avec une interface claire, rapide et sécurisée.
            </h2>
            <p style={{ color:'rgba(226,232,240,.78)', fontSize:14, lineHeight:1.65, margin:'0 0 24px' }}>
              Rendez-vous, patients, factures, achats, dépenses et rapports restent accessibles dans un environnement fluide et pensé pour le travail quotidien.
            </p>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:22 }}>
              {[
                { icon:CalendarCheck, label:'Agenda', value:'Temps réel' },
                { icon:Receipt, label:'Finance', value:'Suivi précis' },
                { icon:Activity, label:'Activité', value:'Vue globale' },
                { icon:Wifi, label:'Session', value:'Sécurisée' },
              ].map(item => (
                <div key={item.label} className="login-feature-card" style={{ padding:14, borderRadius:16, background:'rgba(255,255,255,.09)', border:'1px solid rgba(255,255,255,.10)' }}>
                  <item.icon size={18} color="#7DD3FC"/>
                  <div style={{ fontSize:12, color:'rgba(226,232,240,.66)', marginTop:10 }}>{item.label}</div>
                  <div style={{ fontSize:15, fontWeight:900, color:'#fff', marginTop:2 }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ padding:16, borderRadius:18, background:'rgba(255,255,255,.10)', border:'1px solid rgba(255,255,255,.12)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontSize:12, color:'rgba(226,232,240,.72)', fontWeight:700 }}>Disponibilité plateforme</span>
                <span style={{ display:'inline-flex', alignItems:'center', gap:6, color:'#86EFAC', fontSize:12, fontWeight:900 }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', background:'#22C55E', boxShadow:'0 0 0 4px rgba(34,197,94,.16)' }}/> Active
                </span>
              </div>
              <div style={{ height:8, borderRadius:99, background:'rgba(255,255,255,.12)', overflow:'hidden' }}>
                <div style={{ width:'92%', height:'100%', borderRadius:99, background:'linear-gradient(90deg,#2DD4BF,#38BDF8)', animation:'loginProgress 4.6s ease-in-out infinite' }}/>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <footer style={{ marginTop:22, fontSize:12, color:'#64748B', textAlign:'center', position:'relative', zIndex:2, fontWeight:700 }}>
        © {new Date().getFullYear()} Daniero Global LLC — DentalPM Madagascar
      </footer>
    </div>
  );
};

export default LoginForm;
