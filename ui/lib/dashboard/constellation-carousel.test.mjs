import test from "node:test";
import assert from "node:assert/strict";
import * as constellationCarousel from "./constellation-carousel.ts";

import {
  GALAXY_CYCLE_DURATION_MS,
  GALAXY_ORBIT_GEOMETRY,
  GALAXY_SPATIAL_CONFIG,
  GALAXY_STATIC_LAYOUT,
  GALAXY_STAGE_KEYS,
  advanceOrbitRawPhase,
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
  computeStaticOrbitNode,
  easeOrbitPhase,
  getFocusedStageIndex,
  getFrontStageSafeArea,
  getForwardPhaseTarget,
  getGalaxyRenderBudget,
  getOrbitZIndex,
  getStaticHudClearance,
  getStaticStageLevel,
  shouldAdvanceOrbit,
  projectAccretionPoint,
} from "./constellation-carousel.ts";

const getStageVisualLevel = constellationCarousel.getStageVisualLevel;
const getStageOrbDiameter = constellationCarousel.getStageOrbDiameter;

test("galaxy spatial config keeps orbit geometry centered on the shared runtime focal point", () => {
  assert.equal(GALAXY_SPATIAL_CONFIG.viewBox.width, GALAXY_ORBIT_GEOMETRY.viewBoxWidth);
  assert.equal(GALAXY_SPATIAL_CONFIG.viewBox.height, GALAXY_ORBIT_GEOMETRY.viewBoxHeight);
  assert.equal(GALAXY_SPATIAL_CONFIG.projectCoreDiameter, 112);
  assert.equal(GALAXY_SPATIAL_CONFIG.projectCoreDiameter / 140, 0.8);
  assert.equal(GALAXY_SPATIAL_CONFIG.foregroundAccretionOpacity, 0.14);
  assert.equal(GALAXY_SPATIAL_CONFIG.backgroundScale, 1.01);
  assert.equal(GALAXY_SPATIAL_CONFIG.foregroundFlowZIndex, 119);
  assert.deepEqual(computeOrbitNode(0, 0, 0, "3d"), {
    x: 0,
    y: 0,
    angle: Math.PI / 2,
    depth: 1,
    scale: 1,
    opacity: 1,
    blur: 0,
    brightness: 1,
    zIndex: 1,
  });
});

test("stage depth stays below the dedicated foreground flow layer", () => {
  const nodes = GALAXY_STAGE_KEYS.map((_, index) => computeOrbitNode(index, 0, 7, "3d"));
  const far = nodes.reduce((current, candidate) => candidate.depth < current.depth ? candidate : current);
  const near = nodes.reduce((current, candidate) => candidate.depth > current.depth ? candidate : current);

  assert.ok(far.zIndex < 72);
  assert.ok(near.zIndex < GALAXY_SPATIAL_CONFIG.foregroundFlowZIndex);
});

test("3D depth bands keep far nodes well behind the overlay and near nodes well ahead", () => {
  const samples = [];
  for (let phaseStep = 0; phaseStep < 280; phaseStep += 1) {
    const phase = phaseStep / 40;
    for (let index = 0; index < 7; index += 1) {
      samples.push(computeOrbitNode(index, phase, 7, "3d"));
    }
  }

  const far = samples.filter((node) => getStageVisualLevel(node.depth) === "far");
  const near = samples.filter((node) => getStageVisualLevel(node.depth) === "near");
  const farRange = [Math.min(...far.map((node) => node.zIndex)), Math.max(...far.map((node) => node.zIndex))];
  const nearRange = [Math.min(...near.map((node) => node.zIndex)), Math.max(...near.map((node) => node.zIndex))];

  assert.deepEqual(farRange, [16, 36]);
  assert.deepEqual(nearRange, [91, 118]);
  assert.deepEqual(
    [getOrbitZIndex(0, "3d"), getOrbitZIndex(0.3199, "3d")],
    [16, 36],
  );
  assert.deepEqual(
    [getOrbitZIndex(0.68, "3d"), getOrbitZIndex(1, "3d")],
    [90, 118],
  );
  assert.ok(farRange[1] < 72);
  assert.ok(nearRange[1] < GALAXY_SPATIAL_CONFIG.foregroundFlowZIndex);
});

