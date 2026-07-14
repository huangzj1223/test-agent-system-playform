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
    <div className="workspace-panel grid grid-cols-2 overflow-hidden lg:grid-cols-5">
      {items.map(({ key, label, icon, suffix }, index) => (
        <div
          key={key}
          className={`relative min-h-[86px] px-4 py-4 ${index >= 2 ? "border-t" : ""} ${index % 2 === 1 ? "border-l" : ""} ${index === 4 ? "col-span-2" : ""} lg:col-span-1 lg:border-t-0 ${index ? "lg:border-l" : "lg:border-l-0"}`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            <IconFrame variant="plain" className="h-7 w-7 rounded-md bg-[hsl(var(--accent))] text-[hsl(var(--primary))]">
              <ProductIcon name={icon as ProductIconKey} className="h-4 w-4" />
            </IconFrame>
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-2xl font-semibold tracking-normal text-foreground">
              {formatMetric(metrics[key], suffix)}
            </span>
            {key === "active_projects" && (
              <span className="mb-1 text-[11px] text-muted-foreground">/ {metrics.total_projects}</span>
            )}
          </div>
          {key === "manual_actions" && metrics.manual_actions > 0 && (
            <span className="absolute bottom-0 left-0 top-0 w-0.5 bg-[hsl(var(--risk-warning))]" />
          )}
        </div>
      ))}
    </div>
  );
}
