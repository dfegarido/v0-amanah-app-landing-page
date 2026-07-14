"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
  MSquare as Mosque,
  Store,
  MapPin,
  Heart,
  Calendar,
  MessageCircle,
  Shield,
  Plus,
  TrendingUp,
  ArrowRight,
  LayoutGrid,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { LanguageToggle } from "@/components/language-toggle"
import { BusinessDirectoryModal } from "@/components/business-directory-modal"

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
      "Amanah US Inc. (EIN 41-3030153) is dedicated to uplifting and certifying honest Muslim businesses across America by upholding the teachings of Islam in commerce, character, and integrity. Through the Amanah Certification Program, the organization evaluates and approves businesses that demonstrate honesty, fairness, and ethical conduct in accordance with Islamic principles. Certified participants display the Amanah mark as a symbol of trust and accountability, helping consumers identify enterprises that meet these standards.\n\nBeyond certification, Amanah US Inc. also supports education by providing Muslim youth with interest-free loans, scholarships, and mentorship to help them succeed academically and professionally. Together, these efforts strengthen our community, promote Islamic education, and raise a generation that sees Islam practiced with excellence in business and takes pride in its Muslim identity.",
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
    profitDonated: "Of every subscription goes back",
    toMosque: "To the masjid of your choice",
    toEducation: "To scholarships, interest-free loans & Islamic schools",
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
    scheduleOnboarding: "Schedule onboarding",
    scheduleOnboardingDesc:
      "Prefer to talk with our team first? Book a time and we’ll help you get started.",
    directory: "Directory",
    directoryDesc: "Browse Muslim-owned business listings.",
  },
  ar: {
    heroTitle: "أمانة ليست مجرد تطبيق",
    heroSubtitle: "إنها حركة لإعادة بناء الثقة، وإلهام التميُّز، ورفع المجتمعات من خلال التخطيط الجمعي الخلّاق.",
    downloadIOS: "تحميل لـ iOS",
    downloadAndroid: "تحميل لـ Android",
    missionTitle: "بيان المهمة",
    missionText:
      "تكرّس مؤسسة أمانة الأمريكية (Amanah US Inc.) — رقم التعريف الضريبي 41-3030153 — جهودها للارتقاء بالأعمال الإسلامية النزيهة في جميع أنحاء أمريكا واعتمادها، من خلال التمسّك بتعاليم الإسلام في التجارة والأخلاق والنزاهة. ومن خلال برنامج أمانة للاعتماد، تقوم المؤسسة بتقييم واعتماد الأعمال التي تُظهر الصدق والإنصاف والسلوك الأخلاقي وفقًا للمبادئ الإسلامية. ويعرض المشاركون المعتمدون علامة أمانة رمزًا للثقة والمساءلة، مما يساعد المستهلكين على تمييز المنشآت التي تستوفي هذه المعايير.\n\nوإلى جانب الاعتماد، تدعم مؤسسة أمانة الأمريكية التعليمَ أيضًا عبر تزويد الشباب المسلم بقروض حسنة بلا فوائد، ومِنح دراسية، وإرشاد ومتابعة لمساعدتهم على النجاح أكاديميًا ومهنيًا. وتعمل هذه الجهود مجتمعةً على تقوية مجتمعنا، وتعزيز التعليم الإسلامي، وتنشئة جيل يرى الإسلام مُطبَّقًا بإتقان في مجال الأعمال ويعتزّ بهويته الإسلامية.",
    missionCTA: "انضم إلى الحركة. ابنِ الثقة. مكّن مجتمعك.",
    featuresTitle: "كل ما يحتاجه مجتمعك المسلم",
    featuresSubtitle: "تجمَعُ أمانة الأدوات الأساسية لإبقائك مُتصلاً بإيمانك ومسجدك ومجتمعك",
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
    trustTitle: "مبني على الأمانة والشفافية المباشرة — الثقة",
    trustDesc:
      "والأمانة تتضمَّنُ الثقة، وهي في صميم كل ما نقوم به. نحن ملتزمون بخلق مساحة آمنة وأصيلة حيث يمكن للمسلمين التواصل ودعم بعضهم البعض وتقوية إيمانهم معًا.",
    noSellInfo: "نحن لا نبيع معلوماتك أبدًا",
    profitDonated: "من كل اشتراك يُعاد للمجتمع",
    toMosque: "إلى المسجد الذي تختاره",
    toEducation: "للمنح الدراسية والقروض الحسنة ودعم المدارس الإسلامية",
    hadithTitle: "حديث نبوي",
    hadithText: '"التاجر الصدوق الأمين مع النبيين والصديقين والشهداء."',
    hadithSource: "— رواه الترمذي",
    hadithExplanation:
      "هذا الحديث يُكرّم أولئك الذين يمارسون التجارة بإخلاص وأمانة، ويضعهم بين الأكثر تبجيلاً في الآخرة. إنه تأكيد مباشر على القيمة الروحية وراء مهمتنا: فالتجارة، عندما تكون متجذِّرة في الأمانة، تصبح طريقاً إلى الثواب عند الله تعالى.",
    screenshotsTitle: "شاهد أمانة في العمل",
    screenshotsSubtitle: "تجربة سلسة مصمَّمة للمجتمع المسلم الحديث",
    ctaTitle: "انضم إلى آلاف المسلمين الذين يقوُّون مجتمعهم،",
    ctaSubtitle: "حمّل أمانة اليوم وابقَ على اتصال بإيمانك ومسجدك وأمَّتِك.",
    addMosqueTitle: "تبحث عن إدراج عملك أو مسجدك أو عرض قسيمة؟",
    addMosqueSubtitle: "أنشئ حسابًا للبدء والانضمام إلى شبكة أمانة.",
    scheduleOnboarding: "جدولة التسجيل",
    scheduleOnboardingDesc:
      "تفضّل التحدث مع فريقنا أولاً؟ احجز موعدًا وسنساعدك على البدء.",
    directory: "الدليل",
    directoryDesc: "تصفح قوائم الأعمال المملوكة للمسلمين.",
  },
}

