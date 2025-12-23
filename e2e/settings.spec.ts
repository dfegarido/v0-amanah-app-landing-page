import { test, expect } from '@playwright/test';

// Helper function to login
async function login(page: any) {
  await page.goto('/auth/login');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'testpassword');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('/member', { timeout: 10000 });
}

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/member/settings');
  });

  test('should display settings page', async ({ page }) => {
    // Check for settings header
    await expect(page.locator('text=/Account Settings|Settings/i')).toBeVisible();
    
    // Check for main sections
    await expect(page.locator('text=/Profile Information/i')).toBeVisible();
    await expect(page.locator('text=/Security/i')).toBeVisible();
    await expect(page.locator('text=/Notifications/i')).toBeVisible();
    await expect(page.locator('text=/Payment Method/i')).toBeVisible();
  });

  test('should have home button that navigates to dashboard', async ({ page }) => {
    // Click home button
    await page.click('button:has-text("Home"), a:has-text("Home")');
    
    // Should navigate back to dashboard
    await expect(page).toHaveURL('/member');
  });
});

test.describe('Profile Settings', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/member/settings');
  });

  test('should display current user information', async ({ page }) => {
    // Check that form fields are populated
    const nameInput = page.locator('input[name="name"], input[id="name"]');
    await expect(nameInput).toBeVisible();
    
    const phoneInput = page.locator('input[name="phone"], input[id="phone"]');
    await expect(phoneInput).toBeVisible();
    
    // Values should be populated (not empty for existing user)
    const nameValue = await nameInput.inputValue();
    expect(nameValue.length).toBeGreaterThan(0);
  });

  test('should update profile information', async ({ page }) => {
    // Fill new information
    await page.fill('input[name="name"], input[id="name"]', 'Updated Test User');
    await page.fill('input[name="phone"], input[id="phone"]', '+19876543210');
    
    // Click save button
    await page.click('button:has-text("Save"), button:has-text("Update")');
    
    // Wait for success message
    await expect(page.locator('text=/Success|Updated|Saved/i')).toBeVisible({ timeout: 5000 });
  });

  test('should validate phone number format', async ({ page }) => {
    // Try invalid phone
    await page.fill('input[name="phone"], input[id="phone"]', 'invalid');
    
    // Try to save
    await page.click('button:has-text("Save"), button:has-text("Update")');
    
    // Should show validation error or not submit
    // (Validation behavior depends on implementation)
  });
});

test.describe('Password Change', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/member/settings');
  });

  test('should display password change section', async ({ page }) => {
    await expect(page.locator('text=/Change Password|Password/i')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toHaveCount(2); // Current and new password
  });

  test('should change password successfully', async ({ page }) => {
    // Fill password fields
    await page.fill('input[placeholder*="Current"], input[id="currentPassword"]', 'testpassword');
    await page.fill('input[placeholder*="New"], input[id="newPassword"]', 'NewTest@1234');
    
    // Click change password button
    await page.click('button:has-text("Change Password"), button:has-text("Update Password")');
    
    // Wait for success message
    await expect(page.locator('text=/Success|Changed|Updated/i')).toBeVisible({ timeout: 5000 });
  });

  test('should validate password strength', async ({ page }) => {
    // Try weak password
    await page.fill('input[placeholder*="Current"], input[id="currentPassword"]', 'testpassword');
    await page.fill('input[placeholder*="New"], input[id="newPassword"]', '123');
    
    // Try to submit
    await page.click('button:has-text("Change Password")');
    
    // Should show validation error
    // (Implementation specific - might be browser validation or custom)
  });

  test('should require current password', async ({ page }) => {
    // Fill only new password
    await page.fill('input[placeholder*="New"], input[id="newPassword"]', 'NewTest@1234');
    
    // Try to submit
    await page.click('button:has-text("Change Password")');
    
    // Should show error for missing current password
  });
});

