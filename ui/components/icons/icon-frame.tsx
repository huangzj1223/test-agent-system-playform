import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const variants = {
  navigation: "h-7 w-7 rounded-md bg-white/[0.06] text-[hsl(var(--sidebar-muted))]",
  navigationActive: "h-7 w-7 rounded-md bg-[hsl(var(--primary))] text-white shadow-[0_0_18px_hsl(var(--primary)/0.2)]",
  feature: "h-10 w-10 rounded-lg bg-[hsl(var(--accent))] text-[hsl(var(--primary))]",
  status: "h-8 w-8 rounded-lg bg-[hsl(var(--muted))] text-muted-foreground",
  plain: "h-8 w-8 text-current",
};

export function IconFrame({ children, variant = "feature", className }: { children: ReactNode; variant?: keyof typeof variants; className?: string }) {
  return <span className={cn("inline-flex shrink-0 items-center justify-center", variants[variant], className)}>{children}</span>;
}
