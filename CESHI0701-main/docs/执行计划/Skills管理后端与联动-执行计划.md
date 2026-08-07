# Skills 管理 后端补全 + 安全联动 · 执行计划

> **版本**：v1.0　|　**创建**：2026-07-08　|　**状态**：待执行
> **用途**：本文件是「Skills 管理」后端补缺口、新功能开发与安全策略联动的唯一执行依据与进度台账。
> 每完成一个任务就勾选对应复选框并更新「§5 进度追踪总表」。中断后按「§10 中断恢复指引」定位未完成任务继续。

---

## 1. 背景与结论（务必先读）

**关键事实**：后端 `agent-skill` 模块与两张表（`sys_agent_skill`、`sys_agent_skill_run_log`）**已存在且约 80% 对齐前端**。本计划不是「从零开发后端」，而是：
1. 补齐前端已有 UI 但缺后端支撑 / 缺前端接线的**缺口**；
2. 新增用户确认的**三个较重功能**：能力测试/试运行、版本历史/回滚、导入/导出；
3. 落地 **riskLevel 业务联动**——把 Skills 能力执行接入安全策略统一治理（`checkSecurityPolicy` + 审计）。

**已完整对齐、本次不动的部分**（避免重复劳动）：
- 接口：`list`（筛选分页+运行统计 lastRunAt/calls7d）/`stats`/`categories`/`run-log/list`/`run-log/record`/`catalog`/`enabled`/`add`/`update`/`toggle`/`delete`
- 表：`sys_agent_skill`（16 字段）、`sys_agent_skill_run_log`；前端用到的字段后端全有，**无字段级缺口**
- 前端 5 统计卡片、分类侧栏、能力目录勾选、CLI 绑定复制、运行日志读取，均为真实接口无 mock

---

## 2. 已确认的关键决策（不可擅自更改）

| # | 决策项 | 选定方案 |
|---|--------|---------|
| D1 | 三个较重新功能 | **全部纳入**：能力测试/试运行 + 版本历史/回滚 + 导入/导出 |
| D2 | 业务联动深度 | **接入安全策略统一治理**：Skills 能力执行前过 `checkSecurityPolicy`（按 riskLevel 放行/需确认/需审批），结果写审计日志 |
| D3 | 低成本缺口 | **默认纳入**：L4 风险文案 Bug、表格行内启停开关、运行日志筛选/分页/errorMsg 展开、适用智能体枚举来源、calls7d 展示 |
| D4 | 能力目录/枚举来源 | 能力目录仍以后端 `agent-capability.catalog.ts` 为唯一权威源；分类/风险枚举维持固定枚举（前端手工同步），本次补一个**枚举下发接口**消除双维护漂移 |
| D5 | 数据库变更 | **仅新增 1 张表** `sys_agent_skill_version`（版本历史）；审计/审批复用安全策略已有表，不新建 |

---

## 3. 全局技术约定（对齐现有代码）

| 项 | 约定 |
|----|------|
| 后端根目录 | `server/` |
| ORM | Prisma 6，`schema.prisma` 单文件 |
| 表命名 | 模型 PascalCase + `@@map("snake_case")`；列驼峰不加 `@map` |
| 主键 | `id Int @id @default(autoincrement())` |
| 公共字段 | `tenantId Int?` + `createTime`（+ 需要更新时 `updateTime DateTime @updatedAt`），无软删除 |
| 枚举 | 复用 `agent-skill.enums.ts`（SKILL_CATEGORY_VALUES / SKILL_RISK_VALUES / HIGH_RISK_LEVELS） |
| Controller | `@Controller('admin/agent-skill')`，全 `@Post` + `@Perms('action')`，继承 `BaseController`，`this.ok(data)` |
| Service | 继承 `BaseService`，构造注入 `PrismaService`（`super(prisma, 'sysAgentSkill')`） |
| DTO | class-validator + `@ApiProperty`，枚举字段 `@IsIn` 引 catalog |
| 权限点 | 新增 action 会经 PermsSyncService 自动登记为按钮（锚点菜单 `agent-skill:list` 已就位） |
| 安全联动 | 复用 `SecurityCheckService.check()`（阶段 5），Skills 模块 import `SecurityPolicyModule` |
| schema 变更 | `cd server && npm run prisma:push`（同步 `///` 注释到列 comment） |
| 后端验证 | `cd server && npx tsc --noEmit` |
| 前端验证 | `cd frontend && npx vite build` |

---

## 4. 数据表总览（1 新建 + 0 改造）

| # | 表名 | 类型 | 用途 | 所属阶段 |
|---|------|------|------|---------|
| T1 | `sys_agent_skill_version` | 行级 | 技能版本历史快照（支撑版本历史展示 + 回滚） | 阶段 0（建表）/ 阶段 3（逻辑） |

> 审计日志复用 `sys_agent_audit_log`，审批工单复用 `sys_agent_approval_request`（安全策略已建），Skills 联动不新建这两张表。

---

## 5. 进度追踪总表

> 状态图例：⬜ 未开始　🔄 进行中　✅ 已完成　⚠️ 阻塞

