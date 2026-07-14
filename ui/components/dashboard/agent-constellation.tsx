"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { DashboardAgentStage, DashboardProjectSituation } from "@/lib/api/dashboard";
import { buildAgentStageView } from "@/lib/dashboard/model";
import { cn } from "@/lib/utils";
import { IconFrame, ProductIcon, StatusIcon } from "@/components/icons";
import type { ProductIconKey, ProductStatus } from "@/lib/icons/icon-system";
import {
  buildCarouselTransition,
  buildConstellationViews,
  clipConnector,
} from "@/lib/dashboard/constellation-carousel";

const TRANSITION_DURATION_MS = 850;
const AUTOPLAY_INTERVAL_MS = 5000;

/* ========== 星盘坐标 (7 节点环形分布) ========== */
const positions = [
  { x: 118, y: 80 },
  { x: 330, y: 52 },
  { x: 585, y: 83 },
  { x: 650, y: 220 },
  { x: 495, y: 307 },
  { x: 252, y: 310 },
  { x: 78, y: 224 },
];

const stageIcons: Record<string, ProductIconKey> = {
  requirements: "testCases",
  design: "insights",
  generation: "apiTests",
  execution: "testRuns",
  analysis: "analysis",
  repair: "agents",
  verification: "reports",
};

const statusMap: Record<DashboardAgentStage["status"], ProductStatus> = {
  running: "running",
  attention: "attention",
  ready: "ready",
  idle: "idle",
  unavailable: "unavailable",
};

const statusStyles = {
  running: "border-[hsl(var(--agent-running)/0.38)] bg-[hsl(var(--agent-running)/0.08)] text-[hsl(172_66%_31%)]",
  attention: "border-[hsl(var(--risk-warning)/0.4)] bg-[hsl(var(--risk-warning)/0.09)] text-[hsl(32_72%_38%)]",
  ready: "border-[hsl(var(--loop-complete)/0.42)] bg-[hsl(var(--loop-complete)/0.09)] text-[hsl(82_48%_32%)]",
  idle: "border-border bg-muted/35 text-muted-foreground",
  unavailable: "border-border/70 bg-muted/20 text-muted-foreground",
};

/* ========== 颜色映射 ========== */
const statusColor = (status: string) => {
  switch (status) {
    case "running": return "#0f9f8f";
    case "attention": return "#d58b22";
    case "ready": return "#78a832";
    case "unavailable": return "#94a3b8";
    default: return "#64748b";
  }
};

const markerId = (status: DashboardAgentStage["status"]) => `constellation-arrow-${status}`;

const riskColors: Record<string, string> = {
  blocked: "#f06060",
  attention: "#e0a850",
  healthy: "#8fc050",
  no_data: "#9098c0",
};

const riskLabels: Record<string, string> = {
  blocked: "阻塞",
  attention: "注意",
  healthy: "健康",
  no_data: "无数据",
};

