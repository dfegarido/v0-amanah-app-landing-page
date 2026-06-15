import { NextResponse } from "next/server"
import { BUSINESS_DIRECTORY_URL } from "@/lib/business-directory-external"

export const dynamic = "force-dynamic"

/** Same-origin embed so the directory can load inside our modal iframe (upstream blocks frame-ancestors). */
export async function GET() {
  try {
    const upstream = await fetch(BUSINESS_DIRECTORY_URL, {
      headers: {
        Accept: "text/html",
        "User-Agent": "Mozilla/5.0 (compatible; AmanahApp/1.0)",
      },
      cache: "no-store",
    })

    if (!upstream.ok) {
      return new NextResponse("Directory unavailable", { status: 502 })
    }

    let html = await upstream.text()
    const base = new URL(BUSINESS_DIRECTORY_URL)
    const baseHref = `${base.origin}${base.pathname.replace(/[^/]+$/, "")}`
    const baseTag = `<base href="${baseHref}">`

    if (/<head/i.test(html)) {
      html = html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`)
    } else {
      html = `${baseTag}${html}`
    }

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  } catch {
    return new NextResponse("Directory unavailable", { status: 502 })
  }
}
