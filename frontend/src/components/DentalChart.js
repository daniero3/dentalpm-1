import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Plus, 
  Save,
  Activity,
  AlertCircle,
  Calendar,
  Palette
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DentalChart = () => {
  const { patientId } = useParams();
  const { user } = useAuth();
  const [patient, setPatient] = useState(null);
  const [dentalChart, setDentalChart] = useState(null);
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [procedureDialog, setProcedureDialog] = useState(false);
  const [procedureData, setProcedureData] = useState({
    procedure_type: '',
    procedure_name: '',
    description: '',
    cost_mga: '',
    date_performed: '',
    notes: ''
  });

  const procedureTypes = {
    restoration: { name: 'Restauration', color: 'bg-blue-500', textColor: 'text-blue-700' },
    prosthetics: { name: 'Prothèse', color: 'bg-purple-500', textColor: 'text-purple-700' },
    odf: { name: 'Orthodontie', color: 'bg-cyan-500', textColor: 'text-cyan-700' },
    periodontics: { name: 'Parodontologie', color: 'bg-green-500', textColor: 'text-green-700' },
    surgery: { name: 'Chirurgie', color: 'bg-orange-500', textColor: 'text-orange-700' },
    prevention: { name: 'Prévention', color: 'bg-lime-500', textColor: 'text-lime-700' },
    endodontics: { name: 'Endodontie', color: 'bg-red-500', textColor: 'text-red-700' }
  };

  const toothStatuses = {
    healthy: { name: 'Saine', color: '#22c55e' },
    carious: { name: 'Cariée', color: '#ef4444' },
    filled: { name: 'Obturée', color: '#3b82f6' },
    missing: { name: 'Absente', color: '#64748b' },
    crowned: { name: 'Couronnée', color: '#f59e0b' },
    implant: { name: 'Implant', color: '#8b5cf6' }
  };

  useEffect(() => {
    fetchPatientData();
    fetchDentalChart();
  }, [patientId]);

  const fetchPatientData = async () => {
    try {
      const response = await axios.get(`${API}/patients/${patientId}`);
      setPatient(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement du patient');
    }
  };

  const fetchDentalChart = async () => {
    try {
      const response = await axios.get(`${API}/patients/${patientId}/dental-chart`);
      setDentalChart(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement de la fiche dentaire');
    } finally {
      setLoading(false);
    }
  };

  const handleToothClick = (toothData) => {
    setSelectedTooth(toothData);
  };

  const addProcedure = async () => {
    if (!selectedTooth) return;
    
    try {
      const updatedTooth = {
        ...selectedTooth,
        procedures: [...selectedTooth.procedures, {
          ...procedureData,
          cost_mga: parseFloat(procedureData.cost_mga)
        }]
      };
      
      await axios.put(`${API}/patients/${patientId}/dental-chart/tooth/${selectedTooth.tooth_position}`, updatedTooth);
      
      toast.success('Procédure ajoutée avec succès');
      await fetchDentalChart();
      setProcedureDialog(false);
      setProcedureData({
        procedure_type: '',
        procedure_name: '',
        description: '',
        cost_mga: '',
        date_performed: '',
        notes: ''
      });
    } catch (error) {
      toast.error('Erreur lors de l\'ajout de la procédure');
    }
  };

  const updateToothStatus = async (status) => {
    if (!selectedTooth) return;
    
    try {
      const updatedTooth = {
        ...selectedTooth,
        status: status
      };
      
      await axios.put(`${API}/patients/${patientId}/dental-chart/tooth/${selectedTooth.tooth_position}`, updatedTooth);
      
      toast.success('Statut de la dent mis à jour');
      await fetchDentalChart();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const renderTooth = (toothData) => {
    const toothNumber = parseInt(toothData.tooth_position);
    const status = toothStatuses[toothData.status] || toothStatuses.healthy;
    const hasProblems = toothData.status !== 'healthy';
    
    return (
      <div
        key={toothData.tooth_position}
        className="relative cursor-pointer group"
        onClick={() => handleToothClick(toothData)}
      >
        <div className="tooltip-container">
          {/* Tooth SVG */}
          <svg width="40" height="50" viewBox="0 0 40 50" className="tooth-svg hover:scale-110 transition-transform">
            <path
              d="M20 5 C12 5, 8 12, 8 20 C8 35, 12 42, 20 45 C28 42, 32 35, 32 20 C32 12, 28 5, 20 5 Z"
              fill={status.color}
              stroke="#374151"
              strokeWidth="2"
              opacity="0.9"
            />
            {hasProblems && (
              <circle cx="32" cy="8" r="4" fill="#ef4444" stroke="white" strokeWidth="1" />
            )}
          </svg>
          
          {/* Tooth number */}
          <div className="text-xs font-semibold text-center mt-1">
            {toothNumber}
          </div>
          
          {/* Procedures indicators */}
          {toothData.procedures.length > 0 && (
            <div className="flex justify-center mt-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDentalChart = () => {
    if (!dentalChart) return null;

    const upperTeeth = dentalChart.teeth_records.filter(tooth => 
      parseInt(tooth.tooth_position) >= 1 && parseInt(tooth.tooth_position) <= 16
    ).sort((a, b) => parseInt(a.tooth_position) - parseInt(b.tooth_position));

    const lowerTeeth = dentalChart.teeth_records.filter(tooth => 
      parseInt(tooth.tooth_position) >= 17 && parseInt(tooth.tooth_position) <= 32
    ).sort((a, b) => parseInt(a.tooth_position) - parseInt(b.tooth_position));

    return (
      <div className="dental-chart-container">
        <div className="space-y-8">
          {/* Upper jaw */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-4 text-center">
              Mâchoire Supérieure
            </h3>
            <div className="flex justify-center space-x-2">
              {upperTeeth.map(renderTooth)}
            </div>
          </div>
          
          {/* Lower jaw */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-4 text-center">
              Mâchoire Inférieure
            </h3>
            <div className="flex justify-center space-x-2">
              {lowerTeeth.map(renderTooth)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/3 mb-6"></div>
          <div className="bg-gray-300 h-64 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/patients">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Activity className="h-8 w-8 mr-3 text-blue-600" />
              Fiche Dentaire
            </h1>
            {patient && (
              <p className="text-gray-600 mt-1">
                {patient.first_name} {patient.last_name} - {new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()} ans
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dental Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Schéma Dentaire</CardTitle>
            <CardDescription>
              Cliquez sur une dent pour voir les détails et ajouter des procédures
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderDentalChart()}
            
            {/* Legend */}
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Légende:</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(toothStatuses).map(([key, status]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: status.color }}></div>
                    <span className="text-sm text-gray-600">{status.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tooth Details & Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              {selectedTooth ? `Dent ${selectedTooth.tooth_position}` : 'Sélectionnez une dent'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTooth ? (
              <>
                {/* Tooth Status */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Statut actuel:</Label>
                  <div className="mt-2">
                    <Badge style={{ backgroundColor: toothStatuses[selectedTooth.status]?.color }}>
                      {toothStatuses[selectedTooth.status]?.name}
                    </Badge>
                  </div>
                </div>

                {/* Change Status */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Changer le statut:</Label>
                  <Select onValueChange={updateToothStatus}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Nouveau statut" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(toothStatuses).map(([key, status]) => (
                        <SelectItem key={key} value={key}>{status.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Procedures */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium text-gray-700">Procédures:</Label>
                    <Dialog open={procedureDialog} onOpenChange={setProcedureDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Plus className="h-4 w-4 mr-1" />
                          Ajouter
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Nouvelle Procédure - Dent {selectedTooth.tooth_position}</DialogTitle>
                          <DialogDescription>
                            Ajoutez une nouvelle procédure pour cette dent
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="procedure_type">Type de procédure</Label>
                            <Select value={procedureData.procedure_type} onValueChange={(value) => setProcedureData({...procedureData, procedure_type: value})}>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionnez le type" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(procedureTypes).map(([key, type]) => (
                                  <SelectItem key={key} value={key}>{type.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="procedure_name">Nom de la procédure</Label>
                            <Input
                              id="procedure_name"
                              value={procedureData.procedure_name}
                              onChange={(e) => setProcedureData({...procedureData, procedure_name: e.target.value})}
                              placeholder="Ex: Amalgame, Couronne, etc."
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="cost_mga">Coût (MGA)</Label>
                            <Input
                              id="cost_mga"
                              type="number"
                              value={procedureData.cost_mga}
                              onChange={(e) => setProcedureData({...procedureData, cost_mga: e.target.value})}
                              placeholder="50000"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="date_performed">Date de réalisation</Label>
                            <Input
                              id="date_performed"
                              type="date"
                              value={procedureData.date_performed}
                              onChange={(e) => setProcedureData({...procedureData, date_performed: e.target.value})}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              value={procedureData.description}
                              onChange={(e) => setProcedureData({...procedureData, description: e.target.value})}
                              placeholder="Description détaillée de la procédure"
                              rows={3}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                              id="notes"
                              value={procedureData.notes}
                              onChange={(e) => setProcedureData({...procedureData, notes: e.target.value})}
                              placeholder="Notes additionnelles"
                              rows={2}
                            />
                          </div>
                          
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setProcedureDialog(false)}>
                              Annuler
                            </Button>
                            <Button onClick={addProcedure}>
                              <Save className="h-4 w-4 mr-2" />
                              Enregistrer
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedTooth.procedures.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">Aucune procédure enregistrée</p>
                    ) : (
                      selectedTooth.procedures.map((procedure, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <Badge className={procedureTypes[procedure.procedure_type]?.color || 'bg-gray-500'}>
                              {procedureTypes[procedure.procedure_type]?.name}
                            </Badge>
                            {procedure.cost_mga && (
                              <span className="text-sm font-semibold">
                                {new Intl.NumberFormat('fr-MG').format(procedure.cost_mga)} MGA
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium">{procedure.procedure_name}</p>
                          {procedure.date_performed && (
                            <p className="text-xs text-gray-500 mt-1">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {new Date(procedure.date_performed).toLocaleDateString('fr-FR')}
                            </p>
                          )}
                          {procedure.description && (
                            <p className="text-xs text-gray-600 mt-1">{procedure.description}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Notes */}
                {selectedTooth.notes && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Notes:</Label>
                    <p className="text-sm text-gray-600 mt-1 p-2 bg-gray-50 rounded">
                      {selectedTooth.notes}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-sm text-gray-500">
                  Cliquez sur une dent dans le schéma pour voir les détails et gérer les procédures
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DentalChart;