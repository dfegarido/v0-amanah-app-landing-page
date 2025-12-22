import { test, expect } from '@playwright/test';

// Helper function to login
async function login(page: any) {
  await page.goto('/auth/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'testpassword');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('/member', { timeout: 10000 });
}

test.describe('Mosque Subscription', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create mosque subscription', async ({ page }) => {
    // Navigate to mosque subscription page
    await page.goto('/member/subscribe/mosque');
    
    // Verify page loaded
    await expect(page.locator('text=/Mosque Subscription/i')).toBeVisible();
    
    // Fill in mosque details (Step 1)
    const timestamp = Date.now();
    await page.fill('input[id="name"]', `Test Mosque ${timestamp}`);
    await page.fill('input[id="address"]', '123 Test Street');
    await page.fill('input[id="email"]', `mosque${timestamp}@example.com`);
    await page.fill('input[id="phone"]', '+1234567890');
    await page.fill('input[id="contactName"]', 'Imam Test');
    
    // Optional fields
    await page.fill('input[id="website"]', 'https://testmosque.com');
    await page.fill('input[id="facebook"]', 'https://facebook.com/testmosque');
    
    // Click continue to payment
    await page.click('button:has-text("Continue to Payment")');
    
    // Wait for step 2 (payment confirmation)
    await expect(page.locator('text=/Confirm Subscription|Payment/i')).toBeVisible();
    
    // Verify pricing shown
    await expect(page.locator('text=/\\$100/i')).toBeVisible();
    
    // Verify mosque code is displayed
    await expect(page.locator('text=/Code #|#\\d+/i')).toBeVisible();
    
    // Click simulate payment
    await page.click('button:has-text("Simulate Payment")');
    
    // Wait for success page (Step 3)
    await expect(page.locator('text=/Success|Active|Created/i')).toBeVisible({ timeout: 10000 });
    
    // Verify mosque code is shown
    await expect(page.locator('text=/mosque code|Code #\\d+/i')).toBeVisible();
    
    // Return to dashboard
    await page.click('a:has-text("Return to Dashboard"), a:has-text("Dashboard")');
    
    // Verify we're on dashboard
    await page.waitForURL('/member', { timeout: 5000 });
  });

  test('should show mosque code after creation', async ({ page }) => {
    await page.goto('/member/subscribe/mosque');
    
    // Look for next mosque code display
    await expect(page.locator('text=/Your Mosque Code|#\\d+/i')).toBeVisible();
  });
});

test.describe('Business Subscription', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create business subscription', async ({ page }) => {
    await page.goto('/member/subscribe/business');
    
    // Verify page loaded
    await expect(page.locator('text=/Business Listing|Business Subscription/i')).toBeVisible();
    
    // Fill in business details
    const timestamp = Date.now();
    await page.fill('input[id="title"]', `Test Business ${timestamp}`);
    await page.fill('textarea[id="description"]', 'A test halal business');
    await page.fill('input[id="categories"]', 'Food, Retail');
    await page.fill('input[id="address"]', '456 Business St');
    await page.fill('input[id="city"]', 'Test City');
    await page.fill('input[id="state"]', 'TX');
    await page.fill('input[id="zip"]', '75001');
    await page.fill('input[id="phone"]', '+1234567890');
    await page.fill('input[id="email"]', `business${timestamp}@example.com`);
    
    // Continue to payment
    await page.click('button:has-text("Continue to Payment")');
    
    // Verify pricing ($10/month for business)
    await expect(page.locator('text=/\\$10/i')).toBeVisible();
    
    // Simulate payment
    await page.click('button:has-text("Simulate Payment")');
    
    // Wait for success
    await expect(page.locator('text=/Success|Active|Created/i')).toBeVisible({ timeout: 10000 });
  });

  test('should allow mosque affiliation for business', async ({ page }) => {
    await page.goto('/member/subscribe/business');
    
    // Look for mosque affiliation section
    const mosqueSelect = page.locator('select, [role="combobox"]').first();
    
    if (await mosqueSelect.isVisible()) {
      // Select a mosque if available
      await mosqueSelect.click();
      
      // Check if mosques are available in dropdown
      const mosqueOption = page.locator('text=/#\\d+ -|Select a mosque/i').first();
      
      if (await mosqueOption.isVisible()) {
        await mosqueOption.click();
        
        // Verify 10% kickback message is shown
        await expect(page.locator('text=/10%|kickback/i')).toBeVisible();
      }
    }
  });
});

