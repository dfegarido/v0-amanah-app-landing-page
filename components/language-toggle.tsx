"use client"

import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LanguageToggleProps {
  language: "en" | "ar"
  onToggle: () => void
}

export function LanguageToggle({ language, onToggle }: LanguageToggleProps) {
  return (
    <Button
      onClick={onToggle}
      variant="outline"
      size="sm"
      className="fixed top-4 right-4 z-50 gap-2 bg-background/80 backdrop-blur-sm"
    >
      <Globe className="h-4 w-4" />
      {language === "en" ? "العربية" : "English"}
    </Button>
  )
}
