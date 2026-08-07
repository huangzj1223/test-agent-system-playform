/**
 * AG-UI 智能体会话历史 API
 * 对接后端 /admin/ag-ui/conversation，会话以 Markdown 文件按用户隔离持久化。
 */
import request from '@/utils/http'
import type { AiChatMessage } from '@/types/aiChat'

/** 会话元数据（列表项，不含消息正文） */
export interface ConversationMeta {
  /** 会话线程 ID */
  threadId: string
  /** 会话标题 */
  title: string
  /** 创建时间戳（毫秒） */
  createdAt: number
  /** 最后更新时间戳（毫秒） */
  updatedAt: number
  /** 消息条数 */
  messageCount: number
}

/** 会话完整数据（含消息） */
export interface ConversationDetail extends ConversationMeta {
  /** 会话消息列表 */
  messages: AiChatMessage[]
}

/**
 * 持久化消息（仅后端白名单允许的字段）。
 * 后端 DTO 开启 forbidNonWhitelisted，运行态字段（streaming/toolCallIds/sendStatus 等）
 * 必须在前端剥离后再上报，否则会被校验拒绝（400）。
 */
export type PersistMessage = Pick<AiChatMessage, 'id' | 'role' | 'content' | 'createdAt' | 'blocks'>

/** 保存会话入参 */
export interface SaveConversationPayload {
  threadId: string
  title: string
  messages: PersistMessage[]
  createdAt?: number
}

/** 获取当前用户的会话历史列表（按更新时间倒序） */
export function fetchConversationList() {
  return request.get<ConversationMeta[]>({
    url: '/admin/ag-ui/conversation/list'
  })
}

/** 获取单个会话完整内容（含消息）；不存在返回 null */
export function fetchConversationDetail(threadId: string) {
  return request.get<ConversationDetail | null>({
    url: `/admin/ag-ui/conversation/info/${encodeURIComponent(threadId)}`
  })
}

/** 保存或更新会话（upsert） */
export function saveConversation(data: SaveConversationPayload) {
  return request.post<ConversationMeta>({
    url: '/admin/ag-ui/conversation/save',
    data
  })
}

/** 删除会话 */
export function deleteConversation(threadId: string) {
  return request.del<{ success: boolean }>({
    url: `/admin/ag-ui/conversation/delete/${encodeURIComponent(threadId)}`
  })
}

/** 清空当前用户的全部会话历史，返回删除数量 */
export function clearConversations() {
  return request.del<{ success: boolean; removed: number }>({
    url: '/admin/ag-ui/conversation/clear'
  })
}
