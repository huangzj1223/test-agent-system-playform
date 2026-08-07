/**
 * 记忆中心 API
 * 对接后端 /admin/agent-memory：记忆文件读取（列表/统计/详情）。
 * 写入相关接口在后续阶段追加。类型与 memory-center/memory-constants.ts 对齐。
 */
import request from '@/utils/http'
import type {
  MemoryFile,
  MemoryStats,
  PendingMemory
} from '@/components/core/layouts/art-agent-chat/widget/memory-center/memory-constants'

/** 记忆文件列表筛选查询 */
export interface MemoryListQuery {
  /** 关键字（名称/描述模糊匹配） */
  keyword?: string
  /** 分类筛选 */
  category?: string
  /** 风险等级筛选 */
  riskLevel?: string
  /** 启用状态筛选 */
  enabled?: boolean
}

/**
 * 记忆文件列表（不含 versions/suggestions，详情单独拉取）
 * @param query 筛选条件
 */
export function fetchMemoryList(query: MemoryListQuery = {}) {
  return request.post<MemoryFile[]>({ url: '/admin/agent-memory/list', data: query })
}

/** 记忆中心统计概览 */
export function fetchMemoryStats() {
  return request.post<MemoryStats>({ url: '/admin/agent-memory/stats' })
}

/**
 * 记忆文件详情（含 versions、suggestions）
 * @param memoryKey 文件唯一键，如 soul.md
 */
export function fetchMemoryDetail(memoryKey: string) {
  return request.post<MemoryFile>({ url: '/admin/agent-memory/detail', data: { memoryKey } })
}

/** 新建记忆文件入参 */
export interface CreateMemoryPayload {
  memoryKey: string
  name?: string
  description?: string
  content?: string
  category?: string
  riskLevel?: string
}

/**
 * 新建记忆文件
 * @param data 新建入参（memoryKey 须以 .md 结尾）
 */
export function createMemory(data: CreateMemoryPayload) {
  return request.post<MemoryFile>({ url: '/admin/agent-memory/create', data })
}

/**
 * 保存记忆文件内容
 * @param memoryKey 文件唯一键
 * @param content 新内容
 */
export function saveMemoryContent(memoryKey: string, content: string, confirmed?: boolean) {
  return request.post<MemoryFile>({ url: '/admin/agent-memory/save', data: { memoryKey, content, confirmed } })
}

/** 记忆写入安全裁决结果 */
export interface MemoryWriteDecision {
  allowed: boolean
  riskLevel: string
  requireApproval: boolean
  requireConfirm: boolean
  blockedReason?: string
  matchedPolicies: string[]
  auditRequired: boolean
  approvalRequestId?: number
  fileExists: boolean
}

/**
 * 记忆写入前安全裁决预判（前端 fail-closed：据此弹确认/拦截）
 * @param memoryKey 文件唯一键
 * @param text 拟写入内容
 */
export function checkMemoryWrite(memoryKey: string, text: string) {
  return request.post<MemoryWriteDecision>({ url: '/admin/agent-memory/check', data: { memoryKey, text } })
}

/**
 * 更新记忆文件权限（局部 patch）
 * @param memoryKey 文件唯一键
 * @param patch 权限字段补丁
 */
export function updateMemoryPermission(memoryKey: string, patch: Record<string, boolean>) {
  return request.post<MemoryFile>({ url: '/admin/agent-memory/permission', data: { memoryKey, ...patch } })
}

/**
 * 启用/停用记忆文件
 * @param memoryKey 文件唯一键
 * @param enabled 目标状态
 */
export function toggleMemory(memoryKey: string, enabled: boolean) {
  return request.post<MemoryFile>({ url: '/admin/agent-memory/toggle', data: { memoryKey, enabled } })
}

/**
 * 删除记忆文件（内置不可删）
 * @param memoryKey 文件唯一键
 */
export function deleteMemory(memoryKey: string) {
  return request.post<{ memoryKey: string }>({ url: '/admin/agent-memory/delete', data: { memoryKey } })
}

import type { MemoryVersion } from '@/components/core/layouts/art-agent-chat/widget/memory-center/memory-constants'

/** 分页结构 */
export interface Pagination {
  page: number
  pageSize: number
  total: number
}

/**
 * 记忆版本历史列表
 * @param memoryKey 文件唯一键
 * @param page 页码
 * @param pageSize 每页条数
 */
export function fetchMemoryVersions(memoryKey: string, page = 1, pageSize = 20) {
  return request.post<{ list: MemoryVersion[]; pagination: Pagination }>({
    url: '/admin/agent-memory/version/list',
    data: { memoryKey, page, pageSize }
  })
}

/**
 * 回滚记忆文件到指定版本
 * @param memoryKey 文件唯一键
 * @param version 目标版本号
 */
export function rollbackMemory(memoryKey: string, version: string, confirmed?: boolean) {
  return request.post<MemoryFile>({
    url: '/admin/agent-memory/version/rollback',
    data: { memoryKey, version, confirmed }
  })
}

import type { ModelSuggestion } from '@/components/core/layouts/art-agent-chat/widget/memory-center/memory-constants'

/** 待确认记忆列表 */
export function fetchPendingList() {
  return request.post<PendingMemory[]>({ url: '/admin/agent-memory/pending/list' })
}

/**
 * 确认待确认记忆（追加到目标文件）
 * @param id 待确认记忆数字 ID
 * @param text 可选覆盖文本
 */
export function confirmPending(id: number, text?: string, confirmed?: boolean) {
  return request.post<{ memoryKey: string; version: string }>({
    url: '/admin/agent-memory/pending/confirm',
    data: { id, text, confirmed }
  })
}

/**
 * 忽略待确认记忆
 * @param id 待确认记忆数字 ID
 */
export function ignorePending(id: number) {
  return request.post<{ id: string }>({ url: '/admin/agent-memory/pending/ignore', data: { id } })
}

/**
 * 新建待确认记忆（对话侧智能体 memory.suggest 工具调用）。
 * 仅入队待确认，不直接写入记忆文件；需管理员在记忆中心确认后才追加到目标文件。
 * @param text 建议记忆内容
 * @param targetKey 目标记忆文件 key（如 user.md）
 * @param source 来源说明（可选）
 */
export function createPendingMemory(text: string, targetKey: string, source?: string) {
  return request.post<{ id: string; targetKey: string }>({
    url: '/admin/agent-memory/pending/create',
    data: { text, targetKey, source }
  })
}

/**
 * 模型建议列表
 * @param memoryKey 文件唯一键
 */
export function fetchSuggestionList(memoryKey: string) {
  return request.post<ModelSuggestion[]>({ url: '/admin/agent-memory/suggestion/list', data: { memoryKey } })
}

/**
 * 应用模型建议（追加到所属文件）
 * @param id 建议数字 ID
 * @param text 可选覆盖文本
 */
export function applySuggestion(id: number, text?: string, confirmed?: boolean) {
  return request.post<{ memoryKey: string; version: string }>({
    url: '/admin/agent-memory/suggestion/apply',
    data: { id, text, confirmed }
  })
}

/**
 * 忽略模型建议
 * @param id 建议数字 ID
 */
export function ignoreSuggestion(id: number) {
  return request.post<{ id: string }>({ url: '/admin/agent-memory/suggestion/ignore', data: { id } })
}

/** 待确认记忆列表（阶段 4 打通写入，阶段 1 先占位导出类型引用） */
export type { PendingMemory }
