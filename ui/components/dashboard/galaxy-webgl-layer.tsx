"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import {
  buildGalaxyClusterSeeds,
  buildGalaxyDustSeeds,
  buildGalaxyParticleSeeds,
  projectAccretionPoint,
} from "@/lib/dashboard/constellation-carousel";

type PlaybackController = {
  start: () => void;
  stop: () => void;
};

const POINT_VERTEX_SHADER = `
  attribute float aSize;
  attribute float aGlow;
  varying vec3 vColor;
  varying float vGlow;
  uniform float uPixelRatio;

  void main() {
    vColor = color;
    vGlow = aGlow;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio * (150.0 / max(1.0, -viewPosition.z));
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const POINT_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vGlow;

  void main() {
    vec2 point = gl_PointCoord - vec2(0.5);
    float distanceToCenter = length(point);
    float disc = smoothstep(0.5, 0.08, distanceToCenter);
    float horizontalFlare = exp(-abs(point.y) * 34.0) * smoothstep(0.52, 0.0, abs(point.x));
    float verticalFlare = exp(-abs(point.x) * 34.0) * smoothstep(0.52, 0.0, abs(point.y));
    float alpha = max(disc, (horizontalFlare + verticalFlare) * 0.38 * vGlow);
    vec3 color = vColor * (0.82 + disc * 0.74 + vGlow * 0.26);
    gl_FragColor = vec4(color, alpha * (0.48 + vGlow * 0.45));
  }
`;

export function GalaxyWebGLLayer({
  paused,
  reducedMotion,
}: {
  paused: boolean;
  reducedMotion: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playbackRef = useRef({ paused, reducedMotion });
  const controllerRef = useRef<PlaybackController>({ start: () => undefined, stop: () => undefined });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch (error) {
      canvas.dataset.rendererState = "fallback";
      canvas.dataset.rendererError = error instanceof Error ? error.message : String(error);
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.32;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
    camera.position.set(0, 5.9, 11.4);
    camera.lookAt(0, -0.78, 0);

    const galaxy = new THREE.Group();
    galaxy.rotation.y = -0.2;
    scene.add(galaxy);

    const backgroundStars = createBackgroundStars();
    scene.add(backgroundStars);

    const gravityWell = createGravityWell();
    galaxy.add(gravityWell);

    const spiralStars = createSpiralStars();
    galaxy.add(spiralStars);

    const starClusters = createStarClusters();
    galaxy.add(starClusters);

    const eventHorizon = createEventHorizon();
    galaxy.add(eventHorizon);

    let width = 1;
    let height = 1;
    let animationFrame = 0;
    let running = false;
    let previousTime = 0;

    const resize = () => {
      const bounds = container.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      updatePixelRatio(scene, pixelRatio);
      renderer.render(scene, camera);
    };

    const animate = (time: number) => {
      if (!running) return;
      const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.1) : 0;
      previousTime = time;
      galaxy.rotation.y += delta * 0.055;
      starClusters.rotation.y -= delta * 0.012;
      eventHorizon.rotation.y += delta * 0.19;
      backgroundStars.rotation.y += delta * 0.0018;
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };

    const start = () => {
      if (running || playbackRef.current.paused || playbackRef.current.reducedMotion) return;
      running = true;
      previousTime = 0;
      animationFrame = window.requestAnimationFrame(animate);
    };

    const stop = () => {
      running = false;
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      previousTime = 0;
      renderer.render(scene, camera);
    };

    controllerRef.current = { start, stop };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    canvas.dataset.rendererState = "ready";
    start();

    return () => {
      observer.disconnect();
      stop();
      disposeScene(scene);
      renderer.dispose();
      controllerRef.current = { start: () => undefined, stop: () => undefined };
    };
  }, []);

  useEffect(() => {
    playbackRef.current = { paused, reducedMotion };
    if (paused || reducedMotion) controllerRef.current.stop();
    else controllerRef.current.start();
  }, [paused, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="galaxy-webgl-layer pointer-events-none absolute inset-0 h-full w-full"
      data-renderer-state="loading"
      aria-hidden="true"
    />
  );
}

function createPointMaterial(opacity = 1) {
  return new THREE.ShaderMaterial({
    vertexShader: POINT_VERTEX_SHADER,
    fragmentShader: POINT_FRAGMENT_SHADER,
    uniforms: { uPixelRatio: { value: 1 } },
    transparent: true,
    opacity,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
  });
}

