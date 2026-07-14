import { Boxes, Braces, BrainCircuit, CalendarRange, ChartNoAxesCombined, CirclePlay, ListChecks, Orbit, PanelsTopLeft, Radar, ScanSearch, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ProductIconKey } from "@/lib/icons/icon-system";

export const productIcons: Record<ProductIconKey, LucideIcon> = {
  overview: Orbit,
  agents: BrainCircuit,
  projects: Boxes,
  insights: Radar,
  testCases: ListChecks,
  apiTests: Braces,
  webTests: PanelsTopLeft,
  pentest: ShieldCheck,
  testRuns: CirclePlay,
  testPlans: CalendarRange,
  reports: ChartNoAxesCombined,
  analysis: ScanSearch,
};

export function ProductIcon({ name, className }: { name: ProductIconKey; className?: string }) {
  const Icon = productIcons[name];
  return <Icon className={className} strokeWidth={1.8} />;
}
