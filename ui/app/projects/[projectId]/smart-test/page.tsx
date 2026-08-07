"use client";

/**
 * 智能测试页面
 *
 * 核心流程：输入 URL + 测试描述 → 系统自动编排多智能体协作完成测试
 * Phase 1: 页面探测 → Phase 2: 用例设计 → Phase 3: 测试执行 → Phase 4: 报告生成
 *
 * 使用 SSE (Server-Sent Events) 实时展示进度
 */

import * as React from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  Sparkles,
  RefreshCw,
  FileWarning,
  RotateCw,
} from "lucide-react";
import { MainLayout } from "@/components/layout";
import { useLanguage } from "@/providers/LanguageProvider";
import {
  SmartTestTaskCreator,
  TaskProgressStepper,
  PhaseOutputPanel,
  SmartTestHistory,
} from "@/components/smart-test";
import type { TaskCreatorFormData } from "@/components/smart-test";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  runSmartTest,
  parseSSEStream,
  listSmartTestTasks,
  type SmartTestTask,
  type PhaseInfo,
  type SSEEvent,
} from "@/lib/api/smart-tests";

// 默认阶段模板
const DEFAULT_PHASES: PhaseInfo[] = [
  { phase: "exploration", name: "🔍 页面探测", status: "pending", output: {}, error: "", started_at: "", completed_at: "" },
  { phase: "testcase_design", name: "📝 测试用例设计", status: "pending", output: {}, error: "", started_at: "", completed_at: "" },
  { phase: "execution", name: "▶️ 测试执行", status: "pending", output: {}, error: "", started_at: "", completed_at: "" },
  { phase: "report", name: "📊 报告生成", status: "pending", output: {}, error: "", started_at: "", completed_at: "" },
];

