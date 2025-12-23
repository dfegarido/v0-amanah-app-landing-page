-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mosques ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Businesses table policies
-- Anyone can view active businesses (public directory)
CREATE POLICY "Anyone can view active businesses"
  ON public.businesses FOR SELECT
  USING (status = 'active');

-- Business owners can view their own businesses
CREATE POLICY "Business owners can view own businesses"
  ON public.businesses FOR SELECT
  USING (auth.uid() = user_id);

-- Business owners can insert their own businesses
CREATE POLICY "Business owners can insert own businesses"
  ON public.businesses FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('business_owner', 'admin')
    )
  );

-- Business owners can update their own businesses
CREATE POLICY "Business owners can update own businesses"
  ON public.businesses FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can do everything with businesses
CREATE POLICY "Admins can manage all businesses"
  ON public.businesses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Mosques table policies
-- Anyone can view active mosques (public directory)
CREATE POLICY "Anyone can view active mosques"
  ON public.mosques FOR SELECT
  USING (status = 'active');

-- Mosque owners can view their own mosques
CREATE POLICY "Mosque owners can view own mosques"
  ON public.mosques FOR SELECT
  USING (auth.uid() = user_id);

-- Users with business_owner or admin role can create mosques
CREATE POLICY "Authorized users can create mosques"
  ON public.mosques FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('business_owner', 'admin')
    )
  );

-- Mosque owners can update their own mosques
CREATE POLICY "Mosque owners can update own mosques"
  ON public.mosques FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can do everything with mosques
CREATE POLICY "Admins can manage all mosques"
  ON public.mosques FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
