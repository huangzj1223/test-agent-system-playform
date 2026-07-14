"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { MainLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AgentConstellation,
  DashboardSection,
  DashboardSkeleton,
  LoopEfficiency,
  MetricStrip,
  PersonalWorkbench,
  ProjectSituation,
  QualityBrief,
  RecentActivity,
} from "@/components/dashboard";
import {
  createProject,
  updateProject,
} from "@/lib/api/projects";
import { getDashboardOverview } from "@/lib/api/dashboard";
import type { DashboardOverview } from "@/lib/api/dashboard";
import type { ProjectCreate, ProjectInfo } from "@/lib/api/types";
import { formatRelativeTime } from "@/lib/dashboard/model";
import { refreshProjectSurfaces } from "@/lib/dashboard/project-refresh";
import { IconFrame, ProductIcon } from "@/components/icons";
import type { ProductIconKey } from "@/lib/icons/icon-system";
import { useProjectContext } from "@/lib/context/project-context";
import { ProjectDeleteDialog } from "@/components/dashboard/project-delete-dialog";

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, refreshProjects } = useProjectContext();
  const [overview, setOverview] = React.useState<DashboardOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [overviewError, setOverviewError] = React.useState(false);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedProject, setSelectedProject] = React.useState<ProjectInfo | null>(null);
  const [formData, setFormData] = React.useState<ProjectCreate>({ name: "", description: "" });
  const [submitting, setSubmitting] = React.useState(false);

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

  const openEdit = (identifier: string) => {
    const project = projects.find((item) => item.identifier === identifier);
    if (!project) return;
    setSelectedProject(project);
    setFormData({ name: project.name, description: project.description || "" });
    setEditDialogOpen(true);
  };

  const openDelete = (identifier: string) => {
    const project = projects.find((item) => item.identifier === identifier);
    if (!project) return;
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) return toast.error("请输入项目名称");
    try {
      setSubmitting(true);
      await createProject(formData);
      toast.success("项目创建成功");
      setCreateDialogOpen(false);
      setFormData({ name: "", description: "" });
      await refreshProjectSurfaces(refreshProjects, loadDashboard);
    } catch (error) {
      console.error(error);
      toast.error("项目创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedProject || !formData.name.trim()) return toast.error("请输入项目名称");
    try {
      setSubmitting(true);
      await updateProject(selectedProject.identifier, formData);
      toast.success("项目更新成功");
      setEditDialogOpen(false);
      setSelectedProject(null);
      await refreshProjectSurfaces(refreshProjects, loadDashboard);
    } catch (error) {
      console.error(error);
      toast.error("项目更新失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleted = async () => {
    toast.success("项目及其关联数据已永久删除");
    setSelectedProject(null);
    await refreshProjectSurfaces(refreshProjects, loadDashboard);
  };

  const firstProject = projects[0];

  return (
    <MainLayout title="系统总览">
      <div className="mx-auto max-w-[1720px] space-y-5 pb-8">
        {loading || !overview ? (
          <DashboardSkeleton />
        ) : (
          <>
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-medium tracking-[0.14em] text-[hsl(var(--primary))]">
                  <ProductIcon name="agents" className="h-3.5 w-3.5" />
                  智能质量网络
                </div>
                <h1 className="mt-2 text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">掌握质量全貌，驱动智能闭环</h1>
                <p className="mt-2 text-sm text-muted-foreground">最后更新 {formatRelativeTime(overview.updated_at)} · 所有指标均来自当前系统真实记录</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadDashboard}><RefreshCw className="mr-2 h-4 w-4" />刷新数据</Button>
                <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />新建项目</Button>
                <Button
                  size="sm"
                  className="btn-ai"
                  disabled={!firstProject}
                  onClick={() => firstProject && router.push(`/projects/${firstProject.identifier}/test-cases?ai=1`)}
                >
                  <Sparkles className="mr-2 h-4 w-4" />发起智能任务
                </Button>
              </div>
            </div>

            {overviewError && (
              <div className="flex flex-col justify-between gap-3 rounded-lg border border-[hsl(var(--risk-warning)/0.35)] bg-[hsl(var(--risk-warning)/0.08)] px-4 py-3 text-xs sm:flex-row sm:items-center">
                <span>系统总览接口暂时不可用，当前展示项目接口中的真实资产数据，运行与闭环指标标记为待接入。</span>
                <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={loadDashboard}>重新加载</Button>
              </div>
            )}

            <MetricStrip metrics={overview.metrics} />

            <div id="agent-network" className="grid scroll-mt-20 items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(330px,0.75fr)]">
              <AgentConstellation stages={overview.agent_stages} projects={overview.projects} />
              <QualityBrief risks={overview.risk_items} updatedAt={overview.updated_at} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <QuickAction icon="testCases" title="生成测试用例" description="从需求或自然语言创建标准用例" disabled={!firstProject} onClick={() => firstProject && router.push(`/projects/${firstProject.identifier}/test-cases?ai=1`)} />
              <QuickAction icon="apiTests" title="解析 API 文档" description="导入 OpenAPI 或 Markdown 文档" disabled={!firstProject} onClick={() => firstProject && router.push(`/projects/${firstProject.identifier}/api-tests`)} />
              <QuickAction icon="webTests" title="创建 Web 测试" description="设计页面流程并生成自动化脚本" disabled={!firstProject} onClick={() => firstProject && router.push(`/projects/${firstProject.identifier}/web-tests`)} />
              <QuickAction icon="analysis" title="查看失败闭环" description="定位失败原因并跟踪自动修复" disabled={!firstProject} onClick={() => firstProject && router.push(`/projects/${firstProject.identifier}/test-runs`)} />
            </div>

            <DashboardSection
              id="project-situation"
              title="全局项目战情"
              description="按阻塞风险、失败数量和最近活动自动排序"
              iconName="projects"
            >
              <ProjectSituation projects={overview.projects} onEdit={openEdit} onDelete={openDelete} />
            </DashboardSection>

            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr_0.9fr]">
              <DashboardSection title="我的处置台" description="需要人工审核、处理或关注的智能体任务" iconName="agents">
                <PersonalWorkbench items={overview.work_items} />
              </DashboardSection>
              <DashboardSection title="闭环效率" description="失败定位、修复和验证的真实追踪数据" iconName="analysis">
                <LoopEfficiency data={overview.loop_efficiency} />
              </DashboardSection>
              <DashboardSection title="最近质量活动" description="跨项目测试运行事件流" iconName="testRuns">
                <RecentActivity activities={overview.recent_activities} />
              </DashboardSection>
            </div>
          </>
        )}
      </div>

      <ProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title="新建项目"
        description="创建一个新的测试项目空间。"
        formData={formData}
        setFormData={setFormData}
        submitting={submitting}
        onSubmit={handleCreate}
      />
      <ProjectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title="编辑项目"
        description="修改项目名称和描述。"
        formData={formData}
        setFormData={setFormData}
        submitting={submitting}
        onSubmit={handleUpdate}
      />
      <ProjectDeleteDialog
        open={deleteDialogOpen}
        project={selectedProject}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={handleDeleted}
      />
    </MainLayout>
  );
}

