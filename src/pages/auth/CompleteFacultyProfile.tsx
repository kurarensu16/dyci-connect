import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FaUser, FaCamera } from 'react-icons/fa'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import { getAuthProvider } from '../../utils/profileUtils'

const CompleteFacultyProfile: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    idNumber: '',
    nickname: '',
  })

  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null)
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
  }, [user, navigate])


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
    reader.onloadend = () => setProfileImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !isSupabaseConfigured) return

    if (!form.firstName.trim() || !form.lastName.trim()) return toast.error('Name is required.')
    if (!form.idNumber.trim()) return toast.error('Employee ID is required.')

    setSubmitting(true)
    try {
      let avatarUrl: string | undefined

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

        if (!avatarUploadError) {
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

      // Aligned with Profile.tsx update logic: uses .update() instead of .upsert()
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: form.firstName.trim(),
          middle_name: form.middleName.trim() || null,
          last_name: form.lastName.trim(),
          nickname: form.nickname.trim(),
          student_employee_id: form.idNumber.trim(),
          avatar_url: avatarUrl,
          profile_complete: true,
          // Note: role, email, verified are typically preserved from provisioning
        })
        .eq('id', user.id)
      
      if (profileError) throw profileError

      // Department is already set during user creation (provisioning)
      const { error: staffError } = await supabase
        .from('staff_profiles')
        .update({ office: 'Main Office' })
        .eq('profile_id', user.id)
      if (staffError) throw staffError

      try {
        await supabase.auth.updateUser({
          data: { role: 'staff', full_name: fullName },
        })
      } catch (authError) {
        console.warn('Auth metadata update failed (403), but database was saved.', authError)
      }

      toast.success('Profile saved successfully!')
      navigate('/staff/dashboard')
    } catch (error) {
      console.error('Error completing faculty profile', error)
      toast.error('Failed to save profile. Please check your connection.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-8">
          <div className="text-center sm:text-left">
            <h1 className="text-xl font-bold text-slate-900">Complete Your Profile</h1>
          </div>

          <div className="flex flex-col items-center space-y-6">
            <div className="relative">
              <div className="h-28 w-28 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-sm">
                {profileImagePreview ? (
                  <img src={profileImagePreview} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <FaUser className="h-12 w-12 text-slate-300" />
                )}
              </div>
              <label className="absolute bottom-1 right-1 h-8 w-8 bg-[#1434A4] rounded-full flex items-center justify-center cursor-pointer border-2 border-white shadow-sm hover:bg-[#102a82] transition-colors">
                <FaCamera className="h-3.5 w-3.5 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleProfileImageChange} />
              </label>
            </div>

            <div className="w-full space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">First name</label>
                  <input
                    name="firstName" value={form.firstName} onChange={handleChange}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all text-sm"
                    placeholder="First name" required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Middle name</label>
                  <input
                    name="middleName" value={form.middleName} onChange={handleChange}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all text-sm"
                    placeholder="Middle name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Last name</label>
                  <input
                    name="lastName" value={form.lastName} onChange={handleChange}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all text-sm"
                    placeholder="Last name" required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Employee ID</label>
                  <input
                    name="idNumber" value={form.idNumber} onChange={handleChange}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all text-sm"
                    placeholder="e.g. 2024-0000" required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider ml-1">Nickname</label>
                  <input
                    name="nickname" value={form.nickname} onChange={handleChange}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-[#1434A4] focus:ring-1 focus:ring-[#1434A4] outline-none transition-all text-sm"
                    placeholder="Nickname"
                  />
                </div>
              </div>

            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="submit" disabled={submitting}
              className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-[#1434A4] text-white text-sm font-bold shadow-lg shadow-blue-900/20 hover:bg-[#102a82] disabled:opacity-50 transition-all"
            >
              {submitting ? 'Saving...' : 'Finalize Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CompleteFacultyProfile
