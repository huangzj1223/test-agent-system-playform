import { expect, test } from "@playwright/test";

test.use({ channel: "chrome", viewport: { width: 1440, height: 900 } });
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

test.describe("首页智能体协作星图", () => {
  test("显示银河闭环并支持视图与阶段交互", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    const dashboardResponse = page.waitForResponse((response) => response.url().includes("/api/v2/dashboard/overview"));

    await page.goto(`${baseURL}/projects`, { waitUntil: "domcontentloaded" });
    expect((await dashboardResponse).ok()).toBe(true);

    await expect(page.getByRole("img", { name: /银河质量闭环/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "切换为 2D 视图" })).toBeVisible();
    await expect(page.getByRole("button", { name: /01 需求分析/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /07 回归验证/ })).toBeVisible();
    await expect(page.locator(".galaxy-stage-node")).toHaveCount(7);
    await expect(page.locator(".galaxy-flow-beam")).toHaveCount(7);
    await expect(page.locator(".galaxy-flow-comet")).toHaveCount(7);
    await expect(page.locator(".galaxy-core-depth-halo")).toHaveCount(1);
    await expect(page.locator(".galaxy-core-accretion-disk")).toHaveCount(1);
    await expect(page.locator(".galaxy-core-foreground-lens")).toHaveCount(1);
    const core = page.getByRole("link", { name: "进入全部项目" });
    await expect(core).toHaveAttribute("href", "/projects/spaces");
    const coreBounds = await core.boundingBox();
    expect(coreBounds?.width ?? 0).toBeGreaterThanOrEqual(128);
    expect(coreBounds?.height ?? 0).toBeGreaterThanOrEqual(128);

    const bottomGalaxyCoverage = await page.locator(".galaxy-particle-layer").evaluate((canvas) => {
      const target = canvas as HTMLCanvasElement;
      const context = target.getContext("2d");
      if (!context) return 0;
      const startY = Math.floor(target.height * 0.5);
      const pixels = context.getImageData(0, startY, target.width, target.height - startY).data;
      let luminousPixels = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        const brightness = pixels[index] + pixels[index + 1] + pixels[index + 2];
        if (pixels[index + 3] > 18 && brightness > 70) luminousPixels += 1;
      }
      return luminousPixels / (pixels.length / 4);
    });
    expect(bottomGalaxyCoverage).toBeGreaterThan(0.08);

    const [canvasBounds, viewportBounds] = await Promise.all([
      page.locator(".galaxy-particle-layer").boundingBox(),
      page.locator(".galaxy-viewport").boundingBox(),
    ]);
    expect(Math.abs((canvasBounds?.x ?? 0) - (viewportBounds?.x ?? 0))).toBeLessThan(2);
    expect(Math.abs((canvasBounds?.y ?? 0) - (viewportBounds?.y ?? 0))).toBeLessThan(2);
    expect(Math.abs((canvasBounds?.width ?? 0) - (viewportBounds?.width ?? 0))).toBeLessThan(2);
    expect(Math.abs((canvasBounds?.height ?? 0) - (viewportBounds?.height ?? 0))).toBeLessThan(2);

    await page.getByRole("button", { name: "暂停星图动画" }).click();
    await expect(page.locator(".galaxy-constellation")).toHaveAttribute("data-paused", "true");
    await expect(page.locator(".galaxy-main-orbit")).toHaveCSS("animation-play-state", "paused");
    await expect(page.locator(".galaxy-core-orbit-outer")).toHaveCSS("animation-play-state", "paused");

    const pausedTarget = page.getByRole("button", { name: /05 结果分析/ });
    await pausedTarget.click();
    await expect(page.getByTestId("constellation-stage-detail")).toContainText("结果分析");

    await page.getByRole("button", { name: "切换为 2D 视图" }).click();
    await expect(page.getByRole("button", { name: "切换为 3D 视图" })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test("显式暂停后阶段点击立即定位并保持静止", async ({ page }) => {
    await page.goto(`${baseURL}/projects`, { waitUntil: "domcontentloaded" });
    const section = page.locator(".galaxy-constellation");
    await expect(section).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "暂停星图动画" }).click();

    const target = page.getByRole("button", { name: /05 结果分析/ });
    await target.click();
    await expect(page.getByTestId("constellation-stage-detail")).toContainText("结果分析", { timeout: 700 });
    const firstTransform = await target.evaluate((element) => getComputedStyle(element).transform);
    await page.waitForTimeout(260);
    const secondTransform = await target.evaluate((element) => getComputedStyle(element).transform);

    expect(secondTransform).toBe(firstTransform);
    await page.waitForTimeout(5_100);
    await expect(page.getByTestId("constellation-stage-detail")).toContainText("结果分析");
  });

  test("减少动态效果时阶段点击即时切换且保持静止", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${baseURL}/projects`, { waitUntil: "domcontentloaded" });

    const section = page.locator(".galaxy-constellation");
    const target = page.getByRole("button", { name: /05 结果分析/ });
    await expect(section).toHaveAttribute("data-paused", "true", { timeout: 60_000 });

    const beforeTransform = await target.evaluate((element) => getComputedStyle(element).transform);
    await target.click();
    await expect(page.getByTestId("constellation-stage-detail")).toContainText("结果分析");
    await expect.poll(
      () => target.evaluate((element) => getComputedStyle(element).transform),
    ).not.toBe(beforeTransform);
    const firstTransform = await target.evaluate((element) => getComputedStyle(element).transform);
    await page.waitForTimeout(180);
    const secondTransform = await target.evaluate((element) => getComputedStyle(element).transform);

    expect(secondTransform).toBe(firstTransform);
  });

  test("真实轨道动画沿屏幕顺时针方向推进", async ({ page }) => {
    await page.goto(`${baseURL}/projects`, { waitUntil: "domcontentloaded" });
    await page.mouse.move(1400, 30);

    const viewport = page.locator(".galaxy-viewport");
    const stage = page.getByRole("button", { name: /01 需求分析/ });
    const viewportBounds = await viewport.boundingBox();
    expect(viewportBounds).not.toBeNull();
    const orbitCenter = {
      x: viewportBounds!.x + viewportBounds!.width * 0.5,
      y: viewportBounds!.y + viewportBounds!.height * (183 / 360),
    };

    let previousBounds = await stage.boundingBox();
    let clockwiseDelta = 0;
    for (let attempt = 0; attempt < 40 && clockwiseDelta === 0; attempt += 1) {
      await page.waitForTimeout(140);
      const currentBounds = await stage.boundingBox();
      if (!previousBounds || !currentBounds) continue;
      const previousPoint = {
        x: previousBounds.x + previousBounds.width / 2,
        y: previousBounds.y + previousBounds.height / 2,
      };
      const currentPoint = {
        x: currentBounds.x + currentBounds.width / 2,
        y: currentBounds.y + currentBounds.height / 2,
      };
      if (Math.hypot(currentPoint.x - previousPoint.x, currentPoint.y - previousPoint.y) > 1.2) {
        const previousAngle = Math.atan2(previousPoint.y - orbitCenter.y, previousPoint.x - orbitCenter.x);
        const currentAngle = Math.atan2(currentPoint.y - orbitCenter.y, currentPoint.x - orbitCenter.x);
        clockwiseDelta = ((currentAngle - previousAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      }
      previousBounds = currentBounds;
    }

    expect(clockwiseDelta).toBeGreaterThan(0);
    expect(clockwiseDelta).toBeLessThan(Math.PI / 2);
  });

  test("1920 宽屏使用全宽黑洞银河并保持节点箭头完整", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${baseURL}/projects`, { waitUntil: "domcontentloaded" });

    const constellation = page.locator(".galaxy-constellation");
    const brief = page.getByText("今日质量简报", { exact: true });
    await expect(constellation).toBeVisible({ timeout: 60_000 });
    await expect(brief).toHaveCount(0);
    await expect(page.getByText("全局项目战情预览", { exact: true })).toHaveCount(0);
    await expect(page.locator(".galaxy-gravity-well")).toHaveCount(1);
    await expect(page.locator(".galaxy-lensing-ring")).toHaveCount(1);
    await expect(page.locator(".galaxy-event-horizon")).toHaveCount(1);
    await expect(page.locator(".galaxy-webgl-layer")).toHaveAttribute("data-renderer-state", "ready");
    const bounds = await constellation.boundingBox();
    const viewportBounds = await page.locator(".galaxy-viewport").boundingBox();
    expect(bounds?.width ?? 0).toBeGreaterThan(1400);
    expect(bounds?.height ?? 0).toBeGreaterThanOrEqual(620);
    expect(viewportBounds?.height ?? 0).toBeGreaterThanOrEqual(470);

    const blackHoleContrast = await page.locator(".galaxy-particle-layer").evaluate((canvas) => {
      const target = canvas as HTMLCanvasElement;
      const context = target.getContext("2d");
      if (!context) return 0;
      const pixels = context.getImageData(0, 0, target.width, target.height).data;
      const centerX = target.width * 0.5;
      const centerY = target.height * 0.508;
      let centerLight = 0;
      let centerPixels = 0;
      let ringLight = 0;
      let ringPixels = 0;
      for (let y = 0; y < target.height; y += 2) {
        for (let x = 0; x < target.width; x += 2) {
          const dx = x - centerX;
          const dy = (y - centerY) * 2.2;
          const radius = Math.hypot(dx, dy) / target.width;
          const index = (y * target.width + x) * 4;
          const light = pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722;
          if (radius < 0.018) {
            centerLight += light;
            centerPixels += 1;
          } else if (radius > 0.032 && radius < 0.072) {
            ringLight += light;
            ringPixels += 1;
          }
        }
      }
      return (ringLight / Math.max(1, ringPixels)) / (centerLight / Math.max(1, centerPixels));
    });
    expect(blackHoleContrast).toBeGreaterThan(1.18);

    const maxArrowEndpointDistance = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>(".galaxy-stage-node"));
      const paths = Array.from(document.querySelectorAll<SVGPathElement>(".galaxy-flow-beam"));
      return Math.max(...paths.map((path, index) => {
        const point = path.getPointAtLength(path.getTotalLength());
        const screenPoint = new DOMPoint(point.x, point.y).matrixTransform(path.getScreenCTM() ?? undefined);
        const target = nodes[(index + 1) % nodes.length].getBoundingClientRect();
        return Math.hypot(screenPoint.x - (target.left + target.width / 2), screenPoint.y - (target.top + target.height / 2));
      }));
    });
    expect(maxArrowEndpointDistance).toBeLessThan(120);
  });

  test("今日质量简报迁入项目空间", async ({ page }) => {
    await page.goto(`${baseURL}/projects/spaces`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("项目空间", { exact: true }).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("今日质量简报", { exact: true })).toBeVisible({ timeout: 60_000 });
  });
});
