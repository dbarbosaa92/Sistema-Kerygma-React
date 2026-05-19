import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

// ── Formulários iniciais ──────────────────────────────────────
const EMPTY_COURSE  = { title: '', description: '', image_url: '' }
const EMPTY_USER    = { name: '', cpf: '', email: '', password: '', role: 'student' }
const EMPTY_EXAM    = { title: '', course_id: '', duration_minutes: 60, passing_score: 60 }
const EMPTY_NOTICE  = { title: '', content: '', category: 'Geral', image_url: '' }
const EMPTY_EVENT   = { title: '', description: '', event_date: '', event_type: 'evento' }
const EMPTY_BULK    = { title: '', description: '', month_year: '', event_type: 'evento', weekdays: [] }

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const EVENT_TYPES = {
  aula_presencial: { label: 'Aula Presencial', badge: 'warning'  },
  aula_online:     { label: 'Aula Online',     badge: 'primary'  },
  prova:           { label: 'Prova',           badge: 'danger'   },
  evento:          { label: 'Evento',          badge: 'success'  },
}

// ── Componente de alerta interno ──────────────────────────────
function Alert({ msg, type = 'success', onClose }) {
  if (!msg) return null
  return (
    <div className={`alert alert-${type} alert-dismissible fade show rounded-4 shadow-sm mb-4`} role="alert">
      <i className={`fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2`} />
      {msg}
      <button type="button" className="btn-close" onClick={onClose} />
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('cursos')

  // Dados
  const [courses,        setCourses]        = useState([])
  const [users,          setUsers]          = useState([])
  const [students,       setStudents]       = useState([])
  const [exams,          setExams]          = useState([])
  const [notices,        setNotices]        = useState([])
  const [calendarEvents, setCalendarEvents] = useState([])
  const [loading,        setLoading]        = useState(true)

  // Formulários
  const courseImageRef = useRef()
  const [courseImageFile, setCourseImageFile] = useState(null)

  const [courseForm,  setCourseForm]  = useState(EMPTY_COURSE)
  const [userForm,    setUserForm]    = useState(EMPTY_USER)
  const [examForm,    setExamForm]    = useState(EMPTY_EXAM)
  const [noticeForm,  setNoticeForm]  = useState(EMPTY_NOTICE)
  const [eventForm,   setEventForm]   = useState(EMPTY_EVENT)
  const [bulkForm,    setBulkForm]    = useState(() => ({
    ...EMPTY_BULK,
    month_year: new Date().toISOString().slice(0, 7),
  }))

  // Feedback
  const [alert, setAlert] = useState({ msg: '', type: 'success' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  function showAlert(msg, type = 'success') {
    setAlert({ msg, type })
    setTimeout(() => setAlert({ msg: '', type: 'success' }), 4000)
  }

  async function loadAll() {
    setLoading(true)
    const [cRes, uRes, eRes, nRes, evRes] = await Promise.all([
      supabase.from('courses').select('id, title, description, image_url, created_at').order('created_at', { ascending: false }),
      supabase.from('users').select('id, name, cpf, email, role, is_active').order('name'),
      supabase.from('exams').select('id, title, duration_minutes, passing_score, course_id, courses(title), questions(count)').order('created_at', { ascending: false }),
      supabase.from('notices').select('id, title, category, image_url, created_at, users(name)').order('created_at', { ascending: false }),
      supabase.from('calendar_events').select('*').order('event_date'),
    ])
    setCourses(cRes.data ?? [])
    setUsers(uRes.data ?? [])
    setStudents((uRes.data ?? []).filter(u => u.role === 'student'))
    setExams(eRes.data ?? [])
    setNotices(nRes.data ?? [])
    setCalendarEvents(evRes.data ?? [])
    setLoading(false)
  }

  // ── CURSOS ───────────────────────────────────────────────────
  async function handleCreateCourse(e) {
    e.preventDefault()
    setSaving(true)

    let imageUrl = courseForm.image_url

    if (courseImageFile) {
      const ext  = courseImageFile.name.split('.').pop()
      const path = `course-covers/${Date.now()}.${ext}`
      const { error: storageErr } = await supabase.storage
        .from('course-covers')
        .upload(path, courseImageFile, { contentType: courseImageFile.type })
      if (storageErr) {
        showAlert('Erro no upload da imagem: ' + storageErr.message, 'danger')
        setSaving(false)
        return
      }
      const { data: urlData } = supabase.storage.from('course-covers').getPublicUrl(path)
      imageUrl = urlData.publicUrl
    }

    const { error } = await supabase.from('courses').insert({ ...courseForm, image_url: imageUrl })
    if (error) { showAlert('Erro: ' + error.message, 'danger') }
    else {
      showAlert('Curso cadastrado com sucesso!')
      setCourseForm(EMPTY_COURSE)
      setCourseImageFile(null)
      if (courseImageRef.current) courseImageRef.current.value = ''
      loadAll()
    }
    setSaving(false)
  }

  async function handleDeleteCourse(id) {
    if (!confirm('Excluir este curso e todas as aulas/provas vinculadas?')) return
    await supabase.from('courses').delete().eq('id', id)
    showAlert('Curso excluído.')
    loadAll()
  }

  // ── USUÁRIOS ─────────────────────────────────────────────────
  async function handleCreateUser(e) {
    e.preventDefault()
    setSaving(true)
    const { name, cpf, email, password, role } = userForm
    const cleanCpf = cpf.replace(/\D/g, '')

    const { error } = await supabase.rpc('admin_create_user', {
      p_email:    email,
      p_password: password,
      p_name:     name,
      p_cpf:      cleanCpf,
      p_role:     role,
    })

    if (error) {
      showAlert('Erro ao criar usuário: ' + error.message, 'danger')
    } else {
      showAlert('Usuário criado com sucesso!')
      setUserForm(EMPTY_USER)
      loadAll()
    }
    setSaving(false)
  }

  async function handleToggleUser(user) {
    await supabase.from('users').update({ is_active: !user.is_active }).eq('id', user.id)
    showAlert(`Usuário ${!user.is_active ? 'ativado' : 'desativado'}.`)
    loadAll()
  }

  async function handleDeleteUser(id) {
    if (!confirm('Excluir este usuário permanentemente?')) return
    await supabase.from('users').delete().eq('id', id)
    showAlert('Usuário excluído.')
    loadAll()
  }

  // ── PROVAS ───────────────────────────────────────────────────
  async function handleCreateExam(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('exams').insert({
      title:            examForm.title,
      course_id:        examForm.course_id,
      duration_minutes: Number(examForm.duration_minutes),
      passing_score:    Number(examForm.passing_score),
    })
    if (error) { showAlert('Erro: ' + error.message, 'danger') }
    else { showAlert('Prova criada! Agora adicione questões clicando em "Questões".'); setExamForm(EMPTY_EXAM); loadAll() }
    setSaving(false)
  }

  async function handleDeleteExam(id) {
    if (!confirm('Excluir esta prova? Todas as notas dos alunos serão perdidas.')) return
    await supabase.from('exams').delete().eq('id', id)
    showAlert('Prova excluída.')
    loadAll()
  }

  // ── AVISOS ───────────────────────────────────────────────────
  async function handlePublishNotice(e) {
    e.preventDefault()
    setSaving(true)
    const { data: me } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', (await supabase.auth.getUser()).data.user?.id)
      .single()

    const { error } = await supabase.from('notices').insert({
      ...noticeForm,
      author_id: me?.id,
      image_url: noticeForm.image_url || null,
    })
    if (error) { showAlert('Erro: ' + error.message, 'danger') }
    else { showAlert('Aviso publicado com sucesso!'); setNoticeForm(EMPTY_NOTICE); loadAll() }
    setSaving(false)
  }

  async function handleDeleteNotice(id) {
    if (!confirm('Excluir este aviso?')) return
    await supabase.from('notices').delete().eq('id', id)
    showAlert('Aviso excluído.')
    loadAll()
  }

  // ── CALENDÁRIO ───────────────────────────────────────────────
  async function handleCreateEvent(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('calendar_events').insert({
      title:       eventForm.title,
      description: eventForm.description || null,
      event_date:  eventForm.event_date,
      event_type:  eventForm.event_type,
    })
    if (error) { showAlert('Erro: ' + error.message, 'danger') }
    else { showAlert('Evento adicionado ao calendário!'); setEventForm(EMPTY_EVENT); loadAll() }
    setSaving(false)
  }

  async function handleDeleteEvent(id) {
    if (!confirm('Excluir este evento do calendário?')) return
    await supabase.from('calendar_events').delete().eq('id', id)
    showAlert('Evento excluído.')
    loadAll()
  }

  async function handleCreateBulkEvents(e) {
    e.preventDefault()
    if (bulkForm.weekdays.length === 0) {
      showAlert('Selecione pelo menos um dia da semana.', 'danger')
      return
    }
    setSaving(true)
    const [year, month] = bulkForm.month_year.split('-').map(Number)
    const daysInMonth   = new Date(year, month, 0).getDate()
    const pad           = n => String(n).padStart(2, '0')
    const records       = []

    for (let day = 1; day <= daysInMonth; day++) {
      if (bulkForm.weekdays.includes(new Date(year, month - 1, day).getDay())) {
        records.push({
          title:       bulkForm.title,
          description: bulkForm.description || null,
          event_date:  `${year}-${pad(month)}-${pad(day)}`,
          event_type:  bulkForm.event_type,
        })
      }
    }

    const { error } = await supabase.from('calendar_events').insert(records)
    if (error) { showAlert('Erro: ' + error.message, 'danger') }
    else {
      showAlert(`${records.length} evento(s) criados com sucesso!`)
      setBulkForm(p => ({ ...EMPTY_BULK, month_year: p.month_year }))
      loadAll()
    }
    setSaving(false)
  }

  function bulkPreviewCount() {
    if (!bulkForm.month_year || bulkForm.weekdays.length === 0) return 0
    const [year, month] = bulkForm.month_year.split('-').map(Number)
    const daysInMonth   = new Date(year, month, 0).getDate()
    let count = 0
    for (let day = 1; day <= daysInMonth; day++) {
      if (bulkForm.weekdays.includes(new Date(year, month - 1, day).getDay())) count++
    }
    return count
  }

  // ── Tabs config ───────────────────────────────────────────────
  const tabs = [
    { id: 'cursos',     label: 'Cursos',     icon: 'fa-book'            },
    { id: 'usuarios',   label: 'Usuários',   icon: 'fa-users'           },
    { id: 'provas',     label: 'Provas',     icon: 'fa-file-alt'        },
    { id: 'boletins',   label: 'Boletins',   icon: 'fa-clipboard-check' },
    { id: 'avisos',     label: 'Avisos',     icon: 'fa-bullhorn'        },
    { id: 'calendario', label: 'Calendário', icon: 'fa-calendar-alt'    },
  ]

  if (loading) return <LoadingSpinner />

  return (
    <div className="row g-4">

      {/* ── Sidebar ── */}
      <div className="col-md-3">
        <div className="card border-0 shadow-sm rounded-4 sticky-top" style={{ top: '2rem', zIndex: 100 }}>
          <div className="card-body p-0 overflow-hidden">
            <div className="p-4 bg-dark text-white text-center">
              <i className="fas fa-user-shield fa-3x mb-3" />
              <h5 className="mb-0">Painel Admin</h5>
              <small className="text-muted">Gestão do Sistema</small>
            </div>
            <div className="list-group list-group-flush admin-nav">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`list-group-item list-group-item-action py-3 px-4 text-start ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <i className={`fas ${tab.icon} me-2`} /> {tab.label}
                </button>
              ))}
              <div className="p-3 d-flex flex-column gap-2">
                <Link to="/admin/matriculas" className="btn btn-outline-warning w-100 rounded-pill btn-sm">
                  <i className="fas fa-id-card me-2" /> Matrículas
                </Link>
                <Link to="/dashboard" className="btn btn-outline-secondary w-100 rounded-pill btn-sm">
                  <i className="fas fa-arrow-left me-2" /> Voltar ao App
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Conteúdo ── */}
      <div className="col-md-9">
        <Alert msg={alert.msg} type={alert.type} onClose={() => setAlert({ msg: '' })} />

        {/* ════ CURSOS ════ */}
        {activeTab === 'cursos' && (
          <>
            <div className="card shadow-sm border-0 rounded-4 mb-4">
              <div className="card-header bg-primary text-white fw-bold py-3">
                <i className="fas fa-plus-circle me-2" /> Novo Curso
              </div>
              <div className="card-body p-4 bg-light">
                <form onSubmit={handleCreateCourse} className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label fw-bold small">Título</label>
                    <input className="form-control" placeholder="Ex: Teologia Básica"
                      value={courseForm.title}
                      onChange={e => setCourseForm(p => ({ ...p, title: e.target.value }))} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold small">Descrição</label>
                    <input className="form-control" placeholder="Breve resumo..."
                      value={courseForm.description}
                      onChange={e => setCourseForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold small">Capa do Curso</label>
                    <input
                      type="file"
                      className="form-control mb-2"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                      ref={courseImageRef}
                      onChange={e => {
                        const file = e.target.files[0] || null
                        setCourseImageFile(file)
                        if (file) setCourseForm(p => ({ ...p, image_url: '' }))
                      }}
                    />
                    <div className="text-center text-muted small my-1">— ou cole uma URL —</div>
                    <input
                      className="form-control"
                      placeholder="https://..."
                      value={courseForm.image_url}
                      disabled={!!courseImageFile}
                      onChange={e => setCourseForm(p => ({ ...p, image_url: e.target.value }))}
                    />
                    {(courseImageFile || courseForm.image_url) && (
                      <img
                        src={courseImageFile ? URL.createObjectURL(courseImageFile) : courseForm.image_url}
                        alt="preview"
                        className="mt-2 rounded w-100"
                        style={{ height: '80px', objectFit: 'cover' }}
                        onError={e => { e.target.style.display = 'none' }}
                        onLoad={e => { e.target.style.display = 'block' }}
                      />
                    )}
                  </div>
                  <div className="col-12 mt-3">
                    <button className="btn btn-primary rounded-pill px-4" disabled={saving}>
                      <i className="fas fa-save me-2" /> Cadastrar Curso
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="card shadow-sm border-0 rounded-4">
              <div className="card-header bg-white text-dark fw-bold py-3 border-bottom">
                <i className="fas fa-list me-2 text-primary" /> Cursos Registrados
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-4">Curso</th>
                        <th>Status</th>
                        <th className="text-end pe-4">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.length === 0 ? (
                        <tr><td colSpan={3} className="text-center py-5 text-muted">Nenhum curso cadastrado ainda.</td></tr>
                      ) : courses.map(c => (
                        <tr key={c.id}>
                          <td className="ps-4">
                            <div className="d-flex align-items-center">
                              <img
                                src={c.image_url || 'https://via.placeholder.com/40'}
                                className="rounded me-3"
                                style={{ width: 40, height: 40, objectFit: 'cover' }}
                                alt=""
                              />
                              <div>
                                <div className="fw-bold">{c.title}</div>
                                <small className="text-muted">{c.description}</small>
                              </div>
                            </div>
                          </td>
                          <td><span className="badge bg-success rounded-pill">Ativo</span></td>
                          <td className="text-end pe-4">
                            <Link to={`/admin/courses/${c.id}`} className="btn btn-sm btn-outline-primary rounded-pill me-1">
                              <i className="fas fa-edit me-1" /> Gerenciar
                            </Link>
                            <button className="btn btn-sm btn-outline-danger rounded-pill"
                              onClick={() => handleDeleteCourse(c.id)}>
                              <i className="fas fa-trash" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ════ USUÁRIOS ════ */}
        {activeTab === 'usuarios' && (
          <>
            <div className="card shadow-sm border-0 rounded-4 mb-4">
              <div className="card-header bg-success text-white fw-bold py-3">
                <i className="fas fa-user-plus me-2" /> Registrar Novo Usuário
              </div>
              <div className="card-body p-4 bg-light">
                <form onSubmit={handleCreateUser} className="row g-3" autoComplete="off">
                  <div className="col-md-4">
                    <label className="form-label fw-bold small">Nome Completo</label>
                    <input className="form-control" placeholder="Nome do aluno ou professor"
                      value={userForm.name} autoComplete="off"
                      onChange={e => setUserForm(p => ({ ...p, name: e.target.value }))} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold small">CPF (somente números)</label>
                    <input className="form-control" placeholder="Somente números" maxLength={14}
                      value={userForm.cpf} autoComplete="off"
                      onChange={e => setUserForm(p => ({ ...p, cpf: e.target.value }))} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold small">E-mail</label>
                    <input type="email" className="form-control" placeholder="email@exemplo.com"
                      value={userForm.email} autoComplete="off"
                      onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold small">Senha Inicial</label>
                    <input type="password" className="form-control" placeholder="Mínimo 6 caracteres"
                      value={userForm.password} minLength={6} autoComplete="new-password"
                      onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} required />
                  </div>
                  <div className="col-md-8 d-flex align-items-end">
                    <div className="p-3 border rounded bg-white w-100 d-flex gap-4">
                      {['student', 'teacher'].map(r => (
                        <div key={r} className="form-check">
                          <input className="form-check-input" type="radio" name="role"
                            id={`role_${r}`} value={r} checked={userForm.role === r}
                            onChange={() => setUserForm(p => ({ ...p, role: r }))} />
                          <label className="form-check-label" htmlFor={`role_${r}`}>
                            {r === 'student' ? 'Aluno' : 'Professor'}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="col-12 mt-2">
                    <button className="btn btn-success rounded-pill px-4" disabled={saving}>
                      <i className="fas fa-save me-2" /> Criar Usuário
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="card shadow-sm border-0 rounded-4">
              <div className="card-header bg-white text-dark fw-bold py-3 border-bottom">
                <i className="fas fa-users me-2 text-success" /> Usuários Cadastrados ({users.length})
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-4">Nome</th>
                        <th>CPF</th>
                        <th>Cargo</th>
                        <th>Status</th>
                        <th className="text-end pe-4">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-5 text-muted">Nenhum usuário cadastrado.</td></tr>
                      ) : users.map(u => (
                        <tr key={u.id}>
                          <td className="ps-4">
                            <div className="fw-bold">{u.name}</div>
                            <small className="text-muted">{u.email}</small>
                          </td>
                          <td className="text-muted">{u.cpf}</td>
                          <td>
                            <span className={`badge rounded-pill ${u.role === 'teacher' ? 'bg-danger' : 'bg-primary'}`}>
                              {u.role === 'teacher' ? 'Professor' : 'Aluno'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge rounded-pill ${u.is_active ? 'bg-success' : 'bg-secondary'}`}>
                              {u.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="text-end pe-4">
                            <Link to={`/admin/users/${u.id}`} className="btn btn-sm btn-outline-primary rounded-pill me-1">
                              <i className="fas fa-edit" />
                            </Link>
                            <button className="btn btn-sm btn-outline-warning rounded-pill me-1"
                              onClick={() => handleToggleUser(u)} title={u.is_active ? 'Desativar' : 'Ativar'}>
                              <i className={`fas ${u.is_active ? 'fa-ban' : 'fa-check'}`} />
                            </button>
                            <button className="btn btn-sm btn-outline-danger rounded-pill"
                              onClick={() => handleDeleteUser(u.id)}>
                              <i className="fas fa-trash" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ════ PROVAS ════ */}
        {activeTab === 'provas' && (
          <>
            <div className="card shadow-sm border-0 rounded-4 mb-4">
              <div className="card-header text-white fw-bold py-3" style={{ background: 'var(--navy)' }}>
                <i className="fas fa-plus-circle me-2" /> Nova Prova
              </div>
              <div className="card-body p-4 bg-light">
                <form onSubmit={handleCreateExam} className="row g-3">
                  <div className="col-md-5">
                    <label className="form-label fw-bold small">Título da Prova</label>
                    <input className="form-control" placeholder="Ex: Prova Final - Módulo 1"
                      value={examForm.title}
                      onChange={e => setExamForm(p => ({ ...p, title: e.target.value }))} required />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-bold small">Curso / Matéria</label>
                    <select className="form-select" value={examForm.course_id}
                      onChange={e => setExamForm(p => ({ ...p, course_id: e.target.value }))} required>
                      <option value="">Selecione...</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                  <div className="col-md-2">
                    <label className="form-label fw-bold small">Duração (min)</label>
                    <input type="number" className="form-control" min={1}
                      value={examForm.duration_minutes}
                      onChange={e => setExamForm(p => ({ ...p, duration_minutes: e.target.value }))} required />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label fw-bold small">Nota Mínima (%)</label>
                    <input type="number" className="form-control" min={0} max={100} step={0.1}
                      value={examForm.passing_score}
                      onChange={e => setExamForm(p => ({ ...p, passing_score: e.target.value }))} required />
                  </div>
                  <div className="col-12">
                    <button className="btn btn-primary rounded-pill px-4" disabled={saving}>
                      <i className="fas fa-save me-2" /> Criar Prova
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="card shadow-sm border-0 rounded-4">
              <div className="card-header bg-white text-dark fw-bold py-3 border-bottom">
                <i className="fas fa-list me-2 text-primary" /> Provas Cadastradas
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-4">Prova</th>
                        <th>Matéria</th>
                        <th className="text-center">Questões</th>
                        <th className="text-center">Duração</th>
                        <th className="text-end pe-4">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exams.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-5 text-muted">Nenhuma prova cadastrada ainda.</td></tr>
                      ) : exams.map(ex => (
                        <tr key={ex.id}>
                          <td className="ps-4">
                            <div className="fw-bold">{ex.title}</div>
                            <small className="text-muted">Nota mín: {ex.passing_score}%</small>
                          </td>
                          <td>
                            <span className="badge bg-primary rounded-pill">{ex.courses?.title}</span>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-secondary rounded-pill">
                              {ex.questions?.[0]?.count ?? 0} quest.
                            </span>
                          </td>
                          <td className="text-center">{ex.duration_minutes} min</td>
                          <td className="text-end pe-4">
                            <Link to={`/admin/exams/${ex.id}`}
                              className="btn btn-sm btn-outline-primary rounded-pill me-1">
                              <i className="fas fa-edit me-1" /> Questões
                            </Link>
                            <button className="btn btn-sm btn-outline-danger rounded-pill"
                              onClick={() => handleDeleteExam(ex.id)}>
                              <i className="fas fa-trash" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ════ BOLETINS ════ */}
        {activeTab === 'boletins' && (
          <div className="card shadow-sm border-0 rounded-4">
            <div className="card-header bg-white fw-bold py-3 border-bottom">
              <i className="fas fa-clipboard-check me-2 text-success" /> Boletins dos Alunos
              <small className="text-muted fw-normal ms-2">Clique em um aluno para ver e editar suas notas</small>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4">Aluno</th>
                      <th>CPF</th>
                      <th>E-mail</th>
                      <th className="text-end pe-4">Boletim</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-5 text-muted">Nenhum aluno cadastrado ainda.</td></tr>
                    ) : students.map(s => (
                      <tr key={s.id}>
                        <td className="ps-4">
                          <div className="d-flex align-items-center gap-2">
                            <div className="mini-avatar">{s.name?.[0]?.toUpperCase()}</div>
                            <div className="fw-bold">{s.name}</div>
                          </div>
                        </td>
                        <td className="text-muted">{s.cpf}</td>
                        <td className="text-muted small">{s.email}</td>
                        <td className="text-end pe-4">
                          <Link to={`/admin/students/${s.id}/boletim`}
                            className="btn btn-sm btn-outline-success rounded-pill px-3">
                            <i className="fas fa-clipboard-check me-1" /> Ver Boletim
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════ AVISOS ════ */}
        {activeTab === 'avisos' && (
          <>
            <div className="card shadow-sm border-0 rounded-4 mb-4">
              <div className="card-header bg-warning text-dark fw-bold py-3">
                <i className="fas fa-bullhorn me-2" /> Publicar Novo Aviso
              </div>
              <div className="card-body p-4 bg-light">
                <form onSubmit={handlePublishNotice} className="row g-3">
                  <div className="col-md-8">
                    <label className="form-label fw-bold small">Título do Aviso</label>
                    <input className="form-control" placeholder="Ex: Manutenção do sistema"
                      value={noticeForm.title}
                      onChange={e => setNoticeForm(p => ({ ...p, title: e.target.value }))} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold small">Categoria</label>
                    <select className="form-select" value={noticeForm.category}
                      onChange={e => setNoticeForm(p => ({ ...p, category: e.target.value }))}>
                      {['Geral', 'Eventos', 'Acadêmico', 'Urgente'].map(c =>
                        <option key={c} value={c}>{c}</option>
                      )}
                    </select>
                  </div>
                  <div className="col-md-9">
                    <label className="form-label fw-bold small">Conteúdo</label>
                    <textarea className="form-control" rows={4} placeholder="Escreva o comunicado aqui..."
                      value={noticeForm.content}
                      onChange={e => setNoticeForm(p => ({ ...p, content: e.target.value }))} required />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-bold small">URL da Imagem (Opcional)</label>
                    <input className="form-control" placeholder="https://..."
                      value={noticeForm.image_url}
                      onChange={e => setNoticeForm(p => ({ ...p, image_url: e.target.value }))} />
                    <small className="text-muted mt-1 d-block">Aparecerá junto ao aviso.</small>
                  </div>
                  <div className="col-12 mt-2 text-end">
                    <button className="btn btn-warning rounded-pill px-5 shadow-sm fw-bold" disabled={saving}>
                      <i className="fas fa-paper-plane me-2" /> Publicar Aviso
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="card shadow-sm border-0 rounded-4">
              <div className="card-header bg-white text-dark fw-bold py-3 border-bottom">
                <i className="fas fa-list me-2 text-warning" /> Avisos Ativos ({notices.length})
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-4">Aviso</th>
                        <th>Autor</th>
                        <th>Data</th>
                        <th className="text-end pe-4">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notices.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-5 text-muted">Nenhum aviso publicado.</td></tr>
                      ) : notices.map(n => (
                        <tr key={n.id}>
                          <td className="ps-4">
                            <div className="d-flex align-items-center">
                              {n.image_url && (
                                <img src={n.image_url} className="rounded me-3"
                                  style={{ width: 40, height: 40, objectFit: 'cover' }} alt="" />
                              )}
                              <div>
                                <div className="fw-bold">{n.title}</div>
                                <small className="text-muted">{n.category}</small>
                              </div>
                            </div>
                          </td>
                          <td>{n.users?.name}</td>
                          <td className="text-muted small">
                            {new Date(n.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="text-end pe-4">
                            <button className="btn btn-sm btn-outline-danger rounded-pill"
                              onClick={() => handleDeleteNotice(n.id)}>
                              <i className="fas fa-trash" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
        {/* ════ CALENDÁRIO ════ */}
        {activeTab === 'calendario' && (
          <>
            <div className="card shadow-sm border-0 rounded-4 mb-4">
              <div className="card-header text-white fw-bold py-3" style={{ background: '#6f42c1' }}>
                <i className="fas fa-plus-circle me-2" /> Adicionar Evento
              </div>
              <div className="card-body p-4 bg-light">
                <form onSubmit={handleCreateEvent} className="row g-3">
                  <div className="col-md-5">
                    <label className="form-label fw-bold small">Título</label>
                    <input className="form-control" placeholder="Ex: Aula de Teologia Sistemática"
                      value={eventForm.title}
                      onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))} required />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-bold small">Data</label>
                    <input type="date" className="form-control"
                      value={eventForm.event_date}
                      onChange={e => setEventForm(p => ({ ...p, event_date: e.target.value }))} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold small">Tipo</label>
                    <select className="form-select" value={eventForm.event_type}
                      onChange={e => setEventForm(p => ({ ...p, event_type: e.target.value }))}>
                      {Object.entries(EVENT_TYPES).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-bold small">Descrição (opcional)</label>
                    <input className="form-control" placeholder="Detalhes adicionais sobre o evento..."
                      value={eventForm.description}
                      onChange={e => setEventForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="col-12 mt-2">
                    <button className="btn rounded-pill px-4 text-white fw-bold" style={{ background: '#6f42c1' }} disabled={saving}>
                      <i className="fas fa-save me-2" /> Salvar Evento
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="card shadow-sm border-0 rounded-4 mb-4">
              <div className="card-header text-white fw-bold py-3" style={{ background: '#0d6efd' }}>
                <i className="fas fa-layer-group me-2" /> Criação em Massa
                <small className="fw-normal ms-2 opacity-75">Crie eventos repetidos para dias da semana de um mês inteiro</small>
              </div>
              <div className="card-body p-4 bg-light">
                <form onSubmit={handleCreateBulkEvents} className="row g-3">
                  <div className="col-md-5">
                    <label className="form-label fw-bold small">Título do Evento</label>
                    <input className="form-control" placeholder="Ex: Aula Presencial"
                      value={bulkForm.title}
                      onChange={e => setBulkForm(p => ({ ...p, title: e.target.value }))} required />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-bold small">Mês / Ano</label>
                    <input type="month" className="form-control"
                      value={bulkForm.month_year}
                      onChange={e => setBulkForm(p => ({ ...p, month_year: e.target.value }))} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-bold small">Tipo</label>
                    <select className="form-select" value={bulkForm.event_type}
                      onChange={e => setBulkForm(p => ({ ...p, event_type: e.target.value }))}>
                      {Object.entries(EVENT_TYPES).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-bold small">Dias da Semana</label>
                    <div className="d-flex flex-wrap gap-2">
                      {WEEKDAY_NAMES.map((name, idx) => {
                        const checked = bulkForm.weekdays.includes(idx)
                        return (
                          <button
                            key={idx}
                            type="button"
                            className={`btn btn-sm rounded-pill px-3 ${checked ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => setBulkForm(p => ({
                              ...p,
                              weekdays: checked
                                ? p.weekdays.filter(d => d !== idx)
                                : [...p.weekdays, idx],
                            }))}
                          >
                            {name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-bold small">Descrição (opcional)</label>
                    <input className="form-control" placeholder="Detalhes adicionais..."
                      value={bulkForm.description}
                      onChange={e => setBulkForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="col-12 mt-2 d-flex align-items-center gap-3">
                    <button className="btn btn-primary rounded-pill px-4 fw-bold" disabled={saving}>
                      <i className="fas fa-magic me-2" /> Criar Eventos em Massa
                    </button>
                    {bulkPreviewCount() > 0 && (
                      <span className="text-muted small">
                        <i className="fas fa-info-circle me-1 text-primary" />
                        {bulkPreviewCount()} evento(s) serão criados
                      </span>
                    )}
                  </div>
                </form>
              </div>
            </div>

            <div className="card shadow-sm border-0 rounded-4">
              <div className="card-header bg-white text-dark fw-bold py-3 border-bottom">
                <i className="fas fa-calendar-alt me-2" style={{ color: '#6f42c1' }} /> Eventos Cadastrados ({calendarEvents.length})
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="ps-4">Evento</th>
                        <th>Tipo</th>
                        <th>Data</th>
                        <th className="text-end pe-4">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calendarEvents.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-5 text-muted">Nenhum evento cadastrado.</td></tr>
                      ) : calendarEvents.map(ev => (
                        <tr key={ev.id}>
                          <td className="ps-4">
                            <div className="fw-bold">{ev.title}</div>
                            {ev.description && <small className="text-muted">{ev.description}</small>}
                          </td>
                          <td>
                            <span className={`badge rounded-pill bg-${EVENT_TYPES[ev.event_type]?.badge || 'secondary'}`}>
                              {EVENT_TYPES[ev.event_type]?.label || ev.event_type}
                            </span>
                          </td>
                          <td className="text-muted small">
                            {new Date(ev.event_date + 'T12:00:00').toLocaleDateString('pt-BR', {
                              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </td>
                          <td className="text-end pe-4">
                            <button className="btn btn-sm btn-outline-danger rounded-pill"
                              onClick={() => handleDeleteEvent(ev.id)}>
                              <i className="fas fa-trash" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
