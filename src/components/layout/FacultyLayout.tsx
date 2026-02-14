import React, { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FaBookOpen, FaSignOutAlt, FaChevronLeft, FaChevronRight, FaCalendarAlt, FaBars, FaUserCircle } from 'react-icons/fa'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import logo from '../../assets/imgs/logo-connect.png'
import { MdSpaceDashboard } from "react-icons/md";

interface FacultyLayoutProps {
  children: ReactNode
}

const FacultyLayout: React.FC<FacultyLayoutProps> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isVerified, setIsVerified] = useState<boolean | null>(null)

  useEffect(() => {
    const loadVerification = async () => {
      if (!isSupabaseConfigured || !user?.id) {
        setIsVerified(null)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('verified')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Error loading verification status (faculty)', error)
        setIsVerified(null)
      } else {
        setIsVerified(data?.verified === true)
      }

    }

    loadVerification()
  }, [user?.id])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const navItems: Array<{
    label: string
    icon: React.ComponentType<{ className?: string }>
    path: string
    disabled?: boolean
  }> = [
    { label: 'Dashboard', icon: MdSpaceDashboard, path: '/faculty/dashboard' },
    { label: 'School Calendar', icon: FaCalendarAlt, path: '/faculty/calendar' },
    { label: 'Handbook', icon: FaBookOpen, path: '/faculty/handbook' },
    { label: 'Profile', icon: FaUserCircle, path: '/faculty/profile' },
  ]

  const isLocked = isSupabaseConfigured && isVerified === false

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      {/* Sidebar (desktop) */}
      <aside
        className={`hidden md:flex md:flex-col md:h-screen md:sticky md:top-0 md:border-r md:border-slate-200 bg-white transition-all duration-200 ease-in-out ${
          collapsed ? 'md:w-20' : 'md:w-64'
        }`}
      >
        <div className="relative h-14 px-4 flex items-center border-b border-slate-200">
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center overflow-hidden shrink-0">
              <img src={logo} alt="DYCI logo" className="h-6 w-6 object-contain" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold tracking-[0.25em] text-blue-900 uppercase">
                  DYCI CONNECT
                </span>
                <span className="text-[10px] text-slate-400">Faculty portal</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 text-[10px] shadow-sm"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon
            const locked = isLocked && item.path !== '/faculty/dashboard'

            const baseClasses =
              'w-full flex items-center rounded-xl px-3 py-2 text-xs font-medium transition-colors'

            return (
              <Link
                key={item.label}
                to={locked ? '#' : item.path}
                className={`${baseClasses} ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                } ${collapsed ? 'justify-center' : 'space-x-3'} ${locked ? 'pointer-events-none opacity-60' : ''}`}
                onClick={locked ? (e) => e.preventDefault() : undefined}
              >
                <Icon className="h-3.5 w-3.5" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-200">
          {!collapsed && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-slate-800">
                {user?.user_metadata?.full_name || 'Faculty'}
              </p>
              <p className="text-[10px] text-slate-500">
                {user?.email || 'faculty@dyci.edu.ph'}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className={`w-full inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50 ${
              collapsed ? 'justify-center' : 'space-x-2'
            }`}
          >
            <FaSignOutAlt className="h-3 w-3" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Sidebar overlay (mobile) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button
            type="button"
            className="flex-1 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center overflow-hidden shrink-0">
                  <img src={logo} alt="DYCI logo" className="h-6 w-6 object-contain" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-semibold tracking-[0.25em] text-blue-900 uppercase">
                    DYCI CONNECT
                  </span>
                  <span className="text-[10px] text-slate-400">Faculty portal</span>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path
                const Icon = item.icon

                const baseClasses =
                  'w-full flex items-center rounded-xl px-3 py-2 text-xs font-medium transition-colors'

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      navigate(item.path)
                      setMobileOpen(false)
                    }}
                    className={`${baseClasses} space-x-3 ${
                      isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </nav>

            <div className="px-3 py-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  handleSignOut()
                  setMobileOpen(false)
                }}
                className="w-full inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50 space-x-2"
              >
                <FaSignOutAlt className="h-3 w-3" />
                <span>Sign out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 w-full">
        {/* Mobile top bar with menu button */}
        <div className="md:hidden sticky top-0 z-30 bg-slate-50/95 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-slate-300 text-slate-600 bg-white shadow-sm"
            aria-label="Open navigation"
          >
            <FaBars className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold text-slate-700">Faculty menu</span>
        </div>

        {isLocked && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-[11px] text-amber-800">
            <p className="font-medium">Your account is pending verification.</p>
            <p className="mt-1">
              You can view your dashboard, but other features are locked until an
              administrator verifies your account.
            </p>
          </div>
        )}

        <div className="min-h-screen relative">
          {isLocked && (
            <div className="pointer-events-none absolute inset-0 bg-slate-50/70" />
          )}
          {children}
        </div>
      </main>
    </div>
  )
}

export default FacultyLayout
