"use client";

/**
 * 智能测试历史任务列表
 * 展示已完成/运行中的任务，支持点击查看详情
 */

import * as React from "react";
import {
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Globe,
  FileText,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { SmartTestTask } from "@/lib/api/smart-tests";

interface TaskHistoryProps {
  tasks: SmartTestTask[];
  onSelectTask: (task: SmartTestTask) => void;
  selectedTaskId?: string | null;
}

const STATUS_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  running: { icon: Loader2, label: "运行中", color: "text-[hsl(var(--chart-1))]" },
  completed: { icon: CheckCircle2, label: "已完成", color: "text-[hsl(var(--success))]" },
  failed: { icon: XCircle, label: "失败", color: "text-destructive" },
  pending: { icon: Clock, label: "等待中", color: "text-muted-foreground" },
};

export function SmartTestHistory({ tasks, onSelectTask, selectedTaskId }: TaskHistoryProps) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            历史任务
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">暂无历史任务</p>
            <p className="text-xs mt-1">提交测试后将在此显示任务记录</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          历史任务
          <Badge variant="secondary" className="ml-2 text-xs">
            {tasks.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[300px]">
          <div className="divide-y divide-border">
            {tasks.map((task) => {
              const config = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
              const StatusIcon = config.icon;
              const isSelected = task.id === selectedTaskId;

              return (
                <button
                  key={task.id}
                  type="button"
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer",
                    "flex items-start gap-3",
                    isSelected && "bg-[hsl(var(--chart-1)/0.05)] border-l-2 border-[hsl(var(--chart-1))]"
                  )}
                  onClick={() => onSelectTask(task)}
                >
                  <StatusIcon
                    className={cn(
                      "h-4 w-4 mt-0.5 shrink-0",
                      config.color,
                      task.status === "running" && "animate-spin"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">
                        {task.description.slice(0, 50)}
                        {task.description.length > 50 ? "..." : ""}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn("text-xs shrink-0", config.color)}
                      >
                        {config.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {task.target_url.length > 30
                          ? task.target_url.slice(0, 30) + "..."
                          : task.target_url}
                      </span>
                      <span>
                        {new Date(task.created_at).toLocaleString()}
                      </span>
                      {task.phases && (
                        <span>
                          {task.phases.filter((p) => p.status === "completed").length}/
                          {task.phases.length} 阶段完成
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
