import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Building2, User, Lock, Phone, Mail, MapPin, Save, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../App';
import { useResponsive } from '../utils/responsive';

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : 'https://dentalpm-1-production.up.railway.app/api';
const authH = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const inp = {
  width:'100%', padding:'10px 12px', borderRadius:10,
  border:'1.5px solid #E2E8F0', fontSize:13, fontFamily:'inherit',
  outline:'none', boxSizing:'border-box', background:'#fff'
};
const T = '#0D7A87';

export default function CabinetSettings() {
  const { user } = useAuth();
  const { isMobile } = useResponsive();
  const [tab, setTab]         = useState('cabinet');
  const [clinic, setClinic]   = useState({});
  const [profile, setProfile] = useState({});
  const [pwd, setPwd]         = useState({ current:'', new_pwd:'', confirm:'' });
  const [showPwd, setShowPwd] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Charger infos cabinet
    axios.get(`${API}/auth/me`, authH()).catch(()=>{});
    // Charger profil user depuis localStorage
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      setProfile({ full_name: u.full_name||'', email: u.email||'', phone: u.phone||'', specialization: u.specialization||'' });
    } catch{}
  }, []);

  const saveProfile = async () => {
    setLoading(true);
    try {
      await axios.put(`${API}/auth/profile`, profile, authH());
      toast.success('Profil mis à jour');
    } catch(e) { toast.error(e.response?.data?.error || 'Erreur'); }
    finally { setLoading(false); }
  };

  const changePassword = async () => {
    if (!pwd.current || !pwd.new_pwd) { toast.error('Remplissez tous les champs'); return; }
    if (pwd.new_pwd !== pwd.confirm) { toast.error('Les mots de passe ne correspondent pas'); return; }
    if (pwd.new_pwd.length < 6) { toast.error('Minimum 6 caractères'); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/change-password`, { current_password: pwd.current, new_password: pwd.new_pwd }, authH());
      toast.success('Mot de passe modifié avec succès');
      setPwd({ current:'', new_pwd:'', confirm:'' });
    } catch(e) { toast.error(e.response?.data?.error || 'Mot de passe actuel incorrect'); }
    finally { setLoading(false); }
  };

  const TABS = [
    { id:'cabinet', label:'Cabinet', icon:Building2 },
    { id:'profil',  label:'Mon profil', icon:User },
    { id:'securite',label:'Sécurité', icon:Lock },
  ];

  return (
    <div style={{ maxWidth:680, margin:'0 auto', paddingBottom:48, fontFamily:'DM Sans,sans-serif' }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:22, color:'#0F172A', margin:'0 0 4px' }}>Paramètres</h1>
        <p style={{ color:'#64748B', fontSize:14, margin:0 }}>Gérez votre cabinet et votre compte</p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'#F8FAFC', borderRadius:12, padding:4, marginBottom:24, border:'1px solid #E2E8F0' }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ flex:1, padding:'9px 12px', borderRadius:9, border:'none', background:active?'#fff':'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7, fontSize:13, fontWeight:active?700:500, color:active?T:'#64748B', boxShadow:active?'0 1px 4px rgba(0,0,0,.08)':undefined, transition:'all .15s' }}>
              <Icon size={15}/> {t.label}
            </button>
          );
        })}
      </div>

      {/* Cabinet */}
      {tab === 'cabinet' && (
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', padding:24 }}>
          <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:16, color:'#0F172A', margin:'0 0 20px' }}>Informations du cabinet</h2>
          <div style={{ background:'#F0FDFE', border:'1.5px solid #7DD3DA', borderRadius:12, padding:'14px 18px', marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:700, color:T }}>{user?.full_name || 'Cabinet DentalPM'}</div>
            <div style={{ fontSize:12, color:'#64748B', marginTop:3 }}>Pour modifier les informations du cabinet, contactez le support DentalPM.</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14 }}>
            {[
              { label:'Nom du cabinet', value:user?.clinic_name || '—', icon:Building2 },
              { label:'Email', value:user?.email || '—', icon:Mail },
              { label:'Téléphone', value:user?.phone || '—', icon:Phone },
              { label:'Ville', value:'Antananarivo', icon:MapPin },
            ].map(f => (
              <div key={f.label} style={{ background:'#F8FAFC', borderRadius:10, padding:'12px 14px', border:'1px solid #E2E8F0' }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>{f.label}</div>
                <div style={{ fontSize:14, fontWeight:600, color:'#0F172A' }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profil */}
      {tab === 'profil' && (
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', padding:24 }}>
          <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:16, color:'#0F172A', margin:'0 0 20px' }}>Mon profil</h2>
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:14, marginBottom:16 }}>
            {[
              { label:'Nom complet', key:'full_name', ph:'Dr. Rakoto Jean' },
              { label:'Email', key:'email', ph:'rakoto@cabinet.mg', type:'email' },
              { label:'Téléphone', key:'phone', ph:'034 XX XXX XX', type:'tel' },
              { label:'Spécialisation', key:'specialization', ph:'Chirurgien dentiste' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:5 }}>{f.label}</label>
                <input type={f.type||'text'} placeholder={f.ph} value={profile[f.key]||''}
                  onChange={e=>setProfile(p=>({...p,[f.key]:e.target.value}))}
                  style={inp}
                  onFocus={e=>{e.target.style.borderColor=T;e.target.style.boxShadow=`0 0 0 3px ${T}18`;}}
                  onBlur={e=>{e.target.style.borderColor='#E2E8F0';e.target.style.boxShadow='none';}}/>
              </div>
            ))}
          </div>
          <button onClick={saveProfile} disabled={loading}
            style={{ padding:'11px 24px', borderRadius:11, border:'none', background:`linear-gradient(135deg,${T},#13A3B4)`, color:'#fff', fontWeight:700, fontSize:13, cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:8, opacity:loading?.7:1 }}>
            <Save size={15}/> {loading?'Enregistrement...':'Enregistrer'}
          </button>
        </div>
      )}

      {/* Sécurité */}
      {tab === 'securite' && (
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', padding:24 }}>
          <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:16, color:'#0F172A', margin:'0 0 20px' }}>Changer de mot de passe</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:380 }}>
            {[
              { label:'Mot de passe actuel', key:'current' },
              { label:'Nouveau mot de passe', key:'new_pwd' },
              { label:'Confirmer le nouveau mot de passe', key:'confirm' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:5 }}>{f.label}</label>
                <div style={{ position:'relative' }}>
                  <input type={showPwd[f.key]?'text':'password'} value={pwd[f.key]}
                    onChange={e=>setPwd(p=>({...p,[f.key]:e.target.value}))}
                    style={{ ...inp, paddingRight:40 }}
                    onFocus={e=>{e.target.style.borderColor=T;e.target.style.boxShadow=`0 0 0 3px ${T}18`;}}
                    onBlur={e=>{e.target.style.borderColor='#E2E8F0';e.target.style.boxShadow='none';}}/>
                  <button onClick={()=>setShowPwd(s=>({...s,[f.key]:!s[f.key]}))}
                    style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94A3B8' }}>
                    {showPwd[f.key]?<EyeOff size={15}/>:<Eye size={15}/>}
                  </button>
                </div>
              </div>
            ))}
            <button onClick={changePassword} disabled={loading}
              style={{ padding:'11px 24px', borderRadius:11, border:'none', background:`linear-gradient(135deg,${T},#13A3B4)`, color:'#fff', fontWeight:700, fontSize:13, cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:8, alignSelf:'flex-start', opacity:loading?.7:1 }}>
              <Lock size={15}/> {loading?'Modification...':'Changer le mot de passe'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
