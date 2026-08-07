/**
 * 全局网页操作工具接入层
 *
 * 给智能体提供两种网页能力（聊天面板挂载时注册一次，跨页面存活）：
 * - ui.openWeb：在用户浏览器新标签打开网页（白名单站点按模板拼搜索 URL，或任意 URL）
 * - web.readPage：调后端无头浏览器读取网页渲染后正文，回传模型总结
 *
 * 安全边界：白名单站点低风险直接执行；任意 URL 一律二次确认（防被诱导跳/读恶意站）；
 * 仅允许 http/https；关键词经 encodeURIComponent。
 */
import { registerActions, type FrontendAction, type ActionResult } from '@/agent/frontend-action-registry'
import { requestConfirmation } from '@/agent/action-confirmation'
import { useUserStore } from '@/store/modules/user'
import { readWebPage } from '@/api/webAgent'

/** 站点白名单：键、显示名、搜索 URL 模板（{kw} 占位） */
interface WebSite {
  key: string
  label: string
  searchTemplate: string
}

/** 站点白名单（与后端 web-agent.sites.ts 保持一致） */
const WEB_SITES: WebSite[] = [
  { key: 'bilibili', label: 'B站', searchTemplate: 'https://search.bilibili.com/all?keyword={kw}' },
  { key: 'baidu', label: '百度', searchTemplate: 'https://www.baidu.com/s?wd={kw}' },
  { key: 'taobao', label: '淘宝', searchTemplate: 'https://s.taobao.com/search?q={kw}' },
  { key: 'zhihu', label: '知乎', searchTemplate: 'https://www.zhihu.com/search?type=content&q={kw}' },
  { key: 'youtube', label: 'YouTube', searchTemplate: 'https://www.youtube.com/results?search_query={kw}' }
]

/** 站点键列表与显示名（供工具描述/校验） */
const SITE_KEYS = WEB_SITES.map((s) => s.key)
const SITE_LABELS = WEB_SITES.map((s) => `${s.key}(${s.label})`).join('、')

/** 按键查站点 */
function getSite(key: string): WebSite | undefined {
  return WEB_SITES.find((s) => s.key === key)
}

/**
 * 解析目标 URL：优先 site+keyword 按模板拼，否则用直传 url。
 * @returns { url, isWhitelist } 或 null（无法解析）
 */