test("Phase 2 static layout keeps all seven stages on one ordered ellipse", () => {
  const nodes = GALAXY_STAGE_KEYS.map((_, index) => computeStaticOrbitNode(index, 7, "3d"));
  const expectedAngles = [90, 141.4286, 192.8571, 244.2857, 295.7143, 347.1429, 398.5714];

  assert.equal(nodes.length, 7);
  nodes.forEach((node, index) => {
    assert.ok(Math.abs((node.angle * 180) / Math.PI - expectedAngles[index]) < 0.001);
    assert.ok(Math.abs((node.x / GALAXY_ORBIT_GEOMETRY.radiusX) ** 2
      + (node.y / GALAXY_ORBIT_GEOMETRY.radiusY) ** 2 - 1) < 0.000001);
  });
  assert.equal(nodes[0].y, GALAXY_ORBIT_GEOMETRY.radiusY);
  assert.ok(nodes[3].y < 0);
  assert.ok(nodes[4].y < 0);
});

test("Phase 2 static depth levels are ordered and focus never exceeds 1.14", () => {
  const nodes = GALAXY_STAGE_KEYS.map((_, index) => computeStaticOrbitNode(index, 7, "3d"));
  const scales = Object.fromEntries(nodes.map((node, index) => [getStaticStageLevel(index, 7), node.scale]));

  assert.equal(GALAXY_STATIC_LAYOUT.enabled, true);
  assert.equal(GALAXY_STATIC_LAYOUT.phase, 0);
  assert.equal(getStaticStageLevel(0, 7), "focus");
  assert.equal(getStaticStageLevel(3, 7), "deep");
  assert.equal(getStaticStageLevel(2, 7), "middle");
  assert.equal(getStaticStageLevel(1, 7), "near");
  assert.ok(scales.deep < scales.middle);
  assert.ok(scales.middle < scales.near);
  assert.ok(scales.near <= scales.focus);
  assert.ok(scales.focus <= 1.14);
});

test("Phase 2 static focus keeps at least 18px above the frozen HUD at both desktop targets", () => {
  assert.ok(getStaticHudClearance(640, 218.2) >= 18);
  assert.ok(getStaticHudClearance(640, 268.41) >= 18);
});

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
  assert.equal(easeOrbitPhase(0.55), 0);
  assert.equal(easeOrbitPhase(1.55), 1);
  assert.ok(easeOrbitPhase(0.6) > 0);
  assert.ok(easeOrbitPhase(0.6) < 0.08);
  assert.ok(easeOrbitPhase(0.8) > 0.5);
  assert.ok(easeOrbitPhase(0.8) < 0.7);
  assert.equal(easeOrbitPhase(0.99) < 1, true);
});

test("焦点索引与点击后的顺时针目标保持业务顺序", () => {
  assert.equal(getFocusedStageIndex(4.55, 7), 5);
  assert.equal(getFocusedStageIndex(6.7, 7), 0);
  assert.equal(getForwardPhaseTarget(5.2, 1, 7), 8);
  assert.equal(getForwardPhaseTarget(0.2, 4, 7), 4);
});

test("Phase B：当前焦点位于椭圆下方最近端并具有最强层次", () => {
  const focus = computeOrbitNode(0, 0, 7, "3d");
  const farCandidates = [
    computeOrbitNode(3, 0, 7, "3d"),
    computeOrbitNode(4, 0, 7, "3d"),
  ];
  const far = farCandidates.reduce((current, candidate) => (
    candidate.depth < current.depth ? candidate : current
  ));

  assert.ok(Math.abs(focus.x) < 1e-10);
  assert.equal(focus.y, GALAXY_ORBIT_GEOMETRY.radiusY);
  assert.equal(focus.depth, 1);
  assert.ok(Math.abs(focus.scale - 1.16) < 1e-10);
  assert.equal(focus.opacity, 1);
  assert.equal(focus.blur, 0);
  assert.equal(focus.brightness, 1.05);

  assert.ok(far.y < 70, `最远节点应位于椭圆上方，实际 y=${far.y}`);
  assert.ok(far.scale < 0.35);
  assert.ok(far.opacity >= 0.32 && far.opacity <= 0.48);
  assert.ok(far.blur <= 0.6);
  assert.ok(far.brightness >= 0.62);
  assert.ok(focus.zIndex > far.zIndex);
});

test("阶段视觉级别在 0.32 和 0.68 边界严格切换", () => {
  assert.equal(typeof getStageVisualLevel, "function");
  assert.equal(getStageVisualLevel(0), "far");
  assert.equal(getStageVisualLevel(0.319999), "far");
  assert.equal(getStageVisualLevel(0.32), "middle");
  assert.equal(getStageVisualLevel(0.679999), "middle");
  assert.equal(getStageVisualLevel(0.68), "near");
  assert.equal(getStageVisualLevel(1), "near");
});

