import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Search, Building2, Users, Phone, Mail, MapPin, Calendar, Eye, Edit, Power } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || '';

const SuperAdminClinics = () => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: 'Antananarivo',
    nif_number: '',
    stat_number: '',
    admin_first_name: '',
    admin_last_name: '',
    admin_username: '',
    admin_email: '',
    admin_password: ''
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchClinics();
  }, []);

  const fetchClinics = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/admin/clinics`, { headers });
      const data = res.data;
      // Safely extract clinics array
      const clinicsList = Array.isArray(data) ? data : (data.clinics || []);
      setClinics(clinicsList);
    } catch (err) {
      console.error('Fetch clinics error:', err);
      setClinics([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreate = async () => {
    setError('');
    // Basic validation
    if (!formData.name || !formData.email || !formData.phone || !formData.address) {
      setError('Veuillez remplir tous les champs de la clinique.');
      return;
    }
    if (!formData.admin_first_name || !formData.admin_last_name || !formData.admin_username || !formData.admin_password) {
      setError('Veuillez remplir tous les champs administrateur.');
      return;
    }
    if (formData.admin_password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    try {
      setCreating(true);
      await axios.post(`${API}/api/admin/clinics`, formData, { headers });
      setSuccess('Cabinet créé avec succès !');
      setShowCreateDialog(false);
      setFormData({
        name: '', email: '', phone: '', address: '', city: 'Antananarivo',
        nif_number: '', stat_number: '',
        admin_first_name: '', admin_last_name: '',
        admin_username: '', admin_email: '', admin_password: ''
      });
      await fetchClinics();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.details?.[0]?.msg || 'Erreur lors de la création';
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (clinic) => {
    try {
      await axios.put(`${API}/api/admin/clinics/${clinic.id}`, {
        is_active: !clinic.is_active
      }, { headers });
      await fetchClinics();
    } catch (err) {
      console.error('Toggle active error:', err);
    }
  };

  const getStatusColor = (status) => {
    const map = {
      ACTIVE: 'bg-green-100 text-green-700',
      TRIAL: 'bg-blue-100 text-blue-700',
      EXPIRED: 'bg-red-100 text-red-700',
      CANCELLED: 'bg-gray-100 text-gray-700',
      SUSPENDED: 'bg-orange-100 text-orange-700'
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  };

  const filteredClinics = clinics.filter(c =>
    !search ||
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.city || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Cabinets</h1>
          <p className="text-gray-500 text-sm mt-1">{clinics.length} cabinet(s) enregistré(s)</p>
        </div>
        <Button onClick={() => { setError(''); setShowCreateDialog(true); }}
          className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouveau Cabinet
        </Button>
      </div>

      {/* Success message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-500 font-bold">×</button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Rechercher un cabinet..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredClinics.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Aucun cabinet trouvé</p>
          <p className="text-sm">Créez votre premier cabinet en cliquant sur "Nouveau Cabinet"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClinics.map(clinic => (
            <Card key={clinic.id} className={`hover:shadow-md transition-all ${!clinic.is_active ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-teal-100 p-2 rounded-lg">
                      <Building2 className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{clinic.name || 'Sans nom'}</CardTitle>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(clinic.subscription_status)}`}>
                        {clinic.subscription_status || 'INCONNU'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleActive(clinic)}
                    className={`p-1.5 rounded-lg transition-colors ${clinic.is_active ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                    title={clinic.is_active ? 'Désactiver' : 'Activer'}
                  >
                    <Power className="h-4 w-4" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-gray-400" />
                  <span className="truncate">{clinic.email || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                  <span>{clinic.phone || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                  <span>{clinic.city || 'Antananarivo'}</span>
                </div>
                {clinic.trial_ends_at && clinic.subscription_status === 'TRIAL' && (
                  <div className="flex items-center gap-2 text-orange-600">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Essai jusqu'au {new Date(clinic.trial_ends_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1">
                  <Users className="h-3.5 w-3.5 text-gray-400" />
                  <span>Max {clinic.max_users || 3} utilisateurs</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer un nouveau cabinet</DialogTitle>
          </DialogHeader>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-700 border-b pb-2">Informations du cabinet</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom du cabinet *</Label>
                <Input name="name" value={formData.name} onChange={handleChange} placeholder="Cabinet Dentaire Rakoto" />
              </div>
              <div>
                <Label>Ville</Label>
                <Input name="city" value={formData.city} onChange={handleChange} placeholder="Antananarivo" />
              </div>
            </div>

            <div>
              <Label>Adresse *</Label>
              <Input name="address" value={formData.address} onChange={handleChange} placeholder="123 Rue Analakely" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Téléphone *</Label>
                <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="+261320000001" />
              </div>
              <div>
                <Label>Email *</Label>
                <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="contact@cabinet.mg" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Numéro NIF</Label>
                <Input name="nif_number" value={formData.nif_number} onChange={handleChange} placeholder="NIF2024001" />
              </div>
              <div>
                <Label>Numéro STAT</Label>
                <Input name="stat_number" value={formData.stat_number} onChange={handleChange} placeholder="STAT2024001" />
              </div>
            </div>

            <p className="text-sm font-semibold text-gray-700 border-b pb-2 pt-2">Administrateur du cabinet</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prénom *</Label>
                <Input name="admin_first_name" value={formData.admin_first_name} onChange={handleChange} placeholder="Jean" />
              </div>
              <div>
                <Label>Nom *</Label>
                <Input name="admin_last_name" value={formData.admin_last_name} onChange={handleChange} placeholder="Rakoto" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom d'utilisateur *</Label>
                <Input name="admin_username" value={formData.admin_username} onChange={handleChange} placeholder="jean.rakoto" />
              </div>
              <div>
                <Label>Email admin</Label>
                <Input name="admin_email" type="email" value={formData.admin_email} onChange={handleChange} placeholder="jean@cabinet.mg" />
              </div>
            </div>

            <div>
              <Label>Mot de passe * (min. 6 caractères)</Label>
              <Input name="admin_password" type="password" value={formData.admin_password} onChange={handleChange} placeholder="••••••••" />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creating}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={creating}
              className="bg-teal-600 hover:bg-teal-700 text-white">
              {creating ? 'Création...' : 'Créer le cabinet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminClinics;
