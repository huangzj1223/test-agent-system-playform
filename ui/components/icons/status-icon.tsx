import { CircleCheckBig, CircleDashed, CircleDot, LoaderCircle, OctagonX, TriangleAlert, Unplug } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ProductStatus } from "@/lib/icons/icon-system";
import { cn } from "@/lib/utils";

const statusMeta: Record<ProductStatus, { label: string; icon: LucideIcon; className: string }> = {
  running: { label: "运行中", icon: LoaderCircle, className: "text-[hsl(var(--agent-running))]" },
  ready: { label: "已就绪", icon: CircleDot, className: "text-[hsl(var(--primary))]" },
  completed: { label: "已完成", icon: CircleCheckBig, className: "text-[hsl(var(--loop-complete))]" },
  attention: { label: "需关注", icon: TriangleAlert, className: "text-[hsl(var(--risk-warning))]" },
  blocked: { label: "已阻塞", icon: OctagonX, className: "text-[hsl(var(--risk-blocked))]" },
  idle: { label: "空闲", icon: CircleDashed, className: "text-muted-foreground" },
  unavailable: { label: "待接入", icon: Unplug, className: "text-muted-foreground" },
};

export function StatusIcon({ status, showLabel = false, className }: { status: ProductStatus; showLabel?: boolean; className?: string }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;
  return <span className={cn("inline-flex items-center gap-1.5 text-xs", meta.className, className)} title={meta.label}><Icon className={cn("h-4 w-4", status === "running" && "animate-spin")} strokeWidth={1.8} />{showLabel && <span>{meta.label}</span>}</span>;
}

export function getStatusLabel(status: ProductStatus) {
  return statusMeta[status].label;
}
