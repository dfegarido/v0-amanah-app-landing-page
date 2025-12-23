/**
 * Script to check if admin can see mosque data
 * Run with: npx tsx scripts/check-admin-data.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkAdminData() {
  console.log('🔍 Checking admin data visibility...\n')

  try {
    // 1. Check users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
    } else {
      console.log(`✅ Found ${users?.length || 0} users`)
      users?.forEach(user => {
        console.log(`   - ${user.email} (${user.role})`)
      })
    }

    console.log('')

    // 2. Check subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false })

    if (subsError) {
      console.error('❌ Error fetching subscriptions:', subsError)
    } else {
      console.log(`✅ Found ${subscriptions?.length || 0} subscriptions`)
      subscriptions?.forEach(sub => {
        console.log(`   - ${sub.type} subscription (${sub.status}) - User: ${sub.user_id.substring(0, 8)}...`)
      })
    }

    console.log('')

    // 3. Check mosques
    const { data: mosques, error: mosquesError } = await supabase
      .from('mosques')
      .select('*')
      .order('created_at', { ascending: false })

    if (mosquesError) {
      console.error('❌ Error fetching mosques:', mosquesError)
    } else {
      console.log(`✅ Found ${mosques?.length || 0} mosques`)
      mosques?.forEach(mosque => {
        console.log(`   - ${mosque.name} (Code: ${mosque.mosque_code}) - Status: ${mosque.status}`)
        console.log(`     Subscription ID: ${mosque.subscription_id || 'NOT SET'}`)
      })
    }

    console.log('')

    // 4. Check businesses
    const { data: businesses, error: businessesError } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false })

    if (businessesError) {
      console.error('❌ Error fetching businesses:', businessesError)
    } else {
      console.log(`✅ Found ${businesses?.length || 0} businesses`)
      businesses?.forEach(business => {
        console.log(`   - ${business.name} - Status: ${business.status}`)
        console.log(`     Subscription ID: ${business.subscription_id || 'NOT SET'}`)
      })
    }

    console.log('')

    // 5. Check coupons
    const { data: coupons, error: couponsError } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })

    if (couponsError) {
      console.error('❌ Error fetching coupons:', couponsError)
    } else {
      console.log(`✅ Found ${coupons?.length || 0} coupons`)
      coupons?.forEach(coupon => {
        console.log(`   - ${coupon.title} - Status: ${coupon.status}`)
        console.log(`     Subscription ID: ${coupon.subscription_id || 'NOT SET'}`)
      })
    }

    console.log('')

    // 6. Check nonprofits
    const { data: nonprofits, error: nonprofitsError } = await supabase
      .from('nonprofits')
      .select('*')
      .order('created_at', { ascending: false })

    if (nonprofitsError) {
      console.error('❌ Error fetching nonprofits:', nonprofitsError)
    } else {
      console.log(`✅ Found ${nonprofits?.length || 0} nonprofits`)
      nonprofits?.forEach(nonprofit => {
        console.log(`   - ${nonprofit.name} - Status: ${nonprofit.status}`)
        console.log(`     Subscription ID: ${nonprofit.subscription_id || 'NOT SET'}`)
      })
    }

    console.log('\n📊 Summary:')
    console.log(`   Users: ${users?.length || 0}`)
    console.log(`   Subscriptions: ${subscriptions?.length || 0}`)
    console.log(`   Mosques: ${mosques?.length || 0}`)
    console.log(`   Businesses: ${businesses?.length || 0}`)
    console.log(`   Coupons: ${coupons?.length || 0}`)
    console.log(`   Nonprofits: ${nonprofits?.length || 0}`)

    // 7. Check for orphaned entities (entities without subscriptions)
    console.log('\n⚠️  Checking for orphaned entities...')
    
    const orphanedMosques = mosques?.filter(m => !m.subscription_id) || []
    const orphanedBusinesses = businesses?.filter(b => !b.subscription_id) || []
    const orphanedCoupons = coupons?.filter(c => !c.subscription_id) || []
    const orphanedNonprofits = nonprofits?.filter(n => !n.subscription_id) || []

    if (orphanedMosques.length > 0) {
      console.log(`   ⚠️  ${orphanedMosques.length} mosques without subscription_id`)
    }
    if (orphanedBusinesses.length > 0) {
      console.log(`   ⚠️  ${orphanedBusinesses.length} businesses without subscription_id`)
    }
    if (orphanedCoupons.length > 0) {
      console.log(`   ⚠️  ${orphanedCoupons.length} coupons without subscription_id`)
    }
    if (orphanedNonprofits.length > 0) {
      console.log(`   ⚠️  ${orphanedNonprofits.length} nonprofits without subscription_id`)
    }

    if (orphanedMosques.length === 0 && orphanedBusinesses.length === 0 && 
        orphanedCoupons.length === 0 && orphanedNonprofits.length === 0) {
      console.log('   ✅ No orphaned entities found')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkAdminData()
