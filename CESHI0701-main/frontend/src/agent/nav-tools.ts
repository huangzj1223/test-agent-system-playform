/**
 * 全局页面导航工具接入层
 *
 * 给智能体提供「切换页面」能力：在任意页面注册一个全局 ui.navigate 工具，
 * 按「页面名 → 路由」白名单跳转。只允许跳已登记的业务页面，不接受任意 URL（防乱跳/越权）。
 * 与技能工具同为全局注册（聊天面板挂载时注册一次，跨页面存活）。
 */
import { registerActions, type FrontendAction, type ActionResult } from '@/agent/frontend-action-registry'
import { router } from '@/router'

/** 可导航页面白名单：每项含标准名、路由、别名（供模型用不同说法命中） */
interface NavTarget {
  /** 标准页面名 */
  label: string
  /** 路由路径 */
  path: string
  /** 别名（模型可能用的其它说法） */
  aliases: string[]
}

/** 业务页面导航白名单（新增可跳转页面时在此登记） */
const NAV_TARGETS: NavTarget[] = [
  { label: '部门管理', path: '/organization/department', aliases: ['部门', '组织部门', 'department'] },
  { label: '人员管理', path: '/organization/user', aliases: ['用户管理', '用户', '人员', '员工', 'user'] },
  { label: '岗位管理', path: '/organization/position', aliases: ['岗位', 'position'] },
  { label: '角色管理', path: '/permission/role', aliases: ['角色', 'role'] },
  { label: '菜单管理', path: '/permission/menu', aliases: ['菜单', 'menu'] }
]

/** 当前导航工具的注销函数 */
let disposeNavTools: (() => void) | null = null

/**
 * 按用户输入匹配目标页面（标准名/别名/路由，忽略大小写与首尾空格）
 * @param input 页面名或路由
 * @returns 命中的目标，未命中返回 null
 */
function matchTarget(input: string): NavTarget | null {
  const kw = input.trim().toLowerCase()
  if (!kw) return null
  for (const t of NAV_TARGETS) {
    if (t.path.toLowerCase() === kw) return t
    if (t.label.toLowerCase() === kw) return t
    if (t.aliases.some((a) => a.toLowerCase() === kw)) return t
  }
  // 退一步做包含匹配（如"部门管理页面"含"部门管理"）；按匹配词长度降序，优先命中更具体的词，
  // 避免短别名（如"用户"）在长句子里误命中
  const candidates: Array<{ target: NavTarget; term: string }> = []
  for (const t of NAV_TARGETS) {
    const terms = [t.label, ...t.aliases]
    for (const term of terms) {
      if (kw.includes(term.toLowerCase())) candidates.push({ target: t, term })
    }
  }
  if (!candidates.length) return null
  candidates.sort((a, b) => b.term.length - a.term.length)
  return candidates[0].target
}

/** 构建全局导航工具 */
function buildNavAction(): FrontendAction {
  const pageList = NAV_TARGETS.map((t) => t.label).join('、')
  return {
    name: 'ui.navigate',
    description: `切换到指定的功能页面（支持：${pageList}）。当用户要求打开/切换/进入某个页面时调用。`,
    parameters: {
      type: 'object',
      properties: {
        page: { type: 'string', description: `目标页面名称，如 ${pageList}` }
      },
      required: ['page']
    },
    riskLevel: 'low',
    requireConfirmation: false,
    execute: async (args: Record<string, unknown>): Promise<ActionResult> => {
      const page = typeof args.page === 'string' ? args.page : ''
      const target = matchTarget(page)
      if (!target) {
        return {
          success: false,
          action: 'ui.navigate',
          message: `无法识别页面"${page}"。可切换的页面：${pageList}`
        }
      }
      // 已在目标页则不重复跳转
      if (router.currentRoute.value.path === target.path) {
        return { success: true, action: 'ui.navigate', message: `当前已在「${target.label}」` }
      }
      // await 等待导航结算：push 被守卫取消/重定向时返回 NavigationFailure（不抛错），
      // 且需真正落到目标路由才算成功——避免"URL 变了但视图没切"仍误报成功
      try {
        const failure = await router.push(target.path)
        if (failure) {
          return {
            success: false,
            action: 'ui.navigate',
            message: `切换到「${target.label}」被取消（可能无权限或导航被中断）`
          }
        }
      } catch (e) {
        return {
          success: false,
          action: 'ui.navigate',
          message: `切换到「${target.label}」失败：${(e as Error)?.message || '导航异常'}`
        }
      }
      if (router.currentRoute.value.path !== target.path) {
        return {
          success: false,
          action: 'ui.navigate',
          message: `切换到「${target.label}」未生效（当前仍在 ${router.currentRoute.value.path}）`
        }
      }
      return { success: true, action: 'ui.navigate', message: `已切换到「${target.label}」` }
    }
  }
}

/** 注册全局导航工具（聊天面板挂载时调用一次；重复调用会先注销旧的） */
export function registerNavTools(): void {
  disposeNavTools?.()
  disposeNavTools = registerActions([buildNavAction()])
}
