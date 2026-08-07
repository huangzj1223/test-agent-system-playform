# 智能质量控制中心实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将系统全局外观升级为冷静的智能蓝图风格，并把首页建设为基于真实项目、运行、失败分析和闭环数据的智能质量控制中心。

**Architecture:** 后端新增只读的系统总览聚合接口，一次性返回项目、运行作业、失败分析和闭环状态。前端使用独立数据适配层与小型展示组件渲染智能体协作星图、风险简报、项目战情和个人处置台；单个区块具备独立空状态，不让部分数据缺失拖垮整个首页。

**Tech Stack:** FastAPI、SQLAlchemy AsyncSession、Pydantic、Next.js 14、React 18、TypeScript、Tailwind CSS、shadcn/ui、lucide-react、Node.js 22 内置测试运行器。

## Global Constraints

- 产品界面只显示中文，必要的技术标识符除外。
- 首页只展示后端真实数据；缺少数据时显示“待接入”或“暂无运行任务”。
- 全局圆角统一为 6 到 8 像素，不使用大面积高饱和渐变和霓虹数字阴影。
- 主界面使用浅冷灰工作区、深靛蓝导航、白色数据表面；状态色为青色、荧光绿、琥珀色和珊瑚红。
- 保持现有业务路由和功能不变，不重写业务页面内部结构。
- 桌面和移动端不得出现文本重叠、横向溢出和由动态内容造成的布局跳动。

---

### Task 1: 系统总览聚合接口

**Files:**
- Create: `backend/app/schemas/dashboard.py`
- Create: `backend/app/services/dashboard_service.py`
- Create: `backend/app/api/v2/dashboard.py`
- Modify: `backend/app/api/__init__.py`
- Create: `backend/test_dashboard_service.py`

**Interfaces:**
- Consumes: `Project`、`TestRun`、`TestRunScriptJob`、`TestFailureAnalysis`、`TestFailureLoopRun` SQLAlchemy 模型。
- Produces: `DashboardService.get_overview() -> DashboardOverview` 和 `GET /api/v2/dashboard/overview`。

- [ ] **Step 1: 编写聚合逻辑的失败测试**

```python
from app.services.dashboard_service import calculate_pass_rate


def test_calculate_pass_rate_uses_executed_results_only():
    assert calculate_pass_rate(passed=8, failed=2, blocked=1) == 73
    assert calculate_pass_rate(passed=0, failed=0, blocked=0) is None
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `.venv\Scripts\python.exe -m unittest backend.test_dashboard_service -v`

Expected: FAIL，提示 `dashboard_service` 或 `calculate_pass_rate` 尚不存在。

- [ ] **Step 3: 定义响应模型和聚合服务**

```python
def calculate_pass_rate(*, passed: int, failed: int, blocked: int) -> int | None:
    executed = passed + failed + blocked
    return round(passed / executed * 100) if executed else None


class DashboardService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_overview(self) -> DashboardOverview:
        projects = await self._project_situations()
        metrics = await self._metrics(projects)
        stages = await self._agent_stages()
        risks = await self._risk_items()
        work_items = await self._work_items()
        activities = await self._recent_activities()
        efficiency = await self._loop_efficiency()
        return DashboardOverview(
            updated_at=datetime.now(timezone.utc),
            metrics=metrics,
            agent_stages=stages,
            risk_items=risks,
            projects=projects,
            work_items=work_items,
            recent_activities=activities,
            loop_efficiency=efficiency,
        )
```

同一服务内实现上述七个私有查询方法；每个方法只执行一次分组查询，并返回 `backend/app/schemas/dashboard.py` 中对应的 Pydantic 模型。风险项来自失败作业、失败分析和运行中的失败闭环，个人处置项只来自等待人工确认、失败或阻塞状态的真实记录。

响应必须包含 `updated_at`、`metrics`、`agent_stages`、`risk_items`、`projects`、`work_items`、`recent_activities` 和 `loop_efficiency`。所有百分比字段允许为 `None`。

- [ ] **Step 4: 注册只读接口**

```python
router = APIRouter(prefix="/dashboard")


@router.get("/overview", response_model=DashboardOverview)
async def get_dashboard_overview(db: DbSessionDep) -> DashboardOverview:
    return await DashboardService(db).get_overview()
