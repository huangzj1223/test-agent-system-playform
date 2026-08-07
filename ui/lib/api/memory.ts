import { apiClient } from "./client";
import type { ApiSuccess } from "./auth";

export interface MemoryInfo {
  id: string;
  memory_key: string;
  name: string;
  description: string | null;
  category: string;
  risk_level: string;
  version: string;
  built_in: boolean;
  enabled: boolean;
  can_read: boolean;
  can_suggest: boolean;
  can_auto_write: boolean;
  need_confirm: boolean;
  audit_log: boolean;
  related_keys: string[];
  sort: number;
  created_at: string;
  updated_at: string | null;
}

export interface MemoryVersionInfo {
  id: string;
  version: string;
  content: string;
  change_type: string;
  note: string | null;
  updater: string | null;
  created_at: string;
}

export interface MemorySuggestionInfo {
  id: string;
  target_key: string;
  text: string;
  source: string | null;
  status: string;
  created_at: string;
}

export interface MemoryDetail extends MemoryInfo {
  content: string;
  versions: MemoryVersionInfo[];
  suggestions: MemorySuggestionInfo[];
}

export interface MemoryStats {
  total: number;
  enabled: number;
  high_risk: number;
  pending: number;
  reads: number;
}

export function listMemories() {
  return apiClient.get<ApiSuccess<MemoryInfo[]>>("/memories");
}

export function getMemory(memoryKey: string) {
  return apiClient.get<ApiSuccess<MemoryDetail>>(`/memories/${encodeURIComponent(memoryKey)}`);
}

export function getMemoryStats() {
  return apiClient.get<ApiSuccess<MemoryStats>>("/memories/stats");
}

export function saveMemory(memoryKey: string, content: string) {
  return apiClient.put<ApiSuccess<MemoryInfo>>(`/memories/${encodeURIComponent(memoryKey)}`, { content });
}

export function rollbackMemory(memoryKey: string, version: string) {
  return apiClient.post<ApiSuccess<MemoryInfo>>(
    `/memories/${encodeURIComponent(memoryKey)}/rollback`,
    { version }
  );
}

export function createPendingMemory(targetKey: string, text: string, source?: string) {
  return apiClient.post<ApiSuccess<MemorySuggestionInfo>>("/memories/pending", {
    target_key: targetKey,
    text,
    source,
  });
}

export function confirmPendingMemory(id: string, text?: string) {
  return apiClient.post<ApiSuccess<MemoryInfo>>(`/memories/pending/${id}/confirm`, { text });
}

export function ignorePendingMemory(id: string) {
  return apiClient.post<ApiSuccess<MemorySuggestionInfo>>(`/memories/pending/${id}/ignore`);
}
