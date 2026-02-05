import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, role: string, userData: any) => Promise<{ data: any; error: any }>
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>
  signOut: () => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ data: any; error: any }>
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
    // Check active sessions and set the user (only when Supabase is configured)
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user as User | null)
        setLoading(false)
      })

      // Listen for changes on auth state
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user as User | null)
      })

      return () => subscription.unsubscribe()
    } else {
      // In mock mode we start with no user and finish loading immediately
      setLoading(false)
    }
  }, [])

  const signUp = async (email: string, password: string, role: string, userData: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: role,
          ...userData
        }
      }
    })
    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    // If Supabase isn't configured, create a mock logged-in user for now
    if (!isSupabaseConfigured) {
      const lowerEmail = email.toLowerCase()
      let role: User['user_metadata']['role'] = 'student'
      let fullName = 'DYCI Student'

      if (lowerEmail.startsWith('admin@')) {
        role = 'admin'
        fullName = 'DYCI Admin'
      } else if (lowerEmail.startsWith('faculty@')) {
        role = 'faculty'
        fullName = 'DYCI Faculty'
      }

      const mockUser: User = {
        id: `mock-${role}`,
        email,
        user_metadata: {
          role,
          full_name: fullName,
        },
      }
      setUser(mockUser)
      return { data: { user: mockUser }, error: null }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (!error && (data as any)?.user) {
      setUser((data as any).user as User)
    }

    return { data, error }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      setUser(null)
      return { error: null }
    }

    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
    }
    return { error }
  }

  const resetPassword = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email)
    return { data, error }
  }

  const value: AuthContextType = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}