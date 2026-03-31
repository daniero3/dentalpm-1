import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_API_URL || 'https://dentalpm-1-production.up.railway.app/api';

const fmt = (n) => new Intl.NumberFormat('fr-MG').format(n || 0);

const PLAN_COLORS = {
  ESSENTIAL: { bg:'#DBEAFE', text:'#1D4ED8', border:'#93C5FD' },
  PRO:       { bg:'#D1FAE5', text:'#065F46', border:'#6EE7B7' },
  GROUP:     { bg:'#EDE9FE', text:'#5B21B6', border:'#C4B5FD' },
  TRIAL:     { bg:'#FEF9C3', text:'#854D0E', border:'#FDE047' },
  EXPIRED:   { bg:'#FEE2E2', text:'#991B1B', border:'#FCA5A5' },
};

const Badge = ({ plan, status }) => {
  const key = plan || status || 'TRIAL';
  const c = PLAN_COLORS[key] || PLAN_COLORS.TRIAL;
  return (
    <span style={{ background:c.bg, color:c.text, border:`1px solid ${c.border}`, borderRadius:99, padding:'2px 10px', fontSize:11, fontWeight:700 }}>
      {key}
    </span>
  );
};

const Card = ({ label, value, sub, color = '#0D7A87', icon }) => (
  <div style={{ background:'#fff', borderRadius:16, padding:'20px 24px', border:'1px solid #E2E8F0', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
      <div>
        <p style={{ fontSize:13, color:'#64748B', fontWeight:600, margin:'0 0 6px' }}>{label}</p>
        <p style={{ fontSize:28, fontWeight:800, color, margin:0, fontFamily:'Plus Jakarta Sans' }}>{value}</p>
        {sub && <p style={{ fontSize:12, color:'#94A3B8', marginTop:4 }}>{sub}</p>}
      </div>
      <span style={{ fontSize:28 }}>{icon}</span>
    </div>
  </div>
);

export default function SuperAdminDashboard() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [processing, setProcessing] = useState(null);

  const fetchRevenue = useCallback(async () => {
    try {
      const { data: d } = await axios.get(`${API}/admin/revenue`);
      setData(d);
    } catch(e) {
      toast.error('Erreur chargement dashboard');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRevenue(); }, [fetchRevenue]);

  const approvePayment = async (id, plan) => {
    setProcessing(id);
    try {
      await axios.patch(`${API}/admin/payment-requests/${id}/approve`, { plan });
      toast.success('✅ Paiement approuvé — abonnement activé !');
      fetchRevenue();
    } catch(e) { toast.error('Erreur approbation'); }
    finally { setProcessing(null); }
  };

  const rejectPayment = async (id) => {
    setProcessing(id);
    try {
      await axios.patch(`${API}/admin/payment-requests/${id}/reject`, { reason: 'Paiement non confirmé' });
      toast.success('Paiement rejeté');
      fetchRevenue();
    } catch(e) { toast.error('Erreur rejet'); }
    finally { setProcessing(null); }
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:400 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:40, height:40, border:'4px solid #E2E8F0', borderTopColor:'#0D7A87', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
        <p style={{ color:'#64748B', fontSize:14 }}>Chargement des revenus...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const tabs = [
    { id:'overview',  label:'📊 Vue générale' },
    { id:'payments',  label:`💳 Paiements${data?.pendingCount > 0 ? ` (${data.pendingCount})` : ''}` },
    { id:'clinics',   label:'🏥 Cabinets' },
    { id:'subs',      label:'🔄 Abonnements' },
  ];

  return (
    <div style={{ padding:'24px', maxWidth:1200, margin:'0 auto', fontFamily:'DM Sans, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:26, color:'#0F172A', margin:0 }}>
            Dashboard Revenus
          </h1>
          <p style={{ color:'#64748B', fontSize:14, marginTop:4 }}>
            DPM Madagascar — Tableau de bord propriétaire
          </p>
        </div>
        <button onClick={fetchRevenue} style={{ padding:'8px 16px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', color:'#475569' }}>
          🔄 Actualiser
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px,1fr))', gap:16, marginBottom:28 }}>
        <Card label="Revenus mensuels (MRR)" value={`${fmt(data?.mrr)} Ar`} sub="Abonnements actifs" color="#0D7A87" icon="💰" />
        <Card label="Revenus annuels (ARR)" value={`${fmt(data?.arr)} Ar`} sub="Projection 12 mois" color="#0A5F6A" icon="📈" />
        <Card label="Cabinets actifs" value={data?.activeClinics || 0} sub={`Trial: ${data?.byPlan?.TRIAL || 0}`} color="#16A34A" icon="🏥" />
        <Card label="Paiements en attente" value={data?.pendingCount || 0} sub="À valider" color={data?.pendingCount > 0 ? '#DC2626' : '#64748B'} icon="⏳" />
      </div>

      {/* Plan distribution */}
      <div style={{ background:'#fff', borderRadius:16, padding:20, border:'1px solid #E2E8F0', marginBottom:24 }}>
        <p style={{ fontWeight:700, fontSize:14, color:'#0F172A', margin:'0 0 14px' }}>Répartition par plan</p>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          {Object.entries(data?.byPlan || {}).map(([plan, count]) => (
            count > 0 && (
              <div key={plan} style={{ display:'flex', alignItems:'center', gap:8, background:'#F8FAFC', borderRadius:10, padding:'10px 16px', border:'1px solid #E2E8F0' }}>
                <Badge plan={plan} />
                <span style={{ fontWeight:800, fontSize:20, color:'#0F172A' }}>{count}</span>
                <span style={{ fontSize:12, color:'#64748B' }}>cabinet{count > 1 ? 's' : ''}</span>
                {plan !== 'TRIAL' && (
                  <span style={{ fontSize:11, color:'#0D7A87', fontWeight:600 }}>
                    {fmt({ ESSENTIAL:150000, PRO:300000, GROUP:500000 }[plan] * count)} Ar/mois
                  </span>
                )}
              </div>
            )
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, borderBottom:'2px solid #F1F5F9', marginBottom:20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding:'10px 18px', borderRadius:'10px 10px 0 0', border:'none', background: activeTab===t.id ? '#0D7A87' : 'transparent', color: activeTab===t.id ? '#fff' : '#64748B', fontWeight:600, fontSize:13, cursor:'pointer', transition:'all .2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: PAIEMENTS EN ATTENTE ── */}
      {activeTab === 'payments' && (
        <div>
          <h3 style={{ fontWeight:700, fontSize:16, color:'#0F172A', marginBottom:14 }}>
            💳 Paiements à valider ({data?.pendingPayments?.length || 0})
          </h3>
          {(data?.pendingPayments || []).length === 0 ? (
            <div style={{ textAlign:'center', padding:48, background:'#F8FAFC', borderRadius:16, border:'1px solid #E2E8F0' }}>
              <p style={{ fontSize:40, margin:0 }}>✅</p>
              <p style={{ color:'#64748B', marginTop:8 }}>Aucun paiement en attente</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {(data?.pendingPayments || []).map(p => (
                <div key={p.id} style={{ background:'#fff', borderRadius:14, padding:20, border:'2px solid #FED7AA', boxShadow:'0 4px 12px rgba(245,158,11,0.1)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
                    <div>
                      <p style={{ fontWeight:700, color:'#0F172A', fontSize:15, margin:'0 0 4px' }}>
                        {p.clinic_name || p.clinic_id || 'Cabinet inconnu'}
                      </p>
                      <p style={{ color:'#64748B', fontSize:13, margin:'0 0 6px' }}>
                        Plan: <Badge plan={p.plan_code} /> · Montant: <strong style={{ color:'#0D7A87' }}>{fmt(p.amount_mga)} Ar</strong>
                      </p>
                      <p style={{ color:'#94A3B8', fontSize:12, margin:0 }}>
                        Méthode: {p.payment_method} · {new Date(p.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                      <button
                        onClick={() => approvePayment(p.id, p.plan_code)}
                        disabled={processing === p.id}
                        style={{ padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#16A34A,#15803D)', color:'#fff', border:'none', fontWeight:700, fontSize:13, cursor:'pointer', opacity: processing===p.id ? 0.6 : 1 }}>
                        {processing === p.id ? '...' : '✅ Approuver'}
                      </button>
                      <button
                        onClick={() => rejectPayment(p.id)}
                        disabled={processing === p.id}
                        style={{ padding:'8px 16px', borderRadius:10, background:'#FEE2E2', color:'#DC2626', border:'1px solid #FECACA', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                        ❌ Rejeter
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: CABINETS ── */}
      {activeTab === 'clinics' && (
        <div>
          <h3 style={{ fontWeight:700, fontSize:16, color:'#0F172A', marginBottom:14 }}>
            🏥 Tous les cabinets ({data?.allClinics?.length || 0})
          </h3>
          <div style={{ borderRadius:12, overflow:'hidden', border:'1px solid #E2E8F0' }}>
            <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#F8FAFC' }}>
                  {['Cabinet','Email','Ville','Statut','Plan','Inscrit le','Trial expire'].map(h => (
                    <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontWeight:600, color:'#475569', fontSize:12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.allClinics || []).map((c, i) => (
                  <tr key={c.id} style={{ background: i%2===0 ? '#fff' : '#FAFAFA', borderTop:'1px solid #F1F5F9' }}>
                    <td style={{ padding:'10px 14px', fontWeight:600, color:'#0F172A' }}>{c.name}</td>
                    <td style={{ padding:'10px 14px', color:'#64748B' }}>{c.email}</td>
                    <td style={{ padding:'10px 14px', color:'#64748B' }}>{c.city || '—'}</td>
                    <td style={{ padding:'10px 14px' }}><Badge status={c.status} /></td>
                    <td style={{ padding:'10px 14px' }}><Badge plan={c.plan} /></td>
                    <td style={{ padding:'10px 14px', color:'#94A3B8', fontSize:12 }}>{c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : '—'}</td>
                    <td style={{ padding:'10px 14px', color: c.trial_ends_at && new Date(c.trial_ends_at) < new Date() ? '#DC2626' : '#94A3B8', fontSize:12 }}>
                      {c.trial_ends_at ? new Date(c.trial_ends_at).toLocaleDateString('fr-FR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: ABONNEMENTS ACTIFS ── */}
      {activeTab === 'subs' && (
        <div>
          <h3 style={{ fontWeight:700, fontSize:16, color:'#0F172A', marginBottom:14 }}>
            🔄 Abonnements actifs ({data?.activeSubs?.length || 0}) · MRR total: <span style={{ color:'#0D7A87' }}>{fmt(data?.mrr)} Ar</span>
          </h3>
          <div style={{ borderRadius:12, overflow:'hidden', border:'1px solid #E2E8F0' }}>
            <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#F8FAFC' }}>
                  {['Cabinet','Ville','Plan','Prix/mois','Expire le','Statut'].map(h => (
                    <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontWeight:600, color:'#475569', fontSize:12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.activeSubs || []).map((s, i) => {
                  const daysLeft = s.end_date ? Math.ceil((new Date(s.end_date) - new Date()) / 86400000) : null;
                  return (
                    <tr key={s.id} style={{ background: i%2===0 ? '#fff' : '#FAFAFA', borderTop:'1px solid #F1F5F9' }}>
                      <td style={{ padding:'10px 14px', fontWeight:600, color:'#0F172A' }}>{s.clinic?.name || '—'}</td>
                      <td style={{ padding:'10px 14px', color:'#64748B' }}>{s.clinic?.city || '—'}</td>
                      <td style={{ padding:'10px 14px' }}><Badge plan={s.plan} /></td>
                      <td style={{ padding:'10px 14px', fontWeight:700, color:'#0D7A87' }}>{fmt(s.price)} Ar</td>
                      <td style={{ padding:'10px 14px', color: daysLeft !== null && daysLeft <= 7 ? '#DC2626' : '#64748B', fontSize:12 }}>
                        {s.end_date ? new Date(s.end_date).toLocaleDateString('fr-FR') : '—'}
                        {daysLeft !== null && daysLeft <= 7 && <span style={{ marginLeft:4, fontWeight:700 }}>({daysLeft}j restants)</span>}
                      </td>
                      <td style={{ padding:'10px 14px' }}>
                        <span style={{ background:'#D1FAE5', color:'#065F46', borderRadius:99, padding:'2px 10px', fontSize:11, fontWeight:700 }}>ACTIF</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: VUE GÉNÉRALE ── */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            {/* Derniers cabinets inscrits */}
            <div style={{ background:'#fff', borderRadius:14, padding:20, border:'1px solid #E2E8F0' }}>
              <p style={{ fontWeight:700, fontSize:14, color:'#0F172A', margin:'0 0 14px' }}>🆕 Derniers cabinets inscrits</p>
              {(data?.allClinics || []).slice(0,5).map(c => (
                <div key={c.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #F8FAFC' }}>
                  <div>
                    <p style={{ margin:0, fontWeight:600, fontSize:13, color:'#0F172A' }}>{c.name}</p>
                    <p style={{ margin:0, fontSize:11, color:'#94A3B8' }}>{c.city} · {c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : ''}</p>
                  </div>
                  <Badge status={c.status} />
                </div>
              ))}
            </div>
            {/* Actions rapides */}
            <div style={{ background:'linear-gradient(135deg,#0D7A87,#0A5F6A)', borderRadius:14, padding:20 }}>
              <p style={{ fontWeight:700, fontSize:14, color:'#fff', margin:'0 0 14px' }}>⚡ Actions rapides</p>
              {[
                { label:'Voir les paiements en attente', count: data?.pendingCount, tab:'payments', urgent: data?.pendingCount > 0 },
                { label:'Gérer les cabinets', count: data?.allClinics?.length, tab:'clinics' },
                { label:'Abonnements actifs', count: data?.activeSubs?.length, tab:'subs' },
              ].map(a => (
                <button key={a.tab} onClick={() => setActiveTab(a.tab)}
                  style={{ width:'100%', padding:'10px 14px', borderRadius:10, background: a.urgent ? '#DC2626' : 'rgba(255,255,255,0.15)', border: a.urgent ? 'none' : '1px solid rgba(255,255,255,0.2)', color:'#fff', fontWeight:600, fontSize:13, cursor:'pointer', marginBottom:8, textAlign:'left', display:'flex', justifyContent:'space-between' }}>
                  <span>{a.label}</span>
                  <span style={{ background:'rgba(255,255,255,0.2)', borderRadius:99, padding:'1px 8px', fontSize:11 }}>{a.count ?? 0}</span>
                </button>
              ))}
              <div style={{ marginTop:16, padding:12, background:'rgba(255,255,255,0.1)', borderRadius:10, border:'1px solid rgba(255,255,255,0.2)' }}>
                <p style={{ margin:0, color:'rgba(255,255,255,0.7)', fontSize:11 }}>Revenus ce mois</p>
                <p style={{ margin:'4px 0 0', color:'#fff', fontWeight:800, fontSize:22, fontFamily:'Plus Jakarta Sans' }}>{fmt(data?.revenueThisMonth)} Ar</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
