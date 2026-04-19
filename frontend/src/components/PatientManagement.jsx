import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import { toast } from 'sonner';
import {
  Users, Plus, Search, Edit, Activity, Phone, Mail,
  AlertTriangle, User, Calendar, FileText, ClipboardList,
  FlaskConical, X, Save, Loader2, ChevronRight, Filter,
  BarChart2, UserCheck, UserX, Heart, RefreshCw, Download,
  MapPin, Shield, Pill, Eye, Grid, List, SortAsc
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const authH = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const calcAge = dob => {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000*60*60*24*365.25));
};
const fdate = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const initials = (fn, ln) => `${(fn||'')[0]||''}${(ln||'')[0]||''}`.toUpperCase();

const GENDER_COLOR = { M:'#3B82F6', F:'#EC4899', OTHER:'#8B5CF6' };
const GENDER_BG    = { M:'#EFF6FF', F:'#FDF2F8', OTHER:'#EDE9FE' };
const GENDER_LABEL = { M:'M', F:'F', OTHER:'?' };

const AVATAR_COLORS = [
  ['#0D7A87','#13A3B4'], ['#7C3AED','#9333EA'], ['#1D4ED8','#3B82F6'],
  ['#059669','#10B981'], ['#D97706','#F59E0B'], ['#DC2626','#EF4444'],
  ['#0891B2','#06B6D4'], ['#7C3AED','#A855F7'],
];
const avatarColor = name => AVATAR_COLORS[(name?.charCodeAt(0)||0) % AVATAR_COLORS.length];