function createSpiralStars() {
  const seeds = buildGalaxyDustSeeds(5200);
  const positions: number[] = [];
  const colors: number[] = [];
  const sizes: number[] = [];
  const glows: number[] = [];
  const color = new THREE.Color();

  seeds.forEach((seed) => {
    const theta = seed.arm * ((Math.PI * 2) / 3) + seed.radius * 6.75 + seed.angle * 0.19;
    const projection = projectAccretionPoint(seed.radius, theta, 0);
    const radius = 0.72 + seed.radius * 6.35;
    const spread = seed.spread * (0.09 + seed.radius * 0.27);
    const x = Math.cos(theta) * radius - Math.sin(theta) * spread;
    const z = Math.sin(theta) * radius + Math.cos(theta) * spread;
    const y = -1.26 * projection.funnel + seed.spread * 0.1 + Math.sin(seed.twinkle * 1.7) * 0.035;
    positions.push(x, y, z);

    const innerGlow = Math.pow(1 - seed.radius, 1.8);
    const lightness = Math.min(0.92, 0.5 + innerGlow * 0.34 + projection.depth * 0.08);
    color.setHSL(seed.hue / 360, seed.hue < 80 ? 0.94 : 0.82, lightness);
    const intensity = 0.72 + innerGlow * 1.15 + projection.depth * 0.25;
    colors.push(color.r * intensity, color.g * intensity, color.b * intensity);
    sizes.push((0.25 + seed.size * 0.22) * projection.scale * (0.82 + innerGlow * 0.72));
    glows.push(seed.hue < 80 ? 1 : 0.42 + innerGlow * 0.48);
  });

  return createPoints(positions, colors, sizes, glows);
}

function createStarClusters() {
  const clusters = buildGalaxyClusterSeeds(18);
  const positions: number[] = [];
  const colors: number[] = [];
  const sizes: number[] = [];
  const glows: number[] = [];
  const color = new THREE.Color();
  const random = deterministicRandom(0x6e624eb7);

  clusters.forEach((cluster) => {
    const theta = cluster.arm * ((Math.PI * 2) / 3) + cluster.radius * 6.75 + cluster.angle * 0.19;
    const projection = projectAccretionPoint(cluster.radius, theta, 0);
    const radius = 0.72 + cluster.radius * 6.35;
    const centerX = Math.cos(theta) * radius - Math.sin(theta) * cluster.spread * 0.2;
    const centerZ = Math.sin(theta) * radius + Math.cos(theta) * cluster.spread * 0.2;
    const centerY = -1.26 * projection.funnel;

    for (let index = 0; index < cluster.count; index += 1) {
      const localAngle = random() * Math.PI * 2;
      const localRadius = Math.pow(random(), 1.9) * (0.13 + cluster.size * 0.12);
      positions.push(
        centerX + Math.cos(localAngle) * localRadius,
        centerY + (random() - 0.5) * 0.18,
        centerZ + Math.sin(localAngle) * localRadius,
      );
      const hue = index % 13 === 0 ? 0.09 : cluster.hue / 360;
      color.setHSL(hue, 0.92, 0.66 + random() * 0.22);
      const intensity = 0.9 + projection.depth * 0.45 + (1 - cluster.radius) * 0.35;
      colors.push(color.r * intensity, color.g * intensity, color.b * intensity);
      sizes.push((0.42 + random() * 0.5) * projection.scale);
      glows.push(0.68 + random() * 0.32);
    }
  });

  return createPoints(positions, colors, sizes, glows);
}

function createBackgroundStars() {
  const seeds = buildGalaxyParticleSeeds(760);
  const positions: number[] = [];
  const colors: number[] = [];
  const sizes: number[] = [];
  const glows: number[] = [];
  const color = new THREE.Color();

  seeds.forEach((seed) => {
    positions.push((seed.x - 0.5) * 22, (seed.y - 0.5) * 9, -8 + seed.depth * 9);
    color.setHSL(seed.hue / 360, 0.72, 0.68 + seed.depth * 0.19);
    colors.push(color.r, color.g, color.b);
    sizes.push(seed.radius * (0.34 + seed.depth * 0.32));
    glows.push(0.25 + seed.depth * 0.72);
  });

  return createPoints(positions, colors, sizes, glows);
}

