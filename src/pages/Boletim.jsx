import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/ui/LoadingSpinner'

function formatPassingScore(exams) {
  if (!exams.length) return '--'
  const scores = [...new Set(exams.map(e => parseFloat(e.passing_score).toFixed(0)))]
  if (scores.length === 1) return `${scores[0]}%`
  return `A partir de ${Math.min(...scores.map(Number))}%`
}

function buildBoletimRow(course, userId) {
  const exams = [...(course.exams ?? [])].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))

  const examDetails = exams.map(exam => ({
    id:           exam.id,
    title:        exam.title,
    passingScore: parseFloat(exam.passing_score),
    submission:   exam.submissions?.find(s => s.user_id === userId) ?? null,
  }))

  const completedExams  = examDetails.filter(e => e.submission?.status === 'completed')
  const inProgressExam  = examDetails.find(e => e.submission?.status === 'in_progress')
  const pendingExam     = examDetails.find(e => !e.submission)
  const approvedCount   = completedExams.filter(e => parseFloat(e.submission.score) >= e.passingScore).length
  const failedCount     = completedExams.length - approvedCount

  let score = '--'
  if (completedExams.length > 0) {
    const avg = completedExams.reduce((s, e) => s + parseFloat(e.submission.score), 0) / completedExams.length
    score = `${avg.toFixed(1)}%`
  }

  let status = 'Nao iniciada', statusClass = 'status-not-started'
  let actionLabel = '', actionHref = '', actionClass = ''

  if (!examDetails.length) {
    status = 'Sem avaliação'; statusClass = 'status-no-exam'
  } else if (inProgressExam) {
    status = 'Em andamento'; statusClass = 'status-in-progress'
    actionLabel = 'Continuar prova'; actionHref = `/exams/${inProgressExam.id}`; actionClass = 'action-warning'
  } else if (pendingExam && completedExams.length === 0) {
    status = 'Nao iniciada'; statusClass = 'status-not-started'
    actionLabel = 'Iniciar prova'; actionHref = `/exams/${pendingExam.id}`; actionClass = 'action-primary'
  } else if (pendingExam) {
    status = 'Em andamento'; statusClass = 'status-in-progress'
    actionLabel = 'Próxima prova'; actionHref = `/exams/${pendingExam.id}`; actionClass = 'action-primary'
  } else if (failedCount > 0) {
    status = 'Reprovado'; statusClass = 'status-failed'
  } else {
    status = 'Aprovado'; statusClass = 'status-approved'
  }

  return {
    id:              course.id,
    title:           course.title,
    assessmentLabel: examDetails.length === 0
      ? 'Sem avaliação cadastrada'
      : examDetails.length === 1
        ? examDetails[0].title
        : `${examDetails.length} avaliações cadastradas`,
    progressLabel: examDetails.length === 0
      ? 'Aguardando configuracao da materia'
      : `${completedExams.length} de ${examDetails.length} avaliações concluidas`,
    minimumScore: formatPassingScore(exams),
    score, status, statusClass, actionLabel, actionHref, actionClass,
  }
}

export default function Boletim() {
  const { profile } = useAuth()
  const [rows,    setRows]    = useState([])
  const [summary, setSummary] = useState({ totalSubjects: 0, approvedSubjects: 0, inProgressSubjects: 0, pendingSubjects: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) loadBoletim()
  }, [profile])

  async function loadBoletim() {
    setLoading(true)
    const { data } = await supabase.from('courses').select(`
      id, title,
      exams ( id, title, passing_score,
        submissions ( id, score, status, user_id )
      )
    `).order('title')

    const boletimRows = (data ?? []).map(c => buildBoletimRow(c, profile.id))
    setRows(boletimRows)
    setSummary({
      totalSubjects:      boletimRows.length,
      approvedSubjects:   boletimRows.filter(r => r.status === 'Aprovado').length,
      inProgressSubjects: boletimRows.filter(r => r.status === 'Em andamento').length,
      pendingSubjects:    boletimRows.filter(r => r.status === 'Nao iniciada').length,
    })
    setLoading(false)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="boletim-sheet-page">
      <section className="boletim-sheet-hero">
        <div>
          <span className="sheet-eyebrow">Boletim do aluno</span>
          <h1 className="sheet-title">Planilha acadêmica</h1>
          <p className="sheet-subtitle">
            Todas as matérias do curso em uma única visão para acompanhar notas e situação de {profile?.name}.
          </p>
        </div>
        <Link to="/dashboard" className="sheet-back-link">
          <i className="fas fa-arrow-left" /> Voltar ao painel
        </Link>
      </section>

      {rows.length > 0 ? (
        <>
          <section className="sheet-summary-grid">
            {[
              { label: 'Matérias',       value: summary.totalSubjects },
              { label: 'Aprovadas',      value: summary.approvedSubjects },
              { label: 'Em andamento',   value: summary.inProgressSubjects },
              { label: 'Não iniciadas',  value: summary.pendingSubjects },
            ].map(({ label, value }) => (
              <article key={label} className="summary-card">
                <span className="summary-label">{label}</span>
                <strong className="summary-value">{value}</strong>
              </article>
            ))}
          </section>

          <section className="sheet-table-card">
            <div className="sheet-table-header">
              <div>
                <h2>Boletim geral</h2>
                <p>As matérias ficam fixas na tabela e a nota do aluno muda conforme as avaliações são realizadas.</p>
              </div>
            </div>
            <div className="table-responsive">
              <table className="sheet-table">
                <thead>
                  <tr>
                    <th>Matéria</th>
                    <th>Avaliações</th>
                    <th>Nota mínima</th>
                    <th>Nota do aluno</th>
                    <th>Situação</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id}>
                      <td>
                        <div className="subject-main">{row.title}</div>
                        <div className="subject-subline">{row.progressLabel}</div>
                      </td>
                      <td>{row.assessmentLabel}</td>
                      <td>{row.minimumScore}</td>
                      <td className="sheet-score">{row.score}</td>
                      <td>
                        <span className={`sheet-status ${row.statusClass}`}>{row.status}</span>
                      </td>
                      <td>
                        {row.actionHref ? (
                          <Link to={row.actionHref} className={`sheet-action ${row.actionClass}`}>
                            {row.actionLabel}
                          </Link>
                        ) : (
                          <span className="sheet-action-disabled">Sem ação</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <div className="boletim-empty-state">
          <div className="empty-icon"><i className="fas fa-table" /></div>
          <h3>Nenhuma matéria disponível</h3>
          <p>Quando o curso tiver matérias cadastradas, elas aparecerão aqui em formato de planilha.</p>
          <Link to="/dashboard" className="sheet-back-link">
            <i className="fas fa-arrow-left" /> Voltar ao painel
          </Link>
        </div>
      )}
    </div>
  )
}
