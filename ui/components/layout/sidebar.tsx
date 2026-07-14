"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ProjectInfo } from "@/lib/api/types";
import type { ProductIconKey } from "@/lib/icons/icon-system";
import { SystemMark } from "@/components/brand";
import { IconFrame, ProductIcon, StatusIcon } from "@/components/icons";

interface SidebarProps {
  projects: ProjectInfo[];
  currentProject?: ProjectInfo | null;
  onProjectChange?: (project: ProjectInfo) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const projectNavItems: Array<{ title: string; href: string; icon: ProductIconKey }> = [
  { title: "项目洞察", href: "", icon: "insights" },
  { title: "测试用例", href: "/test-cases", icon: "testCases" },
  { title: "API 测试", href: "/api-tests", icon: "apiTests" },
  { title: "Web 测试", href: "/web-tests", icon: "webTests" },
  { title: "渗透测试", href: "/pentest", icon: "pentest" },
  { title: "测试运行", href: "/test-runs", icon: "testRuns" },
  { title: "测试计划", href: "/test-plans", icon: "testPlans" },
  { title: "测试报告", href: "/reports", icon: "reports" },
  { title: "全栈分析", href: "/fullstack-analysis", icon: "analysis" },
];

export function Sidebar({ projects, currentProject, onProjectChange, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const projectHref = (suffix: string) => currentProject ? `/projects/${currentProject.identifier}${suffix}` : "#";

  const content = (
    <div className="flex h-full flex-col bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]">
      <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
        <Link href="/projects" className="flex min-w-0 items-center gap-3" onClick={onMobileClose}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] shadow-[0_0_24px_hsl(var(--primary)/0.16)]">
            <SystemMark className="h-8 w-8" variant="dark" title="智能体测试系统" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">智能体测试系统</div>
            <div className="text-[10px] text-[hsl(var(--sidebar-muted))]">质量智能网络</div>
          </div>
        </Link>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-[hsl(var(--sidebar-muted))] hover:bg-white/10 hover:text-white lg:hidden" onClick={onMobileClose} aria-label="关闭导航">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <nav className="space-y-5 px-3 py-4">
          <div>
            <div className="mb-2 px-2 text-[10px] font-medium tracking-[0.14em] text-[hsl(var(--sidebar-dim))]">全局工作区</div>
            <SidebarLink href="/projects" icon="overview" label="系统总览" active={pathname === "/projects"} onClick={onMobileClose} />
            <SidebarLink href="/projects/agent-tasks" icon="agents" label="智能体任务" active={pathname === "/projects/agent-tasks"} onClick={onMobileClose} />
            <SidebarLink href="/projects/spaces" icon="projects" label="项目空间" active={pathname === "/projects/spaces"} onClick={onMobileClose} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between px-2 text-[10px] font-medium tracking-[0.14em] text-[hsl(var(--sidebar-dim))]"><span>当前项目</span><span>{projects.length}</span></div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 w-full justify-between border-white/10 bg-white/[0.06] px-3 text-sm text-white hover:bg-white/10 hover:text-white" disabled={projects.length === 0}>
                  <span className="truncate">{currentProject?.name || (projects.length ? "选择项目" : "暂无项目")}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-[hsl(var(--sidebar-muted))]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                {projects.map((project) => (
                  <DropdownMenuItem key={project.identifier} onClick={() => { onProjectChange?.(project); onMobileClose?.(); }}>
                    <ProductIcon name="projects" className="mr-2 h-4 w-4" />
                    <span className="truncate">{project.name}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {currentProject && (
            <div>
              <div className="mb-2 px-2 text-[10px] font-medium tracking-[0.14em] text-[hsl(var(--sidebar-dim))]">项目导航</div>
              {projectNavItems.map((item) => {
                const href = projectHref(item.href);
                const active = item.href ? pathname.startsWith(href) : pathname === href;
                return <SidebarLink key={item.title} href={href} icon={item.icon} label={item.title} active={active} onClick={onMobileClose} />;
              })}
            </div>
          )}
        </nav>
      </ScrollArea>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-2.5 text-xs">
          <StatusIcon status="running" />
          <div className="min-w-0"><div className="font-medium text-white">质量闭环在线</div><div className="truncate text-[10px] text-[hsl(var(--sidebar-muted))]">执行、分析与修复链路已连接</div></div>
        </div>
        <Link href="/settings" onClick={onMobileClose} className={cn("mb-1 flex h-9 items-center gap-2.5 rounded-lg px-3 text-sm text-[hsl(var(--sidebar-muted))] transition-colors hover:bg-white/[0.07] hover:text-white", pathname === "/settings" && "bg-[hsl(var(--sidebar-active))] font-medium text-white")}>
          <IconFrame variant={pathname === "/settings" ? "navigationActive" : "navigation"}><Settings className="h-4 w-4" /></IconFrame>
          <span>系统设置</span>
        </Link>
      </div>
    </div>
  );

  return <><aside className="hidden h-full w-[228px] shrink-0 border-r border-black/10 shadow-[10px_0_34px_rgba(22,25,45,0.08)] lg:block">{content}</aside>{mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button type="button" className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onMobileClose} aria-label="关闭导航" /><aside className="relative h-full w-[min(86vw,300px)] shadow-2xl">{content}</aside></div>}</>;
}

function SidebarLink({ href, icon, label, active, onClick }: { href: string; icon: ProductIconKey; label: string; active: boolean; onClick?: () => void }) {
  return <Link href={href} onClick={onClick} className={cn("mb-1 flex h-10 items-center gap-2.5 rounded-lg px-2 text-sm text-[hsl(var(--sidebar-muted))] transition-colors hover:bg-white/[0.07] hover:text-white", active && "bg-[hsl(var(--sidebar-active))] font-medium text-white shadow-inner")}>
    <IconFrame variant={active ? "navigationActive" : "navigation"}><ProductIcon name={icon} className="h-4 w-4" /></IconFrame>
    <span className="truncate">{label}</span>
  </Link>;
}
