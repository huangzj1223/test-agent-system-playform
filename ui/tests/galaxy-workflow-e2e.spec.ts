import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const artifactDir = path.resolve(process.cwd(), "..", "artifacts", "galaxy-workflow");

test.use({ channel: "chrome" });

async function installRuntimeDiagnostics(page: Page) {
  await page.addInitScript(() => {
    const originalRequest = window.requestAnimationFrame.bind(window);
    const originalCancel = window.cancelAnimationFrame.bind(window);
    const active = new Set<number>();
    const stats = { active: 0, maxActive: 0, scheduled: 0, completed: 0, cancelled: 0 };

    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      let id = 0;
      id = originalRequest((time) => {
        active.delete(id);
        stats.active = active.size;
        stats.completed += 1;
        callback(time);
      });
      active.add(id);
      stats.scheduled += 1;
      stats.active = active.size;
      stats.maxActive = Math.max(stats.maxActive, active.size);
      return id;
    };

    window.cancelAnimationFrame = (id: number) => {
      active.delete(id);
      stats.active = active.size;
      stats.cancelled += 1;
      originalCancel(id);
    };

    Object.defineProperty(window, "__galaxyRafStats", { value: stats });
  });
}

async function moveOutsideGalaxy(page: Page) {
  await page.mouse.move(12, 12);
}

async function pauseGalaxy(page: Page) {
  const pause = page.getByRole("button", { name: "暂停星图动画" });
  await pause.click();
  await expect(page.locator(".galaxy-constellation")).toHaveAttribute("data-paused", "true");
}

async function assertForegroundSafeArea(page: Page) {
  const result = await page.evaluate(() => {
    const viewport = document.querySelector<HTMLElement>(".galaxy-viewport")?.getBoundingClientRect();
    const detail = document.querySelector<HTMLElement>(".galaxy-detail-panel")?.getBoundingClientRect();
    const focused = document.querySelector<HTMLElement>(".galaxy-stage-node-focused");
    if (!viewport || !detail || !focused) return null;

    const visibleParts = [
      focused,
      ...Array.from(focused.querySelectorAll<HTMLElement>(
        ".galaxy-stage-orb-core, .galaxy-stage-orb-halo, .galaxy-stage-orb-ring, .galaxy-stage-number, .galaxy-stage-name, .galaxy-stage-caption-meta",
      )),
    ].filter((element) => {
      const style = getComputedStyle(element);
      return style.display !== "none" && Number(style.opacity) > 0.02;
    });
    const visualBottom = Math.max(...visibleParts.map((element) => element.getBoundingClientRect().bottom));

    return {
      safeArea: viewport.bottom - visualBottom,
      panelGap: detail.top - visualBottom,
      viewportBottom: viewport.bottom,
      visualBottom,
    };
  });

  expect(result).not.toBeNull();
  expect(result!.safeArea).toBeGreaterThanOrEqual(110);
  expect(result!.panelGap).toBeGreaterThan(0);
}

async function screenshotNode(page: Page, selector: string, filename: string) {
  const node = page.locator(selector).first();
  await expect(node).toBeVisible();
  const box = await node.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  const paddingX = 54;
  const paddingY = 34;
  const x = Math.max(0, box!.x - paddingX);
  const y = Math.max(0, box!.y - paddingY);
  const width = Math.min(viewport!.width - x, box!.width + paddingX * 2);
  const height = Math.min(viewport!.height - y, box!.height + paddingY * 2);
  await page.screenshot({ path: path.join(artifactDir, filename), clip: { x, y, width, height } });
}

