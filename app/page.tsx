import { MSquare as Mosque, Store, MapPin, Heart, Calendar, MessageCircle, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AddMosqueForm } from "@/components/add-mosque-form"

export default function AmanahLanding() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-secondary/30 px-4 py-20 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            {/* Logo/Branding */}
            <div className="mb-8 flex justify-center">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo%20amanaah-s8mAT9ZqRo2I3IbnijQZzTT6t6kevY.png"
                alt="Amanah Logo"
                className="h-32 w-auto md:h-40"
              />
            </div>

            <h2 className="mb-4 text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl text-balance">
              Your trusted Muslim community platform
            </h2>

            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl leading-relaxed">
              Connect with your local masjid, discover trusted Muslim businesses, and strengthen your ummah through
              Amanah — built on the foundation of trust.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-6">
                Download for iOS
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-transparent">
                Download for Android
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h3 className="mb-4 text-3xl font-bold text-foreground md:text-5xl">
              Everything your Muslim community needs
            </h3>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed">
              Amanah brings together the essential tools to keep you connected with your faith and community.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <Card className="p-8 transition-all hover:shadow-lg">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
                <Mosque className="h-7 w-7 text-primary" />
              </div>
              <h4 className="mb-3 text-xl font-bold text-card-foreground">Connect With Your Mosque</h4>
              <p className="text-muted-foreground leading-relaxed">
                Access your favorite mosque's app, stay updated with prayer times, events, and community announcements
                in one place.
              </p>
            </Card>

            {/* Feature 2 */}
            <Card className="p-8 transition-all hover:shadow-lg">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
                <Store className="h-7 w-7 text-primary" />
              </div>
              <h4 className="mb-3 text-xl font-bold text-card-foreground">Muslim Business Directory</h4>
              <p className="text-muted-foreground leading-relaxed">
                Discover and support trusted Muslim-owned businesses in your area. Build economic strength within the
                ummah.
              </p>
            </Card>

            {/* Feature 3 */}
            <Card className="p-8 transition-all hover:shadow-lg">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
                <MapPin className="h-7 w-7 text-primary" />
              </div>
              <h4 className="mb-3 text-xl font-bold text-card-foreground">Mosque Near Me</h4>
              <p className="text-muted-foreground leading-relaxed">
                Find nearby masjids wherever you are. Never miss a prayer with our comprehensive mosque finder.
              </p>
            </Card>

            {/* Feature 4 */}
            <Card className="p-8 transition-all hover:shadow-lg">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-7 w-7 text-primary" />
              </div>
              <h4 className="mb-3 text-xl font-bold text-card-foreground">Events & Gatherings</h4>
              <p className="text-muted-foreground leading-relaxed">
                Discover community events, Islamic classes, and gatherings. Stay engaged with your local Muslim
                community.
              </p>
            </Card>

            {/* Feature 5 */}
            <Card className="p-8 transition-all hover:shadow-lg">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
                <Heart className="h-7 w-7 text-primary" />
              </div>
              <h4 className="mb-3 text-xl font-bold text-card-foreground">Support Your Masjid</h4>
              <p className="text-muted-foreground leading-relaxed">
                Make donations easily and securely. Support your local mosque and Islamic institutions with just a few
                taps.
              </p>
            </Card>

            {/* Feature 6 */}
            <Card className="p-8 transition-all hover:shadow-lg">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
                <MessageCircle className="h-7 w-7 text-primary" />
              </div>
              <h4 className="mb-3 text-xl font-bold text-card-foreground">Direct Communication</h4>
              <p className="text-muted-foreground leading-relaxed">
                Chat directly with your mosque administration. Ask questions, get updates, and stay connected.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="px-4 py-20 bg-secondary/50">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary">
              <Shield className="h-10 w-10 text-primary-foreground" />
            </div>
            <h3 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">Built on Amanah — Trust</h3>
            <p className="mb-8 max-w-2xl text-lg text-muted-foreground leading-relaxed">
              Amanah means trust, and it's at the heart of everything we do. We're committed to creating a safe,
              authentic space where Muslims can connect, support each other, and strengthen their faith together.
            </p>
            <div className="grid gap-8 md:grid-cols-3 w-full">
              <div>
                <div className="mb-2 text-4xl font-bold text-primary">100%</div>
                <div className="text-sm text-muted-foreground">Verified Muslim Businesses</div>
              </div>
              <div>
                <div className="mb-2 text-4xl font-bold text-primary">30%</div>
                <div className="text-sm text-muted-foreground">Of all profits goes back to the mosques</div>
              </div>
              <div>
                <div className="mb-2 text-4xl font-bold text-primary">50K+</div>
                <div className="text-sm text-muted-foreground">Active Community Members</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Screenshot Section */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h3 className="mb-4 text-3xl font-bold text-foreground md:text-5xl">See Amanah in action</h3>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed">
              A seamless experience designed for the modern Muslim community.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Amanah%20home%20scree-6bFrJlAOH0M6YZqzAOqlIkDYRPdeWF.png"
                alt="Amanah home screen showing main features"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/mosque%20home-6iy1Ecv04RICNXa2VBWXyjb20f5Y2P.png"
                alt="Mosque profile showing prayer times and events"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/mosque%20near%20me-gLZbe6Zaq5PsdhszIGakNEkh0y9slN.png"
                alt="Mosque finder showing nearby masjids"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 bg-primary">
        <div className="mx-auto max-w-4xl text-center">
          <h3 className="mb-4 text-3xl font-bold text-primary-foreground md:text-5xl text-balance">
            Join thousands of Muslims strengthening their community
          </h3>
          <p className="mb-8 text-lg text-primary-foreground/90 leading-relaxed">
            Download Amanah today and stay connected with your faith, your mosque, and your ummah.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
              Download for iOS
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary text-lg px-8 py-6 bg-transparent"
            >
              Download for Android
            </Button>
          </div>
        </div>
      </section>

      {/* Add Mosque Section */}
      <section className="px-4 py-20 bg-secondary/30">
        <div className="mx-auto max-w-4xl text-center">
          <h3 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">Is your mosque not listed?</h3>
          <p className="mb-8 text-lg text-muted-foreground leading-relaxed">
            Help us grow our community by adding your local masjid to the Amanah network.
          </p>
          <AddMosqueForm />
        </div>
      </section>
    </div>
  )
}
