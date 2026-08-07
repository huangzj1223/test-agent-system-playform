/**
 * 智能测试 API 客户端
 * 提供智能测试任务的创建、查询接口
 */

import { apiClient } from "./client";

// ==================== 类型定义 ====================

export interface SmartTestTask {
  id: string;
  project_identifier: string;
  target_url: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
  created_at: string;
  completed_at: string | null;
  phases: PhaseInfo[];
}

export interface PhaseInfo {
  phase: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  output: Record<string, any>;
  error: string;
  started_at: string;
  completed_at: string;
}

export interface SmartTestTaskListResponse {
  items: SmartTestTask[];
  total: number;
}

export interface SmartTestRunRequest {
  target_url: string;
  description: string;
}

// SSE 事件类型
export type SSEEventType =
  | "PHASE_START"
  | "PHASE_PROGRESS"
  | "PHASE_OUTPUT"
  | "PHASE_COMPLETE"
  | "PHASE_ERROR"
  | "TASK_COMPLETE"
  | "TASK_ERROR";

export interface SSEEvent {
  type: SSEEventType;
  timestamp: string;
  phase?: string;
  name?: string;
  message?: string;
  output?: Record<string, any>;
  summary?: Record<string, any>;
  error?: string;
}

// ==================== API 函数 ====================

/**
 * 启动智能测试任务（SSE 流式响应）
 * 返回一个 ReadableStream reader，前端逐行解析 SSE 事件
 */
export async function runSmartTest(
  projectIdentifier: string,
  params: SmartTestRunRequest
): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const url = `${baseUrl}/api/v2/projects/${projectIdentifier}/smart-test/run`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`智能测试启动失败: ${response.status} ${errorText}`);
  }

  if (!response.body) {
    throw new Error("浏览器不支持流式响应");
  }

  return response.body.getReader();
}

/**
 * 获取历史任务列表
 */
export async function listSmartTestTasks(
  projectIdentifier: string
): Promise<SmartTestTaskListResponse> {
  const response = await apiClient.get<{ data: SmartTestTaskListResponse }>(
    `/projects/${projectIdentifier}/smart-test/tasks`
  );
  return response.data;
}

/**
 * 获取任务详情
 */
export async function getSmartTestTask(
  projectIdentifier: string,
  taskId: string
): Promise<SmartTestTask> {
  const response = await apiClient.get<{ data: SmartTestTask }>(
    `/projects/${projectIdentifier}/smart-test/tasks/${taskId}`
  );
  return response.data;
}

/**
 * 解析 SSE 事件流
 * 将 ReadableStream reader 逐行解析为 SSEEvent 对象
 */
export async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<SSEEvent, void, unknown> {
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // 保留最后一个不完整的行
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const jsonStr = trimmed.slice(6);
        try {
          const event: SSEEvent = JSON.parse(jsonStr);
          yield event;
        } catch {
          // 跳过无法解析的行
          console.warn("SSE parse error:", jsonStr);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
