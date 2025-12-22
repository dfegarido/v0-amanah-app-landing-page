import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Check for login form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
  });

  test('should show error for invalid login credentials', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // Click sign in
    await page.click('button:has-text("Sign In")');
    
    // Wait for error message (toast or error text)
    await expect(page.locator('text=/Invalid|Error|Failed/i')).toBeVisible({ timeout: 5000 });
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Use test credentials (update with your test user)
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    
    // Click sign in
    await page.click('button:has-text("Sign In")');
    
    // Wait for redirect to dashboard
    await page.waitForURL('/member', { timeout: 10000 });
    
    // Verify we're on the dashboard
    await expect(page.locator('text=/Welcome|Dashboard/i')).toBeVisible();
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Click on "Create one" link or similar
    const registerLink = page.locator('a:has-text("Create one"), a:has-text("Sign up"), a:has-text("Register")').first();
    await registerLink.click();
    
    // Should be on registration page
    await expect(page).toHaveURL(/\/member\/register/);
  });

  test('should register new user', async ({ page }) => {
    await page.goto('/member/register');
    
    // Generate unique email for testing
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    
    // Fill registration form
    await page.fill('input[name="name"], input[id="name"]', 'Test User');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[name="phone"], input[id="phone"]', '+1234567890');
    await page.fill('input[type="password"]', 'Test@1234');
    
    // Submit form
    await page.click('button:has-text("Create Account"), button:has-text("Sign Up"), button:has-text("Register")');
    
    // Should redirect to login page after successful registration
    await page.waitForURL('/auth/login', { timeout: 10000 });
    
    // Look for success message
    await expect(page.locator('text=/Success|Created|Registered/i')).toBeVisible({ timeout: 5000 });
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button:has-text("Sign In")');
    
    // Wait for dashboard
    await page.waitForURL('/member', { timeout: 10000 });
    
    // Click logout button
    await page.click('button[title="Logout"], button:has-text("Logout")');
    
    // Should redirect to login page
    await page.waitForURL('/auth/login', { timeout: 5000 });
    
    // Verify login page is shown
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should protect dashboard route when not authenticated', async ({ page }) => {
    // Clear any existing auth
    await page.context().clearCookies();
    
    // Try to access dashboard directly
    await page.goto('/member');
    
    // Should redirect to login
    await page.waitForURL('/auth/login', { timeout: 5000 });
  });

  test('should protect admin route when not admin', async ({ page }) => {
    // Login as regular user
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button:has-text("Sign In")');
    
    await page.waitForURL('/member', { timeout: 10000 });
    
    // Try to access admin dashboard
    await page.goto('/admin');
    
    // Should either redirect or show access denied
    await expect(
      page.locator('text=/Access Denied|Unauthorized|Not Authorized/i')
    ).toBeVisible({ timeout: 5000 });
  });
});

