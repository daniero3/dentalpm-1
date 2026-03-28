import React, { useState, useEffect } from "react"
import {
  Home, Users, FileText, Calendar, Settings, Package, Truck,
  ShoppingCart, FlaskConical, Mail, ChevronLeft, ChevronRight,
  Building2, CreditCard, LayoutDashboard, BarChart3,
  Sparkles, Menu, X
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../App"

const navigation = [
  { name:"Tableau de bord", href:"/",            icon:Home },
  { name:"Patients",        href:"/patients",     icon:Users },
  { name:"Rendez-vous",     href:"/appointments", icon:Calendar },
  { name:"Devis",           href:"/quotes",       icon:FileText },
  { name:"Factures",        href:"/invoices",     icon:FileText },
  { name:"Rapports",        href:"/reports",      icon:BarChart3 },
  { name:"Inventaire",      href:"/inventory",    icon:Package },
  { name:"Achats",          href:"/purchases",    icon:ShoppingCart },
  { name:"Fournisseurs",    href:"/suppliers",    icon:Truck },
  { name:"Laboratoire",     href:"/lab",          icon:FlaskConical },
  { name:"Mailing",         href:"/mailing",      icon:Mail },
  { name:"Paramètres",      href:"/settings",     icon:Settings },
]

const adminNavigation = [
  { name:"Dashboard Admin",      href:"/admin",          icon:LayoutDashboard },
  { name:"Cliniques",            href:"/admin/clinics",  icon:Building2 },
  { name:"Validation Paiements", href:"/admin/payments", icon:CreditCard },
]

const billingNavigation = [
  { name:"Paiement/Abonnement", href:"/payment", icon:CreditCard },
]

const NAV_COLORS = {
  '/':            '#0D7A87',
  '/patients':    '#3B4FD8',
  '/appointments':'#8B5CF6',
  '/quotes':      '#F59E0B',
  '/invoices':    '#0EA570',
  '/reports':     '#06B6D4',
  '/inventory':   '#F05A28',
  '/purchases':   '#EC4899',
  '/suppliers':   '#84CC16',
  '/lab':         '#A855F7',
  '/mailing':     '#14B8A6',
  '/settings':    '#6B7280',
}

// ── Hook screen size ──
const useScreenSize = () => {
  const [w, setW] = useState(window.innerWidth)
  useEffect(() => {
    const h = () => setW(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return {
    isMobile:  w < 768,
    isTablet:  w >= 768 && w < 1024,
    isDesktop: w >= 1024,
    width: w
  }
}


// ── Logo Dentaire SVG ──
const DentalLogo = () => (
  <svg width="22" height="22" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Dent principale */}
    <path d="M50 8 C35 8, 20 18, 18 32 C16 44, 20 52, 22 58 C25 68, 28 80, 32 88 C34 93, 38 95, 42 92 C45 89, 46 82, 48 74 C49 70, 50 68, 50 68 C50 68, 51 70, 52 74 C54 82, 55 89, 58 92 C62 95, 66 93, 68 88 C72 80, 75 68, 78 58 C80 52, 84 44, 82 32 C80 18, 65 8, 50 8 Z"
      fill="white" opacity="0.95"/>
    {/* Reflet */}
    <path d="M35 18 C28 22, 24 30, 24 38 C24 40, 26 41, 27 40 C29 32, 34 24, 42 20 C44 19, 44 16, 42 16 C39 16, 37 17, 35 18 Z"
      fill="white" opacity="0.5"/>
    {/* Croix médicale */}
    <rect x="44" y="30" width="12" height="36" rx="5" fill="#0D7A87" opacity="0.85"/>
    <rect x="30" y="44" width="40" height="12" rx="5" fill="#0D7A87" opacity="0.85"/>
  </svg>
);

// ── Contenu sidebar (réutilisé desktop + drawer) ──
const SidebarContent = ({ collapsed, onNavClick }) => {
  const location = useLocation()
  const { user } = useAuth()

  const isActive = (href) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href)

  const NavItem = ({ item }) => {
    const active = isActive(item.href)
    const Icon   = item.icon
    const color  = NAV_COLORS[item.href] || '#0D7A87'
    return (
      <Link to={item.href} onClick={onNavClick} style={{ textDecoration:'none', display:'block', marginBottom:2 }}>
        <div title={collapsed ? item.name : ''}
          style={{
            display:'flex', alignItems:'center', gap:10,
            padding: collapsed ? '10px 0' : '9px 10px',
            borderRadius:10, cursor:'pointer',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
            border: active ? '1px solid rgba(255,255,255,0.25)' : '1px solid transparent',
            transition:'all 0.18s ease', position:'relative',
          }}
          onMouseEnter={e => { if(!active){ e.currentTarget.style.background='rgba(255,255,255,0.10)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.15)'; }}}
          onMouseLeave={e => { if(!active){ e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='transparent'; }}}
        >
          {active && (
            <div style={{ position:'absolute', left:0, top:'20%', bottom:'20%', width:3, borderRadius:'0 3px 3px 0', background:'#fff', boxShadow:'0 0 8px rgba(255,255,255,0.5)' }} />
          )}
          <div style={{ width:32, height:32, borderRadius:8, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)', transition:'all 0.18s' }}>
            <Icon size={16} color={active ? color : 'rgba(255,255,255,0.55)'} />
          </div>
          {!collapsed && (
            <span style={{ fontFamily:'DM Sans,sans-serif', fontSize:13, fontWeight: active ? 700 : 500, color: active ? '#fff' : 'rgba(255,255,255,0.6)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', transition:'all 0.18s' }}>
              {item.name}
            </span>
          )}
        </div>
      </Link>
    )
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', background:'linear-gradient(180deg,#064E56 0%,#0A6B75 50%,#0D7A87 100%)', boxShadow:'4px 0 24px rgba(0,0,0,0.2)', borderRight:'1px solid rgba(255,255,255,0.1)' }}>

      {/* Logo */}
      <div style={{ padding: collapsed ? '20px 0' : '20px 16px', borderBottom:'1px solid rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'space-between', gap:12, minHeight:64 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, overflow:'hidden' }}>
          <div style={{ width:38, height:38, borderRadius:10, flexShrink:0, background:'linear-gradient(135deg,#fff,rgba(255,255,255,0.7))', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(13,122,135,0.4)' }}>
            <DentalLogo />
          </div>
          {!collapsed && (
            <div style={{ overflow:'hidden' }}>
              <p style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:14, color:'#fff', margin:0, whiteSpace:'nowrap' }}>Dental Practice</p>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.45)', margin:0 }}>Madagascar</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding: collapsed ? '12px 8px' : '12px', overflowY:'auto', overflowX:'hidden', scrollbarWidth:'none' }}>
        {!collapsed && <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.1em', padding:'4px 8px 8px', margin:0 }}>Navigation</p>}
        {navigation.map(item => <NavItem key={item.href} item={item} />)}

        {user?.role !== 'SUPER_ADMIN' && (
          <>
            <div style={{ height:1, background:'rgba(255,255,255,0.12)', margin:'10px 0' }} />
            {!collapsed && <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.1em', padding:'4px 8px 8px', margin:0 }}>Abonnement</p>}
            {billingNavigation.map(item => <NavItem key={item.href} item={item} />)}
          </>
        )}

        {user?.role === 'SUPER_ADMIN' && (
          <>
            <div style={{ height:1, background:'rgba(255,255,255,0.12)', margin:'10px 0' }} />
            {!collapsed && (
              <div style={{ padding:'4px 8px 8px', display:'flex', alignItems:'center', gap:6 }}>
                <Sparkles size={10} color="#8B5CF6" />
                <p style={{ fontSize:10, fontWeight:700, color:'#8B5CF6', textTransform:'uppercase', letterSpacing:'0.1em', margin:0 }}>Super Admin</p>
              </div>
            )}
            {adminNavigation.map(item => <NavItem key={item.href} item={item} />)}
          </>
        )}
      </nav>

      {/* User */}
      <div style={{ padding: collapsed ? '16px 0' : '16px', borderTop:'1px solid rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'flex-start', gap:10 }}>
        <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:14, color:'#fff', border:'1.5px solid rgba(255,255,255,0.3)' }}>
          {user?.full_name?.charAt(0)?.toUpperCase() || 'A'}
        </div>
        {!collapsed && (
          <div style={{ overflow:'hidden', flex:1 }}>
            <p style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:13, color:'#fff', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.full_name || 'Utilisateur'}</p>
            <p style={{ fontSize:11, color:'rgba(255,255,255,0.45)', margin:0 }}>{user?.role}</p>
          </div>
        )}
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#22C55E', flexShrink:0, boxShadow:'0 0 0 2px rgba(255,255,255,0.3)' }} />
      </div>
    </div>
  )
}

// ══ Composant principal ══
export function ModernSidebar() {
  const { isMobile, isTablet } = useScreenSize()
  const [collapsed, setCollapsed]     = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)
  const location = useLocation()

  // Auto-collapse tablette
  useEffect(() => { if (isTablet) setCollapsed(true); else if (!isMobile) setCollapsed(false); }, [isTablet, isMobile])

  // Fermer drawer au changement de route
  useEffect(() => { setMobileOpen(false); }, [location.pathname])

  // Bloquer le scroll du body quand drawer ouvert
  useEffect(() => {
    if (isMobile) document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen, isMobile])

  const sidebarWidth = collapsed ? 72 : 264

  // ── MOBILE — drawer ──
  if (isMobile) {
    return (
      <>
        {/* Bouton hamburger fixe */}
        <button onClick={() => setMobileOpen(true)}
          style={{ position:'fixed', top:14, left:14, zIndex:1000, width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,#064E56,#0D7A87)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(13,122,135,0.35)' }}>
          <Menu size={20} color="#fff" />
        </button>

        {/* Overlay */}
        {mobileOpen && (
          <div onClick={() => setMobileOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', zIndex:1001, backdropFilter:'blur(3px)' }} />
        )}

        {/* Drawer */}
        <div style={{ position:'fixed', left:0, top:0, bottom:0, width:280, zIndex:1002, transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)', transition:'transform 0.3s cubic-bezier(0.4,0,0.2,1)' }}>
          {/* Bouton fermer */}
          <button onClick={() => setMobileOpen(false)}
            style={{ position:'absolute', top:14, right:14, zIndex:1, width:32, height:32, borderRadius:8, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
            <X size={16} />
          </button>
          <SidebarContent collapsed={false} onNavClick={() => setMobileOpen(false)} />
        </div>
      </>
    )
  }

  // ── DESKTOP / TABLETTE — sidebar fixe ──
  return (
    <div style={{ position:'fixed', left:0, top:0, bottom:0, width:sidebarWidth, zIndex:100, transition:'width 0.25s cubic-bezier(0.4,0,0.2,1)', flexShrink:0 }}>
      <SidebarContent collapsed={collapsed} onNavClick={null} />

      {/* Toggle collapse */}
      <button onClick={() => setCollapsed(!collapsed)}
        style={{ position:'absolute', top:72, right:-12, width:24, height:24, borderRadius:'50%', background:'#fff', border:'1.5px solid #E2E8F0', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(15,23,42,0.12)', zIndex:101 }}
        onMouseEnter={e => e.currentTarget.style.background='#F8FAFC'}
        onMouseLeave={e => e.currentTarget.style.background='#fff'}>
        {collapsed ? <ChevronRight size={12} color="#475569" /> : <ChevronLeft size={12} color="#475569" />}
      </button>
    </div>
  )
}
