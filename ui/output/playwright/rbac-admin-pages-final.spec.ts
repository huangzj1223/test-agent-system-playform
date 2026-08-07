import { test, expect } from '@playwright/test';

const pages = [
  { path: '/admin/roles', title: '角色管理', check: '菜单权限', shot: 'output/playwright/admin-roles-page.png' },
  { path: '/admin/menus', title: '菜单管理', check: '菜单树', shot: 'output/playwright/admin-menus-page.png' },
  { path: '/admin/departments', title: '部门管理', check: '岗位', shot: 'output/playwright/admin-departments-page.png' },
];

test('rbac admin pages render', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.addInitScript(({ token, refresh }) => {
    window.localStorage.setItem('auth_token', token || '');
    window.localStorage.setItem('auth_refresh_token', refresh || '');
  }, { token: process.env.RBAC_TOKEN, refresh: process.env.RBAC_REFRESH });

  for (const item of pages) {
    await page.goto(`http://127.0.0.1:3000${item.path}`);
    await expect(page.getByRole('heading', { name: item.title })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(item.check).first()).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: item.shot, fullPage: true });
  }

  expect(errors).toEqual([]);
});
