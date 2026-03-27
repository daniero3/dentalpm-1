import React, { useState, useEffect, useRef } from "react"
import { Search, Bell, LogOut, User, Settings, ChevronDown, Menu, X } from "lucide-react"
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

export function ModernTopbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { isMobile, isTablet } = useScreenSize()
  const [searchTerm, setSearchTerm]       = useState('')
  const [searchOpen, setSearchOpen]       = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen]     = useState(false)
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

  const handleLogout = () => { logout(); navigate('/login'); }

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

  return (
    <>
      <header style={{
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
              style={{ width:'100%', height:38, paddingLeft:40, paddingRight:14, borderRadius:99, border:'1.5px solid #E2E8F0', background:'#F8FAFC', fontSize:13, fontFamily:'DM Sans,sans-serif', color:'#0F172A', outline:'none', transition:'all 0.18s', boxSizing:'border-box' }}
              onFocus={e => { e.target.style.borderColor='#0D7A87'; e.target.style.background='#fff'; e.target.style.boxShadow='0 0 0 3px rgba(13,122,135,0.10)'; }}
              onBlur={e => { e.target.style.borderColor='#E2E8F0'; e.target.style.background='#F8FAFC'; e.target.style.boxShadow='none'; }}
            />
          </div>
        )}

        {/* ── Search icon — mobile ── */}
        {isMobile && (
          <button onClick={() => setSearchOpen(!searchOpen)}
            style={{ width:36, height:36, borderRadius:8, border:'1.5px solid #E2E8F0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#64748B' }}>
            <Search size={16} />
          </button>
        )}

        <div style={{ flex:1 }} />

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
              <div style={{ padding:'16px', textAlign:'center', color:'#94A3B8', fontSize:13 }}>
                <Bell size={28} style={{ opacity:0.2, margin:'4px auto 8px', display:'block' }} />
                Aucune notification
              </div>
            </div>
          )}
        </div>

        {/* ── Profile ── */}
        <div ref={profileRef} style={{ position:'relative' }}>
          <button onClick={() => setIsProfileOpen(!isProfileOpen)}
            style={{ display:'flex', alignItems:'center', gap: isMobile ? 0 : 8, padding: isMobile ? 4 : '6px 10px 6px 6px', borderRadius:12, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', transition:'all 0.18s' }}
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

      {/* ── Search overlay mobile ── */}
      {isMobile && searchOpen && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', zIndex:200, display:'flex', alignItems:'flex-start', padding:'12px' }}
          onClick={() => setSearchOpen(false)}>
          <div style={{ background:'#fff', borderRadius:14, padding:16, width:'100%', boxShadow:'0 16px 48px rgba(15,23,42,0.18)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <Search size={16} color="#94A3B8" />
              <input type="text" placeholder="Rechercher patients, factures..." autoFocus
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                style={{ flex:1, border:'none', outline:'none', fontSize:15, fontFamily:'DM Sans,sans-serif', color:'#0F172A', background:'transparent' }} />
              <button onClick={() => setSearchOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#94A3B8' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize:12, color:'#94A3B8', margin:0 }}>Tapez pour rechercher...</p>
          </div>
        </div>
      )}
    </>
  )
}
