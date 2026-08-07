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

test("failed transparent foreground artwork is completely removed", () => {
  const assetPath = path.join(
    uiRoot,
    "public/assets/galaxy-workflow/galaxy-foreground-overlay.png",
  );
  const component = readUi("components/dashboard/agent-constellation.tsx");
  const layer = readUi("components/dashboard/galaxy-webgl-layer.tsx");
  const css = readUi("app/globals.css");

  assert.equal(existsSync(assetPath), false);
  assert.doesNotMatch(layer, /GalaxyForegroundOverlay|galaxy-foreground-overlay|galaxy-foreground-core-sweep/);
  assert.doesNotMatch(component, /GalaxyForegroundOverlay|foregroundOverlay|foregroundCoreSweep/);
  assert.doesNotMatch(css, /galaxy-foreground-overlay|galaxy-foreground-core-sweep/);
  assert.doesNotMatch(component, /galaxy-foreground-flow-layer/);
});

test("core occlusion reuses the main galaxy artwork with one shared render transform", () => {
  const component = readUi("components/dashboard/agent-constellation.tsx");
  const layer = readUi("components/dashboard/galaxy-webgl-layer.tsx");
  const css = readUi("app/globals.css");
  const sharedSource = "/assets/galaxy-workflow/galaxy-background-main.png";

  assert.match(layer, /className="galaxy-shared-art-image galaxy-art-image"/);
  assert.match(component, /className="galaxy-shared-art-image galaxy-accretion-foreground-image"/);
  assert.equal((`${layer}\n${component}`.match(new RegExp(sharedSource.replaceAll("/", "\\/"), "g")) ?? []).length, 2);
  assert.doesNotMatch(component + layer + css, /galaxy-foreground-overlay\.png/);

  const sharedImage = css.match(/\.galaxy-shared-art-image\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(sharedImage, /object-fit:\s*cover/);
  assert.match(sharedImage, /object-position:\s*var\(--galaxy-bg-position-x\) var\(--galaxy-bg-position-y\)/);
  assert.match(sharedImage, /transform:\s*scale\(var\(--galaxy-bg-scale\)\)/);
  assert.match(sharedImage, /transform-origin:\s*var\(--galaxy-core-x\) var\(--galaxy-core-y\)/);
});

test("project core is split around a feathered same-source foreground crop", () => {
  const component = readUi("components/dashboard/agent-constellation.tsx");
  const css = readUi("app/globals.css");
  const bodyPosition = component.indexOf("galaxy-project-core");
  const cropPosition = component.indexOf("galaxy-accretion-foreground");
  const textPosition = component.indexOf("galaxy-core-text");

  assert.ok(bodyPosition >= 0 && bodyPosition < cropPosition);
  assert.ok(cropPosition < textPosition);
  assert.match(component, /galaxyDebug"\) === "occlusion"/);
  assert.match(component, /data-occlusion-debug=/);
  assert.match(component, /galaxy-occlusion-debug-panel/);
  assert.match(component, /galaxy-occlusion-debug-mask-boundary/);
  assert.match(component, /getScreenCTM\(\)/);
  assert.match(component, /matrixTransform\(orbitMatrix\)/);

  const crop = css.match(/\.galaxy-accretion-foreground\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(crop, /z-index:\s*86/);
  assert.match(crop, /pointer-events:\s*none/);
  assert.match(crop, /opacity:\s*1/);
  assert.match(crop, /mask-image:/);
  assert.match(crop, /radial-gradient/);
  assert.match(crop, /linear-gradient/);
  assert.match(crop, /drop-shadow\(0 0 6px rgb\(120 196 255 \/ 0\.38\)\)/);

  const body = css.match(/\.galaxy-project-core\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const text = [...css.matchAll(/\.galaxy-core-text\s*\{([\s\S]*?)\}/g)].at(-1)?.[1] ?? "";
  assert.match(body, /z-index:\s*80/);
  assert.match(text, /z-index:\s*88/);
  assert.match(text, /left:\s*var\(--galaxy-core-x\)/);
  assert.match(text, /top:\s*var\(--galaxy-core-y\)/);

  const foregroundImage = css.match(/\.galaxy-accretion-foreground-image\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(foregroundImage, /brightness\(1\.22\)/);
  assert.match(css, /calc\(var\(--galaxy-core-y\) \+ 28px\)/);

  const upperGlow = css.match(/\.galaxy-core-content::before\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(upperGlow, /radial-gradient/);
  assert.match(upperGlow, /rgb\(201 244 255 \/ 0\.38\)/);
  assert.match(upperGlow, /pointer-events:\s*none/);
});

test("project core becomes a responsive translucent galaxy energy badge", () => {
  const css = readUi("app/globals.css");
  const projectCore = css.match(/\.galaxy-project-core\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const core = [...css.matchAll(/\.galaxy-core-content\s*\{([\s\S]*?)\}/g)].at(-1)?.[1] ?? "";

  assert.match(projectCore, /--galaxy-core-badge-size:\s*clamp\(88px, 6\.2vw, 104px\)/);
  assert.match(projectCore, /--galaxy-core-main-ring-width:\s*clamp\(112\.64px, 7\.936vw, 133\.12px\)/);
  assert.match(projectCore, /--galaxy-core-aux-ring-size:\s*clamp\(128\.48px, 9\.052vw, 151\.84px\)/);
  assert.match(core, /width:\s*var\(--galaxy-core-badge-size\)/);
  assert.match(core, /height:\s*auto/);
  assert.match(core, /aspect-ratio:\s*1/);
  assert.match(core, /rgb\(120 205 255 \/ 0\.32\)/);
  assert.match(core, /rgb\(25 72 145 \/ 0\.52\) 38%/);
  assert.match(core, /rgb\(5 15 48 \/ 0\.68\) 76%/);
  assert.match(core, /rgb\(3 8 30 \/ 0\.72\) 100%/);
  assert.match(core, /backdrop-filter:\s*blur\(1px\)/);
  assert.match(core, /transform:\s*translateY\(4px\)/);
  assert.doesNotMatch(core, /0 0 [4-9][0-9]px/);
});

test("project core keeps exactly two compact external energy rings", () => {
  const component = readUi("components/dashboard/agent-constellation.tsx");
  const css = readUi("app/globals.css");
  const coreMarkup = component.match(/<Link ref=\{projectCoreRef\}[\s\S]*?<\/Link>/)?.[0] ?? "";

  assert.match(coreMarkup, /galaxy-lensing-ring/);
  assert.match(coreMarkup, /galaxy-core-orbit-outer/);
  assert.doesNotMatch(
    coreMarkup,
    /galaxy-gravity-well|galaxy-core-depth-halo|galaxy-core-accretion-disk|galaxy-core-orbit-inner|galaxy-core-foreground-lens|galaxy-event-horizon|galaxy-core-foreground-accretion-band/,
  );

  const lensingRing = [...css.matchAll(/\.galaxy-lensing-ring\s*\{([\s\S]*?)\}/g)].at(-1)?.[1] ?? "";
  const outerRing = [...css.matchAll(/\.galaxy-core-orbit-outer\s*\{([\s\S]*?)\}/g)].at(-1)?.[1] ?? "";
  assert.match(lensingRing, /width:\s*var\(--galaxy-core-main-ring-width\)/);
  assert.match(lensingRing, /height:\s*var\(--galaxy-core-main-ring-height\)/);
  assert.match(lensingRing, /opacity:\s*0\.26/);
  assert.match(outerRing, /inset:\s*0/);
  assert.match(outerRing, /opacity:\s*0\.12/);
});

test("project badge text scales for both desktop targets without adding a panel", () => {
  const css = readUi("app/globals.css");
  const component = readUi("components/dashboard/agent-constellation.tsx");
  const heading = [...css.matchAll(/\.galaxy-core-text\s*>\s*strong\s*\{([\s\S]*?)\}/g)].at(-1)?.[1] ?? "";
  const eyebrow = [...css.matchAll(/\.galaxy-core-text\s*>\s*span:first-child\s*\{([\s\S]*?)\}/g)].at(-1)?.[1] ?? "";
  const subtitle = [...css.matchAll(/\.galaxy-core-text\s*>\s*span:last-child\s*\{([\s\S]*?)\}/g)].at(-1)?.[1] ?? "";

  assert.match(heading, /font-size:\s*clamp\(16px, 1\.2vw, 19px\)/);
  assert.match(eyebrow, /font-size:\s*10px/);
  assert.match(subtitle, /font-size:\s*9px/);
  assert.match(subtitle, /transform:\s*translateY\(-4px\)/);
  assert.doesNotMatch(heading, /transform:/);
  assert.doesNotMatch(eyebrow, /transform:/);
  assert.match(subtitle, /opacity:\s*1/);
  assert.match(subtitle, /0 1px 3px rgb\(1 4 24 \/ 0\.98\)/);
  const textChildren = css.match(/\.galaxy-core-text\s*>\s*\*\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(textChildren, /0 0 7px rgb\(77 190 255 \/ 0\.28\)/);
  assert.doesNotMatch(component, /galaxy-core-text-panel/);
});

test("layer debug mode can isolate background, core, far and near depth slices", () => {
  const component = readUi("components/dashboard/agent-constellation.tsx");
  const css = readUi("app/globals.css");

  assert.match(component, /galaxyDebug"\) === "layers"/);
  assert.match(component, /galaxyLayer/);
  assert.match(component, /data-layer-debug=/);
  assert.match(component, /data-layer-debug-view=/);
  for (const view of ["background", "core", "far", "near"]) {
    assert.match(css, new RegExp(`data-layer-debug-view="${view}"`));
  }
});

test("overview title is condensed into the app header without the duplicate hero", () => {
  const overview = readUi("app/projects/page.tsx");
  const header = readUi("components/layout/header.tsx");

  assert.match(overview, /title="掌握质量全貌，驱动智能闭环。"/);
  assert.match(overview, /headerEyebrow=\{null\}/);
  assert.doesNotMatch(overview, /智能质量网络/);
  assert.doesNotMatch(overview, /预览跨项目质量态势/);
  assert.match(header, /eyebrow \? \(/);
});

test("galaxy core, orbit artwork and debug guides share the mapped background focal point", () => {
  const carousel = readUi("lib/dashboard/constellation-carousel.ts");
  const layout = readUi("lib/dashboard/galaxy-layout.ts");
  const component = readUi("components/dashboard/agent-constellation.tsx");
  const layer = readUi("components/dashboard/galaxy-webgl-layer.tsx");
  const css = readUi("app/globals.css");

  assert.doesNotMatch(carousel, /GALAXY_CORE|centerX|centerY|focusX|focusY/);
  assert.match(layout, /GALAXY_BACKGROUND_FOCAL_POINT/);
  assert.match(layout, /computeCoverTransform/);
  assert.match(layout, /mapImagePointToContainer/);
  assert.match(component, /computeGalaxyLayout/);
  assert.match(component, /galaxyLayout\.focalX/);
  assert.match(component, /galaxyLayout\.focalY/);
  assert.match(component, /--galaxy-core-x/);
  assert.match(component, /--galaxy-core-y/);
  assert.doesNotMatch(component, /<ellipse cx="365" cy="147"/);
  assert.match(css, /left:\s*var\(--galaxy-core-x\)/);
  assert.match(css, /top:\s*var\(--galaxy-core-y\)/);
  const projectCore = css.match(/\.galaxy-project-core\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(projectCore, /transform:\s*translate\(-50%, -50%\)/);
  assert.equal((css.match(/\.galaxy-project-core\s*\{/g) ?? []).length, 1);

  assert.match(layer, /<img/);
  assert.match(layer, /object-fit:\s*cover/);
  assert.match(layer, /object-position:\s*var\(--galaxy-bg-position-x\) var\(--galaxy-bg-position-y\)/);
  assert.match(layer, /galaxy-rear-stars/);
  assert.match(layer, /galaxy-foreground-nebula/);
  assert.doesNotMatch(layer, /computeGalaxyObjectPosition/);

  assert.match(component, /galaxyDebug/);
  assert.match(component, /process\.env\.NODE_ENV !== "production"/);
  assert.match(component, /galaxyDebug"\) === "core"/);
  assert.match(component, /data-core-debug=/);
  assert.match(component, /galaxy-core-debug-panel/);
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
  assert.match(component, /GALAXY_SPATIAL_CONFIG\.projectCoreDiameter/);

  const projectCore = css.match(/\.galaxy-project-core\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(projectCore, /width:\s*var\(--galaxy-core-aux-ring-size\)/);
  assert.match(projectCore, /height:\s*var\(--galaxy-core-aux-ring-size\)/);

  const coreOverride = [...css.matchAll(/\.galaxy-core-content\s*\{([\s\S]*?)\}/g)].at(-1)?.[1] ?? "";
  assert.match(coreOverride, /rgb\(25 72 145 \/ 0\.52/);
  assert.doesNotMatch(coreOverride, /rgb\([^)]*\/ 0\.9[5-9]/);
});

test("background motion remains restrained and reduced motion removes parallax", () => {
  const layer = readUi("components/dashboard/galaxy-webgl-layer.tsx");
  const css = readUi("app/globals.css");
  const imageStyle = layer.match(/\.galaxy-art-image\s*\{([\s\S]*?)\}/)?.[1] ?? "";

  assert.match(layer, /if \(!motionDisabled\) \{\s*host\.addEventListener\("pointermove", onPointerMove\)/);
  assert.match(layer, /calc\(var\(--galaxy-parallax-x\) \* 1\.5px\)/);
  assert.doesNotMatch(imageStyle, /--galaxy-parallax-[xy]/);
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
    "node --experimental-strip-types --test tests/galaxy-workflow-contract.test.mjs lib/dashboard/galaxy-layout.test.mjs lib/dashboard/constellation-carousel.test.mjs",
  );
  assert.equal(packageJson.scripts["verify:galaxy"], "npm run test:galaxy && npm run build");

  const workflow = readRepo(".github/workflows/galaxy-ui-check.yml");
  assert.match(workflow, /npm run test:galaxy/);
  assert.match(workflow, /npm run build/);
});

test("Phase 2 renders one weak static orbit without arrows or flow effects", () => {
  const component = readUi("components/dashboard/agent-constellation.tsx");
  const css = readUi("app/globals.css");

  assert.equal((component.match(/className="galaxy-main-orbit"/g) ?? []).length, 1);
  assert.doesNotMatch(component, /markerEnd=|markerStart=|galaxy-flow-(?:track|glow|beam|comet)|galaxy-foreground-flow/);
  assert.doesNotMatch(component, /galaxy-(?:dust|energy|inner)-orbit/);

  const orbit = css.match(/\.galaxy-main-orbit\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(orbit, /stroke-width:\s*1\.1;/);
  assert.match(orbit, /opacity:\s*0\.2;/);
  assert.match(orbit, /animation:\s*none;/);
});

test("clockwise motion advances phase while preserving pause and reduced-motion controls", () => {
  const component = readUi("components/dashboard/agent-constellation.tsx");

  assert.match(component, /GALAXY_MOTION_DIRECTION/);
  assert.match(component, /computeOrbitNode/);
  assert.match(component, /requestAnimationFrame\(animate\)/);
  assert.match(component, /advanceOrbitRawPhase/);
  assert.match(component, /easeOrbitPhase/);
  assert.match(component, /data-motion-direction=\{GALAXY_MOTION_DIRECTION\}/);
  assert.match(component, /prefers-reduced-motion/);
  assert.doesNotMatch(component, /setInterval\(/);
});

test("seven stage nodes use unique upright holographic energy emblems", () => {
  const component = readUi("components/dashboard/agent-constellation.tsx");
  const css = readUi("app/globals.css");

  assert.match(component, /StageHologramIcon/);
  assert.match(component, /data-stage-icon=/);
  assert.doesNotMatch(component, /galaxy-stage-orb-core[\s\S]{0,240}<ProductIcon/);

  const iconSource = readUi("components/dashboard/stage-hologram-icon.tsx");
  const iconIds = [
    "requirement-scan",
    "test-blueprint",
    "script-braces",
    "execution-orbit",
    "result-radiance",
    "repair-reconnect",
    "regression-shield",
  ];

  for (const iconId of iconIds) {
    assert.match(iconSource, new RegExp(`\\"${iconId}\\"`));
  }
  assert.equal(new Set(iconIds).size, 7);
  assert.match(iconSource, /viewBox="0 0 32 32"/);
  assert.match(iconSource, /vectorEffect:\s*"non-scaling-stroke"/);
  assert.match(iconSource, /galaxy-hologram-icon-primary/);
  assert.match(iconSource, /galaxy-hologram-icon-accent/);

  const uprightIcon = css.match(/\.galaxy-hologram-icon\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const farIcon = css.match(/\.galaxy-stage-node\[data-visual-level="far"\] \.galaxy-stage-orb-core > svg\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const nearIcon = css.match(/\.galaxy-stage-node\[data-visual-level="near"\] \.galaxy-stage-orb-core > svg\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(uprightIcon, /transform:\s*rotate\(0deg\)/);
  assert.match(farIcon, /opacity:\s*0\.94/);
  assert.match(farIcon, /width:\s*10px/);
  assert.doesNotMatch(farIcon, /blur\(/);
  assert.match(nearIcon, /width:\s*28px/);
  assert.match(nearIcon, /height:\s*28px/);
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

  const core = [...css.matchAll(/\.galaxy-core-content\s*\{([\s\S]*?)\}/g)].at(-1)?.[1] ?? "";
  const stageNode = css.match(/\.galaxy-stage-node\s*\{([\s\S]*?)\}/)?.[1] ?? "";

  assert.doesNotMatch(component, /galaxy-event-horizon/);
  assert.match(core, /rgb\(120 205 255 \/ 0\.32\)/);
  assert.match(core, /rgb\(25 72 145 \/ 0\.52\)/);
  assert.doesNotMatch(core, /rgb\(0 0 0/);
  assert.doesNotMatch(core, /rgb\(73 150 255/);
  assert.match(stageNode, /width:\s*162px;/);
  assert.doesNotMatch(component, /block truncate text-\[11px\]/);
  assert.doesNotMatch(component, /galaxy-stage-glass/);
});

test("stage LOD keeps stable orb DOM and a translucent galaxy detail HUD", () => {
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
  assert.match(detailPanel, /color:\s*rgb\(241 245 249\)/);
  assert.match(detailPanel, /linear-gradient\(135deg,\s*rgb\(7 15 55 \/ 0\.58\),\s*rgb\(24 18 82 \/ 0\.48\)\)/);
  assert.match(detailPanel, /backdrop-filter:\s*blur\(14px\) saturate\(120%\)/);
  assert.doesNotMatch(detailPanel, /rgb\(255 255 255 \/ 0\.9/);
});

test("immersive shell removes the title block while preserving right controls and the stage HUD", () => {
  const component = readUi("components/dashboard/agent-constellation.tsx");
  const css = readUi("app/globals.css");

  assert.match(component, /<GalaxyWebGLLayer[\s\S]*?<header className="galaxy-toolbar/);
  assert.match(component, /galaxy-top-readability/);
  assert.match(component, /galaxy-control-hud/);
  assert.match(component, /<header className="galaxy-toolbar flex items-start justify-end gap-3">/);
  assert.doesNotMatch(component, /galaxy-title-hud/);
  assert.doesNotMatch(component, /galaxy-title-icon/);
  assert.doesNotMatch(component, /智能体协作星图/);
  assert.doesNotMatch(css, /\.galaxy-title-hud\s*\{/);
  assert.doesNotMatch(css, /\.galaxy-title-icon\s*\{/);
  assert.match(component, /galaxy-viewport absolute inset-0[^"]*h-full/);
  assert.match(component, /galaxy-detail-metrics/);
  assert.match(component, /galaxy-detail-action/);
  assert.match(component, /md:h-\[82px\]/);
  assert.match(component, /md:bottom-\[14px\]/);
  assert.match(component, /md:grid-cols-\[minmax\(0,0\.9fr\)_minmax\(420px,1\.35fr\)_minmax\(118px,0\.35fr\)\]/);
  assert.doesNotMatch(component, /divide-x/);
  assert.doesNotMatch(component, /md:border-r/);

  const toolbar = css.match(/\.galaxy-toolbar\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(toolbar, /position:\s*absolute/);
  assert.match(toolbar, /inset:\s*16px 18px auto/);
  assert.match(toolbar, /background:\s*transparent/);
  assert.doesNotMatch(toolbar, /border-bottom/);

  const detailPanel = css.match(/\.galaxy-detail-panel\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(detailPanel, /--galaxy-detail-safe-zone:\s*110px/);
  assert.match(detailPanel, /height:\s*82px/);
  assert.match(detailPanel, /border-radius:\s*14px/);
  assert.match(detailPanel, /border:\s*1px solid rgb\(115 145 255 \/ 0\.26\)/);
  assert.match(detailPanel, /backdrop-filter:\s*blur\(14px\) saturate\(120%\)/);

  const metric = css.match(/\.galaxy-detail-metric\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.doesNotMatch(metric, /background/);
  assert.doesNotMatch(metric, /border-radius/);
  assert.doesNotMatch(metric, /box-shadow/);
  assert.doesNotMatch(metric, /padding/);

  const accent = css.match(/\.galaxy-detail-panel::before\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(accent, /height:\s*1px/);
  assert.match(accent, /var\(--stage-color\)/);

  const action = css.match(/\.galaxy-detail-action\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(action, /border-radius:\s*999px/);
  assert.match(action, /background:\s*rgb\(255 255 255 \/ 0\.07\)/);
});

test("clockwise depth layout preserves far identity, debug geometry and HUD clearance", () => {
  const component = readUi("components/dashboard/agent-constellation.tsx");
  const css = readUi("app/globals.css");
  const carousel = readUi("lib/dashboard/constellation-carousel.ts");

  assert.doesNotMatch(carousel, /GALAXY_CORE|centerX|centerY/);
  assert.match(carousel, /radiusY:\s*100/);
  assert.match(carousel, /GALAXY_STATIC_LAYOUT/);
  assert.match(component, /galaxyDebug"\) === "layout"/);
  assert.match(component, /galaxy-layout-debug-safe-zone/);
  assert.match(component, /galaxy-layout-debug-node-meta/);
  assert.match(component, /--stage-inverse-scale/);
  assert.match(component, /data-depth-level=/);
  assert.match(component, /galaxyDebug"\) === "motion"/);
  assert.match(component, /galaxy-motion-debug-panel/);

  const farCore = css.match(/\.galaxy-stage-node\[data-visual-level="far"\] \.galaxy-stage-orb-core\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(farCore, /width:\s*var\(--stage-core-size\)/);
  assert.match(css, /\.galaxy-stage-node\[data-visual-level="far"\] \.galaxy-stage-number/);
  assert.match(css, /\.galaxy-stage-node\[data-visual-level="far"\]:hover \.galaxy-stage-name/);
  assert.match(css, /\.galaxy-constellation\[data-layout-debug="true"\]/);

  const staticMiddleCaption = css.match(/\.galaxy-stage-node\[data-depth-level="middle"\] \.galaxy-stage-orb-caption\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  const staticMiddleIcon = css.match(/\.galaxy-stage-node\[data-depth-level="middle"\] \.galaxy-stage-orb-core > svg\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(staticMiddleCaption, /opacity:\s*1/);
  assert.match(staticMiddleCaption, /scale\(var\(--stage-inverse-scale\)\)/);
  assert.match(staticMiddleIcon, /opacity:\s*0\.9/);
});
