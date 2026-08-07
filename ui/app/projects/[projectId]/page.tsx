"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Database,
  FileText,
  Filter,
  FolderKanban,
  Globe,
  Info,
  Layers,
  MoreVertical,
  PlayCircle,
  RefreshCw,
  Share2,
  Shield,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { IconFrame } from "@/components/icons";
import { MainLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getProject } from "@/lib/api/projects";
import { getTestCases } from "@/lib/api/testCases";
import { listTestRuns } from "@/lib/api/testRuns";
import type { ProjectInfo, TestCaseInfo, TestRunListInfo } from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";

const S = {
  loadFailed: "\u52a0\u8f7d\u9879\u76ee\u6d1e\u5bdf\u5931\u8d25",
  loading: "\u52a0\u8f7d\u9879\u76ee\u6d1e\u5bdf...",
  notFound: "\u9879\u76ee\u4e0d\u5b58\u5728\u6216\u5df2\u88ab\u5220\u9664",
  pageTitle: "\u9879\u76ee\u6d1e\u5bdf",
  overview: "\u6982\u89c8",
  automation: "\u81ea\u52a8\u5316\u5065\u5eb7\u72b6\u6001",
  errors: "\u72ec\u7279\u9519\u8bef",
  defaultDashboard: "\u9ed8\u8ba4\u4eea\u8868\u76d8",
  custom: "\u81ea\u5b9a\u4e49",
  filters: "\u7b5b\u9009\u6761\u4ef6",
  share: "\u5206\u4eab",
  copied: "\u9875\u9762\u94fe\u63a5\u5df2\u590d\u5236",
  copyFailed: "\u590d\u5236\u5931\u8d25\uff0c\u8bf7\u624b\u52a8\u590d\u5236\u5730\u5740",
  allTypes: "\u5168\u90e8\u7c7b\u578b",
  allRuns: "\u5168\u90e8\u8fd0\u884c",
  activeRunsOnly: "\u4ec5\u6d3b\u8dc3\u8fd0\u884c",
  closedRunsOnly: "\u4ec5\u5df2\u5173\u95ed\u8fd0\u884c",
  resetFilters: "\u91cd\u7f6e\u7b5b\u9009",
  insightTitle: "\u63a5\u5165\u66f4\u591a\u6d4b\u8bd5\u7ed3\u679c\uff0c\u89e3\u9501\u7f3a\u5931\u6d1e\u5bdf\uff0c\u63d0\u5347\u9879\u76ee\u6d4b\u8bd5\u7a33\u5b9a\u6027",
  insightDesc: "\u8fd9\u91cc\u5df2\u4ece\u5f53\u524d\u9879\u76ee\u7684\u7528\u4f8b\u5e93\u548c\u6d4b\u8bd5\u8fd0\u884c\u8bb0\u5f55\u4e2d\u805a\u5408\u7edf\u8ba1\u3002\u540e\u7eed\u53ef\u7ee7\u7eed\u63a5\u5165\u63a5\u53e3\u3001\u573a\u666f\u3001\u9875\u9762\u548c\u6301\u7eed\u96c6\u6210\u6d4b\u8bd5\u7ed3\u679c\uff0c\u51cf\u5c11\u8d28\u91cf\u76f2\u533a\u3002",
  tryNow: "\u7acb\u5373\u63a5\u5165",
  learnMore: "\u4e86\u89e3\u66f4\u591a",
  automationCoverage: "\u81ea\u52a8\u5316\u8986\u76d6\u7387",
  automatedCases: "\u81ea\u52a8\u5316\u6d4b\u8bd5\u7528\u4f8b",
  manualCases: "\u624b\u52a8\u6d4b\u8bd5\u7528\u4f8b",
  totalCases: "\u603b\u6d4b\u8bd5\u7528\u4f8b",
  activeRuns: "\u6d3b\u8dc3\u7684\u6d4b\u8bd5\u8fd0\u884c",
  closedRuns: "\u5df2\u5173\u95ed\u7684\u6d4b\u8bd5\u8fd0\u884c",
  caseType: "\u6d4b\u8bd5\u7528\u4f8b\u7c7b\u578b",
  caseTrend: "\u6d4b\u8bd5\u7528\u4f8b\u8d8b\u52bf",
  defectsLogged: "\u5df2\u8bb0\u5f55\u7684\u7f3a\u9677",
  modules: "\u5de5\u4f5c\u533a\u5165\u53e3",
  currentProject: "\u5f53\u524d\u9879\u76ee",
  resultStats: "\u7ed3\u679c\u7edf\u8ba1",
  passed: "\u901a\u8fc7",
  untested: "\u672a\u6d4b\u8bd5",
  failed: "\u5931\u8d25",
  skipped: "\u5df2\u8df3\u8fc7",
  blocked: "\u963b\u585e",
  inProgress: "\u8fdb\u884c\u4e2d",
  retest: "\u91cd\u6d4b",
  noData: "\u6682\u65e0\u6570\u636e",
  runningNow: "\u6b63\u5728\u8fd0\u884c",
  allClosed: "\u5df2\u5f62\u6210\u95ed\u73af",
  failedRuns: "\u5931\u8d25\u8fd0\u884c",
  uniqueErrors: "\u72ec\u7279\u9519\u8bef",
  month: "\u6708",
};

