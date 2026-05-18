import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Bot, Send, X, MessageCircle, Minimize2, ArrowRight, Search, HelpCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const theme = {
  accent: 'var(--accent-primary)',
  accentHover: 'var(--accent-hover)',
  bgSurface: 'var(--bg-surface)',
  bgElevated: 'var(--bg-elevated)',
  border: 'var(--border-subtle)',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-muted)',
  shadow: 'var(--shadow-lg)',
};

const HELP_TOPICS = [
  {
    id: 'patients',
    title: 'Créer ou retrouver un patient',
    keywords: ['patient', 'dossier', 'fiche', 'rechercher', 'ajouter'],
    route: '/patients',
    answer: [
      'Ouvrez le module Patients.',
      'Utilisez la recherche pour retrouver un dossier existant.',
      'Pour un nouveau patient, cliquez sur l’action de création puis complétez les informations obligatoires.',
    ],
  },
  {
    id: 'appointments',
    title: 'Planifier un rendez-vous',
    keywords: ['rdv', 'rendez-vous', 'agenda', 'calendrier', 'appointment'],
    route: '/appointments',
    answer: [
      'Allez dans Rendez-vous.',
      'Choisissez la date, le patient et le praticien.',
      'Vérifiez le statut du rendez-vous avant d’enregistrer.',
    ],
  },
  {
    id: 'pricing',
    title: 'Gérer les tarifs des actes',
    keywords: ['tarif', 'acte', 'grille', 'prix', 'maeva', 'pricing'],
    route: '/settings/pricing',
    answer: [
      'Ouvrez Paramètres puis Tarifs des actes.',
      'Sélectionnez une grille, puis ajoutez, modifiez ou importez les actes.',
      'Si la grille ne charge pas, vérifiez votre session puis rechargez la page.',
    ],
  },
  {
    id: 'invoices',
    title: 'Créer une facture',
    keywords: ['facture', 'paiement', 'invoice', 'encaissement'],
    route: '/invoices',
    answer: [
      'Ouvrez Factures.',
      'Sélectionnez le patient et ajoutez les actes à facturer.',
      'Contrôlez le montant total puis enregistrez la facture.',
    ],
  },
  {
    id: 'quotes',
    title: 'Créer un devis',
    keywords: ['devis', 'quote', 'estimation', 'proposition'],
    route: '/quotes',
    answer: [
      'Ouvrez Devis.',
      'Ajoutez les actes prévus et leurs tarifs.',
      'Une fois accepté, le devis peut servir de base à la facturation.',
    ],
  },
  {
    id: 'inventory',
    title: 'Suivre le stock',
    keywords: ['stock', 'inventaire', 'produit', 'seuil', 'inventory'],
    route: '/inventory',
    answer: [
      'Ouvrez Stock.',
      'Surveillez les quantités et les seuils d’alerte.',
      'Mettez à jour les entrées et sorties pour garder un inventaire fiable.',
    ],
  },
  {
    id: 'subscription',
    title: 'Gérer l’abonnement',
    keywords: ['abonnement', 'plan', 'paiement', 'licence', 'subscription'],
    route: '/subscription',
    answer: [
      'Ouvrez Abonnement.',
      'Vérifiez le plan actif, le statut et les options disponibles.',
      'Si l’accès est bloqué, vérifiez le statut de paiement ou contactez l’administrateur.',
    ],
  },
  {
    id: 'settings',
    title: 'Modifier mon profil ou les utilisateurs',
    keywords: ['profil', 'mot de passe', 'utilisateur', 'paramètre', 'cabinet'],
    route: '/settings',
    answer: [
      'Ouvrez Paramètres.',
      'Utilisez Mon profil pour vos informations personnelles.',
      'Les administrateurs peuvent aussi gérer les utilisateurs du cabinet.',
    ],
  },
];

