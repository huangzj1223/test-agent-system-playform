# 智能体对话侧边栏 — 接入真实模型提示词（第 4 阶段）

> 用法：在「侧边栏 + 模型配置 + AG-UI 协议」三阶段已落地、但后端仍是 Mock 事件链的项目上，
> 把右侧聊天框正式接入**真实大模型**（DeepSeek / OpenAI / 任意 OpenAI 兼容供应商）时，
> 直接把下方【提示词正文】整段复制粘贴给 AI 编码助手即可。
> 提示词不绑定具体技术栈，AI 会自动探测项目框架与 UI 库后适配实现。
>
> **前置依赖（第 1、2、3 阶段）**：本文件是第 4 阶段扩展，需先完成同目录
> [`agent-chat-sidebar-prompt.md`](./agent-chat-sidebar-prompt.md)（侧边栏基础）、
> [`agent-chat-model-config-prompt.md`](./agent-chat-model-config-prompt.md)（模型配置与选择）、
> [`agent-chat-agui-prompt.md`](./agent-chat-agui-prompt.md)（接入 AG-UI 事件协议）。
> 五份为一组、按顺序使用：侧边栏 → 模型配置 → AG-UI 协议 → 真实模型 → 结构化消息渲染。
>
> **后续（第 5 阶段）**：接通真实模型后，如需让消息展示表格 / ECharts 图表 / GFM Markdown
> 并补齐历史会话，见同目录 [`agent-chat-rich-message-prompt.md`](./agent-chat-rich-message-prompt.md)。
>
> **重要**：第 3 阶段完成后，后端 `/api/ag-ui` 通常是 **Mock 事件链**（返回写死文案，
> 不管用户问什么都回同一句），前端也可能存在**事件被重复应用**的 bug。本阶段专治这两点：
> 让对话真正走通用户配置的模型，并修掉流式文本重复拼接。

---

## 提示词正文（复制以下全部内容）

请把当前右侧 AG-UI 聊天框从「Mock 事件链」升级为「调用用户实际配置的真实大模型」，并修复流式文本重复拼接问题。请先阅读当前项目：后端 AG-UI 模块（controller/service/dto）、前端 AG-UI 客户端封装、事件订阅编排代码（composable）、模型配置存储位置（数据库还是 localStorage）、模型配置 store，再动手。不要新建独立聊天页面、不要改动已落地的侧边栏/事件协议结构，只把「假数据」换成「真实模型调用」。

一、先定位两类典型问题（务必先确认再改）

1. **后端是 Mock**：AG-UI service 里通常有个 `runMock` / 固定文案分支，收到请求后忽略用户选的模型，直接返回写死的 `TEXT_MESSAGE_CONTENT`（如"你好，我是接入 AG-UI 协议的智能体…"）。表现：问什么都回同一句。
2. **前端事件重复应用**：若编排代码里既 `agent.subscribe(subscriber)` 手动注册了一次订阅，又把**同一个 subscriber** 传进了 `agent.runAgent(params, subscriber)`，官方 HttpAgent 会把它叠加进订阅列表两次，导致每个 `TEXT_MESSAGE_CONTENT` 增量被归约器应用两遍——表现为"你好你好"、"AG-UIAG-UI" 这种逐段翻倍。

二、先做关键决策：模型配置怎么打通（必须先想清楚，两套系统常并存）

很多项目里模型配置有**两套互不相通**的系统：
- **后端系统**：数据库表 + API Key 加密存储 + `/admin/model-config` 接口，设计原则是"密钥只在服务端，前端只传 ID"。
- **前端系统**：模型配置（含 API Key）明文存在浏览器 localStorage（原型阶段常见）。

请先确认前端实际用的是哪套、数据库表里有没有数据。据此二选一：

- **方案 A（正规·密钥只在服务端）**：前端改为调后端 `/admin/model-config` 接口把配置持久化到数据库，Key 服务端加密，`forwardedProps` 只传 `providerConfigId/modelId`，后端按 ID 解密取用。安全，但前端改动大（存储层 + 类型 + 选择器都要改成真实数字 ID）。
- **方案 B（原型·前端每次带配置）**：前端把 `apiEndpoint/apiKey/modelId/protocolType` 随 `forwardedProps` 传给后端，后端不落库、直连模型。改动小、立即可用，适合原型阶段（Key 本来就明文存浏览器）。**代价**：apiKey 会经请求传到后端，放弃"密钥只在服务端"，须在代码注释里标注这是原型边界、生产须改回方案 A。

