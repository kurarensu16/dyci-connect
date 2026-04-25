import { supabase } from '../supabaseClient'

export type NotificationType = 'info' | 'warning' | 'success' | 'error'

export async function notifyUser(
  userId: string,
  title: string,
  message: string,
  type: NotificationType = 'info',
  actionUrl: string = ''
) {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    title,
    message,
    type,
    read: false,
    action_url: actionUrl
  })
  return { error }
}

export async function notifyRole(
  role: string,
  title: string,
  message: string,
  actionUrl: string = ''
) {
  const { data: users } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', role)

  if (!users?.length) return { error: null }

  const rows = users.map(u => ({
    user_id: u.id,
    title,
    message,
    type: 'info',
    read: false,
    action_url: actionUrl
  }))

  const { error } = await supabase.from('notifications').insert(rows)
  return { error }
}

export async function notifyPosition(
  position: string,
  title: string,
  message: string,
  actionUrl: string = ''
) {
  const { data: users } = await supabase
    .from('profiles')
    .select('id')
    .eq('approver_position', position)

  if (!users?.length) return { error: null }

  const rows = users.map(u => ({
    user_id: u.id,
    title,
    message,
    type: 'info',
    read: false,
    action_url: actionUrl
  }))

  const { error } = await supabase.from('notifications').insert(rows)
  return { error }
}

export async function notifyAllVerifiedUsers(
  title: string,
  message: string,
  actionUrl: string = ''
) {
  const { data: users } = await supabase
    .from('profiles')
    .select('id')
    .eq('verified', true)

  if (!users?.length) return { error: null }

  const rows = users.map(u => ({
    user_id: u.id,
    title,
    message,
    type: 'info',
    read: false,
    action_url: actionUrl
  }))

  // Batch insert in chunks of 50 to avoid request size limits
  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await supabase.from('notifications').insert(rows.slice(i, i + 50))
    if (error) return { error }
  }

  return { error: null }
}
