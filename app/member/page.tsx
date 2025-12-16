"use client"

import { useState } from "react"
import Link from "next/link"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { mockMembers, mockAffiliateEarnings } from "@/lib/mock-data"
import type { MosqueSubscription } from "@/lib/types"

export default function MemberDashboard() {
  // For demo purposes, using the first mock member (has mosque subscription)
  const [member] = useState(mockMembers[0])
  const [startDate, setStartDate] = useState("2024-10-01")
  const [endDate, setEndDate] = useState("2024-12-31")

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

  const totalMonthly = member.subscriptions.reduce((acc, sub) => acc + sub.price, 0)

  const mosqueSubscriptions = member.subscriptions.filter((s) => s.type === "mosque") as MosqueSubscription[]

  // Get affiliate earnings for this member's mosques
  const getMosqueEarnings = (mosqueCode: number) => {
    return mockAffiliateEarnings.filter((e) => e.mosqueCode === mosqueCode)
  }

  // Filter earnings by date range
  const filterEarningsByDate = (earnings: typeof mockAffiliateEarnings) => {
    return earnings.filter((e) => {
      const earningDate = new Date(e.month + "-01")
      const start = new Date(startDate)
      const end = new Date(endDate)
      return earningDate >= start && earningDate <= end
    })
  }

  // Calculate totals for a mosque
  const calculateMosqueTotals = (mosqueCode: number) => {
    const earnings = filterEarningsByDate(getMosqueEarnings(mosqueCode))
    const pending = earnings.filter((e) => e.status === "pending").reduce((acc, e) => acc + e.kickbackAmount, 0)
    const paid = earnings.filter((e) => e.status === "paid").reduce((acc, e) => acc + e.kickbackAmount, 0)
    const total = earnings.reduce((acc, e) => acc + e.kickbackAmount, 0)
    const affiliateCount = new Set(earnings.map((e) => e.affiliateId)).size
    return { pending, paid, total, affiliateCount, earnings }
  }

  // Export to CSV
  const exportToCSV = (mosqueCode: number, mosqueName: string) => {
    const { earnings } = calculateMosqueTotals(mosqueCode)
    const headers = ["Month", "Type", "Affiliate Name", "Monthly Fee", "Kickback (10%)", "Status", "Paid Date"]
    const rows = earnings.map((e) => [
      e.month,
      e.affiliateType,
      e.affiliateName,
      `$${e.monthlyFee}`,
      `$${e.kickbackAmount}`,
      e.status,
      e.paidDate || "-",
    ])

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${mosqueName.replace(/\s+/g, "_")}_earnings_${startDate}_to_${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <img src="/images/logo-20amanaah.png" alt="Amanah Logo" className="h-10 w-auto" />
            <div>
              <h1 className="text-lg font-semibold text-foreground">Member Dashboard</h1>
              <p className="text-sm text-muted-foreground">{member.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/member/settings">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/login">
                <LogOut className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Welcome, {member.name}</h2>
          <p className="text-muted-foreground">Manage your subscriptions, documents, and listings below.</p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Subscriptions</CardDescription>
              <CardTitle className="text-3xl">
                {member.subscriptions.filter((s) => s.status === "active").length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Monthly Total</CardDescription>
              <CardTitle className="text-3xl text-primary">${totalMonthly}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Member Since</CardDescription>
              <CardTitle className="text-3xl">
                {new Date(member.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="subscriptions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="subscriptions">My Subscriptions</TabsTrigger>
            {mosqueSubscriptions.length > 0 && (
              <TabsTrigger value="earnings">
                <DollarSign className="h-4 w-4 mr-2" />
                Mosque Earnings
              </TabsTrigger>
            )}
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
              <div className="space-y-4">
                {member.subscriptions.map((subscription) => (
                  <Card key={subscription.id} className="transition-all hover:shadow-md">
                    <Link href={`/member/subscription/${subscription.id}`}>
                      <CardHeader className="flex flex-row items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          {getSubscriptionIcon(subscription.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{subscription.name}</CardTitle>
                            {getStatusBadge(subscription.status)}
                            {subscription.type === "mosque" && (
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                Code: {(subscription as MosqueSubscription).mosqueCode}
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="flex items-center gap-2">
                            <span className="capitalize">{subscription.type}</span>
                            <span>•</span>
                            <span>{getSubscriptionPrice(subscription.type)}</span>
                          </CardDescription>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </CardHeader>
                    </Link>
                  </Card>
                ))}
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Payment Method</h3>
              <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <CreditCard className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">Visa ending in 4242</CardTitle>
                    <CardDescription>Expires 12/2025</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    Update
                  </Button>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>

          {mosqueSubscriptions.length > 0 && (
            <TabsContent value="earnings" className="space-y-6">
              {/* Date Range Filter */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Filter by Date Range
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Earnings per Mosque */}
              {mosqueSubscriptions.map((mosque) => {
                const { pending, paid, total, affiliateCount, earnings } = calculateMosqueTotals(mosque.mosqueCode)

                return (
                  <Card key={mosque.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                            <Building2 className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle>{mosque.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                Mosque Code: {mosque.mosqueCode}
                              </Badge>
                              <span>Share this code with businesses for 10% kickback</span>
                            </CardDescription>
                          </div>
                        </div>
                        <Button variant="outline" onClick={() => exportToCSV(mosque.mosqueCode, mosque.name)}>
                          <Download className="h-4 w-4 mr-2" />
                          Export CSV
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Summary Stats */}
                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="p-4 rounded-lg bg-secondary/50">
                          <p className="text-sm text-muted-foreground">Pending Earnings</p>
                          <p className="text-2xl font-bold text-yellow-500">${pending.toFixed(2)}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-secondary/50">
                          <p className="text-sm text-muted-foreground">Paid Earnings</p>
                          <p className="text-2xl font-bold text-green-500">${paid.toFixed(2)}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-secondary/50">
                          <p className="text-sm text-muted-foreground">Total Earnings</p>
                          <p className="text-2xl font-bold text-primary">${total.toFixed(2)}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-secondary/50">
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Users className="h-4 w-4" /> Affiliates
                          </p>
                          <p className="text-2xl font-bold">{affiliateCount}</p>
                        </div>
                      </div>

                      {/* Detailed Breakdown Table */}
                      <div>
                        <h4 className="font-semibold mb-3">Affiliated Businesses & Coupons</h4>
                        {earnings.length > 0 ? (
                          <div className="rounded-lg border overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Month</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Name</TableHead>
                                  <TableHead className="text-right">Fee</TableHead>
                                  <TableHead className="text-right">Kickback (10%)</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {earnings.map((earning) => (
                                  <TableRow key={earning.id}>
                                    <TableCell>{earning.month}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="capitalize">
                                        {earning.affiliateType}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">{earning.affiliateName}</TableCell>
                                    <TableCell className="text-right">${earning.monthlyFee}</TableCell>
                                    <TableCell className="text-right font-semibold text-primary">
                                      ${earning.kickbackAmount.toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                      {earning.status === "paid" ? (
                                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                                          Paid
                                        </Badge>
                                      ) : earning.status === "pending" ? (
                                        <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                          Pending
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                                          Cancelled
                                        </Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No affiliate earnings in this date range.</p>
                            <p className="text-sm">
                              Share your mosque code ({mosque.mosqueCode}) with local businesses!
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  )
}
