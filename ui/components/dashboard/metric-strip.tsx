import type { DashboardMetrics } from "@/lib/api/dashboard";
import { formatMetric } from "@/lib/dashboard/model";
import type { ProductIconKey } from "@/lib/icons/icon-system";
import { IconFrame, ProductIcon } from "@/components/icons";

const items = [
  { key: "active_projects", label: "活跃项目", icon: "projects", suffix: "" },
  { key: "test_assets", label: "测试资产", icon: "testCases", suffix: "" },
  { key: "running_tasks", label: "运行任务", icon: "testRuns", suffix: "" },
  { key: "manual_actions", label: "待人工处置", icon: "agents", suffix: "" },
  { key: "pass_rate", label: "执行通过率", icon: "reports", suffix: "%" },
] as const;

export function MetricStrip({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="workspace-panel grid grid-cols-1 overflow-hidden sm:grid-cols-2 lg:grid-cols-5">
      {items.map(({ key, label, icon, suffix }, index) => (
        <div
          key={key}
          className={`relative flex items-center gap-3 px-4 py-3 ${index >= 2 ? "border-t sm:border-t-0" : ""} ${index % 2 === 1 ? "sm:border-l" : ""} ${index ? "lg:border-l" : ""}`}
        >
          <IconFrame variant="plain" className="h-7 w-7 shrink-0 rounded-md bg-[hsl(var(--accent))] text-[hsl(var(--primary))]">
            <ProductIcon name={icon as ProductIconKey} className="h-4 w-4" />
          </IconFrame>
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <span className="ml-auto text-lg font-semibold tracking-normal text-foreground tabular-nums">
            {formatMetric(metrics[key], suffix)}
          </span>
          {key === "active_projects" && (
            <span className="text-[11px] text-muted-foreground">/ {metrics.total_projects}</span>
          )}
          {key === "manual_actions" && metrics.manual_actions > 0 && (
            <span className="absolute bottom-0 left-0 top-0 w-0.5 bg-[hsl(var(--risk-warning))]" />
          )}
        </div>
      ))}
    </div>
  );
}
