"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Lock, AlertCircle, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"

type ScreenState = "loading" | "ready" | "invalid"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [recoveryUrlHint] = useState(() => {
    if (typeof window === "undefined") return false
    return (
      window.location.hash.includes("type=recovery") ||
      window.location.hash.includes("access_token") ||
      new URLSearchParams(window.location.search).has("code")
    )
  })
  const [screen, setScreen] = useState<ScreenState>("loading")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tryMarkReady = useCallback(() => {
    setScreen((s) => (s === "invalid" ? s : "ready"))
  }, [])

  useEffect(() => {
    let cancelled = false

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return
      if (event === "PASSWORD_RECOVERY") {
        tryMarkReady()
      }
    })

    const run = async () => {
      const code = searchParams.get("code")
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          console.error("exchangeCodeForSession:", exchangeError.message)
          if (!cancelled) setScreen("invalid")
          return
        }
        if (typeof window !== "undefined") {
          window.history.replaceState({}, "", "/auth/reset-password")
        }
        if (!cancelled) tryMarkReady()
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return

      if (session && recoveryUrlHint) {
        tryMarkReady()
        return
      }

      await new Promise((r) => setTimeout(r, 500))
      if (cancelled) return

      const { data: { session: retrySession } } = await supabase.auth.getSession()
      if (retrySession && recoveryUrlHint) {
        tryMarkReady()
        return
      }

      await new Promise((r) => setTimeout(r, 2000))
      if (cancelled) return

      const { data: { session: lateSession } } = await supabase.auth.getSession()
      if (lateSession && recoveryUrlHint) {
        tryMarkReady()
        return
      }

      if (!cancelled) setScreen("invalid")
    }

    void run()

    return () => {
      cancelled = true
      authSubscription.unsubscribe()
    }
  }, [searchParams, tryMarkReady, recoveryUrlHint])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }

    setIsSubmitting(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        setIsSubmitting(false)
        return
      }

      await supabase.auth.signOut()
      router.push("/auth/login?reset=success")
    } catch {
      setError("Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  if (screen === "loading") {
    return (
      <Card>
        <CardHeader className="text-center">
          <img src="/images/logo-20amanaah.png" alt="Amanah Logo" className="h-20 w-auto mx-auto mb-4" />
          <CardTitle>Preparing reset</CardTitle>
          <CardDescription>Validating your reset link…</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (screen === "invalid") {
    return (
      <Card>
        <CardHeader className="text-center">
          <img src="/images/logo-20amanaah.png" alt="Amanah Logo" className="h-20 w-auto mx-auto mb-4" />
          <CardTitle>Link invalid or expired</CardTitle>
          <CardDescription>
            Request a new reset link from the sign-in page. Links expire after a short time for security.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/auth/forgot-password">Request a new link</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <img src="/images/logo-20amanaah.png" alt="Amanah Logo" className="h-20 w-auto mx-auto mb-4" />
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>Choose a strong password you have not used elsewhere.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
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
                minLength={8}
                autoComplete="new-password"
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirm"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-10"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Updating…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/auth/login" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to sign in
        </Link>

        <Suspense
          fallback={
            <Card>
              <CardHeader className="text-center">
                <img src="/images/logo-20amanaah.png" alt="Amanah Logo" className="h-20 w-auto mx-auto mb-4" />
                <CardTitle>Loading</CardTitle>
                <CardDescription>One moment…</CardDescription>
              </CardHeader>
            </Card>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
