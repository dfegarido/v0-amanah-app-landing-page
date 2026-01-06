"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Search, Heart, MapPin, Calendar, TrendingUp, Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { authenticatedGet, authenticatedPost, authenticatedDelete } from "@/lib/api-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RedeemCouponDialog } from "@/components/redeem-coupon-dialog"

export default function CouponsPage() {
  const router = useRouter()

  // Redirect to homepage - this page is disabled
  useEffect(() => {
    router.push("/")
  }, [])

  // Return null while redirecting
  return null

  // Fetch coupons
  useEffect(() => {
    fetchCoupons()
  }, [searchTerm, sortBy])

  // Fetch saved coupons if user is logged in
  useEffect(() => {
    if (user) {
      fetchSavedCoupons()
    }
  }, [user])

  const fetchCoupons = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        sort: sortBy,
        limit: '20',
        offset: '0'
      })
      
      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await fetch(`/api/coupons?${params}`)
      const result = await response.json()

      if (result.success) {
        setCoupons(result.data.coupons || [])
      }
    } catch (error) {
      console.error('Error fetching coupons:', error)
      toast({
        title: "Error",
        description: "Failed to load coupons",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchSavedCoupons = async () => {
    try {
      const response: any = await authenticatedGet('/api/user/saved-coupons')
      if (response.success && response.data) {
        const ids = new Set(response.data.savedCoupons?.map((sc: any) => sc.coupon.id) || [])
        setSavedCouponIds(ids)
      }
    } catch (error) {
      console.error('Error fetching saved coupons:', error)
    }
  }

  const handleSaveCoupon = async (couponId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to save coupons",
        variant: "destructive"
      })
      return
    }

    try {
      const isSaved = savedCouponIds.has(couponId)
      
      if (isSaved) {
        await authenticatedDelete(`/api/coupons/${couponId}/save`)
        setSavedCouponIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(couponId)
          return newSet
        })
        toast({
          title: "Removed from favorites",
          description: "Coupon removed from your saved list"
        })
      } else {
        await authenticatedPost(`/api/coupons/${couponId}/save`, {})
        setSavedCouponIds(prev => new Set(prev).add(couponId))
        toast({
          title: "Saved!",
          description: "Coupon added to your favorites"
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save coupon",
        variant: "destructive"
      })
    }
  }

  const handleViewDetails = async (coupon: any) => {
    // Fetch full details with view count increment
    try {
      const response = await fetch(`/api/coupons/${coupon.id}`)
      const result = await response.json()
      
      if (result.success) {
        setSelectedCoupon(result.data.coupon)
      }
    } catch (error) {
      console.error('Error fetching coupon details:', error)
      setSelectedCoupon(coupon)
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <img src="/images/logo-20amanaah.png" alt="Amanah Logo" className="h-10 w-auto" />
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Halal Coupons</h1>
                <p className="text-sm text-muted-foreground">Save with Muslim businesses</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <Button variant="outline" asChild>
                    <Link href="/user/saved-coupons">
                      <Heart className="h-4 w-4 mr-2" />
                      Saved
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/user/redemptions">
                      My Redemptions
                    </Link>
                  </Button>
                </>
              ) : (
                <Button asChild>
                  <Link href="/auth/login">Login</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search coupons..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Newest First
                  </div>
                </SelectItem>
                <SelectItem value="ending_soon">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Ending Soon
                  </div>
                </SelectItem>
                <SelectItem value="popular">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Most Popular
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Coupons Grid */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
        ) : coupons.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No coupons found. Try adjusting your search.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {coupons.map((coupon) => {
              const daysRemaining = getDaysRemaining(coupon.end_date)
              const isSaved = savedCouponIds.has(coupon.id)
              
              return (
                <Card 
                  key={coupon.id} 
                  className="cursor-pointer transition-all hover:shadow-lg hover:border-primary"
                  onClick={() => handleViewDetails(coupon)}
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
                        onClick={(e) => handleSaveCoupon(coupon.id, e)}
                      >
                        <Heart 
                          className={`h-5 w-5 ${isSaved ? 'fill-red-500 text-red-500' : ''}`}
                        />
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

      {/* Coupon Details Dialog */}
      <Dialog open={!!selectedCoupon} onOpenChange={(open) => !open && setSelectedCoupon(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedCoupon && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedCoupon.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {selectedCoupon.photos?.[0] && (
                  <img 
                    src={selectedCoupon.photos[0]} 
                    alt={selectedCoupon.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                )}
                
                <div className="flex items-center gap-4">
                  <Badge className="bg-primary text-primary-foreground text-lg px-4 py-2">
                    {formatDiscount(selectedCoupon)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Expires: {new Date(selectedCoupon.end_date).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Discount Details</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {selectedCoupon.description}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Business Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Name:</strong> {selectedCoupon.merchant}</p>
                    {selectedCoupon.address && (
                      <p><strong>Address:</strong> {selectedCoupon.address}</p>
                    )}
                    {selectedCoupon.phone && (
                      <p><strong>Phone:</strong> {selectedCoupon.phone}</p>
                    )}
                    {selectedCoupon.email && (
                      <p><strong>Email:</strong> {selectedCoupon.email}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    className="flex-1" 
                    onClick={() => {
                      setShowRedeemDialog(true)
                    }}
                  >
                    Redeem Coupon
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSaveCoupon(selectedCoupon.id, e as any)
                    }}
                  >
                    <Heart className={`h-4 w-4 ${savedCouponIds.has(selectedCoupon.id) ? 'fill-red-500 text-red-500' : ''}`} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Redeem Dialog */}
      {selectedCoupon && (
        <RedeemCouponDialog
          coupon={selectedCoupon}
          open={showRedeemDialog}
          onOpenChange={setShowRedeemDialog}
        />
      )}
    </div>
  )
}

