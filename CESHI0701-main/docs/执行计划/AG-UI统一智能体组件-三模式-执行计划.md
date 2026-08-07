# AG-UI 统一智能体组件 · 三种展示模式 · 执行计划

> **版本**：v1.0　|　**创建**：2026-07-09　|　**状态**：待执行
> **用途**：本文件是「AG-UI 智能体统一交互组件（停靠 / 悬浮 / 全屏 三模式）」开发的唯一执行依据与进度台账。
> 每完成一个任务就勾选对应复选框并更新「§9 进度追踪总表」。中断后按「§11 中断恢复指引」定位未完成任务继续。

---

## 1. 背景与结论（务必先读）

**关键事实**：本项目的「智能体」不是空壳。以下能力**已真实存在并可运行**，本次开发是「在其之上增加三种展示模式的外壳」，**不是从零重写、不是 mock**：

- 停靠态面板本体：`components/core/layouts/art-agent-chat/index.vue`（右侧第三栏，含左边缘**折叠按钮**、移动端抽屉）
  - ⚠️ 注意：现有左边缘 `AgentPanelToggle` 只是折叠/展开**按钮**，**不响应拖动**；`setPanelWidth` action 存在但**当前无任何调用方**。因此"拖拽调宽"是**本次新增功能**，不是现状延续（详见 D5 与 A3a）。
- 会话编排：`composables/useAgUiAgent.ts`（真实 AG-UI 流式、工具调用、高风险确认、会话持久化）
- 会话状态：Pinia `aiChat` store（消息 / 线程 / 草稿）、`modelConfig` store（真实后端加密模型配置）、`agentChat` store（面板 UI 偏好）
- 页面上下文：`agent/page-context.ts`（业务页注册快照函数的 provider 机制）
- 已组件化：`AgentChatHeader` / `AgentChatInput` / `AiMessageList` / `ModelSelector`

**核心结论**：三种模式「共用同一套会话」这一硬要求**天然满足**——因为会话数据全在 Pinia store，模式只是 store 之上的不同视图。切换模式不碰 store 数据即不会丢失对话。

**本次要做的是**：
1. 新建统一外壳 `AgentWorkspace`，承载 `mode` 状态与三种布局分支；
2. 新增 **悬浮态**（可拖动 + 可缩放窗口）与 **全屏态**（工作台布局：大标题 + 上下文卡片 + 大输入框 + 快捷操作）；
3. 在头部增加 **模式切换器**（停靠 / 悬浮 / 全屏 / 设置 / 关闭）；
4. 扩展持久化（mode / dockedWidth / floatingPosition / floatingSize / agentVisible）。

**明确不做 / 避免重复劳动**：不重写 AG-UI 编排、不 mock 模型列表、不 mock 回复、不新建平行的消息渲染/输入组件。既有 `useAgUiAgent`、`AiMessageList`、`AgentChatInput`、`ModelSelector`、各 store 全部复用。

---

## 2. 已确认的关键决策（不可擅自更改）