| 阶段 | 名称 | 状态 | 完成时间 | 备注 |
|------|------|------|---------|------|
| 阶段 0 | 数据层地基（版本表 + 枚举下发接口） | ✅ | 2026-07-08 | 版本表已建；enums 接口含 L4 文案；tsc+push+review 通过 |
| 阶段 1 | 低成本缺口修复（前端为主 + 少量后端） | ✅ | 2026-07-08 | 6项缺口全修；tsc+build 通过；review 1 HIGH 已修。手工验收(1.B)待晨检 |
| 阶段 2 | 能力测试 / 试运行 | ✅ | 2026-07-08 | self-call转调+护栏; 拆SkillTestService; review DONE; happy-path手工验收待做 |
| 阶段 3 | 版本历史 / 回滚 | ✅ | 2026-07-08 | 拆SkillVersionService; 快照/回滚脚本9项全过; 补迁移文件; review MEDIUM已修 |
| 阶段 4 | 导入 / 导出 | ✅ | 2026-07-08 | 拆SkillPortService; 脚本10+7项全过; review 2 MEDIUM已修(长key/import权限点) |
| 阶段 5 | 安全策略统一治理联动（核心） | ✅ | 2026-07-08 | 复用SecurityCheckService; checkPolicy+前端fail-closed gate; 脚本6+2项过; review MEDIUM已修 |
| 阶段 6 | 全量验证 | ✅（代码+HTTP实测）| 2026-07-08 | migrate diff无漂移+tsc+build; 终审DONE(2修复); HTTP端到端实测test/check/export/version/enums全通(self-call happy-path跑通); 仅剩纯UI目视(6.1.4b)。过程误重置开发库已恢复(见6.1.7) |

**阶段依赖**：阶段 0 是前置；阶段 3 依赖阶段 0（版本表）；阶段 5 依赖安全策略模块（已存在）；阶段 1/2/4 相互独立可并行；阶段 6 依赖全部。

---

## 6. 功能联动关系速查

```
                能力目录 catalog (后端权威源，防 SSRF)
                       │ 技能引用
                       ▼
        sys_agent_skill (技能定义, riskLevel L1-L4)
          │                │                    │
          │ 启用            │ 每次变更            │ 执行能力
          ▼                ▼                    ▼
   resolveEnabledTools  sys_agent_skill_version  【阶段5】执行前
   (聊天前端注册工具)     (版本历史/回滚)         checkSecurityPolicy(riskLevel)
          │                                        │ 读安全策略：风险等级+黑白名单+敏感词
          │ 执行 + 埋点                            ├─ 放行/需确认/需审批
          ▼                                        ▼
   sys_agent_skill_run_log ◄──────────────── sys_agent_audit_log (L3/L4必记)
   (运行统计: calls7d/failRate/lastRunAt)          sys_agent_approval_request (需审批时)
                                                        ▼
                                                  运行日志页签 / 审批工单
```

**联动清单（改动某处需连带检查）：**

| 改动点 | 连带影响 |
|--------|---------|
| 技能 riskLevel | 阶段5 check 的风险判定；stats「高风险」卡片；详情面板权限文案 |
| 技能 capabilities | resolveEnabledTools 暴露的工具；run-log 归属反查；导入时的合法性校验 |
| 技能启用/停用 | 聊天前端可用工具（需触发 syncSkillTools）；stats「已启用」 |
| 技能任意字段更新 | 阶段3 版本快照写入 + version 自增 |
| 能力目录增减 | catalog 接口；技能引用校验；已下线能力在 resolve 时跳过 |
| 安全策略风险等级 defaultAction | 阶段5 Skills 执行的放行判定（与工具权限、记忆写入共用同一 check） |

---

## 阶段 0 · 数据层地基

**目标**：建版本历史表 + 补一个枚举下发接口（消除前端写死枚举的漂移）。
**前置**：无。
**产出文件**：
- `server/prisma/schema.prisma`（追加 T1 model）
- `server/src/modules/agent-skill/controllers/agent-skill.controller.ts`（追加 `enums` 接口）
- `server/src/modules/agent-skill/services/agent-skill.service.ts`（追加 `listEnums()`）
- `server/src/modules/agent-skill/catalog/agent-skill.enums.ts`（补 L4 风险文案）

### 0.1 任务清单

- [x] **0.1.1** schema 追加 T1 `sys_agent_skill_version`（skillId/version/snapshot(Json)/changeType/changeSummary/operator/tenantId/createTime + relation Cascade + 3 索引 + @@map）✅
- [x] **0.1.2** `SysAgentSkill` 追加反向关系字段 `versions SysAgentSkillVersion[]` ✅
- [x] **0.1.3** service 追加 `listEnums()`：返回 categories(6) + riskLevels(4，含 note) ✅
- [x] **0.1.4** controller 追加 `@Post('enums')` `@Perms('list')` → `listEnums()` ✅
- [x] **0.1.5** enums 文件补充 `SKILL_RISK_NOTES`（L1-L4 四条，**修复 L4 文案缺失**）✅

### 0.2 验证

```bash
cd server && npm run prisma:push        # 期望：无报错，sys_agent_skill_version 表创建成功
cd server && npx tsc --noEmit           # 期望：exit 0
cd server && npm run start:dev          # 启动无报错
# 冒烟：POST /admin/agent-skill/enums → 返回 categories(6) + riskLevels(4，含 L4 且有 note)
```
- [x] **验证 0.A** `prisma:push` exit 0，新表已建（count 可查）✅
- [x] **验证 0.B** `tsc --noEmit` 通过 ✅
- [x] **验证 0.C** `enums` 返回 6 分类 + 4 风险等级，L4 note 非空 ✅
- [x] **验证 0.D** code-reviewer DONE_WITH_CONCERNS（仅 2 LOW，均与现有惯例一致非缺陷，不阻断）✅

