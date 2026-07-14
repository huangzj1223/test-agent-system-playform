import { CheckCheck, Clock3, RotateCcw, UserRoundCheck } from "lucide-react";
import type { DashboardLoopEfficiency } from "@/lib/api/dashboard";
import { formatMetric } from "@/lib/dashboard/model";
import { IconFrame } from "@/components/icons";

export function LoopEfficiency({ data }: { data: DashboardLoopEfficiency }) {
  const metrics = [
    { label: "平均定位时间", value: formatMetric(data.average_diagnosis_minutes, " 分钟"), icon: Clock3 },
    { label: "自动修复成功率", value: formatMetric(data.auto_fix_rate, "%"), icon: RotateCcw },
    { label: "修复后验证通过率", value: formatMetric(data.verification_pass_rate, "%"), icon: CheckCheck },
    { label: "等待人工确认", value: `${data.needs_human_review}`, icon: UserRoundCheck },
  ];
  return (
    <div className="min-h-[306px] p-4">
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border bg-[hsl(var(--muted)/0.22)] p-3">
            <IconFrame variant="status" className="h-8 w-8 bg-[hsl(var(--accent))] text-[hsl(var(--primary))]"><metric.icon className="h-4 w-4" /></IconFrame>
            <div className="mt-3 text-lg font-semibold tracking-normal">{metric.value}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">{metric.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border p-3">
        <div className="flex items-center justify-between text-xs"><span className="font-medium">闭环追踪</span><span className="text-muted-foreground">{data.completed_loops} / {data.tracked_loops}</span></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-[hsl(var(--loop-complete))]" style={{ width: `${data.tracked_loops ? Math.round(data.completed_loops / data.tracked_loops * 100) : 0}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground"><span>{data.active_loops} 个运行中</span><span>{data.completed_loops} 个已完成</span></div>
      </div>
    </div>
  );
}
