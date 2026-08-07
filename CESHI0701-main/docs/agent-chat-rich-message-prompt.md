# 智能体对话侧边栏 — 结构化消息渲染 + 历史会话提示词（第 5 阶段）

> 用法：在「侧边栏 + 模型配置 + AG-UI 协议 + 真实模型」四阶段已落地的项目上，
> 把右侧聊天框从"只渲染纯文本"升级为"渲染表格 / ECharts 图表 / GFM Markdown 等结构化内容"，
> 并补齐"历史会话持久化"时，直接把下方【提示词正文】整段复制粘贴给 AI 编码助手即可。
> 提示词不绑定具体技术栈，AI 会自动探测项目框架与 UI 库后适配实现。
>
> **前置依赖（第 1-4 阶段）**：需先完成同目录
> [`agent-chat-sidebar-prompt.md`](./agent-chat-sidebar-prompt.md)（侧边栏基础）、
> [`agent-chat-model-config-prompt.md`](./agent-chat-model-config-prompt.md)（模型配置）、
> [`agent-chat-agui-prompt.md`](./agent-chat-agui-prompt.md)（AG-UI 协议）、
> [`agent-chat-real-model-prompt.md`](./agent-chat-real-model-prompt.md)（接入真实模型）。
> 五份为一组、按顺序使用：侧边栏 → 模型配置 → AG-UI 协议 → 真实模型 → 结构化消息渲染。
>
> **本阶段解决两类需求**：
> 1. 聊天消息除文本外，要能展示数据库查询结果表格、ECharts 图表（饼/柱/折线可切换）、GFM Markdown；
> 2. 历史会话持久化——刷新不丢消息，支持多会话列表切换/删除。

---

## 提示词正文（复制以下全部内容）

请优化右侧智能体聊天窗口，让它支持结构化消息渲染（表格、ECharts 图表、GFM Markdown）并补齐历史会话。只改右侧聊天区域及消息渲染，不动左侧业务功能。请先分析当前项目的前端框架、UI 库、Markdown 方案、状态管理、聊天消息数据结构和事件管线，在现有代码上实现，不要重建页面。

一、先做关键决策：结构化数据从哪个通道进入消息

大模型不应直接返回 HTML / script / ECharts 初始化代码（XSS 风险 + 不可控）。图表必须基于结构化数据渲染，不能从自然语言二次解析。请在以下方案里选一种，讲清取舍后实现：

- **方案 A（协议围栏·推荐用于无真实工具时）**：约定模型在流式文本中输出一段围栏 ` ```agent-blocks {"blocks":[...]} ``` `，前端解析成结构化块。配合注入 system 提示引导模型按协议输出。改动小、对接真实模型即可用。
- **方案 B（AG-UI 工具事件·推荐用于有真实 DB 工具时）**：后端 DB 查询工具执行后，通过 TOOL_CALL_RESULT 或直接拼装结构化块返回，不依赖模型 JSON 准确度。更可靠，但需后端配合。

无论哪种，前端解析器都要对字段和值做防御性校验，非法块降级为 error 块，不崩溃。

二、消息块协议（TypeScript 类型）

为消息增加结构化块。ChatMessage 增加 blocks?: MessageBlock[] 字段：

- MarkdownBlock { type:'markdown', content }
- TableBlock { type:'table', title?, columns:[{key,title,dataType}], rows }
- ChartBlock { type:'chart', id, title, description?, supportedTypes:('pie'|'bar'|'line')[], defaultType, categoryField, valueFields[], data, unit? }
- CodeBlock { type:'code', lang?, content }
- ErrorBlock { type:'error', message }

数据库工具执行后必须保留：原始字段名、字段显示名、字段类型、结果行数据。table 与 chart 的 data 一致，字段名严格对应。

三、消息块渲染器

新增统一渲染器（如 AgentMessageRenderer），按 block.type 分发到独立组件，不要在一个组件里堆 if-else：
- markdown → MarkdownRenderer（复用项目安全 Markdown 渲染，禁止未过滤 v-html/dangerouslySetInnerHTML）
- table → AgentDataTable
- chart → AgentChartCard
- code → 代码块（高亮）
- error → 错误提示

相邻的 table + chart 合并为"数据组"，组顶部提供"表格 / 图表 / 表格+图表"三种查看模式切换，默认"表格+图表"。切换只改前端显示，不重查数据。

