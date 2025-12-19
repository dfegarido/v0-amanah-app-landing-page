# Amanah - Muslim Community Platform

[![Built with Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Powered by Supabase](https://img.shields.io/badge/Supabase-Database-green?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Stripe Integration](https://img.shields.io/badge/Stripe-Payments-purple?style=for-the-badge&logo=stripe)](https://stripe.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

## 📖 Overview

**Amanah** is a comprehensive web platform designed to connect Muslim communities with local mosques, trusted businesses, and charitable organizations. Built on the foundation of trust (Amanah means "trust" in Arabic), this platform enables seamless community engagement, business discovery, and subscription management.

### Key Features

✅ **Authentication & Authorization**
- User registration and login with email/password
- Role-based access control (User & Admin)
- Protected routes with middleware
- Session management with Supabase Auth

✅ **User Dashboard**
- Profile management (name, phone, email)
- Password change with validation
- Notification preferences
- Payment method management (Stripe)
- Empty states for subscriptions and earnings

✅ **Admin Dashboard**
- User management
- Mosque, business, and coupon oversight
- Financial overview and reporting
- Payment alerts monitoring
- Subscription lifecycle management

✅ **Payment Integration**
- Stripe payment method management
- Secure card storage
- PCI-compliant payment processing
- Add, update, and remove payment methods

✅ **Database & Backend**
- PostgreSQL database via Supabase
- Row Level Security (RLS) policies
- Database triggers for user profile creation
- RESTful API endpoints
- Type-safe database queries

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript 5** - Type safety
- **Tailwind CSS 4** - Styling
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icons
- **Stripe Elements** - Payment UI components

### Backend
- **Next.js API Routes** - Serverless API
- **Supabase** - PostgreSQL database & authentication
- **Stripe** - Payment processing
- **Row Level Security** - Database security policies

### Development Tools
- **pnpm** - Package manager
- **ESLint** - Code linting
- **TypeScript** - Type checking

---

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** installed
- **pnpm** package manager (`npm install -g pnpm`)
- **Supabase account** ([https://supabase.com](https://supabase.com))
- **Stripe account** ([https://stripe.com](https://stripe.com))
- **PostgreSQL** (via Supabase)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd amanah_project/amanah-website
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the `amanah-website` directory:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres

# Stripe (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_SECRET_KEY=sk_test_your_secret_key
```

#### Getting Your Keys:

**Supabase:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the URL, anon key, and service_role key
5. Get database URL from **Settings** → **Database** → **Connection string**

**Stripe:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy both test keys (pk_test_* and sk_test_*)

### 4. Run Database Migrations

Execute the SQL migrations in order via Supabase SQL Editor:

```bash
# 1. Initial schema (users, businesses, mosques)
supabase/migrations/001_initial_schema.sql

# 2. Row Level Security policies
supabase/migrations/002_rls_policies.sql

# 3. Authentication trigger
supabase/migrations/003_auth_trigger.sql

# 4. Fix RLS recursion
supabase/migrations/004_fix_rls_recursion.sql

# 5. Update roles (user & admin only)
supabase/migrations/005_update_roles.sql

# 6. Notification preferences
supabase/migrations/006_add_notification_preferences.sql

# 7. Stripe customer ID
supabase/migrations/007_add_stripe_customer_id.sql
```

**Or run via command line:**

```bash
psql "$SUPABASE_DATABASE_URL" -f supabase/migrations/001_initial_schema.sql
psql "$SUPABASE_DATABASE_URL" -f supabase/migrations/002_rls_policies.sql
# ... continue for all migrations
```

### 5. Create an Admin Account

#### Option A: Via Registration + SQL
1. Register a new account at `/member/register`
2. Run this SQL in Supabase:

```sql
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'your-admin-email@example.com';
```

#### Option B: Via Script
```bash
pnpm create-admin
# Follow the prompts to enter admin details
```

### 6. Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
amanah-website/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── logout/
│   │   │   └── me/
│   │   ├── stripe/               # Stripe payment endpoints
│   │   │   ├── setup-intent/
│   │   │   └── payment-method/
│   │   ├── user/                 # User management
│   │   │   ├── profile/
│   │   │   ├── change-password/
│   │   │   └── notification-preferences/
│   │   └── directory/            # Directory endpoints
│   ├── admin/                    # Admin dashboard
│   │   ├── page.tsx
│   │   └── settings/
│   ├── auth/                     # Auth pages
│   │   └── login/
│   ├── member/                   # Member dashboard
│   │   ├── page.tsx
│   │   ├── register/
│   │   └── settings/
│   ├── login/                    # Portal selection
│   ├── globals.css
│   └── layout.tsx
├── components/                   # React components
│   ├── ui/                       # Shadcn UI components
│   ├── add-payment-method-dialog.tsx
│   └── ...
├── lib/                          # Utilities & helpers
│   ├── supabase.ts              # Supabase client
│   ├── auth.ts                  # Auth helpers
│   ├── auth-context.tsx         # Auth context provider
│   ├── api-helpers.ts           # API utilities
│   ├── api-client.ts            # Authenticated API client
│   ├── stripe.ts                # Stripe SDK
│   └── utils.ts
├── supabase/
│   └── migrations/              # Database migrations
├── scripts/
│   └── create-admin.ts          # Admin creation script
├── .env.local                   # Environment variables (create this)
├── middleware.ts                # Auth middleware
└── package.json
```

---

## 🔐 Authentication Flow

```
1. User Registration
   → POST /api/auth/register
   → Create user in auth.users
   → Trigger creates profile in public.users
   → Return session token

2. User Login
   → POST /api/auth/login
   → Validate credentials
   → Fetch user profile
   → Return user + session

3. Protected Routes
   → Middleware checks session
   → Redirects to /auth/login if not authenticated
   → Allows access if authenticated

4. Role-Based Access
   → Admin routes check user.role === 'admin'
   → Member routes allow any authenticated user
```

---

## 💳 Payment Integration

### Stripe Setup

1. **Test Cards** (for development):
   - Success: `4242 4242 4242 4242`
   - Declined: `4000 0000 0000 0002`
   - 3D Secure: `4000 0027 6000 3184`

2. **Add Payment Method Flow**:
   ```
   User clicks "Add Payment Method"
   → Create SetupIntent (POST /api/stripe/setup-intent)
   → Display Stripe Elements form
   → User enters card details
   → Stripe validates & tokenizes
   → Payment method attached to customer
   → Success toast shown
   ```

3. **Stripe Dashboard**:
   - View customers: https://dashboard.stripe.com/test/customers
   - View payment methods: https://dashboard.stripe.com/test/payment_methods

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `POST /api/user/change-password` - Change password
- `GET /api/user/notification-preferences` - Get preferences
- `PUT /api/user/notification-preferences` - Update preferences

### Stripe Payments
- `POST /api/stripe/setup-intent` - Create setup intent
- `GET /api/stripe/payment-method` - Get payment method
- `DELETE /api/stripe/payment-method` - Remove payment method

### Directory
- `GET /api/directory/businesses` - List businesses
- `GET /api/directory/mosques` - List mosques

All endpoints (except auth) require `Authorization: Bearer {token}` header.

---

## 🗄️ Database Schema

### Core Tables

**users**
- `id` (uuid, PK) - User ID (matches auth.users)
- `email` (text) - User email
- `name` (text) - Full name
- `phone` (text) - Phone number
- `role` (user_role) - User or Admin
- `stripe_customer_id` (text) - Stripe customer ID
- `email_notifications` (boolean) - Email notification preference
- `payment_reminders` (boolean) - Payment reminder preference
- `monthly_reports` (boolean) - Monthly report preference
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**businesses**
- Business directory listings
- Affiliated mosque tracking
- Categories and metadata

**mosques**
- Mosque directory listings
- Contact information
- Prayer times and services

---

## 🧪 Testing

### Test Admin Account
```
Email: rorounifix@gmail.com
Password: P@$$w0rd
```

### Test Payment Method
```
Card: 4242 4242 4242 4242
Expiry: 12/25
CVC: 123
ZIP: 12345
```

### Run Linter
```bash
pnpm lint
```

### Build for Production
```bash
pnpm build
```

---

## 🚢 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy

### Environment Variables for Production

```bash
# Use LIVE keys for production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

---

## 🔒 Security

✅ **Implemented Security Measures**:
- Row Level Security (RLS) on all tables
- Authentication middleware on protected routes
- Password hashing via Supabase Auth
- PCI compliance via Stripe Elements
- Server-side API key usage only
- Input validation on all endpoints
- HTTPS-only in production

⚠️ **Important**:
- Never commit `.env.local` to git
- Use environment variables for all secrets
- Rotate API keys regularly
- Enable Stripe Radar for fraud detection
- Set up webhook signature verification

---

## 🐛 Troubleshooting

### Common Issues

**"Stripe publishable key not found"**
- Check `.env.local` has `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Restart dev server

**"Database error" during registration**
- Run all database migrations in order
- Check auth trigger is created (`003_auth_trigger.sql`)

**"Authentication required" on API calls**
- Check Authorization header is being sent
- Verify user session is valid
- Check `lib/api-client.ts` is being used

**Toast notifications not appearing**
- Check `<Toaster />` is in `app/layout.tsx`
- Verify `useToast()` hook is imported correctly

---

## 📚 Documentation

Additional documentation files:
- Database migrations in `supabase/migrations/`
- API client usage in `lib/api-client.ts`
- Auth helpers in `lib/auth.ts`

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is private and proprietary.

---

## 👥 Team

Built with ❤️ for the Muslim community

---

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the documentation files
3. Check Supabase logs for database errors
4. Check Stripe dashboard for payment issues

---

## 🎯 Roadmap

### Phase 1: Foundation (✅ Complete)
- ✅ Authentication system
- ✅ User & admin dashboards
- ✅ Payment method management
- ✅ Notification preferences
- ✅ Profile management

### Phase 2: Subscriptions (Coming Soon)
- [ ] Mosque subscription creation ($100/month)
- [ ] Business subscription creation ($10/month)
- [ ] Coupon subscription creation ($10/month)
- [ ] Subscription lifecycle management
- [ ] Payment processing

### Phase 3: Directory (Coming Soon)
- [ ] Mosque search and filtering
- [ ] Business directory with categories
- [ ] Coupon marketplace
- [ ] Reviews and ratings

### Phase 4: Community Features (Coming Soon)
- [ ] Prayer time notifications
- [ ] Event management
- [ ] Community announcements
- [ ] Donation tracking

---

**Made with 🤲 for the Ummah**