test("3D 轨道最近节点显著大于最远节点且景深参数受控", () => {
  const nodes = GALAXY_STAGE_KEYS.map((_, index) => computeOrbitNode(index, 0, 7, "3d"));
  const near = nodes.reduce((current, candidate) => candidate.depth > current.depth ? candidate : current);
  const far = nodes.reduce((current, candidate) => candidate.depth < current.depth ? candidate : current);

  assert.ok(far.scale < 0.35, `最远 scale=${far.scale}`);
  assert.ok(near.scale > 1.1, `最近 scale=${near.scale}`);
  assert.ok(far.opacity >= 0.28 && far.opacity <= 0.48, `最远 opacity=${far.opacity}`);
  assert.ok(far.blur <= 0.8, `最远 blur=${far.blur}`);
  assert.ok(near.zIndex > far.zIndex + 80);
});

test("三级星核目标直径在各自 LOD 区间保持要求范围", () => {
  assert.equal(typeof getStageOrbDiameter, "function");
  assert.equal(getStageOrbDiameter(0), 12);
  assert.ok(getStageOrbDiameter(0.319999) <= 16);
  assert.equal(getStageOrbDiameter(0.32), 30);
  assert.ok(getStageOrbDiameter(0.679999) <= 48);
  assert.equal(getStageOrbDiameter(0.68), 63);
  assert.equal(getStageOrbDiameter(1), 79);
});

test("前景节点在标准银河视口中保留至少 88px 的详情安全区域", () => {
  assert.equal(GALAXY_ORBIT_GEOMETRY.radiusY, 100);
  assert.ok(getFrontStageSafeArea(474, 130) >= 88);
});

test("银河图片在不同宽屏比例下都把固有黑洞焦点映射到统一核心", () => {
  assert.equal("GALAXY_CORE" in constellationCarousel, false);
  assert.equal("GALAXY_ARTWORK" in constellationCarousel, false);
  assert.equal("computeGalaxyObjectPosition" in constellationCarousel, false);
});

test("far、middle、near 的空间尺度严格递增且 near 不超过 1.18", () => {
  const far = computeOrbitNode(0, 3.5, 7, "3d");
  const middle = computeOrbitNode(0, 2.15, 7, "3d");
  const near = computeOrbitNode(0, 0, 7, "3d");

  assert.equal(getStageVisualLevel(far.depth), "far");
  assert.equal(getStageVisualLevel(middle.depth), "middle");
  assert.equal(getStageVisualLevel(near.depth), "near");
  assert.ok(far.scale < middle.scale);
  assert.ok(middle.scale < near.scale);
  assert.ok(near.scale <= 1.18);
  assert.ok(far.opacity >= 0.32);
  assert.ok(far.brightness >= 0.62);
  assert.ok(far.blur <= 0.6);
});

test("暂停与 reduced-motion 都不会推进 RAF phase", () => {
  const state = {
    userPaused: false,
    hovered: false,
    interactionPaused: false,
    pageVisible: true,
    reducedMotion: false,
  };

  assert.equal(shouldAdvanceOrbit(state), true);
  assert.equal(shouldAdvanceOrbit({ ...state, userPaused: true }), false);
  assert.equal(shouldAdvanceOrbit({ ...state, reducedMotion: true }), false);
  assert.equal(advanceOrbitRawPhase(2.4, 1000, 7, true), 2.4);
  assert.ok(advanceOrbitRawPhase(2.4, 1000, 7, false) > 2.4);
  assert.equal(GALAXY_CYCLE_DURATION_MS, 16_000);
});

test("Phase B：phase 从 0 到 1 时焦点按业务顺序切换到测试设计", () => {
  const requirementsAtStart = computeOrbitNode(0, 0, 7, "3d");
  const designAtStart = computeOrbitNode(1, 0, 7, "3d");
  const requirementsAtNext = computeOrbitNode(0, 1, 7, "3d");
  const designAtNext = computeOrbitNode(1, 1, 7, "3d");

  assert.equal(requirementsAtStart.depth, 1);
  assert.ok(requirementsAtStart.depth > designAtStart.depth);
  assert.equal(designAtNext.depth, 1);
  assert.equal(designAtNext.y, GALAXY_ORBIT_GEOMETRY.radiusY);
  assert.ok(designAtNext.depth > requirementsAtNext.depth);
  assert.deepEqual(GALAXY_STAGE_KEYS, [
    "requirements",
    "design",
    "generation",
    "execution",
    "analysis",
    "repair",
    "verification",
  ]);
});

