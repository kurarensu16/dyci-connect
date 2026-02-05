import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import logo from '../../assets/imgs/logo-connect.png'

const Navbar: React.FC = () => {
  const { user, signOut } = useAuth()
  const location = useLocation()

  const isLanding = location.pathname === '/'

  return (
    <nav className="bg-[#1c398e] border-b border-[#13235c]">
      <div className="flex justify-between h-16 items-center max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden">
            <img src={logo} alt="DYCI logo" className="h-7 w-7 object-contain" />
          </div>
          <span className="text-sm font-semibold tracking-[0.3em] text-white uppercase">
            DYCI CONNECT
          </span>
        </Link>

        <div className="flex items-center space-x-4">
          {user ? (
            <>
              {user.user_metadata?.role === 'student' && (
                <Link
                  to="/student/dashboard"
                  className="text-sm font-medium text-slate-700 hover:text-blue-600"
                >
                  Dashboard
                </Link>
              )}
              {user.user_metadata?.role === 'admin' && (
                <Link
                  to="/admin/dashboard"
                  className="text-sm font-medium text-slate-700 hover:text-blue-600"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={signOut}
                className="px-5 py-2 text-sm font-semibold text-white bg-red-500 rounded-full hover:bg-red-600"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className={`px-5 py-2 text-sm font-semibold rounded-full ${
                isLanding
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'border border-blue-600 text-blue-600 hover:bg-blue-50'
              }`}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar