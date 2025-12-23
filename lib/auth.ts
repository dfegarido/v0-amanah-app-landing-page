import { createClient } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { NextRequest } from 'next/server'

export type UserRole = 'user' | 'admin' // Removed 'business_owner'

export interface User {
  id: string
  email: string
  name: string | null
  phone: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

// Create server-side Supabase client with auth token from request
export function getServerSupabase(request: NextRequest) {
  // Get token from Authorization header
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    token ? {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    } : {}
  )
}

// Get current authenticated user (for client-side)
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !authUser) {
    return null
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (error || !user) {
    return null
  }

  return user as User
}

// Get current authenticated user (for server-side/API routes)
export async function getCurrentUserServer(request: NextRequest): Promise<User | null> {
  const supabaseServer = getServerSupabase(request)
  
  const { data: { user: authUser }, error: authError } = await supabaseServer.auth.getUser()
  
  if (authError || !authUser) {
    return null
  }

  const { data: user, error } = await supabaseServer
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (error || !user) {
    return null
  }

  return user as User
}

// Get current user with role check
export async function getCurrentUserWithRole(requiredRole?: UserRole): Promise<User | null> {
  const user = await getCurrentUser()
  
  if (!user) {
    return null
  }

  if (requiredRole && user.role !== requiredRole) {
    return null
  }

  return user
}

// Check if user has required role
export async function hasRole(requiredRole: UserRole): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === requiredRole || user?.role === 'admin'
}

// Check if user has any of the required roles
export async function hasAnyRole(roles: UserRole[]): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  return roles.includes(user.role) || user.role === 'admin'
}
