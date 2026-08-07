/**
 * 岗位管理页 · 智能体桥接 composable
 *
 * 把页面方法/状态适配为智能体操作与上下文快照，并管理注册/注销生命周期。
 * 与部门页桥接同构；不复制业务逻辑，写操作复用页面方法或 organization api。
 */
import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/modules/user'
import { registerActions } from '@/agent/frontend-action-registry'
import { setPageContextProvider, type PageContext } from '@/agent/page-context'
import { addPosition, updatePosition, deletePosition } from '@/api/organization'
import { buildPositionActions } from './position-agent-actions'

/** 岗位行（与页面内 PositionItem 一致的最小结构） */
interface PositionRow {
  id: number
  name: string
  description: string | null
  orderNum: number
  createTime: string
}

/** 页面提供给桥接层的状态与方法句柄 */
export interface PositionBridgeDeps {
  /** 岗位列表数据 */
  tableData: Ref<PositionRow[]>
  /** 筛选表单（含 keyword） */
  filterForm: { keyword: string }
  /** 编辑/新增共用表单对象（reactive） */
  form: Record<string, unknown>
  /** 执行查询 */
  onSearch: () => void
  /** 刷新列表 */
  onRefresh: () => void
  /** 打开新增窗口 */
  onAdd: () => void
  /** 打开编辑窗口（传入行数据） */
  onEdit: (row: PositionRow) => void
  /** 提交当前表单 */
  onSubmit: () => Promise<void> | void
}

/** 智能体可填写/提交的岗位字段白名单 */
const FIELD_WHITELIST = ['name', 'description', 'orderNum'] as const

/** 从入参挑出白名单字段 */
function pickFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  FIELD_WHITELIST.forEach((k) => {
    if (fields[k] !== undefined) out[k] = fields[k]
  })
  return out
}

/**
 * 装配岗位页的智能体桥接：注册操作 + 上下文快照，生命周期内部管理。
 * @param deps 页面状态与方法句柄
 */
export function usePositionAgentBridge(deps: PositionBridgeDeps): void {
  const route = useRoute()
  const userStore = useUserStore()

  /** 按 ID 查找岗位行 */
  const findRow = (id: number): PositionRow | null =>
    deps.tableData.value.find((r) => r.id === id) || null

  /** 填写表单字段（仅白名单，不提交） */
  const fillFormFields = (fields: Record<string, unknown>) => {
    FIELD_WHITELIST.forEach((k) => {
      if (fields[k] !== undefined) deps.form[k] = fields[k]
    })
  }

  /** 按 ID 打开编辑窗口：复用页面 onEdit(row) */
  const openEditById = (id: number): boolean => {
    const row = findRow(id)
    if (!row) return false
    deps.onEdit(row)
    return true
  }

  /** 原子新增岗位（直接调 api + 刷新） */
  const createDirect = async (fields: Record<string, unknown>): Promise<string> => {
    const data = pickFields(fields)
    const name = String(data.name || '').trim()
    if (!name) throw new Error('岗位名称不能为空')
    await addPosition({
      name,
      description: (data.description as string) || undefined,
      orderNum: data.orderNum as number | undefined
    })
    ElMessage.success('新增成功')
    deps.onRefresh()
    return name
  }

  /** 原子更新岗位（按 ID，仅提交传入字段） */
  const updateDirect = async (
    id: number,
    fields: Record<string, unknown>
  ): Promise<string | null> => {
    const row = findRow(id)
    if (!row) return null
    const data = pickFields(fields)
    if (!Object.keys(data).length) throw new Error('未提供任何待更新字段')
    await updatePosition({ id, ...(data as { name?: string; description?: string; orderNum?: number }) })
    ElMessage.success('更新成功')
    deps.onRefresh()
    return (data.name as string) ?? row.name
  }

  /** 按 ID 删除岗位（智能体已确认，直接调 api + 刷新） */
  const deleteById = async (id: number): Promise<string | null> => {
    const row = findRow(id)
    if (!row) return null
    await deletePosition(id)
    ElMessage.success('删除成功')
    deps.onRefresh()
    return row.name
  }

  /** 生成页面上下文快照 */
  const buildSnapshot = (): PageContext => ({
    pageId: 'organization.position',
    route: route.path,
    pageTitle: '岗位管理',
    module: 'organization',
    availableActions: [
      'ui.setFilters',
      'ui.search',
      'ui.refresh',
      'position.openCreateDialog',
      'position.openEditDialog',
      'position.fillForm',
      'position.submitForm',
      'position.create',
      'position.update',
      'position.delete'
    ],
    filters: { keyword: deps.filterForm.keyword },
    selectedRowIds: [],
    expandedRowIds: [],
    pagination: { page: 1, pageSize: deps.tableData.value.length, total: deps.tableData.value.length },
    visibleColumns: [
      { key: 'name', title: '岗位名称', dataType: 'string' },
      { key: 'description', title: '岗位描述', dataType: 'string' },
      { key: 'orderNum', title: '排序', dataType: 'number' },
      { key: 'createTime', title: '创建时间', dataType: 'date' }
    ],
    rows: deps.tableData.value.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? '',
      orderNum: r.orderNum ?? null,
      createTime: r.createTime ?? null
    })),
    permissions: (userStore.info?.buttons || []).filter((p) => p.startsWith('sys:position:'))
  })

  let disposeActions: (() => void) | null = null
  let disposeContext: (() => void) | null = null

  onMounted(() => {
    disposeActions = registerActions(
      buildPositionActions({
        setFilterKeyword: (kw) => (deps.filterForm.keyword = kw),
        getFilterKeyword: () => deps.filterForm.keyword,
        search: deps.onSearch,
        refresh: deps.onRefresh,
        openCreate: deps.onAdd,
        openEdit: openEditById,
        fillForm: fillFormFields,
        submitForm: deps.onSubmit,
        createDirect,
        updateDirect,
        deleteById,
        snapshot: buildSnapshot
      })
    )
    disposeContext = setPageContextProvider(buildSnapshot)
  })

  onUnmounted(() => {
    disposeActions?.()
    disposeContext?.()
  })
}
