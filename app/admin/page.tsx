"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Building2,
  Store,
  Ticket,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText,
  Download,
  Copy,
  Check,
  ImageIcon,
  Key,
  LogOut,
  Settings,
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
  PieChart,
  ArrowUpRight,
  Ban,
  X,
  Heart,
  Bell,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { mockPaymentAlerts, mockFinancialRecords, mockPushNotificationRequests } from "@/lib/mock-data" // ADDED: mockPushNotificationRequests
import type { MosqueSubscription, BusinessSubscription, CouponSubscription, Subscription } from "@/lib/types" // Added Subscription type
import { Dialog, DialogContent, DialogHeader, DialogTrigger, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"
import { authenticatedGet, authenticatedPatch } from "@/lib/api-client"
import { NotificationBell } from "@/components/notification-bell"

export default function AdminDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const { signOut, user, loading } = useAuth()
  
  // All useState hooks must be at the top before any early returns
  const [alerts, setAlerts] = useState(mockPaymentAlerts)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [startDate, setStartDate] = useState("2024-10-01")
  const [endDate, setEndDate] = useState("2024-12-31")
  const [activeTab, setActiveTab] = useState("mosques")
  const [payoutsMonth, setPayoutsMonth] = useState(new Date())
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [members, setMembers] = useState<any[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [subscriptionToReject, setSubscriptionToReject] = useState<{ id: string; name?: string; title?: string } | null>(null)
  const [updatingSubscriptionId, setUpdatingSubscriptionId] = useState<string | null>(null)

  // ADDED: push notification requests state
  const [pushNotificationRequests, setPushNotificationRequests] = useState(mockPushNotificationRequests)
  const pendingPushRequests = pushNotificationRequests.filter((req) => req.status === "pending").length

  // Redirect if not logged in or not admin (useEffect must be at top with other hooks)
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  // Fetch members data
  const fetchMembers = async () => {
    if (!user || user.role !== 'admin') return
    
    try {
      setMembersLoading(true)
      const response = await authenticatedGet('/api/admin/members') as any
      
      console.log('[Admin Dashboard] API Response:', response)
      
      if (response.success && response.data) {
        console.log('[Admin Dashboard] Members received:', response.data.members?.length || 0)
        console.log('[Admin Dashboard] First member:', response.data.members?.[0])
        setMembers(response.data.members || [])
      } else {
        toast({
          title: "Error",
          description: "Failed to load members data",
          variant: "destructive"
        })
      }
    } catch (error: any) {
      console.error('Error fetching members:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to load members data",
        variant: "destructive"
      })
    } finally {
      setMembersLoading(false)
    }
  }

  useEffect(() => {
    if (!loading) {
      fetchMembers()
    }
  }, [user, loading])

  // ADDED: push notification handlers
  const handleApprovePushNotification = (requestId: string) => {
    setPushNotificationRequests(
      pushNotificationRequests.map((req) =>
        req.id === requestId ? { ...req, status: "sent", sentAt: new Date().toISOString(), sentBy: "admin" } : req,
      ),
    )
    console.log("[v0] Approved push notification:", requestId)
  }

  const handleRejectPushNotification = (requestId: string, reason: string) => {
    setPushNotificationRequests(
      pushNotificationRequests.map((req) =>
        req.id === requestId ? { ...req, status: "rejected", rejectedReason: reason } : req,
      ),
    )
    console.log("[v0] Rejected push notification:", requestId, reason)
  }

  // REMOVED: markAsAdded function

  // Update subscription app status
  const updateAppStatus = async (subscriptionId: string, newStatus: "active" | "removed" | "cancelled", entityStatus?: "active" | "inactive" | "rejected") => {
    // Set loading state
    setUpdatingSubscriptionId(subscriptionId)
    
    try {
      const response: any = await authenticatedPatch(`/api/admin/subscriptions/${subscriptionId}/status`, {
        app_status: newStatus,
        entity_status: entityStatus
      })

      if (response.success) {
        const statusText = newStatus === "active" ? "Approved" : newStatus === "removed" ? "Removed" : "Rejected"
        toast({
          title: "Success",
          description: `Subscription ${statusText} successfully`,
        })
        // Refresh members data
        fetchMembers()
        // Close reject dialog if open
        setRejectDialogOpen(false)
        setSubscriptionToReject(null)
      } else {
        throw new Error(response.message || 'Failed to update status')
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update subscription status",
        variant: "destructive",
      })
    } finally {
      // Clear loading state
      setUpdatingSubscriptionId(null)
    }
  }

  const handleRejectClick = (subscription: Subscription & { subscriptionId?: string }) => {
    const subscriptionId = (subscription as any).subscriptionId || subscription.id
    const name = (subscription as any).name || (subscription as any).title || 'this subscription'
    setSubscriptionToReject({ id: subscriptionId, name, title: name })
    setRejectDialogOpen(true)
  }

  const handleConfirmReject = () => {
    if (subscriptionToReject) {
      updateAppStatus(subscriptionToReject.id, "cancelled", "rejected")
    }
  }

  const allMosques = members.flatMap((m) =>
    m.subscriptions
      .filter((s: any) => s.type === "mosque")
      .map((s: any) => {
        console.log('[Admin Dashboard] Processing mosque subscription:', {
          subscriptionId: s.id,
          type: s.type,
          hasEntity: !!s.entity,
          entityName: s.entity?.name,
          mosqueCode: s.entity?.mosque_code,
          app_status: s.app_status,
          subscription_status: s.status
        })
        return {
          ...s.entity,
          ...s, // Spread subscription after entity so subscription.id overwrites entity.id
          subscriptionId: s.id, // Explicitly preserve subscription ID
          id: s.id, // Ensure id is subscription ID, not entity ID
          memberName: m.name,
          memberEmail: m.email,
          memberPhone: m.phone,
          memberId: m.id,
          // Use app_status from subscription, fallback to pending_verification
          appStatus: s.app_status || "pending_verification",
          // Map database fields to expected interface
          name: s.entity?.name,
          mosqueCode: s.entity?.mosque_code,
          title: s.entity?.name,
          type: "mosque",
          status: s.status,
          price: s.price,
          interval: s.interval,
          nextBillingDate: s.next_billing_date,
          createdAt: s.created_at,
        }
      }),
  ) as (MosqueSubscription & {
    memberName: string
    memberEmail: string
    memberPhone?: string
    memberId: string
    appStatus?: "active" | "removed" | "pending_verification" | "cancelled" // Added appStatus
  })[]
  
  console.log('[Admin Dashboard] Total mosques found:', allMosques.length)

  const allBusinesses = members.flatMap((m) =>
    m.subscriptions
      .filter((s: any) => s.type === "business")
      .map((s: any) => {
        return {
          ...s.entity,
          ...s, // Spread subscription after entity so subscription.id overwrites entity.id
          subscriptionId: s.id, // Explicitly preserve subscription ID
          id: s.id, // Ensure id is subscription ID, not entity ID
          memberName: m.name,
          memberEmail: m.email,
          memberPhone: m.phone,
          memberId: m.id,
          appStatus: s.app_status || "pending_verification",
          // Map database fields to expected interface
          name: s.entity?.name,
          title: s.entity?.name,
          type: "business",
          status: s.status,
          price: s.price,
          interval: s.interval,
          nextBillingDate: s.next_billing_date,
          createdAt: s.created_at,
          affiliatedMosqueCode: s.entity?.affiliated_mosque_code,
        }
      }),
  ) as (BusinessSubscription & {
    memberName: string
    memberEmail: string
    memberPhone?: string
    memberId: string
    appStatus?: "active" | "removed" | "pending_verification" | "cancelled" // Added appStatus
  })[]

  const allCoupons = members.flatMap((m) =>
    m.subscriptions
      .filter((s: any) => s.type === "coupon")
      .map((s: any) => ({
        ...s.entity,
        ...s, // Spread subscription after entity to preserve subscription.id
        subscriptionId: s.id, // Preserve subscription ID explicitly
        memberName: m.name,
        memberEmail: m.email,
        memberPhone: m.phone,
        memberId: m.id,
        appStatus: s.app_status || "pending_verification",
        // Map database fields to expected interface
        title: s.entity?.title,
        type: "coupon",
        status: s.status,
        price: s.price,
        interval: s.interval,
        nextBillingDate: s.next_billing_date,
        createdAt: s.created_at,
        affiliatedMosqueCode: s.entity?.affiliated_mosque_code,
        merchant: s.entity?.merchant,
      })),
  ) as (CouponSubscription & {
    memberName: string
    memberEmail: string
    memberPhone?: string
    memberId: string
    appStatus?: "active" | "removed" | "pending_verification" | "cancelled" // Added appStatus
  })[]

  // ADDED: allNonprofits data structure
  const allNonprofits = members.flatMap((m) =>
    m.subscriptions
      .filter((s: any) => s.type === "nonprofit")
      .map((s: any) => ({
        ...s,
        ...s.entity,
        memberName: m.name,
        memberEmail: m.email,
        memberPhone: m.phone,
        memberId: m.id,
        // App lifecycle statuses: pending, active, update_pending, removed, cancelled
        appLifecycle: s.entity?.status || "pending",
        // Map database fields to expected interface
        title: s.entity?.name,
        type: "nonprofit",
        status: s.status,
        price: s.price,
        interval: s.interval,
        nextBillingDate: s.next_billing_date,
        createdAt: s.created_at,
      })),
  ) as Array<
    Subscription & {
      memberName: string
      memberEmail: string
      memberPhone?: string
      memberId: string
      appLifecycle: "pending" | "active" | "update_pending" | "removed" | "cancelled"
    }
  >

  const totalMosques = allMosques.length
  const totalBusinesses = allBusinesses.length
  const totalCoupons = allCoupons.length
  const totalNonprofits = allNonprofits.length // Added totalNonprofits
  const unresolvedAlerts = alerts.filter((a) => !a.resolved).length

  const getMosqueAffiliates = (mosqueCode: number) => {
    const businesses = allBusinesses.filter((b) => b.affiliatedMosqueCode === mosqueCode && b.status === "active")
    const coupons = allCoupons.filter((c) => c.affiliatedMosqueCode === mosqueCode && c.status === "active")
    const totalKickback = (businesses.length + coupons.length) * 1 // $1 per affiliate
    return { businesses, coupons, totalKickback }
  }

  const filterFinancialsByDate = () => {
    return mockFinancialRecords.filter((r) => {
      const recordDate = new Date(r.date)
      const start = new Date(startDate)
      const end = new Date(endDate)
      return recordDate >= start && recordDate <= end
    })
  }

  const calculateFinancialSummary = () => {
    const records = filterFinancialsByDate()
    const totalRevenue = records.reduce((acc, r) => acc + r.amount, 0)
    const mosqueRevenue = records.filter((r) => r.type === "mosque").reduce((acc, r) => acc + r.amount, 0)
    const businessRevenue = records.filter((r) => r.type === "business").reduce((acc, r) => acc + r.amount, 0)
    const couponRevenue = records.filter((r) => r.type === "coupon").reduce((acc, r) => acc + r.amount, 0)
    const totalMosqueKickbacks = records.reduce((acc, r) => acc + (r.mosqueKickback || 0), 0)
    const totalAmanahDonation = records.reduce((acc, r) => acc + (r.amanahOrgDonation || 0), 0)
    const netRevenue = records.reduce((acc, r) => acc + r.netRevenue, 0)

    // ADDED: Calculate total manual donations
    const totalManualDonations = members.reduce((sum, member) => {
      return (
        sum +
        member.subscriptions.reduce((subSum: number, sub: any) => {
          if (sub.type === "mosque" && sub.entity?.manual_donations) {
            return subSum + sub.entity.manual_donations
          }
          return subSum
        }, 0)
      )
    }, 0)

    return {
      totalRevenue,
      mosqueRevenue,
      businessRevenue,
      couponRevenue,
      totalMosqueKickbacks,
      totalAmanahDonation,
      totalManualDonations, // Added totalManualDonations
      netRevenue,
      records,
    }
  }

  const handleResolveAlert = (alertId: string) => {
    setAlerts(
      alerts.map((a) => (a.id === alertId ? { ...a, resolved: true, resolvedAt: new Date().toISOString() } : a)),
    )
  }

  // ADDED: getCardStyle helper function
  const getCardStyle = (subscription: Subscription) => {
    if (subscription.status === "cancelled" || subscription.appStatus === "cancelled") {
      return "border-red-500 bg-red-500/5"
    }
    if (subscription.appStatus === "removed") {
      return "border-gray-400 bg-gray-400/5"
    }
    return "border-border"
  }

  // ADDED: getAppStatusBadge helper function
  const getAppStatusBadge = (subscription: Subscription) => {
    if (subscription.status === "cancelled" || subscription.appStatus === "cancelled") {
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
          🔴 Cancelled - To Be Removed
        </Badge>
      )
    }
    if (subscription.appStatus === "removed") {
      return (
        <Badge variant="outline" className="bg-gray-400/10 text-gray-600 border-gray-400/20">
          ⚫ Removed from App
        </Badge>
      )
    }
    if (subscription.appStatus === "pending_verification") {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          🆕 New - Pending Verification
        </Badge>
      )
    }
    if (subscription.appStatus === "active") {
      return (
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          ✓ Active in App
        </Badge>
      )
    }
    return null
  }

  // ADDED: getActionButton helper function
  const getActionButton = (subscription: Subscription & { subscriptionId?: string }) => {
    // Use subscriptionId if available (preserved subscription ID), otherwise use id
    const subscriptionId = (subscription as any).subscriptionId || subscription.id
    
    // Debug: Log subscription data
    console.log('[getActionButton] Subscription:', {
      id: subscription.id,
      subscriptionId: subscriptionId,
      appStatus: subscription.appStatus,
      status: subscription.status,
      type: subscription.type
    })
    
    // If cancelled or removed, show "Mark as Removed" to clear and turn gray
    if (subscription.status === "cancelled" && subscription.appStatus !== "removed") {
      return (
        <Button
          size="sm"
          variant="outline"
          className="bg-gray-400/10 hover:bg-gray-400/20 text-gray-600 border-gray-400/20"
          onClick={(e) => {
            e.stopPropagation()
            updateAppStatus(subscriptionId, "removed")
          }}
        >
          <X className="h-4 w-4 mr-1" />
          Mark as Removed
        </Button>
      )
    }

    // If removed, show "Mark as Added" to bring back online
    if (subscription.appStatus === "removed") {
      const isUpdating = updatingSubscriptionId === subscriptionId
      return (
        <Button
          size="sm"
          variant="outline"
          className="bg-green-500/10 hover:bg-green-500/20 text-green-600 border-green-500/20"
          onClick={(e) => {
            e.stopPropagation()
            updateAppStatus(subscriptionId, "active", "active")
          }}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-1" />
              Mark as Added
            </>
          )}
        </Button>
      )
    }

    // If pending verification, show "Approve" and "Reject" buttons
    if (subscription.appStatus === "pending_verification") {
      const isUpdating = updatingSubscriptionId === subscriptionId
      return (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="default"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={(e) => {
              e.stopPropagation()
              updateAppStatus(subscriptionId, "active", "active")
            }}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Approve
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-red-500/10 hover:bg-red-500/20 text-red-600 border-red-500/20"
            onClick={(e) => {
              e.stopPropagation()
              handleRejectClick(subscription)
            }}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Rejecting...
              </>
            ) : (
              <>
                <X className="h-4 w-4 mr-1" />
                Reject
              </>
            )}
          </Button>
        </div>
      )
    }

    // If active, show "Mark as Removed"
    if (subscription.appStatus === "active") {
      const isUpdating = updatingSubscriptionId === subscriptionId
      return (
        <Button
          size="sm"
          variant="outline"
          className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 border-orange-500/20"
          onClick={(e) => {
            e.stopPropagation()
            updateAppStatus(subscriptionId, "removed", "inactive")
          }}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <X className="h-4 w-4 mr-1" />
              Mark as Removed
            </>
          )}
        </Button>
      )
    }

    return null
  }

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldId)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>
      case "cancelled":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Cancelled</Badge>
      case "past_due":
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">Past Due</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // ADDED: getAppLifecycleBadge helper function for Non-Profits
  const getAppLifecycleBadge = (lifecycle: string) => {
    switch (lifecycle) {
      case "pending":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Pending</Badge>
      case "active":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Active</Badge>
      case "update_pending":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Update Pending</Badge>
      case "removed":
        return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">Removed</Badge>
      case "cancelled":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Cancelled</Badge>
      default:
        return <Badge variant="outline">{lifecycle}</Badge>
    }
  }

  const downloadAllPhotos = async (photos: string[], name: string) => {
    if (!photos || photos.length === 0) {
      toast({
        title: "No Photos",
        description: "There are no photos to download.",
        variant: "destructive"
      })
      return
    }

    toast({
      title: "Downloading Photos",
      description: `Starting download of ${photos.length} photo(s)...`,
    })

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < photos.length; i++) {
      try {
        // Fetch the photo as a blob
        const response = await fetch(photos[i])
        
        if (!response.ok) {
          throw new Error(`Failed to fetch photo ${i + 1}`)
        }

        const blob = await response.blob()
        
        // Get file extension from blob type or URL
        const contentType = blob.type
        let extension = 'jpg'
        if (contentType.includes('png')) extension = 'png'
        else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = 'jpg'
        else if (contentType.includes('gif')) extension = 'gif'
        else if (contentType.includes('webp')) extension = 'webp'
        
        // Create blob URL and download
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = blobUrl
        link.download = `${name.replace(/\s+/g, "_")}_photo_${i + 1}.${extension}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Clean up blob URL
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
        
        successCount++
        
        // Wait between downloads to avoid overwhelming the browser
        await new Promise((resolve) => setTimeout(resolve, 800))
      } catch (error) {
        console.error(`Error downloading photo ${i + 1}:`, error)
        failCount++
        
        // Continue with next photo even if one fails
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    // Show completion toast
    if (successCount > 0) {
      toast({
        title: "Download Complete",
        description: `Successfully downloaded ${successCount} photo(s)${failCount > 0 ? `. Failed: ${failCount}` : ''}.`,
      })
    } else {
      toast({
        title: "Download Failed",
        description: "Unable to download photos. They may have CORS restrictions.",
        variant: "destructive"
      })
    }
  }

  const downloadDocument = async (docUrl: string, docName: string) => {
    try {
      toast({
        title: "Downloading...",
        description: `Fetching ${docName}...`,
      })

      // Fetch the file as a blob to force download
      const response = await fetch(docUrl)
      
      if (!response.ok) {
        throw new Error('Failed to fetch file')
      }

      const blob = await response.blob()
      
      // Create a blob URL and trigger download
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = docName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up the blob URL after a short delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100)
      
      toast({
        title: "Download Complete",
        description: `${docName} has been downloaded.`,
      })
    } catch (error) {
      console.error('Download error:', error)
      
      // Fallback: open in new tab
      window.open(docUrl, '_blank')
      
      toast({
        title: "Opening in New Tab",
        description: "Unable to download directly. File opened in new tab.",
        variant: "destructive"
      })
    }
  }

  // Export financials to CSV
  const exportFinancialsToCSV = () => {
    const { records } = calculateFinancialSummary()
    const headers = ["Date", "Type", "Name", "Amount", "Mosque Kickback", "Amanah Donation", "Net Revenue"]
    const rows = records.map((r) => [
      r.date,
      r.type,
      r.subscriptionName,
      `$${r.amount}`,
      `$${r.mosqueKickback || 0}`,
      `$${r.amanahOrgDonation || 0}`,
      `$${r.netRevenue}`,
    ])

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `amanah_financials_${startDate}_to_${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Export mosque payouts to CSV
  const exportMosquePayoutsToCSV = () => {
    const headers = ["Mosque Code", "Mosque Name", "Businesses", "Coupons", "Total Affiliates", "Monthly Payout"]
    const rows = allMosques.map((mosque) => {
      const { businesses, coupons, totalKickback } = getMosqueAffiliates(mosque.mosqueCode)
      return [
        mosque.mosqueCode,
        mosque.name,
        businesses.length,
        coupons.length,
        businesses.length + coupons.length,
        `$${totalKickback}`,
      ]
    })

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `mosque_payouts_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const CopyButton = ({ text, fieldId }: { text: string; fieldId: string }) => (
    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(text, fieldId)}>
      {copiedField === fieldId ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </Button>
  )

  const financialSummary = calculateFinancialSummary()

  const handleCancelSubscription = (subscriptionId: string, type?: string) => {
    // Added optional type parameter
    // Simulate cancellation
    toast({
      title: "Subscription Cancelled",
      description: `${type || "Subscription"} has been cancelled and marked for removal.`,
    })
    setCancellingId(null)
    // In a real app, this would update the backend
  }

  const handleLogout = async () => {
    await signOut()
    router.push("/auth/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <img src="/images/logo-20amanaah.png" alt="Amanah Logo" className="h-10 w-auto" />
            <div>
              <h1 className="text-lg font-semibold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            {/* CHANGE: Make settings button functional */}
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin/settings">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search mosques, businesses, coupons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-5 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Building2 className="h-4 w-4" /> Mosques
              </CardDescription>
              <CardTitle className="text-3xl">{membersLoading ? "..." : totalMosques}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Store className="h-4 w-4" /> Businesses
              </CardDescription>
              <CardTitle className="text-3xl">{membersLoading ? "..." : totalBusinesses}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Ticket className="h-4 w-4" /> Coupons
              </CardDescription>
              <CardTitle className="text-3xl">{membersLoading ? "..." : totalCoupons}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" /> Monthly Revenue
              </CardDescription>
              <CardTitle className="text-3xl text-primary">
                {membersLoading ? "..." : `$${totalMosques * 100 + (totalBusinesses + totalCoupons) * 10}`}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className={unresolvedAlerts > 0 ? "border-destructive" : ""}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" /> Alerts
              </CardDescription>
              <CardTitle className={`text-3xl ${unresolvedAlerts > 0 ? "text-destructive" : ""}`}>
                {unresolvedAlerts}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted flex-wrap">
            <TabsTrigger value="mosques">
              <Building2 className="h-4 w-4 mr-2" />
              Mosques ({membersLoading ? "..." : totalMosques})
            </TabsTrigger>
            <TabsTrigger value="businesses">
              <Store className="h-4 w-4 mr-2" />
              Businesses ({membersLoading ? "..." : totalBusinesses})
            </TabsTrigger>
            <TabsTrigger value="coupons">
              <Ticket className="h-4 w-4 mr-2" />
              Coupons ({membersLoading ? "..." : totalCoupons})
            </TabsTrigger>
            <TabsTrigger value="nonprofits">
              <Users className="h-4 w-4 mr-2" />
              Non-Profits ({membersLoading ? "..." : totalNonprofits})
            </TabsTrigger>
            <TabsTrigger value="payouts">
              <DollarSign className="h-4 w-4 mr-2" />
              Mosque Payouts
            </TabsTrigger>
            <TabsTrigger value="financials">
              <PieChart className="h-4 w-4 mr-2" />
              Financials
            </TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="alerts" className="relative">
              Payment Alerts
              {unresolvedAlerts > 0 && (
                <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                  {unresolvedAlerts}
                </span>
              )}
            </TabsTrigger>
            {/* CHANGE: Added push notification tab */}
            <TabsTrigger value="push-notifications" className="relative">
              <Bell className="h-4 w-4 mr-2" />
              Push Requests
              {pendingPushRequests > 0 && (
                <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {pendingPushRequests}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Mosques Tab */}
          <TabsContent value="mosques">
            <Card>
              <CardHeader>
                <CardTitle>All Mosques</CardTitle>
                <CardDescription>View and manage all mosque subscriptions with full details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {allMosques.map((mosque) => {
                  const { businesses, coupons, totalKickback } = getMosqueAffiliates(mosque.mosqueCode)
                  return (
                    <Collapsible
                      key={mosque.id}
                      open={expandedItems[mosque.id]}
                      onOpenChange={() => toggleExpanded(mosque.id)}
                    >
                      <div className={`border rounded-lg overflow-hidden ${getCardStyle(mosque)}`}>
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/50 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
                                {mosque.logo ? (
                                  <img
                                    src={mosque.logo || "/placeholder.svg"}
                                    alt={mosque.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Building2 className="h-6 w-6 text-primary" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-foreground">{mosque.name}</p>
                                  {getStatusBadge(mosque.status)}
                                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                    Code: #{mosque.mosqueCode}
                                  </Badge>
                                  {getAppStatusBadge(mosque)}
                                </div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {mosque.address}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {getActionButton(mosque)}
                              <div className="text-right">
                                <p className="text-sm font-semibold text-foreground">${mosque.price}/mo</p>
                                <p className="text-xs text-muted-foreground">
                                  {businesses.length + coupons.length} affiliates | ${totalKickback} payout
                                </p>
                              </div>
                              {expandedItems[mosque.id] ? (
                                <ChevronUp className="h-5 w-5" />
                              ) : (
                                <ChevronDown className="h-5 w-5" />
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border-t border-border p-6 bg-secondary/20 space-y-6">
                            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                              <h4 className="font-semibold flex items-center gap-2 mb-3">
                                <Users className="h-4 w-4" />
                                Affiliated Businesses & Coupons
                              </h4>
                              <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Businesses</p>
                                  <p className="text-xl font-bold">{businesses.length}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Coupons</p>
                                  <p className="text-xl font-bold">{coupons.length}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Monthly Payout</p>
                                  <p className="text-xl font-bold text-primary">${totalKickback}</p>
                                </div>
                              </div>
                              {(businesses.length > 0 || coupons.length > 0) && (
                                <div className="mt-3 space-y-2">
                                  {businesses.map((b) => (
                                    <div key={b.id} className="flex items-center justify-between text-sm">
                                      <span className="flex items-center gap-2">
                                        <Store className="h-3 w-3" />
                                        {b.title}
                                      </span>
                                      <span className="text-primary">$1/mo</span>
                                    </div>
                                  ))}
                                  {coupons.map((c) => (
                                    <div key={c.id} className="flex items-center justify-between text-sm">
                                      <span className="flex items-center gap-2">
                                        <Ticket className="h-3 w-3" />
                                        {c.title}
                                      </span>
                                      <span className="text-primary">$1/mo</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Photos Gallery */}
                            {mosque.photos && mosque.photos.length > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-semibold flex items-center gap-2">
                                    <ImageIcon className="h-4 w-4" />
                                    Photos ({mosque.photos.length})
                                  </h4>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadAllPhotos(mosque.photos!, mosque.name)}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download All Photos
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {mosque.photos.map((photo, idx) => (
                                    <img
                                      key={idx}
                                      src={photo || "/placeholder.svg"}
                                      alt={`${mosque.name} ${idx + 1}`}
                                      className="h-24 w-full object-cover rounded-lg"
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Contact Info */}
                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <h4 className="font-semibold">Contact Information</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span>{mosque.email}</span>
                                    <CopyButton text={mosque.email} fieldId={`${mosque.id}-email`} />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{mosque.phone}</span>
                                    <CopyButton text={mosque.phone} fieldId={`${mosque.id}-phone`} />
                                  </div>
                                  {mosque.website && (
                                    <div className="flex items-center gap-2">
                                      <Globe className="h-4 w-4 text-muted-foreground" />
                                      <a
                                        href={mosque.website}
                                        target="_blank"
                                        className="text-primary hover:underline"
                                        rel="noreferrer"
                                      >
                                        {mosque.website}
                                      </a>
                                      <CopyButton text={mosque.website} fieldId={`${mosque.id}-website`} />
                                    </div>
                                  )}
                                  {mosque.contactName && (
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-muted-foreground" />
                                      <span>Contact: {mosque.contactName}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-3">
                                <h4 className="font-semibold">Payment Details</h4>
                                <div className="space-y-2 text-sm">
                                  <p>Started: {new Date(mosque.paymentStartDate).toLocaleDateString()}</p>
                                  <p>Next Billing: {new Date(mosque.nextBillingDate).toLocaleDateString()}</p>
                                  <p className="text-primary font-semibold">${mosque.price}/month</p>
                                </div>
                              </div>
                            </div>

                            {/* 3rd Party Logins */}
                            {mosque.thirdPartyLogins && mosque.thirdPartyLogins.length > 0 && (
                              <div>
                                <h4 className="font-semibold flex items-center gap-2 mb-3">
                                  <Key className="h-4 w-4" />
                                  Third Party Logins
                                </h4>
                                <div className="space-y-2">
                                  {mosque.thirdPartyLogins.map((login, idx) => (
                                    <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-secondary">
                                      <span className="font-medium">{login.platform}</span>
                                      <span className="text-muted-foreground">User: {login.username}</span>
                                      <span className="text-muted-foreground">Pass: {login.password}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Documents */}
                            {mosque.documents && mosque.documents.length > 0 && (
                              <div>
                                <h4 className="font-semibold flex items-center gap-2 mb-3">
                                  <FileText className="h-4 w-4" />
                                  Documents
                                </h4>
                                <div className="space-y-2">
                                  {mosque.documents.map((doc) => (
                                    <div
                                      key={doc.id}
                                      className="flex items-center justify-between p-3 rounded-lg bg-secondary"
                                    >
                                      <span>{doc.name}</span>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => downloadDocument(doc.url, doc.name)}
                                      >
                                        <Download className="h-4 w-4 mr-2" />
                                        Download
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  )
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Businesses Tab */}
          <TabsContent value="businesses">
            <Card>
              <CardHeader>
                <CardTitle>All Businesses</CardTitle>
                <CardDescription>View and manage all business listings with full details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {allBusinesses.map((business) => (
                  <Collapsible
                    key={business.id}
                    open={expandedItems[business.id]}
                    onOpenChange={() => toggleExpanded(business.id)}
                  >
                    <div className={`border rounded-lg overflow-hidden ${getCardStyle(business)}`}>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
                              {business.photos?.[0] ? (
                                <img
                                  src={business.photos[0] || "/placeholder.svg"}
                                  alt={business.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Store className="h-6 w-6 text-primary" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-foreground">{business.title}</p>
                                {getStatusBadge(business.status)}
                                {business.affiliatedMosqueCode && (
                                  <Badge
                                    variant="outline"
                                    className="bg-green-500/10 text-green-500 border-green-500/20"
                                  >
                                    Mosque #{business.affiliatedMosqueCode}
                                  </Badge>
                                )}
                                {getAppStatusBadge(business)}
                              </div>
                              <p className="text-sm text-muted-foreground">{business.categories?.join(", ")}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {getActionButton(business)}
                            <div className="text-right">
                              <p className="text-sm font-semibold text-foreground">${business.price}/mo</p>
                              <p className="text-xs text-muted-foreground">
                                Started: {new Date(business.paymentStartDate).toLocaleDateString()}
                              </p>
                            </div>
                            {expandedItems[business.id] ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t border-border p-6 bg-secondary/20 space-y-6">
                          {/* Photos Gallery */}
                          {business.photos && business.photos.length > 0 && (
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold flex items-center gap-2">
                                  <ImageIcon className="h-4 w-4" />
                                  Photos ({business.photos.length})
                                </h4>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadAllPhotos(business.photos!, business.title)}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download All Photos
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {business.photos.map((photo, idx) => (
                                  <img
                                    key={idx}
                                    src={photo || "/placeholder.svg"}
                                    alt={`${business.title} ${idx + 1}`}
                                    className="h-24 w-full object-cover rounded-lg"
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Description */}
                          <div>
                            <h4 className="font-semibold mb-2">Description</h4>
                            <p className="text-sm text-muted-foreground">{business.description}</p>
                          </div>

                          {/* Contact & Location */}
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <h4 className="font-semibold">Contact Information</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span>{business.email}</span>
                                  <CopyButton text={business.email} fieldId={`${business.id}-email`} />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span>{business.phone}</span>
                                  <CopyButton text={business.phone} fieldId={`${business.id}-phone`} />
                                </div>
                                {business.website && (
                                  <div className="flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                    <a
                                      href={business.website}
                                      target="_blank"
                                      className="text-primary hover:underline"
                                      rel="noreferrer"
                                    >
                                      {business.website}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <h4 className="font-semibold">Location</h4>
                              <div className="space-y-2 text-sm">
                                <p>
                                  {business.address}, {business.city}, {business.state} {business.zip}
                                </p>
                                <p>{business.country}</p>
                                <CopyButton
                                  text={`${business.address}, ${business.city}, ${business.state} ${business.zip}`}
                                  fieldId={`${business.id}-address`}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Categories */}
                          <div>
                            <h4 className="font-semibold mb-2">Categories</h4>
                            <div className="flex flex-wrap gap-2">
                              {business.categories?.map((cat, idx) => (
                                <Badge key={idx} variant="secondary">
                                  {cat}
                                </Badge>
                              ))}
                              {business.subCategories?.map((cat, idx) => (
                                <Badge key={idx} variant="outline">
                                  {cat}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Documents */}
                          {business.documents && business.documents.length > 0 && (
                            <div>
                              <h4 className="font-semibold flex items-center gap-2 mb-3">
                                <FileText className="h-4 w-4" />
                                Documents
                              </h4>
                              <div className="space-y-2">
                                {business.documents.map((doc) => (
                                  <div
                                    key={doc.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-secondary"
                                  >
                                    <span>{doc.name}</span>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => downloadDocument(doc.url, doc.name)}
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Download
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coupons Tab */}
          <TabsContent value="coupons">
            <Card>
              <CardHeader>
                <CardTitle>All Coupons</CardTitle>
                <CardDescription>View and manage all coupon listings with full details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {allCoupons.map((coupon) => (
                  <Collapsible
                    key={coupon.id}
                    open={expandedItems[coupon.id]}
                    onOpenChange={() => toggleExpanded(coupon.id)}
                  >
                    <div className={`border rounded-lg overflow-hidden ${getCardStyle(coupon)}`}>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
                              {coupon.photo ? (
                                <img
                                  src={coupon.photo || "/placeholder.svg"}
                                  alt={coupon.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Ticket className="h-6 w-6 text-primary" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-foreground">{coupon.title}</p>
                                {getStatusBadge(coupon.status)}
                                {coupon.affiliatedMosqueCode && (
                                  <Badge
                                    variant="outline"
                                    className="bg-green-500/10 text-green-500 border-green-500/20"
                                  >
                                    Mosque #{coupon.affiliatedMosqueCode}
                                  </Badge>
                                )}
                                {getAppStatusBadge(coupon)}
                              </div>
                              <p className="text-sm text-muted-foreground">{coupon.merchant}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {getActionButton(coupon)}
                            <div className="text-right">
                              <p className="text-sm font-semibold text-foreground">${coupon.price}/mo</p>
                              <p className="text-xs text-muted-foreground">
                                Started: {new Date(coupon.paymentStartDate).toLocaleDateString()}
                              </p>
                            </div>
                            {expandedItems[coupon.id] ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t border-border p-6 bg-secondary/20 space-y-6">
                          {/* Photos Gallery */}
                          {coupon.photos && coupon.photos.length > 0 && (
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold flex items-center gap-2">
                                  <ImageIcon className="h-4 w-4" />
                                  Photos ({coupon.photos.length})
                                </h4>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadAllPhotos(coupon.photos!, coupon.title)}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download All Photos
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {coupon.photos.map((photo, idx) => (
                                  <img
                                    key={idx}
                                    src={photo || "/placeholder.svg"}
                                    alt={`${coupon.title} ${idx + 1}`}
                                    className="h-24 w-full object-cover rounded-lg"
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Description & Details */}
                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-semibold mb-2">Description</h4>
                                <p className="text-sm text-muted-foreground">{coupon.description}</p>
                              </div>
                              {coupon.popUpText && (
                                <div>
                                  <h4 className="font-semibold mb-2">Pop Up Text</h4>
                                  <p className="text-sm text-muted-foreground">{coupon.popUpText}</p>
                                </div>
                              )}
                            </div>

                            <div className="space-y-4">
                              <div>
                                <h4 className="font-semibold mb-2">Discount Details</h4>
                                <div className="space-y-1 text-sm">
                                  {coupon.discountAmount && <p>Amount: {coupon.discountAmount}</p>}
                                  {coupon.discountPercentage && <p>Percentage: {coupon.discountPercentage}</p>}
                                  {coupon.couponCode && (
                                    <p className="flex items-center gap-2">
                                      Code:{" "}
                                      <span className="font-mono bg-secondary px-2 py-1 rounded">
                                        {coupon.couponCode}
                                      </span>
                                      <CopyButton text={coupon.couponCode} fieldId={`${coupon.id}-code`} />
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div>
                                <h4 className="font-semibold mb-2">Validity</h4>
                                <div className="text-sm">
                                  <p>Start: {new Date(coupon.startDate).toLocaleDateString()}</p>
                                  {coupon.endDate && <p>End: {new Date(coupon.endDate).toLocaleDateString()}</p>}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Contact */}
                          <div className="space-y-3">
                            <h4 className="font-semibold">Contact Information</h4>
                            <div className="flex flex-wrap gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{coupon.email}</span>
                                <CopyButton text={coupon.email} fieldId={`${coupon.id}-email`} />
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{coupon.phone}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{coupon.address}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="nonprofits" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Non-Profit Organizations</h2>
                <p className="text-muted-foreground">Manage non-profit listings and verification</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search non-profits..." className="pl-10 w-[300px]" />
                </div>
              </div>
            </div>
            {allNonprofits.map((nonprofit) => (
              <Card
                key={nonprofit.id}
                className={`${
                  nonprofit.appLifecycle === "pending"
                    ? "border-green-500/50"
                    : nonprofit.appLifecycle === "cancelled"
                      ? "border-red-500/50"
                      : nonprofit.appLifecycle === "removed"
                        ? "border-gray-500/50"
                        : nonprofit.appLifecycle === "update_pending"
                          ? "border-yellow-500/50"
                          : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {nonprofit.name}
                          {getAppLifecycleBadge(nonprofit.appLifecycle)}
                          {getStatusBadge(nonprofit.status)}
                        </CardTitle>
                        <CardDescription>{nonprofit.memberName}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {nonprofit.appLifecycle === "update_pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            console.log("[v0] Marking nonprofit as updated:", nonprofit.id)
                            alert("Nonprofit marked as updated!")
                          }}
                        >
                          Mark as Updated
                        </Button>
                      )}
                      {nonprofit.appLifecycle === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20"
                          onClick={() => {
                            console.log("[v0] Marking nonprofit as added to app:", nonprofit.id)
                            alert("Nonprofit marked as added!")
                          }}
                        >
                          Mark as Added
                        </Button>
                      )}
                      {(nonprofit.appLifecycle === "active" || nonprofit.appLifecycle === "update_pending") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            console.log("[v0] Marking nonprofit as removed:", nonprofit.id)
                            alert("Nonprofit marked as removed")
                          }}
                        >
                          Mark as Removed
                        </Button>
                      )}
                      {(nonprofit.appLifecycle === "removed" || nonprofit.appLifecycle === "cancelled") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-green-500/10 border-green-500/20 text-green-500"
                          onClick={() => {
                            console.log("[v0] Re-adding nonprofit:", nonprofit.id)
                            alert("Nonprofit re-added!")
                          }}
                        >
                          Mark as Added
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelSubscription(nonprofit.id, "nonprofit")}
                      >
                        Cancel Subscription
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleExpanded(`nonprofit-${nonprofit.id}`)}>
                        {expandedItems[`nonprofit-${nonprofit.id}`] ? <ChevronUp /> : <ChevronDown />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {expandedItems[`nonprofit-${nonprofit.id}`] && (
                  <CardContent className="space-y-4">
                    {/* Display all nonprofit fields */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-muted-foreground">Organization Name</Label>
                        <p className="font-medium">{nonprofit.name}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <div className="flex items-center gap-2">
                          <p>{(nonprofit as any).email}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText((nonprofit as any).email)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Phone</Label>
                        <div className="flex items-center gap-2">
                          <p>{(nonprofit as any).phone}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText((nonprofit as any).phone)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Website</Label>
                        <p>{(nonprofit as any).website}</p>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-muted-foreground">Address</Label>
                        <div className="flex items-center gap-2">
                          <p>{(nonprofit as any).address}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText((nonprofit as any).address)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-muted-foreground">About</Label>
                        <p>{(nonprofit as any).about}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Donate Link</Label>
                        <p>{(nonprofit as any).donateLink || (nonprofit as any).donate_link}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Social Media</Label>
                        <p className="whitespace-pre-wrap">{(nonprofit as any).socialMedia || (nonprofit as any).social_media}</p>
                      </div>
                    </div>
                    {(nonprofit as any).photos && (nonprofit as any).photos.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-muted-foreground">Photos</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadAllPhotos((nonprofit as any).photos!, (nonprofit as any).name)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download All Photos
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {(nonprofit as any).photos.map((photo: any, index: number) => (
                            <img
                              key={index}
                              src={photo || "/placeholder.svg"}
                              alt={`Photo ${index + 1}`}
                              className="rounded-lg w-full h-32 object-cover"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="payouts" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Mosque Affiliate Payouts</h2>
                <p className="text-muted-foreground">
                  Track 10% kickbacks to mosques from affiliated businesses and coupons, plus manual donations
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(payoutsMonth)
                    newDate.setMonth(newDate.getMonth() - 1)
                    setPayoutsMonth(newDate)
                  }}
                >
                  Previous Month
                </Button>
                <div className="px-4 py-2 bg-muted rounded-md">
                  {payoutsMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(payoutsMonth)
                    newDate.setMonth(newDate.getMonth() + 1)
                    if (newDate <= new Date()) {
                      setPayoutsMonth(newDate)
                    }
                  }}
                  disabled={payoutsMonth.getMonth() === new Date().getMonth()}
                >
                  Next Month
                </Button>
              </div>
            </div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Mosque Affiliate Payouts</CardTitle>
                    <CardDescription>
                      Track 10% kickbacks to mosques from affiliated businesses and coupons
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={exportMosquePayoutsToCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Mosque Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Businesses</TableHead>
                        <TableHead className="text-center">Coupons</TableHead>
                        <TableHead className="text-center">Total Affiliates</TableHead>
                        <TableHead className="text-right">Monthly Payout</TableHead>
                        <TableHead className="text-right">Manual Donations</TableHead>
                        <TableHead className="text-right">Total Payout</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allMosques.map((mosque) => {
                        const { businesses, coupons, totalKickback } = getMosqueAffiliates(mosque.mosqueCode)
                        const manualDonations = (mosque as any).manualDonations || (mosque as any).manual_donations || 0
                        const totalPayout = totalKickback + manualDonations
                        return (
                          <TableRow key={mosque.id}>
                            <TableCell>
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                #{mosque.mosqueCode}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{mosque.name}</TableCell>
                            <TableCell>{getStatusBadge(mosque.status)}</TableCell>
                            <TableCell className="text-center">{businesses.length}</TableCell>
                            <TableCell className="text-center">{coupons.length}</TableCell>
                            <TableCell className="text-center font-semibold">
                              {businesses.length + coupons.length}
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary">${totalKickback}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                defaultValue={manualDonations}
                                className="w-24 text-right"
                                placeholder="$0"
                                onChange={(e) => {
                                  console.log("[v0] Updating manual donation for mosque:", mosque.id, e.target.value)
                                  // In real app, this would update the mosque's manual donations
                                }}
                              />
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-500">${totalPayout}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => toggleExpanded(`payout-${mosque.id}`)}>
                                {expandedItems[`payout-${mosque.id}`] ? "Hide" : "Details"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Expanded Details */}
                {allMosques.map((mosque) => {
                  const { businesses, coupons, totalKickback } = getMosqueAffiliates(mosque.mosqueCode)
                  if (!expandedItems[`payout-${mosque.id}`]) return null

                  return (
                    <div key={`detail-${mosque.id}`} className="mt-4 p-4 rounded-lg bg-secondary/50">
                      <h4 className="font-semibold mb-4">
                        Affiliates for {mosque.name} (Code #{mosque.mosqueCode})
                      </h4>
                      {businesses.length === 0 && coupons.length === 0 ? (
                        <p className="text-muted-foreground">No affiliates yet</p>
                      ) : (
                        <div className="space-y-2">
                          {businesses.map((b) => (
                            <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-background">
                              <div className="flex items-center gap-3">
                                <Store className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{b.title}</p>
                                  <p className="text-sm text-muted-foreground">{b.memberName}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-primary">$1/mo</p>
                                <p className="text-xs text-muted-foreground">
                                  {b.status === "active" ? "Active" : "Inactive - No Payout"}
                                </p>
                              </div>
                            </div>
                          ))}
                          {coupons.map((c) => (
                            <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-background">
                              <div className="flex items-center gap-3">
                                <Ticket className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{c.title}</p>
                                  <p className="text-sm text-muted-foreground">{c.merchant}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-primary">$1/mo</p>
                                <p className="text-xs text-muted-foreground">
                                  {c.status === "active" ? "Active" : "Inactive - No Payout"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financials">
            <div className="space-y-6">
              {/* Date Filter */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Financial Overview
                  </CardTitle>
                  <CardDescription>Track total income, donations, and growth metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-2">
                      <Label htmlFor="finStartDate">Start Date</Label>
                      <Input
                        id="finStartDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="finEndDate">End Date</Label>
                      <Input id="finEndDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                    <Button variant="outline" onClick={exportFinancialsToCSV}>
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-5">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Revenue</CardDescription>
                    <CardTitle className="text-3xl text-primary">${financialSummary.totalRevenue.toFixed(2)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1 text-sm text-green-500">
                      <ArrowUpRight className="h-4 w-4" />
                      <span>All subscription income</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Mosque Kickbacks (10%)</CardDescription>
                    <CardTitle className="text-3xl text-yellow-500">
                      ${financialSummary.totalMosqueKickbacks.toFixed(2)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>Paid to affiliated mosques</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Amanah Org (15%)</CardDescription>
                    <CardTitle className="text-3xl text-blue-500">
                      ${financialSummary.totalAmanahDonation.toFixed(2)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>Children{"'"}s education fund</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Manual Donations</CardDescription>
                    <CardTitle className="text-3xl text-purple-500">
                      ${financialSummary.totalManualDonations.toFixed(2)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Heart className="h-4 w-4" />
                      <span>External donations tracked</span>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-primary">
                  <CardHeader className="pb-2">
                    <CardDescription>Net Revenue</CardDescription>
                    <CardTitle className="text-3xl text-green-500">${financialSummary.netRevenue.toFixed(2)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1 text-sm text-green-500">
                      <TrendingUp className="h-4 w-4" />
                      <span>After all distributions</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Breakdown by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold">Mosques</h4>
                      </div>
                      <p className="text-2xl font-bold">${financialSummary.mosqueRevenue}</p>
                      <p className="text-sm text-muted-foreground">
                        {allMosques.filter((m) => m.status === "active").length} active @ $100/mo
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Store className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold">Businesses</h4>
                      </div>
                      <p className="text-2xl font-bold">${financialSummary.businessRevenue}</p>
                      <p className="text-sm text-muted-foreground">
                        {allBusinesses.filter((b) => b.status === "active").length} active @ $10/mo
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Ticket className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold">Coupons</h4>
                      </div>
                      <p className="text-2xl font-bold">${financialSummary.couponRevenue}</p>
                      <p className="text-sm text-muted-foreground">
                        {allCoupons.filter((c) => c.status === "active").length} active @ $10/mo
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Records */}
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Records</CardTitle>
                  <CardDescription>Detailed breakdown of all financial transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Mosque Kickback</TableHead>
                          <TableHead className="text-right">Amanah Donation</TableHead>
                          <TableHead className="text-right">Net</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {financialSummary.records.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {record.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{record.subscriptionName}</TableCell>
                            <TableCell className="text-right">${record.amount}</TableCell>
                            <TableCell className="text-right text-yellow-500">${record.mosqueKickback || 0}</TableCell>
                            <TableCell className="text-right text-blue-500">${record.amanahOrgDonation || 0}</TableCell>
                            <TableCell className="text-right font-semibold text-green-500">
                              ${record.netRevenue}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Growth Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Growth Planning</CardTitle>
                  <CardDescription>Key metrics for business growth</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-semibold mb-2">Projected Monthly (Current)</h4>
                      <p className="text-3xl font-bold text-primary">
                        ${totalMosques * 100 + (totalBusinesses + totalCoupons) * 10}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Based on {totalMosques} mosques, {totalBusinesses} businesses, {totalCoupons} coupons
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-semibold mb-2">Average Revenue per Mosque</h4>
                      <p className="text-3xl font-bold">
                        $
                        {totalMosques > 0
                          ? (100 + (allBusinesses.length + allCoupons.length) / totalMosques).toFixed(0)
                          : 0}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Including affiliate contributions</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-semibold mb-2">Affiliate Conversion Rate</h4>
                      <p className="text-3xl font-bold">
                        {totalMosques > 0
                          ? (
                              ((allBusinesses.filter((b) => b.affiliatedMosqueCode).length +
                                allCoupons.filter((c) => c.affiliatedMosqueCode).length) /
                                (allBusinesses.length + allCoupons.length)) *
                              100
                            ).toFixed(0)
                          : 0}
                        %
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Businesses/coupons with mosque affiliation</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="members" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Members Overview</h2>
                <p className="text-muted-foreground">View all members and their subscriptions</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search members..." className="pl-10 w-[300px]" />
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {membersLoading ? (
                <Card>
                  <CardContent className="p-6">
                    <p className="text-center text-muted-foreground">Loading members...</p>
                  </CardContent>
                </Card>
              ) : members.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <p className="text-center text-muted-foreground">No members found</p>
                  </CardContent>
                </Card>
              ) : (
                members.map((member) => (
                <Card key={member.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle>{member.name}</CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {member.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {member.phone}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Member since: {new Date(member.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          ${member.subscriptions.reduce((sum: number, sub: any) => sum + sub.price, 0)}/mo
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {member.subscriptions.length} subscription{member.subscriptions.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm font-medium">Active Subscriptions:</div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {member.subscriptions.map((sub: any) => (
                          <div key={sub.id} className="flex flex-col gap-2">
                            <div className="flex items-center justify-between rounded-lg border p-3">
                              <div className="flex items-center gap-2">
                                {sub.type === "mosque" && <Building2 className="h-4 w-4 text-primary" />}
                                {sub.type === "business" && <Store className="h-4 w-4 text-primary" />}
                                {sub.type === "coupon" && <Ticket className="h-4 w-4 text-primary" />}
                                {sub.type === "nonprofit" && <Users className="h-4 w-4 text-primary" />}
                                <div>
                                  <div className="text-sm font-medium">{sub.name}</div>
                                  <div className="text-xs text-muted-foreground">${sub.price}/mo</div>
                                </div>
                              </div>
                              <Dialog
                                open={cancellingId === sub.id}
                                onOpenChange={(open) => !open && setCancellingId(null)}
                              >
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => setCancellingId(sub.id)}>
                                    <Ban className="h-4 w-4 text-destructive" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Cancel Subscription</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <p>Are you sure you want to cancel this subscription?</p>
                                    <div className="rounded-lg bg-muted p-4">
                                      <div className="font-medium">{sub.name}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {sub.type} - ${sub.price}/mo
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button variant="outline" onClick={() => setCancellingId(null)}>
                                        Keep Subscription
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        onClick={() => handleCancelSubscription(sub.id, sub.type)}
                                      >
                                        Cancel Subscription
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                            {sub.affiliatedMosque && (
                              <div className="text-xs text-muted-foreground px-3">
                                Affiliated with: {sub.affiliatedMosque}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
              )}
            </div>
          </TabsContent>

          {/* Payment Alerts Tab */}
          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle>Payment Alerts</CardTitle>
                <CardDescription>Handle failed payments and subscription issues</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {alerts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No payment alerts</p>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border ${
                        alert.resolved ? "bg-secondary/30 border-border" : "bg-destructive/10 border-destructive/20"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <AlertTriangle
                            className={`h-5 w-5 ${alert.resolved ? "text-muted-foreground" : "text-destructive"}`}
                          />
                          <div>
                            <p className="font-semibold">{alert.subscriptionName}</p>
                            <p className="text-sm text-muted-foreground">
                              {alert.memberName} ({alert.memberEmail})
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {alert.alertType === "payment_failed" ? "Payment Failed" : "Subscription Cancelled"} on{" "}
                              {new Date(alert.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {alert.resolved ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                              Resolved {alert.resolvedAt && new Date(alert.resolvedAt).toLocaleDateString()}
                            </Badge>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => handleResolveAlert(alert.id)}>
                              Mark Resolved
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CHANGE: Added Push Notification Requests Tab with scheduled date/time/timezone */}
          <TabsContent value="push-notifications">
            <Card>
              <CardHeader>
                <CardTitle>Push Notification Requests</CardTitle>
                <CardDescription>
                  Review and approve mosque push notification requests (1 per month limit). All requests must be
                  scheduled at least 1 week in advance.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {pushNotificationRequests.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No push notification requests</p>
                ) : (
                  pushNotificationRequests.map((request) => (
                    <div
                      key={request.id}
                      className={`p-4 rounded-lg border ${
                        request.status === "pending"
                          ? "bg-primary/10 border-primary/20"
                          : request.status === "sent"
                            ? "bg-green-500/10 border-green-500/20"
                            : request.status === "rejected"
                              ? "bg-destructive/10 border-destructive/20"
                              : "bg-secondary/30 border-border"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <Bell
                              className={`h-5 w-5 mt-1 flex-shrink-0 ${
                                request.status === "pending"
                                  ? "text-primary"
                                  : request.status === "sent"
                                    ? "text-green-500"
                                    : request.status === "rejected"
                                      ? "text-destructive"
                                      : "text-muted-foreground"
                              }`}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <p className="font-semibold text-lg">{request.title}</p>
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                  Code: #{request.mosqueCode}
                                </Badge>
                                {request.status === "pending" && (
                                  <Badge className="bg-primary/10 text-primary border-primary/20">Pending Review</Badge>
                                )}
                                {request.status === "sent" && (
                                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Sent</Badge>
                                )}
                                {request.status === "rejected" && (
                                  <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                                    Rejected
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{request.mosqueName}</p>
                              <p className="text-sm mb-3">{request.message}</p>

                              <div className="bg-secondary/50 rounded-lg p-3 mb-3 space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">Scheduled:</span>
                                  <span>
                                    {new Date(request.scheduledDate).toLocaleDateString()} at {request.scheduledTime}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Globe className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">Timezone:</span>
                                  <span>{request.timezone}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                                <span>Requested: {new Date(request.requestedAt).toLocaleString()}</span>
                                <span>By: {request.requestedBy}</span>
                                {request.lastRequestDate && (
                                  <span>Last request: {new Date(request.lastRequestDate).toLocaleDateString()}</span>
                                )}
                              </div>
                              {request.status === "sent" && request.sentAt && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Sent: {new Date(request.sentAt).toLocaleString()} by {request.sentBy}
                                </p>
                              )}
                              {request.status === "rejected" && request.rejectedReason && (
                                <p className="text-xs text-destructive mt-1">Reason: {request.rejectedReason}</p>
                              )}
                            </div>
                          </div>
                          {request.status === "pending" && (
                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const reason = prompt("Enter rejection reason:")
                                  if (reason) handleRejectPushNotification(request.id, reason)
                                }}
                              >
                                Reject
                              </Button>
                              <Button size="sm" onClick={() => handleApprovePushNotification(request.id)}>
                                Approve & Send
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Subscription?</AlertDialogTitle>
            <div className="space-y-2">
              <AlertDialogDescription>
                Are you sure you want to reject <strong>{subscriptionToReject?.name || subscriptionToReject?.title || 'this subscription'}</strong>?
              </AlertDialogDescription>
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">This action will:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Mark the subscription as cancelled</li>
                  <li>Mark the entity as rejected</li>
                  <li>Remove it from the app listings</li>
                </ul>
                <p className="mt-2">
                  This action cannot be undone. The user will need to create a new subscription if they want to try again.
                </p>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setRejectDialogOpen(false)
              setSubscriptionToReject(null)
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReject}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={updatingSubscriptionId === subscriptionToReject?.id}
            >
              {updatingSubscriptionId === subscriptionToReject?.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Yes, Reject Subscription"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
