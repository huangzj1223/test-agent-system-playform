# 智能体对话 · 历史会话持久化提示词

> 用途：把智能体对话的历史会话从「浏览器 localStorage」迁移为「后端 Markdown 文件持久化」，实现点击历史会话可回到原对话继续，会话按用户隔离、跨设备/清缓存不丢失。
> 适用对象：已完成 `agent-chat-sidebar-prompt.md`、`agent-chat-agui-prompt.md`、`agent-chat-rich-message-prompt.md`、`agent-chat-real-model-prompt.md` 的项目（前端已有历史会话抽屉 UI 与 aiChat store，后端已有 ag-ui 模块与认证体系）。
> 执行方式：将本文件内容作为提示词输入给 AI 编码助手，助手据此完成改造。

---

## 一、背景与目标

### 现状
- 智能体对话侧边栏已有历史会话抽屉（`AgentHistoryDrawer.vue`），点击可切换会话。
- 会话由前端 `aiChat` store 存在浏览器 `localStorage`（`persist.pick` 含 `sessions`）。
- 存在缺陷：`threadId` 被持久化，但当前会话消息是运行态未落盘，刷新后点击历史会话因 `loadSession` 的 `if (id === threadId) return` 早退而无法恢复消息，表现为「点击无响应」。

### 目标
- 会话改由后端持久化为 **Markdown 文件**，按用户隔离存储。
- 修复「点击历史会话无响应」：始终从后端拉取完整消息恢复。
- 保证富消息（agent-blocks 表格/图表）无损往返，历史会话重开后正常渲染，不暴露原始协议 JSON。
- 处理边界：运行中切换/删除会话的竞态、非法 ID、旧格式兼容。

---

## 二、整体架构

### 数据流
```
前端 aiChat store
  ├─ 面板挂载 → initSessions() → GET  /admin/ag-ui/conversation/list   → 会话元数据列表
  ├─ 点击历史 → loadSession(id) → GET  /admin/ag-ui/conversation/info/:id → 完整消息 → 恢复渲染
  ├─ 一轮对话结束/新建/切换前 → saveCurrentSession() → POST /admin/ag-ui/conversation/save
  └─ 删除会话 → deleteSession(id) → DELETE /admin/ag-ui/conversation/delete/:id

后端 ag-ui 模块
  └─ ConversationController(认证通道, @Admin('userId') 用户隔离)
       └─ ConversationService → 读写 data/ag-conversations/<userId>/<threadId>.md
```

### 存储格式（每个会话一个 .md 文件）
- YAML frontmatter：threadId / title / createdAt / updatedAt（元数据，可读）
- 正文：`## 🧑 用户` / `## 🤖 助手` 分段的可读对话记录
- 末尾隐藏数据块：`<!-- AGENT_SESSION_DATA\n<base64>\n-->`，base64 包裹的 JSON，无损承载消息结构（含 blocks）

---

## 三、后端改动（server/，NestJS）

在 **已有的 ag-ui 模块** 内新增会话持久化能力（不新建模块）。

### 1. DTO：`src/modules/ag-ui/dto/conversation.dto.ts`（新增）
- `ConversationMessageDto`：`id`(≤128) / `role`(≤32) / `content`(≤50000) / `createdAt?`(int) / `blocks?`(array)。
- `SaveConversationDto`：`threadId`(≤128) / `title`(≤64) / `messages`(数组) / `createdAt?`。
- **关键**：`messages` 必须加 `@IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => ConversationMessageDto)`——否则数组元素不会被实例化，嵌套校验与白名单裁剪不生效。

### 2. Service：`src/modules/ag-ui/services/conversation.service.ts`（新增）
- 存储根：`join(process.cwd(), 'data', 'ag-conversations')`（**非静态资源目录**，不对外暴露）。
- `userDir(userId)`：`String(userId).replace(/[^a-zA-Z0-9_-]/g, '')` 安全化。
- `threadFile(userId, threadId)`：threadId 同样安全化，空则 **抛 `BadRequestException`**；再用 `resolve(file).startsWith(resolve(dir))` 二次校验防路径穿越。
- `serialize()`：拼 frontmatter + 可读正文 + 隐藏块；隐藏块用 **base64** 包裹 JSON（`Buffer.from(json,'utf-8').toString('base64')`）——防止正文/载荷中出现标记文本导致解析错位。
- `parse()`：用 `raw.lastIndexOf(DATA_BEGIN)` 定位块头（base64 载荷不含标记，故最后一个必是真块头）；解码 base64 后 `JSON.parse`；**失败时回退对原始 payload 直接 JSON.parse**（兼容早期非 base64 格式）。
- `list()`：读目录、逐文件 parse（单文件失败 try/catch 兜底不拖垮列表）、按 updatedAt 倒序，仅返回元数据（不含 messages 正文）。
- `get()` / `save()`(upsert，保留原 createdAt) / `remove()`(幂等)。
- **`remove()` 注意**：`threadFile()` 调用要放在 try 外，只让 `fs.unlink` 在 try 内——否则非法 ID 的 `BadRequestException` 会被 ENOENT 的 catch 吞掉。