test("Phase B：2D 模式保留统一轨道坐标但取消景深模糊", () => {
  const spatial = computeOrbitNode(5, 2.25, 7, "3d");
  const flat = computeOrbitNode(5, 2.25, 7, "2d");

  assert.equal(flat.x, spatial.x);
  assert.equal(flat.y, spatial.y);
  assert.equal(flat.angle, spatial.angle);
  assert.equal(flat.depth, spatial.depth);
  assert.equal(flat.blur, 0);
  assert.ok(flat.scale >= 0.86 && flat.scale <= 1);
  assert.ok(flat.opacity >= 0.68 && flat.opacity <= 1);
});

test("Phase B：轨道随 phase 推进让下一阶段沿正向路径进入前景", () => {
  const start = computeOrbitNode(0, 0, 7, "3d");
  const later = computeOrbitNode(0, 0.1, 7, "3d");
  const startAngle = Math.atan2(start.y, start.x);
  const laterAngle = Math.atan2(later.y, later.x);
  const forwardDelta = ((startAngle - laterAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

  assert.ok(forwardDelta > 0);
  assert.ok(forwardDelta < Math.PI / 2);
});

test("阶段箭头沿椭圆轨道连接相邻节点而不经过中心", () => {
  const arc = buildOrbitArc(0, 0, 7);

  assert.match(arc.path, /^M -?\d+(?:\.\d+)? -?\d+(?:\.\d+)? A /);
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

    // 椭圆左右窄边的相邻节点屏幕间距不足 144px，断口必须在中点前止住，
    // 因此允许裁剪函数将 72px 目标安全收敛到约 66px，避免首尾交叉。
    assert.ok(startGap >= 56 && startGap <= 80);
    assert.ok(endGap >= 56 && endGap <= 80);
  }
});

test("Phase C：每段箭头按两端节点景深尺寸裁剪并沿业务正向保留可见弧段", () => {
  const scaleX = 1164 / 730;
  const scaleY = 474 / 360;
  const stageHalfWidth = 81;
  const stageHalfHeight = 36;
  const boundaryGap = (node) => {
    const tangentX = -275 * Math.sin(node.angle) * scaleX;
    const tangentY = GALAXY_ORBIT_GEOMETRY.radiusY * Math.cos(node.angle) * scaleY;
    const tangentLength = Math.hypot(tangentX, tangentY);
    const unitX = tangentX / tangentLength;
    const unitY = tangentY / tangentLength;
    const horizontalExit = Math.abs(unitX) > 0.0001
      ? (stageHalfWidth * node.scale) / Math.abs(unitX)
      : Number.POSITIVE_INFINITY;
    const verticalExit = Math.abs(unitY) > 0.0001
      ? (stageHalfHeight * node.scale) / Math.abs(unitY)
      : Number.POSITIVE_INFINITY;
    return Math.min(horizontalExit, verticalExit) + 7;
  };

  for (let index = 0; index < GALAXY_STAGE_KEYS.length; index += 1) {
    const nextIndex = (index + 1) % GALAXY_STAGE_KEYS.length;
    const from = computeOrbitNode(index, 0, GALAXY_STAGE_KEYS.length, "3d");
    const to = computeOrbitNode(nextIndex, 0, GALAXY_STAGE_KEYS.length, "3d");
    const startScreenGap = boundaryGap(from);
    const endScreenGap = boundaryGap(to);
    const arc = buildOrbitArc(index, 0, GALAXY_STAGE_KEYS.length, {
      scaleX,
      scaleY,
      startScreenGap,
      endScreenGap,
    });
    const actualStartGap = Math.hypot(
      (arc.start.x - from.x) * scaleX,
      (arc.start.y - from.y) * scaleY,
    );
    const actualEndGap = Math.hypot(
      (arc.end.x - to.x) * scaleX,
      (arc.end.y - to.y) * scaleY,
    );

    assert.ok(actualStartGap >= startScreenGap - 2, `${index} 起点未离开当前节点边缘`);
    assert.ok(actualEndGap >= endScreenGap - 2, `${index} 终点进入下一节点内部`);
    assert.ok(arc.endAngle > arc.startAngle, `${index} 箭头弧段必须沿业务正向`);
    assert.ok(arc.endAngle - arc.startAngle < (Math.PI * 2) / GALAXY_STAGE_KEYS.length);
    assert.equal(
      `${GALAXY_STAGE_KEYS[index]}->${GALAXY_STAGE_KEYS[nextIndex]}`,
      [
        "requirements->design",
        "design->generation",
        "generation->execution",
        "execution->analysis",
        "analysis->repair",
        "repair->verification",
        "verification->requirements",
      ][index],
    );
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
