/**
 * 安全策略管理 API
 * 对接后端 /admin/security-policy：风险等级/审批规则/黑白名单/敏感词/全局·沙箱·审计配置
 * + 统一校验 check + 审计日志 + 审批工单。
 */
import request from '@/utils/http'
import type {
  RiskLevelPolicy,
  ApprovalRule,
  SensitiveRule,
  ListItem,
  SandboxPolicy,
  GlobalPolicy,
  AuditPolicy,
  BlackWhiteList,
  SensitiveStats
} from '@/components/core/layouts/art-agent-chat/widget/security-policy/types'

/** 安全策略概览（前端初始化一次拉全部） */
export interface SecurityOverview {
  riskPolicies: RiskLevelPolicy[]
  approvalRules: ApprovalRule[]
  blackWhiteList: BlackWhiteList
  sensitiveRules: SensitiveRule[]
  sensitiveStats: SensitiveStats
  global: GlobalPolicy
  sandbox: SandboxPolicy
  audit: AuditPolicy
}

/** 名单类型 */
export type ListType = 'command_white' | 'command_black' | 'dir_white' | 'api_db_black'

/** 概览 */
export function fetchSecurityOverview() {
  return request.post<SecurityOverview>({ url: '/admin/security-policy/overview' })
}

/* ---------- 风险等级 ---------- */

/** 风险等级列表 */
export function fetchRiskPolicies() {
  return request.post<RiskLevelPolicy[]>({ url: '/admin/security-policy/risk/list' })
}

/** 保存风险等级（按 level upsert） */
export function saveRiskPolicy(data: RiskLevelPolicy) {
  return request.post({ url: '/admin/security-policy/risk/save', data })
}

/** 删除风险等级 */
export function deleteRiskPolicy(level: string) {
  return request.post({ url: '/admin/security-policy/risk/delete', data: { level } })
}

/* ---------- 审批规则 ---------- */

/** 审批规则列表 */
export function fetchApprovalRules() {
  return request.post<ApprovalRule[]>({ url: '/admin/security-policy/approval/list' })
}

/** 新建审批规则 */
export function addApprovalRule(data: Omit<ApprovalRule, 'id'>) {
  return request.post<{ id: number }>({ url: '/admin/security-policy/approval/add', data })
}

/** 更新审批规则 */
export function updateApprovalRule(data: ApprovalRule) {
  return request.post({ url: '/admin/security-policy/approval/update', data })
}

/** 切换审批规则状态 */
export function toggleApprovalRule(id: number, enabled: boolean) {
  return request.post({ url: '/admin/security-policy/approval/toggle', data: { id, enabled } })
}

/** 删除审批规则 */
export function deleteApprovalRule(id: number) {
  return request.post({ url: '/admin/security-policy/approval/delete', data: { id } })
}

/* ---------- 黑白名单 ---------- */

/** 按类型查询名单 */
export function fetchListByType(listType: ListType) {
  return request.post<ListItem[]>({ url: '/admin/security-policy/list/query', data: { listType } })
}

/** 新建名单条目 */
export function addListItem(data: { listType: ListType } & Omit<ListItem, 'id'>) {
  return request.post<{ id: number }>({ url: '/admin/security-policy/list/add', data })
}

/** 更新名单条目 */
export function updateListItem(data: { listType: ListType } & ListItem) {
  return request.post({ url: '/admin/security-policy/list/update', data })
}

/** 切换名单条目状态 */
export function toggleListItem(id: number, enabled: boolean) {
  return request.post({ url: '/admin/security-policy/list/toggle', data: { id, enabled } })
}

/** 删除名单条目 */
export function deleteListItem(id: number) {
  return request.post({ url: '/admin/security-policy/list/delete', data: { id } })
}

/* ---------- 敏感词 ---------- */

/** 敏感词列表 */
export function fetchSensitiveRules() {
  return request.post<SensitiveRule[]>({ url: '/admin/security-policy/sensitive/list' })
}

/** 敏感词统计 */
export function fetchSensitiveStats() {
  return request.post<SensitiveStats>({ url: '/admin/security-policy/sensitive/stats' })
}

/** 新建敏感词规则 */
export function addSensitiveRule(data: Omit<SensitiveRule, 'id'>) {
  return request.post<{ id: number }>({ url: '/admin/security-policy/sensitive/add', data })
}

/** 更新敏感词规则 */
export function updateSensitiveRule(data: SensitiveRule) {
  return request.post({ url: '/admin/security-policy/sensitive/update', data })
}

/** 切换敏感词规则状态 */
export function toggleSensitiveRule(id: number, enabled: boolean) {
  return request.post({ url: '/admin/security-policy/sensitive/toggle', data: { id, enabled } })
}

/** 删除敏感词规则 */
export function deleteSensitiveRule(id: number) {
  return request.post({ url: '/admin/security-policy/sensitive/delete', data: { id } })
}

/* ---------- 全局 / 沙箱 / 审计 ---------- */

/** 保存全局策略 */
export function saveGlobalPolicy(settings: GlobalPolicy) {
  return request.post<GlobalPolicy>({ url: '/admin/security-policy/global/save', data: { settings } })
}

/** 保存沙箱策略 */
export function saveSandboxPolicy(settings: SandboxPolicy) {
  return request.post<SandboxPolicy>({ url: '/admin/security-policy/sandbox/save', data: { settings } })
}

/** 保存审计策略 */
export function saveAuditPolicy(settings: AuditPolicy) {
  return request.post<AuditPolicy>({ url: '/admin/security-policy/audit/save', data: { settings } })
}

/* ---------- 统一校验 / 审计日志 / 审批工单 ---------- */

/** 安全校验上下文 */
export interface SecurityCheckContext {
  actionType: string
  command?: string
  sql?: string
  filePath?: string
  apiPath?: string
  memoryFile?: string
  riskLevel?: string
  skillKey?: string
  toolKey?: string
  payload?: Record<string, unknown>
}

/** 安全校验结果 */
export interface SecurityCheckResult {
  allowed: boolean
  riskLevel: string
  requireApproval: boolean
  requireConfirm: boolean
  blockedReason?: string
  matchedPolicies: string[]
  auditRequired: boolean
  approvalRequestId?: number
}

/** 统一安全策略校验（Skills/工具执行前调用） */
export function checkSecurityPolicyRemote(context: SecurityCheckContext) {
  return request.post<SecurityCheckResult>({ url: '/admin/security-policy/check', data: context })
}

/** 审计日志分页列表 */
export function fetchAuditLogs(data: { actionType?: string; allowed?: boolean; page?: number; pageSize?: number } = {}) {
  return request.post<{ list: unknown[]; pagination: { page: number; pageSize: number; total: number } }>({
    url: '/admin/security-policy/audit-log/list',
    data
  })
}

/** 审批工单列表 */
export function fetchApprovalRequests(data: { status?: string; actionType?: string; page?: number; pageSize?: number } = {}) {
  return request.post<{ list: unknown[]; pagination: { page: number; pageSize: number; total: number } }>({
    url: '/admin/security-policy/approval-request/list',
    data
  })
}

/** 审批决策 */
export function decideApprovalRequest(id: number, decision: 'approved' | 'rejected', remark?: string) {
  return request.post({ url: '/admin/security-policy/approval-request/decide', data: { id, decision, remark } })
}

