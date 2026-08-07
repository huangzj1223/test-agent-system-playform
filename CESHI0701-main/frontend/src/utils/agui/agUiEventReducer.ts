/**
 * AG-UI 标准事件归约器
 * 将 AG-UI 事件流（@ag-ui/core EventType）归约为面向视图的规范化状态。
 * 组件与模板不做事件判断，只消费归约结果，避免到处写 switch。
 *
 * 关键规则：
 * - TEXT_MESSAGE_CONTENT 按 messageId 追加 delta，不新建消息；
 * - TOOL_CALL_ARGS 按 toolCallId 拼接参数；TOOL_CALL_RESULT 关联同一 toolCallId；
 * - STATE_DELTA 按 JSON Patch(RFC6902) 合并到 agentState；
 * - 未识别事件静默忽略，不产出可见内容；
 * - 幂等：同一事件重复应用不会造成重复追加（依赖 messageId/toolCallId 去重）。
 */
import { EventType } from '@ag-ui/core'
import type { AgUiReducedState, AiChatMessage, AiToolCall } from '@/types/aiChat'
import { parseAgentBlocks } from './agentBlocks'

/** 创建一次运行的初始归约状态 */
export function createInitialReducedState(): AgUiReducedState {
  return {
    messages: [],
    toolCalls: {},
    steps: [],
    reasoning: [],
    agentState: {},
    status: 'idle'
  }
}

/** 查找或创建 assistant 消息 */
function ensureAssistantMessage(state: AgUiReducedState, messageId: string): AiChatMessage {
  let msg = state.messages.find((m) => m.id === messageId)
  if (!msg) {
    msg = {
      id: messageId,
      role: 'assistant',
      content: '',
      streaming: true,
      toolCallIds: [],
      createdAt: Date.now()
    }
    state.messages.push(msg)
  }
  return msg
}

/** 危险键名：阻断原型链污染（__proto__ / constructor / prototype） */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/** 应用 JSON Patch(RFC6902) 的最小子集：add/replace/remove，路径形如 /a/b */
function applyJsonPatch(target: Record<string, unknown>, patch: unknown[]): void {
  for (const op of patch) {
    if (!op || typeof op !== 'object') continue
    const { op: kind, path, value } = op as { op?: string; path?: string; value?: unknown }
    if (!path || typeof path !== 'string') continue
    const keys = path.split('/').filter(Boolean)
    if (!keys.length) continue
    // 事件来自外部（真实 Agent 可能回填模型生成内容），含危险键名的补丁整条丢弃
    if (keys.some((k) => DANGEROUS_KEYS.has(k))) continue
    let node: Record<string, unknown> = target
    let unsafe = false
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i]
      // 仅沿自身属性下钻，避免经由继承属性（如 toString）逃逸到原型
      if (
        !Object.prototype.hasOwnProperty.call(node, k) ||
        typeof node[k] !== 'object' ||
        node[k] === null
      ) {
        node[k] = {}
      }
      const next = node[k]
      if (typeof next !== 'object' || next === null) {
        unsafe = true
        break
      }
      node = next as Record<string, unknown>
    }
    if (unsafe) continue
    const last = keys[keys.length - 1]
    if (kind === 'remove') delete node[last]
    else node[last] = value // add / replace 同义
  }
}

/**
 * 将单个 AG-UI 事件应用到归约状态（原地修改并返回同一引用，便于响应式赋值）
 * @param state 当前归约状态
 * @param event AG-UI 事件（来自 @ag-ui/core，结构由 Zod 校验保证）
 * @returns 更新后的归约状态
 */
