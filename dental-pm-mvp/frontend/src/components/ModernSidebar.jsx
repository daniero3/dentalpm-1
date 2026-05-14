import React, { useState, useEffect } from "react"
import axios from "axios"
import {
  Home, Users, FileText, Calendar, Settings, Package, Truck,
  ShoppingCart, FlaskConical, Mail, ChevronLeft, ChevronRight,
  Building2, CreditCard, LayoutDashboard, BarChart3,
  Sparkles, Menu, X, Lock
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../App"
import { createHoverPrefetch } from "../utils/routePrefetch"

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8001/api'
    : '/api'

const theme = {
  bgBase: 'var(--bg-base)',
  bgSurface: 'var(--bg-surface)',
  bgElevated: 'var(--bg-elevated)',
  borderSubtle: 'var(--border-subtle)',
  borderDefault: 'var(--border-default)',
  accent: 'var(--accent-primary)',
  accentGlow: 'var(--accent-glow)',
  sidebarBg: 'var(--sidebar-bg)',
  sidebarBgElevated: 'var(--sidebar-bg-elevated)',
  sidebarHover: 'var(--sidebar-hover)',
  sidebarActiveBg: 'var(--sidebar-active-bg)',
  sidebarActiveText: 'var(--sidebar-active-text)',
  sidebarText: 'var(--sidebar-text)',
  sidebarTextMuted: 'var(--sidebar-text-muted)',
  sidebarBorder: 'var(--sidebar-border)',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-muted)',
  success: 'var(--success)',
  hover: 'var(--hover-subtle)',
  pressed: 'var(--pressed-surface)',
  shadow: 'var(--shadow-md)',
  radiusSm: 'var(--radius-sm)',
  radiusMd: 'var(--radius-md)',
  radiusLg: 'var(--radius-lg)',
  transition: 'var(--transition)'
}

const normalizePlan = (value) => {
  const raw = typeof value === 'string'
    ? value
    : value?.plan || value?.current_plan || value?.name || value?.code || null
  const plan = raw ? String(raw).toUpperCase() : null

  if (plan === 'TRIAL') return 'PRO'
  return ['ESSENTIAL', 'PRO', 'GROUP'].includes(plan) ? plan : null
}

// ── Navigation cabinet — filtrée par plan ─────────────────────────────────────
const ALL_NAV = [
  { name:"Tableau de bord", href:"/",            icon:Home,         plans:['ESSENTIAL','PRO','GROUP','TRIAL'] },
  { name:"Patients",        href:"/patients",    icon:Users,        plans:['ESSENTIAL','PRO','GROUP','TRIAL'] },
  { name:"Rendez-vous",     href:"/appointments",icon:Calendar,     plans:['ESSENTIAL','PRO','GROUP','TRIAL'] },
  { name:"Devis",           href:"/quotes",      icon:FileText,     plans:['ESSENTIAL','PRO','GROUP','TRIAL'] },
  { name:"Factures",        href:"/invoices",    icon:FileText,     plans:['ESSENTIAL','PRO','GROUP','TRIAL'] },
  { name:"Achats",          href:"/purchases",   icon:ShoppingCart, plans:['PRO','GROUP'] },
  { name:"Fournisseurs",    href:"/suppliers",   icon:Truck,        plans:['PRO','GROUP'] },
  { name:"Laboratoire",     href:"/lab",         icon:FlaskConical, plans:['PRO','GROUP'] },
  { name:"Rapports",        href:"/reports",     icon:BarChart3,    plans:['PRO','GROUP'] },
  { name:"Stock",           href:"/inventory",   icon:Package,      plans:['PRO','GROUP'] },
  { name:"Mailing",         href:"/mailing",     icon:Mail,         plans:['PRO','GROUP'] },
  { name:"Paramètres",      href:"/settings",    icon:Settings,     plans:['ESSENTIAL','PRO','GROUP','TRIAL'] },
  { name:"Tarifs des actes", href:"/settings/pricing", icon:FileText, plans:['ESSENTIAL','PRO','GROUP','TRIAL'] },
  { name:"Abonnement",      href:"/subscription",icon:CreditCard,    plans:['ESSENTIAL','PRO','GROUP','TRIAL'] },
]

// ── Navigation SUPER_ADMIN — gestion plateforme uniquement ────────────────────
const SUPER_ADMIN_NAV = [
  { name:'Dashboard revenus',       href:'/subscription',   icon:LayoutDashboard },
  { name:'Cabinets abonnés',        href:'/admin/clinics',  icon:Building2 },
  { name:'Validation paiements',    href:'/admin/payments', icon:CreditCard },
  { name:'Fournisseurs partenaires',href:'/admin/partners', icon:Truck },
]

