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
  Save,
  Trash2,
  X
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8001/api'
    : '/api';
const authH = () => ({ withCredentials: true });

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
      const response = await axios.get(`${API}/pricing-schedules`, authH());
      const nextSchedules = response.data.schedules || [];
      setSchedules(nextSchedules);
      if (nextSchedules.length > 0) {
        const firstSchedule = nextSchedules.find(schedule => schedule.type === 'CABINET') || nextSchedules[0];
        setSelectedSchedule(firstSchedule);
        fetchFees(firstSchedule.id);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des grilles');
    } finally {
      setLoading(false);
    }
  };

  // const fetchFees = async (scheduleId) => {
  //   try {
  //     const response = await axios.get(`${API}/pricing-schedules/${scheduleId}/fees`, authH());
  //     setFees(response.data.fees || []);
  //   } catch (error) {
  //     toast.error('Erreur lors du chargement des actes');
  //   }
  // };

  const fetchFees = async (scheduleId) => {
    try {
      const response = await axios.get(
        `${API}/pricing-schedules/${scheduleId}/fees?_t=${Date.now()}`,
        authH()
      );
  
      setFees(response.data.fees || []);
    } catch (error) {
      console.error('Fetch fees error:', error?.response?.data || error.message);
      toast.error('Erreur lors du chargement des actes');
    }
  };
  // 
  const handleScheduleSelect = (schedule) => {
    setSelectedSchedule(() => schedule);
    setSearchTerm('');
    setCategoryFilter('ALL');
    fetchFees(schedule.id);
  };

  const handleAddFee = async (e) => {
    e.preventDefault();
    if (!canEditSchedule(selectedSchedule)) return;

    try {
      await axios.post(`${API}/pricing-schedules/${selectedSchedule.id}/fees`, {
        ...newFee,
        price_mga: parseFloat(newFee.price_mga)
      }, authH());
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
      await axios.patch(`${API}/procedure-fees/${fee.id}`, {
        label: fee.label,
        price_mga: parseFloat(fee.price_mga),
        category: fee.category,
        is_active: fee.is_active
      }, authH());
      toast.success('Acte mis à jour');
      setEditingFee(null);
      fetchFees(selectedSchedule.id);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour');
    }
  };

  // const handleDeleteFee = async (fee) => {
  //   if (!window.confirm(`Supprimer définitivement l'acte "${fee.label || fee.procedure_code}" ?`)) return;
  //   try {
  //     await axios.delete(`${API}/procedure-fees/${fee.id}`, authH());
  //     toast.success('Acte supprimé');
  //     fetchFees(selectedSchedule.id);
  //   } catch (error) {
  //     toast.error(error.response?.data?.error || 'Erreur suppression');
  //   }
  // };

  const handleDeleteFee = async (fee) => {
    if (!window.confirm(`Supprimer définitivement l'acte "${fee.label || fee.procedure_code}" ?`)) return;
  
    try {
      await axios.delete(`${API}/procedure-fees/${fee.id}`, authH());
  
      setFees(prevFees => prevFees.filter(item => item.id !== fee.id));
  
      // toast.success('Acte supprimé');
      toast.success('Acte supprimé', {
        duration: 2000
      });
      // 
      if (selectedSchedule?.id) {
        await fetchFees(selectedSchedule.id);
      }
    } catch (error) {
      console.error('Delete fee error:', error?.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Erreur suppression');
    }
  };
  // 
  // Créer une nouvelle grille si aucune n'existe pour le cabinet
  const handleCreateSchedule = async () => {
    try {
      await axios.post(`${API}/pricing-schedules`, { name: 'Mes tarifs', type: 'CABINET' }, authH());
      toast.success('Grille créée');
      fetchSchedules();
    } catch(e) { toast.error('Erreur création grille'); }
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
    formData.append('replace', 'true');

    try {
      const response = await axios.post(
        `${API}/pricing-schedules/${selectedSchedule.id}/import-fees`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          withCredentials: true
        }
      );
      toast.success(`Import terminé: ${response.data.inserted || response.data.imported || 0} ajoutés, ${response.data.updated || 0} mis à jour`);
      fetchFees(selectedSchedule.id);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'import');
    }
    e.target.value = '';
  };

  const handleImportTemplateTarifs = async () => {
    if (!canExecuteSchedule(selectedSchedule)) {
      toast.error('Permission exécution requise pour importer le template');
      return;
    }
    
    if (!confirm('Importer le modèle de tarifs 2026 ?\nCela remplacera les tarifs actuels.')) return;

    try {
      const response = await axios.post(
        `${API}/pricing-schedules/${selectedSchedule.id}/import-template-maeva`,
        null,
        authH()
      );
      toast.success(`Modèle de tarifs importé: ${response.data.stats.inserted} ajoutés, ${response.data.stats.updated} mis à jour`);
      fetchFees(selectedSchedule.id);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'import du modèle');
    }
  };

  const handleToggleActive = async (fee) => {
    try {
      await axios.put(`${API}/procedure-fees/${fee.id}`, {
        is_active: !fee.is_active
      }, authH());
      toast.success(fee.is_active ? 'Acte désactivé' : 'Acte activé');
      fetchFees(selectedSchedule.id);
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
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

  const canEditSchedule = (schedule) => {
    if (!schedule) return false;
    if (schedule.permissions) return Boolean(schedule.permissions.write);
    if (user?.role === 'SUPER_ADMIN') return schedule.type !== 'SYNDICAL';
    return Boolean(schedule.clinic_id && schedule.type !== 'SYNDICAL');
  };

  const canExecuteSchedule = (schedule) => {
    if (!schedule) return false;
    if (schedule.permissions) return Boolean(schedule.permissions.execute);
    return canEditSchedule(schedule);
  };
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
      <Tabs
        value={selectedSchedule?.id || schedules[0]?.id}
        onValueChange={(scheduleId) => {
          const schedule = schedules.find(item => item.id === scheduleId);
          if (schedule) handleScheduleSelect(schedule);
        }}
        className="w-full"
      >
        <TabsList
          className="grid w-full max-w-2xl"
          style={{ gridTemplateColumns: `repeat(${Math.max(schedules.length, 1)}, minmax(0, 1fr))` }}
        >
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
                    
                    {/* Import Button */}
                    {canExecuteSchedule(schedule) && (
                      <>
                        <input
                          aria-label="Fichier d’import des tarifs"
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
                    {/* Add Button */}
                    {canEditSchedule(schedule) && (
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
                {!canEditSchedule(schedule) && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                    <Lock className="h-4 w-4 text-amber-600" />
                    <span className="text-amber-800 text-sm">
                      {schedule.type === 'SYNDICAL'
                        ? 'Grille syndicale en lecture seule. Les tarifs SYNDICAL restent gérés au niveau plateforme.'
                        : 'Cette grille cabinet est en lecture seule pour ce compte. Les tarifs propres au cabinet peuvent être modifiés par les comptes autorisés du cabinet.'}
                    </span>
                  </div>
                )}

                {/* Filters */}
                <div className="flex gap-4 mb-4">
                  <div
                    style={{
                      position: 'relative',
                      width: '100%'
                    }}
                  >
                    <Search
                      size={22}
                      style={{
                        position: 'absolute',
                        left: 22,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94A3B8',
                        pointerEvents: 'none',
                        zIndex: 2
                      }}
                    />
                  
                    <Input
                      placeholder="Rechercher un acte..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#0D7A87';
                        e.currentTarget.style.boxShadow = '0 0 0 4px rgba(13, 122, 135, 0.12)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#C7E1E5';
                        e.currentTarget.style.boxShadow = '0 4px 14px rgba(13, 122, 135, 0.08)';
                      }}
                      style={{
                        width: '100%',
                        height: 58,
                        paddingLeft: 62,
                        paddingRight: 22,
                        borderRadius: 28,
                        border: '2px solid #C7E1E5',
                        background: '#F8FEFE',
                        color: '#0F172A',
                        fontSize: 18,
                        fontWeight: 500,
                        outline: 'none',
                        boxShadow: '0 4px 14px rgba(13, 122, 135, 0.08)'
                      }}
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
                        {canEditSchedule(schedule) && (
                          <>
                            <TableHead className="w-[80px] text-center">Actif</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFees.map(fee => (
                        <TableRow key={fee.id} className={!fee.is_active ? 'opacity-50 bg-gray-50' : ''}>
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
                          {canEditSchedule(schedule) && (
                            <>
                              <TableCell className="text-center">
                                <Switch
                                  checked={fee.is_active}
                                  onCheckedChange={() => handleToggleActive(fee)}
                                  data-testid={`toggle-${fee.procedure_code}`}
                                />
                              </TableCell>
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
                                      <Button size="sm" variant="ghost" onClick={() => handleDeleteFee(fee)} data-testid={`delete-${fee.procedure_code}`}>
                                        <Trash2 className="h-4 w-4 text-red-600" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4 text-sm text-gray-500 flex justify-between">
                  <span>{filteredFees.length} actes affichés sur {fees.length}</span>
                  <span className="text-green-600">{fees.filter(f => f.is_active).length} actifs</span>
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
