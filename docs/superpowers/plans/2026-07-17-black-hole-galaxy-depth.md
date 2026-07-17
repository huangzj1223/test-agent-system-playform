# Black Hole Galaxy Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首页星图升级为全宽、带真实前后景深度和黑洞吸积凹陷的银河，并把今日质量简报迁入项目空间。

**Architecture:** `constellation-carousel.ts` 提供确定性的深度星场、中心增密星尘、星团和吸积盘投影纯函数；`galaxy-particle-layer.tsx` 保留远景星云和伴星系；新增 `galaxy-webgl-layer.tsx` 使用 Three.js 绘制真实三维旋臂、星团、吸积盘、事件视界和引力漏斗。`AgentConstellation` 只组合渲染层、调整容器空间和核心视觉层，不改变业务数据或交互状态机。

**Tech Stack:** Next.js 14、React 18、TypeScript、Tailwind CSS、Three.js/WebGL、Canvas 2D、SVG、Node Test Runner、Playwright。

## Global Constraints

- 新增 `three` 和必要类型依赖，不修改 dashboard API 数据结构。
- 七阶段顺序、状态、链接、轮播、暂停、2D/3D 和 reduced-motion 行为保持不变。
- 首页移除今日质量简报和全局项目战情预览，今日质量简报迁入项目空间。
- 不覆盖或提交工作区内无关改动。

---

### Task 1: 深度星场与吸积盘投影模型

**Files:**
- Modify: `ui/lib/dashboard/constellation-carousel.ts`
- Test: `ui/lib/dashboard/constellation-carousel.test.mjs`

**Interfaces:**
- Produces: `GalaxyParticleSeed.depth`、`GalaxyClusterSeed`、`AccretionProjection`、`buildGalaxyClusterSeeds(count)`、`projectAccretionPoint(radius, angle, rotation)`。

- [ ] **Step 1: 写失败测试**

```js
const stars = buildGalaxyParticleSeeds(120);
assert.ok(stars.every((star) => star.depth >= 0 && star.depth <= 1));
assert.ok(mean(stars.filter((star) => star.depth > 0.7).map((star) => star.radius)) > mean(stars.filter((star) => star.depth < 0.3).map((star) => star.radius)));
assert.ok(buildGalaxyDustSeeds(500).filter((dust) => dust.radius < 0.45).length / 500 > 0.45);
assert.ok(projectAccretionPoint(0.12, 0, 0).funnel > projectAccretionPoint(0.85, 0, 0).funnel);
assert.ok(buildGalaxyClusterSeeds(12).every((cluster) => cluster.radius > 0.12 && cluster.radius < 0.9));
```

- [ ] **Step 2: 运行 RED**

Run: `node --test --experimental-strip-types ui/lib/dashboard/constellation-carousel.test.mjs`

Expected: FAIL，因为深度字段、星团生成器和吸积投影不存在，现有尘埃中心密度不足。

- [ ] **Step 3: 实现最小纯函数**

`projectAccretionPoint` 使用倾斜盘投影：`depth=(sin(theta)+1)/2`，`funnel=(1-radius)^3`，并返回归一化 `x/y/scale/alpha/brightness`。星场半径和透明度由 `depth` 决定；尘埃半径使用内外混合分布。

- [ ] **Step 4: 运行 GREEN**

Run: `node --test --experimental-strip-types ui/lib/dashboard/constellation-carousel.test.mjs`

Expected: 全部测试通过。

### Task 2: 首页职责迁移与星图扩容

**Files:**
- Modify: `ui/app/projects/workspace-responsibilities.test.mjs`
- Modify: `ui/app/projects/page.tsx`
- Modify: `ui/app/projects/spaces/page.tsx`
- Modify: `ui/components/dashboard/agent-constellation.tsx`

**Interfaces:**
- Consumes: 既有 `useDashboardOverview()` 数据。
- Produces: 首页全宽星图；项目空间中的 `QualityBrief`。

- [ ] **Step 1: 更新职责测试并运行 RED**

```js
assert.doesNotMatch(overviewSource, /QualityBrief|ProjectSituation|全局项目战情预览/);
assert.match(spacesSource, /QualityBrief/);
```

Run: `node --test ui/app/projects/workspace-responsibilities.test.mjs`

Expected: FAIL，因为当前首页仍渲染简报和战情预览。

- [ ] **Step 2: 最小布局修改**