四、GFM Markdown

支持 GFM：表格、删除线、任务列表、自动链接、代码块、有序/无序列表。表格效果：表头浅灰背景、细边框、占满卡片宽度、内容过宽横向滚动、表头吸顶、数字列右对齐、空值显示"-"、长文本换行、不撑破窄侧栏。若项目已有零依赖安全 Markdown 渲染器（先转义后白名单），优先在其上补 GFM，不要为此引入重型依赖。

五、ECharts 图表卡片（AgentChartCard + AgentChart + ChartTypeSwitcher + ChartToolbar）

- 用项目已有的 ECharts，不用静态图片。图表主色取项目主题变量，不写死品牌色。
- 卡片：左上标题/副标题，右上"饼/柱/折线切换 + 刷新/全屏/下载PNG/查看原始数据"，中间图表，底部数据条数/单位。
- 三种图表共用同一份 data，切换只按 chartType 重新生成 option（notMerge 更新），不重建实例、不重查数据；当前类型高亮；切换平滑。
- AgentChart 生命周期：onMounted init、监听 window resize + 容器 ResizeObserver、onBeforeUnmount 必须 dispose 并解绑（防内存泄漏）；实例创建幂等，不重复 init。
- 转换规则：饼图取单数值字段映射 {name,value}，Tooltip 显名称/值/百分比，数据项多时隐藏标签只留图例、图例可滚动、Top N 合并"其他"；柱/折线 xAxis=分类、series 按 valueFields 多系列，标签过长旋转/截断，大数据量启用 dataZoom；折线 smooth、按时间排序。
- 下载用 ECharts getDataURL；查看原始数据用弹窗/抽屉展示完整表格。

六、异常与空状态

处理：查询无结果、图表数据为空、categoryField/valueFields 缺失、数值含字符串、数据量过大、ECharts 初始化失败、Markdown 解析失败、流式未结束、快速切换图表。空状态给明确提示（暂无数据/当前结果不适合生成图表/字段配置不完整）。数据量超阈值：表格分页、轴类 dataZoom、饼图 Top N，且轴类应设渲染行数上限（防不可信大数据集卡死浏览器）。

七、流式兼容

普通文本流式追加；图表 block 数据完整后再初始化（不要每个 token 重建 ECharts）；数据未完整时显示"正在生成图表"占位；message 完成后再最终渲染。关键：流式中只剥离协议围栏文本 + 标记 pending，消息结束（TEXT_MESSAGE_END）才一次性解析出 blocks。若流结束时围栏仍未闭合（截断），追加 error 块提示，不要静默丢内容。

八、历史会话持久化

现状常见问题：消息只存内存、刷新即丢，"历史会话"按钮未实现。请实现多会话：
- store 增加 sessions 列表，持久化到 localStorage（设上限如 30 条，超出淘汰最旧）；
- 每轮运行结束自动保存当前会话（清除流式态快照，绝不存密钥/半截流式消息）；
- 会话标题取首条用户消息截断；
- 顶部"历史会话"按钮 → 抽屉列表，显示标题/时间/消息数，当前会话高亮，支持点击切换、删除；
- 切换前先保存当前会话；删除当前会话则新建空会话；恢复历史消息用深拷贝，避免引用污染持久化对象；
- 若快照恢复的 assistant 消息含结构化协议，恢复时同样解析出 blocks。

九、安全铁律

- 禁止未过滤的 v-html/innerHTML 渲染模型内容；表格单元格用文本插值（框架自动转义），不用 v-html。
- **ECharts tooltip 用函数式 formatter 时，返回值会直接进 innerHTML，绕过 ECharts 内置转义**——模型可控的字段（分类名/单位等）必须先 HTML 转义再拼接。轴类默认 formatter 走内置转义是安全的，唯独自定义函数式 formatter 这条路径要手动转义。
- 图表数据严格来自结构化协议，不从自然语言二次解析。

十、验收场景

1. "查询各部门人员数量并画图"→ 说明文字 + 表格 + 默认饼图 + 右上可切柱/折线，切换不重查。
2. "统计最近 12 个月新增用户"→ 表格 + 默认折线，可切柱状。
3. "统计不同角色用户占比"→ 表格 + 饼图，Tooltip 显数量和百分比，可下载 PNG。
4. 历史会话：发消息 → 刷新不丢 → 历史按钮打开列表 → 切换/删除。

