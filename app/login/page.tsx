"use client"

import Link from "next/link"
import { ArrowLeft, Building2, Users } from "lucide-react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>

        <div className="text-center mb-8">
          <img src="/images/logo-20amanaah.png" alt="Amanah Logo" className="h-24 w-auto mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">Choose your portal to continue</p>
        </div>

        <div className="grid gap-4">
          <Link href="/admin">
            <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-lg">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Admin Portal</CardTitle>
                  <CardDescription>Manage mosques, businesses, and member subscriptions</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/member">
            <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-lg">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Member Platform</CardTitle>
                  <CardDescription>Access your mosque, business, or coupon dashboard</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
