import test from "node:test";
import assert from "node:assert/strict";

import { priorityTones, productIconNames, statusIconNames, testCaseStateStatus } from "./icon-system.ts";

test("所有主要产品能力都有唯一图标映射", () => {
  const required = [
    "overview",
    "agents",
    "projects",
    "insights",
    "testCases",
    "apiTests",
    "webTests",
    "pentest",
    "testRuns",
    "testPlans",
    "reports",
    "analysis",
  ];
  assert.deepEqual(Object.keys(productIconNames), required);
  assert.equal(new Set(Object.values(productIconNames)).size, required.length);
});

test("状态图标覆盖完整生命周期", () => {
  assert.deepEqual(Object.keys(statusIconNames), [
    "running",
    "ready",
    "completed",
    "attention",
    "blocked",
    "idle",
    "unavailable",
  ]);
});

test("测试用例状态和优先级都有统一映射", () => {
  assert.deepEqual(Object.keys(testCaseStateStatus), ["new", "review_pending", "reviewed", "not_run", "passed", "failed", "blocked", "skipped"]);
  assert.deepEqual(Object.keys(priorityTones), ["critical", "high", "medium", "low"]);
});
