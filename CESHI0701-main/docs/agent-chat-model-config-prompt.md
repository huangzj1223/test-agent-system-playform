# 智能体对话侧边栏 — 模型配置管理与模型选择提示词

> 用法：在「可折叠智能体对话侧边栏」已落地的项目上，为其补齐
> 「模型配置管理 + 底部模型选择」能力时，直接把下方【提示词正文】整段复制粘贴给 AI 编码助手即可。
> 提示词不绑定具体技术栈，AI 会自动探测项目框架与 UI 库后适配实现。
>
> **前置依赖（第 1 阶段）**：本文件是「侧边栏基础」之上的第 2 阶段扩展，
> 需先完成同目录 [`agent-chat-sidebar-prompt.md`](./agent-chat-sidebar-prompt.md) 的侧边栏，
> 再套用本提示词。
>
> **后续（第 3-5 阶段）**：完成模型配置后，依次接入 AG-UI 事件协议
> [`agent-chat-agui-prompt.md`](./agent-chat-agui-prompt.md)、接入真实模型
> [`agent-chat-real-model-prompt.md`](./agent-chat-real-model-prompt.md)、结构化消息渲染 + 历史会话
> [`agent-chat-rich-message-prompt.md`](./agent-chat-rich-message-prompt.md)。五份为一组、按顺序使用。

---

## 提示词正文（复制以下全部内容）

请基于当前项目现有代码，实现右侧智能体聊天面板的"模型配置管理"和"模型选择"功能。

请先阅读并分析当前项目结构、技术栈、路由、状态管理方式以及右侧聊天组件的实现，不要重新创建项目，也不要大范围重构现有页面。优先复用项目已有的组件、样式、图标、请求封装和状态管理。

一、功能目标

当前系统右侧已经有一个智能体聊天面板，聊天面板底部有模型选择区域。

需要新增以下功能：

1. 在右侧聊天面板顶部增加"模型配置"入口。
2. 点击入口后打开"模型配置管理"页面。
3. 配置管理页面整体布局参考提供的设置页面截图：
   - 左侧为模型供应商配置列表；
   - 右侧为当前配置详情；
   - 右侧下方为该供应商下的模型列表。
4. 配置完成并启用模型后，在聊天面板底部的模型选择器中动态展示。
5. 用户选择模型后，聊天请求必须使用当前选择模型的配置参数。

二、模型配置入口

在右侧聊天面板标题栏右上角增加一个"设置"图标按钮。

交互要求：

- 鼠标悬停显示提示文字"模型配置"。
- 点击后打开一个大尺寸弹窗或抽屉式设置页面。
- 优先使用当前项目已有的 Dialog、Drawer 或 Modal 组件。
- 设置页面建议尺寸：
  - 宽度：85vw；
  - 高度：85vh；
  - 最小宽度：1000px；
  - 页面内容超出时内部滚动。
- 不跳转当前业务页面，不影响左侧部门管理页面的操作状态。
- 关闭配置页面后，聊天记录仍然保留。

三、模型配置管理页面

页面标题："模型配置管理"

整体采用左右两栏布局。左侧宽度约为 280px，右侧自适应占满剩余空间。

（一）左侧：配置列表

左侧顶部展示：

- 标题：配置列表
- 说明：管理不同模型供应商及其连接配置
- "新增配置"按钮

每个配置卡片显示：

- 配置名称
- 模型供应商名称
- API Endpoint
- 已添加模型数量
- 已启用模型数量
- 配置启用开关
- 删除按钮
- 当前选中状态
- 支持点击切换当前配置

配置示例：Claude、OpenAI、DeepSeek、OpenRouter、自定义兼容接口。

新增配置时，创建一个默认配置并自动进入编辑状态。

删除配置时弹出二次确认："删除配置后，该配置下的模型也将被删除，是否继续？"

如果当前配置正在被聊天面板使用，删除前需要提示用户重新选择模型。

（二）右侧上半部分：配置详情

展示并编辑当前供应商配置。字段包括：

1. 配置名称（必填，示例：Claude、DeepSeek、公司内部模型）
2. 模型供应商（下拉：OpenAI / Anthropic / DeepSeek / OpenRouter / Azure OpenAI / 自定义 OpenAI 兼容接口）
3. API Endpoint（必填，示例：https://api.openai.com、https://api.anthropic.com、https://api.deepseek.com）
4. API Key（密码输入框，默认星号隐藏，提供显示/隐藏按钮；不允许在控制台打印；不允许在错误提示中展示完整 API Key）
5. 协议类型（下拉：OpenAI Compatible / Anthropic / Azure OpenAI / Custom）
6. API 版本（非必填，示例：2023-06-01）
7. 备注（非必填，示例：用于测试环境、生产环境或内部模型服务）
8. 配置启用状态（开关控制）

底部操作按钮：测试连接、保存配置、取消修改。

"测试连接"按钮需要：显示加载状态；调用统一的模型连接测试方法；成功提示"连接测试成功"；失败展示简洁错误原因；不暴露完整密钥；如果项目暂时没有真实后端接口，先实现 Mock 测试，但必须将请求逻辑独立封装，方便后续替换。

