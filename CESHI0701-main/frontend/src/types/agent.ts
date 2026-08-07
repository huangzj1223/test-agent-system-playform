/**
 * 智能体对话侧边栏相关类型定义
 */

/** 消息角色 */
export type AgentMessageRole = 'user' | 'assistant'

/** 消息状态 */
export type AgentMessageStatus = 'pending' | 'streaming' | 'done' | 'stopped' | 'error'

/** 附件 */
export interface AgentAttachment {
  /** 附件唯一 ID */
  id: string
  /** 文件名 */
  name: string
  /** 访问地址（图片可直接预览） */
  url: string
  /** 文件字节大小 */
  size: number
  /** MIME 类型 */
  type: string
  /** 是否为图片（用于消息区图文渲染） */
  isImage: boolean
}

/** 单条消息 */
export interface AgentMessage {
  /** 消息唯一 ID */
  id: string
  /** 所属会话 ID */
  conversationId: string
  /** 角色 */
  role: AgentMessageRole
  /** 文本内容（支持 Markdown） */
  content: string
  /** 附件列表 */
  attachments: AgentAttachment[]
  /** 消息状态 */
  status: AgentMessageStatus
  /** 创建时间戳（毫秒） */
  createdAt: number
}

/** 会话 */
export interface AgentConversation {
  /** 会话唯一 ID */
  id: string
  /** 会话标题 */
  title: string
  /** 所属智能体名称 */
  agentName: string
  /** 最近更新时间戳（毫秒） */
  updatedAt: number
}

/** 可选模型 */
export interface AgentModel {
  /** 模型标识 */
  value: string
  /** 模型展示名 */
  label: string
}

/** 发送消息入参 */
export interface SendMessagePayload {
  /** 会话 ID */
  conversationId: string
  /** 文本内容 */
  content: string
  /** 使用的模型标识 */
  model: string
  /** 附件列表 */
  attachments?: AgentAttachment[]
}

/** 流式分片回调 */
export type StreamChunkHandler = (chunk: string, done: boolean) => void

/** 流式生成控制器 */
export interface StreamController {
  /** 中断当前生成 */
  abort: () => void
}
