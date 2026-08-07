"use client";

import * as React from "react";
import { MainLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  AgentConstellation,
  DashboardSkeleton,
  MetricStrip,
} from "@/components/dashboard";
import { getDashboardOverview } from "@/lib/api/dashboard";
import type { DashboardOverview } from "@/lib/api/dashboard";
import type { ProjectInfo } from "@/lib/api/types";
import { useProjectContext } from "@/lib/context/project-context";

export default function ProjectsPage() {
  const { projects } = useProjectContext();
  const [overview, setOverview] = React.useState<DashboardOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [overviewError, setOverviewError] = React.useState(false);

  const loadDashboard = React.useCallback(async () => {
    setLoading(true);
    setOverviewError(false);
    try {
      const overviewResult = await getDashboardOverview();
      setOverview(overviewResult);
    } catch (error) {
      console.error("Dashboard overview failed:", error);
      setOverview(buildProjectFallback(projects));
      setOverviewError(true);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <MainLayout title="掌握质量全貌，驱动智能闭环。" headerEyebrow={null}>
      <div className="mx-auto max-w-[1720px] space-y-4 pb-2">
        {loading || !overview ? (
          <DashboardSkeleton />
        ) : (
          <>
            {overviewError && (
              <div className="flex flex-col justify-between gap-3 rounded-lg border border-[hsl(var(--risk-warning)/0.35)] bg-[hsl(var(--risk-warning)/0.08)] px-4 py-3 text-xs sm:flex-row sm:items-center">
                <span>系统总览接口暂时不可用，当前展示项目接口中的真实资产数据，运行与闭环指标标记为待接入。</span>
                <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={loadDashboard}>重新加载</Button>
              </div>
            )}

            <MetricStrip metrics={overview.metrics} />

            <div id="agent-network" className="scroll-mt-20">
              <AgentConstellation stages={overview.agent_stages} projects={overview.projects} />
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}

function buildProjectFallback(projects: ProjectInfo[]): DashboardOverview {
  const testCases = projects.reduce((sum, project) => sum + (project.test_cases_count || 0), 0);
  const now = new Date().toISOString();
  return {
    updated_at: now,
    metrics: {
      active_projects: projects.filter((project) => project.test_cases_count > 0).length,
      total_projects: projects.length,
      test_assets: testCases,
      running_tasks: 0,
      manual_actions: 0,
      pass_rate: null,
    },
    agent_stages: [
      { key: "requirements", name: "需求解析", description: "统一任务数据待接入", status: "unavailable", task_count: null, issue_count: 0, href: null, data_available: false },
      { key: "design", name: "测试设计", description: "已沉淀的标准测试用例", status: testCases ? "ready" : "idle", task_count: testCases, issue_count: 0, href: "/projects", data_available: true },
      { key: "generation", name: "脚本生成", description: "脚本总览数据待接入", status: "unavailable", task_count: null, issue_count: 0, href: null, data_available: false },
      { key: "execution", name: "自动执行", description: "运行作业数据待接入", status: "unavailable", task_count: null, issue_count: 0, href: null, data_available: false },
      { key: "analysis", name: "结果分析", description: "失败分析数据待接入", status: "unavailable", task_count: null, issue_count: 0, href: null, data_available: false },
      { key: "repair", name: "失败修复", description: "修复闭环数据待接入", status: "unavailable", task_count: null, issue_count: 0, href: null, data_available: false },
      { key: "verification", name: "回归验证", description: "验证数据待接入", status: "unavailable", task_count: null, issue_count: 0, href: null, data_available: false },
    ],
    risk_items: [],
    projects: projects.map((project) => ({ identifier: project.identifier, name: project.name, description: project.description || null, test_cases: project.test_cases_count || 0, test_scripts: 0, test_runs: 0, running_tasks: 0, passed: 0, failed: 0, blocked: 0, pass_rate: null, risk_level: "no_data", last_activity_at: project.updated_at || project.created_at })),
    work_items: [],
    recent_activities: [],
    loop_efficiency: { tracked_loops: 0, active_loops: 0, completed_loops: 0, needs_human_review: 0, average_diagnosis_minutes: null, auto_fix_rate: null, verification_pass_rate: null },
  };
}
