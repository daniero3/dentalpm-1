import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Plus, UserCheck, UserX, Eye, EyeOff, X, Users, Crown,
  Stethoscope, UserRound, Calculator, ShieldCheck
} from 'lucide-react';
import { useResponsive } from '../utils/responsive';

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8001/api'
    : '/api';
const authH = () => ({ withCredentials: true });

const T = '#0D7A87';
const ROLES = [
  { value:'DENTIST',    label:'Dentiste',      color:'#3B82F6', bg:'#EFF6FF', icon:Stethoscope },
  { value:'ASSISTANT',  label:'Assistant(e)',  color:'#8B5CF6', bg:'#EDE9FE', icon:UserRound },
  { value:'ACCOUNTANT', label:'Comptable',     color:'#F59E0B', bg:'#FFFBEB', icon:Calculator },
  { value:'ADMIN',      label:'Admin cabinet', color:'#0D7A87', bg:'#F0FDFE', icon:ShieldCheck },
];
const ROLE_LABELS = Object.fromEntries(ROLES.map(r => [r.value, r]));
const inp = { width:'100%', padding:'9px 12px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:13, fontFamily:'inherit', outline:'none', transition:'border-color .2s', boxSizing:'border-box' };
const EMPTY = { full_name:'', email:'', username:'', password:'', role:'DENTIST', phone:'', specialization:'' };
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;
const fieldFocus = e => {
  e.target.style.borderColor = T;
};
const fieldBlur = e => {
  e.target.style.borderColor = '#E2E8F0';
};

export default function ClinicUsersTab() {
  const { isMobile } = useResponsive();
  const [data,    setData]    = useState({ users:[], count:0, limit:2, plan:'ESSENTIAL' });
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/auth/clinic-users`, authH());
      setData(r.data);
    } catch(e) { toast.error('Erreur chargement utilisateurs'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.full_name || !form.email || !form.username || !form.password) {
      toast.error('Tous les champs obligatoires doivent être remplis'); return;
    }
    if (!strongPassword.test(form.password)) {
      toast.error('Mot de passe: 10 caractères minimum avec majuscule, minuscule, chiffre et symbole'); return;
    }
    setSaving(true);
    try {
      await axios.post(`${API}/auth/clinic-users`, form, authH());
      toast.success(`${ROLE_LABELS[form.role]?.label} créé avec succès`);
      setModal(false); setForm(EMPTY); load();
    } catch(e) {
      const err = e.response?.data;
      if (err?.code === 'PLAN_LIMIT_REACHED') {
        toast.error(`Limite atteinte — Plan ${err.plan} : ${err.limit} utilisateur(s) max. Upgrader votre plan.`);
      } else {
        toast.error(err?.error || 'Erreur création');
      }
    }
    finally { setSaving(false); }
  };

  const toggleActive = async (user) => {
    try {
      await axios.patch(`${API}/auth/clinic-users/${user.id}`, { is_active: !user.is_active }, authH());
      toast.success(user.is_active ? 'Compte désactivé' : 'Compte réactivé');
      load();
    } catch(e) { toast.error('Erreur'); }
  };

  const canAdd = data.count < data.limit;
  const PLAN_COLORS = { ESSENTIAL:'#3B82F6', PRO:'#8B5CF6', GROUP:'#10B981', TRIAL:'#F59E0B' };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Header avec limite */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:12, background:`${T}15`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Users size={20} color={T}/>
            </div>
            <div>
              <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:15, color:'#0F172A' }}>
                Utilisateurs du cabinet
              </div>
              <div style={{ fontSize:12, color:'#64748B', display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                <span style={{ fontWeight:700, color:T }}>{data.count}</span> / <span>{data.limit}</span> utilisateurs
                <span style={{ padding:'1px 8px', borderRadius:99, background:`${PLAN_COLORS[data.plan] || '#3B82F6'}20`, color: PLAN_COLORS[data.plan] || '#3B82F6', fontWeight:700, fontSize:10 }}>
                  Plan {data.plan}
                </span>
              </div>
            </div>
          </div>

          <button type="button" onClick={() => { if (!canAdd) { toast.error(`Limite atteinte. Upgradez votre plan pour ajouter plus d'utilisateurs.`); return; } setModal(true); }}
            style={{ padding:'10px 18px', borderRadius:11, border:'none', background: canAdd ? `linear-gradient(135deg,${T},#13A3B4)` : '#E2E8F0', color: canAdd ? '#fff' : '#94A3B8', fontWeight:700, fontSize:13, cursor: canAdd ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', gap:8, boxShadow: canAdd ? `0 4px 12px ${T}30` : 'none' }}>
            <Plus size={15}/> Ajouter utilisateur
          </button>
        </div>

        {/* Barre de progression */}
        <div style={{ marginTop:14, background:'#F1F5F9', borderRadius:99, height:6, overflow:'hidden' }}>
          <div style={{ height:'100%', borderRadius:99, background: data.count >= data.limit ? '#EF4444' : `linear-gradient(90deg,${T},#13A3B4)`, width:`${Math.min((data.count/data.limit)*100, 100)}%`, transition:'width .4s ease' }}/>
        </div>

        {!canAdd && (
          <div style={{ marginTop:10, padding:'10px 14px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, fontSize:12, color:'#DC2626', display:'flex', alignItems:'center', gap:8 }}>
            <Crown size={13}/>
            Limite atteinte — <a href="/subscription" style={{ color:T, fontWeight:700, textDecoration:'none' }}>Upgrader votre plan</a> pour ajouter plus d'utilisateurs
          </div>
        )}
      </div>

      {/* Liste utilisateurs */}
      {loading ? (
        <div style={{ textAlign:'center', padding:32, color:'#94A3B8', fontSize:13 }}>Chargement...</div>
      ) : data.users.length === 0 ? (
        <div style={{ textAlign:'center', padding:'32px 20px', background:'#fff', borderRadius:16, border:'1px solid #E2E8F0' }}>
          <Users size={32} color="#E2E8F0" style={{ marginBottom:12 }}/>
          <p style={{ color:'#64748B', fontSize:13, margin:0 }}>Aucun utilisateur créé. Commencez par ajouter un praticien.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {data.users.map(u => {
            const role = ROLE_LABELS[u.role];
            return (
              <div key={u.id} style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'14px 16px', display:'flex', alignItems:'center', gap:12, flexWrap: isMobile ? 'wrap' : 'nowrap', opacity: u.is_active ? 1 : .55 }}>
                {/* Avatar */}
                <div style={{ width:42, height:42, borderRadius:12, background: role ? role.color + '18' : '#F1F5F9', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:16, color: role?.color || '#64748B', flexShrink:0 }}>
                  {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                {/* Infos */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <span style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:14, color:'#0F172A' }}>{u.full_name}</span>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background: role ? role.color + '15' : '#F1F5F9', color: role?.color || '#64748B' }}>
                      {role?.label || u.role}
                    </span>
                    {!u.is_active && <span style={{ fontSize:10, color:'#EF4444', fontWeight:700 }}>DÉSACTIVÉ</span>}
                  </div>
                  <div style={{ fontSize:12, color:'#94A3B8', marginTop:2 }}>
                    @{u.username} · {u.email}
                    {u.specialization && ` · ${u.specialization}`}
                  </div>
                </div>
                {/* Actions */}
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  <button type="button" onClick={() => toggleActive(u)} title={u.is_active ? 'Désactiver' : 'Réactiver'}
                    style={{ width:34, height:34, borderRadius:9, border:`1px solid ${u.is_active ? '#E2E8F0' : '#BBF7D0'}`, background: u.is_active ? '#F8FAFC' : '#DCFCE7', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {u.is_active ? <UserX size={14} color="#94A3B8"/> : <UserCheck size={14} color="#16A34A"/>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal ajout */}
      {modal && (
        <div onClick={e=>e.target===e.currentTarget&&setModal(false)}
          style={{ position:'fixed', inset:0, zIndex:1050, background:'rgba(15,23,42,.55)', overflowY:'auto', padding:isMobile ? '28px 12px' : '60px 16px 32px' }}>
          <div style={{ background:'#fff', borderRadius:22, padding:isMobile ? 22 : 28, width:'100%', maxWidth:560, maxHeight:isMobile ? 'calc(100dvh - 56px)' : 'none', overflowY:'auto', margin:'0 auto', boxShadow:'0 24px 64px rgba(15,23,42,.2)', border:'1px solid #E2E8F0', position:'relative' }}>
            <button type="button" onClick={()=>setModal(false)} aria-label="Fermer" style={{ position:'absolute', top:14, right:14, background:'#F8FAFC', border:'none', cursor:'pointer', padding:7, borderRadius:8, display:'flex', alignItems:'center', color:'#64748B' }}>
                <X size={16}/>
              </button>
            <h2 style={{ fontFamily:'Plus Jakarta Sans', fontSize:17, fontWeight:700, color:'#0F172A', margin:'0 0 20px', paddingRight:28 }}>👤 Nouvel utilisateur</h2>

            <form onSubmit={(e)=>{ e.preventDefault(); save(); }} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '1fr 1fr', gap:10 }}>
                {[
                  { label:'Nom complet *', key:'full_name', ph:'Dr. Rakoto Jean', type:'text' },
                  { label:'Email *',        key:'email',     ph:'rakoto@cabinet.mg', type:'email' },
                  { label:'Identifiant *',  key:'username',  ph:'rakotoj', type:'text' },
                  { label:'Téléphone',      key:'phone',     ph:'034 XX XXX XX', type:'tel' },
                  { label:'Spécialisation', key:'specialization', ph:'Chirurgie dentaire', type:'text', wide:true },
                ].map(f => (
                  <div key={f.key} style={{ gridColumn: !isMobile && f.wide ? '1/-1' : undefined }}>
                    <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:5 }}>{f.label}</label>
                    <input
                      aria-label={f.label}
                      type={f.type}
                      placeholder={f.ph}
                      value={form[f.key]}
                      onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                      style={inp}
                      onFocus={fieldFocus}
                      onBlur={fieldBlur}
                      required={['full_name','email','username'].includes(f.key)}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:8 }}>Rôle *</label>
                <div role="radiogroup" aria-label="Rôle utilisateur" style={{ display:'grid', gridTemplateColumns:isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap:6 }}>
                  {ROLES.map(r => {
                    const Icon = r.icon;
                    const selected = form.role === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={()=>setForm(p=>({...p,role:r.value}))}
                        style={{ padding:'8px 6px', minHeight:78, borderRadius:10, border:`2px solid ${selected ? r.color : '#E2E8F0'}`, background:selected ? r.bg : '#fff', cursor:'pointer', fontSize:11, fontWeight:700, color:selected ? r.color : '#475569', transition:'all .15s', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:5 }}
                      >
                        <Icon size={18}/>
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:5 }}>Mot de passe *</label>
                <div style={{ position:'relative' }}>
                  <input
                    aria-label="Mot de passe utilisateur"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Ex: Cabinet@2026"
                    value={form.password}
                    onChange={e=>setForm(p=>({...p,password:e.target.value}))}
                    style={{ ...inp, paddingRight:40 }}
                    onFocus={fieldFocus}
                    onBlur={fieldBlur}
                    required
                  />
                  <button type="button" onClick={()=>setShowPwd(s=>!s)} aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94A3B8', display:'flex', padding:3 }}>
                    {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
                <div style={{ fontSize:11, color:'#64748B', marginTop:5 }}>
                  10 caractères minimum, avec majuscule, minuscule, chiffre et symbole.
                </div>
              </div>

              <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:8, borderTop:'1px solid #F1F5F9' }}>
                <button type="button" onClick={()=>setModal(false)} style={{ padding:'9px 18px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, color:'#475569' }}>Annuler</button>
                <button type="submit" disabled={saving} style={{ padding:'9px 22px', borderRadius:10, background:'linear-gradient(135deg,#8B5CF6,#7C3AED)', color:'#fff', border:'none', cursor:saving?'not-allowed':'pointer', fontSize:14, fontWeight:700, display:'flex', alignItems:'center', gap:7, opacity:saving?.7:1 }}>
                  <Plus size={14}/>{saving ? 'Création...' : "Créer l'utilisateur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
