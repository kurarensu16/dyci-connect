import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaArrowLeft } from 'react-icons/fa'
const logo = '/icons/icon-512x512.png'
import { useAuth } from '../../contexts/AuthContext'
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
      // Get current academic year ID from settings
      const { data: settings } = await fetchSchoolSettings()
      if (!settings) return

      const yearId = settings.current_academic_year_id
      setAcademicYearId(yearId)

      // Get the academic year name
      const { data: years } = await fetchAcademicYears()
      if (years) {
        const currentYear = years.find(y => y.id === yearId)
        if (currentYear) {
          setAcademicYearName(currentYear.year_name)
        }
      }
    }

    loadAcademicYear()
  }, [])

  const handleAgree = async () => {
    if (!user?.id || !academicYearId) {
      // Not logged in — just navigate to login (original behavior)
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

    // Redirect to correct dashboard based on role
    const role = authoritativeRole?.toLowerCase() || 'student'
    if (role === 'academic_admin') navigate('/admin/dashboard')
    else if (role === 'staff' || role === 'faculty') navigate('/staff/dashboard')
    else navigate('/student/dashboard')
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <div className="flex w-full flex-col lg:flex-row">
        {/* Left column: card with content */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-8 lg:px-12 py-8 lg:py-12 bg-[#f8faff]">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8 sm:p-12 relative border border-blue-100/50">
            {/* Back button */}
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mb-6 inline-flex items-center text-xs font-bold text-gray-400 hover:text-[#1434A4] transition-colors uppercase tracking-widest"
            >
              <FaArrowLeft className="mr-2 h-3 w-3" />
              Back
            </button>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-sm font-bold tracking-[0.2em] text-[#1434A4] uppercase">
                DYCI CONNECT
              </h1>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 leading-tight">
                User Conforme & Data Privacy Agreement
              </h2>
              {academicYearName && (
                <div className="mt-3">
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest border border-blue-100">
                    Academic Year {academicYearName}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl max-h-[400px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-[#A5A6F6] scrollbar-track-transparent">
                <div className="text-xs text-slate-600 space-y-6 leading-relaxed">
                  <section>
                    <h3 className="font-bold text-slate-900 text-sm mb-2">
                      1. Declaration of Identity and Authority
                    </h3>
                    <p>
                      I hereby certify that I am a bona fide student or employee of Dr. Yanga's Colleges, Inc.
                      (DYCI). I declare that the information provided during this registration—including my Full Name,
                      Student/Employee ID, and assigned Academic Department—is true, accurate, and current. I understand
                      that any misrepresentation of my identity may be grounds for disciplinary action under the Student
                      Handbook.
                    </p>
                  </section>

                  <section>
                    <h3 className="font-bold text-slate-900 text-sm mb-2">
                      2. Data Privacy Consent (RA 10173)
                    </h3>
                    <p>
                      In compliance with the Data Privacy Act of 2012 (Republic Act No. 10173) of the Philippines, I
                      voluntarily grant DYCI Connect permission to collect and process my personal data.
                    </p>
                    <div className="mt-3 space-y-2">
                      <p>
                        <span className="font-bold text-slate-900">Purpose:</span> My data (including my address and school-role info)
                        will be used solely for academic purposes, account authentication, and school-related communications.
                      </p>
                      <p>
                        <span className="font-bold text-slate-900">Storage:</span> I understand my profile information, including my
                        Profile Picture and Nickname, will be stored securely within the DYCI Connect database.
                      </p>
                      <p>
                        <span className="font-bold text-slate-900">Access:</span> I acknowledge my right to access, verify, and request
                        corrections to my data if inaccuracies are found in my profile.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h3 className="font-bold text-slate-900 text-sm mb-2">
                      3. Acceptable Use & Account Security
                    </h3>
                    <div className="space-y-3">
                      <p>
                        <span className="font-bold text-slate-900">Account Responsibility:</span> I am solely responsible for
                        maintaining the confidentiality of my password. I agree not to share my login credentials with any
                        other individual.
                      </p>
                      <p>
                        <span className="font-bold text-slate-900">Prohibited Acts:</span> I will not attempt to disrupt the
                        platform's services, bypass security protocols, or use the system for any purpose that violates
                        school policies.
                      </p>
                      <p>
                        <span className="font-bold text-slate-900">Content Standards:</span> I agree to use an appropriate Profile
                        Picture and Nickname that reflect the professional and academic standards of the institution.
                      </p>
                    </div>
                  </section>

                  <section>
                    <h3 className="font-bold text-slate-900 text-sm mb-2">
                      4. Acceptance of Terms
                    </h3>
                    <p>
                      By clicking "I Agree" or "Create Account," I acknowledge that I have read,
                      understood, and agreed to be bound by the terms of this Conforme and the existing policies of Dr.
                      Yanga's Colleges, Inc.
                    </p>
                  </section>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-6">
                <label className="flex items-start space-x-3 text-xs text-slate-500 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#1434A4] focus:ring-[#1434A4] transition-all"
                  />
                  <span className="group-hover:text-slate-900 transition-colors leading-relaxed">
                    I confirm that I have read and understood the DYCI Connect User Conforme & Data Privacy
                    Agreement, and I agree to be bound by its terms.
                  </span>
                </label>

                <button
                  type="button"
                  disabled={!agreed || saving}
                  onClick={handleAgree}
                  className="w-full inline-flex justify-center items-center rounded-full bg-[#1434A4] hover:bg-[#102a82] text-white text-sm font-bold py-4 shadow-lg shadow-blue-900/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98] uppercase tracking-widest"
                >
                  {saving ? 'Saving Acceptance...' : 'I Agree & Continue'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Brand panel */}
        <div className="hidden lg:flex w-1/2 bg-[#1434A4] items-center justify-center relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/10 rounded-full -ml-48 -mb-48 blur-3xl"></div>

          <div className="text-center z-10">
            <div className="inline-flex items-center justify-center mb-8">
              <div className="bg-white p-4 rounded-full shadow-2xl">
                <img
                  src={logo}
                  alt="DYCI Connect logo"
                  className="h-32 w-32 object-contain"
                />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-[0.2em] text-white uppercase">
                DYCI CONNECT
              </h1>
              <p className="text-sm text-blue-100/80 font-medium uppercase tracking-[0.1em]">
                User conforme & data privacy agreement
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Conforme