export default function SmartTestPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { t } = useLanguage();

  // 任务状态
  const [tasks, setTasks] = React.useState<SmartTestTask[]>([]);
  const [activeTaskId, setActiveTaskId] = React.useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = React.useState<string | null>(null);
  const [phases, setPhases] = React.useState<PhaseInfo[]>(DEFAULT_PHASES.map(p => ({...p})));
  const [isRunning, setIsRunning] = React.useState(false);
  const [taskError, setTaskError] = React.useState<string>("");
  const [loadingHistory, setLoadingHistory] = React.useState(true);

  // 加载历史任务
  const loadHistory = React.useCallback(async () => {
    try {
      setLoadingHistory(true);
      const result = await listSmartTestTasks(projectId);
      setTasks(result.items || []);
    } catch (error) {
      console.error("Failed to load smart test history:", error);
    } finally {
      setLoadingHistory(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    if (projectId) {
      loadHistory();
    }
  }, [projectId, loadHistory]);

  // 处理 SSE 事件
  const handleSSEEvent = React.useCallback((event: SSEEvent) => {
    switch (event.type) {
      case "PHASE_START":
        setCurrentPhase(event.phase || null);
        setPhases(prev =>
          prev.map(p =>
            p.phase === event.phase
              ? { ...p, status: "running" as const, started_at: event.timestamp }
              : p
          )
        );
        break;

      case "PHASE_PROGRESS":
        // 可以在 UI 中显示进度消息
        break;

      case "PHASE_OUTPUT":
        setPhases(prev =>
          prev.map(p =>
            p.phase === event.phase
              ? { ...p, output: event.output || {} }
              : p
          )
        );
        break;

      case "PHASE_COMPLETE":
        setPhases(prev =>
          prev.map(p =>
            p.phase === event.phase
              ? { ...p, status: "completed" as const, completed_at: event.timestamp }
              : p
          )
        );
        break;

      case "PHASE_ERROR":
        setPhases(prev =>
          prev.map(p =>
            p.phase === event.phase
              ? { ...p, status: "failed" as const, error: event.error || "" }
              : p
          )
        );
        break;

      case "TASK_COMPLETE":
        setIsRunning(false);
        setCurrentPhase(null);
        toast.success("智能测试完成！");
        loadHistory();
        break;

      case "TASK_ERROR":
        setIsRunning(false);
        setTaskError(event.error || "任务执行失败");
        toast.error(event.error || "智能测试执行失败");
        loadHistory();
        break;
    }
  }, [loadHistory]);

  // 启动智能测试
  const handleStartTask = async (data: TaskCreatorFormData) => {
    // 重置状态
    setPhases(DEFAULT_PHASES.map(p => ({ ...p })));
    setCurrentPhase(null);
    setTaskError("");
    setIsRunning(true);

    try {
      const reader = await runSmartTest(projectId, {
        target_url: data.target_url,
        description: data.description,
      });

      // 创建本地任务记录
      const localTask: SmartTestTask = {
        id: `running-${Date.now()}`,
        project_identifier: projectId,
        target_url: data.target_url,
        description: data.description,
        status: "running",
        created_at: new Date().toISOString(),
        completed_at: null,
        phases: [...DEFAULT_PHASES.map(p => ({ ...p }))],
      };
      setActiveTaskId(localTask.id);
      setTasks(prev => [localTask, ...prev]);

      // 异步处理 SSE 流
      const eventGenerator = parseSSEStream(reader);
      const processEvents = async () => {
        try {
          for await (const event of eventGenerator) {
            handleSSEEvent(event);
          }
        } catch (error: any) {
          console.error("SSE stream error:", error);
          setIsRunning(false);
          setTaskError(error.message || "SSE 连接中断");
          toast.error("连接中断，请查看历史任务确认状态");
          loadHistory();
        }
      };
      processEvents();
    } catch (error: any) {
      console.error("Failed to start smart test:", error);
      setIsRunning(false);
      setTaskError(error.message || "启动失败");
      toast.error(`启动智能测试失败: ${error.message}`);
    }
  };

  // 查看历史任务详情
  const handleSelectTask = (task: SmartTestTask) => {
    setActiveTaskId(task.id);
    if (task.phases && task.phases.length > 0) {
      setPhases(task.phases);
    }
    if (task.status === "running") {
      setIsRunning(true);
    }
  };

  // 重置/新建任务
  const handleNewTask = () => {
    setActiveTaskId(null);
    setPhases(DEFAULT_PHASES.map(p => ({ ...p })));
    setCurrentPhase(null);
    setTaskError("");
  };

  return (
    <MainLayout title={t("smartTest.title") || "智能测试"}>
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* 左侧：任务创建 + 进度 + 产出 */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
          {/* 任务创建表单 */}
          {!isRunning && !activeTaskId && (
            <SmartTestTaskCreator onSubmit={handleStartTask} disabled={isRunning} />
          )}

          {/* 运行中/查看详情时显示进度和产出 */}
          {(isRunning || activeTaskId) && (
            <>
              {/* 任务信息栏 */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[hsl(var(--chart-1))]" />
                      {isRunning ? "任务运行中" : "任务详情"}
                      {isRunning && (
                        <Badge className="bg-[hsl(var(--chart-1))] text-[hsl(var(--card-bg))] text-xs animate-pulse">
                          运行中
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {!isRunning && (
                        <Button variant="outline" size="sm" onClick={handleNewTask}>
                          <RotateCw className="mr-2 h-3 w-3" />
                          新建任务
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={loadHistory}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* 进度条 */}
              <Card>
                <CardContent className="py-4">
                  <TaskProgressStepper phases={phases} currentPhase={currentPhase} />
                </CardContent>
              </Card>

              {/* 错误提示 */}
              {taskError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileWarning className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">任务出错</span>
                  </div>
                  <p className="text-xs text-destructive/80">{taskError}</p>
                </div>
              )}

              {/* 阶段产出 */}
              <PhaseOutputPanel phases={phases} currentPhase={currentPhase} />
            </>
          )}
        </div>

        {/* 右侧面板：历史任务 */}
        <div className="w-80 shrink-0 flex flex-col gap-4">
          <SmartTestHistory
            tasks={tasks}
            onSelectTask={handleSelectTask}
            selectedTaskId={activeTaskId}
          />

          {/* 快速提示 */}
          <Card className="bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">💡 使用提示</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>1. 输入目标网站的完整 URL</p>
              <p>2. 详细描述要测试的功能点</p>
              <p>3. AI 将自动完成 4 个阶段的测试流程</p>
              <p>4. 每个阶段的产出实时预览</p>
              <p>5. 任务完成后可查看综合报告</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
