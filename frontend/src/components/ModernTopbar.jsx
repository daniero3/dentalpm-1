import React, { useState, useEffect, useRef } from "react"
import {
  Search, Bell, LogOut, User, Settings, ChevronDown, X,
  CalendarPlus, UserPlus, Receipt, FilePlus2, PackageCheck,
  ShoppingCart, BarChart3, FlaskConical, Truck, Mail, Crown,
  Command, Wifi, WifiOff, ArrowRight
} from "lucide-react"
import { useAuth } from "../App"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

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
  { label:'Nouveau patient', desc:'Ouvrir le registre patient', href:'/patients', icon:UserPlus, group:'Actions' },
  { label:'Planifier un rendez-vous', desc:'Agenda et disponibilités', href:'/appointments', icon:CalendarPlus, group:'Actions' },
  { label:'Nouvelle facture', desc:'Facturation cabinet', href:'/invoices', icon:Receipt, group:'Actions' },
  { label:'Créer un devis', desc:'Devis et conversion facture', href:'/quotes', icon:FilePlus2, group:'Actions' },
  { label:'Stock et inventaire', desc:'Produits, seuils et mouvements', href:'/inventory', icon:PackageCheck, group:'Modules' },
  { label:'Achats et dépenses', desc:'Dépenses cabinet et médicaments', href:'/purchases', icon:ShoppingCart, group:'Modules' },
  { label:'Rapport financier', desc:'Chiffres, revenus et dépenses', href:'/reports', icon:BarChart3, group:'Modules' },
  { label:'Laboratoire', desc:'Commandes prothèses et statuts', href:'/lab', icon:FlaskConical, group:'Modules' },
  { label:'Fournisseurs', desc:'Carnet fournisseurs', href:'/suppliers', icon:Truck, group:'Modules' },
  { label:'Mailing', desc:'Messages et relances patient', href:'/mailing', icon:Mail, group:'Modules' },
  { label:'Abonnement', desc:'Plan et facturation SaaS', href:'/subscription', icon:Crown, group:'Administration' },
  { label:'Paramètres cabinet', desc:'Profil, équipe et configuration', href:'/settings', icon:Settings, group:'Administration' },
]

