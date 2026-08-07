# 首页项目轮播与级联删除实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让首页项目操作、左侧菜单、全量/单项目星图轮播和项目永久删除形成一致且可验证的闭环。

**Architecture:** 前端以纯函数轮播模型驱动 `AgentConstellation`，页面仅负责编排项目上下文和仪表盘刷新。后端以 `ProjectDeletionImpact` 提供删除预览，由 `ProjectService` 统一收集 MinIO 对象并在确认后执行级联删除。

**Tech Stack:** Next.js 14、React、TypeScript、Lucide、FastAPI、SQLAlchemy Async、PostgreSQL、MinIO、Node test、pytest。

## Global Constraints

- 首页只保留标题操作区一个“新建项目”入口。
- 初始星图必须是全量视图，之后按全量和项目顺序循环。
- 每个阶段停留 3 秒，手动阶段选择暂停 8 秒。
- 删除项目不可恢复，必须展示影响统计并输入项目名称确认。
- MinIO 删除失败时不得删除数据库项目记录。

---

### Task 1: 双层轮播模型

**Files:**
- Create: `ui/lib/dashboard/constellation-carousel.ts`
- Create: `ui/lib/dashboard/constellation-carousel.test.mjs`
- Modify: `ui/components/dashboard/agent-constellation.tsx`

**Interfaces:**
- Produces: `buildConstellationViews(globalStages, projects)`、`advanceCarousel(state, viewCount, stageCount)`、`buildProjectStages(project)`。
- Consumes: `DashboardAgentStage` 与 `DashboardProjectSituation`。

- [ ] 写失败测试：断言首项为全量、项目顺序完整、阶段 0-6 后切换视图并回到阶段 0。
- [ ] 运行 `node --experimental-strip-types --test lib/dashboard/constellation-carousel.test.mjs`，确认因模块不存在失败。
- [ ] 实现纯函数和边界处理，空项目时仅保留全量视图。
- [ ] 再次运行测试并确认通过。
- [ ] 改造 `AgentConstellation` 使用 `viewIndex + stageIndex`，每 3 秒推进阶段，手动选择暂停 8 秒，标签页隐藏时停止计时。
- [ ] 在 SVG 环形流程中保留方向箭头，并让下方分析展示当前视图名称和阶段数据。
- [ ] 运行测试与 `npx tsc --noEmit`。

### Task 2: 首页项目列表联动和唯一新增入口

**Files:**
- Create: `ui/lib/dashboard/project-refresh.ts`
- Create: `ui/lib/dashboard/project-refresh.test.mjs`
- Modify: `ui/app/projects/page.tsx`
- Modify: `ui/lib/context/project-context.tsx`

**Interfaces:**
- Produces: `refreshProjectSurfaces(refreshProjects, loadDashboard)`。
- Consumes: `ProjectContext.refreshProjects` 与页面 `loadDashboard`。

- [ ] 写失败测试：断言刷新函数依次调用项目列表和仪表盘刷新。
- [ ] 运行测试并确认因函数不存在失败。
- [ ] 实现刷新编排函数。
- [ ] 创建、编辑、删除成功后调用统一刷新函数。
- [ ] 删除“全局项目战情”区域中的重复新增按钮，仅保留标题区入口。
- [ ] 运行测试与 TypeScript 检查。

### Task 3: 删除影响统计和后端级联服务

**Files:**
- Create: `backend/test_project_deletion.py`
- Modify: `backend/app/schemas/project.py`
- Modify: `backend/app/services/project_service.py`
- Modify: `backend/app/api/v2/projects.py`
- Modify: `backend/app/config/minio_client.py`

**Interfaces:**
- Produces: `ProjectDeletionImpact`、`ProjectDeletionResult`、`ProjectService.get_deletion_impact(identifier)`、`ProjectService.delete_project(identifier, confirmation)`。
- API: `GET /projects/{identifier}/deletion-impact` 与带确认标识的 `DELETE /projects/{identifier}`。

- [ ] 写失败测试：确认不匹配拒绝删除、影响统计包含附件、MinIO 删除异常时不调用仓储删除。
- [ ] 运行 `pytest test_project_deletion.py -q` 并确认预期失败。
- [ ] 实现 Pydantic 响应模型与影响统计查询。
- [ ] 增加 MinIO 批量对象删除方法，任何非“对象不存在”错误都中止流程。
- [ ] 删除服务先收集并清理对象，再删除项目并由 API 提交事务。
- [ ] API 返回删除统计，错误时回滚事务。
- [ ] 运行目标 pytest 和现有 dashboard 测试。

### Task 4: 删除确认界面

**Files:**
- Create: `ui/components/dashboard/project-delete-dialog.tsx`
- Modify: `ui/lib/api/projects.ts`
- Modify: `ui/lib/api/types.ts`
- Modify: `ui/app/projects/page.tsx`

**Interfaces:**
- Consumes: `getProjectDeletionImpact(identifier)` 与 `deleteProject(identifier, confirmation)`。
- Produces: 显示删除影响、名称确认和错误状态的 `ProjectDeleteDialog`。

- [ ] 扩展 API 类型和请求函数。
- [ ] 对话框打开时加载影响统计，按资源类别显示数量。
- [ ] 仅当输入值与项目名称完全一致时启用“永久删除”。
- [ ] 删除成功后调用统一刷新；失败时保留弹窗并显示后端原因。
- [ ] 运行 TypeScript 检查。

### Task 5: 端到端验收

**Files:**
- Save: `output/playwright/dashboard-carousel-desktop.png`
- Save: `output/playwright/dashboard-delete-impact.png`
- Save: `output/playwright/dashboard-carousel-mobile.png`

- [ ] 启动后端和前端临时服务。
- [ ] 使用 Playwright 确认首页只有一个新增项目入口。
- [ ] 新建临时项目并确认左侧菜单立即显示。
- [ ] 观察全量与单项目星图、阶段分析和方向箭头联动。
- [ ] 打开删除弹窗，确认影响统计和名称校验生效；删除临时项目并确认左侧菜单同步移除。
- [ ] 在 1440px 与 390px 视口保存截图并检查控制台错误。
- [ ] 运行所有新增测试、`npx tsc --noEmit` 与 `git diff --check`。
- [ ] 停止本次临时服务，不停止 PostgreSQL、MinIO 或用户其他进程。
