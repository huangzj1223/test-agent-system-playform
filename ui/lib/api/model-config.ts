import { apiClient } from "./client";
import type { ApiPaginated, ApiSuccess } from "./auth";

export interface ModelConfigInfo {
  id: string;
  provider_id: string;
  name: string;
  model_id: string;
  context_window: number | null;
  max_output_tokens: number | null;
  pool_group: string | null;
  default_temperature: number | null;
  default_top_p: number | null;
  timeout_sec: number | null;
  retry_count: number | null;
  support_text: boolean;
  support_image_input: boolean;
  support_image_output: boolean;
  support_tools: boolean;
  support_stream: boolean;
  support_code: boolean;
  support_long_text: boolean;
  enabled: boolean;
  sort: number;
  created_at: string;
  updated_at: string | null;
}

export interface ModelProviderInfo {
  id: string;
  name: string;
  provider: string;
  api_endpoint: string;
  protocol_type: string;
  api_version: string | null;
  remark: string | null;
  enabled: boolean;
  sort: number;
  has_api_key: boolean;
  models: ModelConfigInfo[];
  created_at: string;
  updated_at: string | null;
}

export interface ModelProviderPayload {
  name: string;
  provider: string;
  api_endpoint: string;
  api_key?: string;
  protocol_type: string;
  api_version?: string | null;
  remark?: string | null;
  enabled?: boolean;
  sort?: number;
}

export interface ModelConfigPayload {
  provider_id: string;
  name: string;
  model_id: string;
  context_window?: number | null;
  max_output_tokens?: number | null;
  pool_group?: string | null;
  default_temperature?: number | null;
  default_top_p?: number | null;
  timeout_sec?: number | null;
  retry_count?: number | null;
  support_text?: boolean;
  support_image_input?: boolean;
  support_image_output?: boolean;
  support_tools?: boolean;
  support_stream?: boolean;
  support_code?: boolean;
  support_long_text?: boolean;
  enabled?: boolean;
  sort?: number;
}

export interface TestConnectionResult {
  reachable: boolean;
  status_code: number | null;
  message: string;
}

export function listModelProviders(params?: {
  p?: number;
  page_size?: number;
  keyword?: string;
}) {
  return apiClient.get<ApiPaginated<ModelProviderInfo>>("/model-config/providers", { params });
}

export function listAllModelProviders() {
  return apiClient.get<ApiSuccess<ModelProviderInfo[]>>("/model-config/providers/all-with-models");
}

export function createModelProvider(body: ModelProviderPayload) {
  return apiClient.post<ApiSuccess<ModelProviderInfo>>("/model-config/providers", body);
}

export function updateModelProvider(id: string, body: Partial<ModelProviderPayload>) {
  return apiClient.put<ApiSuccess<ModelProviderInfo>>(`/model-config/providers/${id}`, body);
}

export function deleteModelProvider(id: string) {
  return apiClient.delete<{ success: boolean; message: string }>(`/model-config/providers/${id}`);
}

export function testModelProviderConnection(providerId: string, modelId?: string) {
  return apiClient.post<ApiSuccess<TestConnectionResult>>(
    "/model-config/providers/test-connection",
    { provider_id: providerId, model_id: modelId }
  );
}

export function createModelConfig(body: ModelConfigPayload) {
  return apiClient.post<ApiSuccess<ModelConfigInfo>>("/model-config/models", body);
}

export function updateModelConfig(id: string, body: Partial<ModelConfigPayload>) {
  return apiClient.put<ApiSuccess<ModelConfigInfo>>(`/model-config/models/${id}`, body);
}

export function deleteModelConfig(id: string) {
  return apiClient.delete<{ success: boolean; message: string }>(`/model-config/models/${id}`);
}
