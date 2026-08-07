/**
 * 部门管理页 · 智能体桥接 composable
 *
 * 把「页面方法/状态」适配为智能体操作与上下文快照，并管理注册/注销生命周期。
 * 从 index.vue 抽离，使页面组件聚焦自身 UI 逻辑（同时满足单文件行数上限）。
 * 不复制业务逻辑：所有写操作仍复用页面传入的方法或 departmentApi。
 */
import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/store/modules/user'
import { registerActions } from '@/agent/frontend-action-registry'
import { setPageContextProvider, type PageContext } from '@/agent/page-context'
import { departmentApi } from '@/api/department'
import type { Department } from '@/types/api'
import { buildDepartmentActions } from './department-agent-actions'

/** 页面提供给桥接层的状态与方法句柄 */
export interface DepartmentBridgeDeps {
  /** 部门树数据 */
  tableData: Ref<Department[]>
  /** ElTable 实例引用（用于展开/收起） */
  tableRef: Ref<{ toggleRowExpansion?: (row: Department, expand: boolean) => void } | undefined>
  /** 筛选表单（含 name） */
  filterForm: { name: string }
  /** 编辑/新增共用表单对象（reactive） */
  form: Partial<Department>
  /** 执行查询 */
  onSearch: () => void
  /** 重置筛选 */
  onReset: () => void
  /** 刷新列表 */
  onRefresh: () => void
  /** 打开编辑窗口（传入行数据） */
  onEdit: (row: Department) => void
  /** 提交当前表单 */
  onSubmit: () => Promise<void> | void
  /** 打开新增窗口，可选父部门 */
  onAdd: (parentId?: number) => void
}

/** 智能体可填写的部门字段白名单（原子创建/更新共用） */
const DEPT_FIELD_WHITELIST = ['name', 'leader', 'type', 'phone', 'orderNum', 'parentId'] as const

/**
 * 装配部门页的智能体桥接：注册操作 + 上下文快照，返回无（生命周期内部管理）。
 * @param deps 页面状态与方法句柄
 */
