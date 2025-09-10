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
  Calendar
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
    phone: '',
    email: '',
    address: '',
    emergency_contact: '',
    emergency_phone: '',
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
      toast.error('Erreur lors de l\'enregistrement du patient');
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: '',
      phone: '',
      email: '',
      address: '',
      emergency_contact: '',
      emergency_phone: '',
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
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-300 h-20 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Users className="h-8 w-8 mr-3 text-blue-600" />
            Gestion des Patients
          </h1>
          <p className="text-gray-600 mt-1">
            {patients.length} patients enregistrés
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Patient
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
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
                  <Label htmlFor="phone">Téléphone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+261 32 00 000 00"
                    required
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
                <Label htmlFor="address">Adresse *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Adresse complète"
                  rows={2}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact">Contact d'urgence *</Label>
                  <Input
                    id="emergency_contact"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})}
                    placeholder="Nom du contact"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_phone">Téléphone d'urgence *</Label>
                  <Input
                    id="emergency_phone"
                    value={formData.emergency_phone}
                    onChange={(e) => setFormData({...formData, emergency_phone: e.target.value})}
                    placeholder="+261 32 00 000 00"
                    required
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
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher un patient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Patients List */}
      <div className="grid gap-4">
        {filteredPatients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {searchTerm ? 'Aucun patient trouvé' : 'Aucun patient enregistré'}
              </h3>
              <p className="text-gray-500 text-center">
                {searchTerm 
                  ? 'Essayez avec d\'autres termes de recherche'
                  : 'Commencez par ajouter votre premier patient'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredPatients.map((patient) => (
            <Card key={patient.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-100 p-3 rounded-full">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {patient.first_name} {patient.last_name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {calculateAge(patient.date_of_birth)} ans
                        </span>
                        <span className="flex items-center">
                          <Phone className="h-4 w-4 mr-1" />
                          {patient.phone}
                        </span>
                        {patient.email && (
                          <span className="flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            {patient.email}
                          </span>
                        )}
                      </div>
                      {patient.allergies && (
                        <div className="flex items-center mt-2">
                          <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
                          <Badge variant="destructive" className="text-xs">
                            Allergies: {patient.allergies}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Link to={`/patients/${patient.id}/chart`}>
                      <Button variant="outline" size="sm">
                        <Activity className="h-4 w-4 mr-2" />
                        Fiche dentaire
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(patient)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default PatientManagement;