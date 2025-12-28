/**
 * Inline Push Notification Toggle Component
 * 
 * Compact version for use within the notifications settings card
 */

'use client'

import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { 
  subscribeToPush, 
  unsubscribeFromPush,
  isPushSupported, 
  getCurrentSubscription 
} from '@/lib/notifications/push-client'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/hooks/use-toast'
import { authenticatedPost } from '@/lib/api-client'
import { Loader2 } from 'lucide-react'

export function PushNotificationToggleInline() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [testing, setTesting] = useState(false)
  const [currentSubscription, setCurrentSubscription] = useState<{ endpoint: string } | null>(null)

  useEffect(() => {
    checkSupport()
  }, [user])

  const checkSupport = async () => {
    const supported = isPushSupported()
    setIsSupported(supported)

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

  const handleToggle = async (checked: boolean) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to enable push notifications',
        variant: 'destructive',
      })
      return
    }

    setToggling(true)
    try {
      if (checked) {
        // Subscribe
        await subscribeToPush(user.id)
        setIsSubscribed(true)
        await checkSubscription()
        toast({
          title: 'Push Notifications Enabled',
          description: 'You will now receive push notifications.',
        })
      } else {
        // Unsubscribe
        if (currentSubscription) {
          await unsubscribeFromPush(currentSubscription.endpoint)
        }
        setIsSubscribed(false)
        setCurrentSubscription(null)
        toast({
          title: 'Push Notifications Disabled',
          description: 'You will no longer receive push notifications.',
        })
      }
    } catch (error: any) {
      console.error('Push subscription error:', error)
      toast({
        title: checked ? 'Failed to Enable Push' : 'Failed to Disable Push',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      })
      // Revert the toggle
      setIsSubscribed(!checked)
    } finally {
      setToggling(false)
    }
  }

  if (!isSupported) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Push Notifications</p>
          <p className="text-sm text-muted-foreground">
            Push notifications are not supported in this browser
          </p>
        </div>
        <Switch disabled />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Push Notifications</p>
          <p className="text-sm text-muted-foreground">Checking subscription status...</p>
        </div>
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    )
  }

  const handleTestPush = async () => {
    if (!user) return
    
    setTesting(true)
    try {
      const response: any = await authenticatedPost('/api/notifications/test-push', {})
      if (response.success) {
        toast({
          title: 'Test Push Sent',
          description: `Test notification sent to ${response.data.sent} device(s). Check your browser notifications!`,
        })
      } else {
        throw new Error(response.error || 'Failed to send test push')
      }
    } catch (error: any) {
      console.error('Test push error:', error)
      toast({
        title: 'Test Failed',
        description: error.message || 'Could not send test push notification. Make sure you are subscribed.',
        variant: 'destructive',
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-medium">Push Notifications</p>
          <p className="text-sm text-muted-foreground">
            Receive browser notifications for messages, donations, and events
          </p>
        </div>
        <Switch
          checked={isSubscribed}
          onCheckedChange={handleToggle}
          disabled={toggling || loading}
        />
      </div>
      {isSubscribed && (
        <div className="mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestPush}
            disabled={testing}
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Sending...
              </>
            ) : (
              'Test Push Notification'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

