/**
 * 部门管理页 · 智能体操作定义
 *
 * 把页面「现有方法」封装为可被智能体调用的 FrontendAction，只做参数适配与结果包装，
 * 不复制任何业务逻辑。页面 onMounted 时注册、onUnmounted 时注销。
 * 安全边界：不操作 DOM、不用选择器模拟点击；high 风险操作声明 requireConfirmation。
 */
import type { FrontendAction, ActionResult } from '@/agent/frontend-action-registry'
import type { PageContext } from '@/agent/page-context'

/** 页面向操作层暴露的方法与状态句柄（由 index.vue 提供） */
export interface DepartmentPageHandles {
  /** 设置筛选：部门名称 */
  setFilterName: (name: string) => void
  /** 读取当前筛选名称 */
  getFilterName: () => string
  /** 执行查询（页面现有方法） */
  search: () => void
  /** 重置筛选（页面现有方法） */
  reset: () => void
  /** 刷新列表（页面现有方法） */
  refresh: () => void
  /** 展开/收起某部门节点；expand=true 展开 */
  toggleNode: (departmentId: number, expand: boolean) => boolean
  /** 打开新增窗口，可选父部门 */
  openCreate: (parentId?: number) => void
  /** 按 ID 打开编辑窗口；返回是否找到该部门 */
  openEdit: (departmentId: number) => boolean
  /** 填写当前表单字段（只填不提交） */
  fillForm: (fields: Record<string, unknown>) => void
  /** 提交当前表单（页面现有方法） */
  submitForm: () => Promise<void> | void
  /** 按 ID 删除部门；返回删除的部门名（未找到返回 null） */
  deleteById: (departmentId: number) => Promise<string | null>
  /** 原子新增部门（一次带齐字段，支持 parentId 建下级）；返回新增部门名 */
  createDirect: (fields: Record<string, unknown>) => Promise<string>
  /** 原子更新部门（按 ID，仅提交传入字段）；返回部门名（未找到返回 null） */
  updateDirect: (departmentId: number, fields: Record<string, unknown>) => Promise<string | null>
  /** 生成当前页面上下文快照 */
  snapshot: () => PageContext
}

/** 部门字段的公共参数 schema（create/update 共用） */
const DEPT_FIELD_PROPS: Record<string, unknown> = {
  name: { type: 'string', description: '部门名称' },
  leader: { type: 'string', description: '负责人' },
  type: { type: 'string', description: '部门类型（省公司/分公司/部门）' },
  phone: { type: 'string', description: '联系电话' },
  orderNum: { type: 'number', description: '排序' }
}

/** 统一成功结果 */
const ok = (action: string, message: string, data?: unknown): ActionResult => ({
  success: true,
  action,
  message,
  data
})

/** 统一失败结果 */
const fail = (action: string, message: string): ActionResult => ({
  success: false,
  action,
  message
})

/** 从参数中稳健读取部门 ID（number 或数字字符串） */
const readId = (args: Record<string, unknown>, keys: string[]): number | null => {
  for (const k of keys) {
    const v = args[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v)
  }
  return null
}

/**
 * 构建部门页的全部智能体操作。
 * @param h 页面方法/状态句柄
 * @returns FrontendAction 数组
 */
