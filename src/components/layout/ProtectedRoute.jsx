// Equivalente ao middleware ensureAuthenticated e ensureTeacher
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../ui/LoadingSpinner'

export default function ProtectedRoute({ children, requireTeacher = false }) {
  const { session, profile, loading } = useAuth()

  if (loading) return <LoadingSpinner />

  if (!session) return <Navigate to="/login" replace />

  if (!profile?.is_active) {
    // Conta desativada — desloga e redireciona
    return <Navigate to="/login?inactive=1" replace />
  }

  if (requireTeacher && profile?.role !== 'teacher') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
