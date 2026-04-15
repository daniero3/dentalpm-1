import React, { useState, useEffect } from "react"
import {
  Home, Users, FileText, Calendar, Settings, Package, Truck,
  ShoppingCart, FlaskConical, Mail, ChevronLeft, ChevronRight,
  Building2, CreditCard, LayoutDashboard, BarChart3,
  Sparkles, Menu, X
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../App"

// Tous les items avec leur plan minimum requis
const ALL_NAV = [
  { name:"Tableau de bord", href:"/",            icon:Home,         plans:['ESSENTIAL','PRO','GROUP','TRIAL'] },
  { name:"Patients",        href:"/patients",    icon:Users,        plans:['ESSENTIAL','PRO','GROUP','TRIAL'] },
  { name:"Rendez-vous",     href:"/appointments",icon:Calendar,     plans:['ESSENTIAL','PRO','GROUP','TRIAL'] },
  { name:"Devis",           href:"/quotes",      icon:FileText,     plans:['ESSENTIAL','PRO','GROUP','TRIAL'] },
  { name:"Factures",        href:"/invoices",    icon:FileText,     plans:['ESSENTIAL','PRO','GROUP','TRIAL'] },
  { name:"Rapports",        href:"/reports",     icon:BarChart3,    plans:['PRO','GROUP'] },
  { name:"Inventaire",      href:"/inventory",   icon:Package,      plans:['PRO','GROUP'] },
  { name:"Achats",          href:"/purchases",   icon:ShoppingCart, plans:['PRO','GROUP'] },
  { name:"Fournisseurs",    href:"/suppliers",   icon:Truck,        plans:['PRO','GROUP'] },
  { name:"Laboratoire",     href:"/lab",         icon:FlaskConical, plans:['PRO','GROUP'] },
  { name:"Mailing",         href:"/mailing",     icon:Mail,         plans:['PRO','GROUP'] },
  { name:"Paramètres",      href:"/settings",    icon:Settings,     plans:['ESSENTIAL','PRO','GROUP','TRIAL'] },
]

const adminNavigation = [
  { name:"Dashboard Admin",      href:"/admin",          icon:LayoutDashboard },
  { name:"Cliniques",            href:"/admin/clinics",  icon:Building2 },
  { name:"Validation Paiements", href:"/admin/payments", icon:CreditCard },
]

const billingNavigation = [
  { name:"Mon Abonnement", href:"/subscription", icon:CreditCard },
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



// ── CSS animations logo ──
const LogoCSS = () => <style>{`
  
    50%       { transform: scale(1.06); filter: drop-shadow(0 6px 20px rgba(255,255,255,.4)); }
  }
  @keyframes logoBadge {
    0%, 100% { transform: scale(1); }
    50%       { transform: scale(1.08); }
  }
`}</style>;

// ── Logo sans fond ──
const DentalLogo = ({ size=36, animate=false }) => (
  <img
    src="/fix-logo.jpeg"
    alt="DPM Madagascar"
    width={size}
    height={size}
    style={{
      borderRadius: '50%',
      objectFit: 'cover',
      display: 'block',
      flexShrink: 0,
      filter: 'drop-shadow(0 2px 10px rgba(255,255,255,.25)) drop-shadow(0 4px 18px rgba(0,0,0,.2))',
      
      transition: 'all .3s',
    }}
  />
);

// ── Contenu sidebar (réutilisé desktop + drawer) ──
const BACKEND = process.env.REACT_APP_BACKEND_URL || 'https://dentalpm-1-production.up.railway.app'

const SidebarContent = ({ collapsed, onNavClick }) => {
  const location = useLocation()
  const { user } = useAuth()
  const [userPlan, setUserPlan] = React.useState(null)

  React.useEffect(() => {
    if (!user || user.role === 'SUPER_ADMIN') return
    const token = localStorage.getItem('token')
    fetch(`${BACKEND}/api/billing/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.plan) setUserPlan(d.plan) })
      .catch(() => {})
  }, [user])

  // Filtrer la navigation selon le plan
  const navigation = ALL_NAV.filter(item => {
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') return true
    if (!userPlan) return item.plans.includes('ESSENTIAL') // défaut conservative
    return item.plans.includes(userPlan)
  })

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
      <LogoCSS/>
      <div style={{ padding: collapsed ? '16px 0' : '16px 14px', borderBottom:'1px solid rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'flex-start', gap:10, minHeight:64 }}>
        <DentalLogo size={40} animate={true}/>
        {!collapsed && (
          <div style={{ overflow:'hidden', flex:1 }}>
            <p style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:15, color:'#fff', margin:0, whiteSpace:'nowrap', letterSpacing:'-0.01em' }}>DPM Madagascar</p>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#22C55E', animation:'logoBadge 2s ease-in-out infinite' }}/>
              <p style={{ fontSize:10, color:'rgba(255,255,255,.55)', margin:0, fontWeight:600 }}>Cabinet dentaire</p>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding: collapsed ? '12px 8px' : '12px', overflowY:'auto', overflowX:'hidden', scrollbarWidth:'none' }}>
        {!collapsed && <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.1em', padding:'4px 8px 8px', margin:0 }}>Navigation</p>}
        {navigation.map(item => <NavItem key={item.href} item={item} />)}

        {/* Items verrouillés — visible si plan ESSENTIAL */}
        {userPlan === 'ESSENTIAL' && !collapsed && (
          <div style={{ marginTop:8, padding:'8px 10px', borderRadius:10, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)' }}>
            <p style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.1em', margin:'0 0 6px' }}>Disponible en PRO</p>
            {ALL_NAV.filter(i=>!i.plans.includes('ESSENTIAL')).map(item => {
              const Icon = item.icon
              return (
                <div key={item.href} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 6px', borderRadius:8, opacity:.45, cursor:'not-allowed', marginBottom:2 }}>
                  <div style={{ width:28, height:28, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,.06)', flexShrink:0 }}>
                    <Icon size={14} color='rgba(255,255,255,.4)'/>
                  </div>
                  <span style={{ fontSize:12, color:'rgba(255,255,255,.4)', flex:1 }}>{item.name}</span>
                  <span style={{ fontSize:8, fontWeight:700, background:'rgba(255,165,0,.2)', color:'#F59E0B', padding:'1px 5px', borderRadius:99 }}>PRO</span>
                </div>
              )
            })}
            <a href='/subscription' style={{ display:'block', marginTop:8, padding:'6px 8px', borderRadius:8, background:'rgba(99,91,255,.25)', color:'rgba(255,255,255,.8)', fontSize:11, fontWeight:700, textDecoration:'none', textAlign:'center' }}>
              ↑ Passer au plan PRO
            </a>
          </div>
        )}

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
              {userPlan && user?.role !== 'SUPER_ADMIN' && (
                <span style={{ fontSize:9, fontWeight:700, background:'rgba(255,255,255,.15)', color:'rgba(255,255,255,.7)', padding:'1px 6px', borderRadius:99, marginTop:2, display:'inline-block' }}>
                  {userPlan}
                </span>
              )}
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
