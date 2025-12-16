"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Building2, Store, Ticket, CreditCard, Check, Plus, X, Upload, Info, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getAllMosquesWithCodes, getNextMosqueCode } from "@/lib/mock-data"

const subscriptionInfo = {
  mosque: {
    title: "Mosque Subscription",
    price: 100,
    icon: Building2,
    description: "List your mosque on Amanah and connect with your community",
  },
  business: {
    title: "Business Listing",
    price: 10,
    icon: Store,
    description: "Get your halal business discovered by the Muslim community",
  },
  coupon: {
    title: "Coupon Listing",
    price: 10,
    icon: Ticket,
    description: "Promote special offers and deals to attract more customers",
  },
  nonprofit: {
    title: "Non-Profit Organization",
    price: 50,
    icon: Users,
    description: "Showcase your non-profit and connect with donors in the Muslim community",
  },
}

export default function SubscribePage() {
  const params = useParams()
  const router = useRouter()
  const type = params.type as "mosque" | "business" | "coupon" | "nonprofit"

  const [step, setStep] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [uploadedLogo, setUploadedLogo] = useState<string | null>(null)
  const [affiliatedMosqueCode, setAffiliatedMosqueCode] = useState<string>("")
  const [formData, setFormData] = useState({ name: "" }) // Added to store form data

  const info = subscriptionInfo[type]
  const Icon = info?.icon || Building2

  const availableMosques = getAllMosquesWithCodes().filter((m) => m.status === "active")
  const nextMosqueCode = getNextMosqueCode()

  if (!info) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Subscription Type</h1>
          <Link href="/member" className="text-primary hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const handleImageUpload = () => {
    setUploadedImages([
      ...uploadedImages,
      `/placeholder.svg?height=300&width=400&query=uploaded image ${uploadedImages.length + 1}`,
    ])
  }

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index))
  }

  const handleLogoUpload = () => {
    setUploadedLogo("/mosque-logo.png")
  }

  const handleSubmit = async () => {
    setIsProcessing(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Simulate sending notification email to admin
    const newEmailLog = {
      id: `log-${Date.now()}`,
      to: "josh@mobileappcity.com",
      recipientName: "Amanah Admin",
      template: "Admin Alert - New Subscription",
      subject: `New ${type} subscription added: ${formData.name || "Unnamed"}`,
      sentAt: new Date().toISOString(),
      status: "sent" as const,
    }
    console.log("[v0] Notification email sent to admin:", newEmailLog)

    setStep(3)
    setIsProcessing(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  const renderDetailsForm = () => {
    if (type === "mosque") {
      return (
        <>
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-primary">Your Mosque Code</h3>
            </div>
            <p className="text-3xl font-bold text-primary mb-2">#{nextMosqueCode}</p>
            <p className="text-sm text-muted-foreground">
              This unique code will be assigned to your mosque. Share it with local businesses and they can affiliate
              with your mosque. You{"'"}ll earn 10% of their monthly subscription fee as a kickback!
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Basic Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Mosque Name *</Label>
                <Input id="name" placeholder="Enter mosque name" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input id="address" placeholder="Full address" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input id="email" type="email" placeholder="mosque@example.com" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" placeholder="+1 (555) 000-0000" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" placeholder="https://www.yourmasjid.org" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name (Leader) *</Label>
                <Input id="contactName" placeholder="Imam name or administrator" onChange={handleInputChange} />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Social Media</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input id="facebook" placeholder="https://facebook.com/yourmasjid" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input id="instagram" placeholder="https://instagram.com/yourmasjid" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter">X (Twitter)</Label>
                <Input id="twitter" placeholder="https://twitter.com/yourmasjid" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherSocial">Other Social Media</Label>
                <Input id="otherSocial" placeholder="Any other social links" onChange={handleInputChange} />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Logo & Images</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Logo (PNG File)</Label>
                <div className="flex items-center gap-4">
                  {uploadedLogo ? (
                    <div className="relative">
                      <img
                        src={uploadedLogo || "/placeholder.svg"}
                        alt="Logo"
                        className="h-20 w-20 object-contain rounded-lg border"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => setUploadedLogo(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={handleLogoUpload}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Images (PNG or JPG Files)</Label>
                <div className="grid grid-cols-3 gap-2">
                  {uploadedImages.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={img || "/placeholder.svg"}
                        alt={`Upload ${idx + 1}`}
                        className="h-24 w-full object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => removeImage(idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" className="h-24 bg-transparent" onClick={handleImageUpload}>
                    <Plus className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Links & Services</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="donateLink">Donate Link</Label>
                <Input id="donateLink" placeholder="https://yourmasjid.org/donate" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prayerTimesLink">Prayer Times Link</Label>
                <Input
                  id="prayerTimesLink"
                  placeholder="https://yourmasjid.org/prayer-times"
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sundaySchool">Sunday School</Label>
              <Textarea
                id="sundaySchool"
                placeholder="Describe your Sunday School program, timings, etc."
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="services">Services</Label>
              <Textarea
                id="services"
                placeholder="List services offered (Jummah, Nikah, Funeral, Counseling, etc.)"
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="committee">Committee Members</Label>
              <Textarea
                id="committee"
                placeholder="List committee members and their roles"
                onChange={handleInputChange}
              />
            </div>
          </div>
        </>
      )
    }

    if (type === "business") {
      return (
        <>
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-primary">Mosque Affiliation (Optional)</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Enter a mosque code to support your local mosque. 10% of your monthly fee ($1) will go to the mosque as a
              kickback.
            </p>
            <div className="space-y-2">
              <Label htmlFor="mosqueCode">Mosque Code</Label>
              <Select value={affiliatedMosqueCode} onValueChange={setAffiliatedMosqueCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a mosque or enter code" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Affiliation</SelectItem>
                  {availableMosques.map((mosque) => (
                    <SelectItem key={mosque.code} value={mosque.code.toString()}>
                      #{mosque.code} - {mosque.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Basic Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Business Title *</Label>
                <Input id="title" placeholder="Enter business name" onChange={handleInputChange} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your business..."
                  rows={4}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categories">Categories *</Label>
                <Input
                  id="categories"
                  placeholder="e.g., Restaurant, Retail, Services (comma separated)"
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subCategories">Sub Categories</Label>
                <Input
                  id="subCategories"
                  placeholder="e.g., Halal, Mediterranean (comma separated)"
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Photos (Image Size: 4/3 ratio – 400*300)</h3>
            <div className="grid grid-cols-3 gap-2">
              {uploadedImages.map((img, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={img || "/placeholder.svg"}
                    alt={`Upload ${idx + 1}`}
                    className="h-24 w-full object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => removeImage(idx)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" className="h-24 bg-transparent" onClick={handleImageUpload}>
                <Plus className="h-6 w-6" />
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Location</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address *</Label>
                <Input id="address" placeholder="Street address" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input id="city" placeholder="City" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input id="state" placeholder="State" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">Zip *</Label>
                <Input id="zip" placeholder="Zip code" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input id="country" placeholder="Country" defaultValue="USA" onChange={handleInputChange} />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Contact Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" placeholder="+1 (555) 000-0000" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fax">Fax</Label>
                <Input id="fax" placeholder="+1 (555) 000-0000" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="business@example.com" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" placeholder="https://www.yourbusiness.com" onChange={handleInputChange} />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Social Media</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input id="facebook" placeholder="https://facebook.com/yourbusiness" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input id="instagram" placeholder="https://instagram.com/yourbusiness" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter">X (Twitter)</Label>
                <Input id="twitter" placeholder="https://twitter.com/yourbusiness" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherSocial">Other</Label>
                <Input id="otherSocial" placeholder="Any other social links" onChange={handleInputChange} />
              </div>
            </div>
          </div>
        </>
      )
    }

    if (type === "coupon") {
      return (
        <>
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-primary">Mosque Affiliation (Optional)</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Enter a mosque code to support your local mosque. 10% of your monthly fee ($1) will go to the mosque as a
              kickback.
            </p>
            <div className="space-y-2">
              <Label htmlFor="mosqueCode">Mosque Code</Label>
              <Select value={affiliatedMosqueCode} onValueChange={setAffiliatedMosqueCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a mosque or enter code" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Affiliation</SelectItem>
                  {availableMosques.map((mosque) => (
                    <SelectItem key={mosque.code} value={mosque.code.toString()}>
                      #{mosque.code} - {mosque.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Basic Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" placeholder="e.g., 10% Off First Order" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="merchant">Merchant *</Label>
                <Input id="merchant" placeholder="Your business name" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" placeholder="+1 (555) 000-0000" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="coupons@yourbusiness.com" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" placeholder="https://www.yourbusiness.com" onChange={handleInputChange} />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Redemption Limits</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="redeemLimit">Total Redeem Limit</Label>
                <Input id="redeemLimit" type="number" placeholder="e.g., 500" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userRedeemLimit">User Redeem Limit</Label>
                <Input id="userRedeemLimit" type="number" placeholder="e.g., 1" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userMonthlyLimit">User Monthly Redeem Limit</Label>
                <Input id="userMonthlyLimit" type="number" placeholder="e.g., 2" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userWeeklyLimit">User Weekly Redeem Limit</Label>
                <Input id="userWeeklyLimit" type="number" placeholder="e.g., 1" onChange={handleInputChange} />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Discount Details</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discountAmount">Discount Amount (or)</Label>
                <Input id="discountAmount" placeholder="e.g., $5 off, Free Item" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountPercentage">Discount Percentage</Label>
                <Input id="discountPercentage" placeholder="e.g., 10%, 20%" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="couponCode">Coupon/Voucher Code</Label>
                <Input id="couponCode" placeholder="e.g., SAVE10" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="redeemCode">Redeem Code</Label>
                <Input id="redeemCode" placeholder="e.g., RD001" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prefix">Prefix</Label>
                <Input id="prefix" placeholder="e.g., HD" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextNo">Next No.</Label>
                <Input id="nextNo" placeholder="e.g., 001" onChange={handleInputChange} />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Validity Period</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input id="startDate" type="date" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" type="date" onChange={handleInputChange} />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Description & Display</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Full description of the offer..."
                  rows={3}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thumbnailDescription">Thumbnail Description</Label>
                <Input
                  id="thumbnailDescription"
                  placeholder="Short text for thumbnail display"
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="popUpText">Pop Up Text</Label>
                <Textarea
                  id="popUpText"
                  placeholder="Text to show in pop-up..."
                  rows={2}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Image (Recommended: 320px width)</h3>
            <div className="grid grid-cols-3 gap-2">
              {uploadedImages.map((img, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={img || "/placeholder.svg"}
                    alt={`Upload ${idx + 1}`}
                    className="h-24 w-full object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => removeImage(idx)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" className="h-24 bg-transparent" onClick={handleImageUpload}>
                <Plus className="h-6 w-6" />
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Location</h3>
            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                placeholder="Full address where coupon can be redeemed"
                onChange={handleInputChange}
              />
            </div>
          </div>
        </>
      )
    }

    if (type === "nonprofit") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name *</Label>
            <Input id="orgName" required placeholder="Enter organization name" onChange={handleInputChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Input id="address" required placeholder="Street address" onChange={handleInputChange} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="contact@nonprofit.org"
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input id="phone" type="tel" required placeholder="+1 (555) 000-0000" onChange={handleInputChange} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" type="url" placeholder="https://yournonprofit.org" onChange={handleInputChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="socialMedia">Social Media Links</Label>
            <Textarea
              id="socialMedia"
              placeholder="Facebook: https://facebook.com/yourorg&#10;Instagram: @yourorg&#10;Twitter: @yourorg"
              rows={3}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="donateLink">Donate Link</Label>
            <Input
              id="donateLink"
              type="url"
              placeholder="https://donate.yournonprofit.org"
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="about">About Organization *</Label>
            <Textarea
              id="about"
              required
              placeholder="Tell us about your organization's mission and impact..."
              rows={4}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo">Organization Logo (PNG) *</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Click or drag to upload logo</p>
              <p className="text-xs text-muted-foreground mt-1">PNG format recommended</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="images">Organization Images (PNG or JPG)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Click or drag to upload images</p>
              <p className="text-xs text-muted-foreground mt-1">Multiple images showing your organization's work</p>
            </div>
          </div>
        </div>
      )
    }

    return null
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
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{info.title}</h1>
              <p className="text-sm text-muted-foreground">${info.price}/month</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {step > 1 ? <Check className="h-4 w-4" /> : "1"}
            </div>
            <div className={`h-1 w-16 ${step >= 2 ? "bg-primary" : "bg-secondary"}`} />
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {step > 2 ? <Check className="h-4 w-4" /> : "2"}
            </div>
            <div className={`h-1 w-16 ${step >= 3 ? "bg-primary" : "bg-secondary"}`} />
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 3 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {step > 3 ? <Check className="h-4 w-4" /> : "3"}
            </div>
          </div>
        </div>

        {/* Step 1: Details */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Enter Details</CardTitle>
              <CardDescription>{info.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderDetailsForm()}
              <Button onClick={() => setStep(2)} className="w-full">
                Continue to Payment
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Payment */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
              <CardDescription>Complete your subscription with a secure payment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-secondary">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground">{info.title}</span>
                  <span className="font-semibold">${info.price}/month</span>
                </div>
                {(type === "business" || type === "coupon") &&
                  affiliatedMosqueCode &&
                  affiliatedMosqueCode !== "none" && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Mosque Kickback (10%)</span>
                      <span className="text-primary">$1 to Mosque #{affiliatedMosqueCode}</span>
                    </div>
                  )}
                <Separator className="my-2" />
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg">${info.price}/month</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input id="cardNumber" placeholder="4242 4242 4242 4242" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input id="expiry" placeholder="MM/YY" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvc">CVC</Label>
                    <Input id="cvc" placeholder="123" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nameOnCard">Name on Card</Label>
                  <Input id="nameOnCard" placeholder="Full name" />
                </div>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={isProcessing} className="flex-1">
                  {isProcessing ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay ${info.price}/month
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                This is a simulated payment for demonstration purposes.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 mx-auto mb-4">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Subscription Active!</h2>
              <p className="text-muted-foreground mb-4">
                Your {type} subscription has been successfully activated.
                {type === "mosque" && (
                  <span className="block mt-2 text-primary font-semibold">
                    Your mosque code is #{nextMosqueCode}. Share it with local businesses!
                  </span>
                )}
                {(type === "business" || type === "coupon") &&
                  affiliatedMosqueCode &&
                  affiliatedMosqueCode !== "none" && (
                    <span className="block mt-2 text-primary">
                      10% of your fee will support Mosque #{affiliatedMosqueCode}
                    </span>
                  )}
              </p>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">📋 Verification in Progress</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your {type} will be reviewed and added to the Amanah app within 1-2 business days after verification
                  by our staff team.
                </p>
              </div>
              <Button asChild>
                <Link href="/member">Return to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
