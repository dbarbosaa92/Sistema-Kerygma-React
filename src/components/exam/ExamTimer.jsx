// Timer regressivo — substitui o scripts.js do legado
import { useEffect, useState } from 'react'

export default function ExamTimer({ startTime, durationMinutes, onExpire }) {
  const [remaining, setRemaining] = useState(null)

  useEffect(() => {
    const deadline = new Date(startTime).getTime() + durationMinutes * 60 * 1000

    function tick() {
      const diff = deadline - Date.now()
      if (diff <= 0) {
        setRemaining(0)
        onExpire?.()
        return
      }
      setRemaining(diff)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startTime, durationMinutes])

  if (remaining === null) return null

  const totalSec = Math.max(0, Math.floor(remaining / 1000))
  const mins = String(Math.floor(totalSec / 60)).padStart(2, '0')
  const secs = String(totalSec % 60).padStart(2, '0')
  const isUrgent = totalSec < 300 // menos de 5 minutos

  return (
    <div className={`badge fs-5 px-3 py-2 ${isUrgent ? 'bg-danger' : 'bg-primary'}`}>
      <i className="fa fa-clock me-2" />
      {mins}:{secs}
    </div>
  )
}
