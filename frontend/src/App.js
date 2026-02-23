import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Theme Provider
import { ThemeProvider } from "./components/theme-provider";

// Components
import LoginForm from "./components/LoginForm";
import Dashboard from "./components/Dashboard";
import PatientManagement from "./components/PatientManagement";
import DentalChart from "./components/DentalChart";
import InvoiceManagement from "./components/InvoiceManagement";
import QuoteManagement from "./components/QuoteManagement";
import PatientDocuments from "./components/PatientDocuments";
import PatientPrescriptions from "./components/PatientPrescriptions";
import PatientOdontogram from "./components/PatientOdontogram";
import InventoryManagement from "./components/InventoryManagement";
import LabManagement from "./components/LabManagement";
import PatientLabOrders from "./components/PatientLabOrders";
import ReportsManagement from "./components/ReportsManagement";
import { ModernSidebar } from "./components/ModernSidebar";
import { ModernTopbar } from "./components/ModernTopbar";

// SaaS Components
import BillingSettings from "./components/BillingSettings";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import SuperAdminClinics from "./components/SuperAdminClinics";
import LicensingGuard from "./components/LicensingGuard";
import SubscriptionExpiredPage from "./components/SubscriptionExpiredPage";
import AppointmentManagement from "./components/AppointmentManagement";
import PaymentRequestPage from "./components/PaymentRequestPage";
import PaymentValidationPage from "./components/PaymentValidationPage";
import LegalPages from "./components/LegalPages";
import PricingSettings from "./components/PricingSettings";
import MessagingManagement from "./components/MessagingManagement";
import SupplierManagement from "./components/SupplierManagement";
import PurchaseManagement from "./components/PurchaseManagement";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Subscription error state (global)
let setGlobalSubscriptionError = null;