| # | 决策项 | 选定方案 |
|---|--------|---------|
| D1 | 整体路线 | **复用现有智能体系统做「模式外壳」**。`AgentWorkspace` 包裹现有 `useAgUiAgent`/store/消息列表/输入框/模型选择器，只新增 floating+fullscreen 布局与模式切换。 |
| D2 | 模型与回复 | **一律用现有真实系统**：三模式都接 `modelConfig`（后端加密的真实模型）与真实 AG-UI 流式回复。不写死 mock 模型、不写死 mock 文案。 |
| D3 | 全屏快捷操作卡片 | **由页面上下文动态生成**：读 `page-context` 的 `availableActions`，按当前页面出卡片；点击填充输入框（或触发对应 action）。部门页即出部门相关操作，换页自动变。 |
| D4 | 全屏实现方式 | **应用内 fixed 覆盖层（overlay）**，业务页仍挂载于底层。切换零成本、会话必不丢失、返回即回原页。**不新建独立路由**。 |
| D5 | 停靠态宽度约束 | 采用需求值：默认 **420px**、最小 **320px**、最大 **视口 50%**（动态）。替换现有 `agentChat` store 的 360~480/440 常量。**⚠️「拖拽调宽」是新功能**（现状仅有折叠按钮、`setPanelWidth` 无调用方），作为独立任务 A3a 评估，不计入"抽出即等价"。 |
| D6 | 持久化载体 | **扩展现有 `agentChat` store**（persist key 仍为 `agentChat`），追加 `mode` / `dockedWidth`(=panelWidth) / `floatingPosition` / `floatingSize` / `agentVisible` 到 `pick`。**不另起 `ag-ui-agent-state` 键**，避免状态双写。 |
| D9 | `isPanelOpen` 兼容方式 | `isPanelOpen` **必须实现为可写 computed**（`get` 读 `agentVisible`、`set` 写 `agentVisible`）；现有 `togglePanel`/`setPanelOpen` 两个 action **保留且内部改为直接操作 `agentVisible`**。禁止用独立 ref 手动同步（会字段分裂 → 框架二让位回归）。 |
| D10 | `useAgUiAgent()` 实例化 | **只在 `AgentWorkspace`(原 `index.vue`) 顶层实例化一次**，三个 Shell 通过 props 接收 `agent` 对象，**不得在各 Shell 内重复调用该 composable**。否则切模式时 Shell 卸载触发 `onUnmounted → abort()`，打断正在流式的回复。 |
| D7 | 附件 / 语音按钮（全屏态原型可见） | **占位不接后端**：显示但点击给「暂未开放」提示（`allowAttachment` 维持 false 链路）。避免引入无后端支撑的假功能。 |
| D8 | 移动端（≤800px） | **悬浮态自动降级**：小屏不启用可拖动窗口，`mode=floating` 时回退为现有右滑抽屉；全屏态在小屏正常可用（本就是满屏）。 |

---

## 3. 全局技术约定（对齐现有代码）

| 项 | 约定 |
|----|------|
| 前端根目录 | `frontend/src/` |
| 组件根目录 | `components/core/layouts/art-agent-chat/` |
| 框架 | Vue 3 `<script setup lang="ts">` + Element Plus + SCSS(scoped) |
| 状态 | Pinia（`defineStore` setup 写法），持久化用现有 `persist` 插件 |
| 样式变量 | 一律用 `var(--art-*)` 设计变量；图标用 `iconfont-sys` 字体码 |
| 命名 | 组件 `PascalCase` + `defineOptions({ name })`；中文注释说明"为什么"，非"做什么" |
| 挂载点 | `views/index/index.vue`（框架一 + 框架二各一处 `<ArtAgentChat />`） |
| 严禁 | 引入 mock 模型/回复；新建平行会话状态；破坏现有停靠态与移动端抽屉行为 |

---

## 4. 目标架构（组件与状态）

### 4.1 组件树（新增/改造）

```
art-agent-chat/
├─ index.vue                      【改造】变为 AgentWorkspace 入口：持有 mode，
│                                  按 mode 渲染 docked / floating / fullscreen 三分支，
│                                  统一承载 onMounted 初始化（模型/设置/会话/工具/导航）
│                                  ★ useAgUiAgent() 只在此层实例化一次，agent 经 props 下发三 Shell
│                                    （避免切模式卸载 Shell 触发 onUnmounted→abort 打断流式回复）
├─ composables/
│  ├─ useAgUiAgent.ts             【复用·不改】会话编排
│  ├─ useChatAutoScroll.ts        【复用·不改】
│  └─ useAgentMode.ts             【新增】模式状态读写 + 拖动/缩放/持久化封装
├─ widget/
│  ├─ AgentModeSwitcher.vue       【新增】头部模式切换按钮组（停靠/悬浮/全屏/设置/关闭）
│  ├─ AgentHeader.vue             【改造/替换 AgentChatHeader】头部含标题 + 模式切换器
│  │                               （保留 config/history/new-chat 事件；collapse→切模式）
│  ├─ AgentChatBody.vue           【新增·薄封装】= AiMessageList + AgentChatInput 组合，
│  │                               供 docked / floating 共用，避免两处重复拼装
│  ├─ AgentChatInput.vue          【复用·微调】新增 size 变体（全屏大输入框）
│  ├─ ModelSelector.vue           【复用·微调】新增 size 变体（全屏"深度思考"样式）
│  ├─ modes/
│  │  ├─ AgentDockedShell.vue     【新增·由现 index.vue 抽出】停靠态外壳（右栏+拖拽+抽屉）
│  │  ├─ AgentFloatingShell.vue   【新增】悬浮态窗口（可拖动标题栏 + 8向缩放手柄）
│  │  └─ AgentFullscreenShell.vue 【新增】全屏工作台布局
│  └─ fullscreen/
│     ├─ AgentContextCard.vue     【新增】"当前页面上下文"卡片（读 page-context）
│     └─ AgentQuickActions.vue    【新增】快捷操作卡片行（读 availableActions 动态出卡）
```

