import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner';
import { 
  Users, Plus, Search, Edit, Activity, Phone, Mail,
  AlertTriangle, User, Calendar, FileText, ClipboardList,
  Grid3X3, FlaskConical, Loader2
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const selectClass = inputClass;
const labelStyle = { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569', fontFamily: 'Plus Jakarta Sans' };
const fieldStyle = { marginBottom: 16 };

const PatientManagement = () => {
  const { user } = useAuth();
  const [patients, setPatients]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const mountedRef = useRef(true);

  const [formData, setFormData] = useState({
    first_name: '', last_name: '', date_of_birth: '', gender: '',
    phone_primary: '', email: '', address: '',
    emergency_contact_name: '', emergency_contact_phone: '',
    medical_history: '', allergies: '', current_medications: ''
  });

  useEffect(() => {
    mountedRef.current = true;
    fetchPatients();
    return () => { mountedRef.current = false; };
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await axios.get(`${API}/patients`, authHeaders());
      if (mountedRef.current) setPatients(response.data.patients || []);
    } catch (error) {
      if (mountedRef.current) toast.error('Erreur lors du chargement des patients');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (selectedPatient) {
        await axios.put(`${API}/patients/${selectedPatient.id}`, formData, authHeaders());
        toast.success('Patient mis à jour avec succès');
      } else {
        await axios.post(`${API}/patients`, formData, authHeaders());
        toast.success('Patient créé avec succès');
      }
      resetForm();
      setIsDialogOpen(false);
      fetchPatients();
    } catch (error) {
      const apiError = error.response?.data;
      if (apiError?.details && Array.isArray(apiError.details)) {
        toast.error(apiError.details.map(d => d.msg || d.message).join(', '));
      } else {
        toast.error(apiError?.error || "Erreur lors de l'enregistrement");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '', last_name: '', date_of_birth: '', gender: '',
      phone_primary: '', email: '', address: '',
      emergency_contact_name: '', emergency_contact_phone: '',
      medical_history: '', allergies: '', current_medications: ''
    });
    setSelectedPatient(null);
  };

  const handleEdit = (patient) => {
    setSelectedPatient(patient);
    setFormData({
      first_name: patient.first_name || '',
      last_name: patient.last_name || '',
      date_of_birth: patient.date_of_birth ? patient.date_of_birth.split('T')[0] : '',
      gender: patient.gender || '',
      phone_primary: patient.phone_primary || patient.phone || '',
      email: patient.email || '',
      address: patient.address || '',
      emergency_contact_name: patient.emergency_contact_name || '',
      emergency_contact_phone: patient.emergency_contact_phone || '',
      medical_history: patient.medical_history || '',
      allergies: patient.allergies || '',
      current_medications: patient.current_medications || ''
    });
    setIsDialogOpen(true);
  };

  const set = (field) => (e) => setFormData(f => ({ ...f, [field]: e.target.value }));

  const filteredPatients = patients.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.phone_primary || p.phone || '').includes(searchTerm)
  );

  const calculateAge = (birthDate) => {
    if (!birthDate) return '?';
    const today = new Date(), birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const ActionBtn = ({ to, icon: Icon, title }) => (
    <Link to={to} title={title}>
      <button style={{
        width: 34, height: 34, borderRadius: 8,
        border: '1.5px solid #E2E8F0', background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: '#64748B',
        transition: 'all 0.18s ease',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#0D7A87'; e.currentTarget.style.color = '#0D7A87'; e.currentTarget.style.background = '#F0F7F8'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#64748B'; e.currentTarget.style.background = '#fff'; }}
      >
        <Icon size={15} />
      </button>
    </Link>
  );

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <Loader2 size={32} style={{ color: '#0D7A87', animation: 'spin 0.75s linear infinite' }} />
    </div>
  );

  return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0',
        boxShadow: '0 2px 8px rgba(15,23,42,0.05)', padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(13,122,135,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={26} color="#0D7A87" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.025em' }}>
              Patients
            </h1>
            <p style={{ color: '#64748B', fontSize: 13, margin: '2px 0 0' }}>
              {patients.length} patient{patients.length > 1 ? 's' : ''} enregistré{patients.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <button
              onClick={resetForm}
              data-testid="new-patient-btn"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10,
                background: 'linear-gradient(135deg, #0D7A87, #13A3B4)',
                color: '#fff', border: 'none',
                fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 13,
                cursor: 'pointer', boxShadow: '0 2px 12px rgba(13,122,135,0.3)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(13,122,135,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(13,122,135,0.3)'; }}
            >
              <Plus size={16} /> Nouveau Patient
            </button>
          </DialogTrigger>

          <DialogContent style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', borderRadius: 16 }}>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 18, fontWeight: 800 }}>
                {selectedPatient ? 'Modifier le patient' : 'Nouveau patient'}
              </DialogTitle>
              <DialogDescription>Remplissez les informations du patient</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} style={{ marginTop: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Prénom *</label>
                  <input className={inputClass} value={formData.first_name} onChange={set('first_name')} required placeholder="Prénom" />
                </div>
                <div>
                  <label style={labelStyle}>Nom *</label>
                  <input className={inputClass} value={formData.last_name} onChange={set('last_name')} required placeholder="Nom" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Date de naissance *</label>
                  <input className={inputClass} type="date" value={formData.date_of_birth} onChange={set('date_of_birth')} required />
                </div>
                <div>
                  <label style={labelStyle}>Sexe *</label>
                  <select className={selectClass} value={formData.gender} onChange={set('gender')} required>
                    <option value="">Sélectionnez</option>
                    <option value="male">Homme</option>
                    <option value="female">Femme</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Téléphone *</label>
                  <input className={inputClass} value={formData.phone_primary} onChange={set('phone_primary')} required placeholder="+261 32 00 000 00" data-testid="phone-input" />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input className={inputClass} type="email" value={formData.email} onChange={set('email')} placeholder="patient@email.com" />
                </div>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Adresse</label>
                <textarea className={inputClass} value={formData.address} onChange={set('address')} placeholder="Adresse complète" rows={2} style={{ minHeight: 64, resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>Contact d'urgence</label>
                  <input className={inputClass} value={formData.emergency_contact_name} onChange={set('emergency_contact_name')} placeholder="Nom (optionnel)" />
                </div>
                <div>
                  <label style={labelStyle}>Tél. d'urgence</label>
                  <input className={inputClass} value={formData.emergency_contact_phone} onChange={set('emergency_contact_phone')} placeholder="+261 32 (optionnel)" />
                </div>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Antécédents médicaux</label>
                <textarea className={inputClass} value={formData.medical_history} onChange={set('medical_history')} placeholder="Antécédents médicaux" rows={3} style={{ minHeight: 72, resize: 'vertical' }} />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Allergies</label>
                <textarea className={inputClass} value={formData.allergies} onChange={set('allergies')} placeholder="Allergies connues" rows={2} style={{ minHeight: 56, resize: 'vertical' }} />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Médicaments actuels</label>
                <textarea className={inputClass} value={formData.current_medications} onChange={set('current_medications')} placeholder="Traitements en cours" rows={2} style={{ minHeight: 56, resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
                <button type="button" onClick={() => setIsDialogOpen(false)} style={{
                  padding: '9px 18px', borderRadius: 8, border: '1.5px solid #E2E8F0',
                  background: '#fff', color: '#475569', fontFamily: 'Plus Jakarta Sans',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}>
                  Annuler
                </button>
                <button type="submit" disabled={submitting} style={{
                  padding: '9px 20px', borderRadius: 8, border: 'none',
                  background: submitting ? '#94A3B8' : 'linear-gradient(135deg, #0D7A87, #13A3B4)',
                  color: '#fff', fontFamily: 'Plus Jakarta Sans',
                  fontWeight: 700, fontSize: 13, cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: submitting ? 'none' : '0 2px 12px rgba(13,122,135,0.3)',
                }}>
                  {submitting && <Loader2 size={14} style={{ animation: 'spin 0.75s linear infinite' }} />}
                  {selectedPatient ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Recherche ── */}
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0',
        boxShadow: '0 2px 8px rgba(15,23,42,0.05)', padding: '14px 20px',
      }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            className={inputClass}
            style={{ paddingLeft: 38, background: '#F8FAFC' }}
            placeholder="Rechercher un patient par nom ou téléphone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            data-testid="search-patient"
          />
        </div>
      </div>

      {/* ── Liste ── */}
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0',
        boxShadow: '0 2px 8px rgba(15,23,42,0.05)', overflow: 'hidden',
      }}>
        {filteredPatients.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
            <div style={{ padding: 16, background: '#F1F5F9', borderRadius: '50%', marginBottom: 16 }}>
              <Users size={40} color="#94A3B8" />
            </div>
            <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
              {searchTerm ? 'Aucun patient trouvé' : 'Aucun patient'}
            </h3>
            <p style={{ color: '#94A3B8', fontSize: 13 }}>
              {searchTerm ? "Essayez avec d'autres termes" : 'Commencez par ajouter un patient'}
            </p>
          </div>
        ) : (
          filteredPatients.map((patient, i) => (
            <div
              key={patient.id}
              className="animate-fade-up"
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'background 0.15s',
                animationDelay: `${i * 0.04}s`,
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              data-testid={`patient-${patient.id}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 12,
                  background: 'rgba(13,122,135,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <User size={22} color="#0D7A87" />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 15, color: '#0F172A', margin: 0 }}>
                    {patient.first_name} {patient.last_name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4, fontSize: 13, color: '#64748B' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={13} /> {calculateAge(patient.date_of_birth)} ans
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Phone size={13} /> {patient.phone_primary || patient.phone}
                    </span>
                    {patient.email && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Mail size={13} /> {patient.email}
                      </span>
                    )}
                  </div>
                  {patient.allergies && (
                    <div style={{ marginTop: 6 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 99,
                        background: '#FEE2E2', color: '#B91C1C',
                        fontSize: 11, fontWeight: 700,
                      }}>
                        <AlertTriangle size={11} /> Allergies: {patient.allergies}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Boutons actions ── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ActionBtn to={`/patients/${patient.id}/odontogram`}    icon={Grid3X3}       title="Odontogramme" />
                <ActionBtn to={`/patients/${patient.id}/documents`}     icon={FileText}      title="Documents" />
                <ActionBtn to={`/patients/${patient.id}/prescriptions`} icon={ClipboardList} title="Ordonnances" />
                <ActionBtn to={`/patients/${patient.id}/lab-orders`}    icon={FlaskConical}  title="Labo" />
                <ActionBtn to={`/patients/${patient.id}/chart`}         icon={Activity}      title="Fiche clinique" />
                <button
                  onClick={() => handleEdit(patient)}
                  data-testid={`edit-${patient.id}`}
                  title="Modifier"
                  style={{
                    width: 34, height: 34, borderRadius: 8,
                    border: '1.5px solid #E2E8F0', background: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#64748B', transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#3B4FD8'; e.currentTarget.style.color = '#3B4FD8'; e.currentTarget.style.background = '#EEF0FB'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#64748B'; e.currentTarget.style.background = '#fff'; }}
                >
                  <Edit size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PatientManagement;
