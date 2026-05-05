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

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8001/api'
    : '/api'

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
  { name:"Rapports",        href:"/reports",     icon:BarChart3,    plans:['PRO','GROUP'] },
  { name:"Inventaire",      href:"/inventory",   icon:Package,      plans:['PRO','GROUP'] },
  { name:"Achats",          href:"/purchases",   icon:ShoppingCart, plans:['PRO','GROUP'] },
  { name:"Fournisseurs",    href:"/suppliers",   icon:Truck,        plans:['PRO','GROUP'] },
  { name:"Laboratoire",     href:"/lab",         icon:FlaskConical, plans:['PRO','GROUP'] },
  { name:"Mailing",         href:"/mailing",     icon:Mail,         plans:['PRO','GROUP'] },
  { name:"Paramètres",      href:"/settings",    icon:Settings,     plans:['ESSENTIAL','PRO','GROUP','TRIAL'] },
  { name:"Tarifs des actes", href:"/settings/pricing", icon:FileText, plans:['ESSENTIAL','PRO','GROUP','TRIAL'] },
]

// ── Navigation SUPER_ADMIN — gestion plateforme uniquement ────────────────────
const SUPER_ADMIN_NAV = [
  { name:'Dashboard revenus',       href:'/subscription',   icon:LayoutDashboard, color:'#8B5CF6' },
  { name:'Cabinets abonnés',        href:'/admin/clinics',  icon:Building2,       color:'#0D7A87' },
  { name:'Validation paiements',    href:'/admin/payments', icon:CreditCard,      color:'#F59E0B' },
  { name:'Fournisseurs partenaires',href:'/admin/partners', icon:Truck,           color:'#10B981' },
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
  '/settings/pricing': '#6B7280',
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
    boxShadow:'0 2px 10px rgba(255,255,255,.2), 0 4px 18px rgba(0,0,0,.25)' }}>
    <img src="/fix-logo.jpeg" alt="DPM"
      style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'center', display:'block' }}/>
  </div>
)

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

  const isActive = href => href === '/' ? location.pathname === '/' : location.pathname.startsWith(href)

  // Composant item nav cabinet
  const NavItem = ({ item }) => {
    const active = isActive(item.href)
    const Icon   = item.icon
    const color  = NAV_COLORS[item.href] || '#0D7A87'
    return (
      <Link to={item.href} onClick={onNavClick} style={{ textDecoration:'none', display:'block', marginBottom:2 }}>
        <div title={collapsed ? item.name : ''}
          style={{ display:'flex', alignItems:'center', gap:10, padding: collapsed ? '10px 0' : '9px 10px',
            borderRadius:10, cursor:'pointer', justifyContent: collapsed ? 'center' : 'flex-start',
            background: active ? 'rgba(255,255,255,.18)' : 'transparent',
            border: active ? '1px solid rgba(255,255,255,.25)' : '1px solid transparent',
            transition:'all .18s', position:'relative' }}
          onMouseEnter={e=>{ if(!active){ e.currentTarget.style.background='rgba(255,255,255,.1)'; e.currentTarget.style.borderColor='rgba(255,255,255,.15)'; }}}
          onMouseLeave={e=>{ if(!active){ e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor='transparent'; }}}>
          {active && <div style={{ position:'absolute', left:0, top:'20%', bottom:'20%', width:3, borderRadius:'0 3px 3px 0', background:'#fff', boxShadow:'0 0 8px rgba(255,255,255,.5)' }}/>}
          <div style={{ width:32, height:32, borderRadius:8, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background: active ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.08)', transition:'all .18s' }}>
            <Icon size={16} color={active ? color : 'rgba(255,255,255,.55)'}/>
          </div>
          {!collapsed && (
            <span style={{ fontSize:13, fontWeight: active ? 700 : 500, color: active ? '#fff' : 'rgba(255,255,255,.6)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', transition:'all .18s' }}>
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
    return (
      <Link to={item.href} onClick={onNavClick} style={{ textDecoration:'none', display:'block', marginBottom:2 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding: collapsed ? '10px 0' : '9px 10px',
          borderRadius:10, cursor:'pointer', justifyContent: collapsed ? 'center' : 'flex-start',
          background: active ? 'rgba(255,255,255,.18)' : 'transparent',
          border: active ? '1px solid rgba(255,255,255,.25)' : '1px solid transparent',
          transition:'all .18s', position:'relative' }}
          onMouseEnter={e=>{ if(!active) e.currentTarget.style.background='rgba(255,255,255,.1)'; }}
          onMouseLeave={e=>{ if(!active) e.currentTarget.style.background='transparent'; }}>
          {active && <div style={{ position:'absolute', left:0, top:'20%', bottom:'20%', width:3, borderRadius:'0 3px 3px 0', background:'#fff' }}/>}
          <div style={{ width:32, height:32, borderRadius:8, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background: active ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.08)' }}>
            <Icon size={16} color={active ? item.color : 'rgba(255,255,255,.55)'}/>
          </div>
          {!collapsed && (
            <span style={{ fontSize:13, fontWeight: active ? 700 : 500, color: active ? '#fff' : 'rgba(255,255,255,.6)', whiteSpace:'nowrap' }}>
              {item.name}
            </span>
          )}
        </div>
      </Link>
    )
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', background:'linear-gradient(180deg,#064E56 0%,#0A6B75 50%,#0D7A87 100%)', boxShadow:'4px 0 24px rgba(0,0,0,.2)', borderRight:'1px solid rgba(255,255,255,.1)' }}>
      <LogoCSS/>

      {/* Logo */}
      <div style={{ padding: collapsed ? '16px 0' : '16px 14px', borderBottom:'1px solid rgba(255,255,255,.12)', display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'flex-start', gap:10, minHeight:64 }}>
        <DentalLogo size={40}/>
        {!collapsed && (
          <div style={{ overflow:'hidden', flex:1 }}>
            <p style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:15, color:'#fff', margin:0, whiteSpace:'nowrap' }}>DPM Madagascar</p>
            <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:2 }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#22C55E', animation:'logoBadge 2s ease-in-out infinite' }}/>
              <p style={{ fontSize:10, color:'rgba(255,255,255,.55)', margin:0, fontWeight:600 }}>
                {isSuperAdmin ? 'Administration' : 'Cabinet dentaire'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding: collapsed ? '12px 8px' : '12px', overflowY:'auto', overflowX:'hidden', scrollbarWidth:'none' }}>

        {/* ── SUPER_ADMIN ── */}
        {isSuperAdmin && (
          <>
            {!collapsed && (
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 8px 10px' }}>
                <Sparkles size={10} color="#8B5CF6"/>
                <p style={{ fontSize:10, fontWeight:700, color:'#8B5CF6', textTransform:'uppercase', letterSpacing:'.1em', margin:0 }}>Administration plateforme</p>
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
                <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'.1em', margin:0 }}>Navigation</p>
                {plan && <span style={{ fontSize:9, fontWeight:700, background:'rgba(255,255,255,.12)', color:'rgba(255,255,255,.7)', padding:'2px 7px', borderRadius:99 }}>{planLabel}</span>}
              </div>
            )}

            {/* Items accessibles */}
            {navItems.map(item => <NavItem key={item.href} item={item}/>)}

            {/* Items verrouillés — floutés */}
            {lockedItems.length > 0 && (
              <div style={{ marginTop:6 }}>
                {/* Séparateur */}
                {!collapsed && (
                  <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 8px 6px', opacity:.5 }}>
                    <Lock size={9} color="rgba(255,255,255,.5)"/>
                    <p style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'.1em', margin:0 }}>
                      Disponible en {PLAN_REQUIRED(lockedItems[0])}
                    </p>
                  </div>
                )}
                {/* Items floutés */}
                <div style={{ filter:'blur(2px)', pointerEvents:'none', userSelect:'none', opacity:.4 }}>
                  {lockedItems.map(item => {
                    const Icon = item.icon
                    return (
                      <div key={item.href} style={{ display:'flex', alignItems:'center', gap:10, padding: collapsed ? '10px 0' : '9px 10px', borderRadius:10, marginBottom:2, justifyContent: collapsed ? 'center' : 'flex-start' }}>
                        <div style={{ width:32, height:32, borderRadius:8, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,.08)' }}>
                          <Icon size={16} color='rgba(255,255,255,.5)'/>
                        </div>
                        {!collapsed && <span style={{ fontSize:13, fontWeight:500, color:'rgba(255,255,255,.5)', flex:1 }}>{item.name}</span>}
                      </div>
                    )
                  })}
                </div>
                {/* Bouton upgrade */}
                {!collapsed && (
                  <a href='/subscription' style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, margin:'6px 0 4px', padding:'8px', borderRadius:10, background:'rgba(99,91,255,.25)', border:'1px solid rgba(99,91,255,.4)', color:'#C4B5FD', fontSize:11, fontWeight:700, textDecoration:'none' }}>
                    ✦ Upgrader mon plan
                  </a>
                )}
              </div>
            )}

            {/* Abonnement */}
            <div style={{ height:1, background:'rgba(255,255,255,.12)', margin:'10px 0' }}/>
            {!collapsed && <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'.1em', padding:'4px 8px 8px', margin:0 }}>Abonnement</p>}
            {!collapsed && !isSuperAdmin && subscriptionLoaded && (
              <div style={{ padding:'0 8px 8px', color:'rgba(255,255,255,.72)', fontSize:11, lineHeight:1.4 }}>
                <div style={{ fontWeight:700, color:'#fff', marginBottom:2 }}>{planLabel}</div>
                {planPrice && <div>{planPrice}</div>}
                {subscription?.status && (
                  <div style={{ marginTop:4, fontSize:10, color:'rgba(255,255,255,.5)' }}>
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
      <div style={{ padding: collapsed ? '16px 0' : '16px', borderTop:'1px solid rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'flex-start', gap:10 }}>
        <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:14, color:'#fff', border:'1.5px solid rgba(255,255,255,.3)' }}>
          {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        {!collapsed && (
          <div style={{ overflow:'hidden', flex:1 }}>
            <p style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:13, color:'#fff', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.full_name || 'Utilisateur'}</p>
            <p style={{ fontSize:11, color:'rgba(255,255,255,.45)', margin:'1px 0 0' }}>
              {isSuperAdmin ? 'Super Administrateur' : user?.role}
            </p>
          </div>
        )}
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#22C55E', flexShrink:0, boxShadow:'0 0 0 2px rgba(255,255,255,.3)' }}/>
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
          style={{ position:'fixed', top:14, left:14, zIndex:1000, width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,#064E56,#0D7A87)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(13,122,135,.35)' }}>
          <Menu size={20} color="#fff"/>
        </button>
        {mobileOpen && <div onClick={() => setMobileOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,.55)', zIndex:1001, backdropFilter:'blur(3px)' }}/>}
        <div style={{ position:'fixed', left:0, top:0, bottom:0, width:280, zIndex:1002, transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)', transition:'transform .3s cubic-bezier(.4,0,.2,1)' }}>
          <button onClick={() => setMobileOpen(false)}
            style={{ position:'absolute', top:14, right:14, zIndex:1, width:32, height:32, borderRadius:8, background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.25)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
            <X size={16}/>
          </button>
          <SidebarContent collapsed={false} onNavClick={() => setMobileOpen(false)}/>
        </div>
      </>
    )
  }

  return (
    <div style={{ position:'fixed', left:0, top:0, bottom:0, width: collapsed ? 72 : 264, zIndex:100, transition:'width .25s cubic-bezier(.4,0,.2,1)', flexShrink:0 }}>
      <SidebarContent collapsed={collapsed} onNavClick={null}/>
      <button onClick={() => setCollapsed(!collapsed)}
        style={{ position:'absolute', top:72, right:-12, width:24, height:24, borderRadius:'50%', background:'#fff', border:'1.5px solid #E2E8F0', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(15,23,42,.12)', zIndex:101 }}
        onMouseEnter={e=>e.currentTarget.style.background='#F8FAFC'}
        onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
        {collapsed ? <ChevronRight size={12} color="#475569"/> : <ChevronLeft size={12} color="#475569"/>}
      </button>
    </div>
  )
}
