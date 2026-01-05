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

    // Build query
    let donationsQuery = supabaseAdmin
      .from('donations')
      .select(`
        id,
        amount,
        currency,
        status,
        donor_name,
        donor_email,
        payment_provider,
        created_at,
        paid_at,
        mosques(name, mosque_code)
      `)
      .order('created_at', { ascending: false })

    if (startDate) {
      donationsQuery = donationsQuery.gte('created_at', startDate)
    }
    if (endDate) {
      donationsQuery = donationsQuery.lte('created_at', endDate)
    }

    const { data: donations, error } = await donationsQuery

    if (error) {
      console.error('Error fetching donations:', error)
      return errorResponse('Failed to fetch donations', 500)
    }

    if (format === 'pdf') {
      return generateDonationsPDF(donations || [])
    } else {
      return generateDonationsCSV(donations || [])
    }
  } catch (error: any) {
    console.error('Generate donations report error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

function generateDonationsCSV(donations: any[]): NextResponse {
  const headers = [
    'ID',
    'Date',
    'Donor Name',
    'Donor Email',
    'Amount',
    'Currency',
    'Status',
    'Payment Provider',
    'Mosque',
    'Mosque Code',
    'Paid At'
  ]

  const rows = donations.map(donation => [
    donation.id,
    new Date(donation.created_at).toISOString(),
    donation.donor_name || 'Anonymous',
    donation.donor_email || '',
    donation.amount,
    donation.currency || 'USD',
    donation.status,
    donation.payment_provider || '',
    donation.mosques?.name || '',
    donation.mosques?.mosque_code || '',
    donation.paid_at ? new Date(donation.paid_at).toISOString() : ''
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="donations-report-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}

function generateDonationsPDF(donations: any[]): NextResponse {
  const doc = new jsPDF()
  let yPosition = 20

  // Title
  doc.setFontSize(18)
  doc.text('Donations Report', 14, yPosition)
  yPosition += 10

  // Date range
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, yPosition)
  doc.text(`Total Donations: ${donations.length}`, 14, yPosition + 5)
  yPosition += 15

  // Table headers
  doc.setFontSize(9)
  doc.setFont(undefined, 'bold')
  doc.text('Date', 14, yPosition)
  doc.text('Donor', 50, yPosition)
  doc.text('Amount', 90, yPosition)
  doc.text('Status', 120, yPosition)
  doc.text('Provider', 150, yPosition)
  yPosition += 5

  // Draw line
  doc.line(14, yPosition, 200, yPosition)
  yPosition += 5

  // Table rows
  doc.setFont(undefined, 'normal')
  donations.slice(0, 50).forEach((donation, index) => {
    if (yPosition > 270) {
      doc.addPage()
      yPosition = 20
    }

    const date = new Date(donation.created_at).toLocaleDateString()
    const donor = (donation.donor_name || 'Anonymous').substring(0, 20)
    const amount = `${donation.currency || 'USD'} ${donation.amount}`
    const status = donation.status.substring(0, 15)
    const provider = (donation.payment_provider || '').substring(0, 10)

    doc.text(date, 14, yPosition)
    doc.text(donor, 50, yPosition)
    doc.text(amount, 90, yPosition)
    doc.text(status, 120, yPosition)
    doc.text(provider, 150, yPosition)

    yPosition += 7
  })

  if (donations.length > 50) {
    doc.addPage()
    yPosition = 20
    doc.setFontSize(10)
    doc.text(`... and ${donations.length - 50} more donations`, 14, yPosition)
  }

  // Generate PDF buffer
  const pdfBuffer = doc.output('arraybuffer')
  const pdfUint8Array = new Uint8Array(pdfBuffer)

  return new NextResponse(pdfUint8Array, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="donations-report-${new Date().toISOString().split('T')[0]}.pdf"`,
    },
  })
}

