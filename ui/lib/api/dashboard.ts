import { apiClient } from "./client";

export type AgentStageStatus =
  | "running"
  | "attention"
  | "ready"
  | "idle"
  | "unavailable";

export interface DashboardMetrics {
  active_projects: number;
  total_projects: number;
  test_assets: number;
  running_tasks: number;
  manual_actions: number;
  pass_rate: number | null;
}

export interface DashboardAgentStage {
  key: string;
  name: string;
  description: string;
  status: AgentStageStatus;
  task_count: number | null;
  issue_count: number;
  href: string | null;
  data_available: boolean;
}

export interface DashboardRiskItem {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  reason: string;
  project_identifier: string;
  project_name: string;
  confidence: number | null;
  href: string;
  created_at: string;
}

export interface DashboardProjectSituation {
  identifier: string;
  name: string;
  description: string | null;
  test_cases: number;
  test_scripts: number;
  test_runs: number;
  running_tasks: number;
  passed: number;
  failed: number;
  blocked: number;
  pass_rate: number | null;
  risk_level: "blocked" | "attention" | "healthy" | "no_data";
  last_activity_at: string | null;
}

export interface DashboardWorkItem {
  id: string;
  group: "review" | "handle" | "watch";
  title: string;
  description: string;
  project_identifier: string;
  project_name: string;
  href: string;
  created_at: string;
}

export interface DashboardActivity {
  id: string;
  event_type: "run" | "analysis" | "loop";
  title: string;
  description: string;
  project_identifier: string;
  project_name: string;
  href: string;
  occurred_at: string;
}

export interface DashboardLoopEfficiency {
  tracked_loops: number;
  active_loops: number;
  completed_loops: number;
  needs_human_review: number;
  average_diagnosis_minutes: number | null;
  auto_fix_rate: number | null;
  verification_pass_rate: number | null;
}

export interface DashboardOverview {
  updated_at: string;
  metrics: DashboardMetrics;
  agent_stages: DashboardAgentStage[];
  risk_items: DashboardRiskItem[];
  projects: DashboardProjectSituation[];
  work_items: DashboardWorkItem[];
  recent_activities: DashboardActivity[];
  loop_efficiency: DashboardLoopEfficiency;
}

export function getDashboardOverview() {
  return apiClient.get<DashboardOverview>("/dashboard/overview");
}
