import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, errorResponse } from '@/lib/api-helpers'
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create Supabase client with service role (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Generate a signed token for receipt access
function generateReceiptToken(donationId: string): string {
  const secret = process.env.RECEIPT_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default-secret'
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(donationId)
  return hmac.digest('hex').substring(0, 32)
}

// Verify receipt token
function verifyReceiptToken(donationId: string, token: string): boolean {
  try {
    const expectedToken = generateReceiptToken(donationId)
    const tokenBuf = new Uint8Array(Buffer.from(token, 'hex'))
    const expectedBuf = new Uint8Array(Buffer.from(expectedToken, 'hex'))
    if (tokenBuf.length !== expectedBuf.length) {
      return false
    }
    return crypto.timingSafeEqual(tokenBuf, expectedBuf)
  } catch {
    return false
  }
}

// GET /api/donations/[id]/receipt - Generate and download PDF receipt
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')

    // Get donation with related data using admin client
    const { data: donation, error: donationError } = await supabaseAdmin
      .from('donations')
      .select(`
        *,
        mosque:mosques(id, name, mosque_code, address, email, phone),
        user:users(id, name, email)
      `)
      .eq('id', id)
      .single()

    if (donationError || !donation) {
      return errorResponse('Donation not found', 404)
    }

    // Only generate receipt for succeeded donations
    if (donation.status !== 'succeeded') {
      return errorResponse('Receipt is only available for successful donations', 400)
    }

    // Verify access: either authenticated user OR valid token
    let hasAccess = false
    
    // Try authentication first
    const authResult = await requireAuth(request)
    if (!authResult.error && authResult.user) {
      // Authenticated user: check if they own the donation or are admin
      if (donation.user_id === authResult.user.id || authResult.user.role === 'admin') {
        hasAccess = true
      }
    }
    
    // If not authenticated, check token
    if (!hasAccess) {
      if (token && verifyReceiptToken(id, token)) {
        hasAccess = true
      } else {
        return errorResponse('Authentication required', 401)
      }
    }

    // Generate PDF using jsPDF
    const doc = new jsPDF({ format: 'letter', unit: 'pt' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 50
    let yPos = margin

    // Helper to convert hex color to RGB
    const hexToRgb = (hex: string): [number, number, number] => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      return result
        ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
        : [0, 0, 0]
    }

    // Header with logo
    try {
      const logoPath = path.join(process.cwd(), 'public', 'images', 'logo-20amanaah.png')
      if (fs.existsSync(logoPath)) {
        const logoData = fs.readFileSync(logoPath)
        const logoBase64 = logoData.toString('base64')
        doc.addImage(logoBase64, 'PNG', margin, yPos, 150, 50)
        yPos += 70
      } else {
        // If logo not found, use text header
        doc.setFontSize(24)
        doc.setTextColor(...hexToRgb('#667eea'))
        doc.setFont('helvetica', 'bold')
        doc.text('Amanah', margin, yPos)
        yPos += 40
      }
    } catch (error) {
      console.error('Error loading logo:', error)
      doc.setFontSize(24)
      doc.setTextColor(...hexToRgb('#667eea'))
      doc.setFont('helvetica', 'bold')
      doc.text('Amanah', margin, yPos)
      yPos += 40
    }

    // Receipt title
    yPos += 20
    doc.setFontSize(28)
    doc.setTextColor(...hexToRgb('#1f2937'))
    doc.setFont('helvetica', 'bold')
    doc.text('DONATION RECEIPT', margin, yPos)
    yPos += 40

    // Receipt number and date
    const receiptNumber = donation.id.substring(0, 8).toUpperCase()
    const receiptDate = new Date(donation.paid_at || donation.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    
    doc.setFontSize(12)
    doc.setTextColor(...hexToRgb('#6b7280'))
    doc.setFont('helvetica', 'normal')
    doc.text(`Receipt #: ${receiptNumber}`, margin, yPos)
    yPos += 20
    doc.text(`Date: ${receiptDate}`, margin, yPos)
    yPos += 40

    // Donor information
    doc.setFontSize(16)
    doc.setTextColor(...hexToRgb('#374151'))
    doc.setFont('helvetica', 'bold')
    doc.text('Donor Information', margin, yPos)
    yPos += 30
    
    doc.setFontSize(12)
    doc.setTextColor(...hexToRgb('#1f2937'))
    doc.setFont('helvetica', 'normal')
    
    const donorName = donation.donor_name || donation.user?.name || 'Anonymous'
    const donorEmail = donation.donor_email || donation.user?.email || ''
    
    doc.text(`Name: ${donorName}`, margin, yPos)
    yPos += 20
    if (donorEmail) {
      doc.text(`Email: ${donorEmail}`, margin, yPos)
      yPos += 20
    }
    yPos += 10

    // Donation details
    doc.setFontSize(16)
    doc.setTextColor(...hexToRgb('#374151'))
    doc.setFont('helvetica', 'bold')
    doc.text('Donation Details', margin, yPos)
    yPos += 30
    
    doc.setFontSize(12)
    doc.setTextColor(...hexToRgb('#1f2937'))
    doc.setFont('helvetica', 'normal')
    
    const amount = parseFloat(donation.amount)
    const currency = (donation.currency || 'USD').toUpperCase()
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount)
    
    doc.text(`Amount: ${formattedAmount}`, margin, yPos)
    yPos += 20
    
    if (donation.mosque?.name) {
      doc.text(`Recipient: ${donation.mosque.name}`, margin, yPos)
      yPos += 20
      if (donation.mosque.address) {
        doc.text(`Address: ${donation.mosque.address}`, margin, yPos)
        yPos += 20
      }
    } else {
      doc.text('Recipient: Amanah Organization', margin, yPos)
      yPos += 20
    }
    
    if (donation.purpose) {
      doc.text(`Purpose: ${donation.purpose}`, margin, yPos)
      yPos += 20
    }
    if (donation.campaign_name) {
      doc.text(`Campaign: ${donation.campaign_name}`, margin, yPos)
      yPos += 20
    }
    yPos += 10

    // Payment information
    doc.setFontSize(16)
    doc.setTextColor(...hexToRgb('#374151'))
    doc.setFont('helvetica', 'bold')
    doc.text('Payment Information', margin, yPos)
    yPos += 30
    
    doc.setFontSize(12)
    doc.setTextColor(...hexToRgb('#1f2937'))
    doc.setFont('helvetica', 'normal')
    
    if (donation.payment_provider) {
      doc.text(`Payment Method: ${donation.payment_provider}`, margin, yPos)
      yPos += 20
    }
    if (donation.provider_payment_id) {
      doc.text(`Transaction ID: ${donation.provider_payment_id}`, margin, yPos)
      yPos += 20
    }

    // Footer
    const footerY = pageHeight - 100
    doc.setFontSize(10)
    doc.setTextColor(...hexToRgb('#6b7280'))
    doc.setFont('helvetica', 'normal')
    doc.text(
      'Thank you for your generous donation. Barak Allahu feekum (May Allah reward you with goodness).',
      pageWidth / 2,
      footerY,
      { align: 'center', maxWidth: pageWidth - 2 * margin }
    )
    
    doc.text(
      'Amanah Organization | support@amanah.app | https://amanah.app',
      pageWidth / 2,
      footerY + 20,
      { align: 'center' }
    )

    // Generate PDF buffer
    const pdfArrayBuffer = doc.output('arraybuffer') as ArrayBuffer
    const pdfUint8Array = new Uint8Array(pdfArrayBuffer)

    // Return PDF as response
    return new NextResponse(pdfUint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${receiptNumber}.pdf"`,
        'Content-Length': pdfUint8Array.length.toString(),
      },
    })
  } catch (error: any) {
    console.error('Get donation receipt error:', error)
    return errorResponse('Internal server error', 500)
  }
}