请直接完成代码修改，不要只给示例。完成前跑类型检查 + 构建确认通过，并对 XSS、ECharts 内存泄漏、localStorage 密钥泄漏做自查。

---

## 参考实现（本仓库 frontend 已落地，可作为范例）

采用**方案 A（协议围栏 ```agent-blocks```）**。ECharts 5.6 + 项目自研零依赖 Markdown 渲染器。

**结构化消息渲染**
| 部分 | 位置 |
|------|------|
| 块类型定义 | `frontend/src/types/agent-message.ts` |
| 协议解析器 + system 提示常量 | `frontend/src/utils/agui/agentBlocks.ts` |
| 块分发渲染器（含 table+chart 联动组） | `.../widget/ai-chat/AgentMessageRenderer.vue` |
| Markdown 渲染 | `.../widget/ai-chat/markdown/MarkdownRenderer.vue` |
| 数据表格（右对齐/吸顶/分页） | `.../widget/ai-chat/table/AgentDataTable.vue` |
| ECharts 封装（init/resize/dispose） | `.../widget/ai-chat/chart/AgentChart.vue` |
| 图表卡片（切换/工具栏/全屏/下载/截断提示） | `.../widget/ai-chat/chart/AgentChartCard.vue` |
| 图表类型切换 / 工具栏 | `.../chart/ChartTypeSwitcher.vue`、`ChartToolbar.vue` |
| option 工厂 / 数据转换 | `.../chart/chartOptionFactory.ts`、`chart-data-transform.ts` |
| 消息集成 + blocks 解析 | `.../ai-chat/AiMessageItem.vue`、`utils/agui/agUiEventReducer.ts` |
| system 提示注入 | `.../composables/useAgUiAgent.ts` |
| 演示数据 | `frontend/src/mock/agUiServer.ts`（部门人数/月度趋势/角色占比） |

**历史会话**
| 部分 | 位置 |
|------|------|
| 会话类型 + sessions 状态 + 管理 actions + persist 白名单 | `frontend/src/store/modules/aiChat.ts` |
| 每轮结束自动保存 | `.../composables/useAgUiAgent.ts`（doRun finally） |
| 历史按钮 | `.../widget/AgentChatHeader.vue` |
| 会话列表抽屉 | `.../widget/AgentHistoryDrawer.vue` |
| 抽屉接线 | `.../art-agent-chat/index.vue` |

### 落地关键决策（复用时参考）

- **结构化数据通道是架构岔路，必须先定**：方案 A（协议围栏 + system 提示）改动最小、对接真实模型即用；方案 B（真实 DB 工具 + TOOL_CALL_RESULT）更可靠但需后端。二者共用同一套前端块类型与渲染器。
- **流式解析时机**：流式中只剥离围栏文本 + 标 pending，消息结束才解析 blocks，避免每 token 重建 ECharts。围栏未闭合要降级为 error 块，不静默丢。
- **ECharts 函数式 formatter 是 XSS 高危点**：其返回值直接进 `innerHTML` 绕过 ECharts 内置转义（读源码 `TooltipHTMLContent.setContent` 确认）；模型可控字段必须 `escapeHtml` 后再拼。axis 默认 formatter 走内置 `encodeHTML` 安全。
- **图表切换不重查/不重建**：三类型共用一份 data，`computed` 按 chartType 生成 option，`setOption(opt,{notMerge:true})` 更新；实例 onBeforeUnmount dispose、resize 监听解绑，防泄漏。
- **不可信数据要设上限**：饼图 Top N 合并、轴类截断（如 500 行）+ 卡片提示、表格分页；模型可能输出超大数据集卡死浏览器。
- **历史会话架构断层**：常见现状是消息只存内存 + persist 白名单不含消息，刷新即丢；补 sessions 持久化时，只存已完成消息（清流式态）、设条数上限、绝不存密钥（密钥应在独立 store）。
- **两个易踩的回归**：① store 定义文件改动触发 HMR 会清空内存消息（表现为"历史没了"，实为未持久化）；② 事件订阅若 `agent.subscribe` + `runAgent(...,subscriber)` 双注册会导致文本 delta 翻倍。


