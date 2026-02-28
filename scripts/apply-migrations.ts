// Script to apply pending migrations to Supabase
// Run with: npx tsx scripts/apply-migrations.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vfdnvnevsfszuhmmjqgy.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY env var is required to run migrations')

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
})

async function applyMigrations() {
    console.log('🚀 Applying pending migrations...\n')

    // Migration 002: Add onboarding_completed and razorpay_subscription_id
    console.log('📦 Migration 002: Adding onboarding fields...')
    const { error: m1 } = await supabase.from('users').select('onboarding_completed').limit(1)
    if (m1 && m1.message.includes("column")) {
        // Column doesn't exist yet, we need to add it via SQL
        console.log('  ⚠️ Column onboarding_completed not found — need to run SQL migration')
        console.log('  → Please run migration 002 in the Supabase SQL Editor:')
        console.log('  ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;')
        console.log('  ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;\n')
    } else {
        console.log('  ✅ onboarding_completed column already exists\n')
    }

    // Check for is_super_admin
    const { error: m2 } = await supabase.from('users').select('is_super_admin').limit(1)
    if (m2 && m2.message.includes("column")) {
        console.log('  ⚠️ Column is_super_admin not found — need to run SQL migration')
        console.log('  → ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;\n')
    } else {
        console.log('  ✅ is_super_admin column already exists\n')
    }

    // Check for website column on products
    const { error: m3 } = await supabase.from('products').select('website').limit(1)
    if (m3 && m3.message.includes("column")) {
        console.log('  ⚠️ Column website not found on products — need to run SQL migration')
        console.log('  → ALTER TABLE public.products ADD COLUMN IF NOT EXISTS website text;\n')
    } else {
        console.log('  ✅ products.website column already exists\n')
    }

    // List all users to check current state
    const { data: users, error: usersErr } = await supabase.from('users').select('id, email, org_id, role')
    console.log('📊 Current users:', usersErr ? usersErr.message : JSON.stringify(users, null, 2))

    // List all orgs
    const { data: orgs, error: orgsErr } = await supabase.from('organizations').select('id, name, plan')
    console.log('📊 Current orgs:', orgsErr ? orgsErr.message : JSON.stringify(orgs, null, 2))

    // List all workspaces
    const { data: workspaces, error: wsErr } = await supabase.from('workspaces').select('id, org_id, name')
    console.log('📊 Current workspaces:', wsErr ? wsErr.message : JSON.stringify(workspaces, null, 2))
}

applyMigrations().catch(console.error)
