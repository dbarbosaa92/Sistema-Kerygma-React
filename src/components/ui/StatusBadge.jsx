// Substitui o helper Handlebars que gerava classes CSS de status
export default function StatusBadge({ status, score, passingScore }) {
  if (status === 'in_progress') {
    return <span className="badge bg-warning text-dark">Em andamento</span>
  }

  if (status === 'completed' && score !== null) {
    const passed = parseFloat(score) >= parseFloat(passingScore ?? 60)
    return passed
      ? <span className="badge bg-success">Aprovado</span>
      : <span className="badge bg-danger">Reprovado</span>
  }

  return <span className="badge bg-secondary">—</span>
}
