import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  FileText, Plus, Download, ArrowLeft, User, Loader2,
  Send, XCircle, Trash2, Edit2, CheckCircle, X, Printer,
  Search, Clock, Pill, ChevronDown, Eye
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API  = `${BACKEND_URL}/api`;
const authH = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const STATUS_COLORS = { DRAFT:'bg-yellow-100 text-yellow-800', ISSUED:'bg-green-100 text-green-800', CANCELLED:'bg-red-100 text-red-800' };
const STATUS_LABELS = { DRAFT:'Brouillon', ISSUED:'Emise', CANCELLED:'Annulee' };
const fdate = d => new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });

/* ── Presets rapides ── */
const POSOLOGY_PRESETS = ['1 fois/jour', '2 fois/jour', '3 fois/jour', '1 fois/semaine', 'Matin et soir', 'Matin, midi, soir', 'Avant les repas', 'Apres les repas'];
const DURATION_PRESETS = ['3 jours', '5 jours', '7 jours', '10 jours', '14 jours', '21 jours', '1 mois', '3 mois'];
const DOSAGE_PRESETS   = ['100mg', '250mg', '500mg', '1000mg', '5ml', '10ml', '25mg', '50mg'];

const C = { teal:'#0D7A87', purple:'#7C3AED', green:'#10B981', amber:'#F59E0B' };

const inp = {
  width:'100%', padding:'9px 12px', borderRadius:10,
  border:'1.5px solid #E2E8F0', fontSize:13, fontFamily:'inherit',
  background:'#fff', boxSizing:'border-box', outline:'none', transition:'border-color .18s'
};
const fi = e => e.target.style.borderColor = C.teal;
const bi = e => e.target.style.borderColor = '#E2E8F0';

/* ── Boutons preset ── */
const PresetBtn = ({ label, onClick }) => (
  <button type="button" onClick={onClick}
    style={{ padding:'3px 9px', borderRadius:99, border:'1px solid #E2E8F0', background:'#F8FAFC', cursor:'pointer', fontSize:11, fontWeight:600, color:'#475569', transition:'all .12s', whiteSpace:'nowrap' }}
    onMouseOver={e => { e.currentTarget.style.borderColor=C.teal; e.currentTarget.style.color=C.teal; e.currentTarget.style.background='#F0FDFE'; }}
    onMouseOut={e  => { e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.color='#475569'; e.currentTarget.style.background='#F8FAFC'; }}>
    {label}
  </button>
);

