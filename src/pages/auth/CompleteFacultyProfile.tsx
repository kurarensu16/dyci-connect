import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FaArrowLeft, FaUser, FaIdBadge, FaImage } from 'react-icons/fa'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import { getAuthProvider } from '../../utils/profileUtils'

const CompleteFacultyProfile: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    idNumber: '',
    nickname: '',
    department: '', // department_id (UUID)
  })

  const [departments, setDepartments] = useState<any[]>([])

  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null)
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [idFile, setIdFile] = useState<File | null>(null)
  const [idFileName, setIdFileName] = useState<string>('')

  const [submitting, setSubmitting] = useState(false)

  const pathname = location.pathname
  const isAcademicStep = pathname.endsWith('/academic')
  const isAccountStep = !isAcademicStep

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
  }, [user, navigate])

  useEffect(() => {
    const loadDepartments = async () => {
      if (!isSupabaseConfigured) return
      try {
        const { data, error } = await supabase
          .from('departments')
          .select('id, name')
          .order('name')

        if (!error && data) {
          setDepartments(data)
        } else if (error) {
          console.error('Error loading departments', error)
        }
      } catch (error) {
        console.error('Error loading departments', error)
      }
    }

    loadDepartments()
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }


  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setProfileImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setProfileImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveProfileImage = () => {
    setProfileImagePreview(null)
    setProfileImageFile(null)
  }

  const handleAccountNext = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('Please enter your first and last name.')
      return
    }
    if (!form.idNumber.trim()) {
      toast.error('Please enter your employee ID.')
      return
    }
    navigate('/complete-profile/staff/academic')
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !isSupabaseConfigured) return

    if (!form.nickname.trim()) {
      toast.error('Please enter a nickname.')
      return
    }
    if (!form.department.trim()) {
      toast.error('Please select your department.')
      return
    }

    setSubmitting(true)
    try {
      let avatarUrl: string | undefined

      if (idFile) {
        const userId = user.id
        const ext = idFile.name.split('.').pop() || 'pdf'
        const filePath = `cor/${userId}/${Date.now()}.${ext}`

        const { error: uploadError } = await (supabase as any).storage
          .from('user-docs')
          .upload(filePath, idFile)

        if (uploadError) {
          console.error('Error uploading employee ID to storage', uploadError)
          toast.error(
            'Uploading your employee ID failed. You can try again later or contact the administrator.'
          )
        } else {
          // idUrl = publicData.publicUrl
        }
      }

      if (profileImageFile) {
        const userId = user.id
        const ext = profileImageFile.name.split('.').pop() || 'jpg'
        const filePath = `avatars/${userId}/${Date.now()}.${ext}`

        const { error: avatarUploadError } = await (supabase as any).storage
          .from('user-docs')
          .upload(filePath, profileImageFile, {
            upsert: true,
            contentType: profileImageFile.type || undefined,
          })

        if (avatarUploadError) {
          console.error('Error uploading profile image to storage', avatarUploadError)
          toast.error(
            'Uploading your profile picture failed. You can try again later from your profile.'
          )
        } else {
          const { data: avatarPublicData } = (supabase as any).storage
            .from('user-docs')
            .getPublicUrl(filePath)
          avatarUrl = avatarPublicData.publicUrl
        }
      }

      const fullName = [form.firstName.trim(), form.middleName.trim(), form.lastName.trim()]
        .filter(Boolean)
        .join(' ')

      const authProvider = getAuthProvider(user)

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email ?? '',
        student_employee_id: form.idNumber.trim(),
        role: 'staff',
        auth_provider: authProvider,
        first_name: form.firstName.trim(),
        middle_name: form.middleName.trim() || null,
        last_name: form.lastName.trim(),
        nickname: form.nickname.trim(),
        avatar_url: avatarUrl,
        verified: false,
      })

      if (profileError) throw profileError

      // 2. Link to Department in Staff Sub-Profile
      const { error: staffError } = await supabase
        .from('staff_profiles')
        .update({
          department_id: form.department,
          office: 'Main Office', // Default or derived
        })
        .eq('profile_id', user.id)

      if (staffError) throw staffError

      if (profileError) {
        console.error('Error saving profile', profileError)
        toast.error('Failed to save your profile. Please try again later.')
        setSubmitting(false)
        return
      }

      await supabase.auth.updateUser({
        data: { role: 'staff', full_name: fullName },
      })

      toast.success('Profile submitted. Your account is pending administrator approval.')
      navigate('/staff/dashboard')
    } catch (error) {
      console.error('Error completing faculty profile', error)
      toast.error('Something went wrong while saving your profile.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
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
          onClick={() => navigate('/complete-profile')}
          className="mb-4 inline-flex items-center text-xs text-gray-500 hover:text-blue-600"
        >
          <FaArrowLeft className="mr-1 h-3 w-3" />
          Back
        </button>

        <h1 className="text-lg font-semibold text-slate-900">Complete your profile</h1>
        <p className="mt-1 text-sm text-slate-600">
          {isAccountStep && 'Add your school account details.'}
          {isAcademicStep &&
            'Add your academic information. An administrator will verify these details.'}
        </p>

        {isAccountStep && (
          <form className="mt-6 space-y-4" onSubmit={handleAccountNext}>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">Email</label>
              <p className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {user.email}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label htmlFor="firstName" className="block text-xs font-medium text-gray-700">
                  First name
                </label>
                <div className="mt-1 flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <FaUser className="h-4 w-4 text-slate-400 mr-2" />
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={form.firstName}
                    onChange={handleChange}
                    className="w-full border-0 bg-transparent text-sm text-slate-900 focus:outline-none"
                    placeholder="Juan"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="middleName" className="block text-xs font-medium text-gray-700">
                  Middle name
                </label>
                <div className="mt-1 flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <FaUser className="h-4 w-4 text-slate-400 mr-2" />
                  <input
                    id="middleName"
                    name="middleName"
                    type="text"
                    value={form.middleName}
                    onChange={handleChange}
                    className="w-full border-0 bg-transparent text-sm text-slate-900 focus:outline-none"
                    placeholder="Santos"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="lastName" className="block text-xs font-medium text-gray-700">
                  Last name
                </label>
                <div className="mt-1 flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <FaUser className="h-4 w-4 text-slate-400 mr-2" />
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={form.lastName}
                    onChange={handleChange}
                    className="w-full border-0 bg-transparent text-sm text-slate-900 focus:outline-none"
                    placeholder="Dela Cruz"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="idNumber" className="block text-xs font-medium text-gray-700">
                Employee ID
              </label>
              <div className="mt-1 flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                <FaIdBadge className="h-4 w-4 text-slate-400 mr-2" />
                <input
                  id="idNumber"
                  name="idNumber"
                  type="text"
                  value={form.idNumber}
                  onChange={handleChange}
                  className="w-full border-0 bg-transparent text-sm text-slate-900 focus:outline-none"
                  placeholder="e.g. 2024-0000"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/complete-profile')}
                className="flex-1 inline-flex justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 inline-flex justify-center rounded-2xl bg-[#1434A4] hover:bg-[#102a82] text-white text-sm font-semibold py-2.5 shadow-sm transition-colors"
              >
                Continue
              </button>
            </div>
          </form>
        )}


        {isAcademicStep && (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
              <h2 className="text-sm font-semibold text-gray-700">Academic info</h2>

              <div className="space-y-1">
                <span className="block text-xs font-medium text-gray-700">
                  Employee ID picture
                </span>
                <div className="mt-1 flex items-center space-x-3">
                  <label className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                    <span>Upload ID</span>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        setIdFile(file || null)
                        setIdFileName(file ? file.name : '')
                      }}
                    />
                  </label>
                  {idFileName && (
                    <span className="text-[11px] text-gray-600 truncate max-w-[160px]">
                      {idFileName}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-gray-500">
                  Upload a clear image or PDF of your DYCI employee ID for verification.
                </p>
              </div>

              <div className="space-y-1">
                <span className="block text-xs font-medium text-gray-700">
                  Profile picture
                </span>
                <div className="mt-1 flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                    {profileImagePreview ? (
                      <img
                        src={profileImagePreview}
                        alt="Profile preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <FaUser className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <FaImage className="h-3.5 w-3.5 mr-2 text-gray-400" />
                      <span>Upload photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleProfileImageChange}
                      />
                    </label>
                    <div className="mt-1 flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={handleRemoveProfileImage}
                        className="text-[11px] text-gray-500 hover:text-gray-700"
                      >
                        Skip for now
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-1">
                  <label
                    htmlFor="nickname"
                    className="block text-xs font-medium text-gray-700"
                  >
                    Nickname (for greetings & dashboard)
                  </label>
                  <input
                    id="nickname"
                    name="nickname"
                    type="text"
                    value={form.nickname}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. Sir Juan, Ma'am Ann"
                  />
                </div>
              </div>

              <div className="mt-2 space-y-1">
                <label
                  htmlFor="department"
                  className="block text-xs font-medium text-gray-700"
                >
                  Department
                </label>
                <select
                  id="department"
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select department</option>
                  {departments.length > 0 ? (
                    departments.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="College of Computer Studies">College of Computer Studies</option>
                      <option value="College of Education">College of Education</option>
                      <option value="College of Business Administration">College of Business Administration</option>
                      <option value="College of Health Sciences">College of Health Sciences</option>
                      <option value="Other">Other</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/complete-profile/staff/account')}
                className="flex-1 inline-flex justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 inline-flex justify-center rounded-2xl bg-[#1434A4] hover:bg-[#102a82] text-white text-sm font-semibold py-2.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Submitting…' : 'Submit for approval'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default CompleteFacultyProfile

