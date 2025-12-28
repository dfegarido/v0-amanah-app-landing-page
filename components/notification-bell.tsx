'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { authenticatedGet, authenticatedPatch } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read_at: string | null
  created_at: string
  metadata?: any
  related_entity_type?: string
  related_entity_id?: string
}

export function NotificationBell() {
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    fetchNotifications()

    // Set up Supabase Realtime subscription for new notifications
    const channel = supabase
      .channel(`notifications_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New notification received via realtime:', payload.new)
          // Refresh notifications when new one arrives
          fetchNotifications()
          // Show toast for new notification
          toast({
            title: 'New Notification',
            description: (payload.new as any).title || 'You have a new notification',
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Notification updated via realtime:', payload.new)
          // Refresh notifications when one is marked as read
          fetchNotifications()
        }
      )
      .subscribe((status) => {
        console.log('Notification realtime subscription status:', status)
      })

    // Fallback: Poll every 60 seconds as backup
    intervalRef.current = setInterval(() => {
      fetchNotifications()
    }, 60000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      supabase.removeChannel(channel)
    }
  }, [user])

  const fetchNotifications = async () => {
    try {
      const response: any = await authenticatedGet('/api/notifications?page=1&limit=20')
      if (response.success && response.data) {
        setNotifications(response.data.notifications || [])
        setUnreadCount(response.data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    const originalNotifications = [...notifications]
    
    // Optimistic update
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))

    try {
      await authenticatedPatch(`/api/notifications/${notificationId}/read`, {})
    } catch (error) {
      console.error('Error marking notification as read:', error)
      // Revert on error
      setNotifications(originalNotifications)
      setUnreadCount(prev => prev + 1)
    }
  }

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read_at)
    if (unreadNotifications.length === 0) return

    // Optimistic update
    setNotifications(prev =>
      prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    )
    setUnreadCount(0)

    try {
      // Mark all unread as read
      await Promise.all(
        unreadNotifications.map(n => 
          authenticatedPatch(`/api/notifications/${n.id}/read`, {})
        )
      )
      toast({
        title: 'All notifications marked as read',
      })
    } catch (error) {
      console.error('Error marking all as read:', error)
      fetchNotifications() // Refresh on error
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message_received':
        return '💬'
      case 'donation_confirmed':
        return '💰'
      case 'donation_failed':
        return '❌'
      case 'event_created':
      case 'event_updated':
        return '📅'
      default:
        return '🔔'
    }
  }

  const getNotificationLink = (notification: Notification): string => {
    // Check user role to determine base path
    const basePath = user?.role === 'admin' ? '/admin' : '/member'
    
    if (notification.type === 'message_received') {
      return `${basePath}/messages`
    } else if (notification.type === 'donation_confirmed' || notification.type === 'donation_failed') {
      return `${basePath}/donations`
    } else if (notification.type === 'event_created' || notification.type === 'event_updated') {
      return notification.related_entity_id
        ? `/events/${notification.related_entity_id}`
        : basePath
    }
    return basePath
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read_at) {
      markAsRead(notification.id)
    }
    setOpen(false)
    router.push(getNotificationLink(notification))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center px-1 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              Mark all as read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left p-4 hover:bg-secondary/50 transition-colors ${
                    !notification.read_at ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p
                          className={`text-sm font-medium truncate ${
                            !notification.read_at ? 'font-semibold' : ''
                          }`}
                        >
                          {notification.title}
                        </p>
                        {!notification.read_at && (
                          <span className="h-2 w-2 bg-primary rounded-full flex-shrink-0 ml-2" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="p-3 border-t">
            <Link
              href={user?.role === 'admin' ? '/admin/notifications' : '/member/notifications'}
              className="text-sm text-center block text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

