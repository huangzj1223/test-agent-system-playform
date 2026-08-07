/**
 * AG-UI Mock 服务端（仅前端 VITE_USE_MOCK 模式使用）
 * 以真实 SSE 事件流模拟一个 AG-UI 后端：文本流 / 步骤 / 工具调用 / 工具结果 / 状态 / 完成 / 错误。
 * 用于在无真实后端时验证完整事件链；产出的每帧均为合法 AG-UI 事件（可通过 SDK 的 Zod 与顺序校验）。
 *
 * 通过 mockAgUiFetch 暴露为 fetch 兼容函数，注入给 HttpAgent 的 fetch 选项即可。
 * 注意：此文件不接触任何真实密钥，仅回显 forwardedProps 中的 ID 类信息。
 */
import { EventType } from '@ag-ui/core'

/** SSE 帧编码：单个事件对象 -> `data: {...}\n\n` */
function frame(event: Record<string, unknown>): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

/** 生成唯一 ID */
function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** 按词切片，贴近真实流式颗粒度 */
function sliceToChunks(text: string): string[] {
  return text.match(/(\s+|\S+)/g) || []
}

/** 根据用户输入决定演示场景 */
function detectScenario(
  text: string
): 'error' | 'tool' | 'data' | 'markdown' | 'plain' {
  const t = text.toLowerCase()
  if (t.includes('错误') || t.includes('error') || t.includes('报错')) return 'error'
  // 数据类：统计/分布/占比/趋势/画图 → 输出 agent-blocks 结构化数据
  if (
    t.includes('部门') ||
    t.includes('角色') ||
    t.includes('占比') ||
    t.includes('分布') ||
    t.includes('趋势') ||
    t.includes('统计') ||
    t.includes('数量') ||
    t.includes('画') ||
    t.includes('图表') ||
    t.includes('饼图') ||
    t.includes('柱') ||
    t.includes('折线')
  )
    return 'data'
  if (t.includes('工具') || t.includes('tool') || t.includes('检索')) return 'tool'
  if (t.includes('markdown') || t.includes('表格') || t.includes('代码') || t.includes('列表'))
    return 'markdown'
  return 'plain'
}

/**
 * 数据类演示回复：文字说明 + agent-blocks 结构化围栏（表格 + 图表）。
 * 三个验收场景按关键词区分：部门人数（饼）/ 月度趋势（折线）/ 角色占比（饼）。
 */
function dataReply(userText: string): string {
  const t = userText.toLowerCase()
  if (t.includes('月') || t.includes('趋势') || t.includes('新增')) {
    return buildDataReply(
      '统计完成，以下是最近 6 个月新增用户数量趋势。',
      '月度新增用户',
      { key: 'month', title: '月份', dataType: 'date' },
      { key: 'count', title: '新增用户数', dataType: 'number' },
      [
        { month: '2026-01', count: 120 },
        { month: '2026-02', count: 145 },
        { month: '2026-03', count: 138 },
        { month: '2026-04', count: 176 },
        { month: '2026-05', count: 210 },
        { month: '2026-06', count: 233 }
      ],
      'line',
      '人'
    )
  }
  if (t.includes('角色')) {
    return buildDataReply(
      '查询完成，以下是系统中不同角色的用户分布。',
      '角色用户分布',
      { key: 'role', title: '角色', dataType: 'string' },
      { key: 'count', title: '用户数量', dataType: 'number' },
      [
        { role: '超级管理员', count: 2 },
        { role: '部门管理员', count: 12 },
        { role: '普通用户', count: 86 },
        { role: '访客', count: 20 }
      ],
      'pie',
      '人'
    )
  }
  // 默认：部门人数
  return buildDataReply(
    '查询完成，以下是各部门人员数量统计。',
    '各部门人员数量',
    { key: 'department', title: '部门', dataType: 'string' },
    { key: 'count', title: '人员数量', dataType: 'number' },
    [
      { department: '研发部', count: 32 },
      { department: '市场部', count: 18 },
      { department: '行政部', count: 10 },
      { department: '财务部', count: 7 }
    ],
    'pie',
    '人'
  )
}

