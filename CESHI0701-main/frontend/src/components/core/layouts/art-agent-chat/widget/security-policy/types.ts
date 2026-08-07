/**
 * 安全策略类型定义与显示元数据
 * 统一管理智能体执行 Skills、调用 CLI、访问数据库、操作页面、写文件、更新记忆时的安全边界。
 * checkSecurityPolicy 作为高层统一入口，风险等级(L1-L4)为跨模块单一事实来源，
 * 供 Skills 与工具权限（toolPermission）校验复用。数据结构按可接后端拆分。
 */

/** 风险等级：L1 只读 / L2 低风险写入 / L3 写入修改 / L4 高风险执行 */
export type RiskLevel = 'L1' | 'L2' | 'L3' | 'L4'

/** 风险等级默认行为 */
export type DefaultAction = 'allow' | 'require_approval' | 'deny'

/** 审批方式 */
export type ApprovalMode = 'none' | 'confirm' | 'manual' | 'multi_person'

/** 审批超时处理 */
export type TimeoutAction = 'approve' | 'deny' | 'cancel' | 'wait'

/** 敏感词处理方式 */
export type SensitiveAction = 'allow' | 'mask' | 'block' | 'deny_memory' | 'confirm' | 'audit'

/** 操作类型（安全校验上下文用） */
export type ActionType = 'cli' | 'api' | 'database' | 'file' | 'page' | 'memory' | 'skill'

/** 风险等级策略 */
export interface RiskLevelPolicy {
  /** 等级 */
  level: RiskLevel
  /** 名称，如 只读查询 */
  name: string
  /** 说明 */
  description: string
  /** 示例操作 */
  examples: string[]
  /** 审批要求文案 */
  approvalRequirement: string
  /** 默认行为 */
  defaultAction: DefaultAction
  /** 是否启用 */
  enabled: boolean
}

/** 审批规则 */
export interface ApprovalRule {
  /** 唯一 ID（后端自增，新建时为 0） */
  id: number
  /** 规则名称 */
  name: string
  /** 适用范围 */
  scope: string
  /** 适用风险等级 */
  riskLevels: RiskLevel[]
  /** 审批方式 */
  approvalMode: ApprovalMode
  /** 审批人 / 角色 */
  approverRole: string
  /** 审批超时时间（分钟） */
  timeoutMinutes: number
  /** 超时处理 */
  timeoutAction: TimeoutAction
  /** 是否启用 */
  enabled: boolean
}

/** 敏感词规则 */
export interface SensitiveRule {
  /** 唯一 ID（后端自增，新建时为 0） */
  id: number
  /** 敏感类型 */
  type: string
  /** 匹配规则 */
  pattern: string
  /** 处理方式 */
  action: SensitiveAction
  /** 适用范围 */
  scopes: string[]
  /** 是否启用 */
  enabled: boolean
}

/** 黑白名单条目 */
export interface ListItem {
  /** 唯一 ID（后端自增，新建时为 0） */
  id: number
  /** 内容（命令模板 / 目录 / API 路径 / 表字段） */
  value: string
  /** 说明 */
  description: string
  /** 风险等级（命令类适用） */
  riskLevel?: RiskLevel
  /** 是否启用 */
  enabled: boolean
}

/**
 * CLI 沙箱配置
 * 命令白/黑名单由「黑白名单」页统一管理（command_white/command_black），此处不再冗余存储（D2）。
 */
export interface CliSandbox {
  enabled: boolean
  allowSudo: boolean
  allowNetwork: boolean
  allowBackgroundProcess: boolean
  timeoutSeconds: number
  maxOutputLength: number
}

/**
 * 文件沙箱配置
 * 可访问/禁止目录由「黑白名单」页统一管理（dir_white），此处不再冗余存储（D2）。
 */
export interface FileSandbox {
  enabled: boolean
  allowRead: boolean
  allowWrite: boolean
  allowDelete: boolean
  allowOverwrite: boolean
  maxFileSizeMB: number
  allowedExtensions: string[]
}

/**
 * 数据库沙箱配置
 * 允许/禁止表由「黑白名单」页统一管理（api_db_black），此处不再冗余存储（D2）。
 */
export interface DatabaseSandbox {
  enabled: boolean
  readonlyByDefault: boolean
  allowInsert: boolean
  allowUpdate: boolean
  allowDelete: boolean
  maxRows: number
  timeoutSeconds: number
}

/** 页面操作沙箱配置 */
export interface PageSandbox {
  enabled: boolean
  allowClick: boolean
  allowInput: boolean
  allowSubmit: boolean
  allowDeleteAction: boolean
  allowNavigation: boolean
  requireSummaryBeforeRiskAction: boolean
}

/** 沙箱策略（4 类聚合） */
export interface SandboxPolicy {
  cli: CliSandbox
  file: FileSandbox
  database: DatabaseSandbox
  page: PageSandbox
}

/** 全局安全策略 */
export interface GlobalPolicy {
  /** 高风险操作二次确认 */
  highRiskDoubleConfirm: boolean
  /** 命令执行超时（秒） */
  commandTimeoutSeconds: number
  /** 文件操作目录限制开启（目录清单存于黑白名单 dir_white，此处仅总开关） */
  fileDirLimitEnabled: boolean
  /** 数据库写操作审批 */
  dbWriteApproval: boolean
  /** 审计日志强制开启 */
  forceAuditLog: boolean
}

/** 审计策略 */
export interface AuditPolicy {
  recordConversation: boolean
  recordSkillCall: boolean
  recordToolExecution: boolean
  recordMemoryHit: boolean
  recordApproval: boolean
  retentionDays: number
  failureAlert: boolean
  highRiskAlert: boolean
  maskSensitiveData: boolean
}

