/**
 * AG-UI 工具调用流式解析工具
 *
 * 从 AgUiService 抽离：把 OpenAI 兼容协议的流式 tool_calls 增量聚合，
 * 并转为 AG-UI 的 TOOL_CALL_START / TOOL_CALL_ARGS 事件。END 事件在流收尾时统一发。
 */

/** 事件写出回调（由 AgUiService 注入，指向其 SSE writeEvent） */
export type WriteEventFn = (event: Record<string, unknown>) => void;

/** 流式工具调用累加器（按上游 index 聚合分块到达的 id/name/arguments） */
export interface ToolCallAccum {
  index: number;
  id: string;
  name: string;
  args: string;
  started: boolean;
}

/**
 * 处理流式工具调用增量：按 index 聚合，首次名称+ID 齐备时发 TOOL_CALL_START，
 * 参数分块到达发 TOOL_CALL_ARGS。END 事件由调用方在流收尾时统一发出。
 * @param deltas 上游 delta.tool_calls 数组（不可信外部数据）
 * @param toolCalls 累加器（原地维护）
 * @param writeEvent 事件写出回调
 */
export function handleToolCallDelta(
  deltas: unknown[],
  toolCalls: Map<number, ToolCallAccum>,
  writeEvent: WriteEventFn,
): void {
  for (const d of deltas) {
    const item = d as {
      index?: number;
      id?: string;
      function?: { name?: string; arguments?: string };
    };
    const index = typeof item?.index === 'number' ? item.index : 0;
    let acc = toolCalls.get(index);
    if (!acc) {
      acc = { index, id: '', name: '', args: '', started: false };
      toolCalls.set(index, acc);
    }
    if (item.id) acc.id = item.id;
    if (item.function?.name) acc.name += item.function.name;

    // 名称与 ID 齐备且未开始 → 发 START
    if (!acc.started && acc.name && acc.id) {
      acc.started = true;
      writeEvent({ type: 'TOOL_CALL_START', toolCallId: acc.id, toolCallName: acc.name });
    }

    // 参数增量 → ARGS（仅在已 START 后发送，保证前端能关联）
    const argDelta = item.function?.arguments;
    if (typeof argDelta === 'string' && argDelta && acc.started) {
      acc.args += argDelta;
      writeEvent({ type: 'TOOL_CALL_ARGS', toolCallId: acc.id, delta: argDelta });
    }
  }
}

/**
 * 流收尾：对所有已开始的工具调用发出 TOOL_CALL_END，触发前端执行工具。
 * @param toolCalls 累加器
 * @param writeEvent 事件写出回调
 */
export function emitToolCallEnds(
  toolCalls: Map<number, ToolCallAccum>,
  writeEvent: WriteEventFn,
): void {
  for (const tc of toolCalls.values()) {
    if (tc.started) writeEvent({ type: 'TOOL_CALL_END', toolCallId: tc.id });
  }
}
