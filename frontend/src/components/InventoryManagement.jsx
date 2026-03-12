import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { Package, Plus, AlertTriangle, ArrowUp, ArrowDown, RefreshCw, Loader2, Search, Boxes } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CATEGORIES = {
  INSTRUMENTS: 'Instruments', CONSUMABLES: 'Consommables', MATERIALS: 'Matériaux',
  EQUIPMENT: 'Équipements', PROSTHETICS: 'Prothèses', ORTHODONTICS: 'Orthodontie',
  HYGIENE: 'Hygiène', ANESTHESIA: 'Anesthésie', RADIOLOGY: 'Radiologie', OTHER: 'Autre'
};

const InventoryManagement = () => {
  const [products, setProducts]             = useState([]);
  const [alerts, setAlerts]                 = useState([]);
  const [loading, setLoading]               = useState(true);
  const [isAddOpen, setIsAddOpen]           = useState(false);
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [saving, setSaving]                 = useState(false);
  const [searchTerm, setSearchTerm]         = useState('');

  const [productForm, setProductForm] = useState({
    name: '', sku: '', category: 'CONSUMABLES', unit: 'PIECE',
    unit_cost_mga: '', sale_price_mga: '', min_qty: '10', current_qty: '0'
  });

  const [movementForm, setMovementForm] = useState({ type: 'IN', quantity: '', reason: '' });

  useEffect(() => { fetchProducts(); fetchAlerts(); }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API}/inventory/products`);
      setProducts(Array.isArray(res.data?.products) ? res.data.products : []);
    } catch (err) {
      console.error('fetchProducts:', err);
      toast.error('Erreur chargement produits');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await axios.get(`${API}/inventory/alerts`);
      setAlerts(Array.isArray(res.data?.alerts) ? res.data.alerts : []);
    } catch (err) {
      console.error('fetchAlerts:', err);
      setAlerts([]);
    }
  };

  const handleAddProduct = async () => {
    if (!productForm.name || !productForm.sku) { toast.error('Nom et SKU requis'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/inventory/products`, {
        ...productForm,
        unit_cost_mga:  parseFloat(productForm.unit_cost_mga)  || 0,
        sale_price_mga: parseFloat(productForm.sale_price_mga) || 0,
        min_qty:        parseInt(productForm.min_qty)          || 10,
        current_qty:    parseInt(productForm.current_qty)      || 0
      });
      toast.success('Produit créé');
      setProductForm({ name: '', sku: '', category: 'CONSUMABLES', unit: 'PIECE', unit_cost_mga: '', sale_price_mga: '', min_qty: '10', current_qty: '0' });
      setIsAddOpen(false);
      fetchProducts(); fetchAlerts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur création');
    } finally { setSaving(false); }
  };

  const openMovement = (product) => {
    setSelectedProduct(product);
    setMovementForm({ type: 'IN', quantity: '', reason: '' });
    setIsMovementOpen(true);
  };

  const closeMovement = () => {
    setIsMovementOpen(false);
    // Delay clearing selectedProduct to avoid render crash during dialog close animation
    setTimeout(() => setSelectedProduct(null), 300);
  };

  const handleMovement = async () => {
    if (!movementForm.quantity || !movementForm.reason) { toast.error('Quantité et motif requis'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/inventory/products/${selectedProduct.id}/movements`, {
        type: movementForm.type,
        quantity: parseInt(movementForm.quantity),
        reason: movementForm.reason
      });
      toast.success('Mouvement enregistré');
      closeMovement();
      fetchProducts(); fetchAlerts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur mouvement');
    } finally { setSaving(false); }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('fr-MG', { style: 'decimal' }).format(amount || 0) + ' MGA';

  const filteredProducts = products.filter(p =>
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku  || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="inventory-management">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-600" />Inventaire
          </h1>
          <p className="text-gray-500">{products.length} produit{products.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { fetchProducts(); fetchAlerts(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />Actualiser
          </Button>

          {/* Add product dialog */}
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-product-btn"><Plus className="h-4 w-4 mr-2" />Ajouter produit</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau produit</DialogTitle>
                <DialogDescription>Remplissez les informations du produit</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Nom *</Label>
                    <Input value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>SKU *</Label>
                    <Input value={productForm.sku} onChange={e => setProductForm({...productForm, sku: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <select
                      value={productForm.category}
                      onChange={e => setProductForm({...productForm, category: e.target.value})}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {Object.entries(CATEGORIES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Unité</Label>
                    <Input value={productForm.unit} onChange={e => setProductForm({...productForm, unit: e.target.value})} placeholder="PIECE, BOX, ML..." />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Coût unitaire (MGA)</Label>
                    <Input type="number" value={productForm.unit_cost_mga} onChange={e => setProductForm({...productForm, unit_cost_mga: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Prix vente (MGA)</Label>
                    <Input type="number" value={productForm.sale_price_mga} onChange={e => setProductForm({...productForm, sale_price_mga: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Stock initial</Label>
                    <Input type="number" value={productForm.current_qty} onChange={e => setProductForm({...productForm, current_qty: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Seuil alerte</Label>
                    <Input type="number" value={productForm.min_qty} onChange={e => setProductForm({...productForm, min_qty: e.target.value})} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>Annuler</Button>
                  <Button onClick={handleAddProduct} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}Créer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Boxes className="h-4 w-4" />Produits
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />Alertes ({alerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Search className="h-5 w-5 text-gray-400" />
                <Input placeholder="Rechercher..." value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)} className="max-w-sm" />
              </div>
            </CardHeader>
            <CardContent>
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Aucun produit</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map(product => (
                    <div key={product.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      data-testid={`product-${product.sku}`}>
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded ${product.is_low_stock ? 'bg-red-100' : 'bg-green-100'}`}>
                          <Package className={`h-5 w-5 ${product.is_low_stock ? 'text-red-600' : 'text-green-600'}`} />
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-500">
                            {product.sku} • {CATEGORIES[product.category] || product.category} • {formatCurrency(product.sale_price_mga)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`font-bold ${product.is_low_stock ? 'text-red-600' : ''}`}>
                            {product.current_qty} {product.unit}
                          </p>
                          <p className="text-xs text-gray-500">Min: {product.min_qty}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => openMovement(product)}
                          data-testid={`move-${product.sku}`}>
                          Mouvement
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />Alertes stock bas ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-12 text-green-600">
                  <Package className="h-12 w-12 mx-auto mb-4" />
                  <p>Aucune alerte — Tous les stocks sont OK</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map(alert => (
                    <div key={alert.id} className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50">
                      <div>
                        <p className="font-medium">{alert.name}</p>
                        <p className="text-sm text-gray-600">{alert.sku}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className={alert.urgency_level === 'CRITICAL' ? 'bg-red-600' : 'bg-orange-500'}>
                          {alert.urgency_level}
                        </Badge>
                        <div className="text-right">
                          <p className="text-red-600 font-bold">{alert.current_qty} / {alert.min_qty}</p>
                          <p className="text-xs">Manque: {alert.shortage}</p>
                        </div>
                        <Button size="sm" onClick={() => openMovement(alert)}>
                          <ArrowUp className="h-4 w-4 mr-1" />Réappro
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Movement Dialog — only render content when selectedProduct exists */}
      <Dialog open={isMovementOpen} onOpenChange={(open) => { if (!open) closeMovement(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Mouvement stock{selectedProduct ? ` — ${selectedProduct.name}` : ''}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct ? `Stock actuel: ${selectedProduct.current_qty} ${selectedProduct.unit}` : ''}
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-100 rounded">
                <p className="text-sm">Stock actuel: <strong>{selectedProduct.current_qty} {selectedProduct.unit}</strong></p>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <select
                value={movementForm.type}
                onChange={e => setMovementForm({...movementForm, type: e.target.value})}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="IN">Entrée (+)</option>
                <option value="OUT">Sortie (-)</option>
                <option value="ADJUST">Ajustement (=)</option>
              </select>
              </div>
              <div className="space-y-2">
                <Label>Quantité *</Label>
                <Input type="number" value={movementForm.quantity}
                  onChange={e => setMovementForm({...movementForm, quantity: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Motif *</Label>
                <Input value={movementForm.reason}
                  onChange={e => setMovementForm({...movementForm, reason: e.target.value})}
                  placeholder="Ex: Utilisation cabinet, Réception commande..." />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={closeMovement}>Annuler</Button>
                <Button onClick={handleMovement} disabled={saving}>
                  {saving
                    ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    : movementForm.type === 'IN'
                      ? <ArrowUp className="h-4 w-4 mr-2" />
                      : <ArrowDown className="h-4 w-4 mr-2" />
                  }
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryManagement;
