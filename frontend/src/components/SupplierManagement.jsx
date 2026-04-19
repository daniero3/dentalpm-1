import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Truck, Plus, Search, Edit, Power, Phone, Mail, MapPin,
  Building2, Star, RefreshCw, X, Award, ExternalLink, Zap,
  Tag, ShoppingBag, Sparkles
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SUPPLIER_TYPES = [
  { value:'DENTAL',    label:'Dentaire',   color:'#1D4ED8', bg:'#EFF6FF' },
  { value:'PHARMA',    label:'Pharmacie',  color:'#166534', bg:'#DCFCE7' },
  { value:'EQUIPMENT', label:'Équipement', color:'#7C3AED', bg:'#EDE9FE' },
  { value:'GENERAL',   label:'Général',    color:'#475569', bg:'#F1F5F9' },
];

/* Fournisseurs partenaires — publicité */
const PARTNER_SUPPLIERS = [
  {
    id:1, name:'DentaSup Madagascar', type:'DENTAL', city:'Antananarivo', zone:'Analakely',
    phone:'034 56 789 01', email:'dentasup.mada@gmail.com',
    desc:"Distributeur officiel de matériaux dentaires haut de gamme. Amalgames, composites, ciments. Livraison J+1 Antananarivo.",
    specialties:['Composites','Amalgames','Ciments','Anesthésiants'],
    badge:'Fournisseur Gold', badgeColor:'#D97706', badgeBg:'#FFFBEB',
    promo:'10% de remise sur commande > 500 000 Ar', featured:true,
    rating:4.9, reviews:38,
  },
  {
    id:2, name:'MedEquip Tana', type:'EQUIPMENT', city:'Antananarivo', zone:'Tsiadana',
    phone:'032 23 456 78', email:'medequip.tana@gmail.com',
    desc:"Équipements dentaires : fauteuils, turbines, contre-angles. SAV et maintenance inclus. Garantie 2 ans.",
    specialties:["Fauteuils",'Turbines','Radiologie','Stérilisation'],
    badge:'Fournisseur Silver', badgeColor:'#64748B', badgeBg:'#F1F5F9',
    promo:null, featured:false,
    rating:4.7, reviews:22,
  },
  {
    id:3, name:'Pharma Dental Pro', type:'PHARMA', city:'Antananarivo', zone:'Behoririka',
    phone:'033 11 222 33', email:'pharmadentalpro@gmail.com',
    desc:"Fournitures pharmaceutiques pour cabinets dentaires. Anesthésiants, antibiotiques, antidouleurs. Commandes en ligne.",
    specialties:['Anesthésiants','Antibiotiques','Antiseptiques','Consommables'],
    badge:'Fournisseur Silver', badgeColor:'#64748B', badgeBg:'#F1F5F9',
    promo:'Livraison offerte dès 200 000 Ar', featured:false,
    rating:4.6, reviews:16,
  },
];

const authH = () => ({headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}});

const getType = t => SUPPLIER_TYPES.find(x=>x.value===t) || SUPPLIER_TYPES[3];

/* ── Modal ── */
const Modal = ({open,onClose,title,desc,children}) => {
  if(!open) return null;
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(15,23,42,.55)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:'#fff',borderRadius:18,padding:28,width:'100%',maxWidth: 520,boxShadow:'0 20px 60px rgba(15,23,42,.2)',border:'1px solid #E2E8F0',maxHeight:'90vh',overflowY:'auto',position:'relative'}}>
        <button onClick={onClose} style={{position:'absolute',top:14,right:14,background:'#F8FAFC',border:'none',cursor:'pointer',color:'#64748B',padding:7,borderRadius:8,display:'flex',alignItems:'center'}}><X size={15}/></button>
        <div style={{marginBottom:18,paddingRight:28}}>
          {title&&<h2 style={{fontFamily:'Plus Jakarta Sans',fontSize:17,fontWeight:700,color:'#0F172A',margin:0}}>{title}</h2>}
          {desc&&<p style={{fontSize:13,color:'#64748B',marginTop:4}}>{desc}</p>}
        </div>
        {children}
      </div>
    </div>
  );
};

