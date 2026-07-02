# 本地服务启动说明

这份文档说明当前工程在本地开发时需要启动哪些服务、各服务的用途、启动顺序和健康检查方式。以下命令默认在 Windows PowerShell 中执行，项目根目录为：

```powershell
D:\install\PycharmProjects\test-agent-system-platform
```

## 一、服务总览

| 服务 | 默认地址 | 是否必须 | 作用 |
| --- | --- | --- | --- |
| PostgreSQL | `localhost:5432` | 必须 | 主业务库，保存项目、用例、脚本、执行记录、失败分析闭环等数据 |
| MongoDB | `.env` 中 `MONGODB_HOST:MONGODB_PORT` | 建议启动 | 保存部分执行日志、导出任务等非结构化数据 |
| MinIO | `.env` 中 `MINIO_ENDPOINT` | 必须 | 保存上传文件、脚本、测试报告、附件、AI 生成产物等对象文件 |
| Redis | `.env` 中 `REDIS_URI` | LangGraph Postgres 模式必须 | LangGraph 队列和运行时依赖 |
| 后端 API 服务 | `http://localhost:8001` | 必须 | 系统业务接口，前端主要访问它 |
| LangGraph Agent 服务 | `http://localhost:2026` | AI 功能必须 | AI 测试用例生成、API Agent、Web Agent、安全 Agent |
| 前端 UI 服务 | `http://localhost:3000` | 必须 | 浏览器访问的管理界面 |

最小可用组合：

- 只看普通页面和已有数据：PostgreSQL + MinIO + 后端 API + 前端 UI。
- 使用 AI 测试用例生成：再启动 LangGraph Agent 服务。
- 使用测试执行、报告、附件下载：确认 MinIO 可用。
- 使用 LangGraph Postgres 持久化：确认 Redis 和 PostgreSQL 可用。

## 二、第一次准备

在项目根目录安装 Python 依赖：

```powershell
cd D:\install\PycharmProjects\test-agent-system-platform
uv sync
```

安装前端依赖：

```powershell
cd D:\install\PycharmProjects\test-agent-system-platform\ui
npm install
```

检查配置文件：

- 后端和 LangGraph 主要读取根目录 `.env`。
- 前端读取 `ui\.env.local`。
- 前端当前配置应指向：

```env
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_LANGGRAPH_API_URL=http://localhost:2026
NEXT_PUBLIC_TESTCASE_GENERATOR_ASSISTANT_ID=testcase_generator_agent
```

注意：不要把 `.env` 中的 API Key、数据库密码、MinIO 密钥复制到文档或提交记录里。

## 三、数据库迁移

每次拉取代码或新增迁移文件后，先执行数据库迁移。迁移文件不是手工执行 SQL，而是用 Alembic 统一升级。

```powershell
cd D:\install\PycharmProjects\test-agent-system-platform\backend
..\.venv\Scripts\python.exe -m alembic upgrade head
```

如果看到表或字段不存在，优先检查这一步有没有执行成功。

## 四、启动后端 API 服务

后端 API 是前端业务页面的主要接口服务，默认端口来自 `.env` 的 `APP_PORT=8001`。

```powershell
cd D:\install\PycharmProjects\test-agent-system-platform
.\.venv\Scripts\python.exe backend\app\main.py
```

健康检查：

```powershell
Invoke-RestMethod http://localhost:8001/health
```

接口文档：

```text
http://localhost:8001/docs
```

## 五、启动 LangGraph Agent 服务

LangGraph 服务负责所有 Agent 能力。AI 测试用例生成窗口没有响应时，首先检查这个服务是否启动。

### 推荐：本地快速开发模式

```powershell
cd D:\install\PycharmProjects\test-agent-system-platform
.\.venv\Scripts\python.exe start_server.py
```

健康检查：

```powershell
Invoke-RestMethod http://localhost:2026/ok
```

返回下面内容表示服务可用：

```json
{
  "ok": true
}
```

确认 Agent 已加载：

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://localhost:2026/assistants/search `
  -ContentType application/json `
  -Body "{}"
```

结果中应能看到：

- `testcase_generator_agent`
- `api_agent`
- `web_agent`
- `security_agent`

### 持久化运行模式

如果需要 LangGraph 的线程、运行状态持久化，使用 Postgres 模式：

```powershell
cd D:\install\PycharmProjects\test-agent-system-platform
.\.venv\Scripts\python.exe start_server_postgres.py
```

这个模式依赖：

