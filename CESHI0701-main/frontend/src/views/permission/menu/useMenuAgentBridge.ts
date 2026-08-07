/**
 * 菜单管理页 · 智能体桥接 composable
 *
 * 把页面方法/状态适配为智能体操作与上下文快照，管理注册/注销生命周期。
 * 菜单为树形：递归查找与扁平化快照（参考部门页）；不复制业务逻辑，写操作复用 permission api。
 */
import { onMounted, onUnmounted, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/modules/user'
import { registerActions } from '@/agent/frontend-action-registry'
import { setPageContextProvider, type PageContext } from '@/agent/page-context'
import { addMenu, updateMenu, deleteMenu, updateMenuStatus } from '@/api/permission'
import { buildMenuActions } from './menu-agent-actions'

/** 菜单行（与页面内 MenuItem 结构一致的必要子集） */
interface MenuRow {
  id: number
  parentId: number | null
  name: string
  router: string | null
  perms: string | null
  type: number
  icon: string | null
  orderNum: number
  viewPath: string | null
  keepAlive: number
  isShow: number
  createTime: string
  updateTime: string
  children?: MenuRow[]
}

/** 页面提供给桥接层的状态与方法句柄 */
export interface MenuBridgeDeps {
  /** 菜单树数据 */
  tableData: Ref<MenuRow[]>
  /** 筛选表单（keyword + type） */
  filterForm: { keyword: string; type?: number }
  /** 编辑/新增共用表单对象（reactive） */
  form: Record<string, unknown>
  /** 执行查询 */
  onSearch: () => void
  /** 刷新列表 */
  onRefresh: () => void
  /** 展开/收起全部；返回当前是否展开 */
  onToggleExpand: () => boolean
  /** 打开新增窗口（可选父菜单 ID） */
  onAdd: (parentId?: number) => void
  /** 打开编辑窗口（传入行数据） */
  onEdit: (row: MenuRow) => void
  /** 提交当前表单 */
  onSubmit: () => Promise<void> | void
}

/** 智能体可填写/提交的菜单字段白名单 */
const FIELD_WHITELIST = [
  'name',
  'type',
  'parentId',
  'router',
  'viewPath',
  'icon',
  'perms',
  'orderNum',
  'isShow',
  'keepAlive'
] as const

/** 从入参挑出白名单字段 */
function pickFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  FIELD_WHITELIST.forEach((k) => {
    if (fields[k] !== undefined) out[k] = fields[k]
  })
  return out
}

/**
 * 装配菜单页的智能体桥接：注册操作 + 上下文快照，生命周期内部管理。
 * @param deps 页面状态与方法句柄
 */
