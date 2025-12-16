import type {
  Member,
  PaymentAlert,
  AffiliateEarning,
  FinancialRecord,
  EmailTemplate,
  EmailLog,
  AdminSettings,
  ManualDonation,
} from "./types"

export const mockMembers: Member[] = [
  {
    id: "1",
    email: "admin@epma.org",
    name: "Imam Ahmad Hassan",
    phone: "+1 555-123-4567",
    subscriptions: [
      {
        id: "sub-1",
        type: "mosque",
        name: "EPMA Mosque",
        mosqueCode: 1,
        status: "active",
        price: 100,
        startDate: "2024-01-01",
        paymentStartDate: "2024-01-01",
        nextBillingDate: "2025-01-01",
        addedToApp: true,
        addedToAppDate: "2024-01-02",
        appStatus: "active",
        address: "123 Islamic Way, Easton, PA 18042",
        email: "info@epma.org",
        phone: "+1 555-123-4567",
        website: "https://www.epma.org",
        socialMedia: {
          facebook: "https://facebook.com/epma",
          instagram: "https://instagram.com/epma_mosque",
          twitter: "https://twitter.com/epma",
        },
        logo: "/images/logo-20amanaah.png",
        photos: ["/images/mosque-20home.png", "/mosque-prayer-hall.png", "/mosque-exterior-view.jpg"],
        donateLink: "https://epma.org/donate",
        prayerTimesLink: "https://epma.org/prayer-times",
        sundaySchool: "Every Sunday 10am-1pm - Quran, Arabic, and Islamic Studies",
        services: "Jummah Prayer, Daily Prayers, Nikah Services, Funeral Services, Counseling",
        committeeMembers:
          "Imam Ahmad Hassan (Lead Imam), Dr. Ali Khan (President), Fatima Ahmed (Secretary), Omar Hassan (Treasurer)",
        description: "Faith, learning, and service in Easton-Phillipsburg. Serving the Muslim community since 1995.",
        contactName: "Imam Ahmad Hassan",
        thirdPartyLogins: [
          { platform: "Amanah App", username: "epma_admin", password: "••••••••" },
          { platform: "Stripe", username: "epma_stripe", password: "••••••••" },
        ],
        documents: [
          { id: "doc-1", name: "Tax Exempt Certificate", url: "#", uploadedAt: "2024-01-01", type: "pdf" },
          { id: "doc-2", name: "Registration Documents", url: "#", uploadedAt: "2024-01-01", type: "pdf" },
          { id: "doc-3", name: "Insurance Certificate", url: "#", uploadedAt: "2024-02-15", type: "pdf" },
        ],
      },
    ],
    createdAt: "2024-01-01",
  },
  {
    id: "2",
    email: "halal@restaurant.com",
    name: "Halal Delights Restaurant",
    phone: "+1 555-987-6543",
    subscriptions: [
      {
        id: "sub-2",
        type: "business",
        name: "Halal Delights",
        title: "Halal Delights Restaurant",
        affiliatedMosqueCode: 1,
        status: "active",
        price: 10,
        startDate: "2024-06-01",
        paymentStartDate: "2024-06-01",
        nextBillingDate: "2025-01-01",
        addedToApp: false,
        categories: ["Restaurant", "Food & Dining"],
        subCategories: ["Mediterranean", "Middle Eastern", "Halal Certified"],
        address: "123 Main Street",
        city: "New York",
        state: "NY",
        zip: "10001",
        country: "USA",
        phone: "+1 555-987-6543",
        fax: "+1 555-987-6544",
        email: "info@halaldelights.com",
        website: "https://www.halaldelights.com",
        socialMedia: {
          facebook: "https://facebook.com/halaldelights",
          instagram: "https://instagram.com/halaldelights_nyc",
        },
        description:
          "Authentic halal cuisine from around the world. Family-owned since 2010, serving the finest Mediterranean and Middle Eastern dishes.",
        photos: [
          "/halal-restaurant-interior-with-arabic-decor.jpg",
          "/delicious-halal-food-platter.jpg",
          "/halal-restaurant-kitchen.jpg",
        ],
        documents: [
          { id: "doc-3", name: "Halal Certificate", url: "#", uploadedAt: "2024-06-01", type: "pdf" },
          { id: "doc-4", name: "Business License", url: "#", uploadedAt: "2024-06-01", type: "pdf" },
          { id: "doc-5", name: "Health Permit", url: "#", uploadedAt: "2024-06-15", type: "pdf" },
        ],
      },
      {
        id: "sub-3",
        type: "coupon",
        name: "10% Off First Order",
        title: "10% Off First Order",
        affiliatedMosqueCode: 1,
        status: "active",
        price: 10,
        startDate: "2024-06-01",
        paymentStartDate: "2024-06-01",
        nextBillingDate: "2025-01-01",
        addedToApp: true,
        addedToAppDate: "2024-06-02",
        appStatus: "active",
        phone: "+1 555-987-6543",
        email: "coupons@halaldelights.com",
        website: "https://www.halaldelights.com/coupons",
        merchant: "Halal Delights Restaurant",
        redeemLimit: 500,
        userRedeemLimit: 1,
        userMonthlyRedeemLimit: 1,
        discountPercentage: "10%",
        couponCode: "FIRST10",
        redeemCode: "RDHD10",
        prefix: "HD",
        nextNo: "001",
        endDate: "2025-06-01",
        description: "Get 10% off your first order over $25. Welcome to the Halal Delights family!",
        thumbnailDescription: "10% OFF First Order",
        popUpText: "Welcome! Use code FIRST10 for 10% off your first order over $25!",
        photo: "/delicious-halal-food-platter.jpg",
        photos: ["/delicious-halal-food-platter.jpg", "/halal-food-special-offer.jpg"],
        address: "123 Main Street, New York, NY 10001",
      },
      {
        id: "sub-4",
        type: "coupon",
        name: "Free Dessert",
        title: "Free Dessert with Order",
        affiliatedMosqueCode: 1,
        status: "active",
        price: 10,
        startDate: "2024-06-01",
        paymentStartDate: "2024-06-15",
        nextBillingDate: "2025-01-01",
        addedToApp: false,
        appStatus: "active",
        phone: "+1 555-987-6543",
        email: "coupons@halaldelights.com",
        merchant: "Halal Delights Restaurant",
        redeemLimit: 200,
        userRedeemLimit: 2,
        userWeeklyRedeemLimit: 1,
        discountAmount: "Free Baklava",
        couponCode: "FREEDESSERT",
        redeemCode: "RDFD01",
        endDate: "2025-03-01",
        description:
          "Enjoy a free dessert with any order over $50. Choose from our selection of traditional Middle Eastern sweets.",
        thumbnailDescription: "FREE Dessert",
        popUpText: "Order over $50 and get a FREE traditional dessert!",
        photo: "/baklava-dessert-middle-eastern-sweets.jpg",
        photos: ["/baklava-dessert-middle-eastern-sweets.jpg"],
        address: "123 Main Street, New York, NY 10001",
      },
    ],
    createdAt: "2024-06-01",
  },
  {
    id: "3",
    email: "contact@isbr.org",
    name: "Dr. Yusuf Ibrahim",
    phone: "+1 555-456-7890",
    subscriptions: [
      {
        id: "sub-5",
        type: "mosque",
        name: "ISBR Mosque",
        mosqueCode: 2,
        status: "past_due",
        price: 100,
        startDate: "2024-03-01",
        paymentStartDate: "2024-03-01",
        nextBillingDate: "2024-12-01",
        addedToApp: true,
        addedToAppDate: "2024-03-03",
        appStatus: "active",
        address: "456 Faith Lane, Basking Ridge, NJ 07920",
        email: "info@isbr.org",
        phone: "+1 555-456-7890",
        website: "https://www.isbr.org",
        socialMedia: {
          facebook: "https://facebook.com/isbr",
        },
        photos: ["/islamic-society-mosque.jpg", "/mosque-community-center.jpg"],
        sundaySchool: "Sundays 9:30am-12:30pm",
        services: "Jummah, Daily Prayers, Youth Programs",
        description:
          "Empowering Muslims in Somerset Hills. A vibrant community center for worship, education, and fellowship.",
        contactName: "Dr. Yusuf Ibrahim",
        documents: [],
        thirdPartyLogins: [],
      },
    ],
    createdAt: "2024-03-01",
  },
  {
    id: "4",
    email: "contact@crescentbooks.com",
    name: "Sarah Ali",
    phone: "+1 555-321-9876",
    subscriptions: [
      {
        id: "sub-6",
        type: "business",
        name: "Crescent Books",
        title: "Crescent Islamic Books & Gifts",
        affiliatedMosqueCode: 2,
        status: "active",
        price: 10,
        startDate: "2024-08-01",
        paymentStartDate: "2024-08-01",
        nextBillingDate: "2025-01-01",
        addedToApp: false,
        categories: ["Retail", "Books & Media"],
        subCategories: ["Islamic Books", "Qurans", "Prayer Items", "Gifts"],
        address: "456 Oak Avenue",
        city: "Chicago",
        state: "IL",
        zip: "60601",
        country: "USA",
        phone: "+1 555-321-9876",
        email: "sales@crescentbooks.com",
        website: "https://www.crescentbooks.com",
        socialMedia: {
          facebook: "https://facebook.com/crescentbooks",
          instagram: "https://instagram.com/crescentbooks",
        },
        description:
          "Your source for Islamic books, Qurans, prayer items, and gifts. Serving the community with quality Islamic products.",
        photos: [
          "/islamic-bookstore-interior-with-quran-books.jpg",
          "/beautiful-quran-with-prayer-beads.jpg",
          "/islamic-gifts-and-prayer-items.jpg",
        ],
        documents: [{ id: "doc-6", name: "Business License", url: "#", uploadedAt: "2024-08-01", type: "pdf" }],
      },
      {
        id: "sub-7",
        type: "coupon",
        name: "20% Off Ramadan Sale",
        title: "Ramadan Special - 20% Off",
        affiliatedMosqueCode: 2,
        status: "active",
        price: 10,
        startDate: "2024-08-01",
        paymentStartDate: "2024-08-15",
        nextBillingDate: "2025-01-01",
        addedToApp: true,
        addedToAppDate: "2024-08-16",
        appStatus: "active",
        phone: "+1 555-321-9876",
        email: "sales@crescentbooks.com",
        merchant: "Crescent Islamic Books & Gifts",
        redeemLimit: 1000,
        userRedeemLimit: 5,
        discountPercentage: "20%",
        couponCode: "RAMADAN20",
        endDate: "2025-04-01",
        description: "Celebrate the blessed month with 20% off all Qurans and prayer mats.",
        thumbnailDescription: "20% OFF Ramadan Sale",
        popUpText: "Ramadan Mubarak! Get 20% off Qurans and prayer mats!",
        photo: "/beautiful-quran-with-prayer-beads.jpg",
        photos: ["/beautiful-quran-with-prayer-beads.jpg"],
        address: "456 Oak Avenue, Chicago, IL 60601",
      },
    ],
    createdAt: "2024-08-01",
  },
  {
    id: "5",
    email: "info@modestfashion.com",
    name: "Aisha Rahman",
    phone: "+1 555-654-3210",
    subscriptions: [
      {
        id: "sub-8",
        type: "business",
        name: "Modest Fashion",
        title: "Modest Fashion Boutique",
        status: "active",
        price: 10,
        startDate: "2024-09-01",
        paymentStartDate: "2024-09-01",
        nextBillingDate: "2025-01-01",
        addedToApp: false,
        categories: ["Clothing", "Fashion"],
        subCategories: ["Modest Wear", "Hijabs", "Abayas", "Women's Fashion"],
        address: "789 Fashion Blvd",
        city: "Los Angeles",
        state: "CA",
        zip: "90001",
        country: "USA",
        phone: "+1 555-654-3210",
        email: "shop@noormodest.com",
        website: "https://www.noormodest.com",
        socialMedia: {
          facebook: "https://facebook.com/noormodest",
          instagram: "https://instagram.com/noormodest",
          twitter: "https://twitter.com/noormodest",
        },
        description:
          "Modern modest fashion for Muslim women. Elegant abayas, hijabs, and everyday wear that combines style with modesty.",
        photos: [
          "/modest-fashion-boutique-hijab-clothing-store.jpg",
          "/hijab-fashion-collection.jpg",
          "/modest-abaya-dress.jpg",
          "/islamic-modest-wear.jpg",
        ],
        documents: [
          { id: "doc-7", name: "Business License", url: "#", uploadedAt: "2024-09-01", type: "pdf" },
          { id: "doc-8", name: "Vendor Agreement", url: "#", uploadedAt: "2024-09-01", type: "pdf" },
        ],
      },
    ],
    createdAt: "2024-09-01",
  },
  {
    id: "7",
    email: "contact@muslimyouthservices.org",
    name: "Muslim Youth Services",
    phone: "+1 555-234-5678",
    subscriptions: [
      {
        id: "sub-nonprofit-1",
        type: "nonprofit",
        name: "Muslim Youth Services",
        status: "active",
        price: 50,
        startDate: "2024-09-01",
        paymentStartDate: "2024-09-01",
        nextBillingDate: "2025-01-01",
        appStatus: "active",
        appLifecycle: "active",
        address: "789 Community St, Philadelphia, PA 19103",
        email: "info@muslimyouthservices.org",
        phone: "+1 555-234-5678",
        website: "https://www.muslimyouthservices.org",
        socialMedia: "Facebook: facebook.com/muslimyouthservices\nInstagram: @muslimyouthservices\nTwitter: @mys_org",
        logo: "/images/logo-20amanaah.png",
        photos: ["/islamic-bookstore-interior-with-quran-books.jpg", "/beautiful-quran-with-prayer-beads.jpg"],
        donateLink: "https://muslimyouthservices.org/donate",
        about:
          "Muslim Youth Services is dedicated to empowering young Muslims through education, mentorship, and community service programs. We provide after-school tutoring, leadership development, and scholarship opportunities to help Muslim youth thrive academically and spiritually. Since 2010, we've served over 5,000 young people across the Greater Philadelphia area.",
      },
    ],
    createdAt: "2024-09-01",
  },
  {
    id: "8",
    email: "admin@islamicreliefcenter.org",
    name: "Islamic Relief Center",
    phone: "+1 555-345-6789",
    subscriptions: [
      {
        id: "sub-nonprofit-2",
        type: "nonprofit",
        name: "Islamic Relief Center",
        status: "active",
        price: 50,
        startDate: "2024-10-15",
        paymentStartDate: "2024-10-15",
        nextBillingDate: "2025-01-15",
        appStatus: "pending_verification",
        appLifecycle: "pending",
        address: "456 Charity Lane, Trenton, NJ 08608",
        email: "contact@islamicreliefcenter.org",
        phone: "+1 555-345-6789",
        website: "https://www.islamicreliefcenter.org",
        socialMedia: "Facebook: facebook.com/islamicreliefcenter\nInstagram: @irc_relief",
        logo: "/images/logo-20amanaah.png",
        photos: ["/halal-restaurant-interior-with-arabic-decor.jpg"],
        donateLink: "https://islamicreliefcenter.org/give",
        about:
          "Islamic Relief Center provides humanitarian aid, disaster relief, and sustainable development programs to communities in need. We focus on food security, healthcare, education, and emergency response both locally and internationally. Our work is guided by Islamic principles of compassion and service to humanity.",
      },
    ],
    createdAt: "2024-10-15",
  },
]

