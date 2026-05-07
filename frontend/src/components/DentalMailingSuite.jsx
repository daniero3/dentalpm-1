import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Copy,
  FileText,
  Mail,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Users
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const authH = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const C = {
  teal: '#0D7A87',
  blue: '#2563EB',
  green: '#059669',
  amber: '#D97706',
  red: '#DC2626',
  slate: '#64748B'
};

const DEFAULT_CONTEXT = {
  cabinet: '[NOM_DU_CABINET]',
  practitioners: '[LISTE_DES_PRATICIENS]',
  agenda: '[EX: Doctolib, Julie, Veasy]',
  esp: '[EX: Brevo, Mailgun, Sendgrid]'
};

const campaignTypes = [
  { key: 'RDV_J7', label: 'Rappel J-7', desc: 'Préparer le rendez-vous sans pression.', tone: 'Prévention' },
  { key: 'RDV_J2', label: 'Rappel J-2', desc: 'Confirmer la présence et réduire les absences.', tone: 'Confirmation' },
  { key: 'RDV_J0', label: 'Rappel jour J', desc: 'Rappel court le jour même.', tone: 'Court' },
  { key: 'POST_SOIN', label: 'Post-soin', desc: 'Envoyer des consignes claires après le soin.', tone: 'Suivi' },
  { key: 'DEVIS_FACTURE', label: 'Devis / facture', desc: 'Transmettre un document avec un message simple.', tone: 'Admin' },
  { key: 'NEWSLETTER', label: 'Newsletter', desc: 'Partager un conseil bucco-dentaire mensuel.', tone: 'Conseil' },
  { key: 'INACTIF_18_MOIS', label: 'Patients inactifs', desc: 'Relancer les patients sans RDV depuis 18 mois.', tone: 'Relance' },
  { key: 'DETARTRAGE_RADIO', label: 'Détartrage / bilan', desc: 'Rappeler le suivi annuel de prévention.', tone: 'Prévention' }
];

const box = {
  background: '#fff',
  border: '1px solid #E2E8F0',
  borderRadius: 14,
  padding: 18,
  boxShadow: '0 1px 4px rgba(15,23,42,.04)'
};

const input = {
  width: '100%',
  padding: '11px 12px',
  border: '1.5px solid #E2E8F0',
  borderRadius: 10,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box'
};

const button = {
  ...input,
  cursor: 'pointer',
  fontWeight: 800,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8
};

