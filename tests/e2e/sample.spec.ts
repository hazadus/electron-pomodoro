import { test, expect } from '@playwright/test';

test('sample test to verify Playwright setup', async ({ page }) => {
  // Простой тест с заглушкой для проверки что Playwright работает
  await page.goto('data:text/html,<html><body><h1>Test Page</h1></body></html>');
  
  const heading = page.locator('h1');
  await expect(heading).toContainText('Test Page');
});