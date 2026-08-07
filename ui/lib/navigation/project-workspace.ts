export type WorkspaceMode = "global" | "project" | "platform";

export type ProjectSection =
  | "overview"
  | "smart-test"
  | "design"
  | "execution"
  | "analysis"
  | "settings";

export interface ProjectSectionTab {
  label: string;
  href: string;
}

export const SIDEBAR_PROJECT_LIMIT = 7;

export function getSidebarProjectState<T>(projects: readonly T[], expanded: boolean) {
  const hiddenProjectCount = Math.max(projects.length - SIDEBAR_PROJECT_LIMIT, 0);
  const hasHiddenProjects = hiddenProjectCount > 0;

  return {
    hasHiddenProjects,
    hiddenProjectCount,
    visibleProjects: expanded && hasHiddenProjects
      ? projects.slice()
      : projects.slice(0, SIDEBAR_PROJECT_LIMIT),
  };
}

const globalProjectRoutes = new Set(["/projects", "/projects/spaces", "/projects/agent-tasks"]);
const platformPrefixes = ["/admin", "/memory", "/tools", "/skills"];

const designRoutes = new Set(["test-cases", "api-tests", "scenario-tests", "web-tests", "pentest"]);
const executionRoutes = new Set(["test-plans", "test-runs"]);
const analysisRoutes = new Set(["reports", "fullstack-analysis"]);

export function getWorkspaceMode(pathname: string): WorkspaceMode {
  if (platformPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return "platform";
  }
  if (!globalProjectRoutes.has(pathname) && /^\/projects\/[^/]+(?:\/|$)/.test(pathname)) {
    return "project";
  }
  return "global";
}

export function getProjectSection(pathname: string): ProjectSection | null {
  if (getWorkspaceMode(pathname) !== "project") return null;

  const route = pathname.split("/")[3] ?? "";
  if (!route) return "overview";
  if (route === "smart-test") return "smart-test";
  if (route === "settings") return "settings";
  if (designRoutes.has(route)) return "design";
  if (executionRoutes.has(route)) return "execution";
  if (analysisRoutes.has(route)) return "analysis";
  return "overview";
}

export function switchProjectPath(pathname: string, nextIdentifier: string): string {
  if (getWorkspaceMode(pathname) !== "project") return `/projects/${nextIdentifier}`;
  return pathname.replace(/^\/projects\/[^/]+/, `/projects/${nextIdentifier}`);
}

export function getProjectSectionHref(identifier: string, section: ProjectSection): string {
  const base = `/projects/${identifier}`;
  const suffixes: Record<ProjectSection, string> = {
    overview: "",
    "smart-test": "/smart-test",
    design: "/test-cases",
    execution: "/test-plans",
    analysis: "/reports",
    settings: "/settings",
  };
  return `${base}${suffixes[section]}`;
}

export function getProjectSectionTabs(section: ProjectSection | null, identifier: string): ProjectSectionTab[] {
  const base = `/projects/${identifier}`;
  if (section === "design") {
    return [
      { label: "测试用例", href: `${base}/test-cases` },
      { label: "API 测试", href: `${base}/api-tests` },
      { label: "场景测试", href: `${base}/scenario-tests` },
      { label: "Web 测试", href: `${base}/web-tests` },
      { label: "渗透测试", href: `${base}/pentest` },
    ];
  }
  if (section === "execution") {
    return [
      { label: "测试计划", href: `${base}/test-plans` },
      { label: "测试运行", href: `${base}/test-runs` },
    ];
  }
  if (section === "analysis") {
    return [
      { label: "测试报告", href: `${base}/reports` },
      { label: "全栈分析", href: `${base}/fullstack-analysis` },
    ];
  }
  return [];
}
