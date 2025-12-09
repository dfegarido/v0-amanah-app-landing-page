"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus } from "lucide-react"

const formTranslations = {
  en: {
    addMosque: "Add a Mosque",
    dialogTitle: "Add a Mosque",
    dialogDesc: "Help us expand our network by adding your local mosque to Amanah.",
    mosqueName: "Mosque Name",
    mosqueNamePlaceholder: "Enter mosque name",
    location: "Location",
    locationPlaceholder: "City, State or Full Address",
    phoneNumber: "Phone Number",
    phoneNumberPlaceholder: "(555) 123-4567",
    contactName: "Contact Name (Leader)",
    contactNamePlaceholder: "Name of mosque leader or contact person",
    submit: "Submit Mosque",
  },
  ar: {
    addMosque: "أضف مسجدًا",
    dialogTitle: "أضف مسجدًا",
    dialogDesc: "ساعدنا في توسيع شبكتنا عن طريق إضافة مسجدك المحلي إلى أمانة.",
    mosqueName: "اسم المسجد",
    mosqueNamePlaceholder: "أدخل اسم المسجد",
    location: "الموقع",
    locationPlaceholder: "المدينة، الولاية أو العنوان الكامل",
    phoneNumber: "رقم الهاتف",
    phoneNumberPlaceholder: "(555) 123-4567",
    contactName: "اسم جهة الاتصال (القائد)",
    contactNamePlaceholder: "اسم قائد المسجد أو الشخص المسؤول",
    submit: "إرسال المسجد",
  },
}

interface AddMosqueFormProps {
  language?: "en" | "ar"
}

export function AddMosqueForm({ language = "en" }: AddMosqueFormProps) {
  const t = formTranslations[language]
  const [formData, setFormData] = useState({
    mosqueName: "",
    location: "",
    phoneNumber: "",
    contactName: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log("Form submitted:", formData)
    // Reset form
    setFormData({
      mosqueName: "",
      location: "",
      phoneNumber: "",
      contactName: "",
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-6">
          <Plus className="h-5 w-5 me-2" />
          {t.addMosque}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t.dialogTitle}</DialogTitle>
          <DialogDescription className="text-base">{t.dialogDesc}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="mosqueName">{t.mosqueName}</Label>
            <Input
              id="mosqueName"
              name="mosqueName"
              placeholder={t.mosqueNamePlaceholder}
              value={formData.mosqueName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">{t.location}</Label>
            <Input
              id="location"
              name="location"
              placeholder={t.locationPlaceholder}
              value={formData.location}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">{t.phoneNumber}</Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              placeholder={t.phoneNumberPlaceholder}
              value={formData.phoneNumber}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactName">{t.contactName}</Label>
            <Input
              id="contactName"
              name="contactName"
              placeholder={t.contactNamePlaceholder}
              value={formData.contactName}
              onChange={handleChange}
              required
            />
          </div>
          <Button type="submit" className="w-full" size="lg">
            {t.submit}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
