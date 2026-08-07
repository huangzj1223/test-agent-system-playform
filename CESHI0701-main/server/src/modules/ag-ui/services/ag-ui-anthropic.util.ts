/**
 * AG-UI Anthropic 原生协议适配器
 *
 * 后端多协议分发的 Anthropic 分支：把内部规范化的 OpenAI 风格消息/工具，
 * 转成 Anthropic Messages API（/v1/messages）请求体；并把 Anthropic 的
 * SSE 事件（content_block_*）解析回统一的 AG-UI 事件（复用 OpenAI 分支的事件形状）。
 *
 * 之所以需要原生分支：Anthropic 强制 max_tokens、system 提到顶层、工具用
 * input_schema、tool 结果走 content block，且流式事件格式与 OpenAI 完全不同。
 * 经由 OpenAI 兼容中转翻译时工具格式常被破坏，故直连原生协议最稳。
 */
import type { WriteEventFn, ToolCallAccum } from './ag-ui-tool-call.util';

/** 内部规范化消息（与 ag-ui.service 的 ChatMessage 结构兼容，结构化类型自动适配） */
export interface NormalizedMessage {
  role: string;
  content: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

/** 内部规范化工具（与 ag-ui.service 的 ChatTool 结构兼容） */
export interface NormalizedTool {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

/** Anthropic 请求对话参数（已由调用方校验夹取） */
export interface AnthropicChatParams {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

/** Anthropic content block（请求侧） */
type AnthropicBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string };

/** Anthropic 请求消息 */
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicBlock[];
}

/** 安全解析工具参数 JSON（Anthropic input 必须是对象，失败回退空对象） */
function parseArgs(argsText: string): unknown {
  if (!argsText || !argsText.trim()) return {};
  try {
    const v = JSON.parse(argsText);
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

/**
 * 追加消息块并合并相邻同角色消息。Anthropic Messages API 要求严格 user/assistant
 * 交替，连续同角色会 400。常见触发场景：模型同一轮先输出说明文本（前端记为一条
 * assistant 文本消息）再调用工具（另记为一条 assistant tool_use 消息），续跑时两条
 * 相邻 assistant 会被拒。此处统一把相邻同角色内容合并进同一条消息（content 归一为
 * block 数组后 concat），tool_result 并入 user 也复用此逻辑。
 * @param out 目标消息数组（原地维护）
 * @param role 本次消息角色
 * @param blocks 本次消息的 content blocks
 */
function pushMessage(
  out: AnthropicMessage[],
  role: 'user' | 'assistant',
  blocks: AnthropicBlock[],
): void {
  if (!blocks.length) return;
  const last = out[out.length - 1];
  if (last && last.role === role) {
    const prev = Array.isArray(last.content)
      ? last.content
      : [{ type: 'text', text: last.content } as AnthropicBlock];
    last.content = [...prev, ...blocks];
  } else {
    out.push({ role, content: blocks });
  }
}

/**
 * 构造 Anthropic /v1/messages 请求体。
 * @param model 供应商侧模型 ID
 * @param messages 规范化消息（含 system/user/assistant/tool）
 * @param tools 规范化工具（可空）
 * @param chatParams 已校验的对话参数（maxTokens 由调用方保证有值）
 */
export function buildAnthropicBody(
  model: string,
  messages: NormalizedMessage[],
  tools: NormalizedTool[],
  chatParams: AnthropicChatParams,
): Record<string, unknown> {
  // system 提到顶层：拼接所有 system 消息内容
  const systemText = messages
    .filter((m) => m.role === 'system' && m.content.trim())
    .map((m) => m.content)
    .join('\n\n');

  const out: AnthropicMessage[] = [];
  for (const m of messages) {
    if (m.role === 'system') continue;
    // tool 结果 → 并入 user 消息的 tool_result block（相邻 user 自动合并）
    if (m.role === 'tool') {
      if (!m.tool_call_id) continue;
      pushMessage(out, 'user', [
        { type: 'tool_result', tool_use_id: m.tool_call_id, content: m.content ?? '' },
      ]);
      continue;
    }
    // assistant 携带工具调用 → text(可选) + tool_use blocks
    if (m.role === 'assistant' && m.tool_calls?.length) {
      const blocks: AnthropicBlock[] = [];
      if (m.content.trim()) blocks.push({ type: 'text', text: m.content });
      for (const c of m.tool_calls) {
        blocks.push({
          type: 'tool_use',
          id: c.id,
          name: c.function.name,
          input: parseArgs(c.function.arguments),
        });
      }
      pushMessage(out, 'assistant', blocks);
      continue;
    }
    // 普通文本消息（user/assistant）：空内容跳过；相邻同角色自动合并
    if (m.content.trim()) {
      pushMessage(out, m.role === 'assistant' ? 'assistant' : 'user', [
        { type: 'text', text: m.content },
      ]);
    }
  }

  const body: Record<string, unknown> = {
    model,
    messages: out,
    stream: true,
    // Anthropic 强制要求 max_tokens；调用方已兜底，仍防御性回退
    max_tokens: chatParams.maxTokens ?? 4096,
  };
  if (systemText) body.system = systemText;
  if (chatParams.temperature !== undefined) body.temperature = chatParams.temperature;
  if (chatParams.topP !== undefined) body.top_p = chatParams.topP;
  if (tools.length) {
    body.tools = tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));
    body.tool_choice = { type: 'auto' };
  }
  return body;
}

/** Anthropic 流式解析状态（跨 chunk 维护） */
export interface AnthropicStreamState {
  /** 文本/推理消息 ID（惰性创建） */
  ids: { text: string; reasoning: string };
  /** content block index → 类型，用于把后续 delta 归类 */
  blockKind: Map<number, 'text' | 'thinking' | 'tool_use'>;
}

/** 创建初始 Anthropic 流状态 */
export function createAnthropicState(): AnthropicStreamState {
  return { ids: { text: '', reasoning: '' }, blockKind: new Map() };
}

/**
 * 解析单条 Anthropic SSE data 行，产出统一 AG-UI 事件。
 * 事件类型：content_block_start（记录块类型 / 工具起始）、content_block_delta
 * （text_delta→文本；thinking_delta→推理；input_json_delta→工具参数）。
 * @param data data 行原始 JSON
 * @param genId 消息 ID 生成器
 * @param state 跨 chunk 流状态
 * @param toolCalls 工具调用累加器（与 OpenAI 分支共用，收尾统一发 END）
 * @param writeEvent 事件写出回调
 */
export function handleAnthropicChunk(
  data: string,
  genId: (prefix: string) => string,
  state: AnthropicStreamState,
  toolCalls: Map<number, ToolCallAccum>,
  writeEvent: WriteEventFn,
): void {
  let evt: {
    type?: string;
    index?: number;
    content_block?: { type?: string; id?: string; name?: string };
    delta?: { type?: string; text?: string; thinking?: string; partial_json?: string };
  };
  try {
    evt = JSON.parse(data);
  } catch {
    return; // 非法分块静默跳过
  }
  if (!evt || typeof evt.type !== 'string') return;
  const { ids } = state;

  // 块开始：记录类型；工具块则登记累加器并发 TOOL_CALL_START
  if (evt.type === 'content_block_start' && typeof evt.index === 'number') {
    const cb = evt.content_block;
    if (cb?.type === 'tool_use' && cb.id && cb.name) {
      state.blockKind.set(evt.index, 'tool_use');
      // 工具块 index 直接用作 toolCalls 的 key（Anthropic 每个 content block 的 index 唯一）
      toolCalls.set(evt.index, {
        index: evt.index,
        id: cb.id,
        name: cb.name,
        args: '',
        started: true,
      });
      writeEvent({ type: 'TOOL_CALL_START', toolCallId: cb.id, toolCallName: cb.name });
    } else if (cb?.type === 'thinking') {
      state.blockKind.set(evt.index, 'thinking');
    } else {
      state.blockKind.set(evt.index, 'text');
    }
    return;
  }

  // 块增量：按块类型分派
  if (evt.type === 'content_block_delta' && typeof evt.index === 'number' && evt.delta) {
    const kind = state.blockKind.get(evt.index) ?? 'text';
    const d = evt.delta;

    // 工具参数增量 → TOOL_CALL_ARGS
    if (kind === 'tool_use' && typeof d.partial_json === 'string' && d.partial_json) {
      const acc = toolCalls.get(evt.index);
      if (acc) {
        acc.args += d.partial_json;
        writeEvent({ type: 'TOOL_CALL_ARGS', toolCallId: acc.id, delta: d.partial_json });
      }
      return;
    }

    // 推理增量（extended thinking）→ REASONING_*
    if (kind === 'thinking' && typeof d.thinking === 'string' && d.thinking) {
      if (!ids.reasoning) {
        ids.reasoning = genId('reason');
        writeEvent({ type: 'REASONING_MESSAGE_START', messageId: ids.reasoning });
      }
      writeEvent({ type: 'REASONING_MESSAGE_CONTENT', messageId: ids.reasoning, delta: d.thinking });
      return;
    }

    // 正文增量 → TEXT_MESSAGE_*（先收束可能存在的推理消息）
    if (typeof d.text === 'string' && d.text) {
      if (ids.reasoning) {
        writeEvent({ type: 'REASONING_MESSAGE_END', messageId: ids.reasoning });
        ids.reasoning = '';
      }
      if (!ids.text) {
        ids.text = genId('msg');
        writeEvent({ type: 'TEXT_MESSAGE_START', messageId: ids.text, role: 'assistant' });
      }
      writeEvent({ type: 'TEXT_MESSAGE_CONTENT', messageId: ids.text, delta: d.text });
    }
  }
}
