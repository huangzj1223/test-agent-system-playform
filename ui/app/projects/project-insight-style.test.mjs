import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./[projectId]/page.tsx", import.meta.url), "utf8");

test("项目洞察页复用系统配色和工作面板", () => {
  assert.doesNotMatch(source, /chart-5/);
  assert.doesNotMatch(source, /--card-bg/);
  assert.match(source, /data-testid="project-insight-page"/);
  assert.match(source, /workspace-panel/);
  assert.match(source, /btn-ai/);
});

test("洞察提示展示正常中文并可进入项目功能区", () => {
  assert.match(source, />端到端测试<\/Badge>/);
  assert.match(source, />单元测试<\/Badge>/);
  assert.match(source, />接口测试<\/Badge>/);
  assert.match(source, /id="workspace-modules"/);
  assert.match(source, /scrollIntoView/);
  assert.match(source, /onClick=\{resetDashboard\}/);
  assert.match(source, /htmlFor="insight-case-type"/);
  assert.match(source, /htmlFor="insight-run-state"/);
});
