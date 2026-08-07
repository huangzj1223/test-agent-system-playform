"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Pencil,
  PlugZap,
  Plus,
  ServerCog,
  Trash2,
} from "lucide-react";

import { RequireAuth } from "@/components/auth/require-auth";
import { MainLayout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProviderFormDialog } from "@/components/model-config/provider-form-dialog";
import { ModelFormDialog } from "@/components/model-config/model-form-dialog";
import { useModelConfig } from "@/hooks/use-model-config";
import {
  deleteModelConfig,
  deleteModelProvider,
  testModelProviderConnection,
  type ModelConfigInfo,
  type ModelProviderInfo,
} from "@/lib/api/model-config";

function ModelsPageInner() {
  const { providers, isLoading, mutate } = useModelConfig();
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);
  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ModelProviderInfo | null>(null);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelConfigInfo | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const activeProvider = useMemo(() => {
    return providers.find((item) => item.id === activeProviderId) ?? providers[0] ?? null;
  }, [providers, activeProviderId]);

  const refresh = () => void mutate();

  const openCreateProvider = () => {
    setEditingProvider(null);
    setProviderDialogOpen(true);
  };

  const openEditProvider = (provider: ModelProviderInfo) => {
    setEditingProvider(provider);
    setProviderDialogOpen(true);
  };

  const openCreateModel = () => {
    setEditingModel(null);
    setModelDialogOpen(true);
  };

  const removeProvider = async (provider: ModelProviderInfo) => {
    if (!window.confirm(`确认删除服务商「${provider.name}」及其全部模型？`)) return;
    try {
      await deleteModelProvider(provider.id);
      toast.success("服务商已删除");
      if (activeProviderId === provider.id) setActiveProviderId(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  };

  const removeModel = async (model: ModelConfigInfo) => {
    if (!window.confirm(`确认删除模型「${model.name}」？`)) return;
    try {
      await deleteModelConfig(model.id);
      toast.success("模型已删除");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  };

  const testConnection = async (provider: ModelProviderInfo) => {
    setTestingId(provider.id);
    try {
      const result = await testModelProviderConnection(provider.id, provider.models[0]?.model_id);
      if (result.data.reachable) {
        toast.success(`连接可达：${result.data.status_code ?? "OK"}`);
      } else {
        toast.error(result.data.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "连接测试失败");
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">模型配置管理</h1>
          <p className="text-sm text-muted-foreground">
            服务商 {providers.length} 个，模型 {providers.reduce((sum, item) => sum + item.models.length, 0)} 个
          </p>
        </div>
        <Button onClick={openCreateProvider}>
          <Plus className="size-4" /> 新增服务商
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ServerCog className="size-4" /> 服务商
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : providers.length === 0 ? (
              <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
                暂无服务商
              </div>
            ) : (
              providers.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => setActiveProviderId(provider.id)}
                  className={`w-full rounded-md border p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50 ${
                    activeProvider?.id === provider.id ? "border-emerald-400 bg-emerald-50" : "bg-background"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{provider.name}</span>
                    <Badge variant={provider.enabled ? "default" : "outline"}>
                      {provider.enabled ? "启用" : "停用"}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{provider.provider}</span>
                    <span>{provider.models.length} 个模型</span>
                    {provider.has_api_key && <KeyRound className="size-3.5" />}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">{activeProvider?.name ?? "模型列表"}</CardTitle>
              <div className="flex gap-2">
                {activeProvider && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => testConnection(activeProvider)} disabled={testingId === activeProvider.id}>
                      {testingId === activeProvider.id ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
                      连接测试
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEditProvider(activeProvider)}>
                      <Pencil className="size-4" /> 服务商
                    </Button>
                    <Button variant="outline" size="sm" onClick={openCreateModel}>
                      <Plus className="size-4" /> 模型
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removeProvider(activeProvider)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!activeProvider ? (
              <div className="rounded-md border border-dashed py-16 text-center text-sm text-muted-foreground">
                选择或新增一个服务商
              </div>
            ) : activeProvider.models.length === 0 ? (
              <div className="rounded-md border border-dashed py-16 text-center text-sm text-muted-foreground">
                暂无模型
              </div>
            ) : (
              <div className="divide-y">
                {activeProvider.models.map((model) => (
                  <div key={model.id} className="grid grid-cols-12 items-center gap-3 py-4 text-sm">
                    <div className="col-span-4">
                      <div className="font-medium">{model.name}</div>
                      <div className="text-xs text-muted-foreground">{model.model_id}</div>
                    </div>
                    <div className="col-span-3 text-muted-foreground">
                      {model.max_output_tokens ? `${model.max_output_tokens} 输出` : "-"}
                    </div>
                    <div className="col-span-3 flex flex-wrap gap-1">
                      {model.support_tools && <Badge variant="secondary">工具</Badge>}
                      {model.support_stream && <Badge variant="secondary">流式</Badge>}
                      {model.support_long_text && <Badge variant="secondary">长文本</Badge>}
                      {model.pool_group === "system-default-text" && <Badge>默认文本</Badge>}
                      {model.pool_group === "system-default-image" && <Badge>默认多模态</Badge>}
                      {model.enabled && <CheckCircle2 className="size-4 text-emerald-500" />}
                    </div>
                    <div className="col-span-2 flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditingModel(model); setModelDialogOpen(true); }}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeModel(model)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ProviderFormDialog
        open={providerDialogOpen}
        onOpenChange={setProviderDialogOpen}
        editing={editingProvider}
        onSaved={refresh}
      />
      <ModelFormDialog
        open={modelDialogOpen}
        onOpenChange={setModelDialogOpen}
        providerId={activeProvider?.id ?? null}
        editing={editingModel}
        onSaved={refresh}
      />
    </div>
  );
}

export default function ModelsPage() {
  return (
    <RequireAuth>
      <MainLayout title="模型配置">
        <ModelsPageInner />
      </MainLayout>
    </RequireAuth>
  );
}
