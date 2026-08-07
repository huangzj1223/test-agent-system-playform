/**
 * 运行日志类型定义、显示元数据与工具方法
 * 统一查看智能体对话、Skill 调用、工具执行、记忆命中、错误与系统事件日志。
 * 数据结构按可接后端拆分，供 filterRunLogs 在前端做组合过滤，后续替换 mock 工厂即可接入接口。
 */

/** 日志类型：对话 / 技能调用 / 工具执行 / 错误 / 记忆命中 / 系统事件 */
export type LogType = 'conversation' | 'skill' | 'tool' | 'error' | 'memory' | 'system'

/** 执行状态：成功 / 失败 / 进行中 / 已取消 / 已拦截 */
export type LogStatus = 'success' | 'failed' | 'running' | 'cancelled' | 'blocked'

/** 风险等级：L1 只读 / L2 低风险写入 / L3 写入修改 / L4 高风险执行 */
export type RiskLevel = 'L1' | 'L2' | 'L3' | 'L4'

/** 智能体运行日志 */
export interface AgentRunLog {
  /** 日志唯一 ID */
  id: string
  /** 会话 ID */
  sessionId: string
  /** 请求 ID */
  requestId: string
  /** 智能体名称 */
  agentName: string
  /** 日志类型 */
  type: LogType
  /** 执行状态 */
  status: LogStatus
  /** 内容摘要 */
  summary: string
  /** 开始时间（展示用文本） */
  startedAt: string
  /** 结束时间（展示用文本，进行中可缺省） */
  endedAt?: string
  /** 总耗时（毫秒） */
  durationMs: number
  /** 操作用户 */
  user?: string
  /** 来源页面 */
  sourcePage?: string
  /** 关联 Skill 名称 */
  skillName?: string
  /** 关联工具名称 */
  toolName?: string
  /** 风险等级 */
  riskLevel?: RiskLevel
  /** 是否已处理（错误类日志可标记） */
  processed?: boolean
  /**
   * 按类型不同的专属详情内容。
   * 有意使用 any：6 种日志类型的详情字段结构各异（对话/技能/工具/错误/记忆/系统），
   * 由 RunLogDetailDrawer 按 type 分派渲染，此处不做联合类型收窄以保持 mock/接后端的灵活性。
   */
  detail: Record<string, any>
}

/** 前端组合过滤条件 */
export interface RunLogFilter {
  /** 分类（空串=全部） */
  category: LogType | ''
  /** 关键词（摘要 / SkillName / toolName / 错误信息 / 会话 ID / 日志 ID） */
  keyword: string
  /** 日期范围 [开始, 结束]，格式 YYYY-MM-DD */
  dateRange: [string, string] | null
  /** 智能体名称（空串=全部） */
  agent: string
  /** 状态（空串=全部） */
  status: LogStatus | ''
}

/** 日志分类计数 */
export interface LogCategoryCount {
  /** 分类 key */
  key: LogType
  /** 该分类展示计数（独立展示口径，非表格实际条数） */
  count: number
}

/** Element Plus Tag 支持的语义类型 */
type TagType = 'primary' | 'success' | 'warning' | 'danger' | 'info'

/**
 * 日志类型 → 显示配置
 * className 用于叠加 Element 原生不支持的配色（紫色 / 青色）。
 */
export const LOG_TYPE_META: Record<
  LogType,
  { label: string; tagType: TagType; icon: string; className: string }
> = {
  conversation: { label: '对话', tagType: 'primary', icon: '&#xe6d0;', className: 'lt-conversation' },
  skill: { label: '技能调用', tagType: 'primary', icon: '&#xe72e;', className: 'lt-skill' },
  tool: { label: '工具执行', tagType: 'warning', icon: '&#xe816;', className: 'lt-tool' },
  error: { label: '错误', tagType: 'danger', icon: '&#xe6a1;', className: 'lt-error' },
  memory: { label: '记忆命中', tagType: 'primary', icon: '&#xe764;', className: 'lt-memory' },
  system: { label: '系统事件', tagType: 'info', icon: '&#xe602;', className: 'lt-system' }
}

