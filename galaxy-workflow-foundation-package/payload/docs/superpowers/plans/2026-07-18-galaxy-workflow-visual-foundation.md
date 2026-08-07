# Galaxy Workflow Visual Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the overloaded real-time black-hole and particle rendering with a controlled galaxy art layer, a restrained star-dust layer, executable visual-contract tests, and a precise Codex handoff for the remaining orbital animation work.

**Architecture:** Keep `AgentConstellation` and its business data contract intact. Preserve the existing `GalaxyWebGLLayer` component API but reimplement it as a static SVG-backed art layer with light CSS motion; replace the current dense Canvas renderer with a deterministic low-density particle layer. Add Node contract tests and a GitHub Actions build gate before any further animation work.

**Tech Stack:** Next.js 14, React 18, TypeScript, SVG, Canvas 2D, Node.js built-in test runner, GitHub Actions.

## Global Constraints

- The seven-stage order remains: requirements, design, generation, execution, analysis, repair, verification.
- Workflow arrows connect one stage to the next and never point to the project core.
- The galaxy background contains no business text, stage labels, values, or arrows.
- No WebGL or Three.js rendering is used in the visual foundation layer.
- Background stars remain below 100 and moving dust remains below 30.
- Large white foreground particles and random rainbow particles are prohibited.
- Existing dashboard APIs, project links, stage data, pause controls, reduced-motion handling, and mobile fallback remain functional.
- Verification requires both `npm run test:galaxy` and `npm run build` from `ui/`.

---

### Task 1: Add the reusable galaxy art asset

**Files:**
- Create: `ui/public/assets/galaxy-workflow/galaxy-workflow-bg.svg`

- [ ] Create a 2048×1152 SVG containing a dark blue-purple background, restrained star field, central nebula, subtle elliptical orbital light traces, and a vignette.
- [ ] Verify that the SVG contains no `<text>` elements and no stage-specific content.

### Task 2: Replace the WebGL scene with the art layer

**Files:**
- Modify: `ui/components/dashboard/galaxy-webgl-layer.tsx`

- [ ] Preserve the exported `GalaxyWebGLLayer({ paused, reducedMotion })` interface.
- [ ] Render the SVG asset as a non-interactive background layer.
- [ ] Add only slow breathing, slight scale drift, and vignette effects.
- [ ] Pause CSS motion when `paused`, `reducedMotion`, or `prefers-reduced-motion` is active.

### Task 3: Replace the overloaded particle renderer

**Files:**
- Modify: `ui/components/dashboard/galaxy-particle-layer.tsx`

- [ ] Use deterministic seeds.
- [ ] Render no more than 84 background stars and 24 moving dust particles.
- [ ] Keep particle radius below 2.2 pixels and alpha below 0.72.
- [ ] Use a blue-white-purple palette only.
- [ ] Stop animation while paused, reduced-motion is enabled, or the page is hidden.

### Task 4: Add executable visual contracts

**Files:**
- Create: `ui/tests/galaxy-workflow-contract.test.mjs`
- Modify: `ui/package.json`

- [ ] Add `test:galaxy` using Node's built-in test runner.
- [ ] Assert the galaxy SVG exists and has no `<text>`.
- [ ] Assert the layer no longer imports Three.js.
- [ ] Assert particle budgets stay within the specified limits.
- [ ] Assert the seven-stage order remains unchanged.

### Task 5: Add CI verification

**Files:**
- Create: `.github/workflows/galaxy-ui-check.yml`

- [ ] Run on pushes to `galaxy` and pull requests targeting `galaxy`.
- [ ] Use Node.js 22 and `npm ci` in `ui/`.
- [ ] Run `npm run test:galaxy`.
- [ ] Run `npm run build`.

### Task 6: Document the Codex continuation work

**Files:**
- Create: `docs/galaxy-workflow/CODEX-NEXT-STEPS.md`

- [ ] Describe the exact remaining orbit-geometry correction.
- [ ] Require the front stage to be at the bottom of the ellipse and the rear stage at the top.
- [ ] Require stage-to-stage tangential arrows in business order.
- [ ] Define screenshot checkpoints at 1440×900 and 1920×1080.
- [ ] Prohibit reintroducing dense particles, black-hole geometry, or unrelated redesign.
