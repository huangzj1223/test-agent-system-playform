"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Box,
  ChevronLeft,
  ChevronRight,
  Circle,
  Pause,
  Play,
} from "lucide-react";
import type { DashboardAgentStage, DashboardProjectSituation } from "@/lib/api/dashboard";
import { buildAgentStageView } from "@/lib/dashboard/model";
import { cn } from "@/lib/utils";
import { ProductIcon, StatusIcon } from "@/components/icons";
import type { ProductIconKey, ProductStatus } from "@/lib/icons/icon-system";
import {
  GALAXY_CYCLE_DURATION_MS,
  GALAXY_CORE,
  GALAXY_ORBIT_GEOMETRY,
  GALAXY_SPATIAL_CONFIG,
  advanceOrbitRawPhase,
  buildConstellationViews,
  buildOrbitArc,
  computeOrbitNode,
  easeOrbitPhase,
  getFocusedStageIndex,
  getForwardPhaseTarget,
  getStageOrbDiameter,
  getStageVisualLevel,
  shouldAdvanceOrbit,
  type GalaxyViewMode,
} from "@/lib/dashboard/constellation-carousel";
import { GalaxyParticleLayer } from "@/components/dashboard/galaxy-particle-layer";
import { GalaxyWebGLLayer } from "@/components/dashboard/galaxy-webgl-layer";

const STAGE_DURATION_MS = GALAXY_CYCLE_DURATION_MS / 7;
const INTERACTION_PAUSE_MS = 5000;
const GALAXY_VIEWBOX = GALAXY_SPATIAL_CONFIG.viewBox;
const GALAXY_CORE_STYLE = {
  "--galaxy-core-x": `${(GALAXY_CORE.x / GALAXY_VIEWBOX.width) * 100}%`,
  "--galaxy-core-y": `${(GALAXY_CORE.y / GALAXY_VIEWBOX.height) * 100}%`,
  "--galaxy-project-core-size": `${GALAXY_SPATIAL_CONFIG.projectCoreDiameter}px`,
  "--galaxy-foreground-accretion-opacity": `${GALAXY_SPATIAL_CONFIG.foregroundAccretionOpacity}`,
} as CSSProperties;
const STAGE_BOUNDARY_MARGIN = 7;

const stageIcons: Record<string, ProductIconKey> = {
  requirements: "testCases",
  design: "insights",
  generation: "apiTests",
  execution: "testRuns",
  analysis: "analysis",
  repair: "agents",
  verification: "reports",
};

const stageNames: Record<string, string> = {
  requirements: "需求分析",
  design: "测试设计",
  generation: "脚本生成",
  execution: "自动执行",
  analysis: "结果分析",
  repair: "失败修复",
  verification: "回归验证",
};

const stageColors: Record<string, string> = {
  requirements: "#5d8cff",
  design: "#54d982",
  generation: "#39d5c8",
  execution: "#4f86ff",
  analysis: "#ff8a32",
  repair: "#a464ff",
  verification: "#8aca58",
};

const statusMap: Record<DashboardAgentStage["status"], ProductStatus> = {
  running: "running",
  attention: "attention",
  ready: "ready",
  idle: "idle",
  unavailable: "unavailable",
};

const mobileStatusStyles = {
  running: "border-cyan-400/35 bg-cyan-400/10 text-cyan-100",
  attention: "border-amber-400/35 bg-amber-400/10 text-amber-100",
  ready: "border-lime-400/35 bg-lime-400/10 text-lime-100",
  idle: "border-white/12 bg-white/5 text-slate-200",
  unavailable: "border-white/10 bg-white/[0.035] text-slate-400",
};

const riskLabels: Record<string, string> = {
  blocked: "阻塞",
  attention: "注意",
  healthy: "健康",
  no_data: "无数据",
};