test.describe('Coupon Subscription', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create coupon subscription', async ({ page }) => {
    await page.goto('/member/subscribe/coupon');
    
    // Verify page loaded
    await expect(page.locator('text=/Coupon Listing|Coupon Subscription/i')).toBeVisible();
    
    // Fill in coupon details
    const timestamp = Date.now();
    await page.fill('input[id="title"]', `10% Off ${timestamp}`);
    await page.fill('input[id="merchant"]', 'Test Merchant');
    await page.fill('input[id="phone"]', '+1234567890');
    await page.fill('input[id="email"]', `coupon${timestamp}@example.com`);
    await page.fill('textarea[id="description"]', 'Get 10% off your first order');
    await page.fill('input[id="address"]', '789 Coupon Ave');
    
    // Fill discount details
    await page.fill('input[id="discountPercentage"]', '10%');
    await page.fill('input[id="startDate"]', '2024-01-01');
    
    // Continue to payment
    await page.click('button:has-text("Continue to Payment")');
    
    // Verify pricing
    await expect(page.locator('text=/\\$10/i')).toBeVisible();
    
    // Simulate payment
    await page.click('button:has-text("Simulate Payment")');
    
    // Wait for success
    await expect(page.locator('text=/Success|Active|Created/i')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Nonprofit Subscription', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should create nonprofit subscription', async ({ page }) => {
    await page.goto('/member/subscribe/nonprofit');
    
    // Verify page loaded
    await expect(page.locator('text=/Non-Profit|Nonprofit/i')).toBeVisible();
    
    // Fill in nonprofit details
    const timestamp = Date.now();
    await page.fill('input[id="orgName"]', `Test Nonprofit ${timestamp}`);
    await page.fill('input[id="address"]', '321 Charity Lane');
    await page.fill('input[id="email"]', `nonprofit${timestamp}@example.com`);
    await page.fill('input[id="phone"]', '+1234567890');
    await page.fill('textarea[id="about"]', 'A nonprofit organization helping the community');
    
    // Continue to payment
    await page.click('button:has-text("Continue to Payment")');
    
    // Verify pricing ($50/month)
    await expect(page.locator('text=/\\$50/i')).toBeVisible();
    
    // Simulate payment
    await page.click('button:has-text("Simulate Payment")');
    
    // Wait for success
    await expect(page.locator('text=/Success|Active|Created/i')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Subscription Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should require name for mosque', async ({ page }) => {
    await page.goto('/member/subscribe/mosque');
    
    // Try to continue without filling required fields
    await page.click('button:has-text("Continue to Payment")');
    
    // Should still be on step 1 or show validation error
    // (This depends on your validation implementation)
    const nameInput = page.locator('input[id="name"]');
    await expect(nameInput).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/member/subscribe/mosque');
    
    // Fill with invalid email
    await page.fill('input[id="email"]', 'invalid-email');
    await page.fill('input[id="name"]', 'Test');
    await page.fill('input[id="address"]', 'Test');
    await page.fill('input[id="phone"]', 'Test');
    await page.fill('input[id="contactName"]', 'Test');
    
    // Try to continue
    await page.click('button:has-text("Continue to Payment")');
    
    // Check for validation message (browser native or custom)
    const emailInput = page.locator('input[id="email"]');
    const validationMessage = await emailInput.evaluate((el: any) => el.validationMessage);
    expect(validationMessage).toBeTruthy();
  });
});