**阶段 0 完成标志**：版本表已建 + enums 接口可用（含 L4 文案）+ 编译通过 + code-review 通过 → 进度总表阶段 0 ✅

---

## 阶段 1 · 低成本缺口修复

**目标**：修掉子代理发现的低成本缺口，提升前端完整度。以前端改动为主，少量后端。
**前置**：阶段 0 完成（`enums` 接口 + L4 文案）。
**产出文件**（前端 `frontend/`）：
- `src/components/core/layouts/art-agent-chat/widget/skills-manager/SkillDetailPanel.vue`（L4 文案 + 日志筛选/分页）
- `src/components/core/layouts/art-agent-chat/widget/skills-manager/SkillTable.vue`（行内启停开关 + calls7d 列）
- `src/components/core/layouts/art-agent-chat/widget/skills-manager/SkillEditDialog.vue`（适用智能体候选源）
- `src/api/agentSkill.ts` / `src/store/modules/agentSkill.ts`（如需扩展日志分页/枚举拉取）
- `src/components/core/layouts/art-agent-chat/widget/skills-manager/skill-constants.ts`（改为从后端 enums 兜底）

### 1.1 任务清单

- [x] **1.1.1** 【Bug】详情面板「权限控制」L4 文案：`riskNote` 改读 `enums` note（含 L4），FALLBACK 兜底，修复 L4 回落 L1 ✅
- [x] **1.1.2** 【行内开关】SkillTable 状态列改行内 ElSwitch（`@click.stop` + `@change` emit toggle），复用 onToggle→toggle+syncSkillTools ✅
- [x] **1.1.3** 【日志筛选/分页】DetailPanel 运行日志改面板内部自拉：成功/失败筛选 + 分页 + errorMsg 展开（后端 run-log/list 加 success 参数支撑）✅
- [x] **1.1.4** 【适用智能体候选源】核实结论：系统无独立 agent 清单源（ag-ui config 是全局参数）→ 决策**并入 enums 接口**下发 agents（不新建 agents 接口），只放真实的「AG-UI 智能体」；EditDialog 改 ElSelect multiple ✅
- [x] **1.1.5** 【calls7d 展示】SkillTable 加「近7日调用」列（list 已返回 calls7d，直接展示）✅
- [x] **1.1.6** 【枚举下发】Table/DetailPanel/EditDialog 分类/风险/智能体选项优先用后端 `enums`，空则 skill-constants 本地兜底，消除漂移 ✅

### 1.2 验证

```bash
cd frontend && npx vite build           # 含 vue-tsc，期望 exit 0
cd frontend && npm run dev              # 手工验收
# 手工验收清单：
#   详情面板选 L4 技能 → 权限控制页签显示 L4 专属文案（非 L1）
#   表格行内开关切换 → 技能启停成功、列表刷新、聊天工具同步
#   运行日志 → 可按成功/失败筛选、翻页、展开失败详情
#   编辑弹窗「适用智能体」→ 下拉可选（非自由文本）
#   表格显示近7日调用数
```
- [x] **验证 1.A** server tsc exit 0 + frontend `vite build` exit 0 ✅
- [ ] **验证 1.B** L4 文案/行内开关/日志筛选分页/适用智能体下拉/calls7d（**待手工验收**：`npm run dev` 打开 Skills 管理页逐条确认）
- [x] **验证 1.C** code-reviewer：首轮发现 1 HIGH（ElSelect 清除置 undefined 被误判"仅失败"）→ 已修（`== null` 宽松比较 + try/catch）→ 构建通过 ✅

**阶段 1 完成标志**：6 项缺口修复 + 构建通过 + 手工验收 + code-review 通过 → 进度总表阶段 1 ✅

---

## 阶段 2 · 能力测试 / 试运行

**目标**：管理台能在配置页「测试」某技能，验证其引用的能力是否可正常调用，无需去聊天里试。
**前置**：阶段 0 完成。可与阶段 1/4 并行。
**设计要点**：
- 测试 = 对技能引用的**某个能力**，用测试参数发起一次真实调用（走该能力的 method+path），返回成功/失败 + 耗时 + 响应摘要。
- **安全约束**：测试同样受权限点约束（能力的 requiredPerms）；**敏感能力（sensitive=true，如落盘生成）默认禁止在测试入口执行**，或强制走确认——避免「测试」变成绕过治理的后门。测试也应接入阶段5的 check（若阶段5已完成）。
- 测试调用也写运行日志（run-log），来源标记为「测试」以便与真实调用区分。

**产出文件**：
- `server/src/modules/agent-skill/dto/agent-skill.dto.ts`（`TestSkillCapabilityDto`）
- `server/src/modules/agent-skill/services/agent-skill.service.ts`（`testCapability()`）
- `server/src/modules/agent-skill/controllers/agent-skill.controller.ts`（`@Post('test')`）
- 前端 `SkillDetailPanel.vue` 或 `SkillTable.vue`（「测试」按钮 + 结果弹窗）+ `api/agentSkill.ts`

### 2.1 任务清单

