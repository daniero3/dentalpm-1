import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Mail, Send, RefreshCw, ShieldCheck, Users, BarChart3, CalendarClock,
  FileText, MessageSquare, CheckCircle2, AlertTriangle, Copy
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const authH = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const C = { teal:'#0D7A87', blue:'#2563EB', green:'#059669', amber:'#D97706', red:'#DC2626', slate:'#64748B' };

const DEFAULT_CONTEXT = {
  cabinet: '[NOM_DU_CABINET]',
  practitioners: '[LISTE_DES_PRATICIENS]',
  agenda: '[EX: Doctolib, Julie, Veasy]',
  esp: '[EX: Brevo, Mailgun, Sendgrid]'
};

const campaignTypes = [
  { key:'RDV_J7', label:'Rappel RDV J-7', desc:'Préparer le patient et réduire les absences.' },
  { key:'RDV_J2', label:'Rappel RDV J-2', desc:'Confirmation active avant rendez-vous.' },
  { key:'RDV_J0', label:'Rappel RDV J-0', desc:'Rappel court le jour même.' },
  { key:'POST_SOIN', label:'Post-soin', desc:'Consignes après soin et prévention des appels inutiles.' },
  { key:'DEVIS_FACTURE', label:'Devis / facture PDF', desc:'Transmission claire de documents administratifs.' },
  { key:'NEWSLETTER', label:'Newsletter mensuelle', desc:'Conseil bucco-dentaire et fidélisation.' },
  { key:'INACTIF_18_MOIS', label:'Relance inactifs 18 mois', desc:'Réactivation douce des patients perdus.' },
  { key:'DETARTRAGE_RADIO', label:'Détartrage / radio bilan', desc:'Rappel annuel de prévention.' }
];

const box = {
  background:'#fff',
  border:'1px solid #E2E8F0',
  borderRadius:14,
  padding:16,
  boxShadow:'0 1px 4px rgba(15,23,42,.04)'
};

const input = {
  width:'100%',
  padding:'10px 12px',
  border:'1.5px solid #E2E8F0',
  borderRadius:10,
  fontSize:13,
  outline:'none',
  boxSizing:'border-box'
};

