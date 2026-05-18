import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../App';
import { cachedGet, CACHE_TTL } from '../utils/clientCache';
import { matchesSearch, patientSearchText, scoreSearchMatch } from '../utils/search';
import {
  Calendar, Clock, Plus, Edit2, Trash2, Download, Upload, User, X,
  AlertCircle, RefreshCw, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, MoreHorizontal, Filter, Search,
  Stethoscope, Zap, Eye, Grid, List, AlertTriangle
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const authH = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const TYPES = [
  { value:'CONSULTATION', label:'Consultation', color:'#3B82F6', bg:'#EFF6FF', icon:'🩺' },
  { value:'TREATMENT',    label:'Traitement',   color:'#10B981', bg:'#DCFCE7', icon:'🦷' },
  { value:'FOLLOW_UP',    label:'Suivi',        color:'#8B5CF6', bg:'#EDE9FE', icon:'📋' },
  { value:'EMERGENCY',    label:'Urgence',      color:'#EF4444', bg:'#FEE2E2', icon:'🚨' },
  { value:'CLEANING',     label:'Nettoyage',    color:'#06B6D4', bg:'#ECFEFF', icon:'✨' },
  { value:'CHECK_UP',     label:'Contrôle',     color:'#F59E0B', bg:'#FFFBEB', icon:'🔍' },
];

const STATUS = {
  SCHEDULED:   { l:'Planifié',   bg:'#F1F5F9', c:'#475569', dot:'#94A3B8' },
  CONFIRMED:   { l:'Confirmé',   bg:'#DCFCE7', c:'#166534', dot:'#22C55E' },
  IN_PROGRESS: { l:'En cours',   bg:'#DBEAFE', c:'#1D4ED8', dot:'#3B82F6' },
  COMPLETED:   { l:'Terminé',    bg:'#F0FDF4', c:'#166534', dot:'#16A34A' },
  CANCELLED:   { l:'Annulé',     bg:'#FEE2E2', c:'#991B1B', dot:'#EF4444' },
  NO_SHOW:     { l:'Absent',     bg:'#FEF3C7', c:'#92400E', dot:'#F59E0B' },
  RESCHEDULED: { l:'Reporté',    bg:'#FEF9C3', c:'#713F12', dot:'#EAB308' },
};

const QUICK_STATUS_NEXT = {
  SCHEDULED:   ['CONFIRMED','CANCELLED'],
  CONFIRMED:   ['IN_PROGRESS','CANCELLED','NO_SHOW'],
  IN_PROGRESS: ['COMPLETED','CANCELLED'],
  RESCHEDULED: ['CONFIRMED','CANCELLED'],
};

const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const JOURS_FR = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

const today   = () => new Date().toISOString().split('T')[0];
const fdate   = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short' }) : '—';
const fdateLong = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' }) : '—';
const getType = v => TYPES.find(t => t.value === v) || TYPES[0];

/* ── Skeleton ── */
const Skel = ({ h=16, w='100%', r=8 }) => (
  <div style={{ height:h, width:w, borderRadius:r, background:'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite' }}/>
);

/* ── Modal ── */
const Modal = ({ open, onClose, title, children, maxW=520 }) => {
  if (!open) return null;
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{ position:'fixed',inset:0,zIndex:1000,background:'rgba(15,23,42,.55)',overflowY:'auto',padding:'60px 16px 32px' }}>
      <div style={{ background:'#fff',borderRadius:22,padding:28,width:'100%',maxWidth:maxW,margin:'0 auto',boxShadow:'0 24px 64px rgba(15,23,42,.2)',border:'1px solid #E2E8F0',position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute',top:14,right:14,background:'#F8FAFC',border:'none',cursor:'pointer',padding:7,borderRadius:8,display:'flex',alignItems:'center',color:'#64748B' }}>
          <X size={15}/>
        </button>
        {title && <h2 style={{ fontFamily:'Plus Jakarta Sans',fontSize:17,fontWeight:700,color:'#0F172A',margin:'0 0 20px',paddingRight:28 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
};

/* ── Mini calendrier ── */
const MiniCalendar = ({ selectedDate, onSelect, appointments }) => {
  const [month, setMonth] = useState(() => {
    const d = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year  = month.getFullYear();
  const mon   = month.getMonth();
  const first = new Date(year, mon, 1).getDay();
  const days  = new Date(year, mon + 1, 0).getDate();
  const cells = Array.from({ length: first + days }, (_, i) => i < first ? null : i - first + 1);

  // dates avec RDV
  const apptDates = new Set(appointments.map(a => a.appointment_date));

  return (
    <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', padding:'16px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
      {/* Header mois */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <button onClick={()=>setMonth(new Date(year,mon-1,1))} style={{ background:'none',border:'none',cursor:'pointer',padding:4,borderRadius:8,color:'#64748B',display:'flex' }}><ChevronLeft size={16}/></button>
        <span style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:14, color:'#0F172A' }}>{MOIS_FR[mon]} {year}</span>
        <button onClick={()=>setMonth(new Date(year,mon+1,1))} style={{ background:'none',border:'none',cursor:'pointer',padding:4,borderRadius:8,color:'#64748B',display:'flex' }}><ChevronRight size={16}/></button>
      </div>
      {/* Jours de la semaine */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
        {JOURS_FR.map(j => <div key={j} style={{ textAlign:'center', fontSize:10, fontWeight:700, color:'#94A3B8', padding:'2px 0' }}>{j}</div>)}
      </div>
      {/* Cellules */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i}/>;
          const dateStr = `${year}-${String(mon+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isSel   = dateStr === selectedDate;
          const isToday = dateStr === today();
          const hasAppt = apptDates.has(dateStr);
          return (
            <button key={i} onClick={() => onSelect(dateStr)}
              style={{ width:'100%', aspectRatio:'1', borderRadius:8, border:'none', cursor:'pointer', fontSize:12, fontWeight:isSel||isToday?700:400, position:'relative', transition:'all .15s',
                background: isSel ? '#0D7A87' : isToday ? '#F0FDFE' : 'transparent',
                color: isSel ? '#fff' : isToday ? '#0D7A87' : '#0F172A',
              }}
              onMouseOver={e=>{if(!isSel)e.currentTarget.style.background='#F8FAFC';}}
              onMouseOut={e=>{if(!isSel)e.currentTarget.style.background=isToday?'#F0FDFE':'transparent';}}>
              {day}
              {hasAppt && !isSel && <div style={{ position:'absolute', bottom:2, left:'50%', transform:'translateX(-50%)', width:4, height:4, borderRadius:'50%', background:'#0D7A87' }}/>}
            </button>
          );
        })}
      </div>
      <button onClick={() => onSelect(today())}
        style={{ width:'100%', marginTop:10, padding:'7px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#F8FAFC', cursor:'pointer', fontSize:12, fontWeight:600, color:'#475569' }}>
        Aujourd'hui
      </button>
    </div>
  );
};

/* ── Card RDV ── */
const ApptCard = ({ a, onEdit, onDelete, onStatusChange, onExport, idx }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const type   = getType(a.appointment_type);
  const status = STATUS[a.status] || STATUS.SCHEDULED;
  const nextStatuses = QUICK_STATUS_NEXT[a.status] || [];
  const dur = (() => {
    if (!a.start_time || !a.end_time) return null;
    const [sh,sm] = a.start_time.split(':').map(Number);
    const [eh,em] = a.end_time.split(':').map(Number);
    const mins = (eh*60+em) - (sh*60+sm);
    return mins > 0 ? (mins >= 60 ? `${Math.floor(mins/60)}h${mins%60?mins%60+'min':''}` : `${mins}min`) : null;
  })();

  return (
    <div className="rdv-card" style={{ background:'#fff', borderRadius:16, border:'1.5px solid #E2E8F0', padding:'16px 18px', display:'flex', gap:14, alignItems:'flex-start', boxShadow:'0 1px 4px rgba(0,0,0,.04)', transition:'all .2s', animationDelay:`${Math.min(idx,.15)*0.05}s`, position:'relative' }}
      onMouseOver={e=>{e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.08)';e.currentTarget.style.borderColor='#CBD5E1';}}
      onMouseOut={e=>{e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.04)';e.currentTarget.style.borderColor='#E2E8F0';}}>

      {/* Barre couleur type */}
      <div style={{ width:4, borderRadius:99, background:type.color, alignSelf:'stretch', flexShrink:0, minHeight:60 }}/>

      {/* Heure */}
      <div style={{ textAlign:'center', minWidth:54, flexShrink:0 }}>
        <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:18, color:type.color, lineHeight:1 }}>{a.start_time?.slice(0,5)}</div>
        {dur && <div style={{ fontSize:10, color:'#94A3B8', marginTop:3, fontWeight:600 }}>{dur}</div>}
        <div style={{ fontSize:10, color:'#64748B', marginTop:2 }}>{a.end_time?.slice(0,5)}</div>
      </div>

      {/* Infos */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
          <span style={{ fontSize:13, fontWeight:800, color:'#0F172A', fontFamily:'Plus Jakarta Sans' }}>
            {a.patient?.first_name} {a.patient?.last_name}
          </span>
          <span style={{ background:type.bg, color:type.color, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99 }}>{type.icon} {type.label}</span>
          <span style={{ background:status.bg, color:status.c, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, display:'flex', alignItems:'center', gap:4 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:status.dot }}/>{status.l}
          </span>
        </div>
        {a.reason && <div style={{ fontSize:12, color:'#64748B', marginBottom:4 }}>📝 {a.reason}</div>}
        {a.notes  && <div style={{ fontSize:11, color:'#94A3B8', background:'#F8FAFC', borderRadius:7, padding:'4px 8px', display:'inline-block' }}>💬 {a.notes}</div>}

        {/* Boutons statut rapide */}
        {nextStatuses.length > 0 && (
          <div style={{ display:'flex', gap:5, marginTop:8, flexWrap:'wrap' }}>
            {nextStatuses.map(ns => {
              const st = STATUS[ns];
              return (
                <button key={ns} onClick={() => onStatusChange(a, ns)}
                  style={{ padding:'3px 10px', borderRadius:99, border:`1px solid ${st.dot}`, background:st.bg, color:st.c, fontSize:10, fontWeight:700, cursor:'pointer', transition:'all .15s' }}
                  onMouseOver={e=>{e.currentTarget.style.transform='scale(1.05)';}}
                  onMouseOut={e=>{e.currentTarget.style.transform='scale(1)';}}>
                  → {st.l}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display:'flex', gap:5, flexShrink:0 }}>
        <button onClick={() => onExport(a)} title="Export .ics"
          style={{ width:30, height:30, borderRadius:8, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#94A3B8', transition:'all .15s' }}
          onMouseOver={e=>{e.currentTarget.style.borderColor='#0D7A87';e.currentTarget.style.color='#0D7A87';}}
          onMouseOut={e=>{e.currentTarget.style.borderColor='#E2E8F0';e.currentTarget.style.color='#94A3B8';}}>
          <Download size={13}/>
        </button>
        <button onClick={() => onEdit(a)} title="Modifier"
          style={{ width:30, height:30, borderRadius:8, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#94A3B8', transition:'all .15s' }}
          onMouseOver={e=>{e.currentTarget.style.borderColor='#3B82F6';e.currentTarget.style.color='#3B82F6';}}
          onMouseOut={e=>{e.currentTarget.style.borderColor='#E2E8F0';e.currentTarget.style.color='#94A3B8';}}>
          <Edit2 size={13}/>
        </button>
        <button onClick={() => onDelete(a)} title="Supprimer"
          style={{ width:30, height:30, borderRadius:8, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#94A3B8', transition:'all .15s' }}
          onMouseOver={e=>{e.currentTarget.style.borderColor='#EF4444';e.currentTarget.style.color='#EF4444';}}
          onMouseOut={e=>{e.currentTarget.style.borderColor='#E2E8F0';e.currentTarget.style.color='#94A3B8';}}>
          <Trash2 size={13}/>
        </button>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════════ */
const AppointmentManagement = () => {
  const { user } = useAuth();
  const [appts,    setAppts]    = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [isOpen,   setIsOpen]   = useState(false);
  const [isDelOpen,setIsDelOpen]= useState(false);
  const [editA,    setEditA]    = useState(null);
  const [delA,     setDelA]     = useState(null);
  const [search,   setSearch]   = useState('');
  const [statusF,  setStatusF]  = useState('all');
  const [typeF,    setTypeF]    = useState('all');
  const [selDate,  setSelDate]  = useState(today());
  const [viewMode, setView]     = useState('day'); // day | week | all
  const [showCal,  setShowCal]  = useState(true);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);
  const canImportAppointments = ['ADMIN', 'DENTIST', 'ASSISTANT'].includes(user?.role);

  const [form, setForm] = useState({
    patient_id:'', dentist_id:'',
    appointment_date: today(), start_time:'09:00', end_time:'10:00',
    appointment_type:'CONSULTATION', reason:'', notes:''
  });

  const inp = { width:'100%', padding:'9px 12px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:13, fontFamily:'inherit', outline:'none', transition:'border-color .2s' };
  const fi  = e => e.target.style.borderColor = '#0D7A87';
  const bi  = e => e.target.style.borderColor = '#E2E8F0';

  /* Plage de dates selon viewMode */
  const dateRange = useCallback(() => {
    if (viewMode === 'day') return { from: selDate, to: selDate };
    if (viewMode === 'week') {
      const d = new Date(selDate + 'T00:00:00');
      const dow = d.getDay();
      const mon = new Date(d); mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { from: mon.toISOString().split('T')[0], to: sun.toISOString().split('T')[0] };
    }
    const d = new Date();
    const from = new Date(d); from.setMonth(d.getMonth() - 1);
    const to   = new Date(d); to.setMonth(d.getMonth() + 3);
    return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
  }, [selDate, viewMode]);

  const fetchAppts = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = dateRange();
      let url = `${API}/appointments?date_from=${from}&date_to=${to}`;
      if (statusF !== 'all') url += `&status=${statusF}`;
      const r = await axios.get(url, authH());
      setAppts(r.data.appointments || []);
    } catch (e) { if (!axios.isCancel(e)) toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  }, [dateRange, statusF]);

  const fetchPatients = async () => {
    try {
      const r = await cachedGet(`${API}/patients?limit=500&fields=lookup&includeTotal=false`, authH(), { ttl: CACHE_TTL.medium });
      const list = r.data.patients || r.data.data || (Array.isArray(r.data) ? r.data : []);
      setPatients(list);
    } catch (e) {
      console.error('fetchPatients error:', e?.response?.data || e.message);
    }
  };

  useEffect(() => { fetchAppts(); fetchPatients(); }, [fetchAppts]);

  const resetForm = () => setForm({ patient_id:'', dentist_id: user?.id||'', appointment_date: selDate, start_time:'09:00', end_time:'10:00', appointment_type:'CONSULTATION', reason:'', notes:'' });

  const openCreate = () => { setEditA(null); resetForm(); setIsOpen(true); };
  const openEdit   = a  => { setEditA(a); setForm({ patient_id:a.patient_id, dentist_id:a.dentist_id||'', appointment_date:a.appointment_date, start_time:a.start_time, end_time:a.end_time, appointment_type:a.appointment_type, reason:a.reason||'', notes:a.notes||'' }); setIsOpen(true); };

  const handleSubmit = async e => {
    e.preventDefault();
    const sm = form.start_time.split(':').reduce((a,t)=>60*a+parseInt(t),0);
    const em = form.end_time.split(':').reduce((a,t)=>60*a+parseInt(t),0);
    if (em <= sm) { toast.error("L'heure de fin doit être après le début"); return; }
    try {
      const p = { ...form }; if (!p.dentist_id) delete p.dentist_id;
      if (editA) await axios.put(`${API}/appointments/${editA.id}`, p, authH());
      else       await axios.post(`${API}/appointments`, p, authH());
      toast.success(editA ? 'RDV modifié !' : 'RDV créé !');
      setIsOpen(false); fetchAppts();
    } catch (e) { toast.error(e.response?.data?.error || 'Erreur'); }
  };

  const handleDelete = async () => {
    if (!delA) return;
    try {
      await axios.delete(`${API}/appointments/${delA.id}`, authH());
      toast.success('RDV supprimé'); setIsDelOpen(false); setDelA(null); fetchAppts();
    } catch (e) { toast.error(e.response?.data?.error || 'Erreur'); }
  };

  const handleStatusChange = async (a, newStatus) => {
    try {
      await axios.patch(`${API}/appointments/${a.id}/status`, { status: newStatus }, authH());
      toast.success(`Statut → ${STATUS[newStatus]?.l}`);
      fetchAppts();
    } catch { toast.error('Erreur mise à jour statut'); }
  };

  const handleExport = async a => {
    try {
      const r = await axios.get(`${API}/appointments/${a.id}/export-calendar`, { responseType:'blob', ...authH() });
      const url = window.URL.createObjectURL(new Blob([r.data], { type:'text/calendar' }));
      const el  = document.createElement('a'); el.href=url; el.download=`rdv-${a.appointment_date}.ics`;
      document.body.appendChild(el); el.click(); document.body.removeChild(el);
      window.URL.revokeObjectURL(url); toast.success('Calendrier exporté');
    } catch { toast.error('Erreur export'); }
  };

  const downloadCsvTemplate = () => {
    const header = [
      'patient_number',
      'patient_phone_primary',
      'patient_email',
      'appointment_date',
      'start_time',
      'end_time',
      'appointment_type',
      'status',
      'reason',
      'notes',
      'chair_number',
      'dentist_email',
      'dentist_name'
    ].join(',');

    const sample = [
      'PAT-000001',
      '0340000000',
      'jean@example.com',
      '2026-05-06',
      '09:00',
      '09:30',
      'CONSULTATION',
      'SCHEDULED',
      'Contrôle annuel',
      'Premier RDV importé',
      '1',
      'dr.rakoto@example.com',
      'Dr Rakoto'
    ].join(',');

    const blob = new Blob([`${header}\n${sample}\n`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modele_import_rendez_vous.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleImportCsv = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setImporting(true);
    try {
      const response = await axios.post(`${API}/appointments/import-csv`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const inserted = response.data.inserted || 0;
      const updated = response.data.updated || 0;
      const skipped = response.data.skipped || 0;
      toast.success(`Import terminé: ${inserted} créés, ${updated} mis à jour, ${skipped} ignorés`);
      fetchAppts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'import CSV');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  /* Filtrage + recherche */
  const activeSearch = search.trim();
  const filtered = appts
    .filter(a => {
      const mt = typeF === 'all' || a.appointment_type === typeF;
      const mq = matchesSearch(search, patientSearchText(a.patient || {}), a.reason, a.appointment_type, a.status);
      return mt && mq;
    })
    .sort((a, b) => activeSearch
      ? scoreSearchMatch(activeSearch, patientSearchText(b.patient || {}), b.reason, b.appointment_type, b.status)
        - scoreSearchMatch(activeSearch, patientSearchText(a.patient || {}), a.reason, a.appointment_type, a.status)
      : 0);

  /* Stats */
  const todayAppts  = appts.filter(a => a.appointment_date === today());
  const confirmedN  = appts.filter(a => a.status === 'CONFIRMED').length;
  const completedN  = appts.filter(a => a.status === 'COMPLETED').length;
  const cancelledN  = appts.filter(a => a.status === 'CANCELLED').length;

  /* Grouper par date pour vue all/week */
  const grouped = filtered.reduce((acc, a) => {
    if (!acc[a.appointment_date]) acc[a.appointment_date] = [];
    acc[a.appointment_date].push(a);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort();

  /* Navigation jour */
  const prevDay = () => { const d = new Date(selDate + 'T00:00:00'); d.setDate(d.getDate()-1); setSelDate(d.toISOString().split('T')[0]); };
  const nextDay = () => { const d = new Date(selDate + 'T00:00:00'); d.setDate(d.getDate()+1); setSelDate(d.toISOString().split('T')[0]); };

  return (
    <div style={{ maxWidth: 1200, margin:'0 auto', paddingBottom:48 }}>
      <style>{`
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .rdv-card{animation:fadeUp .35s ease both}
      `}</style>

      {/* ── En-tête ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:13, background:'linear-gradient(135deg,#8B5CF6,#7C3AED)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(139,92,246,.3)' }}>
            <Calendar size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:22, color:'#0F172A', margin:0 }}>Rendez-vous</h1>
            <p style={{ color:'#64748B', fontSize:13, margin:0 }}>{appts.length} RDV · {todayAppts.length} aujourd'hui</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={fetchAppts} style={{ padding:'8px 13px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:13, fontWeight:600, color:'#475569' }}>
            <RefreshCw size={13}/>
          </button>
          <button onClick={downloadCsvTemplate} style={{ padding:'9px 18px', borderRadius:10, background:'#fff', color:'#7C3AED', border:'1.5px solid #C4B5FD', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:14, fontWeight:700 }}>
            <Download size={15}/>Modèle CSV
          </button>
          {canImportAppointments && (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleImportCsv}
                style={{ display:'none' }}
              />
              <button
                onClick={() => importInputRef.current?.click()}
                disabled={importing}
                style={{ padding:'9px 18px', borderRadius:10, background:'linear-gradient(135deg,#8B5CF6,#7C3AED)', color:'#fff', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:14, fontWeight:700, boxShadow:'0 4px 14px rgba(124,58,237,.25)', opacity: importing ? .75 : 1 }}
              >
                <Upload size={15}/>{importing ? 'Import en cours' : 'Importer CSV'}
              </button>
            </>
          )}
          <button onClick={openCreate}
            style={{ padding:'9px 18px', borderRadius:10, background:'linear-gradient(135deg,#8B5CF6,#7C3AED)', color:'#fff', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:14, fontWeight:700, boxShadow:'0 4px 14px rgba(139,92,246,.3)' }}>
            <Plus size={15}/>Nouveau RDV
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { icon:'📅', l:"Aujourd'hui",  v:todayAppts.length,  c:'#8B5CF6', bg:'#EDE9FE' },
          { icon:'✅', l:'Confirmés',     v:confirmedN,          c:'#10B981', bg:'#DCFCE7' },
          { icon:'🏁', l:'Terminés',      v:completedN,          c:'#0D7A87', bg:'#F0FDFE' },
          { icon:'❌', l:'Annulés',       v:cancelledN,          c:'#EF4444', bg:'#FEE2E2' },
          { icon:'📋', l:'Total période', v:appts.length,        c:'#F59E0B', bg:'#FFFBEB' },
        ].map((k,i) => (
          <div key={i} style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'14px 16px', display:'flex', alignItems:'center', gap:11 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:k.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{k.icon}</div>
            <div>
              <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:20, color:'#0F172A', lineHeight:1 }}>{k.v}</div>
              <div style={{ fontSize:11, color:'#64748B', marginTop:2 }}>{k.l}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Contenu principal : calendrier + liste ── */}
      <div style={{ display:'grid', gridTemplateColumns: showCal ? '240px 1fr' : '1fr', gap:16, alignItems:'start' }}>

        {/* Mini calendrier */}
        {showCal && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <MiniCalendar selectedDate={selDate} onSelect={d=>{setSelDate(d);setView('day');}} appointments={appts}/>
            {/* Types légende */}
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'14px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:1.5, marginBottom:10 }}>Types</div>
              {TYPES.map(t => (
                <button key={t.value} onClick={() => setTypeF(typeF===t.value?'all':t.value)}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'6px 8px', borderRadius:8, border:'none', cursor:'pointer', marginBottom:3, background:typeF===t.value?t.bg:'transparent', transition:'all .15s' }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:t.color, flexShrink:0 }}/>
                  <span style={{ fontSize:12, fontWeight:typeF===t.value?700:500, color:typeF===t.value?t.color:'#475569' }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Zone principale */}
        <div>
          {/* Barre de navigation + filtres */}
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'12px 16px', marginBottom:14, display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            {/* Toggle calendrier */}
            <button onClick={()=>setShowCal(s=>!s)}
              style={{ padding:'6px 10px', borderRadius:8, border:'1.5px solid #E2E8F0', background:showCal?'#EDE9FE':'#fff', color:showCal?'#7C3AED':'#64748B', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:600 }}>
              <Calendar size={13}/>
            </button>

            {/* Vue mode */}
            <div style={{ display:'flex', gap:3, background:'#F8FAFC', borderRadius:9, padding:3 }}>
              {[['day','Jour'],['week','Semaine'],['all','Tout']].map(([k,l])=>(
                <button key={k} onClick={()=>setView(k)}
                  style={{ padding:'5px 12px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:viewMode===k?'#fff':'transparent', color:viewMode===k?'#8B5CF6':'#64748B', boxShadow:viewMode===k?'0 1px 4px rgba(0,0,0,.08)':'none', transition:'all .15s' }}>
                  {l}
                </button>
              ))}
            </div>

            {/* Navigation date (jour/semaine) */}
            {viewMode !== 'all' && (
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <button onClick={prevDay} style={{ width:28, height:28, borderRadius:8, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748B' }}><ChevronLeft size={14}/></button>
                <span style={{ fontSize:13, fontWeight:700, color:'#0F172A', whiteSpace:'nowrap' }}>
                  {viewMode==='day' ? fdateLong(selDate) : `Semaine du ${fdate(dateRange().from)}`}
                </span>
                <button onClick={nextDay} style={{ width:28, height:28, borderRadius:8, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748B' }}><ChevronRight size={14}/></button>
              </div>
            )}

            {/* Recherche */}
            <div style={{ display:'flex', alignItems:'center', gap:7, flex:1, minWidth:160, background:'#F8FAFC', borderRadius:9, padding:'6px 12px', border:'1px solid #E2E8F0' }}>
              <Search size={13} color="#94A3B8"/>
              <input placeholder="Rechercher patient, motif..." value={search} onChange={e=>setSearch(e.target.value)}
                style={{ border:'none', background:'transparent', outline:'none', fontSize:12, flex:1 }}/>
              {search && <button onClick={()=>setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#94A3B8', padding:0 }}><X size={12}/></button>}
            </div>

            {/* Filtre statut */}
            <select value={statusF} onChange={e=>setStatusF(e.target.value)}
              style={{ padding:'6px 10px', borderRadius:9, border:'1.5px solid #E2E8F0', background:'#fff', fontSize:12, fontWeight:600, color:'#475569', cursor:'pointer', outline:'none' }}>
              <option value="all">Tous statuts</option>
              {Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.l}</option>)}
            </select>

            <span style={{ fontSize:11, color:'#94A3B8', whiteSpace:'nowrap' }}>{filtered.length} RDV</span>
          </div>

          {/* Liste RDV */}
          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {Array(4).fill(0).map((_,i) => <Skel key={i} h={86} r={16}/>)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ background:'#fff', borderRadius:18, border:'1px solid #E2E8F0', padding:'52px', textAlign:'center' }}>
              <Calendar size={40} style={{ margin:'0 auto 14px', color:'#CBD5E1' }}/>
              <p style={{ fontWeight:700, color:'#475569', fontSize:15, margin:'0 0 6px' }}>Aucun rendez-vous</p>
              <p style={{ color:'#94A3B8', fontSize:13, margin:'0 0 18px' }}>
                {viewMode==='day' ? `Aucun RDV pour le ${fdateLong(selDate)}` : 'Aucun RDV sur cette période'}
              </p>
              <button onClick={openCreate} style={{ padding:'10px 22px', borderRadius:11, background:'linear-gradient(135deg,#8B5CF6,#7C3AED)', color:'#fff', border:'none', cursor:'pointer', fontSize:14, fontWeight:700 }}>
                Créer un RDV
              </button>
            </div>
          ) : viewMode === 'day' ? (
            /* ── Vue JOUR : timeline ── */
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, padding:'10px 16px', background:'linear-gradient(135deg,#EDE9FE,#F5F3FF)', borderRadius:12, border:'1px solid #DDD6FE' }}>
                <Calendar size={15} color="#7C3AED"/>
                <span style={{ fontWeight:700, fontSize:13, color:'#5B21B6' }}>{fdateLong(selDate)}</span>
                <span style={{ fontSize:12, color:'#8B5CF6', marginLeft:'auto' }}>{filtered.length} rendez-vous</span>
              </div>
              {filtered.sort((a,b)=>(a.start_time||'').localeCompare(b.start_time||'')).map((a,i)=>(
                <div key={a.id} style={{ marginBottom:10 }}>
                  <ApptCard a={a} idx={i} onEdit={openEdit} onDelete={d=>{setDelA(d);setIsDelOpen(true);}} onStatusChange={handleStatusChange} onExport={handleExport}/>
                </div>
              ))}
            </div>
          ) : (
            /* ── Vue SEMAINE / TOUT : groupé par date ── */
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              {sortedDates.map(date => (
                <div key={date}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                    <div style={{ height:1, flex:1, background:'#E2E8F0' }}/>
                    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 14px', background: date === today() ? '#EDE9FE' : '#F8FAFC', borderRadius:99, border:`1px solid ${date===today()?'#DDD6FE':'#E2E8F0'}` }}>
                      {date === today() && <div style={{ width:6, height:6, borderRadius:'50%', background:'#7C3AED' }}/>}
                      <span style={{ fontSize:12, fontWeight:700, color: date===today()?'#7C3AED':'#64748B' }}>{fdateLong(date)}</span>
                      <span style={{ fontSize:11, color:'#94A3B8' }}>{grouped[date].length} RDV</span>
                    </div>
                    <div style={{ height:1, flex:1, background:'#E2E8F0' }}/>
                  </div>
                  {grouped[date].sort((a,b)=>(a.start_time||'').localeCompare(b.start_time||'')).map((a,i)=>(
                    <div key={a.id} style={{ marginBottom:8 }}>
                      <ApptCard a={a} idx={i} onEdit={openEdit} onDelete={d=>{setDelA(d);setIsDelOpen(true);}} onStatusChange={handleStatusChange} onExport={handleExport}/>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ MODAL CRÉER / MODIFIER ══ */}
      <Modal open={isOpen} onClose={()=>setIsOpen(false)} title={editA ? '✏️ Modifier le rendez-vous' : '📅 Nouveau rendez-vous'} maxW={520}>
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Patient */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:5 }}>Patient *</label>
            <select value={form.patient_id} onChange={e=>setForm({...form,patient_id:e.target.value})} style={inp} onFocus={fi} onBlur={bi} required>
              <option value="">Sélectionner un patient...</option>
              {patients.map(p=><option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
            </select>
          </div>

          {/* Type */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:8 }}>Type de rendez-vous *</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
              {TYPES.map(t => (
                <button key={t.value} type="button" onClick={()=>setForm({...form,appointment_type:t.value})}
                  style={{ padding:'8px 6px', borderRadius:10, border:`2px solid ${form.appointment_type===t.value?t.color:'#E2E8F0'}`, background:form.appointment_type===t.value?t.bg:'#fff', cursor:'pointer', fontSize:11, fontWeight:700, color:form.appointment_type===t.value?t.color:'#475569', transition:'all .15s', textAlign:'center' }}>
                  <div style={{ fontSize:16, marginBottom:3 }}>{t.icon}</div>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date + heures */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:5 }}>Date *</label>
              <input type="date" value={form.appointment_date} onChange={e=>setForm({...form,appointment_date:e.target.value})} style={inp} onFocus={fi} onBlur={bi} required/>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:5 }}>Début *</label>
              <input type="time" value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value})} style={inp} onFocus={fi} onBlur={bi} required/>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:5 }}>Fin *</label>
              <input type="time" value={form.end_time} onChange={e=>setForm({...form,end_time:e.target.value})} style={inp} onFocus={fi} onBlur={bi} required/>
            </div>
            {/* Durée calculée */}
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 12px', background:'#F8FAFC', borderRadius:10, border:'1px solid #E2E8F0' }}>
              <Clock size={12} color="#8B5CF6"/>
              <span style={{ fontSize:12, fontWeight:700, color:'#8B5CF6' }}>
                {(() => {
                  const sm = form.start_time.split(':').reduce((a,t)=>60*a+parseInt(t),0);
                  const em = form.end_time.split(':').reduce((a,t)=>60*a+parseInt(t),0);
                  const mins = em - sm;
                  if (mins <= 0) return '—';
                  return mins >= 60 ? `${Math.floor(mins/60)}h${mins%60?mins%60+'min':''}` : `${mins}min`;
                })()}
              </span>
            </div>
          </div>

          {/* Motif */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:5 }}>Motif</label>
            <input value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} placeholder="Ex: Douleur molaire, détartrage..." style={inp} onFocus={fi} onBlur={bi}/>
          </div>

          {/* Notes */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:5 }}>Notes internes</label>
            <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} placeholder="Instructions pour le praticien..." style={{ ...inp, resize:'vertical' }} onFocus={fi} onBlur={bi}/>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:8, borderTop:'1px solid #F1F5F9' }}>
            <button type="button" onClick={()=>setIsOpen(false)} style={{ padding:'9px 18px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, color:'#475569' }}>Annuler</button>
            <button type="submit" style={{ padding:'9px 22px', borderRadius:10, background:'linear-gradient(135deg,#8B5CF6,#7C3AED)', color:'#fff', border:'none', cursor:'pointer', fontSize:14, fontWeight:700, display:'flex', alignItems:'center', gap:7 }}>
              {editA ? <><Edit2 size={14}/>Modifier</> : <><Plus size={14}/>Créer le RDV</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* ══ MODAL SUPPRESSION ══ */}
      <Modal open={isDelOpen} onClose={()=>setIsDelOpen(false)} title="🗑️ Supprimer le rendez-vous" maxW={420}>
        <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:12, padding:'14px 16px', marginBottom:18, display:'flex', gap:10, alignItems:'center' }}>
          <AlertCircle size={18} color="#EF4444"/>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:'#991B1B', marginBottom:2 }}>{delA?.patient?.first_name} {delA?.patient?.last_name}</div>
            <div style={{ fontSize:12, color:'#B91C1C' }}>{fdateLong(delA?.appointment_date)} · {delA?.start_time} - {delA?.end_time}</div>
          </div>
        </div>
        <p style={{ fontSize:13, color:'#64748B', marginBottom:18 }}>Cette action est irréversible. Le rendez-vous sera définitivement supprimé.</p>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={()=>setIsDelOpen(false)} style={{ padding:'9px 18px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, color:'#475569' }}>Annuler</button>
          <button onClick={handleDelete} style={{ padding:'9px 20px', borderRadius:10, background:'#EF4444', color:'#fff', border:'none', cursor:'pointer', fontSize:14, fontWeight:700, display:'flex', alignItems:'center', gap:7 }}>
            <Trash2 size={14}/>Supprimer
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default AppointmentManagement;
