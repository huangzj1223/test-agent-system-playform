import { expect, test } from "@playwright/test";

const appBase = "http://127.0.0.1:3000";
const apiBase = "http://127.0.0.1:8001/api/v2";

const headings = [
  { path: "/admin/models", name: "\u6a21\u578b\u914d\u7f6e\u7ba1\u7406", shot: "output/playwright/full-admin-models.png" },
  { path: "/chat", name: "AI \u5bf9\u8bdd", shot: "output/playwright/full-chat.png" },
  { path: "/memory", name: "\u8bb0\u5fc6\u4e2d\u5fc3", shot: "output/playwright/full-memory.png" },
  { path: "/tools", name: "\u5de5\u5177\u6cbb\u7406", shot: "output/playwright/full-tools.png" },
  { path: "/skills", name: "\u6280\u80fd\u7ba1\u7406", shot: "output/playwright/full-skills.png" },
  { path: "/admin/roles", name: "\u89d2\u8272\u7ba1\u7406", shot: "output/playwright/full-admin-roles.png" },
  { path: "/admin/menus", name: "\u83dc\u5355\u7ba1\u7406", shot: "output/playwright/full-admin-menus.png" },
  { path: "/admin/departments", name: "\u90e8\u95e8\u7ba1\u7406", shot: "output/playwright/full-admin-departments.png" },
];

test("new feature pages render and key interactions work", async ({ page, request }) => {
  test.setTimeout(120000);
  const login = await request.post(`${apiBase}/auth/login`, {
    data: { username: "admin", password: "123456" },
  });
  expect(login.ok()).toBeTruthy();
  const loginJson = await login.json();
  const token = loginJson.data.token;
  const refresh = loginJson.data.refresh_token;
  expect(token).toBeTruthy();

  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedApiResponses: string[] = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("response", (response) => {
    if (response.url().includes("/api/v2/") && response.status() >= 400) {
      failedApiResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.addInitScript(
    ({ token, refresh }) => {
      window.localStorage.setItem("auth_token", token);
      window.localStorage.setItem("auth_refresh_token", refresh);
    },
    { token, refresh },
  );

  for (const item of headings) {
    await page.goto(`${appBase}${item.path}`);
    await expect
      .poll(async () => (await page.locator("body").innerText()).includes(item.name), { timeout: 30000 })
      .toBeTruthy();
    await page.screenshot({ path: item.shot, fullPage: true });
  }

  await page.goto(`${appBase}/skills`);
  const routeResponse = page.waitForResponse((response) => response.url().includes("/agent-skills/route"));
  await page.locator("button").first().click();
  const routeJson = await (await routeResponse).json();
  expect(routeJson.data.name).toBe("api-test");

  await page.goto(`${appBase}/chat`);
  await page.locator("textarea").fill("/tool echo browser-e2e");
  await page.locator("textarea").locator("xpath=following::button[1]").click();
  await expect
    .poll(async () => (await page.locator("body").innerText()).includes("TOOL_RESULT"), { timeout: 30000 })
    .toBeTruthy();
  await expect
    .poll(async () => (await page.locator("body").innerText()).includes("browser-e2e"), { timeout: 30000 })
    .toBeTruthy();

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(failedApiResponses).toEqual([]);
});