/* ========== 组件 ========== */
export function AgentConstellation({
  stages: _globalStages,
  projects = [],
}: {
  stages: DashboardAgentStage[];
  projects?: DashboardProjectSituation[];
}) {
  const views = useMemo(
    () => buildConstellationViews(_globalStages, projects),
    [_globalStages, projects],
  );
  const [position, setPosition] = useState({ viewIndex: 0, stageIndex: 0 });
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [transition, setTransition] = useState<{
    linkIndex: number;
    nonce: number;
  } | null>(null);
  const interactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const positionRef = useRef(position);

  const currentView = views[position.viewIndex] ?? views[0];
  const currentProject = currentView?.project ?? null;
  const stageViews = useMemo(
    () => buildAgentStageView(currentView?.stages ?? []),
    [currentView],
  );
  const selected = stageViews[position.stageIndex] ?? stageViews[0];
  const playbackPaused = userPaused || hovered || interactionPaused || !pageVisible;

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const cancelTransition = useCallback(() => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    setTransition(null);
  }, []);

  const pauseForInteraction = useCallback(() => {
    setInteractionPaused(true);
    if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
    interactionTimerRef.current = setTimeout(() => setInteractionPaused(false), 8000);
  }, []);

  useEffect(() => () => {
    if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
  }, []);

  useEffect(() => {
    const handleVisibility = () => setPageVisible(document.visibilityState === "visible");
    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    setPosition((current) => ({
      viewIndex: Math.min(current.viewIndex, Math.max(views.length - 1, 0)),
      stageIndex: 0,
    }));
    cancelTransition();
  }, [cancelTransition, views.length]);

  const startTransition = useCallback(() => {
    if (transitionTimerRef.current || views.length === 0 || stageViews.length === 0) return;

    const nextTransition = buildCarouselTransition(
      positionRef.current,
      views.length,
      stageViews.length,
    );
    setTransition({ linkIndex: nextTransition.linkIndex, nonce: Date.now() });
    transitionTimerRef.current = setTimeout(() => {
      positionRef.current = nextTransition.target;
      setPosition(nextTransition.target);
      setTransition(null);
      transitionTimerRef.current = null;
    }, TRANSITION_DURATION_MS);
  }, [stageViews.length, views.length]);

  useEffect(() => {
    if (playbackPaused || views.length === 0 || stageViews.length === 0) return;
    const timer = setInterval(startTransition, AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [playbackPaused, stageViews.length, startTransition, views.length]);

  const selectView = useCallback((viewIndex: number) => {
    const nextPosition = { viewIndex, stageIndex: 0 };
    cancelTransition();
    positionRef.current = nextPosition;
    setPosition(nextPosition);
    pauseForInteraction();
  }, [cancelTransition, pauseForInteraction]);

  const prevProject = useCallback(() => {
    selectView((position.viewIndex - 1 + views.length) % views.length);
  }, [position.viewIndex, selectView, views.length]);

  const nextProject = useCallback(() => {
    selectView((position.viewIndex + 1) % views.length);
  }, [position.viewIndex, selectView, views.length]);

  const selectStage = useCallback((stageIndex: number) => {
    cancelTransition();
    setPosition((current) => {
      const nextPosition = { ...current, stageIndex };
      positionRef.current = nextPosition;
      return nextPosition;
    });
    pauseForInteraction();
  }, [cancelTransition, pauseForInteraction]);

  const centerTitle = currentView?.title ?? "全部项目";
  const centerSub = currentProject
    ? `${riskLabels[currentProject.risk_level] ?? ""} · ${currentProject.test_cases}用例 · ${currentProject.test_runs}次运行`
    : `${stageViews.filter((stage) => stage.status === "running").length} 个阶段运行中`;

  const centerRiskColor = currentProject ? (riskColors[currentProject.risk_level] ?? "#9098c0") : "#9098c0";

  const runningCount = stageViews.filter((s) => s.status === "running").length;
  const attentionCount = stageViews.filter((s) => s.status === "attention").length;

  return (
    <div
      className="constellation-surface relative overflow-hidden rounded-lg pb-5 md:h-[468px]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ---- 顶部标题栏 ---- */}
      <div className="flex items-center justify-between border-b bg-background/72 px-5 py-4 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ProductIcon name="agents" className="h-4 w-4 text-[hsl(var(--agent-running))]" />
            智能体协作星图
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {centerTitle} · {position.viewIndex + 1}/{views.length} · 阶段自动巡航
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* 状态摘要 */}
          <div className="hidden items-center gap-3 text-[11px] sm:flex">
            {runningCount > 0 && (
              <span className="flex items-center gap-1 text-[hsl(var(--agent-running))]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--agent-running))]" />
                {runningCount}运行
              </span>
            )}
            {attentionCount > 0 && (
              <span className="flex items-center gap-1 text-[hsl(var(--risk-warning))]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--risk-warning))]" />
                {attentionCount}关注
              </span>
            )}
            <span className="text-muted-foreground">
              <StatusIcon status="running" />
            </span>
          </div>
          {/* 轮播控制 */}
          {views.length > 1 && (
            <div className="flex items-center gap-1 rounded-lg border bg-background p-1 shadow-sm">
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={prevProject}
                aria-label="上一个星图"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setUserPaused((value) => !value)}
                aria-label={userPaused ? "继续轮播" : "暂停轮播"}
              >
                {userPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              </button>
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={nextProject}
                aria-label="下一个星图"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---- SVG 星图 ---- */}
      <div className="hidden px-4 pt-2 md:block">
        <svg viewBox="0 0 730 360" className="mx-auto h-[270px] w-full max-w-[860px]" role="img" aria-label={`${centerTitle} 智能体协作阶段图`}>
          <defs>
            {(["running", "attention", "ready", "idle", "unavailable"] as const).map((status) => (
              <marker key={status} id={markerId(status)} markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M 0 1 L 9 5 L 0 9 Z" fill={statusColor(status)} />
              </marker>
            ))}
            <filter id="constellation-node-shadow" x="-20%" y="-30%" width="140%" height="170%">
              <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#17213b" floodOpacity="0.12" />
            </filter>
            <filter id="constellation-packet-glow" x="-250%" y="-250%" width="600%" height="600%">
              <feGaussianBlur stdDeviation="3" result="packet-blur" />
              <feMerge>
                <feMergeNode in="packet-blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {positions.map((pos, index) => (
              <clipPath id={`constellation-node-clip-${index}`} key={`node-clip-${index}`}>
                <rect x={pos.x - 75} y={pos.y - 34} width="150" height="68" rx="8" />
              </clipPath>
            ))}
          </defs>
          {/* 背景轨道 */}
          <g className="constellation-orbit">
            <ellipse cx="365" cy="183" rx="285" ry="136" fill="none" stroke="#64748b35" strokeDasharray="2 7" />
            <ellipse cx="365" cy="183" rx="210" ry="98" fill="none" stroke="#64748b20" strokeDasharray="2 10" />
          </g>

          {/* 中心→节点辐线 + 箭头 */}
          {positions.map((pos, i) => {
            const stage = stageViews[i];
            if (!stage) return null;
            const dx = pos.x - 365;
            const dy = pos.y - 183;
            const len = Math.sqrt(dx * dx + dy * dy);
            const ux = dx / len;
            const uy = dy / len;
            const connector = clipConnector({ x: 365, y: 183 }, pos, 75, 34);
            const spokeColor = statusColor(stage.status);
            return (
              <g key={`spoke-${i}`}>
                <line
                  x1={365 + ux * 58} y1={183 + uy * 58}
                  x2={connector.x2} y2={connector.y2}
                  className={cn("constellation-link-subtle", position.stageIndex === i && "constellation-link-selected")}
                  stroke={spokeColor}
                  strokeWidth={position.stageIndex === i ? 1.8 : 1.1}
                  strokeDasharray="4 6"
                  opacity={position.stageIndex === i ? 0.72 : 0.24}
                  markerEnd={`url(#${markerId(stage.status)})`}
                />
              </g>
            );
          })}

          {/* 节点间环形连线 + 箭头 */}
          {positions.map((pos, i) => {
            const next = positions[(i + 1) % positions.length];
            const stage = stageViews[i];
            if (!stage) return null;
            const connector = clipConnector(pos, next, 75, 34);
            const ringColor = statusColor(stage.status);
            const isTransitioning = transition?.linkIndex === i;
            return (
              <g key={`flow-${i}`}>
                <line
                  x1={connector.x1} y1={connector.y1}
                  x2={connector.x2} y2={connector.y2}
                  className={cn("constellation-link-flow", isTransitioning && "constellation-link-active")}
                  stroke={ringColor}
                  strokeWidth={isTransitioning ? 2.4 : 1.35}
                  strokeDasharray="5 7"
                  opacity={isTransitioning ? 1 : 0.46}
                  markerEnd={`url(#${markerId(stage.status)})`}
                />
              </g>
            );
          })}

          {transition && (() => {
            const from = positions[transition.linkIndex];
            const to = positions[(transition.linkIndex + 1) % positions.length];
            const connector = clipConnector(from, to, 75, 34);
            return (
              <circle
                key={transition.nonce}
                r="4.5"
                fill={statusColor(stageViews[transition.linkIndex]?.status ?? "running")}
                className="constellation-data-packet"
                filter="url(#constellation-packet-glow)"
              >
                <animateMotion
                  dur={`${TRANSITION_DURATION_MS}ms`}
                  path={`M ${connector.x1} ${connector.y1} L ${connector.x2} ${connector.y2}`}
                  fill="freeze"
                />
              </circle>
            );
          })()}

          {/* ---- 中心枢纽：项目名称 ---- */}
          {/* 外光晕 */}
          <circle cx="365" cy="183" r="67" fill="hsla(174,55%,42%,0.08)" className="constellation-core-ring" />
          {/* 主圆盘 */}
          <circle cx="365" cy="183" r="50" fill="#ffffff" filter="url(#constellation-node-shadow)" />
          {/* 风险色环 */}
          <circle cx="365" cy="183" r="50" fill="none" stroke={centerRiskColor} strokeWidth="2.5" opacity="0.7" />
          {/* 项目名称 (最多 8 个字) */}
          <text x="365" y="177" textAnchor="middle" fill="#17213b" fontSize="15" fontWeight="700">
            {centerTitle.length > 8 ? centerTitle.slice(0, 7) + "…" : centerTitle}
          </text>
          <text x="365" y="198" textAnchor="middle" fill="#64748b" fontSize="10">
            {centerSub}
          </text>

          {/* ---- 节点卡片 ---- */}
          {stageViews.slice(0, 7).map((stage, i) => {
            const pos = positions[i];
            const sel = position.stageIndex === i;
            const color = statusColor(stage.status);
            return (
              <g
                key={stage.key}
                role="button"
                tabIndex={0}
                aria-label={`${stage.name}，${stage.status_label}`}
                onClick={() => selectStage(i)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") selectStage(i); }}
                className={cn(
                  "constellation-node cursor-pointer outline-none",
                  sel && "constellation-node-active",
                  stage.status === "attention" && "constellation-node-attention",
                )}
              >
                {/* 固定尺寸遥测节点 */}
                <rect
                  x={pos.x - 75} y={pos.y - 34}
                  width="150" height="68" rx="8"
                  fill={sel ? "#f8fbff" : "#ffffff"}
                  stroke={sel ? color : "#cbd5e1"}
                  strokeWidth={sel ? 2 : 1}
                  filter="url(#constellation-node-shadow)"
                />
                <rect x={pos.x - 75} y={pos.y - 25} width="4" height="50" rx="2" fill={color} opacity={sel ? 1 : 0.78} />
                {sel && (
                  <rect
                    x={pos.x - 70}
                    y={pos.y - 34}
                    width="140"
                    height="11"
                    fill={color}
                    opacity="0.1"
                    clipPath={`url(#constellation-node-clip-${i})`}
                    className="constellation-node-scan"
                  />
                )}
                <text x={pos.x - 60} y={pos.y - 20} fill="#94a3b8" fontSize="8" fontWeight="700">
                  {String(i + 1).padStart(2, "0")}
                </text>
                <circle cx={pos.x + 59} cy={pos.y - 21} r="3.5" fill={color} className="constellation-signal-dot" />
                <foreignObject x={pos.x - 60} y={pos.y - 12} width="26" height="26" className="pointer-events-none">
                  <div
                    className="flex h-[26px] w-[26px] items-center justify-center rounded-md"
                    style={{ color, backgroundColor: `${color}18` }}
                  >
                    <ProductIcon name={stageIcons[stage.key] || "agents"} className="h-3.5 w-3.5" />
                  </div>
                </foreignObject>
                <text x={pos.x - 27} y={pos.y + 1} fill="#17213b" fontSize="11" fontWeight="700">
                  {stage.name}
                </text>
                <text x={pos.x - 27} y={pos.y + 18} fill="#64748b" fontSize="9">
                  {stage.data_available ? stage.status_label : "数据待接入"}
                </text>
                <text x={pos.x + 60} y={pos.y + 18} textAnchor="end" fill={color} fontSize="9" fontWeight="700">
                  {stage.value_label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ---- 移动端简化列表 ---- */}
      <div className="grid gap-2 p-3 md:hidden">
        {stageViews.map((stage, index) => (
          <button
            key={stage.key}
            type="button"
            className={cn(
              "flex min-h-14 items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
              statusStyles[stage.status],
              position.stageIndex === index && "ring-2 ring-[hsl(var(--primary)/0.28)] shadow-sm",
            )}
            onClick={() => selectStage(index)}
          >
            <span>
              <span className="block text-sm font-medium text-foreground">{stage.name}</span>
              <span className="mt-0.5 block text-[11px] opacity-80">{stage.description}</span>
            </span>
            <span className="text-xs font-semibold">{stage.value_label}</span>
          </button>
        ))}
      </div>

      {/* ---- 底部详情卡片 ---- */}
      {selected && (
        <div className="m-3 mt-0 flex min-h-[72px] flex-col justify-between gap-3 rounded-lg border bg-background/84 px-4 py-3 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center md:m-4 md:mt-0">
          <div className="flex min-w-0 items-start gap-3">
            <IconFrame variant="status" className={cn("mt-0.5 border", statusStyles[selected.status])}>
              <ProductIcon name={stageIcons[selected.key] || "agents"} className="h-4 w-4" />
            </IconFrame>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-medium text-[hsl(var(--agent-running))]">{centerTitle}</span>
                <span className="text-[10px] text-muted-foreground/50">/</span>
                <span className="text-sm font-semibold text-foreground">{selected.name}</span>
                <StatusIcon status={statusMap[selected.status]} showLabel className="text-[10px]" />
                {selected.issue_count > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[hsl(var(--risk-warning))]">
                    <StatusIcon status="attention" />{selected.issue_count} 个异常
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{selected.description}</p>
            </div>
          </div>
          {selected.href && (
            <Link href={selected.href} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[hsl(var(--primary))] hover:text-foreground">
              查看相关数据 <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* ---- 轮播指示器 ---- */}
      {views.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {views.map((view, index) => (
            <button
              key={view.key}
              type="button"
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                index === position.viewIndex ? "w-5 bg-[hsl(var(--primary))]" : "w-1.5 bg-foreground/20 hover:bg-foreground/35"
              )}
              onClick={() => selectView(index)}
              aria-label={`切换到 ${view.title}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
