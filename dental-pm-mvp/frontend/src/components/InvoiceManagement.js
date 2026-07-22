import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { cachedGet, CACHE_TTL } from '../utils/clientCache';
import { matchesSearch, patientIdentifier, patientSearchText, scoreSearchMatch } from '../utils/search';
import { renderHtmlInPopup } from '../utils/printHtml';
import {
  FileText, Plus, Search, Eye, Printer, Download, X, RefreshCw,
  Clock, CheckCircle, AlertCircle, DollarSign, CreditCard,
  Smartphone, Banknote, User, Calendar, Sparkles, Percent, Receipt
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const authH = () => ({ withCredentials: true });
const fmt = v => new Intl.NumberFormat('fr-MG').format(v || 0) + ' Ar';
const fdate = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

const INV_STATUS = {
  DRAFT:     { l:'Brouillon', bg:'#F1F5F9', c:'#475569', dot:'#94A3B8' },
  PENDING:   { l:'En attente',bg:'#FFFBEB', c:'#B45309', dot:'#F59E0B' },
  PARTIAL:   { l:'Partiel',   bg:'#FEF3C7', c:'#92400E', dot:'#EAB308' },
  PAID:      { l:'Payé',      bg:'#DCFCE7', c:'#166534', dot:'#22C55E' },
  OVERDUE:   { l:'En retard', bg:'#FEE2E2', c:'#991B1B', dot:'#EF4444' },
  CANCELLED: { l:'Annulé',    bg:'#F1F5F9', c:'#94A3B8', dot:'#CBD5E1' },
};

const PMETHODS = [
  { v:'CASH',         l:'Espèces',        icon:'💵' },
  { v:'MVOLA',        l:'MVola',          icon:'📱' },
  { v:'ORANGE_MONEY', l:'Orange Money',   icon:'🟠' },
  { v:'AIRTEL_MONEY', l:'Airtel Money',   icon:'🔴' },
  { v:'BANK_TRANSFER',l:'Virement',       icon:'🏦' },
  { v:'CHEQUE',       l:'Chèque',         icon:'📝' },
  { v:'CARD',         l:'Carte',          icon:'💳' },
];

const DISCOUNT_PRESETS = [
  { n:'Syndical',    p:15 },
  { n:'Humanitaire', p:20 },
  { n:'Fidélité',    p:10 },
];

const C = { teal:'#0D7A87', green:'#10B981', amber:'#F59E0B', red:'#EF4444', blue:'#3B82F6', purple:'#8B5CF6' };

// 
const PAYMENT_METHODS_WITH_REFERENCE = [
  'MVOLA',
  'ORANGE_MONEY',
  'AIRTEL_MONEY',
  'BANK_TRANSFER',
  'CHEQUE',
  'CARD'
];

const canUsePaymentReference = (method) => {
  return PAYMENT_METHODS_WITH_REFERENCE.includes(method);
};
// 

const Modal = ({ open, onClose, title, children, maxW=700 }) => {
  if (!open) return null;
  return (
    <div style={{ position:'fixed',inset:0,zIndex:1000,background:'rgba(15,23,42,.55)',overflowY:'auto',padding:'56px 16px 32px' }}>
      <button type="button" aria-label="Fermer la fenêtre" onClick={onClose} style={{ position:'fixed', inset:0, width:'100%', height:'100%', border:0, padding:0, background:'transparent', cursor:'default' }} />
      <div style={{ background:'#fff',borderRadius:22,padding:28,width:'100%',maxWidth:maxW,margin:'0 auto',boxShadow:'0 24px 64px rgba(15,23,42,.2)',border:'1px solid #E2E8F0',position:'relative',zIndex:1 }}>
        <button type="button" aria-label="Fermer la fenêtre" onClick={onClose} style={{ position:'absolute',top:14,right:14,background:'#F8FAFC',border:'none',cursor:'pointer',padding:7,borderRadius:8,display:'flex',alignItems:'center',color:'#64748B' }}><X size={15}/></button>
        {title&&<h2 style={{ fontFamily:'Plus Jakarta Sans',fontSize:17,fontWeight:700,color:'#0F172A',margin:'0 0 20px',paddingRight:28 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
};

const Skel = ({h=16,r=8}) => <div style={{ height:h,width:'100%',borderRadius:r,background:'linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.4s infinite' }}/>;

const SBadge = ({ st }) => {
  const s = INV_STATUS[st] || INV_STATUS.DRAFT;
  return <span style={{ background:s.bg,color:s.c,borderRadius:99,padding:'3px 10px',fontSize:11,fontWeight:700,display:'inline-flex',alignItems:'center',gap:4 }}>
    <div style={{ width:5,height:5,borderRadius:'50%',background:s.dot }}/>{s.l}
  </span>;
};

const inp = { width:'100%',padding:'9px 12px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:13,fontFamily:'inherit',outline:'none',transition:'border-color .2s' };
const fi = e=>e.target.style.borderColor=C.teal, bi=e=>e.target.style.borderColor='#E2E8F0';

/* ════════════════════════════════════════════════════════════════════════════ */
const InvoiceManagement = () => {
  const mountedRef = useRef(true);
  const [invoices,  setInvoices]  = useState([]);
  const [patients,  setPatients]  = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [fees,      setFees]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [patientLoading, setPatientLoading] = useState(false);
  const [statusF,   setStatusF]   = useState('ALL');
  const [feeSearch, setFeeSearch] = useState('');
  const [isOpen,    setIsOpen]    = useState(false);
  const [detailInv, setDetailInv] = useState(null);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [payInv,    setPayInv]    = useState(null);
  const [payments,  setPayments]  = useState([]);
  const [revenues,  setRevenues]  = useState([]);
  const [payStats,  setPayStats]  = useState({ total_mga:0, paid_total_mga:0, balance_mga:0 });
  const [saving,    setSaving]    = useState(false);
  const [payData,   setPayData]   = useState({ amount_mga:'', payment_method:'CASH', reference_number:'' });
  const patientRequestRef = useRef(null);

  const emptyForm = { patient_id:'', schedule_id:'', items:[{ description:'', procedure_code:'', quantity:1, unit_price_mga:'', tooth_number:'' }], discount_percentage:0, notes:'', payment_method:'' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    mountedRef.current = true;
    fetchAll();
    return () => {
      mountedRef.current = false;
      patientRequestRef.current?.abort();
    };
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchInvoices(), fetchSchedules(), fetchRevenues()]);
    setLoading(false);
  };

  const fetchInvoices = async (status) => {
    try {
      const params = {};
      if (status && status !== 'ALL') params.status = status;
      const r = await axios.get(`${API}/invoices`, { params, ...authH() });
      if (mountedRef.current) setInvoices(r.data.invoices || r.data.data || []);
    } catch {}
  };
  const fetchPatients = async (query, signal) => {
    const params = { limit: 20, page: 1 };
    if (query?.trim()) params.search = query.trim();
    const r = await axios.get(`${API}/patients`, { params, signal, ...authH() });
    return r.data.patients || [];
  };
  const fetchSchedules = async () => { try { const r=await cachedGet(`${API}/pricing-schedules`,authH(),{ttl:CACHE_TTL.long}); setSchedules(r.data.schedules||[]); } catch {} };
  const fetchFees = async id => { if(!id){setFees([]);return;} try { const r=await cachedGet(`${API}/pricing-schedules/${id}/fees`,authH(),{ttl:CACHE_TTL.long}); setFees(r.data.fees||[]); } catch { setFees([]); } };
  const fetchRevenues = async () => { try { const r=await axios.get(`${API}/invoices/revenues`, authH()); setRevenues(r.data.revenues || []); } catch { setRevenues([]); } };

  useEffect(() => {
    if (!isOpen) return undefined;

    const query = patientSearch.trim();
    patientRequestRef.current?.abort();

    if (query.length < 2) {
      setPatients([]);
      setPatientLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    patientRequestRef.current = controller;
    const timer = setTimeout(async () => {
      setPatientLoading(true);
      try {
        const list = await fetchPatients(query, controller.signal);
        if (patientRequestRef.current === controller) setPatients(list);
      } catch (error) {
        if (!axios.isCancel(error) && error.code !== 'ERR_CANCELED') setPatients([]);
      } finally {
        if (patientRequestRef.current === controller) setPatientLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, patientSearch]);

  // const fetchPayments = async inv => {
  //   try {
  //     const r = await axios.get(`${API}/invoices/${inv.id}/payments`, authH());
  //     setPayments(r.data.payments || []);
  //     setPayStats(r.data.stats || { total_mga:0, paid_total_mga:0, balance_mga:0 });
  //   } catch { setPayments([]); }
  // };

  const fetchPayments = async inv => {
    try {
      const r = await axios.get(
        `${API}/invoices/${inv.id}/payments?_t=${Date.now()}`,
        authH()
      );
  
      setPayments(r.data.payments || []);
  
      setPayStats({
        total_mga: Number(r.data.total_mga || inv.total_mga || 0),
        paid_total_mga: Number(r.data.paid_total_mga || 0),
        balance_mga: Number(r.data.balance_mga ?? inv.total_mga ?? 0),
        payment_status: r.data.payment_status || inv.status || 'UNPAID'
      });
    } catch (error) {
      console.error('fetchPayments error:', error?.response?.data || error.message);
      setPayments([]);
      setPayStats({
        total_mga: Number(inv.total_mga || 0),
        paid_total_mga: 0,
        balance_mga: Number(inv.total_mga || 0)
      });
    }
  };
  
  /* Form items */
  const addItem    = () => setForm(f=>({...f,items:[...f.items,{description:'',procedure_code:'',quantity:1,unit_price_mga:'',tooth_number:''}]}));
  const removeItem = i => { if(form.items.length>1) setForm(f=>({...f,items:f.items.filter((_,idx)=>idx!==i)})); };
  const updateItem = (i,k,v) => setForm(f=>{const it=[...f.items];it[i]={...it[i],[k]:v};return{...f,items:it};});

  const sub   = () => form.items.reduce((s,i)=>s+(i.quantity*(parseFloat(i.unit_price_mga)||0)),0);
  const total = () => { const s=sub(); return s-(s*form.discount_percentage/100); };

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true);
    try {
      if (!form.schedule_id) { toast.error('Grille tarifaire requise'); setSaving(false); return; }
      await axios.post(`${API}/invoices`, {
        patient_id: form.patient_id,
        schedule_id: form.schedule_id,
        date_issued: new Date().toISOString().split('T')[0],
        items: form.items.filter(i=>i.description).map(i=>({ description:i.description, procedure_code:i.procedure_code, quantity:parseInt(i.quantity), unit_price_mga:parseFloat(i.unit_price_mga), tooth_number:i.tooth_number||null })),
        discount_percentage: form.discount_percentage,
        payment_method: form.payment_method || null,
        notes: form.notes,
      }, authH());
      toast.success('Facture créée !'); setIsOpen(false); setForm(emptyForm); fetchInvoices(statusF!=='ALL'?statusF:undefined);
    } catch(e){ toast.error(e.response?.data?.error||'Erreur'); }
    finally { setSaving(false); }
  };

  // const handlePayment = async () => {
  //   if (!payData.amount_mga || parseFloat(payData.amount_mga) <= 0) { toast.error('Montant requis'); return; }
  //   try {
  //     await axios.post(`${API}/invoices/${payInv.id}/payments`, { ...payData, amount_mga: parseFloat(payData.amount_mga) }, authH());
  //     toast.success('Paiement enregistré !');
  //     setPayData({ amount_mga:'', payment_method:'CASH', reference_number:'' });
  //     // fetchPayments(payInv);
  //     // fetchInvoices(statusF!=='ALL'?statusF:undefined);
  //     // fetchRevenues();
  //     await fetchPayments(payInv);
  //     await fetchInvoices(statusF !== 'ALL' ? statusF : undefined);
  //     await fetchRevenues();
  //   } catch(e){ toast.error(e.response?.data?.error||'Erreur paiement'); }
  // };

  const handlePayment = async () => {
    const amount = parseFloat(payData.amount_mga);
  
    if (!payData.amount_mga || amount <= 0) {
      toast.error('Montant requis');
      return;
    }
  
    try {
      const paymentPayload = {
        ...payData,
        amount_mga: amount,
        reference_number: canUsePaymentReference(payData.payment_method)
          ? payData.reference_number
          : ''
      };
  
      await axios.post(
        `${API}/invoices/${payInv.id}/payments`,
        paymentPayload,
        authH()
      );
  
      toast.success('Paiement enregistré !');
  
      setPayData({
        amount_mga: '',
        payment_method: 'CASH',
        reference_number: ''
      });
  
      await fetchPayments(payInv);
      await fetchInvoices(statusF !== 'ALL' ? statusF : undefined);
      await fetchRevenues();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur paiement');
    }
  };
// 
  const handlePrint = async id => {
    try {
      const popup = window.open('', '_blank');
      if (!popup) {
        toast.error("Autorisez les fenêtres contextuelles pour imprimer la facture");
        return;
      }

      const response = await fetch(`${API}/invoices/${id}/print`, {
        credentials: 'include'
      });

      if (!response.ok) {
        popup.close();
        throw new Error('print_failed');
      }

      const html = await response.text();
      renderHtmlInPopup(popup, html);
    } catch (error) {
      toast.error('Erreur impression facture');
    }
  };
  const handlePDF = async (id, num) => {
    try {
      const r=await fetch(`${API}/invoices/${id}/pdf`,{credentials:'include'});
      if(!r.ok){toast.error('Erreur PDF');return;}
      const blob=await r.blob(), url=window.URL.createObjectURL(blob), a=document.createElement('a');
      a.href=url;a.download=`${num||'facture'}.pdf`;document.body.appendChild(a);a.click();document.body.removeChild(a);window.URL.revokeObjectURL(url);
      toast.success('PDF téléchargé');
    } catch { toast.error('Erreur PDF'); }
  };

  // const openPayModal = async inv => {
  //   setPayInv(inv);
  //   setIsPayOpen(true);
  //   // Charger les paiements et pré-remplir avec le solde restant
  //   try {
  //     const r = await axios.get(`${API}/invoices/${inv.id}/payments`, authH());
  //     const stats = r.data.stats || { total_mga:0, paid_total_mga:0, balance_mga:0 };
  //     setPayments(r.data.payments || []);
  //     setPayStats(stats);
  //     // Pré-remplir avec le solde restant
  //     const solde = stats.balance_mga != null ? stats.balance_mga : parseFloat(inv.total_mga || 0);
  //     setPayData(d => ({ ...d, amount_mga: solde > 0 ? String(Math.round(solde)) : '' }));
  //   } catch {
  //     setPayments([]);
  //     setPayData(d => ({ ...d, amount_mga: String(Math.round(parseFloat(inv.total_mga || 0))) }));
  //   }
  // };

  const openPayModal = async inv => {
    setPayInv(() => inv);
    setIsPayOpen(true);
  
    try {
      const r = await axios.get(
        `${API}/invoices/${inv.id}/payments?_t=${Date.now()}`,
        authH()
      );
  
      const stats = {
        total_mga: Number(r.data.total_mga || inv.total_mga || 0),
        paid_total_mga: Number(r.data.paid_total_mga || 0),
        balance_mga: Number(r.data.balance_mga ?? inv.total_mga ?? 0),
        payment_status: r.data.payment_status || inv.status || 'UNPAID'
      };
  
      setPayments(r.data.payments || []);
      setPayStats(stats);
  
      setPayData(d => ({
        ...d,
        amount_mga: stats.balance_mga > 0 ? String(Math.round(stats.balance_mga)) : ''
      }));
    } catch (error) {
      console.error('openPayModal error:', error?.response?.data || error.message);
  
      setPayments([]);
      setPayStats({
        total_mga: Number(inv.total_mga || 0),
        paid_total_mga: 0,
        balance_mga: Number(inv.total_mga || 0)
      });
  
      setPayData(d => ({
        ...d,
        amount_mga: String(Math.round(Number(inv.total_mga || 0)))
      }));
    }
  };
  
  const getPatient = inv => inv.patient || patients.find(p=>p.id===inv.patient_id) || null;
  const pname = invOrId => {
    const p = typeof invOrId === 'object' ? getPatient(invOrId) : patients.find(p=>p.id===invOrId);
    return p?`${p.first_name} ${p.last_name}`:'—';
  };
  const getStatus = inv => inv.payment_status || inv.status || 'DRAFT';

  const activeSearch = search.trim();
  const filtered = invoices
    .filter(inv => {
      const ms = statusF==='ALL'||getStatus(inv)===statusF;
      const mt = matchesSearch(search, inv.invoice_number, inv.status, patientSearchText(getPatient(inv) || {}));
      return ms&&mt;
    })
    .sort((a, b) => activeSearch
      ? scoreSearchMatch(activeSearch, b.invoice_number, b.status, patientSearchText(getPatient(b) || {}))
        - scoreSearchMatch(activeSearch, a.invoice_number, a.status, patientSearchText(getPatient(a) || {}))
      : 0);

  const stats = {
    total:    invoices.length,
    paid:     invoices.filter(i=>getStatus(i)==='PAID').length,
    pending:  invoices.filter(i=>['PENDING','PARTIAL','DRAFT'].includes(getStatus(i))).length,
    overdue:  invoices.filter(i=>getStatus(i)==='OVERDUE').length,
    revenue:  invoices.filter(i=>getStatus(i)==='PAID').reduce((s,i)=>s+parseFloat(i.total_mga||0),0),
    receipts: revenues.reduce((s,r)=>s+parseFloat(r.amount_mga||0),0),
    balance:  invoices.filter(i=>['PENDING','PARTIAL','OVERDUE'].includes(getStatus(i))).reduce((s,i)=>s+parseFloat(i.total_mga||0),0),
  };

  const filtFees = fees.filter(f=>(f.label||'').toLowerCase().includes(feeSearch.toLowerCase())||(f.procedure_code||'').toLowerCase().includes(feeSearch.toLowerCase())).slice(0,8);
  const patientMatches = patients
    .filter(p => matchesSearch(patientSearch, patientIdentifier(p), patientSearchText(p)))
    .sort((a, b) => patientSearch.trim()
      ? scoreSearchMatch(patientSearch, patientIdentifier(b), patientSearchText(b))
        - scoreSearchMatch(patientSearch, patientIdentifier(a), patientSearchText(a))
      : 0)
    .slice(0, 20);
  const selectedPatient = patients.find(p => p.id === form.patient_id);
  const patientOptions = selectedPatient && !patientMatches.some(p => p.id === selectedPatient.id)
    ? [selectedPatient, ...patientMatches]
    : patientMatches;

  if(loading) return(
    <div style={{ maxWidth: 1100,margin:'0 auto',paddingBottom:48 }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ display:'flex',flexDirection:'column',gap:12 }}>{Array(5).fill(0).map((_,i)=><Skel key={i} h={80} r={14}/>)}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100,margin:'0 auto',paddingBottom:48 }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.inv-card{animation:fadeUp .3s ease both}`}</style>

      {/* En-tête */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22,flexWrap:'wrap',gap:12 }}>
        <div style={{ display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ width:44,height:44,borderRadius:13,background:'linear-gradient(135deg,#10B981,#059669)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 14px rgba(16,185,129,.3)' }}>
            <FileText size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{ fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:22,color:'#0F172A',margin:0 }}>Factures</h1>
            <p style={{ color:'#64748B',fontSize:13,margin:0 }}>{invoices.length} factures · {fmt(stats.revenue)} encaissés</p>
          </div>
        </div>
        <div style={{ display:'flex',gap:8 }}>
          <button type="button" aria-label="Rafraîchir les factures" onClick={fetchAll} style={{ padding:'8px 13px',borderRadius:10,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontSize:13,fontWeight:600,color:'#475569' }}>
            <RefreshCw size={13}/>
          </button>
          <button type="button" onClick={()=>{setForm(emptyForm);setPatientSearch('');setPatients([]);setFees([]);setIsOpen(true);}}
            style={{ padding:'9px 18px',borderRadius:10,background:'linear-gradient(135deg,#10B981,#059669)',color:'#fff',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:14,fontWeight:700,boxShadow:'0 4px 14px rgba(16,185,129,.3)' }}>
            <Plus size={15}/>Nouvelle Facture
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:12,marginBottom:20 }}>
        {[
          {icon:'🧾',l:'Total',        v:stats.total,   c:C.teal,  bg:'#F0FDFE'},
          {icon:'✅',l:'Payées',        v:stats.paid,    c:C.green, bg:'#DCFCE7'},
          {icon:'⏳',l:'En attente',   v:stats.pending, c:C.amber, bg:'#FFFBEB'},
          {icon:'🔴',l:'En retard',    v:stats.overdue, c:C.red,   bg:'#FEE2E2'},
          {icon:'💰',l:'Factures payées', v:fmt(stats.revenue), c:C.green,bg:'#DCFCE7',raw:true},
          {icon:'🧾',l:'Recettes cabinet', v:fmt(stats.receipts), c:C.teal,bg:'#F0FDFE',raw:true},
          {icon:'💸',l:'À encaisser',  v:fmt(stats.balance), c:C.amber,bg:'#FFFBEB',raw:true},
        ].map((k,i)=>(
          <div key={i} style={{ background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',padding:'13px 15px',display:'flex',alignItems:'center',gap:11 }}>
            <div style={{ width:36,height:36,borderRadius:10,background:k.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>{k.icon}</div>
            <div>
              <div style={{ fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:k.raw?13:20,color:'#0F172A',lineHeight:1 }}>{k.v}</div>
              <div style={{ fontSize:11,color:'#64748B',marginTop:2 }}>{k.l}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Barre filtre */}
      <div style={{ background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',padding:'11px 16px',marginBottom:16,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center' }}>
        <div style={{ display:'flex',alignItems:'center',gap:7,flex:1,minWidth:200 }}>
          <Search size={13} color="#94A3B8"/>
          <input aria-label="Rechercher une facture" placeholder="Rechercher facture, patient..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{ border:'none',background:'transparent',outline:'none',fontSize:13,flex:1 }}/>
          {search&&<button type="button" aria-label="Effacer la recherche" onClick={()=>setSearch('')} style={{ background:'none',border:'none',cursor:'pointer',color:'#94A3B8',padding:0 }}><X size={12}/></button>}
        </div>
        <div style={{ display:'flex',gap:5,flexWrap:'wrap' }}>
          {['ALL',...Object.keys(INV_STATUS)].map(s=>{
            const st=INV_STATUS[s];
            return(
              <button type="button" key={s} onClick={()=>{setStatusF(s);fetchInvoices(s!=='ALL'?s:undefined);}}
                style={{ padding:'5px 11px',borderRadius:99,border:'none',cursor:'pointer',fontSize:11,fontWeight:600,background:statusF===s?(st?.bg||'#F0FDFE'):'#F1F5F9',color:statusF===s?(st?.c||C.teal):'#64748B',transition:'all .15s' }}>
                {s==='ALL'?'Toutes':st?.l}
              </button>
            );
          })}
        </div>
        <span style={{ fontSize:11,color:'#94A3B8' }}>{filtered.length} résultat(s)</span>
      </div>

      {/* Liste */}
      {revenues.length > 0 && (
        <div style={{ background:'#fff',borderRadius:18,border:'1px solid #E2E8F0',overflow:'hidden',marginBottom:16 }}>
          <div style={{ padding:'14px 18px',borderBottom:'1px solid #F1F5F9',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,background:'#FAFBFC' }}>
            <div style={{ display:'flex',alignItems:'center',gap:8 }}>
              <Receipt size={16} color={C.teal}/>
              <div>
                <div style={{ fontWeight:800,fontSize:14,color:'#0F172A' }}>Recettes du cabinet</div>
                <div style={{ fontSize:11,color:'#94A3B8' }}>{revenues.length} encaissement(s)</div>
              </div>
            </div>
            <div style={{ fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:15,color:C.teal }}>{fmt(stats.receipts)}</div>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:8,padding:12 }}>
            {revenues.slice(0, 8).map(r=>(
              <div key={r.id} style={{ padding:'10px 12px',borderRadius:11,background:'#F0FDFE',border:'1px solid #7DD3DA',display:'flex',justifyContent:'space-between',gap:10,alignItems:'center' }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:12,fontWeight:800,color:'#0F172A' }}>{r.payment_number || r.invoice_number}</div>
                  <div style={{ fontSize:11,color:'#64748B',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{r.patient_name} · {fdate(r.payment_date)} · {PMETHODS.find(m=>m.v===r.payment_method)?.l||r.payment_method}</div>
                </div>
                <span style={{ fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:13,color:C.green,whiteSpace:'nowrap' }}>{fmt(r.amount_mga)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length===0?(
        <div style={{ background:'#fff',borderRadius:18,border:'1px solid #E2E8F0',padding:'52px',textAlign:'center' }}>
          <FileText size={40} style={{ margin:'0 auto 14px',color:'#CBD5E1' }}/>
          <p style={{ fontWeight:700,color:'#475569',fontSize:15,margin:'0 0 6px' }}>Aucune facture</p>
          <p style={{ color:'#94A3B8',fontSize:13,margin:'0 0 18px' }}>{search?`Aucun résultat pour "${search}"`:'Créez votre première facture'}</p>
          <button type="button" onClick={()=>{setForm(emptyForm);setPatientSearch('');setPatients([]);setIsOpen(true);}} style={{ padding:'10px 22px',borderRadius:11,background:'linear-gradient(135deg,#10B981,#059669)',color:'#fff',border:'none',cursor:'pointer',fontSize:14,fontWeight:700 }}>
            Nouvelle facture
          </button>
        </div>
      ):(
        <div style={{ background:'#fff',borderRadius:18,border:'1px solid #E2E8F0',overflow:'hidden' }}>
          {filtered.map((inv,idx)=>{
            const st = getStatus(inv);
            const stInfo = INV_STATUS[st] || INV_STATUS.DRAFT;
            const isPaid = st==='PAID';
            const isOverdue = st==='OVERDUE';
            return(
              <div key={inv.id} className="inv-card" style={{ padding:'15px 20px',borderBottom:idx<filtered.length-1?'1px solid #F8FAFC':'none',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap',transition:'background .15s',animationDelay:`${Math.min(idx,.15)*.04}s`,borderLeft:`3px solid ${stInfo.dot}` }}
                onMouseOver={e=>e.currentTarget.style.background='#FAFBFC'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                {/* Infos */}
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap' }}>
                    <span style={{ fontFamily:'Plus Jakarta Sans',fontWeight:700,fontSize:14,color:'#0F172A' }}>{inv.invoice_number}</span>
                    <SBadge st={st}/>
                    {isOverdue&&<span style={{ fontSize:10,fontWeight:700,color:C.red,background:'#FEE2E2',padding:'1px 7px',borderRadius:99 }}>⚠️ Paiement en retard</span>}
                  </div>
                  <div style={{ display:'flex',gap:14,fontSize:12,color:'#64748B',flexWrap:'wrap',alignItems:'center' }}>
                    <span style={{ display:'flex',alignItems:'center',gap:4 }}><User size={11}/>{pname(inv)}</span>
                    <span style={{ display:'flex',alignItems:'center',gap:4 }}><Calendar size={11}/>{fdate(inv.invoice_date||inv.created_at)}</span>
                    <span style={{ fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:14,color:isPaid?C.green:isOverdue?C.red:C.teal }}>{fmt(inv.total_mga)}</span>
                    {inv.discount_percentage>0&&<span style={{ fontSize:11,color:C.amber }}>−{inv.discount_percentage}%</span>}
                  </div>
                </div>
                {/* Actions */}
                <div style={{ display:'flex',gap:5,flexShrink:0,alignItems:'center' }}>
                  {!isPaid&&(
                    <button type="button" onClick={()=>openPayModal(inv)}
                      style={{ padding:'6px 12px',borderRadius:9,background:C.green,color:'#fff',border:'none',cursor:'pointer',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',gap:5 }}>
                      <DollarSign size={12}/>Payer
                    </button>
                  )}
                  <button type="button" aria-label="Afficher les détails de la facture" onClick={()=>setDetailInv(inv)} title="Détails"
                    style={{ width:30,height:30,borderRadius:8,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#94A3B8',transition:'all .15s' }}
                    onMouseOver={e=>{e.currentTarget.style.borderColor=C.teal;e.currentTarget.style.color=C.teal;}} onMouseOut={e=>{e.currentTarget.style.borderColor='#E2E8F0';e.currentTarget.style.color='#94A3B8';}}>
                    <Eye size={13}/>
                  </button>
                  <button type="button" aria-label="Imprimer la facture" onClick={()=>handlePrint(inv.id)} title="Imprimer"
                    style={{ width:30,height:30,borderRadius:8,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#94A3B8',transition:'all .15s' }}
                    onMouseOver={e=>{e.currentTarget.style.borderColor=C.blue;e.currentTarget.style.color=C.blue;}} onMouseOut={e=>{e.currentTarget.style.borderColor='#E2E8F0';e.currentTarget.style.color='#94A3B8';}}>
                    <Printer size={13}/>
                  </button>
                  <button type="button" aria-label="Télécharger la facture en PDF" onClick={()=>handlePDF(inv.id,inv.invoice_number)} title="PDF"
                    style={{ width:30,height:30,borderRadius:8,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#94A3B8',transition:'all .15s' }}
                    onMouseOver={e=>{e.currentTarget.style.borderColor=C.purple;e.currentTarget.style.color=C.purple;}} onMouseOut={e=>{e.currentTarget.style.borderColor='#E2E8F0';e.currentTarget.style.color='#94A3B8';}}>
                    <Download size={13}/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ MODAL DÉTAIL FACTURE ══ */}
      <Modal open={!!detailInv} onClose={()=>setDetailInv(null)} title={`🧾 Facture — ${detailInv?.invoice_number}`} maxW={560}>
        {detailInv&&(
          <div>
            <div style={{ display:'flex',gap:10,flexWrap:'wrap',marginBottom:16 }}>
              <SBadge st={getStatus(detailInv)}/>
              <span style={{ fontSize:12,color:'#64748B' }}>{pname(detailInv)}</span>
              <span style={{ fontSize:12,color:'#64748B' }}>{fdate(detailInv.invoice_date||detailInv.created_at)}</span>
            </div>
            <div style={{ background:'#F8FAFC',borderRadius:12,padding:'14px',marginBottom:16 }}>
              <div style={{ fontSize:11,fontWeight:700,color:'#94A3B8',textTransform:'uppercase',letterSpacing:1.5,marginBottom:10 }}>Prestations</div>
              {(detailInv.items||[]).map((item,i)=>(
                <div key={i} style={{ display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:i<detailInv.items.length-1?'1px solid #E2E8F0':'none' }}>
                  <div>
                    <div style={{ fontSize:13,fontWeight:600,color:'#0F172A' }}>{item.description}</div>
                    {item.tooth_number&&<div style={{ fontSize:11,color:'#94A3B8' }}>Dent #{item.tooth_number}</div>}
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:12,color:'#64748B' }}>{item.quantity} × {fmt(item.unit_price_mga)}</div>
                    <div style={{ fontWeight:700,fontSize:13,color:'#0F172A' }}>{fmt((item.quantity||1)*(item.unit_price_mga||0))}</div>
                  </div>
                </div>
              ))}
              {detailInv.discount_percentage>0&&<div style={{ display:'flex',justifyContent:'space-between',paddingTop:8,marginTop:6,fontSize:12,color:C.amber }}>
                <span>Remise {detailInv.discount_percentage}%</span>
                <span>−{fmt((detailInv.subtotal_mga||0)*(detailInv.discount_percentage/100))}</span>
              </div>}
              <div style={{ display:'flex',justifyContent:'space-between',paddingTop:10,marginTop:8,borderTop:'2px solid #E2E8F0' }}>
                <span style={{ fontFamily:'Plus Jakarta Sans',fontWeight:700,color:'#0F172A' }}>Total</span>
                <span style={{ fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:20,color:C.teal }}>{fmt(detailInv.total_mga)}</span>
              </div>
            </div>
            {detailInv.notes&&<div style={{ background:'#FFFBEB',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:12,color:'#92400E' }}>📝 {detailInv.notes}</div>}
            <div style={{ display:'flex',gap:8 }}>
              {getStatus(detailInv)!=='PAID'&&<button type="button" onClick={()=>{setDetailInv(null);openPayModal(detailInv);}} style={{ flex:1,padding:'10px',borderRadius:10,background:C.green,color:'#fff',border:'none',cursor:'pointer',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
                <DollarSign size={14}/>Enregistrer paiement
              </button>}
              <button type="button" onClick={()=>handlePrint(detailInv.id)} style={{ flex:1,padding:'10px',borderRadius:10,border:'1.5px solid #E2E8F0',background:'#fff',color:'#475569',cursor:'pointer',fontSize:13,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}>
                <Printer size={14}/>Imprimer
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ══ MODAL PAIEMENT ══ */}
      <Modal open={isPayOpen} onClose={()=>{setIsPayOpen(false);setPayInv(null);setPayments([]);setPayData({amount_mga:'',payment_method:'CASH',reference_number:''});}} title={`💳 Paiement — ${payInv?.invoice_number}`} maxW={520}>
        {payInv&&(
          <div>
            {/* Résumé solde */}
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:18 }}>
              {[
                {l:'Total',     v:fmt(payStats.total_mga||payInv.total_mga||0),   c:C.teal},
                {l:'Payé',      v:fmt(payStats.paid_total_mga||0),                c:C.green},
                {l: 'Reste à payer', v: fmt(payStats.balance_mga != null ? payStats.balance_mga : (payInv.total_mga || 0)), c: C.amber}
              ].map((s,i)=>(
                <div key={i} style={{ background:'#F8FAFC',borderRadius:12,padding:'11px 14px',border:'1px solid #E2E8F0',textAlign:'center' }}>
                  <div style={{ fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:16,color:s.c }}>{s.v}</div>
                  <div style={{ fontSize:11,color:'#64748B',marginTop:2 }}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Historique paiements */}
            {payments.length>0&&(
              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:11,fontWeight:700,color:'#94A3B8',textTransform:'uppercase',letterSpacing:1.5,marginBottom:8 }}>Paiements reçus</div>
                {payments.map((p,i)=>(
                  <div key={i} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'#F8FAFC',borderRadius:10,marginBottom:6 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:7 }}>
                      <span style={{ fontSize:16 }}>{PMETHODS.find(m=>m.v===p.payment_method)?.icon||'💵'}</span>
                      <div>
                        <div style={{ fontSize:12,fontWeight:600,color:'#0F172A' }}>{PMETHODS.find(m=>m.v===p.payment_method)?.l||p.payment_method}</div>
                        <div style={{ fontSize:10,color:'#94A3B8' }}>{fdate(p.payment_date)}{p.reference_number?` · ${p.reference_number}`:''}</div>
                      </div>
                    </div>
                    <span style={{ fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:14,color:C.green }}>{fmt(p.amount_mga)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Nouveau paiement */}
            <div style={{ background:'#F0FDFE',borderRadius:14,padding:'16px',border:'1px solid #7DD3DA' }}>
              <div style={{ fontSize:11,fontWeight:700,color:C.teal,textTransform:'uppercase',letterSpacing:1.5,marginBottom:12 }}>+ Nouveau paiement</div>
              <div style={{ marginBottom:12 }}>
                <label htmlFor="invoice-payment-amount" style={{ fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:5 }}>Montant (Ar) *</label>
                <input id="invoice-payment-amount" aria-label="Montant du paiement" type="number" min="0" value={payData.amount_mga} onChange={e=>setPayData({...payData,amount_mga:e.target.value})}
                  placeholder={`Solde restant: ${fmt(payStats.balance_mga!=null?payStats.balance_mga:payInv.total_mga||0)} Ar`}
                  style={inp} onFocus={fi} onBlur={bi}/>
                {/* Bouton solde complet */}
                {payStats.balance_mga>0&&<button type="button" onClick={()=>setPayData({...payData,amount_mga:String(payStats.balance_mga)})}
                  style={{ marginTop:5,padding:'3px 10px',borderRadius:8,border:'1px solid #7DD3DA',background:'#fff',color:C.teal,cursor:'pointer',fontSize:11,fontWeight:700 }}>
                  Solde complet
                </button>}
              </div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:12,fontWeight:600,color:'#475569',marginBottom:8 }}>Méthode de paiement</div>
                <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6 }}>
                  {PMETHODS.map(m=>(
                    <button key={m.v} type="button" onClick={()=>setPayData(prev => ({...prev, payment_method: m.v, reference_number: canUsePaymentReference(m.v) ? prev.reference_number : ''}))}
                      style={{ padding:'8px 4px',borderRadius:10,border:`2px solid ${payData.payment_method===m.v?C.teal:'#E2E8F0'}`,background:payData.payment_method===m.v?'#F0FDFE':'#fff',cursor:'pointer',fontSize:10,fontWeight:700,color:payData.payment_method===m.v?C.teal:'#64748B',textAlign:'center',transition:'all .15s' }}>
                      <div style={{ fontSize:18,marginBottom:2 }}>{m.icon}</div>
                      {m.l}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom:14 }}>
              {/*<label style={{ fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:5 }}>Référence (optionnel)</label>
                <input value={payData.reference_number} onChange={e=>setPayData({...payData,reference_number:e.target.value})}
                  placeholder="N° transaction MVola, chèque..." style={inp} onFocus={fi} onBlur={bi}/>*/}
              <label htmlFor="invoice-payment-reference" style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>
                  Référence {canUsePaymentReference(payData.payment_method) ? '(optionnel)' : '(non applicable)'}
                </label>
                
                <input
                  id="invoice-payment-reference"
                  aria-label="Référence du paiement"
                  value={payData.reference_number}
                  onChange={(e) => {
                    if (!canUsePaymentReference(payData.payment_method)) return;
                
                    setPayData({
                      ...payData,
                      reference_number: e.target.value
                    });
                  }}
                  disabled={!canUsePaymentReference(payData.payment_method)}
                  placeholder={
                    canUsePaymentReference(payData.payment_method)
                      ? 'N° transaction MVola, chèque, carte...'
                      : 'Non applicable pour paiement en espèces'
                  }
                  style={{
                    ...inp,
                    background: canUsePaymentReference(payData.payment_method) ? '#FFFFFF' : '#F1F5F9',
                    color: canUsePaymentReference(payData.payment_method) ? '#0F172A' : '#94A3B8',
                    cursor: canUsePaymentReference(payData.payment_method) ? 'text' : 'not-allowed'
                  }}
                  onFocus={fi}
                  onBlur={bi}
                />
              </div>
              <button type="button" onClick={handlePayment} style={{ width:'100%',padding:'12px',borderRadius:11,background:'linear-gradient(135deg,#10B981,#059669)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
                <CheckCircle size={16}/>Valider le paiement
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ══ MODAL NOUVELLE FACTURE ══ */}
      <Modal open={isOpen} onClose={()=>setIsOpen(false)} title="🧾 Nouvelle facture" maxW={720}>
        <form onSubmit={handleSubmit} style={{ display:'flex',flexDirection:'column',gap:14 }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div>
              <label htmlFor="invoice-patient-search" style={{ fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:5 }}>Patient *</label>
              <div style={{ position:'relative', marginBottom:7 }}>
                <Search size={13} color="#94A3B8" style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)' }}/>
                <input
                  id="invoice-patient-search"
                  aria-label="Rechercher un patient"
                  value={patientSearch}
                  onChange={e=>setPatientSearch(e.target.value)}
                  placeholder="Rechercher par nom, ID, téléphone, email..."
                  style={{ ...inp, paddingLeft:32 }}
                  onFocus={fi}
                  onBlur={bi}
                />
              </div>
              <select aria-label="Patient de la facture" value={form.patient_id} onChange={e=>setForm({...form,patient_id:e.target.value})} style={inp} onFocus={fi} onBlur={bi} required>
                <option value="">Sélectionner...</option>
                {patientOptions.map(p=><option key={p.id} value={p.id}>{patientIdentifier(p)} · {p.first_name} {p.last_name}{p.phone_primary ? ` · ${p.phone_primary}` : ''}</option>)}
              </select>
              <div style={{ fontSize:11, color:'#94A3B8', marginTop:5 }}>
                {patientSearch.trim().length < 2
                  ? 'Tapez au moins 2 caractères pour rechercher'
                  : patientLoading
                    ? 'Recherche en cours...'
                    : `${patientOptions.length} patient(s) trouvé(s)`}
              </div>
            </div>
            <div>
              <label htmlFor="invoice-pricing-schedule" style={{ fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:5 }}>Grille tarifaire *</label>
              <select id="invoice-pricing-schedule" aria-label="Grille tarifaire" value={form.schedule_id} onChange={e=>{setForm({...form,schedule_id:e.target.value});fetchFees(e.target.value);}} style={inp} onFocus={fi} onBlur={bi} required>
                <option value="">Sélectionner...</option>
                {schedules.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Remise présets */}
          <div>
            <div style={{ fontSize:12,fontWeight:600,color:'#475569',marginBottom:6 }}>Remise</div>
            <div style={{ display:'flex',gap:6,flexWrap:'wrap',alignItems:'center' }}>
              {DISCOUNT_PRESETS.map(d=>(
                <button key={d.n} type="button" onClick={()=>setForm({...form,discount_percentage:d.p})}
                  style={{ padding:'4px 12px',borderRadius:8,border:`1.5px solid ${form.discount_percentage===d.p?C.amber:'#E2E8F0'}`,background:form.discount_percentage===d.p?'#FFFBEB':'#fff',color:form.discount_percentage===d.p?C.amber:'#475569',cursor:'pointer',fontSize:11,fontWeight:700 }}>
                  {d.n} ({d.p}%)
                </button>
              ))}
              <div style={{ display:'flex',alignItems:'center',gap:5 }}>
                <input aria-label="Remise en pourcentage" type="number" min="0" max="100" value={form.discount_percentage} onChange={e=>setForm({...form,discount_percentage:parseFloat(e.target.value)||0})}
                  style={{ ...inp,width:70 }} onFocus={fi} onBlur={bi}/>
                <span style={{ fontSize:12,color:'#64748B' }}>%</span>
              </div>
            </div>
          </div>

          {/* Actes depuis grille */}
          {fees.length>0&&(
            <div style={{ background:'#F0FDFE',borderRadius:12,padding:'12px 14px',border:'1px solid #7DD3DA' }}>
              <div style={{ fontSize:11,fontWeight:700,color:C.teal,textTransform:'uppercase',letterSpacing:1.5,marginBottom:8 }}>
                <Sparkles size={11} style={{ display:'inline',marginRight:4 }}/>Actes de la grille
              </div>
              <input aria-label="Rechercher un acte de la grille" value={feeSearch} onChange={e=>setFeeSearch(e.target.value)} placeholder="Rechercher un acte..." style={{ ...inp,marginBottom:8 }} onFocus={fi} onBlur={bi}/>
              <div style={{ display:'flex',gap:5,flexWrap:'wrap' }}>
                {filtFees.map(f=>(
                  <button key={f.id} type="button" onClick={()=>setForm(fm=>({...fm,items:[...fm.items.filter(i=>i.description),{description:f.label,procedure_code:f.procedure_code||'',quantity:1,unit_price_mga:String(f.price_mga),tooth_number:''}]}))}
                    style={{ padding:'4px 11px',borderRadius:8,border:'1px solid #7DD3DA',background:'#fff',color:C.teal,fontSize:11,fontWeight:600,cursor:'pointer' }}>
                    {f.label} · {fmt(f.price_mga)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Items */}
          <div>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
              <span style={{ fontSize:12,fontWeight:600,color:'#475569' }}>Prestations</span>
              <button type="button" onClick={addItem} style={{ padding:'4px 11px',borderRadius:8,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer',fontSize:11,fontWeight:600,color:'#475569',display:'flex',alignItems:'center',gap:4 }}>
                <Plus size={11}/>Ajouter
              </button>
            </div>
            {form.items.map((item,i)=>(
              <div key={i} style={{ display:'grid',gridTemplateColumns:'1fr 55px 110px 75px 28px',gap:6,marginBottom:6,alignItems:'center' }}>
                <input aria-label={`Description de la prestation ${i + 1}`} value={item.description} onChange={e=>updateItem(i,'description',e.target.value)} placeholder="Description" style={inp} onFocus={fi} onBlur={bi}/>
                <input aria-label={`Quantité de la prestation ${i + 1}`} type="number" min="1" value={item.quantity} onChange={e=>updateItem(i,'quantity',parseInt(e.target.value)||1)} placeholder="Qté" style={inp} onFocus={fi} onBlur={bi}/>
                <input aria-label={`Prix de la prestation ${i + 1}`} type="number" min="0" value={item.unit_price_mga} onChange={e=>updateItem(i,'unit_price_mga',e.target.value)} placeholder="Prix Ar" style={inp} onFocus={fi} onBlur={bi}/>
                <div style={{ background:'#F8FAFC',borderRadius:10,padding:'9px 8px',fontSize:11,fontWeight:700,color:C.teal,textAlign:'right',border:'1px solid #E2E8F0' }}>
                  {fmt((item.quantity||0)*(parseFloat(item.unit_price_mga)||0))}
                </div>
                <button type="button" aria-label={`Retirer la prestation ${i + 1}`} onClick={()=>removeItem(i)} style={{ width:28,height:28,borderRadius:7,border:'1px solid #FECACA',background:'#FFF5F5',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#EF4444' }}>
                  <X size={12}/>
                </button>
              </div>
            ))}
            <div style={{ background:'#DCFCE7',border:'1px solid #86EFAC',borderRadius:12,padding:'12px 16px',marginTop:10,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <div>
                <div style={{ fontSize:11,color:'#64748B' }}>Sous-total : {fmt(sub())}</div>
                {form.discount_percentage>0&&<div style={{ fontSize:11,color:C.amber }}>Remise {form.discount_percentage}% : −{fmt(sub()*form.discount_percentage/100)}</div>}
              </div>
              <div style={{ fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:20,color:C.green }}>{fmt(total())}</div>
            </div>
          </div>

          <div>
            <label htmlFor="invoice-notes" style={{ fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:5 }}>Notes</label>
            <textarea id="invoice-notes" aria-label="Notes internes de la facture" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} placeholder="Notes internes..." style={{ ...inp,resize:'vertical' }} onFocus={fi} onBlur={bi}/>
          </div>

          <div style={{ display:'flex',justifyContent:'flex-end',gap:8,paddingTop:8,borderTop:'1px solid #F1F5F9' }}>
            <button type="button" onClick={()=>setIsOpen(false)} style={{ padding:'9px 18px',borderRadius:10,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer',fontSize:13,fontWeight:600,color:'#475569' }}>Annuler</button>
            <button type="submit" disabled={saving} style={{ padding:'9px 22px',borderRadius:10,background:'linear-gradient(135deg,#10B981,#059669)',color:'#fff',border:'none',cursor:'pointer',fontSize:14,fontWeight:700,display:'flex',alignItems:'center',gap:7,opacity:saving?.7:1 }}>
              {saving?<div style={{ width:14,height:14,border:'2px solid rgba(255,255,255,.4)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .8s linear infinite' }}/>:<Plus size={14}/>}
              Créer la facture
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default InvoiceManagement;
