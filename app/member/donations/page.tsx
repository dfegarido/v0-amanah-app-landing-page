"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Heart,
  ArrowLeft,
  Download,
  Building2,
  Calendar as CalendarIcon,
  DollarSign,
  Loader2,
  Filter,
  Receipt,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { useAuth } from "@/lib/auth-context"
import { authenticatedGet, authenticatedFetch } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

interface Donation {
  id: string
  amount: number
  currency: string
  status: string
  payment_provider: string
  mosque?: {
    id: string
    name: string
    mosque_code: number
  }
  campaign_name?: string
  purpose?: string
  created_at: string
  paid_at?: string
  donor_name?: string
  donor_email?: string
}

export default function DonationsHistoryPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [isFiltering, setIsFiltering] = useState(false) // Subtle loading indicator for filters
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [mosqueFilter, setMosqueFilter] = useState<string>("all")
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, authLoading, router])

  // Reset to page 1 when filters change
  useEffect(() => {
    if (user && currentPage !== 1) {
      setCurrentPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, mosqueFilter, startDate, endDate])

  // Initial load only
  useEffect(() => {
    if (user) {
      fetchDonations(true) // Pass true for initial load
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Filter changes - optimistic update (no blocking loading)
  useEffect(() => {
    if (user && !loading) {
      // Small delay to debounce rapid filter changes
      const timeoutId = setTimeout(() => {
        fetchDonations(false) // Not initial load, use subtle loading
      }, 100)
      
      return () => clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, mosqueFilter, startDate, endDate, currentPage])

  const fetchDonations = async (isInitialLoad = false) => {
    try {
      // Only show full loading on initial load, otherwise use subtle filtering indicator
      if (isInitialLoad) {
        setLoading(true)
      } else {
        setIsFiltering(true)
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      })

      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      if (mosqueFilter !== "all" && mosqueFilter) {
        params.append("mosque_id", mosqueFilter)
      }
      if (startDate) {
        // Ensure date is in ISO format for API (start of day in local timezone, then convert to UTC)
        const localStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0)
        params.append("start_date", localStartDate.toISOString())
      }
      if (endDate) {
        // Ensure date is in ISO format for API (end of day in local timezone, then convert to UTC)
        const localEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999)
        params.append("end_date", localEndDate.toISOString())
      }

      const apiUrl = `/api/donations?${params.toString()}`
      console.log('[Donations] Fetching with params:', apiUrl) // Debug log
      
      const response: any = await authenticatedGet(apiUrl)

      if (response.success && response.data) {
        console.log('[Donations] Received donations:', response.data.donations?.length || 0) // Debug log
        setDonations(response.data.donations || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
      } else {
        console.error('[Donations] API error:', response.error) // Debug log
      }
    } catch (error: any) {
      console.error("Error fetching donations:", error)
      toast({
        title: "Error",
        description: "Failed to load donation history",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setIsFiltering(false)
    }
  }

  const handleDownloadReceipt = async (donationId: string) => {
    try {
      // Fetch receipt data
      const response: any = await authenticatedGet(`/api/donations/${donationId}/receipt`)
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch receipt data')
      }

      const receipt = response.data

      // Dynamically import jspdf for client-side PDF generation
      const { jsPDF } = await import('jspdf')
      
      const doc = new jsPDF()
      let yPos = 20

      // Header
      doc.setFontSize(24)
      doc.text('DONATION RECEIPT', 105, yPos, { align: 'center' })
      yPos += 15

      // Receipt Number and Date
      doc.setFontSize(12)
      doc.text(`Receipt Number: ${receipt.receipt_number}`, 105, yPos, { align: 'center' })
      yPos += 7
      doc.text(`Date: ${new Date(receipt.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 105, yPos, { align: 'center' })
      yPos += 15

      // Donor Information
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('DONOR INFORMATION', 20, yPos)
      doc.setFont(undefined, 'normal')
      yPos += 10
      doc.setFontSize(12)
      doc.text(`Name: ${receipt.donor.name}`, 20, yPos)
      yPos += 7
      if (receipt.donor.email) {
        doc.text(`Email: ${receipt.donor.email}`, 20, yPos)
        yPos += 7
      }
      yPos += 5

      // Donation Details
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('DONATION DETAILS', 20, yPos)
      doc.setFont(undefined, 'normal')
      yPos += 10
      doc.setFontSize(12)
      doc.text(`Amount: ${receipt.donation.currency.toUpperCase()} ${Number(receipt.donation.amount).toFixed(2)}`, 20, yPos)
      yPos += 7
      doc.text(`Purpose: ${receipt.donation.purpose}`, 20, yPos)
      yPos += 7
      if (receipt.donation.campaign) {
        doc.text(`Campaign: ${receipt.donation.campaign}`, 20, yPos)
        yPos += 7
      }
      yPos += 5

      // Recipient
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('RECIPIENT', 20, yPos)
      doc.setFont(undefined, 'normal')
      yPos += 10
      doc.setFontSize(12)
      doc.text(receipt.recipient.name, 20, yPos)
      yPos += 7
      if (receipt.recipient.address) {
        doc.text(receipt.recipient.address, 20, yPos)
        yPos += 7
      }
      if (receipt.recipient.email) {
        doc.text(`Email: ${receipt.recipient.email}`, 20, yPos)
        yPos += 7
      }
      if (receipt.recipient.phone) {
        doc.text(`Phone: ${receipt.recipient.phone}`, 20, yPos)
        yPos += 7
      }
      yPos += 5

      // Payment Information
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('PAYMENT INFORMATION', 20, yPos)
      doc.setFont(undefined, 'normal')
      yPos += 10
      doc.setFontSize(12)
      doc.text(`Provider: ${receipt.payment.provider.toUpperCase()}`, 20, yPos)
      yPos += 7
      doc.text(`Transaction ID: ${receipt.payment.transaction_id}`, 20, yPos)
      yPos += 7
      doc.text(`Payment Date: ${new Date(receipt.payment.payment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 20, yPos)
      yPos += 15

      // Footer
      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('Thank you for your generous donation!', 105, yPos, { align: 'center' })
      doc.setFont(undefined, 'normal')
      yPos += 10
      doc.setFontSize(10)
      doc.text(receipt.organization.name, 105, yPos, { align: 'center' })
      yPos += 5
      doc.text(receipt.organization.email, 105, yPos, { align: 'center' })
      yPos += 5
      doc.text(receipt.organization.website, 105, yPos, { align: 'center' })

      // Save PDF
      doc.save(`receipt-${receipt.receipt_number}.pdf`)

      toast({
        title: "Receipt Downloaded",
        description: "Your receipt PDF has been downloaded.",
      })
    } catch (error: any) {
      console.error('Error downloading receipt:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to download receipt",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "succeeded":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Completed</Badge>
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>
      case "failed":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Failed</Badge>
      case "canceled":
        return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">Canceled</Badge>
      case "refunded":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Refunded</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const totalDonated = donations
    .filter((d) => d.status === "succeeded")
    .reduce((sum, d) => sum + d.amount, 0)

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push("/member")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold">Donation History</h1>
            <p className="text-muted-foreground">View and manage your donations</p>
          </div>
          <Button onClick={() => router.push("/member/donate")}>
            <Heart className="h-4 w-4 mr-2" />
            Make a Donation
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Donated</CardDescription>
              <CardTitle className="text-2xl">${totalDonated.toFixed(2)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Donations</CardDescription>
              <CardTitle className="text-2xl">{donations.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Successful</CardDescription>
              <CardTitle className="text-2xl">
                {donations.filter((d) => d.status === "succeeded").length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="succeeded">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date)
                        setStartDateOpen(false) // Close popover after selection
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        setEndDate(date)
                        setEndDateOpen(false) // Close popover after selection
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Actions</Label>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter("all")
                    setMosqueFilter("all")
                    setStartDate(undefined)
                    setEndDate(undefined)
                    setStartDateOpen(false)
                    setEndDateOpen(false)
                    setCurrentPage(1) // Reset to first page when clearing filters
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Donations Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Donations</CardTitle>
                <CardDescription>Your donation history</CardDescription>
              </div>
              {isFiltering && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {donations.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No donations yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start making a difference by making your first donation
                </p>
                <Button onClick={() => router.push("/member/donate")}>
                  Make a Donation
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {donations.map((donation) => (
                        <TableRow key={donation.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                              {new Date(donation.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 font-semibold">
                              <DollarSign className="h-4 w-4" />
                              {donation.currency} {donation.amount.toFixed(2)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {donation.mosque ? (
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {donation.mosque.name}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">General</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {donation.campaign_name || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(donation.status)}</TableCell>
                          <TableCell>
                            {donation.status === "succeeded" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadReceipt(donation.id)}
                              >
                                <Receipt className="h-4 w-4 mr-2" />
                                Receipt
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
