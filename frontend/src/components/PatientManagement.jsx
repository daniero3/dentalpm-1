import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import { toast } from 'sonner';
import {
  Users, Plus, Search, Edit, Activity, Phone, Mail,
  AlertTriangle, User, Calendar, FileText, ClipboardList,
  FlaskConical, X, Save, Loader2, ChevronRight
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

// ── Modal CSS pur — zéro shadcn Portal ──
const Modal = ({ open, onClose, title, children, maxWidth = 560 }) => {
  if (!open) return null;
  return (
    <div
      style={{
        position:'fixed', inset:0, zIndex:1000,
        background:'rgba(15,23,42,0.5)',
        overflowY:'auto',         /* ✅ scroll sur l'overlay entier */
        padding:'80px 16px 32px', /* ✅ espace topbar en haut */
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background:'#fff', borderRadius:16, padding:28,
        width:'100%', maxWidth, margin:'0 auto',
        boxShadow:'0 16px 48px rgba(15,23,42,0.18)',
        border:'1px solid #E2E8F0', position:'relative'
      }}>
        <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'none', border:'none', cursor:'pointer', color:'#94A3B8', padding:4, borderRadius:6 }}>
          <X size={18} />
        </button>
        {title && <h2 style={{ fontFamily:'Plus Jakarta Sans', fontSize:17, fontWeight:700, color:'#0F172A', margin:'0 0 20px', paddingRight:24 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
};

// ✅ Styles HORS des composants — évite la recréation à chaque frappe
const fieldStyle = {
  width:'100%', padding:'9px 12px', borderRadius:10,
  border:'1.5px solid #E2E8F0', fontSize:13,
  fontFamily:'DM Sans,sans-serif', color:'#0F172A',
  background:'#fff', outline:'none', boxSizing:'border-box',
  transition:'border-color 0.18s ease'
};
const labelStyle = { display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:5 };
const focusField = e => e.target.style.borderColor = '#0D7A87';
const blurField  = e => e.target.style.borderColor = '#E2E8F0';

// ✅ PatientForm — inputs directs SANS sous-composant Field
// pour éviter la perte de focus à chaque frappe
const PatientForm = ({ data, onChange, onSubmit, onCancel, submitting, isEdit }) => (
  <form onSubmit={onSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>

    {/* Prénom + Nom */}
    <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
      <div style={{ flex:'1 1 45%' }}>
        <label style={labelStyle}>Prénom *</label>
        <input style={fieldStyle} type="text" placeholder="Jean"
          value={data.first_name || ''} onChange={e => onChange('first_name', e.target.value)}
          onFocus={focusField} onBlur={blurField} required />
      </div>
      <div style={{ flex:'1 1 45%' }}>
        <label style={labelStyle}>Nom *</label>
        <input style={fieldStyle} type="text" placeholder="Rakoto"
          value={data.last_name || ''} onChange={e => onChange('last_name', e.target.value)}
          onFocus={focusField} onBlur={blurField} required />
      </div>
    </div>

    {/* Date naissance + Sexe */}
    <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
      <div style={{ flex:'1 1 45%' }}>
        <label style={labelStyle}>Date de naissance</label>
        <input style={fieldStyle} type="date"
          value={data.date_of_birth || ''} onChange={e => onChange('date_of_birth', e.target.value)}
          onFocus={focusField} onBlur={blurField} />
      </div>
      <div style={{ flex:'1 1 45%' }}>
        <label style={labelStyle}>Sexe</label>
        <select style={fieldStyle} value={data.gender || ''} onChange={e => onChange('gender', e.target.value)}
          onFocus={focusField} onBlur={blurField}>
          <option value="">Sélectionner...</option>
          <option value="M">Masculin</option>
          <option value="F">Féminin</option>
          <option value="OTHER">Autre</option>
        </select>
      </div>
    </div>

    {/* Téléphone + Email */}
    <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
      <div style={{ flex:'1 1 45%' }}>
        <label style={labelStyle}>Téléphone *</label>
        <input style={fieldStyle} type="text" placeholder="034 00 000 00"
          value={data.phone_primary || ''} onChange={e => onChange('phone_primary', e.target.value)}
          onFocus={focusField} onBlur={blurField} required />
      </div>
      <div style={{ flex:'1 1 45%' }}>
        <label style={labelStyle}>Email</label>
        <input style={fieldStyle} type="email" placeholder="jean@email.mg"
          value={data.email || ''} onChange={e => onChange('email', e.target.value)}
          onFocus={focusField} onBlur={blurField} />
      </div>
    </div>

    {/* Adresse */}
    <div>
      <label style={labelStyle}>Adresse</label>
      <input style={fieldStyle} type="text" placeholder="Antananarivo, Madagascar"
        value={data.address || ''} onChange={e => onChange('address', e.target.value)}
        onFocus={focusField} onBlur={blurField} />
    </div>

    {/* Contact urgence */}
    <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
      <div style={{ flex:'1 1 45%' }}>
        <label style={labelStyle}>Contact urgence</label>
        <input style={fieldStyle} type="text" placeholder="Nom (optionnel)"
          value={data.emergency_contact_name || ''} onChange={e => onChange('emergency_contact_name', e.target.value)}
          onFocus={focusField} onBlur={blurField} />
      </div>
      <div style={{ flex:'1 1 45%' }}>
        <label style={labelStyle}>Tél. urgence</label>
        <input style={fieldStyle} type="text" placeholder="+261 34..."
          value={data.emergency_contact_phone || ''} onChange={e => onChange('emergency_contact_phone', e.target.value)}
          onFocus={focusField} onBlur={blurField} />
      </div>
    </div>

    {/* Antécédents */}
    <div>
      <label style={labelStyle}>Antécédents médicaux</label>
      <textarea style={{ ...fieldStyle, minHeight:64, resize:'vertical' }}
        value={data.medical_history || ''} onChange={e => onChange('medical_history', e.target.value)}
        placeholder="Antécédents médicaux..." onFocus={focusField} onBlur={blurField} />
    </div>

    {/* Allergies */}
    <div>
      <label style={labelStyle}>Allergies</label>
      <textarea style={{ ...fieldStyle, minHeight:52, resize:'vertical' }}
        value={data.allergies || ''} onChange={e => onChange('allergies', e.target.value)}
        placeholder="Allergies connues..." onFocus={focusField} onBlur={blurField} />
    </div>

    {/* Médicaments */}
    <div>
      <label style={labelStyle}>Médicaments actuels</label>
      <textarea style={{ ...fieldStyle, minHeight:52, resize:'vertical' }}
        value={data.current_medications || ''} onChange={e => onChange('current_medications', e.target.value)}
        placeholder="Traitements en cours..." onFocus={focusField} onBlur={blurField} />
    </div>

    <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:10, borderTop:'1px solid #F1F5F9' }}>
      <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
      <Button type="submit" disabled={submitting}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        {isEdit ? 'Modifier' : 'Créer'}
      </Button>
    </div>
  </form>
);

// ══ Composant principal ══
const PatientManagement = () => {
  const { user } = useAuth();
  const [patients, setPatients]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [submitting, setSubmitting]     = useState(false);
  const mountedRef = useRef(true);

  const [formData, setFormData] = useState({
    first_name:'', last_name:'', date_of_birth:'', gender:'',
    phone_primary:'', email:'', address:'',
    emergency_contact_name:'', emergency_contact_phone:'',
    medical_history:'', allergies:'', current_medications:''
  });

  useEffect(() => {
    mountedRef.current = true;
    fetchPatients();
    return () => { mountedRef.current = false; };
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await axios.get(`${API}/patients`, authHeaders());
      const list = res.data.patients || res.data.data || res.data || [];
      if (mountedRef.current) setPatients(Array.isArray(list) ? list : []);
    } catch (err) {
      if (!axios.isCancel(err)) toast.error('Erreur chargement patients');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleFieldChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openCreate = () => {
    setSelectedPatient(null);
    setFormData({ first_name:'', last_name:'', date_of_birth:'', gender:'', phone_primary:'', email:'', address:'', emergency_contact_name:'', emergency_contact_phone:'', medical_history:'', allergies:'', current_medications:'' });
    setIsDialogOpen(true);
  };

  const openEdit = (patient) => {
    setSelectedPatient(patient);
    setFormData({
      first_name:              patient.first_name || '',
      last_name:               patient.last_name  || '',
      date_of_birth:           patient.date_of_birth || '',
      gender:                  patient.gender || '',
      phone_primary:           patient.phone_primary || '',
      email:                   patient.email || '',
      address:                 patient.address || '',
      emergency_contact_name:  patient.emergency_contact_name || '',
      emergency_contact_phone: patient.emergency_contact_phone || '',
      medical_history:         patient.medical_history || '',
      allergies:               patient.allergies || '',
      current_medications:     patient.current_medications || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (selectedPatient) {
        await axios.put(`${API}/patients/${selectedPatient.id}`, formData, authHeaders());
        toast.success('Patient modifié !');
      } else {
        await axios.post(`${API}/patients`, formData, authHeaders());
        toast.success('Patient créé !');
      }
      setIsDialogOpen(false);
      fetchPatients();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  };

  const filteredPatients = patients.filter(p => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.first_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q) ||
      p.phone_primary?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    );
  });

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:256 }}>
      <Loader2 className="h-8 w-8 animate-spin" style={{ color:'#0D7A87' }} />
    </div>
  );

  return (
    <div className="space-y-6" data-testid="patient-management">

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:26, color:'#0F172A', margin:0, display:'flex', alignItems:'center', gap:10 }}>
            <Users size={26} style={{ color:'#0D7A87' }} />Patients
          </h1>
          <p style={{ color:'#64748B', fontSize:13, marginTop:4 }}>{patients.length} patient(s) enregistré(s)</p>
        </div>
        <Button onClick={openCreate} data-testid="new-patient-btn" style={{ background:'linear-gradient(135deg,#0D7A87,#13A3B4)', color:'#fff', border:'none', borderRadius:12, padding:'10px 20px', fontFamily:'Plus Jakarta Sans', fontWeight:700, display:'flex', alignItems:'center', gap:8, boxShadow:'0 4px 16px rgba(13,122,135,0.3)', cursor:'pointer' }}>
          <Plus size={18} />Nouveau Patient
        </Button>
      </div>

      {/* Search */}
      <div style={{ position:'relative' }}>
        <Search size={16} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#94A3B8', pointerEvents:'none' }} />
        <input
          type="text"
          placeholder="Rechercher un patient par nom ou téléphone..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          data-testid="search-input"
          style={{ width:'100%', padding:'11px 14px 11px 42px', borderRadius:12, border:'1.5px solid #E2E8F0', background:'#F8FAFC', fontSize:13, fontFamily:'DM Sans,sans-serif', color:'#0F172A', outline:'none', boxSizing:'border-box', transition:'all 0.18s' }}
          onFocus={e => { e.target.style.borderColor='#0D7A87'; e.target.style.background='#fff'; e.target.style.boxShadow='0 0 0 3px rgba(13,122,135,0.10)'; }}
          onBlur={e => { e.target.style.borderColor='#E2E8F0'; e.target.style.background='#F8FAFC'; e.target.style.boxShadow='none'; }}
        />
      </div>

      {/* Liste */}
      {filteredPatients.length === 0 ? (
        <Card>
          <CardContent style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:48, textAlign:'center' }}>
            <Users size={48} style={{ color:'#E2E8F0', marginBottom:16 }} />
            <h3 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:16, color:'#475569', margin:'0 0 8px' }}>
              {searchTerm ? 'Aucun résultat' : 'Aucun patient'}
            </h3>
            <p style={{ fontSize:13, color:'#94A3B8', margin:0 }}>
              {searchTerm ? 'Essayez un autre terme de recherche' : 'Cliquez sur "Nouveau Patient" pour commencer'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filteredPatients.map(patient => {
            const age = calculateAge(patient.date_of_birth);
            return (
              <div key={patient.id} data-testid={`patient-${patient.id}`}
                style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap', transition:'all 0.18s', boxShadow:'0 1px 4px rgba(15,23,42,0.05)' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow='0 4px 16px rgba(15,23,42,0.10)'; e.currentTarget.style.borderColor='#CBD5E1'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow='0 1px 4px rgba(15,23,42,0.05)'; e.currentTarget.style.borderColor='#E2E8F0'; }}
              >
                {/* Infos patient */}
                <div style={{ display:'flex', alignItems:'center', gap:14, minWidth:0 }}>
                  <div style={{ width:42, height:42, borderRadius:12, background:'linear-gradient(135deg,rgba(13,122,135,0.12),rgba(59,79,216,0.12))', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <User size={20} style={{ color:'#0D7A87' }} />
                  </div>
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {patient.first_name} {patient.last_name}
                    </p>
                    <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:3, flexWrap:'wrap' }}>
                      {age !== null && (
                        <span style={{ fontSize:12, color:'#64748B', display:'flex', alignItems:'center', gap:4 }}>
                          <Calendar size={11} />{age} ans
                        </span>
                      )}
                      {patient.phone_primary && (
                        <span style={{ fontSize:12, color:'#64748B', display:'flex', alignItems:'center', gap:4 }}>
                          <Phone size={11} />{patient.phone_primary}
                        </span>
                      )}
                      {patient.email && (
                        <span style={{ fontSize:12, color:'#64748B', display:'flex', alignItems:'center', gap:4, overflow:'hidden', maxWidth:180 }}>
                          <Mail size={11} /><span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{patient.email}</span>
                        </span>
                      )}
                    </div>
                    {patient.allergies && (
                      <div style={{ marginTop:4, display:'flex', alignItems:'center', gap:5 }}>
                        <AlertTriangle size={11} style={{ color:'#F59E0B', flexShrink:0 }} />
                        <span style={{ fontSize:11, color:'#92400E', background:'#FEF3C7', padding:'1px 8px', borderRadius:99, fontWeight:600 }}>
                          Allergies: {patient.allergies}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                  <Link to={`/patients/${patient.id}/odontogram`} title="Odontogramme">
                    <button style={{ width:34, height:34, borderRadius:8, border:'1px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748B', transition:'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='#0D7A87'; e.currentTarget.style.color='#0D7A87'; e.currentTarget.style.background='rgba(13,122,135,0.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.color='#64748B'; e.currentTarget.style.background='#fff'; }}>
                      <Activity size={15} />
                    </button>
                  </Link>
                  <Link to={`/patients/${patient.id}/documents`} title="Documents">
                    <button style={{ width:34, height:34, borderRadius:8, border:'1px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748B', transition:'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='#0D7A87'; e.currentTarget.style.color='#0D7A87'; e.currentTarget.style.background='rgba(13,122,135,0.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.color='#64748B'; e.currentTarget.style.background='#fff'; }}>
                      <FileText size={15} />
                    </button>
                  </Link>
                  <Link to={`/patients/${patient.id}/prescriptions`} title="Ordonnances">
                    <button style={{ width:34, height:34, borderRadius:8, border:'1px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748B', transition:'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='#0D7A87'; e.currentTarget.style.color='#0D7A87'; e.currentTarget.style.background='rgba(13,122,135,0.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.color='#64748B'; e.currentTarget.style.background='#fff'; }}>
                      <ClipboardList size={15} />
                    </button>
                  </Link>
                  <Link to={`/patients/${patient.id}/lab-orders`} title="Laboratoire">
                    <button style={{ width:34, height:34, borderRadius:8, border:'1px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748B', transition:'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='#0D7A87'; e.currentTarget.style.color='#0D7A87'; e.currentTarget.style.background='rgba(13,122,135,0.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.color='#64748B'; e.currentTarget.style.background='#fff'; }}>
                      <FlaskConical size={15} />
                    </button>
                  </Link>
                  <Link to={`/patients/${patient.id}/chart`} title="Fiche dentaire">
                    <button style={{ width:34, height:34, borderRadius:8, border:'1px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748B', transition:'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='#0D7A87'; e.currentTarget.style.color='#0D7A87'; e.currentTarget.style.background='rgba(13,122,135,0.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.color='#64748B'; e.currentTarget.style.background='#fff'; }}>
                      <ChevronRight size={15} />
                    </button>
                  </Link>
                  <button onClick={() => openEdit(patient)} title="Modifier" data-testid={`edit-${patient.id}`}
                    style={{ width:34, height:34, borderRadius:8, border:'1px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748B', transition:'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='#0D7A87'; e.currentTarget.style.color='#0D7A87'; e.currentTarget.style.background='rgba(13,122,135,0.06)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.color='#64748B'; e.currentTarget.style.background='#fff'; }}>
                    <Edit size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal Créer/Modifier patient ── */}
      <Modal
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={selectedPatient ? `Modifier — ${selectedPatient.first_name} ${selectedPatient.last_name}` : 'Nouveau Patient'}
        maxWidth={560}
      >
        <PatientForm
          data={formData}
          onChange={handleFieldChange}
          onSubmit={handleSubmit}
          onCancel={() => setIsDialogOpen(false)}
          submitting={submitting}
          isEdit={!!selectedPatient}
        />
      </Modal>
    </div>
  );
};

export default PatientManagement;
