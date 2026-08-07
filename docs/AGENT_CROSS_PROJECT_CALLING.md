# 智能体跨项目调用与 API 测试使用说明

## 推荐架构

采用 `CLI-first + Codex Skills + MCP 可选增强`：

- CLI 是任意项目都可使用的稳定入口。
- `api-contract-test-pipeline` 负责契约、依赖图、前置条件、执行顺序和准确性闸门。
- `test-agent-platform` 负责调用本平台专业智能体。
- Codex 负责目标项目分析、源码证据、脚本落地、执行验证和修复。
- MCP 用于长期注册工具，但继续复用同一个 agent bridge。

```text
目标项目
  -> Codex 识别协议、源码和测试框架
  -> Pipeline 生成契约、依赖图、前置条件和执行计划
  -> Codex 确认关键依赖证据
  -> 平台 api 智能体生成计划、用例和脚本
  -> Codex 适配目标项目
  -> Preflight 检查环境、账号、权限和种子数据
  -> 按拓扑层执行并反向清理
  -> 失败归因与交付
```

## 能力边界

智能体负责语义工作：阅读文档和源码、提取语义、推断候选关系、选择业务场景、生成候选测试、结合证据分析根因。

确定性代码负责精确工作：Schema 和断言、可信边过滤、拓扑排序、循环检测、Preflight、失败传播、清理、去重、报告和 CI 退出码。

平台智能体输出不是最终交付物。Codex 必须依据目标项目事实审查、写入、运行和修复。

## 本项目入口

CLI 模式不需要先启动 Web 服务或常驻 Agent 进程。每次调用由 CLI 在平台虚拟环境中加载目标智能体。必须使用平台 `.venv`，不要使用系统 `python`：

首次安装或锁文件更新后执行：

```powershell
cd D:\install\PycharmProjects\test-agent-system-platform
uv sync --frozen
```

查看稳定 agent：

```powershell
& D:\install\PycharmProjects\test-agent-system-platform\.venv\Scripts\python.exe `
  D:\install\PycharmProjects\test-agent-system-platform\backend\app\agents\cli.py --list
```

可用名称：`api`、`testcase`、`web_cli`、`web_mcp`、`security`。

CLI：

```text
D:\install\PycharmProjects\test-agent-system-platform\backend\app\agents\cli.py
```

MCP：

```powershell
& D:\install\PycharmProjects\test-agent-system-platform\.venv\Scripts\python.exe `
  D:\install\PycharmProjects\test-agent-system-platform\backend\app\mcp_service\agent_server.py --transport stdio
```

MCP 工具为 `list_test_agents` 和 `invoke_test_agent`。

用户级 Skills：

```text
C:\Users\huang\.codex\skills\api-contract-test-pipeline\SKILL.md
C:\Users\huang\.codex\skills\test-agent-platform\SKILL.md
C:\Users\huang\.codex\skills\api-test-feedback-loop\SKILL.md
```

## 其他项目 API 测试落地

以下命令在目标项目根目录执行。

### 1. 确定机器可读契约

- REST/HTTP 优先 OpenAPI 3.0 或 3.1。
- GraphQL 使用 SDL 或 introspection。
- gRPC 使用 protobuf。
- 事件接口使用 AsyncAPI。
- SOAP 使用 WSDL。

非 REST 接口先由 Codex 归一化为内部 `contract.json`，不要强制伪装成 OpenAPI。

### 2. 生成依赖图

```powershell
python C:\Users\huang\.codex\skills\api-contract-test-pipeline\scripts\api_dependency_graph.py build `
  --contract .\openapi.json `
  --output-dir .codex\api-test
```

生成：

```text
.codex/api-test/
|-- contract.json
|-- dependency-graph.json
|-- prerequisites.json
|-- execution-plan.json
|-- platform-request.md
```

显式 OpenAPI Link 可成为可信边。名称、类型和资源语义推断出的边默认是 `candidate`，不会参与强制调度。

### 3. 确认关键依赖

Codex 核对路由、DTO/Schema、服务调用、ORM 外键、接口说明、示例、运行时值传递和日志。

存在明确证据时，才能将边设为 `contract_explicit`、`source_confirmed`、`runtime_confirmed` 或 `manual_confirmed`，并设置 `blocking: true`。

通用 `id`、`name`、`status` 等字段必须同时匹配资源上下文，不能单独建立依赖。

修改图后重新生成计划：

```powershell
python C:\Users\huang\.codex\skills\api-contract-test-pipeline\scripts\api_dependency_graph.py plan `
  --graph .codex\api-test\dependency-graph.json `
  --output .codex\api-test\execution-plan.json
```

可信边存在循环时计划为 `blocked`。必须修正边方向、采用两阶段创建或提供合法种子数据。

### 4. 整理前置条件

编辑 `.codex/api-test/prerequisites.json`：

- `API_BASE_URL`
- 可访问的健康探针，以及认证环境变量名、角色、租户、权限和已验证 OAuth Scope
- 外部服务
- 写入、删除、并发和破坏性测试授权
- 种子数据来源和清理方式

种子数据策略：

- `auto_create`：通过接口或 fixture 创建，最推荐
- `reference`：测试环境稳定只读数据
- `user_provided`：运行前提交环境变量或文件

文件只保存环境变量名和文件引用，不保存密码、Token 等秘密值。

### 5. 调用平台 API 智能体

```powershell
& D:\install\PycharmProjects\test-agent-system-platform\.venv\Scripts\python.exe `
  D:\install\PycharmProjects\test-agent-system-platform\backend\app\agents\cli.py `
  --agent api `
  --context project_identifier=<项目名>,folder_id=api `
  --prompt-file .codex\api-test\platform-request.md `
  --timeout-seconds 600