（三）右侧下半部分：已添加模型

区域标题："已添加模型"。区域说明："聊天页面的模型选择器将读取这里已启用的模型。"

顶部提供：搜索框、"添加模型"按钮、已添加数量、已启用数量。

每个模型显示：模型显示名称、模型 ID、所属供应商、上下文窗口、最大输出长度、是否支持文本输入、是否支持图片输入、是否支持图片输出、是否支持工具调用、启用开关、测试按钮、编辑按钮、删除按钮。

模型字段包括：

1. 模型显示名称（示例：Claude Opus 4.8）
2. 模型 ID（示例：claude-opus-4-8）
3. 上下文窗口（示例：1000000）
4. 最大输出长度（示例：128000）
5. 支持能力（文本输入 / 图片输入 / 图片输出 / 工具调用 / 流式输出）
6. 排序值
7. 是否启用

添加或编辑模型时，使用弹窗表单。删除模型时需要二次确认。

四、聊天面板底部模型选择器

在右侧聊天面板底部输入框下方保留并完善模型选择器。

模型选择器的数据来源必须是："模型配置管理中，配置已启用，并且模型已启用的数据"。

展示格式：供应商名称 / 模型名称（例如：Anthropic / Claude Opus 4.8、OpenAI / GPT-4.1、DeepSeek / DeepSeek Chat）。下拉面板按照供应商分组展示。每个模型选项可以显示：模型名称、供应商、模型能力标签、上下文窗口。

交互要求：

1. 用户选择模型后，立即更新当前聊天模型。
2. 刷新页面后保留上一次选择的模型。
3. 如果上一次选择的模型已经被禁用或删除，则自动选择第一个可用模型。
4. 没有可用模型时：模型选择器显示"请先配置模型"；禁用发送按钮；点击提示后可以直接打开模型配置页面。
5. 当前模型切换后，不清空已有聊天记录。
6. 新发送的消息使用新选择的模型。
7. 正在生成回答时暂时禁止切换模型，避免请求状态混乱。

五、聊天请求参数

发送聊天消息时，根据当前选择模型获取完整配置。请求参数至少包含：provider、modelId、apiEndpoint、apiKey、protocolType、apiVersion、stream、messages、systemPrompt、temperature、maxTokens。

请将模型请求逻辑封装为统一服务，例如 `src/services/modelService.ts`，统一暴露：testConnection()、sendChatMessage()、getAvailableModels()。

不同供应商通过适配器处理，例如 OpenAIAdapter、AnthropicAdapter、DeepSeekAdapter、OpenAICompatibleAdapter。不要把不同供应商的请求判断全部直接写在聊天组件中。

六、建议的数据结构

```ts
interface ModelProviderConfig {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'deepseek' | 'openrouter' | 'azure-openai' | 'openai-compatible'
  apiEndpoint: string
  apiKey: string
  protocolType: string
  apiVersion?: string
  remark?: string
  enabled: boolean
  sort: number
  models: ModelConfig[]
  createdAt: string
  updatedAt: string
}

interface ModelConfig {
  id: string
  providerConfigId: string
  name: string
  modelId: string
  contextWindow?: number
  maxOutputTokens?: number
  supportText: boolean
  supportImageInput: boolean
  supportImageOutput: boolean
  supportTools: boolean
  supportStream: boolean
  enabled: boolean
  sort: number
}

interface CurrentModelSelection {
  providerConfigId: string
  modelId: string
}
```

七、数据存储

请优先检查项目是否已有后端接口和状态管理。处理顺序：

1. 如果已有模型配置后端接口，则接入现有接口。
2. 如果暂时没有后端接口：使用 Pinia / Vuex 或项目现有状态管理维护数据；使用 localStorage 做原型阶段持久化；将存储逻辑单独封装，方便以后替换为后端接口。

建议存储键：ai_model_provider_configs、ai_current_model。

注意：localStorage 方案只用于当前原型开发。代码结构必须允许后续切换为后端加密存储。

八、页面样式

整体视觉风格要与当前系统保持一致：主色使用现有系统蓝色；白色或浅灰背景；卡片圆角；细边框；轻微阴影；表单间距统一；不复制参考图中的米黄色主题；只参考参考图的页面布局和交互结构；不要破坏现有部门管理页面；不要修改左侧菜单和中间表格；不要改变右侧聊天栏现有宽度；模型配置页面层级要高于聊天面板和业务页面。

当前选中的供应商配置卡片要有明显的蓝色边框或浅蓝色背景。启用状态使用绿色或项目现有成功色。危险操作使用红色。

九、组件拆分建议

请避免把所有代码写在一个文件中，建议拆分为：

```
components/ai-chat/
  AiChatPanel.vue
  ModelSelector.vue
  ModelConfigDialog.vue
  ProviderConfigList.vue
  ProviderConfigForm.vue
  ModelList.vue
  ModelEditDialog.vue
stores/
  modelConfig.ts
services/
  modelService.ts
  modelConfigStorage.ts
types/
  model.ts
```

