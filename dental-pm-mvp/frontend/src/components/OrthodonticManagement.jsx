import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, CreditCard, FilePlus2, Search, Smile, Wallet, X } from 'lucide-react';
import { useAuth } from '../App';
import PatientSearchPicker from './PatientSearchPicker';
import './OrthodonticManagement.css';

const API = process.env.REACT_APP_BACKEND_URL
  ? process.env.REACT_APP_BACKEND_URL + '/api'
  : typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8001/api' : '/api';
const auth = () => ({ withCredentials: true });
const amount = value => new Intl.NumberFormat('fr-MG').format(Number(value || 0)) + ' Ar';
const today = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone:'Indian/Antananarivo', year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(new Date());
  const d = Object.fromEntries(parts.map(part => [part.type,part.value]));
  return d.year + '-' + d.month + '-' + d.day;
};
const modeLabel = { FORFAIT:'Forfait global', MONTHLY:'Honoraires mensuels' };
const typeLabel = { FIXED:'Appareil fixe', ALIGNERS:'Aligneurs', REMOVABLE:'Amovible', MIXED:'Mixte', OTHER:'Autre' };
const caseLabel = { ACTIVE:'Actif', PLANNED:'Planifié', PAUSED:'Suspendu', COMPLETED:'Terminé', CANCELLED:'Arrêté' };
const dueLabel = { PAID:'Payée', PARTIAL:'Partielle', OVERDUE:'En retard', PENDING:'À échéance', UNBILLED:'Non facturée' };
const C = { teal:'#0D7A87', ink:'#15323D', muted:'#64748B', border:'#E0E8EE', bg:'#F8FBFC' };
const panel = { border:'1px solid ' + C.border, borderRadius:16, padding:18, background:'#fff' };
const input = { width:'100%', minHeight:42, border:'1px solid #CBD5E1', borderRadius:10, padding:'9px 11px', font:'inherit', fontSize:13, color:C.ink, boxSizing:'border-box', background:'#fff' };
const label = { fontSize:12, fontWeight:700, color:'#475569', display:'block', marginBottom:6 };
const btn = { background:C.teal, color:'#fff', border:0, borderRadius:10, padding:'10px 14px', cursor:'pointer', fontSize:13, fontWeight:700, display:'inline-flex', gap:7, alignItems:'center', justifyContent:'center' };
const subtle = { ...btn, background:'#F0F8FA', color:C.teal, border:'1px solid #BCE5E9' };
const renderName = record => record?.patient
  ? [record.patient.first_name, record.patient.last_name].filter(Boolean).join(' ')
  : 'Patient indisponible';

const displayCivilDate = value => {
  const text = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? text.slice(8,10) + '/' + text.slice(5,7) + '/' + text.slice(0,4)
    : '—';
};


function Badge({ children, tone = 'neutral' }) {
  const palette = tone === 'red' ? ['#FEF2F2','#B91C1C'] : tone === 'green' ? ['#ECFDF5','#047857'] : tone === 'teal' ? ['#E7F7F9','#0D7A87'] : ['#F1F5F9','#475569'];
  return <span style={{ padding:'4px 9px', borderRadius:99, background:palette[0], color:palette[1], fontSize:11, fontWeight:750, whiteSpace:'nowrap' }}>{children}</span>;
}

function FinanceStatus({ record }) {
  if (!record.finance) return <Badge>Situation non disponible</Badge>;
  if (Number(record.finance.overdue_mga || 0) > 0) {
    return <Badge tone="red">{amount(record.finance.overdue_mga)} en retard</Badge>;
  }
  if (Number(record.finance.unbilled_due_periods || 0) > 0) {
    return <Badge>Facturation à rapprocher</Badge>;
  }
  return <Badge tone="green">Aucun retard identifié</Badge>;
}

