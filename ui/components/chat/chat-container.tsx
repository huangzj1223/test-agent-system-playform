"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Check,
  CircleStop,
  ExternalLink,
  Loader2,
  MessageSquarePlus,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAguiChat } from "@/hooks/use-agui-chat";
import { useModelConfig } from "@/hooks/use-model-config";
import type { AgentRunInfo } from "@/lib/api/agent-runs";
import { useProjectContext } from "@/lib/context/project-context";
import { cn } from "@/lib/utils";

const statusLabels: Record<AgentRunInfo["status"], string> = {
  pending_approval: "等待审批",
  running: "执行中",
  succeeded: "已完成",
  failed: "失败",
  cancelled: "已取消",
};

interface ChatContainerProps {
  lockedProjectIdentifier?: string;
}

export function ChatContainer({ lockedProjectIdentifier }: ChatContainerProps = {}) {
  const {
    activeConversation,
    activityEvents,
    agentRuns,
    conversations,
    decideAgentRun,
    isLoading,
    isStreaming,
    messages,
    selectConversation,
    sendMessage,
    startNewConversation,
  } = useAguiChat();
  const { projects } = useProjectContext();
  const { providers, isLoading: modelsLoading } = useModelConfig();
  const [draft, setDraft] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [selectedProjectIdentifier, setSelectedProjectIdentifier] = useState(lockedProjectIdentifier ?? "");
  const [selectedModelKey, setSelectedModelKey] = useState("");

  const modelOptions = useMemo(
    () =>
      providers
        .filter((provider) => provider.enabled)
        .flatMap((provider) =>
          provider.models
            .filter((model) => model.enabled && model.support_text)
            .map((model) => ({
              key: model.id,
              label: `${provider.name} / ${model.name}`,
              providerId: provider.id,
              modelId: model.model_id,
              poolGroup: model.pool_group,
            }))
        ),
    [providers]
  );

  useEffect(() => {
    if (lockedProjectIdentifier) {
      setSelectedProjectIdentifier(lockedProjectIdentifier);
      return;
    }
    if (!selectedProjectIdentifier && projects.length > 0) {
      setSelectedProjectIdentifier(projects[0].identifier);
    }
  }, [lockedProjectIdentifier, projects, selectedProjectIdentifier]);

  useEffect(() => {
    if (!selectedModelKey && modelOptions.length > 0) {
      const defaultModel = modelOptions.find((model) => model.poolGroup === "system-default-text");
      setSelectedModelKey(defaultModel?.key ?? modelOptions[0].key);
    }
  }, [modelOptions, selectedModelKey]);

  const submit = () => {
    const selected = modelOptions.find((model) => model.key === selectedModelKey);
    const value = draft;
    setDraft("");
    void sendMessage(value, {
      providerId: selected?.providerId,
      modelId: selected?.modelId,
      projectIdentifier: lockedProjectIdentifier || selectedProjectIdentifier || undefined,
      targetUrl: targetUrl.trim() || undefined,
    });
  };

  return (
    <div className="grid h-[calc(100vh-116px)] min-h-[640px] overflow-hidden rounded-lg border bg-background shadow-sm lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_320px]">
      <aside className="hidden min-h-0 flex-col border-b bg-muted/20 lg:flex lg:border-b-0 lg:border-r">
        <div className="flex h-14 items-center justify-between border-b px-3">
          <div className="text-sm font-semibold">会话记录</div>
          <Button size="icon" variant="ghost" onClick={() => void startNewConversation()} aria-label="新建会话">
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : conversations.length === 0 ? (
            <div className="p-5 text-sm text-muted-foreground">暂无会话</div>
          ) : (
            <div className="space-y-1 p-2">
              {conversations.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void selectConversation(item.id)}
                  className={cn(
                    "w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted",
                    activeConversation?.id === item.id && "bg-background font-medium shadow-sm ring-1 ring-border"
                  )}
                >
                  <div className="truncate">{item.title}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{item.status}</div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-col">
        <div className="grid gap-2 border-b px-4 py-3 sm:grid-cols-2 sm:items-center 2xl:grid-cols-[minmax(160px,220px)_minmax(180px,260px)_minmax(220px,1fr)_auto]">
          {lockedProjectIdentifier ? (
            <div
              className="flex h-10 min-w-0 items-center rounded-md border bg-muted/30 px-3 text-sm"
              aria-label="当前项目"
              data-testid="locked-project"
            >
              <span className="truncate font-medium">
                {projects.find((project) => project.identifier === lockedProjectIdentifier)?.name ?? lockedProjectIdentifier}
              </span>
              <span className="ml-2 shrink-0 text-xs text-muted-foreground">{lockedProjectIdentifier}</span>
            </div>
          ) : (
            <Select value={selectedProjectIdentifier} onValueChange={setSelectedProjectIdentifier} disabled={projects.length === 0}>
              <SelectTrigger aria-label="选择项目"><SelectValue placeholder="选择项目" /></SelectTrigger>
              <SelectContent>
                {projects.map((project) => <SelectItem key={project.identifier} value={project.identifier}>{project.name} / {project.identifier}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={selectedModelKey} onValueChange={setSelectedModelKey} disabled={modelsLoading || modelOptions.length === 0}>
            <SelectTrigger aria-label="选择模型"><SelectValue placeholder={modelsLoading ? "加载模型中" : "选择模型"} /></SelectTrigger>
            <SelectContent>
              {modelOptions.map((model) => <SelectItem key={model.key} value={model.key}>{model.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative">
            <ExternalLink className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="url"
              value={targetUrl}
              onChange={(event) => setTargetUrl(event.target.value)}
              placeholder="目标网址（Web 测试时填写）"
              className="pl-9"
              aria-label="目标网址"
            />
          </div>
          <Badge variant={isStreaming ? "default" : "outline"} className="hidden h-7 justify-center 2xl:flex">
            {isStreaming ? "响应中" : "就绪"}
          </Badge>
        </div>

        {agentRuns.length > 0 ? (
          <div className="max-h-48 space-y-2 overflow-y-auto border-b bg-muted/15 p-3 xl:hidden">
            {agentRuns.map((run) => <AgentRunPanel key={run.id} run={run} onDecision={decideAgentRun} />)}
          </div>
        ) : null}

        <ScrollArea className="min-h-0 flex-1 bg-muted/10">
          <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
            {messages.length === 0 ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-background shadow-sm">
                  <Bot className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="mt-4 text-base font-semibold">测试智能体对话</div>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">描述测试目标，系统会调用已登记的模型、技能和测试智能体。</p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[88%] whitespace-pre-wrap rounded-lg border px-3.5 py-2.5 text-sm leading-6 sm:max-w-[78%]",
                      message.role === "user" ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "bg-background"
                    )}
                  >
                    {message.content || (message.role === "assistant" && isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : "")}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="border-t bg-background p-3 sm:p-4">
          <div className="mx-auto flex max-w-4xl gap-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="输入测试需求"
              className="min-h-[68px] resize-none"
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) submit();
              }}
            />
            <Button size="icon" className="h-[68px] w-12 shrink-0" onClick={submit} disabled={isStreaming || !draft.trim()} aria-label="发送消息">
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </section>

      <aside className="hidden min-h-0 flex-col border-l bg-muted/15 xl:flex">
        <div className="flex h-14 items-center gap-2 border-b px-4 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-emerald-600" /> 执行与审批
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 p-3">
            {agentRuns.length === 0 && activityEvents.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">暂无智能体运行记录</div>
            ) : null}
            {agentRuns.map((run) => (
              <AgentRunPanel key={run.id} run={run} onDecision={decideAgentRun} />
            ))}
            {activityEvents.slice(0, 8).map((event, index) => (
              <div key={`${event.type}-${index}`} className="rounded-md border bg-background p-3 text-xs">
                <div className="font-medium">{event.type}</div>
                <div className="mt-1 break-words text-muted-foreground">
                  {String(event.result ?? event.delta ?? event.message ?? event.agentName ?? "")}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>
    </div>
  );
}

function AgentRunPanel({ run, onDecision }: { run: AgentRunInfo; onDecision: (runId: string, decision: "approve" | "reject") => Promise<void> }) {
  const pending = run.status === "pending_approval";
  const running = run.status === "running";

  return (
    <div className="rounded-md border bg-background p-3 text-xs shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold">{run.skill_name || run.agent_name}</span>
        <Badge variant={run.risk_level === "L4" ? "destructive" : "outline"}>{run.risk_level}</Badge>
      </div>
      <p className="mt-2 line-clamp-3 leading-5 text-muted-foreground">{run.prompt}</p>
      <div className="mt-2 flex items-center gap-1.5 text-muted-foreground">
        {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : run.status === "succeeded" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <CircleStop className="h-3.5 w-3.5" />}
        {statusLabels[run.status]}
      </div>
      {pending ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button size="sm" className="h-8" onClick={() => void onDecision(run.id, "approve")}><Check className="mr-1 h-3.5 w-3.5" />批准</Button>
          <Button size="sm" variant="outline" className="h-8" onClick={() => void onDecision(run.id, "reject")}><X className="mr-1 h-3.5 w-3.5" />拒绝</Button>
        </div>
      ) : null}
      {run.error ? <div className="mt-2 rounded border border-rose-200 bg-rose-50 p-2 text-rose-700">{run.error}</div> : null}
      {run.artifacts.length > 0 ? (
        <div className="mt-2 space-y-1 border-t pt-2 text-muted-foreground">
          {run.artifacts.slice(0, 5).map((artifact, index) => (
            <div key={`${String(artifact.path)}-${index}`} className="truncate">{String(artifact.type || "file")}: {String(artifact.path || "")}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
