"use client"

import type React from "react"

import { useState, use, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  Store,
  Ticket,
  Upload,
  FileText,
  Trash2,
  Edit,
  Save,
  X,
  Key,
  AlertTriangle,
  ImageIcon,
  Bell,
  Plus,
  Loader2,
  Check,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { authenticatedGet, authenticatedPost } from "@/lib/api-client"
import { supabase } from "@/lib/supabase"

// Define interfaces for clarity
interface PushNotificationRequest {
  id: string
  mosqueId: string
  mosqueName: string
  mosqueCode?: string // Added optional property
  title: string
  message: string
  scheduledDate: string
  scheduledTime: string
  timezone: string
  requestedAt: string
  requestedBy: string
  status: "pending" | "approved" | "rejected" // Added status options
  lastRequestDate: string | null
}

interface MosqueSubscription {
  // Renamed from Subscription to be more specific
  id: string
  name: string
  type: "mosque"
  status: string
  price: number
  nextBillingDate: string
  paymentStartDate: string
  email: string
  mosqueCode?: string // Added optional property
  // ... other mosque-specific properties
}

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
  "Africa/Cairo",
]

const getMinScheduleDate = () => {
  const today = new Date()
  const minDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  return minDate.toISOString().split("T")[0]
}

// Helper function to get the correct table name for a subscription type
const getTableName = (type: string): string => {
  // Handle special pluralization cases
  if (type === 'business') return 'businesses'
  // Default: just add 's'
  return `${type}s`
}

// Helper function to safely format dates
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "Not set"
  
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "Not set"
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch (error) {
    return "Not set"
  }
}

