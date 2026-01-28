import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility Testing Suite
 * Tests WCAG 2.1 AA compliance across all pages
 */

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

test.describe('Accessibility Tests', () => {
    test.describe('WCAG 2.1 AA Compliance', () => {
        test('homepage should not have accessibility violations', async ({ page }) => {
            await page.goto(FRONTEND_URL);

            const accessibilityScanResults = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
                .analyze();

            expect(accessibilityScanResults.violations).toEqual([]);
        });

        test('login page should not have accessibility violations', async ({ page }) => {
            await page.goto(`${FRONTEND_URL}/login`);

            const accessibilityScanResults = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
                .analyze();

            expect(accessibilityScanResults.violations).toEqual([]);
        });

        test('register page should not have accessibility violations', async ({ page }) => {
            await page.goto(`${FRONTEND_URL}/register`);

            const accessibilityScanResults = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
                .analyze();

            expect(accessibilityScanResults.violations).toEqual([]);
        });

        test('contract analyzer should not have accessibility violations', async ({ page }) => {
            await page.goto(`${FRONTEND_URL}/analyze`);

            const accessibilityScanResults = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
                .analyze();

            expect(accessibilityScanResults.violations).toEqual([]);
        });
    });

    test.describe('Keyboard Navigation', () => {
        test('should navigate login form with keyboard', async ({ page }) => {
            await page.goto(`${FRONTEND_URL}/login`);

            // Tab to email input
            await page.keyboard.press('Tab');
            let focused = await page.evaluate(() => document.activeElement?.tagName);
            expect(['INPUT', 'A', 'BUTTON']).toContain(focused);

            // Type email
            await page.keyboard.type('test@example.com');

            // Tab to password
            await page.keyboard.press('Tab');
            await page.keyboard.type('password123');

            // Tab to submit button and press Enter
            await page.keyboard.press('Tab');
            focused = await page.evaluate(() => document.activeElement?.tagName);
            expect(['BUTTON', 'INPUT']).toContain(focused);
        });

        test('should navigate dashboard with keyboard', async ({ page }) => {
            await page.goto(`${FRONTEND_URL}/dashboard`);

            // Should be able to tab through elements
            for (let i = 0; i < 10; i++) {
                await page.keyboard.press('Tab');
                const focused = await page.evaluate(() => {
                    const el = document.activeElement;
                    return {
                        tag: el?.tagName,
                        focusable: el?.getAttribute('tabindex') !== '-1',
                    };
                });

                // Focused element should be interactive or explicitly focusable
                if (focused.tag !== 'BODY') {
                    expect(['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'DIV']).toContain(focused.tag);
                }
            }
        });

        test('should navigate contract analyzer with keyboard', async ({ page }) => {
            await page.goto(`${FRONTEND_URL}/analyze`);

            // Focus contract code textarea
            await page.keyboard.press('Tab');

            // Type contract code
            const sampleContract = 'pragma solidity ^0.8.0; contract Test {}';
            await page.keyboard.type(sampleContract);

            // Navigate to submit button
            for (let i = 0; i < 5; i++) {
                await page.keyboard.press('Tab');
            }

            const focused = await page.evaluate(() => document.activeElement?.tagName);
            expect(['BUTTON', 'INPUT']).toContain(focused);
        });
    });

    test.describe('Screen Reader Support', () => {
        test('should have proper ARIA labels on forms', async ({ page }) => {
            await page.goto(`${FRONTEND_URL}/login`);

            // Check for ARIA labels
            const emailInput = page.locator('input[type="email"]').first();
            const passwordInput = page.locator('input[type="password"]').first();

            // Inputs should have labels or aria-label
            const emailLabel = await emailInput.getAttribute('aria-label') ||
                await page.locator('label[for*="email"]').count();
            const passwordLabel = await passwordInput.getAttribute('aria-label') ||
                await page.locator('label[for*="password"]').count();

            expect(emailLabel).toBeTruthy();
            expect(passwordLabel).toBeTruthy();
        });

        test('should have proper heading hierarchy', async ({ page }) => {
            await page.goto(FRONTEND_URL);

            // Get all headings
            const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (elements) =>
                elements.map((el) => ({
                    level: parseInt(el.tagName.substring(1)),
                    text: el.textContent,
                }))
            );

            // Should have at least one h1
            const h1Count = headings.filter((h) => h.level === 1).length;
            expect(h1Count).toBeGreaterThanOrEqual(1);

            // Heading levels should not skip (e.g., h1 -> h3)
            for (let i = 1; i < headings.length; i++) {
                const diff = headings[i].level - headings[i - 1].level;
                expect(diff).toBeLessThanOrEqual(1);
            }
        });

        test('should have alt text for images', async ({ page }) => {
            await page.goto(FRONTEND_URL);

            const images = await page.$$('img');
            for (const img of images) {
                const alt = await img.getAttribute('alt');
                const role = await img.getAttribute('role');

                // Image should have alt text or role="presentation" if decorative
                expect(alt !== null || role === 'presentation').toBe(true);
            }
        });

        test('should have proper button labels', async ({ page }) => {
            await page.goto(FRONTEND_URL);

            const buttons = await page.$$('button');
            for (const button of buttons) {
                const text = await button.textContent();
                const ariaLabel = await button.getAttribute('aria-label');
                const ariaLabelledby = await button.getAttribute('aria-labelledby');

                // Button should have text, aria-label, or aria-labelledby
                const hasLabel = (text && text.trim().length > 0) || ariaLabel || ariaLabelledby;
                expect(hasLabel).toBe(true);
            }
        });
    });

    test.describe('Color Contrast', () => {
        test('should have sufficient color contrast', async ({ page }) => {
            await page.goto(FRONTEND_URL);

            const accessibilityScanResults = await new AxeBuilder({ page })
                .withTags(['wcag2aa'])
                .include(['color-contrast'])
                .analyze();

            expect(accessibilityScanResults.violations).toEqual([]);
        });
    });

    test.describe('Focus Management', () => {
        test('should have visible focus indicators', async ({ page }) => {
            await page.goto(`${FRONTEND_URL}/login`);

            // Tab to first interactive element
            await page.keyboard.press('Tab');

            // Check if focused element has visible outline
            const focusVisible = await page.evaluate(() => {
                const el = document.activeElement as HTMLElement;
                if (!el) return false;

                const styles = window.getComputedStyle(el);
                return (
                    styles.outline !== 'none' ||
                    styles.outlineWidth !== '0px' ||
                    styles.boxShadow.includes('rgba') ||
                    el.classList.contains('focus')
                );
            });

            expect(focusVisible).toBe(true);
        });

        test('should trap focus in modals', async ({ page }) => {
            await page.goto(FRONTEND_URL);

            // If there's a modal trigger, test focus trap
            const modalTrigger = page.locator('[data-testid="modal-trigger"]').first();
            if (await modalTrigger.count() > 0) {
                await modalTrigger.click();

                // Tab through modal
                for (let i = 0; i < 20; i++) {
                    await page.keyboard.press('Tab');

                    const focusedEl = await page.evaluate(() => {
                        const el = document.activeElement;
                        return el?.closest('[role="dialog"]') !== null;
                    });

                    // Focus should stay within modal
                    expect(focusedEl).toBe(true);
                }
            }
        });
    });

    test.describe('Form Accessibility', () => {
        test('should show validation errors accessibly', async ({ page }) => {
            await page.goto(`${FRONTEND_URL}/register`);

            // Submit form without filling fields
            await page.click('button[type="submit"]');
            await page.waitForTimeout(500);

            // Check for aria-invalid or error messages
            const invalidInputs = await page.$$('[aria-invalid="true"]');
            const errorMessages = await page.$$('[role="alert"], .error-message');

            // Should have either invalid inputs or error messages
            expect(invalidInputs.length > 0 || errorMessages.length > 0).toBe(true);
        });

        test('should have proper form field relationships', async ({ page }) => {
            await page.goto(`${FRONTEND_URL}/register`);

            // Check inputs have associated labels
            const inputs = await page.$$('input[type="text"], input[type="email"], input[type="password"]');

            for (const input of inputs) {
                const id = await input.getAttribute('id');
                const ariaLabel = await input.getAttribute('aria-label');
                const ariaLabelledby = await input.getAttribute('aria-labelledby');

                if (id) {
                    const labelFor = await page.$(`label[for="${id}"]`);
                    const hasLabel = labelFor || ariaLabel || ariaLabelledby;
                    expect(hasLabel).toBeTruthy();
                } else {
                    expect(ariaLabel || ariaLabelledby).toBeTruthy();
                }
            }
        });
    });

    test.describe('Responsive Accessibility', () => {
        test('should be accessible on mobile viewport', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
            await page.goto(FRONTEND_URL);

            const accessibilityScanResults = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa'])
                .analyze();

            expect(accessibilityScanResults.violations).toEqual([]);
        });

        test('should be accessible on tablet viewport', async ({ page }) => {
            await page.setViewportSize({ width: 768, height: 1024 }); // iPad
            await page.goto(FRONTEND_URL);

            const accessibilityScanResults = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa'])
                .analyze();

            expect(accessibilityScanResults.violations).toEqual([]);
        });
    });
});
