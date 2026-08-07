import { apiClient } from "./client";
import type { ApiSuccess } from "./auth";

export type AgentRunStatus =
  | "pending_approval"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface AgentRunInfo {
  id: string;
  conversation_id: string | null;
  skill_name: string | null;
  agent_name: string;
  prompt: string;
  context: Record<string, unknown>;
  risk_level: "L1" | "L2" | "L3" | "L4";
  status: AgentRunStatus;
  result: string | null;
  error: string | null;
  artifacts: Array<Record<string, unknown>>;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export function listAgentRuns(limit = 100) {
  return apiClient.get<ApiSuccess<AgentRunInfo[]>>("/agent-runs", { params: { limit } });
}

export function getAgentRun(runId: string) {
  return apiClient.get<ApiSuccess<AgentRunInfo>>(`/agent-runs/${runId}`);
}

export function approveAgentRun(runId: string, note?: string) {
  return apiClient.post<ApiSuccess<AgentRunInfo>>(`/agent-runs/${runId}/approve`, { note });
}

export function rejectAgentRun(runId: string, note?: string) {
  return apiClient.post<ApiSuccess<AgentRunInfo>>(`/agent-runs/${runId}/reject`, { note });
}

export function cancelAgentRun(runId: string, note?: string) {
  return apiClient.post<ApiSuccess<AgentRunInfo>>(`/agent-runs/${runId}/cancel`, { note });
}
