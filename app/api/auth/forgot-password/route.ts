import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { successResponse, errorResponse, parseRequestBody } from '@/lib/api-helpers'

function getAppOrigin(request: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (envUrl) return envUrl
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return request.nextUrl.origin
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseRequestBody<{ email: string }>(request)

    if (!body?.email?.trim()) {
      return errorResponse('Email is required', 400)
    }

    const email = body.email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return errorResponse('Invalid email format', 400)
    }

    const origin = getAppOrigin(request)
    const redirectTo = `${origin}/auth/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) {
      console.error('resetPasswordForEmail:', error.message)
    }

    return successResponse(
      { sent: true },
      'If an account exists for that email, you will receive a reset link shortly.'
    )
  } catch (error: unknown) {
    console.error('forgot-password:', error)
    return errorResponse('Internal server error', 500)
  }
}
