import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function GerenciarMatriculas() {
  const [courses,            setCourses]            = useState([])
  const [alunos,             setAlunos]             = useState([])
  const [modalAberto,        setModalAberto]        = useState(null)
  const [courseSelecionado,  setCourseSelecionado]  = useState(null)
  const [alunosSelecionados, setAlunosSelecionados] = useState([])
  const [alunosComAcesso,    setAlunosComAcesso]    = useState([])
  const [loading,            setLoading]            = useState(false)
  const [pageLoading,        setPageLoading]        = useState(true)
  const [erro,               setErro]               = useState('')
  const [temColunaStatus,    setTemColunaStatus]    = useState(true)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setPageLoading(true)
    setErro('')

    // 1. Tenta buscar courses com status
    let { data: coursesData, error: coursesErr } = await supabase
      .from('courses')
      .select('id, title, status')
      .order('title')

    // Se falhou (provavelmente coluna status não existe), tenta sem ela
    if (coursesErr) {
      console.warn('Coluna status não encontrada, tentando sem ela:', coursesErr.message)
      setTemColunaStatus(false)
      const { data: fallback, error: fallbackErr } = await supabase
        .from('courses')
        .select('id, title')
        .order('title')

      if (fallbackErr) {
        console.error('Erro ao carregar cursos:', fallbackErr)
        setErro('Erro ao carregar cursos: ' + fallbackErr.message)
        setPageLoading(false)
        return
      }
      coursesData = (fallback ?? []).map(c => ({ ...c, status: null }))
    }

    // 2. Busca contagem de matrículas ativas por curso
    const { data: mats, error: matsErr } = await supabase
      .from('matriculas')
      .select('course_id')
      .eq('status', 'ativa')

    if (matsErr) {
      console.warn('Erro ao carregar matrículas:', matsErr.message)
    }

    // Conta matrículas por course_id
    const contagemMap = {}
    ;(mats ?? []).forEach(m => {
      contagemMap[m.course_id] = (contagemMap[m.course_id] ?? 0) + 1
    })

    // Mescla dados
    const enriched = (coursesData ?? []).map(c => ({
      ...c,
      totalMatriculas: contagemMap[c.id] ?? 0,
    }))

    setCourses(enriched)

    // 3. Carrega alunos
    const { data: alunosData, error: alunosErr } = await supabase
      .from('users')
      .select('id, auth_id, name, email')
      .eq('role', 'student')
      .order('name')

    if (alunosErr) {
      console.warn('Erro ao carregar alunos:', alunosErr.message)
    }

    setAlunos(alunosData ?? [])
    setPageLoading(false)
  }

  async function carregarAlunosComAcesso(courseId) {
    setAlunosComAcesso([])
    const { data: mats, error } = await supabase
      .from('matriculas')
      .select('aluno_id, liberado_em')
      .eq('course_id', courseId)
      .eq('status', 'ativa')

    if (error) { console.error(error); return }
    if (!mats || mats.length === 0) return

    const authIds = mats.map(m => m.aluno_id)
    const { data: usersData } = await supabase
      .from('users')
      .select('auth_id, name, email')
      .in('auth_id', authIds)

    const userMap = {}
    ;(usersData ?? []).forEach(u => { userMap[u.auth_id] = u })

    setAlunosComAcesso(mats.map(m => ({
      ...m,
      user: userMap[m.aluno_id] ?? null,
    })))
  }

  async function liberarParaTodos(courseId) {
    setLoading(true)
    const { error } = await supabase.rpc('liberar_curso_todos', { p_course_id: courseId })
    if (error) console.error('Erro ao liberar para todos:', error)
    await carregarDados()
    setLoading(false)
  }

  async function liberarParaSelecionados(courseId) {
    if (alunosSelecionados.length === 0) return
    setLoading(true)
    const { error } = await supabase.rpc('liberar_curso_selecionados', {
      p_course_id: courseId,
      p_aluno_ids: alunosSelecionados,
    })
    if (error) console.error('Erro ao liberar selecionados:', error)
    await carregarDados()
    setModalAberto(null)
    setAlunosSelecionados([])
    setLoading(false)
  }

  async function removerAcesso(courseId, alunoId) {
    const { error } = await supabase.rpc('remover_acesso_aluno', {
      p_course_id: courseId,
      p_aluno_id:  alunoId,
    })
    if (error) console.error('Erro ao remover acesso:', error)
    await carregarAlunosComAcesso(courseId)
    await carregarDados()
  }

  async function revogarCourse(courseId) {
    if (!confirm('Tem certeza? Isso removerá o acesso de todos os alunos e voltará o curso para rascunho.')) return
    setLoading(true)
    const { error } = await supabase.rpc('revogar_curso', { p_course_id: courseId })
    if (error) console.error('Erro ao revogar curso:', error)
    await carregarDados()
    setModalAberto(null)
    setLoading(false)
  }

  function fecharModal() {
    setModalAberto(null)
    setAlunosSelecionados([])
    setAlunosComAcesso([])
    setCourseSelecionado(null)
  }

  function statusLabel(course) {
    if (!temColunaStatus || course.status === null) {
      return course.totalMatriculas > 0
        ? { label: `${course.totalMatriculas} aluno(s)`, cls: 'status-in-progress' }
        : { label: 'Sem matrículas', cls: 'status-not-started' }
    }
    if (course.status === 'publica')     return { label: 'Liberado para todos',  cls: 'status-approved'    }
    if (course.status === 'selecionada') return { label: 'Alunos selecionados',  cls: 'status-in-progress' }
    return { label: 'Rascunho', cls: 'status-not-started' }
  }

  if (pageLoading) return <LoadingSpinner />

  return (
    <div className="boletim-sheet-page">

      {/* Cabeçalho */}
      <section className="boletim-sheet-hero">
        <div>
          <span className="sheet-eyebrow">Painel Admin</span>
          <h1 className="sheet-title">Gerenciar Matrículas</h1>
          <p className="sheet-subtitle">
            Libere ou restrinja o acesso dos alunos a cada curso.
          </p>
        </div>
        <Link to="/admin" className="sheet-back-link">
          <i className="fas fa-arrow-left" /> Voltar ao painel
        </Link>
      </section>

      {/* Aviso se coluna status não existe */}
      {!temColunaStatus && (
        <div style={{ display: 'flex', gap: 10, background: 'rgba(200,169,110,0.12)', border: '1.5px solid #c8a96e', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
          <i className="fas fa-exclamation-triangle" style={{ color: '#c8a96e', fontSize: 18, marginTop: 1, flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 14, color: '#1a2744', lineHeight: 1.6 }}>
            A coluna <strong>status</strong> ainda não foi adicionada à tabela <code>courses</code>. Execute o SQL:{' '}
            <code>ALTER TABLE courses ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publica', 'selecionada'));</code>
          </p>
        </div>
      )}

      {/* Erro geral */}
      {erro && (
        <div style={{ display: 'flex', gap: 10, background: 'rgba(180,35,24,0.08)', border: '1.5px solid #B42318', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
          <i className="fas fa-times-circle" style={{ color: '#B42318', fontSize: 18, marginTop: 1, flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 14, color: '#B42318' }}>{erro}</p>
        </div>
      )}

      {/* Tabela de cursos */}
      <section className="sheet-table-card">
        <div className="sheet-table-header">
          <div>
            <h2>Cursos ({courses.length})</h2>
            <p>Gerencie quais alunos têm acesso a cada curso.</p>
          </div>
        </div>
        <div className="table-responsive">
          <table className="sheet-table">
            <thead>
              <tr>
                <th>Curso</th>
                <th>Situação</th>
                <th style={{ textAlign: 'center' }}>Alunos</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {courses.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                    Nenhum curso encontrado. Verifique as permissões RLS no Supabase.
                  </td>
                </tr>
              ) : courses.map(c => {
                const st = statusLabel(c)
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="subject-main">{c.title}</div>
                    </td>
                    <td>
                      <span className={`sheet-status ${st.cls}`}>{st.label}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        style={{ background: 'transparent', color: '#1a2744', border: '1px solid #e0ddd8', borderRadius: 8, padding: '5px 12px', fontSize: 13, cursor: 'pointer' }}
                        onClick={() => {
                          setCourseSelecionado(c)
                          carregarAlunosComAcesso(c.id)
                          setModalAberto('gerenciar')
                        }}
                      >
                        <i className="fas fa-users me-1" />
                        {c.totalMatriculas > 0 ? c.totalMatriculas : '—'}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => liberarParaTodos(c.id)}
                          disabled={loading}
                        >
                          Liberar para todos
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ background: '#c8a96e', color: '#1a2744', border: 'none' }}
                          onClick={() => {
                            setCourseSelecionado(c)
                            setModalAberto('selecionar')
                          }}
                        >
                          Selecionar alunos
                        </button>
                        {(!temColunaStatus || c.status !== 'rascunho') && c.totalMatriculas > 0 && (
                          <button
                            className="btn btn-sm"
                            style={{ background: 'transparent', color: '#B42318', border: '1px solid #B42318' }}
                            onClick={() => revogarCourse(c.id)}
                            disabled={loading}
                          >
                            Revogar acesso
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal: selecionar alunos */}
      {modalAberto === 'selecionar' && courseSelecionado && (
        <div className="notif-overlay" onClick={fecharModal}>
          <div className="notif-card" onClick={e => e.stopPropagation()}>
            <div className="notif-header">
              <div className="notif-header-icon"><i className="fas fa-users" /></div>
              <div>
                <div className="notif-title">Selecionar alunos</div>
                <div className="notif-subtitle">{courseSelecionado.title}</div>
              </div>
            </div>
            <div className="notif-body">
              {alunos.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
                  Nenhum aluno cadastrado.
                </p>
              ) : alunos.map(aluno => (
                <div
                  key={aluno.id}
                  className="notif-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setAlunosSelecionados(prev =>
                    prev.includes(aluno.auth_id)
                      ? prev.filter(id => id !== aluno.auth_id)
                      : [...prev, aluno.auth_id]
                  )}
                >
                  <div className="mini-avatar">{aluno.name?.slice(0, 2).toUpperCase()}</div>
                  <div className="notif-item-content">
                    <div className="notif-item-title">{aluno.name}</div>
                    <div className="notif-item-body">{aluno.email}</div>
                  </div>
                  {alunosSelecionados.includes(aluno.auth_id) && (
                    <i className="fas fa-check-circle" style={{ color: '#2E7D52', fontSize: 18 }} />
                  )}
                </div>
              ))}
            </div>
            <div className="notif-footer" style={{ gap: 8 }}>
              <button
                className="btn"
                style={{ background: 'transparent', color: '#888', border: '1px solid #e0ddd8' }}
                onClick={fecharModal}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={() => liberarParaSelecionados(courseSelecionado.id)}
                disabled={loading || alunosSelecionados.length === 0}
              >
                Liberar para {alunosSelecionados.length} aluno{alunosSelecionados.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: gerenciar alunos com acesso */}
      {modalAberto === 'gerenciar' && courseSelecionado && (
        <div className="notif-overlay" onClick={fecharModal}>
          <div className="notif-card" onClick={e => e.stopPropagation()}>
            <div className="notif-header">
              <div className="notif-header-icon"><i className="fas fa-user-check" /></div>
              <div>
                <div className="notif-title">Alunos com acesso</div>
                <div className="notif-subtitle">{courseSelecionado.title}</div>
              </div>
            </div>
            <div className="notif-body">
              {alunosComAcesso.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>
                  Nenhum aluno com acesso ainda.
                </p>
              ) : alunosComAcesso.map(m => (
                <div key={m.aluno_id} className="notif-item">
                  <div className="mini-avatar">{m.user?.name?.slice(0, 2).toUpperCase() ?? '?'}</div>
                  <div className="notif-item-content">
                    <div className="notif-item-title">{m.user?.name ?? '—'}</div>
                    <div className="notif-item-body">
                      Liberado em {new Date(m.liberado_em).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <button
                    onClick={() => removerAcesso(courseSelecionado.id, m.aluno_id)}
                    style={{ background: 'transparent', border: '1px solid #B42318', color: '#B42318', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
            <div className="notif-footer" style={{ gap: 8 }}>
              <button
                className="btn"
                style={{ background: 'transparent', color: '#888', border: '1px solid #e0ddd8' }}
                onClick={fecharModal}
              >
                Fechar
              </button>
              {alunosComAcesso.length > 0 && (
                <button
                  className="btn"
                  style={{ background: '#B42318', color: '#fff', border: 'none' }}
                  onClick={() => revogarCourse(courseSelecionado.id)}
                  disabled={loading}
                >
                  Revogar todos
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
