import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://dentalpm-1-production.up.railway.app/api';

/* ── Hook responsive ── */
const useScreen = () => {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return { isMobile: w < 768, isTablet: w >= 768 && w < 1024, w };
};

/* ── Typing hook ── */
const useTyping = (words, speed = 72, pause = 1900) => {
  const [text, setText] = useState('');
  const [wi, setWi] = useState(0);
  const [ci, setCi] = useState(0);
  const [del, setDel] = useState(false);
  useEffect(() => {
    const w = words[wi];
    const t = setTimeout(() => {
      if (!del) {
        setText(w.slice(0, ci + 1));
        if (ci + 1 === w.length) setTimeout(() => setDel(true), pause);
        else setCi(c => c + 1);
      } else {
        setText(w.slice(0, ci - 1));
        if (ci - 1 === 0) { setDel(false); setWi(i => (i + 1) % words.length); setCi(0); }
        else setCi(c => c - 1);
      }
    }, del ? speed / 2 : speed);
    return () => clearTimeout(t);
  });
  return text;
};

/* ── Scroll reveal ── */
const useScrollReveal = () => {
  useEffect(() => {
    const obs = new IntersectionObserver(
      es => es.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis'); }),
      { threshold: 0.08 }
    );
    document.querySelectorAll('.sr').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
};

/* ── CSS Global ── */
const GlobalCSS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    :root {
      --T:#0D7A87; --TD:#083D44; --TL:#13A3B4; --T10:rgba(13,122,135,.10); --T20:rgba(13,122,135,.20);
      --ink:#060D14; --slate:#3D4A5C; --muted:#8896A8;
      --border:#E4EAF0; --border2:#CDD5DF;
      --surf:#F6F9FC; --white:#FFFFFF;
      --gold:#E8A020; --gold-lt:#FFF3D6;
      --sh1:0 1px 4px rgba(6,13,20,.07);
      --sh2:0 4px 16px rgba(6,13,20,.09);
      --sh3:0 20px 60px rgba(6,13,20,.13);
      --sh-t:0 8px 32px rgba(13,122,135,.30);
      --r:14px; --r2:20px; --r3:28px;
    }
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    html { scroll-behavior:smooth; }
    body {
      font-family:'Plus Jakarta Sans', sans-serif;
      background:#fff; color:var(--ink);
      -webkit-font-smoothing:antialiased;
      overflow-x:hidden;
    }
    ::-webkit-scrollbar { width:4px; }
    ::-webkit-scrollbar-thumb { background:var(--T); border-radius:99px; }

    /* ── Animations ── */
    @keyframes fadeUp   { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:none} }
    @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
    @keyframes scaleIn  { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
    @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
    @keyframes pulse    { 0%,100%{opacity:.7;transform:scale(1)} 50%{opacity:1;transform:scale(1.06)} }
    @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:0} }
    @keyframes ticker   { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
    @keyframes shimmer  { 0%{background-position:-300% center} 100%{background-position:300% center} }
    @keyframes spin     { to{transform:rotate(360deg)} }
    @keyframes countUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
    @keyframes slideDown{ from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:none} }
    @keyframes gradMove { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }

    .au0 { animation:fadeUp .7s cubic-bezier(.22,1,.36,1) both }
    .au1 { animation:fadeUp .7s cubic-bezier(.22,1,.36,1) .08s both }
    .au2 { animation:fadeUp .7s cubic-bezier(.22,1,.36,1) .18s both }
    .au3 { animation:fadeUp .7s cubic-bezier(.22,1,.36,1) .28s both }
    .au4 { animation:fadeUp .7s cubic-bezier(.22,1,.36,1) .38s both }

    .sr { opacity:0; transform:translateY(22px); transition:opacity .65s ease, transform .65s cubic-bezier(.22,1,.36,1); }
    .sr.vis { opacity:1; transform:none; }

    /* ── Typography ── */
    .display { font-family:'Syne', sans-serif; }

    /* ── Shimmer text ── */
    .shimmer-teal {
      background: linear-gradient(90deg,#7DD3DA,#fff,#7DD3DA,#B2EBF2);
      background-size:300% auto;
      -webkit-background-clip:text; -webkit-text-fill-color:transparent;
      background-clip:text;
      animation:shimmer 3.5s linear infinite;
    }
    .shimmer-gold {
      background:linear-gradient(90deg,#F59E0B,#FDE68A,#F59E0B,#FCD34D);
      background-size:300% auto;
      -webkit-background-clip:text; -webkit-text-fill-color:transparent;
      background-clip:text;
      animation:shimmer 4s linear infinite;
    }

    /* ── Buttons ── */
    .btn-primary {
      display:inline-flex; align-items:center; justify-content:center; gap:8px;
      padding:14px 28px; border-radius:var(--r); background:var(--T); color:#fff;
      font-family:'Plus Jakarta Sans',sans-serif; font-weight:700; font-size:15px;
      border:none; cursor:pointer; position:relative; overflow:hidden;
      box-shadow:var(--sh-t); transition:transform .2s, box-shadow .2s, filter .2s;
    }
    .btn-primary::after {
      content:''; position:absolute; inset:0;
      background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.22) 50%,transparent 65%);
      transform:translateX(-100%); transition:transform .5s;
    }
    .btn-primary:hover::after { transform:translateX(100%); }
    .btn-primary:hover { transform:translateY(-2px); box-shadow:0 12px 36px rgba(13,122,135,.38); filter:brightness(1.07); }
    .btn-primary:active { transform:translateY(0); }

    .btn-ghost {
      display:inline-flex; align-items:center; justify-content:center; gap:8px;
      padding:13px 24px; border-radius:var(--r);
      background:transparent; color:rgba(255,255,255,.82);
      font-family:'Plus Jakarta Sans',sans-serif; font-weight:600; font-size:15px;
      border:1.5px solid rgba(255,255,255,.22); cursor:pointer;
      transition:all .2s; text-decoration:none;
    }
    .btn-ghost:hover { background:rgba(255,255,255,.08); border-color:rgba(255,255,255,.4); color:#fff; }

    .btn-white {
      display:inline-flex; align-items:center; justify-content:center; gap:8px;
      padding:14px 32px; border-radius:var(--r); background:#fff; color:var(--T);
      font-family:'Syne',sans-serif; font-weight:700; font-size:15px;
      border:none; cursor:pointer; transition:all .2s;
      box-shadow:0 12px 40px rgba(0,0,0,.18);
    }
    .btn-white:hover { transform:translateY(-2px); box-shadow:0 18px 50px rgba(0,0,0,.22); }

    /* ── Nav link ── */
    .nav-link {
      position:relative; padding:6px 12px; border-radius:8px;
      color:inherit; text-decoration:none; font-weight:500; font-size:14px;
      transition:color .2s, background .2s;
    }
    .nav-link:hover { color:var(--T) !important; background:var(--T10); }

    /* ── Cards ── */
    .card-hover {
      transition:transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s;
    }
    .card-hover:hover { transform:translateY(-6px); box-shadow:var(--sh3); }

    .feat-card {
      transition:all .25s ease; border-radius:var(--r);
    }
    .feat-card:hover { background:#F0FDFE !important; border-color:#7DD3DA !important; transform:translateX(4px); }

    /* ── Pain card ── */
    .pain-card {
      transition:all .28s cubic-bezier(.22,1,.36,1);
    }
    .pain-card:hover {
      background:rgba(255,255,255,.09) !important;
      border-color:rgba(255,255,255,.22) !important;
      transform:translateY(-5px);
    }

    /* ── Plan card ── */
    .plan-card {
      transition:transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s;
    }
    .plan-card:hover { transform:translateY(-10px); }

    /* ── Testimonial ── */
    .testi {
      transition:all .35s cubic-bezier(.22,1,.36,1);
      position:relative; overflow:hidden;
    }
    .testi::before {
      content:'❝'; position:absolute; top:-6px; right:18px;
      font-size:72px; color:rgba(13,122,135,.07); font-family:Georgia,serif;
      line-height:1; pointer-events:none;
    }
    .testi:hover { transform:translateY(-8px); box-shadow:0 24px 64px rgba(13,122,135,.13); }

    /* ── FAQ ── */
    .faq-row { transition:background .2s; cursor:pointer; }
    .faq-row:hover { background:var(--surf) !important; }

    /* ── Stat card ── */
    .stat-card { transition:transform .3s, box-shadow .3s; }
    .stat-card:hover { transform:translateY(-4px); box-shadow:var(--sh3); }

    /* ── Noise overlay ── */
    .noise::after {
      content:''; position:absolute; inset:0;
      background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      pointer-events:none; opacity:.4; border-radius:inherit;
    }

    /* ── Grid bg ── */
    .grid-bg {
      background-image:linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),
        linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px);
      background-size:64px 64px;
    }
    .grid-bg-light {
      background-image:linear-gradient(var(--border) 1px,transparent 1px),
        linear-gradient(90deg,var(--border) 1px,transparent 1px);
      background-size:48px 48px;
      opacity:.4;
    }
  `}</style>
);

/* ── Logo ── */
const Logo = ({ size = 36, glow = false }) => (
  <img src="/fix-logo.jpeg" alt="DPM Madagascar" width={size} height={size}
    style={{ borderRadius:'50%', objectFit:'cover', display:'block', flexShrink:0,
      filter: glow
        ? 'drop-shadow(0 0 18px rgba(13,122,135,.65)) drop-shadow(0 4px 14px rgba(0,0,0,.3))'
        : 'drop-shadow(0 2px 8px rgba(0,0,0,.22))' }}/>
);

/* ── FadeSlider ── */
const FadeSlider = ({ images, height = 480, interval = 4500 }) => {
  const [cur, setCur] = useState(0);
  const [prev, setPrev] = useState(null);
  useEffect(() => {
    const t = setInterval(() => {
      const next = (cur + 1) % images.length;
      setPrev(cur);
      setTimeout(() => { setCur(next); setPrev(null); }, 700);
    }, interval);
    return () => clearInterval(t);
  }, [cur, images.length, interval]);
  return (
    <div style={{ position:'relative', height, borderRadius:var_r2(), overflow:'hidden', boxShadow:'var(--sh3)' }}>
      {prev !== null && <img src={images[prev].src} alt="" style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',animation:'fadeIn .0s',opacity:0,zIndex:1 }}/>}
      <img key={cur} src={images[cur].src} alt={images[cur].alt} style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',animation:'fadeIn .9s ease both',zIndex:2 }}/>
      <div style={{ position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent 50%,rgba(6,13,20,.58) 100%)',zIndex:3 }}/>
      <div style={{ position:'absolute',bottom:14,left:16,right:16,zIndex:4 }}>
        <p style={{ color:'rgba(255,255,255,.85)',fontSize:12,fontWeight:500,margin:0 }}>{images[cur].caption}</p>
      </div>
      <div style={{ position:'absolute',bottom:14,right:16,zIndex:5,display:'flex',gap:5 }}>
        {images.map((_,i) => <div key={i} onClick={()=>setCur(i)} style={{ width:i===cur?20:6,height:6,borderRadius:99,background:i===cur?'#fff':'rgba(255,255,255,.35)',cursor:'pointer',transition:'all .35s' }}/>)}
      </div>
    </div>
  );
};
const var_r2 = () => '20px';

/* ── Ticker ── */
const Ticker = ({ items }) => (
  <div style={{ overflow:'hidden', position:'relative' }}>
    <div style={{ display:'flex', gap:56, animation:'ticker 22s linear infinite', width:'max-content' }}>
      {[...items, ...items].map((item, i) => (
        <div key={i} style={{ whiteSpace:'nowrap', fontSize:13, fontWeight:600, color:'var(--muted)', letterSpacing:.5, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--T)', display:'inline-block', opacity:.5 }}/>
          {item}
        </div>
      ))}
    </div>
  </div>
);

/* ── DashMockup ── */
const DashMockup = () => {
  const [tab, setTab] = useState(0);
  const tabs = ['Dashboard', 'Patients', 'Finances', 'Agenda', 'Odonto'];
  useEffect(() => { const t = setInterval(() => setTab(i => (i + 1) % 5), 3500); return () => clearInterval(t); }, []);
  const Donut = ({ pct, color }) => { const r=26,c=2*Math.PI*r; return(<svg width={64} height={64} viewBox="0 0 64 64"><circle cx={32} cy={32} r={r} fill="none" stroke="#F1F5F9" strokeWidth={7}/><circle cx={32} cy={32} r={r} fill="none" stroke={color} strokeWidth={7} strokeDasharray={`${(pct/100)*c} ${c}`} strokeLinecap="round" transform="rotate(-90 32 32)" style={{transition:'stroke-dasharray 1.2s'}}/><text x={32} y={36} textAnchor="middle" fontSize={11} fontWeight={800} fill={color}>{pct}%</text></svg>); };
  const screens = [
    <div key={0}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}>
        {[{l:'RDV auj.',v:'8',c:'#0D7A87',i:'📅'},{l:'Patients',v:'247',c:'#7C3AED',i:'👤'},{l:'CA mois',v:'1.2M Ar',c:'#10B981',i:'💰'}].map((k,i)=>(
          <div key={i} style={{background:'#F8FAFC',borderRadius:10,padding:'10px 8px',border:'1px solid #E2E8F0'}}>
            <div style={{fontSize:18,marginBottom:3}}>{k.i}</div>
            <div style={{fontFamily:'Syne',fontWeight:800,fontSize:18,color:k.c}}>{k.v}</div>
            <div style={{fontSize:10,color:'#94A3B8',marginTop:2}}>{k.l}</div>
          </div>
        ))}
      </div>
      <div style={{fontSize:11,fontWeight:600,color:'#64748B',marginBottom:6}}>CA mensuel (Ar)</div>
      <svg width="100%" viewBox="0 0 200 52" style={{overflow:'visible'}}>
        <defs><linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0D7A87" stopOpacity=".2"/><stop offset="100%" stopColor="#0D7A87" stopOpacity="0"/></linearGradient></defs>
        {(()=>{ const pts=[90,140,110,185,160,225,195,260],W=200,H=48,mn=Math.min(...pts),mx=Math.max(...pts),xs=pts.map((_,i)=>(i/(pts.length-1))*W),ys=pts.map(p=>H-((p-mn)/(mx-mn||1))*(H-10)-5),d=xs.map((x,i)=>`${i?'L':'M'}${x},${ys[i]}`).join(' ');return(<><path d={`${d} L${W},${H} L0,${H}Z`} fill="url(#dg)"/><path d={d} fill="none" stroke="#0D7A87" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>{xs.map((x,i)=><circle key={i} cx={x} cy={ys[i]} r={3} fill="#0D7A87" stroke="#fff" strokeWidth={1.5}/>)}</>); })()}
      </svg>
    </div>,
    <div key={1}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:11}}><span style={{fontWeight:700,fontSize:13,color:'#0F172A'}}>Patients du jour</span><span style={{background:'#F0FDFE',color:'#0D7A87',borderRadius:99,padding:'2px 10px',fontSize:11,fontWeight:700}}>247</span></div>
      {[{n:'Rakoto Jean',h:'09:00',s:'Confirmé',c:'#10B981',b:'#D1FAE5'},{n:'Rasoa Marie',h:'10:30',s:'En attente',c:'#F59E0B',b:'#FEF3C7'},{n:'Andry Paul',h:'11:00',s:'Confirmé',c:'#10B981',b:'#D1FAE5'},{n:'Hanta Elisa',h:'14:00',s:'Nouveau',c:'#7C3AED',b:'#EDE9FE'}].map((p,i)=>(
        <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',background:'#F8FAFC',borderRadius:10,marginBottom:5,border:'1px solid #F1F5F9'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#0D7A87,#13A3B4)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11,fontWeight:800}}>{p.n[0]}</div><div><div style={{fontWeight:700,fontSize:12,color:'#0F172A'}}>{p.n}</div><div style={{fontSize:10,color:'#94A3B8'}}>RDV {p.h}</div></div></div>
          <span style={{background:p.b,color:p.c,borderRadius:99,padding:'2px 8px',fontSize:10,fontWeight:700}}>{p.s}</span>
        </div>
      ))}
    </div>,
    <div key={2}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}><span style={{fontWeight:700,fontSize:13}}>Rapports financiers</span><span style={{background:'#D1FAE5',color:'#065F46',borderRadius:99,padding:'2px 9px',fontSize:11,fontWeight:700}}>+18% ce mois</span></div>
      <div style={{display:'flex',justifyContent:'space-around',marginBottom:14}}><Donut pct={78} color="#0D7A87"/><Donut pct={92} color="#10B981"/><Donut pct={65} color="#F59E0B"/></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
        {[{l:'Occupation',v:'78%'},{l:'Paiements',v:'92%'},{l:'Objectif',v:'65%'}].map((s,i)=>(
          <div key={i} style={{textAlign:'center',background:'#F8FAFC',borderRadius:8,padding:'8px 4px',border:'1px solid #E2E8F0'}}><div style={{fontFamily:'Syne',fontWeight:800,fontSize:14,color:'#0F172A'}}>{s.v}</div><div style={{fontSize:10,color:'#94A3B8'}}>{s.l}</div></div>
        ))}
      </div>
    </div>,
    <div key={3}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:11}}><span style={{fontWeight:700,fontSize:13}}>Agenda du jour</span><span style={{fontSize:11,color:'#94A3B8'}}>{new Date().toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})}</span></div>
      <div style={{display:'grid',gridTemplateColumns:'36px 1fr',gap:'3px 8px'}}>
        {[{h:'08:30',n:'Détartrage',d:'Dr. Rakoto',c:'#0D7A87',bg:'#F0FDFE',dur:'45min'},{h:'09:15',n:'Carie M16',d:'Dr. Rasoa',c:'#7C3AED',bg:'#F5F3FF',dur:'30min'},{h:'10:00',n:'Couronne',d:'Dr. Rakoto',c:'#F59E0B',bg:'#FFFBEB',dur:'90min'},{h:'14:00',n:'Extraction',d:'Dr. Andry',c:'#EF4444',bg:'#FFF1F2',dur:'45min'}].map((r,i)=>(
          <React.Fragment key={i}><span style={{fontSize:9,color:'#94A3B8',fontWeight:700,paddingTop:7}}>{r.h}</span><div style={{background:r.bg,borderLeft:`3px solid ${r.c}`,borderRadius:'0 8px 8px 0',padding:'5px 9px',marginBottom:4}}><div style={{fontSize:11,fontWeight:700,color:r.c}}>{r.n}</div><div style={{fontSize:10,color:'#94A3B8'}}>{r.d} · {r.dur}</div></div></React.Fragment>
        ))}
      </div>
    </div>,
    <div key={4}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:11}}><span style={{fontWeight:700,fontSize:13}}>Odontogramme FDI</span><span style={{fontSize:11,color:'#0D7A87',fontWeight:700}}>Rakoto J.</span></div>
      {[{l:'Maxillaire',t:[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28]},{l:'Mandibule',t:[48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38]}].map((row,ri)=>(
        <div key={ri} style={{marginBottom:ri===0?10:0}}>
          <div style={{fontSize:9,color:'#94A3B8',fontWeight:600,marginBottom:4}}>{row.l}</div>
          <div style={{display:'flex',gap:2,justifyContent:'center',flexWrap:'wrap'}}>
            {row.t.map(t=>{const s={16:'#EF4444',21:'#F59E0B',36:'#EF4444',26:'#10B981',11:'#7C3AED',46:'#F59E0B'};const c=s[t]||'#E2E8F0';return(<div key={t} style={{width:20,height:22,background:c,borderRadius:3,display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,fontWeight:800,color:s[t]?'#fff':'#94A3B8',border:`1px solid ${c==='#E2E8F0'?'#CBD5E1':c}`}}>{t}</div>);})}
          </div>
        </div>
      ))}
      <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
        {[{c:'#EF4444',l:'Carie'},{c:'#F59E0B',l:'Obturation'},{c:'#10B981',l:'Sain'},{c:'#7C3AED',l:'Couronne'}].map(s=>(
          <div key={s.l} style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:10,height:10,background:s.c,borderRadius:2}}/><span style={{fontSize:10,color:'#64748B'}}>{s.l}</span></div>
        ))}
      </div>
    </div>,
  ];
  return (
    <div style={{ background:'#fff', borderRadius:20, padding:'14px 16px', boxShadow:'0 28px 72px rgba(6,13,20,.18)', border:'1px solid #E2E8F0', display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:12, paddingBottom:10, borderBottom:'1px solid #F1F5F9' }}>
        <div style={{ width:9,height:9,borderRadius:'50%',background:'#FF5F57' }}/><div style={{ width:9,height:9,borderRadius:'50%',background:'#FFBD2E' }}/><div style={{ width:9,height:9,borderRadius:'50%',background:'#28CA41' }}/>
        <div style={{ flex:1,background:'#F8FAFC',borderRadius:6,padding:'4px 10px',marginLeft:8,display:'flex',alignItems:'center',gap:6 }}>
          <div style={{ width:6,height:6,borderRadius:'50%',background:'#10B981' }}/><span style={{ fontSize:10,color:'#94A3B8' }}>app.dentalpracticemada.com</span>
        </div>
      </div>
      <div style={{ display:'flex',gap:3,marginBottom:11,flexWrap:'wrap' }}>
        {tabs.map((t,i)=><button key={i} onClick={()=>setTab(i)} style={{ padding:'4px 9px',borderRadius:7,border:'none',cursor:'pointer',background:tab===i?'#0D7A87':'#F1F5F9',color:tab===i?'#fff':'#64748B',fontSize:10,fontWeight:700,transition:'all .2s',fontFamily:'inherit' }}>{t}</button>)}
      </div>
      <div style={{ flex:1, animation:'fadeIn .3s ease' }} key={tab}>{screens[tab]}</div>
      <div style={{ display:'flex',gap:4,justifyContent:'center',marginTop:10 }}>
        {tabs.map((_,i)=><div key={i} onClick={()=>setTab(i)} style={{ width:i===tab?18:6,height:5,borderRadius:99,background:i===tab?'#0D7A87':'#E2E8F0',cursor:'pointer',transition:'all .3s' }}/>)}
      </div>
    </div>
  );
};

/* ── Counter ── */
const Counter = ({ end, suffix = '', label, sub, color = 'var(--T)' }) => {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const fired = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !fired.current) {
        fired.current = true;
        let cur = 0; const step = end / 55;
        const t = setInterval(() => { cur += step; if (cur >= end) { setN(end); clearInterval(t); } else setN(Math.floor(cur)); }, 18);
      }
    }, { threshold: .5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end]);
  return (
    <div ref={ref} className="stat-card" style={{ background:'#fff', borderRadius:var_r2(), padding:'22px 18px', border:'1px solid var(--border)', boxShadow:'var(--sh1)', animation:'countUp .6s ease both', textAlign:'center' }}>
      <div style={{ fontFamily:'Syne', fontWeight:800, fontSize:40, color, lineHeight:1, marginBottom:5 }}>{n}{suffix}</div>
      <div style={{ fontWeight:700, fontSize:14, color:'var(--ink)', marginBottom:4 }}>{label}</div>
      {sub && <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.4 }}>{sub}</div>}
    </div>
  );
};

/* ── Data ── */
const PLANS = [
  { name:'ESSENTIAL', price:'149 000', popular:false, stripe:'https://buy.stripe.com/eVqeV66VS1S84A43NDcfK01', desc:'Idéal pour les cabinets solo',
    features:["1 praticien + 1 assistant(e)","Jusqu'à 500 patients","Agenda & rendez-vous","Facturation de base","Ordonnances PDF","Odontogramme FDI","Support email"] },
  { name:'PRO', price:'199 000', popular:true, stripe:'https://buy.stripe.com/aFa9AM4NK54k1nSfwlcfK00', desc:'Le plus choisi par nos clients',
    features:['5 praticiens','Patients illimités','Agenda avancé + rappels SMS','Facturation complète','Laboratoire dentaire','Inventaire & stock','Rapports financiers','SMS automatiques','Support prioritaire'] },
  { name:'GROUP', price:'299 000', popular:false, stripe:'https://buy.stripe.com/9B614gbc8aoE3w05VLcfK02', desc:'Pour les groupes et multi-sites',
    features:['Praticiens illimités','Multi-sites','Patients illimités','Tout le plan PRO','API dédiée','Dashboard groupe','Gestionnaire dédié','Formation sur site incluse'] },
];
const FEATURES_LIST = [
  {tag:'Agenda',icon:'📅',title:'Agenda intelligent',desc:"Rendez-vous, rappels SMS automatiques, optimisation du planning.",color:'#0D7A87'},
  {tag:'Dossiers',icon:'👤',title:'Dossiers patients unifiés',desc:"Historique complet, odontogramme FDI interactif, imagerie sécurisée.",color:'#7C3AED'},
  {tag:'Facturation',icon:'🧾',title:'Facturation & Devis',desc:"Factures et devis en 30 secondes. MVola, Orange Money, espèces.",color:'#10B981'},
  {tag:'Ordonnances',icon:'💊',title:'Ordonnances PDF',desc:"Génération instantanée avec signature du praticien. Format Madagascar.",color:'#F59E0B'},
  {tag:'Inventaire',icon:'📦',title:'Stock & Inventaire',desc:"Suivi temps réel, alertes stock minimum, gestion fournisseurs.",color:'#EF4444'},
  {tag:'Laboratoire',icon:'🔬',title:'Laboratoire dentaire',desc:"Commandes prothèses, suivi délais et correspondance dossiers.",color:'#0D7A87'},
  {tag:'Rapports',icon:'📊',title:'Rapports & Analytics',desc:"CA mensuel, taux remplissage, actes fréquents. Données temps réel.",color:'#7C3AED'},
  {tag:'SMS',icon:'💬',title:'SMS automatiques',desc:"Rappels RDV, anniversaires, relances patients inactifs automatiques.",color:'#10B981'},
];
const FAQS = [
  {q:"Comment fonctionne l'essai gratuit de 7 jours ?",a:"Créez votre compte en 2 minutes, sans carte bancaire. Accès immédiat à toutes les fonctionnalités PRO. À la fin, choisissez votre plan et payez via MVola, Orange Money ou virement BNI."},
  {q:"Mes données patients sont-elles sécurisées ?",a:"Oui. Chiffrement de bout en bout, sauvegarde automatique quotidienne, hébergement sécurisé. Confidentialité médicale respectée, aucune donnée partagée avec des tiers."},
  {q:"Puis-je annuler à tout moment ?",a:"Oui, sans engagement ni pénalité. Annulez depuis votre espace cabinet en un clic. Vos données restent accessibles jusqu'à la fin de la période payée."},
  {q:"Combien de patients avec le plan ESSENTIAL ?",a:"Le plan ESSENTIAL gère jusqu'à 500 patients actifs pour 1 praticien + 1 assistant(e). Le plan PRO offre des patients illimités dès 199 000 Ar/mois."},
  {q:"Comment fonctionne le paiement mensuel ?",a:"Envoyez votre paiement par MVola (034), Orange Money (032), Airtel Money (033) ou virement Banquière. Notre équipe valide sous 24h et votre abonnement est renouvelé automatiquement."},
  {q:"DPM fonctionne-t-il sur mobile ?",a:"Oui, 100% responsive. Fonctionne parfaitement sur ordinateur, tablette et smartphone. Gérez votre cabinet depuis n'importe où à Madagascar."},
  {q:"Puis-je migrer mes données existantes ?",a:"Oui. Notre équipe vous accompagne gratuitement dans la migration de vos données patients. Contactez-nous sur radisonfrancky@gmail.com."},
  {q:"Y a-t-il une formation pour utiliser DPM ?",a:"Le plan GROUP inclut une formation personnalisée sur site. Pour tous les plans, documentation complète, tutoriels vidéo et support en français inclus."},
];
const TEMOIGNAGES = [
  {nom:'Dr. Rakoto Jean',role:'Chirurgien-dentiste, Antananarivo',note:5,txt:"DPM a transformé la gestion de mon cabinet. Je passe moins de temps sur l'administratif et plus de temps avec mes patients. La facturation est devenu un jeu d'enfant."},
  {nom:'Dr. Rasoa Marie',role:'Orthodontiste, Fianarantsoa',note:5,txt:"L'odontogramme digital est remarquable. Je suis l'évolution de chaque dent avec précision. Les rappels SMS ont réduit mes rendez-vous manqués de 70%."},
  {nom:'Dr. Randria Paul',role:'Cabinet de groupe, Toamasina',note:5,txt:"3 praticiens, DPM gère tout parfaitement. Les rapports financiers nous donnent une visibilité totale. Je le recommande à tous mes confrères malgaches."},
];
const IMGS_SERVICES = [
  {src:'/2.jpg',alt:'Chirurgien dentiste',caption:'🦷 Précision et excellence dans chaque soin'},
  {src:'/3.jpg',alt:'Cabinet moderne',caption:'🏥 Cabinet dentaire moderne et équipé'},
  {src:'/4.jpg',alt:'Examen',caption:'🔍 Diagnostic précis et professionnel'},
];
const IMGS_ABOUT = [
  {src:'/daniero.jpg',alt:'Équipe DPM',caption:'🤝 Notre équipe à votre service'},
  {src:'/612314406_2121491475327414_7965256401016505944_n.jpg',alt:'Technologie',caption:'🇲🇬 Fièrement Made in Madagascar'},
  {src:'/1.jpg',alt:'Équipe',caption:'💎 Excellence et proximité'},
];

/* ── Modal Inscription ── */
const InscriptionModal = ({ show, plan, onClose, navigate }) => {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ cabinet:'', email:'', phone:'', city:'', dentists:'1' });
  const inp = { width:'100%', padding:'12px 14px', borderRadius:12, border:'1.5px solid var(--border)', fontSize:15, fontFamily:'Plus Jakarta Sans, sans-serif', outline:'none', transition:'border-color .2s, box-shadow .2s', background:'#fff' };
  const focus = e => { e.target.style.borderColor='var(--T)'; e.target.style.boxShadow='0 0 0 3px rgba(13,122,135,.1)'; };
  const blur  = e => { e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none'; };
  const submit = async () => {
    setLoading(true);
    try { await axios.post(`${API_URL}/auth/register-clinic`, { ...form, plan: plan?.name || 'PRO' }); setDone(true); }
    catch (e) { alert(e.response?.data?.error || 'Erreur. Vérifiez vos informations.'); }
    finally { setLoading(false); }
  };
  if (!show) return null;
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed',inset:0,zIndex:9999,background:'rgba(6,13,20,.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'flex-end',justifyContent:'center',animation:'fadeIn .2s ease' }}>
      <div style={{ background:'#fff',borderRadius:'24px 24px 0 0',padding:'28px 24px 36px',maxWidth:520,width:'100%',maxHeight:'96vh',overflowY:'auto',position:'relative',animation:'scaleIn .3s cubic-bezier(.22,1,.36,1)' }}>
        <div style={{ width:40,height:4,borderRadius:99,background:'var(--border)',margin:'0 auto 20px' }}/>
        <button onClick={onClose} style={{ position:'absolute',top:16,right:16,width:32,height:32,borderRadius:'50%',background:'var(--surf)',border:'none',cursor:'pointer',fontSize:17,color:'var(--muted)',display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
        {!done ? (
          <>
            <div style={{ display:'flex', gap:5, marginBottom:20 }}>
              {[1,2].map(s => <div key={s} style={{ flex:1,height:3,borderRadius:99,background:step>=s?'var(--T)':'var(--border)',transition:'background .3s' }}/>)}
            </div>
            <h2 style={{ fontFamily:'Syne',fontWeight:800,fontSize:20,color:'var(--ink)',marginBottom:6 }}>
              {step === 1 ? '🚀 Démarrer votre essai gratuit' : '💳 Modalités de paiement'}
            </h2>
            {plan && <div style={{ background:'#F0FDFE',border:'1.5px solid var(--T)',borderRadius:12,padding:'10px 14px',margin:'10px 0 16px',display:'flex',justifyContent:'space-between' }}>
              <span style={{ fontWeight:700,color:'var(--T)',fontSize:14 }}>Plan {plan.name}</span>
              <span style={{ fontFamily:'Syne',fontWeight:800,color:'var(--T)',fontSize:16 }}>{plan.price} Ar/mois</span>
            </div>}
            {step === 1 && (
              <div>
                {[{label:'Nom du cabinet',name:'cabinet',ph:'Cabinet Dentaire Dr. Rakoto',type:'text'},{label:'Email professionnel',name:'email',ph:'contact@cabinet.mg',type:'email'},{label:'Téléphone MVola / Orange',name:'phone',ph:'034 XX XXX XX',type:'tel'},{label:'Ville',name:'city',ph:'Antananarivo',type:'text'}].map(f => (
                  <div key={f.name} style={{ marginBottom:12 }}>
                    <label style={{ display:'block',fontSize:13,fontWeight:600,color:'var(--slate)',marginBottom:5 }}>{f.label} *</label>
                    <input type={f.type} placeholder={f.ph} required value={form[f.name]} onChange={e => setForm(p => ({...p,[f.name]:e.target.value}))} style={inp} onFocus={focus} onBlur={blur}/>
                  </div>
                ))}
                <div style={{ marginBottom:18 }}>
                  <label style={{ display:'block',fontSize:13,fontWeight:600,color:'var(--slate)',marginBottom:5 }}>Nombre de praticiens</label>
                  <select value={form.dentists} onChange={e => setForm(p => ({...p,dentists:e.target.value}))} style={{ ...inp,cursor:'pointer' }}>
                    {['1 praticien','2-3 praticiens','4-5 praticiens','5+ praticiens'].map((o,i) => <option key={i} value={[1,'2-3','4-5','5+'][i]}>{o}</option>)}
                  </select>
                </div>
                <button className="btn-primary" disabled={!form.cabinet||!form.email||!form.phone||!form.city} onClick={() => setStep(2)}
                  style={{ width:'100%',padding:'15px',borderRadius:13,fontSize:16,opacity:(!form.cabinet||!form.email||!form.phone||!form.city)?.5:1 }}>
                  Continuer →
                </button>
              </div>
            )}
            {step === 2 && (
              <div>
                <p style={{ color:'var(--slate)',fontSize:14,lineHeight:1.7,marginBottom:14 }}>Votre <strong>essai de 7 jours</strong> commence immédiatement. À la fin, payez par :</p>
                {[{n:'MVola',num:'034 XX XXX XX',c:'#E30613'},{n:'Orange Money',num:'032 XX XXX XX',c:'#FF6600'},{n:'Airtel Money',num:'033 XX XXX XX',c:'#E4002B'},{n:'Virement BNI',num:'RIB sur demande',c:'#1A3A5C'}].map(p => (
                  <div key={p.n} style={{ background:'var(--surf)',border:'1px solid var(--border)',borderRadius:11,padding:'10px 14px',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                    <span style={{ fontWeight:700,color:p.c,fontSize:14 }}>{p.n}</span>
                    <span style={{ color:'var(--muted)',fontSize:13 }}>{p.num}</span>
                  </div>
                ))}
                {plan?.stripe && (
                  <a href={plan.stripe} target="_blank" rel="noopener noreferrer"
                    style={{ display:'block',width:'100%',marginTop:14,padding:'14px',borderRadius:13,background:'#635BFF',color:'#fff',fontWeight:700,fontSize:15,textDecoration:'none',textAlign:'center',boxSizing:'border-box' }}>
                    💳 Payer directement avec Stripe →
                  </a>
                )}
                <div style={{ display:'flex',alignItems:'center',gap:8,margin:'10px 0',color:'var(--muted)',fontSize:12 }}>
                  <div style={{ flex:1,height:1,background:'var(--border)' }}/><span>ou</span><div style={{ flex:1,height:1,background:'var(--border)' }}/>
                </div>
                <button className="btn-primary" onClick={submit} disabled={loading} style={{ width:'100%',padding:'15px',borderRadius:13,fontSize:15,opacity:loading?.6:1 }}>
                  {loading ? '⏳ Création...' : '✓ Confirmer (paiement Mobile Money)'}
                </button>
                <button onClick={() => setStep(1)} style={{ width:'100%',marginTop:8,padding:9,background:'none',color:'var(--muted)',border:'none',cursor:'pointer',fontSize:13,fontFamily:'inherit' }}>← Retour</button>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign:'center', padding:'8px 0' }}>
            <div style={{ fontSize:58,marginBottom:14,animation:'float 3s ease-in-out infinite' }}>🎉</div>
            <h2 style={{ fontFamily:'Syne',fontWeight:800,fontSize:22,color:'var(--ink)',marginBottom:8 }}>Bienvenue sur DPM !</h2>
            <p style={{ color:'var(--slate)',lineHeight:1.8,marginBottom:18 }}>Cabinet <strong>{form.cabinet}</strong> créé !<br/>Identifiants envoyés à <strong>{form.email}</strong></p>
            <div style={{ background:'#F0FDFE',border:'1.5px solid var(--T)',borderRadius:14,padding:'13px 16px',marginBottom:18,textAlign:'left' }}>
              <p style={{ margin:0,fontSize:13,color:'var(--T)',fontWeight:700 }}>🕐 Votre essai de 7 jours est activé !</p>
              <p style={{ margin:'4px 0 0',color:'var(--slate)',fontSize:13 }}>Connectez-vous avec les identifiants reçus par email.</p>
            </div>
            <button className="btn-primary" onClick={() => navigate('/login')} style={{ width:'100%',padding:'15px',borderRadius:13,fontSize:16 }}>
              Accéder à mon espace →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useScreen();
  const [scrolled, setScrolled]     = useState(false);
  const [modal, setModal]           = useState({ show:false, plan:null });
  const [openFaq, setOpenFaq]       = useState(null);
  const [contact, setContact]       = useState({ nom:'', email:'', message:'' });
  const [contactSent, setContactSent] = useState(false);
  const [mobMenu, setMobMenu]       = useState(false);
  const typed = useTyping(['patients & rendez-vous','facturation Ariary','ordonnances PDF','laboratoire dentaire','inventaire & stock'], 68, 2000);
  useScrollReveal();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const open = plan => setModal({ show:true, plan });

  /* ── Layout helpers ── */
  const px  = isMobile ? '20px' : isTablet ? '32px' : '60px';
  const py  = isMobile ? '56px' : '100px';
  const c2  = isMobile ? '1fr' : '1fr 1fr';
  const c3  = isMobile ? '1fr' : isTablet ? 'repeat(2,1fr)' : 'repeat(3,1fr)';
  const c4  = isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)';
  const fs1 = isMobile ? 30 : isTablet ? 42 : 64;
  const fs2 = isMobile ? 24 : isTablet ? 32 : 46;
  const sc  = scrolled || mobMenu;

  /* ── Section title helper ── */
  const ST = ({ tag, title, sub, light = false, center = false }) => (
    <div style={{ marginBottom: isMobile ? 28 : 52, textAlign: center ? 'center' : 'left' }}>
      <div style={{ display:'inline-flex', alignItems:'center', gap:7, background: light ? 'rgba(255,255,255,.1)' : '#F0FDFE', border:`1px solid ${light ? 'rgba(255,255,255,.2)' : '#7DD3DA'}`, borderRadius:99, padding:'5px 14px', marginBottom:14 }}>
        <span style={{ fontSize:11, fontWeight:700, color: light ? '#7DD3DA' : 'var(--T)', letterSpacing:'.06em', textTransform:'uppercase' }}>{tag}</span>
      </div>
      <h2 className="display" style={{ fontFamily:'Syne', fontWeight:800, fontSize:fs2, color: light ? '#fff' : 'var(--ink)', lineHeight:1.12, marginBottom:14 }}>{title}</h2>
      {sub && <p style={{ fontSize: isMobile ? 14 : 17, color: light ? 'rgba(255,255,255,.65)' : 'var(--slate)', maxWidth: center ? 560 : 520, margin: center ? '0 auto' : 0, lineHeight:1.78 }}>{sub}</p>}
    </div>
  );

  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", background:'#fff', minHeight:'100vh', overflowX:'hidden' }}>
      <GlobalCSS/>

      {/* ══ NAV ══ */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:200, background: sc ? 'rgba(255,255,255,.96)' : 'transparent', backdropFilter: sc ? 'blur(24px)' : 'none', borderBottom: sc ? '1px solid rgba(228,234,240,.9)' : 'none', boxShadow: sc ? '0 1px 24px rgba(6,13,20,.07)' : 'none', transition:'all .3s ease' }}>
        <div style={{ padding:`0 ${px}`, height: isMobile ? 60 : 74, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
            <Logo size={isMobile ? 44 : 60} glow={!sc}/>
            <div style={{ display:'flex', flexDirection:'column', lineHeight:1 }}>
              <span style={{ fontFamily:'Syne', fontWeight:800, fontSize: isMobile ? 15 : 19, color: sc ? 'var(--ink)' : '#fff', letterSpacing:'-0.01em', lineHeight:1.1 }}>Madagascar</span>
              <span style={{ fontSize: isMobile ? 10 : 11, fontWeight:600, color: sc ? 'var(--muted)' : 'rgba(255,255,255,.5)', letterSpacing:'.07em', textTransform:'uppercase', marginTop:2 }}>Cabinet Dentaire</span>
            </div>
          </div>

          {/* Desktop nav */}
          {!isMobile && (
            <div style={{ display:'flex', gap:2, alignItems:'center' }}>
              {[['#services','Fonctionnalités'],['#pourquoi','Avantages'],['#tarifs','Tarifs'],['#faq','FAQ'],['#contact','Contact']].map(([href, label]) => (
                <a key={href} href={href} className="nav-link" style={{ color: sc ? 'var(--slate)' : 'rgba(255,255,255,.82)' }}>{label}</a>
              ))}
              <button onClick={() => navigate('/login')} style={{ marginLeft:8, padding:'8px 18px', borderRadius:10, border:`1.5px solid ${sc ? 'var(--border)' : 'rgba(255,255,255,.28)'}`, background:'transparent', color: sc ? 'var(--ink)' : '#fff', fontWeight:600, fontSize:14, cursor:'pointer', fontFamily:'inherit', transition:'all .2s' }}>Connexion</button>
              <button onClick={() => open(PLANS[1])} className="btn-primary" style={{ marginLeft:8, padding:'9px 20px', borderRadius:10, fontSize:14 }}>Essai gratuit 7j →</button>
            </div>
          )}

          {/* Mobile nav */}
          {isMobile && (
            <div style={{ display:'flex', alignItems:'center', gap:9 }}>
              <button onClick={() => open(PLANS[1])} className="btn-primary" style={{ padding:'8px 14px', borderRadius:10, fontSize:13 }}>Essai gratuit</button>
              <button onClick={() => setMobMenu(m => !m)} style={{ width:38, height:38, borderRadius:9, background: sc ? 'var(--surf)' : 'rgba(255,255,255,.12)', border:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:5 }}>
                {[0,1,2].map(i => <div key={i} style={{ width:18, height:2, borderRadius:99, background: sc ? 'var(--ink)' : '#fff', transition:'all .25s', transform: mobMenu && i===0 ? 'rotate(45deg) translate(5px,5px)' : mobMenu && i===2 ? 'rotate(-45deg) translate(5px,-5px)' : mobMenu && i===1 ? 'scaleX(0)' : 'none' }}/>)}
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu */}
        {isMobile && mobMenu && (
          <div style={{ background:'rgba(255,255,255,.97)', borderTop:'1px solid var(--border)', padding:'10px 16px 20px', display:'flex', flexDirection:'column', gap:2, animation:'slideDown .22s ease' }}>
            {[['#services','Fonctionnalités'],['#pourquoi','Avantages'],['#tarifs','Tarifs'],['#faq','FAQ'],['#contact','Contact']].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMobMenu(false)} style={{ padding:'11px 14px', color:'var(--ink)', fontWeight:600, fontSize:15, textDecoration:'none', borderRadius:9 }}>{label}</a>
            ))}
            <div style={{ height:1, background:'var(--border)', margin:'6px 0' }}/>
            <button onClick={() => { navigate('/login'); setMobMenu(false); }} style={{ padding:'11px 14px', borderRadius:9, border:'1.5px solid var(--border)', background:'#fff', color:'var(--ink)', fontWeight:600, fontSize:15, cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>Connexion</button>
          </div>
        )}
      </nav>

      {/* ══ HERO ══ */}
      <section style={{ background:'linear-gradient(145deg, var(--TD) 0%, #0A5F6A 45%, #0D7A87 80%, #0E8A9A 100%)', minHeight:'100vh', display:'flex', alignItems:'center', padding: isMobile ? '96px 20px 60px' : isTablet ? '110px 32px 70px' : '124px 60px 80px', position:'relative', overflow:'hidden' }}>
        {/* Background grid */}
        <div className="grid-bg" style={{ position:'absolute', inset:0, pointerEvents:'none' }}/>
        {/* Orbs */}
        <div style={{ position:'absolute', top:'8%', left:'5%', width: isMobile?200:420, height: isMobile?200:420, borderRadius:'50%', background:'radial-gradient(circle,rgba(13,122,135,.5),transparent 68%)', filter:'blur(70px)', animation:'float 14s ease-in-out infinite', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:'5%', right:'5%', width: isMobile?160:320, height: isMobile?160:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(125,211,218,.32),transparent 70%)', filter:'blur(55px)', animation:'float 18s ease-in-out infinite reverse', pointerEvents:'none' }}/>
        {/* Thin decorative line */}
        <div style={{ position:'absolute', top:0, left: isMobile?'auto':px, right: isMobile?px:'auto', width:1, height:'100%', background:'linear-gradient(to bottom, transparent, rgba(255,255,255,.1) 30%, rgba(255,255,255,.1) 70%, transparent)', pointerEvents:'none' }}/>

        <div style={{ maxWidth:1200, margin:'0 auto', width:'100%', display:'grid', gridTemplateColumns:c2, gap: isMobile?36:72, alignItems:'center' }}>
          {/* Left */}
          <div>
            {/* Badge */}
            <div className="au0" style={{ display:'inline-flex', alignItems:'center', gap:9, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)', borderRadius:99, padding: isMobile ? '7px 14px' : '8px 20px', marginBottom: isMobile ? 22 : 32 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#7DD3DA', display:'inline-block', animation:'pulse 2s ease-in-out infinite' }}/>
              <span style={{ fontSize: isMobile ? 11 : 13, color:'rgba(255,255,255,.9)', fontWeight:600 }}>🇲🇬 N°1 des logiciels dentaires à Madagascar</span>
            </div>

            {/* H1 */}
            <h1 className="au1 display" style={{ fontFamily:'Syne', fontWeight:800, fontSize:fs1, lineHeight:1.08, color:'#fff', marginBottom:16, letterSpacing:'-0.02em' }}>
              Logiciel de<br/>
              Gestion<br/>
              <span className="shimmer-teal">Cabinet Dentaire</span>
            </h1>

            {/* Typing line */}
            <div className="au2" style={{ height:34, marginBottom:18, display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:3, height:18, background:'var(--TL)', borderRadius:99, flexShrink:0 }}/>
              <span style={{ fontSize: isMobile ? 14 : 18, color:'rgba(255,255,255,.62)' }}>
                Simplifiez vos <span style={{ color:'#7DD3DA', fontWeight:600 }}>{typed}</span>
                <span style={{ animation:'blink 1s step-end infinite', color:'#7DD3DA' }}>|</span>
              </span>
            </div>

            {/* Description */}
            <p className="au2" style={{ fontSize: isMobile ? 14 : 16, color:'rgba(255,255,255,.65)', lineHeight:1.8, marginBottom: isMobile ? 26 : 38, maxWidth:500 }}>
              DPM centralise toute la gestion de votre cabinet — patients, agenda, facturation, ordonnances, laboratoire. Simple, rapide, 100% adapté aux réalités malgaches.
            </p>

            {/* CTA buttons */}
            <div className="au3" style={{ display:'flex', gap:11, flexWrap:'wrap', marginBottom: isMobile ? 22 : 36 }}>
              <button onClick={() => open(PLANS[1])} className="btn-white" style={{ padding: isMobile ? '13px 20px' : '15px 32px', fontSize: isMobile ? 14 : 16, width: isMobile ? '100%' : 'auto' }}>
                Essayer gratuitement — 7 jours 🚀
              </button>
              <a href="#tarifs" className="btn-ghost" style={{ padding: isMobile ? '12px 18px' : '14px 26px', fontSize: isMobile ? 14 : 15, width: isMobile ? '100%' : 'auto' }}>
                Voir les tarifs →
              </a>
            </div>

            {/* Trust badges */}
            <div className="au4" style={{ display:'flex', gap: isMobile ? 14 : 26, flexWrap:'wrap' }}>
              {['🔒 Données sécurisées', '📱 MVola & Orange Money', '🇲🇬 Support en français'].map(b => (
                <span key={b} style={{ fontSize: isMobile ? 11 : 13, color:'rgba(255,255,255,.48)', fontWeight:500 }}>{b}</span>
              ))}
            </div>
          </div>

          {/* Dashboard mockup */}
          {!isMobile && (
            <div className="au3" style={{ position:'relative' }}>
              <div style={{ height: isTablet ? 400 : 500, transform:'perspective(1000px) rotateY(-3deg) rotateX(2deg)', transition:'transform .5s ease' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'perspective(1000px) rotateY(-1deg) rotateX(1deg)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'perspective(1000px) rotateY(-3deg) rotateX(2deg)'}>
                <DashMockup/>
              </div>
              {/* Floating badges */}
              <div style={{ position:'absolute', bottom:-18, left:-22, background:'#fff', borderRadius:16, padding:'12px 18px', boxShadow:'var(--sh3)', display:'flex', alignItems:'center', gap:10, animation:'float 4s ease-in-out infinite', zIndex:10 }}>
                <span style={{ fontSize:22 }}>🦷</span>
                <div>
                  <div style={{ fontFamily:'Syne', fontWeight:800, color:'var(--T)', fontSize:14 }}>+50 cabinets</div>
                  <div style={{ color:'var(--muted)', fontSize:11 }}>font confiance à DPM</div>
                </div>
              </div>
              <div style={{ position:'absolute', top:-16, right:-14, background:'linear-gradient(135deg,var(--T),var(--TL))', borderRadius:14, padding:'10px 16px', boxShadow:'var(--sh-t)', animation:'float 5.5s ease-in-out infinite reverse', zIndex:10 }}>
                <div style={{ color:'#fff', fontWeight:700, fontSize:12 }}>⭐ 98% satisfaction</div>
              </div>
              {/* Glow under mockup */}
              <div style={{ position:'absolute', bottom:-30, left:'10%', right:'10%', height:60, background:'radial-gradient(ellipse,rgba(13,122,135,.4),transparent 70%)', filter:'blur(20px)', pointerEvents:'none' }}/>
            </div>
          )}
        </div>

        {/* Scroll cue */}
        {!isMobile && (
          <div style={{ position:'absolute', bottom:28, left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:5, opacity:.35, pointerEvents:'none' }}>
            <span style={{ fontSize:9, color:'#fff', letterSpacing:3, textTransform:'uppercase' }}>Défiler</span>
            <div style={{ width:1, height:36, background:'linear-gradient(#fff,transparent)', animation:'float 2s ease-in-out infinite' }}/>
          </div>
        )}
      </section>

      {/* ══ PAIN POINTS ══ */}
      <section style={{ background:'var(--ink)', padding:`${isMobile?'60px 20px':'92px '+px}`, position:'relative', overflow:'hidden' }}>
        <div className="grid-bg" style={{ position:'absolute', inset:0, pointerEvents:'none' }}/>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 15% 50%,rgba(13,122,135,.16),transparent 55%),radial-gradient(ellipse at 85% 20%,rgba(13,122,135,.10),transparent 55%)', pointerEvents:'none' }}/>
        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative' }}>
          {/* Header */}
          <div className="sr" style={{ textAlign:'center', marginBottom: isMobile?36:68 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:'rgba(239,68,68,.12)', border:'1px solid rgba(239,68,68,.25)', borderRadius:99, padding:'5px 14px', marginBottom:16 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'#FCA5A5', letterSpacing:'.06em', textTransform:'uppercase' }}>⚠️ Vous reconnaissez-vous ?</span>
            </div>
            <h2 className="display" style={{ fontFamily:'Syne', fontWeight:800, fontSize: isMobile?26:isTablet?36:50, color:'#fff', lineHeight:1.12, marginBottom:16 }}>
              Ces problèmes freinent<br/>
              <span style={{ color:'#5EEAD4' }}>votre cabinet au quotidien</span>
            </h2>
            <p style={{ fontSize: isMobile?14:17, color:'rgba(255,255,255,.55)', maxWidth:540, margin:'0 auto', lineHeight:1.75 }}>
              Des heures perdues en administratif, des factures à refaire, des rendez-vous oubliés... Ça vous parle ?
            </p>
          </div>

          {/* Pain cards */}
          <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':isTablet?'repeat(2,1fr)':'repeat(3,1fr)', gap: isMobile?12:18, marginBottom: isMobile?36:64 }}>
            {[
              {icon:'📋',q:'Dossiers patients encore sur papier ?',pain:'Des heures à chercher une fiche, risque de perte, impossible de partager entre praticiens.',color:'#EF4444'},
              {icon:'🧾',q:'Une facture vous prend plus de 10 minutes ?',pain:'Calculs manuels, erreurs fréquentes, format non standard — et le patient qui attend.',color:'#F59E0B'},
              {icon:'📅',q:'Des patients oublient leurs rendez-vous ?',pain:"Des créneaux vides, du temps perdu, et un chiffre d'affaires qui s'évapore chaque semaine.",color:'#8B5CF6'},
              {icon:'📦',q:'Votre stock vous réserve des surprises ?',pain:'Commandes oubliées, ruptures en plein soin, produits périmés découverts trop tard.',color:'#10B981'},
              {icon:'💊',q:'Rédiger une ordonnance prend trop de temps ?',pain:"Écriture manuelle, illisibilité, risque d'erreurs de dosage, pas de trace numérique.",color:'#F59E0B'},
              {icon:'📊',q:'Vos revenus restent flous chaque mois ?',pain:'Pas de tableau de bord, revenus opaques, impossible de planifier ou prouver la rentabilité.',color:'#0D7A87'},
            ].map((item, i) => (
              <div key={i} className="sr pain-card" onClick={() => open(PLANS[1])}
                style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:var_r2(), padding: isMobile?'20px 18px':'28px 24px', cursor:'pointer', transitionDelay:`${i*.06}s`, position:'relative', overflow:'hidden' }}>
                <div style={{ width:46, height:46, borderRadius:14, background:`${item.color}18`, border:`1px solid ${item.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, marginBottom:14 }}>{item.icon}</div>
                <p style={{ fontFamily:'Syne', fontWeight:700, fontSize: isMobile?14:15, color:'#fff', lineHeight:1.45, marginBottom:10 }}>{item.q}</p>
                <p style={{ fontSize: isMobile?12:13, color:'rgba(255,255,255,.42)', lineHeight:1.68, margin:0 }}>{item.pain}</p>
                <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${item.color}55,transparent)`, borderRadius:'0 0 20px 20px' }}/>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="sr" style={{ textAlign:'center' }}>
            <div style={{ background:'linear-gradient(135deg,rgba(13,122,135,.22),rgba(13,163,180,.10))', border:'1px solid rgba(13,122,135,.38)', borderRadius:24, padding: isMobile?'30px 22px':'40px 56px', display:'inline-block', width:'100%', maxWidth:640 }}>
              <p style={{ fontFamily:'Syne', fontWeight:800, fontSize: isMobile?20:28, color:'#fff', marginBottom:10, lineHeight:1.25 }}>
                ✅ DPM résout tout ça.<br/><span style={{ color:'#7DD3DA' }}>En quelques secondes.</span>
              </p>
              <p style={{ fontSize: isMobile?13:15, color:'rgba(255,255,255,.58)', marginBottom:24, lineHeight:1.65 }}>
                Rejoignez les cabinets dentaires malgaches qui ont repris le contrôle de leur gestion.
              </p>
              <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
                <button onClick={() => open(PLANS[1])} className="btn-primary" style={{ padding: isMobile?'13px 22px':'15px 32px', fontSize: isMobile?14:16 }}>
                  Essayer gratuitement — 7 jours 🚀
                </button>
                <a href="#tarifs" className="btn-ghost" style={{ padding: isMobile?'12px 18px':'14px 24px', fontSize: isMobile?13:15 }}>Voir les tarifs →</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ STATS ══ */}
      <section style={{ background:'#fff', padding:`${isMobile?'40px':'64px'} ${px}`, borderBottom:'1px solid var(--border)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 110%,rgba(13,122,135,.05),transparent 65%)', pointerEvents:'none' }}/>
        <div style={{ maxWidth:1000, margin:'0 auto', display:'grid', gridTemplateColumns:c4, gap: isMobile?10:22, position:'relative' }}>
          <Counter end={50} suffix="+" label="+50 cabinets" sub="clients actifs à Madagascar"/>
          <Counter end={98} suffix="%" label="98% satisfaction" sub="notés par nos praticiens"/>
          <Counter end={3} suffix=" s" label="Facture générée" sub="rapide et professionnelle"/>
          <Counter end={24} suffix="/7" label="Support 24/7" sub="Équipe à Antananarivo"/>
        </div>
      </section>

      {/* ══ TICKER ══ */}
      <section style={{ padding:`${isMobile?'16px':'28px'} 0`, borderBottom:'1px solid var(--border)', overflow:'hidden', background:'var(--surf)' }}>
        <Ticker items={['MVola Telma','Orange Money','Airtel Money','Virement Banquière','Cabinet Dentaire','Chirurgien-Dentiste','Implantologie','Orthodontie','Pédodontie','Prothèse Dentaire']}/>
      </section>

      {/* ══ FEATURES OVERVIEW ══ */}
      <section style={{ padding:`${py} ${px}`, maxWidth:1200, margin:'0 auto' }}>
        <div className="sr" style={{ textAlign:'center', marginBottom: isMobile?32:72 }}>
          <ST tag="🧩 DPM Madagascar" title={<>Votre Cabinet Dentaire,<br/>digitalisé et optimisé</>} sub="Une solution complète qui centralise tous vos outils — de la planification intelligente des RDV à la génération d'ordonnances PDF." center/>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:c2, gap: isMobile?8:14 }}>
          {FEATURES_LIST.map((f, i) => (
            <div key={i} className="feat-card sr" style={{ display:'flex', gap:14, alignItems:'flex-start', padding: isMobile?'14px':'22px 24px', background:'var(--surf)', border:'1px solid var(--border)', borderRadius:var_r2(), transitionDelay:`${i*.05}s`, cursor:'pointer' }}>
              <div style={{ width: isMobile?40:50, height: isMobile?40:50, borderRadius:14, background:`${f.color}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize: isMobile?20:26, flexShrink:0 }}>{f.icon}</div>
              <div>
                <span style={{ fontSize:10, fontWeight:700, color:f.color, textTransform:'uppercase', letterSpacing:1.4, display:'block', marginBottom:4 }}>{f.tag}</span>
                <div style={{ fontFamily:'Syne', fontWeight:700, fontSize: isMobile?13:16, color:'var(--ink)', marginBottom: isMobile?0:4 }}>{f.title}</div>
                {!isMobile && <div style={{ fontSize:13, color:'var(--slate)', lineHeight:1.65 }}>{f.desc}</div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ SERVICES ══ */}
      <section id="services" style={{ background:'var(--surf)', padding:`${py} ${px}` }}>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'grid', gridTemplateColumns:c2, gap: isMobile?32:72, alignItems:'center' }}>
          <div className="sr">
            <ST tag="📸 En images" title="Un logiciel pensé pour la réalité malgache"/>
            <div style={{ display:'flex', flexDirection:'column', gap:13, marginBottom:26 }}>
              {['Odontogramme FDI complet avec historique par dent','Facturation en Ariary — MVola, Orange Money, espèces','Ordonnances PDF format standard Madagascar','Gestion laboratoire prothèses et implants','Inventaire matériel avec alertes stock automatiques'].map((item, i) => (
                <div key={i} style={{ display:'flex', gap:11, alignItems:'flex-start' }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', background:'#F0FDFE', border:'2px solid var(--T)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                    <span style={{ color:'var(--T)', fontWeight:800, fontSize:10 }}>✓</span>
                  </div>
                  <span style={{ color:'var(--slate)', fontSize: isMobile?13:15, lineHeight:1.65 }}>{item}</span>
                </div>
              ))}
            </div>
            <button onClick={() => open(PLANS[1])} className="btn-primary" style={{ padding:'13px 26px', fontSize:15, width: isMobile?'100%':'auto' }}>
              Essayer gratuitement →
            </button>
          </div>
          <div className="sr" style={{ transitionDelay:'.15s' }}>
            <FadeSlider images={IMGS_SERVICES} height={isMobile?240:480} interval={4200}/>
          </div>
        </div>
      </section>

      {/* ══ CTA MID ══ */}
      <section style={{ background:'var(--TD)', padding:`${isMobile?'48px':'84px'} ${px}`, position:'relative', overflow:'hidden' }}>
        <div className="grid-bg" style={{ position:'absolute', inset:0, pointerEvents:'none' }}/>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 25% 50%,rgba(13,122,135,.25),transparent 50%),radial-gradient(circle at 75% 50%,rgba(13,122,135,.18),transparent 50%)', pointerEvents:'none' }}/>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'grid', gridTemplateColumns:c2, gap: isMobile?28:64, alignItems:'center', position:'relative' }}>
          <div className="sr">
            <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.15)', borderRadius:99, padding:'5px 14px', marginBottom:18 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'#7DD3DA', letterSpacing:'.06em', textTransform:'uppercase' }}>✦ Rejoignez DPM</span>
            </div>
            <h2 className="display" style={{ fontFamily:'Syne', fontWeight:800, fontSize: isMobile?26:44, color:'#fff', lineHeight:1.12, marginBottom:16 }}>
              <span style={{ color:'#FACC15' }}>Révolutionnez</span> la gestion<br/>
              <span style={{ color:'#5EEAD4' }}>de votre cabinet</span>
            </h2>
            <p style={{ color:'rgba(255,255,255,.62)', fontSize: isMobile?14:16, lineHeight:1.78, marginBottom:20 }}>Transformez votre cabinet dentaire en quelques minutes. Interface moderne, fonctionnalités complètes, sécurité maximale.</p>
            {['✓ Démonstration en 7 jours gratuits', '✓ Prise en main en 30 minutes', '✓ Support technique prioritaire'].map(item => (
              <div key={item} style={{ fontSize: isMobile?13:14, color:'rgba(255,255,255,.7)', marginBottom:7 }}>{item}</div>
            ))}
          </div>
          <div className="sr" style={{ transitionDelay:'.15s', display:'flex', flexDirection:'column', gap:12 }}>
            <button onClick={() => open(PLANS[1])} className="btn-white" style={{ padding:'17px 32px', fontSize: isMobile?15:17 }}>
              Commencer maintenant →
            </button>
            <a href="#tarifs" className="btn-ghost" style={{ padding:'15px 32px', textAlign:'center', fontSize: isMobile?14:15 }}>Voir les tarifs</a>
            <div style={{ display:'flex', gap:22, justifyContent:'center', marginTop:4, flexWrap:'wrap' }}>
              {[{v:'⚡',l:'3 secondes'},{v:'🇲🇬',l:'Made in Mada'},{v:'🔒',l:'Sécurisé'}].map(b => (
                <div key={b.l} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:20 }}>{b.v}</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.42)', marginTop:2 }}>{b.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ POURQUOI ══ */}
      <section id="pourquoi" style={{ padding:`${py} ${px}`, maxWidth:1200, margin:'0 auto' }}>
        <div className="sr" style={{ textAlign:'center', marginBottom: isMobile?28:64 }}>
          <ST tag="💡 Nos avantages" title="Pourquoi choisir DPM ?" sub="Ce qui nous différencie de toute autre solution sur le marché malgache" center/>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:c3, gap: isMobile?12:20 }}>
          {[
            {icon:'🇲🇬',t:'100% Madagascar',d:"Ariary, MVola, Orange Money, français, normes malgaches. Conçu par des Malgaches pour les Malgaches.",c:'#0D7A87'},
            {icon:'💰',t:'Prix accessible',d:"À partir de 149 000 Ar/mois soit 4 900 Ar par jour. Le meilleur rapport qualité/prix du marché.",c:'#10B981'},
            {icon:'⚡',t:'Simple et rapide',d:"Opérationnel en 30 minutes. Interface intuitive, pas besoin d'informaticien. Formation incluse.",c:'#F59E0B'},
            {icon:'🔒',t:'Données sécurisées',d:"Chiffrement de bout en bout, sauvegarde quotidienne automatique, hébergement sécurisé.",c:'#7C3AED'},
            {icon:'📱',t:'Multi-appareils',d:"Ordinateur, tablette et smartphone. Gérez votre cabinet depuis n'importe où à Madagascar.",c:'#EF4444'},
            {icon:'🤝',t:'Support réactif',d:"Équipe basée à Antananarivo, réponse sous 24h. En français, par des Malgaches.",c:'#0D7A87'},
          ].map((a, i) => (
            <div key={i} className="sr card-hover" style={{ background:'var(--surf)', border:'1px solid var(--border)', borderRadius:var_r2(), padding: isMobile?'20px 18px':'30px 26px', transitionDelay:`${i*.07}s` }}>
              <div style={{ width:48, height:48, borderRadius:14, background:`${a.c}10`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, marginBottom:14 }}>{a.icon}</div>
              <h3 className="display" style={{ fontFamily:'Syne', fontWeight:700, fontSize: isMobile?15:18, color:'var(--ink)', marginBottom:8 }}>{a.t}</h3>
              <p style={{ color:'var(--slate)', fontSize: isMobile?12:14, lineHeight:1.7 }}>{a.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ TÉMOIGNAGES ══ */}
      <section style={{ background:'var(--surf)', padding:`${py} ${px}` }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div className="sr" style={{ textAlign:'center', marginBottom: isMobile?28:64 }}>
            <ST tag="⭐ Avis clients" title="Ils nous font confiance" sub="Des chirurgiens-dentistes satisfaits à travers toute Madagascar" center/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:c3, gap: isMobile?12:24, marginBottom: isMobile?20:48 }}>
            {TEMOIGNAGES.map((t, i) => (
              <div key={i} className="sr testi" style={{ background:'#fff', borderRadius:var_r2(), padding: isMobile?'20px 18px':'30px 28px', border:'1px solid var(--border)', boxShadow:'var(--sh1)', transitionDelay:`${i*.1}s` }}>
                <div style={{ display:'flex', gap:2, marginBottom:12 }}>
                  {Array(5).fill(0).map((_, j) => <span key={j} style={{ color:'#F59E0B', fontSize:15 }}>★</span>)}
                </div>
                <p style={{ color:'var(--slate)', fontSize: isMobile?13:15, lineHeight:1.82, marginBottom:18, fontStyle:'italic' }}>&ldquo;{t.txt}&rdquo;</p>
                <div style={{ display:'flex', alignItems:'center', gap:11, paddingTop:14, borderTop:'1px solid var(--border)' }}>
                  <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,var(--T),var(--TL))', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:'Syne', fontWeight:800, fontSize:15, flexShrink:0 }}>{t.nom.split(' ').pop()[0]}</div>
                  <div>
                    <div style={{ fontFamily:'Syne', fontWeight:700, color:'var(--ink)', fontSize:13 }}>{t.nom}</div>
                    <div style={{ color:'var(--muted)', fontSize:11 }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:c2, gap: isMobile?10:22 }}>
            <div className="sr"><FadeSlider images={[{src:'/7.webp',alt:'Soin',caption:'🦷 Soins de qualité pour chaque patient'},{src:'/6.webp',alt:'Cabinet',caption:'🏥 Cabinet professionnel et équipé'}]} height={isMobile?190:280} interval={4500}/></div>
            <div className="sr" style={{ transitionDelay:'.15s' }}><FadeSlider images={[{src:'/8.webp',alt:'Tech',caption:'🏥 Technologie au service du soin'},{src:'/5.webp',alt:'Dentiste',caption:'💎 Excellence clinique quotidienne'}]} height={isMobile?190:280} interval={5200}/></div>
          </div>
        </div>
      </section>

      {/* ══ À PROPOS ══ */}
      <section style={{ padding:`${py} ${px}`, maxWidth:1200, margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:c2, gap: isMobile?32:72, alignItems:'center' }}>
          <div className="sr">
            <ST tag="🏥 À propos" title="Notre mission : simplifier votre quotidien"/>
            <p style={{ color:'var(--slate)', fontSize: isMobile?14:16, lineHeight:1.88, marginBottom:13 }}>
              DPM est né d'un constat simple : les chirurgiens-dentistes malgaches méritent des outils modernes adaptés à leur réalité. Nous avons créé la solution qu'aucun éditeur international ne pouvait offrir.
            </p>
            <p style={{ color:'var(--slate)', fontSize: isMobile?14:16, lineHeight:1.88, marginBottom:28 }}>
              Notre équipe basée à Antananarivo améliore continuellement la plateforme avec les retours directs des praticiens.
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:24 }}>
              {[{v:'2024',l:'Année de création'},{v:'Tana',l:'Basé à Antananarivo'},{v:'🇲🇬',l:'Made in Madagascar'},{v:'24/7',l:'Support disponible'}].map((s, i) => (
                <div key={i} style={{ background:'var(--surf)', borderRadius:var_r2(), padding: isMobile?'14px 12px':'20px 18px', border:'1px solid var(--border)', textAlign:'center' }}>
                  <div style={{ fontFamily:'Syne', fontWeight:800, fontSize: isMobile?22:28, color:'var(--T)' }}>{s.v}</div>
                  <div style={{ color:'var(--muted)', fontSize: isMobile?11:13, marginTop:3 }}>{s.l}</div>
                </div>
              ))}
            </div>
            <button onClick={() => open(PLANS[1])} className="btn-primary" style={{ padding:'13px 26px', fontSize:15, width: isMobile?'100%':'auto' }}>Rejoindre DPM →</button>
          </div>
          <div className="sr" style={{ transitionDelay:'.15s' }}>
            <FadeSlider images={IMGS_ABOUT} height={isMobile?260:520} interval={5000}/>
          </div>
        </div>
      </section>

      {/* ══ TARIFS ══ */}
      <section id="tarifs" style={{ background:'var(--surf)', padding:`${py} ${px}` }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div className="sr" style={{ textAlign:'center', marginBottom: isMobile?28:64 }}>
            <ST tag="💰 Tarifs" title="Simple et transparent" sub="7 jours d'essai gratuit, sans carte bancaire. Résiliable à tout moment." center/>
            <p style={{ color:'var(--T)', fontWeight:600, fontSize: isMobile?12:14, marginTop:-16 }}>💳 MVola · Orange Money · Airtel Money · Virement Banquière</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:c3, gap: isMobile?14:22, alignItems:'start' }}>
            {PLANS.map((plan, i) => (
              <div key={plan.name} className="plan-card sr" style={{ background:'#fff', borderRadius:var_r2(), padding: isMobile?'24px 20px':'34px 28px', border: plan.popular ? '2.5px solid var(--T)' : '1px solid var(--border)', boxShadow: plan.popular ? 'var(--sh-t)' : 'var(--sh1)', position:'relative', transitionDelay:`${i*.1}s` }}>
                {plan.popular && <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', background:'var(--T)', color:'#fff', padding:'4px 16px', borderRadius:99, fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>⭐ Le plus populaire</div>}
                {!plan.popular && i===2 && <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', background:'#7C3AED', color:'#fff', padding:'4px 16px', borderRadius:99, fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>🏆 Premium</div>}
                <div style={{ fontFamily:'Syne', fontWeight:800, fontSize:18, color: plan.popular ? 'var(--T)' : 'var(--ink)', marginBottom:4 }}>{plan.name}</div>
                <div style={{ fontSize:12, color:'var(--muted)', marginBottom:14 }}>{plan.desc}</div>
                <div style={{ marginBottom:20 }}>
                  <span style={{ fontFamily:'Syne', fontWeight:800, fontSize: isMobile?30:42, color:'var(--T)' }}>{plan.price}</span>
                  <span style={{ color:'var(--muted)', fontSize:13 }}> Ar/mois</span>
                </div>
                {/* Progress-like divider */}
                <div style={{ height:2, background:'linear-gradient(90deg,var(--T),transparent)', borderRadius:99, marginBottom:18, opacity: plan.popular?1:.3 }}/>
                <ul style={{ listStyle:'none', padding:0, marginBottom:22 }}>
                  {plan.features.map((f, j) => (
                    <li key={j} style={{ display:'flex', gap:9, alignItems:'flex-start', marginBottom:8, color:'var(--slate)', fontSize: isMobile?12:14 }}>
                      <span style={{ color:'var(--T)', fontWeight:800, flexShrink:0, fontSize:13 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <a href={plan.stripe} target="_blank" rel="noopener noreferrer"
                    style={{ display:'block', width:'100%', padding:'12px', borderRadius:12, background: plan.popular ? 'var(--T)' : 'transparent', color: plan.popular ? '#fff' : 'var(--T)', fontWeight:700, fontSize:14, border:`2px solid var(--T)`, textDecoration:'none', textAlign:'center', boxSizing:'border-box', fontFamily:'inherit' }}>
                    Payer avec Stripe →
                  </a>
                  <button onClick={() => open(plan)} style={{ width:'100%', padding:'10px', borderRadius:12, background:'transparent', color:'var(--muted)', fontWeight:600, fontSize:13, border:'1px solid var(--border)', cursor:'pointer', fontFamily:'inherit' }}>
                    Essai gratuit 7 jours
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section id="faq" style={{ padding:`${py} ${px}`, maxWidth:820, margin:'0 auto' }}>
        <div className="sr" style={{ textAlign:'center', marginBottom: isMobile?24:60 }}>
          <ST tag="❓ FAQ" title="Questions fréquentes" sub="Tout ce que vous voulez savoir sur DPM" center/>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {FAQS.map((faq, i) => (
            <div key={i} className="faq-row sr" onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{ background: openFaq===i ? 'var(--surf)' : '#fff', border:`1.5px solid ${openFaq===i?'var(--T)':'var(--border)'}`, borderRadius:var_r2(), padding: isMobile?'16px':'22px 26px', transitionDelay:`${i*.04}s`, transition:'all .2s' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:14 }}>
                <p style={{ fontFamily:'Syne', fontWeight:700, fontSize: isMobile?13:15, color:'var(--ink)', margin:0, lineHeight:1.4 }}>{faq.q}</p>
                <div style={{ width:28, height:28, borderRadius:'50%', background: openFaq===i?'var(--T)':'var(--surf)', border:`1px solid ${openFaq===i?'var(--T)':'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .3s' }}>
                  <span style={{ color: openFaq===i?'#fff':'var(--T)', fontSize:16, fontWeight:300, transform: openFaq===i?'rotate(45deg)':'rotate(0)', display:'block', transition:'transform .3s', lineHeight:1 }}>+</span>
                </div>
              </div>
              {openFaq === i && <p style={{ color:'var(--slate)', fontSize: isMobile?13:14, lineHeight:1.82, marginTop:12, animation:'fadeIn .3s ease' }}>{faq.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ══ CONTACT ══ */}
      <section id="contact" style={{ background:'var(--TD)', padding:`${py} ${px}`, position:'relative', overflow:'hidden' }}>
        <div className="grid-bg" style={{ position:'absolute', inset:0, pointerEvents:'none' }}/>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 25% 50%,rgba(13,122,135,.22),transparent 50%),radial-gradient(circle at 75% 20%,rgba(13,122,135,.14),transparent 50%)', pointerEvents:'none' }}/>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'grid', gridTemplateColumns:c2, gap: isMobile?32:72, position:'relative', alignItems:'start' }}>
          <div className="sr">
            <div style={{ display:'inline-flex', alignItems:'center', gap:7, background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.15)', borderRadius:99, padding:'5px 14px', marginBottom:18 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'#7DD3DA', letterSpacing:'.06em', textTransform:'uppercase' }}>📨 Contact</span>
            </div>
            <h2 className="display" style={{ fontFamily:'Syne', fontWeight:800, fontSize: isMobile?26:44, color:'#fff', marginBottom:14, lineHeight:1.12 }}>
              Parlons de<br/><span style={{ color:'#5EEAD4' }}>votre cabinet</span>
            </h2>
            <p style={{ color:'rgba(255,255,255,.62)', fontSize: isMobile?14:16, lineHeight:1.78, marginBottom:30 }}>Notre équipe à Antananarivo est disponible pour répondre à toutes vos questions.</p>
            {[{icon:'📧',label:'Email',val:'contact@dentalpracticemada.com',href:'mailto:contact@dentalpracticemada.com'},{icon:'📱',label:'Téléphone',val:'034 84 712 56',href:'tel:+261348471256'},{icon:'📍',label:'Adresse',val:'Tsiadana Ampasanimalo, Antananarivo'}].map((c, i) => (
              <div key={i} style={{ display:'flex', gap:13, alignItems:'flex-start', marginBottom:20 }}>
                <div style={{ width:44, height:44, background:'rgba(255,255,255,.08)', borderRadius:13, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{c.icon}</div>
                <div>
                  <div style={{ color:'rgba(255,255,255,.42)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1.4, marginBottom:3 }}>{c.label}</div>
                  {c.href ? <a href={c.href} style={{ color:'#fff', fontWeight:600, fontSize: isMobile?14:16, textDecoration:'none' }}>{c.val}</a> : <div style={{ color:'#fff', fontWeight:600, fontSize: isMobile?14:16 }}>{c.val}</div>}
                </div>
              </div>
            ))}
            <div style={{ marginTop:22, padding:'18px 20px', background:'rgba(255,255,255,.06)', borderRadius:16, border:'1px solid rgba(255,255,255,.1)' }}>
              <p style={{ color:'rgba(255,255,255,.48)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:1.4, marginBottom:11 }}>PRÊT À COMMENCER ?</p>
              <button onClick={() => open(PLANS[1])} className="btn-white" style={{ padding:'12px 22px', fontSize:14, width: isMobile?'100%':'auto' }}>
                Essai gratuit 7 jours 🚀
              </button>
            </div>
          </div>

          <div className="sr" style={{ transitionDelay:'.15s' }}>
            {!contactSent ? (
              <div style={{ background:'rgba(255,255,255,.07)', borderRadius:24, padding: isMobile?'24px 20px':'36px 32px', backdropFilter:'blur(14px)', border:'1px solid rgba(255,255,255,.1)' }}>
                <h3 className="display" style={{ fontFamily:'Syne', fontWeight:800, fontSize: isMobile?18:22, color:'#fff', marginBottom:20 }}>Envoyer un message</h3>
                {[{l:'Votre nom',n:'nom',ph:'Dr. Rakoto Jean',t:'text'},{l:'Email',n:'email',ph:'contact@cabinet.mg',t:'email'}].map(f => (
                  <div key={f.n} style={{ marginBottom:13 }}>
                    <label style={{ display:'block', fontSize:13, fontWeight:600, color:'rgba(255,255,255,.55)', marginBottom:6 }}>{f.l}</label>
                    <input type={f.t} placeholder={f.ph} value={contact[f.n]} onChange={e => setContact(p => ({...p,[f.n]:e.target.value}))}
                      style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'1.5px solid rgba(255,255,255,.14)', background:'rgba(255,255,255,.07)', color:'#fff', fontSize:15, fontFamily:'Plus Jakarta Sans,sans-serif', outline:'none', transition:'border-color .2s' }}
                      onFocus={e => e.target.style.borderColor='rgba(255,255,255,.45)'}
                      onBlur={e => e.target.style.borderColor='rgba(255,255,255,.14)'}/>
                  </div>
                ))}
                <div style={{ marginBottom:18 }}>
                  <label style={{ display:'block', fontSize:13, fontWeight:600, color:'rgba(255,255,255,.55)', marginBottom:6 }}>Message</label>
                  <textarea rows={isMobile?3:5} placeholder="Décrivez votre besoin..." value={contact.message} onChange={e => setContact(p => ({...p,message:e.target.value}))}
                    style={{ width:'100%', padding:'12px 14px', borderRadius:12, border:'1.5px solid rgba(255,255,255,.14)', background:'rgba(255,255,255,.07)', color:'#fff', fontSize:15, fontFamily:'Plus Jakarta Sans,sans-serif', outline:'none', resize:'vertical', transition:'border-color .2s' }}
                    onFocus={e => e.target.style.borderColor='rgba(255,255,255,.45)'}
                    onBlur={e => e.target.style.borderColor='rgba(255,255,255,.14)'}/>
                </div>
                <button className="btn-white" onClick={() => { if (contact.nom && contact.email && contact.message) setContactSent(true); }}
                  style={{ width:'100%', padding:'14px', borderRadius:13, fontSize:15 }}>
                  Envoyer le message 📨
                </button>
              </div>
            ) : (
              <div style={{ background:'rgba(255,255,255,.07)', borderRadius:24, padding:'48px 24px', backdropFilter:'blur(14px)', border:'1px solid rgba(255,255,255,.1)', textAlign:'center' }}>
                <div style={{ fontSize:54, marginBottom:14, animation:'float 3s ease-in-out infinite' }}>✅</div>
                <h3 className="display" style={{ fontFamily:'Syne', fontWeight:800, fontSize:22, color:'#fff', marginBottom:9 }}>Message envoyé !</h3>
                <p style={{ color:'rgba(255,255,255,.62)', lineHeight:1.78, fontSize: isMobile?14:16 }}>
                  Merci {contact.nom} !<br/>Nous vous répondrons à <strong style={{ color:'#fff' }}>{contact.email}</strong> sous 24h.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{ background:'#03080B', padding: isMobile?'22px 20px':'32px 60px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:11 }}>
          <Logo size={50} glow={false}/>
          <div>
            <div style={{ fontFamily:'Syne', fontWeight:800, color:'rgba(255,255,255,.85)', fontSize:15 }}>Madagascar</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.32)', fontWeight:600, letterSpacing:'.05em', textTransform:'uppercase', marginTop:2 }}>Cabinet Dentaire</div>
          </div>
        </div>
        <div style={{ display:'flex', gap: isMobile?12:20, flexWrap:'wrap' }}>
          {[['#services','Fonctionnalités'],['#tarifs','Tarifs'],['#faq','FAQ'],['#contact','Contact']].map(([h, l]) => (
            <a key={h} href={h} style={{ color:'rgba(255,255,255,.35)', fontSize:13, textDecoration:'none', transition:'color .2s' }}
              onMouseOver={e => e.target.style.color='rgba(255,255,255,.7)'}
              onMouseOut={e => e.target.style.color='rgba(255,255,255,.35)'}>{l}</a>
          ))}
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <span style={{ color:'rgba(255,255,255,.25)', fontSize:12 }}>© {new Date().getFullYear()} DPM Madagascar</span>
          <button onClick={() => navigate('/login')} style={{ padding:'6px 13px', borderRadius:8, border:'1px solid rgba(255,255,255,.14)', background:'transparent', color:'rgba(255,255,255,.45)', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'inherit', transition:'all .2s' }}
            onMouseOver={e => {e.currentTarget.style.borderColor='rgba(255,255,255,.3)';e.currentTarget.style.color='rgba(255,255,255,.8)';}}
            onMouseOut={e => {e.currentTarget.style.borderColor='rgba(255,255,255,.14)';e.currentTarget.style.color='rgba(255,255,255,.45)';}}>
            Connexion
          </button>
        </div>
      </footer>

      <InscriptionModal show={modal.show} plan={modal.plan} onClose={() => setModal({ show:false, plan:null })} navigate={navigate}/>
    </div>
  );
}
