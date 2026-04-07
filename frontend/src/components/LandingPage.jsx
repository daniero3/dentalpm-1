import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://dentalpm-1-production.up.railway.app/api';

/* ─────────────────────────────────────────────────────────────────────────────
   CSS GLOBAL  (injection React)
───────────────────────────────────────────────────────────────────────────── */
const GlobalCSS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

    :root {
      --teal:     #0D7A87;
      --teal-dk:  #083D44;
      --teal-lt:  #13A3B4;
      --teal-pale:#F0FDFE;
      --ink:      #0A0F14;
      --slate:    #475569;
      --muted:    #94A3B8;
      --border:   #E2E8F0;
      --surface:  #F8FAFC;
      --white:    #FFFFFF;
      --gold:     #F59E0B;
      --green:    #10B981;
      --r20: 20px; --r16: 16px; --r12: 12px;
      --sh-sm: 0 2px 8px rgba(0,0,0,.06);
      --sh-md: 0 8px 32px rgba(0,0,0,.10);
      --sh-lg: 0 20px 60px rgba(0,0,0,.14);
      --sh-teal: 0 12px 40px rgba(13,122,135,.30);
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; font-size: 16px; }
    body { font-family: 'DM Sans', sans-serif; background: var(--white); color: var(--ink); -webkit-font-smoothing: antialiased; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-thumb { background: var(--teal); border-radius: 99px; }

    /* ── Animations ── */
    @keyframes fadeUp    { from { opacity:0; transform:translateY(32px) } to { opacity:1; transform:translateY(0) } }
    @keyframes fadeIn    { from { opacity:0 } to { opacity:1 } }
    @keyframes fadeScaleIn { from { opacity:0; transform:scale(.92) } to { opacity:1; transform:scale(1) } }
    @keyframes float     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
    @keyframes floatR    { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-10px) rotate(3deg)} }
    @keyframes shimmer   { 0%{background-position:-300% center} 100%{background-position:300% center} }
    @keyframes orb1      { 0%,100%{transform:translate(0,0)} 33%{transform:translate(40px,-30px)} 66%{transform:translate(-20px,25px)} }
    @keyframes orb2      { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-35px,20px) scale(1.1)} }
    @keyframes blink     { 0%,100%{opacity:1} 50%{opacity:0} }
    @keyframes particle  { 0%{transform:translateY(0);opacity:.6} 100%{transform:translateY(-160px);opacity:0} }
    @keyframes countUp   { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pulse     { 0%,100%{box-shadow:0 0 0 0 rgba(13,122,135,.4)} 70%{box-shadow:0 0 0 10px rgba(13,122,135,0)} }
    @keyframes imgIn     { from{opacity:0;transform:scale(1.06)} to{opacity:1;transform:scale(1)} }
    @keyframes imgOut    { from{opacity:1;transform:scale(1)} to{opacity:0;transform:scale(1.04)} }
    @keyframes gradMove  { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
    @keyframes lineGrow  { from{width:0} to{width:100%} }
    @keyframes spinSlow  { to{transform:rotate(360deg)} }

    /* ── Utility classes ── */
    .au0 { animation: fadeUp .8s cubic-bezier(.22,1,.36,1) both; }
    .au1 { animation: fadeUp .8s cubic-bezier(.22,1,.36,1) .12s both; }
    .au2 { animation: fadeUp .8s cubic-bezier(.22,1,.36,1) .24s both; }
    .au3 { animation: fadeUp .8s cubic-bezier(.22,1,.36,1) .36s both; }
    .au4 { animation: fadeUp .8s cubic-bezier(.22,1,.36,1) .48s both; }
    .au5 { animation: fadeUp .8s cubic-bezier(.22,1,.36,1) .6s both; }

    .sr  { opacity:0; transform:translateY(24px); transition: opacity .7s ease, transform .7s cubic-bezier(.22,1,.36,1); }
    .sr.vis { opacity:1; transform:translateY(0); }

    .shimmer-text {
      background: linear-gradient(90deg, #7DD3DA 0%, #fff 40%, #7DD3DA 60%, #B2EBF2 100%);
      background-size: 300% auto;
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer 4s linear infinite;
    }

    /* ── Cards ── */
    .feat-card {
      transition: transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s, border-color .35s;
      cursor: default;
    }
    .feat-card:hover {
      transform: translateY(-10px) scale(1.02);
      box-shadow: 0 28px 60px rgba(13,122,135,.16);
      border-color: var(--teal) !important;
    }
    .plan-card { transition: transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s; }
    .plan-card:hover { transform: translateY(-12px); box-shadow: 0 32px 72px rgba(0,0,0,.14); }

    /* ── Buttons ── */
    .btn-primary {
      position: relative; overflow: hidden;
      transition: transform .22s ease, box-shadow .22s ease, filter .22s ease;
    }
    .btn-primary::before {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,.25) 50%, transparent 65%);
      transform: translateX(-100%); transition: transform .55s ease;
    }
    .btn-primary:hover::before { transform: translateX(100%); }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: var(--sh-teal); filter: brightness(1.05); }
    .btn-primary:active { transform: translateY(0); }

    .btn-ghost { transition: all .22s ease; }
    .btn-ghost:hover { background: rgba(255,255,255,.15) !important; transform: translateY(-1px); }

    /* ── Tooltip ── */
    .tip-wrap { position: relative; }
    .tip-box {
      position: absolute; bottom: calc(100% + 14px); left: 50%;
      transform: translateX(-50%) translateY(8px);
      background: var(--ink); color: #fff;
      border-radius: 12px; padding: 12px 16px; width: 230px;
      font-size: 13px; line-height: 1.6; font-weight: 400;
      box-shadow: 0 20px 48px rgba(0,0,0,.25);
      opacity: 0; visibility: hidden; pointer-events: none;
      transition: opacity .25s ease, transform .25s ease, visibility .25s;
      z-index: 60;
    }
    .tip-box::after {
      content: ''; position: absolute; top: 100%; left: 50%;
      transform: translateX(-50%);
      border: 7px solid transparent; border-top-color: var(--ink);
    }
    .tip-wrap:hover .tip-box { opacity: 1; visibility: visible; transform: translateX(-50%) translateY(0); }

    /* ── FAQ ── */
    .faq-row { cursor: pointer; transition: background .2s; }
    .faq-row:hover { background: var(--teal-pale) !important; }

    /* ── Nav link ── */
    .nav-a { transition: color .2s; text-decoration: none; }
    .nav-a:hover { color: var(--teal) !important; }
  `}</style>
);

/* ─────────────────────────────────────────────────────────────────────────────
   COMPOSANTS UTILS
───────────────────────────────────────────────────────────────────────────── */

// Logo SVG
const Logo = ({ size = 38, light = true }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <path d="M50 7C34 7,19 18,17 33C15 46,19 55,21 61C24 72,27 83,31 91C33 96,38 98,42 95C45 92,46 84,48 76C49 71,50 69,50 69S51 71,52 76C54 84,55 92,58 95C62 98,67 96,69 91C73 83,76 72,79 61C81 55,85 46,83 33C81 18,66 7,50 7Z"
      fill={light ? 'white' : 'var(--teal)'} opacity=".95"/>
    <path d="M34 17C27 22,23 31,23 39C23 41,25 42,27 41C29 33,34 24,42 20C44 19,44 16,42 15C39 15,37 16,34 17Z"
      fill={light ? 'white' : 'var(--teal)'} opacity=".45"/>
    <rect x="44" y="29" width="12" height="36" rx="5.5" fill={light ? 'var(--teal)' : 'white'} opacity=".9"/>
    <rect x="29" y="43" width="42" height="12" rx="5.5" fill={light ? 'var(--teal)' : 'white'} opacity=".9"/>
  </svg>
);

// Particles
const Particles = ({ count = 18, color = 'rgba(255,255,255,.12)' }) => (
  <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
    {Array.from({length: count}, (_, i) => ({
      s: 4 + Math.random() * 8,
      l: Math.random() * 100,
      d: Math.random() * 8,
      dur: 5 + Math.random() * 6,
    })).map((p, i) => (
      <div key={i} style={{
        position:'absolute', bottom:0, left:`${p.l}%`,
        width:p.s, height:p.s, borderRadius:'50%', background: color,
        animation: `particle ${p.dur}s ${p.d}s ease-in infinite`,
      }}/>
    ))}
  </div>
);

// Typing effect
const useTyping = (words, speed = 70, pause = 2000) => {
  const [text, setText] = useState('');
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const word = words[wordIdx];
    const delay = deleting ? speed / 2 : speed;
    const t = setTimeout(() => {
      if (!deleting) {
        setText(word.slice(0, charIdx + 1));
        if (charIdx + 1 === word.length) setTimeout(() => setDeleting(true), pause);
        else setCharIdx(c => c + 1);
      } else {
        setText(word.slice(0, charIdx - 1));
        if (charIdx - 1 === 0) {
          setDeleting(false);
          setWordIdx(i => (i + 1) % words.length);
          setCharIdx(0);
        } else setCharIdx(c => c - 1);
      }
    }, delay);
    return () => clearTimeout(t);
  });
  return text;
};

// Scroll reveal
const useScrollReveal = () => {
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.sr').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
};

// Counter animation
const Counter = ({ end, suffix = '', label }) => {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const fired = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !fired.current) {
        fired.current = true;
        const step = end / 60;
        let cur = 0;
        const t = setInterval(() => {
          cur += step;
          if (cur >= end) { setN(end); clearInterval(t); }
          else setN(Math.floor(cur));
        }, 18);
      }
    }, { threshold: .5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end]);
  return (
    <div ref={ref} style={{ textAlign:'center', animation:'countUp .6s ease both' }}>
      <div style={{ fontFamily:'Syne', fontWeight:800, fontSize:48, color:'var(--teal)', lineHeight:1 }}>
        {n}{suffix}
      </div>
      <div style={{ color:'var(--slate)', fontSize:14, marginTop:6, fontWeight:500 }}>{label}</div>
    </div>
  );
};

// FadeSlider
const FadeSlider = ({ images, height = 380, interval = 4500 }) => {
  const [cur, setCur] = useState(0);
  const [prev, setPrev] = useState(null);
  useEffect(() => {
    const t = setInterval(() => {
      setPrev(cur);
      const next = (cur + 1) % images.length;
      setTimeout(() => { setCur(next); setPrev(null); }, 900);
    }, interval);
    return () => clearInterval(t);
  }, [cur, images.length, interval]);
  return (
    <div style={{ position:'relative', height, borderRadius:24, overflow:'hidden', boxShadow:'var(--sh-lg)' }}>
      <style>{`
        @keyframes imgIn  { from{opacity:0;transform:scale(1.06)} to{opacity:1;transform:scale(1)} }
        @keyframes imgOut { from{opacity:1} to{opacity:0} }
      `}</style>
      {prev !== null && (
        <img src={images[prev].src} alt="" style={{
          position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover',
          animation:'imgOut .9s ease both', zIndex:1,
        }}/>
      )}
      <img key={cur} src={images[cur].src} alt={images[cur].alt} style={{
        position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover',
        animation:'imgIn 1.1s cubic-bezier(.22,1,.36,1) both', zIndex:2,
      }}/>
      {/* Gradient overlay */}
      <div style={{
        position:'absolute', inset:0, zIndex:3,
        background:'linear-gradient(to bottom, transparent 50%, rgba(8,61,68,.7) 100%)',
      }}/>
      {/* Caption */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, zIndex:4, padding:'20px 22px' }}>
        <p style={{ color:'rgba(255,255,255,.92)', fontSize:13, fontWeight:500, margin:0 }}>
          {images[cur].caption}
        </p>
      </div>
      {/* Dots */}
      <div style={{ position:'absolute', bottom:14, right:16, zIndex:5, display:'flex', gap:5 }}>
        {images.map((_, i) => (
          <div key={i} onClick={() => setCur(i)} style={{
            width: i===cur ? 22 : 6, height:6, borderRadius:99, cursor:'pointer',
            background: i===cur ? '#fff' : 'rgba(255,255,255,.4)',
            transition:'all .4s ease',
          }}/>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   DASHBOARD MOCKUP
───────────────────────────────────────────────────────────────────────────── */
const Dashboard = () => {
  const [tab, setTab] = useState(0);
  const tabs = ['Dashboard','Patients','Finances','Agenda','Odontogramme'];
  useEffect(() => {
    const t = setInterval(() => setTab(i => (i + 1) % tabs.length), 3500);
    return () => clearInterval(t);
  }, []);

  const Donut = ({ pct, color, label }) => {
    const r = 30, circ = 2 * Math.PI * r;
    return (
      <div style={{ textAlign:'center' }}>
        <svg width={74} height={74} viewBox="0 0 74 74">
          <circle cx={37} cy={37} r={r} fill="none" stroke="#F1F5F9" strokeWidth={8}/>
          <circle cx={37} cy={37} r={r} fill="none" stroke={color} strokeWidth={8}
            strokeDasharray={`${(pct/100)*circ} ${circ*(1-pct/100)}`}
            strokeLinecap="round" transform="rotate(-90 37 37)"
            style={{ transition:'stroke-dasharray 1.4s cubic-bezier(.22,1,.36,1)' }}/>
          <text x={37} y={42} textAnchor="middle" fontSize={13} fontWeight={800} fill={color}>{pct}%</text>
        </svg>
        <div style={{ fontSize:11, color:'#64748B', marginTop:3, fontWeight:600 }}>{label}</div>
      </div>
    );
  };

  const Line = ({ pts, color }) => {
    const W=220, H=56, mn=Math.min(...pts), mx=Math.max(...pts);
    const xs = pts.map((_,i)=>(i/(pts.length-1))*W);
    const ys = pts.map(p=>H-((p-mn)/(mx-mn||1))*(H-12)-6);
    const d = xs.map((x,i)=>`${i?'L':'M'}${x},${ys[i]}`).join(' ');
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{overflow:'visible'}}>
        <defs>
          <linearGradient id={`g${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".2"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={`${d} L${W},${H} L0,${H}Z`} fill={`url(#g${color.replace('#','')})`}/>
        <path d={d} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
        {xs.map((x,i)=><circle key={i} cx={x} cy={ys[i]} r={3.5} fill={color} stroke="#fff" strokeWidth={1.5}/>)}
      </svg>
    );
  };

  const screens = [
    // 0 — Dashboard
    <>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}>
        {[
          {l:'RDV auj.',v:'8',c:'#0D7A87',icon:'📅'},
          {l:'Patients',v:'247',c:'#7C3AED',icon:'👤'},
          {l:'CA mois',v:'1.2M',c:'#10B981',icon:'💰'},
        ].map((k,i)=>(
          <div key={i} style={{background:'#F8FAFC',borderRadius:11,padding:'10px 9px',border:'1px solid #E2E8F0'}}>
            <div style={{fontSize:20,marginBottom:4}}>{k.icon}</div>
            <div style={{fontFamily:'Syne',fontWeight:800,fontSize:20,color:k.c}}>{k.v}</div>
            <div style={{fontSize:10,color:'#94A3B8'}}>{k.l}</div>
          </div>
        ))}
      </div>
      <div style={{fontSize:11,fontWeight:700,color:'#64748B',marginBottom:6}}>Revenus (Ar)</div>
      <Line pts={[90,140,110,185,160,230,200,265]} color="#0D7A87"/>
    </>,
    // 1 — Patients
    <>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <span style={{fontFamily:'Syne',fontWeight:700,fontSize:14,color:'#0F172A'}}>Patients du jour</span>
        <span style={{background:'#F0FDFE',color:'#0D7A87',borderRadius:99,padding:'2px 10px',fontSize:11,fontWeight:700}}>247 total</span>
      </div>
      {[
        {n:'Rakoto Jean',h:'09:00',s:'Confirmé',c:'#10B981',b:'#D1FAE5'},
        {n:'Rasoa Marie',h:'10:30',s:'En attente',c:'#F59E0B',b:'#FEF3C7'},
        {n:'Andry Paul',h:'11:00',s:'Confirmé',c:'#10B981',b:'#D1FAE5'},
        {n:'Hanta Elisa',h:'14:00',s:'Nouveau',c:'#7C3AED',b:'#EDE9FE'},
      ].map((p,i)=>(
        <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',background:'#F8FAFC',borderRadius:10,marginBottom:5,border:'1px solid #F1F5F9'}}>
          <div style={{display:'flex',alignItems:'center',gap:9}}>
            <div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#0D7A87,#13A3B4)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:12,fontWeight:800}}>{p.n[0]}</div>
            <div>
              <div style={{fontWeight:700,fontSize:12,color:'#0F172A'}}>{p.n}</div>
              <div style={{fontSize:10,color:'#94A3B8'}}>RDV {p.h}</div>
            </div>
          </div>
          <span style={{background:p.b,color:p.c,borderRadius:99,padding:'2px 9px',fontSize:10,fontWeight:700}}>{p.s}</span>
        </div>
      ))}
    </>,
    // 2 — Finances
    <>
      <div style={{display:'flex',gap:4,marginBottom:6}}>
        <span style={{fontFamily:'Syne',fontWeight:700,fontSize:14,color:'#0F172A'}}>Rapports financiers</span>
        <span style={{marginLeft:'auto',background:'#D1FAE5',color:'#065F46',borderRadius:99,padding:'2px 8px',fontSize:10,fontWeight:700}}>+18% ce mois</span>
      </div>
      <div style={{display:'flex',justifyContent:'space-around',marginBottom:12}}>
        <Donut pct={78} color="#0D7A87" label="Occupation"/>
        <Donut pct={92} color="#10B981" label="Paiements"/>
        <Donut pct={65} color="#F59E0B" label="Objectif"/>
      </div>
      <div style={{display:'flex',gap:4,alignItems:'flex-end',height:52,padding:'0 2px'}}>
        {[55,70,58,85,72,91,68,95].map((h,i)=>(
          <div key={i} style={{flex:1,background:`linear-gradient(180deg,${i===7?'#10B981':'#0D7A87'},${i===7?'#10B98188':'#0D7A8788'})`,borderRadius:'4px 4px 0 0',height:`${h}%`,transition:'height 1s .1s'}}/>
        ))}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>
        {['S1','S2','S3','S4','S5','S6','S7','S8'].map(s=><span key={s} style={{fontSize:9,color:'#CBD5E1'}}>{s}</span>)}
      </div>
    </>,
    // 3 — Agenda
    <>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:11}}>
        <span style={{fontFamily:'Syne',fontWeight:700,fontSize:14,color:'#0F172A'}}>Agenda du jour</span>
        <span style={{fontSize:11,color:'#94A3B8'}}>{new Date().toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})}</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'36px 1fr',gap:'3px 8px',alignItems:'start'}}>
        {[
          {h:'08:30',n:'Détartrage',doc:'Dr. Rakoto',c:'#0D7A87',bg:'#F0FDFE',d:'45min'},
          {h:'09:15',n:'Carie M16',doc:'Dr. Rasoa',c:'#7C3AED',bg:'#F5F3FF',d:'30min'},
          {h:'10:00',n:'Couronne',doc:'Dr. Rakoto',c:'#F59E0B',bg:'#FFFBEB',d:'90min'},
          {h:'11:30',n:'Pause',doc:'',c:'#CBD5E1',bg:'#F8FAFC',d:'30min'},
          {h:'14:00',n:'Extraction',doc:'Dr. Andry',c:'#EF4444',bg:'#FFF1F2',d:'45min'},
        ].map((r,i)=>(
          <React.Fragment key={i}>
            <span style={{fontSize:10,color:'#94A3B8',fontWeight:700,paddingTop:7}}>{r.h}</span>
            <div style={{background:r.bg,borderLeft:`3px solid ${r.c}`,borderRadius:'0 9px 9px 0',padding:'5px 9px',marginBottom:4}}>
              <div style={{fontSize:11,fontWeight:700,color:r.c}}>{r.n}</div>
              <div style={{fontSize:10,color:'#94A3B8'}}>{r.doc}{r.doc?' · ':''}{r.d}</div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </>,
    // 4 — Odontogramme
    <>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:11}}>
        <span style={{fontFamily:'Syne',fontWeight:700,fontSize:14,color:'#0F172A'}}>Odontogramme FDI</span>
        <span style={{fontSize:11,color:'#0D7A87',fontWeight:700}}>Rakoto J.</span>
      </div>
      {[
        {label:'Maxillaire',teeth:[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28]},
        {label:'Mandibule', teeth:[48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38]},
      ].map((row,ri)=>(
        <div key={ri} style={{marginBottom:ri===0?10:0}}>
          <div style={{fontSize:9,color:'#94A3B8',fontWeight:600,marginBottom:4}}>{row.label}</div>
          <div style={{display:'flex',gap:2,justifyContent:'center'}}>
            {row.teeth.map(t=>{
              const states={16:'#EF4444',21:'#F59E0B',36:'#EF4444',26:'#10B981',11:'#7C3AED',46:'#F59E0B'};
              const c=states[t]||'#E2E8F0', tc=states[t]?'#fff':'#94A3B8';
              return(
                <div key={t} style={{width:22,height:24,background:c,borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,fontWeight:800,color:tc,border:`1px solid ${c==='#E2E8F0'?'#CBD5E1':c}`}}>{t}</div>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}}>
        {[{c:'#EF4444',l:'Carie'},{c:'#F59E0B',l:'Obturation'},{c:'#10B981',l:'Sain'},{c:'#7C3AED',l:'Couronne'}].map(s=>(
          <div key={s.l} style={{display:'flex',alignItems:'center',gap:4}}>
            <div style={{width:10,height:10,background:s.c,borderRadius:3}}/>
            <span style={{fontSize:10,color:'#64748B'}}>{s.l}</span>
          </div>
        ))}
      </div>
    </>,
  ];

  return (
    <div style={{
      background:'#fff', borderRadius:22, padding:'16px 18px',
      boxShadow:'0 32px 80px rgba(0,0,0,.18)', border:'1px solid #E2E8F0',
      height:'100%', display:'flex', flexDirection:'column',
    }}>
      {/* Browser bar */}
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14,paddingBottom:12,borderBottom:'1px solid #F1F5F9'}}>
        <div style={{width:11,height:11,borderRadius:'50%',background:'#FF5F57'}}/>
        <div style={{width:11,height:11,borderRadius:'50%',background:'#FFBD2E'}}/>
        <div style={{width:11,height:11,borderRadius:'50%',background:'#28CA41'}}/>
        <div style={{flex:1,background:'#F8FAFC',borderRadius:7,padding:'4px 12px',marginLeft:10,display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:'#10B981'}}/>
          <span style={{fontSize:11,color:'#94A3B8'}}>app.dpm-madagascar.com</span>
        </div>
      </div>
      {/* Tabs */}
      <div style={{display:'flex',gap:3,marginBottom:14,flexWrap:'wrap'}}>
        {tabs.map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{
            padding:'4px 9px',borderRadius:8,border:'none',cursor:'pointer',
            background:tab===i?'linear-gradient(135deg,#0D7A87,#13A3B4)':'#F1F5F9',
            color:tab===i?'#fff':'#64748B',
            fontSize:10,fontWeight:700,transition:'all .2s',
          }}>{t}</button>
        ))}
      </div>
      {/* Screen */}
      <div style={{flex:1,animation:'fadeIn .4s ease both'}} key={tab}>
        {screens[tab]}
      </div>
      {/* Dots */}
      <div style={{display:'flex',gap:5,justifyContent:'center',marginTop:12}}>
        {tabs.map((_,i)=>(
          <div key={i} onClick={()=>setTab(i)} style={{
            width:i===tab?20:6,height:6,borderRadius:99,cursor:'pointer',
            background:i===tab?'#0D7A87':'#E2E8F0',transition:'all .3s',
          }}/>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   DONNÉES
───────────────────────────────────────────────────────────────────────────── */
const PLANS = [
  { name:'ESSENTIAL', price:'149 000', color:'#0D7A87', popular:false,
    badge:null,
    features:['1 praticien + 1 assistant(e)','Jusqu\'à 500 patients','Agenda & rendez-vous','Facturation de base','Ordonnances PDF','Odontogramme FDI','Support email'] },
  { name:'PRO', price:'199 000', color:'#0D7A87', popular:true,
    badge:'⭐ POPULAIRE',
    features:['5 praticiens','Patients illimités','Agenda avancé + rappels SMS','Facturation complète','Laboratoire dentaire','Inventaire & stock','Rapports financiers','SMS automatiques','Support prioritaire'] },
  { name:'GROUP', price:'299 000', color:'#0D7A87', popular:false,
    badge:'🏆 PREMIUM',
    features:['Praticiens illimités','Multi-sites','Patients illimités','Tout le plan PRO','API dédiée','Dashboard groupe','Gestionnaire dédié','Formation sur site incluse'] },
];

const FEATURES = [
  {icon:'🦷',label:'Odontogramme',tip:'Schéma dentaire FDI interactif complet. Enregistrez chaque soin par numéro de dent avec historique complet et suivi dans le temps.'},
  {icon:'🧾',label:'Facturation',tip:'Créez devis et factures professionnels en 30 secondes. MVola, Orange Money, espèces. PDF avec en-tête du cabinet automatique.'},
  {icon:'💊',label:'Ordonnances',tip:'Génération instantanée d\'ordonnances PDF avec signature du praticien. Format standard Madagascar, impression ou envoi par email.'},
  {icon:'📦',label:'Inventaire',tip:'Suivi en temps réel de tout votre matériel dentaire. Alertes automatiques quand un produit approche du stock minimum.'},
  {icon:'📊',label:'Rapports',tip:'Tableaux de bord financiers : CA mensuel, paiements en attente, actes les plus fréquents, taux de remplissage du planning.'},
  {icon:'💬',label:'SMS auto',tip:'Rappels de RDV 24h avant. Messages d\'anniversaire patients. Relances automatiques. Zéro oubli, zéro appel manuel inutile.'},
  {icon:'🔬',label:'Laboratoire',tip:'Gérez vos commandes prothèses et implants. Suivi délais livraison, coûts labo et correspondance avec les dossiers patients.'},
];

const FAQS = [
  {q:'Comment fonctionne l\'essai gratuit de 7 jours ?',a:'Créez votre compte en 2 minutes, aucune carte bancaire requise. Accès immédiat à toutes les fonctionnalités du plan PRO pendant 7 jours. À la fin, choisissez votre plan et payez via MVola, Orange Money ou virement.'},
  {q:'Mes données patients sont-elles sécurisées ?',a:'Oui. Toutes vos données sont chiffrées et stockées de manière sécurisée avec sauvegarde automatique quotidienne. Nous respectons la confidentialité médicale. Aucune donnée n\'est partagée avec des tiers.'},
  {q:'Puis-je annuler à tout moment ?',a:'Absolument, sans engagement ni pénalité. Annulez depuis votre espace cabinet en un clic. Vos données restent accessibles jusqu\'à la fin de la période payée.'},
  {q:'Combien de patients avec le plan ESSENTIAL ?',a:'Le plan ESSENTIAL gère jusqu\'à 500 patients actifs, pour 1 praticien et 1 assistant(e). Pour des besoins plus importants, le plan PRO offre des patients illimités dès 199 000 Ar/mois.'},
  {q:'Comment fonctionne le paiement mensuel ?',a:'Envoyez votre paiement par MVola (034), Orange Money (032), Airtel Money (033) ou virement BNI. Notre équipe valide sous 24h et votre abonnement est automatiquement renouvelé.'},
  {q:'DPM fonctionne-t-il sur mobile ?',a:'Oui, DPM est 100% responsive. Il fonctionne parfaitement sur ordinateur, tablette et smartphone. Gérez votre cabinet depuis n\'importe où à Madagascar.'},
  {q:'Puis-je migrer mes données existantes ?',a:'Oui. Notre équipe vous accompagne dans la migration de vos données patients et historiques. Contactez-nous sur radisonfrancky@gmail.com pour un accompagnement gratuit.'},
  {q:'Y a-t-il une formation pour utiliser DPM ?',a:'Le plan GROUP inclut une formation personnalisée sur site. Pour tous les plans, documentation complète et tutoriels vidéo inclus. Notre support répond sous 24h en français.'},
];

const TEMOIGNAGES = [
  {nom:'Dr. Rakoto Jean',role:'Chirurgien-dentiste, Antananarivo',note:5,txt:'DPM a transformé la gestion de mon cabinet. Moins de temps sur l\'administratif, plus de temps pour mes patients. La facturation est devenu un jeu d\'enfant.'},
  {nom:'Dr. Rasoa Marie',role:'Orthodontiste, Fianarantsoa',note:5,txt:'L\'odontogramme digital est remarquable. Je suis l\'évolution de chaque dent avec précision. Les rappels SMS ont réduit mes rendez-vous manqués de 70%.'},
  {nom:'Dr. Randria Paul',role:'Cabinet de groupe, Toamasina',note:5,txt:'3 praticiens, DPM gère tout parfaitement. Les rapports financiers nous donnent une visibilité totale. Je le recommande à tous mes confrères.'},
];

/* ─────────────────────────────────────────────────────────────────────────────
   MODAL INSCRIPTION
───────────────────────────────────────────────────────────────────────────── */
const InscriptionModal = ({ show, plan, onClose, navigate }) => {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ cabinet:'', email:'', phone:'', city:'', dentists:'1' });

  const inp = {
    width:'100%', padding:'11px 14px', borderRadius:11,
    border:'1.5px solid var(--border)', fontSize:14,
    fontFamily:'DM Sans, sans-serif', outline:'none',
    transition:'border-color .2s, box-shadow .2s', background:'#fff',
  };
  const onFocus = e => { e.target.style.borderColor='var(--teal)'; e.target.style.boxShadow='0 0 0 3px rgba(13,122,135,.12)'; };
  const onBlur  = e => { e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none'; };

  const submit = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/register-clinic`, { ...form, plan: plan?.name || 'PRO' });
      setDone(true);
    } catch(e) {
      alert(e.response?.data?.error || 'Erreur. Vérifiez vos informations.');
    } finally { setLoading(false); }
  };

  if (!show) return null;

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(10,15,20,.72)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, animation:'fadeIn .25s ease' }}>
      <div style={{ background:'#fff', borderRadius:28, padding:'40px 36px', maxWidth:500, width:'100%', maxHeight:'92vh', overflowY:'auto', position:'relative', animation:'fadeScaleIn .35s cubic-bezier(.22,1,.36,1)' }}>
        <button onClick={onClose} style={{ position:'absolute', top:16, right:16, width:34, height:34, borderRadius:'50%', background:'#F1F5F9', border:'none', cursor:'pointer', fontSize:17, color:'#64748B', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>

        {!done ? (
          <>
            {/* Progress */}
            <div style={{ display:'flex', gap:5, marginBottom:22 }}>
              {[1,2].map(s => (
                <div key={s} style={{ flex:1, height:4, borderRadius:99, background: step>=s ? 'var(--teal)' : 'var(--border)', transition:'background .3s' }}/>
              ))}
            </div>

            <h2 style={{ fontFamily:'Syne', fontWeight:800, fontSize:22, color:'var(--ink)', marginBottom:6 }}>
              {step===1 ? '🚀 Essai gratuit 7 jours' : '💳 Modalités de paiement'}
            </h2>

            {plan && (
              <div style={{ background:'var(--teal-pale)', border:'1.5px solid var(--teal)', borderRadius:12, padding:'10px 16px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:700, color:'var(--teal)', fontSize:14 }}>Plan {plan.name}</span>
                <span style={{ fontFamily:'Syne', fontWeight:800, color:'var(--teal)', fontSize:16 }}>{plan.price} Ar/mois</span>
              </div>
            )}

            {step === 1 && (
              <div>
                {[
                  {label:'Nom du cabinet', name:'cabinet', placeholder:'Cabinet Dentaire Dr. Rakoto', type:'text'},
                  {label:'Email professionnel', name:'email', placeholder:'contact@cabinet.mg', type:'email'},
                  {label:'Téléphone MVola / Orange', name:'phone', placeholder:'034 XX XXX XX', type:'tel'},
                  {label:'Ville', name:'city', placeholder:'Antananarivo', type:'text'},
                ].map(f => (
                  <div key={f.name} style={{ marginBottom:14 }}>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--slate)', marginBottom:5 }}>{f.label} *</label>
                    <input type={f.type} placeholder={f.placeholder} required value={form[f.name]}
                      onChange={e => setForm(p => ({...p, [f.name]: e.target.value}))}
                      style={inp} onFocus={onFocus} onBlur={onBlur}/>
                  </div>
                ))}
                <div style={{ marginBottom:22 }}>
                  <label style={{ display:'block', fontSize:13, fontWeight:600, color:'var(--slate)', marginBottom:5 }}>Nombre de praticiens</label>
                  <select value={form.dentists} onChange={e => setForm(p=>({...p,dentists:e.target.value}))}
                    style={{...inp, cursor:'pointer'}}>
                    {['1 praticien','2-3 praticiens','4-5 praticiens','5+ praticiens'].map((o,i)=>(
                      <option key={i} value={[1,'2-3','4-5','5+'][i]}>{o}</option>
                    ))}
                  </select>
                </div>
                <button className="btn-primary"
                  disabled={!form.cabinet || !form.email || !form.phone || !form.city}
                  onClick={() => setStep(2)}
                  style={{ width:'100%', padding:'14px', borderRadius:13, background:'linear-gradient(135deg,var(--teal),var(--teal-lt))', color:'#fff', fontWeight:700, fontSize:15, border:'none', cursor:'pointer', opacity: (!form.cabinet||!form.email||!form.phone||!form.city) ? .5 : 1 }}>
                  Continuer →
                </button>
              </div>
            )}

            {step === 2 && (
              <div>
                <p style={{ color:'var(--slate)', fontSize:14, lineHeight:1.7, marginBottom:16 }}>
                  Votre <strong>essai gratuit de 7 jours</strong> commence immédiatement. À la fin, payez par :
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:22 }}>
                  {[
                    {name:'MVola', num:'034 XX XXX XX', color:'#E30613'},
                    {name:'Orange Money', num:'032 XX XXX XX', color:'#FF6600'},
                    {name:'Airtel Money', num:'033 XX XXX XX', color:'#E4002B'},
                    {name:'Virement BNI', num:'RIB fourni sur demande', color:'#1A3A5C'},
                  ].map(p => (
                    <div key={p.name} style={{ background:'#F8FAFC', border:'1px solid var(--border)', borderRadius:11, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontWeight:700, color:p.color, fontSize:14 }}>{p.name}</span>
                      <span style={{ color:'var(--muted)', fontSize:13 }}>{p.num}</span>
                    </div>
                  ))}
                </div>
                <button className="btn-primary" onClick={submit} disabled={loading}
                  style={{ width:'100%', padding:'14px', borderRadius:13, background:'linear-gradient(135deg,var(--teal),var(--teal-lt))', color:'#fff', fontWeight:700, fontSize:15, border:'none', cursor:'pointer', opacity:loading?.6:1 }}>
                  {loading ? '⏳ Création...' : '✓ Confirmer mon inscription'}
                </button>
                <button onClick={() => setStep(1)} style={{ width:'100%', marginTop:8, padding:9, background:'none', color:'var(--muted)', border:'none', cursor:'pointer', fontSize:13 }}>
                  ← Retour
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'12px 0' }}>
            <div style={{ fontSize:68, marginBottom:16, animation:'floatR 3s ease-in-out infinite' }}>🎉</div>
            <h2 style={{ fontFamily:'Syne', fontWeight:800, fontSize:24, color:'var(--ink)', marginBottom:8 }}>Bienvenue sur DPM !</h2>
            <p style={{ color:'var(--slate)', lineHeight:1.75, marginBottom:22 }}>
              Cabinet <strong>{form.cabinet}</strong> créé avec succès !<br/>
              Vos identifiants ont été envoyés à <strong>{form.email}</strong>
            </p>
            <div style={{ background:'var(--teal-pale)', border:'1.5px solid var(--teal)', borderRadius:14, padding:'14px 18px', marginBottom:22, textAlign:'left' }}>
              <p style={{ margin:0, fontSize:13, color:'var(--teal)', fontWeight:700 }}>🕐 Votre essai de 7 jours est activé !</p>
              <p style={{ margin:'4px 0 0', color:'var(--slate)', fontSize:13 }}>Connectez-vous avec les identifiants reçus par email.</p>
            </div>
            <button className="btn-primary" onClick={() => navigate('/login')}
              style={{ width:'100%', padding:'14px', borderRadius:13, background:'linear-gradient(135deg,var(--teal),var(--teal-lt))', color:'#fff', fontWeight:700, fontSize:15, border:'none', cursor:'pointer' }}>
              Accéder à mon espace →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   PAGE PRINCIPALE
───────────────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [modal, setModal] = useState({ show:false, plan:null });
  const [openFaq, setOpenFaq] = useState(null);
  const [contact, setContact] = useState({ nom:'', email:'', message:'' });
  const [contactSent, setContactSent] = useState(false);
  const typed = useTyping(['patients & rendez-vous','facturation Ariary','ordonnances PDF','laboratoire dentaire','inventaire & stock'], 68, 2000);
  useScrollReveal();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 56);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const open = plan => setModal({ show:true, plan });

  const IMAGES_SERVICES = [
    {src:'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=900&q=85', alt:'Chirurgien dentiste', caption:'🦷 Précision et excellence dans chaque soin'},
    {src:'https://images.unsplash.com/photo-1588776814546-1ffbb74a7258?w=900&q=85', alt:'Cabinet moderne', caption:'🏥 Cabinet dentaire moderne et équipé'},
    {src:'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=900&q=85', alt:'Patient satisfait', caption:'😊 Des patients satisfaits et fidèles'},
    {src:'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=900&q=85', alt:'Examen dentaire', caption:'🔍 Diagnostic précis et professionnel'},
  ];
  const IMAGES_ABOUT = [
    {src:'/daniero.jpg', alt:'Équipe DPM Madagascar', caption:'🤝 Notre équipe à votre service'},
    {src:'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=900&q=85', alt:'Tech dentaire', caption:'🇲🇬 Fièrement Made in Madagascar'},
    {src:'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=900&q=85', alt:'Professionnels', caption:'💎 Excellence et proximité'},
  ];

  return (
    <div style={{ fontFamily:"'DM Sans', sans-serif", background:'var(--white)', minHeight:'100vh', overflowX:'hidden' }}>
      <GlobalCSS />

      {/* ══════════════════════════════════════════════════════════════ NAV */}
      <nav style={{
        position:'fixed', top:0, left:0, right:0, zIndex:200,
        padding:'0 56px', height:70, display:'flex', alignItems:'center', justifyContent:'space-between',
        background: scrolled ? 'rgba(255,255,255,.96)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(226,232,240,.7)' : 'none',
        boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,.06)' : 'none',
        transition: 'all .35s ease',
      }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:44, height:44, background:'linear-gradient(135deg,var(--teal),var(--teal-dk))', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'var(--sh-teal)' }}>
            <Logo size={28}/>
          </div>
          <span style={{ fontFamily:'Syne', fontWeight:800, fontSize:22, color: scrolled ? 'var(--ink)' : '#fff' }}>DPM</span>
          <span style={{ fontSize:11, fontWeight:600, color: scrolled ? 'var(--muted)' : 'rgba(255,255,255,.65)', background: scrolled ? '#F1F5F9' : 'rgba(255,255,255,.12)', padding:'2px 9px', borderRadius:99 }}>Madagascar</span>
        </div>
        {/* Links */}
        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
          {[['#services','Services'],['#pourquoi','Pourquoi nous'],['#tarifs','Tarifs'],['#faq','FAQ'],['#contact','Contact']].map(([href, label]) => (
            <a key={href} href={href} className="nav-a" style={{ padding:'6px 12px', color: scrolled ? 'var(--slate)' : 'rgba(255,255,255,.8)', fontWeight:500, fontSize:14, borderRadius:8 }}>{label}</a>
          ))}
          <button onClick={() => navigate('/login')} className="btn-ghost"
            style={{ marginLeft:6, padding:'8px 18px', borderRadius:11, border:`1.5px solid ${scrolled ? 'var(--border)' : 'rgba(255,255,255,.3)'}`, background:'transparent', color: scrolled ? 'var(--ink)' : '#fff', fontWeight:600, fontSize:14, cursor:'pointer' }}>
            Connexion
          </button>
          <button onClick={() => open(PLANS[1])} className="btn-primary"
            style={{ marginLeft:4, padding:'9px 20px', borderRadius:11, background:'linear-gradient(135deg,var(--teal),var(--teal-lt))', color:'#fff', fontWeight:700, fontSize:14, border:'none', cursor:'pointer', boxShadow:'var(--sh-teal)' }}>
            Essai gratuit 🚀
          </button>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════ HERO */}
      <section style={{
        background:'linear-gradient(140deg, var(--teal-dk) 0%, #0A5F6A 45%, var(--teal) 100%)',
        minHeight:'100vh', display:'flex', alignItems:'center',
        padding:'130px 56px 90px', position:'relative', overflow:'hidden',
      }}>
        {/* Orbs */}
        <div style={{ position:'absolute', top:'8%', left:'4%', width:380, height:380, borderRadius:'50%', background:'radial-gradient(circle,rgba(13,122,135,.5),transparent 70%)', animation:'orb1 14s ease-in-out infinite', filter:'blur(50px)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:'8%', right:'4%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(125,211,218,.35),transparent 70%)', animation:'orb2 18s ease-in-out infinite', filter:'blur(40px)', pointerEvents:'none' }}/>
        {/* Grid */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.028) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.028) 1px,transparent 1px)', backgroundSize:'72px 72px', pointerEvents:'none' }}/>
        <Particles count={22}/>

        <div style={{ maxWidth:1240, margin:'0 auto', width:'100%', display:'grid', gridTemplateColumns:'1fr 1fr', gap:64, alignItems:'center' }}>

          {/* Left — Text */}
          <div>
            <div className="au0" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.18)', borderRadius:99, padding:'7px 18px', marginBottom:28, backdropFilter:'blur(10px)' }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#7DD3DA', display:'inline-block', animation:'pulse 2s ease-in-out infinite' }}/>
              <span style={{ fontSize:13, color:'rgba(255,255,255,.9)', fontWeight:500 }}>🇲🇬 Le logiciel dentaire conçu pour Madagascar</span>
            </div>

            <h1 className="au1" style={{ fontFamily:'Syne', fontWeight:800, fontSize:56, lineHeight:1.1, color:'#fff', marginBottom:14 }}>
              Gérez votre cabinet<br/>
              <span className="shimmer-text">dentaire</span><br/>
              efficacement
            </h1>

            {/* Typing */}
            <div className="au2" style={{ height:42, marginBottom:22, display:'flex', alignItems:'center' }}>
              <span style={{ fontSize:20, color:'rgba(255,255,255,.68)', fontWeight:400 }}>
                Simplifiez la gestion de vos{' '}
                <span style={{ color:'#7DD3DA', fontWeight:600 }}>{typed}</span>
                <span style={{ animation:'blink 1s step-end infinite', color:'#7DD3DA' }}>|</span>
              </span>
            </div>

            <p className="au2" style={{ fontSize:17, color:'rgba(255,255,255,.7)', lineHeight:1.75, marginBottom:38, maxWidth:500 }}>
              DPM centralise toute la gestion administrative de votre cabinet dentaire — patients, agenda, facturation, ordonnances. Simple, rapide, 100% adapté à Madagascar.
            </p>

            <div className="au3" style={{ display:'flex', gap:14, flexWrap:'wrap', marginBottom:36 }}>
              <button onClick={() => open(PLANS[1])} className="btn-primary"
                style={{ padding:'16px 32px', borderRadius:14, background:'#fff', color:'var(--teal)', fontWeight:800, fontSize:16, border:'none', cursor:'pointer', boxShadow:'0 12px 40px rgba(0,0,0,.22)' }}>
                Commencer gratuitement — 7 jours ✨
              </button>
              <a href="#tarifs" style={{ padding:'16px 28px', borderRadius:14, background:'rgba(255,255,255,.1)', color:'#fff', fontWeight:600, fontSize:16, border:'1px solid rgba(255,255,255,.22)', textDecoration:'none', display:'inline-flex', alignItems:'center', backdropFilter:'blur(8px)', transition:'all .2s' }}>
                Voir les tarifs →
              </a>
            </div>

            <div className="au4" style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
              {['✅ Sans carte bancaire','🔒 Données sécurisées','📱 MVola & Orange Money','🇲🇬 Support en français'].map(b => (
                <span key={b} style={{ fontSize:13, color:'rgba(255,255,255,.58)', fontWeight:400 }}>{b}</span>
              ))}
            </div>
          </div>

          {/* Right — Dashboard */}
          <div className="au3" style={{ position:'relative' }}>
            <div style={{ height:490, position:'relative' }}>
              <Dashboard />
            </div>
            {/* Floating badges */}
            <div style={{ position:'absolute', bottom:-18, left:-22, background:'#fff', borderRadius:16, padding:'13px 18px', boxShadow:'var(--sh-lg)', display:'flex', alignItems:'center', gap:10, animation:'float 4s ease-in-out infinite', zIndex:10 }}>
              <span style={{ fontSize:26 }}>🦷</span>
              <div>
                <div style={{ fontFamily:'Syne', fontWeight:800, color:'var(--teal)', fontSize:15 }}>+50 cabinets</div>
                <div style={{ color:'var(--muted)', fontSize:11 }}>nous font confiance</div>
              </div>
            </div>
            <div style={{ position:'absolute', top:-14, right:-18, background:'linear-gradient(135deg,var(--teal),var(--teal-lt))', borderRadius:14, padding:'11px 16px', boxShadow:'var(--sh-teal)', animation:'float 5.5s ease-in-out infinite reverse', zIndex:10 }}>
              <div style={{ color:'#fff', fontWeight:700, fontSize:12 }}>⭐ 98% satisfaction</div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position:'absolute', bottom:28, left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:5, opacity:.5 }}>
          <span style={{ fontSize:10, color:'#fff', letterSpacing:2, textTransform:'uppercase' }}>Découvrir</span>
          <div style={{ width:1, height:36, background:'linear-gradient(#fff,transparent)', animation:'float 2s ease-in-out infinite' }}/>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ STATS BAR */}
      <section style={{ background:'#fff', padding:'56px 56px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ maxWidth:960, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:32 }}>
          <Counter end={50}  suffix="+" label="Cabinets clients"/>
          <Counter end={98}  suffix="%" label="Taux de satisfaction"/>
          <Counter end={7}   suffix=" j" label="Essai gratuit"/>
          <Counter end={24}  suffix="/7" label="Support disponible"/>
          <Counter end={3}   suffix="s" label="Temps par facture"/>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ SERVICES */}
      <section id="services" style={{ padding:'100px 56px', maxWidth:1240, margin:'0 auto' }}>
        <div className="sr" style={{ textAlign:'center', marginBottom:60 }}>
          <span style={{ fontSize:12, fontWeight:700, color:'var(--teal)', letterSpacing:3, textTransform:'uppercase', display:'block', marginBottom:12 }}>FONCTIONNALITÉS</span>
          <h2 style={{ fontFamily:'Syne', fontWeight:800, fontSize:44, color:'var(--ink)', marginBottom:14 }}>Tout ce dont votre cabinet a besoin</h2>
          <p style={{ color:'var(--slate)', fontSize:17, maxWidth:540, margin:'0 auto' }}>Passez votre curseur sur chaque fonctionnalité pour découvrir les détails</p>
        </div>

        {/* Tooltip features */}
        <div className="sr" style={{ display:'flex', flexWrap:'wrap', gap:12, justifyContent:'center', marginBottom:70 }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="tip-wrap">
              <div className="feat-card" style={{ background:'#fff', borderRadius:16, padding:'16px 20px', border:'1.5px solid var(--border)', display:'flex', alignItems:'center', gap:10, minWidth:158, boxShadow:'var(--sh-sm)' }}>
                <span style={{ fontSize:26 }}>{f.icon}</span>
                <span style={{ fontFamily:'Syne', fontWeight:700, fontSize:14, color:'var(--ink)' }}>{f.label}</span>
              </div>
              <div className="tip-box">{f.tip}</div>
            </div>
          ))}
        </div>

        {/* Image + Text */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:56, alignItems:'center' }}>
          <div className="sr">
            <FadeSlider images={IMAGES_SERVICES} height={400} interval={4000}/>
          </div>
          <div className="sr" style={{ transitionDelay:'.15s' }}>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--teal)', letterSpacing:3, textTransform:'uppercase', display:'block', marginBottom:12 }}>POURQUOI DPM</span>
            <h3 style={{ fontFamily:'Syne', fontWeight:800, fontSize:34, color:'var(--ink)', marginBottom:18, lineHeight:1.2 }}>
              Un logiciel pensé pour les dentistes malgaches
            </h3>
            <p style={{ color:'var(--slate)', fontSize:16, lineHeight:1.85, marginBottom:24 }}>
              Paiement en Ariary, facturation aux normes locales, support en français — DPM est conçu spécifiquement pour la réalité des cabinets dentaires à Madagascar.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {['Odontogramme FDI complet avec historique par dent','Facturation MGA avec MVola et Orange Money','Ordonnances et prescriptions en format standard','Gestion laboratoire prothèses et implants','Inventaire matériel avec alertes automatiques'].map((f, i) => (
                <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--teal-pale)', border:'1.5px solid var(--teal)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                    <span style={{ color:'var(--teal)', fontWeight:800, fontSize:12 }}>✓</span>
                  </div>
                  <span style={{ color:'var(--slate)', fontSize:15, lineHeight:1.5 }}>{f}</span>
                </div>
              ))}
            </div>
            <button onClick={() => open(PLANS[1])} className="btn-primary"
              style={{ marginTop:28, padding:'13px 26px', borderRadius:12, background:'linear-gradient(135deg,var(--teal),var(--teal-lt))', color:'#fff', fontWeight:700, fontSize:15, border:'none', cursor:'pointer' }}>
              Essayer gratuitement →
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ POURQUOI */}
      <section id="pourquoi" style={{ background:'linear-gradient(140deg,var(--teal-dk),#0A5F6A 60%,var(--teal))', padding:'100px 56px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)', backgroundSize:'64px 64px', pointerEvents:'none' }}/>
        <Particles count={14}/>
        <div style={{ maxWidth:1240, margin:'0 auto', position:'relative' }}>
          <div className="sr" style={{ textAlign:'center', marginBottom:60 }}>
            <span style={{ fontSize:12, fontWeight:700, color:'#7DD3DA', letterSpacing:3, textTransform:'uppercase', display:'block', marginBottom:12 }}>NOS AVANTAGES</span>
            <h2 style={{ fontFamily:'Syne', fontWeight:800, fontSize:44, color:'#fff', marginBottom:14 }}>Pourquoi choisir DPM ?</h2>
            <p style={{ color:'rgba(255,255,255,.65)', fontSize:17 }}>Ce qui nous différencie de toute autre solution sur le marché</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
            {[
              {icon:'🇲🇬',title:'100% Madagascar',desc:'Conçu pour la réalité locale : Ariary, MVola, Orange Money, langue française, conformité aux normes malgaches.'},
              {icon:'💰',title:'Prix accessible',desc:'À partir de 149 000 Ar/mois, soit 4 900 Ar par jour. Le meilleur rapport qualité / prix sur le marché.'},
              {icon:'⚡',title:'Simple et rapide',desc:'Opérationnel en 30 minutes. Interface intuitive, pas besoin d\'informaticien. Formation incluse dans tous les plans.'},
              {icon:'🔒',title:'Données sécurisées',desc:'Chiffrement de bout en bout. Sauvegarde automatique quotidienne. Vos données patients restent confidentielles.'},
              {icon:'📱',title:'Multi-appareils',desc:'Fonctionne sur ordinateur, tablette et smartphone. Accédez à votre cabinet depuis n\'importe où à Madagascar.'},
              {icon:'🤝',title:'Support réactif',desc:'Équipe basée à Antananarivo. Réponse sous 24h par email et téléphone. En français, par des Malgaches.'},
            ].map((a, i) => (
              <div key={i} className="sr feat-card" style={{ background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.12)', borderRadius:20, padding:'28px 24px', backdropFilter:'blur(10px)', transitionDelay:`${i*.08}s` }}>
                <div style={{ width:52, height:52, background:'rgba(255,255,255,.1)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, marginBottom:16 }}>{a.icon}</div>
                <h3 style={{ fontFamily:'Syne', fontWeight:800, fontSize:18, color:'#fff', marginBottom:8 }}>{a.title}</h3>
                <p style={{ color:'rgba(255,255,255,.68)', fontSize:14, lineHeight:1.72 }}>{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ TÉMOIGNAGES */}
      <section style={{ padding:'100px 56px', maxWidth:1240, margin:'0 auto' }}>
        <div className="sr" style={{ textAlign:'center', marginBottom:60 }}>
          <span style={{ fontSize:12, fontWeight:700, color:'var(--teal)', letterSpacing:3, textTransform:'uppercase', display:'block', marginBottom:12 }}>TÉMOIGNAGES</span>
          <h2 style={{ fontFamily:'Syne', fontWeight:800, fontSize:44, color:'var(--ink)', marginBottom:14 }}>Ils nous font confiance</h2>
          <p style={{ color:'var(--slate)', fontSize:17 }}>Des chirurgiens-dentistes satisfaits à travers toute Madagascar</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24, marginBottom:56 }}>
          {TEMOIGNAGES.map((t, i) => (
            <div key={i} className="sr feat-card" style={{ background:'#fff', borderRadius:22, padding:'28px 26px', border:'1.5px solid var(--border)', boxShadow:'var(--sh-sm)', transitionDelay:`${i*.1}s` }}>
              <div style={{ display:'flex', gap:2, marginBottom:16 }}>
                {Array(5).fill(0).map((_,j)=><span key={j} style={{color:'#F59E0B',fontSize:18}}>★</span>)}
              </div>
              <p style={{ color:'var(--slate)', fontSize:15, lineHeight:1.8, marginBottom:22, fontStyle:'italic' }}>
                &ldquo;{t.txt}&rdquo;
              </p>
              <div style={{ display:'flex', alignItems:'center', gap:12, paddingTop:18, borderTop:'1px solid var(--border)' }}>
                <div style={{ width:46, height:46, borderRadius:'50%', background:'linear-gradient(135deg,var(--teal),var(--teal-lt))', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:'Syne', fontWeight:800, fontSize:18 }}>
                  {t.nom.split(' ').pop()[0]}
                </div>
                <div>
                  <div style={{ fontFamily:'Syne', fontWeight:700, color:'var(--ink)', fontSize:14 }}>{t.nom}</div>
                  <div style={{ color:'var(--muted)', fontSize:12 }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* 2 images fade */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
          <div className="sr">
            <FadeSlider images={[
              {src:'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=900&q=85',alt:'Soin',caption:'🦷 Des soins de qualité pour chaque patient'},
              {src:'https://images.unsplash.com/photo-1588776814546-1ffbb74a7258?w=900&q=85',alt:'Cabinet',caption:'✨ Un environnement professionnel'},
            ]} height={300} interval={4200}/>
          </div>
          <div className="sr" style={{ transitionDelay:'.15s' }}>
            <FadeSlider images={[
              {src:'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=900&q=85',alt:'Équipement',caption:'🏥 Équipements de dernière génération'},
              {src:'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=900&q=85',alt:'Dentiste',caption:'💎 Excellence clinique quotidienne'},
            ]} height={300} interval={5000}/>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ À PROPOS */}
      <section style={{ background:'var(--surface)', padding:'100px 56px' }}>
        <div style={{ maxWidth:1240, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:64, alignItems:'center' }}>
          <div className="sr">
            <span style={{ fontSize:12, fontWeight:700, color:'var(--teal)', letterSpacing:3, textTransform:'uppercase', display:'block', marginBottom:12 }}>À PROPOS</span>
            <h2 style={{ fontFamily:'Syne', fontWeight:800, fontSize:40, color:'var(--ink)', marginBottom:18, lineHeight:1.2 }}>
              Notre mission : simplifier votre quotidien
            </h2>
            <p style={{ color:'var(--slate)', fontSize:16, lineHeight:1.85, marginBottom:16 }}>
              DPM est né d'un constat simple : les chirurgiens-dentistes malgaches méritent des outils modernes adaptés à leur réalité. Nous avons créé la solution qu'aucun éditeur international ne pouvait offrir.
            </p>
            <p style={{ color:'var(--slate)', fontSize:16, lineHeight:1.85, marginBottom:32 }}>
              Notre équipe basée à Antananarivo développe et améliore continuellement la plateforme avec les retours directs des praticiens. Nous comprenons vos défis parce que nous sommes malgaches.
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:28 }}>
              {[
                {v:'2024',l:'Année de création'},
                {v:'Tana',l:'Basé à Antananarivo'},
                {v:'🇲🇬',l:'Made in Madagascar'},
                {v:'24/7',l:'Support disponible'},
              ].map((s,i)=>(
                <div key={i} style={{ background:'#fff', borderRadius:14, padding:'18px 20px', border:'1.5px solid var(--border)', boxShadow:'var(--sh-sm)', textAlign:'center' }}>
                  <div style={{ fontFamily:'Syne', fontWeight:800, fontSize:26, color:'var(--teal)' }}>{s.v}</div>
                  <div style={{ color:'var(--muted)', fontSize:13, marginTop:4 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <button onClick={() => open(PLANS[1])} className="btn-primary"
              style={{ padding:'13px 26px', borderRadius:12, background:'linear-gradient(135deg,var(--teal),var(--teal-lt))', color:'#fff', fontWeight:700, fontSize:15, border:'none', cursor:'pointer' }}>
              Rejoindre DPM →
            </button>
          </div>
          <div className="sr" style={{ transitionDelay:'.15s' }}>
            <FadeSlider images={IMAGES_ABOUT} height={480} interval={5000}/>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ TARIFS */}
      <section id="tarifs" style={{ padding:'100px 56px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div className="sr" style={{ textAlign:'center', marginBottom:60 }}>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--teal)', letterSpacing:3, textTransform:'uppercase', display:'block', marginBottom:12 }}>TARIFS</span>
            <h2 style={{ fontFamily:'Syne', fontWeight:800, fontSize:44, color:'var(--ink)', marginBottom:12 }}>Simple et transparent</h2>
            <p style={{ color:'var(--slate)', fontSize:16, marginBottom:6 }}>7 jours d'essai gratuit — aucune carte bancaire requise</p>
            <p style={{ color:'var(--teal)', fontWeight:600, fontSize:14 }}>💳 MVola · Orange Money · Airtel Money · Virement BNI</p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24, alignItems:'start' }}>
            {PLANS.map((plan, i) => (
              <div key={plan.name} className={`plan-card sr`} style={{
                background: plan.popular ? 'linear-gradient(140deg,var(--teal-dk),var(--teal))' : '#fff',
                borderRadius:24, padding:'36px 28px',
                border: plan.popular ? 'none' : '1.5px solid var(--border)',
                boxShadow: plan.popular ? '0 28px 72px rgba(13,122,135,.38)' : 'var(--sh-sm)',
                position:'relative', transform: plan.popular ? 'scale(1.04)' : 'scale(1)',
                transitionDelay:`${i*.1}s`,
              }}>
                {plan.badge && (
                  <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', background: plan.popular ? 'linear-gradient(135deg,#F59E0B,#D97706)' : 'linear-gradient(135deg,#7C3AED,#6D28D9)', color:'#fff', padding:'5px 18px', borderRadius:99, fontSize:12, fontWeight:800, whiteSpace:'nowrap', boxShadow:'0 4px 16px rgba(0,0,0,.18)' }}>
                    {plan.badge}
                  </div>
                )}
                <div style={{ fontFamily:'Syne', fontWeight:800, fontSize:18, color: plan.popular ? '#fff' : 'var(--ink)', marginBottom:6 }}>{plan.name}</div>
                <div style={{ marginBottom:24 }}>
                  <span style={{ fontFamily:'Syne', fontWeight:800, fontSize:40, color: plan.popular ? '#fff' : 'var(--teal)' }}>{plan.price}</span>
                  <span style={{ color: plan.popular ? 'rgba(255,255,255,.55)' : 'var(--muted)', fontSize:14 }}> Ar/mois</span>
                </div>
                <div style={{ height:'1px', background: plan.popular ? 'rgba(255,255,255,.15)' : 'var(--border)', marginBottom:20 }}/>
                <ul style={{ listStyle:'none', padding:0, marginBottom:28 }}>
                  {plan.features.map((f, j) => (
                    <li key={j} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:9, color: plan.popular ? 'rgba(255,255,255,.85)' : 'var(--slate)', fontSize:14 }}>
                      <span style={{ color: plan.popular ? '#7DD3DA' : 'var(--teal)', fontWeight:800, flexShrink:0, marginTop:1 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => open(plan)} className="btn-primary"
                  style={{ width:'100%', padding:'14px', borderRadius:13, background: plan.popular ? '#fff' : 'linear-gradient(135deg,var(--teal),var(--teal-lt))', color: plan.popular ? 'var(--teal)' : '#fff', fontFamily:'Syne', fontWeight:800, fontSize:15, border:'none', cursor:'pointer', boxShadow: plan.popular ? '0 6px 20px rgba(0,0,0,.15)' : 'var(--sh-teal)' }}>
                  Démarrer — 7 jours gratuits
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ FAQ */}
      <section id="faq" style={{ background:'var(--surface)', padding:'100px 56px' }}>
        <div style={{ maxWidth:780, margin:'0 auto' }}>
          <div className="sr" style={{ textAlign:'center', marginBottom:56 }}>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--teal)', letterSpacing:3, textTransform:'uppercase', display:'block', marginBottom:12 }}>FAQ</span>
            <h2 style={{ fontFamily:'Syne', fontWeight:800, fontSize:44, color:'var(--ink)', marginBottom:12 }}>Questions fréquentes</h2>
            <p style={{ color:'var(--slate)', fontSize:17 }}>Tout ce que vous voulez savoir sur DPM</p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {FAQS.map((faq, i) => (
              <div key={i} className="faq-row sr" onClick={() => setOpenFaq(openFaq===i ? null : i)}
                style={{ background:'#fff', border:`1.5px solid ${openFaq===i ? 'var(--teal)' : 'var(--border)'}`, borderRadius:16, padding:'20px 24px', transitionDelay:`${i*.04}s` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:16 }}>
                  <p style={{ fontFamily:'Syne', fontWeight:700, fontSize:15, color:'var(--ink)', margin:0 }}>{faq.q}</p>
                  <span style={{ color:'var(--teal)', fontSize:22, flexShrink:0, transition:'transform .3s', transform: openFaq===i ? 'rotate(45deg)' : 'rotate(0)' }}>+</span>
                </div>
                {openFaq === i && (
                  <p style={{ color:'var(--slate)', fontSize:14, lineHeight:1.8, marginTop:12, animation:'fadeIn .3s ease' }}>{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ CONTACT */}
      <section id="contact" style={{ background:'linear-gradient(140deg,var(--teal-dk),var(--teal))', padding:'100px 56px', position:'relative', overflow:'hidden' }}>
        <Particles count={16}/>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 20% 50%,rgba(255,255,255,.04),transparent 50%),radial-gradient(circle at 80% 20%,rgba(255,255,255,.04),transparent 50%)', pointerEvents:'none' }}/>

        <div style={{ maxWidth:1240, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:72, position:'relative', alignItems:'start' }}>

          {/* Infos */}
          <div className="sr">
            <span style={{ fontSize:12, fontWeight:700, color:'#7DD3DA', letterSpacing:3, textTransform:'uppercase', display:'block', marginBottom:12 }}>CONTACT</span>
            <h2 style={{ fontFamily:'Syne', fontWeight:800, fontSize:42, color:'#fff', marginBottom:14, lineHeight:1.2 }}>Parlons de votre cabinet</h2>
            <p style={{ color:'rgba(255,255,255,.68)', fontSize:16, lineHeight:1.8, marginBottom:40 }}>
              Une question ? Un besoin spécifique ? Notre équipe basée à Antananarivo est là pour vous accompagner.
            </p>
            {[
              {icon:'📧', label:'Email', val:'radisonfrancky@gmail.com', href:'mailto:radisonfrancky@gmail.com'},
              {icon:'📱', label:'Téléphone', val:'034 84 712 56', href:'tel:+261348471256'},
              {icon:'📍', label:'Adresse', val:'Tsiadana Ampasanimalo, Antananarivo'},
            ].map((c, i) => (
              <div key={i} style={{ display:'flex', gap:16, alignItems:'flex-start', marginBottom:24 }}>
                <div style={{ width:48, height:48, background:'rgba(255,255,255,.1)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                  {c.icon}
                </div>
                <div>
                  <div style={{ color:'rgba(255,255,255,.5)', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, marginBottom:4 }}>{c.label}</div>
                  {c.href
                    ? <a href={c.href} style={{ color:'#fff', fontWeight:600, fontSize:16, textDecoration:'none' }}>{c.val}</a>
                    : <div style={{ color:'#fff', fontWeight:600, fontSize:16 }}>{c.val}</div>}
                </div>
              </div>
            ))}
            <div style={{ marginTop:36, padding:'22px 26px', background:'rgba(255,255,255,.08)', borderRadius:18, border:'1px solid rgba(255,255,255,.15)', backdropFilter:'blur(10px)' }}>
              <p style={{ color:'rgba(255,255,255,.55)', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:1.5, marginBottom:12 }}>Prêt à commencer ?</p>
              <button onClick={() => open(PLANS[1])} className="btn-primary"
                style={{ padding:'13px 24px', borderRadius:12, background:'#fff', color:'var(--teal)', fontFamily:'Syne', fontWeight:800, fontSize:15, border:'none', cursor:'pointer' }}>
                Essai gratuit 7 jours ✨
              </button>
            </div>
          </div>

          {/* Formulaire */}
          <div className="sr" style={{ transitionDelay:'.15s' }}>
            {!contactSent ? (
              <div style={{ background:'rgba(255,255,255,.07)', borderRadius:24, padding:'36px 32px', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,.12)' }}>
                <h3 style={{ fontFamily:'Syne', fontWeight:800, fontSize:22, color:'#fff', marginBottom:24 }}>Envoyer un message</h3>
                {[
                  {label:'Votre nom', name:'nom', placeholder:'Dr. Rakoto Jean', type:'text'},
                  {label:'Email', name:'email', placeholder:'contact@cabinet.mg', type:'email'},
                ].map(f => (
                  <div key={f.name} style={{ marginBottom:16 }}>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color:'rgba(255,255,255,.65)', marginBottom:6 }}>{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder} value={contact[f.name]}
                      onChange={e => setContact(p => ({...p, [f.name]: e.target.value}))}
                      style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'1.5px solid rgba(255,255,255,.18)', background:'rgba(255,255,255,.08)', color:'#fff', fontSize:14, fontFamily:'DM Sans,sans-serif', outline:'none', transition:'border-color .2s' }}
                      onFocus={e => e.target.style.borderColor='rgba(255,255,255,.5)'}
                      onBlur={e => e.target.style.borderColor='rgba(255,255,255,.18)'}/>
                  </div>
                ))}
                <div style={{ marginBottom:22 }}>
                  <label style={{ display:'block', fontSize:13, fontWeight:600, color:'rgba(255,255,255,.65)', marginBottom:6 }}>Message</label>
                  <textarea rows={5} placeholder="Décrivez votre besoin..." value={contact.message}
                    onChange={e => setContact(p => ({...p, message: e.target.value}))}
                    style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'1.5px solid rgba(255,255,255,.18)', background:'rgba(255,255,255,.08)', color:'#fff', fontSize:14, fontFamily:'DM Sans,sans-serif', outline:'none', resize:'vertical', transition:'border-color .2s' }}
                    onFocus={e => e.target.style.borderColor='rgba(255,255,255,.5)'}
                    onBlur={e => e.target.style.borderColor='rgba(255,255,255,.18)'}/>
                </div>
                <button className="btn-primary"
                  onClick={() => { if(contact.nom && contact.email && contact.message) setContactSent(true); }}
                  style={{ width:'100%', padding:'14px', borderRadius:12, background:'#fff', color:'var(--teal)', fontFamily:'Syne', fontWeight:800, fontSize:15, border:'none', cursor:'pointer' }}>
                  Envoyer le message 📨
                </button>
              </div>
            ) : (
              <div style={{ background:'rgba(255,255,255,.07)', borderRadius:24, padding:'56px 32px', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,.12)', textAlign:'center' }}>
                <div style={{ fontSize:64, marginBottom:16, animation:'float 3s ease-in-out infinite' }}>✅</div>
                <h3 style={{ fontFamily:'Syne', fontWeight:800, fontSize:24, color:'#fff', marginBottom:10 }}>Message envoyé !</h3>
                <p style={{ color:'rgba(255,255,255,.68)', lineHeight:1.75 }}>
                  Merci {contact.nom} ! Nous vous répondrons à<br/><strong style={{color:'#fff'}}>{contact.email}</strong> sous 24h.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ CTA FINAL */}
      <section style={{ background:'var(--ink)', padding:'80px 56px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 30% 50%,rgba(13,122,135,.18),transparent 50%),radial-gradient(circle at 70% 50%,rgba(13,122,135,.12),transparent 50%)', pointerEvents:'none' }}/>
        <div style={{ maxWidth:620, margin:'0 auto', position:'relative' }}>
          <h2 style={{ fontFamily:'Syne', fontWeight:800, fontSize:44, color:'#fff', marginBottom:14, lineHeight:1.15 }}>
            Prêt à moderniser votre cabinet ? 🦷
          </h2>
          <p style={{ color:'rgba(255,255,255,.62)', fontSize:17, marginBottom:36, lineHeight:1.75 }}>
            Rejoignez les cabinets dentaires malgaches qui font confiance à DPM. Essai gratuit, sans engagement, sans carte bancaire.
          </p>
          <button onClick={() => open(PLANS[1])} className="btn-primary"
            style={{ padding:'18px 44px', borderRadius:14, background:'linear-gradient(135deg,var(--teal),var(--teal-lt))', color:'#fff', fontFamily:'Syne', fontWeight:800, fontSize:18, border:'none', cursor:'pointer', boxShadow:'var(--sh-teal)' }}>
            Commencer gratuitement — 7 jours ✨
          </button>
          <div style={{ marginTop:20, display:'flex', gap:20, justifyContent:'center', flexWrap:'wrap' }}>
            {['✅ Aucune carte bancaire','⚡ Opérationnel en 5 minutes','🇲🇬 Support en français'].map(b=>(
              <span key={b} style={{fontSize:13,color:'rgba(255,255,255,.45)'}}>{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════ FOOTER */}
      <footer style={{ background:'#050A0F', padding:'32px 56px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, background:'linear-gradient(135deg,var(--teal),var(--teal-lt))', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Logo size={22}/>
          </div>
          <span style={{ fontFamily:'Syne', fontWeight:800, color:'rgba(255,255,255,.8)', fontSize:16 }}>DPM Madagascar</span>
        </div>
        <div style={{ display:'flex', gap:20 }}>
          {[['#services','Services'],['#pourquoi','Pourquoi'],['#tarifs','Tarifs'],['#faq','FAQ'],['#contact','Contact']].map(([h,l])=>(
            <a key={h} href={h} style={{color:'rgba(255,255,255,.35)',fontSize:13,textDecoration:'none',transition:'color .2s'}} onMouseOver={e=>e.target.style.color='rgba(255,255,255,.7)'} onMouseOut={e=>e.target.style.color='rgba(255,255,255,.35)'}>{l}</a>
          ))}
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <span style={{ color:'rgba(255,255,255,.28)', fontSize:12 }}>© {new Date().getFullYear()} DPM Madagascar</span>
          <button onClick={() => navigate('/login')} style={{ padding:'6px 14px', borderRadius:8, border:'1px solid rgba(255,255,255,.15)', background:'transparent', color:'rgba(255,255,255,.5)', cursor:'pointer', fontSize:13, fontWeight:600, transition:'all .2s' }}
            onMouseOver={e=>{e.target.style.background='rgba(255,255,255,.08)';e.target.style.color='rgba(255,255,255,.8)';}}
            onMouseOut={e=>{e.target.style.background='transparent';e.target.style.color='rgba(255,255,255,.5)';}}>
            Connexion
          </button>
        </div>
      </footer>

      <InscriptionModal show={modal.show} plan={modal.plan} onClose={() => setModal({show:false,plan:null})} navigate={navigate}/>
    </div>
  );
}
