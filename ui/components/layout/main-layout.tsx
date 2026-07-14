
"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useProjectContext } from "@/lib/context/project-context";
import type { ProjectInfo } from "@/lib/api/types";
import { extractProjectIdentifier } from "@/lib/dashboard/global-workspace";

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  headerContent?: React.ReactNode;
}

export function MainLayout({ children, title, headerContent }: MainLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { projects } = useProjectContext();
  const [currentProject, setCurrentProject] = React.useState<ProjectInfo | null>(null);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // 从 URL 中提取项目 ID 并设置当前项目
  const projectIdFromUrl = React.useMemo(() => {
    return extractProjectIdentifier(pathname);
  }, [pathname]);

  React.useEffect(() => {
    if (projectIdFromUrl && projects.length > 0) {
      const project = projects.find((p) => p.identifier === projectIdFromUrl);
      if (project) {
        setCurrentProject(project);
      }
    } else if (!projectIdFromUrl) {
      setCurrentProject(null);
    }
  }, [projectIdFromUrl, projects]);

  // 处理项目切换
  const handleProjectChange = (project: ProjectInfo) => {
    setCurrentProject(project);
    router.push(`/projects/${project.identifier}`);
  };

  return (
    <div className="app-surface flex h-screen overflow-hidden">
      <Sidebar
        projects={projects}
        currentProject={currentProject}
        onProjectChange={handleProjectChange}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="min-w-0 flex flex-1 flex-col overflow-hidden">
        <Header title={title} onMenuClick={() => setMobileOpen(true)}>{headerContent}</Header>
        <main className="flex-1 overflow-auto px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
