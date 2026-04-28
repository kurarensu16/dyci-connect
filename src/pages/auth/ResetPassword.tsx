import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import toast from 'react-hot-toast'
import PasswordStrengthIndicator from '../../components/auth/PasswordStrengthIndicator'

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [passwordValid, setPasswordValid] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()

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
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (!passwordValid) {
      toast.error('Password does not meet institutional security standards')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        toast.error('Failed to update password. Your reset link may have expired.')
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
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl px-6 sm:px-8 py-8 text-center space-y-4">
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
            className="inline-flex justify-center rounded-2xl bg-[#4F46E5] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#4338CA]"
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
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl px-6 sm:px-8 py-6 sm:py-8">
        <h1 className="text-lg font-semibold text-slate-900">Set new password</h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter your new password below. Use at least 6 characters.
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700 ml-1">New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all pr-10"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showNewPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <PasswordStrengthIndicator
            password={newPassword}
            onValidationChange={setPasswordValid}
          />

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700 ml-1">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all pr-10"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showConfirmPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !passwordValid || newPassword !== confirmPassword}
            className="w-full bg-[#1434A4] hover:bg-[#102a82] text-white font-bold py-4 rounded-full transition-all shadow-lg shadow-blue-900/20 disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-widest text-xs"
          >
            {loading ? 'Updating...' : 'Reset Password'}
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