/* Eight-point Islamic star motif — the page's signature ambient mark */
function StarMotif({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1" opacity="0.9">
        <rect x="40" y="40" width="120" height="120" rx="6" />
        <rect x="40" y="40" width="120" height="120" rx="6" transform="rotate(45 100 100)" />
        <circle cx="100" cy="100" r="84" />
        <circle cx="100" cy="100" r="58" />
      </g>
    </svg>
  )
}

function StarMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M12 2l2.4 5.1L20 8l-4 4 1 6-5-3-5 3 1-6-4-4 5.6-.9L12 2z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  )
}

function IconApple({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.365 12.86c-.024-2.42 1.977-3.58 2.066-3.636-1.126-1.646-2.877-1.872-3.5-1.898-1.49-.151-2.91.876-3.667.876-.756 0-1.92-.854-3.16-.83-1.626.024-3.126.944-3.962 2.398-1.69 2.93-.432 7.27 1.21 9.65.802 1.165 1.758 2.473 3.012 2.426 1.21-.049 1.667-.783 3.13-.783 1.462 0 1.872.783 3.16.758 1.305-.024 2.13-1.187 2.927-2.355.923-1.353 1.302-2.663 1.323-2.73-.029-.013-2.54-.975-2.566-3.86zM14.02 5.86c.667-.81 1.117-1.936.994-3.06-.96.039-2.124.64-2.814 1.448-.62.717-1.162 1.864-1.016 2.966 1.07.083 2.17-.544 2.836-1.354z" />
    </svg>
  )
}

function IconPlay({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M3.5 2.2l11.3 9.8L3.5 21.8c-.3.18-.7-.04-.7-.4V2.6c0-.36.4-.58.7-.4z" fill="#34d399" />
      <path d="M14.8 12l3.1-2.7 2.9 1.7c.6.36.6 1.24 0 1.6l-2.9 1.7L14.8 12z" fill="#fbbf24" />
      <path d="M3.5 2.2l11.3 9.8-2.6 2.3L2.8 2.6c0-.18.1-.32.25-.39z" fill="#60a5fa" />
      <path d="M12.2 9.7l2.6 2.3-2.6 2.3L2.8 21.4c-.15-.07-.25-.21-.25-.39L12.2 9.7z" fill="#f87171" />
    </svg>
  )
}

/* Count-up that triggers when scrolled into view */
function CountUp({ value, suffix = "", className = "" }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [n, setN] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false
    if (reduce) {
      setN(value)
      return
    }
    let raf = 0
    let done = false
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !done) {
            done = true
            const duration = 1400
            const start = performance.now()
            const step = (now: number) => {
              const p = Math.min(1, (now - start) / duration)
              const eased = 1 - Math.pow(1 - p, 3)
              setN(Math.round(eased * value))
              if (p < 1) raf = requestAnimationFrame(step)
            }
            raf = requestAnimationFrame(step)
            io.disconnect()
          }
        })
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value])
  return (
    <span ref={ref} className={className}>
      {n}
      {suffix}
    </span>
  )
}