请根据当前项目真实目录结构进行调整，不要机械创建重复目录。

十、初始化数据

为方便演示，可初始化以下演示配置，但不要写入真实 API Key：

- 配置一：Claude / Anthropic / https://api.anthropic.com / 模型 Claude Opus（claude-opus）/ 启用
- 配置二：DeepSeek / DeepSeek / https://api.deepseek.com / 模型 DeepSeek Chat（deepseek-chat）/ 启用

API Key 默认留空。

十一、异常处理

需要处理：Endpoint 为空、API Key 为空、模型 ID 为空、网络连接失败、接口返回 401 / 403 / 404 / 429、接口请求超时、当前模型被禁用、当前配置被删除、没有可用模型、配置保存失败、重复添加相同模型 ID。

错误提示使用项目现有 Message 或 Notification 组件，不使用浏览器 alert。

十二、验收标准

1. 右侧聊天栏顶部可以打开模型配置页面。
2. 可以新增、编辑、删除、启用和禁用供应商配置。
3. 可以在供应商配置下新增、编辑、删除和启用模型。
4. 刷新页面后配置数据仍然存在。
5. 聊天栏底部只显示已启用的模型。
6. 可以在聊天栏底部切换模型。
7. 刷新页面后保留上一次选择。
8. 没有模型时不能发送消息，并能引导用户打开配置页面。
9. 发送聊天消息时能够获取当前模型对应的完整配置。
10. API Key 默认隐藏，不输出到控制台。
11. 原有部门管理页面和聊天功能不受影响。
12. TypeScript 不出现明显类型错误。
13. 页面无明显溢出、遮挡、错位问题。
14. 代码完成后，列出新增文件、修改文件及各文件用途。

建议最终交互：聊天栏顶部齿轮按钮 → 打开模型配置大弹窗 → 配置并启用模型 → 聊天栏底部模型下拉框自动更新。这样不会占用右侧聊天栏本身有限的宽度。修改完成后运行项目的 lint、type-check 或 build 命令，修复本次改动导致的问题。

---

## 参考实现（本仓库 frontend 已落地，可作为范例）

在 `agent-chat-sidebar-prompt.md` 的侧边栏基础上，本阶段落地的文件如下：

| 部分 | 位置 |
|------|------|
| 类型定义 | `frontend/src/types/model.ts` |
| localStorage 持久化封装（可换后端） | `frontend/src/services/modelConfigStorage.ts` |
| 供应商请求适配器 + 密钥脱敏 | `frontend/src/services/modelAdapters.ts` |
| 统一服务（testConnection / sendChatMessage / getAvailableModels） | `frontend/src/services/modelService.ts` |
| 配置状态 store（CRUD + 当前选择 + 可用模型分组） | `frontend/src/store/modules/modelConfig.ts` |
| 配置管理弹窗（85vw/85vh，左右两栏） | `.../art-agent-chat/widget/ModelConfigDialog.vue` |
| 左侧配置列表 | `.../widget/model-config/ProviderConfigList.vue` |
| 右上配置详情表单 | `.../widget/model-config/ProviderConfigForm.vue` |
| 右下已添加模型列表 | `.../widget/model-config/ModelList.vue` |
| 模型新增/编辑弹窗 | `.../widget/model-config/ModelEditDialog.vue` |
| 底部分组模型选择器 | `.../art-agent-chat/widget/ModelSelector.vue` |
| 顶栏齿轮入口 / 底部无模型引导 / 发送接线 | `AgentChatHeader.vue`、`AgentChatInput.vue`、`index.vue`、`composables/useAgentChat.ts` |

### 落地关键决策（复用时参考）

- **存储隔离**：所有 localStorage 读写只经 `modelConfigStorage.ts`，键名集中为 `ai_model_provider_configs` / `ai_current_model`；换后端时只改这一层，store 与组件不动。
- **供应商差异走适配器**：`resolveAdapter(protocolType)` 按协议返回对应适配器（OpenAI 兼容 / Anthropic / Azure / Custom），组件与服务层不写 provider 的 if/else。
- **密钥安全**：API Key 全链路禁止 `console` 打印；错误提示只经 `maskApiKey()` 脱敏（形如 `sk-a****z`）；localStorage 明文仅限原型阶段，已在文件顶部与类型字段注释标注需换后端加密。
- **当前选择自愈**：`ensureValidSelection()` 在配置/模型的删除、禁用、改动后统一调用——选择失效则回退第一个可用模型，无可用则清空并禁用发送。
- **生成中锁定**：`ModelSelector` 接收 `disabled=isGenerating`，避免生成过程中切换模型导致请求状态错乱。
- **Mock 与真实对称**：Mock 模式复用侧边栏已有的本地流式模拟；真实分支在 `modelService` 内预留 `fetch` 接入点并注释清楚，保持与 Mock 相同的回调契约，后端就绪后只替换该分支。




