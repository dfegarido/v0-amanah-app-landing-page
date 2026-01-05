import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, errorResponse } from '@/lib/api-helpers'
import { getSupabaseAdmin } from '@/lib/admin-helpers'
import { jsPDF } from 'jspdf'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request)
    if (authResult.error) return authResult.error

    // Check if user is admin
    if (authResult.user.role !== 'admin') {
      return errorResponse('Unauthorized - Admin access required', 403)
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv' // 'csv' or 'pdf'
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    const supabaseAdmin = getSupabaseAdmin()

    // Get subscriptions (which represent events/activities)
    let subscriptionsQuery = supabaseAdmin
      .from('subscriptions')
      .select(`
        id,
        type,
        status,
        app_status,
        price_amount,
        currency,
        current_period_start,
        current_period_end,
        next_billing_date,
        created_at,
        updated_at,
        cancelled_at,
        users(id, name, email)
      `)
      .order('created_at', { ascending: false })

    if (startDate) {
      subscriptionsQuery = subscriptionsQuery.gte('created_at', startDate)
    }
    if (endDate) {
      subscriptionsQuery = subscriptionsQuery.lte('created_at', endDate)
    }

    const { data: subscriptions, error } = await subscriptionsQuery

    if (error) {
      console.error('Error fetching subscriptions:', error)
      return errorResponse('Failed to fetch subscriptions', 500)
    }

    // Get activity logs as events
    let activityLogsQuery = supabaseAdmin
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000) // Limit to prevent huge reports

    if (startDate) {
      activityLogsQuery = activityLogsQuery.gte('created_at', startDate)
    }
    if (endDate) {
      activityLogsQuery = activityLogsQuery.lte('created_at', endDate)
    }

    const { data: activityLogs } = await activityLogsQuery

    if (format === 'pdf') {
      return generateEventsPDF(subscriptions || [], activityLogs || [])
    } else {
      return generateEventsCSV(subscriptions || [], activityLogs || [])
    }
  } catch (error: any) {
    console.error('Generate events report error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

function generateEventsCSV(subscriptions: any[], activityLogs: any[]): NextResponse {
  const headers = [
    'Type',
    'ID',
    'Event Type',
    'Description',
    'User',
    'User Email',
    'Status',
    'Amount',
    'Currency',
    'Date',
    'Metadata'
  ]

  const rows: any[] = []

  // Add subscriptions
  subscriptions.forEach(sub => {
    rows.push([
      'Subscription',
      sub.id,
      sub.type,
      `${sub.type} subscription - ${sub.status}`,
      sub.users?.name || '',
      sub.users?.email || '',
      sub.status,
      sub.price_amount || '',
      sub.currency || '',
      new Date(sub.created_at).toISOString(),
      JSON.stringify({
        app_status: sub.app_status,
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end,
      })
    ])
  })

  // Add activity logs
  activityLogs.forEach(log => {
    rows.push([
      'Activity',
      log.id,
      log.action,
      log.action_description,
      log.admin_name || '',
      log.admin_email || '',
      '',
      '',
      '',
      new Date(log.created_at).toISOString(),
      JSON.stringify(log.metadata || {})
    ])
  })

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="events-report-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}

function generateEventsPDF(subscriptions: any[], activityLogs: any[]): NextResponse {
  const doc = new jsPDF()
  let yPosition = 20

  // Title
  doc.setFontSize(18)
  doc.text('Events Report', 14, yPosition)
  yPosition += 10

  // Summary
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, yPosition)
  doc.text(`Total Subscriptions: ${subscriptions.length}`, 14, yPosition + 5)
  doc.text(`Total Activities: ${activityLogs.length}`, 14, yPosition + 10)
  yPosition += 20

  // Subscriptions section
  if (subscriptions.length > 0) {
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('Subscriptions', 14, yPosition)
    yPosition += 8

    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.text('Type', 14, yPosition)
    doc.text('User', 60, yPosition)
    doc.text('Status', 120, yPosition)
    doc.text('Amount', 150, yPosition)
    yPosition += 5

    doc.line(14, yPosition, 200, yPosition)
    yPosition += 5

    doc.setFont(undefined, 'normal')
    subscriptions.slice(0, 40).forEach((sub) => {
      if (yPosition > 270) {
        doc.addPage()
        yPosition = 20
      }

      doc.text(sub.type.substring(0, 15), 14, yPosition)
      doc.text((sub.users?.name || '').substring(0, 20), 60, yPosition)
      doc.text(sub.status.substring(0, 15), 120, yPosition)
      doc.text(`${sub.currency || 'USD'} ${sub.price_amount || '0'}`, 150, yPosition)
      yPosition += 7
    })
  }

  // Activity logs section
  if (activityLogs.length > 0) {
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 20
    } else {
      yPosition += 10
    }

    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('Recent Activities', 14, yPosition)
    yPosition += 8

    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.text('Action', 14, yPosition)
    doc.text('Admin', 70, yPosition)
    doc.text('Date', 140, yPosition)
    yPosition += 5

    doc.line(14, yPosition, 200, yPosition)
    yPosition += 5

    doc.setFont(undefined, 'normal')
    activityLogs.slice(0, 40).forEach((log) => {
      if (yPosition > 270) {
        doc.addPage()
        yPosition = 20
      }

      doc.text(log.action.substring(0, 25), 14, yPosition)
      doc.text((log.admin_name || '').substring(0, 20), 70, yPosition)
      doc.text(new Date(log.created_at).toLocaleDateString(), 140, yPosition)
      yPosition += 7
    })
  }

  // Generate PDF buffer
  const pdfBuffer = doc.output('arraybuffer')
  const pdfUint8Array = new Uint8Array(pdfBuffer)

  return new NextResponse(pdfUint8Array, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="events-report-${new Date().toISOString().split('T')[0]}.pdf"`,
    },
  })
}