export function useDepartmentAgentBridge(deps: DepartmentBridgeDeps): void {
  const route = useRoute()
  const userStore = useUserStore()
  /** 展开中的部门 ID（供上下文快照，仅记录通过操作展开的节点） */
  const expandedIds = ref<Set<number>>(new Set())

  /** 扁平化部门树为行摘要，字段与 visibleColumns 一致，供模型解析名称→ID 并读取展示值 */
  function flattenRows(rows: Department[]): Array<Record<string, unknown>> {
    const out: Array<Record<string, unknown>> = []
    const walk = (list: Department[]) => {
      list.forEach((r) => {
        out.push({
          id: r.id,
          name: r.name,
          parentId: r.parentId ?? null,
          type: r.type ?? '',
          leader: r.leader ?? '',
          orderNum: r.orderNum ?? null,
          updateTime: r.updateTime ?? null
        })
        if (r.children?.length) walk(r.children)
      })
    }
    walk(rows)
    return out
  }

  /** 递归按 ID 查找部门行 */
  function findRow(rows: Department[], id: number): Department | null {
    for (const r of rows) {
      if (r.id === id) return r
      const hit = r.children ? findRow(r.children, id) : null
      if (hit) return hit
    }
    return null
  }

  /** 展开/收起指定 ID 节点：调用 ElTable 现有 API，不操作 DOM */
  function toggleNodeById(id: number, expand: boolean): boolean {
    const row = findRow(deps.tableData.value, id)
    if (!row) return false
    deps.tableRef.value?.toggleRowExpansion?.(row, expand)
    if (expand) expandedIds.value.add(id)
    else expandedIds.value.delete(id)
    return true
  }

  /** 按 ID 打开编辑窗口：复用页面 onEdit(row) */
  function openEditById(id: number): boolean {
    const row = findRow(deps.tableData.value, id)
    if (!row) return false
    deps.onEdit(row)
    return true
  }

  /** 填写表单字段（仅白名单字段，不提交） */
  function fillFormFields(fields: Record<string, unknown>) {
    const allow = ['name', 'leader', 'type', 'phone', 'orderNum'] as const
    allow.forEach((k) => {
      if (fields[k] !== undefined) (deps.form as Record<string, unknown>)[k] = fields[k]
    })
  }

  /** 从入参中挑出白名单字段（过滤未知/危险字段） */
  function pickDeptFields(fields: Record<string, unknown>): Partial<Department> {
    const out: Record<string, unknown> = {}
    DEPT_FIELD_WHITELIST.forEach((k) => {
      if (fields[k] !== undefined) out[k] = fields[k]
    })
    return out as Partial<Department>
  }

  /** 按 ID 删除部门（智能体已确认，直接调 api + 刷新） */
  async function deleteDepartmentById(id: number): Promise<string | null> {
    const row = findRow(deps.tableData.value, id)
    if (!row) return null
    await departmentApi.delete(id)
    ElMessage.success('删除成功')
    deps.onRefresh()
    return row.name
  }

  /** 原子新增部门：一次带齐字段，支持 parentId 建下级部门 */
  async function createDepartmentDirect(fields: Record<string, unknown>): Promise<string> {
    const data = pickDeptFields(fields)
    if (!data.name) throw new Error('部门名称不能为空')
    await departmentApi.add({
      name: data.name,
      parentId: data.parentId ?? null,
      type: data.type || undefined,
      leader: data.leader || undefined,
      phone: data.phone || undefined,
      orderNum: data.orderNum
    })
    ElMessage.success('新增成功')
    deps.onRefresh()
    return data.name
  }

  /** 原子更新部门：按 ID 更新，仅提交传入字段（无有效字段时报错） */
  async function updateDepartmentDirect(
    id: number,
    fields: Record<string, unknown>
  ): Promise<string | null> {
    const row = findRow(deps.tableData.value, id)
    if (!row) return null
    const data = pickDeptFields(fields)
    if (!Object.keys(data).length) throw new Error('未提供任何待更新字段')
    await departmentApi.update({ id, ...data })
    ElMessage.success('更新成功')
    deps.onRefresh()
    return data.name ?? row.name
  }

  /** 生成当前页面上下文快照 */
  function buildSnapshot(): PageContext {
    return {
      pageId: 'organization.department',
      route: route.path,
      pageTitle: '部门管理',
      module: 'organization',
      availableActions: [
        'ui.setFilters',
        'ui.search',
        'ui.resetFilters',
        'ui.refresh',
        'department.expandNode',
        'department.collapseNode',
        'department.openCreateDialog',
        'department.openEditDialog',
        'department.fillForm',
        'department.submitForm',
        'department.create',
        'department.update',
        'department.delete'
      ],
      filters: { departmentName: deps.filterForm.name },
      selectedRowIds: [],
      expandedRowIds: Array.from(expandedIds.value).map(String),
      pagination: {
        page: 1,
        pageSize: deps.tableData.value.length,
        total: deps.tableData.value.length
      },
      visibleColumns: [
        { key: 'name', title: '部门名称', dataType: 'string' },
        { key: 'type', title: '类型', dataType: 'string' },
        { key: 'leader', title: '负责人', dataType: 'string' },
        { key: 'orderNum', title: '排序', dataType: 'number' },
        { key: 'updateTime', title: '更新时间', dataType: 'date' }
      ],
      rows: flattenRows(deps.tableData.value),
      permissions: (userStore.info?.buttons || []).filter((p) => p.startsWith('sys:department:'))
    }
  }

  let disposeActions: (() => void) | null = null
  let disposeContext: (() => void) | null = null

  onMounted(() => {
    disposeActions = registerActions(
      buildDepartmentActions({
        setFilterName: (name) => (deps.filterForm.name = name),
        getFilterName: () => deps.filterForm.name,
        search: deps.onSearch,
        reset: deps.onReset,
        refresh: deps.onRefresh,
        toggleNode: toggleNodeById,
        openCreate: (parentId) => deps.onAdd(parentId),
        openEdit: openEditById,
        fillForm: fillFormFields,
        submitForm: deps.onSubmit,
        deleteById: deleteDepartmentById,
        createDirect: createDepartmentDirect,
        updateDirect: updateDepartmentDirect,
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
