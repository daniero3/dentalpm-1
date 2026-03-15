import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Save, Activity, Calendar } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

const DentalChart = () => {
  const { patientId } = useParams();
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [teethRecords, setTeethRecords] = useState([]);
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [procedureDialog, setProcedureDialog] = useState(false);
  const [procedureData, setProcedureData] = useState({
    procedure_type: '', procedure_name: '', description: '',
    cost_mga: '', date_performed: '', notes: ''
  });

  const procedureTypes = {
    restoration:  { name: 'Restauration',   color: '#3b82f6' },
    prosthetics:  { name: 'Prothèse',       color: '#8b5cf6' },
    odf:          { name: 'Orthodontie',    color: '#06b6d4' },
    periodontics: { name: 'Parodontologie', color: '#22c55e' },
    surgery:      { name: 'Chirurgie',      color: '#f97316' },
    prevention:   { name: 'Prévention',     color: '#84cc16' },
    endodontics:  { name: 'Endodontie',     color: '#ef4444' }
  };

  const toothStatuses = {
    healthy:  { name: 'Saine',     color: '#22c55e' },
    carious:  { name: 'Cariée',    color: '#ef4444' },
    filled:   { name: 'Obturée',   color: '#3b82f6' },
    missing:  { name: 'Absente',   color: '#64748b' },
    crowned:  { name: 'Couronnée', color: '#f59e0b' },
    implant:  { name: 'Implant',   color: '#8b5cf6' }
  };

  // Génère un schéma vide 32 dents si l'API échoue
  const generateEmptyChart = () =>
    Array.from({ length: 32 }, (_, i) => ({
      tooth_position: String(i + 1),
      status: 'healthy',
      procedures: [],
      notes: ''
    }));

  useEffect(() => {
    if (!patientId || patientId === 'undefined') {
      setLoading(false);
      return;
    }
    fetchPatientData();
    fetchDentalChart();
  }, [patientId]);

  const fetchPatientData = async () => {
    if (!patientId || patientId === 'undefined') return;
    try {
      const res = await axios.get(`${API}/patients/${patientId}`, authHeaders());
      setPatient(res.data);
    } catch (err) {
      console.error('Patient load error:', err);
    }
  };

  const fetchDentalChart = async () => {
    try {
      // Utiliser l'API odontogramme qui existe dans le backend
      const res = await axios.get(`${API}/patients/${patientId}/odontogram`, authHeaders());
      const data = res.data;

      let records = [];

      if (data?.odontogram && typeof data.odontogram === 'object') {
        // Format FDI → numéroté 1-32
        const fdiToNum = {
          '18':1,'17':2,'16':3,'15':4,'14':5,'13':6,'12':7,'11':8,
          '21':9,'22':10,'23':11,'24':12,'25':13,'26':14,'27':15,'28':16,
          '48':17,'47':18,'46':19,'45':20,'44':21,'43':22,'42':23,'41':24,
          '31':25,'32':26,'33':27,'34':28,'35':29,'36':30,'37':31,'38':32,
        };
        const statusMap = {
          HEALTHY:'healthy', CARIES:'carious', FILLED:'filled',
          MISSING:'missing', CROWN:'crowned', IMPLANT:'implant',
          ROOT_CANAL:'filled', EXTRACTION_NEEDED:'carious', BRIDGE:'crowned'
        };
        records = generateEmptyChart().map(tooth => {
          const num = parseInt(tooth.tooth_position);
          const fdi = Object.entries(fdiToNum).find(([f, n]) => n === num)?.[0];
          const od = fdi ? data.odontogram[fdi] : null;
          if (od) {
            return { ...tooth, tooth_fdi: fdi, status: statusMap[od.status] || 'healthy', procedures: [], notes: od.note || '' };
          }
          return tooth;
        });
      } else {
        records = generateEmptyChart();
      }

      setTeethRecords(records.map(t => ({
        ...t,
        status: t.status || 'healthy',
        procedures: Array.isArray(t.procedures) ? t.procedures : []
      })));
    } catch (err) {
      console.error('Dental chart error:', err);
      // Schéma vide sans toast d'erreur
      setTeethRecords(generateEmptyChart());
    } finally {
      setLoading(false);
    }
  };

  const addProcedure = async () => {
    if (!selectedTooth) return;
    try {
      const updatedTooth = {
        ...selectedTooth,
        procedures: [...selectedTooth.procedures, {
          ...procedureData,
          cost_mga: parseFloat(procedureData.cost_mga) || 0
        }]
      };
      await axios.put(
        `${API}/patients/${patientId}/dental-chart/tooth/${selectedTooth.tooth_position}`,
        updatedTooth, authHeaders()
      );
      toast.success('Procédure ajoutée');
      await fetchDentalChart();
      setProcedureDialog(false);
      setProcedureData({ procedure_type: '', procedure_name: '', description: '', cost_mga: '', date_performed: '', notes: '' });
    } catch (err) {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const updateToothStatus = async (status) => {
    if (!selectedTooth || !status) return;
    try {
      await axios.put(
        `${API}/patients/${patientId}/dental-chart/tooth/${selectedTooth.tooth_position}`,
        { ...selectedTooth, status }, authHeaders()
      );
      toast.success('Statut mis à jour');
      setSelectedTooth(prev => ({ ...prev, status }));
      await fetchDentalChart();
    } catch (err) {
      toast.error('Erreur mise à jour');
    }
  };

  const renderTooth = (t) => {
    const status = toothStatuses[t.status] || toothStatuses.healthy;
    const isSelected = selectedTooth?.tooth_position === t.tooth_position;
    return (
      <div
        key={t.tooth_position}
        onClick={() => setSelectedTooth(t)}
        style={{ cursor: 'pointer', transition: 'transform 0.15s ease', textAlign: 'center' }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <svg width="36" height="46" viewBox="0 0 40 50">
          <path
            d="M20 5 C12 5, 8 12, 8 20 C8 35, 12 42, 20 45 C28 42, 32 35, 32 20 C32 12, 28 5, 20 5 Z"
            fill={status.color}
            stroke={isSelected ? '#0D7A87' : '#374151'}
            strokeWidth={isSelected ? 3 : 1.5}
            opacity="0.9"
          />
          {t.status !== 'healthy' && (
            <circle cx="32" cy="8" r="4" fill="#ef4444" stroke="white" strokeWidth="1" />
          )}
          {(t.procedures || []).length > 0 && (
            <circle cx="8" cy="8" r="4" fill="#0D7A87" stroke="white" strokeWidth="1" />
          )}
        </svg>
        <div style={{
          fontSize: 10, fontWeight: 700, marginTop: 2,
          color: isSelected ? '#0D7A87' : '#374151'
        }}>
          {t.tooth_position}
        </div>
      </div>
    );
  };

  const upperTeeth = teethRecords
    .filter(t => parseInt(t.tooth_position) >= 1 && parseInt(t.tooth_position) <= 16)
    .sort((a, b) => parseInt(a.tooth_position) - parseInt(b.tooth_position));

  const lowerTeeth = teethRecords
    .filter(t => parseInt(t.tooth_position) >= 17 && parseInt(t.tooth_position) <= 32)
    .sort((a, b) => parseInt(a.tooth_position) - parseInt(b.tooth_position));

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #E2E8F0', borderTopColor: '#0D7A87', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/patients">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Retour</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" style={{ color: '#0D7A87' }} />
            Fiche Dentaire
          </h1>
          {patient && (
            <p className="text-gray-500">
              {patient.first_name} {patient.last_name}
              {patient.date_of_birth && ` — ${new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()} ans`}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Schéma */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Schéma Dentaire</CardTitle>
            <CardDescription>Cliquez sur une dent pour voir les détails</CardDescription>
          </CardHeader>
          <CardContent>
            {teethRecords.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#94A3B8' }}>
                <Activity style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.3 }} />
                <p>Aucune donnée dentaire</p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textAlign: 'center', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Mâchoire Supérieure
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap', marginBottom: 8 }}>
                  {upperTeeth.map(renderTooth)}
                </div>
                <div style={{ height: 1, background: 'linear-gradient(to right, transparent, #E2E8F0 20%, #E2E8F0 80%, transparent)', margin: '8px 0 16px' }} />
                <p style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textAlign: 'center', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Mâchoire Inférieure
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
                  {lowerTeeth.map(renderTooth)}
                </div>
              </div>
            )}

            {/* Légende */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #F1F5F9' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginBottom: 10 }}>Légende :</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {Object.entries(toothStatuses).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: v.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#475569' }}>{v.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Détails */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" style={{ color: '#0D7A87' }} />
              {selectedTooth ? `Dent ${selectedTooth.tooth_position}` : 'Sélectionnez une dent'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTooth ? (
              <>
                {/* Statut */}
                <div>
                  <Label>Statut actuel</Label>
                  <div style={{ marginTop: 6 }}>
                    <span style={{
                      display: 'inline-block', padding: '3px 12px', borderRadius: 99,
                      background: (toothStatuses[selectedTooth.status]?.color || '#64748b') + '22',
                      color: toothStatuses[selectedTooth.status]?.color || '#64748b',
                      fontWeight: 700, fontSize: 12,
                      border: `1.5px solid ${(toothStatuses[selectedTooth.status]?.color || '#64748b')}44`
                    }}>
                      {toothStatuses[selectedTooth.status]?.name || selectedTooth.status}
                    </span>
                  </div>
                </div>

                {/* Changer statut */}
                <div>
                  <Label>Changer le statut</Label>
                  <select
                    onChange={e => updateToothStatus(e.target.value)}
                    defaultValue=""
                    style={{ width: '100%', marginTop: 6, padding: '8px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: '#0F172A' }}
                  >
                    <option value="">Nouveau statut...</option>
                    {Object.entries(toothStatuses).map(([k, v]) => (
                      <option key={k} value={k}>{v.name}</option>
                    ))}
                  </select>
                </div>

                {/* Procédures */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Label>Procédures ({(selectedTooth.procedures || []).length})</Label>
                    <Dialog open={procedureDialog} onOpenChange={setProcedureDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Nouvelle Procédure — Dent {selectedTooth.tooth_position}</DialogTitle>
                          <DialogDescription>Ajoutez une procédure pour cette dent</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Type</Label>
                            <select value={procedureData.procedure_type} onChange={e => setProcedureData({ ...procedureData, procedure_type: e.target.value })}
                              style={{ width: '100%', marginTop: 6, padding: '8px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#fff', fontSize: 13 }}>
                              <option value="">Sélectionner...</option>
                              {Object.entries(procedureTypes).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <Label>Nom</Label>
                            <Input value={procedureData.procedure_name} onChange={e => setProcedureData({ ...procedureData, procedure_name: e.target.value })} placeholder="Ex: Amalgame, Couronne..." />
                          </div>
                          <div>
                            <Label>Coût (MGA)</Label>
                            <Input type="number" value={procedureData.cost_mga} onChange={e => setProcedureData({ ...procedureData, cost_mga: e.target.value })} placeholder="50000" />
                          </div>
                          <div>
                            <Label>Date</Label>
                            <Input type="date" value={procedureData.date_performed} onChange={e => setProcedureData({ ...procedureData, date_performed: e.target.value })} />
                          </div>
                          <div>
                            <Label>Description</Label>
                            <Textarea value={procedureData.description} onChange={e => setProcedureData({ ...procedureData, description: e.target.value })} rows={2} />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setProcedureDialog(false)}>Annuler</Button>
                            <Button onClick={addProcedure}><Save className="h-4 w-4 mr-2" />Enregistrer</Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div style={{ maxHeight: 200, overflowY: 'auto' }} className="space-y-2">
                    {(selectedTooth.procedures || []).length === 0 ? (
                      <p style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>Aucune procédure</p>
                    ) : (
                      (selectedTooth.procedures || []).map((proc, i) => (
                        <div key={i} style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: procedureTypes[proc.procedure_type]?.color || '#64748B', textTransform: 'uppercase' }}>
                              {procedureTypes[proc.procedure_type]?.name || proc.procedure_type}
                            </span>
                            {proc.cost_mga > 0 && (
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#0D7A87' }}>
                                {new Intl.NumberFormat('fr-MG').format(proc.cost_mga)} MGA
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0 }}>{proc.procedure_name}</p>
                          {proc.date_performed && (
                            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                              <Calendar style={{ width: 10, height: 10, display: 'inline', marginRight: 4 }} />
                              {new Date(proc.date_performed).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                          {proc.description && <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{proc.description}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <Activity style={{ width: 40, height: 40, color: '#E2E8F0', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 13, color: '#94A3B8' }}>Cliquez sur une dent pour voir les détails</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DentalChart;
