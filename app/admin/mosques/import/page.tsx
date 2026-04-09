"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { authenticatedPost } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

export default function AdminMosquesImportPage() {
  const { toast } = useToast()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [rawText, setRawText] = useState("")
  const [lastResult, setLastResult] = useState<unknown>(null)
  const [busy, setBusy] = useState<"dry" | "import" | null>(null)

  if (!authLoading && (!user || user.role !== "admin")) {
    router.push("/auth/login")
    return null
  }

  const run = async (dryRun: boolean) => {
    const trimmed = rawText.trim()
    if (!trimmed) {
      toast({
        title: "Nothing to import",
        description: "Paste your mosque list into the box first.",
        variant: "destructive",
      })
      return
    }
    setBusy(dryRun ? "dry" : "import")
    setLastResult(null)
    try {
      const res = (await authenticatedPost("/api/admin/mosques/import", {
        dry_run: dryRun,
        raw_text: trimmed,
      })) as any
      setLastResult(res)
      if (res?.success) {
        toast({
          title: dryRun ? "Dry run complete" : "Import complete",
          description: `Inserted (or would insert): ${res?.data?.inserted_count ?? "—"} · Skipped: ${res?.data?.skipped_count ?? "—"}`,
        })
      } else {
        throw new Error(res?.error || "Request failed")
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Import failed",
        variant: "destructive",
      })
      setLastResult({ error: e?.message })
    } finally {
      setBusy(null)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Bulk import mosques</h1>
            <p className="text-sm text-muted-foreground">
              Paste the Google-style list (name, rating line, address line). Uses the same parser as the API{" "}
              <code className="text-xs">raw_text</code> field.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Paste list
            </CardTitle>
            <CardDescription>
              Admin only. Dry run shows counts without writing to the database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste full mosque text here…"
              rows={16}
              className="font-mono text-sm min-h-[280px]"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy !== null}
                onClick={() => void run(true)}
              >
                {busy === "dry" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running…
                  </>
                ) : (
                  "Dry run"
                )}
              </Button>
              <Button
                type="button"
                disabled={busy !== null}
                onClick={() => void run(false)}
              >
                {busy === "import" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing…
                  </>
                ) : (
                  "Import now"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {lastResult != null && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Last response</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="max-h-96 overflow-auto rounded-md border bg-muted/40 p-4 text-xs">
                {JSON.stringify(lastResult, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
