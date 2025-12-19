"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Building2, Users } from "lucide-react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"

export default function PortalSelectionPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
      console.log('Portal redirect - loading:', loading, 'user:', user?.email || 'null')
    
    if (!loading) {
      if (!user) {
        console.log('No user, redirecting to login form')
        router.push("/auth/login")
      } else {
        // Auto-redirect based on role (only 'user' or 'admin')
        console.log('User found, auto-redirecting based on role:', user.role)
        if (user.role === 'admin') {
          router.push('/admin')
        } else {
          // All non-admin users (only 'user' role now) go to member dashboard
          router.push('/member')
        }
      }
    }
  }, [user, loading, router])

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <img src="/images/logo-20amanaah.png" alt="Amanah Logo" className="h-24 w-auto mx-auto mb-4" />
        <p className="text-muted-foreground">
          {loading ? 'Loading your account...' : 'Redirecting to your dashboard...'}
        </p>
      </div>
    </div>
  )
}
