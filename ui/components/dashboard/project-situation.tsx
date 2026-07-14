import Link from "next/link";
import { ArrowRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { DashboardProjectSituation } from "@/lib/api/dashboard";
import { formatRelativeTime } from "@/lib/dashboard/model";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusIcon } from "@/components/icons";
import type { ProductStatus } from "@/lib/icons/icon-system";

const riskMeta = {
  blocked: { label: "阻塞", status: "blocked", className: "bg-[hsl(var(--risk-blocked)/0.1)] text-[hsl(var(--risk-blocked))]" },
  attention: { label: "关注", status: "attention", className: "bg-[hsl(var(--risk-warning)/0.14)] text-[hsl(32_76%_38%)]" },
  healthy: { label: "健康", status: "completed", className: "bg-[hsl(var(--loop-complete)/0.12)] text-[hsl(78_56%_32%)]" },
  no_data: { label: "暂无运行", status: "idle", className: "bg-muted text-muted-foreground" },
};

export function ProjectSituation({ projects, onEdit, onDelete }: { projects: DashboardProjectSituation[]; onEdit?: (identifier: string) => void; onDelete?: (identifier: string) => void }) {
  if (projects.length === 0) {
    return <div className="flex min-h-44 items-center justify-center px-6 text-sm text-muted-foreground">创建项目后，这里会显示跨项目质量战情。</div>;
  }

  return (
    <div>
      <div className="hidden grid-cols-[minmax(180px,1.6fr)_110px_110px_110px_120px_90px] border-b bg-[hsl(var(--muted)/0.45)] px-5 py-2.5 text-[11px] font-medium text-muted-foreground lg:grid">
        <span>项目</span><span>测试资产</span><span>最近执行</span><span>运行任务</span><span>最近活动</span><span className="text-right">操作</span>
      </div>
      <div className="divide-y">
        {projects.slice(0, 8).map((project) => {
          const risk = riskMeta[project.risk_level];
          return (
            <div key={project.identifier} className="grid gap-3 px-4 py-4 transition-colors hover:bg-[hsl(var(--muted)/0.35)] lg:grid-cols-[minmax(180px,1.6fr)_110px_110px_110px_120px_90px] lg:items-center lg:px-5 lg:py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{project.name}</span>
                  <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px]", risk.className)}>
                    <StatusIcon status={risk.status as ProductStatus} />{risk.label}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">{project.description || project.identifier}</p>
              </div>
              <DataCell label="测试资产" value={`${project.test_cases + project.test_scripts}`} hint={`${project.test_cases} 用例 · ${project.test_scripts} 脚本`} />
              <DataCell label="最近执行" value={project.pass_rate === null ? "暂无" : `${project.pass_rate}%`} hint={`${project.failed} 失败 · ${project.blocked} 阻塞`} warning={project.failed + project.blocked > 0} />
              <DataCell label="运行任务" value={`${project.running_tasks}`} hint={`${project.test_runs} 次运行`} />
              <DataCell label="最近活动" value={formatRelativeTime(project.last_activity_at)} />
              <div className="flex justify-end gap-1">
                <Link href={`/projects/${project.identifier}`} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))]">
                  进入 <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                {(onEdit || onDelete) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="项目操作"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onEdit && <DropdownMenuItem onClick={() => onEdit(project.identifier)}><Pencil className="mr-2 h-4 w-4" />编辑项目</DropdownMenuItem>}
                      {onEdit && onDelete && <DropdownMenuSeparator />}
                      {onDelete && <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(project.identifier)}><Trash2 className="mr-2 h-4 w-4" />删除项目</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DataCell({ label, value, hint, warning = false }: { label: string; value: string; hint?: string; warning?: boolean }) {
  return (
    <div className="min-w-0">
      <span className="text-[10px] text-muted-foreground lg:hidden">{label}</span>
      <div className={cn("text-xs font-medium", warning && "text-[hsl(var(--risk-blocked))]")}>{value}</div>
      {hint && <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
