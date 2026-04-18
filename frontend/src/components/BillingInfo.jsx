import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  CreditCard, RefreshCw, AlertTriangle,
  CheckCircle, XCircle, Clock, Shield, ChevronRight
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : 'https://dentalpm-1-production.up.railway.app/api';
const authH = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const T = '#0D7A87';

const BRAND_COLORS = { visa:'#1A1F71', mastercard:'#EB001B', amex:'#2E77BC', default:'#475569' };
const BRAND_LABELS = { visa:'Visa', mastercard:'Mastercard', amex:'American Express', default:'Carte' };

function CardBrand({ brand }) {
  const color = BRAND_COLORS[brand] || BRAND_COLORS.default;
  const label = BRAND_LABELS[brand] || brand?.toUpperCase() || 'Carte';
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:color, color:'#fff', padding:'2px 10px', borderRadius:6, fontSize:11, fontWeight:800, letterSpacing:'.05em' }}>
      {label}
    </span>
  );
}

export default function BillingInfo() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/billing/payment-method`, authH());
      setData(r.data);
    } catch(e) {
      // Pas d'erreur bloquante — afficher état vide
      console.warn('BillingInfo:', e.response?.status, e.response?.data?.error);
      setData({ card: null, subscription: null });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Ouvrir Stripe Portal
  const openPortal = async (action) => {
    setOpening(true);
    try {
      const r = await axios.post(`${API}/billing/customer-portal`, {}, authH());
      if (r.data.url) window.open(r.data.url, '_blank');
    } catch(e) {
      toast.error(e.response?.data?.error || 'Erreur ouverture portail Stripe');
    } finally { setOpening(false); }
  };

  const sub   = data?.subscription;
  const card  = data?.card;

  const subStatus = sub ? (
    sub.status === 'trialing'         ? { label:'Essai gratuit',  color:'#F59E0B', bg:'#FEF9C3', icon:Clock }
    : sub.status === 'active'         ? { label:'Actif',          color:'#16A34A', bg:'#DCFCE7', icon:CheckCircle }
    : sub.cancel_at_period_end        ? { label:'Annulation prévue', color:'#EF4444', bg:'#FEE2E2', icon:AlertTriangle }
    : sub.status === 'past_due'       ? { label:'Paiement en retard', color:'#EF4444', bg:'#FEE2E2', icon:XCircle }
    : sub.status === 'canceled'       ? { label:'Annulé',         color:'#64748B', bg:'#F1F5F9', icon:XCircle }
    :                                   { label: sub.status,      color:'#64748B', bg:'#F1F5F9', icon:Clock }
  ) : null;

  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end * 1000).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })
    : null;
  const trialEnd = sub?.trial_end
    ? new Date(sub.trial_end * 1000).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })
    : null;

  if (loading) return (
    <div style={{ padding:'48px', textAlign:'center', color:'#94A3B8' }}>
      <RefreshCw size={24} style={{ animation:'spin .8s linear infinite', marginBottom:8 }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ fontSize:13 }}>Chargement des infos Stripe...</div>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── Statut abonnement Stripe ── */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:`${T}15`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Shield size={16} color={T}/>
          </div>
          <span style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:14, color:'#0F172A' }}>Abonnement Stripe</span>
        </div>
        <div style={{ padding:'18px 20px' }}>
          {!sub ? (
            <div style={{ textAlign:'center', padding:'12px 0', color:'#94A3B8', fontSize:13 }}>
              Aucun abonnement Stripe actif.{' '}
              <span style={{ color:T, fontWeight:600 }}>Choisissez un plan pour vous abonner.</span>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {subStatus && (() => { const Icon = subStatus.icon; return (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:subStatus.bg, borderRadius:10 }}>
                  <Icon size={16} color={subStatus.color}/>
                  <span style={{ fontSize:13, fontWeight:700, color:subStatus.color }}>{subStatus.label}</span>
                </div>
              )})()}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {trialEnd && (
                  <div style={{ padding:'10px 14px', background:'#F8FAFC', borderRadius:10, border:'1px solid #E2E8F0' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:3 }}>Fin d'essai</div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#0F172A' }}>{trialEnd}</div>
                  </div>
                )}
                {periodEnd && (
                  <div style={{ padding:'10px 14px', background:'#F8FAFC', borderRadius:10, border:'1px solid #E2E8F0' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:3 }}>
                      {sub.cancel_at_period_end ? 'Accès jusqu\'au' : 'Prochain renouvellement'}
                    </div>
                    <div style={{ fontSize:13, fontWeight:600, color:'#0F172A' }}>{periodEnd}</div>
                  </div>
                )}
              </div>
              {sub.cancel_at_period_end && (
                <div style={{ padding:'12px 14px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10, fontSize:12, color:'#DC2626' }}>
                  ⚠️ Votre abonnement sera annulé le {periodEnd}. Réactivez-le via le portail Stripe pour continuer.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Carte bancaire ── */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:`${T}15`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <CreditCard size={16} color={T}/>
          </div>
          <span style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:14, color:'#0F172A' }}>Moyen de paiement</span>
        </div>
        <div style={{ padding:'18px 20px' }}>
          {!card ? (
            <div style={{ textAlign:'center', padding:'12px 0' }}>
              <div style={{ fontSize:32, marginBottom:8 }}>💳</div>
              <div style={{ fontSize:13, color:'#64748B', marginBottom:12 }}>Aucune carte enregistrée</div>
              <button onClick={openPortal} disabled={opening}
                style={{ padding:'9px 18px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${T},#13A3B4)`, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:7 }}>
                <CreditCard size={14}/> Ajouter une carte
              </button>
            </div>
          ) : (
            <>
              {/* Carte visuelle */}
              <div style={{ background:'linear-gradient(135deg,#0A3A42,#0D7A87)', borderRadius:14, padding:'18px 20px', marginBottom:16, position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:-20, right:-20, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.05)' }}/>
                <div style={{ position:'absolute', bottom:-30, right:30, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,.04)' }}/>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
                  <CardBrand brand={card.brand}/>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.5)', fontWeight:600 }}>DentalPM</div>
                </div>
                <div style={{ fontFamily:'monospace', fontSize:18, color:'#fff', letterSpacing:'.15em', fontWeight:700, marginBottom:12 }}>
                  •••• •••• •••• {card.last4}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:9, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'.1em' }}>Expire</div>
                    <div style={{ fontSize:13, color:'#fff', fontWeight:600 }}>
                      {String(card.exp_month).padStart(2,'0')}/{card.exp_year}
                    </div>
                  </div>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:'#22C55E', boxShadow:'0 0 0 3px rgba(34,197,94,.25)' }}/>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Portail Stripe ── */}
      <div style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #F1F5F9' }}>
          <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:14, color:'#0F172A', marginBottom:2 }}>Gérer via Stripe</div>
          <div style={{ fontSize:12, color:'#94A3B8' }}>Accès sécurisé au portail officiel Stripe</div>
        </div>
        <div style={{ padding:'14px 20px', display:'flex', flexDirection:'column', gap:10 }}>

          {/* Changer de carte */}
          <button onClick={openPortal} disabled={opening}
            style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 16px', borderRadius:12, border:'1.5px solid #E2E8F0', background:'#F8FAFC', cursor:'pointer', transition:'all .15s', textAlign:'left', width:'100%' }}
            onMouseOver={e=>{ e.currentTarget.style.borderColor=T; e.currentTarget.style.background='#F0FDFE'; }}
            onMouseOut={e=>{ e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.background='#F8FAFC'; }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:`${T}15`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <CreditCard size={16} color={T}/>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>Changer de carte bancaire</div>
                <div style={{ fontSize:11, color:'#94A3B8' }}>Mettre à jour votre moyen de paiement</div>
              </div>
            </div>
            <ChevronRight size={16} color="#94A3B8"/>
          </button>

          {/* Retirer la carte / Annuler */}
          <button onClick={openPortal} disabled={opening}
            style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 16px', borderRadius:12, border:'1.5px solid #FEE2E2', background:'#FFF5F5', cursor:'pointer', transition:'all .15s', textAlign:'left', width:'100%' }}
            onMouseOver={e=>{ e.currentTarget.style.borderColor='#EF4444'; e.currentTarget.style.background='#FEE2E2'; }}
            onMouseOut={e=>{ e.currentTarget.style.borderColor='#FEE2E2'; e.currentTarget.style.background='#FFF5F5'; }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'#FEE2E2', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <XCircle size={16} color="#EF4444"/>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#DC2626' }}>Retirer ma carte / Annuler</div>
                <div style={{ fontSize:11, color:'#94A3B8' }}>Aucun prélèvement ne sera effectué</div>
              </div>
            </div>
            <ChevronRight size={16} color="#EF4444"/>
          </button>

          {/* Réactiver */}
          {sub?.cancel_at_period_end && (
            <button onClick={openPortal} disabled={opening}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 16px', borderRadius:12, border:'1.5px solid #BBF7D0', background:'#F0FDF4', cursor:'pointer', transition:'all .15s', textAlign:'left', width:'100%' }}
              onMouseOver={e=>{ e.currentTarget.style.borderColor='#22C55E'; }}
              onMouseOut={e=>{ e.currentTarget.style.borderColor='#BBF7D0'; }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'#DCFCE7', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <CheckCircle size={16} color="#16A34A"/>
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#15803D' }}>Réactiver mon abonnement</div>
                  <div style={{ fontSize:11, color:'#94A3B8' }}>Reprendre les prélèvements automatiques</div>
                </div>
              </div>
              <ChevronRight size={16} color="#16A34A"/>
            </button>
          )}

          {/* Badge sécurité */}
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'#F8FAFC', borderRadius:10, border:'1px solid #E2E8F0', marginTop:4 }}>
            <Shield size={13} color="#94A3B8"/>
            <span style={{ fontSize:11, color:'#94A3B8' }}>
              Toutes les opérations bancaires sont effectuées directement sur la plateforme sécurisée <strong style={{ color:'#635BFF' }}>Stripe</strong>. DentalPM ne stocke jamais vos données bancaires.
            </span>
          </div>

          {opening && (
            <div style={{ textAlign:'center', fontSize:12, color:'#64748B', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <RefreshCw size={12} style={{ animation:'spin .8s linear infinite' }}/>
              Ouverture du portail Stripe...
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
