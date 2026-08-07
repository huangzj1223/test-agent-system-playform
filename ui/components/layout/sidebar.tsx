"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ChevronDown, Settings2, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { SystemMark } from "@/components/brand";
import { IconFrame, ProductIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ProjectInfo } from "@/lib/api/types";
import type { ProductIconKey } from "@/lib/icons/icon-system";
import {
  getSidebarProjectState,
  getProjectSection,
  getProjectSectionHref,
  getWorkspaceMode,
  type ProjectSection,
} from "@/lib/navigation/project-workspace";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";

interface SidebarProps {
  projects: ProjectInfo[];
  currentProject?: ProjectInfo | null;
  onProjectChange?: (project: ProjectInfo) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const projectNavItems: Array<{
  title: string;
  section: ProjectSection;
  icon: ProductIconKey;
}> = [
  { title: "项目概览", section: "overview", icon: "overview" },
  { title: "智能测试", section: "smart-test", icon: "agents" },
  { title: "测试设计", section: "design", icon: "testCases" },
  { title: "测试执行", section: "execution", icon: "testRuns" },
  { title: "质量分析", section: "analysis", icon: "analysis" },
  { title: "项目设置", section: "settings", icon: "insights" },
];

export function Sidebar({
  projects,
  currentProject,
  onProjectChange,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { hasPerm } = useAuth();
  const workspaceMode = getWorkspaceMode(pathname);
  const currentSection = getProjectSection(pathname);
  const projectIdentifier = currentProject?.identifier ?? pathname.split("/")[2] ?? "";
  const [projectsExpanded, setProjectsExpanded] = useState(false);
  const sidebarProjects = getSidebarProjectState(projects, projectsExpanded);

  const platformItems = [
    hasPerm("ai:model:write") && { href: "/admin/models", icon: "insights" as const, label: "模型配置" },
    hasPerm("ai:memory:write") && { href: "/memory", icon: "analysis" as const, label: "记忆中心" },
    hasPerm("ai:tool:write") && { href: "/tools", icon: "testRuns" as const, label: "工具治理" },
    hasPerm("ai:skill:write") && { href: "/skills", icon: "agents" as const, label: "技能管理" },
    hasPerm("system:user:list") && { href: "/admin/users", icon: "projects" as const, label: "用户管理" },
  ].filter(Boolean) as Array<{ href: string; icon: ProductIconKey; label: string }>;

  const content = (
    <div className="flex h-full flex-col bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]">
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        {workspaceMode === "global" ? (
          <Link href="/projects" className="flex min-w-0 items-center gap-3" onClick={onMobileClose}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] shadow-[0_0_24px_hsl(var(--primary)/0.16)]">
              <SystemMark className="h-8 w-8" variant="dark" title="智能体测试系统" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">智能体测试系统</div>
              <div className="text-[10px] text-[hsl(var(--sidebar-muted))]">质量智能网络</div>
            </div>
          </Link>
        ) : (
          <Link
            href="/projects"
            className="flex min-w-0 items-center gap-2 text-sm font-medium text-[hsl(var(--sidebar-muted))] transition-colors hover:text-white"
            onClick={onMobileClose}
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span>{workspaceMode === "project" ? "返回系统总览" : "返回工作台"}</span>
          </Link>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[hsl(var(--sidebar-muted))] hover:bg-white/10 hover:text-white lg:hidden"
          onClick={onMobileClose}
          aria-label="关闭导航"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <nav className="space-y-5 px-3 py-4">
          {workspaceMode === "global" && (
            <>
              <div>
                <SectionLabel>工作台</SectionLabel>
                <SidebarLink href="/projects" icon="overview" label="系统总览" active={pathname === "/projects"} onClick={onMobileClose} />
                <SidebarLink href="/projects/spaces" icon="projects" label="项目空间" active={pathname === "/projects/spaces"} onClick={onMobileClose} />
                <SidebarLink href="/projects/agent-tasks" icon="testRuns" label="全局任务" active={pathname === "/projects/agent-tasks"} onClick={onMobileClose} />
                <SidebarLink href="/chat" icon="agents" label="智能测试" active={pathname === "/chat"} onClick={onMobileClose} />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between px-2">
                  <span className="text-[10px] font-medium tracking-[0.14em] text-[hsl(var(--sidebar-dim))]">项目入口</span>
                  <span className="text-[10px] text-[hsl(var(--sidebar-dim))]">{projects.length}</span>
                </div>
                {sidebarProjects.visibleProjects.map((project) => (
                  <ProjectEntry key={project.identifier} project={project} onClick={onMobileClose} />
                ))}
                {projects.length === 0 && (
                  <div className="px-2 py-3 text-xs text-[hsl(var(--sidebar-dim))]">暂无项目</div>
                )}
                {sidebarProjects.hasHiddenProjects && (
                  <button
                    type="button"
                    onClick={() => setProjectsExpanded((expanded) => !expanded)}
                    aria-expanded={projectsExpanded}
                    data-testid="sidebar-project-toggle"
                    className="mt-2 flex h-8 w-full items-center justify-between rounded-md px-2 text-xs font-medium text-[hsl(var(--primary))] transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]"
                  >
                    <span>{projectsExpanded ? "收起项目" : "查看全部项目"}</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", projectsExpanded && "rotate-180")} />
                  </button>
                )}
              </div>
            </>
          )}

          {workspaceMode === "project" && (
            <>
              <div>
                <SectionLabel>当前项目</SectionLabel>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-auto min-h-12 w-full justify-between border-white/10 bg-white/[0.06] px-3 py-2 text-left text-white hover:bg-white/10 hover:text-white"
                      disabled={projects.length === 0}
                      data-testid="project-switcher"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{currentProject?.name ?? projectIdentifier}</span>
                        <span className="mt-0.5 block text-[10px] text-[hsl(var(--sidebar-muted))]">{projectIdentifier}</span>
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-[hsl(var(--sidebar-muted))]" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-60">
                    {projects.map((project) => (
                      <DropdownMenuItem
                        key={project.identifier}
                        onClick={() => {
                          onProjectChange?.(project);
                          onMobileClose?.();
                        }}
                      >
                        <ProductIcon name="projects" className="mr-2 h-4 w-4" />
                        <span className="min-w-0 truncate">{project.name}</span>
                        <span className="ml-auto pl-2 text-xs text-muted-foreground">{project.identifier}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div>
                <SectionLabel>项目工作台</SectionLabel>
                {projectNavItems.map((item) => (
                  <SidebarLink
                    key={item.section}
                    href={getProjectSectionHref(projectIdentifier, item.section)}
                    icon={item.icon}
                    label={item.title}
                    active={currentSection === item.section}
                    onClick={onMobileClose}
                  />
                ))}
              </div>
            </>
          )}

          {workspaceMode === "platform" && (
            <div>
              <div className="mb-4 px-2">
                <div className="text-sm font-semibold text-white">平台管理中心</div>
                <div className="mt-1 text-[11px] leading-5 text-[hsl(var(--sidebar-muted))]">管理智能能力与平台账户</div>
              </div>
              <SectionLabel>平台能力</SectionLabel>
              {platformItems.map((item) => (
                <SidebarLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                  onClick={onMobileClose}
                />
              ))}
            </div>
          )}
        </nav>
      </ScrollArea>

      {workspaceMode === "global" && platformItems.length > 0 && (
        <div className="border-t border-white/10 p-3">
          <Link
            href={platformItems[0].href}
            onClick={onMobileClose}
            className="flex h-10 items-center gap-2.5 rounded-md px-2 text-sm text-[hsl(var(--sidebar-muted))] transition-colors hover:bg-white/[0.07] hover:text-white"
          >
            <IconFrame variant="navigation"><Settings2 className="h-4 w-4" /></IconFrame>
            <span>平台管理</span>
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside className="hidden h-full w-[228px] shrink-0 border-r border-black/10 shadow-[10px_0_34px_rgba(22,25,45,0.08)] lg:block">
        {content}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onMobileClose} aria-label="关闭导航" />
          <aside className="relative h-full w-[min(86vw,300px)] shadow-2xl">{content}</aside>
        </div>
      )}
    </>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="mb-2 px-2 text-[10px] font-medium tracking-[0.14em] text-[hsl(var(--sidebar-dim))]">{children}</div>;
}

function ProjectEntry({ project, onClick }: { project: ProjectInfo; onClick?: () => void }) {
  return (
    <Link
      href={`/projects/${project.identifier}`}
      onClick={onClick}
      className="mb-1 flex min-h-11 items-center gap-2.5 rounded-md px-2 py-1.5 text-[hsl(var(--sidebar-muted))] transition-colors hover:bg-white/[0.07] hover:text-white"
    >
      <IconFrame variant="navigation"><ProductIcon name="projects" className="h-4 w-4" /></IconFrame>
      <span className="min-w-0">
        <span className="block truncate text-sm">{project.name}</span>
        <span className="block text-[10px] text-[hsl(var(--sidebar-dim))]">{project.identifier}</span>
      </span>
    </Link>
  );
}

function SidebarLink({
  href,
  icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: ProductIconKey;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "mb-1 flex h-10 items-center gap-2.5 rounded-md px-2 text-sm text-[hsl(var(--sidebar-muted))] transition-colors hover:bg-white/[0.07] hover:text-white",
        active && "bg-[hsl(var(--sidebar-active))] font-medium text-white shadow-inner",
      )}
    >
      <IconFrame variant={active ? "navigationActive" : "navigation"}>
        <ProductIcon name={icon} className="h-4 w-4" />
      </IconFrame>
      <span className="truncate">{label}</span>
    </Link>
  );
}