export function ModernTopbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { isMobile, isTablet } = useScreenSize()
  const [searchTerm, setSearchTerm]       = useState('')
  const [searchOpen, setSearchOpen]       = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen]     = useState(false)
  const [online, setOnline]               = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine)
  const [now, setNow]                     = useState(() => new Date())
  const profileRef = useRef(null)
  const notifRef   = useRef(null)
  const searchRef  = useRef(null)

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
    const timer = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  const handleLogout = () => { logout(); navigate('/login'); }
  const openCommand = () => setSearchOpen(true)
  const runCommand = (href) => {
    navigate(href)
    setSearchOpen(false)
    setSearchTerm('')
  }

  const getRoleLabel = (role) => ({
    SUPER_ADMIN:'Super Admin', ADMIN:'Administrateur',
    DENTIST:'Dentiste', ASSISTANT:'Assistante', ACCOUNTANT:'Comptable'
  }[role] || role)

  const getRoleColor = (role) => ({
    SUPER_ADMIN:'#8B5CF6', ADMIN:'#0D7A87',
    DENTIST:'#3B4FD8', ASSISTANT:'#F59E0B', ACCOUNTANT:'#0EA570'
  }[role] || '#64748B')

  const topbarHeight = isMobile ? 56 : 64
  const topbarPL     = isMobile ? 62 : 24 // espace pour le bouton hamburger
  const filteredCommands = QUICK_COMMANDS.filter(c => {
    const q = searchTerm.trim().toLowerCase()
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
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex', alignItems: 'center',
        padding: `0 16px 0 ${topbarPL}px`,
        gap: 12,
        position: 'sticky', top: 0, zIndex: 90,
        boxShadow: '0 1px 8px rgba(15,23,42,0.06)',
      }}>

        {/* ── Search — desktop/tablette ── */}
        {!isMobile && (
          <div style={{ flex:1, maxWidth: isTablet ? 280 : 440, position:'relative' }}>
            <Search size={15} style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#94A3B8', pointerEvents:'none' }} />
            <input type="text" placeholder="Rechercher patients, factures..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && filteredCommands[0]) runCommand(filteredCommands[0].href)
              }}
              style={{ width:'100%', height:38, paddingLeft:40, paddingRight:14, borderRadius:99, border:'1.5px solid #E2E8F0', background:'#F8FAFC', fontSize:13, fontFamily:'DM Sans,sans-serif', color:'#0F172A', outline:'none', transition:'all 0.18s', boxSizing:'border-box' }}
              onFocus={e => { openCommand(); e.target.style.borderColor='#0D7A87'; e.target.style.background='#fff'; e.target.style.boxShadow='0 0 0 3px rgba(13,122,135,0.10)'; }}
              onBlur={e => { e.target.style.borderColor='#E2E8F0'; e.target.style.background='#F8FAFC'; e.target.style.boxShadow='none'; }}
            />
            {!isTablet && (
              <div style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', display:'flex', alignItems:'center', gap:3, padding:'2px 7px', borderRadius:8, border:'1px solid #E2E8F0', color:'#94A3B8', fontSize:10, fontWeight:800, background:'#fff', pointerEvents:'none' }}>
                <Command size={10}/> K
              </div>
            )}
          </div>
        )}

        {/* ── Search icon — mobile ── */}
        {isMobile && (
          <button onClick={openCommand}
            style={{ width:36, height:36, borderRadius:8, border:'1.5px solid #E2E8F0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#64748B' }}>
            <Search size={16} />
          </button>
        )}

        <div style={{ flex:1 }} />

        {!isMobile && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:12, border:'1px solid #E2E8F0', background:'#fff', color: online ? '#0F766E' : '#B91C1C', fontSize:12, fontWeight:800, whiteSpace:'nowrap' }}>
            {online ? <Wifi size={14}/> : <WifiOff size={14}/>}
            {online ? 'Synchro active' : 'Hors ligne'}
          </div>
        )}

        {!isMobile && !isTablet && (
          <div style={{ padding:'6px 10px', borderRadius:12, background:'#F8FAFC', border:'1px solid #E2E8F0', fontSize:12, fontWeight:800, color:'#475569', whiteSpace:'nowrap' }}>
            {now.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}
          </div>
        )}

        {/* ── Notifications ── */}
        <div ref={notifRef} style={{ position:'relative' }}>
          <button onClick={() => setIsNotifOpen(!isNotifOpen)}
            style={{ width:38, height:38, borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative', color:'#64748B', transition:'all 0.18s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='#0D7A87'; e.currentTarget.style.color='#0D7A87'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.color='#64748B'; }}>
            <Bell size={17} />
            <span style={{ position:'absolute', top:7, right:7, width:7, height:7, borderRadius:'50%', background:'#0D7A87', border:'2px solid #fff' }} />
          </button>
          {isNotifOpen && (
            <div style={{ position:'absolute', top:46, right:0, width: isMobile ? 280 : 320, background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', boxShadow:'0 16px 48px rgba(15,23,42,0.12)', zIndex:200, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <p style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:14, color:'#0F172A', margin:0 }}>Notifications</p>
                <span style={{ fontSize:11, color:'#0D7A87', fontWeight:600, cursor:'pointer' }}>Tout marquer lu</span>
              </div>
              <div style={{ padding:'12px' }}>
                {[
                  { title:'Suivi du jour', text:'Vérifiez les rendez-vous et les factures en attente.', href:'/appointments', tone:'#0D7A87' },
                  { title:'Finance', text:'Ouvrir les rapports pour contrôler recettes et dépenses.', href:'/reports', tone:'#3B4FD8' },
                ].map(item => (
                  <button key={item.title} onClick={() => { navigate(item.href); setIsNotifOpen(false) }}
                    style={{ width:'100%', display:'flex', gap:10, padding:'10px', border:'none', borderRadius:12, background:'transparent', cursor:'pointer', textAlign:'left' }}
                    onMouseEnter={e => e.currentTarget.style.background='#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:item.tone, marginTop:5, flexShrink:0 }}/>
                    <div>
                      <div style={{ fontSize:13, fontWeight:800, color:'#0F172A' }}>{item.title}</div>
                      <div style={{ fontSize:12, color:'#64748B', lineHeight:1.35 }}>{item.text}</div>
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
            className='dpm-topbar-control' style={{ display:'flex', alignItems:'center', gap: isMobile ? 0 : 8, padding: isMobile ? 4 : '6px 10px 6px 6px', borderRadius:12, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', transition:'all 0.18s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='#0D7A87'; e.currentTarget.style.background='#F0F7F8'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.background='#fff'; }}>
            <div style={{ width:32, height:32, borderRadius:8, flexShrink:0, background:'linear-gradient(135deg,#0D7A87,#3B4FD8)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:13, color:'#fff' }}>
              {user?.full_name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            {!isMobile && (
              <>
                <div style={{ textAlign:'left' }}>
                  <p style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:13, color:'#0F172A', margin:0, lineHeight:1.2, whiteSpace:'nowrap' }}>
                    {user?.full_name?.split(' ')[0] || 'Utilisateur'}
                  </p>
                  <p style={{ fontSize:10, margin:0, color: getRoleColor(user?.role), fontWeight:700 }}>
                    {getRoleLabel(user?.role)}
                  </p>
                </div>
                <ChevronDown size={13} color="#94A3B8" style={{ transition:'transform 0.2s', transform: isProfileOpen ? 'rotate(180deg)' : 'none' }} />
              </>
            )}
          </button>

          {isProfileOpen && (
            <div style={{ position:'absolute', top:50, right:0, width:220, background:'#fff', borderRadius:14, border:'1px solid #E2E8F0', boxShadow:'0 16px 48px rgba(15,23,42,0.12)', zIndex:200, overflow:'hidden' }}>
              <div style={{ padding:'14px 16px', borderBottom:'1px solid #F1F5F9' }}>
                <p style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:14, color:'#0F172A', margin:0 }}>{user?.full_name}</p>
                <p style={{ fontSize:12, color:'#64748B', margin:'2px 0 0' }}>{user?.email || user?.username}</p>
                <span style={{ display:'inline-block', marginTop:6, padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:700, background:`${getRoleColor(user?.role)}18`, color: getRoleColor(user?.role) }}>
                  {getRoleLabel(user?.role)}
                </span>
              </div>
              {[
                { icon:User,     label:'Mon profil',  action:() => { setIsProfileOpen(false) } },
                { icon:Settings, label:'Paramètres',  action:() => { navigate('/settings'); setIsProfileOpen(false) } },
              ].map((item,i) => (
                <button key={i} onClick={item.action} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 16px', background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#475569', fontFamily:'DM Sans', transition:'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background='#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background='none'}>
                  <item.icon size={15} color="#94A3B8" />{item.label}
                </button>
              ))}
              <div style={{ height:1, background:'#F1F5F9', margin:'4px 0' }} />
              <button onClick={handleLogout} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 16px', background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#E63946', fontFamily:'DM Sans', fontWeight:600, transition:'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background='#FEF2F2'}
                onMouseLeave={e => e.currentTarget.style.background='none'}>
                <LogOut size={15} color="#E63946" />Se déconnecter
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Command palette ── */}
      {searchOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.48)', zIndex:200, display:'flex', alignItems:'flex-start', justifyContent:'center', padding: isMobile ? '12px' : '72px 16px 16px', backdropFilter:'blur(6px)' }}
          onClick={() => setSearchOpen(false)}>
          <div style={{ background:'#fff', borderRadius:18, padding:0, width:'100%', maxWidth:620, boxShadow:'0 24px 70px rgba(15,23,42,0.25)', border:'1px solid rgba(226,232,240,0.9)', overflow:'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px', borderBottom:'1px solid #E2E8F0' }}>
              <Search size={18} color="#0D7A87" />
              <input type="text" placeholder="Rechercher patients, factures..." autoFocus
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && filteredCommands[0]) runCommand(filteredCommands[0].href)
                }}
                style={{ flex:1, border:'none', outline:'none', fontSize:15, fontFamily:'DM Sans,sans-serif', color:'#0F172A', background:'transparent' }} />
              <button onClick={() => setSearchOpen(false)} style={{ width:32, height:32, borderRadius:10, background:'#F8FAFC', border:'1px solid #E2E8F0', cursor:'pointer', color:'#64748B', display:'flex', alignItems:'center', justifyContent:'center' }}><X size={17} /></button>
            </div>
            <div style={{ maxHeight:isMobile ? '70vh' : 420, overflowY:'auto', padding:'10px' }}>
              {Object.keys(groupedCommands).length === 0 ? (
                <div style={{ padding:'30px 16px', textAlign:'center', color:'#94A3B8', fontSize:13 }}>Aucun raccourci trouvé</div>
              ) : Object.entries(groupedCommands).map(([group, items]) => (
                <div key={group} style={{ marginBottom:8 }}>
                  <div style={{ padding:'8px 8px 6px', fontSize:10, fontWeight:900, color:'#94A3B8', textTransform:'uppercase', letterSpacing:1 }}>{group}</div>
                  {items.map(item => {
                    const Icon = item.icon
                    return (
                      <button key={item.href + item.label} onClick={() => runCommand(item.href)}
                        style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'11px 10px', border:'none', borderRadius:12, background:'transparent', cursor:'pointer', textAlign:'left' }}
                        onMouseEnter={e => e.currentTarget.style.background='#F8FAFC'}
                        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <div style={{ width:38, height:38, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg, rgba(13,122,135,0.12), rgba(59,79,216,0.10))', flexShrink:0 }}>
                          <Icon size={18} color="#0D7A87" />
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:14, fontWeight:800, color:'#0F172A' }}>{item.label}</div>
                          <div style={{ fontSize:12, color:'#64748B', marginTop:1 }}>{item.desc}</div>
                        </div>
                        <ArrowRight size={16} color="#CBD5E1" />
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', gap:10, padding:'10px 14px', borderTop:'1px solid #F1F5F9', background:'#F8FAFC', fontSize:11, color:'#64748B' }}>
              <span>Entrée pour ouvrir</span>
              <span>Échap pour fermer</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
