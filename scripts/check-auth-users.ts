/**
 * Script to check Supabase Auth users
 * Run with: npx tsx scripts/check-auth-users.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  process.exit(1)
}

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkAuthUsers() {
  console.log('🔍 Checking Supabase Auth users...\n')

  try {
    // Try to list auth users (requires service role key)
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error('❌ Error fetching auth users (need service role key):', authError.message)
      console.log('\n💡 To check auth users, add SUPABASE_SERVICE_ROLE_KEY to .env.local')
      console.log('   You can find this in Supabase Dashboard > Settings > API')
    } else {
      console.log(`✅ Found ${authData.users.length} auth users:\n`)
      
      for (const user of authData.users) {
        console.log(`📧 ${user.email}`)
        console.log(`   ID: ${user.id}`)
        console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`)
        console.log(`   Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`)
        console.log(`   Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`)
        console.log('')
      }
    }

    // Check public.users table
    console.log('📊 Checking public.users table...\n')
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('*')

    if (publicError) {
      console.error('❌ Error fetching public users:', publicError)
    } else {
      console.log(`✅ Found ${publicUsers?.length || 0} users in public.users table:\n`)
      
      publicUsers?.forEach(user => {
        console.log(`📧 ${user.email}`)
        console.log(`   Name: ${user.name || 'Not set'}`)
        console.log(`   Role: ${user.role}`)
        console.log(`   ID: ${user.id}`)
        console.log('')
      })
    }

    // Compare
    if (authData?.users && publicUsers) {
      const authIds = new Set(authData.users.map(u => u.id))
      const publicIds = new Set(publicUsers.map(u => u.id))
      
      const inAuthNotPublic = authData.users.filter(u => !publicIds.has(u.id))
      const inPublicNotAuth = publicUsers.filter(u => !authIds.has(u.id))
      
      if (inAuthNotPublic.length > 0) {
        console.log(`⚠️  ${inAuthNotPublic.length} users in auth.users but NOT in public.users:`)
        inAuthNotPublic.forEach(u => console.log(`   - ${u.email} (${u.id})`))
        console.log('')
      }
      
      if (inPublicNotAuth.length > 0) {
        console.log(`⚠️  ${inPublicNotAuth.length} users in public.users but NOT in auth.users:`)
        inPublicNotAuth.forEach(u => console.log(`   - ${u.email} (${u.id})`))
        console.log('')
      }
      
      if (inAuthNotPublic.length === 0 && inPublicNotAuth.length === 0) {
        console.log('✅ Auth and public users are in sync!')
      }
    }

  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message)
  }
}

checkAuthUsers()
