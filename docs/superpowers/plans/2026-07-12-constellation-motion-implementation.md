# 智能体协作星图动画 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保持首页现有配色与真实数据接口不变的前提下，将智能体星图升级为带数据流交接动画和遥测节点卡的可交互流程视图。

**Architecture:** 在现有 `advanceCarousel` 轮播模型上增加纯函数形式的过渡描述，组件使用短暂的 `transition` 状态先播放连接线和数据粒子，再提交新的轮播位置。节点继续使用 SVG，固定尺寸并通过状态边、图标、扫描线和信号灯表达状态，底部详情仍由当前阶段数据驱动。

**Tech Stack:** Next.js 14、React 18、TypeScript、Tailwind CSS、SVG SMIL、Lucide React、Node Test Runner。

## Global Constraints

- 不修改首页及全局设计令牌的现有配色。
- 不新增生产依赖，不修改后端接口或数据结构。
- 节点固定尺寸，动画不得引起布局位移。
- 自动播放、暂停、悬停暂停、页面不可见暂停和手动选中阶段继续有效。
- 尊重 `prefers-reduced-motion`。

---

### Task 1: 星图过渡状态模型

**Files:**
- Modify: `ui/lib/dashboard/constellation-carousel.ts`
- Test: `ui/lib/dashboard/constellation-carousel.test.mjs`

**Interfaces:**
- Produces: `buildCarouselTransition(position, viewCount, stageCount)`，返回当前连线索引与 `advanceCarousel` 计算出的目标位置。

- [ ] 先增加失败测试，断言普通阶段和跨项目阶段都返回正确的 `linkIndex` 与目标位置。
- [ ] 运行 `node --experimental-strip-types --test lib/dashboard/constellation-carousel.test.mjs`，确认因函数缺失而失败。
- [ ] 实现最小纯函数并重新运行测试，确认通过。

### Task 2: 数据流动画与遥测节点

**Files:**
- Modify: `ui/components/dashboard/agent-constellation.tsx`
- Modify: `ui/app/globals.css`

**Interfaces:**
- Consumes: `buildCarouselTransition`、现有 `DashboardAgentStage`、`buildAgentStageView`。
- Produces: 固定尺寸节点、阶段图标、活动扫描线、状态信号灯、活动连接和 SVG 数据粒子。

- [ ] 将自动轮播改为“创建过渡、播放 850ms、提交目标位置”的顺序。
- [ ] 清理过渡计时器，确保暂停、卸载和数据变化时不残留异步更新。
- [ ] 将节点升级为 150x68 遥测卡，保留键盘和点击选择能力。
- [ ] 为活动节点、风险节点、活动连线与数据粒子增加克制动画，并保留 reduced-motion 降级。

### Task 3: 验证与视觉验收

**Files:**
- Verify: `ui/components/dashboard/agent-constellation.tsx`
- Verify: `ui/app/globals.css`

- [ ] 运行星图与首页相关 Node 测试。
- [ ] 运行 `npx tsc --noEmit`。
- [ ] 启动临时前端，在桌面尺寸验证自动交接、手动选择、暂停、节点无重叠、控制台和关键接口。
- [ ] 保存桌面截图与演示视频，停止仅由本任务启动的临时服务。
- [ ] 运行 scoped `git diff --check` 并审查最终差异，不提交或覆盖其他工作区修改。
