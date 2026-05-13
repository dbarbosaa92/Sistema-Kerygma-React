import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function UserEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [loading,      setLoading]      = useState(!isNew)
  const [saving,       setSaving]       = useState(false)
  const [msg,          setMsg]          = useState({ text: '', type: 'success' })
  const [showPassword, setShowPassword] = useState(false)

  const [form, setForm] = useState({
    name: '', cpf: '', email: '', role: 'student',
    is_active: true, content_access_date: '',
  })
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    if (!isNew) loadUser()
  }, [id])

  function setField(field, value) {
    setForm(p => ({ ...p, [field]: value }))
  }

  function showMsg(text, type = 'success') {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: 'success' }), 4000)
  }

  async function loadUser() {
    const { data } = await supabase.from('users').select('*').eq('id', id).single()
    if (data) {
      setForm({
        name:                data.name ?? '',
        cpf:                 data.cpf ?? '',
        email:               data.email ?? '',
        role:                data.role ?? 'student',
        is_active:           data.is_active ?? true,
        content_access_date: data.content_access_date ?? '',
      })
    }
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    if (isNew) {
      // Criação via RPC (não usa signUp para não mudar sessão do admin)
      const { error } = await supabase.rpc('admin_create_user', {
        p_email:    form.email,
        p_password: newPassword,
        p_name:     form.name,
        p_cpf:      form.cpf.replace(/\D/g, ''),
        p_role:     form.role,
      })
      if (error) { showMsg('Erro: ' + error.message, 'danger'); setSaving(false); return }

      if (form.content_access_date || !form.is_active) {
        const { data: u } = await supabase.from('users').select('id').eq('email', form.email).single()
        if (u) await supabase.from('users').update({
          is_active: form.is_active,
          content_access_date: form.content_access_date || null,
        }).eq('id', u.id)
      }
      navigate('/admin')

    } else {
      // Atualiza perfil
      const { error } = await supabase.from('users').update({
        name:                form.name,
        email:               form.email,
        role:                form.role,
        is_active:           form.is_active,
        content_access_date: form.content_access_date || null,
      }).eq('id', id)

      if (error) { showMsg('Erro ao salvar: ' + error.message, 'danger'); setSaving(false); return }

      // Troca de senha (se o admin preencheu)
      if (newPassword.trim().length >= 6) {
        const { error: pwErr } = await supabase.rpc('admin_update_password', {
          p_user_id:  id,
          p_password: newPassword,
        })
        if (pwErr) { showMsg('Perfil salvo, mas erro ao alterar senha: ' + pwErr.message, 'danger'); setSaving(false); return }
        setNewPassword('')
        showMsg('Perfil e senha atualizados com sucesso!')
      } else {
        showMsg('Perfil atualizado com sucesso!')
      }
    }

    setSaving(false)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="container py-4" style={{ maxWidth: 680 }}>
      <div className="d-flex align-items-center gap-3 mb-4">
        <Link to="/admin" className="btn btn-outline-primary btn-sm">
          <i className="fa fa-arrow-left" />
        </Link>
        <h4 className="mb-0">{isNew ? 'Novo Usuário' : 'Editar Usuário'}</h4>
      </div>

      {msg.text && (
        <div className={`alert alert-${msg.type} py-2`}>{msg.text}</div>
      )}

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit} className="row g-3" autoComplete="off">

            {/* Nome */}
            <div className="col-md-8">
              <label className="form-label">Nome completo</label>
              <input className="form-control" placeholder="Nome completo"
                value={form.name} onChange={e => setField('name', e.target.value)}
                autoComplete="off" required />
            </div>

            {/* CPF */}
            <div className="col-md-4">
              <label className="form-label">CPF</label>
              <input className="form-control" placeholder="Somente números" maxLength={11}
                value={form.cpf}
                onChange={e => setField('cpf', e.target.value.replace(/\D/g, ''))}
                autoComplete="off" required disabled={!isNew} />
              {!isNew && <small className="text-muted">CPF não pode ser alterado.</small>}
            </div>

            {/* E-mail */}
            <div className="col-md-8">
              <label className="form-label">E-mail</label>
              <input type="email" className="form-control" placeholder="email@exemplo.com"
                value={form.email} onChange={e => setField('email', e.target.value)}
                autoComplete="off" required />
            </div>

            {/* Perfil */}
            <div className="col-md-4">
              <label className="form-label">Perfil</label>
              <select className="form-select" value={form.role}
                onChange={e => setField('role', e.target.value)}>
                <option value="student">Aluno</option>
                <option value="teacher">Professor</option>
              </select>
            </div>

            {/* ── Senha ── */}
            <div className="col-12">
              <hr className="my-1" />
              <label className="form-label">
                {isNew ? 'Senha inicial' : 'Nova senha'}
                {!isNew && <span className="text-muted fw-normal ms-2 small">(deixe em branco para manter a atual)</span>}
              </label>
              <div className="input-group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder={isNew ? 'Mínimo 6 caracteres' : 'Digite a nova senha'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={isNew ? 6 : undefined}
                  required={isNew}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowPassword(v => !v)}
                  title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
              {showPassword && newPassword && (
                <div className="mt-1 px-2 py-1 rounded bg-light border small text-break">
                  <i className="fas fa-key me-1 text-muted" />
                  <strong>Senha definida:</strong> {newPassword}
                </div>
              )}
            </div>

            {/* Data de acesso */}
            <div className="col-md-6">
              <label className="form-label">Data de acesso ao conteúdo</label>
              <input type="date" className="form-control"
                value={form.content_access_date}
                onChange={e => setField('content_access_date', e.target.value)} />
              <small className="text-muted">Deixe em branco para acesso imediato.</small>
            </div>

            {/* Conta ativa */}
            <div className="col-md-6 d-flex align-items-center">
              <div className="form-check form-switch">
                <input type="checkbox" className="form-check-input" id="isActive"
                  checked={form.is_active}
                  onChange={e => setField('is_active', e.target.checked)} />
                <label className="form-check-label" htmlFor="isActive">Conta ativa</label>
              </div>
            </div>

            <div className="col-12 text-end">
              <button className="btn btn-primary px-4" disabled={saving}>
                {saving ? 'Salvando...' : isNew ? 'Criar Usuário' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
