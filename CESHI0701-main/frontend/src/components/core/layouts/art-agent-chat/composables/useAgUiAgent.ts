/**
 * AG-UI Agent 编排 composable
 * 负责：发送消息、停止生成、错误重试、事件订阅与生命周期清理。
 * 通过 agUiClient 使用官方 HttpAgent，事件经 agUiEventReducer 归约进 aiChat store。
 */
import { onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { AgentSubscriber } from '@ag-ui/client'
import type { BaseEvent, Message } from '@ag-ui/core'
import { createAgent, runAgent, genId } from '@/services/agUiClient'
import { reduceEvent } from '@/utils/agui/agUiEventReducer'
import { AGENT_BLOCKS_SYSTEM_PROMPT } from '@/utils/agui/agentBlocks'
import { useAiChatStore } from '@/store/modules/aiChat'
import { useModelConfigStore } from '@/store/modules/modelConfig'
import { useAgentChatSettingStore } from '@/store/modules/agentChatSetting'
import { useUserStore } from '@/store/modules/user'
import { getActionByWireName, toToolDefinitions, getToolGovernance } from '@/agent/frontend-action-registry'
import { getPageContext } from '@/agent/page-context'
import { requestConfirmation } from '@/agent/action-confirmation'
import { recordToolCall } from '@/api/agentTool'
import type { AgUiModelContext, AiToolCall } from '@/types/aiChat'

/** 一轮对话内工具执行的最大续跑次数，防止模型与工具无限往返 */
const MAX_TOOL_ITERATIONS = 5

export function useAgUiAgent() {
  const store = useAiChatStore()
  const modelStore = useModelConfigStore()
  const chatSettingStore = useAgentChatSettingStore()

  /** 当前中断控制器 */
  let abortController: AbortController | null = null
  /** 当前订阅解除函数 */
  let unsubscribe: (() => void) | null = null

  /** 解析当前模型上下文（仅 ID 类信息，apiKey 由后端解密取用）；无可用模型返回 null */
  const resolveModelContext = (): AgUiModelContext | null => {
    const params = modelStore.buildChatParams()
    if (!params) return null
    return {
      providerConfigId: params.providerConfigId,
      modelId: params.modelId,
      protocolType: params.protocolType
    }
  }

  /** 构造事件订阅器：把每个 AG-UI 事件归约进 store */
  const buildSubscriber = (): AgentSubscriber => ({
    onEvent: ({ event }: { event: BaseEvent }) => {
      // 归约为规范化视图状态；未识别事件由 reducer 记录调试日志，不渲染原始 JSON
      reduceEvent(store.reduced, event as unknown as { type: string } & Record<string, unknown>)
    }
  })

  /** 清理订阅与中断控制器 */
  const cleanup = () => {
    unsubscribe?.()
    unsubscribe = null
    abortController = null
  }

  /**
   * 执行一次运行（内部）：创建 agent、订阅、runAgent
   * @param model 模型上下文
   */
  const doRun = async (model: AgUiModelContext) => {
    const runId = store.beginRun(model)
    // 续跑消息：跨轮累积「模型发起的工具调用 + 工具执行结果」，供模型看到完整回合
    const continuationMessages: Message[] = []
    abortController = new AbortController()

    try {
      // 工具执行循环：模型可能多轮调用工具，每轮执行后带结果续跑，直至无待执行工具。
      // executedThisRound：标记最后一轮是否执行了工具但还没把结果带回模型。
      let executedThisRound = false
      for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
        executedThisRound = false
        await runOnce(model, runId, continuationMessages)
        if (abortController?.signal.aborted) break

        const pending = store.getPendingToolCalls()
        if (!pending.length) break // 无待执行工具 → 本轮对话结束

        // 执行前端工具（含高风险确认），得到续跑消息；用户取消则终止循环
        const { messages: toolMsgs, cancelled } = await executeToolCalls(pending)
        continuationMessages.push(...toolMsgs)
        if (cancelled) break
        executedThisRound = true
      }
      // 达到迭代上限但最后一轮工具结果尚未回传：追加一次收尾运行让模型总结，
      // 避免出现"工具执行成功但无模型回应"的半截对话。
      if (executedThisRound && !abortController?.signal.aborted) {
        await runOnce(model, runId, continuationMessages)
      }
    } catch (e) {
      // 客户端侧异常（如工具序列化失败）：设置错误信息，确保显示错误卡片而非静默无响应。
      // 已由 RUN_ERROR 事件置为 error/aborted 的情况不覆盖（保留后端脱敏错误）。
      if (store.status !== 'error' && store.status !== 'aborted') {
        store.setError((e as Error)?.message || '智能体运行失败，请稍后重试', 'client')
      }
    } finally {
      cleanup()
      void store.saveCurrentSession()
    }
  }

  /**
   * 执行单轮模型运行：创建 agent、注入 system/历史/续跑消息与工具定义，订阅并 runAgent。
   * @param model 模型上下文
   * @param runId 运行 ID
   * @param continuationMessages 前几轮累积的工具调用与结果消息
   */
  const runOnce = async (
    model: AgUiModelContext,
    runId: string,
    continuationMessages: Message[]
  ) => {
    const agent = createAgent(store.threadId)
    // system 提示：约定数据类问题用 agent-blocks 协议输出结构化数据
    agent.messages.push({
      id: 'sys-agent-blocks',
      role: 'system',
      content: AGENT_BLOCKS_SYSTEM_PROMPT
    } as Message)
    // 历史用户/assistant 文本消息作为上下文
    store.messages.forEach((m) => {
      if (m.role === 'user' || m.role === 'assistant') {
        agent.messages.push({ id: m.id, role: m.role, content: m.content } as Message)
      }
    })
    // 本轮已产生的工具调用/结果（续跑时模型需看到）
    continuationMessages.forEach((m) => agent.messages.push(m))

    // 当前页面注册的、且用户有权限的工具定义（无权限则不注册 → 模型看不到）
    const userStore = useUserStore()
    const perms = userStore.info?.buttons || []
    const tools = toToolDefinitions(perms)

    const sub = agent.subscribe(buildSubscriber())
    unsubscribe = sub.unsubscribe

    // 对话参数 = 全局系统提示词（对话参数页签）+ 当前模型运行时参数（温度/TopP/最大输出/超时/重试）。
    // 温度等已改为每模型配置，故从模型 store 取；systemPrompt 仍为全局设置。
    const chatParams = {
      ...chatSettingStore.buildChatParams(),
      ...modelStore.buildModelRuntimeParams()
    }

    // tools 必须随 runAgent 调用参数传入（HttpAgent 只读调用参数里的 tools，不读实例属性）
    await runAgent(agent, {
      runId,
      model,
      abortController: abortController as AbortController,
      pageContext: getPageContext() as unknown as Record<string, unknown> | null,
      tools: tools.length ? tools : undefined,
      chatParams: Object.keys(chatParams).length ? chatParams : undefined
    })
    // 单轮结束解除订阅，避免下一轮重复归约
    unsubscribe?.()
    unsubscribe = null
  }

  /**
   * 执行一批待处理的工具调用，返回续跑消息与是否被用户取消。
   * 高风险工具先弹确认卡片；执行结果同时写入 store（驱动卡片状态）与续跑消息。
   * @param pending 待执行的工具调用（status=executing）
   */
  const executeToolCalls = async (
    pending: AiToolCall[]
  ): Promise<{ messages: Message[]; cancelled: boolean }> => {
    const messages: Message[] = []
    // assistant 消息携带本轮所有工具调用（OpenAI 续跑要求先回传 assistant.tool_calls）
    const assistantToolCalls = pending.map((tc) => ({
      id: tc.id,
      name: tc.name,
      argsText: tc.argsText
    }))
    messages.push({
      id: genId('msg'),
      role: 'assistant',
      content: '',
      toolCalls: assistantToolCalls
    } as unknown as Message)

    let cancelled = false
    for (const tc of pending) {
      const result = await executeOne(tc)
      if (result.cancelled) cancelled = true
      // tool 角色结果消息：必须带 toolCallId 关联对应调用
      messages.push({
        id: genId('msg'),
        role: 'tool',
        content: result.content,
        toolCallId: tc.id
      } as unknown as Message)
    }
    return { messages, cancelled }
  }

  /**
   * 执行单个工具调用：解析参数 → 权限/存在校验 → 高风险确认 → 调用 registry.execute。
   * 全程更新 store 中该工具调用的状态与结果，返回回传给模型的结果文本。
   * @param tc 工具调用
   */
  const executeOne = async (
    tc: AiToolCall
  ): Promise<{ content: string; cancelled: boolean }> => {
    // 模型返回的是合法化后的工具名（ui__search），转回 registry 的点号名查找
    const action = getActionByWireName(tc.name)
    if (!action) {
      store.setToolCallResult(tc.id, { error: `未注册的操作：${tc.name}`, status: 'error' })
      return { content: JSON.stringify({ success: false, message: `未注册的操作：${tc.name}` }), cancelled: false }
    }

    // 权限二次校验（纵深防御）：即便模型幻觉/注入发起无权限工具，前端也拦下，
    // 给出准确的"无权限"提示，而不是等后端 403。后端仍是最终权限边界。
    if (action.permission) {
      const perms = useUserStore().info?.buttons || []
      if (!perms.includes(action.permission)) {
        store.setToolCallResult(tc.id, { error: '无权限执行该操作', status: 'error' })
        return { content: JSON.stringify({ success: false, message: '无权限执行该操作' }), cancelled: false }
      }
    }

    // 解析参数（模型生成的 JSON，可能为空串）
    let args: Record<string, unknown> = {}
    try {
      args = tc.argsText ? (JSON.parse(tc.argsText) as Record<string, unknown>) : {}
    } catch {
      store.setToolCallResult(tc.id, { error: '参数解析失败', status: 'error' })
      return { content: JSON.stringify({ success: false, message: '参数解析失败' }), cancelled: false }
    }

    // 高风险操作：弹确认卡片，等待用户决策。
    // 治理侧（工具权限页）可将某工具标记为"需确认"，覆盖代码里的默认值 → 二者取或。
    const govRequireConfirm = getToolGovernance(action.name)?.requireConfirm === true
    if (action.requireConfirmation || govRequireConfirm) {
      store.setToolCallStatus(tc.id, 'awaiting-confirmation')
      const userStore = useUserStore()
      const confirmed = await requestConfirmation({
        toolCallId: tc.id,
        action: action.name,
        actionLabel: action.description,
        target: String(args.departmentName ?? args.name ?? args.id ?? '当前对象'),
        impact: action.riskLevel === 'high' ? '该操作不可撤销，请确认' : '请确认执行',
        operator: userStore.info?.name || userStore.info?.username || '当前用户'
      })
      if (!confirmed) {
        store.setToolCallResult(tc.id, { error: '用户已取消', status: 'cancelled' })
        return { content: JSON.stringify({ success: false, message: '用户已取消操作' }), cancelled: true }
      }
    }

    // 执行
    store.setToolCallStatus(tc.id, 'executing')
    const startedAt = Date.now()
    // 上报一次调用日志：成功/失败均记录，失败不阻断主流程（fire-and-forget）
    const report = (success: boolean) => {
      void recordToolCall({
        toolKey: action.name,
        agent: 'AG-UI 智能体',
        params: args,
        success,
        durationMs: Date.now() - startedAt
      }).catch(() => undefined)
    }
    try {
      const res = await action.execute(args)
      store.setToolCallResult(tc.id, {
        result: JSON.stringify(res),
        status: res.success ? 'success' : 'error'
      })
      report(res.success === true)
      return { content: JSON.stringify(res), cancelled: false }
    } catch (e) {
      const msg = (e as Error)?.message || '执行失败'
      store.setToolCallResult(tc.id, { error: msg, status: 'error' })
      report(false)
      return { content: JSON.stringify({ success: false, message: msg }), cancelled: false }
    }
  }

  /** 发送消息 */
  const send = async () => {
    const content = store.draftInput.trim()
    if (!content || store.isRunning) return

    const model = resolveModelContext()
    if (!model) {
      ElMessage.warning('暂无可用模型，请先在「模型配置」中启用模型')
      return
    }

    store.addUserMessage(content)
    store.setDraft('')
    await doRun(model)
  }

  /** 停止生成：中断请求，保留已生成内容，并清除残留流式光标 */
  const stop = () => {
    if (!abortController) return
    abortController.abort()
    store.markStreamingStopped()
    store.setStatus('aborted')
  }

  /** 错误重试：用上次模型上下文重跑最近一条用户消息 */
  const retry = async () => {
    if (store.isRunning) return
    const model = store.lastModelContext || resolveModelContext()
    if (!model) {
      ElMessage.warning('暂无可用模型，无法重试')
      return
    }
    await doRun(model)
  }

  /** 新建会话：中断当前运行并重置线程（先保存当前会话到后端） */
  const newChat = () => {
    abortController?.abort()
    cleanup()
    void store.newThread()
  }

  /**
   * 切换到历史会话：先中断当前运行并解除订阅，再加载目标会话。
   * 必须先 abort + cleanup —— 否则运行中切换时，旧会话未中断的 SSE 事件会继续
   * 归约进已被替换为新会话的 store.reduced，污染并覆盖历史会话数据。
   */
  const switchSession = async (id: string) => {
    abortController?.abort()
    cleanup()
    await store.loadSession(id)
  }

  /**
   * 删除历史会话：若删除的是当前正在运行的会话，先中断其运行再删除，
   * 避免残留 SSE 事件在删除后重建出脏数据。
   */
  const removeSession = async (id: string) => {
    if (id === store.threadId) {
      abortController?.abort()
      cleanup()
    }
    await store.deleteSession(id)
  }

  // 组件卸载时中断未完成请求并解除订阅，避免竞态与泄漏
  onUnmounted(() => {
    abortController?.abort()
    cleanup()
  })

  return { send, stop, retry, newChat, switchSession, removeSession }
}
