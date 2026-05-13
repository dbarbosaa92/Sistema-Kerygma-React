import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

const navLinkStyle = ({ isActive }) => ({
  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.8)',
  fontWeight: 500,
  textDecoration: 'none',
})

export default function Navbar() {
  const { profile, isTeacher, signOut } = useAuth()
  const navigate = useNavigate()
  const [hasNewNotices, setHasNewNotices] = useState(false)

  useEffect(() => {
    if (!profile) return
    checkNewNotices()
  }, [profile])

  async function checkNewNotices() {
    const { data } = await supabase
      .from('notices')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (!data) return
    const lastViewed = profile.last_viewed_notices ? new Date(profile.last_viewed_notices) : null
    setHasNewNotices(!lastViewed || new Date(data.created_at) > lastViewed)
  }

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark shadow-sm glass-navbar">
      <div className="container">
        <Link
          to="/dashboard"
          className="navbar-brand d-flex align-items-center gap-2"
          style={{ color: '#ffffff', textDecoration: 'none' }}
        >
          <strong>Seminário Kerygma</strong>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#nav"
        >
          <span className="navbar-toggler-icon" />
        </button>

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
  )
}
