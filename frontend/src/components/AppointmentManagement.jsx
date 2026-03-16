import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useAuth } from "../App";
import { Calendar, Clock, Plus, Edit2, Trash2, Download, User, X, Check, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: '#0F172A', background: '#fff', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 };

const APPOINTMENT_TYPES = [
  { value: 'CONSULTATION', label: 'Consultation', color: '#3b82f6' },
  { value: 'TREATMENT',    label: 'Traitement',   color: '#22c55e' },
  { value: 'FOLLOW_UP',    label: 'Suivi',        color: '#8b5cf6' },
  { value: 'EMERGENCY',    label: 'Urgence',       color: '#ef4444' },
  { value: 'CLEANING',     label: 'Nettoyage',    color: '#06b6d4' },
  { value: 'CHECK_UP',     label: 'Contrôle',     color: '#f59e0b' }
];

const STATUS_LABELS = {
  SCHEDULED:   { label: 'Planifié',   bg: '#F1F5F9', color: '#475569' },
  CONFIRMED:   { label: 'Confirmé',   bg: '#DCFCE7', color: '#15803D' },
  IN_PROGRESS: { label: 'En cours',   bg: '#DBEAFE', color: '#1D4ED8' },
  COMPLETED:   { label: 'Terminé',    bg: '#F0FDF4', color: '#166534' },
  CANCELLED:   { label: 'Annulé',     bg: '#FEE2E2', color: '#B91C1C' },
  NO_SHOW:     { label: 'Absent',     bg: '#FEE2E2', color: '#B91C1C' },
  RESCHEDULED: { label: 'Reporté',    bg: '#FEF9C3', color: '#92400E' }
};

// ── Modal CSS pur ──
const Modal = ({ open, onClose, title, children, maxWidth = 480 }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth, boxShadow: '0 16px 48px rgba(15,23,42,0.18)', border: '1px solid #E2E8F0', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}><X size={18} /></button>
        {title && <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 17, fontWeight: 700, color: '#0F172A', margin: '0 0 20px', paddingRight: 24 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
};