/* ── Modal ── */
const Modal = ({ open, onClose, title, children, maxW=680 }) => {
  if (!open) return null;
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(15,23,42,.6)', overflowY:'auto', padding:'24px 16px 24px' }}>
      <div style={{ background:'#fff', borderRadius:20, padding:'24px 30px', width:'100%', maxWidth:maxW, margin:'0 auto', boxShadow:'0 32px 80px rgba(15,23,42,.25)', border:'1px solid #E2E8F0', position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'#F8FAFC', border:'none', cursor:'pointer', padding:7, borderRadius:8, display:'flex', color:'#64748B' }}>
          <X size={15}/>
        </button>
        {title && <h2 style={{ fontFamily:'Plus Jakarta Sans', fontSize:17, fontWeight:700, color:'#0F172A', margin:'0 0 18px', paddingRight:28 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
};

/* ── Autocomplete medicament ── */
const MedInput = ({ value, onChange, suggestions, onPickSuggestion }) => {
  const [open, setOpen]       = useState(false);
  const [filtered, setFiltered] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    if (!value.trim()) { setFiltered(suggestions.slice(0, 6)); return; }
    const q = value.toLowerCase();
    setFiltered(suggestions.filter(s => s.name.toLowerCase().includes(q)).slice(0, 8));
  }, [value, suggestions]);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const pick = med => { onPickSuggestion(med); setOpen(false); };

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div style={{ position:'relative' }}>
        <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#94A3B8', pointerEvents:'none' }}/>
        <input
          style={{ ...inp, paddingLeft:32, fontSize:14, fontWeight:500 }}
          placeholder="Nom du medicament *"
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={e => bi({ target: e.target })}
          autoComplete="off"
        />
        {value && (
          <button type="button" onClick={() => onChange('')}
            style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94A3B8', padding:2, display:'flex' }}>
            <X size={12}/>
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:300, background:'#fff', border:'1.5px solid #0D7A87', borderRadius:12, boxShadow:'0 12px 32px rgba(0,0,0,.12)', overflow:'hidden' }}>
          <div style={{ padding:'6px 12px', background:'#F0FDFE', borderBottom:'1px solid #E2E8F0', fontSize:10, fontWeight:700, color:C.teal, textTransform:'uppercase', letterSpacing:'.08em' }}>
            {value ? 'Suggestions' : 'Medicaments recents'}
          </div>
          {filtered.map((med, i) => (
            <div key={i} onClick={() => pick(med)}
              style={{ padding:'10px 14px', cursor:'pointer', borderBottom:i<filtered.length-1?'1px solid #F8FAFC':'none', transition:'background .1s' }}
              onMouseOver={e => e.currentTarget.style.background='#F0FDFE'}
              onMouseOut={e  => e.currentTarget.style.background='transparent'}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontWeight:700, fontSize:13, color:'#0F172A' }}>{med.name}</div>
                {med.count > 0 && <span style={{ fontSize:10, color:'#94A3B8', background:'#F1F5F9', padding:'1px 6px', borderRadius:99 }}>x{med.count}</span>}
              </div>
              {(med.dosage || med.posology || med.duration) && (
                <div style={{ fontSize:11, color:'#64748B', marginTop:3, display:'flex', gap:8, flexWrap:'wrap' }}>
                  {med.dosage   && <span style={{ color:C.teal }}>Dosage: {med.dosage}</span>}
                  {med.posology && <span>Posologie: {med.posology}</span>}
                  {med.duration && <span>Duree: {med.duration}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Un item medicament ── */
const MedItem = ({ item, index, total, onUpdate, onRemove, suggestions }) => {
  const [showPosPresets, setShowPosPresets] = useState(false);
  const [showDurPresets, setShowDurPresets] = useState(false);
  const [showDosPresets, setShowDosPresets] = useState(false);

  const handlePickSuggestion = med => {
    onUpdate(index, 'medication', med.name);
    if (med.dosage)   onUpdate(index, 'dosage',   med.dosage);
    if (med.posology) onUpdate(index, 'posology', med.posology);
    if (med.duration) onUpdate(index, 'duration', med.duration);
  };

  return (
    <div style={{ border:'1.5px solid #E2E8F0', borderRadius:14, overflow:'hidden', marginBottom:12, background:'#fff', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
      {/* En-tete item */}
      <div style={{ background:'linear-gradient(135deg,#F0FDFE,#F8FAFC)', padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #E2E8F0' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:22, height:22, borderRadius:'50%', background:C.teal, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <span style={{ fontSize:11, fontWeight:800, color:'#fff' }}>{index + 1}</span>
          </div>
          <span style={{ fontSize:13, fontWeight:700, color:C.teal }}>
            {item.medication || `Medicament ${index + 1}`}
          </span>
        </div>
        {total > 1 && (
          <button type="button" onClick={() => onRemove(index)}
            style={{ background:'#FEE2E2', border:'none', cursor:'pointer', color:'#EF4444', padding:'4px 8px', borderRadius:7, display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600 }}>
            <Trash2 size={11}/> Supprimer
          </button>
        )}
      </div>

      <div style={{ padding:'14px' }}>
        {/* Nom medicament */}
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, fontWeight:700, color:'#475569', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'.06em' }}>
            Nom du medicament *
          </label>
          <MedInput
            value={item.medication}
            onChange={val => onUpdate(index, 'medication', val)}
            suggestions={suggestions}
            onPickSuggestion={handlePickSuggestion}
          />
        </div>

        {/* Dosage */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'.06em' }}>Dosage</label>
            <button type="button" onClick={() => setShowDosPresets(!showDosPresets)}
              style={{ fontSize:10, color:C.teal, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:3, fontWeight:600 }}>
              Presets <ChevronDown size={10} style={{ transform: showDosPresets ? 'rotate(180deg)' : 'none', transition:'transform .2s' }}/>
            </button>
          </div>
          <input style={inp} placeholder="Ex: 500mg, 1 comprime, 10ml..." value={item.dosage} onChange={e => onUpdate(index,'dosage',e.target.value)} onFocus={fi} onBlur={bi}/>
          {showDosPresets && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:6 }}>
              {DOSAGE_PRESETS.map(p => (
                <PresetBtn key={p} label={p} onClick={() => { onUpdate(index,'dosage',p); setShowDosPresets(false); }}/>
              ))}
            </div>
          )}
        </div>

        {/* Posologie + Duree cote a cote */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {/* Posologie */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'.06em' }}>Posologie</label>
              <button type="button" onClick={() => setShowPosPresets(!showPosPresets)}
                style={{ fontSize:10, color:C.teal, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:3, fontWeight:600 }}>
                Presets <ChevronDown size={10} style={{ transform: showPosPresets ? 'rotate(180deg)' : 'none', transition:'transform .2s' }}/>
              </button>
            </div>
            <input style={inp} placeholder="Ex: 2 fois/jour" value={item.posology} onChange={e => onUpdate(index,'posology',e.target.value)} onFocus={fi} onBlur={bi}/>
            {showPosPresets && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:6 }}>
                {POSOLOGY_PRESETS.map(p => (
                  <PresetBtn key={p} label={p} onClick={() => { onUpdate(index,'posology',p); setShowPosPresets(false); }}/>
                ))}
              </div>
            )}
          </div>

          {/* Duree */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#475569', textTransform:'uppercase', letterSpacing:'.06em' }}>Duree</label>
              <button type="button" onClick={() => setShowDurPresets(!showDurPresets)}
                style={{ fontSize:10, color:C.teal, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:3, fontWeight:600 }}>
                Presets <ChevronDown size={10} style={{ transform: showDurPresets ? 'rotate(180deg)' : 'none', transition:'transform .2s' }}/>
              </button>
            </div>
            <input style={inp} placeholder="Ex: 7 jours" value={item.duration} onChange={e => onUpdate(index,'duration',e.target.value)} onFocus={fi} onBlur={bi}/>
            {showDurPresets && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:6 }}>
                {DURATION_PRESETS.map(p => (
                  <PresetBtn key={p} label={p} onClick={() => { onUpdate(index,'duration',p); setShowDurPresets(false); }}/>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Apercu ligne */}
        {item.medication && (
          <div style={{ marginTop:10, padding:'8px 12px', background:'#F8FAFC', borderRadius:9, border:'1px solid #E2E8F0', fontSize:12, color:'#475569', borderLeft:`3px solid ${C.teal}` }}>
            <strong style={{ color:'#0F172A' }}>{item.medication}</strong>
            {item.dosage   && ` — ${item.dosage}`}
            {item.posology && ` · ${item.posology}`}
            {item.duration && ` · ${item.duration}`}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Formulaire ordonnance ── */
const PrescriptionForm = ({ formData, setFormData, saving, onSubmit, submitLabel, onCancel, suggestions }) => {
  const addItem    = () => setFormData(f => ({ ...f, items: [...f.items, { medication:'', dosage:'', posology:'', duration:'' }] }));
  const removeItem = i  => setFormData(f => ({ ...f, items: f.items.length > 1 ? f.items.filter((_,idx) => idx !== i) : [{ medication:'', dosage:'', posology:'', duration:'' }] }));
  const updateItem = (i, field, val) => setFormData(f => {
    const it = [...f.items]; it[i] = { ...it[i], [field]: val }; return { ...f, items: it };
  });

  const filled = formData.items.filter(i => i.medication.trim()).length;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>

      {/* Medicaments */}
      <div style={{ marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Pill size={15} color={C.teal}/>
            <span style={{ fontWeight:700, fontSize:14, color:'#0F172A' }}>Medicaments</span>
            {filled > 0 && <span style={{ background:'#F0FDFE', color:C.teal, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99, border:`1px solid ${C.teal}` }}>{filled} renseigne{filled > 1 ? 's' : ''}</span>}
          </div>
        </div>

        {formData.items.map((item, i) => (
          <MedItem key={i} item={item} index={i} total={formData.items.length}
            onUpdate={updateItem} onRemove={removeItem} suggestions={suggestions}/>
        ))}

        <button type="button" onClick={addItem}
          style={{ width:'100%', padding:'10px', borderRadius:11, border:`2px dashed #CBD5E1`, background:'#F8FAFC', cursor:'pointer', fontSize:13, fontWeight:600, color:'#64748B', display:'flex', alignItems:'center', justifyContent:'center', gap:7, transition:'all .15s' }}
          onMouseOver={e => { e.currentTarget.style.borderColor=C.teal; e.currentTarget.style.color=C.teal; e.currentTarget.style.background='#F0FDFE'; }}
          onMouseOut={e  => { e.currentTarget.style.borderColor='#CBD5E1'; e.currentTarget.style.color='#64748B'; e.currentTarget.style.background='#F8FAFC'; }}>
          <Plus size={14}/> Ajouter un medicament
        </button>
      </div>

      {/* Notes */}
      <div style={{ marginBottom:18 }}>
        <label style={{ fontSize:11, fontWeight:700, color:'#475569', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }}>
          Notes / Instructions au patient
        </label>
        <textarea
          style={{ ...inp, resize:'vertical', minHeight:76, lineHeight:1.6 }}
          placeholder="Ex: Prendre avec de la nourriture, eviter l'alcool, revenir si symptomes persistent..."
          value={formData.notes}
          onChange={e => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          onFocus={fi} onBlur={bi}
        />
      </div>

      {/* Apercu recapitulatif */}
      {filled > 0 && (
        <div style={{ background:'linear-gradient(135deg,#F0FDFE,#F8FAFC)', border:`1px solid ${C.teal}`, borderRadius:12, padding:'12px 16px', marginBottom:18 }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.teal, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8, display:'flex', alignItems:'center', gap:5 }}>
            <Eye size={11}/> Apercu de l'ordonnance
          </div>
          {formData.items.filter(i => i.medication).map((item, i) => (
            <div key={i} style={{ fontSize:12, color:'#0F172A', padding:'4px 0', borderBottom:i<filled-1?'1px solid #E2E8F0':'none', display:'flex', gap:6, alignItems:'flex-start' }}>
              <span style={{ color:C.teal, fontWeight:800, flexShrink:0 }}>{i+1}.</span>
              <span>
                <strong>{item.medication}</strong>
                {item.dosage   && <span style={{ color:'#475569' }}> — {item.dosage}</span>}
                {item.posology && <span style={{ color:'#475569' }}> · {item.posology}</span>}
                {item.duration && <span style={{ color:'#475569' }}> · {item.duration}</span>}
              </span>
            </div>
          ))}
          {formData.notes && <div style={{ marginTop:8, fontSize:11, color:'#64748B', fontStyle:'italic', paddingTop:8, borderTop:'1px solid #E2E8F0' }}>{formData.notes}</div>}
        </div>
      )}

      {/* Actions */}
      <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:8, borderTop:'1px solid #F1F5F9' }}>
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={onSubmit} disabled={saving || filled === 0}
          style={{ background:'linear-gradient(135deg,#7C3AED,#9333EA)', color:'#fff', border:'none', opacity:(saving||filled===0)?.6:1 }}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <CheckCircle className="h-4 w-4 mr-2"/>}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════ */
const PatientPrescriptions = () => {
  const { patientId } = useParams();
  const [patient,       setPatient]       = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [suggestions,   setSuggestions]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [isCreateOpen,  setIsCreateOpen]  = useState(false);
  const [isEditOpen,    setIsEditOpen]    = useState(false);
  const [selPresc,      setSelPresc]      = useState(null);
  const [saving,        setSaving]        = useState(false);

  const emptyForm = { items:[{ medication:'', dosage:'', posology:'', duration:'' }], notes:'' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!patientId || patientId === 'undefined') { setLoading(false); return; }
    fetchPatient(); fetchPrescriptions(); fetchSuggestions();
  }, [patientId]);

  const fetchPatient = async () => {
    try { const r = await axios.get(`${API}/patients/${patientId}`, authH()); setPatient(r.data); } catch {}
  };

  const fetchPrescriptions = async () => {
    try {
      const r = await axios.get(`${API}/patients/${patientId}/prescriptions`, authH());
      setPrescriptions(r.data.prescriptions || []);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  const fetchSuggestions = async () => {
    try {
      const r = await axios.get(`${API}/prescriptions/medications`, authH());
      setSuggestions(r.data.medications || []);
    } catch { setSuggestions([]); }
  };

  const handleCreate = async () => {
    const validItems = form.items.filter(i => i.medication.trim());
    if (!validItems.length) { toast.error('Ajoutez au moins un medicament'); return; }
    setSaving(true);
    try {
      const r = await axios.post(`${API}/patients/${patientId}/prescriptions`, {
        content: { items: validItems, notes: form.notes }
      }, authH());
      toast.success('Ordonnance creee');
      setIsCreateOpen(false); setForm(emptyForm); fetchPrescriptions(); fetchSuggestions();
      const id = r.data.prescription?.id;
      if (id && window.confirm('Imprimer maintenant ?')) handlePrintById(id);
    } catch (e) { toast.error(e.response?.data?.error || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/prescriptions/${selPresc.id}`, {
        content: { items: form.items.filter(i => i.medication.trim()), notes: form.notes }
      }, authH());
      toast.success('Ordonnance mise a jour');
      setIsEditOpen(false); setSelPresc(null); setForm(emptyForm); fetchPrescriptions();
    } catch (e) {
      toast.error(e.response?.data?.error === 'PRESCRIPTION_LOCKED' ? 'Ordonnance verrouillee' : 'Erreur');
    } finally { setSaving(false); }
  };

  const handleIssue = async p => {
    if (!window.confirm('Emettre cette ordonnance ? Action irreversible.')) return;
    try { await axios.post(`${API}/prescriptions/${p.id}/issue`, {}, authH()); toast.success('Emise'); fetchPrescriptions(); }
    catch (e) { toast.error(e.response?.data?.error || 'Erreur'); }
  };

  const handleCancel = async p => {
    if (!window.confirm('Annuler cette ordonnance ?')) return;
    try { await axios.post(`${API}/prescriptions/${p.id}/cancel`, {}, authH()); toast.success('Annulee'); fetchPrescriptions(); }
    catch (e) { toast.error(e.response?.data?.error || 'Erreur'); }
  };

  const handlePrintById = id => {
    fetch(`${API}/prescriptions/${id}/pdf`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.blob(); })
      .then(blob => { const url = window.URL.createObjectURL(blob); window.open(url, '_blank'); setTimeout(() => window.URL.revokeObjectURL(url), 60000); })
      .catch(() => toast.error('Erreur impression'));
  };

  const handleDownload = async p => {
    try {
      const r = await fetch(`${API}/prescriptions/${p.id}/pdf`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!r.ok) throw new Error();
      const blob = await r.blob(), url = window.URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = `${p.number}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url); toast.success('PDF telecharge');
    } catch { toast.error('Erreur PDF'); }
  };

  const openEdit = p => {
    setSelPresc(p);
    setForm({ items: p.content?.items?.length ? p.content.items : [{ medication:'', dosage:'', posology:'', duration:'' }], notes: p.content?.notes || '' });
    setIsEditOpen(true);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color:C.teal }}/>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="patient-prescriptions">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/patients"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2"/>Retour</Button></Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" style={{ color:C.purple }}/>Ordonnances
            </h1>
            {patient && <p className="text-gray-500 flex items-center gap-1"><User className="h-4 w-4"/>{patient.first_name} {patient.last_name}</p>}
          </div>
        </div>
        <Button data-testid="new-prescription-btn" onClick={() => { setForm(emptyForm); setIsCreateOpen(true); }}
          style={{ background:`linear-gradient(135deg,${C.purple},#9333EA)`, color:'#fff', border:'none', boxShadow:'0 4px 14px rgba(124,58,237,.3)' }}>
          <Plus className="h-4 w-4 mr-2"/>Nouvelle ordonnance
        </Button>
      </div>

      {/* Liste */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{prescriptions.length} ordonnance{prescriptions.length !== 1 ? 's' : ''}</CardTitle>
        </CardHeader>
        <CardContent>
          {prescriptions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30"/>
              <p>Aucune ordonnance pour ce patient</p>
            </div>
          ) : (
            <div className="space-y-3">
              {prescriptions.map(p => (
                <div key={p.id} data-testid={`presc-${p.number}`}
                  style={{ padding:'16px', border:'1px solid #E2E8F0', borderRadius:14, background:'#fff', transition:'all .15s' }}
                  onMouseOver={e => e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,.06)'}
                  onMouseOut={e  => e.currentTarget.style.boxShadow='none'}>
                  <div className="flex items-start justify-between">
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                        <span style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A' }}>{p.number}</span>
                        <Badge className={STATUS_COLORS[p.status]}>{STATUS_LABELS[p.status]}</Badge>
                        <span style={{ fontSize:12, color:'#94A3B8' }}>{fdate(p.created_at)}</span>
                        {p.issued_at && <span style={{ fontSize:11, color:'#94A3B8' }}>· Emise le {fdate(p.issued_at)}</span>}
                      </div>

                      {p.content?.items?.length > 0 && (
                        <div style={{ background:'#F8FAFC', borderRadius:10, padding:'10px 12px', marginTop:4 }}>
                          {p.content.items.filter(i => i.medication).map((item, idx) => (
                            <div key={idx} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'5px 0', borderBottom:idx<p.content.items.filter(i=>i.medication).length-1?'1px solid #F1F5F9':'none' }}>
                              <div style={{ width:6, height:6, borderRadius:'50%', background:C.teal, flexShrink:0, marginTop:5 }}/>
                              <div>
                                <span style={{ fontWeight:700, fontSize:13, color:'#0F172A' }}>{item.medication}</span>
                                <div style={{ fontSize:12, color:'#64748B', marginTop:2, display:'flex', gap:10, flexWrap:'wrap' }}>
                                  {item.dosage   && <span>Dosage : <strong>{item.dosage}</strong></span>}
                                  {item.posology && <span>Posologie : <strong>{item.posology}</strong></span>}
                                  {item.duration && <span>Duree : <strong>{item.duration}</strong></span>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {p.content?.notes && (
                        <div style={{ fontSize:12, color:'#64748B', fontStyle:'italic', marginTop:6, paddingLeft:8, borderLeft:'2px solid #E2E8F0' }}>
                          {p.content.notes}
                        </div>
                      )}
                    </div>

                    <div style={{ display:'flex', gap:4, flexShrink:0, marginLeft:12 }}>
                      {p.status === 'DRAFT' && <>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)} title="Modifier"><Edit2 className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleIssue(p)} className="text-green-600" title="Emettre"><Send className="h-4 w-4"/></Button>
                      </>}
                      <Button variant="ghost" size="sm" onClick={() => handlePrintById(p.id)} title="Imprimer"><Printer className="h-4 w-4"/></Button>
                      {p.status !== 'CANCELLED' && <Button variant="ghost" size="sm" onClick={() => handleDownload(p)} title="PDF"><Download className="h-4 w-4"/></Button>}
                      {p.status !== 'CANCELLED' && <Button variant="ghost" size="sm" onClick={() => handleCancel(p)} className="text-red-600" title="Annuler"><XCircle className="h-4 w-4"/></Button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Creer */}
      <Modal open={isCreateOpen} onClose={() => { setIsCreateOpen(false); setForm(emptyForm); }} title="Nouvelle ordonnance" maxW={900}>
        <PrescriptionForm formData={form} setFormData={setForm} saving={saving} onSubmit={handleCreate}
          submitLabel="Creer l'ordonnance" onCancel={() => { setIsCreateOpen(false); setForm(emptyForm); }} suggestions={suggestions}/>
      </Modal>

      {/* Modal Modifier */}
      <Modal open={isEditOpen} onClose={() => { setIsEditOpen(false); setSelPresc(null); setForm(emptyForm); }} title={`Modifier ${selPresc?.number || ''}`} maxW={900}>
        <PrescriptionForm formData={form} setFormData={setForm} saving={saving} onSubmit={handleUpdate}
          submitLabel="Enregistrer" onCancel={() => { setIsEditOpen(false); setSelPresc(null); setForm(emptyForm); }} suggestions={suggestions}/>
      </Modal>
    </div>
  );
};

export default PatientPrescriptions;
