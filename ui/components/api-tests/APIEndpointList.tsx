
"use client";

import * as React from "react";
import {
  Search,
  FileCode,
  Globe,
  Zap,
  Play,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/providers/LanguageProvider";
import type { APIEndpoint } from "@/lib/api/api-endpoints";
// TODO  MS80OmFIVnBZMlhwdTRUbGphRG1zWjg2VjBSalVBPT06ODM5OGU4OWY=

interface APIEndpointListProps {
  endpoints: APIEndpoint[];
  loading: boolean;
  selectedEndpointId?: string | null;
  actualTestCasesCounts?: Record<string, number>;
  onSelectEndpoint: (endpointId: string) => void;
  onSearch: (query: string) => void;
  folderName?: string;
}
// TODO  Mi80OmFIVnBZMlhwdTRUbGphRG1zWjg2VjBSalVBPT06ODM5OGU4OWY=

// HTTP 方法颜色映射
const methodColors: Record<string, string> = {
  GET: "bg-[hsl(var(--chart-1))] text-[hsl(var(--chart-1))]",
  POST: "bg-[hsl(var(--chart-2))] text-[hsl(var(--chart-2))]",
  PUT: "bg-[hsl(var(--chart-3))] text-[hsl(var(--chart-3))]",
  PATCH: "bg-[hsl(var(--chart-5))] text-[hsl(var(--chart-5))]",
  DELETE: "bg-[hsl(var(--chart-4))] text-[hsl(var(--chart-4))]",
};
// FIXME  My80OmFIVnBZMlhwdTRUbGphRG1zWjg2VjBSalVBPT06ODM5OGU4OWY=

export function APIEndpointList({
  endpoints,
  loading,
  selectedEndpointId,
  actualTestCasesCounts = {},
  onSelectEndpoint,
  onSearch,
  folderName,
}: APIEndpointListProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = React.useState("");

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (endpoints.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <FileCode className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">{t("apiTests.noEndpointData")}</p>
          <p className="text-sm text-muted-foreground mb-4">
            {t("apiTests.noEndpointsInFolder")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("apiTests.clickToImportAPI")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* 接口列表 */}
      <div className="p-4">
        <div className="space-y-2">
          {endpoints.map((endpoint) => (
            <div
              key={endpoint.id}
              className={cn(
                "group rounded-lg border p-4 hover:bg-accent/50 cursor-pointer transition-all",
                selectedEndpointId === endpoint.id && "bg-accent border-primary"
              )}
              onClick={() => onSelectEndpoint(endpoint.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* HTTP 方法标签 */}
                  <Badge
                    className={cn(
                      "shrink-0 font-mono text-xs",
                      methodColors[endpoint.method] || "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                    )}
                  >
                    {endpoint.method}
                  </Badge>

                  {/* 接口名称 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">
                      {endpoint.display_name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate font-mono mt-1">
                      {endpoint.path}
                    </p>
                  </div>
                </div>

                {/* 状态指示器 */}
                {endpoint.last_run_status && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0",
                      endpoint.last_run_status === "passed" && "border-[hsl(var(--success))] text-[hsl(var(--success))]",
                      endpoint.last_run_status === "failed" && "border-[hsl(var(--destructive))] text-[hsl(var(--destructive))]",
                      endpoint.last_run_status === "running" && "border-[hsl(var(--info))] text-[hsl(var(--info))]"
                    )}
                  >
                    {endpoint.last_run_status === "passed" && "✓ " + t("status.passed")}
                    {endpoint.last_run_status === "failed" && "✗ " + t("status.failed")}
                    {endpoint.last_run_status === "running" && "⟳ " + t("status.running")}
                  </Badge>
                )}
              </div>

              {/* 描述 */}
              {endpoint.summary && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {endpoint.summary}
                </p>
              )}

              {/* 统计信息 */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FileCode className="h-3.5 w-3.5" />
                  <span>
                    {actualTestCasesCounts[endpoint.id] || endpoint.total_test_cases} {t("apiTests.testCasesCount")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Play className="h-3.5 w-3.5" />
                  <span>{endpoint.total_test_runs} {t("testRuns.title")}</span>
                </div>
                {endpoint.tag_group && (
                  <div className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" />
                    <span>{endpoint.tag_group}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
