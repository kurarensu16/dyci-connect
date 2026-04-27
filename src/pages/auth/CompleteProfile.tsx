import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import { FaArrowLeft, FaUserGraduate, FaUserTie } from 'react-icons/fa'

const CompleteProfile: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<'student' | 'staff'>('student')

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
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      const metaRole = (profile?.role || user.user_metadata?.role as string | undefined)?.toLowerCase()
      if (metaRole === 'staff' || metaRole === 'faculty' || metaRole === 'academic_admin') {
        navigate('/complete-profile/staff/account')
      } else if (metaRole === 'student') {
        navigate('/complete-profile/student/account')
      } else {
        setLoading(false)
      }
    }
    check()
  }, [user, navigate])

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()
    if (role === 'staff') navigate('/complete-profile/staff/account')
    else navigate('/complete-profile/student/account')
  }

  if (!user || loading) return null

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 sm:p-10 space-y-8">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-[#1434A4] transition-colors uppercase tracking-widest"
          >
            <FaArrowLeft className="mr-2 h-3 w-3" />
            Back to login
          </button>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">Finish Setting Up Your Account</h1>
            <p className="mt-2 text-sm text-slate-500">
              Select your institutional role to continue.
            </p>
          </div>

          <form onSubmit={handleNext} className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`flex items-center p-4 rounded-2xl border-2 transition-all ${
                  role === 'student'
                    ? 'border-[#1434A4] bg-blue-50/50 shadow-sm'
                    : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                }`}
              >
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center mr-4 ${
                  role === 'student' ? 'bg-[#1434A4] text-white' : 'bg-white text-slate-400 border border-slate-100'
                }`}>
                  <FaUserGraduate className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <p className={`font-bold text-sm ${role === 'student' ? 'text-[#1434A4]' : 'text-slate-900'}`}>Student</p>
                  <p className="text-xs text-slate-500">Academic & enrollment info</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole('staff')}
                className={`flex items-center p-4 rounded-2xl border-2 transition-all ${
                  role === 'staff'
                    ? 'border-[#1434A4] bg-blue-50/50 shadow-sm'
                    : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                }`}
              >
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center mr-4 ${
                  role === 'staff' ? 'bg-[#1434A4] text-white' : 'bg-white text-slate-400 border border-slate-100'
                }`}>
                  <FaUserTie className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <p className={`font-bold text-sm ${role === 'staff' ? 'text-[#1434A4]' : 'text-slate-900'}`}>Staff / Faculty</p>
                  <p className="text-xs text-slate-500">Institutional & office details</p>
                </div>
              </button>
            </div>

            <button
              type="submit"
              className="w-full mt-4 bg-[#1434A4] hover:bg-[#102a82] text-white text-sm font-bold py-4 rounded-full shadow-lg shadow-blue-900/20 transition-all uppercase tracking-widest text-xs"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CompleteProfile
