
import { apiClient } from "./client";
import type {
  TestCaseInfo,
  TestCaseCreate,
  TestCaseUpdate,
  PaginationInfo,
  Priority,
  TestCaseState,
} from "./types";

interface TestCaseResponse {
  success: boolean;
  test_case: TestCaseInfo;
}

interface TestCaseListResponse {
  success: boolean;
  data?: TestCaseInfo[];
  test_cases?: TestCaseInfo[];
  info?: PaginationInfo;
}
// TODO  MC80OmFIVnBZMlhwdTRUbGphRG1zWjg2V1ZwWGRRPT06OTNmZDY3ZjY=

interface TestCaseDeleteResponse {
  success: boolean;
  message: string;
}

export interface TestCaseQueryParams {
  p?: number;
  page_size?: number;
  folder_id?: string;
  search?: string;
  priority?: Priority | string;
  status?: TestCaseState | string;
  owner?: string;
  tags?: string;
  minify?: boolean;
}

// 获取项目下的测试用例列表
export function getTestCases(
  projectId: string,
  params?: TestCaseQueryParams
) {
  return apiClient.get<TestCaseListResponse>(
    `/projects/${projectId}/test-cases`,
    { params: params as Record<string, string | number | boolean | undefined> }
  );
}
// eslint-disable  MS80OmFIVnBZMlhwdTRUbGphRG1zWjg2V1ZwWGRRPT06OTNmZDY3ZjY=

// 获取文件夹下的测试用例
export function getFolderTestCases(
  projectId: string,
  folderId: string,
  params?: TestCaseQueryParams
) {
  return apiClient.get<TestCaseListResponse>(
    `/projects/${projectId}/folders/${folderId}/test-cases`,
    { params: params as Record<string, string | number | boolean | undefined> }
  );
}

// 获取测试用例详情
export function getTestCase(projectId: string, testCaseId: string) {
  return apiClient.get<TestCaseResponse>(
    `/projects/${projectId}/test-cases/${testCaseId}`
  );
}

// 创建测试用例
export function createTestCase(
  projectId: string,
  folderId: string | null,
  data: TestCaseCreate
) {
  const url = folderId
    ? `/projects/${projectId}/folders/${folderId}/test-cases`
    : `/projects/${projectId}/test-cases`;
  return apiClient.post<TestCaseResponse>(url, data);
}

// 更新测试用例
export function updateTestCase(
  projectId: string,
  testCaseId: string,
  data: TestCaseUpdate
) {
  return apiClient.patch<TestCaseResponse>(
    `/projects/${projectId}/test-cases/${testCaseId}`,
    data
  );
}

// 删除测试用例
export function deleteTestCase(projectId: string, testCaseId: string) {
  return apiClient.delete<TestCaseDeleteResponse>(
    `/projects/${projectId}/test-cases/${testCaseId}`
  );
}

// 移动测试用例到其他文件夹
export function moveTestCase(
  projectId: string,
  testCaseId: string,
  folderId: string | null
) {
  return apiClient.patch<TestCaseResponse>(
    `/projects/${projectId}/test-cases/${testCaseId}/move`,
    { folder_id: folderId }
  );
}

interface BulkOperationResponse {
  success: boolean;
  message: string;
  affected_count: number;
}

// 批量删除测试用例
export function bulkDeleteTestCases(
  projectId: string,
  testCaseIds: string[]
) {
  return apiClient.delete<BulkOperationResponse>(
    `/projects/${projectId}/test-cases`,
    {
      data: {
        test_case_ids: testCaseIds,
      },
    }
  );
}

// 批量更新测试用例
export function bulkUpdateTestCases(
  projectId: string,
  testCaseIds: string[],
  updateData: Partial<TestCaseUpdate>
) {
  return apiClient.post(`/projects/${projectId}/test-cases/bulk/update`, {
    test_case_ids: testCaseIds,
    update_data: updateData,
  });
}

// ========== 导出功能 ==========

export type ExportFormat = "excel" | "word" | "json";

export interface ExportTestCasesRequest {
  test_case_ids: string[];
  format: ExportFormat;
  include_attachments?: boolean;
  template?: string;
}

export interface ExportTestCasesResponse {
  success: boolean;
  export_id: string;
  status: string;
  status_url: string;
}

export interface ExportStatusResponse {
  success: boolean;
  export_id: string;
  status: string;
  download_url?: string;
  error_message?: string;
  created_at?: string;
  completed_at?: string;
}

// 导出测试用例
export function exportTestCases(
  projectId: string,
  data: ExportTestCasesRequest
) {
  return apiClient.post<ExportTestCasesResponse>(
    `/projects/${projectId}/test-cases/export`,
    data
  );
}

// 查询导出状态
export function getExportStatus(exportId: string) {
  return apiClient.get<ExportStatusResponse>(
    `/testcase-exports/${exportId}/status`
  );
}

// 下载导出文件
export function downloadExport(exportId: string) {
  // 使用直接的 window.open 方式下载文件
  const url = `/api/v2/testcase-exports/${exportId}/download`;
  window.open(url, '_blank');
}

