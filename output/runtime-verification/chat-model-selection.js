async page => {
  await page.goto("http://127.0.0.1:3000/chat");
  await page.waitForLoadState("networkidle");
  const result = {};

  for (const providerName of ["DeepSeek", "Doubao"]) {
    await page.getByRole("button", { name: "新建会话" }).click();
    await page.waitForFunction(() => document.querySelectorAll("div.whitespace-pre-wrap").length === 0);
    const selector = page.getByLabel("选择模型");
    await selector.click();
    await page.getByRole("option").filter({ hasText: providerName }).click();
    result[`${providerName}Selected`] = (await selector.textContent()).includes(providerName);

    const prompt = "Hello, reply OK";
    await page.getByPlaceholder("输入测试需求").fill(prompt);
    await page.getByRole("button", { name: "发送消息" }).click();
    await page.waitForFunction(
      (userPrompt) => {
        const nodes = [...document.querySelectorAll("div.whitespace-pre-wrap")];
        return nodes.length >= 2 && nodes.some((node) => node.textContent?.trim() && node.textContent.trim() !== userPrompt);
      },
      prompt,
      { timeout: 90000 },
    );
    result[`${providerName}Reply`] = (await page.locator("div.whitespace-pre-wrap").count()) >= 2;
  }
  return result;
}