- [x] **2.1.1** DTO `TestSkillCapabilityDto`（skillId/capabilityKey/params?，IsObject 校验）✅
- [x] **2.1.2** service `testCapability`（拆为独立 `SkillTestService`，控单文件≤500行）：
  1. ✅ 三重护栏：技能存在→capabilityKey 属于该技能→能力在 catalog 已登记
  2. ✅ 敏感能力（sensitive=true）直接拒绝，返回 blockedReason
  3. ⏭ checkSecurityPolicy 接入留阶段5（代码留 TODO 注释）
  4. ✅ **决策：用 Node 22 全局 fetch 做进程内 self-call**（http://127.0.0.1:{port}{cap.path}），转发 Authorization 头使目标接口 @Auth+@Perms 守卫完整生效（真实边界）；AbortController 15s 超时
  5. ⚠️ **有据偏离**：测试**不写 run-log**（run_log 无 source 列，写入会污染 calls7d/failRate 真实统计），只返回实时结果
- [x] **2.1.3** controller `@Post('test')` `@Perms('test')` → `testService.testCapability`（@Headers 转发 token）✅
- [x] **2.1.4** 前端详情面板能力列表每项加「测试」按钮 + 参数弹窗 + 结果展示；敏感能力 disabled ✅
- [x] **2.1.5** 前端 `api/agentSkill.ts` 加 `testSkillCapability()` + `SkillTestResult` 类型 ✅

### 2.2 验证

```bash
cd server && npx tsc --noEmit
cd frontend && npx vite build
# 冒烟：
#   test {skillId, capabilityKey:'codegen.listTables'} → success:true, 有耗时
#   test 敏感能力 codegen.generateModule → 被拒绝（除非确认），返回明确原因
#   test 非本技能的 capabilityKey → 400 校验失败
#   测试后 run-log/list 能看到测试记录
```
- [x] **验证 2.A** server tsc exit 0、frontend vite build exit 0（service 437 / skill-test 111 行，均≤500）✅
- [x] **验证 2.B** 护栏逻辑脚本验证：归属拒绝✅、敏感拦截✅、技能不存在拒绝✅（run-log 决策改为不写故无写入项）。**happy-path 只读能力成功调用需运行服务+登录态，留手工验收**
- [x] **验证 2.C** code-reviewer：首轮 DONE_WITH_CONCERNS（超行数+2 LOW）→ 拆 SkillTestService + 补 ACTION_LABELS + 加安全注释 → 复审 **DONE** 无任何问题；运行时 DI 解析已验证。SSRF 面闭合、self-call 仅转 127.0.0.1 vetted path ✅
- 附带：修复内置技能 backend-codegen 误入的 codegen.generateModule（历史手工测试残留），恢复只读三件套

**阶段 2 完成标志**：test 接口可用且安全 + 前端测试入口可用 + code-review 通过 → 进度总表阶段 2 ✅

---

## 阶段 3 · 版本历史 / 回滚

**目标**：每次技能变更留快照，详情面板可看版本历史、可回滚到历史版本。
**前置**：阶段 0 完成（`sys_agent_skill_version` 表）。
**设计要点**：
- 写快照时机：`createSkill`（changeType=create）、`updateSkill`（changeType=update）、回滚（changeType=rollback）。
- 回滚 = 取某历史版本的 snapshot 覆盖当前技能字段（skillKey/builtin 不变），并**再记一条 rollback 版本**（回滚本身也是一次变更，形成可追溯链，不做物理删除）。
- version 号沿用现有 `bumpVersion` 自增；回滚后 version 继续递增（不倒退），changeSummary 注明「回滚自 vX.Y.Z」。

**产出文件**：
- `server/src/modules/agent-skill/services/agent-skill.service.ts`（快照写入 + `listVersions` + `rollback`）
- `server/src/modules/agent-skill/dto/agent-skill.dto.ts`（`SkillVersionQueryDto` / `RollbackSkillDto`）
- `server/src/modules/agent-skill/controllers/agent-skill.controller.ts`（`version/list` / `version/rollback`）
- 前端 `SkillDetailPanel.vue`（版本历史区块 + 回滚按钮）+ `api/agentSkill.ts` + `store`

### 3.1 任务清单

- [x] **3.1.1** `writeSnapshot(skill, changeType, summary, operator)`（拆到独立 `SkillVersionService`，写失败仅记日志不阻断）✅
- [x] **3.1.2** `createSkill` 末尾写 create 快照；`updateSkill` 末尾写 update 快照（摘要列出变更字段），改用导出的 `bumpVersion` ✅
- [x] **3.1.3** `listVersions(skillId, page, pageSize)`：createTime desc 分页 ✅
- [x] **3.1.4** `rollback(skillId, versionId, operator)`：快照覆盖字段（skillKey/builtin/creator 不变），version 继续 bump（不倒退），写 rollback 快照（含"回滚自 vX"）；校验 versionId 归属该技能 ✅
- [x] **3.1.5** DTO：`SkillVersionQueryDto` / `RollbackSkillDto` ✅
- [x] **3.1.6** controller：`version/list` `@Perms('list')`、`version/rollback` `@Perms('update')`（@Admin 透传 operator）✅
- [x] **3.1.7** 前端**新建 `SkillVersionHistory.vue`**（版本列表+变更类型标签+回滚二次确认+分页），DetailPanel 加「版本历史」tab 嵌入 ✅
- [x] **3.1.8** 前端 `api` 加 `fetchSkillVersions`/`rollbackSkill`；回滚成功 emit → SkillsManager `refreshAll`+`syncSkillTools` ✅
- [x] **3.1.9**（补）新增迁移文件 `20260708000000_add_agent_skill_version`（阶段0仅 db push，补齐迁移 paper trail，与 sibling 一致）✅

### 3.2 验证

