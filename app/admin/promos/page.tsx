"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Building2,
  Store,
  Ticket,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { authenticatedDelete, authenticatedGet, authenticatedPatch, authenticatedPost } from "@/lib/api-client"

type PromoType = "free" | "fixed" | "percentage"
type AppliesTo = "mosque" | "business"

function parseLocalDateOnly(iso: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

function formatLocalDateOnly(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatDateButtonLabel(iso: string): string | null {
  const d = parseLocalDateOnly(iso)
  return d ? format(d, "PPP") : null
}

function defaultThreeMonthsFromToday(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 3)
  return formatLocalDateOnly(d)
}

export default function AdminPromosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading } = useAuth()

  const [promoCodes, setPromoCodes] = useState<any[]>([])
  const [loadingPromos, setLoadingPromos] = useState(true)

  const [editingPromoId, setEditingPromoId] = useState<string | null>(null)

  const [code, setCode] = useState("")
  const [enabled, setEnabled] = useState(true)
  const [promoType, setPromoType] = useState<PromoType>("free")
  const [appliesTo, setAppliesTo] = useState<AppliesTo>("mosque")

  const [fixedAmount, setFixedAmount] = useState<string>("")
  const [percentageValue, setPercentageValue] = useState<string>("")

  const [useStartDate, setUseStartDate] = useState(false)
  const [startDate, setStartDate] = useState<string>("")
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [useEndDate, setUseEndDate] = useState(false)
  const [endDate, setEndDate] = useState<string>("")
  const [endDateOpen, setEndDateOpen] = useState(false)

  // Empty => unlimited
  const [maxUsers, setMaxUsers] = useState<string>("")

  const [useRedeemByDate, setUseRedeemByDate] = useState(true)
  const [redeemByDate, setRedeemByDate] = useState(() => defaultThreeMonthsFromToday())
  const [redeemByDateOpen, setRedeemByDateOpen] = useState(false)
  const [benefitMonths, setBenefitMonths] = useState("12")

  const [promoPendingDelete, setPromoPendingDelete] = useState<{ id: string; code: string } | null>(null)
  const [deletingPromo, setDeletingPromo] = useState(false)

  const invalidFields = useMemo(() => {
    const missing: string[] = []
    if (!code.trim()) missing.push("Promo code")
    if (promoType === "fixed" && (!fixedAmount.trim() || Number(fixedAmount) < 0)) missing.push("Fixed amount")
    if (promoType === "percentage" && (!percentageValue.trim() || Number(percentageValue) < 0 || Number(percentageValue) > 100)) {
      missing.push("Percentage value")
    }
    if (useStartDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) missing.push("Start date (YYYY-MM-DD)")
    if (useEndDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) missing.push("End date (YYYY-MM-DD)")
    if (useRedeemByDate && !/^\d{4}-\d{2}-\d{2}$/.test(redeemByDate)) missing.push("Signup deadline (redeem-by date)")
    if (benefitMonths.trim()) {
      const n = Number(benefitMonths.trim())
      if (!Number.isFinite(n) || n < 1 || n > 120 || !Number.isInteger(n)) {
        missing.push("Benefit months (integer 1–120, or empty for legacy)")
      }
    }
    if (maxUsers.trim() && (!/^\d+$/.test(maxUsers.trim()) || Number(maxUsers.trim()) <= 0)) missing.push("Max users (positive integer)")
    return missing
  }, [
    code,
    fixedAmount,
    percentageValue,
    promoType,
    useStartDate,
    startDate,
    useEndDate,
    endDate,
    useRedeemByDate,
    redeemByDate,
    benefitMonths,
    maxUsers,
  ])

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push("/auth/login")
      return
    }

    if (user.role !== "admin") {
      toast({
        title: "Unauthorized",
        description: "Admin access required.",
        variant: "destructive",
      })
      router.push("/auth/login")
    }
  }, [user, loading, router, toast])

  useEffect(() => {
    const fetchPromos = async () => {
      try {
        setLoadingPromos(true)
        const res: any = await authenticatedGet("/api/admin/promos")
        if (res.success && res.data?.promoCodes) {
          setPromoCodes(res.data.promoCodes)
        }
      } catch (e: any) {
        console.error("[Admin Promos] Failed to fetch:", e)
        toast({
          title: "Error",
          description: e?.message || "Failed to load promo codes",
          variant: "destructive",
        })
      } finally {
        setLoadingPromos(false)
      }
    }

    if (user?.role === "admin") fetchPromos()
  }, [user, toast])

  const resetCreateForm = () => {
    setCode("")
    setFixedAmount("")
    setPercentageValue("")
    setUseStartDate(false)
    setStartDate("")
    setUseEndDate(false)
    setEndDate("")
    setMaxUsers("")
    setEnabled(true)
    setPromoType("free")
    setAppliesTo("mosque")
    setEditingPromoId(null)
    setUseRedeemByDate(true)
    setRedeemByDate(defaultThreeMonthsFromToday())
    setBenefitMonths("12")
  }

  const submit = async () => {
    try {
      if (invalidFields.length) {
        toast({
          title: "Missing/invalid fields",
          description: `Please check: ${invalidFields.join(", ")}`,
          variant: "destructive",
        })
        return
      }

      const body = {
        code,
        enabled,
        promoType,
        appliesTo,
        fixedAmount: promoType === "fixed" ? fixedAmount : undefined,
        percentageValue: promoType === "percentage" ? percentageValue : undefined,
        useStartDate,
        startDate: useStartDate ? startDate : undefined,
        useEndDate,
        endDate: useEndDate ? endDate : undefined,
        maxUsers: maxUsers.trim() ? maxUsers : null,
        useRedeemByDate,
        redeemByDate: useRedeemByDate ? redeemByDate : undefined,
        benefitMonths: benefitMonths.trim() ? benefitMonths : null,
      }

      const request = editingPromoId
        ? authenticatedPatch(`/api/admin/promos/${editingPromoId}`, body)
        : authenticatedPost("/api/admin/promos", body)

      const res: any = await request
      if (res.success && res.data?.promoCode) {
        toast({
          title: editingPromoId ? "Promo updated" : "Promo created",
          description: `Promo code ${res.data.promoCode.code} ${editingPromoId ? "updated successfully" : "created successfully"}.`,
        })

        resetCreateForm()

        // Refresh list
        const refresh: any = await authenticatedGet("/api/admin/promos")
        if (refresh.success && refresh.data?.promoCodes) setPromoCodes(refresh.data.promoCodes)
      } else {
        throw new Error(res?.error || (editingPromoId ? "Failed to update promo" : "Failed to create promo"))
      }
    } catch (e: any) {
      console.error("[Admin Promos] Create failed:", e)
      toast({
        title: "Error",
        description: e?.message || "Failed to create promo code",
        variant: "destructive",
      })
    }
  }

  const confirmDeletePromo = async () => {
    if (!promoPendingDelete) return
    try {
      setDeletingPromo(true)
      const res: any = await authenticatedDelete(`/api/admin/promos/${promoPendingDelete.id}`)
      if (res.success) {
        toast({
          title: "Promo deleted",
          description: `Promo code ${promoPendingDelete.code} was removed.`,
        })
        if (editingPromoId === promoPendingDelete.id) {
          resetCreateForm()
        }
        setPromoPendingDelete(null)
        const refresh: any = await authenticatedGet("/api/admin/promos")
        if (refresh.success && refresh.data?.promoCodes) setPromoCodes(refresh.data.promoCodes)
      } else {
        throw new Error(res?.error || "Failed to delete promo")
      }
    } catch (e: any) {
      console.error("[Admin Promos] Delete failed:", e)
      toast({
        title: "Error",
        description: e?.message || "Failed to delete promo code",
        variant: "destructive",
      })
    } finally {
      setDeletingPromo(false)
    }
  }

  const startEdit = (p: any) => {
    setEditingPromoId(p.id)
    setCode((p.code || "").toString())
    setEnabled(Boolean(p.enabled))
    setPromoType(p.promo_type as PromoType)
    setAppliesTo(p.applies_to as AppliesTo)

    setFixedAmount(
      p.promo_type === "fixed" ? String((p.fixed_amount_cents || 0) / 100) : ""
    )
    setPercentageValue(
      p.promo_type === "percentage" ? String(p.percentage_value ?? "") : ""
    )

    setUseStartDate(Boolean(p.use_start_date))
    setStartDate(p.start_date ?? "")
    setUseEndDate(Boolean(p.use_end_date))
    setEndDate(p.end_date ?? "")

    setMaxUsers(p.max_users === null || p.max_users === undefined ? "" : String(p.max_users))

    setUseRedeemByDate(Boolean(p.use_redeem_by_date))
    setRedeemByDate(p.redeem_by_date ?? "")
    setBenefitMonths(
      p.benefit_months !== null && p.benefit_months !== undefined ? String(p.benefit_months) : ""
    )
  }

  const getAppliesIcon = (type: AppliesTo) => {
    if (type === "mosque") return <Building2 className="h-4 w-4" />
    return <Store className="h-4 w-4" />
  }

  const getPromoBadge = (type: PromoType) => {
    if (type === "free") return <Badge variant="secondary">FREE</Badge>
    if (type === "fixed") return <Badge variant="outline">Fixed</Badge>
    return <Badge variant="outline">%</Badge>
  }

  if (loadingPromos && (loading || !user)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="flex items-center gap-4 px-6 py-4">
          <Link href="/admin" className="text-muted-foreground hover:text-foreground">
            <span className="text-2xl font-bold">←</span>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Promo Codes</h1>
            <p className="text-sm text-muted-foreground">Create codes for mosque/business subscription discounts</p>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Create Promo Code
            </CardTitle>
            <CardDescription>
              Signup deadline controls how long new customers can apply the code. Benefit months set how long pricing
              stays discounted after redemption (independent of when they sign up within that window).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Promo Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g., RAMADANFREE" />
            </div>

            <div className="space-y-2">
              <Label>Applies To</Label>
              <Select value={appliesTo} onValueChange={(v: any) => setAppliesTo(v as AppliesTo)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select applies_to" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mosque">Mosque</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Promo Type</Label>
              <Select value={promoType} onValueChange={(v: any) => setPromoType(v as PromoType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select promo type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">FREE</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {promoType === "fixed" && (
              <div className="space-y-2">
                <Label>Fixed Amount (USD off per month)</Label>
                <Input value={fixedAmount} onChange={(e) => setFixedAmount(e.target.value)} placeholder="e.g., 10" />
              </div>
            )}

            {promoType === "percentage" && (
              <div className="space-y-2">
                <Label>Percentage Value</Label>
                <Input value={percentageValue} onChange={(e) => setPercentageValue(e.target.value)} placeholder="e.g., 20" />
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label className="flex items-center justify-between gap-3">
                <span>Enabled</span>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
              </Label>
            </div>

            <Separator className="md:col-span-2" />

            <div className="space-y-2 md:col-span-2">
              <Label className="flex items-center justify-between gap-3">
                <span>Signup deadline (must apply code on or before this day)</span>
                <input
                  type="checkbox"
                  checked={useRedeemByDate}
                  onChange={(e) => setUseRedeemByDate(e.target.checked)}
                />
              </Label>
              {useRedeemByDate && (
                <Popover open={redeemByDateOpen} onOpenChange={setRedeemByDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !redeemByDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formatDateButtonLabel(redeemByDate) ?? <span>Pick signup deadline</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={parseLocalDateOnly(redeemByDate)}
                      onSelect={(date) => {
                        if (date) {
                          setRedeemByDate(formatLocalDateOnly(date))
                          setRedeemByDateOpen(false)
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Benefit duration after redemption (months)</Label>
              <Input
                value={benefitMonths}
                onChange={(e) => setBenefitMonths(e.target.value)}
                placeholder="e.g., 12 for one year of promo pricing; leave empty for legacy date rules only"
              />
              <p className="text-xs text-muted-foreground">
                Customers keep this pricing for the full period from their signup date, even if they redeem on the last
                day of the signup window.
              </p>
            </div>

            <Separator className="md:col-span-2" />

            <div className="space-y-2 md:col-span-2">
              <Label className="flex items-center justify-between gap-3">
                <span>Start Date Validation</span>
                <input
                  type="checkbox"
                  checked={useStartDate}
                  onChange={(e) => setUseStartDate(e.target.checked)}
                />
              </Label>
              {useStartDate && (
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formatDateButtonLabel(startDate) ?? <span>Pick start date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={parseLocalDateOnly(startDate)}
                      onSelect={(date) => {
                        if (date) {
                          setStartDate(formatLocalDateOnly(date))
                          setStartDateOpen(false)
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="flex items-center justify-between gap-3">
                <span>End Date Validation</span>
                <input
                  type="checkbox"
                  checked={useEndDate}
                  onChange={(e) => setUseEndDate(e.target.checked)}
                />
              </Label>
              {useEndDate && (
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formatDateButtonLabel(endDate) ?? <span>Pick end date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={parseLocalDateOnly(endDate)}
                      onSelect={(date) => {
                        if (date) {
                          setEndDate(formatLocalDateOnly(date))
                          setEndDateOpen(false)
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Max Users (unique users who can apply)</Label>
              <Input value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} placeholder="e.g., 1 (for 1:1) or leave empty for unlimited" />
            </div>

            <div className="md:col-span-2 flex gap-2">
              <Button onClick={submit} className="flex-1" disabled={invalidFields.length > 0}>
                <Plus className="h-4 w-4 mr-2" />
                {editingPromoId ? "Save Promo" : "Create Promo"}
              </Button>
              {editingPromoId && (
                <Button variant="outline" onClick={() => resetCreateForm()}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing Promo Codes</CardTitle>
            <CardDescription>Newest first</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPromos ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : promoCodes.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">No promo codes yet.</div>
            ) : (
              <div className="space-y-3">
                {promoCodes.map((p) => (
                  <div key={p.id} className="p-4 border border-border rounded-lg flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold">{p.code}</span>
                        {getPromoBadge(p.promo_type)}
                        <Badge variant={p.enabled ? "default" : "secondary"}>{p.enabled ? "Enabled" : "Disabled"}</Badge>
                        <Badge variant="outline" className="flex items-center gap-2">
                          {getAppliesIcon(p.applies_to)}
                          {p.applies_to}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {p.promo_type === "free" && <>FREE per month</>}
                        {p.promo_type === "fixed" && <>Fixed: ${(p.fixed_amount_cents || 0) / 100}/mo</>}
                        {p.promo_type === "percentage" && <>Percent: {p.percentage_value}%</>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Signup by:{" "}
                        {p.use_redeem_by_date && p.redeem_by_date
                          ? p.redeem_by_date
                          : "off (uses legacy end date if set)"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Benefit after signup:{" "}
                        {p.benefit_months != null && p.benefit_months !== undefined
                          ? `${p.benefit_months} month(s), then list price`
                          : "legacy — promo start/end dates only"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Campaign dates:{" "}
                        {p.use_start_date ? `Start ${p.start_date}` : "Start (off)"}{" • "}
                        {p.use_end_date ? `End ${p.end_date}` : "End (off)"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Usage: {p.used_users_count || 0}/{p.max_users === null || p.max_users === undefined ? "∞" : p.max_users}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => startEdit(p)}
                        aria-label={`Edit promo ${p.code}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setPromoPendingDelete({ id: p.id, code: p.code })}
                        aria-label={`Delete promo ${p.code}`}
                        disabled={deletingPromo}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <AlertDialog
        open={!!promoPendingDelete}
        onOpenChange={(open) => {
          if (!open && !deletingPromo) setPromoPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete promo code?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes{" "}
              <span className="font-mono font-medium text-foreground">
                {promoPendingDelete?.code}
              </span>
              . Related redemption records are removed; existing subscriptions are not cancelled in Stripe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingPromo}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={confirmDeletePromo}
              disabled={deletingPromo}
              className="gap-2"
            >
              {deletingPromo ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

