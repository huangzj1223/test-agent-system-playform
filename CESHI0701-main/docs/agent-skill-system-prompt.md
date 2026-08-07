# 智能体技能系统 + 页面完整操作 —— 需求提示词

> 用于驱动 AI 编码代理，在已接入 AG-UI 智能体对话的管理后台上，构建「可管理的技能系统」并补全「页面业务操作」。复制本文件内容作为需求输入即可。

## 背景

系统为 Vue 3 + Element Plus + Vite（前端）+ NestJS 11 + Prisma 6（后端），已具备：
- 常驻 AG-UI 智能体对话面板（`/api/ag-ui`，SSE 流式，支持 function calling）
- 前端「操作注册中心」：页面挂载时注册可被智能体调用的操作，按用户权限点过滤后暴露给模型
- 页面上下文快照：把当前页面结构化数据传给模型
- 后端「代码生成器」能力（列表/内省/预览/生成），通过 `/admin/coding/generator/*` 暴露

现要在此之上做三件事：让智能体能调用「后端能力」、让这些能力「可管理」、并补全页面的「业务写操作」。

## 目标

1. **技能系统**：把后端能力封装成可开关、可增删改的「技能」，供智能体在聊天中调用。
2. **权限贯通**：修复前端权限点从不填充导致「所有受权限门控的智能体工具对模型隐身」的问题。
3. **页面完整操作**：让智能体能一步完成新增（含下级）、编辑、删除等业务操作。

## 约束

- 遵循项目技术栈与规范：单文件 ≤ 500 行、单函数 ≤ 80 行、无 `console.log`、导出函数带 JSDoc、统一 `request` 封装、不裸写 `fetch`、不直接操作 DOM。
- 安全优先：技能只能引用后端登记的能力，禁止前端指定任意 URL/接口（防 SSRF/越权）。
- 高风险操作（写库/删除）必须二次确认；后端接口守卫是最终权限边界。
- 不引入与目标无关的第三方依赖；数据库变更走迁移文件 + `db push`，改库前需确认。

## 一、技能系统（数据驱动 + UI 管理）

### 概念

- **能力目录（Capability Catalog）**：后端硬编码登记的「可被智能体调用的接口」清单，是安全边界。每个能力含：key、工具名、描述、HTTP 方法、路径、参数 JSON Schema、所需权限点、是否敏感。新增能力（新接口）必须在此登记（需改代码），这是唯一入口。
- **技能（Skill）**：数据，存数据库表 `sys_agent_skill`。一个技能 = 名称 + 描述 + 从能力目录中挑选的若干能力 key + 启用开关。可增删改、可开关。
- **通用执行器**：前端只写一次。拿到后端返回的「已启用技能的工具定义」（含 method+path 绑定），按定义调用对应接口，结果回传模型。技能怎么增，执行器不改。

### 后端

- Prisma 表 `sys_agent_skill`：`id / skillKey(唯一) / name / description / capabilities(JSON 数组) / enabled / builtin / sort / tenantId / 时间戳`。
- 能力目录文件：登记 codegen 的 listTables/introspect/preview/generate（generate 标记 sensitive，默认不放进内置技能）。提供 `resolveCapability`、`findUnknownCapabilities`。
- 模块 `agent-skill`：controller + service + dto，路由 `admin/agent-skill/{list,catalog,enabled,add,update,toggle,delete}`（`@Perms` 门控）。
  - `enabled` 返回「已启用技能解析后的工具定义」（含 http 绑定，绑定来自能力目录，非技能表存储）。
  - service 继承通用 BaseService；`onModuleInit` 幂等写入一条内置「后端代码生成」技能（仅只读三件套，不含落盘 generate）；`createSkill/updateSkill` 校验能力 key 必须在目录中登记；内置技能禁止删除。

### 前端

- `api/agentSkill.ts`：封装上述接口。
- `agent/skills/skill-tools.ts`：通用执行器。拉取已启用技能工具 → 转为 FrontendAction（敏感工具设 `requireConfirmation`）→ 注册进操作注册中心（先注销旧的，避免重复）。聊天面板挂载时调用一次（全局，跨页面存活）。
- `store/modules/agentSkill.ts`：技能列表 + 能力目录状态，封装增删改查/开关。
- 齿轮弹窗加「技能」Tab（与「模型配置」并列）：列表、开关、新建（从能力目录勾选）、编辑（内置技能可改不可删）、删除。

### 验收

- 齿轮 →「技能」Tab 可见「后端代码生成」技能（内置、启用、含列出表/读结构/预览）。
- 可新建/编辑/开关/删除技能；改动后聊天工具即时同步。
- 聊天问「数据库有哪些用户表」→ 智能体真正调用 `db_list_tables` 返回结果。

## 二、权限贯通（关键根因修复）

### 问题

前端 `info.buttons`（用户权限点）从不填充：后端 `getAdminInfo` 不返回 buttons，登录流程也不调用 perms 接口去填。而智能体工具按 `info.buttons` 过滤——带权限声明的工具只要 buttons 里没有对应权限点就不会暴露给模型。结果：所有受权限门控的工具（含技能工具、部门增删改）对模型永久隐身。

### 修复