> 说明：`AgentDockedShell` 是把现有 `index.vue` 的停靠态模板/拖拽/移动端逻辑**原样抽出**，行为不变；`index.vue` 收窄为"入口 + 模式路由 + 初始化"。这样三模式共享同一初始化与同一套子组件，改动面可控。

### 4.2 状态设计（`agentChat` store 扩展）

| 字段 | 类型 | 持久化 | 说明 |
|------|------|:---:|------|
| `mode` | `'docked' \| 'floating' \| 'fullscreen'` | ✓ | 当前展示模式，默认 `docked` |
| `agentVisible` | `boolean` | ✓ | 智能体整体是否可见（替代原 `isPanelOpen` 语义，关闭=完全隐藏，右缘留展开手柄） |
| `panelWidth`(=dockedWidth) | `number` | ✓ | 停靠宽度，约束改为 320 ~ 视口50%，默认 420 |
| `floatingPosition` | `{ x:number; y:number }` | ✓ | 悬浮窗左上角坐标 |
| `floatingSize` | `{ width:number; height:number }` | ✓ | 悬浮窗尺寸 |
| `isMobile` | `boolean` | ✗ | 运行时断点 |

新增 actions：`setMode(m)` / `toggleVisible()` / `setFloatingPosition(p)` / `setFloatingSize(s)`。
`isPanelOpen` 实现为**可写 computed**（get 读 `agentVisible`、set 写 `agentVisible`），避免改动 `views/index/index.vue` 的 `agentPanelSpace` 计算（框架二让位逻辑）。**现有 `togglePanel`/`setPanelOpen` action 保留**，内部改为直接写 `agentVisible`——因为 `AgentDockedShell` 搬运来的折叠按钮仍在调用它们，若它们继续写一个与 `agentVisible` 脱钩的旧 ref，两字段会分裂并使框架二让位回归。

### 4.3 三模式行为规格

**停靠态 docked（原型 1.png）**
- 右侧第三栏，flex 推挤主内容（框架二用 fixed + margin 让位，维持现状）
- 左边缘拖拽条调宽度（320 ~ 视口50%），底部有"拖动可调整面板宽度"气泡提示 —— **本次新增**（现状无此能力，见 A3a）
- 头部模式切换器：可切到悬浮/全屏；关闭→ `agentVisible=false`，右缘浮出展开手柄
- 移动端：维持现有右滑抽屉 + 遮罩

**悬浮态 floating（原型 2.png）**
- fixed 定位的独立窗口，非模态（不挡业务操作）
- 标题栏可拖动移动（含顶部两个抓握点视觉），四边/四角 8 向缩放手柄
- 尺寸/位置约束：不超出视口，最小尺寸兜底（如 360×480）；位置/尺寸持久化
- 内容 = `AgentChatBody`（与停靠态同一套消息列表 + 输入框）
- 移动端降级为抽屉（D8）

**全屏态 fullscreen（原型 3.png）**
- fixed 全屏覆盖层，z-index 高于业务但低于全局弹窗
- 顶部精简头栏：Logo+名称、历史、退出全屏(切回上次非全屏模式)、设置、主题、头像
- 主体工作台（空态/首屏）：
  - 徽标行「你的智能工作助手」
  - 大标题「今天想让**智能体**帮你做什么？」
  - 副标题「基于当前业务上下文，为你提供专业的分析与操作建议」
  - **上下文卡片** `AgentContextCard`：页面缩略/标题/描述 + "查看详情" + "切换上下文"（读 page-context）
  - **大输入框**：多行 + 模型选择器(大号"深度思考"样式) + 附件/语音(占位) + 发送
  - **快捷操作卡片行** `AgentQuickActions`：按 `availableActions` 动态出卡，点击填充输入框
  - 底部安全提示「你的对话内容将被安全处理，请放心使用」