// Fenêtre ODF — harmonie visuelle avec « Nouveau patient ».
const odfModal = {
  overlay: {
    position:'fixed', inset:0, zIndex:20000,
    background:'rgba(15,23,42,.55)',
    padding:'14px', boxSizing:'border-box',
    display:'flex', alignItems:'flex-start', justifyContent:'center'
  },
  shell: {
    width:'min(1100px, 100%)', maxHeight:'calc(100dvh - 28px)',
    background:'#FFFFFF', borderRadius:28, overflow:'hidden',
    display:'flex', flexDirection:'column',
    boxShadow:'0 24px 80px rgba(15,23,42,.25)',
    border:'1px solid #E2E8F0', boxSizing:'border-box'
  },
  header: {
    flexShrink:0, display:'flex', justifyContent:'space-between', alignItems:'center',
    gap:16, padding:'24px clamp(16px, 3vw, 30px) 17px',
    background:'#FFFFFF', borderBottom:'1px solid #EDF2F7'
  },
  title: {
    margin:0, fontSize:'clamp(22px, 2.6vw, 29px)', fontWeight:800,
    lineHeight:1.3, color:'#0F172A', letterSpacing:'-.025em'
  },
  close: {
    width:44, height:44, flexShrink:0, borderRadius:'50%',
    background:'#FFFFFF', color:'#64748B', border:'1px solid #DFE7EF',
    boxShadow:'0 8px 24px rgba(15,23,42,.1)',
    display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'
  },
  scroll: {
    flex:1, minHeight:0, overflowY:'auto', overscrollBehavior:'contain',
    padding:'18px clamp(16px, 3vw, 30px) 22px'
  },
  section: {
    padding:'20px clamp(14px, 2.2vw, 24px)',
    marginBottom:16, border:'1.5px solid #DDE6EF',
    borderRadius:22, background:'#FFFFFF'
  },
  sectionTitle: {
    display:'flex', alignItems:'center', gap:9,
    margin:'0 0 18px', color:'#087C8B',
    fontWeight:800, fontSize:14, letterSpacing:'.09em',
    textTransform:'uppercase'
  },
  grid: {
    display:'grid',
    gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
    gap:'17px 20px'
  },
  label: {
    display:'block', fontSize:15, fontWeight:700,
    color:'#4B7C87', marginBottom:9
  },
  field: {
    width:'100%', minHeight:52, boxSizing:'border-box',
    border:'2px solid #D3E4E8', borderRadius:16,
    padding:'11px 16px', font:'inherit', fontSize:16,
    color:'#15323D', background:'#FFFFFF'
  },
  helper: { margin:'8px 0 0', fontSize:12, lineHeight:1.5, color:'#64748B' },
  footer: {
    flexShrink:0, display:'flex', justifyContent:'flex-end', alignItems:'center',
    flexWrap:'wrap', gap:10, padding:'14px clamp(16px, 3vw, 30px)',
    background:'#FFFFFF', borderTop:'1px solid #E2E8F0',
    boxShadow:'0 -6px 18px rgba(15,23,42,.035)'
  },
  secondary: {
    minHeight:48, padding:'10px 20px', border:'1.5px solid #DFE7EF',
    borderRadius:13, background:'#FFFFFF', color:'#475569',
    font:'inherit', fontSize:15, fontWeight:700, cursor:'pointer'
  },
  primary: {
    minHeight:48, padding:'10px 23px', border:0, borderRadius:13,
    background:'linear-gradient(135deg,#0D7A87,#13A3B4)', color:'#FFFFFF',
    font:'inherit', fontSize:15, fontWeight:800,
    cursor:'pointer', display:'inline-flex', alignItems:'center',
    justifyContent:'center', gap:9
  }
};

const emptyForm = () => ({
  patient_id:'', appliance_type:'FIXED', start_date:today(), expected_end_date:'',
  clinical_notes:'', billing_mode:'FORFAIT', total_mga:'', upfront_mga:'0',
  monthly_mga:'', months:'12', first_due_date:today()
});

