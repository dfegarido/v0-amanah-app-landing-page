export type SubscriptionType = "mosque" | "coupon" | "business"

export type SubscriptionStatus = "active" | "pending" | "cancelled" | "past_due"

export type AppStatus = "pending_verification" | "active" | "removed" | "cancelled"

export interface Subscription {
  id: string
  type: SubscriptionType
  name: string
  status: SubscriptionStatus
  price: number
  startDate: string
  nextBillingDate: string
  paymentStartDate: string
  addedToApp: boolean
  addedToAppDate?: string
  appStatus: AppStatus
  removedFromAppDate?: string
}

export interface MosqueSubscription extends Subscription {
  type: "mosque"
  mosqueCode: number // Unique mosque identifier starting at 1
  address: string
  email: string
  phone: string
  website?: string
  socialMedia?: {
    facebook?: string
    twitter?: string
    instagram?: string
    other?: string
  }
  logo?: string
  photos?: string[]
  donateLink?: string
  prayerTimesLink?: string
  sundaySchool?: string
  services?: string
  committeeMembers?: string
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
  affiliatedMosqueCode?: number // The mosque code this coupon is affiliated with
  title: string
  phone: string
  email: string
  website?: string
  merchant: string
  redeemLimit?: number
  userRedeemLimit?: number
  userMonthlyRedeemLimit?: number
  userWeeklyRedeemLimit?: number
  discountAmount?: string
  discountPercentage?: string
  couponCode?: string
  redeemCode?: string
  prefix?: string
  nextNo?: string
  startDate: string
  endDate?: string
  description?: string
  thumbnailDescription?: string
  popUpText?: string
  photo?: string
  photos?: string[]
  address: string
}

export interface BusinessSubscription extends Subscription {
  type: "business"
  affiliatedMosqueCode?: number // The mosque code this business is affiliated with
  title: string
  description: string
  categories: string[]
  subCategories?: string[]
  photos?: string[]
  zip: string
  address: string
  country: string
  state: string
  city: string
  phone: string
  fax?: string
  website?: string
  email: string
  socialMedia?: {
    facebook?: string
    twitter?: string
    instagram?: string
    other?: string
  }
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

export interface AffiliateEarning {
  id: string
  mosqueCode: number
  mosqueName: string
  affiliateType: "business" | "coupon"
  affiliateName: string
  affiliateId: string
  monthlyFee: number
  kickbackAmount: number // 10% of monthly fee
  month: string // YYYY-MM format
  status: "pending" | "paid" | "cancelled"
  paidDate?: string
}

export interface FinancialRecord {
  id: string
  date: string
  type: "mosque" | "business" | "coupon"
  subscriptionId: string
  subscriptionName: string
  amount: number
  mosqueKickback?: number
  amanahOrgDonation?: number // 15% for education
  mosqueCodeKickback?: number // 10% to mosque of choice
  netRevenue: number
}

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  variables: string[]
  lastModified: string
  active: boolean
}

export interface EmailLog {
  id: string
  to: string
  recipientName: string
  template: string
  subject: string
  sentAt: string
  status: "sent" | "failed" | "pending"
  error?: string
}

export interface AdminSettings {
  notificationEmailAddress: string
  enableNewSubscriptionNotifications: boolean
  enablePaymentFailedNotifications: boolean
  enableCancellationNotifications: boolean
}
