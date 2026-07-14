import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/lib/auth-context"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const SITE_URL = "https://www.amanahbiz.com"
const SITE_NAME = "Amanah"
const SITE_TITLE = "Amanah — Trusted Muslim Business Directory & Community Platform"
const SITE_DESCRIPTION =
  "Connect with your local masjid, discover Amanah-certified Muslim businesses, and strengthen your ummah. 30% of every subscription goes back to the community — 10% to your masjid, 20% to scholarships and interest-free loans."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Muslim business directory",
    "halal business",
    "Amanah certified",
    "masjid app",
    "mosque near me",
    "Islamic community platform",
    "Muslim owned businesses",
  ],
  alternates: {
    canonical: "/",
    languages: {
      en: "/",
      ar: "/",
    },
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
    alternateLocale: ["ar_US"],
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Amanah — trust-based commerce for the Muslim community",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" dir="ltr">
      <body className={`font-sans antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', e => {
                if (e.message === 'ResizeObserver loop completed with undelivered notifications.' || 
                    e.message === 'ResizeObserver loop limit exceeded') {
                  e.stopImmediatePropagation();
                  e.preventDefault();
                }
              });
            `,
          }}
        />
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
