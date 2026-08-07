import { test } from '@playwright/test';

const pages = ['/admin/roles', '/admin/menus', '/admin/departments'];

test('debug rbac page errors', async ({ page }) => {
  const events: string[] = [];
  page.on('pageerror', (err) => events.push(`pageerror url=${page.url()} message=${err.message} stack=${err.stack}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') events.push(`console url=${page.url()} text=${msg.text()}`);
  });
  page.on('requestfailed', (req) => events.push(`requestfailed ${req.url()} ${req.failure()?.errorText}`));
  await page.goto('http://127.0.0.1:3000');
  await page.evaluate(({ token, refresh }) => {
    localStorage.setItem('auth_token', token || '');
    localStorage.setItem('auth_refresh_token', refresh || '');
  }, { token: process.env.RBAC_TOKEN, refresh: process.env.RBAC_REFRESH });
  for (const path of pages) {
    await page.goto(`http://127.0.0.1:3000${path}`);
    await page.waitForTimeout(3000);
  }
  console.log(JSON.stringify(events, null, 2));
});
