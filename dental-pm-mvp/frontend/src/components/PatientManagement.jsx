import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import { toast } from 'sonner';
import { buildSearchText, normalizeDigits, normalizeSearch, patientIdentifier, patientSearchText } from '../utils/search';
import {
  Users, Plus, Search, Edit, Activity, Phone, Mail,
  AlertTriangle, User, Calendar, FileText, ClipboardList,
  FlaskConical, X, Save, Loader2, ChevronRight, Filter,
  BarChart2, UserCheck, UserX, Heart, RefreshCw, Download,
  MapPin, Shield, Pill, Eye, Grid, List, SortAsc, Upload, History
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8001/api'
    : '/api';
const authH = () => ({ withCredentials: true });

const calcAge = dob => {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000*60*60*24*365.25));
};
const fdate = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const fdatetime = d => d ? new Date(d).toLocaleString('fr-FR', { dateStyle:'short', timeStyle:'short' }) : '—';
const fmt = v => new Intl.NumberFormat('fr-MG').format(v || 0) + ' Ar';
const initials = (fn, ln) => `${(fn||'')[0]||''}${(ln||'')[0]||''}`.toUpperCase();

const GENDER_COLOR = { M:'#3B82F6', F:'#EC4899', OTHER:'#8B5CF6' };
const GENDER_BG    = { M:'#EFF6FF', F:'#FDF2F8', OTHER:'#EDE9FE' };
const GENDER_LABEL = { M:'M', F:'F', OTHER:'?' };

// Ajout
const normalizeGenderValue = (gender) => {
  const g = String(gender || '').trim().toUpperCase();

  if (g === 'M' || g === 'MALE' || g === 'MASCULIN') return 'M';
  if (g === 'F' || g === 'FEMALE' || g === 'FEMININ' || g === 'FÉMININ') return 'F';
  if (g === 'OTHER' || g === 'AUTRE') return 'OTHER';

  return '';
};
// 
const AVATAR_COLORS = [
  ['#0D7A87','#13A3B4'], ['#7C3AED','#9333EA'], ['#1D4ED8','#3B82F6'],
  ['#059669','#10B981'], ['#D97706','#F59E0B'], ['#DC2626','#EF4444'],
  ['#0891B2','#06B6D4'], ['#7C3AED','#A855F7'],
];
const avatarColor = name => AVATAR_COLORS[(name?.charCodeAt(0)||0) % AVATAR_COLORS.length];
const searchTerms = query => [...new Set(normalizeSearch(query).split(/\s+/).filter(Boolean))];
const patientSearchIndex = patient => {
  const raw = patientSearchText(patient);
  return {
    patient,
    text: buildSearchText(raw),
    digits: normalizeDigits(raw),
  };
};
const matchesPatientIndex = (index, query, terms, digits) => {
  if (!query) return true;
  return terms.every(term => index.text.includes(term)) || (!!digits && index.digits.includes(digits));
};
const scorePatientIndex = (index, query, terms, digits) => {
  if (!query || !matchesPatientIndex(index, query, terms, digits)) return 0;
  let score = 1;
  if (index.text === query) score += 120;
  if (index.text.includes(query)) score += 60;

  const words = index.text.split(/\s+/).filter(Boolean);
  terms.forEach(term => {
    if (words.includes(term)) score += 35;
    else if (words.some(word => word.startsWith(term))) score += 22;
    else if (index.text.includes(term)) score += 12;
  });

  if (digits) {
    if (index.digits === digits) score += 80;
    else if (index.digits.includes(digits)) score += 45;
  }
  return score;
};

