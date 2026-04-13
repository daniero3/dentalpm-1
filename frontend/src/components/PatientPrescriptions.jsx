import React, { useState, useEffect, useRef } from 'react';
import {
  X, Plus, Trash2, Search, ChevronRight, Stethoscope,
  Pill, Calendar, CheckCircle, Loader2, AlertCircle, Sparkles
} from 'lucide-react';

const T      = '#0D7A87';
const T_DARK = '#0A5F6A';
const T_LIGHT = '#E0F7FA';

const POSOLOGY = ['1×/jour','2×/jour','3×/jour','Matin & soir','Matin, midi, soir','Avant repas','Après repas'];
const DURATION = ['3 j','5 j','7 j','10 j','14 j','21 j','1 mois','3 mois'];
const DOSAGES  = ['100mg','250mg','500mg','1g','5ml','10ml','25mg','50mg'];

const MOCK_SUGGESTIONS = [
  { name:'Amoxicilline', dosage:'500mg', posology:'3×/jour', duration:'7 j', count:12 },
  { name:'Ibuprofène', dosage:'400mg', posology:'3×/jour', duration:'5 j', count:8 },
  { name:'Paracétamol', dosage:'1g', posology:'3×/jour', duration:'5 j', count:15 },
  { name:'Métronidazole', dosage:'500mg', posology:'3×/jour', duration:'7 j', count:6 },
  { name:'Clindamycine', dosage:'300mg', posology:'3×/jour', duration:'7 j', count:4 },
  { name:'Diclofénac', dosage:'50mg', posology:'2×/jour', duration:'5 j', count:5 },
  { name:'Codéine phosphate', dosage:'30mg', posology:'3×/jour', duration:'3 j', count:3 },
];

const emptyItem = () => ({ medication:'', dosage:'', posology:'', duration:'' });

