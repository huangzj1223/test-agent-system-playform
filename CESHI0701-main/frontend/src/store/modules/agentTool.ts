/**
 * 智能体工具权限 Store
 * 维护工具清单、分类计数、统计概览、筛选（分类/搜索/类型/风险/状态）、分页、选中工具与调用日志，
 * 以及启用切换、新建/更新工具等交互。当前为纯前端 mock 状态实现，数据结构按可接后端拆分。
 */
import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import type {
  AgentTool,
  ToolType,
  RiskLevel,
  ToolCallLog
} from '@/components/core/layouts/art-agent-chat/widget/tool-permission/types'
import * as api from '@/api/agentTool'
import { refreshToolGovernance } from '@/agent/tool-governance'

/** 工具筛选条件 */
interface ToolFilter {
  /** 分类（空串=全部） */
  category: ToolType | ''
  /** 关键词（名称/描述） */
  keyword: string
  /** 类型下拉（与分类联动，二者取其一即可，这里独立保存下拉值） */
  type: ToolType | ''
  /** 风险等级 */
  riskLevel: RiskLevel | ''
  /** 状态 */
  status: 'enabled' | 'disabled' | ''
}

/** 后端工具 → 前端 AgentTool 适配（字段重命名，id 转字符串保持组件不变） */
function toFrontTool(b: api.BackendTool): AgentTool {
  return {
    id: String(b.id),
    name: b.name,
    key: b.toolKey,
    type: b.type as ToolType,
    description: b.description ?? '',
    riskLevel: b.riskLevel as RiskLevel,
    enabled: b.enabled,
    requireConfirm: b.requireConfirm,
    applicableAgents: b.applicableAgents ?? [],
    config: b.config ?? {},
    createdAt: b.createTime,
    updatedAt: b.updateTime
  }
}

/** 前端 AgentTool → 后端入参（新建时 id 为非数字字符串，转为 undefined 走新建） */
function toBackendPayload(t: AgentTool): api.ToolPayload {
  const numId = Number(t.id)
  return {
    id: Number.isInteger(numId) && numId > 0 ? numId : undefined,
    toolKey: t.key,
    name: t.name,
    type: t.type,
    description: t.description,
    riskLevel: t.riskLevel,
    enabled: t.enabled,
    requireConfirm: t.requireConfirm,
    applicableAgents: t.applicableAgents,
    config: t.config
  }
}

