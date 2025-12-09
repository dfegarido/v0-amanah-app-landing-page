"use client"

import { useState } from "react"
import Link from "next/link"
import { Building2, Store, Ticket, Plus, CreditCard, FileText, Settings, LogOut, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { mockMembers } from "@/lib/mock-data"

export default function MemberDashboard() {
  // For demo purposes, using the second mock member (has multiple subscriptions)
  const [member] = useState(mockMembers[1])

  const getSubscriptionIcon = (type: string) => {
    switch (type) {
      case "mosque":
        return <Building2 className="h-5 w-5" />
      case "business":
        return <Store className="h-5 w-5" />
      case "coupon":
        return <Ticket className="h-5 w-5" />
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
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
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

        {/* Add New Subscription */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Add New Subscription</h3>
          <div className="grid gap-4 md:grid-cols-3">
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
          </div>
        </div>

        {/* Current Subscriptions */}
        <div className="mb-8">
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
      </main>
    </div>
  )
}
