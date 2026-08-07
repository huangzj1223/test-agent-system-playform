/**
 * Mock 路由注册表
 * 集中管理所有 mock 路由，在 request 层统一拦截
 */

export type MockHandler = (ctx: { params?: any; data?: any; url: string }) => any

interface MockRoute {
  method: string
  pattern: string
  handler: MockHandler
}

const routes: MockRoute[] = []

/**
 * 注册 mock 路由
 */
export function mockRoute(method: string, url: string, handler: MockHandler) {
  routes.push({ method: method.toUpperCase(), pattern: url, handler })
}

/**
 * 匹配 mock 路由，返回 handler 或 null
 */
export function matchMock(method: string, url: string): MockHandler | null {
  const m = method.toUpperCase()
  for (const route of routes) {
    if (route.method !== m) continue
    if (route.pattern === url) return route.handler
    if (route.pattern.includes(':') && matchDynamic(url, route.pattern)) {
      return route.handler
    }
  }
  return null
}

function matchDynamic(url: string, pattern: string): boolean {
  const urlParts = url.split('/')
  const patternParts = pattern.split('/')
  if (urlParts.length !== patternParts.length) return false
  return patternParts.every((part, i) => part.startsWith(':') || part === urlParts[i])
}

/**
 * 从 URL 中提取路径参数（最后一段作为 id）
 */
export function extractId(url: string): number {
  const parts = url.split('/')
  return Number(parts[parts.length - 1])
}
