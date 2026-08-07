# 协作棱镜图标系统实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立协作棱镜品牌标识和统一产品图标映射，并替换全局框架、首页及浏览器标签中的旧图标。

**Architecture:** 通过可复用 React 品牌组件、中央业务图标映射、状态图标组件和统一图标容器控制全系统语义与视觉。基础图形继续使用 Lucide，品牌标识使用独立 SVG，页面不再自行选择同一业务的不同符号。

**Tech Stack:** Next.js 14、React 18、TypeScript、Tailwind CSS、lucide-react、SVG。

## Global Constraints

- 产品界面只显示中文，技术标识符除外。
- 线性图标统一 1.8 像素线宽，普通导航 16 像素，业务入口 18 至 20 像素。
- 图标容器圆角 6 至 8 像素，不使用 Emoji 和普通功能图标多色渐变。
- 页面不得再次引用旧 `/logo.svg` 和 `/avatar.png`。
- 状态必须同时通过中文、图标和颜色表达。

---

### Task 1: 品牌资产与组件

**Files:**
- Create: `ui/components/brand/system-mark.tsx`
- Create: `ui/components/brand/index.ts`
- Create: `ui/public/brand-mark.svg`
- Create: `ui/public/icon.svg`
- Modify: `ui/app/layout.tsx`

- [ ] 创建支持 `light`、`dark`、`mono` 变体的 `SystemMark`，共享六边形、中央节点、三外围节点和连接线。
- [ ] 创建静态品牌标识与 32 像素简化浏览器图标。
- [ ] 将页面标题、描述和图标元数据改为正确中文，并移除旧图标依赖。
- [ ] 运行 `npx.cmd tsc --noEmit`，预期通过。

### Task 2: 中央图标映射和状态组件

**Files:**
- Create: `ui/components/icons/product-icons.tsx`
- Create: `ui/components/icons/icon-frame.tsx`
- Create: `ui/components/icons/status-icon.tsx`
- Create: `ui/components/icons/index.ts`
- Create: `ui/lib/icons/icon-system.test.mjs`

- [ ] 先编写映射测试，断言系统总览、智能体、项目、洞察、用例、API、Web、安全、运行、计划、报告和分析均有唯一映射。
- [ ] 运行 `node --experimental-strip-types --test lib/icons/icon-system.test.mjs`，确认映射尚未实现时失败。
- [ ] 实现 `productIcons`、`IconFrame` 和 `StatusIcon`，状态覆盖运行、就绪、完成、关注、阻塞、空闲和待接入。
- [ ] 再次运行映射测试，预期通过。

### Task 3: 全局框架图标替换

**Files:**
- Modify: `ui/components/layout/sidebar.tsx`
- Modify: `ui/components/layout/header.tsx`
- Modify: `ui/app/globals.css`

- [ ] 使用 `SystemMark` 替换侧栏旧 Logo。
- [ ] 使用中央映射替换全局导航和项目导航图标。
- [ ] 移除顶部 `/avatar.png`，改为用户身份图标和文字缩写。
- [ ] 设置全局 Lucide 线宽、对齐和图标按钮尺寸规则。
- [ ] 运行 `npx.cmd tsc --noEmit`，预期通过。

### Task 4: 首页图标替换

**Files:**
- Modify: `ui/app/projects/page.tsx`
- Modify: `ui/components/dashboard/metric-strip.tsx`
- Modify: `ui/components/dashboard/agent-constellation.tsx`
- Modify: `ui/components/dashboard/quality-brief.tsx`
- Modify: `ui/components/dashboard/project-situation.tsx`
- Modify: `ui/components/dashboard/personal-workbench.tsx`
- Modify: `ui/components/dashboard/loop-efficiency.tsx`
- Modify: `ui/components/dashboard/recent-activity.tsx`

- [ ] 首页快捷入口和指标使用统一业务映射与 `IconFrame`。
- [ ] 智能体节点、风险、项目状态、工作台和闭环效率使用 `StatusIcon`。
- [ ] 保持操作类图标语义不变，但统一尺寸、线宽和容器。
- [ ] 运行 `npx.cmd tsc --noEmit`，预期通过。

### Task 5: 全局扫描与浏览器验收

**Files:**
- Modify: 仍直接引用旧品牌资产或使用 Emoji 状态的高频页面。

- [ ] 使用 `rg` 确认代码中不存在 `/logo.svg`、`/avatar.png` 和旧品牌图片引用。
- [ ] 运行图标映射测试和 TypeScript 检查。
- [ ] 临时启动前后端，检查首页、测试用例页、API 测试页和移动导航。
- [ ] 截取桌面与移动端图标验收图，确认无变形、错色、挤压和控制台错误。
- [ ] 停止临时服务并运行 `git diff --check`。
