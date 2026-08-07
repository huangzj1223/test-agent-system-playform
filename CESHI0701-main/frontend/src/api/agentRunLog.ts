/**
 * 运行日志 API
 * 对接后端 /admin/agent-run-log（方案C混合）：跨 4 源聚合的运行日志查询。
 * conversation/system/error 来自 sys_agent_run_log；skill/tool/memory 聚合各自明细表。
 * 类型与 run-logs/runLogTypes.ts 对齐。
 */
import request from '@/utils/http'
import type {
  AgentRunLog,
  LogCategoryCount,
  RunLogFilter
} from '@/components/core/layouts/art-agent-chat/widget/run-logs/runLogTypes'

/** 列表查询入参（过滤 + 分页） */
export interface RunLogListQuery {
  type?: string
  status?: string
  agent?: string
  keyword?: string
  /** 开始日期 YYYY-MM-DD */
  dateFrom?: string
  /** 结束日期 YYYY-MM-DD */
  dateTo?: string
  page?: number
  pageSize?: number
}

/** 分页列表响应 */
export interface RunLogListResult {
  list: AgentRunLog[]
  total: number
  page: number
  pageSize: number
}

/** 把前端 RunLogFilter + 分页转为后端查询入参 */
export function toRunLogQuery(
  filter: RunLogFilter,
  page: number,
  pageSize: number
): RunLogListQuery {
  return {
    type: filter.category || undefined,
    status: filter.status || undefined,
    agent: filter.agent || undefined,
    keyword: filter.keyword?.trim() || undefined,
    dateFrom: filter.dateRange?.[0] || undefined,
    dateTo: filter.dateRange?.[1] || undefined,
    page,
    pageSize
  }
}

/** 运行日志列表（聚合 + 分页） */
export function fetchRunLogList(query: RunLogListQuery) {
  return request.post<RunLogListResult>({ url: '/admin/agent-run-log/list', data: query })
}

/** 分类计数（6 类） */
export function fetchRunLogCategoryCount(query: RunLogListQuery = {}) {
  return request.post<LogCategoryCount[]>({
    url: '/admin/agent-run-log/category-count',
    data: query
  })
}

/** 日志详情（按带前缀 id） */
export function fetchRunLogDetail(id: string) {
  return request.post<AgentRunLog | null>({ url: '/admin/agent-run-log/detail', data: { id } })
}

/** 导出（复用过滤，不分页） */
export function exportRunLogs(query: RunLogListQuery) {
  return request.post<AgentRunLog[]>({ url: '/admin/agent-run-log/export', data: query })
}

/** 标记错误日志已处理（仅本表 run- 记录） */
export function markRunLogProcessed(id: string) {
  return request.post({ url: '/admin/agent-run-log/mark-processed', data: { id } })
}
