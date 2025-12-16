"use client"

import { useState } from "react"
import Link from "next/link"
import {
  MSquare as Mosque,
  Store,
  MapPin,
  Heart,
  Calendar,
  MessageCircle,
  Shield,
  LogIn,
  Plus,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { LanguageToggle } from "@/components/language-toggle"
import { getTotalCommunityFunding } from "@/lib/mock-data"

const IOS_APP_URL = "https://apps.apple.com/us/app/amanah/id6755299369"
const ANDROID_APP_URL = "https://play.google.com/store/apps/details?id=com.mobileappcity.amanah"

const translations = {
  en: {
    heroTitle: "Amanah is not just an app",
    heroSubtitle: "It's a movement to rebuild trust, inspire excellence, and uplift communities through innovation.",
    downloadIOS: "Download for iOS",
    downloadAndroid: "Download for Android",
    missionTitle: "Mission Statement",
    missionText:
      "Amanah App exists to revive the legacy of trust-based commerce that once spread Islam across continents, through the integrity of Muslim merchants. Our mission is to build a digital ecosystem where verified Muslim-owned businesses thrive, mosques are empowered, and communities reconnect through shared values of honesty, service, and social impact.",
    missionCTA: "Join the movement. Build trust. Empower your community.",
    featuresTitle: "Everything your Muslim community needs",
    featuresSubtitle: "Amanah brings together the essential tools to keep you connected with your faith and community.",
    connectMosque: "Connect With Your Mosque",
    connectMosqueDesc:
      "Access your favorite mosque's app, stay updated with prayer times, events, and community announcements in one place.",
    businessDirectory: "Muslim Business Directory",
    businessDirectoryDesc:
      "Discover and support trusted Muslim-owned businesses in your area. Build economic strength within the ummah.",
    mosqueNearMe: "Mosque Near Me",
    mosqueNearMeDesc: "Find nearby masjids wherever you are. Never miss a prayer with our comprehensive mosque finder.",
    events: "Events & Gatherings",
    eventsDesc:
      "Discover community events, Islamic classes, and gatherings. Stay engaged with your local Muslim community.",
    supportMasjid: "Support Your Masjid",
    supportMasjidDesc:
      "Make donations easily and securely. Support your local mosque and Islamic institutions with just a few taps.",
    directComm: "Direct Communication",
    directCommDesc: "Chat directly with your mosque administration. Ask questions, get updates, and stay connected.",
    trustTitle: "Built on Amanah — Trust",
    trustDesc:
      "Amanah means trust, and it's at the heart of everything we do. We're committed to creating a safe, authentic space where Muslims can connect, support each other, and strengthen their faith together.",
    noSellInfo: "We never sell your information",
    profitDonated: "Of all profit is donated",
    toMosque: "To the mosque of your choice",
    toEducation: "To Amanah Org for Muslim children's education",
    hadithTitle: "Prophetic Hadith",
    hadithText: '"The honest and trustworthy merchant will be with the Prophets, the truthful, and the martyrs."',
    hadithSource: "— Reported by At-Tirmidhi",
    hadithExplanation:
      "This Hadith honors those who conduct business with sincerity and trust, placing them among the most revered in the Hereafter. It's a direct affirmation of the spiritual value behind our mission: that commerce, when rooted in Amanah, becomes a path to divine reward.",
    screenshotsTitle: "See Amanah in action",
    screenshotsSubtitle: "A seamless experience designed for the modern Muslim community.",
    ctaTitle: "Join thousands of Muslims strengthening their community",
    ctaSubtitle: "Download Amanah today and stay connected with your faith, your mosque, and your ummah.",
    addMosqueTitle: "Looking to list your business, mosque, or feature a coupon?",
    addMosqueSubtitle: "Create an account to get started and join the Amanah network.",
  },
  ar: {
    heroTitle: "أمانة ليست مجرد تطبيق",
    heroSubtitle: "إنها حركة لإعادة بناء الثقة، وإلهام التميز، ورفع المجتمعات من خلال الابتكار.",
    downloadIOS: "تحميل لـ iOS",
    downloadAndroid: "تحميل لـ Android",
    missionTitle: "بيان المهمة",
    missionText:
      "يوجد تطبيق أمانة لإحياء إرث التجارة القائمة على الثقة التي نشرت الإسلام عبر القارات من خلال نزاهة التجار المسلمين. مهمتنا هي بناء نظام بيئي رقمي حيث تزدهر الأعمال المملوكة للمسلمين والتي تم التحقق منها، وتمكين المساجد، وإعادة ربط المجتمعات من خلال القيم المشتركة للصدق والخدمة والتأثير الاجتماعي.",
    missionCTA: "انضم إلى الحركة. ابنِ الثقة. مكّن مجتمعك.",
    featuresTitle: "كل ما يحتاجه مجتمعك المسلم",
    featuresSubtitle: "تجمع أمانة الأدوات الأساسية لإبقائك على اتصال بإيمانك ومجتمعك.",
    connectMosque: "تواصل مع مسجدك",
    connectMosqueDesc:
      "الوصول إلى تطبيق مسجدك المفضل، والبقاء على اطلاع بأوقات الصلاة والفعاليات وإعلانات المجتمع في مكان واحد.",
    businessDirectory: "دليل الأعمال الإسلامية",
    businessDirectoryDesc: "اكتشف ودعم الأعمال الموثوقة المملوكة للمسلمين في منطقتك. بناء القوة الاقتصادية داخل الأمة.",
    mosqueNearMe: "مسجد بالقرب مني",
    mosqueNearMeDesc: "ابحث عن المساجد القريبة أينما كنت. لا تفوت صلاة مع الباحث الشامل عن المساجد.",
    events: "الفعاليات والتجمعات",
    eventsDesc: "اكتشف الفعاليات المجتمعية والدروس الإسلامية والتجمعات. ابقَ منخرطًا مع مجتمعك المسلم المحلي.",
    supportMasjid: "ادعم مسجدك",
    supportMasjidDesc: "تبرع بسهولة وأمان. ادعم مسجدك المحلي والمؤسسات الإسلامية ببضع نقرات فقط.",
    directComm: "التواصل المباشر",
    directCommDesc: "تحدث مباشرة مع إدارة مسجدك. اطرح الأسئلة واحصل على التحديثات وابقَ على اتصال.",
    trustTitle: "مبني على الأمانة — الثقة",
    trustDesc:
      "الأمانة تعني الثقة، وهي في صميم كل ما نقوم به. نحن ملتزمون بخلق مساحة آمنة وأصيلة حيث يمكن للمسلمين التواصل ودعم بعضهم البعض وتقوية إيمانهم معًا.",
    noSellInfo: "نحن لا نبيع معلوماتك أبدًا",
    profitDonated: "من جميع الأرباح يتم التبرع بها",
    toMosque: "إلى المسجد الذي تختاره",
    toEducation: "إلى منظمة أمانة لتعليم الأطفال المسلمين",
    hadithTitle: "حديث نبوي",
    hadithText: '"التاجر الصدوق الأمين مع النبيين والصديقين والشهداء."',
    hadithSource: "— رواه الترمذي",
    hadithExplanation:
      "هذا الحديث يُكرّم أولئك الذين يمارسون التجارة بإخلاص وأمانة، ويضعهم بين الأكثر تبجيلاً في الآخرة. إنه تأكيد مباشر على القيمة الروحية وراء مهمتنا: أن التجارة، عندما تكون متجذرة في الأمانة، تصبح طريقًا إلى الثواب الإلهي.",
    screenshotsTitle: "شاهد أمانة في العمل",
    screenshotsSubtitle: "تجربة سلسة مصممة للمجتمع المسلم الحديث.",
    ctaTitle: "انضم إلى آلاف المسلمين الذين يقوون مجتمعهم",
    ctaSubtitle: "حمّل أمانة اليوم وابقَ على اتصال بإيمانك ومسجدك وأمتك.",
    addMosqueTitle: "تبحث عن إدراج عملك أو مسجدك أو عرض قسيمة؟",
    addMosqueSubtitle: "أنشئ حسابًا للبدء والانضمام إلى شبكة أمانة.",
  },
}

export default function AmanahLanding() {
  const [language, setLanguage] = useState<"en" | "ar">("en")
  const t = translations[language]
  const isRTL = language === "ar"

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ar" : "en")
  }

  const communityFunding = getTotalCommunityFunding()

  return (
    <div className={`min-h-screen bg-background ${isRTL ? "rtl" : "ltr"}`} dir={isRTL ? "rtl" : "ltr"}>
      <LanguageToggle language={language} onToggle={toggleLanguage} />

      <div className="fixed top-4 left-4 z-50">
        <Button asChild variant="outline" className="bg-background/80 backdrop-blur-sm">
          <Link href="/login">
            <LogIn className="mr-2 h-4 w-4" />
            {language === "en" ? "Login" : "تسجيل الدخول"}
          </Link>
        </Button>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-secondary/30 px-4 py-20 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            {/* Logo/Branding */}
            <div className="mb-8 flex justify-center">
              <img src="/images/logo-20amanaah.png" alt="Amanah Logo" className="h-32 w-auto md:h-40" />
            </div>

            <h2 className="mb-4 text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl text-balance">
              {t.heroTitle}
            </h2>

            <p className="mx-auto mb-8 max-w-3xl text-lg text-muted-foreground md:text-xl leading-relaxed">
              {t.heroSubtitle}
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-6"
                asChild
              >
                <a href={IOS_APP_URL} target="_blank" rel="noopener noreferrer">
                  {t.downloadIOS}
                </a>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-transparent" asChild>
                <a href={ANDROID_APP_URL} target="_blank" rel="noopener noreferrer">
                  {t.downloadAndroid}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Statement Section */}
      <section className="px-4 py-20 bg-secondary/50">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h3 className="mb-6 text-3xl font-bold text-foreground md:text-4xl">{t.missionTitle}</h3>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">{t.missionText}</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-primary mb-2">{t.missionCTA}</p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h3 className="mb-4 text-3xl font-bold text-foreground md:text-5xl">{t.featuresTitle}</h3>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed">{t.featuresSubtitle}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <Card className="p-8 transition-all hover:shadow-lg">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
                <Mosque className="h-7 w-7 text-primary" />
              </div>
              <h4 className="mb-3 text-xl font-bold text-card-foreground">{t.connectMosque}</h4>
              <p className="text-muted-foreground leading-relaxed">{t.connectMosqueDesc}</p>
            </Card>

            {/* Feature 2 */}
            <Card className="p-8 transition-all hover:shadow-lg">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
                <Store className="h-7 w-7 text-primary" />
              </div>
              <h4 className="mb-3 text-xl font-bold text-card-foreground">{t.businessDirectory}</h4>
              <p className="text-muted-foreground leading-relaxed">{t.businessDirectoryDesc}</p>
            </Card>

            {/* Feature 3 */}
            <Card className="p-8 transition-all hover:shadow-lg">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
                <MapPin className="h-7 w-7 text-primary" />
              </div>
              <h4 className="mb-3 text-xl font-bold text-card-foreground">{t.mosqueNearMe}</h4>
              <p className="text-muted-foreground leading-relaxed">{t.mosqueNearMeDesc}</p>
            </Card>

            {/* Feature 4 */}
            <Card className="p-8 transition-all hover:shadow-lg">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-7 w-7 text-primary" />
              </div>
              <h4 className="mb-3 text-xl font-bold text-card-foreground">{t.events}</h4>
              <p className="text-muted-foreground leading-relaxed">{t.eventsDesc}</p>
            </Card>

            {/* Feature 5 */}
            <Card className="p-8 transition-all hover:shadow-lg">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
                <Heart className="h-7 w-7 text-primary" />
              </div>
              <h4 className="mb-3 text-xl font-bold text-card-foreground">{t.supportMasjid}</h4>
              <p className="text-muted-foreground leading-relaxed">{t.supportMasjidDesc}</p>
            </Card>

            {/* Feature 6 */}
            <Card className="p-8 transition-all hover:shadow-lg">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
                <MessageCircle className="h-7 w-7 text-primary" />
              </div>
              <h4 className="mb-3 text-xl font-bold text-card-foreground">{t.directComm}</h4>
              <p className="text-muted-foreground leading-relaxed">{t.directCommDesc}</p>
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
            <h3 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">{t.trustTitle}</h3>
            <p className="mb-8 max-w-2xl text-lg text-muted-foreground leading-relaxed">{t.trustDesc}</p>
            <p className="mb-8 max-w-2xl text-lg font-semibold text-foreground">{t.noSellInfo}</p>
            <div className="grid gap-8 md:grid-cols-3 max-w-4xl w-full">
              <div className="text-center">
                <div className="mb-2 text-5xl font-bold text-primary">25%</div>
                <p className="text-lg text-muted-foreground">{t.profitDonated}</p>
              </div>
              <div className="text-center">
                <div className="mb-2 text-5xl font-bold text-primary">10%</div>
                <p className="text-lg text-muted-foreground">{t.toMosque}</p>
              </div>
              <div className="text-center">
                <div className="mb-2 text-5xl font-bold text-primary">15%</div>
                <p className="text-lg text-muted-foreground">{t.toEducation}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community Impact Tracker Section */}
      <section className="px-4 py-16 bg-gradient-to-br from-primary/10 to-primary/5 border-y border-primary/20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <TrendingUp className="h-8 w-8 text-primary" />
              <h3 className="text-3xl font-bold text-foreground md:text-4xl">
                {language === "en" ? "Community Impact Tracker" : "متتبع التأثير المجتمعي"}
              </h3>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              {language === "en"
                ? "Total funds returned to the Muslim community"
                : "إجمالي الأموال المعادة للمجتمع المسلم"}
            </p>

            <Card className="p-8 text-center bg-background/50 backdrop-blur border-primary/20 inline-block">
              <div className="text-5xl font-bold text-primary mb-3">
                ${communityFunding.totalGivenBack.toLocaleString()}
              </div>
              <p className="text-muted-foreground font-semibold">
                {language === "en" ? "Given Back to Community" : "معاد للمجتمع"}
              </p>
            </Card>

            <p className="text-sm text-muted-foreground italic mt-8">
              {language === "en"
                ? "Updated in real-time based on active subscriptions and contributions"
                : "يتم التحديث في الوقت الفعلي بناءً على الاشتراكات النشطة والمساهمات"}
            </p>
          </div>
        </div>
      </section>

      {/* Hadith Section */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="text-center p-8 md:p-12 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20">
            <h3 className="mb-6 text-2xl font-bold text-foreground md:text-3xl">{t.hadithTitle}</h3>
            <blockquote className="mb-6">
              <p className="text-xl md:text-2xl text-foreground font-semibold italic mb-4 leading-relaxed">
                {t.hadithText}
              </p>
              <cite className="text-muted-foreground text-lg">{t.hadithSource}</cite>
            </blockquote>
            <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">{t.hadithExplanation}</p>
          </div>
        </div>
      </section>

      {/* Screenshot Section */}
      <section className="px-4 py-20 bg-secondary/30">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h3 className="mb-4 text-3xl font-bold text-foreground md:text-5xl">{t.screenshotsTitle}</h3>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed">{t.screenshotsSubtitle}</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
              <img
                src="/images/amanah-20home-20scree.png"
                alt="Amanah home screen showing main features"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
              <img
                src="/images/mosque-20home.png"
                alt="Mosque profile showing prayer times and events"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
              <img
                src="/images/mosque-20near-20me.png"
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
          <h3 className="mb-4 text-3xl font-bold text-primary-foreground md:text-5xl text-balance">{t.ctaTitle}</h3>
          <p className="mb-8 text-lg text-primary-foreground/90 leading-relaxed">{t.ctaSubtitle}</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6" asChild>
              <a href={IOS_APP_URL} target="_blank" rel="noopener noreferrer">
                {t.downloadIOS}
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary text-lg px-8 py-6 bg-transparent"
              asChild
            >
              <a href={ANDROID_APP_URL} target="_blank" rel="noopener noreferrer">
                {t.downloadAndroid}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Add Mosque Section */}
      <section className="px-4 py-20 bg-secondary/30">
        <div className="mx-auto max-w-4xl text-center">
          <h3 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            {language === "en"
              ? "Looking to list your business, mosque, or feature a coupon?"
              : "تبحث عن إدراج عملك أو مسجدك أو عرض قسيمة؟"}
          </h3>
          <p className="mb-8 text-lg text-muted-foreground leading-relaxed">
            {language === "en"
              ? "Create an account to get started and join the Amanah network."
              : "أنشئ حسابًا للبدء والانضمام إلى شبكة أمانة."}
          </p>
          <Button
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-6"
            asChild
          >
            <Link href="/login">
              <Plus className="h-5 w-5 me-2" />
              {language === "en" ? "Create Account" : "إنشاء حساب"}
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