首页只渲染 `<AgentConstellation ... />`；项目空间底部运营区域加入 `<QualityBrief risks={data?.risk_items ?? []} updatedAt={data?.updated_at ?? new Date().toISOString()} />`。星图桌面高度设为 640px，Canvas 视口高度设为 474px。

- [ ] **Step 3: 运行 GREEN**

Run: `node --test ui/app/projects/workspace-responsibilities.test.mjs`

Expected: 全部测试通过。

### Task 3: 黑洞吸积式 Canvas 与核心层

**Files:**
- Modify: `ui/components/dashboard/galaxy-particle-layer.tsx`
- Create: `ui/components/dashboard/galaxy-webgl-layer.tsx`
- Modify: `ui/components/dashboard/agent-constellation.tsx`
- Modify: `ui/app/globals.css`
- Modify: `ui/output/playwright/agent-constellation-galaxy.spec.ts`

**Interfaces:**
- Consumes: Task 1 的投影、星场、尘埃和星团种子。
- Produces: `.galaxy-webgl-layer`、`.galaxy-event-horizon`、`.galaxy-gravity-well`、`.galaxy-lensing-ring` 和 Canvas/WebGL 分层图像。

- [ ] **Step 1: 写浏览器失败验收**

```ts
await expect(page.locator('.galaxy-event-horizon')).toHaveCount(1);
await expect(page.locator('.galaxy-gravity-well')).toHaveCount(1);
await expect(page.locator('.galaxy-webgl-layer')).toHaveCount(1);
expect((await page.locator('.galaxy-constellation').boundingBox())?.height).toBeGreaterThanOrEqual(620);
await expect(page.getByText('今日质量简报', { exact: true })).toHaveCount(0);
```

- [ ] **Step 2: 运行 RED**

Run: `$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3001'; npx playwright test output/playwright/agent-constellation-galaxy.spec.ts --reporter=line -g '1920 宽屏'`

Expected: FAIL，因为黑洞层不存在且星图高度不足。

- [ ] **Step 3: 实现分层绘制**

Canvas 绘制背景星场、远侧星云和伴星系；Three.js 场景使用透视相机和倾斜三维盘面绘制远侧吸积粒子、引力井/事件视界、近侧吸积粒子、星团和近景恒星。同一粒子通过世界坐标深度和透视相机自然改变尺寸与亮度，核心附近叠加向内弯曲的环面和吸入光丝。

- [ ] **Step 4: 实现核心 DOM 层**

在固定中心节点中加入暗事件视界、引力透镜环和纵深阴影；文本位于暗核前景，保证对比度和链接可访问性。

- [ ] **Step 5: 运行 GREEN**

Run: `node --test --experimental-strip-types ui/lib/dashboard/constellation-carousel.test.mjs`

Run: `node --test ui/app/projects/workspace-responsibilities.test.mjs`

Run: `$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:3001'; npx playwright test output/playwright/agent-constellation-galaxy.spec.ts --reporter=line`

Expected: 单元和浏览器测试全部通过，控制台 0 error。

### Task 4: 生产验证与服务

**Files:**
- Verify: `ui/app/projects/page.tsx`
- Verify: `ui/app/projects/spaces/page.tsx`
- Verify: `ui/components/dashboard/agent-constellation.tsx`
- Verify: `ui/components/dashboard/galaxy-particle-layer.tsx`

- [ ] **Step 1: 类型与构建**

Run: `npx tsc --noEmit`

Run: `npm run build`

Expected: exit 0，静态页面全部生成。

- [ ] **Step 2: Playwright 实机验收**

在 1920×1080 打开 `/projects`，暂停到 05 阶段后截图；检查主银河可辨识、中心黑洞凹陷、近景亮星、远景暗星、七阶段文字和箭头完整。再打开 `/projects/spaces` 确认今日质量简报迁移成功。

- [ ] **Step 3: 差异与服务检查**

Run: `git diff --check -- ui/app/projects/page.tsx ui/app/projects/spaces/page.tsx ui/app/globals.css ui/components/dashboard/agent-constellation.tsx ui/components/dashboard/galaxy-particle-layer.tsx ui/lib/dashboard/constellation-carousel.ts ui/lib/dashboard/constellation-carousel.test.mjs`

Expected: exit 0；前端 3001 和后端 8001 均返回 HTTP 200。
