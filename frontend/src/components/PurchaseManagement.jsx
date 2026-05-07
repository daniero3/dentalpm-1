import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ShoppingCart, Plus, Truck, Package, Check, FileText,
  RefreshCw, Trash2, Printer, X, Search, Star, Zap,
  Award, ExternalLink, Tag, ArrowRight, Building2,
  ChevronRight, ShoppingBag, Sparkles, Phone, Mail
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const authH = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const fmt = v => new Intl.NumberFormat('fr-MG').format(v || 0) + ' Ar';
const fdate = d => new Date(d).toLocaleDateString('fr-FR');

/* ── Catalogue fournisseurs partenaires avec articles ───────────────────────
   À terme à charger depuis /api/suppliers/partners/catalog
─────────────────────────────────────────────────────────────────────────── */
const PARTNER_CATALOG = [
  {
    sup_id: 'ps1', name: 'DentaSup Madagascar', type: 'DENTAL',
    phone: '034 56 789 01', email: 'dentasup.mada@gmail.com',
    city: 'Analakely, Antananarivo',
    badge: 'Fournisseur Gold', badgeColor: '#D97706', badgeBg: '#FFFBEB',
    featured: true, rating: 4.9, reviews: 38,
    promo: '10% de remise sur commande > 500 000 Ar',
    desc: 'Distributeur officiel de matériaux dentaires. Livraison J+1 Antananarivo.',
    articles: [
      { id:'a1', name:'Composite A2 (4g)', ref:'CPO-A2-4G', price:45000,  unit:'Tube',   stock:'En stock',  cat:'Composite',    img:'🦷' },
      { id:'a2', name:'Composite A3 (4g)', ref:'CPO-A3-4G', price:45000,  unit:'Tube',   stock:'En stock',  cat:'Composite',    img:'🦷' },
      { id:'a3', name:'Anesthésiant carpule Lidocaïne 2%', ref:'ANE-LID2', price:2500,   unit:'Carpule', stock:'En stock',  cat:'Anesthésie',   img:'💉' },
      { id:'a4', name:'Ciment verre ionomère', ref:'CVI-001', price:85000,  unit:'Kit',    stock:'En stock',  cat:'Ciment',       img:'🧪' },
      { id:'a5', name:'Latex gants (100pcs) S', ref:'GLV-S',  price:18000,  unit:'Boîte',  stock:'Limité',    cat:'Consommable',  img:'🧤' },
      { id:'a6', name:'Latex gants (100pcs) M', ref:'GLV-M',  price:18000,  unit:'Boîte',  stock:'En stock',  cat:'Consommable',  img:'🧤' },
      { id:'a7', name:'Masques chirurgicaux (50pcs)', ref:'MSK-50', price:12000, unit:'Boîte', stock:'En stock', cat:'Consommable', img:'😷' },
      { id:'a8', name:'Seringues irrigation (50pcs)', ref:'SIR-50', price:22000, unit:'Boîte', stock:'En stock', cat:'Matériel',    img:'🔬' },
    ],
  },
  {
    sup_id: 'ps2', name: 'MedEquip Tana', type: 'EQUIPMENT',
    phone: '032 23 456 78', email: 'medequip.tana@gmail.com',
    city: 'Tsiadana, Antananarivo',
    badge: 'Fournisseur Silver', badgeColor: '#64748B', badgeBg: '#F1F5F9',
    featured: false, rating: 4.7, reviews: 22,
    promo: null,
    desc: 'Équipements dentaires. SAV et maintenance inclus. Garantie 2 ans.',
    articles: [
      { id:'b1', name:'Turbine dentaire haute vitesse', ref:'TRB-HV1', price:380000, unit:'Pièce', stock:'Sur commande', cat:'Équipement', img:'⚙️' },
      { id:'b2', name:'Contre-angle bague bleue', ref:'CAB-BLU',      price:120000, unit:'Pièce', stock:'En stock',     cat:'Équipement', img:'⚙️' },
      { id:'b3', name:'Pièce à main droite',          ref:'PAM-001',  price:95000,  unit:'Pièce', stock:'En stock',     cat:'Équipement', img:'🔧' },
      { id:'b4', name:'Embout air/eau (5 pcs)',        ref:'EAE-5',    price:35000,  unit:'Lot',   stock:'En stock',     cat:'Matériel',   img:'💧' },
      { id:'b5', name:'Lampe photopolymérisatrice LED',ref:'LED-PHO',  price:450000, unit:'Pièce', stock:'En stock',     cat:'Équipement', img:'💡' },
    ],
  },
  {
    sup_id: 'ps3', name: 'Pharma Dental Pro', type: 'PHARMA',
    phone: '033 11 222 33', email: 'pharmadentalpro@gmail.com',
    city: 'Behoririka, Antananarivo',
    badge: 'Fournisseur Silver', badgeColor: '#64748B', badgeBg: '#F1F5F9',
    featured: false, rating: 4.6, reviews: 16,
    promo: 'Livraison offerte dès 200 000 Ar',
    desc: 'Fournitures pharmaceutiques pour cabinets dentaires.',
    articles: [
      { id:'c1', name:'Amoxicilline 500mg (16cp)',     ref:'AMX-500', price:8500,  unit:'Boîte', stock:'En stock',  cat:'Antibiotique', img:'💊' },
      { id:'c2', name:'Ibuprofène 400mg (20cp)',       ref:'IBU-400', price:6500,  unit:'Boîte', stock:'En stock',  cat:'Antidouleur',  img:'💊' },
      { id:'c3', name:'Bétadine buccale 125ml',        ref:'BET-125', price:12000, unit:'Flacon',stock:'En stock',  cat:'Antiseptique', img:'🧴' },
      { id:'c4', name:'Eau oxygénée 10vol 250ml',      ref:'H2O-250', price:4500,  unit:'Flacon',stock:'En stock',  cat:'Antiseptique', img:'🧴' },
      { id:'c5', name:'Serum physiologique 250ml',     ref:'SER-250', price:3500,  unit:'Flacon',stock:'En stock',  cat:'Solution',     img:'💉' },
      { id:'c6', name:'Vaseline stérile 50g',          ref:'VAS-50',  price:5000,  unit:'Tube',  stock:'Limité',    cat:'Soins',        img:'🧪' },
    ],
  },
];

