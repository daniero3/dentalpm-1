import React, { useState, useEffect, useRef } from "react"
import { Search, Bell, LogOut, User, Settings, ChevronDown, Moon, Sun } from "lucide-react"
import { useAuth } from "../App"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL
const API = `${BACKEND_URL}/api`

export function ModernTopbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm]     = useState('')
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [isNotifOpen, setIsNotifOpen]   = useState(false)
  const profileRef  = useRef(null)
  const notifRef    = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setIsProfileOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setIsNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getRoleLabel = (role) => {
    const labels = {
      SUPER_ADMIN: 'Super Admin', ADMIN: 'Administrateur',
      DENTIST: 'Dentiste', ASSISTANT: 'Assistante', ACCOUNTANT: 'Comptable'
    }
    return labels[role] || role
  }

  const getRoleColor = (role) => {
    const colors = {
      SUPER_ADMIN: '#8B5CF6', ADMIN: '#0D7A87',
      DENTIST: '#3B4FD8', ASSISTANT: '#F59E0B', ACCOUNTANT: '#0EA570'
    }
    return colors[role] || '#64748B'
  }

  return (
    <header style={{
      height: 64,
      background: 'rgba(255,255,255,0.97)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid #E2E8F0',
      display: 'flex', alignItems: 'center',
      padding: '0 24px',
      gap: 16,
      position: 'sticky', top: 0, zIndex: 100,
      boxShadow: '0 1px 8px rgba(15,23,42,0.06)',
    }}>

      {/* ── Search ── */}
      <div style={{ flex: 1, maxWidth: 480, position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
        <input
          type="text"
          placeholder="Rechercher patients, factures..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            width: '100%', height: 40, paddingLeft: 42, paddingRight: 16,
            borderRadius: 99, border: '1.5px solid #E2E8F0',
            background: '#F8FAFC', fontSize: 13,
            fontFamily: 'DM Sans, sans-serif', color: '#0F172A',
            outline: 'none', transition: 'all 0.18s ease',
            boxSizing: 'border-box',
          }}
          onFocus={e => { e.target.style.borderColor = '#0D7A87'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(13,122,135,0.10)'; }}
          onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC'; e.target.style.boxShadow = 'none'; }}
        />
        {searchTerm && (
          <kbd style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 4, padding: '2px 6px', fontSize: 10, color: '#94A3B8', fontFamily: 'monospace' }}>
            ESC
          </kbd>
        )}
      </div>

      {/* ── Spacer ── */}
      <div style={{ flex: 1 }} />

      {/* ── Notifications ── */}
      <div ref={notifRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setIsNotifOpen(!isNotifOpen)}
          style={{
            width: 40, height: 40, borderRadius: 10,
            border: '1.5px solid #E2E8F0', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', position: 'relative', color: '#64748B',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#0D7A87'; e.currentTarget.style.color = '#0D7A87'; e.currentTarget.style.background = '#F0F7F8'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#64748B'; e.currentTarget.style.background = '#fff'; }}
        >
          <Bell size={18} />
          {/* Badge */}
          <span style={{
            position: 'absolute', top: 6, right: 6,
            width: 8, height: 8, borderRadius: '50%',
            background: '#0D7A87', border: '2px solid #fff',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
        </button>

        {/* Dropdown notifs */}
        {isNotifOpen && (
          <div style={{
            position: 'absolute', top: 48, right: 0, width: 320,
            background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0',
            boxShadow: '0 16px 48px rgba(15,23,42,0.12)', zIndex: 200, overflow: 'hidden',
          }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 14, color: '#0F172A', margin: 0 }}>Notifications</p>
              <span style={{ fontSize: 11, color: '#0D7A87', fontWeight: 600, cursor: 'pointer' }}>Tout marquer lu</span>
            </div>
            <div style={{ padding: '12px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
              <Bell size={32} style={{ opacity: 0.2, margin: '8px auto 8px', display: 'block' }} />
              Aucune nouvelle notification
            </div>
          </div>
        )}
      </div>

      {/* ── Profile ── */}
      <div ref={profileRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 10px 6px 6px', borderRadius: 12,
            border: '1.5px solid #E2E8F0', background: '#fff',
            cursor: 'pointer', transition: 'all 0.18s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#0D7A87'; e.currentTarget.style.background = '#F0F7F8'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#fff'; }}
        >
          {/* Avatar */}
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #0D7A87, #3B4FD8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 13, color: '#fff',
          }}>
            {user?.full_name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 13, color: '#0F172A', margin: 0, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
              {user?.full_name?.split(' ')[0] || 'Utilisateur'}
            </p>
            <p style={{ fontSize: 10, margin: 0, color: getRoleColor(user?.role), fontWeight: 700 }}>
              {getRoleLabel(user?.role)}
            </p>
          </div>
          <ChevronDown size={14} color="#94A3B8" style={{ transition: 'transform 0.2s', transform: isProfileOpen ? 'rotate(180deg)' : 'none' }} />
        </button>

        {/* Dropdown profile */}
        {isProfileOpen && (
          <div style={{
            position: 'absolute', top: 52, right: 0, width: 220,
            background: '#fff', borderRadius: 14, border: '1px solid #E2E8F0',
            boxShadow: '0 16px 48px rgba(15,23,42,0.12)', zIndex: 200, overflow: 'hidden',
          }}>
            {/* User info */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9' }}>
              <p style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 700, fontSize: 14, color: '#0F172A', margin: 0 }}>{user?.full_name}</p>
              <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>{user?.email || user?.username}</p>
              <span style={{ display: 'inline-block', marginTop: 6, padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: `${getRoleColor(user?.role)}18`, color: getRoleColor(user?.role) }}>
                {getRoleLabel(user?.role)}
              </span>
            </div>

            {/* Menu items */}
            {[
              { icon: User,     label: 'Mon profil',  action: () => {} },
              { icon: Settings, label: 'Paramètres',  action: () => navigate('/settings') },
            ].map((item, i) => (
              <button key={i} onClick={item.action} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#475569', fontFamily: 'DM Sans', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <item.icon size={15} color="#94A3B8" />
                {item.label}
              </button>
            ))}

            <div style={{ height: 1, background: '#F1F5F9', margin: '4px 0' }} />

            {/* Logout */}
            <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#E63946', fontFamily: 'DM Sans', fontWeight: 600, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <LogOut size={15} color="#E63946" />
              Se déconnecter
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
