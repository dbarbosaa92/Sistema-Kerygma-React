import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { session, loading: authLoading, signIn } = useAuth()
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  // Redireciona se já estiver logado (ex: voltar para /login com sessão ativa)
  useEffect(() => {
    if (!authLoading && session) navigate('/dashboard', { replace: true })
  }, [authLoading, session])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err?.message ?? ''
      if (msg.includes('Email not confirmed')) {
        setError('E-mail não confirmado. Entre em contato com a diretoria do Kerygma.')
      } else {
        setError('Usuário não cadastrado ou senha incorreta. Favor entrar em contato com a diretoria do Kerygma.')
      }
      setLoading(false)
    }
  }

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center"
      style={{ background: 'var(--navy)' }}
    >
      <div className="card shadow" style={{ width: '100%', maxWidth: 420 }}>
        <div className="card-body p-5">
          <h3 className="text-center mb-4" style={{ color: 'var(--navy)', fontWeight: 700 }}>
            Sala Virtual Kerygma
          </h3>

          {error && (
            <div className="alert alert-danger py-2 small">{error}</div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="mb-3">
              <label className="form-label">E-mail</label>
              <input
                type="email"
                className="form-control"
                placeholder="Digite seu e-mail"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="username"
                required
                autoFocus
              />
            </div>
            <div className="mb-4">
              <label className="form-label">Senha</label>
              <input
                type="password"
                className="form-control"
                placeholder="Digite sua senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
