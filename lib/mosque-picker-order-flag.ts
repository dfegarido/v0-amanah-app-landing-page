/**
 * Curated mosque picker order (admin codes + API reordering).
 *
 * 1) Set `FORCE_DISABLE_CURATED_MOSQUE_ORDER` to false when you want this feature back (no env needed).
 * 2) Or leave force false and set NEXT_PUBLIC_DISABLE_MOSQUE_PICKER_ORDER=1 in .env / Vercel.
 */
const FORCE_DISABLE_CURATED_MOSQUE_ORDER = true

export function isMosquePickerOrderDisabled(): boolean {
  if (FORCE_DISABLE_CURATED_MOSQUE_ORDER) return true
  const v = process.env.NEXT_PUBLIC_DISABLE_MOSQUE_PICKER_ORDER?.trim().toLowerCase()
  return v === "1" || v === "true" || v === "yes"
}
