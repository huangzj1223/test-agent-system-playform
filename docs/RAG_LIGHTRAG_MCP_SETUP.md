# LightRAG + MCP + Testcase Agent Setup

本文档说明本项目的知识库增强方案。当前项目采用：

- LightRAG: 独立知识库 / Graph RAG 服务，默认 `http://localhost:9621`
- RAG MCP Server: 本项目内置适配层，默认 `http://localhost:8008/sse`
- testcase agent: 通过 LangGraph runtime context 启用 RAG，并按项目 ID 隔离检索空间

## 已完成的项目内集成

本项目已补齐以下链路：

- `testcase agent` 支持 `enable_rag` 和 `rag_space_id` 上下文。
- 前端测试用例 AI 生成弹窗支持“启用知识库增强”。
- 前端会把 `projectId` 作为 `rag_space_id` 传给 agent。
- RAG MCP 地址统一使用 `RAG_MCP_URL`，不再混用 `8002` / `8008`。
- RAG MCP Server 暴露 `rag_query_data`、`rag_graph_search`、`rag_graph_get`、`rag_graph_labels`、`rag_document_status`、`rag_health`。
- RAG 工具加载支持 async LangGraph 路径，MCP 服务后启动时也可以恢复加载。

## 仍需外部启动的部分

LightRAG 服务本身不是本仓库的一部分，需要单独部署。官方仓库：

- https://github.com/HKUDS/LightRAG

LightRAG 官方 README 提供两种主流启动方式：

- `uv tool install "lightrag-hku[api]"` 后运行 `lightrag-server`
- 克隆官方仓库后配置 `.env`，使用 `docker compose up`

## 环境变量

本项目根目录 `.env` 已加入默认配置：

```env
RAG_BASE_URL=http://localhost:9621
RAG_MCP_URL=http://localhost:8008/sse
RAG_MCP_PORT=8008
RAG_API_KEY=
RAG_USERNAME=admin
RAG_PASSWORD=admin123
RAG_SPACE_ID=cmp_space
RAG_TIMEOUT=120
```

生产环境建议：

- 修改默认账号密码。
- 如果 LightRAG 使用 API Key，优先配置 `RAG_API_KEY`。
- 每个项目使用独立 `space_id`；前端当前默认传 `projectId`。

## 启动方式

### 1. 启动 LightRAG

方式 A: Docker Compose

```powershell
git clone https://github.com/HKUDS/LightRAG.git
cd LightRAG
copy env.example .env
# 编辑 .env，配置 LLM、Embedding、存储后端、认证等
docker compose up
```

方式 B: uv 工具安装

```powershell
uv tool install "lightrag-hku[api]"
# 准备 LightRAG .env，配置 LLM 和 Embedding
lightrag-server
```

启动后确认 LightRAG API 地址为：

```text
http://localhost:9621
```

### 2. 启动本项目 RAG MCP Server

在项目根目录执行：

```powershell
cd backend
..\.venv\Scripts\python.exe -m app.mcp.rag_server --transport sse --port 8008
```

如需指定 LightRAG 地址：

```powershell
$env:RAG_BASE_URL="http://localhost:9621"
$env:RAG_MCP_PORT="8008"
..\.venv\Scripts\python.exe -m app.mcp.rag_server --transport sse --port 8008
```

### 3. 启动业务后端

```powershell
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

### 4. 启动 LangGraph 服务

在项目根目录执行：

```powershell
.\.venv\Scripts\python.exe start_server.py
```

默认地址：

```text
http://localhost:2026
```

### 5. 启动前端

```powershell
cd ui
npm run dev -- -p 3000
```

## 使用方式

1. 打开测试用例页面。
2. 点击 AI 生成测试用例或从文档生成。
3. 保持“启用知识库增强”勾选。
4. 提交后，前端会把以下上下文传给 testcase agent：

```json
{
  "project_identifier": "<projectId>",
  "folder_id": "<selectedFolderId>",
  "template_type": "test_case",
  "enable_rag": true,
  "rag_space_id": "<projectId>"
}
```

agent 会调用 RAG 工具时携带 `space_id=<projectId>`。

## 验证

LightRAG:

```powershell
curl http://localhost:9621/health
```

RAG MCP:

```powershell
curl http://localhost:8008/sse
```

MCP SSE 端点通常会保持连接或返回 SSE 流，不一定像普通 REST 一样立即输出 JSON。更完整的验证方式是在前端开启知识库生成一次，并在 agent 工具调用中观察 `rag_health` 或 `rag_query_data`。

LangGraph:

```powershell
curl http://localhost:2026/ok
```

业务后端:

```powershell
curl http://localhost:8001/health
```

## 后续建议

当前已打通“查询增强”路径，但完整知识库产品化还建议继续补：

- 项目知识库上传 / 重新索引 API。
- 知识库文件列表、索引状态、失败原因前端页面。
- 将需求文档、历史测试用例、接口文档自动写入对应 `projectId` 的 LightRAG space。
- 为 `rag_health` 做前端状态提示，避免用户在 LightRAG 未启动时误以为生成失败。
