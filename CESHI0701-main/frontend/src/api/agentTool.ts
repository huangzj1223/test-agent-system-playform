/**
 * 工具权限管理 API
 * 对接后端 /admin/agent-tool：工具增删改查/开关 + 统计 + 分类 + 调用日志 + 权限校验。
 * 后端字段（toolKey/createTime/数字 id）与前端 AgentTool（key/createdAt/字符串 id）的映射在 store 层完成。
 */
import request from '@/utils/http'

/** 后端工具记录（SysAgentTool 原始形态） */
export interface BackendTool {
  id: number
  toolKey: string
  name: string
  type: string
  description?: string | null
  riskLevel: string
  enabled: boolean
  requireConfirm: boolean
  applicableAgents?: string[] | null
  config: Record<string, unknown>
  sort: number
  createTime: string
  updateTime: string
}

/** 分页结构 */
export interface Pagination {
  page: number
  pageSize: number
  total: number
}

/** 工具统计 */
export interface ToolStats {
  total: number
  enabled: number
  highRisk: number
  callsToday: number
}

/** 工具列表查询 */
export interface ToolListQuery {
  keyword?: string
  type?: string
  riskLevel?: string
  status?: number
  page?: number
  pageSize?: number
}

/** 新建/更新工具入参（后端字段） */
export interface ToolPayload {
  id?: number
  toolKey: string
  name: string
  type: string
  description?: string
  riskLevel?: string
  enabled?: boolean
  requireConfirm?: boolean
  applicableAgents?: string[]
  config?: Record<string, unknown>
  sort?: number
}

/** 工具列表（筛选分页） */
export function fetchToolList(query: ToolListQuery = {}) {
  return request.post<{ list: BackendTool[]; pagination: Pagination }>({
    url: '/admin/agent-tool/list',
    data: query
  })
}

/** 工具统计 */
export function fetchToolStats() {
  return request.post<ToolStats>({ url: '/admin/agent-tool/stats' })
}

/** 工具分类计数 */
export function fetchToolCategories() {
  return request.post<{ key: string; count: number }[]>({ url: '/admin/agent-tool/categories' })
}

/** 新建工具 */
export function addTool(data: ToolPayload) {
  return request.post<{ id: number }>({ url: '/admin/agent-tool/add', data })
}

/** 更新工具 */
export function updateTool(data: ToolPayload) {
  return request.post({ url: '/admin/agent-tool/update', data })
}

/** 切换工具启用状态 */
export function toggleTool(id: number, enabled: boolean) {
  return request.post({ url: '/admin/agent-tool/toggle', data: { id, enabled } })
}

/** 删除工具 */
export function deleteTool(id: number) {
  return request.post({ url: '/admin/agent-tool/delete', data: { id } })
}

/** 工具调用日志列表 */
export function fetchToolCallLogs(toolKey: string, page = 1, pageSize = 10) {
  return request.post<{ list: unknown[]; pagination: Pagination }>({
    url: '/admin/agent-tool/call-log/list',
    data: { toolKey, page, pageSize }
  })
}

/** 上报一次工具调用日志（执行成功/失败均上报） */
export function recordToolCall(data: {
  toolKey: string
  agent?: string
  skill?: string
  params?: Record<string, unknown>
  success: boolean
  durationMs?: number
}) {
  return request.post({ url: '/admin/agent-tool/call-log/record', data })
}

/** 工具权限校验（委托安全策略） */
export function checkToolPermissionRemote(toolKey: string, action = 'execute', payload?: Record<string, unknown>) {
  return request.post<{ allowed: boolean; riskLevel: string; requireConfirm: boolean; reason?: string }>({
    url: '/admin/agent-tool/check',
    data: { toolKey, action, payload }
  })
}

/** 注册表工具上报项 */
export interface RegistryToolItem {
  toolKey: string
  name: string
  type: string
  description?: string
  riskLevel?: string
  requireConfirm?: boolean
}

/** 同步前端注册表工具清单到后端（幂等 upsert，保留管理员启停选择） */
export function syncRegistryTools(tools: RegistryToolItem[]) {
  return request.post<{ synced: number; created: number; updated: number }>({
    url: '/admin/agent-tool/sync-registry',
    data: { tools }
  })
}

/** 拉取工具治理映射（toolKey → 启用/需确认） */
export function fetchToolGovernance() {
  return request.post<Record<string, { enabled: boolean; requireConfirm: boolean }>>({
    url: '/admin/agent-tool/governance'
  })
}