const DentalMailingSuite = () => {
  const [dashboard, setDashboard] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [segments, setSegments] = useState(null);
  const [conformity, setConformity] = useState(null);
  const [generated, setGenerated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [form, setForm] = useState({
    type:'RDV_J2',
    objective:'Réduire les rendez-vous manqués et améliorer le suivi patient',
    format:'html',
    segment:'Tous les patients éligibles',
    scheduled_at:'',
    context: DEFAULT_CONTEXT
  });

  const selectedType = useMemo(() => campaignTypes.find(t => t.key === form.type) || campaignTypes[0], [form.type]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [dash, camps, segs, conf] = await Promise.all([
        axios.get(`${API}/mailing/suite/dashboard`, authH()),
        axios.get(`${API}/mailing/campaigns?limit=8`, authH()),
        axios.get(`${API}/mailing/suite/segments`, authH()),
        axios.get(`${API}/mailing/suite/conformity`, authH())
      ]);
      setDashboard(dash.data);
      setCampaigns(camps.data.campaigns || []);
      setSegments(segs.data);
      setConformity(conf.data);
    } catch (error) {
      toast.error('Erreur chargement mailing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const generateEmail = async () => {
    try {
      const r = await axios.post(`${API}/mailing/suite/generate-email`, {
        type: form.type,
        context: form.context,
        audience_filter: {}
      }, authH());
      setGenerated(r.data);
      toast.success('Email généré');
    } catch {
      toast.error('Erreur génération email');
    }
  };

  const createCampaign = async () => {
    setCreating(true);
    try {
      const r = await axios.post(`${API}/mailing/suite/quick-campaign`, {
        type: form.type,
        name: `${selectedType.label} - ${new Date().toLocaleDateString('fr-FR')}`,
        scheduled_at: form.scheduled_at || null,
        context: form.context,
        audience_filter: {}
      }, authH());
      setGenerated(r.data.email_package);
      toast.success('Campagne créée');
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur création campagne');
    } finally {
      setCreating(false);
    }
  };

  const sendCampaign = async (campaign) => {
    setSendingId(campaign.id);
    try {
      await axios.post(`${API}/mailing/campaigns/${campaign.id}/send`, {}, authH());
      toast.success('Campagne envoyée');
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur envoi campagne');
    } finally {
      setSendingId(null);
    }
  };

  const setContext = (key, value) => setForm(prev => ({
    ...prev,
    context: { ...prev.context, [key]: value }
  }));

  if (loading) {
    return <div style={{ padding:32, color:C.slate }}>Chargement du système mailing...</div>;
  }

  const kpis = dashboard?.kpis || {};

  return (
    <div style={{ maxWidth:1180, margin:'0 auto', paddingBottom:48 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, marginBottom:20, flexWrap:'wrap' }}>
        <div>
          <h1 style={{ margin:'0 0 4px', fontFamily:'Plus Jakarta Sans', fontSize:24, color:'#0F172A' }}>Marketing email dentaire</h1>
          <p style={{ margin:0, color:C.slate, fontSize:13 }}>Campagnes patients, conformité RGPD/HDS, segmentation et alternative SMS</p>
        </div>
        <button onClick={fetchAll} style={{ ...input, width:'auto', cursor:'pointer', display:'flex', alignItems:'center', gap:8, background:'#fff', fontWeight:700 }}>
          <RefreshCw size={15}/> Actualiser
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))', gap:12, marginBottom:18 }}>
        {[
          { icon:Mail, label:'Campagnes', value:kpis.campaigns_total || 0, color:C.teal },
          { icon:Send, label:'Envoyées', value:kpis.campaigns_sent || 0, color:C.green },
          { icon:Users, label:'Patients éligibles', value:kpis.eligible_patients || 0, color:C.blue },
          { icon:BarChart3, label:'Ouverture', value:kpis.open_rate || '0%', color:C.amber },
          { icon:CalendarClock, label:'Programmées', value:kpis.campaigns_scheduled || 0, color:C.slate }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} style={box}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:`${item.color}15`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={18} color={item.color}/>
                </div>
                <div>
                  <div style={{ fontFamily:'Plus Jakarta Sans', fontSize:20, fontWeight:800, color:'#0F172A' }}>{item.value}</div>
                  <div style={{ fontSize:11, color:C.slate }}>{item.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'minmax(320px, 420px) 1fr', gap:16, alignItems:'start' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={box}>
            <h2 style={{ margin:'0 0 12px', fontSize:16, color:'#0F172A' }}>Nouvelle campagne</h2>
            <label style={{ fontSize:12, fontWeight:700, color:'#475569' }}>Objectif du jour</label>
            <textarea value={form.objective} onChange={e => setForm({ ...form, objective:e.target.value })} rows={2} style={{ ...input, margin:'6px 0 12px', resize:'vertical' }}/>

            <label style={{ fontSize:12, fontWeight:700, color:'#475569' }}>Type de campagne</label>
            <select value={form.type} onChange={e => setForm({ ...form, type:e.target.value })} style={{ ...input, margin:'6px 0 8px' }}>
              {campaignTypes.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <p style={{ margin:'0 0 12px', fontSize:12, color:C.slate }}>{selectedType.desc}</p>

            <label style={{ fontSize:12, fontWeight:700, color:'#475569' }}>Programmation</label>
            <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at:e.target.value })} style={{ ...input, margin:'6px 0 12px' }}/>
            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
              <button onClick={generateEmail} style={{ ...input, cursor:'pointer', background:'#F0FDFE', borderColor:'#7DD3DA', color:C.teal, fontWeight:800 }}>
                Générer l’email
              </button>
              <button onClick={createCampaign} disabled={creating} style={{ ...input, cursor:'pointer', background:C.teal, color:'#fff', borderColor:C.teal, fontWeight:800 }}>
                {creating ? 'Création...' : 'Créer campagne'}
              </button>
            </div>
            <div style={{ background:'#FFFBEB', color:'#92400E', border:'1px solid #FDE68A', borderRadius:10, padding:10, fontSize:12, lineHeight:1.5 }}>
              Règles : maximum 2 emails par mois par patient, envoi entre 8h et 19h, SMS si email non ouvert sous 48h.
            </div>
          </div>

          <div style={box}>
            <h2 style={{ margin:'0 0 12px', fontSize:16, color:'#0F172A' }}>Contexte cabinet</h2>
            {[
              ['cabinet', 'Nom du cabinet'],
              ['practitioners', 'Praticiens'],
              ['agenda', 'Logiciel agenda'],
              ['esp', 'ESP email']
            ].map(([key, label]) => (
              <div key={key} style={{ marginBottom:10 }}>
                <label style={{ fontSize:12, fontWeight:700, color:'#475569' }}>{label}</label>
                <input value={form.context[key]} onChange={e => setContext(key, e.target.value)} style={{ ...input, marginTop:5 }}/>
              </div>
            ))}
          </div>

          <div style={box}>
            <h2 style={{ margin:'0 0 12px', fontSize:16, color:'#0F172A' }}>Segments</h2>
            {(segments?.segments || []).map(seg => (
              <div key={seg.key} style={{ display:'flex', justifyContent:'space-between', gap:10, padding:'9px 0', borderBottom:'1px solid #F1F5F9' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>{seg.label}</div>
                  <div style={{ fontSize:11, color:C.slate }}>{seg.criteria}</div>
                </div>
                <strong style={{ color:C.teal }}>{seg.count}</strong>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={box}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, marginBottom:12 }}>
              <h2 style={{ margin:0, fontSize:16, color:'#0F172A' }}>Email généré</h2>
              {generated?.body_html && (
                <button onClick={() => { navigator.clipboard.writeText(generated.body_html); toast.success('HTML copié'); }} style={{ ...input, width:'auto', cursor:'pointer', fontWeight:700 }}>
                  <Copy size={14}/> Copier HTML
                </button>
              )}
            </div>
            {!generated ? (
              <div style={{ padding:28, textAlign:'center', color:C.slate }}>
                <FileText size={34} style={{ opacity:.35, marginBottom:8 }}/>
                <div>Choisissez un type de campagne puis générez l’email.</div>
              </div>
            ) : (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:10, marginBottom:12 }}>
                  <div style={{ background:'#F8FAFC', borderRadius:10, padding:10 }}>
                    <div style={{ fontSize:11, color:C.slate }}>Objet</div>
                    <div style={{ fontSize:13, fontWeight:800, color:'#0F172A' }}>{generated.subject}</div>
                  </div>
                  <div style={{ background:'#F8FAFC', borderRadius:10, padding:10 }}>
                    <div style={{ fontSize:11, color:C.slate }}>Audience</div>
                    <div style={{ fontSize:13, fontWeight:800, color:'#0F172A' }}>{generated.audience_description}</div>
                  </div>
                  <div style={{ background:'#F8FAFC', borderRadius:10, padding:10 }}>
                    <div style={{ fontSize:11, color:C.slate }}>Destinataires estimés</div>
                    <div style={{ fontSize:13, fontWeight:800, color:'#0F172A' }}>{generated.estimated_recipients ?? '-'}</div>
                  </div>
                </div>
                <iframe
                  title="Aperçu email"
                  sandbox=""
                  srcDoc={generated.body_html}
                  style={{ width:'100%', height:360, border:'1px solid #E2E8F0', borderRadius:12, background:'#fff' }}
                />
                <div style={{ marginTop:12, background:'#F0FDFE', border:'1px solid #BAE6FD', borderRadius:10, padding:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, fontWeight:800, color:C.teal, fontSize:13 }}><MessageSquare size={15}/> Alternative SMS 48h</div>
                  <div style={{ fontSize:12, color:'#475569', marginTop:5 }}>{generated.sms_fallback}</div>
                </div>
              </>
            )}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div style={box}>
              <h2 style={{ margin:'0 0 10px', fontSize:16, color:'#0F172A' }}>Checklist avant envoi</h2>
              {(generated?.checklist || [
                'Objectif de campagne défini',
                'Segment patient validé',
                'Consentement vérifié',
                'Lien de désinscription présent',
                'Plage horaire 8h-19h respectée'
              ]).map(item => (
                <div key={item} style={{ display:'flex', gap:8, alignItems:'flex-start', fontSize:12, color:'#334155', marginBottom:8 }}>
                  <CheckCircle2 size={15} color={C.green} style={{ marginTop:1, flexShrink:0 }}/>{item}
                </div>
              ))}
            </div>

            <div style={box}>
              <h2 style={{ margin:'0 0 10px', fontSize:16, color:'#0F172A' }}>Métriques estimées</h2>
              {[
                ['Ouverture cible', generated?.estimated_metrics?.target_open_rate || '-'],
                ['Clic cible', generated?.estimated_metrics?.target_click_rate || '-'],
                ['Désinscription', generated?.estimated_metrics?.unsubscribe_guardrail || '< 0.5%']
              ].map(([label, value]) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #F1F5F9', fontSize:13 }}>
                  <span style={{ color:C.slate }}>{label}</span>
                  <strong style={{ color:'#0F172A' }}>{value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div style={box}>
            <h2 style={{ margin:'0 0 10px', fontSize:16, color:'#0F172A' }}>Conformité RGPD / HDS</h2>
            <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:10 }}>
              <ShieldCheck size={20} color={conformity?.status === 'BON' ? C.green : C.amber}/>
              <strong style={{ color:'#0F172A' }}>Statut : {conformity?.status || 'A_VERIFIER'}</strong>
              <span style={{ color:C.slate, fontSize:12 }}>Couverture consentement : {conformity?.consent_coverage || '0%'}</span>
            </div>
            {(conformity?.checks || []).map(check => (
              <div key={check.label} style={{ display:'grid', gridTemplateColumns:'170px 110px 1fr', gap:10, padding:'8px 0', borderTop:'1px solid #F8FAFC', fontSize:12 }}>
                <strong>{check.label}</strong>
                <span style={{ color:check.status === 'OK' ? C.green : C.amber }}>{check.status}</span>
                <span style={{ color:C.slate }}>{check.detail}</span>
              </div>
            ))}
          </div>

          <div style={box}>
            <h2 style={{ margin:'0 0 12px', fontSize:16, color:'#0F172A' }}>Campagnes récentes</h2>
            {campaigns.length === 0 ? (
              <div style={{ color:C.slate, fontSize:13 }}>Aucune campagne créée.</div>
            ) : campaigns.map(campaign => (
              <div key={campaign.id} style={{ display:'grid', gridTemplateColumns:'1fr 110px 120px', gap:10, alignItems:'center', padding:'10px 0', borderTop:'1px solid #F1F5F9' }}>
                <div>
                  <div style={{ fontWeight:800, color:'#0F172A', fontSize:13 }}>{campaign.name}</div>
                  <div style={{ color:C.slate, fontSize:12 }}>{campaign.subject}</div>
                </div>
                <span style={{ fontSize:12, color:campaign.status === 'SENT' ? C.green : C.amber, fontWeight:800 }}>{campaign.status}</span>
                <button onClick={() => sendCampaign(campaign)} disabled={campaign.status === 'SENT' || sendingId === campaign.id} style={{ ...input, cursor:'pointer', background:campaign.status === 'SENT' ? '#F1F5F9' : C.teal, color:campaign.status === 'SENT' ? C.slate : '#fff', borderColor:'transparent', fontWeight:800 }}>
                  {sendingId === campaign.id ? 'Envoi...' : campaign.status === 'SENT' ? 'Envoyée' : 'Envoyer'}
                </button>
              </div>
            ))}
          </div>

          <div style={{ ...box, background:'#FFF7ED', borderColor:'#FED7AA', color:'#9A3412' }}>
            <div style={{ display:'flex', gap:8, alignItems:'flex-start', fontSize:12, lineHeight:1.5 }}>
              <AlertTriangle size={16} style={{ flexShrink:0, marginTop:1 }}/>
              <div>Contenu médical : les emails post-soin doivent rester généraux, éviter les diagnostics détaillés et inviter le patient à contacter le cabinet en cas de symptôme inhabituel.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DentalMailingSuite;
