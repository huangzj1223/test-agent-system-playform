export interface GalaxyPoint {
  x: number;
  y: number;
}

export interface GalaxySize {
  width: number;
  height: number;
}

export interface GalaxyCoverTransform {
  renderedWidth: number;
  renderedHeight: number;
  offsetX: number;
  offsetY: number;
  focalX: number;
  focalY: number;
}

export interface GalaxyBounds extends GalaxySize {
  left: number;
  top: number;
}

export const GALAXY_BACKGROUND_INTRINSIC_SIZE = {
  width: 1672,
  height: 941,
} as const;

export const GALAXY_BACKGROUND_FOCAL_POINT = {
  x: 847 / GALAXY_BACKGROUND_INTRINSIC_SIZE.width,
  y: 316 / GALAXY_BACKGROUND_INTRINSIC_SIZE.height,
} as const;

export const GALAXY_BACKGROUND_OBJECT_POSITION = {
  x: 0.5,
  y: 0.15,
} as const;

export const GALAXY_OCCLUSION_CONFIG = {
  cropWidth: {
    minPx: 260,
    preferredVw: 21,
    maxPx: 320,
  },
  featherRange: {
    startPx: 5,
    endPx: 53,
  },
  sourceRange: {
    startPx: 14,
    endPx: 44,
  },
  zIndex: {
    coreBody: 80,
    foregroundCrop: 86,
    coreText: 88,
    nearStageMinimum: 92,
  },
} as const;

export function getGalaxyCoreOcclusionRatio(coreDiameter: number): number {
  if (!Number.isFinite(coreDiameter) || coreDiameter <= 0) {
    throw new RangeError("coreDiameter must be a finite positive number");
  }

  return (
    GALAXY_OCCLUSION_CONFIG.sourceRange.endPx
    - GALAXY_OCCLUSION_CONFIG.sourceRange.startPx
  ) / coreDiameter;
}

export function computeCoverTransform({
  imageSize,
  containerSize,
  objectPosition,
  focalPoint,
}: {
  imageSize: GalaxySize;
  containerSize: GalaxySize;
  objectPosition: GalaxyPoint;
  focalPoint: GalaxyPoint;
}): GalaxyCoverTransform {
  assertPositiveSize(imageSize, "imageSize");
  assertPositiveSize(containerSize, "containerSize");

  const scale = Math.max(
    containerSize.width / imageSize.width,
    containerSize.height / imageSize.height,
  );
  const renderedWidth = imageSize.width * scale;
  const renderedHeight = imageSize.height * scale;
  const offsetX = (containerSize.width - renderedWidth) * objectPosition.x;
  const offsetY = (containerSize.height - renderedHeight) * objectPosition.y;
  const mappedFocal = mapImagePointToContainer(
    { renderedWidth, renderedHeight, offsetX, offsetY },
    focalPoint,
  );

  return {
    renderedWidth,
    renderedHeight,
    offsetX,
    offsetY,
    focalX: mappedFocal.x,
    focalY: mappedFocal.y,
  };
}

export function mapImagePointToContainer(
  transform: Pick<GalaxyCoverTransform, "renderedWidth" | "renderedHeight" | "offsetX" | "offsetY">,
  point: GalaxyPoint,
): GalaxyPoint {
  return {
    x: transform.offsetX + point.x * transform.renderedWidth,
    y: transform.offsetY + point.y * transform.renderedHeight,
  };
}

export function computeGalaxyLayout(containerSize: GalaxySize): GalaxyCoverTransform {
  return computeCoverTransform({
    imageSize: GALAXY_BACKGROUND_INTRINSIC_SIZE,
    containerSize,
    objectPosition: GALAXY_BACKGROUND_OBJECT_POSITION,
    focalPoint: GALAXY_BACKGROUND_FOCAL_POINT,
  });
}

export function computeCenteredBounds(center: GalaxyPoint, size: GalaxySize): GalaxyBounds {
  assertPositiveSize(size, "size");

  return {
    left: center.x - size.width / 2,
    top: center.y - size.height / 2,
    width: size.width,
    height: size.height,
  };
}

function assertPositiveSize(size: GalaxySize, label: string): void {
  if (
    !Number.isFinite(size.width)
    || !Number.isFinite(size.height)
    || size.width <= 0
    || size.height <= 0
  ) {
    throw new RangeError(`${label} must contain finite positive dimensions`);
  }
}
