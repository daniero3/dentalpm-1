import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Styles globaux animations ──────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(32px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; } to { opacity: 1; }
    }
    @keyframes float {
      0%,100% { transform: translateY(0px) rotate(0deg); }
      33%     { transform: translateY(-14px) rotate(2deg); }
      66%     { transform: translateY(-7px) rotate(-1deg); }
    }
    @keyframes floatSlow {
      0%,100% { transform: translateY(0px); }
      50%     { transform: translateY(-20px); }
    }
    @keyframes pulse {
      0%,100% { opacity: 0.6; transform: scale(1); }
      50%     { opacity: 1;   transform: scale(1.05); }
    }
    @keyframes shimmer {
      0%   { background-position: -200% center; }
      100% { background-position:  200% center; }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.85); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes slideRight {
      from { transform: translateX(-100%); opacity: 0; }
      to   { transform: translateX(0);     opacity: 1; }
    }
    @keyframes countUp {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes gradientShift {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes blink {
      0%,100% { opacity: 1; } 50% { opacity: 0; }
    }
    @keyframes particleFloat {
      0%   { transform: translateY(0) translateX(0) scale(1);   opacity: 0.7; }
      50%  { transform: translateY(-60px) translateX(20px) scale(1.2); opacity: 0.4; }
      100% { transform: translateY(-120px) translateX(-10px) scale(0.8); opacity: 0; }
    }
    @keyframes orb {
      0%,100% { transform: translate(0,0) scale(1); }
      25%     { transform: translate(30px,-20px) scale(1.1); }
      50%     { transform: translate(-20px,30px) scale(0.9); }
      75%     { transform: translate(20px,10px) scale(1.05); }
    }

    .animate-fade-up { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) forwards; }
    .animate-fade-up-delay-1 { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.15s forwards; opacity: 0; }
    .animate-fade-up-delay-2 { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.3s forwards; opacity: 0; }
    .animate-fade-up-delay-3 { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.45s forwards; opacity: 0; }
    .animate-fade-up-delay-4 { animation: fadeUp 0.7s cubic-bezier(.22,1,.36,1) 0.6s forwards; opacity: 0; }
    .animate-scale-in { animation: scaleIn 0.6s cubic-bezier(.22,1,.36,1) forwards; }

    .feature-card {
      transition: transform 0.3s cubic-bezier(.22,1,.36,1), box-shadow 0.3s ease, border-color 0.3s ease;
    }
    .feature-card:hover {
      transform: translateY(-6px) scale(1.02);
      box-shadow: 0 20px 48px rgba(13,122,135,0.15);
      border-color: #0D7A87 !important;
    }

    .plan-card {
      transition: transform 0.3s cubic-bezier(.22,1,.36,1), box-shadow 0.3s ease;
    }
    .plan-card:hover { transform: translateY(-8px); box-shadow: 0 24px 56px rgba(0,0,0,0.12); }

    .btn-primary {
      transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
      position: relative; overflow: hidden;
    }
    .btn-primary::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%);
      transform: translateX(-100%); transition: transform 0.5s ease;
    }
    .btn-primary:hover::after { transform: translateX(100%); }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(13,122,135,0.4); }
    .btn-primary:active { transform: translateY(0); }

    .nav-link { transition: color 0.2s ease; }
    .nav-link:hover { color: #0D7A87 !important; }

    .shimmer-text {
      background: linear-gradient(90deg, #7DD3DA, #fff, #7DD3DA, #fff);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer 3s linear infinite;
    }

    .scroll-reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s cubic-bezier(.22,1,.36,1); }
    .scroll-reveal.visible { opacity: 1; transform: translateY(0); }

    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #F8FAFC; }
    ::-webkit-scrollbar-thumb { background: #0D7A87; border-radius: 99px; }
  `}</style>
);

// ── Particles flottantes ───────────────────────────────────────────────────────
const Particles = () => {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    size:  6 + Math.random() * 10,
    left:  Math.random() * 100,
    delay: Math.random() * 6,
    dur:   4 + Math.random() * 4,
  }));
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position:'absolute', bottom:0, left:`${p.left}%`,
          width:p.size, height:p.size, borderRadius:'50%',
          background:'rgba(255,255,255,0.15)',
          animation:`particleFloat ${p.dur}s ${p.delay}s ease-in infinite`,
        }} />
      ))}
    </div>
  );
};

// ── Logo dent SVG ──────────────────────────────────────────────────────────────
const ToothLogo = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <path d="M50 8C35 8,20 18,18 32C16 44,20 52,22 58C25 68,28 80,32 88C34 93,38 95,42 92C45 89,46 82,48 74C49 70,50 68,50 68C50 68,51 70,52 74C54 82,55 89,58 92C62 95,66 93,68 88C72 80,75 68,78 58C80 52,84 44,82 32C80 18,65 8,50 8Z" fill="white" opacity="0.95"/>
    <path d="M35 18C28 22,24 30,24 38C24 40,26 41,27 40C29 32,34 24,42 20C44 19,44 16,42 16C39 16,37 17,35 18Z" fill="white" opacity="0.5"/>
    <rect x="44" y="30" width="12" height="36" rx="5" fill="#0D7A87" opacity="0.9"/>
    <rect x="30" y="44" width="40" height="12" rx="5" fill="#0D7A87" opacity="0.9"/>
  </svg>
);

// ── Typing animation ───────────────────────────────────────────────────────────
const useTyping = (texts, speed = 80, pause = 2000) => {
  const [display, setDisplay] = useState('');
  const [idx, setIdx]         = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[idx];
    const timeout = setTimeout(() => {
      if (!deleting) {
        setDisplay(current.slice(0, charIdx + 1));
        if (charIdx + 1 === current.length) { setTimeout(() => setDeleting(true), pause); }
        else setCharIdx(c => c + 1);
      } else {
        setDisplay(current.slice(0, charIdx - 1));
        if (charIdx - 1 === 0) {
          setDeleting(false);
          setIdx(i => (i + 1) % texts.length);
          setCharIdx(0);
        } else setCharIdx(c => c - 1);
      }
    }, deleting ? speed / 2 : speed);
    return () => clearTimeout(timeout);
  }, [display, deleting, charIdx, idx, texts, speed, pause]);

  return display;
};

// ── Scroll reveal hook ─────────────────────────────────────────────────────────
const useScrollReveal = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.15 }
    );
    document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
};

// ── Stats animés ───────────────────────────────────────────────────────────────
const StatCounter = ({ end, label, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        let start = 0;
        const step = end / 60;
        const timer = setInterval(() => {
          start += step;
          if (start >= end) { setCount(end); clearInterval(timer); }
          else setCount(Math.floor(start));
        }, 20);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return (
    <div ref={ref} style={{ textAlign:'center', animation:'countUp 0.6s ease forwards' }}>
      <p style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:40, color:'#0D7A87', margin:0 }}>
        {count}{suffix}
      </p>
      <p style={{ color:'#64748B', fontSize:14, marginTop:4 }}>{label}</p>
    </div>
  );
};

// ── PLANS ──────────────────────────────────────────────────────────────────────
const PLANS = [
  { name:'ESSENTIAL', price:'149 000', popular:false,
    features:['1 praticien + 1 assistant(e)','500 patients','Gestion RDV','Facturation de base','Ordonnances','Odontogramme','Support email'] },
  { name:'PRO', price:'199 000', popular:true,
    features:['5 praticiens','Patients illimités','RDV avancé','Facturation complète','Laboratoire dentaire','Inventaire & Stock','Rapports financiers','SMS automatiques','Support prioritaire'] },
  { name:'GROUP', price:'299 000', popular:false,
    features:['Praticiens illimités','Multi-sites','Patients illimités','Toutes les fonctions PRO','API dédiée','Dashboard groupe','Gestionnaire dédié','Formation incluse'] },
];

const FEATURES = [
  { icon:'🦷', title:'Odontogramme', desc:'Schéma dentaire FDI interactif. Enregistrez chaque traitement par dent.' },
  { icon:'📅', title:'Rendez-vous', desc:'Calendrier intelligent avec rappels SMS automatiques avant chaque RDV.' },
  { icon:'🧾', title:'Facturation', desc:'Devis et factures professionnels. Paiement MVola, Orange Money.' },
  { icon:'💊', title:'Ordonnances', desc:'Génération instantanée d\'ordonnances PDF avec signature numérique.' },
  { icon:'🔬', title:'Laboratoire', desc:'Suivi complet des commandes prothèses et livraisons laboratoire.' },
  { icon:'📦', title:'Inventaire', desc:'Stock de matériel en temps réel avec alertes rupture automatiques.' },
  { icon:'📊', title:'Rapports', desc:'Statistiques financières détaillées. Suivi CA mensuel et annuel.' },
  { icon:'💬', title:'SMS & Messages', desc:'Rappels anniversaire, RDV et relances automatiques par SMS.' },
];

// ── MODAL INSCRIPTION ──────────────────────────────────────────────────────────
const Modal = ({ show, onClose, plan, navigate }) => {
  const [step, setStep]     = useState(1);
  const [done, setDone]     = useState(false);
  const [form, setForm]     = useState({ cabinet:'', email:'', phone:'', city:'', dentists:'1' });

  if (!show) return null;

  const PAYMENTS = [
    { name:'MVola',          num:'034 XX XXX XX', color:'#E30613' },
    { name:'Orange Money',   num:'032 XX XXX XX', color:'#FF6600' },
    { name:'Airtel Money',   num:'033 XX XXX XX', color:'#E4002B' },
    { name:'Virement BNI',   num:'RIB sur demande', color:'#1A3A5C' },
  ];

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, zIndex:2000, background:'rgba(15,23,42,0.7)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, animation:'fadeIn 0.2s ease' }}>
      <div style={{ background:'#fff', borderRadius:24, padding:36, maxWidth:500, width:'100%', maxHeight:'90vh', overflowY:'auto', position:'relative', animation:'scaleIn 0.3s cubic-bezier(.22,1,.36,1)' }}>
        <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'#F1F5F9', border:'none', borderRadius:99, width:32, height:32, cursor:'pointer', fontSize:16, color:'#64748B' }}>✕</button>

        {!done ? (
          <>
            <div style={{ marginBottom:20 }}>
              <div style={{ display:'flex', gap:6, marginBottom:16 }}>
                {[1,2].map(s => (
                  <div key={s} style={{ height:4, flex:1, borderRadius:99, background: step >= s ? '#0D7A87' : '#E2E8F0', transition:'background 0.3s' }} />
                ))}
              </div>
              <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:22, color:'#0F172A' }}>
                {step === 1 ? '🚀 Essai gratuit 7 jours' : '💳 Modalités de paiement'}
              </h2>
              {plan && (
                <div style={{ background:'#F0FDFE', border:'1px solid #0D7A87', borderRadius:10, padding:'8px 14px', marginTop:10, display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontWeight:700, color:'#0D7A87', fontSize:14 }}>Plan {plan.name}</span>
                  <span style={{ fontWeight:800, color:'#0D7A87', fontSize:14 }}>{plan.price} Ar/mois</span>
                </div>
              )}
            </div>

            {step === 1 && (
              <form onSubmit={e => { e.preventDefault(); setStep(2); }}>
                {[
                  { label:'Nom du cabinet', name:'cabinet', placeholder:'Cabinet Dentaire Dr. Rakoto', type:'text' },
                  { label:'Email professionnel', name:'email', placeholder:'contact@cabinet.mg', type:'email' },
                  { label:'Téléphone MVola/Orange', name:'phone', placeholder:'034 XX XXX XX', type:'tel' },
                  { label:'Ville', name:'city', placeholder:'Antananarivo', type:'text' },
                ].map(f => (
                  <div key={f.name} style={{ marginBottom:12 }}>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:5 }}>{f.label} *</label>
                    <input type={f.type} placeholder={f.placeholder} required
                      value={form[f.name]} onChange={e => setForm(p => ({...p, [f.name]: e.target.value}))}
                      style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:14, outline:'none', transition:'border-color 0.2s' }}
                      onFocus={e => e.target.style.borderColor='#0D7A87'}
                      onBlur={e => e.target.style.borderColor='#E2E8F0'} />
                  </div>
                ))}
                <div style={{ marginBottom:20 }}>
                  <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#475569', marginBottom:5 }}>Nombre de praticiens</label>
                  <select value={form.dentists} onChange={e => setForm(p => ({...p, dentists: e.target.value}))}
                    style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:14 }}>
                    <option value="1">1 praticien</option>
                    <option value="2-3">2-3 praticiens</option>
                    <option value="4-5">4-5 praticiens</option>
                    <option value="5+">5+ praticiens</option>
                  </select>
                </div>
                <button type="submit" className="btn-primary"
                  style={{ width:'100%', padding:14, borderRadius:12, background:'linear-gradient(135deg,#0D7A87,#13A3B4)', color:'#fff', fontWeight:700, fontSize:15, border:'none', cursor:'pointer' }}>
                  Continuer →
                </button>
              </form>
            )}

            {step === 2 && (
              <div>
                <p style={{ color:'#475569', fontSize:14, lineHeight:1.6, marginBottom:16 }}>
                  Votre <strong>7 jours d'essai gratuit</strong> commence immédiatement. À la fin, payez par :
                </p>
                {PAYMENTS.map(p => (
                  <div key={p.name} style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:10, padding:'10px 14px', marginBottom:8, display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontWeight:700, color:p.color }}>{p.name}</span>
                    <span style={{ color:'#64748B', fontSize:13 }}>{p.num}</span>
                  </div>
                ))}
                <button onClick={() => setDone(true)}
                  className="btn-primary"
                  style={{ width:'100%', marginTop:16, padding:14, borderRadius:12, background:'linear-gradient(135deg,#0D7A87,#13A3B4)', color:'#fff', fontWeight:700, fontSize:15, border:'none', cursor:'pointer' }}>
                  ✓ Confirmer mon inscription
                </button>
                <button onClick={() => setStep(1)} style={{ width:'100%', marginTop:8, padding:10, borderRadius:12, background:'none', color:'#94A3B8', fontSize:13, border:'none', cursor:'pointer' }}>
                  ← Retour
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'12px 0' }}>
            <div style={{ fontSize:60, marginBottom:16, animation:'float 3s ease-in-out infinite' }}>🎉</div>
            <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:22, color:'#0F172A', marginBottom:8 }}>Inscription confirmée !</h2>
            <p style={{ color:'#475569', lineHeight:1.6, marginBottom:20 }}>
              Bienvenue sur DPM, <strong>{form.cabinet}</strong> !<br/>
              Votre essai de <strong>7 jours</strong> commence maintenant.
            </p>
            <div style={{ background:'#F0FDFE', border:'1px solid #0D7A87', borderRadius:12, padding:14, marginBottom:20, textAlign:'left' }}>
              <p style={{ margin:0, fontSize:13, color:'#0D7A87', fontWeight:600 }}>📧 Confirmation envoyée à :</p>
              <p style={{ margin:'4px 0 0', fontSize:14, color:'#0F172A', fontWeight:700 }}>{form.email}</p>
            </div>
            <button onClick={() => navigate('/login')}
              className="btn-primary"
              style={{ width:'100%', padding:14, borderRadius:12, background:'linear-gradient(135deg,#0D7A87,#13A3B4)', color:'#fff', fontWeight:700, fontSize:15, border:'none', cursor:'pointer' }}>
              Accéder à mon espace →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── COMPOSANT PRINCIPAL ────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [modal, setModal]       = useState({ show:false, plan:null });
  const [scrolled, setScrolled] = useState(false);
  const typedText = useTyping([
    'Gestion des patients',
    'Rendez-vous intelligents',
    'Facturation simplifiée',
    'Odontogramme digital',
    'Laboratoire dentaire',
  ], 70, 1800);

  useScrollReveal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const openModal = (plan) => setModal({ show:true, plan });

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#F8FAFC', minHeight:'100vh', overflowX:'hidden' }}>
      <GlobalStyles />

      {/* ── NAV ── */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:100,
        background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(226,232,240,0.8)' : 'none',
        padding:'0 40px', display:'flex', alignItems:'center', justifyContent:'space-between',
        height:68, transition:'all 0.3s ease',
        boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.06)' : 'none'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:40, height:40, background:'linear-gradient(135deg,#0D7A87,#083D44)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(13,122,135,0.3)' }}>
            <ToothLogo size={26} />
          </div>
          <span style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:22, color: scrolled ? '#0F172A' : '#fff' }}>DPM</span>
          <span style={{ fontSize:11, color: scrolled ? '#64748B' : 'rgba(255,255,255,0.7)', background: scrolled ? '#F1F5F9' : 'rgba(255,255,255,0.15)', padding:'2px 8px', borderRadius:99 }}>Madagascar</span>
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <a href="#plans" className="nav-link" style={{ color: scrolled ? '#475569' : 'rgba(255,255,255,0.85)', fontWeight:600, fontSize:14, textDecoration:'none' }}>Tarifs</a>
          <a href="#features" className="nav-link" style={{ color: scrolled ? '#475569' : 'rgba(255,255,255,0.85)', fontWeight:600, fontSize:14, textDecoration:'none' }}>Fonctions</a>
          <button onClick={() => navigate('/login')}
            style={{ padding:'8px 18px', borderRadius:10, border:`1.5px solid ${scrolled ? '#E2E8F0' : 'rgba(255,255,255,0.4)'}`, background:'transparent', color: scrolled ? '#0F172A' : '#fff', fontWeight:600, fontSize:14, cursor:'pointer', transition:'all 0.2s' }}>
            Se connecter
          </button>
          <button onClick={() => openModal(PLANS[1])} className="btn-primary"
            style={{ padding:'8px 18px', borderRadius:10, background:'linear-gradient(135deg,#0D7A87,#13A3B4)', color:'#fff', fontWeight:700, fontSize:14, border:'none', cursor:'pointer', boxShadow:'0 4px 14px rgba(13,122,135,0.35)' }}>
            Essai gratuit
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ background:'linear-gradient(135deg,#083D44 0%,#0A5F6A 40%,#0D7A87 100%)', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'120px 40px 80px', position:'relative', overflow:'hidden' }}>
        
        {/* Orbs animés */}
        <div style={{ position:'absolute', top:'15%', left:'8%', width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle,rgba(13,122,135,0.4),transparent)', animation:'orb 10s ease-in-out infinite', filter:'blur(40px)' }} />
        <div style={{ position:'absolute', bottom:'15%', right:'8%', width:220, height:220, borderRadius:'50%', background:'radial-gradient(circle,rgba(125,211,218,0.3),transparent)', animation:'orb 14s ease-in-out infinite reverse', filter:'blur(30px)' }} />
        <div style={{ position:'absolute', top:'50%', left:'50%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,255,255,0.03),transparent)', transform:'translate(-50%,-50%)', animation:'pulse 6s ease-in-out infinite' }} />

        <Particles />

        {/* Grille décorative */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)', backgroundSize:'60px 60px' }} />

        <div style={{ position:'relative', maxWidth:780, margin:'0 auto' }}>
          <div className="animate-fade-up" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:99, padding:'6px 16px', marginBottom:28, backdropFilter:'blur(8px)' }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'#7DD3DA', animation:'pulse 2s ease-in-out infinite', display:'inline-block' }} />
            <span style={{ fontSize:13, color:'rgba(255,255,255,0.9)', fontWeight:600 }}>🇲🇬 Conçu pour les cabinets dentaires malgaches</span>
          </div>

          <h1 className="animate-fade-up-delay-1" style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:56, lineHeight:1.15, color:'#fff', marginBottom:16 }}>
            La solution complète pour{' '}
            <span className="shimmer-text">votre cabinet</span>
          </h1>

          {/* Typing animation */}
          <div className="animate-fade-up-delay-2" style={{ height:48, marginBottom:20, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:22, color:'rgba(255,255,255,0.7)', fontWeight:500 }}>
              {typedText}
              <span style={{ animation:'blink 1s step-end infinite', color:'#7DD3DA' }}>|</span>
            </span>
          </div>

          <p className="animate-fade-up-delay-2" style={{ fontSize:18, color:'rgba(255,255,255,0.75)', lineHeight:1.7, marginBottom:40, maxWidth:580, margin:'0 auto 40px' }}>
            Gérez vos patients, rendez-vous, factures et laboratoire en un seul endroit. Simple, rapide, adapté à Madagascar.
          </p>

          <div className="animate-fade-up-delay-3" style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap', marginBottom:48 }}>
            <button onClick={() => openModal(PLANS[1])} className="btn-primary"
              style={{ padding:'16px 32px', borderRadius:14, background:'#fff', color:'#0D7A87', fontWeight:800, fontSize:16, border:'none', cursor:'pointer', boxShadow:'0 8px 32px rgba(0,0,0,0.2)' }}>
              Commencer gratuitement — 7 jours ✨
            </button>
            <a href="#plans" style={{ padding:'16px 32px', borderRadius:14, background:'rgba(255,255,255,0.12)', color:'#fff', fontWeight:700, fontSize:16, border:'1px solid rgba(255,255,255,0.25)', textDecoration:'none', backdropFilter:'blur(8px)', transition:'all 0.2s' }}>
              Voir les tarifs →
            </a>
          </div>

          {/* Trust badges */}
          <div className="animate-fade-up-delay-4" style={{ display:'flex', gap:20, justifyContent:'center', flexWrap:'wrap' }}>
            {['✅ Aucune carte requise','🔒 Données sécurisées','📱 MVola & Orange Money','🇲🇬 Support en français'].map(b => (
              <span key={b} style={{ fontSize:13, color:'rgba(255,255,255,0.7)', fontWeight:500 }}>{b}</span>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position:'absolute', bottom:32, left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:6, opacity:0.6 }}>
          <span style={{ fontSize:11, color:'#fff', letterSpacing:2, textTransform:'uppercase' }}>Découvrir</span>
          <div style={{ width:1.5, height:32, background:'linear-gradient(#fff,transparent)', animation:'floatSlow 2s ease-in-out infinite' }} />
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ background:'#fff', padding:'56px 40px', borderBottom:'1px solid #F1F5F9' }}>
        <div style={{ maxWidth:900, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:32 }}>
          <StatCounter end={50}  suffix="+"   label="Cabinets clients" />
          <StatCounter end={98}  suffix="%"   label="Taux de satisfaction" />
          <StatCounter end={30}  suffix=" j"  label="Essai gratuit" />
          <StatCounter end={24}  suffix="/7"  label="Support disponible" />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding:'80px 40px', maxWidth:1100, margin:'0 auto' }}>
        <div className="scroll-reveal" style={{ textAlign:'center', marginBottom:52 }}>
          <span style={{ fontSize:13, fontWeight:700, color:'#0D7A87', letterSpacing:2, textTransform:'uppercase', display:'block', marginBottom:10 }}>FONCTIONNALITÉS</span>
          <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:38, color:'#0F172A', marginBottom:12 }}>Tout ce dont vous avez besoin</h2>
          <p style={{ color:'#64748B', fontSize:17 }}>Une plateforme complète, pensée pour les dentistes malgaches</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:20 }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card scroll-reveal" style={{ background:'#fff', borderRadius:18, padding:'24px 20px', border:'1px solid #E2E8F0', cursor:'default', transitionDelay:`${i*0.05}s` }}>
              <div style={{ width:48, height:48, background:'linear-gradient(135deg,#F0FDFE,#DCFCE7)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, marginBottom:14 }}>{f.icon}</div>
              <h3 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:16, color:'#0F172A', marginBottom:6 }}>{f.title}</h3>
              <p style={{ color:'#64748B', fontSize:13, lineHeight:1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PLANS ── */}
      <section id="plans" style={{ background:'linear-gradient(180deg,#F1F5F9,#E2E8F0)', padding:'80px 40px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div className="scroll-reveal" style={{ textAlign:'center', marginBottom:52 }}>
            <span style={{ fontSize:13, fontWeight:700, color:'#0D7A87', letterSpacing:2, textTransform:'uppercase', display:'block', marginBottom:10 }}>TARIFS</span>
            <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:38, color:'#0F172A', marginBottom:12 }}>Simple et transparent</h2>
            <p style={{ color:'#64748B', fontSize:16, marginBottom:8 }}>7 jours d'essai gratuit — aucune carte bancaire requise</p>
            <p style={{ color:'#0D7A87', fontWeight:600, fontSize:14 }}>💳 Paiement par MVola · Orange Money · Airtel Money · Virement</p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:24, alignItems:'start' }}>
            {PLANS.map((plan, i) => (
              <div key={plan.name} className={`plan-card scroll-reveal`} style={{
                background: plan.popular ? 'linear-gradient(135deg,#0D7A87,#0A5F6A)' : '#fff',
                borderRadius:22, padding:'32px 28px',
                border: plan.popular ? 'none' : '1px solid #E2E8F0',
                boxShadow: plan.popular ? '0 24px 60px rgba(13,122,135,0.35)' : '0 4px 16px rgba(0,0,0,0.05)',
                position:'relative',
                transform: plan.popular ? 'scale(1.04)' : 'scale(1)',
                transitionDelay:`${i*0.1}s`
              }}>
                {plan.popular && (
                  <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#F59E0B,#D97706)', color:'#fff', padding:'5px 18px', borderRadius:99, fontSize:12, fontWeight:800, whiteSpace:'nowrap', boxShadow:'0 4px 14px rgba(245,158,11,0.4)' }}>
                    ⭐ PLUS POPULAIRE
                  </div>
                )}
                <h3 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:20, color: plan.popular ? '#fff' : '#0F172A', marginBottom:8 }}>{plan.name}</h3>
                <div style={{ marginBottom:24 }}>
                  <span style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:38, color: plan.popular ? '#fff' : '#0D7A87' }}>{plan.price}</span>
                  <span style={{ color: plan.popular ? 'rgba(255,255,255,0.65)' : '#94A3B8', fontSize:14 }}> Ar/mois</span>
                </div>
                <ul style={{ listStyle:'none', padding:0, marginBottom:28 }}>
                  {plan.features.map((f, j) => (
                    <li key={j} style={{ color: plan.popular ? 'rgba(255,255,255,0.88)' : '#475569', fontSize:14, padding:'5px 0', display:'flex', gap:8, alignItems:'flex-start' }}>
                      <span style={{ color: plan.popular ? '#7DD3DA' : '#0D7A87', fontWeight:700, flexShrink:0, marginTop:1 }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => openModal(plan)} className="btn-primary"
                  style={{ width:'100%', padding:14, borderRadius:12, background: plan.popular ? '#fff' : 'linear-gradient(135deg,#0D7A87,#13A3B4)', color: plan.popular ? '#0D7A87' : '#fff', fontWeight:700, fontSize:15, border:'none', cursor:'pointer', boxShadow: plan.popular ? '0 4px 16px rgba(0,0,0,0.15)' : '0 4px 14px rgba(13,122,135,0.3)' }}>
                  Commencer gratuitement
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="scroll-reveal" style={{ background:'linear-gradient(135deg,#083D44,#0D7A87)', padding:'72px 40px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 20% 50%,rgba(255,255,255,0.05) 0%,transparent 50%),radial-gradient(circle at 80% 20%,rgba(255,255,255,0.04) 0%,transparent 50%)' }} />
        <Particles />
        <div style={{ position:'relative', maxWidth:600, margin:'0 auto' }}>
          <h2 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:38, color:'#fff', marginBottom:14 }}>
            Prêt à moderniser votre cabinet ? 🦷
          </h2>
          <p style={{ color:'rgba(255,255,255,0.75)', fontSize:17, marginBottom:32, lineHeight:1.7 }}>
            Rejoignez les cabinets dentaires malgaches qui font confiance à DPM. Essai gratuit de 7 jours, sans engagement.
          </p>
          <button onClick={() => openModal(PLANS[1])} className="btn-primary"
            style={{ padding:'18px 40px', borderRadius:14, background:'#fff', color:'#0D7A87', fontWeight:800, fontSize:17, border:'none', cursor:'pointer', boxShadow:'0 8px 32px rgba(0,0,0,0.25)' }}>
            Commencer gratuitement — 7 jours ✨
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background:'#0F172A', padding:'32px 40px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:30, height:30, background:'linear-gradient(135deg,#0D7A87,#13A3B4)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ToothLogo size={20} />
          </div>
          <span style={{ color:'rgba(255,255,255,0.8)', fontWeight:700 }}>DPM Madagascar</span>
        </div>
        <p style={{ color:'rgba(255,255,255,0.4)', fontSize:12, margin:0 }}>
          © {new Date().getFullYear()} DPM — Logiciel de gestion de cabinet dentaire à Madagascar
        </p>
        <button onClick={() => navigate('/login')} style={{ color:'rgba(255,255,255,0.5)', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:600 }}>
          Se connecter →
        </button>
      </footer>

      {/* ── MODAL ── */}
      <Modal show={modal.show} plan={modal.plan} onClose={() => setModal({ show:false, plan:null })} navigate={navigate} />
    </div>
  );
}
