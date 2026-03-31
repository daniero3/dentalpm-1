import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Loader2, Plus, Package, AlertTriangle, ArrowUp, ArrowDown, X, RefreshCw } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'https://dentalpm-1-production.up.railway.app/api';

const inputCls = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

// Modal défini HORS du composant principal pour éviter re-renders
const Modal = ({ open, onClose, title, description, children }) => {
  if (!open) return null;
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(15,23,42,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:'#fff', borderRadius:16, padding:28, width:'100%', maxWidth:520, boxShadow:'0 16px 48px rgba(15,23,42,0.18)', border:'1px solid #E2E8F0', maxHeight:'90vh', overflowY:'auto', position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'none', border:'none', cursor:'pointer', color:'#94A3B8', padding:4 }}><X size={18} /></button>
        <div style={{ marginBottom:20, paddingRight:24 }}>
          {title && <h2 style={{ fontFamily:'Plus Jakarta Sans', fontSize:17, fontWeight:700, color:'#0F172A', margin:0 }}>{title}</h2>}
          {description && <p style={{ fontSize:13, color:'#64748B', marginTop:4 }}>{description}</p>}
        </div>
        {children}
      </div>
    </div>
  );
};

const InventoryManagement = () => {
  const [products, setProducts]     = useState([]);
  const [alerts, setAlerts]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [isAddOpen, setIsAddOpen]   = useState(false);
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [saving, setSaving]         = useState(false);
  const [activeTab, setActiveTab]   = useState('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [movType, setMovType]       = useState('IN');

  // ✅ REFS — lecture directe au submit, aucun problème de focus
  const qtyRef    = useRef(null);
  const reasonRef = useRef(null);

  const [productForm, setProductForm] = useState({
    name:'', sku:'', category:'CONSUMABLE', unit:'PIECE',
    unit_cost_mga:0, sale_price_mga:0, current_qty:0, min_qty:5
  });

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/inventory/products`);
      setProducts(data.products || []);
    } catch(e) { console.error('fetchProducts:', e); }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/inventory/alerts`);
      setAlerts(data.alerts || []);
    } catch(e) { console.error('fetchAlerts:', e); }
  }, []);

  useEffect(() => {
    Promise.all([fetchProducts(), fetchAlerts()]).finally(() => setLoading(false));
  }, [fetchProducts, fetchAlerts]);

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.sku) { toast.error('Nom et SKU requis'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/inventory/products`, productForm);
      toast.success('Produit ajouté');
      setIsAddOpen(false);
      setProductForm({ name:'', sku:'', category:'CONSUMABLE', unit:'PIECE', unit_cost_mga:0, sale_price_mga:0, current_qty:0, min_qty:5 });
      fetchProducts();
    } catch(err) { toast.error(err.response?.data?.error || 'Erreur ajout'); }
    finally { setSaving(false); }
  };

  const openMovement = (product) => {
    setSelectedProduct(product);
    setMovType('IN');
    setIsMovementOpen(true);
    // Reset les refs après ouverture
    setTimeout(() => {
      if (qtyRef.current)    qtyRef.current.value    = '';
      if (reasonRef.current) reasonRef.current.value = '';
    }, 50);
  };

  const closeMovement = () => {
    setIsMovementOpen(false);
    setTimeout(() => setSelectedProduct(null), 300);
  };

  // ✅ Lit depuis les REFS — jamais de problème de state
  const handleMovement = async () => {
    const qty    = qtyRef.current?.value    || '';
    const reason = reasonRef.current?.value || '';
    const type   = movType;

    if (!qty || qty === '0' || !reason.trim()) {
      toast.error('Quantité et motif sont obligatoires');
      return;
    }

    const qtyInt = parseInt(qty);
    if (isNaN(qtyInt) || qtyInt < 1) { toast.error('Quantité invalide'); return; }

    setSaving(true);
    try {
      const { data } = await axios.post(
        `${API}/inventory/products/${selectedProduct.id}/movements`,
        { type, quantity: qtyInt, reason: reason.trim() }
      );
      toast.success(`Mouvement enregistré — Nouveau stock: ${data.product?.current_qty ?? '?'} ${selectedProduct.unit}`);
      closeMovement();
      fetchProducts();
      fetchAlerts();
    } catch(err) {
      toast.error(err.response?.data?.error || 'Erreur mouvement');
    } finally { setSaving(false); }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('fr-MG').format(v || 0) + ' MGA';
  const filteredProducts = products.filter(p =>
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku  || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin" style={{ color:'#0D7A87' }} />
    </div>
  );

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:24, color:'#0F172A', margin:0 }}>Inventaire</h1>
          <p style={{ color:'#64748B', fontSize:14, marginTop:4 }}>{products.length} produits · {alerts.length} alertes stock</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchProducts(); fetchAlerts(); }}>
            <RefreshCw className="h-4 w-4 mr-2" /> Actualiser
          </Button>
          <Button onClick={() => setIsAddOpen(true)} style={{ background:'linear-gradient(135deg,#0D7A87,#13A3B4)', color:'#fff', border:'none' }}>
            <Plus className="h-4 w-4 mr-2" /> Nouveau produit
          </Button>
        </div>
      </div>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div style={{ background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:12, padding:16 }}>
          <p style={{ fontWeight:700, color:'#C2410C', fontSize:14, margin:'0 0 8px', display:'flex', alignItems:'center', gap:6 }}>
            <AlertTriangle size={16} /> {alerts.length} produit(s) en rupture / stock bas
          </p>
          <div className="flex flex-wrap gap-2">
            {alerts.slice(0,5).map(a => (
              <Badge key={a.id} variant="outline" style={{ borderColor:'#FED7AA', color:'#C2410C', cursor:'pointer' }}
                onClick={() => openMovement(a)}>
                {a.name} ({a.current_qty} {a.unit})
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Recherche */}
      <Input placeholder="Rechercher produit ou SKU..." value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)} className="max-w-sm" />

      {/* Liste produits */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead style={{ background:'#F8FAFC' }}>
            <tr>
              {['Produit','SKU','Catégorie','Stock','Min','Valeur','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p, i) => (
              <tr key={p.id} style={{ background: i%2===0?'#fff':'#FAFAFA', borderTop:'1px solid #F1F5F9' }}>
                <td className="px-4 py-3 font-medium" style={{ color:'#0F172A' }}>{p.name}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.sku}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" style={{ fontSize:11 }}>{p.category}</Badge>
                </td>
                <td className="px-4 py-3">
                  <span style={{ fontWeight:700, color: p.current_qty <= p.min_qty ? '#EF4444' : '#16A34A', fontSize:15 }}>
                    {p.current_qty}
                  </span>
                  <span style={{ color:'#94A3B8', fontSize:12 }}> {p.unit}</span>
                  {p.current_qty <= p.min_qty && <AlertTriangle size={14} style={{ color:'#EF4444', marginLeft:4, display:'inline' }} />}
                </td>
                <td className="px-4 py-3 text-gray-500">{p.min_qty} {p.unit}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{formatCurrency(p.current_qty * p.unit_cost_mga)}</td>
                <td className="px-4 py-3">
                  <Button variant="outline" size="sm" onClick={() => openMovement(p)}>
                    <ArrowUp className="h-3 w-3 mr-1" /><ArrowDown className="h-3 w-3 mr-1" /> Mouvement
                  </Button>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                {searchTerm ? 'Aucun résultat' : 'Aucun produit — cliquez sur "Nouveau produit"'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Modal Ajouter produit ── */}
      <Modal open={isAddOpen} onClose={() => setIsAddOpen(false)} title="Nouveau produit" description="Remplissez les informations du produit">
        <form onSubmit={handleAddProduct} className="space-y-3">
          <div><Label>Nom *</Label><Input value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} /></div>
          <div><Label>SKU *</Label><Input value={productForm.sku} onChange={e => setProductForm({...productForm, sku: e.target.value})} /></div>
          <div><Label>Catégorie</Label>
            <select value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} className={inputCls}>
              <option value="CONSUMABLE">Consommable</option>
              <option value="EQUIPMENT">Équipement</option>
              <option value="MEDICATION">Médicament</option>
            </select>
          </div>
          <div><Label>Unité</Label><Input value={productForm.unit} onChange={e => setProductForm({...productForm, unit: e.target.value})} placeholder="PIECE, BOX, ML..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Prix achat (MGA)</Label><Input type="number" value={productForm.unit_cost_mga} onChange={e => setProductForm({...productForm, unit_cost_mga: e.target.value})} /></div>
            <div><Label>Prix vente (MGA)</Label><Input type="number" value={productForm.sale_price_mga} onChange={e => setProductForm({...productForm, sale_price_mga: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Stock initial</Label><Input type="number" value={productForm.current_qty} onChange={e => setProductForm({...productForm, current_qty: e.target.value})} /></div>
            <div><Label>Stock minimum</Label><Input type="number" value={productForm.min_qty} onChange={e => setProductForm({...productForm, min_qty: e.target.value})} /></div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={saving} style={{ background:'linear-gradient(135deg,#0D7A87,#13A3B4)', color:'#fff', border:'none' }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Ajouter
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Mouvement stock ── */}
      <Modal
        open={isMovementOpen}
        onClose={closeMovement}
        title={selectedProduct ? `Mouvement — ${selectedProduct.name}` : 'Mouvement stock'}
        description={selectedProduct ? `Stock actuel : ${selectedProduct.current_qty} ${selectedProduct.unit}` : ''}
      >
        {selectedProduct && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            <div style={{ background:'#F0FDFE', border:'1px solid #0D7A87', borderRadius:10, padding:'12px 16px' }}>
              <p style={{ margin:0, fontSize:15, color:'#0D7A87', fontWeight:700 }}>
                Stock actuel : {selectedProduct.current_qty} {selectedProduct.unit}
              </p>
            </div>

            {/* TYPE */}
            <div>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 }}>Type de mouvement *</label>
              <select
                value={movType}
                onChange={e => setMovType(e.target.value)}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:14, background:'#fff', cursor:'pointer' }}
              >
                <option value="IN">📥 Entrée — Ajout de stock (+)</option>
                <option value="OUT">📤 Sortie — Utilisation stock (-)</option>
                <option value="ADJUST">🔧 Ajustement — Inventaire physique (=)</option>
              </select>
            </div>

            {/* QUANTITÉ — input natif avec ref */}
            <div>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 }}>
                Quantité * {movType === 'ADJUST' ? '(nouveau total)' : ''}
              </label>
              <input
                ref={qtyRef}
                type="number"
                min="1"
                defaultValue=""
                placeholder="Ex: 10"
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:16, fontWeight:600, outline:'none', boxSizing:'border-box', color:'#0F172A' }}
                onFocus={e => e.target.style.borderColor = '#0D7A87'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'}
              />
            </div>

            {/* MOTIF — input natif avec ref */}
            <div>
              <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:6 }}>Motif *</label>
              <input
                ref={reasonRef}
                type="text"
                defaultValue=""
                placeholder="Ex: Réception commande, Utilisation cabinet..."
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:14, outline:'none', boxSizing:'border-box', color:'#0F172A' }}
                onFocus={e => e.target.style.borderColor = '#0D7A87'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'}
              />
            </div>

            {/* Boutons */}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, paddingTop:8, borderTop:'1px solid #F1F5F9' }}>
              <Button variant="outline" onClick={closeMovement}>Annuler</Button>
              <Button
                onClick={handleMovement}
                disabled={saving}
                style={{ background:'linear-gradient(135deg,#0D7A87,#13A3B4)', color:'#fff', border:'none', minWidth:130 }}
              >
                {saving
                  ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  : movType === 'IN'
                    ? <ArrowUp className="h-4 w-4 mr-2" />
                    : <ArrowDown className="h-4 w-4 mr-2" />
                }
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>

          </div>
        )}
      </Modal>

    </div>
  );
};

export default InventoryManagement;
