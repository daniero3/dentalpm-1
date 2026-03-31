import React, { useState, useEffect } from 'react';

const PLANS = [
  {
    name: 'ESSENTIAL',
    price: '150 000',
    period: 'Ar/mois',
    color: '#0D7A87',
    popular: false,
    features: [
      '1 praticien', 'Jusqu\'à 500 patients', 'Gestion RDV',
      'Facturation de base', 'Ordonnances', 'Odontogramme',
      'Support email'
    ]
  },
  {
    name: 'PRO',
    price: '300 000',
    period: 'Ar/mois',
    color: '#0D7A87',
    popular: true,
    features: [
      '5 praticiens', 'Patients illimités', 'Gestion RDV avancée',
      'Facturation complète', 'Laboratoire dentaire', 'Inventaire & Stock',
      'Rapports financiers', 'Messagerie SMS', 'Support prioritaire'
    ]
  },
  {
    name: 'GROUP',
    price: '500 000',
    period: 'Ar/mois',
    color: '#0D7A87',
    popular: false,
    features: [
      'Praticiens illimités', 'Multi-sites', 'Patients illimités',
      'Toutes les fonctions PRO', 'API dédiée', 'Tableau de bord groupe',
      'Gestionnaire de compte dédié', 'Formation incluse'
    ]
  }
];

