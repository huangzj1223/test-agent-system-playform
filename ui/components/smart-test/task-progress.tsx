"use client";

/**
 * 智能测试任务进度面板
 * 展示 4 个阶段的执行状态（Stepper 风格）
 */

import * as React from "react";
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  Search,
  FileEdit,
  Play,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PhaseInfo } from "@/lib/api/smart-tests";

interface TaskProgressProps {
  phases: PhaseInfo[];
  currentPhase: string | null;
}

const PHASE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  exploration: Search,
  testcase_design: FileEdit,
  execution: Play,
  report: FileText,
};

const PHASE_LABELS: Record<string, string> = {
  exploration: "页面探测",
  testcase_design: "用例设计",
  execution: "测试执行",
  report: "报告生成",
};

export function TaskProgressStepper({ phases, currentPhase }: TaskProgressProps) {
  return (
    <div className="flex items-center gap-0">
      {phases.map((phase, idx) => {
        const Icon = PHASE_ICONS[phase.phase] || Circle;
        const isActive = phase.phase === currentPhase;
        const isCompleted = phase.status === "completed";
        const isFailed = phase.status === "failed";

        return (
          <React.Fragment key={phase.phase}>
            {/* 连接线 */}
            {idx > 0 && (
              <div className="flex-1 h-0.5 mx-2">
                <div
                  className={cn(
                    "h-full rounded-full transition-colors duration-500",
                    isCompleted || phase.status === "running"
                      ? "bg-gradient-to-r from-[hsl(var(--chart-1))] to-[hsl(var(--neon-cyan))]"
                      : "bg-muted-foreground/20"
                  )}
                />
              </div>
            )}

            {/* 阶段节点 */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={cn(
                  "relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                  isActive && "border-[hsl(var(--chart-1))] bg-[hsl(var(--chart-1)/0.1)] shadow-[0_0_12px_hsl(var(--chart-1)/0.3)]",
                  isCompleted && "border-[hsl(var(--success))] bg-[hsl(var(--success)/0.1)]",
                  isFailed && "border-destructive bg-destructive/10",
                  !isActive && !isCompleted && !isFailed && "border-muted-foreground/30 bg-background"
                )}
              >
                {isCompleted && (
                  <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" />
                )}
                {isFailed && (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                {isActive && (
                  <Loader2 className="h-5 w-5 text-[hsl(var(--chart-1))] animate-spin" />
                )}
                {!isActive && !isCompleted && !isFailed && (
                  <Icon className="h-4 w-4 text-muted-foreground/50" />
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium whitespace-nowrap transition-colors duration-300",
                  isActive && "text-[hsl(var(--chart-1))]",
                  isCompleted && "text-[hsl(var(--success))]",
                  isFailed && "text-destructive",
                  !isActive && !isCompleted && !isFailed && "text-muted-foreground/50"
                )}
              >
                {PHASE_LABELS[phase.phase] || phase.name || phase.phase}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
