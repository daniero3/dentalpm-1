import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Save, Calendar, X } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

const authHeaders = () => {
  const token = localStorage.getItem('token');

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

const NUM_TO_FDI = {
  '1': '18', '2': '17', '3': '16', '4': '15', '5': '14', '6': '13', '7': '12', '8': '11',
  '9': '21', '10': '22', '11': '23', '12': '24', '13': '25', '14': '26', '15': '27', '16': '28',
  '17': '48', '18': '47', '19': '46', '20': '45', '21': '44', '22': '43', '23': '42', '24': '41',
  '25': '31', '26': '32', '27': '33', '28': '34', '29': '35', '30': '36', '31': '37', '32': '38',
};

const getFDINumber = (toothPosition) => {
  return NUM_TO_FDI[String(toothPosition)] || toothPosition;
};

const Modal = ({ open, onClose, title, description, children }) => {
  if (!open) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 560,
          padding: 20,
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)',
        }}
      >
        {(title || description) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              {title && <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>}

              <button
                type="button"
                onClick={onClose}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#0f172a',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {description && (
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                {description}
              </p>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  );
};

const PatientOdontogram = ({ patientIdOverride = null, embedded = false }) => {
  const params = useParams();
  const patientId = patientIdOverride || params.patientId || params.id;
  
  const [patient, setPatient] = useState(null);
  const [teethRecords, setTeethRecords] = useState([]);
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [procedureDialog, setProcedureDialog] = useState(false);

  const [procedureData, setProcedureData] = useState({
    procedure_type: '',
    procedure_name: '',
    description: '',
    cost_mga: '',
    date_performed: '',
    notes: '',
  });

  const procedureTypes = {
    restoration: { name: 'Restauration', color: '#3b82f6' },
    prosthetics: { name: 'Prothèse', color: '#8b5cf6' },
    odf: { name: 'Orthodontie', color: '#06b6d4' },
    periodontics: { name: 'Parodontologie', color: '#22c55e' },
    surgery: { name: 'Chirurgie', color: '#f97316' },
    prevention: { name: 'Prévention', color: '#84cc16' },
    endodontics: { name: 'Endodontie', color: '#ef4444' },
  };

  const toothStatuses = {
    healthy: { name: 'Saine', color: '#22c55e' },
    carious: { name: 'Cariée', color: '#ef4444' },
    filled: { name: 'Obturée', color: '#3b82f6' },
    missing: { name: 'Absente', color: '#64748b' },
    crowned: { name: 'Couronnée', color: '#f59e0b' },
    implant: { name: 'Implant', color: '#8b5cf6' },
  };

  const generateEmptyChart = () =>
    Array.from({ length: 32 }, (_, i) => ({
      tooth_position: String(i + 1),
      status: 'healthy',
      procedures: [],
      notes: '',
    }));

  const fetchPatientData = async () => {
    if (!patientId || patientId === 'undefined') return;

    try {
      const response = await axios.get(`${API}/patients/${patientId}`, authHeaders());
      setPatient(response.data);
    } catch (error) {
      console.error('Patient load error:', error);
    }
  };

  const fetchDentalChart = async () => {
    try {
      const response = await axios.get(
        `${API}/patients/${patientId}/odontogram`,
        authHeaders()
      );

      const data = response.data;
      let records = generateEmptyChart();

      if (data?.odontogram && typeof data.odontogram === 'object') {
        const fdiToNum = {
          '18': 1, '17': 2, '16': 3, '15': 4, '14': 5, '13': 6, '12': 7, '11': 8,
          '21': 9, '22': 10, '23': 11, '24': 12, '25': 13, '26': 14, '27': 15, '28': 16,
          '48': 17, '47': 18, '46': 19, '45': 20, '44': 21, '43': 22, '42': 23, '41': 24,
          '31': 25, '32': 26, '33': 27, '34': 28, '35': 29, '36': 30, '37': 31, '38': 32,
        };

        const statusMap = {
          HEALTHY: 'healthy',
          CARIES: 'carious',
          FILLED: 'filled',
          MISSING: 'missing',
          CROWN: 'crowned',
          IMPLANT: 'implant',
          ROOT_CANAL: 'filled',
          EXTRACTION_NEEDED: 'carious',
          BRIDGE: 'crowned',
        };

        records = generateEmptyChart().map((tooth) => {
          const num = parseInt(tooth.tooth_position, 10);
          const fdi = Object.entries(fdiToNum).find(([, n]) => n === num)?.[0];
          const od = fdi ? data.odontogram[fdi] : null;

          if (!od) return tooth;

          return {
            ...tooth,
            tooth_fdi: fdi,
            status: statusMap[od.status] || 'healthy',
            procedures: [],
            notes: od.note || '',
          };
        });
      }

      setTeethRecords(
        records.map((tooth) => ({
          ...tooth,
          status: tooth.status || 'healthy',
          procedures: Array.isArray(tooth.procedures) ? tooth.procedures : [],
        }))
      );
    } catch (error) {
      console.error('Dental chart error:', error);
      setTeethRecords(generateEmptyChart());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!patientId || patientId === 'undefined') {
      setLoading(false);
      return;
    }

    fetchPatientData();
    fetchDentalChart();
  }, [patientId]);

  const addProcedure = async () => {
    if (!selectedTooth) return;

    try {
      const updatedTooth = {
        ...selectedTooth,
        procedures: [
          ...(selectedTooth.procedures || []),
          {
            ...procedureData,
            cost_mga: parseFloat(procedureData.cost_mga) || 0,
          },
        ],
      };

      await axios.put(
        `${API}/patients/${patientId}/dental-chart/tooth/${selectedTooth.tooth_position}`,
        updatedTooth,
        authHeaders()
      );

      toast.success('Procédure ajoutée');
      await fetchDentalChart();
      setProcedureDialog(false);

      setProcedureData({
        procedure_type: '',
        procedure_name: '',
        description: '',
        cost_mga: '',
        date_performed: '',
        notes: '',
      });
    } catch (error) {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const updateToothStatus = async (status) => {
    if (!selectedTooth || !status) return;

    try {
      await axios.put(
        `${API}/patients/${patientId}/dental-chart/tooth/${selectedTooth.tooth_position}`,
        { ...selectedTooth, status },
        authHeaders()
      );

      toast.success('Statut mis à jour');
      setSelectedTooth((prev) => ({ ...prev, status }));
      await fetchDentalChart();
    } catch (error) {
      toast.error('Erreur mise à jour');
    }
  };

  const renderTooth = (tooth) => {
    const status = toothStatuses[tooth.status] || toothStatuses.healthy;
    const isSelected = selectedTooth?.tooth_position === tooth.tooth_position;

    return (
      <div
        key={tooth.tooth_position}
        onClick={() => setSelectedTooth(tooth)}
        style={{
          cursor: 'pointer',
          textAlign: 'center',
          padding: '6px 4px',
          borderRadius: 10,
          border: isSelected ? '2px solid #0f172a' : '1px solid #e2e8f0',
          background: '#ffffff',
          minWidth: 0,
          width: '100%',
        }}
      >
        <div
          style={{
            width: 28,
            height: 36,
            borderRadius: '50% 50% 45% 45%',
            background: status.color,
            margin: '0 auto 5px',
            opacity: tooth.status === 'healthy' ? 0.35 : 0.85,
          }}
        />

        <div style={{ fontSize: 11, fontWeight: 700 }}>
          {getFDINumber(tooth.tooth_position)}
        </div>
      </div>
    );
  };

  const upperTeeth = teethRecords
    .filter((tooth) => {
      const position = parseInt(tooth.tooth_position, 10);
      return position >= 1 && position <= 16;
    })
    .sort((a, b) => parseInt(a.tooth_position, 10) - parseInt(b.tooth_position, 10));

  const lowerTeeth = teethRecords
    .filter((tooth) => {
      const position = parseInt(tooth.tooth_position, 10);
      return position >= 17 && position <= 32;
    })
    .sort((a, b) => parseInt(a.tooth_position, 10) - parseInt(b.tooth_position, 10));

  const toothRowStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(16, minmax(34px, 1fr))',
    gap: 6,
    marginBottom: 24,
    alignItems: 'center',
    overflowX: 'auto',
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Chargement...</div>;
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        {!embedded && (
        <Link to="/patients">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
        )}

        <h1 style={{ fontSize: 26, fontWeight: 800, marginTop: 16 }}>
          Fiche Dentaire
        </h1>

        {patient && (
          <p style={{ color: '#64748b' }}>
            {patient.first_name} {patient.last_name}
            {patient.date_of_birth &&
              ` — ${new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()} ans`}
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <Card>
          <CardHeader>
            <CardTitle>Schéma Dentaire</CardTitle>
            <CardDescription>Cliquez sur une dent pour voir les détails</CardDescription>
          </CardHeader>

          <CardContent>
            <h3 style={{ fontWeight: 700, marginBottom: 10 }}>Mâchoire Supérieure</h3>
            <div style={toothRowStyle}>
              {upperTeeth.map(renderTooth)}
            </div>

            <h3 style={{ fontWeight: 700, marginBottom: 10 }}>Mâchoire Inférieure</h3>
            <div style={toothRowStyle}>
              {lowerTeeth.map(renderTooth)}
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
              <strong>Légende :</strong>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
                {Object.entries(toothStatuses).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: value.color,
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ fontSize: 13 }}>{value.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedTooth
                ? `Dent ${getFDINumber(selectedTooth.tooth_position)}`
                : 'Sélectionnez une dent'}
            </CardTitle>
          </CardHeader>

          <CardContent>
            {selectedTooth ? (
              <>
                <Label>Statut actuel</Label>
                <p style={{ marginTop: 6, marginBottom: 12 }}>
                  {toothStatuses[selectedTooth.status]?.name || selectedTooth.status}
                </p>

                <Label>Changer le statut</Label>
                <select
                  onChange={(e) => updateToothStatus(e.target.value)}
                  defaultValue=""
                  style={{
                    width: '100%',
                    marginTop: 6,
                    marginBottom: 18,
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <option value="" disabled>
                    Nouveau statut...
                  </option>

                  {Object.entries(toothStatuses).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.name}
                    </option>
                  ))}
                </select>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>Procédures ({(selectedTooth.procedures || []).length})</strong>

                  <Button size="sm" onClick={() => setProcedureDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                </div>

                {(selectedTooth.procedures || []).length === 0 ? (
                  <p style={{ marginTop: 12, color: '#64748b' }}>
                    Aucune procédure
                  </p>
                ) : (
                  (selectedTooth.procedures || []).map((procedure, index) => (
                    <div
                      key={index}
                      style={{
                        marginTop: 12,
                        padding: 12,
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                      }}
                    >
                      <strong>
                        {procedureTypes[procedure.procedure_type]?.name || procedure.procedure_type}
                      </strong>

                      <p>{procedure.procedure_name}</p>

                      {procedure.cost_mga > 0 && (
                        <p>{new Intl.NumberFormat('fr-MG').format(procedure.cost_mga)} MGA</p>
                      )}

                      {procedure.date_performed && (
                        <p>
                          <Calendar className="h-4 w-4 inline mr-1" />
                          {new Date(procedure.date_performed).toLocaleDateString('fr-FR')}
                        </p>
                      )}

                      {procedure.description && <p>{procedure.description}</p>}
                    </div>
                  ))
                )}
              </>
            ) : (
              <p style={{ color: '#64748b' }}>
                Cliquez sur une dent pour voir les détails
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={procedureDialog}
        onClose={() => setProcedureDialog(false)}
        title={`Nouvelle Procédure — Dent ${
          selectedTooth ? getFDINumber(selectedTooth.tooth_position) : ''
        }`}
        description="Ajoutez une procédure pour cette dent"
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <Label>Type</Label>
            <select
              value={procedureData.procedure_type}
              onChange={(e) =>
                setProcedureData({ ...procedureData, procedure_type: e.target.value })
              }
              style={{
                width: '100%',
                marginTop: 6,
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
              }}
            >
              <option value="">Sélectionner...</option>

              {Object.entries(procedureTypes).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Nom</Label>
            <Input
              value={procedureData.procedure_name}
              onChange={(e) =>
                setProcedureData({ ...procedureData, procedure_name: e.target.value })
              }
              placeholder="Ex: Amalgame, Couronne..."
            />
          </div>

          <div>
            <Label>Coût (MGA)</Label>
            <Input
              value={procedureData.cost_mga}
              onChange={(e) =>
                setProcedureData({ ...procedureData, cost_mga: e.target.value })
              }
              placeholder="50000"
            />
          </div>

          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={procedureData.date_performed}
              onChange={(e) =>
                setProcedureData({ ...procedureData, date_performed: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={procedureData.description}
              onChange={(e) =>
                setProcedureData({ ...procedureData, description: e.target.value })
              }
              rows={2}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              borderTop: '1px solid #e2e8f0',
              paddingTop: 12,
            }}
          >
            <Button variant="outline" onClick={() => setProcedureDialog(false)}>
              Annuler
            </Button>

            <Button onClick={addProcedure}>
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DentalChart;
