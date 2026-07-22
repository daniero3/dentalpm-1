import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { matchesSearch, patientSearchText, scoreSearchMatch } from '../utils/search';
import { renderHtmlInPopup } from '../utils/printHtml';
import PartnerAds from './PartnerAds';
import {
  FlaskConical, Plus, Printer, RefreshCw, Loader2, Search,
  Clock, CheckCircle, XCircle, ArrowRight, Sparkles, X,
  Star, Phone, Mail, MapPin, Award, Zap, ExternalLink, Building2
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8001/api'
    : '/api';

const WORK_TYPES = {
  CROWN:'Couronne', BRIDGE:'Bridge', PARTIAL_DENTURE:'Prothèse partielle',
  COMPLETE_DENTURE:'Prothèse complète', IMPLANT_CROWN:'Couronne sur implant',
  ORTHODONTIC_APPLIANCE:'Appareil orthodontique', NIGHT_GUARD:'Gouttière',
  VENEER:'Facette', INLAY_ONLAY:'Inlay/Onlay', OTHER:'Autre',
};

const TARIFS = {
  CROWN:                 [{label:'Économique',m:150000},{label:'Standard',m:250000},{label:'Premium',m:400000}],
  BRIDGE:                [{label:'Économique',m:350000},{label:'Standard',m:550000},{label:'Premium',m:900000}],
  PARTIAL_DENTURE:       [{label:'Résine',m:200000},{label:'Châssis',m:450000},{label:'Flexible',m:600000}],
  COMPLETE_DENTURE:      [{label:'Standard',m:350000},{label:'Premium',m:600000},{label:'Haute qualité',m:900000}],
  IMPLANT_CROWN:         [{label:'Standard',m:500000},{label:'Zircone',m:800000},{label:'Full ceramic',m:1200000}],
  ORTHODONTIC_APPLIANCE: [{label:'Plaque simple',m:200000},{label:'Bimaxillaire',m:380000},{label:'Retainer',m:150000}],
  NIGHT_GUARD:           [{label:'Souple',m:100000},{label:'Rigide',m:180000},{label:'Double face',m:250000}],
  VENEER:                [{label:'Composite',m:120000},{label:'Céramique',m:300000},{label:'Zircone',m:500000}],
  INLAY_ONLAY:           [{label:'Composite',m:100000},{label:'Céramique',m:220000},{label:'Or',m:400000}],
  OTHER:                 [{label:'Petit',m:80000},{label:'Moyen',m:200000},{label:'Grand',m:450000}],
};

const STATUS = {
  CREATED:     {label:'Créée',    bg:'#F1F5F9',bg2:'#F1F5F9',text:'#475569',dot:'#94A3B8',icon:Clock},
  SENT:        {label:'Envoyée',  bg:'#EFF6FF',bg2:'#DBEAFE',text:'#1D4ED8',dot:'#3B82F6',icon:ArrowRight},
  IN_PROGRESS: {label:'En cours', bg:'#FFFBEB',bg2:'#FEF3C7',text:'#B45309',dot:'#F59E0B',icon:RefreshCw},
  DELIVERED:   {label:'Livrée',   bg:'#DCFCE7',bg2:'#BBF7D0',text:'#166534',dot:'#22C55E',icon:CheckCircle},
  CANCELLED:   {label:'Annulée',  bg:'#FEE2E2',bg2:'#FECACA',text:'#991B1B',dot:'#EF4444',icon:XCircle},
};

/* Labos partenaires — à terme charger depuis /api/labs/partners */
const PARTNER_LABS = [
  {
    id:1, name:'Labo Prothèse Pro', city:'Antananarivo', zone:'Analakely',
    phone:'034 12 345 67', email:'labo.prosthese@gmail.com',
    specialties:['Couronne','Bridge','Implant'],
    rating:4.9, reviews:42, delai:'5-7 jours',
    badge:'Partenaire Gold', badgeColor:'#D97706', badgeBg:'#FFFBEB',
    desc:"Spécialiste couronnes et bridges zircone. Matériaux importés, qualité garantie.",
    promo:null, featured:true,
  },
  {
    id:2, name:'Dental Lab Tana', city:'Antananarivo', zone:'Tsiadana',
    phone:'032 98 765 43', email:'dentallabtana@gmail.com',
    specialties:['Prothèse','Gouttière','Facette'],
    rating:4.7, reviews:28, delai:'7-10 jours',
    badge:'Partenaire Silver', badgeColor:'#64748B', badgeBg:'#F1F5F9',
    desc:"Expertise prothèses complètes et partielles. Collecte et livraison inclus.",
    promo:'-15% sur les gouttières ce mois', featured:false,
  },
  {
    id:3, name:'OrthoLab Madagascar', city:'Antananarivo', zone:'Ankadimbahoaka',
    phone:'033 55 444 33', email:'ortholab.mada@gmail.com',
    specialties:['Orthodontie','Appareil','Retainer'],
    rating:4.8, reviews:19, delai:'10-14 jours',
    badge:'Partenaire Silver', badgeColor:'#64748B', badgeBg:'#F1F5F9',
    desc:"Référence pour les appareils orthodontiques et rétenteurs. Équipe certifiée.",
    promo:null, featured:false,
  },
  {
    id:4, name:'Labo Céramique Plus', city:'Fianarantsoa', zone:'Centre',
    phone:'034 77 888 99', email:'ceramiqueplus.fianar@gmail.com',
    specialties:['Couronne','Facette','Inlay'],
    rating:4.6, reviews:15, delai:'8-12 jours',
    badge:'Partenaire Bronze', badgeColor:'#92400E', badgeBg:'#FEF3C7',
    desc:"Spécialiste céramique haut de gamme. Livraison nationale express disponible.",
    promo:'Livraison offerte pour Antananarivo', featured:false,
  },
];

const LAB_AD_EXAMPLES = [
  {
    id: 'lab-demo-video',
    type: 'video',
    title: 'Vidéo exemple : implantologie et prothèse',
    partner: 'Labo Prothèse Pro',
    description: 'Exemple de vidéo dentaire publique pour montrer comment un labo peut présenter une technique, une offre prothèse ou une démonstration de cas.',
    videoUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Placement%20of%20root%20analogue%20ceramic%20implant.webm',
    ctaLabel: 'Remplacer par votre vidéo',
    ctaUrl: 'mailto:labo.prosthese@gmail.com?subject=Vidéo publicité labo',
  },
  {
    id: 'lab-demo-offer',
    type: 'offer',
    title: 'Offre gouttières et retainers',
    partner: 'Dental Lab Tana',
    description: 'Exemple d’offre sponsorisée pour promouvoir une remise sur gouttières, appareils orthodontiques et retainer pendant le mois.',
    videoUrl: '',
    ctaLabel: 'Profiter de l’offre',
    ctaUrl: 'mailto:dentallabtana@gmail.com?subject=Offre gouttières',
  },
  {
    id: 'lab-demo-article',
    type: 'article',
    title: 'Article : mieux transmettre les teintes au labo',
    partner: 'Labo Céramique Plus',
    description: 'Exemple d’article labo pour expliquer comment envoyer photos, teinte, instructions et délai afin de réduire les retouches.',
    videoUrl: '',
    ctaLabel: 'Discuter avec le labo',
    ctaUrl: 'mailto:ceramiqueplus.fianar@gmail.com?subject=Conseils teinte labo',
  },
];

const authH = () => ({ withCredentials: true });
const openAuthenticatedPrint = async (url) => {
  const popup = window.open('', '_blank');
  if (!popup) {
    toast.error('Autorisez les fenêtres contextuelles pour imprimer');
    return;
  }
  try {
    const r = await fetch(url, { credentials: 'include' });
    if (!r.ok) {
      popup.close();
      toast.error('Erreur impression');
      return;
    }
    const html = await r.text();
    renderHtmlInPopup(popup, html);
  } catch {
    popup.close();
    toast.error('Erreur impression');
  }
};
const fmt   = v => new Intl.NumberFormat('fr-MG').format(v||0)+' Ar';
const fdate = d => new Date(d).toLocaleDateString('fr-FR');

/* ── Modal ── */
const modalOverlayStyle = {
  position:'fixed',
  inset:0,
  width:'100vw',
  minHeight:'100dvh',
  zIndex:5000,
  background:'rgba(15,23,42,.55)',
  backdropFilter:'blur(8px)',
  WebkitBackdropFilter:'blur(8px)',
  overflowY:'auto',
  padding:'80px 16px 32px',
  boxSizing:'border-box',
};

const getModalOverlayStyle = () => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return modalOverlayStyle;
  const sidebar = document.querySelector('.dpm-sidebar-desktop');
  const sidebarWidth = sidebar && window.innerWidth >= 768 ? sidebar.getBoundingClientRect().width : 0;
  return {
    ...modalOverlayStyle,
    paddingLeft: sidebarWidth ? sidebarWidth + 16 : 16,
  };
};

