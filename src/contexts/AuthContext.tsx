import React, { createContext, useState, useContext, useEffect } from 'react'
import type { ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import type { User } from '../types'
import { getAuthProvider } from '../utils/profileUtils'

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, role: string, userData: any) => Promise<{ data: any; error: any }>
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>
  signOut: () => Promise<{ error: any }>
  signInWithGoogle: () => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ data: any; error: any }>
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    // Check active sessions and set the user
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      setUser(session?.user as User | null)
      setLoading(false)
    })

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setUser(session?.user as User | null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, role: string, userData: any) => {
    const doSignUp = () =>
      supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            role,
            ...userData,
          },
        },
      })

    let result = await doSignUp()
    const err = result.error as { message?: string; name?: string } | null
    const isRetryable =
      err && (err.name === 'AuthRetryableFetchError' || err.message === 'AuthRetryableFetchError')

    if (isRetryable) {
      if (import.meta.env.DEV) {
        console.warn(
          'Signup request failed (network). Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Retrying once...'
        )
      }
      await new Promise((r) => setTimeout(r, 1500))
      result = await doSignUp()
    }

    if (result.error && import.meta.env.DEV && isRetryable) {
      console.warn(
        'Signup still failed after retry. Ensure Supabase env vars are set (and on Vercel, redeploy after adding them).'
      )
    }

    return { data: result.data, error: result.error }
  }

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { data: null, error: new Error('Supabase environment variables are missing. Please restart your dev server.') }
    }

    // Real Supabase sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (!error && (data as any)?.user) {
      const signedInUser = (data as any).user as User
      setUser(signedInUser)

      // Update last_sign_in and auth_provider (email sign-in) in profiles
      await supabase
        .from('profiles')
        .update({
          last_login: new Date().toISOString(),
          auth_provider: 'email',
        })
        .eq('id', signedInUser.id)
    }

    return { data, error }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured) return { error: null }

    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
    }
    return { error }
  }

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      return { error: { message: 'Google sign-in is not configured.' } }
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { error }
  }

  const resetPassword = async (email: string) => {
    const redirectTo = `${window.location.origin}/reset-password`
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    return { data, error }
  }

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    if (!isSupabaseConfigured || !user?.email) {
      return { error: { message: 'Not available in this environment.' } }
    }

    // For Google (and other OAuth-only) accounts, passwords are managed by the provider.
    const provider = getAuthProvider(user)
    if (provider !== 'email') {
      return {
        error: {
          message:
            'Your account uses Google sign-in. Change your password from your Google Account settings.',
        },
      }
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (signInError) {
      return { error: { message: 'Current password is incorrect.' } }
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error }
  }

  const value: AuthContextType = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
    resetPassword,
    updatePassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}