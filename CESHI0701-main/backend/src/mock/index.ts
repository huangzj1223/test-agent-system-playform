// 全局 mock 开关 — 改为 false 可关闭所有 mock
export const MOCK_ENABLED = true

if (MOCK_ENABLED) {
  const mockRoutes: Record<string, Record<string, (body?: unknown) => unknown>> = {
    POST: {
      '/api/auth/login': (body: unknown) => {
        const { username, password } = body as { username: string; password: string }
        if (username === 'admin' && password === '123456') {
          return {
            code: 0,
            data: {
              token: 'mock-token-axuremart-2026',
              user: { id: 1, name: '张明', email: 'admin@axuremart.ai', avatar: '', role: 'admin' },
            },
            message: '登录成功',
          }
        }
        return { code: 401, data: null, message: '用户名或密码错误' }
      },
      '/api/auth/logout': () => ({ code: 0, message: '已退出登录' }),
    },
    GET: {
      '/api/auth/me': () => ({
        code: 0,
        data: { id: 1, name: '张明', email: 'admin@axuremart.ai', avatar: '', role: 'admin' },
      }),
    },
  }

  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : (input as Request).url
    const method = (init?.method || 'GET').toUpperCase()
    const handler = mockRoutes[method]?.[url]

    if (handler) {
      await new Promise((r) => setTimeout(r, 200 + Math.random() * 200))
      let body: unknown
      if (init?.body) {
        try { body = JSON.parse(init.body as string) } catch { body = init.body }
      }
      const data = handler(body)
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return originalFetch(input, init)
  }
}
