/**
 * 用户管理页 · 智能体操作定义
 *
 * 把页面「现有方法」封装为可被智能体调用的 FrontendAction，仅做参数适配与结果包装。
 * 覆盖查询/筛选（关键词/状态/按部门）+ 开窗填表提交 + 原子增删改 + 状态启停 + 批量删除。
 * 不纳入：导入/导出、批量设岗位/角色（页面为占位未实现）。
 * 安全边界：不操作 DOM；high 风险操作声明 requireConfirmation。
 */
import type { FrontendAction, ActionResult } from '@/agent/frontend-action-registry'
import type { PageContext } from '@/agent/page-context'

/** 页面向操作层暴露的方法与状态句柄 */
export interface UserPageHandles {
  /** 设置筛选：关键词 + 状态 */
  setFilters: (filters: { keyword?: string; status?: number }) => void
  /** 按部门 ID 过滤（undefined/0 表示全部） */
  filterByDept: (departmentId?: number) => void
  /** 执行查询（回第一页） */
  search: () => void
  /** 重置筛选 */
  reset: () => void
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
  /** 原子新增用户；返回用户名 */
  createDirect: (fields: Record<string, unknown>) => Promise<string>
  /** 原子更新用户（按 ID）；返回用户名（未找到返回 null） */
  updateDirect: (id: number, fields: Record<string, unknown>) => Promise<string | null>
  /** 按 ID 删除用户；返回用户名（未找到返回 null） */
  deleteById: (id: number) => Promise<string | null>
  /** 批量删除用户；返回删除数量 */
  batchDelete: (ids: number[]) => Promise<number>
  /** 设置用户启用状态；返回用户名（未找到返回 null） */
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

/** 从参数中读取数字 ID 数组（number[] 或数字字符串数组） */
const readIdArray = (args: Record<string, unknown>, key: string): number[] => {
  const v = args[key]
  if (!Array.isArray(v)) return []
  return v
    .map((x) => (typeof x === 'number' ? x : typeof x === 'string' && x.trim() ? Number(x) : NaN))
    .filter((n) => Number.isFinite(n))
}

/** 用户表单字段的公共参数 schema（新增/编辑用；username/password 仅新增用，单列） */
const USER_FIELD_PROPS: Record<string, unknown> = {
  name: { type: 'string', description: '姓名' },
  phone: { type: 'string', description: '手机号' },
  email: { type: 'string', description: '邮箱' },
  departmentId: { type: 'number', description: '所属部门 ID' },
  positionId: { type: 'number', description: '岗位 ID' },
  roleIds: { type: 'array', items: { type: 'number' }, description: '角色 ID 列表' }
}

/**
 * 构建用户页的全部智能体操作。
 * @param h 页面方法/状态句柄
 */
export function buildUserActions(h: UserPageHandles): FrontendAction[] {
  return [
    {
      name: 'ui.setFilters',
      description: '设置用户列表的筛选条件（关键词/状态，仅修改条件不自动查询）',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: '姓名/账号/手机号关键词' },
          status: { type: 'number', enum: [0, 1], description: '状态：1=启用 0=禁用' }
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
      name: 'ui.filterByDepartment',
      description: '按部门 ID 过滤用户列表（不传或传 0 表示全部部门）',
      parameters: {
        type: 'object',
        properties: { departmentId: { type: 'string', description: '部门 ID' } }
      },
      permission: 'sys:user:list',
      riskLevel: 'low',
      requireConfirmation: false,
      execute: (args) => {
        const id = readId(args, ['departmentId'])
        h.filterByDept(id ?? undefined)
        return ok('ui.filterByDepartment', id ? `已按部门 ${id} 过滤` : '已显示全部部门')
      }
    },
    {
      name: 'ui.search',
      description: '按当前筛选条件查询用户列表',
      parameters: { type: 'object', properties: {} },
      permission: 'sys:user:list',
      riskLevel: 'low',
      requireConfirmation: false,
      execute: () => {
        h.search()
        return ok('ui.search', '已执行查询')
      }
    },
    {
      name: 'ui.resetFilters',
      description: '重置用户列表的筛选条件并刷新',
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
      description: '刷新当前用户列表',
      parameters: { type: 'object', properties: {} },
      riskLevel: 'low',
      requireConfirmation: false,
      execute: () => {
        h.refresh()
        return ok('ui.refresh', '已刷新列表')
      }
    },
    {
      name: 'user.openCreateDialog',
      description: '打开新增用户窗口',
      parameters: { type: 'object', properties: {} },
      permission: 'sys:user:add',
      riskLevel: 'medium',
      requireConfirmation: false,
      execute: () => {
        h.openCreate()
        return ok('user.openCreateDialog', '已打开新增用户窗口')
      }
    },
    {
      name: 'user.openEditDialog',
      description: '打开指定 ID 用户的编辑窗口',
      parameters: {
        type: 'object',
        properties: { userId: { type: 'string', description: '用户 ID' } },
        required: ['userId']
      },
      permission: 'sys:user:update',
      riskLevel: 'medium',
      requireConfirmation: false,
      execute: (args) => {
        const id = readId(args, ['userId'])
        if (id === null) return fail('user.openEditDialog', '缺少有效的用户 ID')
        return h.openEdit(id)
          ? ok('user.openEditDialog', `已打开用户 ${id} 的编辑窗口`)
          : fail('user.openEditDialog', `未找到用户 ${id}`)
      }
    },
    {
      name: 'user.fillForm',
      description: '填写当前用户表单字段（仅填写，不提交）',
      parameters: {
        type: 'object',
        properties: {
          username: { type: 'string', description: '账号（仅新增可填）' },
          password: { type: 'string', description: '密码（仅新增可填）' },
          ...USER_FIELD_PROPS
        }
      },
      riskLevel: 'medium',
      requireConfirmation: false,
      execute: (args) => {
        h.fillForm(args)
        return ok('user.fillForm', '已填写表单，请检查后确认提交')
      }
    },
    {
      name: 'user.submitForm',
      description: '提交当前用户表单（新增或编辑）',
      parameters: { type: 'object', properties: {} },
      riskLevel: 'high',
      requireConfirmation: true,
      execute: async () => {
        await h.submitForm()
        return ok('user.submitForm', '已提交用户表单')
      }
    },
    {
      name: 'user.create',
      description: '直接新增用户（一步完成，需账号和密码），无需先开窗再填表',
      parameters: {
        type: 'object',
        properties: {
          username: { type: 'string', description: '账号（登录名）' },
          password: { type: 'string', description: '初始密码' },
          ...USER_FIELD_PROPS
        },
        required: ['username', 'password', 'name']
      },
      permission: 'sys:user:add',
      riskLevel: 'high',
      requireConfirmation: true,
      execute: async (args) => {
        const username = typeof args.username === 'string' ? args.username.trim() : ''
        const password = typeof args.password === 'string' ? args.password : ''
        if (!username) return fail('user.create', '缺少账号')
        if (!password) return fail('user.create', '缺少密码')
        const created = await h.createDirect(args)
        return ok('user.create', `已新增用户"${created}"`)
      }
    },
    {
      name: 'user.update',
      description: '直接更新指定 ID 用户的字段（一步完成，仅提交传入字段；账号不可改）',
      parameters: {
        type: 'object',
        properties: { userId: { type: 'string', description: '用户 ID' }, ...USER_FIELD_PROPS },
        required: ['userId']
      },
      permission: 'sys:user:update',
      riskLevel: 'high',
      requireConfirmation: true,
      execute: async (args) => {
        const id = readId(args, ['userId'])
        if (id === null) return fail('user.update', '缺少有效的用户 ID')
        const name = await h.updateDirect(id, args)
        return name !== null
          ? ok('user.update', `已更新用户"${name}"`)
          : fail('user.update', `未找到用户 ${id}`)
      }
    },
    {
      name: 'user.setStatus',
      description: '启用或禁用指定 ID 的用户',
      parameters: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: '用户 ID' },
          status: { type: 'number', enum: [0, 1], description: '目标状态：1=启用 0=禁用' }
        },
        required: ['userId', 'status']
      },
      permission: 'sys:user:update',
      riskLevel: 'high',
      requireConfirmation: true,
      execute: async (args) => {
        const id = readId(args, ['userId'])
        if (id === null) return fail('user.setStatus', '缺少有效的用户 ID')
        const status = args.status === 1 || args.status === 0 ? args.status : null
        if (status === null) return fail('user.setStatus', 'status 只能是 0 或 1')
        const name = await h.setStatus(id, status)
        return name !== null
          ? ok('user.setStatus', `已${status === 1 ? '启用' : '禁用'}用户"${name}"`)
          : fail('user.setStatus', `未找到用户 ${id}`)
      }
    },
    {
      name: 'user.delete',
      description: '删除指定 ID 的用户',
      parameters: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: '用户 ID' },
          userName: { type: 'string', description: '用户名（用于确认展示）' }
        },
        required: ['userId']
      },
      permission: 'sys:user:delete',
      riskLevel: 'high',
      requireConfirmation: true,
      execute: async (args) => {
        const id = readId(args, ['userId'])
        if (id === null) return fail('user.delete', '缺少有效的用户 ID')
        const name = await h.deleteById(id)
        return name !== null
          ? ok('user.delete', `已删除用户"${name}"`)
          : fail('user.delete', `未找到用户 ${id}`)
      }
    },
    {
      name: 'user.batchDelete',
      description: '批量删除多个指定 ID 的用户',
      parameters: {
        type: 'object',
        properties: {
          userIds: { type: 'array', items: { type: 'number' }, description: '用户 ID 列表' }
        },
        required: ['userIds']
      },
      permission: 'sys:user:batch-delete',
      riskLevel: 'high',
      requireConfirmation: true,
      execute: async (args) => {
        const ids = readIdArray(args, 'userIds')
        if (!ids.length) return fail('user.batchDelete', '缺少有效的用户 ID 列表')
        const count = await h.batchDelete(ids)
        return ok('user.batchDelete', `已批量删除 ${count} 个用户`)
      }
    }
  ]
}