```

超时返回码为 `124`，该次响应不会被接受。语义评审可设置 120-300 秒；包含工具调用、脚本生成或执行的完整工作流建议 600 秒以上。

`platform-request.md` 已嵌入接口摘要、确认依赖、候选复核项和生成顺序，减少平台 agent 再次猜测。

### 6. Codex 落地脚本

Codex 应：

1. 使用目标项目已有测试框架。
2. 优先生成认证、配置、根资源和基础 fixture。
3. 按 `generation_order` 生成消费者测试。
4. 场景测试传递真实返回值。
5. 独立测试创建隔离资源，不依赖上一条测试遗留状态。
6. 将清理放入 teardown 或 `finally`。
7. 检查每个精确状态码和业务断言的证据来源。

### 7. 强制 Preflight

```powershell
python C:\Users\huang\.codex\skills\api-contract-test-pipeline\scripts\api_dependency_graph.py preflight `
  --prerequisites .codex\api-test\prerequisites.json
```

- `READY`：允许正式执行。
- `BLOCKED`：只允许继续生成和补充内容，禁止正式运行完整套件。

Preflight 会列出缺失环境变量、文件、种子数据、外部服务和人工确认项，不输出秘密值。

### 8. 按拓扑层执行

1. `dependency_level` 是硬约束。
2. 同层按 P0-P3、确认出度、方法和路径排序。
3. 同层测试只有在资源隔离时才并行。
4. 前置失败时，下游标记 `BLOCKED_BY_DEPENDENCY`。
5. 被依赖阻断的测试不计为产品缺陷。
6. 清理接口按反向依赖顺序执行，即使中途失败也要运行。

DELETE 接口默认仍在主执行层完成其功能测试，同时也进入 `cleanup_order`。只有可信 `cleanup` 边或 `cleanup_only` 标记才将它变成纯清理节点。

计算下游阻塞状态：

```powershell
python C:\Users\huang\.codex\skills\api-contract-test-pipeline\scripts\api_dependency_graph.py block `
  --plan .codex\api-test\execution-plan.json `
  --failed <失败接口 operationId> `
  --output .codex\api-test\dependency-state.json
```

```text
契约检查
  -> Preflight
  -> 认证/配置/根资源
  -> 基础接口测试
  -> 业务场景
  -> 状态/权限/幂等/并发异常测试
  -> 反向清理
```

## 推荐 Codex 指令

```text
使用 $api-contract-test-pipeline 和 $test-agent-platform 为当前项目生成 API 自动化测试。
先识别协议和已有测试框架，生成 .codex/api-test 契约、依赖图、前置条件和执行计划；
结合源码、接口说明和运行时证据确认关键边，再调用平台 api 智能体生成测试计划与脚本。
由 Codex 落地脚本，补齐环境、账号和种子数据，通过 Preflight 后按拓扑层执行，
依赖失败标记 BLOCKED_BY_DEPENDENCY，最后反向清理资源。
```

## 实时反馈与持续优化

项目问题先在项目内修复，不能由一次失败自动修改全局 Skill 或智能体：

```powershell
$feedback = "C:\Users\huang\.codex\skills\api-test-feedback-loop\scripts\api_pipeline_feedback.py"
$learning = "D:\install\PycharmProjects\test-agent-system-platform\api-pipeline-learning"

python $feedback init --project-root .
python $feedback collect --project-root . --kind request-template `
  --summary "说明修正内容" --evidence .codex\api-test\failure.json
python $feedback apply-local --project-root . --candidate .codex\api-test\candidate.json
python $feedback replay --candidate .codex\api-test\candidate.json `
  --fixtures .codex\api-test\regressions
python $feedback propose --project-root . --central-root $learning `
  --candidate .codex\api-test\candidate.json
```

中央候选不会自动生效。只有完成正反例回放并经过负责人批准，才能执行 `promote --approved-by <负责人>`。每次晋升生成 `registry/versions/vN.json`；`rollback` 会创建一个新的审计版本，不删除历史。

规则优先级为：`全局规则 < 项目 overrides < 当前契约/源码/运行时证据`。项目特例留在项目内，重复出现且可泛化的问题才进入全局。

## 本项目验证

```powershell
python -m pytest backend\test_agent_bridge.py -q
python -m unittest discover C:\Users\huang\.codex\skills\api-contract-test-pipeline\tests -v
python -m unittest discover -s C:\Users\huang\.codex\skills\api-test-feedback-loop\scripts\tests -v
python C:\Users\huang\.codex\skills\.system\skill-creator\scripts\quick_validate.py C:\Users\huang\.codex\skills\api-contract-test-pipeline
python C:\Users\huang\.codex\skills\.system\skill-creator\scripts\quick_validate.py C:\Users\huang\.codex\skills\test-agent-platform
python C:\Users\huang\.codex\skills\.system\skill-creator\scripts\quick_validate.py C:\Users\huang\.codex\skills\api-test-feedback-loop
```

## 稳定性约定

- CLI、MCP 和 Skills 共用同一 bridge。
- 候选边不参与执行调度。
- 精确断言必须有契约、源码或运行时证据。
- 缺少环境、认证或种子数据时禁止正式执行。
- 平台 agent 不直接决定最终通过或失败。
- Codex 必须执行生成物并修复集成问题。
- 质量重点是依赖边准确率、首次可运行率、真阳性率和关键生命周期覆盖率。
