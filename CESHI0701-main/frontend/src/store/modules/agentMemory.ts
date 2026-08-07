/**
 * 智能体记忆中心 Store
 * 维护记忆文件列表、当前选中文件、统计概览、待确认记忆、编辑态，
 * 以及确认/忽略待确认、编辑保存、版本回滚、权限更新、应用模型建议等交互。
 * 数据全部来自后端 /admin/agent-memory 接口（见 @/api/agentMemory）；写入前经安全策略统一治理。
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  type MemoryFile,
  type PendingMemory,
  type MemoryPermission,
  type MemoryStats
} from '@/components/core/layouts/art-agent-chat/widget/memory-center/memory-constants'
import {
  fetchMemoryList,
  fetchMemoryStats,
  fetchMemoryDetail,
  saveMemoryContent,
  updateMemoryPermission,
  toggleMemory as toggleMemoryApi,
  createMemory as createMemoryApi,
  deleteMemory as deleteMemoryApi,
  rollbackMemory as rollbackMemoryApi,
  fetchPendingList,
  confirmPending as confirmPendingApi,
  ignorePending as ignorePendingApi,
  applySuggestion as applySuggestionApi,
  ignoreSuggestion as ignoreSuggestionApi,
  checkMemoryWrite
} from '@/api/agentMemory'

/** 从前端 id（pd-N / sg-N）解析后端数字 ID */
function parseId(prefixedId: string): number {
  return Number(prefixedId.replace(/^\D+-/, ''))
}

/** 统计占位（首屏未拉取前展示） */
const EMPTY_STATS: MemoryStats = { fileCount: 0, pendingCount: 0, lastUpdate: '-', hitRate: '-', highRisk: 0 }

