/**
 * AG-UI 智能体聊天设置 API
 * 对接后端 /admin/ag-ui/setting，按用户隔离持久化对话参数/界面偏好/提示词模板。
 */
import request from '@/utils/http'

/** 对话参数：控制模型生成行为 */
export interface ChatParams {
  /** 采样温度（0-2），缺省走模型默认 */
  temperature?: number
  /** 最大输出 token 数，缺省走模型默认 */
  maxTokens?: number
  /** 系统提示词 */
  systemPrompt: string
}

/** 界面偏好：控制聊天窗口展示 */
export interface UiPrefs {
  /** 消息字号 */
  fontSize: 'small' | 'medium' | 'large'
  /** 消息密度 */
  density: 'compact' | 'comfortable'
  /** 是否显示推理过程 */
  showReasoning: boolean
  /** 是否显示工具调用卡片 */
  showToolCalls: boolean
}

/** 单条快捷提示词模板 */
export interface PromptTemplate {
  /** 模板 ID（前端生成） */
  id: string
  /** 模板标题 */
  title: string
  /** 模板内容（插入输入框的文本） */
  content: string
}

/** 当前主用模型选择（定位到具体供应商配置下的具体模型） */
export interface CurrentModelSelection {
  /** 供应商配置 ID */
  providerConfigId: number
  /** 模型主键 ID */
  modelId: number
}

/** 聊天设置聚合体 */
export interface ChatSetting {
  chatParams: ChatParams
  uiPrefs: UiPrefs
  promptTemplates: PromptTemplate[]
  /** 当前主用模型选择（null 表示未选择） */
  currentModel: CurrentModelSelection | null
}

/**
 * 保存对话参数入参：temperature/maxTokens 允许传 null。
 * null = 清除该字段恢复模型默认（JSON.stringify 保留 null）；
 * 字段缺省 = 本次不改动该字段。不可用 undefined 表达"清除"（会被 JSON.stringify 丢弃）。
 */
export interface SaveChatParams {
  temperature?: number | null
  maxTokens?: number | null
  systemPrompt?: string
}

/**
 * 保存设置入参（各部分均可选，未提供的部分后端保持原值）。
 * currentModel：键缺省=不改；null=清除选择；对象=更新为该选择。
 */
export interface SaveChatSettingPayload {
  chatParams?: SaveChatParams
  uiPrefs?: UiPrefs
  promptTemplates?: PromptTemplate[]
  currentModel?: CurrentModelSelection | null
}

/** 业务限制值（后端全局配置下发，前端据此驱动 UI 限制） */
export interface AgentLimits {
  /** maxTokens 硬上限 */
  maxTokensCeiling: number
  /** 系统提示词最大长度 */
  systemPromptMaxLen: number
  /** 提示词模板条数上限 */
  templateMaxCount: number
  /** 单条模板内容最大长度 */
  templateContentMaxLen: number
  /** 单条模板标题最大长度 */
  templateTitleMaxLen: number
  /** 模型单次运行超时（毫秒） */
  runTimeoutMs: number
}

/** 智能体全局配置（限制值 + 默认界面偏好） */
export interface AgentConfig {
  limits: AgentLimits
  defaultUiPrefs: UiPrefs
}

/** 获取当前用户的聊天设置（无记录后端返回默认值） */
export function fetchChatSetting() {
  return request.get<ChatSetting>({
    url: '/admin/ag-ui/setting'
  })
}

/** 获取智能体全局配置（限制值 + 默认界面偏好），供前端驱动 UI 限制与默认值 */
export function fetchAgentConfig() {
  return request.get<AgentConfig>({
    url: '/admin/ag-ui/config'
  })
}

/** 保存当前用户的聊天设置（与后端现有设置合并） */
export function saveChatSetting(data: SaveChatSettingPayload) {
  return request.post<ChatSetting>({
    url: '/admin/ag-ui/setting',
    data
  })
}
