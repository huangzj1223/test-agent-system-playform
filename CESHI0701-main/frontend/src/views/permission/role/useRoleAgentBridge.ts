/**
 * 角色管理页 · 智能体桥接 composable
 *
 * 把页面方法/状态适配为智能体操作与上下文快照，管理注册/注销生命周期。
 * 不复制业务逻辑，写操作复用 permission api。「分配权限树」不纳入（交互复杂）。
 */
import { onMounted, onUnmounted, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/modules/user'
import { registerActions } from '@/agent/frontend-action-registry'
import { setPageContextProvider, type PageContext } from '@/agent/page-context'
import { addRole, updateRole, deleteRole, updateRoleStatus } from '@/api/permission'
import { buildRoleActions } from './role-agent-actions'

/** 角色行（与页面内 RoleItem 结构一致） */
interface RoleRow {
  id: number
  name: string
  label: string | null
  remark: string | null
  status: number
  createTime: string
  updateTime: string
}

/** 页面提供给桥接层的状态与方法句柄 */
export interface RoleBridgeDeps {
  /** 角色列表数据 */
  tableData: Ref<RoleRow[]>
  /** 筛选表单（keyword + status） */
  filterForm: { keyword: string; status?: number }
  /** 分页信息 */
  pagination: { page: number; pageSize: number; total: number }
  /** 编辑/新增共用表单对象（reactive） */
  form: Record<string, unknown>
  /** 执行查询（回第一页） */
  onSearch: () => void
  /** 刷新列表 */
  onRefresh: () => void
  /** 打开新增窗口 */
  onAdd: () => void
  /** 打开编辑窗口（传入行数据） */
  onEdit: (row: RoleRow) => void
  /** 提交当前表单 */
  onSubmit: () => Promise<void> | void
}

/** 智能体可填写/提交的角色字段白名单 */
const FIELD_WHITELIST = ['name', 'label', 'remark', 'status'] as const

/** 从入参挑出白名单字段 */
function pickFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  FIELD_WHITELIST.forEach((k) => {
    if (fields[k] !== undefined) out[k] = fields[k]
  })
  return out
}

/**
 * 装配角色页的智能体桥接：注册操作 + 上下文快照，生命周期内部管理。
 * @param deps 页面状态与方法句柄
 */
export function useRoleAgentBridge(deps: RoleBridgeDeps): void {
  const route = useRoute()
  const userStore = useUserStore()

  /** 按 ID 查找角色行 */
  const findRow = (id: number): RoleRow | null =>
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

  /** 原子新增角色（直接调 api + 刷新） */
  const createDirect = async (fields: Record<string, unknown>): Promise<string> => {
    const data = pickFields(fields)
    const name = String(data.name || '').trim()
    if (!name) throw new Error('角色名称不能为空')
    await addRole({
      name,
      label: (data.label as string) || undefined,
      remark: (data.remark as string) || undefined,
      status: data.status as number | undefined
    })
    ElMessage.success('新增成功')
    deps.onRefresh()
    return name
  }

  /** 原子更新角色（按 ID，仅提交传入字段） */
  const updateDirect = async (
    id: number,
    fields: Record<string, unknown>
  ): Promise<string | null> => {
    const row = findRow(id)
    if (!row) return null
    const data = pickFields(fields)
    if (!Object.keys(data).length) throw new Error('未提供任何待更新字段')
    await updateRole({ id, ...(data as { name?: string; label?: string; remark?: string; status?: number }) })
    ElMessage.success('更新成功')
    deps.onRefresh()
    return (data.name as string) ?? row.name
  }

  /** 按 ID 删除角色（智能体已确认，直接调 api + 刷新） */
  const deleteById = async (id: number): Promise<string | null> => {
    const row = findRow(id)
    if (!row) return null
    await deleteRole(id)
    ElMessage.success('删除成功')
    deps.onRefresh()
    return row.name
  }

  /** 设置角色启用状态 */
  const setStatus = async (id: number, status: number): Promise<string | null> => {
    const row = findRow(id)
    if (!row) return null
    await updateRoleStatus(id, status)
    ElMessage.success('状态更新成功')
    deps.onRefresh()
    return row.name
  }

  /** 生成页面上下文快照 */
  const buildSnapshot = (): PageContext => ({
    pageId: 'permission.role',
    route: route.path,
    pageTitle: '角色管理',
    module: 'permission',
    availableActions: [
      'ui.setFilters',
      'ui.search',
      'ui.refresh',
      'role.openCreateDialog',
      'role.openEditDialog',
      'role.fillForm',
      'role.submitForm',
      'role.create',
      'role.update',
      'role.setStatus',
      'role.delete'
    ],
    filters: { keyword: deps.filterForm.keyword, status: deps.filterForm.status ?? null },
    selectedRowIds: [],
    expandedRowIds: [],
    pagination: {
      page: deps.pagination.page,
      pageSize: deps.pagination.pageSize,
      total: deps.pagination.total
    },
    visibleColumns: [
      { key: 'name', title: '名称', dataType: 'string' },
      { key: 'label', title: '标识', dataType: 'string' },
      { key: 'remark', title: '备注', dataType: 'string' },
      { key: 'status', title: '状态', dataType: 'number' },
      { key: 'createTime', title: '创建时间', dataType: 'date' }
    ],
    rows: deps.tableData.value.map((r) => ({
      id: r.id,
      name: r.name,
      label: r.label ?? '',
      remark: r.remark ?? '',
      status: r.status,
      createTime: r.createTime ?? null
    })),
    permissions: (userStore.info?.buttons || []).filter((p) => p.startsWith('sys:role:'))
  })

  let disposeActions: (() => void) | null = null
  let disposeContext: (() => void) | null = null

  onMounted(() => {
    disposeActions = registerActions(
      buildRoleActions({
        setFilters: (f) => {
          // 仅在提供时更新，避免只传 keyword 时把已设的 status 筛选静默清空
          if (f.keyword !== undefined) deps.filterForm.keyword = f.keyword
          if (f.status !== undefined) deps.filterForm.status = f.status
        },
        getFilters: () => ({ keyword: deps.filterForm.keyword, status: deps.filterForm.status }),
        search: deps.onSearch,
        refresh: deps.onRefresh,
        openCreate: deps.onAdd,
        openEdit: openEditById,
        fillForm: fillFormFields,
        submitForm: deps.onSubmit,
        createDirect,
        updateDirect,
        deleteById,
        setStatus,
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
