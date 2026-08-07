/**
 * AG-UI 智能体对话 Store
 * 维护 threadId / runId / 消息 / Agent state / 工具调用 / 步骤 / 推理 / 运行状态 / 错误，
 * 由事件归约器（agUiEventReducer）驱动更新。
 * 仅持久化可恢复的最小集合（threadId + 消息文本 + 草稿），运行态产物不落盘；不存任何密钥。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createInitialReducedState } from '@/utils/agui/agUiEventReducer'
import { parseAgentBlocks } from '@/utils/agui/agentBlocks'
import { genId } from '@/services/agUiClient'
import {
  fetchConversationList,
  fetchConversationDetail,
  saveConversation,
  deleteConversation,
  type ConversationMeta,
  type PersistMessage
} from '@/api/agentConversation'
import type {
  AgUiReducedState,
  AiChatMessage,
  AgUiModelContext,
  AgUiRunStatus,
  AiToolCallStatus
} from '@/types/aiChat'

/** 会话标题最大长度 */
const TITLE_MAX = 24

export const useAiChatStore = defineStore(
  'aiChatStore',
  () => {
    // ==================== 持久化状态 ====================
    /** 当前会话线程 ID（同一 threadId 保持上下文连续） */
    const threadId = ref<string>(genId('thread'))
    /** 未发送草稿 */
    const draftInput = ref('')
    /** 历史会话元数据列表（由后端加载，仅含标题/时间/条数，不含消息正文） */
    const sessions = ref<ConversationMeta[]>([])

    // ==================== 运行时状态 ====================
    /** 当前运行 ID */
    const runId = ref<string | null>(null)
    /** 归约状态（消息/工具/步骤/推理/agentState/status/error） */
    const reduced = ref<AgUiReducedState>(createInitialReducedState())
    /** 最近一次运行使用的模型上下文（用于重试） */
    const lastModelContext = ref<AgUiModelContext | null>(null)
    /** 最近一次发送的用户文本（用于错误重试重发） */
    const lastUserText = ref('')
    /**
     * 正在删除中的 threadId 集合（运行时，不持久化）。
     * 删除流式会话时，doRun 的 finally 仍会触发 saveCurrentSession，
     * 若不拦截，POST /save 可能在 DELETE 之后落盘导致被删会话"复活"。
     * saveCurrentSession 保存前检查此集合，命中则跳过。
     */
    const pendingDeletes = ref<Set<string>>(new Set())

    // ==================== 派生 ====================
    /** 消息列表 */
    const messages = computed(() => reduced.value.messages)
    /** 工具调用（按开始时间排序的数组视图） */
    const toolCalls = computed(() =>
      Object.values(reduced.value.toolCalls).sort((a, b) => a.startedAt - b.startedAt)
    )
    /** 步骤列表 */
    const steps = computed(() => reduced.value.steps)
    /** 推理块列表 */
    const reasoning = computed(() => reduced.value.reasoning)
    /** 运行状态 */
    const status = computed(() => reduced.value.status)
    /** 错误 */
    const error = computed(() => reduced.value.error)
    /** 是否正在运行（连接/运行/流式/等待工具/中断均视为进行中） */
    const isRunning = computed(() =>
      ['connecting', 'running', 'streaming', 'waiting-tool', 'interrupted'].includes(
        reduced.value.status
      )
    )

    // ==================== Actions ====================
    /** 设置草稿 */
    const setDraft = (text: string) => {
      draftInput.value = text
    }

    /** 重置归约状态（保留消息历史，仅清运行态产物） */
    const resetReduced = () => {
      reduced.value.toolCalls = {}
      reduced.value.steps = []
      reduced.value.reasoning = []
      reduced.value.status = 'idle'
      reduced.value.error = undefined
    }

    /** 初始化：从后端拉取当前用户的会话元数据列表（面板挂载时调用） */
    const initSessions = async () => {
      try {
        const res = await fetchConversationList()
        sessions.value = res.data || []
      } catch {
        // 拉取失败（未登录/网络）时静默置空，不阻断面板使用
        sessions.value = []
      }
    }

    /** 新建会话：先保存当前会话，再开新线程、清空全部状态 */
    const newThread = async () => {
      await saveCurrentSession()
      threadId.value = genId('thread')
      runId.value = null
      reduced.value = createInitialReducedState()
      lastModelContext.value = null
      lastUserText.value = ''
    }

    /** 生成会话标题：取首条用户消息文本，截断（仅依赖 role/content，兼容持久化消息） */
    const buildTitle = (msgs: Pick<AiChatMessage, 'role' | 'content'>[]): string => {
      const firstUser = msgs.find((m) => m.role === 'user')
      const text = (firstUser?.content || '新会话').trim().replace(/\s+/g, ' ')
      return text.length > TITLE_MAX ? `${text.slice(0, TITLE_MAX)}…` : text
    }

    /**
     * 保存当前会话到后端（仅含 user/assistant 已完成消息，持久化为 Markdown 文件）。
     * 无有效消息则不保存；后端按 threadId upsert。保存后同步更新本地元数据列表。
     */
    const saveCurrentSession = async () => {
      // 该会话正在删除中则跳过保存，避免删除后被 doRun 收尾的自动保存"复活"
      if (pendingDeletes.value.has(threadId.value)) return
      const valid = reduced.value.messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .filter((m) => m.content || m.blocks?.length)
      if (!valid.length) return
      // 快照：仅保留后端白名单字段，剥离运行态字段（streaming/toolCallIds/sendStatus/
      // displayText/blocksPending），否则 forbidNonWhitelisted 校验会拒绝（400）。
      const snapshot: PersistMessage[] = valid.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
        ...(m.blocks?.length ? { blocks: m.blocks } : {})
      }))
      const title = buildTitle(snapshot)
      const existing = sessions.value.find((s) => s.threadId === threadId.value)
      try {
        const res = await saveConversation({
          threadId: threadId.value,
          title,
          messages: snapshot,
          createdAt: existing?.createdAt
        })
        // 用后端回传的元数据 upsert 本地列表
        const meta = res.data
        const idx = sessions.value.findIndex((s) => s.threadId === threadId.value)
        if (idx >= 0) sessions.value[idx] = meta
        else sessions.value.unshift(meta)
      } catch {
        // 保存失败不阻断当前对话，下次操作会重试保存
      }
    }

    /**
     * 加载指定历史会话为当前会话：先保存当前会话，再从后端拉取目标会话完整消息。
     * 注意：不因 id === threadId 直接返回——刷新后消息为运行态未落盘，
     * 需允许对当前 threadId 重新拉取消息以恢复对话内容（修复点击历史无响应问题）。
     */
    const loadSession = async (id: string) => {
      // 切换到其他会话时先保存当前；点击的就是当前会话则无需保存
      if (id !== threadId.value) await saveCurrentSession()
      let detail
      try {
        const res = await fetchConversationDetail(id)
        detail = res.data
      } catch {
        return // 拉取失败，保持现状
      }
      if (!detail) return
      threadId.value = detail.threadId
      runId.value = null
      reduced.value = createInitialReducedState()
      // 恢复历史消息：后端只存白名单字段，需补齐运行态默认值，并对 assistant 消息
      // 重新解析 agent-blocks 围栏算出 displayText/blocks——否则 content 里的原始协议
      // JSON 文本会被渲染层兜底展示给用户（与 MESSAGES_SNAPSHOT 重建逻辑保持一致）。
      reduced.value.messages = (detail.messages || []).map((m) => {
        if (m.role === 'assistant') {
          const parsed = parseAgentBlocks(m.content)
          return {
            ...m,
            streaming: false,
            blocksPending: false,
            toolCallIds: m.toolCallIds ?? [],
            displayText: parsed.displayText,
            blocks: m.blocks?.length ? m.blocks : parsed.blocks.length ? parsed.blocks : undefined
          }
        }
        return {
          ...m,
          streaming: false,
          blocksPending: false,
          toolCallIds: m.toolCallIds ?? [],
          sendStatus: m.sendStatus ?? 'sent'
        }
      })
      reduced.value.status = 'completed'
      lastModelContext.value = null
      lastUserText.value = ''
    }

    /** 删除历史会话；删除的是当前会话则同时新建空会话 */
    const deleteSession = async (id: string) => {
      // 同步标记删除中：拦截 doRun 收尾对同一 threadId 的自动保存，防止文件"复活"
      pendingDeletes.value.add(id)
      try {
        await deleteConversation(id)
      } catch {
        return // 删除失败则不改动本地列表
      } finally {
        pendingDeletes.value.delete(id)
      }
      sessions.value = sessions.value.filter((s) => s.threadId !== id)
      if (id === threadId.value) {
        threadId.value = genId('thread')
        reduced.value = createInitialReducedState()
        runId.value = null
      }
    }

    /** 历史会话列表（按更新时间倒序，供 UI 展示） */
    const sessionList = computed(() =>
      [...sessions.value].sort((a, b) => b.updatedAt - a.updatedAt)
    )

    /** 追加一条用户消息，返回其 ID */
    const addUserMessage = (content: string): string => {
      const msg: AiChatMessage = {
        id: genId('msg'),
        role: 'user',
        content,
        streaming: false,
        sendStatus: 'sent',
        toolCallIds: [],
        createdAt: Date.now()
      }
      reduced.value.messages.push(msg)
      lastUserText.value = content
      return msg.id
    }

    /** 更新指定用户消息的发送态 */
    const setMessageSendStatus = (id: string, sendStatus: AiChatMessage['sendStatus']) => {
      const msg = reduced.value.messages.find((m) => m.id === id)
      if (msg) msg.sendStatus = sendStatus
    }

    /** 直接设置运行状态（供上层处理 connecting / aborted 等边界态） */
    const setStatus = (s: AgUiRunStatus) => {
      reduced.value.status = s
    }

    /** 设置错误并置 status=error（供客户端侧异常兜底展示错误卡片） */
    const setError = (message: string, code = 'client') => {
      reduced.value.error = { code, message }
      reduced.value.status = 'error'
    }

    /** 标记所有流式内容为已停止（停止生成时调用，清除残留流式光标） */
    const markStreamingStopped = () => {
      reduced.value.messages.forEach((m) => (m.streaming = false))
      reduced.value.reasoning.forEach((r) => (r.streaming = false))
    }

    /** 开始一次运行：生成 runId、记录模型上下文、清理上一轮运行态产物 */
    const beginRun = (model: AgUiModelContext): string => {
      resetReduced()
      lastModelContext.value = model
      runId.value = genId('run')
      reduced.value.status = 'connecting'
      return runId.value
    }

    /** 取某条 assistant 消息关联的工具调用 */
    const getToolCallsForMessage = (messageId: string) => {
      const msg = reduced.value.messages.find((m) => m.id === messageId)
      if (!msg) return []
      return msg.toolCallIds.map((id) => reduced.value.toolCalls[id]).filter(Boolean)
    }

    /** 本轮运行结束后仍处于 executing（END 已到、待前端执行）的工具调用 */
    const getPendingToolCalls = () =>
      Object.values(reduced.value.toolCalls).filter((tc) => tc.status === 'executing')

    /** 更新某工具调用的状态（供前端执行闭环驱动） */
    const setToolCallStatus = (id: string, status: AiToolCallStatus) => {
      const tc = reduced.value.toolCalls[id]
      if (tc) tc.status = status
    }

    /** 写入某工具调用的执行结果（成功/失败），并置终态与耗时 */
    const setToolCallResult = (
      id: string,
      payload: { result?: string; error?: string; status: AiToolCallStatus }
    ) => {
      const tc = reduced.value.toolCalls[id]
      if (!tc) return
      if (payload.result !== undefined) tc.result = payload.result
      if (payload.error !== undefined) tc.error = payload.error
      tc.status = payload.status
      tc.finishedAt = Date.now()
    }

    return {
      threadId,
      draftInput,
      sessions,
      sessionList,
      runId,
      reduced,
      lastModelContext,
      lastUserText,
      messages,
      toolCalls,
      steps,
      reasoning,
      status,
      error,
      isRunning,
      // actions
      setDraft,
      resetReduced,
      initSessions,
      newThread,
      saveCurrentSession,
      loadSession,
      deleteSession,
      addUserMessage,
      setMessageSendStatus,
      setStatus,
      setError,
      markStreamingStopped,
      beginRun,
      getToolCallsForMessage,
      getPendingToolCalls,
      setToolCallStatus,
      setToolCallResult
    }
  },
  {
    persist: {
      key: 'aiChat',
      storage: localStorage,
      // 仅持久化线程 ID 与草稿；会话历史改由后端 Markdown 文件存储，运行态产物不落盘。
      pick: ['threadId', 'draftInput']
    }
  }
)
