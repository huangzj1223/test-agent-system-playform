# WEB 产品经理原型 AI 框架 - 开发文档

基于 Vue 3 + Vite 的产品经理原型 AI 框架，使用 AI 根据框架快速生成页面和功能。

## 技术栈

- **框架**：Vue 3.5 + Composition API
- **构建工具**：Vite 7.1
- **语言**：TypeScript 5.6
- **UI 组件库**：Element Plus 2.11
- **状态管理**：Pinia 3.0 + pinia-plugin-persistedstate
- **路由**：Vue Router 4.x
- **HTTP 客户端**：Axios 1.12
- **图表库**：ECharts 5.6 + @antv/g2 5.4
- **富文本编辑器**：@wangeditor/editor 5.1
- **实时通信**：Socket.io-client 4.8
- **国际化**：Vue I18n 9.14
- **工具库**：@vueuse/core, dayjs, crypto-js

## 开发规范

所有开发规范已拆分到 [`docs/`](./docs/) 目录，按主题分文档管理。**生成或修改代码前请查阅对应规范。**

| 文档 | 内容 |
|------|------|
| [docs/INDEX.md](./docs/INDEX.md) | 文档索引 + 核心约定（最高优先级） |
| [01-快速开始](./docs/01-快速开始.md) | 环境、安装、启动、构建、Mock 开关 |
| [02-项目结构](./docs/02-项目结构.md) | 目录组织、各层职责 |
| [03-路由与菜单规范](./docs/03-路由与菜单规范.md) | 菜单结构、路由配置、子路由路径规则 |
| [04-布局规范](./docs/04-布局规范.md) | 卡片、Flex 布局、筛选表单、面包屑 |
| [05-API与Mock规范](./docs/05-API与Mock规范.md) | request 用法、集中式 Mock 拦截 |
| [06-组件使用规范](./docs/06-组件使用规范.md) | 滚动条、表格、按钮、拖动排序 |
| [07-国际化规范](./docs/07-国际化规范.md) | 页面中文直写、菜单多语言 |

## 核心约定（必读）

- **组件自动导入**：无需手动 import Element Plus 组件
- **Mock 模式默认启用**：`.env` 中 `VITE_USE_MOCK = true`，不要关闭
- **不要 `pnpm dev`**：开发完由用户自行 dev，但需 `pnpm build` 验证代码合规无报错
- **Mock 数据固定**：用固定数据，不用随机数据
- **AI 永远用中文回复**
