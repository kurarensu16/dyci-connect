import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Toaster } from 'react-hot-toast'
import PrivateRoute from './components/auth/PrivateRoute'
import RequireUser from './components/auth/RequireUser'

// Public Pages
import Home from './pages/Home'
import Login from './pages/auth/Login'
import ConformePage from './pages/auth/Conforme'
import ForcePasswordReset from './pages/auth/ForcePasswordReset'
import AuthCallback from './pages/auth/AuthCallback'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import CompleteProfile from './pages/auth/CompleteProfile'
import CompleteStudentProfile from './pages/auth/CompleteStudentProfile'
import CompleteFacultyProfile from './pages/auth/CompleteFacultyProfile'
import NotFound from './pages/NotFound'

// Student Pages
import StudentDashboard from './pages/student/Dashboard'
import Calendar from './pages/student/Calendar'
import Handbook from './pages/student/Handbook'
import Files from './pages/student/Files'
import Tools from './pages/student/Tools'
import StudentNotifications from './pages/student/Notifications'

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard'
import Users from './pages/admin/Users'
import Support from './pages/admin/Support'
import AdminCalendar from './pages/admin/Calendar'
import HandbookPreview from './pages/admin/HandbookPreview'
import Cms from './pages/admin/Cms'
import Reports from './pages/admin/Reports'
import AdminNotifications from './pages/student/Notifications'

// Staff Pages
import StaffDashboard from './pages/faculty/Dashboard'
import StaffCalendar from './pages/faculty/Calendar'
import StaffHandbook from './pages/faculty/Handbook'
import HandbookApprovals from './pages/faculty/HandbookApprovals'
import StaffNotifications from './pages/student/Notifications'

// Shared Components
import StudentLayout from './components/layout/StudentLayout'
import AdminLayout from './components/layout/AdminLayout'
import StaffLayout from './components/layout/FacultyLayout'
import StudentProfile from './pages/student/Profile'


const AppContent: React.FC = () => {

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/conforme" element={<ConformePage />} />
        <Route
          path="/force-password-reset"
          element={
            <RequireUser>
              <ForcePasswordReset />
            </RequireUser>
          }
        />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/complete-profile"
          element={
            <RequireUser>
              <CompleteProfile />
            </RequireUser>
          }
        />
        <Route
          path="/complete-profile/student/*"
          element={
            <RequireUser>
              <CompleteStudentProfile />
            </RequireUser>
          }
        />
        <Route
          path="/complete-profile/staff/*"
          element={
            <RequireUser>
              <CompleteFacultyProfile />
            </RequireUser>
          }
        />
        {/* Legacy redirect */}
        <Route
          path="/complete-profile/faculty/*"
          element={
            <RequireUser>
              <CompleteFacultyProfile />
            </RequireUser>
          }
        />


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
          path="/student/notifications"
          element={
            <PrivateRoute allowedRoles={['student']}>
              <StudentLayout>
                <StudentNotifications />
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

        {/* Staff Routes */}
        <Route
          path="/staff/dashboard"
          element={
            <PrivateRoute allowedRoles={['staff']}>
              <StaffLayout>
                <StaffDashboard />
              </StaffLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/staff/notifications"
          element={
            <PrivateRoute allowedRoles={['staff']}>
              <StaffLayout>
                <StaffNotifications />
              </StaffLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/staff/calendar"
          element={
            <PrivateRoute allowedRoles={['staff']}>
              <StaffLayout>
                <StaffCalendar />
              </StaffLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/staff/handbook"
          element={
            <PrivateRoute allowedRoles={['staff']}>
              <StaffLayout>
                <StaffHandbook />
              </StaffLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/staff/handbook-approvals"
          element={
            <PrivateRoute allowedRoles={['staff']}>
              <StaffLayout>
                <HandbookApprovals />
              </StaffLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/staff/profile"
          element={
            <PrivateRoute allowedRoles={['staff']}>
              <StaffLayout>
                <StudentProfile />
              </StaffLayout>
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
          path="/admin/notifications"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminLayout>
                <AdminNotifications />
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

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
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