/**
 * 岗位管理页 · 智能体操作定义
 *
 * 把页面「现有方法」封装为可被智能体调用的 FrontendAction，仅做参数适配与结果包装，
 * 不复制业务逻辑。与部门页同构：查询/筛选 + 开窗填表提交 + 原子增删改。
 * 安全边界：不操作 DOM、不模拟点击；high 风险操作声明 requireConfirmation。
 */
import type { FrontendAction, ActionResult } from '@/agent/frontend-action-registry'
import type { PageContext } from '@/agent/page-context'

/** 页面向操作层暴露的方法与状态句柄（由 index.vue 提供） */
export interface PositionPageHandles {
  /** 设置筛选关键词 */
  setFilterKeyword: (kw: string) => void
  /** 读取当前筛选关键词 */
  getFilterKeyword: () => string
  /** 执行查询 */
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
  /** 原子新增岗位（一次带齐字段直接调 api）；返回岗位名 */
  createDirect: (fields: Record<string, unknown>) => Promise<string>
  /** 原子更新岗位（按 ID）；返回岗位名（未找到返回 null） */
  updateDirect: (id: number, fields: Record<string, unknown>) => Promise<string | null>
  /** 按 ID 删除岗位；返回岗位名（未找到返回 null） */
  deleteById: (id: number) => Promise<string | null>
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

/** 从参数中稳健读取 ID（number 或数字字符串） */
const readId = (args: Record<string, unknown>, keys: string[]): number | null => {
  for (const k of keys) {
    const v = args[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v)
  }
  return null
}

/** 岗位表单字段的公共参数 schema（create/fillForm/update 共用） */
const POSITION_FIELD_PROPS: Record<string, unknown> = {
  name: { type: 'string', description: '岗位名称' },
  description: { type: 'string', description: '岗位描述' },
  orderNum: { type: 'number', description: '排序值（升序）' }
}

/**
 * 构建岗位页的全部智能体操作。
 * @param h 页面方法/状态句柄
 * @returns FrontendAction 数组
 */
export function buildPositionActions(h: PositionPageHandles): FrontendAction[] {
  return [
    {
      name: 'ui.setFilters',
      description: '设置岗位列表的筛选条件（仅修改条件，不自动查询）',
      parameters: {
        type: 'object',
        properties: { keyword: { type: 'string', description: '岗位名称筛选关键词' } }
      },
      riskLevel: 'low',
      requireConfirmation: false,
      execute: (args) => {
        const kw = typeof args.keyword === 'string' ? args.keyword : ''
        h.setFilterKeyword(kw)
        return ok('ui.setFilters', `已设置筛选：岗位名称包含"${kw || '（空）'}"`)
      }
    },
    {
      name: 'ui.search',
      description: '按当前筛选条件查询岗位列表',
      parameters: { type: 'object', properties: {} },
      permission: 'sys:position:list',
      riskLevel: 'low',
      requireConfirmation: false,
      execute: () => {
        h.search()
        return ok('ui.search', '已执行查询')
      }
    },
    {
      name: 'ui.refresh',
      description: '刷新当前岗位列表',
      parameters: { type: 'object', properties: {} },
      riskLevel: 'low',
      requireConfirmation: false,
      execute: () => {
        h.refresh()
        return ok('ui.refresh', '已刷新列表')
      }
    },
    {
      name: 'position.openCreateDialog',
      description: '打开新增岗位窗口',
      parameters: { type: 'object', properties: {} },
      permission: 'sys:position:add',
      riskLevel: 'medium',
      requireConfirmation: false,
      execute: () => {
        h.openCreate()
        return ok('position.openCreateDialog', '已打开新增岗位窗口')
      }
    },
    {
      name: 'position.openEditDialog',
      description: '打开指定 ID 岗位的编辑窗口',
      parameters: {
        type: 'object',
        properties: { positionId: { type: 'string', description: '岗位 ID' } },
        required: ['positionId']
      },
      permission: 'sys:position:update',
      riskLevel: 'medium',
      requireConfirmation: false,
      execute: (args) => {
        const id = readId(args, ['positionId'])
        if (id === null) return fail('position.openEditDialog', '缺少有效的岗位 ID')
        return h.openEdit(id)
          ? ok('position.openEditDialog', `已打开岗位 ${id} 的编辑窗口`)
          : fail('position.openEditDialog', `未找到岗位 ${id}`)
      }
    },
    {
      name: 'position.fillForm',
      description: '填写当前岗位表单字段（仅填写，不提交）',
      parameters: { type: 'object', properties: { ...POSITION_FIELD_PROPS } },
      riskLevel: 'medium',
      requireConfirmation: false,
      execute: (args) => {
        h.fillForm(args)
        return ok('position.fillForm', '已填写表单，请检查后确认提交')
      }
    },
    {
      name: 'position.submitForm',
      description: '提交当前岗位表单（新增或编辑）',
      parameters: { type: 'object', properties: {} },
      riskLevel: 'high',
      requireConfirmation: true,
      execute: async () => {
        await h.submitForm()
        return ok('position.submitForm', '已提交岗位表单')
      }
    },
    {
      name: 'position.create',
      description: '直接新增岗位（一步完成，无需先开窗再填表）',
      parameters: {
        type: 'object',
        properties: { ...POSITION_FIELD_PROPS },
        required: ['name']
      },
      permission: 'sys:position:add',
      riskLevel: 'high',
      requireConfirmation: true,
      execute: async (args) => {
        const name = typeof args.name === 'string' ? args.name.trim() : ''
        if (!name) return fail('position.create', '缺少岗位名称')
        const created = await h.createDirect({ ...args, name })
        return ok('position.create', `已新增岗位"${created}"`)
      }
    },
    {
      name: 'position.update',
      description: '直接更新指定 ID 岗位的字段（一步完成，仅提交传入字段）',
      parameters: {
        type: 'object',
        properties: { positionId: { type: 'string', description: '岗位 ID' }, ...POSITION_FIELD_PROPS },
        required: ['positionId']
      },
      permission: 'sys:position:update',
      riskLevel: 'high',
      requireConfirmation: true,
      execute: async (args) => {
        const id = readId(args, ['positionId'])
        if (id === null) return fail('position.update', '缺少有效的岗位 ID')
        const name = await h.updateDirect(id, args)
        return name !== null
          ? ok('position.update', `已更新岗位"${name}"`)
          : fail('position.update', `未找到岗位 ${id}`)
      }
    },
    {
      name: 'position.delete',
      description: '删除指定 ID 的岗位',
      parameters: {
        type: 'object',
        properties: {
          positionId: { type: 'string', description: '岗位 ID' },
          positionName: { type: 'string', description: '岗位名称（用于确认展示）' }
        },
        required: ['positionId']
      },
      permission: 'sys:position:delete',
      riskLevel: 'high',
      requireConfirmation: true,
      execute: async (args) => {
        const id = readId(args, ['positionId'])
        if (id === null) return fail('position.delete', '缺少有效的岗位 ID')
        const name = await h.deleteById(id)
        return name !== null
          ? ok('position.delete', `已删除岗位"${name}"`)
          : fail('position.delete', `未找到岗位 ${id}`)
      }
    }
  ]
}
