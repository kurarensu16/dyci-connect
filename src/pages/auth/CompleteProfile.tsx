import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import toast from 'react-hot-toast'
import { FaArrowLeft } from 'react-icons/fa'

const CompleteProfile: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    role: 'student' as 'student' | 'staff',
  })

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    const check = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, verified')
        .eq('id', user.id)
        .maybeSingle()

      // Primary: Check Profiles Table Role
      if (profile?.role) {
        if (profile.verified) {
          const role = (profile.role as string).toLowerCase()
          if (role === 'academic_admin') navigate('/admin/dashboard')
          else if (role === 'staff') navigate('/staff/dashboard')
          else if (role === 'system_admin') navigate('/sysadmin/dashboard')
          else navigate('/student/dashboard')
          return
        }

        const role = (profile.role as string).toLowerCase()
        if (role === 'staff') navigate('/complete-profile/staff/account')
        else navigate('/complete-profile/student/account')
        return
      }

      // Secondary: Check Auth User Metadata for provisioned role
      const metaRole = (user.user_metadata?.role as string | undefined)?.toLowerCase()
      if (metaRole) {
        if (metaRole === 'staff') navigate('/complete-profile/staff/account')
        else if (metaRole === 'student') navigate('/complete-profile/student/account')
        else if (metaRole === 'academic_admin') navigate('/admin/dashboard')
        else if (metaRole === 'system_admin') navigate('/sysadmin/dashboard')
        return
      }

      setLoading(false)
    }
    check()
  }, [user, navigate])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: name === 'role' ? (value as 'student' | 'staff') : value,
    }))
  }

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.role) {
      toast.error('Please select your role.')
      return
    }
    if (form.role === 'staff') {
      navigate('/complete-profile/staff/account')
    } else {
      navigate('/complete-profile/student/account')
    }
  }

  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-slate-500">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl px-6 sm:px-8 py-6 sm:py-8">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="mb-4 inline-flex items-center text-xs text-gray-500 hover:text-blue-600"
        >
          <FaArrowLeft className="mr-1 h-3 w-3" />
          Back
        </button>
        <h1 className="text-lg font-semibold text-slate-900">Complete your profile</h1>
        <p className="mt-1 text-sm text-slate-600">
          Select your role to get started. We&apos;ll ask for your details on the next steps.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleNext}>
          <div className="space-y-1">
            <label htmlFor="role" className="block text-xs font-medium text-gray-700">
              I am a
            </label>
            <select
              id="role"
              name="role"
              value={form.role}
              onChange={handleChange}
              className="mt-1 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="student">Student</option>
              <option value="staff">Staff / Faculty</option>
            </select>
          </div>
          <button
            type="submit"
            className="mt-2 w-full inline-flex justify-center rounded-2xl bg-[#1434A4] hover:bg-[#102a82] text-white text-sm font-semibold py-3 shadow-sm transition-colors"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  )
}

export default CompleteProfile
