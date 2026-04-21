import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://dentalpm-1-production.up.railway.app/api';

/* ── CSS Global Premium ── */
const GlobalCSS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700;12..96,800&display=swap');
    
    :root {
      --teal: #0D7A87;
      --teal-light: #F0FDFE;
      --ink: #0F172A;
      --slate: #475569;
      --border: rgba(0, 0, 0, 0.06);
      --sh-premium: 0 20px 50px -12px rgba(0, 0, 0, 0.08);
      --transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Inter', sans-serif; 
      background: #ffffff; 
      color: var(--ink); 
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    h1, h2, h3 { 
      font-family: 'Bricolage Grotesque', sans-serif; 
      letter-spacing: -0.03em; 
    }

    @keyframes reveal { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    .reveal { animation: reveal 0.8s var(--transition) both; }

    .premium-card {
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 40px;
      transition: var(--transition);
    }
    .premium-card:hover {
      transform: translateY(-10px);
      box-shadow: var(--sh-premium);
      border-color: var(--teal);
    }

    .btn-premium {
      background: var(--teal);
      color: white;
      padding: 16px 32px;
      border-radius: 14px;
      font-weight: 600;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: var(--transition);
      border: none;
      cursor: pointer;
    }
    .btn-premium:hover {
      transform: scale(1.02);
      filter: brightness(1.1);
      box-shadow: 0 10px 25px rgba(13, 122, 135, 0.3);
    }

    .nav-link {
      text-decoration: none;
      color: var(--slate);
      font-weight: 500;
      font-size: 15px;
      transition: var(--transition);
    }
    .nav-link:hover { color: var(--teal); }

    .tag {
      background: var(--teal-light);
      color: var(--teal);
      padding: 6px 16px;
      border-radius: 99px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  `}</style>
);

const DashMockup = () => {
  const [tab, setTab] = useState(0);
  const tabs = ['Dashboard', 'Patients', 'Agenda'];
  
  return (
    <div style={{
      background: '#fff', 
      borderRadius: '24px', 
      padding: '24px', 
      boxShadow: 'var(--sh-premium)', 
      border: '1px solid var(--border)',
      height: '400px'
    }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            background: tab === i ? '#0D7A87' : '#F1F5F9',
            color: tab === i ? '#fff' : '#475569',
            fontSize: '13px', fontWeight: 600, transition: '0.3s'
          }}>{t}</button>
        ))}
      </div>
      <div style={{ animation: 'reveal 0.5s ease' }}>
         <div style={{ height: '280px', background: '#F8FAFC', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
            Visualisation {tabs[tab]} en temps réel
         </div>
      </div>
    </div>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const openRegister = () => {
    setShowModal(true);
  };

  return (
    <>
      <GlobalCSS />
      
      <nav style={{ padding: '24px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', zIndex: 1000 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 40, height: 40, background: '#0D7A87', borderRadius: '10px' }} />
          <span style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '-1px' }}>DPM<span style={{ color: '#0D7A87' }}>.mg</span></span>
        </div>
        <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
          <a href="#features" className="nav-link">Fonctionnalités</a>
          <a href="#tarifs" className="nav-link">Tarifs</a>
          <button onClick={openRegister} className="btn-premium" style={{ padding: '10px 20px', fontSize: '14px' }}>Essai Gratuit</button>
        </div>
      </nav>

      <header style={{ padding: '120px 5% 80px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '60px', alignItems: 'center', maxWidth: '1400px', margin: '0 auto' }}>
        <div className="reveal">
          <span className="tag">Propulsé par l'IA — Madagascar 2026</span>
          <h1 style={{ fontSize: '64px', marginTop: '24px', lineHeight: 1.1 }}>
            L'excellence clinique <br/> 
            <span style={{ color: '#0D7A87' }}>en un clic.</span>
          </h1>
          <p style={{ fontSize: '20px', color: '#475569', marginTop: '30px', maxWidth: '500px' }}>
            Dental Practice Manager est la solution n°1 à Madagascar pour digitaliser votre cabinet dentaire.
          </p>
          <div style={{ marginTop: '40px', display: 'flex', gap: '20px' }}>
            <button onClick={openRegister} className="btn-premium" style={{ fontSize: '18px' }}>Démarrer l'essai de 7 jours</button>
          </div>
        </div>
        <div className="reveal" style={{ animationDelay: '0.2s' }}>
          <DashMockup />
        </div>
      </header>

      <section id="features" style={{ padding: '120px 5%', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h2 style={{ fontSize: '42px' }}>Pensé pour les praticiens exigeants</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
          {[
            { title: 'Odontogramme FDI', icon: '🦷', desc: 'Saisie graphique ultra-rapide des actes.' },
            { title: 'Agenda Intelligent', icon: '📅', desc: 'Rappels SMS automatiques inclus.' },
            { title: 'Facturation & Devis', icon: '🧾', desc: 'Génération aux normes malgaches.' },
          ].map((f, i) => (
            <div key={i} className="premium-card">
              <div style={{ fontSize: '40px', marginBottom: '20px' }}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p style={{ color: '#475569', marginTop: '10px' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ padding: '80px 5% 40px', borderTop: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
        <div style={{ color: '#94A3B8', fontSize: '13px' }}>
          © 2026 DANIERO GLOBAL LLC. Tous droits réservés.
        </div>
      </footer>
    </>
  );
};

export default LandingPage;