const StepTitle = ({ number, title, subtitle }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
    <span style={{
      width: 26,
      height: 26,
      borderRadius: 8,
      background: '#E6FFFB',
      color: C.teal,
      fontWeight: 900,
      fontSize: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }}>
      {number}
    </span>
    <div>
      <h2 style={{ margin: 0, fontSize: 16, color: '#0F172A' }}>{title}</h2>
      {subtitle && <p style={{ margin: '3px 0 0', color: C.slate, fontSize: 12 }}>{subtitle}</p>}
    </div>
  </div>
);

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
    type: 'RDV_J2',
    objective: 'Réduire les rendez-vous manqués et améliorer le suivi patient',
    format: 'html',
    segment: 'Tous les patients éligibles',
    scheduled_at: '',
    context: DEFAULT_CONTEXT
  });

  const selectedType = useMemo(
    () => campaignTypes.find((type) => type.key === form.type) || campaignTypes[0],
    [form.type]
  );

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [dash, camps, segs, conf] = await Promise.all([
        axios.get(`${API}/mailing/suite/dashboard`, authH()),
        axios.get(`${API}/mailing/campaigns?limit=6`, authH()),
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
      const response = await axios.post(`${API}/mailing/suite/generate-email`, {
        type: form.type,
        context: form.context,
        audience_filter: {}
      }, authH());
      setGenerated(response.data);
      toast.success('Email généré');
    } catch {
      toast.error('Erreur génération email');
    }
  };

  const createCampaign = async () => {
    setCreating(true);
    try {
      const response = await axios.post(`${API}/mailing/suite/quick-campaign`, {
        type: form.type,
        name: `${selectedType.label} - ${new Date().toLocaleDateString('fr-FR')}`,
        scheduled_at: form.scheduled_at || null,
        context: form.context,
        audience_filter: {}
      }, authH());
      setGenerated(response.data.email_package);
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

  const setContext = (key, value) => setForm((prev) => ({
    ...prev,
    context: { ...prev.context, [key]: value }
  }));

  if (loading) {
    return <div style={{ padding: 32, color: C.slate }}>Chargement du système mailing...</div>;
  }

  const kpis = dashboard?.kpis || {};
  const consentOk = conformity?.status === 'BON';
  const coreChecks = generated?.checklist?.slice(0, 5) || [
    'Objectif de campagne défini',
    'Segment patient validé',
    'Consentement vérifié',
    'Lien de désinscription présent',
    'Plage horaire 8h-19h respectée'
  ];

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', paddingBottom: 48 }}>
      <style>{`
        .mailing-main-grid {
          display: grid;
          grid-template-columns: minmax(330px, 420px) minmax(0, 1fr);
          gap: 16px;
          align-items: start;
        }
        .mailing-type-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .mailing-footer-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 16px;
        }
        @media (max-width: 900px) {
          .mailing-main-grid,
          .mailing-footer-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 560px) {
          .mailing-type-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontFamily: 'Plus Jakarta Sans', fontSize: 24, color: '#0F172A' }}>
            Gestion mailing
          </h1>
          <p style={{ margin: 0, color: C.slate, fontSize: 13 }}>
            Créez une campagne patient en 3 étapes, avec conformité et SMS de secours intégrés.
          </p>
        </div>
        <button onClick={fetchAll} style={{ ...button, width: 'auto', background: '#fff', color: '#0F172A' }}>
          <RefreshCw size={15} /> Actualiser
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 18 }}>
        {[
          { icon: Users, label: 'Patients éligibles', value: kpis.eligible_patients || 0, color: C.blue },
          { icon: Send, label: 'Campagnes envoyées', value: kpis.campaigns_sent || 0, color: C.green },
          { icon: BarChart3, label: 'Ouverture cible', value: kpis.open_rate || '0%', color: C.amber },
          { icon: CalendarClock, label: 'Programmées', value: kpis.campaigns_scheduled || 0, color: C.slate }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} style={box}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `${item.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={18} color={item.color} />
                </span>
                <div>
                  <div style={{ fontFamily: 'Plus Jakarta Sans', fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
                    {item.value}
                  </div>
                  <div style={{ fontSize: 11, color: C.slate }}>{item.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mailing-main-grid">
        <section style={box}>
          <StepTitle number="1" title="Choisir une campagne" subtitle="Sélectionnez l’action utile aujourd’hui." />
          <div className="mailing-type-grid">
            {campaignTypes.map((type) => {
              const active = form.type === type.key;
              return (
                <button
                  key={type.key}
                  onClick={() => setForm((prev) => ({ ...prev, type: type.key }))}
                  style={{
                    border: `1.5px solid ${active ? C.teal : '#E2E8F0'}`,
                    background: active ? '#F0FDFE' : '#fff',
                    borderRadius: 12,
                    padding: 12,
                    cursor: 'pointer',
                    textAlign: 'left',
                    minHeight: 96
                  }}
                >
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: active ? C.teal : C.slate, marginBottom: 5 }}>
                    {type.tone}
                  </span>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 900, color: '#0F172A', marginBottom: 5 }}>
                    {type.label}
                  </span>
                  <span style={{ display: 'block', fontSize: 12, color: C.slate, lineHeight: 1.35 }}>
                    {type.desc}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ height: 22 }} />
          <StepTitle number="2" title="Préparer" subtitle="Les informations essentielles avant génération." />

          <label style={{ fontSize: 12, fontWeight: 800, color: '#475569' }}>Objectif</label>
          <textarea
            value={form.objective}
            onChange={(event) => setForm({ ...form, objective: event.target.value })}
            rows={3}
            style={{ ...input, margin: '6px 0 12px', resize: 'vertical' }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 800, color: '#475569' }}>Segment</label>
              <input
                value={form.segment}
                onChange={(event) => setForm({ ...form, segment: event.target.value })}
                style={{ ...input, marginTop: 6 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 800, color: '#475569' }}>Envoi programmé</label>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(event) => setForm({ ...form, scheduled_at: event.target.value })}
                style={{ ...input, marginTop: 6 }}
              />
            </div>
          </div>

          <details style={{ borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9', padding: '12px 0', marginBottom: 14 }}>
            <summary style={{ cursor: 'pointer', color: '#0F172A', fontWeight: 900, fontSize: 13 }}>
              Paramètres cabinet
            </summary>
            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
              {[
                ['cabinet', 'Nom du cabinet'],
                ['practitioners', 'Praticiens'],
                ['agenda', 'Logiciel agenda'],
                ['esp', 'ESP email']
              ].map(([key, label]) => (
                <div key={key}>
                  <label style={{ fontSize: 12, fontWeight: 800, color: '#475569' }}>{label}</label>
                  <input value={form.context[key]} onChange={(event) => setContext(key, event.target.value)} style={{ ...input, marginTop: 5 }} />
                </div>
              ))}
            </div>
          </details>

          <StepTitle number="3" title="Générer et valider" subtitle="Créez le brouillon après contrôle rapide." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
            <button onClick={generateEmail} style={{ ...button, background: '#F0FDFE', borderColor: '#7DD3DA', color: C.teal }}>
              <Sparkles size={16} /> Générer
            </button>
            <button onClick={createCampaign} disabled={creating} style={{ ...button, background: C.teal, color: '#fff', borderColor: C.teal }}>
              <Mail size={16} /> {creating ? 'Création...' : 'Créer brouillon'}
            </button>
          </div>

          <div style={{ marginTop: 14, color: '#92400E', borderTop: '1px solid #FDE68A', paddingTop: 12, fontSize: 12, lineHeight: 1.5 }}>
            Maximum 2 emails par mois par patient. Envoi autorisé entre 8h et 19h. SMS proposé si l’email n’est pas ouvert sous 48h.
          </div>
        </section>

        <section style={box}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, color: '#0F172A' }}>Aperçu & validation</h2>
              <p style={{ margin: '4px 0 0', color: C.slate, fontSize: 12 }}>{selectedType.label} · {form.segment}</p>
            </div>
            {generated?.body_html && (
              <button
                onClick={() => { navigator.clipboard.writeText(generated.body_html); toast.success('HTML copié'); }}
                style={{ ...button, width: 'auto', background: '#fff', color: '#0F172A' }}
              >
                <Copy size={14} /> Copier HTML
              </button>
            )}
          </div>

          {!generated ? (
            <div style={{ minHeight: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: C.slate }}>
              <div>
                <FileText size={42} style={{ opacity: 0.35, marginBottom: 10 }} />
                <div style={{ fontWeight: 800, color: '#334155', marginBottom: 4 }}>Aucun email généré</div>
                <div style={{ fontSize: 13 }}>Choisissez une campagne puis cliquez sur Générer.</div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9', padding: '12px 0', marginBottom: 12 }}>
                {[
                  ['Objet', generated.subject],
                  ['Audience', generated.audience_description],
                  ['Destinataires estimés', generated.estimated_recipients ?? '-']
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 10, padding: '5px 0', fontSize: 13 }}>
                    <span style={{ color: C.slate }}>{label}</span>
                    <strong style={{ color: '#0F172A' }}>{value}</strong>
                  </div>
                ))}
              </div>

              <iframe
                title="Aperçu email"
                sandbox=""
                srcDoc={generated.body_html}
                style={{ width: '100%', height: 340, border: '1px solid #E2E8F0', borderRadius: 12, background: '#fff' }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginTop: 14 }}>
                <div>
                  <h3 style={{ margin: '0 0 9px', fontSize: 14, color: '#0F172A' }}>Checklist</h3>
                  {coreChecks.map((item) => (
                    <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: '#334155', marginBottom: 8 }}>
                      <CheckCircle2 size={15} color={C.green} style={{ marginTop: 1, flexShrink: 0 }} />{item}
                    </div>
                  ))}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 9px', fontSize: 14, color: '#0F172A' }}>Métriques estimées</h3>
                  {[
                    ['Ouverture cible', generated?.estimated_metrics?.target_open_rate || '-'],
                    ['Clic cible', generated?.estimated_metrics?.target_click_rate || '-'],
                    ['Désinscription', generated?.estimated_metrics?.unsubscribe_guardrail || '< 0.5%']
                  ].map(([label, value]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid #F1F5F9', fontSize: 13 }}>
                      <span style={{ color: C.slate }}>{label}</span>
                      <strong style={{ color: '#0F172A' }}>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 14, borderTop: '1px solid #BAE6FD', paddingTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 900, color: C.teal, fontSize: 13 }}>
                  <MessageSquare size={15} /> SMS si non ouvert sous 48h
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 5, lineHeight: 1.45 }}>{generated.sms_fallback}</div>
              </div>
            </>
          )}
        </section>
      </div>

      <div className="mailing-footer-grid">
        <section style={box}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16, color: '#0F172A' }}>Base patients</h2>
          {(segments?.segments || []).slice(0, 5).map((segment) => (
            <div key={segment.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '9px 0', borderTop: '1px solid #F1F5F9' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{segment.label}</div>
                <div style={{ fontSize: 11, color: C.slate }}>{segment.criteria}</div>
              </div>
              <strong style={{ color: C.teal }}>{segment.count}</strong>
            </div>
          ))}
        </section>

        <section style={box}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16, color: '#0F172A' }}>Conformité</h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
            <ShieldCheck size={21} color={consentOk ? C.green : C.amber} />
            <div>
              <div style={{ fontWeight: 900, color: '#0F172A' }}>{conformity?.status || 'A_VERIFIER'}</div>
              <div style={{ color: C.slate, fontSize: 12 }}>Consentements : {conformity?.consent_coverage || '0%'}</div>
            </div>
          </div>
          {(conformity?.checks || []).slice(0, 4).map((check) => (
            <div key={check.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderTop: '1px solid #F1F5F9', fontSize: 12 }}>
              <span style={{ color: '#334155', fontWeight: 700 }}>{check.label}</span>
              <span style={{ color: check.status === 'OK' ? C.green : C.amber, fontWeight: 900 }}>{check.status}</span>
            </div>
          ))}
        </section>

        <section style={box}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16, color: '#0F172A' }}>Campagnes récentes</h2>
          {campaigns.length === 0 ? (
            <div style={{ color: C.slate, fontSize: 13 }}>Aucune campagne créée.</div>
          ) : campaigns.slice(0, 4).map((campaign) => (
            <div key={campaign.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', padding: '10px 0', borderTop: '1px solid #F1F5F9' }}>
              <div>
                <div style={{ fontWeight: 900, color: '#0F172A', fontSize: 13 }}>{campaign.name}</div>
                <div style={{ color: C.slate, fontSize: 12 }}>{campaign.status}</div>
              </div>
              <button
                onClick={() => sendCampaign(campaign)}
                disabled={campaign.status === 'SENT' || sendingId === campaign.id}
                style={{
                  ...button,
                  width: 42,
                  height: 38,
                  padding: 0,
                  background: campaign.status === 'SENT' ? '#F1F5F9' : C.teal,
                  color: campaign.status === 'SENT' ? C.slate : '#fff',
                  borderColor: 'transparent'
                }}
                title={campaign.status === 'SENT' ? 'Déjà envoyée' : 'Envoyer'}
              >
                {sendingId === campaign.id ? <RefreshCw size={15} /> : <ChevronRight size={17} />}
              </button>
            </div>
          ))}
        </section>
      </div>

      <div style={{ marginTop: 16, ...box, background: '#FFF7ED', borderColor: '#FED7AA', color: '#9A3412' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, lineHeight: 1.5 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            Contenu médical : les emails post-soin restent généraux, sans diagnostic détaillé, et invitent le patient à contacter le cabinet en cas de symptôme inhabituel.
          </div>
        </div>
      </div>
    </div>
  );
};

export default DentalMailingSuite;
