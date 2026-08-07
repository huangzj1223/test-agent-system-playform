import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const uiRoot = path.resolve(testDirectory, "..");
const repoRoot = path.resolve(uiRoot, "..");
const readUi = (relativePath) => readFileSync(path.join(uiRoot, relativePath), "utf8");
const readRepo = (relativePath) => readFileSync(path.join(repoRoot, relativePath), "utf8");

test("galaxy background is business-neutral SVG artwork", () => {
  const svg = readUi("public/assets/galaxy-workflow/galaxy-workflow-bg.svg");
  assert.match(svg, /viewBox="0 0 2048 1152"/);
  assert.match(svg, /id="galaxy-nebula-core"/);
  assert.doesNotMatch(svg, /<text\b/i);
  assert.doesNotMatch(svg, /需求分析|测试设计|脚本生成|自动执行|结果分析|失败修复|回归验证/);
});

test("visual foundation does not use Three.js or black-hole scene code", () => {
  const layer = readUi("components/dashboard/galaxy-webgl-layer.tsx");
  assert.doesNotMatch(layer, /from ["']three["']/);
  assert.doesNotMatch(layer, /WebGLRenderer|createEventHorizon|createGravityWell/);
  assert.match(layer, /galaxy-workflow-bg\.svg/);
});

test("particle layer stays within the restrained rendering budget", () => {
  const layer = readUi("components/dashboard/galaxy-particle-layer.tsx");
  const backgroundStars = Number(layer.match(/BACKGROUND_STAR_COUNT\s*=\s*(\d+)/)?.[1]);
  const movingDust = Number(layer.match(/MOVING_DUST_COUNT\s*=\s*(\d+)/)?.[1]);
  const maxStarRadius = Number(layer.match(/MAX_STAR_RADIUS\s*=\s*([\d.]+)/)?.[1]);
  const maxDustRadius = Number(layer.match(/MAX_DUST_RADIUS\s*=\s*([\d.]+)/)?.[1]);

  assert.ok(backgroundStars > 0 && backgroundStars <= 100, `background stars: ${backgroundStars}`);
  assert.ok(movingDust > 0 && movingDust <= 30, `moving dust: ${movingDust}`);
  assert.ok(maxStarRadius <= 2.2, `max star radius: ${maxStarRadius}`);
  assert.ok(maxDustRadius <= 2.2, `max dust radius: ${maxDustRadius}`);
  assert.doesNotMatch(layer, /hsl\(|hsla\(|Math\.random/);
});

test("seven workflow stages remain in the required business order", () => {
  const carousel = readUi("lib/dashboard/constellation-carousel.ts");
  const keys = [
    "requirements",
    "design",
    "generation",
    "execution",
    "analysis",
    "repair",
    "verification",
  ];

  let previous = -1;
  for (const key of keys) {
    const position = carousel.indexOf(`"${key}"`);
    assert.ok(position > previous, `${key} must follow the previous stage`);
    previous = position;
  }
});

test("CI and package scripts enforce contract tests and production build", () => {
  const packageJson = JSON.parse(readUi("package.json"));
  assert.equal(packageJson.scripts["test:galaxy"], "node --test tests/galaxy-workflow-contract.test.mjs");
  assert.equal(packageJson.scripts["verify:galaxy"], "npm run test:galaxy && npm run build");

  const workflow = readRepo(".github/workflows/galaxy-ui-check.yml");
  assert.match(workflow, /npm run test:galaxy/);
  assert.match(workflow, /npm run build/);
});
