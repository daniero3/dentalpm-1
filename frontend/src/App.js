import React, { useState, useEffect } from "react";

// ── Service Worker PWA — Cache Busting ───────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then(reg => {
        console.log('[PWA] SW enregistré:', reg.scope);

        // Vérifier les mises à jour toutes les 60 secondes
        setInterval(() => reg.update(), 60 * 1000);

        // Mise à jour détectée
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] Nouvelle version disponible — rechargement...');
              // Forcer la mise à jour immédiate
              worker.postMessage('SKIP_WAITING');
            }
          });
        });

        // Recharger quand le SW prend le contrôle
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[PWA] Nouveau SW actif — rechargement page');
          window.location.reload();
        });

        // Écouter les messages du SW
        navigator.serviceWorker.addEventListener('message', e => {
          if (e.data?.type === 'SW_UPDATED') {
            console.log('[PWA] Cache mis à jour:', e.data.cache);
          }
        });
      })
      .catch(err => console.warn('[PWA] SW non enregistré:', err));
  });
}


import "./App.css";
import "./components/dpm.css";
import "./components/mobile.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Toaster } from "./components/ui/sonner";
import CookieBanner from "./components/CookieBanner";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import { toast } from "sonner";

// Theme Provider
import { ThemeProvider } from "./components/theme-provider";

// Route components are lazy-loaded so the first bundle stays light.
const LoginForm = React.lazy(() => import("./components/LoginForm"));
const LandingPage = React.lazy(() => import("./components/LandingPage"));
const SubscriptionManagement = React.lazy(() => import('./components/SubscriptionManagement'));
const Dashboard = React.lazy(() => import("./components/Dashboard"));
const PatientManagement = React.lazy(() => import("./components/PatientManagement"));
const DentalChart = React.lazy(() => import("./components/DentalChart"));
const InvoiceManagement = React.lazy(() => import("./components/InvoiceManagement"));
const QuoteManagement = React.lazy(() => import("./components/QuoteManagement"));
const PatientDocuments = React.lazy(() => import("./components/PatientDocuments"));
const PatientPrescriptions = React.lazy(() => import("./components/PatientPrescriptions"));
const PatientOdontogram = React.lazy(() => import("./components/PatientOdontogram"));
const InventoryManagement = React.lazy(() => import("./components/InventoryManagement"));
const LabManagement = React.lazy(() => import("./components/LabManagement"));
const PatientLabOrders = React.lazy(() => import("./components/PatientLabOrders"));
const ReportsManagement = React.lazy(() => import("./components/ReportsManagement"));
import { ModernSidebar } from "./components/ModernSidebar";
import { ModernTopbar } from "./components/ModernTopbar";

// SaaS Components
const BillingSettings = React.lazy(() => import("./components/BillingSettings"));
const SuperAdminClinics = React.lazy(() => import("./components/SuperAdminClinics"));
import LicensingGuard from "./components/LicensingGuard";
const SubscriptionExpiredPage = React.lazy(() => import("./components/SubscriptionExpiredPage"));
const AppointmentManagement = React.lazy(() => import("./components/AppointmentManagement"));
const PaymentValidationPage = React.lazy(() => import("./components/PaymentValidationPage"));
const LegalPages = React.lazy(() => import("./components/LegalPages"));
const PricingSettings = React.lazy(() => import("./components/PricingSettings"));
const CabinetSettings = React.lazy(() => import("./components/CabinetSettings"));
const DentalMailingSuite = React.lazy(() => import("./components/DentalMailingSuite"));
const SupplierManagement = React.lazy(() => import("./components/SupplierManagement"));
const PurchaseManagement = React.lazy(() => import("./components/PurchaseManagement"));
const OnboardingWizard = React.lazy(() => import("./components/OnboardingWizard"));
const RegisterPage = React.lazy(() => import("./components/RegisterPage"));
const AdminPartners = React.lazy(() => import("./components/AdminPartners"));

const prefetchCoreRoutes = () => {
  const run = () => {
    import("./components/PatientManagement");
    import("./components/AppointmentManagement");
    import("./components/InvoiceManagement");
    import("./components/ReportsManagement");
  };
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 5000 });
  } else {
    window.setTimeout(run, 1800);
  }
};

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL
  ? `${BACKEND_URL}/api`
  : typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8001/api'
    : '/api';

const normalizePlan = (value) => {
  const raw = typeof value === 'string'
    ? value
    : value?.plan || value?.current_plan || value?.name || null;
  const plan = raw ? String(raw).toUpperCase() : null;
  return ['ESSENTIAL', 'PRO', 'GROUP'].includes(plan) ? plan : null;
};

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
let authExpiryHandled = false;

const clearStoredSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('dpm_plan');
  localStorage.removeItem('dpm_user_plan');
  delete axios.defaults.headers.common['Authorization'];
};

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
        if (error.response?.status === 401) {
          const code = error.response?.data?.code;
          if (['TOKEN_EXPIRED', 'INVALID_TOKEN', 'MISSING_TOKEN', 'AUTH_REQUIRED'].includes(code) && !authExpiryHandled) {
            authExpiryHandled = true;
            clearStoredSession();
            setUser(null);
            toast.error('Session expirée. Reconnectez-vous pour continuer.');
            window.setTimeout(() => {
              authExpiryHandled = false;
              if (window.location.pathname !== '/login') window.location.assign('/login');
            }, 250);
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
      // Stocker le plan depuis la réponse de login (immédiat, pas de fetch supplémentaire)
      const planFromLogin = normalizePlan(response.data.plan || userData.plan || userData.current_plan);
      if (planFromLogin) {
        localStorage.setItem('dpm_plan', JSON.stringify(planFromLogin));
        localStorage.setItem('dpm_user_plan', JSON.stringify(planFromLogin));
      } else {
        localStorage.removeItem('dpm_plan');
        localStorage.removeItem('dpm_user_plan');
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(userData);
      authExpiryHandled = false;
      prefetchCoreRoutes();
      toast.success("Connexion réussie!");
      return { success: true };
    } catch (error) {
      toast.error("Erreur de connexion: " + (error.response?.data?.error || "Erreur inconnue"));
      return { success: false, error: error.response?.data?.error || "Erreur de connexion" };
    }
  };

  const logout = () => {
    clearStoredSession();
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

const OfflineBanner = () => {
  const [online, setOnline] = React.useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);

  React.useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  if (online) return null;

  return (
    <div style={{
      position:'fixed',
      left:12,
      right:12,
      bottom:12,
      zIndex:9999,
      padding:'10px 14px',
      borderRadius:12,
      background:'#7F1D1D',
      color:'#fff',
      boxShadow:'0 12px 32px rgba(15,23,42,.22)',
      fontSize:13,
      fontWeight:700,
      textAlign:'center'
    }}>
      Connexion interrompue. Les nouvelles sauvegardes ne seront pas envoyées tant que le réseau n'est pas revenu.
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
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(isTablet);
  React.useEffect(() => {
    if (isMobile) return;
    setSidebarCollapsed(isTablet);
  }, [isMobile, isTablet]);
  const sidebarW  = isMobile ? 0 : (sidebarCollapsed ? 72 : 264);
  const padding   = isMobile ? '10px 10px 80px' : '20px 24px 64px';

  return (
    <div className="dpm-layout" style={{ display:'flex', height:'100vh', background:'var(--bg)', overflow:'hidden', position:'relative' }}>
      <ModernSidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      <div style={{
        display:'flex', flexDirection:'column', flex:1,
        overflow:'hidden', minWidth:0,
        marginLeft: sidebarW,
        transition:'margin-left 0.25s cubic-bezier(0.4,0,0.2,1)',
        maxWidth: isMobile ? '100vw' : `calc(100vw - ${sidebarW}px)`,
      }}>
        <ModernTopbar />
        <main className="dpm-main" style={{
          flex:1, overflowY:'auto', overflowX:'hidden',
          padding: padding,
          background:'var(--bg)',
          WebkitOverflowScrolling:'touch',
        }}>
          <div className="dpm-content-shell" style={{ maxWidth:1280, margin:'0 auto', width:'100%' }}>
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
    <React.Suspense fallback={
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#F5F7FA' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:48, height:48, border:'3px solid #E2E8F0', borderTopColor:'#0D7A87', borderRadius:'50%', animation:'spin .8s linear infinite', margin:'0 auto 16px' }}/>
          <p style={{ color:'#64748B', fontSize:14 }}>Chargement DentalPM...</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    }>
      <ThemeProvider defaultTheme="light" storageKey="dental-pm-theme">
        <AuthProvider>
          <div className="App">
            <BrowserRouter>
              <Routes>
                <Route path="/landing" element={<LandingRedirect />} />
                <Route path="/super-admin" element={<Navigate to="/subscription" replace />} />
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
                <Route path="/mailing" element={<ProtectedRoute><LicensingGuard><MainLayout><DentalMailingSuite /></MainLayout></LicensingGuard></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><LicensingGuard><MainLayout><CabinetSettings /></MainLayout></LicensingGuard></ProtectedRoute>} />
                <Route path="/settings/pricing" element={<ProtectedRoute><LicensingGuard><MainLayout><PricingSettings /></MainLayout></LicensingGuard></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><LicensingGuard><MainLayout><ReportsManagement /></MainLayout></LicensingGuard></ProtectedRoute>} />
                <Route path="/settings/billing" element={<ProtectedRoute><LicensingGuard><MainLayout><BillingSettings /></MainLayout></LicensingGuard></ProtectedRoute>} />
                <Route path="/admin" element={<Navigate to="/subscription" replace />} />
                <Route path="/admin/clinics" element={<AdminRoute><MainLayout><SuperAdminClinics /></MainLayout></AdminRoute>} />
                <Route path="/admin/payments" element={<AdminRoute><MainLayout><PaymentValidationPage /></MainLayout></AdminRoute>} />
                <Route path="/admin/partners" element={<AdminRoute><MainLayout><AdminPartners /></MainLayout></AdminRoute>} />
                <Route path="/payment" element={<Navigate to="/subscription" replace />} />
                <Route path="/billing/payment" element={<Navigate to="/subscription" replace />} />
                <Route path="/legal" element={<LegalPages />} />
                <Route path="/legal/cgu" element={<LegalPages />} />
                <Route path="/legal/cgv" element={<LegalPages />} />
                <Route path="/legal/privacy" element={<LegalPages />} />
                <Route path="/legal/mentions" element={<LegalPages />} />
                <Route path="/legal/cookies" element={<LegalPages />} />
                <Route path="/onboarding" element={<ProtectedRoute><OnboardingWizard /></ProtectedRoute>} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/billing/renew" element={<Navigate to="/subscription" replace />} />
                <Route path="/subscription" element={<ProtectedRoute><MainLayout><SubscriptionManagement /></MainLayout></ProtectedRoute>} />
              </Routes>
              <CookieBanner />
              <PWAInstallPrompt />
              <OfflineBanner />
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
    </React.Suspense>
  );
}

export default App;