```bash
cd server && npx tsc --noEmit
cd frontend && npx vite build
# 流程冒烟：
#   新建技能 → version/list 有 1 条 create 快照
#   更新技能 name → version/list 新增 update 快照，version 自增
#   rollback 到首个版本 → 技能 name 还原，version 继续递增，新增 rollback 快照
#   内置技能同样可看历史（回滚不改 skillKey/builtin）
```
- [x] **验证 3.A** server tsc exit 0、frontend vite build exit 0（所有文件≤500，DetailPanel 精简到 500）✅
- [x] **验证 3.B** 脚本 9 项全过：create/update/rollback 快照、version 自增(v1.0.0→v1.0.1)、update 摘要含字段、回滚还原 name/riskLevel、version 不倒退(→v1.0.2)、删除级联清理版本 ✅
- [x] **验证 3.C** code-reviewer DONE_WITH_CONCERNS：1 MEDIUM（回滚后 store 持旧 selected 引用致详情不刷新）已修；LOW-2（缺迁移文件）已补迁移；LOW-1/3/4（乐观锁/权限复用/isCurrent 边界）为可接受权衡，已记录不改 ✅

**阶段 3 完成标志**：版本快照 + 历史列表 + 回滚全流程通过 + code-review 通过 → 进度总表阶段 3 ✅

---

## 阶段 4 · 导入 / 导出

**目标**：把假的「上传 Skill」做成真功能——导出技能为 JSON、导入时校验并落库。
**前置**：阶段 0 完成。可与阶段 1/2 并行。
**设计要点**：
- 导出：单个或批量技能导出为 JSON（含 skillKey/name/description/capabilities/category/riskLevel/cliCommand/triggerKeywords/applicableAgents/sort，**不含** id/creator/运行统计/tenantId）。
- 导入：解析 JSON → 逐条校验（能力 key 全在 catalog、skillKey 格式合法、枚举合法）→ skillKey 冲突策略（跳过/覆盖/重命名，默认**跳过并报告**）→ 落库。导入的技能 `builtin=false`。
- **安全约束**：导入本质是批量 createSkill，必须复用 `assertValidCapabilities`（杜绝引用未登记能力，防 SSRF）；不信任导入文件里的任何 http 绑定（能力绑定永远来自后端 catalog）。

**产出文件**：
- `server/src/modules/agent-skill/dto/agent-skill.dto.ts`（`ExportSkillsDto` / `ImportSkillsDto`）
- `server/src/modules/agent-skill/services/agent-skill.service.ts`（`exportSkills` / `importSkills`）
- `server/src/modules/agent-skill/controllers/agent-skill.controller.ts`（`export` / `import`）
- 前端 SkillsManager.vue / SkillTable.vue（导出按钮 + 上传解析）+ `api/agentSkill.ts`

### 4.1 任务清单

- [x] **4.1.1** DTO：`ExportSkillsDto`（`ids?`）、`SkillImportItem`（嵌套校验）、`ImportSkillsDto`（`@ValidateNested`+`@Type` + `conflictStrategy`）✅
- [x] **4.1.2** service `exportSkills(ids?)`（拆到独立 `SkillPortService`）：剔除 id/creator/运行统计/tenantId/builtin，返回可移植 JSON ✅
- [x] **4.1.3** service `importSkills(items, strategy, creator)`：复用 `assertValidCapabilities`（防越权）；导入强制 enabled=false/builtin=false；skip/overwrite（内置拒绝）/rename（-imported 后缀，长 key 截断保≤64）；单条失败汇总 `failed` ✅
- [x] **4.1.4** controller：`export` `@Perms('list')`、`import` **`@Perms('import')`**（独立权限点，因导入含 create+overwrite，不复用 add；补 ACTION_LABELS export/import）✅
- [x] **4.1.5** 前端「导入 Skill」真功能：隐藏 file input → 解析 JSON（数组或 {items}）→ import(skip) → 报告（新增/跳过/覆盖/重命名/失败）→ refreshAll+syncSkillTools；「导出全部」下载 JSON（Blob+revokeObjectURL）✅
- [x] **4.1.6** 前端 `api` 加 `exportSkills`/`importSkills` + `PortableSkill`/`ImportReport` 类型 ✅

### 4.2 验证

```bash
cd server && npx tsc --noEmit
cd frontend && npx vite build
# 冒烟：
#   export → 返回 JSON 数组，无 id/creator/tenantId
#   import 合法 JSON → imported 正确，列表可见
#   import 含未登记能力的项 → 该项 failed 并报明确原因，其余正常导入
#   import 重复 skillKey（strategy=skip）→ skipped 计数，不覆盖原技能
```
- [x] **验证 4.A** server tsc exit 0、frontend vite build exit 0（所有文件≤500）✅
- [x] **验证 4.B** 脚本 10 项全过：导出剔除 id/creator、导入非法能力被拒(failed含"未登记的能力")、enabled=false、builtin=false、skip/overwrite/rename、内置不可覆盖；修复后补验 7 项：长 key rename≤64 且合法 kebab、伪造 builtin/id/creator 被服务层白名单剥离 ✅
- [x] **验证 4.C** code-reviewer DONE_WITH_CONCERNS：2 MEDIUM 均已修 — ①uniqueKey 长 key 超限致 DB 错误泄露 → 预留后缀空间截断；②import 复用 add 权限但含 overwrite(update) → 改独立 `@Perms('import')` 权限点。LOW（补测伪造字段）已补脚本验证 ✅

