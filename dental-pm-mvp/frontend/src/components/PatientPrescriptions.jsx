import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  FileText, Plus, Download, ArrowLeft, User, Loader2,
  Send, XCircle, Trash2, Edit2, CheckCircle, X, Printer,
  Search, Pill, ChevronRight, Stethoscope, Calendar,
  Clock, Filter, AlertCircle, Sparkles, History,
  MoreHorizontal, Eye, TrendingUp, Hash
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API   = `${BACKEND_URL}/api`;
const authH = () => ({ withCredentials: true });

const T      = '#0D7A87';
const T_DARK = '#0A5F6A';

/* ── Constants ─────────────────────────────── */
const STATUS_COLORS = {
  DRAFT:     { bg:'#FEF9EC', text:'#92400E', border:'#FDE68A', dot:'#F59E0B' },
  ISSUED:    { bg:'#ECFDF5', text:'#065F46', border:'#A7F3D0', dot:'#10B981' },
  CANCELLED: { bg:'#FEF2F2', text:'#991B1B', border:'#FECACA', dot:'#EF4444' },
};
const STATUS_LABELS = { DRAFT:'Brouillon', ISSUED:'Émise', CANCELLED:'Annulée' };

const POSOLOGY = ['1×/jour','2×/jour','3×/jour','Matin & soir','Matin, midi, soir','Avant repas','Après repas'];
const DURATION = ['3 j','5 j','7 j','10 j','14 j','21 j','1 mois','3 mois'];
const DOSAGES  = ['100mg','250mg','500mg','1g','5ml','10ml','25mg','50mg'];

const fdate = d => new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
const ftime = d => new Date(d).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
const emptyItem = () => ({ medication:'', dosage:'', posology:'', duration:'' });

/* ══════════════════════════════════════════════════════
   MODAL SUB-COMPONENTS
══════════════════════════════════════════════════════ */

