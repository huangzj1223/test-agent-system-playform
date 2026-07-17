"use client";

import * as React from "react";
import { Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import {
  DashboardSection,
  LoopEfficiency,
  PersonalWorkbench,
  ProjectSituation,
  QualityBrief,
  RecentActivity,
} from "@/components/dashboard";
import { ProjectDeleteDialog } from "@/components/dashboard/project-delete-dialog";
import { StatusIcon } from "@/components/icons";
import { MainLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDashboardOverview } from "@/hooks/use-dashboard-overview";
import { createProject, updateProject } from "@/lib/api/projects";
import type { ProjectCreate, ProjectInfo } from "@/lib/api/types";
import { useProjectContext } from "@/lib/context/project-context";
import { filterProjectSpaces } from "@/lib/dashboard/global-workspace";
import type { ProjectRiskFilter } from "@/lib/dashboard/global-workspace";
import { refreshProjectSurfaces } from "@/lib/dashboard/project-refresh";
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
  const { projects: projectRecords, refreshProjects } = useProjectContext();
  const [query, setQuery] = React.useState("");
  const [risk, setRisk] = React.useState<ProjectRiskFilter>("all");
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedProject, setSelectedProject] = React.useState<ProjectInfo | null>(null);
  const [formData, setFormData] = React.useState<ProjectCreate>({ name: "", description: "" });
  const [submitting, setSubmitting] = React.useState(false);

  const projects = React.useMemo(
    () => filterProjectSpaces(data?.projects ?? [], query, risk),
    [data?.projects, query, risk],
  );

  const attention = data?.projects.filter((project) => project.risk_level === "attention" || project.risk_level === "blocked").length ?? 0;
  const assets = data?.projects.reduce((sum, project) => sum + project.test_cases + project.test_scripts, 0) ?? 0;
  const runs = data?.projects.reduce((sum, project) => sum + project.test_runs, 0) ?? 0;

  const openEdit = (identifier: string) => {
    const project = projectRecords.find((item) => item.identifier === identifier);
    if (!project) return toast.error("项目详情尚未加载，请刷新后重试");
    setSelectedProject(project);
    setFormData({ name: project.name, description: project.description || "" });
    setEditDialogOpen(true);
  };

  const openDelete = (identifier: string) => {
    const project = projectRecords.find((item) => item.identifier === identifier);
    if (!project) return toast.error("项目详情尚未加载，请刷新后重试");
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
      await refreshProjectSurfaces(refreshProjects, refresh);
    } catch (requestError) {
      console.error(requestError);
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
      await refreshProjectSurfaces(refreshProjects, refresh);
    } catch (requestError) {
      console.error(requestError);
      toast.error("项目更新失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleted = async () => {
    toast.success("项目及其关联数据已永久删除");
    setSelectedProject(null);
    await refreshProjectSurfaces(refreshProjects, refresh);
  };

  return (
    <MainLayout title="项目空间">
      <div className="mx-auto max-w-[1720px] space-y-5 pb-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="text-[11px] font-medium text-[hsl(var(--primary))]">项目运营工作区</div>
            <h1 className="mt-2 text-2xl font-semibold">项目空间</h1>
            <p className="mt-1 text-sm text-muted-foreground">集中管理项目、筛选质量状态，并处理跨项目质量工作</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />刷新数据
            </Button>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />新建项目
            </Button>
          </div>
        </div>

        {error && <div role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-xs text-destructive">{error}</div>}

        <div className="workspace-panel grid grid-cols-2 overflow-hidden lg:grid-cols-4">
          <SpaceMetric label="项目总数" value={data?.projects.length ?? 0} status="ready" />
          <SpaceMetric label="风险项目" value={attention} status={attention ? "attention" : "completed"} />
          <SpaceMetric label="测试资产" value={assets} status="completed" />
          <SpaceMetric label="累计运行" value={runs} status="running" />
        </div>

        <DashboardSection
          title="项目管理"
          description={`当前显示 ${projects.length} / ${data?.projects.length ?? 0} 个项目，可进入或维护项目资料`}
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
          <ProjectSituation projects={projects} onEdit={openEdit} onDelete={openDelete} />
        </DashboardSection>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,0.62fr)]">
          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr_0.9fr]">
            <DashboardSection title="我的处置台" description="需要人工审核、处理或关注的智能体任务" iconName="agents">
              <PersonalWorkbench items={data?.work_items ?? []} />
            </DashboardSection>
            <DashboardSection title="闭环效率" description="失败定位、修复和验证的真实追踪数据" iconName="analysis">
              <LoopEfficiency data={data?.loop_efficiency ?? emptyLoopEfficiency} />
            </DashboardSection>
            <DashboardSection title="最近质量活动" description="跨项目测试运行事件流" iconName="testRuns">
              <RecentActivity activities={data?.recent_activities ?? []} />
            </DashboardSection>
          </div>
          <QualityBrief risks={data?.risk_items ?? []} updatedAt={data?.updated_at ?? new Date().toISOString()} />
        </div>
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

const emptyLoopEfficiency = {
  tracked_loops: 0,
  active_loops: 0,
  completed_loops: 0,
  needs_human_review: 0,
  average_diagnosis_minutes: null,
  auto_fix_rate: null,
  verification_pass_rate: null,
};

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

function SpaceMetric({ label, value, status }: { label: string; value: number; status: "ready" | "attention" | "completed" | "running" }) {
  return <div className="min-h-24 border-b border-r p-4 last:border-r-0 lg:border-b-0"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{label}</span><StatusIcon status={status} /></div><div className="mt-3 text-2xl font-semibold tabular-nums">{value}</div></div>;
}
