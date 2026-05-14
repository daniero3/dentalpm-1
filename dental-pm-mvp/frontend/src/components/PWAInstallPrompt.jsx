import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Vérifier si déjà installé ou refusé
    if (localStorage.getItem('dpm_pwa_dismissed')) return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setTimeout(() => setVisible(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setInstalled(true); setVisible(false); });

    return () => window.removeEventListener('beforeinstallprompt', handler);
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
    localStorage.setItem('dpm_pwa_dismissed', '1');
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
        <div style={{ fontSize:11, color:'rgba(255,255,255,.6)', lineHeight:1.4 }}>Accès rapide depuis votre écran d'accueil</div>
        <button onClick={install}
          style={{ marginTop:8, padding:'6px 14px', borderRadius:8, border:'none', background:'#fff', color:'#0D7A87', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
          <Download size={12}/> Installer
        </button>
      </div>
      <button onClick={dismiss}
        style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.5)', padding:4, flexShrink:0 }}>
        <X size={14}/>
      </button>
    </div>
  );
}
