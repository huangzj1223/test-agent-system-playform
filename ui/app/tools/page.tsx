"use client";

import { useEffect, useState } from "react";
import { Loader2, Power, Wrench } from "lucide-react";
import { toast } from "sonner";

import { RequireAuth } from "@/components/auth/require-auth";
import { MainLayout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listAgentTools,
  listToolCallLogs,
  updateAgentTool,
  type AgentToolInfo,
  type ToolCallLogInfo,
} from "@/lib/api/agent-tool";

function ToolsPageInner() {
  const [tools, setTools] = useState<AgentToolInfo[]>([]);
  const [logs, setLogs] = useState<ToolCallLogInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [toolResult, logResult] = await Promise.all([listAgentTools(), listToolCallLogs()]);
    setTools(toolResult.data);
    setLogs(logResult.data);
  };

  useEffect(() => {
    void refresh()
      .catch((err) => toast.error(err instanceof Error ? err.message : "工具加载失败"))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (tool: AgentToolInfo) => {
    await updateAgentTool(tool.id, { enabled: !tool.enabled });
    await refresh();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">工具治理</h1>
        <p className="text-sm text-muted-foreground">登记、启停和审计 AG-UI 工具调用</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="size-4" /> 工具注册表
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="divide-y">
                {tools.map((tool) => (
                  <div key={tool.id} className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tool.label}</span>
                        <Badge variant={tool.enabled ? "default" : "outline"}>
                          {tool.enabled ? "启用" : "停用"}
                        </Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">{tool.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{tool.description}</div>
                    </div>
                    <Button size="icon" variant="outline" onClick={() => void toggle(tool)} aria-label="切换工具状态">
                      <Power className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">调用留痕</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {logs.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">暂无调用记录</div>
            ) : (
              logs.slice(0, 12).map((log) => (
                <div key={log.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{log.tool_name}</span>
                    <Badge variant="outline">{log.status}</Badge>
                  </div>
                  <div className="mt-1 break-words text-xs text-muted-foreground">{log.result}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ToolsPage() {
  return (
    <RequireAuth>
      <MainLayout title="工具治理">
        <ToolsPageInner />
      </MainLayout>
    </RequireAuth>
  );
}
