import type { SVGProps } from "react";

export const STAGE_HOLOGRAM_ICON_IDS = {
  requirements: "requirement-scan",
  design: "test-blueprint",
  generation: "script-braces",
  execution: "execution-orbit",
  analysis: "result-radiance",
  repair: "repair-reconnect",
  verification: "regression-shield",
} as const;

export type StageHologramKey = keyof typeof STAGE_HOLOGRAM_ICON_IDS;

interface StageHologramIconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  stageKey: string;
}

const sharedStrokeProps = {
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  vectorEffect: "non-scaling-stroke",
} as const;

export function StageHologramIcon({ stageKey, className, ...props }: StageHologramIconProps) {
  const resolvedKey = isStageHologramKey(stageKey) ? stageKey : "requirements";
  const iconId = STAGE_HOLOGRAM_ICON_IDS[resolvedKey];

  return (
    <svg
      {...props}
      className={className}
      viewBox="0 0 32 32"
      role="img"
      aria-label={iconId}
      data-icon-id={iconId}
    >
      <circle className="galaxy-hologram-icon-core" cx="16" cy="16" r="2.1" />
      <g className="galaxy-hologram-icon-primary" strokeWidth="1.65" {...sharedStrokeProps}>
        {renderPrimaryGlyph(resolvedKey)}
      </g>
      <g className="galaxy-hologram-icon-accent" strokeWidth="1.35" {...sharedStrokeProps}>
        {renderAccentGlyph(resolvedKey)}
      </g>
    </svg>
  );
}

function isStageHologramKey(value: string): value is StageHologramKey {
  return value in STAGE_HOLOGRAM_ICON_IDS;
}

function renderPrimaryGlyph(key: StageHologramKey) {
  switch (key) {
    case "requirements":
      return (
        <>
          <path d="M7 11V7h4M21 7h4v4M25 21v4h-4M11 25H7v-4" />
          <path d="M11 9.5h7l3 3v9.5H11z" />
          <path d="M18 9.5v3h3" />
        </>
      );
    case "design":
      return (
        <>
          <rect x="7" y="7" width="18" height="18" rx="2.5" />
          <path d="M12 7v18M20 7v18M7 12h18M7 20h18" opacity="0.7" />
          <circle cx="17" cy="15" r="4.2" />
        </>
      );
    case "generation":
      return (
        <>
          <path d="M12.5 7.5H10c-1.7 0-2.5 1-2.5 2.5v3c0 1.5-.8 2.5-2 3 1.2.5 2 1.5 2 3v3c0 1.5.8 2.5 2.5 2.5h2.5" />
          <path d="M19.5 7.5H22c1.7 0 2.5 1 2.5 2.5v3c0 1.5.8 2.5 2 3-1.2.5-2 1.5-2 3v3c0 1.5-.8 2.5-2.5 2.5h-2.5" />
          <path d="m13.5 19 5-6M13 13.5h.01M19 18.5h.01" />
        </>
      );
    case "execution":
      return (
        <>
          <circle cx="16" cy="16" r="9" strokeDasharray="10 3" />
          <path d="m13 11.5 7 4.5-7 4.5z" />
          <path d="M23.5 8.5 25 8l-.5 1.5" />
        </>
      );
    case "analysis":
      return (
        <>
          <circle cx="14" cy="16" r="3" />
          <path d="M14 7v4M14 21v4M5 16h4M19 16h4M7.6 9.6l2.8 2.8M7.6 22.4l2.8-2.8M17.6 12.4l2.8-2.8M17.6 19.6l2.8 2.8" />
          <path d="M20 8.5 25 13M20 23.5 25 19" />
        </>
      );
    case "repair":
      return (
        <>
          <path d="M19.8 7.1a5.4 5.4 0 0 0-6.6 6.7L6.8 20.2a2.4 2.4 0 0 0 3.4 3.4l6.4-6.4a5.4 5.4 0 0 0 6.7-6.6l-3.2 3.2-2.8-.7-.7-2.8z" />
          <path d="M7 13.5a9.5 9.5 0 0 1 2-3M22.5 20a9.5 9.5 0 0 1-3 2" />
        </>
      );
    case "verification":
      return (
        <>
          <path d="M16 5.8c3 2 5.4 2.5 8 2.8v6.2c0 5.3-3.1 8.9-8 11.4-4.9-2.5-8-6.1-8-11.4V8.6c2.6-.3 5-.8 8-2.8z" />
          <path d="m12 16 2.6 2.6 5.6-6" />
        </>
      );
  }
}

function renderAccentGlyph(key: StageHologramKey) {
  switch (key) {
    case "requirements":
      return <path d="M13 17.2c1.6-1.2 4.4-1.2 6 0M13 20c1.6-1.2 4.4-1.2 6 0" />;
    case "design":
      return <><circle cx="17" cy="15" r="1.3" /><path d="M17 9v2M17 19v2M11 15h2M21 15h2" /></>;
    case "generation":
      return <path d="m16 5 .7 2.1L19 8l-2.3.8L16 11l-.7-2.2L13 8l2.3-.9z" />;
    case "execution":
      return <><circle cx="24.5" cy="11" r="1.1" /><path d="M8.2 21.6a10.5 10.5 0 0 0 4.3 3" /></>;
    case "analysis":
      return <path d="M5.5 25.5 26 5M20.5 5H26v5.5" />;
    case "repair":
      return <><path d="M6.5 12h3l1.6 1.7M20.8 18.3 22.5 20h3" /><circle cx="6" cy="12" r="1" /><circle cx="26" cy="20" r="1" /></>;
    case "verification":
      return <path d="M8.2 5.8A13 13 0 0 1 24.5 6l1.2 2M25.7 8l-3 .2" />;
  }
}
