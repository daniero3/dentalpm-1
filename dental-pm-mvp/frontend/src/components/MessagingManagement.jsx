import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { matchesSearch, patientSearchText, scoreSearchMatch } from '../utils/search';
import {
  Mail, MessageSquare, Plus, Send, Clock, CheckCircle, XCircle,
  Calendar, Cake, RefreshCw, Users, FileText, X, Zap, BarChart2,
  Edit2, ToggleLeft, ToggleRight, Search, Filter, Eye, Copy,
  AlertCircle, ChevronRight, Smartphone, AtSign, Sparkles, Bell
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const authH = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const fdate = d => d ? new Date(d).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
const fdateShort = d => d ? new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—';

const C = { purple:'#7C3AED', teal:'#0D7A87', amber:'#F59E0B', green:'#10B981', red:'#EF4444', blue:'#3B82F6', slate:'#64748B' };

const TEMPLATE_KEYS = [
  { key:'APPT_REMINDER_24H', label:'Rappel RDV 24h',      icon:'📅', color:C.blue,   desc:'Envoyé automatiquement 24h avant chaque RDV' },
  { key:'BIRTHDAY',          label:'Anniversaire',         icon:'🎂', color:C.purple, desc:'Envoyé le jour de l\'anniversaire du patient' },
  { key:'WELCOME',           label:'Bienvenue',            icon:'👋', color:C.teal,   desc:'Envoyé lors de la première visite' },
  { key:'APPT_REMINDER_1H',  label:'Rappel RDV 1h',       icon:'⏰', color:C.amber,  desc:'Rappel envoyé 1h avant le rendez-vous' },
  { key:'INVOICE_DUE',       label:'Facture impayée',      icon:'💰', color:C.red,    desc:'Rappel pour les factures en retard de paiement' },
  { key:'CUSTOM',            label:'Message personnalisé', icon:'✏️', color:C.slate,  desc:'Template libre pour des communications spéciales' },
];

const MSG_STATUS = {
  QUEUED:  { bg:'#FFFBEB', c:'#B45309', dot:'#F59E0B', l:'En attente' },
  SENT:    { bg:'#DCFCE7', c:'#166534', dot:'#22C55E', l:'Envoyé' },
  FAILED:  { bg:'#FEE2E2', c:'#991B1B', dot:'#EF4444', l:'Échoué' },
  PENDING: { bg:'#EFF6FF', c:'#1D4ED8', dot:'#3B82F6', l:'Planifié' },
};

const CHANNEL_INFO = {
  SMS:   { icon: Smartphone, color: C.blue,   bg:'#EFF6FF', label:'SMS' },
  EMAIL: { icon: AtSign,     color: C.purple,  bg:'#EDE9FE', label:'Email' },
};

const PLACEHOLDERS = ['{patient_name}', '{date}', '{time}', '{clinic_name}', '{amount}'];

/* ── Modal ── */
const Modal = ({ open, onClose, title, children, maxW = 500 }) => {
  if (!open) return null;
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(15,23,42,.55)', overflowY:'auto', padding:'60px 16px 32px' }}>
      <div style={{ background:'#fff', borderRadius:20, padding:28, width:'100%', maxWidth:maxW, margin:'0 auto', boxShadow:'0 24px 64px rgba(15,23,42,.2)', border:'1px solid #E2E8F0', position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'#F8FAFC', border:'none', cursor:'pointer', padding:7, borderRadius:8, display:'flex', alignItems:'center', color:'#64748B' }}>
          <X size={15}/>
        </button>
        {title && <h2 style={{ fontFamily:'Plus Jakarta Sans', fontSize:17, fontWeight:700, color:'#0F172A', margin:'0 0 20px', paddingRight:28 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
};

/* ── Preview SMS ── */
const SMSPreview = ({ text }) => (
  <div style={{ background:'#F0F2F5', borderRadius:16, padding:16, maxWidth:280 }}>
    <div style={{ background:'#fff', borderRadius:12, padding:'10px 14px', boxShadow:'0 1px 4px rgba(0,0,0,.08)' }}>
      <div style={{ fontSize:11, fontWeight:700, color:'#3B82F6', marginBottom:4 }}>DPM Madagascar</div>
      <div style={{ fontSize:13, color:'#1F2937', lineHeight:1.6 }}>{text || 'Aperçu du message...'}</div>
    </div>
    <div style={{ fontSize:10, color:'#94A3B8', textAlign:'right', marginTop:4 }}>Maintenant · Délivré ✓✓</div>
  </div>
);

/* ════════════════════════════════════════════════════════════════════════════ */
const MessagingManagement = () => {
  const [templates, setTemplates] = useState([]);
  const [queue,     setQueue]     = useState([]);
  const [logs,      setLogs]      = useState([]);
  const [stats,     setStats]     = useState({ QUEUED:0, SENT:0, FAILED:0 });
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('dashboard');
  const [search,    setSearch]    = useState('');
  const [logFilter, setLogFilter] = useState('ALL');
  const [isNewTpl,  setIsNewTpl]  = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [previewTpl,setPreviewTpl]= useState(null);
  const [editTpl,   setEditTpl]   = useState(null);
  const [dispatching,setDisp]     = useState(false);
  const [sendModal,  setSendModal] = useState(false);
  const [sendForm,   setSendForm]  = useState({ phone: '', message: '', patient_name: '' });
  const [sending,    setSending]   = useState(false);
  const [tplForm,   setTplForm]   = useState({ key:'APPT_REMINDER_24H', channel:'SMS', text:'' });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchTemplates(), fetchQueue(), fetchLogs()]);
    setLoading(false);
  };
  const fetchTemplates = async () => {
    try { const r = await axios.get(`${API}/messaging/templates`, authH()); setTemplates(r.data.templates || []); } catch { setTemplates([]); }
  };
  const fetchQueue = async () => {
    try { const r = await axios.get(`${API}/messaging/queue`, authH()); setQueue(r.data.queue || []); setStats(r.data.stats || { QUEUED:0, SENT:0, FAILED:0 }); } catch { setQueue([]); }
  };
  const fetchLogs = async () => {
    try { const r = await axios.get(`${API}/messaging/logs`, authH()); setLogs(r.data.logs || []); } catch { setLogs([]); }
  };

  const handleCreateTemplate = async () => {
    if (!tplForm.key || !tplForm.text.trim()) { toast.error('Clé et texte requis'); return; }
    try {
      let resp;
      if (editTpl) {
        resp = await axios.patch(`${API}/messaging/templates/${editTpl.id}`, tplForm, authH());
        toast.success('Template mis à jour');
      } else {
        resp = await axios.post(`${API}/messaging/templates`, tplForm, authH());
        // 200 = upsert (mis à jour), 201 = créé
        toast.success(resp.status === 200 ? 'Template mis à jour (existant)' : '✅ Template créé');
      }
      setIsNewTpl(false); setEditTpl(null); setTplForm({ key:'APPT_REMINDER_24H', channel:'SMS', text:'' });
      fetchTemplates();
    } catch (e) {
      const msg = e.response?.data?.details || e.response?.data?.error || 'Erreur serveur';
      toast.error(`Erreur : ${msg}`);
      console.error('Template error:', e.response?.data);
    }
  };

  const handleToggleTemplate = async (tpl) => {
    try {
      await axios.patch(`${API}/messaging/templates/${tpl.id}`, { is_active: !tpl.is_active }, authH());
      toast.success(tpl.is_active ? 'Template désactivé' : 'Template activé');
      fetchTemplates();
    } catch { toast.error('Erreur mise à jour'); }
  };

  const handleBirthday = async () => {
    try { const r = await axios.post(`${API}/messaging/run-birthday`, {}, authH()); toast.success(`🎂 ${r.data.messages_created} message(s) d'anniversaire créé(s)`); fetchQueue(); }
    catch { toast.error('Erreur job anniversaire'); }
  };

  const handleDispatch = async () => {
    setDisp(true);
    try { const r = await axios.post(`${API}/messaging/run-dispatch`, {}, authH()); toast.success(`🚀 ${r.data.sent} envoyé(s) · ${r.data.failed} échoué(s)`); fetchQueue(); fetchLogs(); }
    catch { toast.error('Erreur dispatch'); }
    finally { setDisp(false); }
  };

  const copyText = text => { navigator.clipboard.writeText(text); toast.success('Copié !'); };

  const handleSendManual = async () => {
    if (!sendForm.phone.trim() || !sendForm.message.trim()) {
      toast.error('Numero et message requis');
      return;
    }
    setSending(true);
    try {
      await axios.post(
        API + '/messaging/send-direct',
        {
          to: sendForm.phone,
          text: sendForm.message,
          channel: 'SMS'
        },
        authH()
      );
      toast.success('Message envoye');
      setSendModal(false);
      setSendForm({ phone: '', message: '', patient_name: '' });
      fetchLogs();
    } catch (err) {
      toast.info('Erreur envoi');
      setSendModal(false);
    } finally {
      setSending(false);
    }
  };

  const openEdit = tpl => {
    setEditTpl(tpl);
    setTplForm({ key:tpl.key, channel:tpl.channel, text:tpl.text });
    setIsNewTpl(true);
  };

  const activeSearch = search.trim();
  const filteredLogs = logs
    .filter(l => {
      const ms = logFilter === 'ALL' || l.status === logFilter;
      const mt = matchesSearch(search, patientSearchText(l.patient || {}), l.to, l.status, l.channel, l.message_type);
      return ms && mt;
    })
    .sort((a, b) => activeSearch
      ? scoreSearchMatch(activeSearch, patientSearchText(b.patient || {}), b.to, b.status, b.channel, b.message_type)
        - scoreSearchMatch(activeSearch, patientSearchText(a.patient || {}), a.to, a.status, a.channel, a.message_type)
      : 0);

  const filteredQueue = queue
    .filter(q =>
      matchesSearch(search, patientSearchText(q.patient || {}), q.to, q.status, q.channel, q.message_type)
    )
    .sort((a, b) => activeSearch
      ? scoreSearchMatch(activeSearch, patientSearchText(b.patient || {}), b.to, b.status, b.channel, b.message_type)
        - scoreSearchMatch(activeSearch, patientSearchText(a.patient || {}), a.to, a.status, a.channel, a.message_type)
      : 0);

  const inp = { width:'100%', padding:'9px 12px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:13, fontFamily:'inherit', outline:'none', transition:'border-color .2s' };
  const fi = e => e.target.style.borderColor = C.purple;
  const bi = e => e.target.style.borderColor = '#E2E8F0';

  const sentRate = (stats.SENT + stats.FAILED) > 0 ? Math.round((stats.SENT / (stats.SENT + stats.FAILED)) * 100) : 0;

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:240 }}>
      <div style={{ width:36, height:36, border:`4px solid #E9D5FF`, borderTopColor:C.purple, borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin:'0 auto', paddingBottom:48 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.msg-anim{animation:fadeUp .35s ease both}`}</style>

      {/* ── En-tête ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:13, background:`linear-gradient(135deg,${C.purple},#9333EA)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Mail size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:22, color:'#0F172A', margin:0 }}>Mailing & SMS</h1>
            <p style={{ color:'#64748B', fontSize:13, margin:0 }}>Rappels automatiques · {templates.length} templates · {stats.QUEUED} en attente</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={fetchAll} style={{ padding:'8px 14px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:600, color:'#475569' }}>
            <RefreshCw size={13}/>Actualiser
          </button>
          <button onClick={handleBirthday} style={{ padding:'8px 14px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:600, color:C.purple }}>
            <Cake size={13}/>Anniversaires
          </button>
          <button onClick={handleDispatch} disabled={dispatching}
            style={{ padding:'9px 18px', borderRadius:10, background:`linear-gradient(135deg,${C.purple},#9333EA)`, color:'#fff', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:14, fontWeight:700, boxShadow:`0 4px 14px rgba(124,58,237,.3)`, opacity:dispatching?.7:1 }}>
            {dispatching ? <div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .8s linear infinite' }}/> : <Send size={14}/>}
            Envoyer maintenant
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="msg-anim" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { icon:'⏳', l:'En attente',    v:stats.QUEUED,      c:C.amber,  bg:'#FFFBEB' },
          { icon:'✅', l:'Envoyés',        v:stats.SENT,        c:C.green,  bg:'#DCFCE7' },
          { icon:'❌', l:'Échoués',        v:stats.FAILED,      c:C.red,    bg:'#FEE2E2' },
          { icon:'📝', l:'Templates',      v:templates.length,  c:C.purple, bg:'#EDE9FE' },
          { icon:'📊', l:'Taux de succès', v:`${sentRate}%`,    c:C.teal,   bg:'#F0FDFE', raw:true },
        ].map((k,i) => (
          <div key={i} style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'15px 16px', display:'flex', alignItems:'center', gap:11 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:k.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{k.icon}</div>
            <div>
              <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:18, color:'#0F172A' }}>{k.raw?k.v:k.v}</div>
              <div style={{ fontSize:11, color:'#64748B' }}>{k.l}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Barre de progression succès ── */}
      <div className="msg-anim" style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'14px 18px', marginBottom:20, display:'flex', alignItems:'center', gap:14, animationDelay:'.05s' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <BarChart2 size={16} color={C.teal}/>
          <span style={{ fontSize:13, fontWeight:600, color:'#0F172A' }}>Taux de délivrance</span>
        </div>
        <div style={{ flex:1, height:8, background:'#F1F5F9', borderRadius:99, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${sentRate}%`, background:`linear-gradient(90deg,${C.teal},${C.green})`, borderRadius:99, transition:'width .8s ease' }}/>
        </div>
        <span style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:16, color:sentRate > 80 ? C.green : sentRate > 50 ? C.amber : C.red, flexShrink:0 }}>{sentRate}%</span>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'#F8FAFC', borderRadius:12, padding:4, border:'1px solid #E2E8F0' }}>
        {[
          { k:'dashboard', l:'📊 Aperçu',                n:null },
          { k:'queue',     l:'⏳ File d\'attente',         n:queue.length },
          { k:'templates', l:'📝 Templates',              n:templates.length },
          { k:'logs',      l:'📜 Historique',             n:logs.length },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            style={{ flex:1, padding:'9px 6px', borderRadius:9, border:'none', cursor:'pointer', fontWeight:600, fontSize:12, transition:'all .2s', background:tab===t.k?'#fff':'transparent', color:tab===t.k?C.purple:'#64748B', boxShadow:tab===t.k?'0 1px 6px rgba(0,0,0,.08)':'none' }}>
            {t.l}
            {t.n !== null && <span style={{ background:tab===t.k?'#EDE9FE':'#E2E8F0', color:tab===t.k?C.purple:'#94A3B8', borderRadius:99, padding:'1px 7px', fontSize:10, fontWeight:700, marginLeft:4 }}>{t.n}</span>}
          </button>
        ))}
      </div>

      {/* ══ TAB APERÇU ══ */}
      {tab === 'dashboard' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Actions rapides */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:1.5, marginBottom:12 }}>Actions rapides</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12 }}>
              {[
                { icon:'🎂', l:'Envoyer souhaits anniversaire',      c:C.purple, action:handleBirthday,     desc:'Génère les SMS pour les patients nés aujourd\'hui' },
                { icon:'🚀', l:'Dispatcher les messages en attente', c:C.teal,   action:handleDispatch,     desc:`${stats.QUEUED} message(s) prêt(s) à envoyer` },
                { icon:'📝', l:'Créer un template',                  c:C.blue,   action:()=>{setIsNewTpl(true);setEditTpl(null);setTplForm({key:'APPT_REMINDER_24H',channel:'SMS',text:''});}, desc:'Nouveau modèle de message réutilisable' },
                { icon:'📋', l:'Voir la file d\'attente',            c:C.amber,  action:()=>setTab('queue'), desc:`${stats.QUEUED} message(s) en attente d'envoi` },
              ].map((a,i) => (
                <button key={i} onClick={a.action}
                  style={{ background:'#fff', borderRadius:14, border:'1.5px solid #E2E8F0', padding:'16px 18px', cursor:'pointer', textAlign:'left', transition:'all .2s', display:'flex', flexDirection:'column', gap:8 }}
                  onMouseOver={e=>{e.currentTarget.style.borderColor=a.c;e.currentTarget.style.boxShadow=`0 4px 16px ${a.c}20`;}}
                  onMouseOut={e=>{e.currentTarget.style.borderColor='#E2E8F0';e.currentTarget.style.boxShadow='none';}}>
                  <div style={{ fontSize:24 }}>{a.icon}</div>
                  <div style={{ fontWeight:700, fontSize:13, color:'#0F172A' }}>{a.l}</div>
                  <div style={{ fontSize:11, color:'#94A3B8', lineHeight:1.5 }}>{a.desc}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, fontWeight:700, color:a.c }}>
                    Lancer <ChevronRight size={12}/>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Derniers messages */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:1.5, marginBottom:12 }}>Derniers messages envoyés</div>
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', overflow:'hidden' }}>
              {logs.length === 0 ? (
                <div style={{ padding:'32px', textAlign:'center', color:'#94A3B8' }}>
                  <MessageSquare size={32} style={{ margin:'0 auto 10px', opacity:.3 }}/>
                  <p style={{ margin:0, fontSize:13 }}>Aucun message envoyé</p>
                </div>
              ) : logs.slice(0,6).map((l,i) => {
                const st = MSG_STATUS[l.status] || MSG_STATUS.QUEUED;
                const ch = CHANNEL_INFO[l.channel] || CHANNEL_INFO.SMS;
                const ChIcon = ch.icon;
                return (
                  <div key={l.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 18px', borderBottom:i<Math.min(logs.length,6)-1?'1px solid #F8FAFC':'none' }}>
                    <div style={{ width:34, height:34, borderRadius:10, background:ch.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <ChIcon size={15} color={ch.color}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:13, color:'#0F172A' }}>{l.patient?.first_name} {l.patient?.last_name}</div>
                      <div style={{ fontSize:11, color:'#94A3B8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.text}</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <span style={{ background:st.bg, color:st.c, borderRadius:99, padding:'2px 9px', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
                        <div style={{ width:5, height:5, borderRadius:'50%', background:st.dot }}/>{st.l}
                      </span>
                      <div style={{ fontSize:10, color:'#94A3B8', marginTop:3 }}>{fdateShort(l.sent_at)}</div>
                    </div>
                  </div>
                );
              })}
              {logs.length > 6 && (
                <button onClick={() => setTab('logs')} style={{ width:'100%', padding:'12px', background:'#F8FAFC', border:'none', cursor:'pointer', fontSize:12, fontWeight:600, color:C.purple, borderTop:'1px solid #F1F5F9' }}>
                  Voir tout l'historique ({logs.length}) →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB FILE D'ATTENTE ══ */}
      {tab === 'queue' && (
        <>
          <div style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center', flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:200, background:'#fff', borderRadius:10, border:'1.5px solid #E2E8F0', padding:'8px 12px' }}>
              <Search size={13} color="#94A3B8"/>
              <input placeholder="Rechercher patient..." value={search} onChange={e=>setSearch(e.target.value)}
                style={{ border:'none', background:'transparent', outline:'none', fontSize:13, flex:1 }}/>
            </div>
            <button onClick={handleDispatch} disabled={dispatching||stats.QUEUED===0}
              style={{ padding:'8px 18px', borderRadius:10, background:stats.QUEUED>0?`linear-gradient(135deg,${C.purple},#9333EA)`:'#F1F5F9', color:stats.QUEUED>0?'#fff':'#94A3B8', border:'none', cursor:stats.QUEUED>0?'pointer':'not-allowed', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
              <Send size={13}/>Dispatcher ({stats.QUEUED})
            </button>
          </div>

          {filteredQueue.length === 0 ? (
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', padding:'48px', textAlign:'center' }}>
              <Clock size={36} style={{ margin:'0 auto 12px', color:'#CBD5E1' }}/>
              <p style={{ fontWeight:700, color:'#475569', fontSize:15, margin:'0 0 4px' }}>File d'attente vide</p>
              <p style={{ color:'#94A3B8', fontSize:13 }}>Les messages planifiés apparaîtront ici</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {filteredQueue.map((item,idx) => {
                const st = MSG_STATUS[item.status] || MSG_STATUS.QUEUED;
                const ch = CHANNEL_INFO[item.channel] || CHANNEL_INFO.SMS;
                const ChIcon = ch.icon;
                return (
                  <div key={item.id} className="msg-anim" style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'14px 18px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', animationDelay:`${idx*.04}s`, boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
                    <div style={{ width:38, height:38, borderRadius:11, background:ch.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <ChIcon size={17} color={ch.color}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                        <span style={{ fontWeight:700, fontSize:14, color:'#0F172A' }}>{item.patient?.first_name} {item.patient?.last_name}</span>
                        <span style={{ background:ch.bg, color:ch.color, fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:99 }}>{ch.label}</span>
                      </div>
                      <div style={{ fontSize:12, color:'#64748B', marginBottom:3 }}>{item.to}</div>
                      <div style={{ fontSize:12, color:'#475569', background:'#F8FAFC', borderRadius:8, padding:'5px 10px', display:'inline-block', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {item.text}
                      </div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <span style={{ background:st.bg, color:st.c, borderRadius:99, padding:'3px 10px', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4, marginBottom:4 }}>
                        <div style={{ width:5, height:5, borderRadius:'50%', background:st.dot }}/>{st.l}
                      </span>
                      <div style={{ fontSize:10, color:'#94A3B8' }}>Prévu : {fdateShort(item.scheduled_at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══ TAB TEMPLATES ══ */}
      {tab === 'templates' && (
        <>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
            <button onClick={() => { setEditTpl(null); setTplForm({ key:'APPT_REMINDER_24H', channel:'SMS', text:'' }); setIsNewTpl(true); }}
              style={{ padding:'9px 18px', borderRadius:10, background:`linear-gradient(135deg,${C.purple},#9333EA)`, color:'#fff', border:'none', cursor:'pointer', fontSize:14, fontWeight:700, display:'flex', alignItems:'center', gap:7, boxShadow:`0 4px 14px rgba(124,58,237,.3)` }}>
              <Plus size={14}/>Nouveau template
            </button>
          </div>

          {templates.length === 0 ? (
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', padding:'48px', textAlign:'center' }}>
              <FileText size={36} style={{ margin:'0 auto 12px', color:'#CBD5E1' }}/>
              <p style={{ fontWeight:700, color:'#475569', fontSize:15, margin:'0 0 4px' }}>Aucun template</p>
              <p style={{ color:'#94A3B8', fontSize:13, margin:'0 0 16px' }}>Créez vos premiers modèles de messages</p>
              <button onClick={() => { setEditTpl(null); setIsNewTpl(true); }} style={{ padding:'9px 18px', borderRadius:10, background:C.purple, color:'#fff', border:'none', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                Créer un template
              </button>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:14 }}>
              {templates.map((tpl,idx) => {
                const info = TEMPLATE_KEYS.find(t => t.key === tpl.key) || TEMPLATE_KEYS[5];
                const ch   = CHANNEL_INFO[tpl.channel] || CHANNEL_INFO.SMS;
                const ChIcon = ch.icon;
                return (
                  <div key={tpl.id} className="msg-anim" style={{ background:'#fff', borderRadius:16, border:`1.5px solid ${tpl.is_active?'#E2E8F0':'#F1F5F9'}`, padding:'18px 20px', opacity:tpl.is_active?1:.65, animationDelay:`${idx*.05}s`, boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:38, height:38, borderRadius:11, background:`${info.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{info.icon}</div>
                        <div>
                          <div style={{ fontWeight:800, fontSize:13, color:'#0F172A' }}>{info.label}</div>
                          <div style={{ display:'flex', gap:5, marginTop:2 }}>
                            <span style={{ background:ch.bg, color:ch.color, fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:99, display:'flex', alignItems:'center', gap:3 }}>
                              <ChIcon size={9}/>{ch.label}
                            </span>
                            <span style={{ background:`${info.color}15`, color:info.color, fontSize:10, fontWeight:600, padding:'1px 7px', borderRadius:99 }}>{tpl.key}</span>
                          </div>
                        </div>
                      </div>
                      {/* Toggle */}
                      <button onClick={() => handleToggleTemplate(tpl)}
                        style={{ background:'none', border:'none', cursor:'pointer', padding:4, display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:tpl.is_active?C.green:'#94A3B8' }}>
                        {tpl.is_active ? <ToggleRight size={22} color={C.green}/> : <ToggleLeft size={22} color="#CBD5E1"/>}
                        {tpl.is_active ? 'Actif' : 'Inactif'}
                      </button>
                    </div>

                    {/* Texte du template */}
                    <div style={{ background:'#F8FAFC', borderRadius:10, padding:'10px 12px', marginBottom:12, fontSize:12, color:'#475569', lineHeight:1.65, minHeight:52, position:'relative' }}>
                      {tpl.text}
                      <button onClick={() => copyText(tpl.text)}
                        style={{ position:'absolute', top:6, right:6, background:'none', border:'none', cursor:'pointer', color:'#94A3B8', padding:3 }}>
                        <Copy size={12}/>
                      </button>
                    </div>

                    <div style={{ fontSize:10, color:'#94A3B8', marginBottom:12 }}>{info.desc}</div>

                    <div style={{ display:'flex', gap:7 }}>
                      <button onClick={() => { setPreviewTpl(tpl); setIsPreview(true); }}
                        style={{ flex:1, padding:'7px', borderRadius:9, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', fontSize:12, fontWeight:600, color:'#475569', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                        <Eye size={12}/>Aperçu
                      </button>
                      <button onClick={() => openEdit(tpl)}
                        style={{ flex:1, padding:'7px', borderRadius:9, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', fontSize:12, fontWeight:600, color:'#475569', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
                        <Edit2 size={12}/>Modifier
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══ TAB HISTORIQUE ══ */}
      {tab === 'logs' && (
        <>
          <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:200, background:'#fff', borderRadius:10, border:'1.5px solid #E2E8F0', padding:'8px 12px' }}>
              <Search size={13} color="#94A3B8"/>
              <input placeholder="Rechercher patient, numéro..." value={search} onChange={e=>setSearch(e.target.value)}
                style={{ border:'none', background:'transparent', outline:'none', fontSize:13, flex:1 }}/>
            </div>
            <div style={{ display:'flex', gap:5 }}>
              {['ALL','SENT','FAILED'].map(f => (
                <button key={f} onClick={() => setLogFilter(f)}
                  style={{ padding:'7px 13px', borderRadius:99, border:'none', cursor:'pointer', fontSize:11, fontWeight:600, background:logFilter===f?C.purple:'#F1F5F9', color:logFilter===f?'#fff':'#475569', transition:'all .15s' }}>
                  {f==='ALL'?'Tous':f==='SENT'?'✅ Envoyés':'❌ Échoués'}
                </button>
              ))}
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', padding:'48px', textAlign:'center' }}>
              <MessageSquare size={36} style={{ margin:'0 auto 12px', color:'#CBD5E1' }}/>
              <p style={{ fontWeight:700, color:'#475569', fontSize:15, margin:0 }}>Aucun historique</p>
            </div>
          ) : (
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', overflow:'hidden' }}>
              {filteredLogs.map((l,i) => {
                const st = MSG_STATUS[l.status] || MSG_STATUS.QUEUED;
                const ch = CHANNEL_INFO[l.channel] || CHANNEL_INFO.SMS;
                const ChIcon = ch.icon;
                return (
                  <div key={l.id} className="msg-anim" style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 18px', borderBottom:i<filteredLogs.length-1?'1px solid #F8FAFC':'none', animationDelay:`${Math.min(i,.15)*0.04}s`, flexWrap:'wrap', gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:ch.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <ChIcon size={15} color={ch.color}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:13, color:'#0F172A' }}>{l.patient?.first_name} {l.patient?.last_name} <span style={{ fontSize:11, color:'#94A3B8', fontWeight:400 }}>· {l.to}</span></div>
                      <div style={{ fontSize:12, color:'#475569', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginTop:2 }}>{l.text}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                      <span style={{ background:st.bg, color:st.c, borderRadius:99, padding:'3px 10px', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
                        <div style={{ width:5, height:5, borderRadius:'50%', background:st.dot }}/>{st.l}
                      </span>
                      <span style={{ fontSize:10, color:'#94A3B8' }}>{fdateShort(l.sent_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══ MODAL NOUVEAU / ÉDITER TEMPLATE ══ */}
      <Modal open={isNewTpl} onClose={() => { setIsNewTpl(false); setEditTpl(null); }} title={editTpl ? `Modifier — ${TEMPLATE_KEYS.find(t=>t.key===editTpl.key)?.label||editTpl.key}` : '✏️ Nouveau template'} maxW={540}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:'#475569', display:'block', marginBottom:5 }}>Type de message</label>
              <select value={tplForm.key} onChange={e => setTplForm({...tplForm, key:e.target.value})} style={inp} onFocus={fi} onBlur={bi}>
                {TEMPLATE_KEYS.map(t => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:'#475569', display:'block', marginBottom:5 }}>Canal d'envoi</label>
              <select value={tplForm.channel} onChange={e => setTplForm({...tplForm, channel:e.target.value})} style={inp} onFocus={fi} onBlur={bi}>
                <option value="SMS">📱 SMS</option>
                <option value="EMAIL">📧 Email</option>
              </select>
            </div>
          </div>

          {/* Description du type */}
          {(() => { const info = TEMPLATE_KEYS.find(t => t.key === tplForm.key); return info ? (
            <div style={{ background:'#F0FDFE', border:'1px solid #7DD3DA', borderRadius:10, padding:'8px 12px', fontSize:12, color:'#0D7A87' }}>
              ℹ️ {info.desc}
            </div>
          ) : null; })()}

          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
              <label style={{ fontSize:13, fontWeight:600, color:'#475569' }}>Texte du message</label>
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                {PLACEHOLDERS.map(p => (
                  <button key={p} onClick={() => setTplForm(f => ({...f, text: f.text + p}))}
                    style={{ padding:'2px 8px', borderRadius:99, border:'1px solid #E2E8F0', background:'#F8FAFC', cursor:'pointer', fontSize:10, fontWeight:700, color:'#0D7A87' }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <textarea value={tplForm.text} onChange={e => setTplForm({...tplForm, text:e.target.value})}
              rows={4} placeholder="Bonjour {patient_name}, votre RDV est le {date} à {time}..."
              style={{ ...inp, resize:'vertical' }} onFocus={fi} onBlur={bi}/>
            <div style={{ fontSize:11, color:'#94A3B8', marginTop:4 }}>
              {tplForm.text.length} caractères
              {tplForm.channel === 'SMS' && tplForm.text.length > 160 && (
                <span style={{ color:C.amber, marginLeft:8 }}>⚠️ Dépasse 160 car. → 2 SMS</span>
              )}
            </div>
          </div>

          {/* Aperçu temps réel */}
          {tplForm.text && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:1.5, marginBottom:8 }}>Aperçu</div>
              <SMSPreview text={tplForm.text.replace('{patient_name}','Dr. Rakoto').replace('{clinic_name}','Cabinet DPM').replace('{date}','15/04/2025').replace('{time}','09:30')}/>
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:8, borderTop:'1px solid #F1F5F9' }}>
            <button onClick={() => { setIsNewTpl(false); setEditTpl(null); }} style={{ padding:'9px 18px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, color:'#475569' }}>Annuler</button>
            <button onClick={handleCreateTemplate} disabled={!tplForm.key || !tplForm.text.trim()}
              style={{ padding:'9px 22px', borderRadius:10, background:`linear-gradient(135deg,${C.purple},#9333EA)`, color:'#fff', border:'none', cursor:'pointer', fontSize:14, fontWeight:700, display:'flex', alignItems:'center', gap:7, opacity:(!tplForm.key||!tplForm.text.trim())?.5:1 }}>
              {editTpl ? <><Edit2 size={14}/>Enregistrer</> : <><Plus size={14}/>Créer</>}
            </button>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL APERÇU TEMPLATE ══ */}
      <Modal open={isPreview} onClose={() => setIsPreview(false)} title="👁️ Aperçu du message" maxW={380}>
        {previewTpl && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <div style={{ fontSize:22 }}>{TEMPLATE_KEYS.find(t=>t.key===previewTpl.key)?.icon||'📝'}</div>
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:'#0F172A' }}>{TEMPLATE_KEYS.find(t=>t.key===previewTpl.key)?.label||previewTpl.key}</div>
                <div style={{ fontSize:11, color:'#64748B' }}>Canal : {previewTpl.channel}</div>
              </div>
            </div>
            <SMSPreview text={previewTpl.text.replace('{patient_name}','Dr. Rakoto').replace('{clinic_name}','Cabinet DPM').replace('{date}','15/04/2025').replace('{time}','09:30').replace('{amount}','150 000 Ar')}/>
            <div style={{ background:'#F8FAFC', borderRadius:12, padding:'12px 14px', fontSize:12, color:'#475569' }}>
              <div style={{ fontWeight:600, marginBottom:6, color:'#0F172A' }}>Message brut :</div>
              {previewTpl.text}
            </div>
            <button onClick={() => copyText(previewTpl.text)}
              style={{ padding:'10px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, color:'#475569', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <Copy size={14}/>Copier le texte
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MessagingManagement;
