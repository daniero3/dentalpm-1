import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [mode, setMode] = useState('native');

  useEffect(() => {
    const dismissedAt = Number(localStorage.getItem('dpm_pwa_dismissed_at') || 0);
    const dismissedRecently = dismissedAt && Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000;
    if (dismissedRecently) return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) return;

    const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setMode('native');
      setTimeout(() => setVisible(true), 3000);
    };

    const installedHandler = () => {
      setInstalled(true);
      setVisible(false);
      localStorage.removeItem('dpm_pwa_dismissed_at');
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    if (isIOS) {
      setMode('ios');
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
        window.removeEventListener('appinstalled', installedHandler);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setVisible(false);
    setPrompt(null);
  };

  const dismiss = () => {
    localStorage.removeItem('dpm_pwa_dismissed');
    localStorage.setItem('dpm_pwa_dismissed_at', String(Date.now()));
    setVisible(false);
  };

  if (!visible || installed) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 90, right: 20, zIndex: 9998,
      background: 'linear-gradient(135deg,#064E56,#0A6B75)',
      borderRadius: 16, padding: '14px 16px',
      boxShadow: '0 16px 48px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.1)',
      display: 'flex', alignItems: 'center', gap: 12,
      maxWidth: 300, border: '1px solid rgba(255,255,255,.15)',
      animation: 'cookieSlideUp .5s cubic-bezier(.34,1.56,.64,1)',
    }}>
      <div style={{ width:40, height:40, borderRadius:11, background:'rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Smartphone size={20} color="#fff"/>
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:2 }}>Installer DentalPM</div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,.72)', lineHeight:1.4 }}>
          {mode === 'ios'
            ? "Sur iPhone/iPad: Partager puis Sur l'ecran d'accueil."
            : "Acces rapide depuis votre ecran d'accueil."}
        </div>
        {mode !== 'ios' && (
          <button onClick={install}
            style={{ marginTop:8, padding:'6px 14px', borderRadius:8, border:'none', background:'#fff', color:'#0D7A87', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
            <Download size={12}/> Installer
          </button>
        )}
      </div>
      <button onClick={dismiss}
        style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.5)', padding:4, flexShrink:0 }}>
        <X size={14}/>
      </button>
    </div>
  );
}
