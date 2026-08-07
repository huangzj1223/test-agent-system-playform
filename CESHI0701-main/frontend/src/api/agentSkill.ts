/**
 * 智能体技能管理 API
 * 对接后端 /admin/agent-skill：技能增删改查/开关 + 能力目录 + 已启用工具解析。
 */
import request from '@/utils/http'

/** 技能类型/分类 */
export type SkillCategory = 'query' | 'generate' | 'operation' | 'cli' | 'decision' | 'workflow'
/** 风险等级 */
export type SkillRiskLevel = 'L1' | 'L2' | 'L3' | 'L4'

/** 技能记录 */
export interface AgentSkill {
  /** 主键 ID */
  id: number
  /** 技能唯一键 */
  skillKey: string
  /** 显示名称 */
  name: string
  /** 描述 */
  description?: string | null
  /** 引用的能力目录 key 列表 */
  capabilities: string[]
  /** 类型/分类 */
  category: SkillCategory
  /** 风险等级 */
  riskLevel: SkillRiskLevel
  /** 版本号 */
  version: string
  /** CLI 绑定命令 */
  cliCommand?: string | null
  /** 触发关键词 */
  triggerKeywords?: string[] | null
  /** 适用智能体 */
  applicableAgents?: string[] | null
  /** 创建者 */
  creator?: string | null
  /** 是否启用 */
  enabled: boolean
  /** 是否内置（不可删除） */
  builtin: boolean
  /** 排序值 */
  sort: number
  /** 最近运行时间（运行统计，列表附带） */
  lastRunAt?: string | null
  /** 近7日调用数（运行统计，列表附带） */
  calls7d?: number
}

/** 分页结构 */
export interface Pagination {
  page: number
  pageSize: number
  total: number
}

/** 技能统计概览 */
export interface SkillStats {
  total: number
  enabled: number
  highRisk: number
  calls7d: number
  failRate: number
}

/** 分类计数 */
export interface SkillCategoryCount {
  total: number
  categories: { key: SkillCategory; count: number }[]
}

/** 版本历史条目 */
export interface SkillVersion {
  id: number
  skillId: number
  version: string
  /** 全字段快照 */
  snapshot: Record<string, unknown>
  /** 变更类型 */
  changeType: 'create' | 'update' | 'rollback'
  /** 变更摘要 */
  changeSummary?: string | null
  /** 操作者 */
  operator?: string | null
  createTime: string
}

/** 运行日志条目 */
export interface SkillRunLog {
  id: number
  skillId: number
  capabilityKey: string
  success: boolean
  durationMs: number
  errorMsg?: string | null
  userId?: number | null
  createTime: string
}

/** 技能列表筛选参数 */
export interface SkillListQuery {
  keyword?: string
  category?: SkillCategory
  riskLevel?: SkillRiskLevel
  status?: 0 | 1
  applicableAgent?: string
  page?: number
  pageSize?: number
}

/** 枚举下发结构（分类/风险等级含说明/可选适用智能体） */
export interface SkillEnums {
  categories: { key: SkillCategory; label: string }[]
  riskLevels: { key: SkillRiskLevel; label: string; note: string }[]
  agents: string[]
}

/** 能力目录项（新建技能时供勾选） */
export interface AgentCapabilityItem {
  /** 能力 key */
  key: string
  /** 工具名 */
  toolName: string
  /** 显示名 */
  label: string
  /** 描述 */
  description: string
  /** 是否敏感 */
  sensitive?: boolean
}

/** 已启用技能解析后的工具定义 */
export interface ResolvedSkillTool {
  /** 工具名（LLM function name） */
  name: string
  /** 归属技能键（执行前安全策略校验用） */
  skillKey: string
  /** 能力 key（埋点运行日志时回传） */
  capabilityKey: string
  /** 描述 */
  description: string
  /** 参数 JSON Schema */
  parameters: Record<string, unknown>
  /** 调用绑定 */
  http: { method: 'GET' | 'POST'; path: string }
  /** 所需权限点 */
  requiredPerms?: string
  /** 是否敏感 */
  sensitive?: boolean
}

/** 新建技能入参 */
export interface CreateSkillPayload {
  skillKey: string
  name: string
  description?: string
  capabilities: string[]
  category?: SkillCategory
  riskLevel?: SkillRiskLevel
  cliCommand?: string
  triggerKeywords?: string[]
  applicableAgents?: string[]
  enabled?: boolean
  sort?: number
}

/** 更新技能入参 */
export interface UpdateSkillPayload {
  id: number
  name?: string
  description?: string
  capabilities?: string[]
  category?: SkillCategory
  riskLevel?: SkillRiskLevel
  cliCommand?: string
  triggerKeywords?: string[]
  applicableAgents?: string[]
  sort?: number
}

/** 技能列表（筛选 + 分页，管理 UI 用） */
export function fetchSkillList(query: SkillListQuery = {}) {
  return request.post<{ list: AgentSkill[]; pagination: Pagination }>({
    url: '/admin/agent-skill/list',
    data: query
  })
}

/** 技能统计概览（顶部卡片） */
export function fetchSkillStats() {
  return request.post<SkillStats>({ url: '/admin/agent-skill/stats' })
}

