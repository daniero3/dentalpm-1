import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import {
  Package,
  Plus,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Loader2,
  Search,
  Boxes
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

const CATEGORIES = {
  INSTRUMENTS: 'Instruments',
  CONSUMABLES: 'Consommables',
  MATERIALS: 'Matériaux',
  EQUIPMENT: 'Équipements',
  PROSTHETICS: 'Prothèses',
  ORTHODONTICS: 'Orthodontie',
  HYGIENE: 'Hygiène',
  ANESTHESIA: 'Anesthésie',
  RADIOLOGY: 'Radiologie',
  OTHER: 'Autre'
};

const createEmptyProductForm = () => ({
  name: '',
  sku: '',
  category: 'CONSUMABLES',
  unit: 'PIECE',
  unit_cost_mga: '',
  sale_price_mga: '',
  min_qty: '10',
  current_qty: '0'
});

const createEmptyMovementForm = () => ({
  type: 'IN',
  quantity: '',
  reason: ''
});

const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return token
    ? {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    : {};
};

const InventoryManagement = () => {
  const [products, setProducts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [productForm, setProductForm] = useState(createEmptyProductForm());
  const [movementForm, setMovementForm] = useState(createEmptyMovementForm());

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchProducts(), fetchAlerts()]);
    };
    init();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API}/inventory/products`, getAuthConfig());
      setProducts(Array.isArray(res.data?.products) ? res.data.products : []);
    } catch (err) {
      console.error('Products error:', err);
      setProducts([]);
      toast.error('Erreur chargement produits');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await axios.get(`${API}/inventory/alerts`, getAuthConfig());
      setAlerts(Array.isArray(res.data?.alerts) ? res.data.alerts : []);
    } catch (err) {
      console.error('Alerts error:', err);
      setAlerts([]);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([fetchProducts(), fetchAlerts()]);
  };

  const closeAddDialog = () => {
    setIsAddOpen(false);
    setProductForm(createEmptyProductForm());
  };

  const closeMovementDialog = () => {
    setIsMovementOpen(false);
    setSelectedProduct(null);
    setMovementForm(createEmptyMovementForm());
  };

  const handleAddProduct = async () => {
    if (!productForm.name?.trim() || !productForm.sku?.trim()) {
      toast.error('Nom et SKU requis');
      return;
    }

    setSaving(true);
    try {
      await axios.post(
        `${API}/inventory/products`,
        {
          ...productForm,
          name: productForm.name.trim(),
          sku: productForm.sku.trim(),
          unit: productForm.unit?.trim() || 'PIECE',
          unit_cost_mga: parseFloat(productForm.unit_cost_mga) || 0,
          sale_price_mga: parseFloat(productForm.sale_price_mga) || 0,
          min_qty: parseInt(productForm.min_qty, 10) || 10,
          current_qty: parseInt(productForm.current_qty, 10) || 0
        },
        getAuthConfig()
      );

      toast.success('Produit créé');
      closeAddDialog();
      await refreshAll();
    } catch (err) {
      console.error('Create product error:', err);
      toast.error(err.response?.data?.error || 'Erreur création');
    } finally {
      setSaving(false);
    }
  };

  const openMovement = (product) => {
    if (!product?.id) return;
    setSelectedProduct(product);
    setMovementForm(createEmptyMovementForm());
    setIsMovementOpen(true);
  };

  const handleMovement = async () => {
    if (!selectedProduct?.id) {
      toast.error('Produit introuvable');
      return;
    }

    if (!movementForm.quantity || !movementForm.reason?.trim()) {
      toast.error('Quantité et motif requis');
      return;
    }

    setSaving(true);
    try {
      await axios.post(
        `${API}/inventory/products/${selectedProduct.id}/movements`,
        {
          type: movementForm.type,
          quantity: parseInt(movementForm.quantity, 10),
          reason: movementForm.reason.trim()
        },
        getAuthConfig()
      );

      toast.success('Mouvement enregistré');
      closeMovementDialog();
      await refreshAll();
    } catch (err) {
      console.error('Movement error:', err);
      toast.error(err.response?.data?.error || 'Erreur mouvement');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-MG', { style: 'decimal' }).format(Number(amount) || 0) + ' MGA';
  };

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return (Array.isArray(products) ? products : []).filter((p) => {
      const name = String(p?.name || '').toLowerCase();
      const sku = String(p?.sku || '').toLowerCase();
      return name.includes(term) || sku.includes(term);
    });
  }, [products, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="inventory-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-600" />
            Inventaire
          </h1>
          <p className="text-gray-500">{products.length} produits</p>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={refreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>

          <Button
            type="button"
            data-testid="add-product-btn"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter produit
          </Button>
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={(open) => !saving && (open ? setIsAddOpen(true) : closeAddDialog())}>
        <DialogContent aria-describedby="add-product-description">
          <DialogHeader>
            <DialogTitle>Nouveau produit</DialogTitle>
            <DialogDescription id="add-product-description">
              Ajoutez un nouvel article à l’inventaire du cabinet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>SKU *</Label>
                <Input
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select
                  value={productForm.category}
                  onValueChange={(v) => setProductForm({ ...productForm, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Unité</Label>
                <Input
                  value={productForm.unit}
                  onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                  placeholder="PIECE, BOX, ML..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Coût unitaire (MGA)</Label>
                <Input
                  type="number"
                  value={productForm.unit_cost_mga}
                  onChange={(e) => setProductForm({ ...productForm, unit_cost_mga: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Prix vente (MGA)</Label>
                <Input
                  type="number"
                  value={productForm.sale_price_mga}
                  onChange={(e) => setProductForm({ ...productForm, sale_price_mga: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Stock initial</Label>
                <Input
                  type="number"
                  value={productForm.current_qty}
                  onChange={(e) => setProductForm({ ...productForm, current_qty: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Seuil alerte</Label>
                <Input
                  type="number"
                  value={productForm.min_qty}
                  onChange={(e) => setProductForm({ ...productForm, min_qty: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={closeAddDialog} disabled={saving}>
                Annuler
              </Button>

              <Button type="button" onClick={handleAddProduct} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Boxes className="h-4 w-4" />
            Produits
          </TabsTrigger>

          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alertes ({alerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Search className="h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
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
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      data-testid={`product-${product.sku || product.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded ${product.is_low_stock ? 'bg-red-100' : 'bg-green-100'}`}>
                          <Package
                            className={`h-5 w-5 ${product.is_low_stock ? 'text-red-600' : 'text-green-600'}`}
                          />
                        </div>

                        <div>
                          <p className="font-medium">{product.name || '-'}</p>
                          <p className="text-sm text-gray-500">
                            {product.sku || '-'} • {CATEGORIES[product.category] || product.category || 'Autre'} •{' '}
                            {formatCurrency(product.sale_price_mga)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`font-bold ${product.is_low_stock ? 'text-red-600' : ''}`}>
                            {Number(product.current_qty) || 0} {product.unit || ''}
                          </p>
                          <p className="text-xs text-gray-500">Min: {Number(product.min_qty) || 0}</p>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openMovement(product)}
                          data-testid={`move-${product.sku || product.id}`}
                        >
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
                <AlertTriangle className="h-5 w-5" />
                Alertes stock bas ({alerts.length})
              </CardTitle>
            </CardHeader>

            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-12 text-green-600">
                  <Package className="h-12 w-12 mx-auto mb-4" />
                  <p>Aucune alerte - Tous les stocks sont OK</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50"
                    >
                      <div>
                        <p className="font-medium">{alert.name || '-'}</p>
                        <p className="text-sm text-gray-600">{alert.sku || '-'}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <Badge className={alert.urgency_level === 'CRITICAL' ? 'bg-red-600' : 'bg-orange-500'}>
                          {alert.urgency_level || 'ALERTE'}
                        </Badge>

                        <div className="text-right">
                          <p className="text-red-600 font-bold">
                            {Number(alert.current_qty) || 0} / {Number(alert.min_qty) || 0}
                          </p>
                          <p className="text-xs">Manque: {Number(alert.shortage) || 0}</p>
                        </div>

                        <Button type="button" size="sm" onClick={() => openMovement(alert)}>
                          <ArrowUp className="h-4 w-4 mr-1" />
                          Réappro
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

      <Dialog
        open={isMovementOpen}
        onOpenChange={(open) => !saving && (open ? setIsMovementOpen(true) : closeMovementDialog())}
      >
        <DialogContent
          key={selectedProduct?.id || 'movement-empty'}
          aria-describedby="movement-description"
        >
          <DialogHeader>
            <DialogTitle>Mouvement stock - {selectedProduct?.name || 'Produit'}</DialogTitle>
            <DialogDescription id="movement-description">
              Enregistrez une entrée, une sortie ou un ajustement de stock.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-gray-100 rounded">
              <p className="text-sm">
                Stock actuel : <strong>{Number(selectedProduct?.current_qty) || 0} {selectedProduct?.unit || ''}</strong>
              </p>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={movementForm.type}
                onValueChange={(v) => setMovementForm({ ...movementForm, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Entrée (+)</SelectItem>
                  <SelectItem value="OUT">Sortie (-)</SelectItem>
                  <SelectItem value="ADJUST">Ajustement (=)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantité *</Label>
              <Input
                type="number"
                value={movementForm.quantity}
                onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Motif *</Label>
              <Input
                value={movementForm.reason}
                onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
                placeholder="Ex: Utilisation cabinet, Réception commande..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={closeMovementDialog} disabled={saving}>
                Annuler
              </Button>

              <Button type="button" onClick={handleMovement} disabled={saving || !selectedProduct?.id}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : movementForm.type === 'IN' ? (
                  <ArrowUp className="h-4 w-4 mr-2" />
                ) : (
                  <ArrowDown className="h-4 w-4 mr-2" />
                )}
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryManagement;
