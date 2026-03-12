import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, User, Loader2, Save, RefreshCw } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STATUSES = {
  HEALTHY:            { label: 'Sain',        color: 'bg-white border-2 border-gray-300', textColor: 'text-green-700' },
  CARIES:             { label: 'Carie',        color: 'bg-red-500',    textColor: 'text-red-700' },
  FILLED:             { label: 'Obturé',       color: 'bg-blue-500',   textColor: 'text-blue-700' },
  CROWN:              { label: 'Couronne',     color: 'bg-yellow-500', textColor: 'text-yellow-700' },
  MISSING:            { label: 'Absent',       color: 'bg-gray-400',   textColor: 'text-gray-600' },
  IMPLANT:            { label: 'Implant',      color: 'bg-purple-500', textColor: 'text-purple-700' },
  ROOT_CANAL:         { label: 'Dévitalisé',   color: 'bg-orange-500', textColor: 'text-orange-700' },
  EXTRACTION_NEEDED:  { label: 'À extraire',   color: 'bg-pink-500',   textColor: 'text-pink-700' },
  BRIDGE:             { label: 'Bridge',       color: 'bg-cyan-500',   textColor: 'text-cyan-700' }
};

// ⚠️ Pas de value="" — shadcn/ui interdit les valeurs vides
const SURFACES = ['NONE', 'M', 'D', 'O', 'B', 'L', 'I', 'MO', 'DO', 'MOD', 'MODBL'];
const SURFACE_LABELS = { NONE: 'Aucune', M: 'M', D: 'D', O: 'O', B: 'B', L: 'L', I: 'I', MO: 'MO', DO: 'DO', MOD: 'MOD', MODBL: 'MODBL' };

const UPPER_RIGHT = ['18', '17', '16', '15', '14', '13', '12', '11'];
const UPPER_LEFT  = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_LEFT  = ['31', '32', '33', '34', '35', '36', '37', '38'];
const LOWER_RIGHT = ['48', '47', '46', '45', '44', '43', '42', '41'];

