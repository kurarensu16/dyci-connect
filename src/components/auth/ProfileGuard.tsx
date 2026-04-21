import React, { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import { checkProfileCompleteness, createIncompleteProfileNotification } from '../../utils/profileUtils'

interface ProfileGuardProps {
  children: ReactNode
  allowedRoles: string[]
}

interface ProfileRow {
  id: string
  role: string | null
  verified: boolean | null
  conforme_accepted_year: string | null
}

const ProfileGuard: React.FC<ProfileGuardProps> = ({ children, allowedRoles }) => {
  const { user } = useAuth()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [currentAcademicYear, setCurrentAcademicYear] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured) {
      setLoading(false)
      setProfile(null)
      return
    }
    let cancelled = false

    const load = async () => {
      const [profileRes, settingsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, role, verified, first_name, last_name, conforme_accepted_year')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('school_settings')
          .select('current_academic_year')
          .eq('id', 1)
          .maybeSingle(),
      ])

      if (cancelled) return

      if (profileRes.error) {
        setProfile(null)
      } else {
        setProfile(profileRes.data as ProfileRow | null)
        const completeness = checkProfileCompleteness(profileRes.data)
        if (!profileRes.data || !completeness.isComplete) {
          await createIncompleteProfileNotification(user.id)
        }
      }

      setCurrentAcademicYear(settingsRes.data?.current_academic_year ?? null)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-slate-500">Loading…</div>
      </div>
    )
  }

  const role = profile?.role?.toString().toLowerCase() ?? ''
  const verified = profile?.verified === true

  if (!profile || !role) {
    return <Navigate to="/complete-profile" replace />
  }

  // Unverified (non-admin) users are allowed through to the dashboard; layouts show "pending" and lock access
  if (!verified && role !== 'admin') {
    if (!allowedRoles.includes(role)) {
      return <Navigate to="/" replace />
    }
    return <>{children}</>
  }

  // Conforme check: if the user hasn't accepted for the current academic year, redirect
  // Admins are exempt from the conforme gate
  if (
    role !== 'admin' &&
    currentAcademicYear &&
    profile.conforme_accepted_year !== currentAcademicYear
  ) {
    return <Navigate to="/conforme" replace />
  }

  // Check if they need to reset their given password (happens after Conforme)
  if (user?.user_metadata?.must_reset_password === true) {
    return <Navigate to="/force-password-reset" replace />
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default ProfileGuard

