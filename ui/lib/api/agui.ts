import { getToken } from "@/lib/auth";
import { apiClient } from "./client";
import type { ApiSuccess } from "./auth";

export interface AguiMessageInput {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
}

export interface AguiToolInput {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface AguiEvent {
  type: string;
  conversation_id?: string | null;
  message_id?: string;
  tool_call_id?: string;
  delta?: string;
  result?: string;
  [key: string]: unknown;
}

export interface ConversationInfo {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string | null;
}

export interface ChatMessageInfo {
  id: string;
  role: string;
  content: string;
  blocks: unknown[];
  tool_calls: unknown[];
  created_at: string;
}

export interface ConversationDetail extends ConversationInfo {
  messages: ChatMessageInfo[];
}

export function listConversations() {
  return apiClient.get<ApiSuccess<ConversationInfo[]>>("/conversations");
}

export function createConversation(title?: string) {
  return apiClient.post<ApiSuccess<ConversationInfo>>("/conversations", { title });
}

export function getConversation(id: string) {
  return apiClient.get<ApiSuccess<ConversationDetail>>(`/conversations/${id}`);
}

export async function runAguiStream(
  body: {
    conversation_id?: string | null;
    messages: AguiMessageInput[];
    tools?: AguiToolInput[];
    provider_id?: string | null;
    model_id?: string | null;
    forwarded_props?: Record<string, unknown>;
  },
  onEvent: (event: AguiEvent) => void
) {
  const token = getToken();
  const response = await fetch("/api/v2/agui/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) {
    throw new Error(`AG-UI 请求失败：${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const dataLine = chunk.split("\n").find((line) => line.startsWith("data: "));
      if (!dataLine) continue;
      onEvent(JSON.parse(dataLine.slice(6)) as AguiEvent);
    }
  }
}
