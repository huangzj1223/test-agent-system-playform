# 智能体协作星图银河闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首页现有固定星图升级为保持真实业务数据和页面栅格不变的七阶段银河 3D 闭环动画。

**Architecture:** 使用 `constellation-carousel.ts` 中的纯函数计算相位、深度、椭圆位置和箭头弧线；`AgentConstellation` 用 `requestAnimationFrame` 驱动七阶段相位并处理交互；独立 Canvas 层绘制低成本星尘。组件继续消费原有 dashboard 数据，不修改后端契约。

**Tech Stack:** Next.js 14、React 18、TypeScript、Tailwind CSS、SVG、Canvas、Node Test Runner、Playwright CLI。

## Global Constraints

- 不修改首页栅格和右侧质量简报。
- 不修改 `DashboardAgentStage`、`DashboardProjectSituation` 或后端接口。
- 不新增生产依赖。
- 阶段顺序固定为需求分析、测试设计、脚本生成、自动执行、结果分析、失败修复、回归验证。
- 组件必须支持暂停、悬停暂停、点击聚焦、2D/3D、页面隐藏暂停和 reduced-motion。
- 不覆盖工作区中的其他未提交修改。

---

### Task 1: 银河轨道纯函数模型

**Files:**
- Modify: `ui/lib/dashboard/constellation-carousel.ts`
- Test: `ui/lib/dashboard/constellation-carousel.test.mjs`

**Interfaces:**
- Produces: `GALAXY_STAGE_KEYS`、`easeOrbitPhase(rawPhase)`、`getFocusedStageIndex(phase, count)`、`getForwardPhaseTarget(phase, targetIndex, count)`、`computeOrbitNode(index, phase, count, mode)`、`buildOrbitArc(index, phase, count)`。

- [ ] **Step 1: 写失败测试**

```js
assert.deepEqual(GALAXY_STAGE_KEYS, ["requirements", "design", "generation", "execution", "analysis", "repair", "verification"]);
assert.equal(easeOrbitPhase(0.2), 0);
assert.equal(getFocusedStageIndex(4.55, 7), 5);
assert.equal(getForwardPhaseTarget(5.2, 1, 7), 8);
assert.ok(computeOrbitNode(0, 0, 7, "3d").scale > computeOrbitNode(3, 0, 7, "3d").scale);
assert.match(buildOrbitArc(0, 0, 7).path, /^M /);
```

- [ ] **Step 2: 验证 RED**

Run: `node --experimental-strip-types --test lib/dashboard/constellation-carousel.test.mjs`

Expected: FAIL，提示上述导出不存在。

- [ ] **Step 3: 实现最小纯函数**

在现有轮播函数旁增加固定顺序、42% 停留 + 正弦缓动、顺时针目标、3D/2D 深度参数和椭圆 SVG 弧线路径，不删除已有导出。

- [ ] **Step 4: 验证 GREEN**

Run: `node --experimental-strip-types --test lib/dashboard/constellation-carousel.test.mjs`

Expected: 现有 6 项和新增轨道测试全部通过。

### Task 2: Canvas 星尘层

**Files:**
- Create: `ui/components/dashboard/galaxy-particle-layer.tsx`
- Test: `ui/lib/dashboard/constellation-carousel.test.mjs`

**Interfaces:**
- Consumes: `paused: boolean`、`reducedMotion: boolean`。
- Produces: 覆盖星图主视觉的 `aria-hidden` Canvas；粒子种子由 `buildGalaxyParticleSeeds(count)` 提供。

- [ ] **Step 1: 增加失败测试**

```js
const seeds = buildGalaxyParticleSeeds(12);
assert.equal(seeds.length, 12);
assert.deepEqual(buildGalaxyParticleSeeds(12), seeds);
assert.ok(seeds.every((item) => item.x >= 0 && item.x <= 1));
```

- [ ] **Step 2: 验证 RED**

Run: `node --experimental-strip-types --test lib/dashboard/constellation-carousel.test.mjs`

Expected: FAIL，提示 `buildGalaxyParticleSeeds` 不存在。

- [ ] **Step 3: 实现确定性种子和 Canvas 组件**

Canvas 使用 `ResizeObserver`、上限 1.5 的 DPR、容器宽度决定的粒子数量、单一 RAF 和完整 cleanup；暂停时绘制静态帧。

- [ ] **Step 4: 验证 GREEN 与类型**

Run: `node --experimental-strip-types --test lib/dashboard/constellation-carousel.test.mjs && npx.cmd tsc --noEmit`

Expected: 全部通过。

### Task 3: 星图组件与专用样式

**Files:**
- Modify: `ui/components/dashboard/agent-constellation.tsx`
- Modify: `ui/app/globals.css`
- Create: `ui/output/playwright/agent-constellation-galaxy.spec.ts`

**Interfaces:**
- Consumes: 原有 `stages`、`projects`、`buildConstellationViews` 和 Task 1/2 导出。
- Produces: 银河主视觉、中心项目链接、七阶段能量节点、椭圆流程箭头、详情面板、暂停和视图控制。

- [ ] **Step 1: 写浏览器失败验收**

```ts
await expect(page.getByRole("img", { name: /银河质量闭环/ })).toBeVisible();
await expect(page.getByRole("button", { name: "切换为 2D 视图" })).toBeVisible();
await page.getByRole("button", { name: /05 结果分析/ }).click();
await expect(page.getByTestId("constellation-stage-detail")).toContainText("结果分析");
```

- [ ] **Step 2: 在旧页面验证 RED**

Run: `pnpm exec playwright test output/playwright/agent-constellation-galaxy.spec.ts --project=chromium`

Expected: FAIL，找不到银河图和 2D/3D 控件。

- [ ] **Step 3: 实现组件与样式**