```

- [ ] **Step 5: 运行后端检查**

Run: `.venv\Scripts\python.exe -m unittest backend.test_dashboard_service -v`

Expected: PASS。

Run: `.venv\Scripts\python.exe -m compileall backend/app/schemas/dashboard.py backend/app/services/dashboard_service.py backend/app/api/v2/dashboard.py`

Expected: 三个文件均成功编译。

### Task 2: 前端总览数据适配层

**Files:**
- Create: `ui/lib/api/dashboard.ts`
- Create: `ui/lib/dashboard/model.ts`
- Create: `ui/lib/dashboard/model.test.ts`

**Interfaces:**
- Consumes: `GET /api/v2/dashboard/overview`。
- Produces: `getDashboardOverview(): Promise<DashboardOverview>`、`formatMetric(value, suffix)`、`buildAgentStageView(stages)`。

- [ ] **Step 1: 编写数据格式化失败测试**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { formatMetric } from "./model.ts";

test("缺失指标显示待接入", () => {
  assert.equal(formatMetric(null, "%"), "待接入");
  assert.equal(formatMetric(86, "%"), "86%");
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --experimental-strip-types --test ui/lib/dashboard/model.test.ts`

Expected: FAIL，提示 `model.ts` 不存在。

- [ ] **Step 3: 实现类型、安全请求和适配逻辑**

```typescript
export function formatMetric(value: number | null, suffix = ""): string {
  return value === null ? "待接入" : `${value}${suffix}`;
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  return apiClient.get<DashboardOverview>("/dashboard/overview");
}
```

- [ ] **Step 4: 运行单元测试和类型检查**

Run: `node --experimental-strip-types --test ui/lib/dashboard/model.test.ts`

Expected: PASS。

Run: `npx.cmd tsc --noEmit`

Expected: PASS。

### Task 3: 全局设计令牌和应用框架

**Files:**
- Modify: `ui/app/globals.css`
- Modify: `ui/components/layout/main-layout.tsx`
- Modify: `ui/components/layout/sidebar.tsx`
- Modify: `ui/components/layout/header.tsx`

**Interfaces:**
- Consumes: 现有 `MainLayout`、`Sidebar`、`Header` 公共接口。
- Produces: 所有页面共享的冷灰蓝工作区、深靛蓝侧栏、浅色顶部栏和统一交互状态。

- [ ] **Step 1: 替换三层设计令牌**

```css
:root {
  --background: 225 30% 97%;
  --foreground: 233 27% 17%;
  --card: 0 0% 100%;
  --primary: 236 85% 67%;
  --sidebar: 234 30% 20%;
  --sidebar-active: 234 24% 30%;
  --agent-running: 178 64% 48%;
  --loop-complete: 78 62% 52%;
  --risk-warning: 40 86% 62%;
  --risk-blocked: 5 83% 65%;
}
```

删除旧的 `glow-number`、`neon-card` 和大面积渐变规则，新增 `workspace-panel`、`status-dot`、`command-surface`。

- [ ] **Step 2: 调整全局壳层**

`MainLayout` 使用浅色连续背景；桌面侧栏宽度调整为约 `220px`；顶部栏改为浅色半透明表面。保留原有项目路由解析和切换行为。

- [ ] **Step 3: 重组侧栏层级**

加入“系统总览”“智能体任务”“项目空间”三个全局入口，保留当前项目的业务导航。项目切换器位于全局入口下方，底部展示系统状态和设置。

- [ ] **Step 4: 验证公共框架**

Run: `npx.cmd tsc --noEmit`

Expected: PASS。

### Task 4: 智能体协作星图与风险简报

**Files:**
- Create: `ui/components/dashboard/agent-constellation.tsx`
- Create: `ui/components/dashboard/quality-brief.tsx`
- Create: `ui/components/dashboard/dashboard-section.tsx`

**Interfaces:**
- Consumes: `DashboardAgentStage[]` 和 `DashboardRiskItem[]`。
- Produces: 可点击的智能体阶段节点、任务流连线、节点详情区和风险建议列表。

- [ ] **Step 1: 实现稳定尺寸的协作星图**

使用 SVG 绘制固定 `viewBox="0 0 760 360"` 的节点与连线。移动端不缩放文字，而改为阶段列表。运行中的连线增加尊重 `prefers-reduced-motion` 的流动虚线。

- [ ] **Step 2: 实现节点交互**

