// Equivalente a: adminController (course/lesson/attachment) + admin/course_edit.handlebars
import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const ALLOWED_TYPES = [
  'application/pdf','application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain','text/csv',
  'application/zip','application/x-rar-compressed','application/x-7z-compressed',
]
const MAX_SIZE = 25 * 1024 * 1024 // 25 MB

function youtubeToEmbed(url) {
  // Converte URLs do YouTube para embed — equivalente ao adminController.js
  const patterns = [
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/shorts\/([^?]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return `https://www.youtube.com/embed/${m[1]}`
  }
  return url
}

export default function CourseEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef()

  const coverImageRef = useRef()

  const [course,         setCourse]         = useState(null)
  const [lessons,        setLessons]        = useState([])
  const [loading,        setLoading]        = useState(true)
  const [saving,         setSaving]         = useState(false)
  const [msg,            setMsg]            = useState('')

  const [courseForm,     setCourseForm]     = useState({ title: '', description: '', image_url: '' })
  const [coverImageFile, setCoverImageFile] = useState(null)
  const [lessonForm,     setLessonForm]     = useState({ title: '', content_type: 'video', media_url: '' })
  const [attachForm,     setAttachForm]     = useState({ lesson_id: '', title: '' })
  const [uploadFile,     setUploadFile]     = useState(null)

  useEffect(() => { loadCourse() }, [id])

  async function loadCourse() {
    setLoading(true)
    const { data } = await supabase
      .from('courses')
      .select('*, lessons(*, lesson_attachments(*))')
      .eq('id', id)
      .single()
    setCourse(data)
    setCourseForm({ title: data?.title ?? '', description: data?.description ?? '', image_url: data?.image_url ?? '' })
    setLessons(data?.lessons ?? [])
    setLoading(false)
  }

  async function saveCourse(e) {
    e.preventDefault()
    setSaving(true)

    let updatedForm = { ...courseForm }

    if (coverImageFile) {
      const ext  = coverImageFile.name.split('.').pop()
      const path = `course-covers/${Date.now()}.${ext}`
      const { error: storageErr } = await supabase.storage
        .from('course-covers')
        .upload(path, coverImageFile, { contentType: coverImageFile.type })
      if (storageErr) {
        setMsg('Erro no upload: ' + storageErr.message)
        setSaving(false)
        return
      }
      const { data: urlData } = supabase.storage.from('course-covers').getPublicUrl(path)
      updatedForm.image_url = urlData.publicUrl
    }

    await supabase.from('courses').update(updatedForm).eq('id', id)
    setCourseForm(updatedForm)
    setCoverImageFile(null)
    if (coverImageRef.current) coverImageRef.current.value = ''
    setMsg('Curso atualizado!')
    setTimeout(() => setMsg(''), 3000)
    setSaving(false)
  }

  async function addLesson(e) {
    e.preventDefault()
    const mediaUrl = youtubeToEmbed(lessonForm.media_url.trim())
    await supabase.from('lessons').insert({
      ...lessonForm,
      media_url: mediaUrl,
      course_id: id,
      sort_order: lessons.length,
    })
    setLessonForm({ title: '', content_type: 'video', media_url: '' })
    loadCourse()
  }

  async function deleteLesson(lessonId) {
    if (!confirm('Excluir esta aula?')) return
    await supabase.from('lessons').delete().eq('id', lessonId)
    loadCourse()
  }

  async function uploadAttachment(e) {
    e.preventDefault()
    if (!uploadFile) return
    if (!ALLOWED_TYPES.includes(uploadFile.type)) { alert('Tipo de arquivo não permitido.'); return }
    if (uploadFile.size > MAX_SIZE) { alert('Arquivo maior que 25 MB.'); return }

    setSaving(true)
    const storedName = `${Date.now()}-${uploadFile.name}`
    const path = `lesson-files/${attachForm.lesson_id}/${storedName}`

    const { error: storageErr } = await supabase.storage.from('lesson-files').upload(path, uploadFile)
    if (storageErr) { alert('Erro no upload: ' + storageErr.message); setSaving(false); return }

    await supabase.from('lesson_attachments').insert({
      lesson_id: attachForm.lesson_id,
      title: attachForm.title || uploadFile.name,
      original_name: uploadFile.name,
      stored_name: storedName,
      mime_type: uploadFile.type,
      file_size: uploadFile.size,
      storage_path: path,
    })

    setAttachForm({ lesson_id: '', title: '' })
    setUploadFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setSaving(false)
    loadCourse()
  }

  async function deleteAttachment(att) {
    await supabase.storage.from('lesson-files').remove([att.storage_path])
    await supabase.from('lesson_attachments').delete().eq('id', att.id)
    loadCourse()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      <div className="d-flex align-items-center gap-3 mb-4">
        <Link to="/admin" className="btn btn-outline-primary btn-sm">
          <i className="fa fa-arrow-left" />
        </Link>
        <h4 className="mb-0">Editar Curso</h4>
      </div>

      {msg && <div className="alert alert-success py-2">{msg}</div>}

      {/* Dados do curso */}
      <div className="card mb-4">
        <div className="card-header"><strong>Dados do Curso</strong></div>
        <div className="card-body">
          <form onSubmit={saveCourse} className="row g-3">
            <div className="col-12">
              <label className="form-label">Título</label>
              <input className="form-control" value={courseForm.title}
                onChange={e => setCourseForm(p => ({ ...p, title: e.target.value }))} required />
            </div>
            <div className="col-12">
              <label className="form-label">Descrição</label>
              <textarea className="form-control" rows={3} value={courseForm.description}
                onChange={e => setCourseForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="col-12">
              <label className="form-label">Imagem de Capa</label>
              <input
                type="file"
                className="form-control mb-2"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                ref={coverImageRef}
                onChange={e => {
                  const file = e.target.files[0] || null
                  setCoverImageFile(file)
                  if (file) setCourseForm(p => ({ ...p, image_url: '' }))
                }}
              />
              <div className="text-center text-muted small my-1">— ou cole uma URL —</div>
              <input
                className="form-control"
                placeholder="https://..."
                value={courseForm.image_url}
                disabled={!!coverImageFile}
                onChange={e => setCourseForm(p => ({ ...p, image_url: e.target.value }))}
              />
              {(coverImageFile || courseForm.image_url) && (
                <img
                  src={coverImageFile ? URL.createObjectURL(coverImageFile) : courseForm.image_url}
                  alt="preview"
                  className="mt-2 rounded w-100"
                  style={{ height: '120px', objectFit: 'cover' }}
                  onError={e => { e.target.style.display = 'none' }}
                  onLoad={e => { e.target.style.display = 'block' }}
                />
              )}
            </div>
            <div className="col-12 text-end">
              <button className="btn btn-primary" disabled={saving}>Salvar</button>
            </div>
          </form>
        </div>
      </div>

      {/* Aulas */}
      <div className="card mb-4">
        <div className="card-header"><strong>Aulas ({lessons.length})</strong></div>
        <ul className="list-group list-group-flush">
          {lessons.map((l, i) => (
            <li key={l.id} className="list-group-item">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <strong className="small">{i + 1}. {l.title}</strong>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    {l.content_type.toUpperCase()} · {l.lesson_attachments?.length ?? 0} anexo(s)
                  </div>
                </div>
                <button className="btn btn-sm btn-outline-danger" onClick={() => deleteLesson(l.id)}>
                  <i className="fa fa-trash" />
                </button>
              </div>
              {/* Anexos desta aula */}
              {l.lesson_attachments?.map(att => (
                <div key={att.id} className="d-flex align-items-center gap-2 mt-1 ms-3 small text-muted">
                  <i className="fa fa-paperclip" />
                  <span>{att.title}</span>
                  <button className="btn btn-sm p-0 text-danger" onClick={() => deleteAttachment(att)}>
                    <i className="fa fa-times" />
                  </button>
                </div>
              ))}
            </li>
          ))}
        </ul>
        <div className="card-body border-top">
          <p className="fw-semibold small mb-2">Adicionar Aula</p>
          <form onSubmit={addLesson} className="row g-2">
            <div className="col-md-5">
              <input className="form-control form-control-sm" placeholder="Título da aula"
                value={lessonForm.title} onChange={e => setLessonForm(p => ({ ...p, title: e.target.value }))} required />
            </div>
            <div className="col-md-2">
              <select className="form-select form-select-sm" value={lessonForm.content_type}
                onChange={e => setLessonForm(p => ({ ...p, content_type: e.target.value }))}>
                <option value="video">Video</option>
                <option value="iframe">iFrame</option>
              </select>
            </div>
            <div className="col-md-4">
              <input className="form-control form-control-sm" placeholder="URL (YouTube ou embed)"
                value={lessonForm.media_url} onChange={e => setLessonForm(p => ({ ...p, media_url: e.target.value }))} required />
            </div>
            <div className="col-md-1">
              <button className="btn btn-primary btn-sm w-100" type="submit">
                <i className="fa fa-plus" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Upload de anexo */}
      {lessons.length > 0 && (
        <div className="card mb-4">
          <div className="card-header"><strong>Adicionar Anexo</strong></div>
          <div className="card-body">
            <form onSubmit={uploadAttachment} className="row g-2">
              <div className="col-md-4">
                <select className="form-select form-select-sm" value={attachForm.lesson_id}
                  onChange={e => setAttachForm(p => ({ ...p, lesson_id: e.target.value }))} required>
                  <option value="">Selecione a aula</option>
                  {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <input className="form-control form-control-sm" placeholder="Nome do anexo"
                  value={attachForm.title} onChange={e => setAttachForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="col-md-4">
                <input ref={fileInputRef} type="file" className="form-control form-control-sm"
                  onChange={e => setUploadFile(e.target.files[0])} required />
              </div>
              <div className="col-md-1">
                <button className="btn btn-warning btn-sm w-100" type="submit" disabled={saving}>
                  <i className="fa fa-upload" />
                </button>
              </div>
            </form>
            <small className="text-muted">Máx. 25 MB · PDF, DOC, PPT, XLS, TXT, ZIP, RAR</small>
          </div>
        </div>
      )}
    </div>
  )
}
