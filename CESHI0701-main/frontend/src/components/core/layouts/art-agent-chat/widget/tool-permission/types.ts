/**
 * 工具权限类型定义与显示元数据
 * 管理智能体可调用的工具（CLI/API/数据库/文件系统/页面操作/浏览器控制/外部服务）。
 * 数据结构按可接后端拆分，供 checkToolPermission 在 Skills 执行前做权限检查。
 */

/** 工具类型 */
export type ToolType = 'cli' | 'api' | 'database' | 'filesystem' | 'page' | 'browser' | 'external'

/** 风险等级：L1 只读 / L2 低风险写入 / L3 写入修改 / L4 高风险执行 */
export type RiskLevel = 'L1' | 'L2' | 'L3' | 'L4'

/** 工具动作（供权限检查区分读写） */
export type ToolAction = 'read' | 'write' | 'delete' | 'execute'

/** 智能体工具 */
export interface AgentTool {
  /** 唯一 ID */
  id: string
  /** 工具名称 */
  name: string
  /** 工具标识（唯一 key，供 checkToolPermission 定位） */
  key: string
  /** 工具类型 */
  type: ToolType
  /** 工具描述 */
  description: string
  /** 风险等级 */
  riskLevel: RiskLevel
  /** 是否启用 */
  enabled: boolean
  /** 是否需要人工确认 */
  requireConfirm: boolean
  /** 适用智能体 */
  applicableAgents: string[]
  /** 按类型不同的专属配置 */
  config: Record<string, unknown>
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/** 权限检查结果 */
export interface ToolPermissionCheckResult {
  /** 是否允许执行 */
  allowed: boolean
  /** 风险等级 */
  riskLevel: RiskLevel
  /** 是否需要人工确认 */
  requireConfirm: boolean
  /** 不允许 / 需确认的原因 */
  reason?: string
}

/** 工具调用日志 */
export interface ToolCallLog {
  /** 日志 ID */
  id: string
  /** 工具标识 */
  toolKey: string
  /** 调用时间 */
  time: string
  /** 调用智能体 */
  agent: string
  /** 关联 Skill */
  skill: string
  /** 输入参数（JSON 文本） */
  params: string
  /** 执行状态 */
  success: boolean
  /** 耗时文本，如 12.34s */
  duration: string
  /** 操作人 */
  operator: string
}

/** 工具统计概览 */
export interface ToolStats {
  /** 全部工具 */
  total: number
  /** 已启用 */
  enabled: number
  /** 高风险工具（L3/L4） */
  highRisk: number
  /** 今日调用次数 */
  callsToday: number
}

/** 工具分类计数 */
export interface ToolCategoryCount {
  /** 分类 key */
  key: ToolType
  /** 分类下工具数量 */
  count: number
}

/** 工具类型 → 显示名 */
export const TYPE_LABELS: Record<ToolType, string> = {
  cli: 'CLI 工具',
  api: 'API 接口',
  database: '数据库',
  filesystem: '文件系统',
  page: '页面操作',
  browser: '浏览器控制',
  external: '外部服务'
}

/** 工具类型 → iconfont 占位字符（用于分类导航与表格） */
export const TYPE_ICONS: Record<ToolType, string> = {
  cli: '&#xe816;',
  api: '&#xe70b;',
  database: '&#xe6a3;',
  filesystem: '&#xe72e;',
  page: '&#xe6df;',
  browser: '&#xe763;',
  external: '&#xe6a1;'
}

/** 工具类型筛选下拉选项 */
export const TYPE_OPTIONS = (Object.keys(TYPE_LABELS) as ToolType[]).map((value) => ({
  value,
  label: TYPE_LABELS[value]
}))

/**
 * 风险等级 → 显示配置
 * L1 绿 / L2 橙 / L3 红 / L4 深红（L4 用 danger + 自定义深色类区分）
 */
export const RISK_META: Record<
  RiskLevel,
  { label: string; tagType: 'success' | 'warning' | 'danger'; desc: string; className: string }
> = {
  L1: { label: 'L1', tagType: 'success', desc: '只读查询', className: 'risk-l1' },
  L2: { label: 'L2', tagType: 'warning', desc: '低风险写入', className: 'risk-l2' },
  L3: { label: 'L3', tagType: 'danger', desc: '写入修改 / CLI 操作', className: 'risk-l3' },
  L4: { label: 'L4', tagType: 'danger', desc: '高风险执行', className: 'risk-l4' }
}

/** 风险等级筛选下拉选项 */
export const RISK_OPTIONS = (Object.keys(RISK_META) as RiskLevel[]).map((value) => ({
  value,
  label: RISK_META[value].label
}))

/** 状态筛选下拉选项 */
export const STATUS_OPTIONS: { value: 'enabled' | 'disabled'; label: string }[] = [
  { value: 'enabled', label: '启用' },
  { value: 'disabled', label: '禁用' }
]

/** 请求方法选项（API 工具配置用） */
export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE']

/** 数据库权限范围选项 */
export const DB_SCOPES = [
  { value: 'read', label: '只读' },
  { value: 'write', label: '可写' },
  { value: 'admin', label: '管理' }
]

