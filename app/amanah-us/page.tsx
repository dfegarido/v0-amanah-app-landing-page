'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Heart, 
  TrendingUp, 
  Users, 
  Building2, 
  GraduationCap,
  CheckCircle2,
  ArrowRight,
  DollarSign,
  Target,
  Shield
} from 'lucide-react'

interface ImpactMetrics {
  totalDonated: {
    monthly: number
    annually: number
  }
  mosquesSupported: number
  nonprofitsFunded: number
  schoolsHelped: number
  totalSubscriptions: number
  breakdown: {
    amanahUsEducation: number
    mosqueSupport: number
    nonprofitSupport: number
  }
}

export default function AmanahUsPage() {
  const [metrics, setMetrics] = useState<ImpactMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/amanah-us/impact')
      const data = await response.json()
      
      if (data.success) {
        setMetrics(data.data)
      } else {
        setError('Failed to load impact metrics')
      }
    } catch (err) {
      console.error('Error fetching metrics:', err)
      setError('Failed to load impact metrics')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-secondary/30 px-4 py-20 md:py-32">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>
        
        <div className="container relative mx-auto">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-6 text-5xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
              Welcome to <span className="text-amber-500">Amanah US</span>
            </h1>
            
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
              A nonprofit initiative dedicated to funding mosques, nonprofits, and Islamic schools 
              through transparent giving.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-8"
                onClick={() => window.location.href = '/'}
              >
                Back to Amanah Platform
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* What Is Amanah US Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl mb-4">
              What Is Amanah US?
            </h2>
            <div className="w-20 h-1 bg-amber-500 mx-auto mb-6"></div>
          </div>

          <Card className="border-border shadow-lg">
            <CardContent className="p-8 md:p-12">
              <div className="flex items-start gap-4 mb-6">
                <div className="rounded-full bg-amber-100 p-3">
                  <Heart className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    The Nonprofit Arm of Amanah
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    <strong>Amanah US</strong> is the nonprofit organization that receives <strong>15% of all proceeds</strong> from 
                    the Amanah platform. These funds are strategically distributed to support mosques, 
                    nonprofits, and Islamic schools across America.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Built on the foundation of <em>amanah</em> (trust) and transparency, we ensure every 
                    dollar is tracked, verified, and directed toward strengthening the Muslim community.
                  </p>
                  <div className="bg-secondary/50 border-l-4 border-amber-500 p-4 rounded">
                    <p className="text-foreground italic">
                      "Our mission is to create sustainable support systems for Islamic institutions, 
                      ensuring they thrive for generations to come."
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Impact Cycle Visual */}
      <section className="bg-black py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center mb-12">
            <h2 className="text-3xl font-bold text-white md:text-4xl mb-4">
              The Amanah Cycle
            </h2>
            <div className="w-20 h-1 bg-amber-500 mx-auto mb-6"></div>
            <p className="text-slate-300 text-lg">
              Every transaction on the platform creates a ripple of positive impact
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
            <div className="relative aspect-square w-full max-w-2xl mx-auto">
              <Image
                src="/amanah-us/Generated image.png"
                alt="Amanah Impact Cycle showing 10% to mosques and 15% to Islamic schools"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Impact Metrics Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl mb-4">
              Real Impact, Real Numbers
            </h2>
            <div className="w-20 h-1 bg-amber-500 mx-auto mb-6"></div>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              All metrics are pulled directly from the platform. Every number represents real 
              support to the Muslim community.
            </p>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="border-border">
                  <CardContent className="p-6">
                    <div className="animate-pulse">
                      <div className="h-12 w-12 bg-slate-200 rounded-full mb-4"></div>
                      <div className="h-8 bg-slate-200 rounded mb-2"></div>
                      <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6 text-center">
                <p className="text-red-600">{error}</p>
              </CardContent>
            </Card>
          ) : metrics ? (
            <>
              {/* Main Impact Cards */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                {/* Total Donated */}
                <Card className="border-amber-200/50 bg-amber-50/30 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="rounded-full bg-amber-500/90 p-3">
                        <DollarSign className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-amber-600 mb-1">
                      {formatCurrency(metrics.totalDonated.monthly)}
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">
                      Monthly Donations
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {formatCurrency(metrics.totalDonated.annually)}/year
                    </div>
                  </CardContent>
                </Card>

                {/* Mosques Supported */}
                <Card className="border-blue-200/50 bg-blue-50/30 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="rounded-full bg-blue-500/90 p-3">
                        <Building2 className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {formatNumber(metrics.mosquesSupported)}
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">
                      Mosques Supported
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      10% kickback + donations
                    </div>
                  </CardContent>
                </Card>

                {/* Nonprofits Funded */}
                <Card className="border-green-200/50 bg-green-50/30 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="rounded-full bg-green-500/90 p-3">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      {formatNumber(metrics.nonprofitsFunded)}
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">
                      Nonprofits Funded
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Community donations
                    </div>
                  </CardContent>
                </Card>

                {/* Schools Helped */}
                <Card className="border-purple-200/50 bg-purple-50/30 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="rounded-full bg-purple-500/90 p-3">
                        <GraduationCap className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-purple-600 mb-1">
                      {formatNumber(metrics.schoolsHelped)}
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">
                      Islamic Schools
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      Education programs
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Breakdown Card */}
              <Card className="border-border/50 bg-card/50 shadow-md">
                <CardContent className="p-8">
                  <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                    <Target className="h-5 w-5 text-amber-500" />
                    Donation Breakdown (Monthly)
                  </h3>
                  
                  <div className="space-y-6">
                    {/* Amanah US Education */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-foreground flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-purple-500" />
                          Islamic Education (15%)
                        </span>
                        <span className="text-lg font-bold text-purple-600">
                          {formatCurrency(metrics.breakdown.amanahUsEducation)}
                        </span>
                      </div>
                      <div className="h-3 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                          style={{ 
                            width: `${(metrics.breakdown.amanahUsEducation / metrics.totalDonated.monthly * 100)}%` 
                          }}
                        />
                      </div>
                    </div>

                    {/* Mosque Support */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-500" />
                          Mosque Support (10% + Donations)
                        </span>
                        <span className="text-lg font-bold text-blue-600">
                          {formatCurrency(metrics.breakdown.mosqueSupport)}
                        </span>
                      </div>
                      <div className="h-3 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                          style={{ 
                            width: `${(metrics.breakdown.mosqueSupport / metrics.totalDonated.monthly * 100)}%` 
                          }}
                        />
                      </div>
                    </div>

                    {/* Nonprofit Support */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Users className="h-4 w-4 text-green-500" />
                          Community Nonprofits
                        </span>
                        <span className="text-lg font-bold text-green-600">
                          {formatCurrency(metrics.breakdown.nonprofitSupport)}
                        </span>
                      </div>
                      <div className="h-3 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                          style={{ 
                            width: `${(metrics.breakdown.nonprofitSupport / metrics.totalDonated.monthly * 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-foreground">
                      Total Monthly Impact
                    </span>
                    <span className="text-2xl font-bold text-amber-600">
                      {formatCurrency(metrics.totalDonated.monthly)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Total Subscriptions Badge */}
              <div className="mt-8 text-center">
                <Badge variant="outline" className="text-base py-2 px-4 border-slate-300">
                  <TrendingUp className="h-4 w-4 mr-2 inline" />
                  {formatNumber(metrics.totalSubscriptions)} Active Subscriptions
                </Badge>
              </div>
            </>
          ) : null}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-secondary/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground md:text-4xl mb-4">
                How It Works
              </h2>
              <div className="w-20 h-1 bg-amber-500 mx-auto mb-6"></div>
              <p className="text-muted-foreground text-lg">
                Simple, transparent, and impactful
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {/* Step 1 */}
              <Card className="border-border relative">
                <div className="absolute -top-4 left-6">
                  <div className="rounded-full bg-amber-500 w-12 h-12 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    1
                  </div>
                </div>
                <CardContent className="pt-12 p-6">
                  <CheckCircle2 className="h-10 w-10 text-amber-500 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Users Use the Platform
                  </h3>
                  <p className="text-muted-foreground">
                    Businesses, coupons, and community members subscribe to the Amanah platform.
                  </p>
                </CardContent>
              </Card>

              {/* Step 2 */}
              <Card className="border-border relative">
                <div className="absolute -top-4 left-6">
                  <div className="rounded-full bg-amber-500 w-12 h-12 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    2
                  </div>
                </div>
                <CardContent className="pt-12 p-6">
                  <Heart className="h-10 w-10 text-amber-500 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    15% Allocated to Amanah US
                  </h3>
                  <p className="text-muted-foreground">
                    A portion of all proceeds is automatically set aside for the nonprofit mission.
                  </p>
                </CardContent>
              </Card>

              {/* Step 3 */}
              <Card className="border-border relative">
                <div className="absolute -top-4 left-6">
                  <div className="rounded-full bg-amber-500 w-12 h-12 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    3
                  </div>
                </div>
                <CardContent className="pt-12 p-6">
                  <Building2 className="h-10 w-10 text-amber-500 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Funds Distributed
                  </h3>
                  <p className="text-muted-foreground">
                    Verified mosques, nonprofits, and Islamic schools receive the support they need.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Transparency & Trust Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl mb-4">
              Built on Trust & Transparency
            </h2>
            <div className="w-20 h-1 bg-amber-500 mx-auto mb-6"></div>
          </div>

          <Card className="border-border/50 bg-card/50 shadow-md">
            <CardContent className="p-8 md:p-12">
              <div className="grid gap-8 md:grid-cols-3">
                <div className="text-center">
                  <div className="inline-flex rounded-full bg-blue-100/70 p-4 mb-4">
                    <Shield className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Real-Time Data
                  </h3>
                  <p className="text-muted-foreground">
                    All numbers come from actual platform data, updated in real-time.
                  </p>
                </div>

                <div className="text-center">
                  <div className="inline-flex rounded-full bg-green-100/70 p-4 mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Verified Recipients
                  </h3>
                  <p className="text-muted-foreground">
                    Every mosque, nonprofit, and school is verified before receiving funds.
                  </p>
                </div>

                <div className="text-center">
                  <div className="inline-flex rounded-full bg-purple-100/70 p-4 mb-4">
                    <Target className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Accountable Distribution
                  </h3>
                  <p className="text-muted-foreground">
                    Transparent allocation ensures every dollar makes maximum impact.
                  </p>
                </div>
              </div>

              <Separator className="my-8" />

              <div className="bg-amber-50/30 border-l-4 border-amber-500/60 p-6 rounded">
                <p className="text-foreground leading-relaxed">
                  <strong className="text-amber-600">Amanah US</strong> is a separate approved nonprofit
                  organization (EIN 41-3030153) dedicated to the mission of strengthening the Muslim
                  community through responsible, transparent giving. We believe in accountability at every step.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Programs Section */}
      <section className="bg-gradient-to-b from-background to-secondary/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl mb-6">
              Our Programs
            </h2>
            
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
              Amanah US supports the Muslim community through various programs, 
              featuring expanded initiatives, grant applications, and deeper integration with the main platform.
            </p>

            <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto text-left">
              <Card className="border-border shadow-sm">
                <CardContent className="p-6">
                  <GraduationCap className="h-8 w-8 text-amber-500 mb-3" />
                  <h3 className="font-semibold text-foreground mb-2">
                    Educational Programs
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Direct scholarships, curriculum development, and teacher training for Islamic schools.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                <CardContent className="p-6">
                  <Building2 className="h-8 w-8 text-amber-500 mb-3" />
                  <h3 className="font-semibold text-foreground mb-2">
                    Mosque Infrastructure
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Facility improvements, technology upgrades, and operational support for mosques.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                <CardContent className="p-6">
                  <Users className="h-8 w-8 text-amber-500 mb-3" />
                  <h3 className="font-semibold text-foreground mb-2">
                    Community Grants
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Funding for nonprofits serving the Muslim community with proven impact.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                <CardContent className="p-6">
                  <TrendingUp className="h-8 w-8 text-amber-500 mb-3" />
                  <h3 className="font-semibold text-foreground mb-2">
                    Platform Integration
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Seamless connection between the Amanah app and Amanah US nonprofit initiatives.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-foreground md:text-4xl mb-6">
            Be Part of the Impact
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Every subscription on the Amanah platform contributes to building a stronger, 
            more connected Muslim community.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold"
              onClick={() => window.location.href = '/'}
            >
              Back to Amanah Platform
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          <p className="text-muted-foreground text-sm mt-8">
            Questions? Email us at <a href="mailto:info@amanahus.org" className="text-amber-500 hover:text-amber-600 font-medium">info@amanahus.org</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary/30 border-t py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Amanah US. Approved nonprofit organization. EIN 41-3030153.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            This page is hosted on the Amanah platform until AmanahUs.org launches.
          </p>
        </div>
      </footer>
    </div>
  )
}
