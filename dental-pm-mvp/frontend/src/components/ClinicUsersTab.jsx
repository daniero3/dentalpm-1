import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Plus, UserCheck, UserX, Eye, EyeOff, X, Users, Crown,
  Stethoscope, UserRound, Calculator, ShieldCheck, CheckCircle
} from 'lucide-react';
import { useResponsive } from '../utils/responsive';

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8001/api'
    : '/api';
const authH = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const T = '#0D7A87';
const ROLES = [
  { value:'DENTIST',    label:'Dentiste',        desc:'Agenda et dossiers patients', color:'#3B4FD8', icon:Stethoscope },
  { value:'ASSISTANT',  label:'Assistant(e)',    desc:'Accueil et suivi quotidien',  color:'#8B5CF6', icon:UserRound },
  { value:'ACCOUNTANT', label:'Comptable',       desc:'Factures et paiements',       color:'#F59E0B', icon:Calculator },
  { value:'ADMIN',      label:'Admin cabinet',   desc:'Gestion complète du cabinet', color:'#0D7A87', icon:ShieldCheck },
];
const ROLE_LABELS = Object.fromEntries(ROLES.map(r => [r.value, r]));
const inp = {
  width:'100%',
  minHeight:44,
  padding:'11px 13px',
  borderRadius:10,
  border:'1.5px solid #D7DEE8',
  fontSize:14,
  fontFamily:'inherit',
  outline:'none',
  boxSizing:'border-box',
  background:'#FFFFFF',
  color:'#0F172A',
  transition:'border-color .18s ease, box-shadow .18s ease, background .18s ease'
};
const EMPTY = { full_name:'', email:'', username:'', password:'', role:'DENTIST', phone:'', specialization:'' };
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;
const fieldFocus = e => {
  e.target.style.borderColor = T;
  e.target.style.boxShadow = `0 0 0 3px ${T}18`;
  e.target.style.background = '#FFFFFF';
};
const fieldBlur = e => {
  e.target.style.borderColor = '#D7DEE8';
  e.target.style.boxShadow = 'none';
  e.target.style.background = '#FFFFFF';
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

          <button onClick={() => { if (!canAdd) { toast.error(`Limite atteinte. Upgradez votre plan pour ajouter plus d'utilisateurs.`); return; } setModal(true); }}
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
                  <button onClick={() => toggleActive(u)} title={u.is_active ? 'Désactiver' : 'Réactiver'}
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
          style={{ position:'fixed', inset:0, zIndex:1050, background:'rgba(15,23,42,.44)', backdropFilter:'blur(10px) saturate(120%)', WebkitBackdropFilter:'blur(10px) saturate(120%)', display:'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent:'center', padding: isMobile ? 0 : 20, overflowY:'auto', overscrollBehavior:'contain' }}>
          <div style={{ background:'#fff', borderRadius: isMobile ? '22px 22px 0 0' : 18, width:'100%', maxWidth:720, maxHeight: isMobile ? '90dvh' : '88dvh', display:'flex', flexDirection:'column', overflow:'hidden', border:'1px solid rgba(226,232,240,.95)', boxShadow:'0 28px 80px rgba(15,23,42,.26)' }}>

            {/* Header modal */}
            <div style={{ padding:isMobile ? '18px 18px 16px' : '22px 26px 18px', background:'#FFFFFF', borderBottom:'1px solid #E2E8F0', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16, flexShrink:0 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:`${T}14`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Users size={18} color={T}/>
                  </div>
                  <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:18, color:'#0F172A' }}>Nouvel utilisateur</div>
                </div>
                <div style={{ fontSize:13, color:'#64748B', lineHeight:1.45 }}>Ajoutez un membre au cabinet et définissez son rôle d'accès.</div>
              </div>
              <button onClick={()=>setModal(false)} aria-label="Fermer" style={{ width:34, height:34, borderRadius:10, background:'#F8FAFC', border:'1px solid #E2E8F0', cursor:'pointer', color:'#64748B', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <X size={16}/>
              </button>
            </div>

            <div style={{ padding:isMobile ? '18px' : '22px 26px 24px', display:'flex', flexDirection:'column', gap:18, overflowY:'auto', WebkitOverflowScrolling:'touch', overscrollBehavior:'contain', minHeight:0, flex:'1 1 auto', background:'#F8FAFC' }}>
              {/* Formulaire */}
              <div style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:14, padding:isMobile ? 14 : 18 }}>
                <div style={{ fontSize:12, fontWeight:800, color:'#0F172A', textTransform:'uppercase', letterSpacing:.7, marginBottom:14 }}>Identité</div>
                <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '1fr 1fr', gap:14 }}>
                  {[
                    { label:'Nom complet *', key:'full_name', ph:'Dr. Rakoto Jean', type:'text' },
                    { label:'Email *',        key:'email',     ph:'rakoto@cabinet.mg', type:'email' },
                    { label:'Identifiant *',  key:'username',  ph:'rakotoj', type:'text' },
                    { label:'Téléphone',      key:'phone',     ph:'034 XX XXX XX', type:'tel' },
                    { label:'Spécialisation', key:'specialization', ph:'Chirurgie dentaire', type:'text' },
                  ].map(f => (
                    <div key={f.key} style={{ gridColumn: !isMobile && f.key === 'specialization' ? '1 / -1' : undefined }}>
                      <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#334155', marginBottom:6 }}>{f.label}</label>
                      <input type={f.type} placeholder={f.ph} value={form[f.key]}
                        onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                        style={inp}
                        onFocus={fieldFocus}
                        onBlur={fieldBlur}/>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rôle */}
              <div style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:14, padding:isMobile ? 14 : 18 }}>
                <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:12, marginBottom:14 }}>
                  <div style={{ fontSize:12, fontWeight:800, color:'#0F172A', textTransform:'uppercase', letterSpacing:.7 }}>Rôle</div>
                  <div style={{ fontSize:11, color:'#64748B' }}>Choix obligatoire</div>
                </div>
                <div role="radiogroup" aria-label="Rôle utilisateur" style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:10 }}>
                  {ROLES.map(r => {
                    const Icon = r.icon;
                    const selected = form.role === r.value;
                    return (
                      <button key={r.value} onClick={()=>setForm(p=>({...p,role:r.value}))} type="button" role="radio" aria-checked={selected}
                        style={{ minHeight:76, padding:'12px 13px', borderRadius:12, border:`1.5px solid ${selected ? r.color : '#E2E8F0'}`, background: selected ? r.color + '10' : '#FFFFFF', cursor:'pointer', display:'flex', alignItems:'center', gap:12, color:'#0F172A', textAlign:'left', transition:'border-color .18s ease, background .18s ease, box-shadow .18s ease', boxShadow:selected ? `0 0 0 3px ${r.color}18` : 'none' }}>
                        <span style={{ width:36, height:36, borderRadius:10, background:r.color + '14', color:r.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <Icon size={18}/>
                        </span>
                        <span style={{ flex:1, minWidth:0 }}>
                          <span style={{ display:'block', fontSize:13, fontWeight:800, color:selected ? r.color : '#0F172A' }}>{r.label}</span>
                          <span style={{ display:'block', fontSize:11, color:'#64748B', marginTop:2, lineHeight:1.35 }}>{r.desc}</span>
                        </span>
                        <span style={{ width:20, height:20, borderRadius:'50%', border:`1.5px solid ${selected ? r.color : '#CBD5E1'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, background:selected ? r.color : '#FFFFFF' }}>
                          {selected && <CheckCircle size={13} color="#FFFFFF"/>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mot de passe */}
              <div style={{ background:'#FFFFFF', border:'1px solid #E2E8F0', borderRadius:14, padding:isMobile ? 14 : 18 }}>
                <div style={{ fontSize:12, fontWeight:800, color:'#0F172A', textTransform:'uppercase', letterSpacing:.7, marginBottom:14 }}>Accès</div>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#334155', marginBottom:6 }}>Mot de passe *</label>
                <div style={{ position:'relative', maxWidth:isMobile ? '100%' : 340 }}>
                  <input type={showPwd ? 'text' : 'password'} placeholder="Ex: Cabinet@2026" value={form.password}
                    onChange={e=>setForm(p=>({...p,password:e.target.value}))}
                    style={{ ...inp, paddingRight:44 }}
                    onFocus={fieldFocus}
                    onBlur={fieldBlur}/>
                  <button type="button" onClick={()=>setShowPwd(s=>!s)} aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', width:30, height:30, borderRadius:8, background:'#F8FAFC', border:'1px solid #E2E8F0', cursor:'pointer', color:'#64748B', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
                <div style={{ fontSize:11, color:'#64748B', marginTop:7, lineHeight:1.45 }}>
                  10 caractères minimum, avec majuscule, minuscule, chiffre et symbole.
                </div>
              </div>

            </div>

            {/* Boutons */}
            <div style={{ display:'flex', gap:10, padding:isMobile ? '14px 18px calc(14px + env(safe-area-inset-bottom))' : '16px 26px', borderTop:'1px solid #E2E8F0', background:'#fff', flexShrink:0, boxShadow:'0 -12px 28px rgba(15,23,42,.05)' }}>
              <button onClick={()=>setModal(false)} style={{ flex:1, padding:'11px', borderRadius:11, border:'1.5px solid #D7DEE8', background:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, color:'#475569' }}>Annuler</button>
              <button onClick={save} disabled={saving}
                style={{ flex:2, padding:'11px', borderRadius:11, border:'none', background:`linear-gradient(135deg,${T},#13A3B4)`, color:'#fff', cursor:saving?'not-allowed':'pointer', fontSize:13, fontWeight:800, opacity:saving?.7:1, boxShadow:`0 8px 20px ${T}28` }}>
                {saving ? 'Création...' : 'Créer l\'utilisateur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
