import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const overviewSource = await readFile(new URL("./page.tsx", import.meta.url), "utf8");
const spacesSource = await readFile(new URL("./spaces/page.tsx", import.meta.url), "utf8");
const projectSituationSource = await readFile(
  new URL("../../components/dashboard/project-situation.tsx", import.meta.url),
  "utf8",
);
const dashboardHookSource = await readFile(
  new URL("../../hooks/use-dashboard-overview.ts", import.meta.url),
  "utf8",
);

test("系统总览只保留指标和全宽智能体星图", () => {
  assert.doesNotMatch(overviewSource, /新建项目|编辑项目|删除项目/);
  assert.doesNotMatch(overviewSource, /PersonalWorkbench|LoopEfficiency|RecentActivity/);
  assert.doesNotMatch(overviewSource, /QualityBrief|ProjectSituation|全局项目战情预览/);
  assert.match(overviewSource, /<AgentConstellation stages=\{overview\.agent_stages\} projects=\{overview\.projects\}/);
});

test("项目空间承接项目管理和跨项目运营处置内容", () => {
  assert.match(spacesSource, /新建项目/);
  assert.match(spacesSource, /onEdit=\{openEdit\}/);
  assert.match(spacesSource, /onDelete=\{openDelete\}/);
  assert.match(spacesSource, /PersonalWorkbench/);
  assert.match(spacesSource, /LoopEfficiency/);
  assert.match(spacesSource, /RecentActivity/);
  assert.match(spacesSource, /QualityBrief/);
});

test("项目战情表保留进入项目功能并支持总览限量预览", () => {
  assert.match(projectSituationSource, /href=\{`\/projects\/\$\{project\.identifier\}`\}/);
  assert.match(projectSituationSource, /limit\?: number/);
  assert.match(projectSituationSource, /text-center/);
});

test("全局数据页面等待认证恢复后再加载仪表盘", () => {
  assert.match(dashboardHookSource, /useAuth/);
  assert.match(dashboardHookSource, /authLoading/);
  assert.match(dashboardHookSource, /isAuthenticated/);
});
