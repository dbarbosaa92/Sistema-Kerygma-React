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

  return (
    <div className="row">
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
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb bg-white p-3 rounded-pill shadow-sm">
            <li className="breadcrumb-item"><Link to="/dashboard">Cursos</Link></li>
            <li className="breadcrumb-item active">{course.title}</li>
          </ol>
        </nav>

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
  )
}