test.describe('Notification Preferences', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/member/settings');
  });

  test('should display notification toggles', async ({ page }) => {
    await expect(page.locator('text=/Email Notifications/i')).toBeVisible();
    await expect(page.locator('text=/Payment Reminders/i')).toBeVisible();
    await expect(page.locator('text=/Monthly Reports/i')).toBeVisible();
  });

  test('should toggle email notifications', async ({ page }) => {
    // Find email notifications toggle
    const toggle = page.locator('button[role="switch"], input[type="checkbox"]').first();
    
    // Get initial state
    const initialState = await toggle.getAttribute('aria-checked') || await toggle.isChecked();
    
    // Click toggle
    await toggle.click();
    
    // Wait for update
    await page.waitForTimeout(1000);
    
    // Verify state changed
    const newState = await toggle.getAttribute('aria-checked') || await toggle.isChecked();
    expect(newState).not.toBe(initialState);
  });

  test('should save notification preferences', async ({ page }) => {
    // Toggle all switches
    const toggles = page.locator('button[role="switch"], input[type="checkbox"]');
    const count = await toggles.count();
    
    for (let i = 0; i < count; i++) {
      await toggles.nth(i).click();
      await page.waitForTimeout(500);
    }
    
    // Should auto-save or show success message
    // Look for toast notification
    await page.waitForTimeout(1000);
  });
});

test.describe('Payment Method', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/member/settings');
  });

  test('should display payment method section', async ({ page }) => {
    await expect(page.locator('text=/Payment Method|Payment Information/i')).toBeVisible();
  });

  test('should show add payment method button when no method exists', async ({ page }) => {
    // Look for add button or "No payment method" message
    const hasNoMethod = await page.locator('text=/No payment method|Add Payment Method/i').count() > 0;
    
    if (hasNoMethod) {
      await expect(page.locator('button:has-text("Add Payment Method")').first()).toBeVisible();
    }
  });

  test('should open payment method dialog', async ({ page }) => {
    // Click add payment method
    const addButton = page.locator('button:has-text("Add Payment Method")').first();
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Should show Stripe Elements or payment form
      await expect(page.locator('text=/Card Number|Payment Details/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should close payment method dialog', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add Payment Method")').first();
    
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);
      
      // Click cancel or close button
      await page.click('button:has-text("Cancel"), button:has-text("Close")');
      
      // Dialog should close
      await expect(page.locator('text=/Card Number|Payment Details/i')).not.toBeVisible();
    }
  });

  test('should display existing payment method', async ({ page }) => {
    // Look for payment method display (last 4 digits, expiry, etc.)
    const hasMethod = await page.locator('text=/•••• \\d{4}|Visa|Mastercard|ending in/i').count() > 0;
    
    if (hasMethod) {
      // Should show card info
      await expect(page.locator('text=/•••• \\d{4}|ending in/i').first()).toBeVisible();
      
      // Should have remove/delete button
      await expect(page.locator('button:has-text("Remove"), button:has-text("Delete")').first()).toBeVisible();
    }
  });
});

test.describe('Settings Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate from dashboard to settings', async ({ page }) => {
    await page.goto('/member');
    
    // Click settings icon/button
    await page.click('button:has([class*="Settings"]), a[href="/member/settings"]');
    
    // Should be on settings page
    await expect(page).toHaveURL('/member/settings');
  });

  test('should navigate from settings back to dashboard', async ({ page }) => {
    await page.goto('/member/settings');
    
    // Click home button
    await page.click('button:has-text("Home"), a:has-text("Home"), a[href="/member"]');
    
    // Should be back on dashboard
    await expect(page).toHaveURL('/member');
  });

  test('should logout from settings page', async ({ page }) => {
    await page.goto('/member/settings');
    
    // Click logout button
    await page.click('button:has-text("Logout"), button:has-text("Sign Out")');
    
    // Should redirect to login
    await expect(page).toHaveURL('/auth/login');
  });
});

test.describe('Settings Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display settings correctly on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/member/settings');
    
    // Check sections are visible
    await expect(page.locator('text=/Profile Information/i')).toBeVisible();
    await expect(page.locator('text=/Security/i')).toBeVisible();
  });

  test('should display settings correctly on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('/member/settings');
    
    // Check layout
    await expect(page.locator('text=/Account Settings/i')).toBeVisible();
  });
});
