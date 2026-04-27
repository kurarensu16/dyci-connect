import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaArrowLeft } from 'react-icons/fa'
const logo = '/icons/icon-512x512.png'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { fetchSchoolSettings, acceptConforme, fetchAcademicYears } from '../../lib/api/settings'
import toast from 'react-hot-toast'

const Conforme: React.FC = () => {
  const navigate = useNavigate()
  const { user, authoritativeRole } = useAuth()
  const [agreed, setAgreed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [academicYearId, setAcademicYearId] = useState<string | null>(null)
  const [academicYearName, setAcademicYearName] = useState<string | null>(null)

  useEffect(() => {
    const loadAcademicYear = async () => {
      const { data: yearId } = await supabase.rpc('get_current_academic_year_id')
      if (!yearId) {
        const { data: settings } = await fetchSchoolSettings()
        if (settings) setAcademicYearId(settings.current_academic_year_id)
      } else {
        setAcademicYearId(yearId)
      }

      if (yearId || academicYearId) {
        const { data: years } = await fetchAcademicYears()
        if (years) {
          const currentYear = years.find(y => y.id === (yearId || academicYearId))
          if (currentYear) setAcademicYearName(currentYear.year_name)
        }
      }
    }
    loadAcademicYear()
  }, [])

  const handleAgree = async () => {
    if (!user?.id || !academicYearId) {
      navigate('/login')
      return
    }

    setSaving(true)
    const { error } = await acceptConforme(user.id, academicYearId, authoritativeRole || 'student')
    setSaving(false)

    if (error) {
      toast.error('Failed to save acceptance. Please try again.')
      return
    }

    const role = authoritativeRole?.toLowerCase() || 'student'
    if (role === 'academic_admin') navigate('/admin/dashboard')
    else if (role === 'staff' || role === 'faculty') navigate('/staff/dashboard')
    else navigate('/student/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 sm:p-10 space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-[#1434A4] transition-colors uppercase tracking-widest"
            >
              <FaArrowLeft className="mr-2 h-3 w-3" />
              Back
            </button>
            <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center p-2">
               <img src={logo} alt="Logo" className="h-full w-full object-contain" />
            </div>
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              Institutional Policy & Data Consent
            </h1>
            {academicYearName && (
              <div className="mt-2">
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest border border-blue-100">
                  Academic Year {academicYearName}
                </span>
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
            <div className="text-[11px] text-slate-600 space-y-4 leading-relaxed">
              <section>
                <h3 className="font-bold text-slate-900 mb-1">1. Declaration of Identity</h3>
                <p>I certify that I am a bona fide student or employee of Dr. Yanga's Colleges, Inc. (DYCI). Any misrepresentation may be grounds for disciplinary action.</p>
              </section>
              <section>
                <h3 className="font-bold text-slate-900 mb-1">2. Data Privacy Consent (RA 10173)</h3>
                <p>I voluntarily grant permission to collect and process my personal data for academic purposes, authentication, and school communications.</p>
              </section>
              <section>
                <h3 className="font-bold text-slate-900 mb-1">3. Acceptable Use</h3>
                <p>I am responsible for my password and will not share credentials. I will follow school policies and professional standards.</p>
              </section>
              <section>
                <h3 className="font-bold text-slate-900 mb-1">4. Acceptance of Terms</h3>
                <p>By clicking "I Agree", I acknowledge that I have read and understood the terms of this Conforme.</p>
              </section>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <label className="flex items-start space-x-3 text-[11px] text-slate-500 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#1434A4] focus:ring-[#1434A4] transition-all"
              />
              <span className="group-hover:text-slate-900 transition-colors leading-relaxed">
                I confirm that I have read and understood the DYCI Connect User Conforme, and I agree to be bound by its terms.
              </span>
            </label>

            <button
              type="button"
              disabled={!agreed || saving || (!academicYearId && !saving)}
              onClick={handleAgree}
              className="w-full bg-[#1434A4] hover:bg-[#102a82] text-white text-sm font-bold py-4 rounded-full shadow-lg shadow-blue-900/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all uppercase tracking-widest"
            >
              {saving ? 'Processing...' : 'Agree & Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Conforme
