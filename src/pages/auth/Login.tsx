import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import { FaEnvelope, FaLock, FaMicrosoft, FaInfoCircle, FaArrowLeft } from 'react-icons/fa'
import logo from '../../assets/imgs/logo-connect.png'

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await signIn(email, password)
      if (error) throw error

      toast.success('Login successful!')
      const lowerEmail = email.toLowerCase()
      if (lowerEmail.startsWith('admin@')) navigate('/admin/dashboard')
      else if (lowerEmail.startsWith('faculty@')) navigate('/faculty/dashboard')
      else navigate('/student/dashboard')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMicrosoftSignIn = () => {
    toast.error('Microsoft sign-in is not configured yet.')
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <div className="flex w-full flex-col lg:flex-row">
        {/* Left column: card with form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-8 lg:px-12 py-8 lg:py-12">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl px-6 sm:px-8 py-6 sm:py-8">
            {/* Back button */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mb-4 inline-flex items-center text-xs text-gray-500 hover:text-blue-600"
            >
              <FaArrowLeft className="mr-1 h-3 w-3" />
              Back to home
            </button>

            {/* Info banner */}
            <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 flex items-start space-x-3 text-xs text-blue-900">
              <div className="mt-0.5">
                <FaInfoCircle className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="font-medium">Only school email addresses are accepted</p>
                <p className="mt-1 text-[11px] text-blue-800">
                  Use your <span className="font-semibold">@dyci.edu.ph</span> email account
                </p>
              </div>
            </div>

            {/* Microsoft sign-in */}
            <button
              type="button"
              onClick={handleMicrosoftSignIn}
              className="w-full inline-flex items-center justify-center space-x-2 rounded-xl bg-[#1434A4] hover:bg-[#102a82] text-white text-sm font-medium py-3 shadow-sm transition-colors"
            >
              <FaMicrosoft className="h-4 w-4" />
              <span>Sign in with Microsoft</span>
            </button>

            {/* Divider */}
            <div className="my-6 flex items-center text-xs text-gray-400">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="px-3">Or continue with school email</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Email/password form */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-gray-700"
                >
                  School email address
                </label>
                <div className="mt-1 flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <FaEnvelope className="h-4 w-4 text-gray-400 mr-3" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border-0 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
                    placeholder="student@dyci.edu.ph"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-gray-700"
                >
                  Password
                </label>
                <div className="mt-1 flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <FaLock className="h-4 w-4 text-gray-400 mr-3" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border-0 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600">
                <label className="inline-flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Remember me</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full inline-flex justify-center rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold py-3 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            {/* Footer */}
            <p className="mt-6 text-center text-xs text-gray-500">
              Don&apos;t have an account?
              <Link
                to="/signup"
                className="ml-1 font-semibold text-blue-600 hover:text-blue-500"
              >
                Register
              </Link>
            </p>
          </div>
        </div>

        {/* Right column: brand panel */}
        <div className="hidden lg:flex w-full lg:w-1/2 bg-[#1434A4] items-center justify-center">
          <div className="text-center px-8">
            <div className="inline-flex items-center justify-center mb-4">
              <img
                src={logo}
                alt="DYCI Connect logo"
                className="h-32 w-32 object-contain rounded-full border-4 border-white shadow-xl"
              />
            </div>
            <h1 className="text-sm font-semibold tracking-[0.2em] text-blue-100">
              DYCI CONNECT
            </h1>
            <p className="mt-2 text-sm text-blue-100">
              Sign in with your school account
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login