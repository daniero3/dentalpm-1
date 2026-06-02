import React, { useState, useEffect, useRef } from "react"
import {
  Search, Bell, LogOut, User, Settings, ChevronDown, X,
  CalendarPlus, UserPlus, Receipt, FilePlus2, PackageCheck,
  ShoppingCart, BarChart3, FlaskConical, Truck, Mail, Crown,
  Command, Wifi, WifiOff, ArrowRight, Globe2
} from "lucide-react"
import { useAuth } from "../App"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { prefetchRoute } from "../utils/routePrefetch"
import { ThemeToggle } from "./theme-toggle"
import { useLanguage } from "./language-provider"

const useScreenSize = () => {
  const [w, setW] = useState(window.innerWidth)
  useEffect(() => {
    const h = () => setW(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return { isMobile: w < 768, isTablet: w >= 768 && w < 1024, width: w }
}

const QUICK_COMMANDS = [
  { labelKey:'nav.patients', descKey:'quick.patient.desc', href:'/patients', icon:UserPlus, groupKey:'group.actions' },
  { labelKey:'nav.appointments', descKey:'quick.appointment.desc', href:'/appointments', icon:CalendarPlus, groupKey:'group.actions' },
  { labelKey:'nav.invoices', descKey:'quick.invoice.desc', href:'/invoices', icon:Receipt, groupKey:'group.actions' },
  { labelKey:'nav.quotes', descKey:'quick.quote.desc', href:'/quotes', icon:FilePlus2, groupKey:'group.actions' },
  { labelKey:'nav.inventoryLong', descKey:'quick.inventory.desc', href:'/inventory', icon:PackageCheck, groupKey:'group.modules' },
  { labelKey:'nav.purchases', descKey:'quick.purchases.desc', href:'/purchases', icon:ShoppingCart, groupKey:'group.modules' },
  { labelKey:'nav.reports', descKey:'quick.reports.desc', href:'/reports', icon:BarChart3, groupKey:'group.modules' },
  { labelKey:'nav.lab', descKey:'quick.lab.desc', href:'/lab', icon:FlaskConical, groupKey:'group.modules' },
  { labelKey:'nav.suppliers', descKey:'quick.suppliers.desc', href:'/suppliers', icon:Truck, groupKey:'group.modules' },
  { labelKey:'nav.mailing', descKey:'quick.mailing.desc', href:'/mailing', icon:Mail, groupKey:'group.modules' },
  { labelKey:'nav.subscription', descKey:'quick.subscription.desc', href:'/subscription', icon:Crown, groupKey:'group.admin' },
  { labelKey:'nav.cabinetSettings', descKey:'quick.settings.desc', href:'/settings', icon:Settings, groupKey:'group.admin' },
]

const MADAGASCAR_TIME_ZONE = 'Indian/Antananarivo'

const formatMadagascarTime = (date, locale) =>
  date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: MADAGASCAR_TIME_ZONE
  })

const useDebouncedValue = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

const theme = {
  bgBase: 'var(--bg-base)',
  bgSurface: 'var(--bg-surface)',
  bgElevated: 'var(--bg-elevated)',
  borderSubtle: 'var(--border-subtle)',
  borderDefault: 'var(--border-default)',
  accent: 'var(--accent-primary)',
  accentHover: 'var(--accent-hover)',
  accentGlow: 'var(--accent-glow)',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-muted)',
  success: 'var(--success)',
  danger: 'var(--danger)',
  hover: 'var(--hover-subtle)',
  pressed: 'var(--pressed-surface)',
  shadow: 'var(--shadow-md)',
  radiusSm: 'var(--radius-sm)',
  radiusMd: 'var(--radius-md)',
  radiusLg: 'var(--radius-lg)',
  transition: 'var(--transition)'
}

