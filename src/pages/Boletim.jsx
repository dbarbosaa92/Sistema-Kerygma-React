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

          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            background: 'rgba(200,169,110,0.12)',
            border: '1.5px solid #c8a96e',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 20,
          }}>
            <i className="fas fa-info-circle" style={{ color: '#c8a96e', fontSize: 18, marginTop: 1, flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 14, color: '#1a2744', lineHeight: 1.6 }}>
              <strong>Média mínima para aprovação:</strong> a nota mínima exigida em todas as matérias é de <strong>70%</strong>.
            </p>
          </div>

          {/* Desktop: tabela */}
          <section className="sheet-table-card d-none d-md-block">
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

          {/* Mobile: tabela compacta */}
          <section className="sheet-table-card d-md-none">
            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(26,43,92,0.04)', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
                    <th style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#1a2744', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>Matéria</th>
                    <th style={{ padding: '10px 8px', fontSize: 11, fontWeight: 600, color: '#1a2744', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Nota</th>
                    <th style={{ padding: '10px 8px', fontSize: 11, fontWeight: 600, color: '#1a2744', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.id} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.05)', background: i % 2 === 0 ? '#fff' : 'rgba(245,244,240,0.55)' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1a2744' }}>{row.title}</div>
                        {row.actionHref && (
                          <Link to={row.actionHref} style={{ fontSize: 11, color: '#c8a96e', fontWeight: 500, textDecoration: 'none' }}>
                            {row.actionLabel} →
                          </Link>
                        )}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontSize: 15, color: '#1a2744' }}>
                        {row.score}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <span className={`sheet-status ${row.statusClass}`} style={{ fontSize: 10, padding: '4px 8px', minWidth: 'unset' }}>
                          {row.status}
                        </span>
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
