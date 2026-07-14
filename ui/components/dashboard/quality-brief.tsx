import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { DashboardRiskItem } from "@/lib/api/dashboard";
import { formatRelativeTime } from "@/lib/dashboard/model";
import { cn } from "@/lib/utils";
import { IconFrame, ProductIcon, StatusIcon } from "@/components/icons";

const severityStyles = {
  critical: "border-[hsl(var(--risk-blocked)/0.35)] bg-[hsl(var(--risk-blocked)/0.07)] text-[hsl(var(--risk-blocked))]",
  high: "border-[hsl(var(--risk-warning)/0.45)] bg-[hsl(var(--risk-warning)/0.08)] text-[hsl(32_76%_38%)]",
  medium: "border-[hsl(var(--primary)/0.24)] bg-[hsl(var(--primary)/0.06)] text-[hsl(var(--primary))]",
  low: "border-[hsl(var(--agent-running)/0.28)] bg-[hsl(var(--agent-running)/0.06)] text-[hsl(var(--agent-running))]",
};

export function QualityBrief({ risks, updatedAt }: { risks: DashboardRiskItem[]; updatedAt: string }) {
  return (
    <div className="workspace-panel flex min-h-[440px] flex-col overflow-hidden md:h-[440px]">
      <div className="border-b px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ProductIcon name="analysis" className="h-4 w-4 text-[hsl(var(--primary))]" />
          今日质量简报
        </div>
        <p className="mt-1 text-xs text-muted-foreground">风险解释、影响范围和下一步处置建议</p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {risks.length === 0 ? (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--loop-complete)/0.12)] text-[hsl(78_56%_34%)]">
              <StatusIcon status="completed" className="[&_svg]:h-6 [&_svg]:w-6" />
            </div>
            <h3 className="mt-4 text-sm font-semibold">当前没有已记录的高风险项</h3>
            <p className="mt-1 max-w-[240px] text-xs leading-5 text-muted-foreground">系统会根据失败分析和闭环记录持续更新风险。</p>
          </div>
        ) : (
          risks.slice(0, 5).map((risk) => (
            <Link
              key={risk.id}
              href={risk.href}
              className={cn("group block rounded-lg border p-3 transition-colors hover:border-[hsl(var(--primary)/0.45)]", severityStyles[risk.severity])}
            >
              <div className="flex items-start gap-3">
                <IconFrame variant="plain" className="mt-0.5 h-5 w-5">
                  <StatusIcon status={risk.severity === "critical" || risk.severity === "high" ? "blocked" : "attention"} />
                </IconFrame>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 text-xs font-semibold text-foreground">{risk.title}</h3>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-45 transition-opacity group-hover:opacity-100" />
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{risk.reason}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                    <span className="truncate">{risk.project_name}</span>
                    <span>{risk.confidence !== null ? `置信度 ${risk.confidence}%` : formatRelativeTime(risk.created_at)}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
      <div className="border-t px-4 py-3 text-[10px] text-muted-foreground">最近检查：{formatRelativeTime(updatedAt)}</div>
    </div>
  );
}
