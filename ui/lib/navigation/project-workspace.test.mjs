import test from "node:test";
import assert from "node:assert/strict";

import {
  getSidebarProjectState,
  getProjectSection,
  getProjectSectionTabs,
  getWorkspaceMode,
  switchProjectPath,
} from "./project-workspace.ts";

test("workspace mode separates global, project, and platform routes", () => {
  assert.equal(getWorkspaceMode("/projects"), "global");
  assert.equal(getWorkspaceMode("/projects/spaces"), "global");
  assert.equal(getWorkspaceMode("/projects/agent-tasks"), "global");
  assert.equal(getWorkspaceMode("/chat"), "global");
  assert.equal(getWorkspaceMode("/projects/PR-3/api-tests"), "project");
  assert.equal(getWorkspaceMode("/admin/models"), "platform");
  assert.equal(getWorkspaceMode("/memory"), "platform");
});

test("project routes map to the expected business section", () => {
  assert.equal(getProjectSection("/projects/PR-3"), "overview");
  assert.equal(getProjectSection("/projects/PR-3/smart-test"), "smart-test");
  assert.equal(getProjectSection("/projects/PR-3/scenario-tests"), "design");
  assert.equal(getProjectSection("/projects/PR-3/test-runs/RUN-8"), "execution");
  assert.equal(getProjectSection("/projects/PR-3/fullstack-analysis"), "analysis");
  assert.equal(getProjectSection("/projects/PR-3/settings"), "settings");
});

test("switching projects preserves the current business route", () => {
  assert.equal(
    switchProjectPath("/projects/PR-3/api-tests", "PR-8"),
    "/projects/PR-8/api-tests",
  );
  assert.equal(
    switchProjectPath("/projects/PR-3/test-runs/RUN-2", "PR-8"),
    "/projects/PR-8/test-runs/RUN-2",
  );
  assert.equal(switchProjectPath("/projects", "PR-8"), "/projects/PR-8");
});

test("section tabs only expose routes backed by existing business pages", () => {
  assert.deepEqual(
    getProjectSectionTabs("design", "PR-3").map((tab) => tab.href),
    [
      "/projects/PR-3/test-cases",
      "/projects/PR-3/api-tests",
      "/projects/PR-3/scenario-tests",
      "/projects/PR-3/web-tests",
      "/projects/PR-3/pentest",
    ],
  );
  assert.deepEqual(
    getProjectSectionTabs("execution", "PR-3").map((tab) => tab.href),
    ["/projects/PR-3/test-plans", "/projects/PR-3/test-runs"],
  );
  assert.deepEqual(
    getProjectSectionTabs("analysis", "PR-3").map((tab) => tab.href),
    ["/projects/PR-3/reports", "/projects/PR-3/fullstack-analysis"],
  );
  assert.deepEqual(getProjectSectionTabs("overview", "PR-3"), []);
});

test("sidebar keeps the all-projects control hidden when every project fits", () => {
  const projects = Array.from({ length: 7 }, (_, index) => ({
    identifier: `PR-${index + 1}`,
  }));

  const state = getSidebarProjectState(projects, false);

  assert.equal(state.hasHiddenProjects, false);
  assert.deepEqual(state.visibleProjects, projects);
});

test("sidebar shows seven projects until the hidden projects are expanded", () => {
  const projects = Array.from({ length: 9 }, (_, index) => ({
    identifier: `PR-${index + 1}`,
  }));

  const collapsed = getSidebarProjectState(projects, false);
  const expanded = getSidebarProjectState(projects, true);

  assert.equal(collapsed.hasHiddenProjects, true);
  assert.equal(collapsed.hiddenProjectCount, 2);
  assert.deepEqual(collapsed.visibleProjects, projects.slice(0, 7));
  assert.deepEqual(expanded.visibleProjects, projects);
});