/* ── Autocomplete ─────────────────────────── */
const MedSearch = ({ value, onChange, suggestions, onPick }) => {
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
        <input
          value={value}
          autoComplete="off"
          placeholder="Nom du médicament…"
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={e => { setOpen(true); e.target.style.borderColor = T; e.target.style.boxShadow = `0 0 0 3px ${T}18`; }}
          onBlur={e  => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }}
          style={{ width:'100%', padding:'9px 32px', border:'1.5px solid #E2E8F0', borderRadius:10, fontSize:14, fontWeight:600, fontFamily:'inherit', outline:'none', boxSizing:'border-box', transition:'all .15s', background:'#fff' }}
        />
        {value && (
          <button type="button" onMouseDown={() => onChange('')} style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94A3B8', display:'flex', padding:3 }}>
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
            <div key={i}
              onMouseDown={() => { onPick(m); setOpen(false); }}
              style={{ padding:'9px 14px', cursor:'pointer', borderBottom: i < list.length-1 ? '1px solid #F8FAFC' : 'none', transition:'background .1s' }}
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

/* ── Chips ─────────────────────────────────── */
const Chip = ({ label, selected, onSelect }) => (
  <button type="button" onMouseDown={() => onSelect(label)}
    style={{ padding:'3px 10px', borderRadius:99, border:`1.5px solid ${selected ? T : '#E2E8F0'}`, background:selected ? T : '#fff', color:selected ? '#fff' : '#64748B', fontSize:11, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', transition:'all .12s', lineHeight:'18px' }}>
    {label}
  </button>
);

/* ── MedCard (item row) ─────────────────────── */
const MedCard = ({ item, index, total, isActive, onActivate, onUpdate, onRemove, suggestions }) => {
  const filled = item.medication.trim();
  const complete = filled && item.dosage && item.posology && item.duration;

  return (
    <div
      onMouseDown={onActivate}
      style={{
        border:`2px solid ${isActive ? T : complete ? `${T}45` : '#E2E8F0'}`,
        borderRadius:13,
        marginBottom:8,
        background: isActive ? '#fff' : complete ? '#FAFFFE' : '#FAFAFA',
        transition:'all .18s',
        boxShadow: isActive ? `0 4px 20px ${T}20` : 'none',
        overflow:'hidden',
        cursor:'pointer'
      }}>

      {/* Header strip */}
      <div style={{
        padding:'10px 14px',
        background: isActive ? '#F0FDFE' : complete ? '#F0FDFE80' : '#F8FAFC',
        borderBottom: isActive ? `1px solid ${T}30` : '1px solid #F1F5F9',
        display:'flex', alignItems:'center', justifyContent:'space-between'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, minWidth:0, flex:1 }}>
          <div style={{ width:22, height:22, borderRadius:'50%', background: complete ? T : isActive ? T : '#CBD5E1', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background .18s' }}>
            {complete
              ? <CheckCircle size={13} color="#fff"/>
              : <span style={{ fontSize:10, fontWeight:800, color:'#fff' }}>{index+1}</span>}
          </div>
          <span style={{ fontSize:13, fontWeight:700, color: isActive ? T : filled ? '#1E293B' : '#94A3B8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
            {filled ? item.medication : `Médicament ${index+1}`}
          </span>
          {filled && !isActive && (
            <div style={{ display:'flex', gap:4, flexShrink:0 }}>
              {item.dosage   && <span style={{ fontSize:10, background:'#E0F2FE', color:'#0369A1', padding:'2px 7px', borderRadius:99, fontWeight:600 }}>{item.dosage}</span>}
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

      {/* Expanded form */}
      {isActive && (
        <div style={{ padding:'14px 16px' }}>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:10, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:6 }}>Médicament *</label>
            <MedSearch
              value={item.medication}
              onChange={v => onUpdate(index,'medication',v)}
              suggestions={suggestions}
              onPick={m => {
                onUpdate(index,'medication',m.name);
                if(m.dosage)   onUpdate(index,'dosage',m.dosage);
                if(m.posology) onUpdate(index,'posology',m.posology);
                if(m.duration) onUpdate(index,'duration',m.duration);
              }}
            />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
            {[
              { field:'dosage',   label:'Dosage',    chips:DOSAGES,  placeholder:'500mg' },
              { field:'posology', label:'Posologie', chips:POSOLOGY, placeholder:'2×/jour' },
              { field:'duration', label:'Durée',     chips:DURATION, placeholder:'7 j' },
            ].map(({ field, label, chips, placeholder }) => (
              <div key={field}>
                <label style={{ fontSize:10, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:5 }}>{label}</label>
                <input
                  value={item[field]} placeholder={placeholder}
                  onChange={e => onUpdate(index, field, e.target.value)}
                  onFocus={e => { e.target.style.borderColor = T; e.target.style.boxShadow = `0 0 0 3px ${T}18`; }}
                  onBlur={e  => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none'; }}
                  style={{ width:'100%', padding:'8px 10px', border:'1.5px solid #E2E8F0', borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box', transition:'all .15s' }}
                />
                <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginTop:6 }}>
                  {chips.map(c => <Chip key={c} label={c} selected={item[field]===c} onSelect={v => onUpdate(index, field, v)}/>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Prescription Preview ────────────────── */
const PrescriptionPreview = ({ items, notes, patient }) => {
  const filled = items.filter(i => i.medication.trim());
  const today  = new Date().toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });

  return (
    <div style={{ background:'#fff', borderRadius:12, overflow:'hidden', boxShadow:'0 2px 16px rgba(0,0,0,.10)', fontFamily:'Georgia, serif', border:'1px solid #E2E8F0' }}>

      {/* En-tête ordonnance */}
      <div style={{ background:`linear-gradient(135deg,${T},${T_DARK})`, padding:'16px 20px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-18, right:-18, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,.06)' }}/>
        <div style={{ position:'absolute', bottom:-28, right:20, width:60, height:60, borderRadius:'50%', background:'rgba(255,255,255,.04)' }}/>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', position:'relative' }}>
          <div>
            <div style={{ fontFamily:'Plus Jakarta Sans, sans-serif', fontWeight:800, fontSize:16, color:'#fff', letterSpacing:1.2 }}>ORDONNANCE</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.65)', marginTop:3 }}>Cabinet Dentaire · DentalPM Madagascar</div>
          </div>
          <div style={{ textAlign:'right', fontSize:10, color:'rgba(255,255,255,.70)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:4, justifyContent:'flex-end' }}>
              <Calendar size={9}/> {today}
            </div>
          </div>
        </div>
      </div>

      {/* Patient */}
      <div style={{ padding:'10px 18px', background:'#F8FAFC', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:30, height:30, borderRadius:'50%', background:`${T}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <span style={{ fontSize:11, fontWeight:800, color:T, fontFamily:'sans-serif' }}>
            {patient ? `${patient.first_name[0]}${patient.last_name[0]}` : 'P'}
          </span>
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

      {/* Corps */}
      <div style={{ padding:'14px 18px', minHeight:180 }}>
        {filled.length === 0 ? (
          <div style={{ textAlign:'center', padding:'32px 0', color:'#CBD5E1' }}>
            <Pill size={28} style={{ margin:'0 auto 8px', display:'block', opacity:.35 }}/>
            <p style={{ fontSize:11, margin:0, fontFamily:'sans-serif', color:'#94A3B8' }}>Saisissez un médicament<br/>pour voir l'aperçu</p>
          </div>
        ) : filled.map((item, i) => (
          <div key={i} style={{ marginBottom:12, paddingBottom:12, borderBottom: i<filled.length-1 ? '1px dashed #E2E8F0' : 'none' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:4 }}>
              <div style={{ width:18, height:18, borderRadius:'50%', background:T, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                <span style={{ fontSize:9, fontWeight:700, color:'#fff', fontFamily:'sans-serif' }}>{i+1}</span>
              </div>
              <div style={{ fontWeight:700, fontSize:13, color:'#0F172A', fontFamily:'sans-serif', lineHeight:1.4 }}>{item.medication}</div>
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

      {/* Signature */}
      <div style={{ padding:'10px 18px 14px', borderTop:'1px solid #F1F5F9', display:'flex', justifyContent:'flex-end' }}>
        <div style={{ textAlign:'center', width:120 }}>
          <div style={{ height:28, borderBottom:'1px solid #334155', marginBottom:4 }}/>
          <div style={{ fontSize:9, color:'#94A3B8', fontFamily:'sans-serif', letterSpacing:.5 }}>Signature du praticien</div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN MODAL
══════════════════════════════════════════ */
const PrescriptionModal = ({
  open, onClose,
  title = 'Nouvelle ordonnance',
  patient,
  suggestions = MOCK_SUGGESTIONS,
  saving = false,
  onSubmit,
  submitLabel = "Créer l'ordonnance",
  formData,
  setFormData,
}) => {
  const [activeIdx, setActiveIdx] = useState(0);

  const addItem = () => {
    setFormData(f => ({ ...f, items:[...f.items, emptyItem()] }));
    setTimeout(() => setActiveIdx(formData.items.length), 10);
  };

  const removeItem = i => {
    setFormData(f => ({
      ...f,
      items: f.items.length > 1 ? f.items.filter((_,idx) => idx !== i) : [emptyItem()]
    }));
    setActiveIdx(Math.max(0, i - 1));
  };

  const updateItem = (i, field, val) => {
    setFormData(f => {
      const it = [...f.items];
      it[i] = { ...it[i], [field]:val };
      return { ...f, items:it };
    });
  };

  const filled = formData.items.filter(i => i.medication.trim());
  const complete = filled.filter(i => i.medication && i.dosage && i.posology && i.duration);
  const progress = filled.length === 0 ? 0 : Math.round((complete.length / Math.max(filled.length, 1)) * 100);

  if (!open) return null;

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(8,20,40,.75)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(4px)' }}>

      <style>{`
        @keyframes dpm-slide-up { from { opacity:0; transform:translateY(20px) scale(.98); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes dpm-spin { to { transform:rotate(360deg); } }
        .dpm-scroll::-webkit-scrollbar { width:4px; }
        .dpm-scroll::-webkit-scrollbar-track { background:transparent; }
        .dpm-scroll::-webkit-scrollbar-thumb { background:#CBD5E1; border-radius:99px; }
      `}</style>

      <div style={{
        background:'#F1F5F9',
        width:'100%', maxWidth:1060,
        borderRadius:20,
        display:'flex', flexDirection:'column',
        overflow:'hidden',
        boxShadow:'0 40px 80px rgba(0,0,0,.38)',
        border:'1px solid rgba(255,255,255,.1)',
        animation:'dpm-slide-up .22s cubic-bezier(.22,.61,.36,1)',
        maxHeight:'calc(100vh - 32px)'
      }}>

        {/* ── HEADER ────────────────────────────── */}
        <div style={{ background:`linear-gradient(135deg,${T} 0%,${T_DARK} 100%)`, padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-30, right:100, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }}/>
          <div style={{ position:'absolute', bottom:-40, right:-20, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }}/>

          <div style={{ display:'flex', alignItems:'center', gap:14, position:'relative' }}>
            <div style={{ width:42, height:42, borderRadius:13, background:'rgba(255,255,255,.18)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, backdropFilter:'blur(6px)', border:'1px solid rgba(255,255,255,.25)' }}>
              <Stethoscope size={19} color="#fff"/>
            </div>
            <div>
              <h2 style={{ fontFamily:'Plus Jakarta Sans, sans-serif', fontWeight:800, fontSize:17, color:'#fff', margin:0, lineHeight:1.2 }}>{title}</h2>
              {patient && (
                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3 }}>
                  <div style={{ width:16, height:16, borderRadius:'50%', background:'rgba(255,255,255,.28)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontSize:8, fontWeight:800, color:'#fff' }}>
                      {patient.first_name[0]}{patient.last_name[0]}
                    </span>
                  </div>
                  <p style={{ fontSize:12, color:'rgba(255,255,255,.8)', margin:0 }}>
                    {patient.first_name} {patient.last_name}
                    {patient.date_of_birth && ` — ${Math.floor((Date.now()-new Date(patient.date_of_birth))/31557600000)} ans`}
                  </p>
                </div>
              )}
            </div>
          </div>

          <button onClick={onClose}
            style={{ width:34, height:34, borderRadius:9, background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.2)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,.85)', flexShrink:0, position:'relative', transition:'all .15s' }}
            onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,.28)'}
            onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,.15)'}>
            <X size={15}/>
          </button>
        </div>

        {/* Progress bar */}
        {filled.length > 0 && (
          <div style={{ height:3, background:'#E2E8F0', flexShrink:0 }}>
            <div style={{ height:'100%', width:`${progress}%`, background:`linear-gradient(90deg,${T},#13A3B4)`, transition:'width .4s ease', borderRadius:'0 99px 99px 0' }}/>
          </div>
        )}

        {/* ── BODY ──────────────────────────────── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', flex:1, overflow:'hidden', minHeight:0 }}>

          {/* Gauche : formulaire */}
          <div style={{ display:'flex', flexDirection:'column', overflow:'hidden', borderRight:'1px solid #E2E8F0' }}>

            {/* Sub-header */}
            <div style={{ padding:'11px 18px', borderBottom:'1px solid #E2E8F0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Pill size={15} color={T}/>
                <span style={{ fontWeight:700, fontSize:14, color:'#0F172A' }}>Médicaments</span>
                {filled.length > 0 && (
                  <span style={{ background:`${T}15`, color:T, fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:99 }}>
                    {filled.length}/{formData.items.length}
                  </span>
                )}
              </div>
              <button type="button" onClick={addItem}
                style={{ padding:'6px 14px', borderRadius:9, background:T, color:'#fff', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:5, boxShadow:`0 2px 8px ${T}40`, transition:'all .15s' }}
                onMouseOver={e=>e.currentTarget.style.filter='brightness(1.1)'}
                onMouseOut={e=>e.currentTarget.style.filter='none'}>
                <Plus size={12}/> Ajouter
              </button>
            </div>

            {/* Scrollable list */}
            <div className="dpm-scroll" style={{ flex:1, overflowY:'auto', padding:'12px 14px' }}>
              {formData.items.map((item, i) => (
                <MedCard key={i} item={item} index={i} total={formData.items.length}
                  isActive={activeIdx === i} onActivate={() => setActiveIdx(i)}
                  onUpdate={updateItem} onRemove={removeItem} suggestions={suggestions}/>
              ))}
            </div>

            {/* Notes */}
            <div style={{ padding:'12px 18px', background:'#fff', borderTop:'1px solid #E2E8F0', flexShrink:0 }}>
              <label style={{ fontSize:10, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:5 }}>Notes / Instructions complémentaires</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({...formData, notes:e.target.value})}
                placeholder="Ex : Prendre avec de la nourriture, éviter l'alcool…"
                rows={2}
                onFocus={e=>{ e.target.style.borderColor=T; e.target.style.boxShadow=`0 0 0 3px ${T}18`; }}
                onBlur={e=>{ e.target.style.borderColor='#E2E8F0'; e.target.style.boxShadow='none'; }}
                style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #E2E8F0', borderRadius:10, fontSize:13, fontFamily:'inherit', resize:'none', outline:'none', boxSizing:'border-box', lineHeight:1.6, transition:'all .15s' }}
              />
            </div>
          </div>

          {/* Droite : preview */}
          <div style={{ display:'flex', flexDirection:'column', background:'#E8EDF5', overflow:'hidden' }}>
            <div style={{ padding:'9px 14px', borderBottom:'1px solid #D4DAE8', background:'#DDE4EF', flexShrink:0, display:'flex', alignItems:'center', gap:6 }}>
              <Sparkles size={12} color={T}/>
              <span style={{ fontSize:10, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.1em' }}>Aperçu en temps réel</span>
            </div>
            <div className="dpm-scroll" style={{ flex:1, overflowY:'auto', padding:'14px 12px' }}>
              <PrescriptionPreview items={formData.items} notes={formData.notes} patient={patient}/>
            </div>
          </div>
        </div>

        {/* ── FOOTER ───────────────────────────── */}
        <div style={{ padding:'12px 24px', background:'#fff', borderTop:'1px solid #E2E8F0', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {filled.length === 0 ? (
              <div style={{ display:'flex', alignItems:'center', gap:5, color:'#94A3B8', fontSize:12 }}>
                <AlertCircle size={13}/>
                Ajoutez au moins un médicament pour continuer
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:5, color: complete.length === filled.length ? '#059669' : '#F59E0B', fontSize:12, fontWeight:600 }}>
                <CheckCircle size={13}/>
                {filled.length} médicament{filled.length > 1 ? 's' : ''} · {progress}% complété
              </div>
            )}
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <button type="button" onClick={onClose}
              style={{ padding:'9px 20px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, color:'#475569', transition:'all .15s' }}
              onMouseOver={e=>e.currentTarget.style.borderColor='#94A3B8'}
              onMouseOut={e=>e.currentTarget.style.borderColor='#E2E8F0'}>
              Annuler
            </button>
            <button type="button" onClick={onSubmit} disabled={saving || filled.length === 0}
              style={{
                padding:'9px 24px', borderRadius:10,
                background: filled.length > 0 ? `linear-gradient(135deg,${T},#13A3B4)` : '#E2E8F0',
                color: filled.length > 0 ? '#fff' : '#94A3B8',
                border:'none', cursor: filled.length > 0 ? 'pointer' : 'not-allowed',
                fontSize:14, fontWeight:700, display:'flex', alignItems:'center', gap:8,
                boxShadow: filled.length > 0 ? `0 4px 16px ${T}40` : 'none',
                transition:'all .2s',
                opacity: saving ? .8 : 1
              }}
              onMouseOver={e=>{ if(filled.length>0) e.currentTarget.style.filter='brightness(1.08)'; }}
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

/* ══════════════════════════════════════════
   DEMO WRAPPER
══════════════════════════════════════════ */
const emptyForm = () => ({ items:[emptyItem()], notes:'' });

export default function App() {
  const [open, setOpen] = useState(true);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const mockPatient = {
    first_name:'Marie', last_name:'Ange',
    date_of_birth:'1995-06-15'
  };

  const handleSubmit = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); setOpen(false); }, 1800);
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0F172A', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20, fontFamily:'Plus Jakarta Sans, sans-serif' }}>
      {!open && (
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
          <p style={{ color:'#94A3B8', fontSize:14, marginBottom:20 }}>Ordonnance créée avec succès</p>
          <button onClick={() => { setForm(emptyForm()); setOpen(true); }}
            style={{ padding:'10px 24px', borderRadius:10, background:T, color:'#fff', border:'none', cursor:'pointer', fontSize:14, fontWeight:700 }}>
            Rouvrir la modale
          </button>
        </div>
      )}

      <PrescriptionModal
        open={open} onClose={() => setOpen(false)}
        title="Nouvelle ordonnance"
        patient={mockPatient}
        suggestions={MOCK_SUGGESTIONS}
        formData={form} setFormData={setForm}
        saving={saving} onSubmit={handleSubmit}
        submitLabel="Créer l'ordonnance"
      />
    </div>
  );
}
