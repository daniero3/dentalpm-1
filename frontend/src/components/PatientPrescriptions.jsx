import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
  FileText, Plus, Download, ArrowLeft, User, Loader2,
  Send, XCircle, Trash2, Edit2, CheckCircle, X, Printer, Search
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const authH = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const STATUS_COLORS  = { DRAFT:'bg-yellow-100 text-yellow-800', ISSUED:'bg-green-100 text-green-800', CANCELLED:'bg-red-100 text-red-800' };
const STATUS_LABELS  = { DRAFT:'Brouillon', ISSUED:'Émise', CANCELLED:'Annulée' };
const fdate = d => new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });

const inp = { width:'100%', padding:'8px 12px', borderRadius:8, border:'1.5px solid #E2E8F0', fontSize:13, fontFamily:'inherit', background:'#fff', boxSizing:'border-box', outline:'none' };
const fi  = e => e.target.style.borderColor = '#0D7A87';
const bi  = e => e.target.style.borderColor = '#E2E8F0';

/* ── Modal ── */
const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(15,23,42,.55)', overflowY:'auto', padding:'60px 16px 32px' }}>
      <div style={{ background:'#fff', borderRadius:18, padding:26, width:'100%', maxWidth:560, margin:'0 auto', boxShadow:'0 24px 64px rgba(15,23,42,.2)', border:'1px solid #E2E8F0', position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'#F8FAFC', border:'none', cursor:'pointer', padding:7, borderRadius:8, display:'flex', color:'#64748B' }}>
          <X size={15}/>
        </button>
        {title && <h2 style={{ fontFamily:'Plus Jakarta Sans', fontSize:17, fontWeight:700, color:'#0F172A', margin:'0 0 20px', paddingRight:28 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
};

/* ── Champ médicament avec autocomplete ── */
const MedInput = ({ value, onChange, suggestions }) => {
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    if (!value.trim()) { setFiltered([]); return; }
    const q = value.toLowerCase();
    setFiltered(suggestions.filter(s => s.name.toLowerCase().includes(q)).slice(0, 8));
  }, [value, suggestions]);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pick = med => { onChange('medication', med.name); setOpen(false); };

  return (
    <div ref={ref} style={{ position:'relative', marginBottom:8 }}>
      <div style={{ position:'relative' }}>
        <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94A3B8', pointerEvents:'none' }}/>
        <input
          style={{ ...inp, paddingLeft:30 }}
          placeholder="Nom du médicament *"
          value={value}
          onChange={e => { onChange('medication', e.target.value); setOpen(true); }}
          onFocus={() => { fi({ target: { style: {} } }); setOpen(true); }}
          onBlur={e => bi({ target: e.target })}
          autoComplete="off"
        />
      </div>
      {open && filtered.length > 0 && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:200, background:'#fff', border:'1.5px solid #0D7A87', borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,.1)', overflow:'hidden', marginTop:2 }}>
          {filtered.map((med, i) => (
            <div key={i} onClick={() => pick(med)}
              style={{ padding:'9px 14px', cursor:'pointer', fontSize:13, borderBottom:i<filtered.length-1?'1px solid #F1F5F9':'none', transition:'background .12s' }}
              onMouseOver={e=>e.currentTarget.style.background='#F0FDFE'}
              onMouseOut={e=>e.currentTarget.style.background='transparent'}>
              <div style={{ fontWeight:600, color:'#0F172A' }}>{med.name}</div>
              {(med.dosage || med.posology || med.duration) && (
                <div style={{ fontSize:11, color:'#64748B', marginTop:2 }}>
                  {med.dosage && `Dosage: ${med.dosage}`}
                  {med.posology && ` · Posologie: ${med.posology}`}
                  {med.duration && ` · Durée: ${med.duration}`}
                </div>
              )}
              <div style={{ fontSize:10, color:'#94A3B8', marginTop:1 }}>Utilisé {med.count} fois</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Formulaire ordonnance ── */
const PrescriptionForm = ({ formData, setFormData, saving, onSubmit, submitLabel, onCancel, suggestions }) => {
  const addItem    = () => setFormData(f => ({ ...f, items: [...f.items, { medication:'', dosage:'', posology:'', duration:'' }] }));
  const removeItem = i  => setFormData(f => ({ ...f, items: f.items.length > 1 ? f.items.filter((_,idx)=>idx!==i) : [{ medication:'', dosage:'', posology:'', duration:'' }] }));
  const updateItem = (i, field, val) => setFormData(f => { const it=[...f.items]; it[i]={...it[i],[field]:val}; return {...f,items:it}; });

  /* Auto-remplir dosage/posology/durée depuis suggestion */
  const pickSuggestion = (i, med) => {
    setFormData(f => {
      const it = [...f.items];
      it[i] = { medication:med.name, dosage:med.dosage||it[i].dosage, posology:med.posology||it[i].posology, duration:med.duration||it[i].duration };
      return {...f, items:it};
    });
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div>
        <label style={{ display:'block', fontWeight:700, fontSize:13, color:'#475569', marginBottom:8 }}>Médicaments</label>
        {formData.items.map((item, i) => (
          <div key={i} style={{ padding:'14px', border:'1px solid #E2E8F0', borderRadius:12, marginBottom:10, background:'#F8FAFC', position:'relative' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <span style={{ fontSize:13, fontWeight:700, color:'#0D7A87' }}>Médicament {i+1}</span>
              {formData.items.length > 1 && (
                <button type="button" onClick={() => removeItem(i)} style={{ background:'none', border:'none', cursor:'pointer', color:'#EF4444', padding:4 }}>
                  <Trash2 size={14}/>
                </button>
              )}
            </div>

            {/* Champ nom avec suggestions */}
            <MedInput value={item.medication} suggestions={suggestions}
              onChange={(field, val) => {
                updateItem(i, field, val);
                // Auto-remplir si on choisit une suggestion exacte
                const exact = suggestions.find(s => s.name.toLowerCase() === val.toLowerCase());
                if (exact) pickSuggestion(i, exact);
              }}
            />

            {/* Dosage, Posologie, Durée */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:'#64748B', display:'block', marginBottom:3 }}>Dosage</label>
                <input style={inp} placeholder="Ex: 500mg" value={item.dosage} onChange={e=>updateItem(i,'dosage',e.target.value)} onFocus={fi} onBlur={bi}/>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:'#64748B', display:'block', marginBottom:3 }}>Posologie</label>
                <input style={inp} placeholder="Ex: 3x/jour" value={item.posology} onChange={e=>updateItem(i,'posology',e.target.value)} onFocus={fi} onBlur={bi}/>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:'#64748B', display:'block', marginBottom:3 }}>Durée</label>
                <input style={inp} placeholder="Ex: 7 jours" value={item.duration} onChange={e=>updateItem(i,'duration',e.target.value)} onFocus={fi} onBlur={bi}/>
              </div>
            </div>
          </div>
        ))}
        <button type="button" onClick={addItem}
          style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:9, border:'1.5px solid #E2E8F0', background:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', color:'#0D7A87' }}>
          <Plus size={13}/> Ajouter un médicament
        </button>
      </div>

      <div>
        <label style={{ display:'block', fontWeight:700, fontSize:13, color:'#475569', marginBottom:6 }}>Notes / Instructions</label>
        <textarea
          style={{ ...inp, resize:'vertical', minHeight:72 }}
          placeholder="Instructions particulières pour le patient..."
          value={formData.notes}
          onChange={e => setFormData({...formData, notes:e.target.value})}
          rows={3}
          onFocus={fi} onBlur={bi}
        />
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:8, borderTop:'1px solid #F1F5F9' }}>
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button onClick={onSubmit} disabled={saving}>
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
    } catch { toast.error('Erreur chargement ordonnances'); }
    finally { setLoading(false); }
  };

  const fetchSuggestions = async () => {
    try {
      const r = await axios.get(`${API}/prescriptions/medications`, authH());
      setSuggestions(r.data.medications || []);
    } catch { setSuggestions([]); }
  };

  const handleCreate = async () => {
    if (!form.items.some(i => i.medication.trim())) { toast.error('Ajoutez au moins un médicament'); return; }
    setSaving(true);
    try {
      const r = await axios.post(`${API}/patients/${patientId}/prescriptions`, {
        content: { items: form.items.filter(i => i.medication.trim()), notes: form.notes }
      }, authH());
      toast.success('Ordonnance créée');
      setIsCreateOpen(false); setForm(emptyForm); fetchPrescriptions(); fetchSuggestions();
      const id = r.data.prescription?.id;
      if (id && window.confirm('Imprimer l\'ordonnance maintenant ?')) handlePrintById(id);
    } catch (e) { toast.error(e.response?.data?.error || 'Erreur création'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/prescriptions/${selPresc.id}`, {
        content: { items: form.items.filter(i => i.medication.trim()), notes: form.notes }
      }, authH());
      toast.success('Ordonnance mise à jour');
      setIsEditOpen(false); setSelPresc(null); setForm(emptyForm); fetchPrescriptions();
    } catch (e) {
      toast.error(e.response?.data?.error === 'PRESCRIPTION_LOCKED' ? 'Ordonnance verrouillée' : e.response?.data?.error || 'Erreur');
    } finally { setSaving(false); }
  };

  const handleIssue = async p => {
    if (!window.confirm(`Émettre l'ordonnance ${p.number} ? Action irréversible.`)) return;
    try { await axios.post(`${API}/prescriptions/${p.id}/issue`, {}, authH()); toast.success('Émise'); fetchPrescriptions(); }
    catch (e) { toast.error(e.response?.data?.error || 'Erreur'); }
  };

  const handleCancel = async p => {
    if (!window.confirm(`Annuler l'ordonnance ${p.number} ?`)) return;
    try { await axios.post(`${API}/prescriptions/${p.id}/cancel`, {}, authH()); toast.success('Annulée'); fetchPrescriptions(); }
    catch (e) { toast.error(e.response?.data?.error || 'Erreur'); }
  };

  const handlePrintById = id => {
    fetch(`${API}/prescriptions/${id}/pdf`, { headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.blob(); })
      .then(blob => { const url=window.URL.createObjectURL(blob); window.open(url,'_blank'); setTimeout(()=>window.URL.revokeObjectURL(url),60000); })
      .catch(() => toast.error('Erreur impression PDF'));
  };

  const handleDownload = async p => {
    try {
      const r = await fetch(`${API}/prescriptions/${p.id}/pdf`, { headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` } });
      if (!r.ok) throw new Error();
      const blob = await r.blob(), url = window.URL.createObjectURL(blob), a = document.createElement('a');
      a.href=url; a.download=`${p.number}.pdf`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url); toast.success('PDF téléchargé');
    } catch { toast.error('Erreur PDF'); }
  };

  const openEdit = p => {
    setSelPresc(p);
    setForm({ items: p.content?.items?.length ? p.content.items : [{ medication:'', dosage:'', posology:'', duration:'' }], notes: p.content?.notes||'' });
    setIsEditOpen(true);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color:'#0D7A87' }}/>
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
              <FileText className="h-6 w-6 text-purple-600"/>Ordonnances
            </h1>
            {patient && <p className="text-gray-500 flex items-center gap-1"><User className="h-4 w-4"/>{patient.first_name} {patient.last_name}</p>}
          </div>
        </div>
        <Button data-testid="new-prescription-btn" onClick={() => { setForm(emptyForm); setIsCreateOpen(true); }}>
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
                  onMouseOver={e=>e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,.06)'}
                  onMouseOut={e=>e.currentTarget.style.boxShadow='none'}>
                  <div className="flex items-start justify-between">
                    <div style={{ flex:1, minWidth:0 }}>
                      {/* En-tête */}
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                        <span style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A' }}>{p.number}</span>
                        <Badge className={STATUS_COLORS[p.status]}>{STATUS_LABELS[p.status]}</Badge>
                        <span style={{ fontSize:12, color:'#94A3B8' }}>{fdate(p.created_at)}</span>
                        {p.issued_at && <span style={{ fontSize:11, color:'#94A3B8' }}>· Émise le {fdate(p.issued_at)}</span>}
                      </div>

                      {/* Médicaments avec posologie */}
                      {p.content?.items?.length > 0 && (
                        <div style={{ background:'#F8FAFC', borderRadius:10, padding:'10px 12px', marginTop:4 }}>
                          {p.content.items.filter(i => i.medication).map((item, idx) => (
                            <div key={idx} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'5px 0', borderBottom:idx<p.content.items.filter(i=>i.medication).length-1?'1px solid #F1F5F9':'none' }}>
                              <div style={{ width:6, height:6, borderRadius:'50%', background:'#0D7A87', flexShrink:0, marginTop:5 }}/>
                              <div>
                                <span style={{ fontWeight:700, fontSize:13, color:'#0F172A' }}>{item.medication}</span>
                                <div style={{ fontSize:12, color:'#64748B', marginTop:2, display:'flex', gap:10, flexWrap:'wrap' }}>
                                  {item.dosage    && <span>Dosage : <strong>{item.dosage}</strong></span>}
                                  {item.posology  && <span>Posologie : <strong>{item.posology}</strong></span>}
                                  {item.duration  && <span>Durée : <strong>{item.duration}</strong></span>}
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

                    {/* Actions */}
                    <div style={{ display:'flex', gap:4, flexShrink:0, marginLeft:12 }}>
                      {p.status === 'DRAFT' && <>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)} title="Modifier"><Edit2 className="h-4 w-4"/></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleIssue(p)} className="text-green-600" title="Émettre"><Send className="h-4 w-4"/></Button>
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

      {/* Modal Créer */}
      <Modal open={isCreateOpen} onClose={() => { setIsCreateOpen(false); setForm(emptyForm); }} title="✏️ Nouvelle ordonnance">
        <PrescriptionForm formData={form} setFormData={setForm} saving={saving} onSubmit={handleCreate} submitLabel="Créer (brouillon)" onCancel={() => { setIsCreateOpen(false); setForm(emptyForm); }} suggestions={suggestions}/>
      </Modal>

      {/* Modal Modifier */}
      <Modal open={isEditOpen} onClose={() => { setIsEditOpen(false); setSelPresc(null); setForm(emptyForm); }} title={`✏️ Modifier ${selPresc?.number||''}`}>
        <PrescriptionForm formData={form} setFormData={setForm} saving={saving} onSubmit={handleUpdate} submitLabel="Enregistrer" onCancel={() => { setIsEditOpen(false); setSelPresc(null); setForm(emptyForm); }} suggestions={suggestions}/>
      </Modal>
    </div>
  );
};

export default PatientPrescriptions;
