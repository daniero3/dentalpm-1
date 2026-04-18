import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Afficher si jamais accepté/refusé
    const consent = localStorage.getItem('dpm_cookie_consent');
    if (!consent) {
      // Délai 800ms pour laisser la page charger
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('dpm_cookie_consent', 'accepted');
    localStorage.setItem('dpm_cookie_date', new Date().toISOString());
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem('dpm_cookie_consent', 'declined');
    localStorage.setItem('dpm_cookie_date', new Date().toISOString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Overlay semi-transparent bas de page */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '0 0 0 0',
        animation: 'cookieSlideUp .4s cubic-bezier(.4,0,.2,1)',
      }}>
        <style>{`
          @keyframes cookieSlideUp {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>

        <div style={{
          background: 'rgba(10, 15, 30, 0.97)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255,255,255,.1)',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}>

          {/* Icône + texte */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 280 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: 'rgba(13,122,135,.25)', border: '1px solid rgba(13,122,135,.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18
            }}>🍪</div>
            <div>
              <div style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 4
              }}>
                DentalPM utilise des cookies
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', lineHeight: 1.6, maxWidth: 560 }}>
                Nous utilisons des cookies essentiels pour le fonctionnement de la plateforme (authentification, session).
                En continuant, vous acceptez leur utilisation.{' '}
                <Link to="/legal/cookies"
                  style={{ color: '#13A3B4', textDecoration: 'underline', fontWeight: 600 }}
                  onClick={() => setVisible(false)}>
                  En savoir plus
                </Link>
              </div>
            </div>
          </div>

          {/* Boutons */}
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <button onClick={decline}
              style={{
                padding: '9px 18px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,.2)',
                background: 'transparent', color: 'rgba(255,255,255,.6)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', transition: 'all .15s',
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}>
              Refuser
            </button>
            <button onClick={accept}
              style={{
                padding: '9px 22px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg,#0D7A87,#13A3B4)',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                boxShadow: '0 4px 14px rgba(13,122,135,.4)',
                transition: 'all .15s',
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(13,122,135,.5)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(13,122,135,.4)'; }}>
              ✓ Accepter
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
