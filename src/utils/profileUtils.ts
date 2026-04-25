import { supabase } from '../lib/supabaseClient'
import { notifyUser } from '../lib/api/notifications'

/**
 * Get auth provider from Supabase user (email vs google).
 * Uses app_metadata.provider first, then identities[0].provider.
 */
export const getAuthProvider = (user: any): string => {
  if (!user) return 'email'
  const fromMeta = user?.app_metadata?.provider
  if (fromMeta) return fromMeta
  const fromIdentity = user?.identities?.[0]?.provider
  if (fromIdentity) return fromIdentity
  return 'email'
}

export interface ProfileCompleteness {
  isComplete: boolean
  missingFields: string[]
}

/**
 * Check if a user's profile is complete based on required fields
 */
export const checkProfileCompleteness = (profile: any): ProfileCompleteness => {
  const requiredFields: Array<{ key: string; label: string }> = [
    { key: 'role', label: 'Role' },
    { key: 'first_name', label: 'First name' },
    { key: 'last_name', label: 'Last name' },
  ]

  const missingFields: string[] = []

  for (const field of requiredFields) {
    const value = profile?.[field.key]
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missingFields.push(field.label)
    }
  }

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  }
}

/**
 * Create a notification for incomplete profile if one doesn't already exist
 */
export const createIncompleteProfileNotification = async (userId: string): Promise<void> => {
  if (!userId) return

  try {
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('read', false)
      .ilike('title', '%Complete your profile%')
      .limit(1)

    if (!existing?.length) {
      await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Complete your profile',
        message: 'Please complete your profile to access all features of DYCI Connect.',
        type: 'info',
        read: false,
        action_url: '/complete-profile',
      })
    }
  } catch (error) {
    // Notifications table may not exist; ignore
    console.error('Error creating incomplete profile notification', error)
  }
}
/**
 * Send a one-time welcome notification if the user is verified
 */
export const checkAndSendWelcomeNotification = async (userId: string): Promise<void> => {
  if (!userId) return

  try {
    // 1. Check if user is verified
    const { data: profile } = await supabase
      .from('profiles')
      .select('verified, role')
      .eq('id', userId)
      .maybeSingle()

    if (!profile?.verified) return

    // 2. Check if they already have a welcome notification
    // We search for the exact title to prevent duplicates
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('title', 'Welcome to DYCI Connect')
      .limit(1)

    if (!existing?.length) {
      let welcomeMsg = ""
      let actionUrl = "/student/dashboard"
      const userRole = (profile.role || '').toLowerCase()

      switch (userRole) {
        case 'student':
          welcomeMsg = "Welcome to the Student Portal! We're glad to have you here. Browse the handbook to stay updated on institution policies."
          actionUrl = "/student/dashboard"
          break
        case 'academic_admin':
        case 'system_admin':
          welcomeMsg = "Welcome to the Admin Console! You can now oversee the institutional dashboard, manage users, and track handbook progress."
          actionUrl = "/admin/dashboard"
          break
        case 'staff':
        case 'faculty': // Handle legacy faculty role if any
          welcomeMsg = "Welcome to the Departmental Approval Portal! You can now manage your departmental activities and handbook reviews here."
          actionUrl = "/staff/dashboard"
          break
        default:
          welcomeMsg = "Welcome to DYCI Connect! We're glad to have you here."
          actionUrl = "/staff/dashboard"
      }

      await notifyUser(userId, 'Welcome to DYCI Connect', welcomeMsg, 'success', actionUrl)
    }
  } catch (error) {
    console.error('Error in checkAndSendWelcomeNotification', error)
  }
}
