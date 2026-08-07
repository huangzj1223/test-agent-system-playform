/**
 * 角色管理页 · 智能体操作定义
 *
 * 把页面「现有方法」封装为可被智能体调用的 FrontendAction，仅做参数适配与结果包装。
 * 覆盖查询/筛选 + 开窗填表提交 + 原子增删改 + 状态启停；不含「分配权限树」（交互复杂，暂不纳入）。
 * 安全边界：不操作 DOM；high 风险操作声明 requireConfirmation。
 */
import type { FrontendAction, ActionResult } from '@/agent/frontend-action-registry'
import type { PageContext } from '@/agent/page-context'

/** 页面向操作层暴露的方法与状态句柄 */
export interface RolePageHandles {
  /** 设置筛选：关键词 + 状态 */
  setFilters: (filters: { keyword?: string; status?: number }) => void
  /** 读取当前筛选 */
  getFilters: () => { keyword: string; status?: number }
  /** 执行查询（回到第一页） */
  search: () => void
  /** 刷新列表 */
  refresh: () => void
  /** 打开新增窗口 */
  openCreate: () => void
  /** 按 ID 打开编辑窗口；返回是否找到 */
  openEdit: (id: number) => boolean
  /** 填写当前表单字段（只填不提交） */
  fillForm: (fields: Record<string, unknown>) => void
  /** 提交当前表单 */
  submitForm: () => Promise<void> | void
  /** 原子新增角色；返回角色名 */
  createDirect: (fields: Record<string, unknown>) => Promise<string>
  /** 原子更新角色（按 ID）；返回角色名（未找到返回 null） */
  updateDirect: (id: number, fields: Record<string, unknown>) => Promise<string | null>
  /** 按 ID 删除角色；返回角色名（未找到返回 null） */
  deleteById: (id: number) => Promise<string | null>
  /** 设置角色启用状态；返回角色名（未找到返回 null） */
  setStatus: (id: number, status: number) => Promise<string | null>
  /** 生成页面上下文快照 */
  snapshot: () => PageContext
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

/** 从参数中稳健读取 ID */
const readId = (args: Record<string, unknown>, keys: string[]): number | null => {
  for (const k of keys) {
    const v = args[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v)
  }
  return null
}

/** 角色表单字段的公共参数 schema */
const ROLE_FIELD_PROPS: Record<string, unknown> = {
  name: { type: 'string', description: '角色名称' },
  label: { type: 'string', description: '角色标识（英文）' },
  remark: { type: 'string', description: '备注' },
  status: { type: 'number', enum: [0, 1], description: '状态：1=启用 0=禁用' }
}

/**
 * 构建角色页的全部智能体操作。
 * @param h 页面方法/状态句柄
 */
export function buildRoleActions(h: RolePageHandles): FrontendAction[] {
  return [
    {
      name: 'ui.setFilters',
      description: '设置角色列表的筛选条件（关键词/状态，仅修改条件不自动查询）',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: '角色名称筛选关键词' },
          status: { type: 'number', enum: [0, 1], description: '状态筛选：1=启用 0=禁用' }
        }
      },
      riskLevel: 'low',
      requireConfirmation: false,
      execute: (args) => {
        const keyword = typeof args.keyword === 'string' ? args.keyword : undefined
        const status = typeof args.status === 'number' ? args.status : undefined
        h.setFilters({ keyword, status })
        return ok('ui.setFilters', '已设置筛选条件')
      }
    },
    {
      name: 'ui.search',
      description: '按当前筛选条件查询角色列表',
      parameters: { type: 'object', properties: {} },
      permission: 'sys:role:list',
      riskLevel: 'low',
      requireConfirmation: false,
      execute: () => {
        h.search()
        return ok('ui.search', '已执行查询')
      }
    },
    {
      name: 'ui.refresh',
      description: '刷新当前角色列表',
      parameters: { type: 'object', properties: {} },
      riskLevel: 'low',
      requireConfirmation: false,
      execute: () => {
        h.refresh()
        return ok('ui.refresh', '已刷新列表')
      }
    },
    {
      name: 'role.openCreateDialog',
      description: '打开新增角色窗口',
      parameters: { type: 'object', properties: {} },
      permission: 'sys:role:add',
      riskLevel: 'medium',
      requireConfirmation: false,
      execute: () => {
        h.openCreate()
        return ok('role.openCreateDialog', '已打开新增角色窗口')
      }
    },
    {
      name: 'role.openEditDialog',
      description: '打开指定 ID 角色的编辑窗口',
      parameters: {
        type: 'object',
        properties: { roleId: { type: 'string', description: '角色 ID' } },
        required: ['roleId']
      },
      permission: 'sys:role:update',
      riskLevel: 'medium',
      requireConfirmation: false,
      execute: (args) => {
        const id = readId(args, ['roleId'])
        if (id === null) return fail('role.openEditDialog', '缺少有效的角色 ID')
        return h.openEdit(id)
          ? ok('role.openEditDialog', `已打开角色 ${id} 的编辑窗口`)
          : fail('role.openEditDialog', `未找到角色 ${id}`)
      }
    },
    {
      name: 'role.fillForm',
      description: '填写当前角色表单字段（仅填写，不提交）',
      parameters: { type: 'object', properties: { ...ROLE_FIELD_PROPS } },
      riskLevel: 'medium',
      requireConfirmation: false,
      execute: (args) => {
        h.fillForm(args)
        return ok('role.fillForm', '已填写表单，请检查后确认提交')
      }
    },
    {
      name: 'role.submitForm',
      description: '提交当前角色表单（新增或编辑）',
      parameters: { type: 'object', properties: {} },
      riskLevel: 'high',
      requireConfirmation: true,
      execute: async () => {
        await h.submitForm()
        return ok('role.submitForm', '已提交角色表单')
      }
    },
    {
      name: 'role.create',
      description: '直接新增角色（一步完成，无需先开窗再填表）',
      parameters: { type: 'object', properties: { ...ROLE_FIELD_PROPS }, required: ['name'] },
      permission: 'sys:role:add',
      riskLevel: 'high',
      requireConfirmation: true,
      execute: async (args) => {
        const name = typeof args.name === 'string' ? args.name.trim() : ''
        if (!name) return fail('role.create', '缺少角色名称')
        const created = await h.createDirect({ ...args, name })
        return ok('role.create', `已新增角色"${created}"`)
      }
    },
    {
      name: 'role.update',
      description: '直接更新指定 ID 角色的字段（一步完成，仅提交传入字段）',
      parameters: {
        type: 'object',
        properties: { roleId: { type: 'string', description: '角色 ID' }, ...ROLE_FIELD_PROPS },
        required: ['roleId']
      },
      permission: 'sys:role:update',
      riskLevel: 'high',
      requireConfirmation: true,
      execute: async (args) => {
        const id = readId(args, ['roleId'])
        if (id === null) return fail('role.update', '缺少有效的角色 ID')
        const name = await h.updateDirect(id, args)
        return name !== null
          ? ok('role.update', `已更新角色"${name}"`)
          : fail('role.update', `未找到角色 ${id}`)
      }
    },
    {
      name: 'role.setStatus',
      description: '启用或禁用指定 ID 的角色',
      parameters: {
        type: 'object',
        properties: {
          roleId: { type: 'string', description: '角色 ID' },
          status: { type: 'number', enum: [0, 1], description: '目标状态：1=启用 0=禁用' }
        },
        required: ['roleId', 'status']
      },
      permission: 'sys:role:update-status',
      riskLevel: 'high',
      requireConfirmation: true,
      execute: async (args) => {
        const id = readId(args, ['roleId'])
        if (id === null) return fail('role.setStatus', '缺少有效的角色 ID')
        const status = args.status === 1 || args.status === 0 ? args.status : null
        if (status === null) return fail('role.setStatus', 'status 只能是 0 或 1')
        const name = await h.setStatus(id, status)
        return name !== null
          ? ok('role.setStatus', `已${status === 1 ? '启用' : '禁用'}角色"${name}"`)
          : fail('role.setStatus', `未找到角色 ${id}`)
      }
    },
    {
      name: 'role.delete',
      description: '删除指定 ID 的角色',
      parameters: {
        type: 'object',
        properties: {
          roleId: { type: 'string', description: '角色 ID' },
          roleName: { type: 'string', description: '角色名称（用于确认展示）' }
        },
        required: ['roleId']
      },
      permission: 'sys:role:delete',
      riskLevel: 'high',
      requireConfirmation: true,
      execute: async (args) => {
        const id = readId(args, ['roleId'])
        if (id === null) return fail('role.delete', '缺少有效的角色 ID')
        const name = await h.deleteById(id)
        return name !== null
          ? ok('role.delete', `已删除角色"${name}"`)
          : fail('role.delete', `未找到角色 ${id}`)
      }
    }
  ]
}
