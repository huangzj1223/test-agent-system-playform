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
  assert.equal(
    packageJson.scripts["test:galaxy"],
    "node --experimental-strip-types --test tests/galaxy-workflow-contract.test.mjs lib/dashboard/constellation-carousel.test.mjs",
  );
  assert.equal(packageJson.scripts["verify:galaxy"], "npm run test:galaxy && npm run build");

  const workflow = readRepo(".github/workflows/galaxy-ui-check.yml");
  assert.match(workflow, /npm run test:galaxy/);
  assert.match(workflow, /npm run build/);
});

test("Phase C arrows stay restrained and only connect each stage to its successor", () => {
  const component = readUi("components/dashboard/agent-constellation.tsx");
  const css = readUi("app/globals.css");

  assert.equal((component.match(/markerEnd=/g) ?? []).length, 1);
  assert.doesNotMatch(component, /markerStart=/);
  assert.match(component, /stageViews\.map\(\(stage, index\)/);
  assert.match(component, /\(index \+ 1\) % count/);
  assert.match(component, /markerWidth="9"/);
  assert.match(component, /markerWidth="11"/);

  const beam = css.match(/\.galaxy-flow-beam\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const activeBeam = css.match(/\.galaxy-flow-beam-active\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const comet = [...css.matchAll(/\.galaxy-flow-comet\s*\{([\s\S]*?)\}/g)]
    .map((match) => match[1])
    .find((body) => /stroke-width:/.test(body)) ?? "";
  assert.match(beam, /stroke-width:\s*1\.2;/);
  assert.match(activeBeam, /stroke-width:\s*2\.2;/);
  assert.match(comet, /stroke-width:\s*1\.4;/);
  assert.doesNotMatch(beam, /rgb\(220 249 255 \/ 0\.92\)/);
});

test("Phase D uses one 16-second RAF timeline with interaction and accessibility pauses", () => {
  const component = readUi("components/dashboard/agent-constellation.tsx");

  assert.match(component, /const GALAXY_CYCLE_DURATION_MS = 16_000;/);
  assert.match(component, /const STAGE_DURATION_MS = GALAXY_CYCLE_DURATION_MS \/ 7;/);
  assert.match(component, /const INTERACTION_PAUSE_MS = 5000;/);
  assert.match(component, /requestAnimationFrame\(animate\)/);
  assert.doesNotMatch(component, /setInterval\(/);
  assert.match(component, /document\.addEventListener\("visibilitychange"/);
  assert.match(component, /prefers-reduced-motion: reduce/);
  assert.match(component, /onMouseEnter=\{\(\) => setHovered\(true\)\}/);
  assert.match(component, /getForwardPhaseTarget\(startPhase, stageIndex, stageViews\.length\)/);
  assert.match(component, /data-paused=\{playbackPaused \? "true" : "false"\}/);
});

test("Phase E keeps a layered spiral galaxy and a luminous project source", () => {
  const svg = readUi("public/assets/galaxy-workflow/galaxy-workflow-bg.svg");
  const css = readUi("app/globals.css");
  const component = readUi("components/dashboard/agent-constellation.tsx");

  assert.match(svg, /id="galaxy-spiral-arms"/);
  assert.match(svg, /id="galaxy-star-clusters"/);
  assert.match(svg, /id="galaxy-depth-funnel"/);
  assert.match(svg, /id="near-star-cluster"/);
  assert.match(svg, /id="far-star-cluster"/);
  assert.match(svg, /id="galaxy-arm-filaments" opacity="0\.28"/);

  const horizon = [...css.matchAll(/\.galaxy-event-horizon\s*\{([\s\S]*?)\}/g)].at(-1)?.[1] ?? "";
  const core = [...css.matchAll(/\.galaxy-core-content\s*\{([\s\S]*?)\}/g)].at(-1)?.[1] ?? "";
  const stageGlass = [...css.matchAll(/\.galaxy-stage-glass\s*\{([\s\S]*?)\}/g)].at(-1)?.[1] ?? "";
  const stageNode = css.match(/\.galaxy-stage-node\s*\{([\s\S]*?)\}/)?.[1] ?? "";

  assert.match(horizon, /opacity:\s*0\.[123]/);
  assert.match(core, /rgb\(73 150 255/);
  assert.doesNotMatch(core, /rgb\(5 10 42/);
  assert.match(stageGlass, /backdrop-filter:\s*blur\(5px\)/);
  assert.doesNotMatch(stageGlass, /background:\s*(?:#fff|white|rgb\(255 255 255\))/i);
  assert.match(stageNode, /width:\s*162px;/);
  assert.doesNotMatch(component, /block truncate text-\[11px\]/);
});