用 RAF 驱动相位；渲染三层 SVG 轨道和七条相邻阶段弧线；节点仅使用 transform/opacity/filter；中心保持固定；点击节点顺时针聚焦并暂停 5 秒；移动端保留顺序列表。

- [ ] **Step 4: 验证组件行为**

Run: `node --experimental-strip-types --test lib/dashboard/constellation-carousel.test.mjs`

Run: `npx.cmd tsc --noEmit`

Expected: 测试和类型检查通过。

### Task 4: 生产构建与真实页面验收

**Files:**
- Verify: `ui/components/dashboard/agent-constellation.tsx`
- Verify: `ui/components/dashboard/galaxy-particle-layer.tsx`
- Verify: `ui/app/globals.css`

**Interfaces:**
- Produces: 1440×900 和 1920×1080 页面截图、控制台和网络检查结果。

- [ ] **Step 1: 运行生产构建**

Run: `pnpm build`

Expected: Next.js build exit 0。

- [ ] **Step 2: 浏览器验收**

在 1440×900 与 1920×1080 打开 `/projects`，验证暂停、2D/3D、节点点击、中心链接、详情同步、无节点重叠、右侧简报可读。

- [ ] **Step 3: 检查控制台和关键请求**

Expected: 本次改动不新增 console error；首页与 dashboard 请求没有由星图引起的新失败。

- [ ] **Step 4: 最终差异检查**

Run: `git diff --check -- ui/components/dashboard/agent-constellation.tsx ui/components/dashboard/galaxy-particle-layer.tsx ui/lib/dashboard/constellation-carousel.ts ui/lib/dashboard/constellation-carousel.test.mjs ui/app/globals.css`

Expected: exit 0；差异仅包含银河星图实现与验证代码。

### Task 5: 原型图视觉校准

**Files:**
- Modify: `ui/lib/dashboard/constellation-carousel.ts`
- Modify: `ui/lib/dashboard/constellation-carousel.test.mjs`
- Modify: `ui/components/dashboard/galaxy-particle-layer.tsx`
- Modify: `ui/components/dashboard/agent-constellation.tsx`
- Modify: `ui/app/globals.css`
- Modify: `ui/output/playwright/agent-constellation-galaxy.spec.ts`

**Interfaces:**
- Produces: `GalaxyDustSeed`、`buildGalaxyDustSeeds(count)`、顺时针 `computeOrbitNode` / `buildOrbitArc`、原型式蓝白箭头与全幅旋涡银河。

- [ ] **Step 1: 写旋转方向和旋涡星尘失败测试**

```js
const start = computeOrbitNode(0, 0, 7, "3d");
const later = computeOrbitNode(0, 0.1, 7, "3d");
const startAngle = Math.atan2(start.y - 183, start.x - 365);
const laterAngle = Math.atan2(later.y - 183, later.x - 365);
assert.ok(normalizeAngle(laterAngle - startAngle) > 0);
const dust = buildGalaxyDustSeeds(120);
assert.equal(dust.length, 120);
assert.ok(dust.some((item) => item.radius > 0.75));
```

- [ ] **Step 2: 验证 RED**

Run: `node --experimental-strip-types --test lib/dashboard/constellation-carousel.test.mjs`

Expected: FAIL，现有坐标为逆时针且不存在旋涡星尘种子。

- [ ] **Step 3: 实现顺时针模型和全幅银河**

轨道角度改为随相位递增；Canvas 绘制椭圆亮核、三条旋涡星臂、底部银河云带和分层星尘，并保持暂停、页面隐藏与 reduced-motion 行为。

- [ ] **Step 4: 实现原型式箭头**

每段相邻轨道渲染暗轨、蓝白光束、移动彗尾和独立箭头头部；当前段叠加阶段色，箭头端点继续避开节点边界。

- [ ] **Step 5: 浏览器验收**

Run: `pnpm exec playwright test output/playwright/agent-constellation-galaxy.spec.ts --browser=chromium --reporter=line`

Expected: 1440×900、1920×1080、顺时针坐标变化、箭头结构、暂停和 reduced-motion 全部通过，控制台 0 error。

### Task 6: 银河空间层次和伴星系增强

**Files:**
- Modify: `ui/lib/dashboard/constellation-carousel.ts`
- Modify: `ui/lib/dashboard/constellation-carousel.test.mjs`
- Modify: `ui/components/dashboard/galaxy-particle-layer.tsx`
- Modify: `ui/components/dashboard/agent-constellation.tsx`
- Modify: `ui/app/globals.css`
- Modify: `ui/output/playwright/agent-constellation-galaxy.spec.ts`

**Interfaces:**
- Produces: `SatelliteGalaxySeed`、`buildSatelliteGalaxySeeds(count)`、六个低亮度外围伴星系、暗尘埃带和三层中心项目恒星核心。

- [ ] **Step 1: 写伴星系与中心层次失败测试**

验证伴星系确定性分布在主银河边缘，并在浏览器中检查后景光晕、吸积盘、前景透镜和至少 128px 的中心核心。

- [ ] **Step 2: 实现深空背景和中心核心**

Canvas 按不同倾角、扁率和色相绘制伴星系；主旋臂加入暗尘埃带；中心链接增加后景、中景和前景三层并独立缓慢运动。

- [ ] **Step 3: 修复低帧率下轨道不推进**

RAF 仍以墙钟差值推进，但单帧最大值放宽到阶段时长的 72%，确保可见页面发生降帧时不会因 48ms 截断长期停在保持区，同时页面隐藏仍由可见性状态完整暂停。

- [ ] **Step 4: 完整验证并后台运行**

运行 Node 测试、TypeScript、Next.js 生产构建和 Playwright；最终将最新构建保留在 `3001`，后端保留在 `8001`。
