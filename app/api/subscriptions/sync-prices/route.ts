import { NextRequest } from 'next/server'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'
import { getServerSupabase } from '@/lib/auth'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
})

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireAuth(request)
    if (authResult.error) {
      return authResult.error
    }
    
    const user = authResult.user
    const supabase = getServerSupabase(request)

    console.log(`[Sync Prices] Starting sync for user: ${user.id}`)

    // Get all active subscriptions for this user
    const { data: subscriptions, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id, stripe_subscription_id, price_amount, type')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (fetchError) {
      console.error('[Sync Prices] Error fetching subscriptions:', fetchError)
      return errorResponse('Failed to fetch subscriptions', 500)
    }

    if (!subscriptions || subscriptions.length === 0) {
      return successResponse({ updated: 0, message: 'No active subscriptions to sync' })
    }

    const updates: any[] = []

    // Fetch each subscription from Stripe and compare prices
    for (const sub of subscriptions) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
        
        // Get the price from the first item
        const stripePriceAmount = stripeSubscription.items.data[0]?.price?.unit_amount
        
        if (stripePriceAmount) {
          // Convert from cents to dollars
          const stripePriceInDollars = stripePriceAmount / 100
          
          // Check if database price matches Stripe price
          if (Math.abs(sub.price_amount - stripePriceInDollars) > 0.01) {
            console.log(`[Sync Prices] Price mismatch for ${sub.type} (${sub.id}):`)
            console.log(`  Database: $${sub.price_amount}`)
            console.log(`  Stripe: $${stripePriceInDollars}`)
            
            // Update the database
            const { error: updateError } = await supabase
              .from('subscriptions')
              .update({ price_amount: stripePriceInDollars })
              .eq('id', sub.id)
            
            if (updateError) {
              console.error(`[Sync Prices] Error updating subscription ${sub.id}:`, updateError)
            } else {
              updates.push({
                id: sub.id,
                type: sub.type,
                oldPrice: sub.price_amount,
                newPrice: stripePriceInDollars
              })
            }
          } else {
            console.log(`[Sync Prices] ${sub.type} (${sub.id}) is already in sync: $${sub.price_amount}`)
          }
        }
      } catch (stripeError: any) {
        console.error(`[Sync Prices] Error fetching Stripe subscription ${sub.stripe_subscription_id}:`, stripeError.message)
      }
    }

    console.log(`[Sync Prices] Sync complete. Updated ${updates.length} subscriptions.`)

    return successResponse({
      updated: updates.length,
      details: updates,
      message: updates.length > 0 
        ? `Successfully synced ${updates.length} subscription(s)` 
        : 'All subscriptions are already in sync'
    })

  } catch (error: any) {
    console.error('[Sync Prices] Error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

