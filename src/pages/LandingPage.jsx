import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const heroBgImage = '' // coloque a URL da imagem aqui quando tiver


const pilares = [
  { icone: 'fa-bible',       titulo: 'Base bíblica sólida',     desc: 'Ensino fundamentado nas Escrituras com profundidade e rigor teológico.' },
  { icone: 'fa-users',       titulo: 'Comunidade ativa',         desc: 'Uma rede de alunos e líderes comprometidos com o crescimento mútuo.' },
  { icone: 'fa-certificate', titulo: 'Formação certificada',     desc: 'Certificados reconhecidos ao concluir cada módulo do programa.' },
]

const funcionalidades = [
  { icone: 'fa-play-circle',     titulo: 'Aulas gravadas',     desc: 'Assista às aulas no seu tempo, com qualidade e organização por módulos.' },
  { icone: 'fa-clipboard-check', titulo: 'Provas online',      desc: 'Avaliações integradas ao conteúdo com resultado imediato.' },
  { icone: 'fa-table',           titulo: 'Boletim digital',    desc: 'Acompanhe seu desempenho em tempo real com notas e situação por matéria.' },
  { icone: 'fa-award',           titulo: 'Certificado',        desc: 'Receba seu certificado ao concluir o curso com aprovação.' },
]


const funcionalidadesHero = [
  { icone: 'ti ti-player-play',     texto: 'Aulas gravadas' },
  { icone: 'ti ti-clipboard-check', texto: 'Provas online' },
  { icone: 'ti ti-chart-bar',       texto: 'Boletim digital' },
  { icone: 'ti ti-bell',            texto: 'Avisos e comunicados' },
  { icone: 'ti ti-certificate',     texto: 'Certificado de conclusão' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [depoimentos, setDepoimentos] = useState([])
  const [docentes,    setDocentes]    = useState([])
  const [aberto,      setAberto]      = useState(null)

  const docentesDuplicados = [...docentes, ...docentes]
  const duracaoCarrossel = `${Math.max(docentes.length, 1) * 6}s`

  useEffect(() => {
    async function fetchData() {
      const [depRes, docRes] = await Promise.all([
        supabase.from('depoimentos').select('*').eq('ativo', true).order('ordem', { ascending: true }),
        supabase.from('docentes').select('*').eq('ativo', true).order('ordem', { ascending: true }),
      ])
      if (!depRes.error && depRes.data) setDepoimentos(depRes.data)
      if (!docRes.error && docRes.data) setDocentes(docRes.data)
    }
    fetchData()
  }, [])

  const statsRef = useRef(null)
  const statsAnimated = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !statsAnimated.current) {
          statsAnimated.current = true
          const stats = [
            { id: 'stat-alunos',      target: 200, suffix: '+', duration: 1800 },
            { id: 'stat-disciplinas', target: 40,  suffix: '+', duration: 1400 },
            { id: 'stat-anos',        target: 11,  suffix: '',  duration: 1000 },
          ]
          stats.forEach(({ id, target, suffix, duration }) => {
            const el = document.getElementById(id)
            if (!el) return
            let start = 0
            const step = target / (duration / 16)
            const timer = setInterval(() => {
              start += step
              if (start >= target) { start = target; clearInterval(timer) }
              el.textContent = Math.round(start) + suffix
            }, 16)
          })
        }
      },
      { threshold: 0.3 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div style={{ fontFamily: "'Source Sans 3', sans-serif", color: '#2e3442' }}>

      {/* ── Navbar ── */}
      <nav className="landing-nav" style={{ background: '#1a2744', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logoInsta.jpg" alt="Seminário Kerygma" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(200,169,110,0.5)' }} />
          <span className="kerygma-font" style={{ color: '#c8a96e', fontSize: '1.2rem' }}>Seminário Kerygma</span>
        </div>
        <div className="landing-nav-links" style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          <a href="#sobre"    style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: 14 }}>Sobre</a>
          <a href="#docentes" style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: 14 }}>Docentes</a>
          <a href="#contato"  style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: 14 }}>Contato</a>
        </div>
        <button
          onClick={() => navigate('/login')}
          style={{ background: '#c8a96e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
        >
          Acessar Sala Virtual
        </button>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero" style={{
        background: '#f5f4f0',
        padding: '48px 64px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '40px',
        alignItems: 'center'
      }}>

        {/* Coluna esquerda — texto */}
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(26,39,68,0.08)',
            color: '#1a2744',
            fontSize: '12px',
            padding: '5px 12px',
            borderRadius: '20px',
            marginBottom: '16px'
          }}>
            <i className="ti ti-award" style={{ fontSize: '14px' }} />
            Formação Teológica
          </div>
          <h1 style={{
            fontSize: '2.2rem',
            fontWeight: 500,
            color: '#1a2744',
            lineHeight: 1.25,
            marginBottom: '12px'
          }}>
            Formando servos<br />para o Reino
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#666',
            lineHeight: 1.7,
            marginBottom: '24px',
            maxWidth: '420px'
          }}>
            Estude teologia com profundidade, flexibilidade e acompanhamento completo pela Sala Virtual Kerygma.
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: '#1a2744',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 500,
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            Acessar a Sala Virtual →
          </button>
        </div>

        {/* Coluna direita — card azul com funcionalidades */}
        <div className="landing-hero-right" style={{
          background: '#1a2744',
          borderRadius: '14px',
          padding: '24px'
        }}>
          <div style={{
            color: '#c8a96e',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            Plataforma completa
          </div>
          {funcionalidadesHero.map((item, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '8px'
            }}>
              <i className={item.icone} style={{ color: '#c8a96e', fontSize: '16px', flexShrink: 0 }} />
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
                {item.texto}
              </span>
            </div>
          ))}
        </div>

      </section>

      {/* ── Estatísticas ── */}
      <section ref={statsRef} style={{ background: '#fff', borderTop: '0.5px solid #e0ddd8', borderBottom: '0.5px solid #e0ddd8' }}>
        <div className="landing-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: '900px', margin: '0 auto' }}>
          {[
            { id: 'stat-alunos',      target: 200, suffix: '+', label: 'Alunos formados' },
            { id: 'stat-disciplinas', target: 40,  suffix: '+', label: 'Disciplinas' },
            { id: 'stat-anos',        target: 11,  suffix: '',  label: 'Anos de história' },
          ].map((stat, i, arr) => (
            <div key={stat.id} className="landing-stat" style={{ padding: '32px 20px', textAlign: 'center', borderRight: i < arr.length - 1 ? '0.5px solid #e0ddd8' : 'none' }}>
              <div id={stat.id} className="landing-stat-val" style={{ fontSize: '2.5rem', fontWeight: 500, color: '#1a2744', lineHeight: 1 }}>0</div>
              <div className="landing-stat-lbl" style={{ fontSize: '11px', color: '#888', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Depoimentos ── */}
      <section style={{ background: '#f5f4f0', padding: '40px 64px' }}>
        <p style={{ fontSize: '11px', fontWeight: 500, color: '#c8a96e', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', marginBottom: '6px' }}>
          Depoimentos
        </p>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 500, color: '#1a2744', textAlign: 'center', marginBottom: '4px' }}>
          O que nossos alunos dizem sobre o Kerygma
        </h2>
        <p style={{ fontSize: '12px', color: '#888', textAlign: 'center', marginBottom: '28px' }}>
          Vidas transformadas pela Palavra e pela formação teológica
        </p>
        <div className="depoimentos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px' }}>
          {depoimentos.map((d, i) => (
            <div key={i} className="depoimento-card" style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #e0ddd8', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '8px 8px 0' }}>
              <div className="depoimento-foto-wrapper" style={{ width: '75%', height: '220px', borderRadius: '6px', overflow: 'hidden', borderBottom: '2px solid #c8a96e', margin: '0 auto' }}>
                {d.foto_url ? (
                  <img src={d.foto_url} alt={d.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: '#1a2744', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#c8a96e', fontSize: '36px', fontWeight: 500 }}>
                      {d.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="depoimento-body" style={{ padding: '12px 8px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: 1 }}>
                <div className="depoimento-quote-icon" style={{ color: 'rgba(200,169,110,0.35)', fontSize: '26px', lineHeight: 1, fontFamily: 'Georgia, serif', marginBottom: '6px' }}>"</div>
                <p style={{ fontSize: '14px', color: '#555', lineHeight: 1.65, marginBottom: '12px', fontStyle: 'italic', flex: 1 }}>{d.frase}</p>
                <div className="depoimento-divider" style={{ width: '28px', height: '2px', background: '#c8a96e', borderRadius: '1px', margin: '0 auto 10px' }} />
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#1a2744' }}>{d.nome}</p>
                <p style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{d.turma}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Sobre + Pilares ── */}
      <section id="sobre" style={{ background: '#fff', padding: '64px 40px' }}>
        <div className="landing-about" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'start' }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#c8a96e', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sobre o Seminário</span>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: '#1a2744', margin: '12px 0 16px', fontFamily: "'League Spartan', sans-serif", fontWeight: 800 }}>
              Uma escola para equipar o corpo de Cristo
            </h2>
            <p className="landing-about-text" style={{ color: '#555', lineHeight: 1.75, fontSize: 15 }}>
              O Seminário Kerygma nasceu da visão de formar cristãos comprometidos com a Palavra de Deus e com a missão da Igreja. Através de um currículo cuidadosamente estruturado, unimos profundidade bíblica, prática ministerial e formação de caráter.
            </p>
            <p className="landing-about-text" style={{ color: '#555', lineHeight: 1.75, fontSize: 15, marginTop: 12 }}>
              Nossa sala virtual permite que alunos de qualquer lugar acessem o conteúdo com qualidade e organização, no seu próprio ritmo.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icone: 'ti ti-bible',       nome: 'Base bíblica sólida',   desc: 'Ensino fundamentado nas Escrituras com profundidade e rigor teológico.' },
              { icone: 'ti ti-users',       nome: 'Comunidade ativa',       desc: 'Uma rede de alunos e líderes comprometidos com o crescimento mútuo.' },
              { icone: 'ti ti-certificate', nome: 'Formação certificada',   desc: 'Ao concluir o curso, o aluno recebe certificado reconhecido pelo seminário.' },
            ].map((item, i) => (
              <div key={i} style={{ borderBottom: '0.5px solid #e0ddd8' }}>
                <div
                  onClick={() => setAberto(aberto === i ? null : i)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '30px', height: '30px', background: 'rgba(26,39,68,0.06)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={item.icone} style={{ color: '#c8a96e', fontSize: '14px' }} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#1a2744' }}>{item.nome}</span>
                  </div>
                  <i className={aberto === i ? 'ti ti-chevron-down' : 'ti ti-chevron-right'} style={{ color: '#aaa', fontSize: '14px', transition: 'transform 0.2s' }} />
                </div>
                {aberto === i && (
                  <div style={{ fontSize: '12px', color: '#666', lineHeight: 1.6, paddingBottom: '12px', paddingLeft: '40px' }}>
                    {item.desc}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Funcionalidades ── */}
      <section style={{ background: '#f5f4f0', padding: '64px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#c8a96e', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Plataforma</span>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: '#1a2744', margin: '10px 0 0', fontFamily: "'League Spartan', sans-serif", fontWeight: 800 }}>
              Tudo que você precisa em um só lugar
            </h2>
          </div>
          <div className="landing-features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
            {funcionalidades.map(f => (
              <div key={f.titulo} style={{ background: '#fff', borderRadius: 12, padding: '24px', boxShadow: '0 2px 8px rgba(26,43,92,0.07)', border: '0.5px solid rgba(0,0,0,0.06)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(200,169,110,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <i className={`fas ${f.icone}`} style={{ color: '#c8a96e', fontSize: 18 }} />
                </div>
                <div style={{ fontWeight: 700, color: '#1a2744', fontSize: 16, marginBottom: 6, fontFamily: "'League Spartan', sans-serif" }}>{f.titulo}</div>
                <div style={{ color: '#666', fontSize: 14, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Corpo Docente ── */}
      <section id="docentes" style={{ background: '#1a2744', padding: '64px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 36, padding: '0 40px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#c8a96e', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Quem ensina</span>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: '#fff', margin: '10px 0 0', fontFamily: "'League Spartan', sans-serif", fontWeight: 800 }}>
            Corpo Docente
          </h2>
        </div>
        <div className="docentes-track-wrapper">
          <div className="docentes-track" style={{ animationDuration: duracaoCarrossel }}>
            {docentesDuplicados.map((d, i) => (
              <div key={i} className="docente-card">
                {d.foto_url ? (
                  <img src={d.foto_url} alt={d.nome} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #c8a96e', margin: '0 auto 12px', display: 'block' }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(200,169,110,0.2)', border: '2px solid #c8a96e', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#c8a96e', fontSize: 18, fontWeight: 700 }}>
                      {d.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{d.nome}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Versículo ── */}
      <section style={{ background: '#1a2744', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '48px 40px', textAlign: 'center' }}>
        <p style={{ color: '#c8a96e', fontStyle: 'italic', fontSize: 18, maxWidth: 640, margin: '0 auto 8px', lineHeight: 1.7 }}>
          "Ide por todo o mundo e pregai o evangelho a toda criatura."
        </p>
        <span style={{ color: 'rgba(200,169,110,0.5)', fontSize: 13 }}>— Marcos 16:15</span>
      </section>

      {/* ── CTA Final ── */}
      <section id="contato" className="landing-cta" style={{ background: '#f5f4f0', padding: '64px 40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: '#1a2744', marginBottom: 12, fontFamily: "'League Spartan', sans-serif", fontWeight: 800 }}>
          Já é aluno do Kerygma?
        </h2>
        <p style={{ color: '#666', fontSize: 15, marginBottom: 28, maxWidth: 420, margin: '0 auto 28px' }}>
          Acesse a sala virtual e continue sua jornada de formação teológica.
        </p>
        <button
          onClick={() => navigate('/login')}
          style={{ background: '#c8a96e', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 36px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
        >
          Acessar a Sala Virtual
        </button>
      </section>

      {/* ── Botão fixo WhatsApp ── */}
      <a
        href="https://wa.me/5527997927725"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: '#25d366',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(37,211,102,0.4)',
          zIndex: 999,
          textDecoration: 'none',
        }}
        aria-label="Falar no WhatsApp"
      >
        <i className="fab fa-whatsapp" style={{ color: '#fff', fontSize: 26 }} />
      </a>

      {/* ── Rodapé ── */}
      <footer className="landing-footer" style={{ background: '#111c36', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
          &copy; {new Date().getFullYear()} <span className="kerygma-font">Seminário Kerygma</span>
        </span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
          <i className="fab fa-whatsapp me-1" style={{ color: '#25d366' }} />
          (27) 99792-7725
        </span>
      </footer>

    </div>
  )
}
