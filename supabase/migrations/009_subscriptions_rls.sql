-- Enable RLS on new tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nonprofits ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions"
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON public.subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all subscriptions"
  ON public.subscriptions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Coupons policies
CREATE POLICY "Users can view own coupons"
  ON public.coupons
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own coupons"
  ON public.coupons
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own coupons"
  ON public.coupons
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all coupons"
  ON public.coupons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all coupons"
  ON public.coupons
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Nonprofits policies
CREATE POLICY "Users can view own nonprofits"
  ON public.nonprofits
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own nonprofits"
  ON public.nonprofits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nonprofits"
  ON public.nonprofits
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all nonprofits"
  ON public.nonprofits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all nonprofits"
  ON public.nonprofits
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Public read access for active entities (so everyone can see them in the directory)
CREATE POLICY "Anyone can view active coupons"
  ON public.coupons
  FOR SELECT
  USING (status = 'active');

CREATE POLICY "Anyone can view active nonprofits"
  ON public.nonprofits
  FOR SELECT
  USING (status = 'active');

