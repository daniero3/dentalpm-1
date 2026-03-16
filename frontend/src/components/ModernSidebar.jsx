import React, { useState, useEffect } from "react"
import {
  Home, Users, FileText, Calendar, Settings, Package, Truck,
  ShoppingCart, FlaskConical, Mail, ChevronLeft, ChevronRight,
  Building2, CreditCard, LayoutDashboard, BarChart3,
  Stethoscope, Sparkles
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "../App"

const navigation = [
  { name: "Tableau de bord", href: "/",            icon: Home },
  { name: "Patients",        href: "/patients",     icon: Users },
  { name: "Rendez-vous",     href: "/appointments", icon: Calendar },
  { name: "Devis",           href: "/quotes",       icon: FileText },
  { name: "Factures",        href: "/invoices",     icon: FileText },
  { name: "Rapports",        href: "/reports",      icon: BarChart3 },
  { name: "Inventaire",      href: "/inventory",    icon: Package },
  { name: "Achats",          href: "/purchases",    icon: ShoppingCart },
  { name: "Fournisseurs",    href: "/suppliers",    icon: Truck },
  { name: "Laboratoire",     href: "/lab",          icon: FlaskConical },
  { name: "Mailing",         href: "/mailing",      icon: Mail },
  { name: "Paramètres",      href: "/settings",     icon: Settings },
]

const adminNavigation = [
  { name: "Dashboard Admin",      href: "/admin",          icon: LayoutDashboard },
  { name: "Cliniques",            href: "/admin/clinics",  icon: Building2 },
  { name: "Validation Paiements", href: "/admin/payments", icon: CreditCard },
]

const billingNavigation = [
  { name: "Paiement/Abonnement", href: "/payment", icon: CreditCard },
]

// Couleurs pour chaque item de nav
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

export function ModernSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [clinicLogo, setClinicLogo]   = useState(null)
  const location = useLocation()
  const { user } = useAuth()

  useEffect(() => {
    const saved = localStorage.getItem('clinic_logo')
    if (saved) setClinicLogo(saved)
  }, [])

  const isActive = (href) => {
    if (href === '/') return location.pathname === '/'
    return location.pathname.startsWith(href)
  }

  return (
    <div style={{
      width: isCollapsed ? 72 : 264,
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #064E56 0%, #0A6B75 50%, #0D7A87 100%)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
      position: 'relative',
      flexShrink: 0,
      boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
      borderRight: '1px solid rgba(255,255,255,0.1)',
    }}>

      {/* ── Logo / Brand ── */}
      <div style={{
        padding: isCollapsed ? '20px 0' : '20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
          {/* Logo icon */}
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #fff, rgba(255,255,255,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(13,122,135,0.4)',
          }}>
            {clinicLogo
              ? <img src={clinicLogo} alt="Logo" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
              : <Stethoscope size={20} color="#0D7A87" />
            }
          </div>
          {!isCollapsed && (
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 14, color: '#fff', margin: 0, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                Dental Practice
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Madagascar</p>
            </div>
          )}
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.5)', flexShrink: 0,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', overflowX: 'hidden' }}>

        {/* Main nav */}
        <div style={{ marginBottom: 8 }}>
          {!isCollapsed && (
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 8px 8px', margin: 0 }}>
              Navigation
            </p>
          )}
          {navigation.map((item) => {
            const active = isActive(item.href)
            const Icon   = item.icon
            const color  = NAV_COLORS[item.href] || '#0D7A87'
            return (
              <Link key={item.name} to={item.href} style={{ textDecoration: 'none', display: 'block', marginBottom: 2 }}>
                <div
                  title={isCollapsed ? item.name : ''}
                  style={{
                    display: 'flex', alignItems: 'center',
                    gap: 10, padding: isCollapsed ? '10px 0' : '9px 10px',
                    borderRadius: 10, cursor: 'pointer',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    background: active
                      ? 'rgba(255,255,255,0.18)'
                      : 'transparent',
                    border: active
                      ? '1px solid rgba(255,255,255,0.25)'
                      : '1px solid transparent',
                    transition: 'all 0.18s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.borderColor = 'transparent'
                    }
                  }}
                >
                  {/* Active indicator */}
                  {active && (
                    <div style={{
                      position: 'absolute', left: 0, top: '20%', bottom: '20%',
                      width: 3, borderRadius: '0 3px 3px 0',
                      background: '#fff',
                      boxShadow: '0 0 8px rgba(255,255,255,0.5)',
                    }} />
                  )}

                  {/* Icon */}
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                    transition: 'all 0.18s ease',
                  }}>
                    <Icon size={16} color={active ? color : 'rgba(255,255,255,0.5)'} />
                  </div>

                  {/* Label */}
                  {!isCollapsed && (
                    <span style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 13, fontWeight: active ? 700 : 500,
                      color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      transition: 'all 0.18s ease',
                    }}>
                      {item.name}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>

        {/* Billing */}
        {user?.role !== 'SUPER_ADMIN' && (
          <div style={{ marginBottom: 8 }}>
            {!isCollapsed && (
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '12px 8px 8px', margin: 0 }}>
                Abonnement
              </p>
            )}
            {billingNavigation.map(item => {
              const active = isActive(item.href)
              const Icon   = item.icon
              return (
                <Link key={item.name} to={item.href} style={{ textDecoration: 'none', display: 'block', marginBottom: 2 }}>
                  <div
                    title={isCollapsed ? item.name : ''}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: isCollapsed ? '10px 0' : '9px 10px',
                      borderRadius: 10, cursor: 'pointer',
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                      background: active ? 'rgba(245,158,11,0.15)' : 'transparent',
                      border: active ? '1px solid rgba(245,158,11,0.25)' : '1px solid transparent',
                      transition: 'all 0.18s ease',
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent' }}}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)' }}>
                      <Icon size={16} color={active ? '#F59E0B' : 'rgba(255,255,255,0.5)'} />
                    </div>
                    {!isCollapsed && (
                      <span style={{ fontFamily: 'DM Sans', fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#F59E0B' : 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Super Admin */}
        {user?.role === 'SUPER_ADMIN' && (
          <div>
            {!isCollapsed && (
              <div style={{ padding: '12px 8px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={10} color='#8B5CF6' />
                <p style={{ fontSize: 10, fontWeight: 700, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                  Super Admin
                </p>
              </div>
            )}
            {adminNavigation.map(item => {
              const active = isActive(item.href)
              const Icon   = item.icon
              return (
                <Link key={item.name} to={item.href} style={{ textDecoration: 'none', display: 'block', marginBottom: 2 }}>
                  <div
                    title={isCollapsed ? item.name : ''}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: isCollapsed ? '10px 0' : '9px 10px',
                      borderRadius: 10, cursor: 'pointer',
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                      background: active ? 'rgba(139,92,246,0.15)' : 'transparent',
                      border: active ? '1px solid rgba(139,92,246,0.25)' : '1px solid transparent',
                      transition: 'all 0.18s ease',
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent' }}}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)' }}>
                      <Icon size={16} color={active ? '#8B5CF6' : 'rgba(255,255,255,0.5)'} />
                    </div>
                    {!isCollapsed && (
                      <span style={{ fontFamily: 'DM Sans', fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#A78BFA' : 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* ── User Profile ── */}
      <div style={{
        padding: isCollapsed ? '16px 0' : '16px',
        borderTop: '1px solid rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        gap: 10,
      }}>
        {/* Avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #fff, rgba(255,255,255,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 14, color: '#fff',
          boxShadow: '0 2px 8px rgba(13,122,135,0.3)',
        }}>
          {user?.full_name?.charAt(0)?.toUpperCase() || 'A'}
        </div>
        {!isCollapsed && (
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 13, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.full_name || 'Utilisateur'}
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
              {user?.role || 'Rôle'}
            </p>
          </div>
        )}

        {/* Online indicator */}
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#22C55E', flexShrink: 0,
          boxShadow: '0 0 0 2px rgba(255,255,255,0.3)',
          animation: 'pulse 2s ease-in-out infinite',
        }} />
      </div>
    </div>
  )
}
