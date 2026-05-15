import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import CalendarWidget from '../ui/CalendarWidget'

const navLinkStyle = ({ isActive }) => ({
  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.8)',
  fontWeight: 500,
  textDecoration: 'none',
})

export default function Navbar() {
  const { profile, isTeacher, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [hasNewNotices, setHasNewNotices] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!profile) return
    checkNewNotices()
  }, [profile])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  useEffect(() => {
    if (location.pathname === '/notices') setHasNewNotices(false)
  }, [location.pathname])

  async function checkNewNotices() {
    const [noticeRes, userRes] = await Promise.all([
      supabase.from('notices').select('created_at').order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('users').select('last_viewed_notices').eq('id', profile.id).single(),
    ])
    if (!noticeRes.data) return
    const lastViewed = userRes.data?.last_viewed_notices ? new Date(userRes.data.last_viewed_notices) : null
    setHasNewNotices(!lastViewed || new Date(noticeRes.data.created_at) > lastViewed)
  }

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  function closeMenu() { setMenuOpen(false) }

  const initials = profile?.name
    ?.split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'

  const navItems = [
    { to: '/dashboard', icon: 'fa-home',            label: 'Início' },
    { to: '/boletim',   icon: 'fa-clipboard-check', label: 'Meu Boletim' },
    { to: '/notices',   icon: 'fa-bullhorn',         label: 'Avisos', badge: hasNewNotices },
  ]

  return (
    <>
    <nav className="navbar navbar-expand-md navbar-dark shadow-sm glass-navbar">
      <div className="container">
        <Link
          to="/dashboard"
          className="navbar-brand d-flex align-items-center gap-2"
          style={{ color: '#ffffff', textDecoration: 'none' }}
        >
          <strong><span className="kerygma-font">Seminário Kerygma</span></strong>
        </Link>

        {/* Botão calendário — visível apenas no mobile */}
        <button
          className="navbar-calendar-btn d-flex d-md-none"
          onClick={() => setCalendarOpen(true)}
          aria-label="Abrir calendário"
        >
          <i className="fas fa-calendar-alt" style={{ color: '#c8a96e' }} />
        </button>

        {/* Hamburguer — abre o sidebar no mobile */}
        <button
          className="navbar-toggler"
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu"
        >
          <span className="navbar-toggler-icon" />
        </button>

        {/* Nav desktop (visível em md+) */}
        <div className="collapse navbar-collapse" id="nav">
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0 align-items-center">

            <li className="nav-item">
              <NavLink className="nav-link me-3" to="/boletim" style={navLinkStyle}>
                <i className="fas fa-clipboard-check me-1" />
                Meu Boletim
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink className="nav-link me-3 position-relative" to="/notices" style={navLinkStyle}>
                <i className="fas fa-bullhorn me-1" />
                Avisos
                {hasNewNotices && <span className="notification-dot" />}
              </NavLink>
            </li>

            {isTeacher && (
              <li className="nav-item">
                <NavLink className="nav-link me-3" to="/admin" style={navLinkStyle}>
                  <i className="fas fa-tools me-1" />
                  Admin
                </NavLink>
              </li>
            )}

            <li className="nav-item">
              <span className="nav-link" style={{ color: 'rgba(255,255,255,0.8)', cursor: 'default' }}>
                <i className="fas fa-user-circle me-1" />
                Olá, {profile?.name?.split(' ')[0]}
              </span>
            </li>

            <li className="nav-item">
              <button
                className="btn btn-sm btn-outline-light ms-2 px-3"
                style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.5)' }}
                onClick={handleLogout}
              >
                Sair
              </button>
            </li>

          </ul>
        </div>
      </div>
    </nav>

    {/* Sidebar mobile */}
    {menuOpen && (
      <div className="mobile-menu-overlay" onClick={closeMenu}>
        <div className="mobile-menu-panel" onClick={e => e.stopPropagation()}>

          {/* Topo */}
          <div className="mobile-menu-top">
            <span className="kerygma-font" style={{ color: '#c8a96e', fontSize: '1.1rem' }}>Kerygma</span>
            <button className="mobile-menu-close" onClick={closeMenu} aria-label="Fechar menu">
              <i className="fas fa-times" />
            </button>
          </div>

          {/* Avatar */}
          <div className="mobile-menu-avatar-row">
            <div className="mobile-menu-avatar">{initials}</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>
                {profile?.name?.split(' ')[0]}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                {isTeacher ? 'Admin' : 'Aluno'}
              </div>
            </div>
          </div>
          <div className="mobile-menu-divider" />

          {/* Itens de navegação */}
          <nav className="mobile-menu-nav">
            {navItems.map(item => {
              const active = location.pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`mobile-menu-item${active ? ' mobile-menu-item--active' : ''}`}
                  onClick={closeMenu}
                >
                  <i className={`fas ${item.icon} mobile-menu-item-icon`} />
                  <span>{item.label}</span>
                  {item.badge && <span className="mobile-menu-badge" />}
                </Link>
              )
            })}

            {isTeacher && (
              <>
                <div className="mobile-menu-divider" style={{ margin: '6px 16px' }} />
                <Link
                  to="/admin"
                  className={`mobile-menu-item${location.pathname.startsWith('/admin') ? ' mobile-menu-item--active' : ''}`}
                  onClick={closeMenu}
                >
                  <i className="fas fa-tools mobile-menu-item-icon" />
                  <span>Admin</span>
                </Link>
              </>
            )}
          </nav>

          {/* Rodapé */}
          <div className="mobile-menu-footer">
            <div className="mobile-menu-divider" />
            <button className="mobile-menu-logout" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt me-2" />
              Sair
            </button>
          </div>

        </div>
      </div>
    )}

    {/* Overlay do calendário mobile */}
    {calendarOpen && (
      <div
        className="mobile-cal-overlay"
        onClick={() => setCalendarOpen(false)}
      >
        <div
          className="mobile-cal-card"
          onClick={e => e.stopPropagation()}
        >
          <CalendarWidget />
        </div>
      </div>
    )}
    </>
  )
}
