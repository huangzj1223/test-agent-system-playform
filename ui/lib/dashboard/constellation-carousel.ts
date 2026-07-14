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
    stage("requirements", "需求解析", "需求文档与测试场景映射", hasData ? "ready" : "idle", project.test_cases, 0, `${projectPath}/test-cases`, hasData),
    stage("design", "测试设计", "已沉淀的标准测试用例", project.test_cases > 0 ? "ready" : "idle", project.test_cases, 0, `${projectPath}/test-cases`, project.test_cases > 0),
    stage("generation", "脚本生成", "API、场景和 Web 自动化脚本", project.test_scripts > 0 ? "ready" : "idle", project.test_scripts, 0, `${projectPath}/api-tests`, project.test_scripts > 0),
    stage("execution", "自动执行", "正在运行的测试作业", hasRunning ? "running" : "idle", project.running_tasks, project.failed, `${projectPath}/test-runs`, project.test_runs > 0),
    stage("analysis", "结果分析", "失败原因智能诊断", hasFailures ? "attention" : project.test_runs > 0 ? "ready" : "idle", project.failed, project.blocked, `${projectPath}/test-runs`, project.test_runs > 0),
    stage("repair", "失败修复", "自动分析与修复闭环", hasFailures ? "attention" : "idle", project.failed, 0, `${projectPath}/test-runs`, hasFailures),
    stage("verification", "回归验证", "通过验证的修复闭环", project.pass_rate !== null && project.pass_rate >= 80 ? "ready" : "idle", project.passed, 0, `${projectPath}/reports`, project.test_runs > 0),
  ];
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
