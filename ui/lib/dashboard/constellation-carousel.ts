import type {
  DashboardAgentStage,
  DashboardProjectSituation,
} from "../api/dashboard";

export interface ConstellationView {
  key: string;
  title: string;
  stages: DashboardAgentStage[];
  project: DashboardProjectSituation | null;
}

export interface CarouselPosition {
  viewIndex: number;
  stageIndex: number;
}

export interface CarouselTransition {
  linkIndex: number;
  target: CarouselPosition;
}

export interface ConstellationPoint {
  x: number;
  y: number;
}

export type GalaxyViewMode = "2d" | "3d";

export interface OrbitNodePresentation extends ConstellationPoint {
  angle: number;
  depth: number;
  scale: number;
  opacity: number;
  blur: number;
  brightness: number;
  zIndex: number;
}

export interface GalaxyParticleSeed {
  x: number;
  y: number;
  depth: number;
  radius: number;
  alpha: number;
  speed: number;
  drift: number;
  hue: number;
}

export interface GalaxyClusterSeed {
  radius: number;
  angle: number;
  arm: number;
  spread: number;
  count: number;
  size: number;
  alpha: number;
  hue: number;
  phase: number;
}

export interface AccretionProjection {
  x: number;
  y: number;
  depth: number;
  scale: number;
  alpha: number;
  brightness: number;
  funnel: number;
}

export interface GalaxyDustSeed {
  radius: number;
  angle: number;
  arm: number;
  spread: number;
  size: number;
  alpha: number;
  hue: number;
  twinkle: number;
}

export interface SatelliteGalaxySeed {
  x: number;
  y: number;
  scale: number;
  flattening: number;
  tilt: number;
  hue: number;
  phase: number;
}

export interface GalaxyRenderBudget {
  particleCount: number;
  dustCount: number;
  frameIntervalMs: number;
}

export interface OrbitArcOptions {
  scaleX?: number;
  scaleY?: number;
  screenGap?: number;
  startScreenGap?: number;
  endScreenGap?: number;
}

export interface OrbitArc {
  path: string;
  start: ConstellationPoint;
  end: ConstellationPoint;
  startAngle: number;
  endAngle: number;
}

export const GALAXY_STAGE_KEYS = [
  "requirements",
  "design",
  "generation",
  "execution",
  "analysis",
  "repair",
  "verification",
] as const;

const ORBIT_CENTER = { x: 365, y: 183 };
const ORBIT_RADIUS_X = 275;
const ORBIT_RADIUS_Y = 112;
const ORBIT_FRONT_ANGLE = Math.PI / 2;
const ORBIT_HOLD_RATIO = 0.56;

export function clipConnector(
  from: ConstellationPoint,
  to: ConstellationPoint,
  halfWidth = 63,
  halfHeight = 27,
  gap = 8,
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (!length) return { x1: from.x, y1: from.y, x2: to.x, y2: to.y };

  const ux = dx / length;
  const uy = dy / length;
  const horizontalDistance = Math.abs(ux) > 0 ? (halfWidth + gap) / Math.abs(ux) : Number.POSITIVE_INFINITY;
  const verticalDistance = Math.abs(uy) > 0 ? (halfHeight + gap) / Math.abs(uy) : Number.POSITIVE_INFINITY;
  const offset = Math.min(horizontalDistance, verticalDistance, length / 2);

  return {
    x1: from.x + ux * offset,
    y1: from.y + uy * offset,
    x2: to.x - ux * offset,
    y2: to.y - uy * offset,
  };
}

export function buildProjectStages(
  project: DashboardProjectSituation,
): DashboardAgentStage[] {
  const hasData = project.test_cases > 0 || project.test_runs > 0;
  const hasFailures = project.failed > 0;
  const hasRunning = project.running_tasks > 0;
  const projectPath = `/projects/${project.identifier}`;

  return [
    stage("requirements", "需求分析", "需求文档与测试场景映射", hasData ? "ready" : "idle", project.test_cases, 0, `${projectPath}/test-cases`, hasData),
    stage("design", "测试设计", "已沉淀的标准测试用例", project.test_cases > 0 ? "ready" : "idle", project.test_cases, 0, `${projectPath}/test-cases`, project.test_cases > 0),
    stage("generation", "脚本生成", "API、场景和 Web 自动化脚本", project.test_scripts > 0 ? "ready" : "idle", project.test_scripts, 0, `${projectPath}/api-tests`, project.test_scripts > 0),
    stage("execution", "自动执行", "正在运行的测试作业", hasRunning ? "running" : "idle", project.running_tasks, project.failed, `${projectPath}/test-runs`, project.test_runs > 0),
    stage("analysis", "结果分析", "失败原因智能诊断", hasFailures ? "attention" : project.test_runs > 0 ? "ready" : "idle", project.failed, project.blocked, `${projectPath}/test-runs`, project.test_runs > 0),
    stage("repair", "失败修复", "自动分析与修复闭环", hasFailures ? "attention" : "idle", project.failed, 0, `${projectPath}/test-runs`, hasFailures),
    stage("verification", "回归验证", "通过验证的修复闭环", project.pass_rate !== null && project.pass_rate >= 80 ? "ready" : "idle", project.passed, 0, `${projectPath}/reports`, project.test_runs > 0),
  ];
}

