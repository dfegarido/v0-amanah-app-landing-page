"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Save, Mail, Bell, Shield, Home, DollarSign, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { authenticatedGet, authenticatedPut, authenticatedPost } from "@/lib/api-client"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

interface AdminSettings {
  platform_name: string
  support_email: string
  contact_phone: string
  website_url: string
  pricing_mosque: number
  pricing_business: number
  pricing_coupon: number
  pricing_nonprofit: number
  mosque_kickback_percentage: number
  education_fund_percentage: number
  notification_email: string
  notify_new_subscription: boolean
  notify_payment_failed: boolean
  notify_subscription_cancelled: boolean
  notify_push_requests: boolean
  notify_member_updates: boolean
}

export default function AdminSettingsPage() {
  const { toast } = useToast()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [settings, setSettings] = useState<AdminSettings>({
    platform_name: 'Amanah',
    support_email: 'support@amanah.app',
    contact_phone: '+1 (555) 123-4567',
    website_url: 'https://amanah.app',
    pricing_mosque: 100,
    pricing_business: 10,
    pricing_coupon: 10,
    pricing_nonprofit: 50,
    mosque_kickback_percentage: 10,
    education_fund_percentage: 15,
    notification_email: 'josh@mobileappcity.com',
    notify_new_subscription: true,
    notify_payment_failed: true,
    notify_subscription_cancelled: true,
    notify_push_requests: true,
    notify_member_updates: true
  })

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!user || user.role !== 'admin') {
        console.log('Not loading settings - user is not admin:', { user, role: user?.role })
        setIsLoading(false)
        return
      }
      
      try {
        console.log('Loading admin settings for user:', user.email)
        const response = await authenticatedGet('/api/admin/settings') as any
        console.log('Settings API response:', response)
        
        if (response.success && response.data) {
          setSettings(response.data)
          console.log('Settings loaded successfully')
        }
      } catch (error: any) {
        console.error('Error loading settings:', error)
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        })
        toast({
          title: "Error",
          description: error.message || "Failed to load settings. Using defaults.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (!authLoading) {
      loadSettings()
    }
  }, [user, authLoading, toast])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await authenticatedPut('/api/admin/settings', settings) as any
      
      if (response.success) {
        toast({
          title: "Settings saved",
          description: "Your changes have been saved successfully.",
        })
      } else {
        throw new Error(response.error || 'Failed to save settings')
      }
    } catch (error: any) {
      console.error('Error saving settings:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to save settings.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const updateSetting = (key: keyof AdminSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const handlePasswordChange = async () => {
    // Validation
    if (!passwordData.currentPassword) {
      toast({
        title: "Error",
        description: "Please enter your current password.",
        variant: "destructive"
      })
      return
    }

    if (!passwordData.newPassword) {
      toast({
        title: "Error",
        description: "Please enter a new password.",
        variant: "destructive"
      })
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "New password must be at least 8 characters long.",
        variant: "destructive"
      })
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive"
      })
      return
    }

    setIsChangingPassword(true)
    try {
      const response = await authenticatedPost('/api/user/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }) as any

      if (response.success) {
        toast({
          title: "Password Updated",
          description: "Your password has been changed successfully.",
        })
        // Clear form
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      } else {
        throw new Error(response.error || 'Failed to change password')
      }
    } catch (error: any) {
      console.error('Password change error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to change password.",
        variant: "destructive"
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Admin Settings</h1>
              <p className="text-sm text-muted-foreground">Manage platform settings and configuration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin">
                <Home className="h-5 w-5" />
              </Link>
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="emails">Email Templates</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Information</CardTitle>
                <CardDescription>Basic platform details and contact information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Platform Name</Label>
                  <Input 
                    value={settings.platform_name}
                    onChange={(e) => updateSetting('platform_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Support Email</Label>
                  <Input 
                    type="email" 
                    value={settings.support_email}
                    onChange={(e) => updateSetting('support_email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input 
                    type="tel" 
                    value={settings.contact_phone}
                    onChange={(e) => updateSetting('contact_phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website URL</Label>
                  <Input 
                    value={settings.website_url}
                    onChange={(e) => updateSetting('website_url', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Subscription Pricing
                </CardTitle>
                <CardDescription>Monthly subscription pricing for different listing types</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Mosque Listing ($/month)</Label>
                    <Input 
                      type="number" 
                      value={settings.pricing_mosque}
                      onChange={(e) => updateSetting('pricing_mosque', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Business Listing ($/month)</Label>
                    <Input 
                      type="number" 
                      value={settings.pricing_business}
                      onChange={(e) => updateSetting('pricing_business', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Coupon Listing ($/month)</Label>
                    <Input 
                      type="number" 
                      value={settings.pricing_coupon}
                      onChange={(e) => updateSetting('pricing_coupon', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Non-Profit Listing ($/month)</Label>
                    <Input 
                      type="number" 
                      value={settings.pricing_nonprofit}
                      onChange={(e) => updateSetting('pricing_nonprofit', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Distribution</CardTitle>
                <CardDescription>Configure how revenue is distributed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Mosque Kickback Percentage (%)</Label>
                    <Input 
                      type="number" 
                      value={settings.mosque_kickback_percentage}
                      onChange={(e) => updateSetting('mosque_kickback_percentage', parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Percentage of business/coupon fees paid to affiliated mosques
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Amanah Education Fund Percentage (%)</Label>
                    <Input 
                      type="number" 
                      value={settings.education_fund_percentage}
                      onChange={(e) => updateSetting('education_fund_percentage', parseFloat(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Percentage of all revenue donated to children{"'"}s education
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emails" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Templates
                </CardTitle>
                <CardDescription>Customize automated email templates sent to users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Manage email templates for welcome emails, subscription confirmations, payment reminders, and more.
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/admin/emails">Manage Email Templates</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Admin Notifications
                </CardTitle>
                <CardDescription>Configure when to receive notifications and set notification email</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Notification Email Address</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Email where new subscription alerts and push notification requests will be sent
                  </p>
                  <Input 
                    type="email" 
                    placeholder="admin@amanah.app" 
                    value={settings.notification_email}
                    onChange={(e) => updateSetting('notification_email', e.target.value)}
                  />
                </div>
                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold text-foreground">Alert Types</h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>New Subscription</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when a new mosque, business, coupon, or non-profit is added
                      </p>
                    </div>
                    <Switch 
                      checked={settings.notify_new_subscription}
                      onCheckedChange={(checked) => updateSetting('notify_new_subscription', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Payment Failed</Label>
                      <p className="text-sm text-muted-foreground">Alert when a payment fails</p>
                    </div>
                    <Switch 
                      checked={settings.notify_payment_failed}
                      onCheckedChange={(checked) => updateSetting('notify_payment_failed', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Subscription Cancelled</Label>
                      <p className="text-sm text-muted-foreground">Get notified of cancellations</p>
                    </div>
                    <Switch 
                      checked={settings.notify_subscription_cancelled}
                      onCheckedChange={(checked) => updateSetting('notify_subscription_cancelled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Push Notification Requests</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when a mosque requests a push notification
                      </p>
                    </div>
                    <Switch 
                      checked={settings.notify_push_requests}
                      onCheckedChange={(checked) => updateSetting('notify_push_requests', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Member Updates</Label>
                      <p className="text-sm text-muted-foreground">Get notified when a member updates their listing</p>
                    </div>
                    <Switch 
                      checked={settings.notify_member_updates}
                      onCheckedChange={(checked) => updateSetting('notify_member_updates', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>Manage admin access and security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <Input 
                    type="password" 
                    placeholder="Enter current password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input 
                    type="password" 
                    placeholder="Enter new password (min 8 characters)"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input 
                    type="password" 
                    placeholder="Confirm new password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  />
                </div>
                <Button 
                  onClick={handlePasswordChange}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Add extra security to your account (Coming soon)</p>
                  </div>
                  <Switch disabled />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
