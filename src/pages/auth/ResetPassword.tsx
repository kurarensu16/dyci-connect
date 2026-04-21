import React, { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { FaLock, FaCheckCircle, FaTimesCircle, FaEye, FaEyeSlash } from 'react-icons/fa'

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

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()

  const strength = useMemo(() => evaluatePassword(newPassword), [newPassword])
  const allPass = strength.score === 5

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setChecking(false)
      setReady(false)
      return
    }

    const run = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')

      // PKCE flow: Supabase redirects with ?code=... instead of #access_token=...
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error && data.session) {
          window.history.replaceState({}, '', window.location.pathname)
          setChecking(false)
          setReady(true)
          return
        }
      }

      // Implicit flow: tokens in hash; getSession() may already have picked them up
      const { data: { session } } = await supabase.auth.getSession()
      setChecking(false)
      setReady(!!session)
    }

    run()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!allPass) {
      toast.error('Password does not meet all the strong password criteria.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        toast.error(error.message || 'Failed to update password.')
        return
      }
      toast.success('Password updated. You can now sign in with your new password.')
      await supabase.auth.signOut()
      navigate('/login', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-sm text-slate-500">Loading…</div>
      </div>
    )
  }

  if (!ready) {
    const hasEmptyHash = window.location.hash === '' || window.location.hash === '#'
    const noParams = !window.location.search && hasEmptyHash

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl px-6 sm:px-8 py-8 text-center space-y-4">
          <h1 className="text-lg font-semibold text-slate-900">
            {noParams ? 'Reset link incomplete' : 'Invalid or expired link'}
          </h1>
          <p className="text-sm text-slate-600">
            {noParams ? (
              <>
                The link opened without the security code. This often happens when the link is
                truncated or opened from certain email clients. Try:{' '}
                <strong>request a new link</strong> below, then open it in Chrome or Edge, or copy
                the full link from the email and paste it into your browser&apos;s address bar. Also
                ensure <strong>https://dyci-connect.vercel.app/reset-password</strong> is in your
                Supabase project&apos;s Redirect URLs (Authentication → URL Configuration).
              </>
            ) : (
              'This password reset link is invalid or has expired. Request a new one from the login page.'
            )}
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex justify-center rounded-xl bg-[#4F46E5] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#4338CA]"
          >
            Request new link
          </Link>
          <p className="text-xs text-slate-500">
            <Link to="/login" className="text-blue-600 hover:text-blue-500">Back to login</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl px-6 sm:px-8 py-6 sm:py-8">
        <h1 className="text-lg font-semibold text-slate-900">Set new password</h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter your new password below. Use at least 8 characters.
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label htmlFor="new-password" className="block text-xs font-medium text-gray-700">
              New password
            </label>
            <div className="mt-1 flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <FaLock className="h-4 w-4 text-gray-400 mr-3" />
              <input
                id="new-password"
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border-0 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
              </button>
            </div>
            {/* Dynamic strength bar */}
            {newPassword.length > 0 && (
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
          <div className="space-y-1">
            <label htmlFor="confirm-password" className="block text-xs font-medium text-gray-700">
              Confirm new password
            </label>
            <div className="mt-1 flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <FaLock className="h-4 w-4 text-gray-400 mr-3" />
              <input
                id="confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border-0 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
                placeholder="••••••••"
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
              <p className={`text-[11px] mt-1 ${newPassword === confirmPassword ? 'text-emerald-600' : 'text-red-500'}`}>
                {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </p>
            )}
          </div>

          {/* Dynamic criteria checklist when typing */}
          {newPassword.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2 mt-2">
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
          )}

          <button
            type="submit"
            disabled={loading || (newPassword.length > 0 && !allPass)}
            className="w-full inline-flex justify-center rounded-xl bg-[#4F46E5] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#4338CA] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-500">
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  )
}

export default ResetPassword
