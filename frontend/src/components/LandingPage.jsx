import React, { useState, useEffect, useRef } from 'react';
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

    /* Animations */
    @keyframes reveal { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    .reveal { animation: reveal 0.8s var(--transition) both; }

    /* Cards & Buttons */
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

/* ── Components (Logique Intégrée) ── */

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
            background: tab === i ? var(--teal) : '#F1F5F9',
            color: tab === i ? '#fff' : var(--slate),
            fontSize: '13px', fontWeight: 600, transition: '0.3s'
          }}>{t}</button>
        ))}
      </div>
      <div style={{ animation: 'reveal 0.5s ease' }}>
         {/* Contenu simplifié pour l'exemple, reprenez vos SVG ici */}
         <div style={{ height: '280px', background: '#F8FAFC', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
            Visualisation {tabs[tab]} en temps réel
         </div>
      </div>
    </div>
  );
};

/* ── Main Page ── */
const LandingPage = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const openRegister = (plan) => {
    setSelectedPlan(plan);
    setShowModal(true);
  };

  return (
    <>
      <GlobalCSS />
      
      {/* Navigation */}
      <nav style={{ padding: '24px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', zIndex: 1000 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 40, height: 40, background: 'var(--teal)', borderRadius: '10px' }} />
          <span style={{ fontWeight: 800, fontSize: '20px', letterSpacing: '-1px' }}>DPM<span style={{ color: 'var(--teal)' }}>.mg</span></span>
        </div>
        <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
          <a href="#features" className="nav-link">Fonctionnalités</a>
          <a href="#tarifs" className="nav-link">Tarifs</a>
          <button onClick={() => openRegister(null)} className="btn-premium" style={{ padding: '10px 20px', fontSize: '14px' }}>Essai Gratuit</button>
        </div>
      </nav>

      {/* Hero Section */}
      <header style={{ padding: '120px 5% 80px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '60px', alignItems: 'center', maxWidth: '1400px', margin: '0 auto' }}>
        <div className="reveal">
          <span className="tag">Propulsé par l'IA — Madagascar 2026</span>
          <h1 style={{ fontSize: '64px', marginTop: '24px', lineHeight: 1.1 }}>
            L'excellence clinique <br/> 
            <span style={{ color: 'var(--teal)' }}>en un clic.</span>
          </h1>
          <p style={{ fontSize: '20px', color: var(--slate), marginTop: '30px', maxWidth: '500px' }}>
            Dental Practice Manager est la solution n°1 à Madagascar pour digitaliser votre cabinet dentaire en toute sécurité.
          </p>
          <div style={{ marginTop: '40px', display: 'flex', gap: '20px' }}>
            <button onClick={() => openRegister(null)} className="btn-premium" style={{ fontSize: '18px' }}>Démarrer l'essai de 7 jours</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: var(--slate), fontSize: '14px' }}>
               <span style={{ color: '#10B981' }}>●</span> Aucune carte requise
            </div>
          </div>
        </div>
        <div className="reveal" style={{ animationDelay: '0.2s' }}>
          <DashMockup />
        </div>
      </header>

      {/* Features Section */}
      <section id="features" style={{ padding: '120px 5%', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h2 style={{ fontSize: '42px' }}>Pensé pour les praticiens exigeants</h2>
          <p style={{ color: var(--slate) }}>Gagnez 2h de gestion administrative par jour.</p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
          {[
            { title: 'Odontogramme FDI', icon: '🦷', desc: 'Saisie graphique ultra-rapide des actes et diagnostics.' },
            { title: 'Agenda Intelligent', icon: '📅', desc: 'Rappels SMS automatiques pour réduire les rendez-vous manqués.' },
            { title: 'Facturation & Devis', icon: '🧾', desc: 'Génération de devis aux normes malgaches en 30 secondes.' },
          ].map((f, i) => (
            <div key={i} className="premium-card">
              <div style={{ fontSize: '40px', marginBottom: '20px' }}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p style={{ color: var(--slate), marginTop: '10px' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="tarifs" style={{ padding: '120px 5%' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontSize: '42px' }}>Des tarifs transparents</h2>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
          {[
            { name: 'PRO', price: '199 000', popular: true, features: ['Patients illimités', 'Rappels SMS', 'Support 24/7'] },
            { name: 'GROUP', price: '299 000', popular: false, features: ['Multi-sites', 'Formation incluse', 'API dédiée'] }
          ].map((p, i) => (
            <div key={i} className="premium-card" style={{ width: '350px', border: p.popular ? '2px solid var(--teal)' : '1px solid var(--border)', position: 'relative' }}>
              {p.popular && <span style={{ position: 'absolute', top: -15, left: '50%', transform: 'translateX(-50%)', background: 'var(--teal)', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>RECOMMANDÉ</span>}
              <h4 style={{ color: var(--slate) }}>Plan {p.name}</h4>
              <div style={{ fontSize: '48px', fontWeight: 800, margin: '20px 0' }}>{p.price} <span style={{ fontSize: '16px', fontWeight: 400 }}>Ar/mois</span></div>
              <ul style={{ listStyle: 'none', marginBottom: '30px' }}>
                {p.features.map((f, j) => <li key={j} style={{ marginBottom: '10px', display: 'flex', gap: '10px' }}>✓ {f}</li>)}
              </ul>
              <button onClick={() => openRegister(p)} className="btn-premium" style={{ width: '100%', justifyContent: 'center' }}>Choisir ce plan</button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Premium (Clair) */}
      <footer style={{ padding: '80px 5% 40px', borderTop: '1px solid var(--border)', background: '#fff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '40px', marginBottom: '60px' }}>
          <div>
            <span style={{ fontWeight: 800, fontSize: '24px' }}>DPM<span style={{ color: 'var(--teal)' }}>.mg</span></span>
            <p style={{ marginTop: '20px', color: var(--slate), maxWidth: '300px' }}>La révolution digitale pour les chirurgiens-dentistes à Madagascar.</p>
          </div>
          <div>
            <h5 style={{ marginBottom: '20px' }}>Produit</h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a href="#" className="nav-link">Fonctionnalités</a>
              <a href="#" className="nav-link">Tarifs</a>
            </div>
          </div>
          <div>
            <h5 style={{ marginBottom: '20px' }}>Contact</h5>
            <p style={{ color: var(--slate) }}>radisonfrancky@gmail.com</p>
            <p style={{ color: var(--slate) }}>Antananarivo, Madagascar</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: '13px', paddingTop: '40px', borderTop: '1px solid var(--border)' }}>
          © 2026 DANIERO GLOBAL LLC. Tous droits réservés.
        </div>
      </footer>
    </>
  );
};

export default LandingPage;