const getContextTopic = (pathname) => {
  if (pathname.startsWith('/patients')) return HELP_TOPICS[0];
  if (pathname.startsWith('/appointments')) return HELP_TOPICS[1];
  if (pathname.startsWith('/settings/pricing')) return HELP_TOPICS[2];
  if (pathname.startsWith('/invoices')) return HELP_TOPICS[3];
  if (pathname.startsWith('/quotes')) return HELP_TOPICS[4];
  if (pathname.startsWith('/inventory')) return HELP_TOPICS[5];
  if (pathname.startsWith('/subscription')) return HELP_TOPICS[6];
  if (pathname.startsWith('/settings')) return HELP_TOPICS[7];
  return null;
};

const normalize = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const findTopic = (message) => {
  const query = normalize(message);
  if (!query) return null;
  return HELP_TOPICS.find(topic =>
    normalize(topic.title).includes(query) ||
    topic.keywords.some(keyword => query.includes(normalize(keyword)))
  );
};

const createBotMessage = (topic) => ({
  role: 'bot',
  text: topic
    ? `Voici comment faire :\n${topic.answer.map((item, index) => `${index + 1}. ${item}`).join('\n')}`
    : 'Je peux vous aider sur les patients, rendez-vous, devis, factures, tarifs des actes, stock, abonnement et paramètres.',
  topic,
});

