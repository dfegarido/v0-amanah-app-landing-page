import type { SupabaseClient } from '@supabase/supabase-js'

export type LiveMosqueRow = {
  id: string
  name: string
  mosque_code: number
  city: string | null
  state: string | null
  address: string | null
}

/**
 * Mosques that are live in the app: entity active + mosque subscription billing + approved on app.
 */
export async function fetchLiveMosques(
  supabase: SupabaseClient,
): Promise<{ mosques: LiveMosqueRow[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('mosques')
    .select(
      `id, name, mosque_code, city, state, address,
      subscription:subscriptions!inner(id, type, app_status, status)`,
    )
    .eq('subscription.type', 'mosque')
    .eq('status', 'active')
    .eq('subscription.app_status', 'active')
    .eq('subscription.status', 'active')

  if (error) {
    return { mosques: [], error: new Error(error.message) }
  }

  const rows = (data || []).map((row: any) => {
    const { subscription: _s, ...m } = row
    return m as LiveMosqueRow
  })

  rows.sort((a, b) => (Number(a.mosque_code) || 0) - (Number(b.mosque_code) || 0))
  return { mosques: rows, error: null }
}

/** Parse admin JSONB / unknown into ordered unique mosque codes. */
export function parseOnboardingMosqueCodes(raw: unknown): number[] {
  if (raw == null) return []
  if (Array.isArray(raw)) {
    const out: number[] = []
    const seen = new Set<number>()
    for (const v of raw) {
      const n = typeof v === 'number' ? v : parseInt(String(v), 10)
      if (!Number.isFinite(n) || seen.has(n)) continue
      seen.add(n)
      out.push(n)
    }
    return out
  }
  return []
}
