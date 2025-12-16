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

  const [formData, setFormData] = useState({
    name: (subscription as any)?.name || "",
    address: (subscription as any)?.address || "",
    email: (subscription as any)?.email || "",
    phone: (subscription as any)?.phone || "",
    website: (subscription as any)?.website || "",
    socialMedia: (subscription as any)?.socialMedia
      ? typeof (subscription as any).socialMedia === "object"
        ? Object.entries((subscription as any).socialMedia)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n")
        : (subscription as any).socialMedia
      : "",
    description: (subscription as any)?.description || "",
    title: (subscription as any)?.title || "",
    category: (subscription as any)?.category || "",
    subCategory: (subscription as any)?.subCategory || "",
    fax: (subscription as any)?.fax || "",
    zip: (subscription as any)?.zip || "",
    city: (subscription as any)?.city || "",
    state: (subscription as any)?.state || "",
    country: (subscription as any)?.country || "",
    merchant: (subscription as any)?.merchant || "",
    discount: (subscription as any)?.discount || "",
    redeemCode: (subscription as any)?.redeemCode || "",
    redeemLimit: (subscription as any)?.redeemLimit || "",
    startDate: (subscription as any)?.startDate || "",
    endDate: (subscription as any)?.endDate || "",
    donateLink: (subscription as any)?.donateLink || "",
    prayerTimesLink: (subscription as any)?.prayerTimesLink || "",
    sundaySchool: (subscription as any)?.sundaySchool || "",
    services: (subscription as any)?.services || "",
    committeeMembers: (subscription as any)?.committeeMembers || "",
    about: (subscription as any)?.about || "",
  })

  const handleCancelSubscription = () => {
    alert("Subscription cancelled successfully. You will retain access until the end of your billing period.")
    router.push("/member")
  }

  const handleSaveChanges = () => {
    alert("Changes saved successfully! Your updates will be reviewed and applied within 1-2 business days.")
    setIsEditing(false)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
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
                    <Input value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} />
                  ) : (
                    <p className="text-foreground">{formData.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  {isEditing ? (
                    <Input value={formData.address} onChange={(e) => handleInputChange("address", e.target.value)} />
                  ) : (
                    <p className="text-foreground">{formData.address}</p>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    {isEditing ? (
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    {isEditing ? (
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.phone}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  {isEditing ? (
                    <Input
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleInputChange("website", e.target.value)}
                    />
                  ) : (
                    <p className="text-foreground">{formData.website}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Social Media Links</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.socialMedia}
                      onChange={(e) => handleInputChange("socialMedia", e.target.value)}
                      placeholder="facebook: https://...\ninstagram: https://..."
                    />
                  ) : (
                    <p className="text-foreground whitespace-pre-wrap">{formData.socialMedia || "Not provided"}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Donate Link</Label>
                  {isEditing ? (
                    <Input
                      type="url"
                      value={formData.donateLink}
                      onChange={(e) => handleInputChange("donateLink", e.target.value)}
                    />
                  ) : (
                    <p className="text-foreground">{formData.donateLink}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>About Organization</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.about}
                      onChange={(e) => handleInputChange("about", e.target.value)}
                      rows={4}
                    />
                  ) : (
                    <p className="text-foreground">{formData.about}</p>
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
                      <Input value={formData.title} onChange={(e) => handleInputChange("title", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.title}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Merchant</Label>
                    {isEditing ? (
                      <Input
                        value={formData.merchant}
                        onChange={(e) => handleInputChange("merchant", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.merchant}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    {isEditing ? (
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.phone}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    {isEditing ? (
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    {isEditing ? (
                      <Input
                        type="url"
                        value={formData.website}
                        onChange={(e) => handleInputChange("website", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.website}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Discount</Label>
                    {isEditing ? (
                      <Input
                        value={formData.discount}
                        onChange={(e) => handleInputChange("discount", e.target.value)}
                        placeholder="20% off or $10 off"
                      />
                    ) : (
                      <p className="text-foreground">{formData.discount}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Redeem Code</Label>
                    {isEditing ? (
                      <Input
                        value={formData.redeemCode}
                        onChange={(e) => handleInputChange("redeemCode", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.redeemCode}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Redeem Limit</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={formData.redeemLimit}
                        onChange={(e) => handleInputChange("redeemLimit", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.redeemLimit}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      rows={3}
                    />
                  ) : (
                    <p className="text-foreground">{formData.description}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  {isEditing ? (
                    <Input value={formData.address} onChange={(e) => handleInputChange("address", e.target.value)} />
                  ) : (
                    <p className="text-foreground">{formData.address}</p>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => handleInputChange("startDate", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.startDate}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => handleInputChange("endDate", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.endDate}</p>
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
                      <Input value={formData.title} onChange={(e) => handleInputChange("title", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.title}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    {isEditing ? (
                      <Input
                        value={formData.category}
                        onChange={(e) => handleInputChange("category", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.category}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Sub Category</Label>
                    {isEditing ? (
                      <Input
                        value={formData.subCategory}
                        onChange={(e) => handleInputChange("subCategory", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.subCategory}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    {isEditing ? (
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.phone}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Fax</Label>
                    {isEditing ? (
                      <Input value={formData.fax} onChange={(e) => handleInputChange("fax", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.fax}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    {isEditing ? (
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    {isEditing ? (
                      <Input
                        type="url"
                        value={formData.website}
                        onChange={(e) => handleInputChange("website", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.website}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Zip Code</Label>
                    {isEditing ? (
                      <Input value={formData.zip} onChange={(e) => handleInputChange("zip", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.zip}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  {isEditing ? (
                    <Input value={formData.address} onChange={(e) => handleInputChange("address", e.target.value)} />
                  ) : (
                    <p className="text-foreground">{formData.address}</p>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>City</Label>
                    {isEditing ? (
                      <Input value={formData.city} onChange={(e) => handleInputChange("city", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.city}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    {isEditing ? (
                      <Input value={formData.state} onChange={(e) => handleInputChange("state", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.state}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    {isEditing ? (
                      <Input value={formData.country} onChange={(e) => handleInputChange("country", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.country}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      rows={4}
                    />
                  ) : (
                    <p className="text-foreground">{formData.description}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Social Media Links</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.socialMedia}
                      onChange={(e) => handleInputChange("socialMedia", e.target.value)}
                      placeholder="facebook: https://...\ninstagram: https://..."
                    />
                  ) : (
                    <p className="text-foreground whitespace-pre-wrap">{formData.socialMedia || "Not provided"}</p>
                  )}
                </div>
              </>
            )}

            {subscription.type === "mosque" && (
              <>
                <div className="space-y-2">
                  <Label>Mosque Name</Label>
                  {isEditing ? (
                    <Input value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} />
                  ) : (
                    <p className="text-foreground">{formData.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  {isEditing ? (
                    <Input value={formData.address} onChange={(e) => handleInputChange("address", e.target.value)} />
                  ) : (
                    <p className="text-foreground">{formData.address}</p>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    {isEditing ? (
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    {isEditing ? (
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.phone}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  {isEditing ? (
                    <Input
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleInputChange("website", e.target.value)}
                    />
                  ) : (
                    <p className="text-foreground">{formData.website}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Social Media Links</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.socialMedia}
                      onChange={(e) => handleInputChange("socialMedia", e.target.value)}
                      placeholder="facebook: https://...\ninstagram: https://..."
                    />
                  ) : (
                    <p className="text-foreground whitespace-pre-wrap">{formData.socialMedia || "Not provided"}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Donate Link</Label>
                  {isEditing ? (
                    <Input
                      type="url"
                      value={formData.donateLink}
                      onChange={(e) => handleInputChange("donateLink", e.target.value)}
                    />
                  ) : (
                    <p className="text-foreground">{formData.donateLink}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Prayer Times Link</Label>
                  {isEditing ? (
                    <Input
                      type="url"
                      value={formData.prayerTimesLink}
                      onChange={(e) => handleInputChange("prayerTimesLink", e.target.value)}
                    />
                  ) : (
                    <p className="text-foreground">{formData.prayerTimesLink}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Sunday School</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.sundaySchool}
                      onChange={(e) => handleInputChange("sundaySchool", e.target.value)}
                      placeholder="Sunday school information..."
                    />
                  ) : (
                    <p className="text-foreground">{formData.sundaySchool}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Services Offered</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.services}
                      onChange={(e) => handleInputChange("services", e.target.value)}
                      placeholder="Prayer services, classes, events..."
                    />
                  ) : (
                    <p className="text-foreground">{formData.services}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Committee Members</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.committeeMembers}
                      onChange={(e) => handleInputChange("committeeMembers", e.target.value)}
                      placeholder="List of committee members..."
                    />
                  ) : (
                    <p className="text-foreground">{formData.committeeMembers}</p>
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
          <Card className="border-destructive/50 mt-6">
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