export const mockPaymentAlerts: PaymentAlert[] = [
  {
    id: "alert-1",
    memberId: "3",
    memberName: "Islamic Society of Basking Ridge",
    memberEmail: "admin@isbr.org",
    subscriptionId: "sub-5",
    subscriptionType: "mosque",
    subscriptionName: "ISBR Mosque",
    alertType: "payment_failed",
    createdAt: "2024-12-01",
    resolved: false,
  },
]

export const mockAffiliateEarnings: AffiliateEarning[] = [
  {
    id: "earn-1",
    mosqueCode: 1,
    mosqueName: "EPMA Mosque",
    affiliateType: "business",
    affiliateName: "Halal Delights Restaurant",
    affiliateId: "sub-2",
    monthlyFee: 10,
    kickbackAmount: 1,
    month: "2024-12",
    status: "pending",
  },
  {
    id: "earn-2",
    mosqueCode: 1,
    mosqueName: "EPMA Mosque",
    affiliateType: "coupon",
    affiliateName: "10% Off First Order",
    affiliateId: "sub-3",
    monthlyFee: 10,
    kickbackAmount: 1,
    month: "2024-12",
    status: "pending",
  },
  {
    id: "earn-3",
    mosqueCode: 1,
    mosqueName: "EPMA Mosque",
    affiliateType: "coupon",
    affiliateName: "Free Dessert with Order",
    affiliateId: "sub-4",
    monthlyFee: 10,
    kickbackAmount: 1,
    month: "2024-12",
    status: "pending",
  },
  {
    id: "earn-4",
    mosqueCode: 1,
    mosqueName: "EPMA Mosque",
    affiliateType: "business",
    affiliateName: "Noor Modest Fashion",
    affiliateId: "sub-8",
    monthlyFee: 10,
    kickbackAmount: 1,
    month: "2024-12",
    status: "pending",
  },
  {
    id: "earn-5",
    mosqueCode: 2,
    mosqueName: "ISBR Mosque",
    affiliateType: "business",
    affiliateName: "Crescent Islamic Books & Gifts",
    affiliateId: "sub-6",
    monthlyFee: 10,
    kickbackAmount: 1,
    month: "2024-12",
    status: "pending",
  },
  {
    id: "earn-6",
    mosqueCode: 2,
    mosqueName: "ISBR Mosque",
    affiliateType: "coupon",
    affiliateName: "Ramadan Special - 20% Off",
    affiliateId: "sub-7",
    monthlyFee: 10,
    kickbackAmount: 1,
    month: "2024-12",
    status: "pending",
  },
  // Historical data
  {
    id: "earn-7",
    mosqueCode: 1,
    mosqueName: "EPMA Mosque",
    affiliateType: "business",
    affiliateName: "Halal Delights Restaurant",
    affiliateId: "sub-2",
    monthlyFee: 10,
    kickbackAmount: 1,
    month: "2024-11",
    status: "paid",
    paidDate: "2024-12-01",
  },
  {
    id: "earn-8",
    mosqueCode: 1,
    mosqueName: "EPMA Mosque",
    affiliateType: "coupon",
    affiliateName: "10% Off First Order",
    affiliateId: "sub-3",
    monthlyFee: 10,
    kickbackAmount: 1,
    month: "2024-11",
    status: "paid",
    paidDate: "2024-12-01",
  },
  {
    id: "earn-9",
    mosqueCode: 1,
    mosqueName: "EPMA Mosque",
    affiliateType: "coupon",
    affiliateName: "Free Dessert with Order",
    affiliateId: "sub-4",
    monthlyFee: 10,
    kickbackAmount: 1,
    month: "2024-11",
    status: "paid",
    paidDate: "2024-12-01",
  },
  {
    id: "earn-10",
    mosqueCode: 1,
    mosqueName: "EPMA Mosque",
    affiliateType: "business",
    affiliateName: "Halal Delights Restaurant",
    affiliateId: "sub-2",
    monthlyFee: 10,
    kickbackAmount: 1,
    month: "2024-10",
    status: "paid",
    paidDate: "2024-11-01",
  },
]