function resolveUrl(args: {
  site?: unknown
  keyword?: unknown
  url?: unknown
}): { url: string; isWhitelist: boolean } | null {
  const site = typeof args.site === 'string' ? args.site.trim() : ''
  const keyword = typeof args.keyword === 'string' ? args.keyword.trim() : ''
  const url = typeof args.url === 'string' ? args.url.trim() : ''

  if (site && keyword) {
    const s = getSite(site)
    if (!s) return null
    return { url: s.searchTemplate.replace('{kw}', encodeURIComponent(keyword)), isWhitelist: true }
  }
  if (url) {
    // 仅允许 http/https，防 javascript:/data: 等伪协议
    if (!/^https?:\/\//i.test(url)) return null
    return { url, isWhitelist: false }
  }
  return null
}

/** 任意 URL 二次确认（白名单站点跳过） */
async function confirmIfArbitrary(
  actionName: string,
  actionLabel: string,
  target: string,
  isWhitelist: boolean
): Promise<boolean> {
  if (isWhitelist) return true
  const userStore = useUserStore()
  return requestConfirmation({
    toolCallId: `${actionName}-${Date.now()}`,
    action: actionName,
    actionLabel,
    target,
    impact: '即将访问外部网址，请确认该地址可信',
    operator: userStore.info?.name || userStore.info?.username || '当前用户'
  })
}

/** 公共参数 schema（site+keyword 或 url 二选一） */
const WEB_PARAMS = {
  type: 'object',
  properties: {
    site: { type: 'string', enum: SITE_KEYS, description: `站点白名单键，可选值：${SITE_LABELS}` },
    keyword: { type: 'string', description: '搜索关键词（与 site 搭配使用）' },
    url: { type: 'string', description: '直接访问的完整网址（http/https）；与 site+keyword 二选一' }
  }
}

/** 构建"打开网页"工具：在用户浏览器新标签打开 */
function buildOpenWebAction(): FrontendAction {
  return {
    name: 'ui.openWeb',
    description: `在浏览器新标签打开网页。用户要求"打开/去某网站搜索X"时调用：传 site+keyword 打开该站点搜索结果页（支持 ${SITE_LABELS}），或传 url 打开指定网址。`,
    parameters: WEB_PARAMS,
    riskLevel: 'low',
    requireConfirmation: false,
    execute: async (args: Record<string, unknown>): Promise<ActionResult> => {
      const resolved = resolveUrl(args)
      if (!resolved) {
        return {
          success: false,
          action: 'ui.openWeb',
          message: `无法识别打开目标。请传 site(${SITE_KEYS.join('/')})+keyword，或合法的 http/https url`
        }
      }
      const confirmed = await confirmIfArbitrary('ui.openWeb', '打开网页', resolved.url, resolved.isWhitelist)
      if (!confirmed) {
        return { success: false, action: 'ui.openWeb', message: '用户已取消打开网页' }
      }
      // noopener/noreferrer：防新标签页通过 window.opener 反向操纵本页
      window.open(resolved.url, '_blank', 'noopener,noreferrer')
      return { success: true, action: 'ui.openWeb', message: `已在新标签打开：${resolved.url}`, data: { url: resolved.url } }
    }
  }
}

/** 构建"读取网页内容"工具：后端无头浏览器读正文回传模型 */
function buildReadPageAction(): FrontendAction {
  return {
    name: 'web.readPage',
    description: `读取网页正文内容并返回（供你总结/回答）。用户要求"看看/总结某网页或某站点搜索结果"时调用：传 site+keyword 读该站点搜索结果页（支持 ${SITE_LABELS}），或传 url 读指定网址。返回页面标题与正文文本。`,
    parameters: WEB_PARAMS,
    riskLevel: 'low',
    requireConfirmation: false,
    execute: async (args: Record<string, unknown>): Promise<ActionResult> => {
      const resolved = resolveUrl(args)
      if (!resolved) {
        return {
          success: false,
          action: 'web.readPage',
          message: `无法识别读取目标。请传 site(${SITE_KEYS.join('/')})+keyword，或合法的 http/https url`
        }
      }
      const confirmed = await confirmIfArbitrary('web.readPage', '读取网页内容', resolved.url, resolved.isWhitelist)
      if (!confirmed) {
        return { success: false, action: 'web.readPage', message: '用户已取消读取网页' }
      }
      try {
        const site = typeof args.site === 'string' ? args.site.trim() : undefined
        const keyword = typeof args.keyword === 'string' ? args.keyword.trim() : undefined
        // 白名单走 site+keyword（后端按同一模板拼并可用专用选择器抽取）；任意 URL 走 url
        const resp = resolved.isWhitelist
          ? await readWebPage({ site, keyword })
          : await readWebPage({ url: resolved.url })
        // http 封装返回 { code, message, data }，正文在 data 里
        const page = resp.data
        return {
          success: true,
          action: 'web.readPage',
          message: `已读取「${page.title || page.url}」${page.truncated ? '（内容较长已截断）' : ''}`,
          data: page
        }
      } catch (e) {
        return { success: false, action: 'web.readPage', message: (e as Error)?.message || '网页读取失败' }
      }
    }
  }
}

/** 当前 web 工具的注销函数 */
let disposeWebTools: (() => void) | null = null

/** 注册全局网页工具（聊天面板挂载时调用一次；重复调用会先注销旧的） */
export function registerWebTools(): void {
  disposeWebTools?.()
  disposeWebTools = registerActions([buildOpenWebAction(), buildReadPageAction()])
}
