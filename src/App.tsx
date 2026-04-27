import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/AuthContext'
import { Toaster } from 'react-hot-toast'
import { FaFingerprint } from 'react-icons/fa'
import { supabase } from './lib/supabaseClient'
import PrivateRoute from './components/auth/PrivateRoute'
import RequireUser from './components/auth/RequireUser'
import MaintenanceGuard from './components/auth/MaintenanceGuard'
import AuthOverrideGuard from './components/auth/AuthOverrideGuard'
import ReadOnlyGuard from './components/auth/ReadOnlyGuard'
import PasswordResetOnboarding from './components/onboarding/PasswordResetOnboarding'

// Public Pages
import Home from './pages/Home'
import Login from './pages/auth/Login'
import ConformePage from './pages/auth/Conforme'
import AuthCallback from './pages/auth/AuthCallback'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import CompleteProfile from './pages/auth/CompleteProfile'
import CompleteStudentProfile from './pages/auth/CompleteStudentProfile'
import CompleteFacultyProfile from './pages/auth/CompleteFacultyProfile'
import PendingApproval from './pages/auth/PendingApproval'
import NotFound from './pages/NotFound'
import Maintenance from './pages/Maintenance'
import SessionSuspended from './pages/SessionSuspended'

// Student Pages
import StudentDashboard from './pages/student/Dashboard'
import Calendar from './pages/student/Calendar'
import Handbook from './pages/student/Handbook'
import Files from './pages/student/Files'
import Tools from './pages/student/Tools'
import StudentNotifications from './pages/student/Notifications'

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard'

import Support from './pages/admin/Support'
import AdminCalendar from './pages/admin/Calendar'
import HandbookPreview from './pages/admin/HandbookPreview'
import Cms from './pages/admin/Cms'
import Reports from './pages/admin/Reports'
import AdminNotifications from './pages/student/Notifications'

// SysAdmin (L90) Pages
import SysAdminDashboard from './pages/sysadmin/Dashboard'
import SysAdminUsers from './pages/sysadmin/Users'
import SysAdminOrganization from './pages/sysadmin/Organization'
import SysAdminForensics from './pages/sysadmin/Forensics'
import SysAdminSettings from './pages/sysadmin/Settings'
import SysAdminStorage from './pages/sysadmin/Storage'
import SysAdminProfile from './pages/sysadmin/Profile'
import SysAdminAlerts from './pages/sysadmin/Alerts'
import SysAdminBroadcastNetwork from './pages/sysadmin/BroadcastNetwork'

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

