import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Send, X, Minimize2, ArrowRight, Search, HelpCircle } from 'lucide-react';
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

const RobotMascot = ({ size = 'normal', active = false }) => (
  <div className={`dpm-robot-mascot dpm-robot-${size} ${active ? 'is-active' : ''}`} aria-hidden="true">
    <div className="dpm-robot-shadow" />
    <div className="dpm-robot-antenna">
      <span />
    </div>
    <div className="dpm-robot-head">
      <div className="dpm-robot-face">
        <i />
        <i />
      </div>
      <div className="dpm-robot-mouth" />
    </div>
    <div className="dpm-robot-body">
      <span />
    </div>
  </div>
);

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
      <style>{`
        @keyframes dpmChatPanelIn {
          from { opacity: 0; transform: translateY(16px) scale(.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dpmChatBubbleIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dpmChatPulse {
          0%, 100% { transform: translateY(0) scale(1); box-shadow: var(--shadow-lg); }
          50% { transform: translateY(-2px) scale(1.03); box-shadow: 0 14px 38px rgba(13,122,135,.26); }
        }
        @keyframes dpmChatRing {
          from { opacity: .36; transform: scale(.9); }
          to { opacity: 0; transform: scale(1.45); }
        }
        @keyframes dpmRobotFloat {
          0%, 100% { transform: translateY(0) rotateX(0deg) rotateZ(-1deg); }
          50% { transform: translateY(-3px) rotateX(6deg) rotateZ(1deg); }
        }
        @keyframes dpmRobotBlink {
          0%, 44%, 48%, 100% { transform: scaleY(1); }
          46% { transform: scaleY(.18); }
        }
        @keyframes dpmRobotAntenna {
          0%, 100% { transform: translateX(-50%) rotate(-5deg); }
          50% { transform: translateX(-50%) rotate(6deg); }
        }
        .dpm-chat-panel {
          animation: dpmChatPanelIn 180ms cubic-bezier(.22,1,.36,1) both;
          transform-origin: bottom right;
        }
        .dpm-chat-message {
          animation: dpmChatBubbleIn 170ms ease-out both;
        }
        .dpm-chat-fab {
          position: relative;
          transition: transform 150ms ease, background 150ms ease, box-shadow 150ms ease;
          animation: dpmChatPulse 2600ms ease-in-out infinite;
        }
        .dpm-chat-fab::after {
          content: '';
          position: absolute;
          inset: -5px;
          border: 1px solid rgba(13,122,135,.45);
          border-radius: 20px;
          animation: dpmChatRing 2200ms ease-out infinite;
          pointer-events: none;
        }
        .dpm-chat-fab:hover {
          transform: translateY(-2px) scale(1.04);
        }
        .dpm-chat-fab:active {
          transform: translateY(0) scale(.97);
        }
        .dpm-robot-mascot {
          position: relative;
          width: 42px;
          height: 48px;
          transform-style: preserve-3d;
          animation: dpmRobotFloat 3200ms ease-in-out infinite;
          filter: drop-shadow(0 9px 12px rgba(15,23,42,.18));
        }
        .dpm-robot-small {
          width: 30px;
          height: 34px;
          animation-duration: 3600ms;
        }
        .dpm-robot-shadow {
          position: absolute;
          left: 18%;
          right: 18%;
          bottom: -2px;
          height: 7px;
          border-radius: 999px;
          background: rgba(15,23,42,.2);
          filter: blur(3px);
          transform: rotateX(72deg);
        }
        .dpm-robot-antenna {
          position: absolute;
          left: 50%;
          top: 0;
          width: 3px;
          height: 12px;
          border-radius: 999px;
          background: linear-gradient(180deg, #D9F7FB, #79D9E4);
          transform-origin: bottom center;
          animation: dpmRobotAntenna 2600ms ease-in-out infinite;
        }
        .dpm-robot-antenna span {
          position: absolute;
          left: 50%;
          top: -5px;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #FFFFFF 0 18%, #75ECF4 22% 55%, #0D7A87 100%);
          transform: translateX(-50%);
          box-shadow: 0 0 12px rgba(117,236,244,.75);
        }
        .dpm-robot-head {
          position: absolute;
          left: 50%;
          top: 9px;
          width: 34px;
          height: 28px;
          border-radius: 12px 12px 10px 10px;
          background: linear-gradient(145deg, #FFFFFF 0%, #E6FAFC 45%, #B8EEF5 100%);
          border: 1px solid rgba(255,255,255,.82);
          box-shadow: inset -5px -6px 10px rgba(13,122,135,.2), inset 4px 4px 8px rgba(255,255,255,.95), 0 8px 16px rgba(13,122,135,.23);
          transform: translateX(-50%) perspective(80px) rotateX(5deg);
        }
        .dpm-robot-small .dpm-robot-head {
          top: 7px;
          width: 25px;
          height: 21px;
          border-radius: 9px;
        }
        .dpm-robot-face {
          position: absolute;
          left: 6px;
          right: 6px;
          top: 8px;
          height: 10px;
          border-radius: 999px;
          background: linear-gradient(180deg, #0F172A, #164E63);
          display: flex;
          align-items: center;
          justify-content: space-around;
          box-shadow: inset 0 1px 3px rgba(0,0,0,.35);
        }
        .dpm-robot-small .dpm-robot-face {
          left: 5px;
          right: 5px;
          top: 6px;
          height: 8px;
        }
        .dpm-robot-face i {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #77F7FF;
          box-shadow: 0 0 8px rgba(119,247,255,.9);
          animation: dpmRobotBlink 4200ms ease-in-out infinite;
        }
        .dpm-robot-small .dpm-robot-face i {
          width: 3px;
          height: 3px;
        }
        .dpm-robot-mouth {
          position: absolute;
          left: 50%;
          bottom: 6px;
          width: 10px;
          height: 2px;
          border-radius: 999px;
          background: rgba(13,122,135,.45);
          transform: translateX(-50%);
        }
        .dpm-robot-body {
          position: absolute;
          left: 50%;
          bottom: 5px;
          width: 24px;
          height: 17px;
          border-radius: 9px 9px 11px 11px;
          background: linear-gradient(145deg, #13A3B4, #0D7A87 62%, #075E69);
          box-shadow: inset 4px 4px 8px rgba(255,255,255,.2), inset -5px -5px 10px rgba(4,47,55,.28), 0 8px 14px rgba(13,122,135,.24);
          transform: translateX(-50%) perspective(90px) rotateX(-5deg);
        }
        .dpm-robot-small .dpm-robot-body {
          bottom: 4px;
          width: 18px;
          height: 13px;
          border-radius: 7px 7px 9px 9px;
        }
        .dpm-robot-body::before,
        .dpm-robot-body::after {
          content: '';
          position: absolute;
          top: 4px;
          width: 7px;
          height: 12px;
          border-radius: 999px;
          background: linear-gradient(180deg, #B8EEF5, #0D7A87);
          z-index: -1;
        }
        .dpm-robot-body::before {
          left: -5px;
          transform: rotate(18deg);
        }
        .dpm-robot-body::after {
          right: -5px;
          transform: rotate(-18deg);
        }
        .dpm-robot-body span {
          position: absolute;
          left: 50%;
          top: 6px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #BFFBFF;
          transform: translateX(-50%);
          box-shadow: 0 0 10px rgba(191,251,255,.75);
        }
        .dpm-robot-mascot.is-active .dpm-robot-antenna span {
          background: radial-gradient(circle at 35% 35%, #FFFFFF 0 18%, #9FF8D0 22% 55%, #10B981 100%);
          box-shadow: 0 0 13px rgba(16,185,129,.75);
        }
        .dpm-chat-suggestion {
          transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
        }
        .dpm-chat-suggestion:hover {
          transform: translateX(3px);
          border-color: var(--accent-primary) !important;
          background: var(--hover-subtle) !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .dpm-chat-panel,
          .dpm-chat-message,
          .dpm-chat-fab,
          .dpm-chat-fab::after,
          .dpm-robot-mascot,
          .dpm-robot-antenna,
          .dpm-robot-face i {
            animation: none !important;
          }
          .dpm-chat-fab,
          .dpm-chat-suggestion {
            transition: none !important;
          }
        }
      `}</style>
      {open && (
        <section className="dpm-chat-panel" style={{
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
              background: 'linear-gradient(145deg, rgba(13,122,135,.14), rgba(19,163,180,.22))',
              color: theme.accent,
              flexShrink: 0,
              overflow: 'visible',
            }}>
              <RobotMascot size="small" active />
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
                <div key={`${item.role}-${index}`} className="dpm-chat-message" style={{
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
                    <button type="button" onClick={() => goToTopic(item.topic)}
                      className="dpm-chat-suggestion"
                      style={{
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
                <button key={topic.id} type="button" onClick={() => sendTopic(topic)} className="dpm-chat-suggestion" style={{
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

      <button type="button" onClick={() => setOpen(prev => !prev)} aria-label="Ouvrir l'assistant DentalPM" className="dpm-chat-fab" style={{
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
        {open ? <X size={22} /> : <RobotMascot active />}
      </button>
    </div>
  );
}
