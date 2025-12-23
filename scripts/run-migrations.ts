import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration(filePath: string) {
  console.log(`\n📝 Running migration: ${path.basename(filePath)}`)
  
  try {
    const sql = fs.readFileSync(filePath, 'utf-8')
    
    // Split SQL into individual statements (basic split by semicolon)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })
        
        if (error) {
          console.error(`❌ Error executing statement:`, error)
          console.error(`Statement: ${statement.substring(0, 100)}...`)
          throw error
        }
      }
    }
    
    console.log(`✅ Migration completed: ${path.basename(filePath)}`)
  } catch (error) {
    console.error(`❌ Migration failed: ${path.basename(filePath)}`, error)
    throw error
  }
}

async function runAllMigrations() {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
  
  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Migrations directory not found')
    process.exit(1)
  }
  
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort()
  
  console.log('🚀 Starting migrations...')
  console.log(`Found ${migrationFiles.length} migration files\n`)
  
  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file)
    await runMigration(filePath)
  }
  
  console.log('\n✅ All migrations completed successfully!')
}

// Run migrations
runAllMigrations().catch(error => {
  console.error('❌ Migration process failed:', error)
  process.exit(1)
})
