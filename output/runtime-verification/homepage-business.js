async page => {
  const result = {};
  await page.goto("http://127.0.0.1:3000/projects");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "通知" }).click();
  await page.waitForURL("**/projects/agent-tasks");
  result.notificationRoute = page.url().endsWith("/projects/agent-tasks");

  await page.goto("http://127.0.0.1:3000/projects");
  await page.getByRole("button", { name: "帮助" }).click();
  await page.waitForURL("**/chat");
  result.helpRoute = page.url().endsWith("/chat");

  await page.goto("http://127.0.0.1:3000/projects");
  await page.locator("header button").last().click();
  result.realUserShown = !(await page.getByText("test@example.com", { exact: true }).isVisible().catch(() => false));
  result.modelSettingsShown = await page.getByRole("menuitem", { name: "模型设置" }).isVisible();
  await page.keyboard.press("Escape");

  const name = "Acceptance Project 20260715";
  const edited = "Acceptance Project Verified 20260715";
  await page.getByRole("button", { name: "新建项目" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("项目名称").fill(name);
  await dialog.getByLabel("项目描述").fill("Browser business acceptance");
  await dialog.getByRole("button", { name: "保存" }).click();
  await page.getByText(name, { exact: true }).waitFor({ timeout: 15000 });
  result.projectCreated = true;

  let row = page.getByText(name, { exact: true }).locator('xpath=ancestor::div[contains(@class,"lg:grid-cols")][1]');
  await row.getByRole("button", { name: "项目操作" }).click();
  await page.getByRole("menuitem", { name: "编辑项目" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("项目名称").fill(edited);
  await dialog.getByRole("button", { name: "保存" }).click();
  await page.getByText(edited, { exact: true }).waitFor({ timeout: 15000 });
  result.projectEdited = true;

  row = page.getByText(edited, { exact: true }).locator('xpath=ancestor::div[contains(@class,"lg:grid-cols")][1]');
  await row.getByRole("button", { name: "项目操作" }).click();
  await page.getByRole("menuitem", { name: "删除项目" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(/输入项目名称/).fill(edited);
  const deleteButton = dialog.getByRole("button", { name: "永久删除" });
  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === "永久删除");
    return button && !button.disabled;
  }, null, { timeout: 15000 });
  await deleteButton.click();
  await row.waitFor({ state: "detached", timeout: 15000 });
  result.projectDeleted = true;
  return result;
}