const PatientOdontogram = () => {
  const { patientId } = useParams();
  const [patient, setPatient] = useState(null);
  const [odontogram, setOdontogram] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [editForm, setEditForm] = useState({ status: 'HEALTHY', surface: 'NONE', note: '' });
  const [pendingChanges, setPendingChanges] = useState({});

  // Helper token
  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    fetchPatient();
    fetchOdontogram();
  }, [patientId]);

  const fetchPatient = async () => {
    try {
      const res = await axios.get(`${API}/patients/${patientId}`, authHeaders());
      setPatient(res.data);
    } catch (err) {
      toast.error('Patient non trouvé');
    }
  };

  const fetchOdontogram = async () => {
    try {
      const res = await axios.get(`${API}/patients/${patientId}/odontogram`, authHeaders());
      setOdontogram(res.data.odontogram || {});
    } catch (err) {
      toast.error('Erreur chargement odontogramme');
    } finally {
      setLoading(false);
    }
  };

  const handleToothClick = (toothFdi) => {
    const existing = pendingChanges[toothFdi] || odontogram[toothFdi] || {};
    setSelectedTooth(toothFdi);
    setEditForm({
      status:  existing.status  || 'HEALTHY',
      surface: existing.surface || 'NONE',
      note:    existing.note    || ''
    });
  };

  const handleSaveTooth = () => {
    setPendingChanges({
      ...pendingChanges,
      [selectedTooth]: {
        tooth_fdi: selectedTooth,
        status:  editForm.status,
        surface: editForm.surface === 'NONE' ? '' : editForm.surface,
        note:    editForm.note
      }
    });
    setSelectedTooth(null);
    toast.success(`Dent ${selectedTooth} modifiée (non sauvegardé)`);
  };

  const handleSaveAll = async () => {
    const teeth = Object.values(pendingChanges);
    if (teeth.length === 0) {
      toast.info('Aucune modification à sauvegarder');
      return;
    }
    setSaving(true);
    try {
      await axios.put(`${API}/patients/${patientId}/odontogram`, { teeth }, authHeaders());
      toast.success(`${teeth.length} dent(s) sauvegardée(s)`);
      setPendingChanges({});
      fetchOdontogram();
    } catch (err) {
      toast.error('Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const getToothDisplay = (toothFdi) => {
    const pending = pendingChanges[toothFdi];
    const saved   = odontogram[toothFdi];
    const data    = pending || saved;
    if (!data || data.status === 'HEALTHY') {
      return { color: 'bg-white border-2 border-gray-300', isPending: !!pending };
    }
    const statusInfo = STATUSES[data.status] || STATUSES.HEALTHY;
    return { color: statusInfo.color, isPending: !!pending };
  };

  const ToothButton = ({ toothFdi }) => {
    const { color, isPending } = getToothDisplay(toothFdi);
    return (
      <button
        onClick={() => handleToothClick(toothFdi)}
        className={`w-10 h-12 rounded ${color} text-xs font-bold flex items-center justify-center hover:ring-2 hover:ring-blue-400 transition ${isPending ? 'ring-2 ring-yellow-400' : ''}`}
        data-testid={`tooth-${toothFdi}`}
      >
        {toothFdi}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="patient-odontogram">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/patients">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Odontogramme</h1>
            {patient && (
              <p className="text-gray-500 flex items-center gap-1">
                <User className="h-4 w-4" />
                {patient.first_name} {patient.last_name}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchOdontogram}>
            <RefreshCw className="h-4 w-4 mr-2" />Recharger
          </Button>
          <Button
            onClick={handleSaveAll}
            disabled={saving || Object.keys(pendingChanges).length === 0}
            data-testid="save-all-btn"
          >
            {saving
              ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
              : <Save className="h-4 w-4 mr-2" />
            }
            Sauvegarder ({Object.keys(pendingChanges).length})
          </Button>
        </div>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            {Object.entries(STATUSES).map(([key, { label, color }]) => (
              <div key={key} className="flex items-center gap-1">
                <div className={`w-4 h-4 rounded ${color}`}></div>
                <span className="text-xs">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Odontogram Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Schéma dentaire FDI</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            {/* Upper Jaw */}
            <div className="flex gap-1">
              <div className="flex gap-1 border-r-2 border-gray-400 pr-2">
                {UPPER_RIGHT.map(t => <ToothButton key={t} toothFdi={t} />)}
              </div>
              <div className="flex gap-1 pl-2">
                {UPPER_LEFT.map(t => <ToothButton key={t} toothFdi={t} />)}
              </div>
            </div>
            <div className="text-center text-sm text-gray-500 py-2 border-t border-b w-full">
              ─── Ligne médiane ───
            </div>
            {/* Lower Jaw */}
            <div className="flex gap-1">
              <div className="flex gap-1 border-r-2 border-gray-400 pr-2">
                {LOWER_RIGHT.map(t => <ToothButton key={t} toothFdi={t} />)}
              </div>
              <div className="flex gap-1 pl-2">
                {LOWER_LEFT.map(t => <ToothButton key={t} toothFdi={t} />)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!selectedTooth} onOpenChange={() => setSelectedTooth(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dent {selectedTooth}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Statut — select natif pour éviter bug Portal shadcn dans Dialog */}
            <div className="space-y-2">
              <Label>Statut</Label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="status-select"
              >
                {Object.entries(STATUSES).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Surface — select natif pour éviter bug Portal shadcn dans Dialog */}
            <div className="space-y-2">
              <Label>Surface</Label>
              <select
                value={editForm.surface}
                onChange={(e) => setEditForm({...editForm, surface: e.target.value})}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {SURFACES.map(s => (
                  <option key={s} value={s}>{SURFACE_LABELS[s]}</option>
                ))}
              </select>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                value={editForm.note}
                onChange={(e) => setEditForm({...editForm, note: e.target.value})}
                placeholder="Observations..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setSelectedTooth(null)}>Annuler</Button>
              <Button onClick={handleSaveTooth} data-testid="save-tooth-btn">Appliquer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientOdontogram;