/**
 * 执行状态 → 显示配置
 * className 用于叠加原生不支持的配色（进行中蓝色）。
 */
export const LOG_STATUS_META: Record<
  LogStatus,
  { label: string; tagType: TagType; className: string }
> = {
  success: { label: '成功', tagType: 'success', className: 'ls-success' },
  failed: { label: '失败', tagType: 'danger', className: 'ls-failed' },
  running: { label: '进行中', tagType: 'primary', className: 'ls-running' },
  cancelled: { label: '已取消', tagType: 'info', className: 'ls-cancelled' },
  blocked: { label: '已拦截', tagType: 'warning', className: 'ls-blocked' }
}

/** 分类导航图标（分类 key → iconfont 占位字符） */
export const CATEGORY_ICONS: Record<LogType, string> = {
  conversation: '&#xe6d0;',
  skill: '&#xe72e;',
  tool: '&#xe816;',
  error: '&#xe6a1;',
  memory: '&#xe764;',
  system: '&#xe602;'
}

/** 状态筛选下拉选项 */
export const STATUS_OPTIONS: { value: LogStatus; label: string }[] = (
  Object.keys(LOG_STATUS_META) as LogStatus[]
).map((value) => ({ value, label: LOG_STATUS_META[value].label }))

/** 日志类型 → 显示名 */
export function getLogTypeLabel(type: LogType): string {
  return LOG_TYPE_META[type]?.label ?? type
}

/** 日志类型 → Tag 语义类型 */
export function getLogTypeTagType(type: LogType): TagType {
  return LOG_TYPE_META[type]?.tagType ?? 'info'
}

/** 状态 → 显示名 */
export function getLogStatusLabel(status: LogStatus): string {
  return LOG_STATUS_META[status]?.label ?? status
}

/** 状态 → Tag 语义类型 */
export function getLogStatusTagType(status: LogStatus): TagType {
  return LOG_STATUS_META[status]?.tagType ?? 'info'
}

/**
 * 毫秒 → 耗时文本
 * < 1s 显示毫秒（如 20ms），否则保留两位小数的秒（如 12.34s）。
 */
export function formatDuration(durationMs: number): string {
  if (durationMs < 0) return '-'
  if (durationMs < 1000) return `${durationMs}ms`
  return `${(durationMs / 1000).toFixed(2)}s`
}

/**
 * 组合过滤日志
 * 分类、关键词、日期范围、智能体、状态多条件同时生效（AND 关系）。
 * @param logs 全量日志
 * @param filter 过滤条件
 * @returns 过滤后的日志
 */
export function filterRunLogs(logs: AgentRunLog[], filter: RunLogFilter): AgentRunLog[] {
  const kw = filter.keyword.trim().toLowerCase()
  return logs.filter((log) => {
    // 分类
    if (filter.category && log.type !== filter.category) return false
    // 智能体
    if (filter.agent && log.agentName !== filter.agent) return false
    // 状态
    if (filter.status && log.status !== filter.status) return false
    // 日期范围（按开始时间的日期部分比较）
    if (filter.dateRange && filter.dateRange[0] && filter.dateRange[1]) {
      const day = log.startedAt.slice(0, 10)
      if (day < filter.dateRange[0] || day > filter.dateRange[1]) return false
    }
    // 关键词：摘要 / Skill / 工具 / 会话 ID / 日志 ID / 错误信息
    if (kw) {
      const errorMessage = typeof log.detail?.errorMessage === 'string' ? log.detail.errorMessage : ''
      const haystack = [log.summary, log.skillName, log.toolName, log.sessionId, log.id, errorMessage]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(kw)) return false
    }
    return true
  })
}
