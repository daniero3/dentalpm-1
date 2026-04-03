import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'https://dentalpm-1-production.up.railway.app/api';

// ── Photos Unsplash (libres de droits) ────────────────────────────────────────
const PHOTOS = {
  hero:    'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1920&q=80',
  work1:   'https://images.unsplash.com/photo-1588776814546-1ffbb172f3c7?w=700&q=80',
  smile:   'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=700&q=80',
  equip:   'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=700&q=80',
  clinic:  'https://images.unsplash.com/photo-1629909615184-74f495363b67?w=700&q=80',
  team:    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=700&q=80',
  xray:    'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=700&q=80',
};

// ── Animations CSS ────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }

    :root {
      --teal: #0D7A87;
      --teal-dark: #083D44;
      --teal-light: #13A3B4;
      --gold: #D4A843;
      --white: #FFFFFF;
      --off-white: #F8FAFC;
      --text: #0F172A;
      --muted: #64748B;
    }

    @keyframes fadeUp    { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fadeLeft  { from { opacity:0; transform:translateX(-40px); } to { opacity:1; transform:translateX(0); } }
    @keyframes fadeRight { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
    @keyframes scaleIn   { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
    @keyframes float     { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-12px); } }
    @keyframes pulse     { 0%,100% { opacity:0.7; transform:scale(1); } 50% { opacity:1; transform:scale(1.04); } }
    @keyframes shimmer   { 0% { background-position:-200% center; } 100% { background-position:200% center; } }
    @keyframes blink     { 0%,100% { opacity:1; } 50% { opacity:0; } }
    @keyframes spin      { to { transform:rotate(360deg); } }
    @keyframes gradMove  { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
    @keyframes orb1      { 0%,100% { transform:translate(0,0); } 33% { transform:translate(30px,-20px); } 66% { transform:translate(-15px,25px); } }
    @keyframes orb2      { 0%,100% { transform:translate(0,0); } 33% { transform:translate(-25px,15px); } 66% { transform:translate(20px,-20px); } }
    @keyframes ticker    { 0% { transform:translateX(100vw); } 100% { transform:translateX(-100%); } }
    @keyframes imgReveal { from { clip-path:inset(0 100% 0 0); } to { clip-path:inset(0 0% 0 0); } }
    @keyframes countUp   { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }

    .sr { opacity:0; transform:translateY(24px); transition:opacity .65s ease, transform .65s cubic-bezier(.22,1,.36,1); }
    .sr.visible { opacity:1; transform:translateY(0); }
    .sr-left { opacity:0; transform:translateX(-32px); transition:opacity .65s ease, transform .65s cubic-bezier(.22,1,.36,1); }
    .sr-left.visible { opacity:1; transform:translateX(0); }
    .sr-right { opacity:0; transform:translateX(32px); transition:opacity .65s ease, transform .65s cubic-bezier(.22,1,.36,1); }
    .sr-right.visible { opacity:1; transform:translateX(0); }

    .card-hover { transition:transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s ease; }
    .card-hover:hover { transform:translateY(-6px); box-shadow:0 24px 56px rgba(13,122,135,.18) !important; }

    .btn-gold {
      background: linear-gradient(135deg, #D4A843, #B8862E);
      color: #fff; font-weight: 700; border: none; cursor: pointer;
      transition: transform .2s ease, box-shadow .2s ease;
      position: relative; overflow: hidden;
    }
    .btn-gold::after { content:''; position:absolute; inset:0; background:linear-gradient(120deg,transparent 30%,rgba(255,255,255,.25) 50%,transparent 70%); transform:translateX(-100%); transition:transform .4s ease; }
    .btn-gold:hover::after { transform:translateX(100%); }
    .btn-gold:hover { transform:translateY(-2px); box-shadow:0 12px 32px rgba(212,168,67,.4); }

    .btn-teal {
      background: linear-gradient(135deg, #0D7A87, #13A3B4);
      color: #fff; font-weight: 700; border: none; cursor: pointer;
      transition: transform .2s ease, box-shadow .2s ease;
      position: relative; overflow: hidden;
    }
    .btn-teal::after { content:''; position:absolute; inset:0; background:linear-gradient(120deg,transparent 30%,rgba(255,255,255,.2) 50%,transparent 70%); transform:translateX(-100%); transition:transform .4s ease; }
    .btn-teal:hover::after { transform:translateX(100%); }
    .btn-teal:hover { transform:translateY(-2px); box-shadow:0 12px 32px rgba(13,122,135,.4); }

    .img-zoom img { transition:transform .6s ease; }
    .img-zoom:hover img { transform:scale(1.06); }

    .faq-item { border-bottom: 1px solid #E2E8F0; }
    .faq-answer { overflow: hidden; transition: max-height .4s cubic-bezier(.22,1,.36,1), opacity .3s ease; }

    ::-webkit-scrollbar { width:5px; }
    ::-webkit-scrollbar-thumb { background:var(--teal); border-radius:99px; }

    .shimmer-gold {
      background: linear-gradient(90deg, #D4A843, #fff, #D4A843);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer 3s linear infinite;
    }

    .nav-glass { backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); }
  `}</style>
);

// ── Hook scroll reveal ────────────────────────────────────────────────────────
const useScrollReveal = () => {
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('.sr, .sr-left, .sr-right').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
};

// ── Typing hook ───────────────────────────────────────────────────────────────
const useTyping = (texts, speed = 75, pause = 2200) => {
  const [display, setDisplay] = useState('');
  const [idx, setIdx]   = useState(0);
  const [ci, setCi]     = useState(0);
  const [del, setDel]   = useState(false);
  useEffect(() => {
    const cur = texts[idx];
    const t = setTimeout(() => {
      if (!del) {
        setDisplay(cur.slice(0, ci + 1));
        if (ci + 1 === cur.length) setTimeout(() => setDel(true), pause);
        else setCi(c => c + 1);
      } else {
        setDisplay(cur.slice(0, ci - 1));
        if (ci - 1 === 0) { setDel(false); setIdx(i => (i+1) % texts.length); setCi(0); }
        else setCi(c => c - 1);
      }
    }, del ? speed/2 : speed);
    return () => clearTimeout(t);
  }, [display, del, ci, idx, texts, speed, pause]);
  return display;
};

// ── Stat counter ──────────────────────────────────────────────────────────────
const Counter = ({ end, suffix='', label }) => {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const done = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true;
        let s = 0; const step = end / 50;
        const t = setInterval(() => { s += step; if (s >= end) { setN(end); clearInterval(t); } else setN(Math.floor(s)); }, 25);
      }
    }, { threshold: .5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end]);
  return (
    <div ref={ref} style={{ textAlign:'center', animation:'countUp .5s ease' }}>
      <div style={{ fontFamily:'Playfair Display', fontWeight:900, fontSize:44, color:'var(--teal)', lineHeight:1 }}>{n}{suffix}</div>
      <div style={{ color:'var(--muted)', fontSize:14, marginTop:6, fontWeight:500 }}>{label}</div>
    </div>
  );
};

// ── Logo ──────────────────────────────────────────────────────────────────────
const Logo = ({ size=38 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <rect width="100" height="100" rx="20" fill="url(#lg)"/>
    <defs><linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#0D7A87"/><stop offset="100%" stopColor="#083D44"/></linearGradient></defs>
    <path d="M50 12C37 12,24 21,22 34C20 45,24 53,26 59C29 69,32 80,36 88C38 93,42 95,45 92C48 89,49 82,50 74C51 82,52 89,55 92C58 95,62 93,64 88C68 80,71 69,74 59C76 53,80 45,78 34C76 21,63 12,50 12Z" fill="white" opacity=".95"/>
    <rect x="44" y="32" width="12" height="34" rx="5" fill="#0D7A87" opacity=".9"/>
    <rect x="30" y="46" width="40" height="12" rx="5" fill="#0D7A87" opacity=".9"/>
  </svg>
);

// ── PLANS ─────────────────────────────────────────────────────────────────────
const PLANS = [
  { name:'ESSENTIAL', price:'149 000', color:'#0D7A87', popular:false,
    desc:'Parfait pour démarrer',
    features:['1 praticien + 1 assistant(e)','500 patients max','Gestion rendez-vous','Facturation & devis','Odontogramme','Ordonnances PDF','Support email'] },
  { name:'PRO', price:'199 000', color:'#D4A843', popular:true,
    desc:'Le choix des professionnels',
    features:['5 praticiens','Patients illimités','RDV + rappels SMS','Facturation complète','Laboratoire dentaire','Inventaire & stock','Rapports financiers','Support prioritaire'] },
  { name:'GROUP', price:'299 000', color:'#0D7A87', popular:false,
    desc:'Pour les groupes & cliniques',
    features:['Praticiens illimités','Multi-sites','Tout plan PRO inclus','API dédiée','Dashboard groupe','Formation incluse','Gestionnaire dédié','SLA garanti'] },
];

const FAQ = [
  { q:'Puis-je essayer gratuitement ?', a:'Oui ! 7 jours d\'essai gratuit, sans carte bancaire. Accès complet à toutes les fonctionnalités du plan PRO pendant 7 jours.' },
  { q:'Comment se passe le paiement ?', a:'Paiement mensuel par MVola, Orange Money, Airtel Money ou virement bancaire. Aucun engagement, résiliez quand vous voulez.' },
  { q:'Mes données sont-elles sécurisées ?', a:'Absolument. Vos données sont hébergées sur des serveurs sécurisés, chiffrées en transit et au repos. Sauvegarde automatique quotidienne.' },
  { q:'Puis-je changer de plan ?', a:'Oui, à tout moment. Le changement est immédiat et le prix est ajusté au prorata du mois en cours.' },
  { q:'Y a-t-il une formation ?', a:'Oui. Une formation en ligne est incluse dans tous les plans. Le plan GROUP inclut une formation personnalisée sur site.' },
  { q:'Et si j\'ai besoin d\'aide ?', a:'Notre support est disponible par email (tous plans), téléphone (PRO & GROUP) et WhatsApp. Réponse sous 24h garantie.' },
];

const TESTIMONIALS = [
  { name:'Dr. Rakoto Andriamihaja', role:'Chirurgien-dentiste, Antananarivo', rating:5,
    text:'DPM a transformé la gestion de mon cabinet. Plus besoin des registres papier, tout est numérique et accessible en quelques clics. Je recommande vivement !' },
  { name:'Dr. Volana Rabemananjara', role:'Cabinet dentaire, Fianarantsoa', rating:5,
    text:'La facturation et les rendez-vous sont devenus tellement simples. Mes patients reçoivent leurs rappels automatiquement. Un vrai gain de temps !' },
  { name:'Dr. Hasina Razafindrabe', role:'Clinique dentaire, Toamasina', rating:5,
    text:'L\'odontogramme digital est excellent. Je peux suivre l\'historique de chaque dent de mes patients. L\'équipe support est très réactive.' },
];

// ── MODAL INSCRIPTION ─────────────────────────────────────────────────────────
const InscriptionModal = ({ show, plan, onClose, navigate }) => {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ cabinet:'', email:'', phone:'', city:'', dentists:'1' });
  const f = v => e => setForm(p => ({ ...p, [v]: e.target.value }));

  if (!show) return null;

  const inp = { width:'100%', padding:'10px 14px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:14, outline:'none', fontFamily:'DM Sans', transition:'border-color .2s' };

  const submit = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/auth/register-clinic`, { ...form, plan: plan?.name || 'PRO' });
      setDone(true);
    } catch(e) {
      alert(e.response?.data?.error || 'Erreur inscription');
    } finally { setLoading(false); }
  };

  return (
    <div onClick={e => e.target===e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, zIndex:2000, background:'rgba(8,61,68,.75)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, animation:'scaleIn .2s ease' }}>
      <div style={{ background:'#fff', borderRadius:24, padding:'36px 32px', maxWidth:480, width:'100%', maxHeight:'92vh', overflowY:'auto', position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute', top:14, right:14, width:32, height:32, borderRadius:99, background:'#F1F5F9', border:'none', cursor:'pointer', fontSize:16, color:'#64748B' }}>✕</button>

        {!done ? (
          <>
            {/* Étapes */}
            <div style={{ display:'flex', gap:6, marginBottom:22 }}>
              {[1,2].map(s => <div key={s} style={{ height:3, flex:1, borderRadius:99, background:step>=s?'var(--teal)':'#E2E8F0', transition:'background .3s' }} />)}
            </div>
            <h2 style={{ fontFamily:'Playfair Display', fontWeight:700, fontSize:22, color:'var(--text)', marginBottom:6 }}>
              {step===1 ? '✨ Essai gratuit 7 jours' : '💳 Paiement après l\'essai'}
            </h2>
            {plan && <div style={{ background:'#F0FDFE', border:'1px solid var(--teal)', borderRadius:10, padding:'8px 14px', marginBottom:18, display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontWeight:700, color:'var(--teal)', fontSize:14 }}>Plan {plan.name}</span>
              <span style={{ fontWeight:800, color:'var(--teal)', fontSize:14 }}>{plan.price} Ar/mois</span>
            </div>}

            {step===1 && <form onSubmit={e => { e.preventDefault(); setStep(2); }}>
              {[
                { label:'Nom du cabinet *', key:'cabinet', placeholder:'Cabinet Dr. Rakoto', type:'text' },
                { label:'Email professionnel *', key:'email', placeholder:'contact@cabinet.mg', type:'email' },
                { label:'Téléphone (MVola/Orange) *', key:'phone', placeholder:'034 XX XXX XX', type:'tel' },
                { label:'Ville *', key:'city', placeholder:'Antananarivo', type:'text' },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key} style={{ marginBottom:12 }}>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--muted)', marginBottom:5 }}>{label}</label>
                  <input type={type} placeholder={placeholder} required value={form[key]} onChange={f(key)}
                    style={inp} onFocus={e=>e.target.style.borderColor='var(--teal)'} onBlur={e=>e.target.style.borderColor='#E2E8F0'} />
                </div>
              ))}
              <div style={{ marginBottom:20 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--muted)', marginBottom:5 }}>Nombre de praticiens</label>
                <select value={form.dentists} onChange={f('dentists')} style={{ ...inp, cursor:'pointer' }}>
                  {['1','2-3','4-5','5+'].map(o => <option key={o} value={o}>{o} praticien{o==='1'?'':'s'}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-teal" style={{ width:'100%', padding:14, borderRadius:12, fontSize:15 }}>
                Continuer →
              </button>
            </form>}

            {step===2 && <div>
              <p style={{ color:'var(--muted)', fontSize:14, lineHeight:1.7, marginBottom:16 }}>
                Votre <strong>7 jours d'essai gratuit</strong> commence immédiatement. Après l'essai, payez par :
              </p>
              {[
                { name:'💳 MVola', detail:'034 XX XXX XX', c:'#E30613' },
                { name:'🟠 Orange Money', detail:'032 XX XXX XX', c:'#FF6600' },
                { name:'🔴 Airtel Money', detail:'033 XX XXX XX', c:'#E4002B' },
                { name:'🏦 Virement BNI', detail:'RIB fourni sur demande', c:'#1A3A5C' },
              ].map(p => (
                <div key={p.name} style={{ background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:10, padding:'10px 14px', marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontWeight:700, color:p.c, fontSize:14 }}>{p.name}</span>
                  <span style={{ color:'var(--muted)', fontSize:13 }}>{p.detail}</span>
                </div>
              ))}
              <button onClick={submit} disabled={loading} className="btn-teal" style={{ width:'100%', marginTop:16, padding:14, borderRadius:12, fontSize:15 }}>
                {loading ? '⏳ Création...' : '✓ Confirmer mon inscription'}
              </button>
              <button onClick={() => setStep(1)} style={{ width:'100%', marginTop:8, padding:10, background:'none', border:'none', color:'#94A3B8', fontSize:13, cursor:'pointer' }}>← Retour</button>
            </div>}
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'16px 0' }}>
            <div style={{ fontSize:64, animation:'float 3s ease-in-out infinite', marginBottom:16 }}>🎉</div>
            <h2 style={{ fontFamily:'Playfair Display', fontWeight:700, fontSize:22, color:'var(--text)', marginBottom:8 }}>Bienvenue sur DPM !</h2>
            <p style={{ color:'var(--muted)', lineHeight:1.7, marginBottom:20 }}>
              <strong>{form.cabinet}</strong> est inscrit.<br/>Votre essai de <strong>7 jours</strong> commence maintenant.
            </p>
            <div style={{ background:'#F0FDFE', border:'1px solid var(--teal)', borderRadius:12, padding:14, marginBottom:20, textAlign:'left' }}>
              <p style={{ margin:0, fontSize:13, color:'var(--teal)', fontWeight:600 }}>📧 Identifiants envoyés à :</p>
              <p style={{ margin:'4px 0 0', fontSize:14, color:'var(--text)', fontWeight:700 }}>{form.email}</p>
            </div>
            <button onClick={() => navigate('/login')} className="btn-teal" style={{ width:'100%', padding:14, borderRadius:12, fontSize:15 }}>
              Accéder à mon espace →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function LandingPage() {
  const navigate  = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [modal, setModal]   = useState({ show:false, plan:null });
  const [faqOpen, setFaqOpen] = useState(null);
  const [contactForm, setContactForm] = useState({ name:'', email:'', message:'' });
  const typed = useTyping(['Gestion des patients','Rendez-vous intelligents','Facturation simplifiée','Odontogramme digital','Laboratoire dentaire'], 72, 2000);
  useScrollReveal();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const open = plan => setModal({ show:true, plan });

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:'#F8FAFC', color:'var(--text)', overflowX:'hidden' }}>
      <GlobalStyles />

      {/* ═══ NAV ═══ */}
      <nav className="nav-glass" style={{
        position:'fixed', top:0, left:0, right:0, zIndex:999,
        background: scrolled ? 'rgba(255,255,255,.96)' : 'rgba(8,61,68,.2)',
        borderBottom: scrolled ? '1px solid rgba(226,232,240,.9)' : 'none',
        boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,.08)' : 'none',
        padding:'0 48px', height:68, display:'flex', alignItems:'center', justifyContent:'space-between',
        transition:'all .35s ease'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Logo size={38} />
          <span style={{ fontFamily:'Playfair Display', fontWeight:700, fontSize:22, color: scrolled?'var(--teal-dark)':'#fff' }}>DPM</span>
          <span style={{ fontSize:11, background: scrolled?'#F0FDFE':'rgba(255,255,255,.15)', color: scrolled?'var(--teal)':'rgba(255,255,255,.8)', borderRadius:99, padding:'2px 8px', fontWeight:600 }}>Madagascar</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:28 }}>
          {['#features','#plans','#testimonials','#faq','#contact'].map((h,i) => (
            <a key={h} href={h} style={{ color: scrolled?'var(--muted)':'rgba(255,255,255,.8)', textDecoration:'none', fontSize:14, fontWeight:500, transition:'color .2s' }}
              onMouseEnter={e=>e.target.style.color=scrolled?'var(--teal)':'#fff'}
              onMouseLeave={e=>e.target.style.color=scrolled?'var(--muted)':'rgba(255,255,255,.8)'}>
              {['Fonctions','Tarifs','Avis','FAQ','Contact'][i]}
            </a>
          ))}
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={() => navigate('/login')}
            style={{ padding:'8px 18px', borderRadius:10, border:`1.5px solid ${scrolled?'#E2E8F0':'rgba(255,255,255,.4)'}`, background:'transparent', color: scrolled?'var(--text)':'#fff', fontWeight:600, fontSize:14, cursor:'pointer', transition:'all .2s' }}>
            Connexion
          </button>
          <button onClick={() => open(PLANS[1])} className="btn-gold"
            style={{ padding:'8px 20px', borderRadius:10, fontSize:14 }}>
            Essai gratuit 7j
          </button>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section style={{ position:'relative', minHeight:'100vh', display:'flex', alignItems:'center', overflow:'hidden' }}>
        {/* Background image avec overlay */}
        <div style={{ position:'absolute', inset:0, zIndex:0 }}>
          <img src={PHOTOS.hero} alt="Salle dentaire" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center' }} />
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(110deg, rgba(8,61,68,.92) 0%, rgba(13,122,135,.75) 55%, rgba(8,61,68,.6) 100%)' }} />
        </div>

        {/* Orbs */}
        <div style={{ position:'absolute', top:'20%', right:'15%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(212,168,67,.15),transparent 70%)', animation:'orb1 12s ease-in-out infinite', filter:'blur(20px)', zIndex:1 }} />
        <div style={{ position:'absolute', bottom:'20%', right:'30%', width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(125,211,218,.12),transparent 70%)', animation:'orb2 9s ease-in-out infinite', filter:'blur(15px)', zIndex:1 }} />

        {/* Grille */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)', backgroundSize:'64px 64px', zIndex:1 }} />

        {/* Contenu */}
        <div style={{ position:'relative', zIndex:2, maxWidth:1100, margin:'0 auto', padding:'120px 48px 80px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:64, alignItems:'center' }}>
          <div>
            {/* Badge */}
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(212,168,67,.15)', border:'1px solid rgba(212,168,67,.4)', borderRadius:99, padding:'6px 16px', marginBottom:24, animation:'fadeUp .7s ease both' }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'#D4A843', animation:'pulse 2s infinite', display:'inline-block' }} />
              <span style={{ fontSize:13, color:'#D4A843', fontWeight:600 }}>🇲🇬 Conçu pour Madagascar</span>
            </div>

            <h1 style={{ fontFamily:'Playfair Display', fontWeight:900, fontSize:54, color:'#fff', lineHeight:1.15, marginBottom:16, animation:'fadeUp .7s .1s ease both', opacity:0 }}>
              Le logiciel de<br/>
              <span className="shimmer-gold">cabinet dentaire</span><br/>
              qu'il vous faut
            </h1>

            {/* Typing */}
            <div style={{ height:36, marginBottom:20, animation:'fadeUp .7s .2s ease both', opacity:0 }}>
              <span style={{ fontSize:18, color:'rgba(255,255,255,.7)', fontWeight:400 }}>
                {typed}<span style={{ animation:'blink 1s step-end infinite', color:'#D4A843' }}>|</span>
              </span>
            </div>

            <p style={{ fontSize:17, color:'rgba(255,255,255,.75)', lineHeight:1.75, marginBottom:36, maxWidth:480, animation:'fadeUp .7s .3s ease both', opacity:0 }}>
              Gérez patients, rendez-vous, facturation, laboratoire et inventaire en un seul outil. Simple, rapide, pensé pour vous.
            </p>

            <div style={{ display:'flex', gap:14, flexWrap:'wrap', animation:'fadeUp .7s .4s ease both', opacity:0 }}>
              <button onClick={() => open(PLANS[1])} className="btn-gold"
                style={{ padding:'15px 30px', borderRadius:13, fontSize:16 }}>
                Commencer gratuitement — 7 jours ✨
              </button>
              <a href="#features" style={{ padding:'15px 30px', borderRadius:13, border:'1.5px solid rgba(255,255,255,.35)', color:'#fff', fontSize:15, fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:8, transition:'all .2s', backdropFilter:'blur(8px)' }}>
                Découvrir →
              </a>
            </div>

            {/* Trust row */}
            <div style={{ display:'flex', gap:24, marginTop:32, flexWrap:'wrap', animation:'fadeUp .7s .5s ease both', opacity:0 }}>
              {['✅ Sans engagement','🔒 Données sécurisées','📱 MVola accepté'].map(b => (
                <span key={b} style={{ fontSize:13, color:'rgba(255,255,255,.65)', fontWeight:500 }}>{b}</span>
              ))}
            </div>
          </div>

          {/* Card flottante hero */}
          <div style={{ animation:'fadeRight .8s .3s ease both', opacity:0 }}>
            <div style={{ background:'rgba(255,255,255,.08)', backdropFilter:'blur(16px)', borderRadius:24, border:'1px solid rgba(255,255,255,.15)', padding:8, boxShadow:'0 32px 80px rgba(0,0,0,.3)', animation:'float 6s ease-in-out infinite' }}>
              <img src={PHOTOS.work1} alt="Dentiste au travail" style={{ width:'100%', borderRadius:18, objectFit:'cover', height:380 }} />
              {/* Mini card sur l'image */}
              <div style={{ position:'absolute', bottom:24, left:24, right:24, background:'rgba(255,255,255,.95)', backdropFilter:'blur(12px)', borderRadius:14, padding:'14px 18px', display:'flex', gap:12, alignItems:'center', boxShadow:'0 8px 32px rgba(0,0,0,.15)' }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,#0D7A87,#13A3B4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🦷</div>
                <div>
                  <p style={{ margin:0, fontWeight:700, fontSize:14, color:'var(--text)' }}>7 jours d'essai gratuit</p>
                  <p style={{ margin:0, fontSize:12, color:'var(--muted)' }}>Aucune carte bancaire requise</p>
                </div>
                <span style={{ marginLeft:'auto', background:'#D4A843', color:'#fff', borderRadius:99, padding:'4px 12px', fontSize:12, fontWeight:700 }}>GRATUIT</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position:'absolute', bottom:28, left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:6, opacity:.6, zIndex:2 }}>
          <span style={{ fontSize:10, color:'#fff', letterSpacing:3, textTransform:'uppercase' }}>Scroll</span>
          <div style={{ width:1.5, height:30, background:'linear-gradient(#fff,transparent)', animation:'float 2s ease-in-out infinite' }} />
        </div>
      </section>

      {/* ═══ TICKER ═══ */}
      <div style={{ background:'var(--teal)', padding:'12px 0', overflow:'hidden', whiteSpace:'nowrap' }}>
        <div style={{ display:'inline-block', animation:'ticker 20s linear infinite' }}>
          {['🦷 Gestion patients','📅 Prise de RDV','🧾 Facturation','💊 Ordonnances','🔬 Laboratoire','📦 Inventaire','📊 Rapports'].map((t,i) => (
            <span key={i} style={{ display:'inline-block', marginRight:64, color:'rgba(255,255,255,.9)', fontWeight:600, fontSize:14 }}>{t}</span>
          ))}
          {['🦷 Gestion patients','📅 Prise de RDV','🧾 Facturation','💊 Ordonnances','🔬 Laboratoire','📦 Inventaire','📊 Rapports'].map((t,i) => (
            <span key={`b${i}`} style={{ display:'inline-block', marginRight:64, color:'rgba(255,255,255,.9)', fontWeight:600, fontSize:14 }}>{t}</span>
          ))}
        </div>
      </div>

      {/* ═══ STATS ═══ */}
      <section style={{ background:'#fff', padding:'64px 48px' }}>
        <div style={{ maxWidth:900, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:40 }}>
          <Counter end={120}  suffix="+"  label="Cabinets utilisateurs" />
          <Counter end={98}   suffix="%"  label="Taux de satisfaction" />
          <Counter end={7}    suffix="j"  label="Essai gratuit" />
          <Counter end={3}    suffix=" plans"  label="Adaptés à vos besoins" />
        </div>
      </section>

      {/* ═══ SERVICES / FEATURES ═══ */}
      <section id="features" style={{ padding:'88px 48px', background:'#F8FAFC' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div className="sr" style={{ textAlign:'center', marginBottom:60 }}>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--teal)', letterSpacing:3, textTransform:'uppercase', display:'block', marginBottom:10 }}>NOS SERVICES</span>
            <h2 style={{ fontFamily:'Playfair Display', fontWeight:700, fontSize:40, color:'var(--text)', marginBottom:12 }}>Tout ce dont votre cabinet a besoin</h2>
            <p style={{ color:'var(--muted)', fontSize:17, maxWidth:520, margin:'0 auto' }}>Une plateforme complète et intuitive, pensée pour les dentistes malgaches</p>
          </div>

          {/* Grid avec images */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:24 }}>
            {/* Grande card */}
            <div className="sr-left img-zoom card-hover" style={{ borderRadius:20, overflow:'hidden', position:'relative', gridRow:'span 2', boxShadow:'0 8px 32px rgba(0,0,0,.1)' }}>
              <img src={PHOTOS.smile} alt="Patient souriant" style={{ width:'100%', height:'100%', objectFit:'cover', minHeight:480 }} />
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(8,61,68,.9) 0%,transparent 50%)' }} />
              <div style={{ position:'absolute', bottom:28, left:28, right:28 }}>
                <span style={{ fontSize:32, display:'block', marginBottom:8 }}>😊</span>
                <h3 style={{ fontFamily:'Playfair Display', fontWeight:700, fontSize:22, color:'#fff', marginBottom:6 }}>Patients satisfaits</h3>
                <p style={{ color:'rgba(255,255,255,.8)', fontSize:14, lineHeight:1.6 }}>Suivi complet de l'historique médical, traitements et documents de chaque patient</p>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateRows:'1fr 1fr', gap:24 }}>
              <div className="sr img-zoom card-hover" style={{ borderRadius:20, overflow:'hidden', position:'relative', boxShadow:'0 8px 32px rgba(0,0,0,.1)' }}>
                <img src={PHOTOS.equip} alt="Équipement dentaire" style={{ width:'100%', height:'100%', objectFit:'cover', minHeight:200 }} />
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(8,61,68,.85) 0%,transparent 55%)' }} />
                <div style={{ position:'absolute', bottom:18, left:20 }}>
                  <span style={{ fontSize:24 }}>🔬</span>
                  <h4 style={{ fontFamily:'Playfair Display', fontWeight:700, fontSize:16, color:'#fff', margin:'4px 0 2px' }}>Laboratoire</h4>
                  <p style={{ color:'rgba(255,255,255,.8)', fontSize:12 }}>Suivi commandes prothèses</p>
                </div>
              </div>
              <div className="sr img-zoom card-hover" style={{ borderRadius:20, overflow:'hidden', position:'relative', boxShadow:'0 8px 32px rgba(0,0,0,.1)' }}>
                <img src={PHOTOS.clinic} alt="Salle de soins" style={{ width:'100%', height:'100%', objectFit:'cover', minHeight:200 }} />
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top,rgba(8,61,68,.85) 0%,transparent 55%)' }} />
                <div style={{ position:'absolute', bottom:18, left:20 }}>
                  <span style={{ fontSize:24 }}>📅</span>
                  <h4 style={{ fontFamily:'Playfair Display', fontWeight:700, fontSize:16, color:'#fff', margin:'4px 0 2px' }}>Rendez-vous</h4>
                  <p style={{ color:'rgba(255,255,255,.8)', fontSize:12 }}>Calendrier + rappels SMS</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cards texte */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:16 }}>
            {[
              { icon:'🦷', t:'Odontogramme', d:'Schéma FDI interactif complet' },
              { icon:'🧾', t:'Facturation', d:'Devis & factures professionnels MGA' },
              { icon:'💊', t:'Ordonnances', d:'Génération PDF instantanée' },
              { icon:'📦', t:'Inventaire', d:'Stock en temps réel, alertes rupture' },
              { icon:'📊', t:'Rapports', d:'CA mensuel, statistiques détaillées' },
              { icon:'💬', t:'SMS auto', d:'Rappels RDV & anniversaires' },
            ].map((f,i) => (
              <div key={i} className="sr card-hover"
                style={{ background:'#fff', borderRadius:16, padding:'20px 18px', border:'1px solid #E2E8F0', boxShadow:'0 2px 8px rgba(0,0,0,.04)', transitionDelay:`${i*.06}s` }}>
                <div style={{ width:44, height:44, background:'linear-gradient(135deg,#F0FDFE,#DCFCE7)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, marginBottom:12 }}>{f.icon}</div>
                <h4 style={{ fontFamily:'Playfair Display', fontWeight:700, fontSize:16, color:'var(--text)', marginBottom:4 }}>{f.t}</h4>
                <p style={{ color:'var(--muted)', fontSize:13, lineHeight:1.5 }}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ POURQUOI NOUS ═══ */}
      <section style={{ background:'linear-gradient(135deg,var(--teal-dark),var(--teal))', padding:'88px 48px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, right:0, width:400, height:400, borderRadius:'50%', background:'rgba(255,255,255,.04)', transform:'translate(30%,-30%)' }} />
        <div style={{ maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:64, alignItems:'center' }}>
          <div className="sr-left">
            <span style={{ fontSize:12, fontWeight:700, color:'rgba(212,168,67,.9)', letterSpacing:3, textTransform:'uppercase', display:'block', marginBottom:12 }}>POURQUOI NOUS CHOISIR</span>
            <h2 style={{ fontFamily:'Playfair Display', fontWeight:700, fontSize:40, color:'#fff', lineHeight:1.25, marginBottom:20 }}>
              Le seul logiciel<br/>conçu pour les<br/>
              <span style={{ color:'#D4A843' }}>dentistes malgaches</span>
            </h2>
            <p style={{ color:'rgba(255,255,255,.8)', fontSize:16, lineHeight:1.75, marginBottom:32 }}>
              DPM a été développé en comprenant les réalités locales : paiement MVola, interface en français, support basé à Madagascar.
            </p>
            {[
              { icon:'🇲🇬', t:'100% Madagascar', d:'Interface en français, support local, tarifs en Ariary' },
              { icon:'📱', t:'MVola & Orange Money', d:'Paiements mobiles intégrés, simple comme un SMS' },
              { icon:'🔒', t:'Données sécurisées', d:'Vos données médicales chiffrées et sauvegardées' },
              { icon:'⚡', t:'Démarrage en 5 min', d:'Aucune installation, tout en ligne, immédiatement opérationnel' },
            ].map((it,i) => (
              <div key={i} style={{ display:'flex', gap:16, marginBottom:20 }}>
                <div style={{ width:42, height:42, borderRadius:12, background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{it.icon}</div>
                <div>
                  <p style={{ margin:0, fontWeight:700, color:'#fff', fontSize:15 }}>{it.t}</p>
                  <p style={{ margin:0, color:'rgba(255,255,255,.7)', fontSize:13, lineHeight:1.5 }}>{it.d}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="sr-right img-zoom" style={{ borderRadius:22, overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,.4)' }}>
            <img src={PHOTOS.team} alt="Équipe médicale" style={{ width:'100%', objectFit:'cover', height:480 }} />
          </div>
        </div>
      </section>

      {/* ═══ PLANS ═══ */}
      <section id="plans" style={{ padding:'88px 48px', background:'#F8FAFC' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div className="sr" style={{ textAlign:'center', marginBottom:56 }}>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--teal)', letterSpacing:3, textTransform:'uppercase', display:'block', marginBottom:10 }}>TARIFS</span>
            <h2 style={{ fontFamily:'Playfair Display', fontWeight:700, fontSize:40, color:'var(--text)', marginBottom:12 }}>Simple et transparent</h2>
            <p style={{ color:'var(--muted)', fontSize:16, marginBottom:6 }}>7 jours d'essai gratuit — aucune carte bancaire requise</p>
            <p style={{ color:'var(--teal)', fontWeight:600, fontSize:14 }}>💳 MVola · Orange Money · Airtel Money · Virement bancaire</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24, alignItems:'start' }}>
            {PLANS.map((plan,i) => (
              <div key={plan.name} className="sr card-hover"
                style={{ background: plan.popular?'linear-gradient(145deg,var(--teal-dark),var(--teal))':'#fff', borderRadius:22, padding:'32px 26px', border: plan.popular?'none':'1px solid #E2E8F0', boxShadow: plan.popular?'0 24px 60px rgba(13,122,135,.35)':'0 4px 16px rgba(0,0,0,.05)', position:'relative', transform: plan.popular?'scale(1.04)':'scale(1)', transitionDelay:`${i*.08}s` }}>
                {plan.popular && <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#D4A843,#B8862E)', color:'#fff', padding:'5px 20px', borderRadius:99, fontSize:12, fontWeight:800, whiteSpace:'nowrap', boxShadow:'0 4px 14px rgba(212,168,67,.4)' }}>⭐ LE PLUS POPULAIRE</div>}
                <p style={{ fontSize:11, fontWeight:700, color: plan.popular?'rgba(212,168,67,.9)':'var(--muted)', letterSpacing:2, textTransform:'uppercase', marginBottom:6 }}>{plan.desc}</p>
                <h3 style={{ fontFamily:'Playfair Display', fontWeight:700, fontSize:22, color: plan.popular?'#fff':'var(--text)', marginBottom:16 }}>{plan.name}</h3>
                <div style={{ marginBottom:24 }}>
                  <span style={{ fontFamily:'Playfair Display', fontWeight:900, fontSize:40, color: plan.popular?'#fff':'var(--teal)' }}>{plan.price}</span>
                  <span style={{ color: plan.popular?'rgba(255,255,255,.6)':'var(--muted)', fontSize:14 }}> Ar/mois</span>
                </div>
                <ul style={{ listStyle:'none', padding:0, marginBottom:28 }}>
                  {plan.features.map((f,j) => (
                    <li key={j} style={{ color: plan.popular?'rgba(255,255,255,.88)':'var(--muted)', fontSize:14, padding:'5px 0', display:'flex', gap:8, alignItems:'flex-start', borderBottom:j<plan.features.length-1?`1px solid ${plan.popular?'rgba(255,255,255,.1)':'#F1F5F9'}`:'none' }}>
                      <span style={{ color: plan.popular?'#D4A843':'var(--teal)', fontWeight:700, flexShrink:0 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => open(plan)} className={plan.popular?'btn-gold':'btn-teal'}
                  style={{ width:'100%', padding:14, borderRadius:12, fontSize:15 }}>
                  Commencer gratuitement
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TÉMOIGNAGES ═══ */}
      <section id="testimonials" style={{ padding:'88px 48px', background:'var(--teal-dark)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div className="sr" style={{ textAlign:'center', marginBottom:56 }}>
            <span style={{ fontSize:12, fontWeight:700, color:'rgba(212,168,67,.9)', letterSpacing:3, textTransform:'uppercase', display:'block', marginBottom:10 }}>TÉMOIGNAGES</span>
            <h2 style={{ fontFamily:'Playfair Display', fontWeight:700, fontSize:40, color:'#fff', marginBottom:12 }}>Ce que disent nos clients</h2>
            <p style={{ color:'rgba(255,255,255,.7)', fontSize:17 }}>Des dentistes malgaches qui font confiance à DPM</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24 }}>
            {TESTIMONIALS.map((t,i) => (
              <div key={i} className="sr card-hover"
                style={{ background:'rgba(255,255,255,.06)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,.12)', borderRadius:20, padding:28, transitionDelay:`${i*.1}s` }}>
                <div style={{ display:'flex', gap:3, marginBottom:14 }}>
                  {Array(t.rating).fill(0).map((_,j) => <span key={j} style={{ color:'#D4A843', fontSize:16 }}>★</span>)}
                </div>
                <p style={{ color:'rgba(255,255,255,.85)', fontSize:15, lineHeight:1.75, marginBottom:20, fontStyle:'italic' }}>"{t.text}"</p>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,var(--teal-light),var(--gold))', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Playfair Display', fontWeight:700, fontSize:18, color:'#fff' }}>
                    {t.name.split(' ').pop()[0]}
                  </div>
                  <div>
                    <p style={{ margin:0, fontWeight:700, color:'#fff', fontSize:14 }}>{t.name}</p>
                    <p style={{ margin:0, color:'rgba(255,255,255,.5)', fontSize:12 }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Photo + xray */}
          <div className="sr" style={{ marginTop:32, borderRadius:22, overflow:'hidden', position:'relative', height:220 }}>
            <img src={PHOTOS.xray} alt="Radiographie dentaire" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center 30%' }} />
            <div style={{ position:'absolute', inset:0, background:'rgba(8,61,68,.65)', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
              <p style={{ fontFamily:'Playfair Display', fontWeight:700, fontSize:28, color:'#fff' }}>Rejoignez 120+ cabinets sur DPM</p>
              <button onClick={() => open(PLANS[1])} className="btn-gold" style={{ padding:'12px 32px', borderRadius:12, fontSize:15 }}>
                Démarrer maintenant →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section id="faq" style={{ padding:'88px 48px', background:'#fff' }}>
        <div style={{ maxWidth:760, margin:'0 auto' }}>
          <div className="sr" style={{ textAlign:'center', marginBottom:52 }}>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--teal)', letterSpacing:3, textTransform:'uppercase', display:'block', marginBottom:10 }}>FAQ</span>
            <h2 style={{ fontFamily:'Playfair Display', fontWeight:700, fontSize:40, color:'var(--text)', marginBottom:12 }}>Questions fréquentes</h2>
            <p style={{ color:'var(--muted)', fontSize:16 }}>Tout ce que vous devez savoir avant de commencer</p>
          </div>
          <div>
            {FAQ.map((item, i) => (
              <div key={i} className="faq-item sr" style={{ transitionDelay:`${i*.06}s` }}>
                <button onClick={() => setFaqOpen(faqOpen===i ? null : i)}
                  style={{ width:'100%', padding:'20px 0', display:'flex', justifyContent:'space-between', alignItems:'center', background:'none', border:'none', cursor:'pointer', textAlign:'left', gap:16 }}>
                  <span style={{ fontWeight:700, fontSize:16, color:'var(--text)', lineHeight:1.4 }}>{item.q}</span>
                  <span style={{ fontSize:22, color:'var(--teal)', transition:'transform .3s ease', transform: faqOpen===i?'rotate(45deg)':'rotate(0)', flexShrink:0 }}>+</span>
                </button>
                <div className="faq-answer" style={{ maxHeight: faqOpen===i?'200px':'0', opacity: faqOpen===i?1:0 }}>
                  <p style={{ color:'var(--muted)', fontSize:15, lineHeight:1.7, paddingBottom:20, margin:0 }}>{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CONTACT / CTA FINAL ═══ */}
      <section id="contact" style={{ padding:'88px 48px', background:'linear-gradient(135deg,#F0FDFE,#E0F7F9)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'-20%', right:'-10%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(13,122,135,.1),transparent 70%)' }} />
        <div style={{ maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:64, alignItems:'center' }}>
          <div className="sr-left">
            <span style={{ fontSize:12, fontWeight:700, color:'var(--teal)', letterSpacing:3, textTransform:'uppercase', display:'block', marginBottom:10 }}>CONTACT</span>
            <h2 style={{ fontFamily:'Playfair Display', fontWeight:700, fontSize:40, color:'var(--text)', lineHeight:1.25, marginBottom:16 }}>
              Une question ?<br/>Écrivez-nous.
            </h2>
            <p style={{ color:'var(--muted)', fontSize:16, lineHeight:1.75, marginBottom:28 }}>
              Notre équipe est disponible pour vous aider à démarrer ou répondre à vos questions.
            </p>
            {[
              { icon:'📧', label:'Email', val:'contact@dpm-madagascar.com' },
              { icon:'📱', label:'WhatsApp / MVola', val:'+261 34 XX XXX XX' },
              { icon:'📍', label:'Localisation', val:'Antananarivo, Madagascar' },
            ].map(c => (
              <div key={c.label} style={{ display:'flex', gap:14, marginBottom:16, alignItems:'flex-start' }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,var(--teal),var(--teal-light))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{c.icon}</div>
                <div>
                  <p style={{ margin:0, fontSize:12, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:1 }}>{c.label}</p>
                  <p style={{ margin:0, fontSize:15, fontWeight:600, color:'var(--text)' }}>{c.val}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="sr-right">
            <div style={{ background:'#fff', borderRadius:24, padding:32, boxShadow:'0 20px 60px rgba(13,122,135,.12)', border:'1px solid rgba(13,122,135,.1)' }}>
              <h3 style={{ fontFamily:'Playfair Display', fontWeight:700, fontSize:22, color:'var(--text)', marginBottom:20 }}>Envoyer un message</h3>
              {[
                { label:'Votre nom', key:'name', type:'text', placeholder:'Dr. Rakoto' },
                { label:'Email', key:'email', type:'email', placeholder:'contact@cabinet.mg' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom:14 }}>
                  <label style={{ display:'block', fontSize:12, fontWeight:700, color:'var(--muted)', marginBottom:5, textTransform:'uppercase', letterSpacing:1 }}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={contactForm[f.key]}
                    onChange={e => setContactForm(p => ({ ...p, [f.key]:e.target.value }))}
                    style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:14, outline:'none', fontFamily:'DM Sans', transition:'border-color .2s' }}
                    onFocus={e=>e.target.style.borderColor='var(--teal)'}
                    onBlur={e=>e.target.style.borderColor='#E2E8F0'} />
                </div>
              ))}
              <div style={{ marginBottom:20 }}>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'var(--muted)', marginBottom:5, textTransform:'uppercase', letterSpacing:1 }}>Message</label>
                <textarea placeholder="Décrivez votre question ou votre cabinet..." value={contactForm.message}
                  onChange={e => setContactForm(p => ({ ...p, message:e.target.value }))}
                  style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:14, outline:'none', fontFamily:'DM Sans', resize:'vertical', minHeight:110, transition:'border-color .2s' }}
                  onFocus={e=>e.target.style.borderColor='var(--teal)'}
                  onBlur={e=>e.target.style.borderColor='#E2E8F0'} />
              </div>
              <button className="btn-teal" onClick={() => { alert('Message envoyé ! Nous vous répondrons dans les 24h.'); setContactForm({ name:'', email:'', message:'' }); }}
                style={{ width:'100%', padding:14, borderRadius:12, fontSize:15 }}>
                Envoyer le message 📧
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <section style={{ background:'linear-gradient(135deg,var(--teal-dark),var(--teal))', padding:'80px 48px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)', backgroundSize:'64px 64px' }} />
        <div style={{ position:'relative', maxWidth:620, margin:'0 auto' }}>
          <Logo size={56} />
          <h2 style={{ fontFamily:'Playfair Display', fontWeight:900, fontSize:42, color:'#fff', margin:'20px 0 14px', lineHeight:1.2 }}>
            Prêt à moderniser<br/>votre cabinet ? 🦷
          </h2>
          <p style={{ color:'rgba(255,255,255,.75)', fontSize:17, marginBottom:36, lineHeight:1.7 }}>
            Rejoignez les dentistes malgaches qui font confiance à DPM. 7 jours d'essai gratuit, sans engagement.
          </p>
          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => open(PLANS[1])} className="btn-gold"
              style={{ padding:'16px 36px', borderRadius:14, fontSize:17 }}>
              Commencer gratuitement — 7 jours ✨
            </button>
            <button onClick={() => navigate('/login')}
              style={{ padding:'16px 28px', borderRadius:14, border:'1.5px solid rgba(255,255,255,.35)', background:'transparent', color:'#fff', fontWeight:600, fontSize:15, cursor:'pointer', transition:'all .2s', backdropFilter:'blur(8px)' }}>
              Déjà client ? Se connecter
            </button>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ background:'#060F1A', padding:'28px 48px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Logo size={28} />
          <span style={{ color:'rgba(255,255,255,.7)', fontWeight:700, fontSize:15 }}>DPM Madagascar</span>
        </div>
        <p style={{ color:'rgba(255,255,255,.35)', fontSize:12, margin:0 }}>
          © {new Date().getFullYear()} DPM — Logiciel de gestion de cabinet dentaire à Madagascar
        </p>
        <button onClick={() => navigate('/login')} style={{ color:'rgba(255,255,255,.5)', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:600 }}>
          Se connecter →
        </button>
      </footer>

      {/* Modal */}
      <InscriptionModal show={modal.show} plan={modal.plan} onClose={() => setModal({ show:false, plan:null })} navigate={navigate} />
    </div>
  );
}