export default function HelpChatbot() {
  const navigate = useNavigate();
  const location = useLocation();
  const scrollRef = useRef(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(() => [
    {
      role: 'bot',
      text: 'Bonjour. Dites-moi ce que vous voulez faire dans DentalPM, ou choisissez un sujet ci-dessous.',
    },
  ]);

  const contextTopic = useMemo(() => getContextTopic(location.pathname), [location.pathname]);
  const suggestedTopics = useMemo(() => {
    const base = contextTopic
      ? [contextTopic, ...HELP_TOPICS.filter(topic => topic.id !== contextTopic.id)]
      : HELP_TOPICS;
    return base.slice(0, 4);
  }, [contextTopic]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    const updateSize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const sendTopic = (topic) => {
    setMessages(prev => [
      ...prev,
      { role: 'user', text: topic.title },
      createBotMessage(topic),
    ]);
    setOpen(true);
  };

  const sendMessage = (event) => {
    event?.preventDefault();
    const clean = message.trim();
    if (!clean) return;
    const topic = findTopic(clean);
    setMessages(prev => [
      ...prev,
      { role: 'user', text: clean },
      createBotMessage(topic),
    ]);
    setMessage('');
  };

  const goToTopic = (topic) => {
    if (!topic?.route) return;
    navigate(topic.route);
    setOpen(false);
  };

  return (
    <div style={{
      position: 'fixed',
      right: isMobile ? 12 : 18,
      bottom: isMobile ? 84 : 18,
      zIndex: 80,
      fontFamily: 'var(--font-sans)',
      pointerEvents: 'none',
    }}>
      {open && (
        <section style={{
          width: 'min(380px, calc(100vw - 24px))',
          height: 'min(560px, calc(100vh - 96px))',
          background: theme.bgSurface,
          border: `1px solid ${theme.border}`,
          borderRadius: 14,
          boxShadow: theme.shadow,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          marginBottom: 12,
          pointerEvents: 'auto',
        }}>
          <header style={{
            padding: '13px 14px',
            borderBottom: `1px solid ${theme.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: theme.bgElevated,
          }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              display: 'grid',
              placeItems: 'center',
              background: theme.accent,
              color: '#fff',
              flexShrink: 0,
            }}>
              <Bot size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: theme.textPrimary }}>Assistant DentalPM</div>
              <div style={{ fontSize: 12, color: theme.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Aide rapide et orientation dans la plateforme
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Réduire l'assistant"
              style={{ border: 0, background: 'transparent', color: theme.textSecondary, cursor: 'pointer', padding: 6 }}>
              <Minimize2 size={17} />
            </button>
            <button type="button" onClick={() => setMessages([{ role: 'bot', text: 'Conversation réinitialisée. Comment puis-je vous aider ?' }])} aria-label="Réinitialiser"
              style={{ border: 0, background: 'transparent', color: theme.textSecondary, cursor: 'pointer', padding: 6 }}>
              <X size={17} />
            </button>
          </header>

          {contextTopic && (
            <button type="button" onClick={() => sendTopic(contextTopic)} style={{
              margin: '12px 12px 0',
              padding: '10px 11px',
              borderRadius: 10,
              border: `1px solid ${theme.border}`,
              background: 'var(--hover-subtle)',
              color: theme.textPrimary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              cursor: 'pointer',
              textAlign: 'left',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700 }}>
                <HelpCircle size={15} color="var(--accent-primary)" />
                Aide pour cette page : {contextTopic.title}
              </span>
              <ArrowRight size={15} />
            </button>
          )}

          <div ref={scrollRef} style={{
            flex: 1,
            overflowY: 'auto',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            {messages.map((item, index) => {
              const fromUser = item.role === 'user';
              return (
                <div key={`${item.role}-${index}`} style={{
                  alignSelf: fromUser ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  padding: '9px 11px',
                  borderRadius: fromUser ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                  background: fromUser ? theme.accent : theme.bgElevated,
                  color: fromUser ? '#fff' : theme.textPrimary,
                  border: fromUser ? 'none' : `1px solid ${theme.border}`,
                  whiteSpace: 'pre-line',
                  fontSize: 13,
                  lineHeight: 1.45,
                }}>
                  {item.text}
                  {item.topic && (
                    <button type="button" onClick={() => goToTopic(item.topic)} style={{
                      marginTop: 9,
                      width: '100%',
                      border: 0,
                      borderRadius: 8,
                      padding: '8px 9px',
                      background: fromUser ? 'rgba(255,255,255,.18)' : theme.accent,
                      color: '#fff',
                      cursor: 'pointer',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7,
                    }}>
                      Ouvrir le module <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              );
            })}

            <div style={{ display: 'grid', gap: 7, marginTop: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: theme.textMuted, fontWeight: 700 }}>
                <Search size={13} />
                Suggestions
              </div>
              {suggestedTopics.map(topic => (
                <button key={topic.id} type="button" onClick={() => sendTopic(topic)} style={{
                  border: `1px solid ${theme.border}`,
                  borderRadius: 9,
                  background: theme.bgSurface,
                  color: theme.textPrimary,
                  padding: '8px 9px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                }}>
                  {topic.title}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={sendMessage} style={{
            padding: 12,
            borderTop: `1px solid ${theme.border}`,
            display: 'flex',
            gap: 8,
            background: theme.bgSurface,
          }}>
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ex. comment ajouter un tarif ?"
              style={{
                flex: 1,
                minWidth: 0,
                border: `1px solid ${theme.border}`,
                borderRadius: 10,
                padding: '10px 11px',
                fontSize: 13,
                outline: 'none',
                color: theme.textPrimary,
                background: theme.bgElevated,
              }}
            />
            <button type="submit" aria-label="Envoyer" style={{
              width: 42,
              border: 0,
              borderRadius: 10,
              background: theme.accent,
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}>
              <Send size={17} />
            </button>
          </form>
        </section>
      )}

      <button type="button" onClick={() => setOpen(prev => !prev)} aria-label="Ouvrir l'assistant DentalPM" style={{
        width: 56,
        height: 56,
        borderRadius: 16,
        border: 0,
        background: open ? theme.accentHover : theme.accent,
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        boxShadow: theme.shadow,
        cursor: 'pointer',
        marginLeft: 'auto',
        pointerEvents: 'auto',
      }}>
        {open ? <X size={22} /> : <MessageCircle size={23} />}
      </button>
    </div>
  );
}
