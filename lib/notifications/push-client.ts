/**
 * Client-side Push Notification Helper
 * 
 * Handles browser push subscription on the frontend.
 * Use this in React components to enable push notifications.
 */

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser')
  }

  if (!('Notification' in window)) {
    throw new Error('Notifications are not supported in this browser')
  }

  const permission = await Notification.requestPermission()
  return permission
}

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!isPushSupported()) {
    throw new Error('Service workers are not supported in this browser')
  }

  try {
    // Check if already registered
    const existingRegistration = await navigator.serviceWorker.getRegistration('/')
    if (existingRegistration) {
      console.log('✅ Service Worker already registered:', existingRegistration.scope)
      return existingRegistration
    }

    // Register new service worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })
    console.log('✅ Service Worker registered:', registration.scope)
    
    // Wait for it to be ready
    await navigator.serviceWorker.ready
    return registration
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error)
    throw error
  }
}

/**
 * Get VAPID public key from server
 */
async function getVapidPublicKey(): Promise<string> {
  const response = await fetch('/api/notifications/vapid-key')
  if (!response.ok) {
    throw new Error('Failed to get VAPID public key')
  }
  const data = await response.json()
  return data.data.publicKey
}

/**
 * Convert base64 URL-safe string to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(
  userId: string
): Promise<PushSubscription | null> {
  try {
    // Check support
    if (!isPushSupported()) {
      throw new Error('Push notifications are not supported')
    }

    // Request permission
    const permission = await requestNotificationPermission()
    if (permission !== 'granted') {
      throw new Error('Notification permission denied')
    }

    // Register service worker
    const registration = await registerServiceWorker()
    await navigator.serviceWorker.ready

    // Get VAPID public key
    const vapidPublicKey = await getVapidPublicKey()

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })

    // Convert subscription to format expected by server
    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: btoa(
          String.fromCharCode.apply(
            null,
            Array.from(new Uint8Array(subscription.getKey('p256dh')!))
          )
        ),
        auth: btoa(
          String.fromCharCode.apply(
            null,
            Array.from(new Uint8Array(subscription.getKey('auth')!))
          )
        ),
      },
    }

    // Import authenticatedPost dynamically to avoid circular dependencies
    const { authenticatedPost } = await import('@/lib/api-client')
    
    // Send subscription to server using authenticated request
    await authenticatedPost('/api/notifications/subscribe', subscriptionData)

    console.log('✅ Push subscription successful')
    return subscriptionData
  } catch (error: any) {
    console.error('❌ Push subscription failed:', error)
    throw error
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(
  endpoint: string
): Promise<void> {
  try {
    // Import authenticatedDelete dynamically to avoid circular dependencies
    const { authenticatedDelete } = await import('@/lib/api-client')
    
    // Remove from server using authenticated request
    await authenticatedDelete(
      `/api/notifications/subscribe?endpoint=${encodeURIComponent(endpoint)}`
    )

    // Unsubscribe from browser
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription && subscription.endpoint === endpoint) {
      await subscription.unsubscribe()
    }

    console.log('✅ Push unsubscription successful')
  } catch (error: any) {
    console.error('❌ Push unsubscription failed:', error)
    throw error
  }
}

/**
 * Get current push subscription
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  try {
    if (!isPushSupported()) {
      return null
    }

    // Check if service worker is registered first
    if (!navigator.serviceWorker.controller) {
      // Try to register service worker if not already registered
      try {
        await registerServiceWorker()
      } catch (error) {
        // Service worker registration failed, return null
        console.warn('Service worker not available:', error)
        return null
      }
    }

    // Wait for service worker to be ready with timeout
    const readyPromise = navigator.serviceWorker.ready
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Service worker ready timeout')), 5000)
    )

    const registration = await Promise.race([readyPromise, timeoutPromise]) as ServiceWorkerRegistration
    const subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      return null
    }

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: btoa(
          String.fromCharCode.apply(
            null,
            Array.from(new Uint8Array(subscription.getKey('p256dh')!))
          )
        ),
        auth: btoa(
          String.fromCharCode.apply(
            null,
            Array.from(new Uint8Array(subscription.getKey('auth')!))
          )
        ),
      },
    }
  } catch (error) {
    console.error('Error getting current subscription:', error)
    return null
  }
}

export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

