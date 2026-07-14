export async function refreshProjectSurfaces(
  refreshProjects: () => Promise<void>,
  loadDashboard: () => Promise<void>,
): Promise<void> {
  await refreshProjects();
  await loadDashboard();
}
