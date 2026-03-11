import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Building2, 
  Users, 
  Plus,
  Search,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';

const API = process.env.REACT_APP_BACKEND_URL || '';

const EMPTY_FORM = {
  name: '',
  address: '',
  city: '',
  postal_code: '',
  phone: '',
  email: '',
  nif_number: '',
  stat_number: '',
  admin_user: {
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: ''
  }
};

const SuperAdminClinics = () => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formErrors, setFormErrors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    fetchClinics();
  }, [currentPage]);

  const fetchClinics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ page: currentPage, limit: 10 });
      const response = await axios.get(`${API}/api/admin/clinics?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClinics(response.data.clinics || []);
      setTotalPages(response.data.pagination?.total_pages || 1);
    } catch (err) {
      setError('Erreur lors du chargement des cliniques');
      console.error('Clinics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClinic = async () => {
    // Validation côté client avant envoi
    const clientErrors = [];
    if (!formData.name || formData.name.length < 2) clientErrors.push('Nom de la clinique requis (min 2 caractères)');
    if (!formData.address || formData.address.length < 5) clientErrors.push('Adresse requise (min 5 caractères)');
    if (!formData.city || formData.city.length < 2) clientErrors.push('Ville requise');
    if (!formData.email) clientErrors.push('Email de la clinique requis');
    if (!formData.admin_user.first_name || formData.admin_user.first_name.length < 2) clientErrors.push('Prénom administrateur requis (min 2 caractères)');
    if (!formData.admin_user.last_name || formData.admin_user.last_name.length < 2) clientErrors.push('Nom administrateur requis (min 2 caractères)');
    if (!formData.admin_user.username || formData.admin_user.username.length < 3) clientErrors.push("Nom d'utilisateur requis (min 3 caractères)");
    if (!formData.admin_user.email) clientErrors.push('Email administrateur requis');
    if (!formData.admin_user.password || formData.admin_user.password.length < 6) clientErrors.push('Mot de passe requis (min 6 caractères)');

    if (clientErrors.length > 0) {
      setFormErrors(clientErrors);
      return;
    }

    setFormErrors([]);
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/api/admin/clinics`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setIsCreateDialogOpen(false);
      setFormData(EMPTY_FORM);
      setFormErrors([]);
      fetchClinics();
    } catch (err) {
      console.error('Create clinic error:', err);
      // Afficher les erreurs détaillées du backend
      if (err.response?.data?.details) {
        setFormErrors(err.response.data.details.map(d => d.msg));
      } else if (err.response?.data?.error) {
        setFormErrors([err.response.data.error]);
      } else {
        setFormErrors(['Erreur lors de la création de la clinique']);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateClinic = async (clinicId) => {
    if (window.confirm('Êtes-vous sûr de vouloir désactiver cette clinique ?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API}/api/admin/clinics/${clinicId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchClinics();
      } catch (err) {
        setError('Erreur lors de la désactivation de la clinique');
      }
    }
  };

  const handleOpenDialog = () => {
    setFormData(EMPTY_FORM);
    setFormErrors([]);
    setIsCreateDialogOpen(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      TRIAL: { color: 'bg-blue-100 text-blue-800', icon: Clock, text: 'Essai' },
      ACTIVE: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Actif' },
      EXPIRED: { color: 'bg-red-100 text-red-800', icon: AlertCircle, text: 'Expiré' },
      CANCELLED: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, text: 'Annulé' }
    };
    const config = statusConfig[status] || statusConfig.EXPIRED;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const filteredClinics = clinics.filter(clinic =>
    (clinic.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (clinic.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (clinic.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Cliniques</h1>
          <p className="text-gray-600 mt-1">Administrez toutes les cliniques du système</p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          if (!open) { setFormErrors([]); }
          setIsCreateDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Clinique
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Créer une nouvelle clinique</DialogTitle>
              <DialogDescription>
                Ajoutez une nouvelle clinique avec un utilisateur administrateur
              </DialogDescription>
            </DialogHeader>

            {/* Erreurs de validation */}
            {formErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {formErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4">
              {/* Informations clinique */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 border-b pb-2">Informations de la clinique</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nom de la clinique *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Clinique Dentaire..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">Ville *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      placeholder="Antananarivo"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="address">Adresse *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Lot 123 Analakely..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="+261 20 22 123 45"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="contact@clinique.mg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nif_number">Numéro NIF</Label>
                    <Input
                      id="nif_number"
                      value={formData.nif_number}
                      onChange={(e) => setFormData({...formData, nif_number: e.target.value})}
                      placeholder="NIF2024..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="stat_number">Numéro STAT</Label>
                    <Input
                      id="stat_number"
                      value={formData.stat_number}
                      onChange={(e) => setFormData({...formData, stat_number: e.target.value})}
                      placeholder="STAT2024..."
                    />
                  </div>
                </div>
              </div>

              {/* Informations admin */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 border-b pb-2">Utilisateur administrateur</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="admin_first_name">Prénom *</Label>
                    <Input
                      id="admin_first_name"
                      value={formData.admin_user.first_name}
                      onChange={(e) => setFormData({
                        ...formData, 
                        admin_user: {...formData.admin_user, first_name: e.target.value}
                      })}
                      placeholder="Jean"
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin_last_name">Nom *</Label>
                    <Input
                      id="admin_last_name"
                      value={formData.admin_user.last_name}
                      onChange={(e) => setFormData({
                        ...formData, 
                        admin_user: {...formData.admin_user, last_name: e.target.value}
                      })}
                      placeholder="Rakoto"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="admin_username">Nom d'utilisateur *</Label>
                    <Input
                      id="admin_username"
                      value={formData.admin_user.username}
                      onChange={(e) => setFormData({
                        ...formData, 
                        admin_user: {...formData.admin_user, username: e.target.value}
                      })}
                      placeholder="admin_clinique"
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin_email">Email *</Label>
                    <Input
                      id="admin_email"
                      type="email"
                      value={formData.admin_user.email}
                      onChange={(e) => setFormData({
                        ...formData, 
                        admin_user: {...formData.admin_user, email: e.target.value}
                      })}
                      placeholder="admin@clinique.mg"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="admin_password">Mot de passe * (min 6 caractères)</Label>
                  <Input
                    id="admin_password"
                    type="password"
                    value={formData.admin_user.password}
                    onChange={(e) => setFormData({
                      ...formData, 
                      admin_user: {...formData.admin_user, password: e.target.value}
                    })}
                    placeholder="Mot de passe sécurisé"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => { setIsCreateDialogOpen(false); setFormErrors([]); }}
                disabled={submitting}
              >
                Annuler
              </Button>
              <Button onClick={handleCreateClinic} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  'Créer la clinique'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error Alert global */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Rechercher des cliniques..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Clinics Grid */}
      {filteredClinics.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Aucune clinique trouvée</p>
          <p className="text-sm mt-1">Créez votre première clinique avec le bouton ci-dessus</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClinics.map((clinic, index) => (
            <motion.div
              key={clinic.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{clinic.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {clinic.city}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(clinic.subscription_status)}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {clinic.email}
                    </div>
                    {clinic.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {clinic.phone}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      {clinic.user_count || 0} utilisateur(s)
                    </div>
                  </div>

                  {clinic.trial_ends_at && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-xs text-blue-600 font-medium">Essai gratuit</div>
                      <div className="text-sm text-blue-800">
                        Expire le {new Date(clinic.trial_ends_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedClinic(clinic)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeactivateClinic(clinic.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Précédent
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-600">
            Page {currentPage} sur {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
};

export default SuperAdminClinics;
