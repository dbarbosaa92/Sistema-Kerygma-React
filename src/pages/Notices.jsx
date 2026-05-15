import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function Notices() {
  const { profile } = useAuth()
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) loadAndMarkNotices()
  }, [profile])

  async function loadAndMarkNotices() {
    setLoading(true)
    const { data } = await supabase
      .from('notices')
      .select('*, users(name)')
      .order('created_at', { ascending: false })

    setNotices(data ?? [])

    await supabase.from('users')
      .update({ last_viewed_notices: new Date().toISOString() })
      .eq('id', profile.id)

    setLoading(false)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="container my-5">
      <div className="row mb-5">
        <div className="col-12 text-center">
          <h1 className="fw-medium text-primary display-4 mb-2">Quadro de Avisos</h1>
          <p className="text-muted lead">Fique por dentro das últimas atualizações e comunicados do <span className="kerygma-font">Seminário Kerygma</span>.</p>
          <hr className="w-25 mx-auto border-3 border-primary opacity-75" />
        </div>
      </div>

      <div className="row justify-content-center">
        <div className="col-md-10">
          {notices.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-bullhorn fa-4x text-muted mb-3 opacity-25" />
              <h4 className="text-muted">Nenhum aviso publicado no momento.</h4>
            </div>
          ) : (
            notices.map(notice => (
              <div key={notice.id} className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
                <div className="card-header bg-white border-bottom-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                  <span className="badge rounded-pill bg-warning px-3 py-2">
                    <i className="fas fa-tag me-1" /> {notice.category || 'Geral'}
                  </span>
                  <small className="text-muted">
                    <i className="far fa-calendar-alt me-1" />
                    {new Date(notice.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  </small>
                </div>

                <div className="card-body p-4">
                  <div className="row g-4">
                    <div className={notice.image_url ? 'col-md-8' : 'col-12'}>
                      <h3 className="fw-medium mb-3 text-dark">{notice.title}</h3>
                      <p className="text-dark-emphasis mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                        {notice.content}
                      </p>
                    </div>
                    {notice.image_url && (
                      <div className="col-md-4">
                        <img
                          src={notice.image_url}
                          className="img-fluid rounded-4 shadow-sm"
                          alt="Imagem do aviso"
                          style={{ width: '100%', height: 200, objectFit: 'cover' }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="card-footer bg-light border-top-0 px-4 py-3 d-flex align-items-center">
                  <div
                    className="rounded-circle bg-primary d-flex align-items-center justify-content-center me-3"
                    style={{ width: 40, height: 40, flexShrink: 0 }}
                  >
                    <i className="fas fa-user-edit text-white" />
                  </div>
                  <div>
                    <small className="text-muted d-block">Publicado por:</small>
                    <span className="fw-semibold text-dark">{notice.users?.name ?? 'Administração'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
