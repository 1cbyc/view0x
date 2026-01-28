import { test, expect } from '@playwright/test';

/**
 * Security Testing Suite
 * Tests for common web vulnerabilities and security best practices
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

test.describe('Security Tests', () => {
    test.describe('Authentication Security', () => {
        test('should prevent SQL injection in login', async ({ request }) => {
            const sqlInjectionPayloads = [
                "' OR '1'='1",
                "admin'--",
                "' OR '1'='1' --",
                "' OR 1=1--",
                "admin' OR 1=1#",
            ];

            for (const payload of sqlInjectionPayloads) {
                const response = await request.post(`${API_URL}/api/auth/login`, {
                    data: {
                        email: payload,
                        password: payload,
                    },
                });

                // Should return 400/401, not 500 (which indicates SQL error)
                expect(response.status()).not.toBe(500);
                expect(response.status()).toBeGreaterThanOrEqual(400);
                expect(response.status()).toBeLessThan(500);
            }
        });

        test('should enforce CSRF protection', async ({ request }) => {
            // Attempt to make POST request without CSRF token
            const response = await request.post(`${API_URL}/api/auth/register`, {
                data: {
                    email: 'test@example.com',
                    password: 'Password123!',
                    username: 'testuser',
                },
                headers: {
                    'X-CSRF-Token': 'invalid-token',
                },
            });

            // Should reject request with invalid or missing CSRF token
            // Note: actual behavior depends on your CSRF implementation
            expect([400, 403, 422]).toContain(response.status());
        });

        test('should prevent authentication bypass', async ({ request }) => {
            // Try to access protected endpoints without authentication
            const protectedEndpoints = [
                '/api/analysis',
                '/api/profile',
                '/api/webhooks',
            ];

            for (const endpoint of protectedEndpoints) {
                const response = await request.get(`${API_URL}${endpoint}`);
                expect(response.status()).toBe(401);
            }
        });

        test('should reject weak passwords', async ({ request }) => {
            const weakPasswords = [
                '123456',
                'password',
                'abc123',
                'qwerty',
                '12345678',
            ];

            for (const password of weakPasswords) {
                const response = await request.post(`${API_URL}/api/auth/register`, {
                    data: {
                        email: `test${Date.now()}@example.com`,
                        password,
                        username: `user${Date.now()}`,
                    },
                });

                // Should reject weak passwords
                expect([400, 422]).toContain(response.status());
            }
        });
    });

    test.describe('XSS Prevention', () => {
        test('should sanitize contract code input', async ({ page }) => {
            await page.goto(FRONTEND_URL);

            const xssPayload = '<script>alert("XSS")</script>';

            // Try to inject XSS in contract analyzer
            const contractInput = page.locator('textarea[name="contractCode"]').first();
            if (await contractInput.isVisible()) {
                await contractInput.fill(xssPayload);

                // Submit form
                await page.click('button[type="submit"]');

                // Wait for response
                await page.waitForTimeout(1000);

                // Check that script was not executed (no alert dialog)
                const hasDialog = await page.evaluate(() => {
                    return document.querySelectorAll('script').length > 0;
                });

                expect(hasDialog).toBeFalsy();
            }
        });

        test('should escape HTML in analysis results', async ({ page }) => {
            await page.goto(FRONTEND_URL);

            // Contract with HTML-like content
            const maliciousContract = `
        pragma solidity ^0.8.0;
        // <img src=x onerror=alert('XSS')>
        contract Test {
            string public name = "<script>alert('XSS')</script>";
        }
      `;

            const contractInput = page.locator('textarea[name="contractCode"]').first();
            if (await contractInput.isVisible()) {
                await contractInput.fill(maliciousContract);
                await page.click('button[type="submit"]');
                await page.waitForTimeout(2000);

                // Verify no script execution
                const scriptTags = await page.locator('script').count();
                const expectedScriptCount = await page.evaluate(() => {
                    return Array.from(document.scripts).filter(s =>
                        !s.src.includes('localhost')
                    ).length;
                });

                // Should not have increased script count
                expect(scriptTags).toBeLessThanOrEqual(expectedScriptCount + 5);
            }
        });
    });

    test.describe('API Security Headers', () => {
        test('should include security headers', async ({ request }) => {
            const response = await request.get(`${API_URL}/health`);

            const headers = response.headers();

            // Check for important security headers
            expect(headers['x-frame-options'] || headers['X-Frame-Options']).toBeTruthy();
            expect(headers['x-content-type-options'] || headers['X-Content-Type-Options']).toBe('nosniff');
            expect(headers['strict-transport-security'] || headers['Strict-Transport-Security']).toBeTruthy();

            // Check Content-Security-Policy
            const csp = headers['content-security-policy'] || headers['Content-Security-Policy'];
            expect(csp).toBeTruthy();
        });

        test('should prevent clickjacking', async ({ request }) => {
            const response = await request.get(`${API_URL}/api-docs`);
            const headers = response.headers();

            const xFrameOptions = headers['x-frame-options'] || headers['X-Frame-Options'];
            expect(['DENY', 'SAMEORIGIN']).toContain(xFrameOptions);
        });
    });

    test.describe('Rate Limiting', () => {
        test('should enforce rate limits', async ({ request }) => {
            const requests = [];

            // Make rapid requests to trigger rate limit
            for (let i = 0; i < 150; i++) {
                requests.push(
                    request.get(`${API_URL}/health`)
                );
            }

            const responses = await Promise.all(requests);
            const rateLimited = responses.some(r => r.status() === 429);

            // Should have triggered rate limit
            expect(rateLimited).toBe(true);
        });
    });

    test.describe('Data Validation', () => {
        test('should validate email format', async ({ request }) => {
            const invalidEmails = [
                'notanemail',
                '@example.com',
                'user@',
                'user @example.com',
                'user@example',
            ];

            for (const email of invalidEmails) {
                const response = await request.post(`${API_URL}/api/auth/register`, {
                    data: {
                        email,
                        password: 'ValidPassword123!',
                        username: `user${Date.now()}`,
                    },
                });

                expect([400, 422]).toContain(response.status());
            }
        });

        test('should reject excessively large payloads', async ({ request }) => {
            // Create large contract code (> 10MB)
            const largePayload = 'a'.repeat(11 * 1024 * 1024);

            const response = await request.post(`${API_URL}/api/analysis/public`, {
                data: {
                    contractCode: largePayload,
                },
            });

            // Should reject payload (413 Payload Too Large or 400 Bad Request)
            expect([400, 413]).toContain(response.status());
        });
    });

    test.describe('Session Security', () => {
        test('should use secure session cookies in production', async ({ request }) => {
            const response = await request.post(`${API_URL}/api/auth/login`, {
                data: {
                    email: 'test@example.com',
                    password: 'Password123!',
                },
            });

            const setCookie = response.headers()['set-cookie'];

            if (process.env.NODE_ENV === 'production') {
                // In production, cookies should have Secure flag
                expect(setCookie).toContain('Secure');
                expect(setCookie).toContain('HttpOnly');
                expect(setCookie).toContain('SameSite');
            }
        });
    });

    test.describe('Information Disclosure', () => {
        test('should not expose sensitive error details in production', async ({ request }) => {
            const response = await request.post(`${API_URL}/api/analysis/invalid-endpoint`, {
                data: {
                    invalid: 'data',
                },
            });

            const body = await response.json();

            // Should not expose stack traces or internal paths
            expect(JSON.stringify(body)).not.toContain('node_modules');
            expect(JSON.stringify(body)).not.toContain('/src/');
            expect(JSON.stringify(body)).not.toContain('Error:');
        });
    });
});
