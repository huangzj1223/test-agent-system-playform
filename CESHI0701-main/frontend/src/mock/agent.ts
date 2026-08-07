// @ts-nocheck
/**
 * 智能体对话 Mock 数据
 * 提供会话列表、会话消息、附件上传的 mock，以及流式回复模拟。
 * 非流式接口经 mockRegistry 注册；流式回复由 api 层直接调用 mockStreamReply。
 */

// ==================== 会话数据 ====================
export const mockConversations = [
  { id: 'conv-1', title: '问候开场演示', agentName: '问候开场', updatedAt: Date.now() - 3600_000 },
  { id: 'conv-2', title: '资产引用示例', agentName: '问候开场', updatedAt: Date.now() - 7200_000 }
]

// 会话消息表：conversationId -> messages
const mockMessages = {
  'conv-1': [
    {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'assistant',
      content: '你好，我是**问候开场**智能体。可以向我提问，或用 `@` 引用资产。',
      attachments: [],
      status: 'done',
      createdAt: Date.now() - 3600_000
    }
  ],
  'conv-2': []
}

let nextConvSeq = 3

/** 获取会话列表 */
export function getConversationListMock() {
  return [...mockConversations].sort((a, b) => b.updatedAt - a.updatedAt)
}

/** 获取指定会话的消息 */
export function getConversationMessagesMock(conversationId) {
  return mockMessages[conversationId] ? [...mockMessages[conversationId]] : []
}

/** 新建会话 */
export function createConversationMock() {
  const id = `conv-${nextConvSeq++}`
  const conv = { id, title: '新会话', agentName: '问候开场', updatedAt: Date.now() }
  mockConversations.push(conv)
  mockMessages[id] = []
  return conv
}

/** 上传附件（返回可预览的元信息） */
export function uploadAttachmentMock(fileMeta) {
  const { name = 'file', size = 0, type = '' } = fileMeta || {}
  const isImage = String(type).startsWith('image/')
  return {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    url: isImage ? 'https://picsum.photos/seed/agent/240/160' : '',
    size,
    type,
    isImage
  }
}

// ==================== 流式回复模拟 ====================

/** 生成一段包含 Markdown 的演示回复 */
function buildReplyText(content) {
  return [
    `收到你的问题：**${content}**`,
    '',
    '下面是一段示例回复，用于验证 Markdown 渲染：',
    '',
    '- 支持列表',
    '- 支持 `行内代码`',
    '',
    '```js',
    "const greet = (name) => `你好，${name}`",
    '```',
    '',
    '| 能力 | 状态 |',
    '| --- | --- |',
    '| 流式输出 | 已支持 |',
    '| 表格渲染 | 已支持 |'
  ].join('\n')
}

/**
 * 模拟流式回复：按片调度回调，可被 AbortSignal 中断。
 * @param {object} payload 发送入参
 * @param {(chunk: string, done: boolean) => void} onChunk 分片回调
 * @param {AbortSignal} signal 中断信号
 */
export function mockStreamReply(payload, onChunk, signal) {
  const full = buildReplyText(payload?.content ?? '')
  // 按词切片，保留分隔符，贴近真实流式颗粒度
  const chunks = full.match(/(\s+|\S+)/g) || []
  let index = 0
  let timer = null

  const stop = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  const tick = () => {
    if (signal?.aborted) {
      stop()
      return
    }
    if (index >= chunks.length) {
      onChunk('', true)
      return
    }
    onChunk(chunks[index], false)
    index++
    timer = setTimeout(tick, 40)
  }

  // 中断时清理定时器
  signal?.addEventListener('abort', stop, { once: true })
  timer = setTimeout(tick, 40)
}