export function AgentConstellation({
  stages: globalStages,
  projects = [],
}: {
  stages: DashboardAgentStage[];
  projects?: DashboardProjectSituation[];
}) {
  const views = useMemo(
    () => buildConstellationViews(globalStages, projects),
    [globalStages, projects],
  );
  const [position, setPosition] = useState({ viewIndex: 0, stageIndex: 0 });
  const [viewMode, setViewMode] = useState<GalaxyViewMode>("3d");
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [hoveredStage, setHoveredStage] = useState<number | null>(null);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [backgroundDebug, setBackgroundDebug] = useState(false);

  const animationFrameRef = useRef<number | null>(null);
  const focusAnimationFrameRef = useRef<number | null>(null);
  const interactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rawPhaseRef = useRef(0);
  const phaseRef = useRef(0);
  const focusIndexRef = useRef(0);
  const lastFrameRef = useRef(0);
  const viewModeRef = useRef<GalaxyViewMode>("3d");
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const viewportSizeRef = useRef({ width: 0, height: 0 });
  const stageNodeRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const flowTrackRefs = useRef<Array<SVGPathElement | null>>([]);
  const flowGlowRefs = useRef<Array<SVGPathElement | null>>([]);
  const flowBeamRefs = useRef<Array<SVGPathElement | null>>([]);
  const flowCometRefs = useRef<Array<SVGPathElement | null>>([]);

  const currentView = views[position.viewIndex] ?? views[0];
  const currentProject = currentView?.project ?? null;
  const stageViews = useMemo(
    () => buildAgentStageView(currentView?.stages ?? []).slice(0, 7),
    [currentView],
  );
  const selectedIndex = hoveredStage !== null && !interactionPaused && !userPaused
    ? hoveredStage
    : position.stageIndex;
  const selected = stageViews[selectedIndex] ?? stageViews[0];
  const playbackPaused = !shouldAdvanceOrbit({
    userPaused,
    hovered,
    interactionPaused,
    pageVisible,
    reducedMotion,
  });

  const applyOrbitPhase = useCallback((nextPhase: number) => {
    const count = stageViews.length;
    if (count === 0) return;

    const normalizedPhase = positiveModulo(nextPhase, count);
    const { width, height } = viewportSizeRef.current;
    phaseRef.current = normalizedPhase;

    stageNodeRefs.current.forEach((node, index) => {
      if (!node || index >= count) return;
      const orbit = computeOrbitNode(index, normalizedPhase, count, viewModeRef.current);
      const visualLevel = viewModeRef.current === "3d" ? getStageVisualLevel(orbit.depth) : "middle";
      const targetCoreDiameter = viewModeRef.current === "3d" ? getStageOrbDiameter(orbit.depth) : 40;
      const offsetX = ((orbit.x - GALAXY_ORBIT_GEOMETRY.centerX) / GALAXY_VIEWBOX.width) * width;
      const offsetY = ((orbit.y - GALAXY_ORBIT_GEOMETRY.centerY) / GALAXY_VIEWBOX.height) * height;
      const middleProgress = Math.min(1, Math.max(0, (orbit.depth - 0.32) / 0.16));
      const nearProgress = Math.min(1, Math.max(0, (orbit.depth - 0.68) / 0.14));

      node.style.zIndex = String(orbit.zIndex);
      node.style.opacity = String(orbit.opacity);
      node.style.filter = "none";
      node.style.transform = `translate(-50%, -50%) translate3d(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px, ${Math.round(orbit.depth * 54)}px) scale(${orbit.scale.toFixed(3)})`;
      node.dataset.depth = orbit.depth.toFixed(3);
      node.dataset.visualLevel = visualLevel;
      node.style.setProperty("--stage-depth", orbit.depth.toFixed(3));
      node.style.setProperty("--stage-orb-blur", `${orbit.blur.toFixed(2)}px`);
      node.style.setProperty("--stage-brightness", orbit.brightness.toFixed(2));
      node.style.setProperty("--stage-core-size", `${(targetCoreDiameter / Math.max(0.01, orbit.scale)).toFixed(2)}px`);
      node.style.setProperty("--stage-inverse-scale", (1 / Math.max(0.01, orbit.scale)).toFixed(3));
      node.style.setProperty("--stage-middle-progress", middleProgress.toFixed(3));
      node.style.setProperty("--stage-near-progress", nearProgress.toFixed(3));
    });

    for (let index = 0; index < count; index += 1) {
      const path = buildStageOrbitArc(
        index,
        normalizedPhase,
        count,
        viewModeRef.current,
        width || GALAXY_VIEWBOX.width,
        height || GALAXY_VIEWBOX.height,
      ).path;
      flowTrackRefs.current[index]?.setAttribute("d", path);
      flowGlowRefs.current[index]?.setAttribute("d", path);
      flowBeamRefs.current[index]?.setAttribute("d", path);
      flowCometRefs.current[index]?.setAttribute("d", path);
    }
  }, [stageViews.length]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const debugEnabled = process.env.NODE_ENV !== "production"
      && new URLSearchParams(window.location.search).get("galaxyDebug") === "background";
    setBackgroundDebug(debugEnabled);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateSize = () => {
      const bounds = viewport.getBoundingClientRect();
      viewportSizeRef.current = { width: bounds.width, height: bounds.height };
      applyOrbitPhase(phaseRef.current);
    };

    const observer = new ResizeObserver(updateSize);
    observer.observe(viewport);
    updateSize();
    return () => observer.disconnect();
  }, [applyOrbitPhase]);

  useEffect(() => {
    viewModeRef.current = viewMode;
    applyOrbitPhase(phaseRef.current);
  }, [applyOrbitPhase, viewMode]);

  useEffect(() => {
    const handleVisibility = () => setPageVisible(document.visibilityState === "visible");
    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    if (!userPaused && pageVisible && !reducedMotion) return;
    if (focusAnimationFrameRef.current !== null) {
      cancelAnimationFrame(focusAnimationFrameRef.current);
      focusAnimationFrameRef.current = null;
    }
  }, [pageVisible, reducedMotion, userPaused]);

  useEffect(() => () => {
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    if (focusAnimationFrameRef.current !== null) cancelAnimationFrame(focusAnimationFrameRef.current);
    if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
  }, []);

  useEffect(() => {
    setPosition((current) => ({
      viewIndex: Math.min(current.viewIndex, Math.max(views.length - 1, 0)),
      stageIndex: 0,
    }));
    rawPhaseRef.current = 0;
    phaseRef.current = 0;
    focusIndexRef.current = 0;
    applyOrbitPhase(0);
  }, [applyOrbitPhase, views.length]);

  const pauseForInteraction = useCallback(() => {
    setInteractionPaused(true);
    if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
    interactionTimerRef.current = setTimeout(() => {
      setInteractionPaused(false);
      interactionTimerRef.current = null;
    }, INTERACTION_PAUSE_MS);
  }, []);

  useEffect(() => {
    if (
      playbackPaused
      || stageViews.length === 0
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      lastFrameRef.current = 0;
      return;
    }

    const animate = (time: number) => {
      if (!lastFrameRef.current) lastFrameRef.current = time;
      const delta = Math.min(time - lastFrameRef.current, STAGE_DURATION_MS * 0.72);
      lastFrameRef.current = time;

      const previousRawPhase = rawPhaseRef.current;
      const rawPhase = advanceOrbitRawPhase(
        previousRawPhase,
        delta,
        stageViews.length,
        playbackPaused,
      );
      if (rawPhase < previousRawPhase) {
        if (views.length > 1) {
          setPosition((current) => ({
            viewIndex: (current.viewIndex + 1) % views.length,
            stageIndex: 0,
          }));
        }
      }

      rawPhaseRef.current = rawPhase;
      const nextPhase = easeOrbitPhase(rawPhase);
      applyOrbitPhase(nextPhase);

      const focusIndex = getFocusedStageIndex(nextPhase, stageViews.length);
      if (focusIndex !== focusIndexRef.current) {
        focusIndexRef.current = focusIndex;
        setPosition((current) => ({ ...current, stageIndex: focusIndex }));
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      lastFrameRef.current = 0;
    };
  }, [applyOrbitPhase, playbackPaused, stageViews.length, views.length]);

  const selectView = useCallback((viewIndex: number) => {
    if (focusAnimationFrameRef.current !== null) {
      cancelAnimationFrame(focusAnimationFrameRef.current);
      focusAnimationFrameRef.current = null;
    }
    rawPhaseRef.current = 0;
    phaseRef.current = 0;
    focusIndexRef.current = 0;
    applyOrbitPhase(0);
    setPosition({ viewIndex, stageIndex: 0 });
    pauseForInteraction();
  }, [applyOrbitPhase, pauseForInteraction]);

  const prevProject = useCallback(() => {
    selectView((position.viewIndex - 1 + views.length) % views.length);
  }, [position.viewIndex, selectView, views.length]);

  const nextProject = useCallback(() => {
    selectView((position.viewIndex + 1) % views.length);
  }, [position.viewIndex, selectView, views.length]);

  const selectStage = useCallback((stageIndex: number) => {
    if (stageViews.length === 0) return;
    pauseForInteraction();

    if (focusAnimationFrameRef.current !== null) {
      cancelAnimationFrame(focusAnimationFrameRef.current);
    }

    const startPhase = phaseRef.current;
    const currentFocus = getFocusedStageIndex(startPhase, stageViews.length);
    if (currentFocus === stageIndex) {
      focusIndexRef.current = stageIndex;
      setPosition((current) => ({ ...current, stageIndex }));
      return;
    }

    if (reducedMotion || userPaused || !pageVisible) {
      rawPhaseRef.current = stageIndex;
      focusIndexRef.current = stageIndex;
      applyOrbitPhase(stageIndex);
      setPosition((current) => ({ ...current, stageIndex }));
      return;
    }

    const targetPhase = getForwardPhaseTarget(startPhase, stageIndex, stageViews.length);
    const distance = targetPhase - startPhase;
    const duration = 620 + Math.min(distance, 4) * 190;
    const startedAt = performance.now();

    const focusStage = (time: number) => {
      const progress = Math.min(1, (time - startedAt) / duration);
      const eased = -(Math.cos(Math.PI * progress) - 1) / 2;
      const absolutePhase = startPhase + distance * eased;
      const normalizedPhase = absolutePhase % stageViews.length;

      rawPhaseRef.current = normalizedPhase;
      applyOrbitPhase(normalizedPhase);
      const focusIndex = getFocusedStageIndex(normalizedPhase, stageViews.length);
      if (focusIndex !== focusIndexRef.current) {
        focusIndexRef.current = focusIndex;
        setPosition((current) => ({ ...current, stageIndex: focusIndex }));
      }

      if (progress < 1) {
        focusAnimationFrameRef.current = requestAnimationFrame(focusStage);
        return;
      }

      rawPhaseRef.current = positiveModulo(targetPhase, stageViews.length);
      focusIndexRef.current = stageIndex;
      setPosition((current) => ({ ...current, stageIndex }));
      focusAnimationFrameRef.current = null;
    };

    focusAnimationFrameRef.current = requestAnimationFrame(focusStage);
  }, [applyOrbitPhase, pageVisible, pauseForInteraction, reducedMotion, stageViews.length, userPaused]);

  const centerTitle = currentView?.title ?? "全部项目";
  const centerSub = currentProject
    ? `${riskLabels[currentProject.risk_level] ?? ""} · ${currentProject.test_cases} 用例 · ${currentProject.test_runs} 次运行`
    : "7 个阶段流转中";
  const centerHref = currentProject
    ? `/projects/${currentProject.identifier}`
    : "/projects/spaces";
  const runningCount = stageViews.filter((stage) => stage.status === "running").length;
  const attentionCount = stageViews.filter((stage) => stage.status === "attention").length;

  return (
    <section
      className="constellation-surface galaxy-constellation relative overflow-hidden rounded-lg md:h-[640px]"
      style={GALAXY_CORE_STYLE}
      data-paused={playbackPaused ? "true" : "false"}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-background-debug={backgroundDebug ? "true" : "false"}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setHoveredStage(null);
      }}
    >
      <header className="galaxy-toolbar relative z-[140] flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="galaxy-title-icon flex h-7 w-7 items-center justify-center rounded-md">
              <ProductIcon name="agents" className="h-4 w-4" />
            </span>
            智能体协作星图
          </div>
          <p className="mt-0.5 truncate text-[11px] text-slate-300/80">
            {centerTitle} · 7 阶段自动流转 · {position.viewIndex + 1}/{views.length}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 text-[10px] text-slate-300 lg:flex">
            {runningCount > 0 && <span className="text-cyan-300">{runningCount} 运行</span>}
            {attentionCount > 0 && <span className="text-amber-300">{attentionCount} 关注</span>}
          </div>

          <div className="galaxy-controls flex items-center rounded-md p-0.5">
            {views.length > 1 && (
              <button type="button" onClick={prevProject} aria-label="上一个星图" className="galaxy-control-button">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setUserPaused((value) => !value)}
              aria-label={userPaused ? "继续星图动画" : "暂停星图动画"}
              className="galaxy-control-button"
            >
              {userPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setViewMode((mode) => mode === "3d" ? "2d" : "3d")}
              aria-label={viewMode === "3d" ? "切换为 2D 视图" : "切换为 3D 视图"}
              className="galaxy-view-toggle"
            >
              {viewMode === "3d" ? <Box className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
              <span>{viewMode === "3d" ? "3D" : "2D"}</span>
            </button>
            {views.length > 1 && (
              <button type="button" onClick={nextProject} aria-label="下一个星图" className="galaxy-control-button">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div ref={viewportRef} className="galaxy-viewport relative z-20 hidden h-[474px] md:block">
        <GalaxyParticleLayer paused={playbackPaused} reducedMotion={reducedMotion} />
        <GalaxyWebGLLayer paused={playbackPaused} reducedMotion={reducedMotion} debug={backgroundDebug} />
        <svg
          viewBox={`0 0 ${GALAXY_VIEWBOX.width} ${GALAXY_VIEWBOX.height}`}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
          role="img"
          aria-label={`${centerTitle} 银河质量闭环`}
        >
          <defs>
            <radialGradient id="galaxy-core-glow">
              <stop offset="0%" stopColor="#eef7ff" stopOpacity="0.95" />
              <stop offset="34%" stopColor="#7de5ff" stopOpacity="0.42" />
              <stop offset="72%" stopColor="#5f61ff" stopOpacity="0.13" />
              <stop offset="100%" stopColor="#271f88" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="galaxy-orbit-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#66e6ff" stopOpacity="0.12" />
              <stop offset="48%" stopColor="#7d7bff" stopOpacity="0.72" />
              <stop offset="100%" stopColor="#be6cff" stopOpacity="0.12" />
            </linearGradient>
            <filter id="galaxy-flow-glow" x="-40%" y="-80%" width="180%" height="260%">
              <feGaussianBlur stdDeviation="2.4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <marker
              id="galaxy-arrow-white"
              markerWidth="9"
              markerHeight="9"
              refX="8"
              refY="4.5"
              orient="auto"
              markerUnits="userSpaceOnUse"
              viewBox="0 0 9 9"
            >
              <path d="M 1 1.5 L 8 4.5 L 1 7.5 L 3.2 4.5 Z" fill="#b9eaff" fillOpacity="0.78" />
            </marker>
            {stageViews.map((stage) => (
              <marker
                key={stage.key}
                id={`galaxy-arrow-${stage.key}`}
                markerWidth="11"
                markerHeight="11"
                refX="10"
                refY="5.5"
                orient="auto"
                markerUnits="userSpaceOnUse"
                viewBox="0 0 11 11"
              >
                <path
                  d="M 1 1.5 L 10 5.5 L 1 9.5 L 3.8 5.5 Z"
                  fill={stageColors[stage.key] ?? "#8fe9ff"}
                />
              </marker>
            ))}
          </defs>

          <ellipse cx={GALAXY_CORE.x} cy={GALAXY_CORE.y} rx="324" ry="124" className="galaxy-dust-orbit" />
          <ellipse cx={GALAXY_CORE.x} cy={GALAXY_CORE.y} rx="275" ry="100" className="galaxy-main-orbit" />
          <ellipse cx={GALAXY_CORE.x} cy={GALAXY_CORE.y} rx="212" ry="72" className="galaxy-energy-orbit" />
          <ellipse cx={GALAXY_CORE.x} cy={GALAXY_CORE.y} rx="151" ry="49" className="galaxy-inner-orbit" />
          <ellipse cx={GALAXY_CORE.x} cy={GALAXY_CORE.y} rx="94" ry="59" fill="url(#galaxy-core-glow)" className="galaxy-nebula-breath" />

          {stageViews.map((stage, index) => {
            const viewportWidth = viewportSizeRef.current.width || GALAXY_VIEWBOX.width;
            const viewportHeight = viewportSizeRef.current.height || GALAXY_VIEWBOX.height;
            const arc = buildStageOrbitArc(
              index,
              phaseRef.current,
              stageViews.length,
              viewMode,
              viewportWidth,
              viewportHeight,
            );
            const color = stageColors[stage.key] ?? "#8fe9ff";
            const active = position.stageIndex === index;
            return (
              <g key={`arc-${stage.key}`} data-active={active ? "true" : "false"}>
                <path
                  ref={(node) => { flowTrackRefs.current[index] = node; }}
                  d={arc.path}
                  className="galaxy-flow-track"
                />
                <path
                  ref={(node) => { flowGlowRefs.current[index] = node; }}
                  d={arc.path}
                  className={cn("galaxy-flow-glow", active && "galaxy-flow-glow-active")}
                  style={{ "--flow-color": color } as CSSProperties}
                />
                <path
                  ref={(node) => { flowBeamRefs.current[index] = node; }}
                  d={arc.path}
                  className={cn("galaxy-flow-beam", active && "galaxy-flow-beam-active")}
                  style={{ "--flow-color": color } as CSSProperties}
                  markerEnd={active ? `url(#galaxy-arrow-${stage.key})` : "url(#galaxy-arrow-white)"}
                />
                <path
                  ref={(node) => { flowCometRefs.current[index] = node; }}
                  d={arc.path}
                  pathLength="100"
                  className={cn("galaxy-flow-comet", active && "galaxy-flow-comet-active")}
                  style={{ "--flow-color": color, animationDelay: `${index * -0.37}s` } as CSSProperties}
                />
              </g>
            );
          })}
        </svg>

        <Link href={centerHref} className="galaxy-project-core group" aria-label={`进入${centerTitle}`}>
          <span className="galaxy-gravity-well" aria-hidden="true" />
          <span className="galaxy-lensing-ring" aria-hidden="true" />
          <span className="galaxy-core-depth-halo" aria-hidden="true" />
          <span className="galaxy-core-orbit galaxy-core-orbit-outer" />
          <span className="galaxy-core-accretion-disk" aria-hidden="true" />
          <span className="galaxy-core-orbit galaxy-core-orbit-inner" />
          <span className="galaxy-core-foreground-lens" aria-hidden="true" />
          <span className="galaxy-event-horizon" aria-hidden="true" />
          <span className="galaxy-core-foreground-accretion-band" aria-hidden="true" />
          <span className="galaxy-core-content">
            <span className="text-[9px] font-medium tracking-[0.18em] text-cyan-100/80">协作核心</span>
            <strong className="mt-1 max-w-[92px] truncate text-[15px] text-white">{centerTitle}</strong>
            <span className="mt-1 text-[9px] text-indigo-100/70">{centerSub}</span>
          </span>
        </Link>
        <div className="galaxy-debug-project-cross" aria-hidden="true" />
        <div className="galaxy-debug-orbit-cross" aria-hidden="true" />

        {stageViews.map((stage, index) => {
          const orbit = computeOrbitNode(index, phaseRef.current, stageViews.length, viewMode);
          const visualLevel = viewMode === "3d" ? getStageVisualLevel(orbit.depth) : "middle";
          const targetCoreDiameter = viewMode === "3d" ? getStageOrbDiameter(orbit.depth) : 40;
          const color = stageColors[stage.key] ?? "#8fe9ff";
          const focused = position.stageIndex === index;
          const stageName = stageNames[stage.key] ?? stage.name;
          const viewportWidth = viewportSizeRef.current.width || GALAXY_VIEWBOX.width;
          const viewportHeight = viewportSizeRef.current.height || 300;
          const offsetX = ((orbit.x - GALAXY_ORBIT_GEOMETRY.centerX) / GALAXY_VIEWBOX.width) * viewportWidth;
          const offsetY = ((orbit.y - GALAXY_ORBIT_GEOMETRY.centerY) / GALAXY_VIEWBOX.height) * viewportHeight;
          const middleProgress = Math.min(1, Math.max(0, (orbit.depth - 0.32) / 0.16));
          const nearProgress = Math.min(1, Math.max(0, (orbit.depth - 0.68) / 0.14));
          const style = {
            zIndex: orbit.zIndex,
            opacity: orbit.opacity,
            filter: "none",
            transform: `translate(-50%, -50%) translate3d(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px, ${Math.round(orbit.depth * 54)}px) scale(${orbit.scale.toFixed(3)})`,
            "--stage-color": color,
            "--stage-depth": orbit.depth.toFixed(3),
            "--stage-orb-blur": `${orbit.blur.toFixed(2)}px`,
            "--stage-brightness": orbit.brightness.toFixed(2),
            "--stage-core-size": `${(targetCoreDiameter / Math.max(0.01, orbit.scale)).toFixed(2)}px`,
            "--stage-inverse-scale": (1 / Math.max(0.01, orbit.scale)).toFixed(3),
            "--stage-middle-progress": middleProgress.toFixed(3),
            "--stage-near-progress": nearProgress.toFixed(3),
          } as CSSProperties;

          return (
            <button
              ref={(node) => { stageNodeRefs.current[index] = node; }}
              key={stage.key}
              type="button"
              className={cn("galaxy-stage-node", focused && "galaxy-stage-node-focused")}
              style={style}
              data-visual-level={visualLevel}
              data-depth={orbit.depth.toFixed(3)}
              aria-label={`${String(index + 1).padStart(2, "0")} ${stageName}，${stage.status_label}，${stage.value_label}`}
              onMouseEnter={() => setHoveredStage(index)}
              onMouseLeave={() => setHoveredStage(null)}
              onClick={() => selectStage(index)}
            >
              <span className="galaxy-stage-orb" aria-hidden="true">
                <span className="galaxy-stage-orb-halo" />
                <span className="galaxy-stage-orb-ring galaxy-stage-orb-ring-outer" />
                <span className="galaxy-stage-orb-ring galaxy-stage-orb-ring-inner" />
                <span className="galaxy-stage-orb-core">
                  <span className="galaxy-stage-starflare" />
                  <ProductIcon name={stageIcons[stage.key] || "agents"} className="h-4 w-4" />
                </span>
                <span className="galaxy-stage-orb-caption">
                  <span className="galaxy-stage-caption-heading">
                    <span className="galaxy-stage-number">{String(index + 1).padStart(2, "0")}</span>
                    <strong className="galaxy-stage-name">{stageName}</strong>
                  </span>
                  <span className="galaxy-stage-caption-meta">
                    <span className="galaxy-stage-signal" />
                    <span>{stage.data_available ? stage.status_label : "待接入"}</span>
                    <span className="galaxy-stage-value">{stage.value_label}</span>
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative z-30 grid gap-2 p-3 md:hidden">
        {stageViews.map((stage, index) => {
          const stageName = stageNames[stage.key] ?? stage.name;
          return (
            <button
              key={stage.key}
              type="button"
              className={cn(
                "flex min-h-14 items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
                mobileStatusStyles[stage.status],
                position.stageIndex === index && "ring-2 ring-cyan-300/40",
              )}
              onClick={() => selectStage(index)}
            >
              <span>
                <span className="block text-sm font-medium">{String(index + 1).padStart(2, "0")} {stageName}</span>
                <span className="mt-0.5 block text-[11px] opacity-75">{stage.description}</span>
              </span>
              <span className="text-xs font-semibold">{stage.value_label}</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="galaxy-detail-panel relative z-[130] mx-3 mb-3 grid min-h-[92px] gap-3 px-4 py-3 md:mx-4 md:-mt-1 md:grid-cols-[minmax(190px,0.75fr)_minmax(0,1.6fr)]" data-testid="constellation-stage-detail">
          <div className="flex min-w-0 items-center gap-3 border-b border-indigo-200/15 pb-2 md:border-b-0 md:border-r md:pb-0 md:pr-4">
            <span className="galaxy-detail-icon" style={{ "--stage-color": stageColors[selected.key] ?? "#5d8cff" } as CSSProperties}>
              <ProductIcon name={stageIcons[selected.key] || "agents"} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <span className="text-[9px] font-medium tracking-[0.15em] text-indigo-200/60">当前阶段</span>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <strong className="text-sm text-white">{String(selectedIndex + 1).padStart(2, "0")} {stageNames[selected.key] ?? selected.name}</strong>
                <StatusIcon status={statusMap[selected.status]} showLabel className="text-[9px]" />
              </div>
              <p className="mt-1 truncate text-[10px] text-slate-300/65">阶段 {selectedIndex + 1} / 7 · 负责人：待数据接入</p>
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-[11px] leading-5 text-slate-200/80">{selected.description}</p>
              <div className="mt-1.5 grid grid-cols-3 divide-x divide-indigo-200/15 text-[9px] text-slate-300/55">
                <span className="pr-2"><b className="mr-1 text-sm text-white">{selected.task_count ?? 0}</b>关联任务</span>
                <span className="px-2"><b className={cn("mr-1 text-sm", selected.issue_count > 0 ? "text-rose-300" : "text-white")}>{selected.issue_count ?? 0}</b>风险异常</span>
                <span className="pl-2"><b className="mr-1 text-[11px] text-white">待接入</b>预计完成</span>
              </div>
            </div>
            {selected.href && (
              <Link href={selected.href} className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-indigo-200 hover:text-white">
                阶段详情 <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}

      {views.length > 1 && (
        <div className="absolute bottom-1 left-1/2 z-[145] hidden -translate-x-1/2 gap-1.5 md:flex">
          {views.map((view, index) => (
            <button
              key={view.key}
              type="button"
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                index === position.viewIndex ? "w-5 bg-indigo-500" : "w-1.5 bg-slate-400/40 hover:bg-slate-500/70",
              )}
              onClick={() => selectView(index)}
              aria-label={`切换到 ${view.title}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function buildStageOrbitArc(
  index: number,
  phase: number,
  count: number,
  mode: GalaxyViewMode,
  viewportWidth: number,
  viewportHeight: number,
) {
  const scaleX = viewportWidth / GALAXY_VIEWBOX.width;
  const scaleY = viewportHeight / GALAXY_VIEWBOX.height;
  const nextIndex = (index + 1) % count;
  const from = computeOrbitNode(index, phase, count, mode);
  const to = computeOrbitNode(nextIndex, phase, count, mode);

  return buildOrbitArc(index, phase, count, {
    scaleX,
    scaleY,
    startScreenGap: getStageBoundaryGap(from.depth, from.scale, mode),
    endScreenGap: getStageBoundaryGap(to.depth, to.scale, mode),
  });
}

function getStageBoundaryGap(
  depth: number,
  nodeScale: number,
  mode: GalaxyViewMode,
): number {
  const level = mode === "3d" ? getStageVisualLevel(depth) : "middle";
  const orbitRadius = level === "far" ? 18 : level === "middle" ? 32 : 52;
  return orbitRadius * nodeScale + STAGE_BOUNDARY_MARGIN;
}
