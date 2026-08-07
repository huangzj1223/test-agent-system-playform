import { test } from '@playwright/test';

test('debug tools page', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', (msg) => logs.push(`console:${msg.type()}:${msg.text()}`));
  page.on('pageerror', (err) => logs.push(`pageerror:${err.message}`));
  await page.goto('http://127.0.0.1:3000');
  await page.evaluate(({ token, refresh }) => {
    localStorage.setItem('auth_token', token || '');
    localStorage.setItem('auth_refresh_token', refresh || '');
  }, { token: process.env.TOOLS_TOKEN, refresh: process.env.TOOLS_REFRESH });
  await page.goto('http://127.0.0.1:3000/tools');
  await page.waitForTimeout(8000);
  const bodyText = await page.locator('body').innerText().catch(() => 'NO_BODY');
  await page.screenshot({ path: 'output/playwright/tools-debug-spec.png', fullPage: true });
  console.log(JSON.stringify({ url: page.url(), bodyText, logs }, null, 2));
});
