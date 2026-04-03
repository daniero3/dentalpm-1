import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://dentalpm-1-production.up.railway.app/api';

// ── Styles globaux ─────────────────────────────────────────────────────────────
const G = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    html{scroll-behavior:smooth;}

    @keyframes fadeUp   { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
    @keyframes float    { 0%,100%{transform:translateY(0) rotate(0deg)} 40%{transform:translateY(-14px) rotate(2deg)} 70%{transform:translateY(-6px) rotate(-1deg)} }
    @keyframes pulse    { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.06)} }
    @keyframes shimmer  { 0%{background-position:-200% center} 100%{background-position:200% center} }
    @keyframes orb      { 0%,100%{transform:translate(0,0) scale(1)} 25%{transform:translate(30px,-20px) scale(1.1)} 50%{transform:translate(-20px,30px) scale(.9)} 75%{transform:translate(20px,10px) scale(1.05)} }
    @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:0} }
    @keyframes particle { 0%{transform:translateY(0) scale(1);opacity:.7} 100%{transform:translateY(-140px) scale(.6);opacity:0} }
    @keyframes countUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes scaleIn  { from{opacity:0;transform:scale(.88)} to{opacity:1;transform:scale(1)} }
    @keyframes slideLeft{ from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
    @keyframes spin     { to{transform:rotate(360deg)} }
    @keyframes gradAnim { 0%,100%{background-position:0 50%} 50%{background-position:100% 50%} }

    .au0{animation:fadeUp .7s cubic-bezier(.22,1,.36,1) both;}
    .au1{animation:fadeUp .7s cubic-bezier(.22,1,.36,1) .15s both;}
    .au2{animation:fadeUp .7s cubic-bezier(.22,1,.36,1) .3s both;}
    .au3{animation:fadeUp .7s cubic-bezier(.22,1,.36,1) .45s both;}
    .au4{animation:fadeUp .7s cubic-bezier(.22,1,.36,1) .6s both;}

    .sr{opacity:0;transform:translateY(28px);transition:opacity .65s ease,transform .65s cubic-bezier(.22,1,.36,1);}
    .sr.vis{opacity:1;transform:translateY(0);}

    .card-feat{transition:transform .3s cubic-bezier(.22,1,.36,1),box-shadow .3s,border-color .3s;}
    .card-feat:hover{transform:translateY(-8px) scale(1.02);box-shadow:0 24px 56px rgba(13,122,135,.18);border-color:#0D7A87!important;}

    .btn-cta{position:relative;overflow:hidden;transition:transform .2s,box-shadow .2s;}
    .btn-cta::after{content:'';position:absolute;inset:0;background:linear-gradient(120deg,transparent 30%,rgba(255,255,255,.22) 50%,transparent 70%);transform:translateX(-100%);transition:transform .5s;}
    .btn-cta:hover::after{transform:translateX(100%);}
    .btn-cta:hover{transform:translateY(-2px);box-shadow:0 14px 36px rgba(13,122,135,.42);}

    .plan-card{transition:transform .3s cubic-bezier(.22,1,.36,1),box-shadow .3s;}
    .plan-card:hover{transform:translateY(-10px);box-shadow:0 28px 64px rgba(0,0,0,.13);}

    .faq-item{transition:background .25s;}
    .faq-item:hover{background:#F0FDFE!important;}

    .tooltip-wrap{position:relative;display:inline-block;}
    .tooltip-box{
      visibility:hidden;opacity:0;position:absolute;bottom:calc(100% + 12px);left:50%;
      transform:translateX(-50%) translateY(6px);
      background:linear-gradient(135deg,#083D44,#0D7A87);
      color:#fff;border-radius:14px;padding:12px 16px;width:220px;
      font-size:13px;line-height:1.55;font-weight:500;
      box-shadow:0 16px 40px rgba(13,122,135,.35);
      transition:opacity .25s,transform .25s,visibility .25s;z-index:50;pointer-events:none;
    }
    .tooltip-box::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);
      border:7px solid transparent;border-top-color:#0D7A87;}
    .tooltip-wrap:hover .tooltip-box{visibility:visible;opacity:1;transform:translateX(-50%) translateY(0);}

    ::-webkit-scrollbar{width:5px;}
    ::-webkit-scrollbar-thumb{background:#0D7A87;border-radius:99px;}

    .shimmer{background:linear-gradient(90deg,#7DD3DA,#fff,#7DD3DA,#fff);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 3s linear infinite;}

    .img-dental{border-radius:20px;object-fit:cover;width:100%;height:100%;display:block;}
    .img-wrap{border-radius:20px;overflow:hidden;box-shadow:0 20px 48px rgba(0,0,0,.15);}
  `}</style>
);

// ── Logo ───────────────────────────────────────────────────────────────────────
const Logo = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <path d="M50 8C35 8,20 18,18 32C16 44,20 52,22 58C25 68,28 80,32 88C34 93,38 95,42 92C45 89,46 82,48 74C49 70,50 68,50 68C50 68,51 70,52 74C54 82,55 89,58 92C62 95,66 93,68 88C72 80,75 68,78 58C80 52,84 44,82 32C80 18,65 8,50 8Z" fill="white" opacity=".95"/>
    <path d="M35 18C28 22,24 30,24 38C24 40,26 41,27 40C29 32,34 24,42 20C44 19,44 16,42 16C39 16,37 17,35 18Z" fill="white" opacity=".5"/>
    <rect x="44" y="30" width="12" height="34" rx="5" fill="#0D7A87" opacity=".9"/>
    <rect x="30" y="44" width="40" height="12" rx="5" fill="#0D7A87" opacity=".9"/>
  </svg>
);

// ── Particles ─────────────────────────────────────────────────────────────────
const Particles = ({ n = 16 }) => (
  <div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none'}}>
    {Array.from({length:n},(_,i)=>({
      size:5+Math.random()*9, left:Math.random()*100,
      delay:Math.random()*7, dur:4+Math.random()*5
    })).map((p,i)=>(
      <div key={i} style={{
        position:'absolute',bottom:0,left:`${p.left}%`,
        width:p.size,height:p.size,borderRadius:'50%',
        background:'rgba(255,255,255,.14)',
        animation:`particle ${p.dur}s ${p.delay}s ease-in infinite`,
      }}/>
    ))}
  </div>
);

// ── Typing ────────────────────────────────────────────────────────────────────
const useTyping = (texts, speed=75, pause=1900) => {
  const [display,setDisplay]=useState('');
  const [idx,setIdx]=useState(0);
  const [ci,setCi]=useState(0);
  const [del,setDel]=useState(false);
  useEffect(()=>{
    const cur=texts[idx];
    const t=setTimeout(()=>{
      if(!del){
        setDisplay(cur.slice(0,ci+1));
        if(ci+1===cur.length) setTimeout(()=>setDel(true),pause);
        else setCi(c=>c+1);
      } else {
        setDisplay(cur.slice(0,ci-1));
        if(ci-1===0){setDel(false);setIdx(i=>(i+1)%texts.length);setCi(0);}
        else setCi(c=>c-1);
      }
    }, del ? speed/2 : speed);
    return ()=>clearTimeout(t);
  },[display,del,ci,idx,texts,speed,pause]);
  return display;
};

// ── Scroll reveal ─────────────────────────────────────────────────────────────
const useScrollReveal=()=>{
  useEffect(()=>{
    const obs=new IntersectionObserver(
      es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('vis');}),
      {threshold:.12}
    );
    document.querySelectorAll('.sr').forEach(el=>obs.observe(el));
    return ()=>obs.disconnect();
  },[]);
};

// ── StatCounter ───────────────────────────────────────────────────────────────
const StatCounter=({end,label,suffix=''})=>{
  const [n,setN]=useState(0);
  const ref=useRef(null);
  const done=useRef(false);
  useEffect(()=>{
    const obs=new IntersectionObserver(([e])=>{
      if(e.isIntersecting&&!done.current){
        done.current=true;
        let s=0; const step=end/55;
        const t=setInterval(()=>{s+=step;if(s>=end){setN(end);clearInterval(t);}else setN(Math.floor(s));},18);
      }
    },{threshold:.5});
    if(ref.current)obs.observe(ref.current);
    return ()=>obs.disconnect();
  },[end]);
  return(
    <div ref={ref} style={{textAlign:'center',animation:'countUp .6s ease both'}}>
      <p style={{fontFamily:'Plus Jakarta Sans',fontWeight:900,fontSize:42,color:'#0D7A87',margin:0}}>{n}{suffix}</p>
      <p style={{color:'#64748B',fontSize:14,marginTop:5}}>{label}</p>
    </div>
  );
};

// ── Plans ─────────────────────────────────────────────────────────────────────
const PLANS=[
  {name:'ESSENTIAL',price:'149 000',popular:false,
   features:['1 praticien + 1 assistant(e)','500 patients','Gestion RDV','Facturation de base','Ordonnances PDF','Odontogramme','Support email']},
  {name:'PRO',price:'199 000',popular:true,
   features:['5 praticiens','Patients illimités','RDV avancé + rappels','Facturation complète','Laboratoire dentaire','Inventaire & Stock','Rapports financiers','SMS automatiques','Support prioritaire']},
  {name:'GROUP',price:'299 000',popular:false,
   features:['Praticiens illimités','Multi-sites','Patients illimités','Tout PRO inclus','API dédiée','Dashboard groupe','Gestionnaire dédié','Formation incluse']},
];

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQS=[
  {q:'Comment fonctionne l\'essai gratuit de 7 jours ?',
   a:'Créez votre compte gratuitement, aucune carte bancaire requise. Vous accédez à toutes les fonctionnalités du plan PRO pendant 7 jours. À la fin, choisissez votre plan et payez via MVola, Orange Money ou virement.'},
  {q:'Mes données patients sont-elles sécurisées ?',
   a:'Oui, toutes vos données sont chiffrées et stockées de manière sécurisée. Nous respectons la confidentialité médicale. Vos données ne sont jamais partagées avec des tiers.'},
  {q:'Puis-je annuler mon abonnement à tout moment ?',
   a:'Absolument. Aucun engagement, aucune pénalité. Vous pouvez annuler votre abonnement à tout moment depuis votre espace cabinet. Vos données restent accessibles jusqu\'à la fin de la période payée.'},
  {q:'Combien de patients puis-je gérer avec le plan ESSENTIAL ?',
   a:'Le plan ESSENTIAL vous permet de gérer jusqu\'à 500 patients actifs avec 1 praticien et 1 assistant(e). Pour des besoins plus importants, le plan PRO offre des patients illimités.'},
  {q:'Comment se fait le paiement mensuel ?',
   a:'Vous envoyez votre paiement par MVola (034), Orange Money (032), Airtel Money (033) ou virement bancaire BNI. Notre équipe valide votre paiement sous 24h et votre abonnement est renouvelé automatiquement.'},
  {q:'DPM fonctionne-t-il sur téléphone mobile ?',
   a:'Oui, DPM est entièrement responsive et fonctionne sur tous les appareils : ordinateur, tablette et smartphone. Vous pouvez gérer votre cabinet depuis n\'importe où à Madagascar.'},
  {q:'Puis-je migrer mes données existantes vers DPM ?',
   a:'Oui, notre équipe vous accompagne dans la migration de vos données existantes (patients, historiques). Contactez-nous sur radisonfrancky@gmail.com pour un accompagnement personnalisé.'},
  {q:'Y a-t-il une formation pour utiliser DPM ?',
   a:'Le plan GROUP inclut une formation personnalisée. Pour tous les plans, nous fournissons une documentation complète, des tutoriels vidéo et un support réactif par email et téléphone.'},
];

// ── Témoignages ────────────────────────────────────────────────────────────────
const TEMOIGNAGES=[
  {nom:'Dr. Rakoto Jean',role:'Chirurgien-dentiste, Antananarivo',note:5,txt:'DPM a transformé la gestion de mon cabinet. Je passe moins de temps sur l\'administratif et plus de temps avec mes patients. La facturation est devenu un jeu d\'enfant !'},
  {nom:'Dr. Rasoa Marie',role:'Orthodontiste, Fianarantsoa',note:5,txt:'L\'odontogramme digital est remarquable. Je peux suivre l\'évolution de chaque dent avec précision. Le système de rappels SMS a réduit mes rendez-vous manqués de 70%.'},
  {nom:'Dr. Randria Paul',role:'Cabinet de groupe, Toamasina',note:5,txt:'Nous avons 3 praticiens et DPM gère tout parfaitement. Les rapports financiers nous donnent une visibilité claire sur nos revenus. Je recommande vivement.'},
];

// ── Tooltip feature items ──────────────────────────────────────────────────────
const FEAT_TOOLTIPS=[
  {icon:'🦷',label:'Odontogramme',tip:'Schéma dentaire FDI interactif complet. Enregistrez chaque soin, couronne ou extraction par numéro de dent avec historique complet.'},
  {icon:'🧾',label:'Facturation',tip:'Créez devis et factures professionnels en 30 secondes. Paiement MVola, Orange Money, espèces. PDF automatique avec cachet du cabinet.'},
  {icon:'💊',label:'Ordonnances',tip:'Ordonnances générées en un clic avec signature du praticien. Format standard Madagascar, impression ou envoi par email au patient.'},
  {icon:'📦',label:'Inventaire',tip:'Suivi en temps réel de tout votre matériel dentaire. Alertes automatiques quand un produit atteint le stock minimum.'},
  {icon:'📊',label:'Rapports',tip:'Tableaux de bord financiers détaillés : CA mensuel, paiements en attente, actes les plus fréquents, taux de remplissage du planning.'},
  {icon:'💬',label:'SMS auto',tip:'Rappels de RDV envoyés automatiquement 24h avant. Messages d\'anniversaire et relances patients inactifs. Zéro oubli, zéro appel manuel.'},
  {icon:'🔬',label:'Laboratoire',tip:'Gérez vos commandes prothèses et implants. Suivi des délais de livraison, coûts labo et correspondance avec les cas patients.'},
];

// ── Modal ─────────────────────────────────────────────────────────────────────
const Modal=({show,onClose,plan,navigate})=>{
  const [step,setStep]=useState(1);
  const [done,setDone]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({cabinet:'',email:'',phone:'',city:'',dentists:'1'});
  if(!show)return null;

  const handleSubmit=async()=>{
    setSaving(true);
    try{
      await axios.post(`${API_URL}/auth/register-clinic`,{
        cabinet:form.cabinet,email:form.email,phone:form.phone,
        city:form.city,dentists:form.dentists,plan:plan?.name||'PRO'
      });
      setDone(true);
    }catch(e){
      alert(e.response?.data?.error||'Erreur inscription. Vérifiez vos informations.');
    }finally{setSaving(false);}
  };

  const inp={width:'100%',padding:'10px 13px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:14,fontFamily:'DM Sans,sans-serif',outline:'none',transition:'border-color .2s'};

  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{position:'fixed',inset:0,zIndex:2000,background:'rgba(15,23,42,.75)',backdropFilter:'blur(5px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,animation:'fadeIn .2s ease'}}>
      <div style={{background:'#fff',borderRadius:24,padding:'36px 32px',maxWidth:500,width:'100%',maxHeight:'90vh',overflowY:'auto',position:'relative',animation:'scaleIn .3s cubic-bezier(.22,1,.36,1)'}}>
        <button onClick={onClose} style={{position:'absolute',top:14,right:14,background:'#F1F5F9',border:'none',borderRadius:99,width:32,height:32,cursor:'pointer',fontSize:16,color:'#64748B'}}>✕</button>

        {!done?(
          <>
            <div style={{display:'flex',gap:5,marginBottom:18}}>
              {[1,2].map(s=><div key={s} style={{height:4,flex:1,borderRadius:99,background:step>=s?'#0D7A87':'#E2E8F0',transition:'background .3s'}}/>)}
            </div>
            <h2 style={{fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:21,color:'#0F172A',marginBottom:4}}>
              {step===1?'🚀 Essai gratuit 7 jours':'💳 Modalités de paiement'}
            </h2>
            {plan&&<div style={{background:'#F0FDFE',border:'1px solid #0D7A87',borderRadius:10,padding:'8px 14px',margin:'10px 0 16px',display:'flex',justifyContent:'space-between'}}>
              <span style={{fontWeight:700,color:'#0D7A87',fontSize:14}}>Plan {plan.name}</span>
              <span style={{fontWeight:800,color:'#0D7A87',fontSize:14}}>{plan.price} Ar/mois</span>
            </div>}

            {step===1&&(
              <div>
                {[
                  {label:'Nom du cabinet *',name:'cabinet',placeholder:'Cabinet Dentaire Dr. Rakoto',type:'text'},
                  {label:'Email professionnel *',name:'email',placeholder:'contact@cabinet.mg',type:'email'},
                  {label:'Téléphone MVola/Orange *',name:'phone',placeholder:'034 XX XXX XX',type:'tel'},
                  {label:'Ville *',name:'city',placeholder:'Antananarivo',type:'text'},
                ].map(f=>(
                  <div key={f.name} style={{marginBottom:12}}>
                    <label style={{display:'block',fontSize:13,fontWeight:600,color:'#475569',marginBottom:5}}>{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder} required value={form[f.name]}
                      onChange={e=>setForm(p=>({...p,[f.name]:e.target.value}))}
                      style={inp}
                      onFocus={e=>e.target.style.borderColor='#0D7A87'}
                      onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
                  </div>
                ))}
                <div style={{marginBottom:20}}>
                  <label style={{display:'block',fontSize:13,fontWeight:600,color:'#475569',marginBottom:5}}>Nombre de praticiens</label>
                  <select value={form.dentists} onChange={e=>setForm(p=>({...p,dentists:e.target.value}))}
                    style={{...inp,background:'#fff'}}>
                    <option value="1">1 praticien</option>
                    <option value="2-3">2-3 praticiens</option>
                    <option value="4-5">4-5 praticiens</option>
                    <option value="5+">5+ praticiens</option>
                  </select>
                </div>
                <button
                  disabled={!form.cabinet||!form.email||!form.phone||!form.city}
                  onClick={()=>setStep(2)}
                  className="btn-cta"
                  style={{width:'100%',padding:14,borderRadius:12,background:'linear-gradient(135deg,#0D7A87,#13A3B4)',color:'#fff',fontWeight:700,fontSize:15,border:'none',cursor:'pointer',opacity:(!form.cabinet||!form.email||!form.phone||!form.city)?.5:1}}>
                  Continuer →
                </button>
              </div>
            )}

            {step===2&&(
              <div>
                <p style={{color:'#475569',fontSize:14,lineHeight:1.6,marginBottom:14}}>
                  Votre <strong>7 jours d'essai gratuit</strong> commence immédiatement après confirmation. À la fin, payez par :
                </p>
                {[
                  {name:'MVola',num:'034 XX XXX XX',color:'#E30613'},
                  {name:'Orange Money',num:'032 XX XXX XX',color:'#FF6600'},
                  {name:'Airtel Money',num:'033 XX XXX XX',color:'#E4002B'},
                  {name:'Virement BNI',num:'RIB fourni sur demande',color:'#1A3A5C'},
                ].map(p=>(
                  <div key={p.name} style={{background:'#F8FAFC',border:'1px solid #E2E8F0',borderRadius:10,padding:'9px 14px',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontWeight:700,color:p.color,fontSize:14}}>{p.name}</span>
                    <span style={{color:'#64748B',fontSize:13}}>{p.num}</span>
                  </div>
                ))}
                <button onClick={handleSubmit} disabled={saving} className="btn-cta"
                  style={{width:'100%',marginTop:16,padding:14,borderRadius:12,background:'linear-gradient(135deg,#0D7A87,#13A3B4)',color:'#fff',fontWeight:700,fontSize:15,border:'none',cursor:'pointer',opacity:saving?.6:1}}>
                  {saving?'⏳ Création en cours...':'✓ Confirmer mon inscription'}
                </button>
                <button onClick={()=>setStep(1)} style={{width:'100%',marginTop:8,padding:9,background:'none',color:'#94A3B8',border:'none',cursor:'pointer',fontSize:13}}>← Retour</button>
              </div>
            )}
          </>
        ):(
          <div style={{textAlign:'center',padding:'8px 0'}}>
            <div style={{fontSize:64,marginBottom:16,animation:'float 3s ease-in-out infinite'}}>🎉</div>
            <h2 style={{fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:22,color:'#0F172A',marginBottom:8}}>Bienvenue sur DPM !</h2>
            <p style={{color:'#475569',lineHeight:1.7,marginBottom:20}}>
              Cabinet <strong>{form.cabinet}</strong> créé avec succès !<br/>
              Un email avec vos identifiants a été envoyé à <strong>{form.email}</strong>
            </p>
            <div style={{background:'#F0FDFE',border:'1px solid #0D7A87',borderRadius:12,padding:14,marginBottom:20,textAlign:'left'}}>
              <p style={{margin:0,fontSize:13,color:'#0D7A87',fontWeight:700}}>🕐 Votre essai de 7 jours démarre maintenant !</p>
              <p style={{margin:'4px 0 0',color:'#475569',fontSize:13}}>Connectez-vous avec les identifiants reçus par email.</p>
            </div>
            <button onClick={()=>navigate('/login')} className="btn-cta"
              style={{width:'100%',padding:14,borderRadius:12,background:'linear-gradient(135deg,#0D7A87,#13A3B4)',color:'#fff',fontWeight:700,fontSize:15,border:'none',cursor:'pointer'}}>
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
export default function LandingPage(){
  const navigate=useNavigate();
  const [scrolled,setScrolled]=useState(false);
  const [modal,setModal]=useState({show:false,plan:null});
  const [openFaq,setOpenFaq]=useState(null);
  const [contactForm,setContactForm]=useState({nom:'',email:'',message:''});
  const [contactSent,setContactSent]=useState(false);

  const typed=useTyping(['Gestion patients & RDV','Facturation Madagascar','Odontogramme digital','Ordonnances PDF','Laboratoire dentaire'],72,1800);
  useScrollReveal();

  useEffect(()=>{
    const fn=()=>setScrolled(window.scrollY>60);
    window.addEventListener('scroll',fn);
    return ()=>window.removeEventListener('scroll',fn);
  },[]);

  const open=(plan)=>setModal({show:true,plan});
  const inpStyle={width:'100%',padding:'11px 14px',borderRadius:11,border:'1.5px solid #E2E8F0',fontSize:14,fontFamily:'DM Sans,sans-serif',outline:'none',transition:'border-color .2s'};

  return(
    <div style={{fontFamily:"'DM Sans',sans-serif",background:'#F8FAFC',minHeight:'100vh',overflowX:'hidden'}}>
      <G/>

      {/* ══ NAV ══════════════════════════════════════════════════════════════ */}
      <nav style={{
        position:'fixed',top:0,left:0,right:0,zIndex:100,
        background:scrolled?'rgba(255,255,255,.96)':'transparent',
        backdropFilter:scrolled?'blur(14px)':'none',
        borderBottom:scrolled?'1px solid rgba(226,232,240,.8)':'none',
        padding:'0 48px',display:'flex',alignItems:'center',justifyContent:'space-between',
        height:68,transition:'all .35s ease',
        boxShadow:scrolled?'0 4px 24px rgba(0,0,0,.07)':'none',
      }}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:42,height:42,background:'linear-gradient(135deg,#0D7A87,#083D44)',borderRadius:13,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 14px rgba(13,122,135,.3)'}}>
            <Logo size={28}/>
          </div>
          <span style={{fontFamily:'Plus Jakarta Sans',fontWeight:900,fontSize:22,color:scrolled?'#0F172A':'#fff'}}>DPM</span>
          <span style={{fontSize:11,color:scrolled?'#64748B':'rgba(255,255,255,.7)',background:scrolled?'#F1F5F9':'rgba(255,255,255,.15)',padding:'2px 9px',borderRadius:99,fontWeight:600}}>Madagascar</span>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          {['#services','#pourquoi','#tarifs','#faq','#contact'].map((href,i)=>
            <a key={href} href={href} style={{color:scrolled?'#475569':'rgba(255,255,255,.82)',fontWeight:600,fontSize:14,textDecoration:'none',padding:'6px 10px',borderRadius:8,transition:'color .2s'}}>
              {['Services','Pourquoi nous','Tarifs','FAQ','Contact'][i]}
            </a>
          )}
          <button onClick={()=>navigate('/login')} style={{padding:'8px 16px',borderRadius:10,border:`1.5px solid ${scrolled?'#E2E8F0':'rgba(255,255,255,.35)'}`,background:'transparent',color:scrolled?'#0F172A':'#fff',fontWeight:600,fontSize:14,cursor:'pointer',marginLeft:4}}>Connexion</button>
          <button onClick={()=>open(PLANS[1])} className="btn-cta" style={{padding:'8px 18px',borderRadius:10,background:'linear-gradient(135deg,#0D7A87,#13A3B4)',color:'#fff',fontWeight:700,fontSize:14,border:'none',cursor:'pointer',boxShadow:'0 4px 14px rgba(13,122,135,.35)'}}>
            Essai gratuit 🚀
          </button>
        </div>
      </nav>

      {/* ══ HERO ════════════════════════════════════════════════════════════ */}
      <section style={{background:'linear-gradient(135deg,#083D44 0%,#0A5F6A 45%,#0D7A87 100%)',minHeight:'100vh',display:'flex',alignItems:'center',padding:'120px 48px 80px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:'10%',left:'5%',width:320,height:320,borderRadius:'50%',background:'radial-gradient(circle,rgba(13,122,135,.45),transparent)',animation:'orb 12s ease-in-out infinite',filter:'blur(45px)'}}/>
        <div style={{position:'absolute',bottom:'10%',right:'5%',width:260,height:260,borderRadius:'50%',background:'radial-gradient(circle,rgba(125,211,218,.3),transparent)',animation:'orb 16s ease-in-out infinite reverse',filter:'blur(35px)'}}/>
        <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)',backgroundSize:'64px 64px'}}/>
        <Particles n={20}/>

        <div style={{maxWidth:1200,margin:'0 auto',width:'100%',display:'grid',gridTemplateColumns:'1fr 1fr',gap:56,alignItems:'center'}}>
          {/* Texte */}
          <div>
            <div className="au0" style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(255,255,255,.12)',border:'1px solid rgba(255,255,255,.2)',borderRadius:99,padding:'6px 16px',marginBottom:24,backdropFilter:'blur(8px)'}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:'#7DD3DA',animation:'pulse 2s ease-in-out infinite',display:'inline-block'}}/>
              <span style={{fontSize:13,color:'rgba(255,255,255,.9)',fontWeight:600}}>🇲🇬 Le logiciel dentaire #1 à Madagascar</span>
            </div>

            <h1 className="au1" style={{fontFamily:'Plus Jakarta Sans',fontWeight:900,fontSize:52,lineHeight:1.15,color:'#fff',marginBottom:12}}>
              Votre Cabinet Dentaire,<br/><span className="shimmer">géré intelligemment</span>
            </h1>

            <div className="au2" style={{height:44,marginBottom:20,display:'flex',alignItems:'center'}}>
              <span style={{fontSize:20,color:'rgba(255,255,255,.72)',fontWeight:500}}>
                {typed}<span style={{animation:'blink 1s step-end infinite',color:'#7DD3DA'}}>|</span>
              </span>
            </div>

            <p className="au2" style={{fontSize:17,color:'rgba(255,255,255,.73)',lineHeight:1.72,marginBottom:36,maxWidth:480}}>
              Simplifiez la gestion administrative de votre cabinet dentaire à Madagascar. Patients , RDV, facturation, ordonnances tout en un.
            </p>

            <div className="au3" style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:36}}>
              <button onClick={()=>open(PLANS[1])} className="btn-cta"
                style={{padding:'15px 30px',borderRadius:13,background:'#fff',color:'#0D7A87',fontWeight:800,fontSize:16,border:'none',cursor:'pointer',boxShadow:'0 8px 32px rgba(0,0,0,.2)'}}>
                Commencer gratuitement — 7 jours ✨
              </button>
              <a href="#services" style={{padding:'15px 28px',borderRadius:13,background:'rgba(255,255,255,.12)',color:'#fff',fontWeight:700,fontSize:16,border:'1px solid rgba(255,255,255,.25)',textDecoration:'none',backdropFilter:'blur(8px)',display:'inline-flex',alignItems:'center'}}>
                Voir les fonctions →
              </a>
            </div>

            <div className="au4" style={{display:'flex',gap:18,flexWrap:'wrap'}}>
              {['🔒 Données sécurisées','📱 MVola & Orange Money','🇲🇬 Support en français'].map(b=>(
                <span key={b} style={{fontSize:13,color:'rgba(255,255,255,.65)',fontWeight:500}}>{b}</span>
              ))}
            </div>
          </div>

          {/* Image dentaire hero */}
          <div className="au3" style={{position:'relative'}}>
            <div className="img-wrap" style={{height:460}}>
              <img src="https://images.unsplash.com/photo-1588776814546-1ffbb74a7258?w=800&q=85" alt="Cabinet dentaire moderne" className="img-dental"/>
            </div>
            {/* Badge flottant */}
            <div style={{position:'absolute',bottom:-20,left:-20,background:'#fff',borderRadius:16,padding:'14px 20px',boxShadow:'0 16px 40px rgba(0,0,0,.15)',display:'flex',alignItems:'center',gap:10,animation:'float 4s ease-in-out infinite'}}>
              <span style={{fontSize:28}}>🦷</span>
              <div>
                <p style={{fontWeight:800,color:'#0D7A87',fontSize:15,margin:0}}>+50 cabinets</p>
                <p style={{color:'#64748B',fontSize:12,margin:0}}>nous font confiance</p>
              </div>
            </div>
            <div style={{position:'absolute',top:-16,right:-16,background:'linear-gradient(135deg,#0D7A87,#13A3B4)',borderRadius:14,padding:'12px 18px',boxShadow:'0 12px 32px rgba(13,122,135,.35)',animation:'float 5s ease-in-out infinite reverse'}}>
              <p style={{color:'#fff',fontWeight:800,fontSize:13,margin:0}}>⭐ 98% satisfaction</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ PREUVES DE CONFIANCE ═════════════════════════════════════════════ */}
      <section style={{background:'#fff',padding:'52px 48px',borderBottom:'1px solid #F1F5F9'}}>
        <p className="sr" style={{textAlign:'center',fontSize:13,fontWeight:700,color:'#94A3B8',letterSpacing:2,textTransform:'uppercase',marginBottom:32}}>ILS NOUS FONT CONFIANCE</p>
        <div style={{maxWidth:900,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:36}}>
          <StatCounter end={50} suffix="+" label="Cabinets dentaires"/>
          <StatCounter end={98} suffix="%" label="Taux de satisfaction"/>
          <StatCounter end={24} suffix="/7" label="Support disponible"/>
          <StatCounter end={3}  suffix=" secondes" label="Temps de création facture"/>
        </div>
      </section>

      {/* ══ SERVICES / FONCTIONS ════════════════════════════════════════════ */}
      <section id="services" style={{padding:'88px 48px',maxWidth:1200,margin:'0 auto'}}>
        <div className="sr" style={{textAlign:'center',marginBottom:56}}>
          <span style={{fontSize:13,fontWeight:700,color:'#0D7A87',letterSpacing:2,textTransform:'uppercase',display:'block',marginBottom:10}}>NOS SERVICES</span>
          <h2 style={{fontFamily:'Plus Jakarta Sans',fontWeight:900,fontSize:40,color:'#0F172A',marginBottom:12}}>Tout ce dont votre cabinet a besoin</h2>
          <p style={{color:'#64748B',fontSize:17,maxWidth:560,margin:'0 auto'}}>
            Passez votre curseur sur chaque fonctionnalité pour en savoir plus
          </p>
        </div>

        {/* Fonctionnalités avec tooltip */}
        <div style={{display:'flex',flexWrap:'wrap',gap:14,justifyContent:'center',marginBottom:56}}>
          {FEAT_TOOLTIPS.map((f,i)=>(
            <div key={i} className="tooltip-wrap">
              <div className="card-feat sr" style={{
                background:'#fff',borderRadius:16,padding:'18px 22px',
                border:'1.5px solid #E2E8F0',cursor:'default',
                display:'flex',alignItems:'center',gap:10,
                transitionDelay:`${i*.07}s`,minWidth:160,
              }}>
                <span style={{fontSize:26}}>{f.icon}</span>
                <span style={{fontFamily:'Plus Jakarta Sans',fontWeight:700,fontSize:15,color:'#0F172A'}}>{f.label}</span>
              </div>
              <div className="tooltip-box">{f.tip}</div>
            </div>
          ))}
        </div>

        {/* 2 images + texte */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:40,alignItems:'center'}}>
          <div className="sr">
            <div className="img-wrap" style={{height:340}}>
              <img src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=85" alt="Chirurgien dentiste au travail" className="img-dental"/>
            </div>
          </div>
          <div className="sr">
            <h3 style={{fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:28,color:'#0F172A',marginBottom:16}}>
              Un logiciel pensé pour les dentistes malgaches 🇲🇬
            </h3>
            <p style={{color:'#475569',fontSize:15,lineHeight:1.8,marginBottom:20}}>
              DPM est conçu spécifiquement pour la réalité des cabinets dentaires à Madagascar. Paiement en Ariary, facturation adaptée aux normes locales, support en français.
            </p>
            {['Odontogramme FDI complet avec historique par dent','Facturation en MGA avec support MVola et Orange Money','Ordonnances et prescriptions en format standard','Gestion laboratoire prothèses et implants','Inventaire matériel avec alertes automatiques'].map((f,i)=>(
              <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:10}}>
                <span style={{color:'#0D7A87',fontWeight:800,fontSize:16,flexShrink:0}}>✓</span>
                <span style={{color:'#475569',fontSize:14}}>{f}</span>
              </div>
            ))}
            <button onClick={()=>open(PLANS[1])} className="btn-cta" style={{marginTop:20,padding:'12px 24px',borderRadius:11,background:'linear-gradient(135deg,#0D7A87,#13A3B4)',color:'#fff',fontWeight:700,fontSize:15,border:'none',cursor:'pointer'}}>
              Essayer gratuitement →
            </button>
          </div>
        </div>
      </section>

      {/* ══ POURQUOI NOUS ════════════════════════════════════════════════════ */}
      <section id="pourquoi" style={{background:'linear-gradient(135deg,#083D44,#0A5F6A)',padding:'88px 48px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)',backgroundSize:'60px 60px'}}/>
        <Particles n={12}/>
        <div style={{maxWidth:1200,margin:'0 auto',position:'relative'}}>
          <div className="sr" style={{textAlign:'center',marginBottom:52}}>
            <span style={{fontSize:13,fontWeight:700,color:'#7DD3DA',letterSpacing:2,textTransform:'uppercase',display:'block',marginBottom:10}}>POURQUOI DPM</span>
            <h2 style={{fontFamily:'Plus Jakarta Sans',fontWeight:900,fontSize:40,color:'#fff',marginBottom:12}}>Nos avantages concurrentiels</h2>
            <p style={{color:'rgba(255,255,255,.7)',fontSize:17}}>Ce qui nous différencie de toute autre solution</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:20}}>
            {[
              {icon:'🇲🇬',title:'100% Madagascar',desc:'Conçu pour la réalité locale : Ariary, MVola, Orange Money, langue française, normes malgaches.'},
              {icon:'💰',title:'Prix accessible',desc:'À partir de 149 000 Ar/mois, soit moins de 5 000 Ar par jour. Le meilleur rapport qualité/prix.'},
              {icon:'⚡',title:'Simple et rapide',desc:'Formation en 30 minutes. Interface intuitive, pas besoin d\'informaticien. Opérationnel le jour même.'},
              {icon:'🔒',title:'Données sécurisées',desc:'Sauvegarde automatique quotidienne. Vos données patients sont chiffrées et protégées.'},
              {icon:'📱',title:'Multi-appareils',desc:'Fonctionne sur ordinateur, tablette et smartphone. Accès depuis n\'importe où à Madagascar.'},
              {icon:'🤝',title:'Support réactif',desc:'Équipe basée à Antananarivo. Réponse sous 24h par email et téléphone en français.'},
            ].map((a,i)=>(
              <div key={i} className="sr card-feat" style={{background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.15)',borderRadius:18,padding:'24px 20px',backdropFilter:'blur(8px)',transitionDelay:`${i*.08}s`}}>
                <div style={{fontSize:34,marginBottom:12}}>{a.icon}</div>
                <h3 style={{fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:17,color:'#fff',marginBottom:8}}>{a.title}</h3>
                <p style={{color:'rgba(255,255,255,.72)',fontSize:14,lineHeight:1.65}}>{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ RÉALISATIONS / TÉMOIGNAGES ══════════════════════════════════════ */}
      <section style={{padding:'88px 48px',maxWidth:1200,margin:'0 auto'}}>
        <div className="sr" style={{textAlign:'center',marginBottom:52}}>
          <span style={{fontSize:13,fontWeight:700,color:'#0D7A87',letterSpacing:2,textTransform:'uppercase',display:'block',marginBottom:10}}>TÉMOIGNAGES</span>
          <h2 style={{fontFamily:'Plus Jakarta Sans',fontWeight:900,fontSize:40,color:'#0F172A',marginBottom:12}}>Ce que disent nos clients</h2>
          <p style={{color:'#64748B',fontSize:17}}>Des chirurgiens-dentistes qui nous font confiance à travers Madagascar</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:24,marginBottom:56}}>
          {TEMOIGNAGES.map((t,i)=>(
            <div key={i} className="sr card-feat" style={{background:'#fff',borderRadius:20,padding:'28px 24px',border:'1px solid #E2E8F0',transitionDelay:`${i*.1}s`}}>
              <div style={{display:'flex',gap:3,marginBottom:14}}>
                {Array(t.note).fill(0).map((_,j)=><span key={j} style={{color:'#F59E0B',fontSize:18}}>★</span>)}
              </div>
              <p style={{color:'#475569',fontSize:14,lineHeight:1.75,marginBottom:20,fontStyle:'italic'}}>"{t.txt}"</p>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:44,height:44,borderRadius:'50%',background:'linear-gradient(135deg,#0D7A87,#13A3B4)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:18}}>
                  {t.nom.split(' ').pop()[0]}
                </div>
                <div>
                  <p style={{fontWeight:700,color:'#0F172A',fontSize:14,margin:0}}>{t.nom}</p>
                  <p style={{color:'#64748B',fontSize:12,margin:0}}>{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Image réalisation */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
          <div className="sr img-wrap" style={{height:280}}>
            <img src="https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800&q=85" alt="Dentiste examinant un patient" className="img-dental"/>
          </div>
          <div className="sr img-wrap" style={{height:280,transitionDelay:'.15s'}}>
            <img src="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&q=85" alt="Cabinet dentaire équipé" className="img-dental"/>
          </div>
        </div>
      </section>

      {/* ══ À PROPOS / ÉQUIPE ═══════════════════════════════════════════════ */}
      <section style={{background:'#F1F5F9',padding:'88px 48px'}}>
        <div style={{maxWidth:1200,margin:'0 auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:56,alignItems:'center'}}>
          <div className="sr">
            <span style={{fontSize:13,fontWeight:700,color:'#0D7A87',letterSpacing:2,textTransform:'uppercase',display:'block',marginBottom:10}}>À PROPOS</span>
            <h2 style={{fontFamily:'Plus Jakarta Sans',fontWeight:900,fontSize:38,color:'#0F172A',marginBottom:16}}>Notre mission : simplifier votre quotidien</h2>
            <p style={{color:'#475569',fontSize:15,lineHeight:1.8,marginBottom:16}}>
              DPM (Dental Practice Manager) est né d'un constat simple : les chirurgiens-dentistes malgaches méritent des outils modernes adaptés à leur réalité.
            </p>
            <p style={{color:'#475569',fontSize:15,lineHeight:1.8,marginBottom:24}}>
              Notre équipe basée à Antananarivo développe et améliore continuellement la plateforme avec les retours des praticiens. Nous comprenons vos besoins parce que nous sommes malgaches.
            </p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              {[
                {v:'2024',l:'Année de création'},
                {v:'Tana',l:'Basé à Antananarivo'},
                {v:'🇲🇬',l:'Made in Madagascar'},
                {v:'24/7',l:'Support disponible'},
              ].map((s,i)=>(
                <div key={i} style={{background:'#fff',borderRadius:14,padding:'16px 18px',border:'1px solid #E2E8F0',textAlign:'center'}}>
                  <p style={{fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:22,color:'#0D7A87',margin:0}}>{s.v}</p>
                  <p style={{color:'#64748B',fontSize:13,margin:'4px 0 0'}}>{s.l}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="sr" style={{transitionDelay:'.15s'}}>
            <div className="img-wrap" style={{height:420}}>
              <img src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800&q=85" alt="Équipe dentaire professionnelle" className="img-dental"/>
            </div>
          </div>
        </div>
      </section>

      {/* ══ TARIFS ══════════════════════════════════════════════════════════ */}
      <section id="tarifs" style={{padding:'88px 48px'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div className="sr" style={{textAlign:'center',marginBottom:52}}>
            <span style={{fontSize:13,fontWeight:700,color:'#0D7A87',letterSpacing:2,textTransform:'uppercase',display:'block',marginBottom:10}}>TARIFS</span>
            <h2 style={{fontFamily:'Plus Jakarta Sans',fontWeight:900,fontSize:40,color:'#0F172A',marginBottom:12}}>Simple et transparent</h2>
            <p style={{color:'#64748B',fontSize:16,marginBottom:6}}>7 jours d'essai gratuit — aucune carte bancaire requise</p>
            <p style={{color:'#0D7A87',fontWeight:600,fontSize:14}}>💳 MVola · Orange Money · Airtel Money · Virement BNI</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:24,alignItems:'start'}}>
            {PLANS.map((plan,i)=>(
              <div key={plan.name} className={`plan-card sr`} style={{
                background:plan.popular?'linear-gradient(135deg,#0D7A87,#0A5F6A)':'#fff',
                borderRadius:22,padding:'32px 26px',
                border:plan.popular?'none':'1px solid #E2E8F0',
                boxShadow:plan.popular?'0 24px 60px rgba(13,122,135,.35)':'0 4px 16px rgba(0,0,0,.05)',
                position:'relative',transform:plan.popular?'scale(1.04)':'scale(1)',
                transitionDelay:`${i*.1}s`,
              }}>
                {plan.popular&&<div style={{position:'absolute',top:-14,left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg,#F59E0B,#D97706)',color:'#fff',padding:'5px 18px',borderRadius:99,fontSize:12,fontWeight:800,whiteSpace:'nowrap',boxShadow:'0 4px 14px rgba(245,158,11,.4)'}}>⭐ POPULAIRE</div>}
                <h3 style={{fontFamily:'Plus Jakarta Sans',fontWeight:900,fontSize:20,color:plan.popular?'#fff':'#0F172A',marginBottom:6}}>{plan.name}</h3>
                <div style={{marginBottom:22}}>
                  <span style={{fontFamily:'Plus Jakarta Sans',fontWeight:900,fontSize:38,color:plan.popular?'#fff':'#0D7A87'}}>{plan.price}</span>
                  <span style={{color:plan.popular?'rgba(255,255,255,.6)':'#94A3B8',fontSize:14}}> Ar/mois</span>
                </div>
                <ul style={{listStyle:'none',padding:0,marginBottom:26}}>
                  {plan.features.map((f,j)=>(
                    <li key={j} style={{color:plan.popular?'rgba(255,255,255,.88)':'#475569',fontSize:14,padding:'5px 0',display:'flex',gap:8,alignItems:'flex-start'}}>
                      <span style={{color:plan.popular?'#7DD3DA':'#0D7A87',fontWeight:800,flexShrink:0}}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <button onClick={()=>open(plan)} className="btn-cta"
                  style={{width:'100%',padding:13,borderRadius:12,background:plan.popular?'#fff':'linear-gradient(135deg,#0D7A87,#13A3B4)',color:plan.popular?'#0D7A87':'#fff',fontWeight:700,fontSize:15,border:'none',cursor:'pointer',boxShadow:plan.popular?'0 4px 16px rgba(0,0,0,.15)':'0 4px 14px rgba(13,122,135,.3)'}}>
                  Démarrer — 7 jours gratuits
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FAQ ═════════════════════════════════════════════════════════════ */}
      <section id="faq" style={{background:'#F8FAFC',padding:'88px 48px'}}>
        <div style={{maxWidth:800,margin:'0 auto'}}>
          <div className="sr" style={{textAlign:'center',marginBottom:52}}>
            <span style={{fontSize:13,fontWeight:700,color:'#0D7A87',letterSpacing:2,textTransform:'uppercase',display:'block',marginBottom:10}}>FAQ</span>
            <h2 style={{fontFamily:'Plus Jakarta Sans',fontWeight:900,fontSize:40,color:'#0F172A',marginBottom:12}}>Questions fréquentes</h2>
            <p style={{color:'#64748B',fontSize:17}}>Tout ce que vous voulez savoir sur DPM</p>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {FAQS.map((faq,i)=>(
              <div key={i} className="faq-item sr" onClick={()=>setOpenFaq(openFaq===i?null:i)}
                style={{background:'#fff',border:'1px solid #E2E8F0',borderRadius:16,padding:'20px 24px',cursor:'pointer',transitionDelay:`${i*.05}s`,borderColor:openFaq===i?'#0D7A87':'#E2E8F0'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
                  <p style={{fontFamily:'Plus Jakarta Sans',fontWeight:700,fontSize:15,color:'#0F172A',margin:0}}>{faq.q}</p>
                  <span style={{color:'#0D7A87',fontSize:20,flexShrink:0,transition:'transform .3s',transform:openFaq===i?'rotate(45deg)':'rotate(0)'}}>+</span>
                </div>
                {openFaq===i&&(
                  <p style={{color:'#475569',fontSize:14,lineHeight:1.75,marginTop:12,animation:'fadeIn .3s ease'}}>{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CONTACT / CTA FINAL ════════════════════════════════════════════ */}
      <section id="contact" style={{background:'linear-gradient(135deg,#083D44,#0D7A87)',padding:'88px 48px',position:'relative',overflow:'hidden'}}>
        <Particles n={14}/>
        <div style={{position:'absolute',inset:0,backgroundImage:'radial-gradient(circle at 20% 50%,rgba(255,255,255,.05),transparent 50%),radial-gradient(circle at 80% 20%,rgba(255,255,255,.04),transparent 50%)' }}/>
        <div style={{maxWidth:1200,margin:'0 auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:64,position:'relative',alignItems:'start'}}>

          {/* Infos contact */}
          <div className="sr">
            <span style={{fontSize:13,fontWeight:700,color:'#7DD3DA',letterSpacing:2,textTransform:'uppercase',display:'block',marginBottom:10}}>CONTACT</span>
            <h2 style={{fontFamily:'Plus Jakarta Sans',fontWeight:900,fontSize:40,color:'#fff',marginBottom:14}}>Parlons de votre cabinet</h2>
            <p style={{color:'rgba(255,255,255,.72)',fontSize:16,lineHeight:1.75,marginBottom:36}}>
              Une question ? Un besoin spécifique ? Notre équipe à Antananarivo est là pour vous accompagner.
            </p>
            {[
              {icon:'📧',label:'Email',val:'contact@dentalpracticemada.com',href:'mailto:contact@dentalpracticemada.com'},
              {icon:'📱',label:'Téléphone',val:'034 84 712 56',href:'tel:+261348471256'},
              {icon:'📍',label:'Adresse',val:'Tsiadana Ampasanimalo, Antananarivo'},
            ].map((c,i)=>(
              <div key={i} style={{display:'flex',gap:14,alignItems:'flex-start',marginBottom:20}}>
                <div style={{width:44,height:44,background:'rgba(255,255,255,.12)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>
                  {c.icon}
                </div>
                <div>
                  <p style={{color:'rgba(255,255,255,.55)',fontSize:12,fontWeight:600,textTransform:'uppercase',margin:'0 0 3px'}}>{c.label}</p>
                  {c.href
                    ?<a href={c.href} style={{color:'#fff',fontWeight:700,fontSize:15,textDecoration:'none'}}>{c.val}</a>
                    :<p style={{color:'#fff',fontWeight:700,fontSize:15,margin:0}}>{c.val}</p>}
                </div>
              </div>
            ))}

            <div style={{marginTop:32,padding:'20px 24px',background:'rgba(255,255,255,.1)',borderRadius:16,border:'1px solid rgba(255,255,255,.18)'}}>
              <p style={{color:'rgba(255,255,255,.6)',fontSize:13,margin:'0 0 8px',fontWeight:600}}>PRÊT À COMMENCER ?</p>
              <button onClick={()=>open(PLANS[1])} className="btn-cta"
                style={{padding:'13px 24px',borderRadius:11,background:'#fff',color:'#0D7A87',fontWeight:800,fontSize:15,border:'none',cursor:'pointer'}}>
                Essai gratuit 7 jours 
              </button>
            </div>
          </div>

          {/* Formulaire contact */}
          <div className="sr" style={{transitionDelay:'.15s'}}>
            {!contactSent?(
              <div style={{background:'rgba(255,255,255,.08)',borderRadius:24,padding:'32px 28px',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,.15)'}}>
                <h3 style={{fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:22,color:'#fff',marginBottom:20}}>Envoyer un message</h3>
                <div style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:13,fontWeight:600,color:'rgba(255,255,255,.75)',marginBottom:6}}>Votre nom</label>
                  <input type="text" placeholder="Dr. Rakoto Jean" value={contactForm.nom}
                    onChange={e=>setContactForm(p=>({...p,nom:e.target.value}))}
                    style={{...inpStyle,background:'rgba(255,255,255,.1)',border:'1.5px solid rgba(255,255,255,.2)',color:'#fff'}}
                    onFocus={e=>{e.target.style.borderColor='rgba(255,255,255,.5)';e.target.style.background='rgba(255,255,255,.15)';}}
                    onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,.2)';e.target.style.background='rgba(255,255,255,.1)';}}/>
                </div>
                <div style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:13,fontWeight:600,color:'rgba(255,255,255,.75)',marginBottom:6}}>Email</label>
                  <input type="email" placeholder="contact@cabinet.mg" value={contactForm.email}
                    onChange={e=>setContactForm(p=>({...p,email:e.target.value}))}
                    style={{...inpStyle,background:'rgba(255,255,255,.1)',border:'1.5px solid rgba(255,255,255,.2)',color:'#fff'}}
                    onFocus={e=>{e.target.style.borderColor='rgba(255,255,255,.5)';e.target.style.background='rgba(255,255,255,.15)';}}
                    onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,.2)';e.target.style.background='rgba(255,255,255,.1)';}}/>
                </div>
                <div style={{marginBottom:20}}>
                  <label style={{display:'block',fontSize:13,fontWeight:600,color:'rgba(255,255,255,.75)',marginBottom:6}}>Message</label>
                  <textarea rows={4} placeholder="Décrivez votre besoin..." value={contactForm.message}
                    onChange={e=>setContactForm(p=>({...p,message:e.target.value}))}
                    style={{...inpStyle,background:'rgba(255,255,255,.1)',border:'1.5px solid rgba(255,255,255,.2)',color:'#fff',resize:'vertical'}}
                    onFocus={e=>{e.target.style.borderColor='rgba(255,255,255,.5)';}}
                    onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,.2)';}}/>
                </div>
                <button
                  onClick={()=>{if(contactForm.nom&&contactForm.email&&contactForm.message)setContactSent(true);}}
                  className="btn-cta"
                  style={{width:'100%',padding:14,borderRadius:12,background:'#fff',color:'#0D7A87',fontWeight:800,fontSize:15,border:'none',cursor:'pointer'}}>
                  Envoyer le message 📨
                </button>
              </div>
            ):(
              <div style={{background:'rgba(255,255,255,.08)',borderRadius:24,padding:'48px 28px',backdropFilter:'blur(12px)',border:'1px solid rgba(255,255,255,.15)',textAlign:'center'}}>
                <div style={{fontSize:60,marginBottom:16,animation:'float 3s ease-in-out infinite'}}>✅</div>
                <h3 style={{fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:22,color:'#fff',marginBottom:8}}>Message envoyé !</h3>
                <p style={{color:'rgba(255,255,255,.72)',fontSize:15,lineHeight:1.7}}>
                  Merci {contactForm.nom} ! Nous vous répondrons à <strong>{contactForm.email}</strong> sous 24h.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
      <footer style={{background:'#0F172A',padding:'32px 48px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:14}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:32,height:32,background:'linear-gradient(135deg,#0D7A87,#13A3B4)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Logo size={22}/>
          </div>
          <span style={{color:'rgba(255,255,255,.8)',fontWeight:700,fontSize:16}}>DPM Madagascar</span>
        </div>
        <div style={{display:'flex',gap:20}}>
          {['#services','#pourquoi','#tarifs','#faq','#contact'].map((h,i)=>(
            <a key={h} href={h} style={{color:'rgba(255,255,255,.45)',fontSize:13,textDecoration:'none'}}>{['Services','Pourquoi','Tarifs','FAQ','Contact'][i]}</a>
          ))}
        </div>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          <p style={{color:'rgba(255,255,255,.35)',fontSize:12,margin:0}}>© {new Date().getFullYear()} DPM Madagascar</p>
          <button onClick={()=>navigate('/login')} style={{color:'rgba(255,255,255,.5)',background:'none',border:'1px solid rgba(255,255,255,.15)',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,padding:'5px 12px'}}>Connexion</button>
        </div>
      </footer>

      <Modal show={modal.show} plan={modal.plan} onClose={()=>setModal({show:false,plan:null})} navigate={navigate}/>
    </div>
  );
}
