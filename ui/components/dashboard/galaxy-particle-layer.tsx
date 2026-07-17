"use client";

import { useEffect, useRef } from "react";
import {
  buildGalaxyDustSeeds,
  buildGalaxyParticleSeeds,
  buildSatelliteGalaxySeeds,
  getGalaxyRenderBudget,
} from "@/lib/dashboard/constellation-carousel";

type PlaybackController = {
  start: () => void;
  stop: () => void;
};

export function GalaxyParticleLayer({
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

    const context = canvas.getContext("2d");
    if (!context) return;

    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let previousTime = 0;
    let elapsed = 0;
    let running = false;
    let frameIntervalMs = 32;
    let particles = buildGalaxyParticleSeeds(48);
    let galaxyDust = buildGalaxyDustSeeds(420);
    const satelliteGalaxies = buildSatelliteGalaxySeeds(6);

    const traceSpiral = (
      radius: number,
      phase: number,
      turns: number,
      steps = 72,
    ) => {
      context.beginPath();
      for (let step = 0; step <= steps; step += 1) {
        const progress = step / steps;
        const distance = radius * (0.05 + progress * 0.95);
        const angle = phase + progress * turns;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        if (step === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
    };

    const drawSatelliteGalaxies = () => {
      const baseRadius = width * 0.58;

      satelliteGalaxies.forEach((galaxy, galaxyIndex) => {
        const radius = baseRadius * galaxy.scale;
        const rotationDirection = galaxyIndex % 2 === 0 ? 1 : -1;
        const rotation = playbackRef.current.reducedMotion
          ? 0
          : elapsed * 0.006 * rotationDirection;

        context.save();
        context.translate(galaxy.x * width, galaxy.y * height);
        context.rotate(galaxy.tilt + rotation);
        context.scale(1, galaxy.flattening);
        context.globalCompositeOperation = "screen";

        const halo = context.createRadialGradient(0, 0, 0, 0, 0, radius * 1.25);
        halo.addColorStop(0, `hsla(${galaxy.hue + 24}, 92%, 88%, 0.72)`);
        halo.addColorStop(0.13, `hsla(${galaxy.hue}, 96%, 68%, 0.34)`);
        halo.addColorStop(0.58, `hsla(${galaxy.hue + 18}, 88%, 58%, 0.1)`);
        halo.addColorStop(1, `hsla(${galaxy.hue}, 90%, 48%, 0)`);
        context.fillStyle = halo;
        context.beginPath();
        context.arc(0, 0, radius * 1.25, 0, Math.PI * 2);
        context.fill();

        for (let arm = 0; arm < 2; arm += 1) {
          traceSpiral(radius, galaxy.phase + arm * Math.PI, 5.1, 42);
          context.strokeStyle = `hsla(${galaxy.hue + arm * 18}, 96%, 76%, 0.34)`;
          context.lineWidth = Math.max(0.55, radius * 0.045);
          context.shadowColor = `hsla(${galaxy.hue}, 100%, 68%, 0.56)`;
          context.shadowBlur = Math.max(3, radius * 0.18);
          context.stroke();
        }

        for (let starIndex = 0; starIndex < 18; starIndex += 1) {
          const starProgress = (starIndex + 1) / 18;
          const starAngle = galaxy.phase + starIndex * 2.399 + starProgress * 2.7;
          const starRadius = radius * (0.2 + starProgress * 0.82);
          const x = Math.cos(starAngle) * starRadius;
          const y = Math.sin(starAngle) * starRadius;
          context.fillStyle = `hsla(${galaxy.hue + 28}, 96%, 86%, ${0.28 + (starIndex % 4) * 0.09})`;
          context.shadowBlur = 2.5;
          context.beginPath();
          context.arc(x, y, 0.45 + (starIndex % 3) * 0.16, 0, Math.PI * 2);
          context.fill();
        }

        context.restore();
      });
    };

    const drawNebula = () => {
      const centerX = width * 0.5;
      const centerY = height * 0.508;
      const galaxyRadius = width * 0.47;

      context.save();
      context.globalCompositeOperation = "screen";
      context.translate(centerX, centerY);
      context.scale(1, 0.5);

      const halo = context.createRadialGradient(0, 0, 4, 0, 0, galaxyRadius);
      halo.addColorStop(0, "rgba(235, 252, 255, 0.72)");
      halo.addColorStop(0.06, "rgba(123, 226, 255, 0.47)");
      halo.addColorStop(0.18, "rgba(77, 130, 255, 0.3)");
      halo.addColorStop(0.38, "rgba(104, 69, 255, 0.18)");
      halo.addColorStop(0.66, "rgba(171, 59, 255, 0.08)");
      halo.addColorStop(1, "rgba(20, 26, 92, 0)");
      context.fillStyle = halo;
      context.beginPath();
      context.arc(0, 0, galaxyRadius, 0, Math.PI * 2);
      context.fill();

      const core = context.createRadialGradient(0, 0, 0, 0, 0, galaxyRadius * 0.23);
      core.addColorStop(0, "rgba(255, 252, 238, 0.9)");
      core.addColorStop(0.13, "rgba(170, 241, 255, 0.72)");
      core.addColorStop(0.45, "rgba(91, 118, 255, 0.32)");
      core.addColorStop(1, "rgba(86, 58, 230, 0)");
      context.fillStyle = core;
      context.beginPath();
      context.arc(0, 0, galaxyRadius * 0.23, 0, Math.PI * 2);
      context.fill();
      context.restore();
    };

    const drawSpiralArms = () => {
      const centerX = width * 0.5;
      const centerY = height * 0.508;
      const galaxyRadius = width * 0.46;
      const rotation = playbackRef.current.reducedMotion ? -0.08 : elapsed * 0.012 - 0.08;
      const armColors = ["118, 214, 255", "126, 103, 255", "187, 90, 255"];

      context.save();
      context.translate(centerX, centerY);
      context.scale(1, 0.5);
      context.rotate(rotation);
      context.globalCompositeOperation = "screen";

      for (let arm = 0; arm < 3; arm += 1) {
        const armOffset = arm * ((Math.PI * 2) / 3);
        const drawArmPath = (phaseOffset: number) => {
          context.beginPath();
          for (let step = 0; step <= 96; step += 1) {
            const progress = step / 96;
            const radius = galaxyRadius * (0.035 + progress * 0.965);
            const angle = armOffset + phaseOffset + progress * 5.35;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (step === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
          }
        };

        drawArmPath(0);
        context.strokeStyle = `rgba(${armColors[arm]}, 0.13)`;
        context.lineWidth = 12;
        context.shadowColor = `rgba(${armColors[arm]}, 0.46)`;
        context.shadowBlur = 18;
        context.stroke();

        drawArmPath(0.035);
        context.strokeStyle = `rgba(${armColors[arm]}, 0.32)`;
        context.lineWidth = 2.2;
        context.shadowBlur = 9;
        context.stroke();

        drawArmPath(-0.055);
        context.strokeStyle = "rgba(213, 246, 255, 0.28)";
        context.lineWidth = 0.72;
        context.shadowBlur = 4;
        context.stroke();

        drawArmPath(0.085);
        context.globalCompositeOperation = "source-over";
        context.strokeStyle = "rgba(2, 5, 30, 0.52)";
        context.lineWidth = 4.4;
        context.shadowBlur = 0;
        context.stroke();
        context.globalCompositeOperation = "screen";
      }

      context.restore();
    };

    const drawSpiralDust = () => {
      const centerX = width * 0.5;
      const centerY = height * 0.508;
      const radiusX = width * 0.45;
      const radiusY = height * 0.25;
      const rotation = playbackRef.current.reducedMotion ? 0 : elapsed * 0.012;

      context.save();
      context.globalCompositeOperation = "screen";
      for (const dust of galaxyDust) {
        const armAngle = dust.arm * ((Math.PI * 2) / 3);
        const angle = armAngle + dust.radius * 6.4 + dust.angle * 0.18 + rotation;
        const spread = dust.spread * (3 + dust.radius * 14);
        const x = centerX + Math.cos(angle) * dust.radius * radiusX - Math.sin(angle) * spread;
        const y = centerY + Math.sin(angle) * dust.radius * radiusY + Math.cos(angle) * spread * 0.34;
        const edgeFade = Math.max(0.2, 1 - Math.pow(dust.radius, 2) * 0.72);
        const twinkle = playbackRef.current.reducedMotion
          ? 1
          : 0.76 + Math.sin(elapsed * 0.46 + dust.twinkle) * 0.24;

        context.beginPath();
        context.fillStyle = `hsla(${dust.hue}, 96%, ${68 + (1 - dust.radius) * 18}%, ${dust.alpha * edgeFade * twinkle})`;
        const glowingDust = dust.hue < 50 || dust.size > 1.35;
        context.shadowColor = glowingDust
          ? `hsla(${dust.hue}, 100%, 70%, ${dust.alpha * 0.72})`
          : "transparent";
        context.shadowBlur = glowingDust ? dust.size * (3.8 + (1 - dust.radius) * 3.5) : 0;
        context.arc(x, y, dust.size, 0, Math.PI * 2);
        context.fill();

        if (dust.hue < 50 && dust.size > 0.8) {
          const flare = dust.size * 2.8;
          context.beginPath();
          context.strokeStyle = `hsla(${dust.hue}, 100%, 78%, ${dust.alpha * edgeFade * 0.68})`;
          context.lineWidth = 0.6;
          context.moveTo(x - flare, y);
          context.lineTo(x + flare, y);
          context.moveTo(x, y - flare);
          context.lineTo(x, y + flare);
          context.stroke();
        }
      }
      context.restore();
    };

    const drawBlackHoleShadow = () => {
      const centerX = width * 0.5;
      const centerY = height * 0.508;
      const coreRadius = Math.min(width * 0.038, height * 0.145);

      context.save();
      context.translate(centerX, centerY);
      context.scale(1, 0.72);
      context.globalCompositeOperation = "source-over";
      const shadow = context.createRadialGradient(0, 0, 0, 0, 0, coreRadius * 1.24);
      shadow.addColorStop(0, "rgba(0, 0, 4, 1)");
      shadow.addColorStop(0.68, "rgba(0, 1, 12, 0.98)");
      shadow.addColorStop(0.88, "rgba(4, 8, 33, 0.78)");
      shadow.addColorStop(1, "rgba(7, 11, 43, 0)");
      context.fillStyle = shadow;
      context.beginPath();
      context.arc(0, 0, coreRadius * 1.24, 0, Math.PI * 2);
      context.fill();

      context.globalCompositeOperation = "screen";
      const lens = context.createRadialGradient(0, 0, coreRadius * 0.86, 0, 0, coreRadius * 2.3);
      lens.addColorStop(0, "rgba(0, 0, 0, 0)");
      lens.addColorStop(0.045, "rgba(232, 251, 255, 0.9)");
      lens.addColorStop(0.12, "rgba(92, 218, 255, 0.58)");
      lens.addColorStop(0.24, "rgba(86, 103, 255, 0.3)");
      lens.addColorStop(0.54, "rgba(162, 72, 255, 0.1)");
      lens.addColorStop(1, "rgba(89, 56, 255, 0)");
      context.fillStyle = lens;
      context.beginPath();
      context.arc(0, 0, coreRadius * 2.3, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = "rgba(226, 252, 255, 0.86)";
      context.shadowColor = "rgba(82, 213, 255, 0.92)";
      context.shadowBlur = coreRadius * 0.28;
      context.lineWidth = Math.max(1, coreRadius * 0.045);
      context.beginPath();
      context.ellipse(0, 0, coreRadius * 1.48, coreRadius * 0.5, -0.12, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    };

    const draw = (deltaSeconds: number) => {
      context.clearRect(0, 0, width, height);
      elapsed += deltaSeconds;
      drawSatelliteGalaxies();
      drawNebula();
      drawSpiralArms();
      drawSpiralDust();
      context.globalCompositeOperation = "screen";

      for (const particle of particles) {
        if (!playbackRef.current.paused && !playbackRef.current.reducedMotion) {
          particle.x = (particle.x + particle.speed * deltaSeconds) % 1;
          particle.y = (particle.y + particle.drift * deltaSeconds + 1) % 1;
        }

        const swirl = Math.sin(particle.y * 10 + elapsed * 0.24) * width * 0.008;
        const x = particle.x * width + swirl;
        const y = particle.y * height;
        const twinkle = playbackRef.current.reducedMotion
          ? 1
          : 0.78 + Math.sin(elapsed * 0.7 + particle.x * 13) * 0.22;

        context.beginPath();
        context.fillStyle = `hsla(${particle.hue}, 92%, 78%, ${particle.alpha * twinkle})`;
        context.shadowColor = `hsla(${particle.hue}, 100%, 72%, ${particle.alpha * 0.7})`;
        context.shadowBlur = particle.radius * 5;
        context.arc(x, y, particle.radius, 0, Math.PI * 2);
        context.fill();
      }

      drawBlackHoleShadow();

      context.shadowBlur = 0;
      context.globalCompositeOperation = "source-over";
    };

    const resize = () => {
      const bounds = container.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const budget = getGalaxyRenderBudget(width, navigator.hardwareConcurrency || 4);
      frameIntervalMs = budget.frameIntervalMs;
      particles = buildGalaxyParticleSeeds(budget.particleCount);
      galaxyDust = buildGalaxyDustSeeds(budget.dustCount);
      draw(0);
    };

    const animate = (time: number) => {
      if (!running) return;
      if (previousTime && time - previousTime < frameIntervalMs) {
        animationFrame = window.requestAnimationFrame(animate);
        return;
      }
      const deltaSeconds = previousTime ? Math.min((time - previousTime) / 1000, 0.12) : 0;
      previousTime = time;
      draw(deltaSeconds);
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
      draw(0);
    };

    controllerRef.current = { start, stop };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    start();

    return () => {
      observer.disconnect();
      stop();
      controllerRef.current = { start: () => undefined, stop: () => undefined };
    };
  }, []);

  useEffect(() => {
    playbackRef.current = { paused, reducedMotion };
    if (paused || reducedMotion) {
      controllerRef.current.stop();
    } else {
      controllerRef.current.start();
    }
  }, [paused, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="galaxy-particle-layer pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
