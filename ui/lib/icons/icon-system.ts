export const productIconNames = {
  overview: "Orbit",
  agents: "BrainCircuit",
  projects: "Boxes",
  insights: "Radar",
  testCases: "ListChecks",
  apiTests: "Braces",
  webTests: "PanelsTopLeft",
  pentest: "ShieldCheck",
  testRuns: "CirclePlay",
  testPlans: "CalendarRange",
  reports: "ChartNoAxesCombined",
  analysis: "ScanSearch",
} as const;

export const statusIconNames = {
  running: "LoaderCircle",
  ready: "CircleDot",
  completed: "CircleCheckBig",
  attention: "TriangleAlert",
  blocked: "OctagonX",
  idle: "CircleDashed",
  unavailable: "Unplug",
} as const;

export type ProductIconKey = keyof typeof productIconNames;
export type ProductStatus = keyof typeof statusIconNames;

export const testCaseStateStatus = {
  new: "ready",
  review_pending: "attention",
  reviewed: "completed",
  not_run: "idle",
  passed: "completed",
  failed: "blocked",
  blocked: "blocked",
  skipped: "idle",
} as const satisfies Record<string, ProductStatus>;

export const priorityTones = {
  critical: "blocked",
  high: "high",
  medium: "attention",
  low: "completed",
} as const;
