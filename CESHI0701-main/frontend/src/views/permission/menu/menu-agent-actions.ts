/**
 * 菜单管理页 · 智能体操作定义
 *
 * 把页面「现有方法」封装为可被智能体调用的 FrontendAction，仅做参数适配与结果包装。
 * 覆盖查询/筛选 + 开窗填表提交（支持建子级） + 原子增删改 + 显示状态切换。
 * 菜单为树形；字段随 type（0目录/1菜单/2按钮）语义不同，由后端与页面表单约束，本层只做白名单透传。
 * 安全边界：不操作 DOM；high 风险操作声明 requireConfirmation。
 */
import type { FrontendAction, ActionResult } from '@/agent/frontend-action-registry'
import type { PageContext } from '@/agent/page-context'

/** 页面向操作层暴露的方法与状态句柄 */
export interface MenuPageHandles {
  /** 设置筛选：关键词 + 类型 */
  setFilters: (filters: { keyword?: string; type?: number }) => void
  /** 读取当前筛选 */
  getFilters: () => { keyword: string; type?: number }
  /** 执行查询 */
  search: () => void
  /** 刷新列表 */
  refresh: () => void
  /** 展开/收起全部（页面按钮语义）；返回当前是否展开 */
  toggleExpand: () => boolean
  /** 打开新增窗口，可选父菜单 ID */
  openCreate: (parentId?: number) => void
  /** 按 ID 打开编辑窗口；返回是否找到 */
  openEdit: (id: number) => boolean
  /** 填写当前表单字段（只填不提交） */
  fillForm: (fields: Record<string, unknown>) => void
  /** 提交当前表单 */
  submitForm: () => Promise<void> | void
  /** 原子新增菜单；返回菜单名 */
  createDirect: (fields: Record<string, unknown>) => Promise<string>
  /** 原子更新菜单（按 ID）；返回菜单名（未找到返回 null） */
  updateDirect: (id: number, fields: Record<string, unknown>) => Promise<string | null>
  /** 按 ID 删除菜单；返回菜单名（未找到返回 null） */
  deleteById: (id: number) => Promise<string | null>
  /** 设置菜单显示状态；返回菜单名（未找到返回 null） */
  setShow: (id: number, isShow: number) => Promise<string | null>
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

/** 菜单表单字段的公共参数 schema */
const MENU_FIELD_PROPS: Record<string, unknown> = {
  name: { type: 'string', description: '菜单名称' },
  type: { type: 'number', enum: [0, 1, 2], description: '类型：0=目录 1=菜单 2=按钮' },
  router: { type: 'string', description: '路由路径（目录/菜单用）' },
  viewPath: { type: 'string', description: '组件路径（菜单用）' },
  icon: { type: 'string', description: '菜单图标名（目录/菜单用）' },
  perms: { type: 'string', description: '权限标识，如 sys:menu:list' },
  orderNum: { type: 'number', description: '排序值（升序）' },
  isShow: { type: 'number', enum: [0, 1], description: '是否显示：1=显示 0=隐藏' },
  keepAlive: { type: 'number', enum: [0, 1], description: '是否缓存：1=是 0=否（菜单用）' }
}

/**
 * 构建菜单页的全部智能体操作。
 * @param h 页面方法/状态句柄
 */
export function buildMenuActions(h: MenuPageHandles): FrontendAction[] {
  return [
    {
      name: 'ui.setFilters',
      description: '设置菜单列表的筛选条件（关键词/类型，仅修改条件不自动查询）',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: '菜单名称筛选关键词' },
          type: { type: 'number', enum: [0, 1, 2], description: '类型筛选：0=目录 1=菜单 2=按钮' }
        }
      },
      riskLevel: 'low',
      requireConfirmation: false,
      execute: (args) => {
        const keyword = typeof args.keyword === 'string' ? args.keyword : undefined
        const type = typeof args.type === 'number' ? args.type : undefined
        h.setFilters({ keyword, type })
        return ok('ui.setFilters', '已设置筛选条件')
      }
    },
    {
      name: 'ui.search',
      description: '按当前筛选条件查询菜单列表',
      parameters: { type: 'object', properties: {} },
      permission: 'sys:menu:list',
      riskLevel: 'low',
      requireConfirmation: false,
      execute: () => {
        h.search()
        return ok('ui.search', '已执行查询')
      }
    },
    {
      name: 'ui.refresh',
      description: '刷新当前菜单列表',
      parameters: { type: 'object', properties: {} },
      riskLevel: 'low',
      requireConfirmation: false,
      execute: () => {
        h.refresh()
        return ok('ui.refresh', '已刷新列表')
      }
    },
    {
      name: 'menu.toggleExpand',
      description: '展开或收起全部菜单树节点',
      parameters: { type: 'object', properties: {} },
      riskLevel: 'low',
      requireConfirmation: false,
      execute: () => {
        const expanded = h.toggleExpand()
        return ok('menu.toggleExpand', expanded ? '已展开全部' : '已收起全部')
      }
    },
    {
      name: 'menu.openCreateDialog',
      description: '打开新增菜单窗口，可选指定父菜单',
      parameters: {
        type: 'object',
        properties: { parentMenuId: { type: 'string', description: '父菜单 ID（建子级时传，可选）' } }
      },
      permission: 'sys:menu:add',
      riskLevel: 'medium',
      requireConfirmation: false,
      execute: (args) => {
        const pid = readId(args, ['parentMenuId'])
        h.openCreate(pid ?? undefined)
        return ok('menu.openCreateDialog', '已打开新增菜单窗口')
      }
    },
    {
      name: 'menu.openEditDialog',
      description: '打开指定 ID 菜单的编辑窗口',
      parameters: {
        type: 'object',
        properties: { menuId: { type: 'string', description: '菜单 ID' } },
        required: ['menuId']
      },
      permission: 'sys:menu:update',
      riskLevel: 'medium',
      requireConfirmation: false,
      execute: (args) => {
        const id = readId(args, ['menuId'])
        if (id === null) return fail('menu.openEditDialog', '缺少有效的菜单 ID')
        return h.openEdit(id)
          ? ok('menu.openEditDialog', `已打开菜单 ${id} 的编辑窗口`)
          : fail('menu.openEditDialog', `未找到菜单 ${id}`)
      }
    },
    {
      name: 'menu.fillForm',
      description: '填写当前菜单表单字段（仅填写，不提交）',
      parameters: { type: 'object', properties: { ...MENU_FIELD_PROPS } },
      riskLevel: 'medium',
      requireConfirmation: false,
      execute: (args) => {
        h.fillForm(args)
        return ok('menu.fillForm', '已填写表单，请检查后确认提交')
      }
    },
    {
      name: 'menu.submitForm',
      description: '提交当前菜单表单（新增或编辑）',
      parameters: { type: 'object', properties: {} },
      riskLevel: 'high',
      requireConfirmation: true,
      execute: async () => {
        await h.submitForm()
        return ok('menu.submitForm', '已提交菜单表单')
      }
    },
    {
      name: 'menu.create',
      description: '直接新增菜单（一步完成，可指定 parentMenuId 建子级），无需先开窗再填表',
      parameters: {
        type: 'object',
        properties: {
          ...MENU_FIELD_PROPS,
          parentMenuId: { type: 'string', description: '父菜单 ID（建子级时传，可选）' }
        },
        required: ['name', 'type']
      },
      permission: 'sys:menu:add',
      riskLevel: 'high',
      requireConfirmation: true,
      execute: async (args) => {
        const name = typeof args.name === 'string' ? args.name.trim() : ''
        if (!name) return fail('menu.create', '缺少菜单名称')
        if (typeof args.type !== 'number') return fail('menu.create', '缺少菜单类型 type(0/1/2)')
        const parentId = readId(args, ['parentMenuId'])
        const created = await h.createDirect({ ...args, name, parentId: parentId ?? undefined })
        return ok('menu.create', `已新增菜单"${created}"`)
      }
    },
    {
      name: 'menu.update',
      description: '直接更新指定 ID 菜单的字段（一步完成，仅提交传入字段）',
      parameters: {
        type: 'object',
        properties: { menuId: { type: 'string', description: '菜单 ID' }, ...MENU_FIELD_PROPS },
        required: ['menuId']
      },
      permission: 'sys:menu:update',
      riskLevel: 'high',
      requireConfirmation: true,
      execute: async (args) => {
        const id = readId(args, ['menuId'])
        if (id === null) return fail('menu.update', '缺少有效的菜单 ID')
        const name = await h.updateDirect(id, args)
        return name !== null
          ? ok('menu.update', `已更新菜单"${name}"`)
          : fail('menu.update', `未找到菜单 ${id}`)
      }
    },
    {
      name: 'menu.setShow',
      description: '设置指定 ID 菜单的显示/隐藏',
      parameters: {
        type: 'object',
        properties: {
          menuId: { type: 'string', description: '菜单 ID' },
          isShow: { type: 'number', enum: [0, 1], description: '1=显示 0=隐藏' }
        },
        required: ['menuId', 'isShow']
      },
      permission: 'sys:menu:update-status',
      riskLevel: 'high',
      requireConfirmation: true,
      execute: async (args) => {
        const id = readId(args, ['menuId'])
        if (id === null) return fail('menu.setShow', '缺少有效的菜单 ID')
        const isShow = args.isShow === 1 || args.isShow === 0 ? args.isShow : null
        if (isShow === null) return fail('menu.setShow', 'isShow 只能是 0 或 1')
        const name = await h.setShow(id, isShow)
        return name !== null
          ? ok('menu.setShow', `已${isShow === 1 ? '显示' : '隐藏'}菜单"${name}"`)
          : fail('menu.setShow', `未找到菜单 ${id}`)
      }
    },
    {
      name: 'menu.delete',
      description: '删除指定 ID 的菜单',
      parameters: {
        type: 'object',
        properties: {
          menuId: { type: 'string', description: '菜单 ID' },
          menuName: { type: 'string', description: '菜单名称（用于确认展示）' }
        },
        required: ['menuId']
      },
      permission: 'sys:menu:delete',
      riskLevel: 'high',
      requireConfirmation: true,
      execute: async (args) => {
        const id = readId(args, ['menuId'])
        if (id === null) return fail('menu.delete', '缺少有效的菜单 ID')
        const name = await h.deleteById(id)
        return name !== null
          ? ok('menu.delete', `已删除菜单"${name}"`)
          : fail('menu.delete', `未找到菜单 ${id}`)
      }
    }
  ]
}