/** 组装"说明文字 + agent-blocks 围栏"回复 */
function buildDataReply(
  intro: string,
  title: string,
  catCol: { key: string; title: string; dataType: string },
  valCol: { key: string; title: string; dataType: string },
  rows: Array<Record<string, string | number>>,
  defaultType: 'pie' | 'bar' | 'line',
  unit: string
): string {
  const payload = {
    blocks: [
      { type: 'table', title, columns: [catCol, valCol], rows },
      {
        type: 'chart',
        id: `chart-${catCol.key}`,
        title: `${title}分布`,
        supportedTypes: ['pie', 'bar', 'line'],
        defaultType,
        categoryField: catCol.key,
        valueFields: [valCol.key],
        data: rows,
        unit
      }
    ]
  }
  return `${intro}\n\n\`\`\`agent-blocks\n${JSON.stringify(payload)}\n\`\`\``
}

/** 演示用 Markdown 正文（窄栏场景下验证表格/代码块横向滚动） */
function markdownReply(): string {
  return [
    '## 渲染示例',
    '',
    '下面用于验证窄侧栏下的 Markdown 排版：',
    '',
    '- 支持有序与无序列表',
    '- 支持 `行内代码` 与引用',
    '',
    '```ts',
    'const sum = (a: number, b: number): number => a + b',
    '```',
    '',
    '| 能力 | 状态 |',
    '| --- | --- |',
    '| 流式输出 | 已支持 |',
    '| 工具调用 | 已支持 |'
  ].join('\n')
}

/** RunAgentInput 的最小结构（mock 只用到这些字段） */
interface MockRunInput {
  threadId?: string
  runId?: string
  messages?: Array<{ role?: string; content?: string }>
  forwardedProps?: Record<string, unknown>
}

/**
 * 生成一次运行的 SSE ReadableStream。
 * 按场景依次推送 AG-UI 标准事件，可被 signal 中断（中断时补发 RUN_ERROR code=abort）。
 * @param input 解析后的 RunAgentInput
 * @param signal 中断信号
 */
function buildRunStream(input: MockRunInput, signal?: AbortSignal): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const threadId = input.threadId || genId('thread')
  const runId = input.runId || genId('run')
  const lastUser = [...(input.messages || [])].reverse().find((m) => m.role === 'user')
  const scenario = detectScenario(lastUser?.content || '')

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false
      const push = (e: Record<string, unknown>) => {
        if (!closed) controller.enqueue(encoder.encode(frame(e)))
      }
      const wait = (ms: number) =>
        new Promise<void>((resolve) => {
          const t = setTimeout(resolve, ms)
          signal?.addEventListener(
            'abort',
            () => {
              clearTimeout(t)
              resolve()
            },
            { once: true }
          )
        })
      const aborted = () => signal?.aborted

      try {
        push({ type: EventType.RUN_STARTED, threadId, runId })

        // 错误场景：起跑后立即 RUN_ERROR（脱敏，不含任何密钥）
        if (scenario === 'error') {
          await wait(300)
          if (!aborted())
            push({
              type: EventType.RUN_ERROR,
              message: '模型服务暂时不可用，请稍后重试',
              code: 'agent'
            })
          closed = true
          controller.close()
          return
        }

        await runScenario(scenario, { push, wait, aborted, runId, threadId }, lastUser?.content || '')

        if (aborted()) {
          push({ type: EventType.RUN_ERROR, message: '已停止生成', code: 'abort' })
        } else {
          push({ type: EventType.RUN_FINISHED, threadId, runId })
        }
      } catch {
        push({ type: EventType.RUN_ERROR, message: '运行异常', code: 'agent' })
      } finally {
        closed = true
        controller.close()
      }
    }
  })
}

/** 场景执行上下文 */
interface ScenarioCtx {
  push: (e: Record<string, unknown>) => void
  wait: (ms: number) => Promise<void>
  aborted: () => boolean | undefined
  runId: string
  threadId: string
}

