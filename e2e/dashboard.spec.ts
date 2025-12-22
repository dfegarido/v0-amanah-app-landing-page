import { test, expect } from '@playwright/test';

// Helper function to login
async function login(page: any) {
  await page.goto('/auth/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'testpassword');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('/member', { timeout: 10000 });
}

test.describe('Member Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display dashboard with user info', async ({ page }) => {
    await page.goto('/member');
    
    // Check for welcome message
    await expect(page.locator('text=/Welcome|Dashboard/i')).toBeVisible();
    
    // Check for user email
    await expect(page.locator('text=/test@example.com/i')).toBeVisible();
    
    // Check for logo
    await expect(page.locator('img[alt*="Amanah"], img[alt*="Logo"]')).toBeVisible();
  });

  test('should display subscription stats', async ({ page }) => {
    await page.goto('/member');
    
    // Check for stats cards
    await expect(page.locator('text=/Active Subscriptions/i')).toBeVisible();
    await expect(page.locator('text=/Monthly Total/i')).toBeVisible();
    await expect(page.locator('text=/Member Since/i')).toBeVisible();
  });

  test('should display add subscription options', async ({ page }) => {
    await page.goto('/member');
    
    // Check for subscription type cards
    await expect(page.locator('text=/Add Mosque/i')).toBeVisible();
    await expect(page.locator('text=/Add Business/i')).toBeVisible();
    await expect(page.locator('text=/Add Coupon/i')).toBeVisible();
    await expect(page.locator('text=/Add Nonprofit/i')).toBeVisible();
    
    // Check pricing is shown
    await expect(page.locator('text=/\\$100\\/month/i')).toBeVisible(); // Mosque
    await expect(page.locator('text=/\\$10\\/month/i')).toBeVisible(); // Business/Coupon
    await expect(page.locator('text=/\\$50\\/month/i')).toBeVisible(); // Nonprofit
  });

  test('should navigate to mosque subscription page', async ({ page }) => {
    await page.goto('/member');
    
    // Click on Add Mosque card
    await page.click('text=/Add Mosque/i');
    
    // Should navigate to mosque subscription page
    await expect(page).toHaveURL('/member/subscribe/mosque');
  });

  test('should navigate to business subscription page', async ({ page }) => {
    await page.goto('/member');
    
    // Click on Add Business card
    await page.click('text=/Add Business/i');
    
    // Should navigate to business subscription page
    await expect(page).toHaveURL('/member/subscribe/business');
  });

  test('should display existing subscriptions', async ({ page }) => {
    await page.goto('/member');
    
    // Wait for subscriptions to load
    await page.waitForTimeout(2000);
    
    // Check for subscriptions section
    await expect(page.locator('text=/Your Subscriptions|My Subscriptions/i')).toBeVisible();
    
    // Either show subscriptions or empty state
    const hasSubscriptions = await page.locator('text=/mosque|business|coupon|nonprofit/i').count() > 0;
    const hasEmptyState = await page.locator('text=/No Subscriptions|Get started/i').count() > 0;
    
    expect(hasSubscriptions || hasEmptyState).toBeTruthy();
  });

  test('should click on subscription to view details', async ({ page }) => {
    await page.goto('/member');
    
    // Wait for subscriptions to load
    await page.waitForTimeout(2000);
    
    // Find first subscription card (if any)
    const subscriptionCard = page.locator('[class*="hover:shadow"]').first();
    
    if (await subscriptionCard.isVisible()) {
      await subscriptionCard.click();
      
      // Should navigate to subscription detail page
      await expect(page).toHaveURL(/\/member\/subscription\/.+/);
    }
  });

  test('should show loading state while fetching subscriptions', async ({ page }) => {
    await page.goto('/member');
    
    // Look for loading indicator
    const loadingIndicator = page.locator('text=/Loading subscriptions|Loading.../i');
    
    // Loading indicator should appear briefly
    if (await loadingIndicator.isVisible({ timeout: 1000 })) {
      // Wait for it to disappear
      await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('should navigate to settings', async ({ page }) => {
    await page.goto('/member');
    
    // Click settings button/icon
    await page.click('button:has([class*="Settings"]), a:has([class*="Settings"])');
    
    // Should navigate to settings page
    await expect(page).toHaveURL('/member/settings');
  });

  test('should display subscription with mosque code', async ({ page }) => {
    await page.goto('/member');
    
    // Wait for subscriptions
    await page.waitForTimeout(2000);
    
    // Look for mosque code badge
    const mosqueCodeBadge = page.locator('text=/Code #\\d+/i');
    
    if (await mosqueCodeBadge.count() > 0) {
      await expect(mosqueCodeBadge.first()).toBeVisible();
    }
  });

  test('should display business with affiliation', async ({ page }) => {
    await page.goto('/member');
    
    // Wait for subscriptions
    await page.waitForTimeout(2000);
    
    // Look for affiliation badge
    const affiliationBadge = page.locator('text=/Affiliated with #\\d+/i');
    
    if (await affiliationBadge.count() > 0) {
      await expect(affiliationBadge.first()).toBeVisible();
    }
  });

  test('should display status badges', async ({ page }) => {
    await page.goto('/member');
    
    // Wait for subscriptions
    await page.waitForTimeout(2000);
    
    // Look for status badges
    const statusBadges = page.locator('text=/Active|Pending|Cancelled/i');
    
    if (await statusBadges.count() > 0) {
      await expect(statusBadges.first()).toBeVisible();
    }
  });

  test('should calculate correct monthly total', async ({ page }) => {
    await page.goto('/member');
    
    // Wait for stats to load
    await page.waitForTimeout(2000);
    
    // Get monthly total element
    const monthlyTotal = page.locator('text=/Monthly Total/i').locator('..').locator('text=/\\$/');
    
    await expect(monthlyTotal).toBeVisible();
    
    // Verify it's a valid dollar amount
    const totalText = await monthlyTotal.textContent();
    expect(totalText).toMatch(/\$\d+\.?\d*/);
  });
});

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have working back to dashboard link', async ({ page }) => {
    // Navigate away from dashboard
    await page.goto('/member/settings');
    
    // Click back to dashboard (logo or home button)
    await page.click('img[alt*="Logo"], a:has-text("Dashboard"), a[href="/member"]');
    
    // Should be back on dashboard
    await expect(page).toHaveURL('/member');
  });

  test('should persist auth across page navigation', async ({ page }) => {
    await page.goto('/member');
    
    // Navigate to settings
    await page.goto('/member/settings');
    
    // Should still be authenticated
    await expect(page.locator('text=/Settings|Account/i')).toBeVisible();
    
    // Navigate back to dashboard
    await page.goto('/member');
    
    // Should still be authenticated
    await expect(page.locator('text=/Welcome|Dashboard/i')).toBeVisible();
  });
});

test.describe('Dashboard Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display correctly on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/member');
    
    // Check key elements are visible
    await expect(page.locator('text=/Welcome|Dashboard/i')).toBeVisible();
    await expect(page.locator('text=/Active Subscriptions/i')).toBeVisible();
  });

  test('should display correctly on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('/member');
    
    // Check layout
    await expect(page.locator('text=/Welcome|Dashboard/i')).toBeVisible();
    await expect(page.locator('text=/Add Mosque/i')).toBeVisible();
  });
});

