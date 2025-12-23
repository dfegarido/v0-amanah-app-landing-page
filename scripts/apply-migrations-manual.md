# Manual Migration Guide

Since the Supabase JavaScript client doesn't support running DDL statements directly, you need to run these migrations manually in the Supabase Dashboard.

## Steps to Run Migrations

### Option 1: Supabase Dashboard SQL Editor (Recommended)

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **SQL Editor** in the left sidebar
3. Create a new query
4. Copy and paste the content of each migration file in order:
   - First: `supabase/migrations/001_initial_schema.sql`
   - Second: `supabase/migrations/002_rls_policies.sql`
   - Third: `supabase/migrations/003_auth_trigger.sql`
5. Click **Run** for each migration
6. Verify that each migration completes successfully

### Option 2: Using psql (Command Line)

If you have PostgreSQL installed:

\`\`\`bash
# Set the database URL
export DATABASE_URL="postgresql://postgres:dM6odMPPgGUBOx3V@db.pbjqcijbhheueqsgwzxv.supabase.co:5432/postgres"

# Run each migration
psql $DATABASE_URL -f supabase/migrations/001_initial_schema.sql
psql $DATABASE_URL -f supabase/migrations/002_rls_policies.sql
psql $DATABASE_URL -f supabase/migrations/003_auth_trigger.sql
\`\`\`

### Option 3: Using Supabase CLI

\`\`\`bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Link to your project
supabase link --project-ref pbjqcijbhheueqsgwzxv

# Push migrations
supabase db push
\`\`\`

## Verification

After running the migrations, verify in the Supabase Dashboard:

1. **Tables Created:**
   - Go to **Database** → **Tables**
   - Check for: `users`, `businesses`, `mosques`

2. **RLS Enabled:**
   - Click on each table
   - Check that "Enable Row Level Security (RLS)" is ON
   - View the policies tab to see all policies

3. **Trigger Created:**
   - Go to **Database** → **Functions**
   - Check for: `handle_new_user` function
   - Go to **Database** → **Triggers**
   - Check for: `on_auth_user_created` trigger

## Troubleshooting

### Error: "relation already exists"
- Some tables might already exist
- You can drop them first or skip that part of the migration

### Error: "permission denied"
- Make sure you're using the correct database credentials
- Check that you have admin/owner access to the project

### Error: "syntax error"
- Copy the entire SQL file content
- Don't copy line by line
- Make sure there are no truncated statements
