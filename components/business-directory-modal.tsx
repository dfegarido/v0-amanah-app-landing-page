"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const EMBED_PATH = "/directory/embed"

type BusinessDirectoryModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  language: "en" | "ar"
}

export function BusinessDirectoryModal({
  open,
  onOpenChange,
  language,
}: BusinessDirectoryModalProps) {
  const [loadError, setLoadError] = useState(false)
  const title =
    language === "en" ? "Muslim Business Directory" : "دليل الأعمال الإسلامية"
  const unavailable =
    language === "en"
      ? "The business directory could not be loaded. Please try again later."
      : "تعذر تحميل دليل الأعمال. يرجى المحاولة مرة أخرى لاحقًا."

  useEffect(() => {
    if (open) setLoadError(false)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[90vh] w-[95vw] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl"
        aria-describedby="business-directory-description"
      >
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription id="business-directory-description" className="sr-only">
            {language === "en"
              ? "Embedded Muslim business listings from the partner directory."
              : "قوائم الأعمال الإسلامية المدمجة من دليل الشريك."}
          </DialogDescription>
        </DialogHeader>
        <div className="relative min-h-0 flex-1 bg-muted/20">
          {loadError ? (
            <p className="flex h-full items-center justify-center px-6 text-center text-muted-foreground">
              {unavailable}
            </p>
          ) : (
            <iframe
              key={open ? "open" : "closed"}
              src={EMBED_PATH}
              title={title}
              className="absolute inset-0 h-full w-full border-0"
              allow="fullscreen"
              onError={() => setLoadError(true)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