export function easeOrbitPhase(rawPhase: number): number {
  if (!Number.isFinite(rawPhase)) return 0;
  const segment = Math.floor(rawPhase);
  const fraction = rawPhase - segment;
  if (fraction <= ORBIT_HOLD_RATIO) return segment;

  const progress = Math.min(1, (fraction - ORBIT_HOLD_RATIO) / (1 - ORBIT_HOLD_RATIO));
  const eased = -(Math.cos(Math.PI * progress) - 1) / 2;
  return segment + eased;
}

export function getFocusedStageIndex(phase: number, count: number): number {
  if (count <= 0 || !Number.isFinite(phase)) return 0;
  return positiveModulo(Math.round(phase), count);
}

export function getForwardPhaseTarget(
  phase: number,
  targetIndex: number,
  count: number,
): number {
  if (count <= 0 || !Number.isFinite(phase)) return 0;
  const normalizedTarget = positiveModulo(targetIndex, count);
  const cycleStart = Math.floor(phase / count) * count;
  let target = cycleStart + normalizedTarget;
  if (target < phase - 0.0001) target += count;
  return target;
}

export function computeOrbitNode(
  index: number,
  phase: number,
  count: number,
  mode: GalaxyViewMode,
): OrbitNodePresentation {
  if (count <= 0) {
    return {
      ...ORBIT_CENTER,
      angle: ORBIT_FRONT_ANGLE,
      depth: 1,
      scale: 1,
      opacity: 1,
      blur: 0,
      brightness: 1,
      zIndex: 1,
    };
  }

  const step = (Math.PI * 2) / count;
  const angle = ORBIT_FRONT_ANGLE + (index - phase) * step;
  const depth = (Math.sin(angle) + 1) / 2;
  const isThreeDimensional = mode === "3d";

  return {
    x: ORBIT_CENTER.x + ORBIT_RADIUS_X * Math.cos(angle),
    y: ORBIT_CENTER.y + ORBIT_RADIUS_Y * Math.sin(angle),
    angle,
    depth,
    scale: isThreeDimensional ? 0.58 + depth * 0.64 : 0.86 + depth * 0.14,
    opacity: isThreeDimensional ? 0.35 + depth * 0.65 : 0.68 + depth * 0.32,
    blur: isThreeDimensional ? 1.5 * (1 - depth) : 0,
    brightness: isThreeDimensional ? 0.66 + depth * 0.42 : 0.88 + depth * 0.12,
    zIndex: 10 + Math.round(depth * 90),
  };
}

export function buildOrbitArc(
  index: number,
  phase: number,
  count: number,
  options: OrbitArcOptions = {},
): OrbitArc {
  if (count <= 0) {
    return {
      path: "",
      start: ORBIT_CENTER,
      end: ORBIT_CENTER,
      startAngle: ORBIT_FRONT_ANGLE,
      endAngle: ORBIT_FRONT_ANGLE,
    };
  }

  const step = (Math.PI * 2) / count;
  const scaleX = Math.max(0.01, options.scaleX ?? 1);
  const scaleY = Math.max(0.01, options.scaleY ?? 1);
  const screenGap = Math.max(1, options.screenGap ?? 58);
  const startScreenGap = Math.max(1, options.startScreenGap ?? screenGap);
  const endScreenGap = Math.max(1, options.endScreenGap ?? screenGap);
  const maxPadding = Math.min(step * 0.5, 0.46);
  const fromAngle = ORBIT_FRONT_ANGLE + (index - phase) * step;
  const toAngle = ORBIT_FRONT_ANGLE + (index + 1 - phase) * step;
  const startAngle = fromAngle + findOrbitAngleForScreenGap(fromAngle, 1, maxPadding, scaleX, scaleY, startScreenGap);
  const endAngle = toAngle - findOrbitAngleForScreenGap(toAngle, -1, maxPadding, scaleX, scaleY, endScreenGap);
  const start = orbitPoint(startAngle);
  const end = orbitPoint(endAngle);
  const path = `M ${formatCoordinate(start.x)} ${formatCoordinate(start.y)} A ${ORBIT_RADIUS_X} ${ORBIT_RADIUS_Y} 0 0 1 ${formatCoordinate(end.x)} ${formatCoordinate(end.y)}`;

  return { path, start, end, startAngle, endAngle };
}

