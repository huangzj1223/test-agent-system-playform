
import { apiClient } from "./client";
import type {
  PaginatedResponse,
  SuccessResponse,
  ProjectInfo,
  ProjectCreate,
  ProjectUpdate,
  ProjectDeletionImpact,
  ProjectDeletionResult,
} from "./types";

// 获取项目列表
export function getProjects(params?: { p?: number; page_size?: number }) {
  return apiClient.get<PaginatedResponse<ProjectInfo>>("/projects", {
    params,
  });
}

// 获取单个项目详情
export function getProject(identifier: string) {
  return apiClient.get<SuccessResponse<ProjectInfo>>(
    `/projects/${identifier}`
  );
}

// 创建项目
export function createProject(data: ProjectCreate) {
  return apiClient.post<SuccessResponse<ProjectInfo>>("/projects", data);
}

// 更新项目
export function updateProject(identifier: string, data: ProjectUpdate) {
  return apiClient.patch<SuccessResponse<ProjectInfo>>(
    `/projects/${identifier}`,
    data
  );
}

// 删除项目
export function getProjectDeletionImpact(identifier: string) {
  return apiClient.get<SuccessResponse<ProjectDeletionImpact>>(
    `/projects/${identifier}/deletion-impact`
  );
}

export function deleteProject(identifier: string, confirmation: string) {
  return apiClient.delete<SuccessResponse<ProjectDeletionResult>>(
    `/projects/${identifier}`,
    { params: { confirmation } }
  );
}

// FIXME  MS8yOmFIVnBZMlhwdTRUbGphRG1zWjg2VnpaVFRBPT06MjY3MWFiMGI=