export const useAgentMemoryStore = defineStore('agentMemory', () => {
  /** 记忆文件列表（来自后端；versions/suggestions 由 select 懒加载补全） */
  const files = ref<MemoryFile[]>([])
  /** 待确认记忆列表（来自后端 pending/list） */
  const pending = ref<PendingMemory[]>([])
  /** 统计概览 */
  const stats = ref<MemoryStats>({ ...EMPTY_STATS })
  /** 当前选中文件 ID */
  const selectedId = ref<string>('')
  /** 是否处于编辑态 */
  const editing = ref(false)
  /** 列表加载态 */
  const loading = ref(false)
  /** 已加载过详情（versions/suggestions）的文件 key 集合 */
  const detailLoaded = ref<Set<string>>(new Set())

  /** 当前选中文件对象 */
  const selected = computed<MemoryFile | null>(
    () => files.value.find((f) => f.id === selectedId.value) ?? null
  )

  /** 待确认记忆数量（同步到统计卡片） */
  const pendingCount = computed(() => pending.value.length)

  /** 拉取列表 + 统计 + 待确认，填充 files/stats/pending（versions/suggestions 补空，select 时懒加载） */
  async function fetchAll(): Promise<void> {
    // 防重入：mount 与"切到记忆中心页签"可能同一 tick 各触发一次，加载中则跳过，避免重复请求
    if (loading.value) return
    loading.value = true
    try {
      const [listRes, statsRes, pendingRes] = await Promise.all([
        fetchMemoryList(),
        fetchMemoryStats(),
        fetchPendingList()
      ])
      const list = listRes.data
      const st = statsRes.data
      // 列表项不含 versions/suggestions，补空数组保证类型完整，详情由 loadDetail 补全
      files.value = (list ?? []).map((f) => ({ ...f, versions: f.versions ?? [], suggestions: f.suggestions ?? [] }))
      stats.value = st ?? { ...EMPTY_STATS }
      pending.value = pendingRes.data ?? []
      detailLoaded.value = new Set()
      if (files.value.length > 0) {
        selectedId.value = files.value[0].id
        await loadDetail(files.value[0].id)
      }
    } finally {
      loading.value = false
    }
  }

  /** 懒加载某文件详情（versions/suggestions），合并进对应 file，避免重复拉取 */
  async function loadDetail(id: string): Promise<void> {
    if (detailLoaded.value.has(id)) return
    const res = await fetchMemoryDetail(id)
    const detail = res.data
    if (!detail) return
    const idx = files.value.findIndex((f) => f.id === id)
    if (idx !== -1) {
      files.value[idx] = { ...files.value[idx], ...detail }
      detailLoaded.value.add(id)
    }
  }

  /** 选中某文件（退出编辑态，懒加载详情） */
  function select(id: string): void {
    selectedId.value = id
    editing.value = false
    void loadDetail(id)
  }

  /** 进入编辑态 */
  function startEdit(): void {
    editing.value = true
  }

  /** 退出编辑态（取消，不保存） */
  function cancelEdit(): void {
    editing.value = false
  }

  /** 把接口返回的文件合并进 files（保留已加载的 versions/suggestions） */
  function mergeFile(updated: MemoryFile | undefined): void {
    if (!updated) return
    const idx = files.value.findIndex((f) => f.id === updated.id)
    if (idx !== -1) {
      files.value[idx] = {
        ...files.value[idx],
        ...updated,
        versions: files.value[idx].versions,
        suggestions: files.value[idx].suggestions
      }
    }
  }

  /** 记忆写入前安全裁决（供组件 fail-closed 预判：拦截/弹确认） */
  async function checkWrite(memoryKey: string, text: string) {
    const res = await checkMemoryWrite(memoryKey, text)
    return res.data
  }

  /** 保存编辑内容（调接口，version 自增，合并返回；confirmed 透传安全确认；刷新统计） */
  async function saveContent(content: string, confirmed?: boolean): Promise<void> {
    const file = selected.value
    if (!file) return
    const res = await saveMemoryContent(file.id, content, confirmed)
    mergeFile(res.data)
    // 内容变更影响版本，标记详情需重新拉取
    detailLoaded.value.delete(file.id)
    editing.value = false
    await refreshStats()
  }

  /** 更新当前文件的权限配置（调接口，合并返回） */
  async function updatePermission(patch: Partial<MemoryPermission>): Promise<void> {
    const file = selected.value
    if (!file) return
    const res = await updateMemoryPermission(file.id, patch as Record<string, boolean>)
    mergeFile(res.data)
    await refreshStats()
  }

  /** 新建记忆文件（调接口，追加到列表并选中） */
  async function createMemory(payload: {
    memoryKey: string
    name?: string
    description?: string
    content?: string
    category?: string
    riskLevel?: string
  }): Promise<void> {
    await createMemoryApi(payload)
    await fetchAll()
    selectedId.value = payload.memoryKey
    await loadDetail(payload.memoryKey)
  }

  /** 删除记忆文件（调接口，刷新列表并重选） */
  async function removeMemory(memoryKey: string): Promise<void> {
    await deleteMemoryApi(memoryKey)
    await fetchAll()
  }

  /** 启用/停用记忆文件（调接口，合并返回；刷新统计） */
  async function toggleFile(memoryKey: string, enabled: boolean): Promise<void> {
    const res = await toggleMemoryApi(memoryKey, enabled)
    mergeFile(res.data)
    await refreshStats()
  }

  /** 单独刷新统计概览（写操作后同步卡片数字） */
  async function refreshStats(): Promise<void> {
    const res = await fetchMemoryStats()
    if (res.data) stats.value = res.data
  }

  /** 回滚到指定版本（调接口：覆盖内容+version 递增+写 rollback 快照，刷新详情） */
  async function rollback(version: string, confirmed?: boolean): Promise<void> {
    const file = selected.value
    if (!file) return
    const res = await rollbackMemoryApi(file.id, version, confirmed)
    mergeFile(res.data)
    editing.value = false
    // 回滚新增了版本快照，标记详情需重新拉取
    detailLoaded.value.delete(file.id)
    await loadDetail(file.id)
    await refreshStats()
  }

  /** 确认待确认记忆（调接口：追加到目标文件+写快照；刷新目标文件详情/pending/stats，text 可覆盖原文） */
  async function confirmPending(id: string, text?: string, confirmed?: boolean): Promise<void> {
    const item = pending.value.find((p) => p.id === id)
    if (!item) return
    const res = await confirmPendingApi(parseId(id), text, confirmed)
    pending.value = pending.value.filter((p) => p.id !== id)
    // 目标文件内容/版本已变，失效其详情缓存并按需刷新
    const targetKey = res.data?.memoryKey ?? item.target
    detailLoaded.value.delete(targetKey)
    if (selectedId.value === targetKey) await loadDetail(targetKey)
    await refreshStats()
  }

  /** 忽略待确认记忆（调接口，从列表移除） */
  async function ignorePending(id: string): Promise<void> {
    await ignorePendingApi(parseId(id))
    pending.value = pending.value.filter((p) => p.id !== id)
    await refreshStats()
  }

  /** 应用模型建议（调接口：追加到当前文件+写快照；刷新当前文件详情，text 可覆盖原文） */
  async function applySuggestion(suggestionId: string, text?: string, confirmed?: boolean): Promise<void> {
    const file = selected.value
    if (!file) return
    await applySuggestionApi(parseId(suggestionId), text, confirmed)
    // 内容/版本/建议列表已变，失效详情缓存并重拉
    detailLoaded.value.delete(file.id)
    await loadDetail(file.id)
    await refreshStats()
  }

  /** 忽略模型建议（调接口，重拉当前文件详情以更新建议列表） */
  async function ignoreSuggestion(suggestionId: string): Promise<void> {
    const file = selected.value
    if (!file) return
    await ignoreSuggestionApi(parseId(suggestionId))
    detailLoaded.value.delete(file.id)
    await loadDetail(file.id)
  }

  return {
    files,
    pending,
    stats,
    selectedId,
    editing,
    loading,
    selected,
    pendingCount,
    fetchAll,
    loadDetail,
    refreshStats,
    checkWrite,
    createMemory,
    removeMemory,
    toggleFile,
    select,
    startEdit,
    cancelEdit,
    saveContent,
    updatePermission,
    rollback,
    confirmPending,
    ignorePending,
    applySuggestion,
    ignoreSuggestion
  }
})
