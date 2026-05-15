import { useEffect, useState } from 'react'
import CalendarWidget from '../components/ui/CalendarWidget'
import NotificationPopup from '../components/ui/NotificationPopup'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80'

export default function Dashboard() {
  const { profile, isTeacher } = useAuth()
  const [courses,  setCourses]  = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (profile) loadDashboard()
  }, [profile])

  async function loadDashboard() {
    setLoading(true)
    const [coursesRes] = await Promise.all([
      supabase.from('courses').select(`
        id, title, description, image_url,
        lessons ( id, lesson_progress ( completed, user_id ) )
      `).order('created_at', { ascending: false }),
    ])

    const coursesWithProgress = (coursesRes.data ?? []).map(course => {
      const lessons = course.lessons ?? []
      const total     = lessons.length
      const completed = lessons.filter(l =>
        l.lesson_progress?.some(p => p.user_id === profile.id && p.completed)
      ).length
      return { ...course, total, completed, progress: total > 0 ? Math.round((completed / total) * 100) : 0 }
    })

    setCourses(coursesWithProgress)
    setLoading(false)
  }

  if (loading) return <LoadingSpinner />

  return (
    <>
    <NotificationPopup />

    {/* Saudação mobile — oculta no desktop */}
    <div className="d-md-none mb-3 px-1">
      <p className="mb-0" style={{ fontSize: '0.82rem', color: '#6c757d' }}>Bem-vindo de volta,</p>
      <h4 className="fw-bold mb-0" style={{ color: '#1a2744' }}>{profile?.name?.split(' ')[0]} 👋</h4>
    </div>

    {/* Barra admin mobile — oculta no desktop */}
    {isTeacher && (
      <Link
        to="/admin"
        className="d-flex d-md-none align-items-center text-decoration-none mb-3 mobile-admin-bar"
      >
        <i className="fas fa-cog me-3" style={{ color: '#c8a96e', fontSize: '1.1rem' }} />
        <span className="flex-grow-1 fw-semibold" style={{ color: '#c8a96e' }}>Painel do Professor</span>
        <i className="fas fa-arrow-right" style={{ color: '#c8a96e' }} />
      </Link>
    )}

    <div className="row g-4">
      {/* ── Cursos ── */}
      <div className="col-md-8">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="text-primary mb-0">
            <i className="fas fa-book-open" /> Minhas Aulas
          </h3>
          {isTeacher && (
            <Link to="/admin" className="btn btn-warning shadow-sm px-4 py-2 d-none d-md-inline-flex">
              <i className="fas fa-tools" /> Painel do Professor (Admin)
            </Link>
          )}
        </div>

        {/* Desktop: cards com thumbnail */}
        <div className="d-none d-md-block">
          <div className="row">
            {courses.length === 0 && (
              <p className="text-muted">Nenhum curso disponível no momento.</p>
            )}
            {courses.map(course => (
              <div key={course.id} className="col-md-6 mb-4">
                <div className="card h-100 shadow-sm border-0 class-card">
                  <img
                    src={course.image_url || FALLBACK_IMG}
                    className="card-img-top"
                    alt="Capa do Curso"
                    style={{ height: 150, objectFit: 'cover' }}
                  />
                  <div className="card-body d-flex flex-column">
                    <h5 className="card-title">{course.title}</h5>
                    <p className="card-text text-muted">{course.description}</p>

                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <small className="text-muted fw-semibold">Progresso</small>
                        <small className="text-primary fw-semibold">{course.progress}%</small>
                      </div>
                      <div className="progress">
                        <div
                          className="progress-bar bg-primary"
                          role="progressbar"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>

                    <Link to={`/courses/${course.id}`} className="btn btn-primary mt-auto px-4 py-2">
                      Acessar Curso <i className="fas fa-arrow-right ms-2" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: lista de cursos */}
        <div className="d-md-none">
          {courses.length === 0 && (
            <p className="text-muted">Nenhum curso disponível no momento.</p>
          )}
          {courses.map(course => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="mobile-course-row d-flex align-items-center text-decoration-none mb-3"
            >
              <div className="mobile-course-icon">
                <i className="fas fa-book" />
              </div>
              <div className="flex-grow-1 mx-3" style={{ minWidth: 0 }}>
                <div className="fw-semibold" style={{ color: '#1a2744', fontSize: '0.95rem' }}>
                  {course.title}
                </div>
                <small className="text-muted">{course.progress}% concluído</small>
                <div className="progress mt-1" style={{ height: '4px' }}>
                  <div
                    className="progress-bar"
                    role="progressbar"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </div>
              <i className="fas fa-arrow-right" style={{ color: '#adb5bd', flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      </div>

      {/* Calendário — oculto no mobile */}
      <div className="col-md-4 d-none d-md-block">
        <CalendarWidget />
      </div>
    </div>
    </>
  )
}