export function buildGalaxyParticleSeeds(count: number): GalaxyParticleSeed[] {
  const safeCount = Math.max(0, Math.floor(count));
  let state = 0x6d2b79f5;
  const random = () => {
    state = Math.imul(state ^ (state >>> 15), state | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };

  return Array.from({ length: safeCount }, () => {
    const depth = random();
    const sizeVariation = 0.72 + random() * 0.56;

    return {
      x: random(),
      y: random(),
      depth,
      radius: (0.34 + depth * 1.82) * sizeVariation,
      alpha: Math.min(0.95, 0.09 + depth * 0.7 + random() * 0.12),
      speed: 0.003 + depth * 0.017 + random() * 0.006,
      drift: (random() - 0.5) * (0.006 + depth * 0.014),
      hue: depth > 0.72 && random() > 0.82 ? 28 + random() * 24 : 190 + random() * 85,
    };
  });
}

export function buildGalaxyDustSeeds(count: number): GalaxyDustSeed[] {
  const safeCount = Math.max(0, Math.floor(count));
  let state = 0x1f123bb5;
  const random = () => {
    state = Math.imul(state ^ (state >>> 16), 0x45d9f3b);
    state = Math.imul(state ^ (state >>> 16), 0x45d9f3b);
    return ((state ^ (state >>> 16)) >>> 0) / 4294967296;
  };

  return Array.from({ length: safeCount }, (_, index) => {
    const warmSpark = index % 17 === 0;

    const radius = index % 4 === 0
      ? Math.pow(random(), 0.55)
      : Math.pow(random(), 1.65);

    return {
      radius,
      angle: random() * Math.PI * 2,
      arm: index % 3,
      spread: random() * 2 - 1,
      size: warmSpark ? 0.55 + random() * 1.85 : 0.3 + random() * 1.75,
      alpha: warmSpark ? 0.46 + random() * 0.48 : 0.14 + random() * 0.62,
      hue: warmSpark ? 18 + random() * 30 : 188 + random() * 92,
      twinkle: random() * Math.PI * 2,
    };
  });
}

export function buildGalaxyClusterSeeds(count: number): GalaxyClusterSeed[] {
  const safeCount = Math.max(0, Math.floor(count));
  let state = 0x4cf5ad43;
  const random = () => {
    state = Math.imul(state ^ (state >>> 15), state | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };

  return Array.from({ length: safeCount }, (_, index) => ({
    radius: 0.16 + random() * 0.7,
    angle: random() * Math.PI * 2,
    arm: index % 3,
    spread: random() * 1.4 - 0.7,
    count: 12 + (index % 5) * 5 + Math.floor(random() * 7),
    size: 0.62 + random() * 1.28,
    alpha: 0.32 + random() * 0.52,
    hue: index % 6 === 0 ? 24 + random() * 42 : 188 + random() * 92,
    phase: random() * Math.PI * 2,
  }));
}

export function projectAccretionPoint(
  radius: number,
  angle: number,
  rotation = 0,
): AccretionProjection {
  const safeRadius = Math.min(1, Math.max(0, Number.isFinite(radius) ? radius : 0));
  const theta = angle + rotation;
  const depth = (Math.sin(theta) + 1) / 2;
  const funnel = Math.pow(1 - safeRadius, 3);

  return {
    x: Math.cos(theta) * safeRadius,
    y: Math.sin(theta) * safeRadius * 0.44 + funnel * 0.32,
    depth,
    scale: 0.52 + depth * 0.76 + (1 - safeRadius) * 0.22,
    alpha: Math.min(1, 0.18 + depth * 0.58 + (1 - safeRadius) * 0.24),
    brightness: 0.55 + depth * 0.62 + (1 - safeRadius) * 0.24,
    funnel,
  };
}

export function buildSatelliteGalaxySeeds(count: number): SatelliteGalaxySeed[] {
  const safeCount = Math.max(0, Math.floor(count));
  const anchors = [
    { x: 0.08, y: 0.18 },
    { x: 0.92, y: 0.16 },
    { x: 0.07, y: 0.56 },
    { x: 0.93, y: 0.58 },
    { x: 0.18, y: 0.88 },
    { x: 0.82, y: 0.86 },
    { x: 0.34, y: 0.11 },
    { x: 0.68, y: 0.1 },
  ];
  let state = 0x73a6c91d;
  const random = () => {
    state = Math.imul(state ^ (state >>> 15), state | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };

  return Array.from({ length: safeCount }, (_, index) => {
    const anchor = anchors[index % anchors.length];
    return {
      x: anchor.x,
      y: anchor.y,
      scale: 0.035 + random() * 0.065,
      flattening: 0.27 + random() * 0.43,
      tilt: -0.68 + random() * 1.36,
      hue: 188 + random() * 112,
      phase: random() * Math.PI * 2,
    };
  });
}

export function getGalaxyRenderBudget(width: number, hardwareThreads: number): GalaxyRenderBudget {
  const safeThreads = Math.min(8, Math.max(2, Math.floor(hardwareThreads) || 4));
  return {
    particleCount: width < 720 ? 28 : Math.min(64, 40 + safeThreads * 3),
    dustCount: width < 720 ? 200 : Math.min(520, 400 + safeThreads * 15),
    frameIntervalMs: 32,
  };
}

function orbitPoint(angle: number): ConstellationPoint {
  return {
    x: ORBIT_CENTER.x + ORBIT_RADIUS_X * Math.cos(angle),
    y: ORBIT_CENTER.y + ORBIT_RADIUS_Y * Math.sin(angle),
  };
}

function findOrbitAngleForScreenGap(
  nodeAngle: number,
  direction: 1 | -1,
  maxPadding: number,
  scaleX: number,
  scaleY: number,
  screenGap: number,
): number {
  const origin = orbitPoint(nodeAngle);
  let low = 0;
  let high = maxPadding;

  for (let iteration = 0; iteration < 18; iteration += 1) {
    const mid = (low + high) / 2;
    const point = orbitPoint(nodeAngle + direction * mid);
    const distance = Math.hypot((point.x - origin.x) * scaleX, (point.y - origin.y) * scaleY);

    if (distance < screenGap) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return high;
}

function shortestCyclicDistance(index: number, phase: number, count: number): number {
  const normalized = positiveModulo(index - phase, count);
  return normalized > count / 2 ? normalized - count : normalized;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function formatCoordinate(value: number): string {
  return Number(value.toFixed(2)).toString();
}

export function buildConstellationViews(
  globalStages: DashboardAgentStage[],
  projects: DashboardProjectSituation[],
): ConstellationView[] {
  return [
    { key: "all", title: "全部项目", stages: globalStages, project: null },
    ...projects.map((project) => ({
      key: project.identifier,
      title: project.name,
      stages: buildProjectStages(project),
      project,
    })),
  ];
}

export function advanceCarousel(
  position: CarouselPosition,
  viewCount: number,
  stageCount: number,
): CarouselPosition {
  if (viewCount <= 0 || stageCount <= 0) return { viewIndex: 0, stageIndex: 0 };
  if (position.stageIndex < stageCount - 1) {
    return { viewIndex: position.viewIndex % viewCount, stageIndex: position.stageIndex + 1 };
  }
  return { viewIndex: (position.viewIndex + 1) % viewCount, stageIndex: 0 };
}

export function buildCarouselTransition(
  position: CarouselPosition,
  viewCount: number,
  stageCount: number,
): CarouselTransition {
  return {
    linkIndex: stageCount > 0 ? position.stageIndex % stageCount : 0,
    target: advanceCarousel(position, viewCount, stageCount),
  };
}

function stage(
  key: string,
  name: string,
  description: string,
  status: DashboardAgentStage["status"],
  taskCount: number,
  issueCount: number,
  href: string,
  dataAvailable: boolean,
): DashboardAgentStage {
  return {
    key,
    name,
    description,
    status,
    task_count: taskCount,
    issue_count: issueCount,
    href,
    data_available: dataAvailable,
  };
}
