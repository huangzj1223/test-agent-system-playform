"use client";

export function GalaxyWebGLLayer({
  paused,
  reducedMotion,
}: {
  paused: boolean;
  reducedMotion: boolean;
}) {
  const motionDisabled = paused || reducedMotion;

  return (
    <div
      className="galaxy-webgl-layer galaxy-art-layer pointer-events-none absolute inset-0 h-full w-full overflow-hidden"
      data-motion={motionDisabled ? "paused" : "running"}
      aria-hidden="true"
    >
      <div className="galaxy-art-image" />
      <div className="galaxy-art-bloom galaxy-art-bloom-left" />
      <div className="galaxy-art-bloom galaxy-art-bloom-right" />
      <div className="galaxy-art-vignette" />

      <style jsx>{`
        .galaxy-art-layer {
          isolation: isolate;
          opacity: 0.98;
          background: #05091f;
        }

        .galaxy-art-image,
        .galaxy-art-bloom,
        .galaxy-art-vignette {
          position: absolute;
          inset: 0;
        }

        .galaxy-art-image {
          inset: -3%;
          background-image: url('/assets/galaxy-workflow/galaxy-workflow-bg.svg');
          background-position: center;
          background-repeat: no-repeat;
          background-size: cover;
          transform: scale(1.035);
          animation: galaxy-art-drift 22s ease-in-out infinite alternate;
          will-change: transform, filter;
        }

        .galaxy-art-bloom {
          mix-blend-mode: screen;
          filter: blur(44px);
          opacity: 0.22;
          animation: galaxy-art-breathe 8s ease-in-out infinite;
        }

        .galaxy-art-bloom-left {
          background: radial-gradient(ellipse at 34% 52%, rgba(70, 190, 255, 0.28), transparent 54%);
        }

        .galaxy-art-bloom-right {
          background: radial-gradient(ellipse at 69% 61%, rgba(177, 74, 255, 0.22), transparent 52%);
          animation-delay: -3.5s;
        }

        .galaxy-art-vignette {
          background:
            linear-gradient(180deg, rgba(3, 7, 27, 0.12), transparent 20%, transparent 78%, rgba(2, 4, 18, 0.34)),
            radial-gradient(ellipse at center, transparent 54%, rgba(1, 3, 16, 0.42));
        }

        [data-motion='paused'] .galaxy-art-image,
        [data-motion='paused'] .galaxy-art-bloom {
          animation-play-state: paused;
        }

        @keyframes galaxy-art-drift {
          0% { transform: scale(1.035) translate3d(-0.35%, -0.2%, 0); filter: saturate(1.02) brightness(0.98); }
          100% { transform: scale(1.055) translate3d(0.45%, 0.25%, 0); filter: saturate(1.08) brightness(1.03); }
        }

        @keyframes galaxy-art-breathe {
          0%, 100% { opacity: 0.16; transform: scale(0.98); }
          50% { opacity: 0.28; transform: scale(1.035); }
        }

        @media (prefers-reduced-motion: reduce) {
          .galaxy-art-image,
          .galaxy-art-bloom {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
