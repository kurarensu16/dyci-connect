import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaLock, FaCheckCircle, FaTimesCircle, FaEye, FaEyeSlash } from 'react-icons/fa'
import { supabase } from '../../lib/supabaseClient'
import logo from '../../assets/imgs/logo-connect.png'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'

// --- Password strength helpers ---
interface Criterion {
  label: string
  pass: boolean
}

function evaluatePassword(pw: string): { criteria: Criterion[]; score: number; label: string; color: string; barColor: string } {
  const criteria: Criterion[] = [
    { label: 'At least 8 characters', pass: pw.length >= 8 },
    { label: 'At least one uppercase letter (A–Z)', pass: /[A-Z]/.test(pw) },
    { label: 'At least one lowercase letter (a–z)', pass: /[a-z]/.test(pw) },
    { label: 'At least one number (0–9)', pass: /\d/.test(pw) },
    { label: 'At least one symbol (e.g. !, @, #, &, *)', pass: /[\W_]/.test(pw) },
  ]
  const score = criteria.filter((c) => c.pass).length

  let label = ''
  let color = ''
  let barColor = ''

  if (pw.length === 0) {
    label = ''; color = ''; barColor = ''
  } else if (score <= 1) {
    label = 'Too Weak'; color = 'text-red-600'; barColor = 'bg-red-500'
  } else if (score === 2) {
    label = 'Weak'; color = 'text-orange-500'; barColor = 'bg-orange-400'
  } else if (score === 3) {
    label = 'Fair'; color = 'text-yellow-500'; barColor = 'bg-yellow-400'
  } else if (score === 4) {
    label = 'Good'; color = 'text-blue-500'; barColor = 'bg-blue-500'
  } else {
    label = 'Strong'; color = 'text-emerald-600'; barColor = 'bg-emerald-500'
  }

  return { criteria, score, label, color, barColor }
}

const ForcePasswordReset: React.FC = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()

  const strength = useMemo(() => evaluatePassword(password), [password])
  const allPass = strength.score === 5

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!allPass) {
      toast.error('Password does not meet all the strong password criteria.')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: password,
      data: { must_reset_password: false }
    })

    setLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Password updated successfully!')

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id)
      .maybeSingle()

    const role = profile?.role?.toString().toLowerCase() ?? 'student'
    if (role === 'admin') navigate('/admin/dashboard')
    else if (role === 'staff' || role === 'faculty') navigate('/staff/profile?edit=true')
    else navigate('/student/profile?edit=true')
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <div className="flex w-full flex-col lg:flex-row">
        {/* Left column */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-8 lg:px-12 py-8 lg:py-12">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl px-6 sm:px-8 py-6 sm:py-8">
            <h1 className="text-sm font-semibold tracking-[0.16em] text-blue-900">
              DYCI CONNECT
            </h1>
            <h2 className="mt-2 text-xl font-bold text-gray-900">
              Update Your Password
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Since this is your first time logging in with an account provided by the school, you must choose a secure password before continuing.
            </p>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              {/* New Password */}
              <div className="space-y-1">
                <label htmlFor="password" className="block text-xs font-medium text-gray-700">
                  New Password
                </label>
                <div className="mt-1 flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <FaLock className="h-4 w-4 text-gray-400 mr-3" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border-0 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Strength bar — only shown while typing */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((seg) => (
                        <div
                          key={seg}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${strength.score >= seg ? strength.barColor : 'bg-gray-200'
                            }`}
                        />
                      ))}
                    </div>
                    <p className={`text-[11px] font-semibold ${strength.color}`}>
                      {strength.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-700">
                  Confirm New Password
                </label>
                <div className="mt-1 flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <FaLock className="h-4 w-4 text-gray-400 mr-3" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border-0 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showConfirmPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p className={`text-[11px] mt-1 ${password === confirmPassword ? 'text-emerald-600' : 'text-red-500'}`}>
                    {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </p>
                )}
              </div>

              {/* Dynamic criteria checklist when typing */}
              {password.length > 0 ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-slate-700">Password Requirements</h3>
                  <ul className="space-y-1.5">
                    {strength.criteria.map((c) => (
                      <li key={c.label} className="flex items-center gap-2">
                        {c.pass
                          ? <FaCheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                          : <FaTimesCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                        }
                        <span className={`text-[11px] ${c.pass ? 'text-emerald-700 line-through decoration-emerald-400' : 'text-slate-600'}`}>
                          {c.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {allPass && (
                    <p className="text-[11px] text-emerald-600 font-semibold pt-1">
                      ✓ All criteria met! Your password is secure.
                    </p>
                  )}
                </div>
              ) : (
                /* Static hint before typing */
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <h3 className="text-xs font-semibold text-blue-800">Strong Password Criteria</h3>
                  <p className="mt-1.5 text-[11px] text-blue-700 leading-relaxed">
                    Must include uppercase (A–Z), lowercase (a–z), numbers (0–9), and symbols. Min. 8 characters.{' '}
                    <span className="font-semibold">Example: Tr0ub4dour&3</span>
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !allPass}
                className="w-full inline-flex justify-center rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold py-3 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Saving...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

        {/* Right column */}
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
              Secure your account
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForcePasswordReset
