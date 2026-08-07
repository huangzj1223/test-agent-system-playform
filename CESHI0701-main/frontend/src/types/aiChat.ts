/**
 * AG-UI 聊天相关类型定义
 * 面向前端视图的规范化模型：由 AG-UI 标准事件归约（reduce）而来，
 * 组件只消费此处类型，不直接接触原始事件。
 */
import type { MessageBlock } from './agent-message'

/** Agent 运行状态机 */
export type AgUiRunStatus =
  | 'idle' // 空闲
  | 'connecting' // 正在建立连接
  | 'running' // Agent 正在运行
  | 'streaming' // 正在接收文本
  | 'waiting-tool' // 等待工具执行
  | 'interrupted' // 等待用户确认或补充信息
  | 'completed' // 运行完成
  | 'aborted' // 用户停止
  | 'error' // 运行失败

/** 消息角色 */
export type AiMessageRole = 'user' | 'assistant' | 'system' | 'tool'

/** 消息发送态（仅用户消息使用） */
export type AiMessageSendStatus = 'sending' | 'sent' | 'failed'

/** 工具调用状态 */
export type AiToolCallStatus =
  | 'preparing' // 准备调用
  | 'args-streaming' // 参数生成中
  | 'awaiting-confirmation' // 等待用户确认（高风险操作）
  | 'executing' // 执行中
  | 'success' // 执行成功
  | 'error' // 执行失败
  | 'cancelled' // 用户取消

/** 步骤状态 */
export type AiStepStatus = 'running' | 'finished'

/** 规范化的聊天消息 */
export interface AiChatMessage {
  /** 消息 ID（对应 AG-UI messageId） */
  id: string
  /** 角色 */
  role: AiMessageRole
  /** 文本内容（流式累加，支持 Markdown） */
  content: string
  /** 是否正在流式生成 */
  streaming: boolean
  /** 发送态（用户消息用于失败重发） */
  sendStatus?: AiMessageSendStatus
  /** 关联的工具调用 ID 列表（assistant 消息） */
  toolCallIds: string[]
  /** 创建时间戳（毫秒） */
  createdAt: number
  /**
   * 结构化消息块（表格 / 图表 / 代码 / 错误）。
   * 由 content 中的 ```agent-blocks``` 协议解析而来，流式结束后填充。
   */
  blocks?: MessageBlock[]
  /** content 去除 agent-blocks 围栏后的纯 Markdown 文本（供渲染，避免展示协议原文） */
  displayText?: string
  /** 是否检测到未闭合的 agent-blocks 围栏（流式中，显示"正在生成图表"） */
  blocksPending?: boolean
}

/** 工具调用（规范化） */
export interface AiToolCall {
  /** 工具调用 ID（对应 AG-UI toolCallId） */
  id: string
  /** 工具名称 */
  name: string
  /** 累加的参数原始 JSON 字符串（流式拼接） */
  argsText: string
  /** 执行结果文本 */
  result?: string
  /** 状态 */
  status: AiToolCallStatus
  /** 错误信息（脱敏后） */
  error?: string
  /** 开始时间戳（毫秒） */
  startedAt: number
  /** 结束时间戳（毫秒），用于计算耗时 */
  finishedAt?: number
}

/** 执行步骤（规范化） */
export interface AiRunStep {
  /** 步骤名称（对应 AG-UI stepName） */
  name: string
  /** 状态 */
  status: AiStepStatus
  /** 开始时间戳（毫秒） */
  startedAt: number
  /** 结束时间戳（毫秒） */
  finishedAt?: number
}

/** 推理内容块（规范化，默认折叠展示） */
export interface AiReasoningBlock {
  /** 推理消息 ID */
  id: string
  /** 累加的推理文本 */
  content: string
  /** 是否仍在流式 */
  streaming: boolean
}

/** 错误信息（脱敏，供错误卡片展示） */
export interface AiRunError {
  /** 错误码（如 abort / auth / timeout / rate_limit / agent） */
  code?: string
  /** 可读的错误消息（已脱敏） */
  message: string
}

/** 归约器对外产出的一次运行的全部规范化状态 */
export interface AgUiReducedState {
  /** 消息列表 */
  messages: AiChatMessage[]
  /** 工具调用表：toolCallId -> AiToolCall */
  toolCalls: Record<string, AiToolCall>
  /** 步骤列表（按开始顺序） */
  steps: AiRunStep[]
  /** 推理块列表 */
  reasoning: AiReasoningBlock[]
  /** Agent 共享 state（STATE_SNAPSHOT / STATE_DELTA 合并结果） */
  agentState: Record<string, unknown>
  /** 运行状态 */
  status: AgUiRunStatus
  /** 错误（status==='error' 时存在） */
  error?: AiRunError
}

/** 历史会话（持久化到 localStorage，仅存已完成消息） */
export interface ChatSession {
  /** 会话线程 ID */
  threadId: string
  /** 会话标题（取首条用户消息，截断） */
  title: string
  /** 会话消息（仅 user/assistant 文本 + 结构化块，不含运行态） */
  messages: AiChatMessage[]
  /** 创建时间戳（毫秒） */
  createdAt: number
  /** 最后更新时间戳（毫秒） */
  updatedAt: number
}

/**
 * 发起一次运行所需的模型上下文。
 *
 * 原型阶段（方案 B）：模型配置存于浏览器 localStorage，后端不落库，
 * 因此每次运行随请求携带 endpoint/apiKey/协议给后端直连模型。
 * 注意：apiKey 会经 localhost 传给后端，仅限本地原型；生产须改为后端加密存储。
 */
export interface AgUiModelContext {
  /** 供应商配置 ID（后端据此解密取连接） */
  providerConfigId: number
  /** 供应商侧模型 ID，如 deepseek-chat */
  modelId: string
  /** 协议类型，如 openai-compatible */
  protocolType: string
  /** Agent ID（可选） */
  agentId?: string
}