export const mockFinancialRecords: FinancialRecord[] = [
  // December 2024
  {
    id: "fin-1",
    date: "2024-12-01",
    type: "mosque",
    subscriptionId: "sub-1",
    subscriptionName: "EPMA Mosque",
    amount: 100,
    mosqueKickback: 0,
    amanahOrgDonation: 15,
    mosqueCodeKickback: 10,
    netRevenue: 75,
  },
  {
    id: "fin-2",
    date: "2024-12-01",
    type: "business",
    subscriptionId: "sub-2",
    subscriptionName: "Halal Delights Restaurant",
    amount: 10,
    mosqueKickback: 1,
    amanahOrgDonation: 1.5,
    mosqueCodeKickback: 1,
    netRevenue: 6.5,
  },
  {
    id: "fin-3",
    date: "2024-12-01",
    type: "coupon",
    subscriptionId: "sub-3",
    subscriptionName: "10% Off First Order",
    amount: 10,
    mosqueKickback: 1,
    amanahOrgDonation: 1.5,
    mosqueCodeKickback: 1,
    netRevenue: 6.5,
  },
  {
    id: "fin-4",
    date: "2024-12-01",
    type: "coupon",
    subscriptionId: "sub-4",
    subscriptionName: "Free Dessert with Order",
    amount: 10,
    mosqueKickback: 1,
    amanahOrgDonation: 1.5,
    mosqueCodeKickback: 1,
    netRevenue: 6.5,
  },
  {
    id: "fin-5",
    date: "2024-12-01",
    type: "business",
    subscriptionId: "sub-6",
    subscriptionName: "Crescent Islamic Books & Gifts",
    amount: 10,
    mosqueKickback: 1,
    amanahOrgDonation: 1.5,
    mosqueCodeKickback: 1,
    netRevenue: 6.5,
  },
  {
    id: "fin-6",
    date: "2024-12-01",
    type: "coupon",
    subscriptionId: "sub-7",
    subscriptionName: "Ramadan Special - 20% Off",
    amount: 10,
    mosqueKickback: 1,
    amanahOrgDonation: 1.5,
    mosqueCodeKickback: 1,
    netRevenue: 6.5,
  },
  {
    id: "fin-7",
    date: "2024-12-01",
    type: "business",
    subscriptionId: "sub-8",
    subscriptionName: "Noor Modest Fashion",
    amount: 10,
    mosqueKickback: 1,
    amanahOrgDonation: 1.5,
    mosqueCodeKickback: 1,
    netRevenue: 6.5,
  },
  // November 2024
  {
    id: "fin-8",
    date: "2024-11-01",
    type: "mosque",
    subscriptionId: "sub-1",
    subscriptionName: "EPMA Mosque",
    amount: 100,
    mosqueKickback: 0,
    amanahOrgDonation: 15,
    mosqueCodeKickback: 10,
    netRevenue: 75,
  },
  {
    id: "fin-9",
    date: "2024-11-01",
    type: "mosque",
    subscriptionId: "sub-5",
    subscriptionName: "ISBR Mosque",
    amount: 100,
    mosqueKickback: 0,
    amanahOrgDonation: 15,
    mosqueCodeKickback: 10,
    netRevenue: 75,
  },
  {
    id: "fin-10",
    date: "2024-11-01",
    type: "business",
    subscriptionId: "sub-2",
    subscriptionName: "Halal Delights Restaurant",
    amount: 10,
    mosqueKickback: 1,
    amanahOrgDonation: 1.5,
    mosqueCodeKickback: 1,
    netRevenue: 6.5,
  },
  // October 2024
  {
    id: "fin-11",
    date: "2024-10-01",
    type: "mosque",
    subscriptionId: "sub-1",
    subscriptionName: "EPMA Mosque",
    amount: 100,
    mosqueKickback: 0,
    amanahOrgDonation: 15,
    mosqueCodeKickback: 10,
    netRevenue: 75,
  },
  {
    id: "fin-12",
    date: "2024-10-01",
    type: "mosque",
    subscriptionId: "sub-5",
    subscriptionName: "ISBR Mosque",
    amount: 100,
    mosqueKickback: 0,
    amanahOrgDonation: 15,
    mosqueCodeKickback: 10,
    netRevenue: 75,
  },
]