/* ── Modal ── */
const Modal = ({ open, onClose, title, children, maxW = 520 }) => {
  if (!open) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(15,23,42,.55)',
        padding: '24px 16px',
        overflowY: 'auto',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: maxW,
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          background: '#FFFFFF',
          borderRadius: 28,
          boxShadow: '0 24px 80px rgba(15,23,42,.25)',
          position: 'relative'
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'sticky',
            top: 14,
            float: 'right',
            zIndex: 20,
            margin: 14,
            width: 38,
            height: 38,
            borderRadius: 999,
            border: '1px solid #E2E8F0',
            background: '#FFFFFF',
            cursor: 'pointer',
            fontSize: 22,
            color: '#64748B',
            boxShadow: '0 8px 24px rgba(15,23,42,.12)'
          }}
        >
          ×
        </button>

        {title && (
          <div
            style={{
              padding: '22px 28px 0',
              fontSize: 22,
              fontWeight: 800,
              color: '#0F172A'
            }}
          >
            {title}
          </div>
        )}

        <div style={{ clear: 'both' }}>
          {children}
        </div>
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
      <div style={{ background:'#FFFFFF', border:'1px solid #D9F3F6', color:'#0D7A87', borderRadius:10, padding:'9px 12px', marginBottom:12, fontSize:12, fontWeight:700, display:'flex', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
        <span>Identifiant patient</span>
        <span>{isEdit ? patientIdentifier(data) : 'Généré automatiquement à la création'}</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <label htmlFor="patient-first-name" style={labelStyle}>Prénom *</label>
          <input id="patient-first-name" aria-label="Prénom" style={fieldStyle} type="text" placeholder="Jean" value={data.first_name||''} onChange={e=>onChange('first_name',e.target.value)} onFocus={fi} onBlur={bi} required/>
        </div>
        <div>
          <label htmlFor="patient-last-name" style={labelStyle}>Nom *</label>
          <input id="patient-last-name" aria-label="Nom" style={fieldStyle} type="text" placeholder="Rakoto" value={data.last_name||''} onChange={e=>onChange('last_name',e.target.value)} onFocus={fi} onBlur={bi} required/>
        </div>
        <div>
          <label htmlFor="patient-date-of-birth" style={labelStyle}>Date de naissance</label>
          <input id="patient-date-of-birth" aria-label="Date de naissance" style={fieldStyle} type="date" value={data.date_of_birth||''} onChange={e=>onChange('date_of_birth',e.target.value)} onFocus={fi} onBlur={bi}/>
        </div>
        <div>
          <label htmlFor="patient-gender" style={labelStyle}>Sexe</label>
          <select id="patient-gender" aria-label="Sexe" style={fieldStyle} value={data.gender||''} onChange={e=>onChange('gender',e.target.value)} onFocus={fi} onBlur={bi}>
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
          <label htmlFor="patient-phone-primary" style={labelStyle}>Téléphone *</label>
          <input id="patient-phone-primary" aria-label="Téléphone" style={fieldStyle} type="text" placeholder="034 00 000 00" value={data.phone_primary||''} onChange={e=>onChange('phone_primary',e.target.value)} onFocus={fi} onBlur={bi} required/>
        </div>
        <div>
          <label htmlFor="patient-email" style={labelStyle}>Email</label>
          <input id="patient-email" aria-label="Email" style={fieldStyle} type="email" placeholder="jean@email.mg" value={data.email||''} onChange={e=>onChange('email',e.target.value)} onFocus={fi} onBlur={bi}/>
        </div>
        <div style={{ gridColumn:'1/-1' }}>
          <label htmlFor="patient-address" style={labelStyle}>Adresse</label>
          <input id="patient-address" aria-label="Adresse" style={fieldStyle} type="text" placeholder="Antananarivo, Madagascar" value={data.address||''} onChange={e=>onChange('address',e.target.value)} onFocus={fi} onBlur={bi}/>
        </div>
        <div>
          <label htmlFor="patient-emergency-contact-name" style={labelStyle}>Contact urgence</label>
          <input id="patient-emergency-contact-name" aria-label="Contact urgence" style={fieldStyle} type="text" placeholder="Nom" value={data.emergency_contact_name||''} onChange={e=>onChange('emergency_contact_name',e.target.value)} onFocus={fi} onBlur={bi}/>
        </div>
        <div>
          <label htmlFor="patient-emergency-contact-phone" style={labelStyle}>Tél. urgence</label>
          <input id="patient-emergency-contact-phone" aria-label="Téléphone urgence" style={fieldStyle} type="text" placeholder="+261 34..." value={data.emergency_contact_phone||''} onChange={e=>onChange('emergency_contact_phone',e.target.value)} onFocus={fi} onBlur={bi}/>
        </div>
      </div>
    </div>

    {/* Section médical */}
    <div style={{ background:'#FFF5F5', borderRadius:12, padding:'14px 16px' }}>
      <div style={{ fontSize:11, fontWeight:700, color:'#EF4444', textTransform:'uppercase', letterSpacing:1.5, marginBottom:12 }}>🏥 Informations médicales</div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <div>
          <label htmlFor="patient-medical-history" style={labelStyle}>Antécédents médicaux</label>
          <textarea id="patient-medical-history" aria-label="Antécédents médicaux" style={{ ...fieldStyle, minHeight:60, resize:'vertical' }} value={data.medical_history||''} onChange={e=>onChange('medical_history',e.target.value)} placeholder="Antécédents médicaux..." onFocus={fi} onBlur={bi}/>
        </div>
        <div>
          <label htmlFor="patient-allergies" style={{ ...labelStyle, color:'#DC2626' }}>⚠️ Allergies</label>
          <textarea id="patient-allergies" aria-label="Allergies" style={{ ...fieldStyle, minHeight:48, resize:'vertical', borderColor: data.allergies ? '#FECACA' : '#E2E8F0' }} value={data.allergies||''} onChange={e=>onChange('allergies',e.target.value)} placeholder="Allergies connues..." onFocus={fi} onBlur={bi}/>
        </div>
        <div>
          <label htmlFor="patient-current-medications" style={labelStyle}>Médicaments actuels</label>
          <textarea id="patient-current-medications" aria-label="Médicaments actuels" style={{ ...fieldStyle, minHeight:48, resize:'vertical' }} value={data.current_medications||''} onChange={e=>onChange('current_medications',e.target.value)} placeholder="Traitements en cours..." onFocus={fi} onBlur={bi}/>
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
    <button type="button" title={label} onClick={onClick}
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
  const location = useLocation();
  const [patients,  setPatients]  = useState([]);
  // AJOUT
  const [patientStats, setPatientStats] = useState({
    total: 0,
    men: 0,
    women: 0,
    allergies: 0,
    recent: 0
  });  
  // 
  const [loading,   setLoading]   = useState(true);
  const [searching, setSearching] = useState(false);
  const [search,    setSearch]    = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [genderFilter, setGF]    = useState('ALL');
  const [sortBy,    setSort]      = useState('name');
  const [page,      setPage]      = useState(1);
  const [pagination,setPagination]= useState({ current_page:1, total_pages:1, total_count:0, per_page:50 });
  const [viewMode,  setView]      = useState('list'); // list | grid
  const [isOpen,    setIsOpen]    = useState(false);
  const [selP,      setSelP]      = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [importing, setImporting] = useState(false);
  const [detail,    setDetail]    = useState(null);
  const [historyFor, setHistoryFor] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const mountedRef = useRef(true);
  const importInputRef = useRef(null);
  const patientsRequestRef = useRef(null);
  const urlCommandRef = useRef('');
  const canImportPatients = ['ADMIN', 'DENTIST', 'ASSISTANT'].includes(user?.role);

  const emptyForm = { id:'', patient_number:'', first_name:'', last_name:'', date_of_birth:'', gender:'', phone_primary:'', email:'', address:'', emergency_contact_name:'', emergency_contact_phone:'', medical_history:'', allergies:'', current_medications:'' };
  const [form, setForm] = useState(emptyForm);
  

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      patientsRequestRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!location.search || urlCommandRef.current === location.search) return;
    urlCommandRef.current = location.search;

    const params = new URLSearchParams(location.search);
    const query = params.get('search') || '';
    if (query) {
      setPage(1);
      setSearch(query);
    }
    if (params.get('action') === 'new') {
      openCreate();
    }
  }, [location.search]);

  useEffect(() => {
    if (search.trim() && page !== 1) {
      setPage(1);
      return undefined;
    }

    const timer = setTimeout(() => fetchPatients(search.trim() ? 1 : page, search), search ? 150 : 0);
    return () => clearTimeout(timer);
  }, [page, search]);

  useEffect(() => {
    const patientIdToOpen = sessionStorage.getItem('dpm_open_patient_detail');
  
    if (!patientIdToOpen) return;
  
    const openPatientFromAppointment = async () => {
      try {
        const response = await axios.get(
          `${API}/patients/${patientIdToOpen}`,
          authH()
        );
  
        setDetail(response.data);
      } catch (error) {
        console.error('open patient detail error:', error?.response?.data || error.message);
        toast.error('Impossible d’ouvrir la fiche détaillée du patient');
      } finally {
        sessionStorage.removeItem('dpm_open_patient_detail');
      }
    };
  
    openPatientFromAppointment();
  }, [location.pathname]);

  const fetchPatients = async (targetPage = page, searchValue = search) => {
    patientsRequestRef.current?.abort();
    const controller = new AbortController();
    patientsRequestRef.current = controller;

    try {
      const hasSearch = !!searchValue.trim();
      if (patients.length) setSearching(true);
      else setLoading(true);
      const params = hasSearch
        ? { page: 1, limit: 80, search: searchValue.trim() }
        : { page: targetPage, limit: 50 };
      const r = await axios.get(`${API}/patients`, { params, signal: controller.signal, ...authH() });
      const list = r.data.patients || r.data.data || r.data || [];
      if (mountedRef.current && patientsRequestRef.current === controller) setPatients(Array.isArray(list) ? list : []);
      if (mountedRef.current && r.data.pagination) {
        setPagination(hasSearch ? { ...r.data.pagination, current_page: 1 } : r.data.pagination);
      }
    } catch (e) {
      if (!axios.isCancel(e) && e.code !== 'ERR_CANCELED') toast.error('Erreur chargement patients');
    }
    finally {
      if (mountedRef.current && patientsRequestRef.current === controller) {
        setLoading(false);
        setSearching(false);
      }
    }
  };

  // AJOUT
  const fetchPatientStats = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API}/patients/stats/summary?_t=${Date.now()}`,
        authH()
      );
      // const response = await axios.get(
      //   `${API}/patients?page=${pageNum}&limit=${limit}&search=${encodeURIComponent(searchTerm)}&sort=${sort}&gender=${genderFilter}&_t=${Date.now()}`,
      //   authH()
      // );
  
      const data = response.data || {};
  
      setPatientStats({
        total: Number(data.total || 0),
        men: Number(data.men || 0),
        women: Number(data.women || 0),
        allergies: Number(data.allergies || 0),
        recent: Number(data.recent ?? data.this_month ?? 0)
      });
    } catch (error) {
      console.error('Erreur chargement statistiques patients:', error?.response?.data || error.message);
    }
  }, []);
  useEffect(() => {
    fetchPatientStats();
  }, [fetchPatientStats]);
  // 
  const onChange = useCallback((name, val) => setForm(p => ({...p, [name]:val})), []);

  const openCreate = () => {
    setSelP(null);
    setForm(emptyForm);
    setIsOpen(true);
  };
  const openEdit = p => {
    const nextForm = {
      id: p.id || '',
      patient_number: p.patient_number || '',
      first_name: p.first_name || '',
      last_name: p.last_name || '',
      date_of_birth: p.date_of_birth || '',
      gender: p.gender || '',
      phone_primary: p.phone_primary || '',
      email: p.email || '',
      address: p.address || '',
      emergency_contact_name: p.emergency_contact_name || '',
      emergency_contact_phone: p.emergency_contact_phone || '',
      medical_history: p.medical_history || '',
      allergies: p.allergies || '',
      current_medications: p.current_medications || ''
    };
    setSelP(() => p);
    setForm(nextForm);
    setIsOpen(true);
  };

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true);
    try {
      const { id, patient_number, ...payload } = form;
      if (selP) {
        await axios.put(`${API}/patients/${selP.id}`, payload, authH());
        toast.success('Patient modifié !');
      } else {
        const res = await axios.post(`${API}/patients`, payload, authH());
        toast.success(`Patient créé ! ID: ${patientIdentifier(res.data.patient || {})}`);
      }
      // setIsOpen(false); fetchPatients();
      setIsOpen(false); setPage(1); setSearch(''); setGF('ALL'); await fetchPatients(1, ''); await fetchPatientStats();
    } catch (e) { toast.error(e.response?.data?.error || 'Erreur sauvegarde'); }
    finally { setSaving(false); }
  };

  const downloadCsvTemplate = () => {
    const header = [
      'patient_number',
      'first_name',
      'last_name',
      'date_of_birth',
      'gender',
      'phone_primary',
      'email',
      'address',
      'city',
      'emergency_contact_name',
      'emergency_contact_phone',
      'medical_history',
      'allergies',
      'current_medications',
      'payer_type',
      'preferred_language',
      'consent_treatment',
      'consent_data_processing',
      'consent_sms_reminders',
      'notes'
    ].join(',');
    const sample = [
      'PAT-000001',
      'Jean',
      'Rakoto',
      '1990-05-12',
      'M',
      '0340000000',
      'jean@example.com',
      'Antananarivo',
      'Antananarivo',
      'Marie Rakoto',
      '0340000001',
      'Hypertension',
      'Aucune',
      'Aucun',
      'SELF_PAY',
      'FRENCH',
      'true',
      'true',
      'true',
      'Patient importé'
    ].join(',');

    const blob = new Blob([`${header}\n${sample}\n`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = 'modele_import_patients.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setImporting(true);
    try {
      const response = await axios.post(`${API}/patients/import-csv`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: true
      });
      const inserted = response.data.inserted || 0;
      const updated = response.data.updated || 0;
      const skipped = response.data.skipped || 0;
      if (skipped > 0) {
        toast.warning(`Import partiel: ${inserted} créés, ${updated} mis à jour, ${skipped} ignorés`);
      } else {
        toast.success(`Import terminé: ${inserted} créés, ${updated} mis à jour`);
      }
      // fetchPatients();
      await fetchPatients(1, '');
      await fetchPatientStats();
    } catch (error) {
      const data = error.response?.data;
      const firstError = Array.isArray(data?.errors) && data.errors.length > 0
        ? ` Ligne ${data.errors[0].row}: ${data.errors[0].message || data.errors[0].error}`
        : '';
      toast.error(`${data?.error || 'Erreur lors de l\'import CSV'}${firstError}`);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const openHistory = async (patient) => {
    setHistoryFor(() => patient);
    setHistory([]);
    setHistoryLoading(true);
    try {
      const response = await axios.get(`${API}/patients/${patient.id}/history`, authH());
      setHistory(response.data.history || []);
    } catch (error) {
      toast.error('Erreur chargement historique patient');
    } finally {
      setHistoryLoading(false);
    }
  };

  /* Filtrage et tri */
  const activeSearch = search.trim();
  const normalizedSearch = useMemo(() => normalizeSearch(search), [search]);
  const normalizedDigits = useMemo(() => normalizeDigits(search), [search]);
  const normalizedTerms = useMemo(() => searchTerms(search), [search]);
  const patientIndexes = useMemo(() => patients.map(patientSearchIndex), [patients]);
  const filtered = useMemo(() => patientIndexes
    .filter(({ patient, ...index }) => {
      // const ms = genderFilter === 'ALL' || patient.gender === genderFilter;
      const ms = genderFilter === 'ALL' || normalizeGenderValue(patient.gender) === genderFilter;
      const mt = matchesPatientIndex(index, normalizedSearch, normalizedTerms, normalizedDigits);
      return ms && mt;
    })
    .sort((a,b) => {
      if (normalizedSearch) {
        const scoreDiff = scorePatientIndex(b, normalizedSearch, normalizedTerms, normalizedDigits) - scorePatientIndex(a, normalizedSearch, normalizedTerms, normalizedDigits);
        if (scoreDiff !== 0) return scoreDiff;
      }
      if (sortBy === 'name')     return `${a.patient.last_name}${a.patient.first_name}`.localeCompare(`${b.patient.last_name}${b.patient.first_name}`);
      if (sortBy === 'recent')   return new Date(b.patient.created_at||0) - new Date(a.patient.created_at||0);
      if (sortBy === 'age')      return (new Date(a.patient.date_of_birth||0)) - (new Date(b.patient.date_of_birth||0));
      return 0;
    })
    .map(index => index.patient), [genderFilter, normalizedDigits, normalizedSearch, normalizedTerms, patientIndexes, sortBy]);

  /* Stats */
  // const stats = useMemo(() => ({
  //   total:    pagination.total_count || patients.length,
  //   men:      patients.filter(p => p.gender==='M').length,
  //   women:    patients.filter(p => p.gender==='F').length,
  //   allergies:patients.filter(p => p.allergies).length,
  //   recent:   patients.filter(p => { const d = new Date(p.created_at||0); return Date.now()-d < 30*24*3600*1000; }).length,
  // }), [pagination.total_count, patients]);
  const stats = patientStats;
  
  const applyStatFilter = async (filter) => {
  try {
    const response = await axios.get(
      `${API}/patients/filter/by-stat/${filter}?_t=${Date.now()}`,
      authH()
    );

    const list = response.data?.patients || [];

    setPatients(list);

    if (typeof setPagination === 'function') {
      setPagination({
        current_page: 1,
        total_pages: 1,
        total_count: list.length,
        per_page: list.length
      });
    }
  } catch (error) {
    console.error('Erreur filtre statistique patients:', error?.response?.data || error.message);
    toast.error(error?.response?.data?.error || 'Erreur lors du filtrage des patients');
  }
};
  
// 
  if (loading) return (
    <div style={{ width:'100%', maxWidth: 1380, margin:'0 auto', padding:'0 clamp(14px,2vw,28px) 56px' }}>
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

  const historySummary = history.reduce((acc, item) => {
    acc.total += 1;
    if (item.amount_mga > 0) acc.amount += item.amount_mga;
    if (item.type === 'APPOINTMENT') acc.appointments += 1;
    if (item.type === 'TREATMENT' || item.type === 'ODONTOGRAM') acc.care += 1;
    if (item.type === 'INVOICE' || item.type === 'PAYMENT') acc.billing += 1;
    if (item.type === 'DOCUMENT') acc.documents += 1;
    if (['SMS', 'MESSAGE', 'MAILING'].includes(item.type)) acc.communications += 1;
    return acc;
  }, { total:0, amount:0, appointments:0, care:0, billing:0, documents:0, communications:0 });

  const historyPalette = type => ({
    TREATMENT:     { color:'#0D7A87', bg:'#E6FAFC', label:'Soin' },
    ODONTOGRAM:   { color:'#7C3AED', bg:'#F3E8FF', label:'Odontogramme' },
    PRESCRIPTION: { color:'#10B981', bg:'#ECFDF5', label:'Ordonnance' },
    APPOINTMENT:  { color:'#3B82F6', bg:'#EFF6FF', label:'Rendez-vous' },
    INVOICE:      { color:'#F59E0B', bg:'#FFFBEB', label:'Facture' },
    PAYMENT:      { color:'#059669', bg:'#ECFDF5', label:'Paiement' },
    LAB:          { color:'#8B5CF6', bg:'#F5F3FF', label:'Labo' },
    DOCUMENT:     { color:'#2563EB', bg:'#EFF6FF', label:'Document' },
    SMS:          { color:'#0891B2', bg:'#ECFEFF', label:'SMS' },
    MESSAGE:      { color:'#4F46E5', bg:'#EEF2FF', label:'Message' },
    MAILING:      { color:'#DB2777', bg:'#FDF2F8', label:'Emailing' }
  }[type] || { color:'#64748B', bg:'#F8FAFC', label:'Activité' });

  return (
    <div style={{ width:'100%', maxWidth: 1380, margin:'0 auto', padding:'0 clamp(14px,2vw,28px) 56px' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes historyLine{from{transform:scaleY(0);opacity:.2}to{transform:scaleY(1);opacity:1}}.pt-card{animation:fadeUp .35s ease both}.patient-box{box-shadow:0 18px 54px rgba(15,23,42,.08)}.history-item{animation:fadeUp .28s ease both}.history-item:hover{transform:translateY(-2px);box-shadow:0 16px 36px rgba(15,23,42,.1);border-color:#CBD5E1!important}`}</style>

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
          <button type="button" aria-label="Actualiser les patients" onClick={async () => { await fetchPatients(); await fetchPatientStats(); }} style={{ padding:'8px 13px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:600, color:'#475569' }}>
            <RefreshCw size={13}/>
          </button>
          <button type="button" onClick={downloadCsvTemplate} style={{ padding:'9px 18px', borderRadius:10, background:'#fff', color:'#0D7A87', border:'1.5px solid #7DD3DA', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:14, fontWeight:700 }}>
            <Download size={15}/>Modèle CSV
          </button>
          {canImportPatients && (
            <>
              <input
                aria-label="Fichier CSV patients à importer"
                ref={importInputRef}
                type="file"
                accept=".csv,.cvs,text/csv"
                onChange={handleImportCsv}
                style={{ display:'none' }}
              />
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                disabled={importing}
                style={{ padding:'9px 18px', borderRadius:10, background:'linear-gradient(135deg,#8B5CF6,#7C3AED)', color:'#fff', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:14, fontWeight:700, boxShadow:'0 4px 14px rgba(124,58,237,.25)', opacity: importing ? .75 : 1 }}
              >
                <Upload size={15}/>{importing ? 'Import en cours' : 'Importer CSV'}
              </button>
            </>
          )}
          <button type="button" onClick={openCreate}
            style={{ padding:'9px 18px', borderRadius:10, background:'linear-gradient(135deg,#0D7A87,#13A3B4)', color:'#fff', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:14, fontWeight:700, boxShadow:'0 4px 14px rgba(13,122,135,.3)' }}>
            <Plus size={15}/>Nouveau Patient
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="pt-card" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:14, marginBottom:22 }}>
        {[
          { icon:'👥', l:'Total', v:stats.total, c:'#0D7A87', bg:'#F0FDFE', action:()=>applyStatFilter('ALL') },
          { icon:'👨', l:'Hommes', v:stats.men, c:'#3B82F6', bg:'#EFF6FF', action:()=>applyStatFilter('M') },
          { icon:'👩', l:'Femmes', v:stats.women, c:'#EC4899', bg:'#FDF2F8', action:()=>applyStatFilter('F') },
          { icon:'⚠️', l:'Avec allergies', v:stats.allergies, c:'#F59E0B', bg:'#FFFBEB', action:()=>applyStatFilter('ALLERGIES') },
          { icon:'🆕', l:'Ce mois', v:stats.recent, c:'#10B981', bg:'#DCFCE7', action:()=>applyStatFilter('THIS_MONTH') },
        ].map((k,i) => (
          <button type="button" key={i} onClick={k.action} style={{ background:'#fff', borderRadius:14, border:`1.5px solid ${(genderFilter==='M'&&k.l==='Hommes')||(genderFilter==='F'&&k.l==='Femmes')||(genderFilter==='ALL'&&k.l==='Total')?k.c:'#E2E8F0'}`, padding:'14px 16px', cursor:'pointer', textAlign:'left', transition:'all .2s', display:'flex', alignItems:'center', gap:11 }}
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
      <div className="pt-card patient-box" style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'14px 18px', marginBottom:18, display:'flex', gap:12, flexWrap:'wrap', alignItems:'center', animationDelay:'.05s' }}>
        {/* Search */}
        <div
          style={{
            display:'flex',
            alignItems:'center',
            gap:10,
            flex:'1 1 360px',
            minWidth:260,
            minHeight:46,
            background:'linear-gradient(180deg,#FFFFFF,#F8FAFC)',
            border:`1.5px solid ${searchFocused ? '#0D7A87' : '#D7E5E8'}`,
            borderRadius:14,
            padding:'7px 10px 7px 12px',
            boxShadow:searchFocused ? '0 0 0 4px rgba(13,122,135,.10), 0 12px 28px rgba(15,43,48,.08)' : '0 8px 22px rgba(15,43,48,.05)',
            transition:'border-color .18s ease, box-shadow .18s ease, background .18s ease',
          }}
        >
          <span style={{ width:30, height:30, borderRadius:10, background:searchFocused ? '#E6F4F6' : '#F1F5F9', color:searchFocused ? '#0D7A87' : '#94A3B8', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .18s ease' }}>
            <Search size={15}/>
          </span>
          <input aria-label="Rechercher des patients" placeholder="Nom, prénom, ID patient, téléphone, email, ville, assurance..." value={search} onChange={e=>{setPage(1);setSearch(e.target.value);}}
            onFocus={()=>setSearchFocused(true)}
            onBlur={()=>setSearchFocused(false)}
            style={{ border:'none', background:'transparent', outline:'none', fontSize:14, flex:1, fontFamily:'inherit', color:'#0F172A', minWidth:0 }}/>
          {search && <button type="button" onClick={()=>{setPage(1);setSearch('');}} style={{ width:28, height:28, borderRadius:9, background:'#EEF6F7', border:'none', cursor:'pointer', color:'#64748B', padding:0, display:'flex', alignItems:'center', justifyContent:'center' }}><X size={14}/></button>}
        </div>
        <div style={{ width:1, height:24, background:'#E2E8F0' }}/>
        {/* Tri */}
        <select aria-label="Trier les patients" value={sortBy} onChange={e=>setSort(e.target.value)}
          style={{ padding:'6px 10px', borderRadius:9, border:'1.5px solid #E2E8F0', background:'#F8FAFC', fontSize:12, fontWeight:600, color:'#475569', cursor:'pointer', outline:'none' }}>
          <option value="name">Trier : A→Z</option>
          <option value="recent">Trier : Récents</option>
          <option value="age">Trier : Âge</option>
        </select>
        {/* Vue */}
        <div style={{ display:'flex', gap:3 }}>
          {[{k:'list',Icon:List},{k:'grid',Icon:Grid}].map(v => (
            <button type="button" key={v.k} aria-label={v.k === 'list' ? 'Afficher les patients en liste' : 'Afficher les patients en grille'} onClick={()=>setView(v.k)}
              style={{ width:32, height:32, borderRadius:8, border:'none', cursor:'pointer', background:viewMode===v.k?'#0D7A87':'#F1F5F9', color:viewMode===v.k?'#fff':'#64748B', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}>
              <v.Icon size={14}/>
            </button>
          ))}
        </div>
        {/* Résultats */}
        <span style={{ fontSize:12, color:'#94A3B8', whiteSpace:'nowrap' }}>
          {searching ? 'Recherche...' : `${filtered.length} résultat${filtered.length !== 1?'s':''}${activeSearch ? ` pour "${activeSearch}"` : ''}`}
        </span>
      </div>

      {/* ── Liste patients ── */}
      {filtered.length === 0 ? (
        <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'52px', textAlign:'center' }}>
          <Users size={40} style={{ margin:'0 auto 14px', color:'#CBD5E1' }}/>
          <p style={{ fontWeight:700, color:'#475569', fontSize:15, margin:'0 0 6px' }}>{search ? 'Aucun résultat' : 'Aucun patient'}</p>
          <p style={{ color:'#94A3B8', fontSize:13, margin:'0 0 18px' }}>{search ? `Aucun patient ne correspond à "${search}"` : 'Commencez par créer votre premier patient'}</p>
          {!search && <button type="button" onClick={openCreate} style={{ padding:'10px 22px', borderRadius:11, background:'linear-gradient(135deg,#0D7A87,#13A3B4)', color:'#fff', border:'none', cursor:'pointer', fontSize:14, fontWeight:700 }}>Créer un patient</button>}
        </div>
      ) : viewMode === 'list' ? (
        /* ── VUE LISTE ── */
        <div className="patient-box" style={{ background:'#fff', borderRadius:22, border:'1px solid #E2E8F0', overflow:'hidden' }}>
          {filtered.map((p, idx) => {
            const age = calcAge(p.date_of_birth);
            const gc  = GENDER_COLOR[p.gender];
            const gb  = GENDER_BG[p.gender];
            return (
              <div key={p.id} className="pt-card"
                style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', borderBottom:idx<filtered.length-1?'1px solid #F1F5F9':'none', flexWrap:'wrap', gap:14, animationDelay:`${Math.min(idx,.2)*0.04}s`, transition:'background .15s', cursor:'default' }}
                onMouseOver={e=>e.currentTarget.style.background='#FAFBFC'}
                onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                {/* Avatar + infos */}
                <div style={{ display:'flex', alignItems:'center', gap:14, minWidth:0, flex:1 }}>
                  <Avatar p={p} size={46}/>
                  <div style={{ minWidth:0 }}>
                    {/* Nom + badge genre + allergies */}
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                      <span style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A' }}>{p.first_name} {p.last_name}</span>
                      <span style={{ background:'#F8FAFC', color:'#0D7A87', border:'1px solid #D9F3F6', fontSize:10, fontWeight:800, padding:'1px 7px', borderRadius:99 }}>{patientIdentifier(p)}</span>
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
                  {/*<ActionBtn icon={Eye}            label="Fiche détaillée"  onClick={()=>setDetail(p)}                        color="#0D7A87"/>*/}
                  <ActionBtn icon={History}        label="Historique"       onClick={()=>openHistory(p)}                         color="#DC2626"/>
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
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:18 }}>
          {filtered.map((p, idx) => {
            const age = calcAge(p.date_of_birth);
            return (
              <div key={p.id} className="pt-card patient-box" style={{ background:'#fff', borderRadius:22, border:'1.5px solid #E2E8F0', padding:'22px', transition:'all .2s', animationDelay:`${Math.min(idx,.2)*0.04}s` }}
                onMouseOver={e=>{e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.08)';e.currentTarget.style.borderColor='#CBD5E1';}}
                onMouseOut={e=>{e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.04)';e.currentTarget.style.borderColor='#E2E8F0';}}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:14 }}>
                  <Avatar p={p} size={50}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A', marginBottom:4 }}>{p.first_name} {p.last_name}</div>
                    <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                      <span style={{ fontSize:11, color:'#0D7A87', background:'#F0FDFE', border:'1px solid #D9F3F6', fontWeight:800, padding:'1px 8px', borderRadius:99 }}>{patientIdentifier(p)}</span>
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
                  <button type="button" onClick={()=>setDetail(p)} style={{ flex:1, padding:'7px', borderRadius:9, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', fontSize:11, fontWeight:600, color:'#0D7A87', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}><Eye size={12}/>Fiche</button>
                  <ActionBtn icon={History}       label="Historique"   onClick={()=>openHistory(p)}          color="#DC2626"/>
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

      {pagination.total_pages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginTop:18 }}>
          <button type="button" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page <= 1}
            style={{ padding:'9px 14px', borderRadius:10, border:'1px solid #E2E8F0', background:page<=1?'#F8FAFC':'#fff', color:page<=1?'#CBD5E1':'#475569', fontWeight:700, cursor:page<=1?'not-allowed':'pointer' }}>
            Précédent
          </button>
          <span style={{ fontSize:13, fontWeight:700, color:'#64748B' }}>
            Page {pagination.current_page} / {pagination.total_pages}
          </span>
          <button type="button" onClick={()=>setPage(p=>Math.min(pagination.total_pages,p+1))} disabled={page >= pagination.total_pages}
            style={{ padding:'9px 14px', borderRadius:10, border:'1px solid #E2E8F0', background:page>=pagination.total_pages?'#F8FAFC':'#fff', color:page>=pagination.total_pages?'#CBD5E1':'#475569', fontWeight:700, cursor:page>=pagination.total_pages?'not-allowed':'pointer' }}>
            Suivant
          </button>
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
                  <span style={{ background:'#F0FDFE', color:'#0D7A87', border:'1px solid #BFECEF', fontSize:12, fontWeight:800, padding:'2px 10px', borderRadius:99 }}>{patientIdentifier(detail)}</span>
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
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginTop:18 }}>
              {[
                { icon:Activity, l:'Odontogramme', to:`/patients/${detail.id}/odontogram`, c:'#7C3AED' },
                { icon:History, l:'Historique', onClick:()=>{setDetail(null);openHistory(detail);}, c:'#DC2626' },
                { icon:FileText, l:'Documents', to:`/patients/${detail.id}/documents`, c:'#3B82F6' },
                { icon:ClipboardList, l:'Ordonnances', to:`/patients/${detail.id}/prescriptions`, c:'#10B981' },
                { icon:FlaskConical, l:'Labo', to:`/patients/${detail.id}/lab-orders`, c:'#8B5CF6' },
                { icon:ChevronRight, l:'Fiche dentaire', to:`/patients/${detail.id}/chart`, c:'#F59E0B' },
              ].map((a,i) => {
                const btn = (
                  <button
                    key={i}
                    type="button"
                    onClick={a.onClick}
                    style={{
                      width:'100%',
                      minHeight:92,
                      padding:'14px 8px',
                      borderRadius:16,
                      border:`1.5px solid ${a.c}24`,
                      background:`${a.c}08`,
                      cursor:'pointer',
                      display:'flex',
                      flexDirection:'column',
                      alignItems:'center',
                      justifyContent:'center',
                      gap:8,
                      transition:'all .2s',
                      boxSizing:'border-box'
                    }}
                    onMouseOver={e=>{
                      e.currentTarget.style.background=`${a.c}18`;
                      e.currentTarget.style.borderColor=a.c;
                      e.currentTarget.style.transform='translateY(-2px)';
                      e.currentTarget.style.boxShadow=`0 6px 16px ${a.c}25`;
                    }}
                    onMouseOut={e=>{
                      e.currentTarget.style.background=`${a.c}08`;
                      e.currentTarget.style.borderColor=`${a.c}24`;
                      e.currentTarget.style.transform='translateY(0)';
                      e.currentTarget.style.boxShadow='none';
                    }}
                  >
                    <div style={{
                      width:42,
                      height:42,
                      borderRadius:13,
                      background:`${a.c}15`,
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center'
                    }}>
                      <a.icon size={22} color={a.c}/>
                    </div>
            
                    <span style={{
                      fontSize:11,
                      fontWeight:800,
                      color:a.c,
                      textAlign:'center',
                      lineHeight:1.2
                    }}>
                      {a.l}
                    </span>
                  </button>
                );
            
                return a.to
                  ? <Link key={i} to={a.to} style={{ textDecoration:'none' }} onClick={()=>setDetail(null)}>{btn}</Link>
                  : btn;
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* ══ MODAL HISTORIQUE PATIENT ══ */}
      <Modal open={!!historyFor} onClose={()=>{setHistoryFor(null);setHistory([]);}} title="" maxW={920}>
        <div style={{ margin:-28 }}>
          <div style={{
            position:'relative',
            overflow:'hidden',
            padding:'26px 30px 24px',
            background:'linear-gradient(135deg,#082F49 0%,#0D7A87 52%,#13A3B4 100%)',
            borderRadius:'22px 22px 0 0'
          }}>
            <div style={{ position:'absolute', inset:'auto -70px -110px auto', width:260, height:260, borderRadius:'50%', background:'rgba(255,255,255,.13)' }}/>
            <div style={{ position:'absolute', inset:'-80px auto auto 45%', width:190, height:190, borderRadius:'50%', background:'rgba(255,255,255,.08)' }}/>
            <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between', gap:18, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:16, minWidth:0 }}>
                {historyFor && <Avatar p={historyFor} size={64}/>}
                <div style={{ minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:6 }}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 10px', borderRadius:99, background:'rgba(255,255,255,.15)', color:'#E0F7FA', fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1.2 }}>
                      <History size={13}/> Dossier clinique
                    </span>
                    {historyFor?.patient_number && <span style={{ color:'rgba(255,255,255,.76)', fontSize:12, fontWeight:700 }}>{historyFor.patient_number}</span>}
                  </div>
                  <h2 style={{ fontFamily:'Plus Jakarta Sans', fontSize:24, fontWeight:800, color:'#fff', margin:'0 0 4px' }}>
                    {historyFor?.first_name||''} {historyFor?.last_name||''}
                  </h2>
                  <p style={{ color:'rgba(255,255,255,.78)', fontSize:13, margin:0 }}>
                    Historique patient centralisé, soins, rendez-vous et activité financière.
                  </p>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(104px,1fr))', gap:10 }}>
                {[
                  { label:'Événements', value:historySummary.total },
                  { label:'Soins', value:historySummary.care },
                  { label:'RDV', value:historySummary.appointments },
                  { label:'Documents', value:historySummary.documents },
                  { label:'Messages', value:historySummary.communications },
                  { label:'Montant', value:fmt(historySummary.amount) },
                ].map((s,i) => (
                  <div key={i} style={{ background:'rgba(255,255,255,.14)', border:'1px solid rgba(255,255,255,.22)', borderRadius:14, padding:'10px 12px', backdropFilter:'blur(10px)' }}>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,.68)', fontWeight:800, textTransform:'uppercase', letterSpacing:1 }}>{s.label}</div>
                    <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:i===5?15:20, color:'#fff', marginTop:2, whiteSpace:'nowrap' }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ background:'linear-gradient(180deg,#F8FAFC 0%,#FFFFFF 100%)', padding:'22px 30px 30px', borderRadius:'0 0 22px 22px' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:12, position:'relative' }}>
          {historyLoading ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'46px', color:'#64748B', gap:10, background:'#fff', border:'1px solid #E2E8F0', borderRadius:18 }}>
              <Loader2 size={20} style={{ animation:'spin .8s linear infinite' }}/> Chargement de l'historique...
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 24px', color:'#94A3B8', background:'#fff', border:'1px solid #E2E8F0', borderRadius:20, boxShadow:'0 10px 30px rgba(15,23,42,.06)' }}>
              <div style={{ width:58, height:58, borderRadius:18, margin:'0 auto 14px', background:'#F1F5F9', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <History size={30} color="#94A3B8"/>
              </div>
              <p style={{ margin:0, fontWeight:700, color:'#64748B' }}>Aucune action enregistrée</p>
              <p style={{ margin:'6px 0 0', fontSize:13, color:'#94A3B8' }}>Les soins, factures et rendez-vous apparaitront ici.</p>
            </div>
          ) : (
            <>
              <div style={{ position:'absolute', left:20, top:12, bottom:12, width:2, background:'linear-gradient(180deg,#0D7A87,#CBD5E1)', transformOrigin:'top', animation:'historyLine .45s ease both' }}/>
              {history.map((item, index) => {
              const tone = historyPalette(item.type);
              return (
                <div key={item.id || index} className="history-item" style={{ position:'relative', display:'flex', gap:14, padding:'16px 18px 16px 58px', borderRadius:18, border:'1px solid #E2E8F0', background:'#fff', boxShadow:'0 8px 26px rgba(15,23,42,.055)', transition:'all .2s', animationDelay:`${Math.min(index,8)*0.035}s` }}>
                  <div style={{ position:'absolute', left:3, top:16, width:36, height:36, borderRadius:13, background:tone.bg, border:`2px solid #fff`, boxShadow:`0 0 0 1px ${tone.color}30, 0 8px 18px ${tone.color}20`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <History size={16} color={tone.color}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap', marginBottom:8 }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                          <span style={{ fontSize:10, fontWeight:900, color:tone.color, textTransform:'uppercase', letterSpacing:1.1, background:tone.bg, padding:'3px 8px', borderRadius:99 }}>{item.label || tone.label}</span>
                          <span style={{ fontSize:11, color:'#94A3B8', fontWeight:700 }}>{fdatetime(item.date)}</span>
                        </div>
                        <div style={{ fontFamily:'Plus Jakarta Sans', fontSize:15, fontWeight:800, color:'#0F172A', lineHeight:1.25 }}>{item.title}</div>
                      </div>
                      {item.amount_mga > 0 && <div style={{ alignSelf:'flex-start', background:'#0F172A', color:'#fff', borderRadius:12, padding:'7px 10px', fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:13, whiteSpace:'nowrap' }}>{fmt(item.amount_mga)}</div>}
                    </div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', fontSize:11, color:'#64748B', marginBottom:item.details?9:0 }}>
                      {item.practitioner && <span style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:99, padding:'4px 8px', fontWeight:700 }}>Praticien : {item.practitioner}</span>}
                      {item.status && <span style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:99, padding:'4px 8px', fontWeight:700 }}>Statut : {item.status}</span>}
                      {item.tooth_numbers && <span style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:99, padding:'4px 8px', fontWeight:700 }}>Dent(s) : {item.tooth_numbers}</span>}
                    </div>
                    {Array.isArray(item.invoice_items) && item.invoice_items.length > 0 && (
                      <div style={{ marginBottom:item.details ? 9 : 0, border:'1px solid #E2E8F0', borderRadius:12, overflow:'hidden', background:'#fff' }}>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 68px 92px 96px', gap:8, padding:'8px 10px', background:'#F8FAFC', color:'#64748B', fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:.8 }}>
                          <span>Prestation</span>
                          <span style={{ textAlign:'center' }}>Qté</span>
                          <span style={{ textAlign:'right' }}>Prix</span>
                          <span style={{ textAlign:'right' }}>Total</span>
                        </div>
                        {item.invoice_items.map((invoiceItem, rowIndex) => (
                          <div key={invoiceItem.id || rowIndex} style={{ display:'grid', gridTemplateColumns:'1fr 68px 92px 96px', gap:8, padding:'9px 10px', borderTop:rowIndex ? '1px solid #F1F5F9' : 'none', alignItems:'center', fontSize:12, color:'#334155' }}>
                            <div style={{ minWidth:0 }}>
                              <div style={{ fontWeight:800, color:'#0F172A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{invoiceItem.description}</div>
                              {invoiceItem.tooth_number && <div style={{ color:'#94A3B8', fontSize:11, marginTop:2 }}>Dent {invoiceItem.tooth_number}</div>}
                            </div>
                            <div style={{ textAlign:'center', fontWeight:700 }}>{invoiceItem.quantity || 1}</div>
                            <div style={{ textAlign:'right', fontWeight:700 }}>{fmt(invoiceItem.unit_price_mga || 0)}</div>
                            <div style={{ textAlign:'right', fontFamily:'Plus Jakarta Sans', fontWeight:900, color:'#0F172A' }}>{fmt(invoiceItem.total_price_mga || ((invoiceItem.quantity || 1) * (invoiceItem.unit_price_mga || 0)))}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {item.details && <div style={{ fontSize:12, color:'#475569', lineHeight:1.55, background:'linear-gradient(180deg,#F8FAFC,#FFFFFF)', border:'1px solid #F1F5F9', borderRadius:12, padding:'10px 12px' }}>{item.details}</div>}
                  </div>
                </div>
              );
            })}
            </>
          )}
            </div>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL CRÉER / MODIFIER ══ */}
      <Modal open={isOpen} onClose={()=>setIsOpen(false)} title={selP ? `✏️ Modifier — ${selP.first_name} ${selP.last_name}` : '👤 Nouveau Patient'} maxW={580}>
        <PatientForm data={form} onChange={onChange} onSubmit={handleSubmit} onCancel={()=>setIsOpen(false)} submitting={saving} isEdit={!!selP}/>
      </Modal>
    </div>
  );
};

export default PatientManagement;
