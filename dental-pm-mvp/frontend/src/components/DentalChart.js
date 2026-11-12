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
  return { withCredentials: true };
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
      <button
        type="button"
        aria-label="Fermer la fenêtre"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 0,
          padding: 0,
          background: 'transparent',
          cursor: 'default',
        }}
      />
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 560,
          padding: 20,
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {(title || description) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              {title && <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>}

              <button
                type="button"
                aria-label="Fermer la fenêtre"
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

const ToothIcon = ({ fill = '#F8FAFC', stroke = '#CBD5E1' }) => (
  <svg
    viewBox="0 0 64 64"
    width="23"
    height="28"
    aria-hidden="true"
  >
    <path
      d="M20 8
         C14 8, 10 13, 10 21
         C10 28, 12 34, 15 39
         C17 42, 18 46, 18 50
         C18 55, 19 59, 22 59
         C26 59, 27 51, 28 47
         C29 43, 30 40, 32 40
         C34 40, 35 43, 36 47
         C37 51, 38 59, 42 59
         C45 59, 46 55, 46 50
         C46 46, 47 42, 49 39
         C52 34, 54 28, 54 21
         C54 13, 50 8, 44 8
         C40 8, 36 10, 32 13
         C28 10, 24 8, 20 8 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
  </svg>
);
const DentalChart = ({ patientIdOverride = null, embedded = false }) => {
  const params = useParams();
  const patientId = patientIdOverride || params.patientId || params.id;
  
  const [patient, setPatient] = useState(null);
  const [teethRecords, setTeethRecords] = useState([]);
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartError, setChartError] = useState(null);
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
  unassessed: {
    name: 'Non évaluée',
    color: '#e2e8f0'
  },
  healthy: { name: 'Saine', color: '#22c55e' },
  carious: { name: 'Cariée', color: '#ef4444' },
  filled: { name: 'Obturée', color: '#3b82f6' },
  missing: { name: 'Absente', color: '#64748b' },
  crowned: { name: 'Couronnée', color: '#f59e0b' },
  implant: { name: 'Implant', color: '#8b5cf6' },
  root_canal: { name: 'Traitement endodontique', color: '#f97316' },
  extraction_needed: { name: 'Extraction indiquée', color: '#ec4899' },
  bridge: { name: 'Bridge', color: '#06b6d4' }
};
  const generateEmptyChart = () =>
    Array.from({ length: 32 }, (_, i) => ({
      tooth_position: String(i + 1),
      // status: 'healthy',
      status: null,
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
    setChartError(null);
    try {
      const response = await axios.get(
        `${API}/patients/${patientId}/odontogram`,
        authHeaders()
      );

      const data = response.data;
      if (
        !data?.odontogram ||
        typeof data.odontogram !== 'object' ||
        Array.isArray(data.odontogram)
      ) {
        throw new Error('Réponse odontogramme invalide');
      }
      
const chartResponse = await axios.get(
  `${API}/patients/${patientId}/dental-chart`,
  authHeaders()
);

const storedRecords = chartResponse.data?.teeth_records;

if (!Array.isArray(storedRecords)) {
  throw new Error('Réponse des actes dentaires invalide');
}

const storedByPosition = new Map(
  storedRecords.map(tooth => [
    String(tooth.tooth_position),
    tooth
  ])
);
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
          ROOT_CANAL: 'root_canal',
          EXTRACTION_NEEDED: 'extraction_needed',
          BRIDGE: 'bridge'
        };

        records = generateEmptyChart().map((tooth) => {
          const num = parseInt(tooth.tooth_position, 10);
          const fdi = Object.entries(fdiToNum).find(([, n]) => n === num)?.[0];
          const od = fdi ? data.odontogram[fdi] : null;

          if (!od) return tooth;

          return {
            ...tooth,
            tooth_fdi: fdi,
            // status: statusMap[od.status] || 'healthy',
            status: statusMap[od.status] ?? null,
            procedures: [],
            notes: od.note || '',
          };
        });
      }

      // setTeethRecords(
      //   records.map((tooth) => ({
      //     ...tooth,
      //     // status: tooth.status || 'healthy',
      //     status: tooth.status ?? null,
      //     procedures: Array.isArray(tooth.procedures) ? tooth.procedures : [],
      //   }))
      // );
      
      const mergedRecords = records.map(tooth => {
        const stored = storedByPosition.get(
          String(tooth.tooth_position)
        );
      
        return {
          ...tooth,
          status: tooth.status ?? null,
          procedures: Array.isArray(stored?.procedures)
            ? stored.procedures
            : [],
          notes: tooth.notes || stored?.notes || ''
        };
      });
      
      setTeethRecords(mergedRecords);
      
      setSelectedTooth(previous => {
        if (!previous) return null;
      
        return mergedRecords.find(
          tooth =>
            String(tooth.tooth_position) ===
            String(previous.tooth_position)
        ) || null;
      });
      
      return true;
    } catch (error) {
        console.error('Erreur chargement fiche dentaire:', error);
      
        setChartError(
          'Impossible de charger les données dentaires. ' +
          'Le schéma ne peut pas être affiché de manière fiable. ' +
          'Vérifiez la connexion puis réessayez.'
        );
      return false;
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

  if (
    !procedureData.procedure_type ||
    !procedureData.procedure_name.trim()
  ) {
    toast.error('Renseignez le type et le nom de la procédure.');
    return;
  }

  try {
    const chartResponse = await axios.get(
      `${API}/patients/${patientId}/dental-chart`,
      authHeaders()
    );

    const records = chartResponse.data?.teeth_records;

    if (!Array.isArray(records)) {
      throw new Error('Dossier dentaire indisponible');
    }

    const currentTooth = records.find(
      tooth =>
        String(tooth.tooth_position) ===
        String(selectedTooth.tooth_position)
    );

    if (!currentTooth) {
      throw new Error('Dent introuvable dans la fiche');
    }

    const existingProcedures = Array.isArray(currentTooth.procedures)
      ? currentTooth.procedures
      : [];

    const newProcedure = {
      ...procedureData,
      cost_mga: parseFloat(procedureData.cost_mga) || 0
    };

    const updatedProcedures = [
      ...existingProcedures,
      newProcedure
    ];

    const response = await axios.put(
      `${API}/patients/${patientId}/dental-chart/tooth/${selectedTooth.tooth_position}`,
      {
        procedures: updatedProcedures
      },
      authHeaders()
    );

    const savedProcedures = response.data?.tooth?.procedures;

    if (
      !Array.isArray(savedProcedures) ||
      savedProcedures.length !== updatedProcedures.length
    ) {
      throw new Error('Enregistrement non confirmé');
    }

    const reloaded = await fetchDentalChart();

    if (!reloaded) {
      toast.error(
        'Procédure envoyée au serveur, mais rechargement non vérifié.'
      );
      return;
    }

    toast.success('Procédure enregistrée et rechargée.');

    setProcedureDialog(false);

    setProcedureData({
      procedure_type: '',
      procedure_name: '',
      description: '',
      cost_mga: '',
      date_performed: '',
      notes: ''
    });

  
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error(
          'Le dossier a été modifié par un autre utilisateur. Rechargez la Fiche dentaire et vérifiez les actes avant de recommencer.'
        );
        return;
      }
    
      toast.error(
        'Enregistrement non confirmé. Vérifiez le dossier avant de réessayer.'
      );
    }
};
  
