import { expect, test } from "@playwright/test";

test.use({ channel: "chrome" });

test("conversation model, tool stream, and browser approval workflow", async ({ page }) => {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  if (!username || !password) throw new Error("E2E credentials are required");

  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedResponses: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      const location = message.location();
      consoleErrors.push(`${message.text()} ${location.url || "unknown"}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });

  await page.goto("http://127.0.0.1:3000/login");
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /登录/ }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));

  await page.goto("http://127.0.0.1:3000/chat");
  await expect(page.getByText("智能体对话", { exact: true }).first()).toBeVisible();
  await expect(page.getByLabel("选择模型")).toBeVisible();
  await expect(page.getByLabel("目标网址")).toBeVisible();
  await page.getByRole("button", { name: "新建会话" }).click();

  const composer = page.getByPlaceholder("输入测试需求");
  await composer.fill("/tool echo ceshi0701-ui-smoke");
  await page.getByRole("button", { name: "发送消息" }).click();
  await expect(page.getByText("ceshi0701-ui-smoke", { exact: true }).last()).toBeVisible({ timeout: 30_000 });

  await page.getByLabel("目标网址").fill("http://127.0.0.1:3000/login");
  await composer.fill("web inspect the login page");
  await page.getByRole("button", { name: "发送消息" }).click();
  await expect(page.getByText("等待审批", { exact: true }).last()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("L2", { exact: true }).last()).toBeVisible();
  await page.getByRole("button", { name: /拒绝/ }).click();
  await expect(page.getByText("已取消", { exact: true }).last()).toBeVisible({ timeout: 30_000 });

  await page.reload();
  await expect(page.getByText("已取消", { exact: true }).last()).toBeVisible({ timeout: 30_000 });
  await page.screenshot({ path: "../test-output/ceshi0701-chat-e2e.png", fullPage: true });

  expect({ pageErrors, consoleErrors, failedResponses }).toEqual({
    pageErrors: [],
    consoleErrors: [],
    failedResponses: [],
  });
});

test("conversation page has no mobile overflow or runtime errors", async ({ browser }) => {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  if (!username || !password) throw new Error("E2E credentials are required");

  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("http://127.0.0.1:3000/login");
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /登录/ }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  await page.goto("http://127.0.0.1:3000/chat");

  await expect(page.getByLabel("选择模型")).toBeVisible();
  await expect(page.getByPlaceholder("输入测试需求")).toBeVisible();
  await expect(page.getByText("已取消", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);
  expect(errors).toEqual([]);
  await page.screenshot({ path: "../test-output/ceshi0701-chat-mobile.png", fullPage: true });
  await page.close();
});
