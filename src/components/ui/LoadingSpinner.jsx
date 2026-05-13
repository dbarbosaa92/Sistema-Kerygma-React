export default function LoadingSpinner() {
  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 200 }}>
      <div className="spinner-border" style={{ color: 'var(--navy)' }} role="status">
        <span className="visually-hidden">Carregando...</span>
      </div>
    </div>
  )
}