const AppointmentManagement = () => {
  const { user } = useAuth();
  const [appointments, setAppointments]   = useState([]);
  const [patients, setPatients]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [isDialogOpen, setIsDialogOpen]   = useState(false);
  const [isDeleteOpen, setIsDeleteOpen]   = useState(false);
  const [editingAppointment, setEditingAppointment]   = useState(null);
  const [deletingAppointment, setDeletingAppointment] = useState(null);

  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo]     = useState(() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().split('T')[0]; });
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    patient_id: '', dentist_id: '',
    appointment_date: '', start_time: '09:00', end_time: '10:00',
    appointment_type: 'CONSULTATION', reason: '', notes: ''
  });

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      let url = `${API}/appointments?date_from=${dateFrom}&date_to=${dateTo}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      const res = await axios.get(url);
      setAppointments(res.data.appointments || []);
    } catch (err) {
      if (!axios.isCancel(err)) toast.error("Erreur chargement rendez-vous");
    } finally { setLoading(false); }
  }, [dateFrom, dateTo, statusFilter]);

  const fetchPatients = async () => {
    try {
      const res = await axios.get(`${API}/patients?limit=100`);
      setPatients(res.data.patients || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchAppointments(); fetchPatients(); }, [fetchAppointments]);

  const resetForm = () => {
    setFormData({ patient_id: '', dentist_id: user?.id || '', appointment_date: new Date().toISOString().split('T')[0], start_time: '09:00', end_time: '10:00', appointment_type: 'CONSULTATION', reason: '', notes: '' });
    setEditingAppointment(null);
  };

  const handleOpenDialog = (appointment = null) => {
    if (appointment) {
      setEditingAppointment(appointment);
      setFormData({ patient_id: appointment.patient_id, dentist_id: appointment.dentist_id, appointment_date: appointment.appointment_date, start_time: appointment.start_time, end_time: appointment.end_time, appointment_type: appointment.appointment_type, reason: appointment.reason || '', notes: appointment.notes || '' });
    } else { resetForm(); }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const startMin = formData.start_time.split(':').reduce((a, t) => 60 * a + parseInt(t), 0);
    const endMin   = formData.end_time.split(':').reduce((a, t) => 60 * a + parseInt(t), 0);
    if (endMin <= startMin) { toast.error("L'heure de fin doit être après le début"); return; }
    try {
      const payload = { ...formData };
      if (!payload.dentist_id) delete payload.dentist_id;
      if (editingAppointment) {
        await axios.put(`${API}/appointments/${editingAppointment.id}`, payload);
        toast.success("Rendez-vous modifié");
      } else {
        await axios.post(`${API}/appointments`, payload);
        toast.success("Rendez-vous créé");
      }
      setIsDialogOpen(false);
      fetchAppointments();
    } catch (err) { toast.error(err.response?.data?.error || "Erreur enregistrement"); }
  };

  const handleDelete = async () => {
    if (!deletingAppointment) return;
    try {
      await axios.delete(`${API}/appointments/${deletingAppointment.id}`);
      toast.success("Rendez-vous supprimé");
      setIsDeleteOpen(false); setDeletingAppointment(null);
      fetchAppointments();
    } catch (err) { toast.error(err.response?.data?.error || "Erreur suppression"); }
  };

  const handleExportICS = async (appointment) => {
    try {
      const res = await axios.get(`${API}/appointments/${appointment.id}/export-calendar`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/calendar' });
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `rdv-${appointment.appointment_date}.ics`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Calendrier téléchargé");
    } catch (err) { toast.error("Erreur export calendrier"); }
  };

  const getTypeInfo = (type) => APPOINTMENT_TYPES.find(t => t.value === type) || APPOINTMENT_TYPES[0];

  return (
    <div className="space-y-6" data-testid="appointment-management">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar style={{ color: '#0D7A87' }} className="h-6 w-6" />Rendez-vous
          </h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>Gérez les rendez-vous de votre clinique</p>
        </div>
        <Button onClick={() => handleOpenDialog()} data-testid="add-appointment-btn">
          <Plus className="h-4 w-4 mr-2" />Nouveau Rendez-vous
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-4">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={labelStyle}>Du</label>
              <input style={{ ...inputStyle, width: 160 }} type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} data-testid="date-from-filter" />
            </div>
            <div>
              <label style={labelStyle}>Au</label>
              <input style={{ ...inputStyle, width: 160 }} type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} data-testid="date-to-filter" />
            </div>
            <div>
              <label style={labelStyle}>Statut</label>
              <select style={{ ...inputStyle, width: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} data-testid="status-filter">
                <option value="all">Tous</option>
                <option value="SCHEDULED">Planifié</option>
                <option value="CONFIRMED">Confirmé</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="COMPLETED">Terminé</option>
                <option value="CANCELLED">Annulé</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste */}
      <div className="space-y-4">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ width: 32, height: 32, border: '3px solid #E2E8F0', borderTopColor: '#0D7A87', borderRadius: '50%', animation: 'spin 0.75s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: '#94A3B8' }}>Chargement...</p>
          </div>
        ) : appointments.length === 0 ? (
          <Card>
            <CardContent style={{ textAlign: 'center', padding: '48px 0' }}>
              <Calendar style={{ width: 48, height: 48, color: '#E2E8F0', margin: '0 auto 12px' }} />
              <p style={{ color: '#94A3B8' }}>Aucun rendez-vous trouvé</p>
              <Button variant="outline" style={{ marginTop: 16 }} onClick={() => handleOpenDialog()}>Créer un rendez-vous</Button>
            </CardContent>
          </Card>
        ) : appointments.map((appointment) => {
          const typeInfo   = getTypeInfo(appointment.appointment_type);
          const statusInfo = STATUS_LABELS[appointment.status] || { label: appointment.status, bg: '#F1F5F9', color: '#475569' };
          return (
            <Card key={appointment.id} className="hover:shadow-md transition-shadow" data-testid={`appointment-card-${appointment.id}`}>
              <CardContent className="p-4">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ textAlign: 'center', background: 'rgba(13,122,135,0.08)', borderRadius: 12, padding: '10px 14px', minWidth: 64 }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#0D7A87' }}>{new Date(appointment.appointment_date).getDate()}</div>
                      <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase' }}>{new Date(appointment.appointment_date).toLocaleDateString('fr-FR', { month: 'short' })}</div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: typeInfo.color, display: 'inline-block' }} />
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{typeInfo.label}</span>
                        <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: statusInfo.bg, color: statusInfo.color }}>{statusInfo.label}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 14, fontSize: 13, color: '#64748B', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={13} />{appointment.start_time} - {appointment.end_time}</span>
                        {appointment.patient && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={13} />{appointment.patient.first_name} {appointment.patient.last_name}</span>}
                      </div>
                      {appointment.reason && <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>{appointment.reason}</p>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Button variant="outline" size="sm" onClick={() => handleExportICS(appointment)} title="Télécharger .ics" data-testid={`export-ics-btn-${appointment.id}`}><Download className="h-4 w-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => handleOpenDialog(appointment)} data-testid={`edit-appointment-btn-${appointment.id}`}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => { setDeletingAppointment(appointment); setIsDeleteOpen(true); }} style={{ color: '#E63946' }} data-testid={`delete-appointment-btn-${appointment.id}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Modal Créer/Modifier ── */}
      <Modal open={isDialogOpen} onClose={() => setIsDialogOpen(false)} title={editingAppointment ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Patient *</label>
              <select style={inputStyle} value={formData.patient_id} onChange={e => setFormData({ ...formData, patient_id: e.target.value })} required data-testid="patient-select">
                <option value="">Sélectionner un patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Date *</label>
              <input style={inputStyle} type="date" value={formData.appointment_date} onChange={e => setFormData({ ...formData, appointment_date: e.target.value })} required data-testid="appointment-date-input" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Début *</label>
                <input style={inputStyle} type="time" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} required data-testid="start-time-input" />
              </div>
              <div>
                <label style={labelStyle}>Fin *</label>
                <input style={inputStyle} type="time" value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} required data-testid="end-time-input" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Type *</label>
              <select style={inputStyle} value={formData.appointment_type} onChange={e => setFormData({ ...formData, appointment_type: e.target.value })} required data-testid="type-select">
                {APPOINTMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Motif</label>
              <input style={inputStyle} value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} placeholder="Raison du rendez-vous" data-testid="reason-input" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid #F1F5F9' }}>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
              <Button type="submit" data-testid="submit-appointment-btn">{editingAppointment ? 'Modifier' : 'Créer'}</Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ── Modal Suppression ── */}
      <Modal open={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Supprimer le rendez-vous" maxWidth={400}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 16px', background: '#FEF2F2', borderRadius: 10 }}>
          <AlertCircle size={20} style={{ color: '#E63946', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: '#991B1B' }}>Cette action ne peut pas être annulée.</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Annuler</Button>
          <Button onClick={handleDelete} style={{ background: '#E63946', color: '#fff', border: 'none' }} data-testid="confirm-delete-btn">Supprimer</Button>
        </div>
      </Modal>
    </div>
  );
};

export default AppointmentManagement;
