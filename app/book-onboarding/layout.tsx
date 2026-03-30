import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Schedule onboarding | Amanah',
  description:
    'Book a time with the Amanah team to onboard your mosque or business on the Amanah platform.',
}

export default function BookOnboardingLayout({
  children,
}: {
  children: ReactNode
}) {
  return children
}
