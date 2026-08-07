# 可折叠智能体对话侧边栏 — 通用需求提示词

> 用法：给任意 Web 管理后台 / 前台项目右侧添加"AI 对话聊天"功能时，
> 直接把下方【提示词正文】整段复制粘贴给 AI 编码助手即可。
> 提示词不绑定具体技术栈，AI 会自动探测项目框架（Vue / React / Angular 等）与 UI 库后适配实现。
>
> **配套提示词（第 2-5 阶段）**：本文件是「侧边栏基础」。五份为一组、按顺序使用：
> 1. 本文件搭好侧边栏；
> 2. [`agent-chat-model-config-prompt.md`](./agent-chat-model-config-prompt.md) — 模型配置管理 + 模型选择；
> 3. [`agent-chat-agui-prompt.md`](./agent-chat-agui-prompt.md) — 接入 AG-UI 事件协议；
> 4. [`agent-chat-real-model-prompt.md`](./agent-chat-real-model-prompt.md) — 接入真实模型（把 Mock 换成真实大模型调用）；
> 5. [`agent-chat-rich-message-prompt.md`](./agent-chat-rich-message-prompt.md) — 结构化消息渲染（表格/ECharts 图表/GFM）+ 历史会话。

---

## 提示词正文（复制以下全部内容）

请在现有页面右侧实现一个"可折叠的智能体对话侧边栏"，只开发智能体对话功能，不修改左侧导航栏和中间业务页面的现有功能。请先探测本项目的前端框架、UI 组件库、状态管理方案、请求封装与目录规范，全部沿用项目既有约定，不引入与项目冲突的新模式；若需第三方依赖（如 Markdown 解析），优先用零依赖安全方案，确需引入时先说明。

一、整体布局
1. 对话框固定在页面最右侧，位于业务内容区右边（不是在左侧导航栏旁边）。
2. 整体从左到右：原有左侧导航栏 → 中间业务内容区 → 右侧智能体对话侧边栏。
3. 默认展开，宽度约 420~480px，随窗口宽度自适应。
4. 展开时占据正常布局空间，中间业务区自动缩小；禁止用悬浮层遮挡业务内容。
5. 收起时对话框隐藏，中间业务区向右扩展占满剩余空间。
6. 对话框左边缘设折叠按钮：展开显"向右收起"图标，收起显"向左展开"图标。
7. 收起后在页面右缘保留一个小型展开按钮，便于重新打开。
8. 展开/收起用 200~300ms 平滑宽度过渡动画。
9. 过程平滑自适应，不闪烁、不遮挡、不抖动。
10. 收起不清空聊天记录、输入框内容、附件和模型选择；重新展开恢复原状态。

二、对话框内部结构（从上到下三段）
1. 顶部标题区：显示当前智能体名称（如"问候开场"）；历史会话按钮；新建会话按钮（新建时创建新会话上下文）。
2. 中间消息区：独立可滚动消息列表；用户消息靠右、智能体消息靠左；支持 Markdown、代码块、表格、列表、图片、附件；新消息自动滚到底；生成时显示"正在思考"/加载态；支持流式输出；其滚动不影响中间业务页面滚动。
3. 底部输入区：多行文本输入框，占位文字"向智能体提问，@ 引用资产，可直接粘贴图片"；Enter 发送、Shift+Enter 换行；发送按钮；文件与图片上传入口；模型选择下拉框；生成中发送按钮切换为停止生成按钮；输入为空禁止发送。

<!-- PART_2 -->

三、组件状态（至少维护）
- isAgentPanelOpen：对话框展开/收起
- messages：当前会话消息列表
- inputValue：当前输入内容
- isGenerating：是否正在生成
- selectedModel：当前模型
- currentConversationId：当前会话 ID
- attachments：当前待发送附件

以下状态持久化到 localStorage：对话框展开/收起状态、当前模型、未发送的输入内容、对话框宽度。
（消息记录不落盘，刷新后经接口重新拉取。）

四、组件设计（拆分为独立组件）
- AgentChatPanel（右侧布局容器，不与业务页面耦合）
- AgentChatHeader、AgentMessageList、AgentMessageItem、AgentChatInput、AgentPanelToggle

整体结构建议：
  <AppLayout>
    <LeftNavigation />
    <MainContent />
    <AgentChatPanel />
  </AppLayout>

用 Flex 或 Grid 实现三栏：左侧导航保持原宽；中间业务区 flex:1 且 min-width:0（避免表格撑破布局）；右侧展开时用固定宽度、收起时宽度为 0。

五、接口预留（封装到独立 service 文件，禁止在组件内写死请求）
- createConversation()
- loadConversationList()
- loadConversationMessages(conversationId)
- sendMessage(message, model, attachments) —— 支持流式输出，返回可中断的控制器
- stopGeneration()
- uploadAttachment(file)
后端接口不存在时用 mock 数据，但调用必须封装在 service 层。

六、响应式
- 大屏：宽度 420~480px，与业务区并排。
- 中屏：宽度可缩到 360~400px，业务区保持最小可用宽度。
- 小屏：改为从右侧滑出的抽屉，可覆盖业务内容，增加遮罩层和关闭按钮。

七、验收要点
- 初始对话框在页面最右侧，左侧导航位置不变，业务页面在对话框左侧。
- 点左边缘向右箭头 → 平滑收起，业务区扩大，页面右缘保留向左展开按钮；点它 → 从右侧恢复。
- 收起/展开不丢失聊天记录、输入内容、模型状态。
- 消息区独立滚动。
- 不修改原有资源列表、数据库列表及其他业务逻辑。
- 特别注意：对话框必须在页面最右侧，折叠时向右收起、展开时从右侧向左展开。

质量要求：写完调用代码审查（重点 Markdown 渲染 XSS、流式定时器泄漏、切换会话竞态）；完成前跑构建与类型检查确认通过。

---

## 参考实现（本仓库 frontend 已落地，可作为范例）

| 部分 | 位置 |
|------|------|
| 布局容器 + 子组件 | `frontend/src/components/core/layouts/art-agent-chat/` |
| 逻辑编排 composable | `.../art-agent-chat/composables/useAgentChat.ts` |
| 状态 store（persist 白名单） | `frontend/src/store/modules/agentChat.ts` |
| service 层（含流式契约） | `frontend/src/api/agent.ts` |
| mock（含流式模拟） | `frontend/src/mock/agent.ts` |
| 安全 Markdown 渲染器（零依赖） | `frontend/src/utils/markdown/renderMarkdown.ts` |
| 三栏集成 | `frontend/src/views/index/index.vue` |

### 落地关键决策（复用时参考）
- 三栏用 flex：中间区 `flex:1; min-width:0`，右侧面板 `flex-shrink:0` + 受控 width，收起时 width→0，天然推挤不遮挡。
- 顶栏型布局（侧栏 fixed + 主区 margin）下，面板改 `position:fixed` 靠右，主区加 `margin-right` 让位。
- 宽度/margin 过渡会触发重排——这是"推挤且不遮挡"需求的必然取舍，不能用 transform 替代；小屏抽屉才用 transform 动画。
- Markdown 先全文 HTML 转义再白名单拼标签；链接/图片 URL 先剔除 `\t\n\r` 再校验协议白名单（防 `java\tscript:` 绕过），`data:image` 排除 svg。
- 流式用可中断控制器（AbortController）；切换会话、新建会话、组件卸载时都要先中断，避免竞态与定时器泄漏。
