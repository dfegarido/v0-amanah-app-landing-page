"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Store,
  Ticket,
  Upload,
  FileText,
  Trash2,
  Edit,
  Save,
  X,
  Key,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { mockMembers } from "@/lib/mock-data"

export default function SubscriptionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const subscriptionId = params.id as string

  // Find the subscription
  const member = mockMembers.find((m) => m.subscriptions.some((s) => s.id === subscriptionId))
  const subscription = member?.subscriptions.find((s) => s.id === subscriptionId)

  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState(subscription || {})

  const handleCancelSubscription = () => {
    console.log("[v0] Cancelling subscription:", subscriptionId)
    // In a real app, this would call an API
    alert("Subscription cancelled successfully. You will retain access until the end of your billing period.")
    router.push("/member")
  }

  const handleSaveChanges = () => {
    console.log("[v0] Saving subscription changes, triggering update pending status")
    // In a real app, this would call an API and send notification email to admin
    alert("Changes saved successfully! Your updates will be reviewed and applied within 1-2 business days.")
    setIsEditing(false)
    // This would set the subscription status to 'update_pending' in the backend
  }

  if (!subscription) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Subscription Not Found</h1>
          <Link href="/member" className="text-primary hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const getSubscriptionIcon = (type: string) => {
    switch (type) {
      case "mosque":
        return <Building2 className="h-6 w-6" />
      case "business":
        return <Store className="h-6 w-6" />
      case "coupon":
        return <Ticket className="h-6 w-6" />
      case "nonprofit":
        return <FileText className="h-6 w-6" />
      default:
        return <FileText className="h-6 w-6" />
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
      case "update_pending":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Update Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex items-center gap-4 px-6 py-4">
          <Link href="/member" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              {getSubscriptionIcon(subscription.type)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-foreground">{subscription.name}</h1>
                {getStatusBadge(subscription.status)}
              </div>
              <p className="text-sm text-muted-foreground capitalize">{subscription.type} Subscription</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        {/* Subscription Details */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Subscription Details</CardTitle>
              <CardDescription>Manage your {subscription.type} listing information</CardDescription>
            </div>
            {!isEditing ? (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSaveChanges}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription.type === "nonprofit" && (
              <>
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  {isEditing ? (
                    <Input
                      defaultValue={subscription.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    />
                  ) : (
                    <p className="text-foreground">{subscription.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  {isEditing ? (
                    <Input defaultValue={(subscription as any).address} />
                  ) : (
                    <p className="text-foreground">{(subscription as any).address}</p>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    {isEditing ? (
                      <Input type="email" defaultValue={(subscription as any).email} />
                    ) : (
                      <p className="text-foreground">{(subscription as any).email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    {isEditing ? (
                      <Input type="tel" defaultValue={(subscription as any).phone} />
                    ) : (
                      <p className="text-foreground">{(subscription as any).phone}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  {isEditing ? (
                    <Input type="url" defaultValue={(subscription as any).website} />
                  ) : (
                    <p className="text-foreground">{(subscription as any).website}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Social Media Links</Label>
                  {isEditing ? (
                    <Textarea
                      defaultValue={(subscription as any).socialMedia}
                      placeholder="Facebook, Instagram, Twitter links..."
                    />
                  ) : (
                    <p className="text-foreground">{(subscription as any).socialMedia}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Donate Link</Label>
                  {isEditing ? (
                    <Input type="url" defaultValue={(subscription as any).donateLink} />
                  ) : (
                    <p className="text-foreground">{(subscription as any).donateLink}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>About Organization</Label>
                  {isEditing ? (
                    <Textarea defaultValue={(subscription as any).about} rows={4} />
                  ) : (
                    <p className="text-foreground">{(subscription as any).about}</p>
                  )}
                </div>
              </>
            )}

            {subscription.type === "coupon" && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    {isEditing ? (
                      <Input defaultValue={(subscription as any).title} />
                    ) : (
                      <p className="text-foreground">{(subscription as any).title}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Merchant</Label>
                    {isEditing ? (
                      <Input defaultValue={(subscription as any).merchant} />
                    ) : (
                      <p className="text-foreground">{(subscription as any).merchant}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    {isEditing ? (
                      <Input type="tel" defaultValue={(subscription as any).phone} />
                    ) : (
                      <p className="text-foreground">{(subscription as any).phone}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    {isEditing ? (
                      <Input type="email" defaultValue={(subscription as any).email} />
                    ) : (
                      <p className="text-foreground">{(subscription as any).email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    {isEditing ? (
                      <Input type="url" defaultValue={(subscription as any).website} />
                    ) : (
                      <p className="text-foreground">{(subscription as any).website}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Discount</Label>
                    {isEditing ? (
                      <Input defaultValue={(subscription as any).discount} placeholder="20% off or $10 off" />
                    ) : (
                      <p className="text-foreground">{(subscription as any).discount}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Redeem Code</Label>
                    {isEditing ? (
                      <Input defaultValue={(subscription as any).redeemCode} />
                    ) : (
                      <p className="text-foreground">{(subscription as any).redeemCode}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Redeem Limit</Label>
                    {isEditing ? (
                      <Input type="number" defaultValue={(subscription as any).redeemLimit} />
                    ) : (
                      <p className="text-foreground">{(subscription as any).redeemLimit}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  {isEditing ? (
                    <Textarea defaultValue={(subscription as any).description} rows={3} />
                  ) : (
                    <p className="text-foreground">{(subscription as any).description}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  {isEditing ? (
                    <Input defaultValue={(subscription as any).address} />
                  ) : (
                    <p className="text-foreground">{(subscription as any).address}</p>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    {isEditing ? (
                      <Input type="date" defaultValue={(subscription as any).startDate} />
                    ) : (
                      <p className="text-foreground">{(subscription as any).startDate}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    {isEditing ? (
                      <Input type="date" defaultValue={(subscription as any).endDate} />
                    ) : (
                      <p className="text-foreground">{(subscription as any).endDate}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {subscription.type === "business" && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Business Title</Label>
                    {isEditing ? (
                      <Input defaultValue={(subscription as any).title} />
                    ) : (
                      <p className="text-foreground">{(subscription as any).title}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    {isEditing ? (
                      <Input defaultValue={(subscription as any).category} />
                    ) : (
                      <p className="text-foreground">{(subscription as any).category}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Sub Category</Label>
                    {isEditing ? (
                      <Input defaultValue={(subscription as any).subCategory} />
                    ) : (
                      <p className="text-foreground">{(subscription as any).subCategory}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    {isEditing ? (
                      <Input type="tel" defaultValue={(subscription as any).phone} />
                    ) : (
                      <p className="text-foreground">{(subscription as any).phone}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Fax</Label>
                    {isEditing ? (
                      <Input defaultValue={(subscription as any).fax} />
                    ) : (
                      <p className="text-foreground">{(subscription as any).fax}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    {isEditing ? (
                      <Input type="email" defaultValue={(subscription as any).email} />
                    ) : (
                      <p className="text-foreground">{(subscription as any).email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    {isEditing ? (
                      <Input type="url" defaultValue={(subscription as any).website} />
                    ) : (
                      <p className="text-foreground">{(subscription as any).website}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Zip Code</Label>
                    {isEditing ? (
                      <Input defaultValue={(subscription as any).zip} />
                    ) : (
                      <p className="text-foreground">{(subscription as any).zip}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  {isEditing ? (
                    <Input defaultValue={(subscription as any).address} />
                  ) : (
                    <p className="text-foreground">{(subscription as any).address}</p>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>City</Label>
                    {isEditing ? (
                      <Input defaultValue={(subscription as any).city} />
                    ) : (
                      <p className="text-foreground">{(subscription as any).city}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    {isEditing ? (
                      <Input defaultValue={(subscription as any).state} />
                    ) : (
                      <p className="text-foreground">{(subscription as any).state}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    {isEditing ? (
                      <Input defaultValue={(subscription as any).country} />
                    ) : (
                      <p className="text-foreground">{(subscription as any).country}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  {isEditing ? (
                    <Textarea defaultValue={(subscription as any).description} rows={4} />
                  ) : (
                    <p className="text-foreground">{(subscription as any).description}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Social Media Links</Label>
                  {isEditing ? (
                    <Textarea
                      defaultValue={(subscription as any).socialMedia}
                      placeholder="Facebook, Instagram, Twitter links..."
                    />
                  ) : (
                    <p className="text-foreground">{(subscription as any).socialMedia}</p>
                  )}
                </div>
              </>
            )}

            {subscription.type === "mosque" && (
              <>
                <div className="space-y-2">
                  <Label>Mosque Name</Label>
                  {isEditing ? (
                    <Input defaultValue={subscription.name} />
                  ) : (
                    <p className="text-foreground">{subscription.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  {isEditing ? (
                    <Input defaultValue={(subscription as any).address} />
                  ) : (
                    <p className="text-foreground">{(subscription as any).address}</p>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    {isEditing ? (
                      <Input type="email" defaultValue={(subscription as any).email} />
                    ) : (
                      <p className="text-foreground">{(subscription as any).email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    {isEditing ? (
                      <Input type="tel" defaultValue={(subscription as any).phone} />
                    ) : (
                      <p className="text-foreground">{(subscription as any).phone}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  {isEditing ? (
                    <Input type="url" defaultValue={(subscription as any).website} />
                  ) : (
                    <p className="text-foreground">{(subscription as any).website}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Social Media Links</Label>
                  {isEditing ? (
                    <Textarea
                      defaultValue={(subscription as any).socialMedia}
                      placeholder="Facebook, Instagram, Twitter links..."
                    />
                  ) : (
                    <p className="text-foreground">{(subscription as any).socialMedia}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Donate Link</Label>
                  {isEditing ? (
                    <Input type="url" defaultValue={(subscription as any).donateLink} />
                  ) : (
                    <p className="text-foreground">{(subscription as any).donateLink}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Prayer Times Link</Label>
                  {isEditing ? (
                    <Input type="url" defaultValue={(subscription as any).prayerTimesLink} />
                  ) : (
                    <p className="text-foreground">{(subscription as any).prayerTimesLink}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Sunday School</Label>
                  {isEditing ? (
                    <Textarea
                      defaultValue={(subscription as any).sundaySchool}
                      placeholder="Sunday school information..."
                    />
                  ) : (
                    <p className="text-foreground">{(subscription as any).sundaySchool}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Services Offered</Label>
                  {isEditing ? (
                    <Textarea
                      defaultValue={(subscription as any).services}
                      placeholder="Prayer services, classes, events..."
                    />
                  ) : (
                    <p className="text-foreground">{(subscription as any).services}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Committee Members</Label>
                  {isEditing ? (
                    <Textarea
                      defaultValue={(subscription as any).committeeMembers}
                      placeholder="List of committee members..."
                    />
                  ) : (
                    <p className="text-foreground">{(subscription as any).committeeMembers}</p>
                  )}
                </div>
              </>
            )}

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Price</Label>
                <p className="text-foreground font-semibold">${subscription.price}/month</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Next Billing Date</Label>
                <p className="text-foreground">{new Date(subscription.nextBillingDate).toLocaleDateString()}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Payment Started</Label>
                <p className="text-foreground">{new Date(subscription.paymentStartDate).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Third Party Logins - Mosque Only */}
        {subscription.type === "mosque" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Third Party App Logins
              </CardTitle>
              <CardDescription>Login credentials for connected services (managed by admin)</CardDescription>
            </CardHeader>
            <CardContent>
              {(subscription as any).thirdPartyLogins?.length > 0 ? (
                <div className="space-y-3">
                  {(subscription as any).thirdPartyLogins.map((login: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">{login.platform}</p>
                        <p className="text-sm text-muted-foreground">Username: {login.username}</p>
                      </div>
                      <Badge variant="outline">Admin Managed</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No third party logins configured. Contact admin to set up.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Documents */}
        {(subscription.type === "mosque" || subscription.type === "business") && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
              <CardDescription>Upload required documents for verification</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Upload Area */}
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center mb-4">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">Click or drag to upload documents</p>
                <p className="text-xs text-muted-foreground">PDF, PNG, JPG up to 10MB</p>
              </div>

              {/* Document List */}
              {(subscription as any).documents?.length > 0 && (
                <div className="space-y-2">
                  {(subscription as any).documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {subscription.status === "active" && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Cancel Subscription
              </CardTitle>
              <CardDescription>
                Cancel your subscription. You will retain access until the end of your current billing period.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Cancel Subscription</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will cancel your subscription for <strong>{subscription.name}</strong>. You will retain
                      access until <strong>{new Date(subscription.nextBillingDate).toLocaleDateString()}</strong> and no
                      further charges will be made.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancelSubscription} className="bg-destructive">
                      Yes, Cancel Subscription
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
