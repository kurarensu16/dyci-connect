import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Toaster } from 'react-hot-toast'
import PrivateRoute from './components/auth/PrivateRoute'

// Public Pages
import Home from './pages/Home'
import Login from './pages/auth/Login'

// Student Pages
import StudentDashboard from './pages/student/Dashboard'
import Calendar from './pages/student/Calendar'
import Handbook from './pages/student/Handbook'
import Files from './pages/student/Files'
import Tools from './pages/student/Tools'

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard'
import Users from './pages/admin/Users'
import Conforme from './pages/admin/Conforme'
import Support from './pages/admin/Support'
import AdminCalendar from './pages/admin/Calendar'
import HandbookPreview from './pages/admin/HandbookPreview'
import Cms from './pages/admin/Cms'
import Reports from './pages/admin/Reports'

// Faculty Pages
// (Add faculty pages imports here when available)

// Shared Components
import StudentLayout from './components/layout/StudentLayout'
import AdminLayout from './components/layout/AdminLayout'

const AppContent: React.FC = () => {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        {/* Student Routes */}
        <Route
          path="/student/dashboard"
          element={
            <PrivateRoute allowedRoles={['student']}>
              <StudentLayout>
                <StudentDashboard />
              </StudentLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/student/calendar"
          element={
            <PrivateRoute allowedRoles={['student']}>
              <StudentLayout>
                <Calendar />
              </StudentLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/student/handbook"
          element={
            <PrivateRoute allowedRoles={['student']}>
              <StudentLayout>
                <Handbook />
              </StudentLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/student/files"
          element={
            <PrivateRoute allowedRoles={['student']}>
              <StudentLayout>
                <Files />
              </StudentLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/student/tools"
          element={
            <PrivateRoute allowedRoles={['student']}>
              <StudentLayout>
                <Tools />
              </StudentLayout>
            </PrivateRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminLayout>
                <Users />
              </AdminLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/conforme"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminLayout>
                <Conforme />
              </AdminLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/support"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminLayout>
                <Support />
              </AdminLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/calendar"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminLayout>
                <AdminCalendar />
              </AdminLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/handbook-preview"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminLayout>
                <HandbookPreview />
              </AdminLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/cms"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminLayout>
                <Cms />
              </AdminLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminLayout>
                <Reports />
              </AdminLayout>
            </PrivateRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" />
        <AppContent />
      </AuthProvider>
    </Router>
  )
}

export default App