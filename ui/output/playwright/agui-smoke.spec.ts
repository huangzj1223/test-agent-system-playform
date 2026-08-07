import { test, expect } from '@playwright/test';

test('agui chat sends a tool message', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000');
  await page.evaluate(({ token, refresh }) => {
    localStorage.setItem('auth_token', token || '');
    localStorage.setItem('auth_refresh_token', refresh || '');
  }, { token: process.env.AGUI_TOKEN, refresh: process.env.AGUI_REFRESH });
  await page.goto('http://127.0.0.1:3000/chat');
  await expect(page.getByText('AI 对话')).toBeVisible();
  await page.getByPlaceholder('输入消息').fill('/tool echo ui');
  await page.getByRole('button').last().click();
  await expect(page.getByText('TOOL_RESULT')).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('工具 echo 执行完成：ui')).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: 'output/playwright/agui-chat-stream.png', fullPage: true });
});
