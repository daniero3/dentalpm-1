import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { toast } from 'sonner';
import { 
  Settings, 
  Plus, 
  Search, 
  Edit2, 
  Upload,
  Download,
  Lock,
  Unlock,
  DollarSign,
  FileText,
  Save,
  Trash2,
  X,
  AlertTriangle
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PricingSettings = () => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [newFee, setNewFee] = useState({
    procedure_code: '',
    label: '',
    price_mga: '',
    category: 'GENERAL'
  });

  const categories = [
    'ALL', 'CONSULTATION', 'SOINS_CONSERVATEURS', 'PARODONTOLOGIE', 
    'EXTRACTION', 'CHIRURGIE', 'PROTHESE_CONJOINTE', 'PROTHESE_ADJOINTE',
    'ORTHODONTIE', 'IMPLANTOLOGIE', 'RADIOLOGIE', 'GENERAL'
  ];

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await axios.get(`${API}/pricing-schedules`);
      setSchedules(response.data.schedules || []);
      if (response.data.schedules?.length > 0) {
        const firstSchedule = response.data.schedules[0];
        setSelectedSchedule(firstSchedule);
        fetchFees(firstSchedule.id);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des grilles');
    } finally {
      setLoading(false);
    }
  };

  const fetchFees = async (scheduleId) => {
    try {
      const response = await axios.get(`${API}/pricing-schedules/${scheduleId}/fees`);
      setFees(response.data.fees || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des actes');
    }
  };

  const handleScheduleSelect = (schedule) => {
    setSelectedSchedule(schedule);
    fetchFees(schedule.id);
    setSearchTerm('');
    setCategoryFilter('ALL');
  };

  const handleAddFee = async (e) => {
    e.preventDefault();
    if (!selectedSchedule) return;

    try {
      await axios.post(`${API}/pricing-schedules/${selectedSchedule.id}/fees`, {
        ...newFee,
        price_mga: parseFloat(newFee.price_mga)
      });
      toast.success('Acte ajouté avec succès');
      fetchFees(selectedSchedule.id);
      setIsAddDialogOpen(false);
      setNewFee({ procedure_code: '', label: '', price_mga: '', category: 'GENERAL' });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'ajout');
    }
  };

  const handleUpdateFee = async (fee) => {
    try {
      await axios.put(`${API}/procedure-fees/${fee.id}`, {
        label: fee.label,
        price_mga: parseFloat(fee.price_mga),
        category: fee.category,
        is_active: fee.is_active
      });
      toast.success('Acte mis à jour');
      setEditingFee(null);
      fetchFees(selectedSchedule.id);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour');
    }
  };

  const handleDeleteFee = async (fee) => {
    if (!confirm(`Désactiver l'acte "${fee.procedure_code}" ?`)) return;
    try {
      await axios.put(`${API}/procedure-fees/${fee.id}`, {
        is_active: false
      });
      toast.success('Acte désactivé');
      fetchFees(selectedSchedule.id);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la désactivation');
    }
  };

  const handleExportCSV = () => {
    if (!selectedSchedule || fees.length === 0) return;
    
    const csvHeaders = 'procedure_code,label,price_mga,category\n';
    const csvRows = fees.map(fee => 
      `"${fee.procedure_code}","${fee.label.replace(/"/g, '""')}",${fee.price_mga},"${fee.category}"`
    ).join('\n');
    
    const blob = new Blob([csvHeaders + csvRows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tarifs_${selectedSchedule.type}_${selectedSchedule.year || '2026'}.csv`;
    link.click();
    toast.success('Export CSV terminé');
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSchedule) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        `${API}/pricing-schedules/${selectedSchedule.id}/import-fees`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      toast.success(`Import terminé: ${response.data.imported} ajoutés, ${response.data.updated} mis à jour`);
      fetchFees(selectedSchedule.id);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'import');
    }
    e.target.value = '';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const filteredFees = fees.filter(fee => {
    const matchesSearch = 
      fee.procedure_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.label.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || fee.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const isReadOnly = selectedSchedule?.type === 'SYNDICAL' && user?.role !== 'SUPER_ADMIN';

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded w-1/4"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="pricing-settings">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Settings className="h-8 w-8 mr-3 text-blue-600" />
            Gestion des Tarifs
          </h1>
          <p className="text-gray-600 mt-1">
            Configurez vos grilles tarifaires SYNDICAL et CABINET
          </p>
        </div>
      </div>

      {/* Schedule Tabs */}
      <Tabs defaultValue={schedules[0]?.id} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          {schedules.map(schedule => (
            <TabsTrigger 
              key={schedule.id} 
              value={schedule.id}
              onClick={() => handleScheduleSelect(schedule)}
              className="flex items-center gap-2"
              data-testid={`tab-${schedule.type}`}
            >
              {schedule.type === 'SYNDICAL' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              {schedule.type}
            </TabsTrigger>
          ))}
        </TabsList>

        {schedules.map(schedule => (
          <TabsContent key={schedule.id} value={schedule.id}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {schedule.name}
                      <Badge variant={schedule.type === 'SYNDICAL' ? 'default' : 'secondary'}>
                        {schedule.year || '2026'}
                      </Badge>
                    </CardTitle>
                    <CardDescription>{schedule.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {/* Export CSV Button */}
                    <Button 
                      variant="outline" 
                      onClick={handleExportCSV}
                      disabled={fees.length === 0}
                      data-testid="export-btn"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Exporter CSV
                    </Button>
                    {/* Import Button (SYNDICAL: Admin only, CABINET: always) */}
                    {(schedule.type === 'CABINET' || user?.role === 'SUPER_ADMIN') && (
                      <>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImportCSV}
                          accept=".csv,.json"
                          className="hidden"
                        />
                        <Button 
                          variant="outline" 
                          onClick={() => fileInputRef.current?.click()}
                          data-testid="import-btn"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Importer CSV
                        </Button>
                      </>
                    )}
                    {/* Add Button (CABINET or Admin) */}
                    {(schedule.type === 'CABINET' || user?.role === 'SUPER_ADMIN') && (
                      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                          <Button data-testid="add-fee-btn">
                            <Plus className="h-4 w-4 mr-2" />
                            Ajouter un acte
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Ajouter un acte</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleAddFee} className="space-y-4">
                            <div>
                              <Label>Code acte *</Label>
                              <Input
                                value={newFee.procedure_code}
                                onChange={(e) => setNewFee({...newFee, procedure_code: e.target.value})}
                                placeholder="EX: CONS01"
                                required
                              />
                            </div>
                            <div>
                              <Label>Libellé *</Label>
                              <Input
                                value={newFee.label}
                                onChange={(e) => setNewFee({...newFee, label: e.target.value})}
                                placeholder="Consultation simple"
                                required
                              />
                            </div>
                            <div>
                              <Label>Prix (MGA) *</Label>
                              <Input
                                type="number"
                                value={newFee.price_mga}
                                onChange={(e) => setNewFee({...newFee, price_mga: e.target.value})}
                                placeholder="35000"
                                required
                              />
                            </div>
                            <div>
                              <Label>Catégorie</Label>
                              <Select value={newFee.category} onValueChange={(v) => setNewFee({...newFee, category: v})}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.filter(c => c !== 'ALL').map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button type="submit" className="w-full">Ajouter</Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Read-only notice */}
                {isReadOnly && schedule.type === 'SYNDICAL' && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                    <Lock className="h-4 w-4 text-amber-600" />
                    <span className="text-amber-800 text-sm">
                      Grille Syndicale en lecture seule. Seul un administrateur peut la modifier.
                    </span>
                  </div>
                )}

                {/* Filters */}
                <div className="flex gap-4 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher un acte..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat === 'ALL' ? 'Toutes catégories' : cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fees Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Code</TableHead>
                        <TableHead>Libellé</TableHead>
                        <TableHead className="w-[150px]">Catégorie</TableHead>
                        <TableHead className="w-[150px] text-right">Prix (MGA)</TableHead>
                        {(schedule.type === 'CABINET' || user?.role === 'SUPER_ADMIN') && (
                          <TableHead className="w-[100px]">Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFees.map(fee => (
                        <TableRow key={fee.id} className={!fee.is_active ? 'opacity-50' : ''}>
                          <TableCell className="font-mono">{fee.procedure_code}</TableCell>
                          <TableCell>
                            {editingFee?.id === fee.id ? (
                              <Input
                                value={editingFee.label}
                                onChange={(e) => setEditingFee({...editingFee, label: e.target.value})}
                                className="h-8"
                              />
                            ) : fee.label}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{fee.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {editingFee?.id === fee.id ? (
                              <Input
                                type="number"
                                value={editingFee.price_mga}
                                onChange={(e) => setEditingFee({...editingFee, price_mga: e.target.value})}
                                className="h-8 w-28 text-right"
                              />
                            ) : formatCurrency(fee.price_mga)}
                          </TableCell>
                          {(schedule.type === 'CABINET' || user?.role === 'SUPER_ADMIN') && (
                            <TableCell>
                              <div className="flex gap-1">
                                {editingFee?.id === fee.id ? (
                                  <>
                                    <Button size="sm" onClick={() => handleUpdateFee(editingFee)} data-testid={`save-${fee.procedure_code}`}>
                                      <Save className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingFee(null)}>
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingFee({...fee})} data-testid={`edit-${fee.procedure_code}`}>
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteFee(fee)} data-testid={`delete-${fee.procedure_code}`}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4 text-sm text-gray-500">
                  {filteredFees.length} actes affichés sur {fees.length}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default PricingSettings;
