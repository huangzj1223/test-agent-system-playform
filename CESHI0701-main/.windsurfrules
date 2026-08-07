# SDAD — Spec-Driven Agentic Delivery

## 语言要求

所有回复使用中文。代码标识符保持英文。

## 执行规则

1. **Skill-First** — 技能匹配时必须调用，1% 可能性就触发
2. **Knowledge-Driven** — 规范从 `.claude/rules/agentpm-*.md` 和 `.claude/agentpm-knowledge/` 读取
3. **Review-Always** — 写完代码立即调用 code-reviewer
4. **Verify-Before-Claim** — 完成声明前必须运行验证命令

## 技能触发

| 技能 | 触发关键词 |
|------|-----------|
| `page-generator` | 创建页面、生成页面、实现功能 |
| `backend-generator` | 实现后端、生成接口、按详细设计实现接口、建表 |

| `req-doc` | 需求说明书、SRS、细化需求 |
| `hld-design` | 概要设计、HLD、系统设计、架构设计 |
| `lld-design` | 详细设计、LLD、数据库设计、接口设计 |
| `brainstorming` | 创建功能、添加功能、修改行为 |
| `diagram-generator` | 流程图、架构图、时序图 |
| `delivery-plan` | 交付计划、实现全部功能 |
| `annotation` | 标注页面、生成标注 |
| `feasibility-report` | 可研报告、可行性研究 |
| `feature-list` | 功能清单、功能列表 |
| `pm-test-cases` | 测试用例、QA测试 |
| `pm-operation-manual` | 操作手册、用户手册 |
| `finishing-branch` | 完成了、可以合并、提PR |

### 技能加载方式

当匹配到触发关键词时，读取 `.claude/skills/{技能名}.md` 文件并严格按其流程执行。

示例：用户说"生成页面" → 读取 `.claude/skills/page-generator.md` → 按文件中的步骤执行。

技能文件是完整的执行流程定义，包含步骤、Agent 调度、输出格式等。必须完整读取后再开始执行，不可跳过或简化流程。

## 编码规范

- 单文件 ≤ 500 行，单函数 ≤ 80 行
- 禁止 `console.log`，禁止裸写 `fetch`
- 禁止修改 `.eslintrc`、`tsconfig.json` 等配置来消除报错
- 新增页面必须同步添加路由
- API 函数必须有 JSDoc 注释

## Agent 编排

| 触发条件 | Agent |
|---------|-------|
| 写完/修改代码后 | code-reviewer（强制） |
| 涉及认证/权限/加密 | code-reviewer（重点审查安全） |
| 复杂功能实现前 | planner |
