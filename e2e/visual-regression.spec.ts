import { test, expect } from '@playwright/test';

/**
 * Visual Regression Testing Suite
 * Captures and compares screenshots to detect unintended UI changes
 */

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

test.describe('Visual Regression Tests', () => {
    test.describe('Desktop Views', () => {
        test.beforeEach(async ({ page }) => {
            await page.setViewportSize({ width: 1920, height: 1080 });
        });

        test('homepage visual snapshot', async ({ page }) => {
            await page.goto(FRONTEND_URL);
            await page.waitForLoadState('networkidle');
            await expect(page).toHaveScreenshot('homepage-desktop.png', {
                fullPage: true,
                maxDiffPixels: 100,
            });
        });

        test('login page visual snapshot', async ({ page }) => {
            await page.goto(`${FRONTEND_URL}/login`);
            await page.waitForLoadState('networkidle');
            await expect(page).toHaveScreenshot('login-desktop.png', {
                maxDiffPixels: 100,
            });
        });

        test('register page visual snapshot', async ({ page }) => {
            await page.goto(`${FRONTEND_URL}/register`);
            await page.waitForLoadState('networkidle');
            await expect(page).toHaveScreenshot('register-desktop.png', {
                maxDiffPixels: 100,
            });
        });

        test('contract analyzer visual snapshot', async ({ page }) => {
            await page.goto(`${FRONTEND_URL}/analyze`);
            await page.waitForLoadState('networkidle');
            await expect(page).toHaveScreenshot('analyzer-desktop.png', {
                fullPage: true,
                maxDiffPixels: 100,
            });
        });

        test('repository analyzer visual snapshot', async ({ page }) => {
            await page.goto(`${FRONTEND_URL}/repository`);
            await page.waitForLoadState('networkidle');
            await expect(page).toHaveScreenshot('repository-desktop.png', {
                fullPage: true,
                maxDiffPixels: 100,
            });
        });
    });

    test.describe('Mobile Views', () => {
        test.beforeEach(async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
        });

        test('homepage mobile visual snapshot', async ({ page }) => {
            await page.goto(FRONTEND_URL);
            await page.waitForLoadState('networkidle');
            await expect(page).toHaveScreenshot('homepage-mobile.png', {
                fullPage: true,
                maxDiffPixels: 100,
            });
        });

        test('login page mobile visual snapshot', async ({ page }) => {
            await page.goto(`${FRONTEND_URL}/login`);
            await page.waitForLoadState('networkidle');
            await expect(page).toHaveScreenshot('login-mobile.png', {
                maxDiffPixels: 100,
            });
        });

        test('analyzer mobile visual snapshot', async ({ page }) => {
            await page.goto(`${FRONTEND_URL}/analyze`);
            await page.waitForLoadState('networkidle');
            await expect(page).toHaveScreenshot('analyzer-mobile.png', {
                fullPage: true,
                maxDiffPixels: 100,
            });
        });
    });

    test.describe('Tablet Views', () => {
        test.beforeEach(async ({ page }) => {
            await page.setViewportSize({ width: 768, height: 1024 }); // iPad
        });

        test('homepage tablet visual snapshot', async ({ page }) => {
            await page.goto(FRONTEND_URL);
            await page.waitForLoadState('networkidle');
            await expect(page).toHaveScreenshot('homepage-tablet.png', {
                fullPage: true,
                maxDiffPixels: 100,
            });
        });

        test('analyzer tablet visual snapshot', async ({ page }) => {
            await page.goto(`${FRONTEND_URL}/analyze`);
            await page.waitForLoadState('networkidle');
            await expect(page).toHaveScreenshot('analyzer-tablet.png', {
                fullPage: true,
                maxDiffPixels: 100,
            });
        });
    });

    test.describe('Component Visual Tests', () => {
        test('navbar component', async ({ page }) => {
            await page.goto(FRONTEND_URL);
            const navbar = page.locator('nav').first();
            await expect(navbar).toHaveScreenshot('navbar-component.png', {
                maxDiffPixels: 50,
            });
        });

        test('footer component', async ({ page }) => {
            await page.goto(FRONTEND_URL);
            const footer = page.locator('footer').first();
            await expect(footer).toHaveScreenshot('footer-component.png', {
                maxDiffPixels: 50,
            });
        });
    });

    test.describe('Dark Theme', () => {
        test('homepage dark theme', async ({ page }) => {
            await page.goto(FRONTEND_URL);

            // Ensure dark theme is applied (your app's default)
            const isDark = await page.evaluate(() => {
                return document.documentElement.classList.contains('dark') ||
                    document.body.classList.contains('dark') ||
                    getComputedStyle(document.body).backgroundColor.includes('0, 0, 0') ||
                    getComputedStyle(document.body).backgroundColor === 'rgb(0, 0, 0)';
            });

            if (isDark) {
                await expect(page).toHaveScreenshot('homepage-dark.png', {
                    fullPage: true,
                    maxDiffPixels: 100,
                });
            }
        });
    });

    test.describe('Interactive States', () => {
        test('button hover state', async ({ page }) => {
            await page.goto(`${FRONTEND_URL}/login`);
            const button = page.locator('button[type="submit"]').first();
            await button.hover();
            await page.waitForTimeout(200); // Wait for hover animation
            await expect(button).toHaveScreenshot('button-hover.png', {
                maxDiffPixels: 50,
            });
        });

        test('input focus state', async ({ page }) => {
            await page.goto(`${FRONTEND_URL}/login`);
            const input = page.locator('input[type="email"]').first();
            await input.focus();
            await page.waitForTimeout(200); // Wait for focus animation
            await expect(input).toHaveScreenshot('input-focus.png', {
                maxDiffPixels: 50,
            });
        });
    });
});