/** 黑白名单四区聚合 */
export interface BlackWhiteList {
  commandWhitelist: ListItem[]
  commandBlacklist: ListItem[]
  dirWhitelist: ListItem[]
  apiDbBlacklist: ListItem[]
}

/** 敏感词统计 */
export interface SensitiveStats {
  total: number
  enabled: number
  blockedToday: number
  pending: number
}

/** 安全校验上下文 */
export interface SecurityCheckContext {
  actionType: ActionType
  command?: string
  sql?: string
  filePath?: string
  apiPath?: string
  memoryFile?: string
  riskLevel?: RiskLevel
  payload?: Record<string, unknown>
}

/** 安全校验结果 */
export interface SecurityCheckResult {
  allowed: boolean
  riskLevel: RiskLevel
  requireApproval: boolean
  requireConfirm: boolean
  blockedReason?: string
  matchedPolicies: string[]
  auditRequired: boolean
}

/** 安全策略分类导航项 */
export type SecurityCategory = 'risk' | 'approval' | 'sandbox' | 'blacklist' | 'sensitive' | 'audit'

/** 分类导航元数据 */
export const CATEGORY_NAV: { key: SecurityCategory; label: string; icon: string }[] = [
  { key: 'risk', label: '风险等级设置', icon: '&#xe6a2;' },
  { key: 'approval', label: '审批规则', icon: '&#xe72e;' },
  { key: 'sandbox', label: '沙箱策略', icon: '&#xe816;' },
  { key: 'blacklist', label: '黑白名单', icon: '&#xe6a1;' },
  { key: 'sensitive', label: '敏感词策略', icon: '&#xe6df;' },
  { key: 'audit', label: '审计策略', icon: '&#xe6a3;' }
]

/**
 * 风险等级 → 显示配置（L1 绿 / L2 橙 / L3 红 / L4 深红）
 * L4 用 danger 基础 + 自定义深色类区分
 */
export const RISK_META: Record<
  RiskLevel,
  { label: string; tagType: 'success' | 'warning' | 'danger'; className: string }
> = {
  L1: { label: 'L1', tagType: 'success', className: 'risk-l1' },
  L2: { label: 'L2', tagType: 'warning', className: 'risk-l2' },
  L3: { label: 'L3', tagType: 'danger', className: 'risk-l3' },
  L4: { label: 'L4', tagType: 'danger', className: 'risk-l4' }
}

/** 风险等级下拉选项 */
export const RISK_OPTIONS = (Object.keys(RISK_META) as RiskLevel[]).map((value) => ({
  value,
  label: RISK_META[value].label
}))

/** 默认行为 → 显示配置（允许绿 / 等待审批橙 / 拒绝红） */
export const ACTION_META: Record<DefaultAction, { label: string; tagType: 'success' | 'warning' | 'danger' }> = {
  allow: { label: '直接允许', tagType: 'success' },
  require_approval: { label: '等待审批', tagType: 'warning' },
  deny: { label: '拒绝执行', tagType: 'danger' }
}

/** 默认行为下拉选项 */
export const ACTION_OPTIONS = (Object.keys(ACTION_META) as DefaultAction[]).map((value) => ({
  value,
  label: ACTION_META[value].label
}))

/** 审批方式 → 显示名 */
export const APPROVAL_MODE_LABELS: Record<ApprovalMode, string> = {
  none: '无需审批',
  confirm: '二次确认',
  manual: '人工审批',
  multi_person: '多人审批'
}

/** 审批方式下拉选项 */
export const APPROVAL_MODE_OPTIONS = (Object.keys(APPROVAL_MODE_LABELS) as ApprovalMode[]).map((value) => ({
  value,
  label: APPROVAL_MODE_LABELS[value]
}))

/** 超时处理 → 显示名 */
export const TIMEOUT_ACTION_LABELS: Record<TimeoutAction, string> = {
  approve: '自动通过',
  deny: '自动拒绝',
  cancel: '自动取消',
  wait: '保持等待'
}

/** 超时处理下拉选项 */
export const TIMEOUT_ACTION_OPTIONS = (Object.keys(TIMEOUT_ACTION_LABELS) as TimeoutAction[]).map((value) => ({
  value,
  label: TIMEOUT_ACTION_LABELS[value]
}))

/** 敏感词处理方式 → 显示配置 */
export const SENSITIVE_ACTION_META: Record<SensitiveAction, { label: string; tagType: 'success' | 'warning' | 'danger' | 'info' }> = {
  allow: { label: '允许', tagType: 'success' },
  mask: { label: '脱敏展示', tagType: 'warning' },
  block: { label: '阻止执行', tagType: 'danger' },
  deny_memory: { label: '禁止写入记忆', tagType: 'danger' },
  confirm: { label: '需要人工确认', tagType: 'warning' },
  audit: { label: '记录审计', tagType: 'info' }
}

/** 敏感词处理方式下拉选项 */
export const SENSITIVE_ACTION_OPTIONS = (Object.keys(SENSITIVE_ACTION_META) as SensitiveAction[]).map((value) => ({
  value,
  label: SENSITIVE_ACTION_META[value].label
}))

/** 审批规则适用范围下拉选项 */
export const SCOPE_OPTIONS = [
  'CLI 工具', 'API 接口', '数据库', '文件系统', '页面操作', '浏览器控制', '记忆写入', 'Skill 执行'
].map((v) => ({ value: v, label: v }))

/** 敏感词适用范围候选 */
export const SENSITIVE_SCOPE_OPTIONS = ['日志', '记忆', '工具参数', '对话'].map((v) => ({ value: v, label: v }))


