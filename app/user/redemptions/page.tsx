"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Calendar, MapPin, Check, Clock, XCircle, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { authenticatedGet } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QRCodeSVG } from "qrcode.react"

export default function UserRedemptionsPage() {
  const router = useRouter()

  // Redirect to homepage - this page is disabled
  useEffect(() => {
    router.push("/")
  }, [])

  // Return null while redirecting
  return null

  useEffect(() => {
    if (user) {
      fetchRedemptions()
    }
  }, [selectedStatus, user])

  const fetchRedemptions = async () => {
    try {
      setLoading(true)
      const response: any = await authenticatedGet(
        `/api/user/redemptions?status=${selectedStatus}&limit=50`
      )
      
      if (response.success) {
        setRedemptions(response.data.redemptions || [])
      }
    } catch (error) {
      console.error('Error fetching redemptions:', error)
      toast({
        title: "Error",
        description: "Failed to load redemption history",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      completed: "bg-green-500/10 text-green-500 border-green-500/20",
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      expired: "bg-red-500/10 text-red-500 border-red-500/20",
      cancelled: "bg-gray-500/10 text-gray-500 border-gray-500/20"
    }
    
    return (
      <Badge className={variants[status] || ""}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const formatDiscount = (redemption: any) => {
    const coupon = redemption.coupon
    if (!coupon) return "Discount"
    
    if (coupon.discount_amount) {
      return `$${coupon.discount_amount} OFF`
    } else if (coupon.discount_percentage) {
      return `${coupon.discount_percentage}% OFF`
    }
    return "Special Discount"
  }

  // Show loading while checking auth
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/coupons">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">My Redemptions</h1>
              <p className="text-sm text-muted-foreground">View your coupon redemption history</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs defaultValue="all" onValueChange={setSelectedStatus}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="completed">Used</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedStatus} className="space-y-4 mt-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-20 bg-muted rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : redemptions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No redemptions found</p>
                  <Button asChild className="mt-4">
                    <Link href="/coupons">Browse Coupons</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {redemptions.map((redemption) => (
                  <Card 
                    key={redemption.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedRedemption(redemption)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(redemption.status)}
                            <h3 className="font-semibold text-lg">
                              {redemption.coupon?.title || 'Coupon'}
                            </h3>
                          </div>
                          
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3" />
                              <span>{redemption.coupon?.merchant || 'Business'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              <span>
                                Redeemed on {new Date(redemption.redeemed_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge className="bg-primary/10 text-primary">
                              {formatDiscount(redemption)}
                            </Badge>
                            {getStatusBadge(redemption.status)}
                          </div>

                          {redemption.status === 'pending' && (
                            <p className="text-sm text-yellow-600 dark:text-yellow-400">
                              ⏳ Waiting for business to validate
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-center gap-2">
                          <QrCode className="h-8 w-8 text-muted-foreground" />
                          <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                            {redemption.redemption_code}
                          </code>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Redemption Details Dialog */}
      <Dialog open={!!selectedRedemption} onOpenChange={(open) => !open && setSelectedRedemption(null)}>
        <DialogContent className="max-w-md">
          {selectedRedemption && (
            <>
              <DialogHeader>
                <DialogTitle>Redemption Details</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <QRCodeSVG 
                      value={JSON.stringify({
                        redemptionId: selectedRedemption.id,
                        code: selectedRedemption.redemption_code
                      })}
                      size={150}
                      level="H"
                    />
                  </div>
                </div>

                {/* Code */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Redemption Code</p>
                  <code className="text-xl font-bold font-mono bg-muted px-4 py-2 rounded">
                    {selectedRedemption.redemption_code}
                  </code>
                </div>

                {/* Status */}
                <div className="flex items-center justify-center gap-2">
                  {getStatusIcon(selectedRedemption.status)}
                  {getStatusBadge(selectedRedemption.status)}
                </div>

                {/* Coupon Info */}
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="font-semibold">Coupon:</p>
                    <p className="text-muted-foreground">{selectedRedemption.coupon?.title}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Discount:</p>
                    <p className="text-muted-foreground">{formatDiscount(selectedRedemption)}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Business:</p>
                    <p className="text-muted-foreground">{selectedRedemption.coupon?.merchant}</p>
                  </div>
                  <div>
                    <p className="font-semibold">Redeemed:</p>
                    <p className="text-muted-foreground">
                      {new Date(selectedRedemption.redeemed_at).toLocaleString()}
                    </p>
                  </div>
                  {selectedRedemption.validated_at && (
                    <div>
                      <p className="font-semibold">Used:</p>
                      <p className="text-muted-foreground">
                        {new Date(selectedRedemption.validated_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