export function useMenuAgentBridge(deps: MenuBridgeDeps): void {
  const route = useRoute()
  const userStore = useUserStore()

  /** 递归按 ID 查找菜单行 */
  const findRow = (rows: MenuRow[], id: number): MenuRow | null => {
    for (const r of rows) {
      if (r.id === id) return r
      const hit = r.children ? findRow(r.children, id) : null
      if (hit) return hit
    }
    return null
  }

  /** 填写表单字段（仅白名单，不提交） */
  const fillFormFields = (fields: Record<string, unknown>) => {
    FIELD_WHITELIST.forEach((k) => {
      if (fields[k] !== undefined) deps.form[k] = fields[k]
    })
  }

  /** 按 ID 打开编辑窗口：复用页面 onEdit(row) */
  const openEditById = (id: number): boolean => {
    const row = findRow(deps.tableData.value, id)
    if (!row) return false
    deps.onEdit(row)
    return true
  }

  /** 原子新增菜单（直接调 api + 刷新） */
  const createDirect = async (fields: Record<string, unknown>): Promise<string> => {
    const data = pickFields(fields)
    const name = String(data.name || '').trim()
    if (!name) throw new Error('菜单名称不能为空')
    if (typeof data.type !== 'number') throw new Error('缺少菜单类型 type')
    await addMenu({
      name,
      type: data.type,
      parentId: data.parentId as number | undefined,
      router: (data.router as string) || undefined,
      viewPath: (data.viewPath as string) || undefined,
      icon: (data.icon as string) || undefined,
      perms: (data.perms as string) || undefined,
      orderNum: data.orderNum as number | undefined,
      isShow: data.isShow as number | undefined,
      keepAlive: data.keepAlive as number | undefined
    })
    ElMessage.success('新增成功')
    deps.onRefresh()
    return name
  }

  /** 原子更新菜单（按 ID，仅提交传入字段） */
  const updateDirect = async (
    id: number,
    fields: Record<string, unknown>
  ): Promise<string | null> => {
    const row = findRow(deps.tableData.value, id)
    if (!row) return null
    const data = pickFields(fields)
    if (!Object.keys(data).length) throw new Error('未提供任何待更新字段')
    await updateMenu({ id, ...data })
    ElMessage.success('更新成功')
    deps.onRefresh()
    return (data.name as string) ?? row.name
  }

  /** 按 ID 删除菜单（智能体已确认，直接调 api + 刷新） */
  const deleteById = async (id: number): Promise<string | null> => {
    const row = findRow(deps.tableData.value, id)
    if (!row) return null
    await deleteMenu(id)
    ElMessage.success('删除成功')
    deps.onRefresh()
    return row.name
  }

  /** 设置菜单显示状态 */
  const setShow = async (id: number, isShow: number): Promise<string | null> => {
    const row = findRow(deps.tableData.value, id)
    if (!row) return null
    await updateMenuStatus(id, isShow)
    ElMessage.success('状态更新成功')
    deps.onRefresh()
    return row.name
  }

  /** 扁平化菜单树为行摘要（字段与 visibleColumns 一致） */
  const flattenRows = (rows: MenuRow[]): Array<Record<string, unknown>> => {
    const out: Array<Record<string, unknown>> = []
    const walk = (list: MenuRow[]) => {
      list.forEach((r) => {
        out.push({
          id: r.id,
          parentId: r.parentId ?? null,
          name: r.name,
          type: r.type,
          perms: r.perms ?? '',
          orderNum: r.orderNum ?? null,
          isShow: r.isShow,
          updateTime: r.updateTime ?? null
        })
        if (r.children?.length) walk(r.children)
      })
    }
    walk(rows)
    return out
  }

  /** 生成页面上下文快照 */
  const buildSnapshot = (): PageContext => ({
    pageId: 'permission.menu',
    route: route.path,
    pageTitle: '菜单管理',
    module: 'permission',
    availableActions: [
      'ui.setFilters',
      'ui.search',
      'ui.refresh',
      'menu.toggleExpand',
      'menu.openCreateDialog',
      'menu.openEditDialog',
      'menu.fillForm',
      'menu.submitForm',
      'menu.create',
      'menu.update',
      'menu.setShow',
      'menu.delete'
    ],
    filters: { keyword: deps.filterForm.keyword, type: deps.filterForm.type ?? null },
    selectedRowIds: [],
    expandedRowIds: [],
    pagination: { page: 1, pageSize: 0, total: 0 },
    visibleColumns: [
      { key: 'name', title: '菜单名称', dataType: 'string' },
      { key: 'type', title: '类型', dataType: 'number' },
      { key: 'perms', title: '权限标识', dataType: 'string' },
      { key: 'orderNum', title: '排序', dataType: 'number' },
      { key: 'isShow', title: '显示', dataType: 'number' },
      { key: 'updateTime', title: '更新时间', dataType: 'date' }
    ],
    rows: flattenRows(deps.tableData.value),
    permissions: (userStore.info?.buttons || []).filter((p) => p.startsWith('sys:menu:'))
  })

  let disposeActions: (() => void) | null = null
  let disposeContext: (() => void) | null = null

  onMounted(() => {
    disposeActions = registerActions(
      buildMenuActions({
        setFilters: (f) => {
          // 仅在提供时更新，避免只传 keyword 时把已设的 type 筛选静默清空
          if (f.keyword !== undefined) deps.filterForm.keyword = f.keyword
          if (f.type !== undefined) deps.filterForm.type = f.type
        },
        getFilters: () => ({ keyword: deps.filterForm.keyword, type: deps.filterForm.type }),
        search: deps.onSearch,
        refresh: deps.onRefresh,
        toggleExpand: deps.onToggleExpand,
        openCreate: deps.onAdd,
        openEdit: openEditById,
        fillForm: fillFormFields,
        submitForm: deps.onSubmit,
        createDirect,
        updateDirect,
        deleteById,
        setShow,
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