function QuickAction({ icon, title, description, onClick, disabled }: { icon: ProductIconKey; title: string; description: string; onClick: () => void; disabled: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="workspace-panel group flex min-h-[92px] items-center gap-3 p-4 text-left transition-colors hover:border-[hsl(var(--primary)/0.38)] hover:bg-[hsl(var(--accent)/0.4)] disabled:cursor-not-allowed disabled:opacity-50">
      <IconFrame variant="feature"><ProductIcon name={icon} className="h-5 w-5" /></IconFrame>
      <div className="min-w-0"><div className="text-sm font-medium">{title}</div><p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{description}</p></div>
    </button>
  );
}

function ProjectDialog({ open, onOpenChange, title, description, formData, setFormData, submitting, onSubmit }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; formData: ProjectCreate; setFormData: React.Dispatch<React.SetStateAction<ProjectCreate>>; submitting: boolean; onSubmit: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) setFormData({ name: "", description: "" }); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label htmlFor={`${title}-name`}>项目名称</Label><Input id={`${title}-name`} value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} placeholder="输入项目名称" /></div>
          <div className="space-y-2"><Label htmlFor={`${title}-description`}>项目描述</Label><Textarea id={`${title}-description`} value={formData.description || ""} onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))} placeholder="说明项目目标和测试范围" rows={4} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button><Button onClick={onSubmit} disabled={submitting}>{submitting ? "保存中..." : "保存"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
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
