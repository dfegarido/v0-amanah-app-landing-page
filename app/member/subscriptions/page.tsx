"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Store,
  Ticket,
  Heart,
  FileText,
  ChevronRight,
  Search,
  Filter,
  X,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"
import { authenticatedGet } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

export default function SubscriptionsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  // Fetch subscriptions
  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (!user) return

      try {
        setLoading(true)
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        const response: any = await authenticatedGet(`/api/subscriptions?timezone=${encodeURIComponent(timezone)}`)

        if (response.success && response.data) {
          // Transform data to include entity name
          const transformedData = response.data.map((sub: any) => {
            let name = 'Unnamed'
            let entityStatus = 'pending'

            if (sub.entity) {
              if (sub.type === 'mosque') {
                name = sub.entity.name || 'Unnamed Mosque'
                entityStatus = sub.entity.status
              } else if (sub.type === 'business') {
                name = sub.entity.name || 'Unnamed Business'
                entityStatus = sub.entity.status
              } else if (sub.type === 'coupon') {
                name = sub.entity.title || 'Unnamed Coupon'
                entityStatus = sub.entity.status
              } else if (sub.type === 'nonprofit') {
                name = sub.entity.name || 'Unnamed Nonprofit'
                entityStatus = sub.entity.status
              }
            }

            return {
              id: sub.id,
              type: sub.type,
              name: name,
              paymentStatus: sub.status, // Payment status from subscriptions table
              appStatus: sub.app_status || 'pending_verification', // App/subscription status
              entityStatus: entityStatus,
              price: sub.effective_price_amount ?? sub.price_amount,
              nextBillingDate: sub.next_billing_date,
              entity: sub.entity,
              mosqueCode: sub.entity?.mosque_code,
              affiliatedMosqueCode: sub.entity?.affiliated_mosque_code,
              createdAt: sub.created_at,
            }
          })

          setSubscriptions(transformedData)
          // Calculate total pages
          setTotalPages(Math.ceil(transformedData.length / itemsPerPage))
        }
      } catch (error: any) {
        console.error('Error fetching subscriptions:', error)
        toast({
          title: "Error",
          description: "Failed to load subscriptions",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchSubscriptions()
    }
  }, [user, toast])

  // Filter and paginate subscriptions
  const filteredSubscriptions = subscriptions
    .filter((sub) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          sub.name.toLowerCase().includes(query) ||
          sub.type.toLowerCase().includes(query) ||
          (sub.entity?.email && sub.entity.email.toLowerCase().includes(query)) ||
          (sub.entity?.phone && sub.entity.phone.includes(query))
        if (!matchesSearch) return false
      }

      // Type filter
      if (typeFilter !== "all" && sub.type !== typeFilter) {
        return false
      }

      // Status filter (filter by payment status)
      if (statusFilter !== "all") {
        if (statusFilter === "active" && sub.paymentStatus !== "active") return false
        if (statusFilter === "pending" && sub.paymentStatus !== "pending") return false
        if (statusFilter === "cancelled" && sub.paymentStatus !== "cancelled") return false
        if (statusFilter === "past_due" && sub.paymentStatus !== "past_due") return false
      }

      return true
    })
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())

  const paginatedSubscriptions = filteredSubscriptions.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  )

  // Update total pages based on filtered results
  useEffect(() => {
    setTotalPages(Math.ceil(filteredSubscriptions.length / itemsPerPage))
    // Reset to page 1 when filters change
    if (page > Math.ceil(filteredSubscriptions.length / itemsPerPage) && filteredSubscriptions.length > 0) {
      setPage(1)
    }
  }, [filteredSubscriptions.length, itemsPerPage])

  const getSubscriptionIcon = (type: string) => {
    switch (type) {
      case "mosque":
        return <Building2 className="h-5 w-5" />
      case "business":
        return <Store className="h-5 w-5" />
      case "coupon":
        return <Ticket className="h-5 w-5" />
      case "nonprofit":
        return <Heart className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const getSubscriptionPrice = (type: string) => {
    switch (type) {
      case "mosque":
        return "$100/month"
      case "business":
        return "$10/month"
      case "coupon":
        return "$10/month"
      case "nonprofit":
        return "$50/month"
      default:
        return ""
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Success</Badge>
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>
      case "cancelled":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Error</Badge>
      case "past_due":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Error</Badge>
      case "unpaid":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Error</Badge>
      case "paused":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Paused</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getAppStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>
      case "pending_verification":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending Verification</Badge>
      case "removed":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Removed</Badge>
      case "cancelled":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Cancelled</Badge>
      case "update_pending":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Update Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const clearFilters = () => {
    setSearchQuery("")
    setTypeFilter("all")
    setStatusFilter("all")
    setPage(1)
  }

  const hasActiveFilters = searchQuery || typeFilter !== "all" || statusFilter !== "all"

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/member">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Your Subscriptions</h1>
                <p className="text-sm text-muted-foreground">Manage all your subscriptions</p>
              </div>
            </div>
            <Button asChild>
              <Link href="/member">
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, type, email, phone..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setPage(1)
                  }}
                  className="pl-10"
                />
              </div>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={(value) => {
                setTypeFilter(value)
                setPage(1)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="mosque">Mosque</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="coupon">Coupon</SelectItem>
                  <SelectItem value="nonprofit">Nonprofit</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value)
                setPage(1)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        {!loading && (
          <div className="mb-4 text-sm text-muted-foreground">
            Showing {paginatedSubscriptions.length} of {filteredSubscriptions.length} subscription
            {filteredSubscriptions.length !== 1 ? "s" : ""}
            {hasActiveFilters && " (filtered)"}
          </div>
        )}

        {/* Subscriptions List */}
        {loading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading subscriptions...</p>
            </CardContent>
          </Card>
        ) : paginatedSubscriptions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {hasActiveFilters ? "No Subscriptions Match Filters" : "No Subscriptions Yet"}
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                {hasActiveFilters
                  ? "Try adjusting your filters to see more results."
                  : "Get started by adding your first mosque, business, coupon, or nonprofit listing."}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/member">Add Subscription</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Type</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Subscription Status</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Next Billing</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSubscriptions.map((subscription) => (
                      <TableRow key={subscription.id} className="cursor-pointer" onClick={() => router.push(`/member/subscription/${subscription.id}`)}>
                        <TableCell>
                          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                            {getSubscriptionIcon(subscription.type)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{subscription.name}</div>
                          <div className="text-sm text-muted-foreground capitalize">{subscription.type}</div>
                        </TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(subscription.paymentStatus)}
                        </TableCell>
                        <TableCell>
                          {getAppStatusBadge(subscription.appStatus)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {typeof subscription.price === 'number'
                            ? `$${subscription.price.toFixed(2)}/month`
                            : `$${subscription.price}/month`}
                        </TableCell>
                        <TableCell>
                          {subscription.nextBillingDate ? (
                            <span className="text-sm">{new Date(subscription.nextBillingDate).toLocaleDateString()}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {subscription.mosqueCode && (
                              <span className="text-sm text-primary font-medium">#{subscription.mosqueCode}</span>
                            )}
                            {subscription.affiliatedMosqueCode && (
                              <span className="text-xs text-muted-foreground">Aff: #{subscription.affiliatedMosqueCode}</span>
                            )}
                            {!subscription.mosqueCode && !subscription.affiliatedMosqueCode && (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/member/subscription/${subscription.id}`)
                            }}
                          >
                            View
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

