import { supabase } from '../supabaseClient'
import { notifyAllVerifiedUsers } from './notifications'

export interface SchoolSettings {
  id: number
  current_academic_year_id: string
  updated_at: string
}

export interface AcademicYear {
  id: string
  year_name: string
  is_current: boolean
  is_active: boolean
  created_at: string
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

export async function fetchAcademicYears(): Promise<{ data: AcademicYear[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('academic_years')
      .select('*')
      .order('year_name', { ascending: false })

    if (error) return { data: null, error: error.message }
    return { data, error: null }
  } catch (err: any) {
    return { data: null, error: err.message || 'Failed to fetch academic years' }
  }
}

export async function createAcademicYear(yearName: string): Promise<{ data: AcademicYear | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('academic_years')
      .insert({ year_name: yearName })
      .select('*')
      .single()

    if (error) return { data: null, error: error.message }
    return { data, error: null }
  } catch (err: any) {
    return { data: null, error: err.message || 'Failed to create academic year' }
  }
}

export async function setAcademicYearAsCurrent(yearId: string, _yearName: string): Promise<{ error: string | null }> {
  try {
    // 1. Reset all to false
    await supabase.from('academic_years').update({ is_current: false }).neq('id', '00000000-0000-0000-0000-000000000000')

    // 2. Set this one to true
    const { error: updateYearErr } = await supabase
      .from('academic_years')
      .update({ is_current: true })
      .eq('id', yearId)

    if (updateYearErr) return { error: updateYearErr.message }

    // 3. Update global settings
    const { error: settingsErr } = await supabase
      .from('school_settings')
      .update({ current_academic_year_id: yearId })
      .eq('id', 1)

    if (settingsErr) return { error: settingsErr.message }

    // 4. Global notification to all users
    await notifyAllVerifiedUsers(
      'System Update: New Academic Year',
      `The institution has officially transitioned to Academic Year ${_yearName}. Please review the updated handbook and calendar.`,
      '/staff/handbook'
    )

    // 5. Reset conforme acceptance for ALL users in their respective profile tables
    const [studentReset, staffReset] = await Promise.all([
      supabase
        .from('student_profiles')
        .update({ enrolled_academic_year_id: null })
        .not('profile_id', 'is', null), // safe target-all filter
      supabase
        .from('staff_profiles')
        .update({ enrolled_academic_year_id: null })
        .not('profile_id', 'is', null)
    ])

    if (studentReset.error) console.error('Error resetting student conforme:', studentReset.error)
    if (staffReset.error) console.error('Error resetting staff conforme:', staffReset.error)

    return { error: null }
  } catch (err: any) {
    return { error: err.message || 'Failed to update academic year' }
  }
}

/** @deprecated Use setAcademicYearAsCurrent */
export const updateAcademicYear = async (schoolYear: string) => {
  // Fallback for legacy calls - tries to find matching year or create it
  const { data: years } = await fetchAcademicYears()
  const year = years?.find(y => y.year_name === schoolYear)
  if (year) return setAcademicYearAsCurrent(year.id, year.year_name)

  const { data: newYear } = await createAcademicYear(schoolYear)
  if (newYear) return setAcademicYearAsCurrent(newYear.id, newYear.year_name)

  return { error: 'Year not found or could not be created' }
}

export async function acceptConforme(
  userId: string,
  academicYearId: string,
  role: string = 'student'
): Promise<{ error: string | null }> {
  try {
    if (!academicYearId) {
      console.error('acceptConforme: No academic year ID provided')
      return { error: 'Academic year selection is missing' }
    }
    const isStudent = role === 'student'
    const table = isStudent ? 'student_profiles' : 'staff_profiles'

    // Upsert acceptance into the correct sub-profile table
    const { error } = await supabase
      .from(table)
      .upsert({
        profile_id: userId,
        enrolled_academic_year_id: academicYearId
      })

    if (error) return { error: error.message }
    return { error: null }
  } catch (err: any) {
    return { error: err.message || 'Failed to accept conforme' }
  }
}

export async function removeGraduates(): Promise<{ count: number; error: string | null }> {
  try {
    // Find 4th year students by joining student_profiles and year_levels
    const { data: grads, error: fetchErr } = await supabase
      .from('student_profiles')
      .select('profile_id, year_levels!inner(label)')
      .eq('year_levels.label', '4th Year')

    if (fetchErr) return { count: 0, error: fetchErr.message }
    if (!grads || grads.length === 0) return { count: 0, error: null }

    const ids = grads.map((g: any) => g.profile_id)

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