function createPoints(positions: number[], colors: number[], sizes: number[], glows: number[]) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.Float32BufferAttribute(sizes, 1));
  geometry.setAttribute("aGlow", new THREE.Float32BufferAttribute(glows, 1));
  return new THREE.Points(geometry, createPointMaterial());
}

function createGravityWell() {
  const group = new THREE.Group();
  const surface = new THREE.RingGeometry(0.78, 6.55, 160, 26);
  const positions = surface.getAttribute("position") as THREE.BufferAttribute;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getY(index);
    const radius = Math.hypot(x, z);
    const normalized = Math.min(1, radius / 6.55);
    const y = -1.18 * Math.pow(1 - normalized, 3.1);
    positions.setXYZ(index, x, y, z);
  }
  positions.needsUpdate = true;
  surface.computeVertexNormals();
  const surfaceMaterial = new THREE.MeshBasicMaterial({
    color: 0x3c55ff,
    transparent: true,
    opacity: 0.07,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  group.add(new THREE.Mesh(surface, surfaceMaterial));

  for (let ringIndex = 0; ringIndex < 11; ringIndex += 1) {
    const radius = 0.86 + ringIndex * 0.48;
    const points: THREE.Vector3[] = [];
    for (let step = 0; step <= 128; step += 1) {
      const angle = (step / 128) * Math.PI * 2;
      const normalized = Math.min(1, radius / 6.55);
      const y = -1.18 * Math.pow(1 - normalized, 3.1);
      points.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: ringIndex < 3 ? 0x8feaff : ringIndex < 7 ? 0x5c72ff : 0x8b55ff,
      transparent: true,
      opacity: 0.17 - ringIndex * 0.008,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    group.add(new THREE.LineLoop(geometry, material));
  }

  for (let streamIndex = 0; streamIndex < 7; streamIndex += 1) {
    const points: THREE.Vector3[] = [];
    for (let step = 0; step <= 72; step += 1) {
      const progress = step / 72;
      const radius = 5.9 - progress * 5.02;
      const angle = streamIndex * ((Math.PI * 2) / 7) + progress * 4.1;
      const normalized = radius / 6.55;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        -1.18 * Math.pow(1 - normalized, 3.1),
        Math.sin(angle) * radius,
      ));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: streamIndex % 3 === 0 ? 0xffa45a : streamIndex % 2 === 0 ? 0x73ddff : 0x8c70ff,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    group.add(new THREE.Line(geometry, material));
  }

  return group;
}

function createEventHorizon() {
  const group = new THREE.Group();
  group.position.y = -1.02;

  const shadow = new THREE.Mesh(
    new THREE.SphereGeometry(0.76, 52, 36),
    new THREE.MeshBasicMaterial({ color: 0x000006 }),
  );
  group.add(shadow);

  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.88, 0.045, 16, 128),
    new THREE.MeshBasicMaterial({ color: 0xf3fbff, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending }),
  );
  innerRing.rotation.x = Math.PI / 2;
  group.add(innerRing);

  const lensingRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.18, 0.075, 20, 160),
    new THREE.MeshBasicMaterial({ color: 0x70cfff, transparent: true, opacity: 0.52, blending: THREE.AdditiveBlending }),
  );
  lensingRing.rotation.x = Math.PI / 2;
  lensingRing.scale.z = 0.72;
  group.add(lensingRing);

  const warmArc = new THREE.Mesh(
    new THREE.TorusGeometry(1.42, 0.055, 16, 160, Math.PI * 1.2),
    new THREE.MeshBasicMaterial({ color: 0xff9b50, transparent: true, opacity: 0.48, blending: THREE.AdditiveBlending }),
  );
  warmArc.rotation.set(Math.PI / 2, 0.12, -0.4);
  group.add(warmArc);

  return group;
}

function deterministicRandom(initialState: number) {
  let state = initialState >>> 0;
  return () => {
    state = Math.imul(state ^ (state >>> 15), state | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

function updatePixelRatio(scene: THREE.Scene, pixelRatio: number) {
  scene.traverse((object) => {
    if (!(object instanceof THREE.Points)) return;
    const material = object.material;
    if (material instanceof THREE.ShaderMaterial && material.uniforms.uPixelRatio) {
      material.uniforms.uPixelRatio.value = pixelRatio;
    }
  });
}

function disposeScene(scene: THREE.Scene) {
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    }
  });
}
