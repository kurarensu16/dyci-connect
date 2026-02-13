import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Toaster } from 'react-hot-toast'
import PrivateRoute from './components/auth/PrivateRoute'

// Public Pages
import Home from './pages/Home'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import ConformePage from './pages/auth/Conforme'
import AuthCallback from './pages/auth/AuthCallback'

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
import FacultyDashboard from './pages/faculty/Dashboard'
import FacultyCalendar from './pages/faculty/Calendar'
import FacultyHandbook from './pages/faculty/Handbook'



// Shared Components
import StudentLayout from './components/layout/StudentLayout'
import AdminLayout from './components/layout/AdminLayout'
import FacultyLayout from './components/layout/FacultyLayout'
import StudentProfile from './pages/student/Profile'


const AppContent: React.FC = () => {

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup/student/*" element={<Signup defaultRole="student" />} />
        <Route path="/signup/faculty/*" element={<Signup defaultRole="faculty" />} />
        {/* Fallback for old links */}
        <Route path="/signup/*" element={<Signup defaultRole="student" />} />
        <Route path="/signup/conforme" element={<ConformePage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

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
        <Route
          path="/student/profile"
          element={
            <PrivateRoute allowedRoles={['student']}>
              <StudentLayout>
                <StudentProfile />
              </StudentLayout>
            </PrivateRoute>
          }
        />

        {/* Faculty Routes (reusing Student pages) */}
        <Route
    path="/faculty/dashboard"
    element={
      <PrivateRoute allowedRoles={['faculty']}>
        <FacultyLayout>
          <FacultyDashboard />
        </FacultyLayout>
      </PrivateRoute>
    }
  />
      <Route
    path="/faculty/calendar"
    element={
      <PrivateRoute allowedRoles={['faculty']}>
        <FacultyLayout>
          <FacultyCalendar />
        </FacultyLayout>
      </PrivateRoute>
    }
  />

  <Route
    path="/faculty/handbook"
    element={
      <PrivateRoute allowedRoles={['faculty']}>
        <FacultyLayout>
          <FacultyHandbook />
        </FacultyLayout>
      </PrivateRoute>
    }
  />



        <Route
          path="/faculty/profile"
          element={
            <PrivateRoute allowedRoles={['faculty']}>
              <FacultyLayout>
                <StudentProfile />
              </FacultyLayout>
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

        <Route
          path="/admin/profile"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminLayout>
                <StudentProfile />
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