const updateToothStatus = async (status) => {
  if (!selectedTooth || !status) return;

  const statusToApi = {
    healthy: 'HEALTHY',
    carious: 'CARIES',
    filled: 'FILLED',
    missing: 'MISSING',
    crowned: 'CROWN',
    implant: 'IMPLANT',
    root_canal: 'ROOT_CANAL',
    extraction_needed: 'EXTRACTION_NEEDED',
    bridge: 'BRIDGE'
  };

  const apiStatus = statusToApi[status];

  if (!apiStatus) {
    toast.error('État dentaire non reconnu');
    return;
  }

  const toothFdi = String(
    getFDINumber(selectedTooth.tooth_position)
  );

  try {
    const response = await axios.put(
      `${API}/patients/${patientId}/odontogram`,
      {
        teeth: [{
          tooth_fdi: toothFdi,
          status: apiStatus
        }]
      },
      authHeaders()
    );

    const results = response.data?.results;

    const confirmed = (
      results &&
      Number(results.created) + Number(results.updated) === 1 &&
      Number(results.skipped) === 0
    );

    if (!confirmed) {
      toast.error(
        'Enregistrement non confirmé. Vérifiez avant de réessayer.'
      );
      return;
    }

    setSelectedTooth(prev =>
      prev ? { ...prev, status } : null
    );

    toast.success('État dentaire enregistré dans l’Odontogramme');

    await fetchDentalChart();

  } catch (error) {
    toast.error(
      'Enregistrement non confirmé. Vérifiez le dossier.'
    );
  }
};

  
const renderTooth = (tooth) => {
  const status =
    toothStatuses[tooth.status] || toothStatuses.unassessed;

  const isSelected =
    selectedTooth?.tooth_position === tooth.tooth_position;

  const toothNumber = getFDINumber(tooth.tooth_position);
  const iconColor = tooth.status ? status.color : '#94A3B8';

  return (
    <button
      type="button"
      key={tooth.tooth_position}
      title={`Dent ${toothNumber} — ${status.name}`}
      aria-label={`Dent ${toothNumber} — ${status.name}`}
      aria-pressed={isSelected}
      onClick={() => setSelectedTooth(tooth)}
      style={{
        width: '100%',
        minWidth: 0,
        height: 88,
        padding: '8px 2px',
        borderRadius: 12,
        border: isSelected
          ? '2px solid #0D7A87'
          : '1px solid #DCE5EC',
        background: isSelected ? '#EAF8FA' : '#FFFFFF',
        boxShadow: isSelected
          ? '0 4px 12px rgba(13,122,135,0.16)'
          : 'none',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        font: 'inherit',
        transition: 'all 0.18s ease'
      }}
    >
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 9,
        background: isSelected ? '#D6F2F5' : '#F5F8FB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <ToothIcon
          fill="#FFFFFF"
          stroke={iconColor}
        />
      </div>

      <span style={{
        fontSize: 16,
        fontWeight: 800,
        lineHeight: 1,
        color: '#15323D'
      }}>
        {toothNumber}
      </span>

      <span style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: status.color
      }}/>
    </button>
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
  gridTemplateColumns: 'repeat(16, minmax(39px, 1fr))',
  gap: 4,
  alignItems: 'stretch',
  overflowX: 'auto',
  paddingBottom: 4,
};

