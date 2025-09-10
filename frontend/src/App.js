// src/App.js
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import PatientManagement from './components/PatientManagement';
import DentalChart from './components/DentalChart';
import InvoiceManagement from './components/InvoiceManagement';
import Sidebar from './components/Sidebar';

export default function App() {
  return (
    <div style={{display: 'flex'}}>
      <Sidebar />
      <main style={{padding: 16, flex: 1}}>
        <LoginForm />
        <Dashboard />
        <PatientManagement />
        <DentalChart />
        <InvoiceManagement />
      </main>
    </div>
  );
}