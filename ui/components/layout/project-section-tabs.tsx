"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getProjectSection, getProjectSectionTabs } from "@/lib/navigation/project-workspace";
import { cn } from "@/lib/utils";

export function ProjectSectionTabs({ projectIdentifier }: { projectIdentifier: string }) {
  const pathname = usePathname();
  const section = getProjectSection(pathname);
  const tabs = getProjectSectionTabs(section, projectIdentifier);

  if (tabs.length === 0) return null;

  return (
    <div className="shrink-0 border-b bg-background/95 px-4 sm:px-6" data-testid="project-section-tabs">
      <nav className="flex min-h-11 items-end gap-1 overflow-x-auto" aria-label="项目功能页签">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-11 shrink-0 items-center px-3 text-sm text-muted-foreground transition-colors hover:text-foreground",
                active && "font-medium text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
