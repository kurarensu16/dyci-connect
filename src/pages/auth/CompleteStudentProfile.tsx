import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FaArrowLeft, FaUser, FaIdBadge, FaImage } from 'react-icons/fa'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'

const CompleteStudentProfile: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    idNumber: '',
    address: '',
    region: '',
    province: '',
    city: '',
    barangay: '',
    nickname: '',
    department: '',
    program: '',
    yearLevel: '',
    section: '',
  })

  const [regions, setRegions] = useState<any[]>([])
  const [provinces, setProvinces] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [barangays, setBarangays] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [yearLevels, setYearLevels] = useState<any[]>([])

  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null)
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [corFile, setCorFile] = useState<File | null>(null)
  const [corFileName, setCorFileName] = useState<string>('')

  const [submitting, setSubmitting] = useState(false)

  const pathname = location.pathname
  const isAddressStep = pathname.endsWith('/address')
  const isAcademicStep = pathname.endsWith('/academic')
  const isAccountStep = !isAddressStep && !isAcademicStep

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
  }, [user, navigate])

  useEffect(() => {
    const loadRegions = async () => {
      try {
        const res = await fetch('https://psgc.cloud/api/regions')
        if (!res.ok) {
          throw new Error(`Failed to load regions: ${res.status}`)
        }
        const data = await res.json()
        setRegions(data)
      } catch (error) {
        console.error('Error loading PSGC regions', error)
      }
    }

    const loadAcademicLookups = async () => {
      if (!isSupabaseConfigured) return
      try {
        const [deptRes, progRes, yearRes] = await Promise.all([
          supabase.from('departments').select('id, name').order('name'),
          supabase
            .from('programs')
            .select('id, name, short_code, department_id')
            .order('name'),
          supabase
            .from('year_levels')
            .select('id, label, sort_order')
            .order('sort_order'),
        ])

        if (!deptRes.error && deptRes.data) {
          setDepartments(deptRes.data)
        } else if (deptRes.error) {
          console.error('Error loading departments', deptRes.error)
        }

        if (!progRes.error && progRes.data) {
          setPrograms(progRes.data)
        } else if (progRes.error) {
          console.error('Error loading programs', progRes.error)
        }

        if (!yearRes.error && yearRes.data) {
          setYearLevels(yearRes.data)
        } else if (yearRes.error) {
          console.error('Error loading year levels', yearRes.error)
        }
      } catch (error) {
        console.error('Error loading academic lookups', error)
      }
    }

    loadRegions()
    loadAcademicLookups()
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleRegionChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value

    setForm((prev) => ({
      ...prev,
      region: value,
      province: '',
      city: '',
      barangay: '',
    }))
    setProvinces([])
    setCities([])
    setBarangays([])

    if (!value) {
      return
    }

    try {
      const res = await fetch(`https://psgc.cloud/api/regions/${value}/provinces`)
      if (!res.ok) {
        throw new Error(`Failed to load provinces: ${res.status}`)
      }
      const data = await res.json()
      setProvinces(data)

      // Some regions (e.g. NCR) have no provinces; load cities directly from the region.
      if (Array.isArray(data) && data.length === 0) {
        const cityRes = await fetch(
          `https://psgc.cloud/api/regions/${value}/cities-municipalities`
        )
        if (!cityRes.ok) {
          throw new Error(`Failed to load cities: ${cityRes.status}`)
        }
        const cityData = await cityRes.json()
        setCities(cityData)
      }
    } catch (error) {
      console.error('Error loading PSGC provinces / cities', error)
    }
  }

  const handleProvinceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value

    setForm((prev) => ({
      ...prev,
      province: value,
      city: '',
      barangay: '',
    }))
    setCities([])
    setBarangays([])

    if (!value) {
      return
    }

    try {
      const res = await fetch(`https://psgc.cloud/api/provinces/${value}/cities-municipalities`)
      if (!res.ok) {
        throw new Error(`Failed to load cities: ${res.status}`)
      }
      const data = await res.json()
      setCities(data)
    } catch (error) {
      console.error('Error loading PSGC cities/municipalities', error)
    }
  }

  const handleCityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value

    setForm((prev) => ({
      ...prev,
      city: value,
      barangay: '',
    }))
    setBarangays([])

    if (!value) {
      return
    }

    try {
      const res = await fetch(
        `https://psgc.cloud/api/cities-municipalities/${value}/barangays`
      )
      if (!res.ok) {
        throw new Error(`Failed to load barangays: ${res.status}`)
      }
      const data = await res.json()
      setBarangays(data)
    } catch (error) {
      console.error('Error loading PSGC barangays', error)
    }
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
      toast.error('Please enter your student ID.')
      return
    }
    navigate('/complete-profile/student/address')
  }

  const handleAddressNext = (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !form.region ||
      !form.city ||
      !form.barangay ||
      (provinces.length > 0 && !form.province)
    ) {
      toast.error('Please complete your address.')
      return
    }
    if (!form.address.trim()) {
      toast.error('Please enter your street / house number.')
      return
    }
    navigate('/complete-profile/student/academic')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !isSupabaseConfigured) return

    if (!form.nickname.trim()) {
      toast.error('Please enter a nickname.')
      return
    }
    if (!form.department.trim() || !form.program.trim() || !form.yearLevel.trim()) {
      toast.error('Please complete your academic info.')
      return
    }

    setSubmitting(true)
    try {
      let corUrl: string | undefined
      let avatarUrl: string | undefined

      if (corFile) {
        const userId = user.id
        const ext = corFile.name.split('.').pop() || 'pdf'
        const filePath = `cor/${userId}/${Date.now()}.${ext}`

        const { error: uploadError } = await (supabase as any).storage
          .from('user-docs')
          .upload(filePath, corFile)

        if (uploadError) {
          console.error('Error uploading COR to storage', uploadError)
          toast.error(
            'Uploading your COR failed. You can try again later or contact the administrator.'
          )
        } else {
          const { data: publicData } = (supabase as any).storage
            .from('user-docs')
            .getPublicUrl(filePath)
          corUrl = publicData.publicUrl
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

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email ?? '',
        student_employee_id: form.idNumber.trim(),
        role: 'student',
        first_name: form.firstName.trim(),
        middle_name: form.middleName.trim() || null,
        last_name: form.lastName.trim(),
        nickname: form.nickname.trim(),
        address: form.address.trim(),
        region: form.region,
        province: form.province,
        city: form.city,
        barangay: form.barangay,
        program: form.program,
        department: form.department,
        year_level: form.yearLevel,
        section: form.section,
        avatar_url: avatarUrl,
        cor_url: corUrl,
        verified: false,
      })

      if (profileError) {
        console.error('Error saving profile', profileError)
        toast.error('Failed to save your profile. Please try again later.')
        setSubmitting(false)
        return
      }

      await supabase.auth.updateUser({
        data: { role: 'student', full_name: fullName },
      })

      toast.success('Profile submitted. Your account is pending administrator approval.')
      navigate('/student/dashboard')
    } catch (error) {
      console.error('Error completing student profile', error)
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
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl px-6 sm:px-8 py-6 sm:py-8">
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
          {isAddressStep && 'Add your address information.'}
          {isAcademicStep &&
            'Add your academic information. An administrator will verify these details.'}
        </p>

        {isAccountStep && (
          <form className="mt-6 space-y-4" onSubmit={handleAccountNext}>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">Email</label>
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {user.email}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label htmlFor="firstName" className="block text-xs font-medium text-gray-700">
                  First name
                </label>
                <div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
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
                <div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
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
                <div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
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
                Student ID
              </label>
              <div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
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
                className="flex-1 inline-flex justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 inline-flex justify-center rounded-xl bg-[#1434A4] hover:bg-[#102a82] text-white text-sm font-semibold py-2.5 shadow-sm transition-colors"
              >
                Continue
              </button>
            </div>
          </form>
        )}

        {isAddressStep && (
          <form className="mt-6 space-y-4" onSubmit={handleAddressNext}>
            <div className="mt-1 space-y-1">
              <span className="block text-xs font-medium text-gray-700">Address</span>

              <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="region"
                    className="block text-[11px] font-medium text-gray-600"
                  >
                    Region
                  </label>
                  <select
                    id="region"
                    name="region"
                    value={form.region}
                    onChange={handleRegionChange}
                    className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select region</option>
                    {regions.map((r: any) => (
                      <option key={r.code} value={r.code}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="province"
                    className="block text-[11px] font-medium text-gray-600"
                  >
                    Province
                  </label>
                  <select
                    id="province"
                    name="province"
                    value={form.province}
                    onChange={handleProvinceChange}
                    disabled={!form.region || provinces.length === 0}
                    className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">
                      {!form.region
                        ? 'Select region first'
                        : provinces.length === 0
                          ? 'No provinces for this region'
                          : 'Select province'}
                    </option>
                    {provinces.map((p: any) => (
                      <option key={p.code} value={p.code}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="city"
                    className="block text-[11px] font-medium text-gray-600"
                  >
                    City / Municipality
                  </label>
                  <select
                    id="city"
                    name="city"
                    value={form.city}
                    onChange={handleCityChange}
                    disabled={!form.region || (provinces.length > 0 && !form.province)}
                    className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">
                      {!form.region
                        ? 'Select region first'
                        : provinces.length > 0 && !form.province
                          ? 'Select province first'
                          : 'Select city / municipality'}
                    </option>
                    {cities.map((c: any) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="barangay"
                    className="block text-[11px] font-medium text-gray-600"
                  >
                    Barangay
                  </label>
                  <select
                    id="barangay"
                    name="barangay"
                    value={form.barangay}
                    onChange={handleChange}
                    disabled={!form.city}
                    className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">
                      {form.city ? 'Select barangay' : 'Select city / municipality first'}
                    </option>
                    {barangays.map((b: any) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="address"
                  className="block text-[11px] font-medium text-gray-600"
                >
                  Street / House number
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  value={form.address}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. 123 Sampaguita St., Brgy. Sample"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/complete-profile/student/account')}
                className="flex-1 inline-flex justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 inline-flex justify-center rounded-xl bg-[#1434A4] hover:bg-[#102a82] text-white text-sm font-semibold py-2.5 shadow-sm transition-colors"
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
                  Certificate of Registration (COR)
                </span>
                <div className="mt-1 flex items-center space-x-3">
                  <label className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                    <span>Upload COR</span>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        setCorFile(file || null)
                        setCorFileName(file ? file.name : '')
                      }}
                    />
                  </label>
                  {corFileName && (
                    <span className="text-[11px] text-gray-600 truncate max-w-[160px]">
                      {corFileName}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-gray-500">
                  Upload your latest DYCI Certificate of Registration (PDF or clear image).
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
                    className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. Juan, CJ, Ate Ann"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="space-y-1">
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
                    className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select department</option>
                    {departments.length > 0 ? (
                      departments.map((d: any) => (
                        <option key={d.id} value={d.name}>
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

                <div className="space-y-1">
                  <label
                    htmlFor="program"
                    className="block text-xs font-medium text-gray-700"
                  >
                    Program
                  </label>
                  <select
                    id="program"
                    name="program"
                    value={form.program}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select program</option>
                    {departments.length > 0 && programs.length > 0 && form.department ? (
                      programs
                        .filter((p: any) =>
                          departments.find(
                            (d: any) => d.id === p.department_id && d.name === form.department
                          )
                        )
                        .map((p: any) => (
                          <option key={p.id} value={p.short_code || p.name}>
                            {p.name}
                          </option>
                        ))
                    ) : (
                      <>
                        <option value="BSIT">BSIT</option>
                        <option value="BSCS">BSCS</option>
                        <option value="BSEd">BSEd</option>
                        <option value="BSA">BSA</option>
                        <option value="Other">Other</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label
                    htmlFor="yearLevel"
                    className="block text-xs font-medium text-gray-700"
                  >
                    Year level
                  </label>
                  <select
                    id="yearLevel"
                    name="yearLevel"
                    value={form.yearLevel}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select year level</option>
                    {yearLevels.length > 0 ? (
                      yearLevels.map((y: any) => (
                        <option key={y.id} value={y.label}>
                          {y.label}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                        <option value="Graduate">Graduate</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="section"
                    className="block text-xs font-medium text-gray-700"
                  >
                    Section
                  </label>
                  <input
                    id="section"
                    name="section"
                    type="text"
                    value={form.section}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. A"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/complete-profile/student/address')}
                className="flex-1 inline-flex justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 inline-flex justify-center rounded-xl bg-[#1434A4] hover:bg-[#102a82] text-white text-sm font-semibold py-2.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

export default CompleteStudentProfile

