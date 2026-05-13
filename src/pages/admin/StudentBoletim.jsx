// Equivalente a: adminController (student boletim) + admin/student_boletim.handlebars
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import StatusBadge from '../../components/ui/StatusBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function StudentBoletim() {
  const { userId } = useParams()
  const [student,  setStudent]  = useState(null)
  const [courses,  setCourses]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')

  // { submissionId: score } — edições inline pelo professor
  const [overrides, setOverrides] = useState({})

  useEffect(() => { loadBoletim() }, [userId])

  async function loadBoletim() {
    setLoading(true)
    const [studentRes, coursesRes] = await Promise.all([
      supabase.from('users').select('id, name, cpf, email').eq('id', userId).single(),
      supabase.from('courses').select(`
        id, title,
        exams (
          id, title, passing_score,
          submissions ( id, score, status, start_time, end_time, user_id )
        )
      `).order('created_at'),
    ])

    const normalized = (coursesRes.data ?? []).map(course => ({
      ...course,
      exams: course.exams.map(exam => ({
        ...exam,
        submission: exam.submissions.find(s => s.user_id === userId) ?? null,
      })),
    }))

    setStudent(studentRes.data)
    setCourses(normalized)
    setLoading(false)
  }

  async function saveScore(submissionId, examId) {
    const newScore = overrides[submissionId]
    if (newScore === undefined) return
    setSaving(true)
    await supabase.from('submissions').update({
      score: parseFloat(newScore),
      status: 'completed',
    }).eq('id', submissionId)
    setMsg('Nota atualizada!')
    setTimeout(() => setMsg(''), 3000)
    setOverrides(p => { const n = { ...p }; delete n[submissionId]; return n })
    setSaving(false)
    loadBoletim()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      <div className="d-flex align-items-center gap-3 mb-4">
        <Link to="/admin" className="btn btn-outline-primary btn-sm">
          <i className="fa fa-arrow-left" />
        </Link>
        <div>
          <h4 className="mb-0">Boletim — {student?.name}</h4>
          <small className="text-muted">CPF: {student?.cpf} · {student?.email}</small>
        </div>
      </div>

      {msg && <div className="alert alert-success py-2">{msg}</div>}

      {courses.map(course => (
        <div key={course.id} className="card mb-4">
          <div className="card-header">
            <strong><i className="fa fa-book-open me-2" />{course.title}</strong>
          </div>
          {course.exams.length === 0 ? (
            <div className="card-body text-muted small">Sem provas.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle small">
                <thead className="table-light">
                  <tr>
                    <th>Prova</th>
                    <th className="text-center">Nota Atual</th>
                    <th className="text-center">Mínimo</th>
                    <th className="text-center">Status</th>
                    <th>Sobrescrever Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {course.exams.map(exam => {
                    const sub = exam.submission
                    return (
                      <tr key={exam.id}>
                        <td>{exam.title}</td>
                        <td className="text-center fw-bold">
                          {sub?.score !== null && sub?.score !== undefined
                            ? `${parseFloat(sub.score).toFixed(1)}%`
                            : '—'}
                        </td>
                        <td className="text-center text-muted">
                          {parseFloat(exam.passing_score).toFixed(0)}%
                        </td>
                        <td className="text-center">
                          <StatusBadge
                            status={sub?.status ?? 'not_started'}
                            score={sub?.score}
                            passingScore={exam.passing_score}
                          />
                        </td>
                        <td>
                          {sub ? (
                            <div className="d-flex gap-2 align-items-center">
                              <input
                                type="number" min={0} max={100} step={0.1}
                                className="form-control form-control-sm"
                                style={{ width: 90 }}
                                placeholder={sub.score ?? ''}
                                value={overrides[sub.id] ?? ''}
                                onChange={e => setOverrides(p => ({ ...p, [sub.id]: e.target.value }))}
                              />
                              <button
                                className="btn btn-sm btn-primary"
                                disabled={saving || overrides[sub.id] === undefined}
                                onClick={() => saveScore(sub.id, exam.id)}
                              >
                                Salvar
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted small">Não realizada</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