const caseTypeLabels: Record<string, string> = {
  functional: "\u529f\u80fd",
  smoke_sanity: "\u5192\u70df\u4e0e\u5065\u5168\u6027",
  regression: "\u56de\u5f52",
  security: "\u5b89\u5168",
  performance: "\u6027\u80fd",
  usability: "\u53ef\u7528\u6027",
  acceptance: "\u9a8c\u6536",
  compatibility: "\u517c\u5bb9\u6027",
  integration: "\u96c6\u6210",
  exploratory: "\u63a2\u7d22\u6027",
  other: "\u5176\u4ed6",
};

const typeColors = ["hsl(var(--primary))", "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--info))", "hsl(var(--muted-foreground))", "hsl(var(--success))", "hsl(var(--chart-1))", "hsl(var(--warning))"];
const timeRanges = [
  { value: "1D", label: "1\u5929" },
  { value: "7D", label: "7\u5929" },
  { value: "30D", label: "30\u5929" },
  { value: "3M", label: "3\u4e2a\u6708" },
  { value: "1Y", label: "1\u5e74" },
  { value: "2Y", label: "2\u5e74" },
  { value: "Custom", label: S.custom },
];

function pct(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 10000) / 100;
}

function toDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const month = Number(key.split("-")[1]);
  return `${month}${S.month}`;
}

function buildMonths(range: string) {
  const count = range === "1D" || range === "7D" || range === "30D" ? 6 : range === "3M" ? 3 : range === "1Y" ? 12 : 24;
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - count + 1 + index, 1);
    return monthKey(date);
  });
}

