"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Heart,
  ArrowLeft,
  Download,
  Building2,
  Calendar,
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
import { useAuth } from "@/lib/auth-context"
import { authenticatedGet } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

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
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [mosqueFilter, setMosqueFilter] = useState<string>("all")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchDonations()
    }
  }, [user, statusFilter, mosqueFilter, startDate, endDate, currentPage])

  const fetchDonations = async () => {
    try {
      setLoading(true)
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
        params.append("start_date", startDate)
      }
      if (endDate) {
        params.append("end_date", endDate)
      }

      const response: any = await authenticatedGet(`/api/donations?${params.toString()}`)

      if (response.success && response.data) {
        setDonations(response.data.donations || [])
        setTotalPages(response.data.pagination?.totalPages || 1)
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
    }
  }

  const handleDownloadReceipt = async (donationId: string) => {
    try {
      const response: any = await authenticatedGet(`/api/donations/${donationId}/receipt`)
      
      if (response.success && response.data) {
        // Create a blob from the receipt data
        const receiptData = response.data
        const receiptText = `
DONATION RECEIPT

Receipt Number: ${receiptData.receipt_number}
Date: ${new Date(receiptData.date).toLocaleDateString()}

DONOR INFORMATION
Name: ${receiptData.donor.name}
Email: ${receiptData.donor.email}

DONATION DETAILS
Amount: ${receiptData.donation.currency} ${receiptData.donation.amount}
Purpose: ${receiptData.donation.purpose || 'General Donation'}
${receiptData.donation.campaign ? `Campaign: ${receiptData.donation.campaign}` : ''}

RECIPIENT
${receiptData.recipient.name}
${receiptData.recipient.address || ''}

PAYMENT INFORMATION
Provider: ${receiptData.payment.provider}
Transaction ID: ${receiptData.payment.transaction_id}
Payment Date: ${new Date(receiptData.payment.payment_date).toLocaleDateString()}

Thank you for your generous donation!
Amanah Organization
        `.trim()

        // Create download link
        const blob = new Blob([receiptText], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `receipt-${receiptData.receipt_number}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast({
          title: "Receipt Downloaded",
          description: "Your receipt has been downloaded.",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to download receipt",
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
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Actions</Label>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter("all")
                    setMosqueFilter("all")
                    setStartDate("")
                    setEndDate("")
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
            <CardTitle>Donations</CardTitle>
            <CardDescription>Your donation history</CardDescription>
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
                              <Calendar className="h-4 w-4 text-muted-foreground" />
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

