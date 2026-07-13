import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, UserCheck, UserX, Trash2, Eye, EyeOff, X, Users, Crown } from 'lucide-react';
import { useResponsive } from '../utils/responsive';

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8001/api'
    : '/api';
const authH = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const T = '#0D7A87';
const ROLES = [
  { value:'DENTIST',    label:'Dentiste',        color:'#3B4FD8' },
  { value:'ASSISTANT',  label:'Assistant(e)',     color:'#8B5CF6' },
  { value:'ACCOUNTANT', label:'Comptable',        color:'#F59E0B' },
  { value:'ADMIN',      label:'Admin cabinet',    color:'#0D7A87' },
];
const ROLE_LABELS = Object.fromEntries(ROLES.map(r => [r.value, r]));
const inp = { width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' };
const EMPTY = { full_name:'', email:'', username:'', password:'', role:'DENTIST', phone:'', specialization:'' };
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;

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
          style={{ position:'fixed', inset:0, zIndex:1050, background:'rgba(10,16,30,.65)', backdropFilter:'blur(4px)', display:'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent:'center', padding: isMobile ? 0 : 16, overflowY:'auto', overscrollBehavior:'contain' }}>
          <div style={{ background:'#fff', borderRadius: isMobile ? '20px 20px 0 0' : 20, width:'100%', maxWidth:480, maxHeight: isMobile ? '88dvh' : '92dvh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,.2)' }}>

            {/* Header modal */}
            <div style={{ padding:'18px 22px', background:`linear-gradient(135deg,${T},#0A5F6A)`, borderRadius: isMobile ? '20px 20px 0 0' : '20px 20px 0 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:16, color:'#fff' }}>Nouvel utilisateur</div>
              <button onClick={()=>setModal(false)} style={{ width:32, height:32, borderRadius:8, background:'rgba(255,255,255,.15)', border:'none', cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <X size={15}/>
              </button>
            </div>

            <div style={{ padding:'20px 22px calc(20px + env(safe-area-inset-bottom))', display:'flex', flexDirection:'column', gap:14, overflowY:'auto', WebkitOverflowScrolling:'touch', overscrollBehavior:'contain', minHeight:0 }}>
              {/* Formulaire */}
              {[
                { label:'Nom complet *', key:'full_name', ph:'Dr. Rakoto Jean', type:'text' },
                { label:'Email *',        key:'email',     ph:'rakoto@cabinet.mg', type:'email' },
                { label:'Identifiant *',  key:'username',  ph:'rakotoj', type:'text' },
                { label:'Téléphone',      key:'phone',     ph:'034 XX XXX XX', type:'tel' },
                { label:'Spécialisation', key:'specialization', ph:'Chirurgie dentaire', type:'text' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:5 }}>{f.label}</label>
                  <input type={f.type} placeholder={f.ph} value={form[f.key]}
                    onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                    style={inp}
                    onFocus={e=>{e.target.style.borderColor=T; e.target.style.boxShadow=`0 0 0 3px ${T}18`;}}
                    onBlur={e=>{e.target.style.borderColor='#E2E8F0'; e.target.style.boxShadow='none';}}/>
                </div>
              ))}

              {/* Rôle */}
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:5 }}>Rôle *</label>
                <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:8 }}>
                  {ROLES.map(r => (
                    <button key={r.value} onClick={()=>setForm(p=>({...p,role:r.value}))} type="button"
                      style={{ padding:'8px 6px', borderRadius:10, border:`2px solid ${form.role===r.value ? r.color : '#E2E8F0'}`, background: form.role===r.value ? r.color + '15' : '#F8FAFC', cursor:'pointer', fontSize:11, fontWeight:700, color: form.role===r.value ? r.color : '#64748B', transition:'all .15s', textAlign:'center' }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:5 }}>Mot de passe *</label>
                <div style={{ position:'relative' }}>
                  <input type={showPwd ? 'text' : 'password'} placeholder="Ex: Cabinet@2026" value={form.password}
                    onChange={e=>setForm(p=>({...p,password:e.target.value}))}
                    style={{ ...inp, paddingRight:40 }}
                    onFocus={e=>{e.target.style.borderColor=T; e.target.style.boxShadow=`0 0 0 3px ${T}18`;}}
                    onBlur={e=>{e.target.style.borderColor='#E2E8F0'; e.target.style.boxShadow='none';}}/>
                  <button type="button" onClick={()=>setShowPwd(s=>!s)}
                    style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94A3B8' }}>
                    {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
                <div style={{ fontSize:11, color:'#64748B', marginTop:5 }}>
                  10 caractères minimum, avec majuscule, minuscule, chiffre et symbole.
                </div>
              </div>

              {/* Boutons */}
              <div style={{ display:'flex', gap:10, paddingTop:6 }}>
                <button onClick={()=>setModal(false)} style={{ flex:1, padding:'11px', borderRadius:11, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, color:'#475569' }}>Annuler</button>
                <button onClick={save} disabled={saving}
                  style={{ flex:2, padding:'11px', borderRadius:11, border:'none', background:`linear-gradient(135deg,${T},#13A3B4)`, color:'#fff', cursor:saving?'not-allowed':'pointer', fontSize:13, fontWeight:700, opacity:saving?.7:1 }}>
                  {saving ? 'Création...' : 'Créer l\'utilisateur'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
