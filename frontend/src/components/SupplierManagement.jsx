import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Truck, Plus, Search, Edit, Power, Phone, Mail, MapPin, Building2, Star, RefreshCw } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SUPPLIER_TYPES = [
  { value: 'DENTAL',     label: 'Dentaire',    color: 'bg-blue-100 text-blue-800' },
  { value: 'PHARMA',     label: 'Pharmacie',   color: 'bg-green-100 text-green-800' },
  { value: 'EQUIPMENT',  label: 'Équipement',  color: 'bg-purple-100 text-purple-800' },
  { value: 'GENERAL',    label: 'Général',     color: 'bg-gray-100 text-gray-800' }
];

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

const SupplierManagement = () => {
  const [suppliers, setSuppliers]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [searchTerm, setSearchTerm]       = useState('');
  const [typeFilter, setTypeFilter]       = useState('ALL');
  const [isDialogOpen, setIsDialogOpen]   = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '', type: 'GENERAL', phone: '', email: '',
    city: 'Antananarivo', address: '', notes: ''
  });

  useEffect(() => { fetchSuppliers(); }, [typeFilter]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const params = { active: 'all' };
      if (typeFilter !== 'ALL') params.type = typeFilter;
      const response = await axios.get(`${API}/suppliers`, { params });
      setSuppliers(response.data.suppliers || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des fournisseurs');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await axios.put(`${API}/suppliers/${editingSupplier.id}`, formData);
        toast.success('Fournisseur mis à jour');
      } else {
        await axios.post(`${API}/suppliers`, formData);
        toast.success('Fournisseur créé');
      }
      resetForm();
      setIsDialogOpen(false);
      fetchSuppliers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur');
    }
  };

  const handleDisable = async (supplier) => {
    if (!window.confirm(`Désactiver le fournisseur "${supplier.name}" ?`)) return;
    try {
      await axios.patch(`${API}/suppliers/${supplier.id}/disable`);
      toast.success('Fournisseur désactivé');
      fetchSuppliers();
    } catch (error) {
      toast.error('Erreur lors de la désactivation');
    }
  };

  const openEditDialog = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name:    supplier.name    || '',
      type:    supplier.type    || 'GENERAL',
      phone:   supplier.phone   || '',
      email:   supplier.email   || '',
      city:    supplier.city    || 'Antananarivo',
      address: supplier.address || '',
      notes:   supplier.notes   || ''
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingSupplier(null);
    setFormData({ name: '', type: 'GENERAL', phone: '', email: '', city: 'Antananarivo', address: '', notes: '' });
  };

  const getTypeInfo = (type) => SUPPLIER_TYPES.find(t => t.value === type) || SUPPLIER_TYPES[3];

  const filteredSuppliers = suppliers.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <Truck className="h-8 w-8 mr-3 text-orange-600" />Fournisseurs
          </h1>
          <p className="text-gray-600 mt-1">{filteredSuppliers.length} fournisseur(s) enregistré(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSuppliers} data-testid="refresh-btn">
            <RefreshCw className="h-4 w-4 mr-2" />Actualiser
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700" data-testid="new-supplier-btn">
                <Plus className="h-4 w-4 mr-2" />Nouveau fournisseur
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</DialogTitle>
                <DialogDescription>
                  {editingSupplier ? 'Modifiez les informations du fournisseur' : 'Ajoutez un nouveau fournisseur'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nom *</Label>
                    <Input value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="Nom du fournisseur" required data-testid="supplier-name" />
                  </div>
                  <div>
                    <Label>Type</Label>
                    {/* select natif — évite le bug Portal de shadcn */}
                    <select
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value})}
                      className={selectClass}
                      data-testid="supplier-type"
                    >
                      {SUPPLIER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Ville</Label>
                    <Input value={formData.city}
                      onChange={e => setFormData({...formData, city: e.target.value})}
                      placeholder="Ville" data-testid="supplier-city" />
                  </div>
                  <div>
                    <Label>Téléphone</Label>
                    <Input value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      placeholder="+261 20 22 XXX XX" data-testid="supplier-phone" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      placeholder="email@fournisseur.mg" data-testid="supplier-email" />
                  </div>
                  <div className="col-span-2">
                    <Label>Adresse</Label>
                    <Input value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      placeholder="Adresse complète" />
                  </div>
                  <div className="col-span-2">
                    <Label>Notes</Label>
                    <Textarea value={formData.notes}
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                      placeholder="Notes supplémentaires..." rows={2} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={!formData.name} data-testid="save-supplier-btn">
                    {editingSupplier ? 'Mettre à jour' : 'Créer'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher un fournisseur..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10" data-testid="search-supplier"
          />
        </div>
        {/* select natif pour le filtre type */}
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className={`${selectClass} w-48`}
          data-testid="type-filter"
        >
          <option value="ALL">Tous les types</option>
          {SUPPLIER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* List */}
      {filteredSuppliers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Truck className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600">Aucun fournisseur</h3>
            <p className="text-gray-500">Créez votre premier fournisseur</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredSuppliers.map((supplier) => {
            const typeInfo = getTypeInfo(supplier.type);
            return (
              <Card key={supplier.id} className={!supplier.is_active ? 'opacity-60 bg-gray-50' : ''}
                data-testid={`supplier-${supplier.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${typeInfo.color.split(' ')[0]}`}>
                        <Building2 className={`h-6 w-6 ${typeInfo.color.split(' ')[1]}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{supplier.name}</h3>
                          <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                          {!supplier.is_active && <Badge variant="secondary">Inactif</Badge>}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          {supplier.city  && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{supplier.city}</span>}
                          {supplier.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{supplier.phone}</span>}
                          {supplier.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{supplier.email}</span>}
                        </div>
                        {supplier.notes && <p className="text-sm text-gray-500 mt-1 truncate max-w-md">{supplier.notes}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {supplier.rating && (
                        <div className="flex items-center gap-1 text-amber-500 mr-4">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="font-medium">{supplier.rating}/5</span>
                        </div>
                      )}
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(supplier)}
                        data-testid={`edit-${supplier.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {supplier.is_active && (
                        <Button variant="outline" size="sm"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleDisable(supplier)}
                          data-testid={`disable-${supplier.id}`}>
                          <Power className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SupplierManagement;
