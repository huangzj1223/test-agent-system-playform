import { test, expect } from '@playwright/test';

test('skills page routes intent', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000');
  await page.evaluate(({ token, refresh }) => {
    localStorage.setItem('auth_token', token || '');
    localStorage.setItem('auth_refresh_token', refresh || '');
  }, { token: process.env.SKILLS_TOKEN, refresh: process.env.SKILLS_REFRESH });
  await page.goto('http://127.0.0.1:3000/skills');
  await expect(page.getByText('技能管理')).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('接口测试技能')).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: '路由' }).click();
  await expect(page.getByText('接口测试技能').first()).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: 'output/playwright/skills-page.png', fullPage: true });
});
