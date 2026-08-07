async page => {
  const result = { connections: {} };
  await page.goto("http://127.0.0.1:3000/admin/models");
  await page.waitForLoadState("networkidle");

  for (const providerName of ["System Preferred Text", "DeepSeek", "Doubao"]) {
    await page.getByRole("button").filter({ hasText: providerName }).first().click();
    const responsePromise = page.waitForResponse((response) =>
      response.url().includes("/model-config/providers/test-connection") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "连接测试" }).click();
    const response = await responsePromise;
    const body = await response.json();
    result.connections[providerName] = response.status() === 200 && body.data?.reachable === true;
  }

  await page.getByRole("button").filter({ hasText: "System Preferred Text" }).first().click();
  result.defaultTextBadge = await page.getByText("默认文本", { exact: true }).isVisible();
  await page.getByRole("button").filter({ hasText: "Doubao" }).first().click();
  result.defaultImageBadge = await page.getByText("默认多模态", { exact: true }).isVisible();

  return result;
}
