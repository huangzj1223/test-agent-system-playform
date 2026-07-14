"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { DashboardWorkItem } from "@/lib/api/dashboard";
import { formatRelativeTime } from "@/lib/dashboard/model";
import { cn } from "@/lib/utils";
import { ProductIcon, StatusIcon } from "@/components/icons";
import type { ProductIconKey } from "@/lib/icons/icon-system";

const groups = [
  { key: "review", label: "需要我审核", icon: "analysis" },
  { key: "handle", label: "需要我处理", icon: "agents" },
  { key: "watch", label: "我正在观察", icon: "overview" },
] as const;

export function PersonalWorkbench({ items }: { items: DashboardWorkItem[] }) {
  const firstNonEmpty = groups.find((group) => items.some((item) => item.group === group.key));
  const [active, setActive] = useState<(typeof groups)[number]["key"]>(firstNonEmpty?.key ?? "review");
  const visibleItems = items.filter((item) => item.group === active);

  return (
    <div className="min-h-[306px]">
      <div className="grid grid-cols-3 border-b p-2">
        {groups.map((group) => {
          const count = items.filter((item) => item.group === group.key).length;
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => setActive(group.key)}
              className={cn(
                "flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] text-muted-foreground transition-colors sm:text-xs",
                active === group.key && "bg-[hsl(var(--accent))] font-medium text-[hsl(var(--accent-foreground))]"
              )}
            >
              <ProductIcon name={group.icon as ProductIconKey} className="h-3.5 w-3.5" />
              <span className="truncate">{group.label}</span>
              <span className="rounded bg-background/70 px-1.5 py-0.5 text-[9px]">{count}</span>
            </button>
          );
        })}
      </div>
      <div className="divide-y">
        {visibleItems.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center px-5 text-center">
            <StatusIcon status="completed" className="[&_svg]:h-9 [&_svg]:w-9" />
            <p className="mt-3 text-sm font-medium">这一组任务已处理完成</p>
            <p className="mt-1 text-xs text-muted-foreground">新的智能体任务需要人工参与时会出现在这里。</p>
          </div>
        ) : (
          visibleItems.slice(0, 5).map((item) => (
            <Link key={item.id} href={item.href} className="group flex items-start justify-between gap-3 px-4 py-3 hover:bg-[hsl(var(--muted)/0.35)]">
              <div className="min-w-0">
                <div className="truncate text-xs font-medium">{item.title}</div>
                <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{item.description}</p>
                <div className="mt-1.5 text-[10px] text-muted-foreground">{item.project_name} · {formatRelativeTime(item.created_at)}</div>
              </div>
              <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-45 group-hover:text-[hsl(var(--primary))] group-hover:opacity-100" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
