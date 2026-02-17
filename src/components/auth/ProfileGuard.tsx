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
}

const ProfileGuard: React.FC<ProfileGuardProps> = ({ children, allowedRoles }) => {
  const { user } = useAuth()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured) {
      setLoading(false)
      setProfile(null)
      return
    }
    let cancelled = false
    supabase
      .from('profiles')
      .select('id, role, verified, first_name, last_name')
      .eq('id', user.id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (cancelled) return
        if (error) {
          setProfile(null)
        } else {
          setProfile(data as ProfileRow | null)
          const completeness = checkProfileCompleteness(data)
          if (!data || !completeness.isComplete) {
            await createIncompleteProfileNotification(user.id)
          }
        }
        setLoading(false)
      })
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
    // still check role so they land on the right dashboard
    if (!allowedRoles.includes(role)) {
      return <Navigate to="/" replace />
    }
    return <>{children}</>
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default ProfileGuard
