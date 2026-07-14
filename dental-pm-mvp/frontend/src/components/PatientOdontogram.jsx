import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ArrowLeft, User, Loader2, Save, RefreshCw, X, History, CalendarClock } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const STATUSES = {
  HEALTHY:           { label:'Sain',       color:'bg-white border-2 border-gray-300' },
  CARIES:            { label:'Carie',       color:'bg-red-500' },
  FILLED:            { label:'Obturer',     color:'bg-blue-500' },
  CROWN:             { label:'Couronne',    color:'bg-yellow-500' },
  MISSING:           { label:'Absent',      color:'bg-gray-400' },
  IMPLANT:           { label:'Implant',     color:'bg-purple-500' },
  ROOT_CANAL:        { label:'Devitalise',  color:'bg-orange-500' },
  EXTRACTION_NEEDED: { label:'A extraire',  color:'bg-pink-500' },
  BRIDGE:            { label:'Bridge',      color:'bg-cyan-500' }
};

const SURFACES     = ['NONE','M','D','O','B','L','I','MO','DO','MOD','MODBL'];
const SURFACE_LABELS = { NONE:'Aucune',M:'M',D:'D',O:'O',B:'B',L:'L',I:'I',MO:'MO',DO:'DO',MOD:'MOD',MODBL:'MODBL' };
const UPPER_RIGHT  = ['18','17','16','15','14','13','12','11'];
const UPPER_LEFT   = ['21','22','23','24','25','26','27','28'];
const LOWER_LEFT   = ['31','32','33','34','35','36','37','38'];
const LOWER_RIGHT  = ['48','47','46','45','44','43','42','41'];
const PRIMARY_UPPER_RIGHT = ['55','54','53','52','51'];
const PRIMARY_UPPER_LEFT  = ['61','62','63','64','65'];
const PRIMARY_LOWER_LEFT  = ['71','72','73','74','75'];
const PRIMARY_LOWER_RIGHT = ['85','84','83','82','81'];
const fdatetime = d => d ? new Date(d).toLocaleString('fr-FR', { dateStyle:'short', timeStyle:'short' }) : 'Non renseigné';
const actionLabel = action => ({ CREATE:'Création', UPDATE:'Modification', DELETE:'Suppression' }[action] || action || 'Action');

// Modal defini au niveau MODULE (hors de tout composant)
const Modal = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(15,23,42,0.5)', overflowY:'auto', padding:'80px 16px 32px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background:'#fff', borderRadius:16, padding:24, width:'100%', maxWidth:440, margin:'0 auto', boxShadow:'0 16px 48px rgba(15,23,42,0.18)', border:'1px solid #E2E8F0', position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute', top:12, right:12, background:'none', border:'none', cursor:'pointer', color:'#94A3B8', padding:4 }}>
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
};