- 有消息后：主体切换为 `AiMessageList`（居中列宽约束），输入框移至底部（复用 `AgentChatBody` 的全屏变体）

### 4.4 模式切换与会话不丢失（核心不变式）

- **切换只改 `store.mode`，绝不触碰 `aiChat` store 的 messages/threadId/draft**。
- 三种外壳都渲染同一批 store 驱动的子组件 → 天然同一会话、同一草稿、同一模型选择。
- **运行时流式请求也不能断**：`useAgUiAgent()` 在 `AgentWorkspace` 顶层实例化一次（D10），Shell 只是它的展示层；切模式卸载的是 Shell 而非 Workspace，`abortController` 不受影响，流式回复继续。
- 全屏为 overlay、业务页不卸载 → 退出全屏立即回到原页原态。
- 输入草稿走 `aiChat.draftInput`（现状），三模式输入框共享同一 v-model。

---

## 5. 分阶段任务清单（按序执行）

### 阶段 A：状态与骨架（先等价，后增强）
- [ ] **A1** 扩展 `agentChat` store：新增 `mode`/`agentVisible`/`floatingPosition`/`floatingSize`；改宽度约束(320~视口50%,默认420)；加 `setMode`/`toggleVisible`/`setFloatingPosition`/`setFloatingSize` actions；`isPanelOpen` 改为**可写 computed**(get/set 均映射 `agentVisible`)；`togglePanel`/`setPanelOpen` 内部改为直接写 `agentVisible`（D9）；更新 `persist.pick`
- [ ] **A2** 新增 `useAgentMode.ts`：暴露 `mode`/切换方法、悬浮拖动&缩放处理器、视口 clamp 与 resize 纠偏、rAF 节流落库
- [ ] **A3** 抽出 `modes/AgentDockedShell.vue`：把现 `index.vue` 停靠态模板/折叠按钮/移动端抽屉逻辑**原样搬运**（行为不变，**注意现状无拖拽逻辑可搬**）
- [ ] **A3a** （新功能）左边缘拖拽调宽：新增拖拽条 + `pointerdown/move/up`(setPointerCapture + rAF) 调 `setPanelWidth`，约束 320~视口50%，加"拖动可调整面板宽度"气泡提示。**独立评估，非等价搬运**
- [ ] **A4** 改造 `index.vue` 为 `AgentWorkspace` 入口：保留全部 `onMounted` 初始化，**顶层实例化 `useAgUiAgent()` 一次并经 props 下发**(D10)，按 `mode` 渲染三分支（此阶段 floating/fullscreen 先占位）
- [ ] **A5** 自测：停靠态展开/收起/移动端抽屉/框架一二让位，与改造前**逐项等价**；拖宽(A3a)按新功能单独验收

### 阶段 B：头部与模式切换
- [ ] **B1** 新增 `AgentModeSwitcher.vue`：停靠/悬浮/全屏三态图标按钮 + 设置 + 关闭；高亮当前模式
- [ ] **B2** 改造 `AgentHeader.vue`（替换 `AgentChatHeader`）：标题 + 集成模式切换器；保留 `config`/`history`/`new-chat` 事件，`collapse` 语义改为切模式/关闭
- [ ] **B3** 抽出 `AgentChatBody.vue`：`AiMessageList` + `AgentChatInput` 组合，供停靠/悬浮共用
- [ ] **B4** 停靠态接入新头部与 `AgentChatBody`，验证事件链路（发送/停止/历史/配置/新建）完整

### 阶段 C：悬浮态
- [ ] **C1** 新增 `modes/AgentFloatingShell.vue`：fixed 窗口 + `AgentHeader` + `AgentChatBody`
- [ ] **C2** 标题栏拖动移动（pointer 事件 + setPointerCapture + rAF）
- [ ] **C3** 8 向缩放手柄 + 最小尺寸兜底 + 位置/尺寸持久化 + 视口夹取
- [ ] **C4** 移动端降级为抽屉（D8）；悬浮↔停靠切换验证