**阶段 4 完成标志**：导入导出真功能可用且安全 + code-review 通过 → 进度总表阶段 4 ✅

---

## 阶段 5 · 安全策略统一治理联动（核心）

**目标**：落地 riskLevel 业务联动——Skills 能力执行前过 `checkSecurityPolicy`，按风险等级放行/需确认/需审批，L3/L4 写审计日志。真正打通「风险等级 → 安全策略 → 审批 → 审计」链路。
**前置**：安全策略模块已存在（`SecurityCheckService.check()` 可用）；建议阶段 2 已完成（测试入口一并接入）。
**设计要点**：
- **接入点**：Skills 能力执行发生在前端 `skill-tools.ts` 的 `execute()`（`callToolEndpoint` 直打后端能力接口）。接入分两层：
  1. **前端防御层**：`execute()` 内、真实调用前，先调后端 `check`（传 actionType 由能力类型映射、riskLevel 取自技能、command/sql/path 从参数提取）。`allowed=false` → 阻断并提示；`requireConfirm` → 弹确认框；`requireApproval` → 提示已提审批工单。
  2. **后端边界层**（真正安全边界）：能力目标接口本就有 `@Perms` 守卫；本阶段**不改各能力接口**，而是让 check 成为「执行前统一裁决 + 审计落地」的编排点。审计由 check 内部按 auditRequired 写入（复用安全策略 `writeAuditIfNeeded`）。
- **actionType 映射**：能力按性质映射到安全策略的 actionType（cli/database/file/api/skill），映射表放后端（能力 catalog 可加 `actionType` 字段，或 skill 侧按 category 推导），交给 check 做风险判定。
- **风险等级来源**：以技能表 `riskLevel` 为准（与安全策略 L1-L4 统一，D3 已保证枚举一致）。
- **与阶段2 测试联动**：`testCapability` 执行前同样过 check（测试也是一次真实调用）。

**产出文件**：
- `server/src/modules/agent-skill/agent-skill.module.ts`（import `SecurityPolicyModule`）
- `server/src/modules/agent-skill/services/agent-skill.service.ts`（注入 `SecurityCheckService`，能力执行/测试前 check）
- `server/src/modules/agent-skill/controllers/agent-skill.controller.ts`（新增 `check` 接口供前端执行前调用）
- `server/src/modules/agent-skill/catalog/agent-capability.catalog.ts`（能力补 `actionType` 字段，供风险判定）
- 前端 `src/agent/skills/skill-tools.ts`（execute 前调 check，按结果放行/确认/阻断）+ `api/agentSkill.ts`

### 5.1 任务清单

- [x] **5.1.1**（**有据偏离**）未改 catalog 加 actionType，而是 **skill.category → actionType 映射**（`SKILL_CATEGORY_TO_ACTION`：query/operation→api、generate→file、cli→cli、decision/workflow→skill）。理由：category 已表征能力性质，避免改 catalog schema，更内聚 ✅
- [x] **5.1.2** module import `SecurityPolicyModule`；`SkillTestService` 注入 `SecurityCheckService`（无循环依赖）✅
- [x] **5.1.3** `checkPolicy(dto, userId)`（落 SkillTestService）：组装 SecurityCheckContext（actionType 映射、riskLevel 取自技能、command/sql/apiPath/filePath 从 payload 提取、skillKey/toolKey 回填）→ `securityCheck.check()` → 返回 SecurityCheckResult；技能不存在抛错 ✅
- [x] **5.1.4** controller `@Post('check')`（仅登录，无 @Perms，与安全策略 check 一致）→ `checkPolicy` ✅
- [x] **5.1.5** `testCapability` 执行前接入 `checkPolicy`（加 userId 参数），被拦则不发 self-call ✅
- [x] **5.1.6** 前端 `skill-tools.ts` `execute()`：`callToolEndpoint` 前经 `runPolicyGate`（**fail-closed**）：allowed=false→阻断提示 blockedReason；requireApproval→提示已提审批工单并中止；异常→拦截。唯一执行入口，无绕过路径 ✅
- [x] **5.1.7** 前端 `api/agentSkill.ts` 加 `checkSkillPolicy()` + `SkillCheckResult` 类型 ✅
- [x] **5.1.8**（补强）`ResolvedTool`/`ResolvedSkillTool` 加 `skillKey`（前端 gate 定位技能风险）；`resolveEnabledTools` 同能力多技能引用时**取最高风险技能归属**（防 skillKey 驱动风险后被静默降级）✅
- ⚠️ **已知限制（review HIGH，非本次引入、超阶段5范围）**：安全策略（L4/黑名单/审批）的执行点是**前端 `runPolicyGate`（客户端闸门）**，可被绕过——持有底层权限点（如 `coding:generator:generate`）的用户**直接向目标业务接口 `/admin/coding/generator/*` 发 HTTP 请求**即可跳过 check，因为这些接口只挂 `@Perms` 守卫、自身不调 `SecurityCheckService`。这与 agent-tool 的 `checkToolPermission` 同为"可选调用"模式（非 Guard/Interceptor 强制拦截）。彻底解决需在目标接口层加全局 Interceptor/Guard 强制复用 check——属独立架构工作，不在本计划范围。
- ⚠️ **已知取舍（review LOW）**：`agent-skill/check` 与 `security-policy/check` 两个接口都仅需登录、且会把 `matchedPolicies`/`blockedReason`（黑名单目录、敏感词类别等策略细节）回显给**任意登录用户**，可被构造 payload 探测安全策略配置。两处行为一致，属既定设计取舍。