export const useAgentToolStore = defineStore('agentTool', () => {
  /** 全部工具（数据源，从后端一次拉全量，前端做筛选分页） */
  const allTools = ref<AgentTool[]>([])
  /** 分类计数 */
  const categories = ref<{ key: ToolType; count: number }[]>([])
  /** 统计概览 */
  const stats = ref<api.ToolStats>({ total: 0, enabled: 0, highRisk: 0, callsToday: 0 })
  /** 当前选中工具的调用日志 */
  const logs = ref<ToolCallLog[]>([])
  /** 当前选中工具（供弹窗使用） */
  const selected = ref<AgentTool | null>(null)
  /** 筛选条件 */
  const filter = reactive<ToolFilter>({ category: '', keyword: '', type: '', riskLevel: '', status: '' })
  /** 分页 */
  const pagination = reactive({ page: 1, pageSize: 10 })
  /** 是否已加载 */
  const loaded = ref(false)

  /** 初始化：拉全量工具 + 统计 + 分类 */
  async function init(): Promise<void> {
    const [listRes, statsRes, catRes] = await Promise.all([
      api.fetchToolList({ page: 1, pageSize: 100 }),
      api.fetchToolStats(),
      api.fetchToolCategories()
    ])
    allTools.value = (listRes.data?.list ?? []).map(toFrontTool)
    if (statsRes.data) stats.value = statsRes.data
    categories.value = (catRes.data ?? []).map((c) => ({ key: c.key as ToolType, count: c.count }))
    loaded.value = true
  }

  /** 按筛选条件过滤后的工具列表 */
  const filteredTools = computed<AgentTool[]>(() => {
    const kw = (filter.keyword ?? '').trim().toLowerCase()
    return allTools.value.filter((t) => {
      if (filter.category && t.type !== filter.category) return false
      if (filter.type && t.type !== filter.type) return false
      if (filter.riskLevel && t.riskLevel !== filter.riskLevel) return false
      if (filter.status === 'enabled' && !t.enabled) return false
      if (filter.status === 'disabled' && t.enabled) return false
      if (kw && !t.name.toLowerCase().includes(kw) && !t.description.toLowerCase().includes(kw)) return false
      return true
    })
  })

  /** 过滤后总数 */
  const total = computed(() => filteredTools.value.length)

  /** 当前页工具列表 */
  const pagedTools = computed<AgentTool[]>(() => {
    const start = (pagination.page - 1) * pagination.pageSize
    return filteredTools.value.slice(start, start + pagination.pageSize)
  })

  /** 当前选中工具的调用日志（由 setSelected 按需从后端加载到 logs） */
  const selectedLogs = computed<ToolCallLog[]>(() => logs.value)

  /** 点击左侧分类：设置分类筛选并同步类型下拉，回到第 1 页 */
  function selectCategory(category: ToolType | ''): void {
    filter.category = category
    filter.type = category
    pagination.page = 1
  }

  /** 应用筛选栏（局部 patch），回到第 1 页 */
  function applyFilter(patch: Partial<ToolFilter>): void {
    Object.assign(filter, patch)
    // 类型下拉变化时同步左侧分类高亮
    if (patch.type !== undefined) filter.category = patch.type
    pagination.page = 1
  }

  /** 切换页码 */
  function changePage(page: number): void {
    pagination.page = page
  }

  /** 设置当前选中工具，并按需拉取其调用日志 */
  async function setSelected(tool: AgentTool | null): Promise<void> {
    selected.value = tool
    if (!tool) {
      logs.value = []
      return
    }
    const res = await api.fetchToolCallLogs(tool.key, 1, 20)
    logs.value = (res.data?.list ?? []) as ToolCallLog[]
  }

  /** 切换工具启用状态（调 API 后本地同步 + 刷新统计） */
  async function toggleEnabled(id: string, enabled: boolean): Promise<void> {
    await api.toggleTool(Number(id), enabled)
    const tool = allTools.value.find((t) => t.id === id)
    if (tool) tool.enabled = enabled
    await refreshStats()
    // 同步治理映射，使智能体可见工具即时随开关变化
    void refreshToolGovernance()
  }

  /** 新建或更新工具（调 API 后重拉列表与统计） */
  async function saveTool(tool: AgentTool): Promise<void> {
    const payload = toBackendPayload(tool)
    if (payload.id) {
      await api.updateTool(payload)
    } else {
      await api.addTool(payload)
    }
    await reload()
    void refreshToolGovernance()
  }

  /** 重拉工具列表 + 统计 + 分类 */
  async function reload(): Promise<void> {
    const [listRes, statsRes, catRes] = await Promise.all([
      api.fetchToolList({ page: 1, pageSize: 100 }),
      api.fetchToolStats(),
      api.fetchToolCategories()
    ])
    allTools.value = (listRes.data?.list ?? []).map(toFrontTool)
    if (statsRes.data) stats.value = statsRes.data
    categories.value = (catRes.data ?? []).map((c) => ({ key: c.key as ToolType, count: c.count }))
  }

  /** 删除工具（调 API 后重拉） */
  async function removeTool(id: string): Promise<void> {
    await api.deleteTool(Number(id))
    await reload()
    void refreshToolGovernance()
  }

  /** 刷新统计（切换启用后同步顶部卡片） */
  async function refreshStats(): Promise<void> {
    const res = await api.fetchToolStats()
    if (res.data) stats.value = res.data
  }

  return {
    allTools,
    categories,
    stats,
    logs,
    selected,
    filter,
    pagination,
    filteredTools,
    total,
    pagedTools,
    selectedLogs,
    loaded,
    init,
    reload,
    selectCategory,
    applyFilter,
    changePage,
    setSelected,
    toggleEnabled,
    saveTool,
    removeTool
  }
})
