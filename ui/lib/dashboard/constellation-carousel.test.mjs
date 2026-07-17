import test from "node:test";
import assert from "node:assert/strict";

import {
  GALAXY_STAGE_KEYS,
  advanceCarousel,
  buildGalaxyDustSeeds,
  buildGalaxyClusterSeeds,
  buildGalaxyParticleSeeds,
  buildSatelliteGalaxySeeds,
  buildCarouselTransition,
  buildConstellationViews,
  buildOrbitArc,
  clipConnector,
  computeOrbitNode,
  easeOrbitPhase,
  getFocusedStageIndex,
  getForwardPhaseTarget,
  getGalaxyRenderBudget,
  projectAccretionPoint,
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

test("银河闭环严格保持七阶段业务顺序", () => {
  assert.deepEqual(GALAXY_STAGE_KEYS, [
    "requirements",
    "design",
    "generation",
    "execution",
    "analysis",
    "repair",
    "verification",
  ]);

  const views = buildConstellationViews(globalStages, projects);
  assert.equal(views[1].stages[0].name, "需求分析");
});

test("轨道相位先停留再平滑进入下一阶段", () => {
  assert.equal(easeOrbitPhase(0.2), 0);
  assert.equal(easeOrbitPhase(1.2), 1);
  assert.ok(easeOrbitPhase(0.72) > 0);
  assert.ok(easeOrbitPhase(0.72) < 1);
  assert.equal(easeOrbitPhase(0.99) < 1, true);
});

test("焦点索引与点击后的顺时针目标保持业务顺序", () => {
  assert.equal(getFocusedStageIndex(4.55, 7), 5);
  assert.equal(getFocusedStageIndex(6.7, 7), 0);
  assert.equal(getForwardPhaseTarget(5.2, 1, 7), 8);
  assert.equal(getForwardPhaseTarget(0.2, 4, 7), 4);
});

test("3D 节点具有明显远近层次且 2D 模式取消模糊", () => {
  const focus = computeOrbitNode(0, 0, 7, "3d");
  const far = computeOrbitNode(3, 0, 7, "3d");
  const flat = computeOrbitNode(3, 0, 7, "2d");

  assert.ok(focus.scale >= 1.15);
  assert.ok(far.scale <= 0.65);
  assert.ok(focus.opacity > far.opacity);
  assert.equal(focus.blur, 0);
  assert.equal(flat.blur, 0);
  assert.ok(flat.scale >= 0.84);
});

test("轨道坐标随相位沿屏幕顺时针方向推进", () => {
  const start = computeOrbitNode(0, 0, 7, "3d");
  const later = computeOrbitNode(0, 0.1, 7, "3d");
  const startAngle = Math.atan2(start.y - 183, start.x - 365);
  const laterAngle = Math.atan2(later.y - 183, later.x - 365);
  const clockwiseDelta = ((laterAngle - startAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

  assert.ok(clockwiseDelta > 0);
  assert.ok(clockwiseDelta < Math.PI / 2);
});

test("阶段箭头沿椭圆轨道连接相邻节点而不经过中心", () => {
  const arc = buildOrbitArc(0, 0, 7);

  assert.match(arc.path, /^M \d+(?:\.\d+)? \d+(?:\.\d+)? A /);
  assert.ok(arc.start.x !== arc.end.x);
  assert.ok(arc.start.y !== 183 || arc.end.y !== 183);
});

test("七段流转箭头与两端节点保持清晰断口", () => {
  const from = computeOrbitNode(0, 0, 7, "2d");
  const to = computeOrbitNode(1, 0, 7, "2d");
  const arc = buildOrbitArc(0, 0, 7);
  const startGap = Math.hypot(arc.start.x - from.x, arc.start.y - from.y);
  const endGap = Math.hypot(arc.end.x - to.x, arc.end.y - to.y);

  assert.ok(startGap >= 48);
  assert.ok(endGap >= 48);
});

test("全宽非等比视口下箭头仍按屏幕像素贴近节点边缘", () => {
  const scaleX = 1642 / 730;
  const scaleY = 474 / 360;
  for (let index = 0; index < 7; index += 1) {
    const from = computeOrbitNode(index, 0, 7, "2d");
    const to = computeOrbitNode((index + 1) % 7, 0, 7, "2d");
    const arc = buildOrbitArc(index, 0, 7, { scaleX, scaleY, screenGap: 72 });
    const startGap = Math.hypot((arc.start.x - from.x) * scaleX, (arc.start.y - from.y) * scaleY);
    const endGap = Math.hypot((arc.end.x - to.x) * scaleX, (arc.end.y - to.y) * scaleY);

    assert.ok(startGap >= 68 && startGap <= 80);
    assert.ok(endGap >= 68 && endGap <= 80);
  }
});

test("银河粒子种子确定、归一化且数量可控", () => {
  const seeds = buildGalaxyParticleSeeds(12);

  assert.equal(seeds.length, 12);
  assert.deepEqual(buildGalaxyParticleSeeds(12), seeds);
  assert.ok(seeds.every((item) => item.x >= 0 && item.x <= 1));
  assert.ok(seeds.every((item) => item.y >= 0 && item.y <= 1));
  assert.ok(seeds.every((item) => item.speed > 0));
});

test("深空恒星按距离形成近大亮、远小暗的透视层次", () => {
  const seeds = buildGalaxyParticleSeeds(160);
  const near = seeds.filter((item) => item.depth > 0.7);
  const far = seeds.filter((item) => item.depth < 0.3);
  const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

  assert.ok(seeds.every((item) => item.depth >= 0 && item.depth <= 1));
  assert.ok(near.length > 12);
  assert.ok(far.length > 12);
  assert.ok(average(near.map((item) => item.radius)) > average(far.map((item) => item.radius)) * 1.45);
  assert.ok(average(near.map((item) => item.alpha)) > average(far.map((item) => item.alpha)) * 1.35);
});

test("旋涡银河尘埃覆盖亮核、星臂和外围云带", () => {
  const seeds = buildGalaxyDustSeeds(180);

  assert.equal(seeds.length, 180);
  assert.deepEqual(buildGalaxyDustSeeds(180), seeds);
  assert.ok(seeds.some((item) => item.radius < 0.16));
  assert.ok(seeds.some((item) => item.radius > 0.78));
  assert.ok(new Set(seeds.map((item) => item.arm)).size >= 3);
  assert.ok(seeds.every((item) => item.spread >= -1 && item.spread <= 1));
  assert.ok(seeds.some((item) => item.hue >= 18 && item.hue <= 48));
  assert.ok(seeds.filter((item) => item.radius < 0.45).length / seeds.length > 0.45);
});

test("吸积盘投影让近侧物质更亮，并让内圈向黑洞明显下陷", () => {
  const near = projectAccretionPoint(0.55, Math.PI / 2, 0);
  const far = projectAccretionPoint(0.55, Math.PI * 1.5, 0);
  const inner = projectAccretionPoint(0.12, 0, 0);
  const outer = projectAccretionPoint(0.88, 0, 0);

  assert.ok(near.depth > far.depth);
  assert.ok(near.scale > far.scale);
  assert.ok(near.alpha > far.alpha);
  assert.ok(inner.funnel > outer.funnel * 8);
  assert.ok(inner.y > outer.y);
});

test("旋臂星团在主银河内形成不同尺度和色温的局部密集区", () => {
  const clusters = buildGalaxyClusterSeeds(14);

  assert.equal(clusters.length, 14);
  assert.deepEqual(buildGalaxyClusterSeeds(14), clusters);
  assert.ok(clusters.every((cluster) => cluster.radius > 0.12 && cluster.radius < 0.9));
  assert.ok(new Set(clusters.map((cluster) => cluster.count)).size >= 4);
  assert.ok(clusters.some((cluster) => cluster.hue < 80));
  assert.ok(clusters.some((cluster) => cluster.hue > 180));
});

test("外围伴星系分布在主银河边缘并保持大小层次", () => {
  const galaxies = buildSatelliteGalaxySeeds(6);

  assert.equal(galaxies.length, 6);
  assert.deepEqual(buildSatelliteGalaxySeeds(6), galaxies);
  assert.ok(galaxies.every((item) => item.x < 0.3 || item.x > 0.7 || item.y < 0.24 || item.y > 0.76));
  assert.ok(galaxies.every((item) => item.scale >= 0.035 && item.scale <= 0.1));
  assert.ok(new Set(galaxies.map((item) => item.flattening)).size >= 3);
});

test("Canvas 渲染预算限制粒子数量并降低慢背景刷新频率", () => {
  const desktop = getGalaxyRenderBudget(1120, 16);
  const mobile = getGalaxyRenderBudget(640, 8);

  assert.ok(desktop.dustCount <= 520);
  assert.ok(desktop.particleCount <= 64);
  assert.ok(desktop.frameIntervalMs >= 30);
  assert.ok(mobile.dustCount <= 220);
  assert.ok(mobile.particleCount <= 32);
});