export const mockEmailTemplates: EmailTemplate[] = [
  {
    id: "template-1",
    name: "Welcome - New Account",
    subject: "Welcome to Amanah! {{name}}",
    body: "Dear {{name}},\n\nThank you for joining Amanah! We're excited to have you as part of our trusted Muslim community platform.\n\nYour account has been successfully created. You can now start listing your mosque, business, or coupons.\n\nIf you have any questions, please don't hesitate to reach out.\n\nBarak Allahu feekum,\nThe Amanah Team",
    variables: ["name", "email"],
    lastModified: "2024-12-01",
    active: true,
  },
  {
    id: "template-2",
    name: "Subscription Confirmation",
    subject: "Your {{subscriptionType}} subscription is confirmed",
    body: "Assalamu Alaikum {{name}},\n\nYour subscription for {{subscriptionName}} has been confirmed!\n\nDetails:\n- Type: {{subscriptionType}}\n- Price: ${{price}}/month\n- Next billing date: {{nextBilling}}\n\nThank you for being part of the Amanah community.\n\nJazakAllah Khair,\nAmanah Team",
    variables: ["name", "subscriptionType", "subscriptionName", "price", "nextBilling"],
    lastModified: "2024-12-01",
    active: true,
  },
  {
    id: "template-3",
    name: "Subscription Cancelled",
    subject: "Your subscription has been cancelled",
    body: "Dear {{name}},\n\nWe're sorry to see you go. Your subscription for {{subscriptionName}} has been successfully cancelled.\n\nYou will retain access until {{endDate}}. No further charges will be made.\n\nIf this was a mistake or you'd like to rejoin us, please contact support.\n\nWassalam,\nAmanah Team",
    variables: ["name", "subscriptionName", "endDate"],
    lastModified: "2024-12-01",
    active: true,
  },
  {
    id: "template-4",
    name: "Payment Failed",
    subject: "Payment Issue - Action Required",
    body: "Assalamu Alaikum {{name}},\n\nWe were unable to process your payment for {{subscriptionName}}.\n\nAmount due: ${{amount}}\n\nPlease update your payment method to avoid service interruption.\n\nUpdate Payment: {{updateLink}}\n\nJazakAllah Khair,\nAmanah Team",
    variables: ["name", "subscriptionName", "amount", "updateLink"],
    lastModified: "2024-12-01",
    active: true,
  },
  {
    id: "template-5",
    name: "Password Reset Request",
    subject: "Reset your Amanah password",
    body: "Assalamu Alaikum {{name}},\n\nWe received a request to reset your password. Click the link below to create a new password:\n\n{{resetLink}}\n\nThis link will expire in 24 hours.\n\nIf you didn't request this, please ignore this email.\n\nWassalam,\nAmanah Team",
    variables: ["name", "resetLink"],
    lastModified: "2024-12-01",
    active: true,
  },
  {
    id: "template-6",
    name: "Payment Reminder - 3 Days",
    subject: "Upcoming Payment Reminder",
    body: "Assalamu Alaikum {{name}},\n\nThis is a friendly reminder that your subscription payment for {{subscriptionName}} is due in 3 days.\n\nAmount: ${{amount}}\nDue date: {{dueDate}}\n\nYour current payment method will be charged automatically.\n\nJazakAllah Khair,\nAmanah Team",
    variables: ["name", "subscriptionName", "amount", "dueDate"],
    lastModified: "2024-12-01",
    active: true,
  },
  {
    id: "template-7",
    name: "Admin Alert - New Subscription",
    subject: "New {{subscriptionType}} subscription added: {{subscriptionName}}",
    body: "New {{subscriptionType}} subscription has been added to Amanah!\n\nDetails:\n- Name: {{subscriptionName}}\n- Email: {{memberEmail}}\n- Phone: {{memberPhone}}\n- Type: {{subscriptionType}}\n- Price: ${{price}}/month\n- Date: {{createdAt}}\n\nPlease verify and add to the app in the admin portal.\n\nAmanah Admin",
    variables: ["subscriptionType", "subscriptionName", "memberEmail", "memberPhone", "price", "createdAt"],
    lastModified: "2024-12-01",
    active: true,
  },
]

