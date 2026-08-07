/**
 * 用户管理页 · 智能体桥接 composable
 *
 * 把页面方法/状态适配为智能体操作与上下文快照，管理注册/注销生命周期。
 * 不复制业务逻辑，写操作复用 userApi。不纳入导入/导出、批量设岗位/角色（页面占位）。
 */
import { onMounted, onUnmounted, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/modules/user'
import { registerActions } from '@/agent/frontend-action-registry'
import { setPageContextProvider, type PageContext } from '@/agent/page-context'
import { userApi, type AdminUser } from '@/api/user'
import { buildUserActions } from './user-agent-actions'

/** 页面提供给桥接层的状态与方法句柄 */
export interface UserBridgeDeps {
  /** 用户列表数据 */
  tableData: Ref<AdminUser[]>
  /** 当前选中行（批量操作用） */
  selectedRows: Ref<AdminUser[]>
  /** 筛选表单（keyword + status，status 为 '' 或数字） */
  filterForm: { keyword: string; status: number | '' }
  /** 分页信息 */
  pagination: { page: number; pageSize: number; total: number }
  /** 当前选中部门 ID 的 ref（undefined 表示全部） */
  selectedDeptId: Ref<number | undefined>
  /** 编辑/新增共用表单对象（reactive） */
  form: Record<string, unknown>
  /** 新增/编辑态标志 ref */
  isEditing: Ref<boolean>
  /** 执行查询（回第一页） */
  onSearch: () => void
  /** 重置筛选 */
  onReset: () => void
  /** 刷新列表 */
  onRefresh: () => void
  /** 打开新增窗口 */
  onAdd: () => void
  /** 打开编辑窗口（传入行数据） */
  onEdit: (row: AdminUser) => void
  /** 提交当前表单 */
  onSubmit: () => Promise<void> | void
}

/** 智能体可填写的用户字段白名单（编辑/新增共用；username/password 仅新增有效） */
const EDIT_FIELDS = ['name', 'phone', 'email', 'departmentId', 'positionId', 'roleIds'] as const
const CREATE_ONLY_FIELDS = ['username', 'password'] as const

/** 从入参挑出指定白名单字段 */
function pick(fields: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  keys.forEach((k) => {
    if (fields[k] !== undefined) out[k] = fields[k]
  })
  return out
}

/**
 * 装配用户页的智能体桥接：注册操作 + 上下文快照，生命周期内部管理。
 * @param deps 页面状态与方法句柄
 */
export function useUserAgentBridge(deps: UserBridgeDeps): void {
  const route = useRoute()
  const userStore = useUserStore()

  /** 运行时用户行含后端返回的 name 字段（AdminUser 类型未声明，此处补充） */
  type UserRow = AdminUser & { name?: string }

  /** 按 ID 查找用户行 */
  const findRow = (id: number): UserRow | null =>
    (deps.tableData.value.find((r) => r.id === id) as UserRow | undefined) || null

  /** 填写表单字段（编辑字段 + 新增态下的 username/password） */
  const fillFormFields = (fields: Record<string, unknown>) => {
    ;[...EDIT_FIELDS, ...CREATE_ONLY_FIELDS].forEach((k) => {
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

  /** 原子新增用户（直接调 api + 刷新） */
  const createDirect = async (fields: Record<string, unknown>): Promise<string> => {
    const edit = pick(fields, EDIT_FIELDS)
    const create = pick(fields, CREATE_ONLY_FIELDS)
    const username = String(create.username || '').trim()
    const password = String(create.password || '')
    if (!username) throw new Error('账号不能为空')
    if (!password) throw new Error('密码不能为空')
    await userApi.add({
      username,
      password,
      name: (edit.name as string) || undefined,
      phone: (edit.phone as string) || undefined,
      email: (edit.email as string) || undefined,
      departmentId: edit.departmentId as number | undefined,
      positionId: edit.positionId as number | undefined,
      roleIds: edit.roleIds as number[] | undefined
    })
    ElMessage.success('新增成功')
    deps.onRefresh()
    return (edit.name as string) || username
  }

  /** 原子更新用户（按 ID，仅提交传入字段；账号不可改） */
  const updateDirect = async (
    id: number,
    fields: Record<string, unknown>
  ): Promise<string | null> => {
    const row = findRow(id)
    if (!row) return null
    const data = pick(fields, EDIT_FIELDS)
    if (!Object.keys(data).length) throw new Error('未提供任何待更新字段')
    await userApi.update({ id, ...data })
    ElMessage.success('更新成功')
    deps.onRefresh()
    return (data.name as string) ?? row.name ?? row.username
  }

  /** 按 ID 删除用户（智能体已确认，直接调 api + 刷新） */
  const deleteById = async (id: number): Promise<string | null> => {
    const row = findRow(id)
    if (!row) return null
    await userApi.delete(id)
    ElMessage.success('删除成功')
    deps.onRefresh()
    return row.name ?? row.username
  }

  /** 批量删除用户 */
  const batchDelete = async (ids: number[]): Promise<number> => {
    await userApi.batchDelete(ids)
    ElMessage.success('批量删除成功')
    deps.onRefresh()
    return ids.length
  }

  /** 设置用户启用状态 */
  const setStatus = async (id: number, status: number): Promise<string | null> => {
    const row = findRow(id)
    if (!row) return null
    await userApi.updateStatus(id, status)
    ElMessage.success('状态更新成功')
    deps.onRefresh()
    return row.name ?? row.username
  }

  /** 生成页面上下文快照 */
  const buildSnapshot = (): PageContext => ({
    pageId: 'organization.user',
    route: route.path,
    pageTitle: '用户管理',
    module: 'organization',
    availableActions: [
      'ui.setFilters',
      'ui.filterByDepartment',
      'ui.search',
      'ui.resetFilters',
      'ui.refresh',
      'user.openCreateDialog',
      'user.openEditDialog',
      'user.fillForm',
      'user.submitForm',
      'user.create',
      'user.update',
      'user.setStatus',
      'user.delete',
      'user.batchDelete'
    ],
    filters: {
      keyword: deps.filterForm.keyword,
      status: deps.filterForm.status === '' ? null : deps.filterForm.status,
      departmentId: deps.selectedDeptId.value ?? null
    },
    selectedRowIds: deps.selectedRows.value.map((r) => String(r.id)),
    expandedRowIds: [],
    pagination: {
      page: deps.pagination.page,
      pageSize: deps.pagination.pageSize,
      total: deps.pagination.total
    },
    visibleColumns: [
      { key: 'name', title: '姓名', dataType: 'string' },
      { key: 'username', title: '账号', dataType: 'string' },
      { key: 'departmentName', title: '所属部门', dataType: 'string' },
      { key: 'positionName', title: '岗位', dataType: 'string' },
      { key: 'status', title: '状态', dataType: 'number' }
    ],
    rows: deps.tableData.value.map((r) => {
      const row = r as AdminUser & {
        name?: string
        department?: { name?: string }
        position?: { name?: string }
        userRoles?: Array<{ role?: { name?: string } }>
      }
      return {
        id: row.id,
        name: row.name ?? '',
        username: row.username,
        departmentName: row.department?.name ?? '',
        positionName: row.position?.name ?? '',
        roleNames: (row.userRoles || []).map((ur) => ur.role?.name).filter(Boolean).join(', '),
        status: row.status ?? null
      }
    }),
    permissions: (userStore.info?.buttons || []).filter((p) => p.startsWith('sys:user:'))
  })

  let disposeActions: (() => void) | null = null
  let disposeContext: (() => void) | null = null

  onMounted(() => {
    disposeActions = registerActions(
      buildUserActions({
        setFilters: (f) => {
          // 仅在提供时更新，避免只传 keyword 时把已设的 status 筛选静默清空
          if (f.keyword !== undefined) deps.filterForm.keyword = f.keyword
          if (f.status !== undefined) deps.filterForm.status = f.status
        },
        filterByDept: (departmentId) => {
          deps.selectedDeptId.value = departmentId
          deps.pagination.page = 1
        },
        search: deps.onSearch,
        reset: deps.onReset,
        refresh: deps.onRefresh,
        openCreate: deps.onAdd,
        openEdit: openEditById,
        fillForm: fillFormFields,
        submitForm: deps.onSubmit,
        createDirect,
        updateDirect,
        deleteById,
        batchDelete,
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
