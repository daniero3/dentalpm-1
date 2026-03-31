import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { User, Lock, Eye, EyeOff, Building2, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ── Logo Dentaire SVG ──
const DentalLogo = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 8 C35 8, 20 18, 18 32 C16 44, 20 52, 22 58 C25 68, 28 80, 32 88 C34 93, 38 95, 42 92 C45 89, 46 82, 48 74 C49 70, 50 68, 50 68 C50 68, 51 70, 52 74 C54 82, 55 89, 58 92 C62 95, 66 93, 68 88 C72 80, 75 68, 78 58 C80 52, 84 44, 82 32 C80 18, 65 8, 50 8 Z"
      fill="white" opacity="0.95"/>
    <path d="M35 18 C28 22, 24 30, 24 38 C24 40, 26 41, 27 40 C29 32, 34 24, 42 20 C44 19, 44 16, 42 16 C39 16, 37 17, 35 18 Z"
      fill="white" opacity="0.5"/>
    <rect x="44" y="30" width="12" height="36" rx="5" fill="#0D7A87" opacity="0.85"/>
    <rect x="30" y="44" width="40" height="12" rx="5" fill="#0D7A87" opacity="0.85"/>
  </svg>
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
  const [showPassword, setShowPassword]   = useState(false);
  const [registerData, setRegisterData]   = useState({
    username:'', email:'', password:'', role:'', full_name:'', clinic_id:''
  });

  useEffect(() => {
    // Charger les cabinets disponibles pour l'inscription
    fetchAllClinics();
  }, []);

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

      if (userData.role === 'SUPER_ADMIN') {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
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
        await selectClinic(token, userClinics[0]);
      } else {
        // Login direct
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        window.location.href = '/';
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Identifiants incorrects');
    } finally { setLoading(false); }
  };

  const selectClinic = async (token, clinic) => {
    try {
      const res = await axios.post(`${API}/auth/select-clinic`,
        { clinic_id: clinic.id },
        { headers: { Authorization: `Bearer ${token || tempToken}` } }
      );
      const { token: finalToken, user: finalUser } = res.data;
      localStorage.setItem('token', finalToken);
      localStorage.setItem('user', JSON.stringify(finalUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${finalToken}`;
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur sélection cabinet');
      setLoading(false);
    }
  };

  const handleSelectClinic = async (clinic) => {
    setLoading(true); setError('');
    await selectClinic(tempToken, clinic);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const result = await register(registerData);
    if (result.success) {
      setRegisterData({ username:'', email:'', password:'', role:'', full_name:'', clinic_id:'' });
      setStep(STEP_LOGIN);
      setError('');
    } else {
      setError(result.error || "Erreur lors de l'inscription");
    }
    setLoading(false);
  };

  const ErrorBox = ({ msg }) => msg ? (
    <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#B91C1C', padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16 }}>
      {msg}
    </div>
  ) : null;

  const FieldIcon = ({ icon: Icon }) => (
    <Icon size={16} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#94A3B8', pointerEvents:'none' }} />
  );

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 50%,#f0fdf4 100%)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:16 }}>

      {/* Logo */}
      <div style={{ textAlign:'center', marginBottom:28 }}>
        <div style={{ width:64, height:64, borderRadius:18, background:'linear-gradient(135deg,#0D7A87,#13A3B4)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', boxShadow:'0 8px 24px rgba(13,122,135,0.3)' }}>
          <DentalLogo size={32} />
        </div>
        <h1 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:24, color:'#0F172A', margin:0 }}>DPM</h1>
        <p style={{ color:'#64748B', fontSize:13, marginTop:4 }}>Logiciel de gestion de cabinet dentaire à Madagascar</p>
      </div>

      {/* Card */}
      <div style={{ background:'#fff', borderRadius:20, padding:32, width:'100%', maxWidth:440, boxShadow:'0 20px 60px rgba(15,23,42,0.12)', border:'1px solid #E2E8F0' }}>

        {/* ── LOGIN ── */}
        {step === STEP_LOGIN && (
          <>
            <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:20, color:'#0F172A', margin:'0 0 4px' }}>Connexion</h2>
            <p style={{ color:'#64748B', fontSize:13, marginBottom:24 }}>Accédez à votre espace de gestion</p>
            <ErrorBox msg={error} />
            <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 }}>Nom d'utilisateur</label>
                <div style={{ position:'relative' }}>
                  <FieldIcon icon={User} />
                  <input style={inputStyle} type="text" placeholder="admin"
                    value={loginData.username} onChange={e => setLoginData({...loginData, username:e.target.value})}
                    onFocus={e => e.target.style.borderColor='#0D7A87'}
                    onBlur={e => e.target.style.borderColor='#E2E8F0'} required />
                </div>
              </div>
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 }}>Mot de passe</label>
                <div style={{ position:'relative' }}>
                  <FieldIcon icon={Lock} />
                  <input style={{ ...inputStyle, paddingRight:42 }} type={showPassword?'text':'password'} placeholder="••••••••"
                    value={loginData.password} onChange={e => setLoginData({...loginData, password:e.target.value})}
                    onFocus={e => e.target.style.borderColor='#0D7A87'}
                    onBlur={e => e.target.style.borderColor='#E2E8F0'} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94A3B8' }}>
                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                style={{ width:'100%', padding:'12px', borderRadius:10, border:'none', background:loading?'#94A3B8':'linear-gradient(135deg,#0D7A87,#13A3B4)', color:'#fff', fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:14, cursor:loading?'not-allowed':'pointer', boxShadow:'0 4px 16px rgba(13,122,135,0.3)', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {loading ? <><Loader2 size={16} style={{ animation:'spin 0.75s linear infinite' }} />Connexion...</> : 'Se connecter'}
              </button>
            </form>
            <div style={{ textAlign:'center', marginTop:20, paddingTop:20, borderTop:'1px solid #F1F5F9' }}>
              <span style={{ fontSize:13, color:'#64748B' }}>Pas encore de compte ? </span>
              <button onClick={() => navigate('/landing')}
                style={{ fontSize:13, color:'#0D7A87', fontWeight:700, background:'none', border:'none', cursor:'pointer' }}>
                S'inscrire
              </button>
            </div>
          </>
        )}

        {/* ── SÉLECTION CABINET ── */}
        {step === STEP_CLINIC && (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
              <button onClick={() => { setStep(STEP_LOGIN); setError(''); }}
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
                <button key={clinic.id} onClick={() => handleSelectClinic(clinic)} disabled={loading}
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
              <button onClick={() => { setStep(STEP_LOGIN); setError(''); }}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#64748B', padding:4, borderRadius:6 }}>
                <ArrowLeft size={18}/>
              </button>
              <div>
                <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:18, color:'#0F172A', margin:0 }}>Inscription</h2>
                <p style={{ color:'#64748B', fontSize:12, margin:'2px 0 0' }}>Créer un nouveau compte</p>
              </div>
            </div>
            <ErrorBox msg={error} />
            <form onSubmit={handleRegister} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {/* Nom complet */}
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 }}>Nom complet *</label>
                <input style={{ ...inputStyle, paddingLeft:14 }} type="text" placeholder="Dr. Jean Rakoto"
                  value={registerData.full_name} onChange={e => setRegisterData({...registerData, full_name:e.target.value})}
                  onFocus={e => e.target.style.borderColor='#0D7A87'} onBlur={e => e.target.style.borderColor='#E2E8F0'} required />
              </div>
              {/* Username */}
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 }}>Identifiant *</label>
                <input style={{ ...inputStyle, paddingLeft:14 }} type="text" placeholder="jrakoto"
                  value={registerData.username} onChange={e => setRegisterData({...registerData, username:e.target.value})}
                  onFocus={e => e.target.style.borderColor='#0D7A87'} onBlur={e => e.target.style.borderColor='#E2E8F0'} required />
              </div>
              {/* Email */}
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 }}>Email *</label>
                <input style={{ ...inputStyle, paddingLeft:14 }} type="email" placeholder="jean@cabinet.mg"
                  value={registerData.email} onChange={e => setRegisterData({...registerData, email:e.target.value})}
                  onFocus={e => e.target.style.borderColor='#0D7A87'} onBlur={e => e.target.style.borderColor='#E2E8F0'} required />
              </div>
              {/* Mot de passe */}
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 }}>Mot de passe *</label>
                <input style={{ ...inputStyle, paddingLeft:14 }} type="password" placeholder="••••••••"
                  value={registerData.password} onChange={e => setRegisterData({...registerData, password:e.target.value})}
                  onFocus={e => e.target.style.borderColor='#0D7A87'} onBlur={e => e.target.style.borderColor='#E2E8F0'} required />
              </div>
              {/* Rôle */}
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 }}>Rôle *</label>
                <select style={{ ...inputStyle, paddingLeft:14 }} value={registerData.role}
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
                  Cabinet *
                  {loadingClinics && <span style={{ color:'#94A3B8', fontWeight:400, marginLeft:8 }}>Chargement...</span>}
                </label>
                <select style={{ ...inputStyle, paddingLeft:14 }} value={registerData.clinic_id}
                  onChange={e => setRegisterData({...registerData, clinic_id:e.target.value})}
                  onFocus={e => e.target.style.borderColor='#0D7A87'} onBlur={e => e.target.style.borderColor='#E2E8F0'} required>
                  <option value="">Sélectionnez votre cabinet</option>
                  {allClinics.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.city ? ` — ${c.city}` : ''}</option>
                  ))}
                </select>
                {allClinics.length === 0 && !loadingClinics && (
                  <p style={{ fontSize:11, color:'#94A3B8', marginTop:4 }}>Aucun cabinet disponible — contactez l'administrateur</p>
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

      <footer style={{ marginTop:24, fontSize:12, color:'#94A3B8', textAlign:'center' }}>
        © {new Date().getFullYear()} Daniero Global LLC — DentalPM Madagascar
      </footer>
    </div>
  );
};

export default LoginForm;
