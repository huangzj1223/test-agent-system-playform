# Product Design System Rules

## Product Role

- Treat this product as a professional intelligent testing platform, not a generic SaaS landing page.
- Prioritize command-center clarity: the user should quickly see project health, asset coverage, automation readiness, execution risk, and the next action.
- Keep visual polish tied to useful information. Decorative effects must support hierarchy, grouping, or scanning.

## Visual Language

- Use a coordinated light cockpit style: warm off-white workspace, ink sidebar, glassy header, structured cards, and restrained neon accents.
- Avoid splitting a page into unrelated black and white blocks. Dark surfaces should be nested, purposeful panels inside one continuous environment.
- Use teal, emerald, amber, rose, and ink as the core palette. Do not let a single hue dominate the whole interface.
- Cards use 8px radius or less unless an existing component requires otherwise.
- Use soft borders, subtle shadows, and grid/line textures instead of floating gradient orbs.

## Layout Rules

- The app shell owns the visual foundation: sidebar, header, and page background must feel like one system.
- Sidebar is the product command rail: project list, project navigation, and settings must have clear grouping and active states.
- Project management homepage is the global overview. Single-project pages are project detail views.
- Use dense but readable operational layouts. Avoid marketing-style hero sections that consume the whole viewport.

## Component Rules

- Reuse `ui/components/ui` primitives before creating new controls.
- Use `lucide-react` icons for buttons and operational status.
- Prefer Chinese-only labels in product screens unless an English technical identifier is unavoidable.
- Buttons and interactive rows need visible hover/focus states and stable dimensions.

## Verification

- After substantial UI changes, run TypeScript checks and inspect screenshots at desktop width.
- Check that text does not overlap or truncate in navigation, metric cards, and dashboard panels.


# test-agent-system-platform 项目说明

## 一、项目目标

本项目是 AI 自动化测试平台，主要能力包括：

- 测试需求分析；
- 接口测试用例生成；
- 自动化测试脚本生成；
- 测试任务执行；
- 测试进度查询；
- 测试结果和报告生成；
- 自动化失败原因分析；
- 测试智能体编排与调用。

修改功能前，先确认功能属于用例生成、脚本生成、任务执行、
报告生成、失败分析还是智能体编排，避免跨模块修改。

## 二、技术栈

以下内容必须以项目实际配置文件为准，不得根据本说明自行推测：

- 后端：Python
- 前端：待根据 package.json 确认
- 后端框架：待根据项目代码确认
- 数据库：待根据项目配置确认
- 测试框架：待根据现有测试配置确认
- 浏览器自动化：项目已配置时优先使用 Playwright

## 三、目录职责

执行任务前，先确认实际目录结构并更新本节。

- `backend/`：后端接口及业务逻辑
- `frontend/`：前端页面及交互
- `tests/`：自动化测试
- `docs/`：项目文档
- `scripts/`：开发、构建或运维脚本

不得在未确认目录职责前创建重复模块或新的平行目录。

## 四、项目命令

执行命令前，必须从以下文件确认真实命令：

- README.md
- pyproject.toml
- requirements.txt
- package.json
- Makefile
- docker-compose.yml
- Jenkinsfile
- CI 配置文件

确认后将实际命令填写到这里：

### 后端

- 安装依赖：待确认
- 启动服务：待确认
- 单元测试：待确认
- 静态检查：待确认
- 类型检查：待确认

### 前端

- 安装依赖：待确认
- 启动服务：待确认
- 单元测试：待确认
- 构建检查：待确认
- E2E 测试：待确认

不得编造命令。不能确认的命令应标记为“未确认”。

## 五、后端补充规则

- 外部模型、智能体、HTTP 服务调用必须设置超时。
- 自动重试前必须判断接口是否具备幂等性。
- 测试任务需要明确任务状态和状态流转规则。
- 异步任务应保留任务 ID、执行状态、失败原因和时间信息。
- 不得吞掉模型调用、脚本执行和任务调度异常。
- 修改数据库结构时必须提供迁移脚本，并说明回滚方式。
- 修改任务状态字段时，应同步检查前端、接口、数据库和报告模块。

## 六、前端补充规则

涉及页面、交互或状态展示的修改必须实际运行验证。

重点检查：

- 页面是否能够正常加载；
- 控制台是否新增 error；
- API 请求是否成功；
- 加载中、成功、失败、空数据状态是否完整；
- 长时间测试任务是否正确展示进度；
- 错误信息是否能够帮助用户定位问题；
- 页面刷新后任务状态是否能够恢复；
- 中文内容是否存在溢出或截断。

项目已经配置 Playwright 时，优先使用现有 Playwright 测试。

## 七、测试平台专项规则

涉及测试用例生成时，至少检查：

- 正常用例；
- 异常用例；
- 边界用例；
- 权限用例；
- 接口依赖；
- 前置条件；
- 测试数据；
- 预期结果；
- 是否能够转换为可执行脚本。

涉及自动化脚本生成时，至少检查：

- 脚本语法正确性；
- 依赖是否存在；
- 环境参数是否外置；
- 测试数据是否可复用；
- 断言是否有效；
- 是否包含超时和异常处理；
- 是否输出可定位的失败信息；
- 是否能够重复执行。

涉及失败分析时，必须区分：

- 产品缺陷；
- 自动化脚本缺陷；
- 测试数据问题；
- 环境问题；
- 外部依赖问题；
- 模型生成问题；
- 偶发性问题。

不得在证据不足时直接认定缺陷归属。

## 八、项目特殊边界

未经用户明确授权，不得修改：

- Jenkinsfile；
- Docker 部署配置；
- 生产环境配置；
- 数据库连接配置；
- 模型服务地址；
- GitLab CI/CD 配置；
- 飞书 Webhook；
- `.env` 中的敏感配置。

发现配置中存在敏感值时，不得在回答、日志或 diff 中展示其具体内容。