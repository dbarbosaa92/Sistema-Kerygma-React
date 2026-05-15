import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import ExamTimer from '../components/exam/ExamTimer'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function Exam() {
  const { id } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [exam,       setExam]       = useState(null)
  const [questions,  setQuestions]  = useState([])
  const [submission, setSubmission] = useState(null)
  const [answers,    setAnswers]    = useState({})
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result,     setResult]     = useState(null)
  const submittedRef = useRef(false)

  useEffect(() => {
    if (profile) loadExam()
  }, [id, profile])

  async function loadExam() {
    setLoading(true)
    const [examRes, questionsRes, existingSub] = await Promise.all([
      supabase.from('exams').select('*, courses(title)').eq('id', id).single(),
      supabase.from('questions').select('*').eq('exam_id', id).order('sort_order'),
      supabase.from('submissions').select('*').eq('exam_id', id).eq('user_id', profile.id).maybeSingle(),
    ])

    setExam(examRes.data)
    setQuestions(questionsRes.data ?? [])

    if (existingSub.data?.status === 'completed') {
      const sub   = existingSub.data
      const passed = parseFloat(sub.score) >= parseFloat(examRes.data?.passing_score ?? 60)
      setResult({ score: sub.score, passed })
      setLoading(false)
      return
    }

    let sub = existingSub.data
    if (!sub) {
      const { data } = await supabase.from('submissions').insert({
        user_id: profile.id, exam_id: id,
        status: 'in_progress', start_time: new Date().toISOString(),
      }).select().single()
      sub = data
    }

    setSubmission(sub)
    setLoading(false)
  }

  async function handleSubmit(e) {
    if (e?.preventDefault) e.preventDefault()
    if (submittedRef.current || !submission) return
    submittedRef.current = true
    setSubmitting(true)

    try {
      const total   = questions.length
      const correct = questions.filter(q => answers[q.id] === q.correct_option).length
      const score   = total > 0 ? Math.round((correct / total) * 100) : 0

      const { error } = await supabase.from('submissions').update({
        score, status: 'completed', end_time: new Date().toISOString(),
      }).eq('id', submission.id)

      if (error) throw error

      const passed = score >= parseFloat(exam?.passing_score ?? 60)
      setResult({ score, passed })
    } catch (err) {
      console.error('Erro ao enviar prova:', err)
      submittedRef.current = false
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner />

  // Tela de resultado
  if (result) {
    return (
      <div className="container py-5 text-center" style={{ maxWidth: 560 }}>
        <div className={`card shadow border-0 rounded-4 p-5 ${result.passed ? 'border-success' : 'border-danger'}`}>
          <i
            className={`fas ${result.passed ? 'fa-trophy' : 'fa-times-circle'} fa-4x mb-3`}
            style={{ color: result.passed ? 'var(--success)' : '#dc3545' }}
          />
          <h3>{result.passed ? 'Parabéns!' : 'Não foi dessa vez.'}</h3>
          <p className="text-muted mb-1">{exam?.title}</p>
          <div className="display-4 fw-bold my-3" style={{ color: result.passed ? 'var(--success)' : '#dc3545' }}>
            {parseFloat(result.score).toFixed(1)}%
          </div>
          <p className="text-muted small">Nota mínima para aprovação: {exam?.passing_score}%</p>
          <button className="btn btn-primary mt-3" onClick={() => navigate(-1)}>
            Voltar ao Curso
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card shadow border-0 rounded-4">
      <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center py-3">
        <h4 className="mb-0 fw-medium">
          <i className="fas fa-stopwatch" /> Prova: {exam?.title}
        </h4>
        {submission && (
          <ExamTimer
            startTime={submission.start_time}
            durationMinutes={exam?.duration_minutes}
            onExpire={() => handleSubmit()}
          />
        )}
      </div>

      <div className="card-body p-4 bg-light">
        <form id="exam-form" onSubmit={handleSubmit}>
          <div id="questions-container">
            {questions.map((q, idx) => (
              <div key={q.id} className="card mb-4 border-0 shadow-sm question-card">
                <div className="card-body p-4">
                  <h5 className="card-title fw-medium text-dark border-bottom pb-3 mb-4">
                    {idx + 1}. {q.question_text}
                  </h5>

                  {['A', 'B', 'C', 'D'].map(opt => (
                    <div key={opt} className="form-check custom-radio mb-3">
                      <input
                        className="form-check-input"
                        type="radio"
                        name={`q_${q.id}`}
                        id={`opt${opt}_${q.id}`}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                        required
                      />
                      <label className="form-check-label w-100" htmlFor={`opt${opt}_${q.id}`}>
                        <strong>{opt}.</strong> {q[`option_${opt.toLowerCase()}`]}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg px-5 fw-semibold shadow"
            disabled={submitting}
          >
            Finalizar e Enviar Prova <i className="fas fa-check-circle ms-2" />
          </button>
        </form>
      </div>
    </div>
  )
}
