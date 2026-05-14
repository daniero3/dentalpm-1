import { useState, useEffect } from 'react';

export function useResponsive() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return {
    isMobile:  w < 768,
    isTablet:  w >= 768 && w < 1024,
    isDesktop: w >= 1024,
    w,
  };
}

export function getModalStyle(isMobile) {
  return {
    background: '#fff',
    borderRadius: isMobile ? '20px 20px 0 0' : 20,
    width: '100%',
    maxWidth: isMobile ? '100%' : 520,
    maxHeight: '90vh',
    overflowY: 'auto',
    margin: isMobile ? 'auto 0 0 0' : 'auto',
    boxShadow: '0 32px 80px rgba(0,0,0,.2)',
  };
}

export const modalOverlay = (isMobile) => ({
  position: 'fixed', inset: 0, zIndex: 1050,
  background: 'rgba(10,16,30,.65)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  padding: isMobile ? '0' : '16px',
  overflowY: 'auto',
  alignItems: isMobile ? 'flex-end' : 'center',
  justifyContent: 'center',
});
