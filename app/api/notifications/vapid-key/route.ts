import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api-helpers'
import { getVapidPublicKey } from '@/lib/notifications/push-service'

/**
 * GET /api/notifications/vapid-key
 * Get VAPID public key for frontend push subscription
 */
export async function GET(request: NextRequest) {
  try {
    const publicKey = getVapidPublicKey()
    return successResponse({ publicKey })
  } catch (error: any) {
    return errorResponse('VAPID public key not configured', 503)
  }
}

