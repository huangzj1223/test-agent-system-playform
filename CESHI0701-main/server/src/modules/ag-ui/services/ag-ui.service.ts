import { Injectable, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { RunAgentInputDto } from '../dto/run-agent-input.dto';
import { assertSafePublicUrl } from '@/common/utils/url-guard.util';
import { ModelProviderConfigService } from '@/modules/model-config/services/model-provider-config.service';
import { AgentConfigService } from './agent-config.service';
import { AgentMemoryService } from '@/modules/agent-memory/services/agent-memory.service';
import {
  handleToolCallDelta,
  emitToolCallEnds,
  type ToolCallAccum,
} from './ag-ui-tool-call.util';
import {
  buildAnthropicBody,
  handleAnthropicChunk,
  createAnthropicState,
} from './ag-ui-anthropic.util';

/** 判定协议是否为 Anthropic 原生（走 /v1/messages + x-api-key + Anthropic 事件解析） */
function isAnthropicProtocol(protocolType?: string): boolean {
  return protocolType === 'anthropic';
}

/** OpenAI 兼容协议的单条消息（支持工具调用与工具结果） */
interface ChatMessage {
  role: string;
  content: string;
  /** assistant 发起的工具调用（回合续跑时回传给模型） */
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  /** tool 角色消息关联的工具调用 ID */
  tool_call_id?: string;
}

/** OpenAI 兼容协议的工具定义 */
interface ChatTool {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

/**
 * AG-UI 事件流服务
 *
 * 以 SSE（text/event-stream）逐条输出 AG-UI 标准事件。
 * 按 forwardedProps 中的 providerConfigId/modelId 解密取用模型配置，
 * 以 OpenAI 兼容协议流式调用真实模型（DeepSeek 等），并将其增量转为 AG-UI 事件。
 *
 * 安全约束：
 * - 仅回显 forwardedProps 中的 ID 类信息，绝不读取或输出任何密钥；
 * - 调用前对 apiEndpoint 做 SSRF 校验，拒绝内网地址；
 * - 错误信息统一脱敏，不透传模型供应商原始错误与堆栈。
 */
@Injectable()
export class AgUiService {
  private readonly logger = new Logger('AgUiService');

  constructor(
    private readonly providerService: ModelProviderConfigService,
    private readonly agentConfig: AgentConfigService,
    private readonly memoryService: AgentMemoryService,
  ) {}

  /** 单个事件编码为 SSE 帧：data: {json}\n\n（仅 data 行，符合 AG-UI SSE 解析） */
  private writeEvent(res: Response, event: Record<string, unknown>): void {
    if (res.writableEnded) return;
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  /** 生成唯一 ID */
  private genId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * 处理一次运行：建立 SSE，调用真实模型驱动事件流，监听客户端断开与超时。
   * @param input 运行入参（RunAgentInput）
   * @param res Express 响应对象（用于直写 SSE）
   */
  async handleRun(input: RunAgentInputDto, res: Response, userId?: number): Promise<void> {
    const threadId = input.threadId || this.genId('thread');
    const runId = input.runId || this.genId('run');

    // SSE 响应头：禁用缓存与代理缓冲，保持长连接
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // 客户端断开 / abort 检测；superstruct 超时统一走 AbortController
    const abortController = new AbortController();
    const onClose = () => abortController.abort();
    res.on('close', onClose);
    // 超时优先用请求携带的每模型 timeoutSec，缺省回退全局配置
    const timeout = setTimeout(
      () => abortController.abort(),
      this.resolveTimeoutMs(input.forwardedProps || {}),
    );
    const aborted = () => abortController.signal.aborted || res.writableEnded;

    try {
      const fp = input.forwardedProps || {};
      this.logger.log(
        `run ${runId} thread ${threadId} provider=${String(fp.providerConfigId ?? '')} model=${String(fp.modelId ?? '')}`,
      );

      this.writeEvent(res, { type: 'RUN_STARTED', threadId, runId });
      await this.runModel(input, res, abortController.signal, aborted, userId, threadId);

      if (!aborted()) {
        this.writeEvent(res, { type: 'RUN_FINISHED', threadId, runId });
      }
    } catch (err) {
      // 脱敏：不透传原始错误详情
      this.logger.error(`run ${runId} failed: ${(err as Error)?.message}`);
      if (!aborted()) {
        this.writeEvent(res, {
          type: 'RUN_ERROR',
          message: '智能体运行失败，请稍后重试',
          code: 'agent',
        });
      }
    } finally {
      clearTimeout(timeout);
      res.removeListener('close', onClose);
      if (!res.writableEnded) res.end();
    }
  }

  /**
   * 真实模型调用：从 forwardedProps 读取连接配置 → SSRF 校验 → OpenAI 兼容流式请求 → 转 AG-UI 事件。
   *
   * 原型阶段（方案 B）：模型配置存于前端 localStorage，随请求携带 endpoint/apiKey/modelId，
   * 后端不落库、直连模型。apiKey 仅在内存使用，绝不写入日志或响应。
   * @param input 运行入参
   * @param res 响应对象
   * @param signal 中断信号（透传给 fetch）
   * @param aborted 中断判定
   */
  private async runModel(
    input: RunAgentInputDto,
    res: Response,
    signal: AbortSignal,
    aborted: () => boolean,
    userId?: number,
    sessionId?: string,
  ): Promise<void> {
    const fp = input.forwardedProps || {};
    const providerConfigId = Number(fp.providerConfigId);
    const modelId = fp.modelId ? String(fp.modelId) : '';

    // 仅接收 ID 类信息，apiKey/endpoint 由后端按 ID 解密取用，绝不随请求携带
    if (!Number.isInteger(providerConfigId) || providerConfigId <= 0 || !modelId) {
      this.emitError(res, aborted, '请先在「模型配置」中选择有效的模型');
      return;
    }

    // 按 providerConfigId + modelId 从数据库解密取连接上下文（校验模型确属该配置）
    const ctx = await this.providerService.resolveById(providerConfigId, modelId);
    if (!ctx || !ctx.apiKey) {
      this.emitError(res, aborted, '模型配置不存在或未设置 API Key，请在「模型配置」中完善');
      return;
    }
    const apiEndpoint = ctx.apiEndpoint;
    const apiKey = ctx.apiKey;

    // SSRF 防护：拒绝指向环回/私有/链路本地/元数据的地址
    try {
      await assertSafePublicUrl(apiEndpoint);
    } catch (e) {
      this.logger.warn(`ag-ui 端点校验失败：${(e as Error)?.message}`);
      this.emitError(res, aborted, '模型服务地址不可用');
      return;
    }

    const endpoint = this.buildChatEndpoint(apiEndpoint, ctx.protocolType);
    const messages = this.mapMessages(input.messages);
    if (!messages.length) {
      this.emitError(res, aborted, '消息内容为空');
      return;
    }

    // 注入页面上下文：让模型看到当前路由/筛选/行摘要/可用操作，
    // 从而能把用户口中的名称（如"浙江公司"）解析为工具参数所需的 ID。
    const ctxMessage = this.buildPageContextMessage(fp.pageContext);
    if (ctxMessage) messages.unshift(ctxMessage);

    // 用户在「对话参数」中配置的系统提示词：作为一条 system 消息注入，
    // 位置在既有系统消息（agent-blocks 协议约定 + 页面上下文）之后、首条用户消息之前，
    // 避免覆盖协议约定，同时让模型以用户设定的角色/风格作答。
    const promptMsg = this.buildUserSystemPromptMessage(fp.systemPrompt);
    if (promptMsg) {
      const firstNonSystem = messages.findIndex((m) => m.role !== 'system');
      const insertAt = firstNonSystem < 0 ? messages.length : firstNonSystem;
      messages.splice(insertAt, 0, promptMsg);
    }

    // 注入智能体长期记忆（enabled+canRead 文件内容），并记录读取埋点（命中率数据来源）。
    // 读记忆失败不阻断对话（fail-open）：仅记日志，照常运行。
    try {
      const memoryText = await this.memoryService.buildInjectableMemory(userId, sessionId);
      if (memoryText) {
        const memMsg: ChatMessage = {
          role: 'system',
          content: `以下是智能体长期记忆（soul/user/memory 等），请在作答时遵循：\n\n${memoryText}`,
        };
        const firstNonSystem = messages.findIndex((m) => m.role !== 'system');
        messages.splice(firstNonSystem < 0 ? messages.length : firstNonSystem, 0, memMsg);
      }
    } catch (e) {
      this.logger.warn(`注入记忆失败（不阻断对话）：${(e as Error)?.message}`);
    }

    // 从 forwardedProps 读取并校验对话参数（越界忽略，不报错），随请求体透传给模型
    const chatParams = this.sanitizeChatParams(fp);
    // max_tokens 兜底：前端未显式传时，用模型配置的 maxOutputTokens，仍无则用安全默认。
    // Anthropic（Claude）系模型强制要求 max_tokens，缺失会被上游拒绝（422），故必须保证有值。
    if (chatParams.maxTokens === undefined) {
      const ceiling = this.agentConfig.getLimits().maxTokensCeiling;
      const fromCfg = Number(ctx.maxOutputTokens);
      const fallback = Number.isInteger(fromCfg) && fromCfg >= 1 ? fromCfg : 4096;
      chatParams.maxTokens = Math.min(fallback, ceiling);
    }
    // 重试次数（每模型配置，夹取 0-10）随连接阶段使用
    const rc = Number(fp.retryCount);
    const retryCount = Number.isInteger(rc) && rc >= 0 && rc <= 10 ? rc : 0;

    // 前端注册的工具定义（页面操作/后端工具），映射为内部统一 function-calling 格式。
    // 模型配置标记不支持工具时不下发 tools，避免不支持工具的模型报错。
    const tools = ctx.supportTools === false ? [] : this.mapTools(input.tools);
    await this.streamChat(
      endpoint,
      apiKey,
      modelId,
      messages,
      tools,
      { ...chatParams, retryCount },
      res,
      signal,
      aborted,
      ctx.protocolType,
    );
  }

  /**
   * 校验并夹取对话参数（来自不可信的 forwardedProps）。
   * temperature 夹到 [0,2]；maxTokens 取正整数且夹到硬上限，越界或非法一律忽略（返回 undefined）。
   * @param fp forwardedProps 原始对象
   * @returns 规范化后的对话参数（字段可能缺省）
   */
  private sanitizeChatParams(fp: Record<string, unknown>): {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  } {
    // maxTokens 硬上限取自全局配置（可运行时调），仅作防护性夹取
    const maxTokensCeiling = this.agentConfig.getLimits().maxTokensCeiling;
    const result: { temperature?: number; maxTokens?: number; topP?: number } = {};

    const t = Number(fp.temperature);
    if (Number.isFinite(t) && t >= 0 && t <= 2) result.temperature = t;

    const m = Number(fp.maxTokens);
    if (Number.isInteger(m) && m >= 1) result.maxTokens = Math.min(m, maxTokensCeiling);

    const p = Number(fp.topP);
    if (Number.isFinite(p) && p >= 0 && p <= 1) result.topP = p;

    return result;
  }

  /**
   * 解析本次运行的超时（毫秒）：优先用请求携带的 timeoutSec（每模型配置，1-600 秒），
   * 越界或缺省回退全局配置的 runTimeoutMs。
   * @param fp forwardedProps 原始对象
   */
  private resolveTimeoutMs(fp: Record<string, unknown>): number {
    const sec = Number(fp.timeoutSec);
    if (Number.isInteger(sec) && sec >= 1 && sec <= 600) return sec * 1000;
    return this.agentConfig.getLimits().runTimeoutMs;
  }

  /**
   * 将用户配置的系统提示词构造为一条 system 消息（去空白、限长）。
   * @param systemPrompt forwardedProps.systemPrompt（不可信外部数据）
   * @returns system 消息；为空或非字符串时返回 null
   */
  private buildUserSystemPromptMessage(systemPrompt: unknown): ChatMessage | null {
    if (typeof systemPrompt !== 'string') return null;
    const text = systemPrompt.trim();
    if (!text) return null;
    // 限长防护取自全局配置（与保存时 assertWithinLimits 的 systemPromptMaxLen 一致），
    // 避免运维调高配置后实际调用仍按旧硬编码截断、静默丢内容
    const maxLen = this.agentConfig.getLimits().systemPromptMaxLen;
    return { role: 'system', content: text.slice(0, maxLen) };
  }

  /**
   * 将 AG-UI 工具定义映射为 OpenAI 兼容的 function-calling 格式。
   * 仅接受含 name + parameters 的合法项，过滤非法结构（不可信外部数据）。
   * @param tools 入参工具列表
   * @returns 规范化工具定义；无有效工具返回空数组
   */
  private mapTools(tools?: unknown[]): ChatTool[] {
    if (!Array.isArray(tools)) return [];
    const result: ChatTool[] = [];
    for (const t of tools) {
      const tool = t as {
        name?: unknown;
        description?: unknown;
        parameters?: unknown;
      };
      const name = typeof tool?.name === 'string' ? tool.name : '';
      if (!name) continue;
      result.push({
        type: 'function',
        function: {
          name,
          description: typeof tool.description === 'string' ? tool.description : '',
          parameters:
            tool.parameters && typeof tool.parameters === 'object'
              ? (tool.parameters as Record<string, unknown>)
              : { type: 'object', properties: {} },
        },
      });
    }
    return result;
  }

  /** 发送一条脱敏错误事件（幂等：已中断则跳过） */
  private emitError(res: Response, aborted: () => boolean, message: string): void {
    if (!aborted()) {
      this.writeEvent(res, { type: 'RUN_ERROR', message, code: 'agent' });
    }
  }

  /**
   * 把前端页面上下文构造为一条 system 消息，供模型理解当前场景并解析名称→ID。
   * 只序列化结构化摘要，限制体积（截断），不可信数据只读不执行。
   * @param pageContext forwardedProps.pageContext（可能为空）
   * @returns system 消息；无上下文时返回 null
   */
  private buildPageContextMessage(pageContext: unknown): ChatMessage | null {
    if (!pageContext || typeof pageContext !== 'object') return null;
    let json: string;
    try {
      json = JSON.stringify(pageContext);
    } catch {
      return null;
    }
    // 限制体积，避免超大上下文（行摘要仅少量关键字段，正常远小于此）
    if (json.length > 8000) json = json.slice(0, 8000);
    return {
      role: 'system',
      content:
        '以下是用户当前所在页面的结构化上下文（JSON）。当用户用名称指代某条数据时，' +
        '请从 rows 中找到对应的 id 再调用工具；只能调用工具列表中提供的操作。\n' +
        json,
    };
  }

  /**
   * 规范化 chat 端点，兼容用户填写的多种 apiEndpoint 形式：
   * 1) 完整路径（.../chat/completions）→ 原样使用；
   * 2) 带 /v1（.../v1）→ 追加 /chat/completions；
   * 3) 仅 baseURL（https://api.deepseek.com）→ 追加 /v1/chat/completions。
   * 先经 URL 解析剥离查询串与 hash，避免 base 带 ?query 时拼出畸形地址。
   * @param apiEndpoint 供应商配置中的 apiEndpoint（已通过 SSRF 校验，必为合法 URL）
   * @returns 可直接 POST 的 chat/completions 完整地址
   */
  private buildChatEndpoint(apiEndpoint: string, protocolType?: string): string {
    const url = new URL(apiEndpoint);
    // 仅在路径上做判断，丢弃查询串/hash（无需 query）
    const path = url.pathname.replace(/\/+$/, '');

    // Anthropic 原生：目标为 /v1/messages
    if (isAnthropicProtocol(protocolType)) {
      // 容错：若 endpoint 残留 OpenAI 风格的 /chat/completions 后缀（如从 openai-compatible
      // 切换协议但未同步改地址），剥离后再拼，避免拼出 .../chat/completions/v1/messages
      const base = path.replace(/\/chat\/completions$/, '');
      let msgPath: string;
      if (/\/messages$/.test(base)) msgPath = base;
      else if (/\/v\d+$/.test(base)) msgPath = `${base}/messages`;
      else msgPath = `${base}/v1/messages`;
      return `${url.origin}${msgPath}`;
    }

    // OpenAI 兼容：目标为 /v1/chat/completions
    let chatPath: string;
    if (/\/chat\/completions$/.test(path)) chatPath = path;
    else if (/\/v\d+$/.test(path)) chatPath = `${path}/chat/completions`;
    else chatPath = `${path}/v1/chat/completions`;
    return `${url.origin}${chatPath}`;
  }

  /**
   * 将 AG-UI 消息映射为 OpenAI 兼容格式，过滤空内容与非法角色。
   * @param messages 入参消息列表（不可信外部数据）
   * @returns 规范化后的 chat 消息
   */
  private mapMessages(
    messages?: Array<{
      role?: string;
      content?: string;
      toolCalls?: unknown;
      toolCallId?: string;
    }>,
  ): ChatMessage[] {
    const allowed = new Set(['system', 'user', 'assistant', 'tool']);
    const result: ChatMessage[] = [];
    for (const m of messages || []) {
      if (!m || !allowed.has(String(m.role))) continue;
      const role = String(m.role);
      const content = String(m.content ?? '');

      // tool 角色：工具执行结果，必须带 tool_call_id 关联对应调用
      if (role === 'tool') {
        if (!m.toolCallId) continue;
        result.push({ role, content, tool_call_id: String(m.toolCallId) });
        continue;
      }

      // assistant 携带工具调用：透传 tool_calls（回合续跑时模型需看到自己发起的调用）
      const rawCalls = Array.isArray(m.toolCalls) ? m.toolCalls : [];
      const toolCalls = rawCalls
        .map((c) => {
          const call = c as {
            id?: unknown;
            name?: unknown;
            argsText?: unknown;
          };
          if (typeof call?.id !== 'string' || typeof call?.name !== 'string') return null;
          return {
            id: call.id,
            type: 'function' as const,
            function: { name: call.name, arguments: String(call.argsText ?? '') || '{}' },
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

      if (role === 'assistant' && toolCalls.length) {
        result.push({ role, content, tool_calls: toolCalls });
        continue;
      }
      // 普通文本消息：空内容跳过（避免上游报错）
      if (content.trim()) result.push({ role, content });
    }
    return result;
  }

  /**
   * 以 OpenAI 兼容协议流式调用模型，逐块解析并转为 AG-UI 事件。
   * @param endpoint chat/completions 完整地址
   * @param apiKey 明文密钥（仅内存使用）
   * @param model 供应商侧模型 ID
   * @param messages 规范化消息
   * @param res 响应对象
   * @param signal 中断信号
   * @param aborted 中断判定
   */
  private async streamChat(
    endpoint: string,
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    tools: ChatTool[],
    chatParams: { temperature?: number; maxTokens?: number; topP?: number; retryCount?: number },
    res: Response,
    signal: AbortSignal,
    aborted: () => boolean,
    protocolType?: string,
  ): Promise<void> {
    const anthropic = isAnthropicProtocol(protocolType);
    // 按协议构造请求体：Anthropic 原生 vs OpenAI 兼容
    let body: Record<string, unknown>;
    if (anthropic) {
      body = buildAnthropicBody(model, messages, tools, chatParams);
    } else {
      // OpenAI 兼容：有工具时附带 tools 字段并允许模型自动选择
      body = { model, messages, stream: true };
      if (tools.length) {
        body.tools = tools;
        body.tool_choice = 'auto';
      }
      // 用户配置的对话参数（已在 sanitizeChatParams 校验夹取）：缺省则不下发，走模型默认
      if (chatParams.temperature !== undefined) body.temperature = chatParams.temperature;
      if (chatParams.maxTokens !== undefined) body.max_tokens = chatParams.maxTokens;
      if (chatParams.topP !== undefined) body.top_p = chatParams.topP;
    }

    // 建立连接（含重试）。重试只针对"流式开始前"的连接失败/网络异常——
    // 一旦开始消费流并向前端发事件，绝不重试（否则会重复输出内容）。
    const resp = await this.connectWithRetry(
      endpoint, apiKey, body, chatParams.retryCount ?? 0, signal, aborted, res, anthropic,
    );
    if (!resp) return; // 连接失败已发错误事件
    await this.consumeStream(resp.body!, res, aborted, anthropic);
  }

  /**
   * 建立到模型的流式连接，失败时按 retryCount 重试（仅连接阶段，未产生任何流事件）。
   * 4xx 鉴权类错误不重试（重试无意义）；网络异常与 5xx 才重试。
   * @returns 成功的响应；彻底失败返回 null（已发脱敏错误事件）
   */
  private async connectWithRetry(
    endpoint: string,
    apiKey: string,
    body: Record<string, unknown>,
    retryCount: number,
    signal: AbortSignal,
    aborted: () => boolean,
    res: Response,
    anthropic = false,
  ): Promise<globalThis.Response | null> {
    // 鉴权头：Anthropic 原生同时带 x-api-key 与 Authorization（兼容官方端点与各类中转站），
    // 并附带必需的 anthropic-version；OpenAI 兼容仅用 Bearer。
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };
    if (anthropic) {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    }
    // 重试次数夹到 [0,10]，总尝试次数 = 1 + retries
    const maxRetries = Math.min(Math.max(Number.isInteger(retryCount) ? retryCount : 0, 0), 10);
    let lastAuthError = false;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (aborted()) return null;
      try {
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal,
          redirect: 'manual',
        });
        if (resp.ok && resp.body) return resp;
        // 非 2xx：记录错误体（截断）便于定位；鉴权类不重试
        const detail = await resp.text().catch(() => '(无法读取错误体)');
        this.logger.warn(`ag-ui 模型返回异常状态：${resp.status} body=${detail.slice(0, 500)}`);
        lastAuthError = resp.status === 401 || resp.status === 403;
        if (lastAuthError) break; // 鉴权失败重试无意义
      } catch (e) {
        if (aborted()) return null;
        this.logger.warn(
          `ag-ui 模型请求失败（第 ${attempt + 1} 次）：${(e as Error)?.name || 'unknown'}`,
        );
      }
      // 还有重试机会则短暂退避后再试
      if (attempt < maxRetries && !aborted()) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
    this.emitError(
      res,
      aborted,
      lastAuthError ? '模型鉴权失败，请检查 API Key' : '模型服务返回异常，请稍后重试',
    );
    return null;
  }

  /**
   * 消费上游 SSE 流：按行切分，逐条 data 交给 handleChunk 处理。
   * 收尾统一关闭文本/推理消息，保证前端流式光标复位。
   * @param body 上游响应流
   * @param res 响应对象
   * @param aborted 中断判定
   */
  private async consumeStream(
    body: ReadableStream<Uint8Array>,
    res: Response,
    aborted: () => boolean,
    anthropic = false,
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    // 文本/推理消息各自的 messageId：首个增量到达时惰性创建并发 START
    const ids = { text: '', reasoning: '' };
    // 工具调用累加器：按上游 index 聚合分块到达的 id/name/arguments
    const toolCalls = new Map<number, ToolCallAccum>();
    // Anthropic 流状态复用同一 ids 对象，保证收尾能正确关闭消息
    const anthropicState = anthropic ? { ...createAnthropicState(), ids } : null;
    let buffer = '';

    try {
      while (!aborted()) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // 以换行切分，保留最后一段不完整行到下次
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line || !line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') return;
          if (anthropicState) {
            handleAnthropicChunk(
              data, (p) => this.genId(p), anthropicState, toolCalls, (e) => this.writeEvent(res, e),
            );
          } else {
            this.handleChunk(data, res, ids, toolCalls, aborted);
          }
        }
      }
    } finally {
      reader.cancel().catch(() => undefined);
      // 关闭已开启的消息，复位前端流式状态
      if (ids.reasoning && !aborted()) {
        this.writeEvent(res, { type: 'REASONING_MESSAGE_END', messageId: ids.reasoning });
      }
      if (ids.text && !aborted()) {
        this.writeEvent(res, { type: 'TEXT_MESSAGE_END', messageId: ids.text });
      }
      // 收尾发出所有工具调用的 END 事件，触发前端执行工具
      if (!aborted()) {
        emitToolCallEnds(toolCalls, (e) => this.writeEvent(res, e));
      }
    }
  }

  /**
   * 解析单条 OpenAI 兼容增量，产出 AG-UI 文本/推理事件。
   * 惰性发送 *_START：首个对应增量到达时才创建消息，避免空消息。
   * @param data data 行原始 JSON 字符串
   * @param res 响应对象
   * @param ids 文本/推理消息 ID 载体（原地维护）
   * @param aborted 中断判定
   */
  private handleChunk(
    data: string,
    res: Response,
    ids: { text: string; reasoning: string },
    toolCalls: Map<number, ToolCallAccum>,
    aborted: () => boolean,
  ): void {
    if (aborted()) return;
    let delta:
      | { content?: unknown; reasoning_content?: unknown; tool_calls?: unknown }
      | undefined;
    try {
      delta = JSON.parse(data)?.choices?.[0]?.delta;
    } catch {
      return; // 非法分块静默跳过，不中断整体流
    }
    if (!delta) return;

    // 工具调用增量 → TOOL_CALL_START/ARGS 事件（END 在流收尾统一发）
    if (Array.isArray(delta.tool_calls)) {
      handleToolCallDelta(delta.tool_calls, toolCalls, (e) => this.writeEvent(res, e));
    }

    // 深度思考增量（DeepSeek reasoning_content）→ REASONING_* 事件
    const reasoning = delta.reasoning_content;
    if (typeof reasoning === 'string' && reasoning) {
      if (!ids.reasoning) {
        ids.reasoning = this.genId('reason');
        this.writeEvent(res, { type: 'REASONING_MESSAGE_START', messageId: ids.reasoning });
      }
      this.writeEvent(res, {
        type: 'REASONING_MESSAGE_CONTENT',
        messageId: ids.reasoning,
        delta: reasoning,
      });
    }

    // 正式回答增量 → TEXT_MESSAGE_* 事件
    const content = delta.content;
    if (typeof content === 'string' && content) {
      // 思考结束、正文开始：先收束推理消息
      if (ids.reasoning) {
        this.writeEvent(res, { type: 'REASONING_MESSAGE_END', messageId: ids.reasoning });
        ids.reasoning = '';
      }
      if (!ids.text) {
        ids.text = this.genId('msg');
        this.writeEvent(res, {
          type: 'TEXT_MESSAGE_START',
          messageId: ids.text,
          role: 'assistant',
        });
      }
      this.writeEvent(res, {
        type: 'TEXT_MESSAGE_CONTENT',
        messageId: ids.text,
        delta: content,
      });
    }
  }
}
