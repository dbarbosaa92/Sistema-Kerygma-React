// Equivalente a: adminController (exam/questions) + admin/exam_edit.handlebars
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const EMPTY_Q = { question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A' }

export default function ExamEdit() {
  const { id } = useParams()
  const [exam,      setExam]      = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [examForm,  setExamForm]  = useState({ title: '', duration_minutes: 60, passing_score: 60 })
  const [newQ,      setNewQ]      = useState(EMPTY_Q)
  const [msg,       setMsg]       = useState('')

  useEffect(() => { loadExam() }, [id])

  async function loadExam() {
    setLoading(true)
    const { data } = await supabase
      .from('exams')
      .select('*, questions(*), courses(title)')
      .eq('id', id)
      .single()
    setExam(data)
    setExamForm({ title: data?.title ?? '', duration_minutes: data?.duration_minutes ?? 60, passing_score: data?.passing_score ?? 60 })
    setQuestions(data?.questions ?? [])
    setLoading(false)
  }

  async function saveExam(e) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('exams').update(examForm).eq('id', id)
    setMsg('Prova atualizada!')
    setTimeout(() => setMsg(''), 3000)
    setSaving(false)
  }

  async function addQuestion(e) {
    e.preventDefault()
    await supabase.from('questions').insert({ ...newQ, exam_id: id, sort_order: questions.length })
    setNewQ(EMPTY_Q)
    loadExam()
  }

  async function deleteQuestion(qId) {
    await supabase.from('questions').delete().eq('id', qId)
    loadExam()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="container py-4" style={{ maxWidth: 860 }}>
      <div className="d-flex align-items-center gap-3 mb-4">
        <Link to="/admin" className="btn btn-outline-primary btn-sm">
          <i className="fa fa-arrow-left" />
        </Link>
        <h4 className="mb-0">Editar Prova — <small className="text-muted fw-normal">{exam?.courses?.title}</small></h4>
      </div>

      {msg && <div className="alert alert-success py-2">{msg}</div>}

      {/* Dados da prova */}
      <div className="card mb-4">
        <div className="card-header"><strong>Configurações</strong></div>
        <div className="card-body">
          <form onSubmit={saveExam} className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Título</label>
              <input className="form-control" value={examForm.title}
                onChange={e => setExamForm(p => ({ ...p, title: e.target.value }))} required />
            </div>
            <div className="col-md-3">
              <label className="form-label">Duração (min)</label>
              <input type="number" className="form-control" value={examForm.duration_minutes}
                onChange={e => setExamForm(p => ({ ...p, duration_minutes: Number(e.target.value) }))} min={1} required />
            </div>
            <div className="col-md-3">
              <label className="form-label">Nota mínima (%)</label>
              <input type="number" className="form-control" value={examForm.passing_score}
                onChange={e => setExamForm(p => ({ ...p, passing_score: Number(e.target.value) }))} min={0} max={100} required />
            </div>
            <div className="col-12 text-end">
              <button className="btn btn-primary" disabled={saving}>Salvar</button>
            </div>
          </form>
        </div>
      </div>

      {/* Questões existentes */}
      <div className="card mb-4">
        <div className="card-header">
          <strong>Questões ({questions.length})</strong>
        </div>
        {questions.length === 0 && (
          <div className="card-body text-muted small">Nenhuma questão cadastrada.</div>
        )}
        {questions.map((q, idx) => (
          <div key={q.id} className="card-body border-top">
            <div className="d-flex justify-content-between align-items-start">
              <p className="fw-semibold mb-2 small">{idx + 1}. {q.question_text}</p>
              <button className="btn btn-sm btn-outline-danger ms-2" onClick={() => deleteQuestion(q.id)}>
                <i className="fa fa-trash" />
              </button>
            </div>
            <div className="row g-1 small text-muted">
              {['a','b','c','d'].map(opt => (
                <div key={opt} className="col-md-6">
                  <span className={q.correct_option === opt.toUpperCase() ? 'text-success fw-bold' : ''}>
                    {opt.toUpperCase()}) {q[`option_${opt}`]}
                    {q.correct_option === opt.toUpperCase() && <i className="fa fa-check ms-1" />}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Adicionar questão */}
      <div className="card">
        <div className="card-header"><strong>Adicionar Questão</strong></div>
        <div className="card-body">
          <form onSubmit={addQuestion} className="row g-3">
            <div className="col-12">
              <label className="form-label">Enunciado</label>
              <textarea className="form-control" rows={2} value={newQ.question_text}
                onChange={e => setNewQ(p => ({ ...p, question_text: e.target.value }))} required />
            </div>
            {['a','b','c','d'].map(opt => (
              <div key={opt} className="col-md-6">
                <label className="form-label">Opção {opt.toUpperCase()}</label>
                <input className="form-control" value={newQ[`option_${opt}`]}
                  onChange={e => setNewQ(p => ({ ...p, [`option_${opt}`]: e.target.value }))} required />
              </div>
            ))}
            <div className="col-md-4">
              <label className="form-label">Resposta correta</label>
              <select className="form-select" value={newQ.correct_option}
                onChange={e => setNewQ(p => ({ ...p, correct_option: e.target.value }))}>
                {['A','B','C','D'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="col-12 text-end">
              <button className="btn btn-primary" type="submit">
                <i className="fa fa-plus me-2" />Adicionar Questão
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