/** 技能分类计数（左侧栏） */
export function fetchSkillCategories() {
  return request.post<SkillCategoryCount>({ url: '/admin/agent-skill/categories' })
}

/** 某技能的运行日志分页（success 可选：true 仅成功 / false 仅失败 / 省略为全部） */
export function fetchSkillRunLogs(skillId: number, page = 1, pageSize = 10, success?: boolean) {
  return request.post<{ list: SkillRunLog[]; pagination: Pagination }>({
    url: '/admin/agent-skill/run-log/list',
    data: { skillId, page, pageSize, ...(success === undefined ? {} : { success }) }
  })
}

/** 记录一次技能运行日志（聊天前端埋点） */
export function recordSkillRun(data: {
  capabilityKey: string
  success: boolean
  durationMs?: number
  errorMsg?: string
}) {
  return request.post({ url: '/admin/agent-skill/run-log/record', data })
}

/** 能力目录（新建技能时供勾选） */
export function fetchCapabilityCatalog() {
  return request.post<AgentCapabilityItem[]>({ url: '/admin/agent-skill/catalog' })
}

/** 分类/风险等级枚举 + 适用智能体清单（前端替代写死常量，避免双维护漂移） */
export function fetchSkillEnums() {
  return request.post<SkillEnums>({ url: '/admin/agent-skill/enums' })
}

/** 能力测试结果 */
export interface SkillTestResult {
  /** 是否成功 */
  success: boolean
  /** 耗时（毫秒） */
  durationMs: number
  /** 结果摘要（截断的响应文本） */
  resultSummary: string
  /** 被拦截原因（敏感能力等，成功时无） */
  blockedReason?: string
}

/** 能力测试/试运行（管理台验证某能力是否可调用；敏感能力会被后端拒绝） */
export function testSkillCapability(data: {
  skillId: number
  capabilityKey: string
  params?: Record<string, unknown>
}) {
  return request.post<SkillTestResult>({ url: '/admin/agent-skill/test', data })
}

/** 某技能的版本历史分页 */
export function fetchSkillVersions(skillId: number, page = 1, pageSize = 10) {
  return request.post<{ list: SkillVersion[]; pagination: Pagination }>({
    url: '/admin/agent-skill/version/list',
    data: { skillId, page, pageSize }
  })
}

/** 回滚技能到指定历史版本 */
export function rollbackSkill(skillId: number, versionId: number) {
  return request.post({ url: '/admin/agent-skill/version/rollback', data: { skillId, versionId } })
}

/** 可移植技能项（导出/导入载体） */
export interface PortableSkill {
  skillKey: string
  name: string
  description?: string
  capabilities: string[]
  category?: string
  riskLevel?: string
  cliCommand?: string
  triggerKeywords?: string[]
  applicableAgents?: string[]
  sort?: number
}

/** 导入结果报告 */
export interface ImportReport {
  imported: number
  skipped: number
  updated: number
  renamed: number
  failed: { skillKey: string; reason: string }[]
}

/** 导出技能为 JSON（ids 空则导出全部） */
export function exportSkills(ids?: number[]) {
  return request.post<PortableSkill[]>({ url: '/admin/agent-skill/export', data: { ids } })
}

/** 导入技能 JSON（conflictStrategy：skip/overwrite/rename） */
export function importSkills(items: PortableSkill[], conflictStrategy: 'skip' | 'overwrite' | 'rename' = 'skip') {
  return request.post<ImportReport>({ url: '/admin/agent-skill/import', data: { items, conflictStrategy } })
}

/** 安全策略校验结果（对应后端 SecurityCheckResult） */
export interface SkillCheckResult {
  /** 是否放行 */
  allowed: boolean
  /** 判定风险等级 */
  riskLevel: string
  /** 是否需审批 */
  requireApproval: boolean
  /** 是否需人工确认 */
  requireConfirm: boolean
  /** 被拦截原因 */
  blockedReason?: string
  /** 命中的策略 */
  matchedPolicies: string[]
  /** 是否需审计 */
  auditRequired: boolean
  /** 审批工单 ID（需审批且已建单时） */
  approvalRequestId?: number
}

/** 执行前安全策略校验（聊天执行技能能力前调用；仅需登录） */
export function checkSkillPolicy(data: {
  skillKey: string
  capabilityKey?: string
  payload?: Record<string, unknown>
}) {
  return request.post<SkillCheckResult>({ url: '/admin/agent-skill/check', data })
}

/** 已启用技能的工具定义（聊天前端注册用） */
export function fetchEnabledSkillTools() {
  return request.post<ResolvedSkillTool[]>({ url: '/admin/agent-skill/enabled' })
}

/** 新建技能 */
export function createSkill(data: CreateSkillPayload) {
  return request.post<{ id: number }>({ url: '/admin/agent-skill/add', data })
}

/** 更新技能 */
export function updateSkill(data: UpdateSkillPayload) {
  return request.post({ url: '/admin/agent-skill/update', data })
}

/** 切换技能启用状态 */
export function toggleSkill(id: number, enabled: boolean) {
  return request.post({ url: '/admin/agent-skill/toggle', data: { id, enabled } })
}

/** 删除技能 */
export function deleteSkill(id: number) {
  return request.post({ url: '/admin/agent-skill/delete', data: { id } })
}
