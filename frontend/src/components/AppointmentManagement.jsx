import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../App";
import { 
  Calendar, 
  Clock, 
  Plus, 
  Edit2, 
  Trash2, 
  Download,
  User,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  AlertCircle
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const APPOINTMENT_TYPES = [
  { value: 'CONSULTATION', label: 'Consultation', color: 'bg-blue-500' },
  { value: 'TREATMENT', label: 'Traitement', color: 'bg-green-500' },
  { value: 'FOLLOW_UP', label: 'Suivi', color: 'bg-purple-500' },
  { value: 'EMERGENCY', label: 'Urgence', color: 'bg-red-500' },
  { value: 'CLEANING', label: 'Nettoyage', color: 'bg-cyan-500' },
  { value: 'CHECK_UP', label: 'Contrôle', color: 'bg-amber-500' }
];

const STATUS_LABELS = {
  'SCHEDULED': { label: 'Planifié', variant: 'secondary' },
  'CONFIRMED': { label: 'Confirmé', variant: 'default' },
  'IN_PROGRESS': { label: 'En cours', variant: 'default' },
  'COMPLETED': { label: 'Terminé', variant: 'outline' },
  'CANCELLED': { label: 'Annulé', variant: 'destructive' },
  'NO_SHOW': { label: 'Absent', variant: 'destructive' },
  'RESCHEDULED': { label: 'Reporté', variant: 'secondary' }
};

const AppointmentManagement = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [deletingAppointment, setDeletingAppointment] = useState(null);
  
  // Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toISOString().split('T')[0];
  });
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Form state
  const [formData, setFormData] = useState({
    patient_id: '',
    dentist_id: '',
    appointment_date: '',
    start_time: '09:00',
    end_time: '10:00',
    appointment_type: 'CONSULTATION',
    reason: '',
    notes: ''
  });

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      let url = `${API}/appointments?date_from=${dateFrom}&date_to=${dateTo}`;
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      const response = await axios.get(url);
      setAppointments(response.data.appointments || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error("Erreur lors du chargement des rendez-vous");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, statusFilter]);

  const fetchPatients = async () => {
    try {
      const response = await axios.get(`${API}/patients?limit=100`);
      setPatients(response.data.patients || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchDentists = async () => {
    try {
      // For now, we'll just use the current user as default dentist
      // In a full implementation, you'd have an endpoint to list dentists
      setDentists([{ id: user?.id, full_name: user?.full_name || 'Moi-même' }]);
    } catch (error) {
      console.error('Error fetching dentists:', error);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
    fetchDentists();
  }, [fetchAppointments]);

  const resetForm = () => {
    setFormData({
      patient_id: '',
      dentist_id: user?.id || '',
      appointment_date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '10:00',
      appointment_type: 'CONSULTATION',
      reason: '',
      notes: ''
    });
    setEditingAppointment(null);
  };

  const handleOpenDialog = (appointment = null) => {
    if (appointment) {
      setEditingAppointment(appointment);
      setFormData({
        patient_id: appointment.patient_id,
        dentist_id: appointment.dentist_id,
        appointment_date: appointment.appointment_date,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        appointment_type: appointment.appointment_type,
        reason: appointment.reason || '',
        notes: appointment.notes || ''
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Validate end_time > start_time
      const startMinutes = formData.start_time.split(':').reduce((acc, t) => 60 * acc + parseInt(t), 0);
      const endMinutes = formData.end_time.split(':').reduce((acc, t) => 60 * acc + parseInt(t), 0);
      
      if (endMinutes <= startMinutes) {
        toast.error("L'heure de fin doit être après l'heure de début");
        return;
      }

      const payload = { ...formData };
      // If no dentist selected, the backend will use current user
      if (!payload.dentist_id) {
        delete payload.dentist_id;
      }

      if (editingAppointment) {
        await axios.put(`${API}/appointments/${editingAppointment.id}`, payload);
        toast.success("Rendez-vous modifié avec succès");
      } else {
        await axios.post(`${API}/appointments`, payload);
        toast.success("Rendez-vous créé avec succès");
      }
      
      setIsDialogOpen(false);
      fetchAppointments();
    } catch (error) {
      console.error('Error saving appointment:', error);
      toast.error(error.response?.data?.error || "Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async () => {
    if (!deletingAppointment) return;
    
    try {
      await axios.delete(`${API}/appointments/${deletingAppointment.id}`);
      toast.success("Rendez-vous supprimé");
      setIsDeleteDialogOpen(false);
      setDeletingAppointment(null);
      fetchAppointments();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast.error(error.response?.data?.error || "Erreur lors de la suppression");
    }
  };

  const handleExportICS = async (appointment) => {
    try {
      const response = await axios.get(`${API}/appointments/${appointment.id}/export-calendar`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/calendar' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const patientName = appointment.patient 
        ? `${appointment.patient.first_name}-${appointment.patient.last_name}` 
        : 'rdv';
      link.download = `rdv-${patientName}-${appointment.appointment_date}.ics`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Fichier calendrier téléchargé");
    } catch (error) {
      console.error('Error exporting ICS:', error);
      toast.error("Erreur lors de l'export du calendrier");
    }
  };

  const handleStatusChange = async (appointment, newStatus) => {
    try {
      await axios.patch(`${API}/appointments/${appointment.id}/status`, {
        status: newStatus
      });
      toast.success("Statut mis à jour");
      fetchAppointments();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const getTypeInfo = (type) => {
    return APPOINTMENT_TYPES.find(t => t.value === type) || APPOINTMENT_TYPES[0];
  };

  return (
    <div className="space-y-6" data-testid="appointment-management">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Rendez-vous
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez les rendez-vous de votre clinique
          </p>
        </div>
        <Button 
          onClick={() => handleOpenDialog()} 
          className="gap-2"
          data-testid="add-appointment-btn"
        >
          <Plus className="h-4 w-4" />
          Nouveau Rendez-vous
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex gap-4">
              <div className="flex-1">
                <Label htmlFor="date_from" className="text-xs text-muted-foreground">Du</Label>
                <Input
                  id="date_from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1"
                  data-testid="date-from-filter"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="date_to" className="text-xs text-muted-foreground">Au</Label>
                <Input
                  id="date_to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1"
                  data-testid="date-to-filter"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Label className="text-xs text-muted-foreground">Statut</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="mt-1" data-testid="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="SCHEDULED">Planifié</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmé</SelectItem>
                  <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                  <SelectItem value="COMPLETED">Terminé</SelectItem>
                  <SelectItem value="CANCELLED">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-muted-foreground mt-4">Chargement...</p>
          </div>
        ) : appointments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun rendez-vous trouvé</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => handleOpenDialog()}
              >
                Créer un rendez-vous
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence>
              {appointments.map((appointment, index) => (
                <motion.div
                  key={appointment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="hover:shadow-md transition-shadow"
                    data-testid={`appointment-card-${appointment.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="flex gap-4">
                          {/* Date badge */}
                          <div className="flex-shrink-0 text-center bg-primary/10 rounded-lg p-3 min-w-[70px]">
                            <div className="text-lg font-bold text-primary">
                              {new Date(appointment.appointment_date).getDate()}
                            </div>
                            <div className="text-xs text-muted-foreground uppercase">
                              {new Date(appointment.appointment_date).toLocaleDateString('fr-FR', { month: 'short' })}
                            </div>
                          </div>
                          
                          {/* Details */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`w-2 h-2 rounded-full ${getTypeInfo(appointment.appointment_type).color}`} />
                              <span className="font-medium">
                                {getTypeInfo(appointment.appointment_type).label}
                              </span>
                              <Badge variant={STATUS_LABELS[appointment.status]?.variant || 'secondary'}>
                                {STATUS_LABELS[appointment.status]?.label || appointment.status}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {appointment.start_time} - {appointment.end_time}
                              </span>
                              {appointment.patient && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {appointment.patient.first_name} {appointment.patient.last_name}
                                </span>
                              )}
                            </div>
                            
                            {appointment.reason && (
                              <p className="text-sm text-muted-foreground mt-1 truncate">
                                {appointment.reason}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportICS(appointment)}
                            title="Télécharger .ics"
                            data-testid={`export-ics-btn-${appointment.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(appointment)}
                            data-testid={`edit-appointment-btn-${appointment.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeletingAppointment(appointment);
                              setIsDeleteDialogOpen(true);
                            }}
                            data-testid={`delete-appointment-btn-${appointment.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAppointment ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
            </DialogTitle>
            <DialogDescription>
              {editingAppointment 
                ? 'Modifiez les informations du rendez-vous' 
                : 'Créez un nouveau rendez-vous pour un patient'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="patient_id">Patient *</Label>
              <Select 
                value={formData.patient_id} 
                onValueChange={(value) => setFormData({...formData, patient_id: value})}
              >
                <SelectTrigger data-testid="patient-select">
                  <SelectValue placeholder="Sélectionner un patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(patient => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.first_name} {patient.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dentist_id">
                Praticien 
                <span className="text-xs text-muted-foreground ml-2">
                  (par défaut: vous-même)
                </span>
              </Label>
              <Select 
                value={formData.dentist_id || user?.id || ''} 
                onValueChange={(value) => setFormData({...formData, dentist_id: value})}
              >
                <SelectTrigger data-testid="dentist-select">
                  <SelectValue placeholder="Sélectionner (optionnel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={user?.id || ''}>
                    {user?.full_name || 'Moi-même'} (défaut)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="appointment_date">Date *</Label>
              <Input
                id="appointment_date"
                type="date"
                value={formData.appointment_date}
                onChange={(e) => setFormData({...formData, appointment_date: e.target.value})}
                required
                data-testid="appointment-date-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">Début *</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                  required
                  data-testid="start-time-input"
                />
              </div>
              <div>
                <Label htmlFor="end_time">Fin *</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                  required
                  data-testid="end-time-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="appointment_type">Type *</Label>
              <Select 
                value={formData.appointment_type} 
                onValueChange={(value) => setFormData({...formData, appointment_type: value})}
              >
                <SelectTrigger data-testid="type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${type.color}`} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reason">Motif</Label>
              <Input
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                placeholder="Raison du rendez-vous"
                data-testid="reason-input"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" data-testid="submit-appointment-btn">
                {editingAppointment ? 'Modifier' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Supprimer le rendez-vous
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce rendez-vous ? 
              Cette action ne peut pas être annulée.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              data-testid="confirm-delete-btn"
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentManagement;
