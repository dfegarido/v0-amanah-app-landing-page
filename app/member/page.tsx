"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Building2,
  Store,
  Ticket,
  Plus,
  CreditCard,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Download,
  Calendar,
  Users,
  Heart,
  MessageCircle,
  Bell,
  User,
} from "lucide-react"
import { NotificationBell } from "@/components/notification-bell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"
import { authenticatedGet, authenticatedDelete } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { AddPaymentMethodDialog } from "@/components/add-payment-method-dialog"

export default function MemberDashboard() {
  const router = useRouter()
  const { signOut, user, loading } = useAuth()
  const { toast } = useToast()
  
  // Real user data - no mock data
  const [startDate, setStartDate] = useState("2024-10-01")
  const [endDate, setEndDate] = useState("2024-12-31")
  
  // Subscriptions state
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true)
  
  // Donations state
  const [donations, setDonations] = useState<any[]>([])
  const [loadingDonations, setLoadingDonations] = useState(true)

  // Messages state
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [messages, setMessages] = useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<any>(null)
  const [loadingPaymentMethod, setLoadingPaymentMethod] = useState(true)

  const handleLogout = async () => {
    await signOut()
    router.push("/auth/login")
  }

  // Redirect if not logged in (use useEffect to avoid render errors)
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  // Fetch messages and unread count
  useEffect(() => {
    const fetchMessages = async () => {
      if (!user) return
      
      try {
        setLoadingMessages(true)
        const response: any = await authenticatedGet('/api/messages?folder=all&page=1&limit=50')
        if (response.success && response.data) {
          setMessages(response.data.messages || [])
          
          // Calculate unread count
          const unread = (response.data.messages || []).filter(
            (msg: any) => msg.recipient_id === user.id && !msg.read_at
          ).length
          setUnreadMessageCount(unread)
        }
      } catch (error) {
        console.error('Error fetching messages:', error)
      } finally {
        setLoadingMessages(false)
      }
    }

    if (user) {
      fetchMessages()
    }
  }, [user])

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('dashboard-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
            // Refresh messages and unread count when new message arrives
          authenticatedGet('/api/messages?folder=all&page=1&limit=50')
            .then((response: any) => {
              if (response.success && response.data) {
                setMessages(response.data.messages || [])
                const unread = (response.data.messages || []).filter(
                  (msg: any) => msg.recipient_id === user.id && !msg.read_at
                ).length
                setUnreadMessageCount(unread)
              }
            })
            .catch(console.error)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
            // Refresh messages and unread count when message is updated (e.g., marked as read)
          authenticatedGet('/api/messages?folder=all&page=1&limit=50')
            .then((response: any) => {
              if (response.success && response.data) {
                setMessages(response.data.messages || [])
                const unread = (response.data.messages || []).filter(
                  (msg: any) => msg.recipient_id === user.id && !msg.read_at
                ).length
                setUnreadMessageCount(unread)
              }
            })
            .catch(console.error)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Fetch subscriptions
  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (!user) return
      
      try {
        setLoadingSubscriptions(true)
        const response: any = await authenticatedGet('/api/subscriptions')
        
        if (response.success && response.data) {
          // Transform data to include entity name
          const transformedData = response.data.map((sub: any) => {
            let name = 'Unnamed'
            let entityStatus = 'pending'
            
            if (sub.entity) {
              // Get name based on type
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
              status: sub.status,
              entityStatus: entityStatus,
              price: sub.price_amount,
              nextBillingDate: sub.next_billing_date,
              entity: sub.entity,
              mosqueCode: sub.entity?.mosque_code,
              affiliatedMosqueCode: sub.entity?.affiliated_mosque_code
            }
          })
          
          setSubscriptions(transformedData)
        }
      } catch (error: any) {
        console.error('Error fetching subscriptions:', error)
        toast({
          title: "Error",
          description: "Failed to load subscriptions",
          variant: "destructive"
        })
      } finally {
        setLoadingSubscriptions(false)
      }
    }

    if (user) {
      fetchSubscriptions()
    }
  }, [user, toast])

  // Fetch donations
  useEffect(() => {
    const fetchDonations = async () => {
      if (!user) return
      
      try {
        setLoadingDonations(true)
        console.log('[Member Dashboard] Fetching donations...')
        const response: any = await authenticatedGet('/api/donations?page=1&limit=10')
        
        console.log('[Member Dashboard] Donations response:', response)
        
        if (response.success && response.data) {
          const donationsList = response.data.donations || []
          console.log('[Member Dashboard] Setting donations:', donationsList.length, 'items')
          setDonations(donationsList)
        } else {
          console.warn('[Member Dashboard] Unexpected response format:', response)
          setDonations([])
        }
      } catch (error: any) {
        console.error('[Member Dashboard] Error fetching donations:', error)
        toast({
          title: "Error",
          description: error.message || "Failed to load donations",
          variant: "destructive"
        })
        setDonations([])
      } finally {
        setLoadingDonations(false)
      }
    }

    if (user) {
      fetchDonations()
      fetchPaymentMethod()
    }
  }, [user, toast])

  // Fetch payment method
  const fetchPaymentMethod = async () => {
    if (!user) return
    
    try {
      setLoadingPaymentMethod(true)
      const response: any = await authenticatedGet('/api/stripe/payment-method')
      if (response.success && response.data) {
        setPaymentMethod(response.data.paymentMethod)
      }
    } catch (error) {
      console.error('Error fetching payment method:', error)
    } finally {
      setLoadingPaymentMethod(false)
    }
  }

  const handleRemovePaymentMethod = async () => {
    if (!confirm('Are you sure you want to remove your payment method?')) {
      return
    }

    try {
      setLoadingPaymentMethod(true)
      await authenticatedDelete('/api/stripe/payment-method')
      setPaymentMethod(null)
      toast({
        title: "Payment method removed",
        description: "Your payment method has been removed successfully.",
      })
    } catch (error: any) {
      toast({
        title: "Failed to remove",
        description: error.message || "Failed to remove payment method",
        variant: "destructive",
      })
    } finally {
      setLoadingPaymentMethod(false)
    }
  }

  const formatCardBrand = (brand: string) => {
    return brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : 'Card'
  }

  const formatExpDate = (month: number, year: number) => {
    if (!month || !year) return ''
    return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

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

  // Calculate totals from real subscriptions
  const totalMonthly = subscriptions.reduce((acc, sub) => acc + (sub.price || 0), 0)
  const activeSubscriptionsCount = subscriptions.filter((s) => s.status === "active").length
  const memberSince = user?.created_at ? new Date(user.created_at) : new Date()

  // Show loading for stats during initial load
  const statsLoading = loading || loadingSubscriptions

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <img src="/images/logo-20amanaah.png" alt="Amanah Logo" className="h-10 w-auto" />
            <div>
              <h1 className="text-lg font-semibold text-foreground">Member Dashboard</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="ghost" size="icon" asChild>
              <Link href="/member/settings">
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Welcome, {user?.name || 'User'}</h2>
          <p className="text-muted-foreground">Manage your subscriptions, documents, and listings below.</p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Subscriptions</CardDescription>
              <CardTitle className="text-3xl">
                {statsLoading ? "..." : activeSubscriptionsCount}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Monthly Total</CardDescription>
              <CardTitle className="text-3xl text-primary">
                {statsLoading ? "..." : `$${totalMonthly.toFixed(2)}`}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Member Since</CardDescription>
              <CardTitle className="text-3xl">
                {memberSince.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="subscriptions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="subscriptions">My Subscriptions</TabsTrigger>
            <TabsTrigger value="donations">Donations</TabsTrigger>
            <TabsTrigger value="messages" className="relative">
              Messages
              {unreadMessageCount > 0 && (
                <Badge className="ml-2 h-5 min-w-5 flex items-center justify-center px-1.5">
                  {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="subscriptions" className="space-y-8">
            {/* Add New Subscription */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Add New Subscription</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-lg">
                  <Link href="/member/subscribe/mosque">
                    <CardHeader className="flex flex-row items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">Add Mosque</CardTitle>
                        <CardDescription>$100/month</CardDescription>
                      </div>
                      <Plus className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                  </Link>
                </Card>

                <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-lg">
                  <Link href="/member/subscribe/business">
                    <CardHeader className="flex flex-row items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Store className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">Add Business</CardTitle>
                        <CardDescription>$10/month</CardDescription>
                      </div>
                      <Plus className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                  </Link>
                </Card>

                <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-lg">
                  <Link href="/member/subscribe/coupon">
                    <CardHeader className="flex flex-row items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Ticket className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">Add Coupon</CardTitle>
                        <CardDescription>$10/month per coupon</CardDescription>
                      </div>
                      <Plus className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                  </Link>
                </Card>

                <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-lg">
                  <Link href="/member/subscribe/nonprofit">
                    <CardHeader className="flex flex-row items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Heart className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">Add Nonprofit</CardTitle>
                        <CardDescription>$50/month</CardDescription>
                      </div>
                      <Plus className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                  </Link>
                </Card>
              </div>
            </div>

            {/* Current Subscriptions */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Your Subscriptions</h3>
              {loadingSubscriptions ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                    <p className="text-muted-foreground">Loading subscriptions...</p>
                  </CardContent>
                </Card>
              ) : subscriptions.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Subscriptions Yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Get started by adding your first mosque, business, coupon, or nonprofit listing above.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {subscriptions.map((subscription) => (
                    <Card key={subscription.id} className="transition-all hover:shadow-md">
                      <Link href={`/member/subscription/${subscription.id}`}>
                        <CardHeader className="flex flex-row items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                            {getSubscriptionIcon(subscription.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-base">{subscription.name}</CardTitle>
                              {getStatusBadge(subscription.status)}
                              {subscription.entityStatus && subscription.entityStatus !== subscription.status && (
                                <Badge variant="outline" className="text-xs">
                                  {subscription.entityStatus}
                                </Badge>
                              )}
                            </div>
                            <CardDescription className="flex items-center gap-2 flex-wrap">
                              <span className="capitalize">{subscription.type}</span>
                              <span>•</span>
                              <span>{getSubscriptionPrice(subscription.type)}</span>
                              {subscription.mosqueCode && (
                                <>
                                  <span>•</span>
                                  <span className="text-primary font-medium">Code #{subscription.mosqueCode}</span>
                                </>
                              )}
                              {subscription.affiliatedMosqueCode && (
                                <>
                                  <span>•</span>
                                  <span className="text-primary">Affiliated with #{subscription.affiliatedMosqueCode}</span>
                                </>
                              )}
                            </CardDescription>
                            {subscription.nextBillingDate && (
                              <CardDescription className="text-xs mt-1">
                                Next billing: {new Date(subscription.nextBillingDate).toLocaleDateString()}
                              </CardDescription>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </CardHeader>
                      </Link>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Payment Method</h3>
              {loadingPaymentMethod ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                    <p className="text-muted-foreground">Loading payment method...</p>
                  </CardContent>
                </Card>
              ) : paymentMethod ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <CreditCard className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {formatCardBrand(paymentMethod.brand)} •••• {paymentMethod.last4}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Expires {formatExpDate(paymentMethod.expMonth, paymentMethod.expYear)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <AddPaymentMethodDialog onPaymentMethodAdded={fetchPaymentMethod}>
                          <Button variant="outline" size="sm">
                            Update
                          </Button>
                        </AddPaymentMethodDialog>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRemovePaymentMethod}
                          disabled={loadingPaymentMethod}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CreditCard className="h-16 w-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Payment Method</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Add a payment method to use for subscriptions and recurring payments.
                    </p>
                    <AddPaymentMethodDialog onPaymentMethodAdded={fetchPaymentMethod}>
                      <Button variant="default">
                        Add Payment Method
                      </Button>
                    </AddPaymentMethodDialog>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="donations" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Donations</h3>
                <p className="text-sm text-muted-foreground">Make donations and view your donation history</p>
              </div>
              <Button asChild>
                <Link href="/member/donate">
                  <Heart className="h-4 w-4 mr-2" />
                  Make a Donation
                </Link>
              </Button>
            </div>

            {/* Donation Summary */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Total Donated</CardDescription>
                  <CardTitle className="text-2xl">
                    ${donations.filter((d) => d.status === "succeeded").reduce((sum, d) => sum + Number(d.amount || 0), 0).toFixed(2)}
                  </CardTitle>
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

            {/* Donations List */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Donations</CardTitle>
                <CardDescription>Your recent donation activity</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingDonations ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading donations...</p>
                  </div>
                ) : donations.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      No donations yet. Make your first donation to get started!
                    </p>
                    <Button asChild>
                      <Link href="/member/donate">
                        Make a Donation
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {donations.slice(0, 5).map((donation) => (
                      <div
                        key={donation.id}
                        className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Heart className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">
                              ${Number(donation.amount || 0).toFixed(2)} {donation.currency || 'USD'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {donation.mosque?.name || 'General Donation'}
                              {donation.campaign_name && ` • ${donation.campaign_name}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(donation.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {donation.status === "succeeded" && (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                              Completed
                            </Badge>
                          )}
                          {donation.status === "pending" && (
                            <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                              Pending
                            </Badge>
                          )}
                          {donation.status === "failed" && (
                            <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                              Failed
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {donations.length > 5 && (
                      <div className="pt-2">
                        <Button variant="outline" className="w-full" asChild>
                          <Link href="/member/donations">
                            View All Donations ({donations.length})
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Messages</h3>
                <p className="text-sm text-muted-foreground">Communicate with administrators and other users</p>
              </div>
              <Button asChild>
                <Link href="/member/messages">
                  <Plus className="h-4 w-4 mr-2" />
                  New Message
                </Link>
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Conversations</CardTitle>
                <CardDescription>Your recent conversations</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingMessages ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading messages...</p>
                  </div>
                ) : (() => {
                  // Group messages into conversations
                  if (!user || !messages.length) {
                    return (
                      <div className="text-center py-8">
                        <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">
                          No messages yet. Start a conversation!
                        </p>
                        <Button asChild>
                          <Link href="/member/messages">
                            New Message
                          </Link>
                        </Button>
                      </div>
                    )
                  }

                  const conversationMap = new Map<string, {
                    userId: string
                    userName: string
                    userEmail: string
                    lastMessage: any
                    unreadCount: number
                  }>()

                  messages.forEach((message: any) => {
                    const otherUserId = message.sender_id === user.id ? message.recipient_id : message.sender_id
                    const otherUser = message.sender_id === user.id ? message.recipient : message.sender

                    if (!otherUser) return

                    if (!conversationMap.has(otherUserId)) {
                      conversationMap.set(otherUserId, {
                        userId: otherUserId,
                        userName: otherUser.name || otherUser.email || "Unknown",
                        userEmail: otherUser.email || "",
                        lastMessage: message,
                        unreadCount: 0,
                      })
                    }

                    const conv = conversationMap.get(otherUserId)!
                    if (new Date(message.created_at) > new Date(conv.lastMessage.created_at)) {
                      conv.lastMessage = message
                    }
                    if (message.recipient_id === user.id && !message.read_at) {
                      conv.unreadCount++
                    }
                  })

                  const conversations = Array.from(conversationMap.values()).sort((a, b) =>
                    new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
                  )

                  return (
                    <div className="space-y-2">
                      {conversations.map((conv) => {
                        const isUnread = conv.unreadCount > 0
                        return (
                          <Link
                            key={conv.userId}
                            href="/member/messages"
                            className="block"
                          >
                            <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors border border-transparent hover:border-border">
                              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className={`text-sm font-medium truncate ${isUnread ? "font-semibold" : ""}`}>
                                    {conv.userName}
                                  </p>
                                  {isUnread && (
                                    <Badge variant="default" className="ml-2">
                                      {conv.unreadCount}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {conv.lastMessage.body}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(conv.lastMessage.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
