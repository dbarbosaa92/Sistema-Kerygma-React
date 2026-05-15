import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const { session, loading: authLoading, signIn } = useAuth()
  const navigate = useNavigate()
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [error,      setError]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [resetSent,  setResetSent]  = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  useEffect(() => {
    if (!authLoading && session) navigate('/dashboard', { replace: true })
  }, [authLoading, session])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setResetSent(false)
    setLoading(true)
    try {
      if (rememberMe) {
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
          options: { persistSession: true }
        })
      } else {
        await signIn(email.trim(), password)
      }
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

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError('Digite seu e-mail acima para redefinir a senha.')
      return
    }
    setError('')
    await supabase.auth.resetPasswordForEmail(email.trim())
    setResetSent(true)
  }

  return (
    <div className="login-split login-container">

      {/* ── Painel Esquerdo ── */}
      <div className="login-left">
        <div className="login-left-body">
          <img
            src="/logoInsta.jpg"
            alt="Logo Seminário Kerygma"
            style={{
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid rgba(200,169,110,0.3)',
              marginBottom: '8px'
            }}
          />
          <p className="login-left-subtitle">Formando servos para o Reino</p>
        </div>
        <p className="login-left-verse">
          "Ide por todo o mundo e pregai o evangelho a toda criatura."
          <br />
          <span>— Marcos 16:15</span>
        </p>
      </div>

      {/* ── Painel Direito ── */}
      <div className="login-right">

        {/* Hero mobile — oculto no desktop */}
        <div className="login-hero">
          <img
            src="/logoInsta.jpg"
            alt="Logo Seminário Kerygma"
            style={{
              width: '110px',
              height: '110px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid rgba(200,169,110,0.4)',
              marginBottom: '12px'
            }}
          />
          <p className="login-hero-subtitle">Sala Virtual</p>
        </div>

        <div className="login-form-card">
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: '#888', fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            ← Voltar para a página anterior
          </button>
          <h2 className="login-right-title">Bem-vindo de volta</h2>

          {error && (
            <div className="alert alert-danger py-2 small">{error}</div>
          )}
          {resetSent && (
            <div className="alert alert-success py-2 small">
              E-mail de redefinição enviado! Verifique sua caixa de entrada.
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="mb-3">
              <label className="form-label fw-semibold small">E-mail</label>
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
              <label className="form-label fw-semibold small">Senha</label>
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
            <div className="d-flex align-items-center gap-2 mb-3 mt-1">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: '#1a2744',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              />
              <label
                htmlFor="rememberMe"
                style={{
                  fontSize: '0.85rem',
                  color: '#6c757d',
                  cursor: 'pointer',
                  marginBottom: 0,
                  userSelect: 'none'
                }}
              >
                Manter-me conectado
              </label>
            </div>
            <button
              type="submit"
              className="btn w-100"
              disabled={loading}
              style={{ background: '#1a2744', color: '#fff' }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="text-center mt-3">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="btn btn-link btn-sm text-muted"
              style={{ fontSize: '0.82rem', textDecoration: 'none' }}
            >
              Esqueci minha senha
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
