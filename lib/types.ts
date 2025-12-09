export type SubscriptionType = "mosque" | "coupon" | "business"

export type SubscriptionStatus = "active" | "pending" | "cancelled" | "past_due"

export interface Subscription {
  id: string
  type: SubscriptionType
  name: string
  status: SubscriptionStatus
  price: number
  startDate: string
  nextBillingDate: string
  paymentStartDate: string
}

export interface MosqueSubscription extends Subscription {
  type: "mosque"
  location: string
  photo?: string
  photos?: string[]
  description?: string
  contactName?: string
  thirdPartyLogins?: {
    platform: string
    username: string
    password: string
  }[]
  documents: Document[]
}

export interface CouponSubscription extends Subscription {
  type: "coupon"
  businessName: string
  offer: string
  photo?: string
  photos?: string[]
  location: string
  expiryDate?: string
  terms?: string
}

export interface BusinessSubscription extends Subscription {
  type: "business"
  businessName: string
  category: string
  location: string
  description: string
  photo?: string
  photos?: string[]
  website?: string
  contactName?: string
  documents: Document[]
}

export interface Document {
  id: string
  name: string
  url: string
  uploadedAt: string
  type: string
}

export interface Member {
  id: string
  email: string
  name: string
  phone?: string
  subscriptions: (MosqueSubscription | CouponSubscription | BusinessSubscription)[]
  createdAt: string
}

export interface PaymentAlert {
  id: string
  memberId: string
  memberName: string
  memberEmail: string
  subscriptionId: string
  subscriptionType: SubscriptionType
  subscriptionName: string
  alertType: "payment_failed" | "subscription_cancelled"
  createdAt: string
  resolved: boolean
  resolvedAt?: string
  notes?: string
}
