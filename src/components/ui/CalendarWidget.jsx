import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]
const DAY_NAMES = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

const EVENT_TYPES = {
  aula_presencial: { label: 'Aula Presencial', color: '#fd7e14', badge: 'warning'  },
  aula_online:     { label: 'Aula Online',     color: '#0d6efd', badge: 'primary'  },
  prova:           { label: 'Prova',           color: '#dc3545', badge: 'danger'   },
  evento:          { label: 'Evento',          color: '#198754', badge: 'success'  },
}

export default function CalendarWidget() {
  const today = new Date()
  const [viewYear,    setViewYear]    = useState(today.getFullYear())
  const [viewMonth,   setViewMonth]   = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState(today.getDate())
  const [events,      setEvents]      = useState([])

  useEffect(() => { loadEvents(viewYear, viewMonth) }, [viewYear, viewMonth])

  async function loadEvents(year, month) {
    const pad  = n => String(n).padStart(2, '0')
    const start = `${year}-${pad(month + 1)}-01`
    const last  = new Date(year, month + 1, 0).getDate()
    const end   = `${year}-${pad(month + 1)}-${pad(last)}`
    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('event_date', start)
      .lte('event_date', end)
      .order('event_date')
    setEvents(data || [])
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
    setSelectedDay(null)
  }

  const pad          = n => String(n).padStart(2, '0')
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells        = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  function eventsFor(day) {
    const key = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`
    return events.filter(e => e.event_date === key)
  }

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth()

  const selectedEvents = selectedDay ? eventsFor(selectedDay) : []
  const selectedLabel  = selectedDay
    ? new Date(viewYear, viewMonth, selectedDay).toLocaleDateString('pt-BR', {
        weekday: 'long', day: 'numeric', month: 'long',
      })
    : ''

  return (
    <div className="card shadow border-0 rounded-4 overflow-hidden mt-4">
      <div className="card-header bg-primary text-white py-3 d-flex justify-content-between align-items-center">
        <button className="btn btn-sm btn-outline-light border-0" onClick={prevMonth}>
          <i className="fas fa-chevron-left" />
        </button>
        <h5 className="mb-0 text-white">
          <i className="fas fa-calendar-alt me-2" />
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h5>
        <button className="btn btn-sm btn-outline-light border-0" onClick={nextMonth}>
          <i className="fas fa-chevron-right" />
        </button>
      </div>

      <div className="card-body p-3">
        {/* Cabeçalho dos dias da semana */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center">
              <small className="text-muted fw-bold" style={{ fontSize: '0.68rem' }}>{d}</small>
            </div>
          ))}
        </div>

        {/* Grid do calendário */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const dayEvs     = eventsFor(day)
            const isToday    = isCurrentMonth && day === today.getDate()
            const isSelected = day === selectedDay
            return (
              <div
                key={i}
                onClick={() => setSelectedDay(day)}
                style={{
                  cursor:         'pointer',
                  borderRadius:   '8px',
                  textAlign:      'center',
                  background:     isSelected ? '#0d6efd' : isToday ? '#e8f0fe' : 'transparent',
                  color:          isSelected ? '#fff'    : isToday ? '#0d6efd' : '#212529',
                  fontWeight:     isToday ? 700 : 400,
                  fontSize:       '0.85rem',
                  minHeight:      '44px',
                  display:        'flex',
                  flexDirection:  'column',
                  alignItems:     'center',
                  justifyContent: 'flex-start',
                  paddingTop:     '6px',
                }}
              >
                <span>{day}</span>
                <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '3px' }}>
                  {dayEvs.slice(0, 3).map(ev => (
                    <span
                      key={ev.id}
                      style={{
                        width:        '6px',
                        height:       '6px',
                        borderRadius: '50%',
                        background:   isSelected ? '#fff' : (EVENT_TYPES[ev.event_type]?.color || '#6c757d'),
                        display:      'inline-block',
                      }}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Eventos do dia selecionado */}
        <div className="mt-3 pt-3 border-top">
          <p className="mb-2 fw-semibold text-secondary" style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>
            {selectedLabel || 'Selecione um dia'}
          </p>
          {!selectedDay ? null : selectedEvents.length === 0 ? (
            <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>Nenhum evento neste dia.</p>
          ) : (
            selectedEvents.map(ev => (
              <div key={ev.id} className="d-flex align-items-start gap-2 mb-2">
                <span
                  className={`badge bg-${EVENT_TYPES[ev.event_type]?.badge || 'secondary'} mt-1 flex-shrink-0`}
                  style={{ fontSize: '0.65rem' }}
                >
                  {EVENT_TYPES[ev.event_type]?.label || ev.event_type}
                </span>
                <div>
                  <div className="fw-semibold" style={{ fontSize: '0.85rem' }}>{ev.title}</div>
                  {ev.description && (
                    <div className="text-muted" style={{ fontSize: '0.78rem' }}>{ev.description}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Legenda */}
        <div className="mt-2 pt-2 border-top d-flex flex-wrap gap-3">
          {Object.values(EVENT_TYPES).map(val => (
            <span key={val.label} className="d-flex align-items-center gap-1" style={{ fontSize: '0.72rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: val.color, display: 'inline-block', flexShrink: 0 }} />
              <span className="text-muted">{val.label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