const Modal = ({open,onClose,title,children,maxW=560}) => {
  if(!open) return null;
  if(typeof document === 'undefined') return null;

  const modal = (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={getModalOverlayStyle()}>
      <div style={{background:'#fff',borderRadius:18,padding:28,width:'100%',maxWidth:maxW,margin:'0 auto',boxShadow:'0 20px 60px rgba(15,23,42,.2)',border:'1px solid #E2E8F0',position:'relative',boxSizing:'border-box'}}>
        <button type="button" aria-label="Fermer la fenêtre" onClick={onClose} style={{position:'absolute',top:14,right:14,background:'#F8FAFC',border:'none',cursor:'pointer',color:'#64748B',padding:7,borderRadius:8,display:'flex',alignItems:'center'}}>
          <X size={15}/>
        </button>
        {title&&<h2 style={{fontFamily:'Plus Jakarta Sans',fontSize:17,fontWeight:700,color:'#0F172A',margin:'0 0 20px',paddingRight:28}}>{title}</h2>}
        {children}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

/* ── Tarif Suggestions ── */
const TarifSug = ({workType,onSelect,val}) => {
  const s = TARIFS[workType]||[];
  if(!s.length) return null;
  return (
    <div style={{marginTop:8}}>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6,fontSize:11,color:'#0D7A87',fontWeight:700,textTransform:'uppercase',letterSpacing:'.04em'}}>
        <Sparkles size={11}/> Tarifs suggérés
      </div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        {s.map((t,i)=>{
          const sel=String(val)===String(t.m);
          return(<button type="button" key={i} onClick={()=>onSelect(t.m)} style={{padding:'5px 11px',borderRadius:8,border:`1.5px solid ${sel?'#0D7A87':'#7DD3DA'}`,background:sel?'#0D7A87':'#F0FDFE',color:sel?'#fff':'#0D7A87',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all .15s'}}>
            {t.label} — {new Intl.NumberFormat('fr-MG').format(t.m)} Ar
          </button>);
        })}
      </div>
    </div>
  );
};

/* ── Card labo partenaire ── */
const LabCard = ({lab,onSelect,selected,compact=false}) => (
  <div onClick={()=>onSelect&&onSelect(lab)}
    style={{border:selected?'2px solid #0D7A87':'1.5px solid #E2E8F0',borderRadius:16,padding:compact?'13px 15px':'18px 20px',background:selected?'#F0FDFE':'#fff',cursor:onSelect?'pointer':'default',transition:'all .2s',position:'relative',boxShadow:selected?'0 4px 20px rgba(13,122,135,.15)':'0 1px 4px rgba(0,0,0,.04)'}}
    onMouseOver={e=>{if(!selected&&onSelect){e.currentTarget.style.borderColor='#0D7A87';e.currentTarget.style.boxShadow='0 4px 16px rgba(13,122,135,.1)';}}}
    onMouseOut={e=>{if(!selected&&onSelect){e.currentTarget.style.borderColor='#E2E8F0';e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.04)';}}}>
    {lab.featured&&<div style={{position:'absolute',top:-9,right:14,background:'linear-gradient(135deg,#F59E0B,#D97706)',color:'#fff',fontSize:10,fontWeight:800,padding:'2px 10px',borderRadius:99,display:'flex',alignItems:'center',gap:4}}><Zap size={9}/>RECOMMANDÉ</div>}
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:9}}>
      <div style={{display:'flex',alignItems:'center',gap:9}}>
        <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#0D7A87,#13A3B4)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <FlaskConical size={16} color="#fff"/>
        </div>
        <div>
          <div style={{fontWeight:800,fontSize:14,color:'#0F172A'}}>{lab.name}</div>
          <div style={{fontSize:11,color:'#64748B',display:'flex',alignItems:'center',gap:3}}><MapPin size={9}/>{lab.zone}, {lab.city}</div>
        </div>
      </div>
      <span style={{background:lab.badgeBg,color:lab.badgeColor,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,whiteSpace:'nowrap'}}>{lab.badge}</span>
    </div>
    <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:8}}>
      <div style={{display:'flex',gap:1}}>{Array(5).fill(0).map((_,i)=><Star key={i} size={11} fill={i<Math.floor(lab.rating)?'#F59E0B':'none'} color="#F59E0B"/>)}</div>
      <span style={{fontWeight:700,fontSize:12,color:'#0F172A'}}>{lab.rating}</span>
      <span style={{fontSize:11,color:'#94A3B8'}}>({lab.reviews} avis)</span>
      <span style={{fontSize:11,color:'#64748B',marginLeft:'auto'}}>⏱ {lab.delai}</span>
    </div>
    <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:compact?0:8}}>
      {lab.specialties.map(s=><span key={s} style={{background:'#F0FDFE',color:'#0D7A87',border:'1px solid #7DD3DA',fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:99}}>{s}</span>)}
    </div>
    {!compact&&<p style={{fontSize:12,color:'#475569',lineHeight:1.6,margin:lab.promo?'0 0 8px':0}}>{lab.desc}</p>}
    {!compact&&lab.promo&&<div style={{background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:8,padding:'5px 10px',fontSize:11,fontWeight:700,color:'#C2410C'}}>🎁 {lab.promo}</div>}
    {selected&&onSelect&&<div style={{position:'absolute',top:10,right:10,width:20,height:20,borderRadius:'50%',background:'#0D7A87',display:'flex',alignItems:'center',justifyContent:'center'}}><CheckCircle size={11} color="#fff"/></div>}
  </div>
);

