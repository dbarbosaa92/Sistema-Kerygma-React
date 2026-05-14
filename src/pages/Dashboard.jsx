import { useEffect, useState } from 'react'
import CalendarWidget from '../components/ui/CalendarWidget'
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
      `).order('created_at'),
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
    <div className="row g-4">
      {/* ── Cursos ── */}
      <div className="col-md-8">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="text-primary mb-0">
            <i className="fas fa-book-open" /> Minhas Aulas
          </h3>
          {isTeacher && (
            <Link to="/admin" className="btn btn-warning shadow-sm px-4 py-2">
              <i className="fas fa-tools" /> Painel do Professor (Admin)
            </Link>
          )}
        </div>

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

      <div className="col-md-4">
        <CalendarWidget />
      </div>
    </div>
  )
}
