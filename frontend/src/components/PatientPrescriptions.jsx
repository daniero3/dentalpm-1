import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  FileText, Plus, Download, ArrowLeft, User, Loader2,
  Send, XCircle, Trash2, Edit2, CheckCircle, X, Printer,
  Search, Pill, ChevronRight, Stethoscope, Calendar
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API   = `${BACKEND_URL}/api`;
const authH = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const STATUS_COLORS = { DRAFT:'bg-yellow-100 text-yellow-800', ISSUED:'bg-green-100 text-green-800', CANCELLED:'bg-red-100 text-red-800' };
const STATUS_LABELS = { DRAFT:'Brouillon', ISSUED:'Emise', CANCELLED:'Annulee' };
const fdate = d => new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });

const POSOLOGY = ['1 fois/jour', '2 fois/jour', '3 fois/jour', 'Matin et soir', 'Matin, midi, soir', 'Avant les repas', 'Apres les repas'];
const DURATION = ['3 jours', '5 jours', '7 jours', '10 jours', '14 jours', '21 jours', '1 mois', '3 mois'];
const DOSAGES  = ['100mg', '250mg', '500mg', '1000mg', '5ml', '10ml', '25mg', '50mg'];

const T = '#0D7A87';

const MedInput = ({ value, onChange, suggestions, onPick }) => {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    if (!value.trim()) { setList(suggestions.slice(0,5)); return; }
    const q = value.toLowerCase();
    setList(suggestions.filter(s => s.name.toLowerCase().includes(q)).slice(0,7));
  }, [value, suggestions]);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div style={{ position:'relative' }}>
        <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#94A3B8', pointerEvents:'none' }}/>
        <input value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Nom du medicament"
          autoComplete="off"
          style={{ width:'100%', padding:'10px 32px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:14, fontWeight:500, fontFamily:'inherit', background:'#fff', outline:'none', boxSizing:'border-box', transition:'border-color .15s' }}
          onFocus={e => { setOpen(true); e.target.style.borderColor=T; }}
          onBlur={e => e.target.style.borderColor='#E2E8F0'}
        />
        {value && (
          <button type="button" onMouseDown={() => onChange('')}
            style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94A3B8', display:'flex', padding:2 }}>
            <X size={12}/>
          </button>
        )}
      </div>
      {open && list.length > 0 && (
        <div style={{ position:'absolute', top:'calc(100% + 3px)', left:0, right:0, zIndex:500, background:'#fff', border:`1.5px solid ${T}`, borderRadius:11, boxShadow:'0 8px 24px rgba(0,0,0,.14)', overflow:'hidden' }}>
          <div style={{ padding:'5px 12px', background:'#F0FDFE', fontSize:10, fontWeight:700, color:T, textTransform:'uppercase', letterSpacing:'.08em' }}>
            {value ? 'Suggestions' : 'Recemment utilises'}
          </div>
          {list.map((m, i) => (
            <div key={i} onMouseDown={() => { onPick(m); setOpen(false); }}
              style={{ padding:'9px 14px', cursor:'pointer', borderBottom:i<list.length-1?'1px solid #F8FAFC':'none', transition:'background .1s' }}
              onMouseOver={e=>e.currentTarget.style.background='#F0FDFE'}
              onMouseOut={e=>e.currentTarget.style.background='transparent'}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:700, fontSize:13, color:'#0F172A' }}>{m.name}</span>
                {m.count>0 && <span style={{ fontSize:10, color:'#94A3B8', background:'#F1F5F9', padding:'1px 6px', borderRadius:99 }}>x{m.count}</span>}
              </div>
              {(m.dosage||m.posology||m.duration) && (
                <div style={{ fontSize:11, color:'#64748B', marginTop:2, display:'flex', gap:8 }}>
                  {m.dosage   && <span style={{ color:T }}>{m.dosage}</span>}
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

const Chips = ({ items, value, onSelect }) => (
  <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:6 }}>
    {items.map(p => {
      const sel = value === p;
      return (
        <button key={p} type="button" onMouseDown={() => onSelect(p)}
          style={{ padding:'3px 9px', borderRadius:99, border:`1px solid ${sel?T:'#E2E8F0'}`, background:sel?T:'#F8FAFC', color:sel?'#fff':'#475569', fontSize:11, fontWeight:600, cursor:'pointer', transition:'all .12s', whiteSpace:'nowrap' }}>
          {p}
        </button>
      );
    })}
  </div>
);

const MedCard = ({ item, index, total, onUpdate, onRemove, suggestions, isActive, onActivate }) => (
  <div onMouseDown={onActivate}
    style={{ border:`2px solid ${isActive?T:'#E2E8F0'}`, borderRadius:13, overflow:'hidden', marginBottom:8, background:'#fff', transition:'all .15s', boxShadow:isActive?`0 0 0 3px ${T}20`:'none', cursor:'pointer' }}>
    <div style={{ background:isActive?'#F0FDFE':'#F8FAFC', padding:'8px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:`1px solid ${isActive?T+'30':'#F1F5F9'}` }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0, flex:1 }}>
        <div style={{ width:20, height:20, borderRadius:'50%', background:isActive?T:'#94A3B8', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background .15s' }}>
          <span style={{ fontSize:10, fontWeight:800, color:'#fff' }}>{index+1}</span>
        </div>
        <span style={{ fontSize:13, fontWeight:700, color:isActive?T:'#64748B', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, transition:'color .15s' }}>
          {item.medication || `Medicament ${index+1}`}
        </span>
        {item.medication && !isActive && (
          <div style={{ display:'flex', gap:4, flexShrink:0 }}>
            {item.dosage   && <span style={{ fontSize:10, background:'#E0F2FE', color:'#0369A1', padding:'1px 6px', borderRadius:99, fontWeight:600 }}>{item.dosage}</span>}
            {item.duration && <span style={{ fontSize:10, background:'#F0FDF4', color:'#166534', padding:'1px 6px', borderRadius:99, fontWeight:600 }}>{item.duration}</span>}
          </div>
        )}
      </div>
      {total > 1 && (
        <button type="button" onMouseDown={e => { e.stopPropagation(); onRemove(index); }}
          style={{ background:'none', border:'none', cursor:'pointer', color:'#CBD5E1', display:'flex', alignItems:'center', gap:3, fontSize:11, padding:'2px 6px', borderRadius:6, transition:'all .15s', flexShrink:0 }}
          onMouseOver={e=>{e.currentTarget.style.background='#FEE2E2';e.currentTarget.style.color='#EF4444';}}
          onMouseOut={e=>{e.currentTarget.style.background='none';e.currentTarget.style.color='#CBD5E1';}}>
          <Trash2 size={11}/>
        </button>
      )}
    </div>

    {isActive && (
      <div style={{ padding:'14px' }}>
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:10, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:5 }}>Medicament *</label>
          <MedInput value={item.medication} onChange={v => onUpdate(index,'medication',v)} suggestions={suggestions}
            onPick={m => { onUpdate(index,'medication',m.name); if(m.dosage) onUpdate(index,'dosage',m.dosage); if(m.posology) onUpdate(index,'posology',m.posology); if(m.duration) onUpdate(index,'duration',m.duration); }}/>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
          <div>
            <label style={{ fontSize:10, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:4 }}>Dosage</label>
            <input value={item.dosage} onChange={e=>onUpdate(index,'dosage',e.target.value)} placeholder="500mg"
              style={{ width:'100%', padding:'8px 10px', borderRadius:9, border:'1.5px solid #E2E8F0', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box', transition:'border-color .15s' }}
              onFocus={e=>e.target.style.borderColor=T} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
            <Chips items={DOSAGES} value={item.dosage} onSelect={v=>onUpdate(index,'dosage',v)}/>
          </div>
          <div>
            <label style={{ fontSize:10, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:4 }}>Posologie</label>
            <input value={item.posology} onChange={e=>onUpdate(index,'posology',e.target.value)} placeholder="2 fois/jour"
              style={{ width:'100%', padding:'8px 10px', borderRadius:9, border:'1.5px solid #E2E8F0', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box', transition:'border-color .15s' }}
              onFocus={e=>e.target.style.borderColor=T} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
            <Chips items={POSOLOGY} value={item.posology} onSelect={v=>onUpdate(index,'posology',v)}/>
          </div>
          <div>
            <label style={{ fontSize:10, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:4 }}>Duree</label>
            <input value={item.duration} onChange={e=>onUpdate(index,'duration',e.target.value)} placeholder="7 jours"
              style={{ width:'100%', padding:'8px 10px', borderRadius:9, border:'1.5px solid #E2E8F0', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box', transition:'border-color .15s' }}
              onFocus={e=>e.target.style.borderColor=T} onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
            <Chips items={DURATION} value={item.duration} onSelect={v=>onUpdate(index,'duration',v)}/>
          </div>
        </div>
      </div>
    )}
  </div>
);

const PrescriptionModal = ({ open, onClose, title, formData, setFormData, saving, onSubmit, submitLabel, suggestions, patient }) => {
  const [activeIdx, setActiveIdx] = useState(0);

  const addItem = () => {
    setFormData(f => ({ ...f, items:[...f.items, { medication:'', dosage:'', posology:'', duration:'' }] }));
    setTimeout(() => setActiveIdx(formData.items.length), 10);
  };
  const removeItem = i => {
    setFormData(f => ({ ...f, items:f.items.length>1?f.items.filter((_,idx)=>idx!==i):[{ medication:'', dosage:'', posology:'', duration:'' }] }));
    setActiveIdx(Math.max(0,i-1));
  };
  const updateItem = (i, field, val) => setFormData(f => { const it=[...f.items]; it[i]={...it[i],[field]:val}; return {...f,items:it}; });

  const filled = formData.items.filter(i=>i.medication.trim()).length;
  const today  = new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});

  if (!open) return null;

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(10,16,30,.72)', display:'flex', alignItems:'stretch', justifyContent:'center', padding:'16px' }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <style>{`@keyframes dpm-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ background:'#F8FAFC', width:'100%', maxWidth:1080, borderRadius:20, display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 40px 100px rgba(0,0,0,.32)', border:'1px solid #E2E8F0' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#0D7A87,#0A5F6A)', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:11, background:'rgba(255,255,255,.18)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Stethoscope size={18} color="#fff"/>
            </div>
            <div>
              <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:16, color:'#fff', margin:0 }}>{title}</h2>
              {patient && (
                <p style={{ fontSize:12, color:'rgba(255,255,255,.72)', margin:0 }}>
                  {patient.first_name} {patient.last_name}
                  {patient.date_of_birth && ` — ${Math.floor((Date.now()-new Date(patient.date_of_birth))/31557600000)} ans`}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose}
            style={{ width:32, height:32, borderRadius:8, background:'rgba(255,255,255,.15)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,.8)' }}
            onMouseOver={e=>e.currentTarget.style.background='rgba(255,255,255,.28)'}
            onMouseOut={e=>e.currentTarget.style.background='rgba(255,255,255,.15)'}>
            <X size={15}/>
          </button>
        </div>

        {/* Split body */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', flex:1, overflow:'hidden', minHeight:0 }}>

          {/* Gauche — formulaire */}
          <div style={{ display:'flex', flexDirection:'column', overflow:'hidden', borderRight:'1px solid #E2E8F0' }}>
            {/* Sous-header */}
            <div style={{ padding:'12px 18px', borderBottom:'1px solid #E2E8F0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <Pill size={14} color={T}/>
                <span style={{ fontWeight:700, fontSize:14, color:'#0F172A' }}>Medicaments</span>
                {filled>0 && <span style={{ background:'#F0FDFE', color:T, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99, border:`1px solid ${T}25` }}>{filled}</span>}
              </div>
              <button type="button" onClick={addItem}
                style={{ padding:'5px 13px', borderRadius:9, background:T, color:'#fff', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                <Plus size={12}/> Ajouter
              </button>
            </div>

            {/* Liste scrollable */}
            <div style={{ flex:1, overflowY:'auto', padding:'12px 16px' }}>
              {formData.items.map((item, i) => (
                <MedCard key={i} item={item} index={i} total={formData.items.length}
                  isActive={activeIdx===i} onActivate={()=>setActiveIdx(i)}
                  onUpdate={updateItem} onRemove={removeItem} suggestions={suggestions}/>
              ))}
            </div>

            {/* Notes en bas */}
            <div style={{ padding:'12px 18px', background:'#fff', borderTop:'1px solid #E2E8F0', flexShrink:0 }}>
              <label style={{ fontSize:10, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:5 }}>Notes / Instructions</label>
              <textarea
                value={formData.notes}
                onChange={e=>setFormData({...formData,notes:e.target.value})}
                placeholder="Prendre avec de la nourriture, eviter l'alcool..."
                rows={2}
                style={{ width:'100%', padding:'8px 12px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:13, fontFamily:'inherit', resize:'none', outline:'none', boxSizing:'border-box', lineHeight:1.5, transition:'border-color .15s' }}
                onFocus={e=>e.target.style.borderColor=T} onBlur={e=>e.target.style.borderColor='#E2E8F0'}
              />
            </div>
          </div>

          {/* Droite — aperçu */}
          <div style={{ display:'flex', flexDirection:'column', background:'#E8EDF5', overflow:'hidden' }}>
            <div style={{ padding:'10px 16px', borderBottom:'1px solid #D4DAE8', background:'#DDE4EF', flexShrink:0 }}>
              <span style={{ fontSize:10, fontWeight:700, color:'#64748B', textTransform:'uppercase', letterSpacing:'.1em' }}>Apercu en temps reel</span>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'14px' }}>
              {/* Feuille ordonnance */}
              <div style={{ background:'#fff', borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,.12)', overflow:'hidden', fontFamily:'Georgia,serif' }}>
                {/* En-tete */}
                <div style={{ background:`linear-gradient(135deg,${T},#0A5F6A)`, padding:'14px 18px', color:'#fff' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:15, letterSpacing:.8 }}>ORDONNANCE</div>
                      <div style={{ fontSize:10, opacity:.7, marginTop:2 }}>Cabinet Dentaire — DPM Madagascar</div>
                    </div>
                    <div style={{ fontSize:10, opacity:.75, textAlign:'right' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:3, justifyContent:'flex-end' }}>
                        <Calendar size={9}/> {today}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Patient */}
                <div style={{ padding:'10px 16px', borderBottom:'1px solid #F1F5F9', background:'#F8FAFC' }}>
                  <div style={{ fontSize:9, color:'#94A3B8', textTransform:'uppercase', letterSpacing:.8, marginBottom:2 }}>Patient</div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>
                    {patient ? `${patient.first_name} ${patient.last_name}` : '—'}
                  </div>
                </div>
                {/* Corps */}
                <div style={{ padding:'12px 16px', minHeight:160 }}>
                  {filled===0 ? (
                    <div style={{ textAlign:'center', padding:'24px 0', color:'#CBD5E1' }}>
                      <Pill size={24} style={{ margin:'0 auto 6px', display:'block' }}/>
                      <p style={{ fontSize:11, margin:0, fontFamily:'sans-serif' }}>Saisissez un medicament</p>
                    </div>
                  ) : (
                    formData.items.filter(i=>i.medication).map((item, i) => (
                      <div key={i} style={{ marginBottom:12, paddingBottom:12, borderBottom:i<filled-1?'1px dashed #E2E8F0':'none' }}>
                        <div style={{ display:'flex', gap:7, alignItems:'flex-start', marginBottom:3 }}>
                          <div style={{ width:18, height:18, borderRadius:'50%', background:T, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                            <span style={{ fontSize:9, fontWeight:700, color:'#fff', fontFamily:'sans-serif' }}>{i+1}</span>
                          </div>
                          <div style={{ fontWeight:700, fontSize:13, color:'#0F172A' }}>{item.medication}</div>
                        </div>
                        <div style={{ paddingLeft:25 }}>
                          {item.dosage   && <div style={{ fontSize:11, color:'#475569', display:'flex', alignItems:'center', gap:4, marginBottom:1 }}><ChevronRight size={9} color={T}/><span><strong>Dosage :</strong> {item.dosage}</span></div>}
                          {item.posology && <div style={{ fontSize:11, color:'#475569', display:'flex', alignItems:'center', gap:4, marginBottom:1 }}><ChevronRight size={9} color={T}/><span><strong>Posologie :</strong> {item.posology}</span></div>}
                          {item.duration && <div style={{ fontSize:11, color:'#475569', display:'flex', alignItems:'center', gap:4 }}><ChevronRight size={9} color={T}/><span><strong>Duree :</strong> {item.duration}</span></div>}
                        </div>
                      </div>
                    ))
                  )}
                  {formData.notes && (
                    <div style={{ marginTop:8, padding:'7px 10px', background:'#FFF8E7', borderRadius:7, borderLeft:`3px solid #F59E0B`, fontSize:11, color:'#92400E', fontStyle:'italic' }}>
                      {formData.notes}
                    </div>
                  )}
                </div>
                {/* Signature */}
                <div style={{ padding:'10px 16px', borderTop:'1px solid #F1F5F9', display:'flex', justifyContent:'flex-end' }}>
                  <div style={{ textAlign:'center', width:130 }}>
                    <div style={{ height:28, borderBottom:'1px solid #0F172A', marginBottom:3 }}/>
                    <div style={{ fontSize:9, color:'#64748B', fontFamily:'sans-serif' }}>Signature du praticien</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 24px', background:'#fff', borderTop:'1px solid #E2E8F0', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <span style={{ fontSize:12, color:'#94A3B8' }}>
            {filled===0 ? 'Ajoutez au moins un medicament pour continuer' : `${filled} medicament${filled>1?'s':''} saisi${filled>1?'s':''}`}
          </span>
          <div style={{ display:'flex', gap:8 }}>
            <button type="button" onClick={onClose}
              style={{ padding:'9px 20px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, color:'#475569' }}
              onMouseOver={e=>e.currentTarget.style.borderColor='#94A3B8'}
              onMouseOut={e=>e.currentTarget.style.borderColor='#E2E8F0'}>
              Annuler
            </button>
            <button type="button" onClick={onSubmit} disabled={saving||filled===0}
              style={{ padding:'9px 24px', borderRadius:10, background:filled>0?`linear-gradient(135deg,${T},#13A3B4)`:'#E2E8F0', color:filled>0?'#fff':'#94A3B8', border:'none', cursor:filled>0?'pointer':'not-allowed', fontSize:14, fontWeight:700, display:'flex', alignItems:'center', gap:8, boxShadow:filled>0?'0 4px 14px rgba(13,122,135,.28)':'none', transition:'all .2s' }}>
              {saving ? <Loader2 size={15} style={{ animation:'dpm-spin .8s linear infinite' }}/> : <CheckCircle size={15}/>}
              {saving ? 'Enregistrement...' : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════ */
const PatientPrescriptions = () => {
  const { patientId } = useParams();
  const [patient, setPatient]             = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [suggestions, setSuggestions]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [isCreateOpen, setIsCreateOpen]   = useState(false);
  const [isEditOpen, setIsEditOpen]       = useState(false);
  const [selPresc, setSelPresc]           = useState(null);
  const [saving, setSaving]               = useState(false);

  const emptyForm = { items:[{ medication:'', dosage:'', posology:'', duration:'' }], notes:'' };
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
    const valid = form.items.filter(i=>i.medication.trim());
    if (!valid.length) { toast.error('Ajoutez au moins un medicament'); return; }
    setSaving(true);
    try {
      const r = await axios.post(`${API}/patients/${patientId}/prescriptions`, { content:{ items:valid, notes:form.notes } }, authH());
      toast.success('Ordonnance creee');
      setIsCreateOpen(false); setForm(emptyForm); fetchPrescriptions(); fetchSuggestions();
      const id = r.data.prescription?.id;
      if (id && window.confirm('Imprimer maintenant ?')) handlePrintById(id);
    } catch (e) { toast.error(e.response?.data?.error||'Erreur'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/prescriptions/${selPresc.id}`, { content:{ items:form.items.filter(i=>i.medication.trim()), notes:form.notes } }, authH());
      toast.success('Mise a jour');
      setIsEditOpen(false); setSelPresc(null); setForm(emptyForm); fetchPrescriptions();
    } catch (e) { toast.error(e.response?.data?.error==='PRESCRIPTION_LOCKED'?'Ordonnance verrouillee':'Erreur'); }
    finally { setSaving(false); }
  };

  const handleIssue = async p => {
    if (!window.confirm('Emettre ? Action irreversible.')) return;
    try { await axios.post(`${API}/prescriptions/${p.id}/issue`, {}, authH()); toast.success('Emise'); fetchPrescriptions(); }
    catch (e) { toast.error(e.response?.data?.error||'Erreur'); }
  };

  const handleCancel = async p => {
    if (!window.confirm('Annuler ?')) return;
    try { await axios.post(`${API}/prescriptions/${p.id}/cancel`, {}, authH()); toast.success('Annulee'); fetchPrescriptions(); }
    catch (e) { toast.error(e.response?.data?.error||'Erreur'); }
  };

  const handlePrintById = id => {
    fetch(`${API}/prescriptions/${id}/pdf`, { headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` } })
      .then(r=>{ if(!r.ok) throw new Error(); return r.blob(); })
      .then(blob=>{ const url=window.URL.createObjectURL(blob); window.open(url,'_blank'); setTimeout(()=>window.URL.revokeObjectURL(url),60000); })
      .catch(()=>toast.error('Erreur impression'));
  };

  const handleDownload = async p => {
    try {
      const r = await fetch(`${API}/prescriptions/${p.id}/pdf`, { headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` } });
      if (!r.ok) throw new Error();
      const blob=await r.blob(), url=window.URL.createObjectURL(blob), a=document.createElement('a');
      a.href=url; a.download=`${p.number}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url); toast.success('PDF telecharge');
    } catch { toast.error('Erreur PDF'); }
  };

  const openEdit = p => {
    setSelPresc(p);
    setForm({ items:p.content?.items?.length?p.content.items:[{ medication:'', dosage:'', posology:'', duration:'' }], notes:p.content?.notes||'' });
    setIsEditOpen(true);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color:T }}/>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="patient-prescriptions">

      {/* Header page */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/patients"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2"/>Retour</Button></Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" style={{ color:T }}/>Ordonnances
            </h1>
            {patient && <p className="text-gray-500 flex items-center gap-1 text-sm"><User className="h-4 w-4"/>{patient.first_name} {patient.last_name}</p>}
          </div>
        </div>
        <Button data-testid="new-prescription-btn" onClick={()=>{ setForm(emptyForm); setIsCreateOpen(true); }}
          style={{ background:`linear-gradient(135deg,${T},#13A3B4)`, color:'#fff', border:'none', boxShadow:'0 4px 14px rgba(13,122,135,.28)' }}>
          <Plus className="h-4 w-4 mr-2"/>Nouvelle ordonnance
        </Button>
      </div>

      {/* Liste */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #F1F5F9' }}>
          <span style={{ fontWeight:700, fontSize:15, color:'#0F172A' }}>{prescriptions.length} ordonnance{prescriptions.length!==1?'s':''}</span>
        </div>
        <div style={{ padding:'0 16px' }}>
          {prescriptions.length===0 ? (
            <div style={{ textAlign:'center', padding:'48px 0', color:'#94A3B8' }}>
              <FileText size={38} style={{ margin:'0 auto 12px', display:'block', opacity:.25 }}/>
              <p style={{ margin:0, fontSize:14 }}>Aucune ordonnance pour ce patient</p>
            </div>
          ) : prescriptions.map(p => (
            <div key={p.id} style={{ padding:'14px 4px', borderBottom:'1px solid #F8FAFC', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
                  <span style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:14, color:'#0F172A' }}>{p.number}</span>
                  <Badge className={STATUS_COLORS[p.status]}>{STATUS_LABELS[p.status]}</Badge>
                  <span style={{ fontSize:11, color:'#94A3B8' }}>{fdate(p.created_at)}</span>
                </div>
                {p.content?.items?.length>0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                    {p.content.items.filter(i=>i.medication).map((item,idx)=>(
                      <span key={idx} style={{ fontSize:11, background:'#F0FDFE', color:T, padding:'2px 9px', borderRadius:99, border:`1px solid ${T}25`, fontWeight:600 }}>
                        {item.medication}{item.dosage?` ${item.dosage}`:''}
                      </span>
                    ))}
                  </div>
                )}
                {p.content?.notes && <div style={{ fontSize:12, color:'#64748B', fontStyle:'italic', marginTop:4 }}>{p.content.notes}</div>}
              </div>
              <div style={{ display:'flex', gap:2, flexShrink:0 }}>
                {p.status==='DRAFT' && <>
                  <Button variant="ghost" size="sm" onClick={()=>openEdit(p)} title="Modifier"><Edit2 className="h-4 w-4"/></Button>
                  <Button variant="ghost" size="sm" onClick={()=>handleIssue(p)} className="text-green-600" title="Emettre"><Send className="h-4 w-4"/></Button>
                </>}
                <Button variant="ghost" size="sm" onClick={()=>handlePrintById(p.id)} title="Imprimer"><Printer className="h-4 w-4"/></Button>
                {p.status!=='CANCELLED' && <Button variant="ghost" size="sm" onClick={()=>handleDownload(p)} title="PDF"><Download className="h-4 w-4"/></Button>}
                {p.status!=='CANCELLED' && <Button variant="ghost" size="sm" onClick={()=>handleCancel(p)} className="text-red-600" title="Annuler"><XCircle className="h-4 w-4"/></Button>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <PrescriptionModal
        open={isCreateOpen} onClose={()=>{ setIsCreateOpen(false); setForm(emptyForm); }}
        title="Nouvelle ordonnance" formData={form} setFormData={setForm}
        saving={saving} onSubmit={handleCreate} submitLabel="Creer l'ordonnance"
        suggestions={suggestions} patient={patient}/>

      <PrescriptionModal
        open={isEditOpen} onClose={()=>{ setIsEditOpen(false); setSelPresc(null); setForm(emptyForm); }}
        title={`Modifier ${selPresc?.number||''}`} formData={form} setFormData={setForm}
        saving={saving} onSubmit={handleUpdate} submitLabel="Enregistrer"
        suggestions={suggestions} patient={patient}/>
    </div>
  );
};

export default PatientPrescriptions;