export const mockEmailLogs: EmailLog[] = [
  {
    id: "log-1",
    to: "mosque@epma.org",
    recipientName: "Easton Phillipsburg Muslim Association",
    template: "Welcome - New Account",
    subject: "Welcome to Amanah! Easton Phillipsburg Muslim Association",
    sentAt: "2024-01-01T10:00:00Z",
    status: "sent",
  },
  {
    id: "log-2",
    to: "mosque@epma.org",
    recipientName: "Easton Phillipsburg Muslim Association",
    template: "Subscription Confirmation",
    subject: "Your mosque subscription is confirmed",
    sentAt: "2024-01-01T10:05:00Z",
    status: "sent",
  },
  {
    id: "log-3",
    to: "halal@restaurant.com",
    recipientName: "Halal Delights Restaurant",
    template: "Welcome - New Account",
    subject: "Welcome to Amanah! Halal Delights Restaurant",
    sentAt: "2024-06-01T09:00:00Z",
    status: "sent",
  },
  {
    id: "log-4",
    to: "admin@isbr.org",
    recipientName: "Islamic Society of Basking Ridge",
    template: "Payment Failed",
    subject: "Payment Issue - Action Required",
    sentAt: "2024-12-01T08:00:00Z",
    status: "sent",
  },
  {
    id: "log-5",
    to: "halal@restaurant.com",
    recipientName: "Halal Delights Restaurant",
    template: "Payment Reminder - 3 Days",
    subject: "Upcoming Payment Reminder",
    sentAt: "2024-12-28T10:00:00Z",
    status: "sent",
  },
]

