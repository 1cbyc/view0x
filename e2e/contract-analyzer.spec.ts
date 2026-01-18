import { test, expect } from '@playwright/test';

test.describe('Contract Analyzer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the contract analyzer page', async ({ page }) => {
    await expect(page.getByText('Smart Contract Security Scanner')).toBeVisible();
    await expect(page.getByText('No login required to scan contracts')).toBeVisible();
  });

  test('should display code editor', async ({ page }) => {
    const editor = page.locator('.cm-editor');
    await expect(editor).toBeVisible();
  });

  test('should open examples dialog', async ({ page }) => {
    await page.getByRole('button', { name: /load example/i }).click();
    await expect(page.getByText('Contract Examples Library')).toBeVisible();
  });

  test('should load vulnerable wallet example', async ({ page }) => {
    await page.getByRole('button', { name: /load example/i }).click();
    await page.getByRole('tab', { name: /vulnerable/i }).click();
    await page.getByText('Vulnerable Wallet').click();
    
    // Wait for code to be loaded
    await page.waitForTimeout(500);
    
    // Check that code editor contains vulnerable wallet code
    const editorContent = await page.locator('.cm-content').textContent();
    expect(editorContent).toContain('VulnerableWallet');
    expect(editorContent).toContain('reentrancy');
  });

  test('should analyze a contract', async ({ page }) => {
    // Load example contract
    await page.getByRole('button', { name: /load example/i }).click();
    await page.getByRole('tab', { name: /vulnerable/i }).click();
    await page.getByText('Vulnerable Wallet').click();
    await page.waitForTimeout(500);

    // Click analyze button
    await page.getByRole('button', { name: /analyze contract/i }).click();

    // Wait for analysis to complete
    await page.waitForSelector('text=Analysis Summary', { timeout: 30000 });
    
    // Check that results are displayed
    await expect(page.getByText('Analysis Summary')).toBeVisible();
  });
});