export function ModernTopbar() {
  const { user, logout } = useAuth()
  const { language, setLanguage, locale, options: languageOptions, t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const { isMobile, isTablet } = useScreenSize()
  const [searchTerm, setSearchTerm]       = useState('')
  const deferredSearchTerm                = React.useDeferredValue(searchTerm)
  const debouncedSearchTerm               = useDebouncedValue(deferredSearchTerm, 300)
  const [, startTransition]               = React.useTransition()
  const [searchOpen, setSearchOpen]       = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen]     = useState(false)
  const [online, setOnline]               = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine)
  const [now, setNow]                     = useState(() => new Date())
  const profileRef = useRef(null)
  const notifRef   = useRef(null)
  const searchRef  = useRef(null)
  const clockTimerRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setIsProfileOpen(false)
      if (notifRef.current   && !notifRef.current.contains(e.target))   setIsNotifOpen(false)
      if (searchRef.current  && !searchRef.current.contains(e.target))  setSearchOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') setSearchOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine)
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  useEffect(() => {
    const syncClock = () => setNow(new Date())
    const timeout = window.setTimeout(() => {
      syncClock()
      clockTimerRef.current = window.setInterval(syncClock, 60000)
    }, 60000 - (Date.now() % 60000))

    return () => {
      window.clearTimeout(timeout)
      if (clockTimerRef.current) window.clearInterval(clockTimerRef.current)
    }
  }, [])

  const handleLogout = (event) => {
    event?.preventDefault();
    event?.stopPropagation();
    setIsProfileOpen(false);
    setIsNotifOpen(false);
    setSearchOpen(false);
    logout();
    window.location.assign('/login');
  }
  const openCommand = () => setSearchOpen(true)
  const runCommand = (href) => {
    startTransition(() => navigate(href))
    setSearchOpen(false)
    setSearchTerm('')
  }

  const getRoleLabel = (role) => ({
    SUPER_ADMIN:t('role.superAdmin'), ADMIN:t('role.admin'),
    DENTIST:t('role.dentist'), ASSISTANT:t('role.assistant'), ACCOUNTANT:t('role.accountant')
  }[role] || role)

  const getRoleColor = (role) => ({
    SUPER_ADMIN:theme.accent, ADMIN:theme.accent,
    DENTIST:theme.accent, ASSISTANT:'var(--warning)', ACCOUNTANT:theme.success
  }[role] || theme.textSecondary)

  const topbarHeight = isMobile ? 56 : 64
  const topbarPL     = isMobile ? 62 : 24 // espace pour le bouton hamburger
  const clinicName = user?.clinic_name || user?.clinic?.name || user?.cabinet_name || t('label.defaultClinic')
  const commands = QUICK_COMMANDS.map(item => ({
    ...item,
    label: t(item.labelKey),
    desc: t(item.descKey),
    group: t(item.groupKey),
  }))
  const breadcrumb = ({
    '/':t('nav.dashboard'),
    '/patients':t('nav.patients'),
    '/appointments':t('nav.appointments'),
    '/quotes':t('nav.quotes'),
    '/invoices':t('nav.invoices'),
    '/reports':t('nav.reports'),
    '/inventory':t('nav.inventory'),
    '/purchases':t('nav.purchases'),
    '/suppliers':t('nav.suppliers'),
    '/lab':t('nav.lab'),
    '/mailing':t('nav.mailing'),
    '/settings':t('nav.settings'),
    '/subscription':t('nav.subscription'),
    '/admin/clinics':t('nav.clinics'),
    '/admin/payments':t('nav.payments'),
    '/admin/partners':t('nav.partners')
  })[location.pathname] || commands.find(item => location.pathname.startsWith(item.href))?.label || t('nav.dentalpm')
  const filteredCommands = commands.filter(c => {
    const q = debouncedSearchTerm.trim().toLowerCase()
    if (!q) return true
    return `${c.label} ${c.desc} ${c.group}`.toLowerCase().includes(q)
  }).slice(0, 8)
  const groupedCommands = filteredCommands.reduce((acc, item) => {
    acc[item.group] = acc[item.group] || []
    acc[item.group].push(item)
    return acc
  }, {})

  return (
    <>
      <header className="dpm-app-topbar" style={{
        height: topbarHeight,
        background: theme.bgSurface,
        backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${theme.borderSubtle}`,
        display: 'flex', alignItems: 'center',
        padding: isMobile
          ? `0 max(12px, env(safe-area-inset-right)) 0 ${topbarPL}px`
          : `0 16px 0 ${topbarPL}px`,
        gap: 12,
        position: 'sticky', top: 0, zIndex: 90,
        boxShadow: theme.shadow,
        overflow: 'visible',
        contain: 'none',
      }}>

        {!isMobile && (
          <div style={{ minWidth: 150, maxWidth: 240 }}>
            <p style={{ margin:0, fontSize:'var(--text-xs)', fontWeight:'var(--font-medium)', color:theme.textSecondary }}>DentalPM</p>
            <p style={{ margin:0, fontSize:'var(--text-base)', fontWeight:'var(--font-semibold)', color:theme.textPrimary, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{breadcrumb}</p>
          </div>
        )}

        {/* ── Search — desktop/tablette ── */}
        {!isMobile && (
          <div style={{ flex:1, maxWidth: isTablet ? 240 : 380, position:'relative' }}>
            <Search size={15} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:theme.textSecondary, pointerEvents:'none' }} />
            <input type="text" placeholder={t('topbar.searchPlaceholder')}
              value={searchTerm} onChange={e => {
                const value = e.target.value
                startTransition(() => setSearchTerm(value))
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && filteredCommands[0]) runCommand(filteredCommands[0].href)
              }}
              style={{ width:'100%', height:38, paddingLeft:40, paddingRight:14, borderRadius:99, border:`1.5px solid ${theme.borderDefault}`, background:theme.bgBase, fontSize:13, fontFamily:'var(--font-sans)', color:theme.textPrimary, outline:'none', transition:theme.transition, boxSizing:'border-box' }}
              onFocus={e => { openCommand(); e.target.style.borderColor=theme.accent; e.target.style.background=theme.bgBase; e.target.style.boxShadow='0 0 0 3px var(--accent-glow)'; }}
              onBlur={e => { e.target.style.borderColor=theme.borderDefault; e.target.style.background=theme.bgBase; e.target.style.boxShadow='none'; }}
            />
            {!isTablet && (
              <div style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', display:'flex', alignItems:'center', gap:3, padding:'2px 7px', borderRadius:8, border:`1px solid ${theme.borderDefault}`, color:theme.textSecondary, fontSize:10, fontWeight:800, background:theme.bgElevated, pointerEvents:'none' }}>
                <Command size={10}/> K
              </div>
            )}
          </div>
        )}

        {/* ── Search icon — mobile ── */}
        {isMobile && (
          <button onClick={openCommand}
            style={{ width:36, height:36, borderRadius:theme.radiusSm, border:`1.5px solid ${theme.borderDefault}`, background:theme.bgElevated, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:theme.textSecondary }}>
            <Search size={16} />
          </button>
        )}

        <div style={{ flex:1 }} />

        {!isMobile && (
          <button type="button" onClick={() => navigate('/appointments')}
            style={{ height:38, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'var(--space-2)', padding:'0 var(--space-4)', borderRadius:theme.radiusMd, border:`1px solid ${theme.accent}`, background:theme.accent, color:theme.bgSurface, fontSize:'var(--text-sm)', fontWeight:'var(--font-semibold)', cursor:'pointer', boxShadow:'var(--shadow-sm)', transition:theme.transition }}
            onMouseEnter={e => { e.currentTarget.style.background=theme.accentHover; e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow=theme.shadow }}
            onMouseLeave={e => { e.currentTarget.style.background=theme.accent; e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='var(--shadow-sm)' }}
            onMouseDown={e => { e.currentTarget.style.transform='scale(0.97)' }}
            onMouseUp={e => { e.currentTarget.style.transform='translateY(-1px)' }}>
            <CalendarPlus size={16} />
            {t('topbar.newAppointment')}
          </button>
        )}

        {!isMobile && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:theme.radiusMd, border:`1px solid ${theme.borderDefault}`, background:theme.bgElevated, color: online ? theme.success : theme.danger, fontSize:12, fontWeight:800, whiteSpace:'nowrap' }}>
            {online ? <Wifi size={14}/> : <WifiOff size={14}/>}
            {online ? t('topbar.online') : t('topbar.offline')}
          </div>
        )}

        {!isMobile && !isTablet && (
          <div style={{ padding:'6px 10px', borderRadius:theme.radiusMd, background:theme.bgElevated, border:`1px solid ${theme.borderDefault}`, fontSize:12, fontWeight:800, color:theme.textSecondary, whiteSpace:'nowrap' }}>
            {formatMadagascarTime(now, locale)} {t('topbar.timezone')}
          </div>
        )}

        <label title={t('topbar.language')} style={{ height:38, display:'inline-flex', alignItems:'center', gap:7, padding:isMobile ? '0 8px' : '0 10px', borderRadius:theme.radiusMd, border:`1.5px solid ${theme.borderDefault}`, background:theme.bgElevated, color:theme.textSecondary }}>
          <Globe2 size={16} />
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            aria-label={t('topbar.language')}
            style={{ border:0, outline:0, background:'transparent', color:theme.textPrimary, fontSize:12, fontWeight:800, fontFamily:'var(--font-sans)', cursor:'pointer', width:isMobile ? 46 : 96 }}
          >
            {languageOptions.map(option => (
              <option key={option.value} value={option.value}>
                {isMobile ? option.short : option.label}
              </option>
            ))}
          </select>
        </label>

        <div style={{ width:38, height:38, borderRadius:theme.radiusMd, border:`1.5px solid ${theme.borderDefault}`, background:theme.bgElevated, display:'flex', alignItems:'center', justifyContent:'center', color:theme.textSecondary }}>
          <ThemeToggle />
        </div>

        {/* ── Notifications ── */}
        <div ref={notifRef} style={{ position:'relative' }}>
          <button onClick={() => setIsNotifOpen(!isNotifOpen)}
            style={{ width:38, height:38, borderRadius:theme.radiusMd, border:`1.5px solid ${theme.borderDefault}`, background:theme.bgElevated, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative', color:theme.textSecondary, transition:theme.transition }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=theme.accent; e.currentTarget.style.color=theme.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=theme.borderDefault; e.currentTarget.style.color=theme.textSecondary; }}>
            <Bell size={17} />
            <span style={{ position:'absolute', top:7, right:7, width:7, height:7, borderRadius:'50%', background:theme.accent, border:`2px solid ${theme.bgElevated}` }} />
          </button>
          {isNotifOpen && (
            <div style={{ position:'absolute', top:46, right:0, width: isMobile ? 'min(320px, calc(100vw - 24px))' : 320, background:theme.bgSurface, borderRadius:theme.radiusLg, border:`1px solid ${theme.borderSubtle}`, boxShadow:theme.shadow, zIndex:300, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:`1px solid ${theme.borderSubtle}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <p style={{ fontFamily:'var(--font-sans)', fontWeight:700, fontSize:14, color:theme.textPrimary, margin:0 }}>{t('notifications.title')}</p>
                <span style={{ fontSize:11, color:theme.accent, fontWeight:600, cursor:'pointer' }}>{t('notifications.markAllRead')}</span>
              </div>
              <div style={{ padding:'12px' }}>
                {[
                  { title:t('notifications.follow.title'), text:t('notifications.follow.text'), href:'/appointments', tone:theme.accent },
                  { title:t('notifications.finance.title'), text:t('notifications.finance.text'), href:'/reports', tone:theme.accent },
                ].map(item => (
                  <button key={item.title} onClick={() => { navigate(item.href); setIsNotifOpen(false) }}
                    style={{ width:'100%', display:'flex', gap:10, padding:'10px', border:'none', borderRadius:12, background:'transparent', cursor:'pointer', textAlign:'left' }}
                    onMouseEnter={e => e.currentTarget.style.background=theme.hover}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:item.tone, marginTop:5, flexShrink:0 }}/>
                    <div>
                      <div style={{ fontSize:13, fontWeight:800, color:theme.textPrimary }}>{item.title}</div>
                      <div style={{ fontSize:12, color:theme.textSecondary, lineHeight:1.35 }}>{item.text}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Profile ── */}
        <div ref={profileRef} style={{ position:'relative' }}>
          <button onClick={() => setIsProfileOpen(!isProfileOpen)}
            className='dpm-topbar-control' style={{ display:'flex', alignItems:'center', gap: isMobile ? 0 : 8, padding: isMobile ? 4 : '6px 10px 6px 6px', borderRadius:theme.radiusMd, border:`1.5px solid ${theme.borderDefault}`, background:theme.bgElevated, cursor:'pointer', transition:theme.transition }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=theme.accent; e.currentTarget.style.background=theme.pressed; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=theme.borderDefault; e.currentTarget.style.background=theme.bgElevated; }}>
            <div style={{ width:32, height:32, borderRadius:theme.radiusSm, flexShrink:0, background:theme.accentGlow, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-sans)', fontWeight:800, fontSize:13, color:theme.accent }}>
              {clinicName?.charAt(0)?.toUpperCase() || 'D'}
            </div>
            {!isMobile && (
              <>
                <div style={{ textAlign:'left' }}>
                  <p style={{ fontFamily:'var(--font-sans)', fontWeight:700, fontSize:13, color:theme.textPrimary, margin:0, lineHeight:1.2, whiteSpace:'nowrap' }}>
                    {clinicName}
                  </p>
                  <p style={{ fontSize:10, margin:0, color: getRoleColor(user?.role), fontWeight:700 }}>
                    {user?.full_name?.split(' ')[0] || getRoleLabel(user?.role)}
                  </p>
                </div>
                <ChevronDown size={13} color={theme.textSecondary} style={{ transition:'transform 0.2s', transform: isProfileOpen ? 'rotate(180deg)' : 'none' }} />
              </>
            )}
          </button>

          {isProfileOpen && (
            <div style={{ position:'absolute', top:50, right:0, width:isMobile ? 'min(260px, calc(100vw - 24px))' : 220, background:theme.bgSurface, borderRadius:theme.radiusLg, border:`1px solid ${theme.borderSubtle}`, boxShadow:theme.shadow, zIndex:300, overflow:'hidden' }}>
              <div style={{ padding:'14px 16px', borderBottom:`1px solid ${theme.borderSubtle}` }}>
                <p style={{ fontFamily:'var(--font-sans)', fontWeight:700, fontSize:14, color:theme.textPrimary, margin:0 }}>{user?.full_name}</p>
                <p style={{ fontSize:12, color:theme.textSecondary, margin:'2px 0 0' }}>{user?.email || user?.username}</p>
                <span style={{ display:'inline-block', marginTop:6, padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:700, background:theme.accentGlow, color: getRoleColor(user?.role) }}>
                  {getRoleLabel(user?.role)}
                </span>
              </div>
              {[
                { icon:User,     label:t('profile.myProfile'),  action:() => { setIsProfileOpen(false) } },
                { icon:Settings, label:t('profile.settings'),  action:() => { navigate('/settings'); setIsProfileOpen(false) } },
              ].map((item,i) => (
                <button key={i} onClick={item.action} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 16px', background:'none', border:'none', cursor:'pointer', fontSize:13, color:theme.textSecondary, fontFamily:'var(--font-sans)', transition:'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background=theme.hover}
                  onMouseLeave={e => e.currentTarget.style.background='none'}>
                  <item.icon size={15} color={theme.textSecondary} />{item.label}
                </button>
              ))}
              <div style={{ height:1, background:theme.borderSubtle, margin:'4px 0' }} />
              <button onClick={handleLogout} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 16px', background:'none', border:'none', cursor:'pointer', fontSize:13, color:theme.danger, fontFamily:'var(--font-sans)', fontWeight:600, transition:'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background=theme.hover}
                onMouseLeave={e => e.currentTarget.style.background='none'}>
                <LogOut size={15} color={theme.danger} />{t('profile.logout')}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Command palette ── */}
      {searchOpen && (
        <div style={{ position:'fixed', inset:0, background:'var(--bg-overlay)', zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'center', padding: isMobile ? 'max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))' : '72px 16px 16px', backdropFilter:'blur(8px)' }}
          onClick={() => setSearchOpen(false)}>
          <div style={{ background:theme.bgSurface, borderRadius:theme.radiusLg, padding:0, width:'100%', maxWidth:620, boxShadow:theme.shadow, border:`1px solid ${theme.borderSubtle}`, overflow:'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px', borderBottom:`1px solid ${theme.borderSubtle}` }}>
              <Search size={18} color={theme.accent} />
              <input type="text" placeholder={t('topbar.searchPlaceholder')} autoFocus
                value={searchTerm} onChange={e => {
                  const value = e.target.value
                  startTransition(() => setSearchTerm(value))
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && filteredCommands[0]) runCommand(filteredCommands[0].href)
                }}
                style={{ flex:1, border:'none', outline:'none', fontSize:15, fontFamily:'var(--font-sans)', color:theme.textPrimary, background:'transparent' }} />
              <button onClick={() => setSearchOpen(false)} style={{ width:32, height:32, borderRadius:theme.radiusMd, background:theme.bgElevated, border:`1px solid ${theme.borderDefault}`, cursor:'pointer', color:theme.textSecondary, display:'flex', alignItems:'center', justifyContent:'center' }}><X size={17} /></button>
            </div>
            <div style={{ maxHeight:isMobile ? '70vh' : 420, overflowY:'auto', padding:'10px' }}>
              {Object.keys(groupedCommands).length === 0 ? (
                <div style={{ padding:'30px 16px', textAlign:'center', color:theme.textSecondary, fontSize:13 }}>{t('command.empty')}</div>
              ) : Object.entries(groupedCommands).map(([group, items]) => (
                <div key={group} style={{ marginBottom:8 }}>
                  <div style={{ padding:'8px 8px 6px', fontSize:10, fontWeight:900, color:theme.textSecondary, textTransform:'uppercase', letterSpacing:0 }}>{group}</div>
                  {items.map(item => {
                    const Icon = item.icon
                    return (
                      <button key={item.href + item.label} onClick={() => runCommand(item.href)}
                        style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'11px 10px', border:'none', borderRadius:12, background:'transparent', cursor:'pointer', textAlign:'left' }}
                        onMouseEnter={e => { prefetchRoute(item.href); e.currentTarget.style.background=theme.hover }}
                        onFocus={() => prefetchRoute(item.href)}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <div style={{ width:38, height:38, borderRadius:theme.radiusMd, display:'flex', alignItems:'center', justifyContent:'center', background:theme.accentGlow, flexShrink:0 }}>
                          <Icon size={18} color={theme.accent} />
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:14, fontWeight:800, color:theme.textPrimary }}>{item.label}</div>
                          <div style={{ fontSize:12, color:theme.textSecondary, marginTop:1 }}>{item.desc}</div>
                        </div>
                        <ArrowRight size={16} color={theme.textMuted} />
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', gap:10, padding:'10px 14px', borderTop:`1px solid ${theme.borderSubtle}`, background:theme.bgElevated, fontSize:11, color:theme.textSecondary }}>
              <span>{t('command.enter')}</span>
              <span>{t('command.escape')}</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
