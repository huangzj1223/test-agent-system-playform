"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { MainLayout } from "@/components/layout";
import { DashboardSection } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { IconFrame, ProductIcon, StatusIcon } from "@/components/icons";
import { useDashboardOverview } from "@/hooks/use-dashboard-overview";
import { filterAgentTasks } from "@/lib/dashboard/global-workspace";
import type { AgentTaskGroup } from "@/lib/dashboard/global-workspace";
import { agentStageLabels, formatRelativeTime } from "@/lib/dashboard/model";
import type { ProductStatus } from "@/lib/icons/icon-system";
import { cn } from "@/lib/utils";

const groups: Array<{ key: AgentTaskGroup; label: string }> = [
  { key: "all", label: "全部任务" },
  { key: "review", label: "等待审核" },
  { key: "handle", label: "需要处理" },
  { key: "watch", label: "运行观察" },
];

const statusMap = {
  running: "running",
  attention: "attention",
  ready: "ready",
  idle: "idle",
  unavailable: "unavailable",
} as const satisfies Record<string, ProductStatus>;

export default function AgentTasksPage() {
  const { data, loading, error, refresh } = useDashboardOverview();
  const [group, setGroup] = React.useState<AgentTaskGroup>("all");
  const tasks = React.useMemo(
    () => filterAgentTasks(data?.work_items ?? [], group),
    [data?.work_items, group],
  );

  const reviewCount = data?.work_items.filter((item) => item.group === "review").length ?? 0;
  const handleCount = data?.work_items.filter((item) => item.group === "handle").length ?? 0;
  const runningStages = data?.agent_stages.filter((stage) => stage.status === "running").length ?? 0;
  const attentionStages = data?.agent_stages.filter((stage) => stage.status === "attention").length ?? 0;

  return (
    <MainLayout title="智能体任务">
      <div className="mx-auto max-w-[1720px] space-y-5 pb-8">
        <WorkspaceHeading
          title="智能体任务中心"
          description="统一观察跨项目智能体阶段、人工接管点和闭环执行活动"
          onRefresh={refresh}
          loading={loading}
        />

        {error && <ErrorBanner message={error} onRetry={refresh} />}

        <div className="workspace-panel grid grid-cols-2 overflow-hidden lg:grid-cols-4">
          <TaskMetric label="运行中阶段" value={runningStages} status="running" />
          <TaskMetric label="需关注阶段" value={attentionStages} status="attention" />
          <TaskMetric label="等待人工审核" value={reviewCount} status="ready" />
          <TaskMetric label="需要立即处理" value={handleCount} status={handleCount ? "blocked" : "completed"} />
        </div>

        <DashboardSection title="智能体协作链路" description="七个阶段的实时负载与异常状态" iconName="agents">
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-7">
            {(data?.agent_stages ?? []).map((stage, index) => (
              <Link
                key={stage.key}
                href={stage.href ?? "/projects/agent-tasks"}
                className="group relative min-h-32 rounded-lg border bg-background p-3 transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.35)] hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                  <StatusIcon status={statusMap[stage.status]} />
                </div>
                <div className="mt-4 text-sm font-semibold">{stage.name}</div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{stage.description}</p>
                <div className="mt-3 flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">{agentStageLabels[stage.status]}</span>
                  <span className="font-semibold tabular-nums text-foreground">{stage.data_available ? stage.task_count ?? 0 : "待接入"}</span>
                </div>
              </Link>
            ))}
            {!loading && !data?.agent_stages.length && <EmptyState text="暂无智能体阶段数据" />}
          </div>
        </DashboardSection>

        <div className="grid items-start gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <DashboardSection
            title="任务处置队列"
            description="等待人工决策或需要持续观察的智能体任务"
            iconName="analysis"
            action={
              <div className="flex rounded-lg border bg-muted/35 p-0.5">
                {groups.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setGroup(item.key)}
                    className={cn("h-7 rounded-md px-2.5 text-[11px] transition-colors", group === item.key ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            }
          >
            <div className="divide-y">
              {tasks.map((task) => (
                <Link key={task.id} href={task.href} className="flex min-h-20 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/35 sm:px-5">
                  <IconFrame variant="status"><ProductIcon name="agents" className="h-4 w-4" /></IconFrame>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium">{task.title}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{formatRelativeTime(task.created_at)}</span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{task.description}</p>
                    <span className="mt-1 block text-[10px] text-[hsl(var(--primary))]">{task.project_name}</span>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
              {!loading && tasks.length === 0 && <EmptyState text="当前筛选下没有待处置任务" />}
            </div>
          </DashboardSection>

          <DashboardSection title="近期智能体活动" description="最近跨项目测试执行事件" iconName="testRuns">
            <div className="divide-y">
              {(data?.recent_activities ?? []).slice(0, 8).map((activity) => (
                <Link key={activity.id} href={activity.href} className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/35">
                  <StatusIcon status="completed" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{activity.title}</div>
                    <div className="mt-1 flex justify-between gap-3 text-[10px] text-muted-foreground">
                      <span className="truncate">{activity.project_name} · {activity.description}</span>
                      <span className="shrink-0">{formatRelativeTime(activity.occurred_at)}</span>
                    </div>
                  </div>
                </Link>
              ))}
              {!loading && !data?.recent_activities.length && <EmptyState text="暂无智能体活动" />}
            </div>
          </DashboardSection>
        </div>
      </div>
    </MainLayout>
  );
}

function WorkspaceHeading({ title, description, onRefresh, loading }: { title: string; description: string; onRefresh: () => void; loading: boolean }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><div className="text-[11px] font-medium text-[hsl(var(--primary))]">全局工作区</div><h1 className="mt-2 text-2xl font-semibold">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}><RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />刷新数据</Button>
    </div>
  );
}

function TaskMetric({ label, value, status }: { label: string; value: number; status: ProductStatus }) {
  return <div className="min-h-24 border-b border-r p-4 last:border-r-0 lg:border-b-0"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{label}</span><StatusIcon status={status} /></div><div className="mt-3 text-2xl font-semibold tabular-nums">{value}</div></div>;
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div role="alert" className="flex items-center justify-between rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-xs text-destructive"><span>{message}</span><Button variant="outline" size="sm" onClick={onRetry}>重试</Button></div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="col-span-full flex min-h-28 items-center justify-center px-4 text-sm text-muted-foreground">{text}</div>;
}
