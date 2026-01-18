import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByText(/login/i)).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page).toHaveURL(/.*register/);
    await expect(page.getByText(/create account/i)).toBeVisible();
  });
});
