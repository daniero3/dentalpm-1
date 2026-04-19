import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useResponsive, modalOverlay, getModalStyle } from '../utils/responsive';
import { useAuth } from '../App';
import { toast } from 'sonner';
import {
  FileText, Plus, Search, Eye, Printer, Download, ArrowRight,
  Clock, CheckCircle, XCircle, AlertCircle, X, RefreshCw,
  Trash2, Edit2, User, Calendar, Tag, Sparkles, ChevronRight
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const authH = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const fmt = v => new Intl.NumberFormat('fr-MG').format(v || 0) + ' Ar';
const fdate = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

const Q_STATUS = {
  DRAFT:     { l:'Brouillon', bg:'#F1F5F9', c:'#475569', dot:'#94A3B8' },
  SENT:      { l:'Envoyé',    bg:'#EFF6FF', c:'#1D4ED8', dot:'#3B82F6' },
  ACCEPTED:  { l:'Accepté',   bg:'#DCFCE7', c:'#166534', dot:'#22C55E' },
  REJECTED:  { l:'Refusé',    bg:'#FEE2E2', c:'#991B1B', dot:'#EF4444' },
  EXPIRED:   { l:'Expiré',    bg:'#FEF3C7', c:'#92400E', dot:'#F59E0B' },
  CONVERTED: { l:'Converti',  bg:'#EDE9FE', c:'#5B21B6', dot:'#8B5CF6' },
  CANCELLED: { l:'Annulé',    bg:'#F1F5F9', c:'#94A3B8', dot:'#CBD5E1' },
};
const NEXT_STATUS = {
  DRAFT:    ['SENT','CANCELLED'],
  SENT:     ['ACCEPTED','REJECTED','EXPIRED'],
  ACCEPTED: ['CONVERTED'],
};

const C = { green:'#10B981', teal:'#0D7A87', blue:'#3B82F6', amber:'#F59E0B', purple:'#8B5CF6', red:'#EF4444' };

/* ── Modal ── */
const Modal = ({ open, onClose, title, children, maxW=640 }) => {
  if (!open) return null;
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{ position:'fixed',inset:0,zIndex:1000,background:'rgba(15,23,42,.55)',overflowY:'auto',padding:'60px 16px 32px' }}>
      <div style={{ background:'#fff',borderRadius:22,padding:28,width:'100%',maxWidth:maxW,margin:'0 auto',boxShadow:'0 24px 64px rgba(15,23,42,.2)',border:'1px solid #E2E8F0',position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute',top:14,right:14,background:'#F8FAFC',border:'none',cursor:'pointer',padding:7,borderRadius:8,display:'flex',alignItems:'center',color:'#64748B' }}><X size={15}/></button>
        {title&&<h2 style={{ fontFamily:'Plus Jakarta Sans',fontSize:17,fontWeight:700,color:'#0F172A',margin:'0 0 20px',paddingRight:28 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
};
const Skel = ({h=16,w='100%',r=8}) => <div style={{ height:h,width:w,borderRadius:r,background:'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.4s infinite' }}/>;
const inp = { width:'100%',padding:'9px 12px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:13,fontFamily:'inherit',outline:'none',transition:'border-color .2s' };
const fi = e=>e.target.style.borderColor='#0D7A87', bi=e=>e.target.style.borderColor='#E2E8F0';

/* ── Status Badge ── */
const SBadge = ({ status }) => {
  const s = Q_STATUS[status] || Q_STATUS.DRAFT;
  return (
    <span style={{ background:s.bg,color:s.c,borderRadius:99,padding:'3px 10px',fontSize:11,fontWeight:700,display:'inline-flex',alignItems:'center',gap:4 }}>
      <div style={{ width:5,height:5,borderRadius:'50%',background:s.dot }}/>{s.l}
    </span>
  );
};

/* ════════════════════════════════════════════════════════════════════════════ */
const QuoteManagement = () => {
  const { user } = useAuth();
  const [quotes,    setQuotes]    = useState([]);
  const [patients,  setPatients]  = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [fees,      setFees]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [statusF,   setStatusF]   = useState('ALL');
  const [isOpen,    setIsOpen]    = useState(false);
  const [detailQ,   setDetailQ]   = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [feeSearch, setFeeSearch] = useState('');

  const emptyForm = { patient_id:'', schedule_id:'', items:[{ description:'', quantity:1, unit_price_mga:'', tooth_number:'' }], discount_percentage:0, validity_days:30, notes:'' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchQuotes(), fetchPatients(), fetchSchedules()]);
    setLoading(false);
  };
  const fetchQuotes    = async () => { try { const r=await axios.get(`${API}/quotes`,authH()); setQuotes(r.data.quotes||[]); } catch {} };
  const fetchPatients  = async () => { try { const r=await axios.get(`${API}/patients`,authH()); setPatients(r.data.patients||[]); } catch {} };
  const fetchSchedules = async () => { try { const r=await axios.get(`${API}/pricing-schedules`,authH()); setSchedules(r.data.schedules||[]); } catch {} };
  const fetchFees = async id => { try { const r=await axios.get(`${API}/pricing-schedules/${id}/fees`,authH()); setFees(r.data.fees||[]); } catch { setFees([]); } };

  const addItem    = () => setForm(f=>({...f,items:[...f.items,{description:'',quantity:1,unit_price_mga:'',tooth_number:''}]}));
  const removeItem = i => { if(form.items.length>1) setForm(f=>({...f,items:f.items.filter((_,idx)=>idx!==i)})); };
  const updateItem = (i,k,v) => setForm(f=>{const it=[...f.items];it[i]={...it[i],[k]:v};return{...f,items:it};});
  const addFee     = fee => { updateItem(form.items.findIndex(i=>!i.description)>=0?form.items.findIndex(i=>!i.description):form.items.length-1,'description',fee.label); addItem(); setFeeSearch(''); };

  const sub   = () => form.items.reduce((s,i)=>s+(i.quantity*(parseFloat(i.unit_price_mga)||0)),0);
  const total = () => { const s=sub(); return s-(s*form.discount_percentage/100); };

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { patient_id:form.patient_id, items:form.items.filter(i=>i.description&&i.unit_price_mga), discount_percentage:form.discount_percentage, validity_days:form.validity_days, notes:form.notes };
      if (form.schedule_id) payload.schedule_id = form.schedule_id;
      await axios.post(`${API}/quotes`, payload, authH());
      toast.success('Devis créé !'); setIsOpen(false); setForm(emptyForm); fetchQuotes();
    } catch(e){ toast.error(e.response?.data?.error||'Erreur'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (q, ns) => {
    try { await axios.patch(`${API}/quotes/${q.id}/status`,{status:ns},authH()); toast.success(`→ ${Q_STATUS[ns]?.l}`); fetchQuotes(); if(detailQ?.id===q.id) setDetailQ({...detailQ,status:ns}); }
    catch { toast.error('Erreur'); }
  };

  const handleConvert = async q => {
    if(!window.confirm(`Convertir le devis ${q.invoice_number} en facture ?`)) return;
    try { const r=await axios.post(`${API}/quotes/${q.id}/convert`,{},authH()); toast.success(`Facture ${r.data.invoice?.invoice_number} créée !`); fetchQuotes(); setDetailQ(null); }
    catch(e){ toast.error(e.response?.data?.error||'Erreur conversion'); }
  };

  const handlePrint = id => window.open(`${API}/quotes/${id}/print`,'_blank');
  const handlePDF = async (id, num) => {
    try {
      const r=await fetch(`${API}/quotes/${id}/pdf`,{headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}});
      if(!r.ok){toast.error('Erreur PDF');return;}
      const blob=await r.blob(), url=window.URL.createObjectURL(blob), a=document.createElement('a');
      a.href=url;a.download=`${num||'devis'}.pdf`;document.body.appendChild(a);a.click();document.body.removeChild(a);window.URL.revokeObjectURL(url);
      toast.success('PDF téléchargé');
    } catch { toast.error('Erreur PDF'); }
  };

  const pname = id => { const p=patients.find(p=>p.id===id); return p?`${p.first_name} ${p.last_name}`:'—'; };

  const filtered = quotes.filter(q => {
    const ms = statusF==='ALL'||q.status===statusF;
    const mt = !search||(q.invoice_number||'').toLowerCase().includes(search.toLowerCase())||pname(q.patient_id).toLowerCase().includes(search.toLowerCase());
    return ms&&mt;
  });

  const stats = {
    total: quotes.length,
    accepted: quotes.filter(q=>q.status==='ACCEPTED').length,
    converted: quotes.filter(q=>q.status==='CONVERTED').length,
    pending: quotes.filter(q=>['DRAFT','SENT'].includes(q.status)).length,
    totalAmt: quotes.filter(q=>q.status==='ACCEPTED').reduce((s,q)=>s+parseFloat(q.total_mga||0),0),
  };

  const filtFees = fees.filter(f=>(f.label||'').toLowerCase().includes(feeSearch.toLowerCase())||(f.procedure_code||'').toLowerCase().includes(feeSearch.toLowerCase())).slice(0,8);

  if(loading) return(
    <div style={{ maxWidth: 1100,margin:'0 auto',paddingBottom:48 }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display:'flex',flexDirection:'column',gap:12 }}>{Array(5).fill(0).map((_,i)=><Skel key={i} h={80} r={14}/>)}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100,margin:'0 auto',paddingBottom:48 }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.q-card{animation:fadeUp .3s ease both}`}</style>

      {/* En-tête */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22,flexWrap:'wrap',gap:12 }}>
        <div style={{ display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ width:44,height:44,borderRadius:13,background:'linear-gradient(135deg,#0D7A87,#13A3B4)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 14px rgba(13,122,135,.3)' }}>
            <FileText size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{ fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:22,color:'#0F172A',margin:0 }}>Devis</h1>
            <p style={{ color:'#64748B',fontSize:13,margin:0 }}>{quotes.length} devis · {stats.accepted} acceptés</p>
          </div>
        </div>
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={fetchAll} style={{ padding:'8px 13px',borderRadius:10,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontSize:13,fontWeight:600,color:'#475569' }}>
            <RefreshCw size={13}/>
          </button>
          <button onClick={()=>{setForm(emptyForm);setFees([]);setIsOpen(true);}}
            style={{ padding:'9px 18px',borderRadius:10,background:'linear-gradient(135deg,#0D7A87,#13A3B4)',color:'#fff',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:14,fontWeight:700,boxShadow:'0 4px 14px rgba(13,122,135,.3)' }}>
            <Plus size={15}/>Nouveau Devis
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:20 }}>
        {[
          {icon:'📋',l:'Total',         v:stats.total,     c:C.teal,   bg:'#F0FDFE'},
          {icon:'⏳',l:'En attente',    v:stats.pending,   c:C.amber,  bg:'#FFFBEB'},
          {icon:'✅',l:'Acceptés',       v:stats.accepted,  c:C.green,  bg:'#DCFCE7'},
          {icon:'🔄',l:'Convertis',     v:stats.converted, c:C.purple, bg:'#EDE9FE'},
          {icon:'💰',l:'Valeur acceptés',v:fmt(stats.totalAmt),c:C.teal,bg:'#F0FDFE',raw:true},
        ].map((k,i)=>(
          <button key={i} onClick={()=>setStatusF(k.l==='Total'?'ALL':k.l==='En attente'?'DRAFT':k.l==='Acceptés'?'ACCEPTED':k.l==='Convertis'?'CONVERTED':'ALL')}
            style={{ background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',padding:'13px 15px',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:11,transition:'all .2s' }}
            onMouseOver={e=>{e.currentTarget.style.borderColor=k.c;e.currentTarget.style.boxShadow=`0 4px 12px ${k.c}20`;}}
            onMouseOut={e=>{e.currentTarget.style.borderColor='#E2E8F0';e.currentTarget.style.boxShadow='none';}}>
            <div style={{ width:36,height:36,borderRadius:10,background:k.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>{k.icon}</div>
            <div>
              <div style={{ fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:k.raw?14:20,color:'#0F172A',lineHeight:1 }}>{k.raw?k.v:k.v}</div>
              <div style={{ fontSize:11,color:'#64748B',marginTop:2 }}>{k.l}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Barre filtre */}
      <div style={{ background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',padding:'11px 16px',marginBottom:16,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center' }}>
        <div style={{ display:'flex',alignItems:'center',gap:7,flex:1,minWidth:200 }}>
          <Search size={13} color="#94A3B8"/>
          <input placeholder="Rechercher devis, patient..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{ border:'none',background:'transparent',outline:'none',fontSize:13,flex:1 }}/>
          {search&&<button onClick={()=>setSearch('')} style={{ background:'none',border:'none',cursor:'pointer',color:'#94A3B8',padding:0 }}><X size={12}/></button>}
        </div>
        <div style={{ display:'flex',gap:5,flexWrap:'wrap' }}>
          {['ALL',...Object.keys(Q_STATUS)].map(s=>{
            const st=Q_STATUS[s];
            return(
              <button key={s} onClick={()=>setStatusF(s)}
                style={{ padding:'5px 11px',borderRadius:99,border:'none',cursor:'pointer',fontSize:11,fontWeight:600,background:statusF===s?(st?.bg||'#F0FDFE'):'#F1F5F9',color:statusF===s?(st?.c||C.teal):'#64748B',transition:'all .15s' }}>
                {s==='ALL'?'Tous':st?.l}
              </button>
            );
          })}
        </div>
        <span style={{ fontSize:11,color:'#94A3B8' }}>{filtered.length} résultat(s)</span>
      </div>

      {/* Liste */}
      {filtered.length===0?(
        <div style={{ background:'#fff',borderRadius:18,border:'1px solid #E2E8F0',padding:'52px',textAlign:'center' }}>
          <FileText size={40} style={{ margin:'0 auto 14px',color:'#CBD5E1' }}/>
          <p style={{ fontWeight:700,color:'#475569',fontSize:15,margin:'0 0 6px' }}>Aucun devis</p>
          <p style={{ color:'#94A3B8',fontSize:13,margin:'0 0 18px' }}>{search?`Aucun résultat pour "${search}"`:'Créez votre premier devis'}</p>
          <button onClick={()=>{setForm(emptyForm);setIsOpen(true);}} style={{ padding:'10px 22px',borderRadius:11,background:'linear-gradient(135deg,#0D7A87,#13A3B4)',color:'#fff',border:'none',cursor:'pointer',fontSize:14,fontWeight:700 }}>
            Nouveau devis
          </button>
        </div>
      ):(
        <div style={{ background:'#fff',borderRadius:18,border:'1px solid #E2E8F0',overflow:'hidden' }}>
          {filtered.map((q,idx)=>{
            const nexts = NEXT_STATUS[q.status]||[];
            return(
              <div key={q.id} className="q-card" style={{ padding:'15px 20px',borderBottom:idx<filtered.length-1?'1px solid #F8FAFC':'none',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap',transition:'background .15s',animationDelay:`${Math.min(idx,.15)*.04}s` }}
                onMouseOver={e=>e.currentTarget.style.background='#FAFBFC'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                {/* Icône */}
                <div style={{ width:40,height:40,borderRadius:11,background:'#F0FDFE',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  <FileText size={18} color={C.teal}/>
                </div>
                {/* Infos */}
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap' }}>
                    <span style={{ fontFamily:'Plus Jakarta Sans',fontWeight:700,fontSize:14,color:'#0F172A' }}>{q.invoice_number}</span>
                    <SBadge status={q.status}/>
                    {q.status==='ACCEPTED'&&<span style={{ fontSize:10,fontWeight:700,color:'#166534',background:'#DCFCE7',padding:'1px 7px',borderRadius:99 }}>✓ Peut être converti</span>}
                  </div>
                  <div style={{ display:'flex',gap:14,fontSize:12,color:'#64748B',flexWrap:'wrap' }}>
                    <span style={{ display:'flex',alignItems:'center',gap:4 }}><User size={11}/>{pname(q.patient_id)}</span>
                    <span style={{ display:'flex',alignItems:'center',gap:4 }}><Calendar size={11}/>{fdate(q.created_at)}</span>
                    {q.validity_days&&<span style={{ display:'flex',alignItems:'center',gap:4 }}><Clock size={11}/>Validité: {q.validity_days}j</span>}
                    <span style={{ fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:13,color:C.teal }}>{fmt(q.total_mga)}</span>
                  </div>
                  {/* Statuts rapides */}
                  {nexts.length>0&&(
                    <div style={{ display:'flex',gap:5,marginTop:7,flexWrap:'wrap' }}>
                      {nexts.map(ns=>{
                        const st=Q_STATUS[ns];
                        return(
                          <button key={ns} onClick={()=>handleStatusChange(q,ns)}
                            style={{ padding:'2px 9px',borderRadius:99,border:`1px solid ${st.dot}`,background:st.bg,color:st.c,fontSize:10,fontWeight:700,cursor:'pointer',transition:'all .15s' }}>
                            → {st.l}
                          </button>
                        );
                      })}
                      {q.status==='ACCEPTED'&&(
                        <button onClick={()=>handleConvert(q)}
                          style={{ padding:'2px 9px',borderRadius:99,border:'1px solid #8B5CF6',background:'#EDE9FE',color:'#5B21B6',fontSize:10,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:3 }}>
                          <ArrowRight size={9}/>Convertir en facture
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {/* Actions */}
                <div style={{ display:'flex',gap:5,flexShrink:0 }}>
                  <button onClick={()=>setDetailQ(q)} title="Détails"
                    style={{ width:30,height:30,borderRadius:8,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#94A3B8',transition:'all .15s' }}
                    onMouseOver={e=>{e.currentTarget.style.borderColor=C.teal;e.currentTarget.style.color=C.teal;}} onMouseOut={e=>{e.currentTarget.style.borderColor='#E2E8F0';e.currentTarget.style.color='#94A3B8';}}>
                    <Eye size={13}/>
                  </button>
                  <button onClick={()=>handlePrint(q.id)} title="Imprimer"
                    style={{ width:30,height:30,borderRadius:8,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#94A3B8',transition:'all .15s' }}
                    onMouseOver={e=>{e.currentTarget.style.borderColor=C.blue;e.currentTarget.style.color=C.blue;}} onMouseOut={e=>{e.currentTarget.style.borderColor='#E2E8F0';e.currentTarget.style.color='#94A3B8';}}>
                    <Printer size={13}/>
                  </button>
                  <button onClick={()=>handlePDF(q.id,q.invoice_number)} title="PDF"
                    style={{ width:30,height:30,borderRadius:8,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#94A3B8',transition:'all .15s' }}
                    onMouseOver={e=>{e.currentTarget.style.borderColor=C.purple;e.currentTarget.style.color=C.purple;}} onMouseOut={e=>{e.currentTarget.style.borderColor='#E2E8F0';e.currentTarget.style.color='#94A3B8';}}>
                    <Download size={13}/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ MODAL DÉTAIL ══ */}
      <Modal open={!!detailQ} onClose={()=>setDetailQ(null)} title={`📋 Devis — ${detailQ?.invoice_number}`} maxW={560}>
        {detailQ&&(
          <div>
            <div style={{ display:'flex',gap:10,flexWrap:'wrap',marginBottom:18 }}>
              <SBadge status={detailQ.status}/>
              <span style={{ fontSize:12,color:'#64748B' }}>{pname(detailQ.patient_id)}</span>
              <span style={{ fontSize:12,color:'#64748B' }}>Créé le {fdate(detailQ.created_at)}</span>
            </div>
            {/* Items */}
            <div style={{ background:'#F8FAFC',borderRadius:12,padding:'14px',marginBottom:16 }}>
              <div style={{ fontSize:11,fontWeight:700,color:'#94A3B8',textTransform:'uppercase',letterSpacing:1.5,marginBottom:10 }}>Prestations</div>
              {(detailQ.items||[]).map((item,i)=>(
                <div key={i} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:i<detailQ.items.length-1?'1px solid #E2E8F0':'none' }}>
                  <div>
                    <div style={{ fontSize:13,fontWeight:600,color:'#0F172A' }}>{item.description}</div>
                    {item.tooth_number&&<div style={{ fontSize:11,color:'#94A3B8' }}>Dent #{item.tooth_number}</div>}
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:12,color:'#64748B' }}>{item.quantity} × {fmt(item.unit_price_mga)}</div>
                    <div style={{ fontWeight:700,fontSize:13,color:'#0F172A' }}>{fmt(item.quantity*(item.unit_price_mga||0))}</div>
                  </div>
                </div>
              ))}
              <div style={{ display:'flex',justifyContent:'space-between',paddingTop:10,marginTop:8,borderTop:'2px solid #E2E8F0' }}>
                <span style={{ fontFamily:'Plus Jakarta Sans',fontWeight:700,color:'#0F172A' }}>Total{detailQ.discount_percentage>0?` (−${detailQ.discount_percentage}%)`:''}</span>
                <span style={{ fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:18,color:C.teal }}>{fmt(detailQ.total_mga)}</span>
              </div>
            </div>
            {detailQ.notes&&<div style={{ background:'#FFFBEB',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:12,color:'#92400E' }}>📝 {detailQ.notes}</div>}
            {/* Actions détail */}
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8 }}>
              {(NEXT_STATUS[detailQ.status]||[]).map(ns=>{
                const st=Q_STATUS[ns];
                return(
                  <button key={ns} onClick={()=>handleStatusChange(detailQ,ns)}
                    style={{ padding:'9px',borderRadius:10,border:`1.5px solid ${st.dot}`,background:st.bg,color:st.c,cursor:'pointer',fontSize:12,fontWeight:700 }}>
                    → {st.l}
                  </button>
                );
              })}
              {detailQ.status==='ACCEPTED'&&(
                <button onClick={()=>handleConvert(detailQ)}
                  style={{ padding:'9px',borderRadius:10,border:'1.5px solid #8B5CF6',background:'#EDE9FE',color:'#5B21B6',cursor:'pointer',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:5 }}>
                  <ArrowRight size={13}/>Convertir
                </button>
              )}
              <button onClick={()=>handlePrint(detailQ.id)} style={{ padding:'9px',borderRadius:10,border:'1.5px solid #E2E8F0',background:'#fff',color:'#475569',cursor:'pointer',fontSize:12,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:5 }}>
                <Printer size={13}/>Imprimer
              </button>
              <button onClick={()=>handlePDF(detailQ.id,detailQ.invoice_number)} style={{ padding:'9px',borderRadius:10,border:'1.5px solid #E2E8F0',background:'#fff',color:'#475569',cursor:'pointer',fontSize:12,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:5 }}>
                <Download size={13}/>PDF
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ══ MODAL NOUVEAU DEVIS ══ */}
      <Modal open={isOpen} onClose={()=>setIsOpen(false)} title="📋 Nouveau devis" maxW={700}>
        <form onSubmit={handleSubmit} style={{ display:'flex',flexDirection:'column',gap:14 }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div>
              <label style={{ fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:5 }}>Patient *</label>
              <select value={form.patient_id} onChange={e=>setForm({...form,patient_id:e.target.value})} style={inp} onFocus={fi} onBlur={bi} required>
                <option value="">Sélectionner...</option>
                {patients.map(p=><option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:5 }}>Grille tarifaire</label>
              <select value={form.schedule_id} onChange={e=>{setForm({...form,schedule_id:e.target.value});fetchFees(e.target.value);}} style={inp} onFocus={fi} onBlur={bi}>
                <option value="">Sélectionner...</option>
                {schedules.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:5 }}>Validité (jours)</label>
              <input type="number" min="1" value={form.validity_days} onChange={e=>setForm({...form,validity_days:parseInt(e.target.value)||30})} style={inp} onFocus={fi} onBlur={bi}/>
            </div>
            <div>
              <label style={{ fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:5 }}>Remise (%)</label>
              <input type="number" min="0" max="100" value={form.discount_percentage} onChange={e=>setForm({...form,discount_percentage:parseFloat(e.target.value)||0})} style={inp} onFocus={fi} onBlur={bi}/>
            </div>
          </div>

          {/* Actes depuis grille */}
          {fees.length>0&&(
            <div style={{ background:'#F0FDFE',borderRadius:12,padding:'12px 14px',border:'1px solid #7DD3DA' }}>
              <div style={{ fontSize:11,fontWeight:700,color:C.teal,textTransform:'uppercase',letterSpacing:1.5,marginBottom:8 }}>
                <Sparkles size={11} style={{ display:'inline',marginRight:4 }}/>Actes de la grille
              </div>
              <input value={feeSearch} onChange={e=>setFeeSearch(e.target.value)} placeholder="Rechercher un acte..." style={{ ...inp,marginBottom:8 }} onFocus={fi} onBlur={bi}/>
              <div style={{ display:'flex',gap:5,flexWrap:'wrap' }}>
                {filtFees.map(f=>(
                  <button key={f.id} type="button" onClick={()=>{setForm(fm=>({...fm,items:[...fm.items.filter(i=>i.description),{description:f.label,quantity:1,unit_price_mga:String(f.price_mga),tooth_number:''}]}));}}
                    style={{ padding:'4px 11px',borderRadius:8,border:'1px solid #7DD3DA',background:'#fff',color:C.teal,fontSize:11,fontWeight:600,cursor:'pointer' }}>
                    {f.label} · {fmt(f.price_mga)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Items */}
          <div>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
              <label style={{ fontSize:12,fontWeight:600,color:'#475569' }}>Prestations</label>
              <button type="button" onClick={addItem} style={{ padding:'4px 11px',borderRadius:8,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer',fontSize:11,fontWeight:600,color:'#475569',display:'flex',alignItems:'center',gap:4 }}>
                <Plus size={11}/>Ajouter
              </button>
            </div>
            {form.items.map((item,i)=>(
              <div key={i} style={{ display:'grid',gridTemplateColumns:'1fr 60px 110px 80px 28px',gap:6,marginBottom:6,alignItems:'center' }}>
                <input value={item.description} onChange={e=>updateItem(i,'description',e.target.value)} placeholder="Description de l'acte" style={inp} onFocus={fi} onBlur={bi}/>
                <input type="number" min="1" value={item.quantity} onChange={e=>updateItem(i,'quantity',parseInt(e.target.value)||1)} placeholder="Qté" style={inp} onFocus={fi} onBlur={bi}/>
                <input type="number" min="0" value={item.unit_price_mga} onChange={e=>updateItem(i,'unit_price_mga',e.target.value)} placeholder="Prix Ar" style={inp} onFocus={fi} onBlur={bi}/>
                <div style={{ background:'#F8FAFC',borderRadius:10,padding:'9px 8px',fontSize:11,fontWeight:700,color:C.teal,textAlign:'right',border:'1px solid #E2E8F0' }}>
                  {fmt((item.quantity||0)*(parseFloat(item.unit_price_mga)||0))}
                </div>
                <button type="button" onClick={()=>removeItem(i)} style={{ width:28,height:28,borderRadius:7,border:'1px solid #FECACA',background:'#FFF5F5',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#EF4444',flexShrink:0 }}>
                  <X size={12}/>
                </button>
              </div>
            ))}
            {/* Total */}
            <div style={{ background:'#F0FDFE',border:'1px solid #7DD3DA',borderRadius:12,padding:'12px 16px',marginTop:10,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <div>
                <div style={{ fontSize:11,color:'#64748B' }}>Sous-total : {fmt(sub())}</div>
                {form.discount_percentage>0&&<div style={{ fontSize:11,color:C.amber }}>Remise {form.discount_percentage}% : −{fmt(sub()*form.discount_percentage/100)}</div>}
              </div>
              <div style={{ fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:20,color:C.teal }}>{fmt(total())}</div>
            </div>
          </div>

          <div>
            <label style={{ fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:5 }}>Notes</label>
            <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} placeholder="Notes pour le patient..." style={{ ...inp,resize:'vertical' }} onFocus={fi} onBlur={bi}/>
          </div>

          <div style={{ display:'flex',justifyContent:'flex-end',gap:8,paddingTop:8,borderTop:'1px solid #F1F5F9' }}>
            <button type="button" onClick={()=>setIsOpen(false)} style={{ padding:'9px 18px',borderRadius:10,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer',fontSize:13,fontWeight:600,color:'#475569' }}>Annuler</button>
            <button type="submit" disabled={saving} style={{ padding:'9px 22px',borderRadius:10,background:'linear-gradient(135deg,#0D7A87,#13A3B4)',color:'#fff',border:'none',cursor:'pointer',fontSize:14,fontWeight:700,display:'flex',alignItems:'center',gap:7,opacity:saving?.7:1 }}>
              {saving?<div style={{ width:14,height:14,border:'2px solid rgba(255,255,255,.4)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .8s linear infinite' }}/>:<Plus size={14}/>}
              Créer le devis
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default QuoteManagement;
