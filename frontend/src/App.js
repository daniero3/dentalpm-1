import React, { useState, useEffect } from "react";
import "./App.css";
import "./components/dpm.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

// Theme Provider
import { ThemeProvider } from "./components/theme-provider";

// Components
import LoginForm from "./components/LoginForm";
import LandingPage from "./components/LandingPage";
import SubscriptionManagement from './components/SubscriptionManagement';
import SuperAdminDashboard from "./components/SuperAdminDashboard";
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
import RegisterPage from "./components/RegisterPage";
import AdminPartners from "./components/AdminPartners";
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
      // Stocker le plan immédiatement après login pour la sidebar
      if (userData.role !== 'SUPER_ADMIN') {
        const BURL = process.env.REACT_APP_BACKEND_URL || 'https://dentalpm-1-production.up.railway.app';
        fetch(`${BURL}/api/billing/status`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (d?.plan) localStorage.setItem('dpm_user_plan', JSON.stringify(d.plan));
            else if (d?.status === 'TRIAL') localStorage.setItem('dpm_user_plan', JSON.stringify('PRO'));
          }).catch(() => {});
      }
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
    localStorage.removeItem('dpm_user_plan'); // vider le plan en cache
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

// Si déjà connecté et va sur /landing → rediriger vers dashboard
const LandingRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  return user ? <Navigate to="/" /> : <LandingPage />;
};

// Si déjà connecté et va sur /login → rediriger vers dashboard
const LoginRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  return user ? <Navigate to="/" /> : <LoginForm />;
};

// Pages médicales — SUPER_ADMIN redirigé vers son dashboard
const MEDICAL_PATHS = ['/', '/patients', '/appointments', '/invoices', '/quotes',
  '/reports', '/inventory', '/purchases', '/suppliers', '/lab', '/mailing', '/settings'];

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/landing" />;
  // SUPER_ADMIN ne peut pas accéder aux pages médicales des cabinets
  if (user.role === 'SUPER_ADMIN' && MEDICAL_PATHS.some(p => location.pathname === p || location.pathname.startsWith(p + '/'))) {
    return <Navigate to="/subscription" replace />;
  }
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/landing" />;
  if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) return <Navigate to="/" />;
  return children;
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
  const padding   = isMobile ? '10px 10px 80px' : '20px 24px 64px';

  return (
    <div style={{ display:'flex', height:'100vh', background:'var(--bg)', overflow:'hidden', position:'relative' }}>
      <ModernSidebar />
      <div style={{
        display:'flex', flexDirection:'column', flex:1,
        overflow:'hidden', minWidth:0,
        marginLeft: sidebarW,
        transition:'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)',
        maxWidth: isMobile ? '100vw' : `calc(100vw - ${sidebarW}px)`,
      }}>
        <ModernTopbar />
        <main style={{
          flex:1, overflowY:'auto', overflowX:'hidden',
          padding: padding,
          background:'var(--bg)',
          WebkitOverflowScrolling:'touch',
        }}>
          <div style={{ maxWidth:1280, margin:'0 auto', width:'100%' }}>
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
        {!isMobile && (
          <footer style={{ background:'rgba(255,255,255,0.9)', backdropFilter:'blur(12px)', borderTop:'1px solid var(--border)', padding:'10px 24px', textAlign:'center', fontSize:11, color:'var(--text-muted)', fontFamily:'DM Sans,sans-serif' }}>
            © {new Date().getFullYear()} Daniero Global LLC — DentalPM Madagascar
          </footer>
        )}
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
              <Route path="/landing" element={<LandingRedirect />} />
              <Route path="/super-admin" element={<ProtectedRoute><SuperAdminDashboard /></ProtectedRoute>} />
              <Route path="/login" element={<LoginRedirect />} />
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
              <Route path="/admin" element={<AdminRoute><MainLayout><SuperAdminDashboard /></MainLayout></AdminRoute>} />
              <Route path="/admin/clinics" element={<AdminRoute><MainLayout><SuperAdminClinics /></MainLayout></AdminRoute>} />
              <Route path="/admin/payments" element={<AdminRoute><MainLayout><PaymentValidationPage /></MainLayout></AdminRoute>} />
              <Route path="/admin/partners" element={<AdminRoute><MainLayout><AdminPartners /></MainLayout></AdminRoute>} />
              <Route path="/payment" element={<ProtectedRoute><MainLayout><PaymentRequestPage /></MainLayout></ProtectedRoute>} />
              <Route path="/billing/payment" element={<ProtectedRoute><MainLayout><PaymentRequestPage /></MainLayout></ProtectedRoute>} />
              <Route path="/legal" element={<LegalPages />} />
              <Route path="/legal/cgu" element={<LegalPages />} />
              <Route path="/legal/privacy" element={<LegalPages />} />
              <Route path="/legal/mentions" element={<LegalPages />} />
              <Route path="/onboarding" element={<ProtectedRoute><OnboardingWizard /></ProtectedRoute>} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/billing/renew" element={<ProtectedRoute><MainLayout><BillingRenew /></MainLayout></ProtectedRoute>} />
              <Route path="/subscription" element={<ProtectedRoute><MainLayout><SubscriptionManagement /></MainLayout></ProtectedRoute>} />
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