### 5.2 验证

```bash
cd server && npx tsc --noEmit
cd frontend && npx vite build
# 联动冒烟（构造不同 riskLevel 技能）：
#   L1/L2 只读技能执行 → check allowed:true，正常执行
#   L4 敏感技能执行 → check 按安全策略判定（拦截/需确认/需审批），审计有记录
#   把某能力参数带危险命令（rm -rf）→ check 命中 CLI 黑名单拦截
#   check 结果与安全策略 checkSecurityPolicy 一致（同一 SecurityCheckService）
#   执行后 security-policy/audit-log/list 有 skillKey 维度记录
```
- [x] **验证 5.A** server tsc exit 0、frontend vite build exit 0（所有文件≤500）✅
- [x] **验证 5.B** 脚本 6 项全过：DI 解析 checkPolicy、L1放行、L4默认deny、危险命令(rm -rf)升级 L4 拦截、testCapability 被 L4 拦(不发 self-call)、技能不存在被拒；修复后补验 2 项：共享能力归属高风险技能、去重仍生效 ✅
- [x] **验证 5.C** 复用同一 `SecurityCheckService.check`（与 `checkToolPermission` 同源），结论口径天然一致 ✅
- [x] **验证 5.D** code-reviewer DONE_WITH_CONCERNS：MEDIUM（skillKey 驱动风险后 resolveEnabledTools 静默降级）已修并复审；HIGH（裸调用绕过）/LOW（check 信息暴露）为既有架构限制/既定取舍，记录为已知限制 ✅

**阶段 5 完成标志**：Skills 执行接入统一 check + 审计落地 + 与安全策略口径一致 + code-review 通过 → 进度总表阶段 5 ✅

---

## 阶段 6 · 全量验证

**目标**：端到端回归，确认全链路无回归。
**前置**：阶段 0–5 完成。

### 6.1 任务清单与验证

- [x] **6.1.1** `prisma migrate diff`（实际库→schema）**No difference**（已同步无漂移；见下方⚠️事故记录，恢复后版本表物理 FK 也补齐了）✅
- [x] **6.1.2** `server npx tsc --noEmit` exit 0 ✅
- [x] **6.1.3** `frontend npx vite build` exit 0 ✅
- [x] **6.1.4a HTTP 端到端回归（已实测，真实登录+鉴权+DI+DB）**：用 admin/123456 登录取 token 后实打各端点全部通过 ✅
  - **`test` 只读能力 codegen.listTables → `success:true, durationMs:45`，resultSummary 含真实表名**（`base_sys_*`）——**self-call happy-path 首次端到端跑通**（进程内 fetch 127.0.0.1:9001、转发鉴权、目标 @Perms 生效、真实返回）
  - `test` 敏感/越权能力 → 400 归属拒绝
  - `check`（阶段5）→ `allowed:true, riskLevel:L1, matchedPolicies:["风险等级默认行为：L1"]`（fallback 默认正确）
  - `version/list`（阶段3）→ 内置技能空历史（正确：builtin 经 onModuleInit 建、不走 createSkill 快照）
  - `export`（阶段4）→ 真实 JSON，含 skillKey/capabilities、无 id/creator（脱敏正确）
  - `enums`（阶段1）→ categories + riskLevels 正常
- [ ] **6.1.4b 纯 UI 目视（仅剩浏览器渲染/交互，见文末清单）**：行内启停开关翻转、日志筛选下拉、L4 文案渲染、回滚后面板刷新、导入报告弹窗、聊天中 L4 被 gate 拦截提示。后端逻辑均已实测，仅剩前端渲染确认。
- [x] **6.1.5** 全量 code-reviewer 终审：DONE_WITH_CONCERNS→修复2项(recordRun 归属统一为最高风险 helper、export 独立权限点)→无 CRITICAL/HIGH，仅剩 2 条已记录已知限制 ✅
- [x] **6.1.6** 清理构建产物（每次 build 后已 `rm -rf dist`）✅
- [x] **6.1.7** 更新进度总表 ✅

> ⚠️ **事故记录（阶段6，已恢复）**：查漂移时误用 `prisma migrate diff --shadow-database-url "<真实DATABASE_URL>"`，导致 Prisma 把开发库当草稿库重置、清空数据并只部分重建。已用 `prisma db push`（重建全部 34 表结构，migrate diff 现 No difference）+ `prisma db seed`（管理员/菜单/岗位/角色）+ 各模块 `onModuleInit`（内置技能/安全默认/工具注册，服务重启自愈）恢复。**不可自动恢复**：用户手工录入的数据（尤其 `model_provider_config` 的模型 API Key）需重配或从备份还原。教训：查漂移只能用只读的 `--from-url <DB> --to-schema-datamodel`，绝不能拿真实库作 shadow db。

**阶段 6 完成标志**：三构建通过 + 端到端回归通过 + 终审通过 + 清理 → 阶段 6 ✅，项目完成

---

## 7. 接口清单汇总（前缀 `admin/agent-skill`）