// Auth Context
const AuthContext = React.createContext();

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState(null);

  // Setup axios interceptor for 403 errors
  useEffect(() => {
    setGlobalSubscriptionError = setSubscriptionError;
    
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 403) {
          const code = error.response?.data?.code;
          if (['SUBSCRIPTION_EXPIRED', 'TRIAL_EXPIRED', 'NO_ACTIVE_SUBSCRIPTION'].includes(code)) {
            setSubscriptionError(error.response.data);
            return Promise.reject(error);
          }
        }
        return Promise.reject(error);
      }
    );
    
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, {
        username,
        password
      });
      
      const { token, user: userData } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(userData);
      toast.success("Connexion réussie!");
      return { success: true };
    } catch (error) {
      toast.error("Erreur de connexion: " + (error.response?.data?.error || "Erreur inconnue"));
      return { success: false, error: error.response?.data?.error || "Erreur de connexion" };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setSubscriptionError(null);
    toast.success("Déconnexion réussie");
  };

  const clearSubscriptionError = () => {
    setSubscriptionError(null);
  };

  const register = async (userData) => {
    try {
      await axios.post(`${API}/auth/register`, userData);
      toast.success("Inscription réussie! Vous pouvez maintenant vous connecter.");
      return { success: true };
    } catch (error) {
      toast.error("Erreur d'inscription: " + (error.response?.data?.error || "Erreur inconnue"));
      return { success: false, error: error.response?.data?.error || "Erreur d'inscription" };
    }
  };

  const value = {
    user,
    login,
    logout,
    register,
    loading,
    subscriptionError,
    clearSubscriptionError
  };

  // Show subscription expired page if error
  if (subscriptionError) {
    return (
      <AuthContext.Provider value={value}>
        <SubscriptionExpiredPage 
          errorData={subscriptionError}
          onRetry={clearSubscriptionError}
          onLogout={logout}
        />
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

const LoadingSpinner = () => (
  <motion.div 
    className="min-h-screen flex items-center justify-center bg-background"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <div className="flex flex-col items-center space-y-4">
      <motion.div
        className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <motion.p 
        className="text-sm text-muted-foreground"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Chargement...
      </motion.p>
    </div>
  </motion.div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return user ? children : <Navigate to="/login" />;
};

const MainLayout = ({ children }) => {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <ModernSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <ModernTopbar />
        <motion.main 
          className="flex-1 overflow-auto p-4 bg-background"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </motion.main>
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="dental-pm-theme">
      <AuthProvider>
        <div className="App font-sans antialiased">
          <BrowserRouter>
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/login" element={<LoginForm />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <LicensingGuard>
                      <MainLayout>
                        <Dashboard />
                      </MainLayout>
                    </LicensingGuard>
                  </ProtectedRoute>
                } />
                <Route path="/patients" element={
                  <ProtectedRoute>
                    <LicensingGuard>
                      <MainLayout>
                        <PatientManagement />
                      </MainLayout>
                    </LicensingGuard>
                  </ProtectedRoute>
                } />
                <Route path="/patients/:patientId/chart" element={
                  <ProtectedRoute>
                    <LicensingGuard>
                      <MainLayout>
                        <DentalChart />
                      </MainLayout>
                    </LicensingGuard>
                  </ProtectedRoute>
                } />
                <Route path="/patients/:patientId/documents" element={
                  <ProtectedRoute>
                    <LicensingGuard>
                      <MainLayout>
                        <PatientDocuments />
                      </MainLayout>
                    </LicensingGuard>
                  </ProtectedRoute>
                } />
                <Route path="/patients/:patientId/prescriptions" element={
                  <ProtectedRoute>
                    <LicensingGuard>
                      <MainLayout>
                        <PatientPrescriptions />
                      </MainLayout>
                    </LicensingGuard>
                  </ProtectedRoute>
                } />
                <Route path="/patients/:patientId/odontogram" element={
                  <ProtectedRoute>
                    <LicensingGuard>
                      <MainLayout>
                        <PatientOdontogram />
                      </MainLayout>
                    </LicensingGuard>
                  </ProtectedRoute>
                } />
                <Route path="/patients/:patientId/lab-orders" element={
                  <ProtectedRoute>
                    <LicensingGuard>
                      <MainLayout>
                        <PatientLabOrders />
                      </MainLayout>
                    </LicensingGuard>
                  </ProtectedRoute>
                } />
                <Route path="/invoices" element={
                  <ProtectedRoute>
                    <LicensingGuard>
                      <MainLayout>
                        <InvoiceManagement />
                      </MainLayout>
                    </LicensingGuard>
                  </ProtectedRoute>
                } />
                
                <Route path="/quotes" element={
                  <ProtectedRoute>
                    <LicensingGuard>
                      <MainLayout>
                        <QuoteManagement />
                      </MainLayout>
                    </LicensingGuard>
                  </ProtectedRoute>
                } />
                
                {/* SaaS Routes */}
                <Route path="/settings/billing" element={
                  <ProtectedRoute>
                    <LicensingGuard>
                      <MainLayout>
                        <BillingSettings />
                      </MainLayout>
                    </LicensingGuard>
                  </ProtectedRoute>
                } />
                
                {/* Super Admin Routes */}
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <MainLayout>
                      <SuperAdminDashboard />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/admin/clinics" element={
                  <ProtectedRoute>
                    <MainLayout>
                      <SuperAdminClinics />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                <Route path="/admin/payments" element={
                  <ProtectedRoute>
                    <MainLayout>
                      <PaymentValidationPage />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                {/* Payment Request (Clinic) */}
                <Route path="/payment" element={
                  <ProtectedRoute>
                    <MainLayout>
                      <PaymentRequestPage />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                {/* Placeholder routes for new sections */}
                <Route path="/appointments" element={
                  <ProtectedRoute>
                    <LicensingGuard>
                      <MainLayout>
                        <AppointmentManagement />
                      </MainLayout>
                    </LicensingGuard>
                  </ProtectedRoute>
                } />
                <Route path="/inventory" element={
                  <ProtectedRoute>
                    <LicensingGuard>
                      <MainLayout>
                        <InventoryManagement />
                      </MainLayout>
                    </LicensingGuard>
                  </ProtectedRoute>
                } />
                <Route path="/suppliers" element={
                  <ProtectedRoute>
                    <LicensingGuard>
                      <MainLayout>
                        <SupplierManagement />
                      </MainLayout>
                    </LicensingGuard>
                  </ProtectedRoute>
                } />
                <Route path="/lab" element={
                  <ProtectedRoute>
                    <LicensingGuard>
                      <MainLayout>
                        <LabManagement />
                      </MainLayout>
                    </LicensingGuard>
                  </ProtectedRoute>
                } />
                <Route path="/mailing" element={
                  <ProtectedRoute>
                    <LicensingGuard>
                      <MainLayout>
                        <MessagingManagement />
                      </MainLayout>
                    </LicensingGuard>
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <LicensingGuard>
                      <MainLayout>
                        <PricingSettings />
                      </MainLayout>
                    </LicensingGuard>
                  </ProtectedRoute>
                } />
                <Route path="/reports" element={
                  <ProtectedRoute>
                    <LicensingGuard>
                      <MainLayout>
                        <ReportsManagement />
                      </MainLayout>
                    </LicensingGuard>
                  </ProtectedRoute>
                } />
                {/* Legal Pages - Public Access */}
                <Route path="/legal" element={<LegalPages />} />
                <Route path="/legal/cgu" element={<LegalPages />} />
                <Route path="/legal/privacy" element={<LegalPages />} />
                <Route path="/legal/mentions" element={<LegalPages />} />
              </Routes>
            </AnimatePresence>
          </BrowserRouter>
          <Toaster 
            position="top-right" 
            toastOptions={{
              duration: 4000,
              style: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                border: '1px solid hsl(var(--border))',
              },
            }}
          />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;