export default function AmanahLanding() {
  const [language, setLanguage] = useState<"en" | "ar">("en")
  const [communityFunding, setCommunityFunding] = useState({
    totalGivenBack: 0,
    amanahOrgFund: 0,
    mosqueKickbacks: 0,
    manualDonations: 0,
    additionalDonations: 0,
  })
  const [loadingFunding, setLoadingFunding] = useState(true)
  const [directoryOpen, setDirectoryOpen] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const t = translations[language]
  const isRTL = language === "ar"

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ar" : "en")
  }

  // Fetch community funding from API
  useEffect(() => {
    const fetchCommunityFunding = async () => {
      try {
        setLoadingFunding(true)
        const response = await fetch("/api/community-funding")
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            setCommunityFunding(result.data)
          }
        }
      } catch (error) {
        console.error("Error fetching community funding:", error)
        // Keep default values on error
      } finally {
        setLoadingFunding(false)
      }
    }

    fetchCommunityFunding()
  }, [])

  // Respect reduced-motion: show the hero clip as a poster with controls instead of autoplaying
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduceMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches)
    mq.addEventListener?.("change", onChange)
    return () => mq.removeEventListener?.("change", onChange)
  }, [])

  // Scroll-reveal: add `.am-in` to [data-reveal] elements as they enter the viewport
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"))
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("am-in")
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [language])

  return (
    <div
      ref={rootRef}
      className={`relative min-h-screen overflow-x-hidden bg-background ${isRTL ? "rtl" : "ltr"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <LanguageToggle language={language} onToggle={toggleLanguage} />
      <BusinessDirectoryModal open={directoryOpen} onOpenChange={setDirectoryOpen} language={language} />

      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden px-4 pt-24 pb-20 md:pt-28 md:pb-28">
        {/* Ambient layers */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="am-aurora am-aurora-1 left-[-10%] top-[-10%] h-[420px] w-[420px] bg-primary/25" />
          <div className="am-aurora am-aurora-2 right-[-12%] top-[10%] h-[480px] w-[480px] bg-amber-400/15" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(238,194,90,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(238,194,90,0.5) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent)",
              WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent)",
            }}
          />
          <StarMotif className="am-spin-slow absolute left-1/2 top-[44%] h-[680px] w-[680px] -translate-x-1/2 -translate-y-1/2 text-primary/[0.07]" />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Left: copy */}
          <div className={`text-center lg:text-${isRTL ? "right" : "left"}`}>
            <div
              className={`mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 ${
                isRTL ? "flex-row-reverse" : ""
              }`}
            >
              <StarMark className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {isRTL ? "تجارة قائمة على الثقة" : "Trust-based commerce, reimagined"}
              </span>
            </div>

            <div className="mb-6 flex justify-center lg:justify-start">
              <img src="/images/logo-20amanaah.png" alt="Amanah Logo" className="h-20 w-auto drop-shadow-[0_0_24px_rgba(238,194,90,0.35)] md:h-24" />
            </div>

            <h1 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground md:text-6xl lg:text-7xl">
              {isRTL ? (
                t.heroTitle
              ) : (
                <>
                  Amanah is not <span className="am-gold-text">just an app</span>
                </>
              )}
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl lg:mx-0">
              {t.heroSubtitle}
            </p>

            {/* Primary CTAs */}
            <div className={`mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap ${isRTL ? "sm:justify-center lg:justify-end" : "sm:justify-center lg:justify-start"}`}>
              <Button
                size="lg"
                className="am-sheen h-14 gap-3 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground shadow-[0_8px_30px_rgba(238,194,90,0.25)] hover:bg-primary/90"
                asChild
              >
                <a href={IOS_APP_URL} target="_blank" rel="noopener noreferrer">
                  <IconApple className="h-5 w-5" />
                  <span className="flex flex-col items-start leading-none">
                    <span className="text-[10px] font-medium opacity-70">{isRTL ? "متوفر على" : "Download on the"}</span>
                    <span>App Store</span>
                  </span>
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 gap-3 rounded-xl border-border bg-transparent px-6 text-base font-semibold hover:border-primary/50 hover:bg-primary/5"
                asChild
              >
                <a href={ANDROID_APP_URL} target="_blank" rel="noopener noreferrer">
                  <IconPlay className="h-5 w-5" />
                  <span className="flex flex-col items-start leading-none">
                    <span className="text-[10px] font-medium opacity-70">{isRTL ? "احصل عليه من" : "Get it on"}</span>
                    <span>Google Play</span>
                  </span>
                </a>
              </Button>
              <Button
                type="button"
                size="lg"
                variant="secondary"
                className="h-14 gap-2 rounded-xl px-6 text-base font-semibold"
                onClick={() => setDirectoryOpen(true)}
              >
                <LayoutGrid className="h-5 w-5" />
                {isRTL ? "تصفّح الدليل" : "Browse Directory"}
              </Button>
            </div>

            {/* Secondary links */}
            <div className={`mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm ${isRTL ? "justify-center lg:justify-end" : "justify-center lg:justify-start"}`}>
              <Link href="/auth/login" className="font-medium text-foreground/80 transition-colors hover:text-primary">
                {isRTL ? "تسجيل الدخول" : "Login"}
              </Link>
              <span className="text-border">•</span>
              <Link href="/member/register" className="font-medium text-foreground/80 transition-colors hover:text-primary">
                {isRTL ? "إنشاء حساب" : "Register"}
              </Link>
              <span className="text-border">•</span>
              <Link href="/book-onboarding" className="inline-flex items-center gap-1 font-medium text-foreground/80 transition-colors hover:text-primary">
                <Calendar className="h-4 w-4" />
                {t.scheduleOnboarding}
              </Link>
              <span className="text-border">•</span>
              <Link href="/amanah-us" className="inline-flex items-center gap-1 font-medium text-primary transition-colors hover:text-primary/80">
                {isRTL ? "زيارة AmanahUS.org" : "Visit AmanahUS.org"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Right: animated phone */}
          <div className="am-perspective relative flex justify-center">
            {/* glow */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[90px]" />

            <div className="am-phone-tilt am-float relative">
              {/* phone frame */}
              <div className="relative w-[248px] rounded-[2.6rem] border border-white/10 bg-[#0a0a0a] p-2.5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] md:w-[288px]">
                <div className="relative aspect-[944/2046] overflow-hidden rounded-[2rem] bg-black ring-1 ring-white/5">
                  <video
                    className="h-full w-full object-cover"
                    poster="/clips/poster-clip3.jpg"
                    autoPlay={!reduceMotion}
                    loop
                    muted
                    playsInline
                    controls={reduceMotion}
                    preload="metadata"
                    aria-label={isRTL ? "جولة داخل تطبيق أمانة" : "Amanah app walkthrough"}
                  >
                    <source src="/clips/clip3.mp4" type="video/mp4" />
                  </video>
                  {/* notch */}
                  <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />
                </div>
              </div>

              {/* floating chips */}
              <div className="am-chip absolute -left-10 top-12 hidden sm:block" style={{ animationDelay: "0.4s" }}>
                <div className="am-glass flex items-center gap-2 rounded-2xl px-3.5 py-2.5 shadow-xl">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
                    <Mosque className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-left leading-tight">
                    <p className="text-[10px] text-muted-foreground">{isRTL ? "الفجر" : "Fajr"}</p>
                    <p className="text-xs font-bold text-foreground">5:12 AM</p>
                  </div>
                </div>
              </div>

              <div className="am-chip absolute -right-8 top-1/2 hidden sm:block" style={{ animationDelay: "1.1s" }}>
                <div className="am-glass flex items-center gap-2 rounded-2xl px-3.5 py-2.5 shadow-xl">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15">
                    <Shield className="h-4 w-4 text-emerald-400" />
                  </div>
                  <p className="text-xs font-bold text-foreground">{isRTL ? "موثّق" : "Verified"}</p>
                </div>
              </div>

              <div className="am-chip absolute -bottom-6 left-6 hidden sm:block" style={{ animationDelay: "1.8s" }}>
                <div className="am-glass flex items-center gap-2 rounded-2xl px-3.5 py-2.5 shadow-xl">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
                    <Heart className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-left leading-tight">
                    <p className="text-[10px] text-muted-foreground">{isRTL ? "يُعاد للمجتمع" : "Given back"}</p>
                    <p className="text-xs font-bold text-foreground">30%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== TRUST STRIP ===================== */}
      <section className="border-y border-border/60 bg-secondary/20 px-4 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-4 text-center">
          {[
            { icon: <Shield className="h-5 w-5 text-primary" />, label: isRTL ? "خصوصية كاملة" : "100% Private" },
            { icon: <StarMark className="h-5 w-5 text-primary" />, label: isRTL ? "أعمال موثّقة" : "Verified Businesses" },
            { icon: <Heart className="h-5 w-5 text-primary" />, label: isRTL ? "30% تُعاد للمجتمع" : "30% Given Back" },
            { icon: <Mosque className="h-5 w-5 text-primary" />, label: isRTL ? "مدعوم من المساجد" : "Mosque-Powered" },
          ].map((item, i) => (
            <div key={i} className="inline-flex items-center gap-2">
              {item.icon}
              <span className="text-sm font-semibold text-foreground/85">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== MISSION ===================== */}
      <section className="relative px-4 py-24">
        <div className="mx-auto max-w-4xl text-center" data-reveal>
          <Eyebrow isRTL={isRTL} text={t.missionTitle} />
          <p className="mt-8 whitespace-pre-line text-start text-lg leading-relaxed text-muted-foreground md:text-xl">{t.missionText}</p>
          <div className="mx-auto mt-8 flex max-w-md items-center justify-center gap-4">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/40" />
            <StarMark className="h-5 w-5 text-primary" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/40" />
          </div>
          <p className="mt-6 text-lg font-bold text-primary md:text-xl">{t.missionCTA}</p>
        </div>
      </section>

      {/* ===================== ABOUT / WHY ===================== */}
      <section className="relative overflow-hidden px-4 py-24">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <StarMotif className="am-spin-slow absolute -left-20 top-1/2 h-[520px] w-[520px] -translate-y-1/2 text-primary/[0.05]" />
        </div>
        <div className="mx-auto max-w-4xl" data-reveal>
          <div className="text-center">
            <Eyebrow isRTL={isRTL} text={isRTL ? "من نحن" : "About us"} />
            <h2 className="mt-4 text-3xl font-bold text-foreground md:text-5xl">
              {isRTL ? "نبنيها معًا" : "We're building this together"}
            </h2>
          </div>
          <div className="mx-auto mt-8 max-w-3xl space-y-5 text-lg leading-relaxed text-muted-foreground">
            <p>
              {isRTL
                ? "أمانة ليست مجرد تطبيق — إنها شيء نبنيه لأنفسنا ولأبنائنا ولمجتمعنا. سئمنا انتظار غيرنا ليصلح الأمور، فقررنا أن نبني شيئًا بأيدينا ولأجلنا، والصدق والثقة والقيم الإسلامية في صميمه."
                : "Amanah is not just an app — it's something we're building for ourselves, for our kids, and for our community. We got tired of waiting for someone else to fix things, so we decided to build something by us, for us, with honesty, trust, and Islamic values at the center."}
            </p>
            <p>
              {isRTL
                ? "نحن لسنا شركة كبرى. نحن مجموعة من المسلمين نحاول إحياء شيء جميل: تجارة جديرة بالثقة، ومجتمع قوي، ودعم لشبابنا. وُلدت أمانة من قناعة بسيطة: حين يتعامل المسلمون بصدق ونزاهة، يكسب الجميع."
                : "We're not a corporation. We're a group of Muslims trying to revive something beautiful — trustworthy business, strong community, and support for our youth. Amanah was built on a simple belief: when Muslims do business with honesty and integrity, everyone wins."}
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
            {[
              { en: "Stronger support for Muslim businesses", ar: "دعم أقوى للأعمال المسلمة" },
              { en: "Steady income for our masajid", ar: "دخل ثابت لمساجدنا" },
              { en: "Scholarships & interest-free help for youth", ar: "منح وقروض حسنة لشبابنا" },
              { en: "A way to find and trust each other", ar: "وسيلة لنجد بعضنا ونثق ببعضنا" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-white/5 bg-card/40 px-4 py-3">
                <StarMark className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm text-foreground/85">{isRTL ? item.ar : item.en}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== FEATURES ===================== */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center" data-reveal>
            <Eyebrow isRTL={isRTL} text={isRTL ? "المزايا" : "Features"} />
            <h2 className="mt-4 text-3xl font-bold text-foreground md:text-5xl">{t.featuresTitle}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">{t.featuresSubtitle}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Mosque, title: t.connectMosque, desc: t.connectMosqueDesc },
              { icon: Store, title: t.businessDirectory, desc: t.businessDirectoryDesc, action: true },
              { icon: MapPin, title: t.mosqueNearMe, desc: t.mosqueNearMeDesc },
              { icon: Calendar, title: t.events, desc: t.eventsDesc },
              { icon: Heart, title: t.supportMasjid, desc: t.supportMasjidDesc },
              { icon: MessageCircle, title: t.directComm, desc: t.directCommDesc },
            ].map((f, i) => {
              const Icon = f.icon
              const interactive = f.action
              return (
                <Card
                  key={i}
                  data-reveal
                  style={{ transitionDelay: `${(i % 3) * 90}ms` }}
                  role={interactive ? "button" : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  onClick={interactive ? () => setDirectoryOpen(true) : undefined}
                  onKeyDown={
                    interactive
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            setDirectoryOpen(true)
                          }
                        }
                      : undefined
                  }
                  className={`am-reveal group relative overflow-hidden rounded-2xl border-white/5 bg-card/60 p-8 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_18px_40px_-20px_rgba(238,194,90,0.4)] ${
                    interactive ? "cursor-pointer" : ""
                  }`}
                >
                  <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-card-foreground">{f.title}</h3>
                  <p className="leading-relaxed text-muted-foreground">{f.desc}</p>
                  {interactive && (
                    <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                      {t.directory} <ArrowRight className="h-4 w-4" />
                    </p>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===================== TRUST + GIVING ===================== */}
      <section className="relative overflow-hidden px-4 py-24">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-primary/[0.04] to-transparent" />
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center text-center" data-reveal>
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-amber-600 shadow-[0_10px_40px_-10px_rgba(238,194,90,0.6)]">
              <Shield className="h-10 w-10 text-primary-foreground" />
            </div>
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">{t.trustTitle}</h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">{t.trustDesc}</p>
            <p className="mt-6 text-lg font-semibold text-foreground">{t.noSellInfo}</p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3" data-reveal>
            {[
              { value: 30, label: t.profitDonated },
              { value: 10, label: t.toMosque },
              { value: 20, label: t.toEducation },
            ].map((stat, i) => (
              <div
                key={i}
                className="am-gold-border rounded-2xl p-8 text-center"
              >
                <div className="text-6xl font-extrabold">
                  <CountUp value={stat.value} suffix="%" className="am-gold-text" />
                </div>
                <p className="mt-3 text-base text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== COMMUNITY IMPACT TRACKER ===================== */}
      <section className="border-y border-primary/20 bg-gradient-to-br from-primary/10 to-primary/[0.03] px-4 py-20">
        <div className="mx-auto max-w-4xl text-center" data-reveal>
          <div className="mb-4 inline-flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-primary" />
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              {isRTL ? "متتبع التأثير المجتمعي" : "Community Impact Tracker"}
            </h2>
          </div>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
            {isRTL ? "إجمالي الأموال المعادة للمجتمع المسلم" : "Total funds returned to the Muslim community"}
          </p>

          <div className="am-gold-border mx-auto inline-block rounded-3xl px-12 py-10">
            <div className="am-gold-text text-5xl font-extrabold md:text-6xl">
              {loadingFunding ? (
                <span className="text-2xl text-muted-foreground">{isRTL ? "جارٍ التحميل..." : "Loading..."}</span>
              ) : (
                `$${communityFunding.totalGivenBack.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </div>
            <p className="mt-3 font-semibold text-foreground/80">
              {isRTL ? "إجمالي الأموال المعادة للمجتمع المسلم" : "Given Back to Community"}
            </p>
          </div>

          <p className="mt-8 text-sm italic text-muted-foreground">
            {isRTL
              ? "يتم التحديث في الوقت الفعلي بناءً على الاشتراكات النشطة والمساهمات"
              : "Updated in real-time based on active subscriptions and contributions"}
          </p>
        </div>
      </section>

      {/* ===================== PHONE SHOWCASE ===================== */}
      <section className="relative overflow-hidden px-4 py-24">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="am-aurora am-aurora-1 left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 bg-primary/15" />
        </div>
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center" data-reveal>
            <Eyebrow isRTL={isRTL} text={isRTL ? "التطبيق" : "The App"} />
            <h2 className="mt-4 text-3xl font-bold text-foreground md:text-5xl">{t.screenshotsTitle}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">{t.screenshotsSubtitle}</p>
          </div>

          <div className="am-perspective flex flex-wrap items-center justify-center gap-8 md:gap-10">
            {[
              { video: "/clips/clip1.mp4", poster: "/clips/poster-clip1.jpg", src: "", en: "Business directory", ar: "دليل الأعمال", delay: "0s", lift: "md:-translate-y-6" },
              { video: "", poster: "", src: "/images/app-marketplace.jpg", en: "Amanah Market", ar: "سوق أمانة", delay: "0.6s", lift: "md:translate-y-4" },
              { video: "", poster: "", src: "/images/app-nonprofit.jpg", en: "Nonprofit profile", ar: "ملف منظمة غير ربحية", delay: "1.2s", lift: "md:-translate-y-2" },
            ].map((p, i) => (
              <div key={i} className={p.lift}>
                <div data-reveal style={{ transitionDelay: `${i * 120}ms` }}>
                  <div className="am-float-slow" style={{ animationDelay: p.delay }}>
                    <div className="relative w-[210px] rounded-[2.2rem] border border-white/10 bg-[#0a0a0a] p-2 shadow-[0_30px_70px_-25px_rgba(0,0,0,0.85)] md:w-[240px]">
                      <div className="relative aspect-[944/2046] overflow-hidden rounded-[1.7rem] bg-black ring-1 ring-white/5">
                        {p.video ? (
                          <video
                            className="h-full w-full object-cover"
                            poster={p.poster}
                            autoPlay={!reduceMotion}
                            loop
                            muted
                            playsInline
                            controls={reduceMotion}
                            preload="none"
                            aria-label={isRTL ? p.ar : p.en}
                          >
                            <source src={p.video} type="video/mp4" />
                          </video>
                        ) : (
                          <img src={p.src} alt={isRTL ? p.ar : p.en} className="h-full w-full object-cover" />
                        )}
                        <div className="absolute left-1/2 top-2 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-black" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== EVERYDAY HEROES ===================== */}
      <section className="border-y border-primary/20 bg-gradient-to-br from-primary/10 to-primary/[0.03] px-4 py-24">
        <div className="mx-auto max-w-5xl text-center" data-reveal>
          <Eyebrow isRTL={isRTL} text={isRTL ? "أبطالنا اليوميون" : "Everyday heroes"} />
          <h2 className="mt-4 text-3xl font-bold text-foreground md:text-4xl">
            {isRTL ? "أمانة ليست للأعمال الكبيرة فقط" : "Amanah isn't just for big businesses"}
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            {isRTL
              ? "إنها لكل مسلم يسعى لكسب رزق حلال — الأم التي تطبخ من بيتها، والأخت التي تبيع الحجاب والملابس المحتشمة، والأخ الذي يصلح الأشياء في عطلة نهاية الأسبوع، والشاب الذي يبدأ مشروعًا حلالًا صغيرًا."
              : "It's for every Muslim trying to earn an honest living — the single mother cooking from home, the sister selling hijabs and modest clothing, the brother fixing things on weekends, and the youth starting a small halal venture."}
          </p>
          <div className="mx-auto mt-8 flex flex-wrap justify-center gap-3">
            {[
              { en: "Home kitchens", ar: "مطابخ منزلية" },
              { en: "Modest clothing", ar: "ملابس محتشمة" },
              { en: "Weekend services", ar: "خدمات نهاية الأسبوع" },
              { en: "Youth ventures", ar: "مشاريع الشباب" },
              { en: "Online stores", ar: "متاجر إلكترونية" },
            ].map((chip, i) => (
              <span key={i} className="rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-foreground/85">
                {isRTL ? chip.ar : chip.en}
              </span>
            ))}
          </div>
          <p className="mt-10 text-xl font-bold md:text-2xl">
            <span className="am-gold-text">
              {isRTL ? "كل عملية بيع تساعد عائلة. وكل عائلة تقوّي المجتمع." : "Every sale helps a family. Every family strengthens the community."}
            </span>
          </p>
        </div>
      </section>

      {/* ===================== HADITH ===================== */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-4xl" data-reveal>
          <div className="am-gold-border relative overflow-hidden rounded-3xl p-10 text-center md:p-14">
            <StarMotif className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 text-primary/[0.06]" />
            <div className="mx-auto mb-6 font-serif text-6xl leading-none text-primary/40">&ldquo;</div>
            <h2 className="mb-6 text-2xl font-bold text-foreground md:text-3xl">{t.hadithTitle}</h2>
            <blockquote className="mb-6">
              <p className="mb-4 text-xl font-semibold italic leading-relaxed text-foreground md:text-2xl">{t.hadithText}</p>
              <cite className="text-lg text-primary">{t.hadithSource}</cite>
            </blockquote>
            <p className="mx-auto max-w-2xl leading-relaxed text-muted-foreground">{t.hadithExplanation}</p>
          </div>
        </div>
      </section>

      {/* ===================== CTA ===================== */}
      <section className="relative overflow-hidden px-4 py-24">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary to-amber-600" />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-20">
          <StarMotif className="am-spin-slow absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 text-black" />
        </div>
        <div className="mx-auto max-w-4xl text-center" data-reveal>
          <h2 className="text-balance text-3xl font-extrabold text-primary-foreground md:text-5xl">{t.ctaTitle}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-primary-foreground/90">{t.ctaSubtitle}</p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" variant="secondary" className="am-sheen h-14 gap-3 rounded-xl px-8 text-base font-semibold" asChild>
              <a href={IOS_APP_URL} target="_blank" rel="noopener noreferrer">
                <IconApple className="h-5 w-5" />
                {t.downloadIOS}
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 gap-3 rounded-xl border-primary-foreground bg-transparent px-8 text-base font-semibold text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              asChild
            >
              <a href={ANDROID_APP_URL} target="_blank" rel="noopener noreferrer">
                <IconPlay className="h-5 w-5" />
                {t.downloadAndroid}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* ===================== AMANAH US ===================== */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl" data-reveal>
          <Card className="am-gold-border overflow-hidden rounded-3xl">
            <div className="p-8 md:p-12">
              <div className="flex flex-col items-center gap-6 md:flex-row">
                <div className="flex-shrink-0">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-amber-600 shadow-lg">
                    <Heart className="h-9 w-9 text-primary-foreground" />
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="mb-2 text-2xl font-bold text-foreground">
                    {isRTL ? "تعرف على أمانة نحن" : "Learn About Amanah US"}
                  </h3>
                  <p className="mb-4 text-muted-foreground">
                    {isRTL
                      ? "من كل اشتراك، تُعاد 30% للمجتمع — 10% لمسجدك و20% للمنح الدراسية والقروض الحسنة ودعم المدارس الإسلامية. شاهد التأثير الحقيقي لدعمك."
                      : "From every subscription, 30% goes back — 10% to your masjid and 20% to scholarships, interest-free loans, and Islamic schools. See the real impact of your support."}
                  </p>
                  <Button asChild className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Link href="/amanah-us">
                      {isRTL ? "عرض مقاييس التأثير" : "View Impact Metrics"}
                      <TrendingUp className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* ===================== GET INVOLVED ===================== */}
      <section className="px-4 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center" data-reveal>
            <Eyebrow isRTL={isRTL} text={isRTL ? "شارك معنا" : "Get involved"} />
            <h2 className="mt-4 text-3xl font-bold text-foreground md:text-4xl">
              {isRTL ? "لا تحتاج إلى امتلاك عمل لتساعد" : "You don't need to own a business to help"}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {isRTL ? "لكلٍّ منا دور. إليك كيف يمكنك دعم أمانة." : "Everyone has a role. Here's how you can support Amanah."}
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Heart, en: "Follow & share", ar: "تابِع وشارك", den: "Follow us on social media and share our posts with your circle.", dar: "تابعنا على وسائل التواصل وشارك منشوراتنا مع من حولك." },
              { icon: MessageCircle, en: "Become an advocate", ar: "كن داعمًا", den: "Spread the word in your masjid and encourage businesses to join.", dar: "انشر الكلمة في مسجدك وشجّع الأعمال على الانضمام." },
              { icon: Mosque, en: "List your masjid", ar: "أدرِج مسجدك", den: "Help your masjid join the national directory so people can find and support it.", dar: "ساعد مسجدك على الانضمام إلى الدليل الوطني ليجده الناس ويدعموه." },
              { icon: Store, en: "Support certified businesses", ar: "ادعم الأعمال المعتمدة", den: "Choose Amanah-certified businesses whenever you can.", dar: "اختر الأعمال المعتمدة من أمانة كلما استطعت." },
              { icon: Calendar, en: "Volunteer", ar: "تطوّع", den: "Have time, skills, or passion? We'd love your help.", dar: "لديك وقت أو مهارة أو شغف؟ يسعدنا أن تنضم إلينا." },
              { icon: TrendingUp, en: "Grow with us", ar: "انمُ معنا", den: "Own a business? List it and reach a community that wants to support you.", dar: "تملك عملًا؟ أدرجه وتواصل مع مجتمع يريد دعمك." },
            ].map((c, i) => {
              const Icon = c.icon
              return (
                <Card key={i} data-reveal style={{ transitionDelay: `${(i % 3) * 90}ms` }} className="rounded-2xl border-white/5 bg-card/60 p-7 backdrop-blur">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-card-foreground">{isRTL ? c.ar : c.en}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{isRTL ? c.dar : c.den}</p>
                </Card>
              )
            })}
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90" asChild>
              <Link href="/member/register">{isRTL ? "أدرِج مسجدك أو عملك" : "List your masjid or business"}</Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-xl" asChild>
              <Link href="/book-onboarding">
                <Calendar className="mr-2 h-5 w-5" />
                {t.scheduleOnboarding}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ===================== LIST WITH US ===================== */}
      <section className="px-4 pb-24 pt-8">
        <div className="mx-auto max-w-3xl text-center" data-reveal>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Plus className="h-7 w-7 text-primary" />
          </div>
          <h2 className="mb-4 text-2xl font-bold text-foreground md:text-3xl">{t.addMosqueTitle}</h2>
          <p className="mb-2 leading-relaxed text-muted-foreground">{t.addMosqueSubtitle}</p>
          <p className="mx-auto mb-6 max-w-xl leading-relaxed text-muted-foreground">{t.scheduleOnboardingDesc}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
            <Button size="lg" className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90" asChild>
              <Link href="/member/register">{isRTL ? "إنشاء حساب" : "Create Account"}</Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-xl" asChild>
              <Link href="/book-onboarding">
                <Calendar className="mr-2 h-5 w-5" />
                {t.scheduleOnboarding}
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {isRTL ? "لديك حساب بالفعل؟ " : "Already have an account? "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              {isRTL ? "تسجيل الدخول" : "Sign in"}
            </Link>
          </p>
        </div>
      </section>

      {/* ===================== FAQ ===================== */}
      <section className="px-4 py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center" data-reveal>
            <Eyebrow isRTL={isRTL} text={isRTL ? "أسئلة شائعة" : "FAQ"} />
            <h2 className="mt-4 text-3xl font-bold text-foreground md:text-4xl">
              {isRTL ? "أسئلة يطرحها الناس" : "Questions people ask"}
            </h2>
          </div>
          <div className="space-y-3" data-reveal>
            {[
              {
                q_en: "What is Amanah?",
                q_ar: "ما هي أمانة؟",
                a_en: "A community-driven movement to revive honesty, trust, and Islamic values in business. It's something we're building for ourselves, our kids, and our community — by us, for us.",
                a_ar: "حركة مجتمعية لإحياء الصدق والثقة والقيم الإسلامية في التجارة. شيء نبنيه لأنفسنا ولأبنائنا ولمجتمعنا — بأيدينا ولأجلنا.",
              },
              {
                q_en: "What's the difference between Amanah US Inc. and Amanah Biz?",
                q_ar: "ما الفرق بين مؤسسة أمانة الأمريكية وأمانة بيز؟",
                a_en: "Amanah US Inc. (EIN 41-3030153) is the nonprofit behind the mission — it owns the Amanah logo and certification seal and runs the community programs. Amanah Biz is the platform and app, owned and operated by NajBee LLC, which handles the technology. This keeps the nonprofit focused on the community and the tech professionally managed.",
                a_ar: "مؤسسة أمانة الأمريكية (الرقم الضريبي 41-3030153) هي المنظمة غير الربحية صاحبة الرسالة — تملك شعار أمانة وختم الاعتماد وتدير البرامج المجتمعية. أما أمانة بيز فهي المنصّة والتطبيق، تملكها وتشغّلها شركة NajBee LLC المسؤولة عن التقنية. هذا يبقي المنظمة مركّزة على المجتمع والتقنية مُدارة باحتراف.",
              },
              {
                q_en: "What does Amanah Certified mean?",
                q_ar: "ماذا يعني اعتماد أمانة؟",
                a_en: "It means the business follows Islamic principles of honesty, fairness, transparency, and integrity. It's a badge of trust — a promise that Muslims don't cut corners or cheat.",
                a_ar: "يعني أن العمل يلتزم بمبادئ الإسلام في الصدق والإنصاف والشفافية والنزاهة. إنه شارة ثقة — وعدٌ بأن المسلمين لا يغشّون ولا يقصّرون.",
              },
              {
                q_en: "How does the giving model work?",
                q_ar: "كيف يعمل نموذج العطاء؟",
                a_en: "From every business subscription, 10% goes to the masjid of the business's choice and 20% goes to scholarships, interest-free loans, and Islamic school support. Every business strengthens the ummah.",
                a_ar: "من كل اشتراك عمل، تذهب 10% إلى المسجد الذي يختاره صاحب العمل و20% إلى المنح الدراسية والقروض الحسنة ودعم المدارس الإسلامية. كل عمل يقوّي الأمة.",
              },
              {
                q_en: "Who can join?",
                q_ar: "من يمكنه الانضمام؟",
                a_en: "Any Muslim business — big or small. Restaurants, online stores, service providers, home-based businesses, single mothers cooking from home, youth entrepreneurs. If you're earning halal and working honestly, you belong here.",
                a_ar: "أي عمل مسلم — كبيرًا كان أو صغيرًا. مطاعم، متاجر إلكترونية، مقدّمو خدمات، أعمال منزلية، أمهات يطبخن من البيت، شباب رياديون. إن كنت تكسب حلالًا وتعمل بصدق، فهذا مكانك.",
              },
            ].map((f, i) => (
              <details key={i} className="am-gold-border group rounded-2xl px-6 py-4">
                <summary className="flex list-none items-center justify-between gap-4 text-lg font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                  <span>{isRTL ? f.q_ar : f.q_en}</span>
                  <Plus className="h-5 w-5 shrink-0 text-primary transition-transform duration-300 group-open:rotate-45" />
                </summary>
                <p className="mt-3 leading-relaxed text-muted-foreground">{isRTL ? f.a_ar : f.a_en}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="border-t border-border bg-secondary/20 px-4 py-14">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center gap-6 text-center">
            <img src="/images/logo-20amanaah.png" alt="Amanah" className="h-14 w-auto opacity-90" />
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
              <a href={IOS_APP_URL} target="_blank" rel="noopener noreferrer" className="text-foreground/80 hover:text-primary">App Store</a>
              <a href={ANDROID_APP_URL} target="_blank" rel="noopener noreferrer" className="text-foreground/80 hover:text-primary">Google Play</a>
              <Link href="/amanah-us" className="text-foreground/80 hover:text-primary">Amanah US</Link>
              <Link href="/book-onboarding" className="text-foreground/80 hover:text-primary">{t.scheduleOnboarding}</Link>
            </div>
            <div className="mx-auto max-w-3xl space-y-3 text-xs leading-relaxed text-muted-foreground">
              <p>
                {isRTL
                  ? "شعار أمانة وختم اعتماد أمانة علامتان تجاريتان لمؤسسة أمانة الأمريكية (الرقم الضريبي 41-3030153)، وهي منظمة غير ربحية مسجَّلة في الولايات المتحدة. الاستخدام غير المصرّح به ممنوع."
                  : "The Amanah Logo and Amanah Certification Seal are trademarks of Amanah US Inc. (EIN 41-3030153), a registered nonprofit in the United States. Unauthorized use is prohibited."}
              </p>
              <p>
                {isRTL
                  ? "منصّة أمانة بيز وتطبيقها مملوكان ومُشغَّلان من NajBee LLC، المسؤولة عن البنية التقنية وتطوير المنصّة وأمنها وصيانتها."
                  : "The Amanah Biz platform and app are owned and operated by NajBee LLC, which manages the IT infrastructure, platform development, security, and maintenance."}
              </p>
              <p>
                {isRTL ? "للاستفسارات: " : "Contact: "}
                <a href="mailto:info@amanahus.org" className="text-primary hover:underline">info@amanahus.org</a>
                {" · "}
                <a href="mailto:info@amanahbiz.com" className="text-primary hover:underline">info@amanahbiz.com</a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Eyebrow({ text, isRTL }: { text: string; isRTL: boolean }) {
  return (
    <div className={`inline-flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
      <span className="h-px w-8 bg-primary/50" />
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{text}</span>
      <span className="h-px w-8 bg-primary/50" />
    </div>
  )
}
