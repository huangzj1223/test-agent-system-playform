"use client";

import { useEffect, useRef } from "react";

const BACKGROUND_STAR_COUNT = 84;
const MOVING_DUST_COUNT = 24;
const MAX_STAR_RADIUS = 1.8;
const MAX_DUST_RADIUS = 1.25;

type Star = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  phase: number;
  color: string;
};

type Dust = Star & {
  speed: number;
  drift: number;
};

export function GalaxyParticleLayer({
  paused,
  reducedMotion,
}: {
  paused: boolean;
  reducedMotion: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({ paused, reducedMotion, visible: true });

  useEffect(() => {
    stateRef.current.paused = paused;
    stateRef.current.reducedMotion = reducedMotion;
  }, [paused, reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const random = deterministicRandom(0x72e4a931);
    const palette = [
      "197, 239, 255",
      "144, 216, 255",
      "164, 176, 255",
      "204, 172, 255",
    ];
    const stars = createStars(BACKGROUND_STAR_COUNT, random, palette);
    const dust = createDust(MOVING_DUST_COUNT, random, palette);

    let width = 1;
    let height = 1;
    let pixelRatio = 1;
    let frame = 0;
    let previousTime = 0;
    let elapsed = 0;

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      draw();
    };

    const drawStar = (star: Star, x: number, y: number, alpha: number) => {
      context.beginPath();
      context.fillStyle = `rgba(${star.color}, ${Math.min(0.72, alpha)})`;
      context.arc(x, y, star.radius, 0, Math.PI * 2);
      context.fill();
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "screen";

      for (const star of stars) {
        const twinkle = stateRef.current.reducedMotion
          ? 1
          : 0.82 + Math.sin(elapsed * 0.35 + star.phase) * 0.18;
        drawStar(star, star.x * width, star.y * height, star.alpha * twinkle);
      }

      for (const item of dust) {
        const progress = stateRef.current.reducedMotion
          ? item.phase / (Math.PI * 2)
          : positiveModulo(item.phase / (Math.PI * 2) + elapsed * item.speed, 1);
        const x = positiveModulo(item.x + progress + item.drift * Math.sin(elapsed * 0.18 + item.phase), 1) * width;
        const y = (item.y + Math.sin(elapsed * 0.22 + item.phase) * 0.012) * height;
        const fade = 0.42 + Math.sin(progress * Math.PI) * 0.58;
        drawStar(item, x, y, item.alpha * fade);
      }

      context.globalCompositeOperation = "source-over";
    };

    const animate = (time: number) => {
      const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
      previousTime = time;
      if (!stateRef.current.paused && !stateRef.current.reducedMotion && stateRef.current.visible) {
        elapsed += delta;
        draw();
      }
      frame = window.requestAnimationFrame(animate);
    };

    const onVisibilityChange = () => {
      stateRef.current.visible = document.visibilityState === "visible";
      if (stateRef.current.visible) {
        previousTime = 0;
        draw();
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    document.addEventListener("visibilitychange", onVisibilityChange);
    resize();
    frame = window.requestAnimationFrame(animate);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="galaxy-particle-layer pointer-events-none absolute inset-0 h-full w-full"
      data-background-stars={BACKGROUND_STAR_COUNT}
      data-moving-dust={MOVING_DUST_COUNT}
      aria-hidden="true"
    />
  );
}

function createStars(count: number, random: () => number, palette: string[]): Star[] {
  return Array.from({ length: count }, (_, index) => ({
    x: random(),
    y: random(),
    radius: Math.min(MAX_STAR_RADIUS, 0.35 + random() * 1.25),
    alpha: 0.18 + random() * 0.46,
    phase: random() * Math.PI * 2,
    color: palette[index % palette.length],
  }));
}

function createDust(count: number, random: () => number, palette: string[]): Dust[] {
  return Array.from({ length: count }, (_, index) => ({
    x: random(),
    y: 0.18 + random() * 0.64,
    radius: Math.min(MAX_DUST_RADIUS, 0.38 + random() * 0.78),
    alpha: 0.2 + random() * 0.4,
    phase: random() * Math.PI * 2,
    color: palette[(index + 1) % palette.length],
    speed: 0.003 + random() * 0.005,
    drift: (random() - 0.5) * 0.022,
  }));
}

function deterministicRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