const NAV_COLORS = {
  '/': theme.accent,
  '/patients': theme.accent,
  '/appointments': theme.accent,
  '/quotes': theme.accent,
  '/invoices': theme.accent,
  '/reports': theme.accent,
  '/inventory': theme.accent,
  '/purchases': theme.accent,
  '/suppliers': theme.accent,
  '/lab': theme.accent,
  '/mailing': theme.accent,
  '/settings': theme.accent,
  '/settings/pricing': theme.accent,
  '/subscription': theme.accent,
}

// ── Plan requis par item verrouillé ───────────────────────────────────────────
const PLAN_REQUIRED = (item) => item.plans.includes('GROUP') && !item.plans.includes('PRO') ? 'GROUP' : 'PRO'

// ── Hook screen size ──────────────────────────────────────────────────────────
const useScreenSize = () => {
  const [w, setW] = useState(window.innerWidth)
  useEffect(() => {
    const h = () => setW(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return { isMobile: w < 768, isTablet: w >= 768 && w < 1024, isDesktop: w >= 1024 }
}

const LogoCSS = () => <style>{`
  @keyframes logoBadge { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
`}</style>

const DentalLogo = ({ size=36 }) => (
  <div style={{ width:size, height:size, borderRadius:'50%', overflow:'hidden', flexShrink:0, display:'block',
    boxShadow: theme.shadow }}>
    <img src="/fix-logo.jpeg" alt="DPM"
      style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center', display:'block' }}/>
  </div>
)

const sidebarShell = {
  height:'100%',
  display:'flex',
  flexDirection:'column',
  background: theme.sidebarBg,
  boxShadow: theme.shadow,
  borderRight:`1px solid ${theme.sidebarBorder}`,
  position:'relative',
  overflow:'hidden'
}

// ── SidebarContent ────────────────────────────────────────────────────────────
const SidebarContent = ({ collapsed, onNavClick }) => {
  const location  = useLocation()
  const { user }  = useAuth()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const [subscription, setSubscription] = useState(null)
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false)

  // Plan lu depuis localStorage — fallback uniquement
  const cachedPlan = React.useMemo(() => {
    try {
      return normalizePlan(JSON.parse(localStorage.getItem('dpm_plan') || localStorage.getItem('dpm_user_plan') || 'null'))
    } catch { return null }
  }, [user?.id])

  useEffect(() => {
    let cancelled = false

    const loadSubscription = async () => {
      if (!user || isSuperAdmin) {
        if (!cancelled) {
          setSubscription(null)
          setSubscriptionLoaded(true)
        }
        return
      }

      setSubscriptionLoaded(false)
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get(`${API}/subscription/status`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        if (!cancelled) setSubscription(response.data || null)
      } catch (error) {
        if (!cancelled) setSubscription(null)
      } finally {
        if (!cancelled) setSubscriptionLoaded(true)
      }
    }

    loadSubscription()
    return () => { cancelled = true }
  }, [user?.id, isSuperAdmin])

  // Plan effectif — toujours celui de l'abonnement actif si disponible
  const plan = isSuperAdmin ? 'SUPER_ADMIN'
    : (
      normalizePlan(subscription?.plan || subscription) ||
      normalizePlan(user?.current_plan || user?.plan || user) ||
      cachedPlan ||
      'ESSENTIAL'
    )

  const planLabel = isSuperAdmin
    ? 'Administration'
    : (subscription?.status === 'TRIAL'
      ? `${plan} — Essai`
      : plan)

  const planPrice = {
    ESSENTIAL: '149 000 Ar/mois',
    PRO: '199 000 Ar/mois',
    GROUP: '299 000 Ar/mois'
  }[plan] || null

  // Items accessibles et verrouillés
  const navItems    = isSuperAdmin ? [] : ALL_NAV.filter(i => i.plans.includes(plan))
  const lockedItems = isSuperAdmin ? [] : ALL_NAV.filter(i => !i.plans.includes(plan))

  const isActive = href => {
    if (href === '/') return location.pathname === '/'
    if (href === '/settings') return location.pathname === '/settings'
    return location.pathname === href || location.pathname.startsWith(href + '/')
  }

  // Composant item nav cabinet
  const NavItem = ({ item }) => {
    const active = isActive(item.href)
    const Icon   = item.icon
    const color  = NAV_COLORS[item.href] || theme.accent
    const prefetch = React.useMemo(() => createHoverPrefetch(item.href), [item.href])
    return (
      <Link to={item.href} onClick={onNavClick} {...prefetch} style={{ textDecoration:'none', display:'block', marginBottom:2 }}>
        <div title={collapsed ? item.name : ''}
          style={{ display:'flex', alignItems:'center', gap:10, padding: collapsed ? '10px 0' : '10px 16px',
            borderRadius:theme.radiusSm, cursor:'pointer', justifyContent: collapsed ? 'center' : 'flex-start',
            background: active ? theme.sidebarActiveBg : 'transparent',
            border: active ? `1px solid ${theme.sidebarBorder}` : '1px solid transparent',
            boxShadow: active ? 'var(--shadow-sm)' : 'none',
            transition:theme.transition, position:'relative' }}
          onMouseEnter={e=>{ if(!active){ e.currentTarget.style.background=theme.sidebarHover; e.currentTarget.style.borderColor=theme.sidebarBorder; }}}
          onMouseLeave={e=>{ if(!active){ e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='transparent'; }}}>
          {active && <div style={{ position:'absolute', left:0, top:'22%', bottom:'22%', width:2, borderRadius:'0 4px 4px 0', background:color, boxShadow:'0 0 12px var(--accent-glow)' }}/>}
          <div style={{ width:32, height:32, borderRadius:theme.radiusMd, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background: active ? theme.accentGlow : theme.sidebarHover, transition:theme.transition }}>
            <Icon size={16} color={active ? color : theme.sidebarText}/>
          </div>
          {!collapsed && (
            <span style={{ fontSize:'var(--text-sm)', fontWeight: active ? 700 : 500, color: active ? theme.sidebarActiveText : theme.sidebarText, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', transition:theme.transition }}>
              {item.name}
            </span>
          )}
        </div>
      </Link>
    )
  }

  // Composant item admin
  const AdminItem = ({ item }) => {
    const active = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
    const Icon   = item.icon
    const color = theme.accent
    const prefetch = React.useMemo(() => createHoverPrefetch(item.href), [item.href])
    return (
      <Link to={item.href} onClick={onNavClick} {...prefetch} style={{ textDecoration:'none', display:'block', marginBottom:2 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding: collapsed ? '10px 0' : '10px 16px',
          borderRadius:theme.radiusSm, cursor:'pointer', justifyContent: collapsed ? 'center' : 'flex-start',
          background: active ? theme.sidebarActiveBg : 'transparent',
          border: active ? `1px solid ${theme.sidebarBorder}` : '1px solid transparent',
          boxShadow: active ? 'var(--shadow-sm)' : 'none',
          transition:theme.transition, position:'relative' }}
          onMouseEnter={e=>{ if(!active) e.currentTarget.style.background=theme.sidebarHover; }}
          onMouseLeave={e=>{ if(!active) e.currentTarget.style.background='transparent'; }}>
          {active && <div style={{ position:'absolute', left:0, top:'22%', bottom:'22%', width:2, borderRadius:'0 4px 4px 0', background:color }}/>}
          <div style={{ width:32, height:32, borderRadius:theme.radiusMd, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background: active ? theme.accentGlow : theme.sidebarHover }}>
            <Icon size={16} color={active ? color : theme.sidebarText}/>
          </div>
          {!collapsed && (
            <span style={{ fontSize:'var(--text-sm)', fontWeight: active ? 700 : 500, color: active ? color : theme.sidebarText, whiteSpace:'nowrap' }}>
              {item.name}
            </span>
          )}
        </div>
      </Link>
    )
  }

  return (
    <div style={sidebarShell}>
      <LogoCSS/>

      {/* Logo */}
      <div style={{ padding: collapsed ? '16px 0' : '16px 14px', borderBottom:`1px solid ${theme.sidebarBorder}`, display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'flex-start', gap:10, minHeight:64, position:'relative', zIndex:1 }}>
        <DentalLogo size={40}/>
        {!collapsed && (
          <div style={{ overflow:'hidden', flex:1 }}>
            <p style={{ fontFamily:'var(--font-sans)', fontWeight:800, fontSize:15, color:theme.sidebarText, margin:0, whiteSpace:'nowrap' }}>DPM Madagascar</p>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:theme.success, animation:'logoBadge 2s ease-in-out infinite' }}/>
              <p style={{ fontSize:10, color:theme.sidebarTextMuted, margin:0, fontWeight:600 }}>
                {isSuperAdmin ? 'Administration' : 'Cabinet dentaire'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding: collapsed ? '12px 8px' : '12px', overflowY:'auto', overflowX:'hidden', scrollbarWidth:'none', position:'relative', zIndex:1 }}>

        {/* ── SUPER_ADMIN ── */}
        {isSuperAdmin && (
          <>
            {!collapsed && (
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 8px 10px' }}>
                <Sparkles size={10} color={theme.accent}/>
                <p style={{ fontSize:10, fontWeight:800, color:theme.accent, textTransform:'uppercase', letterSpacing:0, margin:0 }}>Administration plateforme</p>
              </div>
            )}
            {SUPER_ADMIN_NAV.map(item => <AdminItem key={item.href} item={item}/>)}
          </>
        )}

        {/* ── Cabinet — items du plan ── */}
        {!isSuperAdmin && (
          <>
            {!collapsed && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 8px 8px' }}>
                <p style={{ fontSize:10, fontWeight:800, color:theme.sidebarTextMuted, textTransform:'uppercase', letterSpacing:0, margin:0 }}>Navigation</p>
                {plan && <span style={{ fontSize:9, fontWeight:800, background:theme.sidebarHover, color:theme.sidebarText, padding:'2px 7px', borderRadius:99, border:`1px solid ${theme.sidebarBorder}` }}>{planLabel}</span>}
              </div>
            )}

            {/* Items accessibles */}
            {navItems.map(item => <NavItem key={item.href} item={item}/>)}

            {/* Items verrouillés */}
            {lockedItems.length > 0 && (
              <div style={{ marginTop:6 }}>
                {/* Séparateur */}
                {!collapsed && (
                  <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 8px 6px', opacity:.5 }}>
                    <Lock size={9} color={theme.sidebarTextMuted}/>
                    <p style={{ fontSize:9, fontWeight:700, color:theme.sidebarTextMuted, textTransform:'uppercase', letterSpacing:0, margin:0 }}>
                      Disponible en {PLAN_REQUIRED(lockedItems[0])}
                    </p>
                  </div>
                )}
                {/* Items non disponibles */}
                <div style={{ pointerEvents:'none', userSelect:'none', opacity:.46 }}>
                  {lockedItems.map(item => {
                    const Icon = item.icon
                    return (
                      <div key={item.href} style={{ display:'flex', alignItems:'center', gap:10, padding: collapsed ? '10px 0' : '10px 16px', borderRadius:theme.radiusSm, marginBottom:2, justifyContent: collapsed ? 'center' : 'flex-start' }}>
                        <div style={{ width:32, height:32, borderRadius:theme.radiusMd, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:theme.sidebarHover }}>
                          <Icon size={16} color={theme.sidebarTextMuted}/>
                        </div>
                        {!collapsed && <span style={{ fontSize:'var(--text-sm)', fontWeight:500, color:theme.sidebarTextMuted, flex:1 }}>{item.name}</span>}
                      </div>
                    )
                  })}
                </div>
                {/* Bouton upgrade */}
                {!collapsed && (
                  <a href='/subscription' style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, margin:'8px 0 4px', padding:'9px', borderRadius:theme.radiusMd, background:theme.sidebarActiveBg, border:`1px solid ${theme.sidebarBorder}`, color:theme.sidebarActiveText, fontSize:11, fontWeight:800, textDecoration:'none' }}>
                    <Sparkles size={12}/> Upgrader mon plan
                  </a>
                )}
              </div>
            )}

            {/* Abonnement */}
            <div style={{ height:1, background:theme.sidebarBorder, margin:'12px 0 10px' }}/>
            {!collapsed && <p style={{ fontSize:10, fontWeight:800, color:theme.sidebarTextMuted, textTransform:'uppercase', letterSpacing:0, padding:'4px 8px 8px', margin:0 }}>Abonnement</p>}
            {!collapsed && !isSuperAdmin && subscriptionLoaded && (
              <div style={{ margin:'0 4px 8px', padding:'10px 12px', borderRadius:theme.radiusLg, background:theme.sidebarBgElevated, border:`1px solid ${theme.sidebarBorder}`, color:theme.sidebarTextMuted, fontSize:11, lineHeight:1.4 }}>
                <div style={{ fontWeight:700, color:theme.sidebarText, marginBottom:2 }}>{planLabel}</div>
                {planPrice && <div>{planPrice}</div>}
                {subscription?.status && (
                  <div style={{ marginTop:4, fontSize:10, color:theme.sidebarTextMuted }}>
                    Statut: {subscription.status}
                  </div>
                )}
              </div>
            )}
            <NavItem item={{ name:'Mon Abonnement', href:'/subscription', icon:CreditCard }}/>
          </>
        )}

      </nav>

      {/* User */}
      <div style={{ padding: collapsed ? '16px 0' : '16px', borderTop:`1px solid ${theme.sidebarBorder}`, display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'flex-start', gap:10, position:'relative', zIndex:1, background:theme.sidebarBgElevated }}>
        <div style={{ width:36, height:36, borderRadius:theme.radiusMd, flexShrink:0, background:theme.sidebarActiveBg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-sans)', fontWeight:800, fontSize:14, color:theme.sidebarActiveText, border:`1.5px solid ${theme.sidebarBorder}` }}>
          {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        {!collapsed && (
          <div style={{ overflow:'hidden', flex:1 }}>
            <p style={{ fontFamily:'var(--font-sans)', fontWeight:700, fontSize:13, color:theme.sidebarText, margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.full_name || 'Utilisateur'}</p>
            <p style={{ fontSize:11, color:theme.sidebarTextMuted, margin:'1px 0 0' }}>
              {isSuperAdmin ? 'Super Administrateur' : user?.role}
            </p>
          </div>
        )}
        <div style={{ width:8, height:8, borderRadius:'50%', background:theme.success, flexShrink:0, boxShadow:'0 0 0 2px var(--border-default)' }}/>
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export function ModernSidebar({ collapsed: controlledCollapsed, onCollapsedChange } = {}) {
  const { isMobile, isTablet } = useScreenSize()
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const collapsed = controlledCollapsed ?? internalCollapsed
  const setCollapsed = onCollapsedChange || setInternalCollapsed

  useEffect(() => { if (isTablet) setCollapsed(true); else if (!isMobile) setCollapsed(false); }, [isTablet, isMobile])
  useEffect(() => { setMobileOpen(false); }, [location.pathname])
  useEffect(() => {
    if (isMobile) document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen, isMobile])

  if (isMobile) {
    return (
      <>
        <button onClick={() => setMobileOpen(true)}
          style={{ position:'fixed', top:14, left:14, zIndex:1000, width:40, height:40, borderRadius:theme.radiusMd, background:theme.sidebarBg, border:`1px solid ${theme.sidebarBorder}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:theme.shadow }}>
          <Menu size={20} color={theme.sidebarText}/>
        </button>
        {mobileOpen && <div onClick={() => setMobileOpen(false)} style={{ position:'fixed', inset:0, background:'var(--bg-overlay)', zIndex:1001, backdropFilter:'blur(8px)' }}/>}
        <div style={{ position:'fixed', left:0, top:0, bottom:0, width:280, zIndex:1002, transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)', transition:'transform .3s cubic-bezier(.4,0,.2,1)' }}>
          <button onClick={() => setMobileOpen(false)}
            style={{ position:'absolute', top:14, right:14, zIndex:1, width:32, height:32, borderRadius:theme.radiusSm, background:theme.bgElevated, border:`1px solid ${theme.borderDefault}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:theme.textPrimary }}>
            <X size={16}/>
          </button>
          <SidebarContent collapsed={false} onNavClick={() => setMobileOpen(false)}/>
        </div>
      </>
    )
  }

  return (
    <div className="dpm-sidebar-desktop" style={{ position:'fixed', left:0, top:0, bottom:0, width: collapsed ? 72 : 264, zIndex:100, transition:'width .25s cubic-bezier(.4,0,.2,1)', flexShrink:0 }}>
      <SidebarContent collapsed={collapsed} onNavClick={null}/>
      <button onClick={() => setCollapsed(!collapsed)}
        style={{ position:'absolute', top:72, right:-12, width:24, height:24, borderRadius:'50%', background:theme.bgElevated, border:`1.5px solid ${theme.borderDefault}`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:theme.shadow, zIndex:101 }}
        onMouseEnter={e=>e.currentTarget.style.background=theme.pressed}
        onMouseLeave={e=>e.currentTarget.style.background=theme.bgElevated}>
        {collapsed ? <ChevronRight size={12} color={theme.textSecondary}/> : <ChevronLeft size={12} color={theme.textSecondary}/>}
      </button>
    </div>
  )
}
