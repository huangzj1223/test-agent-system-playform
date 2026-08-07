"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createModelConfig,
  updateModelConfig,
  type ModelConfigInfo,
} from "@/lib/api/model-config";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string | null;
  editing: ModelConfigInfo | null;
  onSaved: () => void;
}

function toNumber(value: string): number | null {
  if (!value.trim()) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

export function ModelFormDialog({ open, onOpenChange, providerId, editing, onSaved }: Props) {
  const [name, setName] = useState("");
  const [modelId, setModelId] = useState("");
  const [contextWindow, setContextWindow] = useState("");
  const [maxOutputTokens, setMaxOutputTokens] = useState("");
  const [temperature, setTemperature] = useState("");
  const [topP, setTopP] = useState("");
  const [timeoutSec, setTimeoutSec] = useState("");
  const [retryCount, setRetryCount] = useState("");
  const [poolGroup, setPoolGroup] = useState("none");
  const [supportImageInput, setSupportImageInput] = useState(false);
  const [supportImageOutput, setSupportImageOutput] = useState(false);
  const [supportTools, setSupportTools] = useState(true);
  const [supportStream, setSupportStream] = useState(true);
  const [supportCode, setSupportCode] = useState(false);
  const [supportLongText, setSupportLongText] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setModelId(editing?.model_id ?? "");
    setContextWindow(editing?.context_window?.toString() ?? "");
    setMaxOutputTokens(editing?.max_output_tokens?.toString() ?? "");
    setTemperature(editing?.default_temperature?.toString() ?? "");
    setTopP(editing?.default_top_p?.toString() ?? "");
    setTimeoutSec(editing?.timeout_sec?.toString() ?? "");
    setRetryCount(editing?.retry_count?.toString() ?? "");
    setPoolGroup(editing?.pool_group ?? "none");
    setSupportImageInput(editing?.support_image_input ?? false);
    setSupportImageOutput(editing?.support_image_output ?? false);
    setSupportTools(editing?.support_tools ?? true);
    setSupportStream(editing?.support_stream ?? true);
    setSupportCode(editing?.support_code ?? false);
    setSupportLongText(editing?.support_long_text ?? false);
    setEnabled(editing?.enabled ?? true);
  }, [open, editing]);

  const handleSubmit = async () => {
    if (!providerId && !editing) return toast.error("请先选择服务商");
    if (!name.trim()) return toast.error("请输入模型名称");
    if (!modelId.trim()) return toast.error("请输入模型 ID");
    setSubmitting(true);
    try {
      const payload = {
        provider_id: providerId ?? editing!.provider_id,
        name: name.trim(),
        model_id: modelId.trim(),
        context_window: toNumber(contextWindow),
        max_output_tokens: toNumber(maxOutputTokens),
        default_temperature: toNumber(temperature),
        default_top_p: toNumber(topP),
        timeout_sec: toNumber(timeoutSec),
        retry_count: toNumber(retryCount),
        pool_group: poolGroup === "none" ? null : poolGroup,
        support_text: true,
        support_image_input: supportImageInput,
        support_image_output: supportImageOutput,
        support_tools: supportTools,
        support_stream: supportStream,
        support_code: supportCode,
        support_long_text: supportLongText,
        enabled,
      };
      if (editing) {
        await updateModelConfig(editing.id, payload);
        toast.success("模型已更新");
      } else {
        await createModelConfig(payload);
        toast.success("模型已创建");
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "编辑模型" : "新增模型"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>模型名称</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>模型 ID</Label>
              <Input value={modelId} onChange={(event) => setModelId(event.target.value)} placeholder="gpt-4o-mini" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>上下文窗口</Label>
              <Input value={contextWindow} onChange={(event) => setContextWindow(event.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-1.5">
              <Label>最大输出</Label>
              <Input value={maxOutputTokens} onChange={(event) => setMaxOutputTokens(event.target.value)} inputMode="numeric" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>温度</Label>
              <Input value={temperature} onChange={(event) => setTemperature(event.target.value)} inputMode="decimal" />
            </div>
            <div className="space-y-1.5">
              <Label>Top P</Label>
              <Input value={topP} onChange={(event) => setTopP(event.target.value)} inputMode="decimal" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>超时秒数</Label>
              <Input value={timeoutSec} onChange={(event) => setTimeoutSec(event.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-1.5">
              <Label>重试次数</Label>
              <Input value={retryCount} onChange={(event) => setRetryCount(event.target.value)} inputMode="numeric" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>系统用途</Label>
            <Select
              value={poolGroup}
              onValueChange={(value) => {
                setPoolGroup(value);
                if (value === "system-default-image") setSupportImageInput(true);
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">普通模型</SelectItem>
                <SelectItem value="system-default-text">系统默认文本模型</SelectItem>
                <SelectItem value="system-default-image">系统默认多模态模型</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ["图片输入", supportImageInput, setSupportImageInput],
              ["图片输出", supportImageOutput, setSupportImageOutput],
              ["工具调用", supportTools, setSupportTools],
              ["流式输出", supportStream, setSupportStream],
              ["代码生成", supportCode, setSupportCode],
              ["长文本", supportLongText, setSupportLongText],
              ["启用模型", enabled, setEnabled],
            ].map(([label, checked, setter]) => (
              <label key={label as string} className="flex items-center gap-2">
                <Checkbox checked={checked as boolean} onCheckedChange={(value) => (setter as (value: boolean) => void)(Boolean(value))} />
                {label as string}
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={submitting}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
