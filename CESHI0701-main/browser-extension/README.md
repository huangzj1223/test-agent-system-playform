# 跨网页悬浮智能体（Chrome 扩展 · MV3）

在右侧 AG-UI 智能体输入「打开百度首页」后，扩展在新标签打开百度并注入**悬浮智能体**，用户可继续在百度页面上让智能体执行搜索、点击、滚动等操作。

> **已完成阶段一 + 阶段二**：
> - 阶段一：打开百度 → 悬浮体出现 → 「搜索X」自动完成（本地意图解析兜底）。
> - 阶段二：**自含大脑 + 会话交接**。右侧智能体的会话/模型/JWT/历史交接给悬浮体；悬浮体内 offscreen document 常驻跑 AG-UI（`@ag-ui/client` HttpAgent 直连后端 `/api/ag-ui`），模型自主决定调用 `browser.*` 工具操作页面，流式回显。有模型交接时走大脑，否则回落本地意图。刷新/跳转后自动恢复悬浮体与会话；「停止」/关闭可立即中止大脑对页面的操作。

## 目录结构

```
browser-extension/
├── manifest.json              # MV3 清单，最小权限
├── vite.config.ts             # crxjs + Vue 构建
├── src/
│  ├── shared/                 # 跨端共享
│  │  ├── message-types.ts     # 统一消息协议
│  │  ├── browser-action-schema.ts  # 11 类白名单页面操作 Schema
│  │  └── session-store.ts     # 悬浮体/标签恢复状态（chrome.storage.session）
│  ├── background/service-worker.ts  # 标签编排、消息路由(含 offscreen)、注入通知
│  ├── bridge/spa-bridge.ts    # 注入 localhost，中转 SPA ↔ 扩展
│  ├── offscreen/
│  │  ├── offscreen.html       # 常驻隐藏页
│  │  └── brain.ts             # AG-UI 大脑：HttpAgent 连后端、工具循环、可中止
│  └── content/
│     ├── content-script.ts    # 注入悬浮体、执行页面操作、刷新恢复
│     ├── FloatingAgent.vue    # 悬浮 UI（Shadow DOM）：大脑/本地双模式
│     ├── browser-actions.ts   # 11 类操作的真实 DOM 执行
│     └── locator.ts           # ARIA 优先的元素定位
```

SPA 侧改动（`frontend/src/`）：
- `agent/extension-bridge.ts`：探测扩展、`window.postMessage` 请求-响应、`openUrlViaExtension(url, handoff)`
- `agent/web-tools.ts`：`ui.openWeb` 优先走扩展；`buildHandoff()` 交接 token/threadId/model/messages/apiBase

## 构建与安装

1. 构建扩展：

   ```bash
   cd browser-extension
   npm install --legacy-peer-deps
   npm run build          # 产物在 dist/
   ```

2. 加载到 Chrome：
   - 打开 `chrome://extensions`
   - 右上角开启「开发者模式」
   - 点「加载已解压的扩展程序」，选择 `browser-extension/dist` 目录
   - 加载后扩展会为 localhost 注入桥接脚本；首次操作外部站点（如百度）时会弹出权限请求，点「允许」

3. 开发热更新：`npm run dev`（`vite build --watch`，改动自动重建 dist，Chrome 扩展页点「刷新」）

## 本地启动（配合主系统）

```bash
# 后端
cd server && npm run start:dev
# 前端
cd frontend && npm run dev
```

浏览器访问前端地址（如 `http://localhost:3006`），确保扩展已加载。

## 百度搜索测试步骤

1. 打开主系统页面，右侧「模型配置」确保已启用一个模型（大脑模式需要）
2. 右侧 AG-UI 智能体输入：**打开百度首页**
3. 扩展在新标签打开百度（首次弹权限请求点「允许」），右下角出现悬浮智能体，顶部显示交接来的模型名与会话历史
4. 在悬浮体输入：**搜索人工智能**
   - 有模型交接时：由 offscreen 大脑驱动，模型自主调用 `get_page_context`→`type_text`→`click_element`，流式显示过程
   - 无模型时：回落本地意图解析，同样完成搜索
5. 其他可试指令：`向下滚动`、`返回上一页`、`提取页面内容`、`点击XX结果`
6. 运行中点「停止」或关闭悬浮体：立即中止大脑对页面的操作

## 安全限制说明

- **白名单操作**：智能体只能执行 `browser-action-schema.ts` 声明的 11 类操作，**不执行任意 JS**。
- **敏感输入保护**：密码/验证码/银行卡/CVV 等输入框禁止自动填写（`browser-actions.ts` 的 `isSensitiveInput`）。
- **最小权限**：默认只持有 localhost host 权限；访问外部站点用 `optional_host_permissions` 动态申请，用户授权后才注入。
- **可立即停止**：悬浮体「停止」/「关闭」经 `STOP_TASK` 中止 offscreen 大脑运行（`AbortController`），进行中的工具（含 `wait_for_element`，硬上限 15s）也会尽快跳出。
- **同源校验**：桥接消息校验 `origin`，防第三方页面伪造指令。
- **JWT 交接（原型取舍）**：当前把业务 JWT 经 handoff 存 `chrome.storage.session` 供大脑跨源调后端。仅限本地原型；生产应改为后端签发短期会话票据，不下发长期 token 到扩展。
- **后端 CORS**：dev 环境后端 `origin:true` 已放行扩展源，无需改码；生产需在 `CORS_ORIGINS` 显式加入扩展源。

## 尚未实现的能力（后续阶段）

- **阶段三**：`wait_for_element` 驱动的跳转后续复杂编排；ARIA 定位进一步增强；跨多标签任务。
- **阶段四**：悬浮窗 8 向缩放、几何持久化、高风险操作（提交/支付/删除）执行前确认卡片、14 类异常显性提示分类、操作审计落库、工具治理开关同步。
- **生产化**：JWT 改后端会话票据；CSP 严格站点下的注入兼容；`apiBase` 固定为可信后端（当前取自 SPA origin）。
