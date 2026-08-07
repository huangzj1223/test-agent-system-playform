/**
 * AG-UI 客户端服务
 * 统一封装官方 HttpAgent：连接 /api/ag-ui，暴露 runAgent / subscribe / abortRun。
 * Mock 模式（VITE_USE_MOCK）注入本地 SSE mock fetch，无需后端即可跑通事件链。
 *
 * 安全约束（原型阶段·方案 B）：模型配置存于浏览器 localStorage，后端不落库，
 * 因此运行时随 forwardedProps 携带 endpoint/apiKey/协议给后端直连模型。
 * 注意：apiKey 会经 localhost 传给后端，仅限本地原型；生产须改为后端加密存储。
 */
import { HttpAgent } from '@ag-ui/client'
import { mockAgUiFetch } from '@/mock/agUiServer'
import { useUserStore } from '@/store/modules/user'
import type { AgUiModelContext } from '@/types/aiChat'

/** 统一的 AG-UI 后端端点（开发环境经 vite 代理到 NestJS） */
const AG_UI_ENDPOINT = '/api/ag-ui'
/** 是否 Mock 模式 */
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

/** 生成唯一 ID */
export function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 创建一个 HttpAgent 实例
 * @param threadId 会话线程 ID（复用则保持上下文连续）
 * @returns HttpAgent 实例
 */
export function createAgent(threadId: string): HttpAgent {
  // 携带业务 Token：后端 /api/ag-ui 需登录鉴权（模型密钥由后端按 ID 解密，必须防止匿名枚举盗用）
  const { accessToken } = useUserStore()
  const headers: Record<string, string> = {}
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  return new HttpAgent({
    url: AG_UI_ENDPOINT,
    threadId,
    headers,
    // Mock 模式注入本地 SSE fetch（签名匹配 HttpAgentFetchFn）；真实模式走浏览器 fetch → vite 代理 → 后端
    ...(USE_MOCK ? { fetch: mockAgUiFetch } : {})
  })
}

/**
 * 发起一次运行
 * @param agent HttpAgent 实例
 * @param options 运行参数：runId、模型上下文（经 forwardedProps 传递）、中断控制器
 * @returns runAgent 的 Promise
 *
 * 注意：事件订阅由调用方通过 agent.subscribe() 单独注册，此处不再传入 subscriber，
 * 避免官方 HttpAgent 对同一 subscriber 二次订阅导致事件（文本 delta）被重复应用。
 */
export function runAgent(
  agent: HttpAgent,
  options: {
    runId: string
    model: AgUiModelContext
    abortController: AbortController
    /** 当前页面上下文（随 forwardedProps 传给智能体，用于理解用户所在场景） */
    pageContext?: Record<string, unknown> | null
    /**
     * 工具定义列表。必须随 runAgent 调用参数传入——HttpAgent 内部 prepareRunAgentInput
     * 只读取调用参数里的 tools，不读 agent 实例上的 this.tools。
     */
    tools?: Array<{ name: string; description: string; parameters: Record<string, unknown> }>
    /**
     * 用户在「对话参数」中配置的生成参数（temperature/maxTokens/systemPrompt）。
     * 随 forwardedProps 透传给后端，由后端校验夹取后注入模型请求；缺省字段走模型默认。
     */
    chatParams?: Record<string, unknown>
  }
) {
  // 仅携带 ID 类信息，apiKey/endpoint 由后端按 providerConfigId+modelId 解密取用，不再上网传输
  const forwardedProps: Record<string, unknown> = {
    providerConfigId: options.model.providerConfigId,
    modelId: options.model.modelId,
    protocolType: options.model.protocolType
  }
  if (options.model.agentId) forwardedProps.agentId = options.model.agentId
  // 页面上下文：仅结构化摘要，绝不含整页 HTML
  if (options.pageContext) forwardedProps.pageContext = options.pageContext
  // 对话参数：展开到 forwardedProps 顶层，后端从 fp.temperature/maxTokens/systemPrompt 读取
  if (options.chatParams) Object.assign(forwardedProps, options.chatParams)

  return agent.runAgent({
    runId: options.runId,
    tools: options.tools,
    forwardedProps,
    abortController: options.abortController
  })
}
