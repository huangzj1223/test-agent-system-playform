import { Circle } from "lucide-react";
import type { Priority, TestCaseState } from "@/lib/api/types";
import { priorityTones, testCaseStateStatus } from "@/lib/icons/icon-system";
import { StatusIcon } from "./status-icon";
import { cn } from "@/lib/utils";

const stateLabels: Record<TestCaseState, string> = {
  new: "新建",
  review_pending: "待评审",
  reviewed: "已评审",
  not_run: "未执行",
  passed: "通过",
  failed: "失败",
  blocked: "阻塞",
  skipped: "跳过",
};

const priorityLabels: Record<Priority, string> = { critical: "紧急", high: "高", medium: "中", low: "低" };
const priorityClasses: Record<Priority, string> = {
  critical: "text-[hsl(var(--risk-blocked))] fill-[hsl(var(--risk-blocked))]",
  high: "text-[hsl(var(--priority-high))] fill-[hsl(var(--priority-high))]",
  medium: "text-[hsl(var(--risk-warning))] fill-[hsl(var(--risk-warning))]",
  low: "text-[hsl(var(--loop-complete))] fill-[hsl(var(--loop-complete))]",
};

export function TestCaseStateIndicator({ state, showLabel = true }: { state: TestCaseState; showLabel?: boolean }) {
  return <span className="inline-flex items-center gap-1.5"><StatusIcon status={testCaseStateStatus[state]} />{showLabel && <span>{stateLabels[state]}</span>}</span>;
}

export function PriorityIndicator({ priority, showLabel = true, className }: { priority: Priority; showLabel?: boolean; className?: string }) {
  const tone = priorityTones[priority];
  return <span className={cn("inline-flex items-center gap-1.5", className)} data-tone={tone}><Circle className={cn("h-3 w-3", priorityClasses[priority])} strokeWidth={1.8} />{showLabel && <span>{priorityLabels[priority]}</span>}</span>;
}
