import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// When env vars are missing, use a mock client so the app can still run
const createMockSupabase = () => {
  console.warn(
    'Supabase environment variables are not set. Using a mock Supabase client — features that require the backend will not work.'
  )

  return {
    auth: {
      getSession: async () => ({
        data: { session: null },
        error: { message: 'Supabase not configured' },
      }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signUp: async () => ({
        data: null,
        error: { message: 'Supabase not configured' },
      }),
      signInWithPassword: async () => ({
        data: null,
        error: { message: 'Supabase not configured' },
      }),
      signOut: async () => ({
        error: null,
      }),
      resetPasswordForEmail: async () => ({
        data: null,
        error: { message: 'Supabase not configured' },
      }),
    },
    from: () => {
      throw new Error('Supabase not configured')
    },
  }
}

let supabase: any

if (!supabaseUrl || !supabaseAnonKey) {
  supabase = createMockSupabase()
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export { supabase }