const MedSearch = ({ id, value, onChange, suggestions, onPick }) => {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    const q = value.toLowerCase().trim();
    setList(q ? suggestions.filter(s => s.name.toLowerCase().includes(q)).slice(0,6)
               : suggestions.slice(0,5));
  }, [value, suggestions]);

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div style={{ position:'relative' }}>
        <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#94A3B8', pointerEvents:'none' }}/>
        <input id={id} aria-label="Nom du médicament" value={value} autoComplete="off" placeholder="Nom du médicament…"
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={e => { setOpen(true); e.target.style.borderColor=T; e.target.style.boxShadow=`0 0 0 3px ${T}18`; }}
          onBlur={e  => { e.target.style.borderColor='#E2E8F0'; e.target.style.boxShadow='none'; }}
          style={{ width:'100%', padding:'9px 32px', border:'1.5px solid #E2E8F0', borderRadius:10, fontSize:14, fontWeight:600, fontFamily:'inherit', outline:'none', boxSizing:'border-box', transition:'all .15s', background:'#fff' }}
        />
        {value && (
          <button type="button" aria-label="Effacer le médicament" onMouseDown={() => onChange('')} style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94A3B8', display:'flex', padding:3 }}>
            <X size={12}/>
          </button>
        )}
      </div>
      {open && list.length > 0 && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:600, background:'#fff', border:`1.5px solid ${T}`, borderRadius:12, boxShadow:`0 12px 32px rgba(13,122,135,.16)`, overflow:'hidden' }}>
          <div style={{ padding:'5px 12px 4px', background:'#F0FDFE', fontSize:10, fontWeight:700, color:T, textTransform:'uppercase', letterSpacing:'.08em' }}>
            {value.trim() ? 'Résultats' : 'Fréquents'}
          </div>
          {list.map((m, i) => (
            <div key={i} onMouseDown={() => { onPick(m); setOpen(false); }}
              style={{ padding:'9px 14px', cursor:'pointer', borderBottom:i<list.length-1?'1px solid #F8FAFC':'none', transition:'background .1s' }}
              onMouseOver={e=>e.currentTarget.style.background='#F0FDFE'}
              onMouseOut={e=>e.currentTarget.style.background='transparent'}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:700, fontSize:13, color:'#0F172A' }}>{m.name}</span>
                {m.count > 0 && <span style={{ fontSize:10, color:'#94A3B8', background:'#F1F5F9', padding:'1px 7px', borderRadius:99 }}>×{m.count}</span>}
              </div>
              {(m.dosage || m.posology || m.duration) && (
                <div style={{ fontSize:11, color:'#64748B', marginTop:2, display:'flex', gap:8 }}>
                  {m.dosage   && <span style={{ color:T, fontWeight:600 }}>{m.dosage}</span>}
                  {m.posology && <span>{m.posology}</span>}
                  {m.duration && <span>{m.duration}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Chip = ({ label, selected, onSelect }) => (
  <button type="button" onMouseDown={() => onSelect(label)}
    style={{ padding:'3px 10px', borderRadius:99, border:`1.5px solid ${selected?T:'#E2E8F0'}`, background:selected?T:'#fff', color:selected?'#fff':'#64748B', fontSize:11, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', transition:'all .12s', lineHeight:'18px' }}>
    {label}
  </button>
);

const MedCard = ({ item, index, total, isActive, onActivate, onUpdate, onRemove, suggestions }) => {
  const filled   = item.medication.trim();
  const complete = filled && item.dosage && item.posology && item.duration;
  return (
    <div onMouseDown={onActivate}
      style={{ border:`2px solid ${isActive?T:complete?`${T}45`:'#E2E8F0'}`, borderRadius:13, marginBottom:8, background:isActive?'#fff':complete?'#FAFFFE':'#FAFAFA', transition:'all .18s', boxShadow:isActive?`0 4px 20px ${T}20`:'none', overflow:'hidden', cursor:'pointer' }}>
      <div style={{ padding:'10px 14px', background:isActive?'#F0FDFE':complete?'#F0FDFE80':'#F8FAFC', borderBottom:`1px solid ${isActive?T+'30':'#F1F5F9'}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, minWidth:0, flex:1 }}>
          <div style={{ width:22, height:22, borderRadius:'50%', background:complete?T:isActive?T:'#CBD5E1', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background .18s' }}>
            {complete ? <CheckCircle size={13} color="#fff"/> : <span style={{ fontSize:10, fontWeight:800, color:'#fff' }}>{index+1}</span>}
          </div>
          <span style={{ fontSize:13, fontWeight:700, color:isActive?T:filled?'#1E293B':'#94A3B8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
            {filled ? item.medication : `Médicament ${index+1}`}
          </span>
          {filled && !isActive && (
            <div style={{ display:'flex', gap:4, flexShrink:0, flexWrap:'wrap' }}>
              {item.dosage   && <span style={{ fontSize:10, background:'#E0F2FE', color:'#0369A1', padding:'2px 7px', borderRadius:99, fontWeight:600 }}>{item.dosage}</span>}
              {item.posology && <span style={{ fontSize:10, background:'#F0FDFE', color:T,         padding:'2px 7px', borderRadius:99, fontWeight:600 }}>{item.posology}</span>}
              {item.duration && <span style={{ fontSize:10, background:'#DCFCE7', color:'#166534', padding:'2px 7px', borderRadius:99, fontWeight:600 }}>{item.duration}</span>}
            </div>
          )}
        </div>
        {total > 1 && (
          <button type="button" onMouseDown={e => { e.stopPropagation(); onRemove(index); }}
            style={{ background:'none', border:'none', cursor:'pointer', color:'#CBD5E1', display:'flex', alignItems:'center', padding:'3px 6px', borderRadius:6, transition:'all .15s', flexShrink:0 }}
            onMouseOver={e=>{e.currentTarget.style.background='#FEE2E2';e.currentTarget.style.color='#EF4444';}}
            onMouseOut={e=>{e.currentTarget.style.background='none';e.currentTarget.style.color='#CBD5E1';}}>
            <Trash2 size={12}/>
          </button>
        )}
      </div>
      {isActive && (
        <div style={{ padding:'14px 16px' }}>
          <div style={{ marginBottom:14 }}>
            <label htmlFor={`prescription-medication-${index}`} style={{ fontSize:10, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:6 }}>Médicament *</label>
            <MedSearch id={`prescription-medication-${index}`} value={item.medication} onChange={v => onUpdate(index,'medication',v.toUpperCase())} suggestions={suggestions}
              onPick={m => {
                onUpdate(index,'medication',m.name.toUpperCase());
                if(m.dosage)   onUpdate(index,'dosage',m.dosage);
                if(m.posology) onUpdate(index,'posology',m.posology);
                if(m.duration) onUpdate(index,'duration',m.duration);
              }}/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            {[
              { field:'dosage',   label:'Dosage',    chips:DOSAGES,  placeholder:'500mg' },
              { field:'posology', label:'Posologie', chips:POSOLOGY, placeholder:'2×/jour' },
              { field:'duration', label:'Durée',     chips:DURATION, placeholder:'7 j' },
            ].map(({ field, label, chips, placeholder }) => (
              <div key={field}>
                <label htmlFor={`prescription-${field}-${index}`} style={{ fontSize:10, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:5 }}>{label}</label>
                <input id={`prescription-${field}-${index}`} aria-label={`${label} du médicament ${index + 1}`} value={item[field]} placeholder={placeholder} onChange={e => onUpdate(index,field,e.target.value)}
                  onFocus={e=>{e.target.style.borderColor=T;e.target.style.boxShadow=`0 0 0 3px ${T}18`;}}
                  onBlur={e=>{e.target.style.borderColor='#E2E8F0';e.target.style.boxShadow='none';}}
                  style={{ width:'100%', padding:'8px 10px', border:'1.5px solid #E2E8F0', borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box', transition:'all .15s' }}/>
                <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginTop:6 }}>
                  {chips.map(c => <Chip key={c} label={c} selected={item[field]===c} onSelect={v => onUpdate(index,field,v)}/>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const PrescriptionPreview = ({ items, notes, patient }) => {
  const filled = items.filter(i => i.medication.trim());
  const today  = new Date().toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
  return (
    <div style={{ background:'#fff', borderRadius:12, overflow:'hidden', boxShadow:'0 2px 16px rgba(0,0,0,.10)', border:'1px solid #E2E8F0', fontFamily:'Georgia, serif' }}>
      <div style={{ background:`linear-gradient(135deg,${T},${T_DARK})`, padding:'14px 18px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-18, right:-18, width:70, height:70, borderRadius:'50%', background:'rgba(255,255,255,.06)' }}/>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', position:'relative' }}>
          <div>
            <div style={{ fontFamily:'Plus Jakarta Sans, sans-serif', fontWeight:800, fontSize:14, color:'#fff', letterSpacing:1.2 }}>ORDONNANCE</div>
            <div style={{ fontSize:9, color:'rgba(255,255,255,.65)', marginTop:3 }}>Cabinet Dentaire · DentalPM Madagascar</div>
          </div>
          <div style={{ fontSize:9, color:'rgba(255,255,255,.7)', textAlign:'right', display:'flex', alignItems:'center', gap:3 }}>
            <Calendar size={9}/> {today}
          </div>
        </div>
      </div>
      <div style={{ padding:'9px 16px', background:'#F8FAFC', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', gap:9 }}>
        <div style={{ width:28, height:28, borderRadius:'50%', background:`${T}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:10, fontWeight:800, color:T }}>
          {patient ? `${patient.first_name[0]}${patient.last_name[0]}` : 'P'}
        </div>
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:'#0F172A', fontFamily:'sans-serif' }}>
            {patient ? `${patient.first_name} ${patient.last_name}` : 'Patient'}
          </div>
          {patient?.date_of_birth && (
            <div style={{ fontSize:10, color:'#94A3B8', fontFamily:'sans-serif' }}>
              {Math.floor((Date.now()-new Date(patient.date_of_birth))/31557600000)} ans
            </div>
          )}
        </div>
      </div>
      <div style={{ padding:'12px 16px', minHeight:160 }}>
        {filled.length === 0 ? (
          <div style={{ textAlign:'center', padding:'28px 0', color:'#CBD5E1' }}>
            <Pill size={26} style={{ margin:'0 auto 8px', display:'block', opacity:.35 }}/>
            <p style={{ fontSize:11, margin:0, fontFamily:'sans-serif', color:'#94A3B8' }}>Saisissez un médicament<br/>pour voir l'aperçu</p>
          </div>
        ) : filled.map((item, i) => (
          <div key={i} style={{ marginBottom:12, paddingBottom:12, borderBottom:i<filled.length-1?'1px dashed #E2E8F0':'none' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:4 }}>
              <div style={{ width:18, height:18, borderRadius:'50%', background:T, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                <span style={{ fontSize:9, fontWeight:700, color:'#fff', fontFamily:'sans-serif' }}>{i+1}</span>
              </div>
              <div style={{ fontWeight:700, fontSize:13, color:'#0F172A', fontFamily:'sans-serif' }}>{item.medication.toUpperCase()}</div>
            </div>
            <div style={{ paddingLeft:26, display:'flex', flexDirection:'column', gap:2 }}>
              {item.dosage   && <div style={{ fontSize:11, color:'#475569', display:'flex', alignItems:'center', gap:5, fontFamily:'sans-serif' }}><ChevronRight size={9} color={T}/><span><strong>Dosage :</strong> {item.dosage}</span></div>}
              {item.posology && <div style={{ fontSize:11, color:'#475569', display:'flex', alignItems:'center', gap:5, fontFamily:'sans-serif' }}><ChevronRight size={9} color={T}/><span><strong>Posologie :</strong> {item.posology}</span></div>}
              {item.duration && <div style={{ fontSize:11, color:'#475569', display:'flex', alignItems:'center', gap:5, fontFamily:'sans-serif' }}><ChevronRight size={9} color={T}/><span><strong>Durée :</strong> {item.duration}</span></div>}
            </div>
          </div>
        ))}
        {notes && (
          <div style={{ marginTop:6, padding:'8px 11px', background:'#FFF8E7', borderRadius:8, borderLeft:`3px solid #F59E0B`, fontSize:11, color:'#92400E', fontStyle:'italic', fontFamily:'sans-serif' }}>
            {notes}
          </div>
        )}
      </div>
      <div style={{ padding:'10px 16px 14px', borderTop:'1px solid #F1F5F9', display:'flex', justifyContent:'flex-end' }}>
        <div style={{ textAlign:'center', width:120 }}>
          <div style={{ height:28, borderBottom:'1px solid #334155', marginBottom:4 }}/>
          <div style={{ fontSize:9, color:'#94A3B8', fontFamily:'sans-serif', letterSpacing:.5 }}>Signature du praticien</div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   PRESCRIPTION MODAL
══════════════════════════════════════════════════════ */
const PrescriptionModal = ({ open, onClose, title, patient, suggestions, saving, onSubmit, submitLabel, formData, setFormData }) => {
  const [activeIdx, setActiveIdx] = useState(null);

  // Réinitialise activeIdx à chaque ouverture :
  // – CREATE : card 0 expanded (prêt à saisir)
  // – EDIT   : toutes collapsed (l'utilisateur voit d'abord la liste complète)
  useEffect(() => {
    if (open) {
      const isEdit = formData.items.some(i => i.medication?.trim());
      setActiveIdx(isEdit ? null : 0);
    }
  }, [open]); // eslint-disable-line

  const addItem = () => {
    setFormData(f => ({ ...f, items:[...f.items, emptyItem()] }));
    setTimeout(() => setActiveIdx(formData.items.length), 10);
  };
  const removeItem = i => {
    setFormData(f => ({ ...f, items:f.items.length>1?f.items.filter((_,idx)=>idx!==i):[emptyItem()] }));
    setActiveIdx(Math.max(0, i-1));
  };
  const updateItem = (i, field, val) => setFormData(f => {
    const it = [...f.items];
    it[i] = { ...it[i], [field]: field === 'medication' ? val.toUpperCase() : val };
    return { ...f, items: it };
  });

  const filled   = formData.items.filter(i => i.medication.trim());
  const complete = filled.filter(i => i.medication && i.dosage && i.posology && i.duration);
  const progress = filled.length === 0 ? 0 : Math.round(complete.length / Math.max(filled.length,1) * 100);

  if (!open) return null;

  return (
    <div onClick={e => e.target===e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(8,20,40,.78)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'16px', backdropFilter:'blur(4px)', overflowY:'auto' }}>
      <style>{`
        @keyframes dpm-slide-up { from{opacity:0;transform:translateY(20px) scale(.98)} to{opacity:1;transform:none} }
        @keyframes dpm-spin { to{transform:rotate(360deg)} }
        .dpm-scroll::-webkit-scrollbar{width:4px}
        .dpm-scroll::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:99px}
      `}</style>
      <div style={{ background:'#F1F5F9', width:'100%', maxWidth: 1060, borderRadius:20, overflow:'hidden', boxShadow:'0 40px 80px rgba(0,0,0,.38)', border:'1px solid rgba(255,255,255,.1)', animation:'dpm-slide-up .22s cubic-bezier(.22,.61,.36,1)', display:'flex', flexDirection:'column', maxHeight:'calc(100dvh - 32px)', minHeight:500 }}>

        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,${T},${T_DARK})`, padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-30, right:100, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }}/>
          <div style={{ display:'flex', alignItems:'center', gap:14, position:'relative' }}>
            <div style={{ width:42, height:42, borderRadius:13, background:'rgba(255,255,255,.18)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, border:'1px solid rgba(255,255,255,.25)' }}>
              <Stethoscope size={19} color="#fff"/>
            </div>
            <div>
              <h2 style={{ fontFamily:'Plus Jakarta Sans, sans-serif', fontWeight:800, fontSize:17, color:'#fff', margin:0 }}>{title}</h2>
              {patient && (
                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3 }}>
                  <div style={{ width:16, height:16, borderRadius:'50%', background:'rgba(255,255,255,.28)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800, color:'#fff' }}>
                    {patient.first_name[0]}{patient.last_name[0]}
                  </div>
                  <p style={{ fontSize:12, color:'rgba(255,255,255,.8)', margin:0 }}>
                    {patient.first_name} {patient.last_name}
                    {patient.date_of_birth && ` — ${Math.floor((Date.now()-new Date(patient.date_of_birth))/31557600000)} ans`}
                  </p>
                </div>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose}
            style={{ width:34, height:34, borderRadius:9, background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.2)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,.85)', flexShrink:0, transition:'all .15s' }}
            onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,.28)'}
            onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,.15)'}>
            <X size={15}/>
          </button>
        </div>

        {/* Progress */}
        {filled.length > 0 && (
          <div style={{ height:3, background:'#E2E8F0', flexShrink:0 }}>
            <div style={{ height:'100%', width:`${progress}%`, background:`linear-gradient(90deg,${T},#13A3B4)`, transition:'width .4s ease', borderRadius:'0 99px 99px 0' }}/>
          </div>
        )}

        {/* Body split */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', flex:1, overflow:'hidden', minHeight:400 }}>
          {/* Left — form */}
          <div style={{ display:'flex', flexDirection:'column', overflow:'hidden', borderRight:'1px solid #E2E8F0' }}>
            <div style={{ padding:'11px 18px', borderBottom:'1px solid #E2E8F0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Pill size={15} color={T}/>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:'#0F172A' }}>Médicaments</div>
                  <div style={{ fontSize:11, color:'#94A3B8', marginTop:1 }}>Ajoutez plusieurs médicaments dans la même ordonnance</div>
                </div>
                {filled.length > 0 && <span style={{ background:`${T}15`, color:T, fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:99 }}>{filled.length}/{formData.items.length}</span>}
              </div>
              <button type="button" onClick={addItem}
                style={{ padding:'6px 14px', borderRadius:9, background:T, color:'#fff', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:5, boxShadow:`0 2px 8px ${T}40`, transition:'filter .15s', whiteSpace:'nowrap' }}
                onMouseOver={e=>e.currentTarget.style.filter='brightness(1.1)'}
                onMouseOut={e=>e.currentTarget.style.filter='none'}>
                <Plus size={12}/> Ajouter un autre médicament
              </button>
            </div>
            <div style={{ flex:1, overflowY:'scroll', overflowX:'hidden', padding:'12px 14px' }}>
              {formData.items.map((item, i) => (
                <MedCard key={i} item={item} index={i} total={formData.items.length}
                  isActive={activeIdx===i} onActivate={() => setActiveIdx(i)}
                  onUpdate={updateItem} onRemove={removeItem} suggestions={suggestions}/>
              ))}
            </div>
            <div style={{ padding:'0 18px 12px', background:'#fff', flexShrink:0 }}>
              <button type="button" onClick={addItem}
                style={{ width:'100%', padding:'8px 14px', borderRadius:10, border:'1.5px dashed #7DD3DA', background:'#F0FDFE', cursor:'pointer', fontSize:12, fontWeight:700, color:T, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <Plus size={12}/> Ajouter un médicament supplémentaire
              </button>
            </div>
            <div style={{ padding:'12px 18px', background:'#fff', borderTop:'1px solid #E2E8F0', flexShrink:0 }}>
              <label htmlFor="prescription-notes" style={{ fontSize:10, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:5 }}>Notes / Instructions complémentaires</label>
              <textarea id="prescription-notes" aria-label="Notes et instructions complémentaires" value={formData.notes} onChange={e => setFormData({...formData, notes:e.target.value})}
                placeholder="Ex : Prendre avec de la nourriture, éviter l'alcool…" rows={2}
                onFocus={e=>{e.target.style.borderColor=T;e.target.style.boxShadow=`0 0 0 3px ${T}18`;}}
                onBlur={e=>{e.target.style.borderColor='#E2E8F0';e.target.style.boxShadow='none';}}
                style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #E2E8F0', borderRadius:10, fontSize:13, fontFamily:'inherit', resize:'none', outline:'none', boxSizing:'border-box', lineHeight:1.6, transition:'all .15s' }}/>
            </div>
          </div>

          {/* Right — preview */}
          <div style={{ display:'flex', flexDirection:'column', background:'#E8EDF5', overflow:'hidden' }}>
            <div style={{ padding:'9px 14px', borderBottom:'1px solid #D4DAE8', background:'#DDE4EF', flexShrink:0, display:'flex', alignItems:'center', gap:6 }}>
              <Sparkles size={12} color={T}/>
              <span style={{ fontSize:10, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.1em' }}>Aperçu en temps réel</span>
            </div>
            <div style={{ flex:1, overflowY:'scroll', padding:'14px 12px' }}>
              <PrescriptionPreview items={formData.items} notes={formData.notes} patient={patient}/>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 24px', background:'#fff', borderTop:'1px solid #E2E8F0', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            {filled.length === 0 ? (
              <div style={{ display:'flex', alignItems:'center', gap:5, color:'#94A3B8', fontSize:12 }}>
                <AlertCircle size={13}/> Ajoutez au moins un médicament pour continuer
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:5, color:complete.length===filled.length?'#059669':'#F59E0B', fontSize:12, fontWeight:600 }}>
                <CheckCircle size={13}/>
                {filled.length} médicament{filled.length>1?'s':''} · {progress}% complété
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button type="button" onClick={onClose}
              style={{ padding:'9px 20px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, color:'#475569', transition:'all .15s', fontFamily:'inherit' }}
              onMouseOver={e=>e.currentTarget.style.borderColor='#94A3B8'}
              onMouseOut={e=>e.currentTarget.style.borderColor='#E2E8F0'}>
              Annuler
            </button>
            <button type="button" onClick={onSubmit} disabled={saving||filled.length===0}
              style={{ padding:'9px 24px', borderRadius:10, background:filled.length>0?`linear-gradient(135deg,${T},#13A3B4)`:'#E2E8F0', color:filled.length>0?'#fff':'#94A3B8', border:'none', cursor:filled.length>0?'pointer':'not-allowed', fontSize:14, fontWeight:700, display:'flex', alignItems:'center', gap:8, boxShadow:filled.length>0?`0 4px 16px ${T}40`:'none', transition:'all .2s', fontFamily:'inherit' }}
              onMouseOver={e=>{if(filled.length>0)e.currentTarget.style.filter='brightness(1.08)';}}
              onMouseOut={e=>e.currentTarget.style.filter='none'}>
              {saving
                ? <><Loader2 size={15} style={{ animation:'dpm-spin .8s linear infinite' }}/> Enregistrement…</>
                : <><CheckCircle size={15}/> {submitLabel}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   STATUS BADGE
══════════════════════════════════════════════════════ */
const StatusBadge = ({ status }) => {
  const s = STATUS_COLORS[status] || STATUS_COLORS.DRAFT;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:99, background:s.bg, border:`1px solid ${s.border}`, fontSize:11, fontWeight:700, color:s.text }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:s.dot, flexShrink:0 }}/>
      {STATUS_LABELS[status]}
    </span>
  );
};

/* ══════════════════════════════════════════════════════
   HISTORY PANEL — liste timeline des ordonnances
══════════════════════════════════════════════════════ */
const HistoryPanel = ({ prescriptions, loading, onEdit, onIssue, onCancel, onPrint, onDownload }) => {
  const [filter, setFilter] = useState('ALL');
  const [expanded, setExpanded] = useState(null);

  const FILTERS = [
    { key:'ALL',       label:'Toutes',     count: prescriptions.length },
    { key:'DRAFT',     label:'Brouillons', count: prescriptions.filter(p=>p.status==='DRAFT').length },
    { key:'ISSUED',    label:'Émises',     count: prescriptions.filter(p=>p.status==='ISSUED').length },
    { key:'CANCELLED', label:'Annulées',   count: prescriptions.filter(p=>p.status==='CANCELLED').length },
  ];

  const visible = filter === 'ALL' ? prescriptions : prescriptions.filter(p => p.status === filter);

  return (
    <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', overflow:'hidden' }}>

      {/* Panel header */}
      <div style={{ padding:'16px 20px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', justifyContent:'space-between', background:'linear-gradient(135deg,#F8FAFC,#F1F5F9)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:`${T}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <History size={16} color={T}/>
          </div>
          <div>
            <div style={{ fontWeight:800, fontSize:15, color:'#0F172A' }}>Historique des ordonnances</div>
            <div style={{ fontSize:12, color:'#94A3B8', marginTop:1 }}>
              {prescriptions.length} ordonnance{prescriptions.length !== 1 ? 's' : ''} au total
            </div>
          </div>
        </div>
        {/* Stats capsules */}
        <div style={{ display:'flex', gap:6 }}>
          {[
            { label:'Émises', count: prescriptions.filter(p=>p.status==='ISSUED').length, color:'#059669', bg:'#ECFDF5' },
            { label:'Brouillons', count: prescriptions.filter(p=>p.status==='DRAFT').length, color:'#D97706', bg:'#FFFBEB' },
          ].map(s => s.count > 0 && (
            <div key={s.label} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', background:s.bg, borderRadius:99, fontSize:11, fontWeight:700, color:s.color }}>
              <TrendingUp size={10}/> {s.count} {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ padding:'10px 20px', borderBottom:'1px solid #F1F5F9', display:'flex', gap:6, background:'#FAFAFA' }}>
        {FILTERS.map(f => (
          <button type="button" key={f.key} onClick={() => setFilter(f.key)}
            style={{ padding:'5px 14px', borderRadius:99, border:`1.5px solid ${filter===f.key?T:'#E2E8F0'}`, background:filter===f.key?T:'#fff', color:filter===f.key?'#fff':'#64748B', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6, transition:'all .15s', fontFamily:'inherit' }}>
            {f.label}
            {f.count > 0 && (
              <span style={{ background:filter===f.key?'rgba(255,255,255,.28)':'#F1F5F9', color:filter===f.key?'#fff':'#94A3B8', fontSize:10, fontWeight:700, padding:'0px 6px', borderRadius:99, minWidth:18, textAlign:'center' }}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Timeline list */}
      <div style={{ padding:'8px 0' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'36px 0' }}>
            <Loader2 size={24} style={{ animation:'spin 1s linear infinite', color:T, margin:'0 auto', display:'block' }}/>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 0', color:'#94A3B8' }}>
            <FileText size={36} style={{ margin:'0 auto 12px', display:'block', opacity:.2 }}/>
            <p style={{ margin:0, fontSize:13, fontWeight:600, color:'#64748B' }}>Aucune ordonnance</p>
            <p style={{ margin:'4px 0 0', fontSize:12, color:'#94A3B8' }}>
              {filter !== 'ALL' ? 'Aucune ordonnance dans cette catégorie' : 'Créez votre première ordonnance'}
            </p>
          </div>
        ) : visible.map((p, idx) => {
          const isExp = expanded === p.id;
          const sc = STATUS_COLORS[p.status] || STATUS_COLORS.DRAFT;
          const meds = ((p.content || p.content_json)?.items || []).filter(i => i.medication);
          return (
            <div key={p.id} style={{ position:'relative' }}>
              {/* Timeline line */}
              {idx < visible.length - 1 && (
                <div style={{ position:'absolute', left:36, top:52, bottom:0, width:1, background:'#F1F5F9', zIndex:0 }}/>
              )}

              <div style={{ padding:'12px 20px', display:'flex', gap:14, alignItems:'flex-start', position:'relative', transition:'background .15s', cursor:'pointer' }}
                onClick={() => setExpanded(isExp ? null : p.id)}
                onMouseOver={e=>e.currentTarget.style.background='#FAFAFA'}
                onMouseOut={e=>e.currentTarget.style.background='transparent'}>

                {/* Timeline dot */}
                <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', zIndex:1 }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background:sc.bg, border:`2px solid ${sc.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {p.status === 'ISSUED'    && <CheckCircle size={14} color={sc.dot}/>}
                    {p.status === 'DRAFT'     && <Clock size={14} color={sc.dot}/>}
                    {p.status === 'CANCELLED' && <XCircle size={14} color={sc.dot}/>}
                  </div>
                </div>

                {/* Content */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:6 }}>
                    <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:7 }}>
                      <span style={{ fontFamily:'Plus Jakarta Sans, sans-serif', fontWeight:800, fontSize:13, color:'#0F172A', letterSpacing:.2 }}>
                        {p.number}
                      </span>
                      <StatusBadge status={p.status}/>
                    </div>
                    {/* Actions */}
                    <div style={{ display:'flex', gap:2, flexShrink:0 }} onClick={e => e.stopPropagation()}>
                      {p.status === 'DRAFT' && (
                        <>
                          <ActionBtn icon={<Edit2 size={12}/>} title="Modifier" onClick={() => onEdit(p)}/>
                          <ActionBtn icon={<Send size={12}/>} title="Émettre" color="#059669" onClick={() => onIssue(p)}/>
                        </>
                      )}
                      <ActionBtn icon={<Printer size={12}/>} title="Imprimer" onClick={() => onPrint(p.id)}/>
                      {p.status !== 'CANCELLED' && <ActionBtn icon={<Download size={12}/>} title="PDF" onClick={() => onDownload(p)}/>}
                      {p.status !== 'CANCELLED' && <ActionBtn icon={<XCircle size={12}/>} title="Annuler" color="#DC2626" onClick={() => onCancel(p)}/>}
                    </div>
                  </div>

                  {/* Date + médicaments */}
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6, fontSize:11, color:'#94A3B8' }}>
                    <Calendar size={10}/>
                    <span>{fdate(p.created_at)}</span>
                    <span style={{ color:'#E2E8F0' }}>·</span>
                    <Clock size={10}/>
                    <span>{ftime(p.created_at)}</span>
                  </div>

                  {meds.length > 0 && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                      {meds.slice(0, isExp ? meds.length : 3).map((m, mi) => (
                        <span key={mi} style={{ fontSize:11, background:'#F0FDFE', color:T, padding:'2px 9px', borderRadius:99, border:`1px solid ${T}25`, fontWeight:600 }}>
                          <Pill size={9} style={{ marginRight:4, verticalAlign:'middle' }}/>{String(m.medication).toUpperCase()}{m.dosage?` ${m.dosage}`:''}
                        </span>
                      ))}
                      {!isExp && meds.length > 3 && (
                        <span style={{ fontSize:11, background:'#F8FAFC', color:'#94A3B8', padding:'2px 9px', borderRadius:99, border:'1px solid #E2E8F0', fontWeight:600 }}>
                          +{meds.length - 3} autres
                        </span>
                      )}
                    </div>
                  )}

                  {/* Expanded detail */}
                  {isExp && (
                    <div style={{ marginTop:10, padding:'10px 14px', background:'#F8FAFC', borderRadius:10, border:'1px solid #F1F5F9' }}>
                      {meds.map((m, mi) => (
                        <div key={mi} style={{ marginBottom:mi<meds.length-1?8:0, paddingBottom:mi<meds.length-1?8:0, borderBottom:mi<meds.length-1?'1px dashed #E2E8F0':'none' }}>
                          <div style={{ fontWeight:700, fontSize:12, color:'#0F172A', marginBottom:2 }}>{String(m.medication).toUpperCase()}</div>
                          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                            {m.dosage   && <span style={{ fontSize:11, color:'#64748B' }}>Dosage : <strong>{m.dosage}</strong></span>}
                            {m.posology && <span style={{ fontSize:11, color:'#64748B' }}>Posologie : <strong>{m.posology}</strong></span>}
                            {m.duration && <span style={{ fontSize:11, color:'#64748B' }}>Durée : <strong>{m.duration}</strong></span>}
                          </div>
                        </div>
                      ))}
                      {(p.content || p.content_json)?.notes && (
                        <div style={{ marginTop:8, padding:'6px 10px', background:'#FFF8E7', borderRadius:7, borderLeft:'3px solid #F59E0B', fontSize:11, color:'#92400E', fontStyle:'italic' }}>
                          {(p.content || p.content_json).notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ActionBtn = ({ icon, title, color, onClick }) => (
  <button type="button" title={title} onClick={onClick}
    style={{ width:28, height:28, borderRadius:7, background:'#F8FAFC', border:'1px solid #E2E8F0', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:color||'#64748B', transition:'all .15s' }}
    onMouseOver={e=>{e.currentTarget.style.background=color?`${color}12`:'#F1F5F9';e.currentTarget.style.borderColor=color||'#CBD5E1';}}
    onMouseOut={e=>{e.currentTarget.style.background='#F8FAFC';e.currentTarget.style.borderColor='#E2E8F0';}}>
    {icon}
  </button>
);

/* ══════════════════════════════════════════════════════
   PAGE PRINCIPALE — PatientPrescriptions
══════════════════════════════════════════════════════ */
const PatientPrescriptions = ({ patientIdOverride = null, embedded = false }) => {
  const params = useParams();
  const patientId = patientIdOverride || params.patientId || params.id;
  const navigate = useNavigate();

  const [patient, setPatient]             = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [suggestions, setSuggestions]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [isCreateOpen, setIsCreateOpen]   = useState(false);
  const [isEditOpen, setIsEditOpen]       = useState(false);
  const [selPresc, setSelPresc]           = useState(null);
  const [saving, setSaving]               = useState(false);

  const emptyForm = { items:[emptyItem()], notes:'' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!patientId || patientId === 'undefined') { setLoading(false); return; }
    fetchPatient(); fetchPrescriptions(); fetchSuggestions();
  }, [patientId]);

  const fetchPatient = async () => {
    try { const r = await axios.get(`${API}/patients/${patientId}`, authH()); setPatient(r.data); } catch {}
  };
  const fetchSuggestions = async () => {
    try { const r = await axios.get(`${API}/prescriptions/medications`, authH()); setSuggestions(r.data.medications||[]); } catch { setSuggestions([]); }
  };
  const fetchPrescriptions = async () => {
    try { const r = await axios.get(`${API}/patients/${patientId}/prescriptions`, authH()); setPrescriptions(r.data.prescriptions||[]); }
    catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    const valid = form.items
      .filter(i => i.medication.trim())
      .map(i => ({ ...i, medication: i.medication.trim().toUpperCase() }));
    if (!valid.length) { toast.error('Ajoutez au moins un médicament'); return; }
    setSaving(true);
    try {
      const r = await axios.post(`${API}/patients/${patientId}/prescriptions`, { content:{ items:valid, notes:form.notes } }, authH());
      toast.success('Ordonnance créée');
      setIsCreateOpen(false); setForm(emptyForm); fetchPrescriptions(); fetchSuggestions();
      const id = r.data.prescription?.id;
      if (id && window.confirm('Imprimer maintenant ?')) handlePrintById(id);
    } catch(e) { toast.error(e.response?.data?.error || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${API}/patients/${patientId}/prescriptions/${selPresc.id}`,
        { content:{ items:form.items.filter(i=>i.medication.trim()).map(i => ({ ...i, medication: i.medication.trim().toUpperCase() })), notes:form.notes } },
        authH()
      );
      toast.success('Mise à jour'); setIsEditOpen(false); setSelPresc(null); setForm(emptyForm); fetchPrescriptions();
    } catch(e) { toast.error(e.response?.data?.error==='PRESCRIPTION_LOCKED'?'Ordonnance verrouillée':'Erreur'); }
    finally { setSaving(false); }
  };

  const handleIssue = async p => {
    if (!window.confirm('Émettre cette ordonnance ? Action irréversible.')) return;
    try { await axios.post(`${API}/prescriptions/${p.id}/issue`, {}, authH()); toast.success('Ordonnance émise'); fetchPrescriptions(); }
    catch(e) { toast.error(e.response?.data?.error || 'Erreur'); }
  };

  const handleCancel = async p => {
    if (!window.confirm('Annuler cette ordonnance ?')) return;
    try { await axios.post(`${API}/prescriptions/${p.id}/cancel`, {}, authH()); toast.success('Ordonnance annulée'); fetchPrescriptions(); }
    catch(e) { toast.error(e.response?.data?.error || 'Erreur'); }
  };

  const handlePrintById = id => {
    fetch(`${API}/prescriptions/${id}/pdf`, { credentials:'include' })
      .then(r => { if(!r.ok) throw new Error(); return r.blob(); })
      .then(blob => { const url=window.URL.createObjectURL(blob); window.open(url,'_blank'); setTimeout(()=>window.URL.revokeObjectURL(url),60000); })
      .catch(() => toast.error('Erreur impression'));
  };

  const handleDownload = async p => {
    try {
      const r = await fetch(`${API}/prescriptions/${p.id}/pdf`, { credentials:'include' });
      if (!r.ok) throw new Error();
      const blob=await r.blob(), url=window.URL.createObjectURL(blob), a=document.createElement('a');
      a.href=url; a.download=`${p.number}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url); toast.success('PDF téléchargé');
    } catch { toast.error('Erreur PDF'); }
  };

  const openEdit = p => {
    // Le backend peut renvoyer 'content' ou 'content_json' selon la version
    const content = p.content || p.content_json || {};
    const items   = Array.isArray(content.items) && content.items.length
      ? content.items
      : [emptyItem()];
    const nextForm = { items, notes: content.notes || '' };
    setSelPresc(() => p);
    setForm(nextForm);
    setIsEditOpen(true);
  };

  const age = patient?.date_of_birth ? Math.floor((Date.now()-new Date(patient.date_of_birth))/31557600000) : null;

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:240 }}>
      <Loader2 size={32} style={{ animation:'spin 1s linear infinite', color:T }}/>
    </div>
  );

  return (
    <div style={{ maxWidth: 980, margin:'0 auto', padding:'0 16px 40px', fontFamily:'Plus Jakarta Sans, sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── PAGE HEADER ────────────────────────── */}
      <div style={{ padding:'20px 0 18px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>

        {/* Gauche : retour + infos patient */}
        <div style={{ display:'flex', alignItems:'center', gap:16, minWidth:0, flex:1 }}>

          {/* Bouton Retour */}
          {!embedded && (
          <button type="button" onClick={() => navigate(-1)}
            style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:11, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, color:'#475569', flexShrink:0, transition:'all .18s', boxShadow:'0 1px 4px rgba(0,0,0,.06)', fontFamily:'inherit' }}
            onMouseOver={e=>{e.currentTarget.style.borderColor=T;e.currentTarget.style.color=T;e.currentTarget.style.background='#F0FDFE';e.currentTarget.style.boxShadow=`0 2px 10px ${T}18`;}}
            onMouseOut={e=>{e.currentTarget.style.borderColor='#E2E8F0';e.currentTarget.style.color='#475569';e.currentTarget.style.background='#fff';e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.06)';}}>
            <ArrowLeft size={15}/> Retour
          </button>
          )}

          {/* Patient card */}
          {patient && (
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', background:'#fff', borderRadius:12, border:'1px solid #E2E8F0', boxShadow:'0 1px 4px rgba(0,0,0,.06)', minWidth:0 }}>
              <div style={{ width:40, height:40, borderRadius:'50%', background:`linear-gradient(135deg,${T},#13A3B4)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span style={{ fontSize:14, fontWeight:800, color:'#fff' }}>
                  {patient.first_name[0]}{patient.last_name[0]}
                </span>
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontWeight:800, fontSize:15, color:'#0F172A', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {patient.first_name} {patient.last_name}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:2 }}>
                  {age && <span style={{ fontSize:11, color:'#64748B', fontWeight:600 }}>{age} ans</span>}
                  {patient.phone && <><span style={{ color:'#E2E8F0' }}>·</span><span style={{ fontSize:11, color:'#94A3B8' }}>{patient.phone}</span></>}
                </div>
              </div>
            </div>
          )}

          {/* Titre section */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:11, background:`${T}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <FileText size={17} color={T}/>
            </div>
            <div>
              <h1 style={{ fontWeight:800, fontSize:20, color:'#0F172A', margin:0, lineHeight:1.2 }}>Ordonnances</h1>
              <div style={{ fontSize:12, color:'#94A3B8', marginTop:1 }}>
                {prescriptions.length} au total
              </div>
            </div>
          </div>
        </div>

        {/* Droite : bouton nouvelle ordonnance */}
        <button type="button" onClick={() => { setForm(emptyForm); setIsCreateOpen(true); }}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 22px', borderRadius:12, background:`linear-gradient(135deg,${T},#13A3B4)`, color:'#fff', border:'none', cursor:'pointer', fontSize:14, fontWeight:700, boxShadow:`0 4px 18px ${T}40`, transition:'all .18s', flexShrink:0, fontFamily:'inherit' }}
          onMouseOver={e=>e.currentTarget.style.filter='brightness(1.08)'}
          onMouseOut={e=>e.currentTarget.style.filter='none'}>
          <Plus size={16}/> Nouvelle ordonnance
        </button>
      </div>

      {/* ── HISTORY PANEL ──────────────────────── */}
      <HistoryPanel
        prescriptions={prescriptions}
        loading={loading}
        onEdit={openEdit}
        onIssue={handleIssue}
        onCancel={handleCancel}
        onPrint={handlePrintById}
        onDownload={handleDownload}
      />

      {/* ── MODALS ─────────────────────────────── */}
      <PrescriptionModal
        open={isCreateOpen} onClose={() => { setIsCreateOpen(false); setForm(emptyForm); }}
        title="Nouvelle ordonnance" patient={patient}
        suggestions={suggestions} saving={saving}
        onSubmit={handleCreate} submitLabel="Créer l'ordonnance"
        formData={form} setFormData={setForm}/>

      <PrescriptionModal
        open={isEditOpen} onClose={() => { setIsEditOpen(false); setSelPresc(null); setForm(emptyForm); }}
        title={`Modifier ${selPresc?.number||''}`} patient={patient}
        suggestions={suggestions} saving={saving}
        onSubmit={handleUpdate} submitLabel="Enregistrer les modifications"
        formData={form} setFormData={setForm}/>
    </div>
  );
};

export default PatientPrescriptions;
