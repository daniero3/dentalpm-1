import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { ShoppingCart, Plus, Truck, Package, Check, FileText, RefreshCw, Trash2, Printer } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

const PurchaseManagement = () => {
  const [purchases, setPurchases]               = useState([]);
  const [suppliers, setSuppliers]               = useState([]);
  const [products, setProducts]                 = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [isDialogOpen, setIsDialogOpen]         = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [items, setItems]                       = useState([]);
  const [notes, setNotes]                       = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchPurchases(), fetchSuppliers(), fetchProducts()]);
    setLoading(false);
  };

  const fetchPurchases = async () => {
    try {
      const r = await axios.get(`${API}/purchases`);
      setPurchases(r.data.purchases || []);
    } catch (e) { console.error('purchases:', e); }
  };

  const fetchSuppliers = async () => {
    try {
      const r = await axios.get(`${API}/suppliers`);
      setSuppliers(r.data.suppliers || []);
    } catch (e) { console.error('suppliers:', e); }
  };

  const fetchProducts = async () => {
    try {
      const r = await axios.get(`${API}/inventory/products`);
      setProducts(r.data.products || []);
    } catch (e) { console.error('products:', e); }
  };

  const addItem = () => setItems([...items, { product_id: '', qty: 1, unit_price_mga: 0 }]);

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) newItems[index].unit_price_mga = parseFloat(product.unit_cost_mga) || 0;
    }
    setItems(newItems);
  };

  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

  const calculateTotal = () => items.reduce((sum, item) => sum + (item.qty * item.unit_price_mga), 0);

  const handleCreate = async () => {
    if (!selectedSupplier || items.length === 0) {
      toast.error('Sélectionnez un fournisseur et ajoutez des articles');
      return;
    }
    const validItems = items.filter(i => i.product_id && i.qty > 0);
    if (validItems.length === 0) { toast.error('Ajoutez au moins un article valide'); return; }

    try {
      const response = await axios.post(`${API}/purchases`, {
        supplier_id: selectedSupplier, items: validItems, notes
      });
      toast.success(`Bon ${response.data.purchase.number} créé`);
      resetForm();
      setIsDialogOpen(false);
      fetchPurchases();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur création');
    }
  };

  const handleReceive = async (purchase) => {
    if (!window.confirm(`Réceptionner le bon ${purchase.number} ? Le stock sera mis à jour.`)) return;
    try {
      await axios.post(`${API}/purchases/${purchase.id}/receive`);
      toast.success('Commande réceptionnée, stock mis à jour');
      fetchPurchases();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur réception');
    }
  };

  const handlePrint = (purchase) => window.open(`${API}/purchases/${purchase.id}/print`, '_blank');

  const resetForm = () => { setSelectedSupplier(''); setItems([]); setNotes(''); };

  const formatMoney = (val) => new Intl.NumberFormat('fr-MG').format(val || 0);

  const getStatusBadge = (status) => {
    const map = {
      DRAFT:     { cls: 'bg-amber-100 text-amber-800',  label: 'Brouillon' },
      RECEIVED:  { cls: 'bg-green-100 text-green-800',  label: 'Reçu' },
      CANCELLED: { cls: 'bg-red-100 text-red-800',      label: 'Annulé' }
    };
    const s = map[status] || map.CANCELLED;
    return <Badge className={s.cls}>{s.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
        <div className="grid gap-4">
          {[1,2,3].map(i => <div key={i} className="bg-gray-300 h-24 rounded-lg"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <ShoppingCart className="h-8 w-8 mr-3 text-indigo-600" />Achats
          </h1>
          <p className="text-gray-600 mt-1">{purchases.length} bon(s) de commande</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAll} data-testid="refresh-btn">
            <RefreshCw className="h-4 w-4 mr-2" />Actualiser
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700" data-testid="new-purchase-btn">
                <Plus className="h-4 w-4 mr-2" />Nouveau bon
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nouveau bon de commande</DialogTitle>
                <DialogDescription>Créez un bon de commande pour un fournisseur</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Fournisseur — select natif */}
                <div>
                  <Label>Fournisseur *</Label>
                  <select
                    value={selectedSupplier}
                    onChange={e => setSelectedSupplier(e.target.value)}
                    className={selectClass}
                    data-testid="supplier-select"
                  >
                    <option value="">Sélectionner un fournisseur...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                    ))}
                  </select>
                </div>

                {/* Articles */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Articles</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addItem} data-testid="add-item-btn">
                      <Plus className="h-4 w-4 mr-1" />Ajouter
                    </Button>
                  </div>

                  {items.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4 border rounded-lg">
                      Cliquez sur "Ajouter" pour ajouter des articles
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {items.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                          {/* Produit — select natif */}
                          <select
                            value={item.product_id}
                            onChange={e => updateItem(index, 'product_id', e.target.value)}
                            className={`${selectClass} flex-1`}
                            data-testid={`item-product-${index}`}
                          >
                            <option value="">Produit...</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                            ))}
                          </select>
                          <Input
                            type="number" min="1" className="w-20"
                            value={item.qty}
                            onChange={e => updateItem(index, 'qty', parseInt(e.target.value) || 1)}
                            placeholder="Qté" data-testid={`item-qty-${index}`}
                          />
                          <Input
                            type="number" min="0" className="w-28"
                            value={item.unit_price_mga}
                            onChange={e => updateItem(index, 'unit_price_mga', parseFloat(e.target.value) || 0)}
                            placeholder="Prix" data-testid={`item-price-${index}`}
                          />
                          <span className="text-sm text-gray-500 w-24 text-right">
                            {formatMoney(item.qty * item.unit_price_mga)} Ar
                          </span>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Total */}
                {items.length > 0 && (
                  <div className="flex justify-end p-3 bg-gray-50 rounded-lg">
                    <span className="text-lg font-bold">Total: {formatMoney(calculateTotal())} Ar</span>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <Label>Notes</Label>
                  <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes optionnelles..." />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                    Annuler
                  </Button>
                  <Button onClick={handleCreate} disabled={!selectedSupplier || items.length === 0}
                    data-testid="save-purchase-btn">
                    Créer le bon
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-6 w-6 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{purchases.filter(p => p.status === 'DRAFT').length}</p>
            <p className="text-sm text-gray-500">Brouillons</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Check className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{purchases.filter(p => p.status === 'RECEIVED').length}</p>
            <p className="text-sm text-gray-500">Reçus</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="h-6 w-6 mx-auto mb-2 text-indigo-500" />
            <p className="text-2xl font-bold">
              {formatMoney(purchases.filter(p => p.status === 'RECEIVED').reduce((s, p) => s + parseFloat(p.total_mga || 0), 0))} Ar
            </p>
            <p className="text-sm text-gray-500">Total achats</p>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      {purchases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600">Aucun bon de commande</h3>
            <p className="text-gray-500">Créez votre premier bon de commande</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {purchases.map((purchase) => (
            <Card key={purchase.id} data-testid={`purchase-${purchase.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${
                      purchase.status === 'DRAFT' ? 'bg-amber-100' :
                      purchase.status === 'RECEIVED' ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <ShoppingCart className={`h-6 w-6 ${
                        purchase.status === 'DRAFT' ? 'text-amber-600' :
                        purchase.status === 'RECEIVED' ? 'text-green-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{purchase.number}</h3>
                        {getStatusBadge(purchase.status)}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Truck className="h-3 w-3" />{purchase.supplier?.name || '-'}
                        </span>
                        <span>{purchase.items_count || purchase.items?.length || 0} article(s)</span>
                        <span>{new Date(purchase.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold">{formatMoney(purchase.total_mga)} Ar</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handlePrint(purchase)}
                        data-testid={`print-${purchase.id}`}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      {purchase.status === 'DRAFT' && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleReceive(purchase)} data-testid={`receive-${purchase.id}`}>
                          <Check className="h-4 w-4 mr-1" />Réceptionner
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PurchaseManagement;
