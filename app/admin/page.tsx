"use client"

import React, { useState, useEffect, useMemo } from "react"
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
  Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
// Removed mock data import - now using real API
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"
import { authenticatedGet, authenticatedPatch } from "@/lib/api-client"
import { supabase } from "@/lib/supabase"
import { NotificationBell } from "@/components/notification-bell"

export default function AdminDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const { signOut, user, loading } = useAuth()
  
  // All useState hooks must be at the top before any early returns
  const [alerts, setAlerts] = useState<any[]>([])
  const [alertsLoading, setAlertsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const [copiedField, setCopiedField] = useState<string | null>(null)
  // Calculate default date range: first day of last month to today
  const getDefaultDateRange = () => {
    const today = new Date()
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1) // First day of last month
    return { start: lastMonth, end: today }
  }
  
  const defaultDates = getDefaultDateRange()
  const [startDate, setStartDate] = useState<Date>(defaultDates.start)
  const [endDate, setEndDate] = useState<Date>(defaultDates.end)
  const [activeTab, setActiveTab] = useState("mosques")
  const [payoutsMonth, setPayoutsMonth] = useState(new Date())
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancellingLoading, setCancellingLoading] = useState(false)
  const [members, setMembers] = useState<any[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [subscriptionToReject, setSubscriptionToReject] = useState<{ id: string; name?: string; title?: string } | null>(null)
  const [updatingSubscriptionId, setUpdatingSubscriptionId] = useState<string | null>(null)

  // Push notification requests state (using real API)
  const [pushNotificationRequests, setPushNotificationRequests] = useState<any[]>([])
  const [pushNotifLoading, setPushNotifLoading] = useState(false)
  const pendingPushRequests = pushNotificationRequests.filter((req) => req.status === "pending").length

  // Analytics, Reports, and Activity Logs state
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [activityLogsLoading, setActivityLogsLoading] = useState(false)
  const [activityLogsPagination, setActivityLogsPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [activityLogsFilters, setActivityLogsFilters] = useState({
    search: '',
    action: '',
    entityType: '',
    startDate: '',
    endDate: '',
  })
  const [reportDateRange, setReportDateRange] = useState({ 
    startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), // First day of last month
    endDate: new Date() // Today
  })
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null) // Track which report is being downloaded

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

  // Fetch payment alerts data
  const fetchPaymentAlerts = async () => {
    if (!user || user.role !== 'admin') return
    
    try {
      setAlertsLoading(true)
      const response = await authenticatedGet('/api/admin/payment-alerts') as any
      
      console.log('[Admin Dashboard] Payment Alerts Response:', response)
      
      if (response.success && response.data) {
        console.log('[Admin Dashboard] Alerts received:', response.data.alerts?.length || 0)
        setAlerts(response.data.alerts || [])
      } else {
        console.error('[Admin Dashboard] Failed to fetch alerts:', response)
        setAlerts([])
      }
    } catch (error: any) {
      console.error('[Admin Dashboard] Error fetching alerts:', error)
      toast({
        title: "Error loading payment alerts",
        description: error.message || "Failed to load payment alerts",
        variant: "destructive"
      })
      setAlerts([])
    } finally {
      setAlertsLoading(false)
    }
  }

  useEffect(() => {
    if (!loading) {
      fetchMembers()
      fetchPaymentAlerts()
      fetchPushNotifications()
    }
  }, [user, loading])

  // Fetch push notification requests (real API)
  const fetchPushNotifications = async () => {
    if (!user || user.role !== 'admin') return

    try {
      setPushNotifLoading(true)
      const response: any = await authenticatedGet('/api/admin/push-notifications')
      
      if (response.success && response.data) {
        setPushNotificationRequests(response.data.requests || [])
      } else {
        setPushNotificationRequests([])
      }
    } catch (error) {
      console.error('[Admin Dashboard] Error fetching push notifications:', error)
      setPushNotificationRequests([])
    } finally {
      setPushNotifLoading(false)
    }
  }

  // Approve push notification (real API)
  const handleApprovePushNotification = async (requestId: string) => {
    try {
      const response: any = await authenticatedPatch(`/api/admin/push-notifications/${requestId}/approve`, {})
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Push notification approved and sent successfully",
        })
        // Refresh push notifications
        await fetchPushNotifications()
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to approve push notification",
          variant: "destructive"
        })
      }
    } catch (error: any) {
      console.error('[Admin Dashboard] Error approving push notification:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to approve push notification",
        variant: "destructive"
      })
    }
  }

  // Reject push notification (real API)
  const handleRejectPushNotification = async (requestId: string, reason: string) => {
    try {
      const response: any = await authenticatedPatch(`/api/admin/push-notifications/${requestId}/reject`, { reason })
      
      if (response.success) {
        toast({
          title: "Success",
          description: "Push notification request rejected",
        })
        // Refresh push notifications
        await fetchPushNotifications()
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to reject push notification",
          variant: "destructive"
        })
      }
    } catch (error: any) {
      console.error('[Admin Dashboard] Error rejecting push notification:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to reject push notification",
        variant: "destructive"
      })
    }
  }

  // Download report with proper authentication and blob handling
  const handleDownloadReport = async (reportType: string, fileFormat: 'csv' | 'pdf') => {
    const reportKey = `${reportType}-${fileFormat}`
    setDownloadingReport(reportKey)
    
    try {
      const params = new URLSearchParams()
      params.append('format', fileFormat)
      if (reportDateRange.startDate) params.append('start_date', format(reportDateRange.startDate, 'yyyy-MM-dd'))
      if (reportDateRange.endDate) params.append('end_date', format(reportDateRange.endDate, 'yyyy-MM-dd'))
      
      const apiUrl = `/api/admin/reports/${reportType}?${params.toString()}`
      
      // Get the current session for authentication
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('Not authenticated. Please login again.')
      }
      
      // Use authenticated fetch with Bearer token
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Accept': fileFormat === 'pdf' ? 'application/pdf' : 'text/csv',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to download report' }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      // Get the blob from response
      const blob = await response.blob()
      
      // Extract filename from Content-Disposition header or create default
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.${fileFormat}`
      
      if (contentDisposition) {
        // Match both quoted and unquoted filenames properly
        // Example: attachment; filename="report.pdf" or attachment; filename=report.pdf
        const quotedMatch = contentDisposition.match(/filename="([^"]+)"/)
        const unquotedMatch = contentDisposition.match(/filename=([^;\s]+)/)
        
        if (quotedMatch) {
          filename = quotedMatch[1]
        } else if (unquotedMatch) {
          filename = unquotedMatch[1]
        }
      }
      
      // Create a blob URL and trigger download
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
      
      toast({
        title: "Success",
        description: `${reportType.replace('-', ' ')} report downloaded successfully`,
      })
    } catch (error: any) {
      console.error('Error downloading report:', error)
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download report",
        variant: "destructive",
      })
    } finally {
      setDownloadingReport(null)
    }
  }

  // REMOVED: markAsAdded function

  // Fetch activity logs with pagination and filters
  const fetchActivityLogs = async (page: number = activityLogsPagination.page) => {
    setActivityLogsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', activityLogsPagination.limit.toString())
      
      if (activityLogsFilters.action) params.append('action', activityLogsFilters.action)
      if (activityLogsFilters.entityType) params.append('entity_type', activityLogsFilters.entityType)
      if (activityLogsFilters.startDate) params.append('start_date', activityLogsFilters.startDate)
      
      // Make end date inclusive by adding 1 day
      if (activityLogsFilters.endDate) {
        const endDate = new Date(activityLogsFilters.endDate)
        endDate.setDate(endDate.getDate() + 1) // Add 1 day to include the entire end date
        params.append('end_date', format(endDate, 'yyyy-MM-dd'))
      }
      
      const response = await authenticatedGet(`/api/admin/activity-logs?${params.toString()}`) as any
      
      if (response.success) {
        setActivityLogs(response.data.logs || [])
        setActivityLogsPagination(response.data.pagination)
      } else {
        throw new Error(response.error || 'Failed to load activity logs')
      }
    } catch (error: any) {
      console.error('Error fetching activity logs:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to load activity logs",
        variant: "destructive"
      })
      setActivityLogs([])
    } finally {
      setActivityLogsLoading(false)
    }
  }

  // Auto-load activity logs when tab is accessed
  useEffect(() => {
    if (activeTab === 'activity-logs' && activityLogs.length === 0 && !activityLogsLoading) {
      fetchActivityLogs(1)
    }
  }, [activeTab])

  // Update subscription app status
  // Helper function to optimistically update subscription status in members array
  const updateSubscriptionStatusOptimistically = (
    subscriptionId: string,
    newAppStatus: "active" | "removed" | "cancelled",
    newEntityStatus?: "active" | "inactive" | "rejected"
  ) => {
    setMembers((prevMembers) =>
      (Array.isArray(prevMembers) ? prevMembers : []).map((member) => ({
        ...member,
        subscriptions: (Array.isArray(member.subscriptions) ? member.subscriptions : []).map((sub: any) => {
          if (sub.id === subscriptionId) {
            const updatedSub = {
              ...sub,
              app_status: newAppStatus,
            }
            
            // Update entity status if provided
            if (newEntityStatus && sub.entity) {
              updatedSub.entity = {
                ...sub.entity,
                status: newEntityStatus,
              }
            }
            
            return updatedSub
          }
          return sub
        }),
      }))
    )
  }

  const updateAppStatus = async (subscriptionId: string, newStatus: "active" | "removed" | "cancelled", entityStatus?: "active" | "inactive" | "rejected") => {
    // Store previous state for rollback
    const previousMembers = JSON.parse(JSON.stringify(members))
    
    // Optimistically update the UI immediately
    updateSubscriptionStatusOptimistically(subscriptionId, newStatus, entityStatus)
    
    // Set loading state
    setUpdatingSubscriptionId(subscriptionId)
    
    try {
      console.log('[Admin Dashboard] Updating subscription status:', {
        subscriptionId,
        newStatus,
        entityStatus
      })
      
      const response: any = await authenticatedPatch(`/api/admin/subscriptions/${subscriptionId}/status`, {
        app_status: newStatus,
        entity_status: entityStatus
      })

      console.log('[Admin Dashboard] Update response:', response)

      if (response.success) {
        // Show success toast only after backend confirms success
        const statusText = newStatus === "active" ? "Marked as Active" : newStatus === "removed" ? "Marked as Removed" : "Rejected"
        toast({
          title: "Success",
          description: `Subscription ${statusText} successfully`,
        })
        // Refresh members data in the background to ensure consistency
        // The optimistic update already shows the new state, so this is just for confirmation
        fetchMembers().catch((error) => {
          console.error('[Admin Dashboard] Background refresh failed:', error)
          // Don't show error toast for background refresh failures
        })
        // Close reject dialog if open
        setRejectDialogOpen(false)
        setSubscriptionToReject(null)
      } else {
        console.error('[Admin Dashboard] Update failed:', response)
        // Revert optimistic update on failure
        setMembers(previousMembers)
        throw new Error(response.error || response.message || 'Failed to update status')
      }
    } catch (error: any) {
      console.error('[Admin Dashboard] Update error:', error)
      // Revert optimistic update on error
      setMembers(previousMembers)
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

  const allMosques = (Array.isArray(members) ? members : [])
    .flatMap((m) =>
      (Array.isArray(m.subscriptions) ? m.subscriptions : [])
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
    )
    .sort((a, b) => {
      // Sort by creation date: newest first (descending order)
      const dateA = new Date(a.createdAt || 0).getTime()
      const dateB = new Date(b.createdAt || 0).getTime()
      return dateB - dateA
    }) as (MosqueSubscription & {
    memberName: string
    memberEmail: string
    memberPhone?: string
    memberId: string
    appStatus?: "active" | "removed" | "pending_verification" | "cancelled" // Added appStatus
  })[]
  
  console.log('[Admin Dashboard] Total mosques found:', allMosques.length)

  const allBusinesses = (Array.isArray(members) ? members : [])
    .flatMap((m) =>
      (Array.isArray(m.subscriptions) ? m.subscriptions : [])
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
    )
    .sort((a, b) => {
      // Sort by creation date: newest first (descending order)
      const dateA = new Date(a.createdAt || 0).getTime()
      const dateB = new Date(b.createdAt || 0).getTime()
      return dateB - dateA
    }) as (BusinessSubscription & {
    memberName: string
    memberEmail: string
    memberPhone?: string
    memberId: string
    appStatus?: "active" | "removed" | "pending_verification" | "cancelled" // Added appStatus
  })[]

  const allCoupons = (Array.isArray(members) ? members : [])
    .flatMap((m) =>
      (Array.isArray(m.subscriptions) ? m.subscriptions : [])
        .filter((s: any) => s.type === "coupon")
        .map((s: any) => ({
          ...s.entity,
          ...s, // Spread subscription after entity to preserve subscription.id
          subscriptionId: s.id, // Preserve subscription ID explicitly
          id: s.id, // Ensure id is subscription ID
          memberName: m.name,
          memberEmail: m.email,
          memberPhone: m.phone,
          memberId: m.id,
          appStatus: s.app_status || "pending_verification",
          // Map database fields (snake_case) to frontend fields (camelCase)
          title: s.entity?.title,
          merchant: s.entity?.merchant,
          description: s.entity?.description,
          thumbnailDescription: s.entity?.thumbnail_description,
          popUpText: s.entity?.pop_up_text,
          phone: s.entity?.phone,
          email: s.entity?.email,
          website: s.entity?.website,
          address: s.entity?.address,
          // Redemption limits
          redeemLimit: s.entity?.redeem_limit,
          userRedeemLimit: s.entity?.user_redeem_limit,
          userMonthlyRedeemLimit: s.entity?.user_monthly_redeem_limit,
          userWeeklyRedeemLimit: s.entity?.user_weekly_redeem_limit,
          // Discount details
          discountAmount: s.entity?.discount_amount,
          discountPercentage: s.entity?.discount_percentage,
          couponCode: s.entity?.coupon_code,
          redeemCode: s.entity?.redeem_code,
          prefix: s.entity?.prefix,
          nextNo: s.entity?.next_no,
          // Validity dates
          startDate: s.entity?.start_date,
          endDate: s.entity?.end_date,
          // Media
          photo: s.entity?.photos?.[0], // First photo for thumbnail
          photos: s.entity?.photos || [],
          // Affiliation
          affiliatedMosqueCode: s.entity?.affiliated_mosque_code,
          // Subscription fields
          type: "coupon",
          status: s.status,
          price: s.price,
          interval: s.interval,
          nextBillingDate: s.next_billing_date,
          createdAt: s.created_at,
          paymentStartDate: s.created_at, // Use created_at as payment start date
        })),
    )
    .sort((a, b) => {
      // Sort by creation date: newest first (descending order)
      const dateA = new Date(a.createdAt || 0).getTime()
      const dateB = new Date(b.createdAt || 0).getTime()
      return dateB - dateA
    }) as (CouponSubscription & {
    memberName: string
    memberEmail: string
    memberPhone?: string
    memberId: string
    appStatus?: "active" | "removed" | "pending_verification" | "cancelled"
  })[]

  // ADDED: allNonprofits data structure
  const allNonprofits = (Array.isArray(members) ? members : [])
    .flatMap((m) =>
      (Array.isArray(m.subscriptions) ? m.subscriptions : [])
        .filter((s: any) => s.type === "nonprofit")
        .map((s: any) => {
          // Debug logging for nonprofits
          console.log('[Admin Dashboard] Processing nonprofit subscription:', {
            subscriptionId: s.id,
            app_status: s.app_status,
            subscription_status: s.status,
            entity_name: s.entity?.name
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
            // App lifecycle statuses: pending_verification, active, update_pending, removed, cancelled
            // Use app_status from subscription, fallback to pending_verification
            // Note: app_status can be: pending_verification, active, removed, cancelled, update_pending
            appStatus: s.app_status || "pending_verification",
            appLifecycle: s.app_status || "pending_verification",
            // Map database fields to expected interface
            title: s.entity?.name,
            name: s.entity?.name, // Ensure name is available
            type: "nonprofit",
            status: s.status, // This is subscription payment status (active, cancelled, etc.)
            price: s.price,
            interval: s.interval,
            nextBillingDate: s.next_billing_date,
            createdAt: s.created_at,
          }
        }),
    )
    .sort((a, b) => {
      // Sort by creation date: newest first (descending order)
      const dateA = new Date(a.createdAt || 0).getTime()
      const dateB = new Date(b.createdAt || 0).getTime()
      return dateB - dateA
    }) as Array<
    Subscription & {
      memberName: string
      memberEmail: string
      memberPhone?: string
      memberId: string
      appLifecycle: "pending_verification" | "active" | "update_pending" | "removed" | "cancelled"
    }
  >

  const totalMosques = allMosques.length
  const totalBusinesses = allBusinesses.length
  const totalCoupons = allCoupons.length
  const totalNonprofits = allNonprofits.length // Added totalNonprofits
  const unresolvedAlerts = alerts.filter((a) => !a.resolved).length

  const getMosqueAffiliates = (mosqueCode: number) => {
    // Filter businesses: must have mosque affiliation, active payment status, AND approved by admin
    const businesses = allBusinesses.filter((b) => 
      b.affiliatedMosqueCode === mosqueCode && 
      b.status === "active" && 
      b.appStatus === "active"  // Only count approved affiliates
    )
    // Filter coupons: must have mosque affiliation, active payment status, AND approved by admin
    const coupons = allCoupons.filter((c) => 
      c.affiliatedMosqueCode === mosqueCode && 
      c.status === "active" &&
      c.appStatus === "active"  // Only count approved affiliates
    )
    const totalKickback = (businesses.length + coupons.length) * 1 // $1 per affiliate (10% of $10)
    return { businesses, coupons, totalKickback }
  }

  // Generate real financial records from actual subscriptions
  const generateFinancialRecords = () => {
    // Safety check: return empty array if members is not available
    if (!members || !Array.isArray(members)) {
      return [] as any[]
    }
    
    const records = [] as any[]
    
    members.forEach((member) => {
      if (!member || !member.subscriptions || !Array.isArray(member.subscriptions)) {
        return
      }
      
      member.subscriptions.forEach((sub: any) => {
        // Only include active subscriptions with approved app_status
        if (!sub || sub.status !== 'active' || sub.app_status !== 'active') {
          return
        }

        const subscriptionDate = sub.created_at || sub.next_billing_date || new Date().toISOString()
        let amount = 0
        let mosqueKickback = 0
        let amanahOrgDonation = 0
        let netRevenue = 0
        let subscriptionName = ''

        // Determine pricing and name based on type
        switch (sub.type) {
          case 'mosque':
            amount = 100
            subscriptionName = sub.entity?.name || 'Unnamed Mosque'
            amanahOrgDonation = amount * 0.15 // 15% to Amanah education fund
            netRevenue = amount - amanahOrgDonation // 85% to Amanah
            break

          case 'business':
            amount = 10
            subscriptionName = sub.entity?.name || 'Unnamed Business'
            // If affiliated with mosque, 10% goes to mosque
            if (sub.entity?.affiliated_mosque_code) {
              mosqueKickback = amount * 0.10 // $1 to mosque
            }
            amanahOrgDonation = amount * 0.15 // $1.50 to Amanah education fund
            netRevenue = amount - mosqueKickback - amanahOrgDonation // $7.50 or $8.50 to Amanah
            break

          case 'coupon':
            amount = 10
            subscriptionName = sub.entity?.title || 'Unnamed Coupon'
            // If affiliated with mosque, 10% goes to mosque
            if (sub.entity?.affiliated_mosque_code) {
              mosqueKickback = amount * 0.10 // $1 to mosque
            }
            amanahOrgDonation = amount * 0.15 // $1.50 to Amanah education fund
            netRevenue = amount - mosqueKickback - amanahOrgDonation // $7.50 or $8.50 to Amanah
            break

          case 'nonprofit':
            amount = 50
            subscriptionName = sub.entity?.name || 'Unnamed Nonprofit'
            amanahOrgDonation = amount * 0.15 // $7.50 to Amanah education fund
            netRevenue = amount - amanahOrgDonation // $42.50 to Amanah
            break
        }

        records.push({
          id: sub.id,
          date: subscriptionDate,
          type: sub.type,
          subscriptionId: sub.id,
          subscriptionName,
          amount,
          mosqueKickback,
          amanahOrgDonation,
          netRevenue,
          affiliatedMosqueCode: sub.entity?.affiliated_mosque_code || null,
        })
      })
    })

    return records
  }

  const filterFinancialsByDate = () => {
    const allRecords = generateFinancialRecords()
    return allRecords.filter((r) => {
      const recordDate = new Date(r.date)
      // Set time to start of day for accurate comparison
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      return recordDate >= start && recordDate <= end
    })
  }

  const calculateFinancialSummary = () => {
    // Safety check: return default values if members not loaded
    if (!members || !Array.isArray(members) || membersLoading) {
      return {
        totalRevenue: 0,
        mosqueRevenue: 0,
        businessRevenue: 0,
        couponRevenue: 0,
        nonprofitRevenue: 0,
        totalMosqueKickbacks: 0,
        totalAmanahDonation: 0,
        totalManualDonations: 0,
        netRevenue: 0,
        records: [],
      }
    }
    
    const records = filterFinancialsByDate()
    if (!Array.isArray(records)) {
      return {
        totalRevenue: 0,
        mosqueRevenue: 0,
        businessRevenue: 0,
        couponRevenue: 0,
        nonprofitRevenue: 0,
        totalMosqueKickbacks: 0,
        totalAmanahDonation: 0,
        totalManualDonations: 0,
        netRevenue: 0,
        records: [],
      }
    }
    
    const totalRevenue = records.reduce((acc, r) => acc + (r.amount || 0), 0)
    const mosqueRevenue = records.filter((r) => r.type === "mosque").reduce((acc, r) => acc + (r.amount || 0), 0)
    const businessRevenue = records.filter((r) => r.type === "business").reduce((acc, r) => acc + (r.amount || 0), 0)
    const couponRevenue = records.filter((r) => r.type === "coupon").reduce((acc, r) => acc + (r.amount || 0), 0)
    const nonprofitRevenue = records.filter((r) => r.type === "nonprofit").reduce((acc, r) => acc + (r.amount || 0), 0)
    const totalMosqueKickbacks = records.reduce((acc, r) => acc + (r.mosqueKickback || 0), 0)
    const totalAmanahDonation = records.reduce((acc, r) => acc + (r.amanahOrgDonation || 0), 0)
    const netRevenue = records.reduce((acc, r) => acc + (r.netRevenue || 0), 0)

    // Calculate total manual donations from mosques
    const totalManualDonations = (Array.isArray(members) ? members : []).reduce((sum, member) => {
      return (
        sum +
        (Array.isArray(member.subscriptions) ? member.subscriptions : []).reduce((subSum: number, sub: any) => {
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
      nonprofitRevenue,
      totalMosqueKickbacks,
      totalAmanahDonation,
      totalManualDonations,
      netRevenue,
      records,
    }
  }

  const handleResolveAlert = async (alertId: string) => {
    try {
      console.log('[Admin Dashboard] Resolving alert:', alertId)
      
      // Optimistically update UI
      setAlerts(
        alerts.map((a) => (a.id === alertId ? { ...a, resolved: true, resolvedAt: new Date().toISOString() } : a))
      )

      // Call API to mark as resolved
      const response: any = await authenticatedPatch(`/api/admin/payment-alerts/${alertId}/resolve`, {})

      console.log('[Admin Dashboard] Resolve alert response:', response)

      if (response.success) {
        toast({
          title: "Alert Dismissed",
          description: "Alert has been marked as resolved and will no longer appear.",
        })
        
        // Refresh alerts to get updated data
        await fetchPaymentAlerts()
      } else {
        console.error('[Admin Dashboard] Failed to resolve alert:', response)
        // Revert on failure
        await fetchPaymentAlerts()
        toast({
          title: "Error Resolving Alert",
          description: response.error || response.message || "Failed to resolve alert. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error('[Admin Dashboard] Error resolving alert:', error)
      // Revert on error
      await fetchPaymentAlerts()
      toast({
        title: "Error",
        description: `Failed to resolve alert: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      })
    }
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
      case "pending_verification":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Pending Verification</Badge>
      case "active":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Active</Badge>
      case "update_pending":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Update Pending</Badge>
      case "removed":
        return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">Removed</Badge>
      case "cancelled":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Cancelled</Badge>
      default:
        return <Badge variant="outline">{lifecycle || "pending_verification"}</Badge>
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
    const startDateStr = format(startDate, "yyyy-MM-dd")
    const endDateStr = format(endDate, "yyyy-MM-dd")
    a.download = `amanah_financials_${startDateStr}_to_${endDateStr}.csv`
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

  const financialSummary = useMemo(() => {
    // Only calculate when members data is loaded
    if (membersLoading || !members || !Array.isArray(members)) {
      return {
        totalRevenue: 0,
        mosqueRevenue: 0,
        businessRevenue: 0,
        couponRevenue: 0,
        nonprofitRevenue: 0,
        totalMosqueKickbacks: 0,
        totalAmanahDonation: 0,
        totalManualDonations: 0,
        netRevenue: 0,
        records: [],
      }
    }
    return calculateFinancialSummary()
  }, [members, membersLoading, startDate, endDate])

  const handleCancelSubscription = async (subscriptionId: string, type?: string) => {
    try {
      setCancellingLoading(true)
      
      // Call API to cancel the subscription
      const response: any = await authenticatedPatch(`/api/admin/subscriptions/${subscriptionId}/status`, {
        app_status: 'cancelled',
        entity_status: 'inactive'
      })

      if (response.success) {
        // Update local state instead of refetching
        updateSubscriptionStatusOptimistically(subscriptionId, 'cancelled', 'inactive')
        
        // Close dialog
        setCancellingId(null)
        
        toast({
          title: "Subscription Cancelled",
          description: `${type || "Subscription"} has been cancelled and marked for removal.`,
        })
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to cancel subscription",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error('Error cancelling subscription:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      })
    } finally {
      setCancellingLoading(false)
    }
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
            <TabsTrigger value="analytics">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="reports">
              <FileText className="h-4 w-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="activity-logs">
              <FileText className="h-4 w-4 mr-2" />
              Activity Logs
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
                              {coupon.createdAt && (
                                <p className="text-xs text-muted-foreground">
                                  Started: {new Date(coupon.createdAt).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </p>
                              )}
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
                                <div className="space-y-2 text-sm">
                                  {coupon.discountAmount && (
                                    <p>
                                      <span className="font-medium">Amount:</span> {coupon.discountAmount}
                                    </p>
                                  )}
                                  {coupon.discountPercentage && (
                                    <p>
                                      <span className="font-medium">Percentage:</span> {coupon.discountPercentage}
                                    </p>
                                  )}
                                  {coupon.couponCode && (
                                    <p className="flex items-center gap-2">
                                      <span className="font-medium">Coupon Code:</span>
                                      <span className="font-mono bg-secondary px-2 py-1 rounded">
                                        {coupon.couponCode}
                                      </span>
                                      <CopyButton text={coupon.couponCode} fieldId={`${coupon.id}-coupon-code`} />
                                    </p>
                                  )}
                                  {coupon.redeemCode && (
                                    <p className="flex items-center gap-2">
                                      <span className="font-medium">Redeem Code:</span>
                                      <span className="font-mono bg-secondary px-2 py-1 rounded">
                                        {coupon.redeemCode}
                                      </span>
                                      <CopyButton text={coupon.redeemCode} fieldId={`${coupon.id}-redeem-code`} />
                                    </p>
                                  )}
                                  {(coupon.prefix || coupon.nextNo) && (
                                    <p>
                                      <span className="font-medium">Code Format:</span> {coupon.prefix || ""}
                                      {coupon.nextNo || ""}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div>
                                <h4 className="font-semibold mb-2">Redemption Limits</h4>
                                <div className="space-y-1 text-sm">
                                  {coupon.redeemLimit && (
                                    <p>
                                      <span className="font-medium">Total Limit:</span> {coupon.redeemLimit} redemptions
                                    </p>
                                  )}
                                  {coupon.userRedeemLimit && (
                                    <p>
                                      <span className="font-medium">Per User:</span> {coupon.userRedeemLimit} time
                                      {coupon.userRedeemLimit !== 1 ? "s" : ""}
                                    </p>
                                  )}
                                  {coupon.userMonthlyRedeemLimit && (
                                    <p>
                                      <span className="font-medium">Monthly Limit:</span> {coupon.userMonthlyRedeemLimit}{" "}
                                      per user
                                    </p>
                                  )}
                                  {coupon.userWeeklyRedeemLimit && (
                                    <p>
                                      <span className="font-medium">Weekly Limit:</span> {coupon.userWeeklyRedeemLimit}{" "}
                                      per user
                                    </p>
                                  )}
                                  {!coupon.redeemLimit &&
                                    !coupon.userRedeemLimit &&
                                    !coupon.userMonthlyRedeemLimit &&
                                    !coupon.userWeeklyRedeemLimit && (
                                      <p className="text-muted-foreground italic">No limits set</p>
                                    )}
                                </div>
                              </div>
                              <div>
                                <h4 className="font-semibold mb-2">Validity Period</h4>
                                <div className="text-sm space-y-1">
                                  {coupon.startDate ? (
                                    <p>
                                      <span className="font-medium">Start:</span>{" "}
                                      {new Date(coupon.startDate).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      })}
                                    </p>
                                  ) : (
                                    <p className="text-muted-foreground italic">No start date</p>
                                  )}
                                  {coupon.endDate ? (
                                    <p>
                                      <span className="font-medium">End:</span>{" "}
                                      {new Date(coupon.endDate).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      })}
                                    </p>
                                  ) : (
                                    <p className="text-muted-foreground italic">No end date (ongoing)</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Thumbnail Description */}
                          {coupon.thumbnailDescription && (
                            <div>
                              <h4 className="font-semibold mb-2">Thumbnail Description</h4>
                              <p className="text-sm text-muted-foreground">{coupon.thumbnailDescription}</p>
                            </div>
                          )}

                          {/* Contact Information */}
                          <div className="space-y-3">
                            <h4 className="font-semibold">Contact Information</h4>
                            <div className="grid md:grid-cols-2 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{coupon.email}</span>
                                <CopyButton text={coupon.email} fieldId={`${coupon.id}-email`} />
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{coupon.phone}</span>
                                <CopyButton text={coupon.phone} fieldId={`${coupon.id}-phone`} />
                              </div>
                              {coupon.website && (
                                <div className="flex items-center gap-2">
                                  <Globe className="h-4 w-4 text-muted-foreground" />
                                  <a
                                    href={coupon.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    {coupon.website}
                                  </a>
                                  <CopyButton text={coupon.website} fieldId={`${coupon.id}-website`} />
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="flex-1">{coupon.address}</span>
                                <CopyButton text={coupon.address} fieldId={`${coupon.id}-address`} />
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
            {allNonprofits.map((nonprofit) => {
              const subscriptionId = (nonprofit as any).subscriptionId || nonprofit.id
              return (
              <Card
                key={subscriptionId}
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
                      {(nonprofit.appLifecycle === "pending_verification" || nonprofit.appLifecycle === "pending") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20"
                          disabled={updatingSubscriptionId === subscriptionId}
                          onClick={(e) => {
                            e.stopPropagation()
                            updateAppStatus(subscriptionId, "active", "active")
                          }}
                        >
                          {updatingSubscriptionId === subscriptionId ? (
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
                      )}
                      {(nonprofit.appLifecycle === "active" || nonprofit.appLifecycle === "update_pending") && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={updatingSubscriptionId === subscriptionId}
                          onClick={(e) => {
                            e.stopPropagation()
                            updateAppStatus(subscriptionId, "removed")
                          }}
                        >
                          {updatingSubscriptionId === ((nonprofit as any).subscriptionId || nonprofit.id) ? (
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
                      )}
                      {(nonprofit.appLifecycle === "removed" || nonprofit.appLifecycle === "cancelled") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20"
                          disabled={updatingSubscriptionId === subscriptionId}
                          onClick={(e) => {
                            e.stopPropagation()
                            updateAppStatus(subscriptionId, "active", "active")
                          }}
                        >
                          {updatingSubscriptionId === subscriptionId ? (
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
                      )}
                      <Button variant="ghost" size="sm" onClick={() => toggleExpanded(`nonprofit-${subscriptionId}`)}>
                        {expandedItems[`nonprofit-${subscriptionId}`] ? <ChevronUp /> : <ChevronDown />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {expandedItems[`nonprofit-${subscriptionId}`] && (
                  <CardContent className="space-y-4">
                    {/* Display all nonprofit fields */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label className="text-muted-foreground">Organization Name</Label>
                        <p className="font-medium">{nonprofit.name}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Contact Person</Label>
                        <p>{(nonprofit as any).contact_name || 'N/A'}</p>
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
                      <div className="md:col-span-2">
                        <Label className="text-muted-foreground">Website</Label>
                        <p>
                          {(nonprofit as any).website ? (
                            <a
                              href={(nonprofit as any).website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {(nonprofit as any).website}
                            </a>
                          ) : (
                            'N/A'
                          )}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-muted-foreground">Address</Label>
                        <div className="flex items-center gap-2">
                          <p>
                            {(nonprofit as any).address}
                            {(nonprofit as any).city && `, ${(nonprofit as any).city}`}
                            {(nonprofit as any).state && `, ${(nonprofit as any).state}`}
                            {(nonprofit as any).zip && ` ${(nonprofit as any).zip}`}
                            {(nonprofit as any).country && `, ${(nonprofit as any).country}`}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(`${(nonprofit as any).address}, ${(nonprofit as any).city}, ${(nonprofit as any).state} ${(nonprofit as any).zip}`)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-muted-foreground">About Organization</Label>
                        <p className="whitespace-pre-wrap">{(nonprofit as any).description || (nonprofit as any).about || 'N/A'}</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Links & Programs */}
                    <div>
                      <h4 className="font-semibold mb-3">Links & Programs</h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label className="text-muted-foreground">Donate Link</Label>
                          <p>
                            {(nonprofit as any).donate_link ? (
                              <a
                                href={(nonprofit as any).donate_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {(nonprofit as any).donate_link}
                              </a>
                            ) : (
                              'N/A'
                            )}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Programs/Events Page</Label>
                          <p>
                            {(nonprofit as any).programs_link ? (
                              <a
                                href={(nonprofit as any).programs_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {(nonprofit as any).programs_link}
                              </a>
                            ) : (
                              'N/A'
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Services/Programs List */}
                    {(nonprofit as any).services && (() => {
                      try {
                        const services = typeof (nonprofit as any).services === 'string' 
                          ? JSON.parse((nonprofit as any).services) 
                          : (nonprofit as any).services
                        if (Array.isArray(services) && services.length > 0) {
                          return (
                            <div>
                              <Label className="text-muted-foreground mb-2 block">Services / Programs</Label>
                              <div className="space-y-2">
                                {services.map((service: any, idx: number) => (
                                  <div key={idx} className="p-3 bg-secondary/30 rounded-lg">
                                    <p className="font-medium text-sm mb-1">{service.name}</p>
                                    {service.link && (
                                      <a
                                        href={service.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline break-all"
                                      >
                                        <Globe className="h-3 w-3 inline mr-1" />
                                        {service.link}
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        }
                      } catch (e) {
                        return null
                      }
                      return null
                    })()}

                    {/* Board Members / Leadership Team */}
                    {(nonprofit as any).committee_members && (() => {
                      try {
                        const committee = typeof (nonprofit as any).committee_members === 'string' 
                          ? JSON.parse((nonprofit as any).committee_members) 
                          : (nonprofit as any).committee_members
                        if (Array.isArray(committee) && committee.length > 0) {
                          return (
                            <div>
                              <Label className="text-muted-foreground mb-2 block">Board Members / Leadership Team</Label>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {committee.map((member: any, idx: number) => (
                                  <div key={idx} className="flex flex-col items-center text-center p-3 bg-secondary/30 rounded-lg">
                                    {member.photo && (
                                      <img
                                        src={member.photo}
                                        alt={member.name}
                                        className="h-20 w-20 rounded-full object-cover mb-2"
                                      />
                                    )}
                                    <p className="font-medium text-sm">{member.name}</p>
                                    <p className="text-xs text-muted-foreground">{member.title}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        }
                      } catch (e) {
                        return null
                      }
                      return null
                    })()}

                    {/* Social Media */}
                    <div>
                      <Label className="text-muted-foreground mb-2 block">Social Media</Label>
                      {(() => {
                        const socialMedia = (nonprofit as any).social_media
                        if (!socialMedia) return <p className="text-muted-foreground text-sm">N/A</p>
                        if (typeof socialMedia === 'string') return <p className="whitespace-pre-wrap text-sm">{socialMedia}</p>
                        // If it's an object, display individual links
                        return (
                          <div className="space-y-1">
                            {socialMedia.facebook && (
                              <p className="text-sm">
                                <span className="font-medium">Facebook:</span>{' '}
                                <a href={socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                  {socialMedia.facebook}
                                </a>
                              </p>
                            )}
                            {socialMedia.instagram && (
                              <p className="text-sm">
                                <span className="font-medium">Instagram:</span>{' '}
                                <a href={socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                  {socialMedia.instagram}
                                </a>
                              </p>
                            )}
                            {socialMedia.twitter && (
                              <p className="text-sm">
                                <span className="font-medium">X (Twitter):</span>{' '}
                                <a href={socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                  {socialMedia.twitter}
                                </a>
                              </p>
                            )}
                            {socialMedia.other_social && (
                              <p className="text-sm">
                                <span className="font-medium">Other:</span>{' '}
                                <a href={socialMedia.other_social} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                  {socialMedia.other_social}
                                </a>
                              </p>
                            )}
                            {!socialMedia.facebook && !socialMedia.instagram && !socialMedia.twitter && !socialMedia.other_social && (
                              <p className="text-muted-foreground text-sm">N/A</p>
                            )}
                          </div>
                        )
                      })()}
                    </div>

                    {/* Logo */}
                    {(nonprofit as any).logo && (
                      <div>
                        <Label className="text-muted-foreground mb-2 block">Logo</Label>
                        <img
                          src={(nonprofit as any).logo}
                          alt="Organization Logo"
                          className="h-24 w-24 object-contain rounded-lg border"
                        />
                      </div>
                    )}

                    {/* Photos */}
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
              )
            })}
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
                        const isExpanded = expandedItems[`payout-${mosque.id}`]
                        
                        return (
                          <React.Fragment key={mosque.id}>
                            <TableRow key={mosque.id} className={isExpanded ? "border-b-0" : ""}>
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
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="h-4 w-4 mr-1" />
                                      Hide
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-4 w-4 mr-1" />
                                      Details
                                    </>
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                            
                            {/* Expanded Details Row */}
                            {isExpanded && (
                              <TableRow key={`detail-${mosque.id}`}>
                                <TableCell colSpan={10} className="p-0 bg-secondary/30">
                                  <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h4 className="font-semibold text-lg mb-1">
                            Affiliate Details for {mosque.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Code #{mosque.mosqueCode} • {businesses.length + coupons.length} Active Affiliates • ${totalKickback}/month
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-primary/10 text-primary">
                          Total Payout: ${totalKickback}
                        </Badge>
                      </div>

                      {businesses.length === 0 && coupons.length === 0 ? (
                        <div className="text-center py-8">
                          <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                          <p className="text-muted-foreground font-medium">No affiliates yet</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Businesses and coupons that affiliate with this mosque will appear here
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Businesses Section */}
                          {businesses.length > 0 && (
                            <div>
                              <h5 className="font-semibold flex items-center gap-2 mb-3">
                                <Store className="h-4 w-4" />
                                Affiliated Businesses ({businesses.length})
                              </h5>
                              <div className="space-y-3">
                                {businesses.map((b) => (
                                  <div key={b.id} className="p-4 rounded-lg bg-background border hover:border-primary/50 transition-colors">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <p className="font-medium text-base">{b.title}</p>
                                          {b.appStatus === "active" ? (
                                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>
                                          ) : (
                                            <Badge variant="secondary">Inactive</Badge>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                          <div className="flex items-center gap-2 text-muted-foreground">
                                            <Users className="h-3 w-3" />
                                            <span>Owner: {b.memberName}</span>
                                          </div>
                                          <div className="flex items-center gap-2 text-muted-foreground">
                                            <Mail className="h-3 w-3" />
                                            <span>{b.memberEmail || 'N/A'}</span>
                                          </div>
                                          <div className="flex items-center gap-2 text-muted-foreground">
                                            <MapPin className="h-3 w-3" />
                                            <span>{b.city || 'N/A'}, {b.state || 'N/A'}</span>
                                          </div>
                                          <div className="flex items-center gap-2 text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            <span>Since: {new Date(b.createdAt).toLocaleDateString()}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right ml-4">
                                        <p className="font-bold text-primary text-lg">$1<span className="text-sm text-muted-foreground">/mo</span></p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {b.status === "active" && b.appStatus === "active" ? "Earning" : "Not Earning"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Coupons Section */}
                          {coupons.length > 0 && (
                            <div>
                              <h5 className="font-semibold flex items-center gap-2 mb-3">
                                <Ticket className="h-4 w-4" />
                                Affiliated Coupons ({coupons.length})
                              </h5>
                              <div className="space-y-3">
                                {coupons.map((c) => (
                                  <div key={c.id} className="p-4 rounded-lg bg-background border hover:border-primary/50 transition-colors">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <p className="font-medium text-base">{c.title}</p>
                                          {c.appStatus === "active" ? (
                                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>
                                          ) : (
                                            <Badge variant="secondary">Inactive</Badge>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                          <div className="flex items-center gap-2 text-muted-foreground">
                                            <Store className="h-3 w-3" />
                                            <span>Merchant: {c.merchant}</span>
                                          </div>
                                          <div className="flex items-center gap-2 text-muted-foreground">
                                            <Mail className="h-3 w-3" />
                                            <span>{c.email || 'N/A'}</span>
                                          </div>
                                          <div className="flex items-center gap-2 text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            <span>Valid: {c.startDate ? new Date(c.startDate).toLocaleDateString() : 'N/A'}</span>
                                          </div>
                                          <div className="flex items-center gap-2 text-muted-foreground">
                                            <Users className="h-3 w-3" />
                                            <span>Owner: {c.memberName}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right ml-4">
                                        <p className="font-bold text-primary text-lg">$1<span className="text-sm text-muted-foreground">/mo</span></p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {c.status === "active" && c.appStatus === "active" ? "Earning" : "Not Earning"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Summary Footer */}
                          <div className="pt-4 border-t">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Monthly Kickback Summary</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  10% from {businesses.length} business{businesses.length !== 1 ? 'es' : ''} and {coupons.length} coupon{coupons.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-primary">${totalKickback}</p>
                                <p className="text-xs text-muted-foreground">per month</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
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
                      <Label>Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-[240px] justify-start text-left font-normal",
                              !startDate && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => date && setStartDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-[240px] justify-start text-left font-normal",
                              !endDate && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={endDate}
                            onSelect={(date) => date && setEndDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
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
                  <div className="grid md:grid-cols-4 gap-6">
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold">Mosques</h4>
                      </div>
                      <p className="text-2xl font-bold">${financialSummary.mosqueRevenue}</p>
                      <p className="text-sm text-muted-foreground">
                        {allMosques.filter((m) => m.status === "active" && m.appStatus === "active").length} active @ $100/mo
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Store className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold">Businesses</h4>
                      </div>
                      <p className="text-2xl font-bold">${financialSummary.businessRevenue}</p>
                      <p className="text-sm text-muted-foreground">
                        {allBusinesses.filter((b) => b.status === "active" && b.appStatus === "active").length} active @ $10/mo
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Ticket className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold">Coupons</h4>
                      </div>
                      <p className="text-2xl font-bold">${financialSummary.couponRevenue}</p>
                      <p className="text-sm text-muted-foreground">
                        {allCoupons.filter((c) => c.status === "active" && c.appStatus === "active").length} active @ $10/mo
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold">Nonprofits</h4>
                      </div>
                      <p className="text-2xl font-bold">${financialSummary.nonprofitRevenue}</p>
                      <p className="text-sm text-muted-foreground">
                        {allNonprofits.filter((n) => n.status === "active" && n.appStatus === "active").length} active @ $50/mo
                      </p>
                    </div>
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
            </div>
          </TabsContent>

          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Members Overview</CardTitle>
                    <CardDescription>View all members and their subscriptions</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Search members..." className="pl-10 w-[300px]" />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {membersLoading ? (
                  <div className="p-6 text-center text-muted-foreground">Loading members...</div>
                ) : !Array.isArray(members) || members.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">No members found</div>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member Name</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead className="text-center">Subscriptions</TableHead>
                          <TableHead className="text-right">Monthly Total</TableHead>
                          <TableHead>Member Since</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(Array.isArray(members) ? members : []).map((member) => {
                          const isExpanded = expandedItems[`member-${member.id}`]
                          const monthlyTotal = (Array.isArray(member.subscriptions) ? member.subscriptions : []).reduce((sum: number, sub: any) => sum + (sub.price || 0), 0)
                          
                          return (
                            <React.Fragment key={member.id}>
                              <TableRow className={isExpanded ? "border-b-0" : ""}>
                                <TableCell>
                                  <div className="font-medium">{member.name}</div>
                                  <div className="text-xs text-muted-foreground">ID: {member.id.substring(0, 8)}...</div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1 text-sm">
                                      <Mail className="h-3 w-3 text-muted-foreground" />
                                      <span className="truncate">{member.email}</span>
                                    </div>
                                    {member.phone && (
                                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                        <Phone className="h-3 w-3" />
                                        <span>{member.phone}</span>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    {(Array.isArray(member.subscriptions) ? member.subscriptions : []).slice(0, 4).map((sub: any) => (
                                      <div key={sub.id} className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center" title={`${sub.type}: ${sub.entity?.name || sub.entity?.title || sub.name || sub.title || 'Unnamed'}`}>
                                        {sub.type === "mosque" && <Building2 className="h-3 w-3 text-primary" />}
                                        {sub.type === "business" && <Store className="h-3 w-3 text-primary" />}
                                        {sub.type === "coupon" && <Ticket className="h-3 w-3 text-primary" />}
                                        {sub.type === "nonprofit" && <Users className="h-3 w-3 text-primary" />}
                                      </div>
                                    ))}
                                    {(Array.isArray(member.subscriptions) ? member.subscriptions : []).length > 4 && (
                                      <div className="text-xs text-muted-foreground">+{(Array.isArray(member.subscriptions) ? member.subscriptions : []).length - 4}</div>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {(Array.isArray(member.subscriptions) ? member.subscriptions : []).length} total
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="font-bold text-lg text-primary">${monthlyTotal}</div>
                                  <div className="text-xs text-muted-foreground">/month</div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">{new Date(member.createdAt).toLocaleDateString()}</div>
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm" onClick={() => toggleExpanded(`member-${member.id}`)}>
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp className="h-4 w-4 mr-1" />
                                        Hide
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-4 w-4 mr-1" />
                                        Details
                                      </>
                                    )}
                                  </Button>
                                </TableCell>
                              </TableRow>

                              {/* Expanded Details Row */}
                              {isExpanded && (
                                <TableRow>
                                  <TableCell colSpan={6} className="p-0 bg-secondary/30">
                                    <div className="p-6">
                                      <div className="flex items-center justify-between mb-6">
                                        <div>
                                          <h4 className="font-semibold text-lg mb-1">
                                            Subscription Details for {member.name}
                                          </h4>
                                          <p className="text-sm text-muted-foreground">
                                            {(Array.isArray(member.subscriptions) ? member.subscriptions : []).length} subscription{(Array.isArray(member.subscriptions) ? member.subscriptions : []).length !== 1 ? "s" : ""} • Total: ${monthlyTotal}/month
                                          </p>
                                        </div>
                                        <Badge variant="outline" className="bg-primary/10 text-primary">
                                          {(Array.isArray(member.subscriptions) ? member.subscriptions : []).filter((s: any) => s.status === "active" && s.app_status === "active").length} Active
                                        </Badge>
                                      </div>

                                      {(Array.isArray(member.subscriptions) ? member.subscriptions : []).length === 0 ? (
                                        <div className="text-center py-8">
                                          <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                                          <p className="text-muted-foreground font-medium">No subscriptions</p>
                                          <p className="text-sm text-muted-foreground mt-1">
                                            This member has not created any subscriptions yet
                                          </p>
                                        </div>
                                      ) : (
                                        <div className="space-y-4">
                                          {(Array.isArray(member.subscriptions) ? member.subscriptions : []).map((sub: any) => {
                                            const isCancelled = sub.app_status === 'cancelled' || sub.status === 'cancelled'
                                            
                                            return (
                                            <div key={sub.id} className="p-4 rounded-lg bg-background border hover:border-primary/50 transition-colors">
                                              <div className="flex items-start justify-between">
                                                <div className="flex gap-3 flex-1">
                                                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 shrink-0">
                                                    {sub.type === "mosque" && <Building2 className="h-6 w-6 text-primary" />}
                                                    {sub.type === "business" && <Store className="h-6 w-6 text-primary" />}
                                                    {sub.type === "coupon" && <Ticket className="h-6 w-6 text-primary" />}
                                                    {sub.type === "nonprofit" && <Users className="h-6 w-6 text-primary" />}
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                      <div className="font-medium text-base">
                                                        {sub.entity?.name || sub.entity?.title || sub.name || sub.title || "Unnamed"}
                                                      </div>
                                                      {sub.status === "active" && sub.app_status === "active" ? (
                                                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>
                                                      ) : (
                                                        <Badge variant="secondary">
                                                          {sub.app_status === "pending_verification" ? "Pending" : sub.status || sub.app_status || "Inactive"}
                                                        </Badge>
                                                      )}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                                      <div className="flex items-center gap-2 text-muted-foreground">
                                                        <span className="font-medium capitalize">{sub.type} Subscription</span>
                                                      </div>
                                                      <div className="flex items-center gap-2 text-muted-foreground">
                                                        <DollarSign className="h-3 w-3" />
                                                        <span>${sub.price}/month</span>
                                                      </div>
                                                      {sub.app_status && (
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                          {sub.app_status === "active" ? (
                                                            <span className="text-green-600">✓ Approved</span>
                                                          ) : sub.app_status === "pending_verification" ? (
                                                            <span className="text-yellow-600">⏳ Pending Verification</span>
                                                          ) : sub.app_status === "cancelled" ? (
                                                            <span className="text-red-600">✕ Cancelled</span>
                                                          ) : (
                                                            <span>{sub.app_status}</span>
                                                          )}
                                                        </div>
                                                      )}
                                                      {sub.next_billing_date && (
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                          <Calendar className="h-3 w-3" />
                                                          <span>Next billing: {new Date(sub.next_billing_date).toLocaleDateString()}</span>
                                                        </div>
                                                      )}
                                                      {sub.entity?.affiliated_mosque_code && (
                                                        <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                                                          <Building2 className="h-3 w-3" />
                                                          <span>Affiliated with Mosque #{sub.entity.affiliated_mosque_code}</span>
                                                        </div>
                                                      )}
                                                      {sub.created_at && (
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                          <Calendar className="h-3 w-3" />
                                                          <span>Created: {new Date(sub.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                                <div className="ml-4">
                                                  {isCancelled ? (
                                                    <Button variant="ghost" size="sm" disabled title="Subscription already cancelled">
                                                      <Ban className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                  ) : (
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
                                                          <div className="font-medium">{sub.entity?.name || sub.entity?.title || sub.name || sub.title || "Unnamed"}</div>
                                                          <div className="text-sm text-muted-foreground">
                                                            {sub.type} - ${sub.price}/mo
                                                          </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                          <Button 
                                                            variant="outline" 
                                                            onClick={() => setCancellingId(null)}
                                                            disabled={cancellingLoading}
                                                          >
                                                            Keep Subscription
                                                          </Button>
                                                          <Button
                                                            variant="destructive"
                                                            onClick={() => handleCancelSubscription(sub.id, sub.type)}
                                                            disabled={cancellingLoading}
                                                          >
                                                            {cancellingLoading ? (
                                                              <>
                                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                                Cancelling...
                                                              </>
                                                            ) : (
                                                              "Cancel Subscription"
                                                            )}
                                                          </Button>
                                                        </div>
                                                      </div>
                                                    </DialogContent>
                                                  </Dialog>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                            )
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Alerts Tab */}
          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Payment Alerts & New Submissions</CardTitle>
                    <CardDescription>Review new submissions and handle payment issues</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchPaymentAlerts}
                    disabled={alertsLoading}
                  >
                    <Loader2 className={`h-4 w-4 mr-2 ${alertsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {alertsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading payment alerts...</span>
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="flex justify-center mb-3">
                      <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Check className="h-6 w-6 text-green-500" />
                      </div>
                    </div>
                    <p className="font-medium text-muted-foreground">No payment alerts</p>
                    <p className="text-sm text-muted-foreground mt-1">All subscriptions are in good standing</p>
                  </div>
                ) : (
                  alerts.map((alert) => {
                    const isNewSubmission = alert.alertType === 'new_submission'
                    const isPaymentIssue = alert.alertType === 'payment_failed' || alert.alertType === 'payment_retry'
                    
                    return (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border ${
                        alert.resolved 
                          ? "bg-secondary/30 border-border" 
                          : isNewSubmission 
                            ? "bg-primary/10 border-primary/20"
                            : "bg-destructive/10 border-destructive/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          {isNewSubmission ? (
                            <Bell className={`h-5 w-5 mt-0.5 flex-shrink-0 ${alert.resolved ? "text-muted-foreground" : "text-primary"}`} />
                          ) : (
                            <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${alert.resolved ? "text-muted-foreground" : "text-destructive"}`} />
                          )}
                          <div className="flex-1 space-y-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-base">{alert.subscriptionName}</p>
                                <Badge variant="outline" className="capitalize">
                                  {alert.subscriptionType}
                                </Badge>
                                {isNewSubmission ? (
                                  <Badge className="bg-primary/10 text-primary border-primary/20">
                                    🆕 New Submission
                                  </Badge>
                                ) : (
                                  <Badge 
                                    variant={alert.status === 'unpaid' ? 'destructive' : 'default'}
                                    className={alert.status === 'past_due' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' : ''}
                                  >
                                    {alert.status === 'past_due' ? 'Payment Retry' : 'Payment Failed'}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium">{alert.memberName}</span> • {alert.memberEmail}
                                {alert.memberPhone && <span> • {alert.memberPhone}</span>}
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <DollarSign className="h-3.5 w-3.5" />
                                <span>Amount: ${alert.priceAmount}/month</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>Issue detected: {new Date(alert.createdAt).toLocaleDateString()}</span>
                              </div>
                              {alert.currentPeriodEnd && (
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>Period ends: {new Date(alert.currentPeriodEnd).toLocaleDateString()}</span>
                                </div>
                              )}
                              {alert.stripeSubscriptionId && (
                                <div className="flex items-center gap-1.5 col-span-2">
                                  <span className="font-mono text-xs">Stripe: {alert.stripeSubscriptionId}</span>
                                  <CopyButton text={alert.stripeSubscriptionId} fieldId={`stripe-${alert.id}`} />
                                </div>
                              )}
                            </div>

                            {isNewSubmission && (
                              <div className="text-xs text-primary bg-primary/10 border border-primary/20 rounded p-2">
                                ✅ Payment successful! This {alert.subscriptionType} is ready for admin review and approval.
                              </div>
                            )}
                            {alert.status === 'past_due' && (
                              <div className="text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                                ⚠️ Stripe is automatically retrying this payment. Monitor for resolution.
                              </div>
                            )}
                            {alert.status === 'unpaid' && (
                              <div className="text-xs text-red-700 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">
                                ❌ Payment has failed. Contact the user to update their payment method.
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          {alert.resolved ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20 whitespace-nowrap">
                              ✓ Resolved
                              {alert.resolvedAt && (
                                <span className="ml-1 text-xs">
                                  {new Date(alert.resolvedAt).toLocaleDateString()}
                                </span>
                              )}
                            </Badge>
                          ) : (
                            <>
                              {isNewSubmission ? (
                                <>
                                  <Button 
                                    variant="default" 
                                    size="sm"
                                    onClick={() => {
                                      // Switch to the appropriate tab based on subscription type
                                      const targetTab = alert.subscriptionType === 'mosque' ? 'mosques' : 
                                                        alert.subscriptionType === 'business' ? 'businesses' :
                                                        alert.subscriptionType === 'coupon' ? 'coupons' : 'nonprofits'
                                      setActiveTab(targetTab)
                                      
                                      // Show toast to guide admin
                                      toast({
                                        title: "Switched to " + targetTab.charAt(0).toUpperCase() + targetTab.slice(1) + " tab",
                                        description: `Look for "${alert.subscriptionName}" with status "Pending Verification"`,
                                      })
                                    }}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Review
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleResolveAlert(alert.id)}
                                  >
                                    Dismiss
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      window.open(`mailto:${alert.memberEmail}?subject=Payment Issue - ${alert.subscriptionName}`, '_blank')
                                    }}
                                  >
                                    <Mail className="h-4 w-4 mr-1" />
                                    Contact
                                  </Button>
                                  <Button 
                                    variant="default" 
                                    size="sm" 
                                    onClick={() => handleResolveAlert(alert.id)}
                                  >
                                    Mark Resolved
                                  </Button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    )
                  })
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
                {pushNotifLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading push notification requests...</p>
                  </div>
                ) : pushNotificationRequests.length === 0 ? (
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
                              Code: #{request.mosque_code}
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
                              <p className="text-sm text-muted-foreground mb-2">{request.mosque_name}</p>
                              <p className="text-sm mb-3">{request.message}</p>

                              <div className="bg-secondary/50 rounded-lg p-3 mb-3 space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Scheduled:</span>
                                <span>
                                  {new Date(request.scheduled_date).toLocaleDateString()} at {request.scheduled_time}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">Timezone:</span>
                                <span>{request.timezone}</span>
                              </div>
                              </div>

                            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                              <span>Requested: {new Date(request.requested_at).toLocaleString()}</span>
                              <span>By: {request.requested_by}</span>
                            </div>
                            {request.status === "sent" && request.sent_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Sent: {new Date(request.sent_at).toLocaleString()}
                              </p>
                            )}
                            {request.status === "rejected" && request.rejection_reason && (
                              <p className="text-xs text-destructive mt-1">Reason: {request.rejection_reason}</p>
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

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Analytics</CardTitle>
                <CardDescription>Overview of platform activity and performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {reportDateRange.startDate ? format(reportDateRange.startDate, "PPP") : "Pick start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={reportDateRange.startDate}
                          onSelect={(date) => date && setReportDateRange({ ...reportDateRange, startDate: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex-1">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {reportDateRange.endDate ? format(reportDateRange.endDate, "PPP") : "Pick end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={reportDateRange.endDate}
                          onSelect={(date) => date && setReportDateRange({ ...reportDateRange, endDate: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={async () => {
                        setAnalyticsLoading(true)
                        try {
                          const params = new URLSearchParams()
                          if (reportDateRange.startDate) params.append('start_date', format(reportDateRange.startDate, 'yyyy-MM-dd'))
                          if (reportDateRange.endDate) params.append('end_date', format(reportDateRange.endDate, 'yyyy-MM-dd'))
                          
                          const overview = await authenticatedGet(`/api/admin/analytics/overview?${params.toString()}`) as any
                          const userActivity = await authenticatedGet(`/api/admin/analytics/user-activity?${params.toString()}`) as any
                          const donations = await authenticatedGet(`/api/admin/analytics/donations?${params.toString()}`) as any
                          const listings = await authenticatedGet(`/api/admin/analytics/listings?${params.toString()}`) as any
                          
                          setAnalyticsData({ overview, userActivity, donations, listings })
                        } catch (error: any) {
                          toast({
                            title: "Error",
                            description: error.message || "Failed to load analytics",
                            variant: "destructive"
                          })
                        } finally {
                          setAnalyticsLoading(false)
                        }
                      }}
                      disabled={analyticsLoading}
                    >
                      {analyticsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load Analytics"}
                    </Button>
                  </div>
                </div>

                {analyticsData && (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>New Users (in date range)</CardDescription>
                        <CardTitle className="text-3xl">{analyticsData.overview?.data?.overview?.users?.total || 0}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Donations (in date range)</CardDescription>
                        <CardTitle className="text-3xl">{analyticsData.overview?.data?.overview?.donations?.total || 0}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Donation Amount (in date range)</CardDescription>
                        <CardTitle className="text-3xl">${analyticsData.overview?.data?.overview?.donations?.totalAmount?.toFixed(2) || '0.00'}</CardTitle>
                      </CardHeader>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardDescription>Active Businesses (all time)</CardDescription>
                        <CardTitle className="text-3xl">{analyticsData.overview?.data?.overview?.businesses?.active || 0}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground">
                        {analyticsData.overview?.data?.overview?.businesses?.newInRange || 0} new in range
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Generate Reports</CardTitle>
                <CardDescription>Export platform data as CSV or PDF</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {reportDateRange.startDate ? format(reportDateRange.startDate, "PPP") : "Pick start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={reportDateRange.startDate}
                          onSelect={(date) => date && setReportDateRange({ ...reportDateRange, startDate: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex-1">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {reportDateRange.endDate ? format(reportDateRange.endDate, "PPP") : "Pick end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={reportDateRange.endDate}
                          onSelect={(date) => date && setReportDateRange({ ...reportDateRange, endDate: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle>Donations Report</CardTitle>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadReport('donations', 'csv')}
                        disabled={downloadingReport === 'donations-csv'}
                      >
                        {downloadingReport === 'donations-csv' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        CSV
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadReport('donations', 'pdf')}
                        disabled={downloadingReport === 'donations-pdf'}
                      >
                        {downloadingReport === 'donations-pdf' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        PDF
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Business Activity Report</CardTitle>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadReport('business-activity', 'csv')}
                        disabled={downloadingReport === 'business-activity-csv'}
                      >
                        {downloadingReport === 'business-activity-csv' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        CSV
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadReport('business-activity', 'pdf')}
                        disabled={downloadingReport === 'business-activity-pdf'}
                      >
                        {downloadingReport === 'business-activity-pdf' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        PDF
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Events Report</CardTitle>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadReport('events', 'csv')}
                        disabled={downloadingReport === 'events-csv'}
                      >
                        {downloadingReport === 'events-csv' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        CSV
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadReport('events', 'pdf')}
                        disabled={downloadingReport === 'events-pdf'}
                      >
                        {downloadingReport === 'events-pdf' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        PDF
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Logs Tab */}
          <TabsContent value="activity-logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity Logs</CardTitle>
                <CardDescription>Track all administrative actions and changes</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search and Filters */}
                <div className="space-y-4 mb-6">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Search by admin name, email, or description..."
                        value={activityLogsFilters.search}
                        onChange={(e) => setActivityLogsFilters({ ...activityLogsFilters, search: e.target.value })}
                        className="w-full"
                      />
                    </div>
                    <Button
                      onClick={() => fetchActivityLogs(1)}
                      disabled={activityLogsLoading}
                    >
                      {activityLogsLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                      Search
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="action-filter">Action</Label>
                      <select
                        id="action-filter"
                        className="w-full px-3 py-2 border rounded-md"
                        value={activityLogsFilters.action}
                        onChange={(e) => {
                          setActivityLogsFilters({ ...activityLogsFilters, action: e.target.value })
                        }}
                      >
                        <option value="">All Actions</option>
                        <option value="business_verified">Business Verified</option>
                        <option value="business_rejected">Business Rejected</option>
                        <option value="business_deactivated">Business Deactivated</option>
                        <option value="mosque_verified">Mosque Verified</option>
                        <option value="mosque_rejected">Mosque Rejected</option>
                        <option value="mosque_deactivated">Mosque Deactivated</option>
                        <option value="subscription_approved">Subscription Approved</option>
                        <option value="subscription_rejected">Subscription Rejected</option>
                        <option value="subscription_cancelled">Subscription Cancelled</option>
                        <option value="user_created">User Created</option>
                        <option value="user_updated">User Updated</option>
                        <option value="user_deleted">User Deleted</option>
                        <option value="donation_refunded">Donation Refunded</option>
                        <option value="donation_updated">Donation Updated</option>
                        <option value="settings_updated">Settings Updated</option>
                        <option value="report_generated">Report Generated</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="entity-filter">Entity Type</Label>
                      <select
                        id="entity-filter"
                        className="w-full px-3 py-2 border rounded-md"
                        value={activityLogsFilters.entityType}
                        onChange={(e) => {
                          setActivityLogsFilters({ ...activityLogsFilters, entityType: e.target.value })
                        }}
                      >
                        <option value="">All Types</option>
                        <option value="mosque">Mosque</option>
                        <option value="business">Business</option>
                        <option value="coupon">Coupon</option>
                        <option value="nonprofit">Nonprofit</option>
                        <option value="user">User</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="start-date-filter">Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !activityLogsFilters.startDate && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {activityLogsFilters.startDate ? (() => {
                              const [year, month, day] = activityLogsFilters.startDate.split('-').map(Number)
                              return format(new Date(year, month - 1, day), "PPP")
                            })() : "Pick start date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={activityLogsFilters.startDate ? (() => {
                              const [year, month, day] = activityLogsFilters.startDate.split('-').map(Number)
                              return new Date(year, month - 1, day)
                            })() : undefined}
                            defaultMonth={new Date()}
                            onSelect={(date) => {
                              if (date) {
                                setActivityLogsFilters({ ...activityLogsFilters, startDate: format(date, 'yyyy-MM-dd') })
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label htmlFor="end-date-filter">End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !activityLogsFilters.endDate && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {activityLogsFilters.endDate ? (() => {
                              const [year, month, day] = activityLogsFilters.endDate.split('-').map(Number)
                              return format(new Date(year, month - 1, day), "PPP")
                            })() : "Pick end date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={activityLogsFilters.endDate ? (() => {
                              const [year, month, day] = activityLogsFilters.endDate.split('-').map(Number)
                              return new Date(year, month - 1, day)
                            })() : undefined}
                            defaultMonth={new Date()}
                            onSelect={(date) => {
                              if (date) {
                                setActivityLogsFilters({ ...activityLogsFilters, endDate: format(date, 'yyyy-MM-dd') })
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {(activityLogsFilters.action || activityLogsFilters.entityType || activityLogsFilters.startDate || activityLogsFilters.endDate || activityLogsFilters.search) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActivityLogsFilters({
                          search: '',
                          action: '',
                          entityType: '',
                          startDate: '',
                          endDate: '',
                        })
                        fetchActivityLogs(1)
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  )}
                </div>

                {/* Activity Logs Table */}
                {activityLogsLoading && activityLogs.length === 0 ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : activityLogs.length > 0 ? (
                  <>
                    <div className="border rounded-lg mb-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Admin</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Entity</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activityLogs
                            .filter((log: any) => {
                              if (!activityLogsFilters.search) return true
                              const searchLower = activityLogsFilters.search.toLowerCase()
                              return (
                                log.admin_name?.toLowerCase().includes(searchLower) ||
                                log.admin_email?.toLowerCase().includes(searchLower) ||
                                log.action_description?.toLowerCase().includes(searchLower)
                              )
                            })
                            .map((log: any) => (
                              <TableRow key={log.id}>
                                <TableCell className="whitespace-nowrap">
                                  {new Date(log.created_at).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{log.admin_name || 'System'}</span>
                                    {log.admin_email && (
                                      <span className="text-xs text-muted-foreground">{log.admin_email}</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="capitalize">
                                    {log.action}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="capitalize">
                                    {log.entity_type || '-'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-md">
                                  {log.action_description}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Showing {((activityLogsPagination.page - 1) * activityLogsPagination.limit) + 1} to{' '}
                        {Math.min(activityLogsPagination.page * activityLogsPagination.limit, activityLogsPagination.total)} of{' '}
                        {activityLogsPagination.total} logs
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchActivityLogs(activityLogsPagination.page - 1)}
                          disabled={activityLogsPagination.page === 1 || activityLogsLoading}
                        >
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, activityLogsPagination.totalPages) }, (_, i) => {
                            let pageNum
                            if (activityLogsPagination.totalPages <= 5) {
                              pageNum = i + 1
                            } else if (activityLogsPagination.page <= 3) {
                              pageNum = i + 1
                            } else if (activityLogsPagination.page >= activityLogsPagination.totalPages - 2) {
                              pageNum = activityLogsPagination.totalPages - 4 + i
                            } else {
                              pageNum = activityLogsPagination.page - 2 + i
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={activityLogsPagination.page === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => fetchActivityLogs(pageNum)}
                                disabled={activityLogsLoading}
                              >
                                {pageNum}
                              </Button>
                            )
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchActivityLogs(activityLogsPagination.page + 1)}
                          disabled={activityLogsPagination.page === activityLogsPagination.totalPages || activityLogsLoading}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No activity logs found</p>
                    <p className="text-sm mt-2">Try adjusting your filters or search query</p>
                  </div>
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