### 3. Controller：`src/modules/ag-ui/controllers/conversation.controller.ts`（新增）
- `@Controller('admin/ag-ui/conversation')`，走全局 AuthGuard（不加 @Public）。
- 四接口：`GET list` / `GET info/:threadId` / `POST save` / `DELETE delete/:threadId`。
- 用户 ID 一律来自 `@Admin('userId')`，**绝不接受客户端传入的 userId**（防越权/IDOR）。

### 4. 注册与忽略
- `ag-ui.module.ts`：controllers 加 `ConversationController`，providers 加 `ConversationService`。
- `server/.gitignore`：加 `data`（忽略会话存储目录）。

---

## 四、前端改动（frontend/，Vue3 + TS）

### 1. API 层：`src/api/agentConversation.ts`（新增）
- `ConversationMeta`：threadId / title / createdAt / updatedAt / messageCount。
- `PersistMessage = Pick<AiChatMessage, 'id'|'role'|'content'|'createdAt'|'blocks'>`——**只含后端白名单字段**。
- `ConversationDetail extends ConversationMeta { messages: PersistMessage[] }`（类型如实反映后端只返回白名单字段）。
- `SaveConversationPayload.messages: PersistMessage[]`。
- 四个函数用项目封装的 `request`（带 token 的认证通道）：`fetchConversationList` / `fetchConversationDetail` / `saveConversation` / `deleteConversation`。
- **注意**：`request.get<T>` 不自动解包，返回 `{code,message,data:T}`，store 里取 `.data`。

### 2. Store：`src/store/modules/aiChat.ts`（改造）
- `sessions` 类型改为 `ConversationMeta[]`（列表只存元数据，点击才拉完整消息）。
- 新增运行时 `pendingDeletes = ref<Set<string>>(new Set())`（不持久化）。
- 新增 `initSessions()`：拉 list 填充 sessions，失败静默置空不阻断面板。
- `saveCurrentSession()`：
  - 开头 `if (pendingDeletes.value.has(threadId.value)) return`（防删除后被自动保存"复活"）。
  - 快照**只取白名单字段**（id/role/content/createdAt，blocks 有内容才带），剥离运行态字段（streaming/toolCallIds/sendStatus/displayText/blocksPending），否则后端 400 `property streaming should not exist`。
  - 调 `saveConversation`，用回传 meta upsert 本地列表。
- `loadSession(id)` 改异步：
  - **不再** `if (id === threadId) return`（这是原「点击无响应」的根因）；仅在切到其他会话时先 `saveCurrentSession()`。
  - 从 `fetchConversationDetail` 拉完整消息，恢复时补运行态默认值（streaming:false / blocksPending:false / toolCallIds:[] / user 的 sendStatus:'sent'）。
  - **assistant 消息必须 `parseAgentBlocks(m.content)` 重算 displayText**（blocks 优先用持久化的，否则用解析结果）——否则 content 里的原始 agent-blocks JSON 会被渲染层兜底展示给用户。参照 `agUiEventReducer.ts` 的 MESSAGES_SNAPSHOT 分支。
- `deleteSession(id)` 改异步：首行同步 `pendingDeletes.add(id)`、finally `delete(id)`；调 `deleteConversation` 成功后再改本地列表。
- `persist.pick` **移除 `sessions`**，仅留 `['threadId','draftInput']`。

