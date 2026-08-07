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
  STAGE_HOLOGRAM_ICON_IDS,
  StageHologramIcon,
} from "@/components/dashboard/stage-hologram-icon";
import {
  GALAXY_MOTION_DIRECTION,
  GALAXY_ORBIT_GEOMETRY,
  GALAXY_SPATIAL_CONFIG,
  advanceOrbitRawPhase,
  buildConstellationViews,
  computeOrbitNode,
  easeOrbitPhase,
  getClockwiseRotationOffset,
  getFocusedStageIndex,
  getStaticHudClearance,
  getStageOrbDiameter,
  getStageVisualLevel,
  type GalaxyViewMode,
} from "@/lib/dashboard/constellation-carousel";
import { GalaxyParticleLayer } from "@/components/dashboard/galaxy-particle-layer";
import {
  GalaxyWebGLLayer,
} from "@/components/dashboard/galaxy-webgl-layer";
import {
  GALAXY_BACKGROUND_OBJECT_POSITION,
  GALAXY_OCCLUSION_CONFIG,
  computeGalaxyLayout,
  getGalaxyCoreOcclusionRatio,
  type GalaxyCoverTransform,
  type GalaxyPoint,
} from "@/lib/dashboard/galaxy-layout";

const GALAXY_VIEWBOX = GALAXY_SPATIAL_CONFIG.viewBox;
const GALAXY_FALLBACK_LAYOUT = computeGalaxyLayout(GALAXY_VIEWBOX);
const GALAXY_BASE_STYLE = {
  "--galaxy-project-core-size": `${GALAXY_SPATIAL_CONFIG.projectCoreDiameter}px`,
  "--galaxy-foreground-accretion-opacity": `${GALAXY_SPATIAL_CONFIG.foregroundAccretionOpacity}`,
  "--galaxy-bg-position-x": `${GALAXY_BACKGROUND_OBJECT_POSITION.x * 100}%`,
  "--galaxy-bg-position-y": `${GALAXY_BACKGROUND_OBJECT_POSITION.y * 100}%`,
  "--galaxy-bg-scale": `${GALAXY_SPATIAL_CONFIG.backgroundScale}`,
  "--galaxy-occlusion-crop-width": `clamp(${GALAXY_OCCLUSION_CONFIG.cropWidth.minPx}px, ${GALAXY_OCCLUSION_CONFIG.cropWidth.preferredVw}vw, ${GALAXY_OCCLUSION_CONFIG.cropWidth.maxPx}px)`,
  "--galaxy-occlusion-feather-start": `${GALAXY_OCCLUSION_CONFIG.featherRange.startPx}px`,
  "--galaxy-occlusion-feather-end": `${GALAXY_OCCLUSION_CONFIG.featherRange.endPx}px`,
  "--galaxy-occlusion-solid-start": `${GALAXY_OCCLUSION_CONFIG.sourceRange.startPx}px`,
  "--galaxy-occlusion-solid-end": `${GALAXY_OCCLUSION_CONFIG.sourceRange.endPx}px`,
  "--galaxy-parallax-x": "0",
  "--galaxy-parallax-y": "0",
} as CSSProperties;

type GalaxyLayerDebugView =
  | "all"
  | "background"
  | "core"
  | "far"
  | "near";