export const getNextMosqueCode = (): number => {
  const allMosques = mockMembers.flatMap((m) => m.subscriptions.filter((s) => s.type === "mosque")) as {
    mosqueCode: number
  }[]

  if (allMosques.length === 0) return 1
  return Math.max(...allMosques.map((m) => m.mosqueCode || 0)) + 1
}

export const getMosqueByCode = (code: number) => {
  for (const member of mockMembers) {
    for (const sub of member.subscriptions) {
      if (sub.type === "mosque" && (sub as any).mosqueCode === code) {
        return { mosque: sub, member }
      }
    }
  }
  return null
}

export const getAllMosquesWithCodes = () => {
  const mosques: { code: number; name: string; status: string }[] = []
  for (const member of mockMembers) {
    for (const sub of member.subscriptions) {
      if (sub.type === "mosque") {
        mosques.push({
          code: (sub as any).mosqueCode,
          name: sub.name,
          status: sub.status,
        })
      }
    }
  }
  return mosques.sort((a, b) => a.code - b.code)
}

export const mockAdminSettings: AdminSettings = {
  notificationEmailAddress: "josh@mobileappcity.com",
  enableNewSubscriptionNotifications: true,
  enablePaymentFailedNotifications: true,
  enableCancellationNotifications: true,
}

