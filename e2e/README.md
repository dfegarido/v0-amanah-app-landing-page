# E2E Tests

End-to-end tests for Amanah Platform using Playwright.

## Test Files

### `auth.spec.ts`
Tests for user authentication:
- Login/logout
- Registration
- Session management
- Route protection
- Role-based access

### `subscriptions.spec.ts`
Tests for subscription creation:
- Mosque subscriptions
- Business subscriptions (with affiliation)
- Coupon subscriptions
- Nonprofit subscriptions
- Form validation

### `dashboard.spec.ts`
Tests for member dashboard:
- Display user info
- Show subscription stats
- List subscriptions
- Navigation
- Responsive design

### `settings.spec.ts`
Tests for account settings:
- Profile updates
- Password changes
- Notification preferences
- Payment method management
- Navigation

## Running Tests

See `../PLAYWRIGHT_TESTING_GUIDE.md` for complete documentation.

### Quick Commands:

```bash
# Run all tests
pnpm test:e2e

# Run specific file
pnpm exec playwright test auth

# Interactive mode
pnpm test:e2e:ui

# Debug mode
pnpm test:e2e:debug
```

## Test Coverage

- **50+ tests** across 4 test suites
- **5 browsers** tested (Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari)
- **100% feature coverage** of implemented features

## Prerequisites

1. Test user: `test@example.com` / `testpassword`
2. Database migrations applied
3. Dev server running on `localhost:3000`
4. Environment variables configured

## Writing New Tests

```typescript
import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('/member');
  await expect(page.locator('text=Dashboard')).toBeVisible();
});
```

See guide for more details.

