import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { BarChart3, RefreshCw, TrendingUp, TrendingDown, DollarSign, AlertCircle, CheckCircle, PieChart, Calendar, Download } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API  = `${BACKEND_URL}/api`;
const authH = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const fmt  = v => new Intl.NumberFormat('fr-MG',{maximumFractionDigits:0}).format(v||0) + ' Ar';
const fdate = d => new Date(d).toLocaleDateString('fr-FR');

const METHODS = {
  CASH:'Espèces', BANK_TRANSFER:'Virement', CHEQUE:'Chèque',
  MVOLA:'MVola', ORANGE_MONEY:'Orange Money', AIRTEL_MONEY:'Airtel Money', CARD:'Carte'
};
const MCOLORS = {
  CASH:'#10B981', BANK_TRANSFER:'#3B82F6', CHEQUE:'#F59E0B',
  MVOLA:'#EF4444', ORANGE_MONEY:'#F97316', AIRTEL_MONEY:'#EC4899', CARD:'#8B5CF6'
};

const inp = { padding:'9px 12px',borderRadius:10,border:'1.5px solid #E2E8F0',fontSize:13,fontFamily:'inherit',outline:'none',transition:'border-color .2s' };
const fi  = e=>e.target.style.borderColor='#0D7A87', bi=e=>e.target.style.borderColor='#E2E8F0';

