"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Building2,
  Store,
  Ticket,
  Users,
  AlertTriangle,
  CheckCircle,
  Settings,
  LogOut,
  Bell,
  Search,
  Eye,
  Key,
  FileText,
  ChevronDown,
  ChevronUp,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
  Copy,
  User,
  Tag,
  Download,
  ImageIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { mockMembers, mockPaymentAlerts } from "@/lib/mock-data"
import type { MosqueSubscription, BusinessSubscription, CouponSubscription } from "@/lib/types"

export default function AdminDashboard() {
  const [alerts, setAlerts] = useState(mockPaymentAlerts)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  const allMosques = mockMembers.flatMap((m) =>
    m.subscriptions
      .filter((s) => s.type === "mosque")
      .map((s) => ({ ...s, memberName: m.name, memberEmail: m.email, memberPhone: m.phone, memberId: m.id })),
  ) as (MosqueSubscription & { memberName: string; memberEmail: string; memberPhone?: string; memberId: string })[]

  const allBusinesses = mockMembers.flatMap((m) =>
    m.subscriptions
      .filter((s) => s.type === "business")
      .map((s) => ({ ...s, memberName: m.name, memberEmail: m.email, memberPhone: m.phone, memberId: m.id })),
  ) as (BusinessSubscription & { memberName: string; memberEmail: string; memberPhone?: string; memberId: string })[]

  const allCoupons = mockMembers.flatMap((m) =>
    m.subscriptions
      .filter((s) => s.type === "coupon")
      .map((s) => ({ ...s, memberName: m.name, memberEmail: m.email, memberPhone: m.phone, memberId: m.id })),
  ) as (CouponSubscription & { memberName: string; memberEmail: string; memberPhone?: string; memberId: string })[]

  const totalMosques = allMosques.length
  const totalBusinesses = allBusinesses.length
  const totalCoupons = allCoupons.length
  const unresolvedAlerts = alerts.filter((a) => !a.resolved).length

  const handleResolveAlert = (alertId: string) => {
    setAlerts(
      alerts.map((a) => (a.id === alertId ? { ...a, resolved: true, resolvedAt: new Date().toISOString() } : a)),
    )
  }

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const filteredMembers = mockMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const downloadAllPhotos = async (photos: string[], name: string) => {
    // In a real app, this would create a zip file or download each image
    // For now, we'll open each photo in a new tab
    photos.forEach((photo, index) => {
      const link = document.createElement("a")
      link.href = photo
      link.download = `${name.replace(/\s+/g, "-")}-photo-${index + 1}`
      link.target = "_blank"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    })
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
              <p className="text-sm text-muted-foreground">Manage members and subscriptions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bell className="h-5 w-5" />
              {unresolvedAlerts > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                  {unresolvedAlerts}
                </span>
              )}
            </div>
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
        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Total Mosques</CardDescription>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalMosques}</div>
              <p className="text-xs text-muted-foreground">$100/mo each</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Total Businesses</CardDescription>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalBusinesses}</div>
              <p className="text-xs text-muted-foreground">$10/mo each</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Total Coupons</CardDescription>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalCoupons}</div>
              <p className="text-xs text-muted-foreground">$10/mo each</p>
            </CardContent>
          </Card>
          <Card className={unresolvedAlerts > 0 ? "border-destructive" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>Payment Alerts</CardDescription>
              <AlertTriangle
                className={`h-4 w-4 ${unresolvedAlerts > 0 ? "text-destructive" : "text-muted-foreground"}`}
              />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${unresolvedAlerts > 0 ? "text-destructive" : ""}`}>
                {unresolvedAlerts}
              </div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="mosques" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="mosques">
              <Building2 className="h-4 w-4 mr-2" />
              Mosques ({totalMosques})
            </TabsTrigger>
            <TabsTrigger value="businesses">
              <Store className="h-4 w-4 mr-2" />
              Businesses ({totalBusinesses})
            </TabsTrigger>
            <TabsTrigger value="coupons">
              <Ticket className="h-4 w-4 mr-2" />
              Coupons ({totalCoupons})
            </TabsTrigger>
            <TabsTrigger value="alerts" className="relative">
              Payment Alerts
              {unresolvedAlerts > 0 && (
                <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                  {unresolvedAlerts}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="members">All Members</TabsTrigger>
          </TabsList>

          {/* Mosques Tab */}
          <TabsContent value="mosques">
            <Card>
              <CardHeader>
                <CardTitle>All Mosques</CardTitle>
                <CardDescription>View and manage all mosque subscriptions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {allMosques.map((mosque) => (
                  <Collapsible
                    key={mosque.id}
                    open={expandedItems[mosque.id]}
                    onOpenChange={() => toggleExpanded(mosque.id)}
                  >
                    <div className="border border-border rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
                              {mosque.photo ? (
                                <img
                                  src={mosque.photo || "/placeholder.svg"}
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
                              </div>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {mosque.location}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-semibold text-foreground">${mosque.price}/mo</p>
                              <p className="text-xs text-muted-foreground">{mosque.memberName}</p>
                            </div>
                            {expandedItems[mosque.id] ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t border-border p-4 bg-secondary/20">
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Photos Gallery */}
                            {mosque.photos && mosque.photos.length > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-sm font-semibold flex items-center gap-2">
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
                                <div className="grid grid-cols-2 gap-2">
                                  {mosque.photos.map((photo, idx) => (
                                    <img
                                      key={idx}
                                      src={photo || "/placeholder.svg"}
                                      alt={`${mosque.name} photo ${idx + 1}`}
                                      className="rounded-lg w-full h-32 object-cover"
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Details */}
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-sm font-semibold mb-2">Details</h4>
                                <div className="space-y-2 text-sm">
                                  {mosque.description && <p className="text-muted-foreground">{mosque.description}</p>}
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    <span>{mosque.location}</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => copyToClipboard(mosque.location)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  {mosque.contactName && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <User className="h-4 w-4" />
                                      <span>Contact: {mosque.contactName}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Mail className="h-4 w-4" />
                                    <span>{mosque.memberEmail}</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => copyToClipboard(mosque.memberEmail)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  {mosque.memberPhone && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Phone className="h-4 w-4" />
                                      <span>{mosque.memberPhone}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => copyToClipboard(mosque.memberPhone!)}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>
                                      Payment started: {new Date(mosque.paymentStartDate).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>Next billing: {new Date(mosque.nextBillingDate).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Third Party Logins */}
                              {mosque.thirdPartyLogins && mosque.thirdPartyLogins.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Key className="h-4 w-4" />
                                    3rd Party Logins
                                  </h4>
                                  <div className="space-y-2">
                                    {mosque.thirdPartyLogins.map((login, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between bg-background p-2 rounded text-sm"
                                      >
                                        <span className="font-medium">{login.platform}</span>
                                        <span className="text-muted-foreground">User: {login.username}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Documents */}
                          {mosque.documents && mosque.documents.length > 0 && (
                            <div className="mt-4">
                              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Documents ({mosque.documents.length})
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {mosque.documents.map((doc) => (
                                  <div
                                    key={doc.id}
                                    className="flex items-center gap-2 bg-background p-2 rounded text-sm"
                                  >
                                    <FileText className="h-4 w-4 text-primary" />
                                    <span className="truncate">{doc.name}</span>
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

          {/* Businesses Tab */}
          <TabsContent value="businesses">
            <Card>
              <CardHeader>
                <CardTitle>All Businesses</CardTitle>
                <CardDescription>View and manage all business listings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {allBusinesses.map((business) => (
                  <Collapsible
                    key={business.id}
                    open={expandedItems[business.id]}
                    onOpenChange={() => toggleExpanded(business.id)}
                  >
                    <div className="border border-border rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
                              {business.photo ? (
                                <img
                                  src={business.photo || "/placeholder.svg"}
                                  alt={business.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Store className="h-6 w-6 text-primary" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-foreground">{business.businessName}</p>
                                {getStatusBadge(business.status)}
                                <Badge variant="outline">{business.category}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {business.location}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-semibold text-foreground">${business.price}/mo</p>
                              <p className="text-xs text-muted-foreground">{business.memberName}</p>
                            </div>
                            {expandedItems[business.id] ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t border-border p-4 bg-secondary/20">
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Photos Gallery */}
                            {business.photos && business.photos.length > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <ImageIcon className="h-4 w-4" />
                                    Photos ({business.photos.length})
                                  </h4>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadAllPhotos(business.photos!, business.businessName)}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download All Photos
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  {business.photos.map((photo, idx) => (
                                    <img
                                      key={idx}
                                      src={photo || "/placeholder.svg"}
                                      alt={`${business.businessName} photo ${idx + 1}`}
                                      className="rounded-lg w-full h-32 object-cover"
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Details */}
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-sm font-semibold mb-2">Business Details</h4>
                                <div className="space-y-2 text-sm">
                                  <p className="text-muted-foreground">{business.description}</p>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Tag className="h-4 w-4" />
                                    <span>Category: {business.category}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    <span>{business.location}</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => copyToClipboard(business.location)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  {business.website && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Globe className="h-4 w-4" />
                                      <span>{business.website}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => copyToClipboard(business.website!)}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                  {business.contactName && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <User className="h-4 w-4" />
                                      <span>Contact: {business.contactName}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Mail className="h-4 w-4" />
                                    <span>{business.memberEmail}</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => copyToClipboard(business.memberEmail)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  {business.memberPhone && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Phone className="h-4 w-4" />
                                      <span>{business.memberPhone}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => copyToClipboard(business.memberPhone!)}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>
                                      Payment started: {new Date(business.paymentStartDate).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>Next billing: {new Date(business.nextBillingDate).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Documents */}
                          {business.documents && business.documents.length > 0 && (
                            <div className="mt-4">
                              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Documents ({business.documents.length})
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {business.documents.map((doc) => (
                                  <div
                                    key={doc.id}
                                    className="flex items-center gap-2 bg-background p-2 rounded text-sm"
                                  >
                                    <FileText className="h-4 w-4 text-primary" />
                                    <span className="truncate">{doc.name}</span>
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
                <CardDescription>View and manage all coupon listings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {allCoupons.map((coupon) => (
                  <Collapsible
                    key={coupon.id}
                    open={expandedItems[coupon.id]}
                    onOpenChange={() => toggleExpanded(coupon.id)}
                  >
                    <div className="border border-border rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
                              {coupon.photo ? (
                                <img
                                  src={coupon.photo || "/placeholder.svg"}
                                  alt={coupon.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Ticket className="h-6 w-6 text-primary" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-foreground">{coupon.name}</p>
                                {getStatusBadge(coupon.status)}
                              </div>
                              <p className="text-sm text-muted-foreground">{coupon.businessName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-semibold text-foreground">${coupon.price}/mo</p>
                              <p className="text-xs text-muted-foreground">{coupon.memberName}</p>
                            </div>
                            {expandedItems[coupon.id] ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t border-border p-4 bg-secondary/20">
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Photos Gallery */}
                            {coupon.photos && coupon.photos.length > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <ImageIcon className="h-4 w-4" />
                                    Photos ({coupon.photos.length})
                                  </h4>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadAllPhotos(coupon.photos!, coupon.name)}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download All Photos
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  {coupon.photos.map((photo, idx) => (
                                    <img
                                      key={idx}
                                      src={photo || "/placeholder.svg"}
                                      alt={`${coupon.name} photo ${idx + 1}`}
                                      className="rounded-lg w-full h-32 object-cover"
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Details */}
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-sm font-semibold mb-2">Coupon Details</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="bg-primary/10 p-3 rounded-lg">
                                    <p className="font-semibold text-primary">{coupon.offer}</p>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Store className="h-4 w-4" />
                                    <span>Business: {coupon.businessName}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <MapPin className="h-4 w-4" />
                                    <span>{coupon.location}</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => copyToClipboard(coupon.location)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  {coupon.expiryDate && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Calendar className="h-4 w-4" />
                                      <span>Expires: {new Date(coupon.expiryDate).toLocaleDateString()}</span>
                                    </div>
                                  )}
                                  {coupon.terms && (
                                    <div className="mt-2">
                                      <p className="text-xs text-muted-foreground">Terms: {coupon.terms}</p>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-muted-foreground mt-2">
                                    <Mail className="h-4 w-4" />
                                    <span>{coupon.memberEmail}</span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => copyToClipboard(coupon.memberEmail)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  {coupon.memberPhone && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Phone className="h-4 w-4" />
                                      <span>{coupon.memberPhone}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => copyToClipboard(coupon.memberPhone!)}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>
                                      Payment started: {new Date(coupon.paymentStartDate).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
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

          {/* Payment Alerts Tab */}
          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle>Payment Alerts</CardTitle>
                <CardDescription>Members with failed payments or cancelled subscriptions</CardDescription>
              </CardHeader>
              <CardContent>
                {alerts.filter((a) => !a.resolved).length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">All Clear!</h3>
                    <p className="text-muted-foreground">No payment issues to resolve.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alerts
                      .filter((a) => !a.resolved)
                      .map((alert) => (
                        <div
                          key={alert.id}
                          className="flex items-center justify-between p-4 bg-destructive/5 border border-destructive/20 rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{alert.memberName}</p>
                              <p className="text-sm text-muted-foreground">
                                {alert.alertType === "payment_failed" ? "Payment Failed" : "Subscription Cancelled"} -{" "}
                                {alert.subscriptionName}
                              </p>
                              <p className="text-xs text-muted-foreground">{alert.memberEmail}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link href={`/admin/member/${alert.memberId}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Button>
                            </Link>
                            <Button size="sm" onClick={() => handleResolveAlert(alert.id)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Resolved
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* Resolved Alerts */}
                {alerts.filter((a) => a.resolved).length > 0 && (
                  <div className="mt-8">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-4">Recently Resolved</h4>
                    <div className="space-y-2">
                      {alerts
                        .filter((a) => a.resolved)
                        .map((alert) => (
                          <div
                            key={alert.id}
                            className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg opacity-60"
                          >
                            <div className="flex items-center gap-3">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <div>
                                <p className="text-sm font-medium text-foreground">{alert.memberName}</p>
                                <p className="text-xs text-muted-foreground">{alert.subscriptionName}</p>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Resolved {alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleDateString() : ""}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Members Tab */}
          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>All Members</CardTitle>
                <CardDescription>View all registered members</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">
                            {member.subscriptions.length} subscription(s)
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Joined {new Date(member.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Link href={`/admin/member/${member.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
