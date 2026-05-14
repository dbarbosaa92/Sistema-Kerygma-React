import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

const TYPE_CONFIG = {
  lesson:  { icon: 'fa-book-open', bg: '#1A2B5C', label: 'Nova Aula'  },
  exam:    { icon: 'fa-file-alt',  bg: '#B42318', label: 'Nova Prova' },
  general: { icon: 'fa-bullhorn',  bg: '#D4AF37', label: 'Aviso'      },
}

export default function NotificationPopup() {
  const { profile } = useAuth()
  const [items,   setItems]   = useState([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (profile?.id) load()
  }, [profile?.id])

  async function load() {
    const [{ data: reads }, { data: notifs }] = await Promise.all([
      supabase.from('notification_reads').select('notification_id').eq('user_id', profile.id),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }),
    ])
    const readIds = new Set((reads || []).map(r => r.notification_id))
    const unread  = (notifs || []).filter(n => !readIds.has(n.id))
    if (unread.length > 0) {
      setItems(unread)
      setVisible(true)
    }
  }

  async function dismiss() {
    setVisible(false)
    if (items.length === 0) return
    await supabase.from('notification_reads').insert(
      items.map(n => ({ notification_id: n.id, user_id: profile.id }))
    )
  }

  if (!visible) return null

  return (
    <div className="notif-overlay">
      <div className="notif-card">
        {/* Header */}
        <div className="notif-header">
          <div className="notif-header-icon">
            <i className="fas fa-bell" />
          </div>
          <div>
            <div className="notif-title">Novidades para você!</div>
            <div className="notif-subtitle">
              {items.length} {items.length === 1 ? 'atualização nova' : 'atualizações novas'}
            </div>
          </div>
        </div>

        {/* Lista */}
        <div className="notif-body">
          {items.map((n, i) => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.general
            return (
              <div key={n.id} className={`notif-item${i > 0 ? ' notif-item--border' : ''}`}>
                <div className="notif-item-icon" style={{ background: cfg.bg + '18', color: cfg.bg }}>
                  <i className={`fas ${cfg.icon}`} />
                </div>
                <div className="notif-item-content">
                  <span className="notif-badge" style={{ background: cfg.bg }}>{cfg.label}</span>
                  <div className="notif-item-title">{n.title}</div>
                  {n.body && <div className="notif-item-body">{n.body}</div>}
                  <div className="notif-item-date">
                    {new Date(n.created_at).toLocaleDateString('pt-BR', {
                      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="notif-footer">
          <button className="btn btn-primary rounded-pill px-4" onClick={dismiss}>
            <i className="fas fa-check me-2" /> Entendido!
          </button>
        </div>
      </div>
    </div>
  )
}
