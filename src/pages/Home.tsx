import React from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/imgs/logo-connect.png'

const Home: React.FC = () => {
  const navigate = useNavigate()

  const handleSignIn = () => {
    navigate('/login')
  }

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">
      {/* Welcome section */}
      <main className="flex-1 bg-linear-to-b from-sky-50 via-slate-50 to-slate-100">
        <div className="max-w-5xl mx-auto px-4 pt-16 pb-20">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex flex-col items-center">
              <div className="h-20 w-20 rounded-full bg-white shadow-md flex items-center justify-center mb-4">
                <img src={logo} alt="DYCI Connect logo" className="h-14 w-14 object-contain" />
              </div>
              <h2 className="text-xs font-semibold tracking-[0.3em] text-blue-900">
                DYCI CONNECT
              </h2>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-900 max-w-2xl">
              Welcome to your DYCI student Handbook
            </h1>
            <p className="mt-4 text-sm sm:text-base text-blue-900 max-w-xl">
              Sign in to access your student handbook, academic files, GWA tools, and
              important announcements in one secure place.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSignIn}
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Sign in to DYCI Connect
              </button>
            </div>

            {/* <p className="mt-6 text-xs text-slate-500 max-w-md">
              Use your official DYCI account credentials to continue. If you have trouble signing
              in, please contact the DYCI IT or Student Services office.
            </p> */}
          </div>
        </div>
      </main>

      {/* Simple footer */}
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-slate-500">
          {/* <p className="font-semibold text-slate-700 mb-1">DYCI CONNECT</p>
          <p>Your centralized portal for DYCI student services and academic tools.</p> */}
          <p className="mt-2 text-[11px] text-slate-400">
            © {new Date().getFullYear()} Dr. Yanga&apos;s Colleges. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Home