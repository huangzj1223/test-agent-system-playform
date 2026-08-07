import { apiClient } from "./client";
import type { ApiSuccess } from "./auth";

export interface AgentToolInfo {
  id: string;
  name: string;
  label: string;
  description: string | null;
  tool_type: string;
  config: Record<string, unknown>;
  enabled: boolean;
  sort: number;
  created_at: string;
  updated_at: string | null;
}

export interface ToolCallLogInfo {
  id: string;
  conversation_id: string | null;
  tool_name: string;
  arguments: Record<string, unknown>;
  result: string | null;
  status: string;
  created_at: string;
}

export function listAgentTools() {
  return apiClient.get<ApiSuccess<AgentToolInfo[]>>("/agent-tools");
}

export function updateAgentTool(id: string, body: Partial<AgentToolInfo>) {
  return apiClient.put<ApiSuccess<AgentToolInfo>>(`/agent-tools/${id}`, body);
}

export function listToolCallLogs() {
  return apiClient.get<ApiSuccess<ToolCallLogInfo[]>>("/agent-tools/logs");
}
