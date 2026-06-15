import { supabase } from './supabase'
import type { Session } from '@supabase/supabase-js'

function isStaleRefreshError(message?: string): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  return m.includes('refresh token') || m.includes('invalid refresh')
}

/** Clear broken local auth (expired/missing refresh token). */
export async function clearStaleLocalAuth(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch {
    /* ignore */
  }
}

/**
 * Load browser session; if refresh token is invalid, clear storage and return null.
 */
export async function getBrowserSession(): Promise<{
  session: Session | null
  stale: boolean
}> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error && isStaleRefreshError(error.message)) {
      await clearStaleLocalAuth()
      return { session: null, stale: true }
    }
    return { session, stale: false }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (isStaleRefreshError(msg)) {
      await clearStaleLocalAuth()
      return { session: null, stale: true }
    }
    throw e
  }
}