### 阶段 D：全屏态
- [ ] **D1** 新增 `modes/AgentFullscreenShell.vue`：fixed overlay + 精简顶栏（退出全屏/设置/主题/头像）
- [ ] **D2** 首屏工作台：徽标 + 大标题 + 副标题 + 底部安全提示
- [ ] **D3** 新增 `fullscreen/AgentContextCard.vue`：读 `page-context`，页面缩略/标题/描述 + 查看详情 + 切换上下文
- [ ] **D4** 大输入框变体：`AgentChatInput` 加 `size` 变体 + `ModelSelector` "深度思考"大号样式 + 附件/语音占位按钮
- [ ] **D5** 新增 `fullscreen/AgentQuickActions.vue`：读 `availableActions` 动态出卡，点击填充输入框，无上下文出兜底卡
- [ ] **D6** 有消息时布局切换：主体渲染居中 `AiMessageList`，输入框沉底（全屏 `AgentChatBody` 变体）
- [ ] **D7** 全屏 overlay z-index 阶梯校准（高于业务、低于 Element Plus 弹层）

### 阶段 E：联调与验收
- [ ] **E1** 三模式两两互切矩阵（9 组）：会话/草稿/模型选择/线程 ID 零丢失
- [ ] **E2** 框架一 + 框架二双布局验收（含让位、移动端）
- [ ] **E3** 真实链路回归：发送/停止/重试/新建/历史切换/高风险确认/图表表格渲染
- [ ] **E4** 持久化验收：刷新后 mode/宽度/悬浮位置尺寸/可见性恢复
- [ ] **E5** 深浅色主题与响应式断点检查
- [ ] **E6** `pnpm build`/类型检查通过，清理临时代码

---

## 6. 关键实现要点（易踩坑）

- **抽出即等价**：A3 抽 `AgentDockedShell` 时逐行搬运，先保证"抽出后与原 `index.vue` 像素级一致"，再叠加新功能。切勿边抽边改。**现状无拖拽调宽逻辑**——A3 别去找不存在的代码搬，拖拽是 A3a 的新功能。
- **`isPanelOpen` 必须可写 computed**：get/set 都指向 `agentVisible`，且 `togglePanel`/`setPanelOpen` 内部改写 `agentVisible`。任何遗漏点若仍写旧独立 ref，会与 `agentVisible` 分裂 → 框架二让位回归（这正是别名机制要防的）。
- **`useAgUiAgent()` 单实例**：顶层调用一次、props 下发；三 Shell 内严禁重复调用，否则切模式卸载 Shell 会 abort 正在进行的流式请求。
- **拖动/缩放用 pointer 事件**：`pointerdown` + `setPointerCapture`，`pointermove` 期间 `requestAnimationFrame` 节流写入本地 ref，`pointerup` 落库到 store，避免高频持久化写入。
- **视口夹取集中在 `useAgentMode`**：悬浮位置/尺寸的 clamp 与 `window.resize` 纠偏出界统一处理，三处不要各写一份。
- **overlay 层级**：全屏 z-index 需高于业务与工作标签，但低于 Element Plus 弹窗/消息（`ModelConfigDialog`/`ElMessage`）；用现有设计 token 或复核既有 z-index 阶梯。
- **框架二让位不回归**：`views/index/index.vue` 的 `agentPanelSpace` 依赖 `isPanelOpen`+`panelWidth`；保留 `isPanelOpen` 别名并确保悬浮/全屏时主区不产生错误 margin。
- **快捷操作动态源**：只读 `page-context.availableActions`，映射到中文标签/图标的表放在 `AgentQuickActions` 内；无上下文时给"探索全部功能"兜底卡。

---

## 7. 影响面与回归清单

**改动文件**：`store/modules/agentChat.ts`（扩展）、`art-agent-chat/index.vue`（改造为入口）、新增若干 widget/composable。
**不改**：`useAgUiAgent.ts`、`aiChat`/`modelConfig`/`agentChatSetting` store、`AiMessageList` 内部、`page-context.ts`、`views/index/index.vue`（除非 §6 让位需微调）。

**回归必测**：① 停靠态展开/收起/拖宽 ② 移动端抽屉 ③ 框架一/二让位 ④ 发送/停止/重试/新建会话 ⑤ 历史会话切换 ⑥ 模型配置弹窗 ⑦ 高风险工具确认卡片 ⑧ 图表/表格/markdown 渲染。

---

## 8. 风险与缓解