/* ── Card fournisseur partenaire ── */
const SupCard = ({sup}) => (
  <div style={{border:'1.5px solid #E2E8F0',borderRadius:16,padding:'18px 20px',background:'#fff',boxShadow:'0 1px 4px rgba(0,0,0,.04)',position:'relative'}}>
    {sup.featured&&<div style={{position:'absolute',top:-9,right:14,background:'linear-gradient(135deg,#F59E0B,#D97706)',color:'#fff',fontSize:10,fontWeight:800,padding:'2px 10px',borderRadius:99,display:'flex',alignItems:'center',gap:4}}><Zap size={9}/>RECOMMANDÉ</div>}
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:38,height:38,borderRadius:11,background:`linear-gradient(135deg,${getType(sup.type).color},${getType(sup.type).color}99)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <Truck size={17} color="#fff"/>
        </div>
        <div>
          <div style={{fontWeight:800,fontSize:14,color:'#0F172A'}}>{sup.name}</div>
          <div style={{fontSize:11,color:'#64748B',display:'flex',alignItems:'center',gap:3}}><MapPin size={9}/>{sup.zone}, {sup.city}</div>
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:4,alignItems:'flex-end'}}>
        <span style={{background:sup.badgeBg,color:sup.badgeColor,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99}}>{sup.badge}</span>
        <span style={{background:getType(sup.type).bg,color:getType(sup.type).color,fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:99}}>{getType(sup.type).label}</span>
      </div>
    </div>
    <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:8}}>
      <div style={{display:'flex',gap:1}}>{Array(5).fill(0).map((_,i)=><Star key={i} size={11} fill={i<Math.floor(sup.rating)?'#F59E0B':'none'} color="#F59E0B"/>)}</div>
      <span style={{fontWeight:700,fontSize:12,color:'#0F172A'}}>{sup.rating}</span>
      <span style={{fontSize:11,color:'#94A3B8'}}>({sup.reviews} avis)</span>
    </div>
    <p style={{fontSize:12,color:'#475569',lineHeight:1.65,marginBottom:8}}>{sup.desc}</p>
    <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:sup.promo?8:0}}>
      {sup.specialties.map(s=><span key={s} style={{background:'#F8FAFC',color:'#475569',border:'1px solid #E2E8F0',fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:99}}>{s}</span>)}
    </div>
    {sup.promo&&<div style={{background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:8,padding:'6px 10px',fontSize:11,fontWeight:700,color:'#C2410C'}}>🎁 {sup.promo}</div>}
  </div>
);

/* ════════════════════════════════════════════════════════════════════════════ */
const SupplierManagement = () => {
  const [suppliers,setSuppliers]         = useState([]);
  const [loading,setLoading]             = useState(true);
  const [search,setSearch]               = useState('');
  const [typeFilter,setTypeFilter]       = useState('ALL');
  const [isOpen,setIsOpen]               = useState(false);
  const [editing,setEditing]             = useState(null);
  const [tab,setTab]                     = useState('suppliers'); // 'suppliers' | 'partners'
  const [form,setForm] = useState({name:'',type:'GENERAL',phone:'',email:'',city:'Antananarivo',address:'',notes:''});

  useEffect(()=>{fetchSuppliers();},[typeFilter]);

  const fetchSuppliers = async()=>{
    setLoading(true);
    try{
      const params={active:'all'};
      if(typeFilter!=='ALL') params.type=typeFilter;
      const r=await axios.get(`${API}/suppliers`,{params});
      setSuppliers(r.data.suppliers||[]);
    }catch(e){if(!axios.isCancel(e)){toast.error('Erreur chargement');setSuppliers([]);}}
    finally{setLoading(false);}
  };

  const handleSubmit = async e=>{
    e.preventDefault();
    try{
      if(editing) await axios.put(`${API}/suppliers/${editing.id}`,form);
      else await axios.post(`${API}/suppliers`,form);
      toast.success(editing?'Fournisseur mis à jour':'Fournisseur créé');
      resetForm();setIsOpen(false);fetchSuppliers();
    }catch(e){toast.error(e.response?.data?.error||'Erreur');}
  };

  const handleDisable = async sup=>{
    if(!window.confirm(`Désactiver "${sup.name}" ?`)) return;
    try{await axios.patch(`${API}/suppliers/${sup.id}/disable`);toast.success('Désactivé');fetchSuppliers();}
    catch{toast.error('Erreur');}
  };

  const openEdit = sup=>{
    setEditing(sup);
    setForm({name:sup.name||'',type:sup.type||'GENERAL',phone:sup.phone||'',email:sup.email||'',city:sup.city||'Antananarivo',address:sup.address||'',notes:sup.notes||''});
    setIsOpen(true);
  };

  const resetForm = ()=>{
    setEditing(null);
    setForm({name:'',type:'GENERAL',phone:'',email:'',city:'Antananarivo',address:'',notes:''});
  };

  const filtered = suppliers.filter(s=>
    s.name?.toLowerCase().includes(search.toLowerCase())||
    s.email?.toLowerCase().includes(search.toLowerCase())||
    s.city?.toLowerCase().includes(search.toLowerCase())
  );

  const inp={width:'100%',padding:'9px 12px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:13,fontFamily:'inherit',outline:'none',transition:'border-color .2s'};
  const fi=e=>e.target.style.borderColor='#F59E0B', bi=e=>e.target.style.borderColor='#E2E8F0';

  if(loading) return(
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:240}}>
      <div style={{width:36,height:36,border:'4px solid #FDE68A',borderTopColor:'#F59E0B',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return(
    <div style={{maxWidth: 1100,margin:'0 auto',paddingBottom:48}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* En-tête */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22,flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:44,height:44,borderRadius:13,background:'linear-gradient(135deg,#F59E0B,#D97706)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Truck size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:22,color:'#0F172A',margin:0}}>Fournisseurs</h1>
            <p style={{color:'#64748B',fontSize:13,margin:0}}>{filtered.length} fournisseur(s) · {PARTNER_SUPPLIERS.length} partenaires</p>
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={fetchSuppliers} style={{padding:'8px 14px',borderRadius:10,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:13,fontWeight:600,color:'#475569'}}>
            <RefreshCw size={13}/>Actualiser
          </button>
          <button onClick={()=>{resetForm();setIsOpen(true);}} style={{padding:'9px 18px',borderRadius:10,background:'linear-gradient(135deg,#F59E0B,#D97706)',color:'#fff',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:14,fontWeight:700,boxShadow:'0 4px 14px rgba(245,158,11,.3)'}}>
            <Plus size={15}/>Nouveau fournisseur
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:20,background:'#F8FAFC',borderRadius:12,padding:4,border:'1px solid #E2E8F0'}}>
        {[{k:'suppliers',l:'📦 Mes fournisseurs',n:filtered.length},{k:'partners',l:'🌟 Fournisseurs partenaires',n:PARTNER_SUPPLIERS.length}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{flex:1,padding:'9px',borderRadius:9,border:'none',cursor:'pointer',fontWeight:600,fontSize:13,transition:'all .2s',background:tab===t.k?'#fff':'transparent',color:tab===t.k?'#D97706':'#64748B',boxShadow:tab===t.k?'0 1px 6px rgba(0,0,0,.08)':'none'}}>
            {t.l} <span style={{background:tab===t.k?'#FFFBEB':'#E2E8F0',color:tab===t.k?'#D97706':'#94A3B8',borderRadius:99,padding:'1px 7px',fontSize:11,fontWeight:700,marginLeft:4}}>{t.n}</span>
          </button>
        ))}
      </div>

      {/* ══ TAB MES FOURNISSEURS ══ */}
      {tab==='suppliers'&&(
        <>
          {/* Filtres */}
          <div style={{background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',padding:'13px 18px',marginBottom:16,display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:180}}>
              <Search size={14} color="#94A3B8"/>
              <input placeholder="Rechercher fournisseur..." value={search} onChange={e=>setSearch(e.target.value)}
                style={{...inp,border:'none',background:'transparent',flex:1}}/>
            </div>
            <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{...inp,width:'auto',minWidth:150}}>
              <option value="ALL">Tous les types</option>
              {SUPPLIER_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Liste */}
          {filtered.length===0?(
            <div style={{background:'#fff',borderRadius:16,border:'1px solid #E2E8F0',padding:'48px',textAlign:'center',color:'#94A3B8'}}>
              <Truck size={40} style={{margin:'0 auto 10px',opacity:.3}}/>
              <p style={{margin:0,fontSize:14}}>Aucun fournisseur</p>
              <button onClick={()=>{resetForm();setIsOpen(true);}} style={{marginTop:14,padding:'9px 18px',borderRadius:10,background:'#F59E0B',color:'#fff',border:'none',cursor:'pointer',fontSize:13,fontWeight:700}}>
                Ajouter un fournisseur
              </button>
            </div>
          ):(
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
              {filtered.map(s=>{
                const t=getType(s.type);
                return(
                  <div key={s.id} style={{background:'#fff',borderRadius:16,border:'1px solid #E2E8F0',padding:'18px 20px',boxShadow:'0 1px 4px rgba(0,0,0,.04)',opacity:s.is_active===false?.55:1}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:38,height:38,borderRadius:11,background:`${t.bg}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <Building2 size={17} color={t.color}/>
                        </div>
                        <div>
                          <div style={{fontWeight:800,fontSize:14,color:'#0F172A'}}>{s.name}</div>
                          <span style={{background:t.bg,color:t.color,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99}}>{t.label}</span>
                        </div>
                      </div>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>openEdit(s)} style={{padding:'5px 10px',borderRadius:8,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:4,fontSize:12,fontWeight:600,color:'#475569'}}>
                          <Edit size={12}/>Modifier
                        </button>
                        <button onClick={()=>handleDisable(s)} style={{padding:'5px 8px',borderRadius:8,border:'1.5px solid #FEE2E2',background:'#FFF5F5',cursor:'pointer',display:'flex',alignItems:'center'}} title="Désactiver">
                          <Power size={12} color="#EF4444"/>
                        </button>
                      </div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:5}}>
                      {s.phone&&<div style={{display:'flex',alignItems:'center',gap:7,fontSize:13,color:'#475569'}}><Phone size={12} color="#94A3B8"/>{s.phone}</div>}
                      {s.email&&<div style={{display:'flex',alignItems:'center',gap:7,fontSize:13,color:'#475569'}}><Mail size={12} color="#94A3B8"/>{s.email}</div>}
                      {s.city&&<div style={{display:'flex',alignItems:'center',gap:7,fontSize:13,color:'#475569'}}><MapPin size={12} color="#94A3B8"/>{s.city}{s.address?`, ${s.address}`:''}</div>}
                      {s.notes&&<div style={{fontSize:12,color:'#94A3B8',background:'#F8FAFC',borderRadius:8,padding:'6px 10px',marginTop:4}}>{s.notes}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══ TAB PARTENAIRES ══ */}
      {tab==='partners'&&(
        <>
          {/* Bannière */}
          <div style={{background:'linear-gradient(135deg,#F59E0B,#D97706)',borderRadius:18,padding:'24px 28px',marginBottom:20,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px)',backgroundSize:'40px 40px',pointerEvents:'none'}}/>
            <div style={{position:'relative',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:8}}>
                  <Award size={15} color="#fff"/>
                  <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.9)',textTransform:'uppercase',letterSpacing:1.5}}>Espace Partenaire</span>
                </div>
                <h2 style={{fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:20,color:'#fff',margin:'0 0 6px'}}>Votre entreprise dans DPM Madagascar</h2>
                <p style={{fontSize:14,color:'rgba(255,255,255,.85)',margin:0,maxWidth: 480}}>
                  Rejoignez notre réseau de fournisseurs partenaires et soyez recommandé directement aux cabinets dentaires. Visibilité auprès de +50 cabinets à Madagascar.
                </p>
              </div>
              <a href="mailto:radisonfrancky@gmail.com?subject=Demande partenariat fournisseur DPM"
                style={{padding:'11px 22px',borderRadius:12,background:'#fff',color:'#D97706',fontWeight:800,fontSize:14,textDecoration:'none',display:'flex',alignItems:'center',gap:7,whiteSpace:'nowrap',flexShrink:0}}>
                Devenir partenaire <ExternalLink size={13}/>
              </a>
            </div>
          </div>

          {/* Fournisseur featured */}
          {PARTNER_SUPPLIERS.filter(s=>s.featured).map(sup=>(
            <div key={sup.id} style={{marginBottom:20}}>
              <div style={{fontSize:11,fontWeight:700,color:'#94A3B8',textTransform:'uppercase',letterSpacing:1.5,marginBottom:8,display:'flex',alignItems:'center',gap:5}}>
                <Zap size={11} color="#F59E0B"/>Recommandé ce mois
              </div>
              <div style={{background:'linear-gradient(135deg,#FFFBEB,#FEF9C3)',border:'2px solid rgba(245,158,11,.25)',borderRadius:18,padding:'20px 22px',position:'relative'}}>
                <div style={{position:'absolute',top:12,right:16,fontSize:10,fontWeight:700,color:'#D97706',background:'#FEF3C7',padding:'2px 8px',borderRadius:99}}>
                  Annonce sponsorisée
                </div>
                <SupCard sup={sup}/>
                <div style={{display:'flex',gap:10,marginTop:14,flexWrap:'wrap'}}>
                  <a href={`tel:${sup.phone}`} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:10,background:'#F59E0B',color:'#fff',textDecoration:'none',fontSize:13,fontWeight:700}}>
                    <Phone size={13}/>{sup.phone}
                  </a>
                  <a href={`mailto:${sup.email}`} style={{display:'flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:10,border:'1.5px solid #F59E0B',color:'#D97706',textDecoration:'none',fontSize:13,fontWeight:600}}>
                    <Mail size={13}/>Envoyer un email
                  </a>
                </div>
              </div>
            </div>
          ))}

          {/* Grille fournisseurs */}
          <div style={{fontSize:11,fontWeight:700,color:'#94A3B8',textTransform:'uppercase',letterSpacing:1.5,marginBottom:12}}>Tous les fournisseurs partenaires</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(290px,1fr))',gap:14}}>
            {PARTNER_SUPPLIERS.map(sup=>(
              <div key={sup.id}>
                <SupCard sup={sup}/>
                <div style={{display:'flex',gap:7,marginTop:9}}>
                  <a href={`tel:${sup.phone}`} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:'8px',borderRadius:10,background:'#FFFBEB',color:'#D97706',textDecoration:'none',fontSize:12,fontWeight:700}}>
                    <Phone size={12}/>Appeler
                  </a>
                  <a href={`mailto:${sup.email}`} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:5,padding:'8px',borderRadius:10,background:'#F8FAFC',color:'#475569',textDecoration:'none',fontSize:12,fontWeight:600}}>
                    <Mail size={12}/>Email
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Zone pub libre */}
          <div style={{marginTop:22,border:'2px dashed #E2E8F0',borderRadius:18,padding:'28px',textAlign:'center',background:'#FAFBFC'}}>
            <div style={{width:46,height:46,borderRadius:13,background:'#FEF3C7',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
              <ShoppingBag size={20} color="#D97706"/>
            </div>
            <h3 style={{fontFamily:'Plus Jakarta Sans',fontWeight:700,fontSize:16,color:'#475569',margin:'0 0 6px'}}>📢 Espace publicitaire disponible</h3>
            <p style={{fontSize:13,color:'#94A3B8',margin:'0 0 16px',maxWidth:400,marginLeft:'auto',marginRight:'auto',lineHeight:1.6}}>
              Vous êtes fournisseur de matériel ou consommables dentaires à Madagascar ? Rejoignez le réseau DPM et touchez directement +50 cabinets dentaires.
            </p>
            <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap',marginBottom:16}}>
              {[{icon:'📦',l:'Matériel dentaire'},{icon:'💊',l:'Consommables'},{icon:'🔧',l:'Équipements'},{icon:'🏥',l:'Mobilier cabinet'}].map(c=>(
                <span key={c.l} style={{display:'flex',alignItems:'center',gap:5,background:'#fff',border:'1px solid #E2E8F0',borderRadius:99,padding:'4px 12px',fontSize:12,fontWeight:600,color:'#475569'}}>
                  {c.icon} {c.l}
                </span>
              ))}
            </div>
            <a href="mailto:radisonfrancky@gmail.com?subject=Inscription fournisseur partenaire DPM"
              style={{display:'inline-flex',alignItems:'center',gap:7,padding:'10px 22px',borderRadius:11,background:'#F59E0B',color:'#fff',textDecoration:'none',fontSize:13,fontWeight:700}}>
              <Star size={13}/>Rejoindre le réseau fournisseur
            </a>
          </div>

          {/* Infos publicitaires */}
          <div style={{marginTop:16,background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',padding:'18px 22px'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
              <Sparkles size={16} color="#F59E0B"/>
              <h3 style={{fontFamily:'Plus Jakarta Sans',fontWeight:700,fontSize:15,color:'#0F172A',margin:0}}>Avantages du partenariat fournisseur DPM</h3>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10}}>
              {[
                {icon:'👁️',t:'Visibilité maximale',d:'Affiché à chaque commande de consommables'},
                {icon:'🎯',t:'Ciblage précis',d:'Uniquement des dentistes professionnels'},
                {icon:'📱',t:'Contact direct',d:'Les cabinets peuvent vous appeler en 1 clic'},
                {icon:'💎',t:'Badge partenaire',d:'Logo et certification dans l\'app DPM'},
              ].map(a=>(
                <div key={a.t} style={{background:'#FAFBFC',borderRadius:12,padding:'13px 14px',border:'1px solid #F1F5F9'}}>
                  <div style={{fontSize:22,marginBottom:6}}>{a.icon}</div>
                  <div style={{fontWeight:700,fontSize:13,color:'#0F172A',marginBottom:3}}>{a.t}</div>
                  <div style={{fontSize:12,color:'#64748B'}}>{a.d}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ══ MODAL FOURNISSEUR ══ */}
      <Modal open={isOpen} onClose={()=>{resetForm();setIsOpen(false);}} title={editing?`Modifier — ${editing.name}`:'Nouveau fournisseur'} desc={editing?undefined:'Ajoutez un nouveau fournisseur à votre liste'}>
        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:13}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={{gridColumn:'1/-1'}}>
              <label style={{fontSize:13,fontWeight:600,color:'#475569',display:'block',marginBottom:4}}>Nom *</label>
              <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Nom du fournisseur" style={inp} onFocus={fi} onBlur={bi}/>
            </div>
            <div>
              <label style={{fontSize:13,fontWeight:600,color:'#475569',display:'block',marginBottom:4}}>Type</label>
              <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={inp} onFocus={fi} onBlur={bi}>
                {SUPPLIER_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:13,fontWeight:600,color:'#475569',display:'block',marginBottom:4}}>Téléphone</label>
              <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="034 XX XXX XX" style={inp} onFocus={fi} onBlur={bi}/>
            </div>
            <div>
              <label style={{fontSize:13,fontWeight:600,color:'#475569',display:'block',marginBottom:4}}>Email</label>
              <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="contact@fournisseur.mg" style={inp} onFocus={fi} onBlur={bi}/>
            </div>
            <div>
              <label style={{fontSize:13,fontWeight:600,color:'#475569',display:'block',marginBottom:4}}>Ville</label>
              <input value={form.city} onChange={e=>setForm({...form,city:e.target.value})} style={inp} onFocus={fi} onBlur={bi}/>
            </div>
            <div style={{gridColumn:'1/-1'}}>
              <label style={{fontSize:13,fontWeight:600,color:'#475569',display:'block',marginBottom:4}}>Adresse</label>
              <input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Adresse complète" style={inp} onFocus={fi} onBlur={bi}/>
            </div>
            <div style={{gridColumn:'1/-1'}}>
              <label style={{fontSize:13,fontWeight:600,color:'#475569',display:'block',marginBottom:4}}>Notes</label>
              <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} placeholder="Informations supplémentaires..." style={{...inp,resize:'vertical'}} onFocus={fi} onBlur={bi}/>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,paddingTop:8,borderTop:'1px solid #F1F5F9'}}>
            <button type="button" onClick={()=>{resetForm();setIsOpen(false);}} style={{padding:'9px 18px',borderRadius:10,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer',fontSize:13,fontWeight:600,color:'#475569'}}>Annuler</button>
            <button type="submit" style={{padding:'9px 20px',borderRadius:10,background:'linear-gradient(135deg,#F59E0B,#D97706)',color:'#fff',border:'none',cursor:'pointer',fontSize:14,fontWeight:700,display:'flex',alignItems:'center',gap:7}}>
              {editing?<Edit size={14}/>:<Plus size={14}/>}{editing?'Enregistrer':'Créer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default SupplierManagement;