/* ════════════════════════════════════════════════════════════════════════════ */
const LabManagement = () => {
  const [orders,setOrders]             = useState([]);
  const [patients,setPatients]         = useState([]);
  const [loading,setLoading]           = useState(true);
  const [isAddOpen,setIsAddOpen]       = useState(false);
  const [isStatOpen,setIsStatOpen]     = useState(false);
  const [selOrder,setSelOrder]         = useState(null);
  const [saving,setSaving]             = useState(false);
  const [filter,setFilter]             = useState('ALL');
  const [search,setSearch]             = useState('');
  const [selLab,setSelLab]             = useState(null);
  const [tab,setTab]                   = useState('orders');
  const [form,setForm] = useState({patient_id:'',work_type:'CROWN',due_date:'',lab_name:'',shade:'',lab_cost_mga:'',notes:''});

  useEffect(()=>{fetchOrders();fetchPatients();},[]);

  const fetchOrders = async()=>{
    try{const r=await axios.get(`${API}/labs/orders`,authH());setOrders(r.data.orders||[]);}
    catch{toast.error('Erreur chargement');}
    finally{setLoading(false);}
  };
  const fetchPatients = async()=>{
    try{const r=await axios.get(`${API}/patients`,{params:{limit:500,fields:'lookup',includeTotal:false},...authH()});const l=r.data.patients||r.data.data||r.data||[];setPatients(Array.isArray(l)?l:[]);}
    catch(e){console.error(e);}
  };
  const handleCreate = async()=>{
    if(!form.patient_id||!form.due_date){toast.error('Patient et date requis');return;}
    setSaving(true);
    try{
      await axios.post(`${API}/labs/orders`,{...form,lab_cost_mga:parseFloat(form.lab_cost_mga)||0},authH());
      toast.success('Commande créée !');
      setIsAddOpen(false);
      setForm({patient_id:'',work_type:'CROWN',due_date:'',lab_name:'',shade:'',lab_cost_mga:'',notes:''});
      setSelLab(null);fetchOrders();
    }catch(e){toast.error(e.response?.data?.error||'Erreur');}
    finally{setSaving(false);}
  };
  const handleStatus = async(s)=>{
    setSaving(true);
    try{await axios.post(`${API}/labs/orders/${selOrder.id}/status`,{status:s},authH());toast.success('Statut mis à jour');setIsStatOpen(false);setSelOrder(null);fetchOrders();}
    catch(e){toast.error(e.response?.data?.error||'Erreur');}
    finally{setSaving(false);}
  };
  const pickLab = lab => {
    setSelLab(() => lab);
    setForm({ ...form, lab_name: lab.name });
  };

  const activeSearch = search.trim();
  const filtered = orders
    .filter(o=>{
      const ms=filter==='ALL'||o.status===filter;
      const mt=matchesSearch(search,o.order_number,o.work_type,o.lab_name,patientSearchText(o.patient||{}));
      return ms&&mt;
    })
    .sort((a, b) => activeSearch
      ? scoreSearchMatch(activeSearch, b.order_number, b.work_type, b.lab_name, patientSearchText(b.patient || {}))
        - scoreSearchMatch(activeSearch, a.order_number, a.work_type, a.lab_name, patientSearchText(a.patient || {}))
      : 0);

  const inp={width:'100%',padding:'9px 12px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:13,fontFamily:'inherit',outline:'none',transition:'border-color .2s'};
  const fi=e=>e.target.style.borderColor='#0D7A87', bi=e=>e.target.style.borderColor='#E2E8F0';

  if(loading) return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:240}}>
      <Loader2 size={32} style={{color:'#0D7A87',animation:'spin .8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return(
    <div style={{width:'100%',maxWidth: 1400,margin:'0 auto',padding:'0 clamp(12px,1.5vw,24px) 48px'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* En-tête */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22,flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:44,height:44,borderRadius:13,background:'linear-gradient(135deg,#7C3AED,#9333EA)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <FlaskConical size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:22,color:'#0F172A',margin:0}}>Laboratoire</h1>
            <p style={{color:'#64748B',fontSize:13,margin:0}}>{orders.length} commande(s) · {PARTNER_LABS.length} labos partenaires</p>
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button type="button" onClick={fetchOrders} style={{padding:'8px 14px',borderRadius:10,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:13,fontWeight:600,color:'#475569'}}>
            <RefreshCw size={13}/>Actualiser
          </button>
          <button type="button" onClick={()=>{setTab('orders');setIsAddOpen(true);}} style={{padding:'9px 18px',borderRadius:10,background:'linear-gradient(135deg,#0D7A87,#13A3B4)',color:'#fff',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:14,fontWeight:700,boxShadow:'0 4px 14px rgba(13,122,135,.3)'}}>
            <Plus size={15}/>Nouvelle commande
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:20,background:'#F8FAFC',borderRadius:12,padding:4,border:'1px solid #E2E8F0'}}>
        {[{k:'orders',l:'📋 Commandes',n:orders.length},{k:'partners',l:'🤝 Labos Partenaires',n:PARTNER_LABS.length}].map(t=>(
          <button type="button" key={t.k} onClick={()=>setTab(t.k)} style={{flex:1,padding:'9px',borderRadius:9,border:'none',cursor:'pointer',fontWeight:600,fontSize:13,transition:'all .2s',background:tab===t.k?'#fff':'transparent',color:tab===t.k?'#0D7A87':'#64748B',boxShadow:tab===t.k?'0 1px 6px rgba(0,0,0,.08)':'none'}}>
            {t.l} <span style={{background:tab===t.k?'#F0FDFE':'#E2E8F0',color:tab===t.k?'#0D7A87':'#94A3B8',borderRadius:99,padding:'1px 7px',fontSize:11,fontWeight:700,marginLeft:4}}>{t.n}</span>
          </button>
        ))}
      </div>

      {/* ══ TAB COMMANDES ══ */}
      {tab==='orders'&&(
        <>
          <div style={{background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',padding:'13px 18px',marginBottom:16,display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:180}}>
              <Search size={14} color="#94A3B8"/>
	              <input aria-label="Rechercher une commande labo" placeholder="Rechercher..." value={search} onChange={e=>setSearch(e.target.value)} style={{...inp,border:'none',background:'transparent',flex:1}}/>
            </div>
	            <select aria-label="Filtrer les commandes labo par statut" value={filter} onChange={e=>setFilter(e.target.value)} style={{...inp,width:'auto',minWidth:150}}>
              <option value="ALL">Tous les statuts</option>
              {Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div style={{background:'#fff',borderRadius:16,border:'1px solid #E2E8F0',overflow:'hidden'}}>
            <div style={{padding:'13px 20px',borderBottom:'1px solid #F1F5F9'}}>
              <span style={{fontWeight:700,fontSize:14,color:'#0F172A'}}>{filtered.length} commande(s)</span>
            </div>
            {filtered.length===0?(
              <div style={{textAlign:'center',padding:'48px',color:'#94A3B8'}}>
                <FlaskConical size={40} style={{margin:'0 auto 10px',opacity:.3}}/>
                <p style={{margin:0,fontSize:14}}>Aucune commande</p>
                <button type="button" onClick={()=>setIsAddOpen(true)} style={{marginTop:14,padding:'9px 18px',borderRadius:10,background:'#0D7A87',color:'#fff',border:'none',cursor:'pointer',fontSize:13,fontWeight:700}}>Créer une commande</button>
              </div>
            ):(
              filtered.map((o,idx)=>{
                const c=STATUS[o.status]||STATUS.CREATED, Icon=c.icon;
                return(
                  <div key={o.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom:idx<filtered.length-1?'1px solid #F8FAFC':'none',flexWrap:'wrap',gap:10}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div style={{width:36,height:36,borderRadius:10,background:c.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Icon size={16} color={c.text}/></div>
                      <div>
                        <div style={{fontWeight:700,fontSize:14,color:'#0F172A'}}>{o.order_number}</div>
                        <div style={{fontSize:12,color:'#64748B'}}>{o.patient?.first_name} {o.patient?.last_name} · {WORK_TYPES[o.work_type]}</div>
                        <div style={{fontSize:11,color:'#94A3B8',marginTop:1}}>
                          ⏰ {fdate(o.due_date)}{o.lab_name&&<span> · 🔬 {o.lab_name}</span>}
                          <span style={{color:'#0D7A87',fontWeight:700}}> · {fmt(o.total_mga||o.lab_cost_mga||0)}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{background:c.bg,color:c.text,borderRadius:99,padding:'4px 12px',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',gap:4}}>
                        <div style={{width:6,height:6,borderRadius:'50%',background:c.dot}}/>{c.label}
                      </span>
                      <button type="button" onClick={()=>{setSelOrder(o);setIsStatOpen(true);}} style={{padding:'6px 12px',borderRadius:9,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer',fontSize:12,fontWeight:600,color:'#475569'}}>Statut</button>
	                      <button type="button" aria-label="Imprimer la commande labo" onClick={()=>openAuthenticatedPrint(`${API}/labs/orders/${o.id}/print`)} style={{padding:'6px 10px',borderRadius:9,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer'}}>
                        <Printer size={13} color="#64748B"/>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ══ TAB PARTENAIRES ══ */}
      {tab==='partners'&&(
        <>
          {/* Bannière partenariat */}
          <div style={{background:'linear-gradient(135deg,#0D7A87,#083D44)',borderRadius:18,padding:'24px 28px',marginBottom:20,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)',backgroundSize:'40px 40px',pointerEvents:'none'}}/>
            <div style={{position:'relative',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:8}}>
                  <Award size={15} color="#F59E0B"/>
                  <span style={{fontSize:11,fontWeight:700,color:'#F59E0B',textTransform:'uppercase',letterSpacing:1.5}}>Espace Partenaire</span>
                </div>
                <h2 style={{fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:20,color:'#fff',margin:'0 0 6px'}}>Votre laboratoire dans DPM Madagascar</h2>
                <p style={{fontSize:14,color:'rgba(255,255,255,.7)',margin:0,maxWidth: 480}}>
                  Rejoignez notre réseau et soyez recommandé directement aux dentistes lors de leurs commandes. Visibilité auprès de +50 cabinets.
                </p>
              </div>
              <a href="mailto:radisonfrancky@gmail.com?subject=Demande partenariat labo DPM"
                style={{padding:'11px 22px',borderRadius:12,background:'#fff',color:'#0D7A87',fontWeight:800,fontSize:14,textDecoration:'none',display:'flex',alignItems:'center',gap:7,whiteSpace:'nowrap',flexShrink:0}}>
                Devenir partenaire <ExternalLink size={13}/>
              </a>
            </div>
          </div>

          {/* Labo featured */}
          {PARTNER_LABS.filter(l=>l.featured).map(lab=>(
            <div key={lab.id} style={{marginBottom:20}}>
              <div style={{fontSize:11,fontWeight:700,color:'#94A3B8',textTransform:'uppercase',letterSpacing:1.5,marginBottom:8,display:'flex',alignItems:'center',gap:5}}>
                <Zap size={11} color="#F59E0B"/>Recommandé ce mois
              </div>
              <div style={{background:'linear-gradient(135deg,#FFFBEB,#FEF9C3)',border:'2px solid rgba(245,158,11,.25)',borderRadius:18,padding:'20px 22px',position:'relative'}}>
                <div style={{position:'absolute',top:12,right:16,fontSize:10,fontWeight:700,color:'#D97706',background:'#FEF3C7',padding:'2px 8px',borderRadius:99}}>
                  Annonce sponsorisée
                </div>
                <LabCard lab={lab}/>
                <div style={{display:'flex',gap:10,marginTop:14,flexWrap:'wrap'}}>
                  <a href={`tel:${lab.phone}`} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:10,background:'#0D7A87',color:'#fff',textDecoration:'none',fontSize:13,fontWeight:700}}>
                    <Phone size={13}/>{lab.phone}
                  </a>
                  <a href={`mailto:${lab.email}`} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:10,border:'1.5px solid #0D7A87',color:'#0D7A87',textDecoration:'none',fontSize:13,fontWeight:600}}>
                    <Mail size={13}/>Envoyer un email
                  </a>
                  <button type="button" onClick={()=>{pickLab(lab);setIsAddOpen(true);setTab('orders');}} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:10,background:'#F0FDFE',color:'#0D7A87',border:'1.5px solid #7DD3DA',cursor:'pointer',fontSize:13,fontWeight:700}}>
                    <Plus size={13}/>Commander ici
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Grille tous labos */}
          <div style={{fontSize:11,fontWeight:700,color:'#94A3B8',textTransform:'uppercase',letterSpacing:1.5,marginBottom:12}}>Tous les labos partenaires</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(290px,1fr))',gap:14}}>
            {PARTNER_LABS.map(lab=>(
              <div key={lab.id}>
                <LabCard lab={lab}/>
                <div style={{display:'flex',gap:7,marginTop:9}}>
                  <a href={`tel:${lab.phone}`} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:'8px',borderRadius:10,background:'#F0FDFE',color:'#0D7A87',textDecoration:'none',fontSize:12,fontWeight:700}}>
                    <Phone size={12}/>Appeler
                  </a>
                  <a href={`mailto:${lab.email}`} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:'8px',borderRadius:10,background:'#F8FAFC',color:'#475569',textDecoration:'none',fontSize:12,fontWeight:600}}>
                    <Mail size={12}/>Email
                  </a>
                  <button type="button" onClick={()=>{pickLab(lab);setIsAddOpen(true);setTab('orders');}} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:'8px',borderRadius:10,background:'#0D7A87',color:'#fff',border:'none',cursor:'pointer',fontSize:12,fontWeight:700}}>
                    <Plus size={12}/>Commander
                  </button>
                </div>
              </div>
            ))}
          </div>

          <PartnerAds
            title="Vidéos, offres et articles des labos"
            description="Les laboratoires partenaires peuvent publier une vidéo de démonstration, une offre ou un article conseil. Les exemples ci-dessous montrent le rendu attendu avant leurs propres contenus."
            storageKey="dpm_lab_partner_ads"
            examples={LAB_AD_EXAMPLES}
            accent="#0D7A87"
            audienceLabel="laboratoire"
          />

          {/* Zone pub libre */}
          <div style={{marginTop:22,border:'2px dashed #E2E8F0',borderRadius:18,padding:'28px',textAlign:'center',background:'#FAFBFC'}}>
            <div style={{width:46,height:46,borderRadius:13,background:'#F1F5F9',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
              <Building2 size={20} color="#94A3B8"/>
            </div>
            <h3 style={{fontFamily:'Plus Jakarta Sans',fontWeight:700,fontSize:16,color:'#475569',margin:'0 0 6px'}}>📢 Espace publicitaire disponible</h3>
            <p style={{fontSize:13,color:'#94A3B8',margin:'0 0 16px',maxWidth:380,marginLeft:'auto',marginRight:'auto',lineHeight:1.6}}>
              Votre labo n'est pas encore dans notre liste ? Rejoignez le réseau DPM et touchez directement les dentistes qui commandent chaque jour.
            </p>
            <a href="mailto:radisonfrancky@gmail.com?subject=Inscription labo partenaire DPM"
              style={{display:'inline-flex',alignItems:'center',gap:7,padding:'10px 22px',borderRadius:11,background:'#0D7A87',color:'#fff',textDecoration:'none',fontSize:13,fontWeight:700}}>
              <Star size={13}/>Rejoindre le réseau partenaire
            </a>
          </div>
        </>
      )}

      {/* ══ MODAL NOUVELLE COMMANDE ══ */}
      <Modal open={isAddOpen} onClose={()=>{setIsAddOpen(false);setSelLab(null);}} title="Nouvelle commande labo" maxW={820}>
        <div style={{display:'flex',flexDirection:'column',gap:13}}>
          {/* Sélection labo partenaire */}
          <div style={{background:'#F0FDFE',border:'1.5px solid #7DD3DA',borderRadius:13,padding:'13px 15px'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#0D7A87',textTransform:'uppercase',letterSpacing:1.5,marginBottom:9,display:'flex',alignItems:'center',gap:5}}>
              <Award size={11}/>Choisir un labo partenaire
            </div>
            {selLab?(
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:9}}>
                  <div style={{width:30,height:30,borderRadius:9,background:'linear-gradient(135deg,#0D7A87,#13A3B4)',display:'flex',alignItems:'center',justifyContent:'center'}}><FlaskConical size={13} color="#fff"/></div>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,color:'#0F172A'}}>{selLab.name}</div>
                    <div style={{fontSize:11,color:'#64748B'}}>{selLab.zone}, {selLab.city} · {selLab.delai}</div>
                  </div>
                </div>
	                <button type="button" aria-label="Retirer le laboratoire sélectionné" onClick={()=>{setSelLab(null);setForm(f=>({...f,lab_name:''}));}} style={{background:'none',border:'none',cursor:'pointer',color:'#94A3B8'}}><X size={14}/></button>
              </div>
            ):(
              <>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:8}}>
                  {PARTNER_LABS.map(lab=>(
                    <div key={lab.id} onClick={()=>pickLab(lab)}
                      style={{padding:'9px 11px',borderRadius:10,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer',transition:'all .15s'}}
                      onMouseOver={e=>{e.currentTarget.style.borderColor='#0D7A87';e.currentTarget.style.background='#F0FDFE';}}
                      onMouseOut={e=>{e.currentTarget.style.borderColor='#E2E8F0';e.currentTarget.style.background='#fff';}}>
                      <div style={{fontWeight:700,fontSize:12,color:'#0F172A'}}>{lab.name}</div>
                      <div style={{fontSize:10,color:'#64748B',marginTop:2}}>{lab.city} · ⭐{lab.rating} · {lab.delai}</div>
                      {lab.promo&&<div style={{fontSize:10,color:'#C2410C',fontWeight:600,marginTop:2}}>🎁 {lab.promo}</div>}
                    </div>
                  ))}
                </div>
                <p style={{fontSize:11,color:'#94A3B8',margin:0,textAlign:'center'}}>Ou saisir le nom manuellement ci-dessous</p>
              </>
            )}
          </div>

          {/* Patient */}
          <div>
            <label htmlFor="lab-order-patient" style={{fontSize:13,fontWeight:600,color:'#475569',display:'block',marginBottom:4}}>Patient *</label>
            <select id="lab-order-patient" aria-label="Patient de la commande labo" value={form.patient_id} onChange={e=>setForm({...form,patient_id:e.target.value})} style={inp} onFocus={fi} onBlur={bi}>
              <option value="">Sélectionner un patient...</option>
              {patients.map(p=><option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
            </select>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div>
              <label htmlFor="lab-order-work-type" style={{fontSize:13,fontWeight:600,color:'#475569',display:'block',marginBottom:4}}>Type de travail</label>
              <select id="lab-order-work-type" aria-label="Type de travail labo" value={form.work_type} onChange={e=>setForm({...form,work_type:e.target.value,lab_cost_mga:''})} style={inp} onFocus={fi} onBlur={bi}>
                {Object.entries(WORK_TYPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="lab-order-due-date" style={{fontSize:13,fontWeight:600,color:'#475569',display:'block',marginBottom:4}}>Date limite *</label>
              <input id="lab-order-due-date" aria-label="Date limite de la commande labo" type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} style={inp} onFocus={fi} onBlur={bi}/>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div>
              <label htmlFor="lab-order-lab-name" style={{fontSize:13,fontWeight:600,color:'#475569',display:'block',marginBottom:4}}>Laboratoire</label>
              <input id="lab-order-lab-name" aria-label="Laboratoire" value={form.lab_name} onChange={e=>setForm({...form,lab_name:e.target.value})} placeholder="Nom du labo" style={inp} onFocus={fi} onBlur={bi}/>
            </div>
            <div>
              <label htmlFor="lab-order-shade" style={{fontSize:13,fontWeight:600,color:'#475569',display:'block',marginBottom:4}}>Teinte</label>
              <input id="lab-order-shade" aria-label="Teinte" value={form.shade} onChange={e=>setForm({...form,shade:e.target.value})} placeholder="A1, A2..." style={inp} onFocus={fi} onBlur={bi}/>
            </div>
          </div>
          <div style={{background:'rgba(13,122,135,.04)',border:'1.5px solid rgba(13,122,135,.15)',borderRadius:12,padding:'13px 15px'}}>
            <label htmlFor="lab-order-cost" style={{fontSize:13,fontWeight:600,color:'#475569',display:'block',marginBottom:4}}>Coût labo (Ar)</label>
            <input id="lab-order-cost" aria-label="Coût labo" type="number" value={form.lab_cost_mga} onChange={e=>setForm({...form,lab_cost_mga:e.target.value})} placeholder="Saisir ou choisir ci-dessous" style={inp} onFocus={fi} onBlur={bi}/>
            {form.lab_cost_mga&&<p style={{fontSize:12,color:'#0D7A87',fontWeight:700,textAlign:'right',marginTop:3}}>= {fmt(parseFloat(form.lab_cost_mga)||0)}</p>}
            <TarifSug workType={form.work_type} val={form.lab_cost_mga} onSelect={m=>setForm({...form,lab_cost_mga:String(m)})}/>
          </div>
          <div>
            <label htmlFor="lab-order-notes" style={{fontSize:13,fontWeight:600,color:'#475569',display:'block',marginBottom:4}}>Notes</label>
            <textarea id="lab-order-notes" aria-label="Notes de la commande labo" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} placeholder="Instructions spéciales..." style={{...inp,resize:'vertical'}} onFocus={fi} onBlur={bi}/>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,paddingTop:8,borderTop:'1px solid #F1F5F9'}}>
            <button type="button" onClick={()=>{setIsAddOpen(false);setSelLab(null);}} style={{padding:'9px 18px',borderRadius:10,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer',fontSize:13,fontWeight:600,color:'#475569'}}>Annuler</button>
            <button type="button" onClick={handleCreate} disabled={saving} style={{padding:'9px 20px',borderRadius:10,background:'linear-gradient(135deg,#0D7A87,#13A3B4)',color:'#fff',border:'none',cursor:'pointer',fontSize:14,fontWeight:700,display:'flex',alignItems:'center',gap:7}}>
              {saving?<Loader2 size={14} style={{animation:'spin .8s linear infinite'}}/>:<Plus size={14}/>}
              Créer la commande
            </button>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL STATUT ══ */}
      <Modal open={isStatOpen} onClose={()=>setIsStatOpen(false)} title={`Statut — ${selOrder?.order_number||''}`} maxW={380}>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {Object.entries(STATUS).map(([s,c])=>{
            const Icon=c.icon, isCur=selOrder?.status===s;
            return(
              <button type="button" key={s} onClick={()=>!isCur&&handleStatus(s)} disabled={saving||isCur}
                style={{padding:'12px 16px',borderRadius:11,border:isCur?`2px solid ${c.dot}`:'1.5px solid #E2E8F0',background:isCur?c.bg:'#fff',cursor:isCur?'default':'pointer',display:'flex',alignItems:'center',gap:10,fontSize:13,fontWeight:600,color:isCur?c.text:'#475569',transition:'all .2s'}}>
                <Icon size={15} color={isCur?c.dot:'#94A3B8'}/>{c.label}
                {isCur&&<span style={{marginLeft:'auto',fontSize:11,fontWeight:700}}>✓ Actuel</span>}
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};
export default LabManagement;
