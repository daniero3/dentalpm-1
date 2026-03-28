import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Plus, Search, Building2, Users, Phone, Mail, MapPin, Calendar, Edit, Power, X } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ── Modal CSS pur ──
const Modal = ({ open, onClose, title, children, maxWidth = 700 }) => {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(15,23,42,0.5)', overflowY:'auto', padding:'80px 16px 32px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:'#fff', borderRadius:16, padding:28, width:'100%', maxWidth: maxWidth||560, margin:'0 auto', boxShadow:'0 16px 48px rgba(15,23,42,0.18)', border:'1px solid #E2E8F0', position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'none', border:'none', cursor:'pointer', color:'#94A3B8', padding:4 }}><X size={18} /></button>
        {title && <h2 style={{ fontFamily:'Plus Jakarta Sans', fontSize:17, fontWeight:700, color:'#0F172A', margin:'0 0 20px', paddingRight:28 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
};

const SuperAdminClinics = () => {
  const [clinics, setClinics]                   = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [search, setSearch]                     = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating]                 = useState(false);
  const [error, setError]                       = useState('');
  const [success, setSuccess]                   = useState('');

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '', city: 'Antananarivo',
    nif_number: '', stat_number: '',
    admin_first_name: '', admin_last_name: '',
    admin_username: '', admin_email: '', admin_password: ''
  });

  const token   = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { fetchClinics(); }, []);

  const fetchClinics = async () => {
    try {
      setLoading(true);
      const res  = await axios.get(`${API}/admin/clinics`, { headers });
      const data = res.data;
      setClinics(Array.isArray(data) ? data : (data.clinics || []));
    } catch (err) {
      console.error('Fetch clinics error:', err);
      setClinics([]);
    } finally { setLoading(false); }
  };

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCreate = async () => {
    setError('');
    if (!formData.name || !formData.email || !formData.phone || !formData.address) {
      setError('Veuillez remplir tous les champs de la clinique.'); return;
    }
    if (!formData.admin_first_name || !formData.admin_last_name || !formData.admin_username || !formData.admin_password) {
      setError('Veuillez remplir tous les champs administrateur.'); return;
    }
    if (formData.admin_password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.'); return;
    }
    try {
      setCreating(true);
      await axios.post(`${API}/admin/clinics`, formData, { headers });
      setSuccess('Cabinet créé avec succès !');
      setShowCreateDialog(false);
      setFormData({ name:'', email:'', phone:'', address:'', city:'Antananarivo', nif_number:'', stat_number:'', admin_first_name:'', admin_last_name:'', admin_username:'', admin_email:'', admin_password:'' });
      await fetchClinics();
    } catch (err) {
      setError(err?.response?.data?.error || err?.response?.data?.details?.[0]?.msg || 'Erreur lors de la création');
    } finally { setCreating(false); }
  };

  const handleToggleActive = async (clinic) => {
    try {
      await axios.put(`${API}/admin/clinics/${clinic.id}`, { is_active: !clinic.is_active }, { headers });
      await fetchClinics();
    } catch (err) { console.error('Toggle error:', err); }
  };

  const getStatusColor = (status) => ({
    ACTIVE:    'bg-green-100 text-green-700',
    TRIAL:     'bg-blue-100 text-blue-700',
    EXPIRED:   'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-700',
    SUSPENDED: 'bg-orange-100 text-orange-700'
  }[status] || 'bg-gray-100 text-gray-700');

  const filteredClinics = clinics.filter(c =>
    !search ||
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.city || '').toLowerCase().includes(search.toLowerCase())
  );

  const inputStyle = { width:'100%', padding:'8px 12px', borderRadius:8, border:'1.5px solid #E2E8F0', fontSize:13, fontFamily:'DM Sans,sans-serif', color:'#0F172A', background:'#fff', marginTop:4, boxSizing:'border-box' };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Cabinets</h1>
          <p className="text-gray-500 text-sm mt-1">{clinics.length} cabinet(s) enregistré(s)</p>
        </div>
        <button onClick={() => { setError(''); setShowCreateDialog(true); }}
          style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'9px 18px', borderRadius:10, background:'linear-gradient(135deg,#0D7A87,#13A3B4)', color:'#fff', border:'none', fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:13, cursor:'pointer', boxShadow:'0 2px 12px rgba(13,122,135,0.3)' }}>
          <Plus size={16} />Nouveau Cabinet
        </button>
      </div>

      {/* Success */}
      {success && (
        <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', color:'#15803D', padding:'12px 16px', borderRadius:10, display:'flex', justifyContent:'space-between' }}>
          <span>{success}</span>
          <button onClick={() => setSuccess('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#15803D', fontWeight:700 }}>×</button>
        </div>
      )}

      {/* Search */}
      <div style={{ position:'relative' }}>
        <Search style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94A3B8' }} size={16} />
        <Input placeholder="Rechercher un cabinet..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Liste */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filteredClinics.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Aucun cabinet trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClinics.map(clinic => (
            <Card key={clinic.id} className={`hover:shadow-md transition-all ${!clinic.is_active ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div style={{ background:'rgba(13,122,135,0.1)', padding:8, borderRadius:8 }}>
                      <Building2 size={18} style={{ color:'#0D7A87' }} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{clinic.name || 'Sans nom'}</CardTitle>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(clinic.subscription_status)}`}>
                        {clinic.subscription_status || 'INCONNU'}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleToggleActive(clinic)}
                    style={{ padding:6, borderRadius:8, border:'none', background:'none', cursor:'pointer', color: clinic.is_active ? '#22c55e' : '#94A3B8' }}
                    title={clinic.is_active ? 'Désactiver' : 'Activer'}>
                    <Power size={16} />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2"><Mail size={13} className="text-gray-400" /><span className="truncate">{clinic.email || '-'}</span></div>
                <div className="flex items-center gap-2"><Phone size={13} className="text-gray-400" /><span>{clinic.phone || '-'}</span></div>
                <div className="flex items-center gap-2"><MapPin size={13} className="text-gray-400" /><span>{clinic.city || 'Antananarivo'}</span></div>
                {clinic.trial_ends_at && clinic.subscription_status === 'TRIAL' && (
                  <div className="flex items-center gap-2 text-orange-600">
                    <Calendar size={13} />
                    <span>Essai jusqu'au {new Date(clinic.trial_ends_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                )}
                <div className="flex items-center gap-2"><Users size={13} className="text-gray-400" /><span>Max {clinic.max_users || 3} utilisateurs</span></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Modal Créer Cabinet ── */}
      <Modal open={showCreateDialog} onClose={() => setShowCreateDialog(false)} title="Créer un nouveau cabinet">
        {error && (
          <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#B91C1C', padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:16 }}>
            {error}
          </div>
        )}
        <div className="space-y-4">
          <p style={{ fontSize:13, fontWeight:700, color:'#475569', borderBottom:'1px solid #F1F5F9', paddingBottom:8 }}>Informations du cabinet</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><Label>Nom du cabinet *</Label><input name="name" value={formData.name} onChange={handleChange} placeholder="Cabinet Dentaire..." style={inputStyle} /></div>
            <div><Label>Ville</Label><input name="city" value={formData.city} onChange={handleChange} style={inputStyle} /></div>
          </div>
          <div><Label>Adresse *</Label><input name="address" value={formData.address} onChange={handleChange} placeholder="123 Rue Analakely" style={inputStyle} /></div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><Label>Téléphone *</Label><input name="phone" value={formData.phone} onChange={handleChange} placeholder="+261320000001" style={inputStyle} /></div>
            <div><Label>Email *</Label><input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="contact@cabinet.mg" style={inputStyle} /></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><Label>Numéro NIF</Label><input name="nif_number" value={formData.nif_number} onChange={handleChange} style={inputStyle} /></div>
            <div><Label>Numéro STAT</Label><input name="stat_number" value={formData.stat_number} onChange={handleChange} style={inputStyle} /></div>
          </div>
          <p style={{ fontSize:13, fontWeight:700, color:'#475569', borderBottom:'1px solid #F1F5F9', paddingBottom:8, paddingTop:8 }}>Administrateur du cabinet</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><Label>Prénom *</Label><input name="admin_first_name" value={formData.admin_first_name} onChange={handleChange} placeholder="Jean" style={inputStyle} /></div>
            <div><Label>Nom *</Label><input name="admin_last_name" value={formData.admin_last_name} onChange={handleChange} placeholder="Rakoto" style={inputStyle} /></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div><Label>Nom d'utilisateur *</Label><input name="admin_username" value={formData.admin_username} onChange={handleChange} style={inputStyle} /></div>
            <div><Label>Email admin</Label><input name="admin_email" type="email" value={formData.admin_email} onChange={handleChange} style={inputStyle} /></div>
          </div>
          <div><Label>Mot de passe * (min. 6 caractères)</Label><input name="admin_password" type="password" value={formData.admin_password} onChange={handleChange} style={inputStyle} /></div>
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:20, paddingTop:16, borderTop:'1px solid #F1F5F9' }}>
          <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creating}>Annuler</Button>
          <Button onClick={handleCreate} disabled={creating}
            style={{ background:'linear-gradient(135deg,#0D7A87,#13A3B4)', color:'#fff', border:'none' }}>
            {creating ? 'Création...' : 'Créer le cabinet'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default SuperAdminClinics;