const PAYMENT_METHODS = [
  { name: 'MVola', color: '#E30613', logo: '📱' },
  { name: 'Orange Money', color: '#FF6600', logo: '📱' },
  { name: 'Airtel Money', color: '#E4002B', logo: '📱' },
  { name: 'Virement bancaire', color: '#1A3A5C', logo: '🏦' },
];

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('monthly');
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [form, setForm] = useState({ cabinet: '', email: '', phone: '', city: '', dentists: '1' });
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setShowModal(true);
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#F8FAFC', minHeight: '100vh' }}>
      
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* ── NAV ── */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#0D7A87,#13A3B4)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 100 100" fill="none">
              <path d="M50 8C35 8,20 18,18 32C16 44,20 52,22 58C25 68,28 80,32 88C34 93,38 95,42 92C45 89,46 82,48 74C49 70,50 68,50 68C50 68,51 70,52 74C54 82,55 89,58 92C62 95,66 93,68 88C72 80,75 68,78 58C80 52,84 44,82 32C80 18,65 8,50 8Z" fill="white" opacity="0.95"/>
              <rect x="44" y="30" width="12" height="36" rx="5" fill="#0D7A87" opacity="0.85"/>
              <rect x="30" y="44" width="40" height="12" rx="5" fill="#0D7A87" opacity="0.85"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 20, color: '#0F172A' }}>DPM</span>
          <span style={{ fontSize: 11, color: '#64748B', background: '#F1F5F9', padding: '2px 8px', borderRadius: 99 }}>Madagascar</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="https://gracious-serenity-production-e854.up.railway.app" style={{ padding: '8px 16px', borderRadius: 10, border: '1.5px solid #E2E8F0', background: '#fff', color: '#0F172A', fontWeight: 600, fontSize: 14, textDecoration: 'none', cursor: 'pointer' }}>Se connecter</a>
          <button onClick={() => handleSelectPlan(PLANS[1])} style={{ padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#0D7A87,#13A3B4)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(13,122,135,0.3)' }}>Essai gratuit 30 jours</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ background: 'linear-gradient(135deg,#0D7A87 0%,#0A5F6A 50%,#083D44 100%)', padding: '80px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.05) 0%, transparent 50%)' }} />
        <div style={{ position: 'relative', maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.15)', borderRadius: 99, padding: '6px 16px', fontSize: 13, color: '#fff', fontWeight: 600, marginBottom: 20 }}>
            🇲🇬 Fait pour Madagascar
          </div>
          <h1 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 48, color: '#fff', lineHeight: 1.2, margin: '0 0 20px' }}>
            Logiciel de gestion de<br />
            <span style={{ color: '#7DD3DA' }}>cabinet dentaire</span> à Madagascar
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)', marginBottom: 36, lineHeight: 1.6 }}>
            Gérez vos patients, rendez-vous, factures et laboratoire en un seul endroit.<br />
            Conçu pour les cabinets dentaires malgaches.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => handleSelectPlan(PLANS[1])} style={{ padding: '14px 28px', borderRadius: 12, background: '#fff', color: '#0D7A87', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
              Commencer gratuitement — 30 jours
            </button>
            <a href="#plans" style={{ padding: '14px 28px', borderRadius: 12, background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 700, fontSize: 16, border: '2px solid rgba(255,255,255,0.3)', textDecoration: 'none', display: 'inline-block' }}>
              Voir les tarifs
            </a>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '64px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 32, color: '#0F172A', textAlign: 'center', marginBottom: 8 }}>Tout ce dont vous avez besoin</h2>
        <p style={{ color: '#64748B', textAlign: 'center', marginBottom: 48, fontSize: 16 }}>Une plateforme complète pour votre cabinet dentaire</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {[
            { icon: '🦷', title: 'Odontogramme', desc: 'Schéma dentaire FDI interactif pour chaque patient' },
            { icon: '📅', title: 'Rendez-vous', desc: 'Calendrier intelligent avec rappels SMS automatiques' },
            { icon: '🧾', title: 'Facturation', desc: 'Devis et factures avec paiement MVola/Orange Money' },
            { icon: '💊', title: 'Ordonnances', desc: 'Génération d\'ordonnances PDF professionnelles' },
            { icon: '🔬', title: 'Laboratoire', desc: 'Gestion des commandes et livraisons laboratoire' },
            { icon: '📦', title: 'Inventaire', desc: 'Stock de matériel dentaire avec alertes rupture' },
            { icon: '📊', title: 'Rapports', desc: 'Statistiques financières et activité du cabinet' },
            { icon: '💬', title: 'Messagerie SMS', desc: 'Rappels automatiques d\'anniversaire et rendez-vous' },
          ].map((f, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 17, color: '#0F172A', margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ color: '#64748B', fontSize: 14, margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PLANS ── */}
      <section id="plans" style={{ background: '#F1F5F9', padding: '64px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 32, color: '#0F172A', textAlign: 'center', marginBottom: 8 }}>Tarifs simples et transparents</h2>
          <p style={{ color: '#64748B', textAlign: 'center', marginBottom: 12, fontSize: 16 }}>30 jours d'essai gratuit — aucune carte bancaire requise</p>
          <p style={{ color: '#0D7A87', textAlign: 'center', marginBottom: 48, fontSize: 14, fontWeight: 600 }}>Paiement par MVola, Orange Money, Airtel Money ou virement bancaire</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {PLANS.map((plan) => (
              <div key={plan.name} style={{ background: plan.popular ? 'linear-gradient(135deg,#0D7A87,#0A5F6A)' : '#fff', borderRadius: 20, padding: 32, border: plan.popular ? 'none' : '1px solid #E2E8F0', boxShadow: plan.popular ? '0 20px 48px rgba(13,122,135,0.3)' : '0 4px 16px rgba(0,0,0,0.06)', position: 'relative', transform: plan.popular ? 'scale(1.03)' : 'none' }}>
                {plan.popular && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#F59E0B', color: '#fff', padding: '4px 16px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
                    ⭐ PLUS POPULAIRE
                  </div>
                )}
                <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 20, color: plan.popular ? '#fff' : '#0F172A', margin: '0 0 8px' }}>{plan.name}</h3>
                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 36, color: plan.popular ? '#fff' : '#0D7A87' }}>{plan.price}</span>
                  <span style={{ color: plan.popular ? 'rgba(255,255,255,0.7)' : '#64748B', fontSize: 14 }}> {plan.period}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px' }}>
                  {plan.features.map((f, i) => (
                    <li key={i} style={{ color: plan.popular ? 'rgba(255,255,255,0.9)' : '#475569', fontSize: 14, padding: '6px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ color: plan.popular ? '#7DD3DA' : '#0D7A87', fontWeight: 700 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => handleSelectPlan(plan)} style={{ width: '100%', padding: '14px', borderRadius: 12, background: plan.popular ? '#fff' : 'linear-gradient(135deg,#0D7A87,#13A3B4)', color: plan.popular ? '#0D7A87' : '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', boxShadow: plan.popular ? '0 4px 12px rgba(0,0,0,0.15)' : '0 4px 12px rgba(13,122,135,0.3)' }}>
                  Commencer — 30 jours gratuits
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PAIEMENT ── */}
      <section style={{ padding: '48px 40px', maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 22, color: '#0F172A', marginBottom: 8 }}>Moyens de paiement acceptés</h3>
        <p style={{ color: '#64748B', marginBottom: 28 }}>Payez facilement avec votre méthode préférée</p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          {PAYMENT_METHODS.map((pm) => (
            <div key={pm.name} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <span style={{ fontSize: 22 }}>{pm.logo}</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: pm.color }}>{pm.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#0F172A', padding: '32px 40px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>
          © {new Date().getFullYear()} DPM — Logiciel de gestion de cabinet dentaire à Madagascar
        </p>
      </footer>

      {/* ── MODAL INSCRIPTION ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.6)', overflowY: 'auto', padding: '40px 16px' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setSubmitted(false); setStep(1); }}}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 36, maxWidth: 500, margin: '0 auto', position: 'relative' }}>
            <button onClick={() => { setShowModal(false); setSubmitted(false); setStep(1); }} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94A3B8' }}>✕</button>

            {!submitted ? (
              <>
                <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 22, color: '#0F172A', margin: '0 0 4px' }}>
                  {step === 1 ? 'Inscription — Essai gratuit 30 jours' : 'Modalités de paiement'}
                </h2>
                {selectedPlan && (
                  <div style={{ background: '#F0FDFE', border: '1px solid #0D7A87', borderRadius: 10, padding: '10px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#0D7A87' }}>Plan {selectedPlan.name}</span>
                    <span style={{ fontWeight: 800, color: '#0D7A87' }}>{selectedPlan.price} Ar/mois</span>
                  </div>
                )}

                {step === 1 && (
                  <form onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
                    {[
                      { label: 'Nom du cabinet', name: 'cabinet', placeholder: 'Cabinet Dentaire Dr. Rakoto', required: true },
                      { label: 'Email professionnel', name: 'email', type: 'email', placeholder: 'contact@cabinet.mg', required: true },
                      { label: 'Téléphone (MVola/Orange)', name: 'phone', placeholder: '034 XX XXX XX', required: true },
                      { label: 'Ville', name: 'city', placeholder: 'Antananarivo', required: true },
                    ].map(field => (
                      <div key={field.name} style={{ marginBottom: 14 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>{field.label} {field.required && '*'}</label>
                        <input type={field.type || 'text'} placeholder={field.placeholder} required={field.required}
                          value={form[field.name]}
                          onChange={e => setForm(p => ({ ...p, [field.name]: e.target.value }))}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 14, fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                    ))}
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Nombre de praticiens</label>
                      <select value={form.dentists} onChange={e => setForm(p => ({ ...p, dentists: e.target.value }))}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 14, fontFamily: 'DM Sans' }}>
                        <option value="1">1 praticien</option>
                        <option value="2-3">2-3 praticiens</option>
                        <option value="4-5">4-5 praticiens</option>
                        <option value="5+">5+ praticiens</option>
                      </select>
                    </div>
                    <button type="submit" style={{ width: '100%', padding: 14, borderRadius: 12, background: 'linear-gradient(135deg,#0D7A87,#13A3B4)', color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}>
                      Continuer →
                    </button>
                  </form>
                )}

                {step === 2 && (
                  <div>
                    <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                      Votre <strong>30 jours d'essai gratuit</strong> commence immédiatement après validation.<br />
                      À la fin de l'essai, choisissez votre moyen de paiement :
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                      {[
                        { name: 'MVola', num: '034 XX XXX XX', color: '#E30613' },
                        { name: 'Orange Money', num: '032 XX XXX XX', color: '#FF6600' },
                        { name: 'Airtel Money', num: '033 XX XXX XX', color: '#E4002B' },
                        { name: 'Virement bancaire', num: 'BNI Madagascar — RIB fourni sur demande', color: '#1A3A5C' },
                      ].map(pm => (
                        <div key={pm.name} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: pm.color, fontSize: 14 }}>{pm.name}</span>
                          <span style={{ color: '#64748B', fontSize: 13 }}>{pm.num}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={handleSubmit} style={{ width: '100%', padding: 14, borderRadius: 12, background: 'linear-gradient(135deg,#0D7A87,#13A3B4)', color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}>
                      ✓ Confirmer mon inscription
                    </button>
                    <button onClick={() => setStep(1)} style={{ width: '100%', padding: 10, borderRadius: 12, background: 'none', color: '#64748B', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer', marginTop: 8 }}>
                      ← Retour
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
                <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 22, color: '#0F172A', marginBottom: 8 }}>Inscription confirmée !</h2>
                <p style={{ color: '#475569', fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>
                  Bienvenue sur DPM, <strong>{form.cabinet}</strong> !<br />
                  Votre essai gratuit de <strong>30 jours</strong> commence maintenant.
                </p>
                <div style={{ background: '#F0FDFE', border: '1px solid #0D7A87', borderRadius: 12, padding: 16, marginBottom: 24, textAlign: 'left' }}>
                  <p style={{ margin: 0, fontSize: 14, color: '#0D7A87', fontWeight: 600 }}>📧 Un email de confirmation a été envoyé à :</p>
                  <p style={{ margin: '4px 0 0', fontSize: 14, color: '#0F172A' }}>{form.email}</p>
                </div>
                <a href="https://gracious-serenity-production-e854.up.railway.app" style={{ display: 'block', padding: 14, borderRadius: 12, background: 'linear-gradient(135deg,#0D7A87,#13A3B4)', color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none', marginBottom: 10 }}>
                  Accéder à mon espace →
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
