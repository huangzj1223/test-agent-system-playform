# 智能体对话侧边栏 — AG-UI 协议集成提示词

> 用法：在「可折叠智能体对话侧边栏 + 模型配置」已落地的项目上，把右侧聊天框正式接入
> [AG-UI 协议](https://github.com/ag-ui-protocol/ag-ui) 时，直接把下方【提示词正文】整段复制粘贴给 AI 编码助手即可。
> 提示词不绑定具体技术栈，AI 会自动探测项目框架与 UI 库后适配实现。
>
> **前置依赖（第 1、2 阶段）**：本文件是第 3 阶段扩展，需先完成同目录
> [`agent-chat-sidebar-prompt.md`](./agent-chat-sidebar-prompt.md)（侧边栏基础）与
> [`agent-chat-model-config-prompt.md`](./agent-chat-model-config-prompt.md)（模型配置与选择）。
> 五份为一组、按顺序使用：侧边栏 → 模型配置 → AG-UI 协议 → 真实模型 → 结构化消息渲染。
>
> **后续（第 4、5 阶段）**：本阶段完成后后端通常是 Mock 事件链，先把 Mock 换成真实大模型调用
> [`agent-chat-real-model-prompt.md`](./agent-chat-real-model-prompt.md)，再让消息支持表格/图表渲染与历史会话
> [`agent-chat-rich-message-prompt.md`](./agent-chat-rich-message-prompt.md)。
>
> **重要**：AG-UI 是 Agent 与前端之间的事件通信协议，不是一套可直接替换页面的聊天 UI。
> 本阶段在现有聊天框基础上重构，不新建独立聊天页面、不用 iframe、不嵌 React/CopilotKit。

---

## 提示词正文（复制以下全部内容）

请不要把当前右侧聊天框实现成普通的大模型问答组件。请在现有右侧聊天框中正式集成 AG-UI 协议（https://github.com/ag-ui-protocol/ag-ui）。

注意：AG-UI 是 Agent 与前端之间的事件通信协议，不是一套可以直接替换当前页面的聊天 UI。本次需完成两部分：1）将现有聊天请求改造成 AG-UI 协议客户端；2）在现有 Vue/Nuxt 右侧聊天框中，实现 AG-UI 事件对应的可视化交互。

不要创建独立演示项目，不要通过 iframe 嵌入 AG-UI 示例，不要把整个 AG-UI 仓库复制进当前项目，也不要把 React 或 CopilotKit 强行嵌入当前 Vue 项目。

请先阅读当前项目的：package.json、Nuxt/Vue 配置、右侧聊天框组件、聊天请求服务、模型配置管理代码、Pinia 或其他状态管理、后端 API 目录。然后阅读 AG-UI 官方仓库和当前版本文档，严格按照当前实际版本的 API 实现，不要凭记忆编写已过期的调用方式。

一、当前问题

当前右侧聊天框：只是把模型返回文本直接放到白色卡片中；没有区分用户/智能体消息；没有 AG-UI 运行状态、工具调用过程、步骤执行、Agent 状态同步、停止/重试/错误恢复；没有真正使用 AG-UI 标准事件；Markdown 表格和代码块直接堆叠，不适合窄侧栏；页面上出现了演示性固定内容。请保留聊天框现有位置、宽度、展开收起能力，对聊天内容区重构。删除"收到你的问题""用于验证 Markdown 渲染"等演示内容，不再展示能力测试表格；页面上不能出现原始 AG-UI Event JSON 或调试数据。

二、安装和使用 AG-UI SDK

根据当前包管理器安装官方包：@ag-ui/client、@ag-ui/core。优先使用官方 HttpAgent，不要自己重新发明一套同名协议。前端通过统一 AG-UI Endpoint 连接后端（例如 POST /api/ag-ui），后端响应类型必须为 text/event-stream。前端不要直接请求 OpenAI/Anthropic/DeepSeek 等模型接口，不要获取或保存真实 API Key。

三、前端架构

按当前真实目录结构调整，建议拆分：
- components/ai-chat/：AiChatPanel、AiChatHeader、AiMessageList、AiMessageItem、AiMessageInput、AiToolCallCard、AiRunSteps、AiReasoningBlock、AiActivityCard、AiErrorCard、ModelSelector
- composables/：useAgUiAgent、useChatAutoScroll
- services/：agUiClient
- stores/：aiChat
- types/：aiChat
- utils/：agUiEventReducer、markdown

不要把 HttpAgent、事件处理、Markdown 渲染、工具调用和所有 UI 都写在一个 Vue 文件中。

四、AG-UI 客户端封装

创建统一的 agUiClient 服务，使用官方 HttpAgent 连接 /api/ag-ui。客户端至少支持：runAgent、subscribe、abortRun、messages、state、threadId、runId、tools、context、forwardedProps。

实现以下状态：idle（空闲）、connecting（正在建立连接）、running（Agent 运行）、streaming（接收文本）、waiting-tool（等待工具执行）、interrupted（等待用户确认/补充）、completed（完成）、aborted（用户停止）、error（失败）。

用户点击发送时：把用户消息加入列表 → 生成或复用 threadId → 创建新 runId → 调用 HttpAgent.runAgent → 监听 AG-UI 事件 → 实时更新页面 → 运行结束恢复输入状态。用户点击"停止生成"时调用 agent.abortRun()，停止后保留已生成内容，不清空本轮消息。

五、标准事件处理

实现统一的 agUiEventReducer，不要在 Vue 模板中到处写事件判断。至少处理：
- 运行生命周期：RUN_STARTED、RUN_FINISHED、RUN_ERROR
- 文本消息：TEXT_MESSAGE_START、TEXT_MESSAGE_CONTENT、TEXT_MESSAGE_END
- 工具调用：TOOL_CALL_START、TOOL_CALL_ARGS、TOOL_CALL_END、TOOL_CALL_RESULT
- 步骤执行：STEP_STARTED、STEP_FINISHED
- 状态同步：STATE_SNAPSHOT、STATE_DELTA、MESSAGES_SNAPSHOT
- 活动信息：ACTIVITY_SNAPSHOT、ACTIVITY_DELTA
- 推理信息：REASONING_START、REASONING_MESSAGE_START、REASONING_MESSAGE_CONTENT、REASONING_MESSAGE_END、REASONING_END
- 扩展事件：CUSTOM、RAW

事件处理要求：TEXT_MESSAGE_CONTENT 按 messageId 追加 delta，不每片新建消息；TOOL_CALL_ARGS 按 toolCallId 拼接参数；TOOL_CALL_RESULT 与对应 toolCallId 关联；STATE_DELTA 按 AG-UI 规范（JSON Patch）合并到当前 state；STEP_STARTED/FINISHED 更新步骤状态；RUN_ERROR 生成可重试错误卡片；未识别事件只记录到开发调试日志，不展示原始 JSON；组件销毁时取消订阅并清理未完成请求；避免重复订阅导致同段内容被追加多次。

六、聊天框视觉重构（窄侧栏专用，不要用桌面宽屏布局）

1. 用户消息：靠右、系统主色浅色气泡、最大宽度约 85%、支持复制、显示发送失败与重发。
2. 智能体消息：靠左、显示头像与名称、正文透明背景或弱边框（不要厚重大白卡）、支持流式光标、完成后显示复制/重新生成。
3. Markdown：继续支持标题/列表/加粗/引用/行内代码/代码块/表格/链接；窄栏优化——表格与代码块横向滚动、长链接换行、代码块提供复制、正文不撑破面板、不导致整页横向滚动。
4. 工具调用：用可折叠工具卡片展示（名称、状态、参数摘要、结果摘要、耗时、展开详情），状态含准备调用/参数生成中/执行中/成功/失败，默认折叠详细参数。不能显示为普通聊天文本。
5. Agent 执行步骤：轻量步骤区（如 正在理解问题/检索数据/调用工具/整理结果/已完成），STEP_STARTED 显示加载态、STEP_FINISHED 显示完成态；不伪造步骤，只有后端实际返回步骤事件时才显示。
6. 推理信息：REASONING 显示为默认折叠的"分析过程"，只渲染后端明确返回的可展示内容，不展示未允许的私有思维链。
7. 错误状态：错误卡片展示（请求失败/连接中断/鉴权失败/超时/限流/Agent 失败），提供重试与复制错误信息；不暴露完整 API Key、Authorization Header、堆栈敏感信息。

七、输入区域

固定在聊天框底部，包含多行输入框、发送按钮、停止生成按钮、（项目支持时保留）附件入口与 @ 引用入口、模型选择器。交互：Enter 发送、Shift+Enter 换行；无内容禁止发送；运行时发送按钮切换为停止；运行期间默认不允许切换模型；内容滚动时输入区固定；输入框高度自增长但设最大高度。

八、模型配置与 AG-UI 的关系

保留现有模型配置管理页面与底部模型选择器。选择模型后，前端只向 AG-UI 后端传递 providerConfigId、modelId、agentId（建议通过 forwardedProps）。严禁把 API Key、数据库密码、服务端令牌、供应商密钥放入 forwardedProps 或发送到浏览器。后端根据 providerConfigId 查询真实配置和密钥再调模型。若当前把 API Key 存在 localStorage，请调整：原型页面显示"已配置"状态，真实 Key 由后端加密保存，浏览器只保存配置 ID 与模型 ID，接口返回对密钥脱敏。

九、后端 AG-UI Endpoint

检查当前后端是否兼容 AG-UI，没有则新增统一适配接口 POST /api/ag-ui。接口接收标准 RunAgentInput（至少 threadId、runId、state、messages、tools、context、forwardedProps），以 SSE 依次输出 AG-UI 标准事件。

- 普通文字回答最小序列：RUN_STARTED → TEXT_MESSAGE_START → 多个 TEXT_MESSAGE_CONTENT → TEXT_MESSAGE_END → RUN_FINISHED。
- 失败：RUN_STARTED → RUN_ERROR。
- 工具调用：TOOL_CALL_START → 多个 TOOL_CALL_ARGS → TOOL_CALL_END → TOOL_CALL_RESULT。

后端需要：监听客户端断开；abort 后停止模型生成；正确关闭 SSE；设置合理超时；禁止缓存 SSE；对错误信息脱敏，不把供应商原始错误完整暴露给前端。若暂不能接入真实 Agent，请实现 Mock AG-UI Endpoint 验证完整事件链——Mock 不能只返回一段完整文本，必须真实模拟：文本流式输出、步骤开始/结束、工具调用、工具执行结果、状态更新、运行完成、运行错误。

十、前端工具能力

建立前端工具注册机制（如 frontendToolRegistry），工具定义含 name、description、parameters、handler、confirmationRequired。先提供一个安全的演示工具，如 get_current_page_context（获取当前路由/页面名称/当前模块/选中数据）。不要实现任意 JavaScript 执行、任意接口请求或任意 DOM 操作。涉及新增/删除/修改业务数据的工具，必须先弹出用户确认。

十一、状态和会话

用 Pinia 或现有状态管理维护：threadId、runId、消息列表、Agent state、工具调用列表、步骤列表、当前运行状态、当前模型、错误状态。要求：收起再展开聊天框记录不消失；切换业务页面按现有产品逻辑决定是否保留会话；同一 threadId 保持连续上下文；新建会话生成新 threadId；刷新后的持久化逻辑单独封装；不把 API Key 存入聊天状态。

十二、自动滚动

用户位于底部时流式生成自动跟随；用户上滑查看历史时不强制拉回，此时显示"回到底部"按钮，点击恢复跟随；新消息完成后不产生明显页面跳动。

十三、不要做的事情

不要创建另一个独立聊天页面；不要用 iframe；不要把 AG-UI 示例项目整体复制进来；不要在 Vue 项目中额外嵌入 React 应用；不要只修改聊天框颜色和 CSS；不要继续用普通 fetch 解析模型纯文本代替 AG-UI；不要把原始 SSE 字符串直接渲染到页面；不要把工具事件当作 Markdown 文本；不要伪造 Agent 步骤；不要在前端保存真实模型 API Key；不要影响左侧菜单、中间业务页面和部门管理表格；不要改变右侧聊天栏已有的展开和收起机制。

十四、验收场景

请提供可运行的 Mock 或真实 Agent，逐项验证：
1. 普通流式回答：发送"你好"→ 用户气泡 → Agent 逐字流式 → 完成后恢复。
2. Markdown：标题/列表/代码块/表格正确渲染，且不撑破侧栏。
3. 工具调用：工具卡片 → 参数逐步生成 → 状态由执行中变成功 → 展示结果。
4. 步骤执行：步骤开始 → 完成，状态正确更新。
5. 停止生成：流式中点击停止 → 请求取消 → 已生成内容保留 → 可继续发送。
6. 错误重试：模拟 RUN_ERROR → 错误卡片 → 点击重试重新运行。
7. 模型切换：底部选其他模型 → 下一次 run 的 forwardedProps 含新模型 ID、不发送 API Key、聊天记录保留。

十五、实施顺序

第一步：分析当前项目并列出技术栈、聊天组件文件、聊天请求调用链、模型配置存储位置、后端服务位置、计划修改文件。
第二步：先实现 AG-UI Mock Endpoint 和前端 HttpAgent 连接，打通最小事件链。
第三步：实现统一事件 reducer 和 Pinia 状态。
第四步：重构聊天消息、工具卡片、步骤卡片、错误卡片。
第五步：接入现有模型选择器。
第六步：接入真实后端 Agent 或现有模型服务。
第七步：运行并修复 lint、type-check、build 及相关测试。

完成后输出：修改文件清单、新增依赖、前后端调用链、已支持的 AG-UI 事件、暂未支持的事件、Mock 验证方式、真实 Agent 接入方式、安全注意事项。

请在分析当前项目后直接完成代码修改，不要只给方案。前端接 @ag-ui/client，后端输出 AG-UI 事件流，Vue 组件只负责把事件渲染成合适的界面。AG-UI 的文本、工具、状态和运行生命周期都有独立事件类型，不能只把模型返回内容当作一段 Markdown。

---

## 参考实现（本仓库 frontend + server 已落地，可作为范例）

使用官方 `@ag-ui/client@0.0.57` + `@ag-ui/core@0.0.57`（框架无关，RxJS + Zod，可直接用于 Vue，无需 React）。在前两阶段基础上，本阶段落地的文件如下：

**前端**
| 部分 | 位置 |
|------|------|
| 规范化视图类型 | `frontend/src/types/aiChat.ts` |
| 事件归约器（唯一事件判断处，防原型污染的 JSON Patch 合并） | `frontend/src/utils/agui/agUiEventReducer.ts` |
| HttpAgent 封装（runAgent/subscribe/abortRun，注入 mock fetch） | `frontend/src/services/agUiClient.ts` |
| 前端工具注册（get_current_page_context） | `frontend/src/services/frontendToolRegistry.ts` |
| Mock SSE 服务（仅 VITE_USE_MOCK） | `frontend/src/mock/agUiServer.ts` |
| 会话 store（threadId/runId/消息/state/工具/步骤/推理/状态/错误） | `frontend/src/store/modules/aiChat.ts` |
| 编排 composable（发送/停止/重试/新建） | `.../art-agent-chat/composables/useAgUiAgent.ts` |
| 自动滚动 + 回到底部 | `.../composables/useChatAutoScroll.ts` |
| 窄侧栏可视化组件 | `.../widget/ai-chat/AiMessageList / AiMessageItem / AiToolCallCard / AiRunSteps / AiReasoningBlock / AiErrorCard.vue` |
| 面板接线 / 齿轮入口 / 无模型禁发 | `.../art-agent-chat/index.vue`、`AgentChatHeader.vue`、`AgentChatInput.vue` |

**后端（NestJS）**
| 部分 | 位置 |
|------|------|
| AG-UI 模块（module-loader 自动发现） | `server/src/modules/ag-ui/ag-ui.module.ts` |
| @Public POST /api/ag-ui（@Res 直写 SSE，绕过响应包装拦截器） | `server/src/modules/ag-ui/controllers/ag-ui.controller.ts` |
| SSE 事件流 + Mock 事件链 | `server/src/modules/ag-ui/services/ag-ui.service.ts` |
| RunAgentInput DTO | `server/src/modules/ag-ui/dto/run-agent-input.dto.ts` |

### 落地关键决策（复用时参考）

- **SDK 版本务实核对**：AG-UI 处于 0.0.x（协议仍在演进），务必按当前实际版本核对 API——`HttpAgent({url,threadId,fetch})`、`runAgent({runId,forwardedProps,abortController}, subscriber)` 返回 Promise、`agent.subscribe(sub)` 返回 `{unsubscribe}`、`abortRun():void`、`AgentSubscriber.onEvent({event})`。不要凭记忆写过期签名。
- **Mock 走客户端 fetch 注入**：HttpAgent 用自己的 fetch，绕过项目 axios mock。Mock 模式给 HttpAgent 注入返回 SSE `ReadableStream` 的 fetch，无需后端即可跑通完整事件链；关闭 mock 即走真实 `/api/ag-ui`，组件无需改动。
- **事件归约集中化**：所有事件判断只在 `agUiEventReducer` 内，按类别拆分为多个处理器（生命周期/文本/工具/步骤/状态/推理），组件只消费归约后的规范化状态，模板不写事件分支。
- **SSE 与后端拦截器**：Endpoint 用 `@Res()` 直写、`@Public` 跳过鉴权，绕过全局响应包装拦截器；SSE 头禁缓存与代理缓冲（`X-Accel-Buffering: no`）；监听 `res.on('close')` 感知 abort、设兜底超时、`res.end()` 收尾。
- **密钥零暴露**：前端只经 `forwardedProps` 传 `providerConfigId/modelId/agentId`；后端按 ID 解析真实密钥；错误统一脱敏（不透传供应商原始错误/堆栈）；页面绝不渲染原始 Event JSON（未识别事件仅 DEV `console.debug`）。
- **安全防线**：`STATE_DELTA` 的 JSON Patch 合并拦截 `__proto__/constructor/prototype` 并只沿自身属性下钻，防原型链污染（真实 Agent 回填内容可能含模型生成数据）。
- **停止即净化**：abort 后显式把 `messages[].streaming` / `reasoning[].streaming` 置 false，避免流式光标残留。
- **待办（真实接入前）**：`@Public /api/ag-ui` 需补鉴权/限流（真实模型调用产生费用）；前端工具执行闭环（监听 `TOOL_CALL_END` → 执行工具 → 新 run 回传结果）尚未接线，已在注册表注释标注。




