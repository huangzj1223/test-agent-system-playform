"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  approveAgentRun,
  getAgentRun,
  listAgentRuns,
  rejectAgentRun,
  type AgentRunInfo,
} from "@/lib/api/agent-runs";
import {
  createConversation,
  getConversation,
  listConversations,
  runAguiStream,
  type AguiEvent,
  type ChatMessageInfo,
  type ConversationInfo,
} from "@/lib/api/agui";

export interface UiChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
}

export interface SendMessageOptions {
  providerId?: string | null;
  modelId?: string | null;
  projectIdentifier?: string;
  targetUrl?: string;
}

const TERMINAL_AGENT_RUN_STATUSES = new Set(["succeeded", "failed", "cancelled"]);

async function waitForAgentRun(runId: string): Promise<AgentRunInfo> {
  for (let attempt = 0; attempt < 305; attempt += 1) {
    const response = await getAgentRun(runId);
    if (TERMINAL_AGENT_RUN_STATUSES.has(response.data.status)) return response.data;
    await new Promise((resolve) => window.setTimeout(resolve, 2000));
  }
  throw new Error("智能体执行超时，请在执行记录中查看最终状态");
}

export function useAguiChat() {
  const [conversations, setConversations] = useState<ConversationInfo[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [activityEvents, setActivityEvents] = useState<AguiEvent[]>([]);
  const [agentRuns, setAgentRuns] = useState<AgentRunInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);

  const loadConversations = useCallback(async () => {
    const result = await listConversations();
    setConversations(result.data);
    return result.data;
  }, []);

  const loadRuns = useCallback(async (conversationId: string) => {
    const result = await listAgentRuns();
    setAgentRuns(result.data.filter((run) => run.conversation_id === conversationId));
  }, []);

  const loadConversation = useCallback(
    async (id: string) => {
      const [result] = await Promise.all([getConversation(id), loadRuns(id)]);
      setActiveConversationId(result.data.id);
      setMessages(
        result.data.messages.map((item: ChatMessageInfo) => ({
          id: item.id,
          role: item.role === "tool" ? "tool" : item.role === "user" ? "user" : "assistant",
          content: item.content,
        }))
      );
    },
    [loadRuns]
  );

  useEffect(() => {
    let mounted = true;
    void loadConversations()
      .then((items) => {
        if (!mounted || items.length === 0) return;
        return loadConversation(items[0].id);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "会话加载失败");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [loadConversation, loadConversations]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) ?? null,
    [activeConversationId, conversations]
  );

  const startNewConversation = useCallback(async () => {
    const result = await createConversation("新的测试对话");
    setConversations((items) => [result.data, ...items]);
    setActiveConversationId(result.data.id);
    setMessages([]);
    setActivityEvents([]);
    setAgentRuns([]);
  }, []);

  const selectConversation = useCallback(
    async (id: string) => {
      setActivityEvents([]);
      await loadConversation(id);
    },
    [loadConversation]
  );

  const sendMessage = useCallback(
    async (content: string, options: SendMessageOptions = {}) => {
      const trimmed = content.trim();
      if (!trimmed || isStreaming) return;

      const userMessage: UiChatMessage = {
        id: `local-user-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      const assistantId = `local-assistant-${Date.now()}`;

      setMessages((items) => [
        ...items,
        userMessage,
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setIsStreaming(true);

      try {
        let streamConversationId = activeConversationId;
        await runAguiStream(
          {
            conversation_id: activeConversationId,
            messages: [{ role: "user", content: trimmed }],
            tools: [{ name: "echo", description: "本地回显工具" }],
            provider_id: options.providerId,
            model_id: options.modelId,
            forwarded_props: {
              ...(options.projectIdentifier
                ? { project_identifier: options.projectIdentifier }
                : {}),
              ...(options.targetUrl ? { target_url: options.targetUrl } : {}),
            },
          },
          (event) => {
            const conversationId = event.conversationId ?? event.conversation_id;
            if (conversationId) {
              streamConversationId = String(conversationId);
              setActiveConversationId(streamConversationId);
            }
            if (event.type === "TEXT_MESSAGE_CONTENT" && typeof event.delta === "string") {
              setMessages((items) =>
                items.map((item) =>
                  item.id === assistantId ? { ...item, content: item.content + event.delta } : item
                )
              );
            }
            if (event.type.startsWith("TOOL_") || event.type.startsWith("AGENT_") || event.type === "ACTION_REQUIRES_APPROVAL") {
              setActivityEvents((items) => [event, ...items].slice(0, 20));
            }
          }
        );
        await loadConversations();
        if (streamConversationId) await loadConversation(streamConversationId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "消息发送失败");
        setMessages((items) =>
          items.map((item) =>
            item.id === assistantId ? { ...item, content: "请求失败，请稍后重试。" } : item
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [activeConversationId, isStreaming, loadConversation, loadConversations]
  );

  const decideAgentRun = useCallback(
    async (runId: string, decision: "approve" | "reject") => {
      setAgentRuns((runs) => runs.map((run) => (run.id === runId ? { ...run, status: decision === "approve" ? "running" : run.status } : run)));
      try {
        const response = decision === "approve" ? await approveAgentRun(runId) : await rejectAgentRun(runId);
        const completedRun = decision === "approve" ? await waitForAgentRun(runId) : response.data;
        setAgentRuns((runs) => runs.map((run) => (run.id === runId ? completedRun : run)));
        if (activeConversationId) await loadConversation(activeConversationId);
        if (decision === "reject") {
          toast.success("已拒绝本次执行");
        } else if (completedRun.status === "succeeded") {
          toast.success("智能体执行已完成");
        } else {
          toast.error(completedRun.error || "智能体执行未成功");
        }
      } catch (error) {
        if (activeConversationId) await loadRuns(activeConversationId);
        toast.error(error instanceof Error ? error.message : "审批操作失败");
      }
    },
    [activeConversationId, loadConversation, loadRuns]
  );

  return {
    activeConversation,
    activeConversationId,
    activityEvents,
    agentRuns,
    conversations,
    decideAgentRun,
    isLoading,
    isStreaming,
    messages,
    selectConversation,
    sendMessage,
    startNewConversation,
  };
}