export function buildDepartmentActions(h: DepartmentPageHandles): FrontendAction[] {
  const actions: FrontendAction[] = [
    {
      name: 'ui.setFilters',
      description: '设置部门列表的筛选条件（仅修改条件，不自动查询）',
      parameters: {
        type: 'object',
        properties: {
          departmentName: { type: 'string', description: '部门名称筛选关键词' }
        }
      },
      riskLevel: 'low',
      requireConfirmation: false,
      execute: (args) => {
        const name = typeof args.departmentName === 'string' ? args.departmentName : ''
        h.setFilterName(name)
        return ok('ui.setFilters', `已设置筛选条件：部门名称包含"${name || '（空）'}"`)
      }
    },
    {
      name: 'ui.search',
      description: '按当前筛选条件查询部门列表',
      parameters: { type: 'object', properties: {} },
      permission: 'sys:department:list',
      riskLevel: 'low',
      requireConfirmation: false,
      execute: () => {
        h.search()
        return ok('ui.search', '已执行查询')
      }
    },
    {
      name: 'ui.resetFilters',
      description: '重置部门列表的筛选条件并刷新',
      parameters: { type: 'object', properties: {} },
      riskLevel: 'low',
      requireConfirmation: false,
      execute: () => {
        h.reset()
        return ok('ui.resetFilters', '已重置筛选条件')
      }
    },
    {
      name: 'ui.refresh',
      description: '刷新当前部门列表',
      parameters: { type: 'object', properties: {} },
      riskLevel: 'low',
      requireConfirmation: false,
      execute: () => {
        h.refresh()
        return ok('ui.refresh', '已刷新列表')
      }
    },
    {
      name: 'department.expandNode',
      description: '展开指定 ID 的部门树节点',
      parameters: {
        type: 'object',
        properties: { departmentId: { type: 'string', description: '部门 ID' } },
        required: ['departmentId']
      },
      riskLevel: 'low',
      requireConfirmation: false,
      execute: (args) => {
        const id = readId(args, ['departmentId'])
        if (id === null) return fail('department.expandNode', '缺少有效的部门 ID')
        return h.toggleNode(id, true)
          ? ok('department.expandNode', `已展开部门 ${id}`)
          : fail('department.expandNode', `未找到可展开的部门 ${id}`)
      }
    },
    {
      name: 'department.collapseNode',
      description: '收起指定 ID 的部门树节点',
      parameters: {
        type: 'object',
        properties: { departmentId: { type: 'string', description: '部门 ID' } },
        required: ['departmentId']
      },
      riskLevel: 'low',
      requireConfirmation: false,
      execute: (args) => {
        const id = readId(args, ['departmentId'])
        if (id === null) return fail('department.collapseNode', '缺少有效的部门 ID')
        return h.toggleNode(id, false)
          ? ok('department.collapseNode', `已收起部门 ${id}`)
          : fail('department.collapseNode', `未找到可收起的部门 ${id}`)
      }
    },
    {
      name: 'department.openCreateDialog',
      description: '打开新增部门窗口，可选指定父部门',
      parameters: {
        type: 'object',
        properties: {
          parentDepartmentId: { type: 'string', description: '父部门 ID（可选）' }
        }
      },
      permission: 'sys:department:add',
      riskLevel: 'medium',
      requireConfirmation: false,
      execute: (args) => {
        const pid = readId(args, ['parentDepartmentId'])
        h.openCreate(pid ?? undefined)
        return ok('department.openCreateDialog', '已打开新增部门窗口')
      }
    },
    {
      name: 'department.openEditDialog',
      description: '打开指定 ID 部门的编辑窗口',
      parameters: {
        type: 'object',
        properties: { departmentId: { type: 'string', description: '部门 ID' } },
        required: ['departmentId']
      },
      permission: 'sys:department:update',
      riskLevel: 'medium',
      requireConfirmation: false,
      execute: (args) => {
        const id = readId(args, ['departmentId'])
        if (id === null) return fail('department.openEditDialog', '缺少有效的部门 ID')
        return h.openEdit(id)
          ? ok('department.openEditDialog', `已打开部门 ${id} 的编辑窗口`)
          : fail('department.openEditDialog', `未找到部门 ${id}`)
      }
    },
    {
      name: 'department.fillForm',
      description: '填写当前部门表单字段（仅填写，不提交）',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '部门名称' },
          leader: { type: 'string', description: '负责人' },
          type: { type: 'string', description: '部门类型（省公司/分公司/部门）' },
          phone: { type: 'string', description: '联系电话' },
          orderNum: { type: 'number', description: '排序' }
        }
      },
      riskLevel: 'medium',
      requireConfirmation: false,
      execute: (args) => {
        h.fillForm(args)
        return ok('department.fillForm', '已填写表单，请检查后确认提交')
      }
    },
    {
      name: 'department.submitForm',
      description: '提交当前部门表单（新增或编辑）',
      parameters: { type: 'object', properties: {} },
      riskLevel: 'high',
      requireConfirmation: true,
      execute: async () => {
        await h.submitForm()
        return ok('department.submitForm', '已提交部门表单')
      }
    },
    {
      name: 'department.delete',
      description: '删除指定 ID 的部门',
      parameters: {
        type: 'object',
        properties: {
          departmentId: { type: 'string', description: '部门 ID' },
          departmentName: { type: 'string', description: '部门名称（用于确认展示）' }
        },
        required: ['departmentId']
      },
      permission: 'sys:department:delete',
      riskLevel: 'high',
      requireConfirmation: true,
      execute: async (args) => {
        const id = readId(args, ['departmentId'])
        if (id === null) return fail('department.delete', '缺少有效的部门 ID')
        const name = await h.deleteById(id)
        return name !== null
          ? ok('department.delete', `已删除部门"${name}"`)
          : fail('department.delete', `未找到部门 ${id}`)
      }
    },
    {
      name: 'department.create',
      description: '直接新增部门（一步完成，可指定父部门以建立下级部门），无需先开窗再填表',
      parameters: {
        type: 'object',
        properties: {
          ...DEPT_FIELD_PROPS,
          parentDepartmentId: { type: 'string', description: '父部门 ID（建下级部门时传，可选）' }
        },
        required: ['name']
      },
      permission: 'sys:department:add',
      riskLevel: 'high',
      requireConfirmation: true,
      execute: async (args) => {
        const name = typeof args.name === 'string' ? args.name.trim() : ''
        if (!name) return fail('department.create', '缺少部门名称')
        const parentId = readId(args, ['parentDepartmentId'])
        const created = await h.createDirect({ ...args, name, parentId: parentId ?? null })
        return ok('department.create', `已新增部门"${created}"`)
      }
    },
    {
      name: 'department.update',
      description: '直接更新指定 ID 部门的字段（一步完成，仅提交传入的字段），无需先开窗再填表',
      parameters: {
        type: 'object',
        properties: {
          departmentId: { type: 'string', description: '要更新的部门 ID' },
          ...DEPT_FIELD_PROPS
        },
        required: ['departmentId']
      },
      permission: 'sys:department:update',
      riskLevel: 'high',
      requireConfirmation: true,
      execute: async (args) => {
        const id = readId(args, ['departmentId'])
        if (id === null) return fail('department.update', '缺少有效的部门 ID')
        const name = await h.updateDirect(id, args)
        return name !== null
          ? ok('department.update', `已更新部门"${name}"`)
          : fail('department.update', `未找到部门 ${id}`)
      }
    }
  ]
  return actions
}
