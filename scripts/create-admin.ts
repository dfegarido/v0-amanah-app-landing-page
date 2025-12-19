import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createAdminUser(email: string) {
  console.log('🔍 Looking for user:', email)
  
  // Check if user exists
  const { data: existingUser, error: findError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (findError) {
    if (findError.code === 'PGRST116') {
      console.error('❌ User not found!')
      console.error('Please register this account first at: http://localhost:3000/member/register')
      console.error(`Email: ${email}`)
      process.exit(1)
    }
    console.error('❌ Error checking user:', findError)
    process.exit(1)
  }

  console.log('✓ User found:', existingUser.name)
  console.log('  Current role:', existingUser.role)

  if (existingUser.role === 'admin') {
    console.log('✓ User is already an admin!')
    return
  }

  // Update to admin
  console.log('\n🔄 Updating user to admin role...')
  
  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('email', email)
    .select()
    .single()

  if (updateError) {
    console.error('❌ Error updating user:', updateError)
    process.exit(1)
  }

  console.log('✅ Successfully upgraded to admin!')
  console.log('\nUser Details:')
  console.log('  Email:', updatedUser.email)
  console.log('  Name:', updatedUser.name)
  console.log('  Role:', updatedUser.role)
  console.log('  ID:', updatedUser.id)
  
  console.log('\n🎉 Admin account created successfully!')
  console.log('\nNext steps:')
  console.log('1. Logout if currently logged in')
  console.log('2. Go to: http://localhost:3000/auth/login')
  console.log('3. Login with:', email)
  console.log('4. You should see "Admin Portal" option')
  console.log('5. Access the admin dashboard at /admin')
}

// Get email from command line or use default
const email = process.argv[2] || 'rorounifix@gmail.com'

console.log('🚀 Admin User Setup\n')
createAdminUser(email).catch(error => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})

