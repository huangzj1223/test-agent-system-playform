/**
 * 智能体运行日志 Store
 * 数据来自后端 /admin/agent-run-log（方案C混合）：conversation/system/error 来自统一表，
 * skill/tool/memory 由后端聚合各自明细表。过滤/分页/分类计数均走服务端。
 */
import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import {
  fetchRunLogList,
  fetchRunLogCategoryCount,
  markRunLogProcessed,
  toRunLogQuery
} from '@/api/agentRunLog'
import type { LogCategoryCount } from '@/components/core/layouts/art-agent-chat/widget/run-logs/runLogTypes'
import type {
  AgentRunLog,
  RunLogFilter,
  LogType
} from '@/components/core/layouts/art-agent-chat/widget/run-logs/runLogTypes'

export const useAgentRunLogStore = defineStore('agentRunLog', () => {
  /** 当前页日志（服务端返回） */
  const pagedLogs = ref<AgentRunLog[]>([])
  /** 过滤后总数（服务端返回） */
  const total = ref(0)
  /** 分类计数（服务端返回，展示口径） */
  const categories = ref<LogCategoryCount[]>([])
  /** 当前选中日志（供详情抽屉使用） */
  const selected = ref<AgentRunLog | null>(null)
  /** 加载态 */
  const loading = ref(false)
  /** 过滤条件 */
  const filter = reactive<RunLogFilter>({
    category: '',
    keyword: '',
    dateRange: null,
    agent: '',
    status: ''
  })
  /** 分页 */
  const pagination = reactive({ page: 1, pageSize: 10 })

  /** 拉取当前页列表 + 分类计数 */
  async function load(): Promise<void> {
    loading.value = true
    try {
      const query = toRunLogQuery(filter, pagination.page, pagination.pageSize)
      const [listRes, catRes] = await Promise.all([
        fetchRunLogList(query),
        fetchRunLogCategoryCount(query)
      ])
      pagedLogs.value = listRes.data?.list ?? []
      total.value = listRes.data?.total ?? 0
      categories.value = catRes.data ?? []
    } catch {
      // 请求失败由 http 工具统一提示
    } finally {
      loading.value = false
    }
  }

  /** 点击左侧分类：设置分类筛选，回到第 1 页并重新加载 */
  function selectCategory(category: LogType | ''): void {
    filter.category = category
    pagination.page = 1
    load()
  }

  /** 应用筛选栏（局部 patch），回到第 1 页并重新加载 */
  function applyFilter(patch: Partial<RunLogFilter>): void {
    Object.assign(filter, patch)
    pagination.page = 1
    load()
  }

  /** 切换页码并重新加载 */
  function changePage(page: number): void {
    pagination.page = page
    load()
  }

  /** 改每页条数并回到第 1 页重新加载 */
  function changePageSize(size: number): void {
    pagination.pageSize = size
    pagination.page = 1
    load()
  }

  /** 设置当前选中日志（供详情抽屉） */
  function setSelected(log: AgentRunLog | null): void {
    selected.value = log
  }

  /** 标记指定日志为已处理（调后端，成功后刷新列表） */
  async function markProcessed(id: string): Promise<void> {
    try {
      await markRunLogProcessed(id)
      if (selected.value && selected.value.id === id) {
        selected.value.processed = true
      }
      await load()
    } catch {
      // 失败由 http 工具统一提示
    }
  }

  return {
    pagedLogs,
    total,
    categories,
    selected,
    loading,
    filter,
    pagination,
    load,
    selectCategory,
    applyFilter,
    changePage,
    changePageSize,
    setSelected,
    markProcessed
  }
})
