import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'

const StudentProfile: React.FC = () => {
  const { user } = useAuth()
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    nickname: '',
    address: '',
    region: '',
    barangay: '',
    city: '',
    province: '',
    studentId: '',
    program: '',
    department: '',
    yearLevel: '',
    section: '',
  })
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [regions, setRegions] = useState<any[]>([])
  const [provinces, setProvinces] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [barangays, setBarangays] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [yearLevels, setYearLevels] = useState<any[]>([])
  const [locationNames, setLocationNames] = useState<{
    barangay?: string
    city?: string
    province?: string
  }>({})

  useEffect(() => {
    const loadProfile = async () => {
      if (!isSupabaseConfigured || !user?.id) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Error loading student profile', error)
        setError('Failed to load your profile. Please try again later.')
      } else {
        setProfile(data)
        // Load human-readable PSGC names for display
        if (data) {
          loadLocationNames(data)
        }
      }

      setLoading(false)
    }

    loadProfile()
  }, [user?.id])

  const loadLocationNames = async (profileData: any) => {
    if (!profileData) {
      setLocationNames({})
      return
    }

    const { province, city, barangay } = profileData

    if (!province && !city && !barangay) {
      setLocationNames({})
      return
    }

    try {
      const [provinceRes, cityRes, barangayRes] = await Promise.all([
        province
          ? fetch(`https://psgc.cloud/api/provinces/${province}`).catch(() => null)
          : null,
        city
          ? fetch(
              `https://psgc.cloud/api/cities-municipalities/${city}`
            ).catch(() => null)
          : null,
        barangay
          ? fetch(`https://psgc.cloud/api/barangays/${barangay}`).catch(() => null)
          : null,
      ])

      let provinceName: string | undefined
      let cityName: string | undefined
      let barangayName: string | undefined

      if (provinceRes && provinceRes.ok) {
        const p = await provinceRes.json()
        provinceName = p?.name
      }

      if (cityRes && cityRes.ok) {
        const c = await cityRes.json()
        cityName = c?.name
      }

      if (barangayRes && barangayRes.ok) {
        const b = await barangayRes.json()
        barangayName = b?.name
      }

      setLocationNames({
        province: provinceName,
        city: cityName,
        barangay: barangayName,
      })
    } catch (err) {
      console.error('Error loading PSGC names for profile display', err)
    }
  }

  // Load PSGC regions once
  useEffect(() => {
    const loadRegions = async () => {
      try {
        const res = await fetch('https://psgc.cloud/api/regions')
        if (!res.ok) {
          throw new Error(`Failed to load regions: ${res.status}`)
        }
        const data = await res.json()
        setRegions(data)
      } catch (err) {
        console.error('Error loading PSGC regions for profile edit', err)
      }
    }

    loadRegions()
  }, [])

  // Load academic lookups (departments, programs, year levels) similar to signup
  useEffect(() => {
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
          console.error('Error loading departments for profile edit', deptRes.error)
        }

        if (!progRes.error && progRes.data) {
          setPrograms(progRes.data)
        } else if (progRes.error) {
          console.error('Error loading programs for profile edit', progRes.error)
        }

        if (!yearRes.error && yearRes.data) {
          setYearLevels(yearRes.data)
        } else if (yearRes.error) {
          console.error('Error loading year levels for profile edit', yearRes.error)
        }
      } catch (err) {
        console.error('Error loading academic lookups for profile edit', err)
      }
    }

    loadAcademicLookups()
  }, [])

  // When opening the edit modal, prefetch PSGC data for existing selection
  useEffect(() => {
    if (!editOpen || !profile) return

    const prefill = async () => {
      try {
        if (profile.region) {
          const provRes = await fetch(
            `https://psgc.cloud/api/regions/${profile.region}/provinces`
          )
          if (provRes.ok) {
            const provData = await provRes.json()
            setProvinces(provData)
          }
        }

        if (profile.province) {
          const cityRes = await fetch(
            `https://psgc.cloud/api/provinces/${profile.province}/cities-municipalities`
          )
          if (cityRes.ok) {
            const cityData = await cityRes.json()
            setCities(cityData)
          }
        }

        if (profile.city) {
          const brgyRes = await fetch(
            `https://psgc.cloud/api/cities-municipalities/${profile.city}/barangays`
          )
          if (brgyRes.ok) {
            const brgyData = await brgyRes.json()
            setBarangays(brgyData)
          }
        }
      } catch (err) {
        console.error('Error preloading PSGC data for profile edit', err)
      }
    }

    prefill()
  }, [editOpen, profile])

  const fullName =
    profile?.first_name || profile?.last_name
      ? [profile?.first_name, profile?.middle_name, profile?.last_name].filter(Boolean).join(' ')
      : (user?.user_metadata?.full_name as string | undefined) || 'Student'

  const roleLabel = (user?.user_metadata?.role as string | undefined) || 'student'
  const roleDisplay =
    roleLabel === 'faculty' ? 'Faculty' : roleLabel === 'admin' ? 'Admin' : 'Student'

  const verified = profile?.verified === true

  const openEditProfile = () => {
    if (!user?.id) {
      return
    }

    setEditForm({
      firstName: profile?.first_name || '',
      middleName: profile?.middle_name || '',
      lastName: profile?.last_name || '',
      nickname: profile?.nickname || '',
      address: profile?.address || '',
      region: profile?.region || '',
      barangay: profile?.barangay || '',
      city: profile?.city || '',
      province: profile?.province || '',
      studentId: profile?.student_employee_id || '',
      program: profile?.program || '',
      department: profile?.department || '',
      yearLevel: profile?.year_level || '',
      section: profile?.section || '',
    })
    setEditOpen(true)
  }

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleRegionSelectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value

    setEditForm((prev) => ({
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
    } catch (err) {
      console.error('Error loading PSGC provinces for profile edit', err)
    }
  }

  const handleProvinceSelectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value

    setEditForm((prev) => ({
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
      const res = await fetch(
        `https://psgc.cloud/api/provinces/${value}/cities-municipalities`
      )
      if (!res.ok) {
        throw new Error(`Failed to load cities: ${res.status}`)
      }
      const data = await res.json()
      setCities(data)
    } catch (err) {
      console.error('Error loading PSGC cities/municipalities for profile edit', err)
    }
  }

  const handleCitySelectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value

    setEditForm((prev) => ({
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
    } catch (err) {
      console.error('Error loading PSGC barangays for profile edit', err)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isSupabaseConfigured || !user?.id) {
      toast.error('Editing your profile is only available when connected to the server.')
      return
    }

    setEditSaving(true)

    const updateData: any = {
      first_name: editForm.firstName,
      middle_name: editForm.middleName,
      last_name: editForm.lastName,
      nickname: editForm.nickname,
      address: editForm.address,
      region: editForm.region,
      barangay: editForm.barangay,
      city: editForm.city,
      province: editForm.province,
      student_employee_id: editForm.studentId,
      program: editForm.program,
      department: editForm.department,
      year_level: editForm.yearLevel,
      section: editForm.section,
    }

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating profile', updateError)
        toast.error('Failed to save your changes. Please try again.')
      } else {
        setProfile((prev: any) => {
          const next = prev ? { ...prev, ...updateData } : { ...updateData }
          // Refresh human-readable location names after edit
          loadLocationNames(next)
          return next
        })
        toast.success('Your profile has been updated.')
        setEditOpen(false)
      }
    } catch (err) {
      console.error('Unexpected error updating profile', err)
      toast.error('Something went wrong while saving. Please try again.')
    } finally {
      setEditSaving(false)
    }
  }

  const openAvatarModal = () => {
    if (!user?.id) return
    setAvatarFile(null)
    setAvatarPreview(profile?.avatar_url || null)
    setAvatarOpen(true)
  }

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)

    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleAvatarSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!avatarFile) {
      toast.error('Please choose a picture first.')
      return
    }

    if (!isSupabaseConfigured || !user?.id) {
      toast.error('Updating your profile picture is only available when connected to the server.')
      return
    }

    setAvatarSaving(true)

    try {
      const userId = user.id as string
      const ext = avatarFile.name.split('.').pop() || 'jpg'
      const filePath = `avatars/${userId}/${Date.now()}.${ext}`

      const { error: uploadError } = await (supabase as any).storage
        .from('user-docs')
        .upload(filePath, avatarFile, {
          upsert: true,
          contentType: avatarFile.type || undefined,
        })

      if (uploadError) {
        console.error('Error uploading profile image', uploadError)
        toast.error('Failed to upload your profile picture. Please try again.')
        setAvatarSaving(false)
        return
      }

      const { data: publicData } = (supabase as any).storage
        .from('user-docs')
        .getPublicUrl(filePath)
      const avatarUrl = publicData.publicUrl as string

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId)

      if (updateError) {
        console.error('Error saving avatar URL to profile', updateError)
        toast.error('Your picture was uploaded, but saving it to your profile failed.')
        setAvatarSaving(false)
        return
      }

      setProfile((prev: any) => (prev ? { ...prev, avatar_url: avatarUrl } : prev))
      toast.success('Your profile picture has been updated.')
      setAvatarOpen(false)
    } catch (err) {
      console.error('Unexpected error updating avatar', err)
      toast.error('Something went wrong while updating your picture. Please try again.')
    } finally {
      setAvatarSaving(false)
    }
  }

  return (
    <>
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <h1 className="text-xl font-semibold">My Profile</h1>
          <p className="mt-1 text-xs text-blue-100">This is your DYCI Connect digital ID and account information.</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div />
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold ${
                roleDisplay === 'Student'
                  ? 'bg-blue-50 text-blue-700'
                  : roleDisplay === 'Faculty'
                    ? 'bg-purple-50 text-purple-700'
                    : 'bg-rose-50 text-rose-700'
              }`}
            >
              {roleDisplay}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold ${
                verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              {verified ? 'Verified' : 'Pending verification'}
            </span>
          </div>
        </div>

        <div className="grid gap-5 lg:gap-6 md:grid-cols-3 items-start">
        {/* Identity card */}
        <section className="md:col-span-2 rounded-2xl border border-slate-100 bg-white px-5 py-4 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-800 overflow-hidden">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                fullName
                  .split(' ')
                  .map((p: string) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{fullName}</p>
              <p className="text-[11px] text-slate-500">
                {user?.email || profile?.email || 'student@dyci.edu.ph'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-600 mt-2">
            <div>
              <p className="font-medium text-slate-500">ID number</p>
              <p className="mt-0.5 text-slate-800">
                {profile?.student_employee_id || '—'}
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-500">
                {roleDisplay === 'Faculty' ? 'Department' : 'Program'}
              </p>
              <p className="mt-0.5 text-slate-800">
                {roleDisplay === 'Faculty'
                  ? profile?.department || '—'
                  : profile?.program || '—'}
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-500">Year level</p>
              <p className="mt-0.5 text-slate-800">{profile?.year_level || '—'}</p>
            </div>
            <div>
              <p className="font-medium text-slate-500">Joined</p>
              <p className="mt-0.5 text-slate-800">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString()
                  : '—'}
              </p>
            </div>
          </div>
        </section>

        {/* Account actions */}
        <section className="rounded-2xl border border-slate-100 bg-white px-5 py-4 space-y-3 shadow-sm">
          <h2 className="text-xs font-semibold text-slate-800">Account actions</h2>
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
            onClick={openEditProfile}
            disabled={!profile}
          >
            Edit profile
          </button>
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
            onClick={openAvatarModal}
            disabled={!profile}
          >
            Change profile picture
          </button>
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
          >
            Change password (coming soon)
          </button>
        </section>
      </div>

        {/* Personal & contact info */}
        <section className="rounded-2xl border border-slate-100 bg-white px-5 py-4 space-y-3 shadow-sm">
        <h2 className="text-xs font-semibold text-slate-800">Personal & contact</h2>
        <div className="grid gap-3 md:grid-cols-3 text-[11px] text-slate-600">
          <div className="md:col-span-1">
            <p className="font-medium text-slate-500">Nickname</p>
            <p className="mt-0.5 text-slate-800">{profile?.nickname || '—'}</p>
          </div>
          <div className="md:col-span-2">
            <p className="font-medium text-slate-500">Address</p>
            <p className="mt-0.5 text-slate-800">
              {profile?.address || '—'}
              {(locationNames.barangay ||
                locationNames.city ||
                locationNames.province) && (
                <>
                  <br />
                  {[locationNames.barangay, locationNames.city, locationNames.province]
                    .filter(Boolean)
                    .join(', ')}
                </>
              )}
            </p>
          </div>
        </div>
        </section>

        {loading && (
          <p className="text-[11px] text-slate-500">Loading your profile…</p>
        )}
        {error && (
          <p className="text-[11px] text-rose-600">
            {error}
          </p>
        )}

        {/* Edit profile modal */}
        {editOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-6 space-y-4 text-[11px]">
              <h2 className="text-sm font-semibold text-slate-900">Edit profile</h2>
              <p className="text-slate-500">
                Update your basic information. These details are visible to administrators and may be
                used for verification.
              </p>

              <form className="space-y-3" onSubmit={handleEditSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1 md:col-span-1">
                    <label className="block font-medium text-slate-700">First name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={editForm.firstName}
                      onChange={handleEditChange}
                      className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Juan"
                      required
                    />
                  </div>
                  <div className="space-y-1 md:col-span-1">
                    <label className="block font-medium text-slate-700">Middle name</label>
                    <input
                      type="text"
                      name="middleName"
                      value={editForm.middleName}
                      onChange={handleEditChange}
                      className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Santos"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-1">
                    <label className="block font-medium text-slate-700">Last name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={editForm.lastName}
                      onChange={handleEditChange}
                      className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Dela Cruz"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-medium text-slate-700">
                      {roleDisplay === 'Faculty' ? 'Employee ID' : 'Student ID'}
                    </label>
                    <input
                      type="text"
                      name="studentId"
                      value={editForm.studentId}
                      onChange={handleEditChange}
                      className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="2024-0000"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-medium text-slate-700">Nickname</label>
                    <input
                      type="text"
                      name="nickname"
                      value={editForm.nickname}
                      onChange={handleEditChange}
                      className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. Juan, CJ, Ate Ann"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-medium text-slate-700">Address</label>

                  <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Region */}
                    <div className="space-y-1">
                      <span className="block text-[11px] font-medium text-slate-600">
                        Region
                      </span>
                      <select
                        name="region"
                        value={editForm.region}
                        onChange={handleRegionSelectChange}
                        className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                      <span className="block text-[11px] font-medium text-slate-600">
                        Province
                      </span>
                      <select
                        name="province"
                        value={editForm.province}
                        onChange={handleProvinceSelectChange}
                        disabled={!editForm.region}
                        className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">
                          {editForm.region ? 'Select province' : 'Select region first'}
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
                      <span className="block text-[11px] font-medium text-slate-600">
                        City / Municipality
                      </span>
                      <select
                        name="city"
                        value={editForm.city}
                        onChange={handleCitySelectChange}
                        disabled={!editForm.province}
                        className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">
                          {editForm.province
                            ? 'Select city / municipality'
                            : 'Select province first'}
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
                      <span className="block text-[11px] font-medium text-slate-600">
                        Barangay
                      </span>
                      <select
                        name="barangay"
                        value={editForm.barangay}
                        onChange={handleEditChange}
                        disabled={!editForm.city}
                        className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">
                          {editForm.city
                            ? 'Select barangay'
                            : 'Select city / municipality first'}
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
                    <span className="block text-[11px] font-medium text-slate-600">
                      Street / house number
                    </span>
                    <textarea
                      name="address"
                      value={editForm.address}
                      onChange={handleEditChange}
                      className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      rows={2}
                      placeholder="e.g. 123 Sampaguita St."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {roleDisplay === 'Student' ? (
                    <>
                      <div className="space-y-1">
                        <label className="block font-medium text-slate-700">Program</label>
                        <select
                          name="program"
                          value={editForm.program}
                          onChange={handleEditChange}
                          className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Select program</option>
                          {departments.length > 0 && programs.length > 0 && editForm.department
                            ? programs
                                .filter((p: any) =>
                                  departments.find(
                                    (d: any) =>
                                      d.id === p.department_id && d.name === editForm.department
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
                      <div className="space-y-1">
                        <label className="block font-medium text-slate-700">Year level</label>
                        <select
                          name="yearLevel"
                          value={editForm.yearLevel}
                          onChange={handleEditChange}
                          className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                        <label className="block font-medium text-slate-700">Section</label>
                        <input
                          type="text"
                          name="section"
                          value={editForm.section}
                          onChange={handleEditChange}
                          className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="e.g. A"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <label className="block font-medium text-slate-700">Department</label>
                        <input
                          type="text"
                          name="department"
                          value={editForm.department}
                          onChange={handleEditChange}
                          className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Department"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block font-medium text-slate-700">Year level</label>
                        <input
                          type="text"
                          name="yearLevel"
                          value={editForm.yearLevel}
                          onChange={handleEditChange}
                          className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="e.g. 1st Year"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block font-medium text-slate-700">Section</label>
                        <input
                          type="text"
                          name="section"
                          value={editForm.section}
                          onChange={handleEditChange}
                          className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="e.g. A"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-3 space-y-2 sm:space-y-0 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditOpen(false)}
                    className="w-full sm:w-auto inline-flex justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="w-full sm:w-auto inline-flex justify-center rounded-xl bg-blue-700 hover:bg-blue-800 px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {editSaving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Change profile picture modal */}
        {avatarOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 space-y-4 text-[11px]">
              <h2 className="text-sm font-semibold text-slate-900">Change profile picture</h2>
              <p className="text-slate-500">
                Upload a clear photo where your face is visible. This may be used by administrators
                to help verify your account.
              </p>

              <form className="space-y-4" onSubmit={handleAvatarSubmit}>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden border border-slate-200">
                    {avatarPreview || profile?.avatar_url ? (
                      // eslint-disable-next-line jsx-a11y/img-redundant-alt
                      <img
                        src={avatarPreview || profile?.avatar_url}
                        alt="Profile picture preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-blue-800">
                        {fullName
                          .split(' ')
                          .map((p: string) => p[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="inline-flex items-center px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer">
                      <span>Choose photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarFileChange}
                      />
                    </label>
                    <p className="text-[10px] text-slate-500">
                      JPG or PNG, up to ~5MB. Square photos work best.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-3 space-y-2 sm:space-y-0 pt-1">
                  <button
                    type="button"
                    onClick={() => setAvatarOpen(false)}
                    className="w-full sm:w-auto inline-flex justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={avatarSaving}
                    className="w-full sm:w-auto inline-flex justify-center rounded-xl bg-blue-700 hover:bg-blue-800 px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {avatarSaving ? 'Saving…' : 'Save picture'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

export default StudentProfile

