/**
 * Script to create a test mosque for admin dashboard testing
 * Run with: npx tsx scripts/create-test-mosque.ts
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

async function createTestMosque() {
  console.log('🕌 Creating test mosque...\n')

  try {
    // Login as a user (let's use the regular user)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'user@gmail.com',
      password: 'password123' // You'll need to know the password
    })

    if (authError) {
      console.error('❌ Login failed:', authError.message)
      console.log('\n💡 Try logging in as admin@gmail.com or rorounifix@gmail.com')
      console.log('   Update the email/password in this script')
      return
    }

    console.log(`✅ Logged in as: ${authData.user.email}`)
    const userId = authData.user.id

    // Step 1: Create subscription
    console.log('\n📝 Creating subscription...')
    
    const currentDate = new Date()
    const nextBillingDate = new Date(currentDate)
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        type: 'mosque',
        status: 'active',
        app_status: 'pending_verification',
        stripe_subscription_id: `sim_sub_${Date.now()}`,
        stripe_customer_id: `sim_cus_${userId.slice(0, 8)}`,
        stripe_price_id: 'sim_price_mosque',
        price_amount: 100.00,
        currency: 'usd',
        current_period_start: currentDate.toISOString(),
        current_period_end: nextBillingDate.toISOString(),
        next_billing_date: nextBillingDate.toISOString()
      })
      .select()
      .single()

    if (subError) {
      console.error('❌ Error creating subscription:', subError)
      return
    }

    console.log(`✅ Subscription created: ${subscription.id}`)

    // Step 2: Get next mosque code
    console.log('\n🔢 Getting next mosque code...')
    const { data: mosqueCodeData, error: codeError } = await supabase.rpc('get_next_mosque_code')
    
    if (codeError) {
      console.error('❌ Error getting mosque code:', codeError)
      console.log('   The function might not exist. Creating mosque with code 1...')
    }

    const mosqueCode = mosqueCodeData || 1
    console.log(`✅ Mosque code: ${mosqueCode}`)

    // Step 3: Create mosque
    console.log('\n🕌 Creating mosque record...')
    const { data: mosque, error: mosqueError } = await supabase
      .from('mosques')
      .insert({
        subscription_id: subscription.id,
        user_id: userId,
        name: 'Test Islamic Center',
        mosque_code: mosqueCode,
        address: '123 Main Street',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'USA',
        phone: '(555) 123-4567',
        email: 'info@testmosque.org',
        website: 'https://testmosque.org',
        contact_name: 'Imam Abdullah',
        description: 'A test mosque created for admin dashboard testing',
        status: 'active', // Set to active so it shows up
        social_media: {
          facebook: 'https://facebook.com/testmosque',
          instagram: '@testmosque',
          twitter: '@testmosque',
          other: null
        }
      })
      .select()
      .single()

    if (mosqueError) {
      console.error('❌ Error creating mosque:', mosqueError)
      console.error('   Details:', JSON.stringify(mosqueError, null, 2))
      
      // Cleanup: delete subscription
      await supabase.from('subscriptions').delete().eq('id', subscription.id)
      return
    }

    console.log(`✅ Mosque created: ${mosque.name} (Code: ${mosque.mosque_code})`)
    console.log(`   ID: ${mosque.id}`)
    console.log(`   Status: ${mosque.status}`)
    console.log(`   Subscription ID: ${mosque.subscription_id}`)

    console.log('\n✅ Test mosque created successfully!')
    console.log('\n📊 Summary:')
    console.log(`   User: ${authData.user.email}`)
    console.log(`   Subscription ID: ${subscription.id}`)
    console.log(`   Mosque: ${mosque.name}`)
    console.log(`   Mosque Code: ${mosque.mosque_code}`)
    console.log(`   Status: ${mosque.status}`)
    
    console.log('\n🎉 You can now check the admin dashboard at /admin')

    // Logout
    await supabase.auth.signOut()

  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message)
  }
}

createTestMosque()

