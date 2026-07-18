import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
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

test("main galaxy artwork is integrated as a layered non-repeating background", () => {
  const assetPath = path.join(
    uiRoot,
    "public/assets/galaxy-workflow/galaxy-background-main.png",
  );
  const layer = readUi("components/dashboard/galaxy-webgl-layer.tsx");

  assert.ok(existsSync(assetPath), "main galaxy PNG must exist at the public asset path");
  assert.ok(statSync(assetPath).size > 1_000_000, "main galaxy PNG should contain the full-resolution artwork");
  assert.match(layer, /galaxy-background-main\.png/);
  assert.match(layer, /object-fit:\s*cover/);
  assert.match(layer, /object-position:\s*var\(--galaxy-bg-position-x\) var\(--galaxy-bg-position-y\)/);
  assert.match(layer, /galaxy-art-soft-light/);
  assert.match(layer, /galaxy-art-readability-mask/);
});

test("galaxy core, orbit artwork and debug guides share one spatial source", () => {
  const carousel = readUi("lib/dashboard/constellation-carousel.ts");
  const component = readUi("components/dashboard/agent-constellation.tsx");
  const layer = readUi("components/dashboard/galaxy-webgl-layer.tsx");
  const css = readUi("app/globals.css");

  assert.match(carousel, /GALAXY_CORE\s*=\s*\{\s*x:\s*365,\s*y:\s*151\.2/);
  assert.match(carousel, /centerX:\s*GALAXY_CORE\.x/);
  assert.match(carousel, /centerY:\s*GALAXY_CORE\.y/);
  assert.match(component, /--galaxy-core-x/);
  assert.match(component, /--galaxy-core-y/);
  assert.doesNotMatch(component, /<ellipse cx="365" cy="147"/);
  assert.match(css, /left:\s*var\(--galaxy-core-x\)/);
  assert.match(css, /top:\s*var\(--galaxy-core-y\)/);

  assert.match(layer, /<img/);
  assert.match(layer, /object-fit:\s*cover/);
  assert.match(layer, /object-position:\s*var\(--galaxy-bg-position-x\) var\(--galaxy-bg-position-y\)/);
  assert.match(layer, /galaxy-rear-stars/);
  assert.match(layer, /galaxy-foreground-nebula/);
  assert.match(layer, /computeGalaxyObjectPosition/);

  assert.match(component, /galaxyDebug/);
  assert.match(component, /process\.env\.NODE_ENV !== "production"/);
  assert.match(component, /data-background-debug=/);
  assert.match(component, /galaxy-debug-project-cross/);
  assert.match(component, /galaxy-debug-orbit-cross/);
  assert.match(layer, /galaxy-debug-background-cross/);
  const backgroundCross = [...layer.matchAll(/\.galaxy-debug-background-cross\s*\{([\s\S]*?)\}/g)]
    .map((match) => match[1])
    .find((body) => /left:\s*var\(--galaxy-core-x\)/.test(body)) ?? "";
  assert.match(
    backgroundCross,
    /inset:\s*auto;[\s\S]*left:\s*var\(--galaxy-core-x\);[\s\S]*top:\s*var\(--galaxy-core-y\);/,
  );
});

test("visual foundation does not use Three.js or black-hole scene code", () => {
  const layer = readUi("components/dashboard/galaxy-webgl-layer.tsx");
  assert.doesNotMatch(layer, /from ["']three["']/);
  assert.doesNotMatch(layer, /WebGLRenderer|createEventHorizon|createGravityWell/);
  assert.match(layer, /galaxy-background-main\.png/);
});

test("final background composition keeps one shared center and a light translucent project core", () => {
  const carousel = readUi("lib/dashboard/constellation-carousel.ts");
  const component = readUi("components/dashboard/agent-constellation.tsx");
  const css = readUi("app/globals.css");

  assert.match(carousel, /GALAXY_SPATIAL_CONFIG\s*=\s*\{/);
  assert.match(component, /GALAXY_SPATIAL_CONFIG\.projectCoreDiameter/);
  assert.match(component, /GALAXY_SPATIAL_CONFIG\.foregroundAccretionOpacity/);
  assert.match(component, /galaxy-core-foreground-accretion-band/);

  const projectCore = css.match(/\.galaxy-project-core\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(projectCore, /width:\s*var\(--galaxy-project-core-size\)/);
  assert.match(projectCore, /height:\s*var\(--galaxy-project-core-size\)/);

  const foregroundBand = css.match(/\.galaxy-core-foreground-accretion-band\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(foregroundBand, /pointer-events:\s*none/);
  assert.match(foregroundBand, /opacity:\s*var\(--galaxy-foreground-accretion-opacity\)/);

  const coreOverride = [...css.matchAll(/\.galaxy-core-content\s*\{([\s\S]*?)\}/g)].at(-1)?.[1] ?? "";
  assert.match(coreOverride, /rgb\(73 150 255 \/ 0\.[45]/);
  assert.doesNotMatch(coreOverride, /rgb\(73 150 255 \/ 0\.9[5-9]/);
});

test("background motion remains restrained and reduced motion removes parallax", () => {
  const layer = readUi("components/dashboard/galaxy-webgl-layer.tsx");
  const css = readUi("app/globals.css");

  assert.match(layer, /if \(!motionDisabled\) \{\s*host\.addEventListener\("pointermove", onPointerMove\)/);
  assert.match(layer, /calc\(var\(--galaxy-parallax-x\) \* 1\.5px\)/);
  assert.match(layer, /calc\(var\(--galaxy-parallax-x\) \* 0\.75px\)/);
  assert.match(layer, /calc\(var\(--galaxy-parallax-x\) \* 3px\)/);

  const reducedMotion = layer.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? "";
  assert.doesNotMatch(reducedMotion, /--galaxy-parallax-[xy]/);
  assert.match(css, /animation:\s*galaxy-nebula-breathe 6\.4s ease-in-out infinite/);
});

test("background baseline keeps static artwork and the existing particle budget", () => {
  const component = readUi("components/dashboard/agent-constellation.tsx");
  const layer = readUi("components/dashboard/galaxy-webgl-layer.tsx");
  const particles = readUi("components/dashboard/galaxy-particle-layer.tsx");

  assert.doesNotMatch(component + layer, /<video\b|\.webm\b|\.mp4\b/i);
  assert.doesNotMatch(component + layer, /from ["']three["']|WebGLRenderer|createEventHorizon|createGravityWell/);
  assert.match(particles, /BACKGROUND_STAR_COUNT\s*=\s*36/);
  assert.match(particles, /MOVING_DUST_COUNT\s*=\s*10/);
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

  assert.match(component, /GALAXY_CYCLE_DURATION_MS/);
  assert.match(readUi("lib/dashboard/constellation-carousel.ts"), /GALAXY_CYCLE_DURATION_MS\s*=\s*16_000/);
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
  const stageNode = css.match(/\.galaxy-stage-node\s*\{([\s\S]*?)\}/)?.[1] ?? "";

  assert.match(horizon, /opacity:\s*0\.[123]/);
  assert.match(core, /rgb\(73 150 255/);
  assert.doesNotMatch(core, /rgb\(5 10 42/);
  assert.match(stageNode, /width:\s*162px;/);
  assert.doesNotMatch(component, /block truncate text-\[11px\]/);
  assert.doesNotMatch(component, /galaxy-stage-glass/);
});

test("stage LOD keeps stable orb DOM and a dark galaxy detail panel", () => {
  const component = readUi("components/dashboard/agent-constellation.tsx");
  const css = readUi("app/globals.css");

  assert.match(component, /getStageVisualLevel/);
  assert.match(component, /data-visual-level=/);
  assert.match(component, /galaxy-stage-orb/);
  assert.match(component, /galaxy-stage-orb-halo/);
  assert.match(component, /galaxy-stage-orb-ring/);
  assert.match(component, /galaxy-stage-orb-core/);
  assert.match(component, /galaxy-stage-orb-caption/);

  assert.match(css, /\.galaxy-stage-node\[data-visual-level="far"\]/);
  assert.match(css, /\.galaxy-stage-node\[data-visual-level="middle"\]/);
  assert.match(css, /\.galaxy-stage-node\[data-visual-level="near"\]/);
  assert.match(css, /transition-duration:\s*560ms/);

  const farCore = css.match(/\.galaxy-stage-node\[data-visual-level="far"\] \.galaxy-stage-orb-core\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const middleCore = css.match(/\.galaxy-stage-node\[data-visual-level="middle"\] \.galaxy-stage-orb-core\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const nearCore = css.match(/\.galaxy-stage-node\[data-visual-level="near"\] \.galaxy-stage-orb-core\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(farCore, /width:\s*var\(--stage-core-size\)/);
  assert.match(middleCore, /width:\s*var\(--stage-core-size\)/);
  assert.match(nearCore, /width:\s*var\(--stage-core-size\)/);

  const detailPanel = css.match(/\.galaxy-detail-panel\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(detailPanel, /rgb\(8 15 52/);
  assert.match(detailPanel, /color:\s*rgb\(241 245 249\)/);
  assert.doesNotMatch(detailPanel, /rgb\(255 255 255 \/ 0\.9/);
});

test("final motion tuning preserves far identity, one active comet, and a safe foreground", () => {
  const component = readUi("components/dashboard/agent-constellation.tsx");
  const css = readUi("app/globals.css");
  const carousel = readUi("lib/dashboard/constellation-carousel.ts");

  assert.match(carousel, /centerY:\s*GALAXY_CORE\.y/);
  assert.match(carousel, /radiusY:\s*100/);
  assert.match(carousel, /GALAXY_CYCLE_DURATION_MS\s*=\s*16_000/);
  assert.match(component, /shouldAdvanceOrbit/);
  assert.match(component, /advanceOrbitRawPhase/);
  assert.match(component, /--stage-inverse-scale/);
  assert.match(component, /data-active=\{active \? "true" : "false"\}/);

  const farCore = css.match(/\.galaxy-stage-node\[data-visual-level="far"\] \.galaxy-stage-orb-core\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(farCore, /width:\s*var\(--stage-core-size\)/);
  assert.match(css, /\.galaxy-stage-node\[data-visual-level="far"\] \.galaxy-stage-number/);
  assert.match(css, /\.galaxy-stage-node\[data-visual-level="far"\]:hover \.galaxy-stage-name/);

  const inactiveComet = [...css.matchAll(/\.galaxy-flow-comet\s*\{([\s\S]*?)\}/g)]
    .map((match) => match[1])
    .find((body) => /animation:\s*none/.test(body)) ?? "";
  const activeComet = css.match(/\.galaxy-flow-comet-active\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(inactiveComet, /opacity:\s*0/);
  assert.match(inactiveComet, /animation:\s*none/);
  assert.match(activeComet, /animation:\s*galaxy-comet-travel/);
});
