import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { DashboardActivity } from "@/lib/api/dashboard";
import { formatRelativeTime } from "@/lib/dashboard/model";
import { IconFrame, ProductIcon } from "@/components/icons";

export function RecentActivity({ activities }: { activities: DashboardActivity[] }) {
  return (
    <div className="min-h-[306px] divide-y">
      {activities.length === 0 ? (
        <div className="flex min-h-[306px] items-center justify-center px-5 text-center text-xs text-muted-foreground">运行测试后，这里会形成可追溯的质量事件流。</div>
      ) : (
        activities.slice(0, 6).map((activity) => (
          <Link key={activity.id} href={activity.href} className="group flex items-start gap-3 px-4 py-3 hover:bg-[hsl(var(--muted)/0.35)]">
            <IconFrame variant="status" className="mt-0.5 bg-[hsl(var(--accent))] text-[hsl(var(--primary))]"><ProductIcon name="testRuns" className="h-4 w-4" /></IconFrame>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2"><span className="truncate text-xs font-medium">{activity.title}</span><ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-40 group-hover:opacity-100" /></div>
              <p className="mt-1 truncate text-[11px] text-muted-foreground">{activity.description}</p>
              <div className="mt-1.5 text-[10px] text-muted-foreground">{activity.project_name} · {formatRelativeTime(activity.occurred_at)}</div>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
