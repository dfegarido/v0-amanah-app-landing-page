"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Mail, Lock, AlertCircle, User, Shield, Copy, Check, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LoginPage() {
  const router = useRouter()
  const { signIn, user, loading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [copiedCredential, setCopiedCredential] = useState<string | null>(null)

  // Test credentials for debugging
  const testAccounts = {
    admin: {
      email: 'admin@test.com',
      password: 'admin123456',
      label: 'Admin Account',
      icon: Shield
    },
    user: {
      email: 'user@test.com',
      password: 'user123456',
      label: 'User Account',
      icon: User
    }
  }

  const fillCredentials = (accountType: 'admin' | 'user') => {
    const account = testAccounts[accountType]
    setEmail(account.email)
    setPassword(account.password)
    setError(null)
  }

  const copyCredential = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCredential(type)
    setTimeout(() => setCopiedCredential(null), 2000)
  }

  // Redirect after successful login based on role
  useEffect(() => {
    if (!loading && user) {
      console.log('User logged in, redirecting based on role:', user.role)
      if (user.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/member')
      }
    }
  }, [user, loading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const result = await signIn(email, password)

      if (result.success) {
        // Wait for user to be loaded
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Redirect based on role (handled by useEffect after user loads)
        // The redirect will happen automatically once user state updates
      } else {
        setError("Invalid login credentials")
        setIsLoading(false)
      }
    } catch (err: any) {
      setError("Invalid login credentials")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>

        <Card>
          <CardHeader className="text-center">
            <img src="/images/logo-20amanaah.png" alt="Amanah Logo" className="h-20 w-auto mx-auto mb-4" />
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Sign in to your Amanah account</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Debug: Test Credentials */}
            <div className="mb-6 p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold text-primary">Debug: Test Accounts</Label>
                </div>
              </div>
              <div className="space-y-2">
                {/* Admin Account */}
                <div className="flex items-center gap-2 p-2 rounded bg-background border border-border">
                  <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground">Admin</div>
                    <div className="text-xs text-muted-foreground truncate">{testAccounts.admin.email}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => fillCredentials('admin')}
                      disabled={isLoading}
                    >
                      Fill
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => copyCredential(testAccounts.admin.email, 'admin-email')}
                    >
                      {copiedCredential === 'admin-email' ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
                {/* User Account */}
                <div className="flex items-center gap-2 p-2 rounded bg-background border border-border">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground">User</div>
                    <div className="text-xs text-muted-foreground truncate">{testAccounts.user.email}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => fillCredentials('user')}
                      disabled={isLoading}
                    >
                      Fill
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => copyCredential(testAccounts.user.email, 'user-email')}
                    >
                      {copiedCredential === 'user-email' ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Click "Fill" to auto-populate credentials, or copy email to clipboard
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Don't have an account?{" "}
              <Link href="/member/register" className="text-primary hover:underline">
                Create one
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