/* ── Modal ── */
const Modal = ({ open, onClose, title, children, maxW = 580 }) => {
  if (!open) return null;
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(15,23,42,.55)', overflowY:'auto', padding:'60px 16px 32px' }}>
      <div style={{ background:'#fff', borderRadius:22, padding:28, width:'100%', maxWidth:maxW, margin:'0 auto', boxShadow:'0 24px 64px rgba(15,23,42,.2)', border:'1px solid #E2E8F0', position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'#F8FAFC', border:'none', cursor:'pointer', padding:7, borderRadius:8, display:'flex', alignItems:'center', color:'#64748B' }}>
          <X size={15}/>
        </button>
        {title && <h2 style={{ fontFamily:'Plus Jakarta Sans', fontSize:17, fontWeight:700, color:'#0F172A', margin:'0 0 22px', paddingRight:28 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
};

/* ── Skeleton ── */
const Skel = ({ h=16, w='100%', r=8 }) => (
  <div style={{ height:h, width:w, borderRadius:r, background:'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite' }}/>
);

/* ── Formulaire patient ── */
const fieldStyle = { width:'100%', padding:'9px 12px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:13, fontFamily:'inherit', color:'#0F172A', background:'#fff', outline:'none', boxSizing:'border-box', transition:'border-color .18s,box-shadow .18s' };
const labelStyle = { display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:5 };
const fi = e => { e.target.style.borderColor='#0D7A87'; e.target.style.boxShadow='0 0 0 3px rgba(13,122,135,.08)'; };
const bi = e => { e.target.style.borderColor='#E2E8F0'; e.target.style.boxShadow='none'; };

const PatientForm = ({ data, onChange, onSubmit, onCancel, submitting, isEdit }) => (
  <form onSubmit={onSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
    {/* Section identité */}
    <div style={{ background:'#F8FAFC', borderRadius:12, padding:'14px 16px', marginBottom:2 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'#0D7A87', textTransform:'uppercase', letterSpacing:1.5, marginBottom:12 }}>👤 Identité</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <label style={labelStyle}>Prénom *</label>
          <input style={fieldStyle} type="text" placeholder="Jean" value={data.first_name||''} onChange={e=>onChange('first_name',e.target.value)} onFocus={fi} onBlur={bi} required/>
        </div>
        <div>
          <label style={labelStyle}>Nom *</label>
          <input style={fieldStyle} type="text" placeholder="Rakoto" value={data.last_name||''} onChange={e=>onChange('last_name',e.target.value)} onFocus={fi} onBlur={bi} required/>
        </div>
        <div>
          <label style={labelStyle}>Date de naissance</label>
          <input style={fieldStyle} type="date" value={data.date_of_birth||''} onChange={e=>onChange('date_of_birth',e.target.value)} onFocus={fi} onBlur={bi}/>
        </div>
        <div>
          <label style={labelStyle}>Sexe</label>
          <select style={fieldStyle} value={data.gender||''} onChange={e=>onChange('gender',e.target.value)} onFocus={fi} onBlur={bi}>
            <option value="">Sélectionner...</option>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
            <option value="OTHER">Autre</option>
          </select>
        </div>
      </div>
    </div>

    {/* Section contact */}
    <div style={{ background:'#F8FAFC', borderRadius:12, padding:'14px 16px', marginBottom:2 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'#0D7A87', textTransform:'uppercase', letterSpacing:1.5, marginBottom:12 }}>📞 Contact</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <label style={labelStyle}>Téléphone *</label>
          <input style={fieldStyle} type="text" placeholder="034 00 000 00" value={data.phone_primary||''} onChange={e=>onChange('phone_primary',e.target.value)} onFocus={fi} onBlur={bi} required/>
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input style={fieldStyle} type="email" placeholder="jean@email.mg" value={data.email||''} onChange={e=>onChange('email',e.target.value)} onFocus={fi} onBlur={bi}/>
        </div>
        <div style={{ gridColumn:'1/-1' }}>
          <label style={labelStyle}>Adresse</label>
          <input style={fieldStyle} type="text" placeholder="Antananarivo, Madagascar" value={data.address||''} onChange={e=>onChange('address',e.target.value)} onFocus={fi} onBlur={bi}/>
        </div>
        <div>
          <label style={labelStyle}>Contact urgence</label>
          <input style={fieldStyle} type="text" placeholder="Nom" value={data.emergency_contact_name||''} onChange={e=>onChange('emergency_contact_name',e.target.value)} onFocus={fi} onBlur={bi}/>
        </div>
        <div>
          <label style={labelStyle}>Tél. urgence</label>
          <input style={fieldStyle} type="text" placeholder="+261 34..." value={data.emergency_contact_phone||''} onChange={e=>onChange('emergency_contact_phone',e.target.value)} onFocus={fi} onBlur={bi}/>
        </div>
      </div>
    </div>

    {/* Section médical */}
    <div style={{ background:'#FFF5F5', borderRadius:12, padding:'14px 16px' }}>
      <div style={{ fontSize:11, fontWeight:700, color:'#EF4444', textTransform:'uppercase', letterSpacing:1.5, marginBottom:12 }}>🏥 Informations médicales</div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <div>
          <label style={labelStyle}>Antécédents médicaux</label>
          <textarea style={{ ...fieldStyle, minHeight:60, resize:'vertical' }} value={data.medical_history||''} onChange={e=>onChange('medical_history',e.target.value)} placeholder="Antécédents médicaux..." onFocus={fi} onBlur={bi}/>
        </div>
        <div>
          <label style={{ ...labelStyle, color:'#DC2626' }}>⚠️ Allergies</label>
          <textarea style={{ ...fieldStyle, minHeight:48, resize:'vertical', borderColor: data.allergies ? '#FECACA' : '#E2E8F0' }} value={data.allergies||''} onChange={e=>onChange('allergies',e.target.value)} placeholder="Allergies connues..." onFocus={fi} onBlur={bi}/>
        </div>
        <div>
          <label style={labelStyle}>Médicaments actuels</label>
          <textarea style={{ ...fieldStyle, minHeight:48, resize:'vertical' }} value={data.current_medications||''} onChange={e=>onChange('current_medications',e.target.value)} placeholder="Traitements en cours..." onFocus={fi} onBlur={bi}/>
        </div>
      </div>
    </div>

    <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:8, borderTop:'1px solid #F1F5F9' }}>
      <button type="button" onClick={onCancel} style={{ padding:'9px 18px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, color:'#475569' }}>Annuler</button>
      <button type="submit" disabled={submitting} style={{ padding:'9px 22px', borderRadius:10, background:'linear-gradient(135deg,#0D7A87,#13A3B4)', color:'#fff', border:'none', cursor:'pointer', fontSize:14, fontWeight:700, display:'flex', alignItems:'center', gap:7, opacity:submitting?.7:1 }}>
        {submitting ? <div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .8s linear infinite' }}/> : <Save size={14}/>}
        {isEdit ? 'Enregistrer' : 'Créer le patient'}
      </button>
    </div>
  </form>
);

/* ── Avatar patient ── */
const Avatar = ({ p, size=44 }) => {
  const [g1, g2] = avatarColor(p.last_name);
  return (
    <div style={{ width:size, height:size, borderRadius:size*0.27, background:`linear-gradient(135deg,${g1},${g2})`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 2px 8px ${g1}40` }}>
      <span style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:size*0.38, color:'#fff', letterSpacing:-0.5 }}>{initials(p.first_name, p.last_name)}</span>
    </div>
  );
};

/* ── Action icon button ── */
const ActionBtn = ({ icon: Icon, label, to, onClick, color='#0D7A87' }) => {
  const [hover, setHover] = useState(false);
  const btn = (
    <button title={label} onClick={onClick}
      onMouseOver={() => setHover(true)} onMouseOut={() => setHover(false)}
      style={{ width:44, height:44, borderRadius:12, border:`1.5px solid ${hover?color:'#E2E8F0'}`, background:hover?`${color}12`:'#fff', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, color:hover?color:'#94A3B8', transition:'all .18s', flexShrink:0, padding:'4px 2px' }}>
      <Icon size={18}/>
      <span style={{ fontSize:9, fontWeight:700, color:hover?color:'#94A3B8', lineHeight:1, textAlign:'center', whiteSpace:'nowrap' }}>{label.length > 8 ? label.slice(0,8) : label}</span>
    </button>
  );
  return to ? <Link to={to} style={{ textDecoration:'none' }}>{btn}</Link> : btn;
};

/* ════════════════════════════════════════════════════════════════════════════ */
const PatientManagement = () => {
  const { user } = useAuth();
  const [patients,  setPatients]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [genderFilter, setGF]    = useState('ALL');
  const [sortBy,    setSort]      = useState('name');
  const [viewMode,  setView]      = useState('list'); // list | grid
  const [isOpen,    setIsOpen]    = useState(false);
  const [selP,      setSelP]      = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [detail,    setDetail]    = useState(null);
  const mountedRef = useRef(true);

  const emptyForm = { first_name:'', last_name:'', date_of_birth:'', gender:'', phone_primary:'', email:'', address:'', emergency_contact_name:'', emergency_contact_phone:'', medical_history:'', allergies:'', current_medications:'' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    mountedRef.current = true;
    fetchPatients();
    return () => { mountedRef.current = false; };
  }, []);

  const fetchPatients = async () => {
    try {
      const r = await axios.get(`${API}/patients`, authH());
      const list = r.data.patients || r.data.data || r.data || [];
      if (mountedRef.current) setPatients(Array.isArray(list) ? list : []);
    } catch (e) { if (!axios.isCancel(e)) toast.error('Erreur chargement patients'); }
    finally { if (mountedRef.current) setLoading(false); }
  };

  const onChange = useCallback((name, val) => setForm(p => ({...p, [name]:val})), []);

  const openCreate = () => { setSelP(null); setForm(emptyForm); setIsOpen(true); };
  const openEdit   = p  => { setSelP(p);  setForm({ first_name:p.first_name||'', last_name:p.last_name||'', date_of_birth:p.date_of_birth||'', gender:p.gender||'', phone_primary:p.phone_primary||'', email:p.email||'', address:p.address||'', emergency_contact_name:p.emergency_contact_name||'', emergency_contact_phone:p.emergency_contact_phone||'', medical_history:p.medical_history||'', allergies:p.allergies||'', current_medications:p.current_medications||'' }); setIsOpen(true); };

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true);
    try {
      if (selP) await axios.put(`${API}/patients/${selP.id}`, form, authH());
      else      await axios.post(`${API}/patients`, form, authH());
      toast.success(selP ? 'Patient modifié !' : 'Patient créé !');
      setIsOpen(false); fetchPatients();
    } catch (e) { toast.error(e.response?.data?.error || 'Erreur sauvegarde'); }
    finally { setSaving(false); }
  };

  /* Filtrage et tri */
  const filtered = patients
    .filter(p => {
      const q = search.toLowerCase();
      const ms = genderFilter === 'ALL' || p.gender === genderFilter;
      const mt = !search || [p.first_name, p.last_name, p.phone_primary, p.email, p.address].some(v => v?.toLowerCase().includes(q));
      return ms && mt;
    })
    .sort((a,b) => {
      if (sortBy === 'name')     return `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`);
      if (sortBy === 'recent')   return new Date(b.created_at||0) - new Date(a.created_at||0);
      if (sortBy === 'age')      return (new Date(a.date_of_birth||0)) - (new Date(b.date_of_birth||0));
      return 0;
    });

  /* Stats */
  const stats = {
    total:    patients.length,
    men:      patients.filter(p => p.gender==='M').length,
    women:    patients.filter(p => p.gender==='F').length,
    allergies:patients.filter(p => p.allergies).length,
    recent:   patients.filter(p => { const d = new Date(p.created_at||0); return Date.now()-d < 30*24*3600*1000; }).length,
  };

  if (loading) return (
    <div style={{ maxWidth: 1100, margin:'0 auto', paddingBottom:48 }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
        <Skel h={44} w={44} r={13}/><div style={{ flex:1 }}><Skel h={18} w={160} r={8}/><div style={{ marginTop:6 }}><Skel h={12} w={100} r={6}/></div></div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {Array(4).fill(0).map((_,i) => <Skel key={i} h={72} r={14}/>)}
      </div>
      <Skel h={46} r={12} w="100%"/>
      <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:10 }}>
        {Array(6).fill(0).map((_,i) => <Skel key={i} h={72} r={14}/>)}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin:'0 auto', paddingBottom:48 }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.pt-card{animation:fadeUp .35s ease both}`}</style>

      {/* ── En-tête ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:13, background:'linear-gradient(135deg,#0D7A87,#13A3B4)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(13,122,135,.3)' }}>
            <Users size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:22, color:'#0F172A', margin:0 }}>Patients</h1>
            <p style={{ color:'#64748B', fontSize:13, margin:0 }}>{patients.length} patient(s) enregistré(s)</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={fetchPatients} style={{ padding:'8px 13px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:600, color:'#475569' }}>
            <RefreshCw size={13}/>
          </button>
          <button onClick={openCreate}
            style={{ padding:'9px 18px', borderRadius:10, background:'linear-gradient(135deg,#0D7A87,#13A3B4)', color:'#fff', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:14, fontWeight:700, boxShadow:'0 4px 14px rgba(13,122,135,.3)' }}>
            <Plus size={15}/>Nouveau Patient
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="pt-card" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { icon:'👥', l:'Total',         v:stats.total,    c:'#0D7A87', bg:'#F0FDFE', action:()=>setGF('ALL') },
          { icon:'👨', l:'Hommes',         v:stats.men,      c:'#3B82F6', bg:'#EFF6FF', action:()=>setGF('M') },
          { icon:'👩', l:'Femmes',          v:stats.women,    c:'#EC4899', bg:'#FDF2F8', action:()=>setGF('F') },
          { icon:'⚠️', l:'Avec allergies', v:stats.allergies,c:'#F59E0B', bg:'#FFFBEB', action:()=>{} },
          { icon:'🆕', l:'Ce mois',         v:stats.recent,   c:'#10B981', bg:'#DCFCE7', action:()=>setSort('recent') },
        ].map((k,i) => (
          <button key={i} onClick={k.action} style={{ background:'#fff', borderRadius:14, border:`1.5px solid ${(genderFilter==='M'&&k.l==='Hommes')||(genderFilter==='F'&&k.l==='Femmes')||(genderFilter==='ALL'&&k.l==='Total')?k.c:'#E2E8F0'}`, padding:'14px 16px', cursor:'pointer', textAlign:'left', transition:'all .2s', display:'flex', alignItems:'center', gap:11 }}
            onMouseOver={e=>{e.currentTarget.style.borderColor=k.c;e.currentTarget.style.boxShadow=`0 4px 12px ${k.c}20`;}}
            onMouseOut={e=>{e.currentTarget.style.borderColor=((genderFilter==='M'&&k.l==='Hommes')||(genderFilter==='F'&&k.l==='Femmes')||(genderFilter==='ALL'&&k.l==='Total'))?k.c:'#E2E8F0';e.currentTarget.style.boxShadow='none';}}>
            <div style={{ width:36, height:36, borderRadius:10, background:k.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{k.icon}</div>
            <div>
              <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:20, color:'#0F172A' }}>{k.v}</div>
              <div style={{ fontSize:11, color:'#64748B' }}>{k.l}</div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Barre de recherche + filtres ── */}
      <div className="pt-card" style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'12px 16px', marginBottom:16, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', animationDelay:'.05s' }}>
        {/* Search */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:220 }}>
          <Search size={14} color="#94A3B8"/>
          <input placeholder="Rechercher par nom, téléphone, email, adresse..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{ border:'none', background:'transparent', outline:'none', fontSize:13, flex:1, fontFamily:'inherit', color:'#0F172A' }}/>
          {search && <button onClick={()=>setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#94A3B8', padding:2 }}><X size={13}/></button>}
        </div>
        <div style={{ width:1, height:24, background:'#E2E8F0' }}/>
        {/* Tri */}
        <select value={sortBy} onChange={e=>setSort(e.target.value)}
          style={{ padding:'6px 10px', borderRadius:9, border:'1.5px solid #E2E8F0', background:'#F8FAFC', fontSize:12, fontWeight:600, color:'#475569', cursor:'pointer', outline:'none' }}>
          <option value="name">Trier : A→Z</option>
          <option value="recent">Trier : Récents</option>
          <option value="age">Trier : Âge</option>
        </select>
        {/* Vue */}
        <div style={{ display:'flex', gap:3 }}>
          {[{k:'list',Icon:List},{k:'grid',Icon:Grid}].map(v => (
            <button key={v.k} onClick={()=>setView(v.k)}
              style={{ width:32, height:32, borderRadius:8, border:'none', cursor:'pointer', background:viewMode===v.k?'#0D7A87':'#F1F5F9', color:viewMode===v.k?'#fff':'#64748B', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}>
              <v.Icon size={14}/>
            </button>
          ))}
        </div>
        {/* Résultats */}
        <span style={{ fontSize:12, color:'#94A3B8', whiteSpace:'nowrap' }}>{filtered.length} résultat{filtered.length !== 1?'s':''}</span>
      </div>

      {/* ── Liste patients ── */}
      {filtered.length === 0 ? (
        <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'52px', textAlign:'center' }}>
          <Users size={40} style={{ margin:'0 auto 14px', color:'#CBD5E1' }}/>
          <p style={{ fontWeight:700, color:'#475569', fontSize:15, margin:'0 0 6px' }}>{search ? 'Aucun résultat' : 'Aucun patient'}</p>
          <p style={{ color:'#94A3B8', fontSize:13, margin:'0 0 18px' }}>{search ? `Aucun patient ne correspond à "${search}"` : 'Commencez par créer votre premier patient'}</p>
          {!search && <button onClick={openCreate} style={{ padding:'10px 22px', borderRadius:11, background:'linear-gradient(135deg,#0D7A87,#13A3B4)', color:'#fff', border:'none', cursor:'pointer', fontSize:14, fontWeight:700 }}>Créer un patient</button>}
        </div>
      ) : viewMode === 'list' ? (
        /* ── VUE LISTE ── */
        <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', overflow:'hidden' }}>
          {filtered.map((p, idx) => {
            const age = calcAge(p.date_of_birth);
            const gc  = GENDER_COLOR[p.gender];
            const gb  = GENDER_BG[p.gender];
            return (
              <div key={p.id} className="pt-card"
                style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:idx<filtered.length-1?'1px solid #F8FAFC':'none', flexWrap:'wrap', gap:10, animationDelay:`${Math.min(idx,.2)*0.04}s`, transition:'background .15s', cursor:'default' }}
                onMouseOver={e=>e.currentTarget.style.background='#FAFBFC'}
                onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                {/* Avatar + infos */}
                <div style={{ display:'flex', alignItems:'center', gap:14, minWidth:0, flex:1 }}>
                  <Avatar p={p} size={46}/>
                  <div style={{ minWidth:0 }}>
                    {/* Nom + badge genre + allergies */}
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                      <span style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A' }}>{p.first_name} {p.last_name}</span>
                      {p.gender && <span style={{ background:gb, color:gc, fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:99 }}>{GENDER_LABEL[p.gender]}</span>}
                      {age !== null && <span style={{ fontSize:11, color:'#64748B' }}>{age} ans</span>}
                      {p.allergies && <span style={{ background:'#FEF3C7', color:'#B45309', fontSize:10, fontWeight:700, padding:'1px 8px', borderRadius:99, display:'flex', alignItems:'center', gap:3 }}><AlertTriangle size={9}/>Allergies</span>}
                    </div>
                    {/* Coordonnées */}
                    <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
                      {p.phone_primary && <span style={{ fontSize:12, color:'#64748B', display:'flex', alignItems:'center', gap:4 }}><Phone size={11}/>{p.phone_primary}</span>}
                      {p.email && <span style={{ fontSize:12, color:'#64748B', display:'flex', alignItems:'center', gap:4, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}><Mail size={11}/>{p.email}</span>}
                      {p.address && <span style={{ fontSize:12, color:'#94A3B8', display:'flex', alignItems:'center', gap:4 }}><MapPin size={11}/>{p.address}</span>}
                    </div>
                  </div>
                </div>
                {/* Actions */}
                <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                  <ActionBtn icon={Eye}            label="Fiche détaillée"  onClick={()=>setDetail(p)}                           color="#0D7A87"/>
                  <ActionBtn icon={Activity}       label="Odontogramme"     to={`/patients/${p.id}/odontogram`}                  color="#7C3AED"/>
                  <ActionBtn icon={FileText}       label="Documents"        to={`/patients/${p.id}/documents`}                   color="#3B82F6"/>
                  <ActionBtn icon={ClipboardList}  label="Ordonnances"      to={`/patients/${p.id}/prescriptions`}               color="#10B981"/>
                  <ActionBtn icon={FlaskConical}   label="Labo"             to={`/patients/${p.id}/lab-orders`}                  color="#8B5CF6"/>
                  <ActionBtn icon={ChevronRight}   label="Fiche dentaire"   to={`/patients/${p.id}/chart`}                       color="#F59E0B"/>
                  <ActionBtn icon={Edit}           label="Modifier"         onClick={()=>openEdit(p)}                            color="#0D7A87"/>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── VUE GRILLE ── */
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
          {filtered.map((p, idx) => {
            const age = calcAge(p.date_of_birth);
            return (
              <div key={p.id} className="pt-card" style={{ background:'#fff', borderRadius:18, border:'1.5px solid #E2E8F0', padding:'20px', boxShadow:'0 1px 4px rgba(0,0,0,.04)', transition:'all .2s', animationDelay:`${Math.min(idx,.2)*0.04}s` }}
                onMouseOver={e=>{e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.08)';e.currentTarget.style.borderColor='#CBD5E1';}}
                onMouseOut={e=>{e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.04)';e.currentTarget.style.borderColor='#E2E8F0';}}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:14 }}>
                  <Avatar p={p} size={50}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A', marginBottom:4 }}>{p.first_name} {p.last_name}</div>
                    <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                      {age !== null && <span style={{ fontSize:11, color:'#64748B', background:'#F1F5F9', padding:'1px 8px', borderRadius:99 }}>{age} ans</span>}
                      {p.gender && <span style={{ background:GENDER_BG[p.gender], color:GENDER_COLOR[p.gender], fontSize:11, fontWeight:700, padding:'1px 8px', borderRadius:99 }}>{GENDER_LABEL[p.gender]}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
                  {p.phone_primary && <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:'#475569' }}><Phone size={12} color="#94A3B8"/>{p.phone_primary}</div>}
                  {p.email && <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:'#475569', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}><Mail size={12} color="#94A3B8"/>{p.email}</div>}
                  {p.allergies && <div style={{ background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:8, padding:'5px 10px', fontSize:11, fontWeight:700, color:'#92400E', display:'flex', alignItems:'center', gap:5 }}><AlertTriangle size={10}/>Allergies: {p.allergies}</div>}
                </div>
                <div style={{ display:'flex', gap:6, borderTop:'1px solid #F1F5F9', paddingTop:12 }}>
                  <button onClick={()=>setDetail(p)} style={{ flex:1, padding:'7px', borderRadius:9, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', fontSize:11, fontWeight:600, color:'#0D7A87', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}><Eye size={12}/>Fiche</button>
                  <ActionBtn icon={Activity}      label="Odontogramme" to={`/patients/${p.id}/odontogram`}  color="#7C3AED"/>
                  <ActionBtn icon={FileText}      label="Documents"    to={`/patients/${p.id}/documents`}   color="#3B82F6"/>
                  <ActionBtn icon={ClipboardList} label="Ordonnances"  to={`/patients/${p.id}/prescriptions`} color="#10B981"/>
                  <ActionBtn icon={Edit}          label="Modifier"     onClick={()=>openEdit(p)}             color="#0D7A87"/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ MODAL FICHE DÉTAILLÉE ══ */}
      <Modal open={!!detail} onClose={()=>setDetail(null)} title="" maxW={520}>
        {detail && (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:20 }}>
              <Avatar p={detail} size={60}/>
              <div>
                <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:20, color:'#0F172A', margin:'0 0 6px' }}>{detail.first_name} {detail.last_name}</h2>
                <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                  {calcAge(detail.date_of_birth) && <span style={{ background:'#F1F5F9', color:'#475569', fontSize:12, fontWeight:600, padding:'2px 10px', borderRadius:99 }}>{calcAge(detail.date_of_birth)} ans · né(e) le {fdate(detail.date_of_birth)}</span>}
                  {detail.gender && <span style={{ background:GENDER_BG[detail.gender], color:GENDER_COLOR[detail.gender], fontSize:12, fontWeight:700, padding:'2px 10px', borderRadius:99 }}>{GENDER_LABEL[detail.gender]}</span>}
                </div>
              </div>
            </div>
            {/* Infos */}
            {[
              { icon:Phone,    l:'Téléphone',          v:detail.phone_primary },
              { icon:Mail,     l:'Email',              v:detail.email },
              { icon:MapPin,   l:'Adresse',            v:detail.address },
              { icon:Shield,   l:'Contact urgence',    v:detail.emergency_contact_name ? `${detail.emergency_contact_name} · ${detail.emergency_contact_phone||''}` : null },
            ].filter(r=>r.v).map((row,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid #F8FAFC' }}>
                <div style={{ width:30, height:30, borderRadius:8, background:'#F8FAFC', display:'flex', alignItems:'center', justifyContent:'center' }}><row.icon size={13} color="#64748B"/></div>
                <div><div style={{ fontSize:10, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:1 }}>{row.l}</div><div style={{ fontSize:13, color:'#0F172A', fontWeight:500 }}>{row.v}</div></div>
              </div>
            ))}
            {/* Médical */}
            {(detail.allergies||detail.medical_history||detail.current_medications) && (
              <div style={{ background:'#FFF5F5', borderRadius:12, padding:'14px', marginTop:14 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#EF4444', textTransform:'uppercase', letterSpacing:1.5, marginBottom:10 }}>🏥 Informations médicales</div>
                {detail.allergies && <div style={{ marginBottom:8 }}><div style={{ fontSize:11, fontWeight:700, color:'#DC2626', marginBottom:3 }}>⚠️ Allergies</div><div style={{ fontSize:13, color:'#7F1D1D', background:'#FEE2E2', borderRadius:8, padding:'6px 10px' }}>{detail.allergies}</div></div>}
                {detail.medical_history && <div style={{ marginBottom:8 }}><div style={{ fontSize:11, fontWeight:600, color:'#475569', marginBottom:3 }}>Antécédents</div><div style={{ fontSize:12, color:'#475569' }}>{detail.medical_history}</div></div>}
                {detail.current_medications && <div><div style={{ fontSize:11, fontWeight:600, color:'#475569', marginBottom:3 }}>Médicaments</div><div style={{ fontSize:12, color:'#475569' }}>{detail.current_medications}</div></div>}
              </div>
            )}
            {/* Accès rapides */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginTop:18 }}>
              {[
                { icon:Activity,      l:'Odontogramme', to:`/patients/${detail.id}/odontogram`,    c:'#7C3AED' },
                { icon:FileText,      l:'Documents',    to:`/patients/${detail.id}/documents`,     c:'#3B82F6' },
                { icon:ClipboardList, l:'Ordonnances',  to:`/patients/${detail.id}/prescriptions`, c:'#10B981' },
                { icon:FlaskConical,  l:'Labo',          to:`/patients/${detail.id}/lab-orders`,   c:'#8B5CF6' },
                { icon:ChevronRight,  l:'Fiche dentaire',to:`/patients/${detail.id}/chart`,        c:'#F59E0B' },
                { icon:Edit,          l:'Modifier',      onClick:()=>{setDetail(null);openEdit(detail);}, c:'#0D7A87' },
              ].map((a,i) => {
                const btn = (
                  <button key={i} onClick={a.onClick}
                    style={{ padding:'14px 8px', borderRadius:14, border:`1.5px solid ${a.c}22`, background:`${a.c}08`, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:7, transition:'all .2s' }}
                    onMouseOver={e=>{e.currentTarget.style.background=`${a.c}18`;e.currentTarget.style.borderColor=a.c;e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 6px 16px ${a.c}25`;}}
                    onMouseOut={e=>{e.currentTarget.style.background=`${a.c}08`;e.currentTarget.style.borderColor=`${a.c}22`;e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';}}>
                    <div style={{ width:40, height:40, borderRadius:12, background:`${a.c}15`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <a.icon size={22} color={a.c}/>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color:a.c, textAlign:'center', lineHeight:1.2 }}>{a.l}</span>
                  </button>
                );
                return a.to ? <Link key={i} to={a.to} style={{ textDecoration:'none' }} onClick={()=>setDetail(null)}>{btn}</Link> : btn;
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* ══ MODAL CRÉER / MODIFIER ══ */}
      <Modal open={isOpen} onClose={()=>setIsOpen(false)} title={selP ? `✏️ Modifier — ${selP.first_name} ${selP.last_name}` : '👤 Nouveau Patient'} maxW={580}>
        <PatientForm data={form} onChange={onChange} onSubmit={handleSubmit} onCancel={()=>setIsOpen(false)} submitting={saving} isEdit={!!selP}/>
      </Modal>
    </div>
  );
};

export default PatientManagement;