节点使用原生 `button` 或带键盘事件的 SVG 分组；选中后在画布底部显示阶段说明、真实任务数、失败数和目标链接。无数据节点显示“暂无运行任务”。

- [ ] **Step 3: 实现风险解释器**

每条风险显示级别图标、标题、原因、项目、置信状态和链接。没有风险时显示最近检查时间与“当前没有高风险项”。

- [ ] **Step 4: 运行类型检查**

Run: `npx.cmd tsc --noEmit`

Expected: PASS。

### Task 5: 项目战情、个人处置台和闭环效率

**Files:**
- Create: `ui/components/dashboard/metric-strip.tsx`
- Create: `ui/components/dashboard/project-situation.tsx`
- Create: `ui/components/dashboard/personal-workbench.tsx`
- Create: `ui/components/dashboard/loop-efficiency.tsx`
- Create: `ui/components/dashboard/recent-activity.tsx`

**Interfaces:**
- Consumes: `DashboardMetrics`、`DashboardProjectSituation[]`、`DashboardWorkItem[]`、`DashboardLoopEfficiency`、`DashboardActivity[]`。
- Produces: 紧凑真实指标带、风险优先的项目表格、可执行工作队列、闭环统计和最近活动。

- [ ] **Step 1: 实现紧凑指标带**

指标包含活跃项目、测试资产、运行任务、待人工处置和最近周期通过率。`null` 使用 `formatMetric` 显示“待接入”。

- [ ] **Step 2: 实现项目战情表格**

桌面端使用六列紧凑表格，按风险和最近活动排序；移动端转换为无嵌套卡片的项目摘要列表。每行“进入项目”跳转到 `/projects/{identifier}`。

- [ ] **Step 3: 实现个人处置台**

分为“需要我审核”“需要我处理”“我正在观察”三个标签页。任务链接只能使用后端返回的真实 `href`；无任务时显示完成状态。

- [ ] **Step 4: 实现闭环效率和最近活动**

缺少平均定位时间、自动修复率或验证通过率时显示“待接入”，同时保留已追踪闭环数量。活动流展示项目、事件类型、时间和目标链接。

- [ ] **Step 5: 运行类型检查**

Run: `npx.cmd tsc --noEmit`

Expected: PASS。

### Task 6: 重构首页并完成视觉验收

**Files:**
- Modify: `ui/app/projects/page.tsx`
- Create: `ui/components/dashboard/dashboard-skeleton.tsx`

**Interfaces:**
- Consumes: Task 2 的请求函数和 Task 4-5 的全部首页组件。
- Produces: 完整系统首页，以及保留原有新建、编辑、删除项目功能的项目管理入口。

- [ ] **Step 1: 重写首页数据流**

首页并行加载项目列表和系统总览。系统总览失败时只让数据区显示局部错误及重试按钮；项目创建、编辑和删除逻辑继续使用现有 API。

- [ ] **Step 2: 按信息架构组合首页**

首行依次渲染页面标题、更新时间、智能体状态和“发起智能任务”；随后渲染指标带、星图与简报、项目战情、个人处置台、闭环效率和最近活动。

- [ ] **Step 3: 添加加载和空状态**

骨架屏保持与最终区块相同的高度。新系统没有项目时显示创建项目入口；有项目无运行数据时显示“尚无运行记录”，但保留项目资产统计。

- [ ] **Step 4: 运行全部静态检查**

Run: `node --experimental-strip-types --test ui/lib/dashboard/model.test.ts`

Expected: PASS。

Run: `npx.cmd tsc --noEmit`

Expected: PASS。

Run: `.venv\Scripts\python.exe -m unittest backend.test_dashboard_service -v`

Expected: PASS。

- [ ] **Step 5: 启动服务并执行浏览器验收**

前端启动后检查 `/projects`：

- `1440x1000`：星图与简报并排，首屏看见指标、智能体状态和风险。
- `1024x900`：星图和简报上下排列，无横向滚动。
- `390x844`：侧栏折叠，星图转阶段列表，全部文字可读。
- 点击智能体节点、风险项、项目行和个人任务均能进入对应目标。
- 浏览器控制台无错误，页面无文本重叠和布局跳动。

- [ ] **Step 6: 检查改动边界**

Run: `git diff --check`

Expected: 无空白错误；确认未覆盖与本次改版无关的已有工作区改动。
