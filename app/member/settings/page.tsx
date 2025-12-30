"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, User, Lock, Bell, CreditCard, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/auth-context"
import { authenticatedPut, authenticatedPost, authenticatedGet, authenticatedDelete } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { AddPaymentMethodDialog } from "@/components/add-payment-method-dialog"
import { PushNotificationToggleInline } from "@/components/push-notification-toggle-inline"

export default function MemberSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading, refreshUser } = useAuth()
  
  // Profile form state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [paymentReminders, setPaymentReminders] = useState(true)
  const [monthlyReports, setMonthlyReports] = useState(false)
  
  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<{
    id: string
    brand: string
    last4: string
    expMonth: number
    expYear: number
  } | null>(null)
  const [isLoadingPayment, setIsLoadingPayment] = useState(false)
  
  // UI state
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  // Load user data into form
  useEffect(() => {
    if (user) {
      setName(user.name || "")
      setEmail(user.email || "")
      setPhone(user.phone || "")
      
      // Load notification preferences and payment method
      loadNotificationPreferences()
      loadPaymentMethod()
    }
  }, [user])

  const loadNotificationPreferences = async () => {
    try {
      const response = await authenticatedGet<{ data: any }>('/api/user/notification-preferences')
      if (response.data) {
        setEmailNotifications(response.data.email_notifications ?? true)
        setPaymentReminders(response.data.payment_reminders ?? true)
        setMonthlyReports(response.data.monthly_reports ?? false)
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error)
    }
  }

  const loadPaymentMethod = async () => {
    setIsLoadingPayment(true)
    try {
      const response = await authenticatedGet<{ data: { paymentMethod: any } }>('/api/stripe/payment-method')
      setPaymentMethod(response.data.paymentMethod)
    } catch (error) {
      console.error('Failed to load payment method:', error)
    } finally {
      setIsLoadingPayment(false)
    }
  }

  const handleRemovePaymentMethod = async () => {
    if (!confirm('Are you sure you want to remove your payment method?')) {
      return
    }

    setIsLoadingPayment(true)
    try {
      await authenticatedDelete('/api/stripe/payment-method')
      setPaymentMethod(null)
      toast({
        title: "Payment method removed",
        description: "Your payment method has been removed successfully.",
      })
    } catch (error: any) {
      toast({
        title: "Failed to remove",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoadingPayment(false)
    }
  }

  const handleProfileUpdate = async () => {
    setError(null)
    setIsSaving(true)

    try {
      await authenticatedPut('/api/user/profile', { name, phone })
      await refreshUser()
      
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      })
    } catch (err: any) {
      setError(err.message)
      toast({
        title: "Update failed",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    setError(null)

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match")
      return
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }

    setIsSaving(true)

    try {
      await authenticatedPost('/api/user/change-password', {
        currentPassword,
        newPassword,
      })
      
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      })
      
      // Clear password fields
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      setError(err.message)
      toast({
        title: "Password change failed",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleNotificationChange = async (
    preference: 'email_notifications' | 'payment_reminders' | 'monthly_reports',
    value: boolean
  ) => {
    try {
      await authenticatedPut('/api/user/notification-preferences', {
        [preference]: value,
      })
      
      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been saved.",
      })
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      })
      
      // Revert the change
      if (preference === 'email_notifications') setEmailNotifications(!value)
      if (preference === 'payment_reminders') setPaymentReminders(!value)
      if (preference === 'monthly_reports') setMonthlyReports(!value)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/member" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Account Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your account preferences and security</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/member">
                <Home className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                value={email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input 
                id="phone" 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <Button onClick={handleProfileUpdate} disabled={isSaving}>
              {isSaving ? "Updating..." : "Update Profile"}
            </Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Manage your password and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input 
                id="current-password" 
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input 
                id="new-password" 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters long
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input 
                id="confirm-password" 
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handlePasswordChange} 
                disabled={isSaving || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              >
                {isSaving ? "Changing..." : "Change Password"}
              </Button>
              {currentPassword && newPassword && confirmPassword && !isSaving && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCurrentPassword("")
                    setNewPassword("")
                    setConfirmPassword("")
                    setError(null)
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Manage your email and push notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive emails about your account activity</p>
              </div>
              <Switch 
                checked={emailNotifications} 
                onCheckedChange={(value) => {
                  setEmailNotifications(value)
                  handleNotificationChange('email_notifications', value)
                }} 
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Payment Reminders</p>
                <p className="text-sm text-muted-foreground">Get notified before upcoming payments</p>
              </div>
              <Switch 
                checked={paymentReminders} 
                onCheckedChange={(value) => {
                  setPaymentReminders(value)
                  handleNotificationChange('payment_reminders', value)
                }} 
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Monthly Reports</p>
                <p className="text-sm text-muted-foreground">Receive monthly summary of your earnings and activity</p>
              </div>
              <Switch 
                checked={monthlyReports} 
                onCheckedChange={(value) => {
                  setMonthlyReports(value)
                  handleNotificationChange('monthly_reports', value)
                }} 
              />
            </div>
            <Separator />
            <PushNotificationToggleInline />
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Test Email Configuration</p>
                <p className="text-sm text-muted-foreground">Test Resend email service configuration</p>
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const response = await authenticatedPost('/api/notifications/test-resend', {}) as any
                    if (response.success) {
                      toast({
                        title: "Test email sent",
                        description: `Test email sent to ${user?.email}. Check your inbox and server logs.`,
                      })
                    } else {
                      throw new Error(response.error || 'Failed to send test email')
                    }
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error.message || "Failed to send test email. Check server logs for details.",
                      variant: "destructive",
                    })
                  }
                }}
              >
                Test Resend
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Method
            </CardTitle>
            <CardDescription>Manage your payment information</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPayment ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : paymentMethod ? (
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5" />
                  <div>
                    <p className="font-medium capitalize">
                      {paymentMethod.brand} ending in {paymentMethod.last4}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Expires {paymentMethod.expMonth}/{paymentMethod.expYear}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <AddPaymentMethodDialog onPaymentMethodAdded={loadPaymentMethod}>
                    <Button variant="outline" size="sm">Update</Button>
                  </AddPaymentMethodDialog>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleRemovePaymentMethod}
                    disabled={isLoadingPayment}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">
                  No payment method added yet
                </p>
                <AddPaymentMethodDialog onPaymentMethodAdded={loadPaymentMethod}>
                  <Button variant="outline">Add Payment Method</Button>
                </AddPaymentMethodDialog>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions for your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive">Delete Account</Button>
            <p className="text-sm text-muted-foreground mt-2">
              This will permanently delete your account and all subscriptions. This action cannot be undone.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
