"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, Heart, Globe, MapPin, Phone, Mail, ExternalLink, Loader2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Nonprofit {
  id: string
  name: string
  about: string
  address: string
  email: string
  phone: string
  website?: string
  donate_link?: string
  logo?: string
  photos?: string[]
  social_media?: any
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function NonprofitsPage() {
  const [nonprofits, setNonprofits] = useState<Nonprofit[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const fetchNonprofits = async (page: number = 1, search: string = "") => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        status: "active",
      })

      if (search) {
        params.append("search", search)
      }

      const response = await fetch(`/api/directory/nonprofits?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setNonprofits(data.data.nonprofits || [])
        setPagination(data.data.pagination || pagination)
      }
    } catch (error) {
      console.error("Error fetching nonprofits:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNonprofits(1, searchQuery)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchNonprofits(1, searchQuery)
  }

  const handlePageChange = (newPage: number) => {
    fetchNonprofits(newPage, searchQuery)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Heart className="h-8 w-8 text-primary" />
                Non-Profit Organizations
              </h1>
              <p className="text-muted-foreground mt-2">
                Discover and support charitable organizations in the Muslim community
              </p>
            </div>
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search nonprofits by name, description, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-6 text-lg"
            />
            <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2" size="sm">
              Search
            </Button>
          </div>
        </form>

        {/* Results Count */}
        {!loading && (
          <div className="mb-6 text-sm text-muted-foreground">
            Found {pagination.total} nonprofit{pagination.total !== 1 ? "s" : ""}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading nonprofits...</span>
          </div>
        )}

        {/* Nonprofits Grid */}
        {!loading && nonprofits.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No nonprofits found</h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "Check back soon for nonprofit organizations"}
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && nonprofits.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {nonprofits.map((nonprofit) => (
              <Card key={nonprofit.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    {nonprofit.logo ? (
                      <img
                        src={nonprofit.logo}
                        alt={nonprofit.name}
                        className="h-16 w-16 object-contain rounded-lg border"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Heart className="h-8 w-8 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg line-clamp-2">{nonprofit.name}</CardTitle>
                      {nonprofit.address && (
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{nonprofit.address}</span>
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* About */}
                  {nonprofit.about && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{nonprofit.about}</p>
                  )}

                  {/* Contact Info */}
                  <div className="space-y-2 text-sm">
                    {nonprofit.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <a
                          href={`mailto:${nonprofit.email}`}
                          className="hover:text-primary truncate"
                          title={nonprofit.email}
                        >
                          {nonprofit.email}
                        </a>
                      </div>
                    )}
                    {nonprofit.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${nonprofit.phone}`} className="hover:text-primary">
                          {nonprofit.phone}
                        </a>
                      </div>
                    )}
                    {nonprofit.website && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        <a
                          href={nonprofit.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary truncate flex items-center gap-1"
                        >
                          Visit Website
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Donate Link - Prominent */}
                  {nonprofit.donate_link && (
                    <Button
                      asChild
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      <a
                        href={nonprofit.donate_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <Heart className="h-4 w-4" />
                        Donate Now
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}

                  {/* No Donate Link */}
                  {!nonprofit.donate_link && (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      Contact for donation information
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}

