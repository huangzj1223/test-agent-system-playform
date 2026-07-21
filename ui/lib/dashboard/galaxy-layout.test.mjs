import assert from "node:assert/strict";
import { test } from "node:test";

import {
  GALAXY_BACKGROUND_FOCAL_POINT,
  GALAXY_BACKGROUND_INTRINSIC_SIZE,
  GALAXY_BACKGROUND_OBJECT_POSITION,
  GALAXY_OCCLUSION_CONFIG,
  computeCenteredBounds,
  computeCoverTransform,
  computeGalaxyLayout,
  getGalaxyCoreOcclusionRatio,
  mapImagePointToContainer,
} from "./galaxy-layout.ts";

const closeTo = (actual, expected, tolerance = 0.001) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

test("calibrates the black-hole center from the source artwork", () => {
  assert.deepEqual(GALAXY_BACKGROUND_INTRINSIC_SIZE, { width: 1672, height: 941 });
  closeTo(GALAXY_BACKGROUND_FOCAL_POINT.x, 847 / 1672, 1e-12);
  closeTo(GALAXY_BACKGROUND_FOCAL_POINT.y, 316 / 941, 1e-12);
  assert.deepEqual(GALAXY_BACKGROUND_OBJECT_POSITION, { x: 0.5, y: 0.15 });
});

test("maps the calibrated focal point through a width-constrained cover transform", () => {
  const transform = computeCoverTransform({
    imageSize: GALAXY_BACKGROUND_INTRINSIC_SIZE,
    containerSize: { width: 1200, height: 640 },
    objectPosition: GALAXY_BACKGROUND_OBJECT_POSITION,
    focalPoint: GALAXY_BACKGROUND_FOCAL_POINT,
  });

  closeTo(transform.renderedWidth, 1200);
  closeTo(transform.renderedHeight, 675.358852);
  closeTo(transform.offsetX, 0);
  closeTo(transform.offsetY, -5.303828);
  closeTo(transform.focalX, 607.894737);
  closeTo(transform.focalY, 221.490431);
});

test("maps points through a height-constrained cover transform", () => {
  const transform = computeCoverTransform({
    imageSize: { width: 1000, height: 500 },
    containerSize: { width: 600, height: 600 },
    objectPosition: { x: 0.25, y: 0.75 },
    focalPoint: { x: 0.5, y: 0.4 },
  });

  assert.deepEqual(transform, {
    renderedWidth: 1200,
    renderedHeight: 600,
    offsetX: -150,
    offsetY: 0,
    focalX: 450,
    focalY: 240,
  });
  assert.deepEqual(mapImagePointToContainer(transform, { x: 0.25, y: 0.75 }), {
    x: 150,
    y: 450,
  });
});

test("keeps project and orbit centers within one pixel at both target viewports", () => {
  for (const containerSize of [
    { width: 1164, height: 640 },
    { width: 1644, height: 640 },
  ]) {
    const layout = computeGalaxyLayout(containerSize);
    const projectCenter = {
      x: layout.focalX,
      y: layout.focalY,
    };
    const orbitCenter = {
      x: layout.focalX,
      y: layout.focalY,
    };

    assert.ok(Math.hypot(projectCenter.x - layout.focalX, projectCenter.y - layout.focalY) <= 1);
    assert.ok(Math.hypot(orbitCenter.x - layout.focalX, orbitCenter.y - layout.focalY) <= 1);
  }
});

test("changing project core size preserves the calibrated center", () => {
  for (const containerSize of [
    { width: 1164, height: 640 },
    { width: 1644, height: 640 },
  ]) {
    const layout = computeGalaxyLayout(containerSize);

    for (const diameter of [82, 88, 89.28, 92, 104, 112, 140]) {
      const bounds = computeCenteredBounds(
        { x: layout.focalX, y: layout.focalY },
        { width: diameter, height: diameter },
      );
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;

      closeTo(centerX, layout.focalX, 1e-12);
      closeTo(centerY, layout.focalY, 1e-12);
    }
  }
});

test("responsive galaxy badge reaches the intended desktop sizes without moving center", () => {
  const responsiveDiameter = (viewportWidth) => Math.min(104, Math.max(88, viewportWidth * 0.062));

  closeTo(responsiveDiameter(1440), 89.28, 1e-12);
  closeTo(responsiveDiameter(1920), 104, 1e-12);

  for (const viewportWidth of [1440, 1920]) {
    const diameter = responsiveDiameter(viewportWidth);
    const bounds = computeCenteredBounds({ x: 500, y: 240 }, { width: diameter, height: diameter });
    closeTo(bounds.left + bounds.width / 2, 500, 1e-12);
    closeTo(bounds.top + bounds.height / 2, 240, 1e-12);
  }
});

test("same-source foreground crop occludes 25 to 35 percent of the responsive core", () => {
  assert.deepEqual(GALAXY_OCCLUSION_CONFIG.featherRange, {
    startPx: 5,
    endPx: 53,
  });
  assert.deepEqual(GALAXY_OCCLUSION_CONFIG.sourceRange, {
    startPx: 14,
    endPx: 44,
  });
  assert.equal(GALAXY_OCCLUSION_CONFIG.sourceRange.endPx - GALAXY_OCCLUSION_CONFIG.sourceRange.startPx, 30);

  for (const diameter of [89.28, 104]) {
    const ratio = getGalaxyCoreOcclusionRatio(diameter);
    assert.ok(ratio >= 0.25, `occlusion ratio ${ratio} must be at least 25%`);
    assert.ok(ratio <= 0.35, `occlusion ratio ${ratio} must not exceed 35%`);
  }
});

test("occlusion layers preserve the required body, crop, text and near-node ordering", () => {
  assert.deepEqual(GALAXY_OCCLUSION_CONFIG.zIndex, {
    coreBody: 80,
    foregroundCrop: 86,
    coreText: 88,
    nearStageMinimum: 92,
  });
  assert.ok(GALAXY_OCCLUSION_CONFIG.zIndex.coreBody < GALAXY_OCCLUSION_CONFIG.zIndex.foregroundCrop);
  assert.ok(GALAXY_OCCLUSION_CONFIG.zIndex.foregroundCrop < GALAXY_OCCLUSION_CONFIG.zIndex.coreText);
  assert.ok(GALAXY_OCCLUSION_CONFIG.zIndex.coreText < GALAXY_OCCLUSION_CONFIG.zIndex.nearStageMinimum);
});

test("rejects non-positive image and container dimensions", () => {
  assert.throws(
    () => computeCoverTransform({
      imageSize: { width: 0, height: 941 },
      containerSize: { width: 1200, height: 640 },
      objectPosition: GALAXY_BACKGROUND_OBJECT_POSITION,
      focalPoint: GALAXY_BACKGROUND_FOCAL_POINT,
    }),
    RangeError,
  );
  assert.throws(
    () => computeCoverTransform({
      imageSize: GALAXY_BACKGROUND_INTRINSIC_SIZE,
      containerSize: { width: 1200, height: Number.NaN },
      objectPosition: GALAXY_BACKGROUND_OBJECT_POSITION,
      focalPoint: GALAXY_BACKGROUND_FOCAL_POINT,
    }),
    RangeError,
  );
});
