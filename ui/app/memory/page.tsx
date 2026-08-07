"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { History, Loader2, RotateCcw, Save, Sparkles } from "lucide-react";

import { RequireAuth } from "@/components/auth/require-auth";
import { MainLayout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  confirmPendingMemory,
  getMemory,
  getMemoryStats,
  ignorePendingMemory,
  listMemories,
  rollbackMemory,
  saveMemory,
  type MemoryDetail,
  type MemoryInfo,
  type MemoryStats,
} from "@/lib/api/memory";

function MemoryPageInner() {
  const [memories, setMemories] = useState<MemoryInfo[]>([]);
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [detail, setDetail] = useState<MemoryDetail | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const pendingSuggestions = useMemo(
    () => (detail?.suggestions ?? []).filter((item) => item.status === "pending"),
    [detail]
  );

  const refreshList = async () => {
    const [listResult, statsResult] = await Promise.all([listMemories(), getMemoryStats()]);
    setMemories(listResult.data);
    setStats(statsResult.data);
    if (!activeKey && listResult.data.length > 0) setActiveKey(listResult.data[0].memory_key);
  };

  const loadDetail = async (key: string) => {
    const result = await getMemory(key);
    setDetail(result.data);
    setDraft(result.data.content);
  };

  useEffect(() => {
    void refreshList()
      .catch((err) => toast.error(err instanceof Error ? err.message : "记忆加载失败"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeKey) return;
    void loadDetail(activeKey).catch((err) => toast.error(err instanceof Error ? err.message : "记忆详情加载失败"));
  }, [activeKey]);

  const save = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      await saveMemory(detail.memory_key, draft);
      await loadDetail(detail.memory_key);
      await refreshList();
      toast.success("记忆已保存");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const rollback = async (version: string) => {
    if (!detail) return;
    try {
      await rollbackMemory(detail.memory_key, version);
      await loadDetail(detail.memory_key);
      await refreshList();
      toast.success("已回滚版本");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "回滚失败");
    }
  };

  const confirm = async (id: string, text: string) => {
    try {
      await confirmPendingMemory(id, text);
      if (detail) await loadDetail(detail.memory_key);
      await refreshList();
      toast.success("建议已确认");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "确认失败");
    }
  };

  const ignore = async (id: string) => {
    try {
      await ignorePendingMemory(id);
      if (detail) await loadDetail(detail.memory_key);
      await refreshList();
      toast.success("建议已驳回");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "驳回失败");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">记忆中心</h1>
          <p className="text-sm text-muted-foreground">内置记忆、版本快照与待确认建议</p>
        </div>
        <Button onClick={save} disabled={!detail || saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          保存
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        {[
          ["记忆总数", stats?.total ?? 0],
          ["已启用", stats?.enabled ?? 0],
          ["高风险", stats?.high_risk ?? 0],
          ["待确认", stats?.pending ?? 0],
          ["读取次数", stats?.reads ?? 0],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="mt-2 text-2xl font-semibold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr_320px]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle className="text-base">记忆文件</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-290px)]">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="p-2">
                  {memories.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveKey(item.memory_key)}
                      className={`mb-1 w-full rounded-md border px-3 py-2 text-left text-sm transition hover:border-emerald-300 hover:bg-emerald-50 ${
                        activeKey === item.memory_key ? "border-emerald-400 bg-emerald-50" : "bg-background"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{item.name}</span>
                        <Badge variant="outline">{item.risk_level}</Badge>
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">{item.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">{detail?.name ?? "记忆内容"}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">{detail?.version ?? "-"}</p>
              </div>
              {detail?.built_in && <Badge>内置</Badge>}
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-[520px] font-mono text-sm" />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4" /> 待确认建议
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
              {pendingSuggestions.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">暂无待确认建议</div>
              ) : (
                pendingSuggestions.map((item) => (
                  <div key={item.id} className="rounded-md border p-3 text-sm">
                    <div className="leading-6">{item.text}</div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => void confirm(item.id, item.text)}>确认</Button>
                      <Button size="sm" variant="outline" onClick={() => void ignore(item.id)}>驳回</Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="size-4" /> 版本历史
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
              {(detail?.versions ?? []).slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                  <div>
                    <div className="font-medium">{item.version}</div>
                    <div className="text-xs text-muted-foreground">{item.change_type}</div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => void rollback(item.version)} aria-label="回滚版本">
                    <RotateCcw className="size-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function MemoryPage() {
  return (
    <RequireAuth>
      <MainLayout title="记忆中心">
        <MemoryPageInner />
      </MainLayout>
    </RequireAuth>
  );
}
