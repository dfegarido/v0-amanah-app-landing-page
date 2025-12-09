"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Store,
  Ticket,
  Key,
  FileText,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { mockMembers } from "@/lib/mock-data"

export default function AdminMemberDetailPage() {
  const params = useParams()
  const memberId = params.id as string

  const member = mockMembers.find((m) => m.id === memberId)
  const [isAddingLogin, setIsAddingLogin] = useState(false)
  const [newLogin, setNewLogin] = useState({ platform: "", username: "", password: "" })

  if (!member) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Member Not Found</h1>
          <Link href="/admin" className="text-primary hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

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

  const mosqueSubscriptions = member.subscriptions.filter((s) => s.type === "mosque")

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex items-center gap-4 px-6 py-4">
          <Link href="/admin" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-foreground">{member.name}</h1>
            <p className="text-sm text-muted-foreground">{member.email}</p>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        {/* Member Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Member Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="text-foreground">{member.email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Phone</Label>
              <p className="text-foreground">{member.phone || "Not provided"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Member Since</Label>
              <p className="text-foreground">{new Date(member.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Total Monthly</Label>
              <p className="text-foreground font-semibold text-primary">
                ${member.subscriptions.reduce((acc, s) => acc + s.price, 0)}/month
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Subscriptions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Subscriptions</CardTitle>
            <CardDescription>Manage member subscriptions and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {member.subscriptions.map((subscription) => (
                <div key={subscription.id} className="p-4 border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        {getSubscriptionIcon(subscription.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{subscription.name}</p>
                          {getStatusBadge(subscription.status)}
                        </div>
                        <p className="text-sm text-muted-foreground capitalize">
                          {subscription.type} - ${subscription.price}/mo
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {subscription.status === "past_due" && (
                        <Button variant="destructive" size="sm">
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Disable in App
                        </Button>
                      )}
                      {subscription.status === "active" && (
                        <Button variant="outline" size="sm">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Active
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Documents for this subscription */}
                  {(subscription.type === "mosque" || subscription.type === "business") &&
                    (subscription as any).documents && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-sm font-semibold text-muted-foreground mb-2">Documents</p>
                        {(subscription as any).documents.length > 0 ? (
                          <div className="space-y-2">
                            {(subscription as any).documents.map((doc: any) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between p-2 bg-secondary/50 rounded"
                              >
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{doc.name}</span>
                                </div>
                                <Button variant="ghost" size="sm">
                                  View
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No documents uploaded</p>
                        )}
                      </div>
                    )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Third Party Logins - For Mosques */}
        {mosqueSubscriptions.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Third Party App Logins
                </CardTitle>
                <CardDescription>Manage login credentials for mosque apps</CardDescription>
              </div>
              <Dialog open={isAddingLogin} onOpenChange={setIsAddingLogin}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Login
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Third Party Login</DialogTitle>
                    <DialogDescription>Add login credentials for external services</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Platform Name</Label>
                      <Input
                        placeholder="e.g., Stripe, Square, etc."
                        value={newLogin.platform}
                        onChange={(e) => setNewLogin({ ...newLogin, platform: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Username / Email</Label>
                      <Input
                        placeholder="Login username or email"
                        value={newLogin.username}
                        onChange={(e) => setNewLogin({ ...newLogin, username: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input
                        type="password"
                        placeholder="Login password"
                        value={newLogin.password}
                        onChange={(e) => setNewLogin({ ...newLogin, password: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddingLogin(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        // In production, this would save to database
                        setIsAddingLogin(false)
                        setNewLogin({ platform: "", username: "", password: "" })
                      }}
                    >
                      Save Login
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {mosqueSubscriptions.map((mosque) => (
                <div key={mosque.id} className="mb-4">
                  <p className="text-sm font-semibold text-muted-foreground mb-2">{mosque.name}</p>
                  {(mosque as any).thirdPartyLogins?.length > 0 ? (
                    <div className="space-y-2">
                      {(mosque as any).thirdPartyLogins.map((login: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                          <div>
                            <p className="font-medium text-foreground">{login.platform}</p>
                            <p className="text-sm text-muted-foreground">Username: {login.username}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No logins configured for this mosque</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
