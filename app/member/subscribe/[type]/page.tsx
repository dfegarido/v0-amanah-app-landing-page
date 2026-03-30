"use client"

import type React from "react"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import NextImage from "next/image"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Building2, Store, Ticket, CreditCard, Check, Plus, X, Upload, Info, Users, Loader2, Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { authenticatedPost, authenticatedGet } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { useAuth } from "@/lib/auth-context"

// Helper function to get the correct table name for a subscription type
const getTableName = (type: string): string => {
  // Handle special pluralization cases
  if (type === 'business') return 'businesses'
  // Default: just add 's'
  return `${type}s`
}

const subscriptionInfo = {
  mosque: {
    title: "Mosque Subscription",
    price: 100,
    icon: Building2,
    description: "List your mosque on Amanah and connect with your community",
  },
  business: {
    title: "Business Listing",
    price: 10,
    icon: Store,
    description: "Get your halal business discovered by the Muslim community",
  },
  coupon: {
    title: "Coupon Listing",
    price: 10,
    icon: Ticket,
    description: "Promote special offers and deals to attract more customers",
  },
  nonprofit: {
    title: "Non-Profit Organization",
    price: 50,
    icon: Users,
    description: "Showcase your non-profit and connect with donors in the Muslim community",
  },
}

// Payment confirmation form component
function PaymentConfirmationForm({ 
  clientSecret, 
  confirmationType = 'payment_intent',
  onSuccess, 
  onCancel 
}: { 
  clientSecret: string
  confirmationType?: 'payment_intent' | 'setup_intent'
  onSuccess: () => void
  onCancel: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsLoading(true)

    try {
      if (confirmationType === 'setup_intent') {
        const { error } = await stripe.confirmSetup({
          elements,
          confirmParams: {
            return_url: window.location.href,
          },
          redirect: 'if_required',
        })

        if (error) {
          toast({
            title: 'Could not save payment method',
            description: error.message,
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Card saved',
            description: 'Your subscription is set up. You will not be charged while your promo is active.',
          })
          onSuccess()
        }
      } else {
        const { error } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: window.location.href,
          },
          redirect: 'if_required',
        })

        if (error) {
          toast({
            title: 'Payment failed',
            description: error.message,
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Payment successful!',
            description: 'Your subscription has been activated.',
          })
          onSuccess()
        }
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Something went wrong',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const submitLabel =
    confirmationType === 'setup_intent'
      ? isLoading
        ? 'Processing...'
        : 'Save card & continue'
      : isLoading
        ? 'Processing...'
        : 'Complete Payment'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement 
        options={{
          paymentMethodOrder: ['card', 'cashapp', 'amazon_pay', 'paypal', 'link', 'us_bank_account'],
        }}
      />
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={!stripe || isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

export default function SubscribePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const type = params.type as "mosque" | "business" | "coupon" | "nonprofit"

  const stripePromise = useMemo(() => {
    const publishableKey =
      type === "nonprofit"
        ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_NONPROFIT
        : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!publishableKey) {
      console.error(
        type === "nonprofit"
          ? "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_NONPROFIT is not set (required for nonprofit listings)"
          : "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set",
      )
    }
    return loadStripe(publishableKey ?? "")
  }, [type])

  const [step, setStep] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [uploadedLogo, setUploadedLogo] = useState<string | null>(null)
  const [affiliatedMosqueCode, setAffiliatedMosqueCode] = useState<string>("")
  const [formData, setFormData] = useState<any>({ redemptionType: 'unlimited', country: 'USA' }) // Store all form data, defaults
  const [promoCode, setPromoCode] = useState<string>("")
  const [availableMosques, setAvailableMosques] = useState<any[]>([])
  const [availableNonprofits, setAvailableNonprofits] = useState<any[]>([])
  const [nextMosqueCode, setNextMosqueCode] = useState<number>(1)
  const [isMounted, setIsMounted] = useState(false)
  const [serviceCount, setServiceCount] = useState<number>(1) // Start with 1 service field
  const [committeeCount, setCommitteeCount] = useState<number>(1) // Start with 1 committee member field
  const [committeeMembers, setCommitteeMembers] = useState<{ name: string; title: string; photo: string; uploading?: boolean }[]>([{ name: '', title: '', photo: '' }])
  const [createdSubscriptionId, setCreatedSubscriptionId] = useState<string | null>(null)
  const pendingSubscriptionIdRef = useRef<string | null>(null)

  // Date picker state for coupons
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  
  // Stripe payment state
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [confirmationType, setConfirmationType] = useState<'payment_intent' | 'setup_intent'>('payment_intent')
  const [paymentMethod, setPaymentMethod] = useState<any>(null)
  const [useSavedPaymentMethod, setUseSavedPaymentMethod] = useState(false)
  const [promoPreview, setPromoPreview] = useState<any>(null)
  const [promoPreviewError, setPromoPreviewError] = useState<string | null>(null)
  
  // Optimistic UI state for uploads
  const [uploadingImages, setUploadingImages] = useState<Set<string>>(new Set())
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // File input refs
  const logoInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Form validation state
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Pricing state - fetch from API
  const [pricing, setPricing] = useState({
    pricing_mosque: 10000,
    pricing_business: 1000,
    pricing_coupon: 1000,
    pricing_nonprofit: 5000
  })
  const [loadingPricing, setLoadingPricing] = useState(true)

  const info = subscriptionInfo[type]
  const Icon = info?.icon || Building2
  
  // Get current price from fetched pricing
  const getCurrentPrice = () => {
    const priceMap: Record<string, number> = {
      mosque: pricing.pricing_mosque / 100,
      business: pricing.pricing_business / 100,
      coupon: pricing.pricing_coupon / 100,
      nonprofit: pricing.pricing_nonprofit / 100
    }
    return priceMap[type] || info?.price || 0
  }

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone: string): boolean => {
    // Allow various phone formats
    const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/
    return phoneRegex.test(phone)
  }

  const validateUrl = (url: string): boolean => {
    if (!url) return true // Optional fields
    
    // Allow URLs without protocol (e.g., "example.com", "www.example.com")
    const urlToTest = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`
    
    try {
      const parsedUrl = new URL(urlToTest)
      // Check if it has a valid domain structure (at least one dot and valid characters)
      return /^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}/.test(parsedUrl.hostname)
    } catch {
      return false
    }
  }

  const validateField = (fieldName: string, value: any): string => {
    // Common required fields for all types
    const requiredFields: Record<string, string[]> = {
      mosque: ['name', 'address', 'city', 'state', 'zip', 'country', 'email', 'phone'],
      business: ['title', 'categories', 'address', 'city', 'state', 'zip', 'country', 'email', 'phone', 'website', 'description'],
      coupon: ['title', 'merchant', 'description', 'phone', 'email', 'address'],
      nonprofit: ['orgName', 'address', 'city', 'state', 'zip', 'country', 'email', 'phone', 'description']
    }

    const isRequired = requiredFields[type]?.includes(fieldName)

    // Check if field is empty
    if (isRequired && (!value || String(value).trim() === '')) {
      return 'This field is required'
    }

    // Email validation
    if (fieldName === 'email' && value && !validateEmail(value)) {
      return 'Please enter a valid email address'
    }

    // Phone validation
    if (fieldName === 'phone' && value && !validatePhone(value)) {
      return 'Please enter a valid phone number'
    }

    // URL validations
    if (['website', 'sundaySchool', 'programsLink', 'donateLink'].includes(fieldName) && value && !validateUrl(value)) {
      return 'Please enter a valid URL (e.g., example.com or https://example.com)'
    }

    // Postal code validation (supports US ZIP and international formats)
    if (fieldName === 'zip' && value && !/^[A-Za-z0-9][A-Za-z0-9\s-]{2,11}$/.test(value)) {
      return 'Please enter a valid zip code'
    }

    return ''
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Get required fields based on type
    let fieldsToValidate: string[] = []
    
    if (type === 'mosque') {
      fieldsToValidate = ['name', 'address', 'city', 'state', 'zip', 'country', 'email', 'phone']
    } else if (type === 'business') {
      fieldsToValidate = ['title', 'categories', 'address', 'city', 'state', 'zip', 'country', 'email', 'phone', 'website', 'description']
    } else if (type === 'coupon') {
      fieldsToValidate = ['title', 'merchant', 'description', 'phone', 'email', 'address']
    } else if (type === 'nonprofit') {
      fieldsToValidate = ['orgName', 'address', 'city', 'state', 'zip', 'country', 'email', 'phone', 'description']
    }

    // Validate each field
    fieldsToValidate.forEach(field => {
      const error = validateField(field, formData[field])
      if (error) {
        console.log(`[Validation] Field '${field}' has error:`, error)
        newErrors[field] = error
      }
    })

    // Additional validations
    if (type === 'coupon') {
      if (!startDate || !formData.startDate) {
        newErrors.startDate = 'Start date is required'
      }
      if (!formData.discountAmount && !formData.discountPercentage) {
        newErrors.discount = 'Either discount amount or percentage is required'
      }
    }

    // Logo validation (not required for business and coupon)
    if (type !== 'business' && type !== 'coupon' && !uploadedLogo) {
      newErrors.logo = 'Logo is required'
    }

    // Images validation (at least 1 image)
    if (uploadedImages.length === 0) {
      newErrors.images = 'At least one image is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleFieldBlur = (fieldName: string) => {
    setTouched({ ...touched, [fieldName]: true })
    const error = validateField(fieldName, formData[fieldName])
    if (error) {
      setErrors({ ...errors, [fieldName]: error })
    } else {
      const newErrors = { ...errors }
      delete newErrors[fieldName]
      setErrors(newErrors)
    }
  }

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData({ ...formData, [fieldName]: value })
    
    // Clear error on change if field was touched
    if (touched[fieldName]) {
      const error = validateField(fieldName, value)
      if (error) {
        setErrors({ ...errors, [fieldName]: error })
      } else {
        const newErrors = { ...errors }
        delete newErrors[fieldName]
        setErrors(newErrors)
      }
    }
  }

  // Check if form is valid
  const isFormValid = (): boolean => {
    // Get required fields based on type
    let fieldsToCheck: string[] = []
    
    if (type === 'mosque') {
      fieldsToCheck = ['name', 'address', 'city', 'state', 'zip', 'country', 'email', 'phone']
    } else if (type === 'business') {
      fieldsToCheck = ['title', 'categories', 'address', 'city', 'state', 'zip', 'country', 'email', 'phone', 'website', 'description']
    } else if (type === 'coupon') {
      fieldsToCheck = ['title', 'merchant', 'description', 'phone', 'email', 'address']
    } else if (type === 'nonprofit') {
      fieldsToCheck = ['orgName', 'address', 'city', 'state', 'zip', 'country', 'email', 'phone', 'description']
    }

    // Check all required fields are filled
    const missingFields: string[] = []
    const allFieldsFilled = fieldsToCheck.every(field => {
      const value = formData[field]
      const isFilled = value && String(value).trim() !== ''
      if (!isFilled) {
        missingFields.push(field)
      }
      return isFilled
    })

    // Check logo and images
    const hasLogo = uploadedLogo !== null
    const hasImages = uploadedImages.length > 0

    // Debug logging
    if (!allFieldsFilled || !hasImages || Object.keys(errors).length > 0) {
      console.log('[Form Validation Debug]', {
        type,
        missingFields,
        allFieldsFilled,
        hasImages,
        errors: Object.keys(errors),
        formData: Object.keys(formData)
      })
    }

    // Coupon specific checks (no logo required)
    if (type === 'coupon') {
      const hasStartDate = startDate !== undefined && formData.startDate
      const hasDiscount = formData.discountAmount || formData.discountPercentage
      const hasNoErrors = Object.keys(errors).length === 0
      return allFieldsFilled && hasImages && hasStartDate && hasDiscount && hasNoErrors
    }

    // Business doesn't require logo, just images
    if (type === 'business') {
      const hasNoErrors = Object.keys(errors).length === 0
      return allFieldsFilled && hasImages && hasNoErrors
    }

    // Check no validation errors
    const hasNoErrors = Object.keys(errors).length === 0

    return allFieldsFilled && hasLogo && hasImages && hasNoErrors
  }

  // Set mounted state to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Fetch public directory lists for affiliation / optional donations (not "my" mosques only).
  // Wait for auth (same as donate page): authenticatedGet needs a session; running on first paint
  // often throws before Supabase restores the session → empty lists.
  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setAvailableMosques([])
      setAvailableNonprofits([])
      return
    }

    const fetchMosques = async () => {
      try {
        const response: any = await authenticatedGet(
          '/api/directory/mosques?limit=500&status=active'
        )
        if (response.success && response.data?.mosques) {
          const list = (response.data.mosques as any[]).filter((m) => m.status === 'active')
          list.sort((a, b) => (Number(a.mosque_code) || 0) - (Number(b.mosque_code) || 0))
          setAvailableMosques(
            list.map((m) => ({
              id: m.id,
              name: m.name,
              mosque_code: m.mosque_code,
              status: m.status,
              subscription_id: m.subscription_id,
            }))
          )
        } else {
          setAvailableMosques([])
        }
      } catch (error) {
        console.error('[Subscribe] Error fetching directory mosques:', error)
        setAvailableMosques([])
      }
    }

    if (type === 'business' || type === 'coupon' || type === 'nonprofit') {
      fetchMosques()
    } else {
      setAvailableMosques([])
    }

    const fetchNonprofits = async () => {
      try {
        const response: any = await authenticatedGet(
          '/api/directory/nonprofits?limit=500&status=active'
        )
        if (response.success && response.data?.nonprofits) {
          const list = (response.data.nonprofits as any[]).filter((n) => n.status === 'active')
          list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }))
          setAvailableNonprofits(
            list.map((n) => ({
              id: n.id,
              name: n.name,
              subscription_id: n.subscription_id,
            }))
          )
        } else {
          setAvailableNonprofits([])
        }
      } catch (error) {
        console.error('[Subscribe] Error fetching directory nonprofits:', error)
        setAvailableNonprofits([])
      }
    }

    if (type === 'business') {
      fetchNonprofits()
    } else {
      setAvailableNonprofits([])
    }
  }, [type, user, authLoading])

  // Get next mosque code (for display only)
  useEffect(() => {
    const getNextCode = async () => {
      try {
        const { data, error } = await supabase.rpc('get_next_mosque_code')
        if (!error && data) {
          setNextMosqueCode(data)
        }
      } catch (error) {
        console.error('Error getting next mosque code:', error)
      }
    }

    if (type === 'mosque') {
      getNextCode()
    }
  }, [type])

  // Fetch pricing settings on mount
  useEffect(() => {
    const fetchPricing = async () => {
      try {
        setLoadingPricing(true)
        console.log('[Subscribe Form] Fetching pricing from API...')
        const response = await fetch('/api/settings/pricing')
        const result = await response.json()
        
        console.log('[Subscribe Form] Pricing API response:', result)
        
        if (result.success && result.data) {
          console.log('[Subscribe Form] Setting pricing state:', result.data)
          setPricing(result.data)
        }
      } catch (error) {
        console.error('[Subscribe Form] Error fetching pricing settings:', error)
      } finally {
        setLoadingPricing(false)
      }
    }

    fetchPricing()
  }, [])

  if (!info) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Subscription Type</h1>
          <Link href="/member" className="text-primary hover:underline">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Helper function to resize/compress image and convert to WebP
  const resizeImage = (file: File, maxSizeMB: number = 2): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (e) => {
        const img = new Image()
        img.src = e.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          
          // Calculate new dimensions to reduce file size
          const maxDimension = 1920 // Max width or height
          if (width > height && width > maxDimension) {
            height = (height / width) * maxDimension
            width = maxDimension
          } else if (height > maxDimension) {
            width = (width / height) * maxDimension
            height = maxDimension
          }
          
          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          
          // Try different quality levels until file size is acceptable
          // WebP typically produces smaller files than JPEG at the same quality
          let quality = 0.9
          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to compress image'))
                  return
                }
                
                const targetSize = maxSizeMB * 1024 * 1024
                
                // If still too large and quality can be reduced, try again
                if (blob.size > targetSize && quality > 0.1) {
                  quality -= 0.1
                  tryCompress()
                  return
                }
                
                // Create new file from blob with .webp extension
                const fileName = file.name.replace(/\.(jpg|jpeg|png)$/i, '.webp')
                const resizedFile = new File([blob], fileName, {
                  type: 'image/webp',
                  lastModified: Date.now(),
                })
                resolve(resizedFile)
              },
              'image/webp',
              quality
            )
          }
          
          tryCompress()
        }
        img.onerror = () => reject(new Error('Failed to load image'))
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
    })
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    
    // Validate file type - only accept JPG, JPEG, PNG
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!validTypes.includes(file.type.toLowerCase())) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, JPEG, or PNG image",
        variant: "destructive",
      })
      return
    }

    // Create temporary preview URL (optimistic UI)
    const tempPreviewUrl = URL.createObjectURL(file)
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`
    
    // Add to uploaded images immediately (optimistic)
    setUploadedImages(prev => [...prev, tempPreviewUrl])
    setUploadingImages(prev => new Set([...prev, tempPreviewUrl]))

    try {
      // Process and upload in background
      const processedFile = await resizeImage(file, 2)
      
      const fileName = `${type}-${Date.now()}-${Math.random().toString(36).substring(7)}.webp`
      const filePath = `${getTableName(type)}/${fileName}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(filePath, processedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        
        // Remove temp preview on error
        setUploadedImages(prev => prev.filter(url => url !== tempPreviewUrl))
        setUploadingImages(prev => {
          const newSet = new Set(prev)
          newSet.delete(tempPreviewUrl)
          return newSet
        })
        URL.revokeObjectURL(tempPreviewUrl)
        
        toast({
          title: "Upload failed",
          description: error.message || "Failed to upload image",
          variant: "destructive",
        })
        return
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath)

      // Replace temp URL with real URL
      setUploadedImages(prev => prev.map(url => url === tempPreviewUrl ? publicUrl : url))
      setUploadingImages(prev => {
        const newSet = new Set(prev)
        newSet.delete(tempPreviewUrl)
        return newSet
      })
      setTouched({ ...touched, images: true })
      
      // Clean up temp URL
      URL.revokeObjectURL(tempPreviewUrl)
      
      const sizeInfo = `${(processedFile.size / 1024 / 1024).toFixed(1)}MB`
      const reduction = file.size > processedFile.size 
        ? ` (${Math.round((1 - processedFile.size / file.size) * 100)}% smaller)`
        : ''
      
      toast({
        title: "Upload complete",
        description: `${sizeInfo} WebP${reduction}`,
      })
    } catch (error: any) {
      console.error('Upload error:', error)
      
      // Remove temp preview on error
      setUploadedImages(prev => prev.filter(url => url !== tempPreviewUrl))
      setUploadingImages(prev => {
        const newSet = new Set(prev)
        newSet.delete(tempPreviewUrl)
        return newSet
      })
      URL.revokeObjectURL(tempPreviewUrl)
      
      toast({
        title: "Upload failed",
        description: error.message || "An error occurred while uploading the image",
        variant: "destructive",
      })
    }
    
    // Reset input
    event.target.value = ''
  }

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index))
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    
    // Validate file type - only accept JPG, JPEG, PNG
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!validTypes.includes(file.type.toLowerCase())) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, JPEG, or PNG image",
        variant: "destructive",
      })
      return
    }

    // Create temporary preview URL (optimistic UI)
    const tempPreviewUrl = URL.createObjectURL(file)
    
    // Show preview immediately (optimistic)
    setUploadedLogo(tempPreviewUrl)
    setUploadingLogo(true)

    try {
      // Process and upload in background
      const processedFile = await resizeImage(file, 2)

      const fileName = `logo-${type}-${Date.now()}-${Math.random().toString(36).substring(7)}.webp`
      const filePath = `${getTableName(type)}/${fileName}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(filePath, processedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        
        // Remove temp preview on error
        setUploadedLogo(null)
        setUploadingLogo(false)
        URL.revokeObjectURL(tempPreviewUrl)
        
        toast({
          title: "Upload failed",
          description: error.message || "Failed to upload logo",
          variant: "destructive",
        })
        return
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath)

      // Replace temp URL with real URL
      setUploadedLogo(publicUrl)
      setUploadingLogo(false)
      setTouched({ ...touched, logo: true })
      
      // Clean up temp URL
      URL.revokeObjectURL(tempPreviewUrl)
      
      const sizeInfo = `${(processedFile.size / 1024 / 1024).toFixed(1)}MB`
      const reduction = file.size > processedFile.size 
        ? ` (${Math.round((1 - processedFile.size / file.size) * 100)}% smaller)`
        : ''
      
      toast({
        title: "Upload complete",
        description: `${sizeInfo} WebP${reduction}`,
      })
    } catch (error: any) {
      console.error('Upload error:', error)
      
      // Remove temp preview on error
      setUploadedLogo(null)
      setUploadingLogo(false)
      URL.revokeObjectURL(tempPreviewUrl)
      
      toast({
        title: "Upload failed",
        description: error.message || "An error occurred while uploading the logo",
        variant: "destructive",
      })
    }
    
    // Reset input
    event.target.value = ''
  }

  const handleCommitteePhotoUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    
    // Validate file type - only accept JPG, JPEG, PNG
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!validTypes.includes(file.type.toLowerCase())) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, JPEG, or PNG image",
        variant: "destructive",
      })
      return
    }

    // Create temporary preview URL (optimistic UI)
    const tempPreviewUrl = URL.createObjectURL(file)
    
    // Update member with temp preview and uploading status
    const updatedMembers = [...committeeMembers]
    updatedMembers[index] = { ...updatedMembers[index], photo: tempPreviewUrl, uploading: true }
    setCommitteeMembers(updatedMembers)

    try {
      // Process and upload in background
      const processedFile = await resizeImage(file, 1) // Smaller size for profile photos

      const fileName = `committee-${type}-${Date.now()}-${Math.random().toString(36).substring(7)}.webp`
      const filePath = `${getTableName(type)}/${fileName}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(filePath, processedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        
        // Remove temp preview on error
        const resetMembers = [...committeeMembers]
        resetMembers[index] = { ...resetMembers[index], photo: '', uploading: false }
        setCommitteeMembers(resetMembers)
        URL.revokeObjectURL(tempPreviewUrl)
        
        toast({
          title: "Upload failed",
          description: error.message || "Failed to upload photo",
          variant: "destructive",
        })
        return
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath)

      // Replace temp URL with real URL
      const finalMembers = [...committeeMembers]
      finalMembers[index] = { ...finalMembers[index], photo: publicUrl, uploading: false }
      setCommitteeMembers(finalMembers)
      
      // Clean up temp URL
      URL.revokeObjectURL(tempPreviewUrl)
      
      toast({
        title: "Upload complete",
        description: `Photo uploaded successfully`,
      })
    } catch (error: any) {
      console.error('Upload error:', error)
      
      // Remove temp preview on error
      const resetMembers = [...committeeMembers]
      resetMembers[index] = { ...resetMembers[index], photo: '', uploading: false }
      setCommitteeMembers(resetMembers)
      URL.revokeObjectURL(tempPreviewUrl)
      
      toast({
        title: "Upload failed",
        description: error.message || "An error occurred while uploading the photo",
        variant: "destructive",
      })
    }
    
    // Reset input
    event.target.value = ''
  }

  const handleSubmit = async () => {
    // Mark all fields as touched to show errors
    const allFields = Object.keys(formData)
    const newTouched: Record<string, boolean> = {}
    allFields.forEach(field => { newTouched[field] = true })
    setTouched(newTouched)

    // Validate form
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      // Serialize committee members to JSON for mosque and nonprofit types
      if (type === 'mosque' || type === 'nonprofit') {
        // Filter out empty committee members (ones with no name, title, or photo)
        const validMembers = committeeMembers.filter(m => m.name || m.title || m.photo)
        if (validMembers.length > 0) {
          formData.committee = JSON.stringify(validMembers)
        }
      }

      // Validate required fields for coupon
      if (type === 'coupon') {
        const requiredFields = ['title', 'merchant', 'description', 'phone', 'email', 'address']
        const missingFields = requiredFields.filter(field => !formData[field] || formData[field].trim() === '')
        
        if (missingFields.length > 0) {
          toast({
            title: "Missing required fields",
            description: `Please fill in: ${missingFields.join(', ')}`,
            variant: "destructive",
          })
          setIsProcessing(false)
          return
        }
        
        if (!startDate || !formData.startDate) {
          toast({
            title: "Start date required",
            description: "Please select a start date for the coupon",
            variant: "destructive",
          })
          setIsProcessing(false)
          return
        }
      }

      // Prepare data based on subscription type
      const subscriptionData = {
        ...formData,
        photos: uploadedImages,
        logo: uploadedLogo,
        affiliatedMosqueCode: affiliatedMosqueCode && affiliatedMosqueCode !== 'none' ? affiliatedMosqueCode : null
      }

      // Create subscription with Stripe
      const paymentMethodId = useSavedPaymentMethod && paymentMethod ? paymentMethod.id : undefined
      
      const response: any = await authenticatedPost('/api/subscriptions/create', {
        type: type,
        data: subscriptionData,
        paymentMethodId: paymentMethodId,
        promoCode: promoCode.trim() ? promoCode.trim() : undefined,
        timezone
      })

      if (response.success) {
        const newSubId = response.data.subscription.id as string
        pendingSubscriptionIdRef.current = newSubId
        setCreatedSubscriptionId(newSubId)

        const confType =
          (response.data.confirmationType as 'payment_intent' | 'setup_intent') || 'payment_intent'
        
        // If clientSecret is returned, we need to confirm the payment
        if (response.data.clientSecret && (!useSavedPaymentMethod || !paymentMethod)) {
          // Show payment form
          setClientSecret(response.data.clientSecret)
          setConfirmationType(confType)
          // Wait for payment confirmation (handled by PaymentConfirmationForm)
          return
        } else if (response.data.clientSecret && useSavedPaymentMethod && paymentMethod) {
          // Confirm payment with saved payment method
          const stripe = await stripePromise
          if (!stripe) {
            throw new Error('Stripe not loaded')
          }

          if (confType === 'setup_intent') {
            const { error: confirmError } = await stripe.confirmSetup({
              clientSecret: response.data.clientSecret,
              confirmParams: {
                payment_method: paymentMethod.id,
                return_url: window.location.href,
              },
              redirect: 'if_required',
            })
            if (confirmError) {
              throw confirmError
            }
          } else {
            const { error: confirmError } = await stripe.confirmCardPayment(response.data.clientSecret, {
              payment_method: paymentMethod.id,
            })

            if (confirmError) {
              throw confirmError
            }
          }
        }
        
        // Payment successful, proceed to success step
        setStep(3)
        
        // Send notification to admin
        try {
          await authenticatedPost('/api/notifications/send', {
            type: 'new_subscription',
            subscriptionId: response.data.subscription.id,
            subscriptionType: type,
            entityName: formData.name || formData.title || formData.orgName || 'Unnamed'
          })
        } catch (notifError) {
          console.error('Failed to send notification:', notifError)
          // Don't fail the whole flow if notification fails
        }

        toast({
          title: "Subscription Created!",
          description: `Your ${type} subscription has been successfully created.`,
        })
      } else {
        throw new Error(response.error || 'Failed to create subscription')
      }
    } catch (error: any) {
      console.error('Subscription creation error:', error)
      toast({
        title: "Error",
        description: error.message || 'Failed to create subscription. Please try again.',
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Fetch saved payment method when step 2 is reached
  useEffect(() => {
    if (step === 2 && user) {
      fetchPaymentMethod()
    }
  }, [step, user])

  const fetchPaymentMethod = async () => {
    try {
      const response: any = await authenticatedGet('/api/stripe/payment-method')
      if (response.success && response.data?.paymentMethod) {
        setPaymentMethod(response.data.paymentMethod)
        setUseSavedPaymentMethod(true) // Default to using saved payment method if available
      }
    } catch (error) {
      console.error('Error fetching payment method:', error)
    }
  }

  // Promo preview shown in Step 2 for mosque/business subscriptions.
  useEffect(() => {
    const previewPromo = async () => {
      if (step !== 2) return
      if (type !== 'mosque' && type !== 'business') return

      const enteredCode = promoCode.trim()
      if (!enteredCode) {
        setPromoPreview(null)
        setPromoPreviewError(null)
        return
      }

      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        const response: any = await authenticatedPost('/api/promos/preview', {
          code: enteredCode,
          subscriptionType: type,
          timezone,
          basePriceCents: Math.round(getCurrentPrice() * 100),
        })

        if (response.success && response.data) {
          setPromoPreview(response.data)
          setPromoPreviewError(null)
        } else {
          setPromoPreview(null)
          setPromoPreviewError(response.error || 'Unable to validate promo code')
        }
      } catch (error: any) {
        setPromoPreview(null)
        setPromoPreviewError(error.message || 'Unable to validate promo code')
      }
    }

    previewPromo()
  }, [step, promoCode, type, loadingPricing, pricing])

  const handlePaymentSuccess = async () => {
    setClientSecret(null)
    setConfirmationType('payment_intent')
    setStep(3)
    setIsProcessing(false)

    const subId = pendingSubscriptionIdRef.current || createdSubscriptionId
    if (subId) {
      try {
        await authenticatedPost('/api/notifications/send', {
          type: 'new_subscription',
          subscriptionId: subId,
          subscriptionType: type,
          entityName: formData.name || formData.title || formData.orgName || 'Unnamed'
        })
      } catch (notifError) {
        console.error('Failed to send notification:', notifError)
      }
      toast({
        title: "Subscription Created!",
        description: `Your ${type} subscription has been successfully created.`,
      })
    }
  }

  const handlePaymentCancel = () => {
    setClientSecret(null)
    setConfirmationType('payment_intent')
    setIsProcessing(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const fieldName = e.target.id
    const value = e.target.value
    handleFieldChange(fieldName, value)
    
    // Debug logging
    console.log('[Form Validation] Field changed:', fieldName, '=', value)
    console.log('[Form Validation] Current formData:', formData)
    console.log('[Form Validation] Is form valid?', isFormValid())
  }

  // Handle date changes for coupon validity period
  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date)
    if (date) {
      // Format date as YYYY-MM-DD for the form data
      const formattedDate = format(date, 'yyyy-MM-dd')
      setFormData({ ...formData, startDate: formattedDate })
    } else {
      const { startDate, ...rest } = formData
      setFormData(rest)
    }
  }

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date)
    if (date) {
      // Format date as YYYY-MM-DD for the form data
      const formattedDate = format(date, 'yyyy-MM-dd')
      setFormData({ ...formData, endDate: formattedDate })
    } else {
      const { endDate, ...rest } = formData
      setFormData(rest)
    }
  }

  const renderDetailsForm = () => {
    if (type === "mosque") {
      return (
        <>
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-primary">Your Mosque Code</h3>
            </div>
            <p className="text-3xl font-bold text-primary mb-2">#{nextMosqueCode}</p>
            <p className="text-sm text-muted-foreground">
              This unique code will be assigned to your mosque. Share it with local businesses and they can affiliate
              with your mosque. You{"'"}ll earn 10% of their monthly subscription fee as a kickback!
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Basic Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Mosque Name <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="name" 
                  value={formData.name || ''}
                  placeholder="Enter mosque name" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('name')}
                  className={touched.name && errors.name ? 'border-destructive' : ''}
                />
                {touched.name && errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">
                  Address <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="address" 
                  value={formData.address || ''}
                  placeholder="Full address" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('address')}
                  className={touched.address && errors.address ? 'border-destructive' : ''}
                />
                {touched.address && errors.address && (
                  <p className="text-sm text-destructive">{errors.address}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">
                  City <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="city" 
                  value={formData.city || ''}
                  placeholder="City" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('city')}
                  className={touched.city && errors.city ? 'border-destructive' : ''}
                />
                {touched.city && errors.city && (
                  <p className="text-sm text-destructive">{errors.city}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">
                  State <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="state" 
                  value={formData.state || ''}
                  placeholder="State" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('state')}
                  className={touched.state && errors.state ? 'border-destructive' : ''}
                />
                {touched.state && errors.state && (
                  <p className="text-sm text-destructive">{errors.state}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">
                  ZIP Code <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="zip" 
                  value={formData.zip || ''}
                  placeholder="ZIP" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('zip')}
                  className={touched.zip && errors.zip ? 'border-destructive' : ''}
                />
                {touched.zip && errors.zip && (
                  <p className="text-sm text-destructive">{errors.zip}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">
                  Country <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="country" 
                  value={formData.country || 'USA'}
                  placeholder="Country" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('country')}
                  className={touched.country && errors.country ? 'border-destructive' : ''}
                />
                {touched.country && errors.country && (
                  <p className="text-sm text-destructive">{errors.country}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={formData.email || ''}
                  placeholder="mosque@example.com" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('email')}
                  className={touched.email && errors.email ? 'border-destructive' : ''}
                />
                {touched.email && errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Mosque Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="phone" 
                  value={formData.phone || ''}
                  placeholder="+1 (555) 000-0000" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('phone')}
                  className={touched.phone && errors.phone ? 'border-destructive' : ''}
                />
                {touched.phone && errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">
                  Emergency Contact Name (Point of Contact)
                </Label>
                <Input 
                  id="emergencyContactName" 
                  value={formData.emergencyContactName || ''}
                  placeholder="Contact person name" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('emergencyContactName')}
                  className={touched.emergencyContactName && errors.emergencyContactName ? 'border-destructive' : ''}
                />
                {touched.emergencyContactName && errors.emergencyContactName && (
                  <p className="text-sm text-destructive">{errors.emergencyContactName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">
                  Emergency Contact Phone Number
                </Label>
                <Input 
                  id="emergencyContactPhone" 
                  value={formData.emergencyContactPhone || ''}
                  placeholder="+1 (555) 000-0000" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('emergencyContactPhone')}
                  className={touched.emergencyContactPhone && errors.emergencyContactPhone ? 'border-destructive' : ''}
                />
                {touched.emergencyContactPhone && errors.emergencyContactPhone && (
                  <p className="text-sm text-destructive">{errors.emergencyContactPhone}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input 
                  id="website" 
                  value={formData.website || ''}
                  placeholder="https://www.yourmasjid.org" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('website')}
                  className={touched.website && errors.website ? 'border-destructive' : ''}
                />
                {touched.website && errors.website && (
                  <p className="text-sm text-destructive">{errors.website}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name (Leader)</Label>
                <Input 
                  id="contactName" 
                  value={formData.contactName || ''}
                  placeholder="Imam name or administrator" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('contactName')}
                  className={touched.contactName && errors.contactName ? 'border-destructive' : ''}
                />
                {touched.contactName && errors.contactName && (
                  <p className="text-sm text-destructive">{errors.contactName}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Social Media</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input 
                  id="facebook" 
                  value={formData.facebook || ''}
                  placeholder="https://facebook.com/yourmasjid" 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input 
                  id="instagram" 
                  value={formData.instagram || ''}
                  placeholder="https://instagram.com/yourmasjid" 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter">X (Twitter)</Label>
                <Input 
                  id="twitter" 
                  value={formData.twitter || ''}
                  placeholder="https://twitter.com/yourmasjid" 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="youtube">YouTube</Label>
                <Input 
                  id="youtube" 
                  value={formData.youtube || ''}
                  placeholder="https://youtube.com/@yourmasjid" 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="google">Google Business</Label>
                <Input 
                  id="google" 
                  value={formData.google || ''}
                  placeholder="https://maps.google.com/yourmasjid" 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tiktok">TikTok</Label>
                <Input 
                  id="tiktok" 
                  value={formData.tiktok || ''}
                  placeholder="https://tiktok.com/@yourmasjid" 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherSocial">Other Social Media</Label>
                <Input 
                  id="otherSocial" 
                  value={formData.otherSocial || ''}
                  placeholder="Any other social links" 
                  onChange={handleInputChange} 
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Logo & Images</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Logo (PNG File) <span className="text-destructive">*</span>
                </Label>
                {!uploadedLogo && touched.logo && (
                  <p className="text-sm text-destructive">Logo is required</p>
                )}
                <div className="flex items-center gap-4">
                  {uploadedLogo ? (
                    <div className="relative">
                      <img
                        src={uploadedLogo || "/placeholder.svg"}
                        alt="Logo"
                        className={`h-20 w-20 object-contain rounded-lg border ${uploadingLogo ? 'opacity-50' : ''}`}
                      />
                      {uploadingLogo && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                        </div>
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => setUploadedLogo(null)}
                        disabled={uploadingLogo}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                      <Button variant="outline" onClick={() => logoInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Images (PNG or JPG Files) <span className="text-destructive">*</span>
                </Label>
                {uploadedImages.length === 0 && touched.images && (
                  <p className="text-sm text-destructive">At least one image is required</p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {uploadedImages.map((img, idx) => {
                    const isUploading = uploadingImages.has(img)
                    return (
                      <div key={idx} className="relative">
                        <img
                          src={img || "/placeholder.svg"}
                          alt={`Upload ${idx + 1}`}
                          className={`h-24 w-full object-cover rounded-lg ${isUploading ? 'opacity-50' : ''}`}
                        />
                        {isUploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                          </div>
                        )}
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={() => removeImage(idx)}
                          disabled={isUploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <Button variant="outline" className="h-24 bg-transparent" onClick={() => imageInputRef.current?.click()}>
                    <Plus className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Links & Services</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="donateLink">Donate Link</Label>
                <Input id="donateLink" placeholder="https://yourmasjid.org/donate" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prayerTimesLink">Prayer Times Link</Label>
                <Input
                  id="prayerTimesLink"
                  placeholder="https://yourmasjid.org/prayer-times"
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sundaySchoolLink">Sunday School Page Link</Label>
              <Input
                id="sundaySchoolLink"
                type="url"
                placeholder="https://yourmasjid.org/sunday-school"
                onChange={handleInputChange}
              />
              <p className="text-xs text-muted-foreground">Link to your Sunday School information page</p>
            </div>
            
            {/* Services Section - Dynamic entries with links */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Services Offered (Optional)</Label>
                  <p className="text-sm text-muted-foreground">Add services with links to more information</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setServiceCount(serviceCount + 1)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Service
                </Button>
              </div>
              <div className="space-y-3">
                {Array.from({ length: serviceCount }).map((_, idx) => (
                  <div key={idx} className="grid md:grid-cols-2 gap-3 p-3 border rounded-lg relative">
                    <Input
                      placeholder={`Service name (e.g., ${idx === 0 ? 'Counseling Services' : idx === 1 ? 'Nikah Services' : 'Funeral Services'})`}
                      onChange={(e) => {
                        const services = formData.services ? JSON.parse(formData.services) : []
                        services[idx] = { ...services[idx], name: e.target.value }
                        setFormData({ ...formData, services: JSON.stringify(services.filter((s: any) => s?.name || s?.link)) })
                      }}
                    />
                    <div className="flex gap-2">
                      <Input
                        type="url"
                        placeholder="Service page link (optional)"
                        className="flex-1"
                        onChange={(e) => {
                          const services = formData.services ? JSON.parse(formData.services) : []
                          services[idx] = { ...services[idx], link: e.target.value }
                          setFormData({ ...formData, services: JSON.stringify(services.filter((s: any) => s?.name || s?.link)) })
                        }}
                      />
                      {serviceCount > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setServiceCount(Math.max(1, serviceCount - 1))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Committee/Trustee Section - Dynamic entries with photos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Committee / Board of Trustees (Optional)</Label>
                  <p className="text-sm text-muted-foreground">Add committee members with their photos</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCommitteeMembers([...committeeMembers, { name: '', title: '', photo: '' }])
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Member
                </Button>
              </div>
              <div className="space-y-4">
                {committeeMembers.map((member, idx) => (
                  <div key={idx} className="grid md:grid-cols-3 gap-3 p-4 border rounded-lg relative">
                    <div className="space-y-2">
                      <Label className="text-sm">Photo</Label>
                      <div className="flex flex-col gap-2">
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png"
                          className="hidden"
                          id={`trustee-photo-${idx}`}
                          onChange={(e) => handleCommitteePhotoUpload(idx, e)}
                        />
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm"
                          onClick={() => document.getElementById(`trustee-photo-${idx}`)?.click()}
                          disabled={member.uploading}
                        >
                          {member.uploading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-1" />
                              {member.photo ? 'Change' : 'Upload'}
                            </>
                          )}
                        </Button>
                        {member.photo && !member.uploading && (
                          <div className="relative w-20 h-20 rounded-md overflow-hidden border">
                            <img src={member.photo} alt={member.name || 'Member'} className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                    <Input
                      placeholder="Full Name"
                      value={member.name}
                      onChange={(e) => {
                        const updated = [...committeeMembers]
                        updated[idx] = { ...updated[idx], name: e.target.value }
                        setCommitteeMembers(updated)
                      }}
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="Title / Role (e.g., President)"
                        className="flex-1"
                        value={member.title}
                        onChange={(e) => {
                          const updated = [...committeeMembers]
                          updated[idx] = { ...updated[idx], title: e.target.value }
                          setCommitteeMembers(updated)
                        }}
                      />
                      {committeeMembers.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setCommitteeMembers(committeeMembers.filter((_, i) => i !== idx))
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )
    }

    if (type === "business") {
      return (
        <>
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-primary">Mosque Affiliation (Optional)</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Enter a mosque code to support your local mosque. 10% of your monthly fee (${loadingPricing ? '...' : (getCurrentPrice() * 0.10).toFixed(2)}) will go to the mosque as a
              kickback.
            </p>
            <div className="space-y-2">
              <Label htmlFor="mosqueCode">Mosque Code</Label>
              {isMounted ? (
                <Select value={affiliatedMosqueCode} onValueChange={setAffiliatedMosqueCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a mosque or enter code" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Affiliation</SelectItem>
                    {availableMosques.map((mosque) => (
                      <SelectItem key={mosque.id} value={mosque.mosque_code.toString()}>
                        #{mosque.mosque_code} - {mosque.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Select a mosque or enter code</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Basic Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">
                  Business Name <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="title" 
                  value={formData.title || ''}
                  placeholder="Enter business name" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('title')}
                  className={touched.title && errors.title ? 'border-destructive' : ''}
                />
                {touched.title && errors.title && (
                  <p className="text-sm text-destructive">{errors.title}</p>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  placeholder="Describe your business..."
                  rows={4}
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('description')}
                  className={touched.description && errors.description ? 'border-destructive' : ''}
                />
                {touched.description && errors.description && (
                  <p className="text-sm text-destructive">{errors.description}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="categories">
                  Categories <span className="text-destructive">*</span>
                </Label>
                {isMounted ? (
                  <Select 
                    value={formData.categories || ''} 
                    onValueChange={(value) => {
                      setFormData((prev: any) => ({ ...prev, categories: value }))
                      // Clear the error by removing it from the errors object
                      setErrors((prev: any) => {
                        const newErrors = { ...prev }
                        delete newErrors.categories
                        return newErrors
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Automotive">Automotive</SelectItem>
                      <SelectItem value="Education and Training">Education and Training</SelectItem>
                      <SelectItem value="Entertainment & Events">Entertainment & Events</SelectItem>
                      <SelectItem value="Food & Dining">Food & Dining</SelectItem>
                      <SelectItem value="For Sale">For Sale</SelectItem>
                      <SelectItem value="Health & Wellness">Health & Wellness</SelectItem>
                      <SelectItem value="Home Improvement & Construction">Home Improvement & Construction</SelectItem>
                      <SelectItem value="Jobs">Jobs</SelectItem>
                      <SelectItem value="Marriage & Family Services">Marriage & Family Services</SelectItem>
                      <SelectItem value="Professional Services">Professional Services</SelectItem>
                      <SelectItem value="Retail & Shopping">Retail & Shopping</SelectItem>
                      <SelectItem value="Technology & Digital Services">Technology & Digital Services</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Select a category</span>
                  </div>
                )}
                {touched.categories && errors.categories && (
                  <p className="text-sm text-destructive">{errors.categories}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Business Photos</h3>
            <div className="space-y-2">
              <Label>
                Photos (Image Size: 4/3 ratio – 400*300) <span className="text-destructive">*</span>
              </Label>
              {uploadedImages.length === 0 && touched.images && (
                <p className="text-sm text-destructive">At least one image is required</p>
              )}
              <div className="grid grid-cols-3 gap-2">
              {uploadedImages.map((img, idx) => {
                const isUploading = uploadingImages.has(img)
                return (
                  <div key={idx} className="relative">
                    <img
                      src={img || "/placeholder.svg"}
                      alt={`Upload ${idx + 1}`}
                      className={`h-24 w-full object-cover rounded-lg ${isUploading ? 'opacity-50' : ''}`}
                    />
                    {isUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      </div>
                    )}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() => removeImage(idx)}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <Button variant="outline" className="h-24 bg-transparent" onClick={() => imageInputRef.current?.click()}>
                <Plus className="h-6 w-6" />
              </Button>
            </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Location</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">
                  Address <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="address" 
                  value={formData.address || ''}
                  placeholder="Street address" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('address')}
                  className={touched.address && errors.address ? 'border-destructive' : ''}
                />
                {touched.address && errors.address && (
                  <p className="text-sm text-destructive">{errors.address}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">
                  City <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="city" 
                  value={formData.city || ''}
                  placeholder="City" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('city')}
                  className={touched.city && errors.city ? 'border-destructive' : ''}
                />
                {touched.city && errors.city && (
                  <p className="text-sm text-destructive">{errors.city}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">
                  State <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="state" 
                  value={formData.state || ''}
                  placeholder="State" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('state')}
                  className={touched.state && errors.state ? 'border-destructive' : ''}
                />
                {touched.state && errors.state && (
                  <p className="text-sm text-destructive">{errors.state}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">
                  Zip <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="zip" 
                  value={formData.zip || ''}
                  placeholder="Zip code" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('zip')}
                  className={touched.zip && errors.zip ? 'border-destructive' : ''}
                />
                {touched.zip && errors.zip && (
                  <p className="text-sm text-destructive">{errors.zip}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">
                  Country <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="country" 
                  value={formData.country || 'USA'}
                  placeholder="Country" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('country')}
                  className={touched.country && errors.country ? 'border-destructive' : ''}
                />
                {touched.country && errors.country && (
                  <p className="text-sm text-destructive">{errors.country}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Contact Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Business Phone Number <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="phone" 
                  value={formData.phone || ''}
                  placeholder="+1 (555) 000-0000" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('phone')}
                  className={touched.phone && errors.phone ? 'border-destructive' : ''}
                />
                {touched.phone && errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  Business Email <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={formData.email || ''}
                  placeholder="business@example.com" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('email')}
                  className={touched.email && errors.email ? 'border-destructive' : ''}
                />
                {touched.email && errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">
                  Business Website <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="website" 
                  value={formData.website || ''}
                  placeholder="https://www.yourbusiness.com" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('website')}
                  className={touched.website && errors.website ? 'border-destructive' : ''}
                />
                {touched.website && errors.website && (
                  <p className="text-sm text-destructive">{errors.website}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="fax">Fax</Label>
                <Input 
                  id="fax" 
                  value={formData.fax || ''}
                  placeholder="+1 (555) 000-0000" 
                  onChange={handleInputChange} 
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Internal Contact Information</h3>
            <p className="text-sm text-muted-foreground">For internal use only, will not be displayed publicly</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name</Label>
                <Input 
                  id="contactName" 
                  value={formData.contactName || ''}
                  placeholder="Contact person name" 
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Cell Number</Label>
                <Input 
                  id="contactPhone" 
                  type="tel"
                  value={formData.contactPhone || ''}
                  placeholder="+1 (555) 000-0000" 
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input 
                  id="contactEmail" 
                  type="email"
                  value={formData.contactEmail || ''}
                  placeholder="contact@example.com" 
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Social Media</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook URL</Label>
                <Input 
                  id="facebook" 
                  value={formData.facebook || ''}
                  placeholder="https://facebook.com/yourbusiness" 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram URL</Label>
                <Input 
                  id="instagram" 
                  value={formData.instagram || ''}
                  placeholder="https://instagram.com/yourbusiness" 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter/X URL</Label>
                <Input 
                  id="twitter" 
                  value={formData.twitter || ''}
                  placeholder="https://twitter.com/yourbusiness" 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="youtube">YouTube URL</Label>
                <Input 
                  id="youtube" 
                  value={formData.youtube || ''}
                  placeholder="https://youtube.com/@yourbusiness" 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <Input 
                  id="linkedin" 
                  value={formData.linkedin || ''}
                  placeholder="https://linkedin.com/company/yourbusiness" 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tiktok">TikTok URL</Label>
                <Input 
                  id="tiktok" 
                  value={formData.tiktok || ''}
                  placeholder="https://tiktok.com/@yourbusiness" 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="google">Google URL</Label>
                <Input 
                  id="google" 
                  value={formData.google || ''}
                  placeholder="https://maps.google.com/yourbusiness" 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherSocial">Other Social Media</Label>
                <Input 
                  id="otherSocial" 
                  value={formData.otherSocial || ''}
                  placeholder="Any other social links" 
                  onChange={handleInputChange} 
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Additional Information</h3>
            <div className="space-y-2">
              <Label htmlFor="comments">Do you have any comments or questions for us?</Label>
              <Textarea
                id="comments"
                value={formData.comments || ''}
                placeholder="Enter any comments or questions..."
                rows={4}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Additional Donation (Optional)</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Would you like to donate more to the same organization or a different one?</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="donateSameOrgYes"
                      name="donateToSameOrganization"
                      checked={formData.donateToSameOrganization === true}
                      onChange={() => handleFieldChange("donateToSameOrganization", true)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="donateSameOrgYes" className="font-normal cursor-pointer">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="donateSameOrgNo"
                      name="donateToSameOrganization"
                      checked={formData.donateToSameOrganization === false}
                      onChange={() => handleFieldChange("donateToSameOrganization", false)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="donateSameOrgNo" className="font-normal cursor-pointer">No</Label>
                  </div>
                </div>
              </div>

              {formData.donateToSameOrganization === true && (
                <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label htmlFor="donationOrganizations">Select organizations to donate to</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      You can select multiple mosques or non-profit organizations
                    </p>
                    {isMounted ? (
                      <div className="space-y-2">
                        {/* Mosques Section */}
                        <div>
                          <p className="text-sm font-medium mb-2">Mosques</p>
                          <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                            {availableMosques.length > 0 ? (
                              availableMosques.map((mosque) => (
                                <div key={mosque.id} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`mosque-${mosque.id}`}
                                    checked={formData.donationOrganizations?.includes(`mosque-${mosque.mosque_code}`) || false}
                                    onChange={(e) => {
                                      const orgId = `mosque-${mosque.mosque_code}`
                                      const current = formData.donationOrganizations || []
                                      const updated = e.target.checked
                                        ? [...current, orgId]
                                        : current.filter((id: string) => id !== orgId)
                                      handleFieldChange("donationOrganizations", updated)
                                    }}
                                    className="h-4 w-4"
                                  />
                                  <Label htmlFor={`mosque-${mosque.id}`} className="font-normal cursor-pointer text-sm">
                                    #{mosque.mosque_code} - {mosque.name}
                                  </Label>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No mosques available</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Non-Profits Section */}
                        <div>
                          <p className="text-sm font-medium mb-2">Non-Profit Organizations</p>
                          <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                            {availableNonprofits.length > 0 ? (
                              availableNonprofits.map((nonprofit) => (
                                <div key={nonprofit.id} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`nonprofit-${nonprofit.id}`}
                                    checked={formData.donationOrganizations?.includes(`nonprofit-${nonprofit.id}`) || false}
                                    onChange={(e) => {
                                      const orgId = `nonprofit-${nonprofit.id}`
                                      const current = formData.donationOrganizations || []
                                      const updated = e.target.checked
                                        ? [...current, orgId]
                                        : current.filter((id: string) => id !== orgId)
                                      handleFieldChange("donationOrganizations", updated)
                                    }}
                                    className="h-4 w-4"
                                  />
                                  <Label htmlFor={`nonprofit-${nonprofit.id}`} className="font-normal cursor-pointer text-sm">
                                    {nonprofit.name}
                                  </Label>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No non-profit organizations available</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <span className="text-muted-foreground">Loading organizations...</span>
                      </div>
                    )}
                  </div>

                  {formData.donationOrganizations && formData.donationOrganizations.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="donationAmount">How much would you like to donate to each selected organization per month? ($)</Label>
                      <Input
                        id="donationAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.donationAmount || ''}
                        placeholder="Enter amount (e.g., 10.00)"
                        onChange={handleInputChange}
                      />
                      <p className="text-xs text-muted-foreground">
                        Total monthly donation: ${((parseFloat(formData.donationAmount) || 0) * (formData.donationOrganizations?.length || 0)).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )
    }

    if (type === "coupon") {
      return (
        <>
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-primary">Mosque Affiliation (Optional)</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Enter a mosque code to support your local mosque. 10% of your monthly fee (${loadingPricing ? '...' : (getCurrentPrice() * 0.10).toFixed(2)}) will go to the mosque as a
              kickback.
            </p>
            <div className="space-y-2">
              <Label htmlFor="mosqueCode">Mosque Code</Label>
              {isMounted ? (
                <Select value={affiliatedMosqueCode} onValueChange={setAffiliatedMosqueCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a mosque or enter code" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Affiliation</SelectItem>
                    {availableMosques.map((mosque) => (
                      <SelectItem key={mosque.id} value={mosque.mosque_code.toString()}>
                        #{mosque.mosque_code} - {mosque.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Select a mosque or enter code</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Basic Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="title" 
                  value={formData.title || ''}
                  placeholder="e.g., 10% Off First Order" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('title')}
                  className={touched.title && errors.title ? 'border-destructive' : ''}
                />
                {touched.title && errors.title && (
                  <p className="text-sm text-destructive">{errors.title}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="merchant">
                  Merchant <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="merchant" 
                  value={formData.merchant || ''}
                  placeholder="Your business name" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('merchant')}
                  className={touched.merchant && errors.merchant ? 'border-destructive' : ''}
                />
                {touched.merchant && errors.merchant && (
                  <p className="text-sm text-destructive">{errors.merchant}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="phone" 
                  value={formData.phone || ''}
                  placeholder="+1 (555) 000-0000" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('phone')}
                  className={touched.phone && errors.phone ? 'border-destructive' : ''}
                />
                {touched.phone && errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={formData.email || ''}
                  placeholder="coupons@yourbusiness.com" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('email')}
                  className={touched.email && errors.email ? 'border-destructive' : ''}
                />
                {touched.email && errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input 
                  id="website" 
                  value={formData.website || ''}
                  placeholder="https://www.yourbusiness.com" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('website')}
                  className={touched.website && errors.website ? 'border-destructive' : ''}
                />
                {touched.website && errors.website && (
                  <p className="text-sm text-destructive">{errors.website}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Redemption Options</h3>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="unlimited"
                    name="redemptionType"
                    value="unlimited"
                    checked={formData.redemptionType === 'unlimited'}
                    onChange={(e) => setFormData({ ...formData, redemptionType: e.target.value, redeemLimit: '', redeemPeriod: '' })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="unlimited" className="font-normal cursor-pointer">
                    Unlimited - No restrictions on redemptions
                  </Label>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="limited"
                      name="redemptionType"
                      value="limited"
                      checked={formData.redemptionType === 'limited'}
                      onChange={(e) => setFormData({ ...formData, redemptionType: e.target.value })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="limited" className="font-normal cursor-pointer">
                      Limited Redemptions
                    </Label>
                  </div>
                  
                  {formData.redemptionType === 'limited' && (
                    <div className="ml-6 grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="redeemLimit">Number of Redemptions</Label>
                        <Input
                          id="redeemLimit"
                          type="number"
                          min="1"
                          placeholder="e.g., 1, 2, 3"
                          value={formData.redeemLimit || ''}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="redeemPeriod">Per Period</Label>
                        {isMounted ? (
                          <Select
                            value={formData.redeemPeriod || ''}
                            onValueChange={(value) => setFormData({ ...formData, redeemPeriod: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select period" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                        ) : (
                          <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                            <span className="text-muted-foreground">Select period</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Examples: "3 redemptions per week" or "1 redemption per month"
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Discount Details</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="discountAmount">Discount Amount</Label>
                <Input id="discountAmount" placeholder="e.g., $5 off, $2000 off" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountPercentage">Discount Percentage</Label>
                <Input id="discountPercentage" placeholder="e.g., 10%, 20%" onChange={handleInputChange} />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="discountDetails">Discount Details (Please explain your offer to customers)</Label>
              <Textarea
                id="discountDetails"
                placeholder="Example: Buy Spicy chicken Sandwich and get a second one free - limit one per customer per visit&#10;&#10;OR&#10;&#10;Get $2000 off any used car priced $15,000 and up - limit one car per customer or by household"
                rows={5}
                onChange={handleInputChange}
              />
              <p className="text-xs text-muted-foreground">
                Be specific about what the customer gets and any restrictions or limitations
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Validity Period</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={handleStartDateChange}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick an end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={handleEndDateChange}
                      disabled={(date) => {
                        const today = new Date(new Date().setHours(0, 0, 0, 0))
                        // Disable dates before today and before start date
                        if (startDate) {
                          return date < today || date < startDate
                        }
                        return date < today
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Description & Display</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  placeholder="Full description of the offer..."
                  rows={3}
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('description')}
                  className={touched.description && errors.description ? 'border-destructive' : ''}
                />
                {touched.description && errors.description && (
                  <p className="text-sm text-destructive">{errors.description}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="thumbnailDescription">Thumbnail Description</Label>
                <Input
                  id="thumbnailDescription"
                  value={formData.thumbnailDescription || ''}
                  placeholder="Short text for thumbnail display"
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="popUpText">Pop Up Text</Label>
                <Textarea
                  id="popUpText"
                  value={formData.popUpText || ''}
                  placeholder="Text to show in pop-up..."
                  rows={2}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Image (Recommended: 320px width)</h3>
            <div className="grid grid-cols-3 gap-2">
              {uploadedImages.map((img, idx) => {
                const isUploading = uploadingImages.has(img)
                return (
                  <div key={idx} className="relative">
                    <img
                      src={img || "/placeholder.svg"}
                      alt={`Upload ${idx + 1}`}
                      className={`h-24 w-full object-cover rounded-lg ${isUploading ? 'opacity-50' : ''}`}
                    />
                    {isUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      </div>
                    )}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() => removeImage(idx)}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <Button variant="outline" className="h-24 bg-transparent" onClick={() => imageInputRef.current?.click()}>
                <Plus className="h-6 w-6" />
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Location</h3>
            <div className="space-y-2">
              <Label htmlFor="address">
                Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="address"
                value={formData.address || ''}
                placeholder="Full address where coupon can be redeemed"
                onChange={handleInputChange}
                onBlur={() => handleFieldBlur('address')}
                className={touched.address && errors.address ? 'border-destructive' : ''}
              />
              {touched.address && errors.address && (
                <p className="text-sm text-destructive">{errors.address}</p>
              )}
            </div>
          </div>
        </>
      )
    }

    if (type === "nonprofit") {
      return (
        <>
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-primary">Mosque Affiliation (Optional)</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Enter a mosque code to support your local mosque. 10% of your monthly fee (${loadingPricing ? '...' : (getCurrentPrice() * 0.10).toFixed(2)}) will go to the mosque as a
              kickback.
            </p>
            <div className="space-y-2">
              <Label htmlFor="mosqueCode">Mosque Code</Label>
              {isMounted ? (
                <Select value={affiliatedMosqueCode} onValueChange={setAffiliatedMosqueCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a mosque or enter code" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Affiliation</SelectItem>
                    {availableMosques.map((mosque) => (
                      <SelectItem key={mosque.id} value={mosque.mosque_code.toString()}>
                        #{mosque.mosque_code} - {mosque.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Select a mosque or enter code</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Basic Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="orgName">
                  Organization Name <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="orgName" 
                  value={formData.orgName || ''}
                  placeholder="Enter organization name" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('orgName')}
                  className={touched.orgName && errors.orgName ? 'border-destructive' : ''}
                />
                {touched.orgName && errors.orgName && (
                  <p className="text-sm text-destructive">{errors.orgName}</p>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">
                  Address <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="address" 
                  value={formData.address || ''}
                  placeholder="Street address" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('address')}
                  className={touched.address && errors.address ? 'border-destructive' : ''}
                />
                {touched.address && errors.address && (
                  <p className="text-sm text-destructive">{errors.address}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">
                  City <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="city" 
                  value={formData.city || ''}
                  placeholder="City" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('city')}
                  className={touched.city && errors.city ? 'border-destructive' : ''}
                />
                {touched.city && errors.city && (
                  <p className="text-sm text-destructive">{errors.city}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">
                  State <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="state" 
                  value={formData.state || ''}
                  placeholder="State" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('state')}
                  className={touched.state && errors.state ? 'border-destructive' : ''}
                />
                {touched.state && errors.state && (
                  <p className="text-sm text-destructive">{errors.state}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">
                  ZIP Code <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="zip" 
                  value={formData.zip || ''}
                  placeholder="ZIP" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('zip')}
                  className={touched.zip && errors.zip ? 'border-destructive' : ''}
                />
                {touched.zip && errors.zip && (
                  <p className="text-sm text-destructive">{errors.zip}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">
                  Country <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="country" 
                  value={formData.country || 'USA'}
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('country')}
                  className={touched.country && errors.country ? 'border-destructive' : ''}
                />
                {touched.country && errors.country && (
                  <p className="text-sm text-destructive">{errors.country}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Contact Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  value={formData.phone || ''}
                  placeholder="+1 (555) 000-0000" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('phone')}
                  className={touched.phone && errors.phone ? 'border-destructive' : ''}
                />
                {touched.phone && errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  placeholder="contact@nonprofit.org"
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('email')}
                  className={touched.email && errors.email ? 'border-destructive' : ''}
                />
                {touched.email && errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input 
                  id="website" 
                  type="url" 
                  value={formData.website || ''}
                  placeholder="https://yournonprofit.org" 
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('website')}
                  className={touched.website && errors.website ? 'border-destructive' : ''}
                />
                {touched.website && errors.website && (
                  <p className="text-sm text-destructive">{errors.website}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Person Name</Label>
                <Input 
                  id="contactName" 
                  value={formData.contactName || ''}
                  placeholder="Primary contact name" 
                  onChange={handleInputChange} 
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Social Media</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input 
                  id="facebook" 
                  value={formData.facebook || ''}
                  placeholder="https://facebook.com/yourorg" 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input 
                  id="instagram" 
                  value={formData.instagram || ''}
                  placeholder="https://instagram.com/yourorg" 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter">X (Twitter)</Label>
                <Input 
                  id="twitter" 
                  value={formData.twitter || ''}
                  placeholder="https://twitter.com/yourorg" 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="youtube">YouTube</Label>
                <Input 
                  id="youtube" 
                  value={formData.youtube || ''}
                  placeholder="https://youtube.com/@yourorg" 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="google">Google Business</Label>
                <Input 
                  id="google" 
                  value={formData.google || ''}
                  placeholder="https://maps.google.com/yourorg" 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tiktok">TikTok</Label>
                <Input 
                  id="tiktok" 
                  value={formData.tiktok || ''}
                  placeholder="https://tiktok.com/@yourorg" 
                  onChange={handleInputChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherSocial">Other Social Media</Label>
                <Input 
                  id="otherSocial" 
                  value={formData.otherSocial || ''}
                  placeholder="https://..." 
                  onChange={handleInputChange} 
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Organization Details</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">
                  About Organization <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  placeholder="Tell us about your organization's mission and impact..."
                  rows={4}
                  onChange={handleInputChange}
                  onBlur={() => handleFieldBlur('description')}
                  className={touched.description && errors.description ? 'border-destructive' : ''}
                />
                {touched.description && errors.description && (
                  <p className="text-sm text-destructive">{errors.description}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Media</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Organization Logo (PNG or JPG) *</Label>
                <div className="space-y-2">
                  {uploadedLogo ? (
                    <div className="relative w-fit">
                      <img
                        src={uploadedLogo || "/placeholder.svg"}
                        alt="Logo"
                        className={`h-32 w-32 object-contain rounded-lg border ${uploadingLogo ? 'opacity-50' : ''}`}
                      />
                      {uploadingLogo && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                        </div>
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => setUploadedLogo(null)}
                        disabled={uploadingLogo}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                      <Button variant="outline" onClick={() => logoInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Images (PNG or JPG Files) <span className="text-destructive">*</span>
                </Label>
                {uploadedImages.length === 0 && touched.images && (
                  <p className="text-sm text-destructive">At least one image is required</p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {uploadedImages.map((img, idx) => {
                    const isUploading = uploadingImages.has(img)
                    return (
                      <div key={idx} className="relative">
                        <img
                          src={img || "/placeholder.svg"}
                          alt={`Upload ${idx + 1}`}
                          className={`h-24 w-full object-cover rounded-lg ${isUploading ? 'opacity-50' : ''}`}
                        />
                        {isUploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                            <Loader2 className="h-6 w-6 text-white animate-spin" />
                          </div>
                        )}
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={() => removeImage(idx)}
                          disabled={isUploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <Button variant="outline" className="h-24 bg-transparent" onClick={() => imageInputRef.current?.click()}>
                    <Plus className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Links & Programs</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="donateLink">Donate Link *</Label>
                <Input
                  id="donateLink"
                  type="url"
                  required
                  placeholder="https://donate.yournonprofit.org"
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sundaySchoolLink">Programs/Events Page Link</Label>
                <Input
                  id="sundaySchoolLink"
                  type="url"
                  placeholder="https://yourorg.org/programs"
                  onChange={handleInputChange}
                />
                <p className="text-xs text-muted-foreground">Link to your programs or events page</p>
              </div>
            </div>
            
            {/* Services Section - Dynamic entries */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Services/Programs Offered (Optional)</Label>
                  <p className="text-sm text-muted-foreground">Add services with links to more information</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setServiceCount(serviceCount + 1)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Program
                </Button>
              </div>
              <div className="space-y-3">
                {Array.from({ length: serviceCount }).map((_, idx) => (
                  <div key={idx} className="grid md:grid-cols-2 gap-3 p-3 border rounded-lg">
                    <Input
                      placeholder={`Program name (e.g., ${idx === 0 ? 'Food Bank' : idx === 1 ? 'Youth Programs' : 'Community Outreach'})`}
                      onChange={(e) => {
                        const services = formData.services ? JSON.parse(formData.services) : []
                        services[idx] = { ...services[idx], name: e.target.value }
                        setFormData({ ...formData, services: JSON.stringify(services.filter((s: any) => s?.name || s?.link)) })
                      }}
                    />
                    <div className="flex gap-2">
                      <Input
                        type="url"
                        placeholder="Program page link (optional)"
                        className="flex-1"
                        onChange={(e) => {
                          const services = formData.services ? JSON.parse(formData.services) : []
                          services[idx] = { ...services[idx], link: e.target.value }
                          setFormData({ ...formData, services: JSON.stringify(services.filter((s: any) => s?.name || s?.link)) })
                        }}
                      />
                      {serviceCount > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setServiceCount(Math.max(1, serviceCount - 1))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Committee Section - Dynamic entries */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Board Members / Leadership Team (Optional)</Label>
                  <p className="text-sm text-muted-foreground">Add board members with their photos</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCommitteeMembers([...committeeMembers, { name: '', title: '', photo: '' }])
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Member
                </Button>
              </div>
              <div className="space-y-4">
                {committeeMembers.map((member, idx) => (
                  <div key={idx} className="grid md:grid-cols-3 gap-3 p-4 border rounded-lg">
                    <div className="space-y-2">
                      <Label className="text-sm">Photo</Label>
                      <div className="flex flex-col gap-2">
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png"
                          className="hidden"
                          id={`board-photo-${idx}`}
                          onChange={(e) => handleCommitteePhotoUpload(idx, e)}
                        />
                        <Button 
                          type="button"
                          variant="outline" 
                          size="sm"
                          onClick={() => document.getElementById(`board-photo-${idx}`)?.click()}
                          disabled={member.uploading}
                        >
                          {member.uploading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-1" />
                              {member.photo ? 'Change' : 'Upload'}
                            </>
                          )}
                        </Button>
                        {member.photo && !member.uploading && (
                          <div className="relative w-20 h-20 rounded-md overflow-hidden border">
                            <img src={member.photo} alt={member.name || 'Member'} className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                    <Input
                      placeholder="Full Name"
                      value={member.name}
                      onChange={(e) => {
                        const updated = [...committeeMembers]
                        updated[idx] = { ...updated[idx], name: e.target.value }
                        setCommitteeMembers(updated)
                      }}
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="Title / Role (e.g., Director)"
                        className="flex-1"
                        value={member.title}
                        onChange={(e) => {
                          const updated = [...committeeMembers]
                          updated[idx] = { ...updated[idx], title: e.target.value }
                          setCommitteeMembers(updated)
                        }}
                      />
                      {committeeMembers.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setCommitteeMembers(committeeMembers.filter((_, i) => i !== idx))
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )
    }

    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex items-center gap-4 px-6 py-4">
          <Link href="/member" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{info.title}</h1>
              <p className="text-sm text-muted-foreground">
                {loadingPricing ? 'Loading...' : `$${getCurrentPrice()}/month`}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {step > 1 ? <Check className="h-4 w-4" /> : "1"}
            </div>
            <div className={`h-1 w-16 ${step >= 2 ? "bg-primary" : "bg-secondary"}`} />
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {step > 2 ? <Check className="h-4 w-4" /> : "2"}
            </div>
            <div className={`h-1 w-16 ${step >= 3 ? "bg-primary" : "bg-secondary"}`} />
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 3 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {step > 3 ? <Check className="h-4 w-4" /> : "3"}
            </div>
          </div>
        </div>

        {/* Coupon Promotion Image - Show at top for coupon type */}
        {type === "coupon" && (
          <div className="mb-6 rounded-lg overflow-hidden shadow-md border border-border bg-black">
            <div className="relative w-full h-[280px] md:h-[320px]">
              <NextImage
                src="/image.png"
                alt="Buy 1 Get 1 Free Falafel Wrap"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
        )}

        {/* Step 1: Details */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Enter Details</CardTitle>
              <CardDescription>{info.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderDetailsForm()}
              {(type === "mosque" || type === "business") && (
                <div className="space-y-2">
                  <Label>Promo Code (optional)</Label>
                  <Input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter promo code created by admin"
                  />
                </div>
              )}
              <div className="space-y-2">
                {!isFormValid() && (
                  <div className="text-sm text-destructive text-center space-y-1">
                    <p className="font-semibold">Please complete the following:</p>
                    {(() => {
                      const missing = []
                      let fieldsToCheck: string[] = []
                      
                      if (type === 'mosque') {
                        fieldsToCheck = ['name', 'address', 'city', 'state', 'zip', 'country', 'email', 'phone']
                      } else if (type === 'business') {
                        fieldsToCheck = ['title', 'categories', 'address', 'city', 'state', 'zip', 'country', 'email', 'phone', 'website', 'description']
                      } else if (type === 'coupon') {
                        fieldsToCheck = ['title', 'merchant', 'description', 'phone', 'email', 'address']
                      } else if (type === 'nonprofit') {
                        fieldsToCheck = ['orgName', 'address', 'city', 'state', 'zip', 'country', 'email', 'phone', 'description']
                      }
                      
                      // Check required fields
                      const fieldLabels: Record<string, string> = {
                        title: 'Business Name',
                        name: 'Name',
                        orgName: 'Organization Name',
                        categories: 'Categories',
                        description: 'Description',
                        address: 'Address',
                        city: 'City',
                        state: 'State',
                        zip: 'ZIP Code',
                        country: 'Country',
                        email: 'Email',
                        phone: 'Phone',
                        website: 'Website',
                        merchant: 'Merchant',
                      }
                      
                      fieldsToCheck.forEach(field => {
                        const value = formData[field]
                        if (!value || String(value).trim() === '') {
                          const label = fieldLabels[field] || field.charAt(0).toUpperCase() + field.slice(1)
                          missing.push(`• ${label} is required`)
                        }
                      })
                      
                      // Check logo (not required for business and coupon)
                      if (type !== 'business' && type !== 'coupon' && !uploadedLogo) {
                        missing.push('• Logo upload is required')
                      }
                      
                      // Check images
                      if (uploadedImages.length === 0) {
                        missing.push('• At least one image is required')
                      }
                      
                      // Check coupon specific
                      if (type === 'coupon') {
                        if (!startDate || !formData.startDate) {
                          missing.push('• Start date is required')
                        }
                        if (!formData.discountAmount && !formData.discountPercentage) {
                          missing.push('• Discount amount or percentage is required')
                        }
                      }
                      
                      // Check validation errors (only show non-empty errors)
                      if (Object.keys(errors).length > 0) {
                        Object.entries(errors).forEach(([field, error]) => {
                          if (error && error.trim()) {
                            missing.push(`• ${error}`)
                          }
                          // Don't show anything for empty error strings - they should be deleted instead
                        })
                      }
                      
                      // If no specific errors but form is invalid, show generic message
                      if (missing.length === 0) {
                        missing.push('• Please check all required fields')
                      }
                      
                      return missing.map((msg, idx) => <p key={idx} className="text-xs">{msg}</p>)
                    })()}
                  </div>
                )}
                <Button 
                  onClick={() => setStep(2)} 
                  className="w-full"
                  disabled={!isFormValid()}
                >
                  Continue to Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Payment Summary */}
        {step === 2 && !clientSecret && (
          <Card>
            <CardHeader>
              <CardTitle>Confirm Subscription</CardTitle>
              <CardDescription>Review your subscription details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-secondary">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground">{info.title}</span>
                  <span className="font-semibold">
                    {loadingPricing
                      ? 'Loading...'
                      : promoPreview?.pricing?.effectivePriceCents !== undefined
                        ? `$${(promoPreview.pricing.effectivePriceCents / 100).toFixed(2)}/month`
                        : `$${getCurrentPrice()}/month`}
                  </span>
                </div>
                {promoPreview?.pricing?.discountCents > 0 && (
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Promo ({promoPreview?.promo?.code})</span>
                    <span className="text-green-600">-${(promoPreview.pricing.discountCents / 100).toFixed(2)}/month</span>
                  </div>
                )}
                {promoPreviewError && (
                  <div className="text-sm text-destructive mb-2">
                    Promo not applied: {promoPreviewError}
                  </div>
                )}
                {promoPreview?.promo?.benefitSchedule && (
                  <p className="text-xs text-muted-foreground mt-2">
                    This promo pricing applies for {promoPreview.promo.benefitSchedule.months} months after signup
                    (through {promoPreview.promo.benefitSchedule.pricingEndsOnInclusive} inclusive, in your timezone).
                  </p>
                )}
                {promoPreview?.promo?.redeemByDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    This code must be redeemed on or before {promoPreview.promo.redeemByDate}.
                  </p>
                )}
                {(type === "business" || type === "coupon" || type === "nonprofit") &&
                  affiliatedMosqueCode &&
                  affiliatedMosqueCode !== "none" && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Mosque Kickback (10%)</span>
                      <span className="text-primary">
                        ${loadingPricing ? '...' : (getCurrentPrice() * 0.10).toFixed(2)} to Mosque #{affiliatedMosqueCode}
                      </span>
                    </div>
                  )}
                {type === "business" &&
                  formData.donateToSameOrganization === true &&
                  formData.donationAmount &&
                  parseFloat(formData.donationAmount) > 0 &&
                  formData.donationOrganizations &&
                  formData.donationOrganizations.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Additional Donations:</span>
                      </div>
                      {formData.donationOrganizations.map((orgId: string) => {
                        const amount = parseFloat(formData.donationAmount || '0')
                        const orgName = orgId.startsWith('mosque-') 
                          ? `Mosque #${orgId.replace('mosque-', '')}`
                          : availableNonprofits.find((np: any) => `nonprofit-${np.id}` === orgId)?.name || 'Organization'
                        return (
                          <div key={orgId} className="flex items-center justify-between text-xs ml-4">
                            <span className="text-muted-foreground">{orgName}</span>
                            <span className="text-primary">${amount.toFixed(2)}</span>
                          </div>
                        )
                      })}
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span className="text-muted-foreground">Total Donations:</span>
                        <span className="text-primary">
                          ${(parseFloat(formData.donationAmount || '0') * formData.donationOrganizations.length).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                <Separator className="my-2" />
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg">
                    {loadingPricing ? 'Loading...' : (() => {
                      const basePrice = promoPreview?.pricing?.effectivePriceCents !== undefined
                        ? promoPreview.pricing.effectivePriceCents / 100
                        : getCurrentPrice()
                      const donationAmount = type === "business" &&
                        formData.donateToSameOrganization === true &&
                        formData.donationAmount &&
                        parseFloat(formData.donationAmount) > 0 &&
                        formData.donationOrganizations &&
                        formData.donationOrganizations.length > 0
                        ? parseFloat(formData.donationAmount || '0') * formData.donationOrganizations.length
                        : 0
                      const total = basePrice + donationAmount
                      return `$${total.toFixed(2)}/month`
                    })()}
                  </span>
                </div>
              </div>

              {/* Show saved payment method if available */}
              {paymentMethod && (
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="use-saved-pm" className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        id="use-saved-pm"
                        checked={useSavedPaymentMethod}
                        onChange={(e) => setUseSavedPaymentMethod(e.target.checked)}
                        className="rounded"
                      />
                      <span>Use saved payment method</span>
                    </Label>
                  </div>
                  {useSavedPaymentMethod && (
                    <div className="mt-2 p-3 bg-secondary rounded-lg flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {paymentMethod.brand.charAt(0).toUpperCase() + paymentMethod.brand.slice(1)} •••• {paymentMethod.last4}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Expires {String(paymentMethod.expMonth).padStart(2, '0')}/{String(paymentMethod.expYear).slice(-2)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1" disabled={isProcessing}>
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={isProcessing || !isFormValid()} className="flex-1">
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Continue to Payment
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Form (shown when clientSecret is available) */}
        {step === 2 && clientSecret && (
          <Card>
            <CardHeader>
              <CardTitle>
                {confirmationType === 'setup_intent' ? 'Add payment method' : 'Complete Payment'}
              </CardTitle>
              <CardDescription>
                {confirmationType === 'setup_intent'
                  ? 'Your plan is $0 during the promotional period. Add a card on file for when regular billing begins.'
                  : 'Enter your payment details to activate your subscription'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                  },
                }}
              >
                <PaymentConfirmationForm
                  clientSecret={clientSecret}
                  confirmationType={confirmationType}
                  onSuccess={handlePaymentSuccess}
                  onCancel={handlePaymentCancel}
                />
              </Elements>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 mx-auto mb-4">
                <Check className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Subscription Active!</h2>
              <p className="text-muted-foreground mb-4">
                Your {type} subscription has been successfully activated.
                {type === "mosque" && (
                  <span className="block mt-2 text-primary font-semibold">
                    Your mosque code is #{nextMosqueCode}. Share it with local businesses!
                  </span>
                )}
                {(type === "business" || type === "coupon") &&
                  affiliatedMosqueCode &&
                  affiliatedMosqueCode !== "none" && (
                    <span className="block mt-2 text-primary">
                      10% of your fee will support Mosque #{affiliatedMosqueCode}
                    </span>
                  )}
              </p>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">📋 Verification in Progress</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your {type} will be reviewed and added to the Amanah app within 1-2 business days after verification
                  by our staff team.
                </p>
              </div>
              <Button asChild>
                <Link href="/member">Return to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
