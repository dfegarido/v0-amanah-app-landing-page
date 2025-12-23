'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { User as SupabaseUser, Session } from '@supabase/supabase-js'

export interface User {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, name: string, phone?: string, role?: 'user' | 'admin') => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchUserProfile(session.user.id)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string, retries = 0, maxRetries = 5) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          userId: userId
        })

        // If profile not found and we have retries left, wait and try again
        if (retries < maxRetries) {
          console.log(`Profile not found yet, retrying (${retries + 1}/${maxRetries})...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
          return fetchUserProfile(userId, retries + 1, maxRetries)
        }
        
        console.error('⚠️ User profile fetch failed after all retries')
        console.error('This usually means:')
        console.error('1. Profile does not exist in public.users table')
        console.error('2. RLS policy is blocking access')
        console.error('3. Auth trigger did not run during signup')
        console.error('→ Run FIX_AUTH_ISSUE.sql in Supabase to fix')
        
        throw error
      }
      
      setUser(data as User)
      console.log('✅ User profile loaded:', data.email, 'Role:', data.role)
    } catch (error: any) {
      console.error('❌ Error fetching user profile after retries:', {
        message: error?.message || 'Unknown error',
        code: error?.code,
        details: error?.details
      })
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (data.user) {
        await fetchUserProfile(data.user.id)
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || 'An error occurred during sign in' }
    }
  }

  const signUp = async (email: string, password: string, name: string, phone?: string, role: 'user' | 'admin' = 'user') => {
    try {
      console.log('Starting sign up for:', email)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone: phone || null,
            role, // Use provided role (defaults to 'user')
          },
        },
      })

      if (error) {
        console.error('Sign up error:', error)
        return { success: false, error: error.message }
      }

      if (!data.user) {
        console.error('No user returned from sign up')
        return { success: false, error: 'Failed to create user account' }
      }

      console.log('User created in auth.users:', data.user.id)

      // Check if session exists (email confirmation might be required)
      if (!data.session) {
        console.log('No session - email confirmation may be required')
        return { 
          success: false, 
          error: 'Please check your email to confirm your account before logging in.' 
        }
      }

      console.log('Session created, waiting for profile...')
      
      // Set session immediately
      setSession(data.session)
      
      // Wait a bit longer for the trigger to run and profile to be created
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Fetch the user profile with retries
      await fetchUserProfile(data.user.id)
      
      // Wait for state to update
      await new Promise(resolve => setTimeout(resolve, 500))
      
      console.log('Sign up complete! Redirecting to portal selection...')

      return { success: true }
    } catch (error: any) {
      console.error('Sign up exception:', error)
      return { success: false, error: error.message || 'An error occurred during sign up' }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  const refreshUser = async () => {
    if (session?.user.id) {
      await fetchUserProfile(session.user.id)
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