// Styles definis au niveau MODULE
const selectStyle = { width:'100%', padding:'8px 12px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:13, fontFamily:'DM Sans,sans-serif', color:'#0F172A', background:'#fff' };
const labelStyle  = { display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 };
const textareaStyle = { width:'100%', padding:'8px 12px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:13, fontFamily:'DM Sans,sans-serif', color:'#0F172A', background:'#fff', resize:'vertical', outline:'none', boxSizing:'border-box' };

const Notification = ({ notification }) => {
  if (!notification) return null;
  const colors = {
    success: { bg:'#DCFCE7', border:'#BBF7D0', color:'#15803D', icon:'OK' },
    error:   { bg:'#FEE2E2', border:'#FECACA', color:'#B91C1C', icon:'!' },
    info:    { bg:'#DBEAFE', border:'#BFDBFE', color:'#1D4ED8', icon:'i' }
  };
  const c = colors[notification.type] || colors.info;
  return (
    <div style={{ padding:'12px 16px', borderRadius:10, fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:8, background:c.bg, color:c.color, border:`1px solid ${c.border}` }}>
      [{c.icon}] {notification.msg}
    </div>
  );
};

const PatientOdontogram = ({ patientIdOverride = null, embedded = false }) => {  
  const params = useParams();
  const patientId = patientIdOverride || params.patientId || params.id;
  const [patient, setPatient]             = useState(null);
  const [odontogram, setOdontogram]       = useState({});
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [editForm, setEditForm]           = useState({ status:'HEALTHY', surface:'NONE', note:'' });
  const [pendingChanges, setPendingChanges] = useState({});
  const [toothHistory, setToothHistory]   = useState([]);
  const [notification, setNotification]   = useState(null);

  const notify = useCallback((type, msg) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  useEffect(() => {
    if (!patientId || patientId === 'undefined') { setLoading(false); return; }
    fetchPatient();
    fetchOdontogram();
    fetchHistory();
  }, [patientId]);

  const fetchPatient = async () => {
    try {
      const res = await axios.get(`${API}/patients/${patientId}`, authHeaders());
      setPatient(res.data);
    } catch (err) { if (!axios.isCancel(err)) console.error('Patient error:', err); }
  };

  const fetchOdontogram = async () => {
    try {
      const res = await axios.get(`${API}/patients/${patientId}/odontogram`, authHeaders());
      setOdontogram(res.data.odontogram || {});
    } catch (err) {
      if (!axios.isCancel(err)) notify('error', 'Erreur chargement odontogramme');
    } finally { setLoading(false); }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API}/patients/${patientId}/odontogram/history`, authHeaders());
      setToothHistory(res.data.history || []);
    } catch (err) {
      if (!axios.isCancel(err)) console.error('Odontogram history error:', err);
    }
  };

  const handleToothClick = useCallback((toothFdi) => {
    const existing = pendingChanges[toothFdi] || odontogram[toothFdi] || {};
    const nextForm = { status: existing.status || 'HEALTHY', surface: existing.surface || 'NONE', note: existing.note || '' };
    setSelectedTooth(() => toothFdi);
    setEditForm(nextForm);
  }, [pendingChanges, odontogram]);

  // Handlers memomises — stables entre renders, ne causent pas perte de focus
  const handleStatusChange  = useCallback(e => setEditForm(p => ({ ...p, status:  e.target.value })), []);
  const handleSurfaceChange = useCallback(e => setEditForm(p => ({ ...p, surface: e.target.value })), []);
  const handleNoteChange    = useCallback(e => setEditForm(p => ({ ...p, note:    e.target.value })), []);

  const handleSaveTooth = useCallback(() => {
    const actionDate = new Date().toISOString();
    setPendingChanges(prev => ({
      ...prev,
      [selectedTooth]: { tooth_fdi:selectedTooth, status:editForm.status, surface:editForm.surface === 'NONE' ? '' : editForm.surface, note:editForm.note, action_date: actionDate }
    }));
    setSelectedTooth(null);
    notify('success', `Dent ${selectedTooth} modifiee le ${fdatetime(actionDate)}`);
  }, [selectedTooth, editForm, notify]);

  const handleSaveAll = async () => {
    const teeth = Object.values(pendingChanges);
    if (!teeth.length) { notify('info', 'Aucune modification'); return; }
    setSaving(true);
    try {
      await axios.put(`${API}/patients/${patientId}/odontogram`, { teeth }, authHeaders());
      notify('success', `${teeth.length} dent(s) sauvegardee(s)`);
      setPendingChanges({});
      fetchOdontogram();
      fetchHistory();
    } catch (err) {
      if (!axios.isCancel(err)) notify('error', err.response?.data?.error || 'Erreur sauvegarde');
    } finally { setSaving(false); }
  };

  const getToothDisplay = (toothFdi) => {
    const data = pendingChanges[toothFdi] || odontogram[toothFdi];
    if (!data || data.status === 'HEALTHY') return { color:'bg-white border-2 border-gray-300', isPending:!!pendingChanges[toothFdi] };
    return { color:(STATUSES[data.status]||STATUSES.HEALTHY).color, isPending:!!pendingChanges[toothFdi] };
  };

  const ToothButton = ({ toothFdi }) => {
    const { color, isPending } = getToothDisplay(toothFdi);
    const existing = pendingChanges[toothFdi] || odontogram[toothFdi];
    const dateLabel = pendingChanges[toothFdi]?.action_date
      ? fdatetime(pendingChanges[toothFdi].action_date)
      : existing?.updated_at
        ? fdatetime(existing.updated_at)
        : '';
    return (
      <button onClick={() => handleToothClick(toothFdi)}
        title={dateLabel ? `Dernière action : ${dateLabel}` : `Dent ${toothFdi}`}
        className={`w-11 h-14 rounded ${color} text-xs font-bold flex flex-col items-center justify-center hover:ring-2 hover:ring-blue-400 transition ${isPending ? 'ring-2 ring-yellow-400' : ''}`}
        data-testid={`tooth-${toothFdi}`}>
        <span>{toothFdi}</span>
        {dateLabel && <span className="text-[8px] leading-none font-semibold opacity-75 mt-0.5">{dateLabel.split(' ')[0]}</span>}
      </button>
    );
  };

  const selectedHistory = selectedTooth ? toothHistory.filter(h => h.tooth_fdi === selectedTooth).slice(0, 5) : [];
  const recentActions = [
    ...Object.values(pendingChanges).map(c => ({ ...c, id:`pending-${c.tooth_fdi}`, action:'EN_ATTENTE', created_at:c.action_date, isPending:true })),
    ...toothHistory
  ].sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 8);

  if (loading) return (
    <div className="dpm-card mx-auto my-6 grid max-w-xl gap-3">
      <div className="dpm-skeleton h-5 w-1/3" />
      <div className="dpm-skeleton h-3 w-full" />
      <div className="dpm-skeleton h-3 w-4/5" />
      <div className="dpm-skeleton h-10 w-full" />
    </div>
  );

  return (
    <div className="space-y-6" data-testid="patient-odontogram">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          {!embedded && (
          <Link to="/patients"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Retour</Button></Link>
          )}
          <div>
            <h1 className="text-2xl font-bold">Odontogramme</h1>
            {patient && <p className="text-gray-500 flex items-center gap-1"><User className="h-4 w-4" />{patient.first_name} {patient.last_name}</p>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={fetchOdontogram}><RefreshCw className="h-4 w-4 mr-2" />Recharger</Button>
          <Button onClick={handleSaveAll} disabled={saving || !Object.keys(pendingChanges).length}
            className="text-white" data-testid="save-all-btn"
            style={{ backgroundColor: '#16a34a', borderColor: '#16a34a', color: '#fff', opacity: saving || !Object.keys(pendingChanges).length ? 0.75 : 1 }}>
            {saving ? <span className="dpm-skeleton inline-block h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Sauvegarder ({Object.keys(pendingChanges).length})
          </Button>
          {Object.keys(pendingChanges).length > 0 && (
            <span className="flex items-center text-sm text-amber-600 font-medium">
              {Object.keys(pendingChanges).length} modification(s) non sauvegardee(s)
            </span>
          )}
        </div>
      </div>

      <Notification notification={notification} />

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            {Object.entries(STATUSES).map(([key, { label, color }]) => (
              <div key={key} className="flex items-center gap-1">
                <div className={`w-4 h-4 rounded ${color}`} />
                <span className="text-xs">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-center">Schema dentaire FDI - dentition permanente</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-1">
              <div className="flex gap-1 border-r-2 border-gray-400 pr-2">{UPPER_RIGHT.map(t => <ToothButton key={t} toothFdi={t} />)}</div>
              <div className="flex gap-1 pl-2">{UPPER_LEFT.map(t => <ToothButton key={t} toothFdi={t} />)}</div>
            </div>
            <div className="text-center text-sm text-gray-500 py-2 border-t border-b w-full">Ligne mediane</div>
            <div className="flex gap-1">
              <div className="flex gap-1 border-r-2 border-gray-400 pr-2">{LOWER_RIGHT.map(t => <ToothButton key={t} toothFdi={t} />)}</div>
              <div className="flex gap-1 pl-2">{LOWER_LEFT.map(t => <ToothButton key={t} toothFdi={t} />)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-center">Odontogramme dents de lait - dentition temporaire</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-1">
              <div className="flex gap-1 border-r-2 border-gray-400 pr-2">{PRIMARY_UPPER_RIGHT.map(t => <ToothButton key={t} toothFdi={t} />)}</div>
              <div className="flex gap-1 pl-2">{PRIMARY_UPPER_LEFT.map(t => <ToothButton key={t} toothFdi={t} />)}</div>
            </div>
            <div className="text-center text-sm text-gray-500 py-2 border-t border-b w-full">Ligne mediane</div>
            <div className="flex gap-1">
              <div className="flex gap-1 border-r-2 border-gray-400 pr-2">{PRIMARY_LOWER_RIGHT.map(t => <ToothButton key={t} toothFdi={t} />)}</div>
              <div className="flex gap-1 pl-2">{PRIMARY_LOWER_LEFT.map(t => <ToothButton key={t} toothFdi={t} />)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" style={{ color:'#0D7A87' }} />
            Actions récentes de l'odontogramme
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActions.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-8">
              Aucune action enregistrée pour le moment.
            </div>
          ) : (
            <div className="grid gap-3">
              {recentActions.map(item => {
                const status = STATUSES[item.status] || STATUSES.HEALTHY;
                return (
                  <div key={item.id} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg ${status.color} flex items-center justify-center text-xs font-bold shrink-0`}>
                        {item.tooth_fdi}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900">Dent {item.tooth_fdi}</span>
                          <span className="text-xs font-semibold text-slate-500">{actionLabel(item.action)}</span>
                          {item.isPending && <span className="text-xs font-bold rounded-full bg-amber-100 text-amber-700 px-2 py-0.5">Non sauvegardé</span>}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {status.label}{item.surface ? ` · Surface ${item.surface}` : ''}
                        </div>
                        {item.note && <div className="text-xs text-slate-600 mt-2 rounded-lg bg-slate-50 px-3 py-2">{item.note}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 whitespace-nowrap">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {fdatetime(item.created_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={!!selectedTooth} onClose={() => setSelectedTooth(null)}>
        <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:17, color:'#0F172A', margin:'0 0 16px', paddingRight:24 }}>
          Dent {selectedTooth}
        </h2>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div style={{ border:'1px solid #E2E8F0', borderRadius:12, background:'#F8FAFC', padding:'10px 12px' }}>
              <div style={{ fontSize:10, fontWeight:800, color:'#64748B', textTransform:'uppercase', letterSpacing:1 }}>Dernière action</div>
              <div style={{ fontSize:13, fontWeight:700, color:'#0F172A', marginTop:3 }}>
                {pendingChanges[selectedTooth]?.action_date
                  ? fdatetime(pendingChanges[selectedTooth].action_date)
                  : fdatetime(odontogram[selectedTooth]?.updated_at)}
              </div>
            </div>
            <div style={{ border:'1px solid #E2E8F0', borderRadius:12, background:'#F8FAFC', padding:'10px 12px' }}>
              <div style={{ fontSize:10, fontWeight:800, color:'#64748B', textTransform:'uppercase', letterSpacing:1 }}>Action actuelle</div>
              <div style={{ fontSize:13, fontWeight:700, color:'#0F172A', marginTop:3 }}>
                {pendingChanges[selectedTooth] ? 'Modification non sauvegardée' : 'Aucune modification en attente'}
              </div>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Statut</label>
            <select value={editForm.status} onChange={handleStatusChange} style={selectStyle} data-testid="status-select">
              {Object.entries(STATUSES).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Surface</label>
            <select value={editForm.surface} onChange={handleSurfaceChange} style={selectStyle}>
              {SURFACES.map(s => <option key={s} value={s}>{SURFACE_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Note</label>
            <textarea
              value={editForm.note}
              onChange={handleNoteChange}
              placeholder="Observations..."
              rows={3}
              style={textareaStyle}
              onFocus={e => e.target.style.borderColor='#0D7A87'}
              onBlur={e => e.target.style.borderColor='#E2E8F0'}
            />
          </div>
          {selectedHistory.length > 0 && (
            <div style={{ borderTop:'1px solid #F1F5F9', paddingTop:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, fontWeight:800, color:'#0D7A87', marginBottom:8 }}>
                <History size={14} /> Historique de cette dent
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {selectedHistory.map(item => (
                  <div key={item.id} style={{ display:'flex', justifyContent:'space-between', gap:10, padding:'8px 10px', borderRadius:10, background:'#F8FAFC', border:'1px solid #E2E8F0' }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'#0F172A' }}>{actionLabel(item.action)} · {(STATUSES[item.status] || STATUSES.HEALTHY).label}</div>
                      {item.note && <div style={{ fontSize:11, color:'#64748B', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.note}</div>}
                    </div>
                    <div style={{ fontSize:11, fontWeight:700, color:'#64748B', whiteSpace:'nowrap' }}>{fdatetime(item.created_at)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:8, borderTop:'1px solid #F1F5F9' }}>
            <Button variant="outline" onClick={() => setSelectedTooth(null)}>Annuler</Button>
            <Button onClick={handleSaveTooth} data-testid="save-tooth-btn">Appliquer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PatientOdontogram;
