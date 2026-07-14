import test from "node:test";
import assert from "node:assert/strict";

import { refreshProjectSurfaces } from "./project-refresh.ts";

test("项目变更后依次刷新项目菜单和首页仪表盘", async () => {
  const calls = [];

  await refreshProjectSurfaces(
    async () => { calls.push("projects"); },
    async () => { calls.push("dashboard"); },
  );

  assert.deepEqual(calls, ["projects", "dashboard"]);
});

test("项目菜单刷新失败时不加载可能过期的仪表盘", async () => {
  let dashboardCalled = false;

  await assert.rejects(
    refreshProjectSurfaces(
      async () => { throw new Error("project refresh failed"); },
      async () => { dashboardCalled = true; },
    ),
    /project refresh failed/,
  );
  assert.equal(dashboardCalled, false);
});
