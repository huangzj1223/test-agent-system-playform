"use client";

/**
 * 阶段产出预览面板
 * 实时展示当前阶段的产出内容（页面快照 / 测试计划 / 执行结果 / 报告）
 */

import * as React from "react";
import {
  Search,
  FileEdit,
  Play,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { PhaseInfo } from "@/lib/api/smart-tests";

interface PhaseOutputPanelProps {
  phases: PhaseInfo[];
  currentPhase: string | null;
}

const PHASE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  exploration: Search,
  testcase_design: FileEdit,
  execution: Play,
  report: FileText,
};

function PhaseCard({ phase, isActive }: { phase: PhaseInfo; isActive: boolean }) {
  const [expanded, setExpanded] = React.useState(isActive);
  const Icon = PHASE_ICONS[phase.phase] || FileText;
  const content = phase.output?.content || phase.output?.report || "";

  // 截取可显示的文本内容
  const displayContent =
    typeof content === "string"
      ? content.slice(0, 8000)
      : JSON.stringify(content, null, 2).slice(0, 8000);

  return (
    <Card
      className={cn(
        "transition-all duration-300",
        isActive && "border-[hsl(var(--chart-1))] shadow-[0_0_12px_hsl(var(--chart-1)/0.1)]",
        phase.status === "failed" && "border-destructive/50",
        phase.status === "completed" && "border-[hsl(var(--success))/30]"
      )}
    >
      <CardHeader
        className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon
              className={cn(
                "h-4 w-4",
                isActive && "text-[hsl(var(--chart-1))]",
                phase.status === "completed" && "text-[hsl(var(--success))]"
              )}
            />
            <CardTitle className="text-sm font-medium">{phase.name}</CardTitle>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                phase.status === "running" && "border-[hsl(var(--chart-1))] text-[hsl(var(--chart-1))]",
                phase.status === "completed" && "border-[hsl(var(--success))] text-[hsl(var(--success))]",
                phase.status === "failed" && "border-destructive text-destructive",
                phase.status === "pending" && "text-muted-foreground"
              )}
            >
              {phase.status === "running"
                ? "进行中"
                : phase.status === "completed"
                ? "已完成"
                : phase.status === "failed"
                ? "失败"
                : "等待中"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {phase.completed_at && (
              <span className="text-xs text-muted-foreground">
                {new Date(phase.completed_at).toLocaleTimeString()}
              </span>
            )}
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="px-4 pb-4 pt-0">
          {phase.error ? (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3">
              <p className="text-sm text-destructive font-medium mb-1">错误信息</p>
              <pre className="text-xs text-destructive/80 whitespace-pre-wrap">{phase.error}</pre>
            </div>
          ) : displayContent ? (
            <ScrollArea className="max-h-[400px]">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted/30 rounded-md p-3 overflow-x-auto">
                {displayContent}
              </pre>
            </ScrollArea>
          ) : phase.status === "pending" ? (
            <p className="text-sm text-muted-foreground italic">等待开始...</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">暂无产出</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function PhaseOutputPanel({ phases, currentPhase }: PhaseOutputPanelProps) {
  return (
    <div className="space-y-3">
      {phases.map((phase) => (
        <PhaseCard
          key={phase.phase}
          phase={phase}
          isActive={phase.phase === currentPhase}
        />
      ))}
      {phases.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">提交任务后将在此展示各阶段的产出</p>
        </div>
      )}
    </div>
  );
}
