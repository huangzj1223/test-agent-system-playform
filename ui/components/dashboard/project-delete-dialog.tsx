"use client";

import * as React from "react";
import { AlertTriangle, Database, HardDrive, LoaderCircle, Trash2 } from "lucide-react";
import { deleteProject, getProjectDeletionImpact } from "@/lib/api/projects";
import type { ProjectDeletionImpact, ProjectDeletionResult, ProjectInfo } from "@/lib/api/types";
import { canConfirmProjectDeletion, projectResourceLabels } from "@/lib/dashboard/project-deletion";
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

export function ProjectDeleteDialog({
  open,
  project,
  onOpenChange,
  onDeleted,
}: {
  open: boolean;
  project: ProjectInfo | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: (result: ProjectDeletionResult) => Promise<void> | void;
}) {
  const [impact, setImpact] = React.useState<ProjectDeletionImpact | null>(null);
  const [confirmation, setConfirmation] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !project) return;
    let active = true;
    setConfirmation("");
    setImpact(null);
    setError(null);
    setLoading(true);
    getProjectDeletionImpact(project.identifier)
      .then((response) => { if (active) setImpact(response.data); })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "删除影响加载失败");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, project]);

  if (!project) return null;

  const confirmed = canConfirmProjectDeletion(project.name, confirmation);
  const resources = impact
    ? Object.entries(impact.resources).filter(([, count]) => count > 0)
    : [];

  const handleDelete = async () => {
    if (!confirmed) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await deleteProject(project.identifier, confirmation);
      await onDeleted(response.data);
      onOpenChange(false);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "项目删除失败");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!deleting) onOpenChange(next); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <DialogTitle>永久删除项目“{project.name}”</DialogTitle>
          <DialogDescription>
            此操作不可恢复。项目下的测试用例、接口脚本、运行记录、分析结果和成果物将被同步删除。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {loading ? (
            <div className="flex min-h-32 items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />正在统计关联数据
            </div>
          ) : impact ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <ImpactMetric icon={<Database className="h-4 w-4" />} label="数据库记录" value={impact.total_records} />
                <ImpactMetric icon={<HardDrive className="h-4 w-4" />} label="存储对象" value={impact.stored_objects} />
                <ImpactMetric label="测试用例" value={impact.resources.test_cases ?? 0} />
                <ImpactMetric label="自动化脚本" value={(impact.resources.api_tests ?? 0) + (impact.resources.web_tests ?? 0) + (impact.resources.scenario_tests ?? 0)} />
              </div>
              <div className="rounded-lg border bg-muted/25 p-3">
                <div className="mb-2 text-xs font-medium text-foreground">将被删除的关联内容</div>
                {resources.length > 0 ? (
                  <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-xs sm:grid-cols-3">
                    {resources.map(([key, count]) => (
                      <div key={key} className="flex items-center justify-between gap-2 text-muted-foreground">
                        <span>{projectResourceLabels[key] ?? key}</span>
                        <span className="font-semibold tabular-nums text-foreground">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">当前项目没有关联测试数据，仍将删除项目本身。</p>
                )}
              </div>
            </>
          ) : null}

          {error && (
            <div role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="project-delete-confirmation" className="text-xs">
              输入项目名称 <strong>{project.name}</strong> 以确认永久删除
            </Label>
            <Input
              id="project-delete-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={project.name}
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>取消</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={!impact || !confirmed || deleting || loading}>
            {deleting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            {deleting ? "正在永久删除" : "永久删除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImpactMetric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