请把两方案的取舍讲清楚，让用户选定后再实现。下面步骤以方案 B 为默认示例，方案 A 只是把"从 forwardedProps 读配置"换成"按 providerConfigId 查库解密"。

三、后端改造：用真实流式调用替换 Mock（保留 AG-UI 事件协议不变）

保留 `handleRun` 的 SSE 骨架（响应头、abort 监听、超时、finally 收尾、脱敏错误），只把内部的 `runMock` 换成真实模型调用 `runModel`：

1. **取配置**：从 `forwardedProps` 读 `modelId/apiEndpoint/apiKey`（方案 A 则用 `providerConfigId` 查库解密）。任一为空 → 发**明确的** `RUN_ERROR`（如"请先在模型配置中填写完整的模型与 API Key"），不再返回占位文案。
2. **SSRF 校验**：调用前必须对 `apiEndpoint` 做安全校验（复用项目已有的 `assertSafePublicUrl` 之类工具），拒绝环回/私有/链路本地/云元数据地址；失败回脱敏提示"模型服务地址不可用"。
3. **端点规范化**：兼容用户填 base（`https://api.deepseek.com`）/ 带 `/v1` / 带完整 `/chat/completions` 三种写法。**用 `new URL()` 解析后只取 `origin + pathname`，丢弃查询串/hash**，再按需补 `/v1/chat/completions`，避免 base 带 `?query` 时拼出畸形地址。
4. **消息映射**：把 AG-UI `messages` 映射为 OpenAI 格式，用角色白名单（system/user/assistant）+ 强制字符串化过滤不可信外部输入，空内容跳过；映射后为空 → 回"消息内容为空"。
5. **流式调用**：`fetch(endpoint, { method:'POST', headers:{Authorization:Bearer <key>}, body: JSON.stringify({model, messages, stream:true}), signal, redirect:'manual' })`。Node 18+ 原生支持 fetch 与流式 body，无需额外 HTTP 库。`!resp.ok` 时按状态分流：401/403 → "模型鉴权失败，请检查 API Key"，其余 → "模型服务返回异常"。
6. **SSE 流解析**：读 `resp.body` 的 reader，`TextDecoder({stream:true})` 处理跨块多字节字符，按 `\n` 切分并**保留末尾不完整行到下次拼接**；对每行 `data:` 取 JSON，遇 `[DONE]` 结束，`JSON.parse` 失败静默跳过（不中断整体流）。
7. **转 AG-UI 事件**：`choices[0].delta.content` → 惰性发 `TEXT_MESSAGE_START`（首个增量到达才创建，避免空消息）后逐段发 `TEXT_MESSAGE_CONTENT`；`delta.reasoning_content`（DeepSeek 深度思考）→ 发 `REASONING_MESSAGE_*` 事件；正文开始时先收束推理消息。收尾在 `finally` 里补 `*_MESSAGE_END` 复位前端流式光标。
8. **安全铁律**：`apiKey` 只在内存用，**绝不进日志/响应**——日志只打 `providerConfigId/modelId`、`Error.name`、HTTP 状态码；所有回客户端的 `RUN_ERROR` 都用预设脱敏文案，不透传供应商原始错误体。用 `Logger` 不用 `console.log`；私有方法拆分到 ≤80 行、单文件 ≤500 行。

四、前端修复：消除事件重复应用

订阅只注册一次。二选一：保留 `agent.subscribe(subscriber)` 手动注册（便于 abort 时精确 `unsubscribe`），则 `runAgent` 调用**不要再传 subscriber**；对应地把客户端封装里 `agent.runAgent(params, subscriber)` 改成 `agent.runAgent(params)`，并清理由此产生的未使用 import。方案 B 下同时扩展前端传参：把模型上下文类型补上 `apiEndpoint/apiKey/protocolType`，从模型 store 已有的"构造请求参数"方法（含 endpoint/key）取值，放进 `forwardedProps`。

五、验收（必须实测，不接受"应该没问题"）

