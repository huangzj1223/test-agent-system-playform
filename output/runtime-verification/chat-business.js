async page => {
  await page.goto("http://127.0.0.1:3000/chat");
  await page.waitForLoadState("networkidle");
  const selector = page.getByLabel("选择模型");
  const result = {
    defaultModelSelected: (await selector.textContent()).includes("System Preferred Text"),
  };

  await page.getByRole("button", { name: "新建会话" }).click();
  await page.waitForFunction(() => document.querySelectorAll("div.whitespace-pre-wrap").length === 0);
  const prompt = "你好，请简短回复你好";
  const messages = page.locator("div.whitespace-pre-wrap");
  const before = await messages.count();
  await page.getByPlaceholder("输入测试需求").fill(prompt);
  await page.getByRole("button", { name: "发送消息" }).click();
  await page.waitForFunction(
    ({ expected, userPrompt }) => {
      const nodes = [...document.querySelectorAll("div.whitespace-pre-wrap")];
      return nodes.length >= expected + 2 && nodes.some((node) => node.textContent?.trim() && node.textContent.trim() !== userPrompt);
    },
    { expected: before, userPrompt: prompt },
    { timeout: 90000 },
  );
  result.databaseChatReply = (await messages.count()) >= before + 2;
  return result;
}
