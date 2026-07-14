import test from "node:test";
import assert from "node:assert/strict";

import {
  extractProjectIdentifier,
  filterAgentTasks,
  filterProjectSpaces,
  getGlobalWorkspaceRoute,
} from "./global-workspace.ts";

test("全局工作区路由不会被识别为项目编号", () => {
  assert.equal(getGlobalWorkspaceRoute("/projects"), "overview");
  assert.equal(getGlobalWorkspaceRoute("/projects/agent-tasks"), "agent-tasks");
  assert.equal(getGlobalWorkspaceRoute("/projects/spaces"), "spaces");
  assert.equal(extractProjectIdentifier("/projects/agent-tasks"), null);
  assert.equal(extractProjectIdentifier("/projects/spaces"), null);
  assert.equal(extractProjectIdentifier("/projects/PR-8/test-runs"), "PR-8");
});

test("智能体任务可以按处置分组筛选", () => {
  const items = [
    { id: "1", group: "review" },
    { id: "2", group: "handle" },
    { id: "3", group: "watch" },
  ];

  assert.deepEqual(filterAgentTasks(items, "all").map((item) => item.id), ["1", "2", "3"]);
  assert.deepEqual(filterAgentTasks(items, "review").map((item) => item.id), ["1"]);
});

test("项目空间同时支持关键词和风险筛选", () => {
  const projects = [
    { identifier: "PR-1", name: "数据工厂", description: "主数据", risk_level: "attention" },
    { identifier: "PR-2", name: "模型中心", description: "推理服务", risk_level: "healthy" },
  ];

  assert.deepEqual(filterProjectSpaces(projects, "数据", "all").map((project) => project.identifier), ["PR-1"]);
  assert.deepEqual(filterProjectSpaces(projects, "", "healthy").map((project) => project.identifier), ["PR-2"]);
  assert.deepEqual(filterProjectSpaces(projects, "推理", "healthy").map((project) => project.identifier), ["PR-2"]);
});
