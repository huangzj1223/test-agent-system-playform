<div align="center">

# AI 开发交付平台

**以规格驱动、智能体编排为核心的一站式 AI 能力治理与交付平台**

覆盖模型配置、智能体对话、长期记忆、安全策略、工具与技能的统一接入与治理

![Vue](https://img.shields.io/badge/Vue-3.5-42b883)
![NestJS](https://img.shields.io/badge/NestJS-11-e0234e)
![Prisma](https://img.shields.io/badge/Prisma-6-2d3748)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

## 📖 项目简介

在企业将大语言模型接入实际业务的过程中，普遍面临模型接入分散、密钥管理无序、智能体行为缺乏统一治理、长期记忆难以沉淀、工具与技能能力无序扩张等问题。

**AI 开发交付平台** 为解决上述痛点而建，围绕「规格驱动 + 智能体编排」两大核心，提供从模型底座到智能体能力开放的全链路统一治理：

- **统一模型接入与保护** — 集中管理模型服务商与模型配置，密钥加密存储、按需解密取用，杜绝敏感配置随请求传输。
- **可治理的智能体对话** — 支持多种交互形态的 AI 对话，运行时自动注入长期记忆与系统上下文，对话/技能/工具运行情况纳入统一日志。
- **长期记忆管控体系** — 以结构化记忆文件承载智能体身份、用户偏好与项目上下文，写入全程经安全治理与版本留痕，支持人工确认、审批、版本回滚。
- **智能体行为安全治理** — 对命令、数据、工具、记忆等操作按风险等级统一校验，支持敏感内容拦截、黑白名单、人工确认与审批工单流转。
- **工具与技能能力开放** — 对可调用工具与可执行技能进行统一登记、权限分级、版本管理与调用留痕，能力开放范围清晰可控。

## ✨ 核心功能

| 模块 | 能力概述 |
|------|---------|
| 用户认证与登录 | 账号登录、图形验证码校验、身份鉴权 |
| 组织管理 | 部门、岗位、用户的统一维护 |
| 权限管理 | 角色、菜单与功能权限的分配 |
| 模型配置 | 模型服务商与模型的接入、密钥保护、连接测试 |
| AI 对话 | 支持多种交互形态的智能体对话与会话历史 |
| 对话设置 | 对话参数与系统提示词的个性化配置 |
| 记忆中心 | 长期记忆文件管理、版本回滚、待确认记忆、模型建议、命中率统计 |
| 安全策略 | 风险等级、敏感词、黑白名单、审批工单的统一治理 |
| 工具权限 | 智能体可调用工具的登记、权限分级与调用留痕 |
| 技能管理 | 可执行技能的登记、版本管理与联动编排 |

## 🖼️ 系统截图

### 系统架构

![系统架构图](docs/01-需求与规划/images/system-architecture.png)

### 界面预览

| 预览 1 | 预览 2 | 预览 3 |
|:---:|:---:|:---:|
| ![预览1](docs/原型/1.png) | ![预览2](docs/原型/2.png) | ![预览3](docs/原型/3.png) |

## 🛠️ 技术栈

| 端 | 目录 | 技术栈 | 端口 |
|----|------|--------|------|
| 后端服务 | `server/` | NestJS 11 · Prisma 6 · MySQL 8 · Redis 7 · TypeScript | 9001 |
| 管理端 | `backend/` | Vue 3.5 · Element Plus · Vite | 5173 |
| 前台 Web | `frontend/` | Vue 3.5 · Element Plus · Pinia · Vite | 3006 |
| 移动端 | `mobile/` | Vue 3 · Vant 4 · Capacitor | 3000 |

## 📂 目录结构

```
ceshi0701/
├── server/          # 后端服务：API、数据库、业务逻辑（NestJS + Prisma）
│   └── docker/      #   生产/开发 docker-compose 与部署配置
├── backend/         # 管理端：后台管理界面（Vue 3 + Element Plus）
├── frontend/        # 前台 Web：面向用户的 Web 端（Vue 3 + Element Plus）
├── mobile/          # 移动端应用（Vue 3 + Vant + Capacitor）
├── deploy/          # 一键启动/停止脚本（跨平台）
├── docs/            # 需求规格、架构图、原型与执行计划
└── scripts/         # 辅助脚本
```

## 🚀 部署与启动

### 环境要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | ≥ 20 | 四端运行环境 |
| npm | ≥ 8 | 包管理器 |
| Docker | 最新稳定版 | 用于拉起 MySQL / Redis 容器 |
| pnpm | ≥ 8（可选） | 后端部分脚本使用 |

> 启动前请确保 **Docker Desktop 已运行**，后端首次启动会自动拉起 MySQL / Redis 容器并建表。

### 获取代码

```bash
git clone https://github.com/wenxinzhang/CESHI0701.git
cd CESHI0701
```

### 方式一：一键启动全栈开发环境（推荐）

脚本会自动检查依赖、按需安装 `node_modules`、拉起后端容器并建表、并行启动四端服务。

**Linux / macOS：**

```bash
bash deploy/start-all.sh     # 启动全部
bash deploy/stop-all.sh      # 停止全部
```

**Windows：**

```powershell
# PowerShell
./deploy/start-all.ps1
./deploy/stop-all.ps1

# 或 CMD
deploy\start-all.cmd
```

启动完成后：

| 服务 | 地址 |
|------|------|
| 后端 server | http://localhost:9001 （API 文档：`/docs`） |
| 前台 frontend | http://localhost:3006 |
| 管理端 backend | http://localhost:5173 |
| 移动端 mobile | http://localhost:3000 |
| 数据库 GUI（Prisma Studio） | http://localhost:5555 |

> **默认管理员账号**：`admin` / `123456`（首次登录后请及时修改）
> 服务日志位于 `deploy/logs/<服务名>.log`。

### 方式二：分端手动启动

> 手动部署适合需要精细控制端口 / 环境变量的场景。以下步骤基于仓库自带的开发配置，**请特别留意端口**：dev 容器把 MySQL 映射到宿主机 **3307**、Redis 映射到 **6380**（不是默认的 3306 / 6379）。

**1. 启动中间件（MySQL + Redis）**

```bash
cd server
npm run docker:dev      # 拉起 server/docker/docker-compose.dev.yaml 中的 MySQL + Redis
```

自带的 dev 容器默认：MySQL `root/123456`、数据库 `agentpm`、宿主端口 `3307`；Redis 宿主端口 `6380`、**无密码**。

**2. 安装后端依赖（先装依赖，再用 Prisma）**

```bash
cd server
npm install             # 必须先装依赖：package.json 已锁 Prisma 6，装完用本地 prisma 就是 6
```

> ⚠️ 不要在 `npm install` 之前直接跑 `npx prisma`，否则 npx 会临时拉取最新版（Prisma 7），与本项目不兼容。

**3. 初始化数据库**

```bash
cd server
export DATABASE_URL="mysql://root:123456@127.0.0.1:3307/agentpm"

npx prisma generate         # 生成 Prisma Client
npm run prisma:push         # 建表并同步注释
npm run prisma:seed         # 初始化种子数据（默认管理员 admin/123456）
```

> 国内网络若 Prisma 二进制下载失败，先设镜像源再执行：
> `export PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma`

**4. 启动后端服务**

```bash
cd server

# 关键环境变量（变量名与代码一致）
export SERVER_PORT=9001                              # 端口被占用时改 9002 等
export DATABASE_URL="mysql://root:123456@127.0.0.1:3307/agentpm"
export JWT_SECRET="改成强随机值"                       # JWT 签名密钥，未配置服务无法启动
export MODEL_CONFIG_ENC_KEY="改成强随机值"             # 模型 API Key 加密密钥，保存模型配置时必需
export REDIS_HOST="127.0.0.1"
export REDIS_PORT=6380                                # 对应 dev 容器映射端口
# export REDIS_PASSWORD="..."                         # 仅当你给 Redis 设了密码才需要

npm run start:dev           # 开发模式（热重载），访问 http://localhost:9001，API 文档 /docs
```

**5. 启动各前端**

各前端 clone 后需从模板生成本地环境配置（Vite 只加载 `.env` / `.env.local`，不加载 `.env.example`）：

```bash
# 前台 Web
cd frontend
cp .env.example .env.local        # 默认 VITE_API_URL=/ 走 Vite 代理，代理目标 VITE_API_PROXY_URL
# 若后端改了端口（如 9002），同步修改 .env.local 里的 VITE_API_PROXY_URL
npm install && npm run dev        # http://localhost:3006

# 管理端
cd backend  && npm install && npm run dev      # http://localhost:5173

# 移动端
cd mobile   && npm install && npm run dev      # http://localhost:3000
```

> 需要局域网 / 其他机器访问时，前端启动加 `--host`，并将访问地址里的 `localhost` 换成本机 IP。后端局域网访问见下方常见问题。

### 方式三：Docker 生产部署

生产环境通过 `server/docker/docker-compose.yaml` 编排 MySQL、Redis、后端与 Nginx。

```bash
cd server/docker
cp .env.example .env          # 复制环境变量模板
# 编辑 .env，替换所有 change_me_* 占位值为强密码/强随机密钥
vi .env

docker compose up -d          # 启动生产容器
docker compose down           # 停止
```

`.env` 关键配置项（**上线前务必全部替换占位值**）：

| 变量 | 说明 |
|------|------|
| `MYSQL_ROOT_PASSWORD` / `MYSQL_PASSWORD` | 数据库密码（改为强密码） |
| `REDIS_PASSWORD` | Redis 密码（改为强密码） |
| `JWT_SECRET` | JWT 签名密钥（改为强随机值） |
| `BACKEND_IMAGE` / `FRONTEND_IMAGE` | 镜像地址（改为你的仓库） |
| `HTTP_PORT` / `HTTPS_PORT` | Nginx 对外端口 |

> 详细生产部署说明见 [`server/docker/DEPLOY.md`](server/docker/DEPLOY.md)。

## 🔧 常用命令

**后端（`server/`）**

```bash
npm run start:dev       # 开发模式（热重载）
npm run build           # 构建
npm run start:prod      # 生产运行
npm run prisma:studio   # 打开数据库 GUI（http://localhost:5555）
npm run prisma:migrate  # 创建/应用数据库迁移
```

**前端（`frontend/` · `backend/` · `mobile/`）**

```bash
npm run dev             # 开发模式
npm run build           # 生产构建
npm run preview         # 预览构建产物
```

## ❓ 常见问题（部署踩坑）

以下为实际从 GitHub 拉取部署时遇到的高频问题与解决办法。

**Q1. Prisma 报 `datasource property url is no longer supported` / schema 校验失败**
根因：未先装依赖就跑 `npx prisma`，npx 临时拉取了 Prisma 7（本项目用 Prisma 6，不兼容）。
解决：先在 `server/` 执行 `npm install`（`package.json` 已锁 `^6.0.0`），之后一律使用本地 prisma。必要时可显式重装：`npm install prisma@6 @prisma/client@6 --save`。

**Q2. Prisma 二进制下载失败（`request to https://binaries.prisma.sh/... failed`）**
根因：国内网络无法访问 Prisma 官方二进制源。
解决：设镜像源后再生成：
```bash
export PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
npx prisma generate
```

**Q3. 连不上数据库 / Redis**
根因：dev 容器映射的是宿主机 **3307（MySQL）** 和 **6380（Redis）**，不是默认端口。
解决：`DATABASE_URL` 用 `...@127.0.0.1:3307/agentpm`，`REDIS_PORT` 设 `6380`。

**Q4. 端口 9001 被占用（`EADDRINUSE :::9001`）**
根因：MinIO 或其他服务占用了 9001。
解决：后端改端口 `export SERVER_PORT=9002`，并同步把前端 `.env.local` 的 `VITE_API_PROXY_URL` 改为 `http://localhost:9002`。

**Q5. 后端启动报 `JWT_SECRET 未配置` / 保存模型配置报 `MODEL_CONFIG_ENC_KEY 未配置`**
解决：启动前设置这两个密钥环境变量：
```bash
export JWT_SECRET="改成强随机值"
export MODEL_CONFIG_ENC_KEY="改成强随机值"
```

**Q6. Redis 认证失败（`NOAUTH Authentication required`）**
根因：你给 Redis 设了密码，但后端没配。
解决：保持两端一致——若在 compose 中用 `command: redis-server --requirepass 123456` 设了密码，后端就要 `export REDIS_PASSWORD="123456"`；仓库自带 dev 容器默认无密码，可不设。

**Q7. 前端提示 `use --host to expose` / 局域网访问不了前端**
解决：启动前端时加 `--host`，例如 `npx vite --port 3006 --host`。

**Q8. 前端请求跨域或 404**
根因：前端直连后端、绕过了 Vite 代理。
解决：`.env.local` 中 `VITE_API_URL=/`（走相对路径 + Vite 代理），`VITE_API_PROXY_URL` 指向后端地址。

**Q9. 其他机器 / 外网访问不到后端**
根因：NestJS 默认只监听 localhost。
解决：编辑 `server/src/main.ts`，将 `await app.listen(port);` 改为 `await app.listen(port, '0.0.0.0');`，并把访问地址里的 `localhost` 换成服务器 IP（如 `192.168.0.121`）。

## 📋 完整环境变量清单

```bash
# ===== 后端（server/）=====
export SERVER_PORT=9001                                   # 端口，被占用可改 9002
export DATABASE_URL="mysql://root:123456@127.0.0.1:3307/agentpm"
export JWT_SECRET="改成强随机值"                            # JWT 签名密钥（必需）
export MODEL_CONFIG_ENC_KEY="改成强随机值"                  # 模型 API Key 加密密钥（保存模型配置时必需）
export REDIS_HOST="127.0.0.1"
export REDIS_PORT=6380                                     # 对应 dev 容器映射端口
# export REDIS_PASSWORD="123456"                           # 仅当 Redis 设了密码
# export CORS_ORIGINS="http://192.168.0.121:3006"          # 生产限定允许来源（可选）

# ===== 前端（frontend/.env.local）=====
# VITE_API_URL=/
# VITE_PORT=3006
# VITE_API_PROXY_URL=http://localhost:9001                 # 后端改端口时同步修改
```

## ⚠️ 安全提示

- 仓库不包含任何真实密钥。`.env` 已被 `.gitignore` 忽略，仅保留 `.env.example` 模板。
- 部署时请复制模板为 `.env` 并替换所有占位密码 / 密钥为强随机值。
- 默认管理员密码 `admin / 123456` 仅用于本地开发，生产环境务必修改。

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源，允许自由使用、复制、修改、合并、发布、分发，**可用于商业用途，可二次开发**。使用时请保留原始版权声明与许可声明。