const ReportsManagement = () => {
  const [report,   setReport]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [fromDate, setFromDate] = useState(() => `${new Date().getFullYear()}-01-01`);
  const [toDate,   setToDate]   = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => { fetchReport(fromDate, toDate); }, []); // eslint-disable-line

  const fetchReport = async (from = fromDate, to = toDate) => {
    setLoading(true);
    setError(null);
    try {
      const r = await axios.get(`${API}/reports/finance?from=${from}&to=${to}`, authH());
      if (r.data) { setReport(r.data); setError(null); }
      else setError('Réponse vide du serveur');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.details || err.message || 'Erreur inconnue';
      console.error('Reports error:', msg, err.response?.status);
      setError(msg);
      setReport(null);
      toast.error(`Rapport : ${msg}`);
    }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:240 }}>
      <div style={{ width:36,height:36,border:'4px solid #E2E8F0',borderTopColor:'#3B82F6',borderRadius:'50%',animation:'spin .8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!report) return (
    <div style={{ maxWidth: 1100,margin:'0 auto',paddingBottom:48 }}>
      <div style={{ background:'#FEF2F2',borderRadius:14,border:'1px solid #FECACA',padding:'24px',textAlign:'center',marginTop:40 }}>
        <div style={{ fontSize:32,marginBottom:12 }}>⚠️</div>
        <div style={{ fontFamily:'Plus Jakarta Sans',fontWeight:700,fontSize:16,color:'#991B1B',marginBottom:8 }}>Rapport non disponible</div>
        <div style={{ fontSize:13,color:'#B91C1C',marginBottom:16 }}>Impossible de charger le rapport financier. Vérifiez votre connexion.</div>
        <button onClick={()=>fetchReport(fromDate, toDate)}
          style={{ padding:'9px 20px',borderRadius:10,background:'#DC2626',color:'#fff',border:'none',cursor:'pointer',fontSize:13,fontWeight:700 }}>
          Réessayer
        </button>
      </div>
    </div>
  );

  const breakdown = report?.breakdown_by_method || {};
  const totalMethod = Object.values(breakdown).reduce((s,d)=>s+(d.total_mga||0),0);

  return (
    <div style={{ maxWidth: 1100,margin:'0 auto',paddingBottom:48 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.rep-anim{animation:fadeUp .3s ease both}`}</style>

      {/* Header */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22,flexWrap:'wrap',gap:12 }}>
        <div style={{ display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ width:44,height:44,borderRadius:13,background:'linear-gradient(135deg,#3B4FD8,#6366F1)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 14px rgba(59,79,216,.3)' }}>
            <BarChart3 size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{ fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:22,color:'#0F172A',margin:0 }}>Rapports financiers</h1>
            <p style={{ color:'#64748B',fontSize:13,margin:0 }}>Analyse des recettes, dépenses et résultat net</p>
          </div>
        </div>
      </div>

      {/* Filtres date */}
      <div style={{ background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',padding:'14px 18px',marginBottom:20,display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-end' }}>
        <div>
          <label style={{ fontSize:11,fontWeight:600,color:'#64748B',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em' }}>Du</label>
          <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} style={inp} onFocus={fi} onBlur={bi}/>
        </div>
        <div>
          <label style={{ fontSize:11,fontWeight:600,color:'#64748B',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em' }}>Au</label>
          <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} style={inp} onFocus={fi} onBlur={bi}/>
        </div>
        <button onClick={()=>fetchReport(fromDate, toDate)}
          style={{ padding:'9px 18px',borderRadius:10,background:'linear-gradient(135deg,#3B4FD8,#6366F1)',color:'#fff',border:'none',cursor:'pointer',fontSize:13,fontWeight:700,display:'flex',alignItems:'center',gap:6,boxShadow:'0 4px 12px rgba(59,79,216,.25)' }}>
          <RefreshCw size={14}/>Actualiser
        </button>
      </div>

      {report&&(
        <>
          {/* KPIs principaux */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:20 }}>
            {[
              {icon:'💰',l:'Total facturé',   v:fmt(report.totals?.invoiced_mga),  c:'#3B82F6', bg:'#EFF6FF', raw:true},
              {icon:'✅',l:'Total encaissé',  v:fmt(report.totals?.paid_mga),       c:'#10B981', bg:'#DCFCE7', raw:true},
              {icon:'⏳',l:'Solde impayé',    v:fmt(report.totals?.balance_mga),    c:'#EF4444', bg:'#FEE2E2', raw:true},
              {icon:'💸',l:'Dépenses cabinet', v:fmt(report.totals?.expenses_mga), c:'#EF4444', bg:'#FEE2E2', raw:true},
              {icon:'📈',l:'Résultat net',     v:fmt(report.totals?.net_result_mga), c:(report.totals?.net_result_mga||0)>=0?'#059669':'#DC2626', bg:(report.totals?.net_result_mga||0)>=0?'#D1FAE5':'#FEE2E2', raw:true},
              {icon:'📊',l:'Taux recouvrement',v:`${report.stats?.collection_rate||0}%`, c:'#7C3AED', bg:'#EDE9FE', raw:true},
            ].map((k,i)=>(
              <div key={i} className="rep-anim" style={{ background:'#fff',borderRadius:14,border:'1px solid #E2E8F0',padding:'16px 18px',display:'flex',alignItems:'center',gap:12,animationDelay:`${i*.06}s` }}>
                <div style={{ width:40,height:40,borderRadius:11,background:k.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>{k.icon}</div>
                <div>
                  <div style={{ fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:16,color:'#0F172A',lineHeight:1 }}>{k.v}</div>
                  <div style={{ fontSize:11,color:'#64748B',marginTop:3 }}>{k.l}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats secondaires */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:10,marginBottom:20 }}>
            {[
              {l:'Factures',       v:report.stats?.invoice_count||0,    c:'#3B82F6', bg:'#EFF6FF'},
              {l:'Paiements',      v:report.stats?.payment_count||0,    c:'#10B981', bg:'#DCFCE7'},
              {l:'Achats',         v:report.stats?.purchase_count||0,    c:'#7C3AED', bg:'#EDE9FE'},
              {l:'Impayées',       v:report.stats?.unpaid_count||0,     c:'#EF4444', bg:'#FEE2E2'},
              {l:'Soldées',        v:report.stats?.fully_paid_count||0, c:'#059669', bg:'#D1FAE5'},
            ].map((k,i)=>(
              <div key={i} style={{ background:k.bg,borderRadius:12,padding:'14px',textAlign:'center',border:`1px solid ${k.c}20` }}>
                <div style={{ fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:26,color:k.c }}>{k.v}</div>
                <div style={{ fontSize:12,color:k.c,marginTop:2,fontWeight:600 }}>{k.l}</div>
              </div>
            ))}
          </div>

          {/* Répartition paiements + Factures impayées */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>

            {/* Méthodes de paiement */}
            <div style={{ background:'#fff',borderRadius:16,border:'1px solid #E2E8F0',padding:'18px 20px' }}>
              <div style={{ fontSize:14,fontWeight:700,color:'#0F172A',marginBottom:16,display:'flex',alignItems:'center',gap:7 }}>
                <PieChart size={16} color="#3B82F6"/> Répartition par méthode
              </div>
              {Object.keys(breakdown).length===0?(
                <div style={{ textAlign:'center',padding:'24px',color:'#94A3B8' }}>Aucune donnée</div>
              ):(
                <>
                  {/* Barre de répartition */}
                  <div style={{ height:12,borderRadius:99,overflow:'hidden',display:'flex',marginBottom:16 }}>
                    {Object.entries(breakdown).map(([m,d])=>(
                      <div key={m} style={{ flex:(d.total_mga||0)/totalMethod*100+'%',background:MCOLORS[m]||'#6B7280',minWidth:2 }}/>
                    ))}
                  </div>
                  <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                    {Object.entries(breakdown).map(([m,d])=>(
                      <div key={m} style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                          <div style={{ width:10,height:10,borderRadius:2,background:MCOLORS[m]||'#6B7280',flexShrink:0 }}/>
                          <span style={{ fontSize:13,color:'#0F172A' }}>{METHODS[m]||m}</span>
                          <span style={{ fontSize:11,color:'#94A3B8' }}>({d.count||0})</span>
                        </div>
                        <span style={{ fontFamily:'Plus Jakarta Sans',fontWeight:700,fontSize:13,color:'#0F172A' }}>{fmt(d.total_mga)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Top factures impayées */}
            <div style={{ background:'#fff',borderRadius:16,border:'1px solid #E2E8F0',padding:'18px 20px' }}>
              <div style={{ fontSize:14,fontWeight:700,color:'#0F172A',marginBottom:16,display:'flex',alignItems:'center',gap:7 }}>
                <AlertCircle size={16} color="#EF4444"/> Factures impayées ({report.top_unpaid_invoices?.length||0})
              </div>
              {!report.top_unpaid_invoices?.length?(
                <div style={{ textAlign:'center',padding:'24px' }}>
                  <div style={{ fontSize:36,marginBottom:8 }}>🎉</div>
                  <p style={{ color:'#10B981',fontWeight:600,fontSize:14,margin:0 }}>Aucune facture impayée</p>
                </div>
              ):(
                <div style={{ display:'flex',flexDirection:'column',gap:8,maxHeight:260,overflowY:'auto' }}>
                  {report.top_unpaid_invoices.map((inv,i)=>(
                    <div key={inv.id} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 12px',background:i%2===0?'#FFF5F5':'#FFF',borderRadius:10,border:'1px solid #FECACA' }}>
                      <div>
                        <div style={{ fontSize:13,fontWeight:700,color:'#0F172A' }}>{inv.invoice_number}</div>
                        <div style={{ fontSize:11,color:'#64748B' }}>{inv.patient_name} · {fdate(inv.created_at)}</div>
                      </div>
                      <span style={{ fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:14,color:'#EF4444' }}>{fmt(inv.remaining_mga)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dépenses cabinet */}
          <div style={{ background:'#fff',borderRadius:16,border:'1px solid #E2E8F0',padding:'18px 20px',marginTop:16 }}>
            <div style={{ fontSize:14,fontWeight:700,color:'#0F172A',marginBottom:16,display:'flex',alignItems:'center',gap:7 }}>
              <TrendingDown size={16} color="#EF4444"/> Dépenses du cabinet ({report.expenses?.length||0})
            </div>
            {!report.expenses?.length?(
              <div style={{ textAlign:'center',padding:'22px',color:'#94A3B8' }}>Aucune dépense sur la période</div>
            ):(
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:8 }}>
                {report.expenses.map(exp=>(
                  <div key={exp.id} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',background:'#FFF5F5',borderRadius:10,border:'1px solid #FECACA',gap:10 }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:13,fontWeight:700,color:'#0F172A' }}>{exp.number}</div>
                      <div style={{ fontSize:11,color:'#64748B',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{exp.supplier_name} · {fdate(exp.created_at)} · {exp.status}</div>
                    </div>
                    <span style={{ fontFamily:'Plus Jakarta Sans',fontWeight:800,fontSize:13,color:'#EF4444',whiteSpace:'nowrap' }}>{fmt(exp.total_mga)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsManagement;
