"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Building2, Store, Ticket, CreditCard, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"

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
}

export default function SubscribePage() {
  const params = useParams()
  const router = useRouter()
  const type = params.type as "mosque" | "business" | "coupon"

  const [step, setStep] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const info = subscriptionInfo[type]
  const Icon = info?.icon || Building2

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

  const handleSubmit = async () => {
    setIsProcessing(true)
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setStep(3)
    setIsProcessing(false)
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

      <main className="p-6 max-w-2xl mx-auto">
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
            <CardContent className="space-y-4">
              {type === "mosque" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Mosque Name</Label>
                    <Input id="name" placeholder="Enter mosque name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" placeholder="City, State" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Contact Phone</Label>
                    <Input id="phone" placeholder="+1 (555) 000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="leader">Contact Name (Leader)</Label>
                    <Input id="leader" placeholder="Imam name or administrator" />
                  </div>
                </>
              )}

              {type === "business" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Business Name</Label>
                    <Input id="name" placeholder="Enter business name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input id="category" placeholder="e.g., Restaurant, Retail, Services" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" placeholder="Address" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Describe your business..." />
                  </div>
                </>
              )}

              {type === "coupon" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Coupon Name</Label>
                    <Input id="name" placeholder="e.g., 10% Off First Order" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business">Business Name</Label>
                    <Input id="business" placeholder="Your business name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="offer">Offer Details</Label>
                    <Textarea id="offer" placeholder="Describe the offer..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" placeholder="Where can this be redeemed?" />
                  </div>
                </>
              )}

              <Button className="w-full" onClick={() => setStep(2)}>
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
              <CardDescription>Set up your monthly subscription</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-secondary/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{info.title}</span>
                  <span className="font-semibold">${info.price}/month</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="card">Card Number</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="card" placeholder="4242 4242 4242 4242" className="pl-10" />
                  </div>
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
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  This is a simulated payment. In production, this would connect to Stripe for secure payment
                  processing.
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button className="flex-1" onClick={handleSubmit} disabled={isProcessing}>
                  {isProcessing ? "Processing..." : `Subscribe for $${info.price}/mo`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <Card>
            <CardContent className="pt-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 mx-auto mb-4">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Subscription Active!</h2>
              <p className="text-muted-foreground mb-6">
                Your {type} listing has been created. You can now upload documents and manage your listing.
              </p>
              <Button asChild>
                <Link href="/member">Go to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
