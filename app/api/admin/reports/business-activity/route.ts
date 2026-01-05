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

    // Get businesses
    let businessesQuery = supabaseAdmin
      .from('businesses')
      .select(`
        id,
        name,
        status,
        categories,
        city,
        state,
        affiliated_mosque_code,
        created_at,
        updated_at,
        users(id, name, email)
      `)
      .order('created_at', { ascending: false })

    if (startDate) {
      businessesQuery = businessesQuery.gte('created_at', startDate)
    }
    if (endDate) {
      businessesQuery = businessesQuery.lte('created_at', endDate)
    }

    const { data: businesses, error } = await businessesQuery

    if (error) {
      console.error('Error fetching businesses:', error)
      return errorResponse('Failed to fetch businesses', 500)
    }

    // Get mosques
    let mosquesQuery = supabaseAdmin
      .from('mosques')
      .select(`
        id,
        name,
        status,
        mosque_code,
        city,
        state,
        created_at,
        updated_at,
        users(id, name, email)
      `)
      .order('created_at', { ascending: false })

    if (startDate) {
      mosquesQuery = mosquesQuery.gte('created_at', startDate)
    }
    if (endDate) {
      mosquesQuery = mosquesQuery.lte('created_at', endDate)
    }

    const { data: mosques, error: mosquesError } = await mosquesQuery

    if (mosquesError) {
      console.error('Error fetching mosques:', mosquesError)
      return errorResponse('Failed to fetch mosques', 500)
    }

    if (format === 'pdf') {
      return generateBusinessActivityPDF(businesses || [], mosques || [])
    } else {
      return generateBusinessActivityCSV(businesses || [], mosques || [])
    }
  } catch (error: any) {
    console.error('Generate business activity report error:', error)
    return errorResponse(error.message || 'Internal server error', 500)
  }
}

function generateBusinessActivityCSV(businesses: any[], mosques: any[]): NextResponse {
  const headers = [
    'Type',
    'ID',
    'Name',
    'Status',
    'Owner Name',
    'Owner Email',
    'Location',
    'Categories',
    'Mosque Code',
    'Created At',
    'Updated At'
  ]

  const rows: any[] = []

  businesses.forEach(business => {
    rows.push([
      'Business',
      business.id,
      business.name,
      business.status,
      business.users?.name || '',
      business.users?.email || '',
      `${business.city || ''}, ${business.state || ''}`,
      business.categories?.join('; ') || '',
      business.affiliated_mosque_code || '',
      new Date(business.created_at).toISOString(),
      new Date(business.updated_at).toISOString()
    ])
  })

  mosques.forEach(mosque => {
    rows.push([
      'Mosque',
      mosque.id,
      mosque.name,
      mosque.status,
      mosque.users?.name || '',
      mosque.users?.email || '',
      `${mosque.city || ''}, ${mosque.state || ''}`,
      '',
      mosque.mosque_code || '',
      new Date(mosque.created_at).toISOString(),
      new Date(mosque.updated_at).toISOString()
    ])
  })

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="business-activity-report-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}

function generateBusinessActivityPDF(businesses: any[], mosques: any[]): NextResponse {
  const doc = new jsPDF()
  let yPosition = 20

  // Title
  doc.setFontSize(18)
  doc.text('Business Activity Report', 14, yPosition)
  yPosition += 10

  // Summary
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, yPosition)
  doc.text(`Total Businesses: ${businesses.length}`, 14, yPosition + 5)
  doc.text(`Total Mosques: ${mosques.length}`, 14, yPosition + 10)
  yPosition += 20

  // Businesses section
  if (businesses.length > 0) {
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('Businesses', 14, yPosition)
    yPosition += 8

    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.text('Name', 14, yPosition)
    doc.text('Status', 80, yPosition)
    doc.text('Owner', 110, yPosition)
    doc.text('Location', 150, yPosition)
    yPosition += 5

    doc.line(14, yPosition, 200, yPosition)
    yPosition += 5

    doc.setFont(undefined, 'normal')
    businesses.slice(0, 30).forEach((business) => {
      if (yPosition > 270) {
        doc.addPage()
        yPosition = 20
      }

      doc.text(business.name.substring(0, 25), 14, yPosition)
      doc.text(business.status.substring(0, 12), 80, yPosition)
      doc.text((business.users?.name || '').substring(0, 18), 110, yPosition)
      doc.text(`${business.city || ''}, ${business.state || ''}`.substring(0, 18), 150, yPosition)
      yPosition += 7
    })

    if (businesses.length > 30) {
      doc.addPage()
      yPosition = 20
      doc.setFontSize(10)
      doc.text(`... and ${businesses.length - 30} more businesses`, 14, yPosition)
      yPosition += 10
    }
  }

  // Mosques section
  if (mosques.length > 0) {
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 20
    } else {
      yPosition += 10
    }

    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('Mosques', 14, yPosition)
    yPosition += 8

    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.text('Name', 14, yPosition)
    doc.text('Status', 80, yPosition)
    doc.text('Code', 110, yPosition)
    doc.text('Owner', 140, yPosition)
    yPosition += 5

    doc.line(14, yPosition, 200, yPosition)
    yPosition += 5

    doc.setFont(undefined, 'normal')
    mosques.slice(0, 30).forEach((mosque) => {
      if (yPosition > 270) {
        doc.addPage()
        yPosition = 20
      }

      doc.text(mosque.name.substring(0, 30), 14, yPosition)
      doc.text(mosque.status.substring(0, 12), 80, yPosition)
      doc.text(String(mosque.mosque_code || ''), 110, yPosition)
      doc.text((mosque.users?.name || '').substring(0, 20), 140, yPosition)
      yPosition += 7
    })

    if (mosques.length > 30) {
      doc.addPage()
      yPosition = 20
      doc.setFontSize(10)
      doc.text(`... and ${mosques.length - 30} more mosques`, 14, yPosition)
    }
  }

  // Generate PDF buffer
  const pdfBuffer = doc.output('arraybuffer')
  const pdfUint8Array = new Uint8Array(pdfBuffer)

  return new NextResponse(pdfUint8Array, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="business-activity-report-${new Date().toISOString().split('T')[0]}.pdf"`,
    },
  })
}