const GALAXY_LAYER_DEBUG_VIEWS = new Set<GalaxyLayerDebugView>([
  "all",
  "background",
  "core",
  "far",
  "near",
]);

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
  const [hoveredStage, setHoveredStage] = useState<number | null>(null);
  const [coreDebug, setCoreDebug] = useState(false);
  const [layerDebug, setLayerDebug] = useState(false);
  const [layoutDebug, setLayoutDebug] = useState(false);
  const [occlusionDebug, setOcclusionDebug] = useState(false);
  const [motionDebug, setMotionDebug] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [layerDebugView, setLayerDebugView] = useState<GalaxyLayerDebugView>("all");
  const [galaxyLayout, setGalaxyLayout] = useState<GalaxyCoverTransform>(GALAXY_FALLBACK_LAYOUT);
  const [debugBackgroundPoint, setDebugBackgroundPoint] = useState<GalaxyPoint | null>(null);
  const [debugProjectPoint, setDebugProjectPoint] = useState<GalaxyPoint | null>(null);
  const [debugOrbitPoint, setDebugOrbitPoint] = useState<GalaxyPoint | null>(null);
  const [debugCoreDiameter, setDebugCoreDiameter] = useState(104);

  const constellationRef = useRef<HTMLElement | null>(null);
  const viewModeRef = useRef<GalaxyViewMode>("3d");
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const projectCoreRef = useRef<HTMLAnchorElement | null>(null);
  const orbitCenterRef = useRef<SVGGElement | null>(null);
  const viewportSizeRef = useRef({ width: 0, height: 0 });
  const stageNodeRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const motionAngleRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const motionOffsetRef = useRef<HTMLSpanElement | null>(null);
  const rawPhaseRef = useRef(0);
  const focusedStageRef = useRef(0);

  const currentView = views[position.viewIndex] ?? views[0];
  const currentProject = currentView?.project ?? null;
  const stageViews = useMemo(
    () => buildAgentStageView(currentView?.stages ?? []).slice(0, 7),
    [currentView],
  );
  const selectedIndex = hoveredStage ?? position.stageIndex;
  const selected = stageViews[selectedIndex] ?? stageViews[0];
  const playbackPaused = userPaused || reducedMotion || !pageVisible;

  const applyOrbitLayout = useCallback((phase: number) => {
    const count = stageViews.length;
    if (count === 0) return;

    const { width, height } = viewportSizeRef.current;
    const focusIndex = getFocusedStageIndex(phase, count);

    stageNodeRefs.current.forEach((node, index) => {
      if (!node || index >= count) return;
      const orbit = computeOrbitNode(index, phase, count, viewModeRef.current);
      const visualLevel = viewModeRef.current === "3d" ? getStageVisualLevel(orbit.depth) : "middle";
      const depthLevel = index === focusIndex
        ? "focus"
        : visualLevel === "far" ? "deep" : visualLevel;
      const targetCoreDiameter = viewModeRef.current === "3d" ? getStageOrbDiameter(orbit.depth) : 40;
      const offsetX = (orbit.x / GALAXY_VIEWBOX.width) * width;
      const offsetY = (orbit.y / GALAXY_VIEWBOX.height) * height;
      const middleProgress = Math.min(1, Math.max(0, (orbit.depth - 0.32) / 0.16));
      const nearProgress = Math.min(1, Math.max(0, (orbit.depth - 0.68) / 0.14));

      node.style.zIndex = String(orbit.zIndex);
      node.style.opacity = String(orbit.opacity);
      node.style.filter = "none";
      node.style.transform = `translate(-50%, -50%) translate3d(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px, ${Math.round(orbit.depth * 54)}px) scale(${orbit.scale.toFixed(3)})`;
      node.classList.toggle("galaxy-stage-node-focused", index === focusIndex);
      node.dataset.depth = orbit.depth.toFixed(3);
      node.dataset.visualLevel = visualLevel;
      node.dataset.depthLevel = depthLevel;
      node.dataset.angle = ((orbit.angle * 180) / Math.PI).toFixed(2);
      node.style.setProperty("--stage-depth", orbit.depth.toFixed(3));
      node.style.setProperty("--stage-orb-blur", `${orbit.blur.toFixed(2)}px`);
      node.style.setProperty("--stage-brightness", orbit.brightness.toFixed(2));
      node.style.setProperty("--stage-core-size", `${(targetCoreDiameter / Math.max(0.01, orbit.scale)).toFixed(2)}px`);
      node.style.setProperty("--stage-inverse-scale", (1 / Math.max(0.01, orbit.scale)).toFixed(3));
      node.style.setProperty("--stage-middle-progress", middleProgress.toFixed(3));
      node.style.setProperty("--stage-near-progress", nearProgress.toFixed(3));
      if (motionAngleRefs.current[index]) {
        motionAngleRefs.current[index]!.textContent = `${String(index + 1).padStart(2, "0")} · ${((orbit.angle * 180) / Math.PI).toFixed(1)}° · ${STAGE_HOLOGRAM_ICON_IDS[stageViews[index].key as keyof typeof STAGE_HOLOGRAM_ICON_IDS] ?? "requirement-scan"}`;
      }
    });

    if (motionOffsetRef.current) {
      motionOffsetRef.current.textContent = `rotationOffset：${getClockwiseRotationOffset(phase, count).toFixed(4)} rad`;
    }
    if (focusedStageRef.current !== focusIndex) {
      focusedStageRef.current = focusIndex;
      setPosition((current) => current.stageIndex === focusIndex
        ? current
        : { ...current, stageIndex: focusIndex });
    }
  }, [stageViews]);

  useEffect(() => {
    const debugEnabled = process.env.NODE_ENV !== "production";
    if (!debugEnabled) return;

    const params = new URLSearchParams(window.location.search);
    const coreEnabled = params.get("galaxyDebug") === "core";
    const layersEnabled = params.get("galaxyDebug") === "layers";
    const layoutEnabled = params.get("galaxyDebug") === "layout";
    const occlusionEnabled = params.get("galaxyDebug") === "occlusion";
    const motionEnabled = params.get("galaxyDebug") === "motion";
    const requestedView = params.get("galaxyLayer") as GalaxyLayerDebugView | null;

    setCoreDebug(coreEnabled);
    setLayerDebug(layersEnabled);
    setLayoutDebug(layoutEnabled);
    setOcclusionDebug(occlusionEnabled);
    setMotionDebug(motionEnabled);
    setLayerDebugView(requestedView && GALAXY_LAYER_DEBUG_VIEWS.has(requestedView) ? requestedView : "all");
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const updateVisibility = () => setPageVisible(document.visibilityState === "visible");
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateSize = () => {
      const bounds = viewport.getBoundingClientRect();
      viewportSizeRef.current = { width: bounds.width, height: bounds.height };
      setGalaxyLayout(computeGalaxyLayout({ width: bounds.width, height: bounds.height }));
      applyOrbitLayout(easeOrbitPhase(rawPhaseRef.current));
    };

    const observer = new ResizeObserver(updateSize);
    observer.observe(viewport);
    updateSize();
    return () => observer.disconnect();
  }, [applyOrbitLayout]);

  useEffect(() => {
    const count = stageViews.length;
    if (count === 0) return;

    applyOrbitLayout(easeOrbitPhase(rawPhaseRef.current));
    if (playbackPaused) return;

    let frameId = 0;
    let previousTime: number | null = null;
    const animate = (timestamp: number) => {
      if (previousTime === null) previousTime = timestamp;
      const deltaMs = Math.min(64, Math.max(0, timestamp - previousTime));
      previousTime = timestamp;
      rawPhaseRef.current = advanceOrbitRawPhase(rawPhaseRef.current, deltaMs, count, false);
      applyOrbitLayout(easeOrbitPhase(rawPhaseRef.current));
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [applyOrbitLayout, playbackPaused, stageViews.length]);

  useEffect(() => {
    if (!coreDebug && !layoutDebug && !occlusionDebug) return;

    const frame = requestAnimationFrame(() => {
      const constellation = constellationRef.current?.getBoundingClientRect();
      const background = constellationRef.current
        ?.querySelector<HTMLElement>(".galaxy-debug-background-cross")
        ?.getBoundingClientRect();
      const project = projectCoreRef.current?.getBoundingClientRect();
      const coreBody = projectCoreRef.current
        ?.querySelector<HTMLElement>(".galaxy-core-content")
        ?.getBoundingClientRect();
      const orbitElement = orbitCenterRef.current;
      const orbitMatrix = orbitElement?.getScreenCTM();
      const orbitOrigin = orbitElement?.ownerSVGElement?.createSVGPoint();
      if (!constellation || !background || !project || !orbitMatrix || !orbitOrigin) return;
      orbitOrigin.x = 0;
      orbitOrigin.y = 0;
      const orbit = orbitOrigin.matrixTransform(orbitMatrix);

      setDebugBackgroundPoint({
        x: background.left + background.width / 2 - constellation.left,
        y: background.top + background.height / 2 - constellation.top,
      });
      setDebugProjectPoint({
        x: project.left + project.width / 2 - constellation.left,
        y: project.top + project.height / 2 - constellation.top,
      });
      setDebugOrbitPoint({
        x: orbit.x - constellation.left,
        y: orbit.y - constellation.top,
      });
      if (coreBody) setDebugCoreDiameter(coreBody.width);
    });

    return () => cancelAnimationFrame(frame);
  }, [coreDebug, galaxyLayout, layoutDebug, occlusionDebug]);

  useEffect(() => {
    viewModeRef.current = viewMode;
    applyOrbitLayout(easeOrbitPhase(rawPhaseRef.current));
  }, [applyOrbitLayout, viewMode]);

  useEffect(() => {
    setPosition((current) => ({
      viewIndex: Math.min(current.viewIndex, Math.max(views.length - 1, 0)),
      stageIndex: 0,
    }));
    rawPhaseRef.current = 0;
    focusedStageRef.current = 0;
    applyOrbitLayout(0);
  }, [applyOrbitLayout, views.length]);

  const selectView = useCallback((viewIndex: number) => {
    rawPhaseRef.current = 0;
    focusedStageRef.current = 0;
    applyOrbitLayout(0);
    setPosition({ viewIndex, stageIndex: 0 });
  }, [applyOrbitLayout]);

  const prevProject = useCallback(() => {
    selectView((position.viewIndex - 1 + views.length) % views.length);
  }, [position.viewIndex, selectView, views.length]);

  const nextProject = useCallback(() => {
    selectView((position.viewIndex + 1) % views.length);
  }, [position.viewIndex, selectView, views.length]);

  const selectStage = useCallback((stageIndex: number) => {
    if (stageViews.length === 0) return;
    setPosition((current) => ({ ...current, stageIndex }));
  }, [stageViews.length]);

  const centerTitle = currentView?.title ?? "全部项目";
  const centerSub = currentProject
    ? `${riskLabels[currentProject.risk_level] ?? ""} · ${currentProject.test_cases} 用例 · ${currentProject.test_runs} 次运行`
    : "7 个阶段流转中";
  const centerHref = currentProject
    ? `/projects/${currentProject.identifier}`
    : "/projects/spaces";
  const runningCount = stageViews.filter((stage) => stage.status === "running").length;
  const attentionCount = stageViews.filter((stage) => stage.status === "attention").length;
  const viewportWidth = viewportSizeRef.current.width || GALAXY_VIEWBOX.width;
  const viewportHeight = viewportSizeRef.current.height || GALAXY_VIEWBOX.height;
  const orbitTransform = `translate(${galaxyLayout.focalX} ${galaxyLayout.focalY}) scale(${viewportWidth / GALAXY_VIEWBOX.width} ${viewportHeight / GALAXY_VIEWBOX.height})`;
  const projectPoint = debugProjectPoint ?? { x: galaxyLayout.focalX, y: galaxyLayout.focalY };
  const orbitPoint = debugOrbitPoint ?? { x: galaxyLayout.focalX, y: galaxyLayout.focalY };
  const backgroundPoint = debugBackgroundPoint
    ?? { x: galaxyLayout.focalX, y: galaxyLayout.focalY };
  const projectError = pointDistance(backgroundPoint, projectPoint);
  const orbitError = pointDistance(backgroundPoint, orbitPoint);
  const minHudClearance = getStaticHudClearance(viewportHeight, galaxyLayout.focalY);
  const occlusionRatio = getGalaxyCoreOcclusionRatio(debugCoreDiameter);

  return (
    <section
      ref={constellationRef}
      className="constellation-surface galaxy-constellation relative overflow-hidden rounded-lg md:h-[640px]"
      style={{
        ...GALAXY_BASE_STYLE,
        "--galaxy-core-x": `${galaxyLayout.focalX}px`,
        "--galaxy-core-y": `${galaxyLayout.focalY}px`,
      } as CSSProperties}
      data-paused="true"
      data-motion-paused={playbackPaused ? "true" : "false"}
      data-motion-direction={GALAXY_MOTION_DIRECTION}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-core-debug={coreDebug ? "true" : "false"}
      data-layout-debug={layoutDebug ? "true" : "false"}
      data-occlusion-debug={occlusionDebug ? "true" : "false"}
      data-layer-debug={layerDebug ? "true" : "false"}
      data-layer-debug-view={layerDebugView}
      onMouseLeave={() => setHoveredStage(null)}
    >
      <GalaxyWebGLLayer paused reducedMotion debug={coreDebug || layoutDebug || occlusionDebug} />
      <div className="galaxy-top-readability" aria-hidden="true" />

      {coreDebug && (
        <output className="galaxy-core-debug-panel" data-testid="galaxy-core-debug-panel">
          <span>银河黑洞中心：({backgroundPoint.x.toFixed(2)}, {backgroundPoint.y.toFixed(2)}) px</span>
          <span>项目核心中心：({projectPoint.x.toFixed(2)}, {projectPoint.y.toFixed(2)}) px</span>
          <span>轨道中心：({orbitPoint.x.toFixed(2)}, {orbitPoint.y.toFixed(2)}) px</span>
          <strong>项目误差：{projectError.toFixed(2)} px</strong>
          <strong>轨道误差：{orbitError.toFixed(2)} px</strong>
        </output>
      )}

      {layoutDebug && (
        <output className="galaxy-layout-debug-panel" data-testid="galaxy-layout-debug-panel">
          <strong>Phase 2 静态构图</strong>
          <span>中心：({galaxyLayout.focalX.toFixed(2)}, {galaxyLayout.focalY.toFixed(2)}) px</span>
          <span>轨道：{GALAXY_ORBIT_GEOMETRY.radiusX} × {GALAXY_ORBIT_GEOMETRY.radiusY}</span>
          <span>当前 phase：{easeOrbitPhase(rawPhaseRef.current).toFixed(2)}</span>
          <span>HUD 最小距离：{minHudClearance.toFixed(2)} px</span>
        </output>
      )}

      {motionDebug && (
        <output className="galaxy-motion-debug-panel" data-testid="galaxy-motion-debug-panel">
          <strong>轨道运动调试</strong>
          <span>方向：{GALAXY_MOTION_DIRECTION}</span>
          <span ref={motionOffsetRef}>rotationOffset：0.0000 rad</span>
          <span>当前焦点：{String(position.stageIndex + 1).padStart(2, "0")}</span>
          <span>下一阶段：{String(((position.stageIndex + 1) % Math.max(1, stageViews.length)) + 1).padStart(2, "0")}</span>
          <span>图标保持正向：true</span>
          <span className="galaxy-motion-debug-angles">
            {stageViews.map((stage, index) => (
              <span
                key={`motion-${stage.key}`}
                ref={(node) => { motionAngleRefs.current[index] = node; }}
              >
                {String(index + 1).padStart(2, "0")} · {STAGE_HOLOGRAM_ICON_IDS[stage.key as keyof typeof STAGE_HOLOGRAM_ICON_IDS] ?? "requirement-scan"}
              </span>
            ))}
          </span>
        </output>
      )}

      {occlusionDebug && (
        <output className="galaxy-occlusion-debug-panel" data-testid="galaxy-occlusion-debug-panel">
          <strong>核心同源遮挡调试</strong>
          <span>统一中心：({galaxyLayout.focalX.toFixed(2)}, {galaxyLayout.focalY.toFixed(2)}) px</span>
          <span>核心直径：{debugCoreDiameter.toFixed(2)} px</span>
          <span>实质遮挡：{GALAXY_OCCLUSION_CONFIG.sourceRange.startPx}–{GALAXY_OCCLUSION_CONFIG.sourceRange.endPx} px</span>
          <span>遮挡高度：{GALAXY_OCCLUSION_CONFIG.sourceRange.endPx - GALAXY_OCCLUSION_CONFIG.sourceRange.startPx} px</span>
          <span>遮挡比例：{(occlusionRatio * 100).toFixed(1)}%</span>
          <span>层级：主体 {GALAXY_OCCLUSION_CONFIG.zIndex.coreBody} / 裁切 {GALAXY_OCCLUSION_CONFIG.zIndex.foregroundCrop} / 文字 {GALAXY_OCCLUSION_CONFIG.zIndex.coreText}</span>
          <span>中心误差：项目 {projectError.toFixed(2)} px / 轨道 {orbitError.toFixed(2)} px</span>
        </output>
      )}

      <header className="galaxy-toolbar flex items-start justify-end gap-3">
        <div className="galaxy-control-hud flex shrink-0 items-center gap-2">
          {(runningCount > 0 || attentionCount > 0) && (
            <div className="galaxy-control-status hidden items-center gap-2 text-[10px] text-slate-300 lg:flex">
              {runningCount > 0 && <span className="text-cyan-300">{runningCount} 运行</span>}
              {attentionCount > 0 && <span className="text-amber-300">{attentionCount} 关注</span>}
            </div>
          )}

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

      <div ref={viewportRef} className="galaxy-viewport absolute inset-0 z-20 hidden h-full md:block">
        <GalaxyParticleLayer paused reducedMotion />
        <svg
          viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}
          preserveAspectRatio="none"
          className="galaxy-orbit-layer pointer-events-none absolute inset-0 h-full w-full"
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
          </defs>

          <g transform={orbitTransform}>
            <ellipse cx="0" cy="0" rx="275" ry="100" className="galaxy-main-orbit" />
            <ellipse cx="0" cy="0" rx="94" ry="59" fill="url(#galaxy-core-glow)" className="galaxy-nebula-breath" />
            <g className="galaxy-layout-debug-anchors">
              {stageViews.map((stage, index) => {
                const anchor = computeOrbitNode(index, easeOrbitPhase(rawPhaseRef.current), stageViews.length, "3d");
                return <circle key={`anchor-${stage.key}`} cx={anchor.x} cy={anchor.y} r="3.5" />;
              })}
            </g>
          </g>
          <g
            ref={orbitCenterRef}
            className="galaxy-debug-orbit-cross-svg"
            transform={`translate(${galaxyLayout.focalX} ${galaxyLayout.focalY})`}
          >
            <line x1="-92" y1="0" x2="92" y2="0" />
            <line x1="0" y1="-92" x2="0" y2="92" />
            <circle cx="0" cy="0" r="52" />
          </g>
        </svg>

        <Link ref={projectCoreRef} href={centerHref} className="galaxy-project-core group" aria-label={`进入${centerTitle}`}>
          <span className="galaxy-lensing-ring" aria-hidden="true" />
          <span className="galaxy-core-orbit galaxy-core-orbit-outer" />
          <span className="galaxy-core-content" aria-hidden="true" />
        </Link>
        <div className="galaxy-accretion-foreground" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="galaxy-shared-art-image galaxy-accretion-foreground-image"
            src="/assets/galaxy-workflow/galaxy-background-main.png"
            alt=""
            draggable={false}
          />
        </div>
        <div className="galaxy-core-text" aria-hidden="true">
          <span className="text-[9px] font-medium tracking-[0.18em] text-cyan-100/80">协作核心</span>
          <strong className="mt-1 max-w-[76px] truncate text-[15px] text-white">{centerTitle}</strong>
          <span className="mt-1 text-[9px] text-indigo-100/70">{centerSub}</span>
        </div>
        <div className="galaxy-occlusion-debug-core-boundary" aria-hidden="true" />
        <div className="galaxy-occlusion-debug-mask-boundary" aria-hidden="true" />
        <div className="galaxy-debug-project-cross" aria-hidden="true" />

        {stageViews.map((stage, index) => {
          const currentPhase = easeOrbitPhase(rawPhaseRef.current);
          const orbit = computeOrbitNode(index, currentPhase, stageViews.length, viewMode);
          const visualLevel = viewMode === "3d" ? getStageVisualLevel(orbit.depth) : "middle";
          const focused = index === getFocusedStageIndex(currentPhase, stageViews.length);
          const depthLevel = focused ? "focus" : visualLevel === "far" ? "deep" : visualLevel;
          const targetCoreDiameter = viewMode === "3d" ? getStageOrbDiameter(orbit.depth) : 40;
          const color = stageColors[stage.key] ?? "#8fe9ff";
          const stageName = stageNames[stage.key] ?? stage.name;
          const viewportWidth = viewportSizeRef.current.width || GALAXY_VIEWBOX.width;
          const viewportHeight = viewportSizeRef.current.height || 300;
          const offsetX = (orbit.x / GALAXY_VIEWBOX.width) * viewportWidth;
          const offsetY = (orbit.y / GALAXY_VIEWBOX.height) * viewportHeight;
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
              data-depth-level={depthLevel}
              data-stage-icon={STAGE_HOLOGRAM_ICON_IDS[stage.key as keyof typeof STAGE_HOLOGRAM_ICON_IDS] ?? "requirement-scan"}
              data-depth={orbit.depth.toFixed(3)}
              data-angle={((orbit.angle * 180) / Math.PI).toFixed(2)}
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
                  <StageHologramIcon stageKey={stage.key} className="galaxy-hologram-icon" />
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
              <span className="galaxy-layout-debug-node-meta" aria-hidden="true">
                θ {((orbit.angle * 180) / Math.PI).toFixed(1)}° · d {orbit.depth.toFixed(2)} · s {orbit.scale.toFixed(2)} · z {orbit.zIndex}
              </span>
            </button>
          );
        })}
        <div className="galaxy-layout-debug-safe-zone" aria-hidden="true">
          HUD 安全区 · 最小距离 {minHudClearance.toFixed(1)}px
        </div>
      </div>

      <div className="relative z-30 grid gap-2 p-3 pt-[88px] md:hidden">
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
        <div
          className="galaxy-detail-panel relative z-[130] mx-3 mb-3 grid gap-3 px-4 py-3 md:absolute md:inset-x-4 md:bottom-[14px] md:mx-0 md:mb-0 md:h-[82px] md:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.35fr)_minmax(118px,0.35fr)] md:items-center md:px-4 md:py-2"
          data-testid="constellation-stage-detail"
          style={{ "--stage-color": stageColors[selected.key] ?? "#5d8cff" } as CSSProperties}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="galaxy-detail-icon" style={{ "--stage-color": stageColors[selected.key] ?? "#5d8cff" } as CSSProperties}>
              <ProductIcon name={stageIcons[selected.key] || "agents"} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-[15px] leading-none text-white">{String(selectedIndex + 1).padStart(2, "0")} {stageNames[selected.key] ?? selected.name}</strong>
                <StatusIcon status={statusMap[selected.status]} showLabel className="text-[10px]" />
              </div>
              <p className="mt-2 truncate text-[11px] text-slate-300/78">阶段 {selectedIndex + 1} / 7 · 负责人：待数据接入</p>
            </div>
          </div>

          <div className="galaxy-detail-metrics grid min-w-0 grid-cols-3 gap-4 md:gap-5">
            <span className="galaxy-detail-metric">
              <span>关联任务</span>
              <b>{selected.task_count ?? 0}</b>
            </span>
            <span className="galaxy-detail-metric">
              <span>风险异常</span>
              <b className={cn(selected.issue_count > 0 ? "text-orange-300" : "text-white")}>{selected.issue_count ?? 0}</b>
            </span>
            <span className="galaxy-detail-metric">
              <span>预计完成</span>
              <b className="text-[13px]">待接入</b>
            </span>
          </div>

          <div className="flex min-w-0 items-center justify-between gap-3 md:justify-end">
            <p className="line-clamp-1 text-[11px] leading-5 text-slate-300/70 md:hidden">{selected.description}</p>
            {selected.href && (
              <Link href={selected.href} className="galaxy-detail-action">
                阶段详情 <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}

      {views.length > 1 && (
        <div className="galaxy-view-pagination absolute bottom-1 left-1/2 z-[145] hidden -translate-x-1/2 gap-1.5 md:flex">
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

function pointDistance(first: GalaxyPoint, second: GalaxyPoint): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}