function startDateForRange(range: string) {
  const now = new Date();
  const days = range === "1D" ? 1 : range === "7D" ? 7 : range === "30D" ? 30 : range === "3M" ? 92 : range === "1Y" ? 365 : 730;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function svgLinePoints(values: number[], width: number, height: number, padding = 34) {
  const max = Math.max(1, ...values);
  return values
    .map((value, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(1, values.length - 1);
      const y = height - padding - (value / max) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

export default function ProjectOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const [resolvedProjectId, setResolvedProjectId] = React.useState(projectId);
  const [project, setProject] = React.useState<ProjectInfo | null>(null);
  const [testCases, setTestCases] = React.useState<TestCaseInfo[]>([]);
  const [testRuns, setTestRuns] = React.useState<TestRunListInfo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState("overview");
  const [activeRange, setActiveRange] = React.useState("30D");
  const [showTip, setShowTip] = React.useState(true);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [caseTypeFilter, setCaseTypeFilter] = React.useState("all");
  const [runStateFilter, setRunStateFilter] = React.useState("all");

  React.useEffect(() => {
    const loadProject = async () => {
      try {
        setLoading(true);
        let lookupId = projectId;
        let projectRes;
        try {
          projectRes = await getProject(lookupId);
        } catch (error) {
          if (error instanceof ApiError && error.status === 404 && /^PR\d+$/i.test(projectId)) {
            lookupId = projectId.replace(/^PR/i, "PR-");
            projectRes = await getProject(lookupId);
          } else {
            throw error;
          }
        }

        if (projectRes.success) {
          setProject(projectRes.data);
          setResolvedProjectId(projectRes.data.identifier);
        }

        const [caseRes, runRes] = await Promise.allSettled([
          getTestCases(lookupId, { p: 1, page_size: 300 }),
          listTestRuns(lookupId, { p: 1, page_size: 300, include_closed: true }),
        ]);

        if (caseRes.status === "fulfilled" && caseRes.value.success) {
          setTestCases(caseRes.value.data || caseRes.value.test_cases || []);
        } else {
          setTestCases([]);
          console.error("Failed to load project test cases:", caseRes.status === "rejected" ? caseRes.reason : caseRes.value);
        }

        if (runRes.status === "fulfilled") {
          setTestRuns(runRes.value.data || []);
        } else {
          setTestRuns([]);
          console.error("Failed to load project test runs:", runRes.reason);
        }
      } catch (error) {
        console.error("Failed to load project insights:", error);
        toast.error(S.loadFailed);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) loadProject();
  }, [projectId]);

  const startDate = React.useMemo(() => startDateForRange(activeRange), [activeRange]);
  const visibleCases = React.useMemo(() => {
    return testCases.filter((item) => {
      const created = toDate(item.created_at);
      const inRange = !created || created >= startDate;
      const typeMatch = caseTypeFilter === "all" || item.case_type === caseTypeFilter;
      return inRange && typeMatch;
    });
  }, [testCases, startDate, caseTypeFilter]);

  const visibleRuns = React.useMemo(() => {
    return testRuns.filter((item) => {
      const date = toDate(item.closed_at || item.created_at);
      const inRange = !date || date >= startDate;
      const stateMatch =
        runStateFilter === "all" ||
        (runStateFilter === "active" && item.active_state !== "closed") ||
        (runStateFilter === "closed" && item.active_state === "closed");
      return inRange && stateMatch;
    });
  }, [testRuns, startDate, runStateFilter]);

  const totalCases = visibleCases.length || project?.test_cases_count || 0;
  const automatedCases = visibleCases.filter((item) => item.automation_status === "automated").length;
  const manualCases = Math.max(0, totalCases - automatedCases);
  const automationCoverage = pct(automatedCases, totalCases);
  const runProgress = visibleRuns.reduce(
    (sum, run) => {
      const p = run.overall_progress;
      sum.untested += p.untested || 0;
      sum.passed += p.passed || 0;
      sum.failed += p.failed || 0;
      sum.skipped += p.skipped || 0;
      sum.blocked += p.blocked || 0;
      sum.in_progress += p.in_progress || 0;
      sum.retest += p.retest || 0;
      return sum;
    },
    { untested: 0, passed: 0, failed: 0, skipped: 0, blocked: 0, in_progress: 0, retest: 0 }
  );
  const progressTotal = Object.values(runProgress).reduce((sum, value) => sum + value, 0);
  const activeRunCount = visibleRuns.filter((run) => run.active_state !== "closed").length;
  const closedRunCount = visibleRuns.filter((run) => run.active_state === "closed").length;
  const failedRunCount = visibleRuns.filter((run) => (run.overall_progress.failed || 0) > 0).length;
  const uniqueErrorCount = new Set(
    visibleRuns
      .filter((run) => (run.overall_progress.failed || 0) > 0)
      .map((run) => `${run.name}-${run.overall_progress.failed}`)
  ).size;

  const months = React.useMemo(() => buildMonths(activeRange), [activeRange]);
  const caseTypeRows = React.useMemo(() => {
    const counts = new Map<string, number>();
    visibleCases.forEach((item) => counts.set(item.case_type || "other", (counts.get(item.case_type || "other") || 0) + 1));
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type, value], index) => ({
        label: caseTypeLabels[type] || caseTypeLabels.other,
        value,
        color: typeColors[index % typeColors.length],
      }));
  }, [visibleCases]);

  const closedRunMonthly = months.map((key) =>
    visibleRuns.filter((run) => run.active_state === "closed" && monthKey(toDate(run.closed_at || run.created_at) || new Date()) === key).length
  );
  const defectsMonthly = months.map((key) =>
    visibleRuns
      .filter((run) => monthKey(toDate(run.closed_at || run.created_at) || new Date()) === key)
      .reduce((sum, run) => sum + (run.overall_progress.failed || 0), 0)
  );
  const caseTrendTotal = months.map((key) => visibleCases.filter((item) => monthKey(toDate(item.created_at) || new Date()) <= key).length);
  const automatedTrend = months.map((key) => visibleCases.filter((item) => item.automation_status === "automated" && monthKey(toDate(item.created_at) || new Date()) <= key).length);
  const manualTrend = months.map((key) => visibleCases.filter((item) => item.automation_status !== "automated" && monthKey(toDate(item.created_at) || new Date()) <= key).length);

  const donutSegments = [
    { label: S.passed, value: runProgress.passed, color: `hsl(var(--success))` },
    { label: S.untested, value: runProgress.untested || Math.max(0, totalCases - progressTotal), color: `hsl(var(--muted))` },
    { label: S.failed, value: runProgress.failed, color: `hsl(var(--destructive))` },
    { label: S.skipped, value: runProgress.skipped, color: `hsl(var(--muted-foreground))` },
    { label: S.blocked, value: runProgress.blocked, color: `hsl(var(--warning))` },
  ];
  const donutTotal = Math.max(1, donutSegments.reduce((sum, item) => sum + item.value, 0));
  let current = 0;
  const donut = `conic-gradient(${donutSegments
    .map((item) => {
      const start = current;
      current += (item.value / donutTotal) * 100;
      return `${item.color} ${start}% ${current}%`;
    })
    .join(", ")})`;

  const tabs = [
    { id: "overview", label: S.overview },
    { id: "automation", label: S.automation },
    { id: "errors", label: S.errors },
  ];

  const metrics = [
    { title: S.automationCoverage, value: `${automationCoverage}%`, sub: "\u81ea\u52a8\u5316\u7528\u4f8b / \u603b\u7528\u4f8b", icon: Activity },
    { title: S.automatedCases, value: automatedCases, sub: "\u5df2\u5177\u5907\u811a\u672c\u6216\u53ef\u81ea\u52a8\u6267\u884c", icon: Bot },
    { title: S.manualCases, value: manualCases, sub: "\u5f85\u8f6c\u5316\u4e3a\u81ea\u52a8\u5316\u8d44\u4ea7", icon: FileText },
    { title: S.totalCases, value: totalCases, sub: "\u5f53\u524d\u7b5b\u9009\u8303\u56f4\u5185\u7684\u7528\u4f8b", icon: BarChart3 },
  ];

  const errorMetrics = [
    { title: S.failedRuns, value: failedRunCount, icon: XCircle },
    { title: S.uniqueErrors, value: uniqueErrorCount, icon: Shield },
    { title: S.closedRuns, value: closedRunCount, icon: CheckCircle2 },
    { title: S.activeRuns, value: activeRunCount, icon: PlayCircle },
  ];

  const modules = [
    { title: "\u6d4b\u8bd5\u7528\u4f8b", text: "\u7ba1\u7406\u7528\u4f8b\u5e93\u3001\u667a\u80fd\u751f\u6210\u7528\u4f8b\u3001\u5bfc\u5165\u5bfc\u51fa", icon: FileText, href: "test-cases" },
    { title: "\u63a5\u53e3\u6d4b\u8bd5", text: "\u89e3\u6790\u63a5\u53e3\u6587\u6863\u3001\u751f\u6210\u811a\u672c\u3001\u6279\u91cf\u5bfc\u51fa", icon: Database, href: "api-tests" },
    { title: "\u9875\u9762\u6d4b\u8bd5", text: "\u7ef4\u62a4\u9875\u9762\u529f\u80fd\u548c UI \u81ea\u52a8\u5316\u811a\u672c", icon: Globe, href: "web-tests" },
    { title: "\u6d4b\u8bd5\u8fd0\u884c", text: "\u6267\u884c\u8ba1\u5212\u3001\u7ed3\u679c\u5206\u6790\u3001\u5931\u8d25\u4fee\u590d\u95ed\u73af", icon: PlayCircle, href: "test-runs" },
    { title: "\u6e17\u900f\u6d4b\u8bd5", text: "\u5b89\u5168\u4efb\u52a1\u3001\u6f0f\u6d1e\u8ddf\u8e2a\u3001\u62a5\u544a\u8f93\u51fa", icon: Shield, href: "pentest" },
    { title: "\u5168\u6808\u5206\u6790", text: "\u5173\u8054\u63a5\u53e3\u3001\u9875\u9762\u3001\u811a\u672c\u4e0e\u8d28\u91cf\u753b\u50cf", icon: Layers, href: "fullstack-analysis" },
  ];

  const sharePage = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(S.copied);
    } catch {
      toast.error(S.copyFailed);
    }
  };

  const resetDashboard = () => {
    setActiveTab("overview");
    setActiveRange("30D");
    setCaseTypeFilter("all");
    setRunStateFilter("all");
    setShowTip(true);
  };

  return (
    <MainLayout title={project?.name || S.pageTitle}>
      {loading ? (
        <div className="flex h-96 items-center justify-center text-muted-foreground">{S.loading}</div>
      ) : !project ? (
        <div className="flex h-96 items-center justify-center text-muted-foreground">{S.notFound}</div>
      ) : (
        <div data-testid="project-insight-page" className="mx-auto max-w-[1720px] space-y-5 pb-8">
          <section>
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
              <div>
                <div className="text-[11px] font-medium text-[hsl(var(--primary))]">项目质量工作台</div>
                <h1 className="mt-2 text-2xl font-semibold tracking-normal text-foreground">{S.pageTitle}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {S.currentProject}: {project.name} - {project.description || "\u805a\u5408\u6d4b\u8bd5\u8d44\u4ea7\u3001\u8fd0\u884c\u7ed3\u679c\u3001\u81ea\u52a8\u5316\u5065\u5eb7\u72b6\u6001\u548c\u8d28\u91cf\u98ce\u9669"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={sharePage}>
                <Share2 className="mr-2 h-4 w-4" />
                {S.share}
              </Button>
            </div>

            <div className="mt-5 flex min-h-11 gap-1 border-b" role="tablist" aria-label="项目洞察视图">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex h-11 items-center px-4 text-sm transition-colors ${
                    activeTab === tab.id ? "font-medium text-foreground after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:bg-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-5">
            <div className="workspace-panel flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" className="h-9 min-w-44 justify-between" onClick={resetDashboard}>
                  {S.defaultDashboard}
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                </Button>
                <div className="inline-flex overflow-hidden rounded-md border bg-background">
                  {timeRanges.map((range) => (
                    <button
                      key={range.value}
                      type="button"
                      onClick={() => setActiveRange(range.value)}
                      className={`h-9 border-r px-4 text-xs font-medium last:border-r-0 ${
                        activeRange === range.value ? "bg-[hsl(var(--accent))] text-[hsl(var(--primary))]" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen}>
                  <Filter className="mr-2 h-4 w-4" />
                  {S.filters}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9" aria-label="更多洞察操作">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={resetDashboard}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {S.resetFilters}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {filtersOpen && (
                  <div className="absolute right-0 top-11 z-20 w-72 rounded-lg border bg-background p-4 shadow-xl">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-semibold text-foreground">{S.filters}</div>
                      <button type="button" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setFiltersOpen(false)} aria-label="关闭筛选条件">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="insight-case-type" className="text-xs font-medium text-foreground">{S.caseType}</label>
                        <select id="insight-case-type" value={caseTypeFilter} onChange={(event) => setCaseTypeFilter(event.target.value)} className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm">
                          <option value="all">{S.allTypes}</option>
                          {Object.entries(caseTypeLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="insight-run-state" className="text-xs font-medium text-foreground">{S.activeRuns}</label>
                        <select id="insight-run-state" value={runStateFilter} onChange={(event) => setRunStateFilter(event.target.value)} className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm">
                          <option value="all">{S.allRuns}</option>
                          <option value="active">{S.activeRunsOnly}</option>
                          <option value="closed">{S.closedRunsOnly}</option>
                        </select>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setCaseTypeFilter("all");
                          setRunStateFilter("all");
                        }}
                      >
                        {S.resetFilters}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {activeTab === "overview" && showTip && (
              <div className="workspace-panel relative overflow-hidden border-l-2 border-l-[hsl(var(--primary))]">
                <button type="button" className="absolute right-4 top-4 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setShowTip(false)} aria-label="关闭接入提示">
                  <X className="h-4 w-4" />
                </button>
                <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.15fr_0.85fr]">
                  <div>
                    <div className="text-[11px] font-medium text-[hsl(var(--primary))]">覆盖度建议</div>
                    <h2 className="mt-2 max-w-3xl text-xl font-semibold leading-snug text-foreground">{S.insightTitle}</h2>
                    <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">{S.insightDesc}</p>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Button className="btn-ai h-10 px-5" onClick={() => router.push(`/projects/${resolvedProjectId}/api-tests`)}>
                        {S.tryNow}
                      </Button>
                      <button type="button" onClick={() => document.getElementById("workspace-modules")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-[hsl(var(--primary))]">
                        {S.learnMore}
                        <ArrowUpRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="hidden items-center justify-center border-l bg-muted/20 p-5 lg:flex">
                    <div className="w-full max-w-md rounded-lg border bg-background p-5">
                      <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold">
                        <Badge className="bg-[hsl(var(--accent))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))]">端到端测试</Badge>
                        <Badge className="bg-[hsl(var(--risk-warning)/0.14)] text-[hsl(32_76%_38%)] hover:bg-[hsl(var(--risk-warning)/0.14)]">单元测试</Badge>
                        <Badge className="bg-[hsl(var(--loop-complete)/0.12)] text-[hsl(78_56%_32%)] hover:bg-[hsl(var(--loop-complete)/0.12)]">接口测试</Badge>
                      </div>
                      <div className="space-y-3">
                        {[0, 1, 2].map((row) => (
                          <div key={row} className="flex items-center gap-3">
                            <div className="h-3 w-3 rounded-full bg-[hsl(var(--primary)/0.18)]" />
                            <div className="h-3 flex-1 rounded-full bg-[hsl(var(--muted))]" />
                            <div className="h-3 w-16 rounded-full bg-[hsl(var(--muted))]" />
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 grid grid-cols-3 gap-3">
                        {["\u6d4b\u8bd5", "\u6458\u8981", "\u7ec4\u4ef6"].map((item) => (
                          <div key={item} className="rounded-md border bg-muted/15 p-3">
                            <div className="text-xs font-medium text-foreground">{item}</div>
                            <div className="mt-3 h-2 rounded-full bg-[hsl(var(--muted))]" />
                            <div className="mt-2 h-2 w-2/3 rounded-full bg-[hsl(var(--muted))]" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {(activeTab === "errors" ? errorMetrics : metrics).map((metric) => (
                <div key={metric.title} className="workspace-panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold leading-tight text-foreground">
                        <span>{metric.title}</span>
                        <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </div>
                      <div className="mt-4 text-3xl font-semibold tracking-normal text-foreground">{metric.value}</div>
                      {"sub" in metric && <div className="mt-2 text-xs text-muted-foreground">{metric.sub}</div>}
                    </div>
                    <IconFrame variant="plain" className="h-9 w-9 rounded-lg bg-[hsl(var(--accent))] text-[hsl(var(--primary))]">
                      <metric.icon className="h-4 w-4" />
                    </IconFrame>
                  </div>
                </div>
              ))}
            </div>

            {activeTab === "overview" && (
              <>
                <div className="grid gap-6 xl:grid-cols-2">
                  <DonutCard title={S.activeRuns} center={donutTotal} segments={donutSegments} background={donut} />
                  <LineChartCard title={S.closedRuns} months={months} series={[{ label: S.closedRuns, values: closedRunMonthly, color: `hsl(var(--primary))` }]} />
                </div>
                <div className="grid gap-6 xl:grid-cols-2">
                  <DonutCard title={S.caseType} center={totalCases} segments={caseTypeRows} />
                  <LineChartCard
                    title={S.caseTrend}
                    months={months}
                    series={[
                      { label: S.totalCases, values: caseTrendTotal, color: `hsl(var(--muted-foreground))` },
                      { label: S.automatedCases, values: automatedTrend, color: `hsl(var(--chart-1))` },
                      { label: S.manualCases, values: manualTrend, color: `hsl(var(--chart-2))` },
                    ]}
                  />
                </div>
                <BarChartCard title={S.defectsLogged} months={months} values={defectsMonthly} color={`hsl(var(--risk-warning))`} wide />
              </>
            )}

            {activeTab === "automation" && (
              <div className="grid gap-6 xl:grid-cols-2">
                <DonutCard title={S.caseType} center={totalCases} segments={caseTypeRows} />
                <LineChartCard
                  title={S.caseTrend}
                  months={months}
                  series={[
                    { label: S.totalCases, values: caseTrendTotal, color: `hsl(var(--muted-foreground))` },
                    { label: S.automatedCases, values: automatedTrend, color: `hsl(var(--chart-1))` },
                    { label: S.manualCases, values: manualTrend, color: `hsl(var(--chart-2))` },
                  ]}
                />
              </div>
            )}

            {activeTab === "errors" && <BarChartCard title={S.defectsLogged} months={months} values={defectsMonthly} color={`hsl(var(--risk-warning))`} />}

            <div id="workspace-modules" className="workspace-panel scroll-mt-20 overflow-hidden">
              <div className="flex min-h-16 items-center justify-between gap-4 border-b px-5 py-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">{S.modules}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">进入当前项目的测试设计、执行和分析功能</p>
                </div>
                <Badge variant="outline">项目模块</Badge>
              </div>
              <div className="grid md:grid-cols-2 xl:grid-cols-3">
                {modules.map((module) => (
                  <button
                    key={module.href}
                    type="button"
                    onClick={() => router.push(`/projects/${resolvedProjectId}/${module.href}`)}
                    className="group min-h-28 border-b p-4 text-left transition-colors hover:bg-[hsl(var(--accent)/0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--primary))] md:border-r xl:[&:nth-child(3n)]:border-r-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <IconFrame variant="plain" className="h-7 w-7 rounded-md bg-[hsl(var(--accent))] text-[hsl(var(--primary))]">
                          <module.icon className="h-4 w-4" />
                        </IconFrame>
                        {module.title}
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[hsl(var(--primary))]" />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{module.text}</p>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </MainLayout>
  );
}

function DonutCard({
  title,
  center,
  segments,
  background,
}: {
  title: string;
  center: number;
  segments: Array<{ label: string; value: number; color: string }>;
  background?: string;
}) {
  const total = Math.max(1, segments.reduce((sum, item) => sum + item.value, 0));
  let current = 0;
  const chartBackground =
    background ||
    `conic-gradient(${segments
      .map((item) => {
        const start = current;
        current += (item.value / total) * 100;
        return `${item.color} ${start}% ${current}%`;
      })
      .join(", ")})`;
  return (
    <div className="workspace-panel p-5">
      <CardTitle title={title} />
      <div className="grid items-center gap-6 md:grid-cols-[0.9fr_1fr]">
        <div className="relative mx-auto aspect-square w-full max-w-64 rounded-full" style={{ background: chartBackground }}>
          <div className="absolute inset-10 flex flex-col items-center justify-center rounded-full bg-background">
            <div className="text-3xl font-semibold text-foreground">{center}</div>
            <div className="mt-1 text-center text-xs font-medium text-muted-foreground">{S.totalCases}</div>
          </div>
        </div>
        <div className="space-y-4">
          {segments.length === 0 ? (
            <div className="text-sm text-muted-foreground">{S.noData}</div>
          ) : (
            segments.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} />
                  <span className="text-sm font-medium text-foreground">{row.label}</span>
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {row.value} ({pct(row.value, total)}%)
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function LineChartCard({
  title,
  months,
  series,
}: {
  title: string;
  months: string[];
  series: Array<{ label: string; values: number[]; color: string }>;
}) {
  const width = 620;
  const height = 300;
  return (
    <div className="workspace-panel p-5">
      <CardTitle title={title} />
      <div className="mb-3 flex flex-wrap gap-4">
        {series.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full">
        {[0, 1, 2, 3, 4].map((line) => (
          <line key={line} x1="40" x2="600" y1={36 + line * 52} y2={36 + line * 52} stroke={`hsl(var(--border))`} strokeDasharray="6 6" />
        ))}
        {months.map((key, index) => {
          const x = 44 + (index * 540) / Math.max(1, months.length - 1);
          return (
            <g key={key}>
              <line x1={x} x2={x} y1="32" y2="250" stroke={`hsl(var(--border)/0.65)`} strokeDasharray="6 6" />
              <text x={x - 10} y="280" fill={`hsl(var(--muted-foreground))`} fontSize="13">
                {monthLabel(key)}
              </text>
            </g>
          );
        })}
        {series.map((item) => (
          <polyline key={item.label} points={svgLinePoints(item.values, width, height)} fill="none" stroke={item.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
    </div>
  );
}

function BarChartCard({ title, months, values, color, wide }: { title: string; months: string[]; values: number[]; color: string; wide?: boolean }) {
  const max = Math.max(1, ...values);
  return (
    <div className={`workspace-panel p-5 ${wide ? "" : ""}`}>
      <CardTitle title={title} />
      <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        {title}
      </div>
      <div className="h-80">
        <svg viewBox="0 0 900 300" className="h-full w-full">
          {[0, 1, 2, 3, 4].map((line) => (
            <line key={line} x1="40" x2="870" y1={36 + line * 52} y2={36 + line * 52} stroke={`hsl(var(--border))`} strokeDasharray="6 6" />
          ))}
          {months.map((key, index) => {
            const x = 60 + (index * 780) / Math.max(1, months.length - 1);
            const value = values[index] || 0;
            const barHeight = (value / max) * 220;
            return (
              <g key={key}>
                <rect x={x - 5} y={260 - barHeight} width="10" height={barHeight} rx="3" fill={color} />
                <text x={x - 10} y="286" fill={`hsl(var(--muted-foreground))`} fontSize="13">
                  {monthLabel(key)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function CardTitle({ title }: { title: string }) {
  return (
    <div className="mb-5 flex items-center justify-between border-b pb-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {title}
        <Info className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </div>
  );
}