| 风险 | 等级 | 缓解 |
|------|:---:|------|
| 抽出停靠态时引入行为差异 | 中 | A3 逐行搬运 + A5 对照自测，先等价后增强 |
| 误把"拖拽调宽"当现状搬运（实为新功能） | 中 | A3/A3a 拆分，拖拽按新功能独立开发与验收 |
| `isPanelOpen` 别名实现有歧义致字段分裂 | 中 | D9 强制可写 computed + 改写 `togglePanel`/`setPanelOpen` |
| 切模式卸载 Shell 打断流式回复 | 中 | D10 `useAgUiAgent()` 顶层单实例 + props 下发 |
| 悬浮拖拽/缩放性能或出界 | 中 | pointer 事件 + rAF 节流 + 统一 clamp/纠偏 |
| overlay 与全局弹窗层级冲突 | 中 | 复核 z-index 阶梯，全屏低于 Element Plus 弹层 |
| 框架二让位逻辑回归 | 中 | 保留 `isPanelOpen` 别名，E2 双框架验收 |
| 持久化字段结构变更导致旧缓存报错 | 低 | 新字段给默认值 + 读取兜底，不依赖旧缓存形状 |

---

## 9. 进度追踪总表

| 阶段 | 任务 | 状态 | 备注 |
|------|------|:---:|------|
| A 状态与骨架 | A1~A5（含 A3a） | ☑ 完成 | review 通过(1 MEDIUM 已修) |
| B 头部与切换 | B1~B4 | ☑ 完成 | review 通过(死文件 AgentChatHeader 已删) |
| C 悬浮态 | C1~C4 | ☑ 完成 | 拖动+8向缩放+移动端降级；终审 DONE |
| D 全屏态 | D1~D7 | ☑ 完成 | 工作台+上下文卡+动态快捷操作+大输入框；终审 DONE |
| E 联调验收 | E1~E6 | ☑ 代码级完成 | 类型检查通过、框架二让位已修、三审全过；运行时九宫格互切待用户自测 |

> 遗留 LOW（本次不动，与三模式无关）：`agentChat` store 的 `draftInput`/`setDraft` 为历史死状态（三外壳实际都绑 `aiChat.draftInput`），且被无谓持久化，建议后续单独清理。

> 状态图例：☐ 未开始 ／ ◐ 进行中 ／ ☑ 已完成。每完成一个子任务勾选 §5 复选框并更新本表阶段状态。

---

## 10. 验收标准（Definition of Done）

1. 三种模式均可用，且与原型 1/2/3.png 观感一致；
2. 任意两模式互切（9 组矩阵）会话、草稿、模型选择、线程 ID **零丢失**；
3. 停靠态、移动端抽屉、框架一/二让位**无回归**；
4. 全屏快捷操作随当前页面上下文动态变化；
5. 真实模型 + 真实 AG-UI 流式回复贯通（无 mock）；
6. 构建/类型检查通过，无新增报错；深浅色主题正常。

---

## 11. 中断恢复指引

1. 打开本文件，看 §9 进度追踪总表定位当前阶段；
2. 回到 §5 找到最后一个已勾选任务的**下一个**未勾选项继续；
3. 若不确定改动是否完整，按 §7 回归必测清单逐项验证当前态；
4. 阶段 A 未完成前，任何情况下先保证「停靠态与改造前等价」（A5），再推进后续阶段；
5. 恢复后在 §12 追加一条变更记录。

---

## 12. 变更记录

| 日期 | 变更 | 说明 |
|------|------|------|
| 2026-07-09 | 创建 v1.0 | 完成三模式方案设计、决策 D1~D8、分阶段任务 A~E |
| 2026-07-09 | 修订 v1.1 | 据 code-reviewer 核对修正 3 处：①拖拽调宽是新功能非现状(拆出 A3a) ②`isPanelOpen` 强制可写 computed 并改写相关 action(D9) ③`useAgUiAgent()` 顶层单实例防流式中断(D10) |
| 2026-07-09 | 实现 v2.0 | A~D 全部编码完成并逐阶段过 code-review：A(store扩展+useAgentMode+DockedShell抽出+Workspace入口+拖拽调宽) / B(ModeSwitcher+Header+ChatBody+接线) / C(FloatingShell 拖动+8向缩放+移动端降级) / D(FullscreenShell 工作台+ContextCard+QuickActions+大输入框)。修复：拖拽 transition 追尾(A)、删死文件 AgentChatHeader(B)、框架二让位仅 docked 挤压(C/D)。全部改动文件类型检查通过。 |