export const emailTemplates = mockEmailTemplates
export const emailLogs = mockEmailLogs.map((log) => ({
  ...log,
  recipient: log.to,
  templateName: log.template,
  body: generateEmailBody(log.template, log.recipientName),
}))

function generateEmailBody(template: string, recipientName: string): string {
  const templates: Record<string, string> = {
    "Welcome - New Account": `Dear ${recipientName},

Thank you for joining Amanah! We're excited to have you as part of our trusted Muslim community platform.

Your account has been successfully created. You can now start listing your mosque, business, or coupons.

If you have any questions, please don't hesitate to reach out.

Barak Allahu feekum,
The Amanah Team`,
    "Subscription Confirmation": `Assalamu Alaikum ${recipientName},

Your subscription has been confirmed!

Thank you for being part of the Amanah community.

JazakAllah Khair,
Amanah Team`,
    "Payment Failed": `Assalamu Alaikum ${recipientName},

We were unable to process your payment.

Please update your payment method to avoid service interruption.

JazakAllah Khair,
Amanah Team`,
    "Payment Reminder - 3 Days": `Assalamu Alaikum ${recipientName},

This is a friendly reminder that your subscription payment is due in 3 days.

Your current payment method will be charged automatically.

JazakAllah Khair,
Amanah Team`,
  }

  return templates[template] || `Email content for ${recipientName}`
}