const CATS = ['Tous', 'Composite', 'Anesthésie', 'Ciment', 'Consommable', 'Équipement', 'Matériel', 'Antibiotique', 'Antidouleur', 'Antiseptique', 'Solution', 'Soins'];
const TYPE_COLOR = { DENTAL:'#1D4ED8', EQUIPMENT:'#7C3AED', PHARMA:'#166534', GENERAL:'#475569' };
const TYPE_BG    = { DENTAL:'#EFF6FF', EQUIPMENT:'#EDE9FE', PHARMA:'#DCFCE7', GENERAL:'#F1F5F9' };
const TYPE_LABEL = { DENTAL:'Dentaire', EQUIPMENT:'Équipement', PHARMA:'Pharmacie', GENERAL:'Général' };

const STATUS = {
  DRAFT:     { bg:'#FFFBEB', c:'#B45309', dot:'#F59E0B', l:'Brouillon' },
  RECEIVED:  { bg:'#DCFCE7', c:'#166534', dot:'#22C55E', l:'Reçu' },
  CANCELLED: { bg:'#F1F5F9', c:'#475569', dot:'#94A3B8', l:'Annulé' },
};

/* ── Modal ── */
const Modal = ({ open, onClose, title, children, maxW = 680 }) => {
  if (!open) return null;
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(15,23,42,.55)', overflowY:'auto', padding:'60px 16px 32px' }}>
      <div style={{ background:'#fff', borderRadius:20, padding:28, width:'100%', maxWidth:maxW, margin:'0 auto', boxShadow:'0 24px 64px rgba(15,23,42,.2)', border:'1px solid #E2E8F0', position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'#F8FAFC', border:'none', cursor:'pointer', padding:7, borderRadius:8, display:'flex', alignItems:'center', color:'#64748B' }}>
          <X size={15}/>
        </button>
        {title && <h2 style={{ fontFamily:'Plus Jakarta Sans', fontSize:17, fontWeight:700, color:'#0F172A', margin:'0 0 20px', paddingRight:28 }}>{title}</h2>}
        {children}
      </div>
    </div>
  );
};