export default function OrthodonticManagement() {
  const { user } = useAuth();
  const [urlParams] = useSearchParams();
  const selectedPatientId = urlParams.get('patient_id') || '';
  const clinicalWriter = ['ADMIN','DENTIST','ASSISTANT'].includes(user?.role);
  const financeWriter = ['ADMIN','DENTIST','ASSISTANT','ACCOUNTANT'].includes(user?.role);
  const financeReader = financeWriter;
  const [cases, setCases] = useState([]);
  const [pagination, setPagination] = useState({page:1,pages:1,total:0});
  const [page,setPage] = useState(1);
  const [status,setStatus] = useState(selectedPatientId ? 'ALL' : 'ACTIVE');
  const [search,setSearch] = useState('');
  const [loading,setLoading] = useState(true);
  const [creating,setCreating] = useState(false);
  const [saving,setSaving] = useState(false);
  const [form,setForm] = useState(emptyForm);
  const [detailId,setDetailId] = useState(null);
  const [detail,setDetail] = useState(null);
  const [detailLoading,setDetailLoading] = useState(false);
  const [invoiceOptions,setInvoiceOptions] = useState([]);
  const [invoiceSelection,setInvoiceSelection] = useState('');
  const [dueSeq,setDueSeq] = useState('');
  const [visit,setVisit] = useState({visit_date:today(),next_visit_date:'',notes:''});
  const [actionBusy,setActionBusy] = useState(false);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(API + '/orthodontics', {
        ...auth(), params: { status, page, q:search.trim(), ...(selectedPatientId ? { patient_id:selectedPatientId } : {}) }
      });
      setCases(response.data.cases || []);
      setPagination(response.data.pagination || {page,pages:1,total:0});
    } catch {
      toast.error('Impossible de charger les dossiers orthodontiques');
    } finally { setLoading(false); }
  }, [status,page,search,selectedPatientId]);

  const fetchDetail = useCallback(async (id) => {
    if (!id) return;
    setDetailLoading(true);
    try {
      const r = await axios.get(API + '/orthodontics/' + id, auth());
      setDetail(r.data);
      if (financeReader) {
        const invoices = await axios.get(API + '/orthodontics/' + id + '/invoices', auth());
        setInvoiceOptions(invoices.data.invoices || []);
      }
    } catch {
      toast.error('Impossible de charger le dossier');
    } finally { setDetailLoading(false); }
  }, [financeReader]);

  useEffect(() => { fetchCases(); }, [fetchCases]);
  useEffect(() => { if (detailId) fetchDetail(detailId); }, [detailId,fetchDetail]);

  const summary = useMemo(() => {
    const active = cases.filter(c => c.status === 'ACTIVE').length;
    const upcoming = cases.filter(c => c.next_visit_date).length;
    const late = cases.reduce((v,c) => v + Number(c.finance?.overdue_mga || 0),0);
    return { active, upcoming, late };
  }, [cases]);

  const submitCase = async (event) => {
    event.preventDefault();
    if (!form.patient_id) return toast.error('Sélectionnez un patient');
    setSaving(true);
    try {
      const payload = { ...form, months:Number(form.months), billing_mode:form.billing_mode,
        ...(form.billing_mode === 'FORFAIT'
          ? { total_mga:Number(form.total_mga), upfront_mga:Number(form.upfront_mga) }
          : { monthly_mga:Number(form.monthly_mga) })
      };
      const response = await axios.post(API + '/orthodontics',payload,auth());
      setCreating(false); setForm(emptyForm()); setPage(1); setStatus('ACTIVE');
      toast.success('Traitement orthodontique créé');
      await fetchCases();
      setDetailId(response.data.case_id);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur de création du traitement');
    } finally { setSaving(false); }
  };
  const linkInvoice = async () => {
    if (!detailId || !invoiceSelection) return;
    if (detail?.case?.billing_mode === 'MONTHLY' && dueSeq === '') return toast.error('Choisissez une échéance');
    setActionBusy(true);
    try {
      await axios.post(API + '/orthodontics/' + detailId + '/link-invoice',
        { invoice_id:invoiceSelection, ...(dueSeq !== '' ? {sequence:Number(dueSeq)} : {}) }, auth());
      toast.success('Facture rapprochée, sans nouvel encaissement');
      setInvoiceSelection(''); setDueSeq(''); await fetchDetail(detailId); await fetchCases();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Rapprochement impossible');
    } finally { setActionBusy(false); }
  };
  const saveVisit = async (event) => {
    event.preventDefault();
    setActionBusy(true);
    try {
      await axios.post(API + '/orthodontics/' + detailId + '/visits',visit,auth());
      toast.success('Contrôle enregistré');
      setVisit({visit_date:today(),next_visit_date:'',notes:''});
      await fetchDetail(detailId); await fetchCases();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Contrôle non enregistré');
    } finally { setActionBusy(false); }
  };

  const dossier = detail?.case;
  const financial = detail?.finance;

  return (
    <div style={{ padding:'20px clamp(12px, 2vw, 30px)', maxWidth:1600, margin:'0 auto', color:C.ink }}>
      <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:20 }}>
        <div>
          <h1 style={{ margin:'0 0 5px',fontSize:26,fontWeight:850,color:C.ink }}>Orthodontie</h1>
          {selectedPatientId && <Link to="/orthodontics" style={{fontSize:12,color:C.teal}}>Voir tous les dossiers</Link>}
          <p style={{ margin:0,fontSize:13,color:C.muted }}>Dossiers, contrôles cliniques et échéances financières</p>
        </div>
        {clinicalWriter && <button style={btn} type="button" onClick={() => setCreating(true)}><FilePlus2 size={17}/> Nouveau traitement</button>}
      </header>

      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:12,marginBottom:18 }}>
        {[
          { label:'Dossiers trouvés',value:pagination.total,icon:Smile },
          { label:'Actifs sur cette page',value:summary.active,icon:ClipboardList },
          { label:'Contrôles programmés sur cette page',value:summary.upcoming,icon:CalendarDays },
          ...(financeReader ? [{label:'Retards sur cette page',value:amount(summary.late),icon:Wallet}] : [])
        ].map(item => (
          <div key={item.label} style={{...panel, padding:14,background:'#FAFDFE'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,color:C.muted,fontSize:11,fontWeight:700}}><item.icon size={16} color={C.teal}/>{item.label}</div>
            <div style={{marginTop:11,fontSize:21,fontWeight:850,color:C.ink}}>{item.value}</div>
          </div>
        ))}
      </div>

      <section style={panel} className="dpm-odf-patients-section">
        <div className="dpm-odf-patients-toolbar">
          <h2 className="dpm-odf-patients-heading">Patients en traitement</h2>

          <div className="dpm-odf-patients-filters">
            <div className="dpm-odf-search-box">
              <Search size={17} className="dpm-odf-search-icon" aria-hidden="true" />
              <input
                aria-label="Rechercher un patient ODF"
                placeholder="Nom, dossier..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{...input, paddingLeft:40, width:'100%'}}
              />
            </div>
            <select
              className="dpm-odf-status-filter"
              aria-label="Filtrer les traitements"
              style={input}
              value={status}
              onChange={e => { setStatus(e.target.value); setPage(1); }}
            >
              <option value="ACTIVE">Actifs</option>
              <option value="ALL">Tous</option>
              <option value="PLANNED">Planifiés</option>
              <option value="PAUSED">Suspendus</option>
              <option value="COMPLETED">Terminés</option>
              <option value="CANCELLED">Arrêtés</option>
            </select>
          </div>
        </div>

        {/* Ordinateur grand format : tableau avec colonnes lisibles. */}
        <div className="dpm-odf-table-scroll">
          <table className={'dpm-odf-table ' + (financeReader ? 'dpm-odf-table--finance' : 'dpm-odf-table--clinical')}>
            <colgroup>
              {Array.from({length:financeReader ? 7 : 5}, (_, index) => <col key={index} />)}
            </colgroup>
            <thead>
              <tr>
                {[
                  'Patient', 'Traitement', 'Début', 'Prochain contrôle',
                  ...(financeReader ? ['Mode', 'Situation financière'] : []),
                  'Dossier'
                ].map(heading => <th key={heading} scope="col">{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {!loading && cases.map(record => (
                <tr key={record.id}>
                  <td>
                    <span className="dpm-odf-patient-name">{renderName(record)}</span>
                    <div className="dpm-odf-patient-code">{record.patient?.patient_number || '—'}</div>
                  </td>
                  <td>
                    {typeLabel[record.appliance_type] || record.appliance_type}
                    <div className="dpm-odf-cell-meta">
                      <Badge tone="teal">{caseLabel[record.status] || record.status}</Badge>
                    </div>
                  </td>
                  <td><span className="dpm-odf-date">{displayCivilDate(record.start_date)}</span></td>
                  <td><span className="dpm-odf-date">{displayCivilDate(record.next_visit_date)}</span></td>
                  {financeReader && (
                    <>
                      <td>{modeLabel[record.billing_mode] || '—'}</td>
                      <td className="dpm-odf-status-cell">
                        <FinanceStatus record={record} />
                      </td>
                    </>
                  )}
                  <td>
                    <button
                      type="button"
                      className="dpm-odf-open-btn"
                      style={{...subtle, padding:'9px 12px'}}
                      onClick={() => setDetailId(record.id)}
                      aria-label={'Ouvrir le dossier de ' + renderName(record)}
                    >
                      Ouvrir <ChevronRight size={16} aria-hidden="true"/>
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && cases.length === 0 && (
                <tr>
                  <td className="dpm-odf-empty-row" colSpan={financeReader ? 7 : 5}>
                    Aucun dossier trouvé pour ce filtre.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="dpm-odf-empty-row" colSpan={financeReader ? 7 : 5}>
                    Chargement des dossiers...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Tablettes et mobiles : cartes patient, sans défilement horizontal. */}
        <div className="dpm-odf-mobile-cards">
          {!loading && cases.map(record => (
            <article className="dpm-odf-patient-card" key={record.id}>
              <div className="dpm-odf-card-head">
                <div className="dpm-odf-card-patient">
                  <div className="dpm-odf-card-name">{renderName(record)}</div>
                  <div className="dpm-odf-card-code">{record.patient?.patient_number || '—'}</div>
                </div>
                <Badge tone="teal">{caseLabel[record.status] || record.status}</Badge>
              </div>

              <div className="dpm-odf-card-fields">
                <div className="dpm-odf-card-field">
                  <div className="dpm-odf-card-label">Traitement</div>
                  <div className="dpm-odf-card-value">{typeLabel[record.appliance_type] || record.appliance_type}</div>
                </div>
                <div className="dpm-odf-card-field">
                  <div className="dpm-odf-card-label">Début</div>
                  <div className="dpm-odf-card-value">{displayCivilDate(record.start_date)}</div>
                </div>
                <div className="dpm-odf-card-field">
                  <div className="dpm-odf-card-label">Prochain contrôle</div>
                  <div className="dpm-odf-card-value">{displayCivilDate(record.next_visit_date)}</div>
                </div>
                {financeReader && (
                  <div className="dpm-odf-card-field">
                    <div className="dpm-odf-card-label">Mode financier</div>
                    <div className="dpm-odf-card-value">{modeLabel[record.billing_mode] || '—'}</div>
                  </div>
                )}
              </div>

              {financeReader && (
                <div className="dpm-odf-card-finance">
                  <div className="dpm-odf-card-finance-label">Situation financière</div>
                  <FinanceStatus record={record} />
                </div>
              )}

              <button
                type="button"
                className="dpm-odf-open-btn dpm-odf-card-action"
                style={{...subtle, padding:'10px 13px'}}
                onClick={() => setDetailId(record.id)}
                aria-label={'Ouvrir le dossier de ' + renderName(record)}
              >
                Ouvrir le dossier <ChevronRight size={16} aria-hidden="true"/>
              </button>
            </article>
          ))}
          {!loading && cases.length === 0 && (
            <div style={{...panel, color:C.muted, textAlign:'center', fontSize:13, gridColumn:'1 / -1'}}>
              Aucun dossier trouvé pour ce filtre.
            </div>
          )}
          {loading && (
            <div style={{...panel, color:C.muted, textAlign:'center', fontSize:13, gridColumn:'1 / -1'}}>
              Chargement des dossiers...
            </div>
          )}
        </div>

        <div className="dpm-odf-pagination">
          <span>Page {pagination.page} / {Math.max(1, pagination.pages)}</span>
          <button
            type="button"
            aria-label="Page précédente"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            style={{...subtle, padding:8, opacity:page<=1?.4:1}}
          >
            <ChevronLeft size={16}/>
          </button>
          <button
            type="button"
            aria-label="Page suivante"
            disabled={page >= pagination.pages}
            onClick={() => setPage(p => p + 1)}
            style={{...subtle, padding:8, opacity:page>=pagination.pages?.4:1}}
          >
            <ChevronRight size={16}/>
          </button>
        </div>
      </section>

      {creating && createPortal(
        <div style={odfModal.overlay}>
          <div role="dialog" aria-modal="true" aria-labelledby="odf-create-title" style={odfModal.shell}>
            <div style={odfModal.header}>
              <h2 id="odf-create-title" style={odfModal.title}>
                Nouveau traitement orthodontique
              </h2>
              <button
                type="button"
                aria-label="Fermer la fenêtre"
                title="Fermer"
                style={odfModal.close}
                onClick={() => setCreating(false)}
              >
                <X size={22} strokeWidth={2} />
              </button>
            </div>

            <form
              onSubmit={submitCase}
              style={{display:'flex', flexDirection:'column', flex:1, minHeight:0}}
            >
              <div className="dpm-subtle-scroll" style={odfModal.scroll}>
                {/* 1. PATIENT */}
                <section style={odfModal.section}>
                  <h3 style={odfModal.sectionTitle}>
                    <ClipboardList size={18} aria-hidden="true" />
                    Patient
                  </h3>
                  <div>
                    <label htmlFor="ortho-case-patient" style={odfModal.label}>
                      Rechercher un patient *
                    </label>
                    <PatientSearchPicker
                      inputId="ortho-case-patient"
                      value={form.patient_id}
                      onChange={patient => setForm(f => ({
                        ...f, patient_id:patient?.id || ''
                      }))}
                    />
                  </div>
                </section>

                {/* 2. TRAITEMENT */}
                <section style={odfModal.section}>
                  <h3 style={odfModal.sectionTitle}>
                    <Smile size={18} aria-hidden="true" />
                    Traitement
                  </h3>
                  <div style={odfModal.grid}>
                    <div>
                      <label htmlFor="ortho-appliance" style={odfModal.label}>
                        Type d'appareil *
                      </label>
                      <select
                        id="ortho-appliance"
                        required
                        style={odfModal.field}
                        value={form.appliance_type}
                        onChange={e => setForm(f => ({
                          ...f, appliance_type:e.target.value
                        }))}
                      >
                        {Object.entries(typeLabel).map(([key, name]) => (
                          <option key={key} value={key}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="ortho-start" style={odfModal.label}>
                        Début du traitement *
                      </label>
                      <input
                        id="ortho-start"
                        type="date"
                        required
                        style={odfModal.field}
                        value={form.start_date}
                        onChange={e => setForm(f => ({
                          ...f, start_date:e.target.value
                        }))}
                      />
                    </div>
                    <div>
                      <label htmlFor="ortho-end" style={odfModal.label}>
                        Fin prévisionnelle
                      </label>
                      <input
                        id="ortho-end"
                        type="date"
                        style={odfModal.field}
                        value={form.expected_end_date}
                        onChange={e => setForm(f => ({
                          ...f, expected_end_date:e.target.value
                        }))}
                      />
                    </div>
                  </div>
                </section>

                {/* 3. MODALITÉS FINANCIÈRES */}
                <section style={odfModal.section}>
                  <h3 style={odfModal.sectionTitle}>
                    <Wallet size={18} aria-hidden="true" />
                    Modalités financières
                  </h3>
                  <div style={odfModal.grid}>
                    <div>
                      <label htmlFor="ortho-mode" style={odfModal.label}>
                        Mode financier *
                      </label>
                      <select
                        id="ortho-mode"
                        required
                        style={odfModal.field}
                        value={form.billing_mode}
                        onChange={e => setForm(f => ({
                          ...f, billing_mode:e.target.value
                        }))}
                      >
                        <option value="FORFAIT">Forfait global échelonné</option>
                        <option value="MONTHLY">Honoraires mensuels</option>
                      </select>
                    </div>

                    {form.billing_mode === 'FORFAIT' ? (
                      <>
                        <div>
                          <label htmlFor="ortho-total" style={odfModal.label}>
                            Prix global (Ar) *
                          </label>
                          <input
                            id="ortho-total"
                            type="number"
                            min="1"
                            step="1"
                            required
                            placeholder="Ex. 3 600 000"
                            style={odfModal.field}
                            value={form.total_mga}
                            onChange={e => setForm(f => ({
                              ...f, total_mga:e.target.value
                            }))}
                          />
                        </div>
                        <div>
                          <label htmlFor="ortho-upfront" style={odfModal.label}>
                            Acompte (Ar)
                          </label>
                          <input
                            id="ortho-upfront"
                            type="number"
                            min="0"
                            step="1"
                            style={odfModal.field}
                            value={form.upfront_mga}
                            onChange={e => setForm(f => ({
                              ...f, upfront_mga:e.target.value
                            }))}
                          />
                        </div>
                      </>
                    ) : (
                      <div>
                        <label htmlFor="ortho-monthly" style={odfModal.label}>
                          Honoraires mensuels (Ar) *
                        </label>
                        <input
                          id="ortho-monthly"
                          type="number"
                          min="1"
                          step="1"
                          required
                          style={odfModal.field}
                          value={form.monthly_mga}
                          onChange={e => setForm(f => ({
                            ...f, monthly_mga:e.target.value
                          }))}
                        />
                      </div>
                    )}

                    <div>
                      <label htmlFor="ortho-months" style={odfModal.label}>
                        Nombre de mensualités prévues *
                      </label>
                      <input
                        id="ortho-months"
                        type="number"
                        min="1"
                        max="60"
                        step="1"
                        required
                        style={odfModal.field}
                        value={form.months}
                        onChange={e => setForm(f => ({
                          ...f, months:e.target.value
                        }))}
                      />
                      <p style={odfModal.helper}>
                        Entre 1 et 60 échéances. Différent de la durée clinique.
                      </p>
                    </div>
                    <div>
                      <label htmlFor="ortho-first-due" style={odfModal.label}>
                        {form.billing_mode === 'FORFAIT'
                          ? "Date de première échéance / acompte *"
                          : "Date de première mensualité *"}
                      </label>
                      <input
                        id="ortho-first-due"
                        type="date"
                        required
                        style={odfModal.field}
                        value={form.first_due_date}
                        onChange={e => setForm(f => ({
                          ...f, first_due_date:e.target.value
                        }))}
                      />
                    </div>
                  </div>

                  <div style={{
                    marginTop:18,
                    padding:'12px 15px',
                    background:'#F0FAFB',
                    border:'1px solid #D3EDEF',
                    borderRadius:12,
                    fontSize:13,
                    lineHeight:1.6,
                    color:'#47727D'
                  }}>
                    Aucune facture ni aucun paiement n'est créé ici.
                    L'échéancier sera rapproché des factures existantes du patient.
                  </div>
                </section>

                {/* 4. OBSERVATIONS */}
                <section style={{...odfModal.section, marginBottom:0}}>
                  <h3 style={odfModal.sectionTitle}>
                    <ClipboardList size={18} aria-hidden="true" />
                    Diagnostic et observations
                  </h3>
                  <label htmlFor="ortho-notes" style={odfModal.label}>
                    Observations cliniques
                  </label>
                  <textarea
                    id="ortho-notes"
                    style={{...odfModal.field, minHeight:105, resize:'vertical'}}
                    placeholder="Diagnostic, objectifs thérapeutiques, remarques..."
                    value={form.clinical_notes}
                    onChange={e => setForm(f => ({
                      ...f, clinical_notes:e.target.value
                    }))}
                  />
                </section>
              </div>

              <div style={odfModal.footer}>
                <button
                  type="button"
                  style={odfModal.secondary}
                  onClick={() => setCreating(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.patient_id}
                  style={{
                    ...odfModal.primary,
                    opacity:saving || !form.patient_id ? .6 : 1,
                    cursor:saving || !form.patient_id ? 'not-allowed' : 'pointer'
                  }}
                >
                  <CheckCircle2 size={17} />
                  {saving ? 'Enregistrement...' : 'Créer le traitement'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {detailId && <div role="dialog" aria-modal="true" aria-label="Dossier orthodontique" style={{position:'fixed',inset:0,zIndex:5000,background:'rgba(15,23,42,.58)',display:'flex',alignItems:'center',justifyContent:'center',padding:12}}>
        <div style={{background:'#fff',borderRadius:20,width:'min(1050px,100%)',height:'min(92vh,950px)',overflowY:'auto',padding:22,boxSizing:'border-box'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,marginBottom:18}}>
            <div><h2 style={{margin:'0 0 6px',fontSize:21}}>Dossier orthodontique</h2>
              <div style={{color:C.muted,fontSize:13}}>{renderName(dossier)} · {dossier ? typeLabel[dossier.appliance_type] : ''}</div>
            </div>
            <button type="button" style={subtle} aria-label="Fermer les détails" onClick={()=>{setDetailId(null);setDetail(null);}}><X size={18}/></button>
          </div>
          {detailLoading || !dossier ? <p style={{color:C.muted}}>Chargement du dossier...</p> : <>
            <div style={{display:'flex',flexWrap:'wrap',gap:9,marginBottom:15}}>
              <Badge tone="teal">{caseLabel[dossier.status] || dossier.status}</Badge>
              <Badge>{modeLabel[dossier.billing_mode]}</Badge>
              <Badge>Début : {dossier.start_date}</Badge>
              {dossier.expected_end_date && <Badge>Fin estimée : {dossier.expected_end_date}</Badge>}
            </div>
            {dossier.clinical_notes && <div style={{...panel,background:C.bg,marginBottom:16,fontSize:13,whiteSpace:'pre-wrap'}}><strong>Notes cliniques : </strong>{dossier.clinical_notes}</div>}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,330px),1fr))',gap:16}}>
              <section style={panel}>
                <h3 style={{margin:'0 0 12px',fontSize:16}}>Suivi clinique</h3>
                {clinicalWriter && <form onSubmit={saveVisit} style={{display:'grid',gap:10,marginBottom:16}}>
                  <div><label style={label}>Date du contrôle *</label><input type="date" style={input} required value={visit.visit_date} onChange={e=>setVisit(s=>({...s,visit_date:e.target.value}))}/></div>
                  <div><label style={label}>Prochain contrôle</label><input type="date" style={input} value={visit.next_visit_date} onChange={e=>setVisit(s=>({...s,next_visit_date:e.target.value}))}/></div>
                  <div><label style={label}>Observation</label><textarea style={{...input,minHeight:66}} value={visit.notes} onChange={e=>setVisit(s=>({...s,notes:e.target.value}))}/></div>
                  <button type="submit" style={subtle} disabled={actionBusy}><CheckCircle2 size={15}/> Enregistrer le contrôle</button>
                </form>}
                <div style={{fontWeight:750,fontSize:13,marginBottom:10}}>Contrôles précédents</div>
                {!dossier.visits?.length && <p style={{fontSize:12,color:C.muted}}>Aucun contrôle renseigné.</p>}
                {(dossier.visits || []).map(v => <div key={v.id} style={{padding:'10px 0',borderTop:'1px solid '+C.border,fontSize:12}}>
                  <strong>{v.visit_date}</strong> {v.next_visit_date && <span style={{color:C.teal}}>· Prochain : {v.next_visit_date}</span>}
                  <div style={{color:C.muted,marginTop:4,whiteSpace:'pre-wrap'}}>{v.notes}</div>
                </div>)}
                <p style={{fontSize:12,color:C.muted}}>Les rendez-vous sont toujours gérés dans l’agenda central de DentalPM.</p>
                <Link to="/appointments" style={{...subtle,textDecoration:'none',marginTop:8}}>Ouvrir les rendez-vous</Link>
              </section>
              {financeReader && <section style={panel}>
                <h3 style={{margin:'0 0 12px',fontSize:16}}>Suivi financier</h3>
                <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,marginBottom:12}}>
                  {[['Facturé',financial?.totals?.billed_mga],['Encaissé',financial?.totals?.paid_mga],
                    ['Solde facturé',financial?.totals?.balance_mga],['En retard',financial?.totals?.overdue_mga]].map(([l,v])=>
                    <div key={l} style={{background:C.bg,borderRadius:10,padding:12}}>
                      <div style={{color:C.muted,fontSize:11}}>{l}</div>
                      <div style={{fontSize:16,fontWeight:800,marginTop:5}}>{amount(v)}</div>
                    </div>
                  )}
                </div>
                <div style={{fontSize:12,color:C.muted,marginBottom:12}}>
                  {dossier.billing_mode === 'FORFAIT' ? 'Montant du forfait : ' + amount(dossier.total_mga) : 'Honoraires par période : ' + amount(dossier.monthly_mga)}
                  <br/>Les encaissements proviennent exclusivement des factures DentalPM.
                </div>
                <h4 style={{fontSize:13,margin:'12px 0'}}>Échéances</h4>
                <div style={{maxHeight:230,overflowY:'auto',border:'1px solid '+C.border,borderRadius:10}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                    <thead><tr style={{textAlign:'left',background:C.bg}}>{['Date','Montant','Statut'].map(h=><th key={h} style={{padding:8}}>{h}</th>)}</tr></thead>
                    <tbody>{(financial?.dues || []).map(d=><tr key={d.id} style={{borderTop:'1px solid '+C.border}}>
                      <td style={{padding:8}}>{d.due_date}{d.sequence===0?' · acompte':''}</td>
                      <td style={{padding:8}}>{amount(d.amount_mga)}{d.paid_mga>0 && <div style={{color:C.muted,fontSize:10}}>Payé : {amount(d.paid_mga)}</div>}</td>
                      <td style={{padding:8}}><Badge tone={d.status==='OVERDUE'?'red':d.status==='PAID'?'green':'neutral'}>{dueLabel[d.status] || d.status}</Badge></td>
                    </tr>)}</tbody>
                  </table>
                </div>
                {financeWriter && <div style={{marginTop:14,background:C.bg,padding:12,borderRadius:12}}>
                  <div style={{fontSize:13,fontWeight:750,marginBottom:8}}>Rapprocher une facture existante</div>
                  {dossier.billing_mode === 'MONTHLY' && <div style={{marginBottom:8}}><label style={label}>Échéance non facturée</label>
                    <select style={input} value={dueSeq} onChange={e=>setDueSeq(e.target.value)}>
                      <option value="">Choisir une échéance...</option>
                      {(financial?.dues || []).filter(d=>!d.invoice_id).map(d=><option key={d.id} value={d.sequence}>{d.due_date} · {amount(d.amount_mga)}</option>)}
                    </select></div>}
                  <div><label style={label}>Facture du patient</label><select style={input} value={invoiceSelection} onChange={e=>setInvoiceSelection(e.target.value)}>
                    <option value="">Choisir une facture déjà créée...</option>
                    {invoiceOptions.filter(i=>!financial?.invoices?.some(x=>x.id===i.id)).map(i=><option key={i.id} value={i.id}>{i.invoice_number} · {amount(i.total_mga)}</option>)}
                  </select></div>
                  <button type="button" style={{...btn,marginTop:10}} disabled={actionBusy || !invoiceSelection} onClick={linkInvoice}><CreditCard size={15}/> Associer la facture</button>
                  <div style={{marginTop:12,fontSize:12,color:C.muted}}>
                    Si elle n'existe pas, créez-la une seule fois dans <Link to="/invoices">Factures</Link>, puis revenez l'associer.
                  </div>
                </div>}
              </section>}
            </div>
          </>}
        </div>
      </div>}
    </div>
  );
}
