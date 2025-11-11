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

export function AddMosqueForm() {
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
          <Plus className="mr-2 h-5 w-5" />
          Add a Mosque
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Add a Mosque</DialogTitle>
          <DialogDescription className="text-base">
            Help us expand our network by adding your local mosque to Amanah.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="mosqueName">Mosque Name</Label>
            <Input
              id="mosqueName"
              name="mosqueName"
              placeholder="Enter mosque name"
              value={formData.mosqueName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              placeholder="City, State or Full Address"
              value={formData.location}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              placeholder="(555) 123-4567"
              value={formData.phoneNumber}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactName">Contact Name (Leader)</Label>
            <Input
              id="contactName"
              name="contactName"
              placeholder="Name of mosque leader or contact person"
              value={formData.contactName}
              onChange={handleChange}
              required
            />
          </div>
          <Button type="submit" className="w-full" size="lg">
            Submit Mosque
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
