import { NextRequest } from 'next/server'
import { errorResponse, requireAuth } from '@/lib/api-helpers'
import { getSupabaseAdmin } from '@/lib/admin-helpers'

type ImportMosqueInput = {
  name: string
  address?: string
  city?: string
  state?: string
  zip?: string
  country?: string
  phone?: string
  website?: string
  description?: string
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function isLikelyNameLine(line: string): boolean {
  if (!line) return false
  if (line.includes('·')) return false
  if (/^\d+(\.\d+)?\(\d+\)/.test(line)) return false
  if (line === 'Website' || line === 'Directions') return false
  if (line.startsWith('"') || line.startsWith("'")) return false
  if (/^Open\b|^Closed\b|^Closes\b/.test(line)) return false
  return /mosque|islamic|masjid|muslim|center|society|community|foundation|icmc|isbr|iccc|muna|icna/i.test(line)
}

function parseRawMosqueText(raw: string): ImportMosqueInput[] {
  const lines = raw
    .split('\n')
    .map((l) => l.replace(/\u00a0/g, ' ').trim())
    .filter(Boolean)

  const rows: ImportMosqueInput[] = []
  const seen = new Set<string>()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // We use the rating/type line as an anchor: "4.9(581) · Mosque"
    if (!/·\s*(Mosque|Religious organization|Place of worship|Association \/ Organization|Community center|Non-profit organization)/i.test(line)) {
      continue
    }

    // Find name above this anchor.
    let name = ''
    for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
      if (isLikelyNameLine(lines[j])) {
        name = lines[j]
        break
      }
    }
    if (!name) continue

    // First useful detail line after anchor usually contains address/city/phone.
    let detail = ''
    for (let k = i + 1; k < Math.min(lines.length, i + 8); k++) {
      const candidate = lines[k]
      if (
        candidate === 'Website' ||
        candidate === 'Directions' ||
        /^Open\b|^Closed\b|^Closes\b/.test(candidate) ||
        candidate.startsWith('"') ||
        /·\s*(Mosque|Religious organization|Place of worship|Association \/ Organization|Community center|Non-profit organization)/i.test(candidate)
      ) {
        continue
      }
      detail = candidate
      break
    }

    const phoneMatch = detail.match(/\(\d{3}\)\s*\d{3}-\d{4}/)
    const phone = phoneMatch ? phoneMatch[0] : undefined

    // Parse city/state if present in "... City, ST ..."
    let city = ''
    let state = ''
    const cityState = detail.match(/([A-Za-z .'-]+),\s*([A-Z]{2})\b/)
    if (cityState) {
      city = cityState[1].trim()
      state = cityState[2].trim()
    }

    let address = detail
    if (phone) address = address.replace(phone, '').replace(/·/g, ' ').trim()
    address = address.replace(/\s{2,}/g, ' ').replace(/^[·\s-]+|[·\s-]+$/g, '')

    const item: ImportMosqueInput = {
      name,
      address: address || undefined,
      city: city || undefined,
      state: state || undefined,
      phone,
    }

    const dedupeKey = normalizeKey(`${item.name}|${item.address || item.city || ''}`)
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey)
      rows.push(item)
    }
  }

  return rows
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error
    if (authResult.user.role !== 'admin') {
      return errorResponse('Unauthorized - Admin access required', 403)
    }

    const body = await request.json().catch(() => null)
    const fromArray = Array.isArray(body?.mosques) ? (body.mosques as ImportMosqueInput[]) : null
    const fromRaw =
      typeof body?.raw_text === 'string' && body.raw_text.trim().length > 0
        ? parseRawMosqueText(body.raw_text)
        : null
    const mosques = fromArray && fromArray.length > 0 ? fromArray : fromRaw
    const dryRun = body?.dry_run === true

    if (!mosques || mosques.length === 0) {
      return errorResponse('Request body must include a non-empty mosques array or raw_text', 400)
    }

    const supabase = getSupabaseAdmin()

    const { data: existingRows, error: existingErr } = await supabase
      .from('mosques')
      .select('id, name, city, state, address')

    if (existingErr) {
      return errorResponse(`Failed to read existing mosques: ${existingErr.message}`, 500)
    }

    const existingByNameCity = new Set<string>()
    const existingByNameAddress = new Set<string>()
    for (const row of existingRows || []) {
      const name = normalizeKey(String(row.name || ''))
      const city = normalizeKey(String(row.city || ''))
      const state = normalizeKey(String(row.state || ''))
      const address = normalizeKey(String(row.address || ''))
      if (name && (city || state)) existingByNameCity.add(`${name}|${city}|${state}`)
      if (name && address) existingByNameAddress.add(`${name}|${address}`)
    }

    const inserted: Array<{ id?: string; mosque_code?: number; name: string }> = []
    const skipped: Array<{ name: string; reason: string }> = []
    const invalid: Array<{ index: number; reason: string }> = []

    for (let i = 0; i < mosques.length; i++) {
      const m = mosques[i]
      const rawName = String(m?.name || '').trim()
      if (!rawName) {
        invalid.push({ index: i, reason: 'Missing name' })
        continue
      }

      const name = rawName
      const city = String(m.city || '').trim()
      const state = String(m.state || '').trim()
      const address = String(m.address || '').trim() || city || 'Address unavailable'
      const country = String(m.country || '').trim() || 'USA'

      const nameKey = normalizeKey(name)
      const cityKey = normalizeKey(city)
      const stateKey = normalizeKey(state)
      const addressKey = normalizeKey(address)

      const key1 = `${nameKey}|${cityKey}|${stateKey}`
      const key2 = `${nameKey}|${addressKey}`
      if (existingByNameCity.has(key1) || existingByNameAddress.has(key2)) {
        skipped.push({ name, reason: 'Already exists (name + city/state or address)' })
        continue
      }

      if (dryRun) {
        inserted.push({ name })
        existingByNameCity.add(key1)
        existingByNameAddress.add(key2)
        continue
      }

      const { data: nextCode, error: codeErr } = await supabase.rpc('get_next_mosque_code')
      if (codeErr) {
        return errorResponse(`Failed to generate mosque code: ${codeErr.message}`, 500)
      }

      const payload = {
        user_id: authResult.user.id,
        subscription_id: null,
        name,
        mosque_code: Number(nextCode) || 0,
        address,
        city: city || null,
        state: state || null,
        zip: String(m.zip || '').trim() || null,
        country,
        phone: String(m.phone || '').trim() || null,
        website: String(m.website || '').trim() || null,
        description: String(m.description || '').trim() || null,
        status: 'active' as const,
      }

      const { data: row, error: insErr } = await supabase
        .from('mosques')
        .insert(payload)
        .select('id, mosque_code, name')
        .single()

      if (insErr) {
        skipped.push({ name, reason: `Insert failed: ${insErr.message}` })
        continue
      }

      inserted.push(row)
      existingByNameCity.add(key1)
      existingByNameAddress.add(key2)
    }

    return Response.json({
      success: true,
      data: {
        dry_run: dryRun,
        requested: mosques.length,
        inserted_count: inserted.length,
        skipped_count: skipped.length,
        invalid_count: invalid.length,
        inserted,
        skipped,
        invalid,
      },
      message: dryRun ? 'Dry run complete' : 'Mosque import complete',
    })
  } catch (error: any) {
    console.error('[admin/mosques/import] error:', error)
    return errorResponse(error?.message || 'Internal server error', 500)
  }
}

