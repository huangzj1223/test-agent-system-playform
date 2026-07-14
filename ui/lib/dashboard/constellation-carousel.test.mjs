import test from "node:test";
import assert from "node:assert/strict";

import {
  advanceCarousel,
  buildCarouselTransition,
  buildConstellationViews,
  clipConnector,
} from "./constellation-carousel.ts";

const globalStages = [
  { key: "requirements", name: "需求解析", description: "全量需求", status: "ready", task_count: 4, issue_count: 0, href: "/projects", data_available: true },
  { key: "design", name: "测试设计", description: "全量用例", status: "ready", task_count: 8, issue_count: 0, href: "/projects", data_available: true },
];

const projects = [
  { identifier: "PR-1", name: "项目一", description: null, test_cases: 5, test_scripts: 3, test_runs: 2, running_tasks: 0, passed: 4, failed: 1, blocked: 0, pass_rate: 80, risk_level: "attention", last_activity_at: null },
  { identifier: "PR-2", name: "项目二", description: null, test_cases: 0, test_scripts: 0, test_runs: 0, running_tasks: 0, passed: 0, failed: 0, blocked: 0, pass_rate: null, risk_level: "no_data", last_activity_at: null },
];

test("星图序列默认以全量视图开头并包含所有项目", () => {
  const views = buildConstellationViews(globalStages, projects);

  assert.deepEqual(views.map((view) => view.key), ["all", "PR-1", "PR-2"]);
  assert.equal(views[0].title, "全部项目");
  assert.equal(views[1].title, "项目一");
  assert.equal(views[1].stages.length, 7);
});

test("空项目时只保留全量视图", () => {
  const views = buildConstellationViews(globalStages, []);

  assert.equal(views.length, 1);
  assert.equal(views[0].key, "all");
});

test("阶段播放完毕后切换到下一张星图并回到首阶段", () => {
  assert.deepEqual(
    advanceCarousel({ viewIndex: 0, stageIndex: 5 }, 3, 7),
    { viewIndex: 0, stageIndex: 6 },
  );
  assert.deepEqual(
    advanceCarousel({ viewIndex: 0, stageIndex: 6 }, 3, 7),
    { viewIndex: 1, stageIndex: 0 },
  );
  assert.deepEqual(
    advanceCarousel({ viewIndex: 2, stageIndex: 6 }, 3, 7),
    { viewIndex: 0, stageIndex: 0 },
  );
});

test("星图连线在节点边缘裁剪，为箭头保留可见空间", () => {
  assert.deepEqual(
    clipConnector({ x: 100, y: 100 }, { x: 300, y: 100 }),
    { x1: 171, y1: 100, x2: 229, y2: 100 },
  );
  assert.deepEqual(
    clipConnector({ x: 100, y: 100 }, { x: 100, y: 300 }),
    { x1: 100, y1: 135, x2: 100, y2: 265 },
  );
});

test("阶段交接先标记当前连线，再给出下一个阶段位置", () => {
  assert.deepEqual(
    buildCarouselTransition({ viewIndex: 0, stageIndex: 2 }, 3, 7),
    {
      linkIndex: 2,
      target: { viewIndex: 0, stageIndex: 3 },
    },
  );
});

test("最后阶段交接沿回环连线进入下一个项目", () => {
  assert.deepEqual(
    buildCarouselTransition({ viewIndex: 1, stageIndex: 6 }, 3, 7),
    {
      linkIndex: 6,
      target: { viewIndex: 2, stageIndex: 0 },
    },
  );
});
