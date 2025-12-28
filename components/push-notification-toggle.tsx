/**
 * Push Notification Toggle Component
 * 
 * Allows users to enable/disable push notifications
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  subscribeToPush, 
  unsubscribeFromPush,
  isPushSupported, 
  getCurrentSubscription 
} from '@/lib/notifications/push-client'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/hooks/use-toast'
import { Bell, BellOff, Loader2 } from 'lucide-react'

export function PushNotificationToggle() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentSubscription, setCurrentSubscription] = useState<{ endpoint: string } | null>(null)

  useEffect(() => {
    checkSupport()
  }, [user]) // Add user as dependency so it re-checks when user loads

  const checkSupport = async () => {
    const supported = isPushSupported()
    setIsSupported(supported)

    // Don't check subscription if user is not loaded yet
    if (!user) {
      setLoading(false)
      return
    }

    if (supported) {
      await checkSubscription()
    } else {
      setLoading(false)
    }
  }

  const checkSubscription = async () => {
    try {
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout checking subscription')), 10000)
      )
      
      const subscription = await Promise.race([
        getCurrentSubscription(),
        timeoutPromise
      ]) as Awaited<ReturnType<typeof getCurrentSubscription>>

      if (subscription) {
        setIsSubscribed(true)
        setCurrentSubscription(subscription)
      } else {
        setIsSubscribed(false)
        setCurrentSubscription(null)
      }
    } catch (error) {
      console.error('Error checking subscription:', error)
      setIsSubscribed(false)
      setCurrentSubscription(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to enable push notifications',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      await subscribeToPush(user.id)
      setIsSubscribed(true)
      await checkSubscription() // Refresh subscription state
      toast({
        title: 'Push Notifications Enabled',
        description: 'You will now receive push notifications for messages, donations, and events.',
      })
    } catch (error: any) {
      console.error('Push subscription error:', error)
      toast({
        title: 'Failed to Enable Push',
        description: error.message || 'Please grant notification permission in your browser.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    if (!currentSubscription) {
      setIsSubscribed(false)
      return
    }

    setLoading(true)
    try {
      await unsubscribeFromPush(currentSubscription.endpoint)
      setIsSubscribed(false)
      setCurrentSubscription(null)
      toast({
        title: 'Push Notifications Disabled',
        description: 'You will no longer receive push notifications.',
      })
    } catch (error: any) {
      console.error('Push unsubscription error:', error)
      toast({
        title: 'Failed to Disable Push',
        description: error.message || 'Unable to disable push notifications.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in this browser.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (loading && !isSubscribed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>Checking subscription status...</CardDescription>
        </CardHeader>
        <CardContent>
          <Loader2 className="h-4 w-4 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isSubscribed ? <Bell className="h-5 w-5 text-green-500" /> : <BellOff className="h-5 w-5" />}
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive browser notifications for messages, donations, and events.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {isSubscribed ? 'Push Notifications Enabled' : 'Push Notifications Disabled'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isSubscribed 
                  ? 'You will receive notifications on this device.' 
                  : 'Enable to receive instant notifications.'}
              </p>
            </div>
            <Button
              onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
              disabled={loading}
              variant={isSubscribed ? 'outline' : 'default'}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSubscribed ? 'Disabling...' : 'Enabling...'}
                </>
              ) : isSubscribed ? (
                <>
                  <BellOff className="mr-2 h-4 w-4" />
                  Disable
                </>
              ) : (
                <>
                  <Bell className="mr-2 h-4 w-4" />
                  Enable
                </>
              )}
            </Button>
          </div>

          {isSubscribed && currentSubscription && (
            <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              <p className="font-medium mb-1">Subscription Active</p>
              <p className="truncate">{currentSubscription.endpoint.substring(0, 60)}...</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

