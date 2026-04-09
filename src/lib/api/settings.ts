import { supabase } from '../supabaseClient'

export interface SchoolSettings {
  id: number
  current_academic_year: string
  updated_at: string
}

export async function fetchSchoolSettings(): Promise<{ data: SchoolSettings | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('school_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching school settings:', error)
      return { data: null, error: error.message }
    }
    return { data, error: null }
  } catch (err: any) {
    return { data: null, error: err.message || 'Failed to fetch settings' }
  }
}

export async function updateAcademicYear(schoolYear: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('school_settings')
      .update({ current_academic_year: schoolYear })
      .eq('id', 1)

    if (error) {
      console.error('Error updating school settings:', error)
      return { error: error.message }
    }

    // Reset conforme acceptance for ALL users so they must re-accept
    const { error: resetErr } = await supabase
      .from('profiles')
      .update({ conforme_accepted_year: null })
      .neq('id', '00000000-0000-0000-0000-000000000000') // match all rows

    if (resetErr) {
      console.error('Error resetting conforme:', resetErr)
    }

    return { error: null }
  } catch (err: any) {
    return { error: err.message || 'Failed to update settings' }
  }
}

export async function acceptConforme(userId: string, academicYear: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ conforme_accepted_year: academicYear })
      .eq('id', userId)

    if (error) return { error: error.message }
    return { error: null }
  } catch (err: any) {
    return { error: err.message || 'Failed to accept conforme' }
  }
}

export async function removeGraduates(): Promise<{ count: number; error: string | null }> {
  try {
    // Find 4th year students
    const { data: grads, error: fetchErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'student')
      .eq('year_level', '4th Year')

    if (fetchErr) return { count: 0, error: fetchErr.message }
    if (!grads || grads.length === 0) return { count: 0, error: null }

    const ids = grads.map((g: { id: string }) => g.id)

    const { error: delErr } = await supabase
      .from('profiles')
      .delete()
      .in('id', ids)

    if (delErr) return { count: ids.length, error: delErr.message }
    return { count: ids.length, error: null }
  } catch (err: any) {
    return { count: 0, error: err.message || 'Failed to remove graduates' }
  }
}
