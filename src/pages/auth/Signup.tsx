import React, { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import { FaArrowLeft, FaUser, FaEnvelope, FaLock, FaIdBadge, FaImage } from 'react-icons/fa'
import logo from '../../assets/imgs/logo-connect.png'

interface SignupProps {
  defaultRole?: 'student' | 'faculty'
}

const Signup: React.FC<SignupProps> = ({ defaultRole = 'student' }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { signUp } = useAuth()

  const [form, setForm] = useState({
    email: '',
    idNumber: '',
    role: defaultRole,
    password: '',
    confirmPassword: '',
    firstName: '',
    middleName: '',
    lastName: '',
    nickname: '',
    address: '',
    region: '',
    province: '',
    city: '',
    barangay: '',
    program: '',
    department: '',
    yearLevel: '',
    section: '',
  })

  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null)
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [corFile, setCorFile] = useState<File | null>(null)
  const [corFileName, setCorFileName] = useState<string>('')
  const [touched, setTouched] = useState<{ [K in keyof typeof form]?: boolean }>({})
  const [submitting, setSubmitting] = useState(false)

  // Live PSGC data from https://psgc.cloud/api/
  const [regions, setRegions] = useState<any[]>([])
  const [provinces, setProvinces] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [barangays, setBarangays] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [yearLevels, setYearLevels] = useState<any[]>([])

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
    } catch (error) {
      console.error('Error loading PSGC provinces', error)
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
      const res = await fetch(`https://psgc.cloud/api/cities-municipalities/${value}/barangays`)
      if (!res.ok) {
        throw new Error(`Failed to load barangays: ${res.status}`)
      }
      const data = await res.json()
      setBarangays(data)
    } catch (error) {
      console.error('Error loading PSGC barangays', error)
    }
  }

  const passwordMismatch = useMemo(
    () =>
      touched.password &&
      touched.confirmPassword &&
      form.password.length > 0 &&
      form.confirmPassword.length > 0 &&
      form.password !== form.confirmPassword,
    [form.password, form.confirmPassword, touched.password, touched.confirmPassword]
  )

  const isSchoolAccountComplete =
    form.email.trim().length > 0

  const isSecurityComplete =
    form.password.length >= 8 &&
    form.confirmPassword.length >= 8 &&
    !passwordMismatch

  const isProfileStep = location.pathname.endsWith('/profile')
  const isAcademicStep = location.pathname.endsWith('/academic')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleBlur = (field: keyof typeof form) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
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

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()

    // Mark key fields as touched so validation messages appear
    setTouched((prev) => ({
      ...prev,
      email: true,
      password: true,
      confirmPassword: true,
    }))

    if (!isSchoolAccountComplete || !isSecurityComplete) {
      return
    }

    const basePath = location.pathname.startsWith('/signup/faculty')
      ? '/signup/faculty'
      : location.pathname.startsWith('/signup/student')
        ? '/signup/student'
        : '/signup'

    navigate(`${basePath}/profile`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Basic client-side guard: ensure email & password are valid
    setTouched((prev) => ({
      ...prev,
      email: true,
      password: true,
      confirmPassword: true,
    }))

    if (!isSchoolAccountComplete || !isSecurityComplete) {
      toast.error('Please complete your school account and password first.')
      return
    }

    const role = form.role || defaultRole
    const fullName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ')

    setSubmitting(true)

    try {
      const { data, error } = await signUp(form.email, form.password, role, {
        full_name: fullName,
        first_name: form.firstName,
        middle_name: form.middleName,
        last_name: form.lastName,
        nickname: form.nickname,
        student_employee_id: form.idNumber,
        address: form.address,
        region: form.region,
        province: form.province,
        city: form.city,
        barangay: form.barangay,
        program: form.program,
        department: form.department,
        year_level: form.yearLevel,
        section: form.section,
      })

      if (error) {
        throw error
      }

      let corUrl: string | undefined
      let avatarUrl: string | undefined

      // If a COR / ID file was uploaded, store it in Supabase Storage and save the URL
      if (isSupabaseConfigured && corFile && (data as any)?.user?.id) {
        const userId = (data as any).user.id as string
        const ext = corFile.name.split('.').pop() || 'pdf'
        const filePath = `cor/${userId}/${Date.now()}.${ext}`

        const { error: uploadError } = await (supabase as any).storage
          .from('user-docs')
          .upload(filePath, corFile)

        if (uploadError) {
          console.error('Error uploading COR / ID to storage', uploadError)
          toast.error(
            'Your account was created, but uploading your COR / ID failed. You may be asked to re-upload later.'
          )
        } else {
          const { data: publicData } = (supabase as any).storage
            .from('user-docs')
            .getPublicUrl(filePath)
          corUrl = publicData.publicUrl
        }
      }

      // If a profile image was uploaded, store it in Supabase Storage and save the URL
      if (isSupabaseConfigured && profileImageFile && (data as any)?.user?.id) {
        const userId = (data as any).user.id as string
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
            'Your account was created, but uploading your profile picture failed. You can try updating it later.'
          )
        } else {
          const { data: avatarPublicData } = (supabase as any).storage
            .from('user-docs')
            .getPublicUrl(filePath)
          avatarUrl = avatarPublicData.publicUrl
        }
      }

      // Also create / update the row in public.profiles so the admin view can see this user
      if (isSupabaseConfigured && (data as any)?.user) {
        const user = (data as any).user as { id: string }

        const { error: profileError } = await supabase.from('profiles').upsert({
          id: user.id,
          email: form.email,
          student_employee_id: form.idNumber,
          role,
          first_name: form.firstName,
          middle_name: form.middleName,
          last_name: form.lastName,
          nickname: form.nickname,
          address: form.address,
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
        })

        if (profileError) {
          console.error('Error saving profile', profileError)
          toast.error('Your account was created, but saving your profile failed. Please contact the administrator.')
          return
        }
      }

      toast.success(
        'Account created. Please check your @dyci.edu.ph email to confirm your account, then wait for an administrator to verify you.'
      )

      // After signup, sign the user out and send them back to login.
      // They won't be able to access content until an admin verifies them.
      if (isSupabaseConfigured) {
        try {
          await supabase.auth.signOut()
        } catch {
          // ignore
        }
      }

      navigate('/login')
    } catch (error: any) {
      console.error('Signup error', error)
      const msg = error?.message
      const isRetryableFetch = error?.name === 'AuthRetryableFetchError' || msg === 'AuthRetryableFetchError'
      if (isRetryableFetch) {
        toast.error(
          'Unable to reach the server. Check your connection and try again. If the problem continues, try again later.'
        )
      } else {
        toast.error(msg || 'Failed to create your account.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <div className="flex w-full flex-col lg:flex-row">
        {/* Left column: card with form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-8 lg:px-12 py-8 lg:py-12">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl px-6 sm:px-8 py-6 sm:py-8">
            {/* Back button */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mb-3 inline-flex items-center text-xs text-gray-500 hover:text-blue-600"
            >
              <FaArrowLeft className="mr-1 h-3 w-3" />
              Back to home
            </button>

            {/* <div className="flex flex-col items-center text-center mb-8">
              <h1 className="text-sm font-semibold tracking-[0.2em] text-blue-900">
                DYCI CONNECT
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Create your DYCI Connect account
              </p>
            </div> */}

            {!isProfileStep && !isAcademicStep && (
            <form className="space-y-6 text-sm" onSubmit={handleNext}>
                {/* School account details */}
                <div className="space-y-4">
                  <h2 className="text-sm font-semibold text-gray-700">
                    School account details
                  </h2>

                  <div className="space-y-1">
                    <label
                      htmlFor="email"
                      className="block text-xs font-medium text-gray-700"
                    >
                      Email address
                    </label>
                    <div className="mt-1 flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                      <FaEnvelope className="h-4 w-4 text-gray-400 mr-3" />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={form.email}
                        onChange={handleChange}
                        onBlur={() => handleBlur('email')}
                        className="w-full border-0 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
                        placeholder="you@example.com"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500">
                      DYCI emails (e.g. <span className="font-semibold">name@dyci.edu.ph</span>) are preferred,
                      but other emails are also accepted.
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <label
                        htmlFor="idNumber"
                        className="block text-xs font-medium text-gray-700"
                      >
                        {form.role === 'faculty' ? 'Employee ID' : 'Student ID'}
                      </label>
                      <div className="mt-1 flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                        <FaIdBadge className="h-4 w-4 text-gray-400 mr-3" />
                        <input
                          id="idNumber"
                          name="idNumber"
                          type="text"
                          value={form.idNumber}
                          onChange={handleChange}
                          onBlur={() => handleBlur('idNumber')}
                          className="w-full border-0 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
                          placeholder="e.g. 2024-0000"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account security */}
                <div className="space-y-4">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Account security
                  </h2>

                  <div className="space-y-1">
                    <label
                      htmlFor="password"
                      className="block text-xs font-medium text-gray-700"
                    >
                      Password
                    </label>
                    <div className="mt-1 flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                      <FaLock className="h-4 w-4 text-gray-400 mr-3" />
                      <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        value={form.password}
                        onChange={handleChange}
                        onBlur={() => handleBlur('password')}
                        className="w-full border-0 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
                        placeholder="Choose a strong password"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500">
                      At least 8 characters, include a number and a letter.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="confirmPassword"
                      className="block text-xs font-medium text-gray-700"
                    >
                      Confirm password
                    </label>
                    <div
                      className={`mt-1 flex items-center rounded-xl border px-3 py-2 bg-gray-50 focus-within:ring-1 ${
                        passwordMismatch
                          ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-500'
                          : 'border-gray-200 focus-within:border-blue-500 focus-within:ring-blue-500'
                      }`}
                    >
                      <FaLock
                        className={`h-4 w-4 mr-3 ${
                          passwordMismatch ? 'text-red-400' : 'text-gray-400'
                        }`}
                      />
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                        value={form.confirmPassword}
                        onChange={handleChange}
                        onBlur={() => handleBlur('confirmPassword')}
                        className="w-full border-0 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
                        placeholder="Re-enter your password"
                      />
                    </div>
                    <div className="mt-1 flex flex-col space-y-0.5">
                      {passwordMismatch && (
                        <p className="text-[11px] text-red-500">
                          Passwords do not match.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 space-y-3">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold py-3 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Continue
                  </button>
                  <p className="text-xs text-center text-gray-500">
                    Already have an account?{' '}
                    <Link
                      to="/login"
                      className="font-semibold text-blue-600 hover:text-blue-500"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </form>
            )}

            {isProfileStep && !isAcademicStep && (
              <form
                className="space-y-6 text-sm"
                onSubmit={(e) => {
                  e.preventDefault()
                  const basePath = location.pathname.startsWith('/signup/faculty')
                    ? '/signup/faculty'
                    : location.pathname.startsWith('/signup/student')
                      ? '/signup/student'
                      : '/signup'
                  navigate(`${basePath}/academic`)
                }}
              >
                {/* Personal info */}
                <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Personal info
                  </h2>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label
                        htmlFor="firstName"
                        className="block text-xs font-medium text-gray-700"
                      >
                        First name
                      </label>
                      <div className="mt-1 flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                        <FaUser className="h-4 w-4 text-gray-400 mr-3" />
                        <input
                          id="firstName"
                          name="firstName"
                          type="text"
                          required
                          value={form.firstName}
                          onChange={handleChange}
                          onBlur={() => handleBlur('firstName')}
                          className="w-full border-0 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
                          placeholder="Juan"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="middleName"
                        className="block text-xs font-medium text-gray-700"
                      >
                        Middle name
                      </label>
                      <div className="mt-1 flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                        <FaUser className="h-4 w-4 text-gray-400 mr-3" />
                        <input
                          id="middleName"
                          name="middleName"
                          type="text"
                          value={form.middleName}
                          onChange={handleChange}
                          onBlur={() => handleBlur('middleName')}
                          className="w-full border-0 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
                          placeholder="Santos"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="lastName"
                        className="block text-xs font-medium text-gray-700"
                      >
                        Last name
                      </label>
                      <div className="mt-1 flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                        <FaUser className="h-4 w-4 text-gray-400 mr-3" />
                        <input
                          id="lastName"
                          name="lastName"
                          type="text"
                          required
                          value={form.lastName}
                          onChange={handleChange}
                          onBlur={() => handleBlur('lastName')}
                          className="w-full border-0 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
                          placeholder="Dela Cruz"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1">
                    <span className="block text-xs font-medium text-gray-700">
                      Address
                    </span>

                    <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Region */}
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

                      {/* Province */}
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
                          disabled={!form.region}
                          className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">
                            {form.region ? 'Select province' : 'Select region first'}
                          </option>
                          {provinces.map((p: any) => (
                            <option key={p.code} value={p.code}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* City / Municipality */}
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
                          disabled={!form.province}
                          className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">
                            {form.province ? 'Select city / municipality' : 'Select province first'}
                          </option>
                          {cities.map((c: any) => (
                            <option key={c.code} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Barangay */}
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

                    {/* Street / House number */}
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
                        onBlur={() => handleBlur('address')}
                        className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g. 123 Sampaguita St., Brgy. Sample"
                      />
                    </div>

                    {/* <p className="mt-1 text-[11px] text-gray-500">
                      Using Philippine Standard Geographic Code (PSGC) structure: Region → Province → City /
                      Municipality → Barangay.
                    </p> */}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:space-x-3 sm:space-y-0 space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        const basePath = location.pathname.startsWith('/signup/faculty')
                          ? '/signup/faculty'
                          : '/signup/student'
                        navigate(basePath)
                      }}
                      className="w-full inline-flex justify-center rounded-xl border border-gray-300 bg-white text-sm font-medium py-3 text-gray-700 hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold py-3 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                  <p className="text-xs text-center text-gray-500">
                    Already have an account?{' '}
                    <Link
                      to="/login"
                      className="font-semibold text-blue-600 hover:text-blue-500"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </form>
            )}

            {isAcademicStep && (
              <form className="space-y-6 text-sm" onSubmit={handleSubmit}>
                {/* Academic info */}
                <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Academic info
                  </h2>

                  <div className="space-y-1">
                    <span className="block text-xs font-medium text-gray-700">
                      {form.role === 'faculty'
                        ? 'Employee ID picture'
                        : 'Certificate of Registration (COR)'}
                    </span>
                    <div className="mt-1 flex items-center space-x-3">
                      <label className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                        <span>
                          {form.role === 'faculty' ? 'Upload ID' : 'Upload COR'}
                        </span>
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
                      {form.role === 'faculty'
                        ? 'Upload a clear image or PDF of your DYCI employee ID for verification.'
                        : 'Upload your latest DYCI Certificate of Registration (PDF or clear image). This may be required later for verification.'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="block text-xs font-medium text-gray-700">
                      Profile picture
                    </span>
                    <div className="mt-1 flex items-center space-x-3">
                      <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                        {profileImagePreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
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
                        required
                        value={form.nickname}
                        onChange={handleChange}
                        onBlur={() => handleBlur('nickname')}
                        className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g. Juan, CJ, Ate Ann"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-gray-500">
                      If you skip, we&apos;ll use your initials on the dashboard.
                    </p>
                  </div>

                  {form.role === 'student' ? (
                    <>
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
                          onBlur={() => handleBlur('department')}
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
                          onBlur={() => handleBlur('program')}
                          className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Select program</option>
                          {departments.length > 0 && programs.length > 0 && form.department
                            ? programs
                                .filter(
                                  (p: any) =>
                                    departments.find(
                                      (d: any) =>
                                        d.id === p.department_id && d.name === form.department
                                    )
                                )
                                .map((p: any) => (
                                  <option key={p.id} value={p.short_code || p.name}>
                                    {p.name}
                                  </option>
                                ))
                            : (
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
                            onBlur={() => handleBlur('yearLevel')}
                            className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Select year level</option>
                            {yearLevels.length > 0
                              ? yearLevels.map((y: any) => (
                                  <option key={y.id} value={y.label}>
                                    {y.label}
                                  </option>
                                ))
                              : (
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
                            onBlur={() => handleBlur('section')}
                            className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="e.g. A"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
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
                        onBlur={() => handleBlur('department')}
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
                  )}
                </div>

                {/* Actions */}
                <div className="pt-2 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:space-x-3 sm:space-y-0 space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        const basePath = location.pathname.startsWith('/signup/faculty')
                          ? '/signup/faculty'
                          : '/signup/student'
                        navigate(`${basePath}/profile`)
                      }}
                      className="w-full inline-flex justify-center rounded-xl border border-gray-300 bg-white text-sm font-medium py-3 text-gray-700 hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full inline-flex justify-center rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-sm font-semibold py-3 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {submitting ? 'Creating account…' : 'Create account'}
                    </button>
                  </div>
                  <p className="text-xs text-center text-gray-500">
                    Already have an account?{' '}
                    <Link
                      to="/login"
                      className="font-semibold text-blue-600 hover:text-blue-500"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right column: brand panel */}
        <div className="hidden lg:flex w-full lg:w-1/2 bg-[#1434A4] items-center justify-center">
          <div className="text-center px-8">
            <div className="inline-flex items-center justify-center mb-4">
              <img
                src={logo}
                alt="DYCI Connect logo"
                className="h-32 w-32 object-contain rounded-full border-4 border-white shadow-xl"
              />
            </div>
            <h1 className="text-sm font-semibold tracking-[0.2em] text-blue-100">
              DYCI CONNECT
            </h1>
            <p className="mt-2 text-sm text-blue-100">
              Create your DYCI Connect account
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Signup

