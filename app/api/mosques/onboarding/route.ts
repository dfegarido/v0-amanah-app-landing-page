import { NextRequest, NextResponse } from 'next/server'
import { errorResponse } from '@/lib/api-helpers'
import { getSupabaseAdmin } from '@/lib/admin-helpers'
import { fetchLiveMosques, parseOnboardingMosqueCodes } from '@/lib/live-mosques'

/**
 * GET /api/mosques/onboarding
 *
 * Public feed for "pick your mosque" / affiliation lists (website + mobile app).
 * - Always returns live mosques only (approved + active subscription).
 * - If admin_settings.onboarding_mosque_codes is non-empty, those codes are listed first (in order),
 *   then any other live mosques sorted by mosque_code.
 * - If onboarding_mosque_codes is [] or missing, returns all live mosques sorted by mosque_code.
 *
 * No auth required. Native apps use the production base URL; the site calls this route same-origin.
 */
export async function GET(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return errorResponse('Service unavailable', 503)
    }

    const supabase = getSupabaseAdmin()

    const { mosques: live, error: liveErr } = await fetchLiveMosques(supabase)
    if (liveErr) {
      console.error('[mosques/onboarding] fetchLiveMosques:', liveErr)
      return errorResponse('Failed to load mosques', 500)
    }

    const byCode = new Map(live.map((m) => [m.mosque_code, m]))

    let curated: number[] = []
    const { data: settings, error: settingsErr } = await supabase
      .from('admin_settings')
      .select('onboarding_mosque_codes')
      .limit(1)
      .maybeSingle()

    if (!settingsErr && settings) {
      curated = parseOnboardingMosqueCodes(settings.onboarding_mosque_codes)
    }

    const ordered: typeof live = []
    const used = new Set<number>()

    if (curated.length > 0) {
      for (const code of curated) {
        const m = byCode.get(code)
        if (m) {
          ordered.push(m)
          used.add(code)
        }
      }
    }

    for (const m of live) {
      if (!used.has(m.mosque_code)) {
        ordered.push(m)
      }
    }

    const payload = {
      mosques: ordered.map((m) => ({
        id: m.id,
        name: m.name,
        mosque_code: m.mosque_code,
        city: m.city,
        state: m.state,
        address: m.address,
      })),
      meta: {
        total: ordered.length,
        curated_first: curated.length > 0,
      },
    }

    return NextResponse.json(
      { success: true, data: payload },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      },
    )
  } catch (e: any) {
    console.error('[mosques/onboarding]', e)
    return errorResponse(e.message || 'Internal server error', 500)
  }
}
