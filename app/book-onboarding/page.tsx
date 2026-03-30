"use client"

import { useState, type MouseEvent } from "react"
import Link from "next/link"
import Script from "next/script"
import { ArrowLeft, Calendar, Copy, ExternalLink, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  ONBOARDING_BOOKING_EMBED_SCRIPT_SRC,
  ONBOARDING_BOOKING_IFRAME_ID,
  ONBOARDING_BOOKING_WIDGET_URL,
} from "@/lib/onboarding-booking"

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      /* fall through to legacy */
    }
  }
  try {
    const ta = document.createElement("textarea")
    ta.value = text
    ta.setAttribute("readonly", "")
    ta.style.position = "fixed"
    ta.style.left = "-9999px"
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand("copy")
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export default function BookOnboardingPage() {
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)

  const copyLink = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setCopyFailed(false)
    const ok = await copyTextToClipboard(ONBOARDING_BOOKING_WIDGET_URL)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      setCopyFailed(true)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Script src={ONBOARDING_BOOKING_EMBED_SCRIPT_SRC} strategy="afterInteractive" />

      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" aria-hidden />
            <div>
              <h1 className="text-xl font-semibold text-foreground">Schedule onboarding</h1>
              <p className="text-sm text-muted-foreground">
                Book a time with our team to get your mosque or business listed on Amanah.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to home
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <p className="font-medium text-foreground">Direct calendar link (for app or sharing)</p>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button variant="default" size="sm" asChild className="gap-1.5">
                <a
                  href={ONBOARDING_BOOKING_WIDGET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open calendar
                </a>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={copyLink}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
          </div>
          {copyFailed && (
            <p className="mt-2 text-xs text-destructive" role="status">
              Could not copy automatically — select the link below and copy manually (Ctrl+C / ⌘C).
            </p>
          )}
          <p className="mt-3 break-all font-mono text-xs sm:text-sm">{ONBOARDING_BOOKING_WIDGET_URL}</p>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm">
          <iframe
            title="Schedule Amanah onboarding"
            src={ONBOARDING_BOOKING_WIDGET_URL}
            id={ONBOARDING_BOOKING_IFRAME_ID}
            className="block w-full min-h-[1100px] h-[calc(100vh-11rem)] border-0 bg-background"
            style={{ border: 0 }}
          />
        </div>
      </main>
    </div>
  )
}
