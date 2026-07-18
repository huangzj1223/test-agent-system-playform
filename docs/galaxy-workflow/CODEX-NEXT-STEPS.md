# Codex 后续任务：智能体协作星图成品化

## 1. 当前基础版本提供了什么

本基础包先解决当前页面最严重的视觉失控问题：

- 使用业务无关的 SVG 银河底图替代实时 Three.js 黑洞和 5200 个星点；
- 保留 `GalaxyWebGLLayer` 原接口，降低集成风险；
- 将粒子预算限制为 84 个背景星点和 24 个移动星尘；
- 弱化黑洞中心，调整为蓝紫色能量核心；
- 将阶段矩形卡片弱化为更接近星云能量体的形态；
- 增加可执行契约测试和 GitHub Actions 构建门禁。

这些改动是视觉与性能基础，不代表七阶段空间运动已经完成。

## 2. Codex 必须继续完成的内容

### Phase A：验证基础版本

在仓库根目录执行：

```bash
git checkout galaxy
git pull
cd ui
npm ci
npm run test:galaxy
npm run build
npm run dev
```

打开系统总览页，确认：

1. 页面不再出现大面积白色粒子和随机彩色粒子雨；
2. 不再加载 Three.js WebGL 黑洞；
3. 银河底图正常显示；
4. 七阶段节点、项目核心、暂停按钮和 2D/3D 切换仍可用；
5. 控制台没有 React、Canvas、ResizeObserver 或资源 404 错误。

保存截图：

```text
artifacts/galaxy-workflow/foundation-1440x900.png
artifacts/galaxy-workflow/foundation-1920x1080.png
```

### Phase B：修正轨道几何与远近关系

修改：

```text
ui/lib/dashboard/constellation-carousel.ts
```

必须先编写测试，再修改实现。新增测试应验证：

1. 当前焦点阶段位于椭圆下方最近端；
2. 最近端 `scale` 最大、`opacity` 为 1、`blur` 为 0；
3. 椭圆上方最远端最小、最暗、轻微模糊；
4. 当 phase 从 0 变为 1 时，焦点从需求分析切换到测试设计；
5. 七个节点始终保持业务顺序。

推荐几何：

```ts
const FRONT_ANGLE = Math.PI / 2;
const step = (Math.PI * 2) / count;
const angle = FRONT_ANGLE + (index - phase) * step;
const depth = (Math.sin(angle) + 1) / 2;

const scale = mode === "3d" ? 0.58 + depth * 0.64 : 0.86 + depth * 0.14;
const opacity = mode === "3d" ? 0.35 + depth * 0.65 : 0.68 + depth * 0.32;
const blur = mode === "3d" ? 1.5 * (1 - depth) : 0;
const brightness = mode === "3d" ? 0.66 + depth * 0.42 : 0.88 + depth * 0.12;
```

不要只改变 CSS 缩放，必须由统一轨道角度计算位置和深度。

### Phase C：修正阶段间箭头

修改：

```text
ui/lib/dashboard/constellation-carousel.ts
ui/components/dashboard/agent-constellation.tsx
ui/app/globals.css
```

流程顺序必须固定为：

```text
需求分析 → 测试设计 → 脚本生成 → 自动执行 → 结果分析 → 失败修复 → 回归验证 → 需求分析
```

要求：

- 每段 SVG 路径从当前节点边缘开始，在下一节点边缘结束；
- 箭头沿椭圆切线指向下一阶段；
- 不能有任何箭头指向项目中心；
- 普通路径宽度约 1.2px，活动路径约 2.2px；
- 每段最多一个箭头头部和一个流光拖尾；
- 箭头不能穿过节点、文字或项目核心。

### Phase D：实现由远及近动画节奏

保留 `requestAnimationFrame`，不要改成多个 `setInterval`。

建议：

- 完整一圈 16 秒；
- 每阶段停留约 1.3 秒；
- 进入和离开各约 0.5～0.7 秒；
- 当前焦点只有一个；
- 相邻节点可轻度突出，但不得同时出现多个最大节点；
- 鼠标悬停暂停；
- 点击节点后沿正向路径转到前景并暂停 5 秒；
- 页面切到后台停止动画；
- `prefers-reduced-motion` 下显示静态闭环。

### Phase E：视觉收敛

禁止重新引入：

- Three.js 黑洞；
- 500 个以上粒子；
- 大于 2.2px 的常驻星点；
- 随机彩虹色粒子；
- 普通白色矩形阶段卡片；
- 多条互相穿插的主流程轨道；
- 与星图无关的菜单或页面重构。

视觉验收：

- 背景以深蓝、靛蓝、紫色为主；
- 当前阶段业务色可以增强，但不能污染全屏；
- 中央项目核心清晰，不像黑洞；
- 节点文字在 100% 浏览器缩放下可读；
- 所有节点均在画布内；
- 右侧质量简报不被遮挡；
- 1440×900 和 1920×1080 均无重叠。

## 3. Codex 执行提示词

将下面内容直接发送给 Codex：

```text
请先阅读 docs/galaxy-workflow/CODEX-NEXT-STEPS.md 和 docs/superpowers/plans/2026-07-18-galaxy-workflow-visual-foundation.md。

当前任务不是重新设计整个首页，而是在已经提交的银河视觉基础上完成“轨道几何、阶段顺序箭头、由远及近空间动画和最终视觉验收”。

严格按 Phase A → B → C → D → E 执行。每个阶段必须：
1. 先写或补充自动化测试；
2. 运行测试确认失败原因正确；
3. 完成最小实现；
4. 运行 npm run test:galaxy 和 npm run build；
5. 打开真实页面检查；
6. 保存 1440×900 截图；
7. 当前阶段未通过时不得进入下一阶段。

不要重新引入 Three.js、密集粒子、黑洞中心或随机彩虹光点。不要修改与星图无关的业务页面。

全部完成后提交到 galaxy 分支，提交信息使用：
feat: finish galaxy workflow spatial animation
```

## 4. 最终提交前检查

```bash
cd ui
npm run test:galaxy
npm run build
```

同时确认：

- `git diff --check` 无输出；
- 浏览器控制台无错误；
- SVG 背景无文字；
- 七阶段顺序正确；
- 箭头只指向下一阶段；
- 最远节点最小，最近节点最大；
- 动画关闭后页面仍可使用。
