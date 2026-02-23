import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { 
  Building2, 
  Image, 
  Smartphone, 
  FileSpreadsheet, 
  Users,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const steps = [
  { id: 1, title: 'Informations Clinique', icon: Building2 },
  { id: 2, title: 'Logo', icon: Image },
  { id: 3, title: 'Mobile Money', icon: Smartphone },
  { id: 4, title: 'Tarifs CABINET', icon: FileSpreadsheet },
  { id: 5, title: 'Équipe', icon: Users }
];

const OnboardingWizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  
  // Step 1 data
  const [clinicData, setClinicData] = useState({
    name: '', phone: '', address: '', city: 'Antananarivo', business_name: '', nif_number: ''
  });
  
  // Step 2 data
  const [logoUrl, setLogoUrl] = useState('');
  
  // Step 3 data
  const [mobileMoneyMerchant, setMobileMoneyMerchant] = useState('');
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState('');
  
  // Step 4 data
  const [csvData, setCsvData] = useState('');
  const [importResult, setImportResult] = useState(null);
  
  // Step 5 data
  const [staffData, setStaffData] = useState({
    full_name: '', username: '', password: '', role: 'DENTIST', email: ''
  });
  const [staffCreated, setStaffCreated] = useState([]);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await axios.get(`${API}/onboarding/status`);
      if (response.data.completed) {
        navigate('/');
      } else {
        setCurrentStep(response.data.step);
        if (response.data.clinic) {
          setClinicData(prev => ({ ...prev, ...response.data.clinic }));
          setLogoUrl(response.data.clinic.logo_url || '');
        }
      }
    } catch (error) {
      console.error('Fetch status error:', error);
    }
  };

  const handleStep1 = async () => {
    if (!clinicData.name || !clinicData.phone || !clinicData.address) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/onboarding/step1`, clinicData);
      toast.success('Informations enregistrées');
      setCurrentStep(2);
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async () => {
    if (!logoUrl) {
      setCurrentStep(3); // Skip if no logo
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/onboarding/step2`, { logo_url: logoUrl });
      toast.success('Logo enregistré');
      setCurrentStep(3);
    } catch (error) {
      toast.error('URL du logo invalide');
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/onboarding/step3`, {
        mobile_money_merchant: mobileMoneyMerchant,
        mobile_money_number: mobileMoneyNumber
      });
      toast.success('Configuration Mobile Money enregistrée');
      setCurrentStep(4);
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const handleStep4 = async () => {
    if (!csvData.trim()) {
      setCurrentStep(5); // Skip if no CSV
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API}/onboarding/step4`, { csv_data: csvData });
      setImportResult(response.data);
      toast.success(`${response.data.imported} actes importés`);
      setCurrentStep(5);
    } catch (error) {
      toast.error('Erreur import CSV');
    } finally {
      setLoading(false);
    }
  };

  const handleStep5 = async () => {
    if (!staffData.full_name || !staffData.username || !staffData.password) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API}/onboarding/step5`, staffData);
      setStaffCreated([...staffCreated, response.data.user]);
      setStaffData({ full_name: '', username: '', password: '', role: 'DENTIST', email: '' });
      toast.success('Utilisateur créé');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur création utilisateur');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const response = await axios.post(`${API}/onboarding/complete`);
      toast.success(response.data.message);
      setTimeout(() => navigate('/'), 1500);
    } catch (error) {
      toast.error('Erreur lors de la finalisation');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Configuration de votre clinique</h1>
          <p className="text-gray-600 mt-2">Suivez les étapes pour démarrer</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center mb-8 space-x-2">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div 
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                  currentStep > step.id 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : currentStep === step.id 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'border-gray-300 text-gray-400'
                }`}
                data-testid={`step-${step.id}`}
              >
                {currentStep > step.id ? <CheckCircle className="h-5 w-5" /> : step.id}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-1 ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-300'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {React.createElement(steps[currentStep - 1].icon, { className: "h-6 w-6 text-blue-600" })}
              {steps[currentStep - 1].title}
            </CardTitle>
            <CardDescription>Étape {currentStep} sur {steps.length}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Step 1: Clinic Info */}
            {currentStep === 1 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nom de la clinique *</Label>
                    <Input 
                      value={clinicData.name}
                      onChange={(e) => setClinicData({...clinicData, name: e.target.value})}
                      placeholder="Cabinet Dentaire XYZ"
                      data-testid="clinic-name"
                    />
                  </div>
                  <div>
                    <Label>Téléphone *</Label>
                    <Input 
                      value={clinicData.phone}
                      onChange={(e) => setClinicData({...clinicData, phone: e.target.value})}
                      placeholder="+261 20 22 XXX XX"
                    />
                  </div>
                  <div>
                    <Label>Ville</Label>
                    <Input 
                      value={clinicData.city}
                      onChange={(e) => setClinicData({...clinicData, city: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Adresse *</Label>
                    <Textarea 
                      value={clinicData.address}
                      onChange={(e) => setClinicData({...clinicData, address: e.target.value})}
                      placeholder="Lot IVG 123, Analakely"
                    />
                  </div>
                  <div>
                    <Label>Raison sociale</Label>
                    <Input 
                      value={clinicData.business_name}
                      onChange={(e) => setClinicData({...clinicData, business_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>NIF</Label>
                    <Input 
                      value={clinicData.nif_number}
                      onChange={(e) => setClinicData({...clinicData, nif_number: e.target.value})}
                    />
                  </div>
                </div>
                <Button onClick={handleStep1} disabled={loading} className="w-full mt-4">
                  {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                  Continuer <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}

            {/* Step 2: Logo */}
            {currentStep === 2 && (
              <>
                <div>
                  <Label>URL du logo (optionnel)</Label>
                  <Input 
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    data-testid="logo-url"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Entrez l'URL de votre logo. Il apparaîtra sur vos factures et devis.
                  </p>
                </div>
                {logoUrl && (
                  <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
                    <img src={logoUrl} alt="Logo preview" className="max-h-24 object-contain" onError={(e) => e.target.style.display='none'} />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    <ChevronLeft className="h-4 w-4 mr-2" /> Retour
                  </Button>
                  <Button onClick={handleStep2} disabled={loading} className="flex-1">
                    {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                    {logoUrl ? 'Continuer' : 'Passer'} <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: Mobile Money */}
            {currentStep === 3 && (
              <>
                <div className="space-y-4">
                  <div>
                    <Label>Nom du marchand Mobile Money</Label>
                    <Input 
                      value={mobileMoneyMerchant}
                      onChange={(e) => setMobileMoneyMerchant(e.target.value)}
                      placeholder="Cabinet Dr. RAKOTO"
                    />
                  </div>
                  <div>
                    <Label>Numéro Mobile Money</Label>
                    <Input 
                      value={mobileMoneyNumber}
                      onChange={(e) => setMobileMoneyNumber(e.target.value)}
                      placeholder="+261 34 XX XXX XX"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    Ces informations apparaîtront sur vos factures pour faciliter les paiements.
                  </p>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>
                    <ChevronLeft className="h-4 w-4 mr-2" /> Retour
                  </Button>
                  <Button onClick={handleStep3} disabled={loading} className="flex-1">
                    {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                    Continuer <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </>
            )}

            {/* Step 4: Import Tarif CSV */}
            {currentStep === 4 && (
              <>
                <div>
                  <Label>Import tarifs CABINET (CSV)</Label>
                  <Textarea 
                    value={csvData}
                    onChange={(e) => setCsvData(e.target.value)}
                    placeholder="code,name,price_mga,category&#10;CONS01,Consultation,25000,CONSULTATION&#10;EXT01,Extraction simple,50000,CHIRURGIE"
                    rows={6}
                    className="font-mono text-sm"
                    data-testid="csv-import"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Format: code,name,price_mga,category (une ligne par acte)
                  </p>
                </div>
                {importResult && (
                  <div className="p-3 bg-green-50 text-green-700 rounded-lg">
                    ✅ {importResult.imported} actes importés avec succès
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(3)}>
                    <ChevronLeft className="h-4 w-4 mr-2" /> Retour
                  </Button>
                  <Button onClick={handleStep4} disabled={loading} className="flex-1">
                    {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                    {csvData.trim() ? 'Importer & Continuer' : 'Passer'} <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </>
            )}

            {/* Step 5: Create Staff */}
            {currentStep === 5 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nom complet *</Label>
                    <Input 
                      value={staffData.full_name}
                      onChange={(e) => setStaffData({...staffData, full_name: e.target.value})}
                      placeholder="Dr. Jean RAKOTO"
                    />
                  </div>
                  <div>
                    <Label>Rôle</Label>
                    <Select value={staffData.role} onValueChange={(v) => setStaffData({...staffData, role: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DENTIST">Dentiste</SelectItem>
                        <SelectItem value="SECRETARY">Secrétaire</SelectItem>
                        <SelectItem value="ACCOUNTANT">Comptable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Identifiant *</Label>
                    <Input 
                      value={staffData.username}
                      onChange={(e) => setStaffData({...staffData, username: e.target.value})}
                      placeholder="jrakoto"
                    />
                  </div>
                  <div>
                    <Label>Mot de passe *</Label>
                    <Input 
                      type="password"
                      value={staffData.password}
                      onChange={(e) => setStaffData({...staffData, password: e.target.value})}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                
                <Button onClick={handleStep5} disabled={loading} variant="outline" className="w-full">
                  {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Users className="h-4 w-4 mr-2" />}
                  Ajouter cet utilisateur
                </Button>

                {staffCreated.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-700 mb-2">Utilisateurs créés:</p>
                    {staffCreated.map((u, i) => (
                      <div key={i} className="text-sm text-blue-600">• {u.full_name} ({u.role})</div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button variant="outline" onClick={() => setCurrentStep(4)}>
                    <ChevronLeft className="h-4 w-4 mr-2" /> Retour
                  </Button>
                  <Button onClick={handleComplete} disabled={completing} className="flex-1 bg-green-600 hover:bg-green-700">
                    {completing ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Terminer & Activer l'essai 7 jours
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingWizard;
