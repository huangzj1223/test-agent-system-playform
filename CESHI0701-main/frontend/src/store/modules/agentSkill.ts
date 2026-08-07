/**
 * 智能体技能 Store
 * 维护技能列表（筛选/分页）、统计概览、分类计数、当前选中技能与其运行日志，
 * 以及能力目录（新建技能用）。数据以后端为准，状态改动后由调用方触发 syncSkillTools()。
 */
import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import {
  fetchSkillList,
  fetchSkillStats,
  fetchSkillCategories,
  fetchCapabilityCatalog,
  fetchSkillEnums,
  createSkill as apiCreate,
  updateSkill as apiUpdate,
  toggleSkill as apiToggle,
  deleteSkill as apiDelete,
  type AgentSkill,
  type AgentCapabilityItem,
  type SkillStats,
  type SkillCategoryCount,
  type SkillListQuery,
  type SkillEnums,
  type Pagination,
  type CreateSkillPayload,
  type UpdateSkillPayload
} from '@/api/agentSkill'

/** 空统计（拉取前占位） */
const EMPTY_STATS: SkillStats = { total: 0, enabled: 0, highRisk: 0, calls7d: 0, failRate: 0 }

export const useAgentSkillStore = defineStore('agentSkill', () => {
  /** 当前页技能列表 */
  const skills = ref<AgentSkill[]>([])
  /** 能力目录 */
  const catalog = ref<AgentCapabilityItem[]>([])
  /** 枚举（分类/风险含说明/适用智能体），来自后端，替代前端写死常量 */
  const enums = ref<SkillEnums>({ categories: [], riskLevels: [], agents: [] })
  /** 统计概览 */
  const stats = ref<SkillStats>({ ...EMPTY_STATS })
  /** 分类计数 */
  const categories = ref<SkillCategoryCount>({ total: 0, categories: [] })
  /** 分页信息 */
  const pagination = reactive<Pagination>({ page: 1, pageSize: 10, total: 0 })
  /** 当前筛选条件 */
  const filter = reactive<SkillListQuery>({})
  /** 当前选中技能（右侧详情面板） */
  const selected = ref<AgentSkill | null>(null)
  /** 加载中 */
  const loading = ref(false)

  /** 拉取技能列表（用当前 filter + pagination） */
  async function loadSkills(): Promise<void> {
    loading.value = true
    try {
      const res = await fetchSkillList({
        ...filter,
        page: pagination.page,
        pageSize: pagination.pageSize
      })
      skills.value = res.data?.list || []
      if (res.data?.pagination) {
        pagination.total = res.data.pagination.total
      }
      // 用新列表里的同 id 项替换选中引用（回滚/编辑后详情面板才能刷新为最新数据）；
      // 选中项已不在当前页则默认选中第一条，方便右侧详情展示
      const matched = selected.value ? skills.value.find((s) => s.id === selected.value!.id) : undefined
      selected.value = matched ?? skills.value[0] ?? null
    } finally {
      loading.value = false
    }
  }

  /** 拉取统计概览 */
  async function loadStats(): Promise<void> {
    const res = await fetchSkillStats()
    if (res.data) stats.value = res.data
  }

  /** 拉取分类计数 */
  async function loadCategories(): Promise<void> {
    const res = await fetchSkillCategories()
    if (res.data) categories.value = res.data
  }

  /** 拉取能力目录（仅需一次，已加载则跳过） */
  async function loadCatalog(): Promise<void> {
    if (catalog.value.length) return
    const res = await fetchCapabilityCatalog()
    catalog.value = res.data || []
  }

  /** 拉取枚举（分类/风险/适用智能体，仅需一次，已加载则跳过；失败时组件用本地兜底常量） */
  async function loadEnums(): Promise<void> {
    if (enums.value.categories.length) return
    const res = await fetchSkillEnums()
    if (res.data) enums.value = res.data
  }

  /** 一次性刷新概览（列表 + 统计 + 分类），管理台打开或数据变更后调用 */
  async function refreshAll(): Promise<void> {
    await Promise.all([loadSkills(), loadStats(), loadCategories()])
  }

  /** 选中某技能（运行日志由详情面板自行按筛选/分页拉取，此处不再重复请求） */
  function select(skill: AgentSkill): void {
    selected.value = skill
  }

  /** 应用筛选（回到第 1 页并重新拉取列表/分类，统计不随筛选变化） */
  async function applyFilter(patch: Partial<SkillListQuery>): Promise<void> {
    Object.assign(filter, patch)
    pagination.page = 1
    await loadSkills()
  }

  /** 切换页码 */
  async function changePage(page: number): Promise<void> {
    pagination.page = page
    await loadSkills()
  }

  /** 新建技能，成功后刷新概览 */
  async function create(payload: CreateSkillPayload): Promise<void> {
    await apiCreate(payload)
    await refreshAll()
  }

  /** 更新技能，成功后刷新概览 */
  async function update(payload: UpdateSkillPayload): Promise<void> {
    await apiUpdate(payload)
    await refreshAll()
  }

  /** 切换启用状态，成功后刷新概览 */
  async function toggle(id: number, enabled: boolean): Promise<void> {
    await apiToggle(id, enabled)
    await refreshAll()
  }

  /** 删除技能，成功后刷新概览 */
  async function remove(id: number): Promise<void> {
    await apiDelete(id)
    if (selected.value?.id === id) selected.value = null
    await refreshAll()
  }

  return {
    skills,
    catalog,
    enums,
    stats,
    categories,
    pagination,
    filter,
    selected,
    loading,
    loadSkills,
    loadStats,
    loadCategories,
    loadCatalog,
    loadEnums,
    refreshAll,
    select,
    applyFilter,
    changePage,
    create,
    update,
    toggle,
    remove
  }
})