export default function SubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { toast } = useToast()
  const { id } = use(params)
  const subscriptionId = id as string

  // State for subscription data
  const [subscription, setSubscription] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingChangeRequest, setPendingChangeRequest] = useState<any>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState<Set<string>>(new Set())
  const [uploadingDocuments, setUploadingDocuments] = useState<Set<string>>(new Set())
  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false)
  
  // Services state for editing
  const [servicesList, setServicesList] = useState<Array<{name: string, link: string}>>([{name: '', link: ''}])
  const [serviceCount, setServiceCount] = useState(1)
  
  // Committee members state for editing
  const [committeeList, setCommitteeList] = useState<Array<{name: string, title: string, photo: string, uploading?: boolean}>>([{name: '', title: '', photo: ''}])
  const [committeeCount, setCommitteeCount] = useState(1)
  
  // Refs
  const documentInputRef = useRef<HTMLInputElement>(null)

  const [pushNotificationDate, setPushNotificationDate] = useState<Date | undefined>(() => {
    const date = new Date()
    date.setDate(date.getDate() + 7)
    return date
  })
  const [pushNotificationTime, setPushNotificationTime] = useState("09:00")
  const [pushNotificationTimezone, setPushNotificationTimezone] = useState("America/New_York")
  const [showPushNotificationDialog, setShowPushNotificationDialog] = useState(false)
  const [pushNotificationTitle, setPushNotificationTitle] = useState("")
  const [pushNotificationMessage, setPushNotificationMessage] = useState("")
  const [lastPushRequestDate, setLastPushRequestDate] = useState<string | null>(null)
  const [submittingPushNotification, setSubmittingPushNotification] = useState(false)
  
  // Time picker state
  const [timePickerOpen, setTimePickerOpen] = useState(false)
  const [selectedHour, setSelectedHour] = useState('9')
  const [selectedMinute, setSelectedMinute] = useState('00')
  const [selectedPeriod, setSelectedPeriod] = useState('AM')

  // Helper function to update scheduled time from time picker
  const updateScheduledTime = (hour: string, minute: string, period: string) => {
    let hour24 = parseInt(hour)
    if (period === 'PM' && hour24 !== 12) {
      hour24 += 12
    } else if (period === 'AM' && hour24 === 12) {
      hour24 = 0
    }
    const timeString = `${hour24.toString().padStart(2, '0')}:${minute}`
    setPushNotificationTime(timeString)
    setSelectedHour(hour)
    setSelectedMinute(minute)
    setSelectedPeriod(period)
  }

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    email: "",
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    website: "",
    socialMedia: "",
    description: "",
    title: "",
    category: "",
    subCategory: "",
    fax: "",
    zip: "",
    city: "",
    state: "",
    country: "",
    merchant: "",
    discount: "",
    discountAmount: "",
    discountPercentage: "",
    discountDetails: "",
    redeemCode: "",
    redeemLimit: "",
    redemptionType: "unlimited",
    redeemPeriod: "",
    thumbnailDescription: "",
    popUpText: "",
    startDate: "",
    endDate: "",
    donateLink: "",
    prayerTimesLink: "",
    sundaySchool: "",
    sundaySchoolLink: "",
    programsLink: "",
    services: "",
    committeeMembers: "",
    committee: "",
    about: "",
    facebook: "",
    instagram: "",
    twitter: "",
    youtube: "",
    google: "",
    tiktok: "",
    otherSocial: "",
    comments: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    donateToSameOrganization: false,
    donationAmount: "",
    donationMosqueCode: "",
  })

  // Fetch subscription data - moved outside useEffect so it can be called from cancel button
  const fetchSubscription = async () => {
    try {
      setLoading(true)
      const response: any = await authenticatedGet('/api/subscriptions')
        
        if (response.success && response.data) {
          // Find the subscription by ID
          const foundSubscription = response.data.find((sub: any) => sub.id === subscriptionId)
          
          if (foundSubscription) {
            setSubscription(foundSubscription)
            
            // Debug logging
            console.log('[Subscription Details] Loaded subscription:', foundSubscription)
            console.log('[Subscription Details] Entity:', foundSubscription.entity)
            console.log('[Subscription Details] Logo:', foundSubscription.entity?.logo)
            
            // Set form data from entity
            const entity = foundSubscription.entity
            if (entity) {
              setFormData({
                name: entity.name || entity.title || "",
                address: entity.address || "",
                email: entity.email || "",
                phone: entity.phone || "",
                emergencyContactName: entity.emergency_contact_name || "",
                emergencyContactPhone: entity.emergency_contact_phone || "",
                website: entity.website || "",
                socialMedia: entity.social_media 
                  ? typeof entity.social_media === "object"
                    ? Object.entries(entity.social_media)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join("\n")
                    : entity.social_media
                  : "",
                description: entity.description || entity.about || "",
                title: entity.title || "",
                category: entity.categories ? entity.categories.join(", ") : "",
                subCategory: entity.sub_categories ? entity.sub_categories.join(", ") : "",
                fax: entity.fax || "",
                zip: entity.zip || "",
                city: entity.city || "",
                state: entity.state || "",
                country: entity.country || "",
                merchant: entity.merchant || "",
                discount: entity.discount_amount || entity.discount_percentage || "",
                discountAmount: entity.discount_amount || "",
                discountPercentage: entity.discount_percentage || "",
                discountDetails: entity.discount_details || "",
                redeemCode: entity.redeem_code || "",
                redeemLimit: entity.redeem_limit || "",
                redemptionType: entity.redemption_type || "unlimited",
                redeemPeriod: entity.redeem_period || "",
                thumbnailDescription: entity.thumbnail_description || "",
                popUpText: entity.pop_up_text || "",
                startDate: entity.start_date || "",
                endDate: entity.end_date || "",
                donateLink: entity.donate_link || "",
                prayerTimesLink: entity.prayer_times_link || "",
                sundaySchool: entity.sunday_school || "",
                sundaySchoolLink: entity.sunday_school_link || "",
                programsLink: entity.programs_link || "",
                services: entity.services || "",
                committeeMembers: entity.committee_members || "",
                committee: entity.committee || "",
                about: entity.about || "",
                facebook: entity.facebook || "",
                instagram: entity.instagram || "",
                twitter: entity.twitter || "",
                youtube: entity.youtube || "",
                google: entity.google || "",
                tiktok: entity.tiktok || "",
                otherSocial: entity.other_social || "",
                comments: entity.comments || entity.comments_questions || "",
                contactName: entity.contact_name || "",
                contactPhone: entity.contact_phone || "",
                contactEmail: entity.contact_email || "",
                donateToSameOrganization: entity.donate_to_same_organization || false,
                donationAmount: entity.donation_amount ? entity.donation_amount.toString() : "",
                donationMosqueCode: entity.donation_mosque_code ? entity.donation_mosque_code.toString() : "",
              })
              
              // Initialize services list for editing
              try {
                const parsedServices = entity.services 
                  ? (typeof entity.services === 'string' ? JSON.parse(entity.services) : entity.services)
                  : []
                const initialServices = parsedServices.length > 0 ? parsedServices : [{name: '', link: ''}]
                setServicesList(initialServices)
                setServiceCount(initialServices.length)
              } catch (e) {
                console.error('Error parsing services:', e)
                setServicesList([{name: '', link: ''}])
                setServiceCount(1)
              }
              
              // Initialize committee members list for editing
              try {
                const parsedCommittee = entity.committee_members 
                  ? (typeof entity.committee_members === 'string' ? JSON.parse(entity.committee_members) : entity.committee_members)
                  : []
                const initialCommittee = parsedCommittee.length > 0 ? parsedCommittee : [{name: '', title: '', photo: ''}]
                setCommitteeList(initialCommittee)
                setCommitteeCount(initialCommittee.length)
              } catch (e) {
                console.error('Error parsing committee members:', e)
                setCommitteeList([{name: '', title: '', photo: ''}])
                setCommitteeCount(1)
              }
            }
          } else {
            setError("Subscription not found")
          }
        } else {
          setError("Failed to load subscription")
        }
      } catch (err: any) {
        console.error('Error fetching subscription:', err)
        setError(err.message || "Failed to load subscription")
        toast({
          title: "Error",
          description: "Failed to load subscription details",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
  }

  // Fetch pending change requests
  const fetchPendingChangeRequests = async () => {
    try {
      const response: any = await authenticatedGet(`/api/subscriptions/${subscriptionId}/change-requests?status=pending`)
      if (response.success && response.data && response.data.length > 0) {
        // Get the most recent pending change request
        setPendingChangeRequest(response.data[0])
      } else {
        setPendingChangeRequest(null)
      }
    } catch (err: any) {
      console.error('Error fetching pending change requests:', err)
      // Silently handle error - change requests are optional
      setPendingChangeRequest(null)
    }
  }

  // Load subscription on mount
  useEffect(() => {
    fetchSubscription()
    fetchPendingChangeRequests()
  }, [subscriptionId, toast])

  // Reinitialize services and committee when entering edit mode
  useEffect(() => {
    if (isEditing && subscription?.entity) {
      // Initialize services
      try {
        const parsedServices = subscription.entity.services 
          ? (typeof subscription.entity.services === 'string' 
              ? JSON.parse(subscription.entity.services) 
              : subscription.entity.services)
          : []
        const initialServices = parsedServices.length > 0 ? parsedServices : [{name: '', link: ''}]
        setServicesList(initialServices)
        setServiceCount(initialServices.length)
      } catch (e) {
        console.error('Error parsing services for edit mode:', e)
        setServicesList([{name: '', link: ''}])
        setServiceCount(1)
      }
      
      // Initialize committee members
      try {
        const parsedCommittee = subscription.entity.committee_members 
          ? (typeof subscription.entity.committee_members === 'string' 
              ? JSON.parse(subscription.entity.committee_members) 
              : subscription.entity.committee_members)
          : []
        const initialCommittee = parsedCommittee.length > 0 ? parsedCommittee : [{name: '', title: '', photo: ''}]
        setCommitteeList(initialCommittee)
        setCommitteeCount(initialCommittee.length)
      } catch (e) {
        console.error('Error parsing committee for edit mode:', e)
        setCommitteeList([{name: '', title: '', photo: ''}])
        setCommitteeCount(1)
      }
    }
  }, [isEditing, subscription])

  const handleCancelSubscription = () => {
    alert("Subscription cancelled successfully. You will retain access until the end of your billing period.")
    router.push("/member")
  }

  const handleSaveChanges = () => {
    setShowSaveConfirmDialog(true)
  }

  const handleConfirmSave = async () => {
    setShowSaveConfirmDialog(false)
    setIsEditing(false)
    setShowPhotoUpload(false)
    
    // Show pending toast immediately
    toast({
      title: "Change Request Submitted!",
      description: "Your changes are pending admin approval. You'll be notified once they're reviewed.",
    })
    
    // Submit change request to API
    try {
      const updateData = {
        subscriptionId: subscription.id,
        type: subscription.type,
        data: formData
      }
      
      const response: any = await authenticatedPost('/api/subscriptions/update', updateData)
      
      if (response.success) {
        // Reset form data to original values (no optimistic update)
        // The UI will show the original data until admin approves
        await fetchSubscription()
        
        // Refresh the pending change requests to show the banner
        await fetchPendingChangeRequests()
        console.log('✅ Change request submitted successfully')
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to submit change request",
          variant: "destructive"
        })
      }
    } catch (error: any) {
      console.error('Failed to submit change request:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to submit change request",
        variant: "destructive"
      })
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Service management handlers
  const handleServiceChange = (idx: number, field: 'name' | 'link', value: string) => {
    const updatedServices = [...servicesList]
    updatedServices[idx] = { ...updatedServices[idx], [field]: value }
    setServicesList(updatedServices)
    // Update formData with filtered services (remove empty entries)
    const filtered = updatedServices.filter(s => s.name || s.link)
    setFormData(prev => ({ ...prev, services: JSON.stringify(filtered) }))
  }

  const handleAddService = () => {
    setServiceCount(prev => prev + 1)
    setServicesList(prev => [...prev, {name: '', link: ''}])
  }

  const handleRemoveService = (idx: number) => {
    if (serviceCount > 1) {
      setServiceCount(prev => prev - 1)
      const updated = servicesList.filter((_, i) => i !== idx)
      setServicesList(updated)
      const filtered = updated.filter(s => s.name || s.link)
      setFormData(prev => ({ ...prev, services: JSON.stringify(filtered) }))
    }
  }

  // Committee management handlers
  const handleCommitteeChange = (idx: number, field: 'name' | 'title' | 'photo', value: string) => {
    const updatedCommittee = [...committeeList]
    updatedCommittee[idx] = { ...updatedCommittee[idx], [field]: value }
    setCommitteeList(updatedCommittee)
    // Update formData with filtered committee (remove empty entries)
    const filtered = updatedCommittee.filter(m => m.name || m.title || m.photo)
    setFormData(prev => ({ ...prev, committeeMembers: JSON.stringify(filtered) }))
  }

  const handleAddCommittee = () => {
    setCommitteeCount(prev => prev + 1)
    setCommitteeList(prev => [...prev, {name: '', title: '', photo: ''}])
  }

  const handleRemoveCommittee = (idx: number) => {
    if (committeeCount > 1) {
      setCommitteeCount(prev => prev - 1)
      const updated = committeeList.filter((_, i) => i !== idx)
      setCommitteeList(updated)
      const filtered = updated.filter(m => m.name || m.title || m.photo)
      setFormData(prev => ({ ...prev, committeeMembers: JSON.stringify(filtered) }))
    }
  }

  // Committee photo upload handler
  const handleCommitteePhotoUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG or PNG image",
        variant: "destructive",
      })
      return
    }

    // Create temporary preview URL (optimistic UI)
    const tempPreviewUrl = URL.createObjectURL(file)
    
    // Update member with temp preview and uploading status
    const updatedMembers = [...committeeList]
    updatedMembers[index] = { ...updatedMembers[index], photo: tempPreviewUrl, uploading: true }
    setCommitteeList(updatedMembers)

    try {
      // Process and upload in background
      const processedFile = await resizeImage(file, 1) // Smaller size for profile photos

      const getTableName = (type: string): string => {
        if (type === 'business') return 'businesses'
        return `${type}s`
      }

      const fileName = `committee-${subscription.type}-${Date.now()}-${Math.random().toString(36).substring(7)}.webp`
      const filePath = `${getTableName(subscription.type)}/${fileName}`

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
        const resetMembers = [...committeeList]
        resetMembers[index] = { ...resetMembers[index], photo: '', uploading: false }
        setCommitteeList(resetMembers)
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
      const finalMembers = [...committeeList]
      finalMembers[index] = { ...finalMembers[index], photo: publicUrl, uploading: false }
      setCommitteeList(finalMembers)
      
      // Update formData
      const filtered = finalMembers.filter(m => m.name || m.title || m.photo)
      setFormData(prev => ({ ...prev, committeeMembers: JSON.stringify(filtered) }))
      
      // Clean up temp URL
      URL.revokeObjectURL(tempPreviewUrl)
      
      toast({
        title: "Upload complete",
        description: `Photo uploaded successfully`,
      })
    } catch (error: any) {
      console.error('Upload error:', error)
      
      // Remove temp preview on error
      const resetMembers = [...committeeList]
      resetMembers[index] = { ...resetMembers[index], photo: '', uploading: false }
      setCommitteeList(resetMembers)
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
          
          const maxDimension = 1920
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
          
          let quality = 0.9
          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to compress image'))
                  return
                }
                
                const targetSize = maxSizeMB * 1024 * 1024
                
                if (blob.size > targetSize && quality > 0.1) {
                  quality -= 0.1
                  tryCompress()
                  return
                }
                
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !subscription) return
    
    const file = e.target.files[0]
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!validTypes.includes(file.type.toLowerCase())) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, JPEG, or PNG file",
        variant: "destructive",
      })
      return
    }
    
    // Create temp preview URL
    const tempPreviewUrl = URL.createObjectURL(file)
    
    // Update local state immediately
    setSubscription({
      ...subscription,
      entity: {
        ...subscription.entity,
        logo: tempPreviewUrl
      }
    })
    
    try {
      // Process and upload
      const processedFile = await resizeImage(file, 1) // Smaller size for logos
      
      const fileName = `logo-${subscription.type}-${Date.now()}-${Math.random().toString(36).substring(7)}.webp`
      const filePath = `${getTableName(subscription.type)}/${fileName}`
      
      const { data, error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, processedFile, {
          contentType: 'image/webp',
          upsert: false
        })
      
      if (uploadError) {
        throw uploadError
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath)
      
      // Update database
      const tableName = getTableName(subscription.type)
      const { error: dbError } = await supabase
        .from(tableName)
        .update({ logo: publicUrl })
        .eq('id', subscription.entity.id)
      
      if (dbError) {
        throw dbError
      }
      
      // Update local state with final URL
      setSubscription({
        ...subscription,
        entity: {
          ...subscription.entity,
          logo: publicUrl
        }
      })
      
      URL.revokeObjectURL(tempPreviewUrl)
      
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      })
    } catch (error: any) {
      console.error('Logo upload error:', error)
      
      // Revert on error
      setSubscription({
        ...subscription,
        entity: {
          ...subscription.entity,
          logo: subscription.entity.logo
        }
      })
      URL.revokeObjectURL(tempPreviewUrl)
      
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      })
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !subscription) return
    
    const files = Array.from(e.target.files)
    
    for (const file of files) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png']
      if (!validTypes.includes(file.type.toLowerCase())) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a valid image (JPG, JPEG, PNG only)`,
          variant: "destructive",
        })
        continue
      }

      // Create temporary preview URL (optimistic UI)
      const tempPreviewUrl = URL.createObjectURL(file)
      
      // Add to local state immediately
      const currentPhotos = subscription.entity?.photos || []
      setSubscription({
        ...subscription,
        entity: {
          ...subscription.entity,
          photos: [...currentPhotos, tempPreviewUrl]
        }
      })
      setUploadingPhotos(prev => new Set([...prev, tempPreviewUrl]))

      try {
        // Process and upload in background
        const processedFile = await resizeImage(file, 2)
        
        const fileName = `${subscription.type}-${Date.now()}-${Math.random().toString(36).substring(7)}.webp`
        const filePath = `${getTableName(subscription.type)}/${fileName}`

        // Upload to Supabase Storage
        const { data, error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(filePath, processedFile, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          
          // Remove temp preview on error
          const photosWithoutTemp = subscription.entity.photos.filter((url: string) => url !== tempPreviewUrl)
          setSubscription({
            ...subscription,
            entity: {
              ...subscription.entity,
              photos: photosWithoutTemp
            }
          })
          setUploadingPhotos(prev => {
            const newSet = new Set(prev)
            newSet.delete(tempPreviewUrl)
            return newSet
          })
          URL.revokeObjectURL(tempPreviewUrl)
          
          toast({
            title: "Upload failed",
            description: uploadError.message || "Failed to upload image",
            variant: "destructive",
          })
          continue
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('uploads')
          .getPublicUrl(filePath)

        // Update database with new photo
        const updatedPhotos = [
          ...(subscription.entity?.photos || []).filter((url: string) => url !== tempPreviewUrl),
          publicUrl
        ]
        
        const tableName = getTableName(subscription.type)
        const { error: dbError } = await supabase
          .from(tableName)
          .update({ photos: updatedPhotos })
          .eq('id', subscription.entity.id)

        if (dbError) {
          console.error('Database error:', dbError)
          
          // Rollback on DB error
          const photosWithoutTemp = subscription.entity.photos.filter((url: string) => url !== tempPreviewUrl)
          setSubscription({
            ...subscription,
            entity: {
              ...subscription.entity,
              photos: photosWithoutTemp
            }
          })
          setUploadingPhotos(prev => {
            const newSet = new Set(prev)
            newSet.delete(tempPreviewUrl)
            return newSet
          })
          URL.revokeObjectURL(tempPreviewUrl)
          
          toast({
            title: "Save failed",
            description: "Photo uploaded but failed to save to database",
            variant: "destructive",
          })
          continue
        }

        // Replace temp URL with real URL
        setSubscription({
          ...subscription,
          entity: {
            ...subscription.entity,
            photos: updatedPhotos
          }
        })
        setUploadingPhotos(prev => {
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
          title: "Photo added",
          description: `${sizeInfo} WebP${reduction}`,
        })
      } catch (error: any) {
        console.error('Upload error:', error)
        
        // Remove temp preview on error
        const photosWithoutTemp = subscription.entity.photos.filter((url: string) => url !== tempPreviewUrl)
        setSubscription({
          ...subscription,
          entity: {
            ...subscription.entity,
            photos: photosWithoutTemp
          }
        })
        setUploadingPhotos(prev => {
          const newSet = new Set(prev)
          newSet.delete(tempPreviewUrl)
          return newSet
        })
        URL.revokeObjectURL(tempPreviewUrl)
        
        toast({
          title: "Upload failed",
          description: error.message || "An error occurred while uploading the photo",
          variant: "destructive",
        })
      }
    }
    
    // Reset input
    e.target.value = ''
  }

  const handleRemovePhoto = async (index: number) => {
    if (!subscription?.entity?.photos) return

    const existingPhotos = subscription.entity.photos || []
    const updatedPhotos = existingPhotos.filter((_: any, i: number) => i !== index)
    
    try {
      // Update the entity in the database
      const tableName = getTableName(subscription.type) // mosques, businesses, coupons, nonprofits
      const { error } = await supabase
        .from(tableName)
        .update({ photos: updatedPhotos })
        .eq('id', subscription.entity.id)

      if (error) {
        console.error('Error removing photo:', error)
        toast({
          title: "Error",
          description: "Failed to remove photo",
          variant: "destructive",
        })
        return
      }

      // Update local state
      setSubscription({
        ...subscription,
        entity: {
          ...subscription.entity,
          photos: updatedPhotos
        }
      })

      toast({
        title: "Success",
        description: "Photo removed successfully",
      })
    } catch (error: any) {
      console.error('Error removing photo:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to remove photo",
        variant: "destructive",
      })
    }
  }

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !subscription) return
    
    const files = Array.from(e.target.files)
    
    for (const file of files) {
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
      if (!validTypes.includes(file.type.toLowerCase())) {
        toast({
          title: "Invalid file type",
          description: `${file.name} must be PDF, PNG, or JPG`,
          variant: "destructive",
        })
        continue
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024 // 10MB in bytes
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive",
        })
        continue
      }

      // Create temporary document object (optimistic UI)
      const tempDocId = `temp-${Date.now()}`
      const tempDoc = {
        id: tempDocId,
        name: file.name,
        url: '',
        uploadedAt: new Date().toISOString(),
        type: file.type.split('/')[1] || 'pdf',
        size: file.size
      }
      
      // Add to local state immediately
      const currentDocs = subscription.entity?.documents || []
      setSubscription({
        ...subscription,
        entity: {
          ...subscription.entity,
          documents: [...currentDocs, tempDoc]
        }
      })
      setUploadingDocuments(prev => new Set([...prev, tempDocId]))

      try {
        const fileName = `${subscription.type}-doc-${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`
        const filePath = `${getTableName(subscription.type)}/documents/${fileName}`

        // Upload to Supabase Storage
        const { data, error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          
          // Remove temp doc on error
          const docsWithoutTemp = subscription.entity.documents.filter((doc: any) => doc.id !== tempDocId)
          setSubscription({
            ...subscription,
            entity: {
              ...subscription.entity,
              documents: docsWithoutTemp
            }
          })
          setUploadingDocuments(prev => {
            const newSet = new Set(prev)
            newSet.delete(tempDocId)
            return newSet
          })
          
          toast({
            title: "Upload failed",
            description: uploadError.message,
            variant: "destructive",
          })
          continue
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('uploads')
          .getPublicUrl(filePath)

        // Create final document object
        const newDoc = {
          id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          name: file.name,
          url: publicUrl,
          uploadedAt: new Date().toISOString(),
          type: file.type.split('/')[1] || 'pdf',
          size: file.size
        }

        // Update database
        const updatedDocs = [...(subscription.entity.documents.filter((doc: any) => doc.id !== tempDocId) || []), newDoc]
        
        const tableName = getTableName(subscription.type)
        const { error: dbError } = await supabase
          .from(tableName)
          .update({ documents: updatedDocs })
          .eq('id', subscription.entity.id)

        if (dbError) {
          console.error('Database error:', dbError)
          
          // Remove temp doc on error
          const docsWithoutTemp = subscription.entity.documents.filter((doc: any) => doc.id !== tempDocId)
          setSubscription({
            ...subscription,
            entity: {
              ...subscription.entity,
              documents: docsWithoutTemp
            }
          })
          
          toast({
            title: "Failed to save document",
            description: dbError.message,
            variant: "destructive",
          })
          continue
        }

        // Update local state with real document
        setSubscription({
          ...subscription,
          entity: {
            ...subscription.entity,
            documents: updatedDocs
          }
        })
        setUploadingDocuments(prev => {
          const newSet = new Set(prev)
          newSet.delete(tempDocId)
          return newSet
        })
        
        const sizeInfo = `${(file.size / 1024 / 1024).toFixed(1)}MB`
        
        toast({
          title: "Document uploaded",
          description: `${file.name} (${sizeInfo})`,
        })
      } catch (error: any) {
        console.error('Upload error:', error)
        
        // Remove temp doc on error
        const docsWithoutTemp = subscription.entity.documents.filter((doc: any) => doc.id !== tempDocId)
        setSubscription({
          ...subscription,
          entity: {
            ...subscription.entity,
            documents: docsWithoutTemp
          }
        })
        setUploadingDocuments(prev => {
          const newSet = new Set(prev)
          newSet.delete(tempDocId)
          return newSet
        })
        
        toast({
          title: "Upload failed",
          description: error.message || "An error occurred while uploading the document",
          variant: "destructive",
        })
      }
    }
    
    // Reset input
    e.target.value = ''
  }

  const handleRemoveDocument = async (docId: string) => {
    if (!subscription?.entity?.documents) return

    const existingDocs = subscription.entity.documents || []
    const docToRemove = existingDocs.find((doc: any) => doc.id === docId)
    const updatedDocs = existingDocs.filter((doc: any) => doc.id !== docId)
    
    try {
      // Delete from storage if URL exists
      if (docToRemove?.url) {
        const urlParts = docToRemove.url.split('/uploads/')
        if (urlParts.length > 1) {
          const filePath = urlParts[1]
          await supabase.storage.from('uploads').remove([filePath])
        }
      }

      // Update the entity in the database
      const tableName = getTableName(subscription.type)
      const { error } = await supabase
        .from(tableName)
        .update({ documents: updatedDocs })
        .eq('id', subscription.entity.id)

      if (error) {
        console.error('Error removing document:', error)
        toast({
          title: "Error",
          description: "Failed to remove document",
          variant: "destructive",
        })
        return
      }

      // Update local state
      setSubscription({
        ...subscription,
        entity: {
          ...subscription.entity,
          documents: updatedDocs
        }
      })

      toast({
        title: "Success",
        description: "Document removed successfully",
      })
    } catch (error: any) {
      console.error('Error removing document:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to remove document",
        variant: "destructive",
      })
    }
  }

  const handlePushNotificationRequest = async () => {
    if (!pushNotificationTitle || !pushNotificationMessage || !pushNotificationDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmittingPushNotification(true)

      // Format date as YYYY-MM-DD
      const formattedDate = format(pushNotificationDate, 'yyyy-MM-dd')

      // Call the API to create push notification request
      const response: any = await authenticatedPost('/api/push-notifications', {
        mosque_subscription_id: subscription.id,
        mosque_code: subscription.entity?.mosque_code || subscription.mosqueCode,
        mosque_name: subscription.entity?.name || subscription.name,
        title: pushNotificationTitle,
        message: pushNotificationMessage,
        scheduled_date: formattedDate,
        scheduled_time: pushNotificationTime,
        timezone: pushNotificationTimezone,
      })

      if (response.success) {
        // Show success toast
        toast({
          title: "Request Submitted",
          description: `Your push notification has been requested for ${format(pushNotificationDate, 'PPP')} at ${pushNotificationTime}. It will be reviewed by admin.`,
        })

        // Reset form
        setPushNotificationTitle("")
        setPushNotificationMessage("")
        const newDate = new Date()
        newDate.setDate(newDate.getDate() + 7)
        setPushNotificationDate(newDate)
        setPushNotificationTime("09:00")
        setSelectedHour('9')
        setSelectedMinute('00')
        setSelectedPeriod('AM')
        setPushNotificationTimezone("America/New_York")
        setShowPushNotificationDialog(false)
      } else {
        throw new Error(response.error || "Failed to submit request")
      }
    } catch (error: any) {
      console.error('Error submitting push notification:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to submit push notification request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmittingPushNotification(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading subscription...</p>
        </div>
      </div>
    )
  }

  // Error or not found state
  if (error || !subscription) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {error || "Subscription Not Found"}
          </h1>
          <p className="text-muted-foreground mb-4">
            The subscription you're looking for doesn't exist or you don't have access to it.
          </p>
          <Link href="/member">
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  const getSubscriptionIcon = (type: string) => {
    switch (type) {
      case "mosque":
        return <Building2 className="h-6 w-6" />
      case "business":
        return <Store className="h-6 w-6" />
      case "coupon":
        return <Ticket className="h-6 w-6" />
      case "nonprofit":
        return <FileText className="h-6 w-6" />
      default:
        return <FileText className="h-6 w-6" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>
      case "cancelled":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Cancelled</Badge>
      case "past_due":
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">Past Due</Badge>
      case "update_pending":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Update Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getAppStatusBadge = (appStatus: string) => {
    // Green for approved/active, Red for rejected/removed/cancelled
    switch (appStatus) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 font-medium">Approved</Badge>
      case "pending_verification":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending Verification</Badge>
      case "removed":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 font-medium">Rejected</Badge>
      case "cancelled":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 font-medium">Rejected</Badge>
      case "update_pending":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Update Pending</Badge>
      default:
        return <Badge variant="outline">{appStatus || "Unknown"}</Badge>
    }
  }

  const getAppStatusText = (appStatus: string) => {
    switch (appStatus) {
      case "active":
        return "Approved"
      case "pending_verification":
        return "Pending Verification"
      case "removed":
        return "Rejected"
      case "cancelled":
        return "Rejected"
      case "update_pending":
        return "Update Pending"
      default:
        return appStatus || "Unknown"
    }
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
              {getSubscriptionIcon(subscription.type)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-foreground">
                  {subscription.entity?.name || subscription.entity?.title || formData.name || "Unnamed"}
                </h1>
                {getStatusBadge(subscription.status)}
                {subscription.app_status && getAppStatusBadge(subscription.app_status)}
                {subscription.entity?.status && subscription.entity.status !== subscription.status && (
                  <Badge variant="outline">{subscription.entity.status}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground capitalize">
                {subscription.type} Subscription • ${subscription.price_amount}/month
                {subscription.entity?.mosque_code && ` • Code #${subscription.entity.mosque_code}`}
                {subscription.entity?.affiliated_mosque_code && ` • Affiliated with #${subscription.entity.affiliated_mosque_code}`}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Pending Change Request Banner */}
      {pendingChangeRequest && (
        <div className="border-b border-border bg-yellow-50 dark:bg-yellow-950/20">
          <div className="container mx-auto px-4 py-4 max-w-4xl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                  Change Request Pending Approval
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                  Your change request submitted on {new Date(pendingChangeRequest.created_at).toLocaleDateString()} is awaiting admin approval. 
                  You cannot make additional changes until this request is reviewed.
                </p>
                <div className="text-xs text-yellow-700 dark:text-yellow-300">
                  <strong>Requested Changes:</strong> {Object.keys(pendingChangeRequest.changes || {}).length} field(s)
                </div>
              </div>
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700">
                Pending
              </Badge>
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto p-6 space-y-6">
        {/* Quick Actions Card */}
        {subscription.type === "mosque" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setShowPushNotificationDialog(true)}>
                <Bell className="h-4 w-4 mr-2" />
                Request Push Notification
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Subscription Status Info */}
        <Card className="mb-6 border-l-4" style={{
          borderLeftColor: subscription.app_status === 'active' ? '#22c55e' : 
                          (subscription.app_status === 'removed' || subscription.app_status === 'cancelled') ? '#ef4444' : 
                          '#eab308'
        }}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-foreground">Subscription Status</h3>
                  {subscription.app_status && getAppStatusBadge(subscription.app_status)}
                </div>
                {subscription.app_status === 'pending_verification' && (
                  <p className="text-sm text-muted-foreground">
                    Your listing is under review. You will be notified once it's approved.
                  </p>
                )}
                {subscription.app_status === 'active' && (
                  <p className="text-sm text-muted-foreground">
                    Your listing has been approved and is live on the platform.
                  </p>
                )}
                {(subscription.app_status === 'removed' || subscription.app_status === 'cancelled') && (
                  <p className="text-sm text-muted-foreground">
                    Your listing has been rejected. Please contact support for more information.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Details */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle>Subscription Details</CardTitle>
                <CardDescription>
                  {isEditing 
                    ? `Edit your ${subscription.type} listing information below` 
                    : `View and manage your ${subscription.type} listing information`}
                </CardDescription>
              </div>
              <div className="flex gap-2 ml-4">
                {!isEditing ? (
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditing(true)}
                    disabled={!!pendingChangeRequest}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Details
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => {
                      setIsEditing(false)
                      setShowPhotoUpload(false) // Close photo upload section when canceling
                      // Reload subscription data to reset all fields including services
                      fetchSubscription()
                    }}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={handleSaveChanges}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription.type === "nonprofit" && (
              <>
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  {isEditing ? (
                    <Input value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} />
                  ) : (
                    <p className="text-foreground">{formData.name}</p>
                  )}
                </div>
                
                <Separator />
                <h3 className="font-semibold">Location</h3>
                <div className="space-y-2">
                  <Label>Address</Label>
                  {isEditing ? (
                    <Input value={formData.address} onChange={(e) => handleInputChange("address", e.target.value)} />
                  ) : (
                    <p className="text-foreground">{formData.address}</p>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    {isEditing ? (
                      <Input value={formData.city || ''} onChange={(e) => handleInputChange("city", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.city || <span className="text-muted-foreground">Not provided</span>}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    {isEditing ? (
                      <Input value={formData.state || ''} onChange={(e) => handleInputChange("state", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.state || <span className="text-muted-foreground">Not provided</span>}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP</Label>
                    {isEditing ? (
                      <Input value={formData.zip || ''} onChange={(e) => handleInputChange("zip", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.zip || <span className="text-muted-foreground">Not provided</span>}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    {isEditing ? (
                      <Input value={formData.country || 'USA'} onChange={(e) => handleInputChange("country", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.country || <span className="text-muted-foreground">Not provided</span>}</p>
                    )}
                  </div>
                </div>
                
                <Separator />
                <h3 className="font-semibold">Contact Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    {isEditing ? (
                      <Input type="email" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    {isEditing ? (
                      <Input type="tel" value={formData.phone} onChange={(e) => handleInputChange("phone", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.phone}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    {isEditing ? (
                      <Input type="url" value={formData.website || ''} onChange={(e) => handleInputChange("website", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.website || <span className="text-muted-foreground">Not provided</span>}</p>
                    )}
                  </div>
                </div>
                
                <Separator />
                <h3 className="font-semibold">Social Media</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Facebook</Label>
                    {isEditing ? (
                      <Input type="url" value={formData.facebook || ''} onChange={(e) => handleInputChange("facebook", e.target.value)} placeholder="https://facebook.com/yourpage" />
                    ) : formData.facebook ? (
                      <a href={formData.facebook} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block truncate">
                        {formData.facebook}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">Not provided</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Instagram</Label>
                    {isEditing ? (
                      <Input type="url" value={formData.instagram || ''} onChange={(e) => handleInputChange("instagram", e.target.value)} placeholder="https://instagram.com/yourpage" />
                    ) : formData.instagram ? (
                      <a href={formData.instagram} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block truncate">
                        {formData.instagram}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">Not provided</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Twitter/X</Label>
                    {isEditing ? (
                      <Input type="url" value={formData.twitter || ''} onChange={(e) => handleInputChange("twitter", e.target.value)} placeholder="https://twitter.com/yourpage" />
                    ) : formData.twitter ? (
                      <a href={formData.twitter} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block truncate">
                        {formData.twitter}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">Not provided</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>YouTube</Label>
                    {isEditing ? (
                      <Input type="url" value={formData.youtube || ''} onChange={(e) => handleInputChange("youtube", e.target.value)} placeholder="https://youtube.com/@yourorg" />
                    ) : formData.youtube ? (
                      <a href={formData.youtube} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block truncate">
                        {formData.youtube}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">Not provided</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Google Business</Label>
                    {isEditing ? (
                      <Input type="url" value={formData.google || ''} onChange={(e) => handleInputChange("google", e.target.value)} placeholder="https://maps.google.com/yourorg" />
                    ) : formData.google ? (
                      <a href={formData.google} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block truncate">
                        {formData.google}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">Not provided</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>TikTok</Label>
                    {isEditing ? (
                      <Input type="url" value={formData.tiktok || ''} onChange={(e) => handleInputChange("tiktok", e.target.value)} placeholder="https://tiktok.com/@yourorg" />
                    ) : formData.tiktok ? (
                      <a href={formData.tiktok} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block truncate">
                        {formData.tiktok}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">Not provided</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Other Social Media</Label>
                    {isEditing ? (
                      <Input type="url" value={formData.otherSocial || ''} onChange={(e) => handleInputChange("otherSocial", e.target.value)} placeholder="https://..." />
                    ) : formData.otherSocial ? (
                      <a href={formData.otherSocial} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block truncate">
                        {formData.otherSocial}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">Not provided</p>
                    )}
                  </div>
                </div>
                
                <Separator />
                <h3 className="font-semibold">Organization Details</h3>
                <div className="space-y-2">
                  <Label>About Organization</Label>
                  {isEditing ? (
                    <Textarea 
                      value={formData.about || formData.description || ''} 
                      onChange={(e) => handleInputChange("description", e.target.value)} 
                      rows={5}
                      placeholder="Tell us about your organization..."
                    />
                  ) : (
                    <p className="text-foreground whitespace-pre-wrap">{formData.about || formData.description || <span className="text-muted-foreground">No description provided</span>}</p>
                  )}
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 mt-4">
                  <div className="space-y-2">
                    <Label>Donate Link</Label>
                    {isEditing ? (
                      <Input type="url" value={formData.donateLink || ''} onChange={(e) => handleInputChange("donateLink", e.target.value)} placeholder="https://donate.yourorg.com" />
                    ) : formData.donateLink ? (
                      <a href={formData.donateLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block truncate">
                        {formData.donateLink}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">Not provided</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Programs/Events Page</Label>
                    {isEditing ? (
                      <Input type="url" value={formData.programsLink || ''} onChange={(e) => handleInputChange("programsLink", e.target.value)} placeholder="https://yourorg.com/programs" />
                    ) : formData.programsLink ? (
                      <a href={formData.programsLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block truncate">
                        {formData.programsLink}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">Not provided</p>
                    )}
                  </div>
                </div>
                
                <Separator />
                <h3 className="font-semibold">Services / Programs</h3>
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">Add services or programs your organization offers</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddService}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Service
                      </Button>
                    </div>
                    {Array.from({ length: serviceCount }).map((_, idx) => (
                      <div key={idx} className="grid md:grid-cols-2 gap-3 p-3 border rounded-lg">
                        <Input
                          value={servicesList[idx]?.name || ''}
                          placeholder="Service/Program name"
                          onChange={(e) => handleServiceChange(idx, 'name', e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Input
                            type="url"
                            value={servicesList[idx]?.link || ''}
                            placeholder="Link (optional)"
                            className="flex-1"
                            onChange={(e) => handleServiceChange(idx, 'link', e.target.value)}
                          />
                          {serviceCount > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveService(idx)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  (() => {
                    try {
                      const services = typeof subscription.entity?.services === 'string' 
                        ? JSON.parse(subscription.entity.services)
                        : subscription.entity?.services || []
                      
                      return services.length > 0 ? (
                        <div className="space-y-3">
                          {services.map((service: any, idx: number) => (
                            <div key={idx} className="border-l-2 border-primary pl-4">
                              <p className="font-medium">{service.name}</p>
                              {service.link && (
                                <a href={service.link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                                  {service.link}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No services/programs listed</p>
                      )
                    } catch (e) {
                      return <p className="text-muted-foreground">No services/programs listed</p>
                    }
                  })()
                )}
                
                <Separator />
                <h3 className="font-semibold">Board Members / Leadership Team</h3>
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">Add board members or leadership team</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddCommittee}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Member
                      </Button>
                    </div>
                    {Array.from({ length: committeeCount }).map((_, idx) => (
                      <div key={idx} className="grid md:grid-cols-3 gap-3 p-4 border rounded-lg relative">
                        <div className="space-y-2">
                          <Label className="text-sm">Photo</Label>
                          <div className="flex flex-col gap-2">
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png"
                              className="hidden"
                              id={`nonprofit-committee-photo-${idx}`}
                              onChange={(e) => handleCommitteePhotoUpload(idx, e)}
                            />
                            <Button 
                              type="button"
                              variant="outline" 
                              size="sm"
                              onClick={() => document.getElementById(`nonprofit-committee-photo-${idx}`)?.click()}
                              disabled={committeeList[idx]?.uploading}
                            >
                              {committeeList[idx]?.uploading ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 mr-1" />
                                  {committeeList[idx]?.photo ? 'Change' : 'Upload'}
                                </>
                              )}
                            </Button>
                            {committeeList[idx]?.photo && !committeeList[idx]?.uploading && (
                              <div className="relative w-20 h-20 rounded-md overflow-hidden border">
                                <img src={committeeList[idx]?.photo} alt={committeeList[idx]?.name || 'Member'} className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>
                        </div>
                        <Input
                          value={committeeList[idx]?.name || ''}
                          placeholder="Full Name"
                          onChange={(e) => handleCommitteeChange(idx, 'name', e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Input
                            value={committeeList[idx]?.title || ''}
                            placeholder="Title / Role (e.g., President)"
                            className="flex-1"
                            onChange={(e) => handleCommitteeChange(idx, 'title', e.target.value)}
                          />
                          {committeeCount > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveCommittee(idx)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  (() => {
                    try {
                      const committee = typeof subscription.entity?.committee_members === 'string' 
                        ? JSON.parse(subscription.entity.committee_members)
                        : subscription.entity?.committee_members || []
                      
                      return committee.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-3">
                          {committee.map((member: any, idx: number) => (
                            <div key={idx} className="border rounded-lg p-4 space-y-2">
                              {member.photo && (
                                <img 
                                  src={member.photo} 
                                  alt={member.name} 
                                  className="w-20 h-20 rounded-full object-cover mx-auto"
                                />
                              )}
                              <div className="text-center">
                                <p className="font-medium">{member.name}</p>
                                <p className="text-sm text-muted-foreground">{member.title}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No board members listed</p>
                      )
                    } catch (e) {
                      return <p className="text-muted-foreground">No board members listed</p>
                    }
                  })()
                )}
              </>
            )}

            {subscription.type === "coupon" && (
              <>
                <Separator />
                <h3 className="font-semibold text-foreground">Basic Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    {isEditing ? (
                      <Input value={formData.title} onChange={(e) => handleInputChange("title", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.title}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Merchant</Label>
                    {isEditing ? (
                      <Input
                        value={formData.merchant}
                        onChange={(e) => handleInputChange("merchant", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.merchant}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    {isEditing ? (
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.phone}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    {isEditing ? (
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.email}</p>
                    )}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Website</Label>
                    {isEditing ? (
                      <Input
                        type="url"
                        value={formData.website}
                        onChange={(e) => handleInputChange("website", e.target.value)}
                      />
                    ) : formData.website ? (
                      <a href={formData.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {formData.website}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">Not provided</p>
                    )}
                  </div>
                </div>

                <Separator />
                <h3 className="font-semibold text-foreground">Redemption Options</h3>
                <div className="space-y-2">
                  <Label>Redemption Type</Label>
                  <p className="text-foreground">
                    {formData.redemptionType === 'unlimited' ? 'Unlimited - No restrictions' : 'Limited Redemptions'}
                  </p>
                  {formData.redemptionType === 'limited' && formData.redeemLimit && formData.redeemPeriod && (
                    <p className="text-sm text-muted-foreground">
                      {formData.redeemLimit} redemption(s) per {formData.redeemPeriod}
                    </p>
                  )}
                </div>

                <Separator />
                <h3 className="font-semibold text-foreground">Discount Details</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {formData.discountAmount && (
                    <div className="space-y-2">
                      <Label>Discount Amount</Label>
                      <p className="text-foreground">{formData.discountAmount}</p>
                    </div>
                  )}
                  {formData.discountPercentage && (
                    <div className="space-y-2">
                      <Label>Discount Percentage</Label>
                      <p className="text-foreground">{formData.discountPercentage}</p>
                    </div>
                  )}
                </div>
                {formData.discountDetails && (
                  <div className="space-y-2">
                    <Label>Offer Details</Label>
                    <p className="text-foreground whitespace-pre-wrap">{formData.discountDetails}</p>
                  </div>
                )}

                <Separator />
                <h3 className="font-semibold text-foreground">Description & Display</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Description</Label>
                    {isEditing ? (
                      <Textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange("description", e.target.value)}
                        rows={3}
                      />
                    ) : (
                      <p className="text-foreground whitespace-pre-wrap">{formData.description}</p>
                    )}
                  </div>
                  {formData.thumbnailDescription && (
                    <div className="space-y-2">
                      <Label>Thumbnail Description</Label>
                      <p className="text-foreground">{formData.thumbnailDescription}</p>
                    </div>
                  )}
                  {formData.popUpText && (
                    <div className="space-y-2">
                      <Label>Pop Up Text</Label>
                      <p className="text-foreground">{formData.popUpText}</p>
                    </div>
                  )}
                </div>

                <Separator />
                <h3 className="font-semibold text-foreground">Validity Period</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <p className="text-foreground">{formData.startDate || 'Not set'}</p>
                    {isEditing && (
                      <p className="text-xs text-muted-foreground">Start date cannot be changed after creation</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <p className="text-foreground">{formData.endDate || 'No end date'}</p>
                    {isEditing && (
                      <p className="text-xs text-muted-foreground">End date cannot be changed after creation</p>
                    )}
                  </div>
                </div>

                <Separator />
                <h3 className="font-semibold text-foreground">Location</h3>
                <div className="space-y-2">
                  <Label>Address</Label>
                  {isEditing ? (
                    <Input value={formData.address} onChange={(e) => handleInputChange("address", e.target.value)} />
                  ) : (
                    <p className="text-foreground">{formData.address}</p>
                  )}
                </div>
              </>
            )}

            {subscription.type === "business" && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Business Title</Label>
                    {isEditing ? (
                      <Input value={formData.title} onChange={(e) => handleInputChange("title", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.title}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    {isEditing ? (
                      <Input
                        value={formData.category}
                        onChange={(e) => handleInputChange("category", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.category}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Sub Category</Label>
                    {isEditing ? (
                      <Input
                        value={formData.subCategory}
                        onChange={(e) => handleInputChange("subCategory", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.subCategory}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    {isEditing ? (
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.phone}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Fax</Label>
                    {isEditing ? (
                      <Input value={formData.fax} onChange={(e) => handleInputChange("fax", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.fax}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    {isEditing ? (
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    {isEditing ? (
                      <Input
                        type="url"
                        value={formData.website}
                        onChange={(e) => handleInputChange("website", e.target.value)}
                      />
                    ) : (
                      <p className="text-foreground">{formData.website}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Zip Code</Label>
                    {isEditing ? (
                      <Input value={formData.zip} onChange={(e) => handleInputChange("zip", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.zip}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  {isEditing ? (
                    <Input value={formData.address} onChange={(e) => handleInputChange("address", e.target.value)} />
                  ) : (
                    <p className="text-foreground">{formData.address}</p>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>City</Label>
                    {isEditing ? (
                      <Input value={formData.city} onChange={(e) => handleInputChange("city", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.city}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    {isEditing ? (
                      <Input value={formData.state} onChange={(e) => handleInputChange("state", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.state}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    {isEditing ? (
                      <Input value={formData.country} onChange={(e) => handleInputChange("country", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.country}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      rows={4}
                    />
                  ) : (
                    <p className="text-foreground">{formData.description}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Social Media Links</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.socialMedia}
                      onChange={(e) => handleInputChange("socialMedia", e.target.value)}
                      placeholder="facebook: https://...\ninstagram: https://..."
                    />
                  ) : (
                    <p className="text-foreground whitespace-pre-wrap">{formData.socialMedia || "Not provided"}</p>
                  )}
                </div>

                <Separator />

                <h3 className="font-semibold">Internal Contact Information</h3>
                <p className="text-sm text-muted-foreground">For internal use only, will not be displayed publicly</p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Contact Name</Label>
                    {isEditing ? (
                      <Input
                        value={formData.contactName || ''}
                        onChange={(e) => handleInputChange("contactName", e.target.value)}
                        placeholder="Contact person name"
                      />
                    ) : (
                      <p className="text-foreground">{formData.contactName || <span className="text-muted-foreground">Not provided</span>}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Phone</Label>
                    {isEditing ? (
                      <Input
                        type="tel"
                        value={formData.contactPhone || ''}
                        onChange={(e) => handleInputChange("contactPhone", e.target.value)}
                        placeholder="+1 (555) 000-0000"
                      />
                    ) : (
                      <p className="text-foreground">{formData.contactPhone || <span className="text-muted-foreground">Not provided</span>}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    {isEditing ? (
                      <Input
                        type="email"
                        value={formData.contactEmail || ''}
                        onChange={(e) => handleInputChange("contactEmail", e.target.value)}
                        placeholder="contact@example.com"
                      />
                    ) : (
                      <p className="text-foreground">{formData.contactEmail || <span className="text-muted-foreground">Not provided</span>}</p>
                    )}
                  </div>
                </div>

                <Separator />

                <h3 className="font-semibold">Additional Information</h3>
                <div className="space-y-2">
                  <Label>Comments/Questions</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.comments || ''}
                      onChange={(e) => handleInputChange("comments", e.target.value)}
                      placeholder="Enter any comments or questions..."
                      rows={4}
                    />
                  ) : (
                    <p className="text-foreground whitespace-pre-wrap">{formData.comments || <span className="text-muted-foreground">Not provided</span>}</p>
                  )}
                </div>

                <Separator />

                <h3 className="font-semibold">Additional Donation</h3>
                {formData.donateToSameOrganization ? (
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-sm text-foreground">
                        Donation will go to: <span className="font-semibold">Mosque #{formData.donationMosqueCode || 'N/A'}</span>
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Donation Amount ($)</Label>
                      {isEditing ? (
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.donationAmount || ''}
                          onChange={(e) => handleInputChange("donationAmount", e.target.value)}
                          placeholder="0.00"
                        />
                      ) : (
                        <p className="text-foreground">
                          ${formData.donationAmount ? parseFloat(formData.donationAmount).toFixed(2) : '0.00'}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No additional donation requested</p>
                )}
              </>
            )}

            {subscription.type === "mosque" && (
              <>
                <div className="space-y-2">
                  <Label>Mosque Name</Label>
                  {isEditing ? (
                    <Input value={formData.name} onChange={(e) => handleInputChange("name", e.target.value)} />
                  ) : (
                    <p className="text-foreground">{formData.name}</p>
                  )}
                </div>
                
                <Separator />
                <h3 className="font-semibold">Location</h3>
                <div className="space-y-2">
                  <Label>Address</Label>
                  {isEditing ? (
                    <Input value={formData.address} onChange={(e) => handleInputChange("address", e.target.value)} />
                  ) : (
                    <p className="text-foreground">{formData.address}</p>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    {isEditing ? (
                      <Input value={formData.city || ''} onChange={(e) => handleInputChange("city", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.city || <span className="text-muted-foreground">Not provided</span>}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    {isEditing ? (
                      <Input value={formData.state || ''} onChange={(e) => handleInputChange("state", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.state || <span className="text-muted-foreground">Not provided</span>}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP</Label>
                    {isEditing ? (
                      <Input value={formData.zip || ''} onChange={(e) => handleInputChange("zip", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.zip || <span className="text-muted-foreground">Not provided</span>}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    {isEditing ? (
                      <Input value={formData.country || 'USA'} onChange={(e) => handleInputChange("country", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.country || <span className="text-muted-foreground">Not provided</span>}</p>
                    )}
                  </div>
                </div>
                
                <Separator />
                <h3 className="font-semibold">Contact Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    {isEditing ? (
                      <Input type="email" value={formData.email} onChange={(e) => handleInputChange("email", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Mosque Phone Number</Label>
                    {isEditing ? (
                      <Input type="tel" value={formData.phone} onChange={(e) => handleInputChange("phone", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.phone}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    {isEditing ? (
                      <Input type="url" value={formData.website || ''} onChange={(e) => handleInputChange("website", e.target.value)} />
                    ) : (
                      <p className="text-foreground">{formData.website || <span className="text-muted-foreground">Not provided</span>}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Emergency Contact Name (Point of Contact)</Label>
                    {isEditing ? (
                      <Input type="text" value={formData.emergencyContactName || ''} onChange={(e) => handleInputChange("emergencyContactName", e.target.value)} placeholder="Contact person name" />
                    ) : (
                      <p className="text-foreground">{formData.emergencyContactName || <span className="text-muted-foreground">Not provided</span>}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Emergency Contact Phone Number</Label>
                    {isEditing ? (
                      <Input type="tel" value={formData.emergencyContactPhone || ''} onChange={(e) => handleInputChange("emergencyContactPhone", e.target.value)} placeholder="+1 (555) 000-0000" />
                    ) : (
                      <p className="text-foreground">{formData.emergencyContactPhone || <span className="text-muted-foreground">Not provided</span>}</p>
                    )}
                  </div>
                </div>
                
                <Separator />
                <h3 className="font-semibold">Social Media</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Facebook</Label>
                    {isEditing ? (
                      <Input type="url" value={formData.facebook || ''} onChange={(e) => handleInputChange("facebook", e.target.value)} placeholder="https://facebook.com/yourpage" />
                    ) : formData.facebook ? (
                      <a href={formData.facebook} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block truncate">
                        {formData.facebook}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">Not provided</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Instagram</Label>
                    {isEditing ? (
                      <Input type="url" value={formData.instagram || ''} onChange={(e) => handleInputChange("instagram", e.target.value)} placeholder="https://instagram.com/yourpage" />
                    ) : formData.instagram ? (
                      <a href={formData.instagram} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block truncate">
                        {formData.instagram}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">Not provided</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Twitter/X</Label>
                    {isEditing ? (
                      <Input type="url" value={formData.twitter || ''} onChange={(e) => handleInputChange("twitter", e.target.value)} placeholder="https://twitter.com/yourpage" />
                    ) : formData.twitter ? (
                      <a href={formData.twitter} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block truncate">
                        {formData.twitter}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">Not provided</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>YouTube</Label>
                    {isEditing ? (
                      <Input type="url" value={formData.youtube || ''} onChange={(e) => handleInputChange("youtube", e.target.value)} placeholder="https://youtube.com/@yourmasjid" />
                    ) : formData.youtube ? (
                      <a href={formData.youtube} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block truncate">
                        {formData.youtube}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">Not provided</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Google Business</Label>
                    {isEditing ? (
                      <Input type="url" value={formData.google || ''} onChange={(e) => handleInputChange("google", e.target.value)} placeholder="https://maps.google.com/yourmasjid" />
                    ) : formData.google ? (
                      <a href={formData.google} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block truncate">
                        {formData.google}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">Not provided</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>TikTok</Label>
                    {isEditing ? (
                      <Input type="url" value={formData.tiktok || ''} onChange={(e) => handleInputChange("tiktok", e.target.value)} placeholder="https://tiktok.com/@yourmasjid" />
                    ) : formData.tiktok ? (
                      <a href={formData.tiktok} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block truncate">
                        {formData.tiktok}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">Not provided</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Other Social Media</Label>
                    {isEditing ? (
                      <Input type="url" value={formData.otherSocial || ''} onChange={(e) => handleInputChange("otherSocial", e.target.value)} placeholder="https://..." />
                    ) : formData.otherSocial ? (
                      <a href={formData.otherSocial} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block truncate">
                        {formData.otherSocial}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">Not provided</p>
                    )}
                  </div>
                </div>
                
                <Separator />
                <h3 className="font-semibold">Links & Resources</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Donate Link</Label>
                    {isEditing ? (
                      <Input type="url" value={formData.donateLink || ''} onChange={(e) => handleInputChange("donateLink", e.target.value)} placeholder="https://donate.yourwebsite.com" />
                    ) : formData.donateLink ? (
                      <a href={formData.donateLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block truncate">
                        {formData.donateLink}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">Not provided</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Sunday School Page</Label>
                    {isEditing ? (
                      <Input type="url" value={formData.sundaySchoolLink || ''} onChange={(e) => handleInputChange("sundaySchoolLink", e.target.value)} placeholder="https://yourmasjid.org/sunday-school" />
                    ) : formData.sundaySchoolLink ? (
                      <a href={formData.sundaySchoolLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline block truncate">
                        {formData.sundaySchoolLink}
                      </a>
                    ) : (
                      <p className="text-muted-foreground">Not provided</p>
                    )}
                  </div>
                </div>
                
                <Separator />
                <h3 className="font-semibold">Services Offered</h3>
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">Add services your mosque offers to the community</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddService}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Service
                      </Button>
                    </div>
                    {Array.from({ length: serviceCount }).map((_, idx) => (
                      <div key={idx} className="grid md:grid-cols-2 gap-3 p-3 border rounded-lg">
                        <Input
                          value={servicesList[idx]?.name || ''}
                          placeholder={`Service name (e.g., ${idx === 0 ? 'Counseling Services' : idx === 1 ? 'Nikah Services' : 'Funeral Services'})`}
                          onChange={(e) => handleServiceChange(idx, 'name', e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Input
                            type="url"
                            value={servicesList[idx]?.link || ''}
                            placeholder="Service page link (optional)"
                            className="flex-1"
                            onChange={(e) => handleServiceChange(idx, 'link', e.target.value)}
                          />
                          {serviceCount > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveService(idx)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  (() => {
                    try {
                      const services = typeof subscription.entity?.services === 'string' 
                        ? JSON.parse(subscription.entity.services)
                        : subscription.entity?.services || []
                      
                      return services.length > 0 ? (
                        <div className="space-y-3">
                          {services.map((service: any, idx: number) => (
                            <div key={idx} className="border-l-2 border-primary pl-4">
                              <p className="font-medium">{service.name}</p>
                              {service.link && (
                                <a href={service.link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                                  {service.link}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No services listed</p>
                      )
                    } catch (e) {
                      return <p className="text-muted-foreground">No services listed</p>
                    }
                  })()
                )}
                
                <Separator />
                <h3 className="font-semibold">Committee / Board of Trustees</h3>
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">Add committee members or board of trustees</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddCommittee}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Member
                      </Button>
                    </div>
                    {Array.from({ length: committeeCount }).map((_, idx) => (
                      <div key={idx} className="grid md:grid-cols-3 gap-3 p-4 border rounded-lg relative">
                        <div className="space-y-2">
                          <Label className="text-sm">Photo</Label>
                          <div className="flex flex-col gap-2">
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png"
                              className="hidden"
                              id={`mosque-committee-photo-${idx}`}
                              onChange={(e) => handleCommitteePhotoUpload(idx, e)}
                            />
                            <Button 
                              type="button"
                              variant="outline" 
                              size="sm"
                              onClick={() => document.getElementById(`mosque-committee-photo-${idx}`)?.click()}
                              disabled={committeeList[idx]?.uploading}
                            >
                              {committeeList[idx]?.uploading ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 mr-1" />
                                  {committeeList[idx]?.photo ? 'Change' : 'Upload'}
                                </>
                              )}
                            </Button>
                            {committeeList[idx]?.photo && !committeeList[idx]?.uploading && (
                              <div className="relative w-20 h-20 rounded-md overflow-hidden border">
                                <img src={committeeList[idx]?.photo} alt={committeeList[idx]?.name || 'Member'} className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>
                        </div>
                        <Input
                          value={committeeList[idx]?.name || ''}
                          placeholder="Full Name"
                          onChange={(e) => handleCommitteeChange(idx, 'name', e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Input
                            value={committeeList[idx]?.title || ''}
                            placeholder="Title / Role (e.g., President)"
                            className="flex-1"
                            onChange={(e) => handleCommitteeChange(idx, 'title', e.target.value)}
                          />
                          {committeeCount > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveCommittee(idx)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  (() => {
                    try {
                      const committee = typeof subscription.entity?.committee_members === 'string' 
                        ? JSON.parse(subscription.entity.committee_members)
                        : subscription.entity?.committee_members || []
                      
                      return committee.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-3">
                          {committee.map((member: any, idx: number) => (
                            <div key={idx} className="border rounded-lg p-4 space-y-2">
                              {member.photo && (
                                <img 
                                  src={member.photo} 
                                  alt={member.name} 
                                  className="w-20 h-20 rounded-full object-cover mx-auto"
                                />
                              )}
                              <div className="text-center">
                                <p className="font-medium">{member.name}</p>
                                <p className="text-sm text-muted-foreground">{member.title}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No committee members listed</p>
                      )
                    } catch (e) {
                      return <p className="text-muted-foreground">No committee members listed</p>
                    }
                  })()
                )}
              </>
            )}

            <Separator />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Price</Label>
                <p className="text-foreground font-semibold">${subscription.price_amount || subscription.price || 0}/month</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Next Billing Date</Label>
                <p className="text-foreground">{formatDate(subscription.next_billing_date)}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Subscription Created</Label>
                <p className="text-foreground">{formatDate(subscription.created_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo & Photos Management Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  {(subscription.type === 'business' || subscription.type === 'coupon') ? 'Photos' : 'Logo & Photos'}
                </CardTitle>
                <CardDescription>
                  {(subscription.type === 'business' || subscription.type === 'coupon')
                    ? `Manage your ${subscription.type} photos` 
                    : 'Manage your listing logo and photos'}
                </CardDescription>
              </div>
              {isEditing && (
                <div className="flex gap-2">
                  <Button 
                    variant={showPhotoUpload ? "secondary" : "default"} 
                    size="sm" 
                    onClick={() => setShowPhotoUpload(!showPhotoUpload)}
                  >
                    {showPhotoUpload ? (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Close Upload
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Photos
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Section - Hidden for business and coupon */}
            {subscription.type !== 'business' && subscription.type !== 'coupon' && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Logo</Label>
                {subscription.entity?.logo ? (
                  <div className="flex items-start gap-4">
                    <div className="relative group">
                      <img
                        src={subscription.entity.logo}
                        alt="Logo"
                        className="h-32 w-32 object-contain rounded-lg border bg-white"
                        onError={(e) => {
                          console.error('Logo failed to load:', subscription.entity.logo)
                          e.currentTarget.src = '/placeholder.svg'
                        }}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => window.open(subscription.entity.logo, '_blank')}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">
                        Current logo for your listing
                      </p>
                      {isEditing && (
                        <>
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png"
                            className="hidden"
                            id="logo-upload-edit"
                            onChange={handleLogoUpload}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => document.getElementById('logo-upload-edit')?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Change Logo
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 border-2 border-dashed border-muted rounded-lg text-center">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No logo uploaded</p>
                    {isEditing ? (
                      <>
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png"
                          className="hidden"
                          id="logo-upload-new"
                          onChange={handleLogoUpload}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={() => document.getElementById('logo-upload-new')?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Logo
                        </Button>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">
                        Click "Edit Details" to upload a logo
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Upload Section */}
            {showPhotoUpload && (
              <div className="border-2 border-dashed border-primary/50 rounded-lg p-8 text-center bg-primary/5 hover:bg-primary/10 transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                />
                <label htmlFor="photo-upload" className="cursor-pointer block">
                  <Upload className="h-12 w-12 mx-auto text-primary mb-3" />
                  <p className="text-base font-medium text-foreground mb-2">Click or drop files here to upload</p>
                  <p className="text-sm text-muted-foreground mb-1">JPG, JPEG, PNG accepted</p>
                  <p className="text-xs text-muted-foreground">Images will be automatically converted to WebP and optimized</p>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={(e) => {
                      e.preventDefault()
                      document.getElementById('photo-upload')?.click()
                    }}
                  >
                    Select Files
                  </Button>
                </label>
              </div>
            )}

            {/* Existing Photos */}
            {subscription.entity?.photos && subscription.entity.photos.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Photos ({subscription.entity.photos.length})</Label>
                  {uploadingPhotos.size > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Uploading {uploadingPhotos.size} photo{uploadingPhotos.size > 1 ? 's' : ''}...
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {subscription.entity.photos.map((photo: string, idx: number) => {
                    const isUploading = uploadingPhotos.has(photo)
                    return (
                      <div key={idx} className="relative group">
                        <img
                          src={photo || "/placeholder.svg"}
                          alt={`Photo ${idx + 1}`}
                          className={`h-32 w-full object-cover rounded-lg border ${isUploading ? 'opacity-50' : ''}`}
                        />
                        {isUploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                            <Loader2 className="h-8 w-8 text-white animate-spin" />
                          </div>
                        )}
                        {!isUploading && (
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => window.open(photo, '_blank')}
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemovePhoto(idx)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              !showPhotoUpload && (
                <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No photos uploaded yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Click "Add Photos" to upload images</p>
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* Third Party Integrations - Mosque Only */}
        {subscription.type === "mosque" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Third Party Integrations
              </CardTitle>
              <CardDescription>Connected services and integrations (managed by admin)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Amanah App - Coming Soon */}
                <div className="p-3 rounded-lg bg-secondary/50 border border-dashed">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-muted-foreground">Amanah App Login</p>
                    <Badge variant="outline" className="text-muted-foreground">Coming Soon</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Login credentials will be available in the next version
                  </p>
                </div>
                
                {/* Stripe Connected Account */}
                <div className="p-3 rounded-lg bg-secondary/50 border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Stripe Connected Account</p>
                    {subscription.entity?.stripe_onboarding_complete ? (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        <Check className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : subscription.entity?.stripe_account_id ? (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                        Onboarding Incomplete
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Not Connected
                      </Badge>
                    )}
                  </div>
                  
                  {subscription.entity?.stripe_account_id ? (
                    <div className="space-y-2">
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Status:</span>
                          {subscription.entity?.stripe_charges_enabled && subscription.entity?.stripe_payouts_enabled ? (
                            <span className="text-green-600 font-medium">Fully Enabled</span>
                          ) : (
                            <span className="text-yellow-600 font-medium">Setup Required</span>
                          )}
                        </div>
                        {subscription.entity?.stripe_charges_enabled && (
                          <div className="flex items-center gap-2">
                            <Check className="h-3 w-3 text-green-600" />
                            <span className="text-sm">Can accept payments</span>
                          </div>
                        )}
                        {subscription.entity?.stripe_payouts_enabled && (
                          <div className="flex items-center gap-2">
                            <Check className="h-3 w-3 text-green-600" />
                            <span className="text-sm">Can receive payouts</span>
                          </div>
                        )}
                      </div>
                      {!subscription.entity?.stripe_onboarding_complete && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Contact admin to complete Stripe onboarding
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Contact admin to connect your Stripe account and receive affiliate earnings
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents */}
        {(subscription.type === "mosque" || subscription.type === "business") && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
              <CardDescription>Upload required documents for verification</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Upload Area */}
              <input
                ref={documentInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                multiple
                onChange={handleDocumentUpload}
                className="hidden"
                id="document-upload"
              />
              <label htmlFor="document-upload" className="cursor-pointer block">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center mb-4 hover:border-primary transition-colors">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">Click or drag to upload documents</p>
                  <p className="text-xs text-muted-foreground">PDF, PNG, JPG up to 10MB</p>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={(e) => {
                      e.preventDefault()
                      documentInputRef.current?.click()
                    }}
                  >
                    Select Documents
                  </Button>
                </div>
              </label>

              {/* Document List */}
              {subscription.entity?.documents && subscription.entity.documents.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-base font-semibold">Uploaded Documents ({subscription.entity.documents.length})</Label>
                    {uploadingDocuments.size > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Uploading {uploadingDocuments.size} document{uploadingDocuments.size > 1 ? 's' : ''}...
                      </span>
                    )}
                  </div>
                  {subscription.entity.documents.map((doc: any) => {
                    const isUploading = uploadingDocuments.has(doc.id)
                    const sizeDisplay = doc.size ? `${(doc.size / 1024 / 1024).toFixed(2)}MB` : 'Unknown size'
                    
                    return (
                      <div key={doc.id} className={`flex items-center justify-between p-3 bg-secondary/50 rounded-lg ${isUploading ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(doc.uploadedAt)} • {sizeDisplay}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <>
                              {doc.url && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  asChild
                                >
                                  <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                    <FileText className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleRemoveDocument(doc.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No documents uploaded yet
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {subscription.status === "active" && (
          <Card className="border-destructive/50 mt-6">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Cancel Subscription
              </CardTitle>
              <CardDescription>
                Cancel your subscription. You will retain access until the end of your current billing period.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Cancel Subscription</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will cancel your subscription for <strong>{subscription.entity?.name || subscription.entity?.title || 'this listing'}</strong>. 
                      {subscription.next_billing_date && (
                        <span> You will retain access until <strong>{formatDate(subscription.next_billing_date)}</strong> and no further charges will be made.</span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancelSubscription} className="bg-destructive">
                      Yes, Cancel Subscription
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Push Notification Request Dialog */}
      {subscription.type === "mosque" && (
        <Dialog open={showPushNotificationDialog} onOpenChange={setShowPushNotificationDialog}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Request Push Notification</DialogTitle>
              <DialogDescription>
                Send a notification to all Amanah app users.
                {lastPushRequestDate && (
                  <span className="block mt-2 text-sm">
                    Last request: {formatDate(lastPushRequestDate)}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <strong>Important:</strong> Push notifications must be scheduled at least 1 week in advance to allow
                  our team to review and schedule them.
                </p>
              </div>

              <div>
                <Label htmlFor="push-title">Title</Label>
                <Input
                  id="push-title"
                  placeholder="e.g., Ramadan Schedule 2025"
                  value={pushNotificationTitle}
                  onChange={(e) => setPushNotificationTitle(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="push-message">Message</Label>
                <Textarea
                  id="push-message"
                  placeholder="Enter your message..."
                  rows={4}
                  value={pushNotificationMessage}
                  onChange={(e) => setPushNotificationMessage(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Scheduled Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${
                          !pushNotificationDate && "text-muted-foreground"
                        }`}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {pushNotificationDate ? format(pushNotificationDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={pushNotificationDate}
                        onSelect={(date) => setPushNotificationDate(date)}
                        disabled={(date) => {
                          const sevenDaysFromNow = new Date()
                          sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
                          return date < sevenDaysFromNow
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground mt-1">Must be 7+ days in advance</p>
                </div>

                <div>
                  <Label>Scheduled Time *</Label>
                  <Popover open={timePickerOpen} onOpenChange={setTimePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${
                          !pushNotificationTime && "text-muted-foreground"
                        }`}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {pushNotificationTime || "Select time"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4" align="start">
                      <div className="space-y-3">
                        <div className="text-sm font-medium">Select Time</div>
                        <div className="flex items-center gap-2">
                          {/* Hour selector */}
                          <Select
                            value={selectedHour}
                            onValueChange={(value) => updateScheduledTime(value, selectedMinute, selectedPeriod)}
                          >
                            <SelectTrigger className="w-[70px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => {
                                const hour = i + 1
                                return (
                                  <SelectItem key={hour} value={hour.toString()}>
                                    {hour}
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                          
                          <span className="text-xl font-semibold">:</span>
                          
                          {/* Minute selector */}
                          <Select
                            value={selectedMinute}
                            onValueChange={(value) => updateScheduledTime(selectedHour, value, selectedPeriod)}
                          >
                            <SelectTrigger className="w-[70px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {['00', '15', '30', '45'].map((minute) => (
                                <SelectItem key={minute} value={minute}>
                                  {minute}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          {/* AM/PM selector */}
                          <Select
                            value={selectedPeriod}
                            onValueChange={(value) => updateScheduledTime(selectedHour, selectedMinute, value)}
                          >
                            <SelectTrigger className="w-[70px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AM">AM</SelectItem>
                              <SelectItem value="PM">PM</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => setTimePickerOpen(false)}
                        >
                          Done
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground mt-1">Local time in selected timezone</p>
                </div>
              </div>

              <div>
                <Label htmlFor="push-timezone">Timezone</Label>
                <Select value={pushNotificationTimezone} onValueChange={setPushNotificationTimezone}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowPushNotificationDialog(false)}
                disabled={submittingPushNotification}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePushNotificationRequest}
                disabled={!pushNotificationTitle || !pushNotificationMessage || !pushNotificationDate || submittingPushNotification}
              >
                {submittingPushNotification ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Send Request"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Save Confirmation Dialog */}
      <Dialog open={showSaveConfirmDialog} onOpenChange={setShowSaveConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Changes?</DialogTitle>
            <DialogDescription>
              Your changes will be submitted for review. An admin will review and approve your updates within 1-2 business days.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSave}>
              Confirm & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
