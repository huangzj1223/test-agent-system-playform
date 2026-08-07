/**
 * 记忆中心类型定义
 * 智能体长期记忆管理：记忆文件、待确认记忆、版本记录、权限配置、模型建议。
 * 数据全部来自后端 /admin/agent-memory 接口（见 @/api/agentMemory），本文件仅保留类型契约。
 */

/** 记忆文件权限配置 */
export interface MemoryPermission {
  /** 是否启用该记忆文件 */
  enabled: boolean
  /** 是否允许模型读取 */
  canRead: boolean
  /** 是否允许模型建议修改 */
  canSuggest: boolean
  /** 是否允许模型自动写入（低风险） */
  canAutoWrite: boolean
  /** 高风险写入是否需要人工确认 */
  needConfirm: boolean
  /** 是否记录审计日志 */
  auditLog: boolean
}

/** 记忆文件版本记录 */
export interface MemoryVersion {
  /** 版本号，如 v1.3.0 */
  version: string
  /** 更新时间（展示用文本） */
  time: string
  /** 更新人 */
  updater: string
  /** 变更说明 */
  note: string
  /** 是否为当前版本 */
  current: boolean
  /** 该版本的内容快照（回滚时恢复此内容） */
  content: string
}

/** 模型对某记忆文件的写入建议 */
export interface ModelSuggestion {
  /** 建议唯一 ID */
  id: string
  /** 建议内容文本 */
  text: string
}

/** 记忆文件 */
export interface MemoryFile {
  /** 文件标识，等于文件名，如 soul.md */
  id: string
  /** 记忆文件唯一键（=文件名，后端返回；与 id 同值） */
  memoryKey?: string
  /** 分类（internal/project/custom，后端返回） */
  category?: string
  /** 风险等级（L1-L4，后端返回） */
  riskLevel?: string
  /** 是否内置（内置不可删除，后端返回） */
  builtin?: boolean
  /** 排序值（后端返回） */
  sort?: number
  /** 文件名 */
  name: string
  /** 简短描述（列表用），如 智能体身份定义 */
  desc: string
  /** 详情副标题，如 内部记忆 · 智能体身份定义文件 */
  subtitle: string
  /** 是否启用 */
  enabled: boolean
  /** 最近更新（展示用文本） */
  updatedAt: string
  /** 当前版本号 */
  version: string
  /** Markdown 内容 */
  content: string
  /** 创建人 */
  creator: string
  /** 创建时间 */
  createTime: string
  /** 最后更新时间 */
  lastUpdate: string
  /** 更新人 */
  updater: string
  /** 关联记忆文件 ID 列表 */
  relatedIds: string[]
  /** 版本记录 */
  versions: MemoryVersion[]
  /** 权限配置 */
  permission: MemoryPermission
  /** 模型建议 */
  suggestions: ModelSuggestion[]
}

/** 待确认记忆候选 */
export interface PendingMemory {
  /** 唯一 ID */
  id: string
  /** 建议记忆内容 */
  text: string
  /** 建议写入的目标文件 ID */
  target: string
  /** 来源说明 */
  source: string
}

/** 记忆中心统计概览 */
export interface MemoryStats {
  /** 记忆文件数 */
  fileCount: number
  /** 待确认记忆数 */
  pendingCount: number
  /** 最近更新文本 */
  lastUpdate: string
  /** 记忆命中率文本，如 86% */
  hitRate: string
  /** 高风险记忆数 */
  highRisk: number
}
