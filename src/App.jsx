import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Navbar from './components/layout/Navbar'

import Login          from './pages/Login'
import LandingPage    from './pages/LandingPage'
import Dashboard      from './pages/Dashboard'
import Course         from './pages/Course'
import Exam           from './pages/Exam'
import Boletim        from './pages/Boletim'
import Notices        from './pages/Notices'
import AdminDashboard      from './pages/admin/AdminDashboard'
import CourseEdit          from './pages/admin/CourseEdit'
import ExamEdit            from './pages/admin/ExamEdit'
import UserEdit            from './pages/admin/UserEdit'
import StudentBoletim      from './pages/admin/StudentBoletim'
import GerenciarMatriculas from './pages/admin/GerenciarMatriculas'

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main className="container my-5">{children}</main>
      <footer className="text-center py-4 text-muted mt-5">
        <small>
          <i className="fab fa-whatsapp me-1" style={{ color: '#25d366' }} />
          Encontrou algum problema? Entre em contato conosco:{' '}
          <a
            href="https://wa.me/5521992457885"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted fw-bold"
          >
            (21) 99245-7885
          </a>
        </small>
        <br />
        <small>&copy; 2026 <span className="kerygma-font">Seminário Kerygma</span> - Built by Davi Barbosa</small>
      </footer>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rota pública */}
          <Route path="/login" element={<Login />} />

          {/* Rotas de aluno */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
          } />
          <Route path="/courses/:id" element={
            <ProtectedRoute><Layout><Course /></Layout></ProtectedRoute>
          } />
          <Route path="/exams/:id" element={
            <ProtectedRoute><Layout><Exam /></Layout></ProtectedRoute>
          } />
          <Route path="/boletim" element={
            <ProtectedRoute><Layout><Boletim /></Layout></ProtectedRoute>
          } />
          <Route path="/notices" element={
            <ProtectedRoute><Layout><Notices /></Layout></ProtectedRoute>
          } />

          {/* Rotas de professor */}
          <Route path="/admin" element={
            <ProtectedRoute requireTeacher><Layout><AdminDashboard /></Layout></ProtectedRoute>
          } />
          <Route path="/admin/courses/:id" element={
            <ProtectedRoute requireTeacher><Layout><CourseEdit /></Layout></ProtectedRoute>
          } />
          <Route path="/admin/exams/:id" element={
            <ProtectedRoute requireTeacher><Layout><ExamEdit /></Layout></ProtectedRoute>
          } />
          <Route path="/admin/users/:id" element={
            <ProtectedRoute requireTeacher><Layout><UserEdit /></Layout></ProtectedRoute>
          } />
          <Route path="/admin/students/:userId/boletim" element={
            <ProtectedRoute requireTeacher><Layout><StudentBoletim /></Layout></ProtectedRoute>
          } />
          <Route path="/admin/matriculas" element={
            <ProtectedRoute requireTeacher><Layout><GerenciarMatriculas /></Layout></ProtectedRoute>
          } />

          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
