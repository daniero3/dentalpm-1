import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
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
  const [notification, setNotification] = useState(null); // { type: 'success'|'error'|'info', msg: string }

  const notify = (type, msg) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3000);
  };

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    // ✅ Bloquer si patientId invalide
    if (!patientId || patientId === 'undefined') {
      setLoading(false);
      return;
    }
    fetchPatient();
    fetchOdontogram();
  }, [patientId]);

  const fetchPatient = async () => {
    if (!patientId || patientId === 'undefined') return;
    try {
      const res = await axios.get(`${API}/patients/${patientId}`, authHeaders());
      setPatient(res.data);
    } catch (err) {
      // Ignorer les erreurs d'annulation axios (intercepteur global)
      if (axios.isCancel(err)) return;
      console.error('Patient error:', err);
    }
  };

  const fetchOdontogram = async () => {
    if (!patientId || patientId === 'undefined') return;
    try {
      const res = await axios.get(`${API}/patients/${patientId}/odontogram`, authHeaders());
      setOdontogram(res.data.odontogram || {});
    } catch (err) {
      // Ignorer les erreurs d'annulation axios (intercepteur global)
      if (axios.isCancel(err)) return;
      notify('error', 'Erreur chargement odontogramme');
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
    notify('success', `Dent ${selectedTooth} modifiée`);
  };

  const handleSaveAll = async () => {
    const teeth = Object.values(pendingChanges);
    if (teeth.length === 0) {
      notify('info', 'Aucune modification à sauvegarder');
      return;
    }
    setSaving(true);
    try {
      await axios.put(`${API}/patients/${patientId}/odontogram`, { teeth }, authHeaders());
      notify('success', `${teeth.length} dent(s) sauvegardée(s)`);
      setPendingChanges({});
      fetchOdontogram();
    } catch (err) {
      if (axios.isCancel(err)) return;
      notify('error', 'Erreur sauvegarde');
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

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#0D7A87' }} />
    </div>
  );

  // ✅ Modal CSS pur — pas de Dialog shadcn pour éviter bug Portal/removeChild
  const Modal = ({ open, onClose, children }) => {
    if (!open) return null;
    return (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15,23,42,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div style={{
          background: '#fff', borderRadius: 16,
          padding: 24, width: '100%', maxWidth: 440,
          boxShadow: '0 16px 48px rgba(15,23,42,0.18)',
          border: '1px solid #E2E8F0'
        }}>
          {children}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="patient-odontogram">
      {/* Header */}
      <div className="flex flex-col gap-3">
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
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {saving
              ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
              : <Save className="h-4 w-4 mr-2" />
            }
            Sauvegarder ({Object.keys(pendingChanges).length})
          </Button>
          {Object.keys(pendingChanges).length > 0 && (
            <span className="flex items-center text-sm text-amber-600 font-medium">
              ⚠️ {Object.keys(pendingChanges).length} modification(s) non sauvegardée(s)
            </span>
          )}
        </div>
      </div>

      {/* ✅ Notification inline — remplace toast Sonner pour éviter bug Portal */}
      {notification && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 10,
          fontFamily: 'DM Sans',
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: notification.type === 'success' ? '#DCFCE7' :
                      notification.type === 'error'   ? '#FEE2E2' : '#DBEAFE',
          color:      notification.type === 'success' ? '#15803D' :
                      notification.type === 'error'   ? '#B91C1C' : '#1D4ED8',
          border: `1px solid ${
                      notification.type === 'success' ? '#BBF7D0' :
                      notification.type === 'error'   ? '#FECACA' : '#BFDBFE'}`,
        }}>
          {notification.type === 'success' ? '✅' :
           notification.type === 'error'   ? '❌' : 'ℹ️'}
          {notification.msg}
        </div>
      )}

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

      {/* ✅ Modal CSS pur — remplace Dialog shadcn pour éviter bug removeChild */}
      <Modal open={!!selectedTooth} onClose={() => setSelectedTooth(null)}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 17, color: '#0F172A', margin: 0 }}>
            Dent {selectedTooth}
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Statut</label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm({...editForm, status: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, fontFamily: 'DM Sans', color: '#0F172A', background: '#fff' }}
              data-testid="status-select"
            >
              {Object.entries(STATUSES).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Surface</label>
            <select
              value={editForm.surface}
              onChange={(e) => setEditForm({...editForm, surface: e.target.value})}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, fontFamily: 'DM Sans', color: '#0F172A', background: '#fff' }}
            >
              {SURFACES.map(s => (
                <option key={s} value={s}>{SURFACE_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Note</label>
            <textarea
              value={editForm.note}
              onChange={(e) => setEditForm({...editForm, note: e.target.value})}
              placeholder="Observations..."
              rows={2}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, fontFamily: 'DM Sans', color: '#0F172A', background: '#fff', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8, borderTop: '1px solid #F1F5F9' }}>
            <Button variant="outline" onClick={() => setSelectedTooth(null)}>Annuler</Button>
            <Button onClick={handleSaveTooth} data-testid="save-tooth-btn">Appliquer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PatientOdontogram;
