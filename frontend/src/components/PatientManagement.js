import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Activity,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  User,
  Calendar,
  FileText,
  ClipboardList,
  Grid3X3,
  FlaskConical
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PatientManagement = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    phone_primary: '',
    email: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_history: '',
    allergies: '',
    current_medications: ''
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await axios.get(`${API}/patients`);
      setPatients(response.data.patients || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des patients');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedPatient) {
        await axios.put(`${API}/patients/${selectedPatient.id}`, formData);
        toast.success('Patient mis à jour avec succès');
      } else {
        await axios.post(`${API}/patients`, formData);
        toast.success('Patient créé avec succès');
      }
      await fetchPatients();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      // Display API error message instead of generic toast
      const apiError = error.response?.data;
      if (apiError?.details && Array.isArray(apiError.details)) {
        // Show validation errors
        const messages = apiError.details.map(d => d.msg || d.message).join(', ');
        toast.error(`Erreur: ${messages}`);
      } else if (apiError?.error) {
        toast.error(apiError.error);
      } else {
        toast.error('Erreur lors de l\'enregistrement du patient');
      }
      console.error('Patient save error:', error.response?.data || error);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: '',
      phone_primary: '',
      email: '',
      address: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      medical_history: '',
      allergies: '',
      current_medications: ''
    });
    setSelectedPatient(null);
  };

  const handleEdit = (patient) => {
    setSelectedPatient(patient);
    setFormData({
      first_name: patient.first_name,
      last_name: patient.last_name,
      date_of_birth: patient.date_of_birth,
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email || '',
      address: patient.address,
      emergency_contact: patient.emergency_contact,
      emergency_phone: patient.emergency_phone,
      medical_history: patient.medical_history || '',
      allergies: patient.allergies || '',
      current_medications: patient.current_medications || ''
    });
    setIsDialogOpen(true);
  };

  const filteredPatients = patients.filter(patient =>
    `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone.includes(searchTerm)
  );

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded-lg w-1/4 mb-6"></div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-100 h-20 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header Card */}
      <Card className="bg-white border border-gray-100 shadow-sm rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#0F7E8A]/10 rounded-xl">
                <Users className="h-7 w-7 text-[#0F7E8A]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
                <p className="text-gray-500 text-sm mt-0.5">
                  {patients.length} patient{patients.length > 1 ? 's' : ''} enregistré{patients.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={resetForm} 
                  className="bg-[#0F7E8A] hover:bg-[#0a6872] text-white rounded-lg shadow-md"
                  data-testid="new-patient-btn"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau Patient
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
                <DialogHeader>
                  <DialogTitle className="text-xl">
                    {selectedPatient ? 'Modifier le patient' : 'Nouveau patient'}
                  </DialogTitle>
                  <DialogDescription>
                    Remplissez les informations du patient
                  </DialogDescription>
                </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Prénom *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Nom *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date de naissance *</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Sexe *</Label>
                  <Select value={formData.gender} onValueChange={(value) => setFormData({...formData, gender: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Homme</SelectItem>
                      <SelectItem value="female">Femme</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone_primary">Téléphone *</Label>
                  <Input
                    id="phone_primary"
                    value={formData.phone_primary}
                    onChange={(e) => setFormData({...formData, phone_primary: e.target.value})}
                    placeholder="+261 32 00 000 00"
                    required
                    data-testid="phone-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="patient@email.com"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Adresse complète"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_name">Contact d'urgence</Label>
                  <Input
                    id="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})}
                    placeholder="Nom du contact (optionnel)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_phone">Téléphone d'urgence</Label>
                  <Input
                    id="emergency_contact_phone"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({...formData, emergency_contact_phone: e.target.value})}
                    placeholder="+261 32 00 000 00 (optionnel)"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="medical_history">Antécédents médicaux</Label>
                <Textarea
                  id="medical_history"
                  value={formData.medical_history}
                  onChange={(e) => setFormData({...formData, medical_history: e.target.value})}
                  placeholder="Antécédents médicaux du patient"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="allergies">Allergies</Label>
                <Textarea
                  id="allergies"
                  value={formData.allergies}
                  onChange={(e) => setFormData({...formData, allergies: e.target.value})}
                  placeholder="Allergies connues"
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="current_medications">Médicaments actuels</Label>
                <Textarea
                  id="current_medications"
                  value={formData.current_medications}
                  onChange={(e) => setFormData({...formData, current_medications: e.target.value})}
                  placeholder="Traitements en cours"
                  rows={2}
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  {selectedPatient ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </CardContent>
      </Card>

      {/* Search Card */}
      <Card className="bg-white border border-gray-100 shadow-sm rounded-xl">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher un patient par nom ou téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-gray-50 border-gray-200 rounded-lg focus:bg-white"
              data-testid="search-patient"
            />
          </div>
        </CardContent>
      </Card>

      {/* Patients List */}
      <Card className="bg-white border border-gray-100 shadow-sm rounded-xl">
        <CardContent className="p-0">
          {filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="p-4 bg-gray-100 rounded-full mb-4">
                <Users className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-1">
                {searchTerm ? 'Aucun patient trouvé' : 'Aucun patient'}
              </h3>
              <p className="text-gray-500 text-sm">
                {searchTerm 
                  ? 'Essayez avec d\'autres termes'
                  : 'Commencez par ajouter un patient'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredPatients.map((patient) => (
                <div 
                  key={patient.id} 
                  className="p-5 hover:bg-gray-50 transition-colors"
                  data-testid={`patient-${patient.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#0F7E8A]/10 rounded-xl flex items-center justify-center">
                        <User className="h-6 w-6 text-[#0F7E8A]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {patient.first_name} {patient.last_name}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {calculateAge(patient.date_of_birth)} ans
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {patient.phone}
                          </span>
                          {patient.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              {patient.email}
                            </span>
                          )}
                        </div>
                        {patient.allergies && (
                          <div className="flex items-center mt-2">
                            <Badge className="bg-red-100 text-red-700 text-xs font-medium">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Allergies: {patient.allergies}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Link to={`/patients/${patient.id}/odontogram`}>
                        <Button variant="outline" size="sm" className="border-gray-200 hover:bg-gray-50 rounded-lg">
                          <Grid3X3 className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link to={`/patients/${patient.id}/documents`}>
                        <Button variant="outline" size="sm" className="border-gray-200 hover:bg-gray-50 rounded-lg">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link to={`/patients/${patient.id}/prescriptions`}>
                        <Button variant="outline" size="sm" className="border-gray-200 hover:bg-gray-50 rounded-lg">
                          <ClipboardList className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link to={`/patients/${patient.id}/lab-orders`}>
                        <Button variant="outline" size="sm" className="border-gray-200 hover:bg-gray-50 rounded-lg">
                          <FlaskConical className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link to={`/patients/${patient.id}/chart`}>
                        <Button variant="outline" size="sm" className="border-gray-200 hover:bg-gray-50 rounded-lg">
                          <Activity className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEdit(patient)}
                        className="border-gray-200 hover:bg-gray-50 rounded-lg"
                        data-testid={`edit-${patient.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientManagement;