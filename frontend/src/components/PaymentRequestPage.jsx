/**
 * PaymentRequestPage.jsx — Paiement automatique avec activation immédiate
 * ─ Génération référence unique DPM
 * ─ Instructions claires par méthode
 * ─ Soumission référence → activation auto
 * ─ Polling statut (check toutes les 10s si paiement en cours)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { CheckCircle, RefreshCw, Copy, Clock, AlertCircle, ChevronRight } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : 'https://dentalpm-1-production.up.railway.app/api';

const fmt = n => new Intl.NumberFormat('fr-MG').format(n || 0);

const PLANS = [
  { code:'ESSENTIAL', label:'ESSENTIAL', price:149000, popular:false, desc:'Cabinet solo', stripe:'https://buy.stripe.com/eVqeV66VS1S84A43NDcfK01',
    features:['1 praticien + 1 assistant','500 patients','Agenda & RDV','Facturation de base','Support email'] },
  { code:'PRO', label:'PRO', price:199000, popular:true, desc:'Le plus populaire', stripe:'https://buy.stripe.com/aFa9AM4NK54k1nSfwlcfK00',
    features:['5 praticiens','Patients illimités','Rappels SMS','Laboratoire','Inventaire','Rapports','Support prioritaire'] },
  { code:'GROUP', label:'GROUP', price:299000, popular:false, desc:'Multi-sites', stripe:'https://buy.stripe.com/9B614gbc8aoE3w05VLcfK02',
    features:['Praticiens illimités','Multi-sites','Tout PRO','API dédiée','Formation incluse'] },
];

const METHODS = [
  { code:'MVOLA',         name:'MVola (Telma)',  color:'#E30613', bg:'#FFF0F0', emoji:'📱', auto:true,  delay:'~5 min' },
  { code:'ORANGE_MONEY',  name:'Orange Money',   color:'#FF6600', bg:'#FFF5F0', emoji:'🟠', auto:true,  delay:'~5 min' },
  { code:'AIRTEL_MONEY',  name:'Airtel Money',   color:'#CC0000', bg:'#FFF0F0', emoji:'🔴', auto:false, delay:'Référence requise' },
  { code:'BANK_TRANSFER', name:'Mastercard',   color:'#EB001B', bg:'#F0F4FF', emoji:'🏦', auto:false, delay:'~2h' },
  { code:'CASH',          name:'Espèces (bureau)',color:'#166534', bg:'#F0FFF4', emoji:'💵', auto:false, delay:'Sur place' },
];

const ST = {
  PENDING:  { label:'En attente de validation', bg:'#FEF3C7', text:'#B45309', dot:'#F59E0B' },
  VERIFIED: { label:'Validé — Abonnement actif', bg:'#D1FAE5', text:'#065F46', dot:'#10B981' },
  REJECTED: { label:'Rejeté', bg:'#FEE2E2', text:'#991B1B', dot:'#EF4444' },
};

const C = { teal:'#0D7A87', green:'#10B981', amber:'#F59E0B', red:'#EF4444', blue:'#3B82F6' };

const G = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');
  .pi{width:100%;padding:11px 14px;border-radius:11px;border:1.5px solid #E2E8F0;font-size:14px;font-family:inherit;outline:none;transition:border-color .2s,box-shadow .2s}
  .pi:focus{border-color:#0D7A87;box-shadow:0 0 0 3px rgba(13,122,135,.1)}
  .pb{padding:12px 24px;border-radius:12px;background:linear-gradient(135deg,#0D7A87,#13A3B4);color:#fff;font-weight:700;font-size:14px;border:none;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:8px}
  .pb:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(13,122,135,.3)}
  .pb:disabled{background:#94A3B8!important;cursor:not-allowed;transform:none!important}
  .pg{padding:11px 20px;border-radius:11px;border:1.5px solid #E2E8F0;background:#fff;color:#475569;font-weight:600;font-size:14px;cursor:pointer;transition:all .2s}
  .pg:hover{border-color:#0D7A87;color:#0D7A87}
  @keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  .fu{animation:fu .3s ease both}
  @keyframes sp{to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
`;

export default function PaymentRequestPage() {
  const [sub,      setSub]      = useState(null);
  const [hist,     setHist]     = useState([]);
  const [load,     setLoad]     = useState(true);
  const [busy,     setBusy]     = useState(false);
  const [plan,     setPlan]     = useState('PRO');
  const [meth,     setMeth]     = useState('MVOLA');
  const [step,     setStep]     = useState(1);
  const [instruct, setInstruct] = useState(null); // instructions après soumission
  const [notif,    setNotif]    = useState(null);
  const [refInput, setRefInput] = useState('');
  const [verifying,setVerif]    = useState(false);
  const [verified, setVerified] = useState(false);
  const pollingRef = useRef(null);

  const notify = (msg, err=false) => { setNotif({msg,err}); setTimeout(()=>setNotif(null),5000); };

  const refresh = useCallback(async () => {
    setLoad(true);
    try {
      const [s, h] = await Promise.all([
        axios.get(`${API}/billing/status`).catch(()=>({data:null})),
        axios.get(`${API}/billing/payment-requests`).catch(()=>({data:{paymentRequests:[]}})),
      ]);
      setSub(s.data);
      setHist(h.data?.paymentRequests || []);
    } finally { setLoad(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Polling : vérifier automatiquement si paiement confirmé (MVola/Orange webhook)
  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const r = await axios.get(`${API}/billing/status`);
        if (r.data?.status === 'ACTIVE') {
          setSub(r.data);
          setVerified(true);
          clearInterval(pollingRef.current);
          notify('🎉 Paiement confirmé ! Votre abonnement est maintenant actif.');
          refresh();
        }
      } catch {}
    }, 10000); // toutes les 10 secondes
  }, [refresh]);

  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  const planD = PLANS.find(p=>p.code===plan);
  const methD = METHODS.find(m=>m.code===meth);
  const pend  = hist.some(r=>r.status==='PENDING');
  const isActive = sub?.status === 'ACTIVE' && !sub?.is_expired;

  /* ── Soumettre la demande de paiement ── */
  const submit = async () => {
    setBusy(true);
    try {
      const r = await axios.post(`${API}/billing/payment-requests`, {
        plan_code:      plan,
        payment_method: meth,
      });
      setInstruct(r.data);
      setStep(4); // Étape instructions
      refresh();
      // Démarrer le polling pour MVola/Orange (activation automatique)
      if (['MVOLA','ORANGE_MONEY'].includes(meth)) {
        startPolling();
      }
    } catch(e) {
      notify(e.response?.data?.error || 'Erreur lors de la soumission', true);
    } finally { setBusy(false); }
  };

  /* ── Soumettre référence pour vérification auto ── */
  const verifyRef = async () => {
    if (!refInput.trim()) { notify('Entrez votre référence de transaction', true); return; }
    setVerif(true);
    try {
      const r = await axios.post(`${API}/billing/verify-reference`, { reference: refInput.trim() });
      if (r.data?.activated) {
        setVerified(true);
        notify('🎉 Paiement vérifié ! Abonnement activé instantanément.');
        refresh();
      } else {
        notify(r.data?.message || 'Référence enregistrée. Validation en cours.');
        refresh();
      }
    } catch(e) {
      notify(e.response?.data?.error || 'Erreur vérification', true);
    } finally { setVerif(false); }
  };

  /* ── Copier référence ── */
  const copyRef = async (text) => {
    try { await navigator.clipboard.writeText(text); notify('✅ Référence copiée !'); } catch {}
  };

  if(load) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:260}}>
      <style>{G}</style>
      <div style={{width:42,height:42,border:`4px solid #E2E8F0`,borderTopColor:C.teal,borderRadius:'50%',animation:'sp .8s linear infinite'}}/>
    </div>
  );

  const CARD = {background:'#fff',borderRadius:20,border:'1px solid #E8EDF2',boxShadow:'0 1px 6px rgba(0,0,0,.05)',marginBottom:18,overflow:'hidden'};
  const HDR  = {padding:'15px 22px',borderBottom:'1px solid #F1F5F9',fontWeight:700,fontSize:15,color:'#0F172A',display:'flex',alignItems:'center',gap:8};

  return (
    <div style={{maxWidth:860,margin:'0 auto',padding:'20px 20px 48px'}}>
      <style>{G}</style>

      {/* Toast */}
      {notif && (
        <div style={{position:'fixed',top:20,right:20,zIndex:9999,padding:'14px 20px',borderRadius:14,background:notif.err?'#FEE2E2':'#D1FAE5',color:notif.err?'#991B1B':'#065F46',fontWeight:700,fontSize:14,boxShadow:'0 8px 32px rgba(0,0,0,.15)',animation:'fu .3s ease',maxWidth:400}}>
          {notif.msg}
        </div>
      )}

      {/* En-tête */}
      <div style={{marginBottom:22}}>
        <h1 style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontWeight:800,fontSize:22,color:'#0F172A',margin:0}}>💳 Paiement & Abonnement</h1>
        <p style={{color:'#64748B',fontSize:13,marginTop:4}}>Activation automatique après confirmation de votre paiement</p>
      </div>

      {/* Abonnement actuel */}
      <div style={CARD}>
        <div style={HDR}>📋 Abonnement actuel</div>
        <div style={{padding:'18px 22px'}}>
          {isActive ? (
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <div style={{width:50,height:50,borderRadius:14,background:`linear-gradient(135deg,${C.teal},#13A3B4)`,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:18}}>
                  {sub.plan?.[0]||'P'}
                </div>
                <div>
                  <div style={{fontWeight:800,fontSize:17,color:'#0F172A'}}>Plan {sub.plan}</div>
                  <div style={{fontSize:13,color:'#64748B',marginTop:3}}>
                    {sub.days_remaining > 0
                      ? `⏳ ${sub.days_remaining} jour${sub.days_remaining>1?'s':''} restant${sub.days_remaining>1?'s':''}`
                      : '⚠️ Expiré'}
                    {sub.end_date && ` · Expire le ${new Date(sub.end_date).toLocaleDateString('fr-FR')}`}
                  </div>
                </div>
              </div>
              <span style={{padding:'6px 18px',borderRadius:99,fontSize:13,fontWeight:700,background:'#D1FAE5',color:'#065F46'}}>✅ Actif</span>
            </div>
          ) : (
            <div style={{color:'#64748B',fontSize:14,display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:28}}>💡</span>
              {sub?.is_trial ? `🕐 Période d'essai — ${sub.days_remaining || 0} jour(s) restant(s)` : 'Aucun abonnement actif'}
            </div>
          )}
        </div>
      </div>

      {/* Abonnement activé ! */}
      {verified && (
        <div style={{background:'linear-gradient(135deg,#DCFCE7,#BBF7D0)',border:'2px solid #86EFAC',borderRadius:20,padding:'24px',marginBottom:18,textAlign:'center'}} className="fu">
          <CheckCircle size={48} color="#166534" style={{margin:'0 auto 12px'}}/>
          <h2 style={{fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:22,color:'#166534',margin:'0 0 8px'}}>🎉 Abonnement activé !</h2>
          <p style={{color:'#166534',margin:0}}>Votre paiement a été confirmé et votre abonnement est maintenant actif.</p>
          <button className="pb" style={{margin:'16px auto 0',background:'#166534'}} onClick={()=>window.location.href='/'}>
            Accéder au tableau de bord →
          </button>
        </div>
      )}

      {/* Demande en attente */}
      {pend && !verified && (
        <div style={{background:'#FFF7ED',border:'1.5px solid #FED7AA',borderRadius:16,padding:'15px 20px',marginBottom:18,display:'flex',gap:12,alignItems:'flex-start'}}>
          <Clock size={22} color="#C2410C" style={{flexShrink:0,marginTop:2}}/>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,color:'#C2410C',fontSize:15,marginBottom:4}}>Une demande est en cours de traitement</div>
            <div style={{fontSize:13,color:'#92400E',marginBottom:10}}>
              Si vous avez déjà effectué le paiement, entrez votre référence de transaction pour une activation immédiate.
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <input className="pi" value={refInput} onChange={e=>setRefInput(e.target.value)}
                placeholder="Ex: MVL-2025-123456 ou DPM-ABC123" style={{flex:1,minWidth:200,background:'#fff'}}/>
              <button className="pb" onClick={verifyRef} disabled={verifying} style={{flexShrink:0}}>
                {verifying ? <div style={{width:14,height:14,border:'2px solid rgba(255,255,255,.4)',borderTopColor:'#fff',borderRadius:'50%',animation:'sp .8s linear infinite'}}/> : <CheckCircle size={14}/>}
                Vérifier et activer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Étape 4 : Instructions de paiement après soumission ── */}
      {step === 4 && instruct && !verified && (
        <div style={CARD} className="fu">
          <div style={{...HDR, background:'linear-gradient(135deg,#F0FDFE,#ECFEFF)'}}>
            <span style={{fontSize:20}}>{METHODS.find(m=>m.code===meth)?.emoji}</span>
            {instruct.instructions?.title}
          </div>
          <div style={{padding:'22px'}}>
            {/* Référence unique */}
            <div style={{background:'#F0FDFE',border:'2px solid #0D7A87',borderRadius:14,padding:'16px 20px',marginBottom:20}}>
              <div style={{fontSize:11,fontWeight:700,color:C.teal,textTransform:'uppercase',letterSpacing:1.5,marginBottom:6}}>🔑 Votre référence de paiement</div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                <code style={{fontFamily:'monospace',fontWeight:800,fontSize:22,color:'#0F172A',letterSpacing:2}}>{instruct.paymentRequest?.reference}</code>
                <button onClick={()=>copyRef(instruct.paymentRequest?.reference)}
                  style={{padding:'7px 14px',borderRadius:9,border:'1.5px solid #0D7A87',background:'#fff',color:C.teal,cursor:'pointer',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',gap:5}}>
                  <Copy size={12}/>Copier
                </button>
              </div>
              <div style={{fontSize:12,color:'#64748B',marginTop:6}}>Utilisez cette référence comme motif de paiement</div>
            </div>

            {/* Étapes */}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:700,color:'#0F172A',marginBottom:10}}>Étapes :</div>
              {instruct.instructions?.steps?.map((s,i) => (
                <div key={i} style={{display:'flex',gap:10,marginBottom:8,alignItems:'flex-start'}}>
                  <div style={{width:22,height:22,borderRadius:'50%',background:C.teal,color:'#fff',fontSize:11,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{i+1}</div>
                  <span style={{fontSize:13,color:'#475569',lineHeight:1.5}}>{s}</span>
                </div>
              ))}
            </div>

            {/* Info activation */}
            <div style={{background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:12,padding:'12px 16px',marginBottom:20,display:'flex',gap:8}}>
              <AlertCircle size={16} color="#B45309" style={{flexShrink:0,marginTop:1}}/>
              <p style={{fontSize:13,color:'#92400E',margin:0,lineHeight:1.6}}>
                <strong>Activation automatique</strong> : {instruct.auto_activation_info}
              </p>
            </div>

            {/* Vérification par référence */}
            <div style={{background:'#F8FAFC',borderRadius:12,padding:'16px',border:'1px solid #E2E8F0'}}>
              <div style={{fontSize:13,fontWeight:700,color:'#0F172A',marginBottom:8}}>
                ✅ Après avoir effectué le paiement, confirmez ici :
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <input className="pi" value={refInput} onChange={e=>setRefInput(e.target.value)}
                  placeholder={`Référence transaction (ex: ${instruct.paymentRequest?.reference})`}
                  style={{flex:1,minWidth:200}}/>
                <button className="pb" onClick={verifyRef} disabled={verifying}>
                  {verifying ? <div style={{width:14,height:14,border:'2px solid rgba(255,255,255,.4)',borderTopColor:'#fff',borderRadius:'50%',animation:'sp .8s linear infinite'}}/> : <CheckCircle size={14}/>}
                  Activer maintenant
                </button>
              </div>
              <p style={{fontSize:12,color:'#94A3B8',margin:'8px 0 0'}}>
                {['MVOLA','ORANGE_MONEY'].includes(meth)
                  ? '⚡ MVola/Orange : activation automatique possible via webhook. La vérification manuelle accélère le processus.'
                  : 'Entrez la référence de votre transaction pour une activation immédiate.'}
              </p>
            </div>

            {/* Polling indicator */}
            {['MVOLA','ORANGE_MONEY'].includes(meth) && (
              <div style={{display:'flex',alignItems:'center',gap:8,marginTop:14,padding:'10px 14px',background:'#F0FDFE',borderRadius:10}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:C.teal,animation:'pulse 1.5s ease-in-out infinite'}}/>
                <span style={{fontSize:12,color:C.teal,fontWeight:600}}>En attente de confirmation automatique MVola/Orange...</span>
                <button onClick={refresh} style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',color:'#94A3B8'}}>
                  <RefreshCw size={14}/>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Formulaire (steps 1-3) ── */}
      {!pend && step !== 4 && !verified && (
        <div style={CARD}>
          {/* Steps */}
          <div style={{padding:'16px 22px',borderBottom:'1px solid #F1F5F9',display:'flex',alignItems:'center'}}>
            {[{n:1,l:'Choisir plan'},{n:2,l:'Mode paiement'},{n:3,l:'Confirmer'}].map((s,i)=>(
              <React.Fragment key={s.n}>
                <div style={{display:'flex',alignItems:'center',gap:7}}>
                  <div style={{width:26,height:26,borderRadius:'50%',background:step>=s.n?C.teal:'#F1F5F9',color:step>=s.n?'#fff':'#94A3B8',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:12,transition:'all .3s'}}>
                    {step>s.n?'✓':s.n}
                  </div>
                  <span style={{fontSize:12,fontWeight:600,color:step>=s.n?C.teal:'#94A3B8'}}>{s.l}</span>
                </div>
                {i<2 && <div style={{flex:1,height:2,background:step>s.n?C.teal:'#E2E8F0',margin:'0 8px',transition:'background .3s',minWidth:12}}/>}
              </React.Fragment>
            ))}
          </div>

          <div style={{padding:'24px 22px'}} className="fu" key={step}>

            {/* ÉTAPE 1 — Plan */}
            {step===1 && (
              <div>
                <h3 style={{fontWeight:700,fontSize:16,color:'#0F172A',margin:'0 0 16px'}}>Choisissez votre plan</h3>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12,marginBottom:22}}>
                  {PLANS.map(p=>(
                    <div key={p.code} onClick={()=>setPlan(p.code)} style={{border:`2px solid ${plan===p.code?C.teal:'#E2E8F0'}`,borderRadius:16,padding:'18px 16px',cursor:'pointer',background:plan===p.code?'#F0FDFE':'#fff',position:'relative',transition:'all .2s'}}>
                      {p.popular && <div style={{position:'absolute',top:-10,left:'50%',transform:'translateX(-50%)',background:C.teal,color:'#fff',fontSize:10,fontWeight:800,padding:'3px 12px',borderRadius:99,whiteSpace:'nowrap'}}>⭐ POPULAIRE</div>}
                      <div style={{fontWeight:800,fontSize:14,color:'#0F172A',marginBottom:2}}>{p.label}</div>
                      <div style={{fontSize:12,color:'#64748B',marginBottom:10}}>{p.desc}</div>
                      <div style={{fontWeight:900,fontSize:22,color:C.teal,lineHeight:1,marginBottom:10}}>
                        {fmt(p.price)}<span style={{fontSize:11,color:'#94A3B8',fontWeight:500}}> Ar/mois</span>
                      </div>
                      <ul style={{listStyle:'none',padding:0,margin:0}}>
                        {p.features.slice(0,4).map((f,i)=>(
                          <li key={i} style={{fontSize:11,color:'#475569',padding:'2px 0',display:'flex',gap:6}}>
                            <span style={{color:C.teal,fontWeight:800,flexShrink:0}}>✓</span>{f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <button className="pb" onClick={()=>setStep(2)}>
                  Continuer avec {plan} — {fmt(planD?.price)} Ar/mois <ChevronRight size={14}/>
                </button>
              </div>
            )}

            {/* ÉTAPE 2 — Mode paiement */}
            {step===2 && (
              <div>
                <h3 style={{fontWeight:700,fontSize:16,color:'#0F172A',margin:'0 0 4px'}}>Mode de paiement</h3>
                <p style={{color:'#64748B',fontSize:13,margin:'0 0 16px'}}>Les modes Mobile Money sont activés automatiquement 🚀</p>
                <div style={{background:'#F0FDFE',border:'1px solid #7DD3DA',borderRadius:12,padding:'11px 16px',marginBottom:16,display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontWeight:700,color:C.teal}}>Plan {planD?.label}</span>
                  <span style={{fontWeight:900,color:C.teal,fontSize:17}}>{fmt(planD?.price)} Ar/mois</span>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
                  {METHODS.map(m=>(
                    <div key={m.code} onClick={()=>setMeth(m.code)}
                      style={{border:`2px solid ${meth===m.code?C.teal:'#E2E8F0'}`,borderRadius:12,padding:'13px 16px',cursor:'pointer',background:meth===m.code?'#F0FDFE':'#fff',display:'flex',justifyContent:'space-between',alignItems:'center',transition:'all .15s'}}>
                      <div style={{display:'flex',alignItems:'center',gap:12}}>
                        <div style={{width:40,height:40,borderRadius:10,background:m.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{m.emoji}</div>
                        <div>
                          <div style={{fontWeight:700,color:m.color,fontSize:14}}>{m.name}</div>
                          <div style={{fontSize:11,color:'#64748B',display:'flex',alignItems:'center',gap:5}}>
                            {m.auto && <span style={{color:C.green,fontWeight:700,background:'#DCFCE7',padding:'1px 6px',borderRadius:99,fontSize:10}}>⚡ Auto</span>}
                            {m.delay}
                          </div>
                        </div>
                      </div>
                      {meth===m.code && <div style={{width:22,height:22,borderRadius:'50%',background:C.teal,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#fff',fontSize:12}}>✓</span></div>}
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:10}}>
                  <button className="pg" onClick={()=>setStep(1)}>← Retour</button>
                  <button className="pb" onClick={()=>setStep(3)}>Voir le récapitulatif →</button>
                </div>
              </div>
            )}

            {/* ÉTAPE 3 — Confirmation */}
            {step===3 && (
              <div>
                <h3 style={{fontWeight:700,fontSize:16,color:'#0F172A',marginBottom:18}}>Récapitulatif</h3>
                <div style={{background:'#F8FAFC',borderRadius:14,border:'1px solid #E2E8F0',overflow:'hidden',marginBottom:16}}>
                  {[
                    {l:'Plan',           v:planD?.label},
                    {l:'Montant/mois',   v:`${fmt(planD?.price)} Ar`},
                    {l:'Paiement',       v:`${methD?.emoji} ${methD?.name}`},
                    {l:'Activation',     v: methD?.auto ? '⚡ Automatique après paiement' : '🕐 Après vérification (2h max)'},
                  ].map((r,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 18px',borderBottom:i<3?'1px solid #F1F5F9':'none'}}>
                      <span style={{fontSize:14,color:'#64748B'}}>{r.l}</span>
                      <span style={{fontSize:14,fontWeight:700,color:'#0F172A'}}>{r.v}</span>
                    </div>
                  ))}
                </div>
                <div style={{background:'#F0FDFE',border:'1px solid #7DD3DA',borderRadius:12,padding:'13px 16px',marginBottom:20,display:'flex',gap:8}}>
                  <CheckCircle size={16} color={C.teal} style={{flexShrink:0,marginTop:1}}/>
                  <p style={{fontSize:13,color:'#0D7A87',margin:0,lineHeight:1.6}}>
                    Une <strong>référence unique</strong> sera générée. Vous recevrez les instructions de paiement détaillées et votre abonnement s'activera automatiquement dès confirmation.
                  </p>
                </div>
                <div style={{display:'flex',gap:10}}>
                  <button className="pg" onClick={()=>setStep(2)}>← Retour</button>
                  <button className="pb" style={{flex:1}} onClick={submit} disabled={busy}>
                    {busy ? <><div style={{width:14,height:14,border:'2px solid rgba(255,255,255,.4)',borderTopColor:'#fff',borderRadius:'50%',animation:'sp .8s linear infinite'}}/>Initialisation...</> : <>✅ Initier le paiement</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historique */}
      <div style={CARD}>
        <div style={{...HDR, justifyContent:'space-between'}}>
          <span>📜 Historique des paiements</span>
          <button onClick={refresh} style={{background:'none',border:'none',cursor:'pointer',color:'#94A3B8'}}><RefreshCw size={14}/></button>
        </div>
        <div style={{padding:'16px 22px'}}>
          {hist.length===0 ? (
            <div style={{textAlign:'center',padding:'28px 0',color:'#94A3B8'}}>
              <div style={{fontSize:38,marginBottom:8}}>📋</div>
              <p style={{margin:0,fontSize:14}}>Aucun historique de paiement</p>
            </div>
          ) : hist.map(req => {
            const s = ST[req.status] || ST.PENDING;
            const m = METHODS.find(x=>x.code===req.payment_method);
            return (
              <div key={req.id} style={{background:'#F8FAFC',borderRadius:14,padding:'14px 18px',border:'1px solid #F1F5F9',marginBottom:10,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:s.dot,flexShrink:0}}/>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:'#0F172A'}}>Plan {req.plan_code} — {fmt(req.amount_mga)} Ar</div>
                    <div style={{fontSize:12,color:'#64748B',marginTop:2}}>
                      {m?.emoji} {m?.name||req.payment_method}
                      {req.reference&&<> · <code style={{fontSize:11,background:'#fff',padding:'1px 5px',borderRadius:5,border:'1px solid #E2E8F0'}}>{req.reference}</code></>}
                      {' · '}{new Date(req.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}
                    </div>
                    {req.note_admin && (
                      <div style={{marginTop:6,background:'#fff',border:'1px solid #E2E8F0',borderRadius:8,padding:'5px 10px',fontSize:12,color:'#475569'}}>
                        💬 <strong>Admin :</strong> {req.note_admin}
                      </div>
                    )}
                  </div>
                </div>
                <span style={{padding:'5px 14px',borderRadius:99,fontSize:12,fontWeight:700,background:s.bg,color:s.text,flexShrink:0}}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