### 3. Composable：`src/components/core/layouts/art-agent-chat/composables/useAgUiAgent.ts`（改造）
- 新增 `switchSession(id)`：先 `abortController?.abort()` + `cleanup()` 再 `await store.loadSession(id)`——**运行中切换必须先中断 SSE**，否则旧流事件会归约进新会话、污染并覆盖历史文件。
- 新增 `removeSession(id)`：删除的是当前会话时先 abort+cleanup 再 `store.deleteSession(id)`。
- `doRun` 收尾、`newChat` 里对异步 store action 加 `void`。
- 导出 `switchSession` / `removeSession`。

### 4. 组件
- `index.vue`：`onMounted` 调 `void chatStore.initSessions()`；历史抽屉 `@pick` / `@remove` 绑到 `agent.switchSession` / `agent.removeSession`（**不要直接绑 store 方法**，要走 composable 以先中断运行）。
- `widget/AgentHistoryDrawer.vue`：条数显示 `s.messages.length` → `s.messageCount`，类型 `ChatSession` → `ConversationMeta`（from `@/api/agentConversation`）。

---

## 五、易踩的坑（务必规避）

1. **后端 DTO 嵌套校验**：`messages` 缺 `@Type()` + `@ValidateNested` 时，白名单/校验对数组元素完全不生效。
2. **白名单字段泄漏**：前端保存前不剥离运行态字段 → 后端 `forbidNonWhitelisted` 直接 400（`property streaming should not exist`）。这是最容易漏的点。
3. **displayText 未重算**：历史 assistant 消息 content 含 `\`\`\`agent-blocks` 围栏，恢复时不重算 displayText，会把原始 JSON 协议文本渲染给用户，且与正常表格重复。
4. **loadSession 早退**：保留 `if (id === threadId) return` 会导致刷新后点击历史无响应（因消息未持久化，threadId 已恢复但消息为空）。
5. **运行中切换/删除竞态**：不经 composable 先 abort，旧 SSE 流会污染新会话；删除当前流式会话不加 pendingDeletes 守卫，doRun 收尾的自动保存会让被删文件"复活"。
6. **base64 数据块**：直接写裸 JSON，当消息正文或载荷含 `<!-- AGENT_SESSION_DATA` 文本时解析错位；用 base64 包裹 + lastIndexOf 定位可根治。
7. **路径穿越**：userId/threadId 必须白名单安全化 + resolve 前缀二次校验。
8. **代理 IPv4/IPv6**：前端 Vite 代理目标若写死 `127.0.0.1` 而后端只监听 `[::1]`（IPv6），会 `ECONNREFUSED` 导致接口全挂、页面跳 500。代理目标用 `localhost` 兼容双栈。

---

## 六、验证清单（完成声明前逐条确认）

- [ ] 后端 `npx tsc --noEmit` exit 0；前端 `npx vue-tsc --noEmit` 本功能文件无错误。
- [ ] 端到端：save → list → info → delete 全通；返回结构正确。
- [ ] UTF-8 中文在 md 文件的 frontmatter/正文/base64 块均正确（用 UTF-8 请求体测，勿用 GBK 终端直接传参）。
- [ ] 富消息：含表格/图表的对话保存后，从历史重新打开 —— 直接渲染表格/图表，**不出现**原始 JSON 文本。
- [ ] 校验：带运行态字段的载荷返回 400；仅白名单字段返回 200。
- [ ] 边界：非法 threadId 删除返回 400；旧格式（非 base64）文件能正常读出；运行中删除当前会话不复活。
- [ ] 修改代码后调用 code-reviewer 审查，CRITICAL/HIGH 必须修复。

---

## 七、交付物清单

**后端（server/）**
- `src/modules/ag-ui/dto/conversation.dto.ts`（新增）
- `src/modules/ag-ui/services/conversation.service.ts`（新增）
- `src/modules/ag-ui/controllers/conversation.controller.ts`（新增）
- `src/modules/ag-ui/ag-ui.module.ts`（注册）
- `.gitignore`（加 `data`）

**前端（frontend/）**
- `src/api/agentConversation.ts`（新增）
- `src/store/modules/aiChat.ts`（改造：后端加载 + 修复点击 + 竞态守卫 + displayText 重算）
- `src/components/core/layouts/art-agent-chat/composables/useAgUiAgent.ts`（switchSession/removeSession）
- `src/components/core/layouts/art-agent-chat/index.vue`（挂载初始化 + 事件绑定走 composable）
- `src/components/core/layouts/art-agent-chat/widget/AgentHistoryDrawer.vue`（messageCount + 类型）