export function reduceEvent(
  state: AgUiReducedState,
  event: { type: string } & Record<string, unknown>
): AgUiReducedState {
  switch (event.type) {
    // ---------- 运行生命周期 ----------
    case EventType.RUN_STARTED:
      state.status = 'running'
      state.error = undefined
      break
    case EventType.RUN_FINISHED:
      state.messages.forEach((m) => (m.streaming = false))
      state.reasoning.forEach((r) => (r.streaming = false))
      state.status = 'completed'
      break
    case EventType.RUN_ERROR: {
      const code = event.code as string | undefined
      state.messages.forEach((m) => (m.streaming = false))
      // abort 由上层标记为 aborted，这里仅处理真实错误
      if (code === 'abort') {
        state.status = 'aborted'
      } else {
        state.status = 'error'
        state.error = { code, message: (event.message as string) || '运行失败' }
      }
      break
    }

    // ---------- 文本消息 ----------
    case EventType.TEXT_MESSAGE_START:
      ensureAssistantMessage(state, event.messageId as string)
      state.status = 'streaming'
      break
    case EventType.TEXT_MESSAGE_CONTENT: {
      const msg = ensureAssistantMessage(state, event.messageId as string)
      msg.content += (event.delta as string) || ''
      msg.streaming = true
      // 流式中：仅剥离 agent-blocks 围栏文本并标记 pending，不解析图表（避免每 token 重建）
      const parsed = parseAgentBlocks(msg.content)
      msg.displayText = parsed.displayText
      msg.blocksPending = parsed.pending
      state.status = 'streaming'
      break
    }
    case EventType.TEXT_MESSAGE_END: {
      const msg = state.messages.find((m) => m.id === (event.messageId as string))
      if (msg) {
        msg.streaming = false
        // 消息完整后一次性解析结构化块，供表格/图表渲染
        const parsed = parseAgentBlocks(msg.content)
        msg.displayText = parsed.displayText
        msg.blocks = parsed.blocks
        // 流结束仍有未闭合围栏（截断/异常终止）→ 追加错误块，不静默丢弃内容
        if (parsed.pending) {
          msg.blocks = [...parsed.blocks, { type: 'error', message: '结构化数据未完整生成，请重试' }]
        }
        msg.blocksPending = false
      }
      break
    }

    // ---------- 工具调用 ----------
    case EventType.TOOL_CALL_START: {
      const id = event.toolCallId as string
      const tc: AiToolCall = {
        id,
        name: (event.toolCallName as string) || '工具',
        argsText: '',
        status: 'preparing',
        startedAt: Date.now()
      }
      state.toolCalls[id] = tc
      // 关联到父消息（若有）
      const parentId = event.parentMessageId as string | undefined
      if (parentId) {
        const parent = state.messages.find((m) => m.id === parentId)
        if (parent && !parent.toolCallIds.includes(id)) parent.toolCallIds.push(id)
      }
      state.status = 'waiting-tool'
      break
    }
    case EventType.TOOL_CALL_ARGS: {
      const tc = state.toolCalls[event.toolCallId as string]
      if (tc) {
        tc.argsText += (event.delta as string) || ''
        tc.status = 'args-streaming'
      }
      break
    }
    case EventType.TOOL_CALL_END: {
      const tc = state.toolCalls[event.toolCallId as string]
      if (tc) tc.status = 'executing'
      break
    }
    case EventType.TOOL_CALL_RESULT: {
      const tc = state.toolCalls[event.toolCallId as string]
      if (tc) {
        tc.result = (event.content as string) || ''
        tc.status = 'success'
        tc.finishedAt = Date.now()
      }
      break
    }

    // ---------- 步骤执行 ----------
    case EventType.STEP_STARTED:
      state.steps.push({
        name: (event.stepName as string) || '步骤',
        status: 'running',
        startedAt: Date.now()
      })
      break
    case EventType.STEP_FINISHED: {
      const name = event.stepName as string
      // 就近匹配最后一个同名 running 步骤
      for (let i = state.steps.length - 1; i >= 0; i--) {
        if (state.steps[i].name === name && state.steps[i].status === 'running') {
          state.steps[i].status = 'finished'
          state.steps[i].finishedAt = Date.now()
          break
        }
      }
      break
    }

    // ---------- 状态同步 ----------
    case EventType.STATE_SNAPSHOT:
      state.agentState = (event.snapshot as Record<string, unknown>) || {}
      break
    case EventType.STATE_DELTA:
      if (Array.isArray(event.delta)) applyJsonPatch(state.agentState, event.delta)
      break
    case EventType.MESSAGES_SNAPSHOT: {
      // 用后端权威消息快照重建历史（仅接管 user/assistant 文本消息）
      const list = (event.messages as Array<Record<string, unknown>>) || []
      const rebuilt: AiChatMessage[] = list
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => {
          const content = (m.content as string) || ''
          // assistant 消息可能含 agent-blocks 围栏，重建时同样解析出结构化块
          const parsed = m.role === 'assistant' ? parseAgentBlocks(content) : null
          return {
            id: (m.id as string) || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            role: m.role as AiChatMessage['role'],
            content,
            streaming: false,
            toolCallIds: [],
            createdAt: Date.now(),
            displayText: parsed ? parsed.displayText : undefined,
            blocks: parsed && parsed.blocks.length ? parsed.blocks : undefined
          }
        })
      if (rebuilt.length) state.messages = rebuilt
      break
    }

    // ---------- 推理信息 ----------
    case EventType.REASONING_MESSAGE_START:
    case EventType.REASONING_START: {
      const id = (event.messageId as string) || `reason-${Date.now()}`
      if (!state.reasoning.find((r) => r.id === id)) {
        state.reasoning.push({ id, content: '', streaming: true })
      }
      break
    }
    case EventType.REASONING_MESSAGE_CONTENT: {
      const id = event.messageId as string
      const block = state.reasoning.find((r) => r.id === id)
      if (block) block.content += (event.delta as string) || ''
      break
    }
    case EventType.REASONING_MESSAGE_END:
    case EventType.REASONING_END: {
      const id = event.messageId as string
      const block = state.reasoning.find((r) => r.id === id)
      if (block) block.streaming = false
      break
    }

    // ---------- 活动 / 扩展：仅记录，不直接渲染原始 JSON ----------
    case EventType.ACTIVITY_SNAPSHOT:
    case EventType.ACTIVITY_DELTA:
    case EventType.CUSTOM:
    case EventType.RAW:
      break

    // ---------- 未识别事件：静默忽略，不产出可见内容 ----------
    default:
      break
  }
  return state
}
