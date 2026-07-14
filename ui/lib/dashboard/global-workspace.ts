export type GlobalWorkspaceRoute = "overview" | "agent-tasks" | "spaces";
export type AgentTaskGroup = "all" | "review" | "handle" | "watch";
export type ProjectRiskFilter = "all" | "blocked" | "attention" | "healthy" | "no_data";

const globalRoutes: Record<string, GlobalWorkspaceRoute> = {
  "/projects": "overview",
  "/projects/agent-tasks": "agent-tasks",
  "/projects/spaces": "spaces",
};

export function getGlobalWorkspaceRoute(pathname: string): GlobalWorkspaceRoute | null {
  return globalRoutes[pathname] ?? null;
}

export function extractProjectIdentifier(pathname: string): string | null {
  if (getGlobalWorkspaceRoute(pathname)) return null;
  const match = pathname.match(/^\/projects\/([^/]+)/);
  return match?.[1] ?? null;
}

export function filterAgentTasks<T extends { group: string }>(
  items: T[],
  group: AgentTaskGroup,
): T[] {
  return group === "all" ? items : items.filter((item) => item.group === group);
}

export function filterProjectSpaces<
  T extends { name: string; identifier: string; description?: string | null; risk_level: string },
>(projects: T[], query: string, risk: ProjectRiskFilter): T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
  return projects.filter((project) => {
    const matchesRisk = risk === "all" || project.risk_level === risk;
    const searchable = `${project.name} ${project.identifier} ${project.description ?? ""}`.toLocaleLowerCase("zh-CN");
    return matchesRisk && (!normalizedQuery || searchable.includes(normalizedQuery));
  });
}