| 接口 | 权限点 | 状态 | 阶段 | 说明 |
|------|--------|------|------|------|
| `list` `stats` `categories` | list | 已有 | - | 列表/统计/分类 |
| `catalog` `enabled` | catalog/enabled | 已有 | - | 能力目录/已启用工具 |
| `add` `update` `toggle` `delete` | 各动作 | 已有 | - | 技能 CRUD |
| `run-log/list` `run-log/record` | list/- | 已有 | - | 运行日志 |
| `enums` | list | 新增 | 0 | 分类/风险枚举下发（含 L4 文案） |
| `agents` | list | 新增(条件) | 1 | 适用智能体候选（若 ag-ui 无现成源） |
| `test` | test | 新增 | 2 | 能力测试/试运行 |
| `version/list` `version/rollback` | list/update | 新增 | 3 | 版本历史/回滚 |
| `export` `import` | **export**/**import** | ✅ | 4 | 导入/导出（各用独立权限点，可分别授权） |
| `check` | 仅登录 | ✅ | 5 | 执行前安全策略校验（委托 SecurityCheckService） |

---

## 8. 冗余项处理说明

| 项 | 结论 |
|----|------|
| `calls7d` 取了不用 | 阶段1 在表格展示，转为有用 |
| `sort` 无 UI 入口 | 保留（导入/编辑可用），暂不加拖拽排序 UI（非本次范围） |
| 「上传 Skill」假按钮 | 阶段4 做成真导入 |
| 详情面板「权限控制」写死文案 | 阶段1 改读 enums 的 note；阶段5 后可进一步展示真实 check 预判（可选增强，非必须） |

---

## 9. 安全红线（贯穿全程）

1. **能力绑定永远来自后端 catalog**：技能/导入文件都不能指定任意 URL（防 SSRF/越权）。任何新入口（test/import）必须复用 `assertValidCapabilities`。
2. **前端 check 是防御不是边界**：目标能力接口的 `@Perms` 守卫始终是最终边界，接了 check 不等于可放松接口鉴权。
3. **敏感能力（sensitive）在 test/管理入口默认不可执行**，或强制确认 + 走 check。
4. **审计脱敏**：Skills 联动写审计复用安全策略已有的 payload 脱敏（`maskPayload`），不落明文敏感值。
5. **内置技能**：不可删除、不可改 skillKey/builtin；回滚不改这些不可变字段。

---

## 10. 人工验收清单（仅剩纯浏览器渲染/交互）

后端逻辑已由各阶段脚本 40+ 项断言 + **HTTP 端到端实测**（6.1.4a）全覆盖；构建/类型/漂移均通过。self-call happy-path、check、export、version/list、enums 均已用真实登录+鉴权跑通。以下仅剩**页面目视/交互**（green build 与 HTTP 实测都证明不了前端渲染，务必真点）：

- [ ] **阶段1**：表格「近7日调用」列有数值；行内「启停」开关翻转；日志筛选下拉切换列表随之变化（含清空复位）；L4 技能详情「权限控制」显示 L4 文案；编辑弹窗「适用智能体」下拉非空
- [ ] **阶段2**：详情面板点某只读能力「测试」→ 弹窗填参→展示 success+耗时+表名（后端已实测通，仅确认弹窗交互）；敏感能力按钮置灰/提示
- [ ] **阶段3**：回滚历史版本后，详情面板字段**立即刷新**为回滚后值（验证 store selected 引用修复；reactivity bug 构建/HTTP 都查不出）
- [ ] **阶段4**：「导出全部」触发浏览器下载 JSON；「导入 Skill」选文件→导入报告数字正确、列表刷新
- [ ] **阶段5**：聊天中触发 L4 技能能力 → 被 runPolicyGate 拦截并提示 blockedReason；`security-policy/audit-log/list` 有记录

**事故善后**
- [ ] `model_provider_config`（模型供应商/API Key）等手工数据按需重配或从备份还原

---

## 10. 中断恢复指引

**恢复步骤：**
1. 打开本文件，看「§5 进度追踪总表」定位最后一个 ✅ 阶段
2. 进入第一个非 ✅ 阶段，找到其任务清单中第一个未勾选 `[ ]` 的任务
3. 该阶段「产出文件」列出的文件若已部分存在，先 Read 确认已完成到哪
4. 从未完成任务继续；完成后勾选 `[x]` 并更新进度总表
5. 每个阶段结束务必跑该阶段「验证」小节命令，全绿再进下一阶段

**判断某任务是否真的完成（不靠记忆）：**
- 建表类：`cd server && npx prisma studio` 或查 schema.prisma 是否有该 model
- 接口类：`cd server && npx tsc --noEmit` + 启动后冒烟对应接口
- 前端类：`cd frontend && npx vite build` + 页面手工确认
- 严禁在未跑验证命令的情况下把任务标记为完成（遵循 Verify-Before-Claim）

**阶段间依赖：**
- 阶段 0 是所有阶段前置
- 阶段 3 依赖阶段 0（版本表）
- 阶段 5 依赖安全策略模块（已存在）；建议阶段 2 先完成（测试入口一并接入 check）
- 阶段 1/2/4 相互独立，可并行
- 阶段 6 依赖全部

---

## 11. 执行节奏

- 默认：**一阶段一验证一 code-review**，通过后再进下一阶段
- 每阶段完成后更新「§5 进度追踪总表」状态与完成时间
- 遇阻塞：在进度总表该阶段备注写明原因，标 ⚠️，不跳过
- 涉及需求说明书（SRS）的同步（如新增功能需回写需求文档），另按 req-doc 流程处理，不在本计划范围

---

## 12. 变更记录

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-07-08 | 初稿，7 阶段（0–6）执行计划定稿。基于前后端现状盘点（后端已 80% 对齐），确定「补缺口 + 3 新功能 + 安全联动」范围 |







