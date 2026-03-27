import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { User, Lock, Eye, EyeOff, Building2, ChevronRight, ArrowLeft } from 'lucide-react';
import { ToothIcon } from './icons/ToothIcon';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ── Étapes du login ──
const STEP_LOGIN    = 'login';
const STEP_CLINIC   = 'clinic';
const STEP_REGISTER = 'register';

const LoginForm = () => {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]               = useState(STEP_LOGIN);
  const [loginData, setLoginData]     = useState({ username: '', password: '' });
  const [clinics, setClinics]         = useState([]);
  const [tempToken, setTempToken]     = useState(null);
  const [tempUser, setTempUser]       = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [registerData, setRegisterData] = useState({
    username:'', email:'', password:'', role:'', full_name:''
  });

  if (user) return <Navigate to="/" replace />;

  // ── Login Step 1 ──
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API}/auth/login`, {
        username: loginData.username,
        password: loginData.password
      });

      const { token, user: userData, clinics: userClinics } = res.data;

      // SUPER_ADMIN → direct dashboard
      if (userData.role === 'SUPER_ADMIN') {
        await login(loginData.username, loginData.password);
        return;
      }

      // Si plusieurs cliniques → page sélection
      if (userClinics && userClinics.length > 1) {
        setTempToken(token);
        setTempUser(userData);
        setClinics(userClinics);
        setStep(STEP_CLINIC);
      } else {
        // Une seule clinique ou pas de liste → login direct
        await login(loginData.username, loginData.password);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  // ── Sélection Cabinet Step 2 ──
  const handleSelectClinic = async (clinic) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API}/auth/select-clinic`, {
        clinic_id: clinic.id
      }, {
        headers: { Authorization: `Bearer ${tempToken}` }
      });

      const { token: finalToken, user: finalUser } = res.data;
      localStorage.setItem('token', finalToken);
      localStorage.setItem('user', JSON.stringify(finalUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${finalToken}`;
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur sélection cabinet');
    } finally {
      setLoading(false);
    }
  };

  // ── Register ──
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await register(registerData);
    if (result.success) {
      setRegisterData({ username:'', email:'', password:'', role:'', full_name:'' });
      setStep(STEP_LOGIN);
    } else {
      setError(result.error || "Erreur lors de l'inscription");
    }
    setLoading(false);
  };

  const inputStyle = {
    width:'100%', padding:'10px 14px 10px 40px',
    borderRadius:10, border:'1.5px solid #E2E8F0',
    fontSize:14, fontFamily:'DM Sans,sans-serif',
    color:'#0F172A', background:'#fff',
    outline:'none', transition:'border-color 0.2s',
    boxSizing:'border-box'
  };

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:16 }}>

      {/* Logo */}
      <div style={{ textAlign:'center', marginBottom:32 }}>
        <div style={{ width:64, height:64, borderRadius:18, background:'linear-gradient(135deg,#0D7A87,#13A3B4)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', boxShadow:'0 8px 24px rgba(13,122,135,0.3)' }}>
          <ToothIcon className="h-8 w-8" color="white" />
        </div>
        <h1 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:24, color:'#0F172A', margin:0 }}>DentalPM</h1>
        <p style={{ color:'#64748B', fontSize:13, marginTop:4 }}>Gestion de cabinet dentaire</p>
      </div>

      {/* Card */}
      <div style={{ background:'#fff', borderRadius:20, padding:32, width:'100%', maxWidth:420, boxShadow:'0 20px 60px rgba(15,23,42,0.12)', border:'1px solid #E2E8F0' }}>

        {/* ── STEP LOGIN ── */}
        {step === STEP_LOGIN && (
          <>
            <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:20, color:'#0F172A', margin:'0 0 6px' }}>Connexion</h2>
            <p style={{ color:'#64748B', fontSize:13, marginBottom:24 }}>Accédez à votre espace de gestion</p>

            {error && (
              <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#B91C1C', padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 }}>Nom d'utilisateur</label>
                <div style={{ position:'relative' }}>
                  <User size={16} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94A3B8' }} />
                  <input style={inputStyle} type="text" placeholder="admin" value={loginData.username}
                    onChange={e => setLoginData({...loginData, username: e.target.value})}
                    onFocus={e => e.target.style.borderColor='#0D7A87'}
                    onBlur={e => e.target.style.borderColor='#E2E8F0'} required />
                </div>
              </div>

              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 }}>Mot de passe</label>
                <div style={{ position:'relative' }}>
                  <Lock size={16} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94A3B8' }} />
                  <input style={{ ...inputStyle, paddingRight:40 }} type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                    value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})}
                    onFocus={e => e.target.style.borderColor='#0D7A87'}
                    onBlur={e => e.target.style.borderColor='#E2E8F0'} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94A3B8', padding:0 }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} style={{ width:'100%', padding:'12px', borderRadius:10, border:'none', background: loading ? '#94A3B8' : 'linear-gradient(135deg,#0D7A87,#13A3B4)', color:'#fff', fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:14, cursor: loading ? 'not-allowed' : 'pointer', boxShadow:'0 4px 16px rgba(13,122,135,0.3)', transition:'all 0.2s', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {loading ? (
                  <><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.75s linear infinite' }} />Connexion...</>
                ) : 'Se connecter'}
              </button>
            </form>

            <div style={{ textAlign:'center', marginTop:20, paddingTop:20, borderTop:'1px solid #F1F5F9' }}>
              <span style={{ fontSize:13, color:'#64748B' }}>Pas encore de compte ? </span>
              <button onClick={() => { setStep(STEP_REGISTER); setError(''); }} style={{ fontSize:13, color:'#0D7A87', fontWeight:700, background:'none', border:'none', cursor:'pointer' }}>
                S'inscrire
              </button>
            </div>
          </>
        )}

        {/* ── STEP SÉLECTION CABINET ── */}
        {step === STEP_CLINIC && (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
              <button onClick={() => { setStep(STEP_LOGIN); setError(''); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748B', padding:4, borderRadius:6 }}>
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:18, color:'#0F172A', margin:0 }}>Choisir votre cabinet</h2>
                <p style={{ color:'#64748B', fontSize:12, margin:'2px 0 0' }}>Bonjour {tempUser?.full_name} 👋</p>
              </div>
            </div>

            {error && (
              <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#B91C1C', padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16 }}>
                {error}
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {clinics.map(clinic => (
                <button key={clinic.id} onClick={() => handleSelectClinic(clinic)} disabled={loading}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderRadius:12, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', transition:'all 0.18s ease', textAlign:'left', width:'100%' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='#0D7A87'; e.currentTarget.style.background='rgba(13,122,135,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.background='#fff'; }}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:'rgba(13,122,135,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Building2 size={18} style={{ color:'#0D7A87' }} />
                    </div>
                    <div>
                      <p style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:14, color:'#0F172A', margin:0 }}>{clinic.name}</p>
                      <p style={{ fontSize:12, color:'#64748B', margin:'2px 0 0' }}>{clinic.city || 'Madagascar'}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} style={{ color:'#94A3B8' }} />
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── STEP REGISTER ── */}
        {step === STEP_REGISTER && (
          <>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
              <button onClick={() => { setStep(STEP_LOGIN); setError(''); }} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748B', padding:4, borderRadius:6 }}>
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:18, color:'#0F172A', margin:0 }}>Inscription</h2>
                <p style={{ color:'#64748B', fontSize:12, margin:'2px 0 0' }}>Créer un nouveau compte</p>
              </div>
            </div>

            {error && (
              <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#B91C1C', padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {[
                { label:'Nom complet', key:'full_name', type:'text', placeholder:'Dr. Jean Rakoto' },
                { label:'Identifiant', key:'username',  type:'text', placeholder:'jrakoto' },
                { label:'Email',       key:'email',     type:'email', placeholder:'jean@cabinet.mg' },
                { label:'Mot de passe',key:'password',  type:'password', placeholder:'••••••••' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 }}>{field.label}</label>
                  <input style={{ ...inputStyle, paddingLeft:14 }} type={field.type} placeholder={field.placeholder}
                    value={registerData[field.key]} onChange={e => setRegisterData({...registerData, [field.key]: e.target.value})}
                    onFocus={e => e.target.style.borderColor='#0D7A87'}
                    onBlur={e => e.target.style.borderColor='#E2E8F0'} required />
                </div>
              ))}

              <div>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 }}>Rôle</label>
                <select value={registerData.role} onChange={e => setRegisterData({...registerData, role: e.target.value})}
                  style={{ ...inputStyle, paddingLeft:14 }} required>
                  <option value="">Sélectionnez votre rôle</option>
                  <option value="DENTIST">Dentiste</option>
                  <option value="ASSISTANT">Assistant(e)</option>
                  <option value="ACCOUNTANT">Comptable</option>
                </select>
              </div>

              <button type="submit" disabled={loading} style={{ width:'100%', padding:'12px', borderRadius:10, border:'none', background: loading ? '#94A3B8' : 'linear-gradient(135deg,#0D7A87,#13A3B4)', color:'#fff', fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:14, cursor: loading ? 'not-allowed' : 'pointer', marginTop:4 }}>
                {loading ? "Inscription..." : "S'inscrire"}
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
