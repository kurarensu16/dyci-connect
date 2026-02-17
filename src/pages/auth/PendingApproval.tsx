import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'

const PendingApproval: React.FC = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    if (!isSupabaseConfigured) {
      return
    }
    const check = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('role, verified')
        .eq('id', user.id)
        .maybeSingle()
      if (!data?.role) {
        navigate('/complete-profile')
        return
      }
      const role = (data.role as string).toLowerCase()
      if (data.verified) {
        if (role === 'admin') navigate('/admin/dashboard')
        else if (role === 'faculty') navigate('/faculty/dashboard')
        else navigate('/student/dashboard')
      } else {
        if (role === 'faculty') navigate('/faculty/dashboard')
        else navigate('/student/dashboard')
      }
    }
    check()
  }, [user, navigate])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl px-6 sm:px-8 py-8 text-center space-y-4">
        <h1 className="text-lg font-semibold text-slate-900">Pending approval</h1>
        <p className="text-sm text-slate-600">
          Your account has been submitted. An administrator will verify your details before you can access DYCI Connect.
        </p>
        <p className="text-xs text-slate-500">
          You will not have full access to the app until your account is approved.
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

export default PendingApproval
