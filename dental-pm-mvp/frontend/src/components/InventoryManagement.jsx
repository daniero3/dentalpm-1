import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { invalidateClientCache } from '../utils/clientCache';
import {
  Package, AlertTriangle, ArrowUp, ArrowDown, X,
  RefreshCw, Plus, Search, BarChart2, TrendingUp, Edit2
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8001/api'
    : '/api';
const authH = () => ({ withCredentials: true });
const fmt  = v => new Intl.NumberFormat('fr-MG').format(v || 0) + ' Ar';

const CATS = {
  CONSUMABLES: 'Consommables',
  MATERIALS: 'Matériaux',
  EQUIPMENT: 'Équipement',
  INSTRUMENTS: 'Instruments',
  PROSTHETICS: 'Prothèses',
  ORTHODONTICS: 'Orthodontie',
  HYGIENE: 'Hygiène',
  ANESTHESIA: 'Anesthésie',
  RADIOLOGY: 'Radiologie',
  OTHER: 'Autre'
};
const CATCLR = {
  CONSUMABLES: ['#0D7A87', '#F0FDFE'],
  MATERIALS: ['#10B981', '#DCFCE7'],
  EQUIPMENT: ['#7C3AED', '#EDE9FE'],
  INSTRUMENTS: ['#2563EB', '#DBEAFE'],
  PROSTHETICS: ['#D97706', '#FEF3C7'],
  ORTHODONTICS: ['#C026D3', '#FAE8FF'],
  HYGIENE: ['#059669', '#D1FAE5'],
  ANESTHESIA: ['#DC2626', '#FEE2E2'],
  RADIOLOGY: ['#475569', '#E2E8F0'],
  OTHER: ['#64748B', '#F1F5F9']
};

const apiErrorMessage = (error, fallback = 'Erreur') => {
  const data = error.response?.data;
  if (!data) return fallback;
  const code = data.code ? ` (${data.code})` : '';
  return `${data.error || fallback}${code}`;
};

const Modal = ({ open, onClose, title, children, maxW=520 }) => {
  if (!open) return null;
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{ position:'fixed',inset:0,zIndex:1000,background:'rgba(15,23,42,.55)',overflowY:'auto',padding:'60px 16px 32px' }}>
      <div style={{ background:'#fff',borderRadius:20,padding:26,width:'100%',maxWidth:maxW,margin:'0 auto',boxShadow:'0 24px 64px rgba(15,23,42,.2)',border:'1px solid #E2E8F0',position:'relative' }}>
        <button type="button" aria-label="Fermer la fenêtre" onClick={onClose} style={{ position:'absolute',top:14,right:14,background:'#F8FAFC',border:'none',cursor:'pointer',padding:7,borderRadius:8,display:'flex',color:'#64748B' }}><X size={15}/></button>
        {title&&<h2 style={{ fontFamily:'Plus Jakarta Sans',fontSize:17,fontWeight:700,color:'#0F172A',margin:'0 0 20px',paddingRight:28 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
};

const inp = { width:'100%',padding:'9px 12px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:13,fontFamily:'inherit',outline:'none',transition:'border-color .2s',boxSizing:'border-box' };
const fi  = e=>e.target.style.borderColor='#0D7A87', bi=e=>e.target.style.borderColor='#E2E8F0';

const InventoryManagement = () => {
  const [products, setProducts] = useState([]);
  const [alerts,   setAlerts]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [catF,     setCatF]     = useState('ALL');
  const [isAdd,    setIsAdd]    = useState(false);
  const [isMov,    setIsMov]    = useState(false);
  const [selP,     setSelP]     = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [movType,  setMovType]  = useState('IN');
  const qtyRef    = useRef();
  const reasonRef = useRef();

  const emptyForm = { name:'',sku:'',category:'CONSUMABLES',unit:'PIECE',unit_cost_mga:0,sale_price_mga:0,current_qty:0,min_qty:5 };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchAll(); }, []);
  const fetchAll      = async () => { setLoading(true); await Promise.all([fetchProducts(), fetchAlerts()]); setLoading(false); };
  const fetchProducts = async () => {
    try {
      const r = await axios.get(`${API}/inventory/products`, authH());
      setProducts(r.data.products || r.data || []);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Erreur chargement produits'));
      setProducts([]);
    }
  };
  const fetchAlerts = async () => {
    try {
      const r = await axios.get(`${API}/inventory/alerts`, authH());
      setAlerts(r.data.alerts || r.data || []);
    } catch {
      setAlerts([]);
    }
  };

  const handleAdd = async e => {
    e.preventDefault(); setSaving(true);
    try {
      await axios.post(`${API}/inventory/products`, { ...form, unit_cost_mga:parseFloat(form.unit_cost_mga)||0, sale_price_mga:parseFloat(form.sale_price_mga)||0, current_qty:parseInt(form.current_qty)||0, min_qty:parseInt(form.min_qty)||5 }, authH());
      invalidateClientCache('/inventory/products');
      toast.success('Produit ajouté'); setIsAdd(false); setForm(emptyForm); fetchAll();
    } catch(e){ toast.error(apiErrorMessage(e, 'Erreur création produit')); }
    finally { setSaving(false); }
  };

  const handleMovement = async () => {
    const qty = parseInt(qtyRef.current?.value);
    const reason = reasonRef.current?.value?.trim();
    if (!qty || qty<=0) { toast.error('Quantité requise'); return; }
    if (!reason) { toast.error('Motif requis'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/inventory/products/${selP.id}/movement`, { type:movType, quantity:qty, reason }, authH());
      invalidateClientCache('/inventory/products');
      toast.success('Mouvement enregistré'); setIsMov(false); setSelP(null); fetchAll();
    } catch(e){ toast.error(apiErrorMessage(e, 'Erreur mouvement stock')); }
    finally { setSaving(false); }
  };

  const openMov = p => {
    setSelP(() => p);
    setMovType('IN');
    setIsMov(true);
  };

  const filtered = products.filter(p => {
    const ms = catF==='ALL'||p.category===catF;
    const mt = !search||(p.name||'').toLowerCase().includes(search.toLowerCase())||(p.sku||'').toLowerCase().includes(search.toLowerCase());
    return ms&&mt;
  });

  const totalVal   = products.reduce((s,p)=>s+(p.current_qty||0)*(p.unit_cost_mga||0),0);
  const alertCount = alerts.length || products.filter(p=>p.current_qty<=p.min_qty).length;
  const lowStock   = products.filter(p=>p.current_qty<=p.min_qty);

  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:240 }}>
      <div style={{ width:36,height:36,border:'4px solid #E2E8F0',borderTopColor:'#0D7A87',borderRadius:'50%',animation:'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100,margin:'0 auto',paddingBottom:48 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.inv-row{animation:fadeUp .3s ease both}`}</style>

      {/* Header */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22,flexWrap:'wrap',gap:12 }}>
        <div style={{ display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ width:44,height:44,borderRadius:13,background:'linear-gradient(135deg,#0D7A87,#13A3B4)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 14px rgba(13,122,135,.3)' }}>
            <Package size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{ fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:22,color:'#0F172A',margin:0 }}>Inventaire</h1>
            <p style={{ color:'#64748B',fontSize:13,margin:0 }}>{products.length} produits · {alertCount} alertes</p>
          </div>
        </div>
        <div style={{ display:'flex',gap:8 }}>
          <button type="button" aria-label="Rafraîchir l’inventaire" onClick={fetchAll} style={{ padding:'8px 13px',borderRadius:10,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:5,fontSize:13,fontWeight:600,color:'#475569' }}>
            <RefreshCw size={13}/>
          </button>
          <button type="button" onClick={()=>{setForm(emptyForm);setIsAdd(true);}}
            style={{ padding:'9px 18px',borderRadius:10,background:'linear-gradient(135deg,#0D7A87,#13A3B4)',color:'#fff',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontSize:14,fontWeight:700,boxShadow:'0 4px 14px rgba(13,122,135,.3)' }}>
            <Plus size={15}/>Nouveau produit
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:20 }}>
        {[
          {icon:'📦',l:'Total produits',  v:products.length,    c:'#0D7A87', bg:'#F0FDFE'},
          {icon:'⚠️',l:'Stock bas',       v:lowStock.length,    c:'#EF4444', bg:'#FEE2E2'},
          {icon:'💰',l:'Valeur stock',    v:fmt(totalVal),      c:'#10B981', bg:'#DCFCE7', raw:true},
          {icon:'📊',l:'Catégories',      v:new Set(products.map(p=>p.category)).size, c:'#7C3AED', bg:'#EDE9FE'},
        ].map((k,i)=>(
          <div key={i} style={{ background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',padding:'14px 16px',display:'flex',alignItems:'center',gap:11 }}>
            <div style={{ width:36,height:36,borderRadius:10,background:k.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>{k.icon}</div>
            <div>
              <div style={{ fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:k.raw?13:20,color:'#0F172A',lineHeight:1 }}>{k.v}</div>
              <div style={{ fontSize:11,color:'#64748B',marginTop:2 }}>{k.l}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Alertes stock bas */}
      {lowStock.length>0&&(
        <div style={{ background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:14,padding:'14px 18px',marginBottom:18,display:'flex',gap:12,alignItems:'flex-start' }}>
          <AlertTriangle size={18} color="#C2410C" style={{ flexShrink:0,marginTop:1 }}/>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700,color:'#C2410C',fontSize:14,marginBottom:8 }}>
              {lowStock.length} produit(s) en stock bas ou rupture
            </div>
            <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
              {lowStock.map(p=>(
                <button type="button" key={p.id} onClick={()=>openMov(p)}
                  style={{ padding:'3px 11px',borderRadius:99,border:'1px solid #FED7AA',background:'#fff',color:'#C2410C',cursor:'pointer',fontSize:12,fontWeight:600 }}>
                  {p.name} — {p.current_qty} {p.unit}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div style={{ background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',padding:'11px 16px',marginBottom:14,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center' }}>
        <div style={{ display:'flex',alignItems:'center',gap:7,flex:1,minWidth:200 }}>
          <Search size={13} color="#94A3B8"/>
          <input aria-label="Rechercher un produit" placeholder="Rechercher produit, SKU..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{ border:'none',background:'transparent',outline:'none',fontSize:13,flex:1 }}/>
          {search&&<button type="button" aria-label="Effacer la recherche" onClick={()=>setSearch('')} style={{ background:'none',border:'none',cursor:'pointer',color:'#94A3B8',padding:0 }}><X size={12}/></button>}
        </div>
        <div style={{ display:'flex',gap:5 }}>
          {['ALL',...Object.keys(CATS)].map(cat=>(
            <button type="button" key={cat} onClick={()=>setCatF(cat)}
              style={{ padding:'5px 11px',borderRadius:99,border:'none',cursor:'pointer',fontSize:11,fontWeight:600,background:catF===cat?'#0D7A87':'#F1F5F9',color:catF===cat?'#fff':'#64748B',transition:'all .15s' }}>
              {cat==='ALL'?'Tous':CATS[cat]}
            </button>
          ))}
        </div>
        <span style={{ fontSize:11,color:'#94A3B8' }}>{filtered.length} produit(s)</span>
      </div>

      {/* Table produits */}
      {filtered.length===0?(
        <div style={{ background:'#fff',borderRadius:18,border:'1px solid #E2E8F0',padding:'52px',textAlign:'center' }}>
          <Package size={40} style={{ margin:'0 auto 14px',color:'#CBD5E1' }}/>
          <p style={{ fontWeight:700,color:'#475569',fontSize:15,margin:'0 0 6px' }}>Aucun produit</p>
          <p style={{ color:'#94A3B8',fontSize:13,margin:'0 0 18px' }}>{search?`Aucun résultat pour "${search}"`:'Créez votre premier produit'}</p>
          <button type="button" onClick={()=>{setForm(emptyForm);setIsAdd(true);}} style={{ padding:'10px 22px',borderRadius:11,background:'linear-gradient(135deg,#0D7A87,#13A3B4)',color:'#fff',border:'none',cursor:'pointer',fontSize:14,fontWeight:700 }}>
            Nouveau produit
          </button>
        </div>
      ):(
        <div style={{ background:'#fff',borderRadius:18,border:'1px solid #E2E8F0',overflow:'hidden' }}>
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
            <thead>
              <tr style={{ background:'#F8FAFC' }}>
                {['Produit','SKU','Catégorie','Stock','Min.','Valeur stock','Actions'].map(h=>(
                  <th key={h} style={{ padding:'10px 16px',textAlign:'left',fontWeight:600,fontSize:11,color:'#64748B',textTransform:'uppercase',letterSpacing:'.05em',borderBottom:'1px solid #E2E8F0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p,idx)=>{
                const isLow = p.current_qty<=p.min_qty;
                const [cc,cbg] = CATCLR[p.category]||CATCLR.OTHER;
                return(
                  <tr key={p.id} className="inv-row" style={{ borderBottom:'1px solid #F8FAFC',transition:'background .12s',animationDelay:`${Math.min(idx,.15)*.03}s` }}
                    onMouseOver={e=>e.currentTarget.style.background='#FAFBFC'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'12px 16px',fontWeight:700,color:'#0F172A' }}>{p.name}</td>
                    <td style={{ padding:'12px 16px',fontFamily:'monospace',fontSize:11,color:'#64748B' }}>{p.sku}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ background:cbg,color:cc,borderRadius:99,padding:'2px 9px',fontSize:11,fontWeight:600 }}>{CATS[p.category]||p.category}</span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                        <span style={{ fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:16,color:isLow?'#EF4444':'#0F172A' }}>{p.current_qty}</span>
                        <span style={{ fontSize:11,color:'#94A3B8' }}>{p.unit}</span>
                        {isLow&&<AlertTriangle size={13} color="#EF4444"/>}
                      </div>
                    </td>
                    <td style={{ padding:'12px 16px',color:'#64748B',fontSize:12 }}>{p.min_qty} {p.unit}</td>
                    <td style={{ padding:'12px 16px',color:'#0D7A87',fontWeight:700,fontSize:12 }}>{fmt((p.current_qty||0)*(p.unit_cost_mga||0))}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <button type="button" onClick={()=>openMov(p)}
                        style={{ padding:'6px 12px',borderRadius:8,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer',fontSize:12,fontWeight:600,color:'#0D7A87',display:'flex',alignItems:'center',gap:4,transition:'all .15s' }}
                        onMouseOver={e=>{e.currentTarget.style.borderColor='#0D7A87';e.currentTarget.style.background='#F0FDFE';}}
                        onMouseOut={e=>{e.currentTarget.style.borderColor='#E2E8F0';e.currentTarget.style.background='#fff';}}>
                        <ArrowUp size={11}/><ArrowDown size={11}/>Mouvement
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal Ajouter produit ── */}
      <Modal open={isAdd} onClose={()=>setIsAdd(false)} title="📦 Nouveau produit">
        <form onSubmit={handleAdd} style={{ display:'flex',flexDirection:'column',gap:12 }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:4 }}>Nom *</label>
              <input aria-label="Nom du produit" style={inp} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} onFocus={fi} onBlur={bi} required placeholder="Ex: Composite A2"/>
            </div>
            <div>
              <label style={{ fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:4 }}>SKU *</label>
              <input aria-label="SKU du produit" style={inp} value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} onFocus={fi} onBlur={bi} required placeholder="Ex: CPO-A2"/>
            </div>
            <div>
              <label style={{ fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:4 }}>Unité</label>
              <input aria-label="Unité du produit" style={inp} value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} onFocus={fi} onBlur={bi} placeholder="PIECE, BOX, ML..."/>
            </div>
            <div>
	              <label htmlFor="inventory-product-category" style={{ fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:4 }}>Catégorie</label>
		              <select id="inventory-product-category" aria-label="Catégorie du produit" style={inp} value={form.category} onChange={e=>setForm({...form,category:e.target.value})} onFocus={fi} onBlur={bi}>
                {Object.entries(CATS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
	              <label htmlFor="inventory-unit-cost" style={{ fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:4 }}>Prix achat (Ar)</label>
		              <input id="inventory-unit-cost" aria-label="Prix achat" style={inp} type="number" min="0" value={form.unit_cost_mga} onChange={e=>setForm({...form,unit_cost_mga:e.target.value})} onFocus={fi} onBlur={bi}/>
            </div>
            <div>
	              <label htmlFor="inventory-sale-price" style={{ fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:4 }}>Prix vente (Ar)</label>
		              <input id="inventory-sale-price" aria-label="Prix vente" style={inp} type="number" min="0" value={form.sale_price_mga} onChange={e=>setForm({...form,sale_price_mga:e.target.value})} onFocus={fi} onBlur={bi}/>
            </div>
            <div>
	              <label htmlFor="inventory-initial-stock" style={{ fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:4 }}>Stock initial</label>
		              <input id="inventory-initial-stock" aria-label="Stock initial" style={inp} type="number" min="0" value={form.current_qty} onChange={e=>setForm({...form,current_qty:e.target.value})} onFocus={fi} onBlur={bi}/>
            </div>
            <div>
	              <label htmlFor="inventory-min-stock" style={{ fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:4 }}>Stock minimum</label>
		              <input id="inventory-min-stock" aria-label="Stock minimum" style={inp} type="number" min="0" value={form.min_qty} onChange={e=>setForm({...form,min_qty:e.target.value})} onFocus={fi} onBlur={bi}/>
            </div>
          </div>
          <div style={{ display:'flex',justifyContent:'flex-end',gap:8,paddingTop:8,borderTop:'1px solid #F1F5F9' }}>
            <button type="button" onClick={()=>setIsAdd(false)} style={{ padding:'9px 18px',borderRadius:10,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer',fontSize:13,fontWeight:600,color:'#475569' }}>Annuler</button>
            <button type="submit" disabled={saving} style={{ padding:'9px 22px',borderRadius:10,background:'linear-gradient(135deg,#0D7A87,#13A3B4)',color:'#fff',border:'none',cursor:'pointer',fontSize:14,fontWeight:700,display:'flex',alignItems:'center',gap:7,opacity:saving?.7:1 }}>
              {saving?<div style={{ width:14,height:14,border:'2px solid rgba(255,255,255,.4)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .8s linear infinite' }}/>:<Plus size={14}/>}
              Ajouter
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Mouvement stock ── */}
      <Modal open={isMov} onClose={()=>{setIsMov(false);setSelP(null);}} title={selP?`📊 Mouvement — ${selP.name}`:'Mouvement stock'}>
        {selP&&(
          <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
            <div style={{ background:'#F0FDFE',border:'1px solid #7DD3DA',borderRadius:12,padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
              <span style={{ fontWeight:700,color:'#0D7A87',fontSize:14 }}>Stock actuel</span>
              <span style={{ fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:22,color:'#0D7A87' }}>{selP.current_qty} <span style={{ fontSize:14 }}>{selP.unit}</span></span>
            </div>
            <div>
              <label style={{ fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:6 }}>Type *</label>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6 }}>
                {[['IN','📥 Entrée','#10B981'],['OUT','📤 Sortie','#EF4444'],['ADJUST','🔧 Ajustement','#F59E0B']].map(([v,l,c])=>(
                  <button key={v} type="button" onClick={()=>setMovType(v)}
                    style={{ padding:'10px',borderRadius:10,border:`2px solid ${movType===v?c:'#E2E8F0'}`,background:movType===v?`${c}15`:'#fff',cursor:'pointer',fontSize:12,fontWeight:700,color:movType===v?c:'#64748B',transition:'all .15s' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:5 }}>
                Quantité * {movType==='ADJUST'?'(nouveau total)':''}
              </label>
              <input ref={qtyRef} aria-label="Quantité du mouvement" type="number" min="1" placeholder="Ex: 10" style={{ ...inp,fontSize:18,fontWeight:700 }} onFocus={fi} onBlur={bi}/>
            </div>
            <div>
              <label style={{ fontSize:12,fontWeight:600,color:'#475569',display:'block',marginBottom:5 }}>Motif *</label>
              <input ref={reasonRef} aria-label="Motif du mouvement" type="text" placeholder="Ex: Réception commande, Utilisation cabinet..." style={inp} onFocus={fi} onBlur={bi}/>
            </div>
            <div style={{ display:'flex',justifyContent:'flex-end',gap:8,paddingTop:8,borderTop:'1px solid #F1F5F9' }}>
              <button type="button" onClick={()=>{setIsMov(false);setSelP(null);}} style={{ padding:'9px 18px',borderRadius:10,border:'1.5px solid #E2E8F0',background:'#fff',cursor:'pointer',fontSize:13,fontWeight:600,color:'#475569' }}>Annuler</button>
              <button type="button" onClick={handleMovement} disabled={saving}
                style={{ padding:'9px 22px',borderRadius:10,background:'linear-gradient(135deg,#0D7A87,#13A3B4)',color:'#fff',border:'none',cursor:'pointer',fontSize:14,fontWeight:700,display:'flex',alignItems:'center',gap:7,opacity:saving?.7:1 }}>
                {saving?<div style={{ width:14,height:14,border:'2px solid rgba(255,255,255,.4)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .8s linear infinite' }}/>:
                  movType==='IN'?<ArrowUp size={14}/>:movType==='OUT'?<ArrowDown size={14}/>:null}
                Enregistrer
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InventoryManagement;
