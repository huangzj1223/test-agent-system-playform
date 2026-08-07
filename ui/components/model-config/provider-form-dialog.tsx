"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  createModelProvider,
  updateModelProvider,
  type ModelProviderInfo,
} from "@/lib/api/model-config";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ModelProviderInfo | null;
  onSaved: () => void;
}

const providerOptions = [
  ["openai", "OpenAI"],
  ["deepseek", "DeepSeek"],
  ["doubao", "豆包"],
  ["anthropic", "Anthropic"],
  ["openrouter", "OpenRouter"],
  ["azure-openai", "Azure OpenAI"],
  ["openai-compatible", "OpenAI 兼容"],
];

const protocolOptions = [
  ["openai-compatible", "OpenAI Compatible"],
  ["anthropic", "Anthropic"],
  ["azure-openai", "Azure OpenAI"],
  ["custom", "Custom"],
];

export function ProviderFormDialog({ open, onOpenChange, editing, onSaved }: Props) {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("openai-compatible");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [protocolType, setProtocolType] = useState("openai-compatible");
  const [apiVersion, setApiVersion] = useState("");
  const [remark, setRemark] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setProvider(editing?.provider ?? "openai-compatible");
    setApiEndpoint(editing?.api_endpoint ?? "");
    setApiKey("");
    setProtocolType(editing?.protocol_type ?? "openai-compatible");
    setApiVersion(editing?.api_version ?? "");
    setRemark(editing?.remark ?? "");
    setEnabled(editing?.enabled ?? true);
  }, [open, editing]);

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error("请输入服务商名称");
    if (!apiEndpoint.trim()) return toast.error("请输入 API 地址");
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        provider,
        api_endpoint: apiEndpoint.trim(),
        protocol_type: protocolType,
        api_version: apiVersion.trim() || null,
        remark: remark.trim() || null,
        enabled,
        ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
      };
      if (editing) {
        await updateModelProvider(editing.id, payload);
        toast.success("服务商已更新");
      } else {
        await createModelProvider(payload);
        toast.success("服务商已创建");
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
          <DialogTitle>{editing ? "编辑服务商" : "新增服务商"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>名称</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>供应商</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {providerOptions.map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>协议</Label>
              <Select value={protocolType} onValueChange={setProtocolType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {protocolOptions.map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>API 地址</Label>
            <Input value={apiEndpoint} onChange={(event) => setApiEndpoint(event.target.value)} placeholder="https://api.example.com/v1" />
          </div>
          <div className="space-y-1.5">
            <Label>API Key</Label>
            <Input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={editing?.has_api_key ? "留空表示不修改" : ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>API 版本</Label>
              <Input value={apiVersion} onChange={(event) => setApiVersion(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>备注</Label>
              <Input value={remark} onChange={(event) => setRemark(event.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={enabled} onCheckedChange={(value) => setEnabled(Boolean(value))} />
            启用服务商
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={submitting}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
