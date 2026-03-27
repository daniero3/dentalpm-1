import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

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
import OnboardingWizard from "./components/OnboardingWizard";
import BillingRenew from "./components/BillingRenew";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ══════════════════════════════════════════════════════════════
// PROTECTION GLOBALE AXIOS
// Bloque TOUS les appels contenant /undefined ou /null dans l'URL
// Couvre tous les composants sans exception
// ══════════════════════════════════════════════════════════════
axios.interceptors.request.use(
  (config) => {
    if (config.url && (
      config.url.includes('/undefined') ||
      config.url.includes('/null')
    )) {
      console.warn('🚫 Requête bloquée - ID invalide dans URL:', config.url);
      return Promise.reject(new axios.Cancel('ID invalide - requête annulée'));
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Token automatique sur toutes les requêtes
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let setGlobalSubscriptionError = null;

// Auth Context
const AuthContext = React.createContext();

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState(null);

  useEffect(() => {
    setGlobalSubscriptionError = setSubscriptionError;
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        // Ignorer les erreurs d'annulation (Cancel)
        if (axios.isCancel(error)) return Promise.reject(error);
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
      const response = await axios.post(`${API}/auth/login`, { username, password });
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

  const clearSubscriptionError = () => setSubscriptionError(null);

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

  const value = { user, login, logout, register, loading, subscriptionError, clearSubscriptionError };

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ── Loading Spinner ────────────────────────────────────────────────────────
const LoadingSpinner = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    background: 'var(--bg)',
    animation: 'fadeIn 0.3s ease both'
  }}>
    <div style={{
      width: 48, height: 48,
      border: '3px solid var(--border)',
      borderTopColor: 'var(--primary)',
      borderRadius: '50%',
      animation: 'spin 0.75s linear infinite'
    }} />
    <div className="loading-dots" style={{ display: 'flex', gap: 6 }}>
      <span /><span /><span />
    </div>
    <p style={{ color: 'var(--text-muted)', fontSize: 14, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      Chargement...
    </p>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  return user ? children : <Navigate to="/login" />;
};

// ── Page Transition ────────────────────────────────────────────────────────
const PageTransition = ({ children }) => {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionKey, setTransitionKey] = useState(location.pathname);

  useEffect(() => {
    setTransitionKey(location.pathname);
    setDisplayChildren(children);
  }, [location.pathname, children]);

  return (
    <div key={transitionKey} className="page-enter" style={{ width: '100%', height: '100%' }}>
      {displayChildren}
    </div>
  );
};

// ── Main Layout — Responsive ────────────────────────────────────────────
const useLayoutWidth = () => {
  const [w, setW] = React.useState(window.innerWidth);
  React.useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
};

const MainLayout = ({ children }) => {
  const w = useLayoutWidth();
  const isMobile  = w < 768;
  const isTablet  = w >= 768 && w < 1024;
  const sidebarW  = isMobile ? 0 : (isTablet ? 72 : 264);
  const padding   = isMobile ? '12px' : '24px';

  return (
    <div style={{ display:'flex', height:'100vh', background:'var(--bg)', overflow:'hidden' }}>
      <ModernSidebar />
      <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden', marginLeft:sidebarW, transition:'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)', minWidth:0 }}>
        <ModernTopbar />
        <main style={{ flex:1, overflowY:'auto', padding:padding, background:'var(--bg)' }}>
          <div style={{ maxWidth:1280, margin:'0 auto', paddingBottom:64 }}>
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
        <footer style={{ background:'rgba(255,255,255,0.9)', backdropFilter:'blur(12px)', borderTop:'1px solid var(--border)', padding:'12px 24px', textAlign:'center', fontSize:12, color:'var(--text-muted)', fontFamily:'DM Sans,sans-serif', letterSpacing:'0.01em' }}>
          © {new Date().getFullYear()} Daniero Global LLC — DentalPM Madagascar
        </footer>
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="dental-pm-theme">
      <AuthProvider>
        <div className="App">
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginForm />} />
              <Route path="/" element={<ProtectedRoute><LicensingGuard><MainLayout><Dashboard /></MainLayout></LicensingGuard></ProtectedRoute>} />
              <Route path="/patients" element={<ProtectedRoute><LicensingGuard><MainLayout><PatientManagement /></MainLayout></LicensingGuard></ProtectedRoute>} />
              <Route path="/patients/:patientId/chart" element={<ProtectedRoute><LicensingGuard><MainLayout><DentalChart /></MainLayout></LicensingGuard></ProtectedRoute>} />
              <Route path="/patients/:patientId/documents" element={<ProtectedRoute><LicensingGuard><MainLayout><PatientDocuments /></MainLayout></LicensingGuard></ProtectedRoute>} />
              <Route path="/patients/:patientId/prescriptions" element={<ProtectedRoute><LicensingGuard><MainLayout><PatientPrescriptions /></MainLayout></LicensingGuard></ProtectedRoute>} />
              <Route path="/patients/:patientId/odontogram" element={<ProtectedRoute><LicensingGuard><MainLayout><PatientOdontogram /></MainLayout></LicensingGuard></ProtectedRoute>} />
              <Route path="/patients/:patientId/lab-orders" element={<ProtectedRoute><LicensingGuard><MainLayout><PatientLabOrders /></MainLayout></LicensingGuard></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute><LicensingGuard><MainLayout><InvoiceManagement /></MainLayout></LicensingGuard></ProtectedRoute>} />
              <Route path="/quotes" element={<ProtectedRoute><LicensingGuard><MainLayout><QuoteManagement /></MainLayout></LicensingGuard></ProtectedRoute>} />
              <Route path="/appointments" element={<ProtectedRoute><LicensingGuard><MainLayout><AppointmentManagement /></MainLayout></LicensingGuard></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><LicensingGuard><MainLayout><InventoryManagement /></MainLayout></LicensingGuard></ProtectedRoute>} />
              <Route path="/suppliers" element={<ProtectedRoute><LicensingGuard><MainLayout><SupplierManagement /></MainLayout></LicensingGuard></ProtectedRoute>} />
              <Route path="/purchases" element={<ProtectedRoute><LicensingGuard><MainLayout><PurchaseManagement /></MainLayout></LicensingGuard></ProtectedRoute>} />
              <Route path="/lab" element={<ProtectedRoute><LicensingGuard><MainLayout><LabManagement /></MainLayout></LicensingGuard></ProtectedRoute>} />
              <Route path="/mailing" element={<ProtectedRoute><LicensingGuard><MainLayout><MessagingManagement /></MainLayout></LicensingGuard></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><LicensingGuard><MainLayout><PricingSettings /></MainLayout></LicensingGuard></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><LicensingGuard><MainLayout><ReportsManagement /></MainLayout></LicensingGuard></ProtectedRoute>} />
              <Route path="/settings/billing" element={<ProtectedRoute><LicensingGuard><MainLayout><BillingSettings /></MainLayout></LicensingGuard></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><MainLayout><SuperAdminDashboard /></MainLayout></ProtectedRoute>} />
              <Route path="/admin/clinics" element={<ProtectedRoute><MainLayout><SuperAdminClinics /></MainLayout></ProtectedRoute>} />
              <Route path="/admin/payments" element={<ProtectedRoute><MainLayout><PaymentValidationPage /></MainLayout></ProtectedRoute>} />
              <Route path="/payment" element={<ProtectedRoute><MainLayout><PaymentRequestPage /></MainLayout></ProtectedRoute>} />
              <Route path="/billing/payment" element={<ProtectedRoute><MainLayout><PaymentRequestPage /></MainLayout></ProtectedRoute>} />
              <Route path="/legal" element={<LegalPages />} />
              <Route path="/legal/cgu" element={<LegalPages />} />
              <Route path="/legal/privacy" element={<LegalPages />} />
              <Route path="/legal/mentions" element={<LegalPages />} />
              <Route path="/onboarding" element={<ProtectedRoute><OnboardingWizard /></ProtectedRoute>} />
              <Route path="/billing/renew" element={<ProtectedRoute><MainLayout><BillingRenew /></MainLayout></ProtectedRoute>} />
            </Routes>
          </BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#0F172A',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                boxShadow: '0 8px 32px rgba(15,23,42,0.12)',
                fontFamily: 'DM Sans, sans-serif',
              },
            }}
          />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