- 后端 `getAdminInfo(userId, withButtons)`：`withButtons=true`（仅 `person` 接口传）时返回 `buttons`；`permmenu` 等走默认 false，避免多余开销。
- `resolveButtons`：
  - 超管（`username==='admin'`）→ 返回**系统全部已声明权限点**（扫描所有 `@Perms`，含尚无父菜单、未落库的权限点如 `coding:generator:*`），与「超管放行所有」语义一致。
  - 普通用户 → 其角色关联的权限点（复用现有 getPerms）。
- 权限点扫描做启动后缓存（声明不变，避免每请求重复反射）。
- `UserVo` 补 `buttons?: string[]` 字段（Swagger 文档一致）。

### 易错点（务必核对）

- 前端操作声明的 `permission` 必须与后端 `derivePerm(prefix, action)` 实际产出一致。例如部门控制器前缀 `admin/sys/department` → 权限点是 `sys:department:add/update/delete/list`，**不是** `organization:department:*`。CRUD 的编辑动作是 `update` 不是 `edit`。命名对不上 = 工具永久隐身。

### 验收

- 管理员登录后 `GET /admin/open/person` 返回 `buttons`，包含 `sys:department:*` 与 `coding:generator:*`。
- 重新登录后，部门增删改、技能工具均对智能体可见。

## 三、页面完整操作（以部门页为例）

### 原子操作

在既有「开窗→填表→提交」三步操作之外，新增一步到位的原子操作（模型连续多步易断，原子操作更可靠）：
- `department.create`：一次带齐字段直接调 API，支持 `parentDepartmentId` 建**下级部门**；权限 `sys:department:add`，high 风险 + 二次确认。
- `department.update`：按 ID 更新，仅提交传入字段（无有效字段则报错）；权限 `sys:department:update`，high + 确认。
- 字段白名单过滤（`name/leader/type/phone/orderNum/parentId`），防越权字段注入。

### 页面上下文快照

- 快照的 `rows` 字段必须与 `visibleColumns` 声明的展示列一致（如「负责人 leader」不能漏），否则智能体看到「有列无值」会误判为空，与页面显示对不上。

### 树形表格删除刷新

- 树形表（`row-key` + 展开）删除节点后，直接替换数据会因节点缓存导致被删行残留。刷新逻辑改为「先清空 → 等一帧 → 再填充」，强制树状态重建；该刷新函数被智能体与手动按钮共用，一处修复覆盖两条路径。加载遮罩全程遮住，无空表闪烁。

### 工程约束

- 页面组件行数超限时，把「智能体桥接」整段抽到独立 composable（如 `useDepartmentAgentBridge.ts`），页面只传状态与方法句柄，满足单文件 ≤ 500 行。

### 验收

- 「在 X 部门下新增子部门，名称 Y，负责人 Z」→ 弹确认 → 列表出现该子部门（父子关系正确）。
- 删除部门后列表即时消失，无需手动刷新。
- 各操作对智能体可见且执行成功。

## 四、用户在聊天中可用的示例提示词

面向最终用户，在任意页面的智能体对话框中可直接说：

**数据库/代码生成（技能工具）**
- 「数据库里有哪些用户相关的表」
- 「看下 base_sys_user 表的结构」
- 「预览一下 base_sys_role 会生成什么后端代码」

**部门管理（页面操作）**
- 「各部门的负责人分别是谁」
- 「在公共技术部下新增子部门，名称数据管理组，负责人李四，类型部门」
- 「把行政部的负责人改成张三」
- 「删除数据管理组」

**技能管理（在齿轮弹窗「技能」Tab）**
- 新建技能：勾选能力目录中的能力，起名保存
- 开关技能：开启后其能力作为工具提供给智能体；关闭即对模型隐藏

## 五、交付顺序与验证

1. 后端：表 + 能力目录 + agent-skill 模块 + 种子（改库前确认，走迁移文件 + `db push`）
2. 后端：权限贯通（getAdminInfo buttons + resolveButtons + 全量权限扫描缓存）
3. 前端：api + 通用执行器 + store + 技能 Tab UI
4. 前端：页面原子操作 + 快照字段补齐 + 树刷新修复 + composable 抽离
5. 每组改动过 code-reviewer；后端 `tsc`、前端 `vite build` 通过后再声明完成
6. 端到端：重启后端 + 重新登录，逐条验证上述示例提示词

## 六、复盘要点（本次踩过的坑）

- **build 通过 ≠ 功能可用**：`vite build` 不做完整类型检查，漏 import 也能构建成功但运行时崩溃；用 `vue-tsc`/实际运行验证。
- **权限命名空间必须对齐后端真实产出**：凭直觉写 `organization:department:*` 而真实是 `sys:department:*`，导致工具全隐身。以 DB/`derivePerm` 为准。
- **超管权限集要用「声明扫描」而非「菜单表」**：无父菜单的权限点（如 codegen）不在菜单表里，超管也会漏。
- **树形表删除残留**：`row-key` 缓存需清空重建。
- **快照字段要与展示列一致**：否则模型误判数据为空。
- **改库前确认**：本项目 dev 用 `db push`、prod 用 `migrate deploy`，需补迁移文件避免生产缺表。



