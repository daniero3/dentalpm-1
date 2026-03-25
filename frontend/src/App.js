import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

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
const API = BACKEND_URL + "/api";

const AuthContext = React.createContext();

export const useAuth = function() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const AuthProvider = function({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionError, setSubscriptionError] = useState(null);

  useEffect(function() {
    const interceptor = axios.interceptors.response.use(
      function(response) { return response; },
      function(error) {
        if (error.response && error.response.status === 403) {
          const code = error.response.data && error.response.data.code;
          if (['SUBSCRIPTION_EXPIRED', 'TRIAL_EXPIRED', 'NO_ACTIVE_SUBSCRIPTION'].includes(code)) {
            setSubscriptionError(error.response.data);
            return Promise.reject(error);
          }
        }
        return Promise.reject(error);
      }
    );
    return function() { axios.interceptors.response.eject(interceptor); };
  }, []);

  useEffect(function() {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
        axios.defaults.headers.common['Authorization'] = 'Bearer ' + token;
      } catch(e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async function(username, password) {
    try {
      const response = await axios.post(API + '/auth/login', { username, password });
      const token = response.data.token;
      const userData = response.data.user;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      axios.defaults.headers.common['Authorization'] = 'Bearer ' + token;
      setUser(userData);
      toast.success("Connexion réussie!");
      return { success: true };
    } catch (error) {
      const msg = (error.response && error.response.data && error.response.data.error) || "Erreur inconnue";
      toast.error("Erreur de connexion: " + msg);
      return { success: false, error: msg };
    }
  };

  const logout = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setSubscriptionError(null);
    toast.success("Déconnexion réussie");
  };

  const clearSubscriptionError = function() { setSubscriptionError(null); };

  const register = async function(userData) {
    try {
      await axios.post(API + '/auth/register', userData);
      toast.success("Inscription réussie! Vous pouvez maintenant vous connecter.");
      return { success: true };
    } catch (error) {
      const msg = (error.response && error.response.data && error.response.data.error) || "Erreur inconnue";
      toast.error("Erreur d'inscription: " + msg);
      return { success: false, error: msg };
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

  return React.createElement(AuthContext.Provider, { value }, children);
};

const LoadingSpinner = function() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20,
      background: '#F0F4F8'
    }}>
      <div style={{
        width: 44, height: 44,
        border: '3px solid #E2E8F0',
        borderTopColor: '#0D7A87',
        borderRadius: '50%',
        animation: 'spin 0.75s linear infinite'
      }} />
      <p style={{ color: '#94A3B8', fontSize: 14, fontFamily: 'sans-serif' }}>
        Chargement...
      </p>
    </div>
  );
};

const ProtectedRoute = function({ children }) {
  const { user, loading } = useAuth();
  if (loading) return React.createElement(LoadingSpinner);
  return user ? children : React.createElement(Navigate, { to: "/login" });
};

const PageWrapper = function({ children }) {
  const location = useLocation();
  const [key, setKey] = useState(location.pathname);
  useEffect(function() { setKey(location.pathname); }, [location.pathname]);
  return (
    <div key={key} style={{ animation: 'fadeUp 0.35s ease both', width: '100%' }}>
      {children}
    </div>
  );
};

const MainLayout = function({ children }) {
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F0F4F8', overflow: 'hidden' }}>
      <ModernSidebar />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <ModernTopbar />
        <main style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#F0F4F8' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 64 }}>
            <PageWrapper>{children}</PageWrapper>
          </div>
        </main>
        <footer style={{
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid #E2E8F0',
          padding: '10px 24px',
          textAlign: 'center',
          fontSize: 12,
          color: '#94A3B8',
        }}>
          © {new Date().getFullYear()} Daniero Global LLC — DentalPM Madagascar
        </footer>
      </div>
    </div>
  );
};

function App() {
  return (
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
            },
          }}
        />
      </div>
    </AuthProvider>
  );
}

export default App;
