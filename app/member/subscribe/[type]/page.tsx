"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Building2, Store, Ticket, CreditCard, Check, Plus, X, Upload, Info, Users, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { authenticatedPost, authenticatedGet } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { useAuth } from "@/lib/auth-context"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

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
  onSuccess, 
  onCancel 
}: { 
  clientSecret: string
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
          {isLoading ? 'Processing...' : 'Complete Payment'}
        </Button>
      </div>
    </form>
  )
}

export default function SubscribePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const type = params.type as "mosque" | "business" | "coupon" | "nonprofit"

  const [step, setStep] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [uploadedLogo, setUploadedLogo] = useState<string | null>(null)
  const [affiliatedMosqueCode, setAffiliatedMosqueCode] = useState<string>("")
  const [formData, setFormData] = useState<any>({}) // Store all form data
  const [availableMosques, setAvailableMosques] = useState<any[]>([])
  const [nextMosqueCode, setNextMosqueCode] = useState<number>(1)
  const [createdSubscriptionId, setCreatedSubscriptionId] = useState<string | null>(null)
  
  // Stripe payment state
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<any>(null)
  const [useSavedPaymentMethod, setUseSavedPaymentMethod] = useState(false)
  
  // Optimistic UI state for uploads
  const [uploadingImages, setUploadingImages] = useState<Set<string>>(new Set())
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // File input refs
  const logoInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const info = subscriptionInfo[type]
  const Icon = info?.icon || Building2

  // Fetch active mosques on mount
  useEffect(() => {
    const fetchMosques = async () => {
      try {
        const { data, error } = await supabase
          .from('mosques')
          .select('id, name, mosque_code, status')
          .eq('status', 'active')
          .order('mosque_code', { ascending: true })

        if (!error && data) {
          setAvailableMosques(data)
        }
      } catch (error) {
        console.error('Error fetching mosques:', error)
      }
    }

    fetchMosques()
  }, [])

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

  const handleSubmit = async () => {
    setIsProcessing(true)
    
    try {
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
        paymentMethodId: paymentMethodId
      })

      if (response.success) {
        setCreatedSubscriptionId(response.data.subscription.id)
        
        // If clientSecret is returned, we need to confirm the payment
        if (response.data.clientSecret && (!useSavedPaymentMethod || !paymentMethod)) {
          // Show payment form
          setClientSecret(response.data.clientSecret)
          // Wait for payment confirmation (handled by PaymentConfirmationForm)
          return
        } else if (response.data.clientSecret && useSavedPaymentMethod && paymentMethod) {
          // Confirm payment with saved payment method
          const stripe = await stripePromise
          if (!stripe) {
            throw new Error('Stripe not loaded')
          }

          const { error: confirmError } = await stripe.confirmCardPayment(response.data.clientSecret, {
            payment_method: paymentMethod.id,
          })

          if (confirmError) {
            throw confirmError
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

  const handlePaymentSuccess = () => {
    setClientSecret(null)
    setStep(3)
    setIsProcessing(false)
  }

  const handlePaymentCancel = () => {
    setClientSecret(null)
    setIsProcessing(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
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
                <Label htmlFor="name">Mosque Name *</Label>
                <Input id="name" placeholder="Enter mosque name" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input id="address" placeholder="Full address" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input id="email" type="email" placeholder="mosque@example.com" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" placeholder="+1 (555) 000-0000" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" placeholder="https://www.yourmasjid.org" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name (Leader) *</Label>
                <Input id="contactName" placeholder="Imam name or administrator" onChange={handleInputChange} />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Social Media</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input id="facebook" placeholder="https://facebook.com/yourmasjid" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input id="instagram" placeholder="https://instagram.com/yourmasjid" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter">X (Twitter)</Label>
                <Input id="twitter" placeholder="https://twitter.com/yourmasjid" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherSocial">Other Social Media</Label>
                <Input id="otherSocial" placeholder="Any other social links" onChange={handleInputChange} />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Logo & Images</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Logo (PNG File)</Label>
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
                <Label>Images (PNG or JPG Files)</Label>
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
              <Label htmlFor="sundaySchool">Sunday School</Label>
              <Textarea
                id="sundaySchool"
                placeholder="Describe your Sunday School program, timings, etc."
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="services">Services</Label>
              <Textarea
                id="services"
                placeholder="List services offered (Jummah, Nikah, Funeral, Counseling, etc.)"
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="committee">Committee Members</Label>
              <Textarea
                id="committee"
                placeholder="List committee members and their roles"
                onChange={handleInputChange}
              />
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
              Enter a mosque code to support your local mosque. 10% of your monthly fee ($1) will go to the mosque as a
              kickback.
            </p>
            <div className="space-y-2">
              <Label htmlFor="mosqueCode">Mosque Code</Label>
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
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Basic Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Business Title *</Label>
                <Input id="title" placeholder="Enter business name" onChange={handleInputChange} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your business..."
                  rows={4}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categories">Categories *</Label>
                <Input
                  id="categories"
                  placeholder="e.g., Restaurant, Retail, Services (comma separated)"
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subCategories">Sub Categories</Label>
                <Input
                  id="subCategories"
                  placeholder="e.g., Halal, Mediterranean (comma separated)"
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Photos (Image Size: 4/3 ratio – 400*300)</h3>
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
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address *</Label>
                <Input id="address" placeholder="Street address" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input id="city" placeholder="City" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input id="state" placeholder="State" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">Zip *</Label>
                <Input id="zip" placeholder="Zip code" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input id="country" placeholder="Country" defaultValue="USA" onChange={handleInputChange} />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Contact Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" placeholder="+1 (555) 000-0000" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fax">Fax</Label>
                <Input id="fax" placeholder="+1 (555) 000-0000" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="business@example.com" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" placeholder="https://www.yourbusiness.com" onChange={handleInputChange} />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Social Media</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input id="facebook" placeholder="https://facebook.com/yourbusiness" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input id="instagram" placeholder="https://instagram.com/yourbusiness" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter">X (Twitter)</Label>
                <Input id="twitter" placeholder="https://twitter.com/yourbusiness" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherSocial">Other</Label>
                <Input id="otherSocial" placeholder="Any other social links" onChange={handleInputChange} />
              </div>
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
              Enter a mosque code to support your local mosque. 10% of your monthly fee ($1) will go to the mosque as a
              kickback.
            </p>
            <div className="space-y-2">
              <Label htmlFor="mosqueCode">Mosque Code</Label>
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
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Basic Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" placeholder="e.g., 10% Off First Order" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="merchant">Merchant *</Label>
                <Input id="merchant" placeholder="Your business name" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" placeholder="+1 (555) 000-0000" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" placeholder="coupons@yourbusiness.com" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" placeholder="https://www.yourbusiness.com" onChange={handleInputChange} />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Redemption Limits</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="redeemLimit">Total Redeem Limit</Label>
                <Input id="redeemLimit" type="number" placeholder="e.g., 500" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userRedeemLimit">User Redeem Limit</Label>
                <Input id="userRedeemLimit" type="number" placeholder="e.g., 1" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userMonthlyLimit">User Monthly Redeem Limit</Label>
                <Input id="userMonthlyLimit" type="number" placeholder="e.g., 2" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userWeeklyLimit">User Weekly Redeem Limit</Label>
                <Input id="userWeeklyLimit" type="number" placeholder="e.g., 1" onChange={handleInputChange} />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Discount Details</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discountAmount">Discount Amount (or)</Label>
                <Input id="discountAmount" placeholder="e.g., $5 off, Free Item" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountPercentage">Discount Percentage</Label>
                <Input id="discountPercentage" placeholder="e.g., 10%, 20%" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="couponCode">Coupon/Voucher Code</Label>
                <Input id="couponCode" placeholder="e.g., SAVE10" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="redeemCode">Redeem Code</Label>
                <Input id="redeemCode" placeholder="e.g., RD001" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prefix">Prefix</Label>
                <Input id="prefix" placeholder="e.g., HD" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextNo">Next No.</Label>
                <Input id="nextNo" placeholder="e.g., 001" onChange={handleInputChange} />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Validity Period</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input id="startDate" type="date" onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" type="date" onChange={handleInputChange} />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Description & Display</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Full description of the offer..."
                  rows={3}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thumbnailDescription">Thumbnail Description</Label>
                <Input
                  id="thumbnailDescription"
                  placeholder="Short text for thumbnail display"
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="popUpText">Pop Up Text</Label>
                <Textarea
                  id="popUpText"
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
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                placeholder="Full address where coupon can be redeemed"
                onChange={handleInputChange}
              />
            </div>
          </div>
        </>
      )
    }

    if (type === "nonprofit") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name *</Label>
            <Input id="orgName" required placeholder="Enter organization name" onChange={handleInputChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Input id="address" required placeholder="Street address" onChange={handleInputChange} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="contact@nonprofit.org"
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input id="phone" type="tel" required placeholder="+1 (555) 000-0000" onChange={handleInputChange} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" type="url" placeholder="https://yournonprofit.org" onChange={handleInputChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="socialMedia">Social Media Links</Label>
            <Textarea
              id="socialMedia"
              placeholder="Facebook: https://facebook.com/yourorg&#10;Instagram: @yourorg&#10;Twitter: @yourorg"
              rows={3}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="donateLink">Donate Link</Label>
            <Input
              id="donateLink"
              type="url"
              placeholder="https://donate.yournonprofit.org"
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="about">About Organization *</Label>
            <Textarea
              id="about"
              required
              placeholder="Tell us about your organization's mission and impact..."
              rows={4}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo">Organization Logo (PNG) *</Label>
            {uploadedLogo ? (
              <div className="relative w-fit">
                <img
                  src={uploadedLogo}
                  alt="Logo"
                  className={`h-32 w-32 object-contain rounded-lg border ${uploadingLogo ? 'opacity-50' : ''}`}
                />
                {uploadingLogo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
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
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click or drag to upload logo</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG format recommended</p>
                </div>
              </>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="images">Organization Images (PNG or JPG)</Label>
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {uploadedImages.map((img, idx) => {
                  const isUploading = uploadingImages.has(img)
                  return (
                    <div key={idx} className="relative">
                      <img
                        src={img}
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
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <div 
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => imageInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Click or drag to upload images</p>
                <p className="text-xs text-muted-foreground mt-1">Multiple images showing your organization's work</p>
              </div>
            </div>
          </div>
        </div>
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
              <p className="text-sm text-muted-foreground">${info.price}/month</p>
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

        {/* Step 1: Details */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Enter Details</CardTitle>
              <CardDescription>{info.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {renderDetailsForm()}
              <Button onClick={() => setStep(2)} className="w-full">
                Continue to Payment
              </Button>
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
                  <span className="font-semibold">${info.price}/month</span>
                </div>
                {(type === "business" || type === "coupon") &&
                  affiliatedMosqueCode &&
                  affiliatedMosqueCode !== "none" && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Mosque Kickback (10%)</span>
                      <span className="text-primary">$1 to Mosque #{affiliatedMosqueCode}</span>
                    </div>
                  )}
                <Separator className="my-2" />
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg">${info.price}/month</span>
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
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={isProcessing} className="flex-1">
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
              <CardTitle>Complete Payment</CardTitle>
              <CardDescription>Enter your payment details to activate your subscription</CardDescription>
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
