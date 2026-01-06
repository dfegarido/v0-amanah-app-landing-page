"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Heart, MapPin, Calendar, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { authenticatedGet, authenticatedDelete } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { RedeemCouponDialog } from "@/components/redeem-coupon-dialog"

export default function SavedCouponsPage() {
  const router = useRouter()

  // Redirect to homepage - this page is disabled
  useEffect(() => {
    router.push("/")
  }, [])

  // Return null while redirecting
  return null

  useEffect(() => {
    if (user) {
      fetchSavedCoupons()
    }
  }, [user])

  const fetchSavedCoupons = async () => {
    try {
      setLoading(true)
      const response: any = await authenticatedGet('/api/user/saved-coupons')
      
      if (response.success) {
        setSavedCoupons(response.data.savedCoupons || [])
      }
    } catch (error) {
      console.error('Error fetching saved coupons:', error)
      toast({
        title: "Error",
        description: "Failed to load saved coupons",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (couponId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      await authenticatedDelete(`/api/coupons/${couponId}/save`)
      setSavedCoupons(prev => prev.filter(sc => sc.coupon.id !== couponId))
      toast({
        title: "Removed",
        description: "Coupon removed from saved list"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove coupon",
        variant: "destructive"
      })
    }
  }

  const formatDiscount = (coupon: any) => {
    if (coupon.discount_amount) {
      return `$${coupon.discount_amount} OFF`
    } else if (coupon.discount_percentage) {
      return `${coupon.discount_percentage}% OFF`
    }
    return "Special Discount"
  }

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate)
    const now = new Date()
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
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
              <h1 className="text-lg font-semibold text-foreground">Saved Coupons</h1>
              <p className="text-sm text-muted-foreground">Your favorite coupons</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-48 bg-muted rounded-md"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : savedCoupons.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-semibold mb-2">No saved coupons yet</p>
              <p className="text-muted-foreground mb-4">
                Start saving coupons you like to find them easily later
              </p>
              <Button asChild>
                <Link href="/coupons">Browse Coupons</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {savedCoupons.map(({ coupon, savedAt }) => {
              const daysRemaining = getDaysRemaining(coupon.end_date)
              
              return (
                <Card 
                  key={coupon.id}
                  className="cursor-pointer transition-all hover:shadow-lg hover:border-primary"
                  onClick={() => {
                    setSelectedCoupon(coupon)
                    setShowRedeemDialog(true)
                  }}
                >
                  <CardHeader className="p-0">
                    <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5 rounded-t-lg">
                      {coupon.photos?.[0] ? (
                        <img 
                          src={coupon.photos[0]} 
                          alt={coupon.title}
                          className="w-full h-full object-cover rounded-t-lg"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-4xl font-bold text-primary opacity-20">
                            {formatDiscount(coupon)}
                          </span>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 bg-background/80 hover:bg-background"
                        onClick={(e) => handleRemove(coupon.id, e)}
                      >
                        <Trash2 className="h-5 w-5 text-destructive" />
                      </Button>
                      <div className="absolute bottom-2 left-2">
                        <Badge className="bg-primary text-primary-foreground">
                          {formatDiscount(coupon)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <CardTitle className="text-lg mb-2 line-clamp-1">
                      {coupon.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 mb-3">
                      {coupon.description}
                    </CardDescription>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        <span className="line-clamp-1">{coupon.merchant || 'Local Business'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {daysRemaining > 0 ? `${daysRemaining} days left` : 'Expires today'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* Redeem Dialog */}
      {selectedCoupon && (
        <RedeemCouponDialog
          coupon={selectedCoupon}
          open={showRedeemDialog}
          onOpenChange={(open) => {
            setShowRedeemDialog(open)
            if (!open) setSelectedCoupon(null)
          }}
        />
      )}
    </div>
  )
}