test("three desktop widths keep the foreground safe and expose all LOD states", async ({ page }) => {
  await mkdir(artifactDir, { recursive: true });
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const missingResources: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() === 404) missingResources.push(response.url());
  });
  await installRuntimeDiagnostics(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseURL}/projects`, { waitUntil: "networkidle" });
  await expect(page.locator(".galaxy-constellation")).toBeVisible({ timeout: 60_000 });
  await moveOutsideGalaxy(page);
  await pauseGalaxy(page);

  for (const viewport of [
    { width: 1440, height: 900, file: "final-1440x900.png" },
    { width: 1600, height: 900, file: "final-1600x900.png" },
    { width: 1920, height: 1080, file: "final-1920x1080.png" },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.locator(".galaxy-constellation").scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    await assertForegroundSafeArea(page);
    await page.screenshot({ path: path.join(artifactDir, viewport.file), fullPage: false });
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator(".galaxy-constellation").scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await expect(page.locator('.galaxy-stage-node[data-visual-level="far"]')).toHaveCount(2);
  await expect(page.locator('.galaxy-stage-node[data-visual-level="middle"]')).toHaveCount(2);
  await expect(page.locator('.galaxy-stage-node[data-visual-level="near"]')).toHaveCount(3);
  await screenshotNode(page, '.galaxy-stage-node[data-visual-level="far"]', "far-state.png");
  await screenshotNode(page, '.galaxy-stage-node[data-visual-level="middle"]', "middle-state.png");
  await screenshotNode(page, ".galaxy-stage-node-focused", "near-state.png");

  const far = page.locator('.galaxy-stage-node[data-visual-level="far"]').first();
  await far.hover();
  await expect(far.locator(".galaxy-stage-name")).toHaveCSS("opacity", "1");
  await expect(far.locator(".galaxy-stage-caption-meta")).toHaveCSS("opacity", "1");

  const pausedTarget = page.locator('.galaxy-stage-node[aria-label^="05 "]');
  const pausedTransform = await pausedTarget.evaluate((element) => getComputedStyle(element).transform);
  await page.waitForTimeout(600);
  expect(await pausedTarget.evaluate((element) => getComputedStyle(element).transform)).toBe(pausedTransform);

  await page.getByRole("button", { name: "切换为 2D 视图" }).click();
  await expect(page.locator('.galaxy-stage-node[data-visual-level="middle"]')).toHaveCount(7);
  const flatBlurs = await page.locator(".galaxy-stage-node").evaluateAll((nodes) => (
    nodes.map((node) => getComputedStyle(node).getPropertyValue("--stage-orb-blur").trim())
  ));
  expect(flatBlurs.every((value) => value === "0.00px")).toBe(true);

  const stats = await page.evaluate(() => (
    (window as Window & { __galaxyRafStats?: { active: number; maxActive: number } }).__galaxyRafStats
  ));
  expect(stats?.active ?? 99).toBeLessThanOrEqual(4);
  expect(stats?.maxActive ?? 99).toBeLessThanOrEqual(8);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(missingResources).toEqual([]);
});

test("records a full 16-second cycle, positive click focus, pause, and resume", async ({ browser }) => {
  test.setTimeout(70_000);
  await mkdir(artifactDir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: artifactDir, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const missingResources: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() === 404) missingResources.push(response.url());
  });

  await page.goto(`${baseURL}/projects`, { waitUntil: "networkidle" });
  await expect(page.locator(".galaxy-constellation")).toBeVisible({ timeout: 60_000 });
  await moveOutsideGalaxy(page);
  const detail = page.getByTestId("constellation-stage-detail");

  await expect(detail).toContainText("测试设计", { timeout: 6_000 });
  const firstDesignFocus = Date.now();
  await expect(detail).not.toContainText("测试设计", { timeout: 5_000 });
  await expect(detail).toContainText("测试设计", { timeout: 18_000 });
  const cycleDurationMs = Date.now() - firstDesignFocus;
  expect(cycleDurationMs).toBeGreaterThanOrEqual(15_000);
  expect(cycleDurationMs).toBeLessThanOrEqual(18_000);
  await expect(detail).toContainText("脚本生成", { timeout: 5_000 });

  const clickedStage = page.locator('.galaxy-stage-node[aria-label^="05 "]');
  await clickedStage.click();
  await expect(detail).toContainText("结果分析", { timeout: 7_000 });

  const pause = page.getByRole("button", { name: "暂停星图动画" });
  await pause.click();
  const pausedPhase = await clickedStage.getAttribute("data-depth");
  await page.waitForTimeout(900);
  expect(await clickedStage.getAttribute("data-depth")).toBe(pausedPhase);
  await page.getByRole("button", { name: "继续星图动画" }).click();
  await moveOutsideGalaxy(page);
  await page.waitForTimeout(5_300);
  await expect.poll(() => clickedStage.getAttribute("data-depth")).not.toBe(pausedPhase);

  expect(consoleErrors).toEqual([]);
  expect(missingResources).toEqual([]);
  const video = page.video();
  await context.close();
  await video?.saveAs(path.join(artifactDir, "final-cycle-1440x900.webm"));
  console.log(`GALAXY_CYCLE_DURATION_MS=${cycleDurationMs}`);
});

test("reduced motion renders a static accessible seven-stage loop", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${baseURL}/projects`, { waitUntil: "networkidle" });
  const section = page.locator(".galaxy-constellation");
  await expect(section).toHaveAttribute("data-reduced-motion", "true", { timeout: 60_000 });
  await expect(section).toHaveAttribute("data-paused", "true");
  await expect(page.locator(".galaxy-stage-node")).toHaveCount(7);
  const depths = await page.locator(".galaxy-stage-node").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-depth")));
  await page.waitForTimeout(700);
  expect(await page.locator(".galaxy-stage-node").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-depth")))).toEqual(depths);
});
