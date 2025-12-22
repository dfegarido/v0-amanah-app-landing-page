/**
 * Script to test if admin can access user data
 * This simulates what the admin API endpoint does
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAdminAccess() {
  console.log('🔐 Testing admin access to data...\n')

  try {
    // Login as admin
    console.log('1️⃣ Logging in as admin...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@gmail.com',
      password: 'admin123' // Update if different
    })

    if (authError) {
      console.error('❌ Admin login failed:', authError.message)
      console.log('\n💡 Update the admin password in this script')
      return
    }

    console.log(`✅ Logged in as: ${authData.user.email}\n`)

    // Get admin's access token
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token

    if (!accessToken) {
      console.error('❌ No access token found')
      return
    }

    console.log('🔑 Access token obtained\n')

    // Create authenticated client
    const authenticatedSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    })

    // Test 1: Fetch all users
    console.log('2️⃣ Testing: Fetch all users...')
    const { data: users, error: usersError } = await authenticatedSupabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
    } else {
      console.log(`✅ Successfully fetched ${users?.length || 0} users`)
      users?.forEach(u => console.log(`   - ${u.email} (${u.role})`))
    }
    console.log('')

    // Test 2: Fetch all subscriptions
    console.log('3️⃣ Testing: Fetch all subscriptions...')
    const { data: subscriptions, error: subsError } = await authenticatedSupabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false })

    if (subsError) {
      console.error('❌ Error fetching subscriptions:', subsError)
      console.error('   Code:', subsError.code)
      console.error('   Details:', subsError.details)
      console.error('   Hint:', subsError.hint)
    } else {
      console.log(`✅ Successfully fetched ${subscriptions?.length || 0} subscriptions`)
      subscriptions?.forEach(s => {
        console.log(`   - ${s.type} (${s.status}) - User: ${s.user_id.substring(0, 8)}...`)
      })
    }
    console.log('')

    // Test 3: Fetch all mosques
    console.log('4️⃣ Testing: Fetch all mosques...')
    const { data: mosques, error: mosquesError } = await authenticatedSupabase
      .from('mosques')
      .select('*')
      .order('created_at', { ascending: false })

    if (mosquesError) {
      console.error('❌ Error fetching mosques:', mosquesError)
      console.error('   Code:', mosquesError.code)
      console.error('   Details:', mosquesError.details)
      console.error('   Hint:', mosquesError.hint)
    } else {
      console.log(`✅ Successfully fetched ${mosques?.length || 0} mosques`)
      mosques?.forEach(m => {
        console.log(`   - ${m.name} (Code: ${m.mosque_code}) - Status: ${m.status}`)
        console.log(`     Subscription ID: ${m.subscription_id || 'NULL'}`)
      })
    }
    console.log('')

    // Test 4: Fetch all businesses
    console.log('5️⃣ Testing: Fetch all businesses...')
    const { data: businesses, error: businessesError } = await authenticatedSupabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false })

    if (businessesError) {
      console.error('❌ Error fetching businesses:', businessesError)
      console.error('   Code:', businessesError.code)
    } else {
      console.log(`✅ Successfully fetched ${businesses?.length || 0} businesses`)
      businesses?.forEach(b => {
        console.log(`   - ${b.name} - Status: ${b.status}`)
        console.log(`     Subscription ID: ${b.subscription_id || 'NULL'}`)
      })
    }
    console.log('')

    // Test 5: Try the full query that the API does
    console.log('6️⃣ Testing: Full API query (with entity joins)...')
    if (users && users.length > 0) {
      const testUser = users[0]
      console.log(`   Testing with user: ${testUser.email}`)
      
      const { data: userSubs, error: userSubsError } = await authenticatedSupabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', testUser.id)

      if (userSubsError) {
        console.error('❌ Error:', userSubsError)
      } else {
        console.log(`✅ Found ${userSubs?.length || 0} subscriptions for this user`)
        
        // Try to fetch entity for each subscription
        for (const sub of userSubs || []) {
          const entityTable = sub.type === 'business' ? 'businesses' : `${sub.type}s`
          console.log(`   Checking ${entityTable} for subscription ${sub.id}...`)
          
          const { data: entity, error: entityError } = await authenticatedSupabase
            .from(entityTable)
            .select('*')
            .eq('subscription_id', sub.id)
            .single()

          if (entityError) {
            console.error(`   ❌ Error fetching ${entityTable}:`, entityError.message)
          } else {
            console.log(`   ✅ Found entity: ${entity?.name || entity?.title}`)
          }
        }
      }
    }
    console.log('')

    // Test 6: Check RLS policies
    console.log('7️⃣ Testing: Check RLS policies...')
    const { data: policies, error: policiesError } = await authenticatedSupabase
      .rpc('exec_sql', { 
        sql: `SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
              FROM pg_policies 
              WHERE tablename IN ('users', 'subscriptions', 'mosques', 'businesses') 
              ORDER BY tablename, policyname;`
      })

    if (policiesError) {
      console.log('⚠️  Cannot fetch policies (need special permissions)')
    } else {
      console.log('✅ RLS Policies:', policies)
    }

    await supabase.auth.signOut()

  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message)
    console.error(error)
  }
}

testAdminAccess()

