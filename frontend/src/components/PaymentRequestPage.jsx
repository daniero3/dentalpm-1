/**
 * PaymentRequestPage.jsx — Côté UTILISATEUR
 * Fixes : ✅ FormData→JSON (fix 400) ✅ /billing/status ✅ Prix 149/199/299k ✅ clinic_id null géré
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : 'https://dentalpm-1-production.up.railway.app/api';

const fmt = n => new Intl.NumberFormat('fr-MG').format(n || 0);

const PLANS = [
  { code:'ESSENTIAL', label:'ESSENTIAL', price:149000, popular:false, desc:'Cabinet solo',
    features:['1 praticien + 1 assistant(e)',"Jusqu'à 500 patients",'Agenda & RDV','Facturation de base','Ordonnances PDF','Odontogramme FDI','Support email'] },
  { code:'PRO', label:'PRO', price:199000, popular:true, desc:'Le plus populaire',
    features:['5 praticiens','Patients illimités','Agenda + rappels SMS','Facturation complète','Laboratoire dentaire','Inventaire & stock','Rapports financiers','Support prioritaire'] },
  { code:'GROUP', label:'GROUP', price:299000, popular:false, desc:'Multi-sites',
    features:['Praticiens illimités','Multi-sites','Tout le plan PRO','API dédiée','Dashboard groupe','Formation sur site'] },
];

const METHODS = [
  { code:'MVOLA',        name:'MVola',        num:'034 XX XXX XX',      color:'#E30613', bg:'#FFF0F0', emoji:'📱' },
  { code:'ORANGE_MONEY', name:'Orange Money', num:'032 XX XXX XX',      color:'#FF6600', bg:'#FFF5F0', emoji:'📱' },
  { code:'AIRTEL_MONEY', name:'Airtel Money', num:'033 XX XXX XX',      color:'#CC0000', bg:'#FFF0F0', emoji:'📱' },
  { code:'BANK_TRANSFER',name:'Virement BNI', num:'RIB fourni sur demande', color:'#1E3A5F', bg:'#F0F4FF', emoji:'🏦' },
  { code:'CASH',         name:'Espèces',      num:'Au bureau DPM',      color:'#166534', bg:'#F0FFF4', emoji:'💵' },
];

const ST = {
  PENDING:  { label:'En attente',  bg:'#FEF3C7', text:'#B45309', dot:'#F59E0B' },
  VERIFIED: { label:'Approuvé',    bg:'#D1FAE5', text:'#065F46', dot:'#10B981' },
  REJECTED: { label:'Rejeté',      bg:'#FEE2E2', text:'#991B1B', dot:'#EF4444' },
};

const G = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');
  .pi{width:100%;padding:11px 14px;border-radius:11px;border:1.5px solid #E2E8F0;font-size:14px;font-family:inherit;outline:none;transition:border-color .2s,box-shadow .2s;background:#fff}
  .pi:focus{border-color:#0D7A87;box-shadow:0 0 0 3px rgba(13,122,135,.1)}
  .pb{padding:12px 24px;border-radius:12px;background:linear-gradient(135deg,#0D7A87,#13A3B4);color:#fff;font-weight:700;font-size:14px;border:none;cursor:pointer;transition:all .2s}
  .pb:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(13,122,135,.3)}
  .pb:disabled{background:#94A3B8!important;cursor:not-allowed;transform:none!important;box-shadow:none!important}
  .pg{padding:11px 20px;border-radius:11px;border:1.5px solid #E2E8F0;background:#fff;color:#475569;font-weight:600;font-size:14px;cursor:pointer;transition:all .2s}
  .pg:hover{border-color:#0D7A87;color:#0D7A87}
  .pc{border:2px solid #E2E8F0;border-radius:16px;padding:18px 16px;cursor:pointer;transition:all .2s;position:relative;background:#fff}
  .pc:hover{border-color:#0D7A87;box-shadow:0 4px 16px rgba(13,122,135,.1)}
  .pc.sel{border-color:#0D7A87!important;background:#F0FDFE!important}
  .mc{border:1.5px solid #E2E8F0;border-radius:12px;padding:13px 16px;cursor:pointer;transition:all .2s;background:#fff;display:flex;justify-content:space-between;align-items:center}
  .mc:hover{border-color:#0D7A87}
  .mc.sel{border-color:#0D7A87!important;background:#F0FDFE!important}
  @keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  .fu{animation:fu .3s ease both}
  @keyframes sp{to{transform:rotate(360deg)}}
`;

export default function PaymentRequestPage() {
  const [sub, setSub]     = useState(null);
  const [hist, setHist]   = useState([]);
  const [load, setLoad]   = useState(true);
  const [busy, setBusy]   = useState(false);
  const [plan, setPlan]   = useState('PRO');
  const [meth, setMeth]   = useState('MVOLA');
  const [step, setStep]   = useState(1);
  const [notif, setNotif] = useState(null);
  const refEl = useRef(null);

  const notify = (msg, err=false) => { setNotif({msg,err}); setTimeout(()=>setNotif(null),4000); };

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

  useEffect(()=>{ refresh(); },[refresh]);

  const planD = PLANS.find(p=>p.code===plan);
  const methD = METHODS.find(m=>m.code===meth);
  const pend  = hist.some(r=>r.status==='PENDING');

  /* ── Soumission JSON (fix principal du bug 400) ── */
  const submit = async () => {
    setBusy(true);
    try {
      await axios.post(`${API}/billing/payment-requests`, {
        plan_code:      plan,                               // ✅ JSON
        payment_method: meth,                              // ✅ JSON
        reference:      refEl.current?.value?.trim()||undefined,
      });
      notify('✅ Demande soumise ! Validation sous 24h.');
      setStep(1);
      if(refEl.current) refEl.current.value='';
      refresh();
    } catch(e) {
      notify(e.response?.data?.error||'Erreur lors de la soumission', true);
    } finally { setBusy(false); }
  };

  if(load) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:260}}>
      <style>{G}</style>
      <div style={{width:42,height:42,border:'4px solid #E2E8F0',borderTopColor:'#0D7A87',borderRadius:'50%',animation:'sp .8s linear infinite'}}/>
    </div>
  );

  const CARD = {background:'#fff',borderRadius:20,border:'1px solid #E8EDF2',boxShadow:'0 1px 6px rgba(0,0,0,.05)',marginBottom:18,overflow:'hidden'};
  const HDR  = {padding:'15px 22px',borderBottom:'1px solid #F1F5F9',fontWeight:700,fontSize:15,color:'#0F172A',display:'flex',alignItems:'center',gap:8};

  return (
    <div style={{maxWidth:860,margin:'0 auto',padding:'20px 20px 48px'}}>
      <style>{G}</style>

      {/* Toast */}
      {notif && (
        <div style={{position:'fixed',top:20,right:20,zIndex:9999,padding:'14px 20px',borderRadius:14,background:notif.err?'#FEE2E2':'#D1FAE5',color:notif.err?'#991B1B':'#065F46',fontWeight:700,fontSize:14,boxShadow:'0 8px 32px rgba(0,0,0,.15)',animation:'fu .3s ease'}}>
          {notif.msg}
        </div>
      )}

      {/* Titre */}
      <div style={{marginBottom:22}}>
        <h1 style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontWeight:800,fontSize:22,color:'#0F172A',margin:0}}>💳 Paiement & Abonnement</h1>
        <p style={{color:'#64748B',fontSize:13,marginTop:4}}>Gérez votre abonnement et soumettez vos demandes de paiement</p>
      </div>

      {/* Abonnement */}
      <div style={CARD}>
        <div style={HDR}>📋 Abonnement actuel</div>
        <div style={{padding:'18px 22px'}}>
          {sub && sub.status!=='NO_SUBSCRIPTION' ? (
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <div style={{width:50,height:50,borderRadius:14,background:'linear-gradient(135deg,#0D7A87,#13A3B4)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontFamily:'Plus Jakarta Sans,sans-serif',fontWeight:800,fontSize:18}}>
                  {sub.plan?.[0]||'P'}
                </div>
                <div>
                  <div style={{fontWeight:800,fontSize:17,color:'#0F172A'}}>Plan {sub.plan}</div>
                  <div style={{fontSize:13,color:'#64748B',marginTop:3}}>
                    {sub.days_remaining>0 ? `⏳ ${sub.days_remaining} jour${sub.days_remaining>1?'s':''} restant${sub.days_remaining>1?'s':''}` : '⚠️ Expiré'}
                    {sub.end_date && ` · Expire le ${new Date(sub.end_date).toLocaleDateString('fr-FR')}`}
                  </div>
                </div>
              </div>
              <span style={{padding:'6px 18px',borderRadius:99,fontSize:13,fontWeight:700,background:sub.is_expired?'#FEE2E2':sub.is_trial?'#FEF3C7':'#D1FAE5',color:sub.is_expired?'#991B1B':sub.is_trial?'#B45309':'#065F46'}}>
                {sub.is_expired?'❌ Expiré':sub.is_trial?'🕐 Essai gratuit':'✅ Actif'}
              </span>
            </div>
          ) : (
            <div style={{color:'#64748B',fontSize:14,display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:28}}>💡</span> Aucun abonnement actif — choisissez votre plan ci-dessous
            </div>
          )}
        </div>
      </div>

      {/* Alerte pending */}
      {pend && (
        <div style={{background:'#FFF7ED',border:'1.5px solid #FED7AA',borderRadius:16,padding:'15px 20px',marginBottom:18,display:'flex',gap:12,alignItems:'center'}}>
          <span style={{fontSize:26}}>⏳</span>
          <div>
            <div style={{fontWeight:700,color:'#C2410C',fontSize:15}}>Une demande est en cours de validation</div>
            <div style={{fontSize:13,color:'#92400E',marginTop:2}}>Notre équipe traitera votre demande sous 24h. Vous serez notifié une fois validée.</div>
          </div>
        </div>
      )}

      {/* Formulaire */}
      {!pend && (
        <div style={CARD}>
          {/* Steps bar */}
          <div style={{padding:'16px 22px',borderBottom:'1px solid #F1F5F9',display:'flex',alignItems:'center'}}>
            {[{n:1,l:'Choisir le plan'},{n:2,l:'Mode de paiement'},{n:3,l:'Confirmer'}].map((s,i)=>(
              <React.Fragment key={s.n}>
                <div style={{display:'flex',alignItems:'center',gap:7}}>
                  <div style={{width:28,height:28,borderRadius:'50%',background:step>=s.n?'#0D7A87':'#F1F5F9',color:step>=s.n?'#fff':'#94A3B8',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:12,transition:'all .3s'}}>
                    {step>s.n?'✓':s.n}
                  </div>
                  <span style={{fontSize:13,fontWeight:600,color:step>=s.n?'#0D7A87':'#94A3B8'}}>{s.l}</span>
                </div>
                {i<2 && <div style={{flex:1,height:2,background:step>s.n?'#0D7A87':'#E2E8F0',margin:'0 10px',transition:'background .3s',minWidth:16}}/>}
              </React.Fragment>
            ))}
          </div>

          <div style={{padding:'24px 22px'}} className="fu" key={step}>

            {/* Étape 1 — Plan */}
            {step===1 && (
              <div>
                <h3 style={{fontWeight:700,fontSize:16,color:'#0F172A',margin:'0 0 4px'}}>Quel plan souhaitez-vous ?</h3>
                <p style={{color:'#64748B',fontSize:13,margin:'0 0 18px'}}>Sélectionnez le plan adapté à votre cabinet dentaire</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:22}}>
                  {PLANS.map(p=>(
                    <div key={p.code} className={`pc ${plan===p.code?'sel':''}`} onClick={()=>setPlan(p.code)}>
                      {p.popular && <div style={{position:'absolute',top:-10,left:'50%',transform:'translateX(-50%)',background:'#0D7A87',color:'#fff',fontSize:10,fontWeight:800,padding:'3px 12px',borderRadius:99,whiteSpace:'nowrap'}}>⭐ POPULAIRE</div>}
                      <div style={{fontWeight:800,fontSize:14,color:'#0F172A',marginBottom:2}}>{p.label}</div>
                      <div style={{fontSize:12,color:'#64748B',marginBottom:10}}>{p.desc}</div>
                      <div style={{fontWeight:900,fontSize:24,color:'#0D7A87',lineHeight:1,marginBottom:12}}>
                        {fmt(p.price)}<span style={{fontSize:12,color:'#94A3B8',fontWeight:500}}> Ar/mois</span>
                      </div>
                      <ul style={{listStyle:'none',padding:0,margin:0}}>
                        {p.features.slice(0,4).map((f,i)=>(
                          <li key={i} style={{fontSize:11,color:'#475569',padding:'2px 0',display:'flex',gap:6}}>
                            <span style={{color:'#0D7A87',fontWeight:800,flexShrink:0}}>✓</span>{f}
                          </li>
                        ))}
                        {p.features.length>4 && <li style={{fontSize:11,color:'#94A3B8',marginTop:3}}>+{p.features.length-4} autres</li>}
                      </ul>
                      {plan===p.code && <div style={{position:'absolute',top:10,right:10,width:20,height:20,borderRadius:'50%',background:'#0D7A87',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#fff',fontSize:11}}>✓</span></div>}
                    </div>
                  ))}
                </div>
                <button className="pb" onClick={()=>setStep(2)}>Continuer avec le plan {plan} →</button>
              </div>
            )}

            {/* Étape 2 — Paiement */}
            {step===2 && (
              <div>
                <h3 style={{fontWeight:700,fontSize:16,color:'#0F172A',margin:'0 0 4px'}}>Comment souhaitez-vous payer ?</h3>
                <p style={{color:'#64748B',fontSize:13,margin:'0 0 16px'}}>Effectuez le virement puis indiquez la référence ci-dessous</p>
                <div style={{background:'#F0FDFE',border:'1.5px solid #7DD3DA',borderRadius:12,padding:'12px 16px',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontWeight:700,color:'#0D7A87',fontSize:14}}>Plan {planD?.label}</span>
                  <span style={{fontWeight:900,color:'#0D7A87',fontSize:18}}>{fmt(planD?.price)} Ar/mois</span>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
                  {METHODS.map(m=>(
                    <div key={m.code} className={`mc ${meth===m.code?'sel':''}`} onClick={()=>setMeth(m.code)}>
                      <div style={{display:'flex',alignItems:'center',gap:12}}>
                        <div style={{width:40,height:40,borderRadius:10,background:m.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{m.emoji}</div>
                        <div>
                          <div style={{fontWeight:700,color:m.color,fontSize:14}}>{m.name}</div>
                          <div style={{fontSize:12,color:'#64748B'}}>{m.num}</div>
                        </div>
                      </div>
                      {meth===m.code && <div style={{width:22,height:22,borderRadius:'50%',background:'#0D7A87',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#fff',fontSize:12}}>✓</span></div>}
                    </div>
                  ))}
                </div>
                <div style={{marginBottom:20}}>
                  <label style={{display:'block',fontSize:13,fontWeight:600,color:'#475569',marginBottom:6}}>
                    Référence de transaction <span style={{color:'#94A3B8',fontWeight:400}}>(recommandé)</span>
                  </label>
                  <input ref={refEl} type="text" placeholder="Ex: MVL-2025-123456" className="pi"/>
                  <p style={{fontSize:12,color:'#94A3B8',marginTop:4}}>Indiquez votre numéro de transaction pour accélérer la validation</p>
                </div>
                <div style={{display:'flex',gap:10}}>
                  <button className="pg" onClick={()=>setStep(1)}>← Retour</button>
                  <button className="pb" onClick={()=>setStep(3)}>Vérifier et confirmer →</button>
                </div>
              </div>
            )}

            {/* Étape 3 — Confirmation */}
            {step===3 && (
              <div>
                <h3 style={{fontWeight:700,fontSize:16,color:'#0F172A',marginBottom:18}}>Récapitulatif de votre demande</h3>
                <div style={{background:'#F8FAFC',borderRadius:14,border:'1px solid #E2E8F0',overflow:'hidden',marginBottom:16}}>
                  {[
                    {l:'Plan choisi',      v:planD?.label},
                    {l:'Montant mensuel',  v:`${fmt(planD?.price)} Ar`},
                    {l:'Mode de paiement', v:`${methD?.emoji} ${methD?.name}`},
                    {l:'Référence',        v:refEl.current?.value?.trim()||'—'},
                  ].map((r,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 18px',borderBottom:i<3?'1px solid #F1F5F9':'none'}}>
                      <span style={{fontSize:14,color:'#64748B'}}>{r.l}</span>
                      <span style={{fontSize:14,fontWeight:700,color:'#0F172A'}}>{r.v}</span>
                    </div>
                  ))}
                </div>
                <div style={{background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:12,padding:'13px 16px',marginBottom:20,display:'flex',gap:8}}>
                  <span>ℹ️</span>
                  <p style={{fontSize:13,color:'#92400E',margin:0,lineHeight:1.6}}>
                    Votre abonnement sera activé <strong>sous 24h</strong> après validation de votre paiement. Confirmation par email.
                  </p>
                </div>
                <div style={{display:'flex',gap:10}}>
                  <button className="pg" onClick={()=>setStep(2)}>← Retour</button>
                  <button className="pb" style={{flex:1}} onClick={submit} disabled={busy}>
                    {busy?'⏳ Envoi en cours...':'✅ Confirmer et soumettre'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historique */}
      <div style={CARD}>
        <div style={HDR}>📜 Historique des demandes</div>
        <div style={{padding:'16px 22px'}}>
          {hist.length===0 ? (
            <div style={{textAlign:'center',padding:'28px 0',color:'#94A3B8'}}>
              <div style={{fontSize:38,marginBottom:8}}>📋</div>
              <p style={{margin:0,fontSize:14}}>Aucune demande de paiement pour le moment</p>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {hist.map(req=>{
                const s = ST[req.status]||ST.PENDING;
                const m = METHODS.find(x=>x.code===req.payment_method);
                return (
                  <div key={req.id} style={{background:'#F8FAFC',borderRadius:14,padding:'14px 18px',border:'1px solid #F1F5F9',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div style={{width:10,height:10,borderRadius:'50%',background:s.dot,flexShrink:0}}/>
                      <div>
                        <div style={{fontWeight:700,fontSize:14,color:'#0F172A'}}>Plan {req.plan_code} — {fmt(req.amount_mga)} Ar</div>
                        <div style={{fontSize:12,color:'#64748B',marginTop:3}}>
                          {m?.emoji} {m?.name||req.payment_method}
                          {req.reference&&` · Réf: ${req.reference}`}
                          {' · '}{new Date(req.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}
                        </div>
                        {req.note_admin && (
                          <div style={{marginTop:6,background:'#fff',border:'1px solid #E2E8F0',borderRadius:8,padding:'5px 10px',fontSize:12,color:'#475569',display:'flex',gap:6}}>
                            <span>💬</span><span><strong>Admin :</strong> {req.note_admin}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <span style={{padding:'5px 14px',borderRadius:99,fontSize:12,fontWeight:700,background:s.bg,color:s.text,flexShrink:0}}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
