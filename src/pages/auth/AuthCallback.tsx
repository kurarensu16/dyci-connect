import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import { checkProfileCompleteness, createIncompleteProfileNotification } from '../../utils/profileUtils'

const AuthCallback: React.FC = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'email-confirmed' | 'done'>('loading')

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus('email-confirmed')
      return
    }

    const run = async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setStatus('email-confirmed')
          return
        }
        window.history.replaceState({}, '', window.location.pathname)
        if (!data.session?.user) {
          setStatus('email-confirmed')
          return
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setStatus('email-confirmed')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, verified, first_name, last_name')
        .eq('id', session.user.id)
        .maybeSingle()

      const role = profile?.role?.toString().toLowerCase() ?? ''
      const verified = profile?.verified === true
      const completeness = checkProfileCompleteness(profile)

      if (!profile || !role || !completeness.isComplete) {
        await createIncompleteProfileNotification(session.user.id)
        navigate('/complete-profile', { replace: true })
        setStatus('done')
        return
      }
      if (!verified && role !== 'admin') {
        if (role === 'faculty') {
          navigate('/faculty/dashboard', { replace: true })
        } else {
          navigate('/student/dashboard', { replace: true })
        }
        setStatus('done')
        return
      }
      if (role === 'admin') {
        navigate('/admin/dashboard', { replace: true })
      } else if (role === 'faculty') {
        navigate('/faculty/dashboard', { replace: true })
      } else {
        navigate('/student/dashboard', { replace: true })
      }
      setStatus('done')
    }

    run()
  }, [navigate])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-sm text-slate-500">Signing you in…</div>
      </div>
    )
  }

  if (status === 'done') {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-xl px-6 py-8 text-center space-y-4">
        <h1 className="text-lg font-semibold text-slate-900">Email confirmed</h1>
        <p className="text-sm text-slate-600">
          Your email address has been verified. You can now sign in with your account credentials.
        </p>
        <div className="pt-2">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-xl bg-[#1434A4] hover:bg-[#102a82] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Go to login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AuthCallback
