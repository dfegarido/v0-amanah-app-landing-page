import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create admin Supabase client with service role
export function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Activity log action types
export type ActivityAction =
  | 'business_verified'
  | 'business_rejected'
  | 'business_deactivated'
  | 'mosque_verified'
  | 'mosque_rejected'
  | 'mosque_deactivated'
  | 'subscription_approved'
  | 'subscription_rejected'
  | 'subscription_cancelled'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'donation_refunded'
  | 'donation_updated'
  | 'settings_updated'
  | 'report_generated'
  | 'other'

// Create activity log entry
export async function createActivityLog(params: {
  adminId: string
  action: ActivityAction
  actionDescription: string
  entityType?: string
  entityId?: string
  entityName?: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}) {
  const supabaseAdmin = getSupabaseAdmin()

  const { data: admin } = await supabaseAdmin
    .from('users')
    .select('email, name')
    .eq('id', params.adminId)
    .single()

  const { data: log, error } = await supabaseAdmin
    .from('activity_logs')
    .insert({
      admin_id: params.adminId,
      admin_email: admin?.email,
      admin_name: admin?.name,
      action: params.action,
      action_description: params.actionDescription,
      entity_type: params.entityType,
      entity_id: params.entityId,
      entity_name: params.entityName,
      metadata: params.metadata || {},
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating activity log:', error)
    return null
  }

  return log
}

