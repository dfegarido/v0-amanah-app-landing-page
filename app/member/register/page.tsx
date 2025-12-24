"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Mail, Lock, User, Phone, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { useAuth } from "@/lib/auth-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const { signUp, signOut } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  })

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long")
      return
    }

    setIsLoading(true)

    try {
      const result = await signUp(
        formData.email,
        formData.password,
        formData.name,
        formData.phone || undefined,
        'user' // Always register as user, admins are upgraded manually
      )

      if (result.success) {
        setSuccess(true)
        setError(null)
        
        console.log('Registration successful!')
        
        // Show success message briefly
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        console.log('Redirecting to login form...')
        
        // Logout after registration (so user must login)
        await signOut()
        
        // Redirect to login form
        router.push("/auth/login")
      } else {
        setError(result.error || "Registration failed. Please try again.")
        setIsLoading(false)
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during registration")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <Link href="/login" className="inline-flex items-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Link>
          <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground">
            <Home className="mr-2 h-4 w-4" />
            Home
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <img src="/images/logo-20amanaah.png" alt="Amanah Logo" className="h-20 w-auto mx-auto mb-4" />
            <CardTitle>Create Account</CardTitle>
            <CardDescription>Join Amanah to list your mosque, business, or coupons</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                  {error.includes('already registered') && (
                    <div className="mt-2">
                      <Link 
                        href="/auth/login" 
                        className="text-sm underline font-medium"
                      >
                        Go to Login Page →
                      </Link>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="mb-4 border-green-500 bg-green-500/10">
                <AlertDescription className="text-green-600 dark:text-green-400">
                  ✓ Account created successfully! Redirecting...
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Your name"
                    className="pl-10"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="+1 (555) 000-0000"
                    className="pl-10"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password * (min. 8 characters)</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || success}>
                {success 
                  ? "✓ Account Created! Redirecting..." 
                  : isLoading 
                    ? "Creating Account..." 
                    : "Create Account"}
              </Button>
              
              {isLoading && !success && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground text-center">
                    Setting up your account and profile...
                  </p>
                  <p className="text-xs text-muted-foreground text-center">
                    This may take a few seconds
                  </p>
                </div>
              )}
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