// Onboarding Guard - Checks for password reset and student onboarding
const OnboardingGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, authoritativeRole, loading: authLoading } = useAuth();
  const { pathname: path } = useLocation();
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [checked, setChecked] = useState(false);
  const [needsConforme, setNeedsConforme] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const checkOnboarding = async () => {
      // 1. Wait for auth to be truly resolved (role included)
      if (authLoading || (user && authoritativeRole === null)) {
        return;
      }

      // Reset states before re-checking to prevent stale redirect loops
      setChecked(false);
      setNeedsConforme(false);
      setNeedsProfile(false);
      setShowPasswordReset(false);

      if (!user) {
        setChecked(true);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('password_reset_required, profile_complete, role')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile) {
          setChecked(true);
          return;
        }

        // Priority 1: Mandatory Password Reset (Institutional Security)
        if (profile.password_reset_required) {
          setShowPasswordReset(true);
          setChecked(true);
          return;
        }

        // Priority 2: Institutional Onboarding Sequence (Conforme -> Profile)
        const isStudent = authoritativeRole === 'student';
        const isStaff = ['staff', 'faculty', 'academic_admin'].includes(authoritativeRole || '');

        if (isStudent || isStaff) {
          const table = isStudent ? 'student_profiles' : 'staff_profiles';
          const { data: subProfile, error: subError } = await supabase
            .from(table)
            .select('enrolled_academic_year_id')
            .eq('profile_id', user.id)
            .maybeSingle();

          if (subError) {
            console.error('OnboardingGuard: Failed to verify sub-profile status', subError);
            return; // Exit to avoid redirect loop on DB error
          }

          // Check if conforme matches CURRENT academic year (Year Flip Enforcement)
          const { data: currentYearId, error: ayError } = await supabase.rpc('get_current_academic_year_id');
          
          if (ayError) {
            console.error('OnboardingGuard: Failed to fetch current academic year', ayError);
            return;
          }

          const enrolledYear = subProfile?.enrolled_academic_year_id;
          const conformeSigned = enrolledYear === currentYearId;

          if (!conformeSigned) {
            setNeedsConforme(true);
          } else if (!profile.profile_complete) {
            setNeedsProfile(true);
          }
        }
      } catch (err) {
        console.error('Onboarding check error:', err);
      } finally {
        setChecked(true);
      }
    };

    checkOnboarding();
  }, [user, authoritativeRole, authLoading, path, refreshTrigger]);

  // Public/Auth routes that should NEVER be blocked by the guard
  const isWhitelisted = [
    '/login',
    '/forgot-password',
    '/reset-password',
    '/auth/callback',
    '/maintenance',
    '/session-suspended',
    '/pending-approval'
  ].some(p => path.startsWith(p));

  if (isWhitelisted || !user) {
    return <>{children}</>;
  }

  if (!checked || authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <FaFingerprint className="animate-pulse text-4xl text-[#1434A4] mx-auto mb-4" />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Verifying Identity...</p>
        </div>
      </div>
    );
  }

  // GATE 1: Password Reset (Force Overlay)
  if (showPasswordReset) {
    return (
      <PasswordResetOnboarding
        userId={user.id}
        onComplete={() => {
          setShowPasswordReset(false);
          setChecked(false); 
          setRefreshTrigger(prev => prev + 1); // FORCE RE-CHECK
        }}
      />
    );
  }

  // GATE 2: Conforme (Redirect or Direct Render)
  if (needsConforme) {
    if (path !== '/conforme') {
      return <Navigate to="/conforme" replace />;
    }
    return <>{children}</>;
  }

  // GATE 3: Profile Audit (Direct Role Redirect)
  if (needsProfile) {
    if (!path.startsWith('/complete-profile')) {
      const isStudent = authoritativeRole === 'student';
      const target = isStudent ? '/complete-profile/student/account' : '/complete-profile/staff/account';
      return <Navigate to={target} replace />;
    }
    return <>{children}</>;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {

  return (
    <div className="min-h-screen bg-gray-50">
      <OnboardingGuard>
        <MaintenanceGuard>
          <AuthOverrideGuard>
            <ReadOnlyGuard>
              <Routes>
                {/* Maintenance Route - Always accessible */}
                <Route path="/maintenance" element={<Maintenance />} />

                {/* Session Suspended - When auth override is active */}
                <Route path="/session-suspended" element={<SessionSuspended />} />

                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/conforme" element={<ConformePage />} />
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
                <Route
                  path="/pending-approval"
                  element={
                    <RequireUser>
                      <PendingApproval />
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
                    <PrivateRoute allowedRoles={['staff', 'faculty']}>
                      <StaffLayout>
                        <StaffDashboard />
                      </StaffLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/staff/notifications"
                  element={
                    <PrivateRoute allowedRoles={['staff', 'faculty']}>
                      <StaffLayout>
                        <StaffNotifications />
                      </StaffLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/staff/calendar"
                  element={
                    <PrivateRoute allowedRoles={['staff', 'faculty']}>
                      <StaffLayout>
                        <StaffCalendar />
                      </StaffLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/staff/handbook"
                  element={
                    <PrivateRoute allowedRoles={['staff', 'faculty']}>
                      <StaffLayout>
                        <StaffHandbook />
                      </StaffLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/staff/handbook-approvals"
                  element={
                    <PrivateRoute allowedRoles={['staff', 'faculty', 'academic_admin']}>
                      <StaffLayout>
                        <HandbookApprovals />
                      </StaffLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/staff/profile"
                  element={
                    <PrivateRoute allowedRoles={['staff', 'faculty']}>
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
                    <PrivateRoute allowedRoles={['academic_admin', 'staff', 'faculty']}>
                      <AdminLayout>
                        <AdminDashboard />
                      </AdminLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/notifications"
                  element={
                    <PrivateRoute allowedRoles={['academic_admin']}>
                      <AdminLayout>
                        <AdminNotifications />
                      </AdminLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/support"
                  element={
                    <PrivateRoute allowedRoles={['academic_admin']}>
                      <AdminLayout>
                        <Support />
                      </AdminLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/calendar"
                  element={
                    <PrivateRoute allowedRoles={['academic_admin']}>
                      <AdminLayout>
                        <AdminCalendar />
                      </AdminLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/handbook-preview"
                  element={
                    <PrivateRoute allowedRoles={['academic_admin']}>
                      <AdminLayout>
                        <HandbookPreview />
                      </AdminLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/cms"
                  element={
                    <PrivateRoute allowedRoles={['academic_admin']}>
                      <AdminLayout>
                        <Cms />
                      </AdminLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/reports"
                  element={
                    <PrivateRoute allowedRoles={['academic_admin']}>
                      <AdminLayout>
                        <Reports />
                      </AdminLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/profile"
                  element={
                    <PrivateRoute allowedRoles={['academic_admin']}>
                      <AdminLayout>
                        <StudentProfile />
                      </AdminLayout>
                    </PrivateRoute>
                  }
                />

                {/* System Admin Routes */}
                <Route
                  path="/sysadmin/dashboard"
                  element={
                    <PrivateRoute allowedRoles={['system_admin']}>
                      <AdminLayout>
                        <SysAdminDashboard />
                      </AdminLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/sysadmin/users"
                  element={
                    <PrivateRoute allowedRoles={['system_admin']}>
                      <AdminLayout>
                        <SysAdminUsers />
                      </AdminLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/sysadmin/organization"
                  element={
                    <PrivateRoute allowedRoles={['system_admin']}>
                      <AdminLayout>
                        <SysAdminOrganization />
                      </AdminLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/sysadmin/forensics"
                  element={
                    <PrivateRoute allowedRoles={['system_admin']}>
                      <AdminLayout>
                        <SysAdminForensics />
                      </AdminLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/sysadmin/settings"
                  element={
                    <PrivateRoute allowedRoles={['system_admin']}>
                      <AdminLayout>
                        <SysAdminSettings />
                      </AdminLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/sysadmin/storage"
                  element={
                    <PrivateRoute allowedRoles={['system_admin']}>
                      <AdminLayout>
                        <SysAdminStorage />
                      </AdminLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/sysadmin/profile"
                  element={
                    <PrivateRoute allowedRoles={['system_admin']}>
                      <AdminLayout>
                        <SysAdminProfile />
                      </AdminLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/sysadmin/alerts"
                  element={
                    <PrivateRoute allowedRoles={['system_admin']}>
                      <AdminLayout>
                        <SysAdminAlerts />
                      </AdminLayout>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/sysadmin/broadcast"
                  element={
                    <PrivateRoute allowedRoles={['system_admin']}>
                      <AdminLayout>
                        <SysAdminBroadcastNetwork />
                      </AdminLayout>
                    </PrivateRoute>
                  }
                />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ReadOnlyGuard>
          </AuthOverrideGuard>
        </MaintenanceGuard>
      </OnboardingGuard>
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