/* ── Article card dans le catalogue ── */
const ArticleCard = ({ art, onAdd, sup }) => {
  const isLow = art.stock === 'Limité';
  const isOOS = art.stock === 'Sur commande';
  return (
    <div style={{ border:'1.5px solid #E2E8F0', borderRadius:14, padding:'14px 16px', background:'#fff', position:'relative', transition:'all .2s' }}
      onMouseOver={e=>{e.currentTarget.style.borderColor='#0D7A87';e.currentTarget.style.boxShadow='0 4px 16px rgba(13,122,135,.1)';}}
      onMouseOut={e=>{e.currentTarget.style.borderColor='#E2E8F0';e.currentTarget.style.boxShadow='none';}}>
      {isLow && <div style={{ position:'absolute', top:10, right:10, background:'#FEF3C7', color:'#B45309', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99 }}>Stock limité</div>}
      <div style={{ fontSize:28, marginBottom:8 }}>{art.img}</div>
      <div style={{ fontWeight:700, fontSize:13, color:'#0F172A', marginBottom:3, lineHeight:1.3 }}>{art.name}</div>
      <div style={{ fontSize:10, color:'#94A3B8', marginBottom:6 }}>Réf: {art.ref} · {art.unit}</div>
      <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:10 }}>
        <span style={{ background: isOOS?'#F1F5F9':isLow?'#FEF3C7':'#DCFCE7', color: isOOS?'#475569':isLow?'#B45309':'#166534', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99 }}>
          {art.stock}
        </span>
        <span style={{ background:TYPE_BG[sup.type], color:TYPE_COLOR[sup.type], fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:99 }}>{art.cat}</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:15, color:'#0D7A87' }}>{fmt(art.price)}</span>
        <button onClick={() => onAdd(art, sup)} disabled={isOOS}
          style={{ padding:'6px 12px', borderRadius:9, background: isOOS?'#F1F5F9':'#0D7A87', color: isOOS?'#94A3B8':'#fff', border:'none', cursor: isOOS?'not-allowed':'pointer', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
          <Plus size={12}/>{isOOS?'Sur commande':'Ajouter'}
        </button>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════════ */
const PurchaseManagement = () => {
  const [purchases,  setPurchases]  = useState([]);
  const [suppliers,  setSuppliers]  = useState([]);
  const [products,   setProducts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [isOpen,     setIsOpen]     = useState(false);
  const [selSup,     setSelSup]     = useState('');
  const [items,      setItems]      = useState([]);
  const [notes,      setNotes]      = useState('');
  const [tab,        setTab]        = useState('orders');   // orders | catalog | partners
  const [catSearch,  setCatSearch]  = useState('');
  const [catFilter,  setCatFilter]  = useState('Tous');
  const [selPartner, setSelPartner] = useState(null);       // fournisseur partenaire sélectionné
  const [cart,       setCart]       = useState([]);          // panier catalogue partenaire
  const [showCart,   setShowCart]   = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchPurchases(), fetchSuppliers(), fetchProducts()]);
    setLoading(false);
  };
  const fetchPurchases = async () => {
    try { const r = await axios.get(`${API}/purchases`, authH()); setPurchases(r.data.purchases || []); } catch {}
  };
  const fetchSuppliers = async () => {
    try { const r = await axios.get(`${API}/suppliers`, authH()); setSuppliers(r.data.suppliers || []); } catch {}
  };
  const fetchProducts = async () => {
    try { const r = await axios.get(`${API}/inventory/products`, authH()); setProducts(r.data.products || []); } catch {}
  };

  /* Bons de commande manuels */
  const addItem    = () => setItems([...items, { product_id:'', qty:1, unit_price_mga:0 }]);
  const removeItem = idx => setItems(items.filter((_,i) => i !== idx));
  const updateItem = (idx, f, v) => {
    const n = [...items];
    n[idx][f] = v;
    if (f === 'product_id') {
      const p = products.find(p => p.id === v);
      if (p) n[idx].unit_price_mga = parseFloat(p.unit_cost_mga) || 0;
    }
    setItems(n);
  };
  const total = () => items.reduce((s,i) => s + i.qty * i.unit_price_mga, 0);

  const handleCreate = async () => {
    if (!selSup || items.length === 0) { toast.error('Fournisseur et articles requis'); return; }
    const valid = items.filter(i => i.product_id && i.qty > 0);
    if (!valid.length) { toast.error('Ajoutez au moins un article valide'); return; }
    try {
      const r = await axios.post(`${API}/purchases`, { supplier_id: selSup, items: valid, notes }, authH());
      toast.success(`Bon ${r.data.purchase.number} créé`);
      resetForm(); setIsOpen(false); fetchPurchases();
    } catch (e) { toast.error(e.response?.data?.error || 'Erreur'); }
  };

  const handleReceive = async p => {
    if (!window.confirm(`Réceptionner le bon ${p.number} ? Le stock sera mis à jour.`)) return;
    try { await axios.post(`${API}/purchases/${p.id}/receive`, {}, authH()); toast.success('Commande réceptionnée, stock mis à jour'); fetchPurchases(); }
    catch (e) { toast.error(e.response?.data?.error || 'Erreur'); }
  };
  const handlePrint = p => window.open(`${API}/purchases/${p.id}/print`, '_blank');
  const resetForm   = () => { setSelSup(''); setItems([]); setNotes(''); };

  /* Catalogue partenaires */
  const addToCart = (art, sup) => {
    const exists = cart.findIndex(c => c.id === art.id);
    if (exists >= 0) {
      const nc = [...cart]; nc[exists].qty += 1; setCart(nc);
    } else {
      setCart([...cart, { ...art, qty:1, sup_name:sup.name, sup_id:sup.sup_id }]);
    }
    toast.success(`${art.name} ajouté au panier`);
  };
  const removeFromCart  = id => setCart(cart.filter(c => c.id !== id));
  const updateCartQty   = (id, qty) => setCart(cart.map(c => c.id === id ? {...c, qty: Math.max(1,qty)} : c));
  const cartTotal       = () => cart.reduce((s,c) => s + c.price * c.qty, 0);
  const sendCartOrder   = () => {
    if (!cart.length) return;
    const lines = cart.map(c => `- ${c.name} x${c.qty} = ${fmt(c.price * c.qty)}`).join('\n');
    const body  = encodeURIComponent(`Bonjour,\n\nJe souhaite commander les articles suivants via DPM Madagascar :\n\n${lines}\n\nTotal estimé : ${fmt(cartTotal())}\n\nMerci`);
    const sup   = PARTNER_CATALOG.find(s => s.sup_id === cart[0]?.sup_id);
    if (sup) window.open(`mailto:${sup.email}?subject=Commande via DPM Madagascar&body=${body}`, '_blank');
    toast.success('Email de commande ouvert !');
  };

  /* Filtrage catalogue */
  const allArticles = PARTNER_CATALOG.flatMap(s => s.articles.map(a => ({ ...a, sup: s })));
  const filteredArts = allArticles.filter(a => {
    const ms = catFilter === 'Tous' || a.cat === catFilter;
    const mt = !catSearch || a.name.toLowerCase().includes(catSearch.toLowerCase()) || a.ref.toLowerCase().includes(catSearch.toLowerCase());
    return ms && mt;
  });

  const inp = { width:'100%', padding:'9px 12px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:13, fontFamily:'inherit', outline:'none', transition:'border-color .2s' };
  const fi = e => e.target.style.borderColor = '#0D7A87';
  const bi = e => e.target.style.borderColor = '#E2E8F0';

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:240 }}>
      <div style={{ width:36, height:36, border:'4px solid #C7D2FE', borderTopColor:'#4F46E5', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const draftCount    = purchases.filter(p => p.status === 'DRAFT').length;
  const receivedCount = purchases.filter(p => p.status === 'RECEIVED').length;
  const totalExpenses = purchases.filter(p => p.status !== 'CANCELLED').reduce((s,p) => s + parseFloat(p.total_mga||0), 0);
  const totalReceived = purchases.filter(p => p.status === 'RECEIVED').reduce((s,p) => s + parseFloat(p.total_mga||0), 0);

  return (
    <div style={{ maxWidth: 1100, margin:'0 auto', paddingBottom:48 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.pu-card{animation:fadeUp .35s ease both}`}</style>

      {/* ── En-tête ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:13, background:'linear-gradient(135deg,#4F46E5,#6366F1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ShoppingCart size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:22, color:'#0F172A', margin:0 }}>Achats</h1>
            <p style={{ color:'#64748B', fontSize:13, margin:0 }}>{purchases.length} bon(s) · {fmt(totalExpenses)} de dépenses cabinet</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {/* Badge panier */}
          {cart.length > 0 && (
            <button onClick={() => setShowCart(true)} style={{ position:'relative', padding:'8px 16px', borderRadius:10, background:'#4F46E5', color:'#fff', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:7, fontSize:13, fontWeight:700, boxShadow:'0 4px 14px rgba(79,70,229,.3)' }}>
              <ShoppingBag size={14}/> Panier
              <span style={{ position:'absolute', top:-6, right:-6, width:20, height:20, borderRadius:'50%', background:'#EF4444', color:'#fff', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {cart.reduce((s,c) => s + c.qty, 0)}
              </span>
            </button>
          )}
          <button onClick={fetchAll} style={{ padding:'8px 14px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, fontWeight:600, color:'#475569' }}>
            <RefreshCw size={13}/>Actualiser
          </button>
          <button onClick={() => { resetForm(); setIsOpen(true); }} style={{ padding:'9px 18px', borderRadius:10, background:'linear-gradient(135deg,#4F46E5,#6366F1)', color:'#fff', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:14, fontWeight:700, boxShadow:'0 4px 14px rgba(79,70,229,.3)' }}>
            <Plus size={15}/>Nouveau bon
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="pu-card" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { icon:'📄', l:'Brouillons',    v:draftCount,    c:'#F59E0B', bg:'#FFFBEB' },
          { icon:'✅', l:'Reçus',          v:receivedCount, c:'#10B981', bg:'#DCFCE7' },
          { icon:'💸', l:'Dépenses cabinet', v:fmt(totalExpenses), c:'#EF4444', bg:'#FEE2E2', raw:true },
          { icon:'💰', l:'Achats reçus',      v:fmt(totalReceived), c:'#4F46E5', bg:'#EDE9FE', raw:true },
          { icon:'🛍️', l:'Fournisseurs',  v:suppliers.length,  c:'#0D7A87', bg:'#F0FDFE' },
        ].map((k,i) => (
          <div key={i} style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'16px 18px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:11, background:k.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{k.icon}</div>
            <div>
              <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:18, color:'#0F172A' }}>{k.raw ? k.v : k.v}</div>
              <div style={{ fontSize:12, color:'#64748B' }}>{k.l}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:'flex', gap:4, marginBottom:20, background:'#F8FAFC', borderRadius:12, padding:4, border:'1px solid #E2E8F0' }}>
        {[
          { k:'orders',  l:'📋 Mes commandes',          n:purchases.length },
          { k:'catalog', l:'🛒 Catalogue partenaires',  n:allArticles.length },
          { k:'partners',l:'🤝 Fournisseurs',            n:PARTNER_CATALOG.length },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            style={{ flex:1, padding:'9px', borderRadius:9, border:'none', cursor:'pointer', fontWeight:600, fontSize:13, transition:'all .2s', background:tab===t.k?'#fff':'transparent', color:tab===t.k?'#4F46E5':'#64748B', boxShadow:tab===t.k?'0 1px 6px rgba(0,0,0,.08)':'none' }}>
            {t.l}
            <span style={{ background:tab===t.k?'#EDE9FE':'#E2E8F0', color:tab===t.k?'#4F46E5':'#94A3B8', borderRadius:99, padding:'1px 7px', fontSize:11, fontWeight:700, marginLeft:4 }}>{t.n}</span>
          </button>
        ))}
      </div>

      {/* ══ TAB COMMANDES ══ */}
      {tab === 'orders' && (
        <>
          {purchases.length === 0 ? (
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', padding:'48px', textAlign:'center' }}>
              <ShoppingCart size={40} style={{ margin:'0 auto 12px', color:'#CBD5E1' }}/>
              <p style={{ fontWeight:700, color:'#475569', fontSize:15, margin:'0 0 6px' }}>Aucun bon de commande</p>
              <p style={{ color:'#94A3B8', fontSize:13, margin:'0 0 18px' }}>Créez un bon ou commandez via le catalogue partenaire</p>
              <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
                <button onClick={() => { resetForm(); setIsOpen(true); }} style={{ padding:'9px 18px', borderRadius:10, background:'#4F46E5', color:'#fff', border:'none', cursor:'pointer', fontSize:13, fontWeight:700 }}>Nouveau bon</button>
                <button onClick={() => setTab('catalog')} style={{ padding:'9px 18px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', color:'#475569', cursor:'pointer', fontSize:13, fontWeight:600 }}>Voir le catalogue</button>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {purchases.map((p, idx) => {
                const st = STATUS[p.status] || STATUS.CANCELLED;
                return (
                  <div key={p.id} className="pu-card" style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', padding:'18px 22px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, animationDelay:`${idx*.04}s`, boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                      <div style={{ width:42, height:42, borderRadius:12, background:st.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <ShoppingCart size={18} color={st.c}/>
                      </div>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                          <span style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A' }}>{p.number}</span>
                          <span style={{ background:st.bg, color:st.c, borderRadius:99, padding:'2px 10px', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
                            <div style={{ width:5, height:5, borderRadius:'50%', background:st.dot }}/>{st.l}
                          </span>
                        </div>
                        <div style={{ fontSize:12, color:'#64748B', display:'flex', gap:14, flexWrap:'wrap' }}>
                          <span style={{ display:'flex', alignItems:'center', gap:4 }}><Truck size={11}/>{p.supplier?.name || '—'}</span>
                          <span>{p.items_count || p.items?.length || 0} article(s)</span>
                          <span>{fdate(p.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:17, color:'#0F172A' }}>{fmt(p.total_mga)}</div>
                      <div style={{ display:'flex', gap:7 }}>
                        <button onClick={() => handlePrint(p)} style={{ padding:'7px 11px', borderRadius:9, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center' }}>
                          <Printer size={13} color="#64748B"/>
                        </button>
                        {p.status === 'DRAFT' && (
                          <button onClick={() => handleReceive(p)} style={{ padding:'7px 14px', borderRadius:9, background:'#10B981', color:'#fff', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                            <Check size={13}/>Réceptionner
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ══ TAB CATALOGUE PARTENAIRES ══ */}
      {tab === 'catalog' && (
        <>
          {/* Bannière */}
          <div style={{ background:'linear-gradient(135deg,#4F46E5,#6366F1)', borderRadius:18, padding:'20px 24px', marginBottom:18, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)', backgroundSize:'36px 36px', pointerEvents:'none' }}/>
            <div style={{ position:'relative', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:14 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,.7)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:6 }}>🛒 Catalogue partenaires DPM</div>
                <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:18, color:'#fff', margin:'0 0 4px' }}>Commandez directement depuis DPM</h2>
                <p style={{ fontSize:13, color:'rgba(255,255,255,.75)', margin:0 }}>{allArticles.length} articles disponibles chez {PARTNER_CATALOG.length} fournisseurs partenaires</p>
              </div>
              {cart.length > 0 && (
                <button onClick={() => setShowCart(true)} style={{ padding:'10px 20px', borderRadius:12, background:'#fff', color:'#4F46E5', fontWeight:800, fontSize:14, border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  <ShoppingBag size={16}/> Panier ({cart.reduce((s,c)=>s+c.qty,0)}) · {fmt(cartTotal())}
                </button>
              )}
            </div>
          </div>

          {/* Filtres catalogue */}
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', padding:'13px 16px', marginBottom:16, display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flex:1, minWidth:180 }}>
              <Search size={14} color="#94A3B8"/>
              <input placeholder="Rechercher article, référence..." value={catSearch} onChange={e => setCatSearch(e.target.value)}
                style={{ ...inp, border:'none', background:'transparent', flex:1 }} onFocus={fi} onBlur={bi}/>
            </div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {CATS.slice(0, 7).map(cat => (
                <button key={cat} onClick={() => setCatFilter(cat)}
                  style={{ padding:'4px 11px', borderRadius:99, border:'none', cursor:'pointer', fontSize:11, fontWeight:600, background:catFilter===cat?'#4F46E5':'#F1F5F9', color:catFilter===cat?'#fff':'#475569', transition:'all .15s' }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Par fournisseur si "Tous" sinon grille directe */}
          {catFilter === 'Tous' && !catSearch ? (
            PARTNER_CATALOG.map(sup => (
              <div key={sup.sup_id} style={{ marginBottom:24 }}>
                {/* Header fournisseur */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:TYPE_BG[sup.type], display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Truck size={16} color={TYPE_COLOR[sup.type]}/>
                    </div>
                    <div>
                      <div style={{ fontWeight:800, fontSize:14, color:'#0F172A', display:'flex', alignItems:'center', gap:7 }}>
                        {sup.name}
                        <span style={{ background:sup.badgeBg, color:sup.badgeColor, fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:99 }}>{sup.badge}</span>
                      </div>
                      <div style={{ fontSize:11, color:'#64748B' }}>{sup.city} · ⭐{sup.rating} ({sup.reviews} avis)</div>
                    </div>
                  </div>
                  {sup.promo && <div style={{ background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:99, padding:'4px 12px', fontSize:11, fontWeight:700, color:'#C2410C' }}>🎁 {sup.promo}</div>}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
                  {sup.articles.map(art => <ArticleCard key={art.id} art={art} sup={sup} onAdd={addToCart}/>)}
                </div>
              </div>
            ))
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
              {filteredArts.length === 0 ? (
                <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'32px', color:'#94A3B8' }}>
                  <Package size={32} style={{ margin:'0 auto 10px', opacity:.3 }}/>
                  <p style={{ margin:0 }}>Aucun article trouvé</p>
                </div>
              ) : filteredArts.map(a => <ArticleCard key={a.id} art={a} sup={a.sup} onAdd={addToCart}/>)}
            </div>
          )}

          {/* Pub espace libre */}
          <div style={{ marginTop:24, border:'2px dashed #C7D2FE', borderRadius:18, padding:'26px', textAlign:'center', background:'#F5F3FF' }}>
            <div style={{ width:44, height:44, borderRadius:13, background:'#EDE9FE', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
              <Building2 size={20} color="#7C3AED"/>
            </div>
            <h3 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#4C1D95', margin:'0 0 6px' }}>📢 Référencez vos produits dans DPM</h3>
            <p style={{ fontSize:13, color:'#6D28D9', margin:'0 0 14px', maxWidth:400, marginLeft:'auto', marginRight:'auto', lineHeight:1.6 }}>
              Vous êtes fournisseur de matériel ou consommables dentaires ? Ajoutez votre catalogue et touchez +50 cabinets dentaires directement lors de leurs achats.
            </p>
            <a href="mailto:radisonfrancky@gmail.com?subject=Référencement catalogue DPM"
              style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'10px 22px', borderRadius:11, background:'#4F46E5', color:'#fff', textDecoration:'none', fontSize:13, fontWeight:700 }}>
              <Sparkles size={14}/>Référencer mon catalogue
            </a>
          </div>
        </>
      )}

      {/* ══ TAB FOURNISSEURS ══ */}
      {tab === 'partners' && (
        <>
          {/* Bannière */}
          <div style={{ background:'linear-gradient(135deg,#F59E0B,#D97706)', borderRadius:18, padding:'22px 26px', marginBottom:18, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)', backgroundSize:'36px 36px', pointerEvents:'none' }}/>
            <div style={{ position:'relative', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:14 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.8)', textTransform:'uppercase', letterSpacing:1.5, marginBottom:6 }}>🤝 Réseau partenaire DPM</div>
                <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:18, color:'#fff', margin:'0 0 4px' }}>Vos fournisseurs de confiance</h2>
                <p style={{ fontSize:13, color:'rgba(255,255,255,.8)', margin:0 }}>Sélectionnés et vérifiés par l'équipe DPM Madagascar</p>
              </div>
              <a href="mailto:radisonfrancky@gmail.com?subject=Partenariat fournisseur DPM"
                style={{ padding:'10px 20px', borderRadius:12, background:'#fff', color:'#D97706', fontWeight:800, fontSize:13, textDecoration:'none', display:'flex', alignItems:'center', gap:6, flexShrink:0, whiteSpace:'nowrap' }}>
                Devenir partenaire <ExternalLink size={12}/>
              </a>
            </div>
          </div>

          {/* Grille fournisseurs */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:14 }}>
            {PARTNER_CATALOG.map(sup => (
              <div key={sup.sup_id} style={{ background:'#fff', borderRadius:18, border: sup.featured?'2px solid #F59E0B':'1.5px solid #E2E8F0', padding:'20px 22px', position:'relative', boxShadow: sup.featured?'0 4px 20px rgba(245,158,11,.12)':'0 1px 4px rgba(0,0,0,.04)' }}>
                {sup.featured && <div style={{ position:'absolute', top:-10, right:14, background:'linear-gradient(135deg,#F59E0B,#D97706)', color:'#fff', fontSize:10, fontWeight:800, padding:'2px 10px', borderRadius:99, display:'flex', alignItems:'center', gap:4 }}><Zap size={9}/>RECOMMANDÉ</div>}
                {sup.featured && <div style={{ position:'absolute', top:10, left:14, fontSize:9, fontWeight:700, color:'#D97706', background:'#FEF3C7', padding:'1px 7px', borderRadius:99 }}>Annonce sponsorisée</div>}

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12, marginTop: sup.featured?14:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:40, height:40, borderRadius:12, background:TYPE_BG[sup.type], display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Truck size={18} color={TYPE_COLOR[sup.type]}/>
                    </div>
                    <div>
                      <div style={{ fontWeight:800, fontSize:14, color:'#0F172A' }}>{sup.name}</div>
                      <span style={{ background:sup.badgeBg, color:sup.badgeColor, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99 }}>{sup.badge}</span>
                    </div>
                  </div>
                  <span style={{ background:TYPE_BG[sup.type], color:TYPE_COLOR[sup.type], fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:99 }}>{TYPE_LABEL[sup.type]}</span>
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
                  <div style={{ display:'flex', gap:1 }}>{Array(5).fill(0).map((_,i)=><Star key={i} size={11} fill={i<Math.floor(sup.rating)?'#F59E0B':'none'} color="#F59E0B"/>)}</div>
                  <span style={{ fontWeight:700, fontSize:12, color:'#0F172A' }}>{sup.rating}</span>
                  <span style={{ fontSize:11, color:'#94A3B8' }}>({sup.reviews} avis)</span>
                </div>
                <p style={{ fontSize:12, color:'#475569', lineHeight:1.65, marginBottom:10 }}>{sup.desc}</p>
                {sup.promo && <div style={{ background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:8, padding:'5px 10px', fontSize:11, fontWeight:700, color:'#C2410C', marginBottom:12 }}>🎁 {sup.promo}</div>}

                <div style={{ borderTop:'1px solid #F1F5F9', paddingTop:12, display:'flex', gap:7, flexWrap:'wrap' }}>
                  <a href={`tel:${sup.phone}`} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'8px', borderRadius:10, background:'#FFFBEB', color:'#D97706', textDecoration:'none', fontSize:12, fontWeight:700 }}>
                    <Phone size={12}/>{sup.phone}
                  </a>
                  <a href={`mailto:${sup.email}`} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'8px', borderRadius:10, background:'#F8FAFC', color:'#475569', textDecoration:'none', fontSize:12, fontWeight:600 }}>
                    <Mail size={12}/>Email
                  </a>
                  <button onClick={() => { setCatFilter('Tous'); setTab('catalog'); }}
                    style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'8px', borderRadius:10, background:'#4F46E5', color:'#fff', border:'none', cursor:'pointer', fontSize:12, fontWeight:700 }}>
                    <ShoppingCart size={12}/>Catalogue
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pub zone libre */}
          <div style={{ marginTop:18, border:'2px dashed #E2E8F0', borderRadius:18, padding:'26px', textAlign:'center', background:'#FAFBFC' }}>
            <div style={{ width:44, height:44, borderRadius:13, background:'#FEF3C7', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
              <Tag size={20} color="#D97706"/>
            </div>
            <h3 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#475569', margin:'0 0 6px' }}>📢 Espace publicitaire disponible</h3>
            <p style={{ fontSize:13, color:'#94A3B8', margin:'0 0 14px', maxWidth:400, marginLeft:'auto', marginRight:'auto', lineHeight:1.6 }}>
              Rejoignez le réseau DPM et exposez vos produits directement aux cabinets dentaires lors de leurs commandes.
            </p>
            <a href="mailto:radisonfrancky@gmail.com?subject=Inscription fournisseur DPM Achats"
              style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'10px 22px', borderRadius:11, background:'#F59E0B', color:'#fff', textDecoration:'none', fontSize:13, fontWeight:700 }}>
              <Award size={13}/>Rejoindre le réseau
            </a>
          </div>
        </>
      )}

      {/* ══ MODAL NOUVEAU BON ══ */}
      <Modal open={isOpen} onClose={() => { setIsOpen(false); resetForm(); }} title="Nouveau bon de commande" maxW={660}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ fontSize:13, fontWeight:600, color:'#475569', display:'block', marginBottom:5 }}>Fournisseur *</label>
            <select value={selSup} onChange={e => setSelSup(e.target.value)} style={inp} onFocus={fi} onBlur={bi}>
              <option value="">Sélectionner un fournisseur...</option>
              <optgroup label="── Mes fournisseurs ──">
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({TYPE_LABEL[s.type]||s.type})</option>)}
              </optgroup>
            </select>
          </div>

          {/* Articles */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <label style={{ fontSize:13, fontWeight:600, color:'#475569' }}>Articles</label>
              <button onClick={addItem} style={{ padding:'5px 12px', borderRadius:8, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', fontSize:12, fontWeight:600, color:'#475569', display:'flex', alignItems:'center', gap:5 }}>
                <Plus size={12}/>Ajouter
              </button>
            </div>
            {items.length === 0 ? (
              <div style={{ border:'2px dashed #E2E8F0', borderRadius:12, padding:'20px', textAlign:'center', color:'#94A3B8', fontSize:13 }}>
                Ajoutez des articles ou utilisez le <button onClick={() => { setIsOpen(false); setTab('catalog'); }} style={{ color:'#4F46E5', fontWeight:700, background:'none', border:'none', cursor:'pointer', fontSize:13 }}>catalogue partenaires</button>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {items.map((item, idx) => (
                  <div key={idx} style={{ display:'flex', gap:8, alignItems:'center', background:'#F8FAFC', borderRadius:11, padding:'10px 12px' }}>
                    <select value={item.product_id} onChange={e => updateItem(idx, 'product_id', e.target.value)}
                      style={{ ...inp, flex:1 }} onFocus={fi} onBlur={bi}>
                      <option value="">Produit...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                    </select>
                    <input type="number" min="1" value={item.qty} onChange={e => updateItem(idx,'qty',parseInt(e.target.value)||1)}
                      style={{ ...inp, width:60 }} placeholder="Qté" onFocus={fi} onBlur={bi}/>
                    <input type="number" min="0" value={item.unit_price_mga} onChange={e => updateItem(idx,'unit_price_mga',parseFloat(e.target.value)||0)}
                      style={{ ...inp, width:110 }} placeholder="Prix Ar" onFocus={fi} onBlur={bi}/>
                    <span style={{ fontSize:12, color:'#0D7A87', fontWeight:700, whiteSpace:'nowrap', minWidth:90 }}>{fmt(item.qty*item.unit_price_mga)}</span>
                    <button onClick={() => removeItem(idx)} style={{ background:'none', border:'none', cursor:'pointer', color:'#EF4444', padding:4 }}><Trash2 size={14}/></button>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'flex-end', padding:'10px 12px', background:'#F0FDFE', borderRadius:11, border:'1px solid #7DD3DA' }}>
                  <span style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:16, color:'#0D7A87' }}>Total : {fmt(total())}</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize:13, fontWeight:600, color:'#475569', display:'block', marginBottom:5 }}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Instructions de livraison, notes..."
              style={{ ...inp, resize:'vertical' }} onFocus={fi} onBlur={bi}/>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:8, borderTop:'1px solid #F1F5F9' }}>
            <button onClick={() => { setIsOpen(false); resetForm(); }} style={{ padding:'9px 18px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, color:'#475569' }}>Annuler</button>
            <button onClick={handleCreate} disabled={!selSup || items.length === 0}
              style={{ padding:'9px 22px', borderRadius:10, background:'linear-gradient(135deg,#4F46E5,#6366F1)', color:'#fff', border:'none', cursor:'pointer', fontSize:14, fontWeight:700, display:'flex', alignItems:'center', gap:7, opacity:(!selSup||!items.length)?.5:1 }}>
              <Check size={14}/>Créer le bon
            </button>
          </div>
        </div>
      </Modal>

      {/* ══ MODAL PANIER ══ */}
      <Modal open={showCart} onClose={() => setShowCart(false)} title={`🛒 Panier — ${cart.reduce((s,c)=>s+c.qty,0)} article(s)`} maxW={520}>
        {cart.length === 0 ? (
          <div style={{ textAlign:'center', padding:'24px', color:'#94A3B8' }}>Panier vide</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {cart.map(item => (
              <div key={item.id} style={{ display:'flex', alignItems:'center', gap:12, background:'#F8FAFC', borderRadius:12, padding:'12px 14px' }}>
                <div style={{ fontSize:22, flexShrink:0 }}>{item.img}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'#0F172A' }}>{item.name}</div>
                  <div style={{ fontSize:11, color:'#64748B' }}>{item.sup_name} · {fmt(item.price)}/{item.unit}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <button onClick={() => updateCartQty(item.id, item.qty-1)} style={{ width:26, height:26, borderRadius:8, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', fontWeight:700, fontSize:14 }}>−</button>
                  <span style={{ fontWeight:700, fontSize:14, minWidth:20, textAlign:'center' }}>{item.qty}</span>
                  <button onClick={() => updateCartQty(item.id, item.qty+1)} style={{ width:26, height:26, borderRadius:8, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', fontWeight:700, fontSize:14 }}>+</button>
                </div>
                <div style={{ fontWeight:800, fontSize:13, color:'#0D7A87', whiteSpace:'nowrap' }}>{fmt(item.price*item.qty)}</div>
                <button onClick={() => removeFromCart(item.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#EF4444', padding:4 }}><X size={14}/></button>
              </div>
            ))}
            <div style={{ background:'#F0FDFE', border:'1px solid #7DD3DA', borderRadius:12, padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontWeight:600, color:'#0D7A87', fontSize:14 }}>Total estimé</span>
              <span style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:18, color:'#0D7A87' }}>{fmt(cartTotal())}</span>
            </div>
            <p style={{ fontSize:11, color:'#94A3B8', textAlign:'center', margin:0 }}>En cliquant sur "Commander", un email sera ouvert avec votre commande.</p>
            <button onClick={sendCartOrder} style={{ padding:'13px', borderRadius:12, background:'linear-gradient(135deg,#4F46E5,#6366F1)', color:'#fff', border:'none', cursor:'pointer', fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:15, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <Mail size={16}/>Commander par email
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PurchaseManagement;