1. 后端类型检查通过（`tsc --noEmit`）、前端类型检查通过。
2. **缺配置**：`forwardedProps` 空 → 收到明确 `RUN_ERROR` 提示，而非旧的固定文案（证明 Mock 已被替换）。
3. **真调模型**：真实供应商 endpoint + 故意写错的假 Key → 收到"鉴权失败"（证明真的连上了供应商拿到 401，而非返回假回答）。
4. **SSRF**：`apiEndpoint` 填内网地址（如 `http://127.0.0.1`）→ 被拒。
5. **端到端**：填真实 Key → 逐字流式返回真实回答、无重复拼接。
6. 写完调用代码审查（重点：SSRF/DNS rebinding、密钥泄漏、SSE 解析健壮性、中断与资源清理）。

请在分析当前项目后直接完成代码修改，不要只给方案。改动应集中在 AG-UI 后端 service（核心）+ module + dto，以及前端客户端封装 + 编排 composable + 类型，不动数据库结构、鉴权、加密逻辑。

---

## 参考实现（本仓库 server + frontend 已落地，可作为范例）

本阶段采用**方案 B**（前端随请求携带配置，后端直连模型），改动集中在以下文件：

**后端（NestJS）**
| 部分 | 位置 |
|------|------|
| 真实流式调用（handleRun 骨架不变，runModel 替换 runMock；端点规范化 / 消息映射 / streamChat / consumeStream / handleChunk） | `server/src/modules/ag-ui/services/ag-ui.service.ts` |
| 模块定义（方案 B 无需依赖 ModelConfigModule） | `server/src/modules/ag-ui/ag-ui.module.ts` |
| RunAgentInput DTO（forwardedProps 注释更新为携带配置） | `server/src/modules/ag-ui/dto/run-agent-input.dto.ts` |
| 复用的 SSRF 防护工具 | `server/src/common/utils/url-guard.util.ts` |

**前端（Vue）**
| 部分 | 位置 |
|------|------|
| HttpAgent 封装（runAgent 去掉重复 subscriber，forwardedProps 携带 endpoint/apiKey/protocolType） | `frontend/src/services/agUiClient.ts` |
| 编排 composable（订阅只注册一次；resolveModelContext 复用 store 的 buildChatParams 取完整配置） | `.../art-agent-chat/composables/useAgUiAgent.ts` |
| 模型上下文类型（补 apiEndpoint/apiKey/protocolType 字段） | `frontend/src/types/aiChat.ts` |

### 落地关键决策（复用时参考）

- **两个 bug 常叠加**：后端 Mock（返回固定文案）+ 前端重复订阅（delta 翻倍）。定位时分别验证：问不同问题回不回同一句（Mock）、单段文字是否成对重复（重复订阅）。
- **重复订阅的根因**：官方 `AbstractAgent.runAgent(params?, subscriber?)` 会把传入的 subscriber 追加进订阅列表；若已 `agent.subscribe()` 过同一个，就会双发。修法是二选一注册，不要两处都注册同一 subscriber。
- **方案 A vs B 是架构岔路，必须让用户定**：数据库空表 + 前端 localStorage 配置是常见现状；方案 B 快但 apiKey 随请求走，务必在代码注释标注原型边界，别默默把密钥暴露面扩大。
- **端点规范化用 URL 解析**：不要用字符串正则直接拼，`https://x/v1?a=1` 这类带查询串会拼出畸形地址；先 `new URL()` 取 `origin+pathname` 再补路径。
- **SSE 解析三要点**：`TextDecoder({stream:true})` 防多字节字符截断；按行切分保留末尾残行；`JSON.parse` 失败静默跳过防单块坏数据中断整流。
- **惰性发 START**：首个 content/reasoning 增量到达时才发 `*_MESSAGE_START`，避免空消息气泡；正文开始前先收束 reasoning。
- **密钥零泄漏自查**：日志只打 ID/Error.name/HTTP 状态；错误全用预设脱敏文案；不透传供应商原始错误体。
- **Node 原生 fetch 够用**：Node 18+ 原生 fetch 支持流式 body 与 AbortSignal，无需引 axios/undici；`redirect:'manual'` 防校验通过后被 3xx 跳转到内网。
- **待办（生产前加固）**：① SSRF 校验与真实请求之间存在 DNS rebinding TOCTOU 窗口（`url-guard` 的架构限制），生产建议校验后复用已解析 IP 直连；② `@Public /api/ag-ui` 缺鉴权/限流，真实模型调用产生费用且长连接易被滥用，须补限流；③ 方案 B 的 apiKey 传输须在上线前迁回方案 A（后端加密存储）。


