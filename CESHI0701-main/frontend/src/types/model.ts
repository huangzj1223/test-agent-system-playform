/**
 * 模型配置相关类型定义
 * 覆盖供应商配置、模型配置、当前选择、连接测试与聊天请求参数。
 */

/** 模型供应商枚举 */
export type ModelProvider =
  'openai' | 'anthropic' | 'deepseek' | 'openrouter' | 'azure-openai' | 'openai-compatible'

/** 协议类型（决定请求适配器） */
export type ProtocolType = 'openai-compatible' | 'anthropic' | 'azure-openai' | 'custom'

/** 单个模型配置 */
export interface ModelConfig {
  /** 模型唯一 ID（后端主键） */
  id: number
  /** 所属供应商配置 ID */
  providerConfigId: number
  /** 模型显示名称，如 Claude Opus 4.8 */
  name: string
  /** 模型 ID，如 claude-opus-4-8 */
  modelId: string
  /** 上下文窗口（token） */
  contextWindow?: number
  /** 最大输出长度（token） */
  maxOutputTokens?: number
  /** 模型池分组（如"通用大模型"） */
  poolGroup?: string
  /** 默认采样温度（0-2，缺省走模型默认） */
  defaultTemperature?: number
  /** 默认 Top P（0-1，缺省走模型默认） */
  defaultTopP?: number
  /** 请求超时（秒，缺省走全局默认） */
  timeoutSec?: number
  /** 失败重试次数（缺省走全局默认） */
  retryCount?: number
  /** 支持文本输入 */
  supportText: boolean
  /** 支持图片输入 */
  supportImageInput: boolean
  /** 支持图片输出 */
  supportImageOutput: boolean
  /** 支持工具调用 */
  supportTools: boolean
  /** 支持流式输出 */
  supportStream: boolean
  /** 支持代码生成 */
  supportCode: boolean
  /** 支持长文本处理 */
  supportLongText: boolean
  /** 是否启用 */
  enabled: boolean
  /** 排序值（升序） */
  sort: number
}

/** 供应商配置（apiKey 不下发前端，仅以 hasApiKey 标识是否已配置） */
export interface ModelProviderConfig {
  /** 配置唯一 ID（后端主键） */
  id: number
  /** 配置名称，如 Claude、DeepSeek */
  name: string
  /** 模型供应商 */
  provider: ModelProvider
  /** API Endpoint，如 https://api.anthropic.com */
  apiEndpoint: string
  /** 是否已配置 API Key（后端脱敏返回，绝不含明文密钥） */
  hasApiKey: boolean
  /** 协议类型 */
  protocolType: ProtocolType
  /** API 版本，非必填，如 2023-06-01 */
  apiVersion?: string
  /** 备注，非必填 */
  remark?: string
  /** 配置是否启用 */
  enabled: boolean
  /** 排序值（升序） */
  sort: number
  /** 该配置下的模型列表 */
  models: ModelConfig[]
  /** 创建时间（ISO 字符串） */
  createTime?: string
  /** 更新时间（ISO 字符串） */
  updateTime?: string
}

/** 当前选择的模型（定位到具体配置下的具体模型） */
export interface CurrentModelSelection {
  /** 供应商配置 ID */
  providerConfigId: number
  /** 模型 ID（ModelConfig.id 主键） */
  modelId: number
}

/** 供应商下拉选项 */
export interface ProviderOption {
  /** 供应商值 */
  value: ModelProvider
  /** 展示名称 */
  label: string
}

/** 可用模型（供底部选择器使用，携带供应商上下文） */
export interface AvailableModel {
  /** 供应商配置 ID */
  providerConfigId: number
  /** 供应商展示名称 */
  providerLabel: string
  /** 模型配置 */
  model: ModelConfig
}

/** 按供应商分组的可用模型 */
export interface AvailableModelGroup {
  /** 供应商配置 ID */
  providerConfigId: number
  /** 供应商展示名称 */
  providerLabel: string
  /** 该供应商下的可用模型 */
  models: ModelConfig[]
}

/** 连接测试结果 */
export interface ConnectionTestResult {
  /** 是否成功 */
  success: boolean
  /** 结果消息（失败时为简洁原因，不含完整密钥） */
  message: string
}

/** 聊天消息（供应商无关的通用结构） */
export interface ChatMessage {
  /** 角色 */
  role: 'system' | 'user' | 'assistant'
  /** 文本内容 */
  content: string
}

/**
 * 聊天请求参数（发送时根据当前模型组装）
 * 注意：apiKey/apiEndpoint 不再由前端携带，后端按 providerConfigId+modelId 解密取用。
 */
export interface ChatRequestParams {
  /** 供应商配置 ID（后端据此解密取连接） */
  providerConfigId: number
  /** 模型 ID（供应商侧真实 ID，如 deepseek-chat） */
  modelId: string
  /** 协议类型 */
  protocolType: ProtocolType
  /** 是否流式 */
  stream: boolean
  /** 消息列表 */
  messages: ChatMessage[]
  /** 系统提示词 */
  systemPrompt?: string
  /** 温度 */
  temperature?: number
  /** 最大输出 token */
  maxTokens?: number
}

/** 流式分片回调 */
export type ChatStreamHandler = (chunk: string, done: boolean) => void

/** 流式生成控制器 */
export interface ChatStreamController {
  /** 中断当前生成 */
  abort: () => void
}