/** 推送一段流式文本消息（START / CONTENT... / END） */
async function streamText(ctx: ScenarioCtx, text: string): Promise<void> {
  const messageId = genId('msg')
  ctx.push({ type: EventType.TEXT_MESSAGE_START, messageId, role: 'assistant' })
  for (const chunk of sliceToChunks(text)) {
    if (ctx.aborted()) return
    ctx.push({ type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: chunk })
    await ctx.wait(35)
  }
  ctx.push({ type: EventType.TEXT_MESSAGE_END, messageId })
}

/** 按场景推送事件序列 */
async function runScenario(
  scenario: 'tool' | 'data' | 'markdown' | 'plain',
  ctx: ScenarioCtx,
  userText: string
): Promise<void> {
  // 步骤：理解问题
  ctx.push({ type: EventType.STEP_STARTED, stepName: '理解问题' })
  await ctx.wait(250)
  ctx.push({ type: EventType.STEP_FINISHED, stepName: '理解问题' })
  if (ctx.aborted()) return

  // 数据场景：查询数据 + 输出结构化围栏
  if (scenario === 'data') {
    ctx.push({ type: EventType.STEP_STARTED, stepName: '查询数据' })
    await ctx.wait(400)
    ctx.push({ type: EventType.STEP_FINISHED, stepName: '查询数据' })
    if (ctx.aborted()) return
    ctx.push({ type: EventType.STEP_STARTED, stepName: '整理结果' })
    await streamText(ctx, dataReply(userText))
    ctx.push({ type: EventType.STEP_FINISHED, stepName: '整理结果' })
    return
  }

  if (scenario === 'tool') {
    // 步骤：调用工具
    ctx.push({ type: EventType.STEP_STARTED, stepName: '调用工具' })
    const toolCallId = genId('tool')
    ctx.push({
      type: EventType.TOOL_CALL_START,
      toolCallId,
      toolCallName: 'get_current_page_context'
    })
    // 参数分片流式拼接
    for (const part of ['{"scope":', '"current",', '"withSelection":', 'true}']) {
      if (ctx.aborted()) return
      ctx.push({ type: EventType.TOOL_CALL_ARGS, toolCallId, delta: part })
      await ctx.wait(120)
    }
    ctx.push({ type: EventType.TOOL_CALL_END, toolCallId })
    await ctx.wait(300)
    ctx.push({
      type: EventType.TOOL_CALL_RESULT,
      messageId: genId('msg'),
      toolCallId,
      content: JSON.stringify({
        route: '/organization/department',
        module: '部门管理',
        selected: null
      })
    })
    ctx.push({ type: EventType.STEP_FINISHED, stepName: '调用工具' })
    // 状态同步演示
    ctx.push({
      type: EventType.STATE_DELTA,
      delta: [{ op: 'add', path: '/lastTool', value: 'get_current_page_context' }]
    })
    if (ctx.aborted()) return
  }

  // 步骤：整理结果 + 文本回答
  ctx.push({ type: EventType.STEP_STARTED, stepName: '整理结果' })
  const reply =
    scenario === 'markdown'
      ? markdownReply()
      : scenario === 'tool'
        ? '已获取当前页面上下文：你正在「部门管理」页面。需要我基于当前数据继续操作吗？'
        : '你好，我是接入 AG-UI 协议的智能体。可以向我提问，我会以标准事件流返回运行过程与结果。'
  await streamText(ctx, reply)
  ctx.push({ type: EventType.STEP_FINISHED, stepName: '整理结果' })
}

/**
 * fetch 兼容的 Mock 实现：解析 RunAgentInput，返回 text/event-stream 响应。
 * 注入给 HttpAgent 的 fetch 选项，即可在无后端时驱动完整事件链。
 * @param _url 请求地址（忽略，恒为 /api/ag-ui）
 * @param init fetch 请求配置（含 body 与 signal）
 */
export function mockAgUiFetch(_url: string, init?: RequestInit): Promise<Response> {
  let input: MockRunInput = {}
  try {
    input = init?.body ? (JSON.parse(String(init.body)) as MockRunInput) : {}
  } catch {
    input = {}
  }
  const stream = buildRunStream(input, init?.signal ?? undefined)
  return Promise.resolve(
    new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      }
    })
  )
}
