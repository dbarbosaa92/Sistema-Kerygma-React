import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/ui/LoadingSpinner'

function fileIcon(mimeType = '') {
  if (mimeType.includes('pdf'))        return 'fa-file-pdf'
  if (mimeType.includes('word'))       return 'fa-file-word'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'fa-file-excel'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'fa-file-powerpoint'
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'fa-file-archive'
  return 'fa-file-alt'
}

function fileSizeLabel(bytes = 0) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Course() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { profile } = useAuth()

  const [course,       setCourse]       = useState(null)
  const [lessons,      setLessons]      = useState([])
  const [allArchives,  setAllArchives]  = useState([])  // todos os anexos do curso
  const [exams,        setExams]        = useState([])
  const [progress,     setProgress]     = useState({})
  const [activeLesson, setActiveLesson] = useState(null)
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    if (profile) loadCourse()
  }, [id, profile])

  async function loadCourse() {
    setLoading(true)
    const [courseRes, lessonsRes, examsRes, progressRes] = await Promise.all([
      supabase.from('courses').select('*').eq('id', id).single(),
      supabase.from('lessons').select('*, lesson_attachments(*)').eq('course_id', id).order('sort_order'),
      supabase.from('exams').select('id, title, duration_minutes, passing_score').eq('course_id', id),
      supabase.from('lesson_progress').select('lesson_id, completed').eq('user_id', profile.id),
    ])

    const progressMap = {}
    progressRes.data?.forEach(p => { progressMap[p.lesson_id] = p.completed })

    const canAccess = !profile.content_access_date || new Date() >= new Date(profile.content_access_date)
    const fetchedLessons = canAccess ? (lessonsRes.data ?? []) : []

    // Todos os anexos agregados de todas as aulas
    const archives = fetchedLessons.flatMap(l => (l.lesson_attachments ?? []))

    setCourse(courseRes.data)
    setLessons(fetchedLessons)
    setAllArchives(archives)
    setExams(examsRes.data ?? [])
    setProgress(progressMap)

    // Usa lesson_id da query string se existir, senão primeira aula
    const lessonIdFromQuery = searchParams.get('lesson_id')
    const initial = fetchedLessons.find(l => l.id === lessonIdFromQuery) ?? fetchedLessons[0] ?? null
    setActiveLesson(initial)
    setLoading(false)
  }

  function selectLesson(lesson) {
    setActiveLesson(lesson)
    setSearchParams({ lesson_id: lesson.id })
  }

  async function handleCompleteLesson(lessonId) {
    await supabase.from('lesson_progress').upsert(
      { user_id: profile.id, lesson_id: lessonId, completed: true },
      { onConflict: 'user_id,lesson_id' }
    )
    setProgress(prev => ({ ...prev, [lessonId]: true }))
  }

  async function downloadAttachment(att) {
    const { data } = await supabase.storage
      .from('lesson-files')
      .createSignedUrl(att.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  if (loading) return <LoadingSpinner />
  if (!course)  return <div className="container py-5"><p>Curso não encontrado.</p></div>

  const activeLessonArchives = activeLesson?.lesson_attachments ?? []
  const completedCount = lessons.filter(l => progress[l.id]).length
  const progressPct    = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0

  return (
    <>
    {/* ── Layout Mobile ── */}
    <div className="d-md-none aula-mobile-wrapper">

      {/* Botão voltar */}
      <Link
        to="/dashboard"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#1a2744', textDecoration: 'none', fontSize: 14, fontWeight: 600, marginBottom: 14, background: '#fff', border: '1.5px solid #e0ddd8', borderRadius: 10, padding: '9px 16px' }}
      >
        <i className="fas fa-arrow-left" style={{ fontSize: 13 }} />
        Voltar
      </Link>

      {/* Cabeçalho */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span style={{ color: '#1a2744', fontSize: 14, fontWeight: 500 }}>{course.title}</span>
        <span style={{ color: '#888', fontSize: 11 }}>{progressPct}% concluído</span>
      </div>

      {/* Vídeo em destaque */}
      {activeLesson && (
        <div className="mb-2" style={{ borderRadius: 10, overflow: 'hidden' }}>
          {activeLesson.content_type === 'video' ? (
            <video controls className="w-100" style={{ borderRadius: 10, display: 'block' }}>
              <source src={activeLesson.media_url} type="video/mp4" />
              Seu navegador não suporta vídeos.
            </video>
          ) : (
            <div className="ratio ratio-16x9" style={{ borderRadius: 10, overflow: 'hidden' }}>
              <iframe
                src={activeLesson.media_url}
                title={activeLesson.title}
                frameBorder="0"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          )}
        </div>
      )}

      {/* Barra de progresso */}
      <div className="aula-progress-bar">
        <div className="aula-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Botão marcar como concluída */}
      {activeLesson && (
        <button
          onClick={() => handleCompleteLesson(activeLesson.id)}
          disabled={!!progress[activeLesson.id]}
          style={{
            width: '100%',
            padding: '11px',
            borderRadius: 10,
            border: 'none',
            marginBottom: 14,
            fontWeight: 600,
            fontSize: 14,
            cursor: progress[activeLesson.id] ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: progress[activeLesson.id] ? 'rgba(46,125,82,0.12)' : '#1a2744',
            color: progress[activeLesson.id] ? '#2e7d52' : '#ffffff',
          }}
        >
          <i className={`fas ${progress[activeLesson.id] ? 'fa-check-circle' : 'fa-check'}`} />
          {progress[activeLesson.id] ? 'Aula concluída' : 'Marcar como concluída'}
        </button>
      )}

      {/* Aulas do curso */}
      <div className="aula-section-label">Aulas do curso</div>
      {lessons.map(lesson => (
        <div
          key={lesson.id}
          className="aula-item-card"
          onClick={() => selectLesson(lesson)}
          style={{ cursor: 'pointer' }}
        >
          <div className={`aula-check-circle${progress[lesson.id] ? ' done' : ''}`}>
            {progress[lesson.id] && (
              <i className="fas fa-check" style={{ color: '#fff', fontSize: 9 }} />
            )}
          </div>
          <div className="flex-grow-1" style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: '#1a2744', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lesson.title}
            </div>
            {lesson.duration_minutes && (
              <div style={{ fontSize: 11, color: '#888' }}>{lesson.duration_minutes} min</div>
            )}
          </div>
          <i className="fas fa-play" style={{ color: '#1a2744', fontSize: 11, flexShrink: 0 }} />
        </div>
      ))}

      {/* Materiais da aula */}
      <div className="aula-section-label">Materiais da aula</div>
      {activeLessonArchives.length === 0 ? (
        <p style={{ color: '#aaa', fontSize: 12, margin: 0 }}>Nenhum arquivo disponível</p>
      ) : (
        activeLessonArchives.map(att => (
          <div key={att.id} className="aula-item-card">
            <i className={`fas ${fileIcon(att.mime_type)}`} style={{ color: '#c8a96e', fontSize: 18, flexShrink: 0 }} />
            <div className="flex-grow-1" style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, color: '#1a2744', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {att.title}
              </div>
            </div>
            <button
              onClick={() => downloadAttachment(att)}
              style={{ background: 'none', border: 'none', color: '#1a2744', fontSize: 16, cursor: 'pointer', flexShrink: 0, padding: 0 }}
              aria-label="Baixar arquivo"
            >
              ⬇
            </button>
          </div>
        ))
      )}

      {/* Card de avaliação */}
      {exams.map(exam => (
        <Link key={exam.id} to={`/exams/${exam.id}`} className="text-decoration-none">
          <div className="aula-avaliacao-card">
            <i className="fas fa-clipboard-list" style={{ color: '#c8a96e', fontSize: 18, flexShrink: 0 }} />
            <div className="flex-grow-1" style={{ color: '#fff', fontSize: 13, fontWeight: 500, minWidth: 0 }}>
              {exam.title}
            </div>
            <span style={{ background: 'rgba(200,169,110,0.2)', color: '#c8a96e', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
              {exam.duration_minutes} min
            </span>
          </div>
        </Link>
      ))}
    </div>

    {/* ── Layout Desktop ── */}
    <div className="row d-none d-md-flex">
      {/* ── Sidebar ── */}
      <div className="col-md-3">
        {/* Conteúdos */}
        <div className="list-group shadow-sm rounded-3 overflow-hidden mb-4">
          <div className="list-group-item bg-primary text-white fw-semibold">Conteúdos</div>
          {lessons.map(lesson => (
            <button
              key={lesson.id}
              className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center text-start ${activeLesson?.id === lesson.id ? 'active' : ''}`}
              onClick={() => selectLesson(lesson)}
            >
              <span>
                <i className={`fas ${lesson.content_type === 'video' ? 'fa-play-circle' : 'fa-window-maximize'} me-2`} />
                {lesson.title}
              </span>
              {progress[lesson.id] && (
                <i className="fas fa-check-circle text-success bg-white rounded-circle p-1" />
              )}
            </button>
          ))}
        </div>

        {/* Arquivos */}
        <div className="list-group shadow-sm rounded-3 overflow-hidden mb-4">
          <div className="list-group-item bg-warning text-dark fw-semibold">
            <i className="fas fa-folder-open me-2" />Arquivos
          </div>
          {allArchives.length === 0 ? (
            <div className="list-group-item text-muted">Nenhum arquivo disponivel nesta materia ainda.</div>
          ) : (
            allArchives.map(att => (
              <button
                key={att.id}
                className="list-group-item list-group-item-action d-flex justify-content-between align-items-center text-start"
                onClick={() => downloadAttachment(att)}
              >
                <span className="me-2">
                  <i className={`fas ${fileIcon(att.mime_type)} me-2 text-warning`} />
                  {att.title}
                </span>
                <span className="badge bg-light text-dark">{fileSizeLabel(att.file_size)}</span>
              </button>
            ))
          )}
        </div>

        {/* Avaliações */}
        <div className="list-group shadow-sm rounded-3 overflow-hidden">
          <div className="list-group-item bg-warning text-dark fw-semibold">
            <i className="fas fa-clipboard-list me-2" />Avaliações
          </div>
          {exams.length === 0 ? (
            <div className="list-group-item text-muted">Nenhuma avaliação cadastrada.</div>
          ) : (
            exams.map(exam => (
              <Link
                key={exam.id}
                to={`/exams/${exam.id}`}
                className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
              >
                {exam.title}
                <span className="badge badge-grade-low rounded-pill">{exam.duration_minutes} min</span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* ── Conteúdo principal ── */}
      <div className="col-md-9">
        <div className="d-flex align-items-center gap-3 mb-3">
          <Link
            to="/dashboard"
            className="btn btn-outline-primary btn-sm px-3"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <i className="fas fa-arrow-left" /> Voltar
          </Link>
          <nav aria-label="breadcrumb" className="mb-0">
            <ol className="breadcrumb bg-white px-3 py-2 rounded-pill shadow-sm mb-0">
              <li className="breadcrumb-item"><Link to="/dashboard">Cursos</Link></li>
              <li className="breadcrumb-item active">{course.title}</li>
            </ol>
          </nav>
        </div>

        {activeLesson ? (
          <div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-4">
            <div className="card-body p-4">
              <h2 className="fw-medium mb-4">{activeLesson.title}</h2>

              <div className="ratio ratio-16x9 rounded overflow-hidden shadow-sm bg-dark">
                {activeLesson.content_type === 'video' ? (
                  <video controls className="w-100">
                    <source src={activeLesson.media_url} type="video/mp4" />
                    Seu navegador não suporta vídeos.
                  </video>
                ) : (
                  <iframe
                    src={activeLesson.media_url}
                    title={activeLesson.title}
                    frameBorder="0"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                )}
              </div>

              {/* Materiais da aula ativa */}
              <div className="mt-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-medium mb-0">Materiais da aula</h5>
                  <span className="text-muted small">{activeLessonArchives.length} arquivo(s)</span>
                </div>
                <div className="list-group shadow-sm rounded-3 overflow-hidden">
                  {activeLessonArchives.length === 0 ? (
                    <div className="list-group-item text-muted">Esta aula ainda nao possui arquivos anexados.</div>
                  ) : (
                    activeLessonArchives.map(att => (
                      <button
                        key={att.id}
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center text-start"
                        onClick={() => downloadAttachment(att)}
                      >
                        <span className="me-3">
                          <i className={`fas ${fileIcon(att.mime_type)} me-2 text-warning`} />
                          <strong>{att.title}</strong>
                          <span className="text-muted small d-block">{att.original_name}</span>
                        </span>
                        <span className="badge bg-warning">{fileSizeLabel(att.file_size)}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Status de conclusão */}
              <div className="mt-4 d-flex justify-content-between align-items-center bg-light p-3 rounded shadow-sm border">
                <div>
                  {progress[activeLesson.id] ? (
                    <span className="text-success fw-semibold">
                      <i className="fas fa-check-circle fs-4 align-middle" /> Aula Concluída!
                    </span>
                  ) : (
                    <span className="text-muted">Ainda não marcou como concluída.</span>
                  )}
                </div>
                <button
                  className={`btn ${progress[activeLesson.id] ? 'btn-success' : 'btn-primary'} px-4 shadow-sm`}
                  onClick={() => handleCompleteLesson(activeLesson.id)}
                  disabled={!!progress[activeLesson.id]}
                >
                  <i className="fas fa-check" /> Marcar como Concluída
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="alert alert-info">Nenhuma aula selecionada ou disponível.</div>
        )}
      </div>
    </div>
    </>
  )
}
