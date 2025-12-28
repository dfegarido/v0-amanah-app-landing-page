"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Elements } from "@stripe/react-stripe-js"
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js"
import {
  Heart,
  Building2,
  DollarSign,
  Loader2,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"
import { authenticatedPost, authenticatedGet } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import PaymentForm from "@/components/payment-form"

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Mosque {
  id: string
  name: string
  mosque_code: number
}

export default function DonatePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [amount, setAmount] = useState<string>("")
  const [customAmount, setCustomAmount] = useState<string>("")
  const [donorName, setDonorName] = useState<string>(user?.name || "")
  const [donorEmail, setDonorEmail] = useState<string>(user?.email || "")
  const [mosqueId, setMosqueId] = useState<string>("")
  const [mosqueCode, setMosqueCode] = useState<string>("")
  const [campaignName, setCampaignName] = useState<string>("")
  const [purpose, setPurpose] = useState<string>("")
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [mosques, setMosques] = useState<Mosque[]>([])
  const [loadingMosques, setLoadingMosques] = useState(true)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [donationId, setDonationId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, authLoading, router])

  // Load mosques for selection
  useEffect(() => {
    const loadMosques = async () => {
      try {
        const response: any = await authenticatedGet("/api/directory/mosques")
        if (response.success && response.data) {
          // The API returns { mosques: [], pagination: {} }
          const mosquesData = response.data.mosques || []
          // API already filters by status='active', but we filter again to be safe
          setMosques(mosquesData.filter((m: any) => m.status === "active"))
        }
      } catch (error) {
        console.error("Error loading mosques:", error)
      } finally {
        setLoadingMosques(false)
      }
    }

    if (user) {
      loadMosques()
    }
  }, [user])

  // Predefined amounts
  const predefinedAmounts = [10, 25, 50, 100, 250, 500]

  const handleAmountSelect = (selectedAmount: number) => {
    setAmount(selectedAmount.toString())
    setCustomAmount("")
  }

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value)
    setAmount("")
  }

  const getFinalAmount = (): number => {
    if (customAmount) {
      return parseFloat(customAmount) || 0
    }
    return parseFloat(amount) || 0
  }

  const handleCreateDonation = async () => {
    const finalAmount = getFinalAmount()

    if (finalAmount < 0.5) {
      toast({
        title: "Invalid Amount",
        description: "Minimum donation amount is $0.50",
        variant: "destructive",
      })
      return
    }

    if (!isAnonymous && !donorEmail) {
      toast({
        title: "Email Required",
        description: "Please provide your email address",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      const response: any = await authenticatedPost("/api/donations", {
        amount: finalAmount,
        currency: "USD",
        donorName: isAnonymous ? undefined : donorName,
        donorEmail: isAnonymous ? undefined : donorEmail,
        mosqueId: mosqueId || undefined,
        mosqueCode: mosqueCode ? parseInt(mosqueCode) : undefined,
        campaignName: campaignName || undefined,
        purpose: purpose || undefined,
        paymentProvider: "stripe",
      })

      if (response.success && response.data) {
        setClientSecret(response.data.paymentIntent.clientSecret)
        setDonationId(response.data.donation.id)
        toast({
          title: "Donation Intent Created",
          description: "Please complete your payment",
        })
      } else {
        throw new Error(response.error || "Failed to create donation")
      }
    } catch (error: any) {
      console.error("Error creating donation:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create donation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePaymentSuccess = () => {
    setIsComplete(true)
    toast({
      title: "Donation Successful!",
      description: "Thank you for your generous donation.",
    })

    // Redirect to donation history after 3 seconds
    setTimeout(() => {
      router.push("/member/donations")
    }, 3000)
  }

  const handlePaymentCancel = () => {
    setClientSecret(null)
    setDonationId(null)
    toast({
      title: "Payment Cancelled",
      description: "Your donation was not processed.",
    })
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Success screen
  if (isComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <h2 className="text-2xl font-bold">Thank You!</h2>
              <p className="text-muted-foreground">
                Your donation has been processed successfully. A receipt has been sent to your email.
              </p>
              <Button onClick={() => router.push("/member/donations")}>
                View Donation History
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Payment form (Stripe Elements)
  if (clientSecret && donationId) {
    const options: StripeElementsOptions = {
      clientSecret,
      appearance: {
        theme: "stripe" as const,
      },
      // PaymentElement will automatically show all enabled payment methods from the PaymentIntent
      // This includes: card, Cash App Pay, Amazon Pay, PayPal, bank transfers, etc.
    }

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Button
            variant="ghost"
            onClick={handlePaymentCancel}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Complete Your Donation</CardTitle>
              <CardDescription>
                Amount: ${getFinalAmount().toFixed(2)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={options}>
                <PaymentForm
                  clientSecret={clientSecret}
                  onSuccess={handlePaymentSuccess}
                  onCancel={handlePaymentCancel}
                />
              </Elements>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Donation form
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => router.push("/member")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Heart className="h-6 w-6 text-primary" />
              <CardTitle>Make a Donation</CardTitle>
            </div>
            <CardDescription>
              Support your community and make a difference
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Amount Selection */}
            <div className="space-y-4">
              <Label>Donation Amount *</Label>
              <div className="grid grid-cols-3 gap-2">
                {predefinedAmounts.map((amt) => (
                  <Button
                    key={amt}
                    type="button"
                    variant={amount === amt.toString() ? "default" : "outline"}
                    onClick={() => handleAmountSelect(amt)}
                  >
                    ${amt}
                  </Button>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="customAmount">Or enter custom amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="customAmount"
                    type="number"
                    step="0.01"
                    min="0.5"
                    placeholder="0.00"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Minimum donation: $0.50
                </p>
              </div>
            </div>

            {/* Mosque Selection */}
            <div className="space-y-2">
              <Label htmlFor="mosque">Donate to Mosque (Optional)</Label>
              {loadingMosques ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Select
                  value={mosqueId || "general"}
                  onValueChange={(value) => {
                    if (value === "general") {
                      setMosqueId("")
                      setMosqueCode("")
                    } else {
                      setMosqueId(value)
                      const selected = mosques.find((m) => m.id === value)
                      if (selected) {
                        setMosqueCode(selected.mosque_code.toString())
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a mosque" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Donation</SelectItem>
                    {mosques.map((mosque) => (
                      <SelectItem key={mosque.id} value={mosque.id}>
                        {mosque.name} (Code: {mosque.mosque_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Campaign Name */}
            <div className="space-y-2">
              <Label htmlFor="campaign">Campaign Name (Optional)</Label>
              <Input
                id="campaign"
                placeholder="e.g., Building Fund, Emergency Relief"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose (Optional)</Label>
              <Textarea
                id="purpose"
                placeholder="How would you like your donation to be used?"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={3}
              />
            </div>

            {/* Donor Information */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="anonymous" className="cursor-pointer">
                  Make this donation anonymous
                </Label>
              </div>

              {!isAnonymous && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="donorName">Your Name</Label>
                    <Input
                      id="donorName"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      placeholder="Enter your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="donorEmail">Email Address *</Label>
                    <Input
                      id="donorEmail"
                      type="email"
                      value={donorEmail}
                      onChange={(e) => setDonorEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </>
              )}
            </div>

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total Donation:</span>
                <span>${getFinalAmount().toFixed(2)}</span>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleCreateDonation}
              disabled={isProcessing || getFinalAmount() < 0.5}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Heart className="h-4 w-4 mr-2" />
                  Continue to Payment
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Your payment information is securely processed by Stripe. We never store your card details.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
