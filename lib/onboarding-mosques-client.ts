export type OnboardingMosquePublic = {
  id: string
  name: string
  mosque_code: number
  city?: string | null
  state?: string | null
  address?: string | null
}

type ApiResponse = {
  success?: boolean
  data?: { mosques?: OnboardingMosquePublic[] }
}

/**
 * Same-origin fetch of live mosques in admin-configured order (website + mobile).
 * Public route; no session required.
 */
export async function fetchOnboardingMosquesClient(): Promise<OnboardingMosquePublic[]> {
  try {
    const res = await fetch("/api/mosques/onboarding", {
      method: "GET",
      credentials: "same-origin",
    })
    if (!res.ok) return []
    const json = (await res.json()) as ApiResponse
    if (!json?.success || !Array.isArray(json.data?.mosques)) return []
    return json.data!.mosques!
  } catch {
    return []
  }
}
