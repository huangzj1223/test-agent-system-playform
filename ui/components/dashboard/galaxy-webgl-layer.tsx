"use client";

import { useEffect, useRef } from "react";

export function GalaxyWebGLLayer({
  paused,
  reducedMotion,
  debug = false,
}: {
  paused: boolean;
  reducedMotion: boolean;
  debug?: boolean;
}) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const motionDisabled = paused || reducedMotion;

  useEffect(() => {
    const layer = layerRef.current;
    const host = layer?.parentElement;
    if (!layer || !host) return;

    let frame = 0;
    const resetParallax = () => {
      host.style.setProperty("--galaxy-parallax-x", "0");
      host.style.setProperty("--galaxy-parallax-y", "0");
    };
    const onPointerMove = (event: PointerEvent) => {
      if (motionDisabled) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = host.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / Math.max(1, bounds.width) - 0.5) * 2;
        const y = ((event.clientY - bounds.top) / Math.max(1, bounds.height) - 0.5) * 2;
        host.style.setProperty("--galaxy-parallax-x", Math.max(-1, Math.min(1, x)).toFixed(3));
        host.style.setProperty("--galaxy-parallax-y", Math.max(-1, Math.min(1, y)).toFixed(3));
      });
    };

    if (!motionDisabled) {
      host.addEventListener("pointermove", onPointerMove);
      host.addEventListener("pointerleave", resetParallax);
    }
    if (motionDisabled) resetParallax();

    return () => {
      if (!motionDisabled) {
        host.removeEventListener("pointermove", onPointerMove);
        host.removeEventListener("pointerleave", resetParallax);
      }
      cancelAnimationFrame(frame);
    };
  }, [motionDisabled]);

  return (
    <div
      ref={layerRef}
      className="galaxy-webgl-layer galaxy-art-layer pointer-events-none absolute inset-0 h-full w-full overflow-hidden"
      data-motion={motionDisabled ? "paused" : "running"}
      data-debug={debug ? "true" : "false"}
      aria-hidden="true"
    >
      <div className="galaxy-rear-stars" />
      <div className="galaxy-background-image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="galaxy-shared-art-image galaxy-art-image"
          src="/assets/galaxy-workflow/galaxy-background-main.png"
          alt=""
          draggable={false}
        />
      </div>
      <div className="galaxy-art-soft-light" />
      <div className="galaxy-foreground-nebula" />
      <div className="galaxy-art-readability-mask" />
      <div className="galaxy-debug-background-cross" />

      <style jsx>{`
        .galaxy-art-layer {
          isolation: isolate;
          opacity: 1;
          background: #05091f;
        }

        .galaxy-rear-stars,
        .galaxy-background-image,
        .galaxy-art-soft-light,
        .galaxy-foreground-nebula,
        .galaxy-art-readability-mask,
        .galaxy-debug-background-cross {
          position: absolute;
          inset: 0;
        }

        .galaxy-rear-stars {
          z-index: 0;
          background-image:
            radial-gradient(circle at 9% 18%, rgba(170, 220, 255, 0.42) 0 1px, transparent 1.5px),
            radial-gradient(circle at 24% 76%, rgba(146, 165, 255, 0.34) 0 1px, transparent 1.5px),
            radial-gradient(circle at 72% 21%, rgba(189, 205, 255, 0.34) 0 1px, transparent 1.5px),
            radial-gradient(circle at 91% 68%, rgba(158, 135, 255, 0.32) 0 1px, transparent 1.5px);
          opacity: 0.18;
          transform: translate3d(
            calc(var(--galaxy-parallax-x) * 1.5px),
            calc(var(--galaxy-parallax-y) * 1.5px),
            0
          );
          transition: transform 240ms ease-out;
        }

        .galaxy-background-image {
          z-index: 1;
          overflow: hidden;
        }

        .galaxy-art-image {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: var(--galaxy-bg-position-x) var(--galaxy-bg-position-y);
          filter: saturate(1.02) brightness(1.02);
          transform: scale(var(--galaxy-bg-scale));
          transform-origin: var(--galaxy-core-x) var(--galaxy-core-y);
          transition: transform 260ms ease-out, object-position 180ms ease-out;
          user-select: none;
        }

        .galaxy-art-soft-light {
          z-index: 2;
          background:
            radial-gradient(
              ellipse at var(--galaxy-core-x) var(--galaxy-core-y),
              rgba(121, 105, 255, 0.14),
              transparent 36%
            ),
            radial-gradient(ellipse at 50% 76%, rgba(49, 116, 255, 0.07), transparent 52%);
          mix-blend-mode: screen;
          opacity: 0.62;
        }

        .galaxy-foreground-nebula {
          z-index: 3;
          background:
            radial-gradient(ellipse at 4% 108%, rgba(91, 61, 255, 0.32), transparent 38%),
            radial-gradient(ellipse at 98% 108%, rgba(111, 72, 255, 0.3), transparent 37%);
          filter: blur(12px);
          opacity: 0.17;
          transform: translate3d(
            calc(var(--galaxy-parallax-x) * 3px),
            calc(var(--galaxy-parallax-y) * 3px),
            0
          );
          transition: transform 220ms ease-out;
        }

        .galaxy-art-readability-mask {
          z-index: 4;
          background:
            radial-gradient(
              ellipse 43% 31% at var(--galaxy-core-x) var(--galaxy-core-y),
              transparent 0 34%,
              rgba(4, 8, 31, 0.07) 58%,
              rgba(4, 8, 31, 0.09) 71%,
              transparent 88%
            ),
            linear-gradient(90deg, rgba(3, 7, 29, 0.08), transparent 18% 82%, rgba(3, 7, 29, 0.08)),
            linear-gradient(180deg, transparent 48%, rgba(5, 8, 31, 0.08));
        }

        .galaxy-debug-background-cross {
          z-index: 6;
          display: none;
          inset: auto;
          left: var(--galaxy-core-x);
          top: var(--galaxy-core-y);
          width: 108px;
          height: 108px;
          border: 1px solid rgba(255, 72, 72, 0.95);
          border-radius: 999px;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 14px rgba(255, 72, 72, 0.56);
        }

        .galaxy-debug-background-cross::before,
        .galaxy-debug-background-cross::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          background: rgb(255 72 72 / 0.98);
          transform: translate(-50%, -50%);
        }

        .galaxy-debug-background-cross::before {
          width: 240px;
          height: 1px;
        }

        .galaxy-debug-background-cross::after {
          width: 1px;
          height: 240px;
        }

        .galaxy-art-layer[data-debug='true'] .galaxy-debug-background-cross {
          display: block;
        }

        .galaxy-art-layer[data-debug='true'] .galaxy-art-image,
        .galaxy-art-layer[data-motion='paused'] .galaxy-art-image,
        .galaxy-art-layer[data-motion='paused'] .galaxy-rear-stars,
        .galaxy-art-layer[data-motion='paused'] .galaxy-foreground-nebula {
          transition: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .galaxy-art-image,
          .galaxy-rear-stars,
          .galaxy-foreground-nebula {
            transform: scale(var(--galaxy-bg-scale));
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
