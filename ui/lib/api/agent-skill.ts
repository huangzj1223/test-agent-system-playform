import { apiClient } from "./client";
import type { ApiSuccess } from "./auth";

export interface AgentSkillInfo {
  id: string;
  name: string;
  label: string;
  description: string | null;
  entrypoint: string;
  keywords: string[];
  config: Record<string, unknown>;
  enabled: boolean;
  sort: number;
  created_at: string;
  updated_at: string | null;
}

export function listAgentSkills() {
  return apiClient.get<ApiSuccess<AgentSkillInfo[]>>("/agent-skills");
}

export function updateAgentSkill(id: string, body: Partial<AgentSkillInfo>) {
  return apiClient.put<ApiSuccess<AgentSkillInfo>>(`/agent-skills/${id}`, body);
}

export function routeAgentSkill(prompt: string) {
  return apiClient.post<ApiSuccess<AgentSkillInfo | null>>("/agent-skills/route", { prompt });
}