export const membersOverview = [
  {
    id: "member-1",
    name: "Easton Phillipsburg Muslim Association",
    email: "mosque@epma.org",
    phone: "+1 555-123-4567",
    joinedDate: "2024-01-01",
    totalMonthly: 100,
    subscriptions: [
      {
        id: "sub-1",
        type: "mosque",
        title: "EPMA Mosque",
        amount: 100,
      },
    ],
  },
  {
    id: "member-2",
    name: "Halal Delights Restaurant",
    email: "halal@restaurant.com",
    phone: "+1 555-987-6543",
    joinedDate: "2024-06-01",
    totalMonthly: 20,
    subscriptions: [
      {
        id: "sub-2",
        type: "business",
        title: "Halal Delights Restaurant",
        amount: 10,
        affiliatedMosque: "EPMA Mosque (#1)",
      },
      {
        id: "sub-3",
        type: "coupon",
        title: "10% Off First Order",
        amount: 10,
        affiliatedMosque: "EPMA Mosque (#1)",
      },
    ],
  },
  {
    id: "member-3",
    name: "Islamic Bookstore & Gifts",
    email: "info@islamicbooks.com",
    phone: "+1 555-456-7890",
    joinedDate: "2024-07-15",
    totalMonthly: 10,
    subscriptions: [
      {
        id: "sub-4",
        type: "business",
        title: "Islamic Bookstore & Gifts",
        amount: 10,
      },
    ],
  },
  {
    id: "member-4",
    name: "Islamic Society of Basking Ridge",
    email: "admin@isbr.org",
    phone: "+1 555-234-5678",
    joinedDate: "2024-03-15",
    totalMonthly: 100,
    subscriptions: [
      {
        id: "sub-5",
        type: "mosque",
        title: "ISBR Masjid",
        amount: 100,
      },
    ],
  },
]

export const mockManualDonations: ManualDonation[] = [
  {
    id: "donation-1",
    mosqueCode: 1,
    mosqueName: "EPMA Mosque",
    amount: 500,
    date: "2024-12-15",
    notes: "Anonymous donation from community fundraiser",
    addedBy: "Admin",
    addedAt: "2024-12-15T10:00:00Z",
  },
  {
    id: "donation-2",
    mosqueCode: 2,
    mosqueName: "ISBR Mosque",
    amount: 1000,
    date: "2024-12-10",
    notes: "Corporate sponsorship from local business",
    addedBy: "Admin",
    addedAt: "2024-12-10T14:30:00Z",
  },
]

export const getTotalCommunityFunding = () => {
  const activeRecords = mockFinancialRecords.filter((r) => {
    const sub = mockMembers.flatMap((m) => m.subscriptions).find((s) => s.id === r.subscriptionId)
    return !sub || sub.status === "active"
  })

  const amanahOrgTotal = activeRecords.reduce((sum, r) => sum + (r.amanahOrgDonation || 0), 0)
  const mosqueKickbacksTotal = activeRecords.reduce(
    (sum, r) => sum + (r.mosqueKickback || 0) + (r.mosqueCodeKickback || 0),
    0,
  )
  const manualDonationsTotal = mockManualDonations.reduce((sum, d) => sum + d.amount, 0)

  return {
    amanahOrgFund: amanahOrgTotal,
    mosqueKickbacks: mosqueKickbacksTotal,
    manualDonations: manualDonationsTotal,
    totalGivenBack: amanahOrgTotal + mosqueKickbacksTotal + manualDonationsTotal,
  }
}
