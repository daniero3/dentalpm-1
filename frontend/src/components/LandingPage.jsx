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

/* ── CSS Global ── */
const GlobalCSS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&display=swap');
    :root{--teal:#0D7A87;--teal-dk:#083D44;--teal-lt:#13A3B4;--ink:#0A0F14;--slate:#4A5568;--muted:#94A3B8;--border:#E8EDF2;--surface:#F7F9FC;--white:#FFFFFF;--sh1:0 1px 3px rgba(0,0,0,.06);--sh3:0 16px 48px rgba(0,0,0,.12);--sh-teal:0 8px 32px rgba(13,122,135,.28);}
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html{scroll-behavior:smooth;}
    body{font-family:'Inter',sans-serif;background:#fff;color:#0A0F14;-webkit-font-smoothing:antialiased;overflow-x:hidden;}
    ::-webkit-scrollbar{width:4px;}
    ::-webkit-scrollbar-thumb{background:var(--teal);border-radius:99px;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes scaleIn{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
    @keyframes pulse{0%,100%{opacity:.7;transform:scale(1)}50%{opacity:1;transform:scale(1.05)}}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
    @keyframes slide{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
    @keyframes imgIn{from{opacity:0;transform:scale(1.05)}to{opacity:1;transform:scale(1)}}
    @keyframes imgOut{from{opacity:1}to{opacity:0}}
    @keyframes countUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    @keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
    .au0{animation:fadeUp .7s cubic-bezier(.22,1,.36,1) both}
    .au1{animation:fadeUp .7s cubic-bezier(.22,1,.36,1) .1s both}
    .au2{animation:fadeUp .7s cubic-bezier(.22,1,.36,1) .2s both}
    .au3{animation:fadeUp .7s cubic-bezier(.22,1,.36,1) .3s both}
    .au4{animation:fadeUp .7s cubic-bezier(.22,1,.36,1) .4s both}
    .sr{opacity:0;transform:translateY(20px);transition:opacity .65s ease,transform .65s cubic-bezier(.22,1,.36,1)}
    .sr.vis{opacity:1;transform:translateY(0)}
    .feat-item{transition:all .25s ease;border-radius:12px;}
    .feat-item:hover{background:#F0FDFE!important;transform:translateX(4px);}
    .plan-hover{transition:transform .3s cubic-bezier(.22,1,.36,1),box-shadow .3s}
    .plan-hover:hover{transform:translateY(-8px);box-shadow:var(--sh3)}
    .btn-main{position:relative;overflow:hidden;transition:transform .2s,box-shadow .2s,filter .2s}
    .btn-main::after{content:'';position:absolute;inset:0;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.2) 50%,transparent 65%);transform:translateX(-100%);transition:transform .5s}
    .btn-main:hover::after{transform:translateX(100%)}
    .btn-main:hover{transform:translateY(-2px);box-shadow:var(--sh-teal);filter:brightness(1.06)}
    .nav-link{transition:color .2s;text-decoration:none}
    .nav-link:hover{color:var(--teal)!important}
    .faq-item{transition:background .2s;cursor:pointer}
    .faq-item:hover{background:#F7F9FC!important}
    .stat-card{transition:transform .3s,box-shadow .3s}
    .stat-card:hover{transform:translateY(-4px);box-shadow:var(--sh3)}
    .tag{display:inline-flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--border);border-radius:99px;padding:5px 14px;font-size:12px;font-weight:600;color:var(--slate)}
    .tag-teal{background:#F0FDFE;border-color:#7DD3DA;color:var(--teal)}

    /* ── Améliorations premium ── */
    @keyframes shimmerText{0%{background-position:-300% center}100%{background-position:300% center}}
    @keyframes gradBorder{0%,100%{opacity:.6}50%{opacity:1}}
    @keyframes floatSlow{0%,100%{transform:translateY(0) rotate(0deg)}33%{transform:translateY(-8px) rotate(.5deg)}66%{transform:translateY(-4px) rotate(-.5deg)}}
    @keyframes orb{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(20px,-15px) scale(1.05)}75%{transform:translate(-15px,20px) scale(.95)}}
    @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}

    .shimmer-gold{
      background:linear-gradient(90deg,#F59E0B,#fff,#F59E0B,#FCD34D);
      background-size:300% auto;
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;
      background-clip:text;
      animation:shimmerText 4s linear infinite;
    }
    .shimmer-teal{
      background:linear-gradient(90deg,#7DD3DA,#fff,#7DD3DA,#B2EBF2);
      background-size:300% auto;
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;
      background-clip:text;
      animation:shimmerText 3.5s linear infinite;
    }
    .glow-card{
      transition:all .3s cubic-bezier(.22,1,.36,1);
      position:relative;
    }
    .glow-card::before{
      content:'';position:absolute;inset:-1px;border-radius:inherit;
      background:linear-gradient(135deg,rgba(13,122,135,.4),rgba(125,211,218,.2),rgba(13,122,135,.4));
      opacity:0;transition:opacity .3s;z-index:-1;
    }
    .glow-card:hover::before{opacity:1;}
    .glow-card:hover{transform:translateY(-6px) scale(1.01);box-shadow:0 20px 60px rgba(13,122,135,.20);}

    .number-accent{
      font-variant-numeric:tabular-nums;
      letter-spacing:-0.02em;
    }
    
    /* Barre de progression animée */
    @keyframes progressBar{from{width:0}to{width:var(--w,100%)}}
    .progress-bar{animation:progressBar 1.2s cubic-bezier(.22,1,.36,1) both;}
    
    /* Effet de hover sur liens nav */
    .nav-link::after{
      content:'';display:block;height:2px;width:0;background:var(--teal);
      transition:width .25s ease;border-radius:99px;margin-top:2px;
    }
    .nav-link:hover::after{width:100%;}

    /* Card testimonial premium */
    .testi-card{
      transition:all .35s cubic-bezier(.22,1,.36,1);
      position:relative;overflow:hidden;
    }
    .testi-card::after{
      content:'❝';position:absolute;top:-10px;right:16px;
      font-size:80px;color:rgba(13,122,135,.06);
      font-family:Georgia,serif;line-height:1;
      pointer-events:none;
    }
    .testi-card:hover{transform:translateY(-8px);box-shadow:0 24px 64px rgba(13,122,135,.12);}
  `}</style>
);

/* ── Logo ── */
const Logo = ({ size=36, glow=false }) => (
  <img
    src="/fix-logo.jpeg"
    alt="DPM Madagascar"
    width={size}
    height={size}
    style={{
      borderRadius: '50%',
      objectFit: 'cover',
      display: 'block',
      flexShrink: 0,
      filter: glow
        ? 'drop-shadow(0 0 16px rgba(13,122,135,.6)) drop-shadow(0 4px 14px rgba(0,0,0,.28))'
        : 'drop-shadow(0 3px 10px rgba(0,0,0,.22))',
    }}
  />
);

/* ── FadeSlider ── */
const FadeSlider = ({ images, height=480, interval=4500 }) => {
  const [cur, setCur] = useState(0);
  const [prev, setPrev] = useState(null);
  useEffect(() => {
    const t = setInterval(() => {
      const next = (cur + 1) % images.length;
      setPrev(cur);
      setTimeout(() => { setCur(next); setPrev(null); }, 800);
    }, interval);
    return () => clearInterval(t);
  }, [cur, images.length, interval]);
  return (
    <div style={{ position:'relative', height, borderRadius:20, overflow:'hidden', boxShadow:'var(--sh3)' }}>
      <style>{`@keyframes sIn{from{opacity:0;transform:scale(1.04)}to{opacity:1;transform:scale(1)}}@keyframes sOut{from{opacity:1}to{opacity:0}}`}</style>
      {prev !== null && <img src={images[prev].src} alt="" style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',animation:'sOut .8s ease both',zIndex:1 }}/>}
      <img key={cur} src={images[cur].src} alt={images[cur].alt} style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',animation:'sIn 1s cubic-bezier(.22,1,.36,1) both',zIndex:2 }}/>
      <div style={{ position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent 55%,rgba(8,61,68,.55) 100%)',zIndex:3 }}/>
      <div style={{ position:'absolute',bottom:0,left:0,right:0,zIndex:4,padding:'14px 18px' }}>
        <p style={{ color:'rgba(255,255,255,.88)',fontSize:12,fontWeight:500,margin:0 }}>{images[cur].caption}</p>
      </div>
      <div style={{ position:'absolute',bottom:12,right:14,zIndex:5,display:'flex',gap:5 }}>
        {images.map((_,i) => <div key={i} onClick={()=>setCur(i)} style={{ width:i===cur?18:6,height:6,borderRadius:99,background:i===cur?'#fff':'rgba(255,255,255,.4)',cursor:'pointer',transition:'all .4s' }}/>)}
      </div>
    </div>
  );
};

/* ── Ticker ── */
const Ticker = ({ items }) => (
  <div style={{ overflow:'hidden' }}>
    <div style={{ display:'flex',gap:48,animation:'slide 18s linear infinite',width:'max-content' }}>
      {[...items,...items].map((item,i)=>(
        <div key={i} style={{ whiteSpace:'nowrap',fontSize:14,fontWeight:700,color:'var(--muted)',letterSpacing:.5 }}>{item}</div>
      ))}
    </div>
  </div>
);

/* ── DashMockup ── */
const DashMockup = () => {
  const [tab, setTab] = useState(0);
  const tabs = ['Dashboard','Patients','Finances','Agenda','Odonto'];
  useEffect(() => { const t = setInterval(()=>setTab(i=>(i+1)%5),3500); return ()=>clearInterval(t); }, []);
  const Donut = ({pct,color}) => { const r=26,c=2*Math.PI*r; return(<svg width={64} height={64} viewBox="0 0 64 64"><circle cx={32} cy={32} r={r} fill="none" stroke="#F1F5F9" strokeWidth={7}/><circle cx={32} cy={32} r={r} fill="none" stroke={color} strokeWidth={7} strokeDasharray={`${(pct/100)*c} ${c}`} strokeLinecap="round" transform="rotate(-90 32 32)" style={{transition:'stroke-dasharray 1.2s'}}/><text x={32} y={36} textAnchor="middle" fontSize={11} fontWeight={800} fill={color}>{pct}%</text></svg>); };
  const screens = [
    <div key={0}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}>
        {[{l:'RDV auj.',v:'8',c:'#0D7A87',i:'📅'},{l:'Patients',v:'247',c:'#7C3AED',i:'👤'},{l:'CA mois',v:'1.2M Ar',c:'#10B981',i:'💰'}].map((k,i)=>(
          <div key={i} style={{background:'#F8FAFC',borderRadius:10,padding:'10px 8px',border:'1px solid #E2E8F0'}}>
            <div style={{fontSize:18,marginBottom:3}}>{k.i}</div>
            <div style={{fontFamily:'Bricolage Grotesque',fontWeight:800,fontSize:18,color:k.c}}>{k.v}</div>
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
          <div key={i} style={{textAlign:'center',background:'#F8FAFC',borderRadius:8,padding:'8px 4px',border:'1px solid #E2E8F0'}}><div style={{fontWeight:800,fontSize:14,color:'#0F172A'}}>{s.v}</div><div style={{fontSize:10,color:'#94A3B8'}}>{s.l}</div></div>
        ))}
      </div>
    </div>,
    <div key={3}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:11}}><span style={{fontWeight:700,fontSize:13}}>Agenda du jour</span><span style={{fontSize:11,color:'#94A3B8'}}>{new Date().toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})}</span></div>
      <div style={{display:'grid',gridTemplateColumns:'36px 1fr',gap:'3px 8px'}}>
        {[{h:'08:30',n:'Détartrage',d:'Dr. Rakoto',c:'#0D7A87',bg:'#F0FDFE',dur:'45min'},{h:'09:15',n:'Carie M16',d:'Dr. Rasoa',c:'#7C3AED',bg:'#F5F3FF',dur:'30min'},{h:'10:00',n:'Couronne',d:'Dr. Rakoto',c:'#F59E0B',bg:'#FFFBEB',dur:'90min'},{h:'11:30',n:'Pause',d:'',c:'#CBD5E1',bg:'#F8FAFC',dur:'30min'},{h:'14:00',n:'Extraction',d:'Dr. Andry',c:'#EF4444',bg:'#FFF1F2',dur:'45min'}].map((r,i)=>(
          <React.Fragment key={i}>
            <span style={{fontSize:9,color:'#94A3B8',fontWeight:700,paddingTop:7}}>{r.h}</span>
            <div style={{background:r.bg,borderLeft:`3px solid ${r.c}`,borderRadius:'0 8px 8px 0',padding:'5px 9px',marginBottom:4}}><div style={{fontSize:11,fontWeight:700,color:r.c}}>{r.n}</div><div style={{fontSize:10,color:'#94A3B8'}}>{r.d}{r.d?' · ':''}{r.dur}</div></div>
          </React.Fragment>
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
    <div style={{background:'#fff',borderRadius:20,padding:'16px 18px',boxShadow:'0 24px 64px rgba(0,0,0,.14)',border:'1px solid #E2E8F0',display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14,paddingBottom:12,borderBottom:'1px solid #F1F5F9'}}>
        <div style={{width:10,height:10,borderRadius:'50%',background:'#FF5F57'}}/><div style={{width:10,height:10,borderRadius:'50%',background:'#FFBD2E'}}/><div style={{width:10,height:10,borderRadius:'50%',background:'#28CA41'}}/>
        <div style={{flex:1,background:'#F8FAFC',borderRadius:6,padding:'4px 12px',marginLeft:10,display:'flex',alignItems:'center',gap:6}}><div style={{width:7,height:7,borderRadius:'50%',background:'#10B981'}}/><span style={{fontSize:11,color:'#94A3B8'}}>app.dpm-madagascar.com</span></div>
      </div>
      <div style={{display:'flex',gap:3,marginBottom:13,flexWrap:'wrap'}}>
        {tabs.map((t,i)=><button key={i} onClick={()=>setTab(i)} style={{padding:'4px 9px',borderRadius:7,border:'none',cursor:'pointer',background:tab===i?'#0D7A87':'#F1F5F9',color:tab===i?'#fff':'#64748B',fontSize:10,fontWeight:700,transition:'all .2s'}}>{t}</button>)}
      </div>
      <div style={{flex:1,animation:'fadeIn .35s ease'}} key={tab}>{screens[tab]}</div>
      <div style={{display:'flex',gap:5,justifyContent:'center',marginTop:12}}>
        {tabs.map((_,i)=><div key={i} onClick={()=>setTab(i)} style={{width:i===tab?18:6,height:6,borderRadius:99,background:i===tab?'#0D7A87':'#E2E8F0',cursor:'pointer',transition:'all .3s'}}/>)}
      </div>
    </div>
  );
};

/* ── Counter ── */
const Counter = ({ end, suffix='', label, sub }) => {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  const fired = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !fired.current) {
        fired.current = true;
        let cur=0; const step=end/55;
        const t=setInterval(()=>{cur+=step;if(cur>=end){setN(end);clearInterval(t);}else setN(Math.floor(cur));},18);
      }
    }, {threshold:.5});
    if (ref.current) obs.observe(ref.current);
    return ()=>obs.disconnect();
  }, [end]);
  return (
    <div ref={ref} className="stat-card" style={{background:'#fff',borderRadius:18,padding:'20px 16px',border:'1px solid var(--border)',boxShadow:'var(--sh1)',animation:'countUp .6s ease both'}}>
      <div style={{fontFamily:'Bricolage Grotesque',fontWeight:800,fontSize:38,color:'var(--teal)',lineHeight:1,marginBottom:4}}>{n}{suffix}</div>
      <div style={{fontFamily:'Bricolage Grotesque',fontWeight:700,fontSize:14,color:'var(--ink)',marginBottom:3}}>{label}</div>
      {sub && <div style={{fontSize:12,color:'var(--muted)',lineHeight:1.4}}>{sub}</div>}
    </div>
  );
};

/* ── Scroll reveal ── */
const useScrollReveal = () => {
  useEffect(() => {
    const obs = new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('vis');}),{threshold:.1});
    document.querySelectorAll('.sr').forEach(el=>obs.observe(el));
    return ()=>obs.disconnect();
  }, []);
};

/* ── Typing ── */
const useTyping = (words, speed=72, pause=1900) => {
  const [text, setText] = useState('');
  const [wi, setWi] = useState(0);
  const [ci, setCi] = useState(0);
  const [del, setDel] = useState(false);
  useEffect(() => {
    const w=words[wi];
    const t=setTimeout(()=>{
      if(!del){setText(w.slice(0,ci+1));if(ci+1===w.length)setTimeout(()=>setDel(true),pause);else setCi(c=>c+1);}
      else{setText(w.slice(0,ci-1));if(ci-1===0){setDel(false);setWi(i=>(i+1)%words.length);setCi(0);}else setCi(c=>c-1);}
    },del?speed/2:speed);
    return()=>clearTimeout(t);
  });
  return text;
};

/* ── Data (contenu original intact) ── */
const PLANS = [
  { name:'ESSENTIAL', price:'149 000', popular:false, stripe:'https://buy.stripe.com/eVqeV66VS1S84A43NDcfK01', desc:'Idéal pour les cabinets solo',
    features:["1 praticien + 1 assistant(e)","Jusqu'à 500 patients","Agenda & rendez-vous","Facturation de base","Ordonnances PDF","Odontogramme FDI","Support email"] },
  { name:'PRO', price:'199 000', popular:true, stripe:'https://buy.stripe.com/aFa9AM4NK54k1nSfwlcfK00', desc:'Le plus choisi par nos clients',
    features:['5 praticiens','Patients illimités','Agenda avancé + rappels SMS','Facturation complète','Laboratoire dentaire','Inventaire & stock','Rapports financiers','SMS automatiques','Support prioritaire'] },
  { name:'GROUP', price:'299 000', popular:false, stripe:'https://buy.stripe.com/9B614gbc8aoE3w05VLcfK02', desc:'Pour les groupes et multi-sites',
    features:['Praticiens illimités','Multi-sites','Patients illimités','Tout le plan PRO','API dédiée','Dashboard groupe','Gestionnaire dédié','Formation sur site incluse'] },
];
const FEATURES_LIST = [
  {tag:'Agenda',icon:'📅',title:'Agenda intelligent',desc:"Rendez-vous, rappels SMS automatiques, optimisation du planning. Réduisez les absences et remplissez votre agenda en temps réel.",color:'#0D7A87'},
  {tag:'Dossiers',icon:'👤',title:'Dossiers patients unifiés',desc:"Historique complet, odontogramme FDI interactif, imagerie. Accès sécurisé à toutes les informations en un seul endroit.",color:'#7C3AED'},
  {tag:'Facturation',icon:'🧾',title:'Facturation & Devis',desc:"Créez des factures et devis professionnels en 30 secondes. Paiement MVola, Orange Money, espèces. PDF automatique.",color:'#10B981'},
  {tag:'Ordonnances',icon:'💊',title:'Ordonnances PDF',desc:"Génération instantanée avec signature du praticien. Format standard Madagascar, impression ou envoi email patient.",color:'#F59E0B'},
  {tag:'Inventaire',icon:'📦',title:'Stock & Inventaire',desc:"Suivi temps réel du matériel dentaire. Alertes automatiques à l'approche du stock minimum. Gestion fournisseurs.",color:'#EF4444'},
  {tag:'Laboratoire',icon:'🔬',title:'Laboratoire dentaire',desc:"Commandes prothèses et implants. Suivi délais, coûts et correspondance avec les dossiers patients.",color:'#0D7A87'},
  {tag:'Rapports',icon:'📊',title:'Rapports & Analytics',desc:"CA mensuel, taux de remplissage, actes fréquents. Pilotez votre cabinet avec des données en temps réel.",color:'#7C3AED'},
  {tag:'SMS',icon:'💬',title:'SMS automatiques',desc:"Rappels 24h avant RDV, messages d'anniversaire, relances patients inactifs. Zéro appel manuel inutile.",color:'#10B981'},
];
const FAQS = [
  {q:"Comment fonctionne l'essai gratuit de 7 jours ?",a:"Créez votre compte en 2 minutes, sans carte bancaire. Accès immédiat à toutes les fonctionnalités PRO. À la fin, choisissez votre plan et payez directement via Stripe."},
  {q:"Mes données patients sont-elles sécurisées ?",a:"Oui. Chiffrement de bout en bout, sauvegarde automatique quotidienne, hébergement sécurisé. Confidentialité médicale respectée, aucune donnée partagée avec des tiers."},
  {q:"Puis-je annuler à tout moment ?",a:"Oui, sans engagement ni pénalité. Annulez depuis votre espace cabinet en un clic. Vos données restent accessibles jusqu'à la fin de la période payée."},
  {q:"Combien de patients avec le plan ESSENTIAL ?",a:"Le plan ESSENTIAL gère jusqu'à 500 patients actifs pour 1 praticien + 1 assistant(e). Le plan PRO offre des patients illimités dès 199 000 Ar/mois."},
  {q:"Comment fonctionne le paiement mensuel ?",a:"Payez directement et en toute sécurité via Stripe avec votre carte Mastercard ou Visa. L'abonnement est activé immédiatement après paiement."},
  {q:"DPM fonctionne-t-il sur mobile ?",a:"Oui, 100% responsive. Fonctionne parfaitement sur ordinateur, tablette et smartphone. Gérez votre cabinet depuis n'importe où à Madagascar."},
  {q:"Puis-je migrer mes données existantes ?",a:"Oui. Notre équipe vous accompagne gratuitement dans la migration de vos données patients et historiques. Contactez-nous sur radisonfrancky@gmail.com."},
  {q:"Y a-t-il une formation pour utiliser DPM ?",a:"Le plan GROUP inclut une formation personnalisée sur site. Pour tous les plans, documentation complète, tutoriels vidéo et support en français inclus."},
];
const TEMOIGNAGES = [
  {nom:'Dr. Rakoto Jean',role:'Chirurgien-dentiste, Antananarivo',note:5,txt:"DPM a transformé la gestion de mon cabinet. Je passe moins de temps sur l'administratif et plus de temps avec mes patients. La facturation est devenu un jeu d'enfant."},
  {nom:'Dr. Rasoa Marie',role:'Orthodontiste, Fianarantsoa',note:5,txt:"L'odontogramme digital est remarquable. Je suis l'évolution de chaque dent avec précision. Les rappels SMS ont réduit mes rendez-vous manqués de 70%."},
  {nom:'Dr. Randria Paul',role:'Cabinet de groupe, Toamasina',note:5,txt:"3 praticiens, DPM gère tout parfaitement. Les rapports financiers nous donnent une visibilité totale. Je le recommande à tous mes confrères malgaches."},
];

/* ── Modal Inscription ── */
const InscriptionModal = ({ show, plan, onClose, navigate }) => {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({cabinet:'',email:'',phone:'',city:'',dentists:'1'});
  const inp = {width:'100%',padding:'12px 14px',borderRadius:12,border:'1.5px solid var(--border)',fontSize:16,fontFamily:'Inter,sans-serif',outline:'none',transition:'border-color .2s,box-shadow .2s'};
  const focus = e=>{e.target.style.borderColor='var(--teal)';e.target.style.boxShadow='0 0 0 3px rgba(13,122,135,.1)';};
  const blur = e=>{e.target.style.borderColor='var(--border)';e.target.style.boxShadow='none';};
  const submit = async()=>{
    setLoading(true);
    try{await axios.post(`${API_URL}/auth/register-clinic`,{...form,plan:plan?.name||'PRO'});setDone(true);}
    catch(e){alert(e.response?.data?.error||'Erreur. Vérifiez vos informations.');}
    finally{setLoading(false);}
  };
  if(!show) return null;
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(10,15,20,.75)',backdropFilter:'blur(6px)',display:'flex',alignItems:'flex-end',justifyContent:'center',animation:'fadeIn .2s ease'}}>
      <div style={{background:'#fff',borderRadius:'24px 24px 0 0',padding:'28px 22px 36px',maxWidth:520,width:'100%',maxHeight:'95vh',overflowY:'auto',position:'relative',animation:'scaleIn .3s cubic-bezier(.22,1,.36,1)'}}>
        <div style={{width:40,height:4,borderRadius:99,background:'#E2E8F0',margin:'0 auto 18px'}}/>
        <button onClick={onClose} style={{position:'absolute',top:14,right:14,width:32,height:32,borderRadius:'50%',background:'var(--surface)',border:'none',cursor:'pointer',fontSize:18,color:'var(--muted)'}}>✕</button>
        {!done?(
          <>
            <div style={{display:'flex',gap:5,marginBottom:18}}>
              {[1,2].map(s=><div key={s} style={{flex:1,height:3,borderRadius:99,background:step>=s?'var(--teal)':'var(--border)',transition:'background .3s'}}/>)}
            </div>
            <h2 style={{fontFamily:'Bricolage Grotesque',fontWeight:800,fontSize:20,color:'var(--ink)',marginBottom:6}}>
              {step===1?' Démarrer votre essai gratuit':'💳 Modalités de paiement'}
            </h2>
            {plan&&<div style={{background:'#F0FDFE',border:'1.5px solid var(--teal)',borderRadius:12,padding:'10px 14px',margin:'10px 0 16px',display:'flex',justifyContent:'space-between'}}>
              <span style={{fontWeight:700,color:'var(--teal)',fontSize:14}}>Plan {plan.name}</span>
              <span style={{fontFamily:'Bricolage Grotesque',fontWeight:800,color:'var(--teal)',fontSize:16}}>{plan.price} Ar/mois</span>
            </div>}
            {step===1&&(
              <div>
                {[{label:'Nom du cabinet',name:'cabinet',ph:'Cabinet Dentaire Dr. Rakoto',type:'text'},{label:'Email professionnel',name:'email',ph:'contact@cabinet.mg',type:'email'},{label:'Téléphone MVola / Orange',name:'phone',ph:'034 XX XXX XX',type:'tel'},{label:'Ville',name:'city',ph:'Antananarivo',type:'text'}].map(f=>(
                  <div key={f.name} style={{marginBottom:12}}>
                    <label style={{display:'block',fontSize:13,fontWeight:600,color:'var(--slate)',marginBottom:5}}>{f.label} *</label>
                    <input type={f.type} placeholder={f.ph} required value={form[f.name]} onChange={e=>setForm(p=>({...p,[f.name]:e.target.value}))} style={inp} onFocus={focus} onBlur={blur}/>
                  </div>
                ))}
                <div style={{marginBottom:18}}>
                  <label style={{display:'block',fontSize:13,fontWeight:600,color:'var(--slate)',marginBottom:5}}>Nombre de praticiens</label>
                  <select value={form.dentists} onChange={e=>setForm(p=>({...p,dentists:e.target.value}))} style={{...inp,cursor:'pointer',background:'#fff'}}>
                    {['1 praticien','2-3 praticiens','4-5 praticiens','5+ praticiens'].map((o,i)=><option key={i} value={[1,'2-3','4-5','5+'][i]}>{o}</option>)}
                  </select>
                </div>
                <button className="btn-main" disabled={!form.cabinet||!form.email||!form.phone||!form.city} onClick={()=>setStep(2)}
                  style={{width:'100%',padding:'15px',borderRadius:13,background:'var(--teal)',color:'#fff',fontWeight:700,fontSize:16,border:'none',cursor:'pointer',opacity:(!form.cabinet||!form.email||!form.phone||!form.city)?.5:1}}>
                  Continuer →
                </button>
              </div>
            )}
            {step===2&&(
              <div>
                <p style={{color:'var(--slate)',fontSize:14,lineHeight:1.7,marginBottom:14}}>Votre <strong>essai de 7 jours</strong> commence immédiatement. À la fin, payez par :</p>
                {[{n:'MVola',num:'034 XX XXX XX',c:'#E30613'},{n:'Orange Money',num:'032 XX XXX XX',c:'#FF6600'},{n:'Airtel Money',num:'033 XX XXX XX',c:'#E4002B'},{n:'Virement Banquière',num:'Carte Mastercard',c:'#EB001B'}].map(p=>(
                  <div key={p.n} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:11,padding:'10px 14px',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontWeight:700,color:p.c,fontSize:14}}>{p.n}</span>
                    <span style={{color:'var(--muted)',fontSize:13}}>{p.num}</span>
                  </div>
                ))}
                {plan?.stripe && (
                  <a href={plan.stripe} target="_blank" rel="noopener noreferrer"
                    style={{display:'block',width:'100%',marginTop:14,padding:'14px',borderRadius:13,background:'#635BFF',color:'#fff',fontWeight:700,fontSize:15,textDecoration:'none',textAlign:'center',boxSizing:'border-box'}}>
                    💳 Payer directement avec Stripe →
                  </a>
                )}
                <div style={{display:'flex',alignItems:'center',gap:8,margin:'10px 0',color:'var(--muted)',fontSize:12}}>
                  <div style={{flex:1,height:1,background:'var(--border)'}}/><span>ou</span><div style={{flex:1,height:1,background:'var(--border)'}}/>
                </div>
                <button className="btn-main" onClick={submit} disabled={loading}
                  style={{width:'100%',padding:'15px',borderRadius:13,background:'var(--teal)',color:'#fff',fontWeight:700,fontSize:16,border:'none',cursor:'pointer',opacity:loading?.6:1}}>
                  {loading?'⏳ Création...':'✓ Confirmer mon inscription (paiement Mobile Money)'}
                </button>
                <button onClick={()=>setStep(1)} style={{width:'100%',marginTop:8,padding:9,background:'none',color:'var(--muted)',border:'none',cursor:'pointer',fontSize:13}}>← Retour</button>
              </div>
            )}
          </>
        ):(
          <div style={{textAlign:'center',padding:'8px 0'}}>
            <div style={{fontSize:60,marginBottom:14,animation:'float 3s ease-in-out infinite'}}>🎉</div>
            <h2 style={{fontFamily:'Bricolage Grotesque',fontWeight:800,fontSize:22,color:'var(--ink)',marginBottom:8}}>Bienvenue sur DPM !</h2>
            <p style={{color:'var(--slate)',lineHeight:1.8,marginBottom:18}}>Cabinet <strong>{form.cabinet}</strong> créé !<br/>Identifiants envoyés à <strong>{form.email}</strong></p>
            <div style={{background:'#F0FDFE',border:'1.5px solid var(--teal)',borderRadius:14,padding:'13px 16px',marginBottom:18,textAlign:'left'}}>
              <p style={{margin:0,fontSize:13,color:'var(--teal)',fontWeight:700}}>🕐 Votre essai de 7 jours est activé !</p>
              <p style={{margin:'4px 0 0',color:'var(--slate)',fontSize:13}}>Connectez-vous avec les identifiants reçus par email.</p>
            </div>
            <button className="btn-main" onClick={()=>navigate('/login')}
              style={{width:'100%',padding:'15px',borderRadius:13,background:'var(--teal)',color:'#fff',fontWeight:700,fontSize:16,border:'none',cursor:'pointer'}}>
              Accéder à mon espace →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
════════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useScreen();
  const [scrolled, setScrolled] = useState(false);
  const [modal, setModal] = useState({show:false,plan:null});
  const [openFaq, setOpenFaq] = useState(null);
  const [contact, setContact] = useState({nom:'',email:'',message:''});
  const [contactSent, setContactSent] = useState(false);
  const [mobMenu, setMobMenu] = useState(false);
  const typed = useTyping(['patients & rendez-vous','facturation Ariary','ordonnances PDF','laboratoire dentaire','inventaire & stock'],68,2000);
  useScrollReveal();

  useEffect(()=>{ const fn=()=>setScrolled(window.scrollY>50); window.addEventListener('scroll',fn); return()=>window.removeEventListener('scroll',fn); },[]);

  const open = plan => setModal({show:true,plan});

  // Variables responsive calculées une fois
  const px    = isMobile ? '16px' : isTablet ? '28px' : '56px';
  const py    = isMobile ? '52px' : '100px';
  const g2    = isMobile ? 28 : isTablet ? 36 : 64;  // gap 2 colonnes
  const g3    = isMobile ? 12 : 18;                   // gap 3 colonnes
  const c2    = isMobile ? '1fr' : '1fr 1fr';
  const c3    = isMobile ? '1fr' : isTablet ? 'repeat(2,1fr)' : 'repeat(3,1fr)';
  const c4    = isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)';
  const fs1   = isMobile ? 28 : isTablet ? 40 : 60;  // hero h1
  const fs2   = isMobile ? 24 : isTablet ? 32 : 44;  // section h2
  const sc    = scrolled || mobMenu;

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

  const ST = ({tag,title,sub,light=false}) => (
    <div style={{marginBottom:isMobile?28:56}}>
      <span className="tag" style={{marginBottom:12,display:'inline-flex',color:light?'#7DD3DA':'var(--teal)',background:light?'rgba(255,255,255,.1)':'#F0FDFE',borderColor:light?'rgba(255,255,255,.2)':'#7DD3DA'}}>{tag}</span>
      <h2 style={{fontFamily:'Bricolage Grotesque',fontWeight:800,fontSize:fs2,color:light?'#fff':'var(--ink)',lineHeight:1.15,marginBottom:12}}>{title}</h2>
      {sub&&<p style={{fontSize:isMobile?14:17,color:light?'rgba(255,255,255,.68)':'var(--slate)',maxWidth:560,lineHeight:1.75}}>{sub}</p>}
    </div>
  );

  return (
    <div style={{fontFamily:"'Inter',sans-serif",background:'#fff',minHeight:'100vh',overflowX:'hidden'}}>
      <GlobalCSS/>

      {/* ══ NAV ══ */}
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:200,background:sc?'rgba(255,255,255,.97)':'transparent',backdropFilter:sc?'blur(20px)':'none',borderBottom:sc?'1px solid rgba(232,237,242,.8)':'none',boxShadow:sc?'0 2px 20px rgba(0,0,0,.06)':'none',transition:'all .35s ease'}}>
        <div style={{padding:`0 ${px}`,height:isMobile?58:72,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          {/* Logo */}
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div className="logo-nav" style={{position:'relative',cursor:'pointer'}}>
              <Logo size={isMobile?46:62} glow={!sc}/>
              {!sc && <div style={{position:'absolute',inset:-5,borderRadius:'50%',border:'1.5px solid rgba(255,255,255,.18)',pointerEvents:'none'}}/>}
            </div>
            <div style={{display:'flex',flexDirection:'column',lineHeight:1}}>
              <span style={{fontFamily:'Bricolage Grotesque',fontWeight:800,fontSize:isMobile?15:19,color:sc?'var(--ink)':'#fff',letterSpacing:'-0.01em',lineHeight:1.1}}>Madagascar</span>
              <span style={{fontSize:isMobile?10:11,fontWeight:600,color:sc?'var(--muted)':'rgba(255,255,255,.55)',letterSpacing:'0.06em',textTransform:'uppercase',marginTop:1}}>Cabinet Dentaire</span>
            </div>
          </div>
          {/* Desktop */}
          {!isMobile&&(
            <div style={{display:'flex',gap:2,alignItems:'center'}}>
              {[['#services','Fonctionnalités'],['#pourquoi','Avantages'],['#tarifs','Tarifs'],['#faq','FAQ'],['#contact','Contact']].map(([href,label])=>(
                <a key={href} href={href} className="nav-link" style={{padding:'7px 13px',color:sc?'var(--slate)':'rgba(255,255,255,.8)',fontWeight:500,fontSize:14,borderRadius:9}}>{label}</a>
              ))}
              <button onClick={()=>navigate('/login')} style={{marginLeft:8,padding:'8px 18px',borderRadius:10,border:`1.5px solid ${sc?'var(--border)':'rgba(255,255,255,.3)'}`,background:'transparent',color:sc?'var(--ink)':'#fff',fontWeight:600,fontSize:14,cursor:'pointer'}}>Connexion</button>
              <button onClick={()=>navigate('/register')} className="btn-main" style={{marginLeft:6,padding:'9px 20px',borderRadius:10,background:'var(--teal)',color:'#fff',fontWeight:700,fontSize:14,border:'none',cursor:'pointer',boxShadow:'var(--sh-teal)'}}>Essai gratuit 7j </button>
            </div>
          )}
          {/* Mobile */}
          {isMobile&&(
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button onClick={()=>navigate('/register')} style={{padding:'7px 12px',borderRadius:10,background:'var(--teal)',color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer'}}>Essai gratuit</button>
              <button onClick={()=>setMobMenu(m=>!m)} style={{width:38,height:38,borderRadius:9,background:sc?'var(--surface)':'rgba(255,255,255,.15)',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5}}>
                {[0,1,2].map(i=><div key={i} style={{width:18,height:2,borderRadius:99,background:sc?'var(--ink)':'#fff',transition:'all .25s',transform:mobMenu&&i===0?'rotate(45deg) translate(5px,5px)':mobMenu&&i===2?'rotate(-45deg) translate(5px,-5px)':mobMenu&&i===1?'scaleX(0)':'none'}}/>)}
              </button>
            </div>
          )}
        </div>
        {/* Menu mobile déroulant */}
        {isMobile&&mobMenu&&(
          <div style={{background:'rgba(255,255,255,.97)',borderTop:'1px solid var(--border)',padding:'12px 16px 18px',display:'flex',flexDirection:'column',gap:2,animation:'slideDown .25s ease'}}>
            {[['#services','Fonctionnalités'],['#pourquoi','Avantages'],['#tarifs','Tarifs'],['#faq','FAQ'],['#contact','Contact']].map(([href,label])=>(
              <a key={href} href={href} onClick={()=>setMobMenu(false)} style={{padding:'11px 14px',color:'var(--ink)',fontWeight:600,fontSize:15,textDecoration:'none',borderRadius:9}}>{label}</a>
            ))}
            <div style={{height:1,background:'var(--border)',margin:'6px 0'}}/>
            <button onClick={()=>{navigate('/login');setMobMenu(false);}} style={{padding:'11px 14px',borderRadius:9,border:'1.5px solid var(--border)',background:'#fff',color:'var(--ink)',fontWeight:600,fontSize:15,cursor:'pointer',textAlign:'left'}}>Connexion</button>
          </div>
        )}
      </nav>

      {/* ══ HERO ══ */}
      <section style={{background:'linear-gradient(135deg,var(--teal-dk) 0%,#0A5F6A 50%,var(--teal) 100%)',minHeight:'100vh',display:'flex',alignItems:'center',padding:isMobile?'88px 16px 56px':isTablet?'108px 28px 68px':'120px 56px 80px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:'10%',left:'3%',width:isMobile?180:360,height:isMobile?180:360,borderRadius:'50%',background:'radial-gradient(circle,rgba(13,122,135,.45),transparent 70%)',filter:'blur(60px)',animation:'float 12s ease-in-out infinite',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:'10%',right:'3%',width:isMobile?140:280,height:isMobile?140:280,borderRadius:'50%',background:'radial-gradient(circle,rgba(125,211,218,.3),transparent 70%)',filter:'blur(50px)',animation:'float 16s ease-in-out infinite reverse',pointerEvents:'none'}}/>
        <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)',backgroundSize:'72px 72px',pointerEvents:'none'}}/>
        <div style={{maxWidth:1200,margin:'0 auto',width:'100%',display:'grid',gridTemplateColumns:c2,gap:isMobile?32:64,alignItems:'center'}}>
          <div>
            <div className="au0" style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.18)',borderRadius:99,padding:isMobile?'6px 12px':'7px 18px',marginBottom:isMobile?18:28}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:'#7DD3DA',display:'inline-block',animation:'pulse 2s ease-in-out infinite'}}/>
              <span style={{fontSize:isMobile?11:13,color:'rgba(255,255,255,.9)',fontWeight:500}}>🇲🇬 N°1 des logiciels dentaires à Madagascar</span>
            </div>
            <h1 className="au1" style={{fontFamily:'Bricolage Grotesque',fontWeight:800,fontSize:fs1,lineHeight:1.1,color:'#fff',marginBottom:12}}>
              Logiciel de Gestion<br/>
              <span className="shimmer-teal">Cabinet Dentaire</span><br/>
              à Madagascar
            </h1>
            <div className="au2" style={{height:34,marginBottom:14,display:'flex',alignItems:'center'}}>
              <span style={{fontSize:isMobile?14:19,color:'rgba(255,255,255,.65)'}}>
                Simplifiez vos <span style={{color:'#7DD3DA',fontWeight:600}}>{typed}</span>
                <span style={{animation:'blink 1s step-end infinite',color:'#7DD3DA'}}>|</span>
              </span>
            </div>
            <p className="au2" style={{fontSize:isMobile?14:17,color:'rgba(255,255,255,.68)',lineHeight:1.75,marginBottom:isMobile?22:36,maxWidth:500}}>
              DPM centralise toute la gestion de votre cabinet et patients, agenda, facturation, ordonnances, laboratoire. Simple, rapide, 100% adapté aux réalités malgaches.
            </p>
            <div className="au3" style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:isMobile?18:32}}>
              <button onClick={()=>navigate('/register')} className="btn-main"
                style={{padding:isMobile?'13px 18px':'16px 32px',borderRadius:13,background:'#fff',color:'var(--teal)',fontFamily:'Bricolage Grotesque',fontWeight:800,fontSize:isMobile?15:16,border:'none',cursor:'pointer',boxShadow:'0 12px 40px rgba(0,0,0,.2)',width:isMobile?'100%':'auto'}}>
                Essayer gratuitement — 7 jours 
              </button>
              <a href="#tarifs" style={{padding:isMobile?'13px 18px':'16px 28px',borderRadius:13,background:'rgba(255,255,255,.1)',color:'#fff',fontWeight:600,fontSize:isMobile?15:16,border:'1px solid rgba(255,255,255,.22)',textDecoration:'none',display:'inline-flex',alignItems:'center',justifyContent:'center',width:isMobile?'100%':'auto'}}>
                Voir les tarifs →
              </a>
            </div>
            <div className="au4" style={{display:'flex',gap:isMobile?12:22,flexWrap:'wrap'}}>
              {['🔒 Données sécurisées','📱 MVola & Orange Money','🇲🇬 Support français'].map(b=>(
                <span key={b} style={{fontSize:isMobile?11:13,color:'rgba(255,255,255,.55)'}}>{b}</span>
              ))}
            </div>
          </div>
          {/* Dashboard — masqué mobile */}
          {!isMobile&&(
            <div className="au3" style={{position:'relative'}}>
              <div style={{height:isTablet?380:490}}><DashMockup/></div>
              <div style={{position:'absolute',bottom:-16,left:-20,background:'#fff',borderRadius:16,padding:'13px 18px',boxShadow:'var(--sh3)',display:'flex',alignItems:'center',gap:10,animation:'float 4s ease-in-out infinite',zIndex:10}}>
                <span style={{fontSize:24}}>🦷</span>
                <div><div style={{fontFamily:'Bricolage Grotesque',fontWeight:800,color:'var(--teal)',fontSize:14}}>+50 cabinets</div><div style={{color:'var(--muted)',fontSize:11}}>font confiance à DPM</div></div>
              </div>
              <div style={{position:'absolute',top:-14,right:-16,background:'linear-gradient(135deg,var(--teal),var(--teal-lt))',borderRadius:14,padding:'10px 15px',boxShadow:'var(--sh-teal)',animation:'float 5.5s ease-in-out infinite reverse',zIndex:10}}>
                <div style={{color:'#fff',fontWeight:700,fontSize:12}}>⭐ 98% satisfaction</div>
              </div>
            </div>
          )}
        </div>
        {!isMobile&&<div style={{position:'absolute',bottom:28,left:'50%',transform:'translateX(-50%)',display:'flex',flexDirection:'column',alignItems:'center',gap:5,opacity:.45,pointerEvents:'none'}}>
          <span style={{fontSize:9,color:'#fff',letterSpacing:3,textTransform:'uppercase'}}>DÉCOUVRIR</span>
          <div style={{width:1,height:32,background:'linear-gradient(#fff,transparent)',animation:'float 2s ease-in-out infinite'}}/>
        </div>}
      </section>


      {/* ══ PAIN POINTS ══ */}
      <section style={{background:'var(--ink)',padding:`${isMobile?'56px 16px':'88px 56px'}`,position:'relative',overflow:'hidden'}}>
        {/* Fond décoratif */}
        <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(ellipse at 10% 50%,rgba(13,122,135,.15),transparent 55%),radial-gradient(ellipse at 90% 20%,rgba(13,122,135,.10),transparent 55%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px)',backgroundSize:'48px 48px',pointerEvents:'none'}}/>

        <div style={{maxWidth:1100,margin:'0 auto',position:'relative'}}>
          {/* En-tête */}
          <div className="sr" style={{textAlign:'center',marginBottom:isMobile?36:64}}>

            <h2 style={{fontFamily:'Bricolage Grotesque',fontWeight:800,fontSize:isMobile?26:isTablet?34:46,color:'#fff',lineHeight:1.15,marginBottom:16}}>
              <span style={{display:'block',fontSize:isMobile?'0.65em':'0.55em',fontWeight:700,color:'#FCA5A5',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:10}}>
                ⚠️ Vous reconnaissez-vous ?
              </span>
              <span style={{color:'#FFFFFF',textShadow:'0 0 40px rgba(255,255,255,.25)'}}>Ces problèmes freinent</span><br/>
              <span style={{color:'#5EEAD4'}}>votre cabinet au quotidien</span>
            </h2>
            <p style={{fontSize:isMobile?14:17,color:'rgba(255,255,255,.58)',maxWidth:560,margin:'0 auto',lineHeight:1.75}}>
              Des heures perdues en administratif, des factures à refaire, des rendez-vous oubliés... Ça vous parle ?
            </p>
          </div>

          {/* Grille des problèmes */}
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':isTablet?'repeat(2,1fr)':'repeat(3,1fr)',gap:isMobile?12:16,marginBottom:isMobile?36:56}}>
            {[
              {
                icon:'📋',
                q:'Vous gérez encore vos dossiers patients sur papier ?',
                pain:'Des heures à chercher une fiche patient, risque de perte, impossible de partager entre praticiens.',
                color:'#EF4444',
              },
              {
                icon:'🧾',
                q:'Créer une facture vous prend plus de 10 minutes ?',
                pain:'Calculs manuels, erreurs fréquentes, format non standard  et le patient qui attend au bureau.',
                color:'#F59E0B',
              },
              {
                icon:'📅',
                q:'Des patients oublient leurs rendez-vous sans prévenir ?',
                pain:"Des créneaux vides, du temps perdu, et un chiffre d'affaires qui s'évapore chaque semaine.",
                color:'#8B5CF6',
              },
              {
                icon:'📦',
                q:'Votre stock de matériel vous réserve des surprises ?',
                pain:'Commandes oubliées, ruptures en plein soin, produits périmés découverts trop tard.',
                color:'#10B981',
              },
              {
                icon:'💊',
                q:'Rédiger une ordonnance vous prend trop de temps ?',
                pain:"Écriture manuelle, illisibilité, risque d'erreurs de dosage, pas de trace numérique.",
                color:'#F59E0B',
              },
              {
                icon:'📊',
                q:'Vous ne savez pas exactement combien rapporte votre cabinet ?',
                pain:'Pas de tableau de bord, revenus flous, impossible de planifier ou de prouver la rentabilité.',
                color:'#0D7A87',
              },
            ].map((item,i)=>(
              <div key={i} className="sr" onClick={()=>navigate('/register')} style={{
                background:'rgba(255,255,255,.04)',
                border:'1px solid rgba(255,255,255,.08)',
                borderRadius:18,
                padding:isMobile?'20px 18px':'26px 24px',
                cursor:'pointer',
                transition:'all .3s cubic-bezier(.22,1,.36,1)',
                transitionDelay:`${i*.06}s`,
                position:'relative',
                overflow:'hidden',
              }}
              onMouseOver={e=>{e.currentTarget.style.background='rgba(255,255,255,.08)';e.currentTarget.style.borderColor='rgba(255,255,255,.18)';e.currentTarget.style.transform='translateY(-4px)';}}
              onMouseOut={e=>{e.currentTarget.style.background='rgba(255,255,255,.04)';e.currentTarget.style.borderColor='rgba(255,255,255,.08)';e.currentTarget.style.transform='translateY(0)';}}>
                {/* Pastille couleur */}
                <div style={{width:44,height:44,borderRadius:13,background:`${item.color}18`,border:`1px solid ${item.color}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,marginBottom:14}}>{item.icon}</div>
                {/* Question */}
                <p style={{fontFamily:'Bricolage Grotesque',fontWeight:700,fontSize:isMobile?14:15,color:'#fff',lineHeight:1.45,marginBottom:10}}>{item.q}</p>
                {/* Pain */}
                <p style={{fontSize:isMobile?12:13,color:'rgba(255,255,255,.45)',lineHeight:1.65,margin:0}}>{item.pain}</p>
                {/* Trait couleur bas */}
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${item.color}66,transparent)`,borderRadius:'0 0 18px 18px'}}/>
              </div>
            ))}
          </div>

          {/* CTA bas de section */}
          <div className="sr" style={{textAlign:'center'}}>
            <div style={{background:'linear-gradient(135deg,rgba(13,122,135,.2),rgba(13,163,180,.1))',border:'1px solid rgba(13,122,135,.35)',borderRadius:20,padding:isMobile?'28px 20px':'36px 48px',display:'inline-block',width:'100%',maxWidth:640}}>
              <p style={{fontFamily:'Bricolage Grotesque',fontWeight:800,fontSize:isMobile?20:26,color:'#fff',marginBottom:8,lineHeight:1.3}}>
                ✅ DPM résout tous ces problèmes.<br/>
                <span style={{color:'#7DD3DA'}}>En quelque secondes.</span>
              </p>
              <p style={{fontSize:isMobile?13:15,color:'rgba(255,255,255,.6)',marginBottom:22,lineHeight:1.6}}>
                Rejoignez les cabinets dentaires malgaches qui ont repris le contrôle de leur gestion.
              </p>
              <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
                <button onClick={()=>navigate('/register')} className="btn-main"
                  style={{padding:isMobile?'13px 22px':'14px 32px',borderRadius:12,background:'var(--teal)',color:'#fff',fontFamily:'Bricolage Grotesque',fontWeight:800,fontSize:isMobile?15:16,border:'none',cursor:'pointer',boxShadow:'var(--sh-teal)'}}>
                  Essayer gratuitement — 7 jours 
                </button>
                <a href="#tarifs" style={{padding:isMobile?'13px 18px':'14px 24px',borderRadius:12,background:'rgba(255,255,255,.08)',color:'rgba(255,255,255,.8)',fontWeight:600,fontSize:isMobile?14:15,border:'1px solid rgba(255,255,255,.18)',textDecoration:'none',display:'inline-flex',alignItems:'center'}}>
                  Voir les tarifs →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ STATS ══ */}
      <section style={{background:'#fff',padding:`${isMobile?'36px':'60px'} ${px}`,borderBottom:'1px solid var(--border)',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 50% 100%,rgba(13,122,135,.04),transparent 65%)',pointerEvents:'none'}}/>
        <div style={{maxWidth:1000,margin:'0 auto',display:'grid',gridTemplateColumns:c4,gap:isMobile?10:20,position:'relative'}}>
          <Counter end={50} suffix="+" label="+50 cabinets" sub="clients actifs en Madagascar"/>
          <Counter end={98} suffix="%" label="98% satisfaction" sub="notés par nos praticiens"/>
          <Counter end={3} suffix=" s" label="construction du facture" sub="rapide, fiable"/>
          <Counter end={24} suffix="/7" label="Support 24/7" sub="Équipe à Antananarivo"/>
        </div>
      </section>

      {/* ══ TICKER ══ */}
      <section style={{padding:`${isMobile?'18px':'32px'} 0`,borderBottom:'1px solid var(--border)',overflow:'hidden'}}>
        <Ticker items={['MVola Telma','Orange Money','Airtel Money','Versement Banquière','Cabinet Dentaire','Chirurgien-Dentiste','Implantologie','Orthodontie','Pédodontie','Prothèse Dentaire']}/>
      </section>

      {/* ══ HERO CENTRAL ══ */}
      <section style={{padding:`${py} ${px}`,maxWidth:1200,margin:'0 auto'}}>
        <div style={{textAlign:'center',marginBottom:isMobile?32:72,maxWidth:740,margin:`0 auto ${isMobile?32:72}px`}}>
          <span className="tag tag-teal au0" style={{marginBottom:12,display:'inline-flex'}}> DPM Madagascar</span>
          <h2 className="au1" style={{fontFamily:'Bricolage Grotesque',fontWeight:800,fontSize:isMobile?26:isTablet?36:48,color:'var(--ink)',lineHeight:1.15,marginBottom:14}}>
            Votre Cabinet Dentaire,<br/>digitalisé et optimisé
          </h2>
          <p className="au2" style={{fontSize:isMobile?14:18,color:'var(--slate)',lineHeight:1.75}}>
            Une solution complète et intuitive qui centralise tous vos outils  de la planification intelligente des RDV à la génération d'ordonnances PDF, en passant par la gestion du laboratoire.
          </p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:c2,gap:isMobile?8:16}}>
          {FEATURES_LIST.map((f,i)=>(
            <a key={i} href="#services" className="feat-item sr" onClick={e=>e.preventDefault()}
              style={{display:'flex',gap:12,alignItems:'flex-start',padding:isMobile?'14px':' 22px 24px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,textDecoration:'none',transitionDelay:`${i*.05}s`}}>
              <div style={{width:isMobile?36:46,height:isMobile?36:46,borderRadius:12,background:`${f.color}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:isMobile?20:24,flexShrink:0}}>{f.icon}</div>
              <div>
                <span style={{fontSize:10,fontWeight:700,color:f.color,textTransform:'uppercase',letterSpacing:1.5,display:'block',marginBottom:3}}>{f.tag}</span>
                <div style={{fontFamily:'Bricolage Grotesque',fontWeight:700,fontSize:isMobile?13:16,color:'var(--ink)',marginBottom:3}}>{f.title}</div>
                {!isMobile&&<div style={{fontSize:14,color:'var(--slate)',lineHeight:1.6}}>{f.desc}</div>}
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ══ SERVICES ══ */}
      <section id="services" style={{background:'var(--surface)',padding:`${py} ${px}`}}>
        <div style={{maxWidth:1200,margin:'0 auto',display:'grid',gridTemplateColumns:c2,gap:g2,alignItems:'center'}}>
          <div className="sr">
            <ST tag="📸 En images" title="Un logiciel pensé pour vous" sub="Paiement en Ariary, interface en français, facturation aux normes Madagascar. DPM s'adapte à votre réalité."/>
            <div style={{display:'flex',flexDirection:'column',gap:11}}>
              {['Odontogramme FDI complet avec historique par dent','Facturation MGA avec support MVola et Orange Money','Ordonnances et prescriptions format standard Madagascar','Gestion laboratoire prothèses et implants','Inventaire matériel avec alertes stock automatiques'].map((item,i)=>(
                <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                  <div style={{width:22,height:22,borderRadius:'50%',background:'#F0FDFE',border:'2px solid var(--teal)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>
                    <span style={{color:'var(--teal)',fontWeight:800,fontSize:10}}>✓</span>
                  </div>
                  <span style={{color:'var(--slate)',fontSize:isMobile?13:15,lineHeight:1.6}}>{item}</span>
                </div>
              ))}
            </div>
            <button onClick={()=>navigate('/register')} className="btn-main"
              style={{marginTop:22,padding:'13px 26px',borderRadius:12,background:'var(--teal)',color:'#fff',fontWeight:700,fontSize:15,border:'none',cursor:'pointer',width:isMobile?'100%':'auto'}}>
              Essayer gratuitement →
            </button>
          </div>
          <div className="sr" style={{transitionDelay:'.15s'}}>
            <FadeSlider images={IMGS_SERVICES} height={isMobile?240:460} interval={4200}/>
          </div>
        </div>
      </section>

      {/* ══ CTA MID ══ */}
      <section style={{background:'var(--ink)',padding:`${isMobile?'44px':'80px'} ${px}`,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle at 25% 50%,rgba(13,122,135,.2),transparent 50%),radial-gradient(circle at 75% 50%,rgba(13,122,135,.15),transparent 50%)',pointerEvents:'none'}}/>
        <div style={{maxWidth:1200,margin:'0 auto',display:'grid',gridTemplateColumns:c2,gap:isMobile?26:56,alignItems:'center',position:'relative'}}>
          <div className="sr">
            <span style={{fontSize:11,fontWeight:700,color:'#7DD3DA',letterSpacing:3,textTransform:'uppercase',display:'block',marginBottom:12}}> REJOIGNEZ DPM</span>
            <h2 style={{fontFamily:'Bricolage Grotesque',fontWeight:800,fontSize:isMobile?24:42,color:'#fff',lineHeight:1.15,marginBottom:14}}>
              <span style={{color:'#FACC15'}}>Révolutionnez</span>{' '}
              <span style={{color:'#fff'}}>la gestion de</span><br/>
              <span style={{color:'#5EEAD4'}}>votre cabinet</span>
            </h2>
            <p style={{color:'rgba(255,255,255,.65)',fontSize:isMobile?14:16,lineHeight:1.75,marginBottom:18}}>Transformez votre cabinet dentaire en quelques minutes. Interface moderne, fonctionnalités complètes, sécurité maximale.</p>
            {['✓ Démonstration en 7 jours gratuits','✓ Prise en main en 30 secondes','✓ Support technique prioritaire'].map(item=>(
              <div key={item} style={{fontSize:isMobile?13:15,color:'rgba(255,255,255,.75)',marginBottom:6}}>{item}</div>
            ))}
          </div>
          <div className="sr" style={{transitionDelay:'.15s',display:'flex',flexDirection:'column',gap:11}}>
            <button onClick={()=>navigate('/register')} className="btn-main"
              style={{padding:'17px 32px',borderRadius:13,background:'#fff',color:'var(--teal)',fontFamily:'Bricolage Grotesque',fontWeight:800,fontSize:isMobile?16:17,border:'none',cursor:'pointer'}}>
              Commencer maintenant →
            </button>
            <a href="#tarifs" style={{padding:'15px 32px',borderRadius:13,background:'transparent',color:'rgba(255,255,255,.7)',fontWeight:600,fontSize:isMobile?14:16,border:'1px solid rgba(255,255,255,.2)',textDecoration:'none',textAlign:'center'}}>Voir les tarifs</a>
            <div style={{display:'flex',gap:16,justifyContent:'center',flexWrap:'wrap'}}>
              {[{v:'⚡',l:'3 secoondes'},{v:'🇲🇬',l:'Made in Mada'},{v:'🔒',l:'100% sécurisé'}].map(b=>(
                <div key={b.l} style={{textAlign:'center'}}><div style={{fontSize:18}}>{b.v}</div><div style={{fontSize:10,color:'rgba(255,255,255,.45)',marginTop:2}}>{b.l}</div></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ POURQUOI ══ */}
      <section id="pourquoi" style={{padding:`${py} ${px}`,maxWidth:1200,margin:'0 auto'}}>
        <div className="sr" style={{textAlign:'center',marginBottom:isMobile?28:60}}>
          <ST tag="💡 Nos avantages" title="Pourquoi choisir DPM ?" sub="Ce qui nous différencie de toute autre solution sur le marché malgache"/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:c3,gap:g3}}>
          {[
            {icon:'🇲🇬',t:'100% Madagascar',d:"Ariary, MVola, Orange Money, langue française, normes malgaches. Conçu par des Malgaches pour les Malgaches.",c:'#0D7A87'},
            {icon:'💰',t:'Prix accessible',d:"À partir de 149 000 Ar/mois soit 4 900 Ar par jour. Le meilleur rapport qualité / prix du marché.",c:'#10B981'},
            {icon:'⚡',t:'Simple et rapide',d:"Opérationnel en 3 secondes. Interface intuitive, pas besoin d'informaticien. Formation incluse.",c:'#F59E0B'},
            {icon:'🔒',t:'Données sécurisées',d:"Chiffrement de bout en bout, sauvegarde quotidienne automatique, hébergement sécurisé.",c:'#7C3AED'},
            {icon:'🖥️',t:'Multi-appareils',d:"Ordinateur, tablette et smartphone. Gérez votre cabinet depuis n'importe où à Madagascar.",c:'#EF4444'},
            {icon:'🤝',t:'Support réactif',d:"Équipe basée à Antananarivo, réponse sous 24h. En français, par des Malgaches.",c:'#0D7A87'},
          ].map((a,i)=>(
            <div key={i} className="sr glow-card" style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:18,padding:isMobile?'18px 16px':'28px 24px',transitionDelay:`${i*.07}s`}}>
              <div style={{width:46,height:46,borderRadius:13,background:`${a.c}12`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,marginBottom:13}}>{a.icon}</div>
              <h3 style={{fontFamily:'Bricolage Grotesque',fontWeight:700,fontSize:isMobile?15:18,color:'var(--ink)',marginBottom:7}}>{a.t}</h3>
              <p style={{color:'var(--slate)',fontSize:isMobile?12:14,lineHeight:1.65}}>{a.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ TÉMOIGNAGES ══ */}
      <section style={{background:'var(--surface)',padding:`${py} ${px}`}}>
        <div style={{maxWidth:1200,margin:'0 auto'}}>
          <div className="sr" style={{textAlign:'center',marginBottom:isMobile?28:60}}>
            <ST tag="⭐ Avis clients" title="Ils nous font confiance" sub="Des chirurgiens-dentistes satisfaits à travers toute Madagascar"/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:c3,gap:isMobile?12:22,marginBottom:isMobile?18:48}}>
            {TEMOIGNAGES.map((t,i)=>(
              <div key={i} className="sr testi-card" style={{background:'#fff',borderRadius:20,padding:isMobile?'18px 16px':'28px 26px',border:'1px solid var(--border)',boxShadow:'var(--sh1)',transitionDelay:`${i*.1}s`}}>
                <div style={{display:'flex',gap:2,marginBottom:11}}>{Array(5).fill(0).map((_,j)=><span key={j} style={{color:'#F59E0B',fontSize:15}}>★</span>)}</div>
                <p style={{color:'var(--slate)',fontSize:isMobile?13:15,lineHeight:1.8,marginBottom:16,fontStyle:'italic'}}>&ldquo;{t.txt}&rdquo;</p>
                <div style={{display:'flex',alignItems:'center',gap:10,paddingTop:14,borderTop:'1px solid var(--border)'}}>
                  <div style={{width:38,height:38,borderRadius:'50%',background:'linear-gradient(135deg,var(--teal),var(--teal-lt))',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontFamily:'Bricolage Grotesque',fontWeight:800,fontSize:15,flexShrink:0}}>{t.nom.split(' ').pop()[0]}</div>
                  <div>
                    <div style={{fontFamily:'Bricolage Grotesque',fontWeight:700,color:'var(--ink)',fontSize:13}}>{t.nom}</div>
                    <div style={{color:'var(--muted)',fontSize:11}}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:c2,gap:isMobile?10:22}}>
            <div className="sr"><FadeSlider images={[{src:'7.webp',alt:'Soin',caption:'🦷 Soins de qualité pour chaque patient'},{src:'/6.webp',alt:'Cabinet',caption:' Cabinet professionnel et équipé'}]} height={isMobile?190:280} interval={4500}/></div>
            <div className="sr" style={{transitionDelay:'.15s'}}><FadeSlider images={[{src:'8.webp',alt:'Tech',caption:'🏥 Technologie au service du soin'},{src:'/5.webp',alt:'Dentiste',caption:' Excellence clinique quotidienne'}]} height={isMobile?190:280} interval={5200}/></div>
          </div>
        </div>
      </section>

      {/* ══ À PROPOS ══ */}
      <section style={{padding:`${py} ${px}`,maxWidth:1200,margin:'0 auto'}}>
        <div style={{display:'grid',gridTemplateColumns:c2,gap:g2,alignItems:'center'}}>
          <div className="sr">
            <ST tag="🏥 À propos" title="Notre mission : simplifier votre quotidien" sub={null}/>
            <div style={{marginBottom:26}}>
              <div style={{display:'flex',gap:12,alignItems:'flex-start',marginBottom:14,padding:'14px 16px',background:'#F0FDFE',borderRadius:12,borderLeft:'3px solid var(--teal)'}}>
                <span style={{fontSize:20,flexShrink:0}}>*</span>
                <p style={{color:'var(--slate)',fontSize:isMobile?14:15,lineHeight:1.8,margin:0}}>
                  DPM est né d&apos;un constat simple : les chirurgiens-dentistes malgaches méritent des outils modernes adaptés à leur réalité. Nous avons créé la solution qu&apos;aucun éditeur international ne pouvait offrir.
                </p>
              </div>
              <div style={{display:'flex',gap:12,alignItems:'flex-start',padding:'14px 16px',background:'var(--surface)',borderRadius:12,borderLeft:'3px solid #7DD3DA'}}>
                <span style={{fontSize:20,flexShrink:0}}>*</span>
                <p style={{color:'var(--slate)',fontSize:isMobile?14:15,lineHeight:1.8,margin:0}}>
                  Notre équipe basée à Antananarivo améliore continuellement la plateforme avec les retours directs des praticiens. <br />
                  Nous comprenons vos défis parce que nous sommes malgaches.
                </p>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginBottom:22}}>
              {[{v:'2024',l:'Année de création'},{v:'Tana',l:'Basé à Antananarivo'},{v:'🇲🇬',l:'Made in Madagascar'},{v:'24/7',l:'Support disponible'}].map((s,i)=>(
                <div key={i} style={{background:'var(--surface)',borderRadius:12,padding:isMobile?'13px 12px':'18px 20px',border:'1px solid var(--border)',textAlign:'center'}}>
                  <div style={{fontFamily:'Bricolage Grotesque',fontWeight:800,fontSize:isMobile?22:26,color:'var(--teal)'}}>{s.v}</div>
                  <div style={{color:'var(--muted)',fontSize:isMobile?11:13,marginTop:3}}>{s.l}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>navigate('/register')} className="btn-main"
              style={{padding:'12px 24px',borderRadius:12,background:'var(--teal)',color:'#fff',fontWeight:700,fontSize:15,border:'none',cursor:'pointer',width:isMobile?'100%':'auto'}}>
              Rejoindre DPM →
            </button>
          </div>
          <div className="sr" style={{transitionDelay:'.15s'}}>
            <FadeSlider images={IMGS_ABOUT} height={isMobile?260:500} interval={5000}/>
          </div>
        </div>
      </section>

      {/* ══ TARIFS ══ */}
      <section id="tarifs" style={{background:'var(--surface)',padding:`${py} ${px}`}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div className="sr" style={{textAlign:'center',marginBottom:isMobile?28:60}}>
            <ST tag="💰 Tarifs" title="Simple et transparent" sub="7 jours d'essai gratuit, sans carte bancaire. Résiliable à tout moment."/>
            <p style={{color:'var(--teal)',fontWeight:600,fontSize:isMobile?12:14,marginTop:-20}}>💳 MVola · Orange Money · Airtel Money · Virement Banquière</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:c3,gap:isMobile?12:20,alignItems:'start'}}>
            {PLANS.map((plan,i)=>(
              <div key={plan.name} className="plan-hover sr" style={{background:'#fff',borderRadius:20,padding:isMobile?'22px 18px':'32px 26px',border:plan.popular?'2px solid var(--teal)':'1px solid var(--border)',boxShadow:plan.popular?'var(--sh-teal)':'var(--sh1)',position:'relative',transitionDelay:`${i*.1}s`}}>
                {plan.popular&&<div style={{position:'absolute',top:-11,left:'50%',transform:'translateX(-50%)',background:'var(--teal)',color:'#fff',padding:'3px 14px',borderRadius:99,fontSize:11,fontWeight:800,whiteSpace:'nowrap'}}>⭐ Le plus populaire</div>}
                {!plan.popular&&i===2&&<div style={{position:'absolute',top:-11,left:'50%',transform:'translateX(-50%)',background:'#7C3AED',color:'#fff',padding:'3px 14px',borderRadius:99,fontSize:11,fontWeight:800,whiteSpace:'nowrap'}}>🏆 Premium</div>}
                <div style={{fontFamily:'Bricolage Grotesque',fontWeight:800,fontSize:16,color:'var(--ink)',marginBottom:4}}>{plan.name}</div>
                <div style={{fontSize:12,color:'var(--muted)',marginBottom:14}}>{plan.desc}</div>
                <div style={{marginBottom:18}}>
                  <span style={{fontFamily:'Bricolage Grotesque',fontWeight:800,fontSize:isMobile?28:40,color:'var(--teal)'}}>{plan.price}</span>
                  <span style={{color:'var(--muted)',fontSize:13}}> Ar/mois</span>
                </div>
                <div style={{height:1,background:'var(--border)',marginBottom:16}}/>
                <ul style={{listStyle:'none',padding:0,marginBottom:20}}>
                  {plan.features.map((f,j)=>(
                    <li key={j} style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:7,color:'var(--slate)',fontSize:isMobile?12:14}}>
                      <span style={{color:'var(--teal)',fontWeight:800,flexShrink:0}}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  <a href={plan.stripe} target="_blank" rel="noopener noreferrer"
                    style={{display:'block',width:'100%',padding:'12px',borderRadius:11,background:plan.popular?'var(--teal)':'transparent',color:plan.popular?'#fff':'var(--teal)',fontWeight:700,fontSize:14,border:'2px solid var(--teal)',cursor:'pointer',textDecoration:'none',textAlign:'center',boxSizing:'border-box'}}>
                    Payer avec Stripe →
                  </a>
                  <button onClick={()=>navigate('/register')} style={{width:'100%',padding:'10px',borderRadius:11,background:'transparent',color:'var(--muted)',fontWeight:600,fontSize:13,border:'1px solid var(--border)',cursor:'pointer'}}>
                    Essai gratuit 7 jours
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section id="faq" style={{padding:`${py} ${px}`,maxWidth:800,margin:'0 auto'}}>
        <div className="sr" style={{textAlign:'center',marginBottom:isMobile?24:56}}>
          <ST tag="❓ FAQ" title="Questions fréquentes" sub="Tout ce que vous voulez savoir sur DPM"/>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {FAQS.map((faq,i)=>(
            <div key={i} className="faq-item sr" onClick={()=>setOpenFaq(openFaq===i?null:i)}
              style={{background:'#fff',border:`1px solid ${openFaq===i?'var(--teal)':'var(--border)'}`,borderRadius:12,padding:isMobile?'15px 16px':'20px 24px',transitionDelay:`${i*.04}s`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
                <p style={{fontFamily:'Bricolage Grotesque',fontWeight:700,fontSize:isMobile?13:15,color:'var(--ink)',margin:0}}>{faq.q}</p>
                <span style={{color:'var(--teal)',fontSize:22,flexShrink:0,transition:'transform .3s',transform:openFaq===i?'rotate(45deg)':'rotate(0)',fontWeight:300}}>+</span>
              </div>
              {openFaq===i&&<p style={{color:'var(--slate)',fontSize:isMobile?13:14,lineHeight:1.8,marginTop:10,animation:'fadeIn .3s ease'}}>{faq.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ══ CONTACT ══ */}
      <section id="contact" style={{background:'var(--ink)',padding:`${py} ${px}`,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle at 25% 50%,rgba(13,122,135,.18),transparent 50%),radial-gradient(circle at 75% 20%,rgba(13,122,135,.12),transparent 50%)',pointerEvents:'none'}}/>
        <div style={{maxWidth:1200,margin:'0 auto',display:'grid',gridTemplateColumns:c2,gap:isMobile?30:72,position:'relative',alignItems:'start'}}>
          <div className="sr">
            <span style={{fontSize:11,fontWeight:700,color:'#7DD3DA',letterSpacing:3,textTransform:'uppercase',display:'block',marginBottom:12}}>📨 CONTACT</span>
            <h2 style={{fontFamily:'Bricolage Grotesque',fontWeight:800,fontSize:isMobile?26:42,color:'#fff',marginBottom:12,lineHeight:1.2}}>
              <span style={{color:'#fff'}}>Parlons de </span>
              <span style={{color:'#5EEAD4'}}>votre cabinet</span>
            </h2>
            <p style={{color:'rgba(255,255,255,.65)',fontSize:isMobile?14:16,lineHeight:1.78,marginBottom:28}}>Notre équipe à Antananarivo est disponible pour répondre à toutes vos questions.</p>
            {[{icon:'✉️',label:'Email',val:'contact@dentalpracticemada.com',href:'mailto:contact@dentalpracticemada.com'},{icon:'☎️',label:'Téléphone',val:'034 84 712 56',href:'tel:+261348471256'},{icon:'🗺️',label:'Adresse',val:'Tsiadana Ampasanimalo, Antananarivo'}].map((c,i)=>(
              <div key={i} style={{display:'flex',gap:13,alignItems:'flex-start',marginBottom:18}}>
                <div style={{width:42,height:42,background:'rgba(255,255,255,.08)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:19,flexShrink:0}}>{c.icon}</div>
                <div>
                  <div style={{color:'rgba(255,255,255,.45)',fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:1.5,marginBottom:3}}>{c.label}</div>
                  {c.href?<a href={c.href} style={{color:'#fff',fontWeight:600,fontSize:isMobile?14:16,textDecoration:'none'}}>{c.val}</a>:<div style={{color:'#fff',fontWeight:600,fontSize:isMobile?14:16}}>{c.val}</div>}
                </div>
              </div>
            ))}
            <div style={{marginTop:24,padding:'18px 20px',background:'rgba(255,255,255,.07)',borderRadius:14,border:'1px solid rgba(255,255,255,.12)'}}>
              <p style={{color:'rgba(255,255,255,.5)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1.5,marginBottom:10}}>PRÊT À COMMENCER ?</p>
              <button onClick={()=>navigate('/register')} className="btn-main"
                style={{padding:'11px 22px',borderRadius:11,background:'#fff',color:'var(--teal)',fontFamily:'Bricolage Grotesque',fontWeight:800,fontSize:14,border:'none',cursor:'pointer',width:isMobile?'100%':'auto'}}>
                Essai gratuit 7 jours 
              </button>
            </div>
          </div>
          <div className="sr" style={{transitionDelay:'.15s'}}>
            {!contactSent?(
              <div style={{background:'rgba(255,255,255,.07)',borderRadius:20,padding:isMobile?'22px 18px':'34px 30px',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,.1)'}}>
                <h3 style={{fontFamily:'Bricolage Grotesque',fontWeight:800,fontSize:isMobile?18:22,color:'#fff',marginBottom:18}}>Envoyer un message</h3>
                {[{l:'Votre nom',n:'nom',ph:'Dr. Rakoto Jean',t:'text'},{l:'Email',n:'email',ph:'contact@cabinet.mg',t:'email'}].map(f=>(
                  <div key={f.n} style={{marginBottom:13}}>
                    <label style={{display:'block',fontSize:13,fontWeight:600,color:'rgba(255,255,255,.6)',marginBottom:5}}>{f.l}</label>
                    <input type={f.t} placeholder={f.ph} value={contact[f.n]} onChange={e=>setContact(p=>({...p,[f.n]:e.target.value}))}
                      style={{width:'100%',padding:'12px 14px',borderRadius:11,border:'1.5px solid rgba(255,255,255,.15)',background:'rgba(255,255,255,.07)',color:'#fff',fontSize:16,fontFamily:'Inter,sans-serif',outline:'none',transition:'border-color .2s'}}
                      onFocus={e=>e.target.style.borderColor='rgba(255,255,255,.45)'}
                      onBlur={e=>e.target.style.borderColor='rgba(255,255,255,.15)'}/>
                  </div>
                ))}
                <div style={{marginBottom:16}}>
                  <label style={{display:'block',fontSize:13,fontWeight:600,color:'rgba(255,255,255,.6)',marginBottom:5}}>Message</label>
                  <textarea rows={isMobile?3:5} placeholder="Décrivez votre besoin..." value={contact.message} onChange={e=>setContact(p=>({...p,message:e.target.value}))}
                    style={{width:'100%',padding:'12px 14px',borderRadius:11,border:'1.5px solid rgba(255,255,255,.15)',background:'rgba(255,255,255,.07)',color:'#fff',fontSize:16,fontFamily:'Inter,sans-serif',outline:'none',resize:'vertical',transition:'border-color .2s'}}
                    onFocus={e=>e.target.style.borderColor='rgba(255,255,255,.45)'}
                    onBlur={e=>e.target.style.borderColor='rgba(255,255,255,.15)'}/>
                </div>
                <button className="btn-main" onClick={()=>{if(contact.nom&&contact.email&&contact.message)setContactSent(true);}}
                  style={{width:'100%',padding:'14px',borderRadius:12,background:'#fff',color:'var(--teal)',fontFamily:'Bricolage Grotesque',fontWeight:800,fontSize:15,border:'none',cursor:'pointer'}}>
                  Envoyer le message 
                </button>
              </div>
            ):(
              <div style={{background:'rgba(255,255,255,.07)',borderRadius:20,padding:'44px 22px',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,.1)',textAlign:'center'}}>
                <div style={{fontSize:52,marginBottom:13,animation:'float 3s ease-in-out infinite'}}>✅</div>
                <h3 style={{fontFamily:'Bricolage Grotesque',fontWeight:800,fontSize:22,color:'#fff',marginBottom:8}}>Message envoyé !</h3>
                <p style={{color:'rgba(255,255,255,.65)',lineHeight:1.75,fontSize:isMobile?14:16}}>Merci {contact.nom} !<br/>Nous vous répondrons à <strong style={{color:'#fff'}}>{contact.email}</strong> sous 24h.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{
        background:'#03080B',
        padding: isMobile ? '32px 20px 24px' : '40px 56px 28px',
        display:'flex', flexDirection:'column', gap:0,
        borderTop:'1px solid rgba(13,122,135,.25)',
      }}>
        {/* ── Ligne unique : nav + réseaux + copyright ── */}
        <div style={{
          display:'flex', alignItems:'center',
          justifyContent:'space-between',
          flexWrap:'wrap', gap: isMobile ? 20 : 14,
        }}>

          {/* Liens nav */}
          <div style={{ display:'flex', gap: isMobile ? 14 : 24, flexWrap:'wrap', alignItems:'center' }}>
            {[
              ['#services',      'Fonctionnalités'],
              ['#tarifs',        'Tarifs'],
              ['#faq',           'FAQ'],
              ['/legal/mentions','Mentions légales'],
              ['/legal/cgv',     'CGV'],
              ['/legal/privacy', 'Confidentialité'],
              ['/legal/cookies', 'Cookies'],
            ].map(([h,l]) => (
              <a key={h} href={h}
                style={{color:'rgba(255,255,255,.4)',fontSize:12,textDecoration:'none',fontWeight:500,transition:'color .2s'}}
                onMouseOver={e=>e.currentTarget.style.color='#fff'}
                onMouseOut={e=>e.currentTarget.style.color='rgba(255,255,255,.4)'}>
                {l}
              </a>
            ))}
          </div>

          {/* Réseaux sociaux */}
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            {[
              { href:'https://www.facebook.com/profile.php?id=61575985702570', label:'Facebook',
                icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
              { href:'https://wa.me/261348471256', label:'WhatsApp',
                icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> },
              { href:'https://www.tiktok.com/@dentalpm.madagascar', label:'TikTok',
                icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.2 8.2 0 004.79 1.53V6.75a4.85 4.85 0 01-1.02-.06z"/></svg> },
              { href:'mailto:contact@dentalpracticemada.com', label:'Email',
                icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg> },
            ].map(s => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                title={s.label}
                style={{ width:34, height:34, borderRadius:10, background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.1)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s', textDecoration:'none', color:'#fff' }}
                onMouseOver={e=>{ e.currentTarget.style.background='rgba(13,122,135,.4)'; e.currentTarget.style.borderColor='rgba(13,122,135,.6)'; }}
                onMouseOut={e=>{ e.currentTarget.style.background='rgba(255,255,255,.08)'; e.currentTarget.style.borderColor='rgba(255,255,255,.1)'; }}>
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Séparateur */}
        <div style={{ height:1, background:'rgba(255,255,255,.07)', margin:'20px 0 16px' }}/>

        {/* Copyright */}
        <div style={{ display:'flex', alignItems:'center', justifyContent: isMobile ? 'center' : 'space-between', flexWrap:'wrap', gap:10 }}>
          <span style={{ fontSize:12, color:'rgba(255,255,255,.25)', fontWeight:500, letterSpacing:'.02em' }}>
            &copy; 2026 DANIERO GLOBAL LLC. Tous droits réservés.
          </span>
          <div style={{ display:'flex', gap:16, alignItems:'center' }}>
            <button onClick={()=>navigate('/login')}
              style={{ padding:'5px 14px', borderRadius:7, border:'1px solid rgba(255,255,255,.15)', background:'transparent', color:'rgba(255,255,255,.45)', cursor:'pointer', fontSize:12, fontWeight:600, transition:'all .2s' }}
              onMouseOver={e=>{ e.currentTarget.style.borderColor='rgba(13,122,135,.6)'; e.currentTarget.style.color='#fff'; }}
              onMouseOut={e=>{ e.currentTarget.style.borderColor='rgba(255,255,255,.15)'; e.currentTarget.style.color='rgba(255,255,255,.45)'; }}>
              Connexion
            </button>
          </div>
        </div>
      </footer>

      <InscriptionModal show={modal.show} plan={modal.plan} onClose={()=>setModal({show:false,plan:null})} navigate={navigate}/>
    </div>
  );
}
