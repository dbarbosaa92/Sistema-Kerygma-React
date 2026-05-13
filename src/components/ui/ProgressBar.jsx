// Substitui {{> progressBar progress=progress}} nos templates HBS
export default function ProgressBar({ value = 0 }) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className="progress mb-1" style={{ height: 8 }}>
      <div
        className="progress-bar"
        role="progressbar"
        style={{ width: `${pct}%`, backgroundColor: 'var(--gold)' }}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  )
}
