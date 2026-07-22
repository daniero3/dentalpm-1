import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('dpm_cookie_consent');
    if (!consent) {
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = (choice) => {
    setLeaving(true);
    setTimeout(() => {
      localStorage.setItem('dpm_cookie_consent', choice);
      localStorage.setItem('dpm_cookie_date', new Date().toISOString());
      setVisible(false);
      setLeaving(false);
    }, 500);
  };

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes dpm-slide-up {
          0%   { transform: translateY(120%) scale(0.97); opacity: 0; }
          60%  { transform: translateY(-6px) scale(1.005); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes dpm-slide-down {
          0%   { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(120%) scale(0.96); opacity: 0; }
        }
        @keyframes dpm-shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes dpm-pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: .5; transform: scale(1.4); }
        }
        @keyframes dpm-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-4px); }
        }
        .dpm-accept-btn:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 28px rgba(13,122,135,.55) !important;
        }
	        .dpm-accept-btn:active { transform: scale(0.97) !important; }
	        .dpm-decline-btn:hover { background: rgba(255,255,255,.1) !important; }
	        .dpm-more-btn:hover    { color: #7DD3DA !important; }
	        @media (max-width: 520px) {
	          .dpm-cookie-shell {
	            left: 12px !important;
	            right: 12px !important;
	            bottom: calc(12px + env(safe-area-inset-bottom)) !important;
	            width: auto !important;
	            transform: none !important;
	          }
	          .dpm-cookie-inner {
	            padding: 14px !important;
	            gap: 12px !important;
	            align-items: flex-start !important;
	          }
	          .dpm-cookie-icon {
	            width: 40px !important;
	            height: 40px !important;
	            border-radius: 12px !important;
	            font-size: 18px !important;
	          }
	          .dpm-cookie-copy {
	            min-width: 0 !important;
	            flex-basis: calc(100% - 52px) !important;
	          }
	          .dpm-cookie-actions {
	            width: 100% !important;
	            display: grid !important;
	            grid-template-columns: 1fr 1fr !important;
	            gap: 8px !important;
	          }
	          .dpm-cookie-actions button {
	            width: 100% !important;
	            justify-content: center !important;
	            min-height: 42px !important;
	            padding-left: 10px !important;
	            padding-right: 10px !important;
	          }
	        }
	        @media (max-width: 340px) {
	          .dpm-cookie-actions {
	            grid-template-columns: 1fr !important;
	          }
	        }
	      `}</style>

	      <div className="dpm-cookie-shell" style={{
        position: 'fixed', bottom: 24, left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        width: 'calc(100% - 32px)',
        maxWidth: 720,
        animation: leaving
          ? 'dpm-slide-down .5s cubic-bezier(.4,0,.2,1) forwards'
          : 'dpm-slide-up .7s cubic-bezier(.34,1.56,.64,1) forwards',
      }}>

        {/* Carte principale */}
	          <div className="dpm-cookie-inner" style={{
          background: 'linear-gradient(135deg, rgba(6,28,40,.97) 0%, rgba(10,40,55,.97) 50%, rgba(6,28,40,.97) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,.1)',
          boxShadow: '0 32px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(13,122,135,.2), inset 0 1px 0 rgba(255,255,255,.07)',
          overflow: 'hidden',
          position: 'relative',
        }}>

          {/* Barre colorée top */}
	            <div className="dpm-cookie-icon" style={{
            height: 3,
            background: 'linear-gradient(90deg, #0D7A87, #13A3B4, #0D7A87)',
            backgroundSize: '400px 100%',
            animation: 'dpm-shimmer 2.5s linear infinite',
          }}/>

          {/* Lueur décorative */}
          <div style={{
            position: 'absolute', top: -60, right: -60,
            width: 180, height: 180, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(13,122,135,.2) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}/>

          <div style={{
            padding: '18px 22px',
            display: 'flex', alignItems: 'center',
            gap: 16, flexWrap: 'wrap',
          }}>

            {/* Icône animée */}
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(13,122,135,.3), rgba(19,163,180,.2))',
              border: '1px solid rgba(13,122,135,.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'dpm-float 3s ease-in-out infinite',
              fontSize: 22,
            }}>🍪</div>

            {/* Texte */}
	            <div className="dpm-cookie-copy" style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                {/* Dot actif */}
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#22C55E',
                  animation: 'dpm-pulse-dot 2s ease-in-out infinite',
                  flexShrink: 0,
                }}/>
                <span style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontWeight: 800, fontSize: 14, color: '#fff',
                  letterSpacing: '-0.01em',
                }}>
                  Votre confidentialité nous importe
                </span>
              </div>
              <p style={{
                fontSize: 12, color: 'rgba(255,255,255,.5)',
                margin: 0, lineHeight: 1.65,
              }}>
                DentalPM utilise des cookies essentiels pour sécuriser votre session et améliorer votre expérience.
                {' '}<Link
                  to="/legal/cookies"
                  className="dpm-more-btn"
                  onClick={() => dismiss('accepted')}
                  style={{
                    color: '#13A3B4', textDecoration: 'none',
                    fontWeight: 600, transition: 'color .2s',
                    borderBottom: '1px solid rgba(19,163,180,.3)',
                  }}>
                  Politique des cookies →
                </Link>
              </p>
            </div>

            {/* Boutons */}
	            <div className="dpm-cookie-actions" style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'center' }}>
              <button
                type="button"
                className="dpm-decline-btn"
                onClick={() => dismiss('declined')}
                style={{
                  padding: '9px 16px', borderRadius: 11,
                  border: '1px solid rgba(255,255,255,.15)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,.5)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  transition: 'all .2s',
                  whiteSpace: 'nowrap',
                }}>
                Refuser
              </button>

              <button
                type="button"
                className="dpm-accept-btn"
                onClick={() => dismiss('accepted')}
                style={{
                  padding: '10px 22px', borderRadius: 11, border: 'none',
                  background: 'linear-gradient(135deg, #0D7A87 0%, #13A3B4 100%)',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  boxShadow: '0 4px 16px rgba(13,122,135,.45)',
                  transition: 'all .25s cubic-bezier(.16,1,.3,1)',
                  whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 7,
                  letterSpacing: '-0.01em',
                }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Accepter
              </button>
            </div>

          </div>
        </div>

        {/* Ombre portée décorative */}
        <div style={{
          position: 'absolute', bottom: -12, left: '10%', right: '10%', height: 20,
          background: 'rgba(13,122,135,.2)',
          filter: 'blur(16px)',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: -1,
        }}/>
      </div>
    </>
  );
}
