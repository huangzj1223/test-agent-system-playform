# CLAUDE.md

本文件为 AI 编码助手（Claude Code 等）提供本项目的协作指引。

## 语言要求

所有面向用户的回复、进度汇报、问题描述、代码注释说明一律使用**中文**。代码中的变量名、函数名等标识符保持英文。

## 项目简介

AI 开发交付平台：以规格驱动、智能体编排为核心，覆盖模型配置、智能体对话、长期记忆、安全策略、工具与技能的统一接入与治理。详见 [README.md](README.md)。

## 项目架构

```
ceshi0701/
├── server/          # 后端服务：API、数据库、业务逻辑
├── backend/         # 管理端：后台管理界面
├── frontend/        # 前台 Web：面向用户的 Web 端
├── mobile/          # 移动端应用
├── deploy/          # 一键启动/停止脚本
└── docs/            # 需求规格、架构图、原型与执行计划
```

### 各目录职责与技术栈

| 目录 | 职责 | 技术栈 | 端口 |
|------|------|--------|------|
| `server/` | 后端服务：API、数据库、业务逻辑 | NestJS 11 + Prisma 6 + MySQL 8 + Redis 7 + TypeScript | 9001 |
| `backend/` | 管理端/后台管理界面 | Vue 3 + Element Plus + Vite | 5173 |
| `frontend/` | 前台面向用户的 Web 端 | Vue 3 + Element Plus + Pinia + Vite | 3006 |
| `mobile/` | 移动端应用 | Vue 3 + Vant + Capacitor | 3000 |
| `deploy/` | 一键启动/停止脚本 | Shell / PowerShell | - |

## 构建与验证命令

**后端（`server/`）**

```bash
npm run start:dev       # 开发模式（热重载）
npm run build           # 构建
npm run prisma:push     # 建表并同步注释
```

**前端（`frontend/` · `backend/` · `mobile/`）**

```bash
npm run dev             # 开发模式
npm run build           # 生产构建（含类型检查）
```

启动、部署详见 [README.md](README.md)。

## 编码规范

### 克制原则

只做被要求的事，不自作主张添加额外内容。需求里没提到的视觉效果、交互效果、样式属性一律不加。

### 硬性规则

1. 单文件行数 ≤ 500 行；单个函数/方法 ≤ 80 行
2. 禁止 `console.log`，调试日志提交前必须清除
3. 禁止裸写 `fetch` / `XMLHttpRequest`，统一通过项目封装的 `request` 工具
4. 禁止在组件内直接操作 DOM，使用 Vue 响应式或 `ref`
5. 新增页面必须同步添加路由
6. 导出的函数/接口必须有 JSDoc 注释
7. 用户输入、外部 API 返回值、URL 参数等外部数据，必须在使用前校验

### 注释规范

- Vue 组件：`<script setup>` 顶部写组件用途（1-2 行），功能块前加单行注释
- TypeScript：导出函数/接口前写 JSDoc
- CSS：非显而易见的样式值加注释说明原因

### 配置保护

禁止修改 `.eslintrc.*`、`.prettierrc.*`、`tsconfig.json`、`vite.config.*` 来消除报错。修代码，不改规则。

## Git 规范

- 使用 Conventional Commits 格式：`<type>(<scope>): <description>`（type：feat/fix/refactor/style/docs/test/chore）
- 逐文件 stage，避免 `git add .` 意外提交敏感文件
- 禁止提交 `.env`、密钥、Token 等敏感文件（已在 `.gitignore` 中排除）
- 不直接推送到 main/master（除非明确要求）

## 验证原则

完成声明前必须运行构建/测试命令并看到通过输出，不接受"应该没问题"。