const jawCardStyle = {
  background: 'linear-gradient(180deg, #F9FCFE, #F1F8FA)',
  border: '1px solid #DCE8EF',
  borderRadius: 18,
  padding: '14px 12px',
  marginBottom: 14,
};

const jawTitleStyle = {
  fontSize: 20,
  fontWeight: 800,
  color: '#15323D',
  margin: '0 0 16px',
};

const jawSubtitleStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: '#6B7C8F',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 14,
};

  if (loading) {
    return <div style={{ padding: 24 }}>Chargement...</div>;
  }
  if (chartError) {
    return (
      <div
        role="alert"
        style={{
          maxWidth: 640,
          margin: '40px auto',
          padding: 28,
          background: '#FFF7ED',
          border: '1px solid #FED7AA',
          borderRadius: 16,
          textAlign: 'center'
        }}
      >
        <h2 style={{
          color: '#9A3412',
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 12
        }}>
          Données dentaires indisponibles
        </h2>
  
        <p style={{
          color: '#9A3412',
          lineHeight: 1.6,
          marginBottom: 20
        }}>
          {chartError}
        </p>
  
        <Button
          onClick={() => {
            setLoading(true);
            fetchDentalChart();
          }}
        >
          Réessayer le chargement
        </Button>
  
        <p style={{
          color: '#64748B',
          fontSize: 12,
          marginTop: 16
        }}>
          Aucune modification des données du patient
          n'a été effectuée.
        </p>
      </div>
    );
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

<div style={{
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
  width: '100%',
  minWidth: 0
}}>

  {/* ================= ODONTOGRAMME ================= */}
  <Card>
    <CardContent style={{ padding: 20 }}>

      {/* En-tête */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            background: '#E6F7F8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ToothIcon
              fill="#FFFFFF"
              stroke="#0D7A87"
            />
          </div>

          <div>
            <div style={{
              fontSize: 20,
              fontWeight: 800,
              color: '#15323D'
            }}>
              Odontogramme permanent
            </div>
            <div style={{
              fontSize: 12,
              color: '#64748B',
              marginTop: 3
            }}>
              Cliquez sur une dent pour consulter son état
            </div>
          </div>
        </div>

        <span style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#0D7A87',
          background: '#E6F7F8',
          padding: '7px 12px',
          borderRadius: 20
        }}>
          32 dents · FDI
        </span>
      </div>

      {/* Mâchoire supérieure */}
      <section style={{
        padding: '16px 14px',
        borderRadius: 15,
        background: '#F8FBFC',
        border: '1px solid #E2EBF0',
        marginBottom: 14
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 13
        }}>
          <div style={{
            fontSize: 16,
            fontWeight: 800,
            color: '#15323D'
          }}>
            Mâchoire supérieure
          </div>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#64748B'
          }}>
            16 dents
          </span>
        </div>

        <div style={toothRowStyle}>
          {upperTeeth.map(renderTooth)}
        </div>
      </section>

      {/* Mâchoire inférieure */}
      <section style={{
        padding: '16px 14px',
        borderRadius: 15,
        background: '#F8FBFC',
        border: '1px solid #E2EBF0',
        marginBottom: 16
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 13
        }}>
          <div style={{
            fontSize: 16,
            fontWeight: 800,
            color: '#15323D'
          }}>
            Mâchoire inférieure
          </div>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#64748B'
          }}>
            16 dents
          </span>
        </div>

        <div style={toothRowStyle}>
          {lowerTeeth.map(renderTooth)}
        </div>
      </section>

      {/* Légende clinique */}
      <div style={{
        borderTop: '1px solid #E2E8F0',
        paddingTop: 14
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#15323D',
          marginBottom: 10
        }}>
          Légende clinique
        </div>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '9px 15px'
        }}>
          {Object.entries(toothStatuses).map(([key, status]) => (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: status.color,
                flexShrink: 0
              }} />

              <span style={{
                fontSize: 12,
                color: '#475569'
              }}>
                {status.name}
              </span>
            </div>
          ))}
        </div>
      </div>

    </CardContent>
  </Card>

  {/* ================= DÉTAILS CLINIQUES ================= */}
  <Card>
    <CardContent style={{ padding: 20 }}>

      {/* En-tête du panneau */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: selectedTooth ? 18 : 0
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            background: '#E6F7F8',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <ToothIcon
              fill="#FFFFFF"
              stroke="#0D7A87"
            />
          </div>

          <div>
            <div style={{
              fontSize: 18,
              fontWeight: 800,
              color: '#15323D'
            }}>
              {selectedTooth
                ? `Dent ${getFDINumber(selectedTooth.tooth_position)}`
                : 'Sélectionnez une dent'}
            </div>

            <div style={{
              fontSize: 12,
              color: '#64748B',
              marginTop: 3
            }}>
              {selectedTooth
                ? 'État clinique et interventions'
                : 'Cliquez sur une dent dans le schéma ci-dessus'}
            </div>
          </div>
        </div>

        {selectedTooth && (
          <span style={{
            padding: '6px 12px',
            borderRadius: 20,
            background: '#E6F7F8',
            color: '#0D7A87',
            fontSize: 12,
            fontWeight: 700
          }}>
            FDI {getFDINumber(selectedTooth.tooth_position)}
          </span>
        )}
      </div>

      {/* Informations seulement si une dent est sélectionnée */}
      {selectedTooth && (
        <div style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: 16,
          alignItems: 'start'
        }}>

          {/* COLONNE 1 : ÉTAT CLINIQUE */}
          <section style={{
            padding: 18,
            background: '#F8FBFC',
            border: '1px solid #E2EBF0',
            borderRadius: 15
          }}>
            <div style={{
              fontSize: 15,
              fontWeight: 800,
              color: '#15323D',
              marginBottom: 14
            }}>
              État clinique
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '12px 14px',
              border: '1px solid #E2EBF0',
              borderRadius: 11,
              background: '#FFFFFF',
              marginBottom: 18
            }}>
              <span style={{
                width: 11,
                height: 11,
                borderRadius: '50%',
                background:
                  toothStatuses[selectedTooth.status]?.color
                  || '#CBD5E1'
              }} />

              <div>
                <div style={{
                  fontSize: 11,
                  color: '#64748B',
                  marginBottom: 3
                }}>
                  Statut actuel
                </div>

                <div style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#15323D'
                }}>
                  {toothStatuses[selectedTooth.status]?.name
                    || 'Non évaluée'}
                </div>
              </div>
            </div>

            <Label htmlFor="dental-chart-status">
              Modifier le statut
            </Label>

            <select
              key={selectedTooth.tooth_position}
              id="dental-chart-status"
              defaultValue=""
              onChange={(e) => updateToothStatus(e.target.value)}
              style={{
                width: '100%',
                minHeight: 44,
                marginTop: 8,
                padding: '10px 12px',
                border: '1px solid #CBD5E1',
                borderRadius: 10,
                background: '#FFFFFF',
                color: '#15323D',
                fontSize: 13,
                fontFamily: 'inherit'
              }}
            >
              <option value="" disabled>
                Choisir un nouveau statut...
              </option>

              {Object.entries(toothStatuses)
                .filter(([key]) => key !== 'unassessed')
                .map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.name}
                  </option>
                ))}
            </select>
          </section>

          {/* COLONNE 2 : PROCÉDURES */}
          <section style={{
            padding: 18,
            background: '#F8FBFC',
            border: '1px solid #E2EBF0',
            borderRadius: 15
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 15
            }}>
              <div style={{
                fontSize: 15,
                fontWeight: 800,
                color: '#15323D'
              }}>
                Procédures ({(selectedTooth.procedures || []).length})
              </div>

              <Button
                size="sm"
                onClick={() => setProcedureDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </div>

            {(selectedTooth.procedures || []).length === 0 ? (
              <div style={{
                padding: '18px 12px',
                background: '#FFFFFF',
                border: '1px dashed #CBD5E1',
                borderRadius: 12,
                textAlign: 'center',
                color: '#64748B',
                fontSize: 13
              }}>
                Aucune procédure enregistrée
              </div>
            ) : (
              (selectedTooth.procedures || []).map((procedure, index) => (
                <div
                  key={index}
                  style={{
                    padding: 14,
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    marginBottom: 10
                  }}
                >
                  <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#15323D'
                  }}>
                    {procedureTypes[procedure.procedure_type]?.name
                      || procedure.procedure_type}
                  </div>

                  <div style={{
                    fontSize: 13,
                    color: '#475569',
                    marginTop: 6
                  }}>
                    {procedure.procedure_name}
                  </div>

                  {procedure.cost_mga > 0 && (
                    <div style={{
                      fontSize: 12,
                      color: '#0D7A87',
                      fontWeight: 700,
                      marginTop: 8
                    }}>
                      {new Intl.NumberFormat('fr-MG').format(
                        procedure.cost_mga
                      )} Ar
                    </div>
                  )}

                  {procedure.date_performed && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      color: '#64748B',
                      fontSize: 12,
                      marginTop: 8
                    }}>
                      <Calendar size={14} />
                      {new Date(
                        procedure.date_performed
                      ).toLocaleDateString('fr-FR')}
                    </div>
                  )}

                  {procedure.description && (
                    <div style={{
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: '#64748B',
                      marginTop: 8
                    }}>
                      {procedure.description}
                    </div>
                  )}
                </div>
              ))
            )}
          </section>
        </div>
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
            <Label htmlFor="dental-procedure-type">Type</Label>
            <select
              id="dental-procedure-type"
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