- `.env` 中 `POSTGRES_URI` 或 `DATABASE_URI`
- `.env` 中 `REDIS_URI`
- `langgraph.json` 中配置的 graph

## 六、启动前端 UI

```powershell
cd D:\install\PycharmProjects\test-agent-system-platform\ui
npm run dev
```

浏览器访问：

```text
http://localhost:3000
```

如果页面能打开但接口报错，检查：

- `NEXT_PUBLIC_API_URL` 是否是 `http://localhost:8001`
- 后端 API 服务是否启动
- 浏览器控制台是否有 CORS 或 500 错误

如果 AI 测试用例生成没有返回，检查：

- `NEXT_PUBLIC_LANGGRAPH_API_URL` 是否是 `http://localhost:2026`
- LangGraph 服务 `/ok` 是否返回 `{ "ok": true }`
- `/assistants/search` 是否能看到 `testcase_generator_agent`

## 七、推荐启动顺序

### 完整开发环境

1. 启动 PostgreSQL、MongoDB、MinIO、Redis。
2. 执行数据库迁移。
3. 启动后端 API 服务。
4. 启动 LangGraph Agent 服务。
5. 启动前端 UI 服务。
6. 打开 `http://localhost:3000` 验证功能。

### 只调业务接口和页面

1. 启动 PostgreSQL、MinIO。
2. 执行数据库迁移。
3. 启动后端 API 服务。
4. 启动前端 UI 服务。

### 只调 AI 测试用例生成

1. 启动后端 API 服务。
2. 启动 LangGraph Agent 服务。
3. 启动前端 UI 服务。
4. 进入项目的“测试用例”页面，打开“AI 测试用例生成”。

## 八、常用检查命令

检查端口：

```powershell
Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue
Get-NetTCPConnection -LocalPort 2026 -ErrorAction SilentlyContinue
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
```

检查后端：

```powershell
Invoke-RestMethod http://localhost:8001/health
```

检查 LangGraph：

```powershell
Invoke-RestMethod http://localhost:2026/ok
```

检查前端类型：

```powershell
cd D:\install\PycharmProjects\test-agent-system-platform\ui
npx.cmd tsc --noEmit
```

## 九、常见问题

### 1. AI 测试用例生成窗口发送后没有内容

优先检查 LangGraph：

```powershell
Invoke-RestMethod http://localhost:2026/ok
```

如果连接失败，启动：

```powershell
cd D:\install\PycharmProjects\test-agent-system-platform
.\.venv\Scripts\python.exe start_server.py
```

如果 `/ok` 正常但仍不生成，继续检查 `/assistants/search` 是否存在 `testcase_generator_agent`。

### 2. 接口提示表或字段不存在

执行迁移：

```powershell
cd D:\install\PycharmProjects\test-agent-system-platform\backend
..\.venv\Scripts\python.exe -m alembic upgrade head
```

### 3. 上传、下载、报告预览失败

检查 MinIO 配置和桶：

- `.env` 中 `MINIO_ENDPOINT`
- `.env` 中 `MINIO_BUCKET`
- MinIO 服务是否能访问
- 后端日志中是否有 MinIO 连接失败

### 4. UI 自动化执行在 Codex 沙箱里失败

Playwright 浏览器进程在 Codex Windows 沙箱中可能被系统拦截。UI 自动化执行建议在普通 PowerShell、PyCharm Terminal、Docker 或 CI 环境中运行，不要依赖 Codex 沙箱内启动浏览器。

### 5. 端口被占用

查看占用进程：

```powershell
Get-NetTCPConnection -LocalPort 2026 -ErrorAction SilentlyContinue
```

如果需要更换端口，要同步修改：

- 服务启动脚本中的端口
- `ui\.env.local` 中对应的 `NEXT_PUBLIC_*_URL`

## 十、当前工程里几个关键文件

| 文件 | 作用 |
| --- | --- |
| `.env` | 后端 API、LangGraph、数据库、MinIO、模型等配置 |
| `ui\.env.local` | 前端访问后端 API 和 LangGraph 的地址 |
| `backend\app\main.py` | 后端 API 服务入口 |
| `start_server.py` | LangGraph 本地快速开发入口 |
| `start_server_postgres.py` | LangGraph Postgres 持久化入口 |
| `langgraph.json` | LangGraph Agent 配置 |
| `graph.json` | 本地 LangGraph 启动脚本读取的 graph 配置 |
| `backend\alembic\versions` | 数据库迁移脚本目录 |

