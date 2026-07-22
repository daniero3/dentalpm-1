/**
 * PaymentValidationPage.jsx — Côté ADMIN / SUPER_ADMIN
 * Interface moderne pour valider/rejeter les demandes de paiement
 */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8001/api'
    : '/api';

const fmt  = n => new Intl.NumberFormat('fr-MG').format(n || 0);
const fdate = d => d ? new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';

const METHODS = {
  MVOLA:'MVola 📱', ORANGE_MONEY:'Orange Money 📱',
  AIRTEL_MONEY:'Airtel Money 📱', BANK_TRANSFER:'Mastercard 💳', CASH:'Espèces 💵',
};

const ST_TABS = [
  { key:'PENDING',  label:'En attente', color:'#B45309', bg:'#FEF3C7', dot:'#F59E0B' },
  { key:'VERIFIED', label:'Approuvés',  color:'#065F46', bg:'#D1FAE5', dot:'#10B981' },
  { key:'REJECTED', label:'Rejetés',    color:'#991B1B', bg:'#FEE2E2', dot:'#EF4444' },
];

const G = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');
  @keyframes fu2{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  .fu2{animation:fu2 .3s ease both}
  @keyframes sp2{to{transform:rotate(360deg)}}
  .av-btn{padding:10px 18px;border-radius:11px;font-weight:700;font-size:13px;border:none;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:6px}
  .av-btn:hover{transform:translateY(-1px);opacity:.9}
  .av-inp{width:100%;padding:10px 13px;border-radius:10px;border:1.5px solid #E2E8F0;font-size:14px;font-family:inherit;outline:none;transition:border-color .2s,box-shadow .2s;resize:vertical}
  .av-inp:focus{border-color:#0D7A87;box-shadow:0 0 0 3px rgba(13,122,135,.1)}
  .req-card{background:#fff;border:1px solid #E8EDF2;border-radius:18px;padding:20px 22px;transition:box-shadow .2s;margin-bottom:12px}
  .req-card:hover{box-shadow:0 4px 20px rgba(0,0,0,.08)}
  .overlay{position:fixed;inset:0;background:rgba(10,15,20,.65);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px}
  .modal{background:#fff;border-radius:22px;padding:32px 28px;max-width:480px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,.18);animation:fu2 .3s ease}
`;

export default function PaymentValidationPage() {
  const [all, setAll]       = useState([]);
  const [loading, setLoad]  = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [modal, setModal]   = useState(null); // { req, action:'approve'|'reject' }
  const [note, setNote]     = useState('');
  const [busy, setBusy]     = useState(false);
  const [notif, setNotif]   = useState(null);
  const [search, setSearch] = useState('');

  const notify = (msg, err=false) => { setNotif({msg,err}); setTimeout(()=>setNotif(null),4000); };

  const refresh = useCallback(async () => {
    setLoad(true);
    try {
      const r = await axios.get(`${API}/admin/payment-requests`);
      setAll(r.data?.paymentRequests || []);
    } catch(e) {
      notify('Impossible de charger les demandes', true);
    } finally { setLoad(false); }
  }, []);

  useEffect(()=>{ refresh(); },[refresh]);

  const filtered = all
    .filter(r => r.status === filter)
    .filter(r => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        r.clinic?.name?.toLowerCase().includes(s) ||
        r.plan_code?.toLowerCase().includes(s) ||
        r.reference?.toLowerCase().includes(s)
      );
    });

  const counts = { PENDING: 0, VERIFIED: 0, REJECTED: 0 };
  all.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });

  const openModal = (req, action) => { setModal({req, action}); setNote(''); };
  const closeModal = () => { setModal(null); setNote(''); };

  const doAction = async () => {
    if (!modal) return;
    if (modal.action === 'reject' && !note.trim()) { notify('Motif de rejet requis', true); return; }
    setBusy(true);
    try {
      const url = modal.action === 'approve'
        ? `${API}/admin/payment-requests/${modal.req.id}/verify`
        : `${API}/admin/payment-requests/${modal.req.id}/reject`;
      await axios.patch(url, { note_admin: note.trim() || undefined });
      notify(modal.action === 'approve' ? '✅ Paiement approuvé et abonnement activé !' : '❌ Demande rejetée.');
      closeModal();
      refresh();
    } catch(e) {
      notify(e.response?.data?.error || 'Erreur lors de la validation', true);
    } finally { setBusy(false); }
  };

  const CARD_BG = { background:'#fff', borderRadius:20, border:'1px solid #E8EDF2', boxShadow:'0 1px 6px rgba(0,0,0,.05)', marginBottom:18, overflow:'hidden' };
  const HDR     = { padding:'15px 22px', borderBottom:'1px solid #F1F5F9', fontWeight:700, fontSize:15, color:'#0F172A', display:'flex', alignItems:'center', gap:8 };

  return (
    <div style={{maxWidth:1000,margin:'0 auto',padding:'20px 20px 48px'}}>
      <style>{G}</style>

      {/* Toast */}
      {notif && (
        <div style={{position:'fixed',top:20,right:20,zIndex:9999,padding:'14px 20px',borderRadius:14,background:notif.err?'#FEE2E2':'#D1FAE5',color:notif.err?'#991B1B':'#065F46',fontWeight:700,fontSize:14,boxShadow:'0 8px 32px rgba(0,0,0,.15)',animation:'fu2 .3s ease'}}>
          {notif.msg}
        </div>
      )}

      {/* Titre */}
      <div style={{marginBottom:24}}>
        <h1 style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontWeight:800,fontSize:22,color:'#0F172A',margin:0}}>🏦 Validation des paiements</h1>
        <p style={{color:'#64748B',fontSize:13,marginTop:4}}>Approuvez ou rejetez les demandes de paiement des cabinets</p>
      </div>

      {/* KPI cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:22}}>
        {ST_TABS.map(t=>(
          <div key={t.key} style={{background:'#fff',borderRadius:16,padding:'18px 20px',border:`1.5px solid ${filter===t.key?t.dot:'#E8EDF2'}`,boxShadow:filter===t.key?`0 4px 20px ${t.dot}33`:'var(--sh1,0 1px 4px rgba(0,0,0,.05))',cursor:'pointer',transition:'all .2s'}} onClick={()=>setFilter(t.key)}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <div style={{width:10,height:10,borderRadius:'50%',background:t.dot}}/>
              <span style={{fontSize:13,fontWeight:600,color:t.color}}>{t.label}</span>
            </div>
            <div style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontWeight:800,fontSize:36,color:'#0F172A',lineHeight:1}}>
              {counts[t.key]}
            </div>
            <div style={{fontSize:12,color:'#94A3B8',marginTop:4}}>demande{counts[t.key]>1?'s':''}</div>
          </div>
        ))}
      </div>

      {/* Barre filtre + recherche */}
      <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:18,flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:6}}>
          {ST_TABS.map(t=>(
            <button type="button" key={t.key} onClick={()=>setFilter(t.key)}
              style={{padding:'8px 16px',borderRadius:10,border:'none',cursor:'pointer',fontWeight:600,fontSize:13,transition:'all .2s',background:filter===t.key?t.dot:'#F1F5F9',color:filter===t.key?'#fff':t.color}}>
              {t.label} ({counts[t.key]})
            </button>
          ))}
        </div>
        <input aria-label="Rechercher une validation de paiement" type="text" placeholder="Rechercher par cabinet, plan, référence..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{flex:1,minWidth:200,padding:'9px 14px',borderRadius:11,border:'1.5px solid #E2E8F0',fontSize:13,fontFamily:'inherit',outline:'none'}}
          onFocus={e=>e.target.style.borderColor='#0D7A87'}
          onBlur={e=>e.target.style.borderColor='#E2E8F0'}/>
        <button type="button" onClick={refresh} style={{padding:'9px 16px',borderRadius:11,border:'1.5px solid #E2E8F0',background:'#fff',color:'#475569',fontWeight:600,fontSize:13,cursor:'pointer'}}>
          🔄 Actualiser
        </button>
      </div>

      {/* Liste */}
      {loading ? (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200}}>
          <div style={{width:40,height:40,border:'4px solid #E2E8F0',borderTopColor:'#0D7A87',borderRadius:'50%',animation:'sp2 .8s linear infinite'}}/>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{...CARD_BG,padding:'48px 20px',textAlign:'center',color:'#94A3B8'}}>
          <div style={{fontSize:48,marginBottom:12}}>
            {filter==='PENDING'?'⏳':filter==='VERIFIED'?'✅':'❌'}
          </div>
          <p style={{margin:0,fontSize:15,fontWeight:600}}>
            {search ? 'Aucun résultat pour cette recherche' : `Aucune demande ${ST_TABS.find(t=>t.key===filter)?.label.toLowerCase()}`}
          </p>
        </div>
      ) : (
        <div className="fu2">
          {filtered.map(req => {
            const tab = ST_TABS.find(t=>t.key===req.status)||ST_TABS[0];
            return (
              <div key={req.id} className="req-card">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>

                  {/* Infos cabinet */}
                  <div style={{display:'flex',alignItems:'flex-start',gap:14,flex:1,minWidth:240}}>
                    <div style={{width:46,height:46,borderRadius:13,background:'linear-gradient(135deg,#0D7A87,#13A3B4)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontFamily:'Plus Jakarta Sans,sans-serif',fontWeight:800,fontSize:17,flexShrink:0}}>
                      {req.clinic?.name?.[0]||'C'}
                    </div>
                    <div>
                      <div style={{fontWeight:800,fontSize:16,color:'#0F172A',marginBottom:3}}>
                        {req.clinic?.name||`Clinique #${req.clinic_id?.slice?.(0,8)||'?'}`}
                      </div>
                      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                        <span style={{background:'#F0FDFE',color:'#0D7A87',borderRadius:99,padding:'2px 10px',fontSize:12,fontWeight:700}}>
                          Plan {req.plan_code}
                        </span>
                        <span style={{background:'#F8FAFC',color:'#475569',borderRadius:99,padding:'2px 10px',fontSize:12,fontWeight:600}}>
                          {METHODS[req.payment_method]||req.payment_method}
                        </span>
                        {req.reference && (
                          <span style={{background:'#F8FAFC',color:'#475569',borderRadius:99,padding:'2px 10px',fontSize:12}}>
                            Réf: {req.reference}
                          </span>
                        )}
                      </div>
                      <div style={{fontSize:12,color:'#94A3B8',marginTop:5}}>
                        Soumis le {fdate(req.created_at)}
                        {req.reviewed_at && ` · Traité le ${fdate(req.reviewed_at)}`}
                      </div>
                      {req.note_admin && (
                        <div style={{marginTop:8,background:'#F8FAFC',border:'1px solid #E2E8F0',borderRadius:8,padding:'7px 10px',fontSize:12,color:'#475569',display:'flex',gap:6}}>
                          <span>💬</span><span><strong>Note :</strong> {req.note_admin}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Montant + status + actions */}
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:10,flexShrink:0}}>
                    <div style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontWeight:900,fontSize:22,color:'#0D7A87',textAlign:'right'}}>
                      {fmt(req.amount_mga)} Ar
                    </div>
                    <span style={{padding:'5px 14px',borderRadius:99,fontSize:12,fontWeight:700,background:tab.bg,color:tab.color}}>
                      {tab.label}
                    </span>

                    {/* Actions uniquement si PENDING */}
                    {req.status === 'PENDING' && (
                      <div style={{display:'flex',gap:8}}>
                        <button type="button" className="av-btn" onClick={()=>openModal(req,'reject')}
                          style={{background:'#FEE2E2',color:'#991B1B'}}>
                          ✕ Rejeter
                        </button>
                        <button type="button" className="av-btn" onClick={()=>openModal(req,'approve')}
                          style={{background:'linear-gradient(135deg,#10B981,#059669)',color:'#fff',boxShadow:'0 4px 14px rgba(16,185,129,.3)'}}>
                          ✓ Approuver
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal confirmation */}
      {modal && (
        <div className="overlay" onClick={e=>e.target===e.currentTarget&&closeModal()}>
          <div className="modal">
            {/* Header */}
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:22}}>
              <div style={{width:52,height:52,borderRadius:16,background:modal.action==='approve'?'linear-gradient(135deg,#10B981,#059669)':'#FEE2E2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>
                {modal.action==='approve'?'✅':'❌'}
              </div>
              <div>
                <h2 style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontWeight:800,fontSize:20,color:'#0F172A',margin:0}}>
                  {modal.action==='approve'?'Approuver le paiement':'Rejeter la demande'}
                </h2>
                <p style={{color:'#64748B',fontSize:13,margin:0,marginTop:3}}>
                  {modal.req.clinic?.name||'Cabinet'} · Plan {modal.req.plan_code}
                </p>
              </div>
            </div>

            {/* Recap */}
            <div style={{background:'#F8FAFC',borderRadius:14,padding:'14px 18px',border:'1px solid #E2E8F0',marginBottom:18}}>
              {[
                {l:'Cabinet',   v:modal.req.clinic?.name||'—'},
                {l:'Plan',      v:modal.req.plan_code},
                {l:'Montant',   v:`${fmt(modal.req.amount_mga)} Ar`},
                {l:'Paiement',  v:METHODS[modal.req.payment_method]||modal.req.payment_method},
                {l:'Référence', v:modal.req.reference||'—'},
              ].map((r,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:i<4?'1px solid #F1F5F9':'none'}}>
                  <span style={{fontSize:13,color:'#64748B'}}>{r.l}</span>
                  <span style={{fontSize:13,fontWeight:700,color:'#0F172A'}}>{r.v}</span>
                </div>
              ))}
            </div>

            {modal.action === 'approve' ? (
              <div style={{background:'#D1FAE5',borderRadius:12,padding:'13px 16px',marginBottom:18}}>
                <p style={{fontSize:13,color:'#065F46',margin:0,fontWeight:600}}>
                  ✅ Cette action activera immédiatement l'abonnement Plan {modal.req.plan_code} du cabinet pour 30 jours.
                </p>
              </div>
            ) : (
              <div style={{marginBottom:18}}>
                <label htmlFor="payment-rejection-note" style={{display:'block',fontSize:13,fontWeight:600,color:'#475569',marginBottom:6}}>
                  Motif de rejet <span style={{color:'#EF4444'}}>*</span>
                </label>
                <textarea id="payment-rejection-note" aria-label="Motif de rejet" rows={3} className="av-inp" placeholder="Ex: Référence de paiement invalide, montant incorrect..."
                  value={note} onChange={e=>setNote(e.target.value)}/>
                <p style={{fontSize:12,color:'#94A3B8',marginTop:4}}>Ce message sera visible par le cabinet</p>
              </div>
            )}

            <div style={{display:'flex',gap:10}}>
              <button type="button" onClick={closeModal} style={{flex:1,padding:'12px',borderRadius:12,border:'1.5px solid #E2E8F0',background:'#fff',color:'#475569',fontWeight:600,fontSize:14,cursor:'pointer'}}>
                Annuler
              </button>
              <button type="button" onClick={doAction} disabled={busy}
                style={{flex:2,padding:'12px',borderRadius:12,border:'none',background:modal.action==='approve'?'linear-gradient(135deg,#10B981,#059669)':'linear-gradient(135deg,#EF4444,#DC2626)',color:'#fff',fontWeight:700,fontSize:14,cursor:busy?'not-allowed':'pointer',opacity:busy?.7:1}}>
                {busy ? '⏳ Traitement...' : modal.action==='approve' ? '✅ Confirmer et activer' : '❌ Confirmer le rejet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
