
/**
 * API 测试相关的扩展 API 客户端函数
 * 包含按文件夹查询等功能
 */
// FIXME  MC8yOmFIVnBZMlhwdTRUbGphRG1zWjg2YWsxSVFRPT06MWQ1Y2I4Y2E=

import { apiClient } from "./client";
import type {
  APITest,
  APITestListResponse,
} from "./api-tests";
// TODO  MS8yOmFIVnBZMlhwdTRUbGphRG1zWjg2YWsxSVFRPT06MWQ1Y2I4Y2E=

/**
 * 获取指定文件夹下的 API 测试列表
 */
export function getFolderAPITests(
  projectIdentifier: string,
  folderId: string,
  params?: {
    page?: number;
    page_size?: number;
    search?: string;
  }
): Promise<APITestListResponse> {
  return apiClient.get<APITestListResponse>(
    `/projects/${projectIdentifier}/folders/${folderId}/api-tests`,
    { params }
  );
}
