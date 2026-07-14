"use client";

import * as React from "react";
import { RefreshCw, Search } from "lucide-react";
import { MainLayout } from "@/components/layout";
import { DashboardSection, ProjectSituation } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusIcon } from "@/components/icons";
import { useDashboardOverview } from "@/hooks/use-dashboard-overview";
import { filterProjectSpaces } from "@/lib/dashboard/global-workspace";
import type { ProjectRiskFilter } from "@/lib/dashboard/global-workspace";
import { cn } from "@/lib/utils";

const riskFilters: Array<{ key: ProjectRiskFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "blocked", label: "阻塞" },
  { key: "attention", label: "需关注" },
  { key: "healthy", label: "健康" },
  { key: "no_data", label: "暂无运行" },
];

export default function ProjectSpacesPage() {
  const { data, loading, error, refresh } = useDashboardOverview();
  const [query, setQuery] = React.useState("");
  const [risk, setRisk] = React.useState<ProjectRiskFilter>("all");
  const projects = React.useMemo(
    () => filterProjectSpaces(data?.projects ?? [], query, risk),
    [data?.projects, query, risk],
  );

  const attention = data?.projects.filter((project) => project.risk_level === "attention" || project.risk_level === "blocked").length ?? 0;
  const assets = data?.projects.reduce((sum, project) => sum + project.test_cases + project.test_scripts, 0) ?? 0;
  const runs = data?.projects.reduce((sum, project) => sum + project.test_runs, 0) ?? 0;

  return (
    <MainLayout title="项目空间">
      <div className="mx-auto max-w-[1720px] space-y-5 pb-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><div className="text-[11px] font-medium text-[hsl(var(--primary))]">全局工作区</div><h1 className="mt-2 text-2xl font-semibold">项目空间</h1><p className="mt-1 text-sm text-muted-foreground">跨项目查看质量状态、测试资产和最近执行表现</p></div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}><RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />刷新数据</Button>
        </div>

        {error && <div role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-xs text-destructive">{error}</div>}

        <div className="workspace-panel grid grid-cols-2 overflow-hidden lg:grid-cols-4">
          <SpaceMetric label="项目总数" value={data?.projects.length ?? 0} status="ready" />
          <SpaceMetric label="风险项目" value={attention} status={attention ? "attention" : "completed"} />
          <SpaceMetric label="测试资产" value={assets} status="completed" />
          <SpaceMetric label="累计运行" value={runs} status="running" />
        </div>

        <DashboardSection
          title="全部项目"
          description={`当前显示 ${projects.length} / ${data?.projects.length ?? 0} 个项目`}
          iconName="projects"
          action={
            <div className="relative w-56 max-w-[42vw]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-8 pl-8 text-xs" placeholder="搜索项目、标识或描述" />
            </div>
          }
        >
          <div className="flex flex-wrap gap-1.5 border-b bg-muted/20 px-4 py-3">
            {riskFilters.map((item) => (
              <button key={item.key} type="button" onClick={() => setRisk(item.key)} className={cn("h-7 rounded-md border px-2.5 text-[11px] transition-colors", risk === item.key ? "border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--accent))] font-medium text-[hsl(var(--primary))]" : "border-transparent text-muted-foreground hover:border-border hover:bg-background")}>{item.label}</button>
            ))}
          </div>
          <ProjectSituation projects={projects} />
        </DashboardSection>
      </div>
    </MainLayout>
  );
}

function SpaceMetric({ label, value, status }: { label: string; value: number; status: "ready" | "attention" | "completed" | "running" }) {
  return <div className="min-h-24 border-b border-r p-4 last:border-r-0 lg:border-b-0"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{label}</span><StatusIcon status={status} /></div><div className="mt-3 text-2xl font-semibold tabular-nums">{value}</div></div>;
}
