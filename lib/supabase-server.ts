import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Server-side Supabase client for API routes and server components
export function createServerSupabaseClient() {
  const cookieStore = cookies()
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        getSession: async () => {
          const accessToken = cookieStore.get('sb-access-token')?.value
          const refreshToken = cookieStore.get('sb-refresh-token')?.value
          
          if (!accessToken) return { data: { session: null }, error: null }
          
          // Verify and get session from Supabase
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          )
          
          const { data: { session }, error } = await supabase.auth.getSession()
          return { data: { session }, error }
        },
        setSession: async (session) => {
          if (session) {
            cookieStore.set('sb-access-token', session.access_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 7, // 7 days
            })
            cookieStore.set('sb-refresh-token', session.refresh_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 30, // 30 days
            })
          }
        },
      },
    }
  )
}

// Alternative: Simple server client for API routes
export function getServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

