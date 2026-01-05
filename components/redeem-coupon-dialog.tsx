"use client"

import { useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Check, Copy, MapPin, Phone, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { authenticatedPost } from "@/lib/api-client"
import { useRouter } from "next/navigation"

interface RedeemCouponDialogProps {
  coupon: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RedeemCouponDialog({ coupon, open, onOpenChange }: RedeemCouponDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  const [redemption, setRedemption] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  const handleRedeem = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to redeem coupons",
        variant: "destructive"
      })
      router.push('/auth/login')
      return
    }

    try {
      setLoading(true)
      const response: any = await authenticatedPost(`/api/coupons/${coupon.id}/redeem`, {})
      
      if (response.success) {
        setRedemption(response.data.redemption)
        toast({
          title: "Success!",
          description: "Coupon redeemed. Show the code below to the business.",
        })
      } else {
        throw new Error(response.error || 'Failed to redeem coupon')
      }
    } catch (error: any) {
      console.error('Redeem error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to redeem coupon. You may have already used this coupon.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = () => {
    if (redemption?.code) {
      navigator.clipboard.writeText(redemption.code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
      toast({
        title: "Copied!",
        description: "Redemption code copied to clipboard"
      })
    }
  }

  const formatDiscount = () => {
    if (coupon.discount_amount) {
      return `$${coupon.discount_amount} OFF`
    } else if (coupon.discount_percentage) {
      return `${coupon.discount_percentage}% OFF`
    }
    return "Special Discount"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {redemption ? "Your Redemption Code" : "Redeem Coupon"}
          </DialogTitle>
        </DialogHeader>

        {!redemption ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="text-4xl font-bold text-primary">
                    {formatDiscount()}
                  </div>
                  <p className="text-lg font-semibold">{coupon.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {coupon.description}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <p className="text-sm font-medium">Where to use:</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{coupon.merchant}</span>
                </div>
                {coupon.address && (
                  <p className="pl-6">{coupon.address}</p>
                )}
                {coupon.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{coupon.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={handleRedeem}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Redeeming..." : "Redeem Now"}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <QRCodeSVG 
                  value={redemption.qrData} 
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>
            </div>

            {/* Redemption Code */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Redemption Code</p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="text-2xl font-bold font-mono bg-muted px-4 py-2 rounded">
                      {redemption.code}
                    </code>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={handleCopyCode}
                    >
                      {copiedCode ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Discount Info */}
            <div className="text-center space-y-2">
              <div className="text-xl font-semibold text-primary">
                {formatDiscount()}
              </div>
              <p className="text-sm text-muted-foreground">
                {redemption.coupon?.discountDetails}
              </p>
            </div>

            {/* Instructions */}
            <Card className="bg-primary/5 dark:bg-primary/10 border-primary/20">
              <CardContent className="pt-4">
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-foreground">How to use:</p>
                  <ol className="list-decimal list-inside space-y-1 text-foreground/80">
                    <li>Show this QR code to {coupon.merchant}</li>
                    <li>They will scan it or enter the code above</li>
                    <li>Enjoy your discount!</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Business Info */}
            <div className="text-sm space-y-1 pt-2 border-t">
              <p className="font-semibold">Redeem at:</p>
              <div className="text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  <span>{coupon.merchant}</span>
                </div>
                {coupon.address && (
                  <p className="pl-5">{coupon.address}</p>
                )}
                {coupon.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    <span>{coupon.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => router.push('/user/redemptions')}
            >
              View My Redemptions